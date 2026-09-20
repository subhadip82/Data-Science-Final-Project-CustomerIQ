"""Launcher script to run both backend (FastAPI) and frontend (Next.js) concurrently."""
import os
import subprocess
import sys
import time

# Ensure UTF-8 output encoding on Windows consoles
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

def main():
    root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    backend_dir = os.path.join(root_dir, "backend")
    frontend_dir = os.path.join(root_dir, "frontend")

    python_exe = sys.executable

    print("=" * 60)
    print("Starting CustomerIQ Platform (Backend + Frontend)")
    print("=" * 60)

    # Launch Backend
    print("Starting FastAPI Backend on http://localhost:8000 ...")
    backend_cmd = [
        python_exe, "-m", "uvicorn", "app.main:app",
        "--host", "0.0.0.0",
        "--port", "8000"
    ]
    backend_proc = subprocess.Popen(
        backend_cmd,
        cwd=backend_dir,
        env=os.environ.copy()
    )

    # Launch Frontend
    print("Starting Next.js Frontend on http://localhost:3000 ...")
    npm_cmd = "npm.cmd" if os.name == "nt" else "npm"
    frontend_proc = subprocess.Popen(
        [npm_cmd, "run", "dev"],
        cwd=frontend_dir,
        env=os.environ.copy()
    )

    print("\nCustomerIQ is running!")
    print("-> Frontend: http://localhost:3000")
    print("-> Backend API docs: http://localhost:8000/api/docs")
    print("-> Backend Health: http://localhost:8000/health\n")
    print("Press Ctrl+C to stop both servers.\n")

    try:
        while True:
            time.sleep(1)
            b_ret = backend_proc.poll()
            f_ret = frontend_proc.poll()
            if b_ret is not None:
                print(f"Backend exited with code {b_ret}")
                break
            if f_ret is not None:
                print(f"Frontend exited with code {f_ret}")
                break
    except KeyboardInterrupt:
        print("\nStopping servers...")
    finally:
        for proc in [backend_proc, frontend_proc]:
            try:
                proc.terminate()
                proc.wait(timeout=3)
            except Exception:
                proc.kill()
        print("Servers stopped cleanly.")

if __name__ == "__main__":
    main()
