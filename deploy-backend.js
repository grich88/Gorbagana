#!/usr/bin/env node

/**
 * Backend Deployment Script for Gorbagana Trash Tac Toe
 * 
 * This script handles the deployment of the backend to Render.com
 * 
 * Production Backend: https://gorbagana-trash-tac-toe-backend.onrender.com
 */

const fs = require('fs');
const path = require('path');

console.log('🚀 Gorbagana Trash Tac Toe Backend Deployment');
console.log('='.repeat(50));

// Check if backend directory exists
const backendDir = path.join(__dirname, 'backend');
if (!fs.existsSync(backendDir)) {
  console.error('❌ Backend directory not found!');
  process.exit(1);
}

// Check for required files
const requiredFiles = [
  'server.js',
  'package.json',
  'render.yaml'
];

console.log('\n📋 Checking backend files...');
for (const file of requiredFiles) {
  const filePath = path.join(backendDir, file);
  if (fs.existsSync(filePath)) {
    console.log(`✅ ${file} - Found`);
  } else {
    console.error(`❌ ${file} - Missing`);
    process.exit(1);
  }
}

// Display deployment information
console.log('\n🌐 Deployment Configuration:');
console.log('- Platform: Render.com');
console.log('- Service: gorbagana-trash-tac-toe-backend');
console.log('- URL: https://gorbagana-trash-tac-toe-backend.onrender.com');
console.log('- Database: MongoDB Atlas');
console.log('- Auto-deploy: Enabled (on git push)');

console.log('\n✅ Backend deployment configuration verified!');
console.log('\n📝 Next steps:');
console.log('1. Commit and push changes to GitHub');
console.log('2. Render.com will automatically deploy');
console.log('3. Check deployment status at: https://dashboard.render.com');

console.log('\n🔗 Production URLs:');
console.log('- Backend API: https://gorbagana-trash-tac-toe-backend.onrender.com');
console.log('- Frontend: https://gorbagana-trash-tac-toe.netlify.app');
console.log('- Health Check: https://gorbagana-trash-tac-toe-backend.onrender.com/health'); 