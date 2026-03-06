from __future__ import annotations

import json
import struct
from pathlib import Path
from typing import Any, Dict, List, Sequence, Tuple


class FontBuildError(ValueError):
    pass


PNG_SIGNATURE = b"\x89PNG\r\n\x1a\n"


def _require(condition: bool, message: str) -> None:
    if not condition:
        raise FontBuildError(message)


def read_png_info(path: Path) -> Tuple[int, int, int]:
    data = path.read_bytes()
    _require(len(data) >= 33, "PNG file is too small")
    _require(data[:8] == PNG_SIGNATURE, "Invalid PNG signature")
    _require(data[12:16] == b"IHDR", "PNG IHDR chunk not found")
    width = struct.unpack(">I", data[16:20])[0]
    height = struct.unpack(">I", data[20:24])[0]
    color_type = data[25]
    return width, height, color_type


def validate_minecraft_bitmap_png(path: Path) -> None:
    width, height, color_type = read_png_info(path)
    _require(width > 0 and height > 0, "PNG width/height must be positive")
    # 2 is RGB without alpha; this is not accepted by Minecraft bitmap font provider.
    _require(color_type != 2, "Bitmap font PNG must have alpha or grayscale channel (RGB-only PNG is invalid)")


def generate_chars_from_codepoint(start_codepoint: int, columns: int, rows: int) -> List[str]:
    _require(columns > 0 and rows > 0, "columns/rows must be positive")
    _require(start_codepoint >= 0, "start_codepoint must be >= 0")
    total = columns * rows
    chars = [chr(start_codepoint + i) for i in range(total)]
    return ["".join(chars[i * columns : (i + 1) * columns]) for i in range(rows)]


def normalize_chars_lines(chars_lines: Sequence[str], columns: int | None = None) -> List[str]:
    _require(len(chars_lines) > 0, "chars cannot be empty")
    normalized = [line.rstrip("\n") for line in chars_lines if line.rstrip("\n")]
    _require(len(normalized) > 0, "chars cannot be empty")
    expected = columns or len(normalized[0])
    _require(expected > 0, "chars width cannot be zero")
    for line in normalized:
        _require(len(line) == expected, "all chars lines must have the same codepoint length")
    return normalized


def build_bitmap_provider(
    *,
    file_ref: str,
    chars: Sequence[str],
    height: int = 8,
    ascent: int = 7,
    filter_jp: bool | None = None,
    filter_uniform: bool | None = None,
) -> Dict[str, Any]:
    _require(file_ref.endswith(".png"), "bitmap provider file must end with .png")
    _require(height > 0, "height must be > 0")
    _require(ascent <= height, "ascent must be <= height")
    chars_norm = normalize_chars_lines(chars)
    provider: Dict[str, Any] = {
        "type": "bitmap",
        "file": file_ref,
        "chars": chars_norm,
        "height": height,
        "ascent": ascent,
    }
    if filter_jp is not None or filter_uniform is not None:
        f: Dict[str, Any] = {}
        if filter_jp is not None:
            f["jp"] = bool(filter_jp)
        if filter_uniform is not None:
            f["uniform"] = bool(filter_uniform)
        provider["filter"] = f
    return provider


def build_space_provider(advances: Dict[str, float]) -> Dict[str, Any]:
    _require(len(advances) > 0, "space advances cannot be empty")
    return {"type": "space", "advances": advances}


def build_reference_provider(font_id: str) -> Dict[str, Any]:
    _require(bool(font_id.strip()), "reference id cannot be empty")
    return {"type": "reference", "id": font_id.strip()}


def write_font_json(path: Path, providers: Sequence[Dict[str, Any]], append: bool = False) -> Dict[str, Any]:
    _require(len(providers) > 0, "providers cannot be empty")
    path.parent.mkdir(parents=True, exist_ok=True)

    if append and path.exists():
        loaded = json.loads(path.read_text(encoding="utf-8-sig"))
        if not isinstance(loaded, dict):
            raise FontBuildError("existing font json is not an object")
        existing = loaded.get("providers", [])
        if not isinstance(existing, list):
            raise FontBuildError("existing providers must be an array")
        all_providers = existing + list(providers)
        root = {"providers": all_providers}
    else:
        root = {"providers": list(providers)}

    path.write_text(json.dumps(root, indent=2, ensure_ascii=False), encoding="utf-8")
    return root


def convert_image_to_bitmap_png(
    *,
    input_path: Path,
    output_path: Path,
    columns: int,
    rows: int,
    cell_width: int | None = None,
    cell_height: int | None = None,
    threshold: int = 8,
) -> Tuple[int, int]:
    _require(columns > 0 and rows > 0, "columns/rows must be positive")
    _require(0 <= threshold <= 255, "threshold must be in 0..255")
    try:
        from PIL import Image, ImageOps
    except ImportError as exc:
        raise FontBuildError("Pillow is required for image conversion. Install with: pip install pillow") from exc

    img = Image.open(input_path).convert("RGBA")
    if cell_width is not None or cell_height is not None:
        _require(cell_width is not None and cell_height is not None, "cell_width and cell_height must be provided together")
        _require(cell_width > 0 and cell_height > 0, "cell_width/cell_height must be positive")
        img = img.resize((columns * cell_width, rows * cell_height), Image.Resampling.LANCZOS)

    gray = ImageOps.grayscale(img)
    alpha = gray.point(lambda v: 255 if v >= threshold else 0)
    out = Image.new("RGBA", img.size, (255, 255, 255, 0))
    out.putalpha(alpha)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    out.save(output_path, format="PNG")
    validate_minecraft_bitmap_png(output_path)
    return out.size


def parse_space_advances(lines: Sequence[str]) -> Dict[str, float]:
    advances: Dict[str, float] = {}
    for raw in lines:
        line = raw.rstrip("\r\n")
        if not line.strip():
            continue
        if "=" not in line:
            raise FontBuildError("space advance line must be in format: <char>=<float>")
        left, right = line.split("=", 1)
        key = left.strip()
        if not key and left:
            # Keep literal whitespace char definitions such as " =4" or "\t=4".
            if len(left) == 1:
                key = left
        if key in {"<space>", "space"}:
            key = " "
        elif key in {"<tab>", "tab"}:
            key = "\t"
        elif key.startswith("\\u") and len(key) == 6:
            key = chr(int(key[2:], 16))
        _require(len(key) > 0, "space advance key cannot be empty")
        advances[key] = float(right.strip())
    _require(len(advances) > 0, "space advances cannot be empty")
    return advances
