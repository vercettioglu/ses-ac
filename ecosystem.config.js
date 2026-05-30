// PM2 süreç tanımı — Susma (VPS).
// Yalnızca 127.0.0.1:3005'e bağlanır; dışa nginx üzerinden açılır.
module.exports = {
  apps: [
    {
      name: 'susma',
      cwd: '/opt/susma',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -H 127.0.0.1 -p 3005',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
      },
      max_memory_restart: '600M',
      time: true,
    },
  ],
};
