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
    
    // Check if opened in new window
    this.checkWindowMode();
    
    this.setupEventListeners();
    await this.checkAuthStatus();
    await this.loadEvents();
    await this.loadSpreadsheetSummary();
    await this.loadDriveSettings();
    this.updateUI();
  }

  checkWindowMode() {
    // Check if opened in a new window (not as popup)
    if (window.location.search.includes('window=true') || 
        window.outerWidth > 850 || 
        window.chrome?.runtime?.getURL && window.location.href.includes('popup.html')) {
      
      // Check if it's actually a separate window
      if (window.outerWidth > 850) {
        document.body.classList.add('window-mode');
        
        // Hide expand button in window mode
        const expandBtn = document.getElementById('expand-btn');
        if (expandBtn) {
          expandBtn.style.display = 'none';
        }
      }
    }
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

    const pricingBtn = document.getElementById('pricing-btn');
    if (pricingBtn) {
      pricingBtn.addEventListener('click', () => {
        this.openPricing();
      });
    }

    const notionAuthBtn = document.getElementById('notion-auth-btn');
    if (notionAuthBtn) {
      notionAuthBtn.addEventListener('click', () => {
        this.handleNotionAuth();
      });
    }

    const expandBtn = document.getElementById('expand-btn');
    if (expandBtn) {
      expandBtn.addEventListener('click', () => {
        this.openInNewWindow();
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
      
      // Initialize with default period type (year)
      this.handlePeriodTypeChange(periodType.value || 'year');
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
        this.saveFilenameSettings();
      });
    });

    // Template selection change
    const templateSelect = document.getElementById('filename-template');
    if (templateSelect) {
      templateSelect.addEventListener('change', () => {
        this.updateFilenamePreview();
        this.saveFilenameSettings();
      });
    }

    // Custom filename input
    const customInput = document.getElementById('custom-filename');
    if (customInput) {
      customInput.addEventListener('input', () => {
        this.updateFilenamePreview();
        this.saveFilenameSettings();
      });
    }

    // Initial setup
    this.updateFilenamePreview();
  }

  saveFilenameSettings() {
    const customRadio = document.querySelector('input[name="filename-type"][value="custom"]');
    const templateSelect = document.getElementById('filename-template');
    const customInput = document.getElementById('custom-filename');

    if (customRadio.checked) {
      this.driveSettings.customFilename = customInput.value.trim();
    } else {
      this.driveSettings.customFilename = '';
      this.driveSettings.filenameTemplate = templateSelect.value;
    }

    this.saveDriveSettings();
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
        googleBtn.textContent = 'Connected';
        googleBtn.classList.add('connected');
        googleBtn.classList.remove('disconnected');
        this.isAuthenticated = true;
      } else {
        googleStatus.textContent = 'Not connected';
        googleStatus.classList.remove('connected');
        googleBtn.textContent = 'Connect';
        googleBtn.classList.add('disconnected');
        googleBtn.classList.remove('connected');
        this.isAuthenticated = false;
      }

      // Check Google Drive authentication
      const driveAuth = await this.getStoredAuth('drive_auth');
      const driveStatus = document.getElementById('drive-auth-status');
      const driveBtn = document.getElementById('drive-auth-btn');

      if (driveAuth && driveAuth.access_token) {
        driveStatus.textContent = 'Connected';
        driveStatus.classList.add('connected');
        driveBtn.textContent = 'Connected';
        driveBtn.classList.add('connected');
        driveBtn.classList.remove('disconnected');
      } else {
        driveStatus.textContent = 'Not connected';
        driveStatus.classList.remove('connected');
        driveBtn.textContent = 'Connect';
        driveBtn.classList.add('disconnected');
        driveBtn.classList.remove('connected');
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
      
      // If already connected, disconnect instead
      if (btn.classList.contains('connected')) {
        await this.disconnectGoogle();
        return;
      }
      
      btn.textContent = 'Connecting...';
      btn.disabled = true;

      // Send message to background script to handle authentication
      chrome.runtime.sendMessage({
        action: 'authenticate_google'
      }, async (response) => {
        if (response.success) {
          this.isAuthenticated = true;
          
          // Auto-connect Drive and register Basic plan
          await this.handleInitialGoogleAuth(response);
          
          await this.checkAuthStatus();
          this.loadEvents();
          
          // Check if both services are now connected
          await this.checkAndShowSuccessModal();
        } else {
          console.error('Authentication failed:', response.error);
          this.showError('Google authentication failed. Please try again.');
          // Only restore text on failure
          btn.textContent = originalText;
        }
        
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
      
      // If already connected, disconnect instead
      if (btn.classList.contains('connected')) {
        await this.disconnectDrive();
        return;
      }
      
      btn.textContent = 'Connecting...';
      btn.disabled = true;

      // Send message to background script to handle Drive authentication
      chrome.runtime.sendMessage({
        action: 'authenticate_drive'
      }, async (response) => {
        if (response.success) {
          await this.checkAuthStatus();
          
          // Check if both services are now connected
          await this.checkAndShowSuccessModal();
        } else {
          console.error('Drive authentication failed:', response.error);
          this.showError('Google Drive authentication failed. Please try again.');
          // Only restore text on failure
          btn.textContent = originalText;
        }
        
        btn.disabled = false;
      });
    } catch (error) {
      console.error('Error during Drive authentication:', error);
      this.showError('Authentication error occurred.');
    }
  }

  async disconnectGoogle() {
    try {
      const btn = document.getElementById('google-auth-btn');
      btn.textContent = 'Disconnecting...';
      btn.disabled = true;

      // Clear Google auth data from storage
      await new Promise((resolve) => {
        chrome.storage.local.remove(['google_auth'], resolve);
      });
      
      // Update UI
      await this.checkAuthStatus();
      this.events = [];
      this.updateUI();
      this.showToast('Google Calendar disconnected successfully.', 'success');

    } catch (error) {
      console.error('Error during Google disconnection:', error);
      this.showError('Disconnection error occurred.');
    }
  }

  async disconnectDrive() {
    try {
      const btn = document.getElementById('drive-auth-btn');
      btn.textContent = 'Disconnecting...';
      btn.disabled = true;

      // Clear Drive auth data from storage
      await new Promise((resolve) => {
        chrome.storage.local.remove(['drive_auth'], resolve);
      });
      
      // Update UI
      await this.checkAuthStatus();
      this.showToast('Google Drive disconnected successfully.', 'success');

    } catch (error) {
      console.error('Error during Drive disconnection:', error);
      this.showError('Drive disconnection error occurred.');
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

  openPricing() {
    chrome.tabs.create({
      url: chrome.runtime.getURL('pricing.html')
    });
  }

  async handleInitialGoogleAuth(googleAuthResponse) {
    try {
      // Check if user already exists
      const existingUser = await this.getStoredData('carrinderUser');
      if (existingUser) {
        console.log('User already registered:', existingUser);
        return;
      }

      // Extract user info from Google auth response
      const userInfo = googleAuthResponse.userInfo || {
        name: googleAuthResponse.name || 'User',
        email: googleAuthResponse.email || 'user@example.com',
        picture: googleAuthResponse.picture || ''
      };

      // Auto-connect Google Drive
      await this.autoConnectDrive();

      // Register user with Basic plan
      await this.registerBasicUser(userInfo);

      this.showToast('Carrinder Basic 플랜으로 자동 가입되었습니다!', 'success');
      
    } catch (error) {
      console.error('Error in initial Google auth:', error);
      this.showToast('자동 설정 중 오류가 발생했습니다.', 'error');
    }
  }

  async autoConnectDrive() {
    try {
      // Send message to background to connect Drive using existing Google auth
      const response = await this.sendMessageToBackground({
        action: 'auto_connect_drive'
      });

      if (response.success) {
        console.log('Drive auto-connected successfully');
      } else {
        console.error('Drive auto-connect failed:', response.error);
      }
    } catch (error) {
      console.error('Error auto-connecting Drive:', error);
    }
  }

  async registerBasicUser(userInfo) {
    try {
      // Create Basic plan user data
      const userData = {
        id: 'user_' + Date.now(),
        name: userInfo.name,
        email: userInfo.email,
        picture: userInfo.picture,
        plan: 'basic',
        billing: null,
        registeredAt: new Date().toISOString(),
        autoRegistered: true
      };

      // Store user data
      await chrome.storage.sync.set({
        carrinderUser: userData,
        userPlan: {
          plan: 'basic',
          billing: null,
          expires: null
        }
      });

      console.log('Basic user registered:', userData);
      
    } catch (error) {
      console.error('Error registering basic user:', error);
      throw error;
    }
  }

  handleNotionAuth() {
    // Show message that Plus plan is required
    this.showToast('Notion API는 Plus 요금제에서 사용할 수 있습니다.', 'info');
    
    // Open pricing page after a short delay
    setTimeout(() => {
      this.openPricing();
    }, 1500);
  }

  openInNewWindow() {
    // Create a new window with the popup content
    chrome.windows.create({
      url: chrome.runtime.getURL('popup.html'),
      type: 'popup',
      width: 1000,
      height: 720,
      focused: true
    });
    
    // Close the current popup
    window.close();
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
        this.addYearChangeListener();
        break;
      case 'month':
        document.getElementById('month-selector').style.display = 'block';
        this.populateMonthOptions();
        this.addMonthChangeListeners();
        break;
      case 'custom':
        document.getElementById('custom-selector').style.display = 'block';
        this.setDefaultCustomDates();
        this.addCustomDateListeners();
        break;
    }
    
    // Update filename preview when period type changes
    this.updateFilenamePreview();
  }

  populateYearOptions() {
    const yearSelect = document.getElementById('year-select');
    const currentYear = new Date().getFullYear();
    
    console.log('Populating year options, current year:', currentYear);
    
    yearSelect.innerHTML = '';
    for (let year = currentYear; year >= currentYear - 5; year--) {
      const option = document.createElement('option');
      option.value = year;
      option.textContent = `${year}년`;
      yearSelect.appendChild(option);
    }
    
    // Explicitly set current year as selected
    yearSelect.value = currentYear;
    console.log('Year select value set to:', yearSelect.value);
  }

  addYearChangeListener() {
    const yearSelect = document.getElementById('year-select');
    // Remove existing listener if any
    yearSelect.removeEventListener('change', this.updateFilenamePreview);
    // Add new listener
    yearSelect.addEventListener('change', () => {
      this.updateFilenamePreview();
    });
  }

  addMonthChangeListeners() {
    const startMonthSelect = document.getElementById('start-month-select');
    const endMonthSelect = document.getElementById('end-month-select');
    
    [startMonthSelect, endMonthSelect].forEach(select => {
      if (select) {
        select.removeEventListener('change', this.updateFilenamePreview);
        select.addEventListener('change', () => {
          this.updateFilenamePreview();
        });
      }
    });
  }

  addCustomDateListeners() {
    const startDate = document.getElementById('start-date');
    const endDate = document.getElementById('end-date');
    
    [startDate, endDate].forEach(input => {
      if (input) {
        input.removeEventListener('change', this.updateFilenamePreview);
        input.addEventListener('change', () => {
          this.updateFilenamePreview();
        });
      }
    });
  }

  populateMonthOptions() {
    const startMonthSelect = document.getElementById('start-month-select');
    const endMonthSelect = document.getElementById('end-month-select');
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();
    
    // Clear existing options
    startMonthSelect.innerHTML = '';
    endMonthSelect.innerHTML = '';
    
    // Generate months for last 3 years
    const months = [];
    for (let i = 0; i < 36; i++) {
      const date = new Date(currentYear, currentMonth - i, 1);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      
      months.push({
        value: `${year}-${month.toString().padStart(2, '0')}`,
        text: `${year}년 ${month}월`,
        date: date
      });
    }
    
    // Populate both selects
    months.forEach((monthData, index) => {
      const startOption = document.createElement('option');
      startOption.value = monthData.value;
      startOption.textContent = monthData.text;
      startMonthSelect.appendChild(startOption);
      
      const endOption = document.createElement('option');
      endOption.value = monthData.value;
      endOption.textContent = monthData.text;
      endMonthSelect.appendChild(endOption);
    });
    
    // Set default values (current month and 11 months ago)
    endMonthSelect.value = months[0].value;
    startMonthSelect.value = months[11].value;
    
    // Add change listeners for validation
    startMonthSelect.addEventListener('change', () => {
      this.validateMonthRange();
      this.updateFilenamePreview();
    });
    endMonthSelect.addEventListener('change', () => {
      this.validateMonthRange();
      this.updateFilenamePreview();
    });
  }
  
  validateMonthRange() {
    const startMonthSelect = document.getElementById('start-month-select');
    const endMonthSelect = document.getElementById('end-month-select');
    const warningElement = document.getElementById('period-warning');
    
    const startValue = startMonthSelect.value;
    const endValue = endMonthSelect.value;
    
    const [startYear, startMonth] = startValue.split('-').map(Number);
    const [endYear, endMonth] = endValue.split('-').map(Number);
    
    const startDate = new Date(startYear, startMonth - 1);
    const endDate = new Date(endYear, endMonth - 1);
    
    // Check if start date is after end date
    if (startDate > endDate) {
      // Swap values
      startMonthSelect.value = endValue;
      endMonthSelect.value = startValue;
      this.validateMonthRange();
      return;
    }
    
    // Calculate month difference
    const monthDiff = (endYear - startYear) * 12 + (endMonth - startMonth) + 1;
    
    // Show warning if more than 12 months
    if (monthDiff > 12) {
      warningElement.style.display = 'flex';
      // Adjust end date to be exactly 11 months after start date
      const adjustedEndDate = new Date(startYear, startMonth + 10);
      const adjustedYear = adjustedEndDate.getFullYear();
      const adjustedMonth = adjustedEndDate.getMonth() + 1;
      endMonthSelect.value = `${adjustedYear}-${adjustedMonth.toString().padStart(2, '0')}`;
    } else {
      warningElement.style.display = 'none';
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
      
      // Always use the built-in folder selection modal
      this.showFolderModal();
      
    } catch (error) {
      console.error('Error in selectDriveFolder:', error);
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
          const yearSelect = document.getElementById('year-select');
          period = yearSelect.value || new Date().getFullYear().toString();
          break;
        case 'month':
          const startMonthSelect = document.getElementById('start-month-select');
          const endMonthSelect = document.getElementById('end-month-select');
          if (startMonthSelect && endMonthSelect && startMonthSelect.value && endMonthSelect.value) {
            const [startY, startM] = startMonthSelect.value.split('-');
            const [endY, endM] = endMonthSelect.value.split('-');
            if (startMonthSelect.value === endMonthSelect.value) {
              period = `${startY}년${startM}월`;
            } else {
              period = `${startY}년${startM}월_${endY}년${endM}월`;
            }
          } else {
            const now = new Date();
            period = `${now.getFullYear()}년${(now.getMonth() + 1).toString().padStart(2, '0')}월`;
          }
          break;
        case 'custom':
          const startDate = document.getElementById('start-date');
          const endDate = document.getElementById('end-date');
          if (startDate && endDate && startDate.value && endDate.value) {
            const start = startDate.value.replace(/-/g, '');
            const end = endDate.value.replace(/-/g, '');
            period = `${start}_${end}`;
          } else {
            period = '2025_01_01_2025_12_31';
          }
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
        const startMonthValue = document.getElementById('start-month-select').value;
        const endMonthValue = document.getElementById('end-month-select').value;
        const [startY, startM] = startMonthValue.split('-');
        const [endY, endM] = endMonthValue.split('-');
        const lastDay = new Date(parseInt(endY), parseInt(endM), 0).getDate();
        dateRange = {
          start: `${startY}-${startM}-01T00:00:00Z`,
          end: `${endY}-${endM}-${lastDay}T23:59:59Z`
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
        let sheetName;
        
        if (this.spreadsheetSettings.type === 'existing' && this.spreadsheetSettings.selectedSpreadsheetId) {
          // Add new tab to existing spreadsheet
          const tabTitle = this.generateTabTitle(role, config);
          sheetName = tabTitle; // Store the tab title for later use
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
          sheetName = this.getSheetNameForRole(role); // Use default sheet name for new spreadsheets
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
            events: roleEvents,
            sheetName: sheetName
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

  getSheetNameForRole(role) {
    const roleNames = {
      instructor: '강사활동',
      judge: '심사활동',
      mentor: '멘토링활동',
      other: '기타활동'
    };
    return roleNames[role] || role;
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

        console.log(`Calling populateSpreadsheet for role ${role}:`, {
          spreadsheetId: sheetInfo.spreadsheetId,
          eventsCount: (sheetInfo.events || []).length,
          sheetName: sheetInfo.sheetName
        });
        
        await this.sendMessageToBackground({
          action: 'populateSpreadsheet',
          params: {
            spreadsheetId: sheetInfo.spreadsheetId,
            events: sheetInfo.events || [],
            role: role,
            sheetName: sheetInfo.sheetName
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

  async checkAndShowSuccessModal() {
    try {
      // Check if both services are connected
      const googleAuth = await this.getStoredAuth('google_auth');
      const driveAuth = await this.getStoredAuth('drive_auth');
      
      const isGoogleConnected = googleAuth && googleAuth.access_token;
      const isDriveConnected = driveAuth && driveAuth.access_token;
      
      // Only show modal if both services are connected
      if (isGoogleConnected && isDriveConnected) {
        this.showSuccessModal('All Services', '모든 서비스가 성공적으로 연결되었습니다. 이제 데이터 수집과 스프레드시트 생성이 가능합니다.');
      } else if (isGoogleConnected && !isDriveConnected) {
        this.showToast('Google 캘린더가 연결되었습니다. Google 드라이브도 연결해주세요.', 'success');
      } else if (!isGoogleConnected && isDriveConnected) {
        this.showToast('Google 드라이브가 연결되었습니다. Google 캘린더도 연결해주세요.', 'success');
      }
    } catch (error) {
      console.error('Error checking auth status for modal:', error);
    }
  }

  async showSuccessModal(serviceName, message) {
    const modal = document.getElementById('success-modal');
    const modalMessage = document.getElementById('modal-message');
    const connectedServices = document.getElementById('connected-services');

    // Set message
    modalMessage.textContent = message;

    // Get all connected services and show them
    await this.updateConnectedServices(connectedServices);

    // Add click outside to close
    this.addModalClickOutsideHandler(modal, () => this.closeSuccessModal());

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
        // Don't show toast here as checkAndShowSuccessModal already handles it
      }
      
    } catch (error) {
      console.error('Error checking authentication status:', error);
      this.updateUI();
    }
  }

  // === 폴더 선택 모달 관련 메서드들 ===

  async showFolderModal() {
    const modal = document.getElementById('folder-modal');
    
    if (!modal) {
      console.error('Folder modal element not found!');
      this.showError('폴더 선택 모달을 찾을 수 없습니다.');
      return;
    }
    
    // Reset modal state - always start from root to show all folders
    this.currentFolderId = 'root';
    this.selectedFolderId = this.driveSettings.selectedFolderId || 'root';
    this.folderHistory = [];
    
    // Load folder list
    await this.loadFolderList();
    
    // Add click outside to close
    this.addModalClickOutsideHandler(modal, () => this.closeFolderModal());
    
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

  getFileIcon(mimeType) {
    if (mimeType.includes('spreadsheet') || mimeType.includes('sheet')) return '📊';
    if (mimeType.includes('document') || mimeType.includes('text')) return '📄';
    if (mimeType.includes('presentation')) return '📑';
    if (mimeType.includes('image')) return '🖼️';
    if (mimeType.includes('video')) return '🎥';
    if (mimeType.includes('audio')) return '🎵';
    if (mimeType.includes('pdf')) return '📋';
    return '📄';
  }

  renderFolderList(items) {
    const folderList = document.getElementById('folder-list');
    
    if (items.length === 0) {
      folderList.innerHTML = '<div class="empty-folder">이 폴더는 비어있습니다.</div>';
      return;
    }
    
    folderList.innerHTML = items.map(item => {
      const isFolder = item.mimeType === 'application/vnd.google-apps.folder';
      const icon = isFolder ? '📁' : this.getFileIcon(item.mimeType);
      const itemType = isFolder ? '폴더' : '파일';
      
      return `
        <div class="folder-item ${isFolder ? 'is-folder' : 'is-file'}" 
             data-folder-id="${item.id}" 
             data-folder-name="${item.name}"
             data-is-folder="${isFolder}">
          <div class="folder-icon">${icon}</div>
          <div class="folder-info">
            <div class="folder-name">${item.name}</div>
            <div class="folder-meta">${itemType} • ${item.modifiedTime ? new Date(item.modifiedTime).toLocaleDateString() : ''}</div>
          </div>
        </div>
      `;
    }).join('');
    
    // Add click handlers
    folderList.querySelectorAll('.folder-item').forEach(item => {
      item.addEventListener('click', () => {
        this.selectFolder(item);
      });
      
      // Only add double-click for folders
      if (item.dataset.isFolder === 'true') {
        item.addEventListener('dblclick', () => {
          this.navigateToFolder(item.dataset.folderId, item.dataset.folderName);
        });
      }
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
    console.log('Navigating to folder:', folderId, folderName);
    
    // Add current folder to history before navigating if not root
    if (this.currentFolderId === 'root') {
      // Start fresh history when navigating from root
      this.folderHistory = [{
        id: 'root',
        name: '루트 폴더'
      }];
    } else {
      // Add current folder to history if not already there
      const currentName = this.getCurrentFolderName() || this.getFolderNameFromId(this.currentFolderId);
      const lastHistoryItem = this.folderHistory[this.folderHistory.length - 1];
      
      if (!lastHistoryItem || lastHistoryItem.id !== this.currentFolderId) {
        this.folderHistory.push({
          id: this.currentFolderId,
          name: currentName
        });
      }
    }
    
    // Add the new folder to history
    this.folderHistory.push({
      id: folderId,
      name: folderName
    });
    
    // Navigate to new folder
    this.currentFolderId = folderId;
    this.selectedFolderId = folderId;
    
    console.log('Folder history after navigation:', this.folderHistory);
    
    // Reload folder list
    await this.loadFolderList();
  }
  
  getFolderNameFromId(folderId) {
    // Try to get folder name from current folder list
    const folderItems = document.querySelectorAll('.folder-item');
    for (const item of folderItems) {
      if (item.dataset.folderId === folderId) {
        return item.dataset.folderName;
      }
    }
    return '알 수 없는 폴더';
  }

  getCurrentFolderName() {
    const breadcrumb = document.getElementById('folder-breadcrumb');
    const breadcrumbItems = breadcrumb.querySelectorAll('.breadcrumb-item');
    return breadcrumbItems[breadcrumbItems.length - 1]?.textContent || '루트 폴더';
  }

  updateBreadcrumb() {
    const breadcrumb = document.getElementById('folder-breadcrumb');
    
    // Build breadcrumb from history
    let breadcrumbHTML = '';
    
    // Show all folders in history
    for (let i = 0; i < this.folderHistory.length; i++) {
      const folder = this.folderHistory[i];
      const isLast = i === this.folderHistory.length - 1;
      const isCurrent = folder.id === this.currentFolderId;
      
      if (i > 0) {
        breadcrumbHTML += ' > ';
      }
      
      const className = isCurrent && isLast ? 'breadcrumb-item current' : 'breadcrumb-item';
      breadcrumbHTML += `<span class="${className}" data-folder-id="${folder.id}">${folder.name}</span>`;
    }
    
    // If no history exists, show root
    if (this.folderHistory.length === 0) {
      const className = this.currentFolderId === 'root' ? 'breadcrumb-item current' : 'breadcrumb-item';
      breadcrumbHTML = `<span class="${className}" data-folder-id="root">루트 폴더</span>`;
    }
    
    breadcrumb.innerHTML = breadcrumbHTML;
    
    // Add click handlers for breadcrumb navigation (except current folder)
    breadcrumb.querySelectorAll('.breadcrumb-item:not(.current)').forEach(item => {
      item.addEventListener('click', () => {
        this.navigateToBreadcrumb(item.dataset.folderId);
      });
    });
  }
  
  getCurrentFolderNameFromHistory() {
    // Find current folder name in history
    const currentFolder = this.folderHistory.find(f => f.id === this.currentFolderId);
    return currentFolder ? currentFolder.name : null;
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
    
    // Add click outside to close
    this.addModalClickOutsideHandler(modal, () => this.closeCreateFolderModal());
    
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
    
    // Add click outside to close
    this.addModalClickOutsideHandler(modal, () => this.closeSpreadsheetModal());
    
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

  // === 모달 공통 기능 ===

  addModalClickOutsideHandler(modal, closeCallback) {
    // Remove existing listener if any
    if (modal._clickOutsideHandler) {
      modal.removeEventListener('click', modal._clickOutsideHandler);
    }
    
    // Add new listener
    modal._clickOutsideHandler = (event) => {
      // Check if click is on the modal overlay (not on the modal content)
      if (event.target === modal) {
        closeCallback();
      }
    };
    
    modal.addEventListener('click', modal._clickOutsideHandler);
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