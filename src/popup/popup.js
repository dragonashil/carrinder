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

    // Data collection configuration
    this.setupCollectionEventListeners();

    // Action buttons (legacy - keeping for compatibility)
    const syncBtn = document.getElementById('sync-btn');
    if (syncBtn) {
      syncBtn.addEventListener('click', () => {
        this.syncEvents();
      });
    }

    const syncSheetsBtn = document.getElementById('sync-sheets-btn');
    if (syncSheetsBtn) {
      syncSheetsBtn.addEventListener('click', () => {
        this.syncToSpreadsheets();
      });
    }

    const settingsBtn = document.getElementById('settings-btn');
    if (settingsBtn) {
      settingsBtn.addEventListener('click', () => {
        this.openSettings();
      });
    }
  }

  setupCollectionEventListeners() {
    // Period type selection
    const periodType = document.getElementById('period-type');
    if (periodType) {
      periodType.addEventListener('change', (e) => {
        this.handlePeriodTypeChange(e.target.value);
      });
    }

    // Data collection button
    const collectBtn = document.getElementById('collect-data-btn');
    if (collectBtn) {
      collectBtn.addEventListener('click', () => {
        this.startDataCollection();
      });
    }

    // Folder selection button
    const folderBtn = document.getElementById('select-folder-btn');
    if (folderBtn) {
      folderBtn.addEventListener('click', () => {
        this.selectDriveFolder();
      });
    }

    // New collection button
    const newCollectionBtn = document.getElementById('new-collection-btn');
    if (newCollectionBtn) {
      newCollectionBtn.addEventListener('click', () => {
        this.resetCollection();
      });
    }
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

  // === 새로운 데이터 수집 기능들 ===

  handlePeriodTypeChange(periodType) {
    // Hide all selectors first
    document.getElementById('year-selector').style.display = 'none';
    document.getElementById('month-selector').style.display = 'none';
    document.getElementById('custom-selector').style.display = 'none';

    // Show selected period selector
    switch (periodType) {
      case 'year':
        document.getElementById('year-selector').style.display = 'block';
        this.populateYearOptions();
        break;
      case 'month':
        document.getElementById('month-selector').style.display = 'block';
        this.populateMonthOptions();
        break;
      case 'custom':
        document.getElementById('custom-selector').style.display = 'block';
        this.setDefaultCustomDates();
        break;
    }
  }

  populateYearOptions() {
    const yearSelect = document.getElementById('year-select');
    const currentYear = new Date().getFullYear();
    
    yearSelect.innerHTML = '';
    for (let year = currentYear; year >= currentYear - 5; year--) {
      const option = document.createElement('option');
      option.value = year;
      option.textContent = `${year}년`;
      yearSelect.appendChild(option);
    }
  }

  populateMonthOptions() {
    const monthSelect = document.getElementById('month-select');
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();
    
    monthSelect.innerHTML = '';
    
    // Last 12 months
    for (let i = 0; i < 12; i++) {
      const date = new Date(currentYear, currentMonth - i, 1);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      
      const option = document.createElement('option');
      option.value = `${year}-${month.toString().padStart(2, '0')}`;
      option.textContent = `${year}년 ${month}월`;
      monthSelect.appendChild(option);
    }
  }

  setDefaultCustomDates() {
    const today = new Date();
    const yearAgo = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());
    
    document.getElementById('end-date').value = today.toISOString().split('T')[0];
    document.getElementById('start-date').value = yearAgo.toISOString().split('T')[0];
  }

  async selectDriveFolder() {
    try {
      this.showToast('구글 드라이브 폴더 선택 기능을 구현 중입니다...', 'info');
      
      // TODO: Implement Google Drive folder picker
      // For now, use root folder
      const selectedFolder = document.getElementById('selected-folder');
      selectedFolder.innerHTML = '<span class="folder-path">루트 폴더 (기본)</span>';
      
    } catch (error) {
      this.showError('폴더 선택 중 오류 발생: ' + error.message);
    }
  }

  async startDataCollection() {
    try {
      // Validate authentication
      if (!this.isAuthenticated) {
        this.showError('먼저 Google 계정에 연결해주세요.');
        return;
      }

      // Get collection configuration
      const config = this.getCollectionConfig();
      
      if (!this.validateCollectionConfig(config)) {
        return;
      }

      // Show progress UI
      this.showCollectionProgress();
      
      // Start collection process
      await this.collectCalendarData(config);
      
    } catch (error) {
      this.showError('데이터 수집 중 오류 발생: ' + error.message);
      this.hideCollectionProgress();
    }
  }

  getCollectionConfig() {
    const periodType = document.getElementById('period-type').value;
    let dateRange = {};

    switch (periodType) {
      case 'year':
        const year = document.getElementById('year-select').value;
        dateRange = {
          start: `${year}-01-01T00:00:00Z`,
          end: `${year}-12-31T23:59:59Z`
        };
        break;
      case 'month':
        const monthValue = document.getElementById('month-select').value;
        const [y, m] = monthValue.split('-');
        const lastDay = new Date(parseInt(y), parseInt(m), 0).getDate();
        dateRange = {
          start: `${y}-${m}-01T00:00:00Z`,
          end: `${y}-${m}-${lastDay}T23:59:59Z`
        };
        break;
      case 'custom':
        const startDate = document.getElementById('start-date').value;
        const endDate = document.getElementById('end-date').value;
        dateRange = {
          start: `${startDate}T00:00:00Z`,
          end: `${endDate}T23:59:59Z`
        };
        break;
    }

    const careerTypes = [];
    if (document.getElementById('instructor-type').checked) careerTypes.push('instructor');
    if (document.getElementById('judge-type').checked) careerTypes.push('judge');
    if (document.getElementById('mentor-type').checked) careerTypes.push('mentor');
    if (document.getElementById('other-type').checked) careerTypes.push('other');

    const keywords = document.getElementById('keyword-filter').value
      .split(',')
      .map(k => k.trim())
      .filter(k => k.length > 0);

    return {
      dateRange,
      careerTypes,
      keywords,
      periodType,
      selectedFolder: 'root' // TODO: Implement folder selection
    };
  }

  validateCollectionConfig(config) {
    if (config.careerTypes.length === 0) {
      this.showError('최소 하나의 직업군을 선택해주세요.');
      return false;
    }

    if (new Date(config.dateRange.start) >= new Date(config.dateRange.end)) {
      this.showError('시작 날짜가 종료 날짜보다 늦습니다.');
      return false;
    }

    return true;
  }

  showCollectionProgress() {
    document.querySelector('.collection-config').style.display = 'none';
    document.getElementById('collection-progress').style.display = 'block';
    document.getElementById('collection-results').style.display = 'none';
  }

  hideCollectionProgress() {
    document.querySelector('.collection-config').style.display = 'block';
    document.getElementById('collection-progress').style.display = 'none';
  }

  updateProgress(percentage, status) {
    document.getElementById('progress-fill').style.width = `${percentage}%`;
    document.getElementById('progress-status').textContent = status;
  }

  async collectCalendarData(config) {
    try {
      this.updateProgress(10, '캘린더 연결 중...');
      
      // Get calendar events using background script
      const events = await this.sendMessageToBackground({
        action: 'getCalendarEvents',
        params: {
          timeMin: config.dateRange.start,
          timeMax: config.dateRange.end
        }
      });

      this.updateProgress(30, '이벤트 데이터 분석 중...');

      // Process and filter events
      const processedEvents = await this.processEvents(events, config);

      this.updateProgress(60, '스프레드시트 생성 중...');

      // Create spreadsheets by career type
      const createdSheets = await this.createSpreadsheets(processedEvents, config);

      this.updateProgress(90, '데이터 입력 중...');

      // Populate spreadsheets with data
      await this.populateSpreadsheets(createdSheets, processedEvents);

      this.updateProgress(100, '완료!');

      // Show results
      setTimeout(() => {
        this.showCollectionResults(processedEvents, createdSheets);
      }, 1000);

    } catch (error) {
      throw error;
    }
  }

  async processEvents(events, config) {
    const DataProcessor = (await import('../utils/dataProcessor.js')).default;
    const processor = new DataProcessor();
    
    const processedEvents = [];
    
    for (const event of events) {
      try {
        // Classify event
        const classification = processor.classifyByRole(event);
        
        // Filter by career types
        if (!config.careerTypes.includes(classification.role)) {
          continue;
        }
        
        // Filter by keywords if specified
        if (config.keywords.length > 0) {
          const eventText = `${event.summary || ''} ${event.description || ''}`.toLowerCase();
          const hasKeyword = config.keywords.some(keyword => 
            eventText.includes(keyword.toLowerCase())
          );
          if (!hasKeyword) {
            continue;
          }
        }
        
        processedEvents.push({
          ...event,
          ...classification,
          processedAt: new Date().toISOString()
        });
        
      } catch (error) {
        console.warn('Event processing failed:', error, event);
      }
    }
    
    return processedEvents;
  }

  async createSpreadsheets(events, config) {
    const createdSheets = {};
    const groupedEvents = this.groupEventsByRole(events);
    
    for (const [role, roleEvents] of Object.entries(groupedEvents)) {
      if (roleEvents.length === 0) continue;
      
      const sheetTitle = this.generateSheetTitle(role, config);
      
      try {
        const sheetInfo = await this.sendMessageToBackground({
          action: 'createSpreadsheet',
          params: {
            title: sheetTitle,
            role: role
          }
        });
        
        createdSheets[role] = {
          ...sheetInfo,
          events: roleEvents
        };
        
      } catch (error) {
        console.error(`Failed to create sheet for ${role}:`, error);
      }
    }
    
    return createdSheets;
  }

  groupEventsByRole(events) {
    return events.reduce((groups, event) => {
      const role = event.role || 'other';
      if (!groups[role]) groups[role] = [];
      groups[role].push(event);
      return groups;
    }, {});
  }

  generateSheetTitle(role, config) {
    const roleNames = {
      instructor: '강사활동',
      judge: '심사활동', 
      mentor: '멘토링활동',
      other: '기타활동'
    };
    
    const roleName = roleNames[role] || '기타활동';
    const dateStr = this.formatDateRangeForTitle(config);
    
    return `${roleName}_${dateStr}`;
  }

  formatDateRangeForTitle(config) {
    const { periodType } = config;
    const now = new Date();
    
    switch (periodType) {
      case 'year':
        return document.getElementById('year-select').value;
      case 'month':
        return document.getElementById('month-select').value.replace('-', '년') + '월';
      case 'custom':
        const start = document.getElementById('start-date').value.replace(/-/g, '');
        const end = document.getElementById('end-date').value.replace(/-/g, '');
        return `${start}_${end}`;
      default:
        return now.getFullYear().toString();
    }
  }

  async populateSpreadsheets(createdSheets, events) {
    for (const [role, sheetInfo] of Object.entries(createdSheets)) {
      try {
        await this.sendMessageToBackground({
          action: 'populateSpreadsheet',
          params: {
            spreadsheetId: sheetInfo.spreadsheetId,
            events: sheetInfo.events,
            role: role
          }
        });
      } catch (error) {
        console.error(`Failed to populate sheet for ${role}:`, error);
      }
    }
  }

  showCollectionResults(events, createdSheets) {
    document.getElementById('collection-progress').style.display = 'none';
    document.getElementById('collection-results').style.display = 'block';
    
    // Update stats
    document.getElementById('collected-count').textContent = events.length;
    document.getElementById('sheets-created').textContent = Object.keys(createdSheets).length;
    
    // Add sheet links
    const sheetsContainer = document.getElementById('created-sheets');
    sheetsContainer.innerHTML = '';
    
    for (const [role, sheetInfo] of Object.entries(createdSheets)) {
      const link = document.createElement('a');
      link.href = sheetInfo.webViewLink;
      link.target = '_blank';
      link.className = 'sheet-link';
      link.textContent = `${this.getRoleName(role)} (${sheetInfo.events.length}개)`;
      sheetsContainer.appendChild(link);
    }
  }

  getRoleName(role) {
    const names = {
      instructor: '강사활동',
      judge: '심사활동',
      mentor: '멘토링활동',
      other: '기타활동'
    };
    return names[role] || role;
  }

  resetCollection() {
    document.getElementById('collection-results').style.display = 'none';
    document.querySelector('.collection-config').style.display = 'block';
    
    // Reset form to defaults
    document.getElementById('period-type').value = 'year';
    this.handlePeriodTypeChange('year');
    document.getElementById('keyword-filter').value = '';
    
    // Reset checkboxes
    document.getElementById('instructor-type').checked = true;
    document.getElementById('judge-type').checked = true;
    document.getElementById('mentor-type').checked = true;
    document.getElementById('other-type').checked = false;
  }

  async sendMessageToBackground(message) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else if (response && response.error) {
          reject(new Error(response.error));
        } else {
          resolve(response);
        }
      });
    });
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