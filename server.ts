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

  // Logging middleware to track requests
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
  });

  // API Health Check
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "ok", 
      time: new Date().toISOString(),
      socketConnected: io.engine.clientsCount
    });
  });

  // Track users by room
  const rooms: Record<string, Record<string, any>> = {};
  // Track whiteboard state by room
  const whiteboards: Record<string, any[]> = {};

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
      // Send current whiteboard state to the new user
      socket.emit("whiteboard:init", whiteboards[roomId] || []);
      
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

    socket.on("chat:dm", (data) => {
      const roomId = (socket as any).roomId;
      if (roomId && rooms[roomId] && rooms[roomId][socket.id]) {
        io.to(data.to).emit("chat:dm", {
          from: socket.id,
          fromName: rooms[roomId][socket.id].name,
          message: data.message
        });
      }
    });

    // Whiteboard events
    socket.on("whiteboard:draw", (data) => {
      const roomId = (socket as any).roomId;
      if (roomId) {
        if (!whiteboards[roomId]) whiteboards[roomId] = [];
        whiteboards[roomId].push(data);
        socket.to(roomId).emit("whiteboard:draw", data);
      }
    });

    socket.on("whiteboard:clear", () => {
      const roomId = (socket as any).roomId;
      if (roomId) {
        whiteboards[roomId] = [];
        io.to(roomId).emit("whiteboard:clear");
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
    // IMPORTANT: Socket.io handles its own requests on the httpServer.
    // We mount Vite middleware AFTER ensuring Socket.io is attached.
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`>>> Server is listening on 0.0.0.0:${PORT}`);
    console.log(`>>> Socket.IO is initialized and attached to httpServer`);
    console.log(`>>> Health check available at http://localhost:${PORT}/api/health`);
  });
}

startServer();
