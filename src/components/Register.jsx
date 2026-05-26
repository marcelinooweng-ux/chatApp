import React, { useState } from 'react';

export default function Register({ onRegisterSuccess, onSwitchToLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password.trim()) {
      setError('Please fill in all fields.');
      return;
    }

    try {
      const response = await fetch('http://localhost:5000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password })
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.error || 'Registration failed');

      alert('Profile initialization complete! Redirecting to credentials gateway.');
      onRegisterSuccess();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <form onSubmit={handleRegister} className="relative bg-slate-900 border border-slate-800/80 p-8 rounded-2xl shadow-2xl w-full max-w-md backdrop-blur-xl text-center">
      <div className="inline-flex p-3 bg-indigo-500/10 rounded-xl text-indigo-400 mb-4 border border-indigo-500/20">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM3 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 9.374 21c-2.331 0-4.512-.645-6.374-1.766Z" />
        </svg>
      </div>
      
      <h1 className="text-2xl font-bold tracking-tight text-slate-100">Initialize Profile</h1>
      <p className="text-slate-400 mt-2 mb-6 text-sm">Sign up to reserve your custom user index parameters.</p>

      {error && <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl text-left font-medium">⚠️ {error}</div>}
      
      <div className="text-left space-y-4 mb-6">
        <div>
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">Desired Username</label>
          <input 
            type="text" 
            value={username} 
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Assign container handle..."
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

      <button type="submit" className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl transition duration-200 shadow-lg shadow-indigo-600/20">
        Register Profile
      </button>

      <p className="text-xs text-slate-500 mt-5">
        Already have a profile?{' '}
        <button type="button" onClick={onSwitchToLogin} className="text-indigo-400 font-medium hover:underline">
          Sign in instead
        </button>
      </p>
    </form>
  );
}