/**
 * index.js - Landing Page Interactions
 * Handles animations, scroll effects, and UI interactions
 */

document.addEventListener('DOMContentLoaded', () => {
  // Initialize database
  StateManager.initDatabase();
  
  // 1. Scroll-Triggered Reveal
  const elementsToReveal = document.querySelectorAll(
    '.prob-grid > div, .cell, .role-card, .pstep, .num-cell, .cta-sec'
  );
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('active');
        const fills = entry.target.querySelectorAll('.rw-fill, .pr-fill');
        fills.forEach(fill => {
          if (fill.dataset.width) fill.style.width = fill.dataset.width;
        });
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: "0px 0px -40px 0px" });

  elementsToReveal.forEach(el => observer.observe(el));

  // 2. 3D Tilt Effect
  const tiltElements = document.querySelectorAll('.hc, .cell');
  tiltElements.forEach(el => {
    el.addEventListener('mousemove', (e) => {
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const rotateX = ((y - rect.height / 2) / (rect.height / 2)) * -3;
      const rotateY = ((x - rect.width / 2) / (rect.width / 2)) * 3;
      el.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    });
    el.addEventListener('mouseleave', () => {
      el.style.transform = '';
    });
  });

  // 3. Navbar Scroll Effect
  const nav = document.querySelector('nav');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) nav.classList.add('scrolled');
    else nav.classList.remove('scrolled');
  });

  // 4. Check if already logged in
  if (StateManager.validateSession()) {
    const role = StateManager.getCurrentRole();
    Auth.redirectByRole(role);
  }
});