import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiSun, FiMoon, FiLogOut, FiFileText, FiUser } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const Navbar = () => {
    const { user, logout } = useAuth();
    const { isDark, toggleTheme } = useTheme();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    return (
        <motion.nav
            className="navbar"
            initial={{ y: -60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
        >
            <Link to={user ? '/dashboard' : '/'} className="navbar-brand">
                <FiFileText className="brand-icon" />
                <span>CollabEdit</span>
            </Link>

            <div className="navbar-actions">
                <motion.button
                    className="icon-btn"
                    onClick={toggleTheme}
                    whileHover={{ scale: 1.15, rotate: 20 }}
                    whileTap={{ scale: 0.9 }}
                    title="Toggle theme"
                >
                    {isDark ? <FiSun /> : <FiMoon />}
                </motion.button>

                {user ? (
                    <>
                        <div className="user-chip">
                            <FiUser />
                            <span>{user.name}</span>
                        </div>
                        <motion.button
                            className="icon-btn logout-btn"
                            onClick={handleLogout}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            title="Logout"
                        >
                            <FiLogOut />
                        </motion.button>
                    </>
                ) : (
                    <div className="nav-links">
                        <Link to="/login" className="nav-link">Login</Link>
                        <Link to="/register" className="btn-primary">Get Started</Link>
                    </div>
                )}
            </div>
        </motion.nav>
    );
};

export default Navbar;
