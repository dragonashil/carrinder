// Options page script
class CareerManagerOptions {
  constructor() {
    this.init();
  }

  async init() {
    await this.loadSettings();
    this.setupEventListeners();
    this.checkAuthStatus();
    await this.checkUserPlan();
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
      const notionToken = await this.getStoredData('notion_token');
      if (notionToken) {
        document.getElementById('notion-token').value = notionToken;
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
      // Check Google Calendar auth
      const googleAuth = await this.getStoredData('google_auth');
      const googleStatus = document.getElementById('google-status');
      const googleBtn = document.getElementById('google-connect-btn');

      if (googleAuth && googleAuth.access_token) {
        googleStatus.textContent = 'Connected';
        googleStatus.className = 'auth-status connected';
        googleBtn.textContent = 'Disconnect';
      } else {
        googleStatus.textContent = 'Not connected';
        googleStatus.className = 'auth-status disconnected';
        googleBtn.textContent = 'Connect';
      }

      // Check Google Drive auth
      const driveAuth = await this.getStoredData('drive_auth');
      const driveStatus = document.getElementById('drive-status');
      const driveBtn = document.getElementById('drive-connect-btn');

      if (driveAuth && driveAuth.access_token) {
        driveStatus.textContent = 'Connected';
        driveStatus.className = 'auth-status connected';
        driveBtn.textContent = 'Disconnect';
      } else {
        driveStatus.textContent = 'Not connected';
        driveStatus.className = 'auth-status disconnected';
        driveBtn.textContent = 'Connect';
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
      
      if (!token) {
        this.showToast('Please enter a Notion token', 'warning');
        return;
      }

      // Validate token
      const isValid = await this.auth.validateNotionToken(token);
      if (!isValid) {
        this.showToast('Invalid Notion token', 'error');
        return;
      }

      // Save token
      await this.setStoredData('notion_token', token);
      this.showToast('Notion token saved successfully!', 'success');
    } catch (error) {
      console.error('Error saving Notion token:', error);
      this.showToast('Error saving Notion token', 'error');
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
    chrome.tabs.create({
      url: chrome.runtime.getURL('pricing.html')
    });
  }

  openHomePage() {
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

  async checkUserPlan() {
    try {
      const userPlan = await this.getStoredData('userPlan') || 'free';
      const isPlusUser = userPlan === 'plus';
      
      // Disable auto-sync settings for free users
      const autoSyncCheckbox = document.getElementById('auto-sync');
      const syncIntervalSelect = document.getElementById('sync-interval');
      
      if (!isPlusUser) {
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