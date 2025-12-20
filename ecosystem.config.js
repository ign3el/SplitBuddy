// PM2 Ecosystem Configuration for Production VPS Deployment
// Usage: pm2 start ecosystem.config.js --env production

module.exports = {
  apps: [
    {
      name: 'splitbuddy-backend',
      script: './server/index.js',
      cwd: './',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3003,
      },
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_file: './logs/pm2-combined.log',
      time: true,
      max_memory_restart: '500M',
      watch: false,
      ignore_watch: ['node_modules', 'logs', 'dist'],
      max_restarts: 10,
      min_uptime: '10s',
      autorestart: true,
      // Grace period for shutdown
      kill_timeout: 5000,
    },
  ],
  // Deploy configuration for VPS
  deploy: {
    production: {
      user: 'deploy',
      host: 'your_vps_host',
      key: '~/.ssh/id_rsa',
      ref: 'origin/main',
      repo: 'git@github.com:yourusername/SplitBuddy.git',
      path: '/var/www/splitbuddy',
      'post-deploy':
        'npm install && npm run build && pm2 reload ecosystem.config.js --env production',
      'pre-deploy-local': 'echo "Deploying to production"',
    },
  },
};
