const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function setupEnvironment() {
  console.log('🚀 Career Manager 환경 설정 도구');
  console.log('=================================\n');
  
  console.log('이 도구는 개발에 필요한 환경 변수들을 설정합니다.');
  console.log('각 단계에서 필요한 정보를 입력하거나 Enter를 눌러 건너뛸 수 있습니다.\n');
  
  const envPath = path.join(__dirname, '../.env');
  let envContent = '';
  
  // Check if .env already exists
  if (fs.existsSync(envPath)) {
    const overwrite = await question('⚠️  .env 파일이 이미 존재합니다. 덮어쓰시겠습니까? (y/N): ');
    if (overwrite.toLowerCase() !== 'y') {
      console.log('설정을 취소했습니다.');
      rl.close();
      return;
    }
  }
  
  console.log('\n📱 Google OAuth 2.0 설정');
  console.log('──────────────────────────');
  console.log('Google Cloud Console에서 OAuth 2.0 클라이언트 ID를 생성하세요.');
  console.log('가이드: https://console.cloud.google.com/apis/credentials\n');
  
  const googleClientId = await question('Google Client ID: ');
  const googleClientSecret = await question('Google Client Secret: ');
  
  console.log('\n📋 Notion API 설정');
  console.log('─────────────────────');
  console.log('Notion 개발자 페이지에서 통합을 생성하세요.');
  console.log('가이드: https://www.notion.so/my-integrations\n');
  
  const notionToken = await question('Notion Token: ');
  const notionDatabaseId = await question('Notion Database ID: ');
  
  console.log('\n🔧 개발 환경 설정');
  console.log('─────────────────────');
  
  const nodeEnv = await question('Environment (development/production) [development]: ') || 'development';
  const debug = await question('Debug mode (true/false) [true]: ') || 'true';
  
  console.log('\n🆔 Chrome Extension 설정');
  console.log('──────────────────────────');
  
  const extensionId = await question('Extension ID (개발 중에는 선택사항): ');
  
  // Build .env content
  envContent = `# Google OAuth 2.0 설정
GOOGLE_CLIENT_ID=${googleClientId}
GOOGLE_CLIENT_SECRET=${googleClientSecret}

# Notion API 설정
NOTION_TOKEN=${notionToken}
NOTION_DATABASE_ID=${notionDatabaseId}

# 개발 환경 설정
NODE_ENV=${nodeEnv}
DEBUG=${debug}

# Chrome Extension 설정
EXTENSION_ID=${extensionId}

# API 설정 (선택사항 - OAuth 사용 시 불필요)
GOOGLE_CALENDAR_API_KEY=
GOOGLE_DRIVE_API_KEY=
GOOGLE_SHEETS_API_KEY=
`;
  
  // Write .env file
  fs.writeFileSync(envPath, envContent);
  
  console.log('\n✅ 환경 설정 완료!');
  console.log('──────────────────');
  console.log('📄 .env 파일이 생성되었습니다.');
  console.log('🔒 이 파일은 Git에 포함되지 않습니다.');
  console.log('📚 자세한 설정 가이드: docs/environment-setup.md\n');
  
  // Validate required fields
  const missingFields = [];
  if (!googleClientId) missingFields.push('Google Client ID');
  if (!notionToken) missingFields.push('Notion Token');
  if (!notionDatabaseId) missingFields.push('Notion Database ID');
  
  if (missingFields.length > 0) {
    console.log('⚠️  누락된 필수 필드:');
    missingFields.forEach(field => console.log(`   - ${field}`));
    console.log('\n나중에 .env 파일을 직접 편집하여 추가하세요.');
  }
  
  console.log('\n🚀 다음 단계:');
  console.log('1. npm run build:dev - 개발 버전 빌드');
  console.log('2. Chrome에서 chrome://extensions/ 이동');
  console.log('3. 개발자 모드 활성화');
  console.log('4. build/dist 폴더 로드');
  
  rl.close();
}

// Handle Ctrl+C
process.on('SIGINT', () => {
  console.log('\n설정을 취소했습니다.');
  rl.close();
  process.exit(0);
});

// Run setup
setupEnvironment().catch(error => {
  console.error('❌ 설정 중 오류가 발생했습니다:', error);
  rl.close();
  process.exit(1);
});