/**
 * Universal Multiplayer Client Library
 * A generic framework for adding multiplayer functionality to any HTML game
 */
(function(global) {
  class UniversalMultiplayer {
    constructor(options = {}) {
      this.gameId = options.gameId || 'default';
      this.serverUrl = options.serverUrl || window.location.origin;
      this.roomId = options.roomId || null;
      this.playerId = null;
      this.players = {};
      this.eventListeners = {};
      this.gameState = {};
      this.lastSentState = {};
      this.connected = false;
      this.updateRate = options.updateRate || 100;
      this.updateInterval = null;
      
      // Game-specific handlers
      this.stateAdapter = options.stateAdapter || this.defaultStateAdapter;
      this.renderAdapter = options.renderAdapter || this.defaultRenderAdapter;
      
      console.log(`UniversalMultiplayer initialized for game: ${this.gameId}`);
    }
    
    // Connect to server
    connect(playerData = {}) {
      console.log(`Connecting to server: ${this.serverUrl}`);
      
      try {
        this.socket = io(this.serverUrl, {
          secure: true,
          rejectUnauthorized: false // Required for self-signed certificates
        });
        
        this.socket.on('connect', () => {
          this.connected = true;
          this.playerId = this.socket.id;
          console.log(`Connected to server with ID: ${this.playerId}`);
          
          // Join or create a room
          this.socket.emit('joinGame', {
            gameId: this.gameId,
            roomId: this.roomId,
            playerData: playerData
          });
          
          // Start sending updates
          this.updateInterval = setInterval(() => this.sendUpdate(), this.updateRate);
          
          // Trigger connected event
          this.triggerEvent('connected', { id: this.playerId });
        });
        
        // Handle basic socket events
        this.setupSocketEvents();
      } catch (error) {
        console.error('Error connecting to server:', error);
        this.triggerEvent('error', { message: 'Failed to connect to server', error });
      }
    }
    
    // Set up standard event handlers
    setupSocketEvents() {
      // Room joined confirmation
      this.socket.on('roomJoined', (data) => {
        this.roomId = data.roomId;
        console.log(`Joined room: ${this.roomId}`);
        this.triggerEvent('roomJoined', data);
      });
      
      // New player joined
      this.socket.on('playerJoined', (data) => {
        console.log(`Player joined: ${data.id}`);
        this.players[data.id] = data.playerData;
        this.triggerEvent('playerJoined', data);
      });
      
      // Player left
      this.socket.on('playerLeft', (data) => {
        console.log(`Player left: ${data.id}`);
        delete this.players[data.id];
        this.triggerEvent('playerLeft', data);
      });
      
      // State update from other players
      this.socket.on('stateUpdate', (data) => {
        // Only process updates from other players
        if (data.id !== this.playerId) {
          this.players[data.id] = {
            ...this.players[data.id],
            ...data.state
          };
          
          // Apply the update using the render adapter
          this.renderAdapter(data.id, data.state);
          
          // Trigger state update event
          this.triggerEvent('stateUpdate', data);
        }
      });
      
      // Custom game event
      this.socket.on('gameEvent', (data) => {
        console.log(`Received game event: ${data.eventType}`);
        this.triggerEvent('gameEvent', data);
        this.triggerEvent(data.eventType, data);
      });
      
      // Room closed
      this.socket.on('roomClosed', (data) => {
        console.log(`Room closed: ${data.roomId} - Reason: ${data.reason}`);
        this.triggerEvent('roomClosed', data);
      });
      
      // Disconnection
      this.socket.on('disconnect', () => {
        console.log('Disconnected from server');
        this.connected = false;
        clearInterval(this.updateInterval);
        this.triggerEvent('disconnected');
      });
      
      // Connection error
      this.socket.on('connect_error', (error) => {
        console.error('Connection error:', error);
        this.triggerEvent('error', { message: 'Connection error', error });
      });
    }
    
    // Send local player state to server
    sendUpdate() {
      if (!this.connected) return;
      
      // Get current state from the game using the adapter
      const currentState = this.stateAdapter();
      
      // Only send if state has changed
      if (this.hasStateChanged(currentState, this.lastSentState)) {
        this.socket.emit('stateUpdate', {
          roomId: this.roomId,
          state: currentState
        });
        
        // Store last sent state
        this.lastSentState = {...currentState};
      }
    }
    
    // Send a game-specific event
    sendGameEvent(eventType, eventData = {}) {
      if (!this.connected) return;
      
      console.log(`Sending game event: ${eventType}`);
      this.socket.emit('gameEvent', {
        roomId: this.roomId,
        eventType: eventType,
        eventData: eventData
      });
    }
    
    // Check if state has meaningfully changed
    hasStateChanged(newState, oldState) {
      if (!oldState) return true;
      
      // Simple deep comparison (can be optimized further)
      return JSON.stringify(newState) !== JSON.stringify(oldState);
    }
    
    // Default state adapter (override for your game)
    defaultStateAdapter() {
      console.warn('Using default state adapter - override this with your game-specific state');
      return {
        position: { x: 0, y: 0, z: 0 },
        rotation: 0
      };
    }
    
    // Default render adapter (override for your game)
    defaultRenderAdapter(playerId, playerState) {
      console.log(`Received state update for player ${playerId}`, playerState);
      console.warn('Using default render adapter - override this with your game-specific rendering');
    }
    
    // Create a shareable URL for the current room
    getShareableUrl() {
      if (!this.roomId) return null;
      
      const url = new URL(window.location.href);
      url.searchParams.set('room', this.roomId);
      return url.toString();
    }
    
    // Get room info
    getRoomInfo() {
      return {
        roomId: this.roomId,
        playerCount: Object.keys(this.players).length + 1, // +1 for local player
        players: {...this.players, [this.playerId]: this.lastSentState}
      };
    }
    
    // Event system
    on(eventName, callback) {
      if (!this.eventListeners[eventName]) {
        this.eventListeners[eventName] = [];
      }
      this.eventListeners[eventName].push(callback);
      return this; // Allow method chaining
    }
    
    triggerEvent(eventName, data) {
      if (this.eventListeners[eventName]) {
        this.eventListeners[eventName].forEach(callback => callback(data));
      }
    }
    
    // Disconnect from server
    disconnect() {
      if (this.socket) {
        this.socket.disconnect();
      }
      clearInterval(this.updateInterval);
      this.connected = false;
      console.log('Manually disconnected from server');
    }
  }

  // Expose globally for browser
  global.UniversalMultiplayer = UniversalMultiplayer;

})(typeof window !== 'undefined' ? window : global); 