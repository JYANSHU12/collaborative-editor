import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import axios from 'axios';
import io from 'socket.io-client';
import Quill from 'quill';
import 'quill/dist/quill.snow.css';
import Navbar from '../components/Navbar';
import Loader from '../components/Loader';
import VersionHistory from '../components/VersionHistory';
import { FiArrowLeft, FiShare2, FiCheck, FiDownload, FiClock, FiBarChart2 } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
const SAVE_INTERVAL_MS = 2000;

const TOOLBAR_OPTIONS = [
    [{ header: [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ color: [] }, { background: [] }],
    [{ align: [] }],
    [{ list: 'ordered' }, { list: 'bullet' }],
    ['link', 'blockquote', 'code-block'],
    ['clean'],
];

function getStats(quill) {
    if (!quill) return { words: 0, chars: 0, readTime: 0 };
    const text = quill.getText().trim();
    const words = text ? text.split(/\s+/).filter(Boolean).length : 0;
    const chars = text.length;
    const readTime = Math.max(1, Math.ceil(words / 200));
    return { words, chars, readTime };
}

const Editor = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [socket, setSocket] = useState(null);
    const [quill, setQuill] = useState(null);
    const [title, setTitle] = useState('Untitled Document');
    const [loading, setLoading] = useState(true);
    const [saved, setSaved] = useState(false);
    const [stats, setStats] = useState({ words: 0, chars: 0, readTime: 1 });
    const [collaborators, setCollaborators] = useState([]);
    const [showVersions, setShowVersions] = useState(false);
    const [showStats, setShowStats] = useState(false);
    const titleDebounce = useRef(null);
    const cursorsRef = useRef({});

    // Socket init
    useEffect(() => {
        const s = io(SOCKET_URL);
        setSocket(s);
        return () => s.disconnect();
    }, []);

    // Load document meta
    useEffect(() => {
        axios.get(`${API_URL}/api/documents/${id}`)
            .then(({ data }) => setTitle(data.title))
            .catch(() => { toast.error('Document not found'); navigate('/dashboard'); })
            .finally(() => setLoading(false));
    }, [id, navigate]);

    // Socket events
    useEffect(() => {
        if (!socket || !quill) return;

        socket.emit('join-document', { documentId: id, userName: user?.name || 'Anonymous' });

        socket.once('load-document', (content) => {
            if (content?.ops) quill.setContents(content);
            quill.enable();
        });

        socket.on('receive-changes', (delta) => quill.updateContents(delta));
        socket.on('title-updated', (t) => setTitle(t));
        socket.on('presence-update', (users) => setCollaborators(users));

        // Remote cursors
        socket.on('remote-cursor', ({ socketId, name, color, index, length }) => {
            // remove old
            const old = cursorsRef.current[socketId];
            if (old) old.remove();
            // draw new cursor flag
            try {
                const bounds = quill.getBounds(index, length);
                const editorEl = quill.root.parentElement;
                const flag = document.createElement('div');
                flag.className = 'remote-cursor-flag';
                flag.style.cssText = `position:absolute;left:${bounds.left}px;top:${bounds.top - 24}px;background:${color};color:#fff;font-size:11px;padding:2px 6px;border-radius:4px;pointer-events:none;z-index:999;white-space:nowrap;`;
                flag.textContent = name;
                const line = document.createElement('div');
                line.style.cssText = `position:absolute;left:${bounds.left}px;top:${bounds.top}px;width:2px;height:${bounds.height || 18}px;background:${color};pointer-events:none;z-index:999;`;
                editorEl.style.position = 'relative';
                editorEl.appendChild(flag);
                editorEl.appendChild(line);
                cursorsRef.current[socketId] = { remove: () => { flag.remove(); line.remove(); } };
                setTimeout(() => cursorsRef.current[socketId]?.remove(), 3000);
            } catch (_) { }
        });

        return () => {
            socket.off('receive-changes');
            socket.off('title-updated');
            socket.off('presence-update');
            socket.off('remote-cursor');
        };
    }, [socket, quill, id, user]);

    // Auto-save + stats update
    useEffect(() => {
        if (!socket || !quill) return;
        const interval = setInterval(() => {
            const content = quill.getContents();
            socket.emit('save-document', content);
            axios.patch(`${API_URL}/api/documents/${id}`, { content }).catch(() => { });
            setStats(getStats(quill));
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        }, SAVE_INTERVAL_MS);
        return () => clearInterval(interval);
    }, [socket, quill, id]);

    // Broadcast changes + cursor position
    useEffect(() => {
        if (!socket || !quill) return;
        const changeHandler = (delta, _old, source) => {
            if (source !== 'user') return;
            socket.emit('send-changes', delta);
            setStats(getStats(quill));
        };
        const selectionHandler = (range) => {
            if (range) socket.emit('cursor-move', { index: range.index, length: range.length });
        };
        quill.on('text-change', changeHandler);
        quill.on('selection-change', selectionHandler);
        return () => { quill.off('text-change', changeHandler); quill.off('selection-change', selectionHandler); };
    }, [socket, quill]);

    const wrapperRef = useCallback((wrapper) => {
        if (!wrapper) return;
        wrapper.innerHTML = '';
        const ed = document.createElement('div');
        wrapper.append(ed);
        const q = new Quill(ed, { theme: 'snow', modules: { toolbar: TOOLBAR_OPTIONS } });
        q.disable();
        q.setText('Loading…');
        setQuill(q);
    }, []);

    const handleTitleChange = (e) => {
        const val = e.target.value;
        setTitle(val);
        clearTimeout(titleDebounce.current);
        titleDebounce.current = setTimeout(() => {
            axios.patch(`${API_URL}/api/documents/${id}`, { title: val }).catch(() => { });
            socket?.emit('update-title', { title: val });
        }, 500);
    };

    const copyLink = () => {
        navigator.clipboard.writeText(window.location.href);
        toast.success('Link copied! 🔗');
    };

    const exportPDF = () => {
        const printCSS = `
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
        body { font-family: Inter, sans-serif; padding: 48px; color: #1a1d2e; line-height: 1.8; }
        h1 { font-size: 28px; margin-bottom: 4px; }
        .meta { color: #6b7280; font-size: 13px; margin-bottom: 32px; }
        .ql-align-center { text-align: center; }
        .ql-align-right { text-align: right; }
        blockquote { border-left: 4px solid #6366f1; padding: 8px 16px; margin: 16px 0; color: #6b7280; background: #f5f6fa; }
        pre { background: #1a1d2e; color: #e8eaf4; padding: 16px; border-radius: 8px; }
      </style>`;
        const content = quill?.root?.innerHTML || '';
        const win = window.open('', '_blank');
        win.document.write(`<html><head><title>${title}</title>${printCSS}</head><body>
      <h1>${title}</h1>
      <div class="meta">Exported from CollabEdit • ${new Date().toLocaleDateString()}</div>
      ${content}
    </body></html>`);
        win.document.close();
        win.focus();
        setTimeout(() => { win.print(); win.close(); }, 500);
        toast.success('PDF export opened!');
    };

    const saveVersion = async () => {
        try {
            await axios.post(`${API_URL}/api/versions/${id}`, { label: `Manual save — ${new Date().toLocaleTimeString()}` });
            toast.success('Version saved! 📌');
        } catch { toast.error('Failed to save version'); }
    };

    const restoreVersion = async (versionId) => {
        try {
            const { data } = await axios.post(`${API_URL}/api/versions/${id}/restore/${versionId}`);
            if (data.content?.ops) quill?.setContents(data.content);
            if (data.title) setTitle(data.title);
            setShowVersions(false);
            toast.success('Version restored! ↩️');
        } catch { toast.error('Failed to restore'); }
    };

    if (loading) return <><Navbar /><Loader /></>;

    return (
        <div className="editor-page">
            <Navbar />

            {/* Top toolbar */}
            <motion.div className="editor-toolbar-custom" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
                <button className="icon-btn" onClick={() => navigate('/dashboard')} title="Dashboard"><FiArrowLeft /></button>
                <input className="title-input" value={title} onChange={handleTitleChange} placeholder="Untitled Document" />

                <div className="editor-meta">
                    {saved && (
                        <motion.span className="saved-badge" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                            <FiCheck size={12} /> Saved
                        </motion.span>
                    )}

                    {/* Collaborator avatars */}
                    {collaborators.length > 0 && (
                        <div className="collab-strip">
                            {collaborators.slice(0, 5).map((u) => (
                                <div key={u.socketId} className="collab-avatar" style={{ background: u.color }} title={u.name}>
                                    {u.name?.[0]?.toUpperCase() || '?'}
                                </div>
                            ))}
                            {collaborators.length > 5 && <span className="collab-more">+{collaborators.length - 5}</span>}
                        </div>
                    )}

                    {/* Stats toggle */}
                    <motion.button className={`icon-btn ${showStats ? 'active-btn' : ''}`} onClick={() => setShowStats(p => !p)} title="Stats" whileHover={{ scale: 1.1 }}>
                        <FiBarChart2 />
                    </motion.button>

                    {/* Version history */}
                    <motion.button className={`icon-btn ${showVersions ? 'active-btn' : ''}`} onClick={() => { saveVersion(); setShowVersions(p => !p); }} title="Version History" whileHover={{ scale: 1.1 }}>
                        <FiClock />
                    </motion.button>

                    {/* PDF Export */}
                    <motion.button className="icon-btn" onClick={exportPDF} title="Export PDF" whileHover={{ scale: 1.1 }}>
                        <FiDownload />
                    </motion.button>

                    {/* Share */}
                    <motion.button className="btn-outline share-btn" onClick={copyLink} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                        <FiShare2 size={14} /> Share
                    </motion.button>
                </div>
            </motion.div>

            {/* Stats bar */}
            <AnimatePresence>
                {showStats && (
                    <motion.div className="stats-bar" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                        <span>📝 <strong>{stats.words}</strong> words</span>
                        <span>🔤 <strong>{stats.chars}</strong> characters</span>
                        <span>⏱️ <strong>{stats.readTime} min</strong> read</span>
                        <span>👥 <strong>{collaborators.length}</strong> editing now</span>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="editor-layout">
                {/* Quill editor */}
                <motion.div className="editor-container" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                    <div className="quill-wrapper" ref={wrapperRef} />
                </motion.div>

                {/* Version history sidebar */}
                <AnimatePresence>
                    {showVersions && (
                        <VersionHistory docId={id} onRestore={restoreVersion} onClose={() => setShowVersions(false)} />
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default Editor;
