// Content script for Google Calendar page
class CalendarContentScript {
  constructor() {
    this.init();
  }

  init() {
    // Only run on Google Calendar
    if (!window.location.hostname.includes('calendar.google.com')) {
      return;
    }

    this.addCareerManagerUI();
    this.setupEventListeners();
  }

  addCareerManagerUI() {
    // Add a floating button to manually trigger sync
    const syncButton = document.createElement('div');
    syncButton.id = 'career-manager-sync-btn';
    syncButton.innerHTML = `
      <button class="career-manager-btn" title="Sync career events">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
          <path d="M21 3v5h-5"/>
          <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
          <path d="M3 21v-5h5"/>
        </svg>
        Career Manager
      </button>
    `;

    document.body.appendChild(syncButton);

    // Add styles
    const style = document.createElement('style');
    style.textContent = `
      #career-manager-sync-btn {
        position: fixed;
        bottom: 20px;
        right: 20px;
        z-index: 10000;
        background: #667eea;
        border-radius: 50px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        transition: all 0.3s ease;
      }

      #career-manager-sync-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
      }

      .career-manager-btn {
        display: flex;
        align-items: center;
        gap: 8px;
        background: none;
        border: none;
        color: white;
        padding: 12px 20px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        border-radius: 50px;
      }

      .career-manager-btn:hover {
        background: rgba(255, 255, 255, 0.1);
      }

      .career-manager-btn svg {
        flex-shrink: 0;
      }
    `;
    document.head.appendChild(style);
  }

  setupEventListeners() {
    // Listen for sync button clicks
    document.addEventListener('click', (event) => {
      if (event.target.closest('#career-manager-sync-btn')) {
        this.triggerSync();
      }
    });

    // Listen for calendar changes
    this.observeCalendarChanges();
  }

  triggerSync() {
    // Show loading state
    const button = document.querySelector('.career-manager-btn');
    const originalContent = button.innerHTML;
    button.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
        <path d="M21 3v5h-5"/>
        <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
        <path d="M3 21v-5h5"/>
      </svg>
      Syncing...
    `;
    button.style.opacity = '0.7';

    // Send sync request to background script
    chrome.runtime.sendMessage({
      action: 'sync_events'
    }, (response) => {
      // Restore button state
      button.innerHTML = originalContent;
      button.style.opacity = '1';

      if (response && response.success) {
        this.showNotification('Events synced successfully!', 'success');
      } else {
        this.showNotification('Sync failed. Please try again.', 'error');
      }
    });
  }

  observeCalendarChanges() {
    // Observe changes to calendar events
    const observer = new MutationObserver((mutations) => {
      let hasCalendarChanges = false;

      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          // Check if calendar events were added or removed
          const addedNodes = Array.from(mutation.addedNodes);
          const removedNodes = Array.from(mutation.removedNodes);

          const hasEventChanges = [...addedNodes, ...removedNodes].some(node => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              return node.querySelector('[data-eventid]') || 
                     node.matches('[data-eventid]') ||
                     node.querySelector('[role="gridcell"]');
            }
            return false;
          });

          if (hasEventChanges) {
            hasCalendarChanges = true;
          }
        }
      });

      if (hasCalendarChanges) {
        // Debounce the sync trigger
        clearTimeout(this.syncTimeout);
        this.syncTimeout = setTimeout(() => {
          this.notifyCalendarChanges();
        }, 2000);
      }
    });

    // Start observing
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  notifyCalendarChanges() {
    // Notify background script about calendar changes
    chrome.runtime.sendMessage({
      action: 'calendar_changed'
    });
  }

  showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `career-manager-notification ${type}`;
    notification.textContent = message;

    // Add styles
    const style = document.createElement('style');
    style.textContent = `
      .career-manager-notification {
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 20px;
        border-radius: 8px;
        color: white;
        font-size: 14px;
        font-weight: 500;
        z-index: 10001;
        transform: translateX(100%);
        transition: transform 0.3s ease;
        max-width: 300px;
      }

      .career-manager-notification.success {
        background: #28a745;
      }

      .career-manager-notification.error {
        background: #dc3545;
      }

      .career-manager-notification.info {
        background: #17a2b8;
      }

      .career-manager-notification.show {
        transform: translateX(0);
      }
    `;
    document.head.appendChild(style);

    // Add to page
    document.body.appendChild(notification);

    // Show notification
    setTimeout(() => {
      notification.classList.add('show');
    }, 100);

    // Remove notification after 3 seconds
    setTimeout(() => {
      notification.style.transform = 'translateX(100%)';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 3000);
  }

  // Utility methods
  getCurrentView() {
    // Detect current calendar view (month, week, day)
    const url = window.location.href;
    if (url.includes('view=month')) return 'month';
    if (url.includes('view=week')) return 'week';
    if (url.includes('view=day')) return 'day';
    return 'month'; // default
  }

  getVisibleDateRange() {
    // Get the currently visible date range
    const currentView = this.getCurrentView();
    const now = new Date();
    
    // This is a simplified implementation
    // In a real scenario, you'd extract the actual visible dates from the calendar UI
    switch (currentView) {
      case 'month':
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        return { start: firstDay, end: lastDay };
      
      case 'week':
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        return { start: weekStart, end: weekEnd };
      
      case 'day':
        const dayStart = new Date(now);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(now);
        dayEnd.setHours(23, 59, 59, 999);
        return { start: dayStart, end: dayEnd };
      
      default:
        return { start: firstDay, end: lastDay };
    }
  }

  extractEventFromElement(element) {
    // Extract event information from calendar event element
    try {
      const eventId = element.getAttribute('data-eventid');
      const title = element.querySelector('[role="button"]')?.textContent || 
                   element.textContent.trim();
      
      return {
        id: eventId,
        title: title,
        element: element
      };
    } catch (error) {
      console.error('Error extracting event:', error);
      return null;
    }
  }
}

// Initialize content script
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new CalendarContentScript();
  });
} else {
  new CalendarContentScript();
}