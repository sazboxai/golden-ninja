/**
 * Universal Multiplayer Server
 * A generic server for any HTML game using the UniversalMultiplayer client
 */

const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');
const cors = require('cors');

// Create Express app and HTTP server
const app = express();
app.use(cors());
const server = http.createServer(app);

// Configure Socket.io with cross-origin support
const io = socketIO(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  },
  transports: ['websocket', 'polling']
});

// Serve static files from the current directory
app.use(express.static(path.join(__dirname), {
  setHeaders: (res, path, stat) => {
    if (path.endsWith('.js')) {
      res.set('Content-Type', 'text/javascript');
    }
  }
}));

// Explicitly serve the multiplayer.js file
app.get('/universal-multiplayer.js', (req, res) => {
  res.set('Content-Type', 'text/javascript');
  res.sendFile(path.join(__dirname, 'universal-multiplayer.js'));
});

// Game rooms storage
const gameRooms = {};

// Active players across all games
const activePlayers = {};

// Server statistics
const serverStats = {
  startTime: Date.now(),
  connections: 0,
  messagesSent: 0,
  messagesReceived: 0,
  peakConcurrentPlayers: 0
};

// Generate a random room ID
function generateRoomId() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Utility: Log with timestamp
function log(message, data = {}) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
  if (Object.keys(data).length > 0) {
    console.log(JSON.stringify(data, null, 2));
  }
}

// Socket connection handling
io.on('connection', (socket) => {
  serverStats.connections++;
  serverStats.messagesReceived++;
  
  const currentPlayerCount = Object.keys(activePlayers).length + 1;
  if (currentPlayerCount > serverStats.peakConcurrentPlayers) {
    serverStats.peakConcurrentPlayers = currentPlayerCount;
  }
  
  log(`Player connected: ${socket.id}`);
  
  // Store player connection
  activePlayers[socket.id] = {
    id: socket.id,
    roomId: null,
    gameId: null,
    joinedAt: Date.now(),
    lastActivity: Date.now()
  };
  
  // Handle player joining a game
  socket.on('joinGame', (data) => {
    serverStats.messagesReceived++;
    
    const { gameId, roomId, playerData } = data;
    
    log(`Player ${socket.id} joining game`, {
      gameId: gameId,
      roomId: roomId || 'new room',
      playerData: playerData
    });
    
    let targetRoomId = roomId;
    
    // Create a room ID if not provided
    if (!targetRoomId) {
      targetRoomId = generateRoomId();
      log(`Generated new room ID: ${targetRoomId}`);
    }
    
    // Create game category if it doesn't exist
    if (!gameRooms[gameId]) {
      gameRooms[gameId] = {};
      log(`Created new game category: ${gameId}`);
    }
    
    // Create room if it doesn't exist
    if (!gameRooms[gameId][targetRoomId]) {
      gameRooms[gameId][targetRoomId] = {
        roomId: targetRoomId,
        gameId: gameId,
        players: {},
        createdAt: Date.now(),
        lastActivity: Date.now()
      };
      log(`Created new room: ${targetRoomId} for game: ${gameId}`);
    }
    
    // Add player to room
    gameRooms[gameId][targetRoomId].players[socket.id] = {
      id: socket.id,
      joinedAt: Date.now(),
      lastActivity: Date.now(),
      ...playerData
    };
    
    // Update player record
    activePlayers[socket.id].roomId = targetRoomId;
    activePlayers[socket.id].gameId = gameId;
    
    // Join the socket room
    socket.join(targetRoomId);
    
    // Notify player they've joined
    serverStats.messagesSent++;
    socket.emit('roomJoined', {
      roomId: targetRoomId,
      gameId: gameId,
      playerId: socket.id,
      playerCount: Object.keys(gameRooms[gameId][targetRoomId].players).length
    });
    
    // Notify other players in the room
    serverStats.messagesSent++;
    socket.to(targetRoomId).emit('playerJoined', {
      id: socket.id,
      playerData: playerData
    });
    
    // Send existing players to new player
    Object.entries(gameRooms[gameId][targetRoomId].players).forEach(([id, player]) => {
      if (id !== socket.id) {
        serverStats.messagesSent++;
        socket.emit('playerJoined', {
          id: id,
          playerData: player
        });
      }
    });
    
    log(`Player ${socket.id} joined game ${gameId} in room ${targetRoomId}`);
  });
  
  // Handle state updates
  socket.on('stateUpdate', (data) => {
    serverStats.messagesReceived++;
    
    const { roomId, state } = data;
    const player = activePlayers[socket.id];
    
    if (!player || !player.roomId) return;
    
    // Update timestamp
    activePlayers[socket.id].lastActivity = Date.now();
    
    if (gameRooms[player.gameId] && gameRooms[player.gameId][roomId]) {
      gameRooms[player.gameId][roomId].lastActivity = Date.now();
      
      // Update player state in room
      if (gameRooms[player.gameId][roomId].players[socket.id]) {
        gameRooms[player.gameId][roomId].players[socket.id] = {
          ...gameRooms[player.gameId][roomId].players[socket.id],
          ...state,
          lastActivity: Date.now()
        };
      }
    }
    
    // Broadcast state to other players in the room
    serverStats.messagesSent++;
    socket.to(roomId).emit('stateUpdate', {
      id: socket.id,
      state: state,
      timestamp: Date.now()
    });
  });
  
  // Handle game events
  socket.on('gameEvent', (data) => {
    serverStats.messagesReceived++;
    
    const { roomId, eventType, eventData } = data;
    const player = activePlayers[socket.id];
    
    if (!player || !player.roomId) return;
    
    // Update timestamp
    activePlayers[socket.id].lastActivity = Date.now();
    
    log(`Game event from player ${socket.id}`, {
      roomId: roomId,
      eventType: eventType,
      eventData: eventData
    });
    
    // Broadcast event to all players (including sender for confirmation)
    serverStats.messagesSent++;
    io.to(roomId).emit('gameEvent', {
      id: socket.id,
      eventType: eventType,
      eventData: eventData,
      timestamp: Date.now()
    });
  });
  
  // Handle disconnection
  socket.on('disconnect', () => {
    serverStats.messagesReceived++;
    
    const player = activePlayers[socket.id];
    
    log(`Player disconnected: ${socket.id}`);
    
    if (player && player.roomId && player.gameId) {
      const { roomId, gameId } = player;
      
      // Check if the room exists
      if (gameRooms[gameId] && gameRooms[gameId][roomId]) {
        // Remove player from room
        delete gameRooms[gameId][roomId].players[socket.id];
        
        // Notify other players
        serverStats.messagesSent++;
        socket.to(roomId).emit('playerLeft', {
          id: socket.id,
          timestamp: Date.now()
        });
        
        // Clean up empty rooms
        if (Object.keys(gameRooms[gameId][roomId].players).length === 0) {
          delete gameRooms[gameId][roomId];
          log(`Room ${roomId} in game ${gameId} removed (empty)`);
          
          // Clean up empty game categories
          if (Object.keys(gameRooms[gameId]).length === 0) {
            delete gameRooms[gameId];
            log(`Game ${gameId} removed (no rooms)`);
          }
        }
      }
    }
    
    // Remove player from active players
    delete activePlayers[socket.id];
  });
});

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Server status endpoint
app.get('/status', (req, res) => {
  const uptime = Math.floor((Date.now() - serverStats.startTime) / 1000);
  
  res.json({
    status: 'online',
    uptime: uptime,
    players: {
      active: Object.keys(activePlayers).length,
      total: serverStats.connections,
      peak: serverStats.peakConcurrentPlayers
    },
    games: Object.keys(gameRooms).length,
    rooms: Object.keys(gameRooms).reduce((count, gameId) => {
      return count + Object.keys(gameRooms[gameId]).length;
    }, 0),
    messages: {
      sent: serverStats.messagesSent,
      received: serverStats.messagesReceived
    }
  });
});

// Clean up inactive players and rooms periodically
const CLEANUP_INTERVAL = 15 * 60 * 1000; // 15 minutes
const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes

setInterval(() => {
  const now = Date.now();
  
  log('Running cleanup for inactive players and rooms');
  
  // Clean up inactive players
  Object.keys(activePlayers).forEach(id => {
    if (now - activePlayers[id].lastActivity > INACTIVITY_TIMEOUT) {
      log(`Removing inactive player: ${id}`);
      
      // Force disconnect
      const socket = io.sockets.sockets.get(id);
      if (socket) {
        socket.disconnect(true);
      } else {
        delete activePlayers[id];
      }
    }
  });
  
  // Clean up inactive rooms
  Object.keys(gameRooms).forEach(gameId => {
    Object.keys(gameRooms[gameId]).forEach(roomId => {
      if (now - gameRooms[gameId][roomId].lastActivity > INACTIVITY_TIMEOUT) {
        log(`Closing inactive room: ${roomId} in game: ${gameId}`);
        
        // Notify any remaining players
        serverStats.messagesSent++;
        io.to(roomId).emit('roomClosed', {
          reason: 'inactivity',
          roomId: roomId
        });
        
        // Force room closure
        delete gameRooms[gameId][roomId];
      }
    });
    
    // Clean up empty game categories
    if (Object.keys(gameRooms[gameId]).length === 0) {
      delete gameRooms[gameId];
      log(`Removed empty game category: ${gameId}`);
    }
  });
}, CLEANUP_INTERVAL);

// Start server
const PORT = process.env.PORT || 8989;
server.listen(PORT, '0.0.0.0', () => {
  log(`Universal multiplayer game server running on port ${PORT}`);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  log('Server shutting down...');
  
  // Notify all connected clients
  Object.keys(io.sockets.sockets).forEach(id => {
    const socket = io.sockets.sockets.get(id);
    if (socket) {
      socket.emit('serverShutdown', { message: 'Server is shutting down' });
      socket.disconnect(true);
    }
  });
  
  // Force shutdown after 3 seconds if server doesn't close gracefully
  const forceShutdownTimeout = setTimeout(() => {
    log('Forcing server shutdown after timeout');
    process.exit(1);
  }, 3000);
  
  // Close server
  server.close(() => {
    clearTimeout(forceShutdownTimeout);
    log('Server stopped gracefully');
    process.exit(0);
  });
}); 