// import { writeFile } from "fs";
// import { Server } from "socket.io";
const express = require('express');
const app = express();
const http = require('http').createServer(app)
const io = require('socket.io')(http, {
    cors: {
        origin: '*',
    },
    //   maxHttpBufferSize: 1e8   // 100 MB
});


app.get('/', (req, res) => {
    res.send("Node Server is running. Yay!!")
})

app.use(express.json());

// io.on('connection', socket => {
//     console.log('Connected...');
//     socket.on('disconnect', () => {
//         socket.leave()
//     })

//     socket.on("create_room", (msg) => {
//         console.log('message: ' + msg.user);
//         console.log('room_id: ' + msg.room_id);
//         socket.join(msg.room_id);
//     });
//     socket.on("new_message_customer", (data) => {
//         console.log("sid_msg", data);
//         socket.to(data.room_id).emit("new_message_customer", data);
//     });
//     socket.on("new_message_user", (data) => {
//         socket.to(data.room_id).emit("user_message", data);
//         console.log("from user",data);
//     })
//     socket.on("connect_error", (err) => {
//         console.log(`connect_error due to ${err.message}`);
//     });
// });

io.on('connection', socket => {
    console.log('Client connected:', socket.id);

    socket.on("create_room", (data) => {
        const roomId = data.room_id || data.conversationId;
        console.log("Joining room:", roomId);
        socket.join(roomId.toString());
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
});



// app.post('/api/send_message', (req, res) => {
//     const { room_id, message, time, toUserId, fromUserId } = req.body;
//     console.log(req.body)
//     console.log(`Message received: ${message} from user ${fromUserId} to ${toUserId} in room ${room_id} at ${time}`);
//     // io.to(room_id).emit('new_message_customer', req.body);
//     io.to('crm_dxb_users').emit('new_message_customer', req.body);
//     res.json({ success: true });
// });

app.post('/api/send_message', (req, res) => {
    try {
        const data = req.body;

        console.log("Realtime message received:", data);

        // Determine room
        const roomId = data.conversationId || data.from;

        if (!roomId) {
            return res.status(400).json({ error: "Room not resolved" });
        }

        // Decide event based on direction
        const eventName = data.inbound
            ? "new_message_customer"
            : "new_message_user";

        // Emit full DTO (no parsing)
        io.to(roomId.toString()).emit(eventName, data);

        return res.json({ success: true });

    } catch (err) {
        console.error("Socket error", err);
        return res.status(500).json({ error: "Internal server error" });
    }
});



io.of("/").adapter.on("create-room", (room) => {
    console.log(`room ${room} was created`);
});

var port = process.env.PORT || 3000;
http.listen(port,'0.0.0.0', function (err) {
    if (err) console.log(err);
    console.log('Listening on port', port);
});
