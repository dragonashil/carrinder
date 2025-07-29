// Background script for Career Manager Chrome Extension
class CareerManagerBackground {
  constructor() {
    this.init();
  }

  async init() {
    this.setupMessageHandlers();
    await this.setupAlarms();
  }

  setupMessageHandlers() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      switch (request.action) {
        case 'authenticate_google':
          this.authenticateGoogle(sendResponse);
          break;
        case 'authenticate_drive':
          this.authenticateDrive(sendResponse);
          break;
        case 'sync_events':
          this.syncEvents(sendResponse);
          break;
        case 'get_calendar_events':
          this.getCalendarEvents(request.timeRange, sendResponse);
          break;
        case 'getCalendarEvents':
          this.getCalendarEventsWithParams(request.params, sendResponse);
          break;
        case 'createSpreadsheet':
          this.createSpreadsheet(request.params, sendResponse);
          break;
        case 'populateSpreadsheet':
          this.populateSpreadsheet(request.params, sendResponse);
          break;
        case 'sync_to_spreadsheets':
          this.syncToSpreadsheets(sendResponse);
          break;
        case 'initialize_spreadsheets':
          this.initializeSpreadsheets(sendResponse);
          break;
        case 'get_spreadsheet_summary':
          this.getSpreadsheetSummary(sendResponse);
          break;
        case 'listDriveFolders':
          this.listDriveContents(request.params, sendResponse);
          break;
        case 'createDriveFolder':
          this.createDriveFolder(request.params, sendResponse);
          break;
        case 'getDriveSettings':
          this.getDriveSettings(sendResponse);
          break;
        case 'saveDriveSettings':
          this.saveDriveSettings(request.params, sendResponse);
          break;
        case 'listSpreadsheets':
          this.listSpreadsheets(request.params, sendResponse);
          break;
        case 'addSheetTab':
          this.addSheetTab(request.params, sendResponse);
          break;
        case 'getAccessToken':
          this.getAccessToken(sendResponse);
          break;
        case 'folderSelected':
          this.handleFolderSelected(request.folder, sendResponse);
          break;
        case 'auto_connect_drive':
          this.autoConnectDrive(sendResponse);
          break;
        case 'logout':
          this.logout(sendResponse);
          break;
        case 'update_auto_sync':
          this.updateAutoSync(sendResponse);
          break;
        default:
          sendResponse({ success: false, error: 'Unknown action' });
      }
      return true; // Keep message channel open for async response
    });
  }

  async setupAlarms() {
    // Clear existing alarms first
    chrome.alarms.clear('sync_events');
    
    // Get user settings
    const settings = await this.getStoredData('settings') || this.getDefaultSettings();
    const userPlan = await this.getStoredData('userPlan') || 'free';
    
    // Only setup auto-sync for Plus users
    if (userPlan === 'plus' && settings.autoSync) {
      const syncInterval = settings.syncInterval || 30;
      console.log(`Setting up auto-sync with ${syncInterval} minute interval for Plus user`);
      
      chrome.alarms.create('sync_events', {
        periodInMinutes: syncInterval
      });
    } else {
      console.log('Auto-sync disabled: requires Plus plan and auto-sync setting enabled');
    }

    chrome.alarms.onAlarm.addListener((alarm) => {
      if (alarm.name === 'sync_events') {
        this.syncEvents();
      }
    });
  }

  async updateAutoSync(sendResponse) {
    try {
      console.log('Updating auto-sync settings...');
      await this.setupAlarms();
      sendResponse({ success: true, message: 'Auto-sync settings updated' });
    } catch (error) {
      console.error('Error updating auto-sync:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  async authenticateGoogle(sendResponse) {
    try {
      // Check if we already have a valid token
      const existingAuth = await this.getStoredData('google_auth');
      
      if (existingAuth && existingAuth.access_token && existingAuth.expires_at > Date.now()) {
        console.log('Checking existing token validity...');
        
        // Verify token is actually valid by making a test API call
        try {
          const userInfo = await this.getUserInfo(existingAuth.access_token);
          
          // If getUserInfo succeeds with real user data, token is valid
          if (userInfo && userInfo.email && userInfo.email !== 'user@example.com') {
            console.log('Using existing valid token');
            sendResponse({ 
              success: true, 
              token: existingAuth.access_token,
              userInfo: userInfo,
              name: userInfo.name,
              email: userInfo.email,
              picture: userInfo.picture
            });
            return;
          } else {
            console.log('Existing token invalid, clearing and requesting new auth');
            await this.clearStoredData('google_auth');
          }
        } catch (error) {
          console.log('Existing token invalid, clearing and requesting new auth');
          await this.clearStoredData('google_auth');
        }
      }
      
      console.log('Getting new auth token with account selection');
      
      const token = await this.getAuthToken([
        'https://www.googleapis.com/auth/calendar.readonly',
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive.file',
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/userinfo.email'
      ], true); // Force new auth to show account selection
      
      if (token) {
        // Get user info
        const userInfo = await this.getUserInfo(token);
        
        // Store token with extended info
        const authData = {
          access_token: token,
          expires_at: Date.now() + (3600 * 1000), // 1 hour from now
          timestamp: Date.now()
        };
        
        await this.storeData('google_auth', authData);
        
        sendResponse({ 
          success: true, 
          token,
          userInfo: userInfo,
          name: userInfo.name,
          email: userInfo.email,
          picture: userInfo.picture
        });
      } else {
        sendResponse({ success: false, error: 'Failed to get auth token' });
      }
    } catch (error) {
      console.error('Google authentication error:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  async getCachedToken() {
    try {
      const authData = await this.getStoredData('google_auth');
      return authData ? authData.access_token : null;
    } catch (error) {
      return null;
    }
  }

  async getUserInfo(token) {
    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to get user info: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
  }

  async authenticateDrive(sendResponse) {
    try {
      // Check if we already have a valid token
      const existingAuth = await this.getStoredData('drive_auth');
      
      if (existingAuth && existingAuth.access_token && existingAuth.expires_at > Date.now()) {
        console.log('Checking existing Drive token validity...');
        
        // Verify token is actually valid by making a test API call
        try {
          const testResponse = await fetch('https://www.googleapis.com/drive/v3/about?fields=user', {
            headers: {
              'Authorization': `Bearer ${existingAuth.access_token}`
            }
          });
          
          if (testResponse.ok) {
            console.log('Using existing valid Drive token');
            sendResponse({ success: true, token: existingAuth.access_token });
            return;
          } else {
            console.log('Existing Drive token invalid, clearing and requesting new auth');
            await this.clearStoredData('drive_auth');
          }
        } catch (error) {
          console.log('Existing Drive token invalid, clearing and requesting new auth');
          await this.clearStoredData('drive_auth');
        }
      }
      
      console.log('Getting new Drive auth token');
      const token = await this.getAuthToken([
        'https://www.googleapis.com/auth/calendar.readonly',
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive.file'
      ]);
      
      if (token) {
        // Store token
        await this.storeAuthToken('drive_auth', token);
        sendResponse({ success: true, token });
      } else {
        sendResponse({ success: false, error: 'Failed to get auth token' });
      }
    } catch (error) {
      console.error('Drive authentication error:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  async getAuthToken(scopes, forceNewAuth = false) {
    return new Promise((resolve, reject) => {
      // If forceNewAuth is true, first clear any cached tokens
      if (forceNewAuth) {
        chrome.identity.clearAllCachedAuthTokens(() => {
          console.log('Cleared cached tokens before new auth');
          
          chrome.identity.getAuthToken({
            interactive: true,
            scopes: scopes
          }, (token) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else {
              resolve(token);
            }
          });
        });
      } else {
        chrome.identity.getAuthToken({
          interactive: true,
          scopes: scopes
        }, (token) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(token);
          }
        });
      }
    });
  }

  async storeAuthToken(key, token) {
    return new Promise((resolve) => {
      const authData = {
        access_token: token,
        timestamp: Date.now()
      };
      chrome.storage.local.set({ [key]: authData }, resolve);
    });
  }

  async getStoredAuthToken(key) {
    return new Promise((resolve) => {
      chrome.storage.local.get([key], (result) => {
        resolve(result[key]);
      });
    });
  }

  async syncEvents(sendResponse) {
    try {
      console.log('Starting event sync...');
      
      // Get auth token
      const authData = await this.getStoredAuthToken('google_auth');
      if (!authData || !authData.access_token) {
        throw new Error('Not authenticated with Google Calendar');
      }

      // Get calendar events
      const timeMin = new Date();
      timeMin.setMonth(timeMin.getMonth() - 6); // Last 6 months
      
      const timeMax = new Date();
      timeMax.setMonth(timeMax.getMonth() + 6); // Next 6 months

      const events = await this.fetchCalendarEvents(
        authData.access_token,
        timeMin.toISOString(),
        timeMax.toISOString()
      );

      // Filter and process career events
      const careerEvents = this.filterCareerEvents(events.items || []);
      const processedEvents = careerEvents.map(event => this.transformEvent(event));

      // Store processed events
      await this.storeEvents(processedEvents);

      console.log(`Synced ${processedEvents.length} career events`);
      
      if (sendResponse) {
        sendResponse({ success: true, count: processedEvents.length });
      }
    } catch (error) {
      console.error('Sync error:', error);
      if (sendResponse) {
        sendResponse({ success: false, error: error.message });
      }
    }
  }

  async fetchCalendarEvents(token, timeMin, timeMax) {
    const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?` +
      `timeMin=${encodeURIComponent(timeMin)}&` +
      `timeMax=${encodeURIComponent(timeMax)}&` +
      `singleEvents=true&` +
      `orderBy=startTime&` +
      `maxResults=1000`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Calendar API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  filterCareerEvents(events) {
    const careerKeywords = [
      // Korean keywords
      '강의', '특강', '수업', '교육', '워크숍',
      '심사', '평가', '검토', '리뷰',
      '멘토링', '코칭', '상담', '가이드',
      // English keywords
      'lecture', 'seminar', 'workshop', 'training', 'teaching',
      'evaluation', 'review', 'assessment', 'judging',
      'mentoring', 'coaching', 'guidance', 'consultation'
    ];

    return events.filter(event => {
      if (!event.summary) return false;
      
      const title = event.summary.toLowerCase();
      return careerKeywords.some(keyword => title.includes(keyword.toLowerCase()));
    });
  }

  transformEvent(event) {
    const baseEvent = {
      id: event.id,
      title: event.summary,
      description: event.description || '',
      location: event.location || '',
      startTime: event.start.dateTime || event.start.date,
      endTime: event.end.dateTime || event.end.date,
      date: (event.start.dateTime || event.start.date).split('T')[0],
      type: this.classifyEventType(event.summary, event.description),
      source: 'google-calendar',
      processed: true,
      synced: {
        googleSheets: false,
        notion: false
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Add role classification
    const roleInfo = this.classifyByRole(baseEvent);
    baseEvent.role = roleInfo.role;
    baseEvent.category = roleInfo.category;
    baseEvent.subcategory = roleInfo.subcategory;

    return baseEvent;
  }

  classifyEventType(title, description = '') {
    const searchText = `${title} ${description}`.toLowerCase();
    
    // Lecture keywords
    if (searchText.includes('강의') || searchText.includes('특강') || 
        searchText.includes('수업') || searchText.includes('교육') ||
        searchText.includes('lecture') || searchText.includes('seminar') ||
        searchText.includes('workshop') || searchText.includes('training')) {
      return 'lecture';
    }
    
    // Evaluation keywords
    if (searchText.includes('심사') || searchText.includes('평가') ||
        searchText.includes('검토') || searchText.includes('리뷰') ||
        searchText.includes('evaluation') || searchText.includes('review') ||
        searchText.includes('assessment') || searchText.includes('judging')) {
      return 'evaluation';
    }
    
    // Mentoring keywords
    if (searchText.includes('멘토링') || searchText.includes('코칭') ||
        searchText.includes('상담') || searchText.includes('가이드') ||
        searchText.includes('mentoring') || searchText.includes('coaching') ||
        searchText.includes('guidance') || searchText.includes('consultation')) {
      return 'mentoring';
    }
    
    return 'other';
  }

  classifyByRole(event) {
    const eventType = event.type;
    
    switch (eventType) {
      case 'lecture':
        return {
          role: 'instructor',
          category: 'teaching',
          subcategory: this.getSubcategory(event, 'lecture')
        };
      case 'evaluation':
        return {
          role: 'judge',
          category: 'assessment',
          subcategory: this.getSubcategory(event, 'evaluation')
        };
      case 'mentoring':
        return {
          role: 'mentor',
          category: 'guidance',
          subcategory: this.getSubcategory(event, 'mentoring')
        };
      default:
        return {
          role: 'other',
          category: 'misc',
          subcategory: 'general'
        };
    }
  }

  getSubcategory(event, type) {
    const title = event.title.toLowerCase();
    const description = (event.description || '').toLowerCase();
    
    switch (type) {
      case 'lecture':
        if (title.includes('특강') || title.includes('guest lecture')) return 'guest-lecture';
        if (title.includes('워크숍') || title.includes('workshop')) return 'workshop';
        if (title.includes('세미나') || title.includes('seminar')) return 'seminar';
        return 'regular-lecture';
        
      case 'evaluation':
        if (title.includes('공모') || title.includes('contest')) return 'contest';
        if (title.includes('프로젝트') || title.includes('project')) return 'project';
        if (title.includes('논문') || title.includes('paper')) return 'paper';
        return 'general-evaluation';
        
      case 'mentoring':
        if (title.includes('진로') || title.includes('career')) return 'career-guidance';
        if (title.includes('기술') || title.includes('technical')) return 'technical-mentoring';
        return 'general-mentoring';
        
      default:
        return 'general';
    }
  }

  async storeEvents(events) {
    return new Promise((resolve) => {
      chrome.storage.local.set({
        career_events: events,
        last_sync: new Date().toISOString()
      }, resolve);
    });
  }

  async getCalendarEvents(timeRange, sendResponse) {
    try {
      const authData = await this.getStoredAuthToken('google_auth');
      if (!authData || !authData.access_token) {
        throw new Error('Not authenticated with Google Calendar');
      }

      const events = await this.fetchCalendarEvents(
        authData.access_token,
        timeRange.start,
        timeRange.end
      );

      sendResponse({ success: true, events: events.items || [] });
    } catch (error) {
      console.error('Get calendar events error:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  async syncToSpreadsheets(sendResponse) {
    try {
      console.log('Starting spreadsheet sync...');
      
      // Check if Drive authentication exists
      const driveAuthData = await this.getStoredAuthToken('drive_auth');
      if (!driveAuthData || !driveAuthData.access_token) {
        throw new Error('Not authenticated with Google Drive');
      }

      // Get stored events
      const storedData = await this.getStoredEvents();
      if (!storedData || !storedData.career_events) {
        throw new Error('No events found to sync');
      }

      const events = storedData.career_events;
      
      // Group events by role
      const eventsByRole = this.groupEventsByRole(events);
      
      // Get or create spreadsheets
      const settings = await this.getSettings();
      let spreadsheetIds = settings.spreadsheetIds || {};

      const results = {
        synced: 0,
        failed: 0,
        spreadsheets: {}
      };

      for (const [role, roleEvents] of Object.entries(eventsByRole)) {
        if (roleEvents.length === 0) continue;

        try {
          // Create spreadsheet if it doesn't exist
          if (!spreadsheetIds[role]) {
            const createResult = await this.createRoleSpreadsheet(role, driveAuthData.access_token);
            if (createResult.success) {
              spreadsheetIds[role] = createResult.spreadsheetId;
              results.spreadsheets[role] = createResult;
            } else {
              results.failed += roleEvents.length;
              continue;
            }
          }

          // Sync events to spreadsheet
          const syncResult = await this.syncRoleEventsToSpreadsheet(
            roleEvents, 
            spreadsheetIds[role], 
            role, 
            driveAuthData.access_token
          );
          
          results.synced += syncResult.synced || 0;
          results.failed += syncResult.failed || 0;

        } catch (error) {
          console.error(`Error syncing ${role} events:`, error);
          results.failed += roleEvents.length;
        }
      }

      // Update settings with spreadsheet IDs
      await this.updateSettings({ spreadsheetIds });

      console.log(`Sync completed: ${results.synced} synced, ${results.failed} failed`);
      
      if (sendResponse) {
        sendResponse({ success: true, results });
      }
    } catch (error) {
      console.error('Spreadsheet sync error:', error);
      if (sendResponse) {
        sendResponse({ success: false, error: error.message });
      }
    }
  }

  async initializeSpreadsheets(sendResponse) {
    try {
      const driveAuthData = await this.getStoredAuthToken('drive_auth');
      if (!driveAuthData || !driveAuthData.access_token) {
        throw new Error('Not authenticated with Google Drive');
      }

      const settings = await this.getSettings();
      const spreadsheetIds = settings.spreadsheetIds || {};
      const roles = ['instructor', 'judge', 'mentor'];
      const results = {};

      for (const role of roles) {
        if (!spreadsheetIds[role]) {
          const createResult = await this.createRoleSpreadsheet(role, driveAuthData.access_token);
          if (createResult.success) {
            spreadsheetIds[role] = createResult.spreadsheetId;
            results[role] = createResult;
          }
        }
      }

      await this.updateSettings({ spreadsheetIds });

      if (sendResponse) {
        sendResponse({ success: true, results });
      }
    } catch (error) {
      console.error('Initialize spreadsheets error:', error);
      if (sendResponse) {
        sendResponse({ success: false, error: error.message });
      }
    }
  }

  async getSpreadsheetSummary(sendResponse) {
    try {
      const settings = await this.getSettings();
      const spreadsheetIds = settings.spreadsheetIds || {};
      const summary = {};

      for (const [role, spreadsheetId] of Object.entries(spreadsheetIds)) {
        summary[role] = {
          spreadsheetId,
          url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
          exists: !!spreadsheetId
        };
      }

      if (sendResponse) {
        sendResponse({ success: true, summary });
      }
    } catch (error) {
      console.error('Get spreadsheet summary error:', error);
      if (sendResponse) {
        sendResponse({ success: false, error: error.message });
      }
    }
  }

  groupEventsByRole(events) {
    const grouped = {
      instructor: [],
      judge: [],
      mentor: [],
      other: []
    };

    events.forEach(event => {
      const role = event.role || 'other';
      if (grouped[role]) {
        grouped[role].push(event);
      } else {
        grouped.other.push(event);
      }
    });

    return grouped;
  }

  async createRoleSpreadsheet(role, token) {
    try {
      const configs = {
        instructor: {
          name: 'Instructor Career History',
          sheetName: 'Instructor Activities'
        },
        judge: {
          name: 'Judge Career History',
          sheetName: 'Judge Activities'
        },
        mentor: {
          name: 'Mentor Career History',
          sheetName: 'Mentor Activities'
        }
      };

      const config = configs[role];
      if (!config) {
        throw new Error(`Unknown role: ${role}`);
      }

      const title = `${config.name} - ${new Date().getFullYear()}`;
      
      // Create spreadsheet using Sheets API
      const createResponse = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          properties: {
            title: title
          },
          sheets: [{
            properties: {
              title: config.sheetName
            }
          }]
        })
      });

      if (!createResponse.ok) {
        throw new Error(`Failed to create spreadsheet: ${createResponse.status}`);
      }

      const spreadsheet = await createResponse.json();
      const spreadsheetId = spreadsheet.spreadsheetId;

      // Add headers
      const headers = [
        'Title', 'Date', 'Start Time', 'End Time', 'Type', 
        'Subcategory', 'Location', 'Description', 'Source', 'Created At'
      ];

      await this.updateSpreadsheetData(spreadsheetId, config.sheetName, 'A1', [headers], token);

      return {
        success: true,
        spreadsheetId,
        url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`
      };
    } catch (error) {
      console.error(`Error creating ${role} spreadsheet:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async syncRoleEventsToSpreadsheet(events, spreadsheetId, role, token) {
    try {
      const configs = {
        instructor: { sheetName: 'Instructor Activities' },
        judge: { sheetName: 'Judge Activities' },
        mentor: { sheetName: 'Mentor Activities' }
      };

      const config = configs[role];
      const unsyncedEvents = events.filter(event => !event.synced.googleSheets);
      
      if (unsyncedEvents.length === 0) {
        return { synced: 0, failed: 0 };
      }

      const eventRows = unsyncedEvents.map(event => [
        event.title,
        event.date,
        event.startTime,
        event.endTime,
        event.type,
        event.subcategory,
        event.location,
        event.description,
        event.source,
        event.createdAt
      ]);

      const result = await this.appendSpreadsheetData(spreadsheetId, config.sheetName, eventRows, token);
      
      if (result.success) {
        // Mark events as synced
        unsyncedEvents.forEach(event => {
          event.synced.googleSheets = true;
          event.updatedAt = new Date().toISOString();
        });
        
        // Update stored events
        await this.storeEvents(events);
        
        return { synced: unsyncedEvents.length, failed: 0 };
      } else {
        return { synced: 0, failed: unsyncedEvents.length };
      }
    } catch (error) {
      console.error('Error syncing role events:', error);
      return { synced: 0, failed: events.length };
    }
  }

  async updateSpreadsheetData(spreadsheetId, sheetName, range, data, token) {
    const fullRange = `${sheetName}!${range}`;
    
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(fullRange)}?valueInputOption=RAW`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          values: data
        })
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to update spreadsheet: ${response.status}`);
    }

    return response.json();
  }

  async appendSpreadsheetData(spreadsheetId, sheetName, data, token) {
    try {
      const range = `${sheetName}!A:Z`;
      
      const response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            values: data
          })
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to append to spreadsheet: ${response.status}`);
      }

      return {
        success: true,
        result: await response.json()
      };
    } catch (error) {
      console.error('Error appending data:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async getStoredEvents() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['career_events'], resolve);
    });
  }

  async getSettings() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['settings'], (result) => {
        resolve(result.settings || {});
      });
    });
  }

  async updateSettings(newSettings) {
    const currentSettings = await this.getSettings();
    const updatedSettings = { ...currentSettings, ...newSettings };
    
    return new Promise((resolve) => {
      chrome.storage.local.set({ settings: updatedSettings }, resolve);
    });
  }

  // === 새로운 데이터 수집 메소드들 ===

  async getCalendarEventsWithParams(params, sendResponse) {
    try {
      // Get stored auth token
      const authData = await this.getStoredData('google_auth');
      if (!authData || !authData.access_token) {
        throw new Error('Google 인증이 필요합니다.');
      }

      // Prepare Calendar API request
      const calendarId = 'primary';
      const url = `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?` +
        new URLSearchParams({
          timeMin: params.timeMin,
          timeMax: params.timeMax,
          singleEvents: 'true',
          orderBy: 'startTime',
          maxResults: 2500 // Maximum allowed by API
        });

      console.log('Fetching calendar events:', url);

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${authData.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Calendar API error: ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      console.log(`Found ${data.items?.length || 0} calendar events`);

      sendResponse({
        success: true,
        events: data.items || []
      });

    } catch (error) {
      console.error('Calendar events fetch error:', error);
      sendResponse({
        success: false,
        error: error.message
      });
    }
  }

  async createSpreadsheet(params, sendResponse) {
    try {
      // Get stored auth token
      const authData = await this.getStoredData('google_auth');
      if (!authData || !authData.access_token) {
        throw new Error('Google 인증이 필요합니다.');
      }

      // Get drive settings for folder and filename configuration
      const settings = await this.getSettings();
      const driveSettings = settings.driveSettings || {
        selectedFolderId: 'root',
        filenameTemplate: '{role}_{period}',
        customFilename: ''
      };

      // Generate filename based on settings
      const filename = this.generateFilename(params, driveSettings);

      // Create spreadsheet using Google Sheets API
      const createUrl = 'https://sheets.googleapis.com/v4/spreadsheets';
      
      const spreadsheetData = {
        properties: {
          title: filename
        },
        sheets: [{
          properties: {
            title: this.getSheetNameForRole(params.role),
            gridProperties: {
              rowCount: 1000,
              columnCount: 20
            }
          }
        }]
      };

      console.log('Creating spreadsheet:', filename);

      const createResponse = await fetch(createUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authData.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(spreadsheetData)
      });

      if (!createResponse.ok) {
        const errorData = await createResponse.json();
        const errorMessage = errorData.error?.message || createResponse.statusText;
        
        // If insufficient authentication scopes, trigger re-authentication
        if (errorMessage.includes('insufficient authentication scopes')) {
          console.log('Insufficient scopes detected, clearing stored auth data to trigger re-authentication');
          await this.clearStoredData('google_auth');
          throw new Error('권한이 부족합니다. Google 서비스를 다시 연결해주세요.');
        }
        
        throw new Error(`Spreadsheet creation error: ${errorMessage}`);
      }

      const spreadsheet = await createResponse.json();
      
      // Add headers to the sheet
      await this.addHeadersToSheet(spreadsheet.spreadsheetId, params.role, authData.access_token);

      // Move spreadsheet to selected folder if not root
      const targetFolderId = params.folderId || driveSettings.selectedFolderId;
      if (targetFolderId && targetFolderId !== 'root') {
        console.log('Moving spreadsheet to folder:', targetFolderId);
        try {
          const moveResult = await this.moveFileToFolder(spreadsheet.spreadsheetId, targetFolderId, authData.access_token);
          if (moveResult.success) {
            console.log('Spreadsheet moved to folder successfully');
          } else {
            console.error('Failed to move spreadsheet to folder:', moveResult.error);
          }
        } catch (moveError) {
          console.error('Error moving spreadsheet to folder:', moveError);
          // Don't fail the entire operation if move fails
        }
      }

      console.log('Spreadsheet created:', spreadsheet.spreadsheetUrl);

      sendResponse({
        success: true,
        spreadsheetId: spreadsheet.spreadsheetId,
        webViewLink: spreadsheet.spreadsheetUrl,
        title: filename
      });

    } catch (error) {
      console.error('Spreadsheet creation error:', error);
      sendResponse({
        success: false,
        error: error.message
      });
    }
  }

  generateFilename(params, driveSettings) {
    // Use custom filename if provided
    if (driveSettings.customFilename && driveSettings.customFilename.trim()) {
      return driveSettings.customFilename.trim();
    }

    // Use template
    let filename = driveSettings.filenameTemplate || '{role}_{period}';
    const now = new Date();
    
    // Replace placeholders
    const roleNames = {
      instructor: '강사활동',
      judge: '심사활동',
      mentor: '멘토링활동',
      other: '기타활동'
    };

    const replacements = {
      '{role}': roleNames[params.role] || params.role,
      '{period}': params.period || now.getFullYear().toString(),
      '{year}': now.getFullYear().toString(),
      '{month}': (now.getMonth() + 1).toString().padStart(2, '0'),
      '{date}': now.toISOString().split('T')[0].replace(/-/g, '')
    };

    for (const [placeholder, value] of Object.entries(replacements)) {
      filename = filename.replace(new RegExp(placeholder, 'g'), value);
    }

    return filename;
  }

  getSheetNameForRole(role) {
    const names = {
      instructor: '강사활동',
      judge: '심사활동',
      mentor: '멘토링활동',
      other: '기타활동'
    };
    return names[role] || '데이터';
  }

  async addHeadersToSheet(spreadsheetId, role, accessToken, sheetId = null) {
    // Define column headers based on role
    const headers = [
      '제목',
      '날짜', 
      '시작시간',
      '종료시간',
      '위치',
      '설명',
      '유형',
      '역할',
      '세부카테고리',
      '생성일'
    ];

    // Determine the sheet name/range
    let sheetRange = 'A1:J1';
    if (sheetId !== null) {
      // For new tabs, we need to get the sheet name first
      const sheetInfoResponse = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      
      if (sheetInfoResponse.ok) {
        const sheetInfo = await sheetInfoResponse.json();
        const sheet = sheetInfo.sheets.find(s => s.properties.sheetId === sheetId);
        if (sheet) {
          sheetRange = `${sheet.properties.title}!A1:J1`;
        }
      }
    }

    const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetRange}?valueInputOption=RAW`;

    const response = await fetch(updateUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        values: [headers]
      })
    });

    if (!response.ok) {
      console.warn('Failed to add headers:', response.statusText);
    }
  }

  async populateSpreadsheet(params, sendResponse) {
    try {
      // Get stored auth token
      const authData = await this.getStoredData('google_auth');
      if (!authData || !authData.access_token) {
        throw new Error('Google 인증이 필요합니다.');
      }

      const { spreadsheetId, events, role, sheetName } = params;

      // Convert events to spreadsheet rows
      const rows = events.map(event => this.eventToSpreadsheetRow(event));

      if (rows.length === 0) {
        sendResponse({ success: true, rowsAdded: 0 });
        return;
      }

      // Use sheet name if provided, otherwise use default sheet name
      const targetSheet = sheetName || this.getSheetNameForRole(role);
      
      console.log(`populateSpreadsheet called with params:`, {
        spreadsheetId,
        role,
        sheetName,
        targetSheet,
        eventsCount: events.length
      });
      
      // Add data to specific sheet tab - using append to avoid overwriting
      const range = `'${targetSheet}'!A2:J`;
      const appendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`;

      console.log(`Adding ${rows.length} rows to sheet '${targetSheet}' in spreadsheet ${spreadsheetId}`);

      const response = await fetch(appendUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authData.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          values: rows
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Spreadsheet update error: ${errorData.error?.message || response.statusText}`);
      }

      console.log(`Successfully added ${rows.length} rows to spreadsheet`);

      sendResponse({
        success: true,
        rowsAdded: rows.length
      });

    } catch (error) {
      console.error('Spreadsheet population error:', error);
      sendResponse({
        success: false,
        error: error.message
      });
    }
  }

  eventToSpreadsheetRow(event) {
    // Convert event to spreadsheet row
    const startTime = event.start?.dateTime || event.start?.date || '';
    const endTime = event.end?.dateTime || event.end?.date || '';
    
    const formatDateTime = (dateTimeStr) => {
      if (!dateTimeStr) return '';
      try {
        const date = new Date(dateTimeStr);
        return date.toLocaleString('ko-KR');
      } catch {
        return dateTimeStr;
      }
    };

    return [
      event.summary || '',                           // 제목
      startTime.split('T')[0] || '',                // 날짜 (YYYY-MM-DD)
      formatDateTime(startTime),                     // 시작시간
      formatDateTime(endTime),                       // 종료시간
      event.location || '',                          // 위치
      event.description || '',                       // 설명
      event.type || '',                             // 유형
      event.role || '',                             // 역할
      event.subcategory || '',                      // 세부카테고리
      new Date().toLocaleString('ko-KR')            // 생성일
    ];
  }

  async getStoredData(key) {
    return new Promise((resolve) => {
      chrome.storage.local.get([key], (result) => {
        resolve(result[key]);
      });
    });
  }

  async storeData(key, data) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [key]: data }, resolve);
    });
  }

  async clearStoredData(key) {
    return new Promise((resolve) => {
      chrome.storage.local.remove([key], resolve);
    });
  }

  // === Google Drive 폴더 관련 메소드들 ===

  async listDriveContents(params, sendResponse) {
    try {
      const authData = await this.getStoredData('drive_auth');
      if (!authData || !authData.access_token) {
        throw new Error('Google Drive 인증이 필요합니다.');
      }

      const parentId = params.parentId || 'root';
      const query = `'${parentId}' in parents and trashed = false`;
      
      const url = `https://www.googleapis.com/drive/v3/files?` +
        new URLSearchParams({
          q: query,
          fields: 'files(id, name, parents, createdTime, modifiedTime, mimeType)',
          orderBy: 'folder, name'
        });

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${authData.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Drive API error: ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      
      sendResponse({
        success: true,
        folders: data.files || [], // Keep the same response format for compatibility
        parentId: parentId
      });

    } catch (error) {
      console.error('List drive contents error:', error);
      sendResponse({
        success: false,
        error: error.message
      });
    }
  }

  async createDriveFolder(params, sendResponse) {
    try {
      const authData = await this.getStoredData('drive_auth');
      if (!authData || !authData.access_token) {
        throw new Error('Google Drive 인증이 필요합니다.');
      }

      const { name, parentId = 'root' } = params;
      
      const url = 'https://www.googleapis.com/drive/v3/files';
      
      const folderData = {
        name: name,
        parents: [parentId],
        mimeType: 'application/vnd.google-apps.folder'
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authData.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(folderData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Folder creation error: ${errorData.error?.message || response.statusText}`);
      }

      const folder = await response.json();
      
      sendResponse({
        success: true,
        folder: {
          id: folder.id,
          name: folder.name,
          parents: folder.parents
        }
      });

    } catch (error) {
      console.error('Create folder error:', error);
      sendResponse({
        success: false,
        error: error.message
      });
    }
  }

  async getDriveSettings(sendResponse) {
    try {
      const settings = await this.getSettings();
      const driveSettings = settings.driveSettings || {
        selectedFolderId: 'root',
        selectedFolderName: '루트 폴더',
        filenameTemplate: '{role}_{period}',
        customFilename: ''
      };

      sendResponse({
        success: true,
        settings: driveSettings
      });

    } catch (error) {
      console.error('Get drive settings error:', error);
      sendResponse({
        success: false,
        error: error.message
      });
    }
  }

  async saveDriveSettings(params, sendResponse) {
    try {
      const currentSettings = await this.getSettings();
      const updatedSettings = {
        ...currentSettings,
        driveSettings: params.settings
      };

      await this.updateSettings(updatedSettings);

      sendResponse({
        success: true,
        settings: params.settings
      });

    } catch (error) {
      console.error('Save drive settings error:', error);
      sendResponse({
        success: false,
        error: error.message
      });
    }
  }

  async moveFileToFolder(fileId, folderId, accessToken) {
    try {
      console.log(`Moving file ${fileId} to folder ${folderId}`);
      
      // Get current parents
      const fileResponse = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?fields=parents`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (!fileResponse.ok) {
        const errorData = await fileResponse.json();
        throw new Error(`Failed to get file parents: ${errorData.error?.message || fileResponse.statusText}`);
      }

      const fileData = await fileResponse.json();
      const previousParents = fileData.parents.join(',');
      
      console.log(`Previous parents: ${previousParents}`);

      // Move file
      const moveResponse = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?addParents=${folderId}&removeParents=${previousParents}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (!moveResponse.ok) {
        const errorData = await moveResponse.json();
        throw new Error(`Failed to move file: ${errorData.error?.message || moveResponse.statusText}`);
      }

      console.log(`File moved successfully to folder ${folderId}`);
      return { success: true };

    } catch (error) {
      console.error('Move file error:', error);
      return { success: false, error: error.message };
    }
  }

  async listSpreadsheets(params, sendResponse) {
    try {
      const authData = await this.getStoredData('google_auth');
      if (!authData || !authData.access_token) {
        throw new Error('Google 인증이 필요합니다.');
      }

      // Search for spreadsheets using Google Drive API
      const searchUrl = 'https://www.googleapis.com/drive/v3/files';
      const searchParams = new URLSearchParams({
        q: "mimeType='application/vnd.google-apps.spreadsheet'",
        fields: 'files(id,name,modifiedTime,webViewLink)',
        orderBy: 'modifiedTime desc',
        pageSize: '50'
      });

      const response = await fetch(`${searchUrl}?${searchParams}`, {
        headers: {
          'Authorization': `Bearer ${authData.access_token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = errorData.error?.message || response.statusText;
        
        // If insufficient authentication scopes, trigger re-authentication
        if (errorMessage.includes('insufficient authentication scopes')) {
          console.log('Insufficient scopes detected, clearing stored auth data to trigger re-authentication');
          await this.clearStoredData('google_auth');
          throw new Error('권한이 부족합니다. Google 서비스를 다시 연결해주세요.');
        }
        
        throw new Error(`스프레드시트 목록 조회 실패: ${errorMessage}`);
      }

      const data = await response.json();
      
      sendResponse({
        success: true,
        spreadsheets: data.files || []
      });

    } catch (error) {
      console.error('Error listing spreadsheets:', error);
      sendResponse({
        success: false,
        error: error.message
      });
    }
  }

  async addSheetTab(params, sendResponse) {
    try {
      const { spreadsheetId, tabTitle, role } = params;
      
      const authData = await this.getStoredData('google_auth');
      if (!authData || !authData.access_token) {
        throw new Error('Google 인증이 필요합니다.');
      }

      // Add new sheet tab using Google Sheets API
      const batchUpdateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`;
      
      const addSheetRequest = {
        requests: [{
          addSheet: {
            properties: {
              title: tabTitle,
              gridProperties: {
                rowCount: 1000,
                columnCount: 20
              }
            }
          }
        }]
      };

      const response = await fetch(batchUpdateUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authData.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(addSheetRequest)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`탭 추가 실패: ${errorData.error?.message || response.statusText}`);
      }

      const result = await response.json();
      const newSheetId = result.replies[0].addSheet.properties.sheetId;

      // Add headers to the new sheet
      await this.addHeadersToSheet(spreadsheetId, role, authData.access_token, newSheetId);

      // Get spreadsheet info for web view link
      const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

      sendResponse({
        success: true,
        spreadsheetId: spreadsheetId,
        sheetId: newSheetId,
        webViewLink: spreadsheetUrl,
        title: tabTitle
      });

    } catch (error) {
      console.error('Error adding sheet tab:', error);
      sendResponse({
        success: false,
        error: error.message
      });
    }
  }

  async getAccessToken(sendResponse) {
    try {
      // Try to get existing stored token first
      const authData = await this.getStoredData('drive_auth');
      if (authData && authData.access_token) {
        // Check if token is still valid (simple check)
        const testResponse = await fetch('https://www.googleapis.com/drive/v3/about?fields=user', {
          headers: {
            'Authorization': `Bearer ${authData.access_token}`
          }
        });

        if (testResponse.ok) {
          sendResponse({
            success: true,
            token: authData.access_token
          });
          return;
        }
      }

      // Get new token if existing one doesn't work
      const token = await this.getAuthToken([
        'https://www.googleapis.com/auth/drive.file',
        'https://www.googleapis.com/auth/drive.readonly'
      ]);

      if (token) {
        await this.storeAuthToken('drive_auth', token);
        sendResponse({
          success: true,
          token: token
        });
      } else {
        throw new Error('Failed to get access token');
      }

    } catch (error) {
      console.error('Get access token error:', error);
      sendResponse({
        success: false,
        error: error.message
      });
    }
  }

  async handleFolderSelected(folder, sendResponse) {
    try {
      // Store the selected folder information
      const currentSettings = await this.getSettings();
      const updatedSettings = {
        ...currentSettings,
        driveSettings: {
          ...currentSettings.driveSettings,
          selectedFolderId: folder.id,
          selectedFolderName: folder.name
        }
      };

      await this.updateSettings(updatedSettings);

      sendResponse({
        success: true,
        folder: folder
      });

    } catch (error) {
      console.error('Handle folder selected error:', error);
      sendResponse({
        success: false,
        error: error.message
      });
    }
  }

  async autoConnectDrive(sendResponse) {
    try {
      // Get existing Google auth token
      const googleAuth = await this.getStoredData('google_auth');
      
      if (!googleAuth || !googleAuth.access_token) {
        throw new Error('Google authentication required');
      }

      // Store the same token for Drive auth (Google auth includes Drive scopes)
      await this.storeData('drive_auth', {
        access_token: googleAuth.access_token,
        refresh_token: googleAuth.refresh_token,
        expires_at: googleAuth.expires_at,
        auto_connected: true
      });

      console.log('Drive auto-connected using Google auth token');

      sendResponse({
        success: true,
        message: 'Drive auto-connected successfully'
      });

    } catch (error) {
      console.error('Auto connect drive error:', error);
      sendResponse({
        success: false,
        error: error.message
      });
    }
  }

  async logout(sendResponse) {
    try {
      console.log('Starting logout process...');
      
      // Get cached token before clearing
      const cachedToken = await this.getCachedToken();
      
      // Remove ALL cached tokens from Chrome Identity API first
      await new Promise((resolve) => {
        chrome.identity.clearAllCachedAuthTokens(() => {
          console.log('All cached tokens cleared');
          resolve();
        });
      });
      
      // Also specifically remove the cached token if we have it
      if (cachedToken) {
        await new Promise((resolve) => {
          chrome.identity.removeCachedAuthToken({
            token: cachedToken
          }, () => {
            console.log('Specific cached token removed');
            resolve();
          });
        });
      }
      
      // Clear all Chrome storage
      await new Promise((resolve) => {
        chrome.storage.local.clear(() => {
          console.log('All local storage cleared');
          resolve();
        });
      });
      
      await new Promise((resolve) => {
        chrome.storage.sync.clear(() => {
          console.log('All sync storage cleared');
          resolve();
        });
      });
      
      // Clear any remaining alarms
      chrome.alarms.clearAll();
      
      console.log('Logout completed successfully');
      sendResponse({ success: true, message: 'Logged out successfully' });
      
    } catch (error) {
      console.error('Logout error:', error);
      sendResponse({ success: false, error: error.message });
    }
  }
}

// Initialize background script
new CareerManagerBackground();

// Handle installation
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('Career Manager installed');
    // Set up initial configuration
    chrome.storage.local.set({
      settings: {
        autoSync: true,
        syncInterval: 30,
        keywords: {
          lecture: ['강의', '특강', '수업', 'lecture', 'seminar'],
          evaluation: ['심사', '평가', 'evaluation', 'review'],
          mentoring: ['멘토링', '코칭', 'mentoring', 'coaching']
        }
      }
    });
  }
});