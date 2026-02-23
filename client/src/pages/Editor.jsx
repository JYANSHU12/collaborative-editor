import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import axios from 'axios';
import io from 'socket.io-client';
import Quill from 'quill';
import 'quill/dist/quill.snow.css';
import Navbar from '../components/Navbar';
import Loader from '../components/Loader';
import { FiArrowLeft, FiShare2, FiCheck } from 'react-icons/fi';

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

const Editor = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [socket, setSocket] = useState(null);
    const [quill, setQuill] = useState(null);
    const [title, setTitle] = useState('Untitled Document');
    const [loading, setLoading] = useState(true);
    const [saved, setSaved] = useState(false);
    const [activeUsers, setActiveUsers] = useState(1);
    const titleDebounce = useRef(null);

    // Initialize socket
    useEffect(() => {
        const s = io(SOCKET_URL);
        setSocket(s);
        return () => s.disconnect();
    }, []);

    // Load document meta
    useEffect(() => {
        const load = async () => {
            try {
                const { data } = await axios.get(`${API_URL}/api/documents/${id}`);
                setTitle(data.title);
            } catch {
                toast.error('Document not found or access denied');
                navigate('/dashboard');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [id, navigate]);

    // Socket: load content and listen for changes
    useEffect(() => {
        if (!socket || !quill) return;

        socket.once('load-document', (content) => {
            if (content && content.ops) quill.setContents(content);
            quill.enable();
        });

        socket.emit('get-document', id);

        const receiveHandler = (delta) => quill.updateContents(delta);
        socket.on('receive-changes', receiveHandler);
        socket.on('title-updated', (newTitle) => setTitle(newTitle));

        return () => {
            socket.off('receive-changes', receiveHandler);
            socket.off('title-updated');
        };
    }, [socket, quill, id]);

    // Auto-save interval
    useEffect(() => {
        if (!socket || !quill) return;
        const interval = setInterval(() => {
            const content = quill.getContents();
            socket.emit('save-document', content);
            axios.patch(`${API_URL}/api/documents/${id}`, { content }).catch(() => { });
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        }, SAVE_INTERVAL_MS);
        return () => clearInterval(interval);
    }, [socket, quill, id]);

    // Broadcast local changes to other users
    useEffect(() => {
        if (!socket || !quill) return;
        const handler = (delta, _old, source) => {
            if (source !== 'user') return;
            socket.emit('send-changes', delta);
        };
        quill.on('text-change', handler);
        return () => quill.off('text-change', handler);
    }, [socket, quill]);

    // Initialize Quill editor
    const wrapperRef = useCallback((wrapper) => {
        if (!wrapper) return;
        wrapper.innerHTML = '';
        const editor = document.createElement('div');
        wrapper.append(editor);
        const q = new Quill(editor, { theme: 'snow', modules: { toolbar: TOOLBAR_OPTIONS } });
        q.disable();
        q.setText('Loading content…');
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
        toast.success('Link copied! Share it with collaborators 🔗');
    };

    if (loading) return <><Navbar /><Loader /></>;

    return (
        <div className="editor-page">
            <Navbar />
            <motion.div
                className="editor-toolbar-custom"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
            >
                <button className="icon-btn back-btn" onClick={() => navigate('/dashboard')} title="Back to dashboard">
                    <FiArrowLeft />
                </button>
                <input
                    className="title-input"
                    value={title}
                    onChange={handleTitleChange}
                    placeholder="Untitled Document"
                />
                <div className="editor-meta">
                    {saved && (
                        <motion.span
                            className="saved-badge"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0 }}
                        >
                            <FiCheck size={12} /> Saved
                        </motion.span>
                    )}
                    <div className="active-users">
                        <span className="user-dot" />
                        <span>{activeUsers} editing</span>
                    </div>
                    <motion.button
                        className="btn-outline share-btn"
                        onClick={copyLink}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        <FiShare2 size={14} /> Share
                    </motion.button>
                </div>
            </motion.div>

            <motion.div
                className="editor-container"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
            >
                <div className="quill-wrapper" ref={wrapperRef} />
            </motion.div>
        </div>
    );
};

export default Editor;
