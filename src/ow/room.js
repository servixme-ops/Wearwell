/* ---------- OWRoom: the interactive 3D room (edit mode for owners, view mode for visitors) ---------- */
const WALLF=(W,D)=>({back:{o:[0,0,-D/2],n:[0,0,1],u:[1,0,0],len:W},front:{o:[0,0,D/2],n:[0,0,-1],u:[-1,0,0],len:W},left:{o:[-W/2,0,0],n:[1,0,0],u:[0,0,-1],len:D},right:{o:[W/2,0,0],n:[-1,0,0],u:[0,0,1],len:D}});
const WALL_AZ={back:.4,left:1.15,right:-1.15,front:Math.PI-.4};
class OWRoom{
  static supported(){try{if(!window.THREE)return false;const c=document.createElement('canvas');return !!(c.getContext('webgl2')||c.getContext('webgl'));}catch(e){return false;}}
  constructor(host,o){
    o=o||{};this.edit=!!o.edit;this.cb=o;this.items=[];this.room={size:'medium',theme:{},width:6,depth:5.4,height:2.9};
    this.nodes=new Map();this.sel=null;this.loading=0;this.texCache=new Map();this.dirty=true;this.shadowDirty=true;this.alive=true;this.drag=null;this.ptrs=new Map();
    const low=(navigator.hardwareConcurrency||4)<=4;
    this.host=host;const canvas=document.createElement('canvas');canvas.className='ow-canvas';
    this.r=new THREE.WebGLRenderer({canvas,antialias:!low,alpha:true,powerPreference:'high-performance',preserveDrawingBuffer:!!o.preserve});
    this.r.setPixelRatio(Math.min(window.devicePixelRatio||1,low?1.5:2));this.r.outputEncoding=THREE.sRGBEncoding;
    this.r.shadowMap.enabled=true;this.r.shadowMap.type=THREE.PCFSoftShadowMap;this.r.shadowMap.autoUpdate=false;
    this.scene=new THREE.Scene();this.cam=new THREE.PerspectiveCamera(40,1,.1,80);
    this.shell=new THREE.Group();this.root=new THREE.Group();this.scene.add(this.shell,this.root);
    this.ray=new THREE.Raycaster();this.low=low;
    if(host){host.appendChild(canvas);this.ro=new ResizeObserver(()=>this.resize());this.ro.observe(host);this.bind(canvas);}
    this.canvas=canvas;this.cam0={az:.42,el:.62,dist:9};this.cam1=Object.assign({},this.cam0);this.camT=null;
    this.lights();this.buildShell();this.resetCamera(true);this.resize();
    this.loop=this.loop.bind(this);requestAnimationFrame(this.loop);
  }
  /* ----- undo / redo ----- */
  snap(){return JSON.stringify({r:{size:this.room.size,width:this.room.width,depth:this.room.depth,height:this.room.height,theme:this.room.theme},i:this.items});}
  pushHist(){const now=Date.now();if(this.lastPush&&now-this.lastPush<700){this.lastPush=now;return;}this.lastPush=now;this.hist=this.hist||[];this.hist.push(this.snap());if(this.hist.length>40)this.hist.shift();this.redoS=[];this.cb.onHistory&&this.cb.onHistory();}
  canUndo(){return !!(this.hist&&this.hist.length);}canRedo(){return !!(this.redoS&&this.redoS.length);}
  undo(){if(!this.canUndo())return;this.redoS=this.redoS||[];this.redoS.push(this.snap());this.restore(this.hist.pop());}
  redo(){if(!this.canRedo())return;this.hist.push(this.snap());this.restore(this.redoS.pop());}
  restore(js){const o=JSON.parse(js);const sel=this.sel;const shellChanged=['size','width','depth','height'].some(k=>this.room[k]!==o.r[k])||JSON.stringify(this.room.theme)!==JSON.stringify(o.r.theme);
    this.select(null,true);this.nodes.forEach(n=>this.disposeNode(n));this.nodes.clear();Object.assign(this.room,o.r);if(shellChanged)this.buildShell();this.items=o.i;this.items.forEach(i=>this.mount(i));this.lastPush=0;
    if(sel&&this.get(sel))this.select(sel);else this.cb.onSelect&&this.cb.onSelect(null);this.cb.onHistory&&this.cb.onHistory();this.changed();}
  duplicate(id){const it=this.get(id);if(!it)return;this.pushHist();const c=JSON.parse(JSON.stringify(it));c.id=uuid();
    if(c.kind==='furniture'){c.x+=.45;c.z+=.45;this.items.push(c);this.mount(c);this.settle(c);}
    else{c.x+=.18;c.y-=.18;c.z_index=this.items.reduce((a,i)=>Math.max(a,i.z_index||0),0)+1;this.items.push(c);this.mount(c);this.clampD(c);this.place(c);}
    this.changed();this.select(c.id);return c;}
  /* tidy the pictures on one wall into a neat row or grid with a chosen gap */
  arrangeWall(wall,mode,gap){
    const skip=['curtains','door','window','wall_light','wall_clock','neon'];const list=this.items.filter(i=>i.kind==='decor'&&(i.wall||'back')===wall&&!skip.includes(i.type));if(!list.length)return 0;
    this.pushHist();const L=this.wf()[wall].len-.5,H=this.H;const dim=i=>{const n=this.nodes.get(i.id);return{w:n?n.w:.5,h:n?n.h:.5};};
    list.sort((a,b)=>a.x-b.x);const rows=[];
    if(mode==='row'){rows.push(list);}else{let cur=[],w=0;list.forEach(i=>{const d=dim(i);if(cur.length&&w+d.w+gap>L){rows.push(cur);cur=[];w=0;}cur.push(i);w+=d.w+gap;});if(cur.length)rows.push(cur);}
    const rh=rows.map(r=>Math.max(...r.map(i=>dim(i).h))),total=rh.reduce((a,b)=>a+b,0)+gap*(rows.length-1);let y=H*.52+total/2;
    rows.forEach((r,ri)=>{const tw=r.reduce((a,i)=>a+dim(i).w,0)+gap*(r.length-1);let x=-tw/2;y-=rh[ri]/2;r.forEach((i,k)=>{const d=dim(i);i.x=x+d.w/2;i.y=y;i.rot=0;x+=d.w+gap;this.clampD(i);this.place(i);});y-=rh[ri]/2+gap;});
    this.refreshHelper();this.changed();return list.length;}
  get W(){return this.room.width}get D(){return this.room.depth}get H(){return this.room.height}
  get th(){return Object.assign({},OW.THEMES.lagos,OW.THEMES[this.room.theme&&this.room.theme.key]||{})}
  /* ----- lights ----- */
  lights(){
    this.hemi=new THREE.HemisphereLight(0xfff1de,0x7a5a46,.85);this.sun=new THREE.DirectionalLight(0xfff0d6,.75);
    this.sun.castShadow=true;const s=this.low?1024:2048;this.sun.shadow.mapSize.set(s,s);this.sun.shadow.bias=-.0006;this.sun.shadow.radius=3;
    this.pend=new THREE.PointLight(0xffd9a0,.55,12,1.6);this.scene.add(this.hemi,this.sun,this.sun.target,this.pend);
  }
  /* ----- room shell: walls, floor, ceiling, window, door ----- */
  buildShell(){
    const old=this.shell;this.scene.remove(old);old.traverse(n=>{if(n.geometry)n.geometry.dispose();if(n.material&&n.material.map&&n.userData.own)n.material.map.dispose();});
    const g=this.shell=new THREE.Group();this.scene.add(g);const W=this.W,D=this.D,H=this.H,th=this.th,M=OW.mat;
    const wallM=new THREE.MeshStandardMaterial({color:th.wall,roughness:.95});
    /* back wall has a real window opening */
    const ww=Math.min(1.7,W*.3),wh=1.25,wx=W*.18,wy=Math.min(1.0,H*.34);
    const sh=new THREE.Shape();sh.moveTo(-W/2,0);sh.lineTo(W/2,0);sh.lineTo(W/2,H);sh.lineTo(-W/2,H);sh.lineTo(-W/2,0);
    const hole=new THREE.Path();hole.moveTo(wx-ww/2,wy);hole.lineTo(wx-ww/2,wy+wh);hole.lineTo(wx+ww/2,wy+wh);hole.lineTo(wx+ww/2,wy);hole.lineTo(wx-ww/2,wy);sh.holes.push(hole);
    const back=new THREE.Mesh(new THREE.ShapeGeometry(sh),wallM);back.position.z=-D/2;back.receiveShadow=true;g.add(back);
    const mk=(len,ry,x,z)=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(len,H),wallM);m.position.set(x,H/2,z);m.rotation.y=ry;m.receiveShadow=true;g.add(m);};
    mk(D,Math.PI/2,-W/2,0);mk(D,-Math.PI/2,W/2,0);mk(W,Math.PI,0,D/2);
    /* invisible pick planes in front of each wall (decorations slide along them) */
    const wf=WALLF(W,D);this.picks=[];OW.WALLS.forEach(k=>{const f=wf[k],len=f.len,p=new THREE.Mesh(new THREE.PlaneGeometry(len,H),new THREE.MeshBasicMaterial({visible:false}));
      p.position.set(f.o[0]+f.n[0]*.002,H/2,f.o[2]+f.n[2]*.002);p.rotation.y=Math.atan2(f.n[0],f.n[2]);p.userData.wall=k;g.add(p);this.picks.push(p);});
    /* floor */
    const ft=OW.canvas(256,256),c=ft.getContext('2d');c.fillStyle=th.floor;c.fillRect(0,0,256,256);for(let i=0;i<8;i++){c.fillStyle=i%2?'rgba(0,0,0,.07)':'rgba(255,255,255,.07)';c.fillRect(0,i*32,256,32);c.fillStyle='rgba(0,0,0,.25)';c.fillRect(0,i*32,256,1.5);c.fillRect(((i*97)%256),i*32,1.5,32);}
    const fmap=OW.tex(ft,[W/1.6,D/1.6]);const floor=new THREE.Mesh(new THREE.PlaneGeometry(W,D),new THREE.MeshStandardMaterial({map:fmap,roughness:.7}));floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;g.add(floor);floor.userData.own=1;
    const slab=new THREE.Mesh(new THREE.BoxGeometry(W+.4,.2,D+.4),M('#3a2a22',.9));slab.position.y=-.1-.003;g.add(slab);
    const ceil=new THREE.Mesh(new THREE.PlaneGeometry(W,D),new THREE.MeshStandardMaterial({color:th.ceil,roughness:1}));ceil.rotation.x=Math.PI/2;ceil.position.y=H;g.add(ceil);
    /* thickness caps on the wall tops and baseboards */
    this.caps=[];const cap=(w,d,x,z,k)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,.08,d),M(th.trim,.8));m.position.set(x,H+.04,z);g.add(m);this.caps.push({m,k});};
    cap(W+.28,.14,0,-D/2-.07,'back');cap(W+.28,.14,0,D/2+.07,'front');cap(.14,D,-W/2-.07,0,'left');cap(.14,D,W/2+.07,0,'right');
    const bb=(w,d,x,z)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,.12,d),M(th.trim,.7));m.position.set(x,.06,z);m.receiveShadow=true;g.add(m);};
    bb(W,.025,0,-D/2+.0125);bb(.025,D,-W/2+.0125,0);bb(.025,D,W/2-.0125,0);bb(W,.025,0,D/2-.0125);
    /* window: sky behind, frame, sill, curtains-ready */
    const sc=OW.canvas(8,128),sx=sc.getContext('2d'),gr=sx.createLinearGradient(0,0,0,128);gr.addColorStop(0,'#7cc4ff');gr.addColorStop(1,'#fff1c9');sx.fillStyle=gr;sx.fillRect(0,0,8,128);
    const sky=new THREE.Mesh(new THREE.PlaneGeometry(ww+.4,wh+.4),new THREE.MeshBasicMaterial({map:OW.tex(sc)}));sky.position.set(wx,wy+wh/2,-D/2-.06);g.add(sky);sky.userData.own=1;
    const fm=M(th.trim,.5),fb=(w,h,x,y,z,d)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d||.08),fm);m.position.set(x,y,z);m.castShadow=true;g.add(m);};
    fb(ww+.1,.05,wx,wy+wh,-D/2+.01);fb(ww+.1,.05,wx,wy,-D/2+.01);fb(.05,wh,wx-ww/2,wy+wh/2,-D/2+.01);fb(.05,wh,wx+ww/2,wy+wh/2,-D/2+.01);fb(.03,wh,wx,wy+wh/2,-D/2+.01,.04);fb(ww,.03,wx,wy+wh/2,-D/2+.01,.04);fb(ww+.3,.05,wx,wy-.04,-D/2+.1,.22);
    /* door on the left wall */
    const dz=D/2-1.15,dm=M('#8a5a34',.6);const door=new THREE.Mesh(new THREE.BoxGeometry(.05,2.05,.95),dm);door.position.set(-W/2+.03,1.025,dz);door.castShadow=true;g.add(door);
    const df=(h,d,y,z)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(.07,h,d),M(th.trim,.5));m.position.set(-W/2+.04,y,z);g.add(m);};df(2.1,.05,1.05,dz-.5);df(2.1,.05,1.05,dz+.5);df(.05,1.05,2.1,dz);
    const hd=new THREE.Mesh(new THREE.SphereGeometry(.035,10,8),M('#d4a82e',.3,.8));hd.position.set(-W/2+.08,1.0,dz+.35);g.add(hd);
    for(const[y,hh]of[[1.55,.7],[.6,.7]]){const p=new THREE.Mesh(new THREE.BoxGeometry(.02,hh,.62),M('#7a4a28',.7));p.position.set(-W/2+.06,y,dz);g.add(p);}
    /* pendant light */
    const cord=new THREE.Mesh(new THREE.CylinderGeometry(.006,.006,.6,6),M('#222'));cord.position.set(0,H-.3,0);g.add(cord);
    const bulb=new THREE.Mesh(new THREE.SphereGeometry(.12,16,12),new THREE.MeshStandardMaterial({color:'#fff2cc',emissive:'#ffd98a',emissiveIntensity:1.2}));bulb.position.set(0,H-.62,0);g.add(bulb);
    this.pend.position.set(0,H-.7,0);
    this.sun.position.set(W*.55,H*2.4,D*.55);this.sun.target.position.set(0,0,0);const sc2=this.sun.shadow.camera,R=Math.max(W,D)*.8;sc2.left=-R;sc2.right=R;sc2.top=R;sc2.bottom=-R;sc2.near=1;sc2.far=40;sc2.updateProjectionMatrix();
    this.cam0.dist=this.fitDist();this.markDirty(true);
  }
  /* ----- loading & serialising ----- */
  load(room,items){
    this.room=Object.assign({size:'medium',theme:{}},room);this.buildShell();this.clearItems();
    this.items=(items||[]).map(i=>Object.assign({},i));this.items.forEach(i=>this.mount(i));this.items.filter(i=>i.kind==='furniture').forEach(i=>this.settle(i));this.resetCamera(true);
  }
  clearItems(){this.select(null);this.nodes.forEach(n=>this.disposeNode(n));this.nodes.clear();this.items=[];}
  disposeNode(n){this.root.remove(n.group);n.group.traverse(o=>{if(o.geometry)o.geometry.dispose();});if(n.helper){this.scene.remove(n.helper);n.helper.geometry.dispose();}if(n.glow){this.scene.remove(n.glow);n.glow.geometry.dispose();n.glow.material.dispose();}}
  whenLoaded(ms){return new Promise(res=>{const t0=Date.now(),f=()=>{if(!this.loading||Date.now()-t0>(ms||3000))res();else setTimeout(f,60);};f();});}
  snapshot(w,h,q){this.r.setSize(w,h,false);this.cam.aspect=w/h;this.cam.updateProjectionMatrix();this.cam.position.set(0,0,0);this.setCam(.38,.55,this.cam0.dist*.95);this.r.shadowMap.needsUpdate=true;this.r.render(this.scene,this.cam);return this.canvas.toDataURL('image/jpeg',q||.8);}
  /* ----- items ----- */
  mount(it){
    const def=OW.def(it.type);if(!def){return;}let node;
    if(it.kind==='furniture'){const g=OW.buildFurn(def,it.color,this.th);g.userData.itemId=it.id;node={group:g,def,top:def.h*(it.scale||1)};g.scale.setScalar(it.scale||1);}
    else{
      if(!this.edit&&def.img&&!it.image_path)return;
      const b=OW.buildDecor(it,def,this.th);const outer=new THREE.Group(),spin=new THREE.Group();spin.add(b.group);outer.add(spin);outer.userData.itemId=it.id;node={group:outer,spin,def,w:b.w,h:b.h,pic:b.pic};
      if(b.tiles)b.tiles.forEach(m=>this.setPic({pic:m},publicUrl('room-images',m.userData.path)));
      if(b.pic){const url=it.image_path?publicUrl('room-images',it.image_path):null;if(url)this.setPic(node,url);else if(this.edit){b.pic.material.map=this.ph||(this.ph=OW.placeholder());b.pic.material.needsUpdate=true;}}
    }
    if(!this.edit&&(it.link||it.title||it.description||def.hint&&it.kind==='furniture'&&def.link))this.hotspot(node,it);
    this.root.add(node.group);this.nodes.set(it.id,node);this.place(it);this.markDirty(true);return node;
  }
  hotspot(node,it){const c=OW.canvas(64,64),g=c.getContext('2d');g.fillStyle='rgba(255,255,255,.92)';g.beginPath();g.arc(32,32,26,0,7);g.fill();g.fillStyle='#ff5a3c';g.beginPath();g.arc(32,32,14,0,7);g.fill();
    const s=new THREE.Sprite(new THREE.SpriteMaterial({map:OW.tex(c),depthTest:false,transparent:true}));s.scale.setScalar(.16);s.renderOrder=10;
    if(node.def.deco){s.position.set(node.w/2-.05,node.h/2-.05,.08);node.spin.add(s);}else{s.position.set(0,(node.def.h||.5)+.12,0);node.group.add(s);s.scale.setScalar(.16/(it.scale||1));}}
  setPic(node,url){
    this.loading++;let p=this.texCache.get(url);if(!p){p=new Promise((res,rej)=>new THREE.TextureLoader().setCrossOrigin('anonymous').load(url,t=>{t.encoding=THREE.sRGBEncoding;t.anisotropy=4;res(t);},undefined,rej));this.texCache.set(url,p);}
    p.then(t=>{if(!this.alive)return;node.pic.material.map=t;node.pic.material.needsUpdate=true;this.markDirty();}).catch(()=>{}).then(()=>{this.loading--;});
  }
  wf(){return WALLF(this.W,this.D);}
  place(it){
    const n=this.nodes.get(it.id);if(!n)return;
    if(it.kind==='furniture'){n.group.position.set(it.x,it.y||0,it.z);n.group.rotation.y=it.rot||0;n.group.scale.setScalar(it.scale||1);}
    else{const f=this.wf()[it.wall||'back'],off=.012+((it.z_index||0)%60)*.0025,u=it.x||0,v=it.y||1.4;
      n.group.position.set(f.o[0]+f.u[0]*u+f.n[0]*off,v,f.o[2]+f.u[2]*u+f.n[2]*off);n.group.rotation.y=Math.atan2(f.n[0],f.n[2]);n.spin.rotation.z=it.rot||0;
      if(n.def.id==='curtains')n.group.position.y=v;}
    if(n.helper)n.helper.update();this.markDirty(true);
  }
  fp(it){const d=OW.furn(it.type),c=Math.abs(Math.cos(it.rot||0)),s=Math.abs(Math.sin(it.rot||0)),k=it.scale||1;return{hw:(c*d.w+s*d.d)/2*k,hd:(s*d.w+c*d.d)/2*k};}
  clampF(it){const{hw,hd}=this.fp(it);it.x=Math.max(-this.W/2+hw+.04,Math.min(this.W/2-hw-.04,it.x));it.z=Math.max(-this.D/2+hd+.04,Math.min(this.D/2-hd-.04,it.z));}
  clampD(it){const n=this.nodes.get(it.id),k=this.wf()[it.wall||'back'];if(!k)return;const c=Math.abs(Math.cos(it.rot||0)),s=Math.abs(Math.sin(it.rot||0)),w=n?n.w:.5,h=n?n.h:.5,hw=(c*w+s*h)/2,hh=(s*w+c*h)/2;
    it.x=Math.max(-k.len/2+hw+.03,Math.min(k.len/2-hw-.03,it.x));it.y=Math.max(hh+.05,Math.min(this.H-hh-.03,it.y));}
  collides(it,x,z){const d=OW.furn(it.type);if(d.surface||d.floor)return false;const t={...it,x,z},a=this.fp(t);
    return this.items.some(o=>{if(o===it||o.kind!=='furniture')return false;const od=OW.furn(o.type);if(!od||od.surface||od.floor)return false;const b=this.fp(o);return Math.abs(x-o.x)<a.hw+b.hw-.01&&Math.abs(z-o.z)<a.hd+b.hd-.01;});}
  supportY(it,x,z){const d=OW.furn(it.type);if(!d.surface)return 0;let y=0;this.items.forEach(o=>{if(o===it||o.kind!=='furniture')return;const od=OW.furn(o.type);if(!od||!od.top)return;const b=this.fp(o);if(Math.abs(x-o.x)<=b.hw&&Math.abs(z-o.z)<=b.hd)y=Math.max(y,od.top*(o.scale||1));});return y;}
  settle(it){this.clampF(it);it.y=this.supportY(it,it.x,it.z);this.place(it);}
  /* free spot for a new piece */
  freeSpot(it){const d=OW.furn(it.type);const tries=[[0,0],[1.4,0],[-1.4,0],[0,1.3],[0,-1.3],[1.8,1.3],[-1.8,1.3],[1.8,-1.3],[-1.8,-1.3],[2.6,0],[-2.6,0]];
    for(const[a,b]of tries){it.x=a;it.z=b;this.clampF(it);if(d.surface){const y=this.supportY(it,it.x,it.z);if(y>0)return;}else if(!this.collides(it,it.x,it.z))return;}}
  addFurniture(type,props){this.pushHist();const d=OW.furn(type);const it=Object.assign({id:uuid(),kind:'furniture',type,x:0,y:0,z:0,rot:0,scale:1,color:d.col||null,z_index:0,props:{}},props||{});this.items.push(it);this.mount(it);this.freeSpot(it);this.settle(it);this.changed();this.select(it.id);return it;}
  addDecor(type,props){this.pushHist();const d=OW.decor(type);const isDoor=type==='door';const k=this.facing();const top=this.items.reduce((a,i)=>Math.max(a,i.z_index||0),0)+1;
    const it=Object.assign({id:uuid(),kind:'decor',type,wall:k,x:0,y:d.id==='curtains'?this.H/2-.1:isDoor?d.h/2+.05:Math.min(1.5,this.H*.55),z:0,rot:0,scale:1,width:d.w,height:d.h,frame:d.frame||null,color:d.id==='neon'?'#ff3d81':null,z_index:top,props:{}},props||{});
    this.items.push(it);this.mount(it);this.clampD(it);this.place(it);this.changed();this.select(it.id);return it;}
  facing(){const a=((this.az%(2*Math.PI))+2*Math.PI)%(2*Math.PI);let best='back',bd=9;for(const k of OW.WALLS){let t=WALL_AZ[k];t=((t%(2*Math.PI))+2*Math.PI)%(2*Math.PI);const d=Math.min(Math.abs(a-t),2*Math.PI-Math.abs(a-t));if(d<bd){bd=d;best=k;}}return best;}
  get(id){return this.items.find(i=>i.id===id);}
  update(id,patch){const it=this.get(id);if(!it)return;this.pushHist();Object.assign(it,patch);
    if(patch.image_path!==undefined||patch.frame!==undefined||patch.width!==undefined||patch.height!==undefined||patch.scale!==undefined&&it.kind==='decor'||patch.color!==undefined||patch.title!==undefined&&it.type==='neon'||patch.description!==undefined&&it.type==='noticeboard'||patch.props!==undefined){this.remount(it);}
    if(it.kind==='furniture'){if(patch.scale!==undefined||patch.rot!==undefined)this.remount(it);this.settle(it);this.riders(it);}else{this.clampD(it);this.place(it);}
    this.refreshHelper();this.changed();}
  remount(it){const sel=this.sel===it.id,o=this.nodes.get(it.id);if(o){this.disposeNode(o);this.nodes.delete(it.id);}this.mount(it);if(sel)this.select(it.id,true);}
  riders(){}
  remove(id){this.pushHist();const n=this.nodes.get(id);if(n){this.disposeNode(n);this.nodes.delete(id);}const i=this.items.findIndex(x=>x.id===id);if(i>=0){const it=this.items[i];this.items.splice(i,1);
    if(it.kind==='furniture'){const d=OW.furn(it.type);if(d.top)this.items.filter(o=>o.kind==='furniture'&&OW.furn(o.type).surface).forEach(o=>{if(o.y>0){o.y=this.supportY(o,o.x,o.z);this.place(o);}});}}
    if(this.sel===id){this.sel=null;this.cb.onSelect&&this.cb.onSelect(null);}this.changed();}
  select(id,quiet){this.sel=id;this.nodes.forEach(n=>{if(n.helper){this.scene.remove(n.helper);n.helper.geometry.dispose();n.helper=null;}if(n.glow){this.scene.remove(n.glow);n.glow.geometry.dispose();n.glow.material.dispose();n.glow=null;}});
    if(id&&this.edit){const n=this.nodes.get(id);if(n){n.helper=new THREE.BoxHelper(n.group,0xff5a3c);n.helper.material.depthTest=false;n.helper.renderOrder=20;this.scene.add(n.helper);
      n.glow=new THREE.Mesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshBasicMaterial({color:0xff5a3c,transparent:true,opacity:.2,depthTest:false,depthWrite:false}));n.glow.renderOrder=19;this.scene.add(n.glow);this.fitGlow(n);}}
    this.markDirty();if(!quiet)this.cb.onSelect&&this.cb.onSelect(id?this.get(id):null);}
  refreshHelper(){const n=this.sel&&this.nodes.get(this.sel);if(n&&n.helper){n.helper.update();this.fitGlow(n);}}
  fitGlow(n){if(!n.glow)return;n.group.updateMatrixWorld(true);const b=new THREE.Box3().setFromObject(n.group),z=new THREE.Vector3();b.getSize(z);n.glow.scale.set(z.x+.05,z.y+.05,z.z+.05);b.getCenter(n.glow.position);}
  changed(){this.markDirty(true);this.cb.onChange&&this.cb.onChange();}
  setTheme(key){this.pushHist();this.room.theme=Object.assign({},this.room.theme,{key});this.buildShell();this.items.forEach(i=>{if(i.kind==='furniture'&&(i.type==='rug'||i.type==='rug_round'))this.remount(i);});this.changed();}
  setSize(key,dims){this.pushHist();const s=dims||OW.SIZES[key];this.room.size=key;this.room.width=s.w;this.room.depth=s.d;this.room.height=s.h;this.buildShell();
    this.items.forEach(i=>{if(i.kind==='furniture')this.settle(i);else{this.clampD(i);this.place(i);}});this.refreshHelper();this.resetCamera();this.changed();}
  /* ----- camera ----- */
  setCam(az,el,dist){this.az=az;this.el=Math.max(this.wTarget?.05:.18,Math.min(this.wTarget?1.2:1.3,el));this.dist=dist;const c=this.cam,tg=this.wTarget,ty=tg?tg.y:this.H*.38,ce=Math.cos(this.el);
    if(tg){const hx=this.W/2-.14,hz=this.D/2-.14;c.position.set(Math.max(-hx,Math.min(hx,tg.x+Math.sin(this.az)*ce*this.dist)),Math.max(.3,Math.min(this.H-.15,ty+Math.sin(this.el)*this.dist)),Math.max(-hz,Math.min(hz,tg.z+Math.cos(this.az)*ce*this.dist)));c.lookAt(tg.x,ty,tg.z);}
    else{c.position.set(Math.sin(this.az)*ce*this.dist,ty+Math.sin(this.el)*this.dist,Math.cos(this.az)*ce*this.dist);c.lookAt(0,ty,0);}if(this.caps){const wf=this.wf();this.caps.forEach(({m,k})=>{const f=wf[k];m.visible=f.n[0]*(c.position.x-f.o[0])+f.n[2]*(c.position.z-f.o[2])>0;});}this.markDirty();}
  setInset(px){this.inset=px||0;this.applyView();}
  applyView(){if(!this.host)return;const w=this.host.clientWidth,h=this.host.clientHeight;if(!w||!h)return;if(this.inset)this.cam.setViewOffset(w,h,0,this.inset,w,h);else this.cam.clearViewOffset();this.cam.updateProjectionMatrix();this.markDirty();}
  resetCamera(now){this.userZ=false;this.camT={az:this.cam0.az,el:this.cam0.el,dist:this.cam0.dist,t:0};if(now)this.setCam(this.cam0.az,this.cam0.el,this.cam0.dist),this.camT=null;}
  focusWall(k){let a=WALL_AZ[k];const cur=this.az,tau=Math.PI*2;a+=Math.round((cur-a)/tau)*tau;this.camT={az:a,el:.5,dist:this.cam0.dist*.8,t:0};}
  /* ----- input ----- */
  bind(cv){
    cv.style.touchAction='none';
    cv.addEventListener('pointerdown',e=>this.down(e));cv.addEventListener('pointermove',e=>this.move(e));
    const up=e=>this.up(e);cv.addEventListener('pointerup',up);cv.addEventListener('pointercancel',up);
    cv.addEventListener('wheel',e=>{e.preventDefault();this.camT=null;this.userZ=true;this.setCam(this.az,this.el,Math.max(this.minD(),Math.min(this.maxD(),this.dist*(1+e.deltaY*.001))));},{passive:false});
  }
  minD(){return this.wTarget?1.4:Math.max(1.6,Math.max(this.W,this.D)*.28);}
  /* the distance at which the whole room (walls included) fits the screen, whatever the shape of the screen */
  fitDist(){const a=this.cam.aspect||1,vf=this.cam.fov*Math.PI/180,hf=2*Math.atan(Math.tan(vf/2)*a),R=Math.sqrt(this.W*this.W+this.D*this.D+this.H*this.H)*.5;return R/Math.sin(Math.min(vf,hf)/2)*1.04;}
  maxD(){return this.wTarget?5:this.fitDist();}
  ndc(e){const r=this.canvas.getBoundingClientRect();return new THREE.Vector2((e.clientX-r.left)/r.width*2-1,-((e.clientY-r.top)/r.height)*2+1);}
  pickItem(e){this.ray.setFromCamera(this.ndc(e),this.cam);const hits=this.ray.intersectObjects(this.root.children,true);for(const h of hits){let o=h.object;while(o&&!o.userData.itemId)o=o.parent;if(o)return this.get(o.userData.itemId);}return null;}
  down(e){
    this.canvas.setPointerCapture(e.pointerId);this.camT=null;this.ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(this.ptrs.size===2){const[a,b]=[...this.ptrs.values()];const si=this.edit&&this.sel&&this.tapItem&&this.tapItem.id===this.sel?this.get(this.sel):null;this.pinch={d:Math.hypot(a.x-b.x,a.y-b.y),dist:this.dist,item:si,s0:si?(si.scale||1):1};this.drag=null;this.tapOk=false;return;}
    this.tapOk=true;this.sx=e.clientX;this.sy=e.clientY;const it=this.pickItem(e);this.tapItem=it;
    if(it&&this.edit){if(this.sel!==it.id)this.select(it.id);this.startDrag(it,e);}else this.drag=null;
  }
  startDrag(it,e){
    if(it.kind==='furniture'){const pl=new THREE.Plane(new THREE.Vector3(0,1,0),-(it.y||0)),p=new THREE.Vector3();this.ray.setFromCamera(this.ndc(e),this.cam);if(this.ray.ray.intersectPlane(pl,p))this.drag={it,pl,ox:it.x-p.x,oz:it.z-p.z,moved:false,riders:this.items.filter(o=>o.kind==='furniture'&&o!==it&&OW.furn(o.type).surface&&it.id&&OW.furn(it.type).top&&Math.abs(o.x-it.x)<=this.fp(it).hw&&Math.abs(o.z-it.z)<=this.fp(it).hd&&o.y>0).map(o=>({o,dx:o.x-it.x,dz:o.z-it.z}))};}
    else{this.drag={it,moved:false,ou:0,ov:0};this.ray.setFromCamera(this.ndc(e),this.cam);const h=this.ray.intersectObjects(this.picks,false)[0];if(h&&h.object.userData.wall===(it.wall||'back')){const f=this.wf()[it.wall||'back'];const u=(h.point.x-f.o[0])*f.u[0]+(h.point.z-f.o[2])*f.u[2];this.drag.ou=it.x-u;this.drag.ov=it.y-h.point.y;}}
  }
  move(e){
    const p=this.ptrs.get(e.pointerId);if(!p)return;const dx=e.clientX-p.x,dy=e.clientY-p.y;p.x=e.clientX;p.y=e.clientY;
    if(this.pinch&&this.ptrs.size>=2){const[a,b]=[...this.ptrs.values()];const d=Math.hypot(a.x-b.x,a.y-b.y);if(this.pinch.item){const k=Math.max(.4,Math.min(2.4,this.pinch.s0*d/Math.max(20,this.pinch.d)));if(Math.abs(k-(this.pinch.item.scale||1))>.02&&!this.pinchBusy){this.pinchBusy=1;requestAnimationFrame(()=>{this.pinchBusy=0;if(this.pinch&&this.pinch.item){this.update(this.pinch.item.id,{scale:+k.toFixed(2)});}});}return;}this.userZ=true;this.setCam(this.az,this.el,Math.max(this.minD(),Math.min(this.maxD(),this.pinch.dist*this.pinch.d/Math.max(20,d))));return;}
    if(Math.hypot(e.clientX-this.sx,e.clientY-this.sy)>6)this.tapOk=false;
    if(this.drag){if(!this.tapOk||this.drag.moved)this.dragTo(e);return;}
    if(!this.tapOk){this.setCam(this.az-dx*.007,this.el+dy*.005,this.dist);}
  }
  dragTo(e){
    const d=this.drag,it=d.it;this.ray.setFromCamera(this.ndc(e),this.cam);
    if(it.kind==='furniture'){const p=new THREE.Vector3();if(!this.ray.ray.intersectPlane(d.pl,p))return;const ox=it.x,oz=it.z;let x=p.x+d.ox,z=p.z+d.oz;const t={...it,x,z};this.clampF(t);x=t.x;z=t.z;
      if(this.collides(it,x,z)){if(!this.collides(it,x,oz))z=oz;else if(!this.collides(it,ox,z))x=ox;else return;}
      if(!d.moved)this.pushHist();d.moved=true;it.x=x;it.z=z;it.y=this.supportY(it,x,z);d.riders.forEach(r=>{r.o.x=x+r.dx;r.o.z=z+r.dz;r.o.y=it.y?r.o.y:(OW.furn(it.type).top||0)*(it.scale||1);this.clampF(r.o);this.place(r.o);});this.place(it);}
    else{const h=this.ray.intersectObjects(this.picks,false)[0];if(!h)return;const k=h.object.userData.wall,f=this.wf()[k];if(k!==it.wall){it.wall=k;d.ou=0;d.ov=0;}
      it.x=(h.point.x-f.o[0])*f.u[0]+(h.point.z-f.o[2])*f.u[2]+d.ou;it.y=h.point.y+d.ov;this.clampD(it);if(!d.moved)this.pushHist();d.moved=true;this.place(it);}
    this.refreshHelper();this.markDirty(true);
  }
  up(e){
    const was=this.ptrs.has(e.pointerId);this.ptrs.delete(e.pointerId);if(this.ptrs.size<2)this.pinch=null;if(!was)return;
    if(this.drag&&this.drag.moved){this.drag=null;this.changed();return;}this.drag=null;
    if(this.tapOk&&this.ptrs.size===0){const it=this.tapItem;if(!this.edit){if(this.walkOn||this.res)this.walkTap(it,e);else if(it&&this.cb.onOpen)this.cb.onOpen(it);}else if(!it)this.select(null);}
  }
  /* ----- loop ----- */
  markDirty(sh){this.dirty=true;if(sh)this.shadowDirty=true;}
  resize(){if(!this.host)return;const w=this.host.clientWidth,h=this.host.clientHeight;if(!w||!h)return;this.r.setSize(w,h,false);this.canvas.style.width=w+'px';this.canvas.style.height=h+'px';this.cam.aspect=w/h;this.cam.fov=w/h<.8?52:40;this.cam.updateProjectionMatrix();this.cam0.dist=this.fitDist();if(!this.wTarget&&(!this.userZ||this.dist>this.cam0.dist))this.setCam(this.az,this.el,this.cam0.dist);this.applyView();}
  loop(){
    if(!this.alive)return;requestAnimationFrame(this.loop);const now=performance.now(),dt=Math.min(.05,(now-(this.t0||now))/1000);this.t0=now;if(this.walkTick)this.walkTick(dt);
    if(this.camT&&!this.walkOn){const c=this.camT;c.t=Math.min(1,c.t+.06);const k=c.t*c.t*(3-2*c.t);this.setCam(this.az+(c.az-this.az)*(k>.99?1:.16),this.el+(c.el-this.el)*.16,this.dist+(c.dist-this.dist)*.16);if(Math.abs(c.az-this.az)<.004&&Math.abs(c.el-this.el)<.004&&Math.abs(c.dist-this.dist)<.02){this.setCam(c.az,c.el,c.dist);this.camT=null;}}
    if(this.dirty){this.dirty=false;if(this.shadowDirty){this.r.shadowMap.needsUpdate=true;this.shadowDirty=false;}this.r.render(this.scene,this.cam);}
  }
  destroy(){this.alive=false;if(this.ro)this.ro.disconnect();this.clearItems();this.shell.traverse(o=>{if(o.geometry)o.geometry.dispose();});this.r.dispose();try{this.r.forceContextLoss();}catch(e){}this.canvas.remove();}
}
/* one shared little renderer draws the catalogue thumbnails, only for the items you scroll to */
OWRoom._thumbs={};
OWRoom.thumb=function(id){
  if(OWRoom._thumbs[id])return OWRoom._thumbs[id];
  const def=OW.def(id);if(!def)return'';
  if(!OWRoom._tr){const c=document.createElement('canvas');const r=OWRoom._tr=new THREE.WebGLRenderer({canvas:c,alpha:true,antialias:true,preserveDrawingBuffer:true});r.setSize(112,112,false);r.outputEncoding=THREE.sRGBEncoding;
    const s=OWRoom._ts=new THREE.Scene();s.add(new THREE.HemisphereLight(0xffffff,0x887766,1.1));const d=new THREE.DirectionalLight(0xffffff,.8);d.position.set(2,4,3);s.add(d);OWRoom._tc=new THREE.PerspectiveCamera(32,1,.05,50);}
  const s=OWRoom._ts,cam=OWRoom._tc;let g;
  if(def.deco){const it={width:def.w,height:def.h,scale:1,frame:def.frame};const b=OW.buildDecor(it,def,OW.THEMES.lagos);g=b.group;if(b.pic&&!b.pic.userData.keep){b.pic.material.map=OW.placeholder();}}
  else g=OW.buildFurn(def,def.col,OW.THEMES.lagos);
  s.add(g);const box=new THREE.Box3().setFromObject(g),sz=box.getSize(new THREE.Vector3()),c=box.getCenter(new THREE.Vector3());
  const R=Math.max(sz.x,sz.y,sz.z)*(def.deco?1.15:1.35);
  if(def.deco){cam.position.set(c.x,c.y,c.z+R/Math.tan(THREE.MathUtils.degToRad(16))*.62);}else cam.position.set(c.x+R*1.1,c.y+R*.8,c.z+R*1.5);cam.lookAt(c);
  OWRoom._tr.render(s,cam);const url=OWRoom._tr.domElement.toDataURL('image/png');s.remove(g);g.traverse(o=>{if(o.geometry)o.geometry.dispose();});
  return OWRoom._thumbs[id]=url;
};
/* renders a room off-screen to a small picture (used for Main Wall previews) */
OWRoom.preview=async function(room,items,w,h){
  const host=document.createElement('div');host.style.cssText='position:fixed;left:-9999px;top:0;width:'+w+'px;height:'+h+'px';document.body.appendChild(host);
  const r=new OWRoom(host,{edit:false,preserve:true});r.load(room,items);await r.whenLoaded(4000);
  const url=r.snapshot(w,h,.82);r.destroy();host.remove();return url;
};
