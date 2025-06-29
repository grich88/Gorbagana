"use client";

import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { toast } from 'react-hot-toast';
import { LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';

// Game types
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
  wager: number;
  isPublic: boolean;
  creatorName?: string;
}

// API Configuration
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://gorbagana-trash-tac-toe-backend.onrender.com'
  : 'http://localhost:3002';

console.log('🔍 Testing backend connection:', API_BASE_URL + '/health');

export default function SimpleGame() {
  const wallet = useWallet();
  const [game, setGame] = useState<Game | null>(null);
  const [gameId, setGameId] = useState<string>("");
  const [wagerInput, setWagerInput] = useState<string>("0.002");
  const [loading, setLoading] = useState(false);
  const [gorBalance, setGorBalance] = useState<number>(0);
  const [isConnected, setIsConnected] = useState(false);
  const [isPolling, setIsPolling] = useState(false);

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
        console.log('⚠️ Using demo balance - RPC endpoints unavailable');
        toast('⚠️ Demo balance - RPC connection failed', { duration: 3000 });
      }
      
      if (gorBalance === 0 && !data.demo) {
        toast.error('⚠️ Zero $GOR balance - you need $GOR tokens to play!');
      }
      
    } catch (error) {
      console.error('❌ Failed to fetch $GOR balance via proxy:', error);
      
      // On connection error, set demo balance if no balance exists
      setGorBalance(prev => prev || 0.99996);
      console.log('⚠️ Using fallback demo balance - proxy connection failed');
      toast.error('⚠️ Balance service unavailable - using demo balance');
    }
  }, [wallet.connected, wallet.publicKey]);

  // Fetch balance when wallet connects
  useEffect(() => {
    if (wallet.connected && wallet.publicKey) {
      fetchGorBalance();
      // Refresh balance every 30 seconds
      const interval = setInterval(fetchGorBalance, 30000);
      return () => clearInterval(interval);
    } else {
      setGorBalance(0);
    }
  }, [wallet.connected, wallet.publicKey, fetchGorBalance]);

  // Real-time game polling for cross-device sync
  useEffect(() => {
    if (!game || !isConnected) return;

    const pollGame = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/games/${game.id}`);
        if (response.ok) {
          const data = await response.json();
          const updatedGame = data.game;
          
          // Only update if game state actually changed
          if (JSON.stringify(updatedGame) !== JSON.stringify(game)) {
            console.log('🔄 Game state updated from server');
            setGame(updatedGame);
            
            // Notify about game status changes
            if (updatedGame.status === 'playing' && game.status === 'waiting') {
              toast.success('🎮 Opponent joined! Game started!');
            } else if (updatedGame.status === 'finished' && game.status === 'playing') {
              if (updatedGame.winner === 1) {
                toast.success('🗑️ Trash Cans win!');
              } else if (updatedGame.winner === 2) {
                toast.success('♻️ Recycling Bins win!');
              } else {
                toast('🤝 Game ended in a tie!');
              }
            }
          }
        }
      } catch (error) {
        console.error('❌ Failed to poll game state:', error);
      }
    };

    setIsPolling(true);
    const pollInterval = setInterval(pollGame, 3000); // Poll every 3 seconds
    
    return () => {
      clearInterval(pollInterval);
      setIsPolling(false);
    };
  }, [game, isConnected]);

  // Create a new game (with backend API)
  const createGame = async () => {
    if (!wallet.connected || !wallet.publicKey) {
      toast.error("Please connect your wallet first!");
      return;
    }

    if (!isConnected) {
      toast.error("Game servers are offline!");
      return;
    }

    const wagerAmount = parseFloat(wagerInput) || 0;
    
    if (wagerAmount > gorBalance) {
      toast.error(`Insufficient $GOR balance! You have ${gorBalance.toFixed(4)} $GOR`);
      return;
    }

    setLoading(true);
    
    try {
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
        isPublic: true,
        creatorName: "Player 1"
      };

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
      
      toast.success(`🗑️ Game created! Share ID: ${newGameId}`);
    } catch (error) {
      setLoading(false);
      console.error('❌ Failed to create game:', error);
      toast.error("Failed to create game: " + (error as Error).message);
    }
  };

  // Join a game (with backend API)
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

      // Check wager requirements
      if (existingGame.wager > gorBalance) {
        setLoading(false);
        toast.error(`Insufficient $GOR! This game requires ${existingGame.wager.toFixed(4)} $GOR`);
        return;
      }

      // Join the game
      const joinResponse = await fetch(`${API_BASE_URL}/api/games/${gameId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerAddress: wallet.publicKey.toString(),
          playerName: 'Player 2'
        })
      });

      if (!joinResponse.ok) {
        const errorData = await joinResponse.json();
        throw new Error(errorData.error || 'Failed to join game');
      }

      const data = await joinResponse.json();
      setGame(data.game);
      setLoading(false);
      toast.success("🎮 Successfully joined game!");
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

  // Get cell content with proper styling
  const getCellContent = (position: number) => {
    if (game?.board[position] === 1) {
      return <span className="game-cell x">🗑️</span>;
    }
    if (game?.board[position] === 2) {
      return <span className="game-cell o">♻️</span>;
    }
    return "";
  };

  // Handle wager input with validation
  const handleWagerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow empty string, numbers, and decimal points
    if (value === '' || /^[0-9]*\.?[0-9]*$/.test(value)) {
      setWagerInput(value);
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
                  placeholder="0.002"
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
              
              <div className={`game-status ${game.status}`}>
                {game.status === "waiting" && "⏳ Waiting for opponent..."}
                {game.status === "playing" && (
                  <>
                    🎮 Game in progress! 
                    {wallet.publicKey?.toString() === game.playerX && game.currentTurn === 1 && " (Your turn - 🗑️)"}
                    {wallet.publicKey?.toString() === game.playerO && game.currentTurn === 2 && " (Your turn - ♻️)"}
                    {wallet.publicKey?.toString() === game.playerX && game.currentTurn === 2 && " (Opponent's turn)"}
                    {wallet.publicKey?.toString() === game.playerO && game.currentTurn === 1 && " (Opponent's turn)"}
                  </>
                )}
                {game.status === "finished" && game.winner && `🏆 ${game.winner === 1 ? 'Trash Cans' : 'Recycling Bins'} win!`}
                {game.status === "finished" && !game.winner && "🤝 It's a tie!"}
              </div>

              {game.wager > 0 && (
                <div style={{textAlign: 'center', margin: '1rem 0', padding: '0.5rem', background: 'rgba(251, 191, 36, 0.1)', border: '1px solid rgba(251, 191, 36, 0.3)', borderRadius: '8px'}}>
                  💰 Wager: {game.wager.toFixed(4)} $GOR
                </div>
              )}

              <div className="game-board">
                {Array.from({ length: 9 }, (_, i) => (
                  <button
                    key={i}
                    onClick={() => makeMove(i)}
                    disabled={loading || game.status !== "playing" || game.board[i] !== 0}
                    className="game-cell"
                  >
                    {getCellContent(i)}
                  </button>
                ))}
              </div>

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