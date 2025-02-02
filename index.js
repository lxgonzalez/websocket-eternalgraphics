const WebSocket = require('ws');
require('dotenv').config();

const PORT = process.env.PORT;
const wss = new WebSocket.Server({ port: PORT });

let subscribers = [];

wss.on('connection', (ws) => {
    console.log('New client connected.', ws._socket.remoteAddress);

    subscribers.push(ws);

    ws.on('message', (message) => {
        console.log('Message received from client:', message);

        try {
            const parsedMessage = JSON.parse(message);
            console.log("Parsed message:", parsedMessage);

            if (parsedMessage.event) {
                console.log(`Received event: ${parsedMessage.event}`);

                broadcastMessage(parsedMessage);
            } else {
                console.error('The message does not contain a valid event.');
            }
        } catch (error) {
            console.error('Error processing the message:', error);
        }
    });

    ws.on('close', () => {
        subscribers = subscribers.filter(client => client !== ws);
        console.log('Client disconnected.');
    });

    ws.on('error', (error) => {
        console.error('Error in WebSocket connection:', error);
    });
});

function broadcastMessage(message) {
    console.log('Broadcasting message:', message);
    subscribers.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            try {
                client.send(JSON.stringify(message));
                console.log('Message sent to client.');
            } catch (error) {
                console.error('Error sending message to client:', error);
            }
        } else {
            console.log('Client is not ready to receive messages.');
        }
    });
}

console.log(`Message broker running on port ${PORT}`);

module.exports = { broadcastMessage };
