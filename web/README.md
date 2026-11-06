# Research website

English: `index.html`. Chinese: `zh/index.html`.

Run from the repository root:

```sh
python3 -m http.server 18765 --bind 127.0.0.1
```

Open http://127.0.0.1:18765/web/ .

The page uses HTML, inline SVG, CSS, and vanilla JavaScript. The SVG distinguishes RGB-D observations, a mesh editor with scale/pose/friction controls, three trajectory trials, and execution. A common package and coordinate style connect these views. CSS animates reconstruction, candidate trajectories, selection, package transfer, and feedback. JavaScript controls the four-phase timeline, pause/play, responsive diagram layout, and the scene tabs. Reduced-motion preferences disable animation. Scene tabs support arrow keys, Home, and End.

The reading order is title, animated method overview, two-stage method, package-sorting scene records, and development result. The detailed static workflow remains linked from the case study.

Layout and motion reference: https://www.pi.website/blog/api-beta . Inspection of its public HTML and SVG on November 3, 2026 found an MP4 hero montage and an external SVG workflow with CSS keyframes for dashed flow paths and robot motion. Our diagram and implementation are original.

Local reference copies for inspection were saved to `/tmp/pi-api-beta-reference.html` and `/tmp/pi-api-workflow-reference.svg`; these are not website dependencies.

The three scene images in `media/` come from `artifacts/packages_agent_repro_20261031`: `screenshots/semantic_pick_W1_views.jpg`, `screenshots/semantic_scanner_W1_W2.jpg`, and `evidence/single/head_final.jpg`. They are recorded stills. The animated overview is a method schematic.

Hosting: local preview. Source repository: public.
