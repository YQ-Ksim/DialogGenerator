from __future__ import annotations

from typing import Any, Dict, List

from dialog_types import (
    AFTER_ACTIONS,
    ALL_ACTION_TYPES,
    BODY_TYPES,
    DIALOG_TYPES,
    INPUT_TYPES,
    KEY_PATTERN,
    parse_float,
    parse_int,
    parse_json_object,
    parse_optional_text_component,
    parse_reference_list,
    parse_single_option_list,
    parse_text_component,
)


class ValidationError(ValueError):
    pass


def _require(condition: bool, message: str) -> None:
    if not condition:
        raise ValidationError(message)


def build_action(cfg: Dict[str, Any]) -> Dict[str, Any]:
    action_type = (cfg.get("action_type") or "").strip()
    _require(action_type in ALL_ACTION_TYPES, f"无效操作类型: {action_type}")

    result: Dict[str, Any] = {}
    label = parse_optional_text_component(cfg.get("label_raw", ""))
    tooltip = parse_optional_text_component(cfg.get("tooltip_raw", ""))
    width = parse_int(cfg.get("width_raw", ""), None)

    if label is not None:
        result["label"] = label
    if tooltip is not None:
        result["tooltip"] = tooltip
    if width is not None:
        _require(1 <= width <= 1024, "按钮宽度必须在1-1024")
        result["width"] = width

    action: Dict[str, Any] = {"type": action_type}

    if action_type == "dynamic/custom":
        action_id = (cfg.get("id_raw") or "").strip()
        _require(bool(action_id), "dynamic/custom 需要 id")
        action["id"] = action_id
        additions = parse_json_object(cfg.get("additions_raw", ""), None)
        if additions is not None:
            action["additions"] = additions
    elif action_type == "dynamic/run_command":
        template = (cfg.get("template_raw") or "").strip()
        _require("$(" in template and ")" in template, "dynamic/run_command 的模板至少要有一个 $(key)")
        action["template"] = template
    else:
        value_raw = (cfg.get("value_raw") or "").strip()
        if value_raw:
            if action_type in {"show_dialog", "run_command", "open_url", "copy_to_clipboard", "custom"}:
                action["value"] = value_raw
            else:
                action["value"] = parse_text_component(value_raw)

    result["action"] = action
    return result


def build_body_item(kind: str, fields: Dict[str, Any]) -> Dict[str, Any]:
    _require(kind in BODY_TYPES, f"无效主体元素类型: {kind}")
    if kind == "plain_message":
        contents = parse_text_component(fields.get("contents_raw", ""))
        width = parse_int(fields.get("width_raw", ""), 200)
        _require(1 <= width <= 1024, "plain_message width 必须在1-1024")
        return {"type": "plain_message", "contents": contents, "width": width}

    item_raw = (fields.get("item_raw") or "").strip()
    _require(bool(item_raw), "item 主体元素必须提供 item")
    obj: Dict[str, Any] = {
        "type": "item",
        "item": parse_text_component(item_raw),
    }
    description_raw = (fields.get("description_raw") or "").strip()
    if description_raw:
        obj["description"] = parse_text_component(description_raw)
    for key in ("show_decorations", "show_tooltip"):
        if key in fields:
            obj[key] = bool(fields[key])
    width = parse_int(fields.get("width_raw", ""), None)
    if width is not None:
        _require(1 <= width <= 256, "item width 必须在1-256")
        obj["width"] = width
    height = parse_int(fields.get("height_raw", ""), None)
    if height is not None:
        _require(1 <= height <= 256, "item height 必须在1-256")
        obj["height"] = height
    return obj


def build_input_item(kind: str, fields: Dict[str, Any]) -> Dict[str, Any]:
    _require(kind in INPUT_TYPES, f"无效输入类型: {kind}")
    key = (fields.get("key") or "").strip()
    _require(bool(key), "输入控件 key 不能为空")
    _require(bool(KEY_PATTERN.match(key)), "输入控件 key 只能包含字母、数字、下划线")

    if kind == "boolean":
        obj: Dict[str, Any] = {
            "key": key,
            "type": "boolean",
            "label": parse_text_component(fields.get("label_raw", "")),
            "initial": bool(fields.get("initial", False)),
        }
        on_false = (fields.get("on_false", "") or "").strip()
        on_true = (fields.get("on_true", "") or "").strip()
        if on_false:
            obj["on_false"] = on_false
        if on_true:
            obj["on_true"] = on_true
        return obj

    if kind == "number_range":
        start = parse_float(fields.get("start_raw", ""))
        end = parse_float(fields.get("end_raw", ""))
        _require(start is not None and end is not None, "number_range 必须提供 start/end")
        obj = {
            "key": key,
            "type": "number_range",
            "label": parse_text_component(fields.get("label_raw", "")),
            "start": start,
            "end": end,
        }
        label_format = (fields.get("label_format", "") or "").strip()
        if label_format:
            obj["label_format"] = label_format
        width = parse_int(fields.get("width_raw", ""), None)
        if width is not None:
            _require(1 <= width <= 1024, "number_range width 必须在1-1024")
            obj["width"] = width
        step = parse_float(fields.get("step_raw", ""), None)
        if step is not None:
            _require(step > 0, "number_range step 必须>0")
            obj["step"] = step
        initial = parse_float(fields.get("initial_raw", ""), None)
        if initial is not None:
            obj["initial"] = initial
        return obj

    if kind == "single_option":
        options = parse_single_option_list(fields.get("options_raw", ""))
        _require(len(options) > 0, "single_option 必须提供至少一个 option")
        obj = {
            "key": key,
            "type": "single_option",
            "label": parse_text_component(fields.get("label_raw", "")),
            "options": options,
            "label_visible": bool(fields.get("label_visible", True)),
        }
        width = parse_int(fields.get("width_raw", ""), None)
        if width is not None:
            _require(1 <= width <= 1024, "single_option width 必须在1-1024")
            obj["width"] = width
        return obj

    obj = {
        "key": key,
        "type": "text",
        "label": parse_text_component(fields.get("label_raw", "")),
        "label_visible": bool(fields.get("label_visible", True)),
    }
    initial = (fields.get("initial_text", "") or "")
    if initial:
        obj["initial"] = initial
    max_length = parse_int(fields.get("max_length_raw", ""), None)
    if max_length is not None:
        obj["max_length"] = max_length
    width = parse_int(fields.get("width_raw", ""), None)
    if width is not None:
        _require(1 <= width <= 1024, "text width 必须在1-1024")
        obj["width"] = width
    if fields.get("multiline_enabled"):
        ml: Dict[str, Any] = {}
        max_lines = parse_int(fields.get("max_lines_raw", ""), None)
        if max_lines is not None:
            ml["max_lines"] = max_lines
        height = parse_int(fields.get("height_raw", ""), None)
        if height is not None:
            _require(1 <= height <= 512, "text multiline height 必须在1-512")
            ml["height"] = height
        obj["multiline"] = ml
    return obj


def build_dialog(payload: Dict[str, Any]) -> Dict[str, Any]:
    dialog_type = (payload.get("type") or "").strip()
    _require(dialog_type in DIALOG_TYPES, "请选择有效对话框类型")

    title_raw = (payload.get("title_raw") or "").strip()
    _require(bool(title_raw), "title 不能为空")

    root: Dict[str, Any] = {
        "type": dialog_type,
        "title": parse_text_component(title_raw),
    }

    ext_title = parse_optional_text_component(payload.get("external_title_raw", ""))
    if ext_title is not None:
        root["external_title"] = ext_title

    after_action = (payload.get("after_action") or "close").strip()
    _require(after_action in AFTER_ACTIONS, f"after_action 必须是: {', '.join(AFTER_ACTIONS)}")
    root["after_action"] = after_action
    root["pause"] = bool(payload.get("pause", True))
    root["can_close_with_escape"] = bool(payload.get("can_close_with_escape", True))

    body_items: List[Dict[str, Any]] = payload.get("body_items", [])
    if body_items:
        root["body"] = body_items

    input_items: List[Dict[str, Any]] = payload.get("input_items", [])
    if input_items:
        root["inputs"] = input_items

    if dialog_type == "confirmation":
        root["yes"] = build_action(payload["yes_action"])
        root["no"] = build_action(payload["no_action"])
    elif dialog_type == "notice":
        action_cfg = payload.get("notice_action")
        if action_cfg:
            root["action"] = build_action(action_cfg)
    elif dialog_type == "dialog_list":
        dialogs = parse_reference_list(payload.get("dialogs_raw", ""))
        if dialogs:
            root["dialogs"] = dialogs
        button_width = parse_int(payload.get("button_width_raw", ""), None)
        if button_width is not None:
            _require(1 <= button_width <= 1024, "dialog_list button_width 必须在1-1024")
            root["button_width"] = button_width
        columns = parse_int(payload.get("columns_raw", ""), None)
        if columns is not None:
            _require(columns > 0, "dialog_list columns 必须>0")
            root["columns"] = columns
        exit_cfg = payload.get("exit_action")
        if exit_cfg:
            root["exit_action"] = build_action(exit_cfg)
    elif dialog_type == "multi_action":
        columns = parse_int(payload.get("columns_raw", ""), None)
        if columns is not None:
            _require(columns > 0, "multi_action columns 必须>0")
            root["columns"] = columns
        action_cfgs: List[Dict[str, Any]] = payload.get("multi_actions", [])
        _require(len(action_cfgs) > 0, "multi_action 至少要有一个 action")
        root["actions"] = [build_action(a) for a in action_cfgs]
        exit_cfg = payload.get("exit_action")
        if exit_cfg:
            root["exit_action"] = build_action(exit_cfg)
    elif dialog_type == "server_links":
        button_width = parse_int(payload.get("button_width_raw", ""), None)
        if button_width is not None:
            _require(button_width > 0, "server_links button_width 必须>0")
            root["button_width"] = button_width
        columns = parse_int(payload.get("columns_raw", ""), None)
        if columns is not None:
            _require(columns > 0, "server_links columns 必须>0")
            root["columns"] = columns
        exit_cfg = payload.get("exit_action")
        if exit_cfg:
            root["exit_action"] = build_action(exit_cfg)

    if root.get("after_action") == "none":
        _require(root.get("pause") is False, "after_action=none 时 pause 必须为 false")
    return root
