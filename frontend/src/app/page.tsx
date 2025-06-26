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
              The Official Game of Gorbagana
            </p>
            <p className="text-gray-400 mb-8 max-w-2xl mx-auto">
                             This isn&apos;t ordinary tic-tac-toe. This is deeper. Greener. Cleaner.<br/>
              Welcome to the bins. In Gorbagana we trust.
            </p>
            
            {/* Wallet Connection - Gorganus Style */}
            <div className="mb-8">
              <WalletMultiButton className="!bg-gradient-to-r !from-green-600 !to-emerald-600 !hover:from-green-700 !hover:to-emerald-700 !border-green-500 !text-white !font-bold !px-8 !py-3 !rounded-xl !shadow-lg !shadow-green-900/50" />
            </div>
          </div>

          {wallet.connected ? (
            <div className="space-y-8">
              {/* Game Controls - Gorganus Style */}
              {!game && (
                <div className="bg-gray-800/80 backdrop-blur-sm border border-green-500/30 rounded-2xl p-6 shadow-2xl shadow-green-900/50">
                  <h2 className="text-2xl font-bold mb-6 text-center text-green-300 flex items-center justify-center gap-3">
                    <Plus className="w-6 h-6" />
                    Initialize Gaming Protocol
                  </h2>
                  
                  <div className="grid md:grid-cols-2 gap-6">
                    <button
                      onClick={createGame}
                      disabled={loading}
                      className="group relative bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold px-8 py-4 rounded-xl shadow-lg shadow-green-900/50 disabled:opacity-50 transition-all duration-300 transform hover:scale-105"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-emerald-400 rounded-xl opacity-0 group-hover:opacity-20 transition-opacity"></div>
                      <div className="relative flex items-center justify-center gap-3">
                        <Plus className="w-5 h-5" />
                        Deploy New Game
                      </div>
                    </button>
                    
                    <div className="space-y-3">
                      <input
                        type="text"
                        placeholder="Enter Game Protocol ID..."
                        value={gameId}
                        onChange={(e) => setGameId(e.target.value)}
                        className="w-full px-4 py-3 bg-gray-900/50 border border-green-500/30 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:border-transparent backdrop-blur-sm"
                      />
                      <button
                        onClick={joinGame}
                        disabled={loading || !gameId}
                        className="w-full group relative bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-bold px-6 py-3 rounded-xl shadow-lg shadow-blue-900/50 disabled:opacity-50 transition-all duration-300 transform hover:scale-105"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-cyan-400 rounded-xl opacity-0 group-hover:opacity-20 transition-opacity"></div>
                        <div className="relative flex items-center justify-center gap-3">
                          <Users className="w-5 h-5" />
                          Connect to Game
                        </div>
                      </button>
                    </div>
                  </div>
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
                      <p className="text-sm text-gray-500 mt-2 font-mono">
                        Protocol: {gameId}
                      </p>
                    )}
                  </div>

                  {/* Players - Gorganus Style */}
                  <div className="flex justify-center gap-8 mb-8">
                    <div className="flex items-center gap-3 px-4 py-2 bg-red-900/30 border border-red-500/30 rounded-xl">
                      <Trash2 className="w-5 h-5 text-red-400" />
                      <span className="text-red-300 font-bold">Trash Cans</span>
                    </div>
                    <div className="text-gray-500 flex items-center text-xl font-bold">VS</div>
                    <div className="flex items-center gap-3 px-4 py-2 bg-green-900/30 border border-green-500/30 rounded-xl">
                      <Recycle className="w-5 h-5 text-green-400" />
                      <span className="text-green-300 font-bold">Recycling Bins</span>
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
                    <div className="text-center">
                      <button
                        onClick={() => {
                          setGame(null);
                          setGameId("");
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
                <p>🌐 <span className="text-green-400">Network:</span> Gorbagana Testnet</p>
                <p>🔗 <span className="text-green-400">RPC:</span> https://gorchain.wstf.io</p>
                <p>💰 <span className="text-green-400">Faucet:</span> gorbaganachain.xyz</p>
                <p>📱 <span className="text-green-400">Supported:</span> Phantom, Backpack</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
