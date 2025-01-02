module.exports = {
  apps: [
    {
      name: 'pooldegens-frontend',
      script: './frontend/server.js',
      env_production: {
        NODE_ENV: 'production',
        PORT: 3003,
        VITE_API_URL: 'https://admin.pooldegens.com/api'
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'development'
      }
    },
    {
      name: 'pooldegens-backend',
      script: './backend/server.js',
      env_production: {
        NODE_ENV: 'production',
        PORT: 5006,
        MONGODB_URI: 'mongodb://127.0.0.1:27017/pool_degen',
        CORS_ORIGIN: 'https://admin.pooldegens.com'
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'development'
      }
    }
  ],

  deploy: {
    production: {
      user: 'pooladmin',
      host: 'admin.pooldegens.com',
      ref: 'origin/main',
      repo: 'git@github.com:your-repo/pooldegens.git',
      path: '/home/pooladmin/pooldegens',
      'post-deploy': 'cd frontend && npm install && npm run build && cd ../backend && npm install && pm2 reload ecosystem.config.js --env production'
    }
  }
};
