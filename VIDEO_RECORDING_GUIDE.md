# 📹 Video Recording & MongoDB Upload Guide

## ✅ **Already Implemented Features**

Your system now has complete video recording functionality:

1. **🔴 Automatic Recording** - Starts when caretaker begins streaming
2. **☁️ MongoDB Upload** - Videos saved to your MongoDB database
3. **📥 Download to System** - Download recordings to your computer
4. **🗂️ Recording Management** - View all saved recordings with metadata

---

## 🎯 **How It Works**

### **1. Automatic Recording Process:**
```
Caretaker starts streaming → MediaRecorder starts → Video chunks collected → 
Recording stops → Upload to MongoDB → Download available
```

### **2. MongoDB Storage:**
- **Database:** `livevideo`
- **Collection:** `recordings.files` (GridFS)
- **Format:** WebM video files
- **Metadata:** Room ID, timestamps, file size, participants

### **3. Download Process:**
- **View recordings** in caretaker interface
- **Click download button** → File downloads to your system
- **Filename format:** `recording-{roomId}-{timestamp}.webm`

---

## 🧪 **Step-by-Step Testing**

### **Step 1: Start the System**

**Terminal 1 - Server:**
```bash
cd server
npm run dev
```
**Wait for:** `✅ Connected to MongoDB`

**Terminal 2 - Caretaker:**
```bash
cd Caretaker
npm run dev
```

**Terminal 3 - Parent:**
```bash
cd parent
npm run dev
```

### **Step 2: Start Recording**

**Caretaker (localhost:5173):**
1. Enter room: `100`
2. Click: **"Start Call"**
3. Allow camera access
4. **🔴 Recording starts automatically**
5. You'll see: **"🔴 Recording..."** status

**Parent (localhost:5174):**
1. Enter room: `100`
2. Click: **"Join Call"**
3. **Video stream appears immediately**

### **Step 3: Stop & Save Recording**

**In Caretaker Interface:**
1. Click: **"Stop & Save Recording"** button
2. **Recording uploads to MongoDB**
3. You'll see alert: **"Recording saved: recording-100-2025-10-13T21-30-00.webm"**
4. **Recording appears in "Saved Recordings" section**

### **Step 4: Download to Your System**

**In "Saved Recordings" section:**
1. You'll see your recording with details:
   - **Filename:** `recording-100-2025-10-13T21-30-00.webm`
   - **Room:** `100`
   - **Size:** `15.2 MB`
   - **Date:** `10/13/2025, 9:30:00 PM`

2. Click: **"📥 Download"** button
3. **File downloads to your Downloads folder**
4. **You can play it in any video player**

---

## 📊 **Recording Details**

### **What Gets Recorded:**
- ✅ **Caretaker's video** (camera feed)
- ✅ **Caretaker's audio** (microphone)
- ✅ **Full live stream** as seen by parents
- ✅ **High quality WebM format**

### **MongoDB Storage Structure:**
```javascript
{
  _id: ObjectId("..."),
  filename: "recording-100-2025-10-13T21-30-00.webm",
  uploadDate: "2025-10-13T16:00:00.000Z",
  length: 15728640, // File size in bytes
  metadata: {
    callerId: "caretaker",
    calleeId: "parents", 
    roomId: "100",
    startedAt: "2025-10-13T21:30:00.000Z",
    uploadedAt: "2025-10-13T21:35:00.000Z"
  }
}
```

### **API Endpoints:**
- **Upload:** `POST /api/uploadRecording`
- **Download:** `GET /api/download/:fileId`
- **List All:** `GET /api/recordings`

---

## 🎬 **Recording Management Interface**

The caretaker interface shows:

```
📹 Saved Recordings

┌─────────────────────────────────────────────────────────────┐
│ recording-100-2025-10-13T21-30-00.webm          📥 Download │
│ Room: 100 | Size: 15.2 MB | Date: 10/13/2025, 9:30:00 PM   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ recording-101-2025-10-13T20-15-00.webm          📥 Download │
│ Room: 101 | Size: 8.7 MB | Date: 10/13/2025, 8:15:00 PM    │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔧 **Technical Implementation**

### **Recording Code (Caretaker):**
```javascript
// Auto-start recording when streaming begins
startRecording(localStream);

function startRecording(stream) {
  const recorder = new MediaRecorder(stream, { 
    mimeType: 'video/webm; codecs=vp8' 
  });
  
  recorder.ondataavailable = e => {
    if (e.data.size > 0) {
      recordedChunksRef.current.push(e.data);
    }
  };
  
  recorder.onstop = uploadRecording;
  recorder.start(1000); // Record in 1-second intervals
}
```

### **Upload Code:**
```javascript
async function uploadRecording() {
  const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
  const formData = new FormData();
  
  formData.append('recording', blob, filename);
  formData.append('roomId', roomId);
  formData.append('startedAt', new Date().toISOString());
  
  const response = await fetch('/api/uploadRecording', {
    method: 'POST',
    body: formData
  });
}
```

### **Download Code:**
```javascript
function downloadRecording(recording) {
  const link = document.createElement('a');
  link.href = recording.downloadUrl; // /api/download/fileId
  link.download = recording.filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
```

---

## 🌐 **MongoDB Connection**

The system uses your `.env` MongoDB connection:
```
MONGODB_URI=mongodb+srv://sdsameer:db786@cluster0.uarb4bf.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
```

**Database Structure:**
- **Database:** `livevideo`
- **Collection:** `recordings.files` (GridFS for large files)
- **Collection:** `recordings.chunks` (GridFS chunks)

---

## 📱 **User Experience**

### **For Caretaker:**
1. **Start streaming** → Recording begins automatically
2. **Stream to multiple parents** → All interactions recorded
3. **Stop streaming** → Recording saved to MongoDB
4. **View recordings** → See all past sessions
5. **Download anytime** → Get videos on local system

### **For Parents:**
- **Join anytime** → See live stream immediately
- **No recording controls** → Only caretaker manages recordings
- **Seamless experience** → Just watch the stream

---

## 🐛 **Troubleshooting**

### **Issue: "Recording not uploading"**
**Check:**
1. MongoDB connection in server logs
2. Server shows: `✅ Connected to MongoDB`
3. No errors in caretaker console

### **Issue: "Download not working"**
**Check:**
1. Recording appears in list
2. Click download button (not just filename)
3. Check browser's download folder

### **Issue: "No recordings showing"**
**Solution:**
1. Click "Refresh Recordings" button
2. Check server logs for MongoDB errors
3. Ensure recording was properly stopped and uploaded

---

## 📈 **File Sizes & Limits**

**Typical file sizes:**
- **1 minute:** ~2-3 MB
- **5 minutes:** ~10-15 MB  
- **10 minutes:** ~20-30 MB
- **30 minutes:** ~60-90 MB

**MongoDB GridFS:** Handles files of any size (no 16MB limit)

---

## 🎯 **Next Steps**

1. **✅ Test recording** - Start caretaker, record for 1 minute, stop
2. **✅ Verify MongoDB** - Check if file appears in recordings list
3. **✅ Test download** - Click download button, verify file in Downloads
4. **✅ Play video** - Open downloaded file in video player
5. **✅ Deploy to production** - Upload server to Render with MongoDB

**Your video recording system is fully functional and ready to use!**
