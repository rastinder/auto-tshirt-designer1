module.exports = {
  apps: [
    {
      name: "ai-tshirt-frontend",
      script: "npm",
      args: "start",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
        HOST: "0.0.0.0"
      },
      max_memory_restart: '500M'
    },
    {
      name: "ai-tshirt-server",
      script: "./venv/bin/python",
      args: ["server/main.py"],
      interpreter: null,
      env: {
        PORT: "8000",
        HOST: "0.0.0.0",
        PYTHONPATH: ".",
        PYTHONUNBUFFERED: "1"
      },
      max_memory_restart: '1G'
    }
  ]
};