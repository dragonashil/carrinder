# Career Manager Chrome Extension PRD

## 1. Product Overview

### 1.1 Product Introduction
A Google Chrome extension designed for professionals such as instructors, judges, and other experts who need career and history management. It automatically extracts career-related events (lectures, seminars, evaluations, mentoring) from Google Calendar and manages them through Google Drive spreadsheets and Notion databases.

### 1.2 Target Users
- Professional instructors
- Judges/evaluators
- Mentors
- Other professionals requiring career management

## 2. Core Features

### 2.1 Google Calendar Integration
- Extract schedule data via Google Calendar API
- Filter events based on keywords (lecture, seminar, evaluation, mentoring)
- Automatically extract event title, location, and time information

### 2.2 Data Classification and Extraction
**Instructor-related Data:**
- Lecture title
- Location
- Lecture time (start time, end time)
- Date

**Judge-related Data:**
- Evaluation project name
- Location
- Evaluation time (start time, end time)
- Date

### 2.3 Google Drive Integration
- Create/update spreadsheets via Google Drive API
- Separate sheet management for instructors and judges
- Automatic data synchronization

### 2.4 Notion Integration
- Database integration via Notion API
- Structured data storage
- Search and filtering functionality

## 3. Technology Stack

### 3.1 Frontend
- HTML5, CSS3, JavaScript (ES6+)
- Chrome Extension Manifest V3
- Bootstrap or Tailwind CSS (UI framework)

### 3.2 API Integration
- Google Calendar API
- Google Drive API
- Notion API

### 3.3 Data Storage
- Chrome Storage API (local settings and temporary data)
- Google Sheets (spreadsheet storage)
- Notion Database (structured data management)

## 4. Main UI Components

### 4.1 Main Dashboard
- Recently extracted event list
- Synchronization status
- Quick action buttons

### 4.2 Settings Screen
- Google account integration
- Notion account integration
- Keyword settings (lecture, evaluation, etc.)
- Auto-sync settings

### 4.3 Data Management Screen
- Extracted data list
- Manual editing functionality
- Data classification and tag management

## 5. Development Phases

### Phase 1: Basic Structure and Google Calendar Integration
- Chrome Extension basic structure setup
- Google Calendar API integration
- Event data extraction and filtering

### Phase 2: Data Classification and Google Drive Integration
- Instructor/judge data classification logic
- Google Drive API integration
- Spreadsheet creation and updates

### Phase 3: Notion Integration and UI Improvement
- Notion API integration
- User interface improvements
- Data synchronization optimization

### Phase 4: Advanced Features and Optimization
- Automatic keyword learning
- Data analysis and reporting features
- Performance optimization

## 6. Security and Privacy

### 6.1 Data Security
- Secure API authentication via OAuth 2.0
- Minimal permission requests
- Local data encryption

### 6.2 Privacy Protection
- Data collection only with user consent
- Privacy policy compliance
- Data deletion options

## 7. Success Metrics

### 7.1 User Metrics
- Monthly active users
- Data extraction accuracy
- User satisfaction scores

### 7.2 Technical Metrics
- API response time
- Data synchronization success rate
- Extension installation and activation rates

## 8. Future Expansion Plans

### 8.1 Additional Features
- Integration with other calendar services (Outlook, Apple Calendar)
- Mobile app development
- Team collaboration features

### 8.2 AI Features
- Automated event classification
- Automatic resume generation
- Career analysis and recommendations

## 9. Project Structure

```
carrinder/
├── manifest.json                 # Chrome Extension manifest
├── src/
│   ├── popup/
│   │   ├── popup.html           # Extension popup UI
│   │   ├── popup.js             # Popup logic
│   │   └── popup.css            # Popup styling
│   ├── background/
│   │   └── background.js        # Background script
│   ├── content/
│   │   ├── content.js           # Content script
│   │   └── content.css          # Content styling
│   ├── options/
│   │   ├── options.html         # Settings page
│   │   ├── options.js           # Settings logic
│   │   └── options.css          # Settings styling
│   ├── api/
│   │   ├── googleCalendar.js    # Google Calendar API
│   │   ├── googleDrive.js       # Google Drive API
│   │   └── notion.js            # Notion API
│   ├── utils/
│   │   ├── storage.js           # Chrome Storage utilities
│   │   ├── auth.js              # Authentication helpers
│   │   └── dataProcessor.js     # Data processing utilities
│   └── assets/
│       ├── icons/               # Extension icons
│       └── images/              # UI images
├── docs/
│   ├── api-reference.md         # API documentation
│   ├── development-setup.md     # Development setup guide
│   ├── testing-guide.md         # Testing guidelines
│   └── deployment-guide.md      # Deployment instructions
├── tests/
│   ├── unit/                    # Unit tests
│   ├── integration/             # Integration tests
│   └── e2e/                     # End-to-end tests
├── build/
│   └── dist/                    # Build output
├── package.json                 # Dependencies
├── webpack.config.js            # Build configuration
└── README.md                    # Project overview
```

## 10. Risks and Mitigation Strategies

### 10.1 Technical Risks
- API change response strategies
- Data loss prevention
- Performance optimization

### 10.2 Business Risks
- Competitor analysis
- User acquisition strategies
- Revenue model development