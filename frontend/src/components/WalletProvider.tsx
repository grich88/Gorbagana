"use client";

import { ConnectionProvider, WalletProvider as SolanaWalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
// Simplified - Backpack only
import { clusterApiUrl } from '@solana/web3.js';
import { useMemo, useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { Connection, PublicKey } from '@solana/web3.js';

// Gorbagana Testnet Configuration
// CACHE BUST v5.0 - ULTRA AGGRESSIVE - 2025-01-29 16:30
// CRITICAL FIX: Production was using cached version with wrong RPC endpoints
// This version MUST use gorchain.wstf.io NOT rpc.gorbagana.wtf
// DEPLOYMENT VERIFICATION: If you see rpc.gorbagana.wtf in console, cache is NOT cleared!

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
  const [isTestingRPC, setIsTestingRPC] = useState(true);

  // Prevent wallet extension conflicts
  useEffect(() => {
    // Give wallets time to initialize
    const timer = setTimeout(() => {
      // Check if there are conflicts and warn user
      if (typeof window !== 'undefined' && window.ethereum) {
        console.log('🔍 Multiple wallet extensions detected - Backpack preferred for Gorbagana');
        if (window.solana?.isBackpack) {
          console.log('✅ Backpack detected and ready for Gorbagana');
        }
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  // Test RPC endpoints on mount
  useEffect(() => {
    async function findWorkingEndpoint() {
      setIsTestingRPC(true);
      
      // For Gorbagana, always force the primary endpoint to avoid delays
      if (RPC_ENDPOINTS[0].includes('gorbagana') || RPC_ENDPOINTS[0].includes('gorchain')) {
        console.log(`🎯 Forcing Gorbagana endpoint: ${RPC_ENDPOINTS[0]} (bypassing health check)`);
        setWorkingEndpoint(RPC_ENDPOINTS[0]);
        // Don't show toast here to reduce noise
        setIsTestingRPC(false);
        return;
      }
      
      // For other endpoints, test connectivity
      for (const endpoint of RPC_ENDPOINTS) {
        console.log(`