class PricingManager {
  constructor() {
    this.currentPlan = 'basic'; // This would come from user data
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.updateCurrentPlanStatus();
  }

  setupEventListeners() {
    // Back button
    const backBtn = document.getElementById('back-btn');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        this.goBack();
      });
    }

    // Upgrade button
    const upgradeBtn = document.getElementById('upgrade-btn');
    if (upgradeBtn) {
      upgradeBtn.addEventListener('click', () => {
        this.handleUpgrade();
      });
    }

    // Billing option changes
    const billingRadios = document.querySelectorAll('input[name="billing"]');
    billingRadios.forEach(radio => {
      radio.addEventListener('change', () => {
        this.updateUpgradeButton();
      });
    });

    // Update button text initially
    this.updateUpgradeButton();
  }

  updateCurrentPlanStatus() {
    // This would check the user's current plan from storage/API
    // For now, assume basic plan
    const basicCard = document.querySelector('.basic-plan');
    const plusCard = document.querySelector('.plus-plan');
    
    if (this.currentPlan === 'basic') {
      const basicButton = basicCard.querySelector('.btn');
      basicButton.textContent = '현재 플랜';
      basicButton.disabled = true;
      basicButton.classList.add('current-plan');
    } else if (this.currentPlan === 'plus') {
      const plusButton = plusCard.querySelector('.upgrade-btn');
      plusButton.textContent = '현재 플랜';
      plusButton.disabled = true;
      plusButton.classList.remove('btn-primary');
      plusButton.classList.add('current-plan');
    }
  }

  updateUpgradeButton() {
    const upgradeBtn = document.getElementById('upgrade-btn');
    const selectedBilling = document.querySelector('input[name="billing"]:checked');
    
    if (!upgradeBtn || !selectedBilling) return;

    const billingType = selectedBilling.value;
    
    if (billingType === 'monthly') {
      upgradeBtn.textContent = '월 $5로 시작하기';
    } else {
      upgradeBtn.textContent = '연 $50로 시작하기 (2개월 절약)';
    }
  }

  async handleUpgrade() {
    const selectedBilling = document.querySelector('input[name="billing"]:checked');
    if (!selectedBilling) return;

    const billingType = selectedBilling.value;
    
    try {
      // Show loading state
      const upgradeBtn = document.getElementById('upgrade-btn');
      const originalText = upgradeBtn.textContent;
      upgradeBtn.textContent = '회원가입 페이지로 이동 중...';
      upgradeBtn.disabled = true;

      // Open Carrinder registration page
      this.openRegistrationPage(billingType);
      
      // Restore button state after a short delay
      setTimeout(() => {
        upgradeBtn.textContent = originalText;
        upgradeBtn.disabled = false;
      }, 2000);

    } catch (error) {
      console.error('Upgrade failed:', error);
      this.showToast('페이지 이동 중 오류가 발생했습니다. 다시 시도해주세요.', 'error');
      
      // Restore button state
      const upgradeBtn = document.getElementById('upgrade-btn');
      upgradeBtn.disabled = false;
      this.updateUpgradeButton();
    }
  }

  openRegistrationPage(billingType) {
    // Open Carrinder auth page with selected billing type
    const authUrl = chrome.runtime.getURL('auth.html');
    const authWindow = window.open(
      authUrl,
      'carrinder-auth',
      'width=600,height=800,scrollbars=yes,resizable=yes'
    );

    // Listen for auth completion
    window.addEventListener('message', (event) => {
      if (event.source === authWindow) {
        if (event.data.type === 'AUTH_SUCCESS') {
          this.handleAuthSuccess(event.data.plan);
          authWindow.close();
        } else if (event.data.type === 'AUTH_CANCELLED') {
          this.showToast('회원가입이 취소되었습니다.', 'info');
        }
      }
    });

    // Send billing preference to auth window
    authWindow.addEventListener('load', () => {
      authWindow.postMessage({
        type: 'BILLING_SELECTED',
        billing: billingType
      }, '*');
    });
  }

  handleAuthSuccess(plan) {
    this.showToast('Carrinder Plus 회원가입이 완료되었습니다!', 'success');
    
    // Update current plan
    this.currentPlan = plan;
    this.updateCurrentPlanStatus();
    
    // Optionally redirect back to main app
    setTimeout(() => {
      this.goBack();
    }, 2000);
  }

  async simulatePaymentProcess() {
    // Simulate API call delay
    return new Promise((resolve) => {
      setTimeout(resolve, 2000);
    });
  }

  goBack() {
    // Close the current window/tab or navigate back
    if (window.history.length > 1) {
      window.history.back();
    } else {
      // If opened as a popup, close it
      window.close();
    }
  }

  showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    if (!toast) return;

    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.classList.add('show');

    setTimeout(() => {
      toast.classList.remove('show');
    }, 3000);
  }

  // Storage methods for plan management
  async savePlanData(planData) {
    try {
      await chrome.storage.sync.set({ userPlan: planData });
    } catch (error) {
      console.error('Failed to save plan data:', error);
    }
  }

  async loadPlanData() {
    try {
      const result = await chrome.storage.sync.get(['userPlan']);
      return result.userPlan || { plan: 'basic', billing: null, expires: null };
    } catch (error) {
      console.error('Failed to load plan data:', error);
      return { plan: 'basic', billing: null, expires: null };
    }
  }

  // Check if user has access to premium features
  hasPremiumAccess() {
    return this.currentPlan === 'plus';
  }

  // Get feature availability
  getFeatureAccess() {
    return {
      basicFeatures: true,
      notionIntegration: this.hasPremiumAccess(),
      autoSync: this.hasPremiumAccess(),
      prioritySupport: this.hasPremiumAccess()
    };
  }
}

// Initialize pricing manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.pricingManager = new PricingManager();
});

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PricingManager;
}