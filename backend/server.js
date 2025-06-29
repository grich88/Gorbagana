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
      updatedAt: Date.now()
    };
    
    const success = await db.saveGame(game);
    
    if (success) {
      console.log(`✅ Created game: ${gameId} (${game.isPublic ? 'public' : 'private'})`);
      res.json({ success: true, game });
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
    
    console.log(`📖 Retrieved game: ${gameId}`);
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
    const { playerAddress, playerName } = req.body;
    
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
    
    const success = await db.updateGame(gameId, {
      playerO: playerAddress,
      status: 'playing'
    });
    
    if (!success) {
      return res.status(500).json({ error: 'Failed to update game' });
    }
    
    const updatedGame = await db.getGame(gameId);
    
    console.log(`🎮 Player ${playerAddress} joined game: ${gameId}`);
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
    
    // Validate move
    if (position < 0 || position > 8 || game.board[position] !== 0) {
      return res.status(400).json({ error: 'Invalid move' });
    }
    
    // Make the move
    const newBoard = [...game.board];
    newBoard[position] = currentPlayer;
    
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
      // Draw
      status = 'finished';
    }
    
    const success = await db.updateGame(gameId, {
      board: newBoard,
      currentTurn: currentPlayer === 1 ? 2 : 1,
      winner,
      status
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

// Start server
app.listen(PORT, async () => {
  console.log(`🚀 Gorbagana Trash Tac Toe server running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
  console.log(`💾 File-based database initialized`);
  console.log(`📊 Server stats: http://localhost:${PORT}/api/stats`);
  
  // Show initial database stats
  const stats = await db.getStats();
  console.log(`📈 Database contains ${stats.totalGames} games (${stats.publicGames} public, ${stats.activeGames} active)`);
}); 