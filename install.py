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

ROOT     = Path(__file__).parent.resolve()
ENV_FILE = ROOT / ".env"

# ── Colour palette ─────────────────────────────────────────────────────────────
BG          = "#f4f6fb"   # cool off-white page background
PANEL_BG    = "#ffffff"   # card surface
BORDER      = "#dde3ee"   # card border
TEXT        = "#1a1f36"   # primary text (deep navy)
SUBTEXT     = "#5c6b8a"   # secondary text
INPUT_BG    = "#f1f4fb"   # input field fill
LOG_BG      = "#0d1117"   # terminal background
LOG_FG      = "#8b949e"   # terminal default text

# Product accents
PRO_ACCENT  = "#2563eb"   # Professional — blue-600
PRO_DIM     = "#1d4ed8"   # hover
PRO_CHIP    = "#eff6ff"   # light chip bg
PRO_CHIP_FG = "#1e40af"   # chip text

ACE_ACCENT  = "#7c3aed"   # Academy — violet-600
ACE_DIM     = "#6d28d9"   # hover
ACE_CHIP    = "#f5f3ff"   # light chip bg
ACE_CHIP_FG = "#4c1d95"   # chip text

SUCCESS     = "#059669"   # emerald-600
ERROR       = "#dc2626"   # red-600


class ArchonInstaller(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("Archon Setup")
        self.configure(bg=BG)
        self.resizable(False, False)

        self._log_queue = queue.Queue()
        self._running   = False
        self._installed = False

        self._build_ui()
        self._load_existing_env()
        self._poll_log_queue()

        self.update_idletasks()
        w, h = self.winfo_width(), self.winfo_height()
        x = (self.winfo_screenwidth()  - w) // 2
        y = (self.winfo_screenheight() - h) // 2
        self.geometry(f"+{x}+{y}")

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
        sep = tk.Frame(self, bg=BORDER, height=1)
        sep.pack(fill="x", padx=28, pady=(16, 0))

        tk.Label(self, text="Configuration", bg=BG, fg=TEXT,
                 font=("Helvetica", 12, "bold")).pack(
            anchor="w", padx=28, pady=(12, 6))

        card = tk.Frame(self, bg=PANEL_BG, relief="flat",
                        highlightbackground=BORDER, highlightthickness=1)
        card.pack(fill="x", padx=28)

        inner = tk.Frame(card, bg=PANEL_BG)
        inner.pack(fill="x", padx=20, pady=16)

        # Port rows
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

        # Separator
        tk.Frame(inner, bg=BORDER, height=1).pack(fill="x", pady=14)

        # Ollama URL
        self._lbl(inner, "Ollama Base URL  (local AI only)")
        self._ollama_url_var = tk.StringVar(
            value="http://host.docker.internal:11434")
        self._entry(inner, self._ollama_url_var).pack(
            fill="x", ipady=5, pady=(3, 0))

        # Info note
        note = tk.Frame(inner, bg="#eff6ff",
                        highlightbackground="#bfdbfe", highlightthickness=1)
        note.pack(fill="x", pady=(14, 0))
        tk.Label(note,
                 text="ℹ️  AI provider, model, and API key are configured\n"
                      "    inside the app once it's running.",
                 bg="#eff6ff", fg="#1e40af",
                 font=("Helvetica", 10), justify="left").pack(
            anchor="w", padx=10, pady=8)

        # ── Status ────────────────────────────────────────────────────────────
        self._status_var = tk.StringVar(value="Ready to install.")
        self._status_lbl = tk.Label(
            self, textvariable=self._status_var,
            bg=BG, fg=SUBTEXT, font=("Helvetica", 11), anchor="w")
        self._status_lbl.pack(fill="x", padx=28, pady=(16, 6))

        # ── Log window ────────────────────────────────────────────────────────
        self._log = scrolledtext.ScrolledText(
            self, bg=LOG_BG, fg=LOG_FG,
            font=("Courier", 10), relief="flat",
            height=11, width=74, state="disabled", wrap="word")
        self._log.pack(fill="both", padx=28, pady=(0, 16))
        self._log.tag_configure("ok",   foreground=SUCCESS)
        self._log.tag_configure("err",  foreground=ERROR)
        self._log.tag_configure("info", foreground="#818cf8")

        # ── Action bar ────────────────────────────────────────────────────────
        btn_row = tk.Frame(self, bg=BG)
        btn_row.pack(fill="x", padx=28, pady=(0, 28))

        # Install button
        self._install_btn = tk.Button(
            btn_row, text="Install & Launch  →",
            command=self._start_install,
            bg=TEXT, fg="white",
            activebackground="#334155", activeforeground="white",
            relief="flat", font=("Helvetica", 12, "bold"),
            cursor="hand2", padx=22, pady=9)
        self._install_btn.pack(side="left")

        # Launch Professional
        self._pro_btn = tk.Button(
            btn_row, text="Open Professional",
            command=lambda: self._open_browser("pro"),
            bg=PRO_CHIP, fg=PRO_CHIP_FG,
            activebackground="#dbeafe", activeforeground=PRO_DIM,
            relief="flat", font=("Helvetica", 11),
            cursor="hand2", padx=14, pady=9,
            highlightbackground="#bfdbfe", highlightthickness=1)
        self._pro_btn.pack(side="left", padx=(10, 0))

        # Launch Academy
        self._ace_btn = tk.Button(
            btn_row, text="Open Academy",
            command=lambda: self._open_browser("ace"),
            bg=ACE_CHIP, fg=ACE_CHIP_FG,
            activebackground="#ede9fe", activeforeground=ACE_DIM,
            relief="flat", font=("Helvetica", 11),
            cursor="hand2", padx=14, pady=9,
            highlightbackground="#ddd6fe", highlightthickness=1)
        self._ace_btn.pack(side="left", padx=(8, 0))

        # Quit
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
        for line in ENV_FILE.read_text().splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, _, v = line.partition("=")
                env[k.strip()] = v.strip()
        for key, attr in [
            ("BACKEND_PORT",    "_backend_port_var"),
            ("FRONTEND_PORT",   "_pro_port_var"),
            ("ACADEMY_PORT",    "_ace_port_var"),
            ("OLLAMA_BASE_URL", "_ollama_url_var"),
        ]:
            if env.get(key):
                getattr(self, attr).set(env[key])

    def _write_env(self):
        backend_port  = self._backend_port_var.get().strip()  or "8000"
        pro_port      = self._pro_port_var.get().strip()      or "3000"
        ace_port      = self._ace_port_var.get().strip()      or "3001"
        ollama_url    = self._ollama_url_var.get().strip() \
                        or "http://host.docker.internal:11434"

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
            f"ACADEMY_PORT={ace_port}",
            f"VITE_API_URL=http://localhost:{backend_port}",
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
        # Step 1 — Docker check
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

        # Step 2 — Write .env
        self._set_status_safe("Writing .env…")
        self._enqueue("── Writing .env ──", "info")
        self._write_env()
        self._enqueue(f".env written to {ENV_FILE}", "ok")

        # Step 3 — docker compose up --build
        self._set_status_safe(
            "Building containers… this may take a few minutes on first run.")
        self._enqueue("── docker compose up --build ──", "info")
        success = self._run_compose()

        if success:
            pro_port = self._pro_port_var.get().strip() or "3000"
            ace_port = self._ace_port_var.get().strip() or "3001"
            self._enqueue("── Archon is running ──", "ok")
            self._enqueue(
                f"Professional  →  http://localhost:{pro_port}", "ok")
            self._enqueue(
                f"Academy       →  http://localhost:{ace_port}", "ok")
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

    def _open_browser(self, product="pro"):
        import webbrowser
        if product == "ace":
            port = self._ace_port_var.get().strip() or "3001"
        else:
            port = self._pro_port_var.get().strip() or "3000"
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
