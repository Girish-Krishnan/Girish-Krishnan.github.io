# Sim Lab: Girish Krishnan's 3D portfolio prototype

Vite + React 19 + React Three Fiber + drei + @react-three/rapier + postprocessing.

- `npm install`, then `npm run dev` (local dev) / `npm run build` (static build in `dist/`) / `npm run preview` (serves dist on :4173)
- All content: `src/data/content.ts`
- Scene: `src/scene/` (Scene, Arena, Stations, Robot, layout, keys) · UI overlays: `src/ui/`
- Controls: WASD/arrows drive (camera-relative), E interact, click a station to auto-drive there, click the floor to drive to a point, 1–6 jump to a station, ` toggles the terminal, Esc closes panels.
- Plain/no-3D view: `#plain` (also used automatically when WebGL is unavailable).
- `base: './'` in vite.config.ts, so `dist/` works on a user site or a project page. `.github/workflows/deploy.yml` deploys to GitHub Pages via Actions.
- `verify.py` / `record.py`: Playwright checks + demo recording (screens/ output).

## This repository

This repo (`Girish-Krishnan.github.io`) serves the site at https://girish-krishnan.github.io/ via GitHub Pages
(source: GitHub Actions, workflow `.github/workflows/deploy.yml`). The previous al-folio site is preserved on the
`al-folio-archive` branch / `al-folio-final` tag (source) and the `gh-pages-archive` branch (built output).
Old al-folio URLs (`/cv/`, `/projects/…`, `/publications/`, …) are kept as redirect pages under `public/`,
and the CV stays at `/assets/pdf/cv.pdf`.
