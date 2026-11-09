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
    if('serviceWorker' in navigator&&location.protocol!=='file:'){addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}));}
    addEventListener('beforeinstallprompt',e=>{e.preventDefault();this.deferred=e;});
    addEventListener('appinstalled',()=>{this.deferred=null;});
  }
};
