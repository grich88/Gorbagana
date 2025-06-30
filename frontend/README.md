# 🗑️ Trash-Tac-Toe Frontend | Next.js App

**Frontend React application for the Gorbagana blockchain gaming platform**

This is the Next.js frontend for Trash-Tac-Toe, featuring real-time multiplayer gameplay with $GOR token wagering on the Gorbagana blockchain.

## 🚀 Live Demo

**Production App**: [https://gorbagana-trash-tac-toe.netlify.app](https://gorbagana-trash-tac-toe.netlify.app)

## ✨ Frontend Features

### 🎮 User Interface
- **Responsive Design**: Mobile-first approach with touch optimization
- **Dark Gorbagana Theme**: Green accents with space-inspired aesthetics
- **Animated Game Board**: Bouncing pieces and victory animations
- **Real-time Updates**: 5-second polling for instant synchronization

### 🔗 Blockchain Integration
- **Backpack Wallet**: Seamless Gorbagana wallet connection
- **Real-time Balances**: Live $GOR balance updates
- **Transaction Tracking**: Explorer links for all blockchain transactions
- **Smart Escrow**: Automatic prize distribution system

### 🌐 Cross-Device Gaming
- **Game Sharing**: Shareable links and QR codes
- **Public Lobby**: Browse and join public wagered games
- **Local Storage**: Offline game state persistence
- **Backend Sync**: MongoDB synchronization for cross-device play

### 🧹 Storage Management
- **Automatic Cleanup**: Completed games removed after 30 seconds
- **Periodic Maintenance**: Hourly cleanup of old games
- **Storage Optimization**: Prevents localStorage bloat
- **Cache Busting**: Aggressive cache clearing for fresh data

## 🛠️ Technical Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript with strict type checking
- **Styling**: Tailwind CSS with custom components
- **Wallet**: Solana Wallet Adapter with Backpack support
- **State**: React hooks with localStorage persistence
- **HTTP**: Fetch API with automatic retries
- **Deployment**: Netlify with automatic deployments

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Backpack wallet extension
- $GOR tokens (for wagered games)

### Installation
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production  
npm run build

# Start production server
npm start
```

### Environment Variables
Create `.env.local` file:
```bash
NEXT_PUBLIC_API_URL=https://gorbagana-trash-tac-toe-backend.onrender.com
```

For local development:
```bash
NEXT_PUBLIC_API_URL=http://localhost:3002
```

## 📁 Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── globals.css        # Global styles and animations
│   ├── layout.tsx         # Root layout with providers
│   ├── page.tsx           # Main game interface
│   └── simple-game.tsx    # Core game component
├── components/            # Reusable components
│   ├── ClientOnly.tsx     # Hydration-safe wrapper
│   └── WalletProvider.tsx # Wallet context provider
└── lib/                   # Utility libraries
    └── gameStorage.ts     # Game storage management
```

## 🎨 Custom Styling

### Game Theme
- **Trash Cells**: Green glow with environmental styling
- **Recycle Cells**: Blue highlights with sustainability vibes
- **Victory Effects**: Golden pulse animations for winners
- **Empty Cells**: Subtle hover states with plus indicators

### Responsive Breakpoints
- **Mobile**: 320px - 768px (touch-optimized)
- **Tablet**: 768px - 1024px (hybrid interaction)
- **Desktop**: 1024px+ (full feature set)

### CSS Features
- **CSS Grid**: 3x3 game board layout
- **Animations**: Smooth transitions and bounce effects
- **Gradients**: Gorbagana-inspired color schemes
- **Shadows**: Depth and visual hierarchy

## 🔧 Key Components

### WalletProvider
```typescript
// Manages Gorbagana network connection
// Handles wallet conflicts and auto-detection
// Provides blockchain context to app
```

### SimpleGame
```typescript
// Main game logic and UI
// Real-time multiplayer synchronization  
// Escrow deposit and prize distribution
// Cross-device game state management
```

### GameStorage
```typescript
// Local and remote storage management
// Automatic cleanup and optimization
// Cross-device sync with MongoDB backend
// Fallback modes for offline play
```

## 🚀 Build & Deploy

### Development
```bash
npm run dev          # Start dev server
npm run lint         # Run ESLint
npm run type-check   # TypeScript validation
```

### Production
```bash
npm run build        # Create production build
npm run start        # Start production server
```

### Netlify Deployment
```bash
# Build settings
Build command: npm run build
Publish directory: .next
```

### Environment Setup
```bash
# Production environment variables
NEXT_PUBLIC_API_URL=https://gorbagana-trash-tac-toe-backend.onrender.com
```

## 🔍 Performance Optimizations

### Code Splitting
- **Dynamic Imports**: Components loaded on demand
- **Route-based Splitting**: Automatic Next.js optimization
- **Bundle Analysis**: Webpack bundle analyzer integration

### Caching Strategy
- **Static Assets**: CDN caching for images and fonts
- **API Responses**: Cache-busting for fresh game data
- **Service Worker**: Offline capability for core features

### React Optimizations
- **useCallback**: Memoized event handlers
- **useMemo**: Expensive computation caching
- **React.memo**: Component re-render prevention
- **Key Props**: Optimized list rendering

## 🐛 Debugging

### Development Tools
```bash
# Enable debug logging
localStorage.setItem('debug', 'true')

# Clear all game data
localStorage.clear()

# Check wallet connection
console.log(window.solana)

# View network requests
Network tab in DevTools
```

### Common Issues
- **Wallet not connecting**: Disable conflicting extensions
- **Games not syncing**: Check backend API status  
- **Slow loading**: Clear browser cache
- **Mobile issues**: Check viewport meta tag

## 🔐 Security Considerations

### Client-side Security
- **No Private Keys**: All keys handled by wallet extension
- **Input Validation**: Sanitized user inputs
- **XSS Protection**: React's built-in protections
- **HTTPS Only**: Secure communication protocols

### Wallet Integration
- **Permission-based**: User controls all transactions
- **Non-custodial**: No funds stored in application
- **Transparent**: All transactions visible on blockchain

## 📱 Mobile Experience

### Touch Interactions
- **Large Touch Targets**: Minimum 44px touch areas
- **Gesture Support**: Natural mobile interactions
- **Responsive Grid**: Optimal game board sizing
- **Haptic Feedback**: Vibration on game actions (where supported)

### Performance
- **Fast Loading**: Optimized for mobile networks
- **Battery Efficient**: Minimal background processing
- **Data Usage**: Compressed API responses

## 🎮 Game Features

### Real-time Updates
- **5-second Polling**: Automatic game state sync
- **Optimistic Updates**: Immediate UI feedback
- **Conflict Resolution**: Server state takes precedence
- **Offline Handling**: Graceful degradation

### Prize System
- **Automatic Escrow**: Secure fund management
- **Winner Detection**: Smart contract logic
- **Prize Distribution**: Automated payouts
- **Fee Calculation**: Dynamic blockchain fees

## 📊 Analytics & Monitoring

### Performance Metrics
- **Load Times**: Page and component loading
- **API Response**: Backend communication speed  
- **Transaction Times**: Blockchain confirmation
- **Error Rates**: Failed operations tracking

### User Experience
- **Conversion Funnel**: Game creation to completion
- **Engagement**: Session duration and interactions
- **Device Distribution**: Platform usage analytics
- **Geographic Data**: Regional performance

## 🤝 Contributing to Frontend

### Development Guidelines
1. Follow TypeScript strict mode
2. Use Tailwind for styling
3. Implement responsive design
4. Add loading states for async operations
5. Handle error conditions gracefully

### Testing
```bash
npm run test         # Unit tests
npm run test:e2e     # End-to-end tests
npm run test:coverage # Coverage report
```

### Pull Request Process
1. Create feature branch
2. Implement changes with tests
3. Update documentation
4. Submit PR with description
5. Address review feedback

---

**Built with ⚡ Next.js for the Gorbagana ecosystem**
