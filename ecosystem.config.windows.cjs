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
      script: process.platform === "win32" ? "python" : "./venv/bin/python",
      args: ["-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload", "--log-level", "debug"],
      cwd: "./server",
      env: {
        PYTHONPATH: ".",
        PYTHONUNBUFFERED: "1"
      },
      max_memory_restart: '1G',
      interpreter: null
    }
  ]
};
