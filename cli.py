from __future__ import annotations

import argparse
import json
import shutil
import sys
from pathlib import Path
from typing import Any, Dict, List

from dialog_builder import ValidationError, build_body_item, build_dialog, build_input_item
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


def _load_json(path: Path) -> Dict[str, Any]:
    data = json.loads(path.read_text(encoding="utf-8-sig"))
    if not isinstance(data, dict):
        raise ValueError("payload file must be a JSON object")
    return data


def _normalize_body_items(payload: Dict[str, Any]) -> List[Dict[str, Any]]:
    raw_items = payload.get("body_items", payload.get("body", []))
    if not isinstance(raw_items, list):
        raise ValueError("body/body_items must be a JSON array")
    normalized: List[Dict[str, Any]] = []
    for item in raw_items:
        if not isinstance(item, dict):
            raise ValueError("body item must be an object")
        if "kind" in item and "fields" in item:
            normalized.append(build_body_item(item["kind"], item["fields"]))
        else:
            normalized.append(item)
    return normalized


def _normalize_input_items(payload: Dict[str, Any]) -> List[Dict[str, Any]]:
    raw_items = payload.get("input_items", payload.get("inputs", []))
    if not isinstance(raw_items, list):
        raise ValueError("inputs/input_items must be a JSON array")
    normalized: List[Dict[str, Any]] = []
    for item in raw_items:
        if not isinstance(item, dict):
            raise ValueError("input item must be an object")
        if "kind" in item and "fields" in item:
            normalized.append(build_input_item(item["kind"], item["fields"]))
        else:
            normalized.append(item)
    return normalized


def _upsert_dialog_tag(base_dir: Path, tag_name: str, dialog_full_id: str) -> Path:
    path = base_dir / "data" / "minecraft" / "tags" / "dialog" / f"{tag_name}.json"
    path.parent.mkdir(parents=True, exist_ok=True)

    data: Dict[str, Any] = {"replace": False, "values": []}
    if path.exists():
        try:
            loaded = json.loads(path.read_text(encoding="utf-8-sig"))
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
    return path


def generate_dialog(
    *,
    namespace: str,
    dialog_id: str,
    payload: Dict[str, Any],
    base_dir: Path,
    output: Path | None,
    tag_pause: bool,
    tag_quick: bool,
) -> Dict[str, Any]:
    merged = dict(payload)
    merged["body_items"] = _normalize_body_items(payload)
    merged["input_items"] = _normalize_input_items(payload)
    dialog_json = build_dialog(merged)

    out_path = output or (base_dir / "data" / namespace / "dialog" / f"{dialog_id}.json")
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(dialog_json, indent=2, ensure_ascii=False), encoding="utf-8")

    full_id = f"{namespace}:{dialog_id}"
    if tag_pause:
        _upsert_dialog_tag(base_dir, "pause_screen_additions", full_id)
    if tag_quick:
        _upsert_dialog_tag(base_dir, "quick_actions", full_id)
    return {"output": str(out_path), "dialog": dialog_json}


def generate_font_bitmap(
    *,
    namespace: str,
    font_id: str,
    input_image: Path,
    base_dir: Path,
    columns: int,
    rows: int,
    start_codepoint: int,
    glyph_height: int,
    glyph_ascent: int,
    threshold: int,
    resize_cell_width: int | None,
    resize_cell_height: int | None,
    output_texture: Path | None,
    output_font_json: Path | None,
    append: bool,
    skip_convert: bool,
) -> Dict[str, Any]:
    texture_out = output_texture or (base_dir / "assets" / namespace / "textures" / "font" / f"{font_id}.png")
    font_out = output_font_json or (base_dir / "assets" / namespace / "font" / f"{font_id}.json")

    if skip_convert:
        validate_minecraft_bitmap_png(input_image)
        texture_out.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(input_image, texture_out)
        texture_source = texture_out
    else:
        convert_image_to_bitmap_png(
            input_path=input_image,
            output_path=texture_out,
            columns=columns,
            rows=rows,
            cell_width=resize_cell_width,
            cell_height=resize_cell_height,
            threshold=threshold,
        )
        texture_source = texture_out

    textures_root = (base_dir / "assets" / namespace / "textures").resolve()
    texture_abs = texture_source.resolve()
    try:
        rel_texture = texture_abs.relative_to(textures_root)
    except ValueError as exc:
        raise FontBuildError(
            f"output texture must be under {textures_root} so provider file can be resolved"
        ) from exc
    file_ref = f"{namespace}:{str(rel_texture).replace('\\', '/')}"
    chars = generate_chars_from_codepoint(start_codepoint, columns, rows)
    provider = build_bitmap_provider(
        file_ref=file_ref,
        chars=chars,
        height=glyph_height,
        ascent=glyph_ascent,
    )
    font_json = write_font_json(font_out, [provider], append=append)

    return {
        "texture": str(texture_source),
        "font_json_path": str(font_out),
        "font_json": font_json,
        "provider": provider,
    }


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Minecraft datapack/resourcepack generator CLI")
    sub = parser.add_subparsers(dest="command")

    p_dialog = sub.add_parser("dialog", help="generate dialog json")
    p_dialog.add_argument("--namespace", required=True)
    p_dialog.add_argument("--dialog-id", required=True)
    p_dialog.add_argument("--payload", required=True)
    p_dialog.add_argument("--base-dir", default=".")
    p_dialog.add_argument("--output", default="")
    p_dialog.add_argument("--tag-pause", action="store_true")
    p_dialog.add_argument("--tag-quick", action="store_true")
    p_dialog.add_argument("--print", action="store_true", dest="print_json")

    p_bitmap = sub.add_parser("font-bitmap", help="convert image and generate bitmap font provider")
    p_bitmap.add_argument("--namespace", required=True)
    p_bitmap.add_argument("--font-id", required=True)
    p_bitmap.add_argument("--input-image", required=True)
    p_bitmap.add_argument("--columns", type=int, required=True)
    p_bitmap.add_argument("--rows", type=int, required=True)
    p_bitmap.add_argument("--start-codepoint", type=lambda s: int(s, 0), default=0xE000)
    p_bitmap.add_argument("--glyph-height", type=int, default=8)
    p_bitmap.add_argument("--glyph-ascent", type=int, default=7)
    p_bitmap.add_argument("--threshold", type=int, default=8)
    p_bitmap.add_argument("--resize-cell-width", type=int, default=0)
    p_bitmap.add_argument("--resize-cell-height", type=int, default=0)
    p_bitmap.add_argument("--base-dir", default=".")
    p_bitmap.add_argument("--output-texture", default="")
    p_bitmap.add_argument("--output-font-json", default="")
    p_bitmap.add_argument("--append", action="store_true")
    p_bitmap.add_argument("--skip-convert", action="store_true", help="use input image directly (only validate PNG)")
    p_bitmap.add_argument("--print", action="store_true", dest="print_json")

    p_space = sub.add_parser("font-space", help="append a space provider to font json")
    p_space.add_argument("--font-json", required=True, help="target font json path")
    p_space.add_argument("--advance", action="append", default=[], help="line in format <char>=<float>")
    p_space.add_argument("--replace", action="store_true", help="replace existing providers instead of appending")
    p_space.add_argument("--print", action="store_true", dest="print_json")

    p_ref = sub.add_parser("font-reference", help="append a reference provider to font json")
    p_ref.add_argument("--font-json", required=True)
    p_ref.add_argument("--id", required=True, help="reference font id, e.g. minecraft:default")
    p_ref.add_argument("--replace", action="store_true", help="replace existing providers instead of appending")
    p_ref.add_argument("--print", action="store_true", dest="print_json")

    return parser


def main(argv: List[str] | None = None) -> int:
    raw_args = list(argv or sys.argv[1:])
    if raw_args and raw_args[0].startswith("-") and raw_args[0] not in {"-h", "--help"}:
        # Backward compatibility: old invocation without subcommand is treated as dialog command.
        raw_args = ["dialog"] + raw_args

    parser = _build_parser()
    args = parser.parse_args(raw_args)
    if not args.command:
        parser.print_help()
        return 2

    try:
        if args.command == "dialog":
            payload = _load_json(Path(args.payload))
            result = generate_dialog(
                namespace=args.namespace.strip(),
                dialog_id=args.dialog_id.strip(),
                payload=payload,
                base_dir=Path(args.base_dir),
                output=Path(args.output) if args.output else None,
                tag_pause=bool(args.tag_pause),
                tag_quick=bool(args.tag_quick),
            )
            print(f"saved: {result['output']}")
            if args.print_json:
                print(json.dumps(result["dialog"], indent=2, ensure_ascii=True))
            return 0

        if args.command == "font-bitmap":
            cw = args.resize_cell_width if args.resize_cell_width > 0 else None
            ch = args.resize_cell_height if args.resize_cell_height > 0 else None
            result = generate_font_bitmap(
                namespace=args.namespace.strip(),
                font_id=args.font_id.strip(),
                input_image=Path(args.input_image),
                base_dir=Path(args.base_dir),
                columns=args.columns,
                rows=args.rows,
                start_codepoint=args.start_codepoint,
                glyph_height=args.glyph_height,
                glyph_ascent=args.glyph_ascent,
                threshold=args.threshold,
                resize_cell_width=cw,
                resize_cell_height=ch,
                output_texture=Path(args.output_texture) if args.output_texture else None,
                output_font_json=Path(args.output_font_json) if args.output_font_json else None,
                append=bool(args.append),
                skip_convert=bool(args.skip_convert),
            )
            print(f"saved texture: {result['texture']}")
            print(f"saved font: {result['font_json_path']}")
            if args.print_json:
                print(json.dumps(result["font_json"], indent=2, ensure_ascii=True))
            return 0

        if args.command == "font-space":
            advances = parse_space_advances(args.advance)
            provider = build_space_provider(advances)
            font_json = write_font_json(Path(args.font_json), [provider], append=not bool(args.replace))
            print(f"saved font: {args.font_json}")
            if args.print_json:
                print(json.dumps(font_json, indent=2, ensure_ascii=True))
            return 0

        if args.command == "font-reference":
            provider = build_reference_provider(args.id)
            font_json = write_font_json(Path(args.font_json), [provider], append=not bool(args.replace))
            print(f"saved font: {args.font_json}")
            if args.print_json:
                print(json.dumps(font_json, indent=2, ensure_ascii=True))
            return 0

        parser.print_help()
        return 2
    except (FileNotFoundError, json.JSONDecodeError, ValidationError, ValueError, FontBuildError) as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
