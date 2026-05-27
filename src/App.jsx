import React from 'react';
import io from 'socket.io-client';
import { useEffect, useState } from 'react';
import ChatInterface from './ChatInterface';
const socket = io.connect(
  window.location.hostname === "localhost" 
    ? "http://localhost:5000" 
    : "https://chatapp-mxuy.onrender.com"
);
const BREATHING_STYLES = [
  {
    id: "sun",
    name: "Sun Breathing",
    kanji: "日",
    subText: "Thirteenth Form • Hinokami Kagura",
    themeType: "dark",
    bgColor: "bg-gradient-to-br from-[#120200] via-[#2a0802] to-[#0f0200]",
    cardBg: "bg-[#180704]/90 border-orange-500/40 text-orange-100 shadow-[0_0_40px_rgba(234,88,12,0.15)]",
    borderColor: "border-orange-500/50",
    textGradient: "from-amber-200 via-orange-400 to-red-500",
    kanjiText: "text-orange-500 drop-shadow-[0_0_15px_rgba(234,88,12,0.8)] animate-pulse",
    badgeBg: "bg-orange-950/60",
    badgeBorder: "border-orange-500/40",
    glowColor: "rgba(234, 88, 12, 0.3)",
    effectClass: "animate-solarFlare opacity-30 bg-radial-sun",
    particleColor: "bg-gradient-to-t from-red-500 to-yellow-400 shadow-[0_0_12px_#ea580c] animate-floatUpFast",
  },
  {
    id: "moon",
    name: "Moon Breathing",
    kanji: "月",
    subText: "Sixteenth Form: Moonbow - Half Moon",
    themeType: "dark",
    bgColor: "bg-gradient-to-tr from-[#05030a] via-[#0d0722] to-[#040209]",
    cardBg: "bg-[#0b061a]/95 border-purple-500/30 text-purple-100 shadow-[0_0_40px_rgba(147,51,234,0.1)]",
    borderColor: "border-purple-600/40",
    textGradient: "from-indigo-200 via-purple-300 to-fuchsia-400",
    kanjiText: "text-purple-300 drop-shadow-[0_0_12px_rgba(168,85,247,0.6)]",
    badgeBg: "bg-purple-950/50",
    badgeBorder: "border-purple-500/30",
    glowColor: "rgba(147, 51, 234, 0.2)",
    effectClass: "animate-moonCrescent opacity-20 bg-radial-moon",
    particleColor: "bg-indigo-300/60 shadow-[0_0_8px_#a78bfa] animate-floatSlow",
  },
  {
    id: "flame",
    name: "Flame Breathing",
    kanji: "炎",
    subText: "Ninth Form: Rengoku",
    themeType: "dark",
    bgColor: "bg-gradient-to-b from-[#0f0202] via-[#310707] to-[#050000]",
    cardBg: "bg-[#160404]/95 border-red-500/40 text-red-100 shadow-[0_0_45px_rgba(220,38,38,0.2)]",
    borderColor: "border-red-600/50",
    textGradient: "from-yellow-200 via-orange-400 to-red-500",
    kanjiText: "text-red-500 drop-shadow-[0_0_15px_rgba(220,38,38,0.7)]",
    badgeBg: "bg-red-950/60",
    badgeBorder: "border-red-500/40",
    glowColor: "rgba(220, 38, 38, 0.3)",
    effectClass: "animate-infernoWave opacity-25 bg-gradient-to-t from-red-600/20 via-orange-500/10 to-transparent",
    particleColor: "bg-orange-500 shadow-[0_0_10px_#ef4444] animate-floatUpFast",
  },
  {
    id: "water",
    name: "Water Breathing",
    kanji: "水",
    subText: "Eleventh Form: Dead Calm",
    themeType: "light-ambient", 
    bgColor: "bg-gradient-to-br from-[#bae6fd] via-[#7dd3fc] to-[#e0f2fe]",
    cardBg: "bg-white/80 backdrop-blur-xl border-sky-300/80 text-sky-950 shadow-[0_20px_50px_rgba(14,165,233,0.15)]",
    borderColor: "border-sky-400",
    textGradient: "from-sky-950 via-blue-900 to-cyan-950",
    kanjiText: "text-sky-600 drop-shadow-[0_0_8px_rgba(14,165,233,0.4)]",
    badgeBg: "bg-sky-50 border border-sky-200",
    badgeBorder: "border-sky-300",
    glowColor: "rgba(56, 189, 248, 0.5)",
    effectClass: "animate-waterFlow opacity-40 bg-linear-waves",
    particleColor: "bg-white/90 shadow-[0_0_8px_#ffffff] animate-floatUpSlow",
  },
  {
    id: "thunder",
    name: "Thunder Breathing",
    kanji: "雷",
    subText: "First Form: Thunderclap and Flash",
    themeType: "dark",
    bgColor: "bg-gradient-to-br from-[#020200] via-[#1a1602] to-[#050501]",
    cardBg: "bg-[#0f0d02]/95 border-yellow-500/40 text-amber-100 shadow-[0_0_40px_rgba(234,179,8,0.15)]",
    borderColor: "border-yellow-500/60",
    textGradient: "from-white via-yellow-300 to-amber-500",
    kanjiText: "text-yellow-400 drop-shadow-[0_0_15px_rgba(234,179,8,0.8)]",
    badgeBg: "bg-yellow-950/60",
    badgeBorder: "border-yellow-500/40",
    glowColor: "rgba(234, 179, 8, 0.25)",
    effectClass: "animate-lightningFlash opacity-30 bg-lightning-bolt",
    particleColor: "bg-yellow-300 shadow-[0_0_12px_#eab308] animate-zigzag",
  },
  {
    id: "wind",
    name: "Wind Breathing",
    kanji: "風",
    subText: "Seventh Form: Gale - Sudden Gusts",
    themeType: "dark",
    bgColor: "bg-gradient-to-tr from-[#020503] via-[#0b1c11] to-[#040a06]",
    cardBg: "bg-[#07140d]/95 border-emerald-500/30 text-emerald-100 shadow-[0_0_40px_rgba(16,185,129,0.1)]",
    borderColor: "border-emerald-500/50",
    textGradient: "from-emerald-200 via-teal-300 to-emerald-500",
    kanjiText: "text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,0.5)]",
    badgeBg: "bg-emerald-950/50",
    badgeBorder: "border-emerald-500/30",
    glowColor: "rgba(16, 185, 129, 0.2)",
    effectClass: "animate-windVortex opacity-20 bg-linear-wind",
    particleColor: "bg-emerald-300/50 shadow-[0_0_6px_#34d399] animate-floatSlow",
  },
  {
    id: "stone",
    name: "Stone Breathing",
    kanji: "岩",
    subText: "Fourth Form: Volcanic Rock",
    themeType: "dark",
    bgColor: "bg-gradient-to-br from-[#0a0907] via-[#211d18] to-[#0c0a08]",
    cardBg: "bg-[#14120f]/95 border-stone-600/40 text-stone-200 shadow-[0_0_35px_rgba(120,113,108,0.15)]",
    borderColor: "border-stone-500/50",
    textGradient: "from-stone-300 via-amber-100 to-stone-500",
    kanjiText: "text-stone-400 drop-shadow-[0_0_10px_rgba(168,162,158,0.4)]",
    badgeBg: "bg-stone-900/60",
    badgeBorder: "border-stone-500/30",
    glowColor: "rgba(120, 113, 108, 0.15)",
    effectClass: "animate-stoneQuake opacity-15 bg-stone-faults",
    particleColor: "bg-stone-600 border border-stone-500 shadow-md animate-floatUpSlow",
  },
  {
    id: "sound",
    name: "Sound Breathing",
    kanji: "音",
    subText: "Fifth Form: Symphony of Shrill Strings",
    themeType: "dark",
    bgColor: "bg-gradient-to-tr from-[#0d0208] via-[#2d0b1f] to-[#0a0206]",
    cardBg: "bg-[#180612]/90 border-rose-500/30 text-rose-100 shadow-[0_0_40px_rgba(244,63,94,0.12)]",
    borderColor: "border-rose-600/50",
    textGradient: "from-yellow-100 via-rose-300 to-orange-400",
    kanjiText: "text-rose-400 drop-shadow-[0_0_10px_rgba(244,63,94,0.6)]",
    badgeBg: "bg-rose-950/50",
    badgeBorder: "border-rose-500/30",
    glowColor: "rgba(244, 63, 94, 0.2)",
    effectClass: "animate-soundWaves opacity-25 bg-concentric-ripples",
    particleColor: "bg-amber-400 shadow-[0_0_8px_#fbbf24] animate-zigzag",
  },
  {
    id: "mist",
    name: "Mist Breathing",
    kanji: "霞",
    subText: "Seventh Form: Obscuring Clouds",
    themeType: "light-ambient", 
    bgColor: "bg-gradient-to-tr from-[#ccfbf1] via-[#99f6e4] to-[#f0fdfa]",
    cardBg: "bg-white/75 backdrop-blur-2xl border-teal-200/80 text-teal-950 shadow-[0_20px_40px_rgba(13,148,136,0.08)]",
    borderColor: "border-teal-400/60",
    textGradient: "from-teal-950 via-teal-800 to-cyan-950",
    kanjiText: "text-teal-600 drop-shadow-[0_0_8px_rgba(20,184,166,0.4)]",
    badgeBg: "bg-teal-50 border border-teal-200/60",
    badgeBorder: "border-teal-300",
    glowColor: "rgba(45, 212, 191, 0.4)", 
    effectClass: "animate-mistDrift opacity-60 bg-gradient-radial-fog",
    particleColor: "bg-teal-200/80 shadow-[0_0_5px_#2dd4bf] animate-floatSlow",
  },
  {
    id: "beast",
    name: "Beast Breathing",
    kanji: "獣",
    subText: "Fifth Fang: Crazy Cutting",
    themeType: "dark",
    bgColor: "bg-gradient-to-br from-[#020408] via-[#0d1624] to-[#04060a]",
    cardBg: "bg-[#090f1a]/95 border-slate-700/40 text-slate-200 shadow-[0_0_35px_rgba(71,85,105,0.15)]",
    borderColor: "border-slate-600/50",
    textGradient: "from-slate-200 via-indigo-200 to-zinc-400",
    kanjiText: "text-slate-400 drop-shadow-[0_0_6px_rgba(148,163,184,0.5)]",
    badgeBg: "bg-slate-900/60",
    badgeBorder: "border-slate-500/30",
    glowColor: "rgba(71, 85, 105, 0.15)",
    effectClass: "animate-beastSlashes opacity-20 bg-cross-slashes",
    particleColor: "bg-slate-400 shadow-[0_0_4px_#94a3b8] animate-floatUpFast",
  },
  {
    id: "flower",
    name: "Flower Breathing",
    kanji: "花",
    subText: "Final Form: Equinoctial Vermilion Eye",
    themeType: "light-ambient", 
    bgColor: "bg-gradient-to-br from-[#ffe4e6] via-[#fecdd3] to-[#fff5f5]",
    cardBg: "bg-white/85 backdrop-blur-xl border-rose-200 text-rose-950 shadow-xl shadow-rose-900/5",
    borderColor: "border-rose-300/80",
    textGradient: "from-rose-950 via-pink-800 to-rose-900",
    kanjiText: "text-pink-500 drop-shadow-[0_0_8px_rgba(244,114,182,0.4)]",
    badgeBg: "bg-rose-50 border border-rose-200",
    badgeBorder: "border-rose-300",
    glowColor: "rgba(251, 113, 133, 0.4)",
    effectClass: "animate-petalFall opacity-30 bg-sakura-tree",
    particleColor: "bg-rose-400 shadow-[0_0_6px_#f43f5e] animate-petalDrift",
  },
  {
    id: "insect",
    name: "Insect Breathing",
    kanji: "蟲",
    subText: "Dance of the Dragonfly: Compound Eye",
    themeType: "dark",
    bgColor: "bg-gradient-to-b from-[#05020a] via-[#16062b] to-[#040108]",
    cardBg: "bg-[#0f0521]/95 border-purple-500/30 text-violet-100 shadow-[0_0_40px_rgba(139,92,246,0.15)]",
    borderColor: "border-violet-500/50",
    textGradient: "from-fuchsia-200 via-purple-300 to-violet-400",
    kanjiText: "text-violet-400 drop-shadow-[0_0_12px_rgba(139,92,246,0.6)]",
    badgeBg: "bg-violet-950/60",
    badgeBorder: "border-violet-500/30",
    glowColor: "rgba(139, 92, 246, 0.25)",
    effectClass: "animate-butterflySwarm opacity-20 bg-insect-mesh",
    particleColor: "bg-fuchsia-400 shadow-[0_0_8px_#d946ef] animate-floatUpFast",
  },
  {
    id: "serpent",
    name: "Serpent Breathing",
    kanji: "蛇",
    subText: "Fifth Form: Slithering Serpent",
    themeType: "dark",
    bgColor: "bg-gradient-to-tr from-[#010604] via-[#072012] to-[#020905]",
    cardBg: "bg-[#06140c]/95 border-emerald-500/30 text-emerald-100 shadow-[0_0_35px_rgba(16,185,129,0.1)]",
    borderColor: "border-emerald-500/50",
    textGradient: "from-slate-100 via-emerald-100 to-teal-400",
    kanjiText: "text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.4)]",
    badgeBg: "bg-emerald-950/60",
    badgeBorder: "border-emerald-500/30",
    glowColor: "rgba(16, 185, 129, 0.2)",
    effectClass: "animate-serpentCoil opacity-20 bg-snake-scales",
    particleColor: "bg-emerald-300 shadow-[0_0_5px_#6ee7b7] animate-floatSlow",
  },
  {
    id: "love",
    name: "Love Breathing",
    kanji: "恋",
    subText: "Sixth Form: Cat-Legged Wobbly Love",
    themeType: "light-ambient", 
    bgColor: "bg-gradient-to-tr from-[#fce7f3] via-[#fbcfe8] to-[#fff1f2]",
    cardBg: "bg-white/85 border-rose-300 text-rose-950 shadow-xl",
    borderColor: "border-rose-400/60",
    textGradient: "from-rose-900 via-pink-700 to-rose-950",
    kanjiText: "text-rose-500 drop-shadow-[0_0_8px_rgba(251,113,133,0.5)]",
    badgeBg: "bg-rose-50 border border-rose-200",
    badgeBorder: "border-rose-300",
    glowColor: "rgba(251, 113, 133, 0.45)",
    effectClass: "animate-lovePulse opacity-25 bg-radial-love",
    particleColor: "bg-pink-400 shadow-[0_0_6px_#f43f5e] animate-floatUpSlow",
  }
];
export default function App() {
  // 1. Move ALL state here
  const [message, setMessage] = useState("");
  const [authView, setAuthView] = useState('login');
  const [password, setPassword] = useState('');
  const [selectedBreathing, setSelectedBreathing] = useState('sun');
  const [authError, setAuthError] = useState('');
  const [activeTheme, setActiveTheme] = useState(BREATHING_STYLES[0]);
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return !!localStorage.getItem('slayer_username');
  });

  const [username, setUsername] = useState(() => {
    return localStorage.getItem('slayer_username') || '';
  });

  // 2. Move socket logic here
  const sendMessage = () => {
    socket.emit("send_message", { message });
  };

  useEffect(() => {
    // Theme randomizer logic
    if (authView === 'login') {
      const randomIndex = Math.floor(Math.random() * BREATHING_STYLES.length);
      setActiveTheme(BREATHING_STYLES[randomIndex]);
    }
  }, [authView]);;
  useEffect(() => {
    // Check if the user was already logged in
    const savedUser = localStorage.getItem('slayer_username');
    if (savedUser) {
        setUsername(savedUser); // Update your state with the saved name
        setIsLoggedIn(true);    // Log them in automatically
    }
}, []);
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');

    if (!username.trim() || !password.trim()) {
      setAuthError('Please fill in all fields.');
      return;
    }

    const payload = {
      username: username.trim(),
      password,
      ...(authView === 'register' && { breathingStyle: selectedBreathing })
    };
try {
  const response = await fetch(`https://chatapp-mxuy.onrender.com/api/auth/${authView}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Authentication aborted');
      }

      if (authView === 'register') {
        alert(`Mastery of ${BREATHING_STYLES.find(b => b.id === selectedBreathing)?.name} registered!`);
        setAuthView('login');
        setPassword('');
        return;
      }

      // --- FIX STARTS HERE ---
      // Save to localStorage so it persists on refresh
      localStorage.setItem('slayer_username', data.username || username.trim());
      
      // Update state
      setUsername(data.username || username.trim());
      setIsLoggedIn(true); 
      // --- FIX ENDS HERE ---

    } catch (err) {
      setAuthError(err.message);
    }
  };
  const parchmentBackgroundStyle = {
    backgroundColor: '#faf6e8',
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4' height='4' viewBox='0 0 4 4'%3E%3Cpath d='M1 3h1v1H1V3zm2-2h1v1H3V1z' fill='%231e293b' fill-opacity='0.04'/%3E%3C/svg%3E")`
  };

  return (
    <div className={`flex flex-col items-center justify-center min-h-screen px-4 font-sans antialiased relative overflow-hidden transition-all duration-1000 ${
      isLoggedIn 
        ? activeTheme.bgColor 
        : (authView === 'login' ? activeTheme.bgColor : BREATHING_STYLES.find(b => b.id === selectedBreathing)?.bgColor || 'bg-[#0b0e0c]')
    }`}>
      
      {isLoggedIn ? (
        <ChatInterface 
           socket={socket} 
           username={username} 
           setIsLoggedIn={setIsLoggedIn} 
        />
      ) : (
        <>
          <StyleBlock />

          {/* --- CHANGER SYSTEM TARGETING SPECIFIC ACTIVE ART DESIGN THEMES --- */}
          {authView === 'login' && (
            <div className="absolute inset-0 transition-all duration-1000 pointer-events-none overflow-hidden">
              <div className={`absolute inset-0 transition-all duration-1000 ${activeTheme.effectClass}`} />
              <div 
                style={{ backgroundImage: `radial-gradient(circle at center, ${activeTheme.glowColor} 0%, transparent 65%)` }} 
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full blur-[30px] transition-all duration-1000" 
              />
              <div className="absolute inset-0">
                <div className={`absolute w-2 h-2 rounded-full ${activeTheme.particleColor} top-10 left-[15%]`} style={{ animationDelay: '0s' }} />
                <div className={`absolute w-3 h-3 rounded-full ${activeTheme.particleColor} bottom-20 right-[20%]`} style={{ animationDelay: '1.5s' }} />
                <div className={`absolute w-1.5 h-1.5 rounded-full ${activeTheme.particleColor} top-1/3 right-[10%]`} style={{ animationDelay: '0.5s' }} />
                <div className={`absolute w-2.5 h-2.5 rounded-full ${activeTheme.particleColor} bottom-1/3 left-[8%]`} style={{ animationDelay: '2.2s' }} />
                <div className={`absolute w-2 h-2 rounded-full ${activeTheme.particleColor} top-4/5 left-[40%]`} style={{ animationDelay: '1s' }} />
              </div>
            </div>
          )}

          {/* --- VIEW 1: HIGH ACCENT IMMERSIVE LOGIN CARD --- */}
          {authView === 'login' && (
            <div className="w-full max-w-md animate-fadeIn relative z-10 my-8">
              <div className={`relative ${activeTheme.cardBg} border-2 rounded-2xl p-8 shadow-[0_25px_60px_rgba(0,0,0,0.6)] text-center transition-all duration-1000 backdrop-blur-md`}>
                <div className={`inline-flex items-center justify-center w-12 h-12 ${activeTheme.badgeBg} rounded-xl border ${activeTheme.badgeBorder} ${activeTheme.kanjiText} mb-4 font-black text-xl transition-all duration-1000`}>
                  {activeTheme.kanji}
                </div>
                <h1 className={`text-3xl font-black tracking-widest uppercase bg-clip-text text-transparent bg-gradient-to-b ${activeTheme.textGradient} transition-all duration-1000 font-anime`}>
                  {activeTheme.name}
                </h1>
                <p className={`mt-2 mb-8 text-xs font-bold tracking-wider uppercase opacity-80`}>
                  {activeTheme.subText}
                </p>
                {authError && (
                  <div className="mb-5 p-3 bg-red-950/50 border border-red-900/60 text-red-400 text-xs rounded-lg text-left font-medium animate-shake">
                    ⚠️ Core Alert: {authError}
                  </div>
                )}
                <form onSubmit={handleAuthSubmit} className="text-left space-y-5">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest block mb-1.5 opacity-90">Slayer Signature Mark</label>
                    <input type="text" placeholder="e.g. userA" value={username} onChange={(e) => setUsername(e.target.value)} className={`w-full px-4 py-3 rounded-xl text-sm font-semibold outline-none border transition-all duration-200 shadow-sm ${activeTheme.themeType === 'dark' ? 'bg-black/40 text-slate-100 border-zinc-800/80 focus:border-slate-500' : 'bg-stone-100/50 text-sky-950 border-sky-200 focus:border-sky-500'}`} />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest block mb-1.5 opacity-90">Concentration Form Key</label>
                    <input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className={`w-full px-4 py-3 rounded-xl text-sm font-semibold outline-none border transition-all duration-200 shadow-sm ${activeTheme.themeType === 'dark' ? 'bg-black/40 text-slate-100 border-zinc-800/80 focus:border-slate-500' : 'bg-stone-100/50 text-sky-950 border-sky-200 focus:border-sky-500'}`} />
                  </div>
                  <button type="submit" className={`w-full py-3.5 mt-4 font-bold tracking-widest uppercase text-xs rounded-xl shadow-md transition-all duration-300 transform active:scale-[0.98] border ${activeTheme.themeType === 'dark' ? 'bg-gradient-to-b from-zinc-900 to-black hover:from-zinc-800 hover:to-zinc-950 text-slate-200 border-zinc-800' : 'bg-gradient-to-b from-sky-600 to-blue-700 hover:from-sky-500 hover:to-blue-600 text-white border-sky-500'}`}>
                    Execute Breath Technique
                  </button>
                </form>
                <p className="text-xs mt-6 font-semibold opacity-70">
                  New to the registry?{' '}
                  <button type="button" onClick={() => { setAuthView('register'); setAuthError(''); }} className="font-black underline ml-0.5 hover:opacity-100">
                    Enlist Mastery Rank
                  </button>
                </p>
              </div>
            </div>
          )}

          {/* --- VIEW 2: PARCHMENT SELECTION SECTOR SCROLL --- */}
          {authView === 'register' && (
            <div className="w-full max-w-xl animate-scaleIn relative z-10 my-8">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full blur-[130px] pointer-events-none transition-colors duration-700" style={{ backgroundColor: BREATHING_STYLES.find(b => b.id === selectedBreathing)?.glowColor || 'rgba(16, 185, 129, 0.2)' }} />
              <div style={parchmentBackgroundStyle} className="relative border-4 border-double border-[#202b21] p-8 rounded-sm shadow-[10px_10px_0px_0px_#1c261e] text-left text-[#202b21]">
                <div className="text-center mb-6">
                  <div className="inline-flex items-center justify-center px-3 py-1 border-2 border-[#202b21] rounded-sm font-black text-xs mb-3 bg-[#ebe7db]">選別</div>
                  <h1 className="text-3xl font-black tracking-widest text-[#141b15]">FINAL SELECTION</h1>
                  <p className="text-[#38493a] font-semibold text-xs tracking-wide mt-1 italic border-b border-[#202b21]/20 pb-4">Inscribe your core signature and claim your attuned lineage attributes</p>
                </div>
                {authError && <div className="mb-5 p-3 bg-red-50 border border-red-300 text-red-900 text-xs font-semibold rounded-sm">⚠️ Registry Rejection: {authError}</div>}
                <form onSubmit={handleAuthSubmit} className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[11px] font-black uppercase tracking-wider block mb-1.5 text-[#202b21]">Corps Name Symbol</label>
                      <input type="text" placeholder="Enter identity mark..." value={username} onChange={(e) => setUsername(e.target.value)} className="w-full px-4 py-2.5 bg-[#eae7da] text-[#141b15] border-2 border-[#202b21] rounded-sm focus:bg-white outline-none font-semibold placeholder-stone-400 text-sm shadow-inner transition-colors" />
                    </div>
                    <div>
                      <label className="text-[11px] font-black uppercase tracking-wider block mb-1.5 text-[#202b21]">Signature Oath Seal</label>
                      <input type="password" placeholder="Create security token..." value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-2.5 bg-[#eae7da] text-[#141b15] border-2 border-[#202b21] rounded-sm focus:bg-white outline-none font-semibold placeholder-stone-400 text-sm shadow-inner transition-colors" />
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] font-black uppercase tracking-wider block mb-2 text-[#202b21]">Select Attuned Core Breathing Mastery</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-48 overflow-y-auto p-2 bg-[#eae7da] border-2 border-[#202b21] rounded-sm">
                      {BREATHING_STYLES.map((style) => (
                        <button key={style.id} type="button" onClick={() => setSelectedBreathing(style.id)} className={`p-2 rounded-sm text-left border flex flex-col justify-between transition-all duration-200 h-16 ${selectedBreathing === style.id ? 'bg-[#202b21] text-[#f6f3e8] border-[#202b21] shadow-md scale-[1.02]' : 'bg-[#f4f1e4] text-[#202b21] border-stone-300 hover:bg-[#ebe7db]'}`}>
                          <span className="text-[10px] font-black self-end opacity-60">{style.kanji}</span>
                          <span className="text-[11px] font-black tracking-tight truncate max-w-full">{style.name.split(" ")[0]}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <button type="submit" className="w-full py-3.5 bg-[#202b21] hover:bg-[#2c3d2e] text-[#f6f3e8] font-bold tracking-widest uppercase text-xs transition duration-200 border-2 border-[#141b15] shadow-md rounded-sm mt-4">Commit Oath Sequence</button>
                </form>
                <div className="text-center mt-6 border-t border-[#202b21]/20 pt-4">
                  <p className="text-xs text-stone-600 font-semibold">Already registered in the scroll?{' '}
                    <button type="button" onClick={() => { setAuthView('login'); setAuthError(''); }} className="text-[#141b15] font-black underline ml-0.5 hover:text-stone-700">Sign in instead</button>
                  </p>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
// 2. Inline Style definitions handling all background patterns, grids, and animation math
function StyleBlock() {
  return (
    <style dangerouslySetInnerHTML={{__html: `
      @import url('https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@700;900&display=swap');
      .font-anime { font-family: 'Cinzel Decorative', serif; }
      
      /* --- HIGH VISUALLY IMPACTFUL PATTERN GRAPHICS --- */
      .bg-radial-sun {
        background: radial-gradient(circle at 50% 50%, #f97316 0%, #ea580c 30%, transparent 70%);
        background-size: 200% 200%;
      }
      .bg-radial-moon {
        background: radial-gradient(ellipse at top right, #c084fc 0%, #6b21a8 40%, transparent 80%);
      }
      .bg-linear-waves {
        background: linear-gradient(180deg, rgba(14,165,233,0.08) 0%, rgba(2,132,199,0.15) 50%, rgba(3,105,161,0.05) 100%);
      }
      .bg-linear-wind {
        background: linear-gradient(45deg, transparent 20%, rgba(52,211,153,0.05) 40%, rgba(16,185,129,0.1) 60%, transparent 80%);
        background-size: 300% 300%;
      }
      .bg-gradient-radial-fog {
        background: radial-gradient(circle at 30% 20%, rgba(20,184,166,0.15) 0%, rgba(45,212,191,0.2) 40%, transparent 70%);
      }
      .bg-radial-love {
        background: radial-gradient(circle, rgba(251,113,133,0.12) 0%, rgba(244,63,94,0.05) 50%, transparent 80%);
      }
      .bg-lightning-bolt {
        background-image: linear-gradient(135deg, transparent 45%, rgba(234,179,8,0.15) 50%, transparent 55%);
        background-size: 200% 200%;
      }
      .bg-sakura-tree {
        background: radial-gradient(circle at 100% 0%, rgba(244,114,182,0.15) 0%, transparent 60%);
      }
      .bg-stone-faults {
        background-image: linear-gradient(rgba(120,113,108,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(120,113,108,0.07) 1px, transparent 1px);
        background-size: 40px 40px;
      }
      .bg-concentric-ripples {
        background-image: radial-gradient(circle, rgba(244,63,94,0.08) 1px, transparent 11px);
        background-size: 32px 32px;
      }
      .bg-cross-slashes {
        background-image: font-black;
        background: linear-gradient(115deg, transparent 40%, rgba(148,163,184,0.08) 45%, rgba(148,163,184,0.08) 55%, transparent 60%);
        background-size: 120px 120px;
      }
      .bg-insect-mesh {
        background-image: linear-gradient(30deg, rgba(139,92,246,0.04) 12%, transparent 12.5%, transparent 87%, rgba(139,92,246,0.04) 87.5%, rgba(139,92,246,0.04)), linear-gradient(150deg, rgba(139,92,246,0.04) 12%, transparent 12.5%, transparent 87%, rgba(139,92,246,0.04) 87.5%, rgba(139,92,246,0.04));
        background-size: 30px 52px;
      }
      .bg-snake-scales {
        background-image: radial-gradient(circle at 100% 100%, transparent 10px, rgba(16,185,129,0.04) 11px, transparent 12px);
        background-size: 24px 24px;
      }

      /* --- TIMELINES FOR THE EXTENDED SET --- */
      @keyframes solarFlare {
        0% { background-position: 0% 50%; transform: scale(1); }
        50% { background-position: 100% 50%; transform: scale(1.12); }
        100% { background-position: 0% 50%; transform: scale(1); }
      }
      @keyframes moonCrescent {
        0% { opacity: 0.15; transform: rotate(0deg); }
        50% { opacity: 0.25; transform: rotate(4deg); }
        100% { opacity: 0.15; transform: rotate(0deg); }
      }
      @keyframes infernoWave {
        0% { transform: translateY(0px) scaleY(1); }
        50% { transform: translateY(-10px) scaleY(1.05); }
        100% { transform: translateY(0px) scaleY(1); }
      }
      @keyframes waterFlow {
        0% { background-position: 0% 0%; }
        100% { background-position: 100% 100%; }
      }
      @keyframes windVortex {
        0% { background-position: 0% 0%; }
        100% { background-position: 300% 300%; }
      }
      @keyframes lightningFlash {
        0%, 93%, 97%, 100% { opacity: 0.05; background-position: 0% 0%; }
        94%, 96% { opacity: 0.4; background-position: 100% 100%; }
      }
      @keyframes mistDrift {
        0% { transform: translateX(-3%) translateY(-3%); opacity: 0.4; }
        50% { transform: translateX(3%) translateY(3%); opacity: 0.7; }
        100% { transform: translateX(-3%) translateY(-3%); opacity: 0.4; }
      }
      @keyframes lovePulse {
        0% { transform: scale(0.97); opacity: 0.2; }
        50% { transform: scale(1.03); opacity: 0.35; }
        100% { transform: scale(0.97); opacity: 0.2; }
      }
      @keyframes stoneQuake {
        0%, 100% { transform: translate(0, 0); }
        2%, 6% { transform: translate(-2px, 1px); }
        4%, 8% { transform: translate(1px, -1px); }
      }
      @keyframes soundWaves {
        0% { transform: scale(0.95); opacity: 0.15; }
        50% { transform: scale(1.05); opacity: 0.3; }
        100% { transform: scale(0.95); opacity: 0.15; }
      }
      @keyframes beastSlashes {
        0%, 100% { background-position: 0px 0px; }
        50% { background-position: 20px -20px; }
      }
      @keyframes butterflySwarm {
        0% { background-position: 0px 0px; opacity: 0.15; }
        50% { background-position: 15px 30px; opacity: 0.25; }
        100% { background-position: 0px 0px; opacity: 0.15; }
      }
      @keyframes serpentCoil {
        0% { background-position: 0px 0px; }
        100% { background-position: 48px 48px; }
      }

      /* --- KINETIC VELOCITY PARTICLE RUNTIMES --- */
      @keyframes floatUpFast {
        0% { transform: translateY(105vh) translateX(0) scale(0.8); opacity: 0; }
        10% { opacity: 1; }
        90% { opacity: 1; }
        100% { transform: translateY(-5vh) translateX(30px) scale(1.2); opacity: 0; }
      }
      @keyframes floatUpSlow {
        0% { transform: translateY(105vh) scale(0.5); opacity: 0; }
        20% { opacity: 0.6; }
        80% { opacity: 0.6; }
        100% { transform: translateY(-5vh) scale(1); opacity: 0; }
      }
      @keyframes floatSlow {
        0% { transform: translateY(0) translateX(0); opacity: 0.3; }
        50% { transform: translateY(-25px) translateX(12px); opacity: 0.6; }
        100% { transform: translateY(-50px) translateX(0); opacity: 0.3; }
      }
      @keyframes zigzag {
        0% { transform: translateY(105vh) translateX(0); opacity: 0; }
        10% { opacity: 1; }
        30% { transform: translateY(70vh) translateX(20px); }
        60% { transform: translateY(40vh) translateX(-20px); }
        90% { opacity: 1; }
        100% { transform: translateY(-5vh) translateX(5px); opacity: 0; }
      }
      @keyframes petalDrift {
        0% { transform: translateY(-5vh) translateX(0) rotate(0deg); opacity: 0; }
        10% { opacity: 0.8; }
        90% { opacity: 0.8; }
        100% { transform: translateY(105vh) translateX(-80px) rotate(360deg); opacity: 0; }
      }
      /* --- EXECUTION ASSIGNMENTS --- */
      .animate-solarFlare { animation: solarFlare 12s ease-in-out infinite; }
      .animate-moonCrescent { animation: moonCrescent 8s ease-in-out infinite; }
      .animate-infernoWave { animation: infernoWave 4s ease-in-out infinite; }
      .animate-waterFlow { animation: waterFlow 22s linear infinite; background-image: repeating-linear-gradient(45deg, transparent, transparent 40px, rgba(2,132,199,0.03) 40px, rgba(2,132,199,0.03) 80px); }
      .animate-windVortex { animation: windVortex 15s linear infinite; }
      .animate-lightningFlash { animation: lightningFlash 4.5s infinite; }
      .animate-mistDrift { animation: mistDrift 14s ease-in-out infinite; }
      .animate-lovePulse { animation: lovePulse 6s ease-in-out infinite; }
      .animate-stoneQuake { animation: stoneQuake 7s ease-in-out infinite; }
      .animate-soundWaves { animation: soundWaves 3.5s ease-in-out infinite; }
      .animate-beastSlashes { animation: beastSlashes 6s ease-in-out infinite; }
      .animate-butterflySwarm { animation: butterflySwarm 8s ease-in-out infinite; }
      .animate-serpentCoil { animation: serpentCoil 16s linear infinite; }
      .animate-floatUpFast { animation: floatUpFast 5s linear infinite; }
      .animate-floatUpSlow { animation: floatUpSlow 9s linear infinite; }
      .animate-floatSlow { animation: floatSlow 8s ease-in-out infinite; }
      .animate-zigzag { animation: zigzag 4s linear infinite; }
      .animate-petalDrift { animation: petalDrift 7s linear infinite; }
    `}} />
  );
}