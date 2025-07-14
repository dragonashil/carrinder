// Spreadsheet management utilities
class SpreadsheetManager {
  constructor() {
    this.googleDrive = new GoogleDriveAPI();
    this.dataProcessor = new DataProcessor();
    this.storageManager = new StorageManager();
    
    this.spreadsheetConfigs = {
      instructor: {
        name: 'Instructor Career History',
        sheetName: 'Instructor Activities',
        headers: [
          'Title', 'Date', 'Start Time', 'End Time', 'Type', 
          'Subcategory', 'Location', 'Description', 'Source', 'Created At'
        ]
      },
      judge: {
        name: 'Judge Career History',
        sheetName: 'Judge Activities',
        headers: [
          'Title', 'Date', 'Start Time', 'End Time', 'Type', 
          'Subcategory', 'Location', 'Description', 'Source', 'Created At'
        ]
      },
      mentor: {
        name: 'Mentor Career History',
        sheetName: 'Mentor Activities',
        headers: [
          'Title', 'Date', 'Start Time', 'End Time', 'Type', 
          'Subcategory', 'Location', 'Description', 'Source', 'Created At'
        ]
      }
    };
  }

  async initializeSpreadsheets() {
    try {
      const settings = await this.storageManager.getSettings();
      const spreadsheetIds = settings.spreadsheetIds || {};

      // Check if spreadsheets exist, create if not
      for (const [role, config] of Object.entries(this.spreadsheetConfigs)) {
        if (!spreadsheetIds[role]) {
          console.log(`Creating ${role} spreadsheet...`);
          const result = await this.createRoleSpreadsheet(role);
          if (result.success) {
            spreadsheetIds[role] = result.spreadsheetId;
          }
        } else {
          // Verify spreadsheet still exists
          const exists = await this.verifySpreadsheetExists(spreadsheetIds[role]);
          if (!exists) {
            console.log(`Recreating ${role} spreadsheet...`);
            const result = await this.createRoleSpreadsheet(role);
            if (result.success) {
              spreadsheetIds[role] = result.spreadsheetId;
            }
          }
        }
      }

      // Save updated spreadsheet IDs
      await this.storageManager.updateSettings({ spreadsheetIds });

      return {
        success: true,
        spreadsheetIds
      };
    } catch (error) {
      console.error('Error initializing spreadsheets:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async createRoleSpreadsheet(role) {
    try {
      const config = this.spreadsheetConfigs[role];
      if (!config) {
        throw new Error(`Unknown role: ${role}`);
      }

      const title = `${config.name} - ${new Date().getFullYear()}`;
      const headers = [config.headers];

      const result = await this.googleDrive.createSpreadsheet(
        title,
        headers,
        config.sheetName
      );

      if (result.success) {
        console.log(`Created ${role} spreadsheet:`, result.url);
        
        // Show notification to user
        this.showNotification(
          `Created ${config.name} spreadsheet`,
          `Spreadsheet is available at: ${result.url}`,
          'success'
        );
      }

      return result;
    } catch (error) {
      console.error(`Error creating ${role} spreadsheet:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async verifySpreadsheetExists(spreadsheetId) {
    try {
      const result = await this.googleDrive.getSpreadsheetData(spreadsheetId, 'A1:A1');
      return result.success;
    } catch (error) {
      console.error('Error verifying spreadsheet:', error);
      return false;
    }
  }

  async syncEventsToSpreadsheets(events) {
    try {
      const settings = await this.storageManager.getSettings();
      const spreadsheetIds = settings.spreadsheetIds || {};

      const results = {
        synced: 0,
        failed: 0,
        details: []
      };

      // Group events by role
      const eventsByRole = this.groupEventsByRole(events);

      for (const [role, roleEvents] of Object.entries(eventsByRole)) {
        if (roleEvents.length === 0) continue;

        const spreadsheetId = spreadsheetIds[role];
        if (!spreadsheetId) {
          console.warn(`No spreadsheet found for role: ${role}`);
          results.failed += roleEvents.length;
          continue;
        }

        // Filter events that haven't been synced yet
        const unsyncedEvents = roleEvents.filter(event => !event.synced.googleSheets);

        for (const event of unsyncedEvents) {
          try {
            const syncResult = await this.syncEventToSpreadsheet(event, spreadsheetId, role);
            if (syncResult.success) {
              results.synced++;
              event.synced.googleSheets = true;
              event.updatedAt = new Date().toISOString();
              
              // Update event in storage
              await this.storageManager.updateEvent(event);
            } else {
              results.failed++;
            }
            
            results.details.push({
              event: event.title,
              role: role,
              success: syncResult.success,
              error: syncResult.error
            });
          } catch (error) {
            console.error(`Error syncing event ${event.title}:`, error);
            results.failed++;
            results.details.push({
              event: event.title,
              role: role,
              success: false,
              error: error.message
            });
          }
        }
      }

      return {
        success: true,
        results
      };
    } catch (error) {
      console.error('Error syncing events to spreadsheets:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async syncEventToSpreadsheet(event, spreadsheetId, role) {
    try {
      const config = this.spreadsheetConfigs[role];
      const eventData = this.formatEventForSpreadsheet(event);

      const result = await this.googleDrive.appendSpreadsheetData(
        spreadsheetId,
        [eventData],
        config.sheetName
      );

      return result;
    } catch (error) {
      console.error('Error syncing individual event:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  formatEventForSpreadsheet(event) {
    return [
      event.title,
      event.date,
      event.startTime,
      event.endTime,
      event.type,
      event.subcategory,
      event.location,
      event.description,
      event.source,
      event.createdAt
    ];
  }

  groupEventsByRole(events) {
    const grouped = {
      instructor: [],
      judge: [],
      mentor: [],
      other: []
    };

    events.forEach(event => {
      const role = event.role || 'other';
      if (grouped[role]) {
        grouped[role].push(event);
      } else {
        grouped.other.push(event);
      }
    });

    return grouped;
  }

  async getSpreadsheetSummary() {
    try {
      const settings = await this.storageManager.getSettings();
      const spreadsheetIds = settings.spreadsheetIds || {};

      const summary = {};

      for (const [role, spreadsheetId] of Object.entries(spreadsheetIds)) {
        if (!spreadsheetId) continue;

        try {
          const data = await this.googleDrive.getSpreadsheetData(
            spreadsheetId,
            `${this.spreadsheetConfigs[role].sheetName}!A:A`
          );

          summary[role] = {
            spreadsheetId,
            exists: data.success,
            eventCount: data.success ? Math.max(0, data.data.length - 1) : 0, // Subtract header row
            url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`
          };
        } catch (error) {
          summary[role] = {
            spreadsheetId,
            exists: false,
            eventCount: 0,
            error: error.message
          };
        }
      }

      return {
        success: true,
        summary
      };
    } catch (error) {
      console.error('Error getting spreadsheet summary:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async exportEventsToNewSpreadsheet(events, title) {
    try {
      // Group events by role
      const eventsByRole = this.groupEventsByRole(events);
      const results = {};

      for (const [role, roleEvents] of Object.entries(eventsByRole)) {
        if (roleEvents.length === 0) continue;

        const config = this.spreadsheetConfigs[role];
        const spreadsheetTitle = `${title} - ${config.name}`;
        
        const data = [
          config.headers,
          ...roleEvents.map(event => this.formatEventForSpreadsheet(event))
        ];

        const result = await this.googleDrive.createSpreadsheet(
          spreadsheetTitle,
          data,
          config.sheetName
        );

        results[role] = result;
      }

      return {
        success: true,
        spreadsheets: results
      };
    } catch (error) {
      console.error('Error exporting events:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  showNotification(title, message, type = 'info') {
    // This would integrate with the extension's notification system
    console.log(`[${type.toUpperCase()}] ${title}: ${message}`);
    
    // For Chrome extension, we could use chrome.notifications
    if (typeof chrome !== 'undefined' && chrome.notifications) {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: '/assets/icons/icon-48.png',
        title: title,
        message: message
      });
    }
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SpreadsheetManager;
} else {
  window.SpreadsheetManager = SpreadsheetManager;
}