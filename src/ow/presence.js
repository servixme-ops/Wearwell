/* ---------- live presence: other people's avatars in a room, over Supabase Realtime.
   Only people who are in the room right now are shown (the owner included); each person drives their own avatar. ---------- */
(function(){
const T=THREE,P=OWRoom.prototype,PI=Math.PI,MAXR=6;
const ang=(a,b)=>Math.atan2(Math.sin(b-a),Math.cos(b-a));
P.liveStart=function(o){
  if(this.live||typeof sb==='undefined'||!sb.channel)return;
  const L=this.live={ch:null,remote:new Map(),pend:{},meta:null,me:o.uid||null,ownerId:o.ownerId,cb:o.cb||{},ready:false,sendT:9,acc:0,lbl:h('div',{class:'ow-lbls'}),last:''};
  this.host.appendChild(L.lbl);
  try{
    const ch=sb.channel('ow:room:'+o.roomId,{config:{presence:{key:o.uid||'v'+Math.random().toString(36).slice(2,10)},broadcast:{self:false}}});L.ch=ch;
    ch.on('presence',{event:'sync'},()=>this.liveSync());
    ch.on('presence',{event:'join'},()=>{L.sendT=9;});
    ch.on('broadcast',{event:'st'},m=>this.liveRecv(m&&m.payload));
    ch.subscribe(s=>{if(s==='SUBSCRIBED'){L.ready=true;if(L.meta)ch.track(L.meta);}});
  }catch(e){console.warn('presence unavailable',e);}
};
P.liveTrack=function(meta){const L=this.live;if(!L)return;L.meta=meta;L.sendT=9;if(L.ready)try{L.ch.track(meta);}catch(e){}};
P.liveUntrack=function(){const L=this.live;if(!L)return;L.meta=null;if(L.ready)try{L.ch.untrack();}catch(e){}};
P.liveSync=function(){
  const L=this.live;if(!L)return;const st=L.ch.presenceState(),seen=new Set();
  Object.keys(st).forEach(k=>{const m=(st[k]||[]).find(x=>x&&x.uid);if(!m||m.uid===L.me)return;seen.add(m.uid);
    const key=JSON.stringify(m.cfg||{});let r=L.remote.get(m.uid);
    if(r&&r.key!==key){this.liveDrop(m.uid);r=null;}
    if(!r&&L.remote.size<MAXR)this.liveAdd(m,key);});
  [...L.remote.keys()].forEach(u=>{if(!seen.has(u))this.liveDrop(u);});
};
P.liveAdd=function(m,key){
  const L=this.live;let cfg;try{cfg=OWA.migrate(m.cfg);}catch(e){cfg=null;}if(!cfg)cfg=OWA.def('f');
  const f=this._fig(this,cfg),sp=this.freeNear(-this.W/2+.8,this.D/2-1.15,.24),p=L.pend[m.uid];
  f.x=f.tx=p?p.x:sp[0];f.z=f.tz=p?p.z:sp[1];f.yaw=f.tyaw=p?p.yaw:PI/2;f.ty=0;f.key=key;f.uid=m.uid;f.pose='stand';f.want={pose:'stand',top:0,lie:0};f.acc=0;
  this.placeFigure(f);
  const nm=String(m.name||m.username||'Guest').slice(0,24),isOwner=m.uid===L.ownerId;
  f.el=h('button',{class:'ow-lbl'+(isOwner?' own':''),onclick:()=>L.cb.onTap&&L.cb.onTap({uid:m.uid,name:nm,username:m.username,owner:isOwner})},nm,isOwner?h('i',null,'owner'):null);
  L.lbl.appendChild(f.el);L.remote.set(m.uid,f);this.markDirty(true);
};
P.liveDrop=function(u){
  const L=this.live,f=L&&L.remote.get(u);if(!f)return;this.root.remove(f.holder);try{f.av.dispose();}catch(e){}f.el.remove();L.remote.delete(u);delete L.pend[u];this.markDirty(true);
};
P.liveRecv=function(p){
  const L=this.live;if(!L||!p||!p.u||p.u===L.me)return;const f=L.remote.get(p.u);
  if(!f){L.pend[p.u]=p;return;}
  if(typeof p.x==='number'){f.tx=p.x;f.tz=p.z;f.tyaw=p.yaw;f.ty=p.y||0;}f.want={pose:String(p.pose||'stand'),top:+p.top||0,lie:p.lie?1:0};
};
P.liveTick=function(dt){
  const L=this.live;if(!L)return;let dirty=false;
  L.remote.forEach(f=>{
    const px=f.x,pz=f.z,k=Math.min(1,dt*9);
    if(Math.hypot(f.tx-f.x,f.tz-f.z)>4){f.x=f.tx;f.z=f.tz;}else{f.x+=(f.tx-f.x)*k;f.z+=(f.tz-f.z)*k;}
    f.yaw+=ang(f.yaw,f.tyaw)*Math.min(1,dt*10);f.y=f.ty;
    const w=f.want;
    if(w.pose!==f.pose||w.top!==f.top){f.pose=w.pose;f.top=w.top;f.av.group.rotation.x=w.lie?-PI/2:0;f.av.seatTop=w.top||null;f.av.setPose(w.pose);}
    const v=Math.hypot(f.x-px,f.z-pz)/Math.max(dt,.001)/1.9;f.speed+=(Math.min(1,v)-f.speed)*Math.min(1,dt*10);
    f.acc+=dt;if(f.acc>.033){f.av.update(f.acc,f.pose==='stand'?f.speed:0);f.acc=0;}
    this.placeFigure(f);dirty=true;
  });
  /* name tags follow heads */
  if(L.remote.size){const w=this.host.clientWidth,hh=this.host.clientHeight,v=new T.Vector3();
    L.remote.forEach(f=>{v.set(f.x,(f.y||0)+(f.av.height||1.7)*(f.pose==='lie'?.35:f.pose==='sit'?.8:1)+.18,f.z).project(this.cam);
      const on=v.z<1&&Math.abs(v.x)<1.1&&Math.abs(v.y)<1.1;f.el.style.display=on?'':'none';if(on)f.el.style.transform='translate(-50%,-100%) translate('+((v.x*.5+.5)*w)+'px,'+((-v.y*.5+.5)*hh)+'px)';});}
  /* broadcast my own state */
  const m=this.me;
  if(L.meta&&L.ready&&this.walkOn&&m){
    L.sendT+=dt;
    const s={u:L.me,x:+m.x.toFixed(3),z:+m.z.toFixed(3),yaw:+m.yaw.toFixed(2),y:+(m.y||0).toFixed(2),pose:m.pose||'stand',top:+(m.av.seatTop||0).toFixed(2),lie:m.pose==='lie'?1:0},sig=[s.x,s.z,s.yaw,s.pose].join();
    if((sig!==L.last&&L.sendT>.11)||L.sendT>1.2){L.last=sig;L.sendT=0;try{L.ch.send({type:'broadcast',event:'st',payload:s});}catch(e){}}
  }
  if(dirty)this.markDirty();
};
P.liveStop=function(){
  const L=this.live;if(!L)return;[...L.remote.keys()].forEach(u=>this.liveDrop(u));L.lbl.remove();
  try{L.ch&&L.ch.untrack&&L.ch.untrack();sb.removeChannel(L.ch);}catch(e){}this.live=null;
};
const wt=P.walkTick;P.walkTick=function(dt){wt.call(this,dt);if(this.live)this.liveTick(dt);};
const ds=OWRoom.prototype.destroy;OWRoom.prototype.destroy=function(){try{this.liveStop();}catch(e){}ds.call(this);};
})();
