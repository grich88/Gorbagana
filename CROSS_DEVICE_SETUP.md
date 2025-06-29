# Cross-Device Gaming Setup Guide

## Issues Fixed

## Database Solution

**We're using a simple file-based JSON database** that persists games to disk:

- **`backend/data/games.json`** - All game data
- **`backend/data/public_games.json`** - Index of public games  
- **Automatic file creation** - Database files are created on first run
- **Persistent across restarts** - Games survive server restarts
- **Simple & reliable** - No external database required

This addresses the following issues you encountered:

1. **DNS Resolution Error**: `https://testnet.gorchain.wstf.io/ net::ERR_NAME_NOT_RESOLVED`
2. **Cross-Device Game Access**: Games not visible across different devices
3. **Games Not Persisting**: Server restart wiped in-memory games
4. **Wallet Extension Conflicts**: Multiple wallet extensions causing conflicts
5. **Private Game Joining**: Issues joining private games from different devices

## What's New

### 🎯 Backend API Server
- New Express.js server for cross-device game coordination
- **File-based JSON database** for persistent game storage
- Automatic fallback to local storage when backend is unavailable
- Real-time game synchronization across devices

### 🌐 Network Resilience
- Multiple RPC endpoint fallbacks (Gorbagana → Solana devnet)
- Automatic endpoint testing and switching
- Better error handling for network issues

### 📱 Cross-Device Gaming
- Games stored on central server for access from any device
- Shareable game URLs with encoded game data
- Automatic game synchronization every 3-5 seconds

## Setup Instructions

### 1. Install Backend Dependencies

```bash
# Navigate to backend folder
cd backend

# Install dependencies
npm install

# Start the backend server
npm start
```

The server will run on `http://localhost:3001`

### 2. Environment Variables (Optional)

Create a `.env` file in the frontend directory:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

For production, set this to your deployed backend URL.

### 3. Development Workflow

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev  # Uses nodemon for auto-restart
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

### 4. Production Deployment

#### Backend Deployment (Render.com - Currently Active):
```bash
cd backend
# Deploy to your preferred platform
```

#### Update Frontend Environment:
```env
NEXT_PUBLIC_API_URL=https://your-backend-url.com
```

## How It Works

### Cross-Device Game Flow

1. **Create Game**: Saved to backend API + local storage
2. **Join Game**: Backend coordinates player joining
3. **Make Moves**: Backend validates and synchronizes moves
4. **Real-time Updates**: Frontend polls backend every 3 seconds

### Fallback System

If backend is unavailable:
- Games save to localStorage only
- Limited to single-device play
- Shareable URLs still work for game import

### Network Resilience

The app automatically tests RPC endpoints in order:
1. `https://testnet.gorchain.wstf.io` (Primary Gorbagana)
2. `https://rpc.testnet.gorbagana.com` (Alternative)
3. Solana devnet (Fallback)
4. Alternative Solana endpoints

## Sharing Games Across Devices

### Method 1: Game ID
1. Create a game on Device A
2. Note the Game ID (4-digit number)
3. Enter Game ID on Device B to join

### Method 2: QR Code/URL Sharing
1. Games generate shareable URLs with encoded data
2. URLs work even if backend is unavailable
3. Automatically imports game data on new device

## Troubleshooting

### Backend Not Starting
```bash
# Check if port 3001 is available
lsof -i :3001

# Install dependencies again
cd backend && npm install
```

### Frontend Not Connecting to Backend
1. Check browser console for CORS errors
2. Verify `NEXT_PUBLIC_API_URL` environment variable
3. Ensure backend is running on correct port

### Wallet Connection Issues
1. Refresh the page to clear extension conflicts
2. Try direct wallet connection buttons
3. Disable conflicting browser extensions temporarily

### Network Issues
1. App automatically falls back to Solana devnet
2. Check browser console for RPC endpoint status
3. Wait for "🌐 Connected to..." toast message

### Database Issues
```bash
# Check if database files exist
ls -la backend/data/

# View database contents
cat backend/data/games.json
cat backend/data/public_games.json

# Reset database (if needed)
rm backend/data/*.json
# Restart server to recreate files
```

### Game Not Found Error
- **Problem**: "Game not found" on different device
- **Solution**: Database is now persistent - games survive server restarts
- **Check**: Look for game ID in `backend/data/games.json`
- **Debug**: Check server logs for database read/write operations

## Game Storage Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Device A      │    │  Backend API    │    │   Device B      │
│                 │    │                 │    │                 │
│ ┌─────────────┐ │    │ ┌─────────────┐ │    │ ┌─────────────┐ │
│ │Local Storage│ │◄──►│ │ Game Server │ │◄──►│ │Local Storage│ │
│ └─────────────┘ │    │ └─────────────┘ │    │ └─────────────┘ │
│                 │    │                 │    │                 │
│ Creates Game    │    │ Coordinates     │    │ Joins Game      │
│                 │    │ & Validates     │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## API Endpoints

- `GET /health` - Health check
- `POST /api/games` - Create game
- `GET /api/games/:id` - Get game
- `PUT /api/games/:id` - Update game
- `DELETE /api/games/:id` - Delete game
- `GET /api/games` - List public games
- `POST /api/games/:id/join` - Join game
- `POST /api/games/:id/move` - Make move
- `GET /api/stats` - Server statistics

## Testing Cross-Device

1. **Start backend server** - Database files will be created automatically
2. **Open frontend on Computer** (Device A)
3. **Create a public game** with wager - Game saved to `backend/data/games.json`
4. **Open frontend on Phone** (Device B)
5. **Check public games lobby** - Should see the game from the database
6. **Join from Device B** - Game state updated in database
7. **Play moves alternating** between devices - All moves persist in database
8. **Restart server** - Games should still be there! 🎉

## Security Notes

- Backend validates all moves server-side
- Player authentication via wallet signatures
- Games auto-cleanup after 24 hours
- CORS configured for your domains only

## Next Steps

1. Deploy backend to production server
2. Update frontend environment variables
3. Test cross-device functionality
4. Share game URLs or IDs between devices
5. Enjoy seamless multiplayer gaming!

---

**Need Help?** Check the browser console for detailed error messages and connection status.

# 🚀 Cross-Device Setup Complete - MongoDB Atlas Connected!

## ✅ **PowerShell .env Configuration Complete**

Using Windows PowerShell commands, we successfully created the complete `.env` configuration file:

```powershell
# Remove old .env and create clean version
Remove-Item backend\.env

# Create complete .env with all necessary variables
"MONGODB_URI=mongodb+srv://jgrantrichards:7cvB2WZ9JznqGzx6@cluster0.cawkklo.mongodb.net/gorbagana-trash-tac-toe?retryWrites=true&w=majority&appName=Cluster0`nPORT=3001`nNODE_ENV=development`nCORS_ORIGINS=http://localhost:3000,https://your-app.netlify.app" | Out-File backend\.env -Encoding ASCII
```

## 📊 **Current Status: LIVE DATABASE CONNECTED**

**Backend Server**: ✅ Running on port 3001  
**Database**: ✅ **MongoDB Atlas** (`"storage":"mongodb"`)  
**Frontend**: ✅ Next.js with Backpack wallet only  
**Cross-Device**: ✅ **ENABLED** - Games persist across devices

## 🔧 **Environment Variables Set**

```bash
MONGODB_URI=mongodb+srv://jgrantrichards:...@cluster0.cawkklo.mongodb.net/gorbagana-trash-tac-toe?retryWrites=true&w=majority&appName=Cluster0
PORT=3001
NODE_ENV=development
CORS_ORIGINS=http://localhost:3000,https://your-app.netlify.app
```

## 🎮 **Game Features Now Available**

- **✅ Cross-Device Multiplayer**: Games saved to MongoDB Atlas cloud
- **✅ Real-time Sync**: Updates across all connected devices  
- **✅ Persistent Storage**: Games survive server restarts
- **✅ Public Game Sharing**: Share game URLs with friends
- **✅ Backpack Wallet Integration**: Simplified wallet setup

## 🌐 **API Endpoints Working**

- **Health Check**: `http://localhost:3001/health` ✅
- **Game Stats**: `http://localhost:3001/api/stats` ✅ 
- **Database**: MongoDB Atlas connection active ✅

## 🚀 **Running the Application**

```powershell
# Start both frontend and backend
npm run dev

# Check server status  
Invoke-WebRequest -Uri http://localhost:3001/health
```

## 🎯 **Next Steps for Production**

1. **Deploy Frontend**: Netlify deployment ready
2. **Environment Variables**: Add MONGODB_URI to Netlify
3. **Domain Setup**: Update CORS_ORIGINS with production URL
4. **SSL Certificates**: Automatic via Netlify

---

**🏆 Mission Accomplished**: Your Gorbagana Trash Tac Toe game now supports true cross-device multiplayer gaming with persistent cloud storage via MongoDB Atlas! 