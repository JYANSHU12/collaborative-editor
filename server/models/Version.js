const mongoose = require('mongoose');

const versionSchema = new mongoose.Schema(
    {
        documentId: { type: String, ref: 'Document', required: true },
        content: { type: Object, required: true },
        title: { type: String },
        savedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        label: { type: String, default: 'Auto-save' },
    },
    { timestamps: true }
);

module.exports = mongoose.model('Version', versionSchema);
