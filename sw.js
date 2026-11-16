/* OpenWalls service worker: offline shell, never caches API or payment traffic. */
const VER='openwalls-v77';
const SHELL=['vendor/three.min.js','https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js','./','index.html','openwalls.css','manifest.webmanifest','src/config.js','src/logo.js','src/ui.js','src/util.js','src/api.js','src/ow/ads.js','src/ow/catalog.js','src/ow/avatar-data.js','src/ow/glb-lite.js','src/ow/avatar-wear.js','src/ow/avatar.js','assets/avatars/female.glb','assets/avatars/male.glb','src/ow/room.js','src/ow/walk.js','src/ow/store.js','src/ow/tv.js','src/ow/previews.js','src/ow/app.js','src/ow/avatar-ui.js','src/ow/presence.js','src/ow/podcast.js','src/ow/sippaint.js','src/ow/forum.js','src/ow/spaces.js','https://cdn.jsdelivr.net/npm/livekit-client@2.5.7/dist/livekit-client.umd.js','src/pwa.js','icons/icon-192.png','icons/icon-512.png','icons/logo.png'];
self.addEventListener('install',e=>{e.waitUntil((async()=>{
  /* Only take over from the old worker when every file of the app itself is saved; on a weak network a half-filled
     cache would leave a blank page, so the install fails and the old worker and its cache keep working. */
  const c=await caches.open(VER),olds=(await caches.keys()).filter(k=>k!==VER&&k!=='ow-glb'),fails=[];
  await Promise.all(SHELL.map(async u=>{try{await c.add(new Request(u,{cache:'reload'}));}catch(err){let m=null;for(const k of olds){m=await (await caches.open(k)).match(u);if(m)break;}
    if(m)await c.put(u,m);else if(!/^https?:/.test(u)&&!/\.glb$/.test(u))fails.push(u);}}));
  if(fails.length)throw new Error('incomplete shell: '+fails.slice(0,3).join(','));
  self.__hadOld=olds.length>0;await self.skipWaiting();})());});
self.addEventListener('activate',e=>{e.waitUntil((async()=>{const ks=await caches.keys(),olds=ks.filter(k=>k!==VER&&k!=='ow-glb');await Promise.all(olds.map(k=>caches.delete(k)));await self.clients.claim();
  /* a whole new version is now saved and active: tell open pages once (nothing is announced for first installs) */
  if(olds.length)(await self.clients.matchAll({type:'window'})).forEach(c=>c.postMessage({type:'upd'}));})());});
let told=0;const tell=()=>{if(Date.now()-told<20000)return;told=Date.now();self.clients.matchAll().then(cs=>cs.forEach(c=>c.postMessage({type:'upd'})));};
self.addEventListener('fetch',e=>{
  const r=e.request;if(r.method!=='GET')return;
  const u=new URL(r.url);
  if(u.origin===location.origin&&/\/assets\/avatars\/[\w.-]+\.glb$/.test(u.pathname)){
    /* avatar models are big (3-4 MB): serve the saved copy instantly, refresh it quietly in the background */
    e.respondWith((async()=>{const c=await caches.open('ow-glb'),hit=await c.match(u.pathname);
      const net=fetch(r).then(res=>{if(res.ok)c.put(u.pathname,res.clone());return res;});
      if(hit){net.catch(()=>{});return hit;}return net;})());
    return;
  }
  if(u.origin===location.origin){
    if(/admin\.html|profile\.html/.test(u.pathname)&&r.mode==='navigate')return;
    // the app's own files come from the saved copy of THIS version (all saved together when the version installed); anything not saved yet is fetched and kept
    e.respondWith((async()=>{
      const cache=await caches.open(VER),hit=await cache.match(r,r.mode==='navigate'?{ignoreSearch:true}:undefined);
      if(hit)return hit;
      try{const res=await fetch(r);if(res.ok&&res.type==='basic')cache.put(r,res.clone());return res;}
      catch(err){return (await caches.match('index.html'))||Response.error();}
    })());
    return;
  }
  if(STATIC_HOSTS.includes(u.host)){
    e.respondWith(caches.match(r).then(m=>m||fetch(r).then(res=>{if(res.ok||res.type==='opaque'){const cp=res.clone();caches.open(VER).then(c=>c.put(r,cp));}return res;})));
  }
});
