/* OpenWalls service worker: offline shell, never caches API or payment traffic. */
const VER='openwalls-v32';
const SHELL=['https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js','https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js','./','index.html','openwalls.css','manifest.webmanifest','src/config.js','src/logo.js','src/ui.js','src/util.js','src/api.js','src/ow/catalog.js','src/ow/avatar-data.js','src/ow/glb-lite.js','src/ow/avatar-wear.js','src/ow/avatar.js','assets/avatars/female.glb','assets/avatars/male.glb','src/ow/room.js','src/ow/walk.js','src/ow/store.js','src/ow/tv.js','src/ow/previews.js','src/ow/app.js','src/ow/avatar-ui.js','src/ow/presence.js','src/ow/podcast.js','src/ow/spaces.js','https://cdn.jsdelivr.net/npm/livekit-client@2.5.7/dist/livekit-client.umd.js','src/pwa.js','icons/icon-192.png','icons/icon-512.png','icons/logo.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(VER).then(c=>Promise.all(SHELL.map(u=>c.add(u).catch(()=>{})))).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==VER).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
let told=0;const tell=()=>{if(Date.now()-told<20000)return;told=Date.now();self.clients.matchAll().then(cs=>cs.forEach(c=>c.postMessage({type:'upd'})));};
self.addEventListener('fetch',e=>{
  const r=e.request;if(r.method!=='GET')return;
  const u=new URL(r.url);
  if(u.origin===location.origin){
    if(/admin\.html|profile\.html/.test(u.pathname)&&r.mode==='navigate')return;
    // fresh copy when the network answers quickly, otherwise the saved copy right away (no waiting on a bad connection)
    e.respondWith((async()=>{
      const cache=await caches.open(VER);
      const net=fetch(r,{cache:'reload'}).then(async res=>{if(res.ok){const old=await cache.match(r);cache.put(r,res.clone());const a=old&&old.headers.get('etag'),b=res.headers.get('etag');if(a&&b&&a!==b)tell();}return res;});
      const hit=await cache.match(r)||await caches.match(r);
      if(!hit)return net.catch(()=>caches.match('index.html'));
      net.catch(()=>{});
      return Promise.race([net.catch(()=>hit),new Promise(res=>setTimeout(()=>res(hit),1500))]);
    })());
    return;
  }
  if(STATIC_HOSTS.includes(u.host)){
    e.respondWith(caches.match(r).then(m=>m||fetch(r).then(res=>{if(res.ok||res.type==='opaque'){const cp=res.clone();caches.open(VER).then(c=>c.put(r,cp));}return res;})));
  }
});
