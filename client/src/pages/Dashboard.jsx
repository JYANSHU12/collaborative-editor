import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import axios from 'axios';
import { FiPlus, FiFileText, FiSearch } from 'react-icons/fi';
import Navbar from '../components/Navbar';
import DocumentCard from '../components/DocumentCard';
import Loader from '../components/Loader';
import { useAuth } from '../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

const Dashboard = () => {
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [search, setSearch] = useState('');
    const { user } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        fetchDocuments();
    }, []);

    const fetchDocuments = async () => {
        try {
            const { data } = await axios.get(`${API_URL}/api/documents`);
            setDocuments(data);
        } catch {
            toast.error('Failed to load documents');
        } finally {
            setLoading(false);
        }
    };

    const createDocument = async () => {
        setCreating(true);
        try {
            const { data } = await axios.post(`${API_URL}/api/documents`, {
                title: 'Untitled Document',
            });
            toast.success('Document created!');
            navigate(`/editor/${data._id}`);
        } catch {
            toast.error('Failed to create document');
        } finally {
            setCreating(false);
        }
    };

    const deleteDocument = async (id) => {
        try {
            await axios.delete(`${API_URL}/api/documents/${id}`);
            setDocuments((prev) => prev.filter((d) => d._id !== id));
            toast.success('Document deleted');
        } catch {
            toast.error('Failed to delete document');
        }
    };

    const filtered = documents.filter((d) =>
        d.title.toLowerCase().includes(search.toLowerCase())
    );

    if (loading) return <><Navbar /><Loader /></>;

    return (
        <div className="dashboard">
            <Navbar />
            <div className="dashboard-container">
                <motion.div
                    className="dashboard-header"
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                >
                    <div>
                        <h1>My Documents</h1>
                        <p className="dash-sub">Welcome back, <strong>{user?.name}</strong> 👋</p>
                    </div>
                    <motion.button
                        className="btn-primary create-btn"
                        onClick={createDocument}
                        disabled={creating}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        <FiPlus />
                        {creating ? 'Creating...' : 'New Document'}
                    </motion.button>
                </motion.div>

                <motion.div
                    className="search-bar"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                >
                    <FiSearch className="search-icon" />
                    <input
                        type="text"
                        placeholder="Search documents..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </motion.div>

                {filtered.length === 0 ? (
                    <motion.div
                        className="empty-state"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.4 }}
                    >
                        <FiFileText size={48} />
                        <h3>{search ? 'No documents found' : 'No documents yet'}</h3>
                        <p>{search ? 'Try a different search term' : 'Create your first document to get started'}</p>
                        {!search && (
                            <button className="btn-primary" onClick={createDocument}>
                                <FiPlus /> Create Document
                            </button>
                        )}
                    </motion.div>
                ) : (
                    <motion.div
                        className="docs-grid"
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                    >
                        <AnimatePresence>
                            {filtered.map((doc) => (
                                <motion.div key={doc._id} variants={itemVariants} layout exit={{ opacity: 0, scale: 0.8 }}>
                                    <DocumentCard doc={doc} onDelete={deleteDocument} />
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </motion.div>
                )}
            </div>
        </div>
    );
};

export default Dashboard;
