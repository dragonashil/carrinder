// Home page script
class CareerManagerHome {
  constructor() {
    this.init();
  }

  async init() {
    // Initialize language in parallel
    this.initializeLanguage();
    this.setupEventListeners();
    this.checkUserStatus();
  }

  async initializeLanguage() {
    console.log('Initializing language...', { window_i18n: !!window.i18n });
    
    // Wait for i18n to be available
    let attempts = 0;
    while (!window.i18n && attempts < 50) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    
    if (window.i18n) {
      await window.i18n.loadTranslations();
      this.setupLanguageToggle();
    } else {
      console.error('window.i18n is not available after waiting');
    }
  }

  setupLanguageToggle() {
    const container = document.getElementById('language-toggle-container');
    console.log('Setting up language toggle...', { 
      container: !!container, 
      window_i18n: !!window.i18n,
      containerId: container?.id 
    });
    
    if (container) {
      // Clear existing content
      container.innerHTML = '';
      
      if (window.i18n) {
        const languageToggle = window.i18n.createLanguageToggle();
        container.appendChild(languageToggle);
        console.log('Language toggle added to container via i18n');
        
        // Update current language display
        const languageText = languageToggle.querySelector('.language-text');
        if (languageText) {
          languageText.textContent = window.i18n.getCurrentLanguage().toUpperCase();
        }
        
        document.addEventListener('languageChanged', () => {
          window.i18n.updatePageTexts();
        });
      } else {
        // Fallback: create simple language toggle without i18n
        console.log('Creating fallback language toggle');
        container.innerHTML = `
          <div class="language-toggle" style="position: relative; display: inline-block; margin-left: 8px;">
            <button class="language-btn" style="
              display: flex;
              align-items: center;
              gap: 4px;
              padding: 6px 10px;
              background: rgba(255, 255, 255, 0.2);
              border: 1px solid rgba(255, 255, 255, 0.3);
              border-radius: 6px;
              color: white;
              font-size: 12px;
              cursor: pointer;
              min-width: 60px;
              justify-content: center;
            ">
              <span style="font-size: 14px;">🌐</span>
              <span style="font-weight: 500; font-size: 11px;">KO</span>
            </button>
          </div>
        `;
        console.log('Fallback language toggle created');
      }
    } else {
      console.error('Cannot setup language toggle - container not found');
    }
  }

  setupEventListeners() {
    // Start button - open popup
    document.getElementById('start-btn').addEventListener('click', () => {
      this.openPopup();
    });

    // Settings button - open options page
    document.getElementById('settings-btn').addEventListener('click', () => {
      this.openSettings();
    });

    // Upgrade button
    const upgradeBtn = document.querySelector('.pricing-card.featured .btn');
    if (upgradeBtn) {
      upgradeBtn.addEventListener('click', () => {
        this.openPricing();
      });
    }
  }

  async checkUserStatus() {
    try {
      // Check if user is authenticated
      const authData = await this.getStoredData('google_auth');
      const userPlan = await this.getStoredData('userPlan') || 'free';
      
      const startBtn = document.getElementById('start-btn');
      
      if (authData && authData.access_token) {
        startBtn.textContent = '대시보드 열기';
      } else {
        startBtn.textContent = '시작하기';
      }

      // Update pricing card if user has plus plan
      if (userPlan === 'plus') {
        const upgradeBtn = document.querySelector('.pricing-card.featured .btn');
        if (upgradeBtn) {
          upgradeBtn.textContent = '현재 플랜';
          upgradeBtn.disabled = true;
          upgradeBtn.style.opacity = '0.6';
        }
      }
    } catch (error) {
      console.error('Error checking user status:', error);
    }
  }

  openPopup() {
    console.log('Opening popup...');
    // Always navigate in same window for better user experience
    window.location.href = chrome.runtime.getURL('popup.html');
  }

  openSettings() {
    console.log('Opening settings...');
    window.location.href = chrome.runtime.getURL('options.html');
  }

  openPricing() {
    console.log('Opening pricing...');
    window.location.href = chrome.runtime.getURL('pricing.html');
  }

  // Utility method to get stored data
  async getStoredData(key) {
    return new Promise((resolve) => {
      chrome.storage.local.get([key], (result) => {
        resolve(result[key]);
      });
    });
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new CareerManagerHome();
});

// Handle Chrome extension context
if (typeof chrome !== 'undefined' && chrome.runtime) {
  // Extension context
  console.log('Career Manager Home loaded in extension context');
} else {
  // Web context - disable Chrome-specific features
  console.log('Career Manager Home loaded in web context');
  
  // Replace Chrome-specific functions with web alternatives
  const buttons = document.querySelectorAll('button');
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      alert('이 기능은 Chrome 확장 프로그램에서만 사용할 수 있습니다.');
    });
  });
}