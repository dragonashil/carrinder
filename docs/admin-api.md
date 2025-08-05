# Carrinder Admin API 설계 문서

## 개요
Carrinder Chrome Extension과 Admin Dashboard를 위한 Firebase 기반 RESTful API 설계

### Base URL
- Development: `https://dev-api.carrinder.com`
- Staging: `https://staging-api.carrinder.com`
- Production: `https://api.carrinder.com`

### 인증 방식
- Firebase Auth JWT Token
- Header: `Authorization: Bearer {idToken}`

### 응답 형식
```json
{
  "success": true,
  "data": {},
  "error": null,
  "timestamp": "2024-01-01T00:00:00Z"
}
```

### 에러 응답
```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "ERROR_CODE",
    "message": "에러 메시지",
    "details": {}
  },
  "timestamp": "2024-01-01T00:00:00Z"
}
```

---

## 1. 인증 API (Authentication)

### 1.1 회원가입
```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "googleIdToken": "string",
  "email": "user@example.com",
  "name": "홍길동",
  "marketingConsent": true
}

Response 200:
{
  "success": true,
  "data": {
    "user": {
      "uid": "firebase_uid",
      "email": "user@example.com",
      "name": "홍길동",
      "photoURL": "https://...",
      "subscription": {
        "plan": "free",
        "status": "active"
      }
    },
    "accessToken": "firebase_id_token",
    "refreshToken": "refresh_token"
  }
}
```

### 1.2 로그인
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "googleIdToken": "string"
}

Response 200:
{
  "success": true,
  "data": {
    "user": {
      "uid": "firebase_uid",
      "email": "user@example.com",
      "subscription": {
        "plan": "premium",
        "status": "active",
        "expiresAt": "2024-12-31T23:59:59Z"
      }
    },
    "accessToken": "firebase_id_token",
    "refreshToken": "refresh_token"
  }
}
```

### 1.3 토큰 갱신
```http
POST /api/v1/auth/refresh
Content-Type: application/json

{
  "refreshToken": "string"
}

Response 200:
{
  "success": true,
  "data": {
    "accessToken": "new_firebase_id_token",
    "refreshToken": "new_refresh_token"
  }
}
```

### 1.4 로그아웃
```http
POST /api/v1/auth/logout
Authorization: Bearer {token}

Response 200:
{
  "success": true,
  "data": {
    "message": "로그아웃 되었습니다"
  }
}
```

### 1.5 현재 사용자 정보
```http
GET /api/v1/auth/me
Authorization: Bearer {token}

Response 200:
{
  "success": true,
  "data": {
    "user": {
      "uid": "firebase_uid",
      "email": "user@example.com",
      "name": "홍길동",
      "photoURL": "https://...",
      "createdAt": "2024-01-01T00:00:00Z",
      "subscription": {
        "plan": "premium",
        "status": "active",
        "startDate": "2024-01-01T00:00:00Z",
        "endDate": "2024-12-31T23:59:59Z",
        "autoRenew": true
      },
      "usage": {
        "eventsCreated": 150,
        "spreadsheetsLinked": 3,
        "lastActiveAt": "2024-01-15T10:30:00Z"
      }
    }
  }
}
```

---

## 2. 구독 관리 API (Subscription)

### 2.1 구독 상태 조회
```http
GET /api/v1/subscription/status
Authorization: Bearer {token}

Response 200:
{
  "success": true,
  "data": {
    "subscription": {
      "plan": "premium_monthly",
      "status": "active",
      "startDate": "2024-01-01T00:00:00Z",
      "endDate": "2024-02-01T00:00:00Z",
      "autoRenew": true,
      "paymentMethod": {
        "type": "card",
        "last4": "1234"
      }
    },
    "availableFeatures": [
      "unlimited_events",
      "priority_support",
      "advanced_analytics"
    ]
  }
}
```

### 2.2 구독 플랜 목록
```http
GET /api/v1/subscription/plans

Response 200:
{
  "success": true,
  "data": {
    "plans": [
      {
        "id": "free",
        "name": "무료",
        "price": 0,
        "currency": "KRW",
        "interval": null,
        "features": ["basic_features", "10_events_per_month"]
      },
      {
        "id": "premium_monthly",
        "name": "프리미엄 월간",
        "price": 5000,
        "currency": "KRW",
        "interval": "month",
        "features": ["unlimited_events", "priority_support"]
      },
      {
        "id": "premium_yearly",
        "name": "프리미엄 연간",
        "price": 50000,
        "currency": "KRW",
        "interval": "year",
        "features": ["unlimited_events", "priority_support", "2_months_free"]
      }
    ]
  }
}
```

### 2.3 구독 변경
```http
PUT /api/v1/subscription/change
Authorization: Bearer {token}
Content-Type: application/json

{
  "planId": "premium_yearly",
  "paymentMethodId": "pm_1234567890"
}

Response 200:
{
  "success": true,
  "data": {
    "subscription": {
      "plan": "premium_yearly",
      "status": "active",
      "nextBillingDate": "2025-01-01T00:00:00Z",
      "amount": 50000
    }
  }
}
```

### 2.4 구독 취소
```http
DELETE /api/v1/subscription/cancel
Authorization: Bearer {token}
Content-Type: application/json

{
  "reason": "too_expensive",
  "feedback": "optional feedback text"
}

Response 200:
{
  "success": true,
  "data": {
    "subscription": {
      "status": "cancelled",
      "cancelledAt": "2024-01-15T10:00:00Z",
      "validUntil": "2024-02-01T00:00:00Z"
    }
  }
}
```

---

## 3. 결제 API (Payment)

### 3.1 결제 세션 생성
```http
POST /api/v1/payment/create-session
Authorization: Bearer {token}
Content-Type: application/json

{
  "planId": "premium_monthly",
  "successUrl": "https://carrinder.com/payment/success",
  "failUrl": "https://carrinder.com/payment/fail"
}

Response 200:
{
  "success": true,
  "data": {
    "sessionId": "session_1234567890",
    "orderId": "order_1234567890",
    "amount": 5000,
    "currency": "KRW",
    "checkoutUrl": "https://pay.toss.im/..."
  }
}
```

### 3.2 결제 검증
```http
POST /api/v1/payment/verify
Authorization: Bearer {token}
Content-Type: application/json

{
  "paymentKey": "toss_payment_key",
  "orderId": "order_1234567890",
  "amount": 5000
}

Response 200:
{
  "success": true,
  "data": {
    "payment": {
      "id": "payment_1234567890",
      "orderId": "order_1234567890",
      "status": "completed",
      "amount": 5000,
      "method": "카드",
      "paidAt": "2024-01-15T10:00:00Z"
    },
    "subscription": {
      "plan": "premium_monthly",
      "status": "active",
      "startDate": "2024-01-15T10:00:00Z",
      "endDate": "2024-02-15T10:00:00Z"
    }
  }
}
```

### 3.3 결제 내역 조회
```http
GET /api/v1/payment/history?page=1&limit=10
Authorization: Bearer {token}

Response 200:
{
  "success": true,
  "data": {
    "payments": [
      {
        "id": "payment_1234567890",
        "orderId": "order_1234567890",
        "amount": 5000,
        "currency": "KRW",
        "status": "completed",
        "method": "카드",
        "description": "Carrinder Premium 월간",
        "paidAt": "2024-01-15T10:00:00Z"
      }
    ],
    "pagination": {
      "total": 25,
      "page": 1,
      "limit": 10,
      "totalPages": 3
    }
  }
}
```

### 3.4 환불 요청
```http
POST /api/v1/payment/refund
Authorization: Bearer {token}
Content-Type: application/json

{
  "paymentId": "payment_1234567890",
  "reason": "customer_request",
  "amount": 5000
}

Response 200:
{
  "success": true,
  "data": {
    "refund": {
      "id": "refund_1234567890",
      "paymentId": "payment_1234567890",
      "amount": 5000,
      "status": "pending",
      "reason": "customer_request",
      "requestedAt": "2024-01-16T10:00:00Z"
    }
  }
}
```

---

## 4. 확장프로그램 동기화 API

### 4.1 설정 동기화
```http
GET /api/v1/extension/sync
Authorization: Bearer {token}

Response 200:
{
  "success": true,
  "data": {
    "settings": {
      "theme": "dark",
      "language": "ko",
      "notifications": true,
      "autoSync": true
    },
    "subscription": {
      "plan": "premium",
      "features": ["unlimited_events", "priority_support"]
    },
    "lastSyncAt": "2024-01-15T10:00:00Z"
  }
}
```

### 4.2 사용량 업데이트
```http
POST /api/v1/extension/usage
Authorization: Bearer {token}
Content-Type: application/json

{
  "eventsCreated": 5,
  "spreadsheetsLinked": 1,
  "activeMinutes": 30
}

Response 200:
{
  "success": true,
  "data": {
    "usage": {
      "daily": {
        "eventsCreated": 15,
        "limit": null
      },
      "monthly": {
        "eventsCreated": 150,
        "limit": null
      }
    }
  }
}
```

---

## 5. 관리자 전용 API

### 5.1 관리자 인증
```http
POST /api/v1/admin/auth/login
Content-Type: application/json

{
  "email": "admin@carrinder.com",
  "password": "admin_password"
}

Response 200:
{
  "success": true,
  "data": {
    "admin": {
      "uid": "admin_uid",
      "email": "admin@carrinder.com",
      "role": "super_admin",
      "permissions": ["users:read", "users:write", "payments:read", "payments:write"]
    },
    "accessToken": "admin_jwt_token"
  }
}
```

### 5.2 사용자 목록 조회
```http
GET /api/v1/admin/users?page=1&limit=20&search=hong&plan=premium
Authorization: Bearer {adminToken}

Response 200:
{
  "success": true,
  "data": {
    "users": [
      {
        "uid": "user_uid",
        "email": "hong@example.com",
        "name": "홍길동",
        "createdAt": "2024-01-01T00:00:00Z",
        "subscription": {
          "plan": "premium",
          "status": "active",
          "expiresAt": "2024-12-31T23:59:59Z"
        },
        "totalPayments": 50000,
        "lastActiveAt": "2024-01-15T10:00:00Z"
      }
    ],
    "pagination": {
      "total": 1000,
      "page": 1,
      "limit": 20,
      "totalPages": 50
    }
  }
}
```

### 5.3 사용자 상세 정보
```http
GET /api/v1/admin/users/{userId}
Authorization: Bearer {adminToken}

Response 200:
{
  "success": true,
  "data": {
    "user": {
      "uid": "user_uid",
      "email": "user@example.com",
      "name": "홍길동",
      "photoURL": "https://...",
      "createdAt": "2024-01-01T00:00:00Z",
      "subscription": {
        "plan": "premium_monthly",
        "status": "active",
        "startDate": "2024-01-01T00:00:00Z",
        "endDate": "2024-02-01T00:00:00Z",
        "autoRenew": true
      },
      "payments": [
        {
          "id": "payment_123",
          "amount": 5000,
          "status": "completed",
          "paidAt": "2024-01-01T00:00:00Z"
        }
      ],
      "usage": {
        "totalEvents": 1500,
        "thisMonth": 150,
        "lastActiveAt": "2024-01-15T10:00:00Z"
      },
      "notes": "VIP 고객"
    }
  }
}
```

### 5.4 사용자 구독 수정
```http
PUT /api/v1/admin/users/{userId}/subscription
Authorization: Bearer {adminToken}
Content-Type: application/json

{
  "plan": "premium_yearly",
  "expiresAt": "2025-01-01T00:00:00Z",
  "reason": "admin_grant",
  "note": "고객 불만 해결을 위한 무료 연장"
}

Response 200:
{
  "success": true,
  "data": {
    "subscription": {
      "plan": "premium_yearly",
      "status": "active",
      "expiresAt": "2025-01-01T00:00:00Z",
      "modifiedBy": "admin_uid",
      "modifiedAt": "2024-01-15T10:00:00Z"
    }
  }
}
```

### 5.5 대시보드 통계
```http
GET /api/v1/admin/dashboard/stats
Authorization: Bearer {adminToken}

Response 200:
{
  "success": true,
  "data": {
    "overview": {
      "totalUsers": 10000,
      "activeUsers": 8500,
      "premiumUsers": 2000,
      "monthlyRevenue": 10000000,
      "yearlyRevenue": 100000000
    },
    "growth": {
      "newUsersToday": 50,
      "newUsersThisMonth": 1500,
      "churnRate": 0.05,
      "conversionRate": 0.20
    },
    "subscription": {
      "free": 8000,
      "premium_monthly": 1500,
      "premium_yearly": 500,
      "cancelled": 200
    },
    "charts": {
      "revenueByMonth": [
        {"month": "2024-01", "revenue": 8000000},
        {"month": "2024-02", "revenue": 8500000}
      ],
      "userGrowth": [
        {"date": "2024-01-01", "total": 9000, "premium": 1800},
        {"date": "2024-01-15", "total": 10000, "premium": 2000}
      ]
    }
  }
}
```

### 5.6 활동 로그
```http
GET /api/v1/admin/logs?type=subscription_change&userId={userId}&page=1
Authorization: Bearer {adminToken}

Response 200:
{
  "success": true,
  "data": {
    "logs": [
      {
        "id": "log_123",
        "type": "subscription_change",
        "userId": "user_uid",
        "adminId": "admin_uid",
        "action": "grant_premium",
        "details": {
          "from": "free",
          "to": "premium_yearly",
          "reason": "customer_complaint"
        },
        "timestamp": "2024-01-15T10:00:00Z"
      }
    ],
    "pagination": {
      "total": 100,
      "page": 1,
      "limit": 20,
      "totalPages": 5
    }
  }
}
```

---

## 6. Webhook API

### 6.1 Toss Payments Webhook
```http
POST /api/v1/webhooks/toss-payments
Content-Type: application/json
X-Toss-Signature: {signature}

{
  "eventType": "PAYMENT.DONE",
  "data": {
    "paymentKey": "payment_key",
    "orderId": "order_123",
    "status": "DONE",
    "amount": 5000
  }
}

Response 200:
{
  "success": true
}
```

### 6.2 Extension 상태 업데이트 Webhook
```http
POST /api/v1/webhooks/extension-health
Content-Type: application/json
X-API-Key: {webhook_secret}

{
  "userId": "user_uid",
  "extensionVersion": "1.0.0",
  "lastActiveAt": "2024-01-15T10:00:00Z",
  "errorCount": 0
}

Response 200:
{
  "success": true
}
```

---

## 7. 에러 코드

| 코드 | 설명 |
|------|------|
| `AUTH_REQUIRED` | 인증이 필요합니다 |
| `AUTH_INVALID` | 유효하지 않은 토큰입니다 |
| `AUTH_EXPIRED` | 만료된 토큰입니다 |
| `PERMISSION_DENIED` | 권한이 없습니다 |
| `USER_NOT_FOUND` | 사용자를 찾을 수 없습니다 |
| `SUBSCRIPTION_EXPIRED` | 구독이 만료되었습니다 |
| `PAYMENT_FAILED` | 결제에 실패했습니다 |
| `INVALID_REQUEST` | 잘못된 요청입니다 |
| `RATE_LIMIT_EXCEEDED` | 요청 한도를 초과했습니다 |
| `SERVER_ERROR` | 서버 오류가 발생했습니다 |

---

## 8. Rate Limiting

- 일반 사용자: 100 requests/minute
- 프리미엄 사용자: 300 requests/minute
- 관리자: 1000 requests/minute

헤더 응답:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

---

## 9. CORS 설정

허용된 도메인:
- Chrome Extension: `chrome-extension://*`
- Admin Dashboard: `https://admin.carrinder.com`
- Development: `http://localhost:3000`

---

## 10. 보안 고려사항

1. **Firebase Security Rules**
   - Firestore 접근 제어
   - Storage 접근 제어
   - 사용자별 데이터 격리

2. **API 보안**
   - JWT 토큰 검증
   - API Key 관리
   - SQL Injection 방지
   - XSS 방지

3. **데이터 보안**
   - 민감한 정보 암호화
   - PII 최소화
   - 로그 마스킹

4. **감사 로그**
   - 모든 관리자 작업 기록
   - 결제 관련 작업 기록
   - 보안 이벤트 기록