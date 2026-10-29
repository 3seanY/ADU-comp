import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { transformSync } from 'esbuild';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const root = path.dirname(fileURLToPath(import.meta.url));
const cache = new Map();
function loadJSX(filename) {
  if (cache.has(filename)) return cache.get(filename);
  const source = transformSync(readFileSync(filename, 'utf8'), { loader: 'jsx', format: 'cjs', platform: 'node', target: 'node24' }).code;
  const result = { exports: {} };
  const require = createRequire(filename);
  vm.runInNewContext(source, { module: result, exports: result.exports, require: id => id.endsWith('.jsx') ? loadJSX(path.resolve(path.dirname(filename), id)) : require(id), console, process, setInterval, clearInterval });
  cache.set(filename, result.exports);
  return result.exports;
}
const MatchResults = loadJSX(path.join(root, 'match-results.jsx')).default;
const defaults = { game: { title: 'Backyard Football' }, rules: { points: '1 per goal', penalties: '-1 foul', tieBreak: 'Rematch', lowerWins: false, scoreUnit: 'points' }, matchState: { teamAScore: 9, teamBScore: 8 }, players: [{ id: 'a', team: 'Team A', name: 'Alex', number: '10', color: '#ff0055' }, { id: 'b', team: 'Team B', name: 'Sam', number: '1', color: '#00e5ff' }], onReset: () => {} };
const report = { summary: 'A scored two goals.', scores: { teamA: 2, teamB: 1 }, confidence: 'high', coverage: 'complete_match', events: [{ timeSeconds: 12.4, team: 'Team A', description: 'Goal at left target.' }], limitations: ['One camera angle.'] };
const render = props => renderToStaticMarkup(React.createElement(MatchResults, { ...defaults, ...props }));

test('final results render AI totals and evidence, without fake MVP or possession', () => {
  const html = render({ aiResults: { kind: 'video', source: 'ai', finalScores: { teamA: 2, teamB: 1 }, report } });
  assert.match(html, /Final Score: 2 - 1 points/);
  assert.match(html, /Team A WINS!/);
  assert.match(html, /A scored two goals/);
  assert.match(html, /00:12.4/);
  assert.match(html, /Goal at left target/);
  assert.match(html, /AI video analysis/);
  for (const invented of ['MOST VALUABLE', 'TEAM REPRESENTATIVE', 'Possession', '65%', 'Demo Results', 'Simulated Match Report', 'Final Score: 11 - 9']) assert.equal(html.includes(invented), false, invented);
});

test('manual override renders exact input including zero and does not use the AI winner', () => {
  const html = render({ aiResults: { kind: 'manual', source: 'manual_reviewed', finalScores: { teamA: 0, teamB: 5 }, report } });
  assert.match(html, /Final Score: 0 - 5 points/);
  assert.match(html, /Team B WINS!/);
  assert.match(html, /User-entered scores after video review/);
  assert.match(html, /REFERENCE ONLY/);
});

test('manual-only results and timed-game winners are derived from user totals', () => {
  const manual = render({ aiResults: { kind: 'manual', source: 'manual', finalScores: { teamA: 0, teamB: 0 }, report: null } });
  assert.match(manual, /IT&#x27;S A TIE!/);
  assert.match(manual, /No AI video result was applied/);
  assert.equal(manual.includes('AI VIDEO FINDINGS'), false);
  const timed = render({ rules: { ...defaults.rules, scoreUnit: 'seconds', lowerWins: true }, aiResults: { kind: 'manual', source: 'manual', finalScores: { teamA: 12.5, teamB: 20 } } });
  assert.match(timed, /Team A WINS!/);
  assert.match(timed, /Final Score: 12.5 - 20 seconds/);
});

test('heritage quiz shows actual answer scores and the app renders without demo judging', () => {
  const html = render({ matchState: { teamAScore: 20, teamBScore: 10 }, aiResults: { kind: 'quiz', answers: [{}, {}, {}, {}, {}, {}] } });
  assert.match(html, /3 correct answers out of 6/);
  assert.match(html, /Quiz answer scoring/);
  const App = loadJSX(path.join(root, 'aigameapp.jsx')).default;
  const home = renderToStaticMarkup(React.createElement(App));
  assert.match(home, /GAME DAY!/);
  assert.match(home, /UAE Heritage Quest/);
  const VideoJudge = loadJSX(path.join(root, 'video-judge.jsx')).default;
  const upload = renderToStaticMarkup(React.createElement(VideoJudge, defaults));
  assert.match(upload, /FINAL SCOREBOARD/);
  assert.match(upload, /value="9"/);
  assert.match(upload, /value="8"/);
  assert.equal(upload.includes('Try the simulated report'), false);
});
