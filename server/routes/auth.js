const express = require('express');
const bcrypt = require('bcryptjs');
const { getDatabase } = require('../database');
const { generateToken, verifyToken } = require('../middleware/auth');
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

// POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ error: 'Identifiants requis' });
        }

        const db = getDatabase();
        const admin = queryOne(db, 'SELECT * FROM admin WHERE username = ?', [username]);

        if (!admin) {
            return res.status(401).json({ error: 'Identifiants incorrects' });
        }

        const valid = await bcrypt.compare(password, admin.password);
        if (!valid) {
            return res.status(401).json({ error: 'Identifiants incorrects' });
        }

        const token = generateToken(admin.id);
        res.json({ token, username: admin.username });
    } catch (err) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// GET /api/auth/verify
router.get('/verify', verifyToken, (req, res) => {
    const db = getDatabase();
    const admin = queryOne(db, 'SELECT id, username, email FROM admin WHERE id = ?', [req.adminId]);
    if (!admin) {
        return res.status(404).json({ error: 'Admin non trouvé' });
    }
    res.json(admin);
});

// PUT /api/auth/password
router.put('/password', verifyToken, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Tous les champs sont requis' });
        }

        const db = getDatabase();
        const admin = queryOne(db, 'SELECT * FROM admin WHERE id = ?', [req.adminId]);

        const valid = await bcrypt.compare(currentPassword, admin.password);
        if (!valid) {
            return res.status(401).json({ error: 'Mot de passe actuel incorrect' });
        }

        const hashed = await bcrypt.hash(newPassword, 10);
        runStmt(db, 'UPDATE admin SET password = ? WHERE id = ?', [hashed, req.adminId]);

        res.json({ message: 'Mot de passe mis à jour' });
    } catch (err) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

module.exports = router;