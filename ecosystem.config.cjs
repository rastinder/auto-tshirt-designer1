module.exports = {
  apps: [
    {
      name: "frontend",
      script: "npm",
      args: "run preview",
      env: {
        NODE_ENV: "production",
        PORT: "3000",
        HOST: "0.0.0.0"
      },
      max_memory_restart: '500M'
    },
    {
      name: "backend",
      script: "./venv/bin/python",
      args: ["-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"],
      cwd: "./server",
      interpreter: null,
      env: {
        PYTHONPATH: "./server:.",
        PYTHONUNBUFFERED: "1",
        CORS_ORIGINS: "http://localhost:3000,http://localhost:5173,*"
      },
      max_memory_restart: '1G'
    }
  ]
};