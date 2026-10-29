/* ---------- FLOW: state, camera, input, UI ---------- */
const $=s=>document.querySelector(s);
const S={mode:'room',crate:0,pos:0,target:0,day:true,az:-.18,el:.42,rad:2.1,book:null,flipT:0,flipBase:0,zoom:0,sheetOpen:false,auto:true};
const G={pos:new T.Vector3(),look:new T.Vector3(),fov:52};
const cur={look:new T.Vector3(0,.55,-1.1)};
const TGT=new T.Vector3(0,.55,-1.15);
const tweens=[];
const ease=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
function tween(dur,fn,done){tweens.push({t:0,dur,fn,done});}
const store={
  get(k){try{return JSON.parse(localStorage.getItem('ww_'+k)||'[]');}catch(e){return[];}},
  set(k,v){try{localStorage.setItem('ww_'+k,JSON.stringify(v));}catch(e){}}
};
let saved=new Set(store.get('saved')),wardrobe=new Set(store.get('wardrobe'));
const aspect=()=>innerWidth/Math.max(1,innerHeight);

/* ---- camera goals ---- */
function roomGoal(){
  const a=aspect(),r=S.rad*(a<.8?1.4:1);const ty=a<.8?.78:.55;
  TGT.y=ty;G.pos.set(TGT.x+r*Math.sin(S.az)*Math.cos(S.el),TGT.y+r*Math.sin(S.el),TGT.z+r*Math.cos(S.az)*Math.cos(S.el));
  G.pos.x=Math.max(-2.8,Math.min(2.8,G.pos.x));G.pos.z=Math.max(-2.6,Math.min(2.7,G.pos.z));
  G.look.copy(TGT);G.fov=a<.8?58:50;
}
function browseGoal(){
  const a=aspect();
  G.pos.set(CRATE_POS.x,CRATE_POS.y+(a<.8?.72:.5),CRATE_POS.z+(a<.8?.98:.66));
  G.look.set(CRATE_POS.x,CRATE_POS.y+.13,CRATE_POS.z-.01);G.fov=a<.8?40:38;
}
function pulledGoal(){
  browseGoal();const a=aspect();const dir=G.pos.clone().sub(G.look).normalize();G.pos.addScaledVector(dir,.1);G.fov=a<.8?58:46;
}
function goalQuat(pos,look){const m=new T.Matrix4().lookAt(pos,look,new T.Vector3(0,1,0));return new T.Quaternion().setFromRotationMatrix(m);}
function frameBasis(){
  const q=goalQuat(G.pos,G.look);
  return{q,fwd:new T.Vector3(0,0,-1).applyQuaternion(q),right:new T.Vector3(1,0,0).applyQuaternion(q),up:new T.Vector3(0,1,0).applyQuaternion(q)};
}
function visHalf(fov){return Math.tan(fov*Math.PI/360);}

/* ---- boot ---- */
async function boot(){
  const fonts=["700 40px 'Playfair Display'","900 40px 'Playfair Display'","italic 500 20px 'Playfair Display'","italic 600 20px 'Playfair Display'","400 40px 'Bebas Neue'","400 14px 'Instrument Sans'","600 14px 'Instrument Sans'","700 14px 'Instrument Sans'","500 14px 'Instrument Sans'"];
  try{await Promise.race([Promise.all(fonts.map(f=>document.fonts.load(f))),new Promise(r=>setTimeout(r,3000))]);}catch(e){}
  initScene($('#stage'));buildPhone3d();
  loadCrateMags(0);layoutMags(0);
  buildCratePicker();buildNav();bindInput();bindFab();resize();
  roomGoal();camera.position.copy(G.pos).add(new T.Vector3(.5,.5,.9));camera.fov=G.fov;cur.look.copy(G.look);
  addEventListener('resize',resize);
  setMode('room');
  Phone.init();
  try{if(Local.get('inPhone',false)){S.auto=false;setMode('phone');Phone.enter();}}catch(e){}
  $('#loading').classList.add('gone');
  last=performance.now();requestAnimationFrame(frame);
  window.__ready=true;
  if(location.hash==='#night'){S.day=false;setDaylight(false);}
  try{const sv=Local.get('sound',null);if(sv)Sound.load(sv.kind,true);}catch(e){}
  Auth.init().then(()=>{Phone.afterAuth();});
  if(typeof PWA!=='undefined')PWA.init();
  const q=new URLSearchParams(location.search),ref=q.get('reference')||q.get('trxref');
  if(ref&&q.get('pay')){try{history.replaceState({},'',location.pathname);}catch(e){}setTimeout(()=>{Phone.intentAfterUnlock={open:'ads',intent:{verify:ref}};enterPhone();},1400);}
}
function resize(){
  const w=innerWidth,h=innerHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();
}

/* ---- main loop ---- */
let last=0,idle=0;
function frame(now){
  requestAnimationFrame(frame);
  const dt=Math.max(0,Math.min(window.__dtMax||.05,(now-last)/1000));last=now;
  for(let i=tweens.length-1;i>=0;i--){const t=tweens[i];t.t+=dt;const p=Math.min(1,t.t/t.dur);t.fn(p);if(p>=1){tweens.splice(i,1);t.done&&t.done();}}
  // The phone covers the room: stop rendering 3D underneath so the phone UI stays fast.
  if(S.mode==='phone'&&typeof Phone!=='undefined'&&Phone.layer&&Phone.layer.classList.contains('open')&&Phone.state!=='closing')return;
  // camera goal
  if(S.mode==='room'){
    if(S.auto&&!S.dragging&&idle>3){S.az+=dt*.03*Math.sin(now/9000);}
    idle+=dt;roomGoal();
  }
  const k=1-Math.exp(-dt*(S.mode==='room'?9:4.2));
  camera.position.lerp(G.pos,k);cur.look.lerp(G.look,k);
  if(Math.abs(camera.fov-G.fov)>.01){camera.fov+=(G.fov-camera.fov)*k;camera.updateProjectionMatrix();}
  camera.lookAt(cur.look);
  // magazines
  S.pos+=(S.target-S.pos)*(1-Math.exp(-dt*(S.dragging?20:11)));
  if(Math.abs(S.target-S.pos)<.0005)S.pos=S.target;
  layoutMags(S.pos);
  if(S.mode==='browse'){const i=Math.max(0,Math.min(magGroups.length-1,Math.round(S.pos)));if(i!==S.sel)selectIdx(i);}
  // book
  if(S.book){
    if(S.mode==='reading'){
      const spd=S.dragging?1-Math.exp(-dt*26):1-Math.exp(-dt*9);
      S.flipNow+=(S.flipT-S.flipNow)*spd;if(Math.abs(S.flipT-S.flipNow)<.0008)S.flipNow=S.flipT;
      S.book.update(S.flipNow);
      followBook(dt);
    }
  }
  L.book.intensity+=((S.mode==='pulled'||S.mode==='reading'||S.mode==='pulling'?.55:0)-L.book.intensity)*k;
  if(S.mode==='reading'||S.mode==='pulled'||S.mode==='pulling'){const f=frameBasis();L.book.position.copy(camera.position).addScaledVector(f.up,.5);L.book.target.position.copy(camera.position).addScaledVector(f.fwd,1);}
  curtainFlutter(now);
  tagUpdate();tagPhone();phoneAnim(now);
  renderer.render(scene,camera);
}
function curtainFlutter(now){}

/* ---- modes & HUD ---- */
function setMode(m){
  S.mode=m;document.body.dataset.mode=m;
  if(m==='room'){roomGoal();}
  if(m==='phone'){phoneGoal();}
  if(m==='browse'){browseGoal();S.sel=-1;}
  if(m==='pulled'||m==='pulling'||m==='reading'){pulledGoal();}
  updateFab();
}
function selectIdx(i){
  S.sel=i;const m=crateMags(S.crate)[i];
  $('#bNum').textContent=String(i+1).padStart(2,'0')+' / '+String(magGroups.length).padStart(2,'0');
  $('#bTitle').textContent=m.title;$('#bTag').textContent=m.tagline;
  const t=$('#bTitle');t.classList.remove('pop');void t.offsetWidth;t.classList.add('pop');
  document.querySelectorAll('.dots i').forEach((d,j)=>d.classList.toggle('on',j===i));
}
function goBrowse(){
  if(S.mode!=='room')return;
  S.auto=false;S.dragging=false;setMode('browse');
  const dots=$('.dots');dots.innerHTML='';crateMags(S.crate).forEach(()=>dots.appendChild(document.createElement('i')));
}
function goRoom(){
  if(S.mode!=='browse')return;
  setMode('room');idle=0;
}

/* ---- pull out / return ---- */
function slotTransform(g){
  // target world transform of magazine g at its crate slot
  const i=magGroups.indexOf(g);const d=i-S.target;
  const keep=g.position.clone(),kr=g.rotation.clone(),ks=g.scale.clone(),kp=g.parent,fr=g.userData.free;
  g.userData.free=false;crate.add(g);layoutMags(S.target);
  g.updateWorldMatrix(true,false);
  const p=new T.Vector3(),q=new T.Quaternion(),s=new T.Vector3();g.matrixWorld.decompose(p,q,s);
  if(kp&&kp!==crate)kp.add(g);g.position.copy(keep);g.rotation.copy(kr);g.scale.copy(ks);g.userData.free=fr;
  return{p,q,s};
}
function pulledPose(){
  const f=frameBasis(),t=visHalf(G.fov),a=aspect();
  const lim=G.pos.distanceTo(CRATE_POS)*.5;
  let sc=1.12;
  const dH=(MAG.h*sc)/(.56*2*t),dW=(MAG.w*sc)/(.8*2*t*a);
  const d=Math.min(Math.max(dH,dW),lim);
  sc=Math.min(sc,.56*2*t*d/MAG.h*1.0,.8*2*t*a*d/MAG.w);
  const center=G.pos.clone().addScaledVector(f.fwd,d).addScaledVector(f.up,d*t*.22);
  const q=f.q.clone().multiply(new T.Quaternion().setFromEuler(new T.Euler(-.08,0,0)));
  const pos=center.clone().addScaledVector(new T.Vector3(0,1,0).applyQuaternion(q),-MAG.h*sc/2);
  return{pos,q,sc,center};
}
function pullOut(){
  if(S.mode!=='browse')return;
  const g=magGroups[Math.round(S.target)];S.pulled=g;S.target=Math.round(S.target);
  $('#pTitle').textContent=g.userData.m.title;$('#pTag').textContent=g.userData.m.tagline;$('#rTitle').textContent=g.userData.m.title;
  setMode('pulling');
  g.updateWorldMatrix(true,false);
  const p0=new T.Vector3(),q0=new T.Quaternion(),s0=new T.Vector3();g.matrixWorld.decompose(p0,q0,s0);
  scene.attach(g);g.userData.free=true;g.position.copy(p0);g.quaternion.copy(q0);g.scale.copy(s0);
  const P=pulledPose();
  tween(1.0,t=>{const e=ease(t);g.position.lerpVectors(p0,P.pos,e);g.position.y+=Math.sin(Math.PI*Math.min(1,t*1.2))*.07;g.quaternion.slerpQuaternions(q0,P.q,e);g.scale.setScalar(s0.x+(P.sc-s0.x)*e);},()=>{if(S.mode==='pulling')setMode('pulled');});
}
function returnToCrate(fromBook){
  const g=S.pulled;if(!g)return;
  setMode('pulling');
  const doReturn=()=>{
    if(S.book){scene.remove(S.book.group);S.book.dispose();S.book=null;}
    g.visible=true;
    const p0=g.position.clone(),q0=g.quaternion.clone(),s0=g.scale.x;
    browseGoal();
    const tr=slotTransform(g);
    tween(.95,t=>{const e=ease(t);g.position.lerpVectors(p0,tr.p,e);g.position.y+=Math.sin(Math.PI*t)*.06;g.quaternion.slerpQuaternions(q0,tr.q,e);g.scale.setScalar(s0+(tr.s.x-s0)*e);},()=>{
      crate.attach(g);g.userData.free=false;S.pulled=null;layoutMags(S.target);setMode('browse');S.sel=-1;});
  };
  if(S.book&&S.flipNow>.05){
    S.mode='closing';S.flipT=0;S.zoom=0;
    const wait=()=>{if(S.flipNow<.04){S.mode='pulling';doReturn();}else requestAnimationFrame(wait);};
    S.mode='reading';S.flipT=0;S.closing=true;wait();
  }else doReturn();
}

/* ---- book ---- */
function openBook(){
  if(S.mode!=='pulled')return;
  const g=S.pulled,m=g.userData.m;
  setMode('reading');S.flipNow=0;S.flipT=0;S.zoom=0;S.closing=false;
  const b=new Book(m);S.book=b;scene.add(b.group);
  // start exactly over the pulled magazine
  const P=pulledPose();
  b.group.quaternion.copy(P.q);b.group.scale.setScalar(P.sc);
  b.group.position.copy(P.center).addScaledVector(new T.Vector3(1,0,0).applyQuaternion(P.q),-MAG.w/2*P.sc);
  g.visible=false;
  b.update(0,true);
  updatePageHud();
}
function readTarget(){
  const f=frameBasis(),a=aspect(),t=visHalf(G.fov),w=MAG.w;
  const fl=S.flipNow;
  let cx,fit;
  if(fl<1){cx=w/2*(1-fl);fit=w*(1.2+.94*fl);}
  else if(fl<=4){cx=0;fit=w*2.14;}
  else{cx=-w/2*(fl-4);fit=w*(2.14-.94*(fl-4));}
  if(S.zoom){fit=w*1.12;cx=S.zoom*w/2;if(fl<=.5)cx=w/2;if(fl>=4.5)cx=-w/2;}
  const d=.46;
  const visW=2*t*a*d,visH=2*t*d;
  const sc=Math.min(visW/fit,visH*.7/MAG.h);
  const pos=G.pos.clone().addScaledVector(f.fwd,d).addScaledVector(f.right,-cx*sc).addScaledVector(f.up,visH*.02);
  return{pos,q:f.q.clone(),sc};
}
function followBook(dt){
  const b=S.book;const T1=readTarget();const k=1-Math.exp(-dt*5.5);
  b.group.position.lerp(T1.pos,k);b.group.quaternion.slerp(T1.q,k);b.group.scale.setScalar(b.group.scale.x+(T1.sc-b.group.scale.x)*k);
  updatePageHud();
}
let lastHud='';
function updatePageHud(){
  const f=Math.round(S.flipT),n=S.book?S.book.NL:5;
  let txt;
  if(f===0)txt='Cover';else if(f>=n)txt='Back cover';else txt=`Pages ${2*f}–${2*f+1} of ${2*n}`;
  if(txt!==lastHud){lastHud=txt;$('#rPage').textContent=txt;}
  $('#rPrev').disabled=f<=0;$('#rNext').disabled=f>=n;
  const bar=$('#rBar');bar.style.width=(S.flipT/n*100)+'%';
}
function turn(dir){
  if(S.mode!=='reading'||!S.book)return;
  const n=S.book.NL;S.flipT=Math.max(0,Math.min(n,Math.round(S.flipT)+dir));
}
function toggleZoom(){
  if(S.mode!=='reading')return;
  S.zoom=S.zoom?0:1;if(S.zoom){S.zoom=(S.flipT<=0)?1:(S.flipT>=S.book.NL?-1:1);}
  $('#zoomBtn')&&$('#zoomBtn').classList.toggle('on',!!S.zoom);
}

/* ---- picking ---- */
const ray=new T.Raycaster(),ndc=new T.Vector2();
function pick(x,y,objs){ndc.set(x/innerWidth*2-1,-(y/innerHeight)*2+1);ray.setFromCamera(ndc,camera);return ray.intersectObjects(objs,true);}

/* ---- input ---- */
const ptrs=new Map();
let g0=null;
function bindInput(){
  const el=$('#stage');
  el.addEventListener('pointerdown',e=>{
    if(S.sheetOpen)return;
    el.setPointerCapture(e.pointerId);ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});
    g0={x:e.clientX,y:e.clientY,t:performance.now(),moved:0,az:S.az,el:S.el,rad:S.rad,tgt:S.target,flip:S.flipT,dist:pinchDist()};
    S.dragging=true;idle=0;S.auto=false;
    if(S.mode==='reading'){S.readSide=e.clientX>innerWidth/2?1:-1;S.pagePx=pagePixels();}
  });
  el.addEventListener('pointermove',e=>{
    if(!ptrs.has(e.pointerId)||!g0)return;
    const p=ptrs.get(e.pointerId);p.x=e.clientX;p.y=e.clientY;
    const dx=e.clientX-g0.x,dy=e.clientY-g0.y;g0.moved=Math.max(g0.moved,Math.hypot(dx,dy));
    if(S.mode==='room'){
      if(ptrs.size>=2){const d=pinchDist();if(g0.dist)S.rad=Math.max(1.2,Math.min(3.4,g0.rad*g0.dist/d));}
      else{S.az=Math.max(-1.9,Math.min(1.9,g0.az-dx*.0052));S.el=Math.max(.12,Math.min(1.05,g0.el+dy*.0042));}
    }else if(S.mode==='browse'){
      S.target=Math.max(0,Math.min(magGroups.length-1,g0.tgt-dy/95));
      S.vel=-dy;
    }else if(S.mode==='reading'&&S.book){
      const n=S.book.NL,pw=S.pagePx||200;
      if(Math.abs(dx)>6||g0.moved>8){
        let v=g0.flip-dx/pw;
        v=Math.max(g0.flip-1,Math.min(g0.flip+1,v));S.flipT=Math.max(0,Math.min(n,v));
      }
    }
  });
  const up=e=>{
    if(!ptrs.has(e.pointerId))return;ptrs.delete(e.pointerId);
    if(ptrs.size>0||!g0)return;
    S.dragging=false;const dt=performance.now()-g0.t,dx=e.clientX-g0.x,dy=e.clientY-g0.y;const tap=g0.moved<9&&dt<450;
    if(S.mode==='room'){if(tap)tapRoom(e.clientX,e.clientY);}
    else if(S.mode==='phone'){if(tap&&(Phone.state==='closed'||Phone.layer.hidden))Phone.enter();}
    else if(S.mode==='browse'){
      if(tap)tapBrowse(e.clientX,e.clientY);
      else{const flick=-dy/Math.max(dt,60)*220/95;S.target=Math.max(0,Math.min(magGroups.length-1,Math.round(S.target+flick*.6)));}
    }else if(S.mode==='reading'&&S.book){
      const n=S.book.NL;
      if(tap)tapBook(e.clientX,e.clientY);
      else{
        const frac=S.flipT-g0.flip,v=-dx/Math.max(dt,50);
        let tgt=Math.round(g0.flip);
        if(Math.abs(frac)>.3||Math.abs(v)>.5){tgt=frac>0||(v>.5&&frac>=0)?Math.round(g0.flip)+1:Math.round(g0.flip)-1;if(frac===0)tgt=Math.round(g0.flip);}
        S.flipT=Math.max(0,Math.min(n,tgt));
      }
    }
    g0=null;
  };
  el.addEventListener('pointerup',up);el.addEventListener('pointercancel',up);
  el.addEventListener('wheel',e=>{
    e.preventDefault();
    if(S.mode==='room'){S.rad=Math.max(1.2,Math.min(3.4,S.rad+e.deltaY*.0012));}
    else if(S.mode==='browse'){stepMag(e.deltaY>0?1:-1);}
    else if(S.mode==='reading'){turn(e.deltaY>0?1:-1);}
  },{passive:false});
  addEventListener('keydown',e=>{
    if(S.mode==='phone')return;
    if(e.key==='Escape'){if(S.sheetOpen)closeSheet();else back();}
    if(S.sheetOpen)return;
    if(S.mode==='browse'){if(e.key==='ArrowUp'||e.key==='ArrowLeft')stepMag(-1);if(e.key==='ArrowDown'||e.key==='ArrowRight')stepMag(1);if(e.key==='Enter')pullOut();}
    else if(S.mode==='reading'){if(e.key==='ArrowRight')turn(1);if(e.key==='ArrowLeft')turn(-1);}
    else if(S.mode==='pulled'&&e.key==='Enter')openBook();
    else if(S.mode==='room'&&e.key==='Enter')goBrowse();
  });
}
function pinchDist(){if(ptrs.size<2)return 0;const a=[...ptrs.values()];return Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y);}
function pagePixels(){
  const b=S.book,w=MAG.w;const p0=new T.Vector3(0,0,0),p1=new T.Vector3(w,0,0);
  b.group.localToWorld(p0);b.group.localToWorld(p1);
  const s=v=>{v.project(camera);return v.x*innerWidth/2;};
  return Math.max(120,Math.abs(s(p1)-s(p0)));
}
function stepMag(d){if(S.mode!=='browse')return;S.target=Math.max(0,Math.min(magGroups.length-1,Math.round(S.target)+d));}
function tapRoom(x,y){
  const ph=pick(x,y,[phone3d.userData.hit]);if(ph.length){enterPhone();return;}
  const hit=pick(x,y,[crate]);if(hit.length)goBrowse();
}
function tapBrowse(x,y){
  const meshes=magGroups.map(g=>g.userData.mesh);const hit=pick(x,y,meshes);
  if(!hit.length)return;
  const g=hit[0].object.userData.mag,i=magGroups.indexOf(g);
  if(i===Math.round(S.target))pullOut();else S.target=i;
}
function tapBook(x,y){
  const b=S.book;const hit=pick(x,y,b.meshes()).filter(h=>{const u=h.object.userData;return u.side==='f'?u.flat:u.flat;});
  if(hit.length){const look=b.hotspot(hit[0]);if(look){openLook(look);return;}}
  if(S.zoom){toggleZoom();return;}
  turn(x>innerWidth/2?1:-1);
}
function back(){
  if(S.mode==='browse')goRoom();
  else if(S.mode==='pulled'||S.mode==='reading')returnToCrate();
}

/* ---- crate picker & nav ---- */
function buildCratePicker(){
  const w=$('#cratePick');w.innerHTML='';
  CRATES.forEach((c,i)=>{
    const b=document.createElement('button');b.className='crateCard'+(i===S.crate?' on':'');b.dataset.i=i;
    const sp=crateMags(i).slice(0,5).map(m=>`<i style="background:${m.bg}"></i>`).join('');
    b.innerHTML=`<span class="spines">${sp}</span><span class="cn">${c.name}</span><span class="cb">${c.blurb}</span>`;
    b.onclick=()=>switchCrate(i);w.appendChild(b);
  });
}
function switchCrate(i){
  if(i===S.crate||S.switching)return;
  if(S.mode==='pulled'||S.mode==='reading'||S.mode==='pulling')return;
  S.switching=true;
  const s0=crate.scale.x;
  tween(.28,t=>{crate.scale.setScalar(1-smooth(t)*.999);},()=>{
    S.crate=i;S.target=0;S.pos=0;loadCrateMags(i);layoutMags(0);
    document.querySelectorAll('.crateCard').forEach(c=>c.classList.toggle('on',+c.dataset.i===i));
    if(S.mode==='browse'){S.sel=-1;const dots=$('.dots');dots.innerHTML='';crateMags(i).forEach(()=>dots.appendChild(document.createElement('i')));}
    tween(.42,t=>{const e=smooth(t);crate.scale.setScalar(.001+e*(1.0+.06*Math.sin(Math.PI*t)));},()=>{crate.scale.setScalar(1);S.switching=false;});
  });
}
function buildNav(){
  document.querySelectorAll('#nav button').forEach(b=>{
    b.onclick=()=>{
      const t=b.dataset.tab;
      if(t==='crates'){closeSheet();if(S.mode==='browse')goRoom();setActiveTab('crates');return;}
      if(S.mode==='pulled'||S.mode==='reading')return;
      if(t==='lukks'){closeSheet();if(S.mode==='browse')goRoom();setTimeout(()=>{Phone.intentAfterUnlock={open:'lukks'};enterPhone();},S.mode==='room'?0:700);return;}
      setActiveTab(t);openSheet(t);
    };
  });
}
function setActiveTab(t){document.querySelectorAll('#nav button').forEach(b=>b.classList.toggle('on',b.dataset.tab===t));}

/* ---- sheets ---- */
function closeSheet(){S.sheetOpen=false;$('#sheet').classList.remove('open');setActiveTab('crates');}
function openSheet(kind,arg){
  const sh=$('#sheet'),body=$('#sheetBody'),title=$('#sheetTitle');
  S.sheetOpen=true;sh.classList.add('open');body.scrollTop=0;
  if(kind==='explore')renderExplore(title,body,arg);
  else if(kind==='saved')renderList(title,body,'Saved lukks',saved,'Tap the heart on any lukk to keep it here.');
  else if(kind==='wardrobe')renderList(title,body,'My Lukks',wardrobe,'Add lukks to My Lukks to plan outfits.');
  else if(kind==='look')renderLook(title,body,arg);
}
function thumb(look,w,h){const c=mk(w,h),g=c.getContext('2d');g.fillStyle=look.bg;g.fillRect(0,0,w,h);g.fillStyle='rgba(255,255,255,.2)';g.beginPath();g.arc(w/2,h*.6,w*.42,0,7);g.fill();drawFigure(g,look,w/2,h*.05,h*.9);return c;}
function allLooks(){const a=[];CRATES.forEach((c,ci)=>crateMags(ci).forEach(m=>m.looks.forEach(l=>a.push(l))));return a;}
function tile(look){
  const b=document.createElement('button');b.className='tile';
  const c=thumb(look,200,266);b.appendChild(c);
  const s=document.createElement('span');s.innerHTML=`<b>${look.name}</b><em>${look.designer}</em><u>${look.price}</u>`;b.appendChild(s);
  b.onclick=()=>openLook(look);return b;
}
let exploreFilter='all',exploreN=24;
function renderExplore(title,body,f){
  title.textContent='Explore';if(f)exploreFilter=f;
  body.innerHTML='';
  const chips=document.createElement('div');chips.className='chips';
  [['all','All']].concat(FABKEYS.map(k=>[k,FAB[k].label.split(' ')[0]])).forEach(([k,l])=>{
    const c=document.createElement('button');c.textContent=l;c.className=exploreFilter===k?'on':'';c.onclick=()=>{exploreFilter=k;exploreN=24;renderExplore(title,body);};chips.appendChild(c);});
  body.appendChild(chips);
  const grid=document.createElement('div');grid.className='grid';
  const list=allLooks().filter(l=>exploreFilter==='all'||l.fab===exploreFilter);
  list.slice(0,exploreN).forEach(l=>grid.appendChild(tile(l)));body.appendChild(grid);
  if(list.length>exploreN){const m=document.createElement('button');m.className='more';m.textContent=`Show more (${list.length-exploreN})`;m.onclick=()=>{exploreN+=24;const y=body.scrollTop;renderExplore(title,body);body.scrollTop=y;};body.appendChild(m);}
}
function renderList(title,body,t,set,empty){
  title.textContent=t;body.innerHTML='';
  const list=[...set].map(id=>LOOKS[id]).filter(Boolean);
  if(!list.length){body.innerHTML=`<p class="empty">${empty}</p>`;return;}
  const grid=document.createElement('div');grid.className='grid';list.forEach(l=>grid.appendChild(tile(l)));body.appendChild(grid);
}
function openLook(look){
  S.lookReturn=S.sheetOpen?null:null;openSheet('look',look);
}
function renderLook(title,body,look){
  title.textContent=look.coll;body.innerHTML='';
  const wrap=document.createElement('div');wrap.className='lookView';
  const c=thumb(look,480,640);c.className='hero';wrap.appendChild(c);
  const info=document.createElement('div');info.className='info';
  const isS=saved.has(look.id),isW=wardrobe.has(look.id);
  info.innerHTML=`<h3>${look.name}</h3><p class="by">${look.designer}</p><p class="price">${look.price}</p><p class="fab">${FAB[look.fab].label}</p><p class="desc">${look.desc}</p>
  <div class="acts"><button id="actSave" class="${isS?'on':''}">${isS?'Saved':'Save lukk'}</button><button id="actWard" class="${isW?'on':''}">${isW?'In My Lukks':'Add to My Lukks'}</button><button id="actReal">See real lukks</button></div>`;
  wrap.appendChild(info);body.appendChild(wrap);
  const more=document.createElement('div');more.className='moreFrom';more.innerHTML=`<h4>More from this collection</h4>`;
  const row=document.createElement('div');row.className='row';
  const mag=crateMags(look.ci)[look.mi];
  mag.looks.forEach(l=>{const t=tile(l);if(l.id===look.id)t.classList.add('cur');row.appendChild(t);});
  more.appendChild(row);body.appendChild(more);
  info.querySelector('#actSave').onclick=e=>{toggleSet(saved,'saved',look.id);renderLook(title,body,look);};
  info.querySelector('#actReal').onclick=()=>{const m=crateMags(look.ci)[look.mi];closeSheet();setTimeout(()=>{Phone.intentAfterUnlock={open:'lukks',intent:{cat:m.title}};enterPhone();},250);};
  info.querySelector('#actWard').onclick=e=>{toggleSet(wardrobe,'wardrobe',look.id);renderLook(title,body,look);};
}
function toggleSet(set,key,id){const on=!set.has(id);on?set.add(id):set.delete(id);store.set(key,[...set]);if(typeof pushSaved==='function')pushSaved(set===saved?'saved':'wardrobe',id,on);}
function goIssue(id){
  const [ci,mi]=String(id).split('-').map(Number);if(isNaN(ci)||isNaN(mi)||!CRATES[ci])return;
  if(S.mode!=='room')return;
  const go=()=>{goBrowse();S.target=Math.min(magGroups.length-1,mi);};
  if(ci!==S.crate){switchCrate(ci);setTimeout(go,820);}else go();
}

/* ---- FAB: circle control ---- */
let fabOpen=false;
function fabActions(){
  const m=S.mode;
  if(m==='room')return[
    {k:'browse',l:'Browse crate',i:'crate',f:goBrowse},
    {k:'reset',l:'Reset view',i:'reset',f:()=>{S.az=-.18;S.el=.42;S.rad=2.1;idle=0;}},
    {k:'light',l:S.day?'Evening':'Daylight',i:S.day?'moon':'sun',f:()=>{S.day=!S.day;setDaylight(S.day);updateFab();}}];
  if(m==='browse')return[
    {k:'prev',l:'Previous',i:'up',f:()=>stepMag(-1)},
    {k:'next',l:'Next',i:'down',f:()=>stepMag(1)},
    {k:'pull',l:'Pull out',i:'pull',f:pullOut},
    {k:'room',l:'Room',i:'room',f:goRoom}];
  if(m==='pulled')return[{k:'open',l:'Open',i:'open',f:openBook},{k:'ret',l:'Return',i:'ret',f:()=>returnToCrate()}];
  if(m==='reading')return[
    {k:'prev',l:'Previous page',i:'left',f:()=>turn(-1)},
    {k:'next',l:'Next page',i:'right',f:()=>turn(1)},
    {k:'zoom',l:'Zoom page',i:'zoom',f:toggleZoom},
    {k:'ret',l:'Return',i:'ret',f:()=>returnToCrate()}];
  return[];
}
const ICON={
  crate:'<path d="M4 9h16v10H4zM4 9l2-4h12l2 4M9 13h6"/>',reset:'<path d="M4 12a8 8 0 1 0 3-6.2M4 4v4h4"/>',
  sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/>',
  moon:'<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
  up:'<path d="M6 14l6-6 6 6"/>',down:'<path d="M6 10l6 6 6-6"/>',left:'<path d="M14 6l-6 6 6 6"/>',right:'<path d="M10 6l6 6-6 6"/>',
  pull:'<path d="M12 19V7M7 12l5-5 5 5M5 4h14"/>',room:'<path d="M4 20V8l8-5 8 5v12zM9 20v-6h6v6"/>',
  open:'<path d="M12 6c-2-1.5-5-2-8-1.5V18c3-.5 6 0 8 1.5 2-1.5 5-2 8-1.5V4.5C17 4 14 4.5 12 6zM12 6v13"/>',
  ret:'<path d="M9 7L4 12l5 5M4 12h10a6 6 0 0 1 0 6"/>',zoom:'<circle cx="11" cy="11" r="6"/><path d="M16 16l5 5M11 8v6M8 11h6"/>'
};
function svg(k){return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICON[k]}</svg>`;}
function updateFab(){
  const menu=$('#fabMenu');menu.innerHTML='';
  const acts=fabActions();const n=acts.length;
  acts.forEach((a,i)=>{
    const b=document.createElement('button');b.className='fabAct';b.setAttribute('aria-label',a.l);
    const ang=Math.PI+(n===1?Math.PI/4:(i/(n-1))*Math.PI/2);
    const R=82;b.style.setProperty('--x',(Math.cos(ang)*R)+'px');b.style.setProperty('--y',(Math.sin(ang)*R)+'px');
    b.innerHTML=svg(a.i)+`<span>${a.l}</span>`;
    b.onclick=ev=>{ev.stopPropagation();setFab(false);a.f();};menu.appendChild(b);
  });
  $('#fab').classList.toggle('hidden',!n);
  if(!n)setFab(false);
}
function setFab(o){fabOpen=o;$('#fab').classList.toggle('open',o);}
function bindFab(){
  const knob=$('#fabKnob'),fab=$('#fab');let st=null;
  knob.addEventListener('pointerdown',e=>{knob.setPointerCapture(e.pointerId);st={x:e.clientX,y:e.clientY,t:performance.now(),acc:0,moved:0};e.stopPropagation();});
  knob.addEventListener('pointermove',e=>{
    if(!st)return;const dx=e.clientX-st.x,dy=e.clientY-st.y;st.moved=Math.max(st.moved,Math.hypot(dx,dy));
    const r=Math.hypot(dx,dy),lim=26,k=r>lim?lim/r:1;knob.style.transform=`translate(${dx*k}px,${dy*k}px)`;
    if(st.moved<10)return;setFab(false);
    if(S.mode==='browse'){const step=dy/34;const base=st.base===undefined?(st.base=S.target):st.base;S.target=Math.max(0,Math.min(magGroups.length-1,base+step));S.dragging=true;}
    else if(S.mode==='reading'&&S.book){const base=st.base===undefined?(st.base=Math.round(S.flipT)):st.base;S.flipT=Math.max(0,Math.min(S.book.NL,base+dx/60));S.dragging=true;}
    else if(S.mode==='room'){S.az=Math.max(-1.9,Math.min(1.9,S.az+dx*.00022));S.el=Math.max(.12,Math.min(1.05,S.el+dy*.00018));S.auto=false;S.fabRoom=true;}
  });
  const end=e=>{
    if(!st)return;knob.style.transform='';
    const tap=st.moved<10&&performance.now()-st.t<500;
    if(tap)setFab(!fabOpen);
    else{S.dragging=false;
      if(S.mode==='browse')S.target=Math.round(S.target);
      if(S.mode==='reading'&&S.book)S.flipT=Math.round(S.flipT);}
    st=null;
  };
  knob.addEventListener('pointerup',end);knob.addEventListener('pointercancel',end);
  document.addEventListener('pointerdown',e=>{if(fabOpen&&!e.target.closest('#fab'))setFab(false);});
  $('#pullBtn').onclick=pullOut;
  $('#backBtn').onclick=back;
  $('#openBtn').onclick=openBook;
  $('#retBtn').onclick=()=>returnToCrate();
  $('#rClose').onclick=()=>returnToCrate();
  $('#rPrev').onclick=()=>turn(-1);$('#rNext').onclick=()=>turn(1);
  $('#zoomBtn').onclick=toggleZoom;
  $('#sheetClose').onclick=closeSheet;
  $('#sheet').addEventListener('click',e=>{if(e.target.id==='sheet')closeSheet();});
  $('#tagBtn').onclick=goBrowse;
  $('#phoneTag').onclick=enterPhone;
  $('#heartBtn').onclick=()=>{setActiveTab('saved');openSheet('saved');};
}
function tagUpdate(){
  const tag=$('#crateTag');
  if(S.mode!=='room'){tag.style.opacity=0;tag.style.pointerEvents='none';return;}
  const v=CRATE_POS.clone();v.y+=.32;v.project(camera);
  const x=(v.x*.5+.5)*innerWidth,y=(-v.y*.5+.5)*innerHeight;
  tag.style.transform=`translate(${x}px,${y}px) translate(-50%,-100%)`;tag.style.opacity=v.z<1?1:0;tag.style.pointerEvents='auto';
}
boot();
