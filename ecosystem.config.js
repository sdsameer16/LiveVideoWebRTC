module.exports = {
  apps: [
    {
      name: 'livevideo-server',
      script: 'server/index.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 4000
      },
      error_file: './logs/server-err.log',
      out_file: './logs/server-out.log',
      log_file: './logs/server-combined.log',
      time: true
    },
    {
      name: 'caretaker-app',
      script: 'npm',
      args: 'run serve',
      cwd: 'Caretaker',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      error_file: './logs/caretaker-err.log',
      out_file: './logs/caretaker-out.log',
      log_file: './logs/caretaker-combined.log',
      time: true
    },
    {
      name: 'parent-app',
      script: 'npm',
      args: 'run serve',
      cwd: 'parent',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: 3002
      },
      error_file: './logs/parent-err.log',
      out_file: './logs/parent-out.log',
      log_file: './logs/parent-combined.log',
      time: true
    }
  ]
};
