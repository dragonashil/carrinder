# API Reference

## Google Calendar API

### Setup
- Enable Google Calendar API in Google Cloud Console
- Create OAuth 2.0 credentials
- Set up authorized redirect URIs

### Authentication
```javascript
// OAuth 2.0 authentication flow
const GOOGLE_CLIENT_ID = 'your-client-id';
const GOOGLE_SCOPES = ['https://www.googleapis.com/auth/calendar.readonly'];

function authenticateGoogle() {
  return new Promise((resolve, reject) => {
    chrome.identity.launchWebAuthFlow({
      url: `https://accounts.google.com/oauth/authorize?client_id=${GOOGLE_CLIENT_ID}&...`,
      interactive: true
    }, (responseUrl) => {
      // Handle authentication response
    });
  });
}
```

### Calendar Events API
```javascript
// Fetch calendar events
async function getCalendarEvents(timeMin, timeMax) {
  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${timeMin}&timeMax=${timeMax}`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    }
  );
  return response.json();
}
```

### Event Filtering
```javascript
// Filter events by keywords
const CAREER_KEYWORDS = ['강의', '특강', '심사', '멘토링', 'lecture', 'seminar', 'evaluation', 'mentoring'];

function filterCareerEvents(events) {
  return events.filter(event => {
    const title = event.summary.toLowerCase();
    return CAREER_KEYWORDS.some(keyword => title.includes(keyword));
  });
}
```

## Google Drive API

### Setup
- Enable Google Drive API in Google Cloud Console
- Use same OAuth 2.0 credentials as Calendar API
- Add Drive API scope

### Spreadsheet Creation
```javascript
// Create new spreadsheet
async function createSpreadsheet(title) {
  const response = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      properties: {
        title: title
      }
    })
  });
  return response.json();
}
```

### Data Update
```javascript
// Update spreadsheet data
async function updateSpreadsheetData(spreadsheetId, range, values) {
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=RAW`,
    {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        values: values
      })
    }
  );
  return response.json();
}
```

## Notion API

### Setup
- Create Notion integration at https://www.notion.so/my-integrations
- Get integration token
- Share database with integration

### Authentication
```javascript
const NOTION_TOKEN = 'your-notion-token';
const NOTION_DATABASE_ID = 'your-database-id';

const notionHeaders = {
  'Authorization': `Bearer ${NOTION_TOKEN}`,
  'Content-Type': 'application/json',
  'Notion-Version': '2022-06-28'
};
```

### Database Operations
```javascript
// Create database page
async function createNotionPage(properties) {
  const response = await fetch('https://api.notion.com/v1/pages', {
    method: 'POST',
    headers: notionHeaders,
    body: JSON.stringify({
      parent: {
        database_id: NOTION_DATABASE_ID
      },
      properties: properties
    })
  });
  return response.json();
}

// Query database
async function queryNotionDatabase(filter) {
  const response = await fetch(`https://api.notion.com/v1/databases/${NOTION_DATABASE_ID}/query`, {
    method: 'POST',
    headers: notionHeaders,
    body: JSON.stringify({
      filter: filter
    })
  });
  return response.json();
}
```

## Chrome Storage API

### Local Storage
```javascript
// Save data to local storage
function saveToStorage(key, data) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [key]: data }, resolve);
  });
}

// Get data from local storage
function getFromStorage(key) {
  return new Promise((resolve) => {
    chrome.storage.local.get([key], (result) => {
      resolve(result[key]);
    });
  });
}
```

### Sync Storage
```javascript
// Save settings to sync storage
function saveSettings(settings) {
  return new Promise((resolve) => {
    chrome.storage.sync.set({ settings: settings }, resolve);
  });
}

// Get settings from sync storage
function getSettings() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['settings'], (result) => {
      resolve(result.settings || {});
    });
  });
}
```

## Data Processing

### Event Data Structure
```javascript
const eventData = {
  id: 'unique-event-id',
  title: 'Event Title',
  location: 'Event Location',
  startTime: '2024-01-01T10:00:00Z',
  endTime: '2024-01-01T12:00:00Z',
  date: '2024-01-01',
  type: 'lecture' | 'evaluation' | 'mentoring',
  source: 'google-calendar',
  processed: false,
  synced: {
    googleSheets: false,
    notion: false
  }
};
```

### Data Transformation
```javascript
// Transform Google Calendar event to internal format
function transformCalendarEvent(calendarEvent) {
  return {
    id: calendarEvent.id,
    title: calendarEvent.summary,
    location: calendarEvent.location || '',
    startTime: calendarEvent.start.dateTime || calendarEvent.start.date,
    endTime: calendarEvent.end.dateTime || calendarEvent.end.date,
    date: new Date(calendarEvent.start.dateTime || calendarEvent.start.date).toISOString().split('T')[0],
    type: classifyEventType(calendarEvent.summary),
    source: 'google-calendar',
    processed: false,
    synced: {
      googleSheets: false,
      notion: false
    }
  };
}
```

## Error Handling

### API Error Response
```javascript
function handleApiError(error, apiName) {
  console.error(`${apiName} API Error:`, error);
  
  // Common error scenarios
  if (error.status === 401) {
    // Token expired, re-authenticate
    return refreshToken();
  } else if (error.status === 403) {
    // Insufficient permissions
    throw new Error(`Insufficient permissions for ${apiName}`);
  } else if (error.status === 429) {
    // Rate limit exceeded
    throw new Error(`Rate limit exceeded for ${apiName}`);
  } else {
    throw new Error(`${apiName} API request failed: ${error.message}`);
  }
}
```

### Retry Logic
```javascript
async function retryApiCall(apiCall, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await apiCall();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
    }
  }
}
```