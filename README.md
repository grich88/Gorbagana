# 🗑️ Trash-Tac-Toe ♻️ | Gorbagana Blockchain Gaming

**A revolutionary multiplayer tic-tac-toe game on the Gorbagana blockchain featuring real $GOR token wagers!**

![Trash-Tac-Toe Banner](https://img.shields.io/badge/Gorbagana-Blockchain%20Gaming-green) ![Status](https://img.shields.io/badge/Status-Production%20Ready-brightgreen) ![License](https://img.shields.io/badge/License-MIT-blue)

## 🌟 Features

### 🎮 Core Gameplay
- **Real-time Multiplayer**: Cross-device gameplay with automatic synchronization
- **Blockchain Integration**: Real $GOR token wagers on Gorbagana network
- **Smart Escrow System**: Automatic prize distribution with secure escrow accounts
- **Two Game Modes**: Free games and wagered games with real token rewards

### 💰 Token Economy
- **$GOR Token Wagers**: Bet real Gorbagana tokens on game outcomes
- **Automatic Prize Distribution**: Smart contract handles prize payouts
- **Winner Evolution**: "You won and have evolved to a dumptruck!" 🚛
- **Loser Message**: "🗑️ You're such trash, recycle yourself and try again! - Gorbagio"

### 🔧 Technical Features
- **Cross-Device Gaming**: Share game links or IDs to play with friends on any device
- **Public Game Lobby**: Join random public games with other players
- **Automatic Game Cleanup**: Completed games are automatically removed from storage
- **Periodic Maintenance**: Hourly cleanup of idle and abandoned games
- **Backpack Wallet Integration**: Optimized for Gorbagana's preferred wallet
- **Real-time Sync**: 5-second polling for instant game state updates

### 🛡️ Security & Reliability
- **Conflict Detection**: Automatic wallet extension conflict resolution
- **Abandoned Game Handling**: Refunds for inactive games after timeout
- **Transaction Retry Logic**: Robust blockchain transaction handling
- **Fee-Aware Transfers**: Smart fee calculation for reliable transactions

## 🚀 Live Demo

**Production App**: [https://gorbagana-trash-tac-toe.netlify.app](https://gorbagana-trash-tac-toe.netlify.app)

## 🎯 Game Rules

### Objective
Battle as **🗑️ Trash Cans** vs **♻️ Recycling Bins** in the ultimate environmental showdown!

### How to Play
1. **Connect Wallet**: Use Backpack wallet for optimal Gorbagana experience
2. **Create Game**: Set your wager amount (0.001+ $GOR) or play for free
3. **Share Game**: Send game ID or share link with opponent
4. **Play**: Take turns placing your symbol (Trash 🗑️ or Recycle ♻️)
5. **Win**: Get three in a row and claim the prize!

### Player Roles
- **Player X (Trash Cans 🗑️)**: Always goes first, represents chaos and disorder
- **Player O (Recycling Bins ♻️)**: Second player, represents order and environmental responsibility

### Winning Conditions
- **Three in a Row**: Horizontal, vertical, or diagonal
- **Winner Takes All**: Gets both players' wagers (minus network fees)
- **Tie Game**: Both players get their wagers refunded
- **Abandoned Game**: Automatic refunds after inactivity timeout

## 💻 Technical Setup

### Prerequisites
- **Node.js** (v18+)
- **npm** or **yarn**
- **Backpack Wallet** (recommended for Gorbagana)
- **$GOR Tokens** (for wagered games)

### Frontend Installation
```bash
# Clone the repository
git clone https://github.com/your-repo/gorbagana-trash-tac-toe.git
cd gorbagana-trash-tac-toe

# Install frontend dependencies
cd frontend
npm install

# Start development server
npm run dev
```

### Backend Installation
```bash
# Install backend dependencies  
cd backend
npm install

# Set up environment variables
cp env.example .env
# Edit .env with your MongoDB connection string

# Start backend server
npm start
```

### Environment Variables

**Frontend (.env.local)**:
```bash
NEXT_PUBLIC_API_URL=https://gorbagana-trash-tac-toe-backend.onrender.com
```

**Backend (.env)**:
```bash
MONGODB_URI=your_mongodb_connection_string
PORT=3002
CORS_ORIGIN=https://gorbagana-trash-tac-toe.netlify.app
```

## 🌐 Network Configuration

### Gorbagana Testnet
- **RPC Endpoint**: `https://rpc.gorbagana.wtf/`
- **Explorer**: [https://gorexplorer.net](https://gorexplorer.net)
- **Chain ID**: Gorbagana Testnet
- **Native Token**: $GOR

### Wallet Setup
1. Install [Backpack Wallet](https://backpack.app)
2. Create or import wallet
3. Connect to Gorbagana network
4. Get $GOR tokens from faucet or DEX

## 🏗️ Architecture

### Frontend (Next.js)
- **Framework**: Next.js 14 with TypeScript
- **Styling**: Tailwind CSS with custom game themes
- **Wallet Integration**: Solana Wallet Adapter with Backpack support
- **State Management**: React hooks with persistent storage
- **Deployment**: Netlify with automatic deployments

### Backend (Node.js)
- **Framework**: Express.js with TypeScript
- **Database**: MongoDB for game state persistence
- **API**: RESTful endpoints for game management
- **Deployment**: Render with auto-scaling

### Blockchain Integration
- **Network**: Gorbagana Testnet (Solana-compatible)
- **Token**: $GOR (native Gorbagana token)
- **Wallet**: Backpack (official Gorbagana wallet)
- **Transactions**: Direct token transfers with escrow system

## 📡 API Endpoints

### Game Management
```typescript
POST   /api/games              // Create new game
GET    /api/games/:id          // Get game by ID  
PUT    /api/games/:id/join     // Join existing game
POST   /api/games/:id/move     // Make a move
PUT    /api/games/:id/abandon  // Abandon game
GET    /api/games/public       // List public games
```

### System
```typescript
GET    /health                 // Health check
GET    /api/status             // System status
```

## 🎨 Game Themes

### Visual Design
- **Gorbagana-inspired**: Dark theme with green accents
- **Animated Icons**: Bouncing trash cans and recycling bins
- **Winning Effects**: Victory pulses and celebration animations
- **Responsive Design**: Mobile-first approach with touch optimization

### Custom Styling
- **Trash Cells**: Green glow with bounce animation
- **Recycle Cells**: Blue glow with environmental vibes  
- **Winning Cells**: Golden highlight with victory pulse
- **Empty Cells**: Subtle hover effects with plus indicators

## 🔧 Game Storage & Cleanup

### Storage System
- **Local Storage**: Browser localStorage for offline capability
- **Backend Sync**: MongoDB for cross-device persistence
- **Automatic Fallback**: Graceful degradation when backend unavailable

### Cleanup Features
- **Post-Game Cleanup**: Completed games removed 30 seconds after prize distribution
- **Periodic Cleanup**: Hourly maintenance removes old and abandoned games
- **Manual Cleanup**: "Play Again" and "New Game" buttons trigger immediate cleanup
- **Storage Optimization**: Prevents localStorage bloat and improves performance

## 🚨 Error Handling

### Wallet Conflicts
- **Detection**: Automatic identification of conflicting wallet extensions
- **Resolution**: Smart prioritization of Backpack wallet
- **User Guidance**: Clear instructions for resolving conflicts

### Network Issues
- **Retry Logic**: Automatic transaction retries with exponential backoff
- **Timeout Handling**: Graceful handling of network timeouts
- **Fallback Modes**: Local gameplay when backend unavailable

### Transaction Failures
- **Fee Calculation**: Dynamic fee estimation for reliable transactions
- **Balance Checks**: Pre-transaction validation
- **Error Messages**: Clear, actionable error descriptions

## 📊 Performance Features

### Optimization
- **Aggressive Caching**: Strategic cache busting for fresh data
- **Parallel API Calls**: Simultaneous data fetching where possible
- **Lazy Loading**: Components loaded on demand
- **Minimal Re-renders**: Optimized React hooks and dependencies

### Monitoring
- **Console Logging**: Detailed debug information for development
- **Transaction Tracking**: Full blockchain transaction logging
- **Performance Metrics**: Load times and response tracking

## 🔐 Security

### Wallet Security
- **No Private Key Storage**: Wallet extensions handle all private keys
- **Secure Transactions**: All transactions signed by user wallet
- **Escrow Protection**: Funds held in secure escrow accounts

### Data Protection
- **No Sensitive Storage**: No private data stored in localStorage
- **HTTPS Only**: All communications encrypted
- **Input Validation**: All user inputs validated and sanitized

## 🐛 Troubleshooting

### Common Issues

**Game Not Loading**
```bash
# Clear browser cache and localStorage
localStorage.clear()
# Refresh page
```

**Wallet Connection Issues**
```bash
# Disable other wallet extensions
# Use only Backpack wallet
# Refresh page and reconnect
```

**Transaction Failures**
```bash
# Check $GOR balance
# Ensure sufficient funds for gas fees  
# Try again after network confirmation
```

**Game Sync Issues**
```bash
# Check internet connection
# Verify backend API status
# Use local mode if needed
```

## 🤝 Contributing

### Development Workflow
1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

### Code Standards
- **TypeScript**: Strict type checking enabled
- **ESLint**: Airbnb configuration with custom rules
- **Prettier**: Automated code formatting
- **Testing**: Jest for unit tests, Cypress for e2e

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Gorbagana Team**: For the innovative blockchain platform
- **Backpack Wallet**: For seamless wallet integration  
- **Solana Foundation**: For the underlying blockchain technology
- **Community**: For testing and feedback

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/your-repo/issues)
- **Discord**: [Gorbagana Community](https://discord.gg/gorbagana)
- **Email**: support@gorbagana.wtf

---

**Built with 💚 for the Gorbagana ecosystem**

*"In the cosmic dance of digital debris, only the strongest trash survives to become... a dumptruck!"* - Gorbagio 