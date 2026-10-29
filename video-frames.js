export const MAX_VIDEO_BYTES = 200 * 1024 * 1024;

export function validateVideoFile(file) {
  if (!file || !file.type.startsWith('video/')) throw new Error('Choose a video file, such as MP4, WebM, or MOV.');
  if (file.size === 0 || file.size > MAX_VIDEO_BYTES) throw new Error('Choose a non-empty video smaller than 200 MB.');
}

function waitForMedia(video, event, signal) {
  return new Promise((resolve, reject) => {
    const finish = error => {
      clearTimeout(timer);
      video.removeEventListener(event, done);
      video.removeEventListener('error', failed);
      signal.removeEventListener('abort', aborted);
      error ? reject(error) : resolve();
    };
    const done = () => finish();
    const failed = () => finish(new Error('This video cannot be decoded. Try an MP4 (H.264) or WebM clip.'));
    const aborted = () => finish(new DOMException('Cancelled', 'AbortError'));
    const timer = setTimeout(() => finish(new Error('Video loading timed out. Try a different or shorter clip.')), 15000);
    video.addEventListener(event, done, { once: true });
    video.addEventListener('error', failed, { once: true });
    signal.addEventListener('abort', aborted, { once: true });
    if (signal.aborted) aborted();
  });
}

export async function sampleVideoFrames(file, { signal, onProgress = () => {} }) {
  validateVideoFile(file);
  const video = document.createElement('video');
  const url = URL.createObjectURL(file);
  video.muted = true;
  video.playsInline = true;
  video.preload = 'auto';
  try {
    const loaded = waitForMedia(video, 'loadeddata', signal);
    video.src = url;
    await loaded;
    const duration = video.duration;
    if (!Number.isFinite(duration) || duration < 0.1 || duration > 600) throw new Error('Choose a video between 0.1 seconds and 10 minutes long.');
    const canvas = document.createElement('canvas');
    const scale = Math.min(1, 960 / Math.max(video.videoWidth, video.videoHeight));
    canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
    canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Your browser cannot prepare video frames. Try another browser.');
    const count = Math.min(24, Math.max(2, Math.ceil(duration / 2)));
    const frames = [];
    for (let index = 0; index < count; index++) {
      signal.throwIfAborted();
      const time = (duration - 0.05) * index / (count - 1);
      if (Math.abs(video.currentTime - time) > 0.001) {
        const seeked = waitForMedia(video, 'seeked', signal);
        video.currentTime = time;
        await seeked;
      }
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      frames.push({ time, image: canvas.toDataURL('image/jpeg', 0.7) });
      onProgress(index + 1, count);
    }
    return { frames, duration };
  } finally {
    video.pause();
    video.removeAttribute('src');
    video.load();
    URL.revokeObjectURL(url);
  }
}
