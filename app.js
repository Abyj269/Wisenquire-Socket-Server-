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
  // socket.on("join_context", ({ orgId, appId, waAccountId }) => {
  //   socket.join(`org_${orgId}`);
  //   socket.join(`org_${orgId}:app_${appId}`);
  //   socket.join(`org_${orgId}:app_${appId}:wa_${waAccountId}`);
  // });
  socket.on("join_context", ({ branchId, appId, waAccountId }) => {
    socket.join(`branch_${branchId}`);
    socket.join(`branch_${branchId}:app_${appId}`);
    socket.join(`branch_${branchId}:app_${appId}:wa_${waAccountId}`);
  });


  /* ========= JOIN CUSTOMER CHAT ========= */

  socket.on("join_chat", ({ branchId, appId, waAccountId, conversationId }) => {
    const room =`branch_${branchId}:app_${appId}:wa_${waAccountId}:conv_${conversationId}`;
    socket.join(room);

    console.log("🟢 Joined chat room:", room);
  });


  /* ========= LEAVE CHAT ========= */
  socket.on("leave_chat", ({ branchId, appId, waAccountId, conversationId }) => {
    const room =
      `branch_${branchId}:app_${appId}:wa_${waAccountId}:conv_${conversationId}`;

    socket.leave(room);
    console.log("🔴 Left chat room:", room);
  });

   /* ========= LEAVE ALL ========= */
  socket.on("leave_all_rooms", () => {
    socket.rooms.forEach((room) => {
      if (room !== socket.id) {
        socket.leave(room);
      }
    });
    console.log("🧹 Left all rooms:", socket.id);
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



app.post("/api/send_message", (req, res) => {
  const {
    brId,
    appId,
    waAccountId,
    conversationId,
    from,
    text,
    waMessageId,
    profileName,
    customerId,
    ldStage,
    ldStatus,
    ldId,
  } = req.body;

  const branchId = brId;

  if (!branchId || !appId || !waAccountId) {
    console.error("❌ Missing routing data:", req.body);
    return res.status(400).json({ error: "Missing routing data" });
  }
  const payload = {
    event: "new_message_customer",
    branchId: String(branchId),
    appId: String(appId),
    waAccountId: String(waAccountId),
    conversationId: String(conversationId),
    inbound: true,
    from: String(from),
    text: text && text !== "null" ? String(text) : null,
    type: req.body.type || "TEXT",
    waMessageId: waMessageId || Date.now(),
    mediaUrl: req.body.mediaUrl || null,          // 🔥 ADD
    mediaMimeType: req.body.mediaMimeType || null,// 🔥 ADD
    mediaCaption: req.body.mediaCaption || null,  // 🔥 ADD
    timestamp: Date.now(),
    profileName: profileName || null,
    customerId:customerId,
    ldStage:ldStage,
    ldId:ldId,
    ldStatus:ldStatus
  };
  console.log(payload)

  const waRoom =`branch_${branchId}:app_${appId}:wa_${waAccountId}`;
  const convRoom = `${waRoom}:conv_${conversationId}`;

  console.log("📡 Emitting to:", waRoom, convRoom);

  console.log(
    "👥 sockets in WA room:",
    io.sockets.adapter.rooms.get(waRoom)?.size || 0
  );

  console.log(
    "👥 sockets in CONV room:",
    io.sockets.adapter.rooms.get(convRoom)?.size || 0
  );


  io.to(waRoom).emit("new_message_customer", payload);

  if (conversationId) {
    io.to(convRoom).emit("new_message_customer", payload);
  }

  res.json({ success: true });
});


/* ===============================
   SERVER START
================================ */
const PORT = process.env.PORT || 3000;
server.listen(PORT, "0.0.0.0", () => {
  console.log("Socket server running on port", PORT);
});