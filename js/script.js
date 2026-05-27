'use strict';

document.addEventListener('DOMContentLoaded', () => {

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
            constructor() { this.reset(); }
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
            particles.forEach(p => { p.update(); p.draw(); });
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

        window.addEventListener('resize', () => { resize(); initParticles(); });
        document.addEventListener('mousemove', (e) => { mouseX = e.clientX; mouseY = e.clientY; });
        window.addEventListener('beforeunload', () => { if (animationId) cancelAnimationFrame(animationId); });
    }
    createParticles();

    // =============================================
    // TYPING SUBTITLE
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
        let phraseIndex = 0, charIndex = 0, isDeleting = false, speed = 60;

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
            if (!isDeleting && charIndex === current.length) { speed = 2000; isDeleting = true; }
            else if (isDeleting && charIndex === 0) { isDeleting = false; phraseIndex = (phraseIndex + 1) % phrases.length; speed = 500; }
            setTimeout(type, speed);
        }
        setTimeout(type, 1000);
    }
    typeSubtitle();

    // =============================================
    // COUNTER ANIMATION
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
                        const eased = 1 - Math.pow(1 - progress, 3);
                        const current = Math.floor(eased * target);
                        el.textContent = current + '+';
                        if (progress < 1) requestAnimationFrame(updateCounter);
                        else el.textContent = target + '+';
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
    // HEADER SCROLL
    // =============================================
    const header = document.querySelector('.header');
    if (header) {
        window.addEventListener('scroll', () => {
            header.classList.toggle('scrolled', window.scrollY > 50);
        });
    }

    // =============================================
    // ACTIVE NAV LINK
    // =============================================
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-link');

    function updateActiveLink() {
        let current = '';
        const scrollPos = window.scrollY + 120;
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionBottom = sectionTop + section.offsetHeight;
            if (scrollPos >= sectionTop && scrollPos < sectionBottom) current = section.getAttribute('id');
        });
        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${current}`) link.classList.add('active');
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
    // CONTACT FORM (Formspree)
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
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                formFeedback.textContent = 'Veuillez entrer un email valide.';
                formFeedback.className = 'form-feedback error';
                return;
            }

            const submitBtn = contactForm.querySelector('.btn-submit');
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Envoi...';
            submitBtn.disabled = true;

            try {
                const formData = new FormData(contactForm);
                const response = await fetch(contactForm.action, {
                    method: 'POST',
                    body: formData,
                    headers: { 'Accept': 'application/json' }
                });
                const data = await response.json();

                if (response.ok) {
                    formFeedback.textContent = 'Message envoyé avec succès !';
                    formFeedback.className = 'form-feedback success';
                    contactForm.reset();
                } else {
                    throw new Error(data.error || 'Erreur lors de l\'envoi');
                }
            } catch (error) {
                formFeedback.textContent = error.message || 'Une erreur est survenue.';
                formFeedback.className = 'form-feedback error';
            } finally {
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            }
        });
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
        .about-card.revealed, .skill-category.revealed, .project-card.revealed,
        .contact-info.revealed, .contact-form.revealed {
            opacity: 1 !important;
            transform: translateY(0) !important;
        }
    `;
    document.head.appendChild(styleSheet);

    setTimeout(() => {
        document.querySelectorAll('.about-card, .skill-category, .project-card, .contact-info, .contact-form').forEach(el => {
            const rect = el.getBoundingClientRect();
            if (rect.top < window.innerHeight - 60) el.classList.add('revealed');
        });
    }, 100);
});