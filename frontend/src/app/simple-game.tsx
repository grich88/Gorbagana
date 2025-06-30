"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { toast } from 'react-hot-toast';
import { LAMPORTS_PER_SOL, PublicKey, Connection, Transaction, SystemProgram, Keypair } from '@solana/web3.js';
import { Hash, Clock, Plus, Eye, Users, Trophy } from 'lucide-react';

// Game types
type GameStatus = "waiting" | "playing" | "finished" | "abandoned";

interface Game {
  id: string;
  playerX: string;
  playerO?: string;
  board: number[];
  currentTurn: number;
  status: GameStatus;
  winner?: number | null;
  createdAt: number;
  wager: number;
  isPublic: boolean;
  creatorName?: string;
  escrowAccount?: string;
  txSignature?: string;
  playerXDeposit?: string;
  playerODeposit?: string;
  updatedAt?: number;
  abandonReason?: string;
}

// API Configuration
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://gorbagana-trash-tac-toe-backend.onrender.com'
  : 'http://localhost:3002';

// Gorbagana Connection Configuration (matches user's script)
const GORBAGANA_RPC = 'https://rpc.gorbagana.wtf/';
const POLL_INTERVAL = 2000; // Poll every 2 seconds
const MAX_POLL_ATTEMPTS = 30; // 60 seconds total
const SEND_RETRIES = 5; // Retry sending up to 5 times

console.log('🔍 Testing backend connection:', API_BASE_URL + '/health');

export default function SimpleGame() {
  const wallet = useWallet();
  const { connection } = useConnection();
  const [game, setGame] = useState<Game | null>(null);
  const [gameId, setGameId] = useState<string>("");
  const [wagerInput, setWagerInput] = useState<string>("0.001");
  const [loading, setLoading] = useState(false);
  const [gorBalance, setGorBalance] = useState<number>(0);
  const [isConnected, setIsConnected] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [escrowAccount, setEscrowAccount] = useState<Keypair | null>(null);
  
  // Public games functionality
  const [showPublicLobby, setShowPublicLobby] = useState(false);
  const [publicGames, setPublicGames] = useState<Game[]>([]);
  const [makeGamePublic, setMakeGamePublic] = useState(true); // New: Public/Private toggle
  const [walletConflictDetected, setWalletConflictDetected] = useState(false);

  // Create Gorbagana connection (backup if useConnection doesn't work)
  const gorbaganaConnection = new Connection('https://rpc.gorbagana.wtf/', 'confirmed');

  // Helper function to confirm transaction via polling (from user's script)
  const confirmTransaction = async (signature: string): Promise<{status: string, error?: any}> => {
    console.log('🔄 Polling for transaction confirmation...');
    for (let i = 0; i < MAX_POLL_ATTEMPTS; i++) {
      try {
        const { value } = await connection.getSignatureStatuses([signature], { searchTransactionHistory: true });
        const status = value[0];
        if (status) {
          if (status.confirmationStatus === 'confirmed' || status.confirmationStatus === 'finalized') {
            console.log(`✅ Transaction confirmed after ${i + 1} polls!`);
            return status.err ? { status: 'Failed', error: status.err } : { status: 'Success' };
          }
          console.log(`🔄 Poll ${i + 1}/${MAX_POLL_ATTEMPTS}: Transaction not yet confirmed...`);
        } else {
          console.log(`🔄 Poll ${i + 1}/${MAX_POLL_ATTEMPTS}: Transaction status not found...`);
        }
      } catch (error: any) {
        console.error(`❌ Poll ${i + 1} error:`, error.message);
      }
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL));
    }
    throw new Error('Transaction confirmation timed out after 60 seconds.');
  };

  // Create shared escrow account and deposit wager (real $GOR transaction)
  const createEscrowDeposit = async (wagerAmount: number, gameId: string, isCreator: boolean = true, existingEscrowAccount?: string): Promise<{escrowAccount: string, txSignature: string}> => {
    console.log(`\n=== Starting Escrow Deposit for ${wagerAmount.toFixed(6)} $GOR ===`);
    console.log('🔍 Wallet state:', {
      connected: wallet.connected,
      publicKey: wallet.publicKey?.toString(),
      signTransaction: !!wallet.signTransaction,
      wallet: wallet.wallet?.adapter?.name
    });

    // CRITICAL FIX: Check for wallet conflicts that break transactions
    if (typeof window !== 'undefined' && (window as any).__ethereumConflictWarning) {
      console.warn('⚠️ Ethereum wallet conflict detected - this may cause transaction failures');
      toast.error('🔧 Wallet conflict detected! Please disable MetaMask/Ethereum wallets and use only Backpack for Gorbagana', { duration: 8000 });
    }

    if (!wallet.connected) {
      throw new Error("❌ Wallet is not connected. Please connect your Backpack wallet first.");
    }

    if (!wallet.publicKey) {
      throw new Error("❌ Wallet public key not available. Please reconnect your wallet.");
    }

    if (!wallet.signTransaction) {
      throw new Error("❌ Wallet doesn't support transaction signing. Use Backpack wallet.");
    }

    if (wagerAmount <= 0) {
      throw new Error("❌ Wager amount must be greater than 0");
    }

    // FIXED: Check if this is Backpack wallet using correct detection
    // Backpack provides ethereum interface (isBackpack=true) and solana interface (isPhantom=true due to misreporting)
    const isBackpackEthereum = window.ethereum?.isBackpack;
    const isBackpackSolana = window.solana?.isBackpack;
    const walletAdapterName = wallet.wallet?.adapter?.name;
    
    // Consider it Backpack if ANY of these are true
    const isBackpack = isBackpackEthereum || isBackpackSolana || walletAdapterName?.includes('Backpack');
    
    if (!isBackpack) {
      console.warn('⚠️ Non-Backpack wallet detected - this may cause issues on Gorbagana');
      toast('⚠️ For best Gorbagana support, please use Backpack wallet', { duration: 5000, icon: '⚠️' });
    } else {
      console.log('✅ Backpack wallet confirmed - optimal for Gorbagana');
    }

    console.log(`\n=== Creating Escrow Deposit for ${wagerAmount.toFixed(6)} $GOR ===`);

    try {
      let escrowKeypair: Keypair;
      let escrowPubkey: PublicKey;
      
      if (isCreator) {
        // Game creator generates the shared escrow account
        escrowKeypair = Keypair.generate();
        escrowPubkey = escrowKeypair.publicKey;
        console.log('🔑 NEW Shared Escrow Account:', escrowPubkey.toBase58());
        setEscrowAccount(escrowKeypair); // Store for prize distribution
      } else {
        // Player O deposits to existing escrow account from game data
        const escrowAccountToUse = existingEscrowAccount || game?.escrowAccount;
        if (!escrowAccountToUse) {
          console.error('❌ Game state:', JSON.stringify(game, null, 2));
          console.error('❌ Provided escrow account:', existingEscrowAccount);
          throw new Error("Cannot find shared escrow account - game creator must deposit first");
        }
        try {
          escrowPubkey = new PublicKey(escrowAccountToUse);
          console.log('🔑 EXISTING Shared Escrow Account:', escrowPubkey.toBase58());
        } catch (keyError) {
          console.error('❌ Invalid escrow account key:', escrowAccountToUse);
          throw new Error("Invalid shared escrow account format");
        }
        // Note: Player O doesn't have the escrow private key, only the creator does
        // Prize distribution will be handled by the creator's stored escrow account
      }
      
      console.log('👤 Player:', wallet.publicKey.toBase58());

      // Check player balance
      const playerBalance = await connection.getBalance(wallet.publicKey);
      const wagerLamports = Math.floor(wagerAmount * LAMPORTS_PER_SOL);
      const minRequired = wagerLamports + 5000; // Add fee buffer

      console.log(`💰 Player Balance: ${(playerBalance / LAMPORTS_PER_SOL).toFixed(6)} $GOR`);
      console.log(`🎯 Wager Required: ${wagerAmount.toFixed(6)} $GOR`);

      if (playerBalance < minRequired) {
        throw new Error(`Insufficient $GOR balance. Have ${(playerBalance / LAMPORTS_PER_SOL).toFixed(6)}, need ${(minRequired / LAMPORTS_PER_SOL).toFixed(6)}`);
      }

      // Create transaction to transfer wager to shared escrow account
      console.log('📝 Creating escrow deposit transaction...');
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
      
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: wallet.publicKey,
          toPubkey: escrowPubkey,
          lamports: wagerLamports,
        })
      );
      
      transaction.feePayer = wallet.publicKey;
      transaction.recentBlockhash = blockhash;

      // Sign transaction with wallet
      console.log('✍️ Requesting wallet signature for escrow deposit...');
      console.log('🔍 Transaction details:', {
        from: wallet.publicKey.toString(),
        to: escrowPubkey.toString(),
        lamports: wagerLamports,
        wager: wagerAmount
      });
      
      toast.loading('🔐 Please sign the transaction to deposit your wager...', { duration: 15000 });
      
      let signedTransaction;
      try {
        signedTransaction = await wallet.signTransaction(transaction);
        console.log('✅ Transaction signed successfully');
      } catch (signError: any) {
        console.error('❌ Transaction signing failed:', signError);
        toast.dismiss();
        
        // Enhanced error handling for wallet conflicts
        if (signError.message?.includes('User rejected')) {
          throw new Error("❌ Transaction was rejected by user");
        } else if (signError.message?.includes('ethereum') || signError.message?.includes('evmAsk')) {
          throw new Error("❌ Wallet conflict detected! Please disable MetaMask/Ethereum wallets and use only Backpack for Gorbagana.");
        } else if (signError.message?.includes('Cannot redefine property')) {
          throw new Error("❌ Multiple wallet extensions are conflicting. Please disable all wallets except Backpack and refresh the page.");
        } else {
          throw new Error(`❌ Signing failed: ${signError.message}`);
        }
      }

      // Send transaction with retries
      let signature: string = '';
      for (let attempt = 1; attempt <= SEND_RETRIES; attempt++) {
        try {
          console.log(`📤 Sending transaction (Attempt ${attempt}/${SEND_RETRIES})...`);
          signature = await connection.sendRawTransaction(signedTransaction.serialize(), {
            skipPreflight: false,
            maxRetries: 0, // Handle retries manually
          });
          console.log('✅ Transaction sent! Signature:', signature);
          break;
        } catch (sendError: any) {
          console.error(`❌ Send attempt ${attempt} failed:`, sendError.message);
          if (attempt === SEND_RETRIES) {
            throw new Error('Failed to send transaction after retries: ' + sendError.message);
          }
          await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 1 second before retry
        }
      }

      // Confirm transaction
      console.log('⏳ Confirming escrow deposit transaction...');
      toast.loading('⏳ Confirming your deposit on Gorbagana network...', { duration: 30000 });
      
      const confirmResult = await confirmTransaction(signature);
      if (confirmResult.status === 'Failed') {
        throw new Error('Transaction failed: ' + JSON.stringify(confirmResult.error));
      }

      // Verify escrow account balance
      const escrowBalance = await connection.getBalance(escrowPubkey);
      const actualDeposit = escrowBalance / LAMPORTS_PER_SOL;
      
      console.log(`✅ Escrow deposit confirmed!`);
      console.log(`💰 Total Escrow Balance: ${actualDeposit.toFixed(6)} $GOR`);
      console.log(`🔗 Explorer: https://gorexplorer.net/lookup.html#tx/${signature}`);

      toast.dismiss();
      toast.success(`🔒 ${wagerAmount.toFixed(6)} $GOR deposited to shared escrow!`);

      return {
        escrowAccount: escrowPubkey.toBase58(),
        txSignature: signature
      };

    } catch (error: any) {
      toast.dismiss();
      console.error('❌ Escrow deposit failed:', error);
      throw error;
    }
  };

  // Test backend connectivity (browser only)
  useEffect(() => {
    // CRITICAL FIX: Only test backend in browser, not during build
    if (typeof window === 'undefined') {
      console.log('🏗️ Build environment - skipping backend test');
      return;
    }
    
    async function testBackend() {
      try {
        const response = await fetch(`${API_BASE_URL}/health`);
        if (response.ok) {
          setIsConnected(true);
          console.log('✅ Backend API connected - cross-device games enabled');
          console.log('📡 API URL:', API_BASE_URL);
          toast.success('🌐 Connected to game servers!');
        } else {
          console.error('❌ Backend API not responding');
          toast.error('⚠️ Game servers offline - using local mode');
        }
      } catch (error) {
        console.error('❌ Backend connection failed:', error);
        toast.error('⚠️ Cannot reach game servers');
      }
    }
    
    // Small delay to ensure browser environment is fully ready
    const timer = setTimeout(testBackend, 100);
    return () => clearTimeout(timer);
  }, []);

  // Check for wallet extension conflicts (smart detection)
  useEffect(() => {
    if (wallet.connected && typeof window !== 'undefined') {
      // FIXED: Use smart conflict detection that understands Backpack's dual interfaces
      const hasMetaMask = !!(window.ethereum && window.ethereum.isMetaMask);
      const hasBackpackEthereum = !!(window.ethereum && window.ethereum.isBackpack);
      const hasBackpackSolana = !!(window.solana && window.solana.isBackpack);
      const hasPhantom = !!(window.solana && window.solana.isPhantom);
      
      // Detect if this is Backpack providing both interfaces legitimately
      const isBackpackProvidingBothInterfaces = hasBackpackEthereum && hasPhantom && !hasBackpackSolana;
      const hasAnyBackpack = hasBackpackEthereum || hasBackpackSolana || isBackpackProvidingBothInterfaces;
      
      // Only warn about REAL conflicts
      if (hasMetaMask && hasAnyBackpack) {
        console.warn('⚠️ MetaMask detected alongside Backpack - this may cause transaction conflicts');
        toast('⚠️ MetaMask detected. For best results, disable MetaMask and use only Backpack.', {
          duration: 8000,
          icon: '⚠️'
        });
      } else if (hasPhantom && hasBackpackEthereum && !isBackpackProvidingBothInterfaces) {
        console.warn('⚠️ Multiple Solana wallets detected - this may cause conflicts');
        toast('⚠️ Multiple Solana wallets detected. For best results, disable Phantom and use only Backpack.', {
          duration: 8000,
          icon: '⚠️'
        });
      } else if (isBackpackProvidingBothInterfaces) {
        console.log('ℹ️ Backpack is providing both Ethereum and Solana interfaces (normal behavior)');
      }
    }
  }, [wallet.connected]);

  // Real $GOR balance detection
  const fetchGorBalance = useCallback(async () => {
    if (!wallet.connected || !wallet.publicKey) {
      return;
    }

    try {
      console.log('💰 Fetching $GOR balance via backend proxy...');
      
      const walletAddress = wallet.publicKey.toString();
      const response = await fetch(`${API_BASE_URL}/api/balance/${walletAddress}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      console.log(`💰 Balance Response:`, data);
      
      if (data.error && !data.gor) {
        throw new Error(data.error);
      }
      
      const gorBalance = data.gor;
      console.log(`💰 $GOR Balance: ${gorBalance.toFixed(6)} $GOR (${data.lamports} lamports) via ${data.endpoint}`);
      
      setGorBalance(gorBalance);
      
      // Show warnings for demo/fallback balances
      if (data.demo) {
        console.log('⚠️ Using demo balance - Gorbagana network unavailable');
        if (data.status === 'network_unavailable') {
          toast('🌐 Gorbagana network unavailable - using demo $GOR balance', { 
            duration: 5000,
            icon: '⚠️'
          });
        } else {
          toast('⚠️ Demo balance - RPC connection failed', { duration: 3000 });
        }
      } else {
        // Real Gorbagana balance detected
        console.log(`✅ Connected to ${data.network} - real $GOR balance detected`);
        if (data.network === 'Gorbagana') {
          toast.success('🎯 Connected to Gorbagana network!', { duration: 3000 });
        }
        
        // Warn about zero balance on real network
        if (gorBalance === 0) {
          toast.error('⚠️ Zero $GOR balance - you need $GOR tokens to play!');
        }
      }
      
    } catch (error) {
      console.error('❌ Failed to fetch $GOR balance via proxy:', error);
      
      // On connection error, set demo balance if no balance exists
      setGorBalance(prev => prev || 0.99996);
      console.log('⚠️ Using fallback demo balance - proxy connection failed');
      toast.error('⚠️ Balance service unavailable - using demo balance');
    }
  }, [wallet.connected, wallet.publicKey]);

  // Fetch balance when wallet connects - reduced frequency for performance
  useEffect(() => {
    if (wallet.connected && wallet.publicKey) {
      fetchGorBalance();
      // Refresh balance every 60 seconds (reduced from 30s)
      const interval = setInterval(fetchGorBalance, 60000);
      return () => clearInterval(interval);
    } else {
      setGorBalance(0);
    }
  }, [wallet.connected, wallet.publicKey, fetchGorBalance]);

  // Polling for game updates with enhanced sync detection
  useEffect(() => {
    if (!game || !isConnected) return;

    const pollGame = async () => {
      if (isPolling) return; // Prevent overlapping polls

      try {
        const response = await fetch(`${API_BASE_URL}/api/games/${game.id}?bust=${Date.now()}&rand=${Math.random()}`, {
          cache: 'no-store', // Strongest cache disable
          method: 'GET',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate, private, max-age=0, s-maxage=0',
            'Pragma': 'no-cache',
            'Expires': '0',
            'If-None-Match': '*',
            'If-Modified-Since': 'Mon, 26 Jul 1997 05:00:00 GMT'
          }
        });
        if (!response.ok) {
          console.warn(`Failed to fetch game ${game.id}: ${response.status}`);
          return;
        }

        const data = await response.json();
        const updatedGame = data.game;

        if (updatedGame) {
          // Detailed change detection for better notifications
          const hasStatusChanged = updatedGame.status !== game.status;
          const hasPlayerJoined = !game.playerO && updatedGame.playerO;
          const hasMoveBeenMade = JSON.stringify(updatedGame.board) !== JSON.stringify(game.board);
          const hasTurnChanged = updatedGame.currentTurn !== game.currentTurn;
          
          console.log(`🔄 Game ${game.id} poll:`, {
            currentStatus: game.status,
            newStatus: updatedGame.status,
            hasPlayerJoined,
            hasMoveBeenMade,
            hasTurnChanged,
            currentPlayerO: game.playerO,
            newPlayerO: updatedGame.playerO,
            playerOCheck: `${!game.playerO} && ${!!updatedGame.playerO}`,
            statusChanging: game.status !== updatedGame.status,
            // CRITICAL DEBUGGING: See exactly what's in the game object
            DEBUGGING_WINNER: updatedGame.winner,
            DEBUGGING_WINNER_TYPE: typeof updatedGame.winner,
            DEBUGGING_WINNER_NULL_CHECK: updatedGame.winner === null,
            DEBUGGING_WINNER_UNDEFINED_CHECK: updatedGame.winner === undefined,
            DEBUGGING_WINNER_NOT_UNDEFINED: updatedGame.winner !== undefined,
            DEBUGGING_BOARD: updatedGame.board,
            DEBUGGING_FULL_GAME: updatedGame
          });
          
          // 🚨 EMERGENCY DETAILED LOGGING FOR ISSUE DIAGNOSIS 🚨
          console.log('🚨🚨🚨 EMERGENCY POLL DIAGNOSIS 🚨🚨🚨');
          console.log('CURRENT GAME STATE:', JSON.stringify({
            id: game.id,
            status: game.status,
            playerX: game.playerX,
            playerO: game.playerO,
            hasPlayerO: !!game.playerO
          }, null, 2));
          console.log('NEW GAME STATE:', JSON.stringify({
            id: updatedGame.id,
            status: updatedGame.status,
            playerX: updatedGame.playerX,
            playerO: updatedGame.playerO,
            hasPlayerO: !!updatedGame.playerO
          }, null, 2));
          console.log('STATUS CHANGE CHECK:', {
            oldStatus: game.status,
            newStatus: updatedGame.status,
            statusChanged: game.status !== updatedGame.status,
            oldPlayerO: game.playerO,
            newPlayerO: updatedGame.playerO,
            playerJoined: !game.playerO && !!updatedGame.playerO
          });
          console.log('🚨🚨🚨 END EMERGENCY DIAGNOSIS 🚨🚨🚨');
          
          // Update game state first
          setGame(updatedGame);

          // Notify about important changes
          if (hasPlayerJoined) {
            console.log('🎮 PLAYER JOINED NOTIFICATION TRIGGERED');
            toast.success('🎮 Opponent joined! Game is starting!', { duration: 6000 });
          } else if (hasStatusChanged) {
            if (updatedGame.status === 'playing' && game.status === 'waiting') {
              console.log('🚀 STATUS CHANGED TO PLAYING - Game started!');
              toast.success('🚀 Game has started!', { duration: 4000 });
            } else if (updatedGame.status === 'finished') {
              if (updatedGame.winner === 1) {
                toast.success('🗑️ Trash Cans win!', { duration: 4000 });
              } else if (updatedGame.winner === 2) {
                toast.success('♻️ Recycling Bins win!', { duration: 4000 });
              } else {
                toast('🤝 Game ended in a tie!', { duration: 4000 });
              }
            }
          } else if (hasMoveBeenMade && updatedGame.status === 'playing') {
            const isMyTurn = (updatedGame.currentTurn === 1 && wallet.publicKey?.toString() === updatedGame.playerX) ||
                           (updatedGame.currentTurn === 2 && wallet.publicKey?.toString() === updatedGame.playerO);
            if (isMyTurn) {
              toast('🎯 Your turn!', { duration: 3000 });
            }
          }

          // CRITICAL FIX: Only handle prize distribution for ACTUALLY finished games
          console.log('🔍 PRIZE DISTRIBUTION CHECK:', {
            status: updatedGame.status,
            winner: updatedGame.winner,
            winnerType: typeof updatedGame.winner,
            isFinished: updatedGame.status === 'finished',
            isAbandoned: updatedGame.status === 'abandoned', 
            hasRealWinner: updatedGame.winner === 1 || updatedGame.winner === 2 || updatedGame.winner === 0,
            shouldCallPrizeDistribution: (updatedGame.status === 'finished' && (updatedGame.winner === 1 || updatedGame.winner === 2 || updatedGame.winner === 0)) || updatedGame.status === 'abandoned'
          });

          // Handle game completion - FIXED LOGIC
          if (updatedGame.status === 'finished' && (updatedGame.winner === 1 || updatedGame.winner === 2 || updatedGame.winner === 0)) {
            // Only call prize distribution for games that are actually finished with a real winner/tie
            console.log('✅ CALLING handlePrizeDistribution for finished game with winner:', updatedGame.winner);
            await handlePrizeDistribution(updatedGame);
          } else if (updatedGame.status === 'abandoned') {
            // Handle abandoned games
            console.log('✅ CALLING handlePrizeDistribution for abandoned game');
            await handlePrizeDistribution(updatedGame);
          } else if (updatedGame.status === 'playing') {
            // Check for abandoned games during active polling
            await checkForAbandonedGame(updatedGame);
          } else {
            console.log('🚫 NOT calling handlePrizeDistribution - game not in final state:', {
              status: updatedGame.status,
              winner: updatedGame.winner,
              reason: updatedGame.status === 'waiting' ? 'Game still waiting for players' : 
                     updatedGame.status === 'playing' ? 'Game still in progress' :
                     updatedGame.winner === null ? 'Winner is null (game not finished)' :
                     updatedGame.winner === undefined ? 'Winner is undefined (game not finished)' :
                     'Unknown reason'
            });
          }
        }
      } catch (error) {
        console.error('❌ Error polling game:', error);
      }
    };

    pollGame(); // Initial poll
    setIsPolling(true);
    const pollInterval = setInterval(pollGame, 2000); // Very fast polling for better sync - 2 seconds
    
    return () => {
      clearInterval(pollInterval);
      setIsPolling(false);
    };
  }, [game, isConnected, wallet.publicKey]);

  // Handle prize distribution when game ends
  const handlePrizeDistribution = async (finishedGame: Game) => {
    console.log('🔥 handlePrizeDistribution called with game:', {
      id: finishedGame.id,
      status: finishedGame.status,
      winner: finishedGame.winner,
      winnerType: typeof finishedGame.winner,
      createdAt: finishedGame.createdAt,
      updatedAt: finishedGame.updatedAt,
      timeSinceCreation: Date.now() - finishedGame.createdAt,
      playerX: finishedGame.playerX,
      playerO: finishedGame.playerO,
      board: finishedGame.board,
      boardNotEmpty: finishedGame.board.some(cell => cell !== 0)
    });

    // CRITICAL VALIDATION #1: Only run on actually finished/abandoned games
    if (finishedGame.status !== 'finished' && finishedGame.status !== 'abandoned') {
      console.warn('⚠️ BLOCK #1: handlePrizeDistribution called on non-finished game:', {
        status: finishedGame.status,
        winner: finishedGame.winner,
        gameId: finishedGame.id
      });
      return;
    }

    // CRITICAL VALIDATION #2: Don't run on games that were just created (less than 30 seconds old)
    const timeSinceCreation = Date.now() - finishedGame.createdAt;
    if (timeSinceCreation < 30000) { // 30 seconds minimum
      console.warn('⚠️ BLOCK #2: Game too new for prize distribution:', {
        gameId: finishedGame.id,
        timeSinceCreation,
        createdAt: finishedGame.createdAt,
        now: Date.now()
      });
      return;
    }

    // CRITICAL VALIDATION #3: Don't run on games where no moves have been made (empty board)
    const hasMovesBeenMade = finishedGame.board.some(cell => cell !== 0);
    if (!hasMovesBeenMade && finishedGame.status === 'finished') {
      console.warn('⚠️ BLOCK #3: No moves made - this is not a real finished game:', {
        gameId: finishedGame.id,
        board: finishedGame.board,
        status: finishedGame.status,
        winner: finishedGame.winner
      });
      return;
    }

    // CRITICAL VALIDATION #4: Don't run on games with only one player unless abandoned
    if (!finishedGame.playerO && finishedGame.status === 'finished') {
      console.warn('⚠️ BLOCK #4: Game marked finished but no second player joined:', {
        gameId: finishedGame.id,
        playerX: finishedGame.playerX,
        playerO: finishedGame.playerO,
        status: finishedGame.status
      });
      return;
    }

    // CRITICAL VALIDATION #5: Validate winner value for finished games
    if (finishedGame.status === 'finished' && ![0, 1, 2].includes(finishedGame.winner as number)) {
      console.warn('⚠️ BLOCK #5: Invalid winner value for finished game:', {
        gameId: finishedGame.id,
        winner: finishedGame.winner,
        winnerType: typeof finishedGame.winner,
        status: finishedGame.status
      });
      return;
    }

    if (!wallet.publicKey || finishedGame.wager <= 0) {
      console.warn('⚠️ BLOCK #6: No wallet or invalid wager:', {
        hasWallet: !!wallet.publicKey,
        wager: finishedGame.wager
      });
      return;
    }

    console.log('✅ ALL VALIDATIONS PASSED - Proceeding with prize distribution');

    try {
      console.log('🏆 Checking prize distribution...');
      
      const isPlayerX = wallet.publicKey.toString() === finishedGame.playerX;
      const isPlayerO = wallet.publicKey.toString() === finishedGame.playerO;
      
      if (!isPlayerX && !isPlayerO) {
        return; // Not a player in this game
      }

      const isWinner = (finishedGame.winner === 1 && isPlayerX) || (finishedGame.winner === 2 && isPlayerO);
      const isCreator = isPlayerX; // Only the game creator (Player X) has the escrow private key
      
      if (isCreator && escrowAccount) {
        // Only the game creator can distribute prizes (has escrow private key)
        if (finishedGame.winner === 0 || (finishedGame.winner === null && finishedGame.status === 'finished')) {
          // Tie game - return deposits to both players
          console.log('🤝 Tie game. Returning deposits to both players...');
          try {
            await transferPrize(finishedGame.wager, wallet.publicKey); // Return to creator (self)
            if (finishedGame.playerO) {
              await transferPrize(finishedGame.wager, new PublicKey(finishedGame.playerO)); // Return to Player O
            }
            toast.success(`🤝 Tie game - ${finishedGame.wager.toFixed(6)} $GOR returned to both players!`);
          } catch (error) {
            console.error('❌ Failed to return tie game deposits:', error);
            toast.error('⚠️ Failed to return deposits - please contact support');
          }
        } else if (finishedGame.status === 'abandoned') {
          // Abandoned game - return deposits to both players
          console.log('⏰ Abandoned game. Returning deposits to both players...');
          try {
            await transferPrize(finishedGame.wager, wallet.publicKey); // Return to creator (self)
            if (finishedGame.playerO) {
              await transferPrize(finishedGame.wager, new PublicKey(finishedGame.playerO)); // Return to Player O
            }
            toast.success(`⏰ Game abandoned - ${finishedGame.wager.toFixed(6)} $GOR returned to both players!`);
          } catch (error) {
            console.error('❌ Failed to return abandoned game deposits:', error);
            toast.error('⚠️ Failed to return deposits - please contact support');
          }
        } else if (isWinner) {
          // Creator won - take the full prize
          console.log('🏆 You won! Distributing your prize...');
          try {
            const prizeAmount = finishedGame.wager * 2;
            await transferPrize(prizeAmount, wallet.publicKey);
            toast.success(`🎉 You won ${prizeAmount.toFixed(6)} $GOR!`);
          } catch (error) {
            console.error('❌ Failed to claim prize:', error);
            toast.error('⚠️ Failed to claim prize - please try again');
          }
        } else {
          // Creator lost - send prize to winner
          console.log('😢 You lost. Sending prize to winner...');
          const winnerAddress = finishedGame.winner === 2 ? finishedGame.playerO : finishedGame.playerX;
          if (winnerAddress) {
            try {
              const prizeAmount = finishedGame.wager * 2;
              await transferPrize(prizeAmount, new PublicKey(winnerAddress));
              toast.error(`😢 You lost ${finishedGame.wager.toFixed(6)} $GOR. Prize sent to winner.`);
            } catch (error) {
              console.error('❌ Failed to send prize to winner:', error);
              toast.error('⚠️ Failed to send prize - please contact support');
            }
          }
        }
      } else if (isWinner && !isCreator) {
        // Winner but not creator - wait for automatic prize distribution
        const prizeAmount = finishedGame.wager * 2;
        toast.success(`🎉 You won ${prizeAmount.toFixed(6)} $GOR! Prize will be transferred automatically.`);
      } else if (!isWinner && !isCreator) {
        // Loser and not creator - just show result
        if (finishedGame.status === 'abandoned') {
          toast.success(`⏰ Game abandoned - ${finishedGame.wager.toFixed(6)} $GOR will be returned automatically.`);
        } else {
          toast.error("🗑️ You're such trash, recycle yourself and try again! - Gorbagio");
        }
      }
      
    } catch (error) {
      console.error('❌ Prize distribution failed:', error);
      toast.error('⚠️ Prize distribution failed - contact support');
    }
  };

  // Transfer prize from escrow to winner (enhanced fee handling)
  const transferPrize = async (amount: number, recipient: PublicKey) => {
    if (!escrowAccount) {
      throw new Error('No escrow account available - only game creator can distribute prizes');
    }

    try {
      // Check escrow balance first and account for rent exemption and fees
      const escrowBalance = await connection.getBalance(escrowAccount.publicKey);
      let prizeLamports = Math.floor(amount * LAMPORTS_PER_SOL);
      
      // Get current transaction fee estimate
      const { blockhash } = await connection.getLatestBlockhash();
      const testTransaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: escrowAccount.publicKey,
          toPubkey: recipient,
          lamports: prizeLamports,
        })
      );
      testTransaction.feePayer = escrowAccount.publicKey;
      testTransaction.recentBlockhash = blockhash;
      testTransaction.sign(escrowAccount);
      
      // Estimate transaction fee
      const feeCalculator = await connection.getFeeForMessage(testTransaction.compileMessage());
      const estimatedFee = feeCalculator.value || 10000; // Default to 10k lamports if estimation fails
      
      const rentExemptMinimum = await connection.getMinimumBalanceForRentExemption(0);
      const totalFeeBuffer = estimatedFee + 5000; // Add buffer for fee variations
      const totalNeeded = prizeLamports + totalFeeBuffer;
      
      console.log(`💰 Transferring ${amount.toFixed(6)} $GOR to ${recipient.toBase58()}...`);
      console.log(`🔍 Escrow balance: ${escrowBalance} lamports`);
      console.log(`🔍 Prize amount: ${prizeLamports} lamports`);
      console.log(`🔍 Estimated fee: ${estimatedFee} lamports`);
      console.log(`🔍 Fee buffer: ${totalFeeBuffer} lamports`);
      console.log(`🔍 Rent exempt minimum: ${rentExemptMinimum} lamports`);
      console.log(`🔍 Total needed: ${totalNeeded} lamports`);
      
      if (escrowBalance < totalNeeded) {
        // Adjust transfer to available balance minus fees
        const availableToTransfer = escrowBalance - totalFeeBuffer;
        if (availableToTransfer > 0) {
          console.log(`⚠️ Adjusting transfer to available balance minus fees: ${availableToTransfer} lamports`);
          const adjustedAmount = availableToTransfer / LAMPORTS_PER_SOL;
          console.log(`💰 Adjusted transfer: ${adjustedAmount.toFixed(6)} $GOR`);
          prizeLamports = availableToTransfer;
        } else {
          throw new Error(`Insufficient escrow balance for transfer and fees: ${escrowBalance} lamports available, need ${totalNeeded} lamports`);
        }
      }
      
      // Create the actual transaction with proper fee handling
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: escrowAccount.publicKey,
          toPubkey: recipient,
          lamports: prizeLamports,
        })
      );
      
      transaction.feePayer = escrowAccount.publicKey; // Fees paid from escrow account
      transaction.recentBlockhash = blockhash;
      transaction.sign(escrowAccount);

      const signature = await connection.sendRawTransaction(transaction.serialize(), {
        skipPreflight: false,
        maxRetries: 3
      });
      
      const confirmResult = await confirmTransaction(signature);
      if (confirmResult.status === 'Failed') {
        throw new Error('Prize transfer confirmation failed: ' + JSON.stringify(confirmResult.error));
      }
      
      console.log(`✅ Prize transferred! Signature: ${signature}`);
      console.log(`🔗 Explorer: https://gorexplorer.net/lookup.html#tx/${signature}`);
      
      // Verify final escrow balance
      const finalBalance = await connection.getBalance(escrowAccount.publicKey);
      console.log(`💰 Remaining escrow balance: ${(finalBalance / LAMPORTS_PER_SOL).toFixed(6)} $GOR`);
      
    } catch (error) {
      console.error('❌ Prize transfer failed:', error);
      throw error;
    }
  };

  // Create a new game (with real $GOR escrow)
  const createGame = async () => {
    if (!wallet.connected || !wallet.publicKey) {
      toast.error("Please connect your Backpack wallet first!");
      return;
    }

    if (!isConnected) {
      toast.error("Game servers are offline!");
      return;
    }

    const wager = parseFloat(wagerInput) || 0;
    if (wager > gorBalance) {
      toast.error(`Insufficient $GOR! You have ${gorBalance.toFixed(4)} $GOR, need ${wager.toFixed(4)} $GOR`);
      return;
    }

    // CRITICAL FIX: Check wallet health before creating games
    const walletHealth = checkWalletHealth();
    if (!walletHealth.healthy) {
      console.warn('⚠️ Wallet conflicts detected before creating game:', walletHealth);
      showWalletConflictDialog(walletHealth);
      setWalletConflictDetected(true);
      
      // Show warning but allow creation of free games
      if (wager > 0) {
        const proceed = confirm('⚠️ Wallet conflicts detected. Creating wagered games may fail. Continue anyway?\n\nFor best results, fix wallet conflicts first.');
        if (!proceed) {
          return;
        }
      }
    }

    console.log('🎮 Starting game creation...');
    console.log('💰 Wager amount:', wager, '$GOR');
    
    if (window.ethereum && wager > 0) {
      console.log('⚠️ Ethereum wallet detected - potential conflict for escrow transactions');
    }

    setLoading(true);

    try {
      // Generate unique game ID
      const gameId = Math.floor(Math.random() * 10000).toString();
      console.log('🆔 Generated game ID:', gameId);

      let escrowData = null;
      
      // Create escrow deposit for wagered games
      if (wager > 0) {
        console.log('🔐 Creating escrow deposit for', wager, '$GOR...');
        
        // Triple check wallet health before critical transaction
        const preTransactionHealth = checkWalletHealth();
        if (!preTransactionHealth.healthy) {
          console.warn('⚠️ Wallet health check failed before escrow creation');
          toast.error('⚠️ Wallet conflicts detected! Transaction may fail. Please fix wallet conflicts and try again.');
          throw new Error('Wallet conflicts prevent secure transaction');
        }
        
        escrowData = await createEscrowDeposit(wager, gameId, true); // Player X (creator)
        console.log('✅ Escrow deposit created successfully:', escrowData);
      }

      // Create the game on backend
      const newGame: Game = {
        id: gameId,
        playerX: wallet.publicKey.toString(),
        playerO: undefined,
        board: new Array(9).fill(0),
        currentTurn: 1,
        status: 'waiting',
        winner: undefined,
        createdAt: Date.now(),
        wager: wager,
        isPublic: makeGamePublic,
        creatorName: 'Player 1',
        escrowAccount: escrowData?.escrowAccount,
        txSignature: escrowData?.txSignature,
        playerXDeposit: escrowData?.txSignature,
        updatedAt: Date.now()
      };

      console.log('💾 Saving game to backend:', {
        id: newGame.id,
        wager: newGame.wager,
        isPublic: newGame.isPublic,
        hasEscrow: !!newGame.escrowAccount
      });

      const response = await fetch(`${API_BASE_URL}/api/games`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newGame)
      });

      console.log('🌐 Backend response status:', response.status);
      console.log('🌐 Backend response ok:', response.ok);

      if (!response.ok) {
        // Get detailed error from backend
        let errorDetails;
        try {
          errorDetails = await response.json();
          console.error('❌ Backend error details:', errorDetails);
        } catch (parseError) {
          const textError = await response.text();
          console.error('❌ Backend error (raw text):', textError);
          errorDetails = { error: textError };
        }
        throw new Error(`Backend error (${response.status}): ${JSON.stringify(errorDetails)}`);
      }

      const data = await response.json();
      setGame(data.game);
      setGameId(gameId);
      setLoading(false);

      if (wager > 0) {
        toast.success(`🎮 Game created with ${wager.toFixed(6)} $GOR wager! Share ID: ${gameId}`);
      } else {
        toast.success(`🎮 Free game created! Share ID: ${gameId}`);
      }
      
      // Clear wallet conflict flag on successful creation
      setWalletConflictDetected(false);

      // Start polling for opponent
      if (!isPolling) {
        setIsPolling(true);
      }

      // Refresh balance after transaction
      setTimeout(fetchGorBalance, 2000);

    } catch (error) {
      setLoading(false);
      console.error('❌ Failed to create game:', error);
      
      // Enhanced error messages for wallet conflicts
      const errorMessage = (error as Error).message;
      if (errorMessage.includes('Wallet conflict') || errorMessage.includes('wallet conflicts')) {
        toast.error("🔧 Wallet conflicts prevented game creation! Please disable MetaMask/Ethereum wallets and use only Backpack.", { duration: 8000 });
      } else {
        toast.error("Failed to create game: " + errorMessage);
      }
    }
  };

  // Join a game (with matching escrow deposit)
  const joinGame = async () => {
    if (!wallet.connected || !wallet.publicKey || !gameId) {
      toast.error("Please connect wallet and enter a Game ID!");
      return;
    }

    if (!isConnected) {
      toast.error("Game servers are offline!");
      return;
    }

    // CRITICAL FIX: Check wallet health before joining to prevent failures
    const walletHealth = checkWalletHealth();
    if (!walletHealth.healthy) {
      console.warn('⚠️ Wallet conflicts detected before joining game:', walletHealth);
      showWalletConflictDialog(walletHealth);
      setWalletConflictDetected(true);
      
      // Still allow joining but with warning
      const proceed = confirm('⚠️ Wallet conflicts detected. Joining may fail. Continue anyway?\n\nFor best results, fix wallet conflicts first.');
      if (!proceed) {
        return;
      }
    }

    setLoading(true);
    
    try {
      // First, get the game details
      const gameResponse = await fetch(`${API_BASE_URL}/api/games/${gameId}`);
      if (!gameResponse.ok) {
        throw new Error('Game not found');
      }

      const gameData = await gameResponse.json();
      const existingGame = gameData.game;

      console.log('🎮 Retrieved game data for joining:', {
        gameId: existingGame.id,
        wager: existingGame.wager,
        escrowAccount: existingGame.escrowAccount,
        hasEscrowAccount: !!existingGame.escrowAccount
      });

      // Check wager requirements
      if (existingGame.wager > gorBalance) {
        setLoading(false);
        toast.error(`Insufficient $GOR! This game requires ${existingGame.wager.toFixed(4)} $GOR`);
        return;
      }

      // Validate that escrow account exists for wagered games
      if (existingGame.wager > 0 && !existingGame.escrowAccount) {
        setLoading(false);
        toast.error("❌ Cannot find shared escrow account - game creator must deposit first");
        console.error('❌ Game missing escrow account:', JSON.stringify(existingGame, null, 2));
        return;
      }

      let escrowData = null;
      
      // Update local game state first for escrow account reference
      setGame(existingGame);
      
      // Create matching escrow deposit if wager > 0
      if (existingGame.wager > 0) {
        toast.loading('🔐 Creating matching escrow deposit...', { duration: 5000 });
        
        // Double check wallet health before critical transaction
        const preTransactionHealth = checkWalletHealth();
        if (!preTransactionHealth.healthy) {
          console.warn('⚠️ Wallet health check failed before escrow deposit');
          toast.dismiss();
          toast.error('⚠️ Wallet conflicts detected! Transaction may fail. Please fix wallet conflicts and try again.');
          throw new Error('Wallet conflicts prevent secure transaction');
        }
        
        escrowData = await createEscrowDeposit(existingGame.wager, gameId, false, existingGame.escrowAccount); // Player O
        toast.dismiss();
        console.log('✅ Matching escrow deposit created:', escrowData);
      }

      // Join the game
      const joinResponse = await fetch(`${API_BASE_URL}/api/games/${gameId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerAddress: wallet.publicKey.toString(),
          playerName: 'Player 2',
          playerODeposit: escrowData?.txSignature
        })
      });

      if (!joinResponse.ok) {
        const errorData = await joinResponse.json();
        throw new Error(errorData.error || 'Failed to join game');
      }

      const data = await joinResponse.json();
      setGame(data.game);
      setLoading(false);
      
      if (existingGame.wager > 0) {
        toast.success(`🔒 Joined game with ${existingGame.wager.toFixed(6)} $GOR wager!`);
      } else {
        toast.success("🎮 Successfully joined free game!");
      }
      
      // Clear wallet conflict flag on successful join
      setWalletConflictDetected(false);
      
      // Refresh balance after transaction
      setTimeout(fetchGorBalance, 2000);
      
    } catch (error) {
      setLoading(false);
      console.error('❌ Failed to join game:', error);
      
      // Enhanced error messages for wallet conflicts
      const errorMessage = (error as Error).message;
      if (errorMessage.includes('Wallet conflict') || errorMessage.includes('wallet conflicts')) {
        toast.error("🔧 Wallet conflicts prevented joining! Please disable MetaMask/Ethereum wallets and use only Backpack.", { duration: 8000 });
      } else {
        toast.error("Failed to join game: " + errorMessage);
      }
    }
  };

  // Make a move (with backend API)
  const makeMove = async (position: number) => {
    if (!game || !wallet.publicKey || game.status !== "playing" || game.board[position] !== 0) {
      return;
    }

    const isPlayerX = wallet.publicKey.toString() === game.playerX;
    const isPlayerO = wallet.publicKey.toString() === game.playerO;
    const isMyTurn = (game.currentTurn === 1 && isPlayerX) || (game.currentTurn === 2 && isPlayerO);

    if (!isMyTurn) {
      toast.error("It's not your turn!");
      return;
    }

    if (!isConnected) {
      toast.error("Cannot make move - servers offline!");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/games/${game.id}/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          position,
          playerAddress: wallet.publicKey.toString()
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to make move');
      }

      const data = await response.json();
      setGame(data.game);
      setLoading(false);

      // Game end notifications are handled by the polling effect
    } catch (error) {
      setLoading(false);
      console.error('❌ Failed to make move:', error);
      toast.error("Failed to make move: " + (error as Error).message);
    }
  };

  // Get cell content with enhanced styling and animations
  const getCellContent = (position: number) => {
    const value = game?.board[position] || 0;
    if (value === 1) {
      return (
        <span className="game-icon trash-icon animate-bounce-in">
          🗑️
          <span className="icon-label">TRASH</span>
        </span>
      );
    }
    if (value === 2) {
      return (
        <span className="game-icon recycle-icon animate-bounce-in">
          ♻️
          <span className="icon-label">RECYCLE</span>
        </span>
      );
    }
    return (
      <span className="empty-cell-hint">
        <span className="plus-icon">+</span>
      </span>
    );
  };

  // Check for winning combination highlighting
  const getWinningCells = () => {
    if (!game || game.status !== 'finished' || !game.winner) return [];
    
    const winningCombinations = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
      [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
      [0, 4, 8], [2, 4, 6],             // Diagonals
    ];
    
    for (const combination of winningCombinations) {
      if (combination.every(pos => game.board[pos] === game.winner)) {
        return combination;
      }
    }
    return [];
  };

  const winningCells = getWinningCells();

  // Enhanced cell styling with winning animation
  const getCellClassName = (position: number) => {
    const value = game?.board[position] || 0;
    const isWinning = winningCells.includes(position);
    const canPlay = game?.status === "playing" && value === 0;
    
    let className = "game-cell";
    
    if (value === 1) {
      className += " filled trash-cell";
    } else if (value === 2) {
      className += " filled recycle-cell";  
    } else {
      className += " empty";
    }
    
    if (isWinning) {
      className += " winning-cell";
    }
    
    if (canPlay) {
      className += " playable";
    }
    
    return className;
  };

  // Handle wager input with validation
  const handleWagerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow empty string, numbers 0-9, and decimal point
    if (value === '' || /^[0-9]*\.?[0-9]*$/.test(value)) {
      setWagerInput(value);
    }
  };

  // Check for abandoned games (call this periodically)
  const checkForAbandonedGame = async (currentGame: Game) => {
    if (!currentGame || currentGame.status !== 'playing' || currentGame.wager <= 0) {
      return;
    }

    const now = Date.now();
    const gameAge = now - currentGame.createdAt;
    const lastUpdate = currentGame.updatedAt || currentGame.createdAt;
    const timeSinceLastMove = now - lastUpdate;
    
    // Consider game abandoned if:
    // 1. Game is older than 2 hours, OR
    // 2. No move made in the last 30 minutes
    const GAME_TIMEOUT = 2 * 60 * 60 * 1000; // 2 hours
    const MOVE_TIMEOUT = 30 * 60 * 1000; // 30 minutes
    
    const isAbandoned = gameAge > GAME_TIMEOUT || timeSinceLastMove > MOVE_TIMEOUT;
    
    if (isAbandoned) {
      console.log('⏰ Game appears to be abandoned, attempting to mark as abandoned...');
      
      try {
        // Mark game as abandoned on backend
        const response = await fetch(`${API_BASE_URL}/api/games/${currentGame.id}/abandon`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            playerAddress: wallet.publicKey?.toString(),
            reason: gameAge > GAME_TIMEOUT ? 'timeout' : 'inactivity'
          })
        });

        if (response.ok) {
          const data = await response.json();
          setGame(data.game);
          
          // Trigger prize distribution for abandoned game
          if (data.game.status === 'abandoned') {
            await handlePrizeDistribution(data.game);
          }
        }
      } catch (error) {
        console.error('❌ Failed to mark game as abandoned:', error);
      }
    }
  };

  // Load public games from backend
  const loadPublicGames = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/games`);
      if (response.ok) {
        const data = await response.json();
        setPublicGames(data.games || []);
        console.log(`📋 Loaded ${data.games?.length || 0} public games`);
      }
    } catch (error) {
      console.error('❌ Failed to load public games:', error);
    }
  };

  // Public games polling
  useEffect(() => {
    if (showPublicLobby) {
      loadPublicGames();
      const interval = setInterval(loadPublicGames, 10000); // Refresh every 10 seconds
      return () => clearInterval(interval);
    }
  }, [showPublicLobby]);

  // Join public game - FIXED: Direct join without state race condition
  const joinPublicGame = async (publicGame: Game) => {
    if (!wallet.connected || !wallet.publicKey) {
      toast.error("Please connect your wallet first!");
      return;
    }

    if (!isConnected) {
      toast.error("Game servers are offline!");
      return;
    }

    if (publicGame.wager > gorBalance) {
      toast.error(`Insufficient $GOR balance! Need ${publicGame.wager.toFixed(6)} $GOR`);
      return;
    }

    setLoading(true);
    
    try {
      // FIXED: Join directly with the public game ID, no state update needed
      console.log('🎮 Joining public game directly:', publicGame.id);

      // Validate that escrow account exists for wagered games
      if (publicGame.wager > 0 && !publicGame.escrowAccount) {
        throw new Error("❌ Cannot find shared escrow account - game creator must deposit first");
      }

      let escrowData = null;
      
      // Update local game state first for escrow account reference
      setGame(publicGame);
      setGameId(publicGame.id);
      
      // Create matching escrow deposit if wager > 0
      if (publicGame.wager > 0) {
        toast.loading('🔐 Creating matching escrow deposit...', { duration: 5000 });
        escrowData = await createEscrowDeposit(publicGame.wager, publicGame.id, false, publicGame.escrowAccount);
        toast.dismiss();
        console.log('✅ Matching escrow deposit created:', escrowData);
      }

      // Join the game directly with the public game ID
      const joinResponse = await fetch(`${API_BASE_URL}/api/games/${publicGame.id}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerAddress: wallet.publicKey.toString(),
          playerName: 'Player 2',
          playerODeposit: escrowData?.txSignature
        })
      });

      if (!joinResponse.ok) {
        const errorData = await joinResponse.json();
        throw new Error(errorData.error || 'Failed to join game');
      }

      const data = await joinResponse.json();
      setGame(data.game);
      setShowPublicLobby(false);
      
      if (publicGame.wager > 0) {
        toast.success(`🔒 Joined public game with ${publicGame.wager.toFixed(6)} $GOR wager!`);
      } else {
        toast.success("🎮 Successfully joined public game!");
      }
      
      // Refresh balance after transaction
      setTimeout(fetchGorBalance, 2000);
      
    } catch (error) {
      console.error('❌ Failed to join public game:', error);
      toast.error("Failed to join public game: " + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // Enhanced abandon game function - available for both players
  const abandonGame = async () => {
    if (!wallet.publicKey || !game) {
      toast.error("Cannot abandon game - wallet not connected or no active game!");
      return;
    }

    const isPlayerX = wallet.publicKey.toString() === game.playerX;
    const isPlayerO = wallet.publicKey.toString() === game.playerO;
    
    if (!isPlayerX && !isPlayerO) {
      toast.error("You are not a player in this game!");
      return;
    }

    const confirmed = window.confirm(
      game.wager > 0 
        ? `Are you sure you want to abandon this game? Your ${game.wager.toFixed(6)} $GOR wager will be returned to both players.`
        : "Are you sure you want to abandon this game?"
    );

    if (!confirmed) return;

    setLoading(true);
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/games/${game.id}/abandon`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerAddress: wallet.publicKey.toString(),
          reason: 'player_request'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to abandon game');
      }

      const data = await response.json();
      setGame(data.game);
      
      if (data.game.status === 'abandoned') {
        await handlePrizeDistribution(data.game);
        toast.success('Game abandoned successfully! Funds will be returned.');
      }
      
    } catch (error) {
      console.error('❌ Failed to abandon game:', error);
      toast.error("Failed to abandon game: " + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // CRITICAL FIX: Wallet health check to prevent transaction failures
  const checkWalletHealth = (): { healthy: boolean; issues: string[]; suggestions: string[] } => {
    const issues: string[] = [];
    const suggestions: string[] = [];
    
    if (typeof window === 'undefined') {
      return { healthy: true, issues: [], suggestions: [] };
    }
    
    // DETAILED DEBUGGING: Log exactly what's being detected
    console.log('🔍 DETAILED WALLET DETECTION:', {
      'window.ethereum exists': !!window.ethereum,
      'window.ethereum type': typeof window.ethereum,
      'window.ethereum.request exists': !!(window.ethereum && typeof window.ethereum.request === 'function'),
      'window.ethereum.isMetaMask': !!(window.ethereum && window.ethereum.isMetaMask),
      'window.ethereum.isBackpack': !!(window.ethereum && window.ethereum.isBackpack),
      'window.ethereum object': window.ethereum ? Object.keys(window.ethereum).slice(0, 10) : null,
      'window.solana exists': !!window.solana,
      'window.solana.isBackpack': !!(window.solana && window.solana.isBackpack),
      'window.solana.isPhantom': !!(window.solana && window.solana.isPhantom),
      'window.solana object': window.solana ? Object.keys(window.solana).slice(0, 10) : null,
    });
    
    // FIXED: Smart wallet detection that understands Backpack provides both interfaces
    const hasEthereum = !!window.ethereum;
    const hasSolana = !!window.solana;
    const hasBackpackEthereum = !!(window.ethereum && window.ethereum.isBackpack);
    const hasBackpackSolana = !!(window.solana && window.solana.isBackpack);
    const hasPhantom = !!(window.solana && window.solana.isPhantom);
    const hasMetaMask = !!(window.ethereum && window.ethereum.isMetaMask);
    const hasConflictWarning = !!(window as any).__ethereumConflictWarning;
    
    // CRITICAL FIX: Detect if this is actually just Backpack providing both interfaces
    // Backpack sometimes reports its Solana interface as Phantom incorrectly
    const isBackpackProvidingBothInterfaces = hasBackpackEthereum && hasPhantom && !hasBackpackSolana;
    
    console.log('🔍 WALLET FLAGS:', {
      hasEthereum,
      hasSolana,
      hasBackpackEthereum,
      hasBackpackSolana,
      hasPhantom,
      hasMetaMask,
      hasConflictWarning,
      isBackpackProvidingBothInterfaces
    });
    
    // Check for REAL conflicts (not Backpack's dual interfaces)
    if (hasMetaMask && (hasBackpackEthereum || hasBackpackSolana)) {
      issues.push('Active MetaMask detected alongside Backpack');
      suggestions.push('Disable MetaMask extension completely in browser settings');
    }
    
    // Only flag as conflict if it's NOT Backpack providing both interfaces
    if (hasPhantom && hasBackpackEthereum && !isBackpackProvidingBothInterfaces) {
      issues.push('Multiple Solana wallets active (Phantom + Backpack)');
      suggestions.push('Disable Phantom wallet to prevent conflicts');
    }
    
    // FIXED: Only flag conflict warning if it's NOT just Backpack's ethereum interface
    if (hasConflictWarning && !hasBackpackEthereum) {
      issues.push('Ethereum wallet conflict detected');
      suggestions.push('Disable all Ethereum-based wallets (MetaMask, etc)');
    } else if (hasConflictWarning && hasBackpackEthereum) {
      console.log('ℹ️ Conflict warning present but caused by Backpack ethereum interface (not a real conflict)');
    }
    
    // Check if we have Backpack (either interface)
    const hasAnyBackpack = hasBackpackEthereum || hasBackpackSolana || isBackpackProvidingBothInterfaces;
    
    if (!hasAnyBackpack) {
      issues.push('Backpack wallet not detected');
      suggestions.push('Install and enable Backpack wallet extension');
    }
    
    // Additional check: if wallet is connected but not through Backpack
    if (wallet.connected && wallet.wallet && !wallet.wallet.adapter.name.includes('Backpack')) {
      issues.push(`Connected through ${wallet.wallet.adapter.name} instead of Backpack`);
      suggestions.push('Disconnect and reconnect using Backpack wallet');
    }
    
    const healthy = issues.length === 0;
    
    // Enhanced debugging to help troubleshoot false positives
    console.log('🔍 Wallet Health Check Results:', {
      hasEthereum,
      hasSolana,
      hasBackpackEthereum,
      hasBackpackSolana,
      hasPhantom,
      hasMetaMask,
      isBackpackProvidingBothInterfaces,
      hasAnyBackpack,
      walletConnected: wallet.connected,
      walletName: wallet.wallet?.adapter?.name,
      issues: issues,
      issuesCount: issues.length,
      healthy,
      conflictWarning: hasConflictWarning,
      // DETAILED ISSUE BREAKDOWN
      detailedIssueAnalysis: {
        'MetaMask + Backpack conflict': hasMetaMask && (hasBackpackEthereum || hasBackpackSolana),
        'Phantom + Backpack conflict (not dual interface)': hasPhantom && hasBackpackEthereum && !isBackpackProvidingBothInterfaces,
        'Conflict warning flag': hasConflictWarning,
        'Backpack not detected': !hasAnyBackpack,
        'Wrong wallet adapter': wallet.connected && wallet.wallet && !wallet.wallet.adapter.name.includes('Backpack')
      }
    });
    
    return { healthy, issues, suggestions };
  };

  // Show wallet conflict dialog
  const showWalletConflictDialog = (health: ReturnType<typeof checkWalletHealth>) => {
    const issuesText = health.issues.join('\n• ');
    const suggestionsText = health.suggestions.join('\n• ');
    
    toast.error(`🔧 Wallet Issues Detected:\n• ${issuesText}\n\n💡 Solutions:\n• ${suggestionsText}\n\nRefresh page after fixing.`, {
      duration: 12000,
      style: { whiteSpace: 'pre-line' }
    });
  };

  return (
    <div className="game-container">
      <div className="game-header">
        <h1 className="game-title">🗑️ Trash-Tac-Toe ♻️</h1>
        <p className="game-subtitle">Gorbagana $GOR Wager Gaming</p>
        <p className="game-description">
          Real blockchain gaming with $GOR token wagers on Gorbagana network
        </p>
        
        {/* Connection status */}
        <div style={{margin: '1rem 0', textAlign: 'center'}}>
          <div style={{
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: '0.5rem',
            padding: '0.25rem 0.75rem',
            borderRadius: '20px',
            fontSize: '0.875rem',
            backgroundColor: isConnected ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            border: `1px solid ${isConnected ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
          }}>
            <div style={{
              width: '8px', 
              height: '8px', 
              borderRadius: '50%', 
              backgroundColor: isConnected ? '#22c55e' : '#ef4444'
            }}></div>
            {isConnected ? '🌐 Connected to game servers' : '⚠️ Servers offline - local mode'}
          </div>
          {isPolling && (
            <div style={{marginTop: '0.25rem', fontSize: '0.75rem', color: '#10b981'}}>
              🔄 Syncing game state...
            </div>
          )}
        </div>
      </div>

      <div className="wallet-section">
        {!wallet.connected ? (
          <div className="card">
            <div className="card-header">Connect Wallet</div>
            <p style={{textAlign: 'center', margin: '1rem 0'}}>Please connect your Backpack wallet to play</p>
            <div style={{display: 'flex', justifyContent: 'center'}}>
              <WalletMultiButton />
            </div>
          </div>
        ) : (
          <div>
            {/* Wallet Status and Balance */}
            <div className="card" style={{marginBottom: '1rem'}}>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                <div>
                  <div style={{color: '#10b981', fontWeight: 'bold'}}>
                    ✅ Connected: {wallet.publicKey?.toString().slice(0, 4)}...{wallet.publicKey?.toString().slice(-4)}
                  </div>
                  <div style={{color: '#fbbf24', fontSize: '1.1rem', fontWeight: 'bold'}}>
                    💰 {gorBalance.toFixed(6)} $GOR
                  </div>
                </div>
                <div style={{display: 'flex', gap: '0.5rem'}}>
                  <button 
                    onClick={fetchGorBalance} 
                    className="btn btn-secondary"
                    style={{padding: '0.25rem 0.5rem', fontSize: '0.8rem'}}
                    title="Refresh balance"
                  >
                    🔄 Refresh
                  </button>
                  <button 
                    onClick={() => wallet.disconnect()} 
                    className="btn btn-secondary"
                    style={{padding: '0.25rem 0.5rem', fontSize: '0.8rem'}}
                  >
                    Disconnect
                  </button>
                </div>
              </div>
            </div>

            {/* Wallet Health Status */}
            {walletConflictDetected && (
              <div className="card" style={{
                marginBottom: '1rem',
                background: 'rgba(251, 191, 36, 0.1)',
                border: '1px solid rgba(251, 191, 36, 0.3)'
              }}>
                <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem'}}>
                  <span style={{fontSize: '1.2rem'}}>⚠️</span>
                  <span style={{color: '#fbbf24', fontWeight: 'bold'}}>Wallet Conflicts Detected</span>
                </div>
                <p style={{color: '#fcd34d', fontSize: '0.9rem', margin: '0 0 1rem 0'}}>
                  Multiple wallet extensions may cause transaction failures when joining games
                </p>
                <button 
                  onClick={() => {
                    const health = checkWalletHealth();
                    showWalletConflictDialog(health);
                  }}
                  className="btn btn-secondary"
                  style={{
                    width: '100%', 
                    background: '#f59e0b', 
                    borderColor: '#f59e0b', 
                    color: 'white',
                    fontSize: '0.9rem'
                  }}
                >
                  🔧 Fix Wallet Issues
                </button>
              </div>
            )}
            
            {/* Auto-check wallet health when connected */}
            {(() => {
              if (typeof window !== 'undefined' && wallet.connected) {
                const health = checkWalletHealth();
                if (!health.healthy && !walletConflictDetected) {
                  // FIXED: Only set conflict detected flag for REAL issues
                  // Don't trigger for Backpack's legitimate dual interfaces
                  const hasRealConflicts = health.issues.some(issue => 
                    issue.includes('Active MetaMask') || 
                    issue.includes('Multiple Solana wallets') ||
                    issue.includes('Connected through') ||
                    (issue.includes('conflict') && !issue.includes('Backpack providing both'))
                  );
                  
                  if (hasRealConflicts) {
                    console.log('🚨 REAL wallet conflicts detected, showing warning:', health.issues);
                    setTimeout(() => setWalletConflictDetected(true), 1000);
                  } else {
                    console.log('ℹ️ Wallet health issues detected but no real conflicts (likely Backpack dual interfaces):', health.issues);
                  }
                }
              }
              return null;
            })()}

            {!game ? (
              <div className="card">
                <div className="card-header">Create or Join Game</div>
                
                {!showPublicLobby ? (
                  <div>
                    <div style={{marginBottom: '1rem'}}>
                      <label style={{display: 'block', marginBottom: '0.5rem', color: '#10b981'}}>
                        Wager Amount ($GOR):
                      </label>
                      <input
                        type="text"
                        value={wagerInput}
                        onChange={handleWagerChange}
                        placeholder="0.001"
                        className="input-field"
                        style={{width: '100%'}}
                      />
                      <div style={{fontSize: '0.8rem', color: '#6b7280', marginTop: '0.25rem'}}>
                        Your Balance: {gorBalance.toFixed(6)} $GOR
                      </div>
                    </div>

                    {/* Public/Private Game Selection */}
                    <div style={{marginBottom: '1rem', padding: '0.75rem', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.3)'}}>
                      <label style={{display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#d1d5db', cursor: 'pointer'}}>
                        <input
                          type="checkbox"
                          checked={makeGamePublic}
                          onChange={(e) => setMakeGamePublic(e.target.checked)}
                          style={{width: '16px', height: '16px'}}
                        />
                        <span style={{fontWeight: 'bold', color: '#10b981'}}>
                          📢 Make this game public
                        </span>
                      </label>
                      <div style={{fontSize: '0.8rem', color: '#9ca3af', marginTop: '0.25rem', marginLeft: '1.5rem'}}>
                        {makeGamePublic ? 
                          "Other players can find and join your game from the public lobby" : 
                          "Only players with your Game ID can join (private game)"
                        }
                      </div>
                    </div>

                    <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem'}}>
                      <button
                        onClick={createGame}
                        disabled={loading || !isConnected}
                        className="btn btn-primary"
                      >
                        {loading ? "Creating..." : "🎮 Create Game"}
                      </button>
                      
                      <button
                        onClick={() => setShowPublicLobby(true)}
                        disabled={loading}
                        className="btn btn-secondary"
                      >
                        <Eye className="w-4 h-4 inline mr-1" />
                        Public Lobby
                      </button>
                      
                      <div>
                        <input
                          type="text"
                          placeholder="Game ID"
                          value={gameId}
                          onChange={(e) => setGameId(e.target.value)}
                          className="input-field"
                          style={{width: '100%', marginBottom: '0.5rem'}}
                        />
                        <button
                          onClick={joinGame}
                          disabled={loading || !gameId || !isConnected}
                          className="btn btn-primary"
                          style={{width: '100%', fontSize: '0.9rem'}}
                        >
                          {loading ? "Joining..." : "Join Private"}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem'}}>
                      <h3 style={{color: '#10b981', margin: 0}}>
                        <Trophy className="w-5 h-5 inline mr-2" />
                        Public Wager Games
                      </h3>
                      <button
                        onClick={() => setShowPublicLobby(false)}
                        className="btn btn-secondary"
                        style={{padding: '0.25rem 0.5rem', fontSize: '0.8rem'}}
                      >
                        ✕ Close
                      </button>
                    </div>
                    
                    {publicGames.length === 0 ? (
                      <div style={{textAlign: 'center', padding: '2rem', color: '#6b7280'}}>
                        <p>No public games available</p>
                        <p style={{fontSize: '0.9rem'}}>Create a public game to get started!</p>
                      </div>
                    ) : (
                      <div style={{maxHeight: '300px', overflowY: 'auto'}}>
                        {publicGames.map((publicGame) => (
                          <div key={publicGame.id} style={{
                            background: 'rgba(16, 185, 129, 0.1)',
                            border: '1px solid rgba(16, 185, 129, 0.3)',
                            borderRadius: '8px',
                            padding: '1rem',
                            marginBottom: '0.5rem',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}>
                            <div>
                              <div style={{fontWeight: 'bold', color: '#10b981'}}>
                                Game #{publicGame.id}
                              </div>
                              <div style={{fontSize: '0.9rem', color: '#d1d5db'}}>
                                Wager: {publicGame.wager.toFixed(6)} $GOR
                              </div>
                              <div style={{fontSize: '0.8rem', color: '#9ca3af'}}>
                                by {publicGame.creatorName || 'Anonymous'}
                              </div>
                            </div>
                            <button
                              onClick={() => joinPublicGame(publicGame)}
                              disabled={loading || publicGame.wager > gorBalance}
                              className="btn btn-primary"
                              style={{fontSize: '0.9rem'}}
                            >
                              Join Game
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="card">
                <div className="card-header">Game #{game.id}</div>
                
                {/* Game Status and Actions */}
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-green-300 flex items-center gap-3">
                    <Hash className="w-6 h-6" />
                    Game #{game.id}
                  </h2>
                  
                  {/* Game Actions - Enhanced for both players */}
                  <div className="flex gap-2">
                    {(game.status === 'waiting' || game.status === 'playing') && (
                      <button
                        onClick={abandonGame}
                        disabled={loading}
                        className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold px-4 py-2 rounded-lg disabled:opacity-50 transition-all duration-300 text-sm"
                      >
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          Abandon Game
                        </div>
                      </button>
                    )}
                    
                    {(game.status === 'finished' || game.status === 'abandoned') && (
                      <button
                        onClick={() => {
                          setGame(null);
                          setGameId("");
                        }}
                        className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold px-4 py-2 rounded-lg transition-all duration-300 text-sm"
                      >
                        <div className="flex items-center gap-2">
                          <Plus className="w-4 h-4" />
                          New Game
                        </div>
                      </button>
                    )}
                  </div>
                </div>

                {/* Game Status Display */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="text-center">
                    <div className="text-sm text-gray-400">Status</div>
                    <div className={`text-lg font-bold ${
                      game.status === 'waiting' ? 'text-yellow-400' :
                      game.status === 'playing' ? 'text-green-400' :
                      game.status === 'finished' ? 'text-blue-400' :
                      game.status === 'abandoned' ? 'text-red-400' : 'text-gray-400'
                    }`}>
                      {game.status === 'waiting' && '⏳ Waiting'}
                      {game.status === 'playing' && '🎮 Playing'}
                      {game.status === 'finished' && '🏁 Finished'}
                      {game.status === 'abandoned' && '⏰ Abandoned'}
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-sm text-gray-400">Wager</div>
                    <div className="text-lg font-bold text-green-400">
                      {game.wager > 0 ? `${game.wager.toFixed(6)} $GOR` : 'Free'}
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-sm text-gray-400">Players</div>
                    <div className="text-lg font-bold text-white">
                      {game.playerO ? '2/2' : '1/2'}
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-sm text-gray-400">Turn</div>
                    <div className="text-lg font-bold text-white">
                      {game.status === 'playing' ? (
                        game.currentTurn === 1 ? '🗑️ Trash' : '♻️ Recycle'
                      ) : (
                        game.status === 'finished' ? (
                          game.winner === 1 ? '🗑️ Won' :
                          game.winner === 2 ? '♻️ Won' : '🤝 Tie'
                        ) : (
                          game.status === 'abandoned' ? '⏰ None' : '-'
                        )
                      )}
                    </div>
                  </div>
                </div>

                {/* Abandoned Game Info */}
                {game.status === 'abandoned' && (
                  <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-4 mb-4">
                    <div className="flex items-center gap-2 text-red-400 font-bold mb-2">
                      <Clock className="w-5 h-5" />
                      Game Abandoned
                    </div>
                    <div className="text-sm text-gray-300">
                      {game.abandonReason === 'timeout' && 'Game was abandoned due to inactivity timeout.'}
                      {game.abandonReason === 'player_request' && 'Game was abandoned by player request.'}
                      {game.wager > 0 && ` ${game.wager.toFixed(6)} $GOR has been returned to both players.`}
                    </div>
                  </div>
                )}

                <div className="game-board enhanced">
                  {Array.from({ length: 9 }, (_, i) => (
                    <button
                      key={i}
                      onClick={() => makeMove(i)}
                      disabled={loading || game.status !== "playing" || game.board[i] !== 0}
                      className={getCellClassName(i)}
                      style={{
                        transform: winningCells.includes(i) ? 'scale(1.1)' : 'scale(1)',
                        transition: 'all 0.3s ease',
                      }}
                    >
                      {getCellContent(i)}
                    </button>
                  ))}
                </div>
                
                {/* Game Progress Indicators */}
                {game.status === "playing" && (
                  <div className="turn-indicator">
                    <div className={`player-turn ${game.currentTurn === 1 ? 'active' : ''}`}>
                      🗑️ Trash Cans {wallet.publicKey?.toString() === game.playerX ? '(You)' : ''}
                    </div>
                    <div className="vs-divider">VS</div>
                    <div className={`player-turn ${game.currentTurn === 2 ? 'active' : ''}`}>
                      ♻️ Recycling {wallet.publicKey?.toString() === game.playerO ? '(You)' : ''}
                    </div>
                  </div>
                )}
                
                {/* Winning Animation */}
                {game.status === "finished" && game.winner && (
                  <div className="victory-banner">
                    <div className="victory-content">
                      <div className="victory-icon">
                        {game.winner === 1 ? '🗑️' : '♻️'}
                      </div>
                      <div className="victory-text">
                        {game.winner === 1 ? 'TRASH CANS WIN!' : 'RECYCLING WINS!'}
                      </div>
                      {game.wager > 0 && (
                        <div className="victory-prize">
                          💰 Prize: {(game.wager * 2).toFixed(6)} $GOR
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {game.status === "waiting" && (
                  <div style={{textAlign: 'center', margin: '1rem 0'}}>
                    <p style={{color: '#10b981', fontWeight: 'bold'}}>Share Game ID: {game.id}</p>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(game.id);
                        toast.success("Game ID copied!");
                      }}
                      className="btn btn-secondary"
                      style={{marginTop: '0.5rem'}}
                    >
                      📋 Copy Game ID
                    </button>
                  </div>
                )}

                {game.status === "finished" && (
                  <div style={{textAlign: 'center', marginTop: '1rem'}}>
                    <button
                      onClick={() => {
                        setGame(null);
                        setGameId("");
                      }}
                      className="btn btn-primary"
                    >
                      🎮 Play Again
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
} 