// Google Drive API integration for spreadsheet management
class GoogleDriveAPI {
  constructor() {
    this.initialized = false;
    this.apiLoaded = false;
  }

  async initialize() {
    if (this.initialized) return true;

    try {
      // Wait for gapi to be loaded
      await this.loadGAPI();
      
      // Initialize the API
      await gapi.load('client:auth2', async () => {
        await gapi.client.init({
          discoveryDocs: [
            'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest',
            'https://www.googleapis.com/discovery/v1/apis/sheets/v4/rest'
          ]
        });
      });

      this.initialized = true;
      console.log('Google Drive API initialized');
      return true;
    } catch (error) {
      console.error('Failed to initialize Google Drive API:', error);
      return false;
    }
  }

  async loadGAPI() {
    return new Promise((resolve, reject) => {
      if (typeof gapi !== 'undefined') {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/api.js';
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  async createSpreadsheet(title, data, sheetName = 'Sheet1') {
    try {
      await this.initialize();

      // Create a new spreadsheet
      const response = await gapi.client.sheets.spreadsheets.create({
        properties: {
          title: title
        },
        sheets: [{
          properties: {
            title: sheetName
          }
        }]
      });

      const spreadsheetId = response.result.spreadsheetId;
      console.log('Created spreadsheet:', spreadsheetId);

      // Add data if provided
      if (data && data.length > 0) {
        await this.updateSpreadsheetData(spreadsheetId, data, sheetName);
      }

      return {
        spreadsheetId: spreadsheetId,
        url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
        success: true
      };
    } catch (error) {
      console.error('Error creating spreadsheet:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async updateSpreadsheetData(spreadsheetId, data, sheetName = 'Sheet1', range = 'A1') {
    try {
      await this.initialize();

      const fullRange = `${sheetName}!${range}`;
      
      const response = await gapi.client.sheets.spreadsheets.values.update({
        spreadsheetId: spreadsheetId,
        range: fullRange,
        valueInputOption: 'RAW',
        resource: {
          values: data
        }
      });

      console.log('Updated spreadsheet data:', response.result);
      return {
        success: true,
        updatedRows: response.result.updatedRows,
        updatedColumns: response.result.updatedColumns
      };
    } catch (error) {
      console.error('Error updating spreadsheet:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async appendSpreadsheetData(spreadsheetId, data, sheetName = 'Sheet1') {
    try {
      await this.initialize();

      const range = `${sheetName}!A:Z`;
      
      const response = await gapi.client.sheets.spreadsheets.values.append({
        spreadsheetId: spreadsheetId,
        range: range,
        valueInputOption: 'RAW',
        insertDataOption: 'INSERT_ROWS',
        resource: {
          values: data
        }
      });

      console.log('Appended data to spreadsheet:', response.result);
      return {
        success: true,
        updatedRows: response.result.updates.updatedRows
      };
    } catch (error) {
      console.error('Error appending to spreadsheet:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async getSpreadsheetData(spreadsheetId, range = 'Sheet1!A:Z') {
    try {
      await this.initialize();

      const response = await gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId: spreadsheetId,
        range: range
      });

      return {
        success: true,
        data: response.result.values || []
      };
    } catch (error) {
      console.error('Error reading spreadsheet:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async findSpreadsheetByName(name) {
    try {
      await this.initialize();

      const response = await gapi.client.drive.files.list({
        q: `name='${name}' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`,
        fields: 'files(id, name, createdTime, modifiedTime)'
      });

      const files = response.result.files || [];
      if (files.length > 0) {
        return {
          success: true,
          spreadsheet: files[0]
        };
      }

      return {
        success: false,
        message: 'Spreadsheet not found'
      };
    } catch (error) {
      console.error('Error finding spreadsheet:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async shareSpreadsheet(spreadsheetId, email, role = 'writer') {
    try {
      await this.initialize();

      const response = await gapi.client.drive.permissions.create({
        fileId: spreadsheetId,
        resource: {
          role: role,
          type: 'user',
          emailAddress: email
        }
      });

      return {
        success: true,
        permissionId: response.result.id
      };
    } catch (error) {
      console.error('Error sharing spreadsheet:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  formatEventDataForSpreadsheet(events, includeHeaders = true) {
    const rows = [];
    
    if (includeHeaders) {
      rows.push([
        'Title',
        'Date',
        'Start Time',
        'End Time',
        'Type',
        'Role',
        'Category',
        'Subcategory',
        'Location',
        'Description',
        'Source',
        'Created At'
      ]);
    }

    events.forEach(event => {
      rows.push([
        event.title,
        event.date,
        event.startTime,
        event.endTime,
        event.type,
        event.role,
        event.category,
        event.subcategory,
        event.location,
        event.description,
        event.source,
        event.createdAt
      ]);
    });

    return rows;
  }

  async createCareerSpreadsheets(events) {
    try {
      // Separate events by role
      const instructorEvents = events.filter(event => event.role === 'instructor');
      const judgeEvents = events.filter(event => event.role === 'judge');
      const mentorEvents = events.filter(event => event.role === 'mentor');

      const results = {};

      // Create instructor spreadsheet
      if (instructorEvents.length > 0) {
        const instructorData = this.formatEventDataForSpreadsheet(instructorEvents);
        const instructorResult = await this.createSpreadsheet(
          `Instructor Career History - ${new Date().getFullYear()}`,
          instructorData,
          'Instructor Activities'
        );
        results.instructor = instructorResult;
      }

      // Create judge spreadsheet
      if (judgeEvents.length > 0) {
        const judgeData = this.formatEventDataForSpreadsheet(judgeEvents);
        const judgeResult = await this.createSpreadsheet(
          `Judge Career History - ${new Date().getFullYear()}`,
          judgeData,
          'Judge Activities'
        );
        results.judge = judgeResult;
      }

      // Create mentor spreadsheet
      if (mentorEvents.length > 0) {
        const mentorData = this.formatEventDataForSpreadsheet(mentorEvents);
        const mentorResult = await this.createSpreadsheet(
          `Mentor Career History - ${new Date().getFullYear()}`,
          mentorData,
          'Mentor Activities'
        );
        results.mentor = mentorResult;
      }

      return {
        success: true,
        spreadsheets: results
      };
    } catch (error) {
      console.error('Error creating career spreadsheets:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async syncEventToSpreadsheet(event, spreadsheetId) {
    try {
      const eventData = this.formatEventDataForSpreadsheet([event], false);
      const result = await this.appendSpreadsheetData(spreadsheetId, eventData);
      
      if (result.success) {
        // Update sync status
        event.synced.googleSheets = true;
        event.updatedAt = new Date().toISOString();
      }

      return result;
    } catch (error) {
      console.error('Error syncing event to spreadsheet:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = GoogleDriveAPI;
} else {
  window.GoogleDriveAPI = GoogleDriveAPI;
}