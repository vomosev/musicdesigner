module.exports = {
  apps: [
    {
      name: 'musicdesigner',
      script: 'node_modules/.bin/next',
      args: 'start',
      cwd: '/home/arx-app/backends/musicdesigner',
      env: {
        NODE_ENV: 'production',
        PORT: 5095,
      },
    },
  ],
};