const express = require('express');
const { getDatabase } = require('../database');
const { verifyToken } = require('../middleware/auth');
const router = express.Router();

// Helper helpers
function queryAll(db, sql, params = []) {
    const stmt = db.prepare(sql);
    stmt.bind(params);
    const results = [];
    while (stmt.step()) {
        results.push(stmt.getAsObject());
    }
    stmt.free();
    return results;
}

function queryOne(db, sql, params = []) {
    const results = queryAll(db, sql, params);
    return results.length > 0 ? results[0] : null;
}

function runStmt(db, sql, params = []) {
    db.run(sql, params);
}

// POST /api/messages - Public: submit contact message
router.post('/', (req, res) => {
    try {
        const { name, email, subject, message } = req.body;
        if (!name || !email || !subject || !message) {
            return res.status(400).json({ error: 'Tous les champs sont requis' });
        }

        const db = getDatabase();
        runStmt(db,
            'INSERT INTO messages (name, email, subject, message) VALUES (?, ?, ?, ?)',
            [name, email, subject, message]
        );

        // Get last inserted id
        const last = queryOne(db, 'SELECT MAX(id) as maxId FROM messages');
        if (last && last.maxId) {
            runStmt(db, 'INSERT INTO contact_submissions (message_id) VALUES (?)', [last.maxId]);
        }

        // Save DB to disk
        const fs = require('fs');
        const data = db.export();
        const buffer = Buffer.from(data);
        fs.writeFileSync(require('path').join(__dirname, '..', '..', 'data', 'portfolio.db'), buffer);

        res.status(201).json({ message: 'Message envoyé avec succès' });
    } catch (err) {
        res.status(500).json({ error: 'Erreur lors de l\'envoi du message' });
    }
});

// GET /api/messages - Admin: list all messages
router.get('/', verifyToken, (req, res) => {
    try {
        const db = getDatabase();
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;

        const countResult = queryOne(db, 'SELECT COUNT(*) as count FROM messages');
        const total = countResult ? countResult.count : 0;
        const messages = queryAll(db, 'SELECT * FROM messages ORDER BY created_at DESC LIMIT ? OFFSET ?', [limit, offset]);

        res.json({ messages, total, page, totalPages: Math.ceil(total / limit) });
    } catch (err) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// GET /api/messages/unread-count
router.get('/unread-count', verifyToken, (req, res) => {
    try {
        const db = getDatabase();
        const result = queryOne(db, "SELECT COUNT(*) as count FROM messages WHERE read = 0");
        res.json({ count: result ? result.count : 0 });
    } catch (err) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// PUT /api/messages/:id/read
router.put('/:id/read', verifyToken, (req, res) => {
    try {
        const db = getDatabase();
        runStmt(db, 'UPDATE messages SET read = 1 WHERE id = ?', [req.params.id]);
        // Save
        const fs = require('fs');
        const data = db.export();
        fs.writeFileSync(require('path').join(__dirname, '..', '..', 'data', 'portfolio.db'), Buffer.from(data));
        res.json({ message: 'Message marqué comme lu' });
    } catch (err) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// DELETE /api/messages/:id
router.delete('/:id', verifyToken, (req, res) => {
    try {
        const db = getDatabase();
        runStmt(db, 'DELETE FROM messages WHERE id = ?', [req.params.id]);
        // Save
        const fs = require('fs');
        const data = db.export();
        fs.writeFileSync(require('path').join(__dirname, '..', '..', 'data', 'portfolio.db'), Buffer.from(data));
        res.json({ message: 'Message supprimé' });
    } catch (err) {
        res.status(500).json({ error: 'Erreur lors de la suppression' });
    }
});

module.exports = router;