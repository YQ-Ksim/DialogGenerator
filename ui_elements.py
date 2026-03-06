from __future__ import annotations

import tkinter as tk
from tkinter import messagebox, ttk
from typing import Any, Dict

from dialog_types import ALL_ACTION_TYPES


class ActionEditorDialog(tk.Toplevel):
    def __init__(self, master: tk.Widget, initial: Dict[str, Any] | None = None) -> None:
        super().__init__(master)
        self.title("Action Editor")
        self.transient(master)
        self.grab_set()
        self.resizable(True, True)
        self.result: Dict[str, Any] | None = None

        data = initial or {}
        root = ttk.Frame(self, padding=10)
        root.grid(sticky="nsew")
        self.columnconfigure(0, weight=1)
        self.rowconfigure(0, weight=1)
        root.columnconfigure(1, weight=1)

        ttk.Label(root, text="label (text/json)").grid(row=0, column=0, sticky="w", padx=4, pady=3)
        self.label_var = tk.StringVar(value=data.get("label_raw", ""))
        ttk.Entry(root, textvariable=self.label_var).grid(row=0, column=1, sticky="ew", padx=4, pady=3)

        ttk.Label(root, text="tooltip (text/json)").grid(row=1, column=0, sticky="w", padx=4, pady=3)
        self.tooltip_var = tk.StringVar(value=data.get("tooltip_raw", ""))
        ttk.Entry(root, textvariable=self.tooltip_var).grid(row=1, column=1, sticky="ew", padx=4, pady=3)

        ttk.Label(root, text="width (1-1024)").grid(row=2, column=0, sticky="w", padx=4, pady=3)
        self.width_var = tk.StringVar(value=data.get("width_raw", ""))
        ttk.Entry(root, textvariable=self.width_var).grid(row=2, column=1, sticky="ew", padx=4, pady=3)

        ttk.Label(root, text="action type").grid(row=3, column=0, sticky="w", padx=4, pady=3)
        self.type_var = tk.StringVar(value=data.get("action_type", ALL_ACTION_TYPES[0]))
        ttk.Combobox(root, textvariable=self.type_var, values=ALL_ACTION_TYPES, state="readonly").grid(
            row=3, column=1, sticky="ew", padx=4, pady=3
        )
        self.type_var.trace_add("write", lambda *_: self._refresh_state())

        ttk.Label(root, text="value").grid(row=4, column=0, sticky="w", padx=4, pady=3)
        self.value_var = tk.StringVar(value=data.get("value_raw", ""))
        self.value_entry = ttk.Entry(root, textvariable=self.value_var)
        self.value_entry.grid(row=4, column=1, sticky="ew", padx=4, pady=3)

        ttk.Label(root, text="dynamic/custom id").grid(row=5, column=0, sticky="w", padx=4, pady=3)
        self.id_var = tk.StringVar(value=data.get("id_raw", ""))
        self.id_entry = ttk.Entry(root, textvariable=self.id_var)
        self.id_entry.grid(row=5, column=1, sticky="ew", padx=4, pady=3)

        ttk.Label(root, text="dynamic/run_command template").grid(row=6, column=0, sticky="w", padx=4, pady=3)
        self.template_var = tk.StringVar(value=data.get("template_raw", ""))
        self.template_entry = ttk.Entry(root, textvariable=self.template_var)
        self.template_entry.grid(row=6, column=1, sticky="ew", padx=4, pady=3)

        ttk.Label(root, text="additions (json object)").grid(row=7, column=0, sticky="nw", padx=4, pady=3)
        self.additions_text = tk.Text(root, height=5, width=36)
        self.additions_text.grid(row=7, column=1, sticky="ew", padx=4, pady=3)
        self.additions_text.insert("1.0", data.get("additions_raw", ""))

        footer = ttk.Frame(root)
        footer.grid(row=8, column=0, columnspan=2, sticky="e", pady=(8, 0))
        ttk.Button(footer, text="Cancel", command=self.destroy).pack(side=tk.RIGHT, padx=4)
        ttk.Button(footer, text="Save", command=self._save).pack(side=tk.RIGHT, padx=4)

        self._refresh_state()
        self.wait_window(self)

    def _refresh_state(self) -> None:
        action_type = self.type_var.get()
        is_static = action_type not in {"dynamic/custom", "dynamic/run_command"}
        is_dynamic_custom = action_type == "dynamic/custom"
        is_dynamic_command = action_type == "dynamic/run_command"

        self.value_entry.configure(state="normal" if is_static else "disabled")
        self.id_entry.configure(state="normal" if is_dynamic_custom else "disabled")
        self.template_entry.configure(state="normal" if is_dynamic_command else "disabled")
        self.additions_text.configure(state="normal" if is_dynamic_custom else "disabled")

    def _save(self) -> None:
        try:
            self.result = {
                "label_raw": self.label_var.get().strip(),
                "tooltip_raw": self.tooltip_var.get().strip(),
                "width_raw": self.width_var.get().strip(),
                "action_type": self.type_var.get().strip(),
                "value_raw": self.value_var.get().strip(),
                "id_raw": self.id_var.get().strip(),
                "template_raw": self.template_var.get().strip(),
                "additions_raw": self.additions_text.get("1.0", "end").strip(),
            }
            self.destroy()
        except Exception as exc:
            messagebox.showerror("Error", str(exc), parent=self)


def action_to_text(cfg: Dict[str, Any]) -> str:
    action_type = cfg.get("action_type", "?")
    label = (cfg.get("label_raw") or "").strip()
    if label:
        return f"{action_type} | {label}"
    if action_type == "dynamic/custom":
        return f"{action_type} | {cfg.get('id_raw', '')}"
    if action_type == "dynamic/run_command":
        return f"{action_type} | {cfg.get('template_raw', '')}"
    return f"{action_type} | {cfg.get('value_raw', '')}"

