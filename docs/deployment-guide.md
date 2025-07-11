# Deployment Guide

## Overview

This guide covers the deployment process for the Career Manager Chrome Extension, including preparation, building, testing, and publishing to the Chrome Web Store.

## Pre-deployment Checklist

### Code Quality
- [ ] All tests pass (unit, integration, e2e)
- [ ] Code coverage meets requirements (>80%)
- [ ] No console errors or warnings
- [ ] ESLint and Prettier checks pass
- [ ] Security audit passes

### Functionality
- [ ] All core features work correctly
- [ ] API integrations tested
- [ ] Authentication flows tested
- [ ] Data synchronization works
- [ ] Error handling implemented

### Performance
- [ ] Extension loads quickly
- [ ] Memory usage optimized
- [ ] API calls are efficient
- [ ] Background scripts optimized

### Documentation
- [ ] README updated
- [ ] CHANGELOG updated
- [ ] Version numbers updated
- [ ] API documentation current

## Build Process

### 1. Version Management

#### Update Version Numbers
```bash
# Update package.json version
npm version patch  # for bug fixes
npm version minor  # for new features
npm version major  # for breaking changes
```

#### Update Manifest Version
```json
{
  "manifest_version": 3,
  "name": "Career Manager",
  "version": "1.0.0",
  "version_name": "1.0.0"
}
```

### 2. Environment Configuration

#### Production Environment Variables
```bash
# .env.production
GOOGLE_CLIENT_ID=your-production-client-id
GOOGLE_CLIENT_SECRET=your-production-client-secret
NOTION_TOKEN=your-production-notion-token
NOTION_DATABASE_ID=your-production-database-id
```

#### Build Configuration
```javascript
// webpack.config.prod.js
const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');

module.exports = {
  mode: 'production',
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
  plugins: [
    new CleanWebpackPlugin(),
    new CopyWebpackPlugin({
      patterns: [
        { from: 'manifest.json', to: 'manifest.json' },
        { from: 'src/popup/popup.html', to: 'popup.html' },
        { from: 'src/options/options.html', to: 'options.html' },
        { from: 'src/assets', to: 'assets' }
      ]
    })
  ],
  optimization: {
    minimize: true
  }
};
```

### 3. Build Commands

#### Production Build
```bash
# Clean previous builds
npm run clean

# Run production build
npm run build:prod

# Verify build output
npm run build:verify
```

#### Build Scripts in package.json
```json
{
  "scripts": {
    "clean": "rm -rf build/dist",
    "build:dev": "webpack --config webpack.config.dev.js",
    "build:prod": "webpack --config webpack.config.prod.js",
    "build:verify": "node scripts/verify-build.js"
  }
}
```

### 4. Build Verification

#### Verification Script
```javascript
// scripts/verify-build.js
const fs = require('fs');
const path = require('path');

const distPath = path.join(__dirname, '../build/dist');
const requiredFiles = [
  'manifest.json',
  'popup.html',
  'popup.js',
  'background.js',
  'options.html',
  'options.js',
  'assets/icon-16.png',
  'assets/icon-48.png',
  'assets/icon-128.png'
];

console.log('Verifying build output...');

let allFilesPresent = true;
requiredFiles.forEach(file => {
  const filePath = path.join(distPath, file);
  if (!fs.existsSync(filePath)) {
    console.error(`Missing file: ${file}`);
    allFilesPresent = false;
  } else {
    console.log(`✓ ${file}`);
  }
});

if (allFilesPresent) {
  console.log('\n✅ Build verification passed!');
  process.exit(0);
} else {
  console.log('\n❌ Build verification failed!');
  process.exit(1);
}
```

## Testing in Production Environment

### 1. Load Extension for Testing
```bash
# Create test package
npm run build:prod
cd build/dist
zip -r career-manager-test.zip .
```

### 2. Test Scenarios

#### Authentication Testing
1. Clear all extension data
2. Install fresh extension
3. Test Google OAuth flow
4. Test Notion integration
5. Verify token storage and refresh

#### Data Flow Testing
1. Add test events to Google Calendar
2. Trigger data extraction
3. Verify Google Sheets sync
4. Verify Notion database sync
5. Check data accuracy

#### Error Handling Testing
1. Test without internet connection
2. Test with invalid credentials
3. Test API rate limiting
4. Test malformed data handling
5. Test extension disable/enable

## Chrome Web Store Deployment

### 1. Developer Account Setup

#### Create Developer Account
1. Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
2. Pay one-time $5 registration fee
3. Complete developer profile

#### Verify Developer Identity
1. Provide required identification
2. Complete verification process
3. Enable two-factor authentication

### 2. Extension Package Preparation

#### Create Store Package
```bash
# Build production version
npm run build:prod

# Create store package
cd build/dist
zip -r career-manager-store.zip .

# Verify package size (< 128MB)
ls -lh career-manager-store.zip
```

#### Package Contents Verification
```
career-manager-store.zip
├── manifest.json
├── popup.html
├── popup.js
├── background.js
├── options.html
├── options.js
├── content.js
├── assets/
│   ├── icon-16.png
│   ├── icon-48.png
│   └── icon-128.png
└── [other required files]
```

### 3. Store Listing Information

#### Required Information
- **Name**: Career Manager
- **Summary**: Manage your professional career events from Google Calendar
- **Description**: Detailed description (min 132 characters)
- **Category**: Productivity
- **Language**: English, Korean
- **Website**: Project website URL
- **Support URL**: Support contact information

#### Store Description Template
```
Career Manager helps professionals track and manage their career-related events from Google Calendar. Perfect for instructors, judges, and mentors who need to keep detailed records of their professional activities.

Key Features:
• Automatically extract career events from Google Calendar
• Sync data to Google Sheets and Notion
• Categorize events by type (lectures, evaluations, mentoring)
• Secure OAuth authentication
• Privacy-focused design

Perfect for:
• Professional instructors tracking teaching hours
• Judges managing evaluation schedules
• Mentors organizing mentoring sessions
• Professionals building career portfolios

This extension requires permissions to access your Google Calendar and create files in Google Drive. All data is processed securely and stored according to your preferences.
```

#### Screenshots and Images
- Icon: 128x128, 48x48, 16x16 PNG files
- Screenshots: 1280x800 or 640x400 PNG/JPEG
- Promotional images: 440x280 PNG/JPEG
- Marquee promo tile: 1400x560 PNG/JPEG

### 4. Privacy and Permissions

#### Privacy Policy
Create a comprehensive privacy policy covering:
- Data collection practices
- How data is used
- Data sharing policies
- User rights and controls
- Contact information

#### Permission Justification
```json
{
  "permissions": [
    "identity",
    "storage",
    "activeTab"
  ],
  "host_permissions": [
    "https://www.googleapis.com/*",
    "https://api.notion.com/*"
  ],
  "oauth2": {
    "client_id": "your-client-id",
    "scopes": [
      "https://www.googleapis.com/auth/calendar.readonly",
      "https://www.googleapis.com/auth/drive.file",
      "https://www.googleapis.com/auth/spreadsheets"
    ]
  }
}
```

### 5. Submission Process

#### Upload Extension
1. Go to Developer Dashboard
2. Click "Add new item"
3. Upload ZIP file
4. Wait for automated review

#### Fill Store Listing
1. Complete all required fields
2. Add screenshots and promotional images
3. Set pricing and distribution
4. Select target countries/regions

#### Submit for Review
1. Preview listing
2. Submit for review
3. Wait for Google review (typically 1-3 days)
4. Address any review feedback

## Post-Deployment

### 1. Monitoring

#### Analytics Setup
- Set up Google Analytics for extensions
- Monitor user engagement
- Track error rates
- Monitor API usage

#### Performance Monitoring
```javascript
// Background script monitoring
chrome.runtime.onStartup.addListener(() => {
  console.log('Extension started');
  // Log startup time
  // Monitor memory usage
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Log message handling
  // Monitor API call frequency
});
```

### 2. User Support

#### Support Channels
- GitHub Issues for bug reports
- Email support for general questions
- Documentation website
- FAQ section

#### Common Issues Tracking
- Authentication problems
- API rate limiting
- Data sync issues
- Browser compatibility

### 3. Updates and Maintenance

#### Update Process
1. Fix bugs or add features
2. Update version numbers
3. Test thoroughly
4. Build production package
5. Upload to Chrome Web Store
6. Monitor rollout

#### Hotfix Process
1. Identify critical issue
2. Create hotfix branch
3. Fix issue quickly
4. Test fix
5. Deploy immediately
6. Monitor for issues

### 4. Metrics and KPIs

#### Success Metrics
- Daily/Monthly active users
- User retention rate
- Feature adoption rate
- User satisfaction scores
- Store ratings and reviews

#### Technical Metrics
- API response times
- Error rates
- Extension load times
- Memory usage
- Crash reports

## Rollback Procedures

### 1. Emergency Rollback
```bash
# If critical issue found after deployment
# Upload previous stable version
# Communicate with users
# Fix issue in development
```

### 2. Gradual Rollback
```bash
# For non-critical issues
# Reduce distribution percentage
# Monitor metrics
# Prepare fixed version
```

## Security Considerations

### 1. Code Security
- No hardcoded secrets
- Secure API communication
- Input validation
- XSS prevention

### 2. Data Security
- Encrypted storage
- Secure token handling
- User data protection
- Privacy compliance

### 3. Distribution Security
- Signed packages
- Verified developer account
- Secure build process
- Code integrity checks

## Compliance

### 1. Chrome Web Store Policies
- Follow all developer policies
- Respect user privacy
- Provide clear permissions
- Maintain quality standards

### 2. Legal Compliance
- Privacy policy compliance
- Terms of service
- Data protection regulations
- International compliance

This deployment guide ensures a smooth, secure, and compliant deployment process for the Career Manager Chrome Extension.