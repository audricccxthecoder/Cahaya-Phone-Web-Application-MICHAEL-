# 🚀 Deployment Guide: Railway.app

This guide explains how to deploy the Cahaya Phone CRM application to Railway.app.

## Prerequisites

- Railway account (railway.app)
- GitHub account with the repository pushed
- MySQL database (Railway provides this)
- Environment variables configured

## Step 1: Create Railway Project

1. Go to [railway.app](https://railway.app)
2. Sign in with GitHub
3. Click "New Project"
4. Choose "Deploy from GitHub repo"
5. Select your `cahaya-phone` repository

## Step 2: Add MySQL Database Service

1. In Railway dashboard, click "New Service"
2. Select "MySQL"
3. Configure:
   - **Database Name**: `cahaya_phone_crm`
   - **Username**: (auto-generated)
   - **Password**: (auto-generated)
   - **Port**: 3306

Railway will provide a `DATABASE_URL` environment variable automatically.

## Step 3: Configure Environment Variables

In Railway Dashboard → Your Project → Variables:

```
# Database (Railway provides DATABASE_URL automatically)
DB_HOST=${{MySQL.RAILWAY_PRIVATE_URL}}
DB_PORT=3306
DB_USER=${{MySQL.MYSQL_USER}}
DB_PASSWORD=${{MySQL.MYSQL_PASSWORD}}
DB_NAME=cahaya_phone_crm

# Server
PORT=5000
NODE_ENV=production

# CORS & Frontend URLs - IMPORTANT: Update these to your Railway domain
ALLOWED_ORIGINS=https://yourdomain.up.railway.app,https://www.yourdomain.com
FRONTEND_URL=https://yourdomain.up.railway.app

# WhatsApp API
WHATSAPP_API_URL=https://api.fonnte.com/send
WHATSAPP_API_KEY=your_whatsapp_api_key
WHATSAPP_PHONE=628xxxxx

# Mail (Optional)
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=your_email@gmail.com
MAIL_PASS=your_app_password
MAIL_FROM=noreply@cahaya-phone.com

# JWT Secret (Generate a secure random string)
JWT_SECRET=generate_a_random_secure_string_here

# Status expiry
STATUS_EXPIRE_HOURS=24
STATUS_OLD_LABEL=Old
```

**Important Notes:**
- Railway automatically assigns `DATABASE_URL` - the code is already configured to use it
- Replace domain names with your Railway domain or custom domain
- Keep `NODE_ENV=production` for production deployment
- Generate a strong `JWT_SECRET` value

## Step 4: Database Schema Setup

After deploying, you need to initialize the database:

### Option A: Using Railway CLI (Recommended)

1. Install Railway CLI:
   ```bash
   npm install -g @railway/cli
   ```

2. Login to Railway:
   ```bash
   railway login
   ```

3. Link your project:
   ```bash
   railway link
   ```

4. Import the database schema:
   ```bash
   railway run mysql -h ${{MySQL.RAILWAY_PRIVATE_URL}} -u ${{MySQL.MYSQL_USER}} -p${{MySQL.MYSQL_PASSWORD}} cahaya_phone_crm < database.sql
   ```

### Option B: Manual Import via MySQL Client

1. Get MySQL connection details from Railway dashboard
2. Connect using MySQL client:
   ```bash
   mysql -h [RAILWAY_MYSQL_HOST] -u [USER] -p[PASSWORD] [DATABASE] < database.sql
   ```

3. Or use phpMyAdmin if available in Railway MySQL service

### Option C: Use Backend Script

1. Access Railway shell and run:
   ```bash
   node backend/scripts/create_admin_reset_tables.js
   ```

This will create all necessary tables and set default admin credentials.

## Step 5: Verify Deployment

1. Check Railway logs: Dashboard → Your Service → Logs
2. Test the API endpoint: `https://yourdomain.up.railway.app/api`
3. Verify admin login: `https://yourdomain.up.railway.app/admin/`

Expected response from health check:
```json
{
  "success": true,
  "message": "Cahaya Phone CRM API is running",
  "version": "1.0.0"
}
```

## Step 6: Update Frontend URLs

Update the following files to point to your Railway domain:

### `customer/script.js`
```javascript
const API_URL = 'https://yourdomain.up.railway.app/api';
```

### `admin/admin.js`
```javascript
const API_URL = 'https://yourdomain.up.railway.app/api';
```

Or use window.location to make it dynamic:
```javascript
const API_URL = `${window.location.origin}/api`;
```

## Step 7: Custom Domain (Optional)

1. In Railway dashboard, go to Settings
2. Click "Domains"
3. Add your custom domain
4. Configure DNS records as instructed

## Troubleshooting

### Database Connection Errors
- Verify `DATABASE_URL` or individual DB environment variables are set
- Check MySQL service is running in Railway
- Ensure database schema is imported

### CORS Errors
- Update `ALLOWED_ORIGINS` to include your domain
- Ensure frontend is served from the same domain or whitelisted

### Port Issues
- Railway automatically assigns a port, ensure `PORT` env var is set to `5000` or flexible
- The server reads from `process.env.PORT`

### Environment Variables Not Loaded
- Railway variables are available as `${{ServiceName.VARIABLE}}`
- Restart the deployment after changing variables

## Advanced: Using Railway CLI for Local Testing

```bash
# Link to Railway project
railway link

# Run locally with Railway environment variables
railway run npm start

# View logs
railway logs -f
```

## Key Changes Made for Railway

The code was already mostly compatible with Railway. Key considerations:

1. **Database Connection**: Uses environment variables (already configured)
2. **PORT Configuration**: Reads from `process.env.PORT` (already configured)
3. **CORS Handling**: Environment-aware CORS settings (already configured)
4. **Static Files**: Both customer and admin directories are served (already configured)
5. **Graceful Shutdown**: Handles SIGTERM signals (already configured)

## Production Checklist

- [ ] Environment variables configured in Railway
- [ ] Database schema imported
- [ ] Default admin account created/reset
- [ ] FRONTEND_URL and ALLOWED_ORIGINS updated
- [ ] JWT_SECRET set to a strong value
- [ ] WHATSAPP_API_KEY configured
- [ ] MAIL settings configured (if needed)
- [ ] Frontend files updated with correct API URL
- [ ] Tested API endpoints
- [ ] Tested admin login
- [ ] Tested form submission
- [ ] Tested WebHook endpoints
- [ ] Monitored logs for errors

## Support & Documentation

- Railway Docs: https://docs.railway.app
- Express.js: https://expressjs.com
- MySQL: https://dev.mysql.com
