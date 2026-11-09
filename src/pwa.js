/* ---------- PWA: service worker + dismissible install prompt ---------- */
const PWA={
  deferred:null,
  isStandalone(){return matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;},
  isIosSafari(){const u=navigator.userAgent;return /iPad|iPhone|iPod/.test(u)&&/Safari/.test(u)&&!/CriOS|FxiOS|EdgiOS/.test(u);},
  canInstall(){return !!this.deferred&&!this.isStandalone();},
  async install(){
    if(!this.deferred)return false;this.deferred.prompt();const r=await this.deferred.userChoice;this.deferred=null;this.hideBanner();return r&&r.outcome==='accepted';
  },
  iosHelp(){
    const dlg=h('div',{class:'pwa-ios'},h('p',null,'To install Lukks on your iPhone or iPad:'),h('ol',null,h('li',null,'Tap the Share button in Safari.'),h('li',null,'Choose “Add to Home Screen”.'),h('li',null,'Tap Add.')));
    return dialog({title:'Install Lukks',body:dlg});
  },
  dismissed(){const t=Local.get('pwa_dismiss',0);return t&&Date.now()-t<14*864e5;},
  init(){
    if('serviceWorker' in navigator&&location.protocol!=='file:'){addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}));}
    addEventListener('beforeinstallprompt',e=>{e.preventDefault();this.deferred=e;this.maybeShow();});
    addEventListener('appinstalled',()=>{this.deferred=null;this.hideBanner();});
    setTimeout(()=>this.maybeShow(),15000);
  },
  maybeShow(){
    if(this.isStandalone()||this.dismissed()||this.banner)return;
    if(!(this.canInstall()||this.isIosSafari()))return;
    if(typeof S!=='undefined'&&S.mode!=='room')return;
    const b=this.banner=h('div',{class:'pwa-banner',role:'dialog','aria-label':'Install Lukks'},
      h('img',{src:'icons/icon-192.png',alt:'',width:'40',height:'40'}),h('div',{class:'grow'},h('b',null,'Install Lukks'),h('span',null,this.canInstall()?'Add it to your home screen':'Share → Add to Home Screen')),
      h('button',{class:'pwa-go',onclick:()=>{this.canInstall()?this.install():this.iosHelp();}},this.canInstall()?'Install':'How'),
      h('button',{class:'pwa-x','aria-label':'Dismiss',onclick:()=>{Local.set('pwa_dismiss',Date.now());this.hideBanner();}},'×'));
    document.body.appendChild(b);requestAnimationFrame(()=>b.classList.add('in'));
  },
  hideBanner(){if(this.banner){this.banner.classList.remove('in');const b=this.banner;this.banner=null;setTimeout(()=>b.remove(),300);}}
};
