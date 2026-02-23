const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const Document = require('../models/Document');
const { protect } = require('../middleware/auth');

// @route GET /api/documents
router.get('/', protect, async (req, res) => {
    try {
        const documents = await Document.find({
            $or: [{ owner: req.user._id }, { collaborators: req.user._id }],
        })
            .sort({ updatedAt: -1 })
            .populate('owner', 'name email');
        res.json(documents);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @route POST /api/documents
router.post('/', protect, async (req, res) => {
    try {
        const { title } = req.body;
        const document = await Document.create({
            _id: uuidv4(),
            title: title || 'Untitled Document',
            content: { ops: [] },
            owner: req.user._id,
        });
        res.status(201).json(document);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @route GET /api/documents/:id
router.get('/:id', protect, async (req, res) => {
    try {
        const document = await Document.findById(req.params.id).populate(
            'owner',
            'name email'
        );
        if (!document) {
            return res.status(404).json({ message: 'Document not found' });
        }
        const isOwner = document.owner._id.toString() === req.user._id.toString();
        const isCollaborator = document.collaborators
            .map((c) => c.toString())
            .includes(req.user._id.toString());

        if (!isOwner && !isCollaborator) {
            return res.status(403).json({ message: 'Access denied' });
        }

        res.json(document);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @route PATCH /api/documents/:id
router.patch('/:id', protect, async (req, res) => {
    try {
        const document = await Document.findById(req.params.id);
        if (!document) {
            return res.status(404).json({ message: 'Document not found' });
        }
        if (req.body.title !== undefined) document.title = req.body.title;
        if (req.body.content !== undefined) document.content = req.body.content;
        await document.save();
        res.json(document);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @route DELETE /api/documents/:id
router.delete('/:id', protect, async (req, res) => {
    try {
        const document = await Document.findById(req.params.id);
        if (!document) {
            return res.status(404).json({ message: 'Document not found' });
        }
        if (document.owner.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Only owner can delete' });
        }
        await Document.deleteOne({ _id: req.params.id });
        res.json({ message: 'Document deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
