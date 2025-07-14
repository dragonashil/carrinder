// Chrome Storage utilities
class StorageManager {
  constructor() {
    this.storage = chrome.storage;
  }

  // Local storage methods
  async setLocal(key, value) {
    return new Promise((resolve) => {
      this.storage.local.set({ [key]: value }, resolve);
    });
  }

  async getLocal(key) {
    return new Promise((resolve) => {
      this.storage.local.get([key], (result) => {
        resolve(result[key]);
      });
    });
  }

  async removeLocal(key) {
    return new Promise((resolve) => {
      this.storage.local.remove([key], resolve);
    });
  }

  async clearLocal() {
    return new Promise((resolve) => {
      this.storage.local.clear(resolve);
    });
  }

  // Sync storage methods
  async setSync(key, value) {
    return new Promise((resolve) => {
      this.storage.sync.set({ [key]: value }, resolve);
    });
  }

  async getSync(key) {
    return new Promise((resolve) => {
      this.storage.sync.get([key], (result) => {
        resolve(result[key]);
      });
    });
  }

  async removeSync(key) {
    return new Promise((resolve) => {
      this.storage.sync.remove([key], resolve);
    });
  }

  async clearSync() {
    return new Promise((resolve) => {
      this.storage.sync.clear(resolve);
    });
  }

  // Specialized methods for career events
  async saveCareerEvents(events) {
    const data = {
      events: events,
      timestamp: new Date().toISOString(),
      count: events.length
    };
    return this.setLocal('career_events', data);
  }

  async getCareerEvents() {
    const data = await this.getLocal('career_events');
    return data ? data.events : [];
  }

  async getCareerEventsWithMetadata() {
    return this.getLocal('career_events');
  }

  async saveAuthToken(service, token) {
    const authData = {
      access_token: token,
      timestamp: new Date().toISOString(),
      service: service
    };
    return this.setLocal(`${service}_auth`, authData);
  }

  async getAuthToken(service) {
    const authData = await this.getLocal(`${service}_auth`);
    return authData ? authData.access_token : null;
  }

  async getAuthData(service) {
    return this.getLocal(`${service}_auth`);
  }

  async removeAuthToken(service) {
    return this.removeLocal(`${service}_auth`);
  }

  async saveSettings(settings) {
    return this.setSync('settings', settings);
  }

  async getSettings() {
    const defaultSettings = {
      autoSync: true,
      syncInterval: 30,
      keywords: {
        lecture: ['강의', '특강', '수업', 'lecture', 'seminar'],
        evaluation: ['심사', '평가', 'evaluation', 'review'],
        mentoring: ['멘토링', '코칭', 'mentoring', 'coaching']
      },
      notifications: {
        enabled: true,
        upcomingEvents: true,
        syncComplete: false
      },
      export: {
        format: 'spreadsheet',
        includeDescription: true,
        includeLocation: true
      }
    };

    const settings = await this.getSync('settings');
    return { ...defaultSettings, ...settings };
  }

  async updateSettings(updates) {
    const currentSettings = await this.getSettings();
    const newSettings = { ...currentSettings, ...updates };
    return this.saveSettings(newSettings);
  }

  async saveLastSync(timestamp) {
    return this.setLocal('last_sync', timestamp);
  }

  async getLastSync() {
    return this.getLocal('last_sync');
  }

  async saveSyncStatus(status) {
    const syncStatus = {
      status: status,
      timestamp: new Date().toISOString()
    };
    return this.setLocal('sync_status', syncStatus);
  }

  async getSyncStatus() {
    return this.getLocal('sync_status');
  }

  // Event filtering and management
  async addEvent(event) {
    const events = await this.getCareerEvents();
    const existingIndex = events.findIndex(e => e.id === event.id);
    
    if (existingIndex >= 0) {
      // Update existing event
      events[existingIndex] = { ...events[existingIndex], ...event };
    } else {
      // Add new event
      events.push(event);
    }
    
    return this.saveCareerEvents(events);
  }

  async removeEvent(eventId) {
    const events = await this.getCareerEvents();
    const filteredEvents = events.filter(event => event.id !== eventId);
    return this.saveCareerEvents(filteredEvents);
  }

  async updateEvent(eventId, updates) {
    const events = await this.getCareerEvents();
    const eventIndex = events.findIndex(event => event.id === eventId);
    
    if (eventIndex >= 0) {
      events[eventIndex] = { ...events[eventIndex], ...updates };
      return this.saveCareerEvents(events);
    }
    
    return false;
  }

  async getEventsByType(type) {
    const events = await this.getCareerEvents();
    return events.filter(event => event.type === type);
  }

  async getEventsByDateRange(startDate, endDate) {
    const events = await this.getCareerEvents();
    return events.filter(event => {
      const eventDate = new Date(event.date);
      return eventDate >= startDate && eventDate <= endDate;
    });
  }

  async getEventsStats() {
    const events = await this.getCareerEvents();
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const stats = {
      total: events.length,
      thisMonth: events.filter(event => {
        const eventDate = new Date(event.date);
        return eventDate.getMonth() === currentMonth && eventDate.getFullYear() === currentYear;
      }).length,
      byType: {
        lecture: events.filter(event => event.type === 'lecture').length,
        evaluation: events.filter(event => event.type === 'evaluation').length,
        mentoring: events.filter(event => event.type === 'mentoring').length,
        other: events.filter(event => event.type === 'other').length
      }
    };

    return stats;
  }

  // Data export methods
  async exportToJSON() {
    const events = await this.getCareerEvents();
    const settings = await this.getSettings();
    const lastSync = await this.getLastSync();
    
    return {
      events: events,
      settings: settings,
      lastSync: lastSync,
      exportDate: new Date().toISOString()
    };
  }

  async importFromJSON(data) {
    if (data.events) {
      await this.saveCareerEvents(data.events);
    }
    
    if (data.settings) {
      await this.saveSettings(data.settings);
    }
    
    if (data.lastSync) {
      await this.saveLastSync(data.lastSync);
    }
  }

  // Cleanup methods
  async cleanupOldEvents(maxAge = 365) {
    const events = await this.getCareerEvents();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - maxAge);

    const filteredEvents = events.filter(event => {
      const eventDate = new Date(event.date);
      return eventDate >= cutoffDate;
    });

    if (filteredEvents.length < events.length) {
      await this.saveCareerEvents(filteredEvents);
      return events.length - filteredEvents.length;
    }

    return 0;
  }

  async clearAllData() {
    await this.clearLocal();
    await this.clearSync();
  }

  // Storage usage information
  async getStorageUsage() {
    return new Promise((resolve) => {
      chrome.storage.local.getBytesInUse(null, (bytesInUse) => {
        resolve({
          local: bytesInUse,
          localLimit: chrome.storage.local.QUOTA_BYTES
        });
      });
    });
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = StorageManager;
} else {
  window.StorageManager = StorageManager;
}