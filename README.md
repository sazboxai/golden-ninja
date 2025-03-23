# Universal Multiplayer Framework for HTML Games

This framework allows you to easily add multiplayer functionality to any HTML game with minimal changes to your code. The server handles connections, rooms, and message passing, while the client library provides a straightforward API for sharing game state between players.

## Features

- **Drop-in multiplayer** for any HTML game
- **Room-based** game sessions
- **Automatic state synchronization** between players
- **Event-based communication**
- **Customizable state adapters** to control what gets synchronized
- **Easy integration** with just a few lines of code
- **Works with any HTML/JavaScript game**

## Quick Start

### Server Setup

1. Install dependencies:
```bash
npm install
```

2. Start the server:
```bash
npm start
```

The server runs on port 8989 by default.

### Client Integration

Add these scripts to your HTML game:

```html
<script src="/socket.io/socket.io.js"></script>
<script src="/universal-multiplayer.js"></script>
```

Initialize the multiplayer system:

```javascript
// Create a multiplayer instance
const multiplayer = new UniversalMultiplayer({
  gameId: 'your-game-name',
  
  // Convert your game state to network format
  stateAdapter: function() {
    return {
      x: player.x,
      y: player.y,
      // Add any other properties you want to sync
    };
  },
  
  // Handle received state from other players
  renderAdapter: function(playerId, state) {
    // Update the remote player's representation in your game
    if (!remotePlayers[playerId]) {
      createRemotePlayer(playerId);
    }
    
    // Apply the received state
    remotePlayers[playerId].x = state.x;
    remotePlayers[playerId].y = state.y;
    // Apply any other properties from state
  }
});

// Connect with player data
multiplayer.connect({
  name: playerName,
  // Any other initial player data
});
```

## API Reference

### UniversalMultiplayer

#### Constructor Options

| Option | Type | Description |
|--------|------|-------------|
| `gameId` | String | Unique identifier for your game |
| `roomId` | String | (Optional) Room ID to join, generates a new room if not provided |
| `serverUrl` | String | (Optional) URL of the multiplayer server |
| `updateRate` | Number | (Optional) Rate of state updates in milliseconds (default: 100) |
| `stateAdapter` | Function | Function that returns the local player state to share |
| `renderAdapter` | Function | Function that applies received state to remote players |

#### Methods

| Method | Description |
|--------|-------------|
| `connect(playerData)` | Connect to the server with initial player data |
| `disconnect()` | Disconnect from the server |
| `sendGameEvent(eventType, eventData)` | Send a custom game event to all players in the room |
| `getShareableUrl()` | Get a shareable URL for the current room |
| `getRoomInfo()` | Get information about the current room |
| `on(eventName, callback)` | Register an event listener |

#### Events

| Event | Description |
|-------|-------------|
| `connected` | Connected to the server |
| `disconnected` | Disconnected from the server |
| `roomJoined` | Joined a room |
| `playerJoined` | A new player joined the room |
| `playerLeft` | A player left the room |
| `stateUpdate` | Received a state update from another player |
| `gameEvent` | Received a custom game event |
| `error` | Connection or other error occurred |

## Integration Steps

1. **Include the Scripts**: Add Socket.IO and the universal-multiplayer.js to your HTML.

2. **Initialize the Framework**: Set up the UniversalMultiplayer instance with appropriate adapters.

3. **Connect to Server**: Call `connect()` with player information.

4. **Handle Events**: Set up event listeners for player joining/leaving.

5. **Render Remote Players**: Use the state updates to render other players.

6. **Custom Game Events**: Use `sendGameEvent()` for game-specific actions like attacks or item pickups.

## Example Game

See the included `index.html` for a complete demo game using the universal multiplayer framework. The demo shows basic movement synchronization and chat functionality.

## Making Your Game Multiplayer-Ready

1. **State Management**: Decide what game state needs to be synchronized.

2. **Remote Players**: Create representations of other players in your game.

3. **Event Design**: Plan what custom events you need for game-specific actions.

4. **UI Enhancements**: Add UI elements for room codes, player lists, etc.

5. **Testing**: Test with multiple browsers or devices to ensure proper synchronization.

## Advanced Usage

### Custom Game Events

For game-specific actions like attacking or using an item:

```javascript
// Send an attack event
multiplayer.sendGameEvent('playerAttacked', {
  weapon: 'sword',
  damage: 10,
  position: { x: player.x, y: player.y }
});

// Listen for attack events from other players
multiplayer.on('playerAttacked', (data) => {
  // Show attack animation from the remote player
  showAttackAnimation(data.id, data.eventData.weapon);
});
```

### Room Management

Creating or joining specific rooms:

```javascript
// Create a new room (automatically happens when roomId is null)
const multiplayerNewRoom = new UniversalMultiplayer({
  gameId: 'your-game',
  roomId: null
});

// Join an existing room
const multiplayerJoinRoom = new UniversalMultiplayer({
  gameId: 'your-game',
  roomId: 'ABC123'
});
```

### Dynamic Game Properties

For games with changing properties (character selection, weapons, etc.):

```javascript
// In your state adapter
stateAdapter: function() {
  return {
    x: player.x,
    y: player.y,
    character: player.selectedCharacter,
    weapon: player.currentWeapon,
    animation: player.currentAnimation
  };
}
```

## Step-by-Step Guide: Converting Any HTML Game to Multiplayer

This guide will walk you through the process of transforming any single-player HTML game into a multiplayer experience using the Universal Multiplayer framework. The instructions are designed for junior developers and assume you're starting with a standard HTML5 game that uses Canvas for rendering.

### Prerequisites

Before starting, make sure you have:
- A working single-player HTML game
- Node.js and npm installed
- Basic understanding of JavaScript and HTML

### Step 1: Set Up the Server

1. **Ensure server files are available**
   - Make sure `universal-server.js` and `universal-multiplayer.js` are in your project directory
   - These files handle all the networking and connection management

### Step 2: Add Required Scripts to Your Game

1. **Include Socket.io and the multiplayer library**
   ```html
   <head>
     <!-- Your existing head content -->
     <script src="/socket.io/socket.io.js"></script>
     <script src="/universal-multiplayer.js"></script>
   </head>
   ```
   - These scripts must be included before your game code

### Step 3: Create the UI for Room Management

1. **Add UI elements to the game's start screen**
   ```html
   <div id="startScreen">
     <h1>Your Game Title</h1>
     
     <div style="margin-top: 20px;">
       <div style="margin-bottom: 10px;">
         <input type="text" id="playerNameInput" placeholder="Your Name" 
           style="padding: 8px; border-radius: 3px; border: none; outline: none; width: 200px;">
       </div>
       <div style="margin-bottom: 15px;">
         <input type="text" id="roomCodeInput" placeholder="Room Code (optional)" 
           style="padding: 8px; border-radius: 3px; border: none; outline: none; width: 200px; text-transform: uppercase;">
       </div>
       <div style="display: flex; justify-content: center; gap: 10px;">
         <button id="createRoomBtn">CREATE ROOM</button>
         <button id="joinRoomBtn">JOIN ROOM</button>
       </div>
     </div>
   </div>
   ```

2. **Add an information display for the current room**
   ```html
   <div id="mpInfo" style="position: absolute; top: 10px; right: 10px; background-color: rgba(0,0,0,0.7); padding: 10px; border-radius: 5px; color: #fff; display: none;"></div>
   ```

### Step 4: Set Up Event Handlers for Buttons

1. **Add button handlers as early as possible**
   ```html
   <script>
     window.addEventListener('DOMContentLoaded', function() {
       if (document.getElementById('createRoomBtn')) {
         document.getElementById('createRoomBtn').onclick = function() {
           const playerName = document.getElementById('playerNameInput').value || "Player" + Math.floor(Math.random() * 1000);
           window.startRoom(null, playerName);
         };
       }
       
       if (document.getElementById('joinRoomBtn')) {
         document.getElementById('joinRoomBtn').onclick = function() {
           const playerName = document.getElementById('playerNameInput').value || "Player" + Math.floor(Math.random() * 1000);
           const roomCode = document.getElementById('roomCodeInput').value.trim().toUpperCase();
           if (roomCode) {
             window.startRoom(roomCode, playerName);
           } else {
             alert('Please enter a room code to join');
           }
         };
       }
     });
   </script>
   ```

### Step 5: Implement Core Multiplayer Variables and Functions

1. **Add variables to track multiplayer state**
   ```javascript
   // Multiplayer variables
   let remotePlayers = {};
   let playerName = "Player" + Math.floor(Math.random() * 1000);
   let multiplayer;
   let shareableUrl = "";
   let roomIdFromUrl = new URLSearchParams(window.location.search).get('room');
   ```

2. **Create the startRoom function**
   ```javascript
   window.startRoom = function(roomCode, name) {
     console.log("Starting room with code:", roomCode, "and player name:", name);
     
     // Update the player name
     playerName = name;
     
     // Set the room ID
     roomIdFromUrl = roomCode;
     
     // Initialize the multiplayer
     initializeMultiplayer();
     
     // Start the game after a short delay if connection takes too long
     setTimeout(() => {
       if (document.getElementById('startScreen').style.display !== 'none') {
         console.log("Room join timed out, starting game anyway");
         document.getElementById('startScreen').style.display = 'none';
         startGame(); // Replace with your game's start function
       }
     }, 3000);
   };
   ```

3. **Create the multiplayer info UI updater**
   ```javascript
   function updateMultiplayerInfo() {
     if (!multiplayer || !document.getElementById('mpInfo')) return;
     
     const roomInfo = multiplayer.getRoomInfo();
     const playerCount = roomInfo.playerCount;
     const roomId = roomInfo.roomId || "Unknown";
     
     // Show the info panel
     document.getElementById('mpInfo').style.display = 'block';
     
     // Update the multiplayer info panel
     document.getElementById('mpInfo').innerHTML = `
       <div style="margin-bottom: 5px;">ROOM CODE: <span style="font-weight: bold;">${roomId}</span></div>
       <div>PLAYERS: ${playerCount}</div>
       <div style="font-size: 10px; margin-top: 8px;">
         <span style="cursor: pointer; text-decoration: underline;" 
               onclick="navigator.clipboard.writeText('${roomId}').then(() => { alert('Room code copied!'); })">
           Copy room code
         </span>
       </div>
     `;
   }
   ```

### Step 6: Initialize the Multiplayer System

1. **Create the initialization function**
   ```javascript
   function initializeMultiplayer() {
     console.log("Initializing multiplayer with roomId:", roomIdFromUrl);
     
     try {
       // Setup multiplayer with game-specific adapter functions
       multiplayer = new UniversalMultiplayer({
         gameId: 'your-game-id', // Change to your game's unique identifier
         roomId: roomIdFromUrl,
         serverUrl: window.location.origin,
         updateRate: 50, // Update 20 times per second
         
         // Convert local player state to network format
         stateAdapter: function() {
           // Return your player's current state
           return {
             x: player.x,
             y: player.y,
             // Include any other properties needed to render the player
             name: playerName,
             // Add any game-specific state here
           };
         },
         
         // Handle received state from other players
         renderAdapter: function(playerId, state) {
           // Create a new remote player if needed
           if (!remotePlayers[playerId]) {
             remotePlayers[playerId] = {
               id: playerId,
               // Set default properties
               x: state.x || 0,
               y: state.y || 0,
               name: state.name || "Player",
               // Add any other needed properties
             };
           }
           
           // Update remote player with received state
           Object.assign(remotePlayers[playerId], state);
         }
       });

       // Connect to server
       multiplayer.connect({
         name: playerName,
         // Include any other initial player data
       });
       
       // Set up event handlers
       setupMultiplayerEvents();
       
     } catch (error) {
       console.error("Error initializing multiplayer:", error);
     }
   }
   ```

2. **Set up event handlers**
   ```javascript
   function setupMultiplayerEvents() {
     // Handle connection events
     multiplayer.on('connected', () => {
       console.log('Connected to multiplayer server');
     });
     
     multiplayer.on('roomJoined', (data) => {
       console.log('Joined room:', data.roomId);
       // Save the shareable URL
       shareableUrl = multiplayer.getShareableUrl();
       updateMultiplayerInfo();
       
       // Start the game now that we've joined a room
       document.getElementById('startScreen').style.display = 'none';
       startGame(); // Replace with your game's start function
     });
     
     multiplayer.on('playerJoined', (data) => {
       console.log('Player joined:', data.id);
       updateMultiplayerInfo();
     });
     
     multiplayer.on('playerLeft', (data) => {
       console.log('Player left:', data.id);
       delete remotePlayers[data.id];
       updateMultiplayerInfo();
     });
     
     // Optional: Listen for custom game events
     multiplayer.on('gameEvent', (data) => {
       console.log('Game event:', data.eventType, data.eventData);
       // Handle custom game events
     });
   }
   ```

### Step 7: Modify Your Game's Render Loop

1. **Update your game's render function to draw remote players**
   ```javascript
   // In your existing draw/render function
   function draw() {
     // Your existing drawing code
     
     // Draw remote players
     for (const id in remotePlayers) {
       const remotePlayer = remotePlayers[id];
       drawRemotePlayer(remotePlayer);
     }
   }
   
   // Create a function to draw remote players
   function drawRemotePlayer(remotePlayer) {
     // Draw the remote player using your game's rendering methods
     // Example for a simple rectangular player:
     context.fillStyle = remotePlayer.color || '#ff0000';
     context.fillRect(remotePlayer.x, remotePlayer.y, playerWidth, playerHeight);
     
     // Draw player name
     context.fillStyle = '#ffffff';
     context.font = '12px Arial';
     context.textAlign = 'center';
     context.fillText(remotePlayer.name || 'Player', remotePlayer.x + playerWidth/2, remotePlayer.y - 10);
   }
   ```

2. **Ensure state updates are sent regularly**
   ```javascript
   // In your game update loop
   function update() {
     // Your existing update code
     
     // Send multiplayer updates if connected
     if (multiplayer && multiplayer.connected) {
       multiplayer.sendUpdate();
     }
   }
   ```

### Step 8: Add Custom Game Events (Optional)

1. **For game-specific actions like shooting, special moves, etc.**
   ```javascript
   function playerShoots() {
     // Local shooting logic
     
     // Notify other players
     if (multiplayer && multiplayer.connected) {
       multiplayer.sendGameEvent('playerShot', {
         direction: player.facingDirection,
         position: { x: player.x, y: player.y }
       });
     }
   }
   
   // And handle incoming shoot events
   multiplayer.on('playerShot', (data) => {
     // Show shooting animation from the remote player
     createShootingEffect(data.id, data.eventData.position, data.eventData.direction);
   });
   ```

### Step 9: Testing Your Multiplayer Implementation

1. **Testing locally with multiple browsers**
   - Open your game in one browser window
   - Start a new room by clicking "CREATE ROOM"
   - Note the room code displayed at the top right
   - Open another browser window (or use incognito mode)
   - Join the same room by entering the room code and clicking "JOIN ROOM"
   - Verify that both players can see each other

2. **Common issues to check:**
   - Players can connect but don't see each other: Check your `drawRemotePlayer` function
   - Game freezes when a second player joins: Look for errors in the console
   - Players see each other but positions aren't updated: Check your `stateAdapter` function

### Step 10: Debugging Tools

1. **Add debug logging to help diagnose issues**
   ```javascript
   function debugMultiplayer() {
     console.log("===== MULTIPLAYER DEBUG =====");
     console.log("Connected:", multiplayer ? multiplayer.connected : false);
     console.log("Player ID:", multiplayer ? multiplayer.playerId : "unknown");
     console.log("Room ID:", multiplayer ? multiplayer.roomId : "unknown");
     console.log("Remote Players:", remotePlayers);
   }
   
   // You can call this manually or add a debug key
   document.addEventListener('keydown', (e) => {
     if (e.key === 'd') {
       debugMultiplayer();
     }
   });
   ```

### Final Notes

1. **Adjust for your specific game**
   - The player representation will depend on your game's rendering system
   - The state data you need to share will depend on your game's mechanics
   - You may need to synchronize additional game elements beyond player positions

2. **Performance considerations**
   - Only sync essential data to reduce network traffic
   - Consider interpolation for smoother movement
   - Use custom events sparingly for important actions only

By following these steps, you should be able to transform any single-player HTML5 game into a multiplayer experience. The Universal Multiplayer framework handles all the complex networking parts, allowing you to focus on integrating multiplayer features into your game's existing code.

