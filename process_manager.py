import tkinter as tk
from tkinter import ttk, scrolledtext
import subprocess
import sys
import threading
import queue
import os
from datetime import datetime

class ProcessManager:
    def __init__(self, root):
        self.root = root
        self.root.title("AI T-Shirt Generator Process Manager")
        self.processes = {}
        self.output_queue = queue.Queue()
        
        # Configure main window
        self.root.geometry("800x600")
        self.create_widgets()
        self.setup_output_handling()

    def create_widgets(self):
        # Control buttons
        btn_frame = ttk.Frame(self.root)
        btn_frame.pack(pady=10, padx=10, fill="x")

        ttk.Button(btn_frame, text="Start All", command=self.start_all).pack(side="left", padx=5)
        ttk.Button(btn_frame, text="Stop All", command=self.stop_all).pack(side="left", padx=5)

        # Individual process controls
        processes_frame = ttk.LabelFrame(self.root, text="Processes", padding=10)
        processes_frame.pack(pady=5, padx=10, fill="x")

        # Website control
        website_frame = ttk.Frame(processes_frame)
        website_frame.pack(fill="x", pady=5)
        ttk.Label(website_frame, text="Website (Port 80)").pack(side="left")
        ttk.Button(website_frame, text="Start", command=lambda: self.start_process("website")).pack(side="right", padx=5)
        ttk.Button(website_frame, text="Stop", command=lambda: self.stop_process("website")).pack(side="right", padx=5)

        # Server control
        server_frame = ttk.Frame(processes_frame)
        server_frame.pack(fill="x", pady=5)
        ttk.Label(server_frame, text="Server (Port 8000)").pack(side="left")
        ttk.Button(server_frame, text="Start", command=lambda: self.start_process("server")).pack(side="right", padx=5)
        ttk.Button(server_frame, text="Stop", command=lambda: self.stop_process("server")).pack(side="right", padx=5)

        # Worker control
        worker_frame = ttk.Frame(processes_frame)
        worker_frame.pack(fill="x", pady=5)
        ttk.Label(worker_frame, text="Worker").pack(side="left")
        ttk.Button(worker_frame, text="Start", command=lambda: self.start_process("worker")).pack(side="right", padx=5)
        ttk.Button(worker_frame, text="Stop", command=lambda: self.stop_process("worker")).pack(side="right", padx=5)

        # Output console
        console_frame = ttk.LabelFrame(self.root, text="Output Console", padding=10)
        console_frame.pack(pady=5, padx=10, fill="both", expand=True)

        self.console = scrolledtext.ScrolledText(console_frame, wrap=tk.WORD, height=20)
        self.console.pack(fill="both", expand=True)
        self.console.config(state="disabled")

    def setup_output_handling(self):
        def update_console():
            while True:
                try:
                    message = self.output_queue.get_nowait()
                    self.console.config(state="normal")
                    self.console.insert(tk.END, message + "\n")
                    self.console.see(tk.END)
                    self.console.config(state="disabled")
                except queue.Empty:
                    break
            self.root.after(100, update_console)
        
        self.root.after(100, update_console)

    def log_message(self, message):
        timestamp = datetime.now().strftime("%H:%M:%S")
        self.output_queue.put(f"[{timestamp}] {message}")

    def start_process(self, process_name):
        if process_name in self.processes and self.processes[process_name].poll() is None:
            self.log_message(f"{process_name} is already running")
            return

        try:
            if process_name == "website":
                cmd = ["npm", "run", "dev"]
            elif process_name == "server":
                cmd = ["python", "server/main.py"]
            elif process_name == "worker":
                cmd = ["python", "worker/main.py"]
            
            process = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                bufsize=1,
                universal_newlines=True
            )
            
            self.processes[process_name] = process
            self.log_message(f"Started {process_name}")

            # Start output monitoring threads
            threading.Thread(target=self.monitor_output, 
                           args=(process.stdout, f"{process_name} [OUT]"), 
                           daemon=True).start()
            threading.Thread(target=self.monitor_output, 
                           args=(process.stderr, f"{process_name} [ERR]"), 
                           daemon=True).start()

        except Exception as e:
            self.log_message(f"Error starting {process_name}: {str(e)}")

    def stop_process(self, process_name):
        if process_name in self.processes:
            process = self.processes[process_name]
            if process.poll() is None:
                process.terminate()
                self.log_message(f"Stopped {process_name}")
            del self.processes[process_name]
        else:
            self.log_message(f"{process_name} is not running")

    def start_all(self):
        for process in ["website", "server", "worker"]:
            self.start_process(process)

    def stop_all(self):
        for process in list(self.processes.keys()):
            self.stop_process(process)

    def monitor_output(self, pipe, prefix):
        for line in pipe:
            self.log_message(f"{prefix}: {line.strip()}")

    def cleanup(self):
        self.stop_all()
        self.root.quit()

def main():
    root = tk.Tk()
    app = ProcessManager(root)
    root.protocol("WM_DELETE_WINDOW", app.cleanup)
    root.mainloop()

if __name__ == "__main__":
    main()