import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  const PORT = 3000;

  // Track users by room
  const rooms: Record<string, Record<string, any>> = {};

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("join", (userData) => {
      const roomId = userData.roomId || "default";
      socket.join(roomId);
      (socket as any).roomId = roomId;

      if (!rooms[roomId]) rooms[roomId] = {};
      
      rooms[roomId][socket.id] = {
        id: socket.id,
        name: userData.name,
        pos: userData.pos,
        angle: userData.angle,
        avatarConfig: userData.avatarConfig,
        status: userData.status || 'available',
        isPrivate: userData.isPrivate || false,
        isWalking: false,
        isSpeaking: false,
        roomId
      };
      
      // Send current users in the room to the new user
      socket.emit("init", rooms[roomId]);
      
      // Broadcast new user to others in the same room
      socket.to(roomId).emit("user:joined", rooms[roomId][socket.id]);
    });

    socket.on("move", (moveData) => {
      const roomId = (socket as any).roomId;
      if (roomId && rooms[roomId] && rooms[roomId][socket.id]) {
        const user = rooms[roomId][socket.id];
        user.pos = moveData.pos;
        user.angle = moveData.angle;
        user.isWalking = moveData.isWalking;
        
        socket.to(roomId).emit("user:moved", {
          id: socket.id,
          pos: moveData.pos,
          angle: moveData.angle,
          isWalking: moveData.isWalking,
          timestamp: Date.now()
        });

        if (moveData.seq !== undefined) {
          socket.emit("move:ack", { seq: moveData.seq, pos: moveData.pos });
        }
      }
    });

    socket.on("status", (statusData) => {
      const roomId = (socket as any).roomId;
      if (roomId && rooms[roomId] && rooms[roomId][socket.id]) {
        const user = rooms[roomId][socket.id];
        user.status = statusData.status;
        user.isPrivate = statusData.isPrivate;
        socket.to(roomId).emit("user:status", {
          id: socket.id,
          status: statusData.status,
          isPrivate: statusData.isPrivate
        });
      }
    });

    socket.on("speaking", (isSpeaking) => {
      const roomId = (socket as any).roomId;
      if (roomId && rooms[roomId] && rooms[roomId][socket.id]) {
        const user = rooms[roomId][socket.id];
        user.isSpeaking = isSpeaking;
        socket.to(roomId).emit("user:speaking", {
          id: socket.id,
          isSpeaking
        });
      }
    });

    socket.on("chat:message", (message) => {
      const roomId = (socket as any).roomId;
      if (roomId) {
        socket.to(roomId).emit("chat:message", {
          id: socket.id,
          message
        });
      }
    });

    socket.on("chat:emote", (emote) => {
      const roomId = (socket as any).roomId;
      if (roomId) {
        socket.to(roomId).emit("chat:emote", {
          id: socket.id,
          emote
        });
      }
    });

    // WebRTC Signaling
    socket.on("signal", (data) => {
      io.to(data.to).emit("signal", {
        from: socket.id,
        signal: data.signal
      });
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
      for (const roomId in rooms) {
        if (rooms[roomId][socket.id]) {
          delete rooms[roomId][socket.id];
          io.to(roomId).emit("user:left", socket.id);
          if (Object.keys(rooms[roomId]).length === 0) {
            delete rooms[roomId];
          }
          break;
        }
      }
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
