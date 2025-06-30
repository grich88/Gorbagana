"use client";

import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { toast } from 'react-hot-toast';
import { LAMPORTS_PER_SOL, PublicKey, Connection, Transaction, SystemProgram, Keypair } from '@solana/web3.js';
import { Hash, Clock, Plus } from 'lucide-react';

// Game types
type GameStatus = "waiting" | "playing" | "finished" | "abandoned";

interface Game {
  id: string;
  playerX: string;
  playerO?: string;
  board: number[];
  currentTurn: number;
  status: GameStatus;
  winner?: number;
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
  const [game, setGame] = useState<Game | null>(null);
  const [gameId, setGameId] = useState<string>("");
  const [wagerInput, setWagerInput] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [gorBalance, setGorBalance] = useState<number>(0);
  const [isConnected, setIsConnected] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [escrowAccount, setEscrowAccount] = useState<Keypair | null>(null);

  // Create Gorbagana connection (matches user's script)
  const connection = new Connection(GORBAGANA_RPC, {
    commitment: 'confirmed',
    disableRetryOnRateLimit: false,
    wsEndpoint: '', // Explicitly disable WebSocket
    httpHeaders: { 'User-Agent': 'gorbagana-trash-tac-toe' },
  });

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
        if (signError.message?.includes('User rejected')) {
          throw new Error("❌ Transaction was rejected by user");
        } else if (signError.message?.includes('ethereum')) {
          throw new Error("❌ Wallet conflict detected. Disable other wallet extensions and use only Backpack.");
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

  // Test backend connectivity
  useEffect(() => {
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
    testBackend();
  }, []);

  // Check for wallet extension conflicts
  useEffect(() => {
    if (wallet.connected && typeof window !== 'undefined') {
      // Check for problematic wallet extensions
      if (window.ethereum && !window.solana?.isBackpack) {
        console.warn('⚠️ Ethereum wallet detected - this may interfere with Gorbagana transactions');
        toast('⚠️ Multiple wallets detected. For best results, disable MetaMask and use only Backpack.', {
          duration: 8000,
          icon: '⚠️'
        });
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

  // Polling for game updates
  useEffect(() => {
    if (!game || !isConnected) return;

    const pollGame = async () => {
      if (isPolling) return; // Prevent overlapping polls

      try {
        const response = await fetch(`${API_BASE_URL}/api/games/${game.id}`);
        if (!response.ok) {
          console.warn(`Failed to fetch game ${game.id}: ${response.status}`);
          return;
        }

        const data = await response.json();
        const updatedGame = data.game;

        if (updatedGame) {
          setGame(updatedGame);

          // Handle game completion
          if (updatedGame.status === 'finished' || updatedGame.status === 'abandoned') {
            if (updatedGame.winner !== undefined || updatedGame.status === 'abandoned') {
              await handlePrizeDistribution(updatedGame);
            }
          } else if (updatedGame.status === 'playing') {
            // Check for abandoned games during active polling
            await checkForAbandonedGame(updatedGame);
          }
        }
      } catch (error) {
        console.error('❌ Error polling game:', error);
      }
    };

    pollGame(); // Initial poll
    setIsPolling(true);
    const pollInterval = setInterval(pollGame, 5000); // Reduced from 3s to 5s for performance
    
    return () => {
      clearInterval(pollInterval);
      setIsPolling(false);
    };
  }, [game, isConnected]);

  // Handle prize distribution when game ends
  const handlePrizeDistribution = async (finishedGame: Game) => {
    if (!wallet.publicKey || finishedGame.wager <= 0) {
      return;
    }

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
        if (finishedGame.winner === 0) {
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
          toast.error('😢 You lost this game. Better luck next time!');
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

  // Create a new game (with real escrow deposit)
  const createGame = async () => {
    console.log('🎮 Starting game creation...');
    
    if (!wallet.connected || !wallet.publicKey) {
      toast.error("Please connect your wallet first!");
      return;
    }

    if (!isConnected) {
      toast.error("Game servers are offline!");
      return;
    }

    const wagerAmount = parseFloat(wagerInput) || 0;
    console.log(`💰 Wager amount: ${wagerAmount} $GOR`);
    
    if (wagerAmount > gorBalance) {
      toast.error(`Insufficient $GOR balance! You have ${gorBalance.toFixed(4)} $GOR`);
      return;
    }

    // Check for wallet conflicts before starting
    if (typeof window !== 'undefined' && window.ethereum && wagerAmount > 0) {
      console.warn('⚠️ Ethereum wallet detected - potential conflict for escrow transactions');
    }

    setLoading(true);
    
    try {
      const newGameId = Math.floor(1000 + Math.random() * 9000).toString();
      console.log(`🆔 Generated game ID: ${newGameId}`);
      
      let escrowData = null;
      
      // Create escrow deposit if wager > 0
      if (wagerAmount > 0) {
        console.log(`🔐 Creating escrow deposit for ${wagerAmount} $GOR...`);
        toast.loading('🔐 Creating escrow deposit...', { duration: 8000 });
        
        try {
          escrowData = await createEscrowDeposit(wagerAmount, newGameId, true); // Creator
          toast.dismiss();
          console.log('✅ Escrow deposit created successfully:', escrowData);
        } catch (escrowError: any) {
          toast.dismiss();
          console.error('❌ Escrow creation failed:', escrowError);
          setLoading(false);
          
          // Provide specific error messages
          if (escrowError.message.includes('ethereum') || escrowError.message.includes('redefine')) {
            toast.error('❌ Wallet conflict detected! Please disable other wallet extensions and refresh the page.');
          } else if (escrowError.message.includes('rejected')) {
            toast.error('❌ Transaction was cancelled by user');
          } else {
            toast.error(`❌ Escrow creation failed: ${escrowError.message}`);
          }
          return;
        }
      } else {
        console.log('💳 Free game - no escrow needed');
      }
      const newGame: Game = {
        id: newGameId,
        playerX: wallet.publicKey.toString(),
        playerO: undefined,
        board: [0, 0, 0, 0, 0, 0, 0, 0, 0],
        currentTurn: 1,
        status: "waiting",
        createdAt: Date.now(),
        wager: wagerAmount,
        isPublic: true,
        creatorName: "Player 1",
        escrowAccount: escrowData?.escrowAccount,
        txSignature: escrowData?.txSignature,
        playerXDeposit: escrowData?.txSignature
      };

      console.log('💾 Saving game to backend:', {
        gameId: newGame.id,
        wager: newGame.wager,
        escrowAccount: newGame.escrowAccount,
        hasEscrowAccount: !!newGame.escrowAccount
      });

      // Save to backend
      const response = await fetch(`${API_BASE_URL}/api/games`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newGame)
      });

      if (!response.ok) {
        throw new Error('Failed to create game on server');
      }

      const data = await response.json();
      setGame(data.game);
      setGameId(newGameId);
      setLoading(false);
      
      if (wagerAmount > 0) {
        toast.success(`🔒 Game created with ${wagerAmount.toFixed(6)} $GOR wager! Share ID: ${newGameId}`);
      } else {
        toast.success(`🗑️ Free game created! Share ID: ${newGameId}`);
      }
      
      // Refresh balance after transaction
      setTimeout(fetchGorBalance, 2000);
      
    } catch (error) {
      setLoading(false);
      console.error('❌ Failed to create game:', error);
      toast.error("Failed to create game: " + (error as Error).message);
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
      
      // Refresh balance after transaction
      setTimeout(fetchGorBalance, 2000);
      
    } catch (error) {
      setLoading(false);
      console.error('❌ Failed to join game:', error);
      toast.error("Failed to join game: " + (error as Error).message);
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

  // Manual abandon game function
  const abandonGame = async () => {
    if (!wallet.publicKey || !game) {
      toast.error("Cannot abandon game - wallet not connected or no active game!");
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
          <div>
            <WalletMultiButton />
            <p style={{marginTop: '1rem', color: '#9ca3af', fontSize: '0.875rem'}}>
              Connect your Backpack wallet to play with $GOR tokens
            </p>
          </div>
        ) : (
          <div className="wallet-status">
            <div className="status-indicator"></div>
            <span>Connected: {wallet.publicKey?.toString().slice(0, 4)}...{wallet.publicKey?.toString().slice(-4)}</span>
            <button onClick={() => wallet.disconnect()} className="btn btn-secondary" style={{marginLeft: '1rem'}}>
              Disconnect
            </button>
          </div>
        )}
      </div>

      {wallet.connected && (
        <div>
          <div className="balance-display">
            <div className="balance-item balance-gor">
              💰 {gorBalance.toFixed(6)} $GOR
              <button 
                onClick={fetchGorBalance} 
                style={{
                  marginLeft: '0.5rem', 
                  background: 'none', 
                  border: 'none', 
                  color: '#10b981', 
                  cursor: 'pointer',
                  fontSize: '0.75rem'
                }}
                title="Refresh balance"
              >
                🔄
              </button>
            </div>
          </div>

          {!game ? (
            <div className="card">
              <div className="card-header">Create or Join Game</div>
              
              <div className="form-group">
                <label className="form-label">Wager Amount ($GOR)</label>
                <input
                  type="text"
                  value={wagerInput}
                  onChange={handleWagerChange}
                  className="form-input"
                  placeholder="Enter wager amount (e.g. 0.002)"
                />
                <div style={{fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.25rem'}}>
                  Balance: {gorBalance.toFixed(6)} $GOR
                </div>
              </div>

              <div style={{display: 'flex', gap: '1rem', justifyContent: 'center'}}>
                <button
                  onClick={createGame}
                  disabled={loading || !isConnected}
                  className="btn btn-primary"
                >
                  {loading ? "Creating..." : "Create Game"}
                </button>
              </div>

              <div style={{margin: '2rem 0', textAlign: 'center', color: '#9ca3af'}}>
                OR
              </div>

              <div className="form-group">
                <label className="form-label">Join Game by ID</label>
                <input
                  type="text"
                  value={gameId}
                  onChange={(e) => setGameId(e.target.value)}
                  className="form-input"
                  placeholder="Enter 4-digit Game ID"
                />
                <button
                  onClick={joinGame}
                  disabled={loading || !gameId || !isConnected}
                  className="btn btn-primary"
                  style={{marginTop: '0.5rem', width: '100%'}}
                >
                  {loading ? "Joining..." : "Join Game"}
                </button>
              </div>
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
                
                {/* Game Actions */}
                <div className="flex gap-2">
                  {game.status === 'playing' && (
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
                      onClick={() => setGame(null)}
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
  );
} 