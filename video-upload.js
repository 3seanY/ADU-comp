export const MAX_VIDEO_BYTES = 200 * 1024 * 1024;
export const VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime', 'video/mpeg', 'video/x-msvideo', 'video/avi', 'video/x-matroska', 'video/3gpp', 'video/3gpp2'];
export function validateVideoFile(file) {
  if (!file || !VIDEO_TYPES.includes(file.type)) throw new Error('Choose a supported video, such as MP4, WebM, or MOV.');
  if (!Number.isFinite(file.size) || file.size <= 0 || file.size > MAX_VIDEO_BYTES) throw new Error('Choose a non-empty video up to 200 MB.');
}
export function encodeMatchContext(context) {
  const bytes = new TextEncoder().encode(JSON.stringify(context));
  return btoa(Array.from(bytes, byte => String.fromCharCode(byte)).join(''));
}

export function uploadMatchVideo(file, context, { signal, onProgress }) {
  validateVideoFile(file);
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const abort = () => xhr.abort();
    const cleanup = () => signal.removeEventListener('abort', abort);
    xhr.open('POST', '/api/judge');
    xhr.timeout = 310000;
    xhr.setRequestHeader('Content-Type', file.type);
    xhr.setRequestHeader('X-Match-Context', encodeMatchContext(context));
    xhr.upload.onprogress = event => {
      if (event.lengthComputable) onProgress(Math.round(event.loaded / event.total * 100));
    };
    xhr.onload = () => {
      cleanup();
      let data;
      try { data = JSON.parse(xhr.responseText); } catch { reject(new Error('The judge server is unavailable. Start it with npm run server.')); return; }
      if (xhr.status < 200 || xhr.status >= 300) { reject(new Error(data.error || 'Video analysis failed.')); return; }
      if (data.kind !== 'video' || typeof data.summary !== 'string' || !data.scores || !Array.isArray(data.events) || !Array.isArray(data.limitations)) { reject(new Error('The server returned an incomplete report. Please retry.')); return; }
      resolve(data);
    };
    xhr.onerror = () => { cleanup(); reject(new Error('Cannot reach the judge server. Start it with npm run server.')); };
    xhr.ontimeout = () => { cleanup(); reject(new Error('Analysis timed out. Try a shorter video or use manual scores.')); };
    xhr.onabort = () => { cleanup(); reject(new DOMException('Cancelled', 'AbortError')); };
    if (signal.aborted) { reject(new DOMException('Cancelled', 'AbortError')); return; }
    signal.addEventListener('abort', abort, { once: true });
    xhr.send(file);
  });
}
