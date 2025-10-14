# 🚀 Deploy Server to Render

## ✅ Your Server is Ready!

The file structure is correct for Render deployment. The `.env` file will NOT be uploaded to Render - you'll configure environment variables in Render's dashboard.

---

## 📋 Pre-Deployment Checklist

- ✅ `package.json` has `"start": "node index.js"` script
- ✅ `index.js` uses `process.env.PORT` (Render will provide this)
- ✅ MongoDB connection string is ready
- ✅ CORS is configured for your frontend domains

---

## 🌐 Step-by-Step Render Deployment

### **Step 1: Push to GitHub**

1. **Initialize Git in the server folder:**
```bash
cd d:\Livevideo\server
git init
```

2. **Create `.gitignore` file:**
```bash
echo node_modules/ > .gitignore
echo .env >> .gitignore
```

3. **Commit your code:**
```bash
git add .
git commit -m "Initial server setup for Render deployment"
```

4. **Create a GitHub repository:**
   - Go to https://github.com/new
   - Name: `livevideo-server` (or any name)
   - Don't initialize with README
   - Click "Create repository"

5. **Push to GitHub:**
```bash
git remote add origin https://github.com/YOUR_USERNAME/livevideo-server.git
git branch -M main
git push -u origin main
```

---

### **Step 2: Deploy on Render**

1. **Go to Render Dashboard:**
   - Visit: https://dashboard.render.com/
   - Sign up or log in (can use GitHub account)

2. **Create New Web Service:**
   - Click "New +" → "Web Service"
   - Connect your GitHub account if not already connected
   - Select your `livevideo-server` repository

3. **Configure the Service:**
   ```
   Name: livevideo-server
   Region: Choose closest to your users
   Branch: main
   Root Directory: (leave empty)
   Runtime: Node
   Build Command: npm install
   Start Command: npm start
   ```

4. **Select Plan:**
   - Choose "Free" plan for testing
   - Or "Starter" ($7/month) for production

5. **Add Environment Variables:**
   Click "Advanced" → "Add Environment Variable"
   
   Add these variables:
   ```
   PORT = 4000
   MONGODB_URI = mongodb+srv://sdsameer:db786@cluster0.uarb4bf.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
   NODE_ENV = production
   ```

6. **Click "Create Web Service"**
   - Render will start building and deploying
   - Wait 2-3 minutes for deployment to complete

---

### **Step 3: Get Your Server URL**

After deployment completes:
- You'll see a URL like: `https://livevideo-server.onrender.com`
- Copy this URL - you'll need it for your frontend

---

### **Step 4: Test Your Deployed Server**

Open in browser:
```
https://livevideo-server.onrender.com
```

You should see: `Server is running`

---

## 🔧 Update Frontend to Use Deployed Server

### **Update Caretaker Socket Connection:**

**File:** `d:\Livevideo\Caretaker\src\utils\socket.js`
```javascript
import { io } from 'socket.io-client';

const socket = io('https://livevideo-server.onrender.com', {
  transports: ['websocket'],
});

export default socket;
```

### **Update Parent Socket Connection:**

**File:** `d:\Livevideo\parent\src\utils\socket.js`
```javascript
import { io } from 'socket.io-client';

const socket = io('https://livevideo-server.onrender.com', {
  transports: ['websocket'],
});

export default socket;
```

---

## ⚠️ Important: Update CORS in Server

Before deploying, update your server's CORS configuration to allow your frontend domains.

**File:** `d:\Livevideo\server\index.js`

Find the CORS section and update:
```javascript
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:5174',
    'https://your-caretaker-domain.vercel.app',  // Add your deployed caretaker URL
    'https://your-parent-domain.vercel.app'      // Add your deployed parent URL
  ],
  credentials: true
}));
```

---

## 🐛 Troubleshooting

### Issue: "Application failed to respond"
**Solution:** Check Render logs for errors. Usually MongoDB connection issue.

### Issue: "Cannot connect to socket"
**Solution:** 
1. Check CORS settings in `index.js`
2. Verify frontend is using correct server URL
3. Check Render logs for connection errors

### Issue: "Free tier sleeps after 15 minutes"
**Solution:** 
- Render free tier sleeps when inactive
- First request after sleep takes 30-60 seconds to wake up
- Upgrade to paid plan for always-on service

---

## 📊 Monitor Your Deployment

**Render Dashboard:**
- View logs: Click on your service → "Logs" tab
- Check metrics: "Metrics" tab shows CPU/Memory usage
- Restart service: "Manual Deploy" → "Clear build cache & deploy"

---

## 💰 Cost Estimate

**Free Tier:**
- ✅ 750 hours/month free
- ✅ Sleeps after 15 min inactivity
- ✅ Good for testing

**Starter Plan ($7/month):**
- ✅ Always on
- ✅ Better performance
- ✅ Recommended for production

---

## 🎯 Next Steps

After server is deployed:
1. ✅ Update frontend socket URLs
2. ✅ Deploy Caretaker to Vercel/Netlify
3. ✅ Deploy Parent to Vercel/Netlify
4. ✅ Update CORS with deployed frontend URLs
5. ✅ Test end-to-end connection

---

## 📝 Quick Reference

**Your MongoDB URI:**
```
mongodb+srv://sdsameer:db786@cluster0.uarb4bf.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
```

**Server Repository:** (Update after creating)
```
https://github.com/YOUR_USERNAME/livevideo-server
```

**Deployed Server URL:** (Update after deployment)
```
https://livevideo-server.onrender.com
```
