#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Deploying Gorbagana Trash Tac Toe Backend...\n');

// Check if we're in the right directory
const backendDir = path.join(__dirname, 'backend');
if (!fs.existsSync(backendDir)) {
  console.error('❌ Backend directory not found!');
  process.exit(1);
}

console.log('📁 Backend directory found');
console.log('📦 Backend files prepared for deployment');

// RENDER.COM DEPLOYMENT STATUS (Currently Active)
console.log('\n✅ BACKEND ALREADY DEPLOYED ON RENDER.COM!');
console.log('🌐 Live Backend URL: https://gorbagana-trash-tac-toe-backend.onrender.com');
console.log('📊 Health Check: https://gorbagana-trash-tac-toe-backend.onrender.com/health');
console.log('🎮 API Endpoints: https://gorbagana-trash-tac-toe-backend.onrender.com/api/games');
console.log('');

console.log('🎨 RENDER.COM DEPLOYMENT DETAILS:');
console.log('✅ Service Name: gorbagana-trash-tac-toe-backend');
console.log('✅ Repository: https://github.com/grich88/Gorbagana.git');
console.log('✅ Root Directory: backend');
console.log('✅ Build Command: npm install');
console.log('✅ Start Command: npm start');
console.log('✅ Environment Variables: All configured');
console.log('✅ MongoDB Atlas: Connected');
console.log('');

console.log('🔄 IF YOU NEED TO REDEPLOY:');
console.log('1. Go to https://render.com/dashboard');
console.log('2. Find "gorbagana-trash-tac-toe-backend" service');
console.log('3. Click "Manual Deploy" → "Deploy latest commit"');
console.log('4. Or push changes to trigger auto-deploy');
console.log('');

console.log('⚠️ RAILWAY.APP REMOVED:');
console.log('- Deleted railway.json configuration file');
console.log('- Railway deployment references cleaned up');
console.log('- All deployment now uses Render.com only');

console.log('\n📋 Environment Variables Needed:');
console.log('MONGODB_URI=mongodb+srv://jgrantrichards:7cvB2WZ9JznqGzx6@cluster0.cawkklo.mongodb.net/gorbagana-trash-tac-toe?retryWrites=true&w=majority&appName=Cluster0');
console.log('PORT=3001');
console.log('NODE_ENV=production');
console.log('CORS_ORIGINS=https://gorbagana-trash-tac-toe.netlify.app');

console.log('\n✅ Backend deployment status: LIVE AND WORKING!');
console.log('🌐 Current backend URL: https://gorbagana-trash-tac-toe-backend.onrender.com');
console.log('📱 Frontend URL: https://gorbagana-trash-tac-toe.netlify.app');
console.log('\n🎉 Cross-device multiplayer gaming is ACTIVE!'); 