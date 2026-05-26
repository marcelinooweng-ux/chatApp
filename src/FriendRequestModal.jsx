import React, { useState } from 'react';

export default function FriendRequestModal({ username, onClose, socket }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResult, setSearchResult] = useState(null);

  const handleSearch = async () => {
    if (!searchTerm.trim()) return;
    try {
      const res = await fetch(`/api/users/search/${searchTerm}`);
      if (!res.ok) throw new Error("Slayer not found");
      const data = await res.json();
      setSearchResult(data);
    } catch (err) {
      alert("Slayer not found in archive!");
    }
  };

  const sendRequest = async () => {
    try {
      const res = await fetch('/api/friends/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fromUser: username, toUser: searchResult.username })
      });
      
      if (res.ok) {
        if (socket) {
          socket.emit("notify_friend_request", { toUser: searchResult.username });
        }
        setSearchResult(null);
        setSearchTerm("");
        alert("Oath request dispatched!");
        onClose(); // Automatically dismiss modal panel upon successful delivery
      }
    } catch (err) {
      console.error("Could not dispatch request:", err);
    }
  };

  return (
    // 🛡️ High z-index layout wrapper covering the entire chat widget canvas container
    <div className="absolute inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-zinc-900 border border-white/10 p-6 rounded-2xl shadow-2xl relative">
        
        {/* Close Button */}
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 text-white/40 hover:text-white/90 text-sm font-bold transition"
        >
          ✕
        </button>
        
        <h3 className="text-xs font-black text-orange-500 uppercase tracking-widest mb-4">Forge New Alliance</h3>
        
        {/* Input Row */}
        <div className="flex gap-2 mb-5">
          <input 
            type="text"
            placeholder="Enter slayer username..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            className="flex-1 bg-black/40 border border-white/10 p-3 rounded-xl text-sm outline-none focus:border-orange-500/40 text-white transition"
          />
          <button 
            onClick={handleSearch} 
            className="bg-white/10 hover:bg-white/20 px-5 rounded-xl text-xs font-black uppercase text-white transition tracking-wider"
          >
            Search
          </button>
        </div>

        {/* Found Result Block Container */}
        {searchResult && (
          <div className="p-4 bg-white/5 border border-white/5 rounded-xl flex items-center justify-between animate-fadeIn">
            <div className="flex items-center gap-3">
              <img 
                src={`https://api.dicebear.com/9.x/adventurer/svg?seed=${searchResult.username}`} 
                className="w-10 h-10 rounded-full bg-black/20" 
                alt="avatar" 
              />
              <span className="text-sm font-black text-white uppercase tracking-wide">{searchResult.username}</span>
            </div>
            
            {searchResult.username !== username ? (
              <button 
                onClick={sendRequest} 
                className="bg-orange-600 hover:bg-orange-700 text-white font-black text-[10px] uppercase tracking-wider px-4 py-2.5 rounded-xl shadow-md transition"
              >
                Send Request
              </button>
            ) : (
              <span className="text-[10px] uppercase font-black text-white/30 tracking-widest mr-2">You</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}