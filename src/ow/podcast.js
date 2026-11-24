/* ---------- podcast stage: four seats and mics at a desk inside the host's room, camera follows whoever speaks ---------- */
(function(){
const T=THREE,P=OWRoom.prototype;
const SX=[-.78,-.26,.26,.78],SZ=-.3,SEAT=.48,ORDER=[1,2,0,3];
const M=(c,r,m)=>new T.MeshStandardMaterial({color:c,roughness:r==null?.7:r,metalness:m||0});
function box(w,h,d,mat,x,y,z){const m=new T.Mesh(new T.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;return m;}
function chair(x,zo,yo){zo=zo||0;yo=yo||0;
  const g=new T.Group(),dark=M(0x2b2f3a,.8),acc=M(0x6c4bff,.6);
  const base=new T.Mesh(new T.CylinderGeometry(.27,.27,.03,20),dark);base.position.y=.02;const ped=new T.Mesh(new T.CylinderGeometry(.035,.035,.4,10),M(0x888e9b,.4,.6));ped.position.y=.22;
  const seat=box(.5,.07,.46,M(0x2b2f3a,.8),0,.44,0),back=box(.46,.5,.05,acc,0,.74,-.22);seat.userData.cSeat=1;back.userData.cBack=1;g.add(base,ped,seat,back);g.position.set(x,yo,SZ+zo);g.rotation.y=-x*.15;return g;
}

const RS=1.1,RY=.38,PITCH=.54;
function layout(cap){
  if(!cap||cap<=4)return{cap:4,rows:1,rowN:[4],pos:SX.map(x=>({x,z:0,y:0,row:0})),order:ORDER.slice(),maxX:1.05,width:2.6};
  const rowN=cap<=8?[8]:cap<=14?[7,7]:[7,7,6],pos=[];
  rowN.forEach((n,r)=>{for(let i=0;i<n;i++)pos.push({x:(i-(n-1)/2)*PITCH,z:-r*RS,y:r*RY,row:r});});
  const order=pos.map((p,i)=>i).sort((a,b)=>pos[a].row-pos[b].row||Math.abs(pos[a].x)-Math.abs(pos[b].x)||pos[a].x-pos[b].x);
  const mx=Math.max(...rowN);return{cap:pos.length,rows:rowN.length,rowN,pos,order,maxX:(mx-1)/2*PITCH+.3,width:(mx-1)*PITCH+.9};
}
function buildSeats(st,L,wood){
  const g=new T.Group();st.seatG=g;st.g.add(g);
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
  [...st.map.keys()].forEach(u=>this.stageRemove(u));
  if(st.seatG){st.g.remove(st.seatG);st.seatG.traverse(o=>{if(o.geometry)o.geometry.dispose();});}
  if(L.cap>4&&this.room.width<8.3){Object.assign(this.room,{size:'large',width:8.4,depth:7.2,height:3.1});this.buildShell();}
  st.lay=L;st.seats=L.pos.map(()=>null);
  const need=(L.rows-1)*RS+1.35,avail=this.D/2-.1+SZ;st.shift=Math.max(0,need-avail);st.g.position.z=st.shift;st.g.updateMatrixWorld(true);
  buildSeats(st,L,st.wood);if(this.chairCol)this.stageChairColor(this.chairCol);
  st.hidden.forEach(g=>g.visible=true);st.hidden.length=0;
  this.items.forEach(it=>{if(it.kind!=='furniture')return;const d=OW.furn(it.type);if(!d||d.floor)return;const n=this.nodes.get(it.id);if(!n)return;
    if(Math.abs(it.x)<L.maxX+.4&&it.z>SZ-(L.rows-1)*RS-.9&&it.z<SZ+1.9+st.shift){n.group.visible=false;st.hidden.push(n.group);}});
  st.lbl.classList.toggle('many',L.cap>8);st.lbl.classList.toggle('compact',L.cap>4);try{const th=(OW.THEMES[this.room.theme&&this.room.theme.key]||OW.THEMES.studio);this.host.style.background=L.cap>4?th.ceil:'';}catch(e){}this.shadowDirty=true;this.camForce=true;this.markDirty(true);
};
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
  const st=this.stage;if(!st)return;
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
  const Q=st.lay.pos[idx],f=this._fig(this,cfg);f.x=Q.x;f.z=SZ+Q.z+st.shift;f.y=Q.y;f.yaw=-Q.x*.15;f.av.seatTop=SEAT;
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
  if(e){const x=st.lay.pos[e.idx].x;want={az:-x*.14,el:.16,dist:fit(1.05),tx:x*.92,ty:1.1,tz:SZ+.25};}
  else if(st.paint&&st.lay.cap<=4)want={az:0,el:.1,dist:fit(2.5),tx:0,ty:1.42,tz:SZ+.1};
  else if(st.paint){const L=st.lay,rw=L.rows-1;want={az:0,el:.12+.17*rw,dist:fit(Math.max(2.5,L.width+.5))+rw*.9,tx:0,ty:1.42+.1*rw,tz:SZ+.1+st.shift-rw*.5};}
  else want={az:0,el:.26,dist:fit(2.25),tx:0,ty:1.05,tz:SZ+.1};
  const k=Math.min(1,dt*3.2);let mv=0;for(const q in want){const d=want[q]-c[q];c[q]+=d*k;mv+=Math.abs(d);}
  if(mv>.002||dirty||this.camForce){this.camForce=false;
    const ce=Math.cos(c.el),cam=this.cam;cam.position.set(c.tx+Math.sin(c.az)*ce*c.dist,c.ty+Math.sin(c.el)*c.dist,c.tz+Math.cos(c.az)*ce*c.dist);cam.lookAt(c.tx,c.ty,c.tz);cam.updateMatrixWorld();
    if(this.caps){const wf=this.wf();this.caps.forEach(({m,k})=>{const f=wf[k];m.visible=f.n[0]*(cam.position.x-f.o[0])+f.n[2]*(cam.position.z-f.o[2])>0;});}
    const w=this.host.clientWidth,hh=this.host.clientHeight,v=new T.Vector3();
    st.map.forEach(en=>{if(!en.el)return;const Q=st.lay.pos[en.idx];v.set(Q.x,Q.y+(st.paint?1.26:1.58)+(en.male?.14:0),SZ+Q.z+st.shift).project(cam);en.el.style.transform='translate(-50%,-100%) translate('+((v.x*.5+.5)*w)+'px,'+((-v.y*.5+.5)*hh)+'px)';en.el.style.opacity=e&&st.focus!==undefined&&st.map.get(st.focus)!==en?.55:1;
      en.el.classList.toggle('speak',st.speaking.has([...st.map.keys()].find(k=>st.map.get(k)===en)));});
    this.markDirty();
  }
};
P.stagePaint=function(uid){const st=this.stage,e=st&&st.map.get(uid);if(!e)return;if(e.gest&&e.gest.n==='paint'){e.gest.dur=e.gest.t+1.3;}else if(!e.gest)e.gest={n:'paint',t:0,dur:1.8};};
P.STAGE={SX,SZ,DESKY,SEAT,RS,RY};
P.stageAuto=function(on){if(this.stage)this.stage.auto=on;};
})();
