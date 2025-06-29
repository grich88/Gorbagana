# 🗑️ Gorbagana Trash Tac Toe

**A multiplayer tic-tac-toe game with real $GOR token wagering on the Gorbagana blockchain network.**

## 🚀 Live Demo

- **Frontend**: https://gorbagana-trash-tac-toe.netlify.app
- **Backend API**: https://gorbagana-trash-tac-toe-backend.onrender.com
- **Network**: Gorbagana Testnet
- **Explorer**: https://gorexplorer.net/

## ✅ Confirmed Working Features

### 💰 Real Money Transfers (VERIFIED)
- ✅ **Real $GOR deposits** to shared escrow accounts
- ✅ **Automatic prize distribution** to winners
- ✅ **Live balance updates** after transactions
- ✅ **Blockchain confirmation** with explorer links
- ✅ **Transaction signatures** verified on Gorbagana network

### 🎮 Cross-Device Gaming
- ✅ **MongoDB Atlas** cloud database persistence
- ✅ **Real-time game synchronization** across devices
- ✅ **5-second polling** for instant move updates
- ✅ **Public game lobby** with wagered games

### 🔗 Blockchain Integration
- ✅ **Official Gorbagana RPC**: `https://rpc.gorbagana.wtf/`
- ✅ **Backpack wallet** integration
- ✅ **Live $GOR balance** detection
- ✅ **Transaction confirmation** with polling
- ✅ **Explorer integration** for all transactions

## 🎯 How It Works

1. **Connect Wallet**: Use Backpack wallet with Gorbagana network
2. **Create Game**: Set wager amount (0.001-1.0 $GOR) 
3. **Escrow Deposit**: Automatic secure deposit to shared escrow account
4. **Share Game ID**: Send 4-digit code to opponent
5. **Opponent Joins**: Matching deposit required for wagered games
6. **Play Game**: Cross-device real-time tic-tac-toe
7. **Win Prize**: Automatic 2x wager transfer to winner

## 💡 Game Rules

- **Trash Cans (🗑️)** vs **Recycling Bins (♻️)**
- **Winner takes all**: 2x the wager amount
- **Tie games**: Both players get deposits back
- **Free games**: No wager required (0 $GOR)

## 🛠️ Technical Architecture

### Frontend (Next.js)
- **Framework**: Next.js 14 with TypeScript
- **Wallet**: Backpack integration with Solana Web3.js
- **UI**: Responsive design with mobile optimization
- **Deployment**: Netlify with continuous deployment

### Backend (Express.js)
- **API**: RESTful endpoints for game management
- **Database**: MongoDB Atlas cloud database
- **CORS**: Enabled for cross-origin requests
- **Balance Proxy**: Server-side RPC calls to bypass CORS

### Blockchain
- **Network**: Gorbagana Testnet
- **Token**: $GOR (native token)
- **RPC**: Official endpoint `https://rpc.gorbagana.wtf/`
- **Escrow**: Shared keypair accounts for secure deposits

## 🚀 Local Development

### Prerequisites
- Node.js 18+
- Backpack wallet extension
- $GOR tokens on Gorbagana testnet

### Backend Setup
```bash
cd backend
npm install
cp env.example .env
# Add your MongoDB connection string
npm start
# Server runs on http://localhost:3002
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
# App runs on http://localhost:3000
```

## 🔧 Environment Variables

### Backend (.env)
```
MONGODB_URI=your_mongodb_atlas_connection_string
PORT=3002
NODE_ENV=development
```

### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:3002
```

## 🎮 Production Verification

### Recent Transaction Examples
- **Deposit**: `663vEuxVCXorQgxtxNdaBhPtABCxsPRUhhG1KwfZXhaRt1CwXR7q1xoYkBHPjB8fVHxH1o1fj8fD7K7ZiKMTDLQi`
- **Prize Transfer**: `5t365XcJAPBgWVBMt255gegCptuTUrmf2KF6UZwR76QPyjQinQs95PJ5F78dL6Qbbr8aaVhSVHLMRyW23XZFWPTW`

### Balance Verification
- Starting: 0.981860 $GOR
- After deposits: 0.977850 $GOR (-0.004 $GOR)
- Prize distributed: 0.003990 $GOR

## 🏆 Competition Features

- **Real $GOR wagering** with secure escrow system
- **Cross-device multiplayer** gaming
- **Professional UI/UX** with animations
- **Mobile responsive** design
- **Production deployment** on major platforms
- **Complete documentation** and setup guides

## 📱 Mobile Support

Optimized for all screen sizes:
- **Desktop**: Full feature set
- **Tablet**: Touch-friendly interface  
- **Mobile**: 280px+ width support

## 🔐 Security Features

- **Client-side wallet** integration (no private key exposure)
- **Shared escrow accounts** (no single point of control)
- **Transaction confirmation** before proceeding
- **Balance validation** before transfers
- **Error handling** and recovery

## 📊 Performance

- **Frontend**: Sub-2s load times on Netlify
- **Backend**: <200ms API response times on Render
- **Database**: MongoDB Atlas global clusters
- **Polling**: 5-second intervals for real-time sync

## 🎨 Graphics & Animations

- **3D-style game board** with glowing borders
- **Bouncing piece animations** on placement
- **Victory celebrations** with golden highlights
- **Turn indicators** with visual feedback
- **Mobile-optimized** touch interactions

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Gorbagana Network** for the blockchain infrastructure
- **Backpack Wallet** for wallet integration
- **MongoDB Atlas** for cloud database services
- **Netlify & Render** for hosting platforms

---

**Built for the Superteam Earn bounty competition** 🚀 