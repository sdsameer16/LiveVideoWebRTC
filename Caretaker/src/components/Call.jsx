import React, { useRef, useEffect, useState } from 'react';
import SimplePeer from 'simple-peer';
import socket from '../utils/socket';

export default function Call({ roomId, isCaller }) {
  const localVideoRef = useRef();
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const [peers, setPeers] = useState(new Map()); // Map of parentId -> peer
  const [isRecording, setIsRecording] = useState(false);
  const [recordings, setRecordings] = useState([]);
  const [localStream, setLocalStream] = useState(null);

  useEffect(() => {
    console.log('🎯 Caretaker: Starting call for room:', roomId, 'isCaller:', isCaller);
    let stream;
    let currentPeers = new Map(); // Local peers map

    async function startCall() {
      try {
        console.log('📹 Caretaker: Requesting camera...');
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        console.log('✅ Caretaker: Camera access granted');
        console.log('📊 Stream details:', {
          id: stream.id,
          active: stream.active,
          videoTracks: stream.getVideoTracks().length,
          audioTracks: stream.getAudioTracks().length
        });
        
        localVideoRef.current.srcObject = stream;
        setLocalStream(stream);

        console.log('🔗 Caretaker: Joining room', roomId);
        socket.emit('join-room', { room: roomId, role: 'caretaker' });

        // Listen for new parents joining
        socket.on('new-peer', ({ id, role }) => {
          console.log('🆕 Caretaker: New peer joined:', id, 'role:', role);
          if (role === 'parent') {
            createPeerForParent(id, stream);
          }
        });

        // Listen for signals from parents
        socket.on('signal', ({ data, from }) => {
          console.log('📡 Caretaker: Received signal type:', data.type, 'from:', from);
          const peer = currentPeers.get(from);
          if (peer) {
            peer.signal(data);
          }
        });

        // Start recording automatically when streaming begins
        startRecording(stream);

      } catch (error) {
        console.error('❌ Caretaker: Error starting call:', error);
      }
    }

    function createPeerForParent(parentId, stream) {
      // Check if peer already exists for this parent
      if (currentPeers.has(parentId)) {
        console.log('⚠️ Caretaker: Peer already exists for parent:', parentId);
        return;
      }
      
      console.log('🤝 Caretaker: Creating peer for parent:', parentId);
      
      const peer = new SimplePeer({ 
        initiator: true, // Caretaker is always the initiator
        trickle: false,
        stream: stream 
      });

      peer.on('signal', data => {
        console.log('📡 Caretaker: Sending signal type:', data.type, 'to parent:', parentId);
        socket.emit('signal', { to: parentId, data, room: roomId });
      });

      peer.on('connect', () => {
        console.log('✅ Caretaker: Connected to parent:', parentId);
      });

      peer.on('error', (err) => {
        console.error('❌ Caretaker: Peer error with parent', parentId, ':', err);
        // Remove failed peer
        currentPeers.delete(parentId);
        setPeers(new Map(currentPeers));
      });

      peer.on('close', () => {
        console.log('🔴 Caretaker: Peer closed for parent:', parentId);
        currentPeers.delete(parentId);
        setPeers(new Map(currentPeers));
      });

      // Store the peer
      currentPeers.set(parentId, peer);
      setPeers(new Map(currentPeers));
    }

    startCall();

    return () => {
      console.log('🧹 Caretaker: Cleanup');
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        stopRecording();
      }
      
      // Destroy all peer connections
      currentPeers.forEach(peer => peer.destroy());
      currentPeers.clear();
      setPeers(new Map());
      
      if (stream) stream.getTracks().forEach(t => t.stop());
      
      socket.off('new-peer');
      socket.off('signal');
    };
  }, []);

  function startRecording(stream) {
    if (isRecording) return;
    
    recordedChunksRef.current = [];
    const recorder = new MediaRecorder(stream, { mimeType: 'video/webm; codecs=vp8' });

    recorder.ondataavailable = e => {
      if (e.data.size > 0) {
        recordedChunksRef.current.push(e.data);
      }
    };

    recorder.onstop = uploadRecording;

    recorder.start(1000); // Record in 1-second intervals
    mediaRecorderRef.current = recorder;
    setIsRecording(true);
    console.log('🔴 Recording started');
  }

  function stopRecording() {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      console.log('⏹️ Recording stopped');
    }
  }

  async function uploadRecording() {
    if (recordedChunksRef.current.length === 0) return;

    const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
    const formData = new FormData();
    
    const filename = `recording-${roomId}-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.webm`;
    formData.append('recording', blob, filename);
    formData.append('callerId', 'caretaker');
    formData.append('calleeId', 'parents');
    formData.append('roomId', roomId);
    formData.append('startedAt', new Date().toISOString());

    try {
      const response = await fetch('https://livevideowebrtc.onrender.com/api/uploadRecording', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();
      if (result.success) {
        console.log('✅ Recording uploaded successfully:', result.filename);
        alert(`Recording saved: ${result.filename}`);
        fetchRecordings(); // Refresh recordings list
      }
    } catch (error) {
      console.error('❌ Upload failed:', error);
      alert('Failed to upload recording');
    }
  }

  async function fetchRecordings() {
    try {
      const response = await fetch('https://livevideowebrtc.onrender.com/api/recordings');
      const recordings = await response.json();
      setRecordings(recordings);
    } catch (error) {
      console.error('❌ Failed to fetch recordings:', error);
    }
  }

  useEffect(() => {
    fetchRecordings();
  }, []);

  function downloadRecording(recording) {
    const link = document.createElement('a');
    link.href = recording.downloadUrl;
    link.download = recording.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div style={{
      height: '100vh',
      background: 'transparent',
      padding: '15px',
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
      overflow: 'auto'
    }}>
      {/* Header */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(10px)',
        borderRadius: '15px',
        padding: '20px',
        marginBottom: '20px',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
        textAlign: 'center'
      }}>
        <h1 style={{
          color: 'white',
          margin: '0 0 10px 0',
          fontSize: '2rem',
          fontWeight: '700',
          textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)'
        }}>
          🎥 Live Streaming Studio
        </h1>
        <p style={{
          color: 'rgba(255, 255, 255, 0.7)',
          margin: '0 0 15px 0',
          fontSize: '0.9rem'
        }}>
          🌐 Connected to: livevideowebrtc.onrender.com
        </p>
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '20px',
          flexWrap: 'wrap'
        }}>
          <div style={{
            background: 'rgba(255, 255, 255, 0.1)',
            padding: '15px 25px',
            borderRadius: '15px',
            border: '1px solid rgba(255, 255, 255, 0.2)'
          }}>
            <p style={{ color: 'white', margin: '0', fontSize: '1.2rem' }}>
              🏠 Room: <strong>{roomId}</strong>
            </p>
          </div>
          <div style={{
            background: isRecording ? 'rgba(244, 67, 54, 0.2)' : 'rgba(158, 158, 158, 0.2)',
            padding: '15px 25px',
            borderRadius: '15px',
            border: `2px solid ${isRecording ? '#f44336' : '#9e9e9e'}`
          }}>
            <p style={{ 
              color: isRecording ? '#f44336' : '#9e9e9e', 
              margin: '0', 
              fontSize: '1.2rem',
              fontWeight: '600'
            }}>
              {isRecording ? '🔴 RECORDING' : '⚪ NOT RECORDING'}
            </p>
          </div>
          <div style={{
            background: 'rgba(76, 175, 80, 0.2)',
            padding: '15px 25px',
            borderRadius: '15px',
            border: '2px solid #4CAF50'
          }}>
            <p style={{ color: '#4CAF50', margin: '0', fontSize: '1.2rem', fontWeight: '600' }}>
              👥 Viewers: {peers.size}
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="main-content" style={{
        display: 'grid',
        gridTemplateColumns: '2fr 1fr',
        gap: '20px',
        height: 'calc(100vh - 200px)'
      }}>
        {/* Video Preview - Larger Area */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)',
          borderRadius: '15px',
          padding: '20px',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <h3 style={{
            color: 'white',
            margin: '0 0 15px 0',
            fontSize: '1.3rem',
            fontWeight: '600'
          }}>
            📹 Your Live Stream
          </h3>
          
          <div style={{
            position: 'relative',
            background: '#000',
            borderRadius: '15px',
            overflow: 'hidden',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)',
            flex: 1,
            minHeight: '400px'
          }}>
            <video 
              ref={localVideoRef} 
              autoPlay 
              muted 
              playsInline 
              style={{ 
                width: '100%', 
                height: '100%',
                objectFit: 'cover',
                display: 'block'
              }} 
            />
            
            {/* Live Indicator */}
            <div style={{
              position: 'absolute',
              top: '15px',
              left: '15px',
              background: 'rgba(244, 67, 54, 0.9)',
              color: 'white',
              padding: '8px 15px',
              borderRadius: '20px',
              fontSize: '0.9rem',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}>
              <div style={{
                width: '8px',
                height: '8px',
                background: 'white',
                borderRadius: '50%',
                animation: 'blink 1s infinite'
              }}></div>
              LIVE
            </div>
          </div>
        </div>

        {/* Controls Panel - Right Side */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '15px'
        }}>
          {/* Recording Controls */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)',
            borderRadius: '15px',
            padding: '20px',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
          }}>
            <h3 style={{
              color: 'white',
              margin: '0 0 15px 0',
              fontSize: '1.2rem',
              fontWeight: '600'
            }}>
              🎬 Recording Controls
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '15px' }}>
              <button 
                onClick={stopRecording}
                disabled={!isRecording}
                style={{
                  padding: '12px',
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  backgroundColor: isRecording ? '#f44336' : '#666',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  cursor: isRecording ? 'pointer' : 'not-allowed',
                  transition: 'all 0.3s ease'
                }}
              >
                {isRecording ? '⏹️ Stop Recording' : '⏸️ Recording Stopped'}
              </button>
              
              <button 
                onClick={fetchRecordings}
                style={{
                  padding: '12px',
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  backgroundColor: '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
              >
                🔄 Refresh Recordings
              </button>
            </div>
            
            <div style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.9rem' }}>
              <p style={{ margin: '5px 0' }}>👥 Viewers: {peers.size}</p>
              <p style={{ margin: '5px 0' }}>🔴 {isRecording ? 'Recording Active' : 'Recording Stopped'}</p>
            </div>
          </div>

          {/* Recordings List - Compact */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)',
            borderRadius: '15px',
            padding: '20px',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
            flex: 1,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <h3 style={{
              color: 'white',
              margin: '0 0 15px 0',
              fontSize: '1.2rem',
              fontWeight: '600'
            }}>
              📹 Recent Recordings
            </h3>
            
            <div style={{ 
              flex: 1,
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              {recordings.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  color: 'rgba(255, 255, 255, 0.6)',
                  padding: '20px'
                }}>
                  <div style={{ fontSize: '1.5rem', marginBottom: '10px' }}>🎬</div>
                  <p style={{ fontSize: '0.9rem', margin: '0' }}>No recordings yet</p>
                </div>
              ) : (
                recordings.slice(0, 3).map(recording => (
                  <div 
                    key={recording.id} 
                    style={{ 
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      padding: '12px', 
                      borderRadius: '10px',
                      fontSize: '0.8rem'
                    }}
                  >
                    <div style={{ color: 'white', fontWeight: '600', marginBottom: '5px' }}>
                      📼 {recording.filename.substring(0, 20)}...
                    </div>
                    <div style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.7rem' }}>
                      {(recording.length / 1024 / 1024).toFixed(1)} MB
                    </div>
                    <button
                      onClick={() => downloadRecording(recording)}
                      style={{
                        background: '#2196F3',
                        color: 'white',
                        border: 'none',
                        padding: '6px 12px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '0.7rem',
                        marginTop: '5px',
                        width: '100%'
                      }}
                    >
                      📥 Download
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <style>
        {`
          @keyframes blink {
            0%, 50% { opacity: 1; }
            51%, 100% { opacity: 0.3; }
          }
          
          @media (max-width: 1024px) {
            .main-content {
              grid-template-columns: 1fr !important;
            }
          }
        `}
      </style>
    </div>
  );
}
