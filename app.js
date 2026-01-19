const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*" }
});

app.use(express.json());

/* ===============================
   HEALTH CHECK
================================ */
app.get("/", (req, res) => {
  res.send("Socket Server Running");
});

/* ===============================
   SOCKET CONNECTION
================================ */
io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  /* ========= JOIN ORG / APP / WHATSAPP ========= */
  socket.on("join_context", ({ orgId, appId, waAccountId }) => {
    socket.join(`org_${orgId}`);
    socket.join(`org_${orgId}:app_${appId}`);
    socket.join(`org_${orgId}:app_${appId}:wa_${waAccountId}`);
  });

  /* ========= JOIN CUSTOMER CHAT ========= */
  socket.on("join_chat", ({ orgId, appId, waAccountId, chatId }) => {
    const room =
      `org_${orgId}:app_${appId}:wa_${waAccountId}:chat_${chatId}`;
    socket.join(room);
  });

  /* =====================================================
     INTERNAL USER ↔ USER CHAT (FOR FUTURE USE)
     ❌ CURRENTLY NOT USED
  ====================================================== */

  /*
  socket.on("join_internal_chat", ({ orgId, appId, userId }) => {
    socket.join(`org_${orgId}:app_${appId}:user_${userId}`);
  });
  */

  /*
  socket.on("internal_user_message", (data) => {
    const room =
      `org_${data.orgId}:app_${data.appId}:user_${data.toUserId}`;
    io.to(room).emit("internal_user_message", data);
  });
  */

  socket.on("disconnect", () => {
    console.log("Socket disconnected:", socket.id);
  });
});

/* ===============================
   BACKEND → SOCKET PUSH API
================================ */
app.post("/api/socket/push", (req, res) => {
  const {
    event,
    orgId,
    appId,
    waAccountId,
    chatId
  } = req.body;

  /* ===== Customer ↔ Business Chat ===== */
  if (chatId) {
    const room =
      `org_${orgId}:app_${appId}:wa_${waAccountId}:chat_${chatId}`;
    io.to(room).emit(event, req.body);
  }

  /* ===== Internal Chat (Future) ===== */
  /*
  if (req.body.toUserId) {
    const room =
      `org_${orgId}:app_${appId}:user_${req.body.toUserId}`;
    io.to(room).emit(event, req.body);
  }
  */

  res.json({ success: true });
});

/* ===============================
   SERVER START
================================ */
const PORT = process.env.PORT || 3000;
server.listen(PORT, "0.0.0.0", () => {
  console.log("Socket server running on port", PORT);
});
