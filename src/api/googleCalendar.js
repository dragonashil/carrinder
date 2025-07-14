// Google Calendar API integration
class GoogleCalendarAPI {
  constructor() {
    this.baseURL = 'https://www.googleapis.com/calendar/v3';
    this.accessToken = null;
  }

  async setAccessToken(token) {
    this.accessToken = token;
  }

  async getAccessToken() {
    if (!this.accessToken) {
      // Try to get token from storage
      const authData = await this.getStoredAuth();
      if (authData && authData.access_token) {
        this.accessToken = authData.access_token;
      }
    }
    return this.accessToken;
  }

  async getStoredAuth() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['google_auth'], (result) => {
        resolve(result.google_auth);
      });
    });
  }

  async makeRequest(endpoint, options = {}) {
    const token = await this.getAccessToken();
    if (!token) {
      throw new Error('No access token available');
    }

    const url = `${this.baseURL}${endpoint}`;
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers
    };

    const response = await fetch(url, {
      ...options,
      headers
    });

    if (!response.ok) {
      if (response.status === 401) {
        // Token expired, need to re-authenticate
        throw new Error('Authentication expired. Please re-authenticate.');
      }
      throw new Error(`Calendar API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async getCalendarList() {
    try {
      const response = await this.makeRequest('/users/me/calendarList');
      return response.items || [];
    } catch (error) {
      console.error('Error fetching calendar list:', error);
      throw error;
    }
  }

  async getEvents(calendarId = 'primary', options = {}) {
    try {
      const params = new URLSearchParams({
        singleEvents: 'true',
        orderBy: 'startTime',
        maxResults: '1000',
        ...options
      });

      const response = await this.makeRequest(`/calendars/${calendarId}/events?${params}`);
      return response.items || [];
    } catch (error) {
      console.error('Error fetching events:', error);
      throw error;
    }
  }

  async getEventsInRange(startDate, endDate, calendarId = 'primary') {
    const options = {
      timeMin: startDate.toISOString(),
      timeMax: endDate.toISOString()
    };

    return this.getEvents(calendarId, options);
  }

  async getEventsForPeriod(months = 6, calendarId = 'primary') {
    const now = new Date();
    const startDate = new Date(now.getTime() - (months * 30 * 24 * 60 * 60 * 1000));
    const endDate = new Date(now.getTime() + (months * 30 * 24 * 60 * 60 * 1000));

    return this.getEventsInRange(startDate, endDate, calendarId);
  }

  async searchEvents(query, calendarId = 'primary') {
    try {
      const options = {
        q: query,
        singleEvents: 'true',
        orderBy: 'startTime'
      };

      return this.getEvents(calendarId, options);
    } catch (error) {
      console.error('Error searching events:', error);
      throw error;
    }
  }

  filterCareerEvents(events) {
    const careerKeywords = [
      // Korean keywords
      '강의', '특강', '수업', '교육', '워크숍', '세미나',
      '심사', '평가', '검토', '리뷰', '심사위원',
      '멘토링', '코칭', '상담', '가이드', '멘토',
      // English keywords
      'lecture', 'seminar', 'workshop', 'training', 'teaching', 'class',
      'evaluation', 'review', 'assessment', 'judging', 'judge',
      'mentoring', 'coaching', 'guidance', 'consultation', 'mentor'
    ];

    return events.filter(event => {
      if (!event.summary) return false;
      
      const title = event.summary.toLowerCase();
      const description = (event.description || '').toLowerCase();
      const location = (event.location || '').toLowerCase();
      
      // Check title, description, and location for career keywords
      const textToSearch = `${title} ${description} ${location}`;
      
      return careerKeywords.some(keyword => 
        textToSearch.includes(keyword.toLowerCase())
      );
    });
  }

  classifyEventType(event) {
    const title = (event.summary || '').toLowerCase();
    const description = (event.description || '').toLowerCase();
    const textToAnalyze = `${title} ${description}`;

    // Lecture classification
    const lectureKeywords = [
      '강의', '특강', '수업', '교육', '워크숍', '세미나',
      'lecture', 'seminar', 'workshop', 'training', 'teaching', 'class'
    ];
    
    // Evaluation classification
    const evaluationKeywords = [
      '심사', '평가', '검토', '리뷰', '심사위원', '심사관',
      'evaluation', 'review', 'assessment', 'judging', 'judge'
    ];
    
    // Mentoring classification
    const mentoringKeywords = [
      '멘토링', '코칭', '상담', '가이드', '멘토',
      'mentoring', 'coaching', 'guidance', 'consultation', 'mentor'
    ];

    if (lectureKeywords.some(keyword => textToAnalyze.includes(keyword))) {
      return 'lecture';
    }
    
    if (evaluationKeywords.some(keyword => textToAnalyze.includes(keyword))) {
      return 'evaluation';
    }
    
    if (mentoringKeywords.some(keyword => textToAnalyze.includes(keyword))) {
      return 'mentoring';
    }
    
    return 'other';
  }

  transformEvent(event) {
    const startTime = event.start.dateTime || event.start.date;
    const endTime = event.end.dateTime || event.end.date;
    
    return {
      id: event.id,
      title: event.summary || 'No title',
      description: event.description || '',
      location: event.location || '',
      startTime: startTime,
      endTime: endTime,
      date: startTime.split('T')[0],
      type: this.classifyEventType(event),
      source: 'google-calendar',
      originalEvent: event,
      processed: true,
      synced: {
        googleSheets: false,
        notion: false
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  async getCareerEvents(options = {}) {
    try {
      const {
        months = 6,
        calendarId = 'primary',
        includeAllEvents = false
      } = options;

      // Get events from specified period
      const events = await this.getEventsForPeriod(months, calendarId);
      
      // Filter career events unless all events are requested
      const filteredEvents = includeAllEvents ? events : this.filterCareerEvents(events);
      
      // Transform events to our internal format
      const transformedEvents = filteredEvents.map(event => this.transformEvent(event));
      
      return transformedEvents;
    } catch (error) {
      console.error('Error getting career events:', error);
      throw error;
    }
  }

  async syncCareerEvents(options = {}) {
    try {
      const events = await this.getCareerEvents(options);
      
      // Store events in Chrome storage
      await this.storeEvents(events);
      
      console.log(`Synced ${events.length} career events from Google Calendar`);
      return events;
    } catch (error) {
      console.error('Error syncing career events:', error);
      throw error;
    }
  }

  async storeEvents(events) {
    return new Promise((resolve) => {
      chrome.storage.local.set({
        career_events: events,
        last_sync: new Date().toISOString()
      }, resolve);
    });
  }

  async getStoredEvents() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['career_events'], (result) => {
        resolve(result.career_events || []);
      });
    });
  }

  async getLastSyncTime() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['last_sync'], (result) => {
        resolve(result.last_sync);
      });
    });
  }

  // Utility methods
  isEventInFuture(event) {
    const eventTime = new Date(event.startTime);
    return eventTime > new Date();
  }

  isEventInPast(event) {
    const eventTime = new Date(event.endTime || event.startTime);
    return eventTime < new Date();
  }

  getEventDuration(event) {
    if (!event.endTime) return 0;
    
    const start = new Date(event.startTime);
    const end = new Date(event.endTime);
    return end - start; // Duration in milliseconds
  }

  getEventsByType(events, type) {
    return events.filter(event => event.type === type);
  }

  getEventsByDateRange(events, startDate, endDate) {
    return events.filter(event => {
      const eventDate = new Date(event.date);
      return eventDate >= startDate && eventDate <= endDate;
    });
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = GoogleCalendarAPI;
} else {
  window.GoogleCalendarAPI = GoogleCalendarAPI;
}