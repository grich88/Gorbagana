const fetch = require('node-fetch');

const PRODUCTION_API = 'https://gorbagana-trash-tac-toe-backend.onrender.com';

async function cleanupProductionDatabase() {
  console.log('🧹 Cleaning up PRODUCTION database...\n');

  try {
    const response = await fetch(`${PRODUCTION_API}/api/admin/cleanup-all`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        adminKey: 'cleanup-trash-tac-toe-2025'
      })
    });

    if (response.ok) {
      const data = await response.json();
      console.log(`✅ Production database cleaned: ${data.message}`);
      console.log('🎉 Public lobby will now start fresh!');
    } else {
      console.log(`❌ Failed to clean production database: ${response.status}`);
      console.log('⚠️ Will clean after backend deployment');
    }
  } catch (error) {
    console.error('❌ Production cleanup failed:', error.message);
    console.log('⚠️ Will clean after backend deployment');
  }
}

cleanupProductionDatabase(); 