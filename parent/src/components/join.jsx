import React, { useRef, useEffect, useState } from 'react';
import SimplePeer from 'simple-peer';
import socket from '../utils/socket';

export default function Join({ roomId, isCaller }) {
  const videoRef = useRef();
  const [peer, setPeer] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [status, setStatus] = useState('Connecting...');
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Set stream on video element when remoteStream changes
  useEffect(() => {
    if (remoteStream && videoRef.current) {
      console.log('🎬 Setting stream on video element');
      videoRef.current.srcObject = remoteStream;
      
      videoRef.current.onloadedmetadata = () => {
        console.log('▶️ Video metadata loaded, attempting to play');
        videoRef.current.play().catch(e => console.error('Play failed:', e));
      };
      
      videoRef.current.onplay = () => {
        console.log('▶️ Video started playing successfully');
      };
    }
  }, [remoteStream]);

  useEffect(() => {
    // Parent should never be the caller/initiator
    if (isCaller) {
      console.log('⚠️ Parent: isCaller is true, skipping');
      return;
    }

    console.log('👶 Parent: Joining room', roomId);
    setStatus('Joining room...');
    socket.emit('join-room', { room: roomId, role: 'parent' });

    let peerInstance = null;
    let streamReceived = false;

    // Listen for caretaker availability
    socket.on('caretaker-available', ({ caretakerId }) => {
      console.log('🎥 Parent: Caretaker is available:', caretakerId);
      setStatus('Caretaker is streaming, waiting for connection...');
    });

    // Listen for stream ended
    socket.on('stream-ended', () => {
      console.log('🔴 Parent: Stream ended by caretaker');
      setStatus('Stream ended');
      setIsConnected(false);
      if (peerInstance) {
        peerInstance.destroy();
        peerInstance = null;
        setPeer(null);
      }
      setRemoteStream(null);
    });

    // Listen for signals from caretaker
    socket.on('signal', ({ data, from }) => {
      console.log('📡 Parent: Received signal type:', data.type, 'from:', from);
      
      // Create peer when we receive the first offer
      if (!peerInstance && data.type === 'offer') {
        console.log('🤝 Parent: Creating SimplePeer as receiver');
        
        // Create peer as receiver (not initiator, no local stream)
        peerInstance = new SimplePeer({
          initiator: false,
          trickle: false  // Bundle all ICE candidates in the answer
        });

        peerInstance.on('signal', (responseData) => {
          console.log('📤 Parent: Sending answer signal type:', responseData.type);
          socket.emit('signal', { to: from, data: responseData, room: roomId });
        });

        peerInstance.on('stream', (stream) => {
          if (streamReceived) {
            console.log('⚠️ Parent: Duplicate stream received, ignoring');
            return;
          }
          streamReceived = true;
          
          console.log('🎥 Parent: Received video stream from caretaker');
          console.log('📊 Stream details:', {
            id: stream.id,
            active: stream.active,
            videoTracks: stream.getVideoTracks().length,
            audioTracks: stream.getAudioTracks().length,
            videoTrack: stream.getVideoTracks()[0]?.enabled,
            audioTrack: stream.getAudioTracks()[0]?.enabled
          });
          
          // Save stream to state - the useEffect will handle setting it on the video element
          setRemoteStream(stream);
          setIsConnected(true);
          setStatus('Connected - Watching live stream');
        });

        peerInstance.on('connect', () => {
          console.log('✅ Parent: Peer connected');
        });

        peerInstance.on('error', (err) => {
          console.error('❌ Parent: Peer error:', err.message);
          setStatus('Connection error: ' + err.message);
          // Reset peer on error
          peerInstance = null;
          streamReceived = false;
          setPeer(null);
          setRemoteStream(null);
          setIsConnected(false);
        });

        peerInstance.on('close', () => {
          console.log('🔴 Parent: Peer connection closed');
          setStatus('Connection closed');
          peerInstance = null;
          streamReceived = false;
          setPeer(null);
          setRemoteStream(null);
          setIsConnected(false);
        });

        setPeer(peerInstance);
        console.log('📡 Parent: Signaling offer to peer');
        peerInstance.signal(data);
      } else if (peerInstance && data.type !== 'offer') {
        // Only process non-offer signals (like candidates) if peer exists
        console.log('📡 Parent: Signaling additional data to existing peer');
        try {
          peerInstance.signal(data);
        } catch (err) {
          console.error('❌ Parent: Error signaling data:', err.message);
        }
      } else if (data.type === 'offer' && peerInstance) {
        console.log('⚠️ Parent: Ignoring duplicate offer, peer already exists');
      } else {
        console.log('⚠️ Parent: Received', data.type, 'but no peer yet, waiting for offer');
      }
    });

    socket.on('new-peer', ({ id }) => {
      console.log('🆕 Parent: New peer joined:', id);
    });

    socket.on('peer-left', ({ id }) => {
      console.log('👋 Parent: Peer left:', id);
    });

    return () => {
      console.log('🧹 Parent: Cleanup');
      setIsConnected(false);
      if (peerInstance) {
        peerInstance.destroy();
        peerInstance = null;
        setPeer(null);
      }
      socket.off('signal');
      socket.off('new-peer');
      socket.off('caretaker-available');
      socket.off('stream-ended');
    };
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      videoRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const handleLeave = () => {
    console.log('👋 Parent: Leaving room');
    socket.emit('leave-room', { room: roomId });
    
    if (peer) {
      peer.destroy();
      setPeer(null);
    }
    
    setRemoteStream(null);
    setIsConnected(false);
    setStatus('Disconnected');
    
    // Reload page to go back to join screen
    window.location.reload();
  };

  // Handle fullscreen change events
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '20px',
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
    }}>
      {/* Header */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(10px)',
        borderRadius: '20px',
        padding: '20px 40px',
        marginBottom: '30px',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
      }}>
        <h1 style={{
          color: 'white',
          margin: '0',
          fontSize: '2.5rem',
          fontWeight: '700',
          textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)'
        }}>
          🎥 Live Stream Viewer
        </h1>
        <p style={{
          color: 'rgba(255, 255, 255, 0.8)',
          margin: '10px 0 0 0',
          fontSize: '1.2rem'
        }}>
          Room: <strong>{roomId}</strong>
        </p>
      </div>

      {/* Status */}
      <div style={{
        background: isConnected ? 'rgba(76, 175, 80, 0.2)' : 'rgba(255, 193, 7, 0.2)',
        color: isConnected ? '#4CAF50' : '#FFC107',
        padding: '15px 30px',
        borderRadius: '50px',
        marginBottom: '30px',
        border: `2px solid ${isConnected ? '#4CAF50' : '#FFC107'}`,
        fontSize: '1.1rem',
        fontWeight: '600',
        backdropFilter: 'blur(10px)'
      }}>
        {isConnected ? '🟢 LIVE' : '🟡'} {status}
      </div>

      {/* Video Container */}
      <div style={{
        position: 'relative',
        width: '100%',
        maxWidth: '1200px',
        background: 'rgba(0, 0, 0, 0.8)',
        borderRadius: '20px',
        overflow: 'hidden',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
        border: '2px solid rgba(255, 255, 255, 0.1)'
      }}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          style={{
            width: '100%',
            height: 'auto',
            minHeight: '400px',
            maxHeight: '70vh',
            objectFit: 'cover',
            display: 'block'
          }}
        />
        
        {/* Video Controls Overlay */}
        {isConnected && (
          <div style={{
            position: 'absolute',
            bottom: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            gap: '15px',
            background: 'rgba(0, 0, 0, 0.7)',
            padding: '15px 25px',
            borderRadius: '50px',
            backdropFilter: 'blur(10px)'
          }}>
            <button
              onClick={toggleFullscreen}
              style={{
                background: 'rgba(255, 255, 255, 0.2)',
                border: 'none',
                color: 'white',
                padding: '12px 20px',
                borderRadius: '25px',
                cursor: 'pointer',
                fontSize: '1rem',
                fontWeight: '600',
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
              onMouseOver={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.3)'}
              onMouseOut={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.2)'}
            >
              {isFullscreen ? '🔲' : '⛶'} {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            </button>
            
            <button
              onClick={handleLeave}
              style={{
                background: 'rgba(244, 67, 54, 0.8)',
                border: 'none',
                color: 'white',
                padding: '12px 20px',
                borderRadius: '25px',
                cursor: 'pointer',
                fontSize: '1rem',
                fontWeight: '600',
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
              onMouseOver={(e) => e.target.style.background = 'rgba(244, 67, 54, 1)'}
              onMouseOut={(e) => e.target.style.background = 'rgba(244, 67, 54, 0.8)'}
            >
              🚪 Leave Stream
            </button>
          </div>
        )}

        {/* Loading/No Stream Overlay */}
        {!isConnected && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            color: 'white'
          }}>
            <div style={{
              fontSize: '4rem',
              marginBottom: '20px',
              animation: 'pulse 2s infinite'
            }}>
              📺
            </div>
            <h3 style={{ margin: '0', fontSize: '1.5rem' }}>
              {status === 'Connecting...' ? 'Connecting to stream...' : 'Waiting for caretaker...'}
            </h3>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div style={{
        marginTop: '30px',
        color: 'rgba(255, 255, 255, 0.7)',
        textAlign: 'center',
        fontSize: '0.9rem'
      }}>
        <p>💡 Click fullscreen for immersive viewing experience</p>
        <p>🔄 Stream will automatically reconnect if interrupted</p>
      </div>

      <style>
        {`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
        `}
      </style>
    </div>
  );
}
