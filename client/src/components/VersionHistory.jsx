import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { FiX, FiRotateCcw, FiClock } from 'react-icons/fi';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function timeAgo(dateStr) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const s = Math.floor(diff / 1000);
    if (s < 60) return `${s}s ago`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return new Date(dateStr).toLocaleDateString();
}

const VersionHistory = ({ docId, onRestore, onClose }) => {
    const [versions, setVersions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [restoringId, setRestoringId] = useState(null);

    useEffect(() => {
        const token = localStorage.getItem('token');
        axios
            .get(`${API_URL}/api/versions/${docId}`, {
                headers: { Authorization: `Bearer ${token}` },
            })
            .then(({ data }) => setVersions(data))
            .catch(() => setVersions([]))
            .finally(() => setLoading(false));
    }, [docId]);

    const handleRestore = async (versionId) => {
        setRestoringId(versionId);
        await onRestore(versionId);
        setRestoringId(null);
    };

    return (
        <motion.div
            className="version-sidebar"
            initial={{ x: 320, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 320, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        >
            {/* Header */}
            <div className="version-header">
                <div className="version-header-title">
                    <FiClock size={16} />
                    <span>Version History</span>
                </div>
                <button className="icon-btn" onClick={onClose} title="Close">
                    <FiX />
                </button>
            </div>

            {/* Content */}
            <div className="version-list">
                {loading && (
                    <div className="version-loading">
                        <div className="version-spinner" />
                        <span>Loading versions…</span>
                    </div>
                )}

                {!loading && versions.length === 0 && (
                    <div className="version-empty">
                        <FiClock size={32} style={{ opacity: 0.3 }} />
                        <p>No saved versions yet.</p>
                        <p style={{ fontSize: '12px' }}>Click 🕐 to save a version manually.</p>
                    </div>
                )}

                {!loading && versions.map((v, i) => (
                    <motion.div
                        key={v._id}
                        className="version-item"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.04 }}
                    >
                        <div className="version-item-info">
                            <div className="version-label">{v.label || 'Auto-save'}</div>
                            <div className="version-meta">
                                <span>{timeAgo(v.createdAt)}</span>
                                {v.savedBy?.name && (
                                    <span className="version-by">· {v.savedBy.name}</span>
                                )}
                            </div>
                            {v.title && (
                                <div className="version-title-preview" title={v.title}>
                                    📄 {v.title}
                                </div>
                            )}
                        </div>
                        <motion.button
                            className="version-restore-btn"
                            onClick={() => handleRestore(v._id)}
                            disabled={!!restoringId}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            title="Restore this version"
                        >
                            {restoringId === v._id ? (
                                <span className="btn-spinner" />
                            ) : (
                                <FiRotateCcw size={14} />
                            )}
                        </motion.button>
                    </motion.div>
                ))}
            </div>
        </motion.div>
    );
};

export default VersionHistory;
