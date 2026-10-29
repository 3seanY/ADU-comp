import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { analyzeVideo, validateMatchContext, MAX_VIDEO_BYTES, VIDEO_TYPES } from './judge-api.mjs';

const root = path.resolve(fileURLToPath(new URL('./dist/', import.meta.url)));
const json = (res, status, data) => {
  if (res.destroyed) return;
  res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(data));
};

export function createGameServer({ analyze = analyzeVideo, config = () => ({ apiKey: process.env.GEMINI_API_KEY, model: process.env.GEMINI_MODEL || 'gemini-3.8-flash' }) } = {}) {
  let busy = false;
  const instance = http.createServer({ maxHeaderSize: 65536 }, async (req, res) => {
    if (req.url === '/api/judge/status' && req.method === 'GET') {
      return json(res, 200, { configured: Boolean(config().apiKey), provider: 'Gemini', busy });
    }
    if (req.url === '/api/judge') {
      if (req.method !== 'POST') return json(res, 405, { error: 'Use POST to analyze a video.' });
      const port = instance.address()?.port;
      const origin = req.headers.origin;
      if (origin && ![`http://localhost:${port}`, `http://127.0.0.1:${port}`, 'http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:4173', 'http://127.0.0.1:4173'].includes(origin)) return json(res, 403, { error: 'Origin not allowed.' });
      const mimeType = req.headers['content-type']?.split(';')[0].trim().toLowerCase();
      if (!VIDEO_TYPES.includes(mimeType)) return json(res, 415, { error: 'Upload a supported video file, such as MP4 or WebM.' });
      const length = Number(req.headers['content-length']);
      if (length > MAX_VIDEO_BYTES) return json(res, 413, { error: 'Video must be at most 200 MB.' });
      let context;
      try {
        const encoded = req.headers['x-match-context'];
        if (typeof encoded !== 'string' || encoded.length > 48000 || !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) throw new Error('Missing or oversized match context.');
        context = JSON.parse(Buffer.from(encoded, 'base64').toString('utf8'));
        validateMatchContext(context);
      } catch (error) { return json(res, 400, { error: error instanceof SyntaxError ? 'Invalid match context.' : error.message }); }
      if (busy) return json(res, 429, { error: 'Another video is being scored. Please try again shortly.' });
      const settings = config();
      if (!settings.apiKey) return json(res, 503, { error: 'Video AI is not configured. Add GEMINI_API_KEY to the server .env file, then restart the server.' });
      busy = true;
      const controller = new AbortController();
      const cancel = () => { if (!res.writableEnded) controller.abort(); };
      req.once('aborted', cancel);
      res.once('close', cancel);
      try {
        let size = 0;
        const chunks = [];
        for await (const chunk of req) {
          size += chunk.length;
          if (size > MAX_VIDEO_BYTES) { json(res, 413, { error: 'Video must be at most 200 MB.' }); return; }
          chunks.push(chunk);
        }
        if (!size) return json(res, 400, { error: 'The uploaded video is empty.' });
        const result = await analyze(Buffer.concat(chunks), mimeType, context, { ...settings, signal: controller.signal });
        json(res, 200, result);
      } catch (error) {
        if (!controller.signal.aborted) json(res, error.status || 502, { error: error.name === 'TimeoutError' ? 'Video scoring timed out. Try a shorter clip or enter the scores manually.' : error.status ? error.message : 'Could not analyze this video. Retry or enter scores manually.' });
      } finally {
        req.removeListener('aborted', cancel);
        res.removeListener('close', cancel);
        busy = false;
      }
      return;
    }
    if (req.url.startsWith('/api/')) return json(res, 404, { error: 'Unknown API route.' });
    if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405); res.end(); return; }
    try {
      const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
      let filename = path.resolve(root, '.' + pathname);
      if (filename !== root && !filename.startsWith(root + path.sep)) { res.writeHead(403); res.end(); return; }
      try { if (!(await stat(filename)).isFile()) filename = path.join(root, 'index.html'); }
      catch { if (path.extname(filename)) { res.writeHead(404); res.end(); return; } filename = path.join(root, 'index.html'); }
      const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff': 'font/woff', '.woff2': 'font/woff2', '.svg': 'image/svg+xml' };
      const data = await readFile(filename);
      res.writeHead(200, { 'Content-Type': mime[path.extname(filename)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
      res.end(req.method === 'HEAD' ? undefined : data);
    } catch { res.writeHead(404); res.end('Build the frontend with npm run build first.'); }
  });
  instance.requestTimeout = 300000;
  return instance;
}

export const server = createGameServer();
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 3001);
  server.listen(port, '127.0.0.1', () => console.log(`Game server: http://127.0.0.1:${port} | Video AI ${process.env.GEMINI_API_KEY ? 'configured' : 'needs GEMINI_API_KEY in .env'}`));
}
