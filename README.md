# ngx-virtual-grid workspace

Monorepo for the `ngx-virtual-grid` Angular library and its demo application.

[Live Demo](https://theryansmee.github.io/ngx-virtual-grid/)

## Project Structure

```
projects/
  ngx-virtual-grid/   # The published library
  demo/                # Demo application for local development
```

## Angular Version Support

Each Angular major version is maintained on its own branch and published under a matching library major version:

| Branch | Angular | Library version | npm tag |
|---|---|---|---|
| `angular/14` | 14.x | `14.x.x` | `angular14` |
| `angular/15` | 15.x | `15.x.x` | `angular15` |
| `angular/16` | 16.x | `16.x.x` | `angular16` |

The `main` branch tracks the latest stable version.

## Prerequisites

- Node.js 16.14+ (or 18.x recommended)
- npm 8+

## Getting Started

```bash
# Install dependencies
npm install

# Build the library
npm run build:lib

# Start the demo app (builds library first, then serves demo)
npm start
```

The demo app runs at `http://localhost:4200/`.

## Available Scripts

| Script | Description |
|---|---|
| `npm run build:lib` | Build the library for production |
| `npm run build:demo` | Build the demo application |
| `npm start` | Build library + serve demo app |
| `npm test` | Run library unit tests (watch mode) |
| `npm run test:ci` | Run library unit tests (headless, single run) |
| `npm run lint` | Lint all projects |
| `npm run lint:fix` | Lint and auto-fix all projects |

## Development Workflow

1. Make changes in `projects/ngx-virtual-grid/src/`
2. Run `npm run build:lib` to rebuild the library
3. Run `npm start` to test changes in the demo app
4. Run `npm test` to verify unit tests pass
5. Run `npm run lint` before committing

## Publishing

```bash
# Build the library
npm run build:lib

# Navigate to the dist output
cd dist/ngx-virtual-grid

# Publish with the appropriate dist-tag
npm publish --tag angular16
```

When publishing older Angular version branches, always use the version-specific tag (e.g. `--tag angular14`) so it doesn't become the `latest` tag on npm.

## Linting

The project uses ESLint with `@angular-eslint` and `@typescript-eslint`. Husky + lint-staged run linting on pre-commit for all staged `.ts` and `.html` files.

## Contributing

1. Branch off the appropriate `angular/*` branch for your target Angular version
2. Follow the existing code style (tabs, explicit types, explicit accessibility modifiers)
3. Add unit tests for new functionality
4. Ensure `npm run lint` and `npm run test:ci` pass before opening a PR
