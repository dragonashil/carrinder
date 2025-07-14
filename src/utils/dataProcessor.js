// Data processing utilities
class DataProcessor {
  constructor() {
    this.careerKeywords = {
      lecture: ['강의', '특강', '수업', '교육', '워크숍', 'lecture', 'seminar', 'workshop', 'training'],
      evaluation: ['심사', '평가', '검토', '리뷰', 'evaluation', 'review', 'assessment', 'judging'],
      mentoring: ['멘토링', '코칭', '상담', '가이드', 'mentoring', 'coaching', 'guidance', 'consultation']
    };
  }

  transformCalendarEvent(calendarEvent) {
    const startTime = calendarEvent.start.dateTime || calendarEvent.start.date;
    const endTime = calendarEvent.end.dateTime || calendarEvent.end.date;
    
    const baseEvent = {
      id: calendarEvent.id,
      title: calendarEvent.summary || 'No title',
      description: calendarEvent.description || '',
      location: calendarEvent.location || '',
      startTime: startTime,
      endTime: endTime,
      date: startTime.split('T')[0],
      type: this.classifyEventType(calendarEvent.summary, calendarEvent.description),
      source: 'google-calendar',
      processed: true,
      synced: {
        googleSheets: false,
        notion: false
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Add role classification
    const roleInfo = this.classifyByRole(baseEvent);
    baseEvent.role = roleInfo.role;
    baseEvent.category = roleInfo.category;
    baseEvent.subcategory = roleInfo.subcategory;

    return baseEvent;
  }

  classifyEventType(title, description = '') {
    if (!title) return 'other';
    
    const searchText = `${title} ${description}`.toLowerCase();
    
    // Check lecture keywords
    if (this.careerKeywords.lecture.some(keyword => searchText.includes(keyword.toLowerCase()))) {
      return 'lecture';
    }
    
    // Check evaluation keywords
    if (this.careerKeywords.evaluation.some(keyword => searchText.includes(keyword.toLowerCase()))) {
      return 'evaluation';
    }
    
    // Check mentoring keywords
    if (this.careerKeywords.mentoring.some(keyword => searchText.includes(keyword.toLowerCase()))) {
      return 'mentoring';
    }
    
    return 'other';
  }

  classifyByRole(event) {
    const eventType = event.type;
    
    switch (eventType) {
      case 'lecture':
        return {
          role: 'instructor',
          category: 'teaching',
          subcategory: this.getSubcategory(event, 'lecture')
        };
      case 'evaluation':
        return {
          role: 'judge',
          category: 'assessment',
          subcategory: this.getSubcategory(event, 'evaluation')
        };
      case 'mentoring':
        return {
          role: 'mentor',
          category: 'guidance',
          subcategory: this.getSubcategory(event, 'mentoring')
        };
      default:
        return {
          role: 'other',
          category: 'misc',
          subcategory: 'general'
        };
    }
  }

  getSubcategory(event, type) {
    const title = event.title.toLowerCase();
    const description = (event.description || '').toLowerCase();
    
    switch (type) {
      case 'lecture':
        if (title.includes('특강') || title.includes('guest lecture')) return 'guest-lecture';
        if (title.includes('워크숍') || title.includes('workshop')) return 'workshop';
        if (title.includes('세미나') || title.includes('seminar')) return 'seminar';
        return 'regular-lecture';
        
      case 'evaluation':
        if (title.includes('공모') || title.includes('contest')) return 'contest';
        if (title.includes('프로젝트') || title.includes('project')) return 'project';
        if (title.includes('논문') || title.includes('paper')) return 'paper';
        return 'general-evaluation';
        
      case 'mentoring':
        if (title.includes('진로') || title.includes('career')) return 'career-guidance';
        if (title.includes('기술') || title.includes('technical')) return 'technical-mentoring';
        return 'general-mentoring';
        
      default:
        return 'general';
    }
  }

  filterCareerEvents(events) {
    return events.filter(event => {
      const title = (event.summary || '').toLowerCase();
      const description = (event.description || '').toLowerCase();
      const location = (event.location || '').toLowerCase();
      
      const textToSearch = `${title} ${description} ${location}`;
      
      return Object.values(this.careerKeywords).flat().some(keyword => 
        textToSearch.includes(keyword.toLowerCase())
      );
    });
  }

  formatEventForExport(event, format = 'spreadsheet') {
    const baseData = {
      title: event.title,
      date: event.date,
      startTime: event.startTime,
      endTime: event.endTime,
      type: event.type,
      location: event.location
    };

    switch (format) {
      case 'spreadsheet':
        return [
          baseData.title,
          baseData.date,
          baseData.startTime,
          baseData.endTime,
          baseData.type,
          baseData.location
        ];
      
      case 'notion':
        return {
          Title: { title: [{ text: { content: baseData.title } }] },
          Date: { date: { start: baseData.date } },
          Type: { select: { name: baseData.type } },
          Location: { rich_text: [{ text: { content: baseData.location } }] }
        };
      
      case 'csv':
        return `"${baseData.title}","${baseData.date}","${baseData.startTime}","${baseData.endTime}","${baseData.type}","${baseData.location}"`;
      
      default:
        return baseData;
    }
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DataProcessor;
} else {
  window.DataProcessor = DataProcessor;
}