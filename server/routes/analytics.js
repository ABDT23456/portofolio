const express = require('express');
const path = require('path');
const fs = require('fs');
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
// POST /api/analytics/visit - Public: track page visit
router.post('/visit', (req, res) => {
    try {
        const db = getDatabase();
        const { page, referrer } = req.body;
        const userAgent = req.headers['user-agent'] || '';
        const ip = req.ip || req.connection.remoteAddress || '';

        runStmt(db,
            'INSERT INTO page_visits (page, referrer, user_agent, ip) VALUES (?, ?, ?, ?)',
            [page || '/', referrer || '', userAgent, ip]
        );

        res.json({ message: 'Visit tracked' });
    } catch (err) {
        res.status(200).json({ message: 'ok' });
    }
});

// GET /api/analytics/stats - Admin: get analytics dashboard data
router.get('/stats', verifyToken, (req, res) => {
    try {
        const db = getDatabase();

        const totalVisits = queryOne(db, 'SELECT COUNT(*) as count FROM page_visits');
        const uniqueVisitors = queryOne(db, 'SELECT COUNT(DISTINCT ip) as count FROM page_visits');
        const totalMessages = queryOne(db, 'SELECT COUNT(*) as count FROM messages');
        const unreadMessages = queryOne(db, "SELECT COUNT(*) as count FROM messages WHERE read = 0");
        const totalProjects = queryOne(db, 'SELECT COUNT(*) as count FROM projects');

        const visitsPerDay = queryAll(db, `
            SELECT DATE(created_at) as date, COUNT(*) as count
            FROM page_visits
            WHERE created_at >= DATE('now', '-14 days')
            GROUP BY DATE(created_at)
            ORDER BY date ASC
        `);

        const visitsPerPage = queryAll(db, `
            SELECT page, COUNT(*) as count
            FROM page_visits
            GROUP BY page
            ORDER BY count DESC
        `);

        const projectClicks = queryAll(db, `
            SELECT pc.type, COUNT(*) as count, p.title as projectTitle
            FROM project_clicks pc
            JOIN projects p ON p.id = pc.project_id
            GROUP BY pc.project_id, pc.type
            ORDER BY count DESC
        `);

        const submissionsPerDay = queryAll(db, `
            SELECT DATE(created_at) as date, COUNT(*) as count
            FROM contact_submissions
            WHERE created_at >= DATE('now', '-14 days')
            GROUP BY DATE(created_at)
            ORDER BY date ASC
        `);

        const messagesPerDay = queryAll(db, `
            SELECT DATE(created_at) as date, COUNT(*) as count
            FROM messages
            WHERE created_at >= DATE('now', '-14 days')
            GROUP BY DATE(created_at)
            ORDER BY date ASC
        `);

        res.json({
            totalVisits: totalVisits ? totalVisits.count : 0,
            uniqueVisitors: uniqueVisitors ? uniqueVisitors.count : 0,
            totalMessages: totalMessages ? totalMessages.count : 0,
            unreadMessages: unreadMessages ? unreadMessages.count : 0,
            totalProjects: totalProjects ? totalProjects.count : 0,
            visitsPerDay,
            visitsPerPage,
            projectClicks,
            submissionsPerDay,
            messagesPerDay
        });
    } catch (err) {
        res.status(500).json({ error: 'Erreur lors du chargement des statistiques' });
    }
});

// GET /api/analytics/recent-visits - Admin: get recent visits
router.get('/recent-visits', verifyToken, (req, res) => {
    try {
        const db = getDatabase();
        const visits = queryAll(db, 'SELECT * FROM page_visits ORDER BY created_at DESC LIMIT 50');
        res.json(visits);
    } catch (err) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

module.exports = router;