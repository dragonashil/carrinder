class I18n {
  constructor() {
    this.currentLanguage = 'ko';
    this.translations = {};
    this.isLoaded = false;
    this.loadPromise = null;
  }

  async loadTranslations() {
    if (this.loadPromise) {
      return this.loadPromise;
    }
    
    this.loadPromise = this._doLoadTranslations();
    return this.loadPromise;
  }

  async _doLoadTranslations() {
    try {
      const storedLanguage = await this.getStoredLanguage();
      this.currentLanguage = storedLanguage || 'ko';
      
      let koUrl, enUrl;
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        koUrl = chrome.runtime.getURL('src/locales/ko.json');
        enUrl = chrome.runtime.getURL('src/locales/en.json');
      } else {
        // For development or non-extension environment
        koUrl = './src/locales/ko.json';
        enUrl = './src/locales/en.json';
      }
      
      const koResponse = await fetch(koUrl);
      const enResponse = await fetch(enUrl);
      
      this.translations.ko = await koResponse.json();
      this.translations.en = await enResponse.json();
      
      this.isLoaded = true;
      this.updatePageTexts();
      
      console.log('Translations loaded successfully');
    } catch (error) {
      console.error('Failed to load translations:', error);
      // Fallback: set minimal translations
      this.translations = {
        ko: { common: { language: '언어' } },
        en: { common: { language: 'Language' } }
      };
      this.isLoaded = true;
    }
  }

  async getStoredLanguage() {
    return new Promise((resolve) => {
      try {
        if (typeof chrome !== 'undefined' && chrome.storage) {
          chrome.storage.local.get(['language'], (result) => {
            resolve(result.language);
          });
        } else {
          // Fallback to localStorage
          const language = localStorage.getItem('carrinder_language');
          resolve(language);
        }
      } catch (error) {
        console.warn('Storage not available, using default language:', error);
        resolve('ko');
      }
    });
  }

  async setLanguage(language) {
    this.currentLanguage = language;
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        await chrome.storage.local.set({ language });
      } else {
        // Fallback to localStorage
        localStorage.setItem('carrinder_language', language);
      }
    } catch (error) {
      console.warn('Storage not available, using memory only:', error);
    }
    this.updatePageTexts();
    this.notifyLanguageChange();
  }

  t(key, defaultValue = '') {
    const keys = key.split('.');
    let value = this.translations[this.currentLanguage];
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return defaultValue || key;
      }
    }
    
    return value || defaultValue || key;
  }

  updatePageTexts() {
    const elements = document.querySelectorAll('[data-i18n]');
    elements.forEach(element => {
      const key = element.getAttribute('data-i18n');
      const translation = this.t(key);
      
      if (element.tagName === 'INPUT' && (element.type === 'text' || element.type === 'password')) {
        element.placeholder = translation;
      } else {
        element.textContent = translation;
      }
    });

    const placeholderElements = document.querySelectorAll('[data-i18n-placeholder]');
    placeholderElements.forEach(element => {
      const key = element.getAttribute('data-i18n-placeholder');
      const translation = this.t(key);
      element.placeholder = translation;
    });

    const titleElements = document.querySelectorAll('[data-i18n-title]');
    titleElements.forEach(element => {
      const key = element.getAttribute('data-i18n-title');
      const translation = this.t(key);
      element.title = translation;
    });
  }

  notifyLanguageChange() {
    const event = new CustomEvent('languageChanged', {
      detail: { language: this.currentLanguage }
    });
    document.dispatchEvent(event);
  }

  getCurrentLanguage() {
    return this.currentLanguage;
  }

  createLanguageToggle() {
    console.log('Creating language toggle...');
    
    const toggle = document.createElement('div');
    toggle.className = 'language-toggle';
    toggle.style.cssText = `
      position: relative !important;
      display: inline-block !important;
      margin-left: 8px !important;
      visibility: visible !important;
      opacity: 1 !important;
      z-index: 999 !important;
    `;
    
    toggle.innerHTML = `
      <button class="language-btn" id="language-toggle-btn" style="
        display: flex !important;
        align-items: center !important;
        gap: 4px !important;
        padding: 6px 10px !important;
        background: rgba(255, 255, 255, 0.2) !important;
        border: 1px solid rgba(255, 255, 255, 0.3) !important;
        border-radius: 6px !important;
        color: white !important;
        font-size: 12px !important;
        cursor: pointer !important;
        transition: all 0.2s ease !important;
        min-width: 60px !important;
        justify-content: center !important;
        visibility: visible !important;
        opacity: 1 !important;
        height: auto !important;
        width: auto !important;
      ">
        <span class="language-icon" style="font-size: 14px !important;">🌐</span>
        <span class="language-text" style="font-weight: 500 !important; font-size: 11px !important;">${this.currentLanguage.toUpperCase()}</span>
      </button>
      <div class="language-dropdown" id="language-dropdown" style="
        position: absolute !important;
        top: 100% !important;
        right: 0 !important;
        margin-top: 4px !important;
        background: white !important;
        border: 1px solid #e1e5e9 !important;
        border-radius: 8px !important;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
        min-width: 120px !important;
        opacity: 0 !important;
        visibility: hidden !important;
        transform: translateY(-10px) !important;
        transition: all 0.2s ease !important;
        z-index: 1000 !important;
      ">
        <div class="language-option" data-lang="ko" style="
          display: flex !important;
          align-items: center !important;
          gap: 8px !important;
          padding: 8px 12px;
          color: #333;
          font-size: 13px;
          cursor: pointer;
          transition: background-color 0.2s ease;
        ">
          <span class="flag">🇰🇷</span>
          한국어
        </div>
        <div class="language-option" data-lang="en" style="
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          color: #333;
          font-size: 13px;
          cursor: pointer;
          transition: background-color 0.2s ease;
        ">
          <span class="flag">🇺🇸</span>
          English
        </div>
      </div>
    `;

    const toggleBtn = toggle.querySelector('#language-toggle-btn');
    const dropdown = toggle.querySelector('#language-dropdown');

    // Hover effects
    toggleBtn.addEventListener('mouseenter', () => {
      toggleBtn.style.background = 'rgba(255, 255, 255, 0.2)';
      toggleBtn.style.borderColor = 'rgba(255, 255, 255, 0.3)';
    });
    
    toggleBtn.addEventListener('mouseleave', () => {
      toggleBtn.style.background = 'rgba(255, 255, 255, 0.1)';
      toggleBtn.style.borderColor = 'rgba(255, 255, 255, 0.2)';
    });

    toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isVisible = dropdown.style.opacity === '1';
      if (isVisible) {
        dropdown.style.opacity = '0';
        dropdown.style.visibility = 'hidden';
        dropdown.style.transform = 'translateY(-10px)';
      } else {
        dropdown.style.opacity = '1';
        dropdown.style.visibility = 'visible';
        dropdown.style.transform = 'translateY(0)';
      }
    });

    toggle.querySelectorAll('.language-option').forEach(option => {
      option.addEventListener('mouseenter', () => {
        option.style.backgroundColor = '#f8f9fa';
      });
      
      option.addEventListener('mouseleave', () => {
        option.style.backgroundColor = 'transparent';
      });
      
      option.addEventListener('click', (e) => {
        e.stopPropagation();
        const lang = option.getAttribute('data-lang');
        this.setLanguage(lang);
        dropdown.style.opacity = '0';
        dropdown.style.visibility = 'hidden';
        dropdown.style.transform = 'translateY(-10px)';
        toggleBtn.querySelector('.language-text').textContent = lang.toUpperCase();
      });
    });

    document.addEventListener('click', () => {
      dropdown.style.opacity = '0';
      dropdown.style.visibility = 'hidden';
      dropdown.style.transform = 'translateY(-10px)';
    });

    console.log('Language toggle created successfully');
    return toggle;
  }
}

const i18n = new I18n();
window.i18n = i18n;

// Initialize translations immediately
i18n.loadTranslations().catch(error => {
  console.error('Failed to load translations on init:', error);
});