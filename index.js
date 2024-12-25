const http = require("http");
const app = require("express")();
app.get("/", (req, res) => res.sendFile(__dirname + "/index.html"));

app.listen(9091, () => console.log("Listening on http port 9091"));
const websocketServer = require("websocket").server;
const httpServer = http.createServer();
httpServer.listen(9090, () => console.log("Listening.. on 9090"));

// Hashmap clients
const clients = {};
const games = {};
let hitter= null;
const wsServer = new websocketServer({
    "httpServer": httpServer
});

wsServer.on("request", request => {
    // Connect
    const connection = request.accept(null, request.origin);
    connection.on("open", () => console.log("opened!"));
    connection.on("close", () => console.log("closed!"));
    connection.on("message", message => {
        const result = JSON.parse(message.utf8Data);

        // Client creates a new game
        if (result.method === "create") {
            const clientId = result.clientId;
            const gameId = guid();
            games[gameId] = {
                "id": gameId,
                "clients": [],
                "turn": 0,  // Player 1 starts
                "balls": [
                    
                ]
            };

            const payLoad = {
                "method": "create",
                "game": games[gameId]
            };

            const con = clients[clientId].connection;
            con.send(JSON.stringify(payLoad));
        }

        // Client wants to join a game
        if (result.method === "join") {
            const clientId = result.clientId;
            const gameId = result.gameId;
            const game = games[gameId];

            if (game.clients.length >= 3) {
                // Max players reached
                return;
            }

            const color = { "0": "Red", "1": "Yellow", "2": "White" }[game.clients.length];

            game.clients.push({
                "clientId": clientId,
                "color": color,
                "balls": (() => {
                    const balls = {};
                    for (let i = 1; i <= 3; i++) {
                        balls[i] = { counter: 0, hit: 0 };
                    }
                    return balls;
                })()
            });
            
            console.log(game.balls.length);

            // Generate correct number of balls for the game
            game.balls = [];
            for (let i = 0; i < game.clients.length * 3; i++) {
                game.balls.push({ counter: 0, hit: 0 });
            }
            console.log(game.balls.length);

            // Start the game if there are 3 players
            if (game.clients.length === 3) updateGameState();

            // Notify all clients about the new game state
            game.clients.forEach(c => {
                const payLoad = {
                    "method": "join",
                    "game": game
                };
                clients[c.clientId].connection.send(JSON.stringify(payLoad));

                
                
            });
        }

        // Handle rolling the dice
        if (result.method === "rollDice") {
            const gameId = result.gameId;
            const game = games[gameId];
            const currentPlayer = game.clients[game.turn];

            // Check if it's the current player's turn
            if (currentPlayer.clientId !== result.clientId) {
                return; // It's not the current player's turn, so return without doing anything
            }

            // Roll the dice to get a number between 1 and 3
            const diceRoll = Math.floor(Math.random() * 3) + 1;
            const box = currentPlayer.balls[diceRoll]; // Refer to the correct box by dice roll


            // Increment the counter if it's less than 7
            if (box.counter < 2) {
                box.counter += 1;

                // If counter reaches 7, prompt to take an action on another player's box
                
            }
            
            else{
                box.counter += 1;
                hitter = currentPlayer;
                const payLoad = {
                    method: "actionPrompt",
                    gameId,
                    currentPlayer
                };
                clients[currentPlayer.clientId].connection.send(JSON.stringify(payLoad));
            }

            // Update the game turn and send the updated game state with box counters
            game.turn = (game.turn + 1) % game.clients.length;

            // Send the updated game state to all players
            const payLoad = {
                method: "update",
                game
            };
            //hello
            game.clients.forEach((p) => {
                clients[p.clientId].connection.send(JSON.stringify(payLoad));
            });
            const turnPayload = {
                method: "turn",
                currentTurn: game.clients[game.turn].clientId
            };
            game.clients.forEach((p) => {
                clients[p.clientId].connection.send(JSON.stringify(turnPayload));
            });
        }

        // Handle special action (targeting another player's box)
        // Handle special action (targeting another player's box)
        // Handle special action (targeting another player's box)
        // Handle special action (targeting another player's box)
        // Handle special action (targeting another player's box)
        if (result.method === "specialAction") {
            const gameId = result.gameId;
            const targetPlayerId = result.targetPlayerId;
            const targetBoxId = result.targetBoxId;
            const game = games[gameId];

            const targetPlayer = game.clients.find((p) => p.clientId === targetPlayerId);
            const targetBox = targetPlayer.balls[targetBoxId];

            if (targetBox.counter > 0) {
                // Reset the target box counter to 0
                targetBox.counter = 0;
                targetBox.hit += 1; // Increment the "hit" counter
            } else if (targetBox.counter === 0 && targetBox.hit > 0) {
                // Mark the box as eliminated instead of deleting it
                targetPlayer.balls[targetBoxId] = { counter: 0, hit: targetBox.hit, eliminated: true };
            } else if (targetBox.counter === 0 && targetBox.hit === 0) {
                // If box is fresh (hit = 0), show an alert
                const playerTurn = hitter;
                clients[playerTurn.clientId].connection.send(JSON.stringify({
                    method: "alert",
                    message: "The targeted box is fresh!"
                }));
            }

            // After the action, update the game state
            const payLoad = {
                method: "update",
                game
            };
            game.clients.forEach((p) => {
                clients[p.clientId].connection.send(JSON.stringify(payLoad));
            });
        }
        
        





    });

    // Generate a new clientId
    const clientId = guid();
    clients[clientId] = {
        "connection": connection
    };

    const payLoad = {
        "method": "connect",
        "clientId": clientId
    };

    // Send back the client connect
    connection.send(JSON.stringify(payLoad));
});

// Update game state and send it to all players
function updateGameState() {
    for (const g of Object.keys(games)) {
        const game = games[g];
        const payLoad = {
            "method": "update",
            "game": game
        };

        game.clients.forEach(c => {
            clients[c.clientId].connection.send(JSON.stringify(payLoad));
        });
    }

    setTimeout(updateGameState, 500);
}

function S4() {
    return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
}

// Generate GUID
const guid = () => (S4() + S4() + "-" + S4() + "-4" + S4().substr(0, 3) + "-" + S4() + "-" + S4() + S4() + S4()).toLowerCase();   