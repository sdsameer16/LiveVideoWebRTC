import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server as IOServer } from 'socket.io';
import multer from 'multer';
import { MongoClient, GridFSBucket, ObjectId } from 'mongodb';
import stream from 'stream';
import dotenv from 'dotenv';

// Load environment variables from the server directory
dotenv.config({ path: './.env' });
const app = express();
const server = http.createServer(app);
const io = new IOServer(server, { cors: { origin: '*' } });
app.use(cors());
app.use(express.json());

// --- Multer for handling blob uploads ---
const upload = multer({ storage: multer.memoryStorage() });

// --- Room Management ---
const activeRooms = new Map(); // roomId -> { caretaker: socketId, offer: data, parents: Set<socketId> }

// --- MongoDB connection ---
const mongoUrl = process.env.MONGODB_URI;

if (!mongoUrl) {
  console.error('❌ MONGODB_URI environment variable is not defined!');
  console.error('Please check your .env file');
  process.exit(1);
}

console.log('🔗 MongoDB URL:', mongoUrl.substring(0, 50) + '...');

let db, gfsBucket;

async function connectDB() {
  const client = new MongoClient(mongoUrl);
  await client.connect();
  db = client.db('livevideo');
  gfsBucket = new GridFSBucket(db, { bucketName: 'recordings' });
  console.log('✅ Connected to MongoDB');
}
connectDB().catch(console.error);

// --- Basic route ---
app.get('/', (req, res) => res.send('Live Video Server is running'));

// --- Signaling (WebRTC) ---
io.on('connection', socket => {
  console.log('🟢 Client connected:', socket.id);

  socket.on('join-room', ({ room, role }) => {
    socket.join(room);
    console.log(`👥 ${socket.id} joined room ${room} as ${role || 'unknown'}`);

    // Initialize room if doesn't exist
    if (!activeRooms.has(room)) {
      activeRooms.set(room, { caretaker: null, offer: null, parents: new Set() });
    }

    const roomData = activeRooms.get(room);

    if (role === 'caretaker') {
      roomData.caretaker = socket.id;
      console.log(`🎥 Caretaker ${socket.id} is now streaming in room ${room}`);
      
      // Notify all parents that caretaker is available
      roomData.parents.forEach(parentId => {
        io.to(parentId).emit('caretaker-available', { caretakerId: socket.id });
      });
    } else if (role === 'parent') {
      roomData.parents.add(socket.id);
      console.log(`👶 Parent ${socket.id} joined room ${room}`);
      
      // If caretaker is streaming, send them the stored offer immediately
      if (roomData.caretaker && roomData.offer) {
        console.log(`🚀 Sending stored offer to parent ${socket.id}`);
        socket.emit('signal', { from: roomData.caretaker, data: roomData.offer });
      } else if (roomData.caretaker) {
        // Caretaker exists but no offer yet, notify parent to wait
        socket.emit('caretaker-available', { caretakerId: roomData.caretaker });
      }
    }

    // Notify others in room about new peer
    socket.to(room).emit('new-peer', { id: socket.id, role });
  });

  socket.on('signal', ({ to, data, room }) => {
    console.log(`📡 Signal from ${socket.id} to ${to || 'room'}, type: ${data.type}`);
    
    if (room && activeRooms.has(room)) {
      const roomData = activeRooms.get(room);
      
      // If this is an offer from caretaker, store it for future parents
      if (data.type === 'offer' && roomData.caretaker === socket.id) {
        roomData.offer = data;
        console.log(`💾 Stored caretaker offer for room ${room}`);
        
        // Send offer to all current parents
        roomData.parents.forEach(parentId => {
          console.log(`📤 Sending offer to parent ${parentId}`);
          io.to(parentId).emit('signal', { from: socket.id, data });
        });
      } else if (to) {
        // Direct signal to specific peer
        io.to(to).emit('signal', { from: socket.id, data });
      } else {
        // Broadcast to room
        socket.to(room).emit('signal', { from: socket.id, data });
      }
    }
  });

  socket.on('leave-room', ({ room }) => {
    socket.leave(room);
    console.log(`👋 ${socket.id} left room ${room}`);
    
    if (activeRooms.has(room)) {
      const roomData = activeRooms.get(room);
      
      if (roomData.caretaker === socket.id) {
        // Caretaker left - clear the room
        roomData.caretaker = null;
        roomData.offer = null;
        console.log(`🔴 Caretaker left room ${room} - stream ended`);
        
        // Notify all parents that stream ended
        roomData.parents.forEach(parentId => {
          io.to(parentId).emit('stream-ended');
        });
      } else {
        // Parent left
        roomData.parents.delete(socket.id);
      }
      
      // Clean up empty rooms
      if (!roomData.caretaker && roomData.parents.size === 0) {
        activeRooms.delete(room);
        console.log(`🗑️ Cleaned up empty room ${room}`);
      }
    }
    
    socket.to(room).emit('peer-left', { id: socket.id });
  });

  socket.on('disconnect', () => {
    console.log('🔴 Disconnected:', socket.id);
    
    // Clean up from all rooms
    for (const [roomId, roomData] of activeRooms.entries()) {
      if (roomData.caretaker === socket.id) {
        roomData.caretaker = null;
        roomData.offer = null;
        roomData.parents.forEach(parentId => {
          io.to(parentId).emit('stream-ended');
        });
      } else {
        roomData.parents.delete(socket.id);
      }
      
      // Clean up empty rooms
      if (!roomData.caretaker && roomData.parents.size === 0) {
        activeRooms.delete(roomId);
      }
    }
  });
});

// --- API for uploading recording ---
app.post('/api/uploadRecording', upload.single('recording'), async (req, res) => {
  if (!gfsBucket) return res.status(500).send('DB not ready');
  try {
    const { buffer, originalname } = req.file;
    const { callerId, calleeId, startedAt, roomId } = req.body;

    const passStream = new stream.PassThrough();
    passStream.end(buffer);

    const filename = originalname || `recording-${roomId}-${Date.now()}.webm`;
    const uploadStream = gfsBucket.openUploadStream(filename, {
      metadata: { 
        callerId, 
        calleeId, 
        startedAt, 
        roomId,
        uploadedAt: new Date().toISOString()
      }
    });

    passStream.pipe(uploadStream)
      .on('finish', () => {
        console.log('📹 Recording uploaded:', filename);
        res.json({ 
          success: true, 
          fileId: uploadStream.id,
          filename: filename,
          downloadUrl: `/api/download/${uploadStream.id}`
        });
      })
      .on('error', err => res.status(500).json({ error: err.message }));
  } catch (err) {
    console.error(err);
    res.status(500).send('Error saving recording');
  }
});

// --- API for downloading recording ---
app.get('/api/download/:fileId', async (req, res) => {
  if (!gfsBucket) return res.status(500).send('DB not ready');
  try {
    const { fileId } = req.params;
    const downloadStream = gfsBucket.openDownloadStream(new ObjectId(fileId));
    
    downloadStream.on('file', (file) => {
      res.set({
        'Content-Type': 'video/webm',
        'Content-Disposition': `attachment; filename="${file.filename}"`,
        'Content-Length': file.length
      });
    });
    
    downloadStream.pipe(res);
  } catch (err) {
    console.error(err);
    res.status(404).send('Recording not found');
  }
});

// --- API for listing recordings ---
app.get('/api/recordings', async (req, res) => {
  if (!gfsBucket) return res.status(500).send('DB not ready');
  try {
    const files = await gfsBucket.find({}).toArray();
    const recordings = files.map(file => ({
      id: file._id,
      filename: file.filename,
      uploadDate: file.uploadDate,
      length: file.length,
      metadata: file.metadata,
      downloadUrl: `/api/download/${file._id}`
    }));
    res.json(recordings);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error fetching recordings');
  }
});

// --- Start server ---
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
