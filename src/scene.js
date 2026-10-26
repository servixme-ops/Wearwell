/* ---------- SCENE: Nigerian living room, crate, magazines ---------- */
const T=THREE;
const ROOM={W:6.4,D:6.0,H:2.9};
const TABLE={x:0,z:-1.15,top:0.46};
const CRATE_POS=new T.Vector3(-0.2,TABLE.top,TABLE.z);
const MAG={w:0.23,h:0.304,t:0.010};
let renderer,scene,camera;
const L={};            // lights
let crate,crateWood=[],crateLabel;
let magGroups=[];
let pendantGlow,lampShade,windowGlass,curtainMats=[];

const mat=(c,r=.75,m=0,x)=>new T.MeshStandardMaterial(Object.assign({color:c,roughness:r,metalness:m},x||{}));
function ctex(canvas,rep){
  const t=new T.CanvasTexture(canvas);t.encoding=T.sRGBEncoding;
  t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
  if(rep){t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(rep[0],rep[1]);}
  return t;
}
function add(parent,geo,m,x,y,z,o){
  o=o||{};const me=new T.Mesh(geo,m);me.position.set(x||0,y||0,z||0);
  me.castShadow=o.cast!==false;me.receiveShadow=o.recv!==false;
  if(o.rx)me.rotation.x=o.rx;if(o.ry)me.rotation.y=o.ry;if(o.rz)me.rotation.z=o.rz;
  parent.add(me);return me;
}
function rbox(w,h,d,r){
  const b=Math.min(r*.55,d*.32,w*.2,h*.2);
  const iw=w-2*b,ih=h-2*b,rr=Math.max(.002,Math.min(r-b,iw/2-.001,ih/2-.001));
  const x=-iw/2,y=-ih/2,s=new T.Shape();
  s.moveTo(x+rr,y);s.lineTo(x+iw-rr,y);s.quadraticCurveTo(x+iw,y,x+iw,y+rr);s.lineTo(x+iw,y+ih-rr);
  s.quadraticCurveTo(x+iw,y+ih,x+iw-rr,y+ih);s.lineTo(x+rr,y+ih);s.quadraticCurveTo(x,y+ih,x,y+ih-rr);
  s.lineTo(x,y+rr);s.quadraticCurveTo(x,y,x+rr,y);
  const g=new T.ExtrudeGeometry(s,{depth:Math.max(.001,d-2*b),bevelEnabled:true,bevelThickness:b,bevelSize:b,bevelSegments:3,curveSegments:5});
  g.center();return g;
}
function rflat(w,d,h,r){const g=rbox(w,d,h,r);g.rotateX(-Math.PI/2);return g;}
const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};

function patCanvas(kind,cols,size,scale){
  const c=mk(size,size),g=c.getContext('2d');g.fillStyle=fabricFill(g,kind,cols,scale);g.fillRect(0,0,size,size);return c;
}
function texCurtain(){
  const c=mk(256,256),g=c.getContext('2d');g.fillStyle='#f0dfc0';g.fillRect(0,0,256,256);
  [['#8a2a3a',22,14],['#14284b',70,22],['#e9c46a',120,10],['#2b5d4f',160,24],['#8a2a3a',214,14]].forEach(b=>{g.fillStyle=b[0];g.fillRect(b[1],0,b[2],256);});
  g.fillStyle='rgba(0,0,0,.08)';for(let y=0;y<256;y+=4)g.fillRect(0,y,256,1);return c;
}
function texSky(){
  const c=mk(64,256),g=c.getContext('2d');const gr=g.createLinearGradient(0,0,0,256);
  gr.addColorStop(0,'#fff8e6');gr.addColorStop(.6,'#ffeec9');gr.addColorStop(1,'#ffe0a6');g.fillStyle=gr;g.fillRect(0,0,64,256);return c;
}
function texBack(m){
  const c=mk(256,338),g=c.getContext('2d');g.fillStyle=m.bg;g.fillRect(0,0,256,338);
  g.fillStyle=m.acc;g.beginPath();g.arc(128,150,70,0,7);g.fill();
  g.fillStyle=m.ink;g.font=`900 110px ${F.disp}`;g.textAlign='center';g.fillText('W',128,190);
  g.font=`600 12px ${F.body}`;g.fillText('WEARWELL  ·  DISCOVER NIGERIAN FASHION',128,40);
  barcode(g,80,262,96,52);return c;
}

/* ---------- Renderer / lights ---------- */
function initScene(canvas){
  renderer=new T.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
  renderer.outputEncoding=T.sRGBEncoding;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=.85;
  scene=new T.Scene();scene.background=new T.Color('#2a1a12');
  camera=new T.PerspectiveCamera(52,1,.03,30);

  L.hemi=new T.HemisphereLight(0xfff1dc,0x8a6a4a,.42);scene.add(L.hemi);
  const sp=new T.SpotLight(0xffe0b0,1.5,12,.62,.75,1.4);sp.position.set(-4.4,2.3,-.1);sp.target.position.set(.1,.2,-1.1);
  sp.castShadow=true;sp.shadow.mapSize.set(2048,2048);sp.shadow.bias=-.0004;sp.shadow.radius=3;sp.shadow.camera.near=.5;sp.shadow.camera.far=12;
  scene.add(sp,sp.target);L.sun=sp;
  L.lamp=new T.PointLight(0xffb060,.9,5.5,1.6);L.lamp.position.set(1.85,1.45,-2.3);scene.add(L.lamp);
  L.pend=new T.PointLight(0xffd29a,.55,4.5,1.6);L.pend.position.set(0,1.75,TABLE.z);scene.add(L.pend);
  L.book=new T.DirectionalLight(0xfff4e2,0);L.book.position.set(0,0,1);scene.add(L.book,L.book.target);
  buildRoom();buildFurniture();buildDecor();buildCrate();
}

function setDaylight(day){
  L.sun.intensity=day?1.5:.12;L.hemi.intensity=day?.42:.2;L.hemi.color.set(day?0xfff1dc:0x9aa6d8);
  L.lamp.intensity=day?.9:1.5;L.pend.intensity=day?.55:1.1;
  scene.background.set(day?'#2a1a12':'#0e0b12');
  renderer.toneMappingExposure=day?.85:1.1;
  if(windowGlass)windowGlass.material.color.set(day?'#ffffff':'#2c3a68');
  if(lampShade)lampShade.material.emissiveIntensity=day?.8:1.6;
  if(pendantGlow)pendantGlow.material.emissiveIntensity=day?.5:1.4;
}

/* ---------- Room shell ---------- */
function buildRoom(){
  const {W,D,H}=ROOM;
  const floorT=ctex(texFloor(),[W/1.7,D/1.7]);
  add(scene,new T.PlaneGeometry(W,D),mat('#ffffff',.5,0,{map:floorT}),0,0,0,{cast:false,rx:-Math.PI/2});
  const wallM=(c,s,w,h)=>mat('#ffffff',.95,0,{map:ctex(texPlaster(c,s),[w/2,h/2])});
  add(scene,new T.PlaneGeometry(W,H),wallM('#c97b4e',3,W,H),0,H/2,-D/2,{cast:false});
  add(scene,new T.PlaneGeometry(W,H),wallM('#efe1c8',4,W,H),0,H/2,D/2,{cast:false,ry:Math.PI});
  add(scene,new T.PlaneGeometry(D,H),wallM('#f0e3cb',5,D,H),-W/2,H/2,0,{cast:false,ry:Math.PI/2});
  add(scene,new T.PlaneGeometry(D,H),wallM('#f0e3cb',6,D,H),W/2,H/2,0,{cast:false,ry:-Math.PI/2});
  add(scene,new T.PlaneGeometry(W,D),mat('#f7eddc',.95),0,H,0,{cast:false,rx:Math.PI/2});
  // skirting
  const sk=mat('#4a2e1c',.5);
  add(scene,new T.BoxGeometry(W,.11,.03),sk,0,.055,-D/2+.015,{cast:false});
  add(scene,new T.BoxGeometry(W,.11,.03),sk,0,.055,D/2-.015,{cast:false});
  add(scene,new T.BoxGeometry(.03,.11,D),sk,-W/2+.015,.055,0,{cast:false});
  add(scene,new T.BoxGeometry(.03,.11,D),sk,W/2-.015,.055,0,{cast:false});
  // picture rail + wood panel behind the sofa
  add(scene,new T.BoxGeometry(2.9,1.0,.04),mat('#5b3520',.55,0,{map:ctex(texWood('#6b3f22'))}),0,.55,-D/2+.02,{});
  // window (left wall)
  const wx=-W/2,wz=.2,wy=1.55;
  windowGlass=add(scene,new T.PlaneGeometry(1.7,1.5),new T.MeshBasicMaterial({map:ctex(texSky()),toneMapped:false}),wx+.01,wy,wz,{cast:false,recv:false,ry:Math.PI/2});
  const fr=mat('#3d2515',.5);
  [[0,.775,1.78,.06],[0,-.775,1.78,.06]].forEach(b=>add(scene,new T.BoxGeometry(.09,b[3],b[2]),fr,wx+.05,wy+b[1],wz,{}));
  [[.89],[-.89]].forEach(b=>add(scene,new T.BoxGeometry(.09,1.6,.06),fr,wx+.05,wy,wz+b[0],{}));
  add(scene,new T.BoxGeometry(.07,1.5,.04),fr,wx+.05,wy,wz,{});
  add(scene,new T.BoxGeometry(.07,.04,1.7),fr,wx+.05,wy,wz,{});
  add(scene,new T.BoxGeometry(.2,.04,1.95),fr,wx+.1,wy-.8,wz,{});
  // curtains with folds
  const ct=ctex(texCurtain(),[1,1]);
  [-1,1].forEach(side=>{
    const g=new T.PlaneGeometry(.75,2.4,16,1),p=g.attributes.position;
    for(let i=0;i<p.count;i++)p.setZ(i,Math.sin((p.getX(i)+.375)*18)*.045);
    g.computeVertexNormals();
    const m=mat('#ffffff',.95,0,{map:ct,side:T.DoubleSide});curtainMats.push(m);
    add(scene,g,m,wx+.14,1.62,wz+side*1.18,{cast:false,ry:Math.PI/2});
  });
  add(scene,new T.CylinderGeometry(.018,.018,3.0,10),mat('#b58a3c',.3,.8),wx+.14,2.86,wz,{rx:Math.PI/2});
}

/* ---------- Furniture ---------- */
function buildFurniture(){
  const {W,D}=ROOM;
  // rug
  add(scene,new T.PlaneGeometry(3.0,1.9),mat('#ffffff',1,0,{map:ctex(texRug())}),0,.004,-1.25,{cast:false,rx:-Math.PI/2});
  // sofa
  const sofa=new T.Group();sofa.position.set(0,0,-2.42);scene.add(sofa);
  const teal=mat('#2f6560',.92),tealD=mat('#285752',.92),wood=mat('#ffffff',.5,0,{map:ctex(texWood('#5a341c'))});
  add(sofa,rbox(2.3,.26,.95,.05),tealD,0,.30,0);
  add(sofa,rbox(2.3,.62,.22,.08),teal,0,.76,-.36);
  [-1.04,1.04].forEach(x=>add(sofa,rbox(.24,.5,.95,.08),teal,x,.46,0));
  [-.62,0,.62].forEach(x=>{
    add(sofa,rbox(.6,.16,.72,.06),teal,x,.50,.07);
    add(sofa,rbox(.58,.46,.2,.08),teal,x,.82,-.2,{rx:-.2});
  });
  [[-.95,-.38],[.95,-.38],[-.95,.38],[.95,.38]].forEach(p=>add(sofa,new T.CylinderGeometry(.034,.022,.18,10),wood,p[0],.09,p[1]));
  const pil=[['ankara',['#c8372d','#f6e7cb','#1b1b1b'],-.7,.28],['asooke',['#2b5d4f','#f2c14e','#f6e7cb'],.72,-.24],['adire',['#14284b','#9fb8d8','#e9eef5'],-.3,.14]];
  pil.forEach(p=>{
    const m=mat('#ffffff',.9,0,{map:ctex(patCanvas(p[0],p[1],256,1.3))});
    const mesh=add(sofa,new T.SphereGeometry(.5,24,16),m,p[2],.76,.2,{rx:-.3,rz:p[3]});mesh.scale.set(.36,.36,.12);
  });
  // centre table
  const tt=mat('#ffffff',.38,.05,{map:ctex(texWood('#5b3420'))}),brass=mat('#c19a4a',.28,.9);
  add(scene,rflat(1.32,.74,.05,.07),tt,0,TABLE.top-.025,TABLE.z);
  add(scene,rflat(1.12,.56,.022,.03),mat('#4a2c19',.6),0,.17,TABLE.z);
  [[-.56,-.28],[.56,-.28],[-.56,.28],[.56,.28]].forEach(p=>add(scene,new T.CylinderGeometry(.02,.014,.43,10),brass,p[0],.215,TABLE.z+p[1]));
  // accent chair (left)
  const ch=new T.Group();ch.position.set(-1.95,0,-.8);ch.rotation.y=Math.PI/2+.25;scene.add(ch);
  const mus=mat('#d09a2e',.9);
  add(ch,rbox(.74,.16,.7,.06),mus,0,.42,0);add(ch,rbox(.74,.56,.16,.08),mus,0,.7,-.3,{rx:-.14});
  [-1,1].forEach(s=>add(ch,rbox(.1,.28,.62,.04),mat('#4a2c19',.55),s*.4,.55,0));
  [[-.3,-.28],[.3,-.28],[-.3,.28],[.3,.28]].forEach(p=>add(ch,new T.CylinderGeometry(.03,.02,.34,8),wood,p[0],.17,p[1]));
  // Yoruba carved stool
  const prof=[];[[0,0],[.15,0],[.17,.02],[.1,.1],[.075,.2],[.1,.3],[.17,.36],[.19,.4],[.0,.4]].forEach(p=>prof.push(new T.Vector2(p[0],p[1])));
  add(scene,new T.LatheGeometry(prof,26),mat('#ffffff',.55,0,{map:ctex(texWood('#4d2c16'))}),1.55,0,-.7);
  // side table + lamp-side items (left of sofa)
  add(scene,new T.CylinderGeometry(.27,.27,.04,32),tt,-1.78,.5,-2.5);
  add(scene,new T.CylinderGeometry(.03,.03,.5,10),brass,-1.78,.25,-2.5);
  add(scene,new T.CylinderGeometry(.18,.18,.025,24),brass,-1.78,.012,-2.5);
  // books
  [['#7a1f2b',.22,.035],['#14284b',.2,.03],['#e9c46a',.2,.03]].forEach((b,i)=>add(scene,new T.BoxGeometry(b[1]+.02,b[2],.15),mat(b[0],.7),-1.78+i*.01,.52+b[2]/2+i*.034-.0,-2.5,{ry:i*.2}));
  // floor lamp (right of sofa)
  add(scene,new T.CylinderGeometry(.16,.16,.025,24),brass,1.85,.012,-2.3);
  add(scene,new T.CylinderGeometry(.014,.014,1.45,8),brass,1.85,.74,-2.3);
  lampShade=add(scene,new T.CylinderGeometry(.2,.28,.34,28,1,true),mat('#ffd9a0',.9,0,{emissive:new T.Color('#ffb566'),emissiveIntensity:.8,side:T.DoubleSide}),1.85,1.55,-2.3,{cast:false});
}

/* ---------- Plants, vase, art, pendant ---------- */
function plant(x,z,s,kind){
  const g=new T.Group();g.position.set(x,0,z);g.scale.setScalar(s);scene.add(g);
  const bt=ctex(texBasket(),[2,1]);
  add(g,new T.CylinderGeometry(.24,.19,.42,24),mat('#ffffff',.9,0,{map:bt}),0,.21,0);
  add(g,new T.CylinderGeometry(.22,.22,.02,20),mat('#2b1a10',1),0,.42,0,{cast:false});
  const green=['#2f6b3a','#3a7d43','#25572f'];
  if(kind==='fiddle'){
    add(g,new T.CylinderGeometry(.02,.03,1.0,8),mat('#5a3a22',.8),0,.9,0);
    for(let i=0;i<20;i++){const a=i*2.4,hgt=.75+(i/20)*.95,r=.12+Math.sin(i)*.04+.12*(1-i/20);
      const lf=add(g,new T.SphereGeometry(.15,10,8),mat(green[i%3],.6,0,{side:T.DoubleSide}),Math.cos(a)*r,hgt,Math.sin(a)*r,{});
      lf.scale.set(1,.12,.72);lf.rotation.set(.5*Math.sin(a),a,.5*Math.cos(a));}
  }else{
    for(let i=0;i<9;i++){const a=i/9*6.28,tilt=.55+(i%3)*.15;
      const fr=add(g,new T.SphereGeometry(.5,12,6),mat(green[i%3],.6,0,{side:T.DoubleSide}),Math.cos(a)*.38,.95+(i%3)*.12,Math.sin(a)*.38,{});
      fr.scale.set(1,.05,.2);fr.rotation.set(0,-a,tilt);}
    add(g,new T.CylinderGeometry(.02,.03,.7,8),mat('#5a3a22',.8),0,.75,0);
  }
  return g;
}
function buildDecor(){
  const {W,D,H}=ROOM;
  plant(-2.55,-2.35,1.0,'fiddle');plant(2.55,-.5,.95,'palm');plant(2.5,2.3,1.0,'fiddle');
  // table decor: ceramic vase with flowers
  const vp=[[0,0],[.045,0],[.06,.02],[.085,.1],[.075,.2],[.04,.26],[.05,.3],[.06,.32],[.045,.33],[.04,.3]].map(p=>new T.Vector2(p[0],p[1]));
  const vx=.46,vz=TABLE.z+.06;
  const vaseMap=ctex(texArt('adire'),[2,1]);
  add(scene,new T.LatheGeometry(vp,28),mat('#ffffff',.28,0,{map:vaseMap}),vx,TABLE.top,vz);
  const cols=['#d6283b','#f2b705','#e8662c','#d6283b','#f7a8b8','#e8662c','#f2b705'];
  const rr=rng(11);
  for(let i=0;i<7;i++){
    const a=i/7*6.28,lean=.18+rr()*.28,len=.34+rr()*.18;
    const stem=new T.Group();stem.position.set(vx,TABLE.top+.3,vz);stem.rotation.set(Math.sin(a)*lean,0,-Math.cos(a)*lean);scene.add(stem);
    add(stem,new T.CylinderGeometry(.004,.004,len,5),mat('#2f6b3a',.8),0,len/2,0);
    const b=add(stem,new T.SphereGeometry(.036,12,8),mat(cols[i],.55),0,len+.01,0);b.scale.set(1,.7,1);
    add(stem,new T.SphereGeometry(.012,8,6),mat('#f6d65a',.6),0,len+.03,0);
    const lf=add(stem,new T.SphereGeometry(.05,8,6),mat('#2f6b3a',.6),.02,len*.5,0);lf.scale.set(1,.1,.5);lf.rotation.z=.6;
  }
  for(let i=0;i<4;i++){const a=i*1.6;const lf=add(scene,new T.SphereGeometry(.12,8,6),mat('#25572f',.6,0,{side:T.DoubleSide}),vx+Math.cos(a)*.1,TABLE.top+.46+i*.02,vz+Math.sin(a)*.1);lf.scale.set(.3,1.2,.06);lf.rotation.set(0,-a,Math.cos(a)*.7);}
  // calabash bowl + beads tray
  add(scene,new T.SphereGeometry(.1,22,12,0,6.283,Math.PI/2,Math.PI/2),mat('#a8672c',.55,0,{side:T.DoubleSide}),-.5,TABLE.top+.0,TABLE.z+.12,{rx:Math.PI});
  add(scene,new T.CylinderGeometry(.045,.05,.05,16),mat('#f3ead8',.5),.12,TABLE.top+.025,TABLE.z+.22);
  // wall art (back wall)
  const frameM=mat('#3b2314',.45);
  function frame(kind,w,h,x,y,z,ry){
    const g=new T.Group();g.position.set(x,y,z);g.rotation.y=ry||0;scene.add(g);
    add(g,new T.BoxGeometry(w+.07,h+.07,.035),frameM,0,0,.0);
    add(g,new T.PlaneGeometry(w,h),new T.MeshStandardMaterial({map:ctex(texArt(kind)),roughness:.7}),0,0,.02,{cast:false});
    return g;
  }
  frame('portrait',.86,1.08,0,1.68,-D/2+.03);
  frame('adire',.5,.66,-.78,1.6,-D/2+.03);
  frame('ankara',.5,.66,.78,1.6,-D/2+.03);
  frame('weave',.9,.62,W/2-.03,1.5,-1.0,-Math.PI/2);
  frame('adire',.55,.72,W/2-.03,1.5,.2,-Math.PI/2);
  frame('ankara',.6,.8,-1.1,1.55,D/2-.03,Math.PI);
  frame('portrait',.6,.8,.1,1.55,D/2-.03,Math.PI);
  // floating shelf on right wall with calabashes
  add(scene,new T.BoxGeometry(.22,.04,1.1),frameM,W/2-.11,1.0,1.4,{});
  add(scene,new T.SphereGeometry(.09,16,10,0,6.283,Math.PI/2,Math.PI/2),mat('#a8672c',.55,0,{side:T.DoubleSide}),W/2-.12,1.02,1.1,{rx:Math.PI});
  add(scene,new T.LatheGeometry(vp,20),mat('#c8372d',.35),W/2-.12,1.02,1.45,{});
  add(scene,new T.LatheGeometry(vp,20),mat('#1d3a8a',.35),W/2-.12,1.02,1.75,{});
  // pendant
  add(scene,new T.CylinderGeometry(.006,.006,.9,5),mat('#222',.6),0,H-.45,TABLE.z,{cast:false});
  const bm=ctex(texBasket(),[3,2]);
  pendantGlow=add(scene,new T.SphereGeometry(.24,24,16),mat('#ffffff',.9,0,{map:bm,emissive:new T.Color('#ffb566'),emissiveIntensity:.5,side:T.DoubleSide}),0,H-1.0,TABLE.z,{cast:false});
  pendantGlow.scale.y=.78;
}

/* ---------- Crate + magazines ---------- */
function buildCrate(){
  crate=new T.Group();crate.position.copy(CRATE_POS);scene.add(crate);
  const woodMap=ctex(texWood('#b9854c'));crateWood=[];
  const wm=()=>{const m=mat('#ffffff',.62,0,{map:woodMap});crateWood.push(m);return m;};
  const cw=.30,cd=.50,ch=.15,tk=.014;
  add(crate,new T.BoxGeometry(cw,.014,cd),wm(),0,.007,0);
  [-1,1].forEach(s=>{
    [.04,.088,.136].forEach(y=>add(crate,new T.BoxGeometry(tk,.036,cd-.03),wm(),s*(cw/2-tk/2),y,0));
  });
  [-1,1].forEach(s=>{
    const hh=s>0?[.04,.088]:[.04,.088,.136];
    hh.forEach(y=>add(crate,new T.BoxGeometry(cw-.03,.036,tk),wm(),0,y,s*(cd/2-tk/2)));
  });
  [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(p=>add(crate,new T.BoxGeometry(.028,p[1]>0?.115:.16,.028),wm(),p[0]*(cw/2-.014),(p[1]>0?.115:.16)/2,p[1]*(cd/2-.014)));
  crateLabel=add(crate,new T.PlaneGeometry(.2,.05),new T.MeshBasicMaterial({toneMapped:false}),0,.062,cd/2+.001,{cast:false,recv:false});
  crate.userData.pick=true;
}
function applyCrateLook(ci){
  const c=CRATES[ci];
  crateWood.forEach(m=>m.color.set(c.wood).lerp(new T.Color('#ffffff'),.35));
  if(crateLabel.material.map)crateLabel.material.map.dispose();
  crateLabel.material.map=ctex(texCrateLabel(c.name,c.label));crateLabel.material.needsUpdate=true;
}

let _edgeV=null,_edgeH=null;
function edgeTexs(){
  if(_edgeH)return;
  _edgeH=ctex(texEdges());
  const s=texEdges(),c=mk(64,64),g=c.getContext('2d');g.translate(32,32);g.rotate(Math.PI/2);g.drawImage(s,-32,-32);
  _edgeV=ctex(c);
}
function buildMag(m){
  edgeTexs();
  const g=new T.Group();
  const cover=ctex(drawCover(m,512,676));
  const back=ctex(texBack(m));
  const eM=(t)=>mat('#ffffff',.9,0,{map:t});
  const mats=[eM(_edgeV),mat(m.bg,.8),eM(_edgeH),eM(_edgeH),
    new T.MeshStandardMaterial({map:cover,roughness:.75,metalness:0,emissive:new T.Color('#ffffff'),emissiveMap:cover,emissiveIntensity:.18}),
    new T.MeshStandardMaterial({map:back,roughness:.5})];
  const mesh=new T.Mesh(new T.BoxGeometry(MAG.w,MAG.h,MAG.t),mats);
  mesh.position.y=MAG.h/2;mesh.castShadow=true;mesh.receiveShadow=true;g.add(mesh);
  g.userData={m,mesh,free:false};mesh.userData.mag=g;
  return g;
}
function clearMags(){
  magGroups.forEach(g=>{g.parent&&g.parent.remove(g);g.userData.mesh.material.forEach(mm=>{if(mm.map&&mm.map!==_edgeH&&mm.map!==_edgeV)mm.map.dispose();mm.dispose();});g.userData.mesh.geometry.dispose();});
  magGroups=[];
}
function loadCrateMags(ci){
  clearMags();applyCrateLook(ci);
  crateMags(ci).forEach(m=>{const g=buildMag(m);crate.add(g);magGroups.push(g);});
}
const ZS=.03;
function layoutMags(pos){
  magGroups.forEach((g,i)=>{
    if(g.userData.free)return;
    const d=i-pos;let y,z,rx=0,sc=1;
    if(d>=0){const s=smooth(d);y=.125*(1-s);z=ZS-.075*s-Math.max(d-1,0)*.0165;rx=-.03*s;sc=1+.035*(1-s);}
    else{const s=smooth(-d);y=.125*(1-s);z=ZS+.052*s+Math.max(-d-1,0)*.019;rx=.78*s;sc=1+.035*(1-s);}
    g.position.set(0,.014+y,z);g.rotation.set(rx,0,0);g.scale.setScalar(sc);
  });
}

/* ---------- Book (opened magazine) ---------- */
class Book{
  constructor(m){
    this.m=m;this.NL=5;this.flip=0;this.group=new T.Group();this.leaves=[];this.faces=[];
    const w=MAG.w,h=MAG.h;this.w=w;this.h=h;
    for(let i=0;i<10;i++)this.faces.push(drawFace(m,i,640,845));
    const tex=this.faces.map(f=>ctex(f.c));
    this.tex=tex;
    for(let k=0;k<this.NL;k++){
      const geo=new T.PlaneGeometry(w,h,20,1);
      const fm=new T.MeshStandardMaterial({map:tex[2*k],roughness:.6,emissive:new T.Color('#ffffff'),emissiveMap:tex[2*k],emissiveIntensity:.42,side:T.FrontSide});
      const bt=tex[2*k+1].clone();bt.needsUpdate=true;bt.wrapS=T.RepeatWrapping;bt.repeat.x=-1;bt.offset.x=1;
      const bm=new T.MeshStandardMaterial({map:bt,roughness:.6,emissive:new T.Color('#ffffff'),emissiveMap:bt,emissiveIntensity:.42,side:T.BackSide});
      const fMesh=new T.Mesh(geo,fm),bMesh=new T.Mesh(geo,bm);
      fMesh.castShadow=bMesh.castShadow=true;fMesh.receiveShadow=bMesh.receiveShadow=true;
      fMesh.userData={leaf:k,side:'f'};bMesh.userData={leaf:k,side:'b'};
      this.group.add(fMesh,bMesh);this.leaves.push({geo,fMesh,bMesh,theta:-1});
    }
    edgeTexs();
    const em=mat('#ffffff',.9,0,{map:_edgeV});
    const emH=mat('#ffffff',.9,0,{map:_edgeH});
    const bmat=[em,em,emH,emH,mat(m.bg,.7),mat(m.bg,.7)];
    this.blockR=new T.Mesh(new T.BoxGeometry(w,h,1),bmat);this.blockL=new T.Mesh(new T.BoxGeometry(w,h,1),bmat);
    this.blockR.castShadow=this.blockL.castShadow=true;this.blockR.receiveShadow=this.blockL.receiveShadow=true;
    this.group.add(this.blockR,this.blockL);
    this.update(0,true);
  }
  update(flip,force){
    this.flip=flip;const L=this.NL,w=this.w,TK=.0016;
    for(let k=0;k<L;k++){
      const lf=this.leaves[k];const f=Math.max(0,Math.min(1,flip-k));const th=Math.PI*smooth(f);
      if(!force&&Math.abs(th-lf.theta)<1e-4)continue;lf.theta=th;
      const bend=.9,z0=(1-smooth(f))*TK*(L-1-k)+smooth(f)*TK*k+.0006;
      const p=lf.geo.attributes.position,N=20,ds=w/N;let x=0,z=0;
      for(let i=0;i<=N;i++){
        if(i>0){const a=th-bend*Math.sin(th)*((i-.5)/N);x+=Math.cos(a)*ds;z+=Math.sin(a)*ds;}
        p.setXYZ(i,x,this.h/2,z+z0);p.setXYZ(i+N+1,x,-this.h/2,z+z0);
      }
      p.needsUpdate=true;lf.geo.computeVertexNormals();lf.geo.computeBoundingSphere();
      lf.fMesh.userData.flat=(f<.02);lf.bMesh.userData.flat=(f>.98);
    }
    const tr=Math.max(.0004,(L-flip)/L*.012),tl=Math.max(.0004,flip/L*.012);
    this.blockR.scale.z=tr;this.blockR.position.set(w/2,0,-tr/2-.0002);
    this.blockL.scale.z=tl;this.blockL.position.set(-w/2,0,-tl/2-.0002);
    this.blockR.visible=flip<L-.02;this.blockL.visible=flip>.02;
  }
  meshes(){const a=[];this.leaves.forEach(l=>a.push(l.fMesh,l.bMesh));return a;}
  hotspot(hit){
    const u=hit.object.userData;if(u.leaf===undefined)return null;
    const face=u.side==='f'?2*u.leaf:2*u.leaf+1;
    const xi=u.side==='f'?hit.uv.x:1-hit.uv.x,yi=1-hit.uv.y;
    const f=this.faces[face];
    for(const r of f.hs){if(xi>=r.x&&xi<=r.x+r.w&&yi>=r.y&&yi<=r.y+r.h)return r.look;}
    return null;
  }
  dispose(){
    this.leaves.forEach(l=>{l.geo.dispose();l.fMesh.material.dispose();l.bMesh.material.map.dispose();l.bMesh.material.dispose();});
    this.tex.forEach(t=>t.dispose());
  }
}
