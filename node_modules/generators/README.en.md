# Minecraft Generators Project

[中文](./README.md)

A Minecraft data generator and editing web project built with `Vite + Preact + TypeScript`, including multi-page generators, structured JSON editing, and `Mcdoc + Spyglass` validation.

## Project Status

- Current run path: repository root
- Migration from old subdirectory layout has been completed (old path `dialog-generator/`)

## Key Features

- Multi-page generator site (Vite output)
- Structured JSON editing and live preview
- Mcdoc schema-driven editing
- Spyglass validation and diagnostics
- Centralized generator/resource config (`src/config.json`)

## Tech Stack

- Frontend: `Preact`
- Build: `Vite`
- Language: `TypeScript`
- Validation: `Mcdoc`, `Spyglass`
- Styling: `PostCSS`, `Tailwind CSS`

## Requirements

- Node.js 18+
- npm 9+

## Quick Start

Run from repository root:

```bash
npm install
npm run dev
```

Default dev URL:

```text
http://localhost:3000
```

## NPM Scripts

```bash
npm run dev      # Start dev server
npm run build    # TypeScript check + production build
npm run preview  # Preview production build
npm run lint     # Run ESLint
```

## Project Structure

```text
.
├─ src/                 # Source code
├─ public/              # Static assets
├─ package.json         # Dependencies and scripts
├─ tsconfig.json        # TypeScript config
├─ vite.config.js       # Vite config
├─ postcss.config.js    # PostCSS config
├─ tailwind.config.js   # Tailwind config
└─ spyglass.json        # Spyglass runtime config
```

## Notes


- command: `npm run dev`
- file path usage: root-relative paths (for example `src/...`, `public/...`)

Also update IDE run configurations and CI working directories to repository root.

## License

[MIT](./LICENSE)