/**
 * ARGUS Marketing Landing Page - Vanilla JS
 * Handles GitHub Release download resolution, loading states, and accessible story modal.
 */

// Repository configuration
const GITHUB_REPO = 'OoADARSHoO/argus_app';

document.addEventListener('DOMContentLoaded', () => {
  initDownloadButtons();
  initStoryModal();
  initScrollReveal();
  initAllTiltElements();
});

/**
 * Initializes all elements with the [data-download] attribute.
 * Fetches the latest release from GitHub API, filters for Windows (.exe) installer,
 * and falls back gracefully to the releases page if necessary.
 */
function initDownloadButtons() {
  const downloadButtons = document.querySelectorAll('[data-download]');

  downloadButtons.forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();

      // Avoid double-clicks while request is active
      if (btn.classList.contains('is-loading')) return;

      const originalHtml = btn.innerHTML;
      btn.classList.add('is-loading');

      // Update button state while contacting GitHub API
      btn.innerHTML = `
        <span class="btn-spinner" aria-hidden="true"></span>
        <span class="btn-label">Preparing download...</span>
      `;

      const fallbackUrl = `https://github.com/${GITHUB_REPO}/releases/latest`;

      try {
        const response = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, {
          headers: {
            'Accept': 'application/vnd.github.v3+json'
          }
        });

        if (!response.ok) {
          throw new Error(`GitHub API returned status ${response.status}`);
        }

        const data = await response.json();
        const assets = Array.isArray(data.assets) ? data.assets : [];

        // Filter for Windows executables (.exe)
        const exeAssets = assets.filter(asset =>
          typeof asset.name === 'string' && asset.name.toLowerCase().endsWith('.exe')
        );

        if (exeAssets.length === 0) {
          throw new Error('No .exe asset found in latest release');
        }

        // Prefer asset containing "Setup" (case-insensitive) if available, otherwise take the first .exe
        const setupAsset = exeAssets.find(asset => /setup/i.test(asset.name));
        const targetAsset = setupAsset || exeAssets[0];

        if (targetAsset && targetAsset.browser_download_url) {
          // Trigger direct file download
          window.location.href = targetAsset.browser_download_url;
        } else {
          throw new Error('Asset download URL missing');
        }
      } catch (err) {
        console.warn('Direct download resolution failed, opening releases page fallback:', err);
        window.open(fallbackUrl, '_blank', 'noopener,noreferrer');
      } finally {
        // Restore button state after a brief moment so the user sees confirmation
        setTimeout(() => {
          btn.innerHTML = originalHtml;
          btn.classList.remove('is-loading');
        }, 1200);
      }
    });
  });
}

/**
 * Initializes the "Watch the Story" modal dialog.
 * Handles opening, backdrop click, Esc key dismiss, and focus trapping.
 */
function initStoryModal() {
  const openBtn = document.getElementById('watchStoryBtn');
  const modal = document.getElementById('storyModal');
  if (!openBtn || !modal) return;

  const closeElements = modal.querySelectorAll('[data-close-modal]');
  const focusableSelector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
  let previouslyFocusedElement = null;

  function openModal() {
    previouslyFocusedElement = document.activeElement;
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    // Focus the first focusable element inside the modal (usually close button)
    const focusable = modal.querySelectorAll(focusableSelector);
    if (focusable.length > 0) {
      focusable[0].focus();
    }

    document.addEventListener('keydown', handleKeyDown);
  }

  function closeModal() {
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';

    document.removeEventListener('keydown', handleKeyDown);

    // Restore focus to button that opened the modal
    if (previouslyFocusedElement && typeof previouslyFocusedElement.focus === 'function') {
      previouslyFocusedElement.focus();
    }
  }

  function handleKeyDown(e) {
    // Dismiss on ESC
    if (e.key === 'Escape' || e.key === 'Esc') {
      e.preventDefault();
      closeModal();
      return;
    }

    // Trap focus inside modal
    if (e.key === 'Tab') {
      const focusable = Array.from(modal.querySelectorAll(focusableSelector));
      if (focusable.length === 0) return;

      const firstElement = focusable[0];
      const lastElement = focusable[focusable.length - 1];

      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    }
  }

  openBtn.addEventListener('click', openModal);

  closeElements.forEach((el) => {
    el.addEventListener('click', closeModal);
  });
}

/**
 * Reusable Scroll Reveal Observer
 * Watches elements with the .reveal class and activates .is-revealed
 * when scrolled into the viewport. Respects prefers-reduced-motion.
 */
function initScrollReveal() {
  const revealElements = document.querySelectorAll('.reveal');
  if (revealElements.length === 0) return;

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // If user prefers reduced motion or browser lacks IntersectionObserver, reveal immediately
  if (prefersReducedMotion || !('IntersectionObserver' in window)) {
    revealElements.forEach(el => el.classList.add('is-revealed'));
    return;
  }

  const observerOptions = {
    root: null,
    rootMargin: '0px 0px -40px 0px',
    threshold: 0.15
  };

  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-revealed');
        obs.unobserve(entry.target); // Trigger once
      }
    });
  }, observerOptions);

  revealElements.forEach(el => observer.observe(el));
}

/**
 * Auto-initializes all elements with the [data-tilt] attribute.
 */
function initAllTiltElements() {
  const tiltWraps = document.querySelectorAll('[data-tilt]');
  tiltWraps.forEach(wrap => initTilt(wrap));
}

/**
 * Reusable Interactive 3D Tilt Effect
 * Uses requestAnimationFrame with linear interpolation (lerp) for smooth weighted physics.
 * 
 * @param {HTMLElement} el - The wrapper element (.tilt-wrap)
 * @param {Object} options - Custom configuration options
 * @param {number} [options.max=14] - Maximum tilt rotation in degrees
 * @param {number} [options.scale=1.04] - Scale factor when hovered
 * @param {number} [options.speed=0.12] - Lerp speed (0.05 = heavier, 0.25 = snappier)
 * @param {boolean} [options.glare=true] - Whether to render radial glare highlight
 */
function initTilt(el, options = {}) {
  if (!el) return;

  const defaults = {
    max: 14,
    scale: 1.04,
    speed: 0.12,
    glare: true
  };

  const opts = Object.assign({}, defaults, options);

  // Skip tilt logic if reduced motion is requested or device does not support hover (touch devices)
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isTouchDevice = window.matchMedia('(hover: none)').matches;
  if (prefersReducedMotion || isTouchDevice) {
    return;
  }

  const card = el.querySelector('.tilt-card') || el;
  let glare = el.querySelector('.tilt-glare');

  if (opts.glare && !glare) {
    glare = document.createElement('div');
    glare.className = 'tilt-glare';
    glare.setAttribute('aria-hidden', 'true');
    card.appendChild(glare);
  }

  let currentRotateX = 0;
  let currentRotateY = 0;
  let currentScale = 1;

  let targetRotateX = 0;
  let targetRotateY = 0;
  let targetScale = 1;

  let currentGlareOpacity = 0;
  let targetGlareOpacity = 0;
  let glareX = 50;
  let glareY = 50;

  let isHovered = false;
  let rafId = null;

  function update() {
    // Linear interpolation (lerp) toward targets
    currentRotateX += (targetRotateX - currentRotateX) * opts.speed;
    currentRotateY += (targetRotateY - currentRotateY) * opts.speed;
    currentScale += (targetScale - currentScale) * opts.speed;
    currentGlareOpacity += (targetGlareOpacity - currentGlareOpacity) * opts.speed;

    // Apply 3D perspective rotation and hover scale
    card.style.transform = `perspective(1000px) rotateX(${currentRotateX.toFixed(2)}deg) rotateY(${currentRotateY.toFixed(2)}deg) scale(${currentScale.toFixed(3)})`;

    // Dynamic drop-shadow that counter-shifts against tilt angle + accent glow enhancement
    const shadowX = (-currentRotateY * 1.5).toFixed(1);
    const shadowY = (currentRotateX * 1.5 + 20).toFixed(1);
    const glowSpread = (22 + (currentScale - 1) * 350).toFixed(1);
    const glowOpacity = (0.16 + (currentScale - 1) * 2.2).toFixed(2);
    card.style.filter = `drop-shadow(${shadowX}px ${shadowY}px 32px rgba(0, 0, 0, 0.75)) drop-shadow(0 0 ${glowSpread}px rgba(91, 140, 255, ${glowOpacity}))`;

    // Update glare highlight position and opacity
    if (opts.glare && glare) {
      glare.style.opacity = currentGlareOpacity.toFixed(3);
      glare.style.background = `radial-gradient(circle at ${glareX}% ${glareY}%, rgba(255, 255, 255, 0.35) 0%, rgba(255, 255, 255, 0.06) 42%, transparent 75%)`;
    }

    // Settling check: stop animation loop when element has returned to rest
    const isAtRest = !isHovered &&
      Math.abs(targetRotateX - currentRotateX) < 0.01 &&
      Math.abs(targetRotateY - currentRotateY) < 0.01 &&
      Math.abs(targetScale - currentScale) < 0.001 &&
      currentGlareOpacity < 0.005;

    if (isAtRest) {
      card.style.transform = '';
      card.style.filter = '';
      if (glare) glare.style.opacity = '0';
      cancelAnimationFrame(rafId);
      rafId = null;
      return;
    }

    rafId = requestAnimationFrame(update);
  }

  function onMouseMove(e) {
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    // Relative mouse position within element bounds (0 to 1)
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));

    // Calculate target rotations: horizontal moves rotateY, vertical moves rotateX (inverted)
    targetRotateY = (x - 0.5) * 2 * opts.max;
    targetRotateX = -(y - 0.5) * 2 * opts.max;
    targetScale = opts.scale;

    glareX = (x * 100).toFixed(1);
    glareY = (y * 100).toFixed(1);
    targetGlareOpacity = 0.22;

    isHovered = true;

    if (!rafId) {
      rafId = requestAnimationFrame(update);
    }
  }

  function onMouseLeave() {
    targetRotateX = 0;
    targetRotateY = 0;
    targetScale = 1;
    targetGlareOpacity = 0;
    isHovered = false;

    if (!rafId) {
      rafId = requestAnimationFrame(update);
    }
  }

  el.addEventListener('mousemove', onMouseMove);
  el.addEventListener('mouseleave', onMouseLeave);
}
