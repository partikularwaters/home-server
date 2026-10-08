// HomeServer demo store — config template.
//
// 1. Copy this file to public/config.js
// 2. Fill in YOUR OWN Supabase project values below.
// 3. Never commit public/config.js (it's in .gitignore).
// 4. For Vercel deploys, set SUPABASE_URL and SUPABASE_ANON_KEY as
//    project environment variables instead; build-config.js writes
//    public/config.js at build time.
//
// Get the values from your Supabase project: Project Settings → API.
// Use the "anon public" key. NEVER put the service_role key in a browser.

window.HS_CONFIG = {
  supabaseUrl: "https://your-project-ref.supabase.co",
  supabaseAnonKey: "your-anon-public-key"
};
