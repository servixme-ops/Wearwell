/* ---------- 3D phone lying on the coffee table ---------- */
const PHONE={x:0.235,z:TABLE.z+0.075,ry:0.5,w:0.088,h:0.182,t:0.0085};
let phone3d,phoneScreenMat,phoneTex,_phoneWp=null,_phoneBadge=0;
function buildPhone3d(){
  phone3d=new T.Group();phone3d.position.set(PHONE.x,TABLE.top+PHONE.t/2+.001,PHONE.z);phone3d.rotation.y=PHONE.ry;scene.add(phone3d);
  // iPhone: titanium frame, black glass front, flat rounded sides, side buttons
  const body=new T.Mesh(rbox(PHONE.w,PHONE.h,PHONE.t,.0125),mat('#a9a49c',.28,.85));body.rotation.x=-Math.PI/2;body.castShadow=true;body.receiveShadow=true;phone3d.add(body);
  const glass=new T.Mesh(rbox(PHONE.w-.0022,PHONE.h-.0022,PHONE.t*.5,.0115),mat('#050507',.15,.2));glass.rotation.x=-Math.PI/2;glass.position.y=PHONE.t*.27;phone3d.add(glass);
  const btn=(x,z,w,l)=>{const m=new T.Mesh(new T.BoxGeometry(w,PHONE.t*.5,l),mat('#8f8a83',.35,.8));m.position.set(x,0,z);phone3d.add(m);};
  btn(-PHONE.w/2-.0003,-.052,.0012,.011);btn(-PHONE.w/2-.0003,-.034,.0012,.018);btn(-PHONE.w/2-.0003,-.011,.0012,.018);btn(PHONE.w/2+.0003,-.03,.0012,.03);
  const cv=mk(288,600);phoneTex=new T.CanvasTexture(cv);phoneTex.encoding=T.sRGBEncoding;phoneTex.anisotropy=4;phoneTex._cv=cv;
  phoneScreenMat=new T.MeshStandardMaterial({map:phoneTex,roughness:.25,metalness:0,emissive:new T.Color('#ffffff'),emissiveMap:phoneTex,emissiveIntensity:.55});
  const scr=new T.Mesh(new T.PlaneGeometry(PHONE.w-.0065,PHONE.h-.0065),phoneScreenMat);scr.rotation.x=-Math.PI/2;scr.position.y=PHONE.t/2+.0006;phone3d.add(scr);
  // invisible, larger hit target so it is easy to tap on a phone
  const hit=new T.Mesh(new T.BoxGeometry(PHONE.w*1.6,.05,PHONE.h*1.3),new T.MeshBasicMaterial({visible:false}));hit.position.y=.01;phone3d.add(hit);phone3d.userData.hit=hit;
  // soft glow on the table
  const glow=new T.PointLight(0xffd9a0,.0,.6,2);glow.position.set(0,.06,0);phone3d.add(glow);phone3d.userData.glow=glow;
  updatePhoneScreenTexture();
  const img=new Image();img.onload=()=>{_phoneWp=img;updatePhoneScreenTexture();};img.src=Wall.def('lock');
}
function updatePhoneScreenTexture(){
  if(!phoneTex)return;
  const cv=phoneTex._cv,g=cv.getContext('2d'),W=cv.width,H=cv.height;
  if(_phoneWp){const r=Math.max(W/_phoneWp.width,H/_phoneWp.height);g.drawImage(_phoneWp,(W-_phoneWp.width*r)/2,(H-_phoneWp.height*r)/2,_phoneWp.width*r,_phoneWp.height*r);}else{g.fillStyle='#4a1020';g.fillRect(0,0,W,H);}
  g.fillStyle='rgba(0,0,0,.18)';g.fillRect(0,0,W,H);
  const d=new Date();g.fillStyle='#fff';g.textAlign='center';
  g.font=`500 22px ${F.body}`;g.fillText(d.toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric'}),W/2,108);
  g.font=`300 104px ${F.body}`;g.fillText(d.toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit',hour12:false}).replace(/^24/,'00'),W/2,200);
  const n=Math.min(3,_phoneBadge||0);
  for(let i=0;i<n;i++){g.fillStyle='rgba(245,245,247,.75)';g.beginPath();g.roundRect?g.roundRect(22,262+i*76,W-44,62,18):g.rect(22,262+i*76,W-44,62);g.fill();g.fillStyle='#6b1a2b';g.fillRect(36,278+i*76,30,30);g.fillStyle='rgba(0,0,0,.55)';g.fillRect(80,282+i*76,120,9);g.fillRect(80,298+i*76,170,8);}
  g.fillStyle='rgba(255,255,255,.9)';g.fillRect(W/2-52,H-26,104,5);
  g.fillStyle='#000';g.beginPath();g.roundRect?g.roundRect(W/2-44,14,88,25,12.5):g.rect(W/2-44,14,88,25);g.fill();
  phoneTex.needsUpdate=true;
}
function phoneBadge(n){_phoneBadge=n;updatePhoneScreenTexture();const b=document.getElementById('phoneBadge');if(b){b.textContent=n>9?'9+':n;b.hidden=!n;}}
function phoneAnim(now){
  if(!phone3d)return;
  const near=S.mode==='room';const pulse=.5+.5*Math.sin(now/520);
  phoneScreenMat.emissiveIntensity=.5+(near&&_phoneBadge?pulse*.35:0);
  phone3d.userData.glow.intensity=near?(0.35+(_phoneBadge?pulse*0.4:0)):0;
  // gentle buzz when there are notifications
  phone3d.position.x=PHONE.x+((near&&_phoneBadge&&(now%4200)<260)?Math.sin(now/22)*.0012:0);
}
function phoneGoal(){
  const a=aspect();const p=phone3d.position;
  G.pos.set(p.x-.02,p.y+(a<.8?.42:.34),p.z+(a<.8?.2:.15));G.look.set(p.x,p.y,p.z-.004);G.fov=a<.8?44:40;
}
function enterPhone(){
  if(S.mode==='phone'&&(Phone.state==='closed'||Phone.layer.hidden)){Phone.enter();return;}
  if(S.mode!=='room'||S.switching)return;
  S.auto=false;setMode('phone');
  setTimeout(()=>{if(S.mode==='phone')Phone.enter();},620);
  // safety net: if the overlay did not open, try again, then fall back to the room
  setTimeout(()=>{if(S.mode==='phone'&&(Phone.state==='closed'||Phone.layer.hidden))Phone.enter();},1500);
  setTimeout(()=>{if(S.mode==='phone'&&(Phone.state==='closed'||Phone.layer.hidden))phoneClosed();},2600);
}
function phoneClosed(){if(S.mode==='phone'){setMode('room');idle=0;}}
function tagPhone(){
  const t=document.getElementById('phoneTag');if(!t)return;
  if(S.mode!=='room'){t.style.opacity=0;t.style.pointerEvents='none';return;}
  const v=phone3d.position.clone();v.y+=.06;v.project(camera);
  const x=(v.x*.5+.5)*innerWidth,y=(-v.y*.5+.5)*innerHeight;
  t.style.transform=`translate(${x}px,${y}px) translate(-50%,-100%)`;t.style.opacity=v.z<1?1:0;t.style.pointerEvents='auto';
}
