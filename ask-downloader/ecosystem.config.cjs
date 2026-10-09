/**
 * PM2 Process Configuration for Hostinger VPS & Cloud Servers
 */
module.exports = {
  apps: [
    {
      name: 'fb-video-downloader',
      script: './dist/server.cjs',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_file: './logs/combined.log',
      time: true,
    },
  ],
};
