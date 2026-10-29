import React, { useEffect, useRef, useState } from 'react';
import { Upload, ChevronRight, Film, Activity } from 'lucide-react';
import { uploadMatchVideo, validateVideoFile } from './video-upload.js';
import { parseScoreInput, canUseAIScores, formatVideoTime } from './match-scores.js';

export default function VideoJudge({ game, rules, players, matchState, onApplyResults }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [duration, setDuration] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');
  const [report, setReport] = useState(null);
  const [scoreA, setScoreA] = useState(String(matchState.teamAScore));
  const [scoreB, setScoreB] = useState(String(matchState.teamBScore));
  const [edited, setEdited] = useState(true);
  const [serverState, setServerState] = useState('loading');
  const [statusRefresh, setStatusRefresh] = useState(0);
  const request = useRef(null);

  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  useEffect(() => () => request.current?.abort(), []);
  useEffect(() => {
    const controller = new AbortController();
    setServerState('loading');
    fetch('/api/judge/status', { signal: controller.signal })
      .then(response => { if (!response.ok) throw new Error(); return response.json(); })
      .then(status => setServerState(status.configured ? 'ready' : 'unconfigured'))
      .catch(() => { if (!controller.signal.aborted) setServerState('unavailable'); });
    return () => controller.abort();
  }, [statusRefresh]);

  function resetReport() {
    setReport(null); setEdited(true);
    setScoreA(String(matchState.teamAScore)); setScoreB(String(matchState.teamBScore));
  }
  function selectFile(candidate) {
    resetReport(); setDuration(null); setError(''); setPreview(''); setFile(null);
    try { validateVideoFile(candidate); setFile(candidate); }
    catch (failure) { setError(failure.message); }
  }
  function useAI(result) {
    setScoreA(String(result.scores.teamA)); setScoreB(String(result.scores.teamB)); setEdited(false);
  }
  async function analyze() {
    if (!file || request.current || !duration) return;
    const controller = new AbortController();
    request.current = controller;
    setBusy(true); setError(''); resetReport(); setProgress('Uploading match video…');
    try {
      const data = await uploadMatchVideo(file, {
        duration, game: { id: game.id, title: game.title }, rules,
        players: players.map(({ name, team, color, number }) => ({ name, team, color, number })),
        scores: { teamAScore: matchState.teamAScore, teamBScore: matchState.teamBScore },
      }, { signal: controller.signal, onProgress: percent => setProgress(percent === 100 ? 'Video uploaded. AI is processing the match and calculating scores…' : `Uploading video: ${percent}%`) });
      if (!controller.signal.aborted) {
        setReport(data);
        if (data.canApplyScores && canUseAIScores(data)) useAI(data);
      }
    } catch (failure) { if (!controller.signal.aborted) setError(failure.message); }
    finally {
      if (!controller.signal.aborted) { setBusy(false); setProgress(''); }
      if (request.current === controller) request.current = null;
    }
  }
  const parsedA = parseScoreInput(scoreA);
  const parsedB = parseScoreInput(scoreB);
  const valid = parsedA !== null && parsedB !== null;
  const useAIResult = Boolean(report?.canApplyScores && canUseAIScores(report) && !edited);
  const unit = rules.scoreUnit === 'seconds' ? 'seconds' : 'points';
  function finish() {
    if (!valid || busy) return;
    onApplyResults({ kind: useAIResult ? 'video' : 'manual', source: useAIResult ? 'ai' : report ? 'manual_reviewed' : 'manual', finalScores: { teamA: parsedA, teamB: parsedB }, report });
  }

  return <div className="space-y-8 max-w-5xl mx-auto">
    <div className="text-center"><h2>AI Video Judge</h2><p>Upload {game.title}. Get a score report or enter your own result.</p></div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <section className="pixel-panel p-6 space-y-5">
        <h3 className="text-2xl flex items-center gap-3"><Film size={22} /> MATCH VIDEO</h3>
        {preview ? <video key={preview} src={preview} controls playsInline preload="metadata" className="judge-video" onLoadedMetadata={event => {
          const seconds = event.currentTarget.duration;
          if (!Number.isFinite(seconds) || seconds < 0.1 || seconds > 600) { setDuration(null); setError('Choose a video between 0.1 seconds and 10 minutes.'); }
          else { setDuration(seconds); setError(''); }
        }} onError={() => { setDuration(null); setError('Your browser cannot play this video. Try MP4 (H.264) or WebM.'); }} /> : <div className="video-placeholder"><Upload size={40} /><span>CHOOSE YOUR MATCH VIDEO</span><small>Record the full game with both teams visible.</small></div>}
        <label htmlFor="match-video" className="block text-xl">Choose video (up to 200 MB / 10 min)</label>
        <input id="match-video" type="file" accept="video/*" disabled={busy} className="video-file-input" onChange={event => { if (event.target.files?.[0]) selectFile(event.target.files[0]); event.target.value = ''; }} />
        {file && <div className="flex flex-wrap items-center gap-3"><span className="video-file-name">{file.name} · {(file.size / 1024 / 1024).toFixed(1)} MB</span><button type="button" className="underline text-xl" disabled={busy} onClick={() => { setFile(null); setPreview(''); setDuration(null); resetReport(); setError(''); }}>Remove video</button></div>}
        <p className="text-xl">Clicking Analyze sends this video, including audio, the rules, jersey roster, and recorded scores through the game server to Google Gemini. Previewing alone does not upload it.</p>
        <div className="judge-service-state" role="status">{serverState === 'ready' ? 'VIDEO AI CONNECTED' : serverState === 'loading' ? 'Checking AI connection…' : serverState === 'unconfigured' ? 'Video AI needs GEMINI_API_KEY in the server .env file. Restart the server after adding it.' : 'Judge server unavailable. Run npm run server.'}{serverState !== 'ready' && serverState !== 'loading' && <button type="button" className="underline block mt-2" disabled={busy} onClick={() => setStatusRefresh(value => value + 1)}>Check connection again</button>}</div>
        <button type="button" className="pixel-button pixel-button--yellow w-full" onClick={analyze} disabled={!file || !duration || busy || serverState !== 'ready'}>{busy ? 'SCORING VIDEO…' : report ? 'ANALYZE AGAIN' : 'ANALYZE & REPORT SCORES'}</button>
        {busy && <button type="button" className="pixel-button pixel-button--outline" onClick={() => { request.current?.abort(); request.current = null; setBusy(false); setProgress(''); }}>CANCEL</button>}
        <p role="status" aria-live="polite" className="text-xl">{progress}</p>
        {error && <p role="alert" className="judge-error">{error}</p>}
      </section>
      <section className="pixel-panel p-6 space-y-5" aria-busy={busy}>
        <h3 className="text-2xl flex gap-3 items-center"><Activity size={22} /> VIDEO SCORE REPORT</h3>
        {report ? <>
          <div className="quiz-hud"><span>TEAM A<br />{report.scores.teamA ?? 'Unknown'}</span><span>TEAM B<br />{report.scores.teamB ?? 'Unknown'}</span></div>
          <p className="text-xl">AI-observed {unit} · {report.confidence} confidence · {report.coverage.replaceAll('_', ' ')}</p>
          <p className="text-2xl">{report.summary}</p>
          {!report.canApplyScores && <p className="judge-error">A complete final score could not be confirmed. Review the evidence and enter the final scores below. Clip scores are not automatically treated as match totals.</p>}
          <h4 className="text-xs">SCORING EVIDENCE</h4>
          <ul className="judge-events">{report.events.map((event, index) => <li key={index}>{formatVideoTime(event.timeSeconds)} · {event.team}: {event.description}</li>)}</ul>
          <h4 className="text-xs">LIMITATIONS</h4>
          <ul className="judge-events">{report.limitations.map((item, index) => <li key={index}>{item}</li>)}</ul>
          <p className="text-xl">AI video processing samples frames and can miss fast actions. Review the evidence before accepting the score.</p>
          {report.cleanupWarning && <p className="judge-error">Provider file removal could not be confirmed. The provider's retention policy applies.</p>}
          {report.canApplyScores && canUseAIScores(report) && <button type="button" className="pixel-button pixel-button--outline" disabled={busy} onClick={() => useAI(report)}>USE AI TOTALS</button>}
        </> : <div className="judge-empty"><span>NO ANALYSIS YET</span><p>Your uploaded video will produce a score report here. There are no simulated scores or prewritten match results.</p><p>You can also finish using your recorded or manually entered scores below.</p></div>}
      </section>
    </div>
    <section className="pixel-panel p-6 space-y-5">
      <h3 className="text-2xl">FINAL SCOREBOARD</h3>
      <p className="text-xl">{unit} · {rules.lowerWins ? 'Lower score wins' : 'Higher score wins'}. These are final totals; they replace the recorded scores.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <label htmlFor="final-team-a">Team A ({unit})<input id="final-team-a" type="number" min="0" max="1000000" step="any" className="w-full p-3 mt-2" value={scoreA} disabled={busy} onChange={event => { setEdited(true); setScoreA(event.target.value); }} /></label>
        <label htmlFor="final-team-b">Team B ({unit})<input id="final-team-b" type="number" min="0" max="1000000" step="any" className="w-full p-3 mt-2" value={scoreB} disabled={busy} onChange={event => { setEdited(true); setScoreB(event.target.value); }} /></label>
      </div>
      <p aria-live="polite" className="text-xl">Score source: {useAIResult ? 'AI video analysis, pending your confirmation.' : report ? 'Your entered scores, with the AI report kept for reference.' : 'Your recorded or entered scores.'}</p>
      {!valid && <p className="judge-error">Enter a number from 0 to 1,000,000 for each team.</p>}
      <div className="flex flex-wrap gap-5"><button type="button" className="pixel-button pixel-button--emerald" disabled={!valid || busy} onClick={finish}>CONFIRM & SHOW RESULTS <ChevronRight size={18} /></button><button type="button" className="underline text-xl" disabled={busy} onClick={() => { setScoreA(String(matchState.teamAScore)); setScoreB(String(matchState.teamBScore)); setEdited(true); }}>Restore recorded scores</button></div>
    </section>
  </div>;
}

