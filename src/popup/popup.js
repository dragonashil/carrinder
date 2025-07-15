// Popup script for Career Manager Chrome Extension
class CareerManagerPopup {
  constructor() {
    this.isAuthenticated = false;
    this.events = [];
    this.init();
  }

  async init() {
    this.driveSettings = {
      selectedFolderId: 'root',
      selectedFolderName: '루트 폴더',
      filenameTemplate: '{role}_{period}',
      customFilename: ''
    };
    this.currentFolderId = 'root';
    this.selectedFolderId = 'root';
    this.folderHistory = [];
    
    this.spreadsheetSettings = {
      type: 'new', // 'new' or 'existing'
      selectedSpreadsheetId: null,
      selectedSpreadsheetName: null
    };
    
    this.setupEventListeners();
    await this.checkAuthStatus();
    await this.loadEvents();
    await this.loadSpreadsheetSummary();
    await this.loadDriveSettings();
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

    const reconnectBtn = document.getElementById('reconnect-btn');
    if (reconnectBtn) {
      reconnectBtn.addEventListener('click', () => {
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

    // Modal continue button
    const modalContinueBtn = document.getElementById('modal-continue-btn');
    if (modalContinueBtn) {
      modalContinueBtn.addEventListener('click', () => {
        this.closeSuccessModal();
      });
    }

    // Filename configuration listeners
    this.setupFilenameListeners();
    
    // Folder modal listeners
    this.setupFolderModalListeners();
    
    // Spreadsheet selection listeners
    this.setupSpreadsheetListeners();
  }

  setupFilenameListeners() {
    // Radio button change
    const filenameRadios = document.querySelectorAll('input[name="filename-type"]');
    filenameRadios.forEach(radio => {
      radio.addEventListener('change', (e) => {
        this.handleFilenameTypeChange(e.target.value);
      });
    });

    // Template selection change
    const templateSelect = document.getElementById('filename-template');
    if (templateSelect) {
      templateSelect.addEventListener('change', () => {
        this.updateFilenamePreview();
      });
    }

    // Custom filename input
    const customInput = document.getElementById('custom-filename');
    if (customInput) {
      customInput.addEventListener('input', () => {
        this.updateFilenamePreview();
      });
    }

    // Initial setup
    this.updateFilenamePreview();
  }

  setupFolderModalListeners() {
    // Folder modal buttons
    const folderCancelBtn = document.getElementById('folder-cancel-btn');
    const folderSelectBtn = document.getElementById('folder-select-btn');
    const createFolderBtn = document.getElementById('create-folder-btn');
    const refreshFoldersBtn = document.getElementById('refresh-folders-btn');

    if (folderCancelBtn) {
      folderCancelBtn.addEventListener('click', () => {
        this.closeFolderModal();
      });
    }

    if (folderSelectBtn) {
      folderSelectBtn.addEventListener('click', () => {
        this.confirmFolderSelection();
      });
    }

    if (createFolderBtn) {
      createFolderBtn.addEventListener('click', () => {
        this.showCreateFolderModal();
      });
    }

    if (refreshFoldersBtn) {
      refreshFoldersBtn.addEventListener('click', () => {
        this.refreshFolderList();
      });
    }

    // Create folder modal buttons
    const createFolderCancelBtn = document.getElementById('create-folder-cancel-btn');
    const createFolderConfirmBtn = document.getElementById('create-folder-confirm-btn');

    if (createFolderCancelBtn) {
      createFolderCancelBtn.addEventListener('click', () => {
        this.closeCreateFolderModal();
      });
    }

    if (createFolderConfirmBtn) {
      createFolderConfirmBtn.addEventListener('click', () => {
        this.createNewFolder();
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
          this.showSuccessModal('Google Calendar', 'Google 캘린더가 성공적으로 연결되었습니다. 메인 페이지에서 데이터 수집을 시작하실 수 있습니다.');
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
          this.showSuccessModal('Google Drive', 'Google 드라이브가 성공적으로 연결되었습니다. 이제 모든 서비스가 연결되어 스프레드시트 생성이 가능합니다.');
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

    // Check if elements exist
    if (!eventsList || !emptyState) {
      console.warn('Events list or empty state element not found');
      return;
    }

    if (!this.events || this.events.length === 0) {
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
    if (!this.events || !Array.isArray(this.events)) {
      this.events = [];
    }

    const totalEvents = this.events.length;
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    const thisMonthEvents = this.events.filter(event => {
      const eventDate = new Date(event.date);
      return eventDate.getMonth() === currentMonth && eventDate.getFullYear() === currentYear;
    }).length;

    const syncedEvents = this.events.filter(event => event.synced && event.synced.googleSheets).length;

    const totalElement = document.getElementById('total-events');
    const thisMonthElement = document.getElementById('this-month');
    const syncedElement = document.getElementById('synced-events');

    if (totalElement) totalElement.textContent = totalEvents;
    if (thisMonthElement) thisMonthElement.textContent = thisMonthEvents;
    if (syncedElement) syncedElement.textContent = syncedEvents;
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
      // Check if Drive is authenticated
      const driveAuth = await this.getStoredAuth('drive_auth');
      if (!driveAuth || !driveAuth.access_token) {
        this.showError('구글 드라이브 인증이 필요합니다.');
        return;
      }

      // Load current settings
      await this.loadDriveSettings();
      
      // Show folder selection modal
      this.showFolderModal();
      
    } catch (error) {
      this.showError('폴더 선택 중 오류 발생: ' + error.message);
    }
  }

  async loadDriveSettings() {
    try {
      const response = await this.sendMessageToBackground({
        action: 'getDriveSettings'
      });
      
      if (response.success) {
        this.driveSettings = response.settings;
        this.updateFolderDisplay();
        this.updateFilenameSettings();
      }
    } catch (error) {
      console.error('Error loading drive settings:', error);
    }
  }

  async saveDriveSettings() {
    try {
      await this.sendMessageToBackground({
        action: 'saveDriveSettings',
        params: { settings: this.driveSettings }
      });
    } catch (error) {
      console.error('Error saving drive settings:', error);
    }
  }

  updateFolderDisplay() {
    const selectedFolder = document.getElementById('selected-folder');
    const folderName = this.driveSettings.selectedFolderName || '루트 폴더';
    selectedFolder.innerHTML = `<span class="folder-path">${folderName}</span>`;
  }

  updateFilenameSettings() {
    // Update filename type radio buttons
    const isCustom = this.driveSettings.customFilename && this.driveSettings.customFilename.trim();
    const templateRadio = document.querySelector('input[name="filename-type"][value="template"]');
    const customRadio = document.querySelector('input[name="filename-type"][value="custom"]');
    
    if (isCustom) {
      customRadio.checked = true;
      templateRadio.checked = false;
    } else {
      templateRadio.checked = true;
      customRadio.checked = false;
    }
    
    // Update template selection
    const templateSelect = document.getElementById('filename-template');
    if (templateSelect && this.driveSettings.filenameTemplate) {
      templateSelect.value = this.driveSettings.filenameTemplate;
    }
    
    // Update custom filename input
    const customInput = document.getElementById('custom-filename');
    if (customInput) {
      customInput.value = this.driveSettings.customFilename || '';
    }
    
    // Update UI state
    this.handleFilenameTypeChange(isCustom ? 'custom' : 'template');
  }

  handleFilenameTypeChange(type) {
    const templateSelect = document.getElementById('filename-template');
    const customInput = document.getElementById('custom-filename');
    
    if (type === 'custom') {
      templateSelect.disabled = true;
      customInput.disabled = false;
      customInput.focus();
    } else {
      templateSelect.disabled = false;
      customInput.disabled = true;
    }
    
    this.updateFilenamePreview();
  }

  updateFilenamePreview() {
    const previewElement = document.getElementById('filename-preview');
    const customRadio = document.querySelector('input[name="filename-type"][value="custom"]');
    
    let preview = '';
    
    if (customRadio.checked) {
      const customInput = document.getElementById('custom-filename');
      preview = customInput.value.trim() || '파일명을 입력하세요';
    } else {
      const templateSelect = document.getElementById('filename-template');
      const template = templateSelect.value;
      const roleNames = {
        instructor: '강사활동',
        judge: '심사활동',
        mentor: '멘토링활동',
        other: '기타활동'
      };
      
      // Get current period selection for preview
      const periodType = document.getElementById('period-type').value;
      let period = '';
      
      switch (periodType) {
        case 'year':
          period = new Date().getFullYear().toString();
          break;
        case 'month':
          const now = new Date();
          period = `${now.getFullYear()}년${(now.getMonth() + 1).toString().padStart(2, '0')}월`;
          break;
        case 'custom':
          period = '2025_01_01_2025_12_31';
          break;
      }
      
      preview = template
        .replace('{role}', roleNames.instructor)
        .replace('{period}', period)
        .replace('{year}', new Date().getFullYear().toString())
        .replace('{month}', (new Date().getMonth() + 1).toString().padStart(2, '0'))
        .replace('{date}', new Date().toISOString().split('T')[0].replace(/-/g, ''));
    }
    
    previewElement.textContent = preview;
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
      selectedFolder: this.driveSettings.selectedFolderId || 'root'
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
      const response = await this.sendMessageToBackground({
        action: 'getCalendarEvents',
        params: {
          timeMin: config.dateRange.start,
          timeMax: config.dateRange.end
        }
      });

      // Check if response is successful and has events
      if (!response.success) {
        throw new Error(response.error || '캘린더 데이터를 가져오는데 실패했습니다.');
      }

      // Extract events from response and ensure it's an array
      const events = Array.isArray(response.events) ? response.events : 
                    Array.isArray(response.items) ? response.items : 
                    Array.isArray(response) ? response : [];

      console.log('Retrieved events:', events.length, 'items');

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
    // Ensure events is an array
    if (!Array.isArray(events)) {
      console.error('Events is not an array:', events);
      return [];
    }

    // For now, use a simple classification instead of importing DataProcessor
    const processedEvents = [];
    
    for (const event of events) {
      try {
        // Simple classification based on keywords in title/description
        const classification = this.classifyEventByRole(event);
        
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

  classifyEventByRole(event) {
    const title = (event.summary || '').toLowerCase();
    const description = (event.description || '').toLowerCase();
    const text = `${title} ${description}`;
    
    // Simple keyword-based classification
    if (text.includes('강의') || text.includes('수업') || text.includes('특강') || 
        text.includes('워크샵') || text.includes('세미나') || text.includes('lecture')) {
      return { role: 'instructor', confidence: 0.8 };
    }
    
    if (text.includes('심사') || text.includes('평가') || text.includes('검토') || 
        text.includes('evaluation') || text.includes('review')) {
      return { role: 'judge', confidence: 0.8 };
    }
    
    if (text.includes('멘토링') || text.includes('코칭') || text.includes('상담') || 
        text.includes('mentoring') || text.includes('coaching')) {
      return { role: 'mentor', confidence: 0.8 };
    }
    
    return { role: 'other', confidence: 0.5 };
  }

  async createSpreadsheets(events, config) {
    // Ensure events is an array
    if (!Array.isArray(events)) {
      console.error('Events is not an array in createSpreadsheets:', events);
      return {};
    }

    const createdSheets = {};
    const groupedEvents = this.groupEventsByRole(events);
    
    for (const [role, roleEvents] of Object.entries(groupedEvents || {})) {
      if (!roleEvents || roleEvents.length === 0) continue;
      
      try {
        let response;
        
        if (this.spreadsheetSettings.type === 'existing' && this.spreadsheetSettings.selectedSpreadsheetId) {
          // Add new tab to existing spreadsheet
          const tabTitle = this.generateTabTitle(role, config);
          response = await this.sendMessageToBackground({
            action: 'addSheetTab',
            params: {
              spreadsheetId: this.spreadsheetSettings.selectedSpreadsheetId,
              tabTitle: tabTitle,
              role: role
            }
          });
        } else {
          // Create new spreadsheet
          const sheetTitle = this.generateSheetTitle(role, config);
          response = await this.sendMessageToBackground({
            action: 'createSpreadsheet',
            params: {
              title: sheetTitle,
              role: role,
              folderId: this.driveSettings.selectedFolderId || 'root'
            }
          });
        }
        
        if (response.success) {
          createdSheets[role] = {
            ...response,
            events: roleEvents
          };
        } else {
          console.error(`Failed to create sheet for ${role}:`, response.error);
        }
        
      } catch (error) {
        console.error(`Failed to create sheet for ${role}:`, error);
      }
    }
    
    return createdSheets;
  }

  generateTabTitle(role, config) {
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

  groupEventsByRole(events) {
    // Ensure events is an array
    if (!Array.isArray(events)) {
      console.error('Events is not an array in groupEventsByRole:', events);
      return {};
    }

    return events.reduce((groups, event) => {
      const role = event.role || 'other';
      if (!groups[role]) groups[role] = [];
      groups[role].push(event);
      return groups;
    }, {});
  }

  generateSheetTitle(role, config) {
    // Use custom filename if specified
    const customRadio = document.querySelector('input[name="filename-type"][value="custom"]');
    if (customRadio && customRadio.checked) {
      const customFilename = document.getElementById('custom-filename').value.trim();
      if (customFilename) {
        return customFilename;
      }
    }
    
    // Use template-based filename
    const templateSelect = document.getElementById('filename-template');
    const template = templateSelect ? templateSelect.value : '{role}_{period}';
    
    const roleNames = {
      instructor: '강사활동',
      judge: '심사활동', 
      mentor: '멘토링활동',
      other: '기타활동'
    };
    
    const roleName = roleNames[role] || '기타활동';
    const dateStr = this.formatDateRangeForTitle(config);
    
    return template
      .replace('{role}', roleName)
      .replace('{period}', dateStr)
      .replace('{year}', new Date().getFullYear().toString())
      .replace('{month}', (new Date().getMonth() + 1).toString().padStart(2, '0'))
      .replace('{date}', new Date().toISOString().split('T')[0].replace(/-/g, ''));
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
    if (!createdSheets || typeof createdSheets !== 'object') {
      console.error('createdSheets is not a valid object:', createdSheets);
      return;
    }

    for (const [role, sheetInfo] of Object.entries(createdSheets)) {
      try {
        if (!sheetInfo || !sheetInfo.spreadsheetId) {
          console.error(`Invalid sheet info for role ${role}:`, sheetInfo);
          continue;
        }

        await this.sendMessageToBackground({
          action: 'populateSpreadsheet',
          params: {
            spreadsheetId: sheetInfo.spreadsheetId,
            events: sheetInfo.events || [],
            role: role
          }
        });
      } catch (error) {
        console.error(`Failed to populate sheet for ${role}:`, error);
      }
    }
  }

  showCollectionResults(events, createdSheets) {
    const progressElement = document.getElementById('collection-progress');
    const resultsElement = document.getElementById('collection-results');
    const collectedCountElement = document.getElementById('collected-count');
    const sheetsCreatedElement = document.getElementById('sheets-created');
    const sheetsContainer = document.getElementById('created-sheets');

    if (progressElement) progressElement.style.display = 'none';
    if (resultsElement) resultsElement.style.display = 'block';
    
    // Update stats
    if (collectedCountElement) {
      collectedCountElement.textContent = Array.isArray(events) ? events.length : 0;
    }
    if (sheetsCreatedElement) {
      sheetsCreatedElement.textContent = createdSheets ? Object.keys(createdSheets).length : 0;
    }
    
    // Add sheet links
    if (sheetsContainer) {
      sheetsContainer.innerHTML = '';
      
      if (createdSheets && typeof createdSheets === 'object') {
        for (const [role, sheetInfo] of Object.entries(createdSheets)) {
          if (sheetInfo && sheetInfo.webViewLink) {
            const link = document.createElement('a');
            link.href = sheetInfo.webViewLink;
            link.target = '_blank';
            link.className = 'sheet-link';
            link.textContent = `${this.getRoleName(role)} (${Array.isArray(sheetInfo.events) ? sheetInfo.events.length : 0}개)`;
            sheetsContainer.appendChild(link);
          }
        }
      }
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

  // === 모달 관련 메서드들 ===

  async showSuccessModal(serviceName, message) {
    const modal = document.getElementById('success-modal');
    const modalMessage = document.getElementById('modal-message');
    const connectedServices = document.getElementById('connected-services');

    // Set message
    modalMessage.textContent = message;

    // Get all connected services and show them
    await this.updateConnectedServices(connectedServices);

    // Show modal with animation
    modal.style.display = 'flex';
    setTimeout(() => {
      modal.classList.add('show');
    }, 10);
  }

  async updateConnectedServices(container) {
    container.innerHTML = '';
    
    try {
      // Check which services are connected
      const googleAuth = await this.getStoredAuth('google_auth');
      const driveAuth = await this.getStoredAuth('drive_auth');
      
      if (googleAuth && googleAuth.access_token) {
        this.addServiceItem(container, 'Google Calendar', '✓');
      }
      
      if (driveAuth && driveAuth.access_token) {
        this.addServiceItem(container, 'Google Drive', '✓');
      }

      // Add placeholder for future services
      if (!googleAuth || !googleAuth.access_token) {
        this.addServiceItem(container, 'Google Calendar', '○', false);
      }
      if (!driveAuth || !driveAuth.access_token) {
        this.addServiceItem(container, 'Google Drive', '○', false);
      }
      
      // TODO: Add Notion when implemented
      this.addServiceItem(container, 'Notion (준비중)', '○', false);
      
    } catch (error) {
      console.error('Error updating connected services:', error);
    }
  }

  addServiceItem(container, serviceName, icon, isConnected = true) {
    const serviceItem = document.createElement('div');
    serviceItem.className = 'service-item';
    if (!isConnected) {
      serviceItem.style.opacity = '0.5';
    }
    
    serviceItem.innerHTML = `
      <div class="service-icon">${icon}</div>
      <span>${serviceName}</span>
    `;
    
    container.appendChild(serviceItem);
  }

  closeSuccessModal() {
    const modal = document.getElementById('success-modal');
    
    modal.classList.remove('show');
    setTimeout(() => {
      modal.style.display = 'none';
      // Check if all required services are connected and redirect to main page
      this.checkAuthAndRedirectToMain();
    }, 300);
  }

  async checkAuthAndRedirectToMain() {
    try {
      // Check if both Google Calendar and Drive are connected
      const googleAuth = await this.getStoredAuth('google_auth');
      const driveAuth = await this.getStoredAuth('drive_auth');
      
      const isGoogleConnected = googleAuth && googleAuth.access_token;
      const isDriveConnected = driveAuth && driveAuth.access_token;
      
      // Update authentication status
      this.isAuthenticated = isGoogleConnected;
      
      // Always update UI to show dashboard if at least Google Calendar is connected
      this.updateUI();
      
      // Load drive settings if both services are connected
      if (isGoogleConnected && isDriveConnected) {
        await this.loadDriveSettings();
        this.showToast('모든 서비스가 연결되었습니다. 메인 페이지로 이동합니다.', 'success');
      }
      
    } catch (error) {
      console.error('Error checking authentication status:', error);
      this.updateUI();
    }
  }

  // === 폴더 선택 모달 관련 메서드들 ===

  async showFolderModal() {
    const modal = document.getElementById('folder-modal');
    
    // Reset modal state
    this.currentFolderId = this.driveSettings.selectedFolderId || 'root';
    this.selectedFolderId = this.currentFolderId;
    this.folderHistory = [];
    
    // Load folder list
    await this.loadFolderList();
    
    // Show modal
    modal.style.display = 'flex';
    setTimeout(() => {
      modal.classList.add('show');
    }, 10);
  }

  closeFolderModal() {
    const modal = document.getElementById('folder-modal');
    modal.classList.remove('show');
    setTimeout(() => {
      modal.style.display = 'none';
    }, 300);
  }

  async confirmFolderSelection() {
    try {
      // Get selected folder info
      const selectedFolder = document.querySelector('.folder-item.selected');
      if (!selectedFolder) {
        // If no folder is selected, use current folder
        const folderId = this.currentFolderId || 'root';
        const folderName = this.getCurrentFolderName() || '루트 폴더';
        
        // Update settings
        this.driveSettings.selectedFolderId = folderId;
        this.driveSettings.selectedFolderName = folderName;
      } else {
        const folderId = selectedFolder.dataset.folderId;
        const folderName = selectedFolder.dataset.folderName;
        
        // Update settings
        this.driveSettings.selectedFolderId = folderId;
        this.driveSettings.selectedFolderName = folderName;
      }
      
      // Save settings
      await this.saveDriveSettings();
      
      // Update UI
      this.updateFolderDisplay();
      
      // Close modal
      this.closeFolderModal();
      
      this.showToast(`폴더 "${this.driveSettings.selectedFolderName}"이 선택되었습니다.`, 'success');
      
    } catch (error) {
      this.showError('폴더 선택 중 오류가 발생했습니다: ' + error.message);
    }
  }

  async loadFolderList() {
    const folderList = document.getElementById('folder-list');
    folderList.innerHTML = '<div class="loading-folders">폴더 목록을 불러오는 중...</div>';
    
    try {
      const response = await this.sendMessageToBackground({
        action: 'listDriveFolders',
        params: { 
          parentId: this.currentFolderId 
        }
      });
      
      if (response.success) {
        this.renderFolderList(response.folders);
        this.updateBreadcrumb();
      } else {
        folderList.innerHTML = '<div class="empty-folder">폴더를 불러올 수 없습니다.</div>';
      }
    } catch (error) {
      folderList.innerHTML = '<div class="empty-folder">폴더 불러오기 실패</div>';
      console.error('Error loading folder list:', error);
    }
  }

  renderFolderList(folders) {
    const folderList = document.getElementById('folder-list');
    
    if (folders.length === 0) {
      folderList.innerHTML = '<div class="empty-folder">이 폴더는 비어있습니다.</div>';
      return;
    }
    
    folderList.innerHTML = folders.map(folder => `
      <div class="folder-item" data-folder-id="${folder.id}" data-folder-name="${folder.name}">
        <div class="folder-icon">📁</div>
        <div class="folder-info">
          <div class="folder-name">${folder.name}</div>
          <div class="folder-meta">폴더 • ${folder.modifiedTime ? new Date(folder.modifiedTime).toLocaleDateString() : ''}</div>
        </div>
      </div>
    `).join('');
    
    // Add click handlers
    folderList.querySelectorAll('.folder-item').forEach(item => {
      item.addEventListener('click', () => {
        this.selectFolder(item);
      });
      
      item.addEventListener('dblclick', () => {
        this.navigateToFolder(item.dataset.folderId, item.dataset.folderName);
      });
    });
  }

  selectFolder(folderItem) {
    // Remove previous selection
    document.querySelectorAll('.folder-item').forEach(item => {
      item.classList.remove('selected');
    });
    
    // Add selection to clicked item
    folderItem.classList.add('selected');
    
    // Update selected folder ID
    this.selectedFolderId = folderItem.dataset.folderId;
  }

  async navigateToFolder(folderId, folderName) {
    // Add current folder to history
    this.folderHistory.push({
      id: this.currentFolderId,
      name: this.getCurrentFolderName()
    });
    
    // Navigate to new folder
    this.currentFolderId = folderId;
    this.selectedFolderId = folderId;
    
    // Reload folder list
    await this.loadFolderList();
  }

  getCurrentFolderName() {
    const breadcrumb = document.getElementById('folder-breadcrumb');
    const breadcrumbItems = breadcrumb.querySelectorAll('.breadcrumb-item');
    return breadcrumbItems[breadcrumbItems.length - 1]?.textContent || '루트 폴더';
  }

  updateBreadcrumb() {
    const breadcrumb = document.getElementById('folder-breadcrumb');
    
    // Build breadcrumb from history
    let breadcrumbHTML = '<span class="breadcrumb-item" data-folder-id="root">루트 폴더</span>';
    
    for (const folder of this.folderHistory) {
      breadcrumbHTML += `<span class="breadcrumb-item" data-folder-id="${folder.id}">${folder.name}</span>`;
    }
    
    breadcrumb.innerHTML = breadcrumbHTML;
    
    // Add click handlers for breadcrumb navigation
    breadcrumb.querySelectorAll('.breadcrumb-item').forEach(item => {
      item.addEventListener('click', () => {
        this.navigateToBreadcrumb(item.dataset.folderId);
      });
    });
  }

  async navigateToBreadcrumb(folderId) {
    // Find the folder in history and truncate history
    const folderIndex = this.folderHistory.findIndex(f => f.id === folderId);
    
    if (folderId === 'root') {
      this.folderHistory = [];
      this.currentFolderId = 'root';
    } else if (folderIndex >= 0) {
      this.folderHistory = this.folderHistory.slice(0, folderIndex + 1);
      this.currentFolderId = folderId;
    }
    
    this.selectedFolderId = this.currentFolderId;
    await this.loadFolderList();
  }

  async refreshFolderList() {
    await this.loadFolderList();
  }

  async showCreateFolderModal() {
    const modal = document.getElementById('create-folder-modal');
    const input = document.getElementById('new-folder-name');
    
    // Clear input
    input.value = '';
    
    // Show modal
    modal.style.display = 'flex';
    setTimeout(() => {
      modal.classList.add('show');
      input.focus();
    }, 10);
  }

  closeCreateFolderModal() {
    const modal = document.getElementById('create-folder-modal');
    modal.classList.remove('show');
    setTimeout(() => {
      modal.style.display = 'none';
    }, 300);
  }

  async createNewFolder() {
    try {
      const input = document.getElementById('new-folder-name');
      const folderName = input.value.trim();
      
      if (!folderName) {
        this.showError('폴더 이름을 입력해주세요.');
        return;
      }
      
      // Create folder
      const response = await this.sendMessageToBackground({
        action: 'createDriveFolder',
        params: {
          name: folderName,
          parentId: this.currentFolderId
        }
      });
      
      if (response.success) {
        this.showToast(`폴더 "${folderName}"이 생성되었습니다.`, 'success');
        this.closeCreateFolderModal();
        await this.loadFolderList();
      } else {
        this.showError('폴더 생성에 실패했습니다: ' + response.error);
      }
      
    } catch (error) {
      this.showError('폴더 생성 중 오류가 발생했습니다: ' + error.message);
    }
  }

  // === 스프레드시트 선택 관련 메서드들 ===

  setupSpreadsheetListeners() {
    // Spreadsheet type radio buttons
    const spreadsheetRadios = document.querySelectorAll('input[name="spreadsheet-type"]');
    spreadsheetRadios.forEach(radio => {
      radio.addEventListener('change', (e) => {
        this.handleSpreadsheetTypeChange(e.target.value);
      });
    });

    // Spreadsheet selection button
    const selectSpreadsheetBtn = document.getElementById('select-spreadsheet-btn');
    if (selectSpreadsheetBtn) {
      selectSpreadsheetBtn.addEventListener('click', () => {
        this.showSpreadsheetModal();
      });
    }

    // Spreadsheet modal buttons
    const spreadsheetCancelBtn = document.getElementById('spreadsheet-cancel-btn');
    const spreadsheetSelectBtn = document.getElementById('spreadsheet-select-btn');

    if (spreadsheetCancelBtn) {
      spreadsheetCancelBtn.addEventListener('click', () => {
        this.closeSpreadsheetModal();
      });
    }

    if (spreadsheetSelectBtn) {
      spreadsheetSelectBtn.addEventListener('click', () => {
        this.confirmSpreadsheetSelection();
      });
    }
  }

  handleSpreadsheetTypeChange(type) {
    const selectBtn = document.getElementById('select-spreadsheet-btn');
    const selectedSpreadsheet = document.getElementById('selected-spreadsheet');
    
    this.spreadsheetSettings.type = type;
    
    if (type === 'existing') {
      selectBtn.disabled = false;
      selectedSpreadsheet.style.display = 'block';
    } else {
      selectBtn.disabled = true;
      selectedSpreadsheet.style.display = 'none';
    }
  }

  async showSpreadsheetModal() {
    const modal = document.getElementById('spreadsheet-modal');
    
    // Load spreadsheet list
    await this.loadSpreadsheetList();
    
    // Show modal
    modal.style.display = 'flex';
    setTimeout(() => {
      modal.classList.add('show');
    }, 10);
  }

  closeSpreadsheetModal() {
    const modal = document.getElementById('spreadsheet-modal');
    modal.classList.remove('show');
    setTimeout(() => {
      modal.style.display = 'none';
    }, 300);
  }

  async loadSpreadsheetList() {
    const spreadsheetList = document.getElementById('spreadsheet-list');
    spreadsheetList.innerHTML = '<div class="loading-spreadsheets">스프레드시트 목록을 불러오는 중...</div>';
    
    try {
      const response = await this.sendMessageToBackground({
        action: 'listSpreadsheets',
        params: {}
      });
      
      if (response.success) {
        this.renderSpreadsheetList(response.spreadsheets);
      } else {
        spreadsheetList.innerHTML = '<div class="empty-spreadsheets">스프레드시트를 불러올 수 없습니다.</div>';
      }
    } catch (error) {
      spreadsheetList.innerHTML = '<div class="empty-spreadsheets">스프레드시트 불러오기 실패</div>';
      console.error('Error loading spreadsheet list:', error);
    }
  }

  renderSpreadsheetList(spreadsheets) {
    const spreadsheetList = document.getElementById('spreadsheet-list');
    
    if (spreadsheets.length === 0) {
      spreadsheetList.innerHTML = '<div class="empty-spreadsheets">스프레드시트가 없습니다.</div>';
      return;
    }
    
    spreadsheetList.innerHTML = spreadsheets.map(sheet => `
      <div class="spreadsheet-item" data-spreadsheet-id="${sheet.id}" data-spreadsheet-name="${sheet.name}">
        <div class="spreadsheet-icon">📊</div>
        <div class="spreadsheet-details">
          <div class="spreadsheet-name">${sheet.name}</div>
          <div class="spreadsheet-meta">수정일: ${sheet.modifiedTime ? new Date(sheet.modifiedTime).toLocaleDateString() : ''}</div>
        </div>
      </div>
    `).join('');
    
    // Add click handlers
    spreadsheetList.querySelectorAll('.spreadsheet-item').forEach(item => {
      item.addEventListener('click', () => {
        this.selectSpreadsheet(item);
      });
    });
  }

  selectSpreadsheet(spreadsheetItem) {
    // Remove previous selection
    document.querySelectorAll('.spreadsheet-item').forEach(item => {
      item.classList.remove('selected');
    });
    
    // Add selection to clicked item
    spreadsheetItem.classList.add('selected');
    
    // Update selected spreadsheet info
    this.spreadsheetSettings.selectedSpreadsheetId = spreadsheetItem.dataset.spreadsheetId;
    this.spreadsheetSettings.selectedSpreadsheetName = spreadsheetItem.dataset.spreadsheetName;
  }

  async confirmSpreadsheetSelection() {
    try {
      const selectedSpreadsheet = document.querySelector('.spreadsheet-item.selected');
      if (!selectedSpreadsheet) {
        this.showError('스프레드시트를 선택해주세요.');
        return;
      }
      
      const spreadsheetId = selectedSpreadsheet.dataset.spreadsheetId;
      const spreadsheetName = selectedSpreadsheet.dataset.spreadsheetName;
      
      // Update settings
      this.spreadsheetSettings.selectedSpreadsheetId = spreadsheetId;
      this.spreadsheetSettings.selectedSpreadsheetName = spreadsheetName;
      
      // Update UI
      this.updateSpreadsheetDisplay();
      
      // Close modal
      this.closeSpreadsheetModal();
      
      this.showToast(`스프레드시트 "${spreadsheetName}"이 선택되었습니다.`, 'success');
      
    } catch (error) {
      this.showError('스프레드시트 선택 중 오류가 발생했습니다: ' + error.message);
    }
  }

  updateSpreadsheetDisplay() {
    const selectedSpreadsheet = document.getElementById('selected-spreadsheet');
    const spreadsheetInfo = selectedSpreadsheet.querySelector('.spreadsheet-info');
    
    if (this.spreadsheetSettings.selectedSpreadsheetName) {
      spreadsheetInfo.textContent = `선택된 스프레드시트: ${this.spreadsheetSettings.selectedSpreadsheetName}`;
    } else {
      spreadsheetInfo.textContent = '선택된 스프레드시트가 없습니다.';
    }
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