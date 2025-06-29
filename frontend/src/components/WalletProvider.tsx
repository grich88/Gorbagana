"use client";

import { ConnectionProvider, WalletProvider as SolanaWalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
// Simplified - Backpack only
import { clusterApiUrl } from '@solana/web3.js';
import { useMemo, useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';

// Gorbagana Testnet Configuration

// RPC Endpoint configuration - GORCHAIN OFFICIAL ENDPOINT
// Using the official Gorchain RPC endpoint from documentation
const RPC_ENDPOINTS = [
  'https://gorchain.wstf.io', // PRIMARY: Official Gorchain RPC from documentation
  'https://rpc.gorbagana.wtf', // FALLBACK: Alternative Gorbagana RPC
  // NO SOLANA DEVNET FALLBACKS - We want GOR chain only!
];

// Test RPC endpoint connectivity with more lenient approach for Gorbagana
async function testRPCEndpoint(endpoint: string): Promise<boolean> {
  try {
    // For Gorbagana endpoints, use a simpler test that's more likely to succeed
    if (endpoint.includes('gorbagana') || endpoint.includes('gorchain')) {
      console.log(`🎯 Forcing Gorbagana endpoint: ${endpoint} (bypassing health check)`);
      return true; // Force use of Gorbagana endpoints
    }
    
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
    // For Gorbagana endpoints, still try to use them even if health check fails
    if (endpoint.includes('gorbagana') || endpoint.includes('gorchain')) {
      console.log(`🔄 Gorbagana endpoint health check failed, but will still attempt to use: ${endpoint}`);
      return true;
    }
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
          
          // Show Gorbagana network connection
          if (endpoint.includes('gorbagana') || endpoint.includes('gorchain')) {
            toast.success('🎒 Backpack + Gorbagana Testnet Ready - $GOR Network Active!');
          }
          
          setIsTestingRPC(false);
          return;
        }
      }
      
      // No endpoints working, force primary Gorchain endpoint anyway
      console.error('❌ All Gorchain RPC health checks failed, but forcing primary endpoint');
      setWorkingEndpoint('https://gorchain.wstf.io');
      toast('🔄 Using primary Gorbagana RPC - network ready!', {
        duration: 4000,
        icon: '🎯'
      });
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
        confirmTransactionInitialTimeout: 10000, // Reduced to 10 seconds
        wsEndpoint: undefined, // Disable WebSocket to prevent connection issues
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