const { createClient } = require('@supabase/supabase-js');
const env = require('./env');

// Service-role client bypasses Row Level Security.
// It lives ONLY on the backend. Never expose this key to the apps.
let supabaseAdmin = null;
if (env.supabaseUrl && env.supabaseServiceKey) {
  supabaseAdmin = createClient(env.supabaseUrl, env.supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

module.exports = supabaseAdmin;