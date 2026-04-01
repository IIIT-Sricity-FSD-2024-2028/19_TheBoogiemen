/**
 * index.js - Landing Page Scripts
 * BarelyPassing - Academic Progress & Outcome Tracking
 */

document.addEventListener("DOMContentLoaded", () => {
  // 1. Scroll-Triggered Reveal & Progress Bars
  const elementsToReveal = document.querySelectorAll('.prob-grid > div, .cell, .role-card, .pstep, .num-cell, .cta-sec');
  const observerOptions = { threshold: 0.1, rootMargin: "0px 0px -40px 0px" };
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if(entry.isIntersecting) {
        entry.target.classList.add('active');
        // Trigger progress bars
        const fills = entry.target.querySelectorAll('.rw-fill, .pr-fill');
        fills.forEach(fill => {
          if(fill.dataset.width) fill.style.width = fill.dataset.width;
        });
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);
  elementsToReveal.forEach(el => observer.observe(el));

  // 2. 3D Tilt Effect on Hover
  const tiltElements = document.querySelectorAll('.hc, .cell');
  tiltElements.forEach(el => {
    el.addEventListener('mousemove', (e) => {
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const rotateX = ((y - centerY) / centerY) * -3;
      const rotateY = ((x - centerX) / centerX) * 3;
      el.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px) scale(1.01)`;
      el.style.transition = 'none';
      el.style.zIndex = '10';
    });
    el.addEventListener('mouseleave', () => {
      el.style.transform = '';
      el.style.transition = 'transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.4s ease';
      el.style.zIndex = '1';
    });
  });

  // 3. Interactive Hero Background Glow
  const hero = document.querySelector('.hero');
  if(hero) {
    hero.addEventListener('mousemove', (e) => {
      const rect = hero.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      hero.style.setProperty('--cursor-x', `${x}px`);
      hero.style.setProperty('--cursor-y', `${y}px`);
    });
  }

  // 4. Magnetic Hover Effects on Primary Buttons
  const magneticBtns = document.querySelectorAll('.btn-primary');
  magneticBtns.forEach(btn => {
    btn.addEventListener('mousemove', (e) => {
      const rect = btn.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      btn.style.transform = `translate(${x * 0.15}px, ${y * 0.15}px)`;
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.transform = '';
    });
  });

  // 5. Stat Number Count-up Animation
  const numObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if(entry.isIntersecting) {
        const valEl = entry.target.querySelector('.num-val');
        if(valEl) {
          const finalVal = parseFloat(valEl.innerText);
          if(!isNaN(finalVal)) {
            let start = 0;
            const duration = 1500;
            const stepTime = 20;
            const steps = duration / stepTime;
            const inc = finalVal / steps;
            const isFloat = valEl.innerText.includes('.');

            valEl.innerText = isFloat ? '0.00' : '0';
            const timer = setInterval(() => {
              start += inc;
              if(start >= finalVal) {
                valEl.innerText = finalVal;
                clearInterval(timer);
              } else {
                valEl.innerText = isFloat ? start.toFixed(2) : Math.floor(start);
              }
            }, stepTime);
          }
        }
        numObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });

  document.querySelectorAll('.num-cell').forEach(cell => numObserver.observe(cell));

  // 6. Dynamic Frosted Navbar & Velocity Marquee
  const nav = document.querySelector('nav');
  const strip = document.querySelector('.hero-strip');
  let lastScrollY = window.scrollY;
  let ticking = false;

  window.addEventListener('scroll', () => {
    if(!ticking) {
      window.requestAnimationFrame(() => {
        const currentY = window.scrollY;
        // Nav logic
        if(currentY > 50) nav.classList.add('scrolled');
        else nav.classList.remove('scrolled');

        // Velocity marquee logic
        if(strip) {
          const delta = currentY - lastScrollY;
          let skew = delta * 0.1;
          skew = Math.max(-15, Math.min(15, skew));
          strip.style.setProperty('--skew', `${-skew}deg`);

          clearTimeout(strip.skewTimeout);
          strip.skewTimeout = setTimeout(() => {
            strip.style.setProperty('--skew', `0deg`);
          }, 150);
        }

        lastScrollY = currentY;
        ticking = false;
      });
      ticking = true;
    }
  });
});
