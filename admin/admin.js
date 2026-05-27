'use strict';

const API_BASE = '';

// =============================================
// STATE
// =============================================
let state = {
    token: localStorage.getItem('token') || null,
    username: localStorage.getItem('username') || 'Admin',
    currentView: 'dashboard',
    projects: [],
    messages: [],
    editingProject: null
};

// =============================================
// DOM REFS
// =============================================
const $ = (id) => document.getElementById(id);
const loginScreen = $('loginScreen');
const dashboardScreen = $('dashboardScreen');
const loginForm = $('loginForm');
const loginError = $('loginError');
const contentArea = $('contentArea');
const viewTitle = $('viewTitle');
const adminName = $('adminName');
const logoutBtn = $('logoutBtn');
const sidebarToggle = $('sidebarToggle');

// =============================================
// API HELPER
// =============================================
async function api(method, path, body = null, formData = false) {
    const headers = {};
    if (state.token) {
        headers['Authorization'] = `Bearer ${state.token}`;
    }
    if (!formData) {
        headers['Content-Type'] = 'application/json';
    }

    const opts = {
        method,
        headers,
        body: formData ? body : (body ? JSON.stringify(body) : undefined)
    };

    const res = await fetch(`${API_BASE}${path}`, opts);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erreur serveur');
    return data;
}

// =============================================
// AUTH
// =============================================
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginError.textContent = '';

    const username = $('loginUsername').value.trim();
    const password = $('loginPassword').value.trim();

    if (!username || !password) {
        loginError.textContent = 'Veuillez remplir tous les champs.';
        return;
    }

    try {
        const data = await api('POST', '/api/auth/login', { username, password });
        state.token = data.token;
        state.username = data.username;
        localStorage.setItem('token', data.token);
        localStorage.setItem('username', data.username);
        showDashboard();
    } catch (err) {
        loginError.textContent = err.message || 'Identifiants incorrects.';
    }
});

logoutBtn.addEventListener('click', () => {
    state.token = null;
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    dashboardScreen.style.display = 'none';
    loginScreen.style.display = 'flex';
    loginForm.reset();
    loginError.textContent = '';
});

// =============================================
// CHECK AUTH ON LOAD
// =============================================
async function checkAuth() {
    if (!state.token) return false;
    try {
        await api('GET', '/api/auth/verify');
        return true;
    } catch {
        state.token = null;
        localStorage.removeItem('token');
        return false;
    }
}

async function showDashboard() {
    loginScreen.style.display = 'none';
    dashboardScreen.style.display = 'flex';
    adminName.textContent = state.username;
    navigateTo(state.currentView);
}

// =============================================
// NAVIGATION
// =============================================
function navigateTo(view) {
    state.currentView = view;
    document.querySelectorAll('.nav-item[data-view]').forEach(el => {
        el.classList.toggle('active', el.dataset.view === view);
    });

    const titles = {
        dashboard: 'Tableau de bord',
        projects: 'Projets',
        messages: 'Messages',
        analytics: 'Analytics',
        settings: 'Paramètres'
    };
    viewTitle.textContent = titles[view] || 'Tableau de bord';

    switch (view) {
        case 'dashboard': renderDashboard(); break;
        case 'projects': renderProjects(); break;
        case 'messages': renderMessages(); break;
        case 'analytics': renderAnalytics(); break;
        case 'settings': renderSettings(); break;
    }
}

document.querySelectorAll('.nav-item[data-view]').forEach(el => {
    el.addEventListener('click', (e) => {
        e.preventDefault();
        navigateTo(el.dataset.view);
        // Close sidebar on mobile
        document.querySelector('.sidebar').classList.remove('open');
    });
});

sidebarToggle.addEventListener('click', () => {
    document.querySelector('.sidebar').classList.toggle('open');
});

// =============================================
// DASHBOARD
// =============================================
async function renderDashboard() {
    contentArea.innerHTML = '<div style="text-align:center;padding:40px"><i class="fas fa-spinner fa-spin fa-2x"></i></div>';

    try {
        const [stats, messagesData] = await Promise.all([
            api('GET', '/api/analytics/stats'),
            api('GET', '/api/messages?limit=5')
        ]);

        contentArea.innerHTML = `
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-icon blue"><i class="fas fa-eye"></i></div>
                    <div class="stat-info">
                        <h3>${stats.totalVisits}</h3>
                        <p>Visites totales</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon green"><i class="fas fa-users"></i></div>
                    <div class="stat-info">
                        <h3>${stats.uniqueVisitors}</h3>
                        <p>Visiteurs uniques</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon yellow"><i class="fas fa-folder"></i></div>
                    <div class="stat-info">
                        <h3>${stats.totalProjects}</h3>
                        <p>Projets</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon red"><i class="fas fa-envelope"></i></div>
                    <div class="stat-info">
                        <h3>${stats.unreadMessages}</h3>
                        <p>Messages non lus</p>
                    </div>
                </div>
            </div>

            <div class="chart-grid">
                <div class="chart-container">
                    <h3><i class="fas fa-calendar-day"></i> Visites (14 derniers jours)</h3>
                    <div class="bar-chart" id="visitsChart">
                        ${renderBarChart(stats.visitsPerDay)}
                    </div>
                </div>
                <div class="chart-container">
                    <h3><i class="fas fa-file-alt"></i> Pages les plus visitées</h3>
                    <div class="bar-chart" id="pagesChart">
                        ${renderBarChart(stats.visitsPerPage)}
                    </div>
                </div>
            </div>

            <div class="chart-container">
                <h3><i class="fas fa-envelope"></i> Derniers messages</h3>
                ${messagesData.messages.length === 0 ? `
                    <div class="empty-state">
                        <i class="fas fa-inbox"></i>
                        <p>Aucun message pour le moment.</p>
                    </div>
                ` : `
                <table>
                    <thead>
                        <tr>
                            <th>Nom</th>
                            <th>Sujet</th>
                            <th>Date</th>
                            <th>Statut</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${messagesData.messages.map(m => `
                            <tr>
                                <td>${m.name}</td>
                                <td>${m.subject}</td>
                                <td>${formatDate(m.created_at)}</td>
                                <td><span class="status-badge ${m.read ? 'read' : 'unread'}">${m.read ? 'Lu' : 'Non lu'}</span></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                `}
            </div>
        `;
    } catch (err) {
        contentArea.innerHTML = `<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><h3>Erreur</h3><p>${err.message}</p></div>`;
    }
}

function renderBarChart(data) {
    if (!data || data.length === 0) {
        return '<p style="color:var(--text-muted);font-size:0.9rem;">Aucune donnée</p>';
    }
    const max = Math.max(...data.map(d => d.count), 1);
    return data.map(d => {
        const pct = Math.max((d.count / max) * 100, 8);
        return `
            <div class="bar-item">
                <span class="bar-label">${d.date || d.page || d.label}</span>
                <div class="bar-track">
                    <div class="bar-fill" style="width:${pct}%">${d.count}</div>
                </div>
            </div>
        `;
    }).join('');
}

// =============================================
// PROJECTS
// =============================================
async function renderProjects() {
    contentArea.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
            <h3 style="font-size:1rem;font-weight:600;">Gestion des projets</h3>
            <button class="btn btn-primary" onclick="showProjectForm()"><i class="fas fa-plus"></i> Nouveau projet</button>
        </div>
        <div id="projectList"><div style="text-align:center;padding:40px"><i class="fas fa-spinner fa-spin fa-2x"></i></div></div>
    `;

    try {
        const projects = await api('GET', '/api/projects');
        state.projects = projects;
        const list = $('projectList');

        if (projects.length === 0) {
            list.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-folder-open"></i>
                    <h3>Aucun projet</h3>
                    <p>Créez votre premier projet en cliquant sur "Nouveau projet".</p>
                </div>
            `;
            return;
        }

        list.innerHTML = `
            <div class="project-admin-grid">
                ${projects.map(p => `
                    <div class="project-admin-card">
                        <div class="card-image">
                            <img src="${p.image_url || 'https://placehold.co/600x400/1e293b/6364ff?text=' + encodeURIComponent(p.title)}" alt="${p.title}" />
                        </div>
                        <div class="card-body">
                            <h4>${p.title}</h4>
                            <p>${p.description.substring(0, 80)}${p.description.length > 80 ? '...' : ''}</p>
                            <div class="card-tags">
                                ${(p.tags || []).map(t => `<span>${t}</span>`).join('')}
                            </div>
                            <div class="card-actions">
                                <button class="btn-icon" onclick="editProject(${p.id})" title="Modifier"><i class="fas fa-edit"></i></button>
                                <button class="btn-icon danger" onclick="deleteProject(${p.id})" title="Supprimer"><i class="fas fa-trash"></i></button>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    } catch (err) {
        $('projectList').innerHTML = `<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><h3>Erreur</h3><p>${err.message}</p></div>`;
    }
}

let projectFormShown = false;

function showProjectForm(project = null) {
    state.editingProject = project;
    projectFormShown = true;

    const isEdit = project !== null;
    contentArea.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
            <h3 style="font-size:1rem;font-weight:600;">${isEdit ? 'Modifier' : 'Nouveau'} projet</h3>
            <button class="btn btn-secondary" onclick="renderProjects()"><i class="fas fa-arrow-left"></i> Retour</button>
        </div>
        <div class="form-card">
            <form id="projectForm">
                <div class="form-group">
                    <label for="projectTitle">Titre *</label>
                    <input type="text" id="projectTitle" value="${isEdit ? project.title : ''}" required />
                </div>
                <div class="form-group">
                    <label for="projectDesc">Description *</label>
                    <textarea id="projectDesc" required>${isEdit ? project.description : ''}</textarea>
                </div>
                <div class="form-group">
                    <label for="projectTags">Tags (séparés par des virgules)</label>
                    <input type="text" id="projectTags" value="${isEdit ? (project.tags || []).join(', ') : ''}" placeholder="React, Node.js, PostgreSQL" />
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label for="projectGithub">URL GitHub</label>
                        <input type="url" id="projectGithub" value="${isEdit ? (project.github_url || '') : ''}" placeholder="https://github.com/..." />
                    </div>
                    <div class="form-group">
                        <label for="projectFeatured">
                            <input type="checkbox" id="projectFeatured" ${isEdit && project.featured ? 'checked' : ''} />
                            Projet à la une
                        </label>
                    </div>
                </div>
                <div class="form-group">
                    <label for="projectImage">Image (optionnelle)</label>
                    <input type="file" id="projectImage" accept="image/*" />
                    ${isEdit && project.image_url ? `<p style="font-size:0.8rem;color:var(--text-muted);margin-top:4px;">Image actuelle: ${project.image_url}</p>` : ''}
                </div>
                <div class="form-actions">
                    <button type="submit" class="btn btn-primary">
                        <i class="fas fa-save"></i> ${isEdit ? 'Mettre à jour' : 'Créer le projet'}
                    </button>
                    <button type="button" class="btn btn-secondary" onclick="renderProjects()">Annuler</button>
                </div>
            </form>
        </div>
    `;

    $('projectForm').addEventListener('submit', handleProjectSubmit);
}

async function handleProjectSubmit(e) {
    e.preventDefault();
    const isEdit = state.editingProject !== null;
    const formData = new FormData();
    formData.append('title', $('projectTitle').value.trim());
    formData.append('description', $('projectDesc').value.trim());
    formData.append('tags', ($('projectTags').value || '').split(',').map(t => t.trim()).filter(Boolean));
    formData.append('github_url', $('projectGithub').value.trim());
    formData.append('featured', $('projectFeatured').checked ? '1' : '0');

    const fileInput = $('projectImage');
    if (fileInput.files[0]) {
        formData.append('image', fileInput.files[0]);
    }

    const submitBtn = e.target.querySelector('.btn-primary');
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enregistrement...';
    submitBtn.disabled = true;

    try {
        if (isEdit) {
            await api('PUT', `/api/projects/${state.editingProject.id}`, formData, true);
        } else {
            await api('POST', '/api/projects', formData, true);
        }
        renderProjects();
    } catch (err) {
        alert(err.message);
        submitBtn.innerHTML = '<i class="fas fa-save"></i> ' + (isEdit ? 'Mettre à jour' : 'Créer le projet');
        submitBtn.disabled = false;
    }
}

async function editProject(id) {
    try {
        const project = state.projects.find(p => p.id === id);
        if (project) showProjectForm(project);
    } catch (err) {
        alert(err.message);
    }
}

async function deleteProject(id) {
    if (!confirm('Supprimer ce projet ? Cette action est irréversible.')) return;

    try {
        await api('DELETE', `/api/projects/${id}`);
        renderProjects();
    } catch (err) {
        alert(err.message);
    }
}

// =============================================
// MESSAGES
// =============================================
async function renderMessages() {
    contentArea.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
            <h3 style="font-size:1rem;font-weight:600;">Messages reçus</h3>
            <button class="btn btn-secondary" onclick="refreshMessages()"><i class="fas fa-sync"></i> Actualiser</button>
        </div>
        <div id="messagesList"><div style="text-align:center;padding:40px"><i class="fas fa-spinner fa-spin fa-2x"></i></div></div>
    `;
    await refreshMessages();
}

async function refreshMessages() {
    try {
        const data = await api('GET', '/api/messages');
        state.messages = data.messages;
        const list = $('messagesList');

        if (data.messages.length === 0) {
            list.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-inbox"></i>
                    <h3>Aucun message</h3>
                    <p>Les messages de votre formulaire de contact apparaîtront ici.</p>
                </div>
            `;
            return;
        }

        list.innerHTML = `
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Nom</th>
                            <th>Email</th>
                            <th>Sujet</th>
                            <th>Message</th>
                            <th>Date</th>
                            <th>Statut</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.messages.map(m => `
                            <tr>
                                <td><strong>${m.name}</strong></td>
                                <td>${m.email}</td>
                                <td>${m.subject}</td>
                                <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${m.message}</td>
                                <td>${formatDate(m.created_at)}</td>
                                <td><span class="status-badge ${m.read ? 'read' : 'unread'}">${m.read ? 'Lu' : 'Non lu'}</span></td>
                                <td>
                                    <div class="table-actions">
                                        ${!m.read ? `<button class="btn-icon" onclick="markRead(${m.id})" title="Marquer comme lu"><i class="fas fa-check"></i></button>` : ''}
                                        <button class="btn-icon danger" onclick="deleteMessage(${m.id})" title="Supprimer"><i class="fas fa-trash"></i></button>
                                    </div>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            ${data.totalPages > 1 ? `<div style="margin-top:16px;text-align:center;font-size:0.85rem;color:var(--text-muted);">Page ${data.page} / ${data.totalPages}</div>` : ''}
        `;
        updateUnreadBadge();
    } catch (err) {
        $('messagesList').innerHTML = `<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><h3>Erreur</h3><p>${err.message}</p></div>`;
    }
}

async function markRead(id) {
    try {
        await api('PUT', `/api/messages/${id}/read`);
        refreshMessages();
    } catch (err) {
        alert(err.message);
    }
}

async function deleteMessage(id) {
    if (!confirm('Supprimer ce message ?')) return;
    try {
        await api('DELETE', `/api/messages/${id}`);
        refreshMessages();
    } catch (err) {
        alert(err.message);
    }
}

async function updateUnreadBadge() {
    try {
        const data = await api('GET', '/api/messages/unread-count');
        const badge = $('unreadBadge');
        if (data.count > 0) {
            badge.textContent = data.count;
            badge.style.display = 'inline';
        } else {
            badge.style.display = 'none';
        }
    } catch {}
}

// =============================================
// ANALYTICS
// =============================================
async function renderAnalytics() {
    contentArea.innerHTML = '<div style="text-align:center;padding:40px"><i class="fas fa-spinner fa-spin fa-2x"></i></div>';

    try {
        const stats = await api('GET', '/api/analytics/stats');

        contentArea.innerHTML = `
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-icon blue"><i class="fas fa-eye"></i></div>
                    <div class="stat-info">
                        <h3>${stats.totalVisits}</h3>
                        <p>Visites totales</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon green"><i class="fas fa-users"></i></div>
                    <div class="stat-info">
                        <h3>${stats.uniqueVisitors}</h3>
                        <p>Visiteurs uniques</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon yellow"><i class="fas fa-envelope"></i></div>
                    <div class="stat-info">
                        <h3>${stats.totalMessages}</h3>
                        <p>Messages totaux</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon red"><i class="fas fa-folder"></i></div>
                    <div class="stat-info">
                        <h3>${stats.totalProjects}</h3>
                        <p>Projets</p>
                    </div>
                </div>
            </div>

            <div class="chart-grid">
                <div class="chart-container">
                    <h3><i class="fas fa-calendar-day"></i> Visites par jour (14 jours)</h3>
                    <div class="bar-chart">
                        ${renderBarChart(stats.visitsPerDay)}
                    </div>
                </div>
                <div class="chart-container">
                    <h3><i class="fas fa-file-alt"></i> Pages visitées</h3>
                    <div class="bar-chart">
                        ${renderBarChart(stats.visitsPerPage)}
                    </div>
                </div>
            </div>

            <div class="chart-grid">
                <div class="chart-container">
                    <h3><i class="fas fa-link"></i> Clics sur les projets</h3>
                    <div class="bar-chart">
                        ${stats.projectClicks.length === 0 ? '<p style="color:var(--text-muted);font-size:0.9rem;">Aucun clic pour le moment</p>' : renderBarChart(stats.projectClicks.map(c => ({ label: `${c.projectTitle} (${c.type})`, count: c.count })))}
                    </div>
                </div>
                <div class="chart-container">
                    <h3><i class="fas fa-envelope"></i> Messages par jour (14 jours)</h3>
                    <div class="bar-chart">
                        ${renderBarChart(stats.messagesPerDay)}
                    </div>
                </div>
            </div>
        `;
    } catch (err) {
        contentArea.innerHTML = `<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><h3>Erreur</h3><p>${err.message}</p></div>`;
    }
}

// =============================================
// SETTINGS
// =============================================
function renderSettings() {
    contentArea.innerHTML = `
        <h3 style="font-size:1rem;font-weight:600;margin-bottom:24px;">Paramètres</h3>
        <div class="form-card">
            <h3>Changer le mot de passe</h3>
            <form id="passwordForm">
                <div class="form-group">
                    <label for="currentPassword">Mot de passe actuel</label>
                    <input type="password" id="currentPassword" required />
                </div>
                <div class="form-group">
                    <label for="newPassword">Nouveau mot de passe</label>
                    <input type="password" id="newPassword" required minlength="6" />
                </div>
                <div class="form-actions">
                    <button type="submit" class="btn btn-primary"><i class="fas fa-key"></i> Mettre à jour</button>
                </div>
                <p id="passwordFeedback" style="margin-top:12px;font-size:0.85rem;"></p>
            </form>
        </div>

        <div class="form-card">
            <h3>Informations</h3>
            <p style="color:var(--text-muted);font-size:0.9rem;">
                <strong>Identifiant :</strong> ${state.username}<br/>
                <strong>Dashboard :</strong> <a href="/admin" style="color:var(--primary-light);">/admin</a><br/>
                <strong>API :</strong> <code style="background:var(--bg);padding:2px 6px;border-radius:4px;">/api/*</code>
            </p>
        </div>
    `;

    $('passwordForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const feedback = $('passwordFeedback');
        const current = $('currentPassword').value;
        const newPass = $('newPassword').value;

        if (newPass.length < 6) {
            feedback.textContent = 'Le mot de passe doit faire au moins 6 caractères.';
            feedback.style.color = 'var(--danger)';
            return;
        }

        try {
            await api('PUT', '/api/auth/password', { currentPassword: current, newPassword: newPass });
            feedback.textContent = 'Mot de passe mis à jour avec succès !';
            feedback.style.color = 'var(--success)';
            $('passwordForm').reset();
        } catch (err) {
            feedback.textContent = err.message;
            feedback.style.color = 'var(--danger)';
        }
    });
}

// =============================================
// HELPERS
// =============================================
function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'Z');
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// =============================================
// INIT
// =============================================
async function init() {
    const authenticated = await checkAuth();
    if (authenticated) {
        showDashboard();
    } else {
        loginScreen.style.display = 'flex';
        dashboardScreen.style.display = 'none';
    }
}

init();