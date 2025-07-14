// Background script for Career Manager Chrome Extension
class CareerManagerBackground {
  constructor() {
    this.init();
  }

  init() {
    this.setupMessageHandlers();
    this.setupAlarms();
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
        case 'sync_to_spreadsheets':
          this.syncToSpreadsheets(sendResponse);
          break;
        case 'initialize_spreadsheets':
          this.initializeSpreadsheets(sendResponse);
          break;
        case 'get_spreadsheet_summary':
          this.getSpreadsheetSummary(sendResponse);
          break;
        default:
          sendResponse({ success: false, error: 'Unknown action' });
      }
      return true; // Keep message channel open for async response
    });
  }

  setupAlarms() {
    // Set up periodic sync (every 30 minutes)
    chrome.alarms.create('sync_events', {
      periodInMinutes: 30
    });

    chrome.alarms.onAlarm.addListener((alarm) => {
      if (alarm.name === 'sync_events') {
        this.syncEvents();
      }
    });
  }

  async authenticateGoogle(sendResponse) {
    try {
      const token = await this.getAuthToken(['https://www.googleapis.com/auth/calendar.readonly']);
      
      if (token) {
        // Store token
        await this.storeAuthToken('google_auth', token);
        sendResponse({ success: true, token });
      } else {
        sendResponse({ success: false, error: 'Failed to get auth token' });
      }
    } catch (error) {
      console.error('Google authentication error:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  async authenticateDrive(sendResponse) {
    try {
      const token = await this.getAuthToken([
        'https://www.googleapis.com/auth/drive.file',
        'https://www.googleapis.com/auth/spreadsheets'
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

  async getAuthToken(scopes) {
    return new Promise((resolve, reject) => {
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