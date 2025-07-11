# Testing Guide

## Testing Strategy

### Test Types
1. **Unit Tests** - Test individual functions and modules
2. **Integration Tests** - Test API integrations and data flow
3. **E2E Tests** - Test complete user workflows
4. **Manual Tests** - Test Chrome extension functionality

### Test Framework
- **Jest** - Unit and integration testing
- **Puppeteer** - E2E testing with Chrome
- **Chrome Extension Testing** - Manual testing procedures

## Unit Testing

### Setup
```bash
npm install --save-dev jest @babel/preset-env
```

### Configuration
Create `jest.config.js`:
```javascript
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js',
    '!src/assets/**'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
};
```

### Test Examples

#### Data Processing Tests
```javascript
// tests/unit/dataProcessor.test.js
import { transformCalendarEvent, classifyEventType } from '@/utils/dataProcessor';

describe('dataProcessor', () => {
  describe('transformCalendarEvent', () => {
    it('should transform Google Calendar event correctly', () => {
      const calendarEvent = {
        id: 'test-id',
        summary: 'JavaScript 강의',
        location: 'Seoul Tech Center',
        start: { dateTime: '2024-01-01T10:00:00Z' },
        end: { dateTime: '2024-01-01T12:00:00Z' }
      };

      const result = transformCalendarEvent(calendarEvent);

      expect(result).toEqual({
        id: 'test-id',
        title: 'JavaScript 강의',
        location: 'Seoul Tech Center',
        startTime: '2024-01-01T10:00:00Z',
        endTime: '2024-01-01T12:00:00Z',
        date: '2024-01-01',
        type: 'lecture',
        source: 'google-calendar',
        processed: false,
        synced: {
          googleSheets: false,
          notion: false
        }
      });
    });
  });

  describe('classifyEventType', () => {
    it('should classify lecture events', () => {
      expect(classifyEventType('JavaScript 강의')).toBe('lecture');
      expect(classifyEventType('React Workshop')).toBe('lecture');
    });

    it('should classify evaluation events', () => {
      expect(classifyEventType('프로젝트 심사')).toBe('evaluation');
      expect(classifyEventType('Startup Evaluation')).toBe('evaluation');
    });

    it('should classify mentoring events', () => {
      expect(classifyEventType('개발자 멘토링')).toBe('mentoring');
      expect(classifyEventType('Career Mentoring')).toBe('mentoring');
    });
  });
});
```

#### Storage Tests
```javascript
// tests/unit/storage.test.js
import { saveToStorage, getFromStorage } from '@/utils/storage';

// Mock Chrome API
global.chrome = {
  storage: {
    local: {
      set: jest.fn(),
      get: jest.fn()
    }
  }
};

describe('storage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('saveToStorage', () => {
    it('should save data to Chrome storage', async () => {
      const mockCallback = jest.fn();
      chrome.storage.local.set.mockImplementation((data, callback) => {
        callback();
      });

      await saveToStorage('test-key', { test: 'data' });

      expect(chrome.storage.local.set).toHaveBeenCalledWith(
        { 'test-key': { test: 'data' } },
        expect.any(Function)
      );
    });
  });

  describe('getFromStorage', () => {
    it('should retrieve data from Chrome storage', async () => {
      const mockData = { 'test-key': { test: 'data' } };
      chrome.storage.local.get.mockImplementation((keys, callback) => {
        callback(mockData);
      });

      const result = await getFromStorage('test-key');

      expect(result).toEqual({ test: 'data' });
      expect(chrome.storage.local.get).toHaveBeenCalledWith(
        ['test-key'],
        expect.any(Function)
      );
    });
  });
});
```

## Integration Testing

### API Integration Tests
```javascript
// tests/integration/googleCalendar.test.js
import { getCalendarEvents, filterCareerEvents } from '@/api/googleCalendar';

describe('Google Calendar Integration', () => {
  let mockFetch;

  beforeEach(() => {
    mockFetch = jest.fn();
    global.fetch = mockFetch;
  });

  describe('getCalendarEvents', () => {
    it('should fetch calendar events successfully', async () => {
      const mockEvents = {
        items: [
          {
            id: '1',
            summary: 'JavaScript 강의',
            start: { dateTime: '2024-01-01T10:00:00Z' },
            end: { dateTime: '2024-01-01T12:00:00Z' }
          }
        ]
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockEvents)
      });

      const result = await getCalendarEvents(
        '2024-01-01T00:00:00Z',
        '2024-01-31T23:59:59Z'
      );

      expect(result).toEqual(mockEvents);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('calendar/v3/calendars/primary/events'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': expect.stringContaining('Bearer')
          })
        })
      );
    });

    it('should handle API errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized'
      });

      await expect(getCalendarEvents('2024-01-01', '2024-01-31'))
        .rejects.toThrow('Unauthorized');
    });
  });

  describe('filterCareerEvents', () => {
    it('should filter career-related events', () => {
      const events = [
        { summary: 'JavaScript 강의' },
        { summary: '점심 약속' },
        { summary: '프로젝트 심사' },
        { summary: '개인 일정' }
      ];

      const result = filterCareerEvents(events);

      expect(result).toHaveLength(2);
      expect(result[0].summary).toBe('JavaScript 강의');
      expect(result[1].summary).toBe('프로젝트 심사');
    });
  });
});
```

### Notion Integration Tests
```javascript
// tests/integration/notion.test.js
import { createNotionPage, queryNotionDatabase } from '@/api/notion';

describe('Notion Integration', () => {
  let mockFetch;

  beforeEach(() => {
    mockFetch = jest.fn();
    global.fetch = mockFetch;
  });

  describe('createNotionPage', () => {
    it('should create a new page in Notion database', async () => {
      const mockResponse = {
        id: 'page-id',
        properties: {}
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const properties = {
        Title: {
          title: [{ text: { content: 'JavaScript 강의' } }]
        }
      };

      const result = await createNotionPage(properties);

      expect(result).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.notion.com/v1/pages',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': expect.stringContaining('Bearer'),
            'Notion-Version': '2022-06-28'
          }),
          body: expect.stringContaining('JavaScript 강의')
        })
      );
    });
  });
});
```

## E2E Testing

### Setup
```bash
npm install --save-dev puppeteer
```

### Test Configuration
```javascript
// tests/e2e/setup.js
const puppeteer = require('puppeteer');
const path = require('path');

const EXTENSION_PATH = path.join(__dirname, '../../build/dist');

async function setupBrowser() {
  const browser = await puppeteer.launch({
    headless: false,
    args: [
      `--load-extension=${EXTENSION_PATH}`,
      `--disable-extensions-except=${EXTENSION_PATH}`
    ]
  });
  return browser;
}

module.exports = { setupBrowser };
```

### E2E Test Examples
```javascript
// tests/e2e/popup.test.js
const { setupBrowser } = require('./setup');

describe('Extension Popup E2E', () => {
  let browser;
  let page;

  beforeAll(async () => {
    browser = await setupBrowser();
    page = await browser.newPage();
  });

  afterAll(async () => {
    await browser.close();
  });

  it('should open popup and display dashboard', async () => {
    // Navigate to extension popup
    await page.goto('chrome-extension://your-extension-id/popup.html');

    // Wait for elements to load
    await page.waitForSelector('.dashboard');

    // Check if dashboard elements are present
    const dashboardTitle = await page.$eval('.dashboard-title', el => el.textContent);
    expect(dashboardTitle).toBe('Career Manager');

    // Check if sync status is displayed
    const syncStatus = await page.$('.sync-status');
    expect(syncStatus).toBeTruthy();
  });

  it('should authenticate with Google Calendar', async () => {
    await page.goto('chrome-extension://your-extension-id/popup.html');

    // Click authenticate button
    await page.click('#google-auth-btn');

    // Wait for authentication flow
    await page.waitForSelector('.auth-success', { timeout: 30000 });

    // Verify authentication success
    const authStatus = await page.$eval('.auth-success', el => el.textContent);
    expect(authStatus).toContain('Successfully authenticated');
  });
});
```

## Manual Testing

### Chrome Extension Testing Checklist

#### Installation & Setup
- [ ] Extension loads without errors
- [ ] Manifest.json is valid
- [ ] All required permissions are granted
- [ ] Extension icon appears in toolbar

#### Authentication Flow
- [ ] Google OAuth flow works correctly
- [ ] Notion integration connects successfully
- [ ] Tokens are stored securely
- [ ] Re-authentication works when tokens expire

#### Data Extraction
- [ ] Calendar events are fetched correctly
- [ ] Career-related events are filtered properly
- [ ] Event data is transformed correctly
- [ ] Data is stored in Chrome storage

#### Data Synchronization
- [ ] Google Sheets integration works
- [ ] Notion database updates successfully
- [ ] Sync status is displayed correctly
- [ ] Error handling works for failed syncs

#### User Interface
- [ ] Popup displays correctly
- [ ] Settings page is accessible
- [ ] All buttons and forms work
- [ ] Responsive design on different screen sizes

#### Performance
- [ ] Extension doesn't slow down browser
- [ ] Memory usage is reasonable
- [ ] API calls are efficient
- [ ] Background scripts work properly

### Testing Procedures

#### 1. Fresh Installation Test
1. Remove any existing version
2. Load unpacked extension
3. Verify initial setup process
4. Test authentication flows
5. Check data extraction

#### 2. Upgrade Test
1. Install previous version
2. Set up some data
3. Upgrade to new version
4. Verify data migration
5. Test new features

#### 3. Error Scenarios
1. Test without internet connection
2. Test with invalid credentials
3. Test with API rate limits
4. Test with malformed data
5. Test extension disable/enable

#### 4. Cross-browser Testing
1. Test on different Chrome versions
2. Test on Chromium-based browsers
3. Verify compatibility issues
4. Test on different operating systems

## Test Data

### Sample Calendar Events
```javascript
const sampleEvents = [
  {
    id: 'event-1',
    summary: 'JavaScript 기초 강의',
    location: 'Seoul Tech Center',
    start: { dateTime: '2024-01-15T10:00:00Z' },
    end: { dateTime: '2024-01-15T12:00:00Z' }
  },
  {
    id: 'event-2',
    summary: '스타트업 심사',
    location: 'Gangnam Station',
    start: { dateTime: '2024-01-16T14:00:00Z' },
    end: { dateTime: '2024-01-16T17:00:00Z' }
  },
  {
    id: 'event-3',
    summary: '개발자 멘토링',
    location: 'Online',
    start: { dateTime: '2024-01-17T19:00:00Z' },
    end: { dateTime: '2024-01-17T20:00:00Z' }
  }
];
```

## Continuous Integration

### GitHub Actions Configuration
```yaml
# .github/workflows/test.yml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v2
    
    - name: Setup Node.js
      uses: actions/setup-node@v2
      with:
        node-version: '18'
        
    - name: Install dependencies
      run: npm ci
      
    - name: Run linter
      run: npm run lint
      
    - name: Run unit tests
      run: npm test
      
    - name: Run integration tests
      run: npm run test:integration
      
    - name: Build extension
      run: npm run build:prod
      
    - name: Upload coverage
      uses: codecov/codecov-action@v1
```

## Test Reporting

### Coverage Reports
```bash
# Generate coverage report
npm run test:coverage

# View coverage report
open coverage/lcov-report/index.html
```

### Test Results
- Unit test coverage should be > 80%
- Integration tests should cover all API endpoints
- E2E tests should cover critical user workflows
- Manual tests should be documented and repeatable