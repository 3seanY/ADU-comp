export const MAX_SCORE = 1000000;
export function isScore(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= MAX_SCORE;
}
export function parseScoreInput(value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  const number = Number(value);
  return isScore(number) ? number : null;
}
export function canUseAIScores(report) {
  return Boolean(report && report.coverage === 'complete_match' && report.confidence === 'high' &&
    Array.isArray(report.events) && report.events.length > 0 &&
    ['visible_scoreboard', 'counted_events'].includes(report.scoreBasis) &&
    isScore(report.scores?.teamA) && isScore(report.scores?.teamB));
}
export function resolveMatchScores(matchState, result) {
  // AI scores are totals, never additions to the recorded scoreboard.
  if (result?.kind === 'quiz') return { teamA: matchState.teamAScore, teamB: matchState.teamBScore };
  if (isScore(result?.finalScores?.teamA) && isScore(result?.finalScores?.teamB)) return { ...result.finalScores };
  return { teamA: matchState.teamAScore, teamB: matchState.teamBScore };
}
export function determineWinner(scores, lowerWins = false) {
  if (scores.teamA === scores.teamB) return 'Draw';
  return (lowerWins ? scores.teamA < scores.teamB : scores.teamA > scores.teamB) ? 'Team A' : 'Team B';
}
export function formatVideoTime(seconds) {
  const tenths = Math.round(seconds * 10);
  return `${String(Math.floor(tenths / 600)).padStart(2, '0')}:${((tenths % 600) / 10).toFixed(1).padStart(4, '0')}`;
}
