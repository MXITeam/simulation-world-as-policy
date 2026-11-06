# Method figures, v2

Editable SVG diagrams with embedded source scene photographs. PNGs are browser renders of the SVGs. No image-generation model was used for these figures. Typography and restrained colors take inspiration from the π0.5 research page: https://www.pi.website/blog/pi05 . The diagrams and layout are original.

## Local evidence sources

Relative to the parent workspace, the source image is `artifacts/packages_agent_repro_20261031/screenshots/semantic_scanner_W1_W2.jpg`. The upper-left camera view is W1; the lower-left camera view is W2. The figures display these as cropped SVG viewports. No rendered scene is labeled as a real robot.

Evidence consulted:
- `artifacts/packages_agent_repro_20261031/AGENT_START_HERE.md`
- `artifacts/packages_agent_repro_20261031/LIVE_VALIDATION_STATUS.md`
- `artifacts/packages_agent_repro_20261031/evidence/single/SINGLE_FULL_SEMANTIC_FINAL.json`

These records describe one single-package development episode with six semantic nodes, native E2E=1 and 1200 W1 control steps. TRAIN 86 supplied the first three node references; TRAIN 30 supplied the remaining three. This documentation review is not a fresh execution or independent full audit.

The four-package task is incomplete; its record includes a manually annotated RGB-D region. Neither episode establishes an autonomous RGB-D-only generalization result or a benchmark success rate. Parallel search and self-evolution are proposed architecture, not measured results from these images. W3 contact candidates do not substitute for W2 full forward validation; W2 validation does not substitute for W1 execution.
