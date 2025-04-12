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

    const { action, payload } = JSON.parse(message);

    switch (action) {
      case "getwifi":
        ws.send(message);
        break;
      case "connectwifi":
        ws.send(`connect:${payload.ssid}|${payload.pass}`);
        break;
      case "connectstatus":
        ws.send(message);
        break;
      case "updateenv":
        console.log("aaaa");
        await sql`INSERT INTO environment_stats (temperature_celsius, humidity_percent, recorded_at) VALUES (${payload.temp}, ${payload.hum}, NOW())`;
        ws.send(message);
        break;
      // case "setpower": {
      //   ws.send(`led1:${payload.power}`);
      //   ws.send(`led2:${payload.power}`);
      //   ws.send(`led3:${payload.power}`);
      //   break;
      // }
      case "setlight": {
        const messageToSend = `led${payload.room}:${payload.lights}`;
        ws.send(messageToSend, (error) => {
          if (error) {
            console.error("Failed to send message:", error);
          } else {
            console.log("Message sent successfully:", messageToSend);
          }
        });
        break;
      }
      case "setfan": {
        const messageToSend = `led1:${payload.fan}`;
        ws.send(messageToSend, (error) => {
          if (error) {
            console.error("Failed to send message:", error);
          } else {
            console.log("Message sent successfully:", messageToSend);
          }
        });
        break;
      }
      default: {
        console.warn("Unknown action:", action);
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
