const WebSocket = require('ws');
require('dotenv').config();

const PORT = process.env.PORT;
const wss = new WebSocket.Server({ port: PORT });

let subscribers = {};
let queues = {};      

wss.on('connection', (ws) => {
    console.log('New client connected.', ws._socket.remoteAddress);

    ws.on('message', (message) => {
        console.log('Message received from client:', message);

        try {
            const parsedMessage = JSON.parse(message);
            console.log("Parsed message:", parsedMessage);

            if (parsedMessage.event === 'subscribe') {
                const topic = parsedMessage.topic;
                if (!subscribers[topic]) {
                    subscribers[topic] = [];
                }
                subscribers[topic].push(ws);
                console.log(`Client subscribed to topics: ${topic}`);

                if (queues[topic] && queues[topic].length > 0) {
                    console.log(`Sending pending messages for topic: ${topic}`);
                    queues[topic].forEach((msg) => {
                        if (ws.readyState === WebSocket.OPEN) {
                            ws.send(JSON.stringify(msg));
                        }
                    });
                    queues[topic] = []; 
                }
            } else if (parsedMessage.event === 'unsubscribe') {
                const topic = parsedMessage.topic;
                if (subscribers[topic]) {
                    subscribers[topic] = subscribers[topic].filter(client => client !== ws);
                    console.log(`Client unsubscribed from topic: ${topic}`);
                }
            } else if (parsedMessage.event && parsedMessage.topic) {
                broadcastMessage(parsedMessage);
            } else {
                console.error('The message does not contain a valid event or topic.');
            }
        } catch (error) {
            console.error('Error processing the message:', error);
        }
    });

    ws.on('close', () => {
        Object.keys(subscribers).forEach(topic => {
            subscribers[topic] = subscribers[topic].filter(client => client !== ws);
        });
        console.log('Client disconnected.');
    });

    ws.on('error', (error) => {
        console.error('Error in WebSocket connection:', error);
    });
});

function broadcastMessage(message) {
    const topic = message.topic;
    console.log(`Broadcasting message to topic ${topic}:`, message);

    if (subscribers[topic]) {
        subscribers[topic].forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                try {
                    client.send(JSON.stringify(message));
                    console.log('Message sent to client.');
                } catch (error) {
                    console.error('Error sending message to client:', error);
                }
            } else {
                if (!queues[topic]) {
                    queues[topic] = [];
                }
                queues[topic].push(message);
                console.log(`Message queued for topic: ${topic}`);
            }
        });
    } else {
        if (!queues[topic]) {
            queues[topic] = [];
        }
        queues[topic].push(message);
        console.log(`No subscribers for topic: ${topic}. Message queued.`);
    }
}

console.log(`Message broker running on port ${PORT}`);

module.exports = { broadcastMessage };