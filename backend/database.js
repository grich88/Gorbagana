const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

// Game Schema for MongoDB
const GameSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  playerX: { type: String, required: true },
  playerO: { type: String, default: null },
  board: { type: [Number], required: true, default: [0,0,0,0,0,0,0,0,0] },
  currentTurn: { type: Number, required: true, default: 1 },
  status: { type: String, required: true, enum: ['waiting', 'playing', 'finished', 'abandoned'], default: 'waiting' },
  winner: { type: Number, default: null },
  createdAt: { type: Number, required: true, default: Date.now },
  updatedAt: { type: Number, required: true, default: Date.now },
  wager: { type: Number, required: true, default: 0 },
  isPublic: { type: Boolean, required: true, default: false },
  creatorName: { type: String, default: null },
  escrowAccount: { type: String, default: null },
  txSignature: { type: String, default: null },
  playerXDeposit: { type: String, default: null },
  playerODeposit: { type: String, default: null },
  abandonedBy: { type: String, default: null },
  abandonReason: { type: String, default: null }
});

const GameModel = mongoose.model('Game', GameSchema);

class ProductionDatabase {
  constructor() {
    this.isMongoConnected = false;
    this.useFileStorage = true;
    this.dataDir = path.join(__dirname, 'data');
    this.gamesFile = path.join(this.dataDir, 'games.json');
    this.publicGamesFile = path.join(this.dataDir, 'public_games.json');
    
    // Initialize file storage
    this.initFileStorage();
    
    // Try MongoDB connection if URI is provided
    this.initMongoDB();
  }
  
  initFileStorage() {
    try {
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true });
        console.log('📁 Created data directory');
      }
      
      if (!fs.existsSync(this.gamesFile)) {
        fs.writeFileSync(this.gamesFile, '{}');
        console.log('📄 Created games.json file');
      }
      
      if (!fs.existsSync(this.publicGamesFile)) {
        fs.writeFileSync(this.publicGamesFile, '[]');
        console.log('📄 Created public_games.json file');
      }
      
      console.log('💾 File-based database initialized');
    } catch (error) {
      console.error('❌ Failed to initialize file storage:', error);
    }
  }
  
  async initMongoDB() {
    const mongoUri = process.env.MONGODB_URI;
    
    if (!mongoUri) {
      console.log('📝 No MONGODB_URI found - using file storage only');
      return;
    }
    
    try {
      await mongoose.connect(mongoUri);
      
      this.isMongoConnected = true;
      this.useFileStorage = false;
      console.log('🌍 MongoDB connected - using cloud database');
      
      // Test the connection
      const count = await GameModel.countDocuments();
      console.log(`📊 MongoDB contains ${count} games`);
      
    } catch (error) {
      console.warn('⚠️ MongoDB connection failed - falling back to file storage:', error.message);
      this.isMongoConnected = false;
      this.useFileStorage = true;
    }
  }
  
  // Save game (MongoDB or File)
  async saveGame(game) {
    try {
      if (this.isMongoConnected) {
        // MongoDB storage
        const existingGame = await GameModel.findOne({ id: game.id });
        
        if (existingGame) {
          // Update existing
          Object.assign(existingGame, game);
          existingGame.updatedAt = Date.now();
          const savedGame = await existingGame.save();
          console.log(`☁️ Game ${game.id} updated in MongoDB`);
          return this.formatGameForResponse(savedGame.toObject());
        } else {
          // Create new
          const newGame = new GameModel({
            ...game,
            updatedAt: Date.now()
          });
          const savedGame = await newGame.save();
          console.log(`☁️ Game ${game.id} saved to MongoDB`);
          return this.formatGameForResponse(savedGame.toObject());
        }
      } else {
        // File storage
        const success = this.saveGameToFile(game);
        if (success) {
          return game; // Return the game object for file storage
        }
        return false;
      }
    } catch (error) {
      console.error('❌ Failed to save game:', error);
      
      // Fallback to file storage if MongoDB fails
      if (this.isMongoConnected) {
        console.log('🔄 Falling back to file storage...');
        const success = this.saveGameToFile(game);
        return success ? game : false;
      }
      
      return false;
    }
  }
  
  // Get game (MongoDB or File)
  async getGame(gameId) {
    try {
      if (this.isMongoConnected) {
        // MongoDB storage
        const game = await GameModel.findOne({ id: gameId }).lean();
        return game ? this.formatGameForResponse(game) : null;
      } else {
        // File storage
        return this.getGameFromFile(gameId);
      }
    } catch (error) {
      console.error('❌ Failed to get game:', error);
      
      // Fallback to file storage
      if (this.isMongoConnected) {
        return this.getGameFromFile(gameId);
      }
      
      return null;
    }
  }
  
  // Update game (MongoDB or File)
  async updateGame(gameId, updates) {
    try {
      if (this.isMongoConnected) {
        // MongoDB storage
        const updatedGame = await GameModel.findOneAndUpdate(
          { id: gameId },
          { ...updates, updatedAt: Date.now() },
          { new: true }
        ).lean();
        
        if (updatedGame) {
          console.log(`☁️ Game ${gameId} updated in MongoDB`);
          return true;
        }
        return false;
      } else {
        // File storage
        return this.updateGameInFile(gameId, updates);
      }
    } catch (error) {
      console.error('❌ Failed to update game:', error);
      
      // Fallback to file storage
      if (this.isMongoConnected) {
        return this.updateGameInFile(gameId, updates);
      }
      
      return false;
    }
  }
  
  // Get public games (MongoDB or File)
  async getPublicGames() {
    try {
      if (this.isMongoConnected) {
        // MongoDB storage
        const games = await GameModel.find({ 
          isPublic: true,
          status: { $in: ['waiting', 'playing'] }
        })
        .sort({ createdAt: -1 })
        .limit(20)
        .lean();
        
        return games.map(game => this.formatGameForResponse(game));
      } else {
        // File storage
        return this.getPublicGamesFromFile();
      }
    } catch (error) {
      console.error('❌ Failed to get public games:', error);
      
      // Fallback to file storage
      if (this.isMongoConnected) {
        return this.getPublicGamesFromFile();
      }
      
      return [];
    }
  }
  
  // Delete game (MongoDB or File)
  async deleteGame(gameId) {
    try {
      if (this.isMongoConnected) {
        // MongoDB storage
        const result = await GameModel.deleteOne({ id: gameId });
        return result.deletedCount > 0;
      } else {
        // File storage
        return this.deleteGameFromFile(gameId);
      }
    } catch (error) {
      console.error('❌ Failed to delete game:', error);
      return false;
    }
  }
  
  // Clean up ALL games for fresh start
  async cleanupAllGames() {
    try {
      if (this.isMongoConnected) {
        // MongoDB storage - delete all games
        const result = await GameModel.deleteMany({});
        console.log(`🧹 Cleaned up ${result.deletedCount} games from MongoDB`);
        return result.deletedCount;
      } else {
        // File storage - reset games file
        fs.writeFileSync(this.gamesFile, JSON.stringify([]));
        fs.writeFileSync(this.publicGamesFile, JSON.stringify([]));
        console.log('🧹 Cleaned up all games from file storage');
        return 0;
      }
    } catch (error) {
      console.error('❌ Failed to cleanup all games:', error);
      return 0;
    }
  }
  
  // Cleanup old games (MongoDB or File)
  async cleanupOldGames() {
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
    
    try {
      if (this.isMongoConnected) {
        // MongoDB storage
        const result = await GameModel.deleteMany({
          createdAt: { $lt: oneDayAgo }
        });
        return result.deletedCount;
      } else {
        // File storage
        return this.cleanupOldGamesFromFile(oneDayAgo);
      }
    } catch (error) {
      console.error('❌ Failed to cleanup old games:', error);
      return 0;
    }
  }
  
  // Get database stats
  async getStats() {
    try {
      if (this.isMongoConnected) {
        // MongoDB stats
        const totalGames = await GameModel.countDocuments();
        const publicGames = await GameModel.countDocuments({ isPublic: true });
        const activeGames = await GameModel.countDocuments({ status: 'playing' });
        const waitingGames = await GameModel.countDocuments({ status: 'waiting' });
        const finishedGames = await GameModel.countDocuments({ status: 'finished' });
        
        return {
          totalGames,
          publicGames,
          activeGames,
          waitingGames,
          finishedGames,
          timestamp: Date.now(),
          storage: 'mongodb'
        };
      } else {
        // File storage stats
        return this.getFileStats();
      }
    } catch (error) {
      console.error('❌ Failed to get stats:', error);
      return {
        totalGames: 0,
        publicGames: 0,
        activeGames: 0,
        waitingGames: 0,
        finishedGames: 0,
        timestamp: Date.now(),
        storage: 'error'
      };
    }
  }
  
  // File Storage Methods
  saveGameToFile(game) {
    try {
      const games = JSON.parse(fs.readFileSync(this.gamesFile, 'utf8'));
      
      games[game.id] = {
        ...game,
        updatedAt: Date.now()
      };
      
      fs.writeFileSync(this.gamesFile, JSON.stringify(games, null, 2));
      
      // Update public games list if needed
      if (game.isPublic) {
        this.updatePublicGamesList();
      }
      
      console.log(`💾 Game ${game.id} saved to file`);
      return true;
    } catch (error) {
      console.error('❌ Failed to save game to file:', error);
      return false;
    }
  }
  
  getGameFromFile(gameId) {
    try {
      const games = JSON.parse(fs.readFileSync(this.gamesFile, 'utf8'));
      return games[gameId] || null;
    } catch (error) {
      console.error('❌ Failed to get game from file:', error);
      return null;
    }
  }
  
  updateGameInFile(gameId, updates) {
    try {
      const games = JSON.parse(fs.readFileSync(this.gamesFile, 'utf8'));
      
      if (!games[gameId]) {
        return false;
      }
      
      games[gameId] = {
        ...games[gameId],
        ...updates,
        updatedAt: Date.now()
      };
      
      fs.writeFileSync(this.gamesFile, JSON.stringify(games, null, 2));
      
      // Update public games list if needed
      if (games[gameId].isPublic) {
        this.updatePublicGamesList();
      }
      
      console.log(`💾 Game ${gameId} updated in file`);
      return true;
    } catch (error) {
      console.error('❌ Failed to update game in file:', error);
      return false;
    }
  }
  
  getPublicGamesFromFile() {
    try {
      const games = JSON.parse(fs.readFileSync(this.gamesFile, 'utf8'));
      
      return Object.values(games)
        .filter(game => game.isPublic && ['waiting', 'playing'].includes(game.status))
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, 20);
    } catch (error) {
      console.error('❌ Failed to get public games from file:', error);
      return [];
    }
  }
  
  deleteGameFromFile(gameId) {
    try {
      const games = JSON.parse(fs.readFileSync(this.gamesFile, 'utf8'));
      
      if (!games[gameId]) {
        return false;
      }
      
      delete games[gameId];
      fs.writeFileSync(this.gamesFile, JSON.stringify(games, null, 2));
      
      // Update public games list
      this.updatePublicGamesList();
      
      console.log(`💾 Game ${gameId} deleted from file`);
      return true;
    } catch (error) {
      console.error('❌ Failed to delete game from file:', error);
      return false;
    }
  }
  
  cleanupOldGamesFromFile(oneDayAgo) {
    try {
      const games = JSON.parse(fs.readFileSync(this.gamesFile, 'utf8'));
      let cleanedCount = 0;
      
      for (const [gameId, game] of Object.entries(games)) {
        if (game.createdAt < oneDayAgo) {
          delete games[gameId];
          cleanedCount++;
        }
      }
      
      if (cleanedCount > 0) {
        fs.writeFileSync(this.gamesFile, JSON.stringify(games, null, 2));
        this.updatePublicGamesList();
      }
      
      return cleanedCount;
    } catch (error) {
      console.error('❌ Failed to cleanup old games from file:', error);
      return 0;
    }
  }
  
  getFileStats() {
    try {
      const games = JSON.parse(fs.readFileSync(this.gamesFile, 'utf8'));
      const gameArray = Object.values(games);
      
      return {
        totalGames: gameArray.length,
        publicGames: gameArray.filter(g => g.isPublic).length,
        activeGames: gameArray.filter(g => g.status === 'playing').length,
        waitingGames: gameArray.filter(g => g.status === 'waiting').length,
        finishedGames: gameArray.filter(g => g.status === 'finished').length,
        timestamp: Date.now(),
        storage: 'file'
      };
    } catch (error) {
      console.error('❌ Failed to get file stats:', error);
      return {
        totalGames: 0,
        publicGames: 0,
        activeGames: 0,
        waitingGames: 0,
        finishedGames: 0,
        timestamp: Date.now(),
        storage: 'file_error'
      };
    }
  }
  
  updatePublicGamesList() {
    try {
      const games = JSON.parse(fs.readFileSync(this.gamesFile, 'utf8'));
      const publicGames = Object.values(games)
        .filter(game => game.isPublic && ['waiting', 'playing'].includes(game.status))
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, 20);
      
      fs.writeFileSync(this.publicGamesFile, JSON.stringify(publicGames, null, 2));
    } catch (error) {
      console.error('❌ Failed to update public games list:', error);
    }
  }
  
  formatGameForResponse(mongoGame) {
    // Convert MongoDB document to our expected format
    const { _id, __v, ...game } = mongoGame;
    return game;
  }
  
  // Get connection status
  getConnectionStatus() {
    return {
      mongodb: this.isMongoConnected,
      fileStorage: this.useFileStorage,
      status: this.isMongoConnected ? 'mongodb' : 'file'
    };
  }
}

module.exports = ProductionDatabase; 