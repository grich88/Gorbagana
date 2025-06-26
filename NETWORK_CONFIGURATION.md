# Network Configuration Guide

## Overview
This Trash-Tac-Toe application is designed to work with any Solana-compatible blockchain network. The network configuration can be easily changed to deploy on different networks including Gorbagana testnet/mainnet.

## Current Configuration
- **Network**: Solana Mainnet (for testing $GOR token detection)
- **RPC Endpoint**: `https://api.mainnet-beta.solana.com` (Official Solana RPC)
- **Purpose**: Verify where $GOR tokens actually exist
- **Features**: Retry logic, CORS-compatible, 15-second timeout protection

## Switching Networks

### To Change Network:
1. Open `frontend/src/components/WalletProvider.tsx`
2. Modify the `endpoint` variable on line ~12
3. Update the network display in `frontend/src/app/page.tsx` if needed
4. Rebuild and redeploy

### Available Network Options:

#### Solana Networks:
```typescript
// Solana Mainnet
const endpoint = 'https://api.mainnet-beta.solana.com';

// Solana Devnet  
const endpoint = 'https://api.devnet.solana.com';

// Solana Testnet
const endpoint = 'https://api.testnet.solana.com';
```

#### Gorbagana Networks:
```typescript
// Gorbagana Mainnet
const endpoint = 'https://gorchain.wstf.io';

// Gorbagana Testnet (if available)
const endpoint = 'https://testnet.gorchain.wstf.io';
```

#### Custom RPC:
```typescript
// Any custom Solana-compatible RPC
const endpoint = 'https://your-custom-rpc-endpoint.com';
```

## Network-Specific Considerations

### For Gorbagana Deployment:
1. Change RPC endpoint to Gorbagana
2. Verify $GOR token exists on that network
3. Users may need to manually add Gorbagana network to their wallets
4. Update UI text to reflect Gorbagana network

### For Production Deployment:
1. Choose appropriate network based on where $GOR tokens exist
2. Test token detection thoroughly on chosen network
3. Update documentation and UI to match network choice
4. Consider wallet compatibility with chosen network

## Token Configuration
The $GOR token address (`71Jvq4Epe2FCJ7JFSF7jLXdNk1Wy4Bhqd9iL6bEFELvg`) is configured in `frontend/src/app/page.tsx`. This should remain the same regardless of network, but verify the token exists on your chosen network.

## Deployment Process
After changing network configuration:

```bash
cd frontend
npm run build
npx netlify deploy --prod
```

## Architecture Benefits
- **Network Agnostic**: Works with any Solana-compatible blockchain
- **Easy Switching**: Single line change to switch networks
- **Flexible Deployment**: Ready for testnet, mainnet, or custom networks
- **Production Ready**: Designed for real blockchain deployment

## Current Status
The application is currently configured for Solana mainnet to test $GOR token detection. Once verified where tokens exist, the network can be easily switched for production deployment on the appropriate blockchain. 