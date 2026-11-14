/* ---------- OWA: avatar catalogue ----------
 * Everything here is free (no shop, no money). Only options the loaded GLB models can really do are listed.
 * Facial SHAPE (nose/jaw/lips), muscle definition and extra hairstyles/garments are NOT in the supplied GLB,
 * so they are not offered: see docs/AVATARS.md for the capability report and how extra assets plug in. */
const OWA=window.OWA={};
OWA.BASE='assets/avatars/';
/* models: f = the supplied rigged GLB. m = the supplied male rigged GLB (assets/avatars/male.glb). */
OWA.MODELS={
  f:{url:OWA.BASE+'female.glb',height:1.68,label:'Woman',proxy:false},
  m:{url:OWA.BASE+'male.glb',height:1.80,label:'Man',proxy:false}
};
OWA.SKIN=['#f6dcc8','#f1cfb4','#e8bd9b','#deac85','#d29b72','#c58a60','#b97b52','#a96d45','#9a5f3b','#8c5233','#7d462b','#6f3c25','#62331f','#552b1a','#472315','#3a1c11'];
OWA.HAIRC=['#14100e','#2a1b14','#4a2c1d','#7b4a2a','#a8672b','#c9a469','#e8d9b0','#8f3a1f','#b0102a','#9a9a9a','#e58bb5','#6b2d8f','#3b6fe0','#2f9e6a'];
OWA.EYEC=['#2b1a10','#4a2c1d','#7a5230','#6b7f3a','#3f6fb5','#7d8791','#1a1a1a'];
OWA.COLORS=['#f4f1ea','#14100e','#3b3f46','#9a9a9a','#14284b','#2d5bd8','#6cabdd','#2f9e6a','#1f5a3a','#f2c230','#e98a2b','#d63a2f','#a01d2e','#e58bb5','#6b2d8f','#b58a5c','#d9c2a0','#7a8f5a'];
/* hairstyles actually present: the model's own short style, or none. Extra styles come from assets/avatars/catalog.json */
OWA.HAIR=[['short','Short bob'],['none','No hair']];
/* club colours (colours only: tints the supplied top and bottom; no crests, sponsors or shirt patterns) */
OWA.CLUBS={
  chelsea:{n:'Chelsea',b:'#034694',sh:'#ffffff',k:'#034694'},
  arsenal:{n:'Arsenal',b:'#e8171f',sh:'#ffffff',k:'#e8171f'},
  manutd:{n:'Manchester United',b:'#da291c',sh:'#14100e',k:'#14100e'},
  liverpool:{n:'Liverpool',b:'#c8102e',sh:'#c8102e',k:'#c8102e'},
  mancity:{n:'Manchester City',b:'#6cabdd',sh:'#ffffff',k:'#6cabdd'},
  barca:{n:'Barcelona',b:'#a50044',sh:'#004d98',k:'#a50044'},
  madrid:{n:'Real Madrid',b:'#ffffff',sh:'#ffffff',k:'#ffffff'}
};
/* face expressions = real morph targets on the head (ARKit blendshape names present in the GLB) */
OWA.EYEFIX={m:-.1,f:0}; // eye-bone pitch (rad) that centres the pupils for each base model
OWA.EXPR=[
  ['neutral','Neutral',{}],
  ['smile','Smile',{mouthSmileLeft:.7,mouthSmileRight:.7,cheekSquintLeft:.35,cheekSquintRight:.35}],
  ['grin','Big smile',{mouthSmileLeft:1,mouthSmileRight:1,jawOpen:.25,cheekSquintLeft:.6,cheekSquintRight:.6,eyeSquintLeft:.3,eyeSquintRight:.3}],
  ['surprised','Surprised',{eyeWideLeft:.9,eyeWideRight:.9,browInnerUp:.8,browOuterUpLeft:.7,browOuterUpRight:.7,jawOpen:.45}],
  ['wink','Wink',{eyeBlinkLeft:1,mouthSmileLeft:.6,mouthSmileRight:.4,cheekSquintLeft:.4}],
  ['sad','Sad',{mouthFrownLeft:.7,mouthFrownRight:.7,browInnerUp:.7,mouthPucker:.1}],
  ['angry','Angry',{browDownLeft:.9,browDownRight:.9,noseSneerLeft:.5,noseSneerRight:.5,mouthPressLeft:.5,mouthPressRight:.5}],
  ['kiss','Kiss',{mouthPucker:.9,mouthFunnel:.3}]
];
/* free-form face sliders (each is one real morph target; value 0..1) */
OWA.FACEMORPH=[
  ['jawOpen','Mouth open'],['mouthSmileLeft','Smile (left)'],['mouthSmileRight','Smile (right)'],['browInnerUp','Brows up'],
  ['eyeWideLeft','Eye wide (left)'],['eyeWideRight','Eye wide (right)'],['eyeSquintLeft','Squint (left)'],['eyeSquintRight','Squint (right)'],
  ['cheekPuff','Cheek puff'],['mouthPucker','Pucker'],['noseSneerLeft','Nose sneer']
];
/* body proportion sliders: bone-driven (-1..1). key, label, low label, high label */
OWA.BODYSL=[
  ['h','Height','Short','Tall'],['sh','Shoulder width','Narrow','Broad'],['chest','Chest depth','Slim','Full'],['waist','Waist','Slim','Wide'],
  ['hips','Hip width','Narrow','Wide'],['arms','Arm length','Short','Long'],['legs','Leg length','Short','Long'],['neck','Neck length','Short','Long'],
  ['hd','Head size','Small','Large'],['hands','Hand size','Small','Large'],['feet','Foot size','Small','Large']
];
/* looks = colour combinations for the supplied top / bottom / shoes */
OWA.LOOKS=[
  {n:'Original',p:{topc:null,botc:null,shoec:null}},
  {n:'Midnight',p:{topc:'#14284b',botc:'#14100e',shoec:'#f4f1ea'}},
  {n:'Sunset',p:{topc:'#e98a2b',botc:'#6b2d8f',shoec:'#14100e'}},
  {n:'Forest',p:{topc:'#1f5a3a',botc:'#d9c2a0',shoec:'#14100e'}},
  {n:'Rose',p:{topc:'#e58bb5',botc:'#3b3f46',shoec:'#f4f1ea'}},
  {n:'Mono',p:{topc:'#f4f1ea',botc:'#14100e',shoec:'#9a9a9a'}},
  {n:'Gold',p:{topc:'#f2c230',botc:'#14100e',shoec:'#14100e'}},
  {n:'Ocean',p:{topc:'#6cabdd',botc:'#14284b',shoec:'#f4f1ea'}}
];
OWA.def=function(g){
  g=g==='m'?'m':'f';
  return {v:2,g,skin:g==='f'?5:6,hc:0,eyec:1,hair:'short',glasses:true,glc:null,topc:null,botc:null,shoec:null,hatc:null,bare:false,
    h:0,sh:0,chest:0,waist:0,hips:0,arms:0,legs:0,neck:0,hd:0,hands:0,feet:0,ex:'neutral',mx:{},extras:g==='m'?{hair:'buzz'}:{}};
};
OWA.pick=(arr,id)=>arr.find(x=>x.id===id)||arr[0];
/* old saved procedural avatars: keep their gender, skin and hair colour; everything else resets */
OWA.migrate=function(c){const d=OWA.def(c&&c.g==='m'?'m':'f');if(!c)return d;
  if(c.v===2){const o=Object.assign(d,c,{mx:Object.assign({},c.mx),extras:Object.assign({},c.extras)});const ok={hair:['buzz','afro','bun','long'],top:['sweater'],bottom:['shorts'],hat:['beanie']};for(const k in o.extras)if(ok[k]&&!ok[k].includes(o.extras[k]))delete o.extras[k];o.bare=false;return o;}
  if(typeof c.skin==='number')d.skin=Math.max(0,Math.min(OWA.SKIN.length-1,c.skin));
  if(typeof c.hc==='number')d.hc=Math.max(0,Math.min(OWA.HAIRC.length-1,c.hc));
  if(typeof c.eyec==='number')d.eyec=Math.max(0,Math.min(OWA.EYEC.length-1,c.eyec));
  if(c.hair==='bald')d.hair='none';
  return d;};
OWA.random=function(g){
  const r=a=>a[Math.floor(Math.random()*a.length)];g=g||r(['f','m']);const c=OWA.def(g);
  c.skin=3+Math.floor(Math.random()*13);c.hc=Math.random()<.7?Math.floor(Math.random()*3):Math.floor(Math.random()*OWA.HAIRC.length);c.eyec=Math.floor(Math.random()*OWA.EYEC.length);
  Object.assign(c,r(OWA.LOOKS).p);c.ex='neutral';c.glasses=Math.random()<.5;
  for(const k of ['h','sh','chest','waist','hips','arms','legs'])c[k]=+(Math.random()*.8-.4).toFixed(2);
  return c;
};

/* ---------- original chest emblems (drawn in code, no real club crests or brands) ----------
   each draws inside the box -1..1 (y up) on a 2d canvas context */
OWA.EMB=[['bolt','Lightning'],['star','Star shield'],['crown','Crown'],['wave','Wave'],['flame','Flame'],['peak','Summit'],['heart','Heart'],['ball','Ball'],['moon','Night'],['ow','OpenWalls']];
OWA.drawEmblem=function(g,id){
  if(typeof id==='string'&&id.slice(0,2)==='c|'){const b=OWA.parseBadge(id);if(b)OWA.drawBadge(g,b);return;}
  const P=(pts,fill,stroke,lw)=>{g.beginPath();pts.forEach((q,i)=>i?g.lineTo(q[0],q[1]):g.moveTo(q[0],q[1]));g.closePath();if(fill){g.fillStyle=fill;g.fill();}if(stroke){g.strokeStyle=stroke;g.lineWidth=lw||.08;g.lineJoin='round';g.stroke();}};
  const C=(x,y,r,fill,stroke,lw)=>{g.beginPath();g.arc(x,y,r,0,Math.PI*2);if(fill){g.fillStyle=fill;g.fill();}if(stroke){g.strokeStyle=stroke;g.lineWidth=lw||.08;g.stroke();}};
  const shield=(fill,stroke)=>{g.beginPath();g.moveTo(-.8,.85);g.lineTo(.8,.85);g.lineTo(.8,.05);g.quadraticCurveTo(.8,-.6,0,-.95);g.quadraticCurveTo(-.8,-.6,-.8,.05);g.closePath();g.fillStyle=fill;g.fill();g.strokeStyle=stroke;g.lineWidth=.1;g.lineJoin='round';g.stroke();};
  g.save();
  if(id==='bolt'){C(0,0,.92,'#14284b','#f2c230',.1);P([[.12,.72],[-.42,-.06],[-.04,-.06],[-.16,-.72],[.44,.08],[.05,.08]],'#f2c230');}
  else if(id==='star'){shield('#5b3fd4','#ffffff');const st=[];for(let i=0;i<10;i++){const r=i%2?.2:.5,a=Math.PI/2+i*Math.PI/5;st.push([Math.cos(a)*r,Math.sin(a)*r+.1]);}P(st,'#ffffff');}
  else if(id==='crown'){C(0,0,.92,'#15151a','#d9a441',.1);P([[-.52,-.35],[-.56,.32],[-.24,.0],[0,.45],[.24,.0],[.56,.32],[.52,-.35]],'#d9a441');g.fillStyle='#b8832a';g.fillRect(-.52,-.5,1.04,.15);}
  else if(id==='wave'){C(0,0,.92,'#0f8f94','#ffffff',.1);g.strokeStyle='#ffffff';g.lineWidth=.12;g.lineCap='round';for(let k=-1;k<=1;k++){g.beginPath();for(let i=0;i<=20;i++){const x=-.55+i*.055;const y=k*.32+Math.sin(i*.6)*.1;i?g.lineTo(x,y):g.moveTo(x,y);}g.stroke();}}
  else if(id==='flame'){shield('#b3261e','#f4f1ea');g.beginPath();g.moveTo(0,.65);g.bezierCurveTo(.5,.1,.5,-.2,.32,-.45);g.bezierCurveTo(.2,-.7,-.2,-.7,-.32,-.45);g.bezierCurveTo(-.5,-.2,-.35,.05,-.1,.2);g.bezierCurveTo(-.1,.4,0,.5,0,.65);g.fillStyle='#ffb02e';g.fill();g.beginPath();g.moveTo(0,-.05);g.bezierCurveTo(.2,-.25,.18,-.45,0,-.52);g.bezierCurveTo(-.18,-.45,-.2,-.25,0,-.05);g.fillStyle='#fff3c4';g.fill();}
  else if(id==='peak'){P([[0,.95],[.9,-.7],[-.9,-.7]],'#1f6b45','#f4f1ea',.1);P([[0,.5],[.3,0],[.12,.04],[0,-.08],[-.12,.04],[-.3,0]],'#ffffff');}
  else if(id==='heart'){g.beginPath();g.moveTo(0,-.8);g.bezierCurveTo(-1.1,-.05,-.6,.8,0,.35);g.bezierCurveTo(.6,.8,1.1,-.05,0,-.8);g.fillStyle='#ff5a3c';g.fill();g.strokeStyle='#ffffff';g.lineWidth=.1;g.stroke();}
  else if(id==='ball'){C(0,0,.92,'#ffffff','#14161c',.1);const hx=[];for(let i=0;i<5;i++){const a=Math.PI/2+i*2*Math.PI/5;hx.push([Math.cos(a)*.3,Math.sin(a)*.3]);}P(hx,'#14161c');for(let i=0;i<5;i++){const a=Math.PI/2+i*2*Math.PI/5;g.beginPath();g.moveTo(Math.cos(a)*.3,Math.sin(a)*.3);g.lineTo(Math.cos(a)*.62,Math.sin(a)*.62);g.strokeStyle='#14161c';g.lineWidth=.07;g.stroke();C(Math.cos(a)*.78,Math.sin(a)*.78,.12,'#14161c');}}
  else if(id==='moon'){C(0,0,.92,'#171b3a','#c7b8ff',.1);g.beginPath();g.arc(-.05,0,.5,0,Math.PI*2);g.fillStyle='#f6e8a8';g.fill();g.beginPath();g.arc(.18,.08,.44,0,Math.PI*2);g.fillStyle='#171b3a';g.fill();const st=[];for(let i=0;i<10;i++){const r=i%2?.07:.17,a=Math.PI/2+i*Math.PI/5;st.push([.5+Math.cos(a)*r,.45+Math.sin(a)*r]);}P(st,'#ffffff');}
  else{g.fillStyle='#6c4bff';g.beginPath();g.roundRect?g.roundRect(-.85,-.85,1.7,1.7,.3):g.rect(-.85,-.85,1.7,1.7);g.fill();g.fillStyle='#ff5a3c';g.fillRect(-.6,.05,.5,.55);g.fillStyle='#2fd0a0';g.fillRect(.05,.2,.55,.4);g.fillStyle='#ffd23f';g.fillRect(-.6,-.6,.55,.55);g.fillStyle='#ffffff';g.fillRect(.05,-.6,.55,.65);}
  g.restore();
};

/* ---------- badge maker: shape + two colours + symbol + up to three letters. Stored as a short string like c|shield|5b3fd4|ffffff|star|OW
   and always re-validated, because other people's avatars are rendered from it. ---------- */
OWA.BADGE={shapes:[['shield','Shield'],['circle','Circle'],['hex','Hexagon'],['crest','Crest'],['diamond','Diamond'],['banner','Banner']],
  syms:[['none','None'],['star','Star'],['crown','Crown'],['bolt','Bolt'],['flame','Flame'],['ball','Ball'],['heart','Heart'],['moon','Moon'],['peak','Peak'],['wave','Wave']],
  cols:['#5b3fd4','#ff5a3c','#14284b','#0f8f94','#1f6b45','#b3261e','#f2c230','#ff7ab6','#15151a','#ffffff']};
OWA.parseBadge=function(id){
  if(typeof id!=='string'||id.slice(0,2)!=='c|'||id.length>40)return null;const a=id.split('|');if(a.length!==6)return null;
  const sh=OWA.BADGE.shapes.some(x=>x[0]===a[1]),sy=OWA.BADGE.syms.some(x=>x[0]===a[4]);
  if(!sh||!sy||!/^[0-9a-f]{6}$/i.test(a[2])||!/^[0-9a-f]{6}$/i.test(a[3])||!/^[A-Z0-9]{0,3}$/.test(a[5]))return null;
  return{shape:a[1],c1:'#'+a[2],c2:'#'+a[3],sym:a[4],txt:a[5]};
};
OWA.badgeId=function(b){return 'c|'+b.shape+'|'+b.c1.replace('#','')+'|'+b.c2.replace('#','')+'|'+b.sym+'|'+(b.txt||'');};
OWA.drawBadge=function(g,b){
  const sp={bolt:[[.1,.8],[-.4,-.05],[-.04,-.05],[-.14,-.8],[.42,.1],[.04,.1]]};
  const path=(sh)=>{g.beginPath();
    if(sh==='circle')g.arc(0,0,.9,0,Math.PI*2);
    else if(sh==='shield'){g.moveTo(-.8,.85);g.lineTo(.8,.85);g.lineTo(.8,.05);g.quadraticCurveTo(.8,-.6,0,-.95);g.quadraticCurveTo(-.8,-.6,-.8,.05);g.closePath();}
    else if(sh==='crest'){g.moveTo(-.8,.6);g.quadraticCurveTo(-.4,.95,0,.75);g.quadraticCurveTo(.4,.95,.8,.6);g.lineTo(.8,-.1);g.quadraticCurveTo(.8,-.65,0,-.95);g.quadraticCurveTo(-.8,-.65,-.8,-.1);g.closePath();}
    else if(sh==='hex'){for(let i=0;i<6;i++){const a=Math.PI/6+i*Math.PI/3;i?g.lineTo(Math.cos(a)*.95,Math.sin(a)*.95):g.moveTo(Math.cos(a)*.95,Math.sin(a)*.95);}g.closePath();}
    else if(sh==='diamond'){g.moveTo(0,.95);g.lineTo(.8,0);g.lineTo(0,-.95);g.lineTo(-.8,0);g.closePath();}
    else{g.moveTo(-.85,.7);g.lineTo(.85,.7);g.lineTo(.85,-.45);g.lineTo(0,-.85);g.lineTo(-.85,-.45);g.closePath();}};
  g.save();path(b.shape);g.fillStyle=b.c1;g.fill();g.lineJoin='round';g.lineWidth=.1;g.strokeStyle=b.c2;g.stroke();
  /* inner line gives it the stitched look of a real badge */
  g.save();g.scale(.8,.8);path(b.shape);g.lineWidth=.04;g.strokeStyle=b.c2;g.globalAlpha=.55;g.stroke();g.restore();
  const hasT=!!b.txt,sy=hasT?.3:0,sc=hasT?.36:.58;g.fillStyle=b.c2;g.strokeStyle=b.c2;
  g.save();g.translate(0,sy);g.scale(sc,sc);
  const P=(pts)=>{g.beginPath();pts.forEach((q,i)=>i?g.lineTo(q[0],q[1]):g.moveTo(q[0],q[1]));g.closePath();g.fill();};
  if(b.sym==='star'){const st=[];for(let i=0;i<10;i++){const r=i%2?.4:1,a=Math.PI/2+i*Math.PI/5;st.push([Math.cos(a)*r,Math.sin(a)*r]);}P(st);}
  else if(b.sym==='crown')P([[-.9,-.55],[-.95,.45],[-.4,0],[0,.8],[.4,0],[.95,.45],[.9,-.55]]);
  else if(b.sym==='bolt')P(sp.bolt.map(q=>[q[0]*1.2,q[1]*1.2]));
  else if(b.sym==='flame'){g.beginPath();g.moveTo(0,.95);g.bezierCurveTo(.8,.1,.8,-.3,.5,-.65);g.bezierCurveTo(.3,-1,-.3,-1,-.5,-.65);g.bezierCurveTo(-.8,-.3,-.55,.1,-.15,.3);g.bezierCurveTo(-.15,.6,0,.75,0,.95);g.fill();}
  else if(b.sym==='ball'){g.beginPath();g.arc(0,0,.9,0,Math.PI*2);g.lineWidth=.14;g.stroke();const hx=[];for(let i=0;i<5;i++){const a=Math.PI/2+i*2*Math.PI/5;hx.push([Math.cos(a)*.38,Math.sin(a)*.38]);}P(hx);for(let i=0;i<5;i++){const a=Math.PI/2+i*2*Math.PI/5;g.beginPath();g.moveTo(Math.cos(a)*.38,Math.sin(a)*.38);g.lineTo(Math.cos(a)*.85,Math.sin(a)*.85);g.lineWidth=.1;g.stroke();}}
  else if(b.sym==='heart'){g.beginPath();g.moveTo(0,-.85);g.bezierCurveTo(-1.3,-.05,-.7,.95,0,.4);g.bezierCurveTo(.7,.95,1.3,-.05,0,-.85);g.fill();}
  else if(b.sym==='moon'){g.beginPath();g.arc(0,0,.9,0,Math.PI*2);g.fill();g.fillStyle=b.c1;g.beginPath();g.arc(.45,.15,.78,0,Math.PI*2);g.fill();}
  else if(b.sym==='peak'){P([[0,.95],[.95,-.7],[-.95,-.7]]);}
  else if(b.sym==='wave'){g.lineWidth=.2;g.lineCap='round';for(let k=-1;k<=1;k++){g.beginPath();for(let i=0;i<=16;i++){const x=-.9+i*.1125,y=k*.55+Math.sin(i*.8)*.15;i?g.lineTo(x,y):g.moveTo(x,y);}g.stroke();}}
  g.restore();
  if(hasT){g.save();g.scale(.01,-.01);g.fillStyle=b.c2;g.textAlign='center';g.textBaseline='middle';const n=b.txt.length;g.font='900 '+(n===1?62:n===2?52:40)+'px Arial Black, Arial, sans-serif';g.fillText(b.txt,0,b.sym==='none'?0:54);g.restore();}
  g.restore();
};
