// API Configuration for Carrinder Backend
class CarrinderAPI {
  constructor() {
    // Environment-based API URL
    this.baseURL = this.getBaseURL();
    this.version = 'v1';
    this.apiURL = `${this.baseURL}/api/${this.version}`;
  }

  getBaseURL() {
    // In real implementation, this would be environment-based
    if (process.env.NODE_ENV === 'production') {
      return 'https://api.carrinder.com';
    } else if (process.env.NODE_ENV === 'staging') {
      return 'https://staging-api.carrinder.com';
    } else {
      return 'http://localhost:3000'; // Local development
    }
  }

  // Get stored access token
  async getAccessToken() {
    try {
      const result = await chrome.storage.local.get(['accessToken']);
      return result.accessToken;
    } catch (error) {
      console.error('Error getting access token:', error);
      return null;
    }
  }

  // Get stored refresh token
  async getRefreshToken() {
    try {
      const result = await chrome.storage.local.get(['refreshToken']);
      return result.refreshToken;
    } catch (error) {
      console.error('Error getting refresh token:', error);
      return null;
    }
  }

  // Refresh access token
  async refreshAccessToken() {
    try {
      const refreshToken = await this.getRefreshToken();
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await fetch(`${this.apiURL}/auth/refresh-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ refreshToken })
      });

      if (!response.ok) {
        throw new Error('Failed to refresh token');
      }

      const data = await response.json();
      
      // Store new tokens
      await chrome.storage.local.set({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken
      });

      return data.accessToken;
    } catch (error) {
      console.error('Error refreshing token:', error);
      // Clear invalid tokens
      await chrome.storage.local.remove(['accessToken', 'refreshToken']);
      throw error;
    }
  }

  // Make authenticated API request
  async request(endpoint, options = {}) {
    const url = `${this.apiURL}${endpoint}`;
    let accessToken = await this.getAccessToken();

    const defaultOptions = {
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken && { 'Authorization': `Bearer ${accessToken}` })
      }
    };

    const requestOptions = {
      ...defaultOptions,
      ...options,
      headers: {
        ...defaultOptions.headers,
        ...options.headers
      }
    };

    let response = await fetch(url, requestOptions);

    // If token expired, try to refresh
    if (response.status === 401 && accessToken) {
      try {
        accessToken = await this.refreshAccessToken();
        requestOptions.headers['Authorization'] = `Bearer ${accessToken}`;
        response = await fetch(url, requestOptions);
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
        throw new Error('Authentication failed');
      }
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  // Authentication endpoints
  async googleLogin(googleTokenData) {
    return this.request('/auth/google-login', {
      method: 'POST',
      body: JSON.stringify(googleTokenData)
    });
  }

  async registerUser(userData) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
  }

  async logout() {
    try {
      await this.request('/auth/logout', { method: 'POST' });
    } catch (error) {
      console.error('Logout API call failed:', error);
    } finally {
      // Clear local tokens regardless of API success
      await chrome.storage.local.remove(['accessToken', 'refreshToken', 'userId']);
    }
  }

  // User management endpoints
  async getUserProfile() {
    return this.request('/users/profile');
  }

  async updateUserProfile(profileData) {
    return this.request('/users/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData)
    });
  }

  async getUserSubscription() {
    return this.request('/users/subscription');
  }

  async cancelSubscription() {
    return this.request('/users/cancel-subscription', {
      method: 'POST'
    });
  }

  // Payment endpoints
  async createPayment(paymentData) {
    return this.request('/payments/create-payment', {
      method: 'POST',
      body: JSON.stringify(paymentData)
    });
  }

  async confirmPayment(paymentKey, orderId, amount) {
    return this.request('/payments/confirm-payment', {
      method: 'POST',
      body: JSON.stringify({ paymentKey, orderId, amount })
    });
  }

  async getPaymentHistory(page = 1, limit = 20) {
    return this.request(`/payments/history?page=${page}&limit=${limit}`);
  }

  async requestRefund(paymentId, reason) {
    return this.request('/payments/refund', {
      method: 'POST',
      body: JSON.stringify({ paymentId, reason })
    });
  }

  // Usage tracking endpoints
  async trackAction(action, metadata = {}) {
    try {
      return this.request('/usage/track-action', {
        method: 'POST',
        body: JSON.stringify({
          action,
          metadata,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          extensionVersion: chrome.runtime.getManifest().version
        })
      });
    } catch (error) {
      // Don't throw for tracking errors, just log them
      console.error('Error tracking action:', error);
    }
  }

  async getUsageStats(period = '30d') {
    return this.request(`/usage/stats?period=${period}`);
  }

  // Feature flag endpoints
  async getFeatureFlags() {
    return this.request('/features/flags');
  }

  // Support endpoints
  async submitFeedback(feedbackData) {
    return this.request('/support/feedback', {
      method: 'POST',
      body: JSON.stringify(feedbackData)
    });
  }

  async reportBug(bugData) {
    return this.request('/support/bug-report', {
      method: 'POST',
      body: JSON.stringify(bugData)
    });
  }

  // Health check
  async healthCheck() {
    try {
      const response = await fetch(`${this.baseURL}/health`);
      return response.ok;
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  }
}

// Singleton instance
const carrinderAPI = new CarrinderAPI();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CarrinderAPI;
} else {
  window.CarrinderAPI = carrinderAPI;
}

// Make available globally for Chrome extension
if (typeof chrome !== 'undefined' && chrome.runtime) {
  window.carrinderAPI = carrinderAPI;
}