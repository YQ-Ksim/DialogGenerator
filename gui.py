from __future__ import annotations

import json
from pathlib import Path
import tkinter as tk
from tkinter import filedialog, messagebox, ttk
from typing import Any, Dict, List

from dialog_builder import (
    ValidationError,
    build_body_item,
    build_dialog,
    build_input_item,
)
from dialog_types import AFTER_ACTIONS, BODY_TYPES, DIALOG_TYPES, INPUT_TYPES
from font_builder import (
    FontBuildError,
    build_bitmap_provider,
    build_reference_provider,
    build_space_provider,
    convert_image_to_bitmap_png,
    generate_chars_from_codepoint,
    parse_space_advances,
    validate_minecraft_bitmap_png,
    write_font_json,
)
from ui_elements import ActionEditorDialog, action_to_text


class BodyItemDialog(tk.Toplevel):
    def __init__(self, master: tk.Widget, initial: Dict[str, Any] | None = None) -> None:
        super().__init__(master)
        self.title("Body Item")
        self.transient(master)
        self.grab_set()
        self.result: Dict[str, Any] | None = None

        data = initial or {}
        root = ttk.Frame(self, padding=10)
        root.grid(sticky="nsew")
        self.columnconfigure(0, weight=1)
        self.rowconfigure(0, weight=1)
        root.columnconfigure(1, weight=1)

        ttk.Label(root, text="type").grid(row=0, column=0, sticky="w", padx=4, pady=3)
        self.type_var = tk.StringVar(value=data.get("kind", "plain_message"))
        ttk.Combobox(root, textvariable=self.type_var, values=BODY_TYPES, state="readonly").grid(
            row=0, column=1, sticky="ew", padx=4, pady=3
        )

        self.contents_var = self._entry(root, 1, "contents (text/json)", data.get("fields", {}).get("contents_raw", ""))
        self.item_var = self._entry(root, 2, "item (json or id)", data.get("fields", {}).get("item_raw", ""))
        self.description_var = self._entry(
            root, 3, "description (text/json)", data.get("fields", {}).get("description_raw", "")
        )
        self.width_var = self._entry(root, 4, "width", data.get("fields", {}).get("width_raw", ""))
        self.height_var = self._entry(root, 5, "height", data.get("fields", {}).get("height_raw", ""))

        self.show_decorations = tk.BooleanVar(value=data.get("fields", {}).get("show_decorations", True))
        ttk.Checkbutton(root, text="show_decorations", variable=self.show_decorations).grid(
            row=6, column=0, columnspan=2, sticky="w", padx=4, pady=3
        )
        self.show_tooltip = tk.BooleanVar(value=data.get("fields", {}).get("show_tooltip", True))
        ttk.Checkbutton(root, text="show_tooltip", variable=self.show_tooltip).grid(
            row=7, column=0, columnspan=2, sticky="w", padx=4, pady=3
        )

        foot = ttk.Frame(root)
        foot.grid(row=8, column=0, columnspan=2, sticky="e", pady=(8, 0))
        ttk.Button(foot, text="Cancel", command=self.destroy).pack(side=tk.RIGHT, padx=4)
        ttk.Button(foot, text="Save", command=self._save).pack(side=tk.RIGHT, padx=4)

        self.wait_window(self)

    @staticmethod
    def _entry(parent: ttk.Frame, row: int, label: str, value: str) -> tk.StringVar:
        ttk.Label(parent, text=label).grid(row=row, column=0, sticky="w", padx=4, pady=3)
        var = tk.StringVar(value=value)
        ttk.Entry(parent, textvariable=var).grid(row=row, column=1, sticky="ew", padx=4, pady=3)
        return var

    def _save(self) -> None:
        kind = self.type_var.get().strip()
        fields = {
            "contents_raw": self.contents_var.get().strip(),
            "item_raw": self.item_var.get().strip(),
            "description_raw": self.description_var.get().strip(),
            "width_raw": self.width_var.get().strip(),
            "height_raw": self.height_var.get().strip(),
            "show_decorations": self.show_decorations.get(),
            "show_tooltip": self.show_tooltip.get(),
        }
        try:
            build_body_item(kind, fields)
        except Exception as exc:
            messagebox.showerror("Invalid Body Item", str(exc), parent=self)
            return
        self.result = {"kind": kind, "fields": fields}
        self.destroy()


class InputItemDialog(tk.Toplevel):
    def __init__(self, master: tk.Widget, initial: Dict[str, Any] | None = None) -> None:
        super().__init__(master)
        self.title("Input Item")
        self.transient(master)
        self.grab_set()
        self.result: Dict[str, Any] | None = None

        data = initial or {}
        fields = data.get("fields", {})
        root = ttk.Frame(self, padding=10)
        root.grid(sticky="nsew")
        self.columnconfigure(0, weight=1)
        self.rowconfigure(0, weight=1)
        root.columnconfigure(1, weight=1)

        ttk.Label(root, text="type").grid(row=0, column=0, sticky="w", padx=4, pady=3)
        self.type_var = tk.StringVar(value=data.get("kind", INPUT_TYPES[0]))
        ttk.Combobox(root, textvariable=self.type_var, values=INPUT_TYPES, state="readonly").grid(
            row=0, column=1, sticky="ew", padx=4, pady=3
        )

        self.key_var = self._entry(root, 1, "key", fields.get("key", ""))
        self.label_var = self._entry(root, 2, "label (text/json)", fields.get("label_raw", ""))
        self.width_var = self._entry(root, 3, "width", fields.get("width_raw", ""))
        self.initial_var = self._entry(root, 4, "initial (number/text)", fields.get("initial_raw", ""))
        self.initial_text_var = self._entry(root, 5, "initial_text (text)", fields.get("initial_text", ""))

        self.start_var = self._entry(root, 6, "start", fields.get("start_raw", ""))
        self.end_var = self._entry(root, 7, "end", fields.get("end_raw", ""))
        self.step_var = self._entry(root, 8, "step", fields.get("step_raw", ""))
        self.label_format_var = self._entry(root, 9, "label_format", fields.get("label_format", ""))
        self.max_length_var = self._entry(root, 10, "max_length", fields.get("max_length_raw", ""))
        self.max_lines_var = self._entry(root, 11, "max_lines", fields.get("max_lines_raw", ""))
        self.height_var = self._entry(root, 12, "height", fields.get("height_raw", ""))
        self.on_false_var = self._entry(root, 13, "on_false", fields.get("on_false", ""))
        self.on_true_var = self._entry(root, 14, "on_true", fields.get("on_true", ""))

        ttk.Label(root, text="single_option options (one per line: id | display | initial)").grid(
            row=15, column=0, sticky="nw", padx=4, pady=3
        )
        self.options_text = tk.Text(root, height=5, width=40)
        self.options_text.grid(row=15, column=1, sticky="ew", padx=4, pady=3)
        self.options_text.insert("1.0", fields.get("options_raw", ""))

        self.initial_check = tk.BooleanVar(value=fields.get("initial", False))
        ttk.Checkbutton(root, text="boolean initial", variable=self.initial_check).grid(
            row=16, column=0, columnspan=2, sticky="w", padx=4, pady=3
        )
        self.label_visible = tk.BooleanVar(value=fields.get("label_visible", True))
        ttk.Checkbutton(root, text="label_visible", variable=self.label_visible).grid(
            row=17, column=0, columnspan=2, sticky="w", padx=4, pady=3
        )
        self.multiline_enabled = tk.BooleanVar(value=fields.get("multiline_enabled", False))
        ttk.Checkbutton(root, text="multiline enabled", variable=self.multiline_enabled).grid(
            row=18, column=0, columnspan=2, sticky="w", padx=4, pady=3
        )

        foot = ttk.Frame(root)
        foot.grid(row=19, column=0, columnspan=2, sticky="e", pady=(8, 0))
        ttk.Button(foot, text="Cancel", command=self.destroy).pack(side=tk.RIGHT, padx=4)
        ttk.Button(foot, text="Save", command=self._save).pack(side=tk.RIGHT, padx=4)

        self.wait_window(self)

    @staticmethod
    def _entry(parent: ttk.Frame, row: int, label: str, value: str) -> tk.StringVar:
        ttk.Label(parent, text=label).grid(row=row, column=0, sticky="w", padx=4, pady=3)
        var = tk.StringVar(value=value)
        ttk.Entry(parent, textvariable=var).grid(row=row, column=1, sticky="ew", padx=4, pady=3)
        return var

    def _save(self) -> None:
        kind = self.type_var.get().strip()
        fields = {
            "key": self.key_var.get().strip(),
            "label_raw": self.label_var.get().strip(),
            "width_raw": self.width_var.get().strip(),
            "initial_raw": self.initial_var.get().strip(),
            "initial_text": self.initial_text_var.get(),
            "start_raw": self.start_var.get().strip(),
            "end_raw": self.end_var.get().strip(),
            "step_raw": self.step_var.get().strip(),
            "label_format": self.label_format_var.get().strip(),
            "max_length_raw": self.max_length_var.get().strip(),
            "max_lines_raw": self.max_lines_var.get().strip(),
            "height_raw": self.height_var.get().strip(),
            "on_false": self.on_false_var.get().strip(),
            "on_true": self.on_true_var.get().strip(),
            "options_raw": self.options_text.get("1.0", "end").strip(),
            "initial": self.initial_check.get(),
            "label_visible": self.label_visible.get(),
            "multiline_enabled": self.multiline_enabled.get(),
        }
        try:
            build_input_item(kind, fields)
        except Exception as exc:
            messagebox.showerror("Invalid Input Item", str(exc), parent=self)
            return
        self.result = {"kind": kind, "fields": fields}
        self.destroy()


class FontToolWindow(tk.Toplevel):
    def __init__(self, master: tk.Widget) -> None:
        super().__init__(master)
        self.title("Font Tools")
        self.geometry("980x700")
        self.transient(master)

        root = ttk.Frame(self, padding=10)
        root.pack(fill="both", expand=True)
        root.columnconfigure(1, weight=1)

        self.namespace_var = tk.StringVar(value="minecraft")
        self.font_id_var = tk.StringVar(value="custom_font")
        self.image_var = tk.StringVar(value="")
        self.columns_var = tk.StringVar(value="16")
        self.rows_var = tk.StringVar(value="16")
        self.start_cp_var = tk.StringVar(value="0xE000")
        self.height_var = tk.StringVar(value="8")
        self.ascent_var = tk.StringVar(value="7")
        self.threshold_var = tk.StringVar(value="8")
        self.resize_w_var = tk.StringVar(value="")
        self.resize_h_var = tk.StringVar(value="")
        self.ref_font_var = tk.StringVar(value="minecraft:default")

        self._entry(root, 0, "namespace", self.namespace_var)
        self._entry(root, 1, "font id", self.font_id_var)
        self._entry(root, 2, "input image", self.image_var)
        ttk.Button(root, text="Browse...", command=self._pick_image).grid(row=2, column=2, padx=4, pady=3)

        self._entry(root, 3, "columns", self.columns_var)
        self._entry(root, 4, "rows", self.rows_var)
        self._entry(root, 5, "start codepoint", self.start_cp_var)
        self._entry(root, 6, "glyph height", self.height_var)
        self._entry(root, 7, "glyph ascent", self.ascent_var)
        self._entry(root, 8, "threshold(0-255)", self.threshold_var)
        self._entry(root, 9, "resize cell width(optional)", self.resize_w_var)
        self._entry(root, 10, "resize cell height(optional)", self.resize_h_var)

        ttk.Label(root, text="space advances (one per line: char=float)").grid(row=11, column=0, sticky="nw", padx=4, pady=3)
        self.space_text = tk.Text(root, width=42, height=4)
        self.space_text.grid(row=11, column=1, sticky="ew", padx=4, pady=3)
        self.space_text.insert("1.0", "<space>=4\n<tab>=4")

        self._entry(root, 12, "reference font id", self.ref_font_var)

        buttons = ttk.Frame(root)
        buttons.grid(row=13, column=0, columnspan=3, sticky="w", pady=(8, 6))
        ttk.Button(buttons, text="Convert Image + Write Bitmap Provider", command=self._write_bitmap).pack(
            side=tk.LEFT, padx=3
        )
        ttk.Button(buttons, text="Validate Existing PNG", command=self._validate_png).pack(side=tk.LEFT, padx=3)
        ttk.Button(buttons, text="Append Space Provider", command=self._append_space_provider).pack(side=tk.LEFT, padx=3)
        ttk.Button(buttons, text="Append Reference Provider", command=self._append_reference_provider).pack(
            side=tk.LEFT, padx=3
        )

        ttk.Label(root, text="Output").grid(row=14, column=0, sticky="nw", padx=4, pady=3)
        self.output_text = tk.Text(root, height=14)
        self.output_text.grid(row=14, column=1, columnspan=2, sticky="nsew", padx=4, pady=3)
        root.rowconfigure(14, weight=1)

    @staticmethod
    def _entry(parent: ttk.Frame, row: int, label: str, var: tk.StringVar) -> None:
        ttk.Label(parent, text=label).grid(row=row, column=0, sticky="w", padx=4, pady=3)
        ttk.Entry(parent, textvariable=var).grid(row=row, column=1, sticky="ew", padx=4, pady=3)

    def _log(self, text: str) -> None:
        self.output_text.insert("end", f"{text}\n")
        self.output_text.see("end")

    def _pick_image(self) -> None:
        path = filedialog.askopenfilename(
            title="Select image",
            filetypes=[("Image files", "*.png;*.jpg;*.jpeg;*.bmp;*.webp"), ("All files", "*.*")],
        )
        if path:
            self.image_var.set(path)

    def _font_json_path(self) -> Path:
        return Path.cwd() / "assets" / self.namespace_var.get().strip() / "font" / f"{self.font_id_var.get().strip()}.json"

    def _texture_path(self) -> Path:
        return (
            Path.cwd()
            / "assets"
            / self.namespace_var.get().strip()
            / "textures"
            / "font"
            / f"{self.font_id_var.get().strip()}.png"
        )

    def _provider_file_ref(self) -> str:
        return f"{self.namespace_var.get().strip()}:font/{self.font_id_var.get().strip()}.png"

    def _parse_int(self, value: str, default: int | None = None, base: int = 10) -> int:
        v = value.strip()
        if not v:
            if default is None:
                raise FontBuildError("required numeric field is empty")
            return default
        return int(v, base)

    def _write_bitmap(self) -> None:
        try:
            namespace = self.namespace_var.get().strip()
            font_id = self.font_id_var.get().strip()
            image_path = Path(self.image_var.get().strip())
            if not namespace or not font_id:
                raise FontBuildError("namespace/font id cannot be empty")
            if not image_path.exists():
                raise FontBuildError("input image does not exist")

            cols = self._parse_int(self.columns_var.get())
            rows = self._parse_int(self.rows_var.get())
            start_cp = int(self.start_cp_var.get().strip(), 0)
            glyph_height = self._parse_int(self.height_var.get(), 8)
            glyph_ascent = self._parse_int(self.ascent_var.get(), 7)
            threshold = self._parse_int(self.threshold_var.get(), 8)
            resize_w = self._parse_int(self.resize_w_var.get(), 0) or None
            resize_h = self._parse_int(self.resize_h_var.get(), 0) or None

            texture_out = self._texture_path()
            size = convert_image_to_bitmap_png(
                input_path=image_path,
                output_path=texture_out,
                columns=cols,
                rows=rows,
                cell_width=resize_w,
                cell_height=resize_h,
                threshold=threshold,
            )
            chars = generate_chars_from_codepoint(start_cp, cols, rows)
            provider = build_bitmap_provider(
                file_ref=self._provider_file_ref(),
                chars=chars,
                height=glyph_height,
                ascent=glyph_ascent,
            )
            font_json_path = self._font_json_path()
            font_json = write_font_json(font_json_path, [provider], append=True)

            self._log(f"Converted image -> {texture_out} size={size[0]}x{size[1]}")
            self._log(f"Updated font json -> {font_json_path}")
            self._log(json.dumps(font_json, indent=2, ensure_ascii=False))
        except (FontBuildError, ValueError, json.JSONDecodeError) as exc:
            messagebox.showerror("Font Tool Error", str(exc), parent=self)

    def _validate_png(self) -> None:
        try:
            image_path = Path(self.image_var.get().strip())
            if not image_path.exists():
                raise FontBuildError("input image does not exist")
            validate_minecraft_bitmap_png(image_path)
            self._log(f"PNG is valid for minecraft bitmap provider: {image_path}")
        except (FontBuildError, ValueError) as exc:
            messagebox.showerror("Validate PNG Failed", str(exc), parent=self)

    def _append_space_provider(self) -> None:
        try:
            lines = self.space_text.get("1.0", "end").splitlines()
            advances = parse_space_advances(lines)
            provider = build_space_provider(advances)
            font_json_path = self._font_json_path()
            font_json = write_font_json(font_json_path, [provider], append=True)
            self._log(f"Appended space provider -> {font_json_path}")
            self._log(json.dumps(provider, ensure_ascii=False))
            self._log(json.dumps(font_json, indent=2, ensure_ascii=False))
        except (FontBuildError, ValueError, json.JSONDecodeError) as exc:
            messagebox.showerror("Space Provider Failed", str(exc), parent=self)

    def _append_reference_provider(self) -> None:
        try:
            provider = build_reference_provider(self.ref_font_var.get())
            font_json_path = self._font_json_path()
            font_json = write_font_json(font_json_path, [provider], append=True)
            self._log(f"Appended reference provider -> {font_json_path}")
            self._log(json.dumps(provider, ensure_ascii=False))
            self._log(json.dumps(font_json, indent=2, ensure_ascii=False))
        except (FontBuildError, ValueError, json.JSONDecodeError) as exc:
            messagebox.showerror("Reference Provider Failed", str(exc), parent=self)


class App(tk.Tk):
    def __init__(self) -> None:
        super().__init__()
        self.title("Minecraft Dialog JSON Generator")
        self.geometry("1180x820")

        self.body_items: List[Dict[str, Any]] = []
        self.input_items: List[Dict[str, Any]] = []
        self.multi_actions: List[Dict[str, Any]] = []
        self.yes_action: Dict[str, Any] = {"action_type": "show_dialog", "value_raw": "minecraft:ok"}
        self.no_action: Dict[str, Any] = {"action_type": "show_dialog", "value_raw": "minecraft:cancel"}
        self.notice_action: Dict[str, Any] = {"action_type": "show_dialog", "value_raw": "minecraft:ok"}
        self.exit_action: Dict[str, Any] | None = None

        self._build_ui()
        self._switch_type_frame()

    def _build_ui(self) -> None:
        top = ttk.LabelFrame(self, text="General")
        top.pack(fill="x", padx=8, pady=6)
        for i in range(6):
            top.columnconfigure(i, weight=1 if i % 2 == 1 else 0)

        self.namespace_var = tk.StringVar(value="minecraft")
        self.dialog_id_var = tk.StringVar(value="example_dialog")
        self.title_var = tk.StringVar(value="Dialog Title")
        self.external_title_var = tk.StringVar(value="")
        self.type_var = tk.StringVar(value="notice")
        self.after_action_var = tk.StringVar(value="close")
        self.pause_var = tk.BooleanVar(value=True)
        self.escape_var = tk.BooleanVar(value=True)
        self.tag_pause_additions_var = tk.BooleanVar(value=False)
        self.tag_quick_actions_var = tk.BooleanVar(value=False)

        self._entry(top, 0, 0, "namespace", self.namespace_var)
        self._entry(top, 0, 2, "dialog id", self.dialog_id_var)
        self._entry(top, 0, 4, "title (text/json)", self.title_var)
        self._entry(top, 1, 0, "external_title", self.external_title_var)

        ttk.Label(top, text="type").grid(row=1, column=2, sticky="w", padx=4, pady=3)
        ttk.Combobox(top, textvariable=self.type_var, values=DIALOG_TYPES, state="readonly").grid(
            row=1, column=3, sticky="ew", padx=4, pady=3
        )
        self.type_var.trace_add("write", lambda *_: self._switch_type_frame())

        ttk.Label(top, text="after_action").grid(row=1, column=4, sticky="w", padx=4, pady=3)
        ttk.Combobox(top, textvariable=self.after_action_var, values=AFTER_ACTIONS, state="readonly").grid(
            row=1, column=5, sticky="ew", padx=4, pady=3
        )

        flags = ttk.Frame(top)
        flags.grid(row=2, column=0, columnspan=6, sticky="w")
        ttk.Checkbutton(flags, text="pause", variable=self.pause_var).pack(side=tk.LEFT, padx=6, pady=4)
        ttk.Checkbutton(flags, text="can_close_with_escape", variable=self.escape_var).pack(side=tk.LEFT, padx=6, pady=4)
        ttk.Checkbutton(flags, text="tag: #pause_screen_additions", variable=self.tag_pause_additions_var).pack(
            side=tk.LEFT, padx=6, pady=4
        )
        ttk.Checkbutton(flags, text="tag: #quick_actions", variable=self.tag_quick_actions_var).pack(
            side=tk.LEFT, padx=6, pady=4
        )

        notebook = ttk.Notebook(self)
        notebook.pack(fill="both", expand=True, padx=8, pady=6)

        self.body_tab = ttk.Frame(notebook)
        self.inputs_tab = ttk.Frame(notebook)
        self.type_tab = ttk.Frame(notebook)
        self.output_tab = ttk.Frame(notebook)
        notebook.add(self.body_tab, text="Body")
        notebook.add(self.inputs_tab, text="Inputs")
        notebook.add(self.type_tab, text="Type Config")
        notebook.add(self.output_tab, text="Preview & Save")

        self._build_body_tab()
        self._build_inputs_tab()
        self._build_type_tab()
        self._build_output_tab()

    @staticmethod
    def _entry(parent: ttk.Widget, row: int, col: int, label: str, var: tk.StringVar) -> None:
        ttk.Label(parent, text=label).grid(row=row, column=col, sticky="w", padx=4, pady=3)
        ttk.Entry(parent, textvariable=var).grid(row=row, column=col + 1, sticky="ew", padx=4, pady=3)

    def _build_body_tab(self) -> None:
        self.body_tab.columnconfigure(0, weight=1)
        self.body_tab.rowconfigure(0, weight=1)

        self.body_list = tk.Listbox(self.body_tab, height=16)
        self.body_list.grid(row=0, column=0, sticky="nsew", padx=8, pady=8)
        side = ttk.Frame(self.body_tab)
        side.grid(row=0, column=1, sticky="ns", padx=6, pady=8)
        ttk.Button(side, text="Add", command=self._add_body).pack(fill="x", pady=2)
        ttk.Button(side, text="Edit", command=self._edit_body).pack(fill="x", pady=2)
        ttk.Button(side, text="Delete", command=self._delete_body).pack(fill="x", pady=2)

    def _build_inputs_tab(self) -> None:
        self.inputs_tab.columnconfigure(0, weight=1)
        self.inputs_tab.rowconfigure(0, weight=1)

        self.inputs_list = tk.Listbox(self.inputs_tab, height=16)
        self.inputs_list.grid(row=0, column=0, sticky="nsew", padx=8, pady=8)
        side = ttk.Frame(self.inputs_tab)
        side.grid(row=0, column=1, sticky="ns", padx=6, pady=8)
        ttk.Button(side, text="Add", command=self._add_input).pack(fill="x", pady=2)
        ttk.Button(side, text="Edit", command=self._edit_input).pack(fill="x", pady=2)
        ttk.Button(side, text="Delete", command=self._delete_input).pack(fill="x", pady=2)

    def _build_type_tab(self) -> None:
        self.type_tab.columnconfigure(0, weight=1)
        self.type_tab.rowconfigure(0, weight=1)
        holder = ttk.Frame(self.type_tab)
        holder.grid(row=0, column=0, sticky="nsew", padx=8, pady=8)
        holder.columnconfigure(0, weight=1)
        holder.rowconfigure(0, weight=1)
        self.type_holder = holder

        self.confirmation_frame = self._build_confirmation_frame(holder)
        self.notice_frame = self._build_notice_frame(holder)
        self.dialog_list_frame = self._build_dialog_list_frame(holder)
        self.multi_action_frame = self._build_multi_action_frame(holder)
        self.server_links_frame = self._build_server_links_frame(holder)

    def _build_confirmation_frame(self, parent: ttk.Frame) -> ttk.Frame:
        frame = ttk.LabelFrame(parent, text="confirmation")
        self.yes_label = tk.StringVar(value=action_to_text(self.yes_action))
        self.no_label = tk.StringVar(value=action_to_text(self.no_action))
        ttk.Label(frame, text="yes").grid(row=0, column=0, sticky="w", padx=4, pady=4)
        ttk.Label(frame, textvariable=self.yes_label).grid(row=0, column=1, sticky="w", padx=4, pady=4)
        ttk.Button(frame, text="Edit yes", command=self._edit_yes_action).grid(row=0, column=2, padx=4, pady=4)
        ttk.Label(frame, text="no").grid(row=1, column=0, sticky="w", padx=4, pady=4)
        ttk.Label(frame, textvariable=self.no_label).grid(row=1, column=1, sticky="w", padx=4, pady=4)
        ttk.Button(frame, text="Edit no", command=self._edit_no_action).grid(row=1, column=2, padx=4, pady=4)
        return frame

    def _build_notice_frame(self, parent: ttk.Frame) -> ttk.Frame:
        frame = ttk.LabelFrame(parent, text="notice")
        self.notice_label = tk.StringVar(value=action_to_text(self.notice_action))
        ttk.Label(frame, textvariable=self.notice_label).grid(row=0, column=0, sticky="w", padx=4, pady=4)
        ttk.Button(frame, text="Edit action", command=self._edit_notice_action).grid(row=0, column=1, padx=4, pady=4)
        return frame

    def _build_dialog_list_frame(self, parent: ttk.Frame) -> ttk.Frame:
        frame = ttk.LabelFrame(parent, text="dialog_list")
        frame.columnconfigure(1, weight=1)
        self.dialog_list_columns = tk.StringVar(value="2")
        self.dialog_list_button_width = tk.StringVar(value="150")
        self.dialogs_raw = tk.StringVar(value="")
        self._entry(frame, 0, 0, "columns", self.dialog_list_columns)
        self._entry(frame, 1, 0, "button_width", self.dialog_list_button_width)

        ttk.Label(frame, text="dialogs (one per line)").grid(row=2, column=0, sticky="nw", padx=4, pady=4)
        self.dialogs_text = tk.Text(frame, height=8)
        self.dialogs_text.grid(row=2, column=1, sticky="ew", padx=4, pady=4)

        self.has_exit_action = tk.BooleanVar(value=False)
        ttk.Checkbutton(frame, text="enable exit_action", variable=self.has_exit_action).grid(
            row=3, column=0, sticky="w", padx=4, pady=4
        )
        self.exit_label = tk.StringVar(value="(none)")
        ttk.Label(frame, textvariable=self.exit_label).grid(row=3, column=1, sticky="w", padx=4, pady=4)
        ttk.Button(frame, text="Edit exit_action", command=self._edit_exit_action).grid(row=3, column=2, padx=4, pady=4)
        return frame

    def _build_multi_action_frame(self, parent: ttk.Frame) -> ttk.Frame:
        frame = ttk.LabelFrame(parent, text="multi_action")
        frame.columnconfigure(0, weight=1)
        self.multi_columns = tk.StringVar(value="2")
        self._entry(frame, 0, 0, "columns", self.multi_columns)

        self.multi_list = tk.Listbox(frame, height=10)
        self.multi_list.grid(row=1, column=0, sticky="nsew", padx=4, pady=4)
        side = ttk.Frame(frame)
        side.grid(row=1, column=1, sticky="ns", padx=4, pady=4)
        ttk.Button(side, text="Add", command=self._add_multi_action).pack(fill="x", pady=2)
        ttk.Button(side, text="Edit", command=self._edit_multi_action).pack(fill="x", pady=2)
        ttk.Button(side, text="Delete", command=self._delete_multi_action).pack(fill="x", pady=2)

        self.multi_has_exit = tk.BooleanVar(value=False)
        ttk.Checkbutton(frame, text="enable exit_action", variable=self.multi_has_exit).grid(
            row=2, column=0, sticky="w", padx=4, pady=4
        )
        self.multi_exit_label = tk.StringVar(value="(none)")
        ttk.Label(frame, textvariable=self.multi_exit_label).grid(row=2, column=0, sticky="e", padx=4, pady=4)
        ttk.Button(frame, text="Edit exit_action", command=self._edit_exit_action).grid(row=2, column=1, padx=4, pady=4)
        return frame

    def _build_server_links_frame(self, parent: ttk.Frame) -> ttk.Frame:
        frame = ttk.LabelFrame(parent, text="server_links")
        self.server_columns = tk.StringVar(value="2")
        self.server_button_width = tk.StringVar(value="150")
        self._entry(frame, 0, 0, "columns", self.server_columns)
        self._entry(frame, 1, 0, "button_width", self.server_button_width)
        self.server_has_exit = tk.BooleanVar(value=False)
        ttk.Checkbutton(frame, text="enable exit_action", variable=self.server_has_exit).grid(
            row=2, column=0, sticky="w", padx=4, pady=4
        )
        self.server_exit_label = tk.StringVar(value="(none)")
        ttk.Label(frame, textvariable=self.server_exit_label).grid(row=2, column=1, sticky="w", padx=4, pady=4)
        ttk.Button(frame, text="Edit exit_action", command=self._edit_exit_action).grid(row=2, column=2, padx=4, pady=4)
        return frame

    def _build_output_tab(self) -> None:
        top = ttk.Frame(self.output_tab)
        top.pack(fill="x", padx=8, pady=6)
        ttk.Button(top, text="Generate Preview", command=self._generate_preview).pack(side=tk.LEFT, padx=3)
        ttk.Button(top, text="Save JSON", command=self._save_json).pack(side=tk.LEFT, padx=3)
        ttk.Button(top, text="Font Tools", command=self._open_font_tools).pack(side=tk.LEFT, padx=3)
        self.save_path_var = tk.StringVar(value="")
        ttk.Label(top, textvariable=self.save_path_var).pack(side=tk.LEFT, padx=8)

        self.preview = tk.Text(self.output_tab)
        self.preview.pack(fill="both", expand=True, padx=8, pady=6)

    def _open_font_tools(self) -> None:
        FontToolWindow(self)

    def _switch_type_frame(self) -> None:
        for frame in (
            self.confirmation_frame,
            self.notice_frame,
            self.dialog_list_frame,
            self.multi_action_frame,
            self.server_links_frame,
        ):
            frame.grid_forget()
        kind = self.type_var.get().strip()
        mapping = {
            "confirmation": self.confirmation_frame,
            "notice": self.notice_frame,
            "dialog_list": self.dialog_list_frame,
            "multi_action": self.multi_action_frame,
            "server_links": self.server_links_frame,
        }
        mapping.get(kind, self.notice_frame).grid(row=0, column=0, sticky="nsew")

    def _add_body(self) -> None:
        dlg = BodyItemDialog(self)
        if dlg.result:
            self.body_items.append(dlg.result)
            self._refresh_body()

    def _edit_body(self) -> None:
        idx = self._selected_index(self.body_list)
        if idx is None:
            return
        dlg = BodyItemDialog(self, self.body_items[idx])
        if dlg.result:
            self.body_items[idx] = dlg.result
            self._refresh_body()

    def _delete_body(self) -> None:
        idx = self._selected_index(self.body_list)
        if idx is None:
            return
        del self.body_items[idx]
        self._refresh_body()

    def _refresh_body(self) -> None:
        self.body_list.delete(0, tk.END)
        for item in self.body_items:
            kind = item["kind"]
            key = item["fields"].get("contents_raw") or item["fields"].get("item_raw", "")
            self.body_list.insert(tk.END, f"{kind} | {key}")

    def _add_input(self) -> None:
        dlg = InputItemDialog(self)
        if dlg.result:
            self.input_items.append(dlg.result)
            self._refresh_inputs()

    def _edit_input(self) -> None:
        idx = self._selected_index(self.inputs_list)
        if idx is None:
            return
        dlg = InputItemDialog(self, self.input_items[idx])
        if dlg.result:
            self.input_items[idx] = dlg.result
            self._refresh_inputs()

    def _delete_input(self) -> None:
        idx = self._selected_index(self.inputs_list)
        if idx is None:
            return
        del self.input_items[idx]
        self._refresh_inputs()

    def _refresh_inputs(self) -> None:
        self.inputs_list.delete(0, tk.END)
        for item in self.input_items:
            self.inputs_list.insert(tk.END, f"{item['kind']} | {item['fields'].get('key', '')}")

    def _edit_yes_action(self) -> None:
        dlg = ActionEditorDialog(self, self.yes_action)
        if dlg.result:
            self.yes_action = dlg.result
            self.yes_label.set(action_to_text(self.yes_action))

    def _edit_no_action(self) -> None:
        dlg = ActionEditorDialog(self, self.no_action)
        if dlg.result:
            self.no_action = dlg.result
            self.no_label.set(action_to_text(self.no_action))

    def _edit_notice_action(self) -> None:
        dlg = ActionEditorDialog(self, self.notice_action)
        if dlg.result:
            self.notice_action = dlg.result
            self.notice_label.set(action_to_text(self.notice_action))

    def _edit_exit_action(self) -> None:
        dlg = ActionEditorDialog(self, self.exit_action or {})
        if dlg.result:
            self.exit_action = dlg.result
            text = action_to_text(self.exit_action)
            self.exit_label.set(text)
            self.multi_exit_label.set(text)
            self.server_exit_label.set(text)

    def _add_multi_action(self) -> None:
        dlg = ActionEditorDialog(self)
        if dlg.result:
            self.multi_actions.append(dlg.result)
            self._refresh_multi_actions()

    def _edit_multi_action(self) -> None:
        idx = self._selected_index(self.multi_list)
        if idx is None:
            return
        dlg = ActionEditorDialog(self, self.multi_actions[idx])
        if dlg.result:
            self.multi_actions[idx] = dlg.result
            self._refresh_multi_actions()

    def _delete_multi_action(self) -> None:
        idx = self._selected_index(self.multi_list)
        if idx is None:
            return
        del self.multi_actions[idx]
        self._refresh_multi_actions()

    def _refresh_multi_actions(self) -> None:
        self.multi_list.delete(0, tk.END)
        for action in self.multi_actions:
            self.multi_list.insert(tk.END, action_to_text(action))

    @staticmethod
    def _selected_index(listbox: tk.Listbox) -> int | None:
        selected = listbox.curselection()
        if not selected:
            return None
        return int(selected[0])

    def _collect_payload(self) -> Dict[str, Any]:
        body_built = [build_body_item(x["kind"], x["fields"]) for x in self.body_items]
        input_built = [build_input_item(x["kind"], x["fields"]) for x in self.input_items]

        payload: Dict[str, Any] = {
            "type": self.type_var.get().strip(),
            "title_raw": self.title_var.get().strip(),
            "external_title_raw": self.external_title_var.get().strip(),
            "after_action": self.after_action_var.get().strip(),
            "pause": self.pause_var.get(),
            "can_close_with_escape": self.escape_var.get(),
            "body_items": body_built,
            "input_items": input_built,
        }
        kind = payload["type"]
        if kind == "confirmation":
            payload["yes_action"] = self.yes_action
            payload["no_action"] = self.no_action
        elif kind == "notice":
            payload["notice_action"] = self.notice_action
        elif kind == "dialog_list":
            payload["columns_raw"] = self.dialog_list_columns.get().strip()
            payload["button_width_raw"] = self.dialog_list_button_width.get().strip()
            payload["dialogs_raw"] = self.dialogs_text.get("1.0", "end").strip()
            if self.has_exit_action.get():
                payload["exit_action"] = self.exit_action
        elif kind == "multi_action":
            payload["columns_raw"] = self.multi_columns.get().strip()
            payload["multi_actions"] = self.multi_actions
            if self.multi_has_exit.get():
                payload["exit_action"] = self.exit_action
        elif kind == "server_links":
            payload["columns_raw"] = self.server_columns.get().strip()
            payload["button_width_raw"] = self.server_button_width.get().strip()
            if self.server_has_exit.get():
                payload["exit_action"] = self.exit_action
        return payload

    def _generate_preview(self) -> None:
        try:
            dialog = build_dialog(self._collect_payload())
            text = json.dumps(dialog, indent=2, ensure_ascii=False)
            self.preview.delete("1.0", tk.END)
            self.preview.insert("1.0", text)
        except (ValidationError, ValueError, json.JSONDecodeError) as exc:
            messagebox.showerror("Generate Failed", str(exc), parent=self)

    def _save_json(self) -> None:
        namespace = self.namespace_var.get().strip()
        dialog_id = self.dialog_id_var.get().strip()
        if not namespace or not dialog_id:
            messagebox.showerror("Save Failed", "namespace and dialog id are required", parent=self)
            return
        try:
            dialog = build_dialog(self._collect_payload())
        except (ValidationError, ValueError, json.JSONDecodeError) as exc:
            messagebox.showerror("Save Failed", str(exc), parent=self)
            return

        output = Path.cwd() / "data" / namespace / "dialog" / f"{dialog_id}.json"
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(json.dumps(dialog, indent=2, ensure_ascii=False), encoding="utf-8")

        full_id = f"{namespace}:{dialog_id}"
        if self.tag_pause_additions_var.get():
            self._upsert_tag("pause_screen_additions", full_id)
        if self.tag_quick_actions_var.get():
            self._upsert_tag("quick_actions", full_id)

        self.save_path_var.set(str(output))
        self.preview.delete("1.0", tk.END)
        self.preview.insert("1.0", json.dumps(dialog, indent=2, ensure_ascii=False))
        messagebox.showinfo("Saved", f"Saved to:\n{output}", parent=self)

    def _upsert_tag(self, tag_name: str, dialog_full_id: str) -> None:
        path = Path.cwd() / "data" / "minecraft" / "tags" / "dialog" / f"{tag_name}.json"
        path.parent.mkdir(parents=True, exist_ok=True)
        data: Dict[str, Any] = {"replace": False, "values": []}
        if path.exists():
            try:
                loaded = json.loads(path.read_text(encoding="utf-8"))
                if isinstance(loaded, dict):
                    data = loaded
            except Exception:
                pass
        values = data.get("values")
        if not isinstance(values, list):
            values = []
            data["values"] = values
        if dialog_full_id not in values:
            values.append(dialog_full_id)
        if "replace" not in data:
            data["replace"] = False
        path.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")


if __name__ == "__main__":
    App().mainloop()

