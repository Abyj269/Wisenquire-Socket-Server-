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
  socket.on("join_chat", ({ orgId, appId, waAccountId, conversationId }) => {
    const room =
      `org_${orgId}:app_${appId}:wa_${waAccountId}:conv_${conversationId}`;
    socket.join(room);
  });
  console.log("Room Name")


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

  //   console.log("🧾 FULL INCOMING PAYLOAD (RAW):");
  // console.log(JSON.stringify(req.body, null, 2));


  const {
    orgId,
    appId,
    waAccountId,
    conversationId,
    from,
    text,
    waMessageId
  } = req.body;

  const payload = {
    event: "new_message_customer",
    orgId: String(orgId),
    appId: String(appId),
    waAccountId: String(waAccountId),
    conversationId: String(conversationId),
    inbound: true,
    from: String(from),
    messageText: String(text),
    messageId: waMessageId || Date.now(),
    timestamp: Date.now() // 🔥 SAFE
  };

  const waRoom = `org_${orgId}:app_${appId}:wa_${waAccountId}`;
  const convRoom = `${waRoom}:conv_${conversationId}`;

  // Emit ONLY clean payload
  io.to(waRoom).emit("new_message_customer", payload);

  if (conversationId) {
    io.to(convRoom).emit("new_message_customer", payload);
  }

  res.json({ success: true });
});





// app.post("/api/send_message", (req, res) => {
//   const {
//     event,
//     orgId,
//     appId,
//     waAccountId,
//     conversationId
//   } = req.body;
//   console.log(req.body)
//   /* ===== Customer ↔ Business Chat ===== */
//   if (conversationId) {
//     const room =
//       `org_${orgId}:app_${appId}:wa_${waAccountId}:conv_${conversationId}`;
//     io.to(room).emit(event, req.body);

//   console.log("room>>>>>>>>>>>>>>",room)

//   }

//   /* ===== Internal Chat (Future) ===== */
//   /*
//   if (req.body.toUserId) {
//     const room =
//       `org_${orgId}:app_${appId}:user_${req.body.toUserId}`;
//     io.to(room).emit(event, req.body);
//   }
//   */

//   res.json({ success: true });
// });

/* ===============================
   SERVER START
================================ */
const PORT = process.env.PORT || 3000;
server.listen(PORT, "0.0.0.0", () => {
  console.log("Socket server running on port", PORT);
});
