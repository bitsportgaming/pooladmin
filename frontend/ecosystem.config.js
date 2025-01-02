module.exports = {
  apps: [
    {
      name: 'pooldegens-frontend',
      script: './server.js',
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
    }
  ]
};
