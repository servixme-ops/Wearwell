# Live Spaces

Audio rooms for OpenWalls, on the official LiveKit SDK (`livekit-client` 2.5.7 in the browser, LiveKit Cloud or self-hosted server).

## One-time setup (you must do this: no audio works until it is done)
1. Create a project at https://cloud.livekit.io (free tier is fine). Copy the **WebSocket URL** (`wss://….livekit.cloud`), **API key** and **API secret**.
2. Supabase dashboard → Edge Functions → Secrets. Add:
   - `LIVEKIT_URL` = the `wss://` URL
   - `LIVEKIT_API_KEY`
   - `LIVEKIT_API_SECRET`
3. Nothing else: the functions `livekit-token` and `space-admin` are already deployed. Secrets never reach the browser or the repo.
4. Open the site over HTTPS (microphone access requires it), sign in on two devices, start a space on one, join on the other.

## How it fits together
- **Rules live in Postgres.** Tables: `spaces`, `space_participants`, `space_invitations`, `speak_requests`, `space_messages`, `space_reports`, `user_blocks`, `space_categories`. RLS on all; clients write only through `space_*` RPCs (private-room checks, blocks, 4-speaker cap, rate limits).
- **`livekit-token`** (edge function): verifies the user, calls `space_join` (so the database decides access and role), then mints a LiveKit JWT. Hosts/speakers get `canPublish` (microphone only); listeners can only subscribe.
- **`space-admin`** (edge function): host actions (approve/deny, promote, demote, mute, remove, end). The database RPC enforces "caller is the host", then the function mirrors it on LiveKit (permission update, mute track, remove participant, delete room).
- **Client** `src/ow/spaces.js`: discovery (`#/spaces`), room (`#/space/<id>`). Avatars are the profile portrait (`profiles.avatar_url`, rendered from the GLB avatar), so no 3D scene loads in a space.
- Room state is polled every 3 s; presence uses a 15 s heartbeat (people unseen for 75 s drop off the list). Audio disconnects auto-reconnect; leaving closes tracks and the mic.

## Safety
Report space / participant, block (hides chat, unsubscribes their audio, stops them joining your spaces), host remove (cannot rejoin), speak-request limits (5 per 10 min, 60 s cool-down after a denial), chat limits (5 per 10 s), report limit (10/day). Reports are stored in `space_reports` for review via the service role.

## Podcast stage
A space plays out in the host's own room (falls back to a plain studio if the room is private or missing). The host and up to 3 speakers (4 seats total) sit at a desk with mics; avatars come from each person's saved avatar. The camera zooms to whoever is speaking (LiveKit active-speaker events) and returns to a wide shot when it is quiet; the menu has a switch for staying wide. Files: `src/ow/podcast.js` (3D stage) and `src/ow/spaces.js`.

## Not yet built
Recording (save/discard), push notifications for invites beyond the in-app notification.
