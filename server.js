const http = require("http");
const fs = require("fs");
const path = require("path");
const WebSocket = require("ws");
const { Chess } = require("chess.js");


// ============================================================
// CONNECTION REQUESTS
// ============================================================

const pendingConnections = new Map();

const approvedConnections = new Map();


// ============================================================
// HTTP SERVER
// ============================================================

const httpServer = http.createServer((req, res) => {

    let filePath;

    if (req.url === "/") {

        filePath = path.join(
            __dirname,
            "index.html"
        );

    } else if (req.url === "/admin") {

        filePath = path.join(
            __dirname,
            "admin.html"
        );

    } else {

        filePath = path.join(
            __dirname,
            req.url
        );
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


httpServer.listen(
    8000,
    "0.0.0.0",
    () => {

        console.log(
            "HTTP server running on port 8000"
        );

    }
);


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


    ws.deviceId = null;

    ws.authorized = false;

    ws.isAdmin = false;

    ws.game = null;


    // ========================================================
    // MESSAGE
    // ========================================================

    ws.on("message", (data) => {

        const message =
            data.toString().trim();


        console.log(
            "Received:",
            message
        );


        // ====================================================
        // ADMIN
        // ====================================================

        if (message === "ADMIN") {

            ws.isAdmin = true;

            ws.send(
                "ADMIN_CONNECTED"
            );

            sendPendingList(ws);

            return;
        }


        // ====================================================
        // ESP32 HELLO
        // ====================================================

        if (
            message.startsWith("HELLO ")
        ) {

            const deviceId =
                message.substring(6).trim();


            if (
                deviceId.length === 0
            ) {

                ws.send(
                    "ERROR INVALID_ID"
                );

                return;
            }


            ws.deviceId =
                deviceId;


            ws.authorized =
                false;


            pendingConnections.set(
                deviceId,
                ws
            );


            console.log();

            console.log(
                "================================"
            );

            console.log(
                "CONNECTION REQUEST"
            );

            console.log(
                "Device:",
                deviceId
            );

            console.log(
                "================================"
            );


            ws.send(
                "PENDING"
            );


            notifyAdmins(
                "REQUEST " + deviceId
            );


            return;
        }


        // ====================================================
        // ADMIN ACCEPT
        // ====================================================

        if (
            message.startsWith("ACCEPT ")
        ) {

            if (!ws.isAdmin) {

                ws.send(
                    "ERROR NOT_ADMIN"
                );

                return;
            }


            const deviceId =
                message.substring(7).trim();


            const device =
                pendingConnections.get(
                    deviceId
                );


            if (!device) {

                ws.send(
                    "ERROR DEVICE_NOT_FOUND " +
                    deviceId
                );

                return;
            }


            pendingConnections.delete(
                deviceId
            );


            // =================================================
            // CREATE INDIVIDUAL CHESS GAME
            // =================================================

            device.authorized =
                true;


            device.game =
                new Chess();


            approvedConnections.set(
                deviceId,
                device
            );


            // =================================================
            // TELL ESP32
            // =================================================

            device.send(
                "ACCEPTED"
            );

            // =================================================
            // TELL ADMIN
            // =================================================

            ws.send(
                "ACCEPTED " +
                deviceId
            );


            console.log(
                "Device accepted:",
                deviceId
            );


            return;
        }


        // ====================================================
        // ADMIN REJECT
        // ====================================================

        if (
            message.startsWith("REJECT ")
        ) {

            if (!ws.isAdmin) {

                ws.send(
                    "ERROR NOT_ADMIN"
                );

                return;
            }


            const deviceId =
                message.substring(7).trim();


            const device =
                pendingConnections.get(
                    deviceId
                );


            if (!device) {

                ws.send(
                    "ERROR DEVICE_NOT_FOUND " +
                    deviceId
                );

                return;
            }


            pendingConnections.delete(
                deviceId
            );


            device.send(
                "REJECTED"
            );


            device.close();


            ws.send(
                "REJECTED " +
                deviceId
            );


            console.log(
                "Device rejected:",
                deviceId
            );


            return;
        }


        // ====================================================
        // EVERYTHING BELOW REQUIRES AUTHORIZATION
        // ====================================================

        if (
            !ws.authorized
        ) {

            console.log(
                "Ignoring unauthorized message:",
                message
            );

            return;
        }


        // ====================================================
        // SAFETY
        // ====================================================

        if (
            !ws.game
        ) {

            console.log(
                "Authorized device has no game:",
                ws.deviceId
            );

            return;
        }


        // ====================================================
        // RESET
        // ====================================================

        if (
            message === "RESET"
        ) {

            ws.game.reset();

            console.log(
                "Game reset:",
                ws.deviceId
            );


            return;
        }


        // ====================================================
        // UCI MOVE
        // ====================================================

        if (
            /^[a-h][1-8][a-h][1-8][qrbn]?$/.test(
                message
            )
        ) {

            try {

                const from =
                    message.substring(
                        0,
                        2
                    );


                const to =
                    message.substring(
                        2,
                        4
                    );


                const promotion =
                    message.length === 5
                        ? message.substring(4)
                        : undefined;


                // =================================================
                // MAKE MOVE ON THIS DEVICE'S GAME
                // =================================================

                ws.game.move({

                    from: from,

                    to: to,

                    ...(promotion
                        ? {
                            promotion
                        }
                        : {})

                });


                console.log(
                    "LEGAL:",
                    message,
                    "| Device:",
                    ws.deviceId
                );

            } catch (error) {

                console.log(
                    "ILLEGAL:",
                    message,
                    "| Device:",
                    ws.deviceId
                );

            }


            return;
        }


        // ====================================================
        // UNKNOWN MESSAGE
        // ====================================================

        console.log(
            "Unknown message:",
            message
        );

    });


    // ========================================================
    // CLOSE
    // ========================================================

    ws.on("close", () => {

        console.log(
            "WebSocket client disconnected"
        );


        if (ws.deviceId) {

            pendingConnections.delete(
                ws.deviceId
            );


            approvedConnections.delete(
                ws.deviceId
            );


            notifyAdmins(
                "DISCONNECTED " +
                ws.deviceId
            );

        }

    });

});


// ============================================================
// SEND PENDING LIST
// ============================================================

function sendPendingList(ws) {

    pendingConnections.forEach(
        (device, deviceId) => {

            ws.send(
                "REQUEST " +
                deviceId
            );

        }
    );

}


// ============================================================
// NOTIFY ADMINS
// ============================================================

function notifyAdmins(message) {

    wss.clients.forEach(
        (client) => {

            if (
                client.isAdmin &&
                client.readyState ===
                    WebSocket.OPEN
            ) {

                client.send(
                    message
                );

            }

        }
    );

}
