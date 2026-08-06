import http from "node:http";
import express from "express";
import { Server } from "socket.io";
import { UserRouter } from "./domains/user/index.js";

const PORT = Number(process.env.PORT ?? 3000);

const app = express();
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "citadel-backend" });
});

app.use("/api/users", UserRouter);
const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: { origin: "*" },
});

io.on("connection", (socket) => {
  console.log(`client connected: ${socket.id}`);
  socket.on("disconnect", () => {
    console.log(`client disconnected: ${socket.id}`);
  });
});

httpServer.listen(PORT, () => {
  console.log(`Citadel backend listening on http://localhost:${PORT}`);
});
