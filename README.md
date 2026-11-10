# OpenWalls

**Discover what's on everyone's walls.**

OpenWalls is a social discovery app where everyone has a personalised 3D room. Pick a room size, add furniture, hang photos and posters on the walls, attach links to objects, then share your room (`#/@username`) and explore other people's rooms.

Static site, no build step: vanilla JS + three.js r128 + Supabase (auth, Postgres with row-level security, storage). Host it on GitHub Pages (Settings > Pages > Deploy from branch `main` / root).

## Structure
- `src/ow/catalog.js` room sizes, themes, furniture and wall-decoration catalogue (models are built from primitives in code, created only when placed)
- `src/ow/room.js` the 3D room: camera, picking, dragging, bounds and collision, wall decorations, thumbnails and previews
- `src/ow/store.js` Supabase reads and writes (`rooms`, `room_items`, `room-images` bucket)
- `src/ow/app.js` Wall, Discover, Create (editor), Inbox, Me and the visitor view
- `src/api.js`, `src/ui.js`, `src/util.js`, `src/config.js` existing auth, upload and UI helpers
- `admin.html` kept from the earlier app for moderation; it is not linked from the main app except for admins

## Phases
1. Foundation: rooms, furniture, wall pictures, saving (done)
2. Room experience: richer interactions, preview generation, visitor mode (basics done)
3. Social discovery: ranking, reactions, visits, featured rooms
4. Community: comments, messages, notifications, privacy, reporting

## Custom domain (openwalls.com/@username)
1. Buy the domain, then in GitHub: Settings > Pages > Custom domain, enter it and turn on "Enforce HTTPS". Point your DNS at GitHub Pages as GitHub shows.
2. Set `CFG.site` in `src/config.js` to `https://openwalls.com/`. Shared links then look like `https://openwalls.com/#/@username`.
3. Visiting `https://openwalls.com/@username` also works: GitHub Pages serves `404.html`, which forwards to the room.
4. In Supabase > Authentication > URL Configuration, set the Site URL and add the domain to the redirect URLs.
