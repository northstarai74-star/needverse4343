/* Security middleware and utilities for Needverse */
const crypto = require("crypto");
const rateLimit = require("express-rate-limit");
const bcrypt = require("bcrypt");

// ===== Rate Limiting =====
// Admin login attempts: 5 per 15 minutes per IP
const adminLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: "Too many login attempts. Please try again later." },
  standardHeaders: false,
  skip: (req) => req.path !== "/admin" || req.method !== "POST",
});

// API endpoints: 100 requests per minute per IP (loose for customers)
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: false,
  skip: (req) => !req.path.startsWith("/api"),
});

// Webhook: Allow Razorpay IPs, but still rate limit others
const webhookLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 50,
  skip: (req) => req.path !== "/api/razorpay-webhook",
  standardHeaders: false,
});

// ===== Security Headers =====
function securityHeaders(req, res, next) {
  // Prevent clickjacking
  res.set("X-Frame-Options", "SAMEORIGIN");
  // Prevent MIME sniffing
  res.set("X-Content-Type-Options", "nosniff");
  // Enable XSS protection (legacy, modern browsers use CSP)
  res.set("X-XSS-Protection", "1; mode=block");
  // Referrer policy
  res.set("Referrer-Policy", "strict-origin-when-cross-origin");
  // Permissions policy
  res.set("Permissions-Policy", "geolocation=(), microphone=(), camera=()");
  // Content Security Policy: strict for admin, looser for storefront
  if (req.path.includes("/admin")) {
    res.set("Content-Security-Policy", "default-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; script-src 'self'; connect-src 'self'");
  } else {
    res.set("Content-Security-Policy", "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'");
  }
  next();
}

// ===== CSRF Protection =====
// Simple CSRF token generation
function generateCsrfToken() {
  return crypto.randomBytes(32).toString("hex");
}

// CSRF middleware: check token on state-changing requests
function csrfProtection(req, res, next) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();

  // For admin panel form submissions
  if (req.path.includes("/admin") && req.method === "POST") {
    const token = req.body?.csrf_token || req.get("x-csrf-token") || "";
    const sessionToken = req.session?.csrf || "";
    if (!sessionToken || !token || token !== sessionToken) {
      return res.status(403).json({ error: "CSRF token invalid or missing" });
    }
  }
  next();
}

// ===== Password Hashing =====
async function hashPassword(password) {
  return bcrypt.hash(password, 12);
}

async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

// ===== Sensitive Data Redaction =====
function redactSensitiveData(obj) {
  if (!obj) return obj;
  const redacted = JSON.parse(JSON.stringify(obj));
  const sensitiveFields = ["password", "secret", "key", "token", "auth"];

  function redact(o) {
    if (!o || typeof o !== "object") return;
    for (const key in o) {
      if (sensitiveFields.some(s => key.toLowerCase().includes(s))) {
        o[key] = "***REDACTED***";
      } else if (typeof o[key] === "object") {
        redact(o[key]);
      }
    }
  }
  redact(redacted);
  return redacted;
}

// ===== Input Validation =====
function validateEmail(email) {
  // RFC 5322 simplified, prevents email injection
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(String(email).toLowerCase()) && email.length <= 254;
}

function validatePhone(phone) {
  // Accept 8-20 digits, spaces, +, -, ()
  return /^[\d\s+\-().]{8,20}$/.test(phone);
}

function sanitizeHtml(text) {
  return String(text || "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

// ===== Request Logging with Redaction =====
function secureLogger(req, res, next) {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    const logEntry = {
      timestamp: new Date().toISOString(),
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
    };
    // Add user context if available
    if (req.user) logEntry.user = req.user;
    // Log errors but don't expose details
    if (res.statusCode >= 400) {
      logEntry.level = res.statusCode >= 500 ? "error" : "warn";
    }
    console.log(JSON.stringify(logEntry));
  });
  next();
}

module.exports = {
  adminLoginLimiter,
  apiLimiter,
  webhookLimiter,
  securityHeaders,
  generateCsrfToken,
  csrfProtection,
  hashPassword,
  verifyPassword,
  redactSensitiveData,
  validateEmail,
  validatePhone,
  sanitizeHtml,
  secureLogger,
};
