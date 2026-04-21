require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path'); // ✅ Required for static file serving

// Workspace Model (Socket DB updates ke liye zaroori hai)
const Workspace = require('./models/Workspace'); 

// Routes Imports
const authRoutes = require('./routes/authRoutes');
const workspaceRoutes = require('./routes/workspaceRoutes');
const taskRoutes = require('./routes/taskRoutes');
const aiRoutes = require('./routes/aiRoutes');
const uploadRoutes = require('./routes/uploadRoutes'); // ✅ Upload Route Import

const app = express();
app.use(cors());
app.use(express.json());

// ✅ 1. Static Folder Setup: Frontend ko images aur files dikhane ke liye
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Server & Socket.io setup
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", 
    methods: ["GET", "POST", "PUT", "DELETE"]
  }
});

// 🔌 --- SOCKET.IO LOGIC --- 🔌
io.on('connection', (socket) => {
  console.log('User connected to socket:', socket.id);

  // 1. Join Workspace Room
  socket.on('join_workspace', (workspaceId) => {
    socket.join(workspaceId);
  });

  // 2. Chat Message & 📁 FILE/LINK AUTO-SAVE LOGIC
  socket.on('send_message', async (data) => {
    try {
      // Step A: Save message to Chat History
      await Workspace.findByIdAndUpdate(
        data.workspaceId,
        {
          $push: {
            chatMessages: {
              messageId: data.messageId,
              sender: data.sender,
              text: data.text,
              fileUrl: data.fileUrl,
              fileType: data.fileType
            }
          }
        }
      );

      // Step B: Agar Message mein File hai, toh use "Files" section mein save karo
      if (data.fileUrl) {
        await Workspace.findByIdAndUpdate(data.workspaceId, {
          $push: {
            files: {
              name: data.text || 'Uploaded File', // File ka naam
              url: data.fileUrl,
              type: data.fileType || 'document',  // 'image' ya 'document'
              sender: data.sender
            }
          }
        });
      }

      // Step C: Agar text message mein koi Link hai, toh use extract karke "Links" mein save karo
      if (data.text) {
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        const links = data.text.match(urlRegex);
        
        if (links) {
          for (const link of links) {
            await Workspace.findByIdAndUpdate(data.workspaceId, {
              $push: {
                files: {
                  name: 'Shared Link',
                  url: link,
                  type: 'link',
                  sender: data.sender
                }
              }
            });
          }
        }
      }

      // Step D: Broadcast message to everyone in the workspace
      io.to(data.workspaceId).emit('receive_message', data);
      
    } catch (error) {
      console.error("Socket send_message Error:", error);
    }
  });

  // 3. Delete Message Logic
  socket.on('delete_message_everyone', async (data) => {
    try {
      await Workspace.findByIdAndUpdate(
        data.workspaceId,
        { $pull: { chatMessages: { messageId: data.messageId } } }
      );
      io.to(data.workspaceId).emit('message_deleted_everyone', data.messageId);
    } catch (error) {
      console.error("Error deleting message:", error);
    }
  });

  socket.on('delete_message_me', async (data) => {
    try {
      await Workspace.updateOne(
        { _id: data.workspaceId, "chatMessages.messageId": data.messageId },
        { $push: { "chatMessages.$.deletedFor": data.user } }
      );
    } catch (error) {
      console.error("Error deleting for me:", error);
    }
  });

  // 4. Kanban Board Updates
  socket.on('task_moved', (data) => {
    socket.to(data.workspaceId).emit('update_board', data);
  });

  socket.on('task_updated', (data) => {
    socket.to(data.workspaceId).emit('update_task_ui', data);
  });

  // 5. Docs/Notes Real-time Update
  socket.on('update_note', async (data) => {
    try {
      await Workspace.findByIdAndUpdate(data.workspaceId, { noteContent: data.content });
      socket.to(data.workspaceId).emit('note_updated', data.content);
    } catch (error) {
      console.error("Note update error:", error);
    }
  });

  // 6. Delete Workspace Broadcast
  socket.on('delete_workspace', (workspaceId) => {
    socket.to(workspaceId).emit('workspace_deleted_broadcast');
  });

  // 🔔 7. NAYA: Dashboard Radar Refresh Signal
  socket.on('log_dashboard_activity', (workspaceId) => {
    // Ye line us workspace se jude saare users ke dashboard ko refresh ka signal degi
    io.to(workspaceId).emit('refresh_radar');
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// 🌐 --- REST API ROUTES --- 🌐
app.use('/api/auth', authRoutes);
app.use('/api/workspaces', workspaceRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/upload', uploadRoutes); // ✅ 2. Naya Upload Route connected

// 🗄️ --- DATABASE CONNECTION & SERVER START --- 🗄️
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("Connected to MongoDB Database ✅");
    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => console.log(`Server running smoothly on port ${PORT} 🚀`));
  })
  .catch(err => console.log("Database connection failed ❌", err));