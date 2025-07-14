// Popup script for Career Manager Chrome Extension
class CareerManagerPopup {
  constructor() {
    this.isAuthenticated = false;
    this.events = [];
    this.init();
  }

  async init() {
    this.setupEventListeners();
    await this.checkAuthStatus();
    await this.loadEvents();
    await this.loadSpreadsheetSummary();
    this.updateUI();
  }

  setupEventListeners() {
    // Authentication buttons
    document.getElementById('google-auth-btn').addEventListener('click', () => {
      this.authenticateGoogle();
    });

    document.getElementById('drive-auth-btn').addEventListener('click', () => {
      this.authenticateDrive();
    });

    // Action buttons
    document.getElementById('sync-btn').addEventListener('click', () => {
      this.syncEvents();
    });

    document.getElementById('sync-sheets-btn').addEventListener('click', () => {
      this.syncToSpreadsheets();
    });

    document.getElementById('settings-btn').addEventListener('click', () => {
      this.openSettings();
    });
  }

  async checkAuthStatus() {
    try {
      // Check Google Calendar authentication
      const googleAuth = await this.getStoredAuth('google_auth');
      const googleStatus = document.getElementById('google-auth-status');
      const googleBtn = document.getElementById('google-auth-btn');

      if (googleAuth && googleAuth.access_token) {
        googleStatus.textContent = 'Connected';
        googleStatus.classList.add('connected');
        googleBtn.textContent = 'Disconnect';
        this.isAuthenticated = true;
      } else {
        googleStatus.textContent = 'Not connected';
        googleStatus.classList.remove('connected');
        googleBtn.textContent = 'Connect';
        this.isAuthenticated = false;
      }

      // Check Google Drive authentication
      const driveAuth = await this.getStoredAuth('drive_auth');
      const driveStatus = document.getElementById('drive-auth-status');
      const driveBtn = document.getElementById('drive-auth-btn');

      if (driveAuth && driveAuth.access_token) {
        driveStatus.textContent = 'Connected';
        driveStatus.classList.add('connected');
        driveBtn.textContent = 'Disconnect';
      } else {
        driveStatus.textContent = 'Not connected';
        driveStatus.classList.remove('connected');
        driveBtn.textContent = 'Connect';
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
    }
  }

  async getStoredAuth(key) {
    return new Promise((resolve) => {
      chrome.storage.local.get([key], (result) => {
        resolve(result[key]);
      });
    });
  }

  async authenticateGoogle() {
    try {
      const btn = document.getElementById('google-auth-btn');
      const originalText = btn.textContent;
      btn.textContent = 'Connecting...';
      btn.disabled = true;

      // Send message to background script to handle authentication
      chrome.runtime.sendMessage({
        action: 'authenticate_google'
      }, (response) => {
        if (response.success) {
          this.isAuthenticated = true;
          this.checkAuthStatus();
          this.loadEvents();
        } else {
          console.error('Authentication failed:', response.error);
          this.showError('Google authentication failed. Please try again.');
        }
        
        btn.textContent = originalText;
        btn.disabled = false;
      });
    } catch (error) {
      console.error('Error during Google authentication:', error);
      this.showError('Authentication error occurred.');
    }
  }

  async authenticateDrive() {
    try {
      const btn = document.getElementById('drive-auth-btn');
      const originalText = btn.textContent;
      btn.textContent = 'Connecting...';
      btn.disabled = true;

      // Send message to background script to handle Drive authentication
      chrome.runtime.sendMessage({
        action: 'authenticate_drive'
      }, (response) => {
        if (response.success) {
          this.checkAuthStatus();
        } else {
          console.error('Drive authentication failed:', response.error);
          this.showError('Google Drive authentication failed. Please try again.');
        }
        
        btn.textContent = originalText;
        btn.disabled = false;
      });
    } catch (error) {
      console.error('Error during Drive authentication:', error);
      this.showError('Authentication error occurred.');
    }
  }

  async loadEvents() {
    try {
      // Load events from storage
      const storedEvents = await this.getStoredData('career_events');
      this.events = storedEvents || [];
      this.updateEventsList();
      this.updateStats();
    } catch (error) {
      console.error('Error loading events:', error);
    }
  }

  async getStoredData(key) {
    return new Promise((resolve) => {
      chrome.storage.local.get([key], (result) => {
        resolve(result[key]);
      });
    });
  }

  updateUI() {
    const authSection = document.getElementById('auth-section');
    const dashboard = document.getElementById('dashboard');
    const syncStatus = document.getElementById('sync-status');
    const statusIndicator = document.getElementById('status-indicator');
    const statusText = document.getElementById('status-text');

    if (this.isAuthenticated) {
      authSection.style.display = 'none';
      dashboard.style.display = 'block';
      statusIndicator.classList.add('connected');
      statusText.textContent = 'Connected';
    } else {
      authSection.style.display = 'block';
      dashboard.style.display = 'none';
      statusIndicator.classList.remove('connected');
      statusText.textContent = 'Not connected';
    }
  }

  updateEventsList() {
    const eventsList = document.getElementById('events-list');
    const emptyState = document.getElementById('empty-state');

    if (this.events.length === 0) {
      emptyState.style.display = 'block';
      return;
    }

    emptyState.style.display = 'none';

    // Get recent events (last 10)
    const recentEvents = this.events
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 10);

    eventsList.innerHTML = recentEvents.map(event => this.createEventHTML(event)).join('');
  }

  createEventHTML(event) {
    const eventDate = new Date(event.date).toLocaleDateString('ko-KR');
    const eventTime = event.startTime ? new Date(event.startTime).toLocaleTimeString('ko-KR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    }) : '';

    return `
      <div class="event-item">
        <div class="event-title">${event.title}</div>
        <div class="event-meta">
          <span class="event-type ${event.type}">${this.getTypeLabel(event.type)}</span>
          <span>${eventDate}</span>
          ${eventTime ? `<span>${eventTime}</span>` : ''}
          ${event.location ? `<span>${event.location}</span>` : ''}
        </div>
      </div>
    `;
  }

  getTypeLabel(type) {
    const labels = {
      lecture: 'Lecture',
      evaluation: 'Evaluation',
      mentoring: 'Mentoring',
      other: 'Other'
    };
    return labels[type] || 'Other';
  }

  updateStats() {
    const totalEvents = this.events.length;
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    const thisMonthEvents = this.events.filter(event => {
      const eventDate = new Date(event.date);
      return eventDate.getMonth() === currentMonth && eventDate.getFullYear() === currentYear;
    }).length;

    const syncedEvents = this.events.filter(event => event.synced && event.synced.googleSheets).length;

    document.getElementById('total-events').textContent = totalEvents;
    document.getElementById('this-month').textContent = thisMonthEvents;
    document.getElementById('synced-events').textContent = syncedEvents;
  }

  async syncEvents() {
    try {
      const syncBtn = document.getElementById('sync-btn');
      const originalText = syncBtn.textContent;
      syncBtn.textContent = 'Syncing...';
      syncBtn.disabled = true;

      // Send message to background script to sync events
      chrome.runtime.sendMessage({
        action: 'sync_events'
      }, (response) => {
        if (response.success) {
          this.loadEvents();
          this.showSuccess('Events synced successfully!');
        } else {
          console.error('Sync failed:', response.error);
          this.showError('Sync failed. Please try again.');
        }
        
        syncBtn.textContent = originalText;
        syncBtn.disabled = false;
      });
    } catch (error) {
      console.error('Error during sync:', error);
      this.showError('Sync error occurred.');
    }
  }

  async syncToSpreadsheets() {
    try {
      const syncBtn = document.getElementById('sync-sheets-btn');
      const originalText = syncBtn.textContent;
      syncBtn.textContent = 'Syncing...';
      syncBtn.disabled = true;

      // Send message to background script to sync to spreadsheets
      chrome.runtime.sendMessage({
        action: 'sync_to_spreadsheets'
      }, (response) => {
        if (response.success) {
          this.loadEvents(); // Reload to update sync status
          this.loadSpreadsheetSummary(); // Update spreadsheet summary
          this.showSuccess(`Synced ${response.results.synced} events to spreadsheets!`);
        } else {
          console.error('Spreadsheet sync failed:', response.error);
          this.showError('Failed to sync to spreadsheets. Please try again.');
        }
        
        syncBtn.textContent = originalText;
        syncBtn.disabled = false;
      });
    } catch (error) {
      console.error('Error during spreadsheet sync:', error);
      this.showError('Spreadsheet sync error occurred.');
    }
  }

  async loadSpreadsheetSummary() {
    try {
      chrome.runtime.sendMessage({
        action: 'get_spreadsheet_summary'
      }, (response) => {
        if (response.success) {
          this.updateSpreadsheetStatus(response.summary);
        }
      });
    } catch (error) {
      console.error('Error loading spreadsheet summary:', error);
    }
  }

  updateSpreadsheetStatus(summary) {
    const roles = ['instructor', 'judge', 'mentor'];
    
    roles.forEach(role => {
      const element = document.getElementById(`${role}-sheet`);
      if (element) {
        const statusElement = element.querySelector('.sheet-status');
        const buttonElement = element.querySelector('.btn-small');
        
        if (summary[role] && summary[role].exists) {
          statusElement.textContent = 'Created';
          statusElement.classList.add('created');
          buttonElement.disabled = false;
          buttonElement.setAttribute('data-url', summary[role].url);
        } else {
          statusElement.textContent = 'Not created';
          statusElement.classList.remove('created');
          buttonElement.disabled = true;
          buttonElement.removeAttribute('data-url');
        }
      }
    });
  }

  openSettings() {
    chrome.runtime.openOptionsPage();
  }

  showError(message) {
    console.error(message);
    this.showToast(message, 'error');
  }

  showSuccess(message) {
    console.log(message);
    this.showToast(message, 'success');
  }

  showToast(message, type = 'info') {
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    
    // Add to container
    let toastContainer = document.querySelector('.toast-container');
    if (!toastContainer) {
      toastContainer = document.createElement('div');
      toastContainer.className = 'toast-container';
      document.body.appendChild(toastContainer);
    }
    
    toastContainer.appendChild(toast);
    
    // Animate in
    setTimeout(() => toast.classList.add('show'), 100);
    
    // Remove after 3 seconds
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 300);
    }, 3000);
  }
}

// Global function for opening spreadsheets
function openSpreadsheet(role) {
  const button = document.querySelector(`#${role}-sheet .btn-small`);
  const url = button.getAttribute('data-url');
  
  if (url) {
    chrome.tabs.create({ url: url });
  }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new CareerManagerPopup();
});