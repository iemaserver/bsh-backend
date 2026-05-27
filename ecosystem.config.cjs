// PM2 process manager config. Uses .cjs extension because package.json
// has "type": "module" and PM2 loads this file with CommonJS require().
module.exports = {
  apps: [
    {
      name: 'iem-bsh-api',
      script: 'src/server.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
      },
      error_file: '/var/log/iem-bsh/error.log',
      out_file: '/var/log/iem-bsh/out.log',
      merge_logs: true,
      time: true,
      max_memory_restart: '500M',
    },
  ],
};
