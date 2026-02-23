require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { MongoMemoryServer } = require('mongodb-memory-server');
const connectDB = require('./config/db');
const Document = require('./models/Document');

const app = express();
const server = http.createServer(app);
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

const io = new Server(server, {
    cors: { origin: CLIENT_URL, methods: ['GET', 'POST'], credentials: true },
});

app.use(cors({ origin: CLIENT_URL, credentials: true }));
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/documents', require('./routes/documents'));
app.use('/api/versions', require('./routes/versions'));

app.get('/', (req, res) => res.json({ message: 'Collaborative Editor API v2 🚀' }));

// ─── Per-document active users map ───────────────────────────────────────────
// docId → Map<socketId, { name, color, cursor }>
const docUsers = {};

const USER_COLORS = [
    '#6366f1', '#ec4899', '#f59e0b', '#22c55e', '#14b8a6',
    '#f97316', '#8b5cf6', '#ef4444', '#06b6d4', '#84cc16',
];
let colorIndex = 0;

const SAVE_INTERVAL_MS = 2000;

io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    socket.on('join-document', async ({ documentId, userName }) => {
        socket.join(documentId);

        // Register user presence
        if (!docUsers[documentId]) docUsers[documentId] = new Map();
        const color = USER_COLORS[colorIndex++ % USER_COLORS.length];
        docUsers[documentId].set(socket.id, { name: userName || 'Anonymous', color, socketId: socket.id });

        // Load document
        const document = await findOrCreateDocument(documentId);
        socket.emit('load-document', document.content);

        // Broadcast updated presence to the room
        const users = Array.from(docUsers[documentId].values());
        io.to(documentId).emit('presence-update', users);

        // ── Real-time text changes ──────────────────────────────────────────────
        socket.on('send-changes', (delta) => {
            socket.broadcast.to(documentId).emit('receive-changes', delta);
        });

        // ── Auto save ──────────────────────────────────────────────────────────
        socket.on('save-document', async (content) => {
            await Document.findByIdAndUpdate(documentId, { content });
        });

        // ── Title sync ─────────────────────────────────────────────────────────
        socket.on('update-title', async ({ title }) => {
            await Document.findByIdAndUpdate(documentId, { title });
            socket.broadcast.to(documentId).emit('title-updated', title);
        });

        // ── Live cursor position ───────────────────────────────────────────────
        socket.on('cursor-move', ({ index, length }) => {
            const user = docUsers[documentId]?.get(socket.id);
            if (!user) return;
            socket.broadcast.to(documentId).emit('remote-cursor', {
                socketId: socket.id,
                name: user.name,
                color: user.color,
                index,
                length,
            });
        });

        // ── Disconnect ─────────────────────────────────────────────────────────
        socket.on('disconnect', () => {
            if (docUsers[documentId]) {
                docUsers[documentId].delete(socket.id);
                const users = Array.from(docUsers[documentId].values());
                io.to(documentId).emit('presence-update', users);
                if (docUsers[documentId].size === 0) delete docUsers[documentId];
            }
        });
    });

    // Legacy event support
    socket.on('get-document', async (documentId) => {
        socket.join(documentId);
        const document = await findOrCreateDocument(documentId);
        socket.emit('load-document', document.content);
        socket.on('send-changes', (delta) => socket.broadcast.to(documentId).emit('receive-changes', delta));
        socket.on('save-document', async (data) => await Document.findByIdAndUpdate(documentId, { content: data }));
        socket.on('update-title', async ({ title }) => {
            await Document.findByIdAndUpdate(documentId, { title });
            socket.broadcast.to(documentId).emit('title-updated', title);
        });
    });
});

async function findOrCreateDocument(id) {
    if (!id) return;
    const doc = await Document.findById(id);
    if (doc) return doc;
    return await Document.create({ _id: id, content: { ops: [] }, owner: null });
}

async function startServer() {
    let mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
        console.log('⚡ No MONGO_URI — starting embedded MongoDB...');
        const mongod = await MongoMemoryServer.create();
        mongoUri = mongod.getUri();
        console.log(`✅ Embedded MongoDB: ${mongoUri}`);
    }
    await connectDB(mongoUri);
    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
}

startServer().catch(console.error);
