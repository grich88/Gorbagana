# MongoDB Atlas Setup Guide for Gorbagana Trash Tac Toe

## 🌍 **Why MongoDB Atlas?**

Your current file-based database won't work on Netlify (serverless). You need a cloud database for cross-device multiplayer games.

**MongoDB Atlas provides:**
- ✅ Free tier (512MB storage)
- ✅ Real-time cross-device synchronization  
- ✅ Automatic scaling
- ✅ Built-in security
- ✅ Works with Netlify/Vercel/any hosting

---

## 📋 **Step 1: Create MongoDB Atlas Account**

1. **Visit** → https://cloud.mongodb.com/
2. **Click** → "Try Free" 
3. **Fill out the form:**
   - Email: Your email
   - Password: Strong password
   - Check "I agree to the Terms of Service"
4. **Click** → "Create your Atlas account"
5. **Verify email** → Check your inbox and click verification link

---

## 🎯 **Step 2: Complete Welcome Survey**

After email verification, you'll see a welcome form:

1. **Goal** → "Learn MongoDB"
2. **Experience** → "Less than a year" 
3. **Primary Language** → "JavaScript"
4. **Data types** → "Not sure/None"
5. **Architecture** → "Not sure/None"
6. **Click** → "Finish"

---

## 🚀 **Step 3: Create Your First Cluster**

1. **Click** → "+ Create" button (green button)
2. **Select** → "M0 FREE" (should be pre-selected)
3. **Provider** → "AWS" 
4. **Region** → Choose closest to your location
5. **Cluster Name** → Leave default or use "gorbagana-games"
6. **Click** → "Create Deployment" (green button)

⏱️ **Wait 1-3 minutes** for cluster creation.

---

## 🔐 **Step 4: Create Database User**

1. **Navigate** → Security → "Database Access" (left sidebar)
2. **Click** → "Add New Database User"
3. **Fill out:**
   - **Authentication Method** → "Password"
   - **Username** → `gorbagana_user` (remember this!)
   - **Password** → Generate secure password (remember this!)
   - **Database User Privileges** → "Atlas admin"
4. **Click** → "Add User"

> ⚠️ **IMPORTANT**: Save your username and password somewhere safe!

---

## 🌐 **Step 5: Allow Network Access**

1. **Navigate** → Security → "Network Access" (left sidebar)
2. **Click** → "Add IP Address"
3. **Click** → "Allow Access From Anywhere" 
   - This sets IP to `0.0.0.0/0`
   - Required for serverless hosting (Netlify/Vercel)
4. **Click** → "Confirm"

---

## 📁 **Step 6: Create Database and Collection**

1. **Navigate** → "Database" → "Browse Collections"
2. **Click** → "Add My Own Data"
3. **Create Database:**
   - **Database name** → `gorbagana-trash-tac-toe`
   - **Collection name** → `games`
4. **Click** → "Create"

---

## 🔗 **Step 7: Get Connection String**

1. **Navigate** → "Database" → "Connect" 
2. **Click** → "Drivers"
3. **Select** → "Node.js" and version "4.1 or later"
4. **Copy** the connection string - looks like:
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```

---

## ⚙️ **Step 8: Configure Your Project**

### **Create Environment File**

Create `backend/.env` file:

```bash
# MongoDB Atlas Configuration
MONGODB_URI=mongodb+srv://gorbagana_user:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/gorbagana-trash-tac-toe?retryWrites=true&w=majority

# Server Configuration  
PORT=3001
NODE_ENV=development

# CORS Origins (add your Netlify URL when you deploy)
CORS_ORIGINS=http://localhost:3000,https://your-app.netlify.app
```

### **Replace placeholders:**
1. Replace `YOUR_PASSWORD` with your actual database password
2. Replace `cluster0.xxxxx.mongodb.net` with your actual cluster URL
3. Add your database name: `gorbagana-trash-tac-toe`

### **Example final connection string:**
```
mongodb+srv://gorbagana_user:MySecurePass123@cluster0.abc12.mongodb.net/gorbagana-trash-tac-toe?retryWrites=true&w=majority
```

---

## 🧪 **Step 9: Test Connection**

Restart your development server:

```bash
cd backend
npm install  # Install new dependencies if needed
cd ..
npm run dev  # Start both frontend and backend
```

**Look for these success messages:**
```
🌍 MongoDB connected - using cloud database
📊 MongoDB contains 0 games
🗄️ Database mode: mongodb
```

If you see `🗄️ Database mode: file`, something is wrong with your connection string.

---

## 🎮 **Step 10: Test Cross-Device Games**

1. **Open app** → http://localhost:3000
2. **Connect wallet** → Use Backpack wallet
3. **Click** → "🔥 Force Backend Test" button
4. **Look for success messages:**
   ```
   ✅ Backend save test successful!
   ✅ Backend load test successful!
   ```
5. **Create a real game** → Should show "☁️ Game saved to backend database"

---

## 🚀 **For Production Deployment**

When deploying to Netlify/Vercel:

1. **Add environment variables** in your hosting platform
2. **Update CORS_ORIGINS** with your production URL:
   ```
   CORS_ORIGINS=http://localhost:3000,https://your-app.netlify.app
   ```

---

## 🔧 **Troubleshooting**

### **"Authentication failed"**
- Check username/password in connection string
- Verify database user exists in Atlas

### **"Connection timeout"** 
- Check Network Access allows `0.0.0.0/0`
- Verify cluster is running (not paused)

### **"Database mode: file"**
- Check `.env` file exists in `backend/` folder
- Verify `MONGODB_URI` variable name is correct
- Restart development server

### **"Unauthorized to access database"**
- User needs "Atlas admin" privileges
- Check database name in connection string

---

## 📊 **Monitor Your Database**

**Atlas Dashboard** → https://cloud.mongodb.com/
- **View data** → Database → Browse Collections
- **Monitor usage** → Database → Metrics
- **Check logs** → Database → Real-time Performance Panel

**Your database will show:**
- Collection: `games`
- Documents: Your game data
- Real-time updates as players make moves

---

## 💰 **Pricing (Free Tier)**

**M0 Free Cluster includes:**
- ✅ 512 MB storage
- ✅ Shared RAM and vCPU  
- ✅ Hosted on AWS, Azure, or Google Cloud
- ✅ Basic support

**Perfect for:**
- Development and prototyping
- Small applications
- Learning MongoDB

**Upgrade when needed:**
- M2 ($9/month) - 2GB storage
- M5 ($25/month) - 5GB storage

---

🎉 **You're ready for cross-device multiplayer gaming!**

Games will now sync in real-time across all devices and persist forever. 