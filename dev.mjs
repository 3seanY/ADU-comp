import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// One command starts the private API and the frontend. No key is sent to Vite.
const api = spawn(process.execPath, ['--env-file-if-exists=.env', fileURLToPath(new URL('./server.mjs', import.meta.url))], { stdio: 'inherit' });
const frontend = spawn(process.execPath, [fileURLToPath(new URL('./node_modules/vite/bin/vite.js', import.meta.url)), ...process.argv.slice(2)], { stdio: 'inherit' });
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  api.kill(); frontend.kill();
  process.exitCode = code;
}
process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());
for (const child of [api, frontend]) {
  child.on('error', error => { console.error(error.message); stop(1); });
  child.on('exit', code => stop(code || 0));
}
