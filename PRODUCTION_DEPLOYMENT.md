# 🚀 Production Deployment Guide: Cross-Device Multiplayer

## Quick Start - Deploy for Cross-Device Testing

### Step 1: Deploy Backend (Choose One Platform)

#### Option A: Railway (Recommended - Free tier)
1. Go to **https://railway.app**
2. Sign up/Login with GitHub
3. Click **"Start a New Project"**
4. Choose **"Deploy from GitHub repo"**
5. Select your **Gorbagana repository**
6. Choose **"backend"** folder as root directory
7. Add these environment variables:
```
MONGODB_URI=mongodb+srv://jgrantrichards:7cvB2WZ9JznqGzx6@cluster0.cawkklo.mongodb.net/gorbagana-trash-tac-toe?retryWrites=true&w=majority&appName=Cluster0
PORT=3001
NODE_ENV=production
CORS_ORIGINS=https://gorbagana-trash-tac-toe.netlify.app
```
8. Deploy and copy your Railway URL (e.g., `https://your-app.railway.app`)

#### Option B: Render (Alternative - Free tier)  
1. Go to **https://render.com**
2. Sign up/Login with GitHub
3. Click **"New +" → "Web Service"**
4. Connect your Gorbagana repository
5. Configure:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
6. Add same environment variables as Railway
7. Deploy and copy your Render URL (e.g., `https://your-app.onrender.com`)

### Step 2: Update Frontend Configuration

1. Open `frontend/src/lib/gameStorage.ts`
2. Find line 40 with `https://gorbagana-backend.railway.app`
3. Replace with your actual backend URL from Step 1

### Step 3: Deploy Frontend to Netlify

#### Option A: Netlify CLI
```bash
cd frontend
npm run build
netlify deploy --prod --dir out
```

#### Option B: Netlify Dashboard
1. Go to **https://app.netlify.com**
2. Click on your **"gorbagana-trash-tac-toe"** site
3. Go to **"Deploys"** tab  
4. Click **"Deploy site"** → **"Deploy with GitHub"**
5. OR build locally and drag/drop the `frontend/out` folder

### Step 4: Test Cross-Device Multiplayer! 🎮

1. **Device 1** (Phone): Open `https://gorbagana-trash-tac-toe.netlify.app`
2. **Device 2** (Computer): Open `https://gorbagana-trash-tac-toe.netlify.app`
3. **Create game** on Device 1 → Note the Game ID
4. **Join game** on Device 2 → Enter the Game ID
5. **Play multiplayer** across devices in real-time!

---

## Architecture Overview

```
Device 1 (Phone) ←→ Netlify Frontend ←→ Railway/Render Backend ←→ MongoDB Atlas
                                    ↑
Device 2 (Computer) ←→ Netlify Frontend ←→ Railway/Render Backend ←→ MongoDB Atlas
```

## What's Deployed

### Frontend (Netlify)
- **URL**: `https://gorbagana-trash-tac-toe.netlify.app`
- **Tech**: Next.js static export
- **Features**: Wallet connection, game UI, real-time updates

### Backend (Railway/Render)  
- **URL**: Your deployed backend URL
- **Tech**: Node.js + Express
- **Features**: REST API, game storage, cross-device coordination

### Database (MongoDB Atlas)
- **Service**: Cloud MongoDB
- **Features**: Persistent game storage, real-time sync

## Environment Variables

### Backend (.env)
```
MONGODB_URI=mongodb+srv://jgrantrichards:7cvB2WZ9JznqGzx6@cluster0.cawkklo.mongodb.net/gorbagana-trash-tac-toe?retryWrites=true&w=majority&appName=Cluster0
PORT=3001  
NODE_ENV=production
CORS_ORIGINS=https://gorbagana-trash-tac-toe.netlify.app
```

### Frontend (Automatic)
- Detects production vs development automatically
- Uses localhost:3001 for local development
- Uses your deployed backend URL for production

## API Endpoints

- `GET /health` - Health check
- `POST /api/games` - Create game
- `GET /api/games/:id` - Get specific game
- `PUT /api/games/:id` - Update game
- `GET /api/games` - List public games
- `POST /api/games/:id/join` - Join game
- `POST /api/games/:id/move` - Make move
- `GET /api/stats` - Database statistics

## Testing Checklist

- [ ] Backend deployed and responding to `/health`
- [ ] Frontend deployed and loading
- [ ] Create game on Device 1
- [ ] Join game on Device 2 using Game ID
- [ ] Make moves on both devices
- [ ] Verify real-time synchronization
- [ ] Check game persistence across browser refreshes

## Troubleshooting

### "No game found" error
- Check backend URL in `gameStorage.ts`
- Verify backend is deployed and running
- Check browser console for CORS errors

### Games not syncing
- Verify MongoDB Atlas connection
- Check environment variables on backend
- Test backend API endpoints directly

### Wallet connection issues
- Ensure Backpack wallet is installed
- Check for browser extension conflicts
- Verify Gorbagana testnet configuration

## Production Ready Features

✅ **Cross-device multiplayer** - Real-time game coordination  
✅ **Cloud database** - MongoDB Atlas persistence  
✅ **Wallet integration** - Backpack wallet support  
✅ **Network resilience** - Multiple RPC endpoint fallbacks  
✅ **Game sharing** - Shareable URLs and Game IDs  
✅ **Real-time updates** - 3-second polling for live gameplay  
✅ **Responsive design** - Works on mobile and desktop  
✅ **Error handling** - Graceful fallbacks and user feedback  

## Support

- **Frontend**: https://gorbagana-trash-tac-toe.netlify.app
- **Backend**: Your deployed backend URL
- **Database**: MongoDB Atlas cloud
- **Blockchain**: Gorbagana Testnet

**Ready for Superteam Earn bounty submission! 🏆** 