import json
import re
from typing import Any, Dict, List


AFTER_ACTIONS = ["close", "none", "wait_for_response"]
DIALOG_TYPES = ["confirmation", "dialog_list", "multi_action", "notice", "server_links"]
BODY_TYPES = ["plain_message", "item"]
INPUT_TYPES = ["boolean", "number_range", "single_option", "text"]

STATIC_ACTION_TYPES = [
    "copy_to_clipboard",
    "custom",
    "open_url",
    "run_command",
    "show_dialog",
]
DYNAMIC_ACTION_TYPES = ["dynamic/custom", "dynamic/run_command"]
ALL_ACTION_TYPES = STATIC_ACTION_TYPES + DYNAMIC_ACTION_TYPES

KEY_PATTERN = re.compile(r"^[A-Za-z0-9_]+$")


def parse_text_component(raw: str) -> Any:
    value = (raw or "").strip()
    if not value:
        return ""
    if value[0] in "{[":
        return json.loads(value)
    return value


def parse_optional_text_component(raw: str) -> Any:
    value = (raw or "").strip()
    if not value:
        return None
    return parse_text_component(value)


def parse_int(raw: str, default: int | None = None) -> int | None:
    value = (raw or "").strip()
    if not value:
        return default
    return int(value)


def parse_float(raw: str, default: float | None = None) -> float | None:
    value = (raw or "").strip()
    if not value:
        return default
    return float(value)


def parse_json_object(raw: str, default: Dict[str, Any] | None = None) -> Dict[str, Any] | None:
    value = (raw or "").strip()
    if not value:
        return default
    data = json.loads(value)
    if not isinstance(data, dict):
        raise ValueError("必须是JSON对象")
    return data


def parse_reference_list(raw: str) -> List[Any]:
    refs: List[Any] = []
    for line in (raw or "").splitlines():
        text = line.strip()
        if not text:
            continue
        if text[0] in "{[":
            refs.append(json.loads(text))
        else:
            refs.append(text)
    return refs


def parse_single_option_list(raw: str) -> List[Any]:
    options: List[Any] = []
    for line in (raw or "").splitlines():
        text = line.strip()
        if not text:
            continue
        if text[0] in "{[":
            options.append(json.loads(text))
            continue
        parts = [p.strip() for p in text.split("|")]
        if len(parts) == 1:
            options.append(parts[0])
            continue
        entry: Dict[str, Any] = {"id": parts[0]}
        if len(parts) >= 2 and parts[1]:
            entry["display"] = parse_text_component(parts[1])
        if len(parts) >= 3:
            entry["initial"] = parts[2].lower() in {"1", "true", "yes", "y"}
        options.append(entry)
    return options
