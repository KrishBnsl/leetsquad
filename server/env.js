// Load ./.env (if present) before anything else reads process.env. Must be the first import.
try { process.loadEnvFile(); } catch { /* no .env file — that's fine */ }
