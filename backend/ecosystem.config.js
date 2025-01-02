module.exports = {
  apps: [
    {
      name: 'pooldegens-backend',
      script: './server.js',
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
  ]
};
