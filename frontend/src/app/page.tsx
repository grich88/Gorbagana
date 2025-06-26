"use client";

import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Trash2, Recycle, Plus, Users } from 'lucide-react';
import toast from 'react-hot-toast';

// Simplified game types
type GameStatus = "waiting" | "playing" | "finished";

interface Game {
  id: string;
  playerX: string;
  playerO: string;
  board: number[];
  currentTurn: number;
  status: GameStatus;
  winner?: number;
}

export default function Home() {
  const wallet = useWallet();
  const [game, setGame] = useState<Game | null>(null);
  const [gameId, setGameId] = useState<string>("");
  const [loading, setLoading] = useState(false);

  // Simplified game creation
  const createGame = async () => {
    if (!wallet.connected || !wallet.publicKey) {
      toast.error("Please connect your wallet first!");
      return;
    }

    setLoading(true);
    const newGameId = `game_${Date.now()}`;
    
    const newGame: Game = {
      id: newGameId,
      playerX: wallet.publicKey.toString(),
      playerO: "",
      board: [0, 0, 0, 0, 0, 0, 0, 0, 0],
      currentTurn: 1,
      status: "waiting"
    };
    
    setGame(newGame);
    setGameId(newGameId);
    setLoading(false);
    toast.success("🗑️ Game created! Share the Game ID with a friend!");
  };

  // Simplified game joining
  const joinGame = async () => {
    if (!wallet.connected || !wallet.publicKey || !gameId) {
      toast.error("Please connect wallet and enter a Game ID!");
      return;
    }

    setLoading(true);
    const joinedGame: Game = {
      id: gameId,
      playerX: "Mock Player 1",
      playerO: wallet.publicKey.toString(),
      board: [0, 0, 0, 0, 0, 0, 0, 0, 0],
      currentTurn: 1,
      status: "playing"
    };
    
    setGame(joinedGame);
    setLoading(false);
    toast.success("♻️ Joined game! Let's play!");
  };

  // Simplified move logic
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

    setGame({
      ...game,
      board: newBoard,
      currentTurn: game.currentTurn === 1 ? 2 : 1,
      status: newStatus,
      winner
    });
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
      <Trash2 className="w-6 h-6 md:w-8 md:h-8 text-red-600" /> : 
      <Recycle className="w-6 h-6 md:w-8 md:h-8 text-green-600" />;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 px-4 py-6">
      <div className="max-w-md mx-auto space-y-6">
        {/* Header - Mobile Optimized */}
        <div className="text-center">
          <h1 className="text-3xl md:text-4xl font-bold mb-2 bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
            🗑️ Trash-Tac-Toe ♻️
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
            Battle of the Bins on Gorbagana Chain!
          </p>
          
          {/* Mobile-friendly wallet button */}
          <div className="flex justify-center">
            <WalletMultiButton className="!bg-gradient-to-r !from-green-500 !to-blue-500 !hover:from-green-600 !hover:to-blue-600 !text-sm !px-4 !py-2 !rounded-full" />
          </div>
        </div>

        {wallet.connected ? (
          <>
            {/* Demo Notice - Compact */}
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3">
              <p className="text-amber-800 dark:text-amber-200 text-xs text-center">
                📝 <strong>Demo Mode:</strong> Smart contract not deployed yet. This is a frontend-only demo showing the game interface and basic functionality.
              </p>
            </div>

            {/* Game Controls - Mobile First */}
            {!game && (
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-lg">
                <h2 className="text-lg font-semibold mb-4 text-center flex items-center justify-center gap-2">
                  <Plus className="w-4 h-4" />
                  Start Playing
                </h2>
                
                <div className="space-y-3">
                  <button
                    onClick={createGame}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-green-500 to-green-600 text-white px-4 py-3 rounded-lg font-medium disabled:opacity-50 transition-all"
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
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <button
                      onClick={joinGame}
                      disabled={loading || !gameId}
                      className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-2 rounded-lg font-medium disabled:opacity-50 transition-all"
                    >
                      <Users className="w-4 h-4" />
                      Join Game
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Game Board - Mobile Optimized */}
            {game && (
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-lg">
                {/* Game Status */}
                <div className="text-center mb-4">
                  <h2 className="text-lg font-semibold mb-1">Game Board</h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{getStatusText()}</p>
                  {gameId && (
                    <p className="text-xs text-gray-500 mt-1">
                      Game ID: <span className="font-mono">{gameId}</span>
                    </p>
                  )}
                </div>

                {/* Players - Compact Mobile Layout */}
                <div className="flex justify-between mb-4 text-xs">
                  <div className="flex items-center gap-1 px-2 py-1 bg-red-50 dark:bg-red-900/20 rounded-md">
                    <Trash2 className="w-3 h-3 text-red-600" />
                    <span>Trash Cans</span>
                  </div>
                  <div className="flex items-center gap-1 px-2 py-1 bg-green-50 dark:bg-green-900/20 rounded-md">
                    <Recycle className="w-3 h-3 text-green-600" />
                    <span>Recycling</span>
                  </div>
                </div>

                {/* Game Grid - Mobile Optimized */}
                <div className="grid grid-cols-3 gap-2 max-w-[280px] mx-auto mb-4">
                  {Array.from({ length: 9 }, (_, i) => (
                    <button
                      key={i}
                      onClick={() => makeMove(i)}
                      disabled={loading || game.status !== "playing" || game.board[i] !== 0}
                      className="aspect-square bg-gray-100 dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-lg flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 transition-all"
                    >
                      {getCellContent(i)}
                    </button>
                  ))}
                </div>

                {/* Play Again Button */}
                {game.status === "finished" && (
                  <div className="text-center">
                    <button
                      onClick={() => {
                        setGame(null);
                        setGameId("");
                      }}
                      className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-2 rounded-lg font-medium transition-all"
                    >
                      Play Again
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Instructions - Compact */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-lg">
              <h3 className="font-semibold mb-2 text-center">How to Play</h3>
              <ul className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
                <li>• 🗑️ <strong>Trash Cans</strong> vs ♻️ <strong>Recycling Bins</strong></li>
                <li>• Create a new game or join with a Game ID</li>
                <li>• Take turns placing your symbol on the board</li>
                <li>• First to get 3 in a row wins!</li>
                <li>• All moves are recorded on Gorbagana Chain (when deployed)</li>
              </ul>
            </div>
          </>
        ) : (
          <div className="text-center bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
            <h2 className="text-xl font-semibold mb-3">Connect Your Wallet</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm">
              Connect your Phantom wallet to start playing!
            </p>
            <div className="space-y-2 text-xs text-gray-500 dark:text-gray-400">
              <p>🌐 Network: Gorbagana Testnet</p>
              <p>🔗 RPC: https://gorchain.wstf.io</p>
              <p>💰 Get testnet tokens at gorbaganachain.xyz</p>
              <p>📱 Supported Wallets: Phantom</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
