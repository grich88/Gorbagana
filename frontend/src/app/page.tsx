"use client";

import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { PublicKey } from '@solana/web3.js';
import { Trash2, Recycle, Plus, Users, Copy, Check } from 'lucide-react';
import toast from 'react-hot-toast';

// Game types
type GameStatus = "waitingForPlayer" | "active" | "xWins" | "oWins" | "tie";

interface Game {
  playerX: PublicKey;
  playerO: PublicKey;
  board: number[];
  currentTurn: number;
  status: { [key: string]: Record<string, never> };
  bump: number;
}

export default function Home() {
  const wallet = useWallet();
  const [game, setGame] = useState<Game | null>(null);
  const [gameId, setGameId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Create new game (simplified for testing without deployed program)
  const createGame = async () => {
    if (!wallet.connected || !wallet.publicKey) {
      toast.error("Please connect your wallet first!");
      return;
    }

    setLoading(true);
    try {
      // For demo purposes - simulate game creation
      const mockGameId = `game_${Date.now()}`;
      setGameId(mockGameId);
      
      // Create a mock game state
      const mockGame: Game = {
        playerX: wallet.publicKey,
        playerO: new PublicKey("11111111111111111111111111111112"), // Default pubkey
        board: [0, 0, 0, 0, 0, 0, 0, 0, 0],
        currentTurn: 1,
        status: { "waitingForPlayer": {} },
        bump: 255
      };
      
      setGame(mockGame);
      toast.success("🗑️ Mock game created! (Smart contract not deployed yet)");
    } catch (error) {
      console.error("Error creating game:", error);
      toast.error("Failed to create game. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Join existing game (simplified for testing)
  const joinGame = async () => {
    if (!wallet.connected || !wallet.publicKey || !gameId) {
      toast.error("Please connect wallet and enter a Game ID!");
      return;
    }

    setLoading(true);
    try {
      // For demo purposes - simulate joining
      const mockGame: Game = {
        playerX: new PublicKey("11111111111111111111111111111112"), // Mock first player
        playerO: wallet.publicKey,
        board: [0, 0, 0, 0, 0, 0, 0, 0, 0],
        currentTurn: 1,
        status: { "active": {} },
        bump: 255
      };
      
      setGame(mockGame);
      toast.success("♻️ Joined mock game! (Smart contract not deployed yet)");
    } catch (error) {
      console.error("Error joining game:", error);
      toast.error("Failed to join game. Check the Game ID and try again.");
    } finally {
      setLoading(false);
    }
  };

  // Make a move (simplified for testing)
  const makeMove = async (position: number) => {
    if (!wallet.connected || !wallet.publicKey || !game || !gameId) return;

    // Check if it's player's turn
    const isPlayerX = wallet.publicKey.equals(game.playerX);
    const isPlayerO = wallet.publicKey.equals(game.playerO);
    
    if (!isPlayerX && !isPlayerO) {
      toast.error("You're not a player in this game!");
      return;
    }

    const expectedTurn = isPlayerX ? 1 : 2;
    if (game.currentTurn !== expectedTurn) {
      toast.error("It's not your turn!");
      return;
    }

    if (game.board[position] !== 0) {
      toast.error("Position already occupied!");
      return;
    }

    setLoading(true);
    try {
      // Update board locally for demo
      const newBoard = [...game.board];
      newBoard[position] = game.currentTurn;
      
      // Check for winner (simple check)
      const checkWinner = (board: number[], player: number) => {
        const lines = [
          [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
          [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
          [0, 4, 8], [2, 4, 6] // diagonals
        ];
        return lines.some(line => line.every(i => board[i] === player));
      };

      let newStatus = game.status;
      const newTurn = game.currentTurn === 1 ? 2 : 1;

      if (checkWinner(newBoard, game.currentTurn)) {
        newStatus = game.currentTurn === 1 ? { "xWins": {} } : { "oWins": {} };
        toast.success("🎉 You won!");
      } else if (newBoard.every(cell => cell !== 0)) {
        newStatus = { "tie": {} };
        toast.success("🤝 It's a tie!");
      }

      const updatedGame: Game = {
        ...game,
        board: newBoard,
        currentTurn: Object.keys(newStatus)[0] === "active" ? newTurn : game.currentTurn,
        status: newStatus
      };

      setGame(updatedGame);
      toast.success("Move made! 🎯");
    } catch (error) {
      console.error("Error making move:", error);
      toast.error("Invalid move! Try again.");
    } finally {
      setLoading(false);
    }
  };

  // Copy game ID to clipboard
  const copyGameId = () => {
    navigator.clipboard.writeText(gameId);
    setCopied(true);
    toast.success("Game ID copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  // Get game status text
  const getStatusText = () => {
    if (!game) return "";
    
    const status = Object.keys(game.status)[0] as GameStatus;
    switch (status) {
      case "waitingForPlayer":
        return "Waiting for opponent...";
      case "active":
        const isMyTurn = (game.currentTurn === 1 && wallet.publicKey?.equals(game.playerX)) ||
                         (game.currentTurn === 2 && wallet.publicKey?.equals(game.playerO));
        return isMyTurn ? "Your turn!" : "Opponent's turn";
      case "xWins":
        return wallet.publicKey?.equals(game.playerX) ? "🎉 You Win!" : "💔 You Lose!";
      case "oWins":
        return wallet.publicKey?.equals(game.playerO) ? "🎉 You Win!" : "💔 You Lose!";
      case "tie":
        return "🤝 It's a Tie!";
      default:
        return "";
    }
  };

  // Get cell content
  const getCellContent = (position: number) => {
    if (!game || game.board[position] === 0) return null;
    
    return game.board[position] === 1 ? (
      <Trash2 className="w-8 h-8 text-red-600" />
    ) : (
      <Recycle className="w-8 h-8 text-green-600" />
    );
  };

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
            🗑️ Trash-Tac-Toe ♻️
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Battle of the Bins on Gorbagana Chain!
          </p>
          <WalletMultiButton className="bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600" />
        </div>

        {wallet.connected ? (
          <div className="space-y-6">
            {/* Demo Notice */}
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
              <p className="text-amber-800 dark:text-amber-200 text-sm">
                📝 <strong>Demo Mode:</strong> Smart contract not deployed yet. This is a frontend-only demo showing the game interface and basic functionality.
              </p>
            </div>

            {/* Game Controls */}
            {!game && (
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Plus className="w-5 h-5" />
                  Start Playing
                </h2>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <button
                    onClick={createGame}
                    disabled={loading}
                    className="flex items-center justify-center gap-2 bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-3 rounded-lg hover:from-green-600 hover:to-green-700 disabled:opacity-50 transition-all duration-200 transform hover:scale-105"
                  >
                    <Plus className="w-4 h-4" />
                    Create New Game
                  </button>
                  
                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder="Enter Game ID to join..."
                      value={gameId}
                      onChange={(e) => setGameId(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <button
                      onClick={joinGame}
                      disabled={loading || !gameId}
                      className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-2 rounded-lg hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 transition-all duration-200 transform hover:scale-105"
                    >
                      <Users className="w-4 h-4" />
                      Join Game
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Game Board */}
            {game && (
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
                {/* Game Info */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-xl font-semibold">Game Board</h2>
                    {gameId && (
                      <button
                        onClick={copyGameId}
                        className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                      >
                        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        Game ID
                      </button>
                    )}
                  </div>
                  <p className="text-gray-600 dark:text-gray-400">{getStatusText()}</p>
                </div>

                {/* Player Info */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <Trash2 className="w-5 h-5 text-red-600" />
                      <span className="font-medium">Trash Cans</span>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                      {game.playerX.toString().slice(0, 8)}...
                    </p>
                  </div>
                  <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <Recycle className="w-5 h-5 text-green-600" />
                      <span className="font-medium">Recycling</span>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                      {game.playerO.toString() !== "11111111111111111111111111111112" 
                        ? `${game.playerO.toString().slice(0, 8)}...`
                        : "Waiting..."}
                    </p>
                  </div>
                </div>

                {/* Game Grid */}
                <div className="grid grid-cols-3 gap-2 max-w-xs mx-auto">
                  {Array.from({ length: 9 }, (_, i) => (
                    <button
                      key={i}
                      onClick={() => makeMove(i)}
                      disabled={loading || Object.keys(game.status)[0] !== "active" || game.board[i] !== 0}
                      className="aspect-square bg-gray-100 dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-lg flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105"
                    >
                      {getCellContent(i)}
                    </button>
                  ))}
                </div>

                {/* Reset Game Button */}
                {Object.keys(game.status)[0] !== "active" && Object.keys(game.status)[0] !== "waitingForPlayer" && (
                  <div className="mt-6 text-center">
                    <button
                      onClick={() => {
                        setGame(null);
                        setGameId("");
                      }}
                      className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-2 rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all duration-200 transform hover:scale-105"
                    >
                      Play Again
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Instructions */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold mb-3">How to Play</h3>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li>• 🗑️ <strong>Trash Cans</strong> vs ♻️ <strong>Recycling Bins</strong></li>
                <li>• Create a new game or join with a Game ID</li>
                <li>• Take turns placing your symbol on the board</li>
                <li>• First to get 3 in a row wins!</li>
                <li>• All moves are recorded on Gorbagana Chain (when deployed)</li>
              </ul>
            </div>
          </div>
        ) : (
          <div className="text-center bg-white dark:bg-gray-800 rounded-xl p-8 shadow-lg border border-gray-200 dark:border-gray-700">
            <h2 className="text-2xl font-semibold mb-4">Connect Your Wallet</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Connect your Phantom wallet to start playing!
            </p>
            <div className="space-y-4">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                <p>🌐 Network: Gorbagana Testnet</p>
                <p>🔗 RPC: https://gorchain.wstf.io</p>
                <p>💰 Get testnet tokens at gorbaganachain.xyz</p>
                <p>📱 Supported Wallets: Phantom</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
