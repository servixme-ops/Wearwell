/* ---------- walk mode: your avatar moves around the room with a joystick, sits, lies down and uses things ---------- */
(function(){
const T=THREE,P=OWRoom.prototype,PI=Math.PI;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const SEATS={sofa:{top:.65,slots:[-.6,0,.6]},armchair:{top:.65,slots:[0]},pouf:{top:.38,slots:[0]},gaming_chair:{top:.5,slots:[0]}};
const BEDS={bed_single:1,bed_double:1};
const LAMPS={floor_lamp:1,table_lamp:1};
const MIRRORS={mirror_floor:'Change look',dresser:'Change look',wardrobe:'Change look'};
const USES={tv:'Watch',monitor:'Open',laptop:'Open',record_player:'Play',book_stack:'Read'};
function shadowTex(){if(shadowTex.t)return shadowTex.t;const c=OW.canvas(64,64),g=c.getContext('2d'),gr=g.createRadialGradient(32,32,2,32,32,31);gr.addColorStop(0,'rgba(0,0,0,.42)');gr.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=gr;g.fillRect(0,0,64,64);return shadowTex.t=OW.tex(c);}
function makeFigure(room,cfg){const av=OWA.build(cfg);av.group.traverse(o=>{if(o.isMesh)o.castShadow=false;});const holder=new T.Group();holder.add(av.group);
  const sh=new T.Mesh(new T.PlaneGeometry(.95,.95),new T.MeshBasicMaterial({map:shadowTex(),transparent:true,depthWrite:false}));sh.rotation.x=-PI/2;sh.position.y=.012;holder.add(sh);
  room.root.add(holder);av.ready.then(()=>{if(holder.userData.resident)holder.traverse(o=>{o.userData.resident=true;});room.markDirty(true);}).catch(()=>{});av.dirty=()=>room.markDirty&&room.markDirty(true);return{av,holder,sh,x:0,z:0,yaw:0,speed:0,pose:'stand'};}
/* ---------- geometry helpers ---------- */
P.blockers=function(){return this.items.filter(o=>{if(o.kind!=='furniture')return false;const d=OW.furn(o.type);return d&&!d.floor&&!d.surface&&!(o.y>.05);});};
P.pushOut=function(x,z,r,list){
  const hw=this.W/2-.22,hd=this.D/2-.22;x=clamp(x,-hw,hw);z=clamp(z,-hd,hd);
  for(const o of list){const d=OW.furn(o.type),k=o.scale||1,w=d.w*k/2,e=d.d*k/2,rot=o.rot||0,c=Math.cos(rot),s=Math.sin(rot),dx=x-o.x,dz=z-o.z;
    const lx=dx*c-dz*s,lz=dx*s+dz*c,cx=clamp(lx,-w,w),cz=clamp(lz,-e,e);let ex=lx-cx,ez=lz-cz,len=Math.hypot(ex,ez);
    if(len>=r)continue;let nx,nz,push;
    if(len<1e-4){const px=w-Math.abs(lx),pz=e-Math.abs(lz);if(px<pz){nx=Math.sign(lx)||1;nz=0;push=px+r;}else{nx=0;nz=Math.sign(lz)||1;push=pz+r;}}else{nx=ex/len;nz=ez/len;push=r-len;}
    const wx=nx*c+nz*s,wz=-nx*s+nz*c;x+=wx*push;z+=wz*push;}
  return[clamp(x,-hw,hw),clamp(z,-hd,hd)];};
P.blockedAt=function(x,z,r,list){const q=this.pushOut(x,z,r,list||this.blockers());return Math.hypot(q[0]-x,q[1]-z)>.02;};
P.freeNear=function(x,z,r){const L=this.blockers();for(let ring=0;ring<14;ring++){const n=ring?8+ring*4:1;for(let i=0;i<n;i++){const a=i/n*PI*2,px=x+Math.cos(a)*ring*.22,pz=z+Math.sin(a)*ring*.22;if(Math.abs(px)<this.W/2-.3&&Math.abs(pz)<this.D/2-.3&&!this.blockedAt(px,pz,r||.24,L))return[px,pz];}}return[x,z];};
/* ---------- start / stop ---------- */
P.startWalk=function(cfg,opt){
  opt=opt||{};this.stopWalk();const f=makeFigure(this,cfg);this.me=f;this.walkOn=true;this.joy={x:0,y:0};this.goal=null;this.seat=null;this.near=null;this.nearT=0;
  const dz=this.D/2-1.15,sp=this.freeNear(-this.W/2+.8+Math.random()*1.1,dz-Math.random()*1.2,.24);f.x=sp[0];f.z=sp[1];f.yaw=PI/2;this.placeFigure(f);
  this.wTarget=new T.Vector3(f.x,1.1,f.z);this.az=-1.0;this.el=.36;this.dist=3.1;this.camT=null;
  this.cam.far=60;this.r.setPixelRatio(Math.min(window.devicePixelRatio||1,this.low?1.25:1.75));this.resize();this.setCam(this.az,this.el,this.dist);this.markDirty(true);};
P.stopWalk=function(keepCam){
  if(this.me){this.root.remove(this.me.holder);this.me.av.dispose();this.me=null;}this.walkOn=false;this.wTarget=null;this.goal=null;this.seat=null;this.setNear(null);
  if(!keepCam){this.r.setPixelRatio(Math.min(window.devicePixelRatio||1,this.low?1.5:2));this.resize();this.resetCamera(true);}this.markDirty(true);};
P.setAvatar=function(cfg){if(!this.me)return;const f=this.me,old=f.av,pose=old.pose;f.holder.remove(old.group);old.dispose();f.av=OWA.build(cfg);f.av.group.traverse(o=>{if(o.isMesh)o.castShadow=false;});f.holder.add(f.av.group);if(pose!=='stand')f.av.setPose(pose);this.placeFigure(f);this.markDirty();};
P.placeFigure=function(f){f.holder.position.set(f.x,f.y||0,f.z);f.holder.rotation.y=f.yaw;};
/* a non-moving resident (the room owner) so visitors see who lives here */
P.addResident=function(cfg,tap){
  this.removeResident();const f=makeFigure(this,cfg);const L=this.blockers();let best=null;const tries=[[this.W*.22,-this.D*.12],[-this.W*.2,-this.D*.2],[this.W*.25,this.D*.2],[0,0],[-this.W*.2,this.D*.2]];
  for(const[x,z]of tries){const q=this.freeNear(x,z,.3);if(!best||!this.blockedAt(q[0],q[1],.4,L)){best=q;if(!this.blockedAt(q[0],q[1],.4,L))break;}}
  f.x=best[0];f.z=best[1];f.yaw=Math.atan2(-f.x,-f.z)*.6+.3;this.placeFigure(f);f.holder.userData.resident=true;f.holder.traverse(o=>{o.userData.resident=true;});this.res=f;this.resTap=tap;this.markDirty(true);};
P.removeResident=function(){if(this.res){this.root.remove(this.res.holder);this.res.av.dispose();this.res=null;}};
/* ---------- input ---------- */
P.setJoy=function(x,y){this.joy.x=x;this.joy.y=y;if(this.seat&&Math.hypot(x,y)>.45)this.standUp();};
P.walkTap=function(it,e){
  if(this.res&&this.pickResident(e)){this.resTap&&this.resTap();return;}
  if(!this.me){if(it&&this.cb.onOpen)this.cb.onOpen(it);return;}
  if(it&&it.kind==='decor'&&!this.interactOf(it)){this.cb.onOpen&&this.cb.onOpen(it);return;}
  if(this.seat)this.standUp();
  if(it&&this.interactOf(it)){this.goToItem(it,true);return;}
  this.ray.setFromCamera(this.ndc(e),this.cam);const pl=new T.Plane(new T.Vector3(0,1,0),0),p=new T.Vector3();
  if(this.ray.ray.intersectPlane(pl,p)){const q=this.pushOut(p.x,p.z,.24,this.blockers());this.goal={x:q[0],z:q[1],t:0,stuck:0,lx:this.me.x,lz:this.me.z};this.showMark(q[0],q[1]);}};
P.pickResident=function(e){this.ray.setFromCamera(this.ndc(e),this.cam);const h=this.ray.intersectObject(this.res.holder,true)[0];return !!h;};
P.showMark=function(x,z){if(!this.mark){const c=OW.canvas(64,64),g=c.getContext('2d');g.strokeStyle='rgba(255,255,255,.95)';g.lineWidth=5;g.beginPath();g.arc(32,32,22,0,7);g.stroke();g.fillStyle='rgba(61,220,151,.9)';g.beginPath();g.arc(32,32,8,0,7);g.fill();
  this.mark=new T.Mesh(new T.PlaneGeometry(.32,.32),new T.MeshBasicMaterial({map:OW.tex(c),transparent:true,depthWrite:false}));this.mark.rotation.x=-PI/2;this.scene.add(this.mark);}
  this.mark.position.set(x,.02,z);this.mark.visible=true;this.markT=1.2;};
/* ---------- what can be used ---------- */
P.interactOf=function(it){
  const d=it.kind==='furniture'?OW.furn(it.type):OW.decor(it.type);if(!d)return null;
  if(it.kind==='furniture'){
    if(SEATS[it.type])return{k:'sit',label:'Sit'};if(BEDS[it.type])return{k:'lie',label:'Lie down'};if(LAMPS[it.type])return{k:'lamp',label:'Switch light'};
    if(MIRRORS[it.type])return{k:'look',label:MIRRORS[it.type]};if(it.type==='gaming_desk'||it.type==='console')return{k:'play',label:'Play'};
    if(it.type==='speaker')return{k:'open',label:'Play music'};
    if(USES[it.type]&&(it.link||it.title||it.description))return{k:'open',label:USES[it.type]};return null;}
  if(it.image_path||it.title||it.description||it.link||(it.props&&it.props.images&&it.props.images.length))return{k:'open',label:it.link?'Open':'View'};return null;};
P.itemSpot=function(it){ /* world position of an item and a rough reach distance */
  if(it.kind==='furniture'){const d=OW.furn(it.type),k=it.scale||1;return{x:it.x,z:it.z,r:Math.max(d.w,d.d)*k/2+.55,rect:true};}
  const f=this.wf()[it.wall||'back'],u=it.x||0;return{x:f.o[0]+f.u[0]*u,z:f.o[2]+f.u[2]*u,r:1.5,wall:f};};
P.nearest=function(){
  if(!this.me)return null;let best=null,bd=9;const m=this.me;
  for(const it of this.items){const a=this.interactOf(it);if(!a)continue;const s=this.itemSpot(it);let dist;
    if(s.rect){const d=OW.furn(it.type),k=it.scale||1,rot=it.rot||0,c=Math.cos(rot),sn=Math.sin(rot),dx=m.x-it.x,dz=m.z-it.z,lx=dx*c-dz*sn,lz=dx*sn+dz*c,ex=Math.max(0,Math.abs(lx)-d.w*k/2),ez=Math.max(0,Math.abs(lz)-d.d*k/2);dist=Math.hypot(ex,ez);if(dist>.8)continue;}
    else{const f=s.wall,off=(m.x-f.o[0])*f.n[0]+(m.z-f.o[2])*f.n[2],lat=Math.abs((m.x-f.o[0])*f.u[0]+(m.z-f.o[2])*f.u[2]-(it.x||0));if(off>1.7||off<0||lat>(OW.decor(it.type).w||.5)/2+.9)continue;dist=Math.hypot(off,lat*.6);}
    if(dist<bd){bd=dist;best={it,act:a};}}
  return best;};
P.setNear=function(n){const id=n?n.it.id+n.act.k:'';if(id===(this.nearId||''))return;this.nearId=id;this.near=n;
  if(this.nearBox){this.scene.remove(this.nearBox);this.nearBox.geometry.dispose();this.nearBox=null;}
  const node=n&&this.nodes.get(n.it.id);if(node&&!this.seat){this.nearBox=new T.BoxHelper(node.group,0x3ddc97);this.nearBox.material.depthTest=false;this.nearBox.renderOrder=20;this.scene.add(this.nearBox);}
  this.cb.onNear&&this.cb.onNear(this.seat?{act:{k:'stand',label:'Stand up'}}:n);this.markDirty();};
P.goToItem=function(it,act){
  const a=this.interactOf(it),m=this.me;if(!a||!m)return;const s=this.itemSpot(it);let gx,gz;
  if(s.rect){const d=OW.furn(it.type),k=it.scale||1,rot=it.rot||0,c=Math.cos(rot),sn=Math.sin(rot),L=this.blockers();let b=null,bdist=1e9;
    for(const[lx,lz]of[[0,d.d*k/2+.5],[0,-d.d*k/2-.5],[d.w*k/2+.5,0],[-d.w*k/2-.5,0]]){const x=it.x+lx*c+lz*sn,z=it.z-lx*sn+lz*c;if(Math.abs(x)>this.W/2-.2||Math.abs(z)>this.D/2-.2||this.blockedAt(x,z,.22,L))continue;const dd=Math.hypot(x-m.x,z-m.z);if(dd<bdist){bdist=dd;b=[x,z];}}
    if(!b)b=this.freeNear(it.x,it.z+d.d*k/2+.6,.24);gx=b[0];gz=b[1];}
  else{const f=s.wall;gx=s.x+f.n[0]*.8;gz=s.z+f.n[2]*.8;const q=this.pushOut(gx,gz,.24,this.blockers());gx=q[0];gz=q[1];}
  this.goal={x:gx,z:gz,t:0,stuck:0,lx:m.x,lz:m.z,then:act?{it,k:a.k}:null};this.showMark(gx,gz);};
P.interact=function(it,k){
  if(!this.me||!it)return;const a=this.interactOf(it);if(!a)return;k=k||a.k;const m=this.me;
  if(k==='sit')return this.sitOn(it);if(k==='lie')return this.lieOn(it);
  if(k==='lamp'){const n=this.nodes.get(it.id);if(!n)return;it._off=!it._off;n.group.traverse(o=>{if(o.isMesh&&o.material&&o.material.emissive&&o.material.emissiveIntensity!==undefined){o.material.emissiveIntensity=it._off?0:(o.userData.ei||(o.userData.ei=o.material.emissiveIntensity||.8));if(!it._off&&!o.userData.ei)o.material.emissiveIntensity=.8;}});
    this.lamps=this.lamps||{};this.lamps[it.id]=!it._off;this.markDirty();return;}
  if(k==='look'){this.face(it.x,it.z);this.cb.onLook&&this.cb.onLook(it);return;}
  if(k==='play'){const ch=this.items.find(o=>o.type==='gaming_chair'&&Math.hypot(o.x-it.x,o.z-it.z)<1.6);if(ch){this.sitOn(ch,'play',it);}else{this.face(it.x,it.z);this.cb.onToast&&this.cb.onToast('Add a gaming chair next to the desk to sit and play');}return;}
  if(k==='open'){this.face(it.x||0,it.z||0);this.cb.onOpen&&this.cb.onOpen(it);}};
P.face=function(x,z){const m=this.me;if(!m)return;m.yaw=Math.atan2(x-m.x,z-m.z);this.placeFigure(m);};
P.sitOn=function(it,pose,lookAt){
  const m=this.me,S=SEATS[it.type];if(!S)return;const rot=it.rot||0,c=Math.cos(rot),sn=Math.sin(rot),dx=m.x-it.x,dz=m.z-it.z,lx=dx*c-dz*sn;const d=OW.furn(it.type),k=it.scale||1;
  let slot=S.slots[0];if(S.slots.length>1){let bd=9;S.slots.forEach(s=>{const q=Math.abs(lx-s*k);if(q<bd){bd=q;slot=s;}});}
  const lz=it.type==='sofa'?.0:0,x=it.x+slot*k*c+lz*sn,z=it.z-slot*k*sn+lz*c;
  this.prevPos={x:m.x,z:m.z};m.x=x;m.z=z;m.yaw=rot;if(it.type==='pouf'||lookAt)m.yaw=lookAt?Math.atan2(lookAt.x-x,lookAt.z-z):m.yaw;
  m.y=(it.y||0);m.av.seatTop=S.top*k+(it.y||0)*0;m.av.setPose(pose||'sit');m.pose=pose||'sit';this.seat={it,front:[Math.sin(m.yaw),Math.cos(m.yaw)],d:d.d*k};this.goal=null;this.placeFigure(m);this.setNear(null);this.nearId='';this.cb.onNear&&this.cb.onNear({act:{k:'stand',label:'Stand up'}});this.markDirty();};
P.lieOn=function(it){
  const m=this.me,d=OW.furn(it.type),k=it.scale||1,rot=it.rot||0,c=Math.cos(rot),sn=Math.sin(rot);const h=m.av.height;
  const lz=-d.d*k/2+.5+h*.93,lx=0,x=it.x+lx*c+lz*sn,z=it.z-lx*sn+lz*c;this.prevPos={x:m.x,z:m.z};m.x=x;m.z=z;m.yaw=rot;m.y=(it.y||0)+(OW.furn(it.type).top||.5)+.08;
  m.av.group.rotation.x=-PI/2;m.av.setPose('lie');m.pose='lie';this.seat={it,lie:true,front:[Math.sin(rot),Math.cos(rot)],d:d.d*k};this.goal=null;this.placeFigure(m);this.setNear(null);this.nearId='';this.cb.onNear&&this.cb.onNear({act:{k:'stand',label:'Get up'}});this.markDirty();};
P.standUp=function(){
  const m=this.me;if(!m||!this.seat)return;const s=this.seat,it=s.it;m.av.group.rotation.x=0;m.av.setPose('stand');m.pose='stand';m.y=0;m.av.seatTop=null;
  let q;if(s.lie){const d=OW.furn(it.type),k=it.scale||1,rot=it.rot||0,c=Math.cos(rot),sn=Math.sin(rot),dx=d.w*k/2+.45;q=this.freeNear(it.x+dx*c,it.z-dx*sn,.24);}
  else q=this.freeNear(m.x+s.front[0]*(s.d/2+.45),m.z+s.front[1]*(s.d/2+.45),.24);
  m.x=q[0];m.z=q[1];this.seat=null;this.placeFigure(m);this.nearId='x';this.setNear(null);this.markDirty(true);};
P.photo=function(withMe){const m=this.me,vis=m?m.holder.visible:true;if(m)m.holder.visible=!!withMe;let url='';try{this.r.render(this.scene,this.cam);url=this.r.domElement.toDataURL('image/png');}finally{if(m)m.holder.visible=vis;this.dirty=true;}return url;};
P.emote=function(name){const m=this.me;if(!m||this.seat)return;m.emote=name;m.emoteT=name==='wave'?2.4:5;m.av.setPose(name);m.pose=name;};
/* ---------- per-frame ---------- */
P.walkTick=function(dt){
  const m=this.me;if(this.mark&&this.markT>0){this.markT-=dt;if(this.markT<=0)this.mark.visible=false;this.markDirty();}
  if(this.res){this.resT=(this.resT||0)+dt;if(this.resT>.07){this.res.av.update(this.resT,0);this.resT=0;this.markDirty();}}
  if(!this.walkOn||!m)return;
  let jx=this.joy.x,jy=this.joy.y,mag=Math.min(1,Math.hypot(jx,jy));let spd=0;
  if(!this.seat){
    let dxw=0,dzw=0;
    if(mag>.12){this.goal=null;const az=this.az,fx=-Math.sin(az),fz=-Math.cos(az),rx=Math.cos(az),rz=-Math.sin(az);dxw=fx*jy+rx*jx;dzw=fz*jy+rz*jx;const l=Math.hypot(dxw,dzw)||1;dxw/=l;dzw/=l;spd=mag;if(m.emote){m.emote=null;m.av.setPose('stand');m.pose='stand';}}
    else if(this.goal){const g=this.goal,ex=g.x-m.x,ez=g.z-m.z,l=Math.hypot(ex,ez);g.t+=dt;
      if(l<.14){const th=g.then;this.goal=null;if(th)this.interact(th.it,th.k);}
      else{dxw=ex/l;dzw=ez/l;spd=l<.5?.55:1;g.stuck+=dt;if(g.stuck>.5){if(Math.hypot(m.x-g.lx,m.z-g.lz)<.08){const th=g.then;this.goal=null;if(th&&Math.hypot(th.it.x-m.x,th.it.z-m.z)<2.2)this.interact(th.it,th.k);}g.stuck=0;g.lx=m.x;g.lz=m.z;}if(g.t>7)this.goal=null;}}
    if(spd>0){const step=1.9*spd*dt,L=this.blockers();let nx=m.x+dxw*step,nz=m.z+dzw*step;const q=this.pushOut(nx,nz,.23,L);m.x=q[0];m.z=q[1];
      const ty=Math.atan2(dxw,dzw);let dy=ty-m.yaw;dy=Math.atan2(Math.sin(dy),Math.cos(dy));m.yaw+=dy*Math.min(1,dt*12);}
    if(m.emote){m.emoteT-=dt;if(m.emoteT<=0){m.emote=null;m.av.setPose('stand');m.pose='stand';}}
    if(!m.emote&&m.pose!=='stand'){m.av.setPose('stand');m.pose='stand';}
    this.nearT+=dt;if(this.nearT>.15){this.nearT=0;this.setNear(this.nearest());}
  }
  m.speed+=(spd-m.speed)*Math.min(1,dt*10);m.av.update(dt,m.speed);this.placeFigure(m);
  /* camera follows */
  const tgt=this.wTarget,ty=this.seat&&this.seat.lie?.9:1.05;tgt.x+=(m.x-tgt.x)*Math.min(1,dt*8);tgt.z+=(m.z-tgt.z)*Math.min(1,dt*8);tgt.y+=((m.y||0)+ty-tgt.y)*Math.min(1,dt*6);
  if(this.camT){}this.setCam(this.az,this.el,this.dist);this.markDirty();};
P._fig=makeFigure;
})();
