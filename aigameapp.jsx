import React, { useState, useEffect, useRef } from 'react';
import { PixelLandscape, GameArt, PixelHeart } from './pixel-art.jsx';
import { HERITAGE_QUESTIONS, HERITAGE_SOURCE, scoreHeritageAnswers } from './heritage-quiz.js';
import VideoJudge from './video-judge.jsx';
import { 
  Trophy, Users, Play, Pause, Square, CheckCircle,
  Mic, Activity, ShieldCheck, ChevronRight, ChevronLeft,
  Camera, Plus, Trash2, AlertTriangle, PlayCircle, Hash
} from 'lucide-react';

// --- MOCK DATA FOR ADVANCED TRACK (5 GAMES) ---
const GAMES = [
  { 
    id: 'g1', title: 'Backyard Football', type: 'Team Sport', ai: 'Vision', 
    desc: 'Tracks ball possession, jersey colors, goal scoring, and evaluates dribbling/passing skills.', 
    defaultRules: { timer: 120, points: '1 pt / goal', penalties: 'Fouls = -1 pt', tie: 'Sudden Death Penalty' } 
  },
  { 
    id: 'g2', title: 'Living Room Lava Relay', type: 'Team Sport', ai: 'Vision', 
    desc: 'Tracks leaps across pillows. Evaluates balance and penalizes touches on the "lava" floor.', 
    defaultRules: { timer: 90, points: 'Fastest completion', penalties: 'Floor Touch = +5s', tie: 'Rematch' } 
  },
  { 
    id: 'g3', title: 'Neon Dance Crew Battle', type: 'Team Sport', ai: 'Vision', 
    desc: 'Evaluates synchronized crew dancing, rhythm matching, and full-body poses simultaneously.', 
    defaultRules: { timer: 60, points: '0-100 Sync Score', penalties: 'Missed pose = -5 pts', tie: 'Tiebreaker Dance-Off' } 
  },
  { 
    id: 'g4', title: 'Cardboard Castle Siege', type: 'Team Sport', ai: 'Vision', 
    desc: 'Tracks thrown soft projectiles, evaluates accuracy, and calculates hit points on target zones.', 
    defaultRules: { timer: 60, points: 'Bullseye = 10pts, Hit = 5pts', penalties: 'Friendly fire = -5pts', tie: 'Closest to Bullseye' } 
  },
  { 
    id: 'g5', title: 'UAE Heritage Quest', type: 'Team Quiz', ai: 'Quiz',
    desc: 'Discover Emirati traditions, crafts, and hospitality in a friendly team quiz. Take turns and unlock heritage facts!',
    defaultRules: { timer: 180, points: '10 points per correct answer', penalties: 'No deduction for wrong answers', tie: 'Shared victory' }
  },
];

const INITIAL_PLAYERS = [
  { id: 'p1', name: 'Alex', color: '#FF0055', number: '10', team: 'Team A' },
  { id: 'p2', name: 'Jordan', color: '#FF0055', number: '7', team: 'Team A' },
  { id: 'p3', name: 'Casey', color: '#00E5FF', number: '99', team: 'Team B' },
  { id: 'p4', name: 'Sam', color: '#00E5FF', number: '1', team: 'Team B' },
];

// --- VIBRANT SHARED COMPONENTS ---
const Card = ({ children, className = '' }) => (
  <div className={`pixel-panel bg-white/95 overflow-hidden ${className}`}>
    {children}
  </div>
);
const CardHeader = ({ children, className = '' }) => <div className={`p-6 pb-4 ${className}`}>{children}</div>;
const CardTitle = ({ children, className = '' }) => <h3 className={`text-2xl font-black text-gray-800 tracking-tight ${className}`}>{children}</h3>;
const CardContent = ({ children, className = '' }) => <div className={`p-6 pt-0 ${className}`}>{children}</div>;
const CardFooter = ({ children, className = '' }) => <div className={`p-6 pt-0 flex items-center ${className}`}>{children}</div>;

const Button = ({ children, variant = 'default', size = 'default', className = '', ...props }) => {
  const base = "inline-flex items-center justify-center font-bold transition-transform active:scale-95 disabled:opacity-50 disabled:pointer-events-none rounded-xl";
  const variants = {
    default: "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg shadow-blue-500/30",
    yellow: "bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-gray-900 shadow-lg shadow-yellow-500/30",
    emerald: "bg-gradient-to-r from-emerald-400 to-emerald-500 hover:from-emerald-500 hover:to-emerald-600 text-white shadow-lg shadow-emerald-500/30",
    outline: "border-2 border-gray-300 bg-white/50 hover:bg-white text-gray-800",
    ghost: "hover:bg-gray-100 text-gray-600"
  };
  const sizes = {
    default: "h-14 px-8 text-lg",
    sm: "h-10 px-4 text-sm",
    icon: "h-14 w-14"
  };
  return <button type="button" className={`pixel-button pixel-button--${variant} ${base} ${variants[variant]} ${sizes[size]} ${className}`} {...props}>{children}</button>;
};

const Badge = ({ children, variant = 'default', className = '' }) => {
  const variants = {
    default: "bg-gray-200 text-gray-800",
    primary: "bg-blue-100 text-blue-800",
    amber: "bg-yellow-100 text-yellow-800",
    purple: "bg-purple-100 text-purple-800"
  };
  return <span className={`pixel-badge inline-flex items-center px-3 py-1 text-xs font-black uppercase tracking-wider ${variants[variant]} ${className}`}>{children}</span>;
};

// --- MAIN APP COMPONENT ---
export default function App() {
  const [currentStep, setCurrentStep] = useState(1);
  
  // Game State
  const [selectedGame, setSelectedGame] = useState(null);
  const [players, setPlayers] = useState(INITIAL_PLAYERS);
  const [rules, setRules] = useState({ timer: 60, points: '', penalties: '', tieBreak: '' });
  
  // Active Match State
  const [matchState, setMatchState] = useState({ 
    teamAScore: 0, 
    teamBScore: 0, 
    timeLeft: 60, 
    isPlaying: false, 
    round: 1 
  });
  
  // AI Results State
  const [aiResults, setAiResults] = useState(null);

  const isQuiz = selectedGame?.id === 'g5';
  const steps = ["Game", "Teams", "Rules", "Play", isQuiz ? "Review" : "AI Judge", "Results"];

  const handleNext = () => setCurrentStep(prev => Math.min(prev + 1, 6));
  const handleBack = () => setCurrentStep(prev => Math.max(prev - 1, 1));
  const resetMatch = () => {
    setMatchState({ teamAScore: 0, teamBScore: 0, timeLeft: rules.timer, isPlaying: false, round: 1 });
    setAiResults(null);
    setCurrentStep(1);
  };

  return (
    <div className={`game-shell game-step-${currentStep} min-h-screen text-gray-900 pb-20 selection:bg-yellow-300 selection:text-black`}>
      <div className="world-backdrop" aria-hidden="true"><PixelLandscape /></div>
      
      {/* HEADER & NAVIGATION */}
      <header className="game-header relative z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="game-brand flex items-center gap-3">
            <div className="brand-block">
              <PlayCircle className="w-8 h-8" />
            </div>
            <div><span className="brand-eyebrow">MULTIPLAYER ARCADE</span><h1>Family AI <span>Game Day</span></h1></div>
          </div>
          
          {/* STEPPER */}
          <nav aria-label="Game progress" className="game-progress flex-1 w-full max-w-2xl px-4 overflow-x-auto">
            <div className="flex items-center justify-between min-w-[500px]">
              {steps.map((step, idx) => {
                const stepNum = idx + 1;
                const isActive = currentStep === stepNum;
                const isPast = currentStep > stepNum;
                return (
                  <div key={step} aria-current={isActive ? 'step' : undefined} className={`progress-stop ${isActive ? 'is-active' : ''} ${isPast ? 'is-past' : ''} flex flex-col items-center flex-1 relative`}>
                    <div className={`step-block w-10 h-10 flex items-center justify-center font-black text-sm z-10 transition-all ${
                      isActive ? 'bg-yellow-400 text-gray-900 shadow-[0_0_15px_rgba(250,204,21,0.8)] scale-110' : 
                      isPast ? 'bg-emerald-400 text-white' : 'bg-white/20 text-white/50'
                    }`}>
                      {isPast ? <CheckCircle className="w-6 h-6" /> : stepNum}
                    </div>
                    <span className={`mt-2 text-xs font-bold drop-shadow-sm ${isActive ? 'text-yellow-300' : 'text-white/70'}`}>{step}</span>
                    {idx < steps.length - 1 && (
                      <div className={`absolute top-5 left-1/2 w-full h-1 -z-0 rounded-full ${isPast ? 'bg-emerald-400/50' : 'bg-white/10'}`}></div>
                    )}
                  </div>
                );
              })}
            </div>
          </nav>
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="max-w-6xl mx-auto px-4 py-8 relative z-10">
        <div className="world-status"><span><span className="status-light" /> WORLD 01 <span className="status-divider">/</span> FAMILY ARCADE</span><span className="health-hearts" aria-label="3 hearts"><PixelHeart /><PixelHeart /><PixelHeart /></span></div>
        {currentStep === 1 && (
          <Step1ChooseGame selectedGame={selectedGame} setSelectedGame={setSelectedGame} onNext={handleNext} setRules={setRules} />
        )}
        {currentStep === 2 && (
          <Step2Players players={players} setPlayers={setPlayers} onNext={handleNext} onBack={handleBack} />
        )}
        {currentStep === 3 && (
          <Step3Rules game={selectedGame} rules={rules} setRules={setRules} onNext={(r) => { setMatchState(prev => ({...prev, timeLeft: r.timer})); handleNext(); }} onBack={handleBack} />
        )}
        {currentStep === 4 && !isQuiz && (
          <Step4Play game={selectedGame} rules={rules} matchState={matchState} setMatchState={setMatchState} onNext={handleNext} />
        )}
        {currentStep === 4 && isQuiz && (
          <HeritageQuiz rules={rules} matchState={matchState} setMatchState={setMatchState} onComplete={results => { setAiResults(results); handleNext(); }} />
        )}
        {currentStep === 5 && isQuiz && (
          <HeritageReview results={aiResults} onNext={handleNext} />
        )}
        {currentStep === 5 && !isQuiz && (
          <Step5AIJudge game={selectedGame} rules={rules} players={players} matchState={matchState} onApplyResults={(results) => { setAiResults(results); handleNext(); }} />
        )}
        {currentStep === 6 && (
          <Step6Results matchState={matchState} aiResults={aiResults} players={players} onReset={resetMatch} />
        )}
      </main>
      <footer className="game-footer relative z-10"><span>LOCAL MULTIPLAYER</span><span>BUILD MEMORIES. LEVEL UP TOGETHER.</span><span>AI REPLAY + HERITAGE QUIZ</span></footer>
    </div>
  );
}

// --- STEPS IMPLEMENTATIONS ---

function Step1ChooseGame({ selectedGame, setSelectedGame, onNext, setRules }) {
  const handleSelect = (game) => {
    setSelectedGame(game);
    setRules({ timer: game.defaultRules.timer, points: game.defaultRules.points, penalties: game.defaultRules.penalties, tieBreak: game.defaultRules.tie });
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-500">
      <div className="quest-hero text-center text-white">
        <span className="hero-kicker">★ THE LIVING ROOM IS YOUR PLAYGROUND ★</span>
        <h2 className="hero-title"><span>READY, SET,</span><strong>GAME DAY!</strong></h2>
        <p>Real-world games. Your favorite people. A little AI magic.</p>
        <div className="hero-meta"><span><Users size={16} /> 4+ PLAYERS</span><span>5 CHALLENGES</span><span>∞ GOOD TIMES</span></div>
      </div>
      <div className="level-heading"><h3><span>01</span> SELECT YOUR CHALLENGE</h3><span>CHOOSE A CARTRIDGE TO BEGIN ↓</span></div>
      <div className="cartridge-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {GAMES.map((game, index) => (
          <Card 
            key={game.id} 
            className={`game-cartridge cursor-pointer transition-all ${
              selectedGame?.id === game.id ? 'cartridge-selected' : ''
            }`}
          >
            <div onClick={() => handleSelect(game)} className="h-full flex flex-col">
              <div className={`cartridge-art art-${game.id}`}><GameArt game={game.id} /><span className="level-number">LVL 0{index + 1}</span><span className="cartridge-marker">{selectedGame?.id === game.id ? '✓' : '✦'}</span></div>
              <CardHeader className="flex-1">
                <div className="flex flex-wrap gap-2 mb-4">
                  <Badge variant="purple"><Users className="w-3 h-3 mr-1 inline" /> TEAM PLAY</Badge>
                  <Badge variant="primary">{game.ai === 'Quiz' ? <><Hash className="w-3 h-3 mr-1 inline" /> QUIZ</> : <><Camera className="w-3 h-3 mr-1 inline" /> VISION</>}</Badge>
                </div>
                <CardTitle className="text-2xl mb-3 leading-tight">{game.title}</CardTitle>
                <p className="text-gray-600 font-medium">{game.desc}</p>
              </CardHeader>
              <CardFooter>
                <Button 
                  variant={selectedGame?.id === game.id ? 'yellow' : 'default'} 
                  className="w-full text-lg"
                  aria-pressed={selectedGame?.id === game.id}
                  onClick={(e) => { e.stopPropagation(); handleSelect(game); }}
                >
                  {selectedGame?.id === game.id ? '✓ EQUIPPED' : 'SELECT GAME'}<ChevronRight size={18} className="ml-auto" />
                </Button>
              </CardFooter>
            </div>
          </Card>
        ))}
      </div>

      <div className="start-game-bar flex justify-center pt-8">
        <span className="selection-hint">{selectedGame ? `${selectedGame.title} equipped. Let's go!` : '↑ Pick your adventure, then assemble your crew.'}</span>
        <Button variant="emerald" onClick={onNext} disabled={!selectedGame} className="w-full md:w-auto text-2xl px-12 py-8 rounded-2xl shadow-2xl shadow-emerald-500/50">
          NEXT: TEAMS <ChevronRight className="ml-3 w-8 h-8" />
        </Button>
      </div>
    </div>
  );
}

function Step2Players({ players, setPlayers, onNext, onBack }) {
  const addPlayer = () => {
    const newId = `p${Date.now()}`;
    setPlayers([...players, { id: newId, name: `Player ${players.length + 1}`, color: '#FFFF00', number: '99', team: 'Team A' }]);
  };
  const updatePlayer = (id, field, value) => {
    setPlayers(players.map(p => p.id === id ? { ...p, [field]: value } : p));
  };
  const removePlayer = (id) => {
    if (players.length > 4) setPlayers(players.filter(p => p.id !== id));
  };

  const isValid = players.length >= 4 && players.every(p => p.name.trim()) &&
    ['Team A', 'Team B'].every(team => players.some(p => p.team === team));

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-500 max-w-4xl mx-auto">
      <div className="text-center text-white drop-shadow-md">
        <h2 className="text-5xl font-black mb-3">Roster Setup</h2>
        <p className="text-xl font-medium opacity-90">Minimum 4 players required for Advanced Track.</p>
      </div>

      <Card className="border-4 border-white/20 p-2">
        <div className="flex justify-between items-center p-4 bg-gray-50 rounded-xl mb-4">
          <div className="font-bold text-gray-700 flex items-center gap-2">
            <Users className="text-blue-500" /> Total Players: {players.length}
          </div>
          <Button onClick={addPlayer} variant="default" size="sm" className="gap-2"><Plus className="w-5 h-5" /> Add Player</Button>
        </div>

        <div className="space-y-3 p-2">
          {players.map((p, index) => (
            <div key={p.id} className="flex flex-wrap md:flex-nowrap items-center gap-4 bg-white border-2 border-gray-100 p-4 rounded-xl shadow-sm hover:border-blue-200 transition-colors">
              <div className="font-black text-gray-400 w-6">{index + 1}.</div>
              <input 
                value={p.name} onChange={(e) => updatePlayer(p.id, 'name', e.target.value)} 
                className="flex-1 min-w-[120px] h-12 rounded-lg border-2 border-gray-200 bg-gray-50 px-4 font-bold text-gray-800 focus:border-blue-500 focus:outline-none" 
                placeholder="Name"
              />
              <div className="flex items-center gap-2 bg-gray-50 p-1 rounded-lg border-2 border-gray-200">
                <input type="color" value={p.color} onChange={(e) => updatePlayer(p.id, 'color', e.target.value)} className="w-10 h-10 rounded cursor-pointer border-0 p-0" />
              </div>
              <input 
                value={p.number} type="number" onChange={(e) => updatePlayer(p.id, 'number', e.target.value)} 
                className="w-20 h-12 rounded-lg border-2 border-gray-200 bg-gray-50 px-3 font-black text-center text-gray-800 focus:border-blue-500 focus:outline-none" 
                placeholder="#"
              />
              <select 
                value={p.team} onChange={(e) => updatePlayer(p.id, 'team', e.target.value)}
                className="h-12 w-32 rounded-lg border-2 border-gray-200 bg-gray-50 px-3 font-bold text-gray-800 focus:border-blue-500 focus:outline-none"
              >
                <option>Team A</option>
                <option>Team B</option>
              </select>
              <Button variant="ghost" size="icon" onClick={() => removePlayer(p.id)} disabled={players.length <= 4} className="text-red-500 hover:bg-red-50">
                <Trash2 className="w-6 h-6" />
              </Button>
            </div>
          ))}
        </div>
        {!isValid && <p className="text-red-500 font-bold text-center p-4">Add at least 4 named players and assign players to both teams.</p>}
      </Card>

      <div className="flex justify-between items-center">
        <Button variant="outline" onClick={onBack} className="bg-white/90 text-xl"><ChevronLeft className="mr-2 w-6 h-6" /> Back</Button>
        <Button variant="yellow" onClick={onNext} disabled={!isValid} className="text-2xl px-10 py-6 rounded-2xl">
          SAVE TEAMS <ChevronRight className="ml-2 w-6 h-6" />
        </Button>
      </div>
    </div>
  );
}

function Step3Rules({ game, rules, setRules, onNext, onBack }) {
  const [checks, setChecks] = useState({ cam: false, mic: false, space: false });
  const isQuiz = game.id === 'g5';
  const allReady = checks.cam && checks.mic && checks.space && Number.isInteger(rules.timer) && rules.timer > 0;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-500 max-w-3xl mx-auto">
      <div className="text-center text-white drop-shadow-md">
        <h2 className="text-5xl font-black mb-3">Game Settings</h2>
        <p className="text-xl font-medium opacity-90">Configuring: {game.title}</p>
      </div>

      <Card className="border-4 border-white/20">
        <CardContent className="pt-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-black text-gray-500 uppercase tracking-wide">Time Limit (Sec)</label>
              <input type="number" min="1" step="1" value={rules.timer} onChange={e => setRules({...rules, timer: e.target.value === '' ? '' : Number(e.target.value)})}
                className="w-full h-14 rounded-xl border-2 border-gray-200 bg-gray-50 px-4 font-bold text-xl text-gray-800" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-black text-gray-500 uppercase tracking-wide">Points System</label>
              <input readOnly={isQuiz} value={rules.points} onChange={e => setRules({...rules, points: e.target.value})}
                className="w-full h-14 rounded-xl border-2 border-gray-200 bg-gray-50 px-4 font-bold text-lg text-gray-800" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-black text-gray-500 uppercase tracking-wide">Penalties</label>
              <input readOnly={isQuiz} value={rules.penalties} onChange={e => setRules({...rules, penalties: e.target.value})}
                className="w-full h-14 rounded-xl border-2 border-gray-200 bg-gray-50 px-4 font-bold text-lg text-gray-800" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-black text-gray-500 uppercase tracking-wide">Tie-Breaker</label>
              <input readOnly={isQuiz} value={rules.tieBreak} onChange={e => setRules({...rules, tieBreak: e.target.value})}
                className="w-full h-14 rounded-xl border-2 border-gray-200 bg-gray-50 px-4 font-bold text-lg text-gray-800" />
            </div>
          </div>

          <div className="mt-8 p-6 bg-blue-50 rounded-xl border-2 border-blue-100">
            <h4 className="font-black text-blue-900 mb-4 text-xl">Pre-Match Checklist</h4>
            <div className="space-y-3">
              {(isQuiz ? [
                { id: 'cam', label: 'Both teams can see the questions', icon: <Users className="text-blue-500" /> },
                { id: 'mic', label: 'Teams agree to alternate answers', icon: <CheckCircle className="text-blue-500" /> },
                { id: 'space', label: 'Ready for six questions — no camera needed', icon: <ShieldCheck className="text-blue-500" /> }
              ] : [
                { id: 'cam', label: 'Camera captures full play area', icon: <Camera className="text-blue-500" /> },
                { id: 'mic', label: 'Microphone is on and working', icon: <Mic className="text-blue-500" /> },
                { id: 'space', label: 'Play space is safe & clear', icon: <ShieldCheck className="text-blue-500" /> }
              ]).map(item => (
                <label key={item.id} className="flex items-center gap-4 p-4 rounded-xl bg-white border-2 border-blue-100 cursor-pointer hover:border-blue-300 transition-colors shadow-sm">
                  <input type="checkbox" checked={checks[item.id]} onChange={e => setChecks({...checks, [item.id]: e.target.checked})} 
                    className="w-6 h-6 text-blue-600 rounded border-gray-300 focus:ring-blue-500" />
                  <span className="flex-1 font-bold text-gray-700 text-lg">{item.label}</span>
                  {item.icon}
                </label>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between items-center">
        <Button variant="outline" onClick={onBack} className="bg-white/90 text-xl"><ChevronLeft className="mr-2 w-6 h-6" /> Back</Button>
        <Button variant="emerald" onClick={() => onNext(rules)} disabled={!allReady} className="text-2xl px-10 py-6 rounded-2xl animate-pulse">
          EVERYONE READY <ChevronRight className="ml-2 w-6 h-6" />
        </Button>
      </div>
    </div>
  );
}

function Step4Play({ game, rules, matchState, setMatchState, onNext }) {
  const timerRef = useRef(null);
  const [trackingLost, setTrackingLost] = useState(false);

  useEffect(() => {
    if (matchState.isPlaying && matchState.timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setMatchState(prev => ({ ...prev, timeLeft: Math.max(0, prev.timeLeft - 1), isPlaying: prev.timeLeft > 1 }));
      }, 1000);
    } else if (matchState.timeLeft === 0 && matchState.isPlaying) {
      setMatchState(prev => ({ ...prev, isPlaying: false }));
    }
    return () => clearInterval(timerRef.current);
  }, [matchState.isPlaying, matchState.timeLeft, setMatchState]);

  const togglePlay = () => setMatchState(prev => ({ ...prev, isPlaying: prev.timeLeft > 0 && !prev.isPlaying }));
  const resetTimer = () => setMatchState(prev => ({ ...prev, isPlaying: false, timeLeft: rules.timer }));

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500 max-w-6xl mx-auto">
      
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row justify-between items-center bg-white/90 backdrop-blur-md p-6 rounded-3xl shadow-2xl">
        <div className="text-center md:text-left mb-4 md:mb-0">
          <Badge variant="purple" className="mb-2">Round {matchState.round}</Badge>
          <h2 className="text-3xl font-black text-gray-900 leading-none">{game.title}</h2>
        </div>
        
        {/* Giant Timer */}
        <div className="flex items-center gap-6">
          <div className="flex gap-2">
            <Button onClick={togglePlay} variant={matchState.isPlaying ? 'yellow' : 'emerald'} size="icon" className="w-16 h-16 rounded-2xl shadow-xl">
              {matchState.isPlaying ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8 ml-1" />}
            </Button>
            <Button onClick={resetTimer} variant="outline" size="icon" className="w-16 h-16 rounded-2xl bg-white border-2">
              <Square className="w-6 h-6" />
            </Button>
          </div>
          <div className={`text-7xl font-black tabular-nums tracking-tighter ${matchState.timeLeft <= 10 ? 'text-red-500 animate-pulse' : 'text-gray-900'}`}>
            {formatTime(matchState.timeLeft)}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Scoreboard */}
        <Card className="lg:col-span-1 border-4 border-white/20 bg-white/95 flex flex-col justify-center p-8 space-y-8">
          <div className="text-center">
            <h3 className="text-2xl font-black text-rose-500 mb-2">TEAM A</h3>
            <div className="text-8xl font-black text-gray-900 leading-none">{matchState.teamAScore}</div>
            <div className="flex justify-center gap-2 mt-4">
              <Button variant="outline" onClick={() => setMatchState(p => ({...p, teamAScore: Math.max(0, p.teamAScore - 1)}))}>-</Button>
              <Button variant="default" onClick={() => setMatchState(p => ({...p, teamAScore: p.teamAScore + 1}))}>+</Button>
            </div>
          </div>
          <hr className="border-gray-200 border-2 rounded" />
          <div className="text-center">
            <h3 className="text-2xl font-black text-blue-500 mb-2">TEAM B</h3>
            <div className="text-8xl font-black text-gray-900 leading-none">{matchState.teamBScore}</div>
            <div className="flex justify-center gap-2 mt-4">
              <Button variant="outline" onClick={() => setMatchState(p => ({...p, teamBScore: Math.max(0, p.teamBScore - 1)}))}>-</Button>
              <Button variant="default" onClick={() => setMatchState(p => ({...p, teamBScore: p.teamBScore + 1}))}>+</Button>
            </div>
          </div>
        </Card>

        {/* Right: Camera Feed & Tracking Error overlay */}
        <Card className="lg:col-span-2 border-4 border-white/20 bg-gray-900 relative overflow-hidden flex flex-col">
          <div className="absolute top-4 right-4 z-20">
            <Button size="sm" variant={trackingLost ? 'yellow' : 'outline'} onClick={() => setTrackingLost(!trackingLost)} className="opacity-80 hover:opacity-100 text-xs">
              Toggle Demo Tracking Error
            </Button>
          </div>

          <div className="flex-1 relative flex items-center justify-center min-h-[400px]">
            {/* Fake Video */}
            <Camera className="w-32 h-32 text-gray-700/50 absolute" />
            
            {matchState.isPlaying && !trackingLost && (
              <div className="absolute inset-0 border-4 border-green-500/50 m-4 rounded-xl">
                 <span className="absolute top-2 left-2 bg-green-500 text-white font-bold px-2 py-1 text-xs rounded animate-pulse">DEMO TRACKING ACTIVE</span>
              </div>
            )}

            {/* MANDATORY ERROR OVERLAY */}
            {trackingLost && (
              <div className="absolute inset-0 bg-red-900/80 z-10 flex items-center justify-center p-8">
                <div className="bg-red-600 border-4 border-white text-white p-8 rounded-3xl shadow-[0_0_50px_rgba(220,38,38,1)] text-center animate-pulse max-w-lg">
                  <AlertTriangle className="w-24 h-24 mx-auto mb-6 text-yellow-300" />
                  <h3 className="text-4xl font-black mb-4 uppercase leading-tight">Camera Alert (Demo)</h3>
                  <p className="text-xl font-bold">Feed lost or no player movement tracked! Please turn on the camera or step into the frame.</p>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>

      <div className="flex justify-center pt-6">
        <Button onClick={onNext} variant="yellow" className="h-20 px-16 text-3xl rounded-3xl shadow-[0_10px_0_#ca8a04] active:shadow-none active:translate-y-[10px]" disabled={matchState.isPlaying}>
          SEND TO AI JUDGE <ChevronRight className="ml-4 w-10 h-10" />
        </Button>
      </div>
    </div>
  );
}

function HeritageQuiz({ rules, matchState, setMatchState, onComplete }) {
  const [answers, setAnswers] = useState([]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [started, setStarted] = useState(false);
  const answerLock = useRef(false);
  const submitted = useRef(false);
  const question = HERITAGE_QUESTIONS[questionIndex];
  const currentAnswer = answers.find(answer => answer.question === questionIndex);
  const scores = scoreHeritageAnswers(answers);
  const expired = matchState.timeLeft === 0;

  useEffect(() => {
    if (!matchState.isPlaying) return;
    const interval = setInterval(() => setMatchState(previous => ({
      ...previous, timeLeft: Math.max(0, previous.timeLeft - 1), isPlaying: previous.timeLeft > 1,
    })), 1000);
    return () => clearInterval(interval);
  }, [matchState.isPlaying, setMatchState]);

  function chooseAnswer(choice) {
    if (answerLock.current || currentAnswer || !matchState.isPlaying || expired) return;
    answerLock.current = true;
    const updated = [...answers, { question: questionIndex, choice }];
    setAnswers(updated);
    setMatchState(previous => ({ ...previous, ...scoreHeritageAnswers(updated) }));
  }

  function finishQuiz() {
    if (submitted.current) return;
    submitted.current = true;
    setMatchState(previous => ({ ...previous, ...scores, isPlaying: false }));
    onComplete({ kind: 'quiz', answers, teamAAdd: 0, teamBAdd: 0 });
  }

  return <div className="space-y-6 max-w-4xl mx-auto">
    <div className="text-center"><h2>UAE Heritage Quest</h2><p>Explore the traditions. Share the knowledge.</p></div>
    <div className="quiz-hud"><span>TEAM A: {scores.teamAScore}</span><span aria-label="Time remaining">{Math.floor(matchState.timeLeft / 60)}:{String(matchState.timeLeft % 60).padStart(2, '0')}</span><span>TEAM B: {scores.teamBScore}</span></div>
    <Card>
      <div className="heritage-banner"><GameArt game="g5" /></div>
      <CardContent className="pt-6 space-y-6">
        {!started ? <div className="space-y-6 text-center"><h3>HOW TO PLAY</h3><p className="text-2xl">Team A starts. Take turns answering six questions — three per team. Correct answers earn 10 points; wrong answers earn 0. Finish within {rules.timer} seconds. A tied score is a shared victory.</p><Button variant="yellow" onClick={() => { setStarted(true); setMatchState(previous => ({ ...previous, teamAScore: 0, teamBScore: 0, isPlaying: true })); }}>START QUIZ</Button></div> : <>
          <div className="flex flex-wrap justify-between gap-3"><Badge>QUESTION {questionIndex + 1} / {HERITAGE_QUESTIONS.length}</Badge><Badge>{questionIndex % 2 === 0 ? 'TEAM A' : 'TEAM B'}'S TURN</Badge></div>
          <h3 className="quiz-question">{question.question}</h3>
          <div className="quiz-options">{question.options.map((option, index) => <Button key={option} variant={currentAnswer && index === question.answer ? 'emerald' : currentAnswer?.choice === index ? 'yellow' : 'outline'} disabled={Boolean(currentAnswer) || !matchState.isPlaying || expired} onClick={() => chooseAnswer(index)}><span>{String.fromCharCode(65 + index)}.</span> {option}</Button>)}</div>
          <div aria-live="polite">{currentAnswer && <div className="quiz-feedback"><strong>{currentAnswer.choice === question.answer ? 'CORRECT! +10 POINTS' : `Correct answer: ${question.options[question.answer]}`}</strong><p>{question.fact}</p></div>}{expired && <p className="text-2xl">Time's up! Unanswered questions earn no points. Review your answers below.</p>}</div>
          <div className="flex flex-wrap gap-4">{!expired && !currentAnswer && <Button variant="outline" onClick={() => setMatchState(previous => ({ ...previous, isPlaying: !previous.isPlaying }))}>{matchState.isPlaying ? 'PAUSE' : 'RESUME'}</Button>}
            {(expired || (currentAnswer && questionIndex === HERITAGE_QUESTIONS.length - 1)) ? <Button variant="yellow" onClick={finishQuiz}>REVIEW ANSWERS <ChevronRight size={18} /></Button> : currentAnswer && <Button onClick={() => { answerLock.current = false; setQuestionIndex(index => index + 1); }}>NEXT QUESTION <ChevronRight size={18} /></Button>}
          </div>
        </>}
      </CardContent>
    </Card>
  </div>;
}

function HeritageReview({ results, onNext }) {
  return <div className="space-y-6 max-w-4xl mx-auto">
    <div className="text-center"><h2>Heritage Quest Review</h2><p>{results.answers.length} of {HERITAGE_QUESTIONS.length} questions answered. Scores come from your answers.</p></div>
    <Card><CardContent className="pt-6 space-y-6">{HERITAGE_QUESTIONS.map((question, index) => {
      const answer = results.answers.find(item => item.question === index);
      const correct = answer?.choice === question.answer;
      return <section key={question.question} className="quiz-review-item"><Badge>{index % 2 === 0 ? 'TEAM A' : 'TEAM B'} · {correct ? '+10' : '+0'}</Badge><h3 className="quiz-question">{index + 1}. {question.question}</h3><p>Your answer: {answer ? question.options[answer.choice] : 'Unanswered'}</p><p><strong>Correct answer: {question.options[question.answer]}</strong></p><p>{question.fact}</p></section>;
    })}<a href={HERITAGE_SOURCE} target="_blank" rel="noreferrer" className="underline text-xl">Explore the heritage topics on UNESCO ↗</a></CardContent></Card>
    <Button variant="yellow" onClick={onNext}>VIEW FINAL SCORES <ChevronRight size={18} /></Button>
  </div>;
}

function Step5AIJudge(props) {
  const [showDemo, setShowDemo] = useState(false);
  if (showDemo) return <div className="space-y-6"><Button variant="outline" onClick={() => setShowDemo(false)}>BACK TO VIDEO UPLOAD</Button><Step5DemoJudge onApplyResults={props.onApplyResults} /></div>;
  return <VideoJudge {...props} onUseDemo={() => setShowDemo(true)} />;
}

function Step5DemoJudge({ onApplyResults }) {
  // Simulated Results based on the current game
  const simulatedResults = {
    possession: { teamA: 65, teamB: 35 },
    skillEval: "Team A demonstrated high agility and coordination. Player 1 (Team A) maintained excellent passing accuracy.",
    events: [
      "00:15 - Valid action detected by Player 2.",
      "00:42 - Goal/Point scored by Player 1.",
      "01:10 - Minor penalty detected (floor touch/foul)."
    ],
    teamAAdd: 10,
    teamBAdd: 5
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700 max-w-5xl mx-auto">
      <div className="text-center text-white drop-shadow-md mb-8">
        <h2 className="text-5xl font-black mb-3">Demo AI Video Analysis</h2>
        <p className="text-xl font-medium opacity-90">Simulated report — no camera footage is recorded or analyzed.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Mock AI Replay View */}
        <Card className="bg-gray-900 border-4 border-blue-500 overflow-hidden relative min-h-[300px]">
          <div className="absolute inset-0 opacity-30 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-600 to-gray-900"></div>
          <div className="absolute top-4 left-4 bg-blue-500 text-white font-black px-3 py-1 text-sm rounded shadow-lg animate-pulse">ANALYZING PLAY...</div>
          
          {/* Mock Bounding Boxes */}
          <div className="absolute top-1/4 left-1/4 w-32 h-48 border-4 border-rose-500 bg-rose-500/20 rounded">
            <span className="absolute -top-8 left-[-4px] bg-rose-500 text-white text-xs font-black px-2 py-1">[P1 - Team A]</span>
          </div>
          <div className="absolute top-1/3 right-1/3 w-24 h-40 border-4 border-cyan-500 bg-cyan-500/20 rounded">
            <span className="absolute -top-8 left-[-4px] bg-cyan-500 text-white text-xs font-black px-2 py-1">[P3 - Team B]</span>
          </div>
        </Card>

        {/* AI Report */}
        <Card className="border-4 border-white/20 bg-white/95">
          <CardHeader className="border-b-2 border-gray-100 bg-gray-50">
            <CardTitle className="text-emerald-600 flex items-center gap-2"><Activity /> Simulated Match Report</CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            <div>
              <h4 className="font-black text-gray-500 uppercase text-xs tracking-wider mb-2">Skill Evaluation</h4>
              <p className="text-lg font-bold text-gray-800 bg-emerald-50 p-4 rounded-xl border border-emerald-100">{simulatedResults.skillEval}</p>
            </div>

            <div>
              <h4 className="font-black text-gray-500 uppercase text-xs tracking-wider mb-2">Possession / Activity Stats</h4>
              <div className="space-y-3">
                <div className="flex items-center gap-4">
                  <span className="w-16 font-black text-rose-500">Team A</span>
                  <div className="flex-1 h-6 bg-gray-200 rounded-full overflow-hidden shadow-inner">
                    <div className="h-full bg-rose-500" style={{width: `${simulatedResults.possession.teamA}%`}}></div>
                  </div>
                  <span className="w-12 text-right font-bold">{simulatedResults.possession.teamA}%</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="w-16 font-black text-blue-500">Team B</span>
                  <div className="flex-1 h-6 bg-gray-200 rounded-full overflow-hidden shadow-inner">
                    <div className="h-full bg-blue-500" style={{width: `${simulatedResults.possession.teamB}%`}}></div>
                  </div>
                  <span className="w-12 text-right font-bold">{simulatedResults.possession.teamB}%</span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-black text-gray-500 uppercase text-xs tracking-wider mb-2">Key Events Log</h4>
              <ul className="space-y-2">
                {simulatedResults.events.map((ev, i) => (
                  <li key={i} className="text-sm font-bold text-gray-600 bg-gray-100 p-2 rounded flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" /> {ev}
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
          <CardFooter className="bg-gray-50 border-t-2 border-gray-100">
            <Button onClick={() => onApplyResults(simulatedResults)} variant="emerald" className="w-full text-xl h-16 shadow-xl">
              APPLY DEMO RESULTS <ChevronRight className="ml-2 w-6 h-6" />
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

function Step6Results({ matchState, aiResults, players, onReset }) {
  const isQuiz = aiResults?.kind === 'quiz';
  const isVideo = aiResults?.kind === 'video';
  const isManual = aiResults?.kind === 'manual';
  // Ensure we have results to display
  const finalScoreA = Math.max(0, matchState.teamAScore + (aiResults?.teamAAdd || 0));
  const finalScoreB = Math.max(0, matchState.teamBScore + (aiResults?.teamBAdd || 0));
  
  let winner = 'Draw';
  let winnerColor = 'from-gray-500 to-gray-600';
  if (finalScoreA > finalScoreB) { winner = 'Team A'; winnerColor = 'from-rose-500 to-pink-600'; }
  else if (finalScoreB > finalScoreA) { winner = 'Team B'; winnerColor = 'from-blue-500 to-cyan-600'; }

  // Simple mock logic for MVP: just grab the first player of winning team, or first player
  const mvp = players.find(p => p.team === (winner === 'Draw' ? 'Team A' : winner)) || players[0];
  
  const totalScore = finalScoreA + finalScoreB;
  const possA = isQuiz ? (totalScore ? Math.round(finalScoreA / totalScore * 100) : 50) : aiResults?.possession?.teamA ?? 50;
  const possB = isQuiz ? 100 - possA : aiResults?.possession?.teamB ?? 50;

  return (
    <div className="space-y-8 animate-in zoom-in-95 duration-700 max-w-5xl mx-auto">
      
      {/* Massive Winner Banner */}
      <div className={`p-12 rounded-[3rem] text-center shadow-2xl bg-gradient-to-r ${winnerColor} text-white relative overflow-hidden border-8 border-white/30`}>
        <div className="absolute -top-10 -right-10 opacity-20"><Trophy className="w-64 h-64 rotate-12" /></div>
        <h1 className="text-7xl font-black mb-4 relative z-10 tracking-tighter drop-shadow-lg">
          {winner === 'Draw' ? 'IT\'S A TIE!' : `${winner} WINS!`}
        </h1>
        <p className="text-3xl font-bold opacity-90 relative z-10 bg-white/20 inline-block px-6 py-2 rounded-full">
          Final Score: {finalScoreA} - {finalScoreB}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Match Facts */}
        <Card className="border-4 border-white/20 bg-white/95">
          <CardHeader className="bg-gray-50 border-b-2 border-gray-100">
            <CardTitle className="text-2xl text-gray-800">Match Facts</CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-8">
            <div className="flex justify-between items-center bg-gray-100 p-6 rounded-2xl">
              <div className="text-center">
                <p className="text-5xl font-black text-gray-800">{finalScoreA + finalScoreB}</p>
                <p className="text-sm text-gray-500 uppercase font-black tracking-wider mt-1">Total Pts</p>
              </div>
              <div className="w-1 h-16 bg-gray-300 rounded"></div>
              <div className="text-center">
                <p className="text-xl font-black text-emerald-600 bg-emerald-100 px-4 py-2 rounded-xl">{isQuiz ? 'Answer Checked' : isVideo ? 'AI Frame Review' : isManual ? 'Manual Scores' : 'Demo Results'}</p>
                <p className="text-sm text-gray-500 uppercase font-black tracking-wider mt-2">Judging</p>
              </div>
            </div>

            {!isVideo && !isManual && <div>
              <h4 className="font-black text-gray-500 uppercase text-xs tracking-wider mb-4">{isQuiz ? (totalScore ? 'Share of points earned' : 'No points earned — even split shown') : 'Possession / Activity Split'}</h4>
              <div className="h-10 flex rounded-2xl overflow-hidden shadow-inner font-black text-white text-lg">
                <div className="bg-rose-500 h-full flex items-center justify-center" style={{width: `${possA}%`}}>{possA}%</div>
                <div className="bg-blue-500 h-full flex items-center justify-center" style={{width: `${possB}%`}}>{possB}%</div>
              </div>
            </div>}
            
            <div className="bg-purple-50 p-4 rounded-xl border border-purple-100">
              <h4 className="font-black text-purple-900 uppercase text-xs tracking-wider mb-2">{isQuiz ? 'Heritage Quiz' : isManual ? 'Scoreboard' : 'AI Highlight'}</h4>
              <p className="text-purple-800 font-bold">{isQuiz ? `${totalScore / 10} correct answers out of ${HERITAGE_QUESTIONS.length}. ${winner === 'Draw' ? 'A shared victory for both teams!' : `${winner} wins the Heritage Quest!`}` : aiResults?.skillEval}</p>
              {isVideo && <p className="text-xl mt-3">AI estimate from {aiResults.frameCount} sampled still frames. Score corrections applied: Team A {aiResults.teamAAdd >= 0 ? '+' : ''}{aiResults.teamAAdd}, Team B {aiResults.teamBAdd >= 0 ? '+' : ''}{aiResults.teamBAdd}. Scores cannot go below zero.</p>}
            </div>
          </CardContent>
        </Card>

        {/* MVP Card */}
        <Card className="border-4 border-yellow-400 bg-gradient-to-br from-yellow-50 to-yellow-200 overflow-hidden relative">
          <div className="absolute -top-20 -right-20 opacity-10"><Trophy className="w-64 h-64" /></div>
          <CardHeader className="text-center pb-0 relative z-10">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-yellow-400 text-yellow-900 mb-4 shadow-lg rotate-3">
              <Trophy className="w-8 h-8" />
            </div>
            <CardTitle className="text-3xl text-yellow-900 font-black tracking-tight">{isQuiz || isVideo || isManual ? 'TEAM REPRESENTATIVE' : 'MOST VALUABLE PLAYER'}</CardTitle>
          </CardHeader>
          <CardContent className="text-center pt-8 pb-8 flex flex-col items-center relative z-10">
            <div 
              className="w-32 h-32 rounded-full flex items-center justify-center text-5xl font-black text-white shadow-2xl mb-6 border-8 border-white"
              style={{ backgroundColor: mvp.color }}
            >
              #{mvp.number}
            </div>
            <h3 className="text-5xl font-black text-gray-900 mb-2">{mvp.name}</h3>
            <Badge variant={winner === 'Team A' ? 'primary' : 'default'} className="text-lg px-4 py-2 bg-white text-gray-800 shadow">{mvp.team}</Badge>
            <p className="text-sm font-bold text-yellow-800 mt-6 max-w-[250px]">{isQuiz || isVideo || isManual ? 'First roster member on the winning team (Team A for a draw). This is a team representative, not an AI player ranking.' : 'Demo selection: first roster member on the winning team (Team A for a draw).'}</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-center pt-8">
        <Button onClick={onReset} variant="yellow" className="h-20 px-16 text-2xl rounded-3xl shadow-[0_10px_0_#ca8a04] active:shadow-none active:translate-y-[10px]">
          CHOOSE ANOTHER GAME <Play className="ml-3 w-8 h-8 fill-current" />
        </Button>
      </div>
    </div>
  );
}
