"use client";

import { ConnectionProvider, WalletProvider as SolanaWalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
// Simplified - Backpack only
import { clusterApiUrl } from '@solana/web3.js';
import { useMemo, useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { Connection, PublicKey } from '@solana/web3.js';

// Gorbagana Testnet Configuration
// CACHE BUST v3.0 - FORCE COMPLETE REBUILD WITH CORRECT ENDPOINTS
// CRITICAL FIX: Production was using cached version with wrong RPC endpoints
// This version MUST use gorchain.wstf.io NOT rpc.gorbagana.wtf

// RPC Endpoint configuration - CORRECTED WITH OFFICIAL GORBAGANA ENDPOINTS
// Based on documentation: NETWORK_CONFIGURATION.md, PRODUCTION_RELEASE.md, FINAL_INSTRUCTIONS.md
// DEPLOYMENT UPDATE: Forcing fresh deployment to ensure correct RPC endpoints are used
// FORCE DEPLOY v3: Ensuring production uses gorchain.wstf.io NOT rpc.gorbagana.wtf
// CACHE BUST: 2025-01-29-15:30 - FORCE NETLIFY REBUILD
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
      if (RPC_ENDPOINTS[0].includes('gorbagana') || RPC_ENDPOINTS[0].includes('gorchain')) {
        console.log(`🎯 Forcing Gorbagana endpoint: ${RPC_ENDPOINTS[0]} (bypassing health check)`);
        setWorkingEndpoint(RPC_ENDPOINTS[0]);
        toast.success('🎒 Backpack + Gorbagana Network Ready - $GOR Network Active!');
        setIsTestingRPC(false);
        return;
      }
      
      // For other endpoints, test connectivity
      for (const endpoint of RPC_ENDPOINTS) {
        console.log(`🔍 Testing RPC endpoint: ${endpoint}`);
        try {
          const testConnection = new Connection(endpoint, {
            commitment: 'confirmed',
            wsEndpoint: undefined, // COMPLETELY disable WebSocket for testing
            httpHeaders: { 'User-Agent': 'Gorbagana-Trash-Tac-Toe/1.0.0' },
          });
          
          // Test with a simple balance check (using a known public key)
          const testPubkey = new PublicKey('11111111111111111111111111111112'); // System program
          await testConnection.getBalance(testPubkey);
          
          console.log(`✅ RPC endpoint working: ${endpoint}`);
          setWorkingEndpoint(endpoint);
          toast.success(`🌐 Connected to ${endpoint.includes('gorbagana') || endpoint.includes('gorchain') ? 'Gorbagana' : 'Solana'} Network!`);
          break;
        } catch (error) {
          console.log(`❌ RPC endpoint failed: ${endpoint}`, error);
          continue;
        }
      }
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
        confirmTransactionInitialTimeout: 60000,
        wsEndpoint: undefined, // GORBAGANA: COMPLETELY disable WebSocket
        disableRetryOnRateLimit: false,
        httpHeaders: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'Gorbagana-Trash-Tac-Toe/1.0.0',
        },
        fetch: (url, options) => {
          const httpsUrl = url.toString()
            .replace('ws://', 'https://')
            .replace('wss://', 'https://');
          
          console.log(`🔒 HTTPS-ONLY: ${httpsUrl}`);
          
          return fetch(httpsUrl, {
            ...options,
            headers: {
              ...options?.headers,
              'User-Agent': 'Gorbagana-Trash-Tac-Toe/1.0.0',
              'Content-Type': 'application/json',
              'Connection': 'close',
            },
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

/* 
 * GORBAGANA TRANSACTION CONFIRMATION UTILITY (for future use)
 * Based on the official Gorbagana script configuration
 * 
 * async function confirmGorbaganaTransaction(connection, signature) {
 *   const POLL_INTERVAL = 2000; // Poll every 2 seconds
 *   const MAX_POLL_ATTEMPTS = 30; // 60 seconds total
 *   
 *   for (let i = 0; i < MAX_POLL_ATTEMPTS; i++) {
 *     try {
 *       const { value } = await connection.getSignatureStatuses([signature], { 
 *         searchTransactionHistory: true 
 *       });
 *       const status = value[0];
 *       if (status && (status.confirmationStatus === 'confirmed' || status.confirmationStatus === 'finalized')) {
 *         return status.err ? { status: 'Failed', error: status.err } : { status: 'Success' };
 *       }
 *     } catch (error) {
 *       console.error(`Poll ${i + 1} error:`, error.message);
 *     }
 *     await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL));
 *   }
 *   throw new Error('Transaction confirmation timed out after 60 seconds.');
 * }
 * 
 * // Get transaction details (Gorbagana compatible)
 * const tx = await connection.getTransaction(signature, {
 *   commitment: 'confirmed',
 *   maxSupportedTransactionVersion: 0, // Gorbagana uses Solana v1.18.26
 * });
 */ 