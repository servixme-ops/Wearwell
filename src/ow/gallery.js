/* ---------- the OpenWalls house gallery: white walls, marble floor, LED track lights, framed art, plinths and wall instruments.
   Used when a room's theme has house:true. Everything is drawn from primitives and canvases: nothing is downloaded. ---------- */
(function(){
const T=THREE,P=OWRoom.prototype,PI=Math.PI,M=(c,r,m)=>OW.mat(c,r,m);
OW.THEMES.gallery={name:'OpenWalls Gallery',wall:'#f7f6f2',floor:'#464952',trim:'#ffffff',ceil:'#2b2b30',rug:['#fff','#fff','#fff']};
OW.GALLERY={w:9,d:13,h:3.7};
const box=(g,w,h,d,mat,x,y,z,cast)=>{const m=new T.Mesh(new T.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);m.castShadow=!!cast;m.receiveShadow=true;g.add(m);return m;};
const cyl=(g,rt,rb,h,mat,x,y,z,seg)=>{const m=new T.Mesh(new T.CylinderGeometry(rt,rb,h,seg||20),mat);m.position.set(x,y,z);m.castShadow=false;m.receiveShadow=true;g.add(m);return m;};
const glowM=(c,i)=>new T.MeshStandardMaterial({color:c,emissive:c,emissiveIntensity:i||1.4});

/* ----- marble floor ----- */
function marble(W,D){
  const c=OW.canvas(512,512),g=c.getContext('2d');g.fillStyle='#464952';g.fillRect(0,0,512,512);
  let s=7;const rnd=()=>(s=(s*16807)%2147483647)/2147483647;
  for(let i=0;i<46;i++){let x=rnd()*512,y=rnd()*512,a=rnd()*6.28;g.strokeStyle='rgba('+(190+rnd()*50|0)+','+(190+rnd()*50|0)+','+(195+rnd()*50|0)+','+(.05+rnd()*.17)+')';g.lineWidth=.7+rnd()*2.6;g.beginPath();g.moveTo(x,y);
    for(let k=0;k<14;k++){a+=(rnd()-.5)*1.1;x+=Math.cos(a)*(14+rnd()*26);y+=Math.sin(a)*(14+rnd()*26);g.lineTo(x,y);}g.stroke();}
  for(let i=0;i<70;i++){g.fillStyle='rgba(255,255,255,'+(.015+rnd()*.035)+')';g.beginPath();g.arc(rnd()*512,rnd()*512,6+rnd()*30,0,7);g.fill();}
  g.strokeStyle='rgba(15,15,20,.7)';g.lineWidth=2;g.strokeRect(1,1,510,510);
  return OW.tex(c,[W/1.6,D/1.6]);}

/* ----- original African-inspired artworks, drawn in code ----- */
const ART={
  adire(g,w,h){g.fillStyle='#14246b';g.fillRect(0,0,w,h);g.strokeStyle='#e8eefc';g.lineWidth=5;
    for(let i=0;i<4;i++)for(let j=0;j<5;j++){const x=50+i*100,y=50+j*100;for(let r=36;r>4;r-=10){g.beginPath();g.arc(x,y,r,0,7);g.stroke();}}
    g.lineWidth=3;for(let i=0;i<8;i++){g.beginPath();g.moveTo(0,i*65+10);g.lineTo(w,i*65+40);g.stroke();}},
  ankara(g,w,h){const cols=['#ff7a1a','#0d7a74','#ffd23f','#b3203a','#1b1b3a'];g.fillStyle='#fff4dc';g.fillRect(0,0,w,h);
    for(let j=0;j<7;j++)for(let i=0;i<5;i++){const x=i*86,y=j*86+((i%2)?43:0)-20;g.fillStyle=cols[(i+j)%5];g.beginPath();g.moveTo(x,y+86);g.lineTo(x+43,y);g.lineTo(x+86,y+86);g.closePath();g.fill();g.fillStyle=cols[(i+j+2)%5];g.beginPath();g.arc(x+43,y+58,13,0,7);g.fill();}},
  danfo(g,w,h){g.fillStyle='#17171f';g.fillRect(0,0,w,h);const gr=g.createLinearGradient(0,0,0,h*.55);gr.addColorStop(0,'#ff8a2b');gr.addColorStop(1,'#ffd23f');g.fillStyle=gr;g.fillRect(0,0,w,h*.55);
    g.fillStyle='#2a2a38';[[20,.18],[78,.3],[140,.22],[205,.34],[270,.2],[330,.28]].forEach(([x,k])=>g.fillRect(x,h*.55-h*k,48,h*k));
    g.fillStyle='#ffd400';g.fillRect(70,h*.62,260,110);g.fillStyle='#111';g.fillRect(70,h*.62+48,260,16);g.fillStyle='#bfe6ff';[90,150,210,270].forEach(x=>g.fillRect(x,h*.62+10,46,30));
    g.fillStyle='#111';[120,290].forEach(x=>{g.beginPath();g.arc(x,h*.62+112,24,0,7);g.fill();});g.fillStyle='#eee';[120,290].forEach(x=>{g.beginPath();g.arc(x,h*.62+112,10,0,7);g.fill();});},
  gele(g,w,h){g.fillStyle='#f3d9b8';g.fillRect(0,0,w,h);g.fillStyle='#6a2c91';g.beginPath();g.ellipse(w*.5,h*.26,150,92,0,0,7);g.fill();g.fillStyle='#e3a3ff';g.beginPath();g.ellipse(w*.42,h*.2,70,40,-.4,0,7);g.fill();g.fillStyle='#ffd23f';g.beginPath();g.ellipse(w*.62,h*.3,60,32,.3,0,7);g.fill();
    g.fillStyle='#5a3322';g.beginPath();g.ellipse(w*.5,h*.52,70,102,0,0,7);g.fill();g.fillStyle='#0f0f14';g.beginPath();g.ellipse(w*.42,h*.5,9,5,0,0,7);g.ellipse(w*.58,h*.5,9,5,0,0,7);g.fill();g.fillStyle='#b3203a';g.beginPath();g.ellipse(w*.5,h*.62,22,8,0,0,7);g.fill();
    g.fillStyle='#0d7a74';g.beginPath();g.moveTo(w*.15,h);g.quadraticCurveTo(w*.5,h*.66,w*.85,h);g.closePath();g.fill();},
  aso(g,w,h){const cols=['#b3203a','#ffd23f','#0d7a74','#1b1b3a','#ff7a1a','#f4efe2'];for(let i=0;i<10;i++){g.fillStyle=cols[i%6];g.fillRect(i*w/10,0,w/10+1,h);}
    for(let j=0;j<12;j++){g.fillStyle=cols[(j*2+1)%6];g.globalAlpha=.85;g.fillRect(0,j*h/12,w,h/48);g.globalAlpha=1;}
    g.strokeStyle='rgba(255,255,255,.6)';g.lineWidth=3;for(let j=0;j<6;j++){g.beginPath();g.moveTo(0,j*84+30);for(let x=0;x<=w;x+=20)g.lineTo(x,j*84+30+((x/20)%2?14:-14));g.stroke();}},
  drum(g,w,h){g.fillStyle='#0d3b2e';g.fillRect(0,0,w,h);for(let r=170;r>20;r-=26){g.fillStyle=r%52?'#d9a441':'#7a2e1d';g.beginPath();g.arc(w/2,h*.45,r,0,7);g.fill();}
    g.fillStyle='#f4efe2';for(let i=0;i<24;i++){const a=i/24*6.28;g.beginPath();g.arc(w/2+Math.cos(a)*190,h*.45+Math.sin(a)*190,6,0,7);g.fill();}
    g.fillStyle='#111';g.beginPath();g.arc(w/2,h*.45,18,0,7);g.fill();}
};
const artCache={};
function artTex(k){
  if(artCache[k])return artCache[k];const c=OW.canvas(400,500),g=c.getContext('2d');
  if(ART[k])ART[k](g,400,500);else{try{const s=OWPaint.refCanvas('ref:'+k);g.drawImage(s,0,0,400,500);}catch(e){g.fillStyle='#ccc';g.fillRect(0,0,400,500);}}
  return artCache[k]=OW.tex(c);}

/* a framed picture on a wall; n = wall normal axis */
function frame(g,k,x,y,z,ry,w,h,fm){
  const grp=new T.Group();grp.position.set(x,y,z);grp.rotation.y=ry;
  box(grp,w+.14,h+.14,.07,fm||M('#1a1a1a',.5),0,0,.035,false);box(grp,w+.02,h+.02,.02,M('#fbfaf6',.9),0,0,.075);
  const p=new T.Mesh(new T.PlaneGeometry(w-.1,h-.1),new T.MeshStandardMaterial({map:artTex(k),roughness:.7}));p.position.z=.09;grp.add(p);
  g.add(grp);return grp;}

/* ----- plinth objects, all small and original ----- */
const OBJ=(function(){
  const sphere=(g,r,mat,x,y,z,sx,sy,sz)=>{const m=new T.Mesh(new T.SphereGeometry(r,18,14),mat);m.position.set(x,y,z);m.scale.set(sx||1,sy||1,sz||1);m.castShadow=true;g.add(m);return m;};
  const lathe=(g,pts,mat,x,y,z,seg)=>{const m=new T.Mesh(new T.LatheGeometry(pts.map(p=>new T.Vector2(p[0],p[1])),seg||28),mat);m.position.set(x||0,y||0,z||0);m.castShadow=true;m.receiveShadow=true;g.add(m);return m;};
  const extr=(shape,depth,mat,bev)=>{const m=new T.Mesh(new T.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelSize:bev||.012,bevelThickness:bev||.012,bevelSegments:2,curveSegments:8}),mat);m.castShadow=true;m.receiveShadow=true;return m;};
  const tyre=(g,r,w,x,y,z,ax)=>{const t=new T.Mesh(new T.TorusGeometry(r*.78,r*.24,10,22),M('#0e0e10',.9));t.position.set(x,y,z);if(ax==='x')t.rotation.y=PI/2;g.add(t);t.castShadow=true;const h=cyl(g,r*.55,r*.55,w*.5,M('#b9bcc2',.35,.8),x,y,z,16);if(ax!=='x')h.rotation.x=PI/2;else h.rotation.z=PI/2;};
  function decal(w,h,draw){const c=OW.canvas(w,h),g=c.getContext('2d');draw(g,w,h);return OW.tex(c);}
  return{
  danfo(g){
    const yel=M('#f4c20d',.38,.15),blk=M('#121214',.5),glass=new T.MeshStandardMaterial({color:'#1b2a38',roughness:.12,metalness:.6}),chr=M('#c9ccd2',.25,.9);
    const s=new T.Shape();s.moveTo(-.5,.1);s.lineTo(.49,.1);s.quadraticCurveTo(.54,.12,.54,.2);s.lineTo(.5,.27);s.lineTo(.37,.31);s.lineTo(.31,.5);s.quadraticCurveTo(.3,.55,.25,.55);s.lineTo(-.45,.55);s.quadraticCurveTo(-.5,.55,-.5,.5);s.lineTo(-.5,.1);
    const body=extr(s,.34,yel,.014);body.position.z=-.17;g.add(body);
    const stripe=decal(512,64,(c,w,h)=>{c.fillStyle='#111';c.fillRect(0,0,w,h);c.fillStyle='#f4c20d';c.font='700 34px system-ui,sans-serif';c.textBaseline='middle';c.fillText('OSHODI – YABA',14,34);});
    [1,-1].forEach(sd=>{const z=sd*.186;const st=new T.Mesh(new T.PlaneGeometry(.96,.075),new T.MeshStandardMaterial({map:stripe,roughness:.6}));st.position.set(-.02,.27,z);if(sd<0)st.rotation.y=PI;g.add(st);
      [-.4,-.24,-.08,.08,.24].forEach((x,i)=>{const gl=new T.Mesh(new T.PlaneGeometry(.12,.12),glass);gl.position.set(x,.4,z+sd*.002);if(sd<0)gl.rotation.y=PI;g.add(gl);});
      const ws=new T.Mesh(new T.PlaneGeometry(.12,.13),glass);ws.position.set(.37,.4,z+sd*.002);ws.rotation.y=sd<0?PI:0;g.add(ws);
      const dh=box(g,.035,.012,.012,chr,.2,.34,z+sd*.01);box(g,.004,.17,.004,blk,.15,.4,z+sd*.002);});
    const wsf=new T.Mesh(new T.PlaneGeometry(.31,.15),glass);wsf.position.set(.39,.4,0);wsf.rotation.set(0,PI/2,0);wsf.rotation.x=0;const wsq=new T.Mesh(new T.PlaneGeometry(.3,.17),glass);wsq.position.set(.345,.41,0);wsq.rotation.y=PI/2;wsq.rotation.x=-.28;g.add(wsq);
    box(g,.02,.1,.3,blk,.545,.19,0);box(g,.03,.035,.34,chr,.55,.12,0,true);[-1,1].forEach(z=>{sphere(g,.035,M('#fff6dc',.2),.54,.2,z*.12,.5,1,1);box(g,.012,.018,.05,M('#ff9a1a',.4),.54,.14,z*.15);});
    [-1,1].forEach(z=>{box(g,.04,.045,.012,blk,.3,.34,z*.215);});box(g,.03,.03,.34,chr,-.52,.12,0,true);box(g,.04,.025,.1,M('#fff',.5),-.505,.2,0);
    [[-.31,.098],[.32,.098]].forEach(([x])=>[-1,1].forEach(z=>tyre(g,.09,.07,x,.095,z*.18)));
    box(g,.68,.012,.28,M('#222',.4,.6),-.1,.565,0);[-.3,-.1,.1].forEach(x=>box(g,.012,.04,.28,M('#222',.4,.6),x,.58,0));const sack=sphere(g,.07,M('#c9b27a',.95),-.2,.62,0,1.5,.7,1.4);sphere(g,.05,M('#8d5a2b',.9),.02,.61,.04,1.3,.8,1);
    box(g,.3,.06,.004,M('#f4f4f4',.5),-.1,.15,.19);},
  keke(g){
    const yel=M('#f2bf10',.4,.1),blk=M('#141416',.55),grn=M('#1c7a46',.5),glass=new T.MeshStandardMaterial({color:'#1c2c3a',roughness:.12,metalness:.5,transparent:true,opacity:.75}),chr=M('#c9ccd2',.25,.9);
    const s=new T.Shape();s.moveTo(-.3,.1);s.lineTo(.22,.1);s.quadraticCurveTo(.28,.1,.3,.17);s.lineTo(.34,.3);s.quadraticCurveTo(.33,.36,.28,.4);s.lineTo(-.18,.5);s.quadraticCurveTo(-.3,.5,-.3,.4);s.lineTo(-.3,.1);
    const cab=extr(s,.34,yel,.014);cab.position.z=-.17;g.add(cab);
    const roof=new T.Mesh(new T.BoxGeometry(.62,.025,.4),blk);roof.position.set(-.02,.53,0);g.add(roof);[[-.28,-.17],[-.28,.17],[.12,-.17],[.12,.17]].forEach(([x,z])=>box(g,.018,.18,.018,blk,x,.43,z));
    box(g,.56,.1,.04,blk,-.02,.5,-.17);const wsq=new T.Mesh(new T.PlaneGeometry(.34,.19),glass);wsq.position.set(.32,.37,0);wsq.rotation.set(0,PI/2,0);wsq.rotation.x=-.36;g.add(wsq);
    box(g,.2,.06,.3,M('#2a2a2e',.8),-.12,.22,0);box(g,.02,.24,.3,M('#2a2a2e',.8),-.24,.3,0);
    const fork=box(g,.012,.2,.012,chr,.37,.12,0);fork.rotation.z=-.3;tyre(g,.1,.07,.4,.1,0);const fl=sphere(g,.035,M('#fff6dc',.2),.36,.34,0,.5,1,1);box(g,.014,.014,.1,chr,.31,.37,0);
    [-1,1].forEach(z=>{tyre(g,.1,.07,-.18,.1,z*.19);box(g,.2,.025,.01,grn,.02,.24,z*.172);});
    box(g,.36,.045,.004,blk,.02,.31,.173);box(g,.36,.045,.004,blk,.02,.31,-.173);},
  eyo(g){
    const wh=M('#f7f5ef',.95),sh=M('#ece8de',.95),dark=M('#2a1d16',.8);
    lathe(g,[[0,0],[.2,0],[.215,.06],[.19,.3],[.15,.52],[.11,.62],[.09,.66],[0,.66]],wh,0,0,0,32);
    [-1,1].forEach(sd=>{const sl=new T.Mesh(new T.CylinderGeometry(.04,.085,.34,12),sh);sl.position.set(sd*.2,.5,.03);sl.rotation.z=sd*.7;sl.rotation.x=-.2;sl.castShadow=true;g.add(sl);});
    sphere(g,.075,wh,0,.74,0,1,1.15,1);lathe(g,[[0,0],[.15,0],[.15,.012],[.1,.03],[.075,.1],[.082,.2],[0,.2]],M('#1c1c20',.7),0,.78,0,28);
    box(g,.09,.012,.012,M('#2f7d46',.5),0,.9,.075);
    const staff=cyl(g,.01,.01,.82,M('#7a4a28',.8),.27,.4,.1,8);const kn=sphere(g,.022,M('#c9a227',.4,.6),.27,.82,.1);
    for(let i=0;i<6;i++){const a=i/6*6.28;box(g,.006,.1,.006,M('#f7f5ef',.9),.27+Math.cos(a)*.03,.76,.1+Math.sin(a)*.03);}
    lathe(g,[[0,0],[.23,0],[.24,.015],[0,.015]],M('#e8e4d6',.8),0,0,0,28);},
  towers(g){
    const win=(c1,c2)=>decal(128,256,(c,w,h)=>{c.fillStyle=c1;c.fillRect(0,0,w,h);c.fillStyle=c2;for(let y=8;y<h;y+=16)for(let x=6;x<w;x+=14)c.fillRect(x,y,8,9);});
    const tw=(x,z,w,h,d,a,b)=>{const t=win(a,b);t.wrapS=T.RepeatWrapping;const m=new T.MeshStandardMaterial({map:t,roughness:.3,metalness:.3});const mesh=new T.Mesh(new T.BoxGeometry(w,h,d),m);mesh.position.set(x,h/2,z);mesh.castShadow=true;g.add(mesh);box(g,w+.01,.012,d+.01,M('#dfe6ee',.4),x,h+.006,z);};
    tw(-.17,-.05,.12,.78,.12,'#2d4d7a','#bfe0ff');tw(.04,.05,.14,.98,.14,'#1f3a5e','#a8d4ff');tw(.2,-.03,.11,.6,.11,'#3b6e9a','#d8efff');tw(-.05,-.14,.1,.46,.1,'#48627f','#cfe4f7');
    lathe(g,[[0,0],[.15,0],[.15,.1],[.12,.13],[.07,.16],[0,.17]],M('#d8d3c6',.7),-.1,.0,.2,32);lathe(g,[[0,0],[.1,0],[.1,.04],[0,.04]],M('#9a958a',.7),-.1,.17,.2,28);
    box(g,.6,.018,.5,M('#7fc0d8',.2,.2),0,.009,.04);},
  pot(g){
    const clay=decal(256,128,(c,w,h)=>{c.fillStyle='#b9552b';c.fillRect(0,0,w,h);c.strokeStyle='#4a1d10';c.lineWidth=3;for(let i=0;i<4;i++){c.beginPath();c.moveTo(0,22+i*5);c.lineTo(w,22+i*5);c.stroke();}c.fillStyle='#4a1d10';for(let x=0;x<w;x+=16){c.beginPath();c.moveTo(x,60);c.lineTo(x+8,84);c.lineTo(x+16,60);c.closePath();c.fill();}for(let x=0;x<w;x+=16){c.fillRect(x+4,92,8,8);}});
    const cm=new T.MeshStandardMaterial({map:clay,roughness:.85});
    lathe(g,[[0,0],[.1,0],[.17,.05],[.23,.17],[.24,.26],[.2,.36],[.12,.43],[.13,.5],[.15,.53],[.14,.545],[.105,.52],[0,.5]],cm,0,0,0,36);
    lathe(g,[[0,0],[.06,0],[.11,.04],[.12,.1],[.08,.16],[.05,.18],[.06,.2],[.045,.21],[0,.19]],cm,.34,0,.2,28);
    const cal=new T.Mesh(new T.SphereGeometry(.12,22,16),M('#cf9a2c',.55));cal.scale.set(1,.8,1);cal.position.set(-.3,.1,.16);cal.castShadow=true;g.add(cal);lathe(g,[[0,0],[.03,0],[.045,.08],[.03,.12],[0,.12]],M('#cf9a2c',.55),-.3,.17,.16,16);
    lathe(g,[[.13,0],[.145,0],[.15,.06],[.135,.06]],M('#7a4a28',.8),-.3,.0,.16,24);},
  mask(g){
    const wd=decal(128,256,(c,w,h)=>{const gr=c.createLinearGradient(0,0,w,0);gr.addColorStop(0,'#4a2a14');gr.addColorStop(.5,'#8a5a2c');gr.addColorStop(1,'#4a2a14');c.fillStyle=gr;c.fillRect(0,0,w,h);c.strokeStyle='rgba(0,0,0,.3)';c.lineWidth=1;for(let y=0;y<h;y+=5){c.beginPath();c.moveTo(0,y);c.bezierCurveTo(w*.3,y+3,w*.6,y-3,w,y);c.stroke();}
      c.fillStyle='#e8dcc0';c.fillRect(0,0,w,0);c.strokeStyle='#e8dcc0';c.lineWidth=3;for(let i=0;i<3;i++){c.beginPath();c.moveTo(28,106+i*8);c.lineTo(38,100+i*8);c.moveTo(w-28,106+i*8);c.lineTo(w-38,100+i*8);c.stroke();}});
    const wm=new T.MeshStandardMaterial({map:wd,roughness:.7});const face=new T.Mesh(new T.SphereGeometry(.12,24,18),wm);face.scale.set(.8,1.35,.55);face.position.set(0,.36,0);face.castShadow=true;g.add(face);
    const wood=M('#6b3f1d',.7),dk=M('#15100c',.8),bone=M('#efe6cf',.6);
    box(g,.03,.12,.04,wood,0,.37,.075);[-1,1].forEach(s=>{const e=new T.Mesh(new T.SphereGeometry(.026,12,8),dk);e.scale.set(1.4,.55,.5);e.position.set(s*.05,.43,.067);g.add(e);const b=box(g,.07,.01,.02,wood,s*.052,.46,.07);b.rotation.z=s*-.2;});
    box(g,.07,.02,.02,M('#8a1f1a',.6),0,.28,.07);box(g,.05,.008,.015,dk,0,.285,.078);
    lathe(g,[[0,0],[.1,0],[.1,.03],[.07,.05],[.06,.11],[.085,.18],[.075,.28],[0,.3]],wood,0,.52,-.01,24);
    for(let i=0;i<5;i++)box(g,.012,.07,.012,bone,-.06+i*.03,.83,-.01);sphere(g,.03,M('#b3203a',.6),0,.86,-.01);
    lathe(g,[[0,0],[.07,0],[.08,.03],[.05,.07],[0,.07]],wood,0,.16,0,18);cyl(g,.03,.05,.1,wood,0,.1,0,14);},
  agbada(g){
    const emb=decal(256,256,(c,w,h)=>{c.fillStyle='#2250a5';c.fillRect(0,0,w,h);c.strokeStyle='#e5c15a';c.lineWidth=3;for(let y=20;y<h;y+=42){c.beginPath();for(let x=0;x<=w;x+=16)c.lineTo(x,y+((x/16)%2?8:-8));c.stroke();}c.fillStyle='#e5c15a';for(let x=24;x<w;x+=48)for(let y=40;y<h;y+=84){c.beginPath();c.arc(x,y,5,0,7);c.fill();}c.fillStyle='#e5c15a';c.fillRect(w/2-14,0,28,h);});
    const rm=new T.MeshStandardMaterial({map:emb,roughness:.8,side:T.DoubleSide});
    cyl(g,.02,.02,.9,M('#2a2a2e',.5,.5),0,.45,0,10);lathe(g,[[0,0],[.16,0],[.16,.02],[0,.02]],M('#2a2a2e',.5,.5),0,0,0,24);
    lathe(g,[[0,.12],[.12,.12],[.2,.28],[.24,.5],[.16,.78],[.08,.88],[.06,.9],[0,.9]],M('#f4efe2',.9),0,0,0,28);
    lathe(g,[[.06,.9],[.12,.88],[.26,.68],[.3,.36],[.3,.3],[.2,.3],[.22,.5],[.1,.8],[.06,.84]],rm,0,0,0,28);
    [-1,1].forEach(s=>{const sl=new T.Mesh(new T.CylinderGeometry(.05,.11,.5,14,1,true),rm);sl.position.set(s*.22,.62,0);sl.rotation.z=s*.9;g.add(sl);});
    sphere(g,.065,M('#6b4430',.7),0,1.0,0,1,1.15,1);lathe(g,[[0,0],[.075,0],[.08,.04],[.07,.1],[.06,.13],[0,.13]],M('#2250a5',.8),0,.99,0,24);},
  };})();

/* ----- wall instruments ----- */
const INSTR={
  guitar(g){const wood=M('#b9672d',.55),dk=M('#2a1a10',.6);
    const body=cyl(g,.2,.2,.1,wood,0,-.22,0,28);body.rotation.x=PI/2;const body2=cyl(g,.15,.15,.1,wood,0,.0,0,28);body2.rotation.x=PI/2;box(g,.3,.2,.1,wood,0,-.1,0);
    const hole=cyl(g,.06,.06,.105,dk,0,-.15,0,20);hole.rotation.x=PI/2;box(g,.07,.62,.04,dk,0,.43,0);box(g,.1,.16,.035,dk,0,.78,0);box(g,.012,.8,.01,M('#e8e4d8',.4),0,.42,.03);box(g,.2,.02,.03,dk,0,-.3,.06);},
  drum(g){const sk=M('#e8cf9a',.8),wd=M('#8a4a22',.6);const t=cyl(g,.18,.05,.3,wd,0,.15,0,20),b=cyl(g,.05,.18,.3,wd,0,-.15,0,20);t.rotation.x=PI/2*0;cyl(g,.185,.185,.03,sk,0,.31,0);cyl(g,.185,.185,.03,sk,0,-.31,0);
    for(let i=0;i<8;i++){const a=i/8*6.28;const c=box(g,.012,.62,.012,M('#c9a227',.5),Math.cos(a)*.115,0,Math.sin(a)*.115);}
    const stick=cyl(g,.014,.014,.3,wd,.28,-.05,0,8);stick.rotation.z=.9;const hd=new T.Mesh(new T.SphereGeometry(.035,10,8),wd);hd.position.set(.38,.07,0);g.add(hd);},
  shekere(g){const c=new T.Mesh(new T.SphereGeometry(.2,20,16),M('#c98a2b',.6));c.scale.set(1,1.1,1);c.position.y=-.1;g.add(c);cyl(g,.05,.07,.22,M('#c98a2b',.6),0,.14,0);
    for(let i=0;i<5;i++)for(let j=0;j<10;j++){const a=j/10*6.28+(i%2)*.3,y=-.22+i*.075,r=.19*Math.sin(.4+i*.5);const bd=new T.Mesh(new T.SphereGeometry(.014,6,6),M(i%2?'#f6f4ee':'#b3203a',.4));bd.position.set(Math.cos(a)*(r+.02),y,Math.sin(a)*(r+.02));g.add(bd);}},
  djembe(g){const wd=M('#8a4f24',.65),sk=M('#efe0bd',.85),rp=M('#c9a227',.5);const l=new T.Mesh(new T.LatheGeometry([[0,-.3],[.07,-.3],[.09,-.22],[.07,-.08],[.1,.04],[.16,.16],[.19,.26],[.2,.3],[0,.3]].map(q=>new T.Vector2(q[0],q[1])),28),wd);l.castShadow=true;g.add(l);
    cyl(g,.205,.205,.025,sk,0,.31,0,28);for(let i=0;i<10;i++){const a=i/10*6.28;box(g,.008,.2,.008,rp,Math.cos(a)*.2,.2,Math.sin(a)*.2);}cyl(g,.2,.2,.014,rp,0,.29,0,28);cyl(g,.1,.1,.012,rp,0,-.18,0,20);},
  udu(g){const clay=M('#a8482a',.85);const l=new T.Mesh(new T.LatheGeometry([[0,-.2],[.12,-.2],[.2,-.1],[.22,.02],[.18,.14],[.09,.2],[.07,.27],[.08,.3],[.055,.3],[.05,.26],[0,.2]].map(q=>new T.Vector2(q[0],q[1])),28),clay);l.castShadow=true;g.add(l);
    const h=cyl(g,.07,.07,.02,M('#2a120a',.9),.2,0,0,20);h.rotation.z=PI/2;const h2=cyl(g,.085,.085,.01,M('#6b2a14',.9),.205,0,0,20);h2.rotation.z=PI/2;},
  agogo(g){const mt=M('#c9a227',.3,.85);[[-.09,.05],[.09,-.03]].forEach(([x,y],i)=>{const c=new T.Mesh(new T.ConeGeometry(i?.07:.085,i?.28:.34,18,1,true),new T.MeshStandardMaterial({color:'#c9a227',roughness:.3,metalness:.85,side:T.DoubleSide}));c.position.set(x,y+.05,0);c.castShadow=true;g.add(c);cyl(g,.01,.01,.06,mt,x,y-.14,0,8);});
    box(g,.2,.014,.014,mt,0,-.18,0);const st=cyl(g,.012,.012,.3,M('#5a3a22',.7),.28,.0,.04,8);st.rotation.z=.5;},
  flute(g){const bm=M('#d9b86a',.55),dk=M('#6b4a1e',.7);const t=cyl(g,.022,.022,.7,bm,0,0,0,14);t.rotation.z=PI/2*0;for(let i=0;i<4;i++)box(g,.006,.03,.006,dk,0,-.2+i*.1,.022);
    for(let i=0;i<6;i++){const h=cyl(g,.007,.007,.004,dk,0,-.25+i*.07,.022,10);h.rotation.x=PI/2;}[-.34,.34].forEach(y=>cyl(g,.026,.026,.02,dk,0,y,0,14));cyl(g,.01,.01,.008,M('#111'),0,.22,.022,10);},
  kalimba(g){const wd=M('#5a3a22',.7);box(g,.26,.34,.05,wd,0,0,0);for(let i=0;i<9;i++){const k=box(g,.014,.2+(4-Math.abs(i-4))*.018,.01,M('#c8c8c8',.3,.8),-.1+i*.025,.06,.03);}box(g,.2,.014,.016,M('#999',.3,.7),0,-.02,.034);const h=cyl(g,.035,.035,.052,M('#111'),0,-.1,0);h.rotation.x=PI/2;}
};

/* ----- plain speaker column (the music comes from the room playlist) ----- */
function speaker(g,x,z,ry){const grp=new T.Group();grp.position.set(x,0,z);grp.rotation.y=ry;const bm=M('#16161a',.6);
  box(grp,.5,1.5,.4,bm,0,.75,0,true);[[1.1,.17],[.72,.12],[.42,.09]].forEach(([y,r])=>{const c=cyl(grp,r,r,.03,M('#2d2d34',.4,.3),0,y,.205,28);c.rotation.x=PI/2;const d=cyl(grp,r*.4,r*.4,.04,M('#0a0a0c',.5),0,y,.205,20);d.rotation.x=PI/2;});
  box(grp,.12,.012,.012,glowM('#3ddc97',1.6),0,1.42,.202);g.add(grp);return grp;}

/* ----- LED track light: rail + heads aimed at a point ----- */
function track(g,x,len,z0,H,targets){
  box(g,.06,.04,len,M('#0d0d10',.5,.2),x,H-.02,z0);
  targets.forEach(t=>{const h=new T.Group();h.position.set(x,H-.07,t.z);const stem=cyl(h,.012,.012,.1,M('#0d0d10'),0,0,0,6);const can=cyl(h,.045,.06,.15,M('#111114',.4,.3),0,-.1,0,14);
    const lens=cyl(h,.04,.04,.012,glowM('#fff6dc',2.2),0,-.18,0,14);const aim=new T.Vector3(t.tx-x,t.ty-(H-.17),t.tz-t.z);h.lookAt(h.position.clone().add(new T.Vector3(aim.x,aim.y,aim.z)));h.rotateX(-PI/2);h.updateMatrix();g.add(h);});}

P._galleryBuild=function(g){
  const G=OW.GALLERY,W=this.W,D=this.D,H=this.H,fl=new T.Mesh(new T.PlaneGeometry(W,D),new T.MeshStandardMaterial({map:marble(W,D),roughness:.2,metalness:.1}));
  fl.rotation.x=-PI/2;fl.position.y=.004;fl.receiveShadow=true;fl.userData.own=1;g.add(fl);
  /* soft floor reflection of the room: a faint lighter sheen strip under each wall */
  const trim=M('#d9d7d0',.5);[[-D/2+.03,0],[D/2-.03,0]].forEach(([z])=>box(g,W,.09,.04,trim,0,.045,z));[-W/2+.03,W/2-.03].forEach(x=>box(g,.04,.09,D,trim,x,.045,0));
  const fm=M('#16161a',.45),gold=M('#c8a24a',.35,.7);
  /* back wall: three large works */
  [['adire',-2.4,.62*0+2.0],['aso',0,2.0],['gele',2.4,2.0]].forEach(([k,x,y])=>frame(g,k,x,y,-D/2+.01,0,1.5,1.85,fm));
  /* left wall (faces +x) and right wall (faces -x): rows of works and instruments */
  const L=[['dkoi',-4.6],['ankara',-2.0],['danfo',2.4],['drum',4.8]],R=[['sunset',-4.6],['city',-2.0],['mountains',2.4],['aso',4.8]];
  L.forEach(([k,z])=>frame(g,k,-W/2+.01,2.0,z,PI/2,1.0,1.3,fm));R.forEach(([k,z])=>frame(g,k,W/2-.01,2.0,z,-PI/2,1.0,1.3,fm));
  const inst=(kind,wall,z,y,s)=>{const grp=new T.Group();INSTR[kind](grp);grp.scale.setScalar((s||1)*.95);const side=wall<0?1:-1;grp.position.set(wall*(W/2-.12),y,z);grp.rotation.y=side>0?PI/2:-PI/2;
    const back=box(g,.04,1.5,.62,M('#ddd9cf',.9),wall*(W/2-.03),y+.25,z,false);g.add(grp);grp.userData.instr=kind;(this.instruments=this.instruments||[]).push({kind,x:grp.position.x,y,z,wall:side>0?'left':'right',node:grp});return grp;};
  this.instruments=[];
  inst('guitar',-1,-3.3,1.75,1);inst('drum',-1,-1.0,1.75,1);inst('djembe',-1,.2,1.75,1);inst('agogo',-1,1.4,1.75,1);inst('shekere',1,-3.3,1.75,1);inst('kalimba',1,-1.0,1.75,1);inst('udu',1,.2,1.75,1);inst('flute',1,1.4,1.75,1);
  /* pillars (plinths) of different heights, each carrying something from Lagos or Nigeria */
  const pw=M('#fbfaf7',.55),cap=M('#e6e3dc',.5);
  const PL=[['danfo',-1.7,-3.6,1.05,1.0,.62,.85],['keke',1.8,-3.1,.95,.8,.56,1.05],['eyo',-1.9,-.8,.9,.58,.58,1],['towers',1.9,.3,1.0,.86,.62,1],['pot',-1.6,2.3,.85,.72,.6,1.25],['mask',1.6,3.1,1.0,.52,.52,1.05],['agbada',0,-1.3,.8,.6,.6,.85]];
  PL.forEach(([k,x,z,h,w,d,sc])=>{box(g,w,h,d,pw,x,h/2,z,true);box(g,w+.06,.04,d+.06,cap,x,h+.02,z);box(g,w+.03,.03,d+.03,M('#d9d7d0',.5),x,.015,z);const o=new T.Group();o.position.set(x,h+.04,z);OBJ[k](o);o.rotation.y=(x>0?-.55:.55);o.scale.setScalar(sc);g.add(o);
    box(g,.22,.05,.01,M('#2b2b30',.5),x,h-.14,z+d/2+.006);});
  /* speakers in the front corners */
  this.spots=this.instruments.map(i=>({kind:i.kind,label:'Pick up '+({guitar:'the guitar',drum:'the talking drum',shekere:'the shekere',kalimba:'the kalimba',djembe:'the djembe',udu:'the udu pot',agogo:'the agogo bells',flute:'the bamboo flute'})[i.kind],x:i.x,z:i.z,nx:i.wall==='left'?1:-1,nz:0,node:i.node,y:i.y}));
  [[-W/2+.45,D/2-.5,PI*.78],[W/2-.45,D/2-.5,-PI*.78]].forEach(([x,z,r])=>{const sp=speaker(g,x,z,r);this.spots.push({kind:'speaker',label:'Play music',x,z,nx:Math.sign(-x)*.6,nz:-.8,node:sp});});
  this._gxObjs=this.spots.map(sp=>{sp.node.userData.spot=sp;return sp.node;});
  /* ceiling: dark with LED tracks aimed at the art */
  const wallT=[-4.6,-2.0,2.4,4.8];
  track(g,-2.9,D-1,0,H,[-4.6,-2.0,.2,2.4,4.8].map(z=>({z,tx:-W/2,ty:2.0,tz:z})));track(g,2.9,D-1,0,H,[-4.6,-2.0,.2,2.4,4.8].map(z=>({z,tx:W/2,ty:2.0,tz:z})));
  track(g,0,W-3,-D/2+1.3,H,[]);
  box(g,W-3.4,.04,.06,M('#0d0d10',.5,.2),0,H-.02,-D/2+1.3);[-2.4,0,2.4].forEach(x=>{const h=new T.Group();h.position.set(x,H-.07,-D/2+1.3);cyl(h,.012,.012,.1,M('#0d0d10'),0,0,0,6);const c=cyl(h,.045,.06,.15,M('#111114',.4,.3),0,-.1,0,14);cyl(h,.04,.04,.012,glowM('#fff6dc',2.2),0,-.18,0,14);h.rotation.x=.55;h.position.z-=0;g.add(h);});
  /* a long soft LED strip along the base of the ceiling edges */
  [-1,1].forEach(s=>box(g,.03,.03,D-.2,glowM('#fff3d4',.9),s*(W/2-.08),H-.05,0));
  /* the verified plaque on the entrance wall */
  const pc=OW.canvas(512,128),px=pc.getContext('2d');px.fillStyle='#f7f6f2';px.fillRect(0,0,512,128);px.fillStyle='#14111f';px.font='700 46px system-ui,sans-serif';px.textBaseline='middle';px.fillText('OpenWalls Gallery',24,50);
  px.fillStyle='#6c4bff';px.beginPath();px.arc(458,50,28,0,7);px.fill();px.strokeStyle='#fff';px.lineWidth=7;px.lineCap='round';px.beginPath();px.moveTo(446,50);px.lineTo(455,60);px.lineTo(472,40);px.stroke();
  px.fillStyle='#6b6679';px.font='500 24px system-ui,sans-serif';px.fillText('Verified · curated by OpenWalls',24,100);
  const pl=new T.Mesh(new T.PlaneGeometry(1.6,.4),new T.MeshBasicMaterial({map:OW.tex(pc)}));pl.position.set(0,2.9,D/2-.02);pl.rotation.y=PI;g.add(pl);
  /* the lights that actually light the art (few, no shadows: kind to phones) */
  (this._gl||[]).forEach(l=>{this.scene.remove(l);if(l.target)this.scene.remove(l.target);});this._gl=[];
  [[-2.9,-3.4,-W/2,2.0,-3.4],[-2.9,1.2,-W/2,2.0,1.2],[2.9,-3.4,W/2,2.0,-3.4],[2.9,1.2,W/2,2.0,1.2],[0,-D/2+1.3,0,2.0,-D/2]].forEach(([x,z,tx,ty,tz])=>{const s=new T.SpotLight(0xfff1d6,.9,9,.62,.7,1.4);s.position.set(x,H-.2,z);s.target.position.set(tx,ty,tz);this.scene.add(s,s.target);this._gl.push(s);});
  /* walking collisions around plinths and speakers */
  this.colliders=PL.map(([k,x,z,h,w,d])=>({x,z,hw:Math.max(w,d)/2+.05})).concat([{x:-W/2+.45,z:D/2-.5,hw:.35},{x:W/2-.45,z:D/2-.5,hw:.35}]);
};

/* wrap the shell build: a house room swaps the cosy parts for the gallery */
const baseShell=P.buildShell;
P.buildShell=function(){
  const th=this.room.theme;if(!(th&&th.house)){this._house=false;return baseShell.call(this);}
  const G=OW.GALLERY;this.room.width=G.w;this.room.depth=G.d;this.room.height=G.h;this._house=true;
  const real=this.room.theme;this.room.theme=Object.assign({},real,{key:'gallery',hide:{window:1,door:1,light:1}});
  try{baseShell.call(this);}finally{this.room.theme=real;}
  this.hemi.intensity=.78;this.sun.intensity=.2;this.pend.intensity=.1;this.hemi.color.set(0xffffff);this.hemi.groundColor.set(0x9a9a9f);
  this._galleryBuild(this.shell);this.markDirty(true);
};
/* people can no longer walk through plinths and speakers */
const baseBlk=P.blockers;
P.blockers=function(){const l=baseBlk.call(this);if(!this._house||!this.colliders)return l;return l.concat(this.colliders.map(c=>({kind:'furniture',type:'__col',x:c.x,z:c.z,rot:0,scale:c.hw*2/.9})));};
const baseFurn=OW.furn;OW.furn=function(t){if(t==='__col')return{w:.9,d:.9,floor:false,surface:false};return baseFurn.apply(this,arguments);};
/* ---------- playing the instruments: pick one off the wall, your avatar holds it, pads make real sounds (heard on your phone only) ---------- */
let AC=null,master=null;
function audio(){if(!AC){const C=window.AudioContext||window.webkitAudioContext;if(!C)return null;AC=new C();master=AC.createGain();master.gain.value=.7;const cp=AC.createDynamicsCompressor();master.connect(cp);cp.connect(AC.destination);}if(AC.state==='suspended')AC.resume();return AC;}
const ksCache={};
function ksBuf(f){const k=Math.round(f);if(ksCache[k])return ksCache[k];const sr=AC.sampleRate,len=Math.floor(sr*1.9),N=Math.max(2,Math.round(sr/f)),b=AC.createBuffer(1,len,sr),d=b.getChannelData(0),ring=new Float32Array(N);
  for(let i=0;i<N;i++)ring[i]=Math.random()*2-1;let p=0;for(let i=0;i<len;i++){const n=(p+1)%N,v=(ring[p]+ring[n])*.5*.9965;ring[p]=v;d[i]=v*(1-i/len*.35);p=n;}return ksCache[k]=b;}
const CH={Am:[110,164.8,220,261.6,329.6,220],C:[130.8,164.8,196,261.6,329.6,392],G:[98,123.5,146.8,196,246.9,392],Em:[82.4,123.5,164.8,196,246.9,329.6]};
function strum(ch,up){const a=audio();if(!a)return;const fs=CH[ch]||CH.Am,t0=a.currentTime;(up?fs.slice().reverse():fs).forEach((f,i)=>{const s=a.createBufferSource();s.buffer=ksBuf(f);const g=a.createGain();g.gain.value=.34;s.connect(g);g.connect(master);s.start(t0+i*.032);});}
function drum(hi,glide){const a=audio();if(!a)return;const t=a.currentTime,o=a.createOscillator(),g=a.createGain(),f=hi?300:170;o.type='sine';o.frequency.setValueAtTime(f*(glide?.7:1),t);
  if(glide){o.frequency.linearRampToValueAtTime(f*1.5,t+.16);o.frequency.linearRampToValueAtTime(f*.9,t+.5);}else{o.frequency.exponentialRampToValueAtTime(f*.78,t+.35);}
  g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.9,t+.008);g.gain.exponentialRampToValueAtTime(.0001,t+(glide?.62:.42));o.connect(g);g.connect(master);o.start(t);o.stop(t+.7);
  const nb=a.createBuffer(1,Math.floor(a.sampleRate*.05),a.sampleRate),nd=nb.getChannelData(0);for(let i=0;i<nd.length;i++)nd[i]=(Math.random()*2-1)*(1-i/nd.length);const ns=a.createBufferSource();ns.buffer=nb;const nf=a.createBiquadFilter();nf.type='bandpass';nf.frequency.value=1800;const ng=a.createGain();ng.gain.value=.5;ns.connect(nf);nf.connect(ng);ng.connect(master);ns.start(t);}
function shake(n){const a=audio();if(!a)return;const t=a.currentTime;for(let i=0;i<(n||3);i++){const nb=a.createBuffer(1,Math.floor(a.sampleRate*.11),a.sampleRate),nd=nb.getChannelData(0);for(let k=0;k<nd.length;k++)nd[k]=(Math.random()*2-1)*Math.pow(1-k/nd.length,1.6);const s=a.createBufferSource();s.buffer=nb;const f=a.createBiquadFilter();f.type='bandpass';f.frequency.value=5200+i*500;f.Q.value=.9;const g=a.createGain();g.gain.value=.55;s.connect(f);f.connect(g);g.connect(master);s.start(t+i*.085);}}
const KAL=[523.3,587.3,659.3,784,880,1046.5,1174.7];
function kal(i){const a=audio();if(!a)return;const t=a.currentTime,f=KAL[i%KAL.length];[[1,.5,1.1],[4.02,.12,.35]].forEach(([m,v,dur])=>{const o=a.createOscillator(),g=a.createGain();o.type='sine';o.frequency.value=f*m;g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(v,t+.004);g.gain.exponentialRampToValueAtTime(.0001,t+dur);o.connect(g);g.connect(master);o.start(t);o.stop(t+dur+.05);});}

function bell(f){const a=audio();if(!a)return;const t=a.currentTime;[[1,.5,.7],[2.76,.28,.45],[5.4,.14,.25]].forEach(([m,v,d])=>{const o=a.createOscillator(),g=a.createGain();o.type='sine';o.frequency.value=f*m;g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(v,t+.003);g.gain.exponentialRampToValueAtTime(.0001,t+d);o.connect(g);g.connect(master);o.start(t);o.stop(t+d+.05);});}
function djem(kind){const a=audio();if(!a)return;const t=a.currentTime;if(kind==='bass'){drum(false);return;}
  const nb=a.createBuffer(1,Math.floor(a.sampleRate*.09),a.sampleRate),nd=nb.getChannelData(0);for(let i=0;i<nd.length;i++)nd[i]=(Math.random()*2-1)*Math.pow(1-i/nd.length,2);const s=a.createBufferSource();s.buffer=nb;const f=a.createBiquadFilter();f.type='bandpass';f.frequency.value=kind==='slap'?3200:1500;f.Q.value=1.2;const g=a.createGain();g.gain.value=.9;s.connect(f);f.connect(g);g.connect(master);s.start(t);
  const o=a.createOscillator(),og=a.createGain();o.frequency.setValueAtTime(kind==='slap'?420:260,t);o.frequency.exponentialRampToValueAtTime(180,t+.12);og.gain.setValueAtTime(.5,t);og.gain.exponentialRampToValueAtTime(.0001,t+.16);o.connect(og);og.connect(master);o.start(t);o.stop(t+.2);}
function udu(hole){const a=audio();if(!a)return;const t=a.currentTime,o=a.createOscillator(),g=a.createGain();o.type='sine';if(hole){o.frequency.setValueAtTime(190,t);o.frequency.exponentialRampToValueAtTime(70,t+.45);}else{o.frequency.setValueAtTime(260,t);o.frequency.exponentialRampToValueAtTime(210,t+.2);}
  g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.85,t+.01);g.gain.exponentialRampToValueAtTime(.0001,t+(hole?.7:.3));o.connect(g);g.connect(master);o.start(t);o.stop(t+.8);}
const FL=[392,440,523.3,587.3,659.3,784];
function flute(i){const a=audio();if(!a)return;const t=a.currentTime,f=FL[i%FL.length],o=a.createOscillator(),g=a.createGain(),lf=a.createOscillator(),lg=a.createGain();o.type='sine';o.frequency.value=f;lf.frequency.value=5.2;lg.gain.value=f*.007;lf.connect(lg);lg.connect(o.frequency);
  g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(.42,t+.07);g.gain.setValueAtTime(.4,t+.5);g.gain.linearRampToValueAtTime(.0001,t+.85);o.connect(g);g.connect(master);o.start(t);lf.start(t);o.stop(t+.9);lf.stop(t+.9);
  const nb=a.createBuffer(1,Math.floor(a.sampleRate*.85),a.sampleRate),nd=nb.getChannelData(0);for(let k=0;k<nd.length;k++)nd[k]=(Math.random()*2-1);const ns=a.createBufferSource();ns.buffer=nb;const nf=a.createBiquadFilter();nf.type='bandpass';nf.frequency.value=f*2;nf.Q.value=4;const ng=a.createGain();ng.gain.setValueAtTime(.0001,t);ng.gain.linearRampToValueAtTime(.06,t+.07);ng.gain.linearRampToValueAtTime(.0001,t+.85);ns.connect(nf);nf.connect(ng);ng.connect(master);ns.start(t);}

function css(){if(document.getElementById('gx-css'))return;const st=document.createElement('style');st.id='gx-css';st.textContent=
'.gx-pl{position:absolute;left:0;right:0;bottom:calc(92px + var(--sab,0px));z-index:6;display:flex;flex-direction:column;align-items:center;gap:8px;pointer-events:none}.gx-pl *{pointer-events:auto}'+
'.gx-t{background:rgba(20,17,31,.82);color:#fff;border-radius:99px;padding:6px 14px;font:700 13px var(--disp,system-ui);backdrop-filter:blur(6px)}'+
'.gx-pads{display:flex;gap:8px;flex-wrap:wrap;justify-content:center;max-width:94vw}.gx-pad{min-width:62px;min-height:62px;border:2px solid rgba(255,255,255,.85);border-radius:18px;background:rgba(108,75,255,.88);color:#fff;font:800 15px var(--disp,system-ui);touch-action:manipulation;user-select:none;-webkit-user-select:none}'+
'.gx-pad:active{transform:scale(.94);background:#ff5a3c}.gx-pad.big{min-width:140px}.gx-pad.k{min-width:44px;min-height:92px;border-radius:12px;font-size:12px}';document.head.append(st);}
const LAB={djembe:'Djembe',udu:'Udu clay pot drum',agogo:'Agogo bells',flute:'Bamboo flute',guitar:'Guitar · tap a chord to strum',drum:'Talking drum',shekere:'Shekere',kalimba:'Kalimba'};
P.gxUi=function(kind){
  this.gxUiOff();css();const wrap=document.createElement('div');wrap.className='gx-pl';const pads=document.createElement('div');pads.className='gx-pads';
  const add=(txt,fn,cls)=>{const b=document.createElement('button');b.className='gx-pad'+(cls?' '+cls:'');b.textContent=txt;const go=e=>{e.preventDefault();fn();const m=this.me;if(m)m.av.act();this.markDirty(true);};b.addEventListener('pointerdown',go);pads.append(b);};
  if(kind==='guitar'){Object.keys(CH).forEach(c=>add(c,()=>strum(c)));add('↑ Up',()=>strum('Am',true));}
  else if(kind==='drum'){add('High',()=>drum(true),'big');add('Low',()=>drum(false),'big');add('Talk',()=>drum(true,true),'big');}
  else if(kind==='djembe'){add('Bass',()=>djem('bass'),'big');add('Tone',()=>djem('tone'),'big');add('Slap',()=>djem('slap'),'big');}
  else if(kind==='udu'){add('Hit',()=>udu(false),'big');add('Hole',()=>udu(true),'big');}
  else if(kind==='agogo'){add('Low bell',()=>bell(520),'big');add('High bell',()=>bell(780),'big');}
  else if(kind==='flute'){FL.forEach((f,i)=>add(String(i+1),()=>flute(i),'k'));}
  else if(kind==='shekere'){add('Shake',()=>shake(3),'big');add('Tap',()=>shake(1),'big');}
  else{KAL.forEach((f,i)=>add(String(i+1),()=>kal(i),'k'));}
  const t=document.createElement('div');t.className='gx-t';t.textContent=LAB[kind]+' · only you hear it';wrap.append(t,pads);this.host.append(wrap);this._gxEl=wrap;};
P.gxUiOff=function(){if(this._gxEl){this._gxEl.remove();this._gxEl=null;}};
/* hold position and orientation of each instrument relative to the avatar (facing +z) */
const HOLD={guitar:{p:[.02,.92,.3],r:[0,0,-1.25],s:.95,pose:'strum'},drum:{p:[.26,.84,.2],r:[0,0,1.25],s:.62,pose:'drum'},shekere:{p:[0,1.12,.3],r:[0,0,0],s:1.1,pose:'shake'},kalimba:{p:[0,.98,.3],r:[-.9,0,0],s:1.25,pose:'kali'},djembe:{p:[0,.62,.3],r:[0,0,0],s:1,pose:'pat'},udu:{p:[.15,.85,.28],r:[0,0,0],s:1,pose:'pat'},agogo:{p:[.22,.95,.3],r:[0,0,0],s:1.05,pose:'drum'},flute:{p:[0,1.38,.28],r:[0,0,1.5708],s:1,pose:'flute'}};
P.gxPlay=function(sp){
  const m=this.me;if(!m||this.seat)return;const H=HOLD[sp.kind];if(!H)return;
  m.x=sp.x+sp.nx*.8;m.z=sp.z+sp.nz*.8;const q=this.pushOut(m.x,m.z,.24,this.blockers());m.x=q[0];m.z=q[1];m.yaw=Math.atan2(sp.nx,sp.nz===0?0:sp.nz);if(sp.nz===0)m.yaw=sp.nx>0?PI/2:-PI/2;m.y=0;
  const g=new T.Group();INSTR[sp.kind](g);g.scale.setScalar(H.s);g.position.set(...H.p);g.rotation.set(...H.r);m.holder.add(g);this._held={g,sp};sp.node.visible=false;
  m.av.setPose(H.pose);m.pose=H.pose;this.seat={it:{id:'gx'},gx:true,front:[Math.sin(m.yaw),Math.cos(m.yaw)],d:.2};this.goal=null;this.placeFigure(m);this.setNear(null);this.nearId='';
  this.cb.onNear&&this.cb.onNear({act:{k:'stand',label:'Put back'}});this.gxUi(sp.kind);this.markDirty(true);};
P.gxStop=function(){
  const m=this.me,h=this._held;this.gxUiOff();if(h){h.sp.node.visible=true;if(m)m.holder.remove(h.g);h.g.traverse(o=>{if(o.geometry)o.geometry.dispose();});this._held=null;}
  if(m&&this.seat&&this.seat.gx){m.av.setPose('stand');m.pose='stand';}if(this.seat&&this.seat.gx)this.seat=null;this.nearId='x';this.setNear(null);this.markDirty(true);};
const baseStand=P.standUp;P.standUp=function(){if(this.seat&&this.seat.gx)return this.gxStop();return baseStand.call(this);};
const baseStop=P.stopWalk;P.stopWalk=function(){if(this._held)this.gxStop();return baseStop.apply(this,arguments);};
const baseDestroy=P.destroy;if(baseDestroy)P.destroy=function(){this.gxUiOff();return baseDestroy.apply(this,arguments);};
/* near an instrument or speaker the usual action button appears */
const baseNear=P.nearest;P.nearest=function(){
  if(!this._house||!this.me||!this.spots)return baseNear.call(this);
  const m=this.me;let best=null,bd=1.7;this.spots.forEach(sp=>{if(sp.kind!=='speaker'&&this._held&&this._held.sp===sp)return;const d=Math.hypot(m.x-sp.x,m.z-sp.z);if(d<bd){bd=d;best=sp;}});
  return best?{it:{id:'gx:'+best.kind+best.x+best.z,kind:'gx',spot:best},act:{k:'gx',label:best.label}}:baseNear.call(this);};
const baseOf=P.interactOf;P.interactOf=function(it){if(it&&it.kind==='gx')return{k:'gx',label:it.spot.label};return baseOf.call(this,it);};
const baseInter=P.interact;P.interact=function(it,k){
  if(it&&it.kind==='gx'){const sp=it.spot;if(sp.kind==='speaker'){this.cb.onOpen&&this.cb.onOpen({type:'speaker',kind:'furniture',id:'house-speaker',link:'',title:'OpenWalls Gallery speaker'});return;}return this.gxPlay(sp);}
  return baseInter.call(this,it,k);};
/* tapping an instrument or speaker walks you to it and uses it */
const baseTap=P.walkTap;P.walkTap=function(it,e){
  if(this._house&&this.me&&!this.seat&&this._gxObjs){this.ray.setFromCamera(this.ndc(e),this.cam);const live=this._gxObjs.filter(o=>o.visible);const hit=this.ray.intersectObjects(live,true)[0];
    if(hit){let o=hit.object;while(o&&!o.userData.spot)o=o.parent;if(o){const sp=o.userData.spot,m=this.me,tx=sp.x+sp.nx*.8,tz=sp.z+sp.nz*.8,q=this.pushOut(tx,tz,.24,this.blockers());
      this.goal={x:q[0],z:q[1],t:0,stuck:0,lx:m.x,lz:m.z,then:{it:{id:'gx',kind:'gx',spot:sp},k:'gx'}};this.showMark(q[0],q[1]);return;}}}
  return baseTap.call(this,it,e);};
})();
