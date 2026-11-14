/* ---------- avatar editor, joystick HUD, first-time chooser, avatar storage ---------- */
Object.assign(IC,{
  face:'<circle cx="12" cy="12" r="9"/><path d="M8.500 14.500c1 1.500 2.200 2 3.500 2s2.500-.5 3.500-2"/><path d="M9 9.500h.01M15 9.500h.01"/>',
  scissors:'<circle cx="6" cy="6.500" r="2.500"/><circle cx="6" cy="17.500" r="2.500"/><path d="M8 8l12 9M8 16L20 7"/>',
  body:'<circle cx="12" cy="4.500" r="1.800"/><path d="M5 9l7 1.500L19 9M12 10.500V16M12 16l-3.500 5M12 16l3.500 5"/>',
  shirt:'<path d="M8 4l-5 3 2.500 4 2-1V20h9V10l2 1L21 7l-5-3c-.5 1.500-2 2.500-4 2.500S8.500 5.500 8 4z"/>',
  shuffle:'<path d="M3 7h3c4 0 5 10 9 10h5M3 17h3c1.500 0 2.600-1.300 3.600-3M15 7h5"/><path d="M17.500 4.500L20 7l-2.500 2.500M17.500 14.500L20 17l-2.500 2.500"/>',
  walk:'<circle cx="13" cy="4.500" r="1.800"/><path d="M9 21l2-6 2.500 2V21M11 15l1.500-5.500-3 1.500-1.500 3.500M12.500 9.500l3 2.500 2.500 0"/>',
  hand:'<path d="M8 12V6a1.500 1.500 0 013 0v5M11 11V4.500a1.500 1.500 0 013 0V11M14 11V6a1.500 1.500 0 013 0v7c0 4-2 7-6 7-3 0-4-2-6-5l-1-2a1.500 1.500 0 012.500-1.500L8 14"/>'
});
Object.assign(Store,{
  _av:null,
  async loadAvatar(force){
    if(Store._av&&!force)return Store._av;let local=null;try{const own=localStorage.getItem('ow_avatar_uid')||'';/* a saved copy only counts for the account that made it (or for a guest) */if(!own||(Auth.user&&own===Auth.user.id))local=JSON.parse(localStorage.getItem('ow_avatar')||'null');}catch(e){}
    if(Auth.user){try{const r=await sb.from('rooms').select('theme').eq('owner_id',Auth.user.id).maybeSingle();const a=r.data&&r.data.theme&&r.data.theme.avatar;
      if(a){Store._av=OWA.migrate(a);try{localStorage.setItem('ow_avatar',JSON.stringify(Store._av));localStorage.setItem('ow_avatar_uid',Auth.user.id);}catch(e){}return Store._av;}
      if(local){Store._av=OWA.migrate(local);Store.saveAvatar(Store._av).catch(()=>{});return Store._av;}}catch(e){}}
    if(local){Store._av=OWA.migrate(local);return Store._av;}return null;},
  async saveAvatar(cfg){
    Store._av=cfg;try{localStorage.setItem('ow_avatar',JSON.stringify(cfg));localStorage.setItem('ow_avatar_uid',Auth.user?Auth.user.id:'');}catch(e){}if(!Auth.user)return;
    const r=await sb.from('rooms').select('id,theme').eq('owner_id',Auth.user.id).maybeSingle();if(r.error)throw r.error;if(!r.data)return;
    const theme=Object.assign({},r.data.theme||{},{avatar:cfg});const u=await sb.from('rooms').update({theme}).eq('id',r.data.id);if(u.error)throw u.error;},
  async uploadPortrait(cfg){
    const url=await OWA.thumb(cfg,'bust',320,320),blob=await (await fetch(url)).blob(),path=await uploadFile('avatars',blob,'jpg','image/jpeg');
    const r=await Auth.saveProfile({avatar_url:publicUrl('avatars',path)});if(r.error)throw r.error;}
});

/* ---------- thumbnails (async, serialised, one shared renderer) ---------- */
OWA.thumb=function(cfg,frame,W,H){
  W=W||120;H=H||150;OWA._tq=(OWA._tq||Promise.resolve()).then(async()=>{
    if(!OWA._tr){const c=document.createElement('canvas');OWA._tr=new THREE.WebGLRenderer({canvas:c,antialias:true,preserveDrawingBuffer:true});OWA._tr.outputEncoding=THREE.sRGBEncoding;
      const s=OWA._ts=new THREE.Scene();s.add(new THREE.HemisphereLight(0xfff4e6,0x6a5a52,.95));const d=new THREE.DirectionalLight(0xffffff,.85);d.position.set(1.5,3,3.5);s.add(d);OWA._tcam=new THREE.PerspectiveCamera(28,1,.05,30);}
    const r=OWA._tr,s=OWA._ts,cam=OWA._tcam;r.setSize(W,H,false);r.setClearColor('#1d2434');cam.aspect=W/H;
    const av=OWA.build(cfg);await av.ready;const k=av.height/1.68;av.group.rotation.y=-.25;s.add(av.group);av.update(.1,0);
    const fr=frame==='bust'?[1.45*k,1.5*k,26,1.4]:frame==='head'?[1.58*k,.9*k,24,1.58]:[.86*k,4.0,30,.86*k];
    cam.fov=fr[2];cam.updateProjectionMatrix();cam.position.set(0,fr[0],fr[1]);cam.lookAt(0,fr[3]*k/k,0);r.render(s,cam);
    const url=r.domElement.toDataURL('image/jpeg',.86);s.remove(av.group);av.dispose();return url;});
  return OWA._tq;};
/* ---------- live preview: one avatar, customised in place (no rebuild) ---------- */
OWA.Preview=class{
  constructor(host){this.host=host;const cv=document.createElement('canvas');cv.className='av-canvas';host.appendChild(cv);this.cv=cv;this.r=new THREE.WebGLRenderer({canvas:cv,antialias:true,alpha:true});this.r.outputEncoding=THREE.sRGBEncoding;this.r.setPixelRatio(Math.min(devicePixelRatio||1,2));
    this.scene=new THREE.Scene();this.scene.add(new THREE.HemisphereLight(0xfff4e6,0x56606e,.95));const d=new THREE.DirectionalLight(0xffffff,.9);d.position.set(1.8,3,3.4);this.scene.add(d);const rim=new THREE.DirectionalLight(0x7aa8ff,.5);rim.position.set(-3,2,-3);this.scene.add(rim);
    this.cam=new THREE.PerspectiveCamera(28,1,.05,30);this.ry=-.3;this.zoom=1;this.mode='face';this.alive=true;this.ptr=null;this.pose='stand';
    this.ro=new ResizeObserver(()=>this.resize());this.ro.observe(host);cv.style.touchAction='none';
    const pts=new Map();let pd=0;
    cv.addEventListener('pointerdown',e=>{cv.setPointerCapture(e.pointerId);pts.set(e.pointerId,e.clientX);if(pts.size===2){const [a,b]=[...pts.values()];pd=Math.abs(a-b);}});
    cv.addEventListener('pointermove',e=>{if(!pts.has(e.pointerId))return;const old=pts.get(e.pointerId);pts.set(e.pointerId,e.clientX);if(pts.size===1)this.ry+=(e.clientX-old)*.012;});
    const up=e=>{pts.delete(e.pointerId);};cv.addEventListener('pointerup',up);cv.addEventListener('pointercancel',up);
    cv.addEventListener('wheel',e=>{e.preventDefault();this.zoom=Math.max(.5,Math.min(1.8,this.zoom*(e.deltaY>0?1.08:.93)));},{passive:false});
    this.t0=performance.now();this.loop=this.loop.bind(this);requestAnimationFrame(this.loop);this.resize();}
  resize(){const w=this.host.clientWidth,h=this.host.clientHeight;if(!w||!h)return;this.r.setSize(w,h,false);this.cam.aspect=w/h;this.cam.updateProjectionMatrix();}
  /* gender change rebuilds (different base); everything else is applied live */
  set(cfg){const g=cfg.g;if(this.av&&this.g===g){this.av.apply(cfg);this.setMode(this.mode,true);return;}
    if(this.av){this.scene.remove(this.av.group);this.av.dispose();}this.g=g;const av=this.av=OWA.build(cfg);av.setPose(this.pose);this.scene.add(av.group);av.ready.then(()=>{if(this.av===av)this.setMode(this.mode,true);}).catch(e=>{this.err=e;this.host.dispatchEvent(new CustomEvent('avatar-error',{detail:e}));});}
  setMode(m,now){this.mode=m;const k=this.av?this.av.height/1.68:1;const T={face:{y:1.56*k,z:1.1*k,la:1.55*k},body:{y:.9*k,z:4.1,la:.88*k},side:{y:.9*k,z:4.1,la:.88*k},back:{y:.9*k,z:4.1,la:.88*k}};this.tgt=T[m]||T.body;if(m==='side')this.ryT=-Math.PI/2;else if(m==='back')this.ryT=Math.PI;else this.ryT=-.3;this.ry=this.ryT;if(now||!this.camState)this.camState=Object.assign({},this.tgt);}
  setPose(p){this.pose=p;this.av&&this.av.setPose(p);}
  loop(){if(!this.alive)return;requestAnimationFrame(this.loop);const now=performance.now(),dt=Math.min(.05,(now-this.t0)/1000);this.t0=now;
    if(this.av){this.av.update(dt,0);this.av.group.rotation.y+=(this.ry-this.av.group.rotation.y)*Math.min(1,dt*10);}
    const c=this.camState,t=this.tgt;if(c&&t){const k=Math.min(1,dt*6);c.y+=(t.y-c.y)*k;c.z+=(t.z-c.z)*k;c.la+=(t.la-c.la)*k;this.cam.position.set(0,c.y,c.z*this.zoom);this.cam.lookAt(0,c.la,0);}this.r.render(this.scene,this.cam);}
  destroy(){this.alive=false;this.ro.disconnect();if(this.av)this.av.dispose();this.r.dispose();try{this.r.forceContextLoss();}catch(e){}this.cv.remove();}
};
/* ---------- first-time chooser ---------- */
function chooseAvatar(onDone){
  sheet('Choose your avatar',(body,close)=>{
    body.append(h('p',{class:'tag',style:{marginBottom:'12px'}},'Pick a starting point. Everything can be changed afterwards.'));
    const row=h('div',{class:'av-choose'});
    for(const[g,label]of[['f','Woman'],['m','Man']]){const cfg=OWA.def(g);const img=h('img',{alt:label,width:'120',height:'150'});OWA.thumb(cfg,'full',240,300).then(u=>{img.src=u;}).catch(()=>{});
      row.append(h('button',{class:'av-card',onclick:()=>{close();Store._av=cfg;try{localStorage.setItem('ow_avatar',JSON.stringify(cfg));localStorage.setItem('ow_avatar_uid',Auth.user?Auth.user.id:'');}catch(e){}onDone?onDone(cfg):go('#/avatar');}},img,h('b',null,label)));}
    body.append(row);});
}
/* ---------- joystick HUD ---------- */
function walkHud(host,R,o){
  const base=h('div',{class:'joy','aria-label':'Walk joystick'},h('i',{class:'knob'}));let id=null,cx=0,cy=0;const RAD=46;
  const move=e=>{let dx=e.clientX-cx,dy=e.clientY-cy;const l=Math.hypot(dx,dy);if(l>RAD){dx=dx/l*RAD;dy=dy/l*RAD;}base.firstChild.style.transform=`translate(${dx}px,${dy}px)`;R.setJoy(dx/RAD,-dy/RAD);};
  base.addEventListener('pointerdown',e=>{e.preventDefault();id=e.pointerId;base.setPointerCapture(id);const b=base.getBoundingClientRect();cx=b.left+b.width/2;cy=b.top+b.height/2;base.classList.add('on');move(e);});
  base.addEventListener('pointermove',e=>{if(e.pointerId===id)move(e);});
  const end=e=>{if(e.pointerId!==id)return;id=null;base.classList.remove('on');base.firstChild.style.transform='';R.setJoy(0,0);};base.addEventListener('pointerup',end);base.addEventListener('pointercancel',end);
  const act=h('button',{class:'actbtn hide','aria-label':'Interact'},h('span',{class:'al'}));let cur=null;
  act.onclick=()=>{if(R.seat){R.standUp();return;}if(cur&&cur.it)R.interact(cur.it,cur.act.k);};
  const emo=h('button',{class:'emobtn','aria-label':'Emotes',onclick:()=>{const old=host.querySelector('.emopop');if(old){old.remove();return;}
    const pop=h('div',{class:'emopop'},[['wave','👋','Wave'],['dance','💃','Dance'],['dance2','🕺','Side sway'],['dance3','🙌','Raise the roof'],['dance4','🤖','Robot']].map(([k,e,l])=>h('button',{onclick:()=>{pop.remove();R.emote(k);}},h('span',null,e),l)));host.append(pop);}},icon('hand'));
  const el=h('div',{class:'walkhud'},base,act,emo);host.append(el);
  const keys={};const kd=e=>{const k=e.key.toLowerCase();if(!'wasd'.includes(k)&&!k.startsWith('arrow'))return;if(['INPUT','TEXTAREA'].includes((e.target||{}).tagName))return;keys[k]=e.type==='keydown';const x=(keys.d||keys.arrowright?1:0)-(keys.a||keys.arrowleft?1:0),y=(keys.w||keys.arrowup?1:0)-(keys.s||keys.arrowdown?1:0);R.setJoy(x,y);e.preventDefault();};
  window.addEventListener('keydown',kd);window.addEventListener('keyup',kd);
  return{el,setAction(n){cur=n;if(!n){act.classList.add('hide');return;}act.classList.remove('hide');act.firstChild.textContent=n.act.label;act.classList.toggle('stand',n.act.k==='stand');},destroy(){window.removeEventListener('keydown',kd);window.removeEventListener('keyup',kd);el.remove();const p=host.querySelector('.emopop');p&&p.remove();R.setJoy(0,0);}};
}
/* ---------- the editor ---------- */
async function avatarView(){
  const v=setView(true);v.append(spinner('Loading your avatar…'));let cfg=await Store.loadAvatar();
  if(!cfg){v.replaceChildren();chooseAvatar(()=>avatarView());v.append(empty('Choose your avatar','Pick Woman or Man to begin.'));return;}
  cfg=OWA.migrate(cfg);const start=JSON.stringify(cfg);const hist=[];let tab='face';v.replaceChildren();
  const ed=h('div',{class:'av-ed'});v.append(ed);
  const stage=h('div',{class:'av-stage'});const seg=h('div',{class:'av-seg'});const back=()=>{const b=App.avBack;if(b)go(b);else if(history.length>1&&App.hadRoute)history.back();else go('#/me');};
  const undoBtn=h('button',{class:'rbtn','aria-label':'Undo',onclick:()=>{const p=hist.pop();if(!p)return;cfg=JSON.parse(p);pv.set(cfg);paint();}},icon('undo'));
  const top=h('div',{class:'av-top'},h('button',{class:'rbtn','aria-label':'Back',onclick:async()=>{if(JSON.stringify(cfg)!==start&&!await confirmBox('Leave without saving?','Your changes to this avatar will be lost.','Leave',true))return;back();}},icon('back')),h('b',null,'Your look'),undoBtn,
    h('button',{class:'rbtn','aria-label':'Random look',onclick:()=>{push();cfg=OWA.random(cfg.g);pv.set(cfg);paint();}},icon('shuffle')));
  const tabs=h('div',{class:'av-tabs'}),content=h('div',{class:'av-content'});
  const done=h('button',{class:'btn primary block av-done'},'Complete avatar');
  ed.append(top,stage,seg,h('div',{class:'av-sheet'},h('div',{class:'av-row'},tabs,content),done));
  const pv=new OWA.Preview(stage);pv.set(cfg);App.teardown=()=>pv.destroy();
  stage.addEventListener('avatar-error',e=>{stage.append(h('div',{class:'av-err'},'Could not load the avatar model. '+(e.detail&&e.detail.message||'')));});
  const MODES=[['face','Face'],['body','Body'],['side','Side'],['back','Back']];
  const mb=MODES.map(([m,l])=>h('button',{class:m===pv.mode?'on':'','data-m':m,onclick:()=>{pv.setMode(m);mb.forEach(b=>b.classList.toggle('on',b.dataset.m===m));}},l));seg.append(...mb);
  const push=()=>{hist.push(JSON.stringify(cfg));if(hist.length>40)hist.shift();};
  const apply=patch=>{push();Object.assign(cfg,patch);pv.set(cfg);paint();};
  const live=patch=>{Object.assign(cfg,patch);pv.set(cfg);};
  const TABS=[['face','Face','face'],['hair','Hair','scissors'],['skin','Skin','palette'],['body','Body','body'],['style','Style','shirt']];
  const swatches=(cols,cur,fn,label)=>h('div',{class:'av-sw'},label?h('div',{class:'av-lab'},label):null,h('div',{class:'av-swr'},cols.map((c,i)=>h('button',{class:'sw'+((cur===i||cur===c)?' on':''),style:{background:c},'aria-label':'Colour '+(i+1),onclick:()=>fn(c,i)}))));
  const slider=(label,get,set,lo,hi,step,l1,l2)=>{const val=h('span',null,String(Math.round(get()*100)));const inp=h('input',{type:'range',min:String(lo),max:String(hi),step:String(step||.05),value:String(get())});
    let pushed=false;inp.oninput=()=>{if(!pushed){push();pushed=true;}val.textContent=String(Math.round(inp.value*100));set(+inp.value);pv.set(cfg);};inp.onchange=()=>{pushed=false;undoBtn.disabled=!hist.length;};
    return h('div',{class:'av-slider'},h('div',{class:'av-lab'},label,val),inp,l1?h('div',{class:'av-ends'},h('span',null,l1),h('span',null,l2)):null);};
  const chips=(list,cur,fn)=>h('div',{class:'av-chips'},list.map(([k,l])=>h('button',{class:'chip'+(cur===k?' on':''),onclick:()=>fn(k)},l)));
  const setX=(slot,k)=>{const ex=Object.assign({},cfg.extras);if(k)ex[slot]=k;else delete ex[slot];apply({extras:ex});};
  const note=t=>h('p',{class:'f-hint',style:{margin:'8px 2px'}},t);
  function paint(){
    tabs.replaceChildren(...TABS.map(([k,l,ic])=>h('button',{class:'av-tab'+(tab===k?' on':''),onclick:()=>{tab=k;content.scrollTop=0;paint();}},icon(ic),h('span',null,l))));
    const keep=content.scrollTop,out=[];
    if(tab==='face'){
      out.push(h('div',{class:'av-lab'},'Eyeglasses'),chips([['on','Glasses on'],['off','Glasses off']],cfg.glasses?'on':'off',k=>apply({glasses:k==='on'})));
      out.push(h('div',{class:'av-lab'},'Expression'),chips(OWA.EXPR.map(e=>[e[0],e[1]]),cfg.ex,k=>apply({ex:k})));
      out.push(swatches(OWA.EYEC,cfg.eyec,(c,i)=>apply({eyec:i}),'Eye colour'));
      out.push(h('div',{class:'av-lab',style:{marginTop:'10px'}},'Fine-tune face'));
      for(const[k,l]of OWA.FACEMORPH)out.push(slider(l,()=>cfg.mx[k]||0,x=>{cfg.mx[k]=x;},0,1,.05));
      out.push(note('Facial structure (nose, jaw, lips shape) is fixed by the supplied model. These sliders move its real face morph targets.'));}
    else if(tab==='hair'){out.push(swatches(OWA.HAIRC,cfg.hc,(c,i)=>apply({hc:i}),'Hair colour'));
      out.push(chips(OWA.HAIR,cfg.hair,k=>apply({hair:k})));
      out.push(h('div',{class:'av-lab',style:{marginTop:'10px'}},'Styles'),chips([['','Default bob']].concat(OWA.WEAR.hair),(cfg.extras||{}).hair||'',k=>setX('hair',k)));
      const cat=(OWA.catalog&&OWA.catalog.items||[]).filter(i=>i.slot==='hair');if(cat.length)out.push(chips(cat.map(i=>[i.id,i.name]),(cfg.extras||{}).hair||'',k=>setX('hair',k)));
      out.push(note('Extra styles are simple stylised pieces built on your avatar. Professionally modelled styles can be dropped in as GLB files (docs/AVATARS.md).'));}
    else if(tab==='skin'){out.push(h('div',{class:'av-swgrid'},OWA.SKIN.map((c,i)=>h('button',{class:'sw big'+(cfg.skin===i?' on':''),style:{background:c},'aria-label':'Skin tone '+(i+1),onclick:()=>apply({skin:i})}))));}
    else if(tab==='body'){
      out.push(h('div',{class:'av-gender'},[['f','Woman'],['m','Man']].map(([k,l])=>h('button',{class:cfg.g===k?'on':'',onclick:()=>{if(cfg.g===k)return;push();const keepc={skin:cfg.skin,hc:cfg.hc,eyec:cfg.eyec};cfg=Object.assign(OWA.def(k),keepc);pv.set(cfg);paint();}},l))));
      if(OWA.MODELS[cfg.g].proxy)out.push(note('Man uses the same rigged model with male proportions until a male GLB is added.'));
      for(const[k,l,a,b]of OWA.BODYSL)out.push(slider(l,()=>cfg[k]||0,x=>{cfg[k]=x;},-1,1,.05,a,b));
      out.push(note('Muscle definition needs body morph targets, which the supplied model does not have.'));}
    else{
      const X=cfg.extras||{};
      out.push(h('div',{class:'av-lab'},'Looks'),chips(OWA.LOOKS.map((l,i)=>[i,l.n]),-1,i=>apply(OWA.LOOKS[i].p)));
      out.push(h('div',{class:'av-lab'},'Top'),chips([['','Original']].concat(OWA.WEAR.top),X.top||'',k=>setX('top',k)),swatches(OWA.COLORS,cfg.topc,c=>apply({topc:c})));
      out.push(h('div',{class:'av-lab'},'Bottom'),chips([['','Original']].concat(OWA.WEAR.bottom),X.bottom||'',k=>setX('bottom',k)),swatches(OWA.COLORS,cfg.botc,c=>apply({botc:c})));
      out.push(h('div',{class:'av-lab'},'Hat'),chips([['','None']].concat(OWA.WEAR.hat),X.hat||'',k=>setX('hat',k)));if(X.hat)out.push(swatches(OWA.COLORS,cfg.hatc,c=>apply({hatc:c})));
      out.push(swatches(OWA.COLORS,cfg.shoec,c=>apply({shoec:c}),'Shoes'));
      out.push(h('div',{class:'av-lab'},'Club colours'),chips(Object.entries(OWA.CLUBS).map(([k,c])=>[k,c.n]),'',k=>{const c=OWA.CLUBS[k];apply({topc:c.b,botc:c.sh,shoec:c.k});}));
      out.push(note('Extra garments are simple stylised pieces fitted to your avatar. Club colours only tint colours; no badges or sponsors.'));}
    content.replaceChildren(...out);content.scrollTop=keep;undoBtn.disabled=!hist.length;
  }
  paint();OWA.loadCatalog&&OWA.loadCatalog().then(()=>{if(tab==='hair')paint();});
  done.onclick=()=>guard(done,async()=>{
    try{await Store.saveAvatar(cfg);}catch(e){toast(friendlyError(e),'err');return;}
    if(Auth.user)Store.uploadPortrait(cfg).catch(()=>{});toast('Avatar saved','ok');App.avBack=null;back();});
}

/* signing out or in starts from a clean slate: never show the previous account's avatar */
Auth.on(ev=>{if(ev==='signout'||ev==='signin'){Store._av=null;if(ev==='signout'){try{localStorage.removeItem('ow_avatar');localStorage.removeItem('ow_avatar_uid');}catch(e){}}}});
