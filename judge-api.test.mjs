import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeMatch, validatePayload, validateReport } from './judge-api.mjs';
import { validateVideoFile } from './video-frames.js';

const payload = () => ({
  frames: [{ time: 0, image: 'data:image/jpeg;base64,/9j/2Q==' }, { time: 1, image: 'data:image/jpeg;base64,/9j/2Q==' }],
  duration: 2, game: { id: 'g1', title: 'Backyard Football' }, rules: { points: '1 per goal', penalties: '-1 foul', tieBreak: 'Rematch' },
  players: [{ name: 'Alex', team: 'Team A', color: '#FF0055', number: '10' }], scores: { teamAScore: 1, teamBScore: 0 },
});
const report = { skillEval: 'A player is visible near the ball.', events: ['00:01 — Ball is visible.'], limitations: ['Two still frames cannot confirm a goal.'], teamAAdd: 0, teamBAdd: 0 };
const providerResponse = data => ({ ok: true, json: async () => data });

test('rejects malformed, oversized and unordered frame requests before provider calls', () => {
  assert.throws(() => validatePayload({ ...payload(), frames: [] }));
  assert.throws(() => validatePayload({ ...payload(), duration: 601 }));
  assert.throws(() => validatePayload({ ...payload(), frames: payload().frames.reverse() }));
  assert.throws(() => validatePayload({ ...payload(), frames: [{ time: 0, image: 'https://example.com/image.jpg' }, payload().frames[1]] }));
  assert.throws(() => validatePayload({ ...payload(), game: { id: 'g5', title: 'Quiz' } }));
});

test('missing API key returns a setup error without contacting provider', async () => {
  await assert.rejects(analyzeMatch(payload(), { fetchImpl: () => assert.fail('Must not contact provider') }), { status: 503 });
});

test('sends actual image frames, match rules, and scores; returns the validated provider report', async () => {
  let sent;
  const result = await analyzeMatch(payload(), { apiKey: 'test-only', fetchImpl: async (url, options) => {
    assert.equal(url, 'https://api.openai.com/v1/responses');
    sent = JSON.parse(options.body);
    return providerResponse({ status: 'completed', output: [{ content: [{ type: 'output_text', text: JSON.stringify(report) }] }] });
  } });
  assert.equal(sent.store, false);
  assert.equal(sent.input[0].content.filter(item => item.type === 'input_image').length, 2);
  assert.ok(sent.input[0].content[0].text.includes('existingScoreboard'));
  assert.equal(sent.text.format.strict, true);
  assert.deepEqual(result, { ...report, kind: 'video', frameCount: 2, duration: 2 });
  assert.equal(result.possession, undefined);
});

test('handles provider quota failures, refusal, incomplete responses and invalid reports', async () => {
  await assert.rejects(analyzeMatch(payload(), { apiKey: 'test', fetchImpl: async () => ({ ok: false, status: 429 }) }), { status: 502 });
  for (const data of [
    { status: 'incomplete', output: [] },
    { status: 'completed', output: [{ content: [{ type: 'refusal', refusal: 'Cannot review' }] }] },
    { status: 'completed', output: [{ content: [{ type: 'output_text', text: '{}' }] }] },
  ]) await assert.rejects(analyzeMatch(payload(), { apiKey: 'test', fetchImpl: async () => providerResponse(data) }), { status: 502 });
  assert.throws(() => validateReport({ ...report, teamAAdd: 900 }));
  assert.throws(() => validateReport({ ...report, events: null }));
});

test('validates local video type and size', () => {
  validateVideoFile({ type: 'video/mp4', size: 100 });
  assert.throws(() => validateVideoFile({ type: 'image/jpeg', size: 100 }));
  assert.throws(() => validateVideoFile({ type: 'video/mp4', size: 0 }));
  assert.throws(() => validateVideoFile({ type: 'video/mp4', size: 201 * 1024 * 1024 }));
});

test('local HTTP route rejects cross-origin traffic and reports missing configuration', async () => {
  const { server } = await import('./server.mjs');
  const previousKey = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const url = `http://127.0.0.1:${server.address().port}/api/judge`;
    const forbidden = await fetch(url, { method: 'POST', headers: { Origin: 'https://unrelated.example', 'Content-Type': 'application/json' }, body: '{}' });
    assert.equal(forbidden.status, 403);
    const unconfigured = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    assert.equal(unconfigured.status, 503);
    assert.match((await unconfigured.json()).error, /OPENAI_API_KEY/);
    assert.equal((await fetch(url)).status, 405);
    assert.equal((await fetch(url.replace('/api/judge', '/'))).status, 200);
  } finally {
    if (previousKey !== undefined) process.env.OPENAI_API_KEY = previousKey;
    await new Promise(resolve => server.close(resolve));
  }
});
