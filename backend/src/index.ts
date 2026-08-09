import http from "node:http";
import express from "express";
import { Server } from "socket.io";
import { UserRouter } from "./domains/user/index.js";
import { config } from "dotenv";
import { GameRoomRouter, SetupGameRoomSocketHandlers } from "./domains/game-room/controller.js";

config();

const PORT = Number(process.env.PORT ?? 3000);

const app = express();
app.use(express.json());


app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "citadel-backend" });
});

app.use("/api/users", UserRouter);
app.use("/api/rooms", GameRoomRouter);
const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: { origin: "*" },
  pingInterval: 10_000,
  pingTimeout: 5_000,
});

SetupGameRoomSocketHandlers(io);

httpServer.listen(PORT, () => {
  console.log(`Citadel backend listening on http://localhost:${PORT}`);
});
