// Vercel build step: writes public/config.js from environment variables,
// so no keys ever enter the repo. Set SUPABASE_URL and SUPABASE_ANON_KEY
// in the Vercel project settings (Environment Variables).
// Locally, does nothing if public/config.js already exists.
const fs = require("fs");
const path = require("path");

const out = path.join(__dirname, "public", "config.js");
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_ANON_KEY;

if (url && key) {
  fs.writeFileSync(
    out,
    "window.HS_CONFIG = {\n" +
    "  supabaseUrl: " + JSON.stringify(url) + ",\n" +
    "  supabaseAnonKey: " + JSON.stringify(key) + "\n" +
    "};\n"
  );
  console.log("config.js generated from Vercel env vars");
} else if (fs.existsSync(out)) {
  console.log("env vars not set; keeping existing public/config.js");
} else {
  console.log("WARNING: no Supabase keys found; pages will show the setup banner");
}
