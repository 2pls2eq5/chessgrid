# ChessGrid Live

Live server and browser interface for the ChessGrid electronic chessboard.

ChessGrid Live provides the communication layer between ChessGrid ESP32 boards and connected browser clients. The server maintains an individual chess game state and validates moves using `chess.js`, while the browser uses `chessboard.js` to display the live chess position.

## Status

**Current version: `v0.1.0-alpha`**

ChessGrid Live is currently in the alpha / proof-of-concept stage.

The core communication between the physical board, server, and live browser is functional, but the system is still under active development.

## Architecture

```text
ChessGrid Board
     (ESP32)
        │
        │ WebSocket
        ▼
  ChessGrid Live
     (Node.js)
        │
        ├── chess.js
        │     └── Chess logic & game state
        │
        │ WebSocket
        ▼
   Live Browser
        │
        └── chessboard.js
              └── Visual board
```

## Features

* WebSocket communication with ChessGrid ESP32 boards
* ESP32 device identification and authorization
* Admin approval for board connections
* Individual chess game state per device
* Chess move validation using `chess.js`
* UCI move handling
* FEN synchronization
* Live browser board synchronization using `chessboard.js`
* Move notifications
* Board reset synchronization
* Nginx WebSocket reverse-proxy support

## Browser

The live chessboard interface uses:

* **chessboard.js** — renders and manages the visual chessboard
* **chess.js** — maintains and validates the chess game state on the server

The browser receives updates from ChessGrid Live through WebSocket messages and updates the visual board accordingly.

## Communication Protocol

The current protocol uses simple text-based WebSocket messages.

### ESP32 → Server

```text
HELLO <device_id>
<uci_move>
RESET
```

Example:

```text
HELLO CG-1
e2e4
RESET
```

### Server → ESP32

```text
PENDING
ACCEPTED
REJECTED
ERROR <message>
```

### Server → Browser

```text
FEN <fen>
MOVE <uci_move>
RESET
ERROR <message>
```

## Requirements

* Node.js
* `ws`
* `chess.js`
* `chessboard.js`
* Nginx (for production reverse proxy)

## Running

Install dependencies:

```bash
npm install
```

Start the server:

```bash
node server.js
```

The HTTP server runs on port `8000`.

The WebSocket server runs on port `8765`.

When deployed behind Nginx, WebSocket clients connect through the `/ws` endpoint.

## Repository Structure

```text
chessgrid-live/
├── server.js
├── index.html
├── admin.html
├── package.json
└── README.md
```

## Versioning

ChessGrid Live follows semantic versioning.

Current release:

```text
v0.1.0-alpha
```

Alpha releases may introduce changes to the architecture and communication protocol.

## Related Project

The ESP32 firmware is maintained separately:

**ChessGrid Board**

`chessgrid-board`

## License

To be defined.
