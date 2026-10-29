import React, { useEffect, useRef, useState } from 'react';
import { Upload, ChevronRight, Film, Activity } from 'lucide-react';
import { sampleVideoFrames, validateVideoFile } from './video-frames.js';

export default function VideoJudge({ game, rules, players, matchState, onApplyResults, onUseDemo }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');
  const [report, setReport] = useState(null);
  const request = useRef(null);
  const input = useRef(null);
  useEffect(() => {
    if (!file) { setPreview(''); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  useEffect(() => () => request.current?.abort(), []);

  function selectFile(candidate) {
    setReport(null);
    setReady(false);
    setError('');
    setFile(null);
    try { validateVideoFile(candidate); setFile(candidate); }
    catch (failure) { setError(failure.message); }
  }

  async function analyze() {
    if (!file || busy || !ready) return;
    const controller = new AbortController();
    request.current = controller;
    setBusy(true); setError(''); setReport(null);
    try {
      setProgress('Preparing video frames…');
      const samples = await sampleVideoFrames(file, { signal: controller.signal, onProgress: (done, total) => setProgress(`Preparing frame ${done} of ${total}…`) });
      setProgress(`AI judge is reviewing ${samples.frames.length} frames…`);
      const response = await fetch('/api/judge', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: controller.signal,
        body: JSON.stringify({ ...samples, game: { id: game.id, title: game.title }, rules,
          players: players.map(({ name, team, color, number }) => ({ name, team, color, number })),
          scores: { teamAScore: matchState.teamAScore, teamBScore: matchState.teamBScore },
        }),
      });
      let data;
      try { data = await response.json(); } catch { throw new Error('The judge server is unavailable. Start it with npm run server and try again.'); }
      if (!response.ok) throw new Error(data.error || 'Could not analyze this video. Please try again.');
      if (data.kind !== 'video' || typeof data.skillEval !== 'string' || !Array.isArray(data.events) || !Array.isArray(data.limitations)) throw new Error('The judge returned an incomplete report. Please try again.');
      if (!controller.signal.aborted) setReport(data);
    } catch (failure) {
      if (!controller.signal.aborted) setError(failure instanceof TypeError ? 'Cannot reach the judge server. Start it with npm run server and try again.' : failure.message);
    } finally {
      if (!controller.signal.aborted) { setBusy(false); setProgress(''); }
      if (request.current === controller) request.current = null;
    }
  }

  return <div className="space-y-8 max-w-5xl mx-auto">
    <div className="text-center"><h2>AI Video Judge</h2><p>Upload your {game.title} clip for a match review.</p></div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <section className="pixel-panel p-6 space-y-5">
        <h3 className="text-2xl flex items-center gap-3"><Film size={22} /> MATCH REPLAY</h3>
        {preview ? <video key={preview} src={preview} controls playsInline preload="metadata" className="judge-video" onLoadedMetadata={event => {
          const duration = event.currentTarget.duration;
          if (!Number.isFinite(duration) || duration < 0.1 || duration > 600) { setReady(false); setError('Choose a video between 0.1 seconds and 10 minutes long.'); }
          else setReady(true);
        }} onError={() => { setReady(false); setError('Your browser cannot play this format. Try MP4 (H.264) or WebM.'); }} /> : <div className="video-placeholder"><Upload size={40} /><span>YOUR MATCH GOES HERE</span><small>MP4, WebM, or another playable video</small></div>}
        <label htmlFor="match-video" className="block text-xl">Choose match video (up to 200 MB / 10 min)</label>
        <input ref={input} id="match-video" type="file" accept="video/*" disabled={busy} className="video-file-input" onChange={event => { const selected = event.target.files?.[0]; if (selected) selectFile(selected); event.target.value = ''; }} />
        {file && <div className="flex flex-wrap items-center gap-3"><span className="video-file-name">{file.name} · {(file.size / 1024 / 1024).toFixed(1)} MB</span><button type="button" className="underline text-xl" disabled={busy} onClick={() => { setFile(null); setReady(false); setReport(null); setError(''); }}>Remove video</button></div>}
        <p className="text-xl">Preview stays on this device. Clicking Analyze sends up to 24 sampled images, match rules, and the team roster to OpenAI. Audio and the original video are not sent.</p>
        <button type="button" className="pixel-button pixel-button--yellow w-full" onClick={analyze} disabled={!file || !ready || busy}>{busy ? 'REVIEW IN PROGRESS…' : report ? 'ANALYZE AGAIN' : 'ANALYZE VIDEO'}</button>
        {busy && <button type="button" className="pixel-button pixel-button--outline" onClick={() => { request.current?.abort(); setBusy(false); setProgress(''); }}>CANCEL</button>}
        <p role="status" aria-live="polite" className="text-xl">{progress}</p>
        {error && <p role="alert" className="judge-error">{error}</p>}
      </section>
      <section className="pixel-panel p-6 space-y-5" aria-busy={busy}>
        <h3 className="text-2xl flex gap-3 items-center"><Activity size={22} /> JUDGE'S REPORT</h3>
        {report ? <>
          <p className="text-2xl">{report.skillEval}</p>
          <h4 className="text-xs">TIMESTAMPED OBSERVATIONS</h4>
          <ul className="judge-events">{report.events.length ? report.events.map((event, index) => <li key={index}>{event}</li>) : <li>No clear scoring events were visible.</li>}</ul>
          <h4 className="text-xs">REVIEW LIMITATIONS</h4>
          <p className="text-xl">Reviewed {report.frameCount} still frames. This is an AI estimate; fast actions between frames may be missed.</p>
          <ul className="judge-events">{report.limitations.map((limitation, index) => <li key={index}>{limitation}</li>)}</ul>
          <div className="quiz-feedback">Proposed score corrections: Team A {report.teamAAdd >= 0 ? '+' : ''}{report.teamAAdd} · Team B {report.teamBAdd >= 0 ? '+' : ''}{report.teamBAdd}<p>These adjust the recorded scores. Check the replay before applying.</p></div>
          <button type="button" className="pixel-button pixel-button--emerald w-full" onClick={() => onApplyResults(report)}>APPLY REVIEW &amp; FINISH <ChevronRight size={18} /></button>
        </> : <div className="judge-empty"><span>AWAITING REPLAY</span><p>Choose a video, preview it, then click Analyze. Your report and any proposed score corrections will appear here.</p><p>The judge reviews sampled images, so it cannot reliably measure full-match possession, continuous movement, or dance rhythm.</p></div>}
      </section>
    </div>
    <div className="judge-alternatives"><button type="button" className="pixel-button pixel-button--outline" disabled={busy} onClick={() => onApplyResults({ kind: 'manual', teamAAdd: 0, teamBAdd: 0, skillEval: 'Final scores use the manually recorded scoreboard. No AI video analysis was applied.' })}>KEEP RECORDED SCORES</button><button type="button" className="underline text-xl" disabled={busy} onClick={onUseDemo}>Try the simulated report instead</button></div>
  </div>;
}
