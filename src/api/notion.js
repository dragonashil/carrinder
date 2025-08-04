// Notion API integration
class NotionAPI {
  constructor() {
    this.baseURL = 'https://api.notion.com/v1';
    this.version = '2022-06-28';
  }

  async validateToken(token) {
    try {
      const response = await fetch(`${this.baseURL}/users/me`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Notion-Version': this.version,
          'Content-Type': 'application/json'
        }
      });

      return response.ok;
    } catch (error) {
      console.error('Notion token validation error:', error);
      return false;
    }
  }

  async createDatabase(token, parentPageId, title = 'Career Events') {
    try {
      const databaseSchema = {
        parent: {
          type: 'page_id',
          page_id: parentPageId
        },
        title: [
          {
            type: 'text',
            text: {
              content: title
            }
          }
        ],
        properties: {
          'Title': {
            title: {}
          },
          'Type': {
            select: {
              options: [
                { name: '강의', color: 'blue' },
                { name: '심사', color: 'red' },
                { name: '멘토링', color: 'green' },
                { name: '특강', color: 'orange' },
                { name: '기타', color: 'gray' }
              ]
            }
          },
          'Start Date': {
            date: {}
          },
          'End Date': {
            date: {}
          },
          'Start Time': {
            rich_text: {}
          },
          'End Time': {
            rich_text: {}
          },
          'Duration (Hours)': {
            number: {
              format: 'number_with_commas'
            }
          },
          'Week Number': {
            number: {}
          },
          'Year': {
            number: {}
          },
          'Month': {
            select: {
              options: [
                { name: '1월', color: 'default' },
                { name: '2월', color: 'default' },
                { name: '3월', color: 'default' },
                { name: '4월', color: 'default' },
                { name: '5월', color: 'default' },
                { name: '6월', color: 'default' },
                { name: '7월', color: 'default' },
                { name: '8월', color: 'default' },
                { name: '9월', color: 'default' },
                { name: '10월', color: 'default' },
                { name: '11월', color: 'default' },
                { name: '12월', color: 'default' }
              ]
            }
          },
          'Location': {
            rich_text: {}
          },
          'Description': {
            rich_text: {}
          },
          'Calendar Source': {
            rich_text: {}
          },
          'Created At': {
            created_time: {}
          },
          'Last Edited': {
            last_edited_time: {}
          }
        }
      };

      const response = await fetch(`${this.baseURL}/databases`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Notion-Version': this.version,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(databaseSchema)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Notion API error: ${errorData.message || response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating Notion database:', error);
      throw error;
    }
  }

  async getPages(token, parentId = null) {
    try {
      let url = `${this.baseURL}/search`;
      let body = {
        filter: {
          value: 'page',
          property: 'object'
        }
      };

      if (parentId) {
        body.filter.parent = {
          type: 'page_id',
          page_id: parentId
        };
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Notion-Version': this.version,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        throw new Error(`Failed to get pages: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting Notion pages:', error);
      throw error;
    }
  }

  async addEventToDatabase(token, databaseId, eventData) {
    try {
      // Log event data for debugging
      console.log('Adding event to Notion database:', {
        title: eventData.title,
        startDate: eventData.startDate,
        endDate: eventData.endDate,
        type: typeof eventData.startDate,
        endType: typeof eventData.endDate
      });
      
      // Calculate duration, week number, and other time-based properties
      const timeData = this.calculateTimeData(eventData);
      
      const pageData = {
        parent: {
          database_id: databaseId
        },
        properties: {
          'Title': {
            title: [
              {
                text: {
                  content: eventData.title || 'Untitled Event'
                }
              }
            ]
          },
          'Type': {
            select: {
              name: this.mapEventType(eventData.type)
            }
          },
          'Start Date': {
            date: {
              start: timeData.startDateOnly,
              end: timeData.endDateOnly || null
            }
          },
          'End Date': {
            date: {
              start: timeData.endDateOnly || timeData.startDateOnly,
              end: null
            }
          },
          'Start Time': {
            rich_text: [
              {
                text: {
                  content: timeData.startTime
                }
              }
            ]
          },
          'End Time': {
            rich_text: [
              {
                text: {
                  content: timeData.endTime
                }
              }
            ]
          },
          'Duration (Hours)': {
            number: timeData.durationHours
          },
          'Week Number': {
            number: timeData.weekNumber
          },
          'Year': {
            number: timeData.year
          },
          'Month': {
            select: {
              name: timeData.month
            }
          },
          'Location': {
            rich_text: [
              {
                text: {
                  content: eventData.location || ''
                }
              }
            ]
          },
          'Description': {
            rich_text: [
              {
                text: {
                  content: eventData.description || ''
                }
              }
            ]
          },
          'Calendar Source': {
            rich_text: [
              {
                text: {
                  content: 'Google Calendar'
                }
              }
            ]
          }
        }
      };

      const response = await fetch(`${this.baseURL}/pages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Notion-Version': this.version,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(pageData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Failed to add event to Notion: ${errorData.message || response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error adding event to Notion database:', error);
      throw error;
    }
  }

  async syncEventsToDatabase(token, databaseId, events) {
    const results = {
      success: [],
      failed: []
    };

    for (const event of events) {
      try {
        const result = await this.addEventToDatabase(token, databaseId, event);
        results.success.push({ event, notionPage: result });
      } catch (error) {
        results.failed.push({ event, error: error.message });
      }
    }

    return results;
  }

  calculateTimeData(eventData) {
    // Helper function to safely create and validate dates
    const createSafeDate = (dateInput, fallbackDate = new Date()) => {
      if (!dateInput) return fallbackDate;
      
      let date;
      if (typeof dateInput === 'string') {
        // Handle various date string formats
        date = new Date(dateInput);
      } else if (dateInput instanceof Date) {
        date = dateInput;
      } else {
        console.warn('Unexpected date format:', dateInput);
        return fallbackDate;
      }
      
      // Validate the date
      if (isNaN(date.getTime())) {
        console.warn('Invalid date, using fallback:', dateInput);
        return fallbackDate;
      }
      
      return date;
    };
    
    const now = new Date();
    const startDate = createSafeDate(eventData.startDate, now);
    const endDate = createSafeDate(eventData.endDate || eventData.startDate, startDate);
    
    console.log('Processing dates:', {
      original: { start: eventData.startDate, end: eventData.endDate },
      processed: { start: startDate.toISOString(), end: endDate.toISOString() }
    });
    
    // Calculate duration in hours
    const durationMs = endDate.getTime() - startDate.getTime();
    const durationHours = Math.max(0, Math.round((durationMs / (1000 * 60 * 60)) * 100) / 100); // Ensure non-negative
    
    // Safely format date and time
    let startDateOnly, endDateOnly;
    try {
      startDateOnly = startDate.toISOString().split('T')[0]; // YYYY-MM-DD format
      endDateOnly = endDate.toISOString().split('T')[0];
    } catch (error) {
      console.error('Error formatting dates:', error);
      // Fallback to current date
      const fallbackDate = now.toISOString().split('T')[0];
      startDateOnly = fallbackDate;
      endDateOnly = fallbackDate;
    }
    
    // Safely format times
    let startTime, endTime;
    try {
      startTime = startDate.toLocaleTimeString('ko-KR', { 
        hour: '2-digit', 
        minute: '2-digit', 
        hour12: false 
      });
      endTime = endDate.toLocaleTimeString('ko-KR', { 
        hour: '2-digit', 
        minute: '2-digit', 
        hour12: false 
      });
    } catch (error) {
      console.error('Error formatting times:', error);
      startTime = '00:00';
      endTime = '00:00';
    }
    
    // Calculate week number (ISO week date)
    let weekNumber;
    try {
      weekNumber = this.getWeekNumber(startDate);
    } catch (error) {
      console.error('Error calculating week number:', error);
      weekNumber = 1;
    }
    
    // Get year and month
    const year = startDate.getFullYear() || new Date().getFullYear();
    const monthNames = ['1월', '2월', '3월', '4월', '5월', '6월', 
                       '7월', '8월', '9월', '10월', '11월', '12월'];
    const monthIndex = startDate.getMonth();
    const month = monthNames[monthIndex] || '1월';
    
    return {
      startDateOnly,
      endDateOnly: endDateOnly !== startDateOnly ? endDateOnly : null,
      startTime,
      endTime,
      durationHours,
      weekNumber,
      year,
      month
    };
  }

  getWeekNumber(date) {
    // Get ISO week number
    const target = new Date(date.valueOf());
    const dayNumber = (date.getDay() + 6) % 7;
    target.setDate(target.getDate() - dayNumber + 3);
    const firstThursday = target.valueOf();
    target.setMonth(0, 1);
    if (target.getDay() !== 4) {
      target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
    }
    return 1 + Math.ceil((firstThursday - target) / 604800000);
  }

  mapEventType(type) {
    const typeMap = {
      'instructor': '강의',
      'lecture': '강의',
      'judge': '심사',
      'evaluation': '심사',
      'mentor': '멘토링',
      'mentoring': '멘토링',
      'seminar': '특강',
      'special': '특강'
    };
    
    return typeMap[type?.toLowerCase()] || '기타';
  }

  async getWeeklyStats(token, databaseId, year = null) {
    try {
      // Query the database to get all events
      let filter = {};
      
      if (year) {
        filter = {
          property: 'Year',
          number: {
            equals: year
          }
        };
      }

      const response = await fetch(`${this.baseURL}/databases/${databaseId}/query`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Notion-Version': this.version,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          filter: filter,
          sorts: [
            {
              property: 'Week Number',
              direction: 'ascending'
            },
            {
              property: 'Start Date',
              direction: 'ascending'
            }
          ]
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to query database: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Calculate weekly statistics
      const weeklyStats = {};
      const typeStats = {};
      
      data.results.forEach(page => {
        const props = page.properties;
        const weekNumber = props['Week Number']?.number || 0;
        const duration = props['Duration (Hours)']?.number || 0;
        const type = props['Type']?.select?.name || '기타';
        const year = props['Year']?.number || new Date().getFullYear();
        
        const weekKey = `${year}-W${weekNumber.toString().padStart(2, '0')}`;
        
        // Weekly stats
        if (!weeklyStats[weekKey]) {
          weeklyStats[weekKey] = {
            week: weekNumber,
            year: year,
            totalHours: 0,
            eventCount: 0,
            types: {}
          };
        }
        
        weeklyStats[weekKey].totalHours += duration;
        weeklyStats[weekKey].eventCount += 1;
        
        if (!weeklyStats[weekKey].types[type]) {
          weeklyStats[weekKey].types[type] = 0;
        }
        weeklyStats[weekKey].types[type] += duration;
        
        // Type stats
        if (!typeStats[type]) {
          typeStats[type] = {
            totalHours: 0,
            eventCount: 0,
            avgHoursPerEvent: 0
          };
        }
        
        typeStats[type].totalHours += duration;
        typeStats[type].eventCount += 1;
      });
      
      // Calculate averages for type stats
      Object.keys(typeStats).forEach(type => {
        typeStats[type].avgHoursPerEvent = 
          Math.round((typeStats[type].totalHours / typeStats[type].eventCount) * 100) / 100;
      });

      return {
        weeklyStats,
        typeStats,
        totalEvents: data.results.length,
        totalHours: Object.values(weeklyStats).reduce((sum, week) => sum + week.totalHours, 0)
      };
      
    } catch (error) {
      console.error('Error getting weekly stats:', error);
      throw error;
    }
  }

  async getUserInfo(token) {
    try {
      const response = await fetch(`${this.baseURL}/users/me`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Notion-Version': this.version,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to get user info: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting Notion user info:', error);
      throw error;
    }
  }
}

// Export for use in background script
if (typeof module !== 'undefined' && module.exports) {
  module.exports = NotionAPI;
} else if (typeof window !== 'undefined') {
  window.NotionAPI = NotionAPI;
}