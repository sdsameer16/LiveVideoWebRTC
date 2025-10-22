import React, { useState } from 'react';
import Call from './components/Call';
import CaretakerChat from './CaretakerChats';

function App() {
  const [joined, setJoined] = useState(false);
  const [isCaller, setIsCaller] = useState(false);
  const [roomId, setRoomId] = useState('');

  const joinRoom = () => {
    if (roomId.trim() === '') return alert('Enter room ID');
    setJoined(true);
  };

  return (
    <div style={{ textAlign: 'center', marginTop: '40px' }}>
      {!joined ? (
        <>
          <h2>🎥 KinderKares Live Session</h2>
          <input
            placeholder="Enter Room ID"
            value={roomId}
            onChange={e => setRoomId(e.target.value)}
          />
          <br /><br />
          <button onClick={() => { setIsCaller(true); joinRoom(); }}>Start Call</button>
          {/* <button onClick={() => { setIsCaller(false); joinRoom(); }}>Join Call</button> */}
        </>
      ) : (
        <div style={{ 
          display: 'flex', 
          height: '100vh', 
          overflow: 'hidden',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
        }}>
          {/* Streaming Interface - 50% width */}
          <div style={{ 
            width: '80%',
            overflow: 'auto'
          }}>
            <Call roomId={roomId} isCaller={isCaller} />
          </div>
          
          {/* Chat Interface - 30% width, full height */}
          <div style={{ 
            width: '50%',
            height: '100vh',
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
            borderLeft: '1px solid rgba(255, 255, 255, 0.2)',
            boxShadow: '-5px 0 20px rgba(0, 0, 0, 0.1)',
            overflow: 'auto'
          }}>
            <CaretakerChat />
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
