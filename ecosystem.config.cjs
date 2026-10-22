module.exports = {
  apps: [
    {
      name: "focusup",
      cwd: "/var/www/focusup",
      script: "node",
      args: "--env-file=.env.local ./node_modules/next/dist/bin/next start -H 127.0.0.1 -p 3003",
      env: {
        NODE_ENV: "production",
        PORT: "3003",
      },
    },
  ],
};
