import React from 'react';
import { Trophy, Play } from 'lucide-react';
import { determineWinner, resolveMatchScores, formatVideoTime } from './match-scores.js';
import { HERITAGE_QUESTIONS } from './heritage-quiz.js';

export default function MatchResults({ game, rules, matchState, aiResults, players, onReset }) {
  const scores = resolveMatchScores(matchState, aiResults);
  const isQuiz = aiResults?.kind === 'quiz';
  const report = aiResults?.report;
  const winner = determineWinner(scores, !isQuiz && rules.lowerWins);
  const source = isQuiz ? 'Quiz answer scoring' : aiResults?.source === 'ai' ? 'AI video analysis' : aiResults?.source === 'manual_reviewed' ? 'User-entered scores after video review' : 'User-entered scoreboard';
  const unit = isQuiz || rules.scoreUnit !== 'seconds' ? 'points' : 'seconds';
  const color = winner === 'Team A' ? 'from-rose-500 to-pink-600' : winner === 'Team B' ? 'from-blue-500 to-cyan-600' : 'from-gray-500 to-gray-600';

  return <div className="space-y-8 max-w-5xl mx-auto">
    <div className={`p-12 text-center bg-gradient-to-r ${color} text-white border-8 border-white/30 relative overflow-hidden`}>
      <Trophy className="absolute -top-10 -right-10 w-64 h-64 opacity-10" aria-hidden="true" />
      <p className="text-2xl mb-4 relative">{game.title}</p>
      <h1 className="text-7xl relative">{winner === 'Draw' ? "IT'S A TIE!" : `${winner} WINS!`}</h1>
      <p className="text-3xl mt-5 relative">Final Score: {scores.teamA} - {scores.teamB} {unit}</p>
      <p className="text-xl mt-4 relative">{rules.lowerWins && !isQuiz ? 'Lower score wins' : 'Higher score wins'} · Source: {source}</p>
    </div>

    <section className="pixel-panel p-6 space-y-6">
      <h3 className="text-2xl">MATCH SCOREBOARD</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {['Team A', 'Team B'].map((team, index) => <div key={team} className="result-team">
          <h4>{team}{winner === team ? ' · WINNER' : winner === 'Draw' ? ' · TIED' : ''}</h4>
          <p className="result-score">{index === 0 ? scores.teamA : scores.teamB}<span>{unit}</span></p>
          <ul className="text-xl space-y-2">{players.filter(player => player.team === team).map(player => <li key={player.id} className="flex items-center gap-3"><span className="roster-color" style={{ backgroundColor: player.color }} />#{player.number} {player.name}</li>)}</ul>
        </div>)}
      </div>
      <div className="text-xl"><p>Score source: {source}</p><p>Scoring rule: {rules.points}</p><p>Penalties: {rules.penalties}</p>{winner === 'Draw' && <p>Tie-break rule: {rules.tieBreak}. {isQuiz ? 'Both teams share the victory.' : 'The recorded result is a tie; no tie-break result has been entered.'}</p>}</div>
      {isQuiz && <p className="quiz-feedback">{(scores.teamA + scores.teamB) / 10} correct answers out of {HERITAGE_QUESTIONS.length}; {aiResults.answers.length} questions answered. Scores are calculated from submitted answers.</p>}
    </section>

    {report && <section className="pixel-panel p-6 space-y-5">
      <h3 className="text-2xl">{aiResults.source === 'ai' ? 'AI VIDEO FINDINGS' : 'AI REVIEW — REFERENCE ONLY'}</h3>
      <p className="text-2xl">{report.summary}</p>
      <p className="text-xl">AI-observed score: {report.scores.teamA ?? 'Unknown'} - {report.scores.teamB ?? 'Unknown'} {unit}. Confidence: {report.confidence}. Coverage: {report.coverage.replaceAll('_', ' ')}.</p>
      {aiResults.source !== 'ai' && <p className="quiz-feedback">The final scoreboard above uses your entered totals. The AI report did not replace them.</p>}
      <h4 className="text-xs">TIMESTAMPED EVIDENCE</h4>
      {report.events.length > 0 ? <ul className="judge-events">{report.events.map((event, index) => <li key={index}>{formatVideoTime(event.timeSeconds)} · {event.team}: {event.description}</li>)}</ul> : <p className="text-xl">No scoring events could be confirmed.</p>}
      {report.limitations.length > 0 && <><h4 className="text-xs">LIMITATIONS</h4><ul className="judge-events">{report.limitations.map((item, index) => <li key={index}>{item}</li>)}</ul></>}
      {report.cleanupWarning && <p className="judge-error">Provider file removal could not be confirmed. Provider retention rules apply.</p>}
    </section>}

    {!report && !isQuiz && <p className="quiz-feedback">These results use your recorded or entered scores. No AI video result was applied.</p>}
    <div className="flex justify-center"><button type="button" className="pixel-button pixel-button--yellow" onClick={onReset}>CHOOSE ANOTHER GAME <Play size={18} className="ml-3" /></button></div>
  </div>;
}
