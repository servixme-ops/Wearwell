# Lukks

A 3D digital fashion magazine set in a Nigerian living room: pull magazines from a crate, flip the pages, tap outfits. A **phone on the coffee table** opens a full iOS-style phone with 15 apps.

Static site (no build step): vanilla JS + three.js r128 + Supabase. Host it on GitHub Pages (Settings > Pages > Deploy from branch `main` / root).

## Phone
Lock screen (live clock, battery, signal, notifications, swipe up) → home screen (draggable icons, dock, widgets page) → apps:
Calendar · Camera · Photos · Messages · Safari · Notes (About Lukks + Testimonials) · Account · Lukks (profile, Discover, share link) · Lukks Receipt

## Pages
- `index.html` the experience (PWA: `manifest.webmanifest`, `sw.js`, install banner)
- `profile.html?u=<username>` public Lukks Profile (`/u/<username>` also works through `404.html`)
- `admin.html` admin dashboard (admin emails live in the `admin_emails` table)

## Backend (Supabase project `iybiznrvhkeimkzepyvv`)
Row-level security on every table. Limits (2 magazine photos per user, ad date clashes, prices, statuses) are enforced by database triggers, not the browser. Edge Functions: `paystack-init`, `paystack-verify`, `paystack-webhook`, `admin-approve-submission`.

## One-time setup
1. Supabase > Authentication > URL Configuration: Site URL = `https://servixme-ops.github.io/Wearwell/` (and add it to Redirect URLs).
2. Supabase > Edge Functions > Secrets: add `PAYSTACK_SECRET_KEY`. In Paystack set the webhook URL to the `paystack-webhook` function URL.
3. Sign up with the admin email, confirm it, then open `admin.html`.

Public keys only are in `src/config.js` (the Supabase publishable key is safe in the browser).
