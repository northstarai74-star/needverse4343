# Security Guidelines for Needverse

## Overview

This document outlines the security measures implemented in Needverse and best practices for running it safely.

## Implemented Security Features

### 1. **Rate Limiting**
- Admin login: 5 attempts per 15 minutes per IP
- API endpoints: 100 requests per minute per IP
- Webhook endpoints: 50 requests per minute per IP
- Prevents brute force attacks and DoS attacks

### 2. **Security Headers**
- `X-Frame-Options: SAMEORIGIN` - Prevents clickjacking
- `X-Content-Type-Options: nosniff` - Prevents MIME type sniffing
- `X-XSS-Protection: 1; mode=block` - Legacy XSS protection
- `Content-Security-Policy` - Strict CSP for admin panel, moderate for storefront
- `Referrer-Policy: strict-origin-when-cross-origin` - Controls referrer information
- `Permissions-Policy` - Denies access to camera, microphone, geolocation

### 3. **Authentication**
- Admin panel uses HTTP Basic Auth with bcrypt password hashing (12 rounds)
- Passwords are salted and hashed using bcrypt, not stored in plaintext
- Failed login attempts are logged (sanitized)

### 4. **Payment Security**
- Razorpay webhook signatures verified using HMAC-SHA256
- Timing-safe comparison to prevent timing attacks
- Payment verification uses cryptographic signatures
- Amount validation prevents price manipulation

### 5. **Database Security**
- Supabase with Row Level Security (RLS) enabled
- Service role key used server-side only (never exposed to browser)
- Parameterized queries prevent SQL injection
- Optimistic locking with version column prevents race conditions
- No sensitive data indexed

### 6. **Input Validation**
- Email validation (RFC 5322 simplified)
- Phone number validation (8-20 digits with formatting)
- Cart validation - product IDs checked against catalog
- Quantity validation - 1 to 50 items per product
- String length limits enforced to prevent buffer overflows
- HTML escaping for all user data in emails

### 7. **Logging & Monitoring**
- Secure JSON logging with timestamp and status codes
- Sensitive data (passwords, secrets, tokens) redacted in logs
- Request duration tracked for performance monitoring
- Failed authentication attempts logged with IP

## Security Best Practices

### Environment Variables
```bash
# Always use strong passwords (32+ characters, mixed case, numbers, symbols)
ADMIN_PASSWORD=your-secure-password-here

# Never commit .env to Git
echo ".env" >> .gitignore

# Use test keys for development
RAZORPAY_KEY_ID=rzp_test_xxxxx
RAZORPAY_KEY_SECRET=rzp_test_xxxxx
```

### HTTPS (Production)
- Always run on HTTPS in production
- Add this to redirect HTTP to HTTPS:
```javascript
app.use((req, res, next) => {
  if (req.header('x-forwarded-proto') !== 'https' && process.env.NODE_ENV === 'production') {
    res.redirect(301, `https://${req.header('host')}${req.url}`);
  }
  next();
});
```

### Vercel Deployment
1. Set environment variables in Vercel dashboard (not in code)
2. Use live Razorpay keys only in production
3. Set up webhook URL in Razorpay dashboard
4. Monitor logs regularly for errors/anomalies

### Admin Panel Access (Production)
- Use a strong, unique password (32+ characters)
- Limit access to admin IP addresses if possible
- Consider implementing session-based auth with secure cookies
- Use VPN or proxy for remote access
- Enable 2FA through your proxy/VPN

### Email Configuration
- Use app-specific passwords, not your main account password
- Gmail: [Create app password](https://myaccount.google.com/apppasswords)
- Brevo/SendGrid: Use API keys, not SMTP passwords

## Known Limitations & Recommendations

### Admin Panel Authentication
**Current:** HTTP Basic Auth with bcrypt
**Recommendation for Production:** Implement session-based authentication with:
- Secure, HttpOnly, SameSite cookies
- CSRF token validation
- Account lockout after failed attempts
- Login audit trail
- Consider third-party auth (OAuth2, Firebase)

### Order Access Control
**Current:** Anyone with an order ID can retrieve order details
**Recommendation:** Add customer email verification or token-based access

### Payment Verification
**Current:** Browser callback + webhook verify payment
**Recommendation:** Rely primarily on webhook; browser callback is convenience only

## Dependency Security

### Regular Updates
```bash
npm audit
npm update
```

### Key Dependencies
- `express` - Web framework (patched regularly)
- `helmet` - Security headers
- `express-rate-limit` - Rate limiting
- `bcrypt` - Password hashing (industry standard)
- `@supabase/supabase-js` - Database client
- `razorpay` - Payment processing

## Compliance & Data Protection

### PCI DSS (Payment Card Industry)
- Do NOT store credit card data (handled by Razorpay)
- Do NOT log payment sensitive info
- Webhook signatures verified cryptographically

### GDPR / Privacy
- Customer data stored only for order fulfillment
- Email addresses used only for order notifications
- Implement data deletion for customers (not yet implemented)
- Add privacy policy to storefront

### Data Retention
Recommended:
- Successful orders: Keep indefinitely for accounting
- Failed orders: Delete after 90 days
- Refund disputes: Keep for 7 years per regulations

## Monitoring & Alerts

### Recommended Monitoring
1. Failed authentication attempts (rate limit triggers)
2. Webhook verification failures (payment processing issues)
3. High error rates (500 status codes)
4. Unusual traffic patterns
5. Large refunds or refund disputes

### Logs to Review
```bash
# View recent logs (Vercel/cloud platforms)
# Monitor: failed admin logins, API errors, webhook issues
```

## Testing Security

### Manual Testing
```bash
# Test rate limiting on admin
for i in {1..10}; do curl -u admin:wrong-password http://localhost:3000/admin; done

# Test CSRF protection (if implemented)
# Test input validation
curl -X POST http://localhost:3000/api/create-order \
  -H "Content-Type: application/json" \
  -d '{"customer":{"email":"invalid-email"}}'
```

### Automated Security Scanning
```bash
npm install -g snyk
snyk test

# Or use GitHub's Dependabot/security features
```

## Security Incident Response

### If Compromise Is Suspected
1. Immediately change `ADMIN_PASSWORD`
2. Revoke Razorpay keys, generate new ones
3. Review admin access logs for unauthorized activity
4. Audit database for suspicious orders
5. Notify users if customer data was exposed

### If Payment Webhook Fails
1. Orders still show as "created" until webhook or browser callback
2. Customer will see "wait for payment confirmation" message
3. Manual verification possible through Razorpay dashboard
4. Check webhook URL is correct in Razorpay settings
5. Verify `RAZORPAY_WEBHOOK_SECRET` is set correctly

## References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Express Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Razorpay Security](https://razorpay.com/docs/api/security/)
- [Supabase Security](https://supabase.com/docs/guides/database/security)

---

**Last Updated:** 2026-10-06

For questions or to report security issues, please email security@needverse.local (or your actual security contact).
