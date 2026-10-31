# Frontend

React 19 + Vite client for the Coffee Shop POS. Screens are under `src/components/` for cashier, barista, and owner; `src/services/api.js` calls the Express API under `/api`.

## Commands

```bash
npm install
npm run dev
npm run build
npm run lint
```

Vite listens on port 5173 and proxies `/api` and `/uploads` to `http://localhost:3000` (see `vite.config.js`). Run the backend separately with `cd ../backend && npm start`. In single-server mode Express serves the generated `dist/` folder.

There is no test script in this package manifest. `npm run build` checks the production bundle; `npm run lint` runs Oxlint and may report warnings that should not be treated as runtime test results.
