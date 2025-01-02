module.exports = {
  apps: [
    {
      name: 'pooldegens-frontend',
      script: './frontend/server.js',
      env_production: {
        NODE_ENV: 'production',
        PORT: 3003
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
        PORT: 5006
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
      user: 'ubuntu',
      host: 'admin.pooldegens.com',
      ref: 'origin/main',
      repo: 'git@github.com:your-repo/pooldegens.git',
      path: '/var/www/pooldegens',
      'post-deploy': 'cd frontend && npm install && npm run build && cd ../backend && npm install && pm2 reload ecosystem.config.js --env production'
    }
  }
};
