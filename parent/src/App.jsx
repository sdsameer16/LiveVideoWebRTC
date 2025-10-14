import React, { useState } from 'react';
import Call from './components/join';

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
          {/* <button onClick={() => { setIsCaller(true); joinRoom(); }}>Start Call</button> */}
          <button onClick={() => { setIsCaller(false); joinRoom(); }}>Join Call</button>
        </>
      ) : (
        <Call roomId={roomId} isCaller={isCaller} />
      )}
    </div>
  );
}

export default App;
