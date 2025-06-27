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

// Railway deployment instructions
console.log('\n🚂 RAILWAY DEPLOYMENT INSTRUCTIONS:');
console.log('1. Go to https://railway.app');
console.log('2. Sign up/Login with GitHub');
console.log('3. Click "Start a New Project"');
console.log('4. Choose "Deploy from GitHub repo"');
console.log('5. Select your Gorbagana repository');
console.log('6. Choose the "backend" folder as root directory');
console.log('7. Add environment variables:');
console.log('   - MONGODB_URI: (your MongoDB Atlas connection string)');
console.log('   - PORT: 3001');
console.log('   - NODE_ENV: production');
console.log('   - CORS_ORIGINS: https://gorbagana-trash-tac-toe.netlify.app');
console.log('8. Deploy!');

console.log('\n🎨 RENDER DEPLOYMENT INSTRUCTIONS:');
console.log('1. Go to https://render.com');
console.log('2. Sign up/Login with GitHub');
console.log('3. Click "New +" → "Web Service"');
console.log('4. Connect your Gorbagana repository');
console.log('5. Configure:');
console.log('   - Root Directory: backend');
console.log('   - Build Command: npm install');
console.log('   - Start Command: npm start');
console.log('6. Add environment variables (same as Railway)');
console.log('7. Deploy!');

console.log('\n📋 Environment Variables Needed:');
console.log('MONGODB_URI=mongodb+srv://jgrantrichards:7cvB2WZ9JznqGzx6@cluster0.cawkklo.mongodb.net/gorbagana-trash-tac-toe?retryWrites=true&w=majority&appName=Cluster0');
console.log('PORT=3001');
console.log('NODE_ENV=production');
console.log('CORS_ORIGINS=https://gorbagana-trash-tac-toe.netlify.app');

console.log('\n✅ Backend ready for deployment!');
console.log('🌐 Your backend will be available at: https://[your-app-name].railway.app or https://[your-app-name].onrender.com');
console.log('\n📝 After deployment, update frontend/.env.local with your backend URL!'); 