# Pool Degens Admin Dashboard

Admin dashboard for managing Pool Degens user scores and referrals.

## Production Deployment Guide

### Important: Existing Database

This application has an existing MongoDB database with user data that must be preserved. The database contains:
- User scores and weekly scores
- Referral relationships and codes
- User statistics and historical data

### Prerequisites

- Node.js >= 16.0.0
- MongoDB >= 4.4
- PM2 (for process management)
- Nginx (for reverse proxy)

### Initial Server Setup

1. Install Node.js and npm:
```bash
curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash -
sudo apt-get install -y nodejs
```

2. Install PM2 globally:
```bash
npm install -g pm2
```

3. Install Nginx:
```bash
sudo apt install nginx
```

### Application Deployment

1. Clone the repository:
```bash
git clone https://github.com/your-repo/pooldegens.git
cd pooldegens
```

2. Install dependencies and build:
```bash
# Frontend setup
cd frontend
npm install
npm run build

# Backend setup
cd ../backend
npm install
```

3. Configure environment files:

Backend (.env.production):
```env
PORT=5006
MONGODB_URI=mongodb://localhost:27017/pool_degen
NODE_ENV=production
CORS_ORIGIN=https://admin.pooldegens.com
SESSION_SECRET=your-strong-session-secret-here
```

Frontend (.env.production):
```env
VITE_API_URL=https://admin.pooldegens.com/api
```

4. Start application with PM2:
```bash
# From project root
pm2 start ecosystem.config.js --env production
```

5. Save PM2 process list and configure startup:
```bash
pm2 save
pm2 startup
```

### Nginx Configuration

1. Create Nginx configuration:
```bash
sudo nano /etc/nginx/sites-available/admin.pooldegens.com
```

2. Add the configuration:
```nginx
server {
    listen 80;
    server_name admin.pooldegens.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name admin.pooldegens.com;

    ssl_certificate /path/to/your/fullchain.pem;
    ssl_certificate_key /path/to/your/privkey.pem;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Frontend proxy
    location / {
        proxy_pass http://localhost:3003;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API proxy
    location /api {
        proxy_pass http://localhost:5006;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

3. Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/admin.pooldegens.com /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### SSL Configuration

1. Install Certbot:
```bash
sudo apt install certbot python3-certbot-nginx
```

2. Get SSL certificate:
```bash
sudo certbot --nginx -d admin.pooldegens.com
```

### Database Backup

1. Create backup directory:
```bash
sudo mkdir -p /backup/mongodb
```

2. Backup existing data:
```bash
mongodump --db pool_degen --out /backup/mongodb/pre_production
```

3. Set up daily backups:
```bash
sudo nano /etc/cron.daily/backup-pooldegens
```

Add:
```bash
#!/bin/bash
BACKUP_DIR="/backup/mongodb/$(date +%Y%m%d)"
mongodump --db pool_degen --out "$BACKUP_DIR"
find /backup/mongodb -mtime +7 -type d -exec rm -rf {} +
```

Make executable:
```bash
sudo chmod +x /etc/cron.daily/backup-pooldegens
```

### Monitoring

1. Monitor PM2 processes:
```bash
pm2 monit
pm2 logs
```

2. View application logs:
```bash
# Frontend logs
pm2 logs pooldegens-frontend

# Backend logs
pm2 logs pooldegens-backend
```

3. Monitor system resources:
```bash
htop
```

### Updating the Application

1. Pull latest changes:
```bash
cd /path/to/pooldegens
git pull origin main
```

2. Rebuild and restart:
```bash
# Frontend
cd frontend
npm install
npm run build

# Backend
cd ../backend
npm install

# Restart PM2 processes
pm2 reload ecosystem.config.js --env production
```

### Rollback Procedure

1. Stop current processes:
```bash
pm2 stop all
```

2. Restore from backup:
```bash
# Restore code from backup
cd /path/to/backup/version
pm2 start ecosystem.config.js --env production

# Restore database if needed
mongorestore --db pool_degen --drop /backup/mongodb/pre_production/pool_degen
```

### Health Checks

1. Check frontend:
```bash
curl -I https://admin.pooldegens.com
```

2. Check backend:
```bash
curl -I https://admin.pooldegens.com/api/user_scores/count
```

3. Check PM2 status:
```bash
pm2 status
```

## Support

For any deployment issues or data concerns, contact the development team immediately.

Note: Always test changes in a staging environment first to ensure existing user data is not affected.
