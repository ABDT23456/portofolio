const express = require('express');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { getDatabase } = require('../database');
const { verifyToken } = require('../middleware/auth');
const router = express.Router();

// Configure multer for image uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const fs = require('fs');
        const uploadDir = path.join(__dirname, '..', '..', 'uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `${uuidv4()}${ext}`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowed = /jpeg|jpg|png|gif|webp|svg/;
        const ext = allowed.test(path.extname(file.originalname).toLowerCase());
        const mime = allowed.test(file.mimetype);
        if (ext && mime) return cb(null, true);
        cb(new Error('Seules les images sont autorisées'));
    }
});

// Helper to query all rows
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

// Helper to query one row
function queryOne(db, sql, params = []) {
    const results = queryAll(db, sql, params);
    return results.length > 0 ? results[0] : null;
}

// Helper to run insert/update/delete
function runStmt(db, sql, params = []) {
    db.run(sql, params);
}

// GET /api/projects
router.get('/', (req, res) => {
    try {
        const db = getDatabase();
        const projects = queryAll(db, 'SELECT * FROM projects ORDER BY featured DESC, created_at DESC');
        const parsed = projects.map(p => ({
            ...p,
            tags: JSON.parse(p.tags || '[]')
        }));
        res.json(parsed);
    } catch (err) {
        res.status(500).json({ error: 'Erreur lors du chargement des projets' });
    }
});

// GET /api/projects/:id
router.get('/:id', (req, res) => {
    try {
        const db = getDatabase();
        const project = queryOne(db, 'SELECT * FROM projects WHERE id = ?', [req.params.id]);
        if (!project) return res.status(404).json({ error: 'Projet introuvable' });
        project.tags = JSON.parse(project.tags || '[]');
        res.json(project);
    } catch (err) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// POST /api/projects
router.post('/', verifyToken, upload.single('image'), (req, res) => {
    try {
        const { title, description, tags, github_url, featured } = req.body;
        if (!title || !description) {
            return res.status(400).json({ error: 'Titre et description requis' });
        }

        const db = getDatabase();
        const tagsJson = JSON.stringify(tags ? (Array.isArray(tags) ? tags : [tags]) : []);
        const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

        runStmt(db,
            'INSERT INTO projects (title, description, tags, image_url, github_url, featured) VALUES (?, ?, ?, ?, ?, ?)',
            [title, description, tagsJson, imageUrl, github_url || null, featured ? 1 : 0]
        );

        const project = queryOne(db, 'SELECT * FROM projects ORDER BY id DESC LIMIT 1');
        if (project) project.tags = JSON.parse(project.tags || '[]');
        res.status(201).json(project || {});
    } catch (err) {
        res.status(500).json({ error: 'Erreur lors de la création' });
    }
});

// PUT /api/projects/:id
router.put('/:id', verifyToken, upload.single('image'), (req, res) => {
    try {
        const db = getDatabase();
        const existing = queryOne(db, 'SELECT * FROM projects WHERE id = ?', [req.params.id]);
        if (!existing) return res.status(404).json({ error: 'Projet introuvable' });

        const { title, description, tags, github_url, featured } = req.body;
        const tagsJson = tags ? JSON.stringify(Array.isArray(tags) ? tags : [tags]) : existing.tags;
        const imageUrl = req.file ? `/uploads/${req.file.filename}` : existing.image_url;

        runStmt(db,
            'UPDATE projects SET title=?, description=?, tags=?, image_url=?, github_url=?, featured=?, updated_at=datetime(\'now\') WHERE id=?',
            [
                title || existing.title,
                description || existing.description,
                tagsJson,
                imageUrl,
                github_url !== undefined ? github_url : existing.github_url,
                featured !== undefined ? (featured ? 1 : 0) : existing.featured,
                req.params.id
            ]
        );

        const updated = queryOne(db, 'SELECT * FROM projects WHERE id = ?', [req.params.id]);
        if (updated) updated.tags = JSON.parse(updated.tags || '[]');
        res.json(updated || {});
    } catch (err) {
        res.status(500).json({ error: 'Erreur lors de la mise à jour' });
    }
});

// DELETE /api/projects/:id
router.delete('/:id', verifyToken, (req, res) => {
    try {
        const db = getDatabase();
        const project = queryOne(db, 'SELECT * FROM projects WHERE id = ?', [req.params.id]);
        if (!project) return res.status(404).json({ error: 'Projet introuvable' });

        runStmt(db, 'DELETE FROM projects WHERE id = ?', [req.params.id]);

        if (project.image_url) {
            const filePath = path.join(__dirname, '..', '..', project.image_url);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }

        res.json({ message: 'Projet supprimé' });
    } catch (err) {
        res.status(500).json({ error: 'Erreur lors de la suppression' });
    }
});

// POST /api/projects/:id/click
router.post('/:id/click', (req, res) => {
    try {
        const db = getDatabase();
        const { type } = req.body;
        runStmt(db, 'INSERT INTO project_clicks (project_id, type) VALUES (?, ?)', [req.params.id, type || 'github']);
        res.json({ message: 'Click tracked' });
    } catch (err) {
        res.status(200).json({ message: 'ok' });
    }
});

module.exports = router;