import React, { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const API_BASE = (import.meta && import.meta.env && import.meta.env.VITE_API_BASE) || "https://livechatapp-1-7362.onrender.com";
const socket = io(API_BASE);

const CaretakerChat = () => {
  const [parents, setParents] = useState([]);
  const [activeParent, setActiveParent] = useState("");
  const [chat, setChat] = useState([]);
  const [message, setMessage] = useState("");
  const [typingParent, setTypingParent] = useState("");
  const [loading, setLoading] = useState(false);
  const [showEmergency, setShowEmergency] = useState(false);
  const [emergencyLoading, setEmergencyLoading] = useState(false);
  const [emergencyError, setEmergencyError] = useState("");
  const [emergencyInfo, setEmergencyInfo] = useState(null);
  const messagesEndRef = useRef(null);
  const notificationRef = useRef(null);

  // Fetch parents when component mounts
  useEffect(() => {
    const fetchParents = async () => {
      try {
          const res = await axios.get(`${API_BASE}/api/parents/all`);
        setParents(res.data);
        console.log("Parents loaded:", res.data);
      } catch (error) {
        console.error("Error fetching parents:", error);
        // Fallback to empty array
        setParents([]);
      } finally {
        setLoading(false);
      }
    };

    fetchParents();
  }, []);

  useEffect(() => {
    socket.emit("register", { role: "caretaker" });

    socket.on("receiveFromParent", (data) => {
      console.log("Message received from parent:", data);
      toast.info(`New message from ${data.parentId}`);
      playNotification();

      // Add parent to list if not already there
      setParents((prevParents) => {
        if (!prevParents.includes(data.parentId)) {
          console.log("Adding new parent to list:", data.parentId);
          return [...prevParents, data.parentId];
        }
        return prevParents;
      });

      // Save message to localStorage for accumulation (will be saved to DB on export)
      const newMessage = {
        parentId: data.parentId,
        sender: data.parentId,
        message: data.message,
        timestamp: new Date()
      };

      const existingLogs = JSON.parse(localStorage.getItem('chatLogs') || '[]');
      const updatedLogs = [...existingLogs, newMessage];
      localStorage.setItem('chatLogs', JSON.stringify(updatedLogs));

      if (data.parentId === activeParent) {
        setChat((prev) => [
          ...prev,
          newMessage,
        ]);
      }
    });

    // Listen for parents list updates from server
    socket.on("parentsList", (parentsList) => {
      console.log("Received parents list from server:", parentsList);
      setParents(parentsList);
      setLoading(false);
    });

    socket.on("typingFromParent", (parentId) => {
      setTypingParent(parentId);
      setTimeout(() => setTypingParent(""), 2000);
    });

    return () => {
      socket.off("receiveFromParent");
      socket.off("parentsList");
      socket.off("typingFromParent");
    };
  }, [activeParent]);

  const playNotification = () => {
    try {
      if (notificationRef.current) {
        notificationRef.current.currentTime = 0;
        notificationRef.current.play().catch((err) => {
          console.log("Audio play prevented:", err);
        });
      } else {
        // fallback: try creating a fresh Audio instance from the public asset
        new Audio('/notification.mp3').play().catch((err) => {
          console.log("Audio play prevented (fallback):", err);
        });
      }
    } catch (error) {
      console.log("Audio error:", error);
    }
  };

  const refreshParents = async () => {
    try {
        const res = await axios.get(`${API_BASE}/parents`);
      setParents(res.data);
      console.log("Parents refreshed:", res.data);
    } catch (error) {
      console.error("Error refreshing parents:", error);
    }
  };

  // Fetch emergency info for a parent from backend
  const fetchEmergencyInfo = async (parentId) => {
    setEmergencyLoading(true);
    setEmergencyError("");
    setEmergencyInfo(null);
    setShowEmergency(true);

    try {
      // Use the deployed emergency info service (do not modify server)
      const res = await axios.get(`${EMERGENCY_BASE}/api/parents/parent-info/${parentId}`);
      setEmergencyInfo(res.data);
    } catch (err) {
      console.error('Error fetching emergency info:', err);
      setEmergencyError('Failed to load emergency information');
    } finally {
      setEmergencyLoading(false);
    }
  };

  const openChat = async (parentId) => {
    setActiveParent(parentId);

    try {
      // First try to get messages from database
        const res = await axios.get(`${API_BASE}/messages/${parentId}`);
      let chatMessages = res.data;

      // If no messages in database, check localStorage for accumulated logs
      if (chatMessages.length === 0) {
        const localLogs = JSON.parse(localStorage.getItem('chatLogs') || '[]');
        chatMessages = localLogs.filter(log => log.parentId === parentId);
      }

      setChat(chatMessages);
    } catch (error) {
      console.error("Error loading chat:", error);
      // Fallback to localStorage only
      const localLogs = JSON.parse(localStorage.getItem('chatLogs') || '[]');
      const chatMessages = localLogs.filter(log => log.parentId === parentId);
      setChat(chatMessages);
    }
  };

  const sendReply = () => {
    if (!activeParent || !message.trim()) return;

    const newMessage = {
      parentId: activeParent,
      sender: "caretaker",
      message,
      timestamp: new Date()
    };

    socket.emit("caretakerReply", { parentId: activeParent, message });
    setChat((prev) => [
      ...prev,
      newMessage,
    ]);
    setMessage("");

    // Add to localStorage for accumulation (will be saved to DB on export)
    const existingLogs = JSON.parse(localStorage.getItem('chatLogs') || '[]');
    const updatedLogs = [...existingLogs, newMessage];
    localStorage.setItem('chatLogs', JSON.stringify(updatedLogs));
  };

  const handleTyping = () => {
    if (activeParent) socket.emit("typing", { role: "caretaker", parentId: activeParent });
  };

  const exportChatLogs = async () => {
    try {
      // Get all accumulated logs from localStorage
      const allLogs = JSON.parse(localStorage.getItem('chatLogs') || '[]');

      if (allLogs.length === 0) {
        toast.info('No chat logs to export');
        return;
      }

      // Convert logs to proper MongoDB format
      const mongoDBLogs = allLogs.map(log => ({
        parentId: log.parentId,
        sender: log.sender === 'caretaker' ? 'caretaker' : 'parent',
        message: log.message,
        timestamp: log.timestamp
      }));

      // Save to MongoDB via backend
        await axios.post(`${API_BASE}/save-chat-logs`, { logs: mongoDBLogs });

      // Create downloadable log file
      const logText = allLogs.map(log => {
        const timestamp = new Date(log.timestamp).toLocaleString();
        return `[${timestamp}] ${log.sender === 'caretaker' ? 'CARETAKER' : log.parentId}: ${log.message}`;
      }).join('\n');

      const blob = new Blob([`CHAT LOG EXPORT - ${new Date().toLocaleString()}\n\n${logText}`], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `chat-logs-${new Date().toISOString().split('T')[0]}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(`Chat logs exported successfully! (${allLogs.length} messages saved to database)`);
    } catch (error) {
      console.error("Error exporting logs:", error);
      toast.error('Failed to export chat logs');
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat]);

  // Initialize notification audio once
  useEffect(() => {
    try {
      // Use the public/ notification file served at the app root
      notificationRef.current = new Audio('/notification.mp3');
      notificationRef.current.preload = 'auto';
      // optional: lower the default volume
      notificationRef.current.volume = 0.9;
    } catch (err) {
      console.log('Failed to initialize notification audio:', err);
      notificationRef.current = null;
    }
    // expose a quick test helper in the window for debugging in the browser console
    try {
      // eslint-disable-next-line no-undef
      window.playNotificationTest = () => {
        if (notificationRef.current) {
          notificationRef.current.currentTime = 0;
          return notificationRef.current.play().catch(e => console.log('Play prevented (test):', e));
        }
        return Promise.resolve();
      };
    } catch (e) {
      // ignore
    }
  }, []);

  return (
    <div style={{ width: "100%", height: "100vh", padding: 15, fontFamily: "Poppins", display: "flex", flexDirection: "column" }}>
      <h3 style={{ margin: "0 0 15px 0", color: "#333", fontSize: "1.2rem" }}>👩‍🏫 Caretaker Chat</h3>

      {/* Export Logs Button */}
      <div style={{ marginBottom: 15, textAlign: "center" }}>
        <button
          onClick={exportChatLogs}
          style={{
            padding: "8px 16px",
            backgroundColor: "#2196F3",
            color: "white",
            border: "none",
            borderRadius: 15,
            cursor: "pointer",
            fontSize: 12,
            fontWeight: "bold",
            width: "100%"
          }}
        >
          📥 Export Chat Logs
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
        {/* Parents List */}
        <div style={{ marginBottom: 15 }}>
          <h4 style={{ margin: "0 0 10px 0", fontSize: "1rem", color: "#333" }}>Parents</h4>
          <div style={{ 
            maxHeight: "120px", 
            overflowY: "auto", 
            border: "1px solid #ddd", 
            borderRadius: 8, 
            padding: 8,
            background: "#f9f9f9"
          }}>
            {loading ? (
              <div style={{ fontSize: "12px", color: "#666" }}>Loading parents...</div>
            ) : parents.length === 0 ? (
              <div style={{ fontSize: "12px", color: "#666" }}>No parents found. Parents will appear here once they send messages.</div>
            ) : (
              parents.map((p) => (
                <div
                  key={p}
                  onClick={() => openChat(p)}
                  style={{
                    margin: "4px 0",
                    cursor: "pointer",
                    fontWeight: p === activeParent ? "bold" : "normal",
                    fontSize: "13px",
                    padding: "4px 8px",
                    borderRadius: 6,
                    background: p === activeParent ? "#e3f2fd" : "transparent",
                    border: p === activeParent ? "1px solid #2196F3" : "1px solid transparent",
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 8
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                    <div style={{ flex: 1 }}>{p} {typingParent === p && <span style={{ color: "green" }}>✍️</span>}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginLeft: 8 }}>
                    <button
                      onClick={(e) => { e.stopPropagation(); fetchEmergencyInfo(p); }}
                      style={{
                        padding: '6px 10px',
                        borderRadius: 8,
                        background: '#ff7043',
                        color: 'white',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: 12
                      }}
                      title="Show Emergency Info"
                    >
                      🚨
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
          <h4 style={{ margin: "0 0 10px 0", fontSize: "1rem", color: "#333" }}>
            Chat: {activeParent || "Select a parent"}
          </h4>
          <div
            style={{
              border: "1px solid #ddd",
              borderRadius: 10,
              flex: 1,
              overflowY: "auto",
              padding: 10,
              background: "#f9f9f9",
              marginBottom: 10,
              minHeight: "200px"
            }}
          >
            {chat.map((msg, i) => (
              <div key={i} style={{ textAlign: msg.sender === "caretaker" ? "right" : "left" }}>
                <div
                  style={{
                    display: "inline-block",
                    padding: "6px 10px",
                    borderRadius: 12,
                    background: msg.sender === "caretaker" ? "#DCF8C6" : "#EAEAEA",
                    marginBottom: "6px",
                    fontSize: "13px",
                    maxWidth: "85%",
                    wordWrap: "break-word"
                  }}
                >
                  {msg.message}
                </div>
                <div style={{ fontSize: "9px", color: "gray", marginBottom: "8px" }}>
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          <div style={{ display: "flex", gap: "8px" }}>
            <input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={(e) => {
                handleTyping();
                if (e.key === 'Enter') sendReply();
              }}
              placeholder="Type reply..."
              style={{ 
                flex: 1, 
                borderRadius: 15, 
                padding: "8px 12px", 
                border: "1px solid #ddd",
                fontSize: "13px"
              }}
            />
            <button 
              onClick={sendReply}
              style={{
                padding: "8px 16px",
                backgroundColor: "#4CAF50",
                color: "white",
                border: "none",
                borderRadius: 15,
                cursor: "pointer",
                fontSize: "12px",
                fontWeight: "bold"
              }}
            >
              Send
            </button>
          </div>
        </div>
      </div>
      <ToastContainer position="bottom-right" />
      {/* Emergency Info Modal */}
      {showEmergency && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            left: 0,
            top: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999
          }}
          onClick={() => setShowEmergency(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 360,
              maxWidth: '90%',
              background: 'white',
              padding: 16,
              borderRadius: 8,
              boxShadow: '0 8px 24px rgba(0,0,0,0.2)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <strong>Emergency Information</strong>
              <button onClick={() => setShowEmergency(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 18 }}>✖️</button>
            </div>

            {emergencyLoading ? (
              <div>Loading...</div>
            ) : emergencyError ? (
              <div style={{ color: 'red' }}>{emergencyError}</div>
            ) : emergencyInfo ? (
              <div style={{ fontSize: 13 }}>
                <div style={{ marginBottom: 6 }}><strong>Parent:</strong> {emergencyInfo.parentId || '—'}</div>
                <div style={{ marginBottom: 6 }}><strong>Pediatrician:</strong> {emergencyInfo.pediatrician || '—'}</div>
                <div style={{ marginBottom: 6 }}><strong>Hospital:</strong> {emergencyInfo.hospital || '—'}</div>
                <div style={{ marginBottom: 6 }}><strong>Emergency Number:</strong> {emergencyInfo.emergencyNumber || '—'}</div>
              </div>
            ) : (
              <div>No emergency information available.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CaretakerChat;
