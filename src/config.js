/* ---------- CONFIG ----------
   Only public values live here. The Supabase publishable key is safe in the browser:
   every table is protected by row-level security. Secrets (Paystack) live in Supabase Edge Function env vars. */
const CFG={
  categories:{'Fashion Styles':['Creative Models','Baddies','Aesthetic Girlyss','Drip Gang','Nature Aesthetic','Witchy Style','Soft Statements'],'Occasions':['Beach Fun','Matrimonio','Dream Wedding','The Wedding Guest','After Dark','School Outfits','Cozy Style','Everyday Style']},
  supabaseUrl:'https://iybiznrvhkeimkzepyvv.supabase.co',
  supabaseKey:'sb_publishable_I7FU3Y4jSTtzJR_6fD289w_nxfMongA',
  // Folder this site is served from, e.g. https://servixme-ops.github.io/Wearwell/
  site:location.origin+location.pathname.replace(/[^/]*$/,''),
  // Public website opened by Safari's "Open in browser". Change if Lukks gets its own domain.
  mainSite:'https://servixme-ops.github.io/Wearwell/',
  limits:{magazinePhotos:2,imageMB:12,wallpaperMB:6,gifMB:5,avatarMB:2},
};
