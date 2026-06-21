const dotenv = require('dotenv');
dotenv.config();

const port = process.env.PORT || 4000;
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn(
    'Supabase credentials not set yet. The server will run, but database features stay off until you add them to .env.'
  );
}

module.exports = { port, supabaseUrl, supabaseServiceKey };