// Debug version of i18n for testing
window.debugI18n = {
  init() {
    console.log('Debug i18n initialized');
    this.addLanguageToggle();
  },

  addLanguageToggle() {
    const containers = ['language-toggle-container', 'header-controls'];
    
    containers.forEach(containerId => {
      const container = document.getElementById(containerId);
      if (container) {
        console.log('Found container:', containerId);
        
        // Create simple toggle
        const toggle = document.createElement('div');
        toggle.style.cssText = `
          display: inline-block;
          padding: 8px 12px;
          background: rgba(255, 255, 255, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.3);
          border-radius: 6px;
          color: white;
          cursor: pointer;
          font-size: 12px;
          margin-left: 8px;
        `;
        toggle.textContent = '🌐 KO';
        toggle.id = 'debug-language-toggle';
        
        let isKorean = true;
        toggle.addEventListener('click', () => {
          isKorean = !isKorean;
          toggle.textContent = isKorean ? '🌐 KO' : '🌐 EN';
          console.log('Language switched to:', isKorean ? 'Korean' : 'English');
        });
        
        container.appendChild(toggle);
        console.log('Language toggle added to', containerId);
      } else {
        console.log('Container not found:', containerId);
      }
    });
  }
};

// Auto initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.debugI18n.init();
  });
} else {
  window.debugI18n.init();
}