# DialogGenerator

Minecraft Dialog JSON Generator is a lightweight GUI and CLI tool for creating dialog JSON files for Minecraft Java Edition datapacks. It provides a visual editor and command-line utilities to quickly build, preview, and export dialog configurations without manually writing JSON.

The project focuses on simplifying the creation of:

* `dialog` JSON definitions
* bitmap fonts for resource packs
* font `bitmap`, `space`, and `reference` providers

It is designed for datapack developers who want faster workflows when building Minecraft UI dialogs and custom fonts.

---

# Features

## Dialog JSON Generator

* Visual dialog editor (GUI)
* CLI generation for automation
* Built‑in validation for Minecraft dialog rules
* Support for dynamic actions
* Automatic tag updates for:

  * `pause_screen_additions`
  * `quick_actions`

Supported dialog elements:

* `plain_message`
* `item`
* `boolean`
* `number_range`
* `single_option`
* `text`

---

## Font Tools

Utilities for creating Minecraft bitmap fonts.

Capabilities:

* Convert image sheets → bitmap font providers
* Validate existing PNG font sheets
* Append `space` providers
* Append `reference` providers

Output structure follows Minecraft resource pack conventions:

```
assets/<namespace>/textures/font/<font_id>.png
assets/<namespace>/font/<font_id>.json
```

---

# Installation

## Requirements

* Python **3.10+** (recommended)
* `tkinter` (included with most Python installations)

Install required dependency:

```bash
pip install pillow
```

---

# Quick Start

## Launch GUI

```bash
python main.py
```

## CLI Help

```bash
python cli.py --help
```

---

# Project Structure

```
mc_json_generator/

main.py              # GUI entry point
cli.py               # CLI entry

gui.py               # GUI implementation

dialog_builder.py    # Dialog JSON generator
font_builder.py      # Font provider generator
```

---

# GUI Usage

## Dialog Creation Workflow

1. Configure global fields

* `namespace`
* `dialog id`
* `title`
* `external_title`
* `type`
* `after_action`
* `pause`
* `can_close_with_escape`

2. Add dialog body elements

Supported elements:

* `plain_message`
* `item`

3. Add input controls

* `boolean`
* `number_range`
* `single_option`
* `text`

4. Configure type‑specific settings

Examples:

* `confirmation` dialog options
* `multi_action` actions

5. Preview and save

Generated file:

```
data/<namespace>/dialog/<dialog_id>.json
```

---

## Action Types

Static actions:

* `copy_to_clipboard`
* `custom`
* `open_url`
* `run_command`
* `show_dialog`

Dynamic actions:

* `dynamic/custom`
* `dynamic/run_command`

`dynamic/run_command` templates must include at least one placeholder:

```
$(key)
```

---

# CLI Usage

The CLI uses subcommands:

```
dialog
font-bitmap
font-space
font-reference
```

---

## Generate Dialog JSON

```bash
python cli.py dialog \
  --namespace demo \
  --dialog-id notice_test \
  --payload sample_payload_notice.json \
  --print
```

Default output:

```
data/<namespace>/dialog/<dialog-id>.json
```

---

## Generate Bitmap Font

```bash
python cli.py font-bitmap \
  --namespace demo \
  --font-id myfont \
  --input-image my_sheet.png \
  --columns 16 \
  --rows 16 \
  --start-codepoint 0xE000 \
  --glyph-height 8 \
  --glyph-ascent 7
```

---

## Append Space Provider

```bash
python cli.py font-space \
  --font-json assets/demo/font/myfont.json \
  --advance "<space>=4" \
  --advance "<tab>=4"
```

---

## Append Reference Provider

```bash
python cli.py font-reference \
  --font-json assets/demo/font/myfont.json \
  --id minecraft:default
```

---

# Payload Format

The `--payload` argument supports two formats:

1. GUI internal structure

```
body_items
input_items
```

2. Direct Minecraft dialog structure

```
body
inputs
```

For complex dialogs, generating the template with the GUI is recommended.

---

# Troubleshooting

## Pillow Missing

```
Pillow is required
```

Install:

```bash
pip install pillow
```

---

## PNG Validation Error

Minecraft bitmap fonts require:

* Alpha channel **or**
* Grayscale channel

RGB‑only PNG files are not supported.

---

## Windows Unicode Console Issues

If high codepoints fail to print in Windows terminals, save JSON to files instead of printing to stdout.

---

## `after_action=none` Error

Minecraft requires:

```
pause=false
```

---

# Recommended Workflow

1. Build dialogs using the GUI
2. Generate font textures and providers
3. Use the CLI for batch generation or automation
4. Test the datapack and resource pack in‑game

---

# License

Add your project license here (for example MIT / Apache‑2.0).

---

# Contributing

Contributions, issues, and feature requests are welcome.
