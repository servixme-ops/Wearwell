/* ---------- boot: start the phone, then auth ---------- */
const $=s=>document.querySelector(s);
(function(){
  Phone.init();
  try{if(!Local.get('inPhone',false))Local.set('lastApp',null);}catch(e){}
  Phone.enter();
  const ld=$('#loading');if(ld)ld.classList.add('gone');
  window.__ready=true;try{sessionStorage.removeItem('lk_try');}catch(e){}
  try{const sv=Local.get('sound',null);if(sv)Sound.load(sv.kind,true);}catch(e){}
  Auth.init().then(()=>{Phone.afterAuth();});
  if(typeof PWA!=='undefined')PWA.init();
})();
