/* OpenWalls service worker: offline shell, never caches API or payment traffic. */
const VER='openwalls-v2';
const SHELL=['https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js','https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js','./','index.html','openwalls.css','manifest.webmanifest','src/config.js','src/logo.js','src/ui.js','src/util.js','src/api.js','src/ow/catalog.js','src/ow/room.js','src/ow/store.js','src/ow/app.js','src/pwa.js','icons/icon-192.png','icons/icon-512.png','icons/logo.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(VER).then(c=>Promise.all(SHELL.map(u=>c.add(u).catch(()=>{})))).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==VER).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{
  const r=e.request;if(r.method!=='GET')return;
  const u=new URL(r.url);
  if(u.origin===location.origin){
    if(/admin\.html|profile\.html/.test(u.pathname)&&r.mode==='navigate')return;
    // fresh copy when the network answers quickly, otherwise the saved copy right away (no waiting on a bad connection)
    e.respondWith((async()=>{
      const cache=await caches.open(VER);
      const net=fetch(r,{cache:'reload'}).then(res=>{if(res.ok)cache.put(r,res.clone());return res;});
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
