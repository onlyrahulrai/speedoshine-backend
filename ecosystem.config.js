module.exports = {
  apps: [
    {
      name: "digitaldetoxification",
      script: "src/server.ts",
      interpreter: "node",
      interpreter_args: "-r ts-node/register",
      watch: true,       // optional for development
      env: {
        NODE_ENV: "development",
      },
      env_production: {
        NODE_ENV: "production",
      },
    },
  ],
};
