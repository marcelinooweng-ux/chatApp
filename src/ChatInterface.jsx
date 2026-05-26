import React, { useState, useEffect, useRef } from 'react';
import FriendRequestModal from './FriendRequestModal';

export default function ChatInterface({ socket, username, setIsLoggedIn }) {
  // Global Application View state: "chats" | "contacts" | "video"
  const [appView, setAppView] = useState("chats");
  
  const [messages, setMessages] = useState([]);
  const [currentMessage, setCurrentMessage] = useState("");
  const [activeChat, setActiveChat] = useState(null);
  const [users, setUsers] = useState([]); 
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [friends, setFriends] = useState([]); 
  const [pendingRequests, setPendingRequests] = useState([]); 
  const [currentFriend, setCurrentFriend] = useState(null);
  const [unreadMessages, setUnreadMessages] = useState({}); 

  // WEBRTC SIGNALING STATE HOOKS
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [callState, setCallState] = useState("idle"); // "idle" | "calling" | "incoming" | "connected"
  const [callTarget, setCallTarget] = useState("");
  const [incomingCaller, setIncomingCaller] = useState("");
  const [callType, setCallType] = useState("video"); // "video" | "voice"
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);

  // STUN configuration engine provided to safely establish NAT traversing tunnels
  const rtcConfig = {
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
  };
  
  const activeChatRef = useRef(activeChat);
  useEffect(() => {
    activeChatRef.current = activeChat;
  }, [activeChat]);
// Sync users and socket real-time triggers
  useEffect(() => {
    if (!socket) return;

    socket.emit('user_join', { username });

    socket.on("update_user_list", (list) => {
      const otherUsers = list.filter(u => u.username !== username);
      const formattedUsers = otherUsers.map(u => ({
        id: u.id,
        name: u.username, 
        avatar: `https://api.dicebear.com/9.x/adventurer/svg?seed=${u.username}`
      }));
      setUsers(formattedUsers);
    });

    socket.on("incoming_friend_request", () => {
      fetchPendingRequests();
    });

    socket.on("friend_request_accepted", () => {
      fetchFriends();
      fetchPendingRequests();
    });

    socket.on("friend_removed", () => {
      fetchFriends();
      setActiveChat(null);
      setCurrentFriend(null);
    });

    socket.on("chat_cleared", (data) => {
      if (activeChatRef.current === data.roomId) {
        setMessages([]);
      }
    });

    // 📹 WEBRTC SIGNALING HANDSHAKE LISTENERS
    socket.on("video_call_incoming", async (data) => {
      setIncomingCaller(data.fromUser);
      setCallType(data.callType || "video"); // Match whatever call type the sender initiated
      setCallState("incoming");
      socket.currentCallOffer = data.offer;
    });

    socket.on("video_call_accepted", async (data) => {
      if (peerConnectionRef.current) {
        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.answer));
        setCallState("connected");
      }
    });

    socket.on("video_ice_candidate", async (data) => {
      if (peerConnectionRef.current && data.candidate) {
        try {
          await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch (e) {
          console.error("Error adding ice candidate", e);
        }
      }
    });
// 🛑 LISTEN FOR HANGUP FROM THE OTHER USER
    socket.on("video_peer_hungup", () => {
      handleLocalTeardown(); 
      // Clear out the target call details for the receiver's UI
      setCallTarget("");
      setIncomingCaller("");
    });

    socket.on("receive_message", (data) => {
      const normalizedRoomId = data.room.split('-').sort().join('-');
      
      setMessages((prevMessages) => {
        const alreadyExists = prevMessages.some(
          m => m.message === data.message && m.user === data.user && m.room === normalizedRoomId
        );
        if (alreadyExists) return prevMessages;
        return [...prevMessages, { ...data, room: normalizedRoomId, self: data.user === username }];
      });

      if (normalizedRoomId !== activeChatRef.current) {
        setUnreadMessages((prevUnreads) => ({
          ...prevUnreads,
          [normalizedRoomId]: (prevUnreads[normalizedRoomId] || 0) + 1,
        }));
      }
    });

    return () => {
      socket.off("update_user_list");
      socket.off("incoming_friend_request");
      socket.off("friend_request_accepted");
      socket.off("friend_removed");
      socket.off("chat_cleared");
      socket.off("receive_message");
      socket.off("video_call_incoming");
      socket.off("video_call_accepted");
      socket.off("video_ice_candidate");
      socket.off("video_peer_hungup");
    };
  }, [socket, username]);

  // ====================================================================
  // 📹 WEBRTC ENGINE IMPLEMENTATION
  // ====================================================================
  const initializeMediaDevices = async (type) => {
    try {
      // Dynamically request video tracks based on voice or video selection
      const constraints = { 
        video: type === "video", 
        audio: true 
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setLocalStream(stream);
      if (localVideoRef.current && type === "video") {
        localVideoRef.current.srcObject = stream;
      }
      return stream;
    } catch (err) {
      console.error("Media access permission denied:", err);
      alert("Could not access camera or microphone hardware pipelines.");
      return null;
    }
  };

  const createPeerConnection = (targetUser, stream) => {
    const pc = new RTCPeerConnection(rtcConfig);
    stream.getTracks().forEach(track => pc.addTrack(track, stream));

    pc.ontrack = (event) => {
      setRemoteStream(event.streams[0]);
      if (remoteVideoRef.current && callType === "video") {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('video_ice_candidate', { toUser: targetUser, candidate: event.candidate });
      }
    };

    peerConnectionRef.current = pc;
    return pc;
  };

  const initiateVideoCall = async () => {
    if (!callTarget) return alert("Select an online friend to call!");
    setCallState("calling");
    const stream = await initializeMediaDevices(callType);
    if (!stream) return setCallState("idle");
    
    const pc = createPeerConnection(callTarget, stream);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    
    // Include callType ("video" or "voice") in the signaling payload
    socket.emit('video_call_user', { toUser: callTarget, offer, callType });
  };

  const acceptIncomingCall = async () => {
    setCallState("connected");
    const stream = await initializeMediaDevices(callType);
    if (!stream) return terminateCallStreams();
    
    const pc = createPeerConnection(incomingCaller, stream);
    await pc.setRemoteDescription(new RTCSessionDescription(socket.currentCallOffer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    socket.emit('video_answer_call', { toUser: incomingCaller, answer });
  };

  const toggleMute = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStream && callType === "video") {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  };
// CLEANLY CLOSES AND RELEASES HARDWARE PERMISSIONS FOR LOCAL CONTAINER
  const handleLocalTeardown = () => {
    // 🌟 STRATEGY: Grab the active stream directly from the video DOM track before wiping it
    const activeStream = localStream || (localVideoRef.current ? localVideoRef.current.srcObject : null);

    if (activeStream) {
      // FORCE clean shutdown directly on the device hardware layer
      activeStream.getTracks().forEach(track => {
        track.stop();
        track.enabled = false;
      });
    }

    // Unbind streams from HTML DOM Video nodes so they blank out instantly
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }

    // Tear down the peer connection context safely
    if (peerConnectionRef.current) {
      try {
        // Remove all media track references from the RTCPeerConnection pipeline
        peerConnectionRef.current.getSenders().forEach(sender => {
          try { peerConnectionRef.current.removeTrack(sender); } catch(e){}
        });
        peerConnectionRef.current.close();
      } catch (e) {
        console.error("Error closing peer connection:", e);
      }
    }

    // Reset all react component states
    setLocalStream(null);
    setRemoteStream(null);
    peerConnectionRef.current = null;
    setCallState("idle");
    setIsMuted(false);
    setIsVideoOff(false);
  };

  // TRIGGERS MANUAL HANG-UP ACTIONS ON SENDER COMMANDS
  const terminateCallStreams = () => {
    const partner = callTarget || incomingCaller;
    if (partner) {
      // Alert the partner over the socket layer to shut down immediately
      socket.emit('video_hangup', { toUser: partner });
    }
    handleLocalTeardown();
    setCallTarget("");
    setIncomingCaller("");
  };

  // ====================================================================
  // 👥 CONTACTS & DATA PROCESSING ACTIONS
  // ====================================================================
  const fetchFriends = () => {
    fetch('/api/friends', { headers: { 'username': username } })
      .then(res => res.json())
      .then(data => setFriends(data))
      .catch(err => console.error("Could not load friends list:", err));
  };

  const fetchPendingRequests = () => {
    fetch('/api/friends/pending', { headers: { 'username': username } })
      .then(res => res.ok ? res.json() : [])
      .then(data => setPendingRequests(data))
      .catch(err => console.error("Could not load pending requests:", err));
  };

  useEffect(() => {
    fetchFriends();
    fetchPendingRequests();
  }, [username]);

  useEffect(() => {
    if (friends.length > 0) {
      const friendRooms = friends.map(f => [username, typeof f === 'string' ? f : (f.username || f.name)].sort().join('-'));
      socket.emit('join_all_friend_rooms', friendRooms);
    }
  }, [friends, username, socket]);

  const startChat = (friend) => {
    const members = [username, friend.name].sort();
    const roomId = members.join('-');
    
    socket.emit('join_room', roomId);
    setActiveChat(roomId);
    setCurrentFriend(friend);
    setUnreadMessages(prev => ({ ...prev, [roomId]: 0 }));
    setAppView("chats");

    fetch(`/api/messages/${roomId}`, { headers: { 'username': username } })
      .then(res => res.ok ? res.json() : [])
      .then(history => {
        const formattedHistory = history.map(m => ({
          room: m.room,
          user: m.user,
          message: m.message,
          self: m.user === username
        }));
        setMessages(formattedHistory);
      })
      .catch(err => console.error("Failed to load logs:", err));
  };

  const handleClearChatMessages = async () => {
    if (!activeChat) return;
    if (!window.confirm("Delete all messages in this conversation for your side? The other user will still see them.")) return;

    try {
      const res = await fetch('/api/messages/clear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username, roomId: activeChat })
      });
      
      if (res.ok) {
        setMessages([]);
        alert("Conversation cleared on your side!");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemoveFriend = async (e, friendName) => {
    e.stopPropagation(); 
    if (!window.confirm(`Completely remove ${friendName} from your contacts?`)) return;

    try {
      const res = await fetch('/api/friends/remove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, friendName })
      });

      if (res.ok) {
        setFriends(prev => prev.filter(f => (typeof f === 'string' ? f : f.name) !== friendName));
        if (currentFriend && currentFriend.name === friendName) {
          setActiveChat(null);
          setCurrentFriend(null);
          setMessages([]);
        }
        socket.emit("notify_friend_removed", { fromUser: username, toUser: friendName });
        alert(`Unfriended ${friendName}.`);
      }
    } catch (err) {
      console.error("Error unfriending contact:", err);
    }
  };

  const handleAcceptRequest = async (fromUser) => {
    try {
      const res = await fetch('/api/friends/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, fromUser })
      });
      if (res.ok) {
        fetchFriends();
        fetchPendingRequests();
        socket.emit("notify_request_accepted", { toUser: fromUser });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRejectRequest = async (fromUser) => {
    try {
      await fetch('/api/friends/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, fromUser })
      });
      fetchPendingRequests();
    } catch (err) {
      console.error(err);
    }
  };

  const sendMessage = () => {
    if (currentMessage.trim() !== "" && activeChat) {
      const messageData = { 
        message: currentMessage, 
        user: username, 
        room: activeChat 
      };
      socket.emit("send_message", messageData);
      setCurrentMessage(""); 
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('slayer_username');
    setIsLoggedIn(false);
    window.location.reload(); 
  };

  const displayList = [];
  const addedNames = new Set();
  friends.forEach(f => {
    const name = typeof f === 'string' ? f : (f.username || f.name);
    if (!addedNames.has(name)) {
      addedNames.add(name);
      const isFriendOnline = users.some(u => u.name === name);
      displayList.push({ name: name, isOnline: isFriendOnline });
    }
  });

  return (
    <div className="flex w-full max-w-5xl h-[600px] bg-black/60 border border-white/10 rounded-2xl backdrop-blur-md shadow-2xl overflow-hidden relative z-10">
      
      {isModalOpen && (
        <FriendRequestModal username={username} onClose={() => setIsModalOpen(false)} socket={socket} />
      )}

      {/* LEFT NAVIGATION APP BAR */}
      <div className="w-[70px] bg-black/40 border-r border-white/10 flex flex-col items-center py-6 justify-between flex-shrink-0">
        <div className="flex flex-col gap-5 w-full items-center">
          <button 
            onClick={() => setAppView("chats")} 
            className={`w-11 h-11 rounded-xl font-black text-xs uppercase flex items-center justify-center transition-all ${appView === "chats" ? "bg-orange-600 text-white shadow-lg shadow-orange-600/20" : "bg-white/5 text-white/50 hover:bg-white/10"}`}
            title="Active Chats"
          >
            💬
          </button>

          <button 
            onClick={() => setAppView("contacts")} 
            className={`w-11 h-11 rounded-xl font-black text-xs uppercase flex items-center justify-center relative transition-all ${appView === "contacts" ? "bg-orange-600 text-white shadow-lg shadow-orange-600/20" : "bg-white/5 text-white/50 hover:bg-white/10"}`}
            title="Contacts Panel"
          >
            👥
            {pendingRequests.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center animate-pulse">
                {pendingRequests.length}
              </span>
            )}
          </button>

          <button 
            onClick={() => setAppView("video")} 
            className={`w-11 h-11 rounded-xl font-black text-xs uppercase flex items-center justify-center transition-all ${appView === "video" ? "bg-orange-600 text-white shadow-lg shadow-orange-600/20" : "bg-white/5 text-white/50 hover:bg-white/10"}`}
            title="Video Nexus"
          >
            📹
          </button>
        </div>

        <button onClick={handleLogout} className="text-[9px] font-black text-red-400 hover:text-red-300 uppercase tracking-wider">Exit</button>
      </div>

      {/* VIEW A: CHATS WORKSPACE */}
      {appView === "chats" && (
        <>
          <div className="w-1/4 border-r border-white/10 bg-black/10 p-4 flex flex-col justify-between">
            <div>
              <h2 className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-4">Active Channels</h2>
              <div className="space-y-2 overflow-y-auto h-[480px] pr-1">
                {displayList.map((item, index) => {
                  const members = [username, item.name].sort();
                  const roomId = members.join('-');
                  const unreadCount = unreadMessages[roomId] || 0;
                  const avatarUrl = `https://api.dicebear.com/9.x/adventurer/svg?seed=${item.name}`;

                  return (
                    <div 
                      key={index}
                      onClick={() => startChat({ name: item.name, avatar: avatarUrl })} 
                      className={`w-full flex items-center justify-between p-2.5 rounded-xl transition cursor-pointer ${activeChat === roomId ? 'bg-orange-500/20 border border-orange-500/30' : 'hover:bg-white/5 border border-transparent'}`}
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <img src={avatarUrl} className="w-8 h-8 rounded-full bg-white/5" alt="avatar" />
                        <span className="text-sm truncate font-bold text-white/80">{item.name}</span>
                      </div>
                      {unreadCount > 0 && (
                        <span className="bg-orange-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full">{unreadCount}</span>
                      )}
                    </div>
                  );
                })}
                {displayList.length === 0 && (
                  <div className="text-center text-white/20 text-xs py-8">No open chat lines.</div>
                )}
              </div>
            </div>
          </div>

          <div className="flex-1 flex flex-col bg-zinc-950/20">
            {currentFriend ? (
              <>
                <div className="p-4 border-b border-white/10 flex items-center justify-between bg-black/20">
                  <div className="flex items-center gap-3">
                    <img src={currentFriend.avatar} className="w-10 h-10 rounded-full" alt="avatar" />
                    <h1 className="text-md font-black uppercase tracking-widest">{currentFriend.name}</h1>
                  </div>
                  <button onClick={handleClearChatMessages} className="text-[9px] font-black uppercase tracking-wider bg-white/5 border border-white/10 hover:text-red-400 px-2.5 py-1.5 rounded-lg transition">Clear Messages</button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  {messages
                    .filter(m => m.room === activeChat)
                    .map((m, i) => (
                      <div key={i} className={`flex items-end gap-2 ${m.self ? 'flex-row-reverse' : ''}`}>
                        <div className={`p-3 rounded-2xl max-w-[70%] ${m.self ? 'bg-orange-600' : 'bg-white/10'}`}>
                          <p className="text-xs font-bold opacity-50 mb-0.5">{m.user}</p>
                          <p className="text-sm">{m.message}</p>
                        </div>
                      </div>
                    ))}
                </div>

                <div className="p-4 border-t border-white/10 bg-black/40">
                  <div className="flex gap-2">
                    <input 
                      value={currentMessage}
                      onChange={(e) => setCurrentMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                      placeholder={`Message ${currentFriend.name}...`}
                      className="flex-1 bg-black/40 border border-white/10 p-3 rounded-xl text-sm outline-none focus:border-orange-500/50 transition" 
                    />
                    <button onClick={sendMessage} className="px-5 bg-orange-600 hover:bg-orange-700 rounded-xl font-bold uppercase text-xs transition">Send</button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-white/20">
                <p className="text-xs uppercase tracking-widest font-black">No Conversation Selected</p>
              </div>
            )}
          </div>
        </>
      )}
{/* VIEW C: FULL INTEGRATED VIDEO/VOICE LOUNGE */}
      {appView === "video" && (
        <div className="flex-1 flex flex-col bg-zinc-950/30 p-6 animate-fadeIn justify-between">
          
          {/* CALL PANEL MANAGEMENT BAR */}
          <div className="flex items-center justify-between bg-black/40 border border-white/10 p-4 rounded-xl backdrop-blur-md">
            <div>
              <h2 className="text-sm font-black uppercase tracking-wider text-orange-500">
                {callType === "video" ? "📹 Video Nexus" : "🎙️ Voice Line"}
              </h2>
              <p className="text-[10px] text-white/40 uppercase font-bold mt-0.5">Realtime WebRTC Communication Channels</p>
            </div>

            {callState === "idle" && (
              <div className="flex gap-2 items-center">
                {/* CALL TARGET */}
                <select 
                  value={callTarget} 
                  onChange={(e) => setCallTarget(e.target.value)}
                  className="bg-black/60 border border-white/10 rounded-xl px-3 py-1.5 text-xs font-bold text-white/80 outline-none focus:border-orange-500 transition"
                >
                  <option value="">Select Target Ally...</option>
                  {friends.map((f, i) => {
                    const name = typeof f === 'string' ? f : (f.username || f.name);
                    return <option key={i} value={name}>{name}</option>;
                  })}
                </select>

                {/* NEW: DYNAMIC CALL PREFERENCE PICKER */}
                <select 
                  value={callType} 
                  onChange={(e) => setCallType(e.target.value)}
                  className="bg-black/60 border border-white/10 rounded-xl px-3 py-1.5 text-xs font-bold text-orange-400 outline-none focus:border-orange-500 transition"
                >
                  <option value="video">📹 Video Mode</option>
                  <option value="voice">🎙️ Voice Mode</option>
                </select>

                <button 
                  onClick={initiateVideoCall}
                  className="bg-orange-600 hover:bg-orange-700 text-white font-black text-xs uppercase px-4 py-1.5 rounded-xl transition shadow-lg shadow-orange-600/10"
                >
                  Dial
                </button>
              </div>
            )}

            {callState === "calling" && (
              <span className="text-xs font-black uppercase text-orange-400 animate-pulse tracking-widest">
                Dialing {callType.toUpperCase()} Link to {callTarget}...
              </span>
            )}

            {callState === "incoming" && (
              <div className="flex items-center gap-3 bg-orange-600/10 border border-orange-500/30 p-1.5 px-3 rounded-xl">
                <span className="text-xs font-black uppercase text-white tracking-wide">
                  Incoming {callType === "video" ? "Video" : "Voice"} Call: {incomingCaller}
                </span>
                <button onClick={acceptIncomingCall} className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] uppercase px-3 py-1 rounded-md transition">Accept</button>
                <button onClick={terminateCallStreams} className="bg-red-600 hover:bg-red-700 text-white font-black text-[10px] uppercase px-3 py-1 rounded-md transition">Reject</button>
              </div>
            )}

            {callState === "connected" && (
              <span className="text-xs font-black uppercase text-emerald-400 tracking-widest flex items-center gap-2">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></span> Connection Established
              </span>
            )}
          </div>

          {/* DYNAMIC PIPELINE DISPLAYS */}
          <div className="flex-1 grid grid-cols-2 gap-4 my-4 items-center justify-center">
            
            {/* LOCAL FEED BOX */}
            <div className="w-full h-full max-h-[360px] bg-black/60 border border-white/5 rounded-2xl overflow-hidden relative shadow-inner flex items-center justify-center">
              {callType === "video" ? (
                <>
                  <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]"></video>
                  <span className="absolute top-3 left-3 bg-black/70 border border-white/10 px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-wider text-white/60">
                    Your Stream {isVideoOff ? "(Feed Paused)" : ""}
                  </span>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center text-center gap-3">
                  <div className="w-20 h-20 bg-orange-600/20 border border-orange-500/30 rounded-full flex items-center justify-center text-3xl animate-pulse">🎙️</div>
                  <span className="text-[10px] font-black tracking-widest text-white/60 uppercase">Your Microphone Active</span>
                </div>
              )}
              {callType === "video" && !localStream && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white/20 text-xs uppercase font-bold tracking-wider">
                  <span>📷 Camera Standby</span>
                </div>
              )}
            </div>

            {/* INBOUND TARGET FEED BOX */}
            <div className="w-full h-full max-h-[360px] bg-black/60 border border-white/5 rounded-2xl overflow-hidden relative shadow-inner flex items-center justify-center">
              {callType === "video" ? (
                <>
                  <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover"></video>
                  <span className="absolute top-3 left-3 bg-black/70 border border-white/10 px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-wider text-white/60">
                    Remote Track Source
                  </span>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center text-center gap-3">
                  <div className="w-20 h-20 bg-emerald-600/20 border border-emerald-500/30 rounded-full flex items-center justify-center text-3xl">👥</div>
                  <span className="text-[10px] font-black tracking-widest text-white/60 uppercase">
                    {callState === "connected" ? `${callTarget || incomingCaller} Connected` : "Pipeline Latent"}
                  </span>
                </div>
              )}
              {callType === "video" && !remoteStream && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white/20 text-xs uppercase font-bold tracking-wider">
                  <span>📡 Pipeline Latent</span>
                </div>
              )}
            </div>
          </div>

          {/* STREAM CONTROLS ACTION FOOTER BAR */}
          <div className="flex gap-3 justify-center items-center bg-black/20 p-3 rounded-xl border border-white/5">
            <button 
              onClick={toggleMute} 
              disabled={callState === "idle"}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition ${isMuted ? "bg-red-600 text-white" : "bg-white/5 text-white/60 hover:bg-white/10 disabled:opacity-30"}`}
            >
              {isMuted ? "🎙️ Unmute Mic" : "🎙️ Mute Mic"}
            </button>
            <button 
              onClick={toggleVideo} 
              disabled={callState === "idle" || callType === "voice"}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition ${isVideoOff ? "bg-red-600 text-white" : "bg-white/5 text-white/60 hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-white/5"}`}
            >
              {isVideoOff ? "📷 Feed On" : "📷 Feed Off"}
            </button>
            <button 
              onClick={terminateCallStreams} 
              disabled={callState === "idle" && !localStream}
              className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-black uppercase tracking-wider rounded-xl transition disabled:opacity-30"
            >
              🛑 End Feed
            </button>
          </div>

        </div>
      )}
    </div> 
  ); 
}