// Environment configuration utility
class Config {
  constructor() {
    this.config = {};
    this.loadConfig();
  }

  loadConfig() {
    // Chrome Extension에서는 환경변수를 직접 읽을 수 없으므로
    // 빌드 시점에 설정되거나 설정 파일에서 읽어야 함
    this.config = {
      // Google OAuth 2.0 설정
      googleClientId: process.env.GOOGLE_CLIENT_ID || '',
      googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      
      // Notion API 설정
      notionToken: process.env.NOTION_TOKEN || '',
      notionDatabaseId: process.env.NOTION_DATABASE_ID || '',
      
      // 개발 환경 설정
      nodeEnv: process.env.NODE_ENV || 'development',
      debug: process.env.DEBUG === 'true',
      
      // Chrome Extension 설정
      extensionId: process.env.EXTENSION_ID || '',
      
      // API 설정
      googleCalendarApiKey: process.env.GOOGLE_CALENDAR_API_KEY || '',
      googleDriveApiKey: process.env.GOOGLE_DRIVE_API_KEY || '',
      googleSheetsApiKey: process.env.GOOGLE_SHEETS_API_KEY || ''
    };
  }

  get(key) {
    return this.config[key];
  }

  set(key, value) {
    this.config[key] = value;
  }

  getGoogleConfig() {
    return {
      clientId: this.get('googleClientId'),
      clientSecret: this.get('googleClientSecret'),
      calendarApiKey: this.get('googleCalendarApiKey'),
      driveApiKey: this.get('googleDriveApiKey'),
      sheetsApiKey: this.get('googleSheetsApiKey')
    };
  }

  getNotionConfig() {
    return {
      token: this.get('notionToken'),
      databaseId: this.get('notionDatabaseId')
    };
  }

  isDevelopment() {
    return this.get('nodeEnv') === 'development';
  }

  isProduction() {
    return this.get('nodeEnv') === 'production';
  }

  isDebugMode() {
    return this.get('debug');
  }

  validateConfig() {
    const requiredKeys = [
      'googleClientId',
      'notionToken',
      'notionDatabaseId'
    ];

    const missingKeys = requiredKeys.filter(key => !this.get(key));
    
    if (missingKeys.length > 0) {
      console.warn('Missing configuration keys:', missingKeys);
      return false;
    }

    return true;
  }

  // Chrome Extension 런타임에서 설정 저장/로드
  async saveToStorage() {
    try {
      await chrome.storage.local.set({
        config: this.config
      });
      console.log('Configuration saved to storage');
    } catch (error) {
      console.error('Failed to save configuration:', error);
    }
  }

  async loadFromStorage() {
    try {
      const result = await chrome.storage.local.get(['config']);
      if (result.config) {
        this.config = { ...this.config, ...result.config };
        console.log('Configuration loaded from storage');
      }
    } catch (error) {
      console.error('Failed to load configuration:', error);
    }
  }

  // 설정 업데이트 메서드
  async updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    await this.saveToStorage();
  }

  // 개발자 도구용 설정 출력
  debugConfig() {
    if (this.isDebugMode()) {
      console.log('Current Configuration:', {
        ...this.config,
        // 민감한 정보 마스킹
        googleClientSecret: this.config.googleClientSecret ? '***' : '',
        notionToken: this.config.notionToken ? '***' : '',
        googleCalendarApiKey: this.config.googleCalendarApiKey ? '***' : '',
        googleDriveApiKey: this.config.googleDriveApiKey ? '***' : '',
        googleSheetsApiKey: this.config.googleSheetsApiKey ? '***' : ''
      });
    }
  }
}

// 싱글톤 패턴으로 전역 설정 관리
const config = new Config();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = config;
} else {
  window.Config = config;
}