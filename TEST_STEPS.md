# 🧪 Testing Steps for Live Video Streaming

## ⚠️ IMPORTANT: Follow This Exact Order

### Step 1: Start the Server
```bash
cd server
npm run dev
```
**Wait for:** `✅ Connected to MongoDB` and `🚀 Server running on http://localhost:4000`

---

### Step 2: Start Parent First (Receiver)
```bash
cd parent
npm run dev
```

1. **Open browser:** http://localhost:5174
2. **Open Console (F12)** to see logs
3. **Enter Room ID:** `100`
4. **Click:** "Join Call"
5. **Status should show:** "Waiting for caretaker to start streaming..."

**Expected Console Logs:**
```
👶 Parent: Joining room 100
```

**Leave this window open and proceed to Step 3**

---

### Step 3: Start Caretaker (Broadcaster)
```bash
cd Caretaker
npm run dev
```

1. **Open browser:** http://localhost:5173
2. **Open Console (F12)** to see logs
3. **Enter Room ID:** `100` (same as parent)
4. **Click:** "Start Call"
5. **Allow camera and microphone access**

**Expected Caretaker Console:**
```
🎯 Caretaker: Starting call for room: 100 isCaller: true
📹 Caretaker: Requesting camera...
✅ Caretaker: Camera access granted
🔗 Caretaker: Joining room 100
🤝 Caretaker: Creating SimplePeer, initiator: true
📡 Caretaker: Sending signal type: offer
```

**Expected Parent Console (after caretaker starts):**
```
🆕 Parent: New peer joined: [socket-id]
📡 Parent: Received signal type: offer from: [socket-id]
🤝 Parent: Creating SimplePeer as receiver
📤 Parent: Sending answer signal type: answer
✅ Parent: Peer connected
🎥 Parent: Receiving caretaker stream
```

**Expected Server Logs:**
```
👥 [parent-id] joined room 100
👥 [caretaker-id] joined room 100
📡 Signal from [caretaker-id] to room, type: offer
📢 Broadcasting to room: 100
📡 Signal from [parent-id] to [caretaker-id], type: answer
```

---

## ✅ Success Criteria

- ✅ Parent shows: "Connected - Watching live stream" (green text)
- ✅ Parent displays the caretaker's video feed
- ✅ Caretaker sees their own camera feed
- ✅ No errors in any console

---

## 🐛 Troubleshooting

### Issue: Parent receives "candidate" instead of "offer"
**Cause:** Caretaker started before parent joined the room
**Solution:** 
1. Refresh both browsers
2. Start parent FIRST
3. Wait for "Joining room..." status
4. THEN start caretaker

### Issue: "Cannot read properties of undefined"
**Cause:** Missing Node.js polyfills
**Solution:**
```bash
cd parent
npm install events util

cd ../Caretaker
npm install events util
```
Then restart dev servers

### Issue: Video not showing
**Check:**
1. Both are in the same room ID
2. Caretaker allowed camera access
3. Parent joined BEFORE caretaker started call
4. Browser console shows "🎥 Parent: Receiving caretaker stream"

---

## 📋 Quick Checklist

- [ ] Server running on port 4000
- [ ] Parent running on port 5174
- [ ] Caretaker running on port 5173
- [ ] Parent joined room FIRST
- [ ] Caretaker started call SECOND
- [ ] Both using same room ID
- [ ] Camera permission granted
- [ ] Console shows success logs
