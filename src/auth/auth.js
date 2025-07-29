class CarrinderAuth {
  constructor() {
    this.currentStep = 1;
    this.selectedBilling = 'monthly';
    this.googleUser = null;
    this.tossPayments = null;
    this.clientKey = 'test_ck_docs_Ovk5rk1EwkEbP0W43n07xlzm'; // Test key - replace with actual
    
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.initializeTossPayments();
    this.updatePlanPrice();
  }

  setupEventListeners() {
    // Step 1: Welcome
    document.getElementById('start-signup-btn')?.addEventListener('click', () => {
      this.goToStep(2);
    });

    document.getElementById('cancel-btn')?.addEventListener('click', () => {
      this.cancelSignup();
    });

    // Billing selection
    document.querySelectorAll('input[name="billing"]').forEach(radio => {
      radio.addEventListener('change', () => {
        this.selectedBilling = radio.value;
        this.updatePlanPrice();
      });
    });

    // Step 2: Google Login
    document.getElementById('google-login-btn')?.addEventListener('click', () => {
      this.handleGoogleLogin();
    });

    document.getElementById('back-to-welcome-btn')?.addEventListener('click', () => {
      this.goToStep(1);
    });

    // Step 3: User Info
    document.getElementById('proceed-payment-btn')?.addEventListener('click', () => {
      this.proceedToPayment();
    });

    document.getElementById('back-to-google-btn')?.addEventListener('click', () => {
      this.goToStep(2);
    });

    // Terms agreement validation
    document.getElementById('terms-agree')?.addEventListener('change', (e) => {
      this.validateUserInfo();
    });

    document.getElementById('user-name')?.addEventListener('input', () => {
      this.validateUserInfo();
    });

    // Step 4: Payment
    document.getElementById('start-payment-btn')?.addEventListener('click', () => {
      this.startPayment();
    });

    document.getElementById('back-to-info-btn')?.addEventListener('click', () => {
      this.goToStep(3);
    });

    // Step 5: Success
    document.getElementById('complete-btn')?.addEventListener('click', () => {
      this.completeSignup();
    });

    // Terms and privacy links
    document.getElementById('terms-link')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.showTerms();
    });

    document.getElementById('privacy-link')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.showPrivacy();
    });
  }

  initializeTossPayments() {
    try {
      this.tossPayments = TossPayments(this.clientKey);
    } catch (error) {
      console.error('Failed to initialize Toss Payments:', error);
      this.showToast('결제 시스템 초기화에 실패했습니다.', 'error');
    }
  }

  updatePlanPrice() {
    const priceElement = document.querySelector('#selected-plan-price .price');
    const periodElement = document.querySelector('#selected-plan-price .period');
    const cycleElement = document.getElementById('payment-cycle');
    const totalElement = document.getElementById('total-amount');

    if (this.selectedBilling === 'monthly') {
      if (priceElement) priceElement.textContent = '$5';
      if (periodElement) periodElement.textContent = '/월';
      if (cycleElement) cycleElement.textContent = '월간 결제';
      if (totalElement) totalElement.textContent = '$5';
    } else {
      if (priceElement) priceElement.textContent = '$50';
      if (periodElement) periodElement.textContent = '/년';
      if (cycleElement) cycleElement.textContent = '연간 결제';
      if (totalElement) totalElement.textContent = '$50';
    }
  }

  goToStep(step) {
    // Hide all steps
    document.querySelectorAll('.auth-step').forEach(el => {
      el.style.display = 'none';
    });

    // Show current step
    const stepElement = document.querySelector(`#step-${this.getStepId(step)}`);
    if (stepElement) {
      stepElement.style.display = 'block';
    }

    // Update progress indicator
    this.updateProgress(step);
    this.currentStep = step;
  }

  getStepId(step) {
    const stepIds = {
      1: 'welcome',
      2: 'google-login', 
      3: 'user-info',
      4: 'payment',
      5: 'success'
    };
    return stepIds[step];
  }

  updateProgress(currentStep) {
    document.querySelectorAll('.progress-step').forEach((step, index) => {
      const stepNumber = index + 1;
      
      if (stepNumber < currentStep) {
        step.classList.add('completed');
        step.classList.remove('active');
      } else if (stepNumber === currentStep) {
        step.classList.add('active');
        step.classList.remove('completed');
      } else {
        step.classList.remove('active', 'completed');
      }
    });

    document.querySelectorAll('.progress-line').forEach((line, index) => {
      if (index + 1 < currentStep) {
        line.classList.add('completed');
      } else {
        line.classList.remove('completed');
      }
    });
  }

  async handleGoogleLogin() {
    try {
      const button = document.getElementById('google-login-btn');
      const originalText = button.textContent;
      button.textContent = '로그인 중...';
      button.disabled = true;

      // Simulate Google OAuth flow
      // In real implementation, use chrome.identity.getAuthToken or Google OAuth2
      await this.simulateGoogleLogin();
      
      this.showToast('Google 로그인 성공!', 'success');
      this.goToStep(3);
      
    } catch (error) {
      console.error('Google login failed:', error);
      this.showToast('Google 로그인에 실패했습니다.', 'error');
      
      const button = document.getElementById('google-login-btn');
      button.textContent = 'Google로 계속하기';
      button.disabled = false;
    }
  }

  async simulateGoogleLogin() {
    return new Promise((resolve) => {
      setTimeout(() => {
        // Simulate user data from Google
        this.googleUser = {
          id: 'google_' + Date.now(),
          name: '홍길동',
          email: 'hong@example.com',
          picture: 'https://via.placeholder.com/60x60/333/fff?text=H'
        };
        
        // Populate user info form
        document.getElementById('profile-name').textContent = this.googleUser.name;
        document.getElementById('profile-email').textContent = this.googleUser.email;
        document.getElementById('profile-image').src = this.googleUser.picture;
        document.getElementById('user-name').value = this.googleUser.name;
        
        resolve();
      }, 2000);
    });
  }

  validateUserInfo() {
    const userName = document.getElementById('user-name')?.value.trim();
    const termsAgreed = document.getElementById('terms-agree')?.checked;
    const submitButton = document.getElementById('proceed-payment-btn');
    
    const isValid = userName && termsAgreed;
    
    if (submitButton) {
      submitButton.disabled = !isValid;
    }
  }

  proceedToPayment() {
    const userName = document.getElementById('user-name').value.trim();
    const userPhone = document.getElementById('user-phone').value.trim();
    const marketingAgreed = document.getElementById('marketing-agree').checked;
    
    if (!userName) {
      this.showToast('이름을 입력해주세요.', 'error');
      return;
    }
    
    // Store user info
    this.userInfo = {
      ...this.googleUser,
      name: userName,
      phone: userPhone,
      marketingAgreed
    };
    
    this.goToStep(4);
  }

  async startPayment() {
    try {
      const button = document.getElementById('start-payment-btn');
      const originalText = button.textContent;
      button.textContent = '결제 처리 중...';
      button.disabled = true;

      if (!this.tossPayments) {
        throw new Error('결제 시스템이 초기화되지 않았습니다.');
      }

      const amount = this.selectedBilling === 'monthly' ? 5 : 50;
      const orderId = 'carrinder_' + Date.now();
      const orderName = `Carrinder Plus (${this.selectedBilling === 'monthly' ? '월간' : '연간'})`;

      // Request payment with Toss Payments
      await this.tossPayments.requestPayment('카드', {
        amount: amount,
        orderId: orderId,
        orderName: orderName,
        customerName: this.userInfo.name,
        customerEmail: this.userInfo.email,
        successUrl: window.location.origin + '/payment-success',
        failUrl: window.location.origin + '/payment-fail',
      });

      // If we reach here without redirect, simulate success
      await this.simulatePaymentSuccess();
      
    } catch (error) {
      console.error('Payment failed:', error);
      this.showToast('결제에 실패했습니다: ' + error.message, 'error');
      
      const button = document.getElementById('start-payment-btn');
      button.textContent = '결제 시작하기';
      button.disabled = false;
    }
  }

  async simulatePaymentSuccess() {
    // Simulate successful payment processing
    return new Promise((resolve) => {
      setTimeout(() => {
        this.showToast('결제가 완료되었습니다!', 'success');
        this.completeRegistration();
        resolve();
      }, 2000);
    });
  }

  async completeRegistration() {
    try {
      // Create user account in backend
      const userData = {
        ...this.userInfo,
        plan: 'plus',
        billing: this.selectedBilling,
        registeredAt: new Date().toISOString()
      };

      // Store in Chrome storage for now
      await chrome.storage.sync.set({
        carrinderUser: userData,
        userPlan: {
          plan: 'plus',
          billing: this.selectedBilling,
          expires: this.calculateExpiryDate()
        }
      });

      this.goToStep(5);
      
    } catch (error) {
      console.error('Registration failed:', error);
      this.showToast('회원가입 완료 처리에 실패했습니다.', 'error');
    }
  }

  calculateExpiryDate() {
    const now = new Date();
    if (this.selectedBilling === 'monthly') {
      now.setMonth(now.getMonth() + 1);
    } else {
      now.setFullYear(now.getFullYear() + 1);
    }
    return now.toISOString();
  }

  completeSignup() {
    // Close auth window and return to main app
    this.showToast('Carrinder Plus에 오신 것을 환영합니다!', 'success');
    
    setTimeout(() => {
      if (window.opener) {
        window.opener.postMessage({ type: 'AUTH_SUCCESS', plan: 'plus' }, '*');
      }
      window.close();
    }, 1000);
  }

  cancelSignup() {
    if (confirm('회원가입을 취소하시겠습니까?')) {
      if (window.opener) {
        window.opener.postMessage({ type: 'AUTH_CANCELLED' }, '*');
      }
      window.close();
    }
  }

  showTerms() {
    alert('이용약관\n\n1. 서비스 이용 약관...\n2. 사용자 의무...\n3. 서비스 제공자의 의무...\n\n(실제 구현시 별도 페이지나 모달로 표시)');
  }

  showPrivacy() {
    alert('개인정보처리방침\n\n1. 개인정보 수집 및 이용 목적...\n2. 수집하는 개인정보의 항목...\n3. 개인정보의 보유 및 이용기간...\n\n(실제 구현시 별도 페이지나 모달로 표시)');
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

  // Utility methods for backend integration
  async registerUser(userData) {
    // In real implementation, send to your backend API
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(userData)
    });

    if (!response.ok) {
      throw new Error('회원가입에 실패했습니다.');
    }

    return response.json();
  }

  async processPayment(paymentData) {
    // In real implementation, verify payment with your backend
    const response = await fetch('/api/payments/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(paymentData)
    });

    if (!response.ok) {
      throw new Error('결제 확인에 실패했습니다.');
    }

    return response.json();
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.carrinderAuth = new CarrinderAuth();
});

// Handle messages from parent window
window.addEventListener('message', (event) => {
  if (event.data.type === 'BILLING_SELECTED') {
    window.carrinderAuth.selectedBilling = event.data.billing;
    window.carrinderAuth.updatePlanPrice();
  }
});

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CarrinderAuth;
}