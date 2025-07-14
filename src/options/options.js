// Options page script
class CareerManagerOptions {
  constructor() {
    this.storage = new StorageManager();
    this.auth = new AuthManager();
    this.init();
  }

  async init() {
    await this.loadSettings();
    this.setupEventListeners();
    this.checkAuthStatus();
  }

  async loadSettings() {
    try {
      const settings = await this.storage.getSettings();
      
      // Load keyword settings
      document.getElementById('lecture-keywords').value = settings.keywords.lecture.join(', ');
      document.getElementById('evaluation-keywords').value = settings.keywords.evaluation.join(', ');
      document.getElementById('mentoring-keywords').value = settings.keywords.mentoring.join(', ');
      
      // Load sync settings
      document.getElementById('auto-sync').checked = settings.autoSync;
      document.getElementById('sync-interval').value = settings.syncInterval;
      
      // Load export settings
      document.getElementById('export-format').value = settings.export.format;
      document.getElementById('include-description').checked = settings.export.includeDescription;
      document.getElementById('include-location').checked = settings.export.includeLocation;
      
      // Load notification settings
      document.getElementById('notifications-enabled').checked = settings.notifications.enabled;
      document.getElementById('upcoming-events').checked = settings.notifications.upcomingEvents;
      document.getElementById('sync-complete').checked = settings.notifications.syncComplete;
      
      // Load Notion token
      const notionToken = await this.storage.getAuthToken('notion');
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
      const googleAuth = await this.auth.isGoogleAuthenticated();
      const googleStatus = document.getElementById('google-status');
      const googleBtn = document.getElementById('google-connect-btn');

      if (googleAuth) {
        googleStatus.textContent = 'Connected';
        googleStatus.className = 'auth-status connected';
        googleBtn.textContent = 'Disconnect';
      } else {
        googleStatus.textContent = 'Not connected';
        googleStatus.className = 'auth-status disconnected';
        googleBtn.textContent = 'Connect';
      }

      // Check Google Drive auth (same as Calendar for now)
      const driveStatus = document.getElementById('drive-status');
      const driveBtn = document.getElementById('drive-connect-btn');

      if (googleAuth) {
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

        // Request authentication
        const result = await this.auth.handleAuthFlow('google', [
          'https://www.googleapis.com/auth/calendar.readonly',
          'https://www.googleapis.com/auth/drive.file',
          'https://www.googleapis.com/auth/spreadsheets'
        ]);

        if (result.success) {
          this.showToast('Google authentication successful!', 'success');
          this.checkAuthStatus();
        } else {
          this.showToast(result.error, 'error');
        }
      } else {
        // Disconnect
        await this.auth.revokeGoogleToken();
        this.showToast('Google account disconnected', 'info');
        this.checkAuthStatus();
      }
      
      btn.textContent = originalText;
      btn.disabled = false;
    } catch (error) {
      console.error('Google auth error:', error);
      this.showToast('Authentication error occurred', 'error');
    }
  }

  async handleDriveAuth() {
    // For now, Drive auth is same as Google auth
    await this.handleGoogleAuth();
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
      await this.auth.setNotionToken(token);
      this.showToast('Notion token saved successfully!', 'success');
    } catch (error) {
      console.error('Error saving Notion token:', error);
      this.showToast('Error saving Notion token', 'error');
    }
  }

  async saveSettings() {
    try {
      const settings = {
        keywords: {
          lecture: this.parseKeywords(document.getElementById('lecture-keywords').value),
          evaluation: this.parseKeywords(document.getElementById('evaluation-keywords').value),
          mentoring: this.parseKeywords(document.getElementById('mentoring-keywords').value)
        },
        autoSync: document.getElementById('auto-sync').checked,
        syncInterval: parseInt(document.getElementById('sync-interval').value),
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

      await this.storage.saveSettings(settings);
      this.showToast('Settings saved successfully!', 'success');
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
}

// Initialize options page when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new CareerManagerOptions();
});