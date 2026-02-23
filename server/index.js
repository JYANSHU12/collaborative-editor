require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const connectDB = require('./config/db');
const Document = require('./models/Document');

connectDB();

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: process.env.CLIENT_URL || 'http://localhost:5173',
        methods: ['GET', 'POST'],
        credentials: true,
    },
});

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/documents', require('./routes/documents'));

app.get('/', (req, res) => {
    res.json({ message: 'Collaborative Editor API is running 🚀' });
});

// ─── Socket.io Real-Time Collaboration ───────────────────────────────────────
const SAVE_INTERVAL_MS = 2000;

io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    socket.on('get-document', async (documentId) => {
        const document = await findOrCreateDocument(documentId);
        socket.join(documentId);
        socket.emit('load-document', document.content);

        socket.on('send-changes', (delta) => {
            socket.broadcast.to(documentId).emit('receive-changes', delta);
        });

        socket.on('save-document', async (data) => {
            await Document.findByIdAndUpdate(documentId, { content: data });
        });

        socket.on('update-title', async ({ title }) => {
            await Document.findByIdAndUpdate(documentId, { title });
            socket.broadcast.to(documentId).emit('title-updated', title);
        });

        socket.on('cursor-move', (cursorData) => {
            socket.broadcast.to(documentId).emit('cursor-update', {
                ...cursorData,
                socketId: socket.id,
            });
        });
    });

    socket.on('disconnect', () => {
        console.log(`Socket disconnected: ${socket.id}`);
    });
});

async function findOrCreateDocument(id) {
    if (!id) return;
    const document = await Document.findById(id);
    if (document) return document;
    return await Document.create({
        _id: id,
        content: { ops: [] },
        owner: null,
    });
}

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
