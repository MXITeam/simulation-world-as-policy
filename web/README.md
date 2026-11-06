# Research website

English: `index.html`. Chinese: `zh/index.html`.

Run `python3 -m http.server 18766 --bind 127.0.0.1` from the repository root, then open http://127.0.0.1:18766/web/.

The black website uses HTML, inline SVG, CSS, and vanilla JavaScript. The method diagram animates asset edits, candidate trials, and robot execution. Four H.264 videos show RGB-D observations, grasp outcome comparisons, a placement candidate, and a complete tower execution at 12× speed. Playback uses native controls, inline mobile playback, and metadata-only preloading. Starting a video pauses other clips.

Video provenance and experiment scope: [media/videos/README.md](media/videos/README.md).
