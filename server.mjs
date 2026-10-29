import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { analyzeMatch, validatePayload } from './judge-api.mjs';

const root = path.resolve(fileURLToPath(new URL('./dist/', import.meta.url)));
const port = Number(process.env.PORT || 3001);
let busy = false;
const json = (res, status, data) => { res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(data)); };

export const server = http.createServer(async (req, res) => {
  if (req.url === '/api/judge') {
    if (req.method !== 'POST') return json(res, 405, { error: 'Use POST to analyze a clip.' });
    // Local-only service; reject cross-origin requests to avoid unwanted API usage.
    const origin = req.headers.origin;
    if (origin && ![`http://localhost:${port}`, `http://127.0.0.1:${port}`, 'http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:4173', 'http://127.0.0.1:4173'].includes(origin)) return json(res, 403, { error: 'Origin not allowed.' });
    if (!req.headers['content-type']?.startsWith('application/json')) return json(res, 415, { error: 'Send JSON video frames.' });
    if (busy) return json(res, 429, { error: 'Another video is being reviewed. Please try again shortly.' });
    if (!process.env.OPENAI_API_KEY) return json(res, 503, { error: 'AI judging is not configured. Add OPENAI_API_KEY to the server .env file and restart the server.' });
    busy = true;
    try {
      let size = 0;
      const chunks = [];
      for await (const chunk of req) {
        size += chunk.length;
        if (size > 12 * 1024 * 1024) { json(res, 413, { error: 'Clip frames are too large. Try a shorter video.' }); return; }
        chunks.push(chunk);
      }
      let body;
      try { body = JSON.parse(Buffer.concat(chunks).toString()); validatePayload(body); }
      catch (error) { return json(res, 400, { error: error instanceof SyntaxError ? 'Invalid JSON request.' : error.message }); }
      const result = await analyzeMatch(body, { apiKey: process.env.OPENAI_API_KEY, model: process.env.OPENAI_MODEL || 'gpt-4.1-mini' });
      json(res, 200, result);
    } catch (error) {
      json(res, error.status || 502, { error: error.name === 'TimeoutError' ? 'Analysis timed out. Please try a shorter video.' : error.status ? error.message : 'Could not reach the AI service. Please try again.' });
    } finally { busy = false; }
    return;
  }
  if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405); res.end(); return; }
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    let filename = path.resolve(root, '.' + pathname);
    if (filename !== root && !filename.startsWith(root + path.sep)) { res.writeHead(403); res.end(); return; }
    try { if (!(await stat(filename)).isFile()) filename = path.join(root, 'index.html'); }
    catch { filename = path.join(root, 'index.html'); }
    const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff': 'font/woff', '.woff2': 'font/woff2', '.svg': 'image/svg+xml' };
    const data = await readFile(filename);
    res.writeHead(200, { 'Content-Type': mime[path.extname(filename)] || 'application/octet-stream' }); res.end(req.method === 'HEAD' ? undefined : data);
  } catch { res.writeHead(404); res.end('Build the frontend with npm run build first.'); }
});

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  server.listen(port, '127.0.0.1', () => console.log(`Game server: http://127.0.0.1:${port}`));
}
