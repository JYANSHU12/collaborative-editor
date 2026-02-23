import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { FiZap, FiUsers, FiSave, FiLock } from 'react-icons/fi';
import Navbar from '../components/Navbar';

const features = [
    { icon: <FiZap />, title: 'Real-Time Sync', desc: 'See changes from collaborators instantly as they type.' },
    { icon: <FiUsers />, title: 'Multi-User', desc: 'Invite teammates and collaborate simultaneously.' },
    { icon: <FiSave />, title: 'Auto-Save', desc: 'Your work is automatically saved every 2 seconds.' },
    { icon: <FiLock />, title: 'Secure', desc: 'JWT-based auth keeps your documents private & safe.' },
];

const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.15 } },
};
const itemVariants = {
    hidden: { y: 30, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { duration: 0.5, ease: 'easeOut' } },
};

const LandingPage = () => (
    <div className="landing">
        <Navbar />
        <motion.main
            className="landing-hero"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >
            <motion.div className="hero-badge" variants={itemVariants}>
                ✨ Real-Time Collaboration
            </motion.div>
            <motion.h1 className="hero-title" variants={itemVariants}>
                Write Together,<br />
                <span className="gradient-text">Anywhere, Anytime</span>
            </motion.h1>
            <motion.p className="hero-sub" variants={itemVariants}>
                A powerful Google Docs alternative built with the MERN stack.
                Collaborate in real-time with your team — no lag, no conflicts.
            </motion.p>
            <motion.div className="hero-cta" variants={itemVariants}>
                <Link to="/register" className="btn-primary btn-lg">
                    Start Writing Free
                </Link>
                <Link to="/login" className="btn-outline btn-lg">
                    Sign In
                </Link>
            </motion.div>

            <motion.div className="hero-preview" variants={itemVariants}>
                <div className="preview-window">
                    <div className="preview-bar">
                        <span className="dot red" />
                        <span className="dot yellow" />
                        <span className="dot green" />
                        <span className="preview-title">Untitled Document</span>
                    </div>
                    <div className="preview-body">
                        <div className="preview-line full" />
                        <div className="preview-line mid" />
                        <div className="preview-cursor-line">
                            <div className="preview-line short" />
                            <span className="preview-cursor" />
                        </div>
                        <div className="preview-line full mt" />
                        <div className="preview-line three-quarters" />
                    </div>
                    <div className="collab-avatars">
                        <span className="avatar av1">A</span>
                        <span className="avatar av2">B</span>
                        <span className="avatar av3">C</span>
                        <span className="collab-label">3 editing now</span>
                    </div>
                </div>
            </motion.div>
        </motion.main>

        <motion.section
            className="features"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
        >
            <motion.h2 variants={itemVariants} className="section-title">
                Everything you need to <span className="gradient-text">collaborate</span>
            </motion.h2>
            <div className="features-grid">
                {features.map((f, i) => (
                    <motion.div key={i} className="feature-card" variants={itemVariants} whileHover={{ scale: 1.03 }}>
                        <div className="feature-icon">{f.icon}</div>
                        <h3>{f.title}</h3>
                        <p>{f.desc}</p>
                    </motion.div>
                ))}
            </div>
        </motion.section>

        <motion.section
            className="cta-section"
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
        >
            <h2>Ready to start collaborating?</h2>
            <Link to="/register" className="btn-primary btn-lg">Create Free Account</Link>
        </motion.section>

        <footer className="footer">
            <p>© 2024 CollabEdit · Built with MERN Stack</p>
        </footer>
    </div>
);

export default LandingPage;
