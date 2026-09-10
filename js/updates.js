// ===============================================================
// Updates / What's New Popup Controller
// ===============================================================

(function() {
  const UPDATE_KEY = 'cse_radar_update_v2_1_seen';

  function initUpdatePopup() {
    const popup = document.getElementById('update-popup');
    const closeBtn = document.getElementById('updateCloseBtn');
    const dismissBtn = document.getElementById('updateDismissBtn');
    const ctaBtn = document.getElementById('updateCtaBtn');
    const whatsNewBtn = document.getElementById('whatsNewBtn');
    const pulseDot = document.getElementById('whatsNewPulse');

    if (!popup) return;

    function showPopup() {
      popup.classList.remove('hidden');
      popup.classList.remove('slide-out');
      popup.classList.add('slide-in');
      if (pulseDot) pulseDot.classList.remove('active');
    }

    function hidePopup(markSeen = true) {
      popup.classList.remove('slide-in');
      popup.classList.add('slide-out');
      setTimeout(() => {
        popup.classList.add('hidden');
        popup.classList.remove('slide-out');
      }, 320);

      if (markSeen) {
        try {
          localStorage.setItem(UPDATE_KEY, 'true');
        } catch (e) {}
        if (pulseDot) pulseDot.classList.remove('active');
      }
    }

    // Check if previously dismissed
    let hasSeen = false;
    try {
      hasSeen = localStorage.getItem(UPDATE_KEY) === 'true';
    } catch (e) {}

    if (!hasSeen) {
      if (pulseDot) pulseDot.classList.add('active');
      // Delay entrance so page content finishes rendering first
      setTimeout(() => {
        showPopup();
      }, 750);
    }

    // Listeners
    if (closeBtn) {
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        hidePopup(true);
      });
    }

    if (dismissBtn) {
      dismissBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        hidePopup(true);
      });
    }

    if (ctaBtn) {
      ctaBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        hidePopup(true);
        if (typeof window.navigate === 'function') {
          window.navigate('sgpa');
        } else {
          const sgpaLink = document.querySelector('[data-page="sgpa"]');
          if (sgpaLink) sgpaLink.click();
        }
      });
    }

    if (whatsNewBtn) {
      whatsNewBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (popup.classList.contains('hidden')) {
          showPopup();
        } else {
          hidePopup(false);
        }
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initUpdatePopup);
  } else {
    initUpdatePopup();
  }
})();