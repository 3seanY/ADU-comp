import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeVideo, validateMatchContext, validateReport, MAX_VIDEO_BYTES } from './judge-api.mjs';
import { createGameServer } from './server.mjs';
import { validateVideoFile, encodeMatchContext } from './video-upload.js';
import { canUseAIScores, parseScoreInput, resolveMatchScores, determineWinner, formatVideoTime } from './match-scores.js';

const context = () => ({ duration: 60, game: { id: 'g1', title: 'Backyard Football' },
  rules: { points: '1 per goal', penalties: '-1 foul', tieBreak: 'Rematch', scoreUnit: 'points', lowerWins: false },
  players: [{ name: 'أحمد', team: 'Team A', color: '#FF0055', number: '10' }], scores: { teamAScore: 9, teamBScore: 8 },
});
const report = () => ({ summary: 'The final scoreboard shows Team A 2, Team B 1.', scores: { teamA: 2, teamB: 1 }, coverage: 'complete_match', confidence: 'high', scoreBasis: 'visible_scoreboard', events: [{ timeSeconds: 58, team: 'Unknown', description: 'Final scoreboard is visible: A 2, B 1.' }], limitations: ['Rapid events may be missed.'] });
const bytes = Buffer.from('synthetic-video-test-payload');
const ok = data => ({ ok: true, status: 200, json: async () => data });
function mockProvider({ state = 'ACTIVE', finishReason = 'STOP', responseReport = report(), failGeneration = false, cleanupFails = false } = {}) {
  const calls = [];
  let fileState = state;
  const fetchImpl = async (url, options = {}) => {
    calls.push({ url, ...options });
    if (options.method === 'DELETE') return { ok: !cleanupFails, status: cleanupFails ? 500 : 200 };
    if (url.endsWith('/upload/v1beta/files')) return { ...ok({}), headers: new Headers({ 'x-goog-upload-url': 'https://generativelanguage.googleapis.com/upload/session' }) };
    if (url.endsWith('/upload/session')) return ok({ file: { name: 'files/test-match', uri: 'https://generativelanguage.googleapis.com/v1beta/files/test-match', state: fileState } });
    if (url.endsWith('/v1beta/files/test-match')) { fileState = 'ACTIVE'; return ok({ name: 'files/test-match', uri: url, state: fileState }); }
    if (url.includes(':generateContent')) {
      if (failGeneration) return { ok: false, status: 429 };
      return ok({ candidates: [{ finishReason, content: { parts: [{ text: JSON.stringify(responseReport) }] } }] });
    }
    throw new Error('Unexpected provider request: ' + url);
  };
  return { calls, fetchImpl };
}

test('rejects invalid match context and video inputs', async () => {
  validateMatchContext(context());
  assert.throws(() => validateMatchContext({ ...context(), duration: 601 }));
  assert.throws(() => validateMatchContext({ ...context(), game: { id: 'g5', title: 'Quiz' } }));
  assert.throws(() => validateMatchContext({ ...context(), scores: { teamAScore: -1, teamBScore: 0 } }));
  assert.throws(() => validateVideoFile({ type: 'image/png', size: 100 }));
  assert.throws(() => validateVideoFile({ type: 'video/mp4', size: 0 }));
  assert.throws(() => validateVideoFile({ type: 'video/mp4', size: MAX_VIDEO_BYTES + 1 }));
  validateVideoFile({ type: 'video/mp4', size: MAX_VIDEO_BYTES });
  await assert.rejects(analyzeVideo(bytes, 'video/mp4', context(), { fetchImpl: () => assert.fail('Must not call provider') }), { status: 503 });
});

test('uploads actual video bytes, sends rule context, parses score totals and deletes provider file', async () => {
  const provider = mockProvider();
  const result = await analyzeVideo(bytes, 'video/mp4', context(), { apiKey: 'test-only', fetchImpl: provider.fetchImpl });
  assert.deepEqual(provider.calls.find(call => call.url.endsWith('/upload/session')).body, bytes);
  const generation = JSON.parse(provider.calls.find(call => call.url.includes(':generateContent')).body);
  assert.equal(generation.contents[0].parts[0].fileData.mimeType, 'video/mp4');
  assert.ok(generation.contents[0].parts[1].text.includes('أحمد'));
  assert.equal(generation.generationConfig.responseMimeType, 'application/json');
  assert.deepEqual(result.scores, { teamA: 2, teamB: 1 });
  assert.equal(result.canApplyScores, true);
  assert.equal(result.cleanupWarning, false);
  assert.equal(provider.calls.at(-1).method, 'DELETE');
  assert.equal(result.teamAAdd, undefined);
  assert.equal(result.possession, undefined);
});

test('waits for processing before asking for scoring', async () => {
  const provider = mockProvider({ state: 'PROCESSING' });
  let waited = false;
  await analyzeVideo(bytes, 'video/mp4', context(), { apiKey: 'test', fetchImpl: provider.fetchImpl, sleep: async () => { waited = true; } });
  assert.ok(waited);
  assert.ok(provider.calls.find(call => call.url.endsWith('/v1beta/files/test-match') && !call.method));
});

test('refusals and quota failures never become fake scores and still clean up', async () => {
  for (const options of [{ finishReason: 'SAFETY' }, { failGeneration: true }, { responseReport: {} }, { state: 'FAILED' }]) {
    const provider = mockProvider(options);
    await assert.rejects(analyzeVideo(bytes, 'video/mp4', context(), { apiKey: 'test', fetchImpl: provider.fetchImpl }), { status: 502 });
    assert.equal(provider.calls.at(-1).method, 'DELETE');
  }
});

test('cancellation after upload also deletes the remote file', async () => {
  const provider = mockProvider({ state: 'PROCESSING' });
  const controller = new AbortController();
  await assert.rejects(analyzeVideo(bytes, 'video/mp4', context(), { apiKey: 'test', fetchImpl: provider.fetchImpl, signal: controller.signal, sleep: async () => { controller.abort(); controller.signal.throwIfAborted(); } }), { name: 'AbortError' });
  assert.equal(provider.calls.at(-1).method, 'DELETE');
  assert.equal(provider.calls.at(-1).signal.aborted, false);
});

test('malformed provider scores and timestamps are rejected', () => {
  for (const scores of [{ teamA: -1, teamB: 0 }, { teamA: '2', teamB: 0 }, { teamA: 2 }, { teamA: Infinity, teamB: 0 }]) assert.throws(() => validateReport({ ...report(), scores }, 60));
  assert.throws(() => validateReport({ ...report(), events: [{ timeSeconds: 61, team: 'Team A', description: 'Goal' }] }, 60));
  assert.throws(() => validateReport({ ...report(), limitations: null }, 60));
});

test('partial, uncertain and evidence-free clips cannot automatically set final scores', () => {
  for (const changes of [{ coverage: 'partial_clip' }, { confidence: 'medium' }, { scores: { teamA: null, teamB: null } }, { scoreBasis: 'undetermined' }, { events: [] }]) {
    const result = validateReport({ ...report(), ...changes }, 60);
    assert.equal(result.canApplyScores, false);
    assert.equal(canUseAIScores(result), false);
  }
  assert.equal(validateReport({ ...report(), scores: { teamA: 0, teamB: 0 } }, 60).canApplyScores, true);
});

test('AI totals replace scores, manual overrides stay authoritative, zero is valid, timed winners work', () => {
  const recorded = { teamAScore: 9, teamBScore: 8 };
  assert.deepEqual(resolveMatchScores(recorded, { kind: 'video', finalScores: { teamA: 2, teamB: 1 } }), { teamA: 2, teamB: 1 });
  assert.deepEqual(resolveMatchScores(recorded, { kind: 'manual', finalScores: { teamA: 0, teamB: 5 }, report: report() }), { teamA: 0, teamB: 5 });
  assert.deepEqual(resolveMatchScores(recorded, { kind: 'quiz' }), { teamA: 9, teamB: 8 });
  assert.equal(determineWinner({ teamA: 25.2, teamB: 30.5 }, true), 'Team A');
  assert.equal(determineWinner({ teamA: 2, teamB: 3 }), 'Team B');
  assert.equal(determineWinner({ teamA: 0, teamB: 0 }), 'Draw');
  assert.equal(parseScoreInput('0'), 0);
  assert.equal(parseScoreInput('12.5'), 12.5);
  for (const value of ['', ' ', '-1', 'NaN', 'Infinity', '1000001']) assert.equal(parseScoreInput(value), null);
  assert.equal(formatVideoTime(59.99), '01:00.0');
});

async function withServer(options, run) {
  const server = createGameServer(options);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try { await run(`http://127.0.0.1:${server.address().port}`); }
  finally { await new Promise(resolve => server.close(resolve)); }
}
const headers = () => ({ 'Content-Type': 'video/mp4', 'X-Match-Context': encodeMatchContext(context()) });

test('website upload reaches AI adapter and returns its score report over HTTP', async () => {
  const provider = mockProvider();
  await withServer({ config: () => ({ apiKey: 'test' }), analyze: (video, type, metadata, options) => {
    assert.deepEqual(video, bytes);
    assert.equal(metadata.players[0].name, 'أحمد');
    return analyzeVideo(video, type, metadata, { ...options, fetchImpl: provider.fetchImpl });
  } }, async url => {
    assert.equal((await (await fetch(url + '/api/judge/status')).json()).configured, true);
    const response = await fetch(url + '/api/judge', { method: 'POST', headers: headers(), body: bytes });
    assert.equal(response.status, 200);
    const result = await response.json();
    assert.deepEqual(result.scores, { teamA: 2, teamB: 1 });
    assert.equal(result.canApplyScores, true);
    assert.equal((await fetch(url + '/')).status, 200);
    assert.equal((await fetch(url + '/missing.js')).status, 404);
  });
});

test('HTTP rejects invalid files, context and origin; never fabricates results when unconfigured', async () => {
  await withServer({ config: () => ({}) }, async url => {
    assert.equal((await (await fetch(url + '/api/judge/status')).json()).configured, false);
    assert.equal((await fetch(url + '/api/judge')).status, 405);
    assert.equal((await fetch(url + '/api/judge', { method: 'POST', headers: { ...headers(), Origin: 'https://unrelated.example' }, body: bytes })).status, 403);
    assert.equal((await fetch(url + '/api/judge', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })).status, 415);
    assert.equal((await fetch(url + '/api/judge', { method: 'POST', headers: { 'Content-Type': 'video/mp4' }, body: bytes })).status, 400);
    const response = await fetch(url + '/api/judge', { method: 'POST', headers: headers(), body: bytes });
    assert.equal(response.status, 503);
    const data = await response.json();
    assert.match(data.error, /GEMINI_API_KEY/);
    assert.equal(data.scores, undefined);
  });
});

test('concurrent upload is rejected while the first AI review is running', async () => {
  let complete;
  let started;
  const began = new Promise(resolve => { started = resolve; });
  await withServer({ config: () => ({ apiKey: 'test' }), analyze: async () => { started(); return new Promise(resolve => { complete = resolve; }); } }, async url => {
    const first = fetch(url + '/api/judge', { method: 'POST', headers: headers(), body: bytes });
    await began;
    const second = await fetch(url + '/api/judge', { method: 'POST', headers: headers(), body: bytes });
    assert.equal(second.status, 429);
    complete({ ...validateReport(report(), 60), provider: 'Gemini' });
    assert.equal((await first).status, 200);
  });
});
