# Career Manager Chrome Extension

A Chrome extension designed for professionals such as instructors, judges, and mentors to automatically track and manage their career-related events from Google Calendar.

## Features

- **Automatic Event Extraction**: Extracts career-related events from Google Calendar
- **Smart Categorization**: Automatically categorizes events as lectures, evaluations, or mentoring
- **Google Sheets Integration**: Syncs data to Google Sheets for easy management
- **Notion Integration**: Stores structured data in Notion databases
- **Secure Authentication**: OAuth 2.0 authentication with Google and Notion
- **Privacy-Focused**: Data processed securely with user consent

## Target Users

- Professional instructors tracking teaching hours
- Judges managing evaluation schedules
- Mentors organizing mentoring sessions
- Professionals building career portfolios

## Installation

### From Chrome Web Store
1. Visit the Chrome Web Store (link coming soon)
2. Click "Add to Chrome"
3. Follow the setup instructions

### Development Installation
1. Clone this repository
2. Run `npm install`
3. Run `npm run build:dev`
4. Load the extension in Chrome:
   - Go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `build/dist` folder

## Setup

### 1. Google Calendar Integration
1. Click the extension icon
2. Click "Connect Google Calendar"
3. Authorize the required permissions
4. Your calendar events will be automatically synced

### 2. Google Sheets Integration
1. Go to extension settings
2. Click "Connect Google Drive"
3. Authorize spreadsheet access
4. Choose or create a spreadsheet for data storage

### 3. Notion Integration (Optional)
1. Create a Notion integration at https://www.notion.so/my-integrations
2. Copy your integration token
3. In extension settings, enter your Notion token
4. Select or create a database for career events

## Usage

### Automatic Event Detection
The extension automatically detects career-related events based on keywords:
- **Lectures**: "강의", "특강", "lecture", "seminar", "workshop"
- **Evaluations**: "심사", "평가", "evaluation", "review", "assessment"
- **Mentoring**: "멘토링", "mentoring", "coaching", "guidance"

### Manual Event Management
1. Click the extension icon to view detected events
2. Review and edit event details
3. Manually categorize events if needed
4. Sync data to your preferred platforms

### Data Export
- **Google Sheets**: Automatic sync with customizable spreadsheet format
- **Notion**: Structured database with searchable and filterable data
- **CSV Export**: Download data for external use

## Development

### Prerequisites
- Node.js (v18 or higher)
- Chrome browser
- Google Cloud Console account
- Notion account (optional)

### Setup Development Environment
```bash
# Clone repository
git clone <repository-url>
cd carrinder

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your API credentials

# Build for development
npm run build:dev

# Run tests
npm test

# Start development server
npm run dev
```

### Project Structure
```
src/
├── popup/              # Extension popup UI
├── background/         # Background service worker
├── content/           # Content scripts
├── options/           # Settings page
├── api/               # API integrations
├── utils/             # Utility functions
└── assets/            # Images and icons
```

### API Documentation
See [API Reference](docs/api-reference.md) for detailed API documentation.

## Testing

### Run Tests
```bash
# Unit tests
npm test

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# All tests
npm run test:all
```

### Test Coverage
- Unit tests: >80% coverage required
- Integration tests: All API endpoints covered
- E2E tests: Critical user workflows covered

See [Testing Guide](docs/testing-guide.md) for detailed testing procedures.

## Deployment

### Build for Production
```bash
npm run build:prod
```

### Chrome Web Store Deployment
1. Create Chrome Web Store developer account
2. Build production version
3. Upload extension package
4. Complete store listing
5. Submit for review

See [Deployment Guide](docs/deployment-guide.md) for detailed deployment instructions.

## Privacy & Security

### Data Collection
- Only processes calendar events with user consent
- No personal data stored on external servers
- All API communications encrypted (HTTPS)

### Permissions
- `identity`: For OAuth authentication
- `storage`: For local data storage
- `activeTab`: For content script injection
- Google API access: Calendar (read-only), Drive (file creation)

### Privacy Policy
View our complete [Privacy Policy](PRIVACY.md) for detailed information about data handling.

## Contributing

### Development Workflow
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

### Code Style
- ESLint configuration provided
- Prettier for code formatting
- Follow existing code patterns
- Add JSDoc comments for functions

### Reporting Issues
- Use GitHub Issues for bug reports
- Include Chrome version and OS
- Provide steps to reproduce
- Include console logs if applicable

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

### Documentation
- [Development Setup](docs/development-setup.md)
- [API Reference](docs/api-reference.md)
- [Testing Guide](docs/testing-guide.md)
- [Deployment Guide](docs/deployment-guide.md)

### Contact
- GitHub Issues: [Report bugs and request features](https://github.com/your-username/carrinder/issues)
- Email: support@carrinder.com
- Documentation: [Project Wiki](https://github.com/your-username/carrinder/wiki)

## Changelog

### Version 1.0.0 (TBD)
- Initial release
- Google Calendar integration
- Google Sheets sync
- Notion integration
- Basic event categorization
- Chrome extension manifest v3

See [CHANGELOG.md](CHANGELOG.md) for detailed release history.

## Roadmap

### Planned Features
- Mobile app companion
- Advanced AI-powered event classification
- Integration with other calendar services
- Team collaboration features
- Analytics and reporting dashboard
- Multi-language support

### Version 1.1.0 (Q2 2024)
- Improved event detection algorithms
- Custom keyword configuration
- Bulk event management
- Export to additional formats

### Version 1.2.0 (Q3 2024)
- AI-powered event suggestions
- Advanced analytics
- Team sharing features
- Mobile notifications

## Acknowledgments

- Google Calendar API for event data
- Notion API for database functionality
- Chrome Extensions API for platform integration
- All contributors and beta testers

---

**Career Manager** - Streamline your professional event tracking and career management.