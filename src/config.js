/* ---------- CONFIG ----------
   Only public values live here. The Supabase publishable key is safe in the browser:
   every table is protected by row-level security. Secrets (Paystack) live in Supabase Edge Function env vars. */
const CFG={
  supabaseUrl:'https://iybiznrvhkeimkzepyvv.supabase.co',
  supabaseKey:'sb_publishable_I7FU3Y4jSTtzJR_6fD289w_nxfMongA',
  // Folder this site is served from, e.g. https://servixme-ops.github.io/Wearwell/
  site:location.origin+location.pathname.replace(/[^/]*$/,''),
  // Public website opened by Safari's "Open in browser". Change if Lukks gets its own domain.
  mainSite:'https://servixme-ops.github.io/Wearwell/',
  limits:{magazinePhotos:2,imageMB:12,wallpaperMB:6,gifMB:5,avatarMB:2},
  // Social profile URL patterns. Users add their own handle; none are preset.
  socials:{
    instagram:{label:'Instagram',base:'https://instagram.com/'},
    x:{label:'X',base:'https://x.com/'},
    youtube:{label:'YouTube',base:'https://youtube.com/@'},
    tiktok:{label:'TikTok',base:'https://tiktok.com/@'},
    linkedin:{label:'LinkedIn',base:'https://linkedin.com/in/'}
  }
};
