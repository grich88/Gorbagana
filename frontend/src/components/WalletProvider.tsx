"use client";

import { ConnectionProvider, WalletProvider as SolanaWalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
// Simplified - Backpack only
import { clusterApiUrl } from '@solana/web3.js';
import { useMemo, useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';

// ===================================================================
// GORBAGANA TESTNET CONFIGURATION
// ===================================================================
// 
// This application is built for the Superteam Earn bounty:
// "Build Multiplayer Mini-Games on Gorbagana Testnet"
// https://earn.superteam.fun/listing/build-simple-and-fun-dappsgames-on-gorbagana-testnet/
//
// Prize Pool: 5,100 USDC total
// Deadline: July 03, 2025
// ===================================================================

// RPC Endpoint configuration with fallbacks
const RPC_ENDPOINTS = [
  'https://testnet.gorchain.wstf.io', // Primary Gorbagana testnet
  'https://rpc.testnet.gorbagana.com', // Alternative Gorbagana RPC
  clusterApiUrl('devnet'), // Fallback to Solana devnet
  'https://api.devnet.solana.com', // Alternative devnet endpoint
];

// Test RPC endpoint connectivity
async function testRPCEndpoint(endpoint: string): Promise<boolean> {
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getHealth',
        params: []
      }),
      signal: AbortSignal.timeout(5000) // 5 second timeout
    });
    
    return response.ok;
  } catch (error) {
    console.warn(`RPC endpoint ${endpoint} failed:`, error);
    return false;
  }
}

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [workingEndpoint, setWorkingEndpoint] = useState<string>(RPC_ENDPOINTS[0]);
  const [isTestingRPC, setIsTestingRPC] = useState(true);

  // Test RPC endpoints on mount
  useEffect(() => {
    async function findWorkingEndpoint() {
      setIsTestingRPC(true);
      
      for (const endpoint of RPC_ENDPOINTS) {
        console.log(`🔍 Testing RPC endpoint: ${endpoint}`);
        const isWorking = await testRPCEndpoint(endpoint);
        
        if (isWorking) {
          console.log(`✅ Using RPC endpoint: ${endpoint}`);
          setWorkingEndpoint(endpoint);
          
          // Show which network we're connected to
          if (endpoint.includes('gorbagana') || endpoint.includes('gorchain')) {
            toast.success('🎒 Backpack + Gorbagana Testnet Ready');
          } else if (endpoint.includes('devnet') || endpoint.includes('solana')) {
            toast('🎒 Backpack + Solana Devnet (limited functionality)', {
              duration: 4000,
              icon: '🔄'
            });
          }
          
          setIsTestingRPC(false);
          return;
        }
      }
      
      // No endpoints working, use last resort
      console.error('❌ All RPC endpoints failed, using devnet as last resort');
      setWorkingEndpoint(clusterApiUrl('devnet'));
      toast.error('🚨 Network issues detected - using demo mode');
      setIsTestingRPC(false);
    }

    findWorkingEndpoint();
  }, []);

  // Empty wallets array - Backpack auto-detects
  const wallets = useMemo(() => [], []);

  if (isTestingRPC) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
          <p className="text-white">🔍 Finding best network connection...</p>
        </div>
      </div>
    );
  }

  return (
    <ConnectionProvider 
      endpoint={workingEndpoint}
      config={{
        commitment: 'confirmed',
        confirmTransactionInitialTimeout: 30000,
        wsEndpoint: undefined,
        disableRetryOnRateLimit: false,
        httpHeaders: {
          'Content-Type': 'application/json',
        }
      }}
    >
      <SolanaWalletProvider 
        wallets={wallets} 
        autoConnect={false}
        onError={(error) => {
          console.error('Wallet error:', error);
          // Handle specific wallet connection errors
          if (error.message.includes('User rejected')) {
            toast.error('Wallet connection rejected by user');
          } else if (error.message.includes('ethereum')) {
            toast.error('Multiple wallet extensions detected - disable others except Backpack');
          } else {
            toast.error('Backpack connection failed: ' + error.message);
          }
        }}
      >
        <WalletModalProvider>
          {children}
        </WalletModalProvider>
      </SolanaWalletProvider>
    </ConnectionProvider>
  );
} 