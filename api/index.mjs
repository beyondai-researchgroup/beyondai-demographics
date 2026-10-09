// Vercel serverless entry point — the whole Express API from server.mjs runs as one function.
// vercel.json rewrites every /api/* request here; Express still sees the original path.
import app from '../server.mjs';

export default app;
