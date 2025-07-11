# Development Setup Guide

## Prerequisites

### Required Software
- Node.js (v18 or higher)
- npm or yarn
- Google Chrome browser
- Git

### Development Tools (Recommended)
- Visual Studio Code
- Chrome DevTools
- Postman (for API testing)

## Project Setup

### 1. Clone Repository
```bash
git clone <repository-url>
cd carrinder
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Configuration
Create a `.env` file in the root directory:
```env
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
NOTION_TOKEN=your-notion-integration-token
NOTION_DATABASE_ID=your-notion-database-id
```

### 4. Google Cloud Console Setup

#### Enable APIs
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the following APIs:
   - Google Calendar API
   - Google Drive API
   - Google Sheets API

#### Create OAuth 2.0 Credentials
1. Go to Credentials page
2. Click "Create Credentials" > "OAuth 2.0 Client ID"
3. Select "Chrome Extension" as application type
4. Add your extension ID to authorized origins
5. Download the credentials JSON file

#### Configure OAuth Consent Screen
1. Go to OAuth consent screen
2. Fill in required information
3. Add test users for development
4. Add required scopes:
   - `https://www.googleapis.com/auth/calendar.readonly`
   - `https://www.googleapis.com/auth/drive.file`
   - `https://www.googleapis.com/auth/spreadsheets`

### 5. Notion Integration Setup

#### Create Integration
1. Go to [Notion Developers](https://www.notion.so/my-integrations)
2. Click "New integration"
3. Fill in integration details
4. Copy the integration token

#### Create Database
1. Create a new Notion page
2. Add a database with the following properties:
   - Title (Title)
   - Location (Text)
   - Start Time (Date)
   - End Time (Date)
   - Type (Select: Lecture, Evaluation, Mentoring)
   - Source (Text)
3. Share the database with your integration

### 6. Build Configuration

#### Webpack Configuration
The project uses Webpack for bundling. Configuration is in `webpack.config.js`:

```javascript
const path = require('path');

module.exports = {
  mode: 'development',
  entry: {
    popup: './src/popup/popup.js',
    background: './src/background/background.js',
    content: './src/content/content.js',
    options: './src/options/options.js'
  },
  output: {
    path: path.resolve(__dirname, 'build/dist'),
    filename: '[name].js'
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env']
          }
        }
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      }
    ]
  }
};
```

## Development Commands

### Build Commands
```bash
# Development build
npm run build:dev

# Production build
npm run build:prod

# Watch mode for development
npm run watch
```

### Testing Commands
```bash
# Run unit tests
npm test

# Run integration tests
npm run test:integration

# Run e2e tests
npm run test:e2e

# Run all tests
npm run test:all
```

### Linting Commands
```bash
# Run ESLint
npm run lint

# Fix linting issues
npm run lint:fix

# Run Prettier
npm run format
```

## Chrome Extension Development

### Loading Extension in Chrome
1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `build/dist` folder
5. The extension should now be loaded

### Development Workflow
1. Make changes to source code
2. Run `npm run build:dev` or use watch mode
3. Go to `chrome://extensions/`
4. Click the refresh icon on your extension
5. Test the changes

### Debugging

#### Background Script
1. Go to `chrome://extensions/`
2. Click "Service Worker" link under your extension
3. Use Chrome DevTools to debug

#### Popup Script
1. Right-click on extension icon
2. Select "Inspect popup"
3. Use Chrome DevTools to debug

#### Content Script
1. Open the page where content script runs
2. Open Chrome DevTools
3. Content script logs appear in console

## File Structure

```
src/
├── popup/
│   ├── popup.html          # Popup UI
│   ├── popup.js            # Popup logic
│   └── popup.css           # Popup styling
├── background/
│   └── background.js       # Background service worker
├── content/
│   ├── content.js          # Content script
│   └── content.css         # Content styling
├── options/
│   ├── options.html        # Settings page
│   ├── options.js          # Settings logic
│   └── options.css         # Settings styling
├── api/
│   ├── googleCalendar.js   # Google Calendar API
│   ├── googleDrive.js      # Google Drive API
│   └── notion.js           # Notion API
├── utils/
│   ├── storage.js          # Chrome Storage utilities
│   ├── auth.js             # Authentication helpers
│   └── dataProcessor.js    # Data processing utilities
└── assets/
    ├── icons/              # Extension icons
    └── images/             # UI images
```

## Common Issues

### Authentication Issues
- Check if OAuth credentials are correct
- Verify redirect URIs are configured
- Ensure all required scopes are added

### API Issues
- Check if APIs are enabled in Google Cloud Console
- Verify API quotas and limits
- Check network connectivity

### Build Issues
- Clear node_modules and reinstall dependencies
- Check for syntax errors in source files
- Verify webpack configuration

### Extension Loading Issues
- Check manifest.json syntax
- Verify all referenced files exist
- Check Chrome extension permissions

## Best Practices

### Code Style
- Use ESLint and Prettier for consistent formatting
- Follow Chrome Extension best practices
- Use modern JavaScript features (ES6+)

### Security
- Never commit API keys or secrets
- Use environment variables for sensitive data
- Implement proper error handling
- Validate all user inputs

### Performance
- Minimize API calls
- Use caching when appropriate
- Optimize bundle size
- Implement lazy loading

### Testing
- Write unit tests for utility functions
- Test API integrations
- Test Chrome extension functionality
- Use automated testing in CI/CD

## Deployment

### Prepare for Production
1. Update manifest.json version
2. Build production version: `npm run build:prod`
3. Test thoroughly in development environment
4. Create release notes

### Chrome Web Store
1. Create developer account
2. Upload extension package
3. Fill in store listing details
4. Submit for review

### Version Management
- Use semantic versioning (semver)
- Tag releases in Git
- Maintain changelog
- Document breaking changes