const http = require("http");
const fs = require("fs");
const path = require("path");
const WebSocket = require("ws");
const { Chess } = require("chess.js");


// ============================================================
// CHESS STATE
// ============================================================

const chess = new Chess();


// ============================================================
// HTTP SERVER
// ============================================================

const httpServer = http.createServer((req, res) => {

    let filePath;

    if (req.url === "/") {
        filePath = path.join(__dirname, "index.html");
    } else {
        filePath = path.join(__dirname, req.url);
    }

    fs.readFile(filePath, (err, data) => {

        if (err) {
            res.writeHead(404);
            res.end("Not found");
            return;
        }

        res.writeHead(200);
        res.end(data);
    });
});


httpServer.listen(8000, "0.0.0.0", () => {

    console.log(
        "HTTP server: http://localhost:8000"
    );

});


// ============================================================
// WEBSOCKET SERVER
// ============================================================

const wss = new WebSocket.Server({
    port: 8765
});


wss.on("connection", (ws) => {

    console.log(
        "WebSocket client connected"
    );


    // Send current position immediately

    ws.send(
        "FEN " + chess.fen()
    );


    ws.on("message", (data) => {

        const message =
            data.toString().trim();


        console.log(
            "Received:",
            message
        );


        // ====================================================
        // RESET
        // ====================================================

        if (message === "RESET") {

            chess.reset();

            broadcast(
                "RESET"
            );

            broadcast(
                "FEN " + chess.fen()
            );

            return;
        }


        // ====================================================
        // UCI
        // ====================================================

        if (
            /^[a-h][1-8][a-h][1-8][qrbn]?$/.test(message)
        ) {

            try {

                // Convert UCI to chess.js move

                const from =
                    message.substring(0, 2);

                const to =
                    message.substring(2, 4);

                const promotion =
                    message.length === 5
                        ? message.substring(4)
                        : undefined;


                const move = chess.move({

                    from: from,

                    to: to,

                    ...(promotion
                        ? { promotion }
                        : {})

                });


                console.log(
                    "LEGAL:",
                    message
                );


                // Send the resulting FEN

                broadcast(
                    "FEN " + chess.fen()
                );


                // Also send UCI for display

                broadcast(
                    "MOVE " + message
                );


            } catch (error) {

                console.log(
                    "ILLEGAL:",
                    message
                );


                broadcast(
                    "ERROR ILLEGAL " + message
                );
            }


            return;
        }


        console.log(
            "Unknown message:",
            message
        );

    });


    ws.on("close", () => {

        console.log(
            "WebSocket client disconnected"
        );

    });

});


// ============================================================
// BROADCAST
// ============================================================

function broadcast(message) {

    wss.clients.forEach((client) => {

        if (
            client.readyState === WebSocket.OPEN
        ) {

            client.send(message);

        }

    });

}
