/* ---------- PWA: service worker + install button (shown in Me) ---------- */
const PWA={
  deferred:null,
  isStandalone(){return matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;},
  isIosSafari(){const u=navigator.userAgent;return /iPad|iPhone|iPod/.test(u)&&/Safari/.test(u)&&!/CriOS|FxiOS|EdgiOS/.test(u);},
  canInstall(){return !this.isStandalone()&&(!!this.deferred||this.isIosSafari());},
  async install(){
    if(this.deferred){this.deferred.prompt();const r=await this.deferred.userChoice;this.deferred=null;return r&&r.outcome==='accepted';}
    if(this.isIosSafari())await dialog({title:'Install OpenWalls',body:'Tap the Share button in Safari, then choose “Add to Home Screen”.'});
    return false;
  },
  init(){
    if('serviceWorker' in navigator&&location.protocol!=='file:'){navigator.serviceWorker.addEventListener('message',e=>{if(!e.data||e.data.type!=='upd'||document.getElementById('upd-bar'))return;const b=document.createElement('div');b.id='upd-bar';b.style.cssText='position:fixed;left:12px;right:12px;top:calc(10px + env(safe-area-inset-top));z-index:999;display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:14px;background:#1d1a2b;color:#fff;font:700 13px system-ui;box-shadow:0 10px 30px rgba(0,0,0,.35)';const t=document.createElement('span');t.style.flex='1';t.textContent='A new version of OpenWalls is ready';const r=document.createElement('button');r.textContent='Refresh';r.style.cssText='padding:7px 14px;border-radius:99px;background:#ff5a3c;color:#fff;font-weight:800';r.onclick=()=>location.reload();const x=document.createElement('button');x.textContent='\u2715';x.style.cssText='color:#fff;padding:4px 8px';x.onclick=()=>b.remove();b.append(t,r,x);document.body.append(b);});addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}));}
    addEventListener('beforeinstallprompt',e=>{e.preventDefault();this.deferred=e;});
    addEventListener('appinstalled',()=>{this.deferred=null;});
  }
};
