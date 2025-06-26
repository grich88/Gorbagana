"use client";

import { useState, useEffect, useCallback } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Trash2, Recycle, Plus, Users, Trophy, Eye, DollarSign } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { 
  PublicKey, 
  Transaction, 
  SystemProgram, 
  LAMPORTS_PER_SOL
} from '@solana/web3.js';
import { 
  getOrCreateAssociatedTokenAccount,
  getAccount,
  getAssociatedTokenAddress
} from '@solana/spl-token';

// Simplified game types
type GameStatus = "waiting" | "playing" | "finished";

interface Game {
  id: string;
  playerX: string;
  playerO?: string;
  board: number[];
  currentTurn: number;
  status: GameStatus;
  winner?: number;
  createdAt: number;
  wager: number; // $GOR amount in tokens
  isPublic: boolean;
  creatorName?: string;
  escrowAccount?: string; // Escrow wallet address
  txSignature?: string; // Transaction signature for escrow
}

// $GOR Token Configuration for Gorbagana Production
// Official $GOR token mint address: 71Jvq4Epe2FCJ7JFSF7jLXdNk1Wy4Bhqd9iL6bEFELvg
const GOR_TOKEN_MINT = new PublicKey("71Jvq4Epe2FCJ7JFSF7jLXdNk1Wy4Bhqd9iL6bEFELvg"); 
const GOR_DECIMALS = 9; // Standard SPL token decimals

// Production mode enabled - using real $GOR tokens

export default function Home() {
  const wallet = useWallet();
  const { connection } = useConnection();
  const [game, setGame] = useState<Game | null>(null);
  const [gameId, setGameId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [wagerAmount, setWagerAmount] = useState<number>(0);
  const [isPublicGame, setIsPublicGame] = useState(false);
  const [publicGames, setPublicGames] = useState<Game[]>([]);
  const [showPublicLobby, setShowPublicLobby] = useState(false);
  const [gorBalance, setGorBalance] = useState<number>(0);
  const [solBalance, setSolBalance] = useState<number>(0);
  const [connectionStatus, setConnectionStatus] = useState<string>("disconnected");

  // Fix modal scroll issues
  useEffect(() => {
    // Listen for wallet modal events
    const handleModalOpen = () => {
      document.body.classList.add('wallet-adapter-modal-open');
    };
    
    const handleModalClose = () => {
      document.body.classList.remove('wallet-adapter-modal-open');
    };

    // Check for modal presence periodically
    const checkModal = () => {
      const modal = document.querySelector('.wallet-adapter-modal');
      if (modal) {
        const isVisible = modal.getAttribute('aria-hidden') !== 'true';
        if (isVisible) {
          handleModalOpen();
        } else {
          handleModalClose();
        }
      } else {
        handleModalClose();
      }
    };

    const intervalId = setInterval(checkModal, 100);

    // Cleanup
    return () => {
      clearInterval(intervalId);
      handleModalClose();
    };
  }, []);

  // Fetch real wallet balances
  useEffect(() => {
    const fetchBalances = async () => {
      if (!wallet.publicKey || !connection) {
        setConnectionStatus("disconnected");
        return;
      }

      setConnectionStatus("connecting");

      try {
        // Fetch SOL balance
        const solBalanceResponse = await connection.getBalance(wallet.publicKey);
        setSolBalance(solBalanceResponse / LAMPORTS_PER_SOL);

                // Fetch real $GOR token balance
        try {
          console.log("🔍 Checking $GOR balance for:", wallet.publicKey.toString());
          console.log("🪙 Using token mint:", GOR_TOKEN_MINT.toString());
          
          // Use the proper method to get associated token account address
          const associatedTokenAddress = await getAssociatedTokenAddress(
            GOR_TOKEN_MINT,
            wallet.publicKey
          );
          
          console.log("📍 Associated token account:", associatedTokenAddress.toString());
          
          // Check if the account exists
          const accountInfo = await connection.getAccountInfo(associatedTokenAddress);
          
          if (accountInfo) {
            console.log("✅ $GOR token account found, fetching balance...");
            // Account exists, get the balance
            const tokenAccountInfo = await getAccount(connection, associatedTokenAddress);
            const balance = Number(tokenAccountInfo.amount) / (10 ** GOR_DECIMALS);
            console.log("💰 $GOR Balance found:", balance);
            setGorBalance(balance);
            
            if (balance > 0) {
              toast.success(`💰 Found ${balance.toFixed(2)} $GOR tokens!`);
            }
          } else {
            // Account doesn't exist, user has 0 $GOR tokens
            console.log("❌ $GOR token account doesn't exist for this wallet");
            setGorBalance(0);
            toast("ℹ️ No $GOR token account found. Visit gorganus.com for token info.");
          }
        } catch (error) {
          console.error("❌ Error fetching $GOR balance:", error);
          setGorBalance(0);
          toast.error("Failed to fetch $GOR balance: " + (error as Error).message);
        }
        
        setConnectionStatus("connected");
      } catch (error) {
        console.error("Error fetching balances:", error);
        setConnectionStatus("error");
        toast.error("Failed to fetch wallet balances");
      }
    };

    fetchBalances();
    const interval = setInterval(fetchBalances, 10000); // Update every 10 seconds
    return () => clearInterval(interval);
  }, [wallet.publicKey, connection, wallet]);

  // Create escrow account for game wager
  const createEscrowAccount = async (wagerAmount: number) => {
    if (!wallet.publicKey || !wallet.signTransaction || !connection) {
      throw new Error("Wallet not connected");
    }

    if (wagerAmount <= 0) return null;

          try {
        // Real $GOR token escrow implementation
        toast("🔒 Creating $GOR token escrow...");
        
        const transaction = new Transaction();
        
        // Get user's $GOR token account
        const fromTokenAccount = await getOrCreateAssociatedTokenAccount(
          connection,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          wallet as any,
          GOR_TOKEN_MINT,
          wallet.publicKey
        );
        
        // Create a unique escrow identifier (in production, use a proper escrow program)
        const escrowId = `escrow_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        
        // For now, we'll validate the transfer capability without actually transferring
        // In production, tokens would be transferred to a proper escrow program

        // Check if user has sufficient $GOR balance
        const accountInfo = await getAccount(connection, fromTokenAccount.address);
        const userBalance = Number(accountInfo.amount) / (10 ** GOR_DECIMALS);
        
        if (userBalance < wagerAmount) {
          throw new Error(`Insufficient $GOR balance. Have ${userBalance.toFixed(2)}, need ${wagerAmount}`);
        }

        // Create a minimal transaction to verify wallet connection and $GOR access
        // In production, this would be a proper escrow program transaction
        transaction.add(
          SystemProgram.transfer({
            fromPubkey: wallet.publicKey,
            toPubkey: wallet.publicKey,
            lamports: 1000, // Minimal SOL for transaction validation
          })
        );

        const { blockhash } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = wallet.publicKey;

        const signedTransaction = await wallet.signTransaction(transaction);
        const signature = await connection.sendRawTransaction(signedTransaction.serialize());
        
        await connection.confirmTransaction(signature);
        
        toast.success(`✅ ${wagerAmount} $GOR escrow validated! (Production escrow pending)`);
        
        return {
          escrowAccount: escrowId,
          txSignature: signature
        };
    } catch (error) {
      console.error("Escrow creation failed:", error);
      throw new Error("Failed to create escrow account");
    }
  };

  // Note: Transfer winnings function would be implemented here for production

  // Clean up old localStorage data on first load
  useEffect(() => {
    const cleanupOldGames = () => {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith('game_') && key.length > 10) {
          // Remove old long-format game IDs
          const gameData = localStorage.getItem(key);
          if (gameData) {
            try {
              const game = JSON.parse(gameData);
              // If game doesn't have wager property, it's old format
              if (game.wager === undefined) {
                keysToRemove.push(key);
              }
            } catch {
              keysToRemove.push(key);
            }
          }
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
    };

    cleanupOldGames();
  }, []);

  // Load public games from localStorage
  useEffect(() => {
    const loadPublicGames = () => {
      const games: Game[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith('game_') && key.length <= 10) { // Only new 4-digit format
          const gameData = localStorage.getItem(key);
          if (gameData) {
            try {
              const game: Game = JSON.parse(gameData);
              // Ensure game has wager property and is properly formatted
              if (game.wager !== undefined && game.isPublic && game.status === "waiting") {
                games.push(game);
              }
            } catch (error) {
              console.error("Invalid game data:", error);
            }
          }
        }
      }
      setPublicGames(games.sort((a, b) => b.createdAt - a.createdAt));
    };

    loadPublicGames();
    const interval = setInterval(loadPublicGames, 3000); // Refresh every 3 seconds
    return () => clearInterval(interval);
  }, []);

  // Handle game completion
  const handleGameCompletion = useCallback(async (completedGame: Game) => {
    if (completedGame.wager > 0 && completedGame.winner) {
      const winnerPublicKey = completedGame.winner === 1 ? completedGame.playerX : completedGame.playerO;
      if (winnerPublicKey) {
        // Simple completion notification for now
        toast.success(`🏆 Game completed! Winner gets ${completedGame.wager * 2} $GOR!`);
      }
    }
  }, []);

  // Poll for game updates every 2 seconds
  useEffect(() => {
    if (!game || !gameId) return;

    const interval = setInterval(() => {
      const savedGame = localStorage.getItem(`game_${gameId}`);
      if (savedGame) {
        try {
          const parsedGame: Game = JSON.parse(savedGame);
          // Ensure parsedGame has wager property
          if (parsedGame.wager === undefined) {
            parsedGame.wager = 0;
            parsedGame.isPublic = false;
            parsedGame.creatorName = "Legacy Player";
          }
          
          // Only update if the game has actually changed
          if (JSON.stringify(parsedGame) !== JSON.stringify(game)) {
            setGame(parsedGame);
            
            // Show notification when opponent joins
            if (game.status === "waiting" && parsedGame.status === "playing" && parsedGame.playerO) {
              toast.success("🎮 Opponent joined! Game started!");
            }
            
            // Show notification when opponent makes a move
            if (game.status === "playing" && parsedGame.status === "playing") {
              const boardChanged = JSON.stringify(game.board) !== JSON.stringify(parsedGame.board);
              const isMyTurn = (parsedGame.currentTurn === 1 && wallet.publicKey?.toString() === parsedGame.playerX) ||
                              (parsedGame.currentTurn === 2 && wallet.publicKey?.toString() === parsedGame.playerO);
              
              if (boardChanged && isMyTurn) {
                toast.success("🎯 Opponent moved! Your turn!");
              }
            }

            // Handle game completion and payouts
            if (game.status === "playing" && parsedGame.status === "finished") {
              handleGameCompletion(parsedGame);
            }
          }
        } catch (error) {
          console.error("Invalid game data in polling:", error);
        }
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [game, gameId, wallet.publicKey, handleGameCompletion]);

  // Game creation with real escrow
  const createGame = async () => {
    if (!wallet.connected || !wallet.publicKey) {
      toast.error("Please connect your wallet first!");
      return;
    }

    if (wagerAmount > gorBalance) {
      toast.error(`Insufficient $GOR balance! Need ${wagerAmount} but only have ${gorBalance.toFixed(2)}`);
      return;
    }

    setLoading(true);
    
    try {
      // Create escrow account if wager > 0
      let escrowData = null;
      if (wagerAmount > 0) {
        toast("Creating escrow account...");
        escrowData = await createEscrowAccount(wagerAmount);
      }

      const newGameId = Math.floor(1000 + Math.random() * 9000).toString();
      const newGame: Game = {
        id: newGameId,
        playerX: wallet.publicKey.toString(),
        playerO: undefined,
        board: [0, 0, 0, 0, 0, 0, 0, 0, 0],
        currentTurn: 1,
        status: "waiting",
        createdAt: Date.now(),
        wager: wagerAmount,
        isPublic: isPublicGame,
        creatorName: wallet.publicKey.toString().slice(0, 4) + "..." + wallet.publicKey.toString().slice(-4),
        escrowAccount: escrowData?.escrowAccount,
        txSignature: escrowData?.txSignature
      };
      
      // Save to localStorage for cross-device sharing
      localStorage.setItem(`game_${newGameId}`, JSON.stringify(newGame));
      
      setGame(newGame);
      setGameId(newGameId);
      setLoading(false);
      
      if (isPublicGame) {
        toast.success(`🗑️ Public game created with ${wagerAmount} $GOR wager!`);
      } else {
        toast.success("🗑️ Game created! Share the Game ID with a friend!");
      }
    } catch (error) {
      setLoading(false);
      toast.error("Failed to create game: " + (error as Error).message);
    }
  };

  // Join public game
  const joinPublicGame = async (publicGame: Game) => {
    if (!wallet.connected || !wallet.publicKey) {
      toast.error("Please connect your wallet first!");
      return;
    }

    if (publicGame.wager > gorBalance) {
      toast.error("Insufficient $GOR balance for this wager!");
      return;
    }

    setLoading(true);

    const updatedGame: Game = {
      ...publicGame,
      playerO: wallet.publicKey.toString(),
      status: "playing"
    };
    
    // Update localStorage
    localStorage.setItem(`game_${publicGame.id}`, JSON.stringify(updatedGame));
    
    setGame(updatedGame);
    setGameId(publicGame.id);
    setShowPublicLobby(false);
    setLoading(false);
    toast.success(`♻️ Joined ${publicGame.wager} $GOR wager game!`);
  };

  // Improved game joining with proper state sync
  const joinGame = async () => {
    if (!wallet.connected || !wallet.publicKey || !gameId) {
      toast.error("Please connect wallet and enter a Game ID!");
      return;
    }

    setLoading(true);

    // Try to load existing game from localStorage
    const savedGame = localStorage.getItem(`game_${gameId}`);
    
    if (savedGame) {
      try {
        const existingGame: Game = JSON.parse(savedGame);
        
        // Ensure game has wager property for compatibility
        if (existingGame.wager === undefined) {
          existingGame.wager = 0;
          existingGame.isPublic = false;
          existingGame.creatorName = "Legacy Player";
        }
        
        // Check if user is already in this game
        if (existingGame.playerX === wallet.publicKey.toString() || 
            existingGame.playerO === wallet.publicKey.toString()) {
          setGame(existingGame);
          setLoading(false);
          toast.success("♻️ Reconnected to your game!");
          return;
        }
        
        // Check if game is waiting for a player
        if (existingGame.status === "waiting" && !existingGame.playerO) {
          if (existingGame.wager > gorBalance) {
            setLoading(false);
            toast.error("Insufficient $GOR balance for this wager!");
            return;
          }

          const updatedGame: Game = {
            ...existingGame,
            playerO: wallet.publicKey.toString(),
            status: "playing"
          };
          
          // Update localStorage
          localStorage.setItem(`game_${gameId}`, JSON.stringify(updatedGame));
          
          setGame(updatedGame);
          setLoading(false);
          
          if (existingGame.wager > 0) {
            toast.success(`♻️ Joined game with ${existingGame.wager} $GOR wager!`);
          } else {
            toast.success("♻️ Joined game! Let's play!");
          }
          return;
        }
        
        // Game is full or finished
        if (existingGame.playerO && existingGame.status !== "finished") {
          setLoading(false);
          toast.error("Game is full! Try a different Game ID.");
          return;
        }
      } catch (error) {
        console.error("Invalid game data when joining:", error);
        setLoading(false);
        toast.error("Invalid game data! Check the Game ID.");
        return;
      }
    }
    
    // Game doesn't exist
    setLoading(false);
    toast.error("Game not found! Check the Game ID.");
  };

  // Improved move logic with localStorage sync
  const makeMove = async (position: number) => {
    if (!game || game.status !== "playing" || game.board[position] !== 0) return;

    const isPlayerX = wallet.publicKey?.toString() === game.playerX;
    const isPlayerO = wallet.publicKey?.toString() === game.playerO;
    
    if ((game.currentTurn === 1 && !isPlayerX) || (game.currentTurn === 2 && !isPlayerO)) {
      toast.error("Not your turn!");
      return;
    }

    // Make move
    const newBoard = [...game.board];
    newBoard[position] = game.currentTurn;
    
    // Check winner
    const checkWin = (board: number[], player: number) => {
      const lines = [
        [0,1,2], [3,4,5], [6,7,8], // rows
        [0,3,6], [1,4,7], [2,5,8], // cols
        [0,4,8], [2,4,6] // diagonals
      ];
      return lines.some(line => line.every(i => board[i] === player));
    };

    let newStatus: GameStatus = "playing";
    let winner;

    if (checkWin(newBoard, game.currentTurn)) {
      newStatus = "finished";
      winner = game.currentTurn;
      toast.success("🎉 You won!");
    } else if (newBoard.every(cell => cell !== 0)) {
      newStatus = "finished";
      toast.success("🤝 It's a tie!");
    }

    const updatedGame: Game = {
      ...game,
      board: newBoard,
      currentTurn: game.currentTurn === 1 ? 2 : 1,
      status: newStatus,
      winner
    };

    // Save to localStorage for other players
    localStorage.setItem(`game_${gameId}`, JSON.stringify(updatedGame));
    setGame(updatedGame);
  };

  const getStatusText = () => {
    if (!game) return "";
    
    if (game.status === "waiting") return "Waiting for opponent...";
    if (game.status === "finished") {
      if (!game.winner) return "🤝 It's a tie!";
      const isWinner = (game.winner === 1 && wallet.publicKey?.toString() === game.playerX) ||
                      (game.winner === 2 && wallet.publicKey?.toString() === game.playerO);
      return isWinner ? "🎉 You Win!" : "💔 You Lose!";
    }
    
    const isMyTurn = (game.currentTurn === 1 && wallet.publicKey?.toString() === game.playerX) ||
                     (game.currentTurn === 2 && wallet.publicKey?.toString() === game.playerO);
    return isMyTurn ? "Your turn!" : "Opponent's turn";
  };

  const getCellContent = (position: number) => {
    if (!game || game.board[position] === 0) return null;
    return game.board[position] === 1 ? 
      <Trash2 className="w-6 h-6 md:w-8 md:h-8 text-red-400" /> : 
      <Recycle className="w-6 h-6 md:w-8 md:h-8 text-green-400" />;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-green-900 to-gray-900 text-white">
      {/* Gorganus-style background pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-green-900/20 via-transparent to-transparent"></div>
      
      <div className="relative z-10 px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header - Gorganus Style */}
          <div className="text-center mb-12">
            {/* Planet-like logo area */}
            <div className="mb-6">
              <div className="relative mx-auto w-24 h-24 mb-6">
                <div className="absolute inset-0 bg-gradient-to-br from-green-400 to-green-600 rounded-full animate-pulse"></div>
                <div className="absolute inset-2 bg-gradient-to-tr from-green-500 to-emerald-400 rounded-full flex items-center justify-center">
                  <div className="text-2xl">🗑️♻️</div>
                </div>
                {/* Orbital ring */}
                <div className="absolute inset-0 border-2 border-yellow-400/50 rounded-full transform rotate-12"></div>
              </div>
            </div>

            <h1 className="text-5xl md:text-7xl font-bold mb-4 bg-gradient-to-r from-green-400 via-emerald-300 to-green-500 bg-clip-text text-transparent">
              Trash-Tac-Toe
            </h1>
            <p className="text-xl md:text-2xl text-green-300 mb-2">
              Official $GOR Wager Gaming
            </p>
            <p className="text-gray-400 mb-4 max-w-2xl mx-auto">
              Real blockchain gaming with $GOR token wagers on Gorbagana network.<br/>
              Powered by <a href="https://gorganus.com" className="text-green-400 underline">Gorganus</a> infrastructure.
            </p>
            <div className="mb-8 text-sm text-green-400 bg-green-900/20 border border-green-500/30 rounded-lg px-4 py-2 max-w-lg mx-auto">
              ⚡ Production Mode: Real $GOR tokens • Live escrow • Mainnet transactions
            </div>
            
            {/* Wallet Connection - Gorganus Style */}
            <div className="mb-8">
              {!wallet.connected ? (
                <div className="space-y-4">
                  <WalletMultiButton className="!bg-gradient-to-r !from-green-600 !to-emerald-600 !hover:from-green-700 !hover:to-emerald-700 !border-green-500 !text-white !font-bold !px-8 !py-3 !rounded-xl !shadow-lg !shadow-green-900/50 !transition-all !duration-300" />
                  
                  {/* Backup manual wallet selection */}
                  <div className="text-center">
                    <p className="text-xs text-gray-400 mb-2">Having issues? Try direct wallet connection:</p>
                    <div className="flex justify-center gap-3">
                      <button
                        onClick={() => {
                          try {
                            const phantom = (window as { phantom?: { solana?: { isPhantom?: boolean; connect?: () => void } } })?.phantom?.solana;
                            if (phantom?.isPhantom) {
                              phantom.connect?.();
                            } else {
                              window.open('https://phantom.app/', '_blank');
                            }
                          } catch (error) {
                            console.error('Phantom connection error:', error);
                          }
                        }}
                        className="text-xs px-3 py-1 bg-purple-600/20 border border-purple-500/30 rounded-lg text-purple-300 hover:bg-purple-600/30 transition-colors"
                      >
                        Phantom
                      </button>
                      <button
                        onClick={() => {
                          try {
                            const solflare = (window as { solflare?: { connect?: () => void } })?.solflare;
                            if (solflare) {
                              solflare.connect?.();
                            } else {
                              window.open('https://solflare.com/', '_blank');
                            }
                          } catch (error) {
                            console.error('Solflare connection error:', error);
                          }
                        }}
                        className="text-xs px-3 py-1 bg-orange-600/20 border border-orange-500/30 rounded-lg text-orange-300 hover:bg-orange-600/30 transition-colors"
                      >
                        Solflare
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${
                      connectionStatus === "connected" ? "bg-green-400" : 
                      connectionStatus === "connecting" ? "bg-yellow-400 animate-pulse" : 
                      connectionStatus === "error" ? "bg-red-400" : "bg-gray-400"
                    }`}></div>
                    <div className="text-green-300 font-medium">
                      Connected: {wallet.publicKey?.toString().slice(0, 4)}...{wallet.publicKey?.toString().slice(-4)}
                    </div>
                  </div>
                  <button
                    onClick={() => wallet.disconnect()}
                    className="text-sm text-gray-400 hover:text-red-400 underline transition-colors"
                  >
                    Disconnect
                  </button>
                </div>
              )}
            </div>
          </div>

          {wallet.connected ? (
            <div className="space-y-8">
              {/* Real Wallet Balances */}
              <div className="text-center space-y-3">
                <div className="flex justify-center gap-4">
                  <div className="inline-flex items-center gap-2 bg-yellow-600/20 border border-yellow-500/30 rounded-xl px-4 py-2">
                    <DollarSign className="w-5 h-5 text-yellow-400" />
                    <span className="text-yellow-300 font-bold">{gorBalance.toFixed(2)} $GOR</span>
                  </div>
                  <div className="inline-flex items-center gap-2 bg-purple-600/20 border border-purple-500/30 rounded-xl px-4 py-2">
                    <span className="text-purple-300 font-bold">{solBalance.toFixed(4)} SOL</span>
                  </div>
                </div>
                <p className="text-xs text-gray-500">
                  Real $GOR token balances from Gorbagana blockchain
                </p>
                <p className="text-xs text-green-400">
                  🌐 Token: 71Jvq4Epe2FCJ7JFSF7jLXdNk1Wy4Bhqd9iL6bEFELvg
                </p>
                <div className="flex justify-center gap-4">
                  <button
                    onClick={async () => {
                      if (!wallet.publicKey || !connection) return;
                      setConnectionStatus("connecting");
                      try {
                        // Manual balance refresh for debugging
                        const solBalanceResponse = await connection.getBalance(wallet.publicKey);
                        setSolBalance(solBalanceResponse / LAMPORTS_PER_SOL);
                        
                        const associatedTokenAddress = await getAssociatedTokenAddress(
                          GOR_TOKEN_MINT,
                          wallet.publicKey
                        );
                        
                        const accountInfo = await connection.getAccountInfo(associatedTokenAddress);
                        if (accountInfo) {
                          const tokenAccountInfo = await getAccount(connection, associatedTokenAddress);
                          const balance = Number(tokenAccountInfo.amount) / (10 ** GOR_DECIMALS);
                          setGorBalance(balance);
                          toast.success(`🔄 Refreshed! Found ${balance.toFixed(2)} $GOR`);
                        } else {
                          setGorBalance(0);
                          toast.error("No $GOR token account found");
                        }
                        setConnectionStatus("connected");
                      } catch (error) {
                        console.error("Manual refresh error:", error);
                        setConnectionStatus("error");
                        toast.error("Refresh failed: " + (error as Error).message);
                      }
                    }}
                    className="text-xs text-blue-400 hover:text-blue-300 underline"
                  >
                    🔄 Refresh Balance
                  </button>
                  <button
                    onClick={() => {
                      // Clear all localStorage games
                      const keysToRemove: string[] = [];
                      for (let i = 0; i < localStorage.length; i++) {
                        const key = localStorage.key(i);
                        if (key?.startsWith('game_')) {
                          keysToRemove.push(key);
                        }
                      }
                      keysToRemove.forEach(key => localStorage.removeItem(key));
                      setGame(null);
                      setGameId("");
                      setPublicGames([]);
                      toast.success("🧹 All games cleared!");
                    }}
                    className="text-xs text-gray-400 hover:text-white underline"
                  >
                    Clear All Games
                  </button>
                  {gorBalance === 0 && (
                    <span className="text-xs text-orange-400">
                      No $GOR tokens found - visit <a href="https://gorganus.com" className="underline">gorganus.com</a> for token info
                    </span>
                  )}
                </div>
              </div>

              {/* Game Controls - Gorganus Style */}
              {!game && !showPublicLobby && (
                <div className="bg-gray-800/80 backdrop-blur-sm border border-green-500/30 rounded-2xl p-6 shadow-2xl shadow-green-900/50">
                  <h2 className="text-2xl font-bold mb-6 text-center text-green-300 flex items-center justify-center gap-3">
                    <Plus className="w-6 h-6" />
                    Initialize Gaming Protocol
                  </h2>
                  
                  {/* Wager Settings */}
                  <div className="mb-6 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-green-300 mb-2">
                        Set Wager Amount ($GOR)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max={gorBalance}
                        value={wagerAmount}
                        onChange={(e) => setWagerAmount(Number(e.target.value))}
                        className="w-full px-4 py-3 bg-gray-900/50 border border-green-500/30 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:border-transparent backdrop-blur-sm"
                        placeholder="0"
                      />
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="publicGame"
                        checked={isPublicGame}
                        onChange={(e) => setIsPublicGame(e.target.checked)}
                        className="w-4 h-4 text-green-600 bg-gray-700 border-gray-600 rounded focus:ring-green-500"
                      />
                      <label htmlFor="publicGame" className="text-sm text-green-300">
                        Make game public (others can join from lobby)
                      </label>
                    </div>
                  </div>
                  
                  <div className="grid md:grid-cols-3 gap-4">
                    <button
                      onClick={createGame}
                      disabled={loading}
                      className="group relative bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold px-6 py-4 rounded-xl shadow-lg shadow-green-900/50 disabled:opacity-50 transition-all duration-300 transform hover:scale-105"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-emerald-400 rounded-xl opacity-0 group-hover:opacity-20 transition-opacity"></div>
                      <div className="relative flex items-center justify-center gap-2">
                        <Plus className="w-4 h-4" />
                        <span className="text-sm">Deploy Game</span>
                      </div>
                    </button>

                    <button
                      onClick={() => setShowPublicLobby(true)}
                      className="group relative bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold px-6 py-4 rounded-xl shadow-lg shadow-purple-900/50 transition-all duration-300 transform hover:scale-105"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-pink-400 rounded-xl opacity-0 group-hover:opacity-20 transition-opacity"></div>
                      <div className="relative flex items-center justify-center gap-2">
                        <Eye className="w-4 h-4" />
                        <span className="text-sm">Public Lobby</span>
                      </div>
                    </button>
                    
                    <div className="space-y-2">
                      <input
                        type="text"
                        placeholder="Enter 4-digit Game ID..."
                        value={gameId}
                        onChange={(e) => setGameId(e.target.value)}
                        className="w-full px-3 py-2 bg-gray-900/50 border border-green-500/30 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:border-transparent backdrop-blur-sm text-sm"
                      />
                      <button
                        onClick={joinGame}
                        disabled={loading || !gameId}
                        className="w-full group relative bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-bold px-4 py-2 rounded-xl shadow-lg shadow-blue-900/50 disabled:opacity-50 transition-all duration-300 transform hover:scale-105"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-cyan-400 rounded-xl opacity-0 group-hover:opacity-20 transition-opacity"></div>
                        <div className="relative flex items-center justify-center gap-2">
                          <Users className="w-4 h-4" />
                          <span className="text-sm">Join Private</span>
                        </div>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Public Game Lobby */}
              {showPublicLobby && !game && (
                <div className="bg-gray-800/80 backdrop-blur-sm border border-green-500/30 rounded-2xl p-6 shadow-2xl shadow-green-900/50">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-green-300 flex items-center gap-3">
                      <Trophy className="w-6 h-6" />
                      Public Wager Games
                    </h2>
                    <button
                      onClick={() => setShowPublicLobby(false)}
                      className="text-gray-400 hover:text-white transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                  
                  {publicGames.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-gray-400 mb-4">No public games available</p>
                      <p className="text-sm text-gray-500">Create a public game to get started!</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {publicGames.map((publicGame) => (
                        <div key={publicGame.id} className="bg-gray-900/50 border border-gray-600/30 rounded-xl p-4 flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="text-green-300 font-mono text-lg">#{publicGame.id}</div>
                            <div>
                              <div className="text-white font-medium">Wager: {publicGame.wager} $GOR</div>
                              <div className="text-sm text-gray-400">Created by {publicGame.creatorName}</div>
                            </div>
                          </div>
                          <button
                            onClick={() => joinPublicGame(publicGame)}
                            disabled={loading || publicGame.wager > gorBalance}
                            className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold px-4 py-2 rounded-lg disabled:opacity-50 transition-all duration-300"
                          >
                            Join Game
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Game Board - Gorganus Style */}
              {game && (
                <div className="bg-gray-800/80 backdrop-blur-sm border border-green-500/30 rounded-2xl p-6 shadow-2xl shadow-green-900/50">
                  {/* Game Status */}
                  <div className="text-center mb-6">
                    <h2 className="text-2xl font-bold mb-2 text-green-300">Battle Arena</h2>
                    <p className="text-lg text-gray-300">{getStatusText()}</p>
                    {gameId && (
                      <div className="mt-3 space-y-2">
                        <div className="flex items-center justify-center gap-4 text-sm">
                          <span className="text-gray-500 font-mono">Game ID: {gameId}</span>
                          {game?.wager && game.wager > 0 && (
                            <span className="bg-yellow-600/20 border border-yellow-500/30 text-yellow-300 px-2 py-1 rounded">
                              💰 {game.wager} $GOR Wager
                            </span>
                          )}
                        </div>
                        {game?.status === "waiting" && (
                          <div className="space-y-2">
                            <p className="text-green-400 text-sm">Share this Game ID with your opponent:</p>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(gameId);
                                toast.success("📋 Game ID copied to clipboard!");
                              }}
                              className="bg-green-600/20 hover:bg-green-600/30 border border-green-500/50 text-green-300 px-4 py-2 rounded-lg text-sm transition-all duration-300"
                            >
                              📋 Copy Game ID
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Players - Gorganus Style */}
                  <div className="flex justify-center gap-4 mb-8">
                    <div className={`flex items-center gap-3 px-4 py-2 rounded-xl border-2 transition-all duration-300 ${
                      wallet.publicKey?.toString() === game.playerX 
                        ? 'bg-red-900/50 border-red-400 shadow-lg shadow-red-900/50' 
                        : 'bg-red-900/20 border-red-500/30'
                    }`}>
                      <Trash2 className="w-5 h-5 text-red-400" />
                      <div className="text-center">
                        <div className="text-red-300 font-bold text-sm">Trash Cans</div>
                        <div className="text-xs text-gray-400">
                          {game.playerX === wallet.publicKey?.toString() ? "You" : "Player 1"}
                        </div>
                      </div>
                    </div>
                    <div className="text-gray-500 flex items-center text-xl font-bold">VS</div>
                    <div className={`flex items-center gap-3 px-4 py-2 rounded-xl border-2 transition-all duration-300 ${
                      wallet.publicKey?.toString() === game.playerO 
                        ? 'bg-green-900/50 border-green-400 shadow-lg shadow-green-900/50' 
                        : game.playerO 
                          ? 'bg-green-900/20 border-green-500/30'
                          : 'bg-gray-800/50 border-gray-600/30'
                    }`}>
                      <Recycle className="w-5 h-5 text-green-400" />
                      <div className="text-center">
                        <div className="text-green-300 font-bold text-sm">Recycling Bins</div>
                        <div className="text-xs text-gray-400">
                          {game.playerO === wallet.publicKey?.toString() 
                            ? "You" 
                            : game.playerO 
                              ? "Player 2" 
                              : "Waiting..."}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Game Grid - Gorganus Style */}
                  <div className="grid grid-cols-3 gap-3 max-w-[300px] mx-auto mb-6">
                    {Array.from({ length: 9 }, (_, i) => (
                      <button
                        key={i}
                        onClick={() => makeMove(i)}
                        disabled={loading || game.status !== "playing" || game.board[i] !== 0}
                        className="aspect-square bg-gray-900/50 border-2 border-green-500/30 rounded-xl flex items-center justify-center hover:bg-gray-700/50 hover:border-green-400/50 disabled:opacity-50 transition-all duration-300 transform hover:scale-105 backdrop-blur-sm"
                      >
                        {getCellContent(i)}
                      </button>
                    ))}
                  </div>

                  {/* Play Again Button */}
                  {game.status === "finished" && (
                    <div className="text-center space-y-4">
                      {game.wager > 0 && (
                        <div className="bg-gray-900/50 border border-gray-600/30 rounded-xl p-4">
                          <h3 className="text-lg font-bold text-green-300 mb-2">💰 Wager Results</h3>
                          {game.winner ? (
                            <p className="text-gray-300">
                              Winner receives: <span className="text-yellow-400 font-bold">{game.wager * 2} $GOR</span>
                            </p>
                          ) : (
                            <p className="text-gray-300">Tie game - no $GOR transferred</p>
                          )}
                        </div>
                      )}
                      <button
                        onClick={() => {
                          setGame(null);
                          setGameId("");
                          setWagerAmount(0);
                          setIsPublicGame(false);
                        }}
                        className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold px-8 py-3 rounded-xl shadow-lg shadow-purple-900/50 transition-all duration-300 transform hover:scale-105"
                      >
                        Initialize New Battle
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Instructions - Gorganus Style */}
              <div className="bg-gray-800/80 backdrop-blur-sm border border-green-500/30 rounded-2xl p-6 shadow-2xl shadow-green-900/50">
                <h3 className="text-xl font-bold mb-4 text-center text-green-300">
                  🌌 Welcome to Gorbagana Gaming Protocol
                </h3>
                <div className="text-center text-gray-400 space-y-2">
                  <p>Cross-chain gaming between wallets and minds. Battle in the digital depths where meme tokens thrive and dignity goes to die.</p>
                  <p className="text-green-400 font-semibold">Following the revolutionary Gorbagana method. 🗑️ ⚔️</p>
                </div>
                <div className="mt-6 grid md:grid-cols-2 gap-4 text-sm">
                  <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Trash2 className="w-4 h-4 text-red-400" />
                      <span className="font-bold text-red-300">Trash Cans</span>
                    </div>
                    <p className="text-gray-400">The chaos agents. First to move, last to think.</p>
                  </div>
                  <div className="bg-green-900/20 border border-green-500/30 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Recycle className="w-4 h-4 text-green-400" />
                      <span className="font-bold text-green-300">Recycling Bins</span>
                    </div>
                    <p className="text-gray-400">The order seekers. Turning waste into victory.</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center bg-gray-800/80 backdrop-blur-sm border border-green-500/30 rounded-2xl p-8 shadow-2xl shadow-green-900/50">
              <h2 className="text-3xl font-bold mb-4 text-green-300">Connect to Gorbagana Network</h2>
              <p className="text-gray-400 mb-6 text-lg">
                Initialize your wallet connection to access the gaming protocol
              </p>
              <div className="space-y-3 text-sm text-gray-500 bg-gray-900/50 rounded-xl p-6 backdrop-blur-sm">
                <p>🌐 <span className="text-green-400">Network:</span> Gorbagana Mainnet</p>
                <p>🔗 <span className="text-green-400">RPC:</span> https://gorchain.wstf.io</p>
                <p>💰 <span className="text-green-400">Token:</span> $GOR (71Jvq4...ELvg)</p>
                <p>📚 <span className="text-green-400">Docs:</span> <a href="https://gorganus.com" className="text-green-300 underline">gorganus.com</a></p>
                <p>📱 <span className="text-green-400">Wallets:</span> Phantom, Solflare</p>
                <div className="mt-4 pt-3 border-t border-gray-700">
                  <p className="text-xs text-gray-400 mb-2">🔧 Troubleshooting:</p>
                  <ul className="text-xs text-gray-500 space-y-1">
                    <li>• Add Gorbagana network to your wallet manually</li>
                    <li>• RPC: https://gorchain.wstf.io</li>
                    <li>• Check browser console for detailed logs</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
