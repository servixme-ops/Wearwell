/* ---------- OWA: avatar catalogue ----------
 * Everything here is free (no shop, no money). Only options the loaded GLB models can really do are listed.
 * Facial SHAPE (nose/jaw/lips), muscle definition and extra hairstyles/garments are NOT in the supplied GLB,
 * so they are not offered: see docs/AVATARS.md for the capability report and how extra assets plug in. */
const OWA=window.OWA={};
OWA.BASE='assets/avatars/';
/* models: f = the supplied rigged GLB. m = the same rig with male proportions until a male rigged GLB is supplied
   (put it at assets/avatars/male.glb and set url + proxy:false here). */
OWA.MODELS={
  f:{url:OWA.BASE+'female.glb',height:1.68,label:'Woman',proxy:false},
  m:{url:OWA.BASE+'female.glb',height:1.80,label:'Man',proxy:true,prop:{sh:.35,chest:.2,waist:-.1,hips:-.3,arms:.1,legs:.05,hd:.0,hands:.15,feet:.15,neck:.1}}
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
  return {v:2,g,skin:g==='f'?5:6,hc:0,eyec:1,hair:'short',glasses:true,glc:null,topc:null,botc:null,shoec:null,bare:false,
    h:0,sh:0,chest:0,waist:0,hips:0,arms:0,legs:0,neck:0,hd:0,hands:0,feet:0,ex:'neutral',mx:{},extras:{}};
};
OWA.pick=(arr,id)=>arr.find(x=>x.id===id)||arr[0];
/* old saved procedural avatars: keep their gender, skin and hair colour; everything else resets */
OWA.migrate=function(c){const d=OWA.def(c&&c.g==='m'?'m':'f');if(!c)return d;
  if(c.v===2)return Object.assign(d,c,{mx:Object.assign({},c.mx),extras:Object.assign({},c.extras)});
  if(typeof c.skin==='number')d.skin=Math.max(0,Math.min(OWA.SKIN.length-1,c.skin));
  if(typeof c.hc==='number')d.hc=Math.max(0,Math.min(OWA.HAIRC.length-1,c.hc));
  if(typeof c.eyec==='number')d.eyec=Math.max(0,Math.min(OWA.EYEC.length-1,c.eyec));
  if(c.hair==='bald')d.hair='none';
  return d;};
OWA.random=function(g){
  const r=a=>a[Math.floor(Math.random()*a.length)];g=g||r(['f','m']);const c=OWA.def(g);
  c.skin=3+Math.floor(Math.random()*13);c.hc=Math.random()<.7?Math.floor(Math.random()*3):Math.floor(Math.random()*OWA.HAIRC.length);c.eyec=Math.floor(Math.random()*OWA.EYEC.length);
  Object.assign(c,r(OWA.LOOKS).p);c.ex=r(['neutral','smile','grin']);c.glasses=Math.random()<.5;
  for(const k of ['h','sh','chest','waist','hips','arms','legs'])c[k]=+(Math.random()*.8-.4).toFixed(2);
  return c;
};
