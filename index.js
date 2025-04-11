import express from "express";
import { createServer } from "http";
import { WebSocketServer } from "ws";
import { neon } from "@neondatabase/serverless";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Set up port for Railway
const PORT = process.env.PORT || 3000;

// Initialize Express
const app = express();

// Create HTTP server
const server = createServer(app);

// Create WebSocket server
const wss = new WebSocketServer({ server });

// Connect to Neon DB
const sql = neon(process.env.DATABASE_URL);

wss.on("connection", (ws) => {
  console.log("Client connected");

  ws.on("message", async (message) => {
    console.log(`Received: ${message}`);

    if (message.toString() === "ping") {
      // Optionally query Neon
      const result = await sql`SELECT NOW()`;
      ws.send(`pong: ${result.rows[0].now}`);
    }
  });

  ws.on("close", () => {
    console.log("Client disconnected");
  });
});

app.get("/", (_req, res) => {
  res.send("WebSocket + Neon DB server is running!");
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
