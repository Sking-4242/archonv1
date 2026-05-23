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
import tkinter.ttk as ttk
import webbrowser
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
VERSION  = "v1.0"

# ── Colour palette ─────────────────────────────────────────────────────────────
BG          = "#f4f6fb"
PANEL_BG    = "#ffffff"
BORDER      = "#dde3ee"
TEXT        = "#1a1f36"
SUBTEXT     = "#5c6b8a"
INPUT_BG    = "#f1f4fb"
LOG_BG      = "#0d1117"
LOG_FG      = "#8b949e"

PRO_CHIP    = "#eff6ff"
PRO_CHIP_FG = "#1e40af"
PRO_DIM     = "#1d4ed8"

ACE_CHIP    = "#f5f3ff"
ACE_CHIP_FG = "#4c1d95"
ACE_DIM     = "#6d28d9"

SUCCESS     = "#059669"
WARNING     = "#d97706"
ERROR       = "#dc2626"
RUNNING_BG  = "#ecfdf5"
RUNNING_FG  = "#065f46"
RUNNING_BD  = "#a7f3d0"

# ── Install steps for progress bar ────────────────────────────────────────────
STEPS = [
    "Checking Docker",
    "Writing config",
    "Building containers",
    "Seeding database",
    "Done",
]


class ArchonInstaller(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("Archon Setup")
        self.configure(bg=BG)
        self.resizable(True, True)

        self._log_queue  = queue.Queue()
        self._running    = False
        self._mode       = "install"   # "install" | "update" | "launch"

        self._build_ui()
        self._load_existing_env()
        self._detect_state()
        self._poll_log_queue()

        self.update_idletasks()
        sw = self.winfo_screenwidth()
        sh = self.winfo_screenheight()
        w  = max(self.winfo_width(), 640)
        h  = min(self.winfo_height(), int(sh * 0.92))
        x  = (sw - w) // 2
        y  = (sh - h) // 2
        self.geometry(f"{w}x{h}+{x}+{y}")
        self.minsize(560, 460)

    # ── Scrollable shell ──────────────────────────────────────────────────────

    def _build_ui(self):
        outer = tk.Frame(self, bg=BG)
        outer.pack(fill="both", expand=True)
        outer.grid_rowconfigure(0, weight=1)
        outer.grid_columnconfigure(0, weight=1)

        vbar = tk.Scrollbar(outer, orient="vertical")
        vbar.grid(row=0, column=1, sticky="ns")

        self._canvas = tk.Canvas(outer, bg=BG, highlightthickness=0,
                                 yscrollcommand=vbar.set)
        self._canvas.grid(row=0, column=0, sticky="nsew")
        vbar.config(command=self._canvas.yview)

        self._inner  = tk.Frame(self._canvas, bg=BG)
        self._win_id = self._canvas.create_window(
            (0, 0), window=self._inner, anchor="nw")

        self._inner.bind("<Configure>", self._on_inner_configure)
        self._canvas.bind("<Configure>", self._on_canvas_configure)

        self.bind_all("<MouseWheel>",
                      lambda e: self._canvas.yview_scroll(
                          int(-1 * (e.delta / 120)), "units"))
        self.bind_all("<Button-4>",
                      lambda e: self._canvas.yview_scroll(-1, "units"))
        self.bind_all("<Button-5>",
                      lambda e: self._canvas.yview_scroll(1, "units"))

        self._fill_inner()

    def _on_inner_configure(self, _event):
        self._canvas.configure(scrollregion=self._canvas.bbox("all"))

    def _on_canvas_configure(self, event):
        self._canvas.itemconfig(self._win_id, width=event.width)

    # ── Content ───────────────────────────────────────────────────────────────

    def _fill_inner(self):
        p = self._inner

        # ── Header ────────────────────────────────────────────────────────────
        hdr = tk.Frame(p, bg=BG)
        hdr.pack(fill="x", padx=28, pady=(26, 2))
        name_row = tk.Frame(hdr, bg=BG)
        name_row.pack(anchor="w")
        tk.Label(name_row, text="ARCHON", bg=BG, fg=TEXT,
                 font=("Helvetica", 28, "bold")).pack(side="left")
        tk.Label(name_row, text=f"  {VERSION}", bg=BG, fg=SUBTEXT,
                 font=("Helvetica", 13)).pack(side="left", pady=6)
        self._subtitle_lbl = tk.Label(
            p, text="AI-assisted cloud architecture design platform.",
            bg=BG, fg=SUBTEXT,
            font=("Helvetica", 11))
        self._subtitle_lbl.pack(anchor="w", padx=28, pady=(0, 14))

        # ── Running banner (hidden until detected) ────────────────────────────
        self._banner_frame = tk.Frame(
            p, bg=RUNNING_BG,
            highlightbackground=RUNNING_BD, highlightthickness=1)
        self._banner_lbl = tk.Label(
            self._banner_frame,
            text="",
            bg=RUNNING_BG, fg=RUNNING_FG,
            font=("Helvetica", 10, "bold"))
        self._banner_lbl.pack(anchor="w", padx=12, pady=7)
        # Pack then immediately forget so position is anchored after subtitle
        self._banner_frame.pack(fill="x", padx=28, pady=(0, 12),
                                after=self._subtitle_lbl)
        self._banner_frame.pack_forget()

        # ── Product cards ─────────────────────────────────────────────────────
        cards_row = tk.Frame(p, bg=BG)
        cards_row.pack(fill="x", padx=28, pady=(0, 4))
        self._pro_card(cards_row)
        tk.Frame(cards_row, bg=BG, width=12).pack(side="left")
        self._ace_card(cards_row)

        # ── Configuration ─────────────────────────────────────────────────────
        tk.Frame(p, bg=BORDER, height=1).pack(fill="x", padx=28, pady=(16, 0))
        tk.Label(p, text="Configuration", bg=BG, fg=TEXT,
                 font=("Helvetica", 12, "bold")).pack(
            anchor="w", padx=28, pady=(12, 6))

        cfg_card = tk.Frame(p, bg=PANEL_BG, relief="flat",
                            highlightbackground=BORDER, highlightthickness=1)
        cfg_card.pack(fill="x", padx=28)
        cfg_inner = tk.Frame(cfg_card, bg=PANEL_BG)
        cfg_inner.pack(fill="x", padx=20, pady=16)

        ports = tk.Frame(cfg_inner, bg=PANEL_BG)
        ports.pack(fill="x")
        for col, (label, attr, default) in enumerate([
            ("Backend Port",      "_backend_port_var", "8000"),
            ("Professional Port", "_pro_port_var",     "3000"),
            ("Academy Port",      "_ace_port_var",     "3001"),
        ]):
            setattr(self, attr, tk.StringVar(value=default))
            cf = tk.Frame(ports, bg=PANEL_BG)
            cf.pack(side="left", fill="x", expand=True,
                    padx=(0, 10) if col < 2 else 0)
            self._lbl(cf, label)
            self._entry(cf, getattr(self, attr), width=10).pack(
                fill="x", ipady=5, pady=(3, 0))

        tk.Frame(cfg_inner, bg=BORDER, height=1).pack(fill="x", pady=14)
        self._lbl(cfg_inner, "Ollama Base URL  (local AI only)")
        self._ollama_url_var = tk.StringVar(
            value="http://host.docker.internal:11434")
        self._entry(cfg_inner, self._ollama_url_var).pack(
            fill="x", ipady=5, pady=(3, 0))

        info = tk.Frame(cfg_inner, bg="#eff6ff",
                        highlightbackground="#bfdbfe", highlightthickness=1)
        info.pack(fill="x", pady=(14, 0))
        tk.Label(info,
                 text="AI provider, model, and API key are configured\n"
                      "inside the app after launch — Settings in the top bar.",
                 bg="#eff6ff", fg="#1e40af",
                 font=("Helvetica", 10), justify="left").pack(
            anchor="w", padx=10, pady=8)

        # ── Progress ──────────────────────────────────────────────────────────
        tk.Frame(p, bg=BORDER, height=1).pack(fill="x", padx=28, pady=(16, 0))

        prog_frame = tk.Frame(p, bg=BG)
        prog_frame.pack(fill="x", padx=28, pady=(12, 0))

        self._step_labels = []
        for i, step in enumerate(STEPS):
            sf = tk.Frame(prog_frame, bg=BG)
            sf.pack(side="left", expand=True, fill="x")
            dot = tk.Label(sf, text="○", bg=BG, fg=BORDER,
                           font=("Helvetica", 14))
            dot.pack()
            lbl = tk.Label(sf, text=step, bg=BG, fg=BORDER,
                           font=("Helvetica", 8))
            lbl.pack()
            self._step_labels.append((dot, lbl))
            if i < len(STEPS) - 1:
                tk.Label(prog_frame, text="───", bg=BG, fg=BORDER,
                         font=("Helvetica", 10)).pack(side="left", pady=4)

        self._progress = ttk.Progressbar(
            p, mode="determinate", maximum=len(STEPS))
        self._progress.pack(fill="x", padx=28, pady=(8, 0))
        ttk.Style().configure("TProgressbar",
                              troughcolor=INPUT_BG,
                              background=PRO_DIM,
                              thickness=6)

        # ── Status label ──────────────────────────────────────────────────────
        self._status_var = tk.StringVar(value="Ready to install.")
        self._status_lbl = tk.Label(
            p, textvariable=self._status_var,
            bg=BG, fg=SUBTEXT, font=("Helvetica", 11), anchor="w")
        self._status_lbl.pack(fill="x", padx=28, pady=(10, 4))

        # ── Log ───────────────────────────────────────────────────────────────
        self._log = scrolledtext.ScrolledText(
            p, bg=LOG_BG, fg=LOG_FG,
            font=("Courier", 10), relief="flat",
            height=10, width=74, state="disabled", wrap="word")
        self._log.pack(fill="x", padx=28, pady=(0, 8))
        self._log.tag_configure("ok",   foreground=SUCCESS)
        self._log.tag_configure("err",  foreground=ERROR)
        self._log.tag_configure("warn", foreground=WARNING)
        self._log.tag_configure("info", foreground="#818cf8")

        # ── Action bar ────────────────────────────────────────────────────────
        btn_row = tk.Frame(p, bg=BG)
        btn_row.pack(fill="x", padx=28, pady=(0, 28))

        self._primary_btn = tk.Button(
            btn_row, text="Install & Launch  →",
            command=self._start_install,
            bg=TEXT, fg="white",
            activebackground="#334155", activeforeground="white",
            relief="flat", font=("Helvetica", 12, "bold"),
            cursor="hand2", padx=22, pady=9)
        self._primary_btn.pack(side="left")

        self._update_btn = tk.Button(
            btn_row, text="Update & Restart",
            command=self._start_update,
            bg=WARNING, fg="white",
            activebackground="#b45309", activeforeground="white",
            relief="flat", font=("Helvetica", 11),
            cursor="hand2", padx=14, pady=9)

        self._open_pro_btn = tk.Button(
            btn_row, text="Open Professional",
            command=lambda: self._open_browser("pro"),
            bg=PRO_CHIP, fg=PRO_CHIP_FG,
            activebackground="#dbeafe", activeforeground=PRO_DIM,
            relief="flat", font=("Helvetica", 11),
            cursor="hand2", padx=14, pady=9,
            highlightbackground="#bfdbfe", highlightthickness=1)

        self._open_ace_btn = tk.Button(
            btn_row, text="Open Academy",
            command=lambda: self._open_browser("ace"),
            bg=ACE_CHIP, fg=ACE_CHIP_FG,
            activebackground="#ede9fe", activeforeground=ACE_DIM,
            relief="flat", font=("Helvetica", 11),
            cursor="hand2", padx=14, pady=9,
            highlightbackground="#ddd6fe", highlightthickness=1)

        self._open_pro_btn.pack(side="left", padx=(10, 0))
        self._open_ace_btn.pack(side="left", padx=(8, 0))

        tk.Button(btn_row, text="Quit", command=self.destroy,
                  bg=BG, fg=SUBTEXT,
                  activebackground=INPUT_BG, activeforeground=TEXT,
                  relief="flat", font=("Helvetica", 11),
                  cursor="hand2", padx=16, pady=9).pack(side="right")

    # ── Cards ─────────────────────────────────────────────────────────────────

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
        tk.Label(inner,
                 text="Visual cloud architecture canvas with\n"
                      "AWS, Azure, GCP, and on-prem components.\n\n"
                      "  AI-assisted diagram generation & chat\n"
                      "  89-rule security & compliance validation\n"
                      "  Terraform HCL export & import\n"
                      "  Live cost estimation\n"
                      "  Real infrastructure discovery (AWS)\n"
                      "  Terraform plan visualization",
                 bg=PANEL_BG, fg=SUBTEXT, font=("Helvetica", 10),
                 justify="left", wraplength=240).pack(anchor="w", pady=(8, 0))

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
        tk.Label(inner,
                 text="Guided cloud architecture curriculum\n"
                      "with interactive lessons and labs.\n\n"
                      "  Structured learning paths\n"
                      "  Architecture challenges & quizzes\n"
                      "  AI tutor for instant feedback\n"
                      "  Progress tracking & milestones\n"
                      "  Shared backend with Professional",
                 bg=PANEL_BG, fg=SUBTEXT, font=("Helvetica", 10),
                 justify="left", wraplength=240).pack(anchor="w", pady=(8, 0))

    # ── State detection ───────────────────────────────────────────────────────

    def _detect_state(self):
        """Check if containers are already running and update the UI accordingly."""
        env_exists         = ENV_FILE.exists()
        containers_running = self._containers_running()

        if containers_running:
            pro_port = self._pro_port_var.get().strip() or "3000"
            ace_port = self._ace_port_var.get().strip() or "3001"
            self._banner_lbl.config(
                text=f"Archon is running  —  "
                     f"Professional: localhost:{pro_port}  "
                     f"·  Academy: localhost:{ace_port}")
            self._banner_frame.pack(fill="x", padx=28, pady=(0, 12),
                                    after=self._subtitle_lbl)
            self._primary_btn.config(
                text="Reinstall  →",
                bg="#374151")
            self._update_btn.pack(side="left", padx=(10, 0))
            self._set_status("Archon is already running.", SUCCESS)
            self._mode = "launch"
        elif env_exists:
            self._set_status("Config found — ready to launch.", SUBTEXT)
            self._primary_btn.config(text="Launch  →")
            self._mode = "update"
        else:
            self._mode = "install"

    def _containers_running(self):
        try:
            r = subprocess.run(
                ["docker", "compose", "ps", "--status", "running", "-q"],
                cwd=str(ROOT), capture_output=True, text=True, timeout=10)
            return bool(r.stdout.strip())
        except Exception:
            return False

    # ── Progress helpers ──────────────────────────────────────────────────────

    def _set_step(self, step_index):
        """Highlight completed and current steps."""
        for i, (dot, lbl) in enumerate(self._step_labels):
            if i < step_index:
                dot.config(text="●", fg=SUCCESS)
                lbl.config(fg=SUCCESS)
            elif i == step_index:
                dot.config(text="◉", fg=PRO_DIM)
                lbl.config(fg=PRO_DIM)
            else:
                dot.config(text="○", fg=BORDER)
                lbl.config(fg=BORDER)
        self._progress["value"] = step_index
        self.update_idletasks()

    def _complete_steps(self):
        for dot, lbl in self._step_labels:
            dot.config(text="●", fg=SUCCESS)
            lbl.config(fg=SUCCESS)
        self._progress["value"] = len(STEPS)
        self.update_idletasks()

    def _reset_steps(self):
        for dot, lbl in self._step_labels:
            dot.config(text="○", fg=BORDER)
            lbl.config(fg=BORDER)
        self._progress["value"] = 0
        self.update_idletasks()

    # ── Helpers ───────────────────────────────────────────────────────────────

    def _lbl(self, parent, text):
        tk.Label(parent, text=text, bg=parent["bg"], fg=SUBTEXT,
                 font=("Helvetica", 10)).pack(anchor="w")

    def _entry(self, parent, var, width=36):
        return tk.Entry(parent, textvariable=var,
                        bg=INPUT_BG, fg=TEXT, insertbackground=TEXT,
                        relief="flat", font=("Helvetica", 12), width=width,
                        highlightbackground=BORDER, highlightthickness=1)

    # ── Env ───────────────────────────────────────────────────────────────────

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
            ("BACKEND_PORT",    "_backend_port_var"),
            ("FRONTEND_PORT",   "_pro_port_var"),
            ("ACADEMY_PORT",    "_ace_port_var"),
            ("OLLAMA_BASE_URL", "_ollama_url_var"),
        ]:
            if env.get(key):
                getattr(self, attr).set(env[key])

    def _write_env(self):
        backend_port = self._backend_port_var.get().strip() or "8000"
        pro_port     = self._pro_port_var.get().strip()     or "3000"
        ace_port     = self._ace_port_var.get().strip()     or "3001"
        ollama_url   = (self._ollama_url_var.get().strip()
                        or "http://host.docker.internal:11434")

        # Preserve existing API keys if .env already exists
        existing_keys = {
            "ANTHROPIC_API_KEY": "",
            "OPENAI_API_KEY":    "",
            "GOOGLE_API_KEY":    "",
            "XAI_API_KEY":       "",
            "POSTGRES_PASSWORD": "archon_dev",
            "ACADEMY_SECRET_KEY": "",
        }
        if ENV_FILE.exists():
            for line in ENV_FILE.read_text(encoding="utf-8", errors="ignore").splitlines():
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, _, v = line.partition("=")
                    k = k.strip()
                    if k in existing_keys and v.strip():
                        existing_keys[k] = v.strip()

        lines = [
            "# Generated by Archon installer — do not commit this file",
            "",
            "# LLM provider default (override per-request in the app)",
            "LLM_PROVIDER=anthropic",
            "",
            "# API Keys — enter these inside the app after launch",
            f"ANTHROPIC_API_KEY={existing_keys['ANTHROPIC_API_KEY']}",
            f"OPENAI_API_KEY={existing_keys['OPENAI_API_KEY']}",
            f"GOOGLE_API_KEY={existing_keys['GOOGLE_API_KEY']}",
            f"XAI_API_KEY={existing_keys['XAI_API_KEY']}",
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
            "",
            "# PostgreSQL",
            f"POSTGRES_DB=archon_academy",
            f"POSTGRES_USER=archon",
            f"POSTGRES_PASSWORD={existing_keys['POSTGRES_PASSWORD']}",
            f"DATABASE_URL=postgresql://archon:{existing_keys['POSTGRES_PASSWORD']}@db:5432/archon_academy",
            "",
            "# Academy",
            f"ACADEMY_SECRET_KEY={existing_keys['ACADEMY_SECRET_KEY'] or 'change-me-in-production'}",
            "VITE_CANVAS_URL=http://localhost:3000",
        ]
        ENV_FILE.write_text(
            "\n".join(lines) + "\n", encoding="utf-8", newline="\n")

    # ── Install / Update ──────────────────────────────────────────────────────

    def _start_install(self):
        if self._running:
            return
        self._running = True
        self._reset_steps()
        self._primary_btn.configure(state="disabled", text="Working…")
        self._update_btn.configure(state="disabled")
        threading.Thread(target=self._install_worker,
                         args=(False,), daemon=True).start()

    def _start_update(self):
        if self._running:
            return
        self._running = True
        self._reset_steps()
        self._primary_btn.configure(state="disabled")
        self._update_btn.configure(state="disabled", text="Updating…")
        threading.Thread(target=self._install_worker,
                         args=(True,), daemon=True).start()

    def _install_worker(self, is_update: bool):
        try:
            self._run_install(is_update)
        except Exception as exc:
            self._enqueue(f"Fatal error: {exc}", "err")
            self._set_status_safe("Installation failed.", ERROR)
        finally:
            self._running = False
            self.after(0, self._restore_buttons)

    def _restore_buttons(self):
        self._primary_btn.configure(state="normal", text="Reinstall  →")
        self._update_btn.configure(state="normal", text="Update & Restart")

    def _run_install(self, is_update: bool):
        verb = "Updating" if is_update else "Installing"

        # Step 0 — Docker check
        self._set_step_safe(0)
        self._set_status_safe("Checking Docker…")
        self._enqueue("── Checking prerequisites ──", "info")
        ok, msg = self._check_docker()
        if not ok:
            self._enqueue(f"Docker check failed: {msg}", "err")
            self._enqueue("Install Docker Desktop and make sure it is running.", "err")
            self._set_status_safe("Docker not found. See log for details.", ERROR)
            return
        self._enqueue(f"Docker: {msg}", "ok")

        # Step 1 — Write .env
        self._set_step_safe(1)
        self._set_status_safe("Writing .env…")
        self._enqueue("── Writing .env ──", "info")
        self._write_env()
        self._enqueue(f".env written to {ENV_FILE}", "ok")

        # Step 2 — Build containers
        self._set_step_safe(2)
        self._set_status_safe(
            f"{verb} containers… this may take a few minutes on first run.")
        self._enqueue(f"── docker compose up --build -d ──", "info")
        success = self._run_compose()
        if not success:
            self._set_status_safe("docker compose failed — see log for details.", ERROR)
            return

        # Step 3 — Seed database
        self._set_step_safe(3)
        self._enqueue("── Seeding database ──", "info")
        self._seed_db()

        # Step 4 — Done
        self._complete_steps_safe()
        pro_port = self._pro_port_var.get().strip() or "3000"
        ace_port = self._ace_port_var.get().strip() or "3001"
        self._enqueue("── Archon is running ──", "ok")
        self._enqueue(f"Professional  →  http://localhost:{pro_port}", "ok")
        self._enqueue(f"Academy       →  http://localhost:{ace_port}", "ok")
        self._set_status_safe(
            f"Ready!  Professional: :{pro_port}  ·  Academy: :{ace_port}", SUCCESS)
        self._update_banner_safe(pro_port, ace_port)

    # ── Docker helpers ────────────────────────────────────────────────────────

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
                stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                text=True, encoding="utf-8", errors="replace")
            for line in proc.stdout:
                stripped = line.rstrip()
                if stripped:
                    tag = "err" if "error" in stripped.lower() else None
                    self._enqueue(stripped, tag)
            proc.wait()
            return proc.returncode == 0
        except FileNotFoundError:
            self._enqueue("docker not found in PATH.", "err")
            return False

    def _seed_db(self):
        try:
            import time
            time.sleep(5)
            proc = subprocess.run(
                ["docker", "compose", "exec", "-T", "backend", "python", "seed.py"],
                cwd=str(ROOT),
                capture_output=True, text=True,
                encoding="utf-8", errors="replace", timeout=60)
            for line in (proc.stdout + proc.stderr).splitlines():
                if line.strip():
                    tag = "ok" if ("CREATED" in line or "complete" in line.lower()) else None
                    self._enqueue(line, tag)
        except Exception as exc:
            self._enqueue(f"Seed warning (non-fatal): {exc}", "warn")

    # ── Browser ───────────────────────────────────────────────────────────────

    def _open_browser(self, product="pro"):
        port = (self._ace_port_var.get().strip() or "3001") if product == "ace" \
               else (self._pro_port_var.get().strip() or "3000")
        webbrowser.open(f"http://localhost:{port}")

    # ── Thread-safe UI helpers ────────────────────────────────────────────────

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

    def _set_step_safe(self, index):
        self.after(0, lambda: self._set_step(index))

    def _complete_steps_safe(self):
        self.after(0, self._complete_steps)

    def _update_banner_safe(self, pro_port, ace_port):
        def _update():
            self._banner_lbl.config(
                text=f"Archon is running  —  "
                     f"Professional: localhost:{pro_port}  "
                     f"·  Academy: localhost:{ace_port}")
            self._banner_frame.pack(
                fill="x", padx=28, pady=(0, 12),
                after=self._subtitle_lbl)
            self._update_btn.pack(side="left", padx=(10, 0))
        self.after(0, _update)

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
