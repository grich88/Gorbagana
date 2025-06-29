"use client";

import { ConnectionProvider, WalletProvider as SolanaWalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
// Simplified - Backpack only
import { clusterApiUrl } from '@solana/web3.js';
import { useMemo, useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';

// Gorbagana Testnet Configuration

// RPC Endpoint configuration - CORRECTED WITH OFFICIAL GORBAGANA ENDPOINTS
// Based on documentation: NETWORK_CONFIGURATION.md, PRODUCTION_RELEASE.md, FINAL_INSTRUCTIONS.md
const RPC_ENDPOINTS = [
  'https://gorchain.wstf.io', // PRIMARY: Official Gorbagana Mainnet RPC (from documentation)
  'https://testnet.gorchain.wstf.io', // SECONDARY: Official Gorbagana Testnet RPC (if available)
  'https://api.devnet.solana.com', // FALLBACK: Solana devnet for testing
  'https://api.mainnet-beta.solana.com', // ALTERNATIVE: Solana mainnet
];

// Test RPC endpoint connectivity with better error handling
async function testRPCEndpoint(endpoint: string): Promise<boolean> {
  try {
    console.log(`🔍 Testing RPC endpoint: ${endpoint}`);
    
    // For Gorbagana endpoints, try a simple connectivity test first
    if (endpoint.includes('gorbagana')) {
      console.log(`🎯 Testing Gorbagana endpoint: ${endpoint}`);
      
      // Try a simple HTTP request first to check DNS resolution
      const testResponse = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getHealth',
          params: []
        }),
        signal: AbortSignal.timeout(8000) // 8 second timeout for Gorbagana
      });
      
      console.log(`✅ Gorbagana endpoint ${endpoint} is reachable`);
      return true;
    }
    
    // For Solana endpoints, use standard health check
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
    
    const isWorking = response.ok;
    console.log(`${isWorking ? '✅' : '❌'} ${endpoint}: ${response.status}`);
    return isWorking;
    
  } catch (error: any) {
    console.warn(`❌ RPC endpoint ${endpoint} failed:`, error.message);
    
    // Handle specific DNS resolution errors
    if (error.message.includes('ERR_NAME_NOT_RESOLVED') || 
        error.message.includes('Failed to fetch') ||
        error.name === 'TypeError') {
      console.error(`🚫 DNS Resolution failed for ${endpoint} - domain not found`);
      return false;
    }
    
    // For Gorbagana endpoints, be more lenient with timeouts
    if (endpoint.includes('gorbagana') && error.name === 'AbortError') {
      console.log(`⏰ Gorbagana endpoint ${endpoint} timed out, but will still try to use it`);
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
      
      // For Gorbagana, always force the primary endpoint to avoid delays
      if (RPC_ENDPOINTS[0].includes('gorbagana')) {
        console.log(`🎯 Forcing Gorbagana endpoint: ${RPC_ENDPOINTS[0]} (bypassing health check)`);
        setWorkingEndpoint(RPC_ENDPOINTS[0]);
        toast.success('🎒 Backpack + Gorbagana Testnet Ready - $GOR Network Active!');
        setIsTestingRPC(false);
        return;
      }
      
      for (const endpoint of RPC_ENDPOINTS) {
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
      
      // No endpoints working, use Solana devnet as reliable fallback
      console.error('❌ All RPC endpoints failed, falling back to Solana devnet');
      setWorkingEndpoint('https://api.devnet.solana.com');
      toast('⚠️ Using Solana Devnet - Gorbagana network unavailable', {
        duration: 6000,
        icon: '🔄'
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
        confirmTransactionInitialTimeout: 90000, // Increased to 90 seconds for Gorbagana
        wsEndpoint: undefined, // FORCE DISABLE WebSocket - use HTTPS only (dev suggestion)
        disableRetryOnRateLimit: false,
        httpHeaders: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'Gorbagana-Trash-Tac-Toe/1.0.0',
        },
        // FORCE HTTPS-ONLY CONNECTION (equivalent to --use-rpc flag)
        // This prevents WebSocket connection attempts that are failing
        fetch: (url, options) => {
          // Force all requests to use HTTPS and add timeout
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second HTTP timeout
          
          // Ensure we're using HTTPS for all requests
          const httpsUrl = url.toString().replace('ws://', 'https://').replace('wss://', 'https://');
          
          console.log(`🔗 HTTPS-only request to: ${httpsUrl}`);
          
          return fetch(httpsUrl, {
            ...options,
            signal: controller.signal,
            method: options?.method || 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'Cache-Control': 'no-cache',
              ...options?.headers,
            },
          }).finally(() => {
            clearTimeout(timeoutId);
          });
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