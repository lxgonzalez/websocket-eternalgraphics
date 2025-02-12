# 🛠 WebSocket Service Microservice

The WebSocket is a microservice developed in Node.js and the ws library. Its primary functionality is to establish a WebSocket server, allowing clients to communicate in real-time through WebSockets.

---

## 🐳 **Deployment Docker Image**

Visit the repository on Docker Hub [here](https://hub.docker.com/r/lxgonzalez/websocket-service) 🐳

1. **Check if port 4000 is free**.
2. **Run the following command in your terminal**:
   
```bash
docker run -d --name websocket-broker \
-p 4000:4000 \
-e PORT=4000 \
-e MONGODB_URL=mongodb://your-mongo-url \
-e MONGODB_DB_NAME=your-db \
-e MONGODB_COLLECTION=your-collection \
lxgonzalez/websocket-service:latest
```
---

## 🚀 **Deployment Locally**

Follow these steps to run the WebSocket service on your local machine:

1. **Clone the Repository**

Clone this repository to your local machine:
   
  ```bash
  git clone https://github.com/lxgonzalez/websocket-eternalgraphics
  ```

2. **Install Dependencies**
   
 ```bash
npm install
  ```

3. **Run the Application**
   
  ```bash
  npm start
  ```
   
4. **Message Formats**

  ```json
  {
    "event": "subscribe",
    "topic": "categories_products"
  }
  ```

**Send Event (Example: Category Deletion)**
  ```json
  {
    "event": "delete_category",
    "topic": "categories_products",
    "category_id": "12345",
  }
  ```
