/* ---------- podcast stage: four seats and mics at a desk inside the host's room, camera follows whoever speaks ---------- */
(function(){
const T=THREE,P=OWRoom.prototype;
const SX=[-.78,-.26,.26,.78],SZ=-.3,SEAT=.48,ORDER=[1,2,0,3];
const M=(c,r,m)=>new T.MeshStandardMaterial({color:c,roughness:r==null?.7:r,metalness:m||0});
function box(w,h,d,mat,x,y,z){const m=new T.Mesh(new T.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;return m;}
function chair(x,zo,yo,yw){zo=zo||0;yo=yo||0;
  const g=new T.Group(),dark=M(0x2b2f3a,.8),acc=M(0x6c4bff,.6);
  const base=new T.Mesh(new T.CylinderGeometry(.27,.27,.03,20),dark);base.position.y=.02;const ped=new T.Mesh(new T.CylinderGeometry(.035,.035,.4,10),M(0x888e9b,.4,.6));ped.position.y=.22;
  const seat=box(.5,.07,.46,M(0x2b2f3a,.8),0,.44,0),back=box(.46,.5,.05,acc,0,.74,-.22);seat.userData.cSeat=1;back.userData.cBack=1;g.add(base,ped,seat,back);g.position.set(x,yo,SZ+zo);g.rotation.y=yw==null?-x*.15:yw;return g;
}

const RS=1.1,RY=.38,PITCH=.54;
const SP=.8,AWH=3.4,PXA=2.95,TXA=2.25;
function aisleLayout(cap){
  const per=cap/2,D=per*SP+4.2,zF=D/2-1.7,pos=[];
  for(let i=0;i<per;i++)[-1,1].forEach(sd=>pos.push({x:sd*PXA,z:zF-i*SP-SZ,y:0,row:i,yaw:-sd*Math.PI/2,side:sd,za:zF-i*SP}));
  return{cap,rows:1,rowN:[cap],pos,order:pos.map((q,i)=>i),maxX:AWH,width:AWH*2,aisle:true,per,D,W:AWH*2,zMin:-D/2+1.1,zMax:D/2-.8,zF};
}
function layout(cap){
  if(cap>8)return aisleLayout(cap);
  if(!cap||cap<=4)return{cap:4,rows:1,rowN:[4],pos:SX.map(x=>({x,z:0,y:0,row:0})),order:ORDER.slice(),maxX:1.05,width:2.6};
  const rowN=cap<=8?[8]:cap<=14?[7,7]:[7,7,6],pos=[];
  rowN.forEach((n,r)=>{for(let i=0;i<n;i++)pos.push({x:(i-(n-1)/2)*PITCH,z:-r*RS,y:r*RY,row:r});});
  const order=pos.map((p,i)=>i).sort((a,b)=>pos[a].row-pos[b].row||Math.abs(pos[a].x)-Math.abs(pos[b].x)||pos[a].x-pos[b].x);
  const mx=Math.max(...rowN);return{cap:pos.length,rows:rowN.length,rowN,pos,order,maxX:(mx-1)/2*PITCH+.3,width:(mx-1)*PITCH+.9};
}
function buildAisle(st,L,wood,g){
  const dark=M(0x2b2f3a,.8),len=L.per*SP+.3,zc=L.zF-(L.per-1)*SP/2;
  const rug=box(1.5,.02,L.D-1.2,M(0x3b3350,.95),0,.011,0);g.add(rug);
  [-1,1].forEach(sd=>{g.add(box(.7,.05,len,wood,sd*TXA,.74,zc),box(.04,.7,len,dark,sd*(TXA-.33),.38,zc));
    for(let i=0;i<4;i++){const z=L.zMin+.4+i*(L.D-2.4)/3,sc=new T.Mesh(new T.SphereGeometry(.09,12,10),new T.MeshBasicMaterial({color:0xffe2a8}));sc.position.set(sd*(AWH-.2),2.95,z);g.add(sc,box(.08,.18,.08,M(0xb98a55,.6),sd*(AWH-.12),2.95,z));}});
  const n=Math.max(3,Math.round(L.D/2.6));
  for(let i=0;i<n;i++){const z=L.zMax-.4-i*(L.zMax-L.zMin-.8)/(n-1);g.add(box(.02,.4,.02,M(0x9a8a6a),0,2.98,z));
    const bl=new T.Mesh(new T.SphereGeometry(.09,12,10),new T.MeshBasicMaterial({color:0xffe2a8}));bl.position.set(0,2.75,z);g.add(bl);
    const halo=new T.Mesh(new T.SphereGeometry(.17,12,10),new T.MeshBasicMaterial({color:0xffe2a8,transparent:true,opacity:.18,depthWrite:false}));halo.position.copy(bl.position);g.add(halo);}
  [.3,.7].forEach(k=>{const pl=new T.PointLight(0xffd9a8,.55,9);pl.position.set(0,2.6,L.zMax-(L.zMax-L.zMin)*k);g.add(pl);});
}
function buildSeats(st,L,wood){
  const g=new T.Group();st.seatG=g;st.g.add(g);
  if(L.aisle){
    buildAisle(st,L,wood,g);st.mics=[];st.bottles=[];
    L.pos.forEach((q,i)=>{g.add(chair(q.x,q.z,0,q.yaw));const m=mic(q.x);m.visible=false;st.mics[i]=m;g.add(m);const b=bottle();b.userData.home=new T.Vector3(q.x,.85,q.za);b.position.copy(b.userData.home);b.visible=false;st.bottles[i]=b;g.add(b);});
    return;}
  let k=0;
  L.rowN.forEach((n,r)=>{
    const z=-r*RS,y=r*RY,w=Math.max(2.6,(n-1)*PITCH+.9);
    g.add(box(w,.05,.62,wood,0,y+.74,SZ+z+.78),box(w,.7,.04,M(0x2b2f3a,.8),0,y+.38,SZ+z+1.06));
    if(r>0)g.add(box(w+.4,y,1.43,M(0x4a4560,.9),0,y/2,SZ+z+.265));
  });
  const rug=new T.Mesh(new T.CylinderGeometry(1.75,1.75,.02,40),M(0x3b3350,.95));rug.position.set(0,.011,SZ+.2-(L.rows-1)*RS*.5);rug.scale.set(Math.max(1,L.maxX/1.3),1,1+(L.rows-1)*.55);rug.receiveShadow=true;g.add(rug);
  st.mics=[];st.bottles=[];
  L.pos.forEach((q,i)=>{g.add(chair(q.x,q.z,q.y));const m=mic(q.x);m.position.z=SZ+q.z+.7;m.position.y=.75+q.y;st.mics[i]=m;g.add(m);const b=bottle();b.userData.home=new T.Vector3(q.x+BX,DESKY+.085+q.y,SZ+q.z+.74);b.position.copy(b.userData.home);st.bottles[i]=b;g.add(b);});
  if(st.paint){st.mics.forEach(m=>m.visible=false);st.bottles.forEach(b=>b.visible=false);}
}
function mic(x){
  const g=new T.Group(),metal=M(0x3a3f4b,.35,.7);
  const base=new T.Mesh(new T.CylinderGeometry(.09,.1,.02,18),metal);base.position.y=.01;
  const stem=new T.Mesh(new T.CylinderGeometry(.012,.012,.22,8),metal);stem.position.y=.12;
  const headMat=M(0x1b1d24,.35,.5);headMat.emissive=new T.Color(0x3ddc97);headMat.emissiveIntensity=0;
  const head=new T.Mesh(new T.SphereGeometry(.05,16,12),headMat);head.scale.set(1,1.7,1);head.position.set(0,.27,-.03);head.rotation.set(.4,0,-.5);
  const ring=new T.Mesh(new T.TorusGeometry(.07,.004,6,20),M(0x111111,.6));ring.position.set(-.02,.27,-.1);ring.rotation.set(.4,0,-.5);
  g.add(base,stem,head,ring);g.position.set(x+.24,.75,SZ+.7);g.userData.head=headMat;return g;
}
const DESKY=.765,BX=-.25,BZ=SZ+.74,GDUR={clap:3.2,smile:3.5,angry:4,quiet:3,fold:6,cheek:6,drink:3.6};
function bottle(){
  const g=new T.Group(),shell=new T.MeshStandardMaterial({color:0xcfeaff,roughness:.15,metalness:0,transparent:true,opacity:.5}),water=new T.MeshStandardMaterial({color:0x6cc0ff,roughness:.2,transparent:true,opacity:.75});
  const body=new T.Mesh(new T.CylinderGeometry(.03,.032,.17,16),shell),w=new T.Mesh(new T.CylinderGeometry(.026,.028,.12,16),water);w.position.y=-.02;
  const neck=new T.Mesh(new T.CylinderGeometry(.013,.03,.04,16),shell);neck.position.y=.105;
  const cap=new T.Mesh(new T.CylinderGeometry(.016,.016,.022,12),M(0x1f6fe0,.4));cap.position.y=.14;
  const lab=new T.Mesh(new T.CylinderGeometry(.0325,.0335,.05,16,1,true),M(0xffffff,.6));lab.position.y=0;
  g.add(body,w,neck,cap,lab);g.position.set(0,0,0);g.visible=false;return g;
}
P.stageChairColor=function(c){this.chairCol=c||null;const st=this.stage;if(!st)return;const k=new T.Color(c||0x6c4bff),k2=c?k.clone().multiplyScalar(.55):new T.Color(0x2b2f3a);st.g.traverse(o=>{if(o.userData.cBack)o.material.color.copy(k);else if(o.userData.cSeat)o.material.color.copy(k2);});this.markDirty&&this.markDirty(true);};
P.stageLayout=function(cap){
  const st=this.stage;if(!st||!st.paint)return;const L=layout(cap);if(L.cap===st.lay.cap)return;
  [...st.map.keys()].forEach(u=>this.stageRemove(u));this.stageWalkerOff();
  if(st.seatG){st.g.remove(st.seatG);st.seatG.traverse(o=>{if(o.geometry)o.geometry.dispose();});}
  if(L.aisle){Object.assign(this.room,{size:'large',width:L.W,depth:L.D,height:3.2});this.buildShell();}
  else if(L.cap>4&&this.room.width<8.3){Object.assign(this.room,{size:'large',width:8.4,depth:7.2,height:3.1});this.buildShell();}
  st.lay=L;st.seats=L.pos.map(()=>null);
  if(L.aisle){st.shift=0;st.wp=null;this.joy=this.joy||{x:0,y:0};this.cam.fov=80;this.cam.updateProjectionMatrix();}
  else{const need=(L.rows-1)*RS+1.35,avail=this.D/2-.1+SZ;st.shift=Math.max(0,need-avail);}
  st.g.position.z=st.shift;st.g.updateMatrixWorld(true);
  buildSeats(st,L,st.wood);if(this.chairCol)this.stageChairColor(this.chairCol);
  st.hidden.forEach(g=>g.visible=true);st.hidden.length=0;
  this.items.forEach(it=>{const n=this.nodes.get(it.id);if(!n)return;
    if(L.aisle){n.group.visible=false;st.hidden.push(n.group);return;}
    if(it.kind!=='furniture')return;const d=OW.furn(it.type);if(!d||d.floor)return;
    if(Math.abs(it.x)<L.maxX+.4&&it.z>SZ-(L.rows-1)*RS-.9&&it.z<SZ+1.9+st.shift){n.group.visible=false;st.hidden.push(n.group);}});
  st.lbl.classList.toggle('many',L.cap>8&&!L.aisle);st.lbl.classList.toggle('compact',L.cap>4);
  try{const th=(OW.THEMES[this.room.theme&&this.room.theme.key]||OW.THEMES.studio);this.host.style.background=L.cap>4?th.ceil:'';}catch(e){}
  this.shadowDirty=true;this.camForce=true;this.markDirty(true);
};
P.stageWalker=function(cfg){
  const st=this.stage;if(!st||!st.lay.aisle||st.walker)return;
  const f=this._fig(this,cfg);f.sh.visible=false;st.wp=st.wp||{x:0,z:st.lay.zMax-.2,sp:0};f.x=st.wp.x;f.z=st.wp.z;f.yaw=Math.PI;f.av.ready.then(()=>{if(this.stage){f.av.setPose('stand');f.pose='stand';this.placeFigure(f);this.markDirty(true);}}).catch(()=>{});
  this.placeFigure(f);st.walker={f};this.markDirty(true);
};
P.stageView=function(v){const st=this.stage;if(!st)return 'A';st.view=st.view===v?'A':v;this.camForce=true;this.markDirty(true);return st.view;};
P.stageWalkerOff=function(){const st=this.stage;if(!st||!st.walker)return;this.root.remove(st.walker.f.holder);try{st.walker.f.av.dispose();}catch(e){}st.walker=null;this.markDirty(true);};
P.stageReact=function(uid,name){
  const st=this.stage;if(!st)return;const e=st.map.get(uid);if(!e||!GDUR[name])return;
  e.gest={n:name,t:0,dur:GDUR[name]};e.nextDrink=25+Math.random()*25;
};
P.stageStart=function(cb,opts){
  if(this.stage)return;
  this.fpsCap=34;if(opts&&opts.paint){try{this.r.setPixelRatio(Math.min(window.devicePixelRatio||1,1.25));this.resize();}catch(e){}}
  const st=this.stage={g:new T.Group(),seats:[null,null,null,null],map:new Map(),mics:[],speaking:new Set(),focus:null,hold:0,auto:true,cb:cb||{},hidden:[],t:0,
    paint:!!(opts&&opts.paint),cur:{az:0,el:.2,dist:5,tx:0,ty:1.05,tz:SZ},lbl:h('div',{class:'sp-lbls'}),acc:0,fov0:this.cam.fov};
  const wood=M(0x8a6a4a,.6);st.wood=wood;st.lay=layout(4);st.shift=0;st.seats=st.lay.pos.map(()=>null);
  buildSeats(st,st.lay,wood);
  if(this.chairCol)this.stageChairColor(this.chairCol);
  this.root.add(st.g);
  /* clear the furniture that would sit inside the studio */
  this.items.forEach(it=>{if(it.kind!=='furniture')return;const d=OW.furn(it.type);if(!d||d.floor)return;const n=this.nodes.get(it.id);if(!n)return;
    if(Math.abs(it.x)<1.9&&it.z>SZ-.9&&it.z<SZ+1.6){n.group.visible=false;st.hidden.push(n.group);}});
  this.cam.fov=48;this.cam.near=.1;this.cam.far=60;this.cam.updateProjectionMatrix();
  this.setCam=function(){this.markDirty();};this.camT=null;
  this.walkTick=dt=>this.stageTick(dt);
  this.host.appendChild(st.lbl);this.shadowDirty=true;this.markDirty(true);
};
P.stageStop=function(){
  const st=this.stage;if(!st)return;this.stageWalkerOff();
  st.map.forEach(e=>{this.root.remove(e.f.holder);e.f.av.dispose();});this.root.remove(st.g);
  st.g.traverse(o=>{if(o.geometry)o.geometry.dispose();});st.hidden.forEach(g=>g.visible=true);st.lbl.remove();
  this.cam.fov=st.fov0;this.cam.updateProjectionMatrix();delete this.setCam;delete this.walkTick;this.stage=null;this.resetCamera(true);this.markDirty(true);
};
P.stageSeatOf=function(uid){const e=this.stage&&this.stage.map.get(uid);return e?e.idx:-1;};
P.stageAdd=function(uid,cfg){
  const st=this.stage;if(!st)return;const key=JSON.stringify(cfg);let e=st.map.get(uid);
  if(e&&e.key===key)return;let idx=e?e.idx:st.lay.order.find(i=>!st.seats[i]);
  if(idx==null)return;
  if(e){this.root.remove(e.f.holder);e.f.av.dispose();}
  const Q=st.lay.pos[idx],f=this._fig(this,cfg);f.x=Q.x;f.z=SZ+Q.z+st.shift;f.y=Q.y;f.yaw=Q.yaw==null?-Q.x*.15:Q.yaw;f.av.seatTop=SEAT;
  f.av.ready.then(()=>{if(!this.stage)return;f.av.seatTop=SEAT;f.av.setPose('sit');f.pose='sit';this.placeFigure(f);this.markDirty(true);}).catch(()=>{});
  f.sh.visible=false;this.placeFigure(f);st.map.set(uid,{f,idx,key,male:!!(cfg&&cfg.g==='m'),gest:null,nextDrink:12+Math.random()*25});st.seats[idx]=uid;st.bottles[idx].visible=!st.paint;this.stageLabel(uid);this.markDirty(true);
};
P.stageRemove=function(uid){
  const st=this.stage;if(!st)return;const e=st.map.get(uid);if(!e)return;
  this.root.remove(e.f.holder);e.f.av.dispose();st.map.delete(uid);st.seats[e.idx]=null;st.bottles[e.idx].visible=false;if(e.el)e.el.remove();if(st.focus===uid)st.focus=null;this.markDirty(true);
};
P.stageLabel=function(uid){const st=this.stage,e=st.map.get(uid);if(!e||e.el)return;e.el=h('button',{class:'sp-lbl',onclick:()=>st.cb.onTap&&st.cb.onTap(uid)});st.lbl.appendChild(e.el);};
P.stageInfo=function(uid,info){const e=this.stage&&this.stage.map.get(uid);if(!e||!e.el)return;const k=info.name+'|'+info.role+'|'+info.mic;if(e.k===k)return;e.k=k;
  e.el.replaceChildren(h('b',null,info.name),h('span',null,info.role,' ',info.mic?'🎙':'🔇'));};
P.stageSpeaking=function(set){
  const st=this.stage;if(!st)return;st.speaking=set;
  let pick=null;set.forEach(u=>{if(!pick&&st.map.has(u))pick=u;});
  if(pick&&!st.paint){st.focus=pick;st.hold=1.4;}
};
P.stageTick=function(dt){
  const st=this.stage;if(!st)return;st.t+=dt;st.acc+=dt;let dirty=false;
  if(st.hold>0){st.hold-=dt;if(st.hold<=0&&!st.speaking.size)st.focus=null;}
  if(st.acc>(st.lay.cap>8?.09:.045)){const sdt=st.acc;st.map.forEach((e,u)=>{const sp=st.speaking.has(u);e.f.av.setTalk(sp?1:0);
      const bt=st.bottles[e.idx];
      if(!e.gest&&!sp&&!st.paint){e.nextDrink-=sdt;if(e.nextDrink<=0){e.gest={n:'drink',t:0,dur:GDUR.drink};e.nextDrink=30+Math.random()*30;}}
      if(e.gest){const gs=e.gest;gs.t+=sdt;const w=Math.max(0,Math.min(1,gs.t/.5,(gs.dur-gs.t)/.5));let tg=null;
        if(gs.n==='paint'){const cv=st.cv&&st.cv[e.idx];if(cv)tg={canvas:cv.userData.pt.clone()};}
        if(gs.n==='angry'){const Q=st.lay.pos[e.idx];tg={desk:new T.Vector3(Q.x,DESKY+Q.y,SZ+Q.z+st.shift+.7)};}
        if(gs.n==='drink'){const hm=bt.userData.home,t=gs.t,H=e.f.av.headPos(new T.Vector3()),M_=new T.Vector3(H.x+Math.sin(e.f.yaw)*.1,H.y+.0,H.z+Math.cos(e.f.yaw)*.1).add(new T.Vector3(0,-.02,0));
          const ez=x=>x*x*(3-2*x);let k=0;if(t<.9)k=0;else if(t<1.8)k=ez((t-.9)/.9);else if(t<2.4)k=1;else if(t<3.3)k=1-ez((t-2.4)/.9);
          const pos=hm.clone().lerp(M_,k);bt.position.copy(pos);bt.rotation.x=-1.25*k;const yw=e.f.yaw,fw=new T.Vector3(Math.sin(yw)*.1,.0,Math.cos(yw)*.1),sd=new T.Vector3(-Math.cos(yw)*.07,0,Math.sin(yw)*.07),gp=pos.clone().add(sd).sub(fw);tg={bottle:gp,near:k>.8?1:Math.max(0,(k-.5)*2)};if(t>3.3){tg.bottle=hm.clone().add(sd).sub(fw);}}
        e.f.av.setGesture(gs.n,gs.t,w,tg);
        if(gs.t>=gs.dur){e.gest=null;e.f.av.setGesture(null);if(bt){bt.position.copy(bt.userData.home);bt.rotation.set(0,0,0);}}}
      e.f.av.update(sdt,0);e.f.holder.rotation.y=e.f.yaw;});st.acc=0;dirty=true;}
  st.mics.forEach((m,i)=>{const u=st.seats[i],on=u&&st.speaking.has(u),h=m.userData.head,tgt=on?.9:0;if(Math.abs(h.emissiveIntensity-tgt)>.01){h.emissiveIntensity+=(tgt-h.emissiveIntensity)*Math.min(1,dt*10);dirty=true;}});
  /* camera: wide shot of all four, or in on the speaker and their mic */
  const asp=this.cam.aspect||.6,tanH=Math.tan(this.cam.fov*Math.PI/360)*asp,c=st.cur;
  const fit=w=>Math.max(2.1,w/2/Math.min(tanH,Math.tan(this.cam.fov*Math.PI/360)*1.4)*1.06);
  let want;const e=st.auto&&st.focus&&st.map.get(st.focus);
  let walkMv=0;
  if(st.lay.aisle&&st.paint){const L=st.lay,wp=st.wp||(st.wp={x:0,z:L.zMax-.2,sp:0}),j=this.joy||{x:0,y:0},mag=Math.min(1,Math.hypot(j.x,j.y));
    const vw=st.view||'A',azv=vw==='L'?Math.PI/2:vw==='R'?-Math.PI/2:0;
    if(mag>.12){const l=Math.hypot(j.x,j.y)||1,ux=j.x/l,uy=j.y/l,fx=-Math.sin(azv),fz=-Math.cos(azv),rx=Math.cos(azv),rz=-Math.sin(azv),dx=fx*uy+rx*ux,dz=fz*uy+rz*ux,step=1.8*mag*dt;wp.x=Math.max(-1.45,Math.min(1.45,wp.x+dx*step));wp.z=Math.max(L.zMin,Math.min(L.zMax,wp.z+dz*step));wp.ty=Math.atan2(dx,dz);walkMv=1;}
    wp.sp+=(mag>.12?mag-wp.sp:-wp.sp)*Math.min(1,dt*10);
    const w=st.walker;if(w){const f=w.f;f.x=wp.x;f.z=wp.z;if(wp.ty!=null){let d=wp.ty-f.yaw;d=Math.atan2(Math.sin(d),Math.cos(d));f.yaw+=d*Math.min(1,dt*12);}f.av.update(dt,wp.sp);this.placeFigure(f);if(wp.sp>.02)dirty=true;}
    if(mag>.12)dirty=true;}
  if(st.lay.aisle&&st.paint&&!(e)){const wp=st.wp,vw=st.view||'A';const tf=vw==='A'?80:66;if(Math.abs(this.cam.fov-tf)>.15){this.cam.fov+=(tf-this.cam.fov)*Math.min(1,dt*5);this.cam.updateProjectionMatrix();dirty=true;}
    want=vw==='A'?{az:0,el:.46,dist:6.4,tx:0,ty:1.0,tz:wp.z-1.4}:{az:vw==='L'?Math.PI/2:-Math.PI/2,el:.28,dist:3.3,tx:wp.x+(vw==='L'?-.5:.5),ty:1.15,tz:wp.z};}
  else if(e){const x=st.lay.pos[e.idx].x;want={az:-x*.14,el:.16,dist:fit(1.05),tx:x*.92,ty:1.1,tz:SZ+.25};}
  else if(st.paint){const L=st.lay,rw=L.rows-1;want={az:0,el:.12+.17*rw,dist:fit(Math.max(2.5,L.width+.5))+rw*.9,tx:0,ty:1.42+.1*rw,tz:SZ+.1+st.shift-rw*.5};}
  else want={az:0,el:.26,dist:fit(2.25),tx:0,ty:1.05,tz:SZ+.1};
  const k=Math.min(1,dt*3.2);let mv=0;for(const q in want){const d=want[q]-c[q];c[q]+=d*k;mv+=Math.abs(d);}
  if(mv>.002||dirty||this.camForce){this.camForce=false;
    const ce=Math.cos(c.el),cam=this.cam;cam.position.set(c.tx+Math.sin(c.az)*ce*c.dist,c.ty+Math.sin(c.el)*c.dist,c.tz+Math.cos(c.az)*ce*c.dist);cam.lookAt(c.tx,c.ty,c.tz);cam.updateMatrixWorld();
    if(this.caps){const wf=this.wf();this.caps.forEach(({m,k})=>{const f=wf[k];m.visible=f.n[0]*(cam.position.x-f.o[0])+f.n[2]*(cam.position.z-f.o[2])>0;});}
    const w=this.host.clientWidth,hh=this.host.clientHeight,v=new T.Vector3();
    st.map.forEach(en=>{if(!en.el)return;const Q=st.lay.pos[en.idx];v.set(Q.x,Q.y+(st.paint?1.26:1.58)+(en.male?.14:0),SZ+Q.z+st.shift).project(cam);const dd=st.lay.aisle?Math.abs(cam.position.z-(SZ+Q.z))+Math.abs(cam.position.x-Q.x)*.4:0;if(st.lay.aisle){en.el.style.display=(dd>7.5||v.z>1)?'none':'';}en.el.style.transform='translate(-50%,-100%) translate('+((v.x*.5+.5)*w)+'px,'+((-v.y*.5+.5)*hh)+'px)';en.el.style.opacity=st.lay.aisle?Math.max(.35,Math.min(1,(8.2-dd)/3)):(e&&st.focus!==undefined&&st.map.get(st.focus)!==en?.55:1);
      en.el.classList.toggle('speak',st.speaking.has([...st.map.keys()].find(k=>st.map.get(k)===en)));});
    this.markDirty();
  }
};
P.stagePaint=function(uid){const st=this.stage,e=st&&st.map.get(uid);if(!e)return;if(e.gest&&e.gest.n==='paint'){e.gest.dur=e.gest.t+1.3;}else if(!e.gest)e.gest={n:'paint',t:0,dur:1.8};};
P.STAGE={SX,SZ,DESKY,SEAT,RS,RY};
P.stageAuto=function(on){if(this.stage)this.stage.auto=on;};
})();
