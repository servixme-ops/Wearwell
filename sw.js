/* Lukks service worker: offline shell, never caches API or payment traffic. */
const VER='lukks-v8';
const SHELL=['./','index.html','phone.css','profile.css','manifest.webmanifest','src/data.js','src/art.js','src/config.js','src/logo.js','src/ui.js','src/scene.js','src/api.js','src/sound.js','src/phone.js','src/profileview.js','src/pwa.js','src/phone3d.js','src/flow.js','icons/icon-192.png','icons/icon-512.png','icons/logo.png'].concat(['common','calendar','camera','photos','messages','safari','notes','profile','receipt','post','lukks','ads','account'].map(n=>'src/apps/'+n+'.js'));
const STATIC_HOSTS=['cdnjs.cloudflare.com','cdn.jsdelivr.net','fonts.googleapis.com','fonts.gstatic.com'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(VER).then(c=>Promise.all(SHELL.map(u=>c.add(u).catch(()=>{})))).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==VER).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{
  const r=e.request;if(r.method!=='GET')return;
  const u=new URL(r.url);
  if(u.origin===location.origin){
    if(/admin\.html|profile\.html/.test(u.pathname)&&r.mode==='navigate')return;
    // network first so updates arrive, fall back to cache offline
    e.respondWith(fetch(r).then(res=>{if(res.ok){const cp=res.clone();caches.open(VER).then(c=>c.put(r,cp));}return res;}).catch(()=>caches.match(r).then(m=>m||caches.match('index.html'))));
    return;
  }
  if(STATIC_HOSTS.includes(u.host)){
    e.respondWith(caches.match(r).then(m=>m||fetch(r).then(res=>{if(res.ok||res.type==='opaque'){const cp=res.clone();caches.open(VER).then(c=>c.put(r,cp));}return res;})));
  }
});
