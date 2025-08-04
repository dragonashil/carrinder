// Options page script
class CareerManagerOptions {
  constructor() {
    this.init();
  }

  async init() {
    // Initialize language in parallel
    this.initializeLanguage();
    await this.loadSettings();
    this.setupEventListeners();
    this.checkAuthStatus();
    await this.checkUserPlan();
  }

  async initializeLanguage() {
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
      console.warn('i18n not available after waiting');
    }
  }

  setupLanguageToggle() {
    const container = document.getElementById('language-toggle-container');
    if (container && window.i18n) {
      // Clear existing content
      container.innerHTML = '';
      
      const languageToggle = window.i18n.createLanguageToggle();
      container.appendChild(languageToggle);
      
      // Update current language display
      const languageText = languageToggle.querySelector('.language-text');
      if (languageText) {
        languageText.textContent = window.i18n.getCurrentLanguage().toUpperCase();
      }
      
      document.addEventListener('languageChanged', () => {
        window.i18n.updatePageTexts();
      });
    } else {
      console.warn('Language toggle container not found or i18n not available');
    }
  }

  async loadSettings() {
    try {
      const settings = await this.getStoredData('settings') || this.getDefaultSettings();
      
      // Load keyword settings
      document.getElementById('lecture-keywords').value = settings.keywords?.lecture?.join(', ') || '';
      document.getElementById('evaluation-keywords').value = settings.keywords?.evaluation?.join(', ') || '';
      document.getElementById('mentoring-keywords').value = settings.keywords?.mentoring?.join(', ') || '';
      
      // Load sync settings
      document.getElementById('auto-sync').checked = settings.autoSync ?? true;
      document.getElementById('sync-interval').value = settings.syncInterval || 30;
      
      // Load export settings
      document.getElementById('export-format').value = settings.export?.format || 'spreadsheet';
      document.getElementById('include-description').checked = settings.export?.includeDescription ?? true;
      document.getElementById('include-location').checked = settings.export?.includeLocation ?? true;
      
      // Load notification settings
      document.getElementById('notifications-enabled').checked = settings.notifications?.enabled ?? true;
      document.getElementById('upcoming-events').checked = settings.notifications?.upcomingEvents ?? true;
      document.getElementById('sync-complete').checked = settings.notifications?.syncComplete ?? false;
      
      // Load Notion token
      const notionSettings = await this.getStoredData('notionSettings');
      if (notionSettings && notionSettings.token) {
        document.getElementById('notion-token').value = notionSettings.token;
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      this.showToast('Error loading settings', 'error');
    }
  }

  setupEventListeners() {
    // Authentication buttons
    document.getElementById('google-connect-btn').addEventListener('click', () => {
      this.handleGoogleAuth();
    });

    document.getElementById('drive-connect-btn').addEventListener('click', () => {
      this.handleDriveAuth();
    });

    document.getElementById('notion-save-btn').addEventListener('click', () => {
      this.saveNotionToken();
    });

    // Settings buttons
    document.getElementById('save-settings-btn').addEventListener('click', () => {
      this.saveSettings();
    });

    document.getElementById('reset-settings-btn').addEventListener('click', () => {
      this.resetSettings();
    });

    // Data management buttons
    document.getElementById('export-data-btn').addEventListener('click', () => {
      this.exportData();
    });

    document.getElementById('import-data-btn').addEventListener('click', () => {
      this.importData();
    });

    document.getElementById('clear-data-btn').addEventListener('click', () => {
      this.clearData();
    });

    // Logout button
    document.getElementById('logout-btn').addEventListener('click', () => {
      this.logout();
    });

    // Pricing page button
    document.getElementById('view-pricing-btn').addEventListener('click', () => {
      this.openPricingPage();
    });

    // Dashboard button
    document.getElementById('dashboard-btn').addEventListener('click', () => {
      this.openDashboard();
    });

    // Home button
    document.getElementById('home-btn').addEventListener('click', () => {
      this.openHomePage();
    });

    // File input
    document.getElementById('import-file').addEventListener('change', (event) => {
      const file = event.target.files[0];
      if (file) {
        this.handleFileImport(file);
      }
    });
  }

  async checkAuthStatus() {
    try {
      console.log('Checking auth status...');
      
      // Check Google Calendar auth
      const googleAuth = await this.getStoredData('google_auth');
      console.log('Google auth data:', googleAuth);
      
      const googleStatus = document.getElementById('google-status');
      const googleBtn = document.getElementById('google-connect-btn');

      if (googleAuth && googleAuth.access_token) {
        googleStatus.textContent = 'Connected';
        googleStatus.className = 'auth-status connected';
        googleBtn.textContent = 'Disconnect';
        console.log('Google Calendar: Connected');
      } else {
        googleStatus.textContent = 'Not connected';
        googleStatus.className = 'auth-status disconnected';
        googleBtn.textContent = 'Connect';
        console.log('Google Calendar: Not connected');
      }

      // Check Google Drive auth - it might use the same token as Calendar
      let driveAuth = await this.getStoredData('drive_auth');
      
      // If no separate drive auth, check if google_auth has drive scopes
      if (!driveAuth && googleAuth && googleAuth.access_token) {
        console.log('No separate drive auth found, checking if google auth has drive scopes');
        driveAuth = googleAuth; // Use same token
      }
      
      console.log('Drive auth data:', driveAuth);
      
      const driveStatus = document.getElementById('drive-status');
      const driveBtn = document.getElementById('drive-connect-btn');

      if (driveAuth && driveAuth.access_token) {
        driveStatus.textContent = 'Connected';
        driveStatus.className = 'auth-status connected';
        driveBtn.textContent = 'Disconnect';
        console.log('Google Drive: Connected');
      } else {
        driveStatus.textContent = 'Not connected';
        driveStatus.className = 'auth-status disconnected';
        driveBtn.textContent = 'Connect';
        console.log('Google Drive: Not connected');
      }

    } catch (error) {
      console.error('Error checking auth status:', error);
    }
  }

  async handleGoogleAuth() {
    try {
      const btn = document.getElementById('google-connect-btn');
      const originalText = btn.textContent;
      
      if (originalText === 'Connect') {
        btn.textContent = 'Connecting...';
        btn.disabled = true;

        // Request authentication through background script
        const result = await this.sendMessageToBackground({
          action: 'authenticate_google'
        });

        if (result.success) {
          this.showToast('Google authentication successful!', 'success');
          await this.checkAuthStatus();
        } else {
          this.showToast(result.error || 'Authentication failed', 'error');
          btn.textContent = 'Connect';
        }
      } else {
        // Disconnect
        btn.textContent = 'Disconnecting...';
        btn.disabled = true;
        
        await this.removeStoredData('google_auth');
        this.showToast('Google account disconnected', 'info');
        await this.checkAuthStatus();
      }
      
      btn.disabled = false;
    } catch (error) {
      console.error('Google auth error:', error);
      this.showToast('Authentication error occurred', 'error');
      
      const btn = document.getElementById('google-connect-btn');
      btn.textContent = 'Connect';
      btn.disabled = false;
    }
  }

  async handleDriveAuth() {
    try {
      const btn = document.getElementById('drive-connect-btn');
      const originalText = btn.textContent;
      
      if (originalText === 'Connect') {
        btn.textContent = 'Connecting...';
        btn.disabled = true;

        // Request Drive authentication through background script
        const result = await this.sendMessageToBackground({
          action: 'authenticate_drive'
        });

        if (result.success) {
          this.showToast('Google Drive authentication successful!', 'success');
          await this.checkAuthStatus();
        } else {
          this.showToast(result.error || 'Authentication failed', 'error');
          btn.textContent = 'Connect';
        }
      } else {
        // Disconnect
        btn.textContent = 'Disconnecting...';
        btn.disabled = true;
        
        await this.removeStoredData('drive_auth');
        this.showToast('Google Drive disconnected', 'info');
        await this.checkAuthStatus();
      }
      
      btn.disabled = false;
    } catch (error) {
      console.error('Drive auth error:', error);
      this.showToast('Authentication error occurred', 'error');
      
      const btn = document.getElementById('drive-connect-btn');
      btn.textContent = 'Connect';
      btn.disabled = false;
    }
  }

  async saveNotionToken() {
    try {
      const token = document.getElementById('notion-token').value.trim();
      const saveBtn = document.getElementById('notion-save-btn');
      
      if (!token) {
        this.showToast('Notion 토큰을 입력해주세요', 'warning');
        return;
      }

      // Show loading state
      const originalText = saveBtn.textContent;
      saveBtn.textContent = '검증 중...';
      saveBtn.disabled = true;

      // Validate token through background script
      const response = await this.sendMessageToBackground({
        action: 'validate_notion_token',
        token: token
      });

      if (response.success && response.valid) {
        // Save token and user info
        await this.setStoredData('notionSettings', { 
          token: token, 
          userInfo: response.userInfo 
        });
        
        this.showToast('Notion 토큰이 성공적으로 저장되었습니다!', 'success');
        
        // Show connection success modal
        this.showNotionConnectionModal(response.userInfo);
        
      } else {
        this.showToast('유효하지 않은 Notion 토큰입니다', 'error');
      }

      // Restore button state
      saveBtn.textContent = originalText;
      saveBtn.disabled = false;

    } catch (error) {
      console.error('Error saving Notion token:', error);
      this.showToast('Notion 토큰 저장 중 오류가 발생했습니다', 'error');
      
      // Restore button state
      const saveBtn = document.getElementById('notion-save-btn');
      saveBtn.textContent = 'Save';
      saveBtn.disabled = false;
    }
  }

  async saveSettings() {
    try {
      const userPlan = await this.getStoredData('userPlan') || 'free';
      const isPlusUser = userPlan === 'plus';
      
      const settings = {
        keywords: {
          lecture: this.parseKeywords(document.getElementById('lecture-keywords').value),
          evaluation: this.parseKeywords(document.getElementById('evaluation-keywords').value),
          mentoring: this.parseKeywords(document.getElementById('mentoring-keywords').value)
        },
        // Only allow auto-sync for Plus users
        autoSync: isPlusUser ? document.getElementById('auto-sync').checked : false,
        syncInterval: isPlusUser ? parseInt(document.getElementById('sync-interval').value) : 30,
        export: {
          format: document.getElementById('export-format').value,
          includeDescription: document.getElementById('include-description').checked,
          includeLocation: document.getElementById('include-location').checked
        },
        notifications: {
          enabled: document.getElementById('notifications-enabled').checked,
          upcomingEvents: document.getElementById('upcoming-events').checked,
          syncComplete: document.getElementById('sync-complete').checked
        }
      };

      await this.setStoredData('settings', settings);
      
      // Update auto-sync in background script
      await this.sendMessageToBackground({
        action: 'update_auto_sync'
      });
      
      if (!isPlusUser && document.getElementById('auto-sync').checked) {
        this.showToast('Auto-sync feature requires Plus plan. Settings saved without auto-sync.', 'warning');
      } else {
        this.showToast('Settings saved successfully!', 'success');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      this.showToast('Error saving settings', 'error');
    }
  }

  parseKeywords(text) {
    return text.split(',').map(keyword => keyword.trim()).filter(keyword => keyword.length > 0);
  }

  async resetSettings() {
    try {
      const confirmed = confirm('Are you sure you want to reset all settings to default?');
      if (!confirmed) return;

      // Clear settings from storage
      await this.storage.removeSync('settings');
      
      // Reload page to show default settings
      location.reload();
    } catch (error) {
      console.error('Error resetting settings:', error);
      this.showToast('Error resetting settings', 'error');
    }
  }

  async exportData() {
    try {
      const data = await this.storage.exportToJSON();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `career-manager-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      
      URL.revokeObjectURL(url);
      this.showToast('Data exported successfully!', 'success');
    } catch (error) {
      console.error('Error exporting data:', error);
      this.showToast('Error exporting data', 'error');
    }
  }

  async importData() {
    const fileInput = document.getElementById('import-file');
    fileInput.click();
  }

  async handleFileImport(file) {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      // Validate data structure
      if (!data.events || !Array.isArray(data.events)) {
        throw new Error('Invalid backup file format');
      }

      const confirmed = confirm(`This will import ${data.events.length} events. Continue?`);
      if (!confirmed) return;

      await this.storage.importFromJSON(data);
      this.showToast('Data imported successfully!', 'success');
      
      // Reload settings
      await this.loadSettings();
    } catch (error) {
      console.error('Error importing data:', error);
      this.showToast('Error importing data: ' + error.message, 'error');
    }
  }

  async clearData() {
    try {
      const confirmed = confirm('Are you sure you want to clear all data? This action cannot be undone.');
      if (!confirmed) return;

      const doubleConfirmed = confirm('This will permanently delete all your career events and settings. Are you absolutely sure?');
      if (!doubleConfirmed) return;

      await this.storage.clearAllData();
      this.showToast('All data cleared successfully!', 'success');
      
      // Reload page
      setTimeout(() => {
        location.reload();
      }, 1000);
    } catch (error) {
      console.error('Error clearing data:', error);
      this.showToast('Error clearing data', 'error');
    }
  }

  openPricingPage() {
    // Navigate in same window
    window.location.href = chrome.runtime.getURL('pricing.html');
  }

  openDashboard() {
    // Navigate to popup with dashboard parameter in same window
    window.location.href = chrome.runtime.getURL('popup.html?section=dashboard');
  }

  openHomePage() {
    // Navigate in same window
    window.location.href = chrome.runtime.getURL('home.html');
  }

  async logout() {
    try {
      const confirmed = confirm('정말 로그아웃하시겠습니까? 모든 인증 정보가 삭제됩니다.');
      if (!confirmed) return;

      const btn = document.getElementById('logout-btn');
      const originalText = btn.textContent;
      btn.textContent = '로그아웃 중...';
      btn.disabled = true;

      const response = await this.sendMessageToBackground({
        action: 'logout'
      });

      if (response.success) {
        this.showToast('로그아웃되었습니다.', 'success');
        
        setTimeout(() => {
          // Redirect to home page
          window.location.href = chrome.runtime.getURL('home.html');
        }, 1000);
      } else {
        this.showToast('로그아웃 중 오류가 발생했습니다: ' + response.error, 'error');
        btn.textContent = originalText;
        btn.disabled = false;
      }
    } catch (error) {
      console.error('Logout error:', error);
      this.showToast('로그아웃 중 오류가 발생했습니다.', 'error');
      
      const btn = document.getElementById('logout-btn');
      btn.textContent = '로그아웃';
      btn.disabled = false;
    }
  }

  showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.classList.add('show');

    setTimeout(() => {
      toast.classList.remove('show');
    }, 3000);
  }

  // Utility methods
  showLoading(element) {
    element.classList.add('loading');
  }

  hideLoading(element) {
    element.classList.remove('loading');
  }

  validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  }

  validateUrl(url) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  // Storage utility methods
  async getStoredData(key) {
    return new Promise((resolve) => {
      chrome.storage.local.get([key], (result) => {
        resolve(result[key]);
      });
    });
  }

  async setStoredData(key, value) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [key]: value }, resolve);
    });
  }

  async removeStoredData(key) {
    return new Promise((resolve) => {
      chrome.storage.local.remove([key], resolve);
    });
  }

  async sendMessageToBackground(message) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(response);
        }
      });
    });
  }

  showNotionConnectionModal(userInfo) {
    // Create modal HTML
    const modalHTML = `
      <div class="modal-overlay" id="notion-success-modal" style="display: flex;">
        <div class="modal">
          <div class="modal-header">
            <div class="success-icon">✓</div>
            <h2 class="modal-title">Notion 연동 성공!</h2>
          </div>
          <div class="modal-body">
            <p class="modal-message">Notion 계정이 성공적으로 연결되었습니다.</p>
            <div class="user-info">
              <div class="user-detail">
                <strong>사용자:</strong> ${userInfo.name || 'Unknown'}
              </div>
              <div class="user-detail">
                <strong>이메일:</strong> ${userInfo.person?.email || 'N/A'}
              </div>
            </div>
            <div class="features-info">
              <h4>이제 다음 기능을 사용할 수 있습니다:</h4>
              <ul>
                <li>📝 캘린더 이벤트를 Notion 데이터베이스로 동기화</li>
                <li>⏱️ 자동 시간 계산 및 주간 통계</li>
                <li>📊 활동 유형별 분류 및 분석</li>
              </ul>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-primary btn-modal" id="notion-modal-close">확인</button>
          </div>
        </div>
      </div>
    `;

    // Add modal to DOM
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Add close event listener
    document.getElementById('notion-modal-close').addEventListener('click', () => {
      document.getElementById('notion-success-modal').remove();
    });

    // Close on overlay click
    document.getElementById('notion-success-modal').addEventListener('click', (e) => {
      if (e.target.id === 'notion-success-modal') {
        document.getElementById('notion-success-modal').remove();
      }
    });
  }

  async checkUserPlan() {
    try {
      const userPlan = await this.getStoredData('userPlan') || 'free';
      const isPlusUser = userPlan === 'plus';
      const isDevelopment = process.env.NODE_ENV === 'development' || process.env.DEBUG === 'true';
      
      console.log('User plan check:', { userPlan, isPlusUser, isDevelopment });
      
      // Enable Notion settings for Plus users or in development mode
      const notionTokenInput = document.getElementById('notion-token');
      const notionSaveBtn = document.getElementById('notion-save-btn');
      
      if (isPlusUser || isDevelopment) {
        notionTokenInput.disabled = false;
        notionTokenInput.placeholder = 'secret_...';
        notionSaveBtn.disabled = false;
        
        if (isDevelopment) {
          console.log('Development mode: Notion settings enabled for all users');
        }
      } else {
        notionTokenInput.disabled = true;
        notionTokenInput.placeholder = '(Plus 요금제에서 사용할 수 있습니다.)';
        notionSaveBtn.disabled = true;
      }
      
      // Disable auto-sync settings for free users (unless in development)
      const autoSyncCheckbox = document.getElementById('auto-sync');
      const syncIntervalSelect = document.getElementById('sync-interval');
      
      if (!isPlusUser && !isDevelopment) {
        autoSyncCheckbox.disabled = true;
        autoSyncCheckbox.checked = false;
        syncIntervalSelect.disabled = true;
        
        // Add visual indication
        const autoSyncItem = autoSyncCheckbox.closest('.setting-item');
        const syncIntervalItem = syncIntervalSelect.closest('.setting-item');
        
        autoSyncItem.style.opacity = '0.6';
        syncIntervalItem.style.opacity = '0.6';
      }
    } catch (error) {
      console.error('Error checking user plan:', error);
    }
  }

  getDefaultSettings() {
    return {
      keywords: {
        lecture: ['강의', '특강', '수업', 'lecture', 'seminar'],
        evaluation: ['심사', '평가', '검토', 'evaluation', 'review'],
        mentoring: ['멘토링', '코칭', '상담', 'mentoring', 'coaching']
      },
      autoSync: true,
      syncInterval: 30,
      export: {
        format: 'spreadsheet',
        includeDescription: true,
        includeLocation: true
      },
      notifications: {
        enabled: true,
        upcomingEvents: true,
        syncComplete: false
      }
    };
  }
}

// Initialize options page when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new CareerManagerOptions();
});