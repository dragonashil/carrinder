# Carrinder Backend API 설계

## 개요
실제 서비스 운영을 위한 백엔드 API 및 관리자 시스템 설계

## 필요한 시스템 구성요소

### 1. 백엔드 API 서버
- **기술 스택:** Node.js + Express / Python Django / Java Spring Boot
- **데이터베이스:** PostgreSQL (사용자/결제 데이터) + Redis (세션/캐시)
- **인증:** JWT + Google OAuth2
- **결제:** Toss Payments API 연동
- **이메일:** SendGrid / AWS SES
- **배포:** AWS / GCP / Azure

### 2. 데이터베이스 스키마

#### Users 테이블
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY,
    google_id VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    profile_picture TEXT,
    plan VARCHAR(50) DEFAULT 'basic', -- 'basic', 'plus'
    status VARCHAR(50) DEFAULT 'active', -- 'active', 'suspended', 'cancelled'
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    last_login TIMESTAMP,
    marketing_consent BOOLEAN DEFAULT false,
    terms_version VARCHAR(20) DEFAULT '1.0'
);
```

#### Subscriptions 테이블
```sql
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    plan VARCHAR(50) NOT NULL,
    billing_cycle VARCHAR(20), -- 'monthly', 'yearly'
    status VARCHAR(50) DEFAULT 'active', -- 'active', 'cancelled', 'past_due'
    current_period_start TIMESTAMP,
    current_period_end TIMESTAMP,
    cancel_at_period_end BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

#### Payments 테이블
```sql
CREATE TABLE payments (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    subscription_id UUID REFERENCES subscriptions(id),
    toss_payment_key VARCHAR(255) UNIQUE,
    order_id VARCHAR(255) UNIQUE,
    amount INTEGER NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    status VARCHAR(50), -- 'DONE', 'CANCELLED', 'PARTIAL_CANCELLED'
    payment_method VARCHAR(50),
    requested_at TIMESTAMP,
    approved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);
```

#### User_Activity 테이블
```sql
CREATE TABLE user_activity (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL, -- 'login', 'data_collection', 'export', etc.
    metadata JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### 3. API 엔드포인트

#### 인증 관련
```
POST /api/auth/google-login
POST /api/auth/refresh-token
POST /api/auth/logout
```

#### 사용자 관리
```
GET /api/users/profile
PUT /api/users/profile
DELETE /api/users/account
GET /api/users/subscription
POST /api/users/upgrade
POST /api/users/cancel-subscription
```

#### 결제 관리
```
POST /api/payments/create-payment
POST /api/payments/confirm-payment
GET /api/payments/history
POST /api/payments/refund
```

#### 사용량 추적
```
POST /api/usage/track-action
GET /api/usage/stats
```

### 4. Chrome Extension 연동

#### auth.js 수정
```javascript
class CarrinderAuth {
  async registerUser(userData) {
    const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        googleId: userData.googleId,
        name: userData.name,
        email: userData.email,
        profilePicture: userData.picture,
        marketingConsent: userData.marketingAgreed
      })
    });

    if (!response.ok) {
      throw new Error('회원가입에 실패했습니다.');
    }

    const result = await response.json();
    
    // Store JWT token
    await chrome.storage.local.set({
      accessToken: result.accessToken,
      refreshToken: result.refreshToken
    });

    return result;
  }

  async processPayment(paymentData) {
    const response = await fetch(`${API_BASE_URL}/api/payments/create-payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await this.getAccessToken()}`
      },
      body: JSON.stringify(paymentData)
    });

    if (!response.ok) {
      throw new Error('결제 생성에 실패했습니다.');
    }

    return response.json();
  }
}
```

#### popup.js 수정
```javascript
async registerBasicUser(userInfo) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/google-register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        googleId: userInfo.id,
        name: userInfo.name,
        email: userInfo.email,
        profilePicture: userInfo.picture,
        plan: 'basic',
        autoRegistered: true
      })
    });

    const result = await response.json();
    
    // Store tokens
    await chrome.storage.local.set({
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      userId: result.user.id
    });

    // Track registration
    await this.trackUserAction('auto_registration', { plan: 'basic' });

  } catch (error) {
    console.error('Error registering basic user:', error);
    throw error;
  }
}

async trackUserAction(action, metadata = {}) {
  try {
    await fetch(`${API_BASE_URL}/api/usage/track-action`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await this.getAccessToken()}`
      },
      body: JSON.stringify({
        action,
        metadata,
        timestamp: new Date().toISOString()
      })
    });
  } catch (error) {
    console.error('Error tracking user action:', error);
  }
}
```

### 5. 관리자 대시보드

#### 기능 요구사항
- **사용자 관리**
  - 전체 사용자 목록 및 검색
  - 사용자별 상세 정보 (가입일, 마지막 로그인, 플랜, 활동 내역)
  - 사용자 상태 변경 (활성/정지/탈퇴)
  - 사용자별 메모 및 태그 관리

- **결제 관리**
  - 전체 결제 내역 및 통계
  - 월/연 매출 리포트
  - 환불 처리
  - 결제 실패 알림

- **구독 관리**
  - 플랜별 사용자 분포
  - 구독 취소율 분석
  - 갱신 예정 사용자 목록
  - 자동 갱신 실패 처리

- **마케팅 도구**
  - 이메일 캠페인 생성 및 발송
  - 사용자 세그먼트별 타겟팅
  - A/B 테스트
  - 프로모션 코드 관리

- **분석 및 리포트**
  - 사용자 활동 분석
  - 기능별 사용량 통계
  - 이탈 사용자 분석
  - 수익 예측

#### 대시보드 화면 구성
```
/admin/dashboard - 전체 현황
/admin/users - 사용자 관리
/admin/payments - 결제 관리
/admin/subscriptions - 구독 관리
/admin/marketing - 마케팅 도구
/admin/analytics - 분석 리포트
/admin/settings - 시스템 설정
```

### 6. 이메일 자동화

#### 발송 시나리오
1. **가입 환영 메일** - 가입 즉시
2. **결제 성공 확인** - 결제 완료 후
3. **구독 갱신 알림** - 갱신 3일 전
4. **결제 실패 알림** - 결제 실패 시
5. **구독 취소 확인** - 취소 시
6. **이탈 방지 메일** - 7일 미접속 시
7. **기능 업데이트 알림** - 새 기능 출시 시
8. **프로모션 메일** - 마케팅 동의 사용자 대상

### 7. 보안 및 컴플라이언스

#### 데이터 보호
- GDPR/CCPA 준수
- 개인정보 암호화 저장
- 정기적 보안 감사
- 데이터 백업 및 복구 계획

#### API 보안
- Rate limiting
- API 키 관리
- SSL/TLS 강제 적용
- 입력 데이터 검증

### 8. 모니터링 및 알림

#### 시스템 모니터링
- 서버 상태 모니터링
- API 응답 시간 추적
- 에러율 모니터링
- 결제 실패 알림

#### 비즈니스 메트릭
- DAU/MAU 추적
- 전환율 모니터링
- 수익 실시간 추적
- 이탈률 분석

### 9. 배포 및 인프라

#### 추천 아키텍처
```
Frontend (Admin Dashboard): React/Vue.js
Backend API: Node.js + Express
Database: PostgreSQL (Primary) + Redis (Cache)
File Storage: AWS S3
Email: SendGrid
Monitoring: DataDog/New Relic
CI/CD: GitHub Actions
Hosting: AWS/GCP
```

#### 환경 구성
- **Development:** 로컬 개발 환경
- **Staging:** 테스트 서버
- **Production:** 실서비스 환경

이런 백엔드 시스템을 구축하면 실제 SaaS 서비스로 운영할 수 있게 됩니다. 특히 사용자 관리, 결제 추적, 마케팅 자동화가 가능해집니다.