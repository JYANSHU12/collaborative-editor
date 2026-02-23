const express = require('express');
const router = express.Router();
const Version = require('../models/Version');
const Document = require('../models/Document');
const { protect } = require('../middleware/auth');

// GET all versions for a document
router.get('/:docId', protect, async (req, res) => {
    try {
        const versions = await Version.find({ documentId: req.params.docId })
            .sort({ createdAt: -1 })
            .limit(20)
            .populate('savedBy', 'name');
        res.json(versions);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// POST create a version snapshot
router.post('/:docId', protect, async (req, res) => {
    try {
        const doc = await Document.findById(req.params.docId);
        if (!doc) return res.status(404).json({ message: 'Document not found' });
        const version = await Version.create({
            documentId: req.params.docId,
            content: doc.content,
            title: doc.title,
            savedBy: req.user._id,
            label: req.body.label || 'Manual save',
        });
        // Keep only last 20 versions
        const all = await Version.find({ documentId: req.params.docId }).sort({ createdAt: -1 });
        if (all.length > 20) {
            const toDelete = all.slice(20).map(v => v._id);
            await Version.deleteMany({ _id: { $in: toDelete } });
        }
        res.status(201).json(version);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// POST restore a version
router.post('/:docId/restore/:versionId', protect, async (req, res) => {
    try {
        const version = await Version.findById(req.params.versionId);
        if (!version) return res.status(404).json({ message: 'Version not found' });
        await Document.findByIdAndUpdate(req.params.docId, {
            content: version.content,
            title: version.title,
        });
        res.json({ message: 'Restored successfully', content: version.content, title: version.title });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
