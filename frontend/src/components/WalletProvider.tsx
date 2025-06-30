"use client";

import { ConnectionProvider, WalletProvider as SolanaWalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
// Simplified - Backpack only
import { clusterApiUrl } from '@solana/web3.js';
import { useMemo, useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { Connection, PublicKey } from '@solana/web3.js';

// Gorbagana Testnet Configuration
// CACHE BUST v6.3 - OFFICIAL RPC ENDPOINT - 2025-01-29 18:00
// CRITICAL FIX: Now using official https://rpc.gorbagana.wtf/ per user documentation
// DEPLOYMENT VERIFICATION: Console should show rpc.gorbagana.wtf (the CORRECT endpoint)

// RPC Endpoint configuration - UPDATED WITH OFFICIAL GORBAGANA ENDPOINTS
// Based on official Gorbagana documentation: https://rpc.gorbagana.wtf/
// CRITICAL FIX: Was using gorchain.wstf.io but official docs specify rpc.gorbagana.wtf
// USER CORRECTION: Official RPC endpoint is https://rpc.gorbagana.wtf/ per documentation
const RPC_ENDPOINTS = [
  'https://rpc.gorbagana.wtf/', // PRIMARY: Official Gorbagana RPC (from official docs) - CORRECTED
  'https://api.devnet.solana.com', // FALLBACK: Solana devnet for testing only if Gorbagana unavailable
];

// CACHE VERIFICATION: Console should show rpc.gorbagana.wtf (the CORRECT endpoint)
const DEPLOYMENT_TIMESTAMP = '🔥 PRODUCTION-v6.3-OFFICIAL-RPC-2025-01-29-18:00:00 🔥';
const CACHE_BUST_ID = 'OFFICIAL-GORBAGANA-RPC-v6.3-' + Date.now();
console.log('🔥🔥🔥 PRODUCTION v6.3 - OFFICIAL RPC ENDPOINTS LOADED:', RPC_ENDPOINTS[0]);
console.log('✅✅✅ VERIFICATION: Using OFFICIAL https://rpc.gorbagana.wtf/ per documentation');
console.log('⏰⏰⏰ DEPLOYMENT TIMESTAMP:', DEPLOYMENT_TIMESTAMP);
console.log('🎯🎯🎯 CACHE BUST ID:', CACHE_BUST_ID);
console.log('🚨🚨🚨 CORRECTED: Now using official RPC endpoint from Gorbagana docs');
console.log('🔍🔍🔍 Official RPC: https://rpc.gorbagana.wtf/ (per user documentation)');

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
  const [isTestingRPC, setIsTestingRPC] = useState(false);

  // Prevent wallet extension conflicts
  useEffect(() => {
    // CRITICAL FIX: Prevent multiple wallet conflicts that break game joining
    const preventWalletConflicts = () => {
      if (typeof window === 'undefined') return;
      
      // Store reference to Backpack before other wallets override it
      const originalSolana = window.solana;
      const backpackWallet = window.solana?.isBackpack ? window.solana : null;
      
      // AGGRESSIVE FIX: Disable Ethereum wallets for Gorbagana
      if (window.ethereum) {
        // CRITICAL FIX: Check if this is Backpack's ethereum interface first
        const isBackpackEthereum = window.ethereum.isBackpack;
        
        if (isBackpackEthereum) {
          console.log('✅ Backpack ethereum interface detected - no conflicts to resolve');
        } else {
          console.log('⚠️ Non-Backpack ethereum wallet detected - potential conflict for escrow transactions');
          
          // Don't delete window.ethereum completely as it breaks some extension detection
          // Instead, create a warning flag
          (window as any).__ethereumConflictWarning = true;
        }
      }
      
      // Ensure Backpack remains accessible even if other wallets override
      if (backpackWallet) {
        // Force Backpack to be the primary Solana wallet
        Object.defineProperty(window, 'solana', {
          value: backpackWallet,
          writable: false,
          configurable: false
        });
        console.log('✅ Backpack wallet prioritized for Gorbagana');
      }
      
      // FIXED: Only try to lock ethereum property if it's NOT Backpack's
      if (window.ethereum && !window.ethereum.isBackpack) {
        try {
          // Make window.ethereum non-configurable to prevent conflicts
          const originalEthereum = window.ethereum;
          Object.defineProperty(window, 'ethereum', {
            value: originalEthereum,
            writable: false,
            configurable: false
          });
          console.log('🔒 Non-Backpack ethereum property locked to prevent conflicts');
        } catch (error) {
          console.warn('Could not lock ethereum property:', error);
          (window as any).__ethereumConflictWarning = true;
        }
      } else if (window.ethereum && window.ethereum.isBackpack) {
        console.log('ℹ️ Backpack ethereum interface detected - no locking needed');
      }
    };
    
    // Run immediately and after a delay to catch late-loading extensions
    preventWalletConflicts();
    const timer = setTimeout(preventWalletConflicts, 3000);
    
    // Check for wallet conflicts and provide user guidance
    const checkWalletConflicts = () => {
      // DETAILED DEBUGGING: Show exactly what's in window.ethereum
      console.log('🔍 DETAILED WALLET PROVIDER DETECTION:');
      console.log('window.ethereum:', window.ethereum);
      console.log('window.ethereum keys:', window.ethereum ? Object.keys(window.ethereum) : 'none');
      console.log('window.ethereum.isMetaMask:', window.ethereum?.isMetaMask);
      console.log('window.ethereum.isBackpack:', window.ethereum?.isBackpack);
      console.log('window.ethereum.request type:', typeof window.ethereum?.request);
      console.log('window.solana:', window.solana);
      console.log('window.solana keys:', window.solana ? Object.keys(window.solana) : 'none');
      console.log('window.solana.isBackpack:', window.solana?.isBackpack);
      console.log('window.solana.isPhantom:', window.solana?.isPhantom);
      
      const extensions = [];
      
      // FIXED: Smart detection that understands Backpack's dual interfaces
      const hasMetaMask = window.ethereum?.isMetaMask;
      const hasBackpackEthereum = window.ethereum?.isBackpack;
      const hasBackpackSolana = window.solana?.isBackpack;
      const hasPhantom = window.solana?.isPhantom;
      
      // CRITICAL: Detect if this is Backpack providing both interfaces
      const isBackpackProvidingBothInterfaces = hasBackpackEthereum && hasPhantom && !hasBackpackSolana;
      
      // More accurate detection - check if wallets are actually active
      if (window.ethereum && typeof window.ethereum.request === 'function') {
        if (hasMetaMask) {
          extensions.push('Active MetaMask wallet');
        } else if (hasBackpackEthereum) {
          extensions.push('Backpack (Ethereum interface)');
        } else {
          extensions.push('Active Ethereum wallet (unknown)');
        }
      }
      
      if (window.solana) {
        if (hasBackpackSolana) {
          extensions.push('Backpack (Solana interface)');
        } else if (hasPhantom && !isBackpackProvidingBothInterfaces) {
          // Only flag as separate Phantom if it's not Backpack's interface
          extensions.push('Phantom wallet');
        } else if (isBackpackProvidingBothInterfaces) {
          extensions.push('Backpack (Solana interface via dual-provider)');
        } else {
          extensions.push('Other Solana wallet');
        }
      }
      
      console.log('🔍 Detected wallet extensions:', extensions);
      
      // Only warn about REAL conflicts (not Backpack's legitimate dual interfaces)
      const hasActiveEthereum = window.ethereum && typeof window.ethereum.request === 'function';
      const hasAnyBackpack = hasBackpackEthereum || hasBackpackSolana || isBackpackProvidingBothInterfaces;
      const hasRealPhantom = hasPhantom && !isBackpackProvidingBothInterfaces;
      
      console.log('🔍 WALLET STATUS FLAGS:', {
        hasActiveEthereum,
        hasMetaMask,
        hasBackpackEthereum,
        hasBackpackSolana,
        hasPhantom,
        hasAnyBackpack,
        hasRealPhantom,
        isBackpackProvidingBothInterfaces,
        shouldWarn: (hasMetaMask && hasAnyBackpack) || (hasRealPhantom && hasAnyBackpack)
      });
      
      // Only warn about actual conflicts
      if ((hasMetaMask && hasAnyBackpack) || (hasRealPhantom && hasAnyBackpack)) {
        console.warn('⚠️ Active wallet conflicts detected - this may cause transaction issues');
        console.log('💡 For best experience with Gorbagana, disable conflicting wallets and use only Backpack');
        
        // Show specific guidance for fixing conflicts
        if (hasMetaMask && hasAnyBackpack) {
          console.log('🔧 To fix conflicts: Disable MetaMask extension completely in browser settings');
        }
        if (hasRealPhantom && hasAnyBackpack) {
          console.log('🔧 To fix conflicts: Disable Phantom wallet and use only Backpack');
        }
        console.log('🎯 Keep only Backpack enabled for Gorbagana');
      }
      
      if (hasAnyBackpack) {
        console.log('✅ Backpack detected and ready for Gorbagana');
        if (isBackpackProvidingBothInterfaces) {
          console.log('ℹ️ Backpack is providing both Ethereum and Solana interfaces (normal behavior)');
        }
      } else if (window.solana) {
        console.warn('⚠️ Non-Backpack Solana wallet detected - please use Backpack for best Gorbagana support');
      } else {
        console.warn('⚠️ No Solana wallet detected - please install Backpack for Gorbagana support');
      }
    };

    setTimeout(checkWalletConflicts, 2000);
    return () => clearTimeout(timer);
  }, []);

  // Initialize with primary Gorbagana endpoint
  useEffect(() => {
    console.log(`🎯 Using Gorbagana endpoint: ${RPC_ENDPOINTS[0]} (official endpoint)`);
    setWorkingEndpoint(RPC_ENDPOINTS[0]);
    setIsTestingRPC(false);
  }, []);

  // Empty wallets array - Backpack auto-detects
  const wallets = useMemo(() => [], []);

  if (isTestingRPC) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
          <p className="text-white">🔍 Connecting to Gorbagana network...</p>
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