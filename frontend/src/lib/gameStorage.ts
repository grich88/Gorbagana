// Cross-Device Game Storage with Backend API Support
// Falls back to localStorage when backend is unavailable

// Game type definition (matching main app)
interface Game {
  id: string;
  playerX: string;
  playerO?: string;
  board: number[];
  currentTurn: number;
  status: "waiting" | "playing" | "finished";
  winner?: number;
  createdAt: number;
  wager: number;
  isPublic: boolean;
  creatorName?: string;
  escrowAccount?: string;
  txSignature?: string;
}

export interface SharedGame {
  id: string
  playerX: string
  playerO?: string
  board: number[]
  currentTurn: number
  status: 'waiting' | 'playing' | 'finished' | 'abandoned'
  winner?: number
  createdAt: number
  updatedAt: number
  wager: number
  isPublic: boolean
  creatorName?: string
  escrowAccount?: string
  txSignature?: string
  playerXDeposit?: string
  playerODeposit?: string
  abandonedBy?: string
  abandonReason?: string
}

// Backend API configuration - Browser-safe environment variable access
const getApiBaseUrl = () => {
  // Use Next.js environment variable if available (build time)
  if (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  
  // Browser-safe fallback
  if (typeof window !== 'undefined') {
    return window.location.hostname !== 'localhost' 
      ? 'https://gorbagana-trash-tac-toe-backend.onrender.com'  // Production backend URL on Render
      : 'http://localhost:3002';
  }
  
  // Server-side fallback
  return 'http://localhost:3002';
};

const API_BASE_URL = getApiBaseUrl();

class GameStorage {
  private readonly STORAGE_PREFIX = 'gorbagana_game_'
  private readonly SHARED_PREFIX = 'shared_games'
  private readonly CONNECTION_STATUS_KEY = 'backend_status'
  
  private isBackendAvailable = false
  private initializationPromise: Promise<boolean> | null = null
  private hasInitialized = false
  
  constructor() {
    // DON'T initialize during build - only in browser
    // This prevents network calls during Next.js static generation
  }
  
  // Wait for initialization if needed (browser only)
  private async waitForInitialization(): Promise<void> {
    // Only initialize in browser environment
    if (typeof window === 'undefined') {
      console.log('🏗️ Build environment detected - skipping backend connection')
      return
    }
    
    if (!this.hasInitialized && !this.initializationPromise) {
      this.initializationPromise = this.checkBackendConnection()
    }
    
    if (this.initializationPromise) {
      await this.initializationPromise
      this.initializationPromise = null
      this.hasInitialized = true
    }
  }
  
  // Check if backend is available (browser only)
  private async checkBackendConnection(): Promise<boolean> {
    // CRITICAL FIX: Only run in browser, never during build
    if (typeof window === 'undefined') {
      console.log('🏗️ Server-side detected - skipping backend connection check')
      return false
    }
    
    try {
      console.log(`🔍 Testing backend connection: ${API_BASE_URL}/health`)
      
      const response = await fetch(`${API_BASE_URL}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      this.isBackendAvailable = response.ok
      
      // Store connection status in localStorage
      localStorage.setItem(this.CONNECTION_STATUS_KEY, JSON.stringify({
        available: this.isBackendAvailable,
        lastChecked: Date.now(),
        url: API_BASE_URL
      }))
      
      if (this.isBackendAvailable) {
        console.log('✅ Backend API connected - cross-device games enabled')
        console.log(`📡 API URL: ${API_BASE_URL}`)
      } else {
        console.log('⚠️ Backend API unavailable - using local storage only')
        console.log(`❌ Response status: ${response.status}`)
      }
      
      return this.isBackendAvailable
    } catch (error) {
      this.isBackendAvailable = false
      console.log('❌ Backend API connection failed - using local storage only')
      console.error('Connection error:', error)
      return false
    }
  }
  
  // Backend API methods
  private async apiRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    try {
      console.log(`🌐 API Request: ${endpoint}`)
      
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        ...options,
        signal: AbortSignal.timeout(10000)
      })
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.status} - ${response.statusText}`)
      }
      
      const data = await response.json()
      console.log(`✅ API Response: ${endpoint}`, data)
      return data
    } catch (error) {
      console.error(`❌ API request failed: ${endpoint}`, error)
      throw error
    }
  }
  
  // Save game (tries backend first, falls back to localStorage)
  async saveGame(game: SharedGame): Promise<boolean> {
    try {
      // Wait for initialization
      await this.waitForInitialization()
      
      // Always save locally first as backup
      this.saveGameLocally(game)
      
      // Try to save to backend if available
      if (this.isBackendAvailable || await this.checkBackendConnection()) {
        try {
          const response = await this.apiRequest('/api/games', {
            method: 'POST',
            body: JSON.stringify(game)
          })
          console.log(`☁️ Game ${game.id} saved to backend database`)
          return true
        } catch (error) {
          console.warn(`Failed to save to backend, using local storage: ${error}`)
          this.isBackendAvailable = false
        }
      }
      
      console.log(`💾 Game ${game.id} saved locally only (backend unavailable)`)
      return true
    } catch (error) {
      console.error('Failed to save game:', error)
      return false
    }
  }

  // Load game (tries backend first, falls back to localStorage)
  async loadGame(gameId: string): Promise<SharedGame | null> {
    try {
      // Wait for initialization
      await this.waitForInitialization()
      
      // Try backend first if available
      if (this.isBackendAvailable || await this.checkBackendConnection()) {
        try {
          const response = await this.apiRequest(`/api/games/${gameId}`)
          console.log(`☁️ Game ${gameId} loaded from backend database`)
          
          // Also cache locally
          this.saveGameLocally(response.game)
          return response.game
        } catch (error) {
          console.warn(`Failed to load from backend: ${error}`)
          this.isBackendAvailable = false
        }
      }
      
      // Fallback to local storage
      const localGame = this.loadGameLocally(gameId)
      if (localGame) {
        console.log(`💾 Game ${gameId} loaded from local storage`)
      } else {
        console.log(`❌ Game ${gameId} not found anywhere`)
      }
      return localGame
    } catch (error) {
      console.error('Failed to load game:', error)
      return null
    }
  }

  // Update existing game
  async updateGame(gameId: string, updates: Partial<SharedGame>): Promise<boolean> {
    try {
      // Wait for initialization
      await this.waitForInitialization()
      
      // Update locally first
      const existingGame = this.loadGameLocally(gameId)
    if (!existingGame) return false
    
    const updatedGame = {
      ...existingGame,
      ...updates,
      updatedAt: Date.now()
    }
    
      this.saveGameLocally(updatedGame)
      
      // Try to update backend
      if (this.isBackendAvailable || await this.checkBackendConnection()) {
        try {
          await this.apiRequest(`/api/games/${gameId}`, {
            method: 'PUT',
            body: JSON.stringify(updates)
          })
          console.log(`☁️ Game ${gameId} updated on backend database`)
        } catch (error) {
          console.warn(`Failed to update backend: ${error}`)
          this.isBackendAvailable = false
        }
      }
      
      return true
    } catch (error) {
      console.error('Failed to update game:', error)
      return false
    }
  }
  
  // Get all public games (tries backend first)
  async getPublicGames(): Promise<SharedGame[]> {
    try {
      // Wait for initialization
      await this.waitForInitialization()
      
      // Try backend first
      if (this.isBackendAvailable || await this.checkBackendConnection()) {
        try {
          const response = await this.apiRequest('/api/games')
          console.log(`☁️ Loaded ${response.games.length} public games from backend database`)
          return response.games
        } catch (error) {
          console.warn(`Failed to load public games from backend: ${error}`)
          this.isBackendAvailable = false
        }
      }
      
      // Fallback to local storage
      const localGames = this.getPublicGamesLocally()
      console.log(`💾 Loaded ${localGames.length} public games from local storage`)
      return localGames
    } catch (error) {
      console.error('Failed to load public games:', error)
      return []
    }
  }
  
  // Join a game (backend only for multiplayer coordination)
  async joinGame(gameId: string, playerAddress: string, playerName?: string): Promise<SharedGame | null> {
    try {
      // Wait for initialization
      await this.waitForInitialization()
      
      if (this.isBackendAvailable || await this.checkBackendConnection()) {
        try {
          const response = await this.apiRequest(`/api/games/${gameId}/join`, {
            method: 'POST',
            body: JSON.stringify({ playerAddress, playerName })
          })
          
          // Cache the updated game locally
          this.saveGameLocally(response.game)
          console.log(`🎮 Joined game ${gameId} via backend database`)
          return response.game
        } catch (error) {
          console.error(`Failed to join game via backend: ${error}`)
          throw error
        }
      } else {
        throw new Error('Backend unavailable - cannot join multiplayer games')
      }
    } catch (error) {
      console.error('Failed to join game:', error)
      return null
    }
  }
  
  // Make a move (backend only for multiplayer coordination)
  async makeMove(gameId: string, position: number, playerAddress: string): Promise<SharedGame | null> {
    try {
      // Wait for initialization
      await this.waitForInitialization()
      
      if (this.isBackendAvailable || await this.checkBackendConnection()) {
        try {
          const response = await this.apiRequest(`/api/games/${gameId}/move`, {
            method: 'POST',
            body: JSON.stringify({ position, playerAddress })
          })
          
          // Cache the updated game locally
          this.saveGameLocally(response.game)
          console.log(`🎯 Move made in game ${gameId} via backend database`)
          return response.game
        } catch (error) {
          console.error(`Failed to make move via backend: ${error}`)
          throw error
        }
      } else {
        // For local games, update locally
        const game = this.loadGameLocally(gameId)
        if (!game) return null
        
        // Simple local move validation and update
        if (game.board[position] !== 0) return null
        
        const newBoard = [...game.board]
        newBoard[position] = game.currentTurn
        
        const updatedGame = {
          ...game,
          board: newBoard,
          currentTurn: game.currentTurn === 1 ? 2 : 1,
          updatedAt: Date.now()
        }
        
        this.saveGameLocally(updatedGame)
        return updatedGame
      }
    } catch (error) {
      console.error('Failed to make move:', error)
      return null
    }
  }
  
  // Local storage methods (fallback)
  private saveGameLocally(game: SharedGame): boolean {
    try {
      // Only save locally in browser environment
      if (typeof window === 'undefined') return false
      
      localStorage.setItem(`${this.STORAGE_PREFIX}${game.id}`, JSON.stringify(game))
      
      if (game.isPublic) {
        this.addToSharedIndex(game.id)
      }
      
      return true
    } catch (error) {
      console.error('Failed to save game locally:', error)
      return false
    }
  }
  
  private loadGameLocally(gameId: string): SharedGame | null {
    try {
      // Only load locally in browser environment
      if (typeof window === 'undefined') return null
      
      const data = localStorage.getItem(`${this.STORAGE_PREFIX}${gameId}`)
      return data ? JSON.parse(data) : null
    } catch (error) {
      console.error('Failed to load game locally:', error)
      return null
    }
  }
  
  private getPublicGamesLocally(): SharedGame[] {
    try {
      // Only access localStorage in browser environment
      if (typeof window === 'undefined') return []
      
      const shared = JSON.parse(localStorage.getItem(this.SHARED_PREFIX) || '[]')
      const games: SharedGame[] = []
      
      for (const gameId of shared) {
        const game = this.loadGameLocally(gameId)
        if (game && game.isPublic && game.status === 'waiting') {
          games.push(game)
        }
      }
      
      return games.sort((a, b) => b.createdAt - a.createdAt)
    } catch (error) {
      console.error('Failed to get public games locally:', error)
      return []
    }
  }

  // Delete game
  async deleteGame(gameId: string): Promise<boolean> {
    try {
      // Wait for initialization
      await this.waitForInitialization()
      
      // Delete locally
      localStorage.removeItem(`${this.STORAGE_PREFIX}${gameId}`)
      this.removeFromSharedIndex(gameId)
      
      // Try to delete from backend
      if (this.isBackendAvailable || await this.checkBackendConnection()) {
        try {
          await this.apiRequest(`/api/games/${gameId}`, {
            method: 'DELETE'
          })
          console.log(`☁️ Game ${gameId} deleted from backend database`)
        } catch (error) {
          console.warn(`Failed to delete from backend: ${error}`)
        }
      }
      
      console.log(`✅ Game ${gameId} deleted`)
      return true
    } catch (error) {
      console.error('Failed to delete game:', error)
      return false
    }
  }

  // Clean up old games (older than 24 hours)
  cleanupOldGames(): void {
    try {
      // Only run cleanup in browser environment
      if (typeof window === 'undefined') return
      
      const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000)
      const keysToRemove: string[] = []
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key?.startsWith(this.STORAGE_PREFIX)) {
          const data = localStorage.getItem(key)
          if (data) {
            try {
              const game = JSON.parse(data)
              if (game.createdAt < oneDayAgo) {
                keysToRemove.push(key)
              }
            } catch {
              // Remove invalid data
              keysToRemove.push(key)
            }
          }
        }
      }
      
      keysToRemove.forEach(key => localStorage.removeItem(key))
      
      if (keysToRemove.length > 0) {
        console.log(`🧹 Cleaned up ${keysToRemove.length} old games`)
      }
    } catch (error) {
      console.error('Failed to cleanup old games:', error)
    }
  }
  
  // Get backend connection status
  getConnectionStatus(): { available: boolean; lastChecked: number; url?: string } {
    // CRITICAL FIX: Safe for build time - only access localStorage in browser
    if (typeof window === 'undefined') {
      console.log('🏗️ Build environment - returning default connection status')
      return {
        available: false,
        lastChecked: 0,
        url: API_BASE_URL
      }
    }
    
    try {
      const stored = localStorage.getItem(this.CONNECTION_STATUS_KEY)
      if (stored) {
        return JSON.parse(stored)
      }
    } catch (error) {
      console.warn('Failed to read connection status from localStorage:', error)
    }
    
    return {
      available: this.isBackendAvailable,
      lastChecked: Date.now(),
      url: API_BASE_URL
    }
  }
  
  // Test backend connection manually
  async testConnection(): Promise<boolean> {
    // CRITICAL FIX: Only test connections in browser, not during build
    if (typeof window === 'undefined') {
      console.log('🏗️ Build environment - skipping connection test')
      return false
    }
    
    return this.checkBackendConnection()
  }

  // Generate shareable game data as base64 string
  generateShareableData(gameId: string): string | null {
    const game = this.loadGameLocally(gameId)
    if (!game) return null
    
    try {
      const shareData = {
        id: game.id,
        playerX: game.playerX,
        board: game.board,
        currentTurn: game.currentTurn,
        status: game.status,
        winner: game.winner,
        createdAt: game.createdAt,
        wager: game.wager,
        isPublic: game.isPublic,
        creatorName: game.creatorName,
        backendUrl: this.isBackendAvailable ? API_BASE_URL : undefined
      }
      
      const encoded = btoa(JSON.stringify(shareData))
      console.log(`📤 Generated shareable data for game ${gameId}`)
      return encoded
    } catch (error) {
      console.error('Failed to generate shareable data:', error)
      return null
    }
  }

  // Import game from shareable data
  async importFromShareableData(encodedData: string): Promise<SharedGame | null> {
    try {
      const decoded = atob(encodedData)
      const shareData = JSON.parse(decoded)
      
      // If the shared data includes a backend URL, try to load from there first
      if (shareData.backendUrl && shareData.backendUrl !== API_BASE_URL) {
        try {
          const response = await fetch(`${shareData.backendUrl}/api/games/${shareData.id}`)
          if (response.ok) {
            const { game } = await response.json()
            this.saveGameLocally(game)
            console.log(`📥 Imported game ${shareData.id} from shared backend`)
            return game
          }
        } catch (error) {
          console.warn('Failed to import from shared backend, using local data')
        }
      }
      
      const game: SharedGame = {
        ...shareData,
        playerO: undefined, // Reset for new player
        updatedAt: Date.now()
      }
      
      this.saveGameLocally(game)
      console.log(`📥 Imported game ${game.id} from shareable data`)
      return game
    } catch (error) {
      console.error('Failed to import from shareable data:', error)
      return null
    }
  }

  // Generate shareable URL
  generateShareableUrl(gameId: string, baseUrl: string = window.location.origin): string | null {
    const shareData = this.generateShareableData(gameId)
    if (!shareData) return null
    
    return `${baseUrl}?import=${shareData}`
  }

  // Check if URL has import data
  checkForImportData(): Promise<SharedGame | null> {
    if (typeof window === 'undefined') return Promise.resolve(null)
    
    const urlParams = new URLSearchParams(window.location.search)
    const importData = urlParams.get('import')
    
    if (importData) {
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname)
      return this.importFromShareableData(importData)
    }
    
    return Promise.resolve(null)
  }

  private addToSharedIndex(gameId: string): void {
    try {
      // Only access localStorage in browser environment
      if (typeof window === 'undefined') return
      
      const shared = JSON.parse(localStorage.getItem(this.SHARED_PREFIX) || '[]')
      if (!shared.includes(gameId)) {
        shared.push(gameId)
        localStorage.setItem(this.SHARED_PREFIX, JSON.stringify(shared))
      }
    } catch {
      // Ignore errors
    }
  }

  private removeFromSharedIndex(gameId: string): void {
    try {
      // Only access localStorage in browser environment
      if (typeof window === 'undefined') return
      
      const shared = JSON.parse(localStorage.getItem(this.SHARED_PREFIX) || '[]')
      const filtered = shared.filter((id: string) => id !== gameId)
      localStorage.setItem(this.SHARED_PREFIX, JSON.stringify(filtered))
    } catch {
      // Ignore errors
    }
  }
}

// Global instance
export const gameStorage = new GameStorage()

// Helper functions to convert between formats
export const convertToSharedGame = (localGame: Game): SharedGame => {
  return {
    id: localGame.id,
    playerX: localGame.playerX,
    playerO: localGame.playerO,
    board: localGame.board,
    currentTurn: localGame.currentTurn,
    status: localGame.status,
    winner: localGame.winner,
    createdAt: localGame.createdAt || Date.now(),
    updatedAt: Date.now(),
    wager: localGame.wager || 0,
    isPublic: localGame.isPublic || false,
    creatorName: localGame.creatorName,
    escrowAccount: localGame.escrowAccount,
    txSignature: localGame.txSignature
  }
}

export const convertFromSharedGame = (sharedGame: SharedGame): Game => {
  return {
    id: sharedGame.id,
    playerX: sharedGame.playerX,
    playerO: sharedGame.playerO,
    board: sharedGame.board,
    currentTurn: sharedGame.currentTurn,
    status: sharedGame.status,
    winner: sharedGame.winner,
    createdAt: sharedGame.createdAt,
    wager: sharedGame.wager,
    isPublic: sharedGame.isPublic,
    creatorName: sharedGame.creatorName,
    escrowAccount: sharedGame.escrowAccount,
    txSignature: sharedGame.txSignature
  }
} 