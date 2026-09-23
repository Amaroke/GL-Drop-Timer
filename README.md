# GL Upgrade Planner

Tracks the Cooldown of the three free Drops in Galaxy Life so a player knows when to Collect them again: Star Battery (11h), Tool Case (23h) and Helmet (35h).

Live site: <https://amaroke.github.io/GL-Upgrade-Planner/>

The domain vocabulary (Drop, Cooldown, Ready date, Collect) is defined in [CONTEXT.md](CONTEXT.md). Architecture decisions are recorded in [docs/adr/](docs/adr/).

## Features

- One timer per Drop, started with a single click when the Drop is Collected
- Manual editing of a Ready date, with validation
- Inline confirmation before a timer is reset
- Ready dates saved in the browser and synchronized across open tabs
- Number of Ready Drops shown in the tab title
- Browser notification when a Drop becomes Ready while the tab is open
- Optional Google sign-in to identify the player, with Ready dates still stored locally

## Stack

React, TypeScript, Tailwind CSS and Vite. Tests use Vitest with Testing Library. Linting uses oxlint and formatting uses oxfmt.

## Setup

The Node version is pinned in `.nvmrc`.

```sh
npm install
npm run dev
```

Google sign-in needs a Firebase project with the Google provider enabled. Copy `.env.example` to `.env` and fill in the web app config from the Firebase console:

```sh
cp .env.example .env
```

Without these variables, every Drop timer still works; signing in fails quietly instead.

## Scripts

| Script                 | Purpose                             |
| ---------------------- | ----------------------------------- |
| `npm run dev`          | Start the Vite dev server           |
| `npm run build`        | Type-check with `tsc -b` and build  |
| `npm run preview`      | Serve the production build locally  |
| `npm run lint`         | Lint with oxlint                    |
| `npm run format`       | Format the code with oxfmt          |
| `npm run format:check` | Check formatting without writing    |
| `npm test`             | Run the test suite once with Vitest |

## Continuous integration and deployment

The CI workflow runs on every pull request. It installs dependencies with `npm ci`, then runs lint, format check, tests and build.

The deploy workflow runs on every push to `main` and can also be started manually. It runs the CI workflow first, then builds the site and publishes it to GitHub Pages. The build step reads the Firebase web app config from repository secrets (`VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_APP_ID`); until they are set, the deployed site still works fully signed out.
