module.exports = {
  apps: [
    {
      name: "ai-tshirt-frontend",
      script: "npm",
      args: "run dev",
      cwd: "/home/ubuntu/auto-tshirt-designer1",
      env: {
        PORT: 3000
      }
    },
    {
      name: "ai-tshirt-server",
      script: "./venv/bin/python",
      args: ["server/main.py"],
      cwd: "/home/ubuntu/auto-tshirt-designer1",
      env: {
        PORT: 8000,
        HOST: "0.0.0.0",
        PYTHONPATH: "/home/ubuntu/auto-tshirt-designer1"
      }
    }
  ]
}