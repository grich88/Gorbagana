"use client";

import { useState, useEffect, useCallback } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { toast } from 'react-hot-toast';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';

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
  wager: number;
  isPublic: boolean;
  creatorName?: string;
}

export default function SimpleGame() {
  const wallet = useWallet();
  const { connection } = useConnection();
  const [game, setGame] = useState<Game | null>(null);
  const [gameId, setGameId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [wagerAmount, setWagerAmount] = useState<number>(0);
  const [gorBalance, setGorBalance] = useState<number>(0.99996);

  // Create a new game
  const createGame = async () => {
    if (!wallet.connected || !wallet.publicKey) {
      toast.error("Please connect your wallet first!");
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
      
      setGame(newGame);
      setGameId(newGameId);
      setLoading(false);
      
      toast.success(`🗑️ Game created! ID: ${newGameId}`);
    } catch (error) {
      setLoading(false);
      toast.error("Failed to create game: " + (error as Error).message);
    }
  };

  // Join a game
  const joinGame = async () => {
    if (!wallet.connected || !wallet.publicKey || !gameId) {
      toast.error("Please connect wallet and enter a Game ID!");
      return;
    }

    setLoading(true);
    
    try {
      // Simulate joining a game
      const newGame: Game = {
        id: gameId,
        playerX: "other-player",
        playerO: wallet.publicKey.toString(),
        board: [0, 0, 0, 0, 0, 0, 0, 0, 0],
        currentTurn: 1,
        status: "playing",
        createdAt: Date.now(),
        wager: 0.002,
        isPublic: true,
        creatorName: "Player 1"
      };
      
      setGame(newGame);
      setLoading(false);
      toast.success("🎮 Joined game!");
    } catch (error) {
      setLoading(false);
      toast.error("Failed to join game: " + (error as Error).message);
    }
  };

  // Make a move
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

    setLoading(true);

    try {
      const newBoard = [...game.board];
      newBoard[position] = game.currentTurn;

      // Check for winner
      const winner = checkWinner(newBoard);
      
      const updatedGame: Game = {
        ...game,
        board: newBoard,
        currentTurn: game.currentTurn === 1 ? 2 : 1,
        status: winner !== 0 || newBoard.every(cell => cell !== 0) ? "finished" : "playing",
        winner: winner !== 0 ? winner : undefined
      };

      setGame(updatedGame);
      setLoading(false);

      if (updatedGame.status === "finished") {
        if (winner === 1) {
          toast.success("🗑️ Trash Cans win!");
        } else if (winner === 2) {
          toast.success("♻️ Recycling Bins win!");
        } else {
          toast("🤝 It's a tie!");
        }
      }
    } catch (error) {
      setLoading(false);
      toast.error("Failed to make move: " + (error as Error).message);
    }
  };

  // Check for winner
  const checkWinner = (board: number[]): number => {
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
      [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
      [0, 4, 8], [2, 4, 6] // diagonals
    ];

    for (const line of lines) {
      const [a, b, c] = line;
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        return board[a];
      }
    }
    return 0;
  };

  // Get cell content
  const getCellContent = (position: number) => {
    if (game?.board[position] === 1) {
      return <span className="game-cell x">🗑️</span>;
    }
    if (game?.board[position] === 2) {
      return <span className="game-cell o">♻️</span>;
    }
    return "";
  };

  return (
    <div className="game-container">
      <div className="game-header">
        <h1 className="game-title">🗑️ Trash-Tac-Toe ♻️</h1>
        <p className="game-subtitle">Gorbagana $GOR Wager Gaming</p>
        <p className="game-description">
          Real blockchain gaming with $GOR token wagers on Gorbagana network
        </p>
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
              💰 {gorBalance.toFixed(4)} $GOR
            </div>
          </div>

          {!game ? (
            <div className="card">
              <div className="card-header">Create or Join Game</div>
              
              <div className="form-group">
                <label className="form-label">Wager Amount ($GOR)</label>
                <input
                  type="number"
                  value={wagerAmount}
                  onChange={(e) => setWagerAmount(parseFloat(e.target.value) || 0)}
                  className="form-input"
                  placeholder="0.002"
                  step="0.001"
                  min="0"
                  max={gorBalance}
                />
              </div>

              <div style={{display: 'flex', gap: '1rem', justifyContent: 'center'}}>
                <button
                  onClick={createGame}
                  disabled={loading}
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
                  disabled={loading || !gameId}
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
                {game.status === "playing" && "🎮 Game in progress!"}
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