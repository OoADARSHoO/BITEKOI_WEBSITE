/**
 * ARGUS Marketing Landing Page - Vanilla JS
 * Handles GitHub Release download resolution, loading states, and accessible story modal.
 */

// Repository configuration
const GITHUB_REPO = 'OoADARSHoO/argus_app';

document.addEventListener('DOMContentLoaded', () => {
  initDownloadButtons();
  initStoryModal();
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
