# Wearwell: Magazine Crate

A 3D Nigerian living room with a crate of fashion magazines. Static site, no build step needed.

- Run locally: `python3 -m http.server 8080` then open http://localhost:8080
- Deploy: push to GitHub, then Settings > Pages > deploy from the `main` branch root.
- Code: `src/data.js` (crates, magazines, looks), `src/art.js` (canvas illustration), `src/scene.js` (room, crate, book), `src/flow.js` (modes, input, UI).
- `node build.js` writes a single-file `dist/artifact.html` for previews.

Controls: drag to orbit the room, tap the crate, drag up/down to flick magazines, tap to pull out, drag a page to turn it, tap a + on an outfit to open its collection. The round button bottom-right gives quick actions and can be dragged to scrub.
