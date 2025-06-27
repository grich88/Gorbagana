const fs = require('fs');
const path = require('path');

class FileDatabase {
  constructor() {
    this.dbDir = path.join(__dirname, 'data');
    this.gamesFile = path.join(this.dbDir, 'games.json');
    this.publicGamesFile = path.join(this.dbDir, 'public_games.json');
    
    // Create data directory if it doesn't exist
    if (!fs.existsSync(this.dbDir)) {
      fs.mkdirSync(this.dbDir, { recursive: true });
      console.log('📁 Created database directory');
    }
    
    // Initialize files if they don't exist
    this.initializeFiles();
  }
  
  initializeFiles() {
    if (!fs.existsSync(this.gamesFile)) {
      this.writeFile(this.gamesFile, {});
      console.log('📄 Initialized games.json');
    }
    
    if (!fs.existsSync(this.publicGamesFile)) {
      this.writeFile(this.publicGamesFile, {});
      console.log('📄 Initialized public_games.json');
    }
  }
  
  writeFile(filePath, data) {
    try {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      return true;
    } catch (error) {
      console.error(`Failed to write ${filePath}:`, error);
      return false;
    }
  }
  
  readFile(filePath) {
    try {
      if (fs.existsSync(filePath)) {
        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data);
      }
      return {};
    } catch (error) {
      console.error(`Failed to read ${filePath}:`, error);
      return {};
    }
  }
  
  // Game operations
  saveGame(game) {
    try {
      const games = this.readFile(this.gamesFile);
      games[game.id] = {
        ...game,
        updatedAt: Date.now()
      };
      
      const success = this.writeFile(this.gamesFile, games);
      
      // Also update public games index if needed
      if (game.isPublic && game.status === 'waiting') {
        this.addToPublicGames(game);
      } else if (!game.isPublic || game.status !== 'waiting') {
        this.removeFromPublicGames(game.id);
      }
      
      if (success) {
        console.log(`💾 Game ${game.id} saved to database`);
      }
      return success;
    } catch (error) {
      console.error('Failed to save game:', error);
      return false;
    }
  }
  
  getGame(gameId) {
    try {
      const games = this.readFile(this.gamesFile);
      const game = games[gameId];
      
      if (game) {
        console.log(`📖 Game ${gameId} loaded from database`);
        return game;
      }
      
      console.log(`❌ Game ${gameId} not found in database`);
      return null;
    } catch (error) {
      console.error('Failed to get game:', error);
      return null;
    }
  }
  
  updateGame(gameId, updates) {
    try {
      const games = this.readFile(this.gamesFile);
      
      if (!games[gameId]) {
        return false;
      }
      
      games[gameId] = {
        ...games[gameId],
        ...updates,
        updatedAt: Date.now()
      };
      
      const success = this.writeFile(this.gamesFile, games);
      
      // Update public games index if needed
      const updatedGame = games[gameId];
      if (updatedGame.isPublic && updatedGame.status === 'waiting') {
        this.addToPublicGames(updatedGame);
      } else {
        this.removeFromPublicGames(gameId);
      }
      
      if (success) {
        console.log(`🔄 Game ${gameId} updated in database`);
      }
      return success;
    } catch (error) {
      console.error('Failed to update game:', error);
      return false;
    }
  }
  
  deleteGame(gameId) {
    try {
      const games = this.readFile(this.gamesFile);
      
      if (games[gameId]) {
        delete games[gameId];
        const success = this.writeFile(this.gamesFile, games);
        
        // Remove from public games
        this.removeFromPublicGames(gameId);
        
        if (success) {
          console.log(`🗑️ Game ${gameId} deleted from database`);
        }
        return success;
      }
      
      return false;
    } catch (error) {
      console.error('Failed to delete game:', error);
      return false;
    }
  }
  
  getAllGames() {
    try {
      return this.readFile(this.gamesFile);
    } catch (error) {
      console.error('Failed to get all games:', error);
      return {};
    }
  }
  
  // Public games operations
  addToPublicGames(game) {
    try {
      const publicGames = this.readFile(this.publicGamesFile);
      publicGames[game.id] = {
        id: game.id,
        playerX: game.playerX,
        createdAt: game.createdAt,
        wager: game.wager,
        creatorName: game.creatorName,
        status: game.status
      };
      
      return this.writeFile(this.publicGamesFile, publicGames);
    } catch (error) {
      console.error('Failed to add to public games:', error);
      return false;
    }
  }
  
  removeFromPublicGames(gameId) {
    try {
      const publicGames = this.readFile(this.publicGamesFile);
      
      if (publicGames[gameId]) {
        delete publicGames[gameId];
        return this.writeFile(this.publicGamesFile, publicGames);
      }
      
      return true; // Already removed
    } catch (error) {
      console.error('Failed to remove from public games:', error);
      return false;
    }
  }
  
  getPublicGames() {
    try {
      const publicGames = this.readFile(this.publicGamesFile);
      
      // Convert to array and sort by creation time
      const gamesArray = Object.values(publicGames)
        .filter(game => game.status === 'waiting')
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, 20); // Limit to 20 most recent
      
      console.log(`📋 Loaded ${gamesArray.length} public games from database`);
      return gamesArray;
    } catch (error) {
      console.error('Failed to get public games:', error);
      return [];
    }
  }
  
  // Cleanup operations
  cleanupOldGames() {
    try {
      const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
      const games = this.readFile(this.gamesFile);
      const publicGames = this.readFile(this.publicGamesFile);
      
      let cleanedCount = 0;
      
      // Clean old games
      for (const [gameId, game] of Object.entries(games)) {
        if (game.createdAt < oneDayAgo) {
          delete games[gameId];
          delete publicGames[gameId];
          cleanedCount++;
        }
      }
      
      if (cleanedCount > 0) {
        this.writeFile(this.gamesFile, games);
        this.writeFile(this.publicGamesFile, publicGames);
        console.log(`🧹 Cleaned up ${cleanedCount} old games`);
      }
      
      return cleanedCount;
    } catch (error) {
      console.error('Failed to cleanup old games:', error);
      return 0;
    }
  }
  
  // Statistics
  getStats() {
    try {
      const games = this.getAllGames();
      const publicGames = this.getPublicGames();
      const gamesArray = Object.values(games);
      
      return {
        totalGames: gamesArray.length,
        publicGames: publicGames.length,
        activeGames: gamesArray.filter(g => g.status === 'playing').length,
        waitingGames: gamesArray.filter(g => g.status === 'waiting').length,
        finishedGames: gamesArray.filter(g => g.status === 'finished').length,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('Failed to get stats:', error);
      return {
        totalGames: 0,
        publicGames: 0,
        activeGames: 0,
        waitingGames: 0,
        finishedGames: 0,
        timestamp: Date.now()
      };
    }
  }
}

module.exports = new FileDatabase(); 