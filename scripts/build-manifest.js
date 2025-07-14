const fs = require('fs');
const path = require('path');
require('dotenv').config();

function buildManifest() {
  try {
    // Read the template manifest
    const manifestPath = path.join(__dirname, '../manifest.json');
    const manifestContent = fs.readFileSync(manifestPath, 'utf8');
    
    // Replace placeholders with environment variables
    let updatedManifest = manifestContent.replace(
      'GOOGLE_CLIENT_ID_PLACEHOLDER',
      process.env.GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID'
    );
    
    // Parse and validate JSON
    const manifest = JSON.parse(updatedManifest);
    
    // Add version information if available
    if (process.env.npm_package_version) {
      manifest.version = process.env.npm_package_version;
    }
    
    // Write the updated manifest to build directory
    const buildDir = path.join(__dirname, '../build/dist');
    if (!fs.existsSync(buildDir)) {
      fs.mkdirSync(buildDir, { recursive: true });
    }
    
    fs.writeFileSync(
      path.join(buildDir, 'manifest.json'),
      JSON.stringify(manifest, null, 2)
    );
    
    console.log('✅ Manifest built successfully with environment variables');
    
    // Validate required fields
    if (!process.env.GOOGLE_CLIENT_ID) {
      console.warn('⚠️  GOOGLE_CLIENT_ID not set in environment variables');
    }
    
  } catch (error) {
    console.error('❌ Error building manifest:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  buildManifest();
}

module.exports = { buildManifest };