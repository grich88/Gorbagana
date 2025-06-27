#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Deploying Gorbagana Trash Tac Toe Frontend to Netlify...\n');

// Check if we're in the right directory
const frontendDir = path.join(__dirname, 'frontend');
if (!fs.existsSync(frontendDir)) {
  console.error('❌ Frontend directory not found!');
  process.exit(1);
}

console.log('📁 Frontend directory found');
console.log('📦 Frontend files prepared for deployment');

console.log('\n🌐 NETLIFY DEPLOYMENT INSTRUCTIONS:');
console.log('');
console.log('STEP 1: Deploy Backend First (if not done)');
console.log('- Deploy backend to Railway/Render using deploy-backend.js instructions');
console.log('- Get your backend URL (e.g., https://your-app.railway.app)');
console.log('');
console.log('STEP 2: Update Frontend Configuration');
console.log('- Update frontend/src/lib/gameStorage.ts line 40');
console.log('- Replace "https://gorbagana-backend.railway.app" with your actual backend URL');
console.log('');
console.log('STEP 3: Build and Deploy Frontend');
console.log('Option A - Netlify CLI (if installed):');
console.log('  cd frontend');
console.log('  npm run build');
console.log('  netlify deploy --prod --dir out');
console.log('');
console.log('Option B - Netlify Dashboard:');
console.log('1. Go to https://app.netlify.com');
console.log('2. Click on your "gorbagana-trash-tac-toe" site');
console.log('3. Go to "Deploys" tab');
console.log('4. Click "Deploy site" → "Deploy with GitHub"');
console.log('5. OR drag and drop the "frontend/out" folder after building');
console.log('');
console.log('STEP 4: Build Frontend:');
console.log('  cd frontend');
console.log('  npm run build');
console.log('');

// Check if netlify CLI is installed
try {
  execSync('netlify --version', { stdio: 'ignore' });
  console.log('✅ Netlify CLI detected - you can use Option A');
} catch (error) {
  console.log('📦 Netlify CLI not installed - use Option B or install with:');
  console.log('    npm install -g netlify-cli');
}

console.log('\n🔧 ENVIRONMENT SETUP:');
console.log('Your frontend is already configured to:');
console.log('- Use localhost:3001 for local development');
console.log('- Use production backend URL when deployed to Netlify');
console.log('');

console.log('📱 TESTING CROSS-DEVICE:');
console.log('After deployment:');
console.log('1. Open https://gorbagana-trash-tac-toe.netlify.app on Device 1');
console.log('2. Open https://gorbagana-trash-tac-toe.netlify.app on Device 2');
console.log('3. Create a game on Device 1');
console.log('4. Join the game on Device 2 using the Game ID');
console.log('5. Play cross-device multiplayer! 🎮');

console.log('\n✅ Frontend ready for deployment!');
console.log('🌐 Your game will be live at: https://gorbagana-trash-tac-toe.netlify.app'); 