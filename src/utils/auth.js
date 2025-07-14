// Authentication utilities
class AuthManager {
  constructor() {
    this.storage = new StorageManager();
  }

  async authenticateWithGoogle(scopes = []) {
    try {
      const token = await this.requestGoogleAuth(scopes);
      if (token) {
        await this.storage.saveAuthToken('google', token);
        return token;
      }
      throw new Error('Failed to get authentication token');
    } catch (error) {
      console.error('Google authentication error:', error);
      throw error;
    }
  }

  async requestGoogleAuth(scopes) {
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

  async getGoogleToken() {
    const authData = await this.storage.getAuthData('google');
    if (authData && authData.access_token) {
      // Check if token is still valid (optional: add expiration check)
      return authData.access_token;
    }
    return null;
  }

  async refreshGoogleToken() {
    try {
      // Remove cached token to force refresh
      await this.storage.removeAuthToken('google');
      
      // Get new token
      const token = await this.requestGoogleAuth([
        'https://www.googleapis.com/auth/calendar.readonly',
        'https://www.googleapis.com/auth/drive.file',
        'https://www.googleapis.com/auth/spreadsheets'
      ]);
      
      if (token) {
        await this.storage.saveAuthToken('google', token);
        return token;
      }
      
      throw new Error('Failed to refresh token');
    } catch (error) {
      console.error('Token refresh error:', error);
      throw error;
    }
  }

  async revokeGoogleToken() {
    try {
      const token = await this.getGoogleToken();
      if (token) {
        // Revoke token from Google
        await fetch(`https://oauth2.googleapis.com/revoke?token=${token}`, {
          method: 'POST'
        });
      }
      
      // Remove token from storage
      await this.storage.removeAuthToken('google');
    } catch (error) {
      console.error('Token revocation error:', error);
      throw error;
    }
  }

  async isGoogleAuthenticated() {
    const token = await this.getGoogleToken();
    return !!token;
  }

  async validateGoogleToken(token) {
    try {
      const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?access_token=${token}`);
      return response.ok;
    } catch (error) {
      console.error('Token validation error:', error);
      return false;
    }
  }

  async makeAuthenticatedRequest(url, options = {}) {
    const token = await this.getGoogleToken();
    if (!token) {
      throw new Error('No authentication token available');
    }

    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers
    };

    const response = await fetch(url, {
      ...options,
      headers
    });

    if (response.status === 401) {
      // Token expired, try to refresh
      try {
        const newToken = await this.refreshGoogleToken();
        if (newToken) {
          // Retry request with new token
          const retryHeaders = {
            'Authorization': `Bearer ${newToken}`,
            'Content-Type': 'application/json',
            ...options.headers
          };

          return fetch(url, {
            ...options,
            headers: retryHeaders
          });
        }
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
        throw new Error('Authentication expired. Please re-authenticate.');
      }
    }

    return response;
  }

  // Notion authentication (API key based)
  async setNotionToken(token) {
    await this.storage.saveAuthToken('notion', token);
  }

  async getNotionToken() {
    return this.storage.getAuthToken('notion');
  }

  async removeNotionToken() {
    await this.storage.removeAuthToken('notion');
  }

  async isNotionAuthenticated() {
    const token = await this.getNotionToken();
    return !!token;
  }

  async validateNotionToken(token) {
    try {
      const response = await fetch('https://api.notion.com/v1/users/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Notion-Version': '2022-06-28'
        }
      });
      return response.ok;
    } catch (error) {
      console.error('Notion token validation error:', error);
      return false;
    }
  }

  async makeNotionRequest(url, options = {}) {
    const token = await this.getNotionToken();
    if (!token) {
      throw new Error('No Notion token available');
    }

    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Notion-Version': '2022-06-28',
      ...options.headers
    };

    const response = await fetch(url, {
      ...options,
      headers
    });

    if (!response.ok) {
      throw new Error(`Notion API error: ${response.status} ${response.statusText}`);
    }

    return response;
  }

  // General authentication status
  async getAuthenticationStatus() {
    const googleAuth = await this.isGoogleAuthenticated();
    const notionAuth = await this.isNotionAuthenticated();

    return {
      google: googleAuth,
      notion: notionAuth,
      isFullyAuthenticated: googleAuth // Notion is optional
    };
  }

  async clearAllAuth() {
    await this.storage.removeAuthToken('google');
    await this.storage.removeAuthToken('notion');
  }

  // Error handling utilities
  isAuthError(error) {
    return error.message.includes('authentication') || 
           error.message.includes('token') ||
           error.message.includes('401');
  }

  getAuthErrorMessage(error) {
    if (error.message.includes('User did not approve')) {
      return 'Authentication was cancelled. Please try again.';
    }
    if (error.message.includes('token')) {
      return 'Authentication token is invalid or expired. Please re-authenticate.';
    }
    return 'Authentication failed. Please check your connection and try again.';
  }

  // Authentication flow helpers
  async handleAuthFlow(service, scopes = []) {
    try {
      let token;
      
      switch (service) {
        case 'google':
          token = await this.authenticateWithGoogle(scopes);
          break;
        case 'notion':
          // Notion uses API key, not OAuth
          throw new Error('Notion authentication requires manual API key setup');
        default:
          throw new Error(`Unknown service: ${service}`);
      }

      return {
        success: true,
        token: token,
        service: service
      };
    } catch (error) {
      return {
        success: false,
        error: this.getAuthErrorMessage(error),
        service: service
      };
    }
  }

  async checkAndRefreshAuth(service) {
    switch (service) {
      case 'google':
        const token = await this.getGoogleToken();
        if (token) {
          const isValid = await this.validateGoogleToken(token);
          if (!isValid) {
            return this.refreshGoogleToken();
          }
          return token;
        }
        return null;
      
      case 'notion':
        const notionToken = await this.getNotionToken();
        if (notionToken) {
          const isValid = await this.validateNotionToken(notionToken);
          if (isValid) {
            return notionToken;
          }
        }
        return null;
      
      default:
        throw new Error(`Unknown service: ${service}`);
    }
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AuthManager;
} else {
  window.AuthManager = AuthManager;
}