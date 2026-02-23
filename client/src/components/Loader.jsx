import { motion } from 'framer-motion';

const Loader = () => (
    <div className="loader-wrap">
        <motion.div
            className="loader-ring"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        />
    </div>
);

export default Loader;
