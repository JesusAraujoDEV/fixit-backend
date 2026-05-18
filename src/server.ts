import http from "node:http";
import dotenv from "dotenv";
dotenv.config();

import app from "./app.js";
import { initSocketServer } from "./websocket/socket-server.js";
import { sequelize } from "./models/index.js";

const PORT = process.env.PORT || 3000;

const server = http.createServer(app);

// Initialize Socket.io on top of the HTTP server
initSocketServer(server);

async function bootstrap(): Promise<void> {
  try {
    await sequelize.authenticate();
    console.log("✅ Database connection established");
  } catch (error) {
    console.error("❌ Unable to connect to database:", error);
    process.exit(1);
  }

  server.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📚 Swagger docs at http://localhost:${PORT}/api-docs`);
  });
}

bootstrap();
