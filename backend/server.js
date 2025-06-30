require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const ProductionDatabase = require('./database');

const app = express();
const PORT = process.env.PORT || 3002;

// Initialize database
const db = new ProductionDatabase();

// CORS origins from environment
const corsOrigins = process.env.CORS_ORIGINS 
  ? process.env.CORS_ORIGINS.split(',')
  : ['http://localhost:3000', 'https://your-netlify-app.netlify.app'];

// Middleware
app.use(cors({
  origin: corsOrigins,
  credentials: true
}));
app.use(express.json());

console.log(`🌐 CORS enabled for origins: ${corsOrigins.join(', ')}`);

// Initialize database connection and get stats
(async () => {
  const connectionStatus = db.getConnectionStatus();
  console.log(`🗄️ Database mode: ${connectionStatus.status}`);
  
  const stats = await db.getStats();
  console.log(`📈 Database contains ${stats.totalGames} games (${stats.publicGames} public, ${stats.activeGames} active)`);
})();

// Game cleanup interval (remove games older than 24 hours)
setInterval(async () => {
  const cleanedCount = await db.cleanupOldGames();
  if (cleanedCount > 0) {
    console.log(`🧹 Database cleanup completed: ${cleanedCount} games removed`);
  }
}, 60 * 60 * 1000); // Run every hour

// API Routes

// Root route - welcome message
app.get('/', (req, res) => {
  res.json({ 
    message: 'Gorbagana Trash Tac Toe Backend API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/health',
      stats: '/api/stats',
      games: '/api/games',
      createGame: 'POST /api/games',
      getGame: 'GET /api/games/:gameId',
      updateGame: 'PUT /api/games/:gameId',
      joinGame: 'POST /api/games/:gameId/join',
      deleteGame: 'DELETE /api/games/:gameId'
    },
    documentation: 'https://github.com/grich88/Gorbagana'
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// Database stats
app.get('/api/stats', async (req, res) => {
  try {
    const stats = await db.getStats();
    res.json(stats);
  } catch (error) {
    console.error('Error getting stats:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

// Create a new game
app.post('/api/games', async (req, res) => {
  try {
    const gameData = req.body;
    const gameId = gameData.id || uuidv4();
    
    const game = {
      ...gameData,
      id: gameId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      board: gameData.board ? gameData.board.map(cell => Number(cell)) : [0, 0, 0, 0, 0, 0, 0, 0, 0]
    };
    
    console.log('💾 Game data being saved:', {
      gameId: game.id,
      wager: game.wager,
      escrowAccount: game.escrowAccount,
      hasEscrowAccount: !!game.escrowAccount,
      playerXDeposit: game.playerXDeposit,
      boardType: typeof game.board[0],
      boardSample: game.board.slice(0, 3)
    });
    
    const success = await db.saveGame(game);
    
    if (success) {
      console.log(`✅ Created game: ${gameId} (${game.isPublic ? 'public' : 'private'})`);
      const savedGame = await db.getGame(gameId);
      console.log('📖 Retrieved saved game:', {
        gameId: savedGame.id,
        wager: savedGame.wager,
        escrowAccount: savedGame.escrowAccount,
        hasEscrowAccount: !!savedGame.escrowAccount,
        boardType: typeof savedGame.board[0],
        boardSample: savedGame.board.slice(0, 3)
      });
      res.json({ success: true, game: savedGame });
    } else {
      throw new Error('Failed to save game to database');
    }
  } catch (error) {
    console.error('Error creating game:', error);
    res.status(500).json({ error: 'Failed to create game' });
  }
});

// Get a specific game
app.get('/api/games/:gameId', async (req, res) => {
  try {
    const { gameId } = req.params;
    const game = await db.getGame(gameId);
    
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }
    
    // CRITICAL FIX: Ensure board is always numbers when retrieving
    if (game.board) {
      game.board = game.board.map(cell => Number(cell));
    }
    
    console.log(`📖 Retrieved game: ${gameId}`, {
      wager: game.wager,
      escrowAccount: game.escrowAccount,
      hasEscrowAccount: !!game.escrowAccount,
      status: game.status,
      boardType: typeof game.board[0],
      boardSample: game.board.slice(0, 3)
    });
    res.json({ game });
  } catch (error) {
    console.error('Error getting game:', error);
    res.status(500).json({ error: 'Failed to get game' });
  }
});

// Update a game
app.put('/api/games/:gameId', async (req, res) => {
  try {
    const { gameId } = req.params;
    const updates = req.body;
    
    const success = await db.updateGame(gameId, updates);
    if (!success) {
      return res.status(404).json({ error: 'Game not found' });
    }
    
    const updatedGame = await db.getGame(gameId);
    
    console.log(`🔄 Updated game: ${gameId}`);
    res.json({ success: true, game: updatedGame });
  } catch (error) {
    console.error('Error updating game:', error);
    res.status(500).json({ error: 'Failed to update game' });
  }
});

// Get all public games
app.get('/api/games', async (req, res) => {
  try {
    const publicGamesList = await db.getPublicGames();
    
    console.log(`📋 Retrieved ${publicGamesList.length} public games`);
    res.json({ games: publicGamesList });
  } catch (error) {
    console.error('Error getting public games:', error);
    res.status(500).json({ error: 'Failed to get public games' });
  }
});

// Delete a game
app.delete('/api/games/:gameId', async (req, res) => {
  try {
    const { gameId } = req.params;
    
    const deleted = await db.deleteGame(gameId);
    
    if (deleted) {
      console.log(`🗑️ Deleted game: ${gameId}`);
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Game not found' });
    }
  } catch (error) {
    console.error('Error deleting game:', error);
    res.status(500).json({ error: 'Failed to delete game' });
  }
});

// Join a game
app.post('/api/games/:gameId/join', async (req, res) => {
  try {
    const { gameId } = req.params;
    const { playerAddress, playerName, playerODeposit } = req.body;
    
    const game = await db.getGame(gameId);
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }
    
    if (game.status !== 'waiting') {
      return res.status(400).json({ error: 'Game is not accepting players' });
    }
    
    if (game.playerX === playerAddress) {
      return res.status(400).json({ error: 'Cannot join your own game' });
    }
    
    if (game.playerO) {
      return res.status(400).json({ error: 'Game is already full' });
    }

    // If game has a wager, ensure player has made escrow deposit
    if (game.wager > 0 && !playerODeposit) {
      return res.status(400).json({ error: 'Escrow deposit required for wagered games' });
    }
    
    const updateData = {
      playerO: playerAddress,
      status: 'playing'
    };

    // Add escrow deposit signature if provided
    if (playerODeposit) {
      updateData.playerODeposit = playerODeposit;
    }
    
    const success = await db.updateGame(gameId, updateData);
    
    if (!success) {
      return res.status(500).json({ error: 'Failed to update game' });
    }
    
    const updatedGame = await db.getGame(gameId);
    
    console.log(`🎮 Player ${playerAddress} joined game: ${gameId}${playerODeposit ? ' with escrow deposit: ' + playerODeposit : ''}`);
    res.json({ success: true, game: updatedGame });
  } catch (error) {
    console.error('Error joining game:', error);
    res.status(500).json({ error: 'Failed to join game' });
  }
});

// Make a move
app.post('/api/games/:gameId/move', async (req, res) => {
  try {
    const { gameId } = req.params;
    const { position, playerAddress } = req.body;
    
    const game = await db.getGame(gameId);
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }
    
    if (game.status !== 'playing') {
      return res.status(400).json({ error: 'Game is not in playing state' });
    }
    
    // Validate player turn
    const isPlayerX = game.playerX === playerAddress;
    const isPlayerO = game.playerO === playerAddress;
    
    if (!isPlayerX && !isPlayerO) {
      return res.status(403).json({ error: 'You are not a player in this game' });
    }
    
    const currentPlayer = isPlayerX ? 1 : 2;
    if (game.currentTurn !== currentPlayer) {
      return res.status(400).json({ error: 'Not your turn' });
    }
    
    // Validate position and make move
    if (game.board[position] !== 0) {
      return res.status(400).json({ error: 'Position already taken' });
    }
    
    // CRITICAL FIX: Ensure board is always numbers, not strings
    const newBoard = game.board.map(cell => Number(cell));
    newBoard[position] = currentPlayer;
    
    console.log('🎯 Move validation:', {
      gameId,
      position,
      currentPlayer,
      oldValue: game.board[position],
      newValue: newBoard[position],
      boardType: typeof newBoard[0],
      boardSample: newBoard.slice(0, 3)
    });
    
    // Check for winner
    const checkWin = (board, player) => {
      const winPatterns = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
        [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
        [0, 4, 8], [2, 4, 6] // diagonals
      ];
      
      return winPatterns.some(pattern => 
        pattern.every(pos => board[pos] === player)
      );
    };
    
    let winner = null;
    let status = 'playing';
    
    if (checkWin(newBoard, currentPlayer)) {
      winner = currentPlayer;
      status = 'finished';
    } else if (newBoard.every(cell => cell !== 0)) {
      // Draw - FIXED: Now works correctly with number board
      console.log('🤝 Tie detected - board full:', newBoard);
      status = 'finished';
    }
    
    const success = await db.updateGame(gameId, {
      board: newBoard,
      currentTurn: currentPlayer === 1 ? 2 : 1,
      winner,
      status,
      updatedAt: Date.now()
    });
    
    if (!success) {
      return res.status(500).json({ error: 'Failed to update game' });
    }
    
    const updatedGame = await db.getGame(gameId);
    
    console.log(`🎯 Move made in game ${gameId}: position ${position} by player ${currentPlayer}`);
    res.json({ success: true, game: updatedGame });
  } catch (error) {
    console.error('Error making move:', error);
    res.status(500).json({ error: 'Failed to make move' });
  }
});

// Abandon a game (enhanced endpoint)
app.post('/api/games/:gameId/abandon', async (req, res) => {
  try {
    const { gameId } = req.params;
    const { playerAddress, reason } = req.body;
    
    console.log(`⏰ Abandon request for game ${gameId} by ${playerAddress} (reason: ${reason})`);
    
    const game = await db.getGame(gameId);
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }
    
    console.log(`🎮 Game ${gameId} current state:`, {
      status: game.status,
      playerX: game.playerX,
      playerO: game.playerO,
      createdAt: new Date(game.createdAt).toISOString(),
      updatedAt: game.updatedAt ? new Date(game.updatedAt).toISOString() : 'N/A'
    });
    
    // Validate that the requester is a player in the game
    const isPlayerX = game.playerX === playerAddress;
    const isPlayerO = game.playerO === playerAddress;
    
    if (!isPlayerX && !isPlayerO) {
      return res.status(403).json({ error: 'You are not a player in this game' });
    }
    
    // Allow abandoning games that are waiting, playing, or already abandoned (for second player fund return)
    if (!['waiting', 'playing', 'abandoned'].includes(game.status)) {
      return res.status(400).json({ error: 'Game cannot be abandoned in current state' });
    }
    
    // If game is already abandoned, check if this player has already abandoned
    if (game.status === 'abandoned' && game.abandonedBy === playerAddress) {
      return res.status(400).json({ error: 'You have already abandoned this game' });
    }
    
    // MUCH MORE PERMISSIVE abandonment criteria
    const now = Date.now();
    const gameAge = now - game.createdAt;
    const lastUpdate = game.updatedAt || game.createdAt;
    const timeSinceLastMove = now - lastUpdate;
    
    const GAME_TIMEOUT = 30 * 60 * 1000; // Reduced to 30 minutes
    const MOVE_TIMEOUT = 10 * 60 * 1000; // Reduced to 10 minutes
    
    // Very permissive abandonment - almost always allow it
    const canAbandon = true; // Always allow abandonment for testing
    /* 
    Previous restrictive logic:
    const canAbandon = reason === 'player_request' || 
                      gameAge > GAME_TIMEOUT || 
                      timeSinceLastMove > MOVE_TIMEOUT ||
                      (isPlayerX && game.status === 'waiting') || 
                      game.status === 'playing';
    */
    
    console.log(`🔍 Abandon check:`, {
      canAbandon,
      gameAge: Math.round(gameAge / 1000) + 's',
      timeSinceLastMove: Math.round(timeSinceLastMove / 1000) + 's',
      isPlayerX,
      isPlayerO,
      reason
    });
    
    if (!canAbandon) {
      return res.status(400).json({ 
        error: 'Game cannot be abandoned yet. Wait for timeout or inactivity period.',
        timeRemaining: Math.max(GAME_TIMEOUT - gameAge, MOVE_TIMEOUT - timeSinceLastMove)
      });
    }
    
    // Mark game as abandoned
    const success = await db.updateGame(gameId, {
      status: 'abandoned',
      winner: 0, // No winner in abandoned games
      updatedAt: now,
      abandonedBy: playerAddress,
      abandonReason: reason || 'timeout'
    });
    
    if (!success) {
      return res.status(500).json({ error: 'Failed to abandon game' });
    }
    
    const updatedGame = await db.getGame(gameId);
    
    console.log(`✅ Game ${gameId} marked as abandoned by ${playerAddress} (reason: ${reason})`);
    res.json({ success: true, game: updatedGame, message: 'Game marked as abandoned' });
  } catch (error) {
    console.error('Error abandoning game:', error);
    res.status(500).json({ error: 'Failed to abandon game' });
  }
});

// Clean database endpoint (admin)
app.post('/api/admin/cleanup-all', async (req, res) => {
  try {
    const { adminKey } = req.body;
    
    // Simple admin key check (in production, use proper authentication)
    if (adminKey !== 'cleanup-trash-tac-toe-2025') {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    const deletedCount = await db.cleanupAllGames();
    console.log(`🧹 ADMIN: Cleaned up ${deletedCount} games from database`);
    
    res.json({ 
      success: true, 
      message: `Cleaned up ${deletedCount} games`,
      deletedCount
    });
  } catch (error) {
    console.error('Error cleaning up database:', error);
    res.status(500).json({ error: 'Failed to cleanup database' });
  }
});

// Get game statistics  
app.get('/api/stats', async (req, res) => {
  try {
    const stats = await db.getStats();
    res.json(stats);
  } catch (error) {
    console.error('Error getting stats:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

// $GOR Balance Proxy - Bypass CORS restrictions
app.get('/api/balance/:walletAddress', async (req, res) => {
  try {
    const { walletAddress } = req.params;
    
    // Validate wallet address format
    if (!walletAddress || walletAddress.length < 32) {
      return res.status(400).json({ error: 'Invalid wallet address' });
    }
    
    console.log(`💰 Fetching $GOR balance for: ${walletAddress}`);
    
    // Gorbagana RPC endpoints - UPDATED WITH OFFICIAL ENDPOINT
    // Based on official documentation: https://rpc.gorbagana.wtf/
    // USER CORRECTION: Official docs specify rpc.gorbagana.wtf not gorchain.wstf.io
    const rpcEndpoints = [
      'https://rpc.gorbagana.wtf/', // PRIMARY: Official Gorbagana RPC per documentation
    ];
    
    // Test Gorbagana network first (this is a $GOR token game)
    let gorbaganaWorking = false;
    let balance = null;
    let endpoint = null;
    
    for (const rpc of rpcEndpoints) {
      try {
        console.log(`🎯 Testing Gorbagana RPC: ${rpc}`);
        
        const response = await fetch(rpc, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Gorbagana-Trash-Tac-Toe-Backend/1.0.0'
          },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'getBalance',
            params: [walletAddress]
          }),
          signal: AbortSignal.timeout(10000) // 10 second timeout for Gorbagana
        });
        
        if (!response.ok) {
          console.log(`❌ Gorbagana ${rpc}: HTTP ${response.status}`);
          continue;
        }
        
        const data = await response.json();
        
        if (data.error) {
          console.log(`❌ Gorbagana ${rpc}: RPC Error - ${data.error.message}`);
          continue;
        }
        
        if (data.result !== undefined) {
          balance = data.result.value !== undefined ? data.result.value : data.result;
          endpoint = rpc;
          gorbaganaWorking = true;
          console.log(`✅ Gorbagana balance fetched from ${rpc}: ${balance} lamports`);
          break;
        }
        
      } catch (error) {
        console.log(`❌ Gorbagana ${rpc}: ${error.message}`);
        continue;
      }
    }
    
    // If Gorbagana is working, return the real balance
    if (gorbaganaWorking && balance !== null) {
      const gorBalance = balance !== null ? balance / 1000000000 : 0;
      
      console.log(`💰 Real Gorbagana balance: ${balance} lamports = ${gorBalance.toFixed(6)} $GOR`);
      
      return res.json({
        balance: balance,
        lamports: balance, 
        gor: gorBalance,
        endpoint: endpoint,
        demo: false,
        network: 'Gorbagana',
        status: 'connected'
      });
    }
    
    // If Gorbagana is down, provide demo balance with clear messaging
    console.log('⚠️ Gorbagana network unavailable - providing demo balance for development');
    console.log('🎮 Game will use demo $GOR balance until Gorbagana network is restored');
    
    return res.json({ 
      balance: 999960000, // 0.99996 GOR in lamports
      lamports: 999960000,
      gor: 0.99996,
      endpoint: 'demo',
      demo: true,
      network: 'Gorbagana (Demo Mode)',
      status: 'network_unavailable',
      message: 'Gorbagana network temporarily unavailable - using demo balance'
    });
    
  } catch (error) {
    console.error('Error fetching balance:', error);
    res.status(500).json({ 
      error: 'Failed to fetch balance',
      balance: 999960000, // Fallback demo balance
      lamports: 999960000,
      gor: 0.99996,
      endpoint: 'fallback',
      demo: true,
      network: 'Gorbagana (Error Fallback)',
      status: 'error',
      message: 'Balance service error - using demo balance'
    });
  }
});

// Start server
app.listen(PORT, async () => {
  console.log(`🚀 Gorbagana Trash Tac Toe server running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
  console.log(`💰 Balance proxy: http://localhost:${PORT}/api/balance/:walletAddress`);
  console.log(`💾 File-based database initialized`);
  console.log(`📊 Server stats: http://localhost:${PORT}/api/stats`);
  
  // Show initial database stats
  const stats = await db.getStats();
  console.log(`📈 Database contains ${stats.totalGames} games (${stats.publicGames} public, ${stats.activeGames} active)`);
}); 