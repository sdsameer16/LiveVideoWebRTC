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
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px',
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
    }}>
      {/* Header */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(10px)',
        borderRadius: '20px',
        padding: '30px',
        marginBottom: '30px',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
        textAlign: 'center'
      }}>
        <h1 style={{
          color: 'white',
          margin: '0 0 15px 0',
          fontSize: '3rem',
          fontWeight: '700',
          textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)'
        }}>
          🎥 Live Streaming Studio
        </h1>
        <p style={{
          color: 'rgba(255, 255, 255, 0.7)',
          margin: '0 0 20px 0',
          fontSize: '1rem'
        }}>
          🌐 Connected to: livevideowebrtc.onrender.com
        </p>
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '40px',
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
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 400px',
        gap: '30px',
        maxWidth: '1400px',
        margin: '0 auto'
      }}>
        {/* Video Preview */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)',
          borderRadius: '20px',
          padding: '25px',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
        }}>
          <h3 style={{
            color: 'white',
            margin: '0 0 20px 0',
            fontSize: '1.5rem',
            fontWeight: '600'
          }}>
            📹 Your Live Stream
          </h3>
          
          <div style={{
            position: 'relative',
            background: '#000',
            borderRadius: '15px',
            overflow: 'hidden',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)'
          }}>
            <video 
              ref={localVideoRef} 
              autoPlay 
              muted 
              playsInline 
              style={{ 
                width: '100%', 
                height: 'auto',
                minHeight: '300px',
                maxHeight: '500px',
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

        {/* Control Panel */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '20px'
        }}>
          {/* Recording Controls */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)',
            borderRadius: '20px',
            padding: '25px',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
          }}>
            <h3 style={{
              color: 'white',
              margin: '0 0 20px 0',
              fontSize: '1.3rem',
              fontWeight: '600'
            }}>
              🎬 Recording Controls
            </h3>
            
            <button 
              onClick={stopRecording}
              disabled={!isRecording}
              style={{
                width: '100%',
                padding: '15px',
                fontSize: '1.1rem',
                fontWeight: '600',
                backgroundColor: isRecording ? '#f44336' : '#666',
                color: 'white',
                border: 'none',
                borderRadius: '15px',
                cursor: isRecording ? 'pointer' : 'not-allowed',
                marginBottom: '15px',
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px'
              }}
            >
              {isRecording ? '⏹️ Stop & Save Recording' : '⏸️ Recording Stopped'}
            </button>
            
            <button 
              onClick={fetchRecordings}
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '1rem',
                fontWeight: '600',
                backgroundColor: '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '15px',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
              onMouseOver={(e) => e.target.style.backgroundColor = '#45a049'}
              onMouseOut={(e) => e.target.style.backgroundColor = '#4CAF50'}
            >
              🔄 Refresh Recordings
            </button>
          </div>

          {/* Stream Stats */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)',
            borderRadius: '20px',
            padding: '25px',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
          }}>
            <h3 style={{
              color: 'white',
              margin: '0 0 15px 0',
              fontSize: '1.3rem',
              fontWeight: '600'
            }}>
              📊 Stream Statistics
            </h3>
            
            <div style={{ color: 'rgba(255, 255, 255, 0.8)' }}>
              <p style={{ margin: '8px 0', fontSize: '1rem' }}>
                👥 <strong>Active Viewers:</strong> {peers.size}
              </p>
              <p style={{ margin: '8px 0', fontSize: '1rem' }}>
                🎥 <strong>Stream Quality:</strong> HD
              </p>
              <p style={{ margin: '8px 0', fontSize: '1rem' }}>
                🔴 <strong>Recording:</strong> {isRecording ? 'Active' : 'Inactive'}
              </p>
              <p style={{ margin: '8px 0', fontSize: '1rem' }}>
                🌐 <strong>Room ID:</strong> {roomId}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Recordings Section */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(10px)',
        borderRadius: '20px',
        padding: '30px',
        marginTop: '30px',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
        maxWidth: '1400px',
        margin: '30px auto 0'
      }}>
        <h3 style={{
          color: 'white',
          margin: '0 0 25px 0',
          fontSize: '2rem',
          fontWeight: '600',
          textAlign: 'center'
        }}>
          📹 Saved Recordings
        </h3>
        
        {recordings.length === 0 ? (
          <div style={{
            textAlign: 'center',
            color: 'rgba(255, 255, 255, 0.6)',
            padding: '40px'
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '15px' }}>🎬</div>
            <p style={{ fontSize: '1.2rem', margin: '0' }}>No recordings yet</p>
            <p style={{ fontSize: '1rem', margin: '10px 0 0 0' }}>Start streaming and stop recording to save your first video</p>
          </div>
        ) : (
          <div style={{ 
            display: 'grid', 
            gap: '15px',
            gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))'
          }}>
            {recordings.map(recording => (
              <div 
                key={recording.id} 
                style={{ 
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  padding: '20px', 
                  borderRadius: '15px',
                  backdropFilter: 'blur(5px)',
                  transition: 'all 0.3s ease'
                }}
                onMouseOver={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.15)'}
                onMouseOut={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.1)'}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <h4 style={{ 
                      color: 'white', 
                      margin: '0 0 10px 0',
                      fontSize: '1.1rem',
                      fontWeight: '600'
                    }}>
                      📼 {recording.filename}
                    </h4>
                    <div style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.9rem' }}>
                      <p style={{ margin: '5px 0' }}>
                        🏠 <strong>Room:</strong> {recording.metadata?.roomId}
                      </p>
                      <p style={{ margin: '5px 0' }}>
                        💾 <strong>Size:</strong> {(recording.length / 1024 / 1024).toFixed(2)} MB
                      </p>
                      <p style={{ margin: '5px 0' }}>
                        📅 <strong>Date:</strong> {new Date(recording.uploadDate).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => downloadRecording(recording)}
                    style={{
                      background: 'linear-gradient(45deg, #2196F3, #21CBF3)',
                      color: 'white',
                      border: 'none',
                      padding: '12px 20px',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                      fontWeight: '600',
                      transition: 'all 0.3s ease',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                    onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
                    onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
                  >
                    📥 Download
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>
        {`
          @keyframes blink {
            0%, 50% { opacity: 1; }
            51%, 100% { opacity: 0.3; }
          }
          
          @media (max-width: 768px) {
            .main-grid {
              grid-template-columns: 1fr !important;
            }
          }
        `}
      </style>
    </div>
  );
}
