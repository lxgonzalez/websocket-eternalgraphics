const WebSocket = require('ws');
const { MongoClient } = require('mongodb');
require('dotenv').config();

const PORT = process.env.PORT || 1050;
const MONGODB_URL = process.env.MONGODB_URL;
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME;
const MONGODB_COLLECTION = process.env.MONGODB_COLLECTION;

const wss = new WebSocket.Server({ port: PORT });

let db;
async function connectToMongoDB() {
    try {
        const client = await MongoClient.connect(MONGODB_URL, { useUnifiedTopology: true });
        db = client.db(MONGODB_DB_NAME);
        console.log('Connected to MongoDB');
    } catch (error) {
        console.error('Error connecting to MongoDB:', error);
        process.exit(1); 
    }
}

async function handleSubscription(ws, topic) {
    await db.collection(MONGODB_COLLECTION).updateOne(
        { topic },
        { $addToSet: { subscribers: ws._socket.remoteAddress } },
        { upsert: true }
    );
    console.log(`Client subscribed to topic: ${topic}`);

    const pendingMessages = await db.collection(MONGODB_COLLECTION).findOne({ topic });
    if (pendingMessages?.queue?.length > 0) {
        console.log(`Sending pending messages for topic: ${topic}`);
        pendingMessages.queue.forEach((msg) => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify(msg));
            }
        });
        await db.collection(MONGODB_COLLECTION).updateOne(
            { topic },
            { $set: { queue: [] } }
        );
    }
}

async function handleUnsubscription(ws, topic) {
    await db.collection(MONGODB_COLLECTION).updateOne(
        { topic },
        { $pull: { subscribers: ws._socket.remoteAddress } }
    );
    console.log(`Client unsubscribed from topic: ${topic}`);
}

async function queueMessage(topic, message) {
    await db.collection(MONGODB_COLLECTION).updateOne(
        { topic },
        { $push: { queue: message } },
        { upsert: true }
    );
    console.log(`Message queued for topic: ${topic}`);
}

async function broadcastMessage(message) {
    const { topic } = message;
    console.log(`Broadcasting message to topic ${topic}:`, message);

    const topicData = await db.collection(MONGODB_COLLECTION).findOne({ topic });
    if (!topicData?.subscribers?.length) {
        await queueMessage(topic, message); 
        return;
    }

    topicData.subscribers.forEach(async (subscriber) => {
        const client = Array.from(wss.clients).find(c => c._socket.remoteAddress === subscriber);
        if (client?.readyState === WebSocket.OPEN) {
            try {
                client.send(JSON.stringify(message));
                console.log('Message sent to client.');
            } catch (error) {
                console.error('Error sending message to client:', error);
            }
        } else {
            await queueMessage(topic, message); 
        }
    });
}

async function handleClientDisconnection(ws) {
    const topics = await db.collection(MONGODB_COLLECTION).find({}).toArray();
    
    // Iterate through each topic the client is subscribed to
    topics.forEach(async (topic) => {
        // Only remove the client from the subscribers list for topics they are subscribed to
        if (topic.subscribers.includes(ws._socket.remoteAddress)) {
            await db.collection(MONGODB_COLLECTION).updateOne(
                { topic: topic.topic },
                { $pull: { subscribers: ws._socket.remoteAddress } }
            );
            console.log(`Client removed from topic: ${topic.topic}`);
        }
    });
    console.log('Client disconnected.');
}


wss.on('connection', (ws) => {
    console.log('New client connected.', ws._socket.remoteAddress);

    ws.on('message', async (message) => {
        console.log('Message received from client:', message);

        try {
            const parsedMessage = JSON.parse(message);
            console.log("Parsed message:", parsedMessage);

            const { event, topic } = parsedMessage;
            if (!event || !topic) {
                console.error('The message does not contain a valid event or topic.');
                return;
            }

            switch (event) {
                case 'subscribe':
                    await handleSubscription(ws, topic);
                    break;
                case 'unsubscribe':
                    await handleUnsubscription(ws, topic);
                    break;
                default:
                    await broadcastMessage(parsedMessage);
            }
        } catch (error) {
            console.error('Error processing the message:', error);
        }
    });

    ws.on('close', () => handleClientDisconnection(ws));
    ws.on('error', (error) => console.error('Error in WebSocket connection:', error));
});

(async () => {
    try {
      await connectToMongoDB();
      wss.on('listening', () => console.log(`Message broker running on port ${PORT}`));
      console.log('WebSocket server initialized.');
    } catch (error) {
      console.error('Failed to initialize server:', error);
      process.exit(1);
    }
  })();
module.exports = { broadcastMessage };