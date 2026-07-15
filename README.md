# Bouquet Studio

Bouquet Studio is a browser-based editor for procedural flowers and virtual bouquets. It combines an Angular interface with a Three.js renderer and stores every flower as a deterministic, serializable node graph.

The application contains two workspaces:

- **Bouquet simulator** at `/` for arranging, rotating, shortening, and combining flowers in configurable vases.
- **Flower editor** at `/editor` for building reusable flowers and components from nodes, branches, nested loops, graphics, and local stem parameters.

## Technology

- Angular 21 and Angular Material
- Three.js for the 3D bouquet and flower preview
- Tailwind CSS for component styling
- Vitest through Angular's unit-test builder
- JSON-based flower, component, bouquet, and project formats

## Requirements

- Node.js 22, matching the deployment workflow
- npm
- A current browser with WebGL support

## Local development

Install dependencies and start the complete development environment:

```bash
npm install
npm start
```

Open:

- `http://localhost:4200/` for the bouquet simulator
- `http://localhost:4200/editor` for the flower editor

`npm start` runs two local processes:

1. Angular's development server on port `4200`.
2. A small defaults API on `127.0.0.1:4300`, forwarded through `/api` by `proxy.conf.json`.

To run Angular without the defaults API, use:

```bash
npm run start:angular
```

The application remains usable in this mode, but the flower editor's **In Defaults** action cannot write to the source tree.

## Commands

| Command | Purpose |
| --- | --- |
| `npm start` | Start Angular and the local defaults API. |
| `npm run start:angular` | Start only Angular with the API proxy configured. |
| `npm test` | Build and run the complete unit-test suite. |
| `npm run build` | Create a production build in `dist/bouquet-simulator/browser`. |

For a clean, lockfile-based installation such as CI, use `npm ci` instead of `npm install`.

## Persistence and source defaults

Bouquet Studio deliberately separates browser persistence from repository defaults.

### Browser-local persistence

The following data is stored in `localStorage` for the current browser and origin:

- The current bouquet project and bouquet collection.
- Flower definitions saved with the editor's **Save** action.
- Extracted components in the local component library.

Browser-local saving is immediate and convenient, but it does **not** modify files in the repository. The data does not automatically follow the user to another browser, device, hostname, or port. Use the JSON import and export actions for portable backups and transfers.

### Repository defaults

During local development, the **In Defaults** action sends the complete flower catalog to the local defaults API. The API validates the basic payload and atomically rewrites:

```text
src/app/core/data/default-flowers.ts
```

This action is available only in development mode and requires `npm start`. It is intentionally unavailable on the deployed GitHub Pages site. Treat the generated file like any other source change: inspect the Git diff, run the tests, and commit it when appropriate.

## Flower model

A flower definition uses `schemaVersion: 2` and represents a directed graph:

- Connections render as stem segments.
- A node can have at most one incoming connection and any number of outgoing connections.
- Repeat count, length, inclination, azimuth, roll, randomness, curvature, and local stem appearance belong to the target node's incoming connection.
- Nodes can carry parametric 3D graphics, deterministic patterns, or component references.
- Loops repeat framed member subgraphs and can contain nested loops.
- Catalog components declare explicit output nodes through which the surrounding graph continues.
- The editor derives the active root dynamically. Disconnected trees remain editable, while only the selected tree appears in the preview.
- A definition and seed always generate the same procedural structure.

Editor node positions are stored as metadata inside the flower definition. Bouquet-level placement, rotation, shortening, vase form, and vase material are stored separately in the bouquet project.

## Project structure

```text
src/app/core/
  data/          Built-in flowers and vase metadata
  models/        Serializable schemas, validation, graphs, loops, and components
  rendering/     Procedural tree generation and rendering helpers
  state/         Bouquet state and browser persistence
src/app/features/editor/     Flower editor UI and editor-specific domain logic
src/app/features/simulator/  Bouquet simulator UI and project persistence
src/app/shared/              Three.js canvas and reusable controls
tools/                       Local development launcher and defaults API
```

Built-in graphic primitives are registered in `src/app/core/rendering/graphic-geometries.ts`. Parametric surface patterns are generated in `src/app/core/rendering/graphic-paint.ts`. The shared Three.js scene is implemented in `src/app/shared/bouquet-canvas/bouquet-canvas.component.ts`.

## Testing and production build

Run the complete verification before committing:

```bash
npm test
npm run build
```

The tests cover graph generation, connections, loops, nested components, editor layouts, graphics, bouquet placement, overlap correction, persistence, and migration of older optional fields.

## GitHub Pages deployment

The workflow in `.github/workflows/deploy-pages.yml` deploys the application on every push to `main` and can also be started manually.

It performs the following steps:

1. Installs dependencies with Node.js 22 and `npm ci`.
2. Runs the full test suite.
3. Builds with `--base-href "/<repository-name>/"`.
4. Copies `index.html` to `404.html` so client-side routes such as `/editor` can recover on GitHub Pages.
5. Uploads `dist/bouquet-simulator/browser` and deploys it through GitHub Actions.

For a new repository, enable GitHub Pages with **GitHub Actions** as its source. No defaults API is deployed; the production application relies on browser-local persistence and JSON import/export.
