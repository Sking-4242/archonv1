"""
Archon Setup — one-click installer GUI
Run with:  python install.py
Requires Python 3.11+ and Docker with the Compose plugin.
"""

import os
import queue
import subprocess
import threading
import tkinter as tk
from pathlib import Path
from tkinter import scrolledtext

# ── Windows HiDPI fix (must happen before Tk() is created) ────────────────────
try:
    from ctypes import windll
    windll.shcore.SetProcessDpiAwareness(1)
except Exception:
    pass

ROOT     = Path(__file__).parent.resolve()
ENV_FILE = ROOT / ".env"

# ── Colour palette ─────────────────────────────────────────────────────────────
BG          = "#f4f6fb"
PANEL_BG    = "#ffffff"
BORDER      = "#dde3ee"
TEXT        = "#1a1f36"
SUBTEXT     = "#5c6b8a"
INPUT_BG    = "#f1f4fb"
LOG_BG      = "#0d1117"
LOG_FG      = "#8b949e"

PRO_ACCENT  = "#2563eb"
PRO_DIM     = "#1d4ed8"
PRO_CHIP    = "#eff6ff"
PRO_CHIP_FG = "#1e40af"

ACE_ACCENT  = "#7c3aed"
ACE_DIM     = "#6d28d9"
ACE_CHIP    = "#f5f3ff"
ACE_CHIP_FG = "#4c1d95"

SUCCESS     = "#059669"
ERROR       = "#dc2626"


class ArchonInstaller(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("Archon Setup")
        self.configure(bg=BG)
        self.resizable(True, True)   # allow resize so it fits any screen

        self._log_queue = queue.Queue()
        self._running   = False
        self._installed = False

        self._build_ui()
        self._load_existing_env()
        self._poll_log_queue()

        self.update_idletasks()

        # Clamp window to 92 % of screen height so buttons are always visible
        sw = self.winfo_screenwidth()
        sh = self.winfo_screenheight()
        w  = self.winfo_width()
        h  = min(self.winfo_height(), int(sh * 0.92))
        x  = (sw - w) // 2
        y  = (sh - h) // 2
        self.geometry(f"{w}x{h}+{x}+{y}")
        self.minsize(w, 480)   # prevent collapsing too small

    # ── UI construction ────────────────────────────────────────────────────────

    def _build_ui(self):
        # ── Header ────────────────────────────────────────────────────────────
        hdr = tk.Frame(self, bg=BG)
        hdr.pack(fill="x", padx=28, pady=(26, 2))

        name_row = tk.Frame(hdr, bg=BG)
        name_row.pack(anchor="w")
        tk.Label(name_row, text="ARCHON", bg=BG, fg=TEXT,
                 font=("Helvetica", 28, "bold")).pack(side="left")
        tk.Label(name_row, text=" v0.5", bg=BG, fg=SUBTEXT,
                 font=("Helvetica", 13)).pack(side="left", pady=6)

        tk.Label(self,
                 text="AI-assisted cloud architecture design platform.",
                 bg=BG, fg=SUBTEXT,
                 font=("Helvetica", 11)).pack(anchor="w", padx=28, pady=(0, 18))

        # ── Product cards ──────────────────────────────────────────────────────
        cards_row = tk.Frame(self, bg=BG)
        cards_row.pack(fill="x", padx=28, pady=(0, 4))

        self._pro_card(cards_row)
        tk.Frame(cards_row, bg=BG, width=12).pack(side="left")
        self._ace_card(cards_row)

        # ── Config card ───────────────────────────────────────────────────────
        tk.Frame(self, bg=BORDER, height=1).pack(fill="x", padx=28, pady=(16, 0))

        tk.Label(self, text="Configuration", bg=BG, fg=TEXT,
                 font=("Helvetica", 12, "bold")).pack(
            anchor="w", padx=28, pady=(12, 6))

        card = tk.Frame(self, bg=PANEL_BG, relief="flat",
                        highlightbackground=BORDER, highlightthickness=1)
        card.pack(fill="x", padx=28)

        inner = tk.Frame(card, bg=PANEL_BG)
        inner.pack(fill="x", padx=20, pady=16)

        ports = tk.Frame(inner, bg=PANEL_BG)
        ports.pack(fill="x")
        for col, (label, var_name, default) in enumerate([
            ("Backend Port",        "_backend_port_var",  "8000"),
            ("Professional Port",   "_pro_port_var",      "3000"),
            ("Academy Port",        "_ace_port_var",      "3001"),
        ]):
            setattr(self, var_name, tk.StringVar(value=default))
            col_frame = tk.Frame(ports, bg=PANEL_BG)
            col_frame.pack(side="left", fill="x", expand=True,
                           padx=(0, 10) if col < 2 else 0)
            self._lbl(col_frame, label)
            self._entry(col_frame, getattr(self, var_name), width=10).pack(
                fill="x", ipady=5, pady=(3, 0))

        tk.Frame(inner, bg=BORDER, height=1).pack(fill="x", pady=14)

        self._lbl(inner, "Ollama Base URL  (local AI only)")
        self._ollama_url_var = tk.StringVar(
            value="http://host.docker.internal:11434")
        self._entry(inner, self._ollama_url_var).pack(
            fill="x", ipady=5, pady=(3, 0))

        note = tk.Frame(inner, bg="#eff6ff",
                        highlightbackground="#bfdbfe", highlightthickness=1)
        note.pack(fill="x", pady=(14, 0))
        tk.Label(note,
                 text="ℹ️  AI provider, model, and API key are configured\n"
                      "    inside the app once it's running.",
                 bg="#eff6ff", fg="#1e40af",
                 font=("Helvetica", 10), justify="left").pack(
            anchor="w", padx=10, pady=8)

        # ── Academy credentials ───────────────────────────────────────────────
        tk.Frame(self, bg=BORDER, height=1).pack(fill="x", padx=28, pady=(16, 0))

        tk.Label(self, text="Academy Credentials", bg=BG, fg=TEXT,
                 font=("Helvetica", 12, "bold")).pack(
            anchor="w", padx=28, pady=(12, 6))

        ace_cred = tk.Frame(self, bg=PANEL_BG, relief="flat",
                            highlightbackground=BORDER, highlightthickness=1)
        ace_cred.pack(fill="x", padx=28)

        ace_inner = tk.Frame(ace_cred, bg=PANEL_BG)
        ace_inner.pack(fill="x", padx=20, pady=16)

        # DB password row
        self._lbl(ace_inner, "Database Password  (PostgreSQL)")
        pw_row = tk.Frame(ace_inner, bg=PANEL_BG)
        pw_row.pack(fill="x", pady=(3, 0))
        self._pg_password_var = tk.StringVar(value="archon_dev")
        self._pw_entry = tk.Entry(
            pw_row, textvariable=self._pg_password_var,
            bg=INPUT_BG, fg=TEXT, insertbackground=TEXT,
            relief="flat", font=("Helvetica", 12), show="•",
            highlightbackground=BORDER, highlightthickness=1)
        self._pw_entry.pack(side="left", fill="x", expand=True, ipady=5)
        self._pw_show_var = tk.BooleanVar(value=False)
        tk.Checkbutton(
            pw_row, text="show", variable=self._pw_show_var,
            command=self._toggle_pw_visibility,
            bg=PANEL_BG, fg=SUBTEXT, activebackground=PANEL_BG,
            font=("Helvetica", 10), relief="flat",
            selectcolor=INPUT_BG, cursor="hand2").pack(
            side="left", padx=(8, 0))

        tk.Frame(ace_inner, bg=BORDER, height=1).pack(fill="x", pady=12)

        # JWT secret row
        self._lbl(ace_inner, "Academy Secret Key  (JWT signing)")
        sk_row = tk.Frame(ace_inner, bg=PANEL_BG)
        sk_row.pack(fill="x", pady=(3, 0))
        self._secret_key_var = tk.StringVar(value="")
        tk.Entry(
            sk_row, textvariable=self._secret_key_var,
            bg=INPUT_BG, fg=TEXT, insertbackground=TEXT,
            relief="flat", font=("Courier", 10),
            highlightbackground=BORDER, highlightthickness=1).pack(
            side="left", fill="x", expand=True, ipady=5)
        tk.Button(
            sk_row, text="Generate",
            command=self._generate_secret_key,
            bg=ACE_CHIP, fg=ACE_CHIP_FG,
            activebackground="#ede9fe", activeforeground=ACE_DIM,
            relief="flat", font=("Helvetica", 10),
            cursor="hand2", padx=10, pady=4,
            highlightbackground="#ddd6fe", highlightthickness=1).pack(
            side="left", padx=(8, 0))

        ace_note = tk.Frame(ace_inner, bg="#f5f3ff",
                            highlightbackground="#ddd6fe", highlightthickness=1)
        ace_note.pack(fill="x", pady=(12, 0))
        tk.Label(ace_note,
                 text="ℹ️  These are internal Docker credentials — never exposed\n"
                      "    to the browser. Click Generate to create a secure key.",
                 bg="#f5f3ff", fg="#4c1d95",
                 font=("Helvetica", 10), justify="left").pack(
            anchor="w", padx=10, pady=8)

        # ── Status ────────────────────────────────────────────────────────────
        self._status_var = tk.StringVar(value="Ready to install.")
        self._status_lbl = tk.Label(
            self, textvariable=self._status_var,
            bg=BG, fg=SUBTEXT, font=("Helvetica", 11), anchor="w")
        self._status_lbl.pack(fill="x", padx=28, pady=(16, 6))

        # ── Log window (expand to fill remaining space) ────────────────────────
        self._log = scrolledtext.ScrolledText(
            self, bg=LOG_BG, fg=LOG_FG,
            font=("Courier", 10), relief="flat",
            height=8, width=74, state="disabled", wrap="word")
        self._log.pack(fill="both", expand=True, padx=28, pady=(0, 8))
        self._log.tag_configure("ok",   foreground=SUCCESS)
        self._log.tag_configure("err",  foreground=ERROR)
        self._log.tag_configure("info", foreground="#818cf8")

        # ── Action bar ────────────────────────────────────────────────────────
        btn_row = tk.Frame(self, bg=BG)
        btn_row.pack(fill="x", padx=28, pady=(0, 20))

        self._install_btn = tk.Button(
            btn_row, text="Install & Launch  →",
            command=self._start_install,
            bg=TEXT, fg="white",
            activebackground="#334155", activeforeground="white",
            relief="flat", font=("Helvetica", 12, "bold"),
            cursor="hand2", padx=22, pady=9)
        self._install_btn.pack(side="left")

        self._pro_btn = tk.Button(
            btn_row, text="Open Professional",
            command=lambda: self._open_browser("pro"),
            bg=PRO_CHIP, fg=PRO_CHIP_FG,
            activebackground="#dbeafe", activeforeground=PRO_DIM,
            relief="flat", font=("Helvetica", 11),
            cursor="hand2", padx=14, pady=9,
            highlightbackground="#bfdbfe", highlightthickness=1)
        self._pro_btn.pack(side="left", padx=(10, 0))

        self._ace_btn = tk.Button(
            btn_row, text="Open Academy",
            command=lambda: self._open_browser("ace"),
            bg=ACE_CHIP, fg=ACE_CHIP_FG,
            activebackground="#ede9fe", activeforeground=ACE_DIM,
            relief="flat", font=("Helvetica", 11),
            cursor="hand2", padx=14, pady=9,
            highlightbackground="#ddd6fe", highlightthickness=1)
        self._ace_btn.pack(side="left", padx=(8, 0))

        tk.Button(
            btn_row, text="Quit", command=self.destroy,
            bg=BG, fg=SUBTEXT,
            activebackground=INPUT_BG, activeforeground=TEXT,
            relief="flat", font=("Helvetica", 11),
            cursor="hand2", padx=16, pady=9).pack(side="right")

    def _pro_card(self, parent):
        card = tk.Frame(parent, bg=PANEL_BG, relief="flat",
                        highlightbackground=BORDER, highlightthickness=1)
        card.pack(side="left", fill="both", expand=True)

        inner = tk.Frame(card, bg=PANEL_BG)
        inner.pack(fill="both", padx=16, pady=14)

        chip = tk.Frame(inner, bg=PRO_CHIP,
                        highlightbackground="#bfdbfe", highlightthickness=1)
        chip.pack(anchor="w", pady=(0, 8))
        tk.Label(chip, text="  PROFESSIONAL  ", bg=PRO_CHIP, fg=PRO_CHIP_FG,
                 font=("Helvetica", 9, "bold")).pack(padx=2, pady=2)

        tk.Label(inner, text="Architecture Studio", bg=PANEL_BG, fg=TEXT,
                 font=("Helvetica", 13, "bold")).pack(anchor="w")

        desc = (
            "Visual cloud architecture canvas with drag-and-drop\n"
            "AWS, Azure, GCP, and on-prem components.\n\n"
            "• AI-assisted diagram generation\n"
            "• Security validation — 37 rules\n"
            "• Terraform HCL export & import\n"
            "• Cost estimation with live pricing\n"
            "• Architecture report PDF export"
        )
        tk.Label(inner, text=desc, bg=PANEL_BG, fg=SUBTEXT,
                 font=("Helvetica", 10), justify="left",
                 wraplength=230).pack(anchor="w", pady=(8, 0))

    def _ace_card(self, parent):
        card = tk.Frame(parent, bg=PANEL_BG, relief="flat",
                        highlightbackground=BORDER, highlightthickness=1)
        card.pack(side="left", fill="both", expand=True)

        inner = tk.Frame(card, bg=PANEL_BG)
        inner.pack(fill="both", padx=16, pady=14)

        chip = tk.Frame(inner, bg=ACE_CHIP,
                        highlightbackground="#ddd6fe", highlightthickness=1)
        chip.pack(anchor="w", pady=(0, 8))
        tk.Label(chip, text="  ACADEMY  ", bg=ACE_CHIP, fg=ACE_CHIP_FG,
                 font=("Helvetica", 9, "bold")).pack(padx=2, pady=2)

        tk.Label(inner, text="Learning Platform", bg=PANEL_BG, fg=TEXT,
                 font=("Helvetica", 13, "bold")).pack(anchor="w")

        desc = (
            "Guided cloud architecture curriculum with\n"
            "interactive lessons and hands-on labs.\n\n"
            "• Structured learning paths\n"
            "• Architecture challenges & quizzes\n"
            "• AI tutor for instant feedback\n"
            "• Progress tracking & milestones\n"
            "• Shared backend with Professional"
        )
        tk.Label(inner, text=desc, bg=PANEL_BG, fg=SUBTEXT,
                 font=("Helvetica", 10), justify="left",
                 wraplength=230).pack(anchor="w", pady=(8, 0))

    def _toggle_pw_visibility(self):
        self._pw_entry.configure(
            show="" if self._pw_show_var.get() else "•")

    def _generate_secret_key(self):
        import secrets
        self._secret_key_var.set(secrets.token_hex(32))

    def _lbl(self, parent, text):
        tk.Label(parent, text=text, bg=parent["bg"], fg=SUBTEXT,
                 font=("Helvetica", 10)).pack(anchor="w")

    def _entry(self, parent, var, width=36):
        return tk.Entry(
            parent, textvariable=var,
            bg=INPUT_BG, fg=TEXT, insertbackground=TEXT,
            relief="flat", font=("Helvetica", 12), width=width,
            highlightbackground=BORDER, highlightthickness=1)

    # ── Env helpers ───────────────────────────────────────────────────────────

    def _load_existing_env(self):
        if not ENV_FILE.exists():
            return
        env = {}
        for line in ENV_FILE.read_text(encoding="utf-8", errors="ignore").splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, _, v = line.partition("=")
                env[k.strip()] = v.strip()
        for key, attr in [
            ("BACKEND_PORT",      "_backend_port_var"),
            ("FRONTEND_PORT",     "_pro_port_var"),
            ("ACADEMY_PORT",      "_ace_port_var"),
            ("OLLAMA_BASE_URL",   "_ollama_url_var"),
            ("POSTGRES_PASSWORD", "_pg_password_var"),
            ("ACADEMY_SECRET_KEY","_secret_key_var"),
        ]:
            if env.get(key):
                getattr(self, attr).set(env[key])

    def _write_env(self):
        backend_port = self._backend_port_var.get().strip() or "8000"
        pro_port     = self._pro_port_var.get().strip()     or "3000"
        ace_port     = self._ace_port_var.get().strip()     or "3001"
        ollama_url   = (self._ollama_url_var.get().strip()
                        or "http://host.docker.internal:11434")

        pg_password = self._pg_password_var.get().strip() or "archon_dev"
        secret_key  = self._secret_key_var.get().strip()
        if not secret_key:
            import secrets
            secret_key = secrets.token_hex(32)
            self._secret_key_var.set(secret_key)
        db_url = f"postgresql://archon:{pg_password}@db:5432/archon_academy"

        lines = [
            "# Generated by Archon installer — do not commit this file",
            "",
            "# LLM provider default (override per-request in the app)",
            "LLM_PROVIDER=anthropic",
            "",
            "# API Keys — enter these inside the app after launch",
            "ANTHROPIC_API_KEY=",
            "OPENAI_API_KEY=",
            "GOOGLE_API_KEY=",
            "XAI_API_KEY=",
            "",
            "# Provider base URLs",
            "XAI_BASE_URL=https://api.x.ai/v1",
            f"OLLAMA_BASE_URL={ollama_url}",
            "",
            "# App ports",
            f"BACKEND_PORT={backend_port}",
            f"FRONTEND_PORT={pro_port}",
            f"VITE_API_URL=http://localhost:{backend_port}",
            "AWS_DEFAULT_REGION=us-east-1",
            "",
            "# Archon Academy",
            f"ACADEMY_PORT={ace_port}",
            f"VITE_ACADEMY_API_URL=http://localhost:{backend_port}",
            "",
            "# PostgreSQL — used by Academy",
            "POSTGRES_DB=archon_academy",
            "POSTGRES_USER=archon",
            f"POSTGRES_PASSWORD={pg_password}",
            f"DATABASE_URL={db_url}",
            "",
            "# Academy JWT secret",
            f"ACADEMY_SECRET_KEY={secret_key}",
        ]
        ENV_FILE.write_text(
            "\n".join(lines) + "\n", encoding="utf-8", newline="\n")

    # ── Install flow ──────────────────────────────────────────────────────────

    def _start_install(self):
        if self._running:
            return
        self._running = True
        self._install_btn.configure(state="disabled", text="Installing…")
        threading.Thread(target=self._install_worker, daemon=True).start()

    def _install_worker(self):
        try:
            self._run_install()
        except Exception as exc:
            self._enqueue(f"Fatal error: {exc}", "err")
            self._set_status_safe("Installation failed.", ERROR)
        finally:
            self._running = False
            self.after(0, lambda: self._install_btn.configure(
                state="normal", text="Install & Launch  →"))

    def _run_install(self):
        self._set_status_safe("Checking Docker…")
        self._enqueue("── Checking prerequisites ──", "info")
        ok, msg = self._check_docker()
        if not ok:
            self._enqueue(f"Docker check failed: {msg}", "err")
            self._enqueue(
                "Install Docker Desktop and make sure it is running.", "err")
            self._set_status_safe("Docker not found. See log for details.", ERROR)
            return
        self._enqueue(f"Docker: {msg}", "ok")

        self._set_status_safe("Writing .env…")
        self._enqueue("── Writing .env ──", "info")
        self._write_env()
        self._enqueue(f".env written to {ENV_FILE}", "ok")

        self._set_status_safe(
            "Building containers… this may take a few minutes on first run.")
        self._enqueue("── docker compose up --build ──", "info")
        success = self._run_compose()

        if success:
            self._enqueue("── Seeding database ──", "info")
            self._seed_db()

            pro_port = self._pro_port_var.get().strip() or "3000"
            ace_port = self._ace_port_var.get().strip() or "3001"
            self._enqueue("── Archon is running ──", "ok")
            self._enqueue(f"Professional  →  http://localhost:{pro_port}", "ok")
            self._enqueue(f"Academy       →  http://localhost:{ace_port}", "ok")
            self._set_status_safe(
                f"Ready!  Professional: :{pro_port}  ·  Academy: :{ace_port}",
                SUCCESS)
            self._installed = True
        else:
            self._set_status_safe(
                "docker compose failed — see log for details.", ERROR)

    def _check_docker(self):
        try:
            r = subprocess.run(["docker", "info"],
                               capture_output=True, text=True, timeout=10)
            if r.returncode != 0:
                return False, "Docker daemon is not running."
            r2 = subprocess.run(["docker", "compose", "version"],
                                capture_output=True, text=True, timeout=10)
            if r2.returncode != 0:
                return False, "Docker Compose plugin not found."
            return True, r2.stdout.strip()
        except FileNotFoundError:
            return False, "Docker is not installed or not in PATH."
        except subprocess.TimeoutExpired:
            return False, "Docker check timed out."

    def _run_compose(self):
        try:
            proc = subprocess.Popen(
                ["docker", "compose", "up", "--build", "-d"],
                cwd=str(ROOT),
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True, encoding="utf-8", errors="replace")
            for line in proc.stdout:
                self._enqueue(line.rstrip())
            proc.wait()
            return proc.returncode == 0
        except FileNotFoundError:
            self._enqueue("docker not found in PATH.", "err")
            return False

    def _seed_db(self):
        """Run seed.py inside the backend container after compose is up."""
        try:
            # Give postgres a moment to accept the first connection
            import time; time.sleep(5)
            proc = subprocess.run(
                ["docker", "compose", "exec", "-T", "backend", "python", "seed.py"],
                cwd=str(ROOT),
                capture_output=True, text=True,
                encoding="utf-8", errors="replace",
                timeout=60)
            for line in (proc.stdout + proc.stderr).splitlines():
                if line.strip():
                    tag = "ok" if "CREATED" in line or "complete" in line.lower() else None
                    self._enqueue(line, tag)
        except Exception as exc:
            self._enqueue(f"Seed warning (non-fatal): {exc}", "err")

    def _open_browser(self, product="pro"):
        import webbrowser
        port = (self._ace_port_var.get().strip() or "3001") if product == "ace" \
               else (self._pro_port_var.get().strip() or "3000")
        webbrowser.open(f"http://localhost:{port}")

    # ── UI helpers ────────────────────────────────────────────────────────────

    def _log_write(self, text, tag=None):
        self._log.configure(state="normal")
        self._log.insert("end", text + "\n", tag or "")
        self._log.see("end")
        self._log.configure(state="disabled")

    def _set_status(self, text, color=SUBTEXT):
        self._status_var.set(text)
        self._status_lbl.configure(fg=color)

    def _set_status_safe(self, text, color=SUBTEXT):
        self.after(0, lambda: self._set_status(text, color))

    def _poll_log_queue(self):
        try:
            while True:
                text, tag = self._log_queue.get_nowait()
                self._log_write(text, tag)
        except queue.Empty:
            pass
        self.after(100, self._poll_log_queue)

    def _enqueue(self, text, tag=None):
        self._log_queue.put((text, tag))


if __name__ == "__main__":
    app = ArchonInstaller()
    app.mainloop()
