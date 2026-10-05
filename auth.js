// Customer accounts, backed by Supabase Auth. The browser signs in with the public "anon" key and
// sends its access token as "Authorization: Bearer ..."; the server checks that token here.
const { createClient } = require("@supabase/supabase-js");

const { SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY } = process.env;
const enabled = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY && SUPABASE_SERVICE_ROLE_KEY);

let sb = null;
try { sb = enabled ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } }) : null; }
catch { /* bad SUPABASE_URL is reported by /api/health via db.check() */ }

// Returns { id, email } for a valid access token, or null. Never throws.
async function userFromRequest(req) {
  if (!sb) return null;
  const [scheme, token] = (req.get("authorization") || "").split(" ");
  if (scheme !== "Bearer" || !token) return null;
  try {
    const { data, error } = await sb.auth.getUser(token);
    return error || !data?.user ? null : { id: data.user.id, email: data.user.email };
  } catch { return null; }
}

// Attaches req.user when the caller is signed in; guests continue with req.user = null.
const optionalUser = async (req, res, next) => { req.user = await userFromRequest(req); next(); };

// Rejects the request unless the caller is signed in.
const requireUser = async (req, res, next) => {
  if (!enabled) return res.status(503).json({ error: "Accounts aren't set up yet. Please try again later." });
  req.user = await userFromRequest(req);
  req.user ? next() : res.status(401).json({ error: "Please sign in." });
};

// Public settings the browser needs to talk to Supabase Auth. The anon key is designed to be public.
const publicConfig = () => enabled ? { enabled: true, url: SUPABASE_URL, anonKey: SUPABASE_ANON_KEY } : { enabled: false };

module.exports = { enabled, optionalUser, requireUser, publicConfig };
