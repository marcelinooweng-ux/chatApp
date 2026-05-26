import React, { useState } from 'react';

export default function Login({ onAuthSuccess, onSwitchToRegister }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    try {
        // 1. Point to the absolute URL to ensure it reaches your server
        const response = await fetch('http://localhost:5000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();
        
        // 2. Debug: See what the server actually sent back
        console.log("Server response:", data);

        if (!response.ok) throw new Error(data.error || 'Login failed');

        // 3. Ensure data exists before saving
        if (data.username) {
            localStorage.setItem('slayer_username', data.username);
            console.log("Successfully saved to LocalStorage:", data.username);
        } else {
            console.error("Username missing in response");
        }

        onAuthSuccess(data.username);
    } catch (err) {
        console.error("Login Error:", err);
        setError(err.message);
    }
};
  return (
    <form onSubmit={handleLogin} className="relative bg-slate-900 border border-slate-800/80 p-8 rounded-2xl shadow-2xl w-full max-w-md backdrop-blur-xl text-center">
      <div className="inline-flex p-3 bg-indigo-500/10 rounded-xl text-indigo-400 mb-4 border border-indigo-500/20">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
        </svg>
      </div>
      
      <h1 className="text-2xl font-bold tracking-tight text-slate-100">Scorpio Secure Chat</h1>
      <p className="text-slate-400 mt-2 mb-6 text-sm">Log in to establish your node connection identity.</p>

      {error && <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl text-left font-medium">⚠️ {error}</div>}
      
      <div className="text-left space-y-4 mb-6">
        <div>
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">Username</label>
          <input 
            type="text" 
            value={username} 
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter user identity..."
            className="w-full px-4 py-3 bg-slate-950 text-slate-200 rounded-xl border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition placeholder-slate-600"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">Secret Keyphrase</label>
          <input 
            type="password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full px-4 py-3 bg-slate-950 text-slate-200 rounded-xl border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition placeholder-slate-600"
          />
        </div>
      </div>
{/* Remove the onClick, the <form> handles this automatically */}
<button 
  type="submit" 
  className="w-full py-3.5 mt-4 font-bold tracking-widest uppercase text-xs rounded-xl shadow-md transition-all duration-300 transform active:scale-[0.98] border bg-gradient-to-b from-sky-600 to-blue-700 hover:from-sky-500 hover:to-blue-600 text-white border-sky-500"
>
  Execute Breath Technique
</button>

      <p className="text-xs text-slate-500 mt-5">
        New terminal client?{' '}
        <button type="button" onClick={onSwitchToRegister} className="text-indigo-400 font-medium hover:underline">
          Create account
        </button>
      </p>
    </form>
  );
}