import { motion } from 'framer-motion';
import { FiTrash2, FiEdit3, FiClock } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';

const DocumentCard = ({ doc, onDelete }) => {
    const navigate = useNavigate();

    const timeAgo = (dateStr) => {
        const diff = Date.now() - new Date(dateStr).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'Just now';
        if (mins < 60) return `${mins}m ago`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}h ago`;
        return `${Math.floor(hrs / 24)}d ago`;
    };

    return (
        <motion.div
            className="doc-card"
            whileHover={{ y: -4, scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            layout
        >
            <div className="doc-card-body" onClick={() => navigate(`/editor/${doc._id}`)}>
                <div className="doc-icon">📄</div>
                <h3 className="doc-title">{doc.title || 'Untitled Document'}</h3>
                <div className="doc-meta">
                    <FiClock size={12} />
                    <span>{timeAgo(doc.updatedAt)}</span>
                </div>
            </div>
            <div className="doc-card-footer">
                <button
                    className="card-btn edit-btn"
                    onClick={() => navigate(`/editor/${doc._id}`)}
                >
                    <FiEdit3 size={14} /> Open
                </button>
                <button
                    className="card-btn delete-btn"
                    onClick={(e) => { e.stopPropagation(); onDelete(doc._id); }}
                >
                    <FiTrash2 size={14} />
                </button>
            </div>
        </motion.div>
    );
};

export default DocumentCard;
