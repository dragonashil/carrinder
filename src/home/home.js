// Home page script
class CareerManagerHome {
  constructor() {
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.checkUserStatus();
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
    // Open popup in new tab since we can't open popup window from content script
    chrome.tabs.create({
      url: chrome.runtime.getURL('popup.html')
    });
  }

  openSettings() {
    chrome.tabs.create({
      url: chrome.runtime.getURL('options.html')
    });
  }

  openPricing() {
    chrome.tabs.create({
      url: chrome.runtime.getURL('pricing.html')
    });
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