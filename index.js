import express from "express";
import { createServer } from "http";
import { WebSocketServer } from "ws";
import { neon } from "@neondatabase/serverless";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Set up port for Railway
const PORT = process.env.PORT || 8080;

// Initialize Express
const app = express();

// Create HTTP server
const server = createServer(app);

// Create WebSocket server
const wss = new WebSocketServer({ server });

// Handle server error to avoid EADDRINUSE error
server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(`Port ${PORT} is already in use`);
    process.exit(1);
  } else {
    throw error;
  }
});

// Connect to Neon DB
const sql = neon(process.env.DATABASE_URL);

wss.on("connection", (ws) => {
  console.log("Client connected");

  ws.on("message", async (message) => {
    console.log(`Received: ${message}`);

    if (message.toString() === "ping") {
      try {
        // Optionally query Neon
        const system_status = await sql`
          SELECT *
          FROM system_status
          LIMIT 1
        `;
        ws.send(`pong: ${JSON.stringify(system_status)}`);
      } catch (error) {
        console.error("Error querying Neon DB:", error);
        ws.send(`Error querying Neon DB: ${error.message}`);
      }
    }
  });

  ws.on("close", () => {
    console.log("Client disconnected");
  });

  ws.on("error", (error) => {
    console.error("WebSocket error:", error);
  });
});

app.get("/", (_req, res) => {
  res.send("WebSocket + Neon DB server is running!");
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
