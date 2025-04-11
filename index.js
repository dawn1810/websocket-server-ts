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

    switch (message.toString()) {
      case "getEnvData": {
        try {
          await sql`BEGIN`;

          const [env] = await sql`
            SELECT temperature_celsius, humidity_percent, recorded_at
            FROM environment_stats
            ORDER BY recorded_at DESC
            LIMIT 1
          `;

          await sql`COMMIT`;
          ws.send(
            JSON.stringify({
              temperature: env?.temperature_celsius ?? null,
              humidity: env?.humidity_percent ?? null,
              recorded_at: env?.recorded_at ?? null,
            }),
          );
        } catch (err) {
          await sql`ROLLBACK`;
          ws.send("Get enviroment data failed .", err);
        }
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
