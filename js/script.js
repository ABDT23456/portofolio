'use strict';

const API_BASE = '';

document.addEventListener('DOMContentLoaded', () => {

    // =============================================
    // TRACK PAGE VISIT
    // =============================================
    function trackVisit() {
        fetch(`${API_BASE}/api/analytics/visit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ page: window.location.pathname, referrer: document.referrer })
        }).catch(() => {});
    }
    trackVisit();

    // =============================================
    // PARTICLE BACKGROUND
    // =============================================
    function createParticles() {
        const canvas = document.createElement('canvas');
        canvas.id = 'particles-canvas';
        document.body.prepend(canvas);

        const ctx = canvas.getContext('2d');
        let particles = [];
        let animationId = null;
        let mouseX = 0, mouseY = 0;

        function resize() {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        }

        class Particle {
            constructor() {
                this.reset();
            }
            reset() {
                this.x = Math.random() * canvas.width;
                this.y = Math.random() * canvas.height;
                this.size = Math.random() * 2 + 0.5;
                this.speedX = (Math.random() - 0.5) * 0.6;
                this.speedY = (Math.random() - 0.5) * 0.6;
                this.opacity = Math.random() * 0.5 + 0.15;
                this.pulse = Math.random() * Math.PI * 2;
            }
            update() {
                this.pulse += 0.02;
                this.x += this.speedX;
                this.y += this.speedY;

                // Mouse interaction
                const dx = this.x - mouseX;
                const dy = this.y - mouseY;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 120) {
                    const force = (120 - dist) / 120 * 0.5;
                    this.x += (dx / dist) * -force;
                    this.y += (dy / dist) * -force;
                }

                if (this.x < 0 || this.x > canvas.width) this.reset();
                if (this.y < 0 || this.y > canvas.height) this.reset();
            }
            draw() {
                const currentOpacity = this.opacity * (0.8 + 0.2 * Math.sin(this.pulse));
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(99, 100, 255, ${currentOpacity})`;
                ctx.fill();
            }
        }

        function initParticles() {
            const count = Math.min(Math.floor(canvas.width * canvas.height / 12000), 80);
            particles = Array.from({ length: count }, () => new Particle());
        }

        function animate() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            particles.forEach(p => {
                p.update();
                p.draw();
            });

            // Draw connections
            for (let i = 0; i < particles.length; i++) {
                for (let j = i + 1; j < particles.length; j++) {
                    const dx = particles[i].x - particles[j].x;
                    const dy = particles[i].y - particles[j].y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < 150) {
                        const opacity = (1 - dist / 150) * 0.15;
                        ctx.beginPath();
                        ctx.moveTo(particles[i].x, particles[i].y);
                        ctx.lineTo(particles[j].x, particles[j].y);
                        ctx.strokeStyle = `rgba(99, 100, 255, ${opacity})`;
                        ctx.lineWidth = 0.8;
                        ctx.stroke();
                    }
                }
            }

            animationId = requestAnimationFrame(animate);
        }

        resize();
        initParticles();
        animate();

        window.addEventListener('resize', () => {
            resize();
            initParticles();
        });

        document.addEventListener('mousemove', (e) => {
            mouseX = e.clientX;
            mouseY = e.clientY;
        });

        // Cleanup if needed (e.g. page unload)
        window.addEventListener('beforeunload', () => {
            if (animationId) cancelAnimationFrame(animationId);
        });
    }
    createParticles();

    // =============================================
    // TYPING SUBTITLE ANIMATION
    // =============================================
    function typeSubtitle() {
        const el = document.getElementById('typedSubtitle');
        if (!el) return;

        const phrases = [
            'Développeur en devenir 💻',
            'Passionné par le code 🚀',
            'Systèmes & Logiciels ⚙️',
            'Innovation & Créativité ✨'
        ];
        let phraseIndex = 0;
        let charIndex = 0;
        let isDeleting = false;
        let speed = 60;

        function type() {
            const current = phrases[phraseIndex];

            if (isDeleting) {
                el.textContent = current.substring(0, charIndex - 1);
                charIndex--;
                speed = 30;
            } else {
                el.textContent = current.substring(0, charIndex + 1);
                charIndex++;
                speed = 60;
            }

            if (!isDeleting && charIndex === current.length) {
                speed = 2000;
                isDeleting = true;
            } else if (isDeleting && charIndex === 0) {
                isDeleting = false;
                phraseIndex = (phraseIndex + 1) % phrases.length;
                speed = 500;
            }

            setTimeout(type, speed);
        }

        setTimeout(type, 1000);
    }
    typeSubtitle();

    // =============================================
    // COUNTER ANIMATION (Hero Stats)
    // =============================================
    function animateCounters() {
        const counters = document.querySelectorAll('.hero-stat-number');
        if (!counters.length) return;

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const el = entry.target;
                    const target = parseInt(el.dataset.target) || 0;
                    const duration = 2000;
                    const startTime = performance.now();

                    function updateCounter(currentTime) {
                        const elapsed = currentTime - startTime;
                        const progress = Math.min(elapsed / duration, 1);
                        // Ease out cubic
                        const eased = 1 - Math.pow(1 - progress, 3);
                        const current = Math.floor(eased * target);

                        el.textContent = current + (progress < 1 ? '+' : '+');

                        if (progress < 1) {
                            requestAnimationFrame(updateCounter);
                        } else {
                            el.textContent = target + '+';
                        }
                    }

                    requestAnimationFrame(updateCounter);
                    observer.unobserve(el);
                }
            });
        }, { threshold: 0.5 });

        counters.forEach(c => observer.observe(c));
    }
    animateCounters();

    // =============================================
    // LOAD PROJECTS FROM API
    // =============================================
    async function loadProjects() {
        const container = document.querySelector('.projects-grid');
        if (!container) return;

        try {
            const response = await fetch(`${API_BASE}/api/projects`);
            const projects = await response.json();
            if (projects.length === 0) return;

            container.innerHTML = projects.map(p => `
                <article class="project-card">
                    <div class="project-image">
                        <div class="project-placeholder">
                            <img src="${p.image_url || 'https://placehold.co/600x400/1e293b/6364ff?text=' + encodeURIComponent(p.title)}" alt="${p.title}" loading="lazy" />
                        </div>
                    </div>
                    <div class="project-info">
                        <h3>${p.title}</h3>
                        <p>${p.description}</p>
                        <div class="project-tags">
                            ${(p.tags || []).map(t => `<span>${t}</span>`).join('')}
                        </div>
                        <div class="project-links">
                            <a href="${p.github_url || '#'}" target="_blank" rel="noopener noreferrer" class="project-link" data-project-id="${p.id}">
                                <i class="fab fa-github"></i> Voir sur GitHub
                            </a>
                        </div>
                    </div>
                </article>
            `).join('');

            container.querySelectorAll('.project-link').forEach(link => {
                link.addEventListener('click', () => {
                    const projectId = link.dataset.projectId;
                    fetch(`${API_BASE}/api/projects/${projectId}/click`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ type: 'github' })
                    }).catch(() => {});
                });
            });

            const newCards = container.querySelectorAll('.project-card');
            newCards.forEach(el => {
                el.style.opacity = '0';
                el.style.transform = 'translateY(30px)';
                el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
                if (revealObserver) revealObserver.observe(el);
            });
            setTimeout(() => forceReveal(), 100);

        } catch (err) {
            console.log('Projects loaded from static HTML');
        }
    }

    // =============================================
    // MOBILE MENU
    // =============================================
    const hamburger = document.getElementById('hamburger');
    const navMenu = document.getElementById('navMenu');

    if (hamburger && navMenu) {
        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('active');
            navMenu.classList.toggle('active');
        });

        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => {
                hamburger.classList.remove('active');
                navMenu.classList.remove('active');
            });
        });
    }

    // =============================================
    // HEADER SCROLL SHADOW
    // =============================================
    const header = document.querySelector('.header');
    if (header) {
        window.addEventListener('scroll', () => {
            header.classList.toggle('scrolled', window.scrollY > 50);
        });
    }

    // =============================================
    // ACTIVE NAV LINK ON SCROLL
    // =============================================
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-link');

    function updateActiveLink() {
        let current = '';
        const scrollPos = window.scrollY + 120;
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionBottom = sectionTop + section.offsetHeight;
            if (scrollPos >= sectionTop && scrollPos < sectionBottom) {
                current = section.getAttribute('id');
            }
        });
        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${current}`) {
                link.classList.add('active');
            }
        });
    }

    if (sections.length && navLinks.length) {
        window.addEventListener('scroll', updateActiveLink);
        window.addEventListener('load', updateActiveLink);
    }

    // =============================================
    // SKILLS BAR ANIMATION
    // =============================================
    const skillFills = document.querySelectorAll('.skill-fill');
    const skillObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const fill = entry.target;
                const width = fill.style.width;
                fill.style.width = '0%';
                setTimeout(() => { fill.style.width = width; }, 200);
                skillObserver.unobserve(fill);
            }
        });
    }, { threshold: 0.5 });

    skillFills.forEach(fill => skillObserver.observe(fill));

    // =============================================
    // BACK TO TOP
    // =============================================
    const backToTop = document.getElementById('backToTop');
    if (backToTop) {
        window.addEventListener('scroll', () => {
            backToTop.classList.toggle('visible', window.scrollY > 400);
        });
        backToTop.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    // =============================================
    // CONTACT FORM
    // =============================================
    const contactForm = document.getElementById('contactForm');
    const formFeedback = document.getElementById('formFeedback');

    if (contactForm) {
        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const name = document.getElementById('name').value.trim();
            const email = document.getElementById('email').value.trim();
            const subject = document.getElementById('subject').value.trim();
            const message = document.getElementById('message').value.trim();

            if (!name || !email || !subject || !message) {
                formFeedback.textContent = 'Veuillez remplir tous les champs.';
                formFeedback.className = 'form-feedback error';
                return;
            }

            if (!isValidEmail(email)) {
                formFeedback.textContent = 'Veuillez entrer un email valide.';
                formFeedback.className = 'form-feedback error';
                return;
            }

            const submitBtn = contactForm.querySelector('.btn-submit');
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Envoi...';
            submitBtn.disabled = true;

            try {
                const response = await fetch(`${API_BASE}/api/messages`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, email, subject, message })
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data.error);

                formFeedback.textContent = 'Message envoyé avec succès ! Je vous répondrai rapidement.';
                formFeedback.className = 'form-feedback success';
                contactForm.reset();
            } catch (error) {
                formFeedback.textContent = error.message || 'Une erreur est survenue. Veuillez réessayer plus tard.';
                formFeedback.className = 'form-feedback error';
            } finally {
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            }
        });
    }

    function isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    // =============================================
    // REVEAL ANIMATIONS
    // =============================================
    let revealObserver = null;
    const revealElements = document.querySelectorAll('.about-card, .skill-category, .project-card, .contact-info, .contact-form');

    if (revealElements.length) {
        revealObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('revealed');
                    revealObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.15 });

        revealElements.forEach(el => {
            el.style.opacity = '0';
            el.style.transform = 'translateY(30px)';
            el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
            revealObserver.observe(el);
        });
    }

    const styleSheet = document.createElement('style');
    styleSheet.textContent = `
        .about-card.revealed,
        .skill-category.revealed,
        .project-card.revealed,
        .contact-info.revealed,
        .contact-form.revealed {
            opacity: 1 !important;
            transform: translateY(0) !important;
        }
    `;
    document.head.appendChild(styleSheet);

    function forceReveal() {
        document.querySelectorAll('.about-card, .skill-category, .project-card, .contact-info, .contact-form').forEach(el => {
            const rect = el.getBoundingClientRect();
            const windowHeight = window.innerHeight;
            if (rect.top < windowHeight - 60) {
                el.classList.add('revealed');
            }
        });
    }

    setTimeout(forceReveal, 100);

    // =============================================
    // INIT
    // =============================================
    loadProjects();
});