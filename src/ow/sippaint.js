/* ---------- Gist & Paint: a painting studio inside a Space ----------
   - every seated person has their own canvas (a 2D canvas used as the live texture of the 3D canvas)
   - strokes are batched over a realtime broadcast channel (pt:<space>) and saved to the database (paint_canvases)
   - the host chooses the reference picture, starts / pauses the session; everyone paints their own version */
const OWPaint=(()=>{
const T=THREE,PAPER='#fffdf8',CW=512,CH=640;
const COLS=[['Red','#e63946'],['Blue','#2d6cdf'],['Yellow','#ffd23f'],['Green','#2bb673'],['Purple','#7b4dff'],['Orange','#ff8a1f'],['Black','#1a1a1f'],['White','#ffffff'],['Brown','#8b5a3c'],['Pink','#ff6fae']];
const STATES=['Painting','Almost done','Completed'];

/* colours that are really in the reference picture, most used first, so the swatches match what you are painting */
const palCache=new Map();
function refPalette(id){
  if(!id)return COLS;if(palCache.has(id))return palCache.get(id);
  try{
    /* count only flat pixels (same colour as the pixel to the right and below) at full size, so thin white lines and tiny details are kept and edge blends are not */
    const c=refCanvas(id),w=c.width,hh=c.height,g=c.getContext('2d'),d=g.getImageData(0,0,w,hh).data;
    const B=new Map(),same=(i,j)=>Math.abs(d[i]-d[j])+Math.abs(d[i+1]-d[j+1])+Math.abs(d[i+2]-d[j+2])<14;
    for(let y=0;y<hh-1;y++)for(let x=0;x<w-1;x++){const i=(y*w+x)*4;if(d[i+3]<200)continue;if(!same(i,i+4)||!same(i,i+w*4))continue;const k=(d[i]>>4)<<8|(d[i+1]>>4)<<4|(d[i+2]>>4);let b=B.get(k);if(!b){b=[0,0,0,0];B.set(k,b);}b[0]+=d[i];b[1]+=d[i+1];b[2]+=d[i+2];b[3]++;}
    const arr=[...B.values()].map(b=>[b[0]/b[3],b[1]/b[3],b[2]/b[3],b[3]]).sort((a,b)=>b[3]-a[3]),out=[];
    for(const a of arr){if(a[3]<30)break;if(out.every(o=>Math.hypot(o[0]-a[0],o[1]-a[1],o[2]-a[2])>40))out.push(a);if(out.length>=18)break;}
    const hex=a=>'#'+[a[0],a[1],a[2]].map(v=>Math.round(v).toString(16).padStart(2,'0')).join('');
    const res=out.length>=3?out.map((a,i)=>['Colour '+(i+1),hex(a)]):COLS;
    /* only cache once the picture has really loaded (an uploaded image starts out blank) */
    if(!/^img:/.test(id)||out.length>=3)palCache.set(id,res);return res;
  }catch(e){return COLS;}
}
const REFS=[['sunset','Palm sunset'],['flowers','Flower vase'],['mountains','Mountain lake'],['city','City at night'],['abstract','Colour circles'],['cat','Sleepy cat'],['sunflower','Sunflower'],['fish','Goldfish bowl'],['house','Cosy house'],['rocket','Rocket in space'],['moonsea','Moonlit sea'],['dunes','Desert dunes'],['fluid','Fluid colour'],['monstera','Monstera leaves'],['deco','Art-deco sunrise'],['vinyl','Vinyl night'],['pines','Misty pines'],['neonrain','Neon rain street'],['bridge','Lagoon bridge dusk'],['aelephant','Elephant at sunset'],['afox','Fox under the moon'],['astag','Stag and moon'],['alion','Lion mane'],['aflamingo','Flamingo'],['awhale','Whale tail'],['asun','Boho sun and mountains'],['acat','Cat and moon'],['aowl','Night owl'],['abutterfly','Butterfly'],['bcamera','Vintage camera'],['bguitar','Acoustic guitar'],['bheadphones','Headphones and notes'],['btoast','Cheers'],['bperfume','Perfume bottle'],['hafro','Afro portrait'],['hdance','Dancing couple'],['hpop','Cap and shades'],['hflower','Flower crown'],['hsax','Saxophone player'],['balloon','Hot-air balloon'],['hrobe','Man in a flowing robe'],['xmoons','Moon phases'],['sfruit','Fruit bowl'],['steapot','Teapot and cups'],['scandle','Candle and books'],['spine','Pineapple and mangoes'],['dkoi','Koi pond'],['dlight','Lighthouse at dusk'],['dboom','Retro boombox'],['dmartini','Cocktail hour'],['dcaravan','Desert caravan'],['pgele','Gele and gold earrings'],['pkaftan','Senator kaftan'],['pbraids','Long braids'],['phood','Twists and headset'],['ppuffs','Twin puffs and ankara'],['plocs','Locs and dashiki'],['pcurls','Curls and glasses'],['pelder','Elder in Hausa cap'],['psnap','Snapback and shades'],['pbeanie','Beanie and shades'],['pbob','Honey-brown bob'],['phtie','Head tie and beads'],['pwaves','Long waves and pearls'],['pfhand','Raised hand, green'],['pfseat','Seated in stripes, purple']];

/* ---------------- reference pictures (drawn in code, 400 x 500) ---------------- */
const lin=(g,x0,y0,x1,y1,stops)=>{const l=g.createLinearGradient(x0,y0,x1,y1);stops.forEach(([o,c])=>l.addColorStop(o,c));return l;};

/* ---- painterly helpers: acrylic-style brush texture so the reference pictures look hand painted ---- */
const SR=seed=>{let x=seed*9301+49297;return()=>{x=(x*9301+49297)%233280;return x/233280;};};
const SH=(c,d)=>{const n=parseInt(c.slice(1),16),f=v=>Math.max(0,Math.min(255,v+d));return 'rgb('+f(n>>16)+','+f((n>>8)&255)+','+f(n&255)+')';};
function wash(g,w,h,stops,seed,ang){const r=SR(seed||3);g.fillStyle=lin(g,0,0,ang?w:0,h,stops);g.fillRect(0,0,w,h);
  for(let i=0;i<260;i++){const y=r()*h,x=r()*w,l=40+r()*110,a=(ang||0)+(r()-.5)*.25;g.strokeStyle=r()>.5?'rgba(255,255,255,.045)':'rgba(0,0,0,.035)';g.lineWidth=8+r()*20;g.lineCap='round';g.beginPath();g.moveTo(x,y);g.lineTo(x+Math.cos(a)*l,y+Math.sin(a)*l);g.stroke();}}
function pt(g,shape,col,o){o=o||{};const r=SR(o.seed||7),b=o.b||[0,0,400,500],n=o.n||70;g.save();g.beginPath();shape(g);g.clip();g.fillStyle=col;g.fill();
  for(let i=0;i<n;i++){const x=b[0]+r()*b[2],y=b[1]+r()*b[3],l=14+r()*(o.len||44),a=(o.a==null?-.7:o.a)+(r()-.5)*.7;g.strokeStyle=SH(col,(r()-.5)*(o.v||56));g.globalAlpha=.4;g.lineWidth=4+r()*(o.wd||9);g.lineCap='round';g.beginPath();g.moveTo(x,y);g.lineTo(x+Math.cos(a)*l,y+Math.sin(a)*l);g.stroke();}
  g.globalAlpha=1;g.restore();if(o.line){g.save();g.beginPath();shape(g);g.strokeStyle=o.line;g.lineWidth=o.lw||3;g.lineJoin='round';g.stroke();g.restore();}}
const EL=(x,y,rx,ry,rot)=>g=>{g.ellipse(x,y,rx,ry,rot||0,0,7);};
const TRI=(a,b,c,d,e,f)=>g=>{g.moveTo(a,b);g.lineTo(c,d);g.lineTo(e,f);g.closePath();};
function tex(g,w,h){const r=SR(11);for(let i=0;i<5200;i++){g.fillStyle=r()>.5?'rgba(255,255,255,.05)':'rgba(0,0,0,.05)';g.fillRect(r()*w,r()*h,1.4,1.4);}
  g.strokeStyle='rgba(0,0,0,.03)';g.lineWidth=1;for(let x=0;x<w;x+=5){g.beginPath();g.moveTo(x,0);g.lineTo(x,h);g.stroke();}for(let y=0;y<h;y+=5){g.beginPath();g.moveTo(0,y);g.lineTo(w,y);g.stroke();}}
const bokeh=(g,w,h,seed,n)=>{const r=SR(seed);for(let i=0;i<n;i++){g.fillStyle='rgba(255,255,255,'+(.15+r()*.35)+')';g.beginPath();g.arc(r()*w,r()*h*.8,3+r()*9,0,7);g.fill();}};

/* flat, bold-outline helpers: clean shapes give clean outline guides */
const INK='#1b1424';
const FL=(g,path,fill,lw)=>{g.beginPath();path(g);if(fill){g.fillStyle=fill;g.fill();}g.strokeStyle=INK;g.lineWidth=lw==null?4:lw;g.lineJoin='round';g.lineCap='round';g.stroke();};
const FE=(g,x,y,rx,ry,fill,rot,lw)=>FL(g,k=>k.ellipse(x,y,rx,ry,rot||0,0,7),fill,lw);
const FP=(g,pts,fill,lw)=>FL(g,k=>{k.moveTo(pts[0][0],pts[0][1]);for(let i=1;i<pts.length;i++)k.lineTo(pts[i][0],pts[i][1]);k.closePath();},fill,lw);
const FD=(g,x,y,r,fill)=>{g.fillStyle=fill;g.beginPath();g.arc(x,y,r,0,7);g.fill();};
const REFDRAW={
 dkoi(g,w,h){g.fillStyle=lin(g,0,0,w*.3,h,[[0,'#0b3c49'],[.6,'#0e5a63'],[1,'#13806f']]);g.fillRect(0,0,w,h);
  g.strokeStyle='rgba(190,240,235,.28)';g.lineWidth=3;[34,58,84,112].forEach(r=>{g.beginPath();g.arc(w*.74,h*.2,r,0,7);g.stroke();});g.beginPath();g.arc(w*.2,h*.5,50,0,7);g.stroke();
  const pad=(x,y,r,rot)=>FL(g,k=>{k.moveTo(x,y);k.arc(x,y,r,rot+.28,rot+Math.PI*2-.28);k.closePath();},'#3bb273',4);
  const bez=(P,t)=>{const u=1-t;return[u*u*u*P[0][0]+3*u*u*t*P[1][0]+3*u*t*t*P[2][0]+t*t*t*P[3][0],u*u*u*P[0][1]+3*u*u*t*P[1][1]+3*u*t*t*P[2][1]+t*t*t*P[3][1]];};
  const koi=(P,W,body,spots,fin)=>{const N=26,L=[],R=[],C=[];for(let i=0;i<=N;i++){const t=i/N,a=bez(P,t),b=bez(P,Math.min(1,t+.02)),c=bez(P,Math.max(0,t-.02));let dx=b[0]-c[0],dy=b[1]-c[1];const m=Math.hypot(dx,dy)||1;dx/=m;dy/=m;const wd=t<.3?W*(.7+.3*Math.sin(t/.3*Math.PI/2)):W*(1-.9*Math.pow((t-.3)/.7,1.15));C.push([a[0],a[1],dx,dy,wd]);L.push([a[0]-dy*wd,a[1]+dx*wd]);R.push([a[0]+dy*wd,a[1]-dx*wd]);}
   const e=C[N],tl=C[N-1];const tx=e[2],ty=e[3];
   {const E=(a,b)=>[e[0]+tx*a-ty*b,e[1]+ty*a+tx*b];const q0=E(0,6),q1=E(26,16),t1=E(76,44),n1=E(58,16),m=E(46,0),n2=E(58,-16),t2=E(76,-44),q2=E(26,-16),q3=E(0,-6);FL(g,k=>{k.moveTo(q0[0],q0[1]);k.quadraticCurveTo(q1[0],q1[1],t1[0],t1[1]);k.quadraticCurveTo(n1[0],n1[1],m[0],m[1]);k.quadraticCurveTo(n2[0],n2[1],t2[0],t2[1]);k.quadraticCurveTo(q2[0],q2[1],q3[0],q3[1]);k.closePath();},fin,4);g.strokeStyle='rgba(27,20,36,.55)';g.lineWidth=2;[[60,22],[66,0],[60,-22]].forEach(([a,b])=>{const z=E(a,b);g.beginPath();g.moveTo(e[0],e[1]);g.lineTo(z[0],z[1]);g.stroke();});}
   const f=C[7];[-1,1].forEach(m=>FE(g,f[0]-f[3]*m*(f[4]+8),f[1]+f[2]*m*(f[4]+8),22,8,fin,Math.atan2(f[3],f[2])+m*.7,3));
   FL(g,k=>{k.moveTo(L[0][0],L[0][1]);for(let i=1;i<=N;i++)k.lineTo(L[i][0],L[i][1]);for(let i=N;i>=0;i--)k.lineTo(R[i][0],R[i][1]);k.closePath();},body,4);
   FD(g,C[0][0],C[0][1],C[0][4]*.96,body);spots.forEach(([t,r,c])=>{const q=C[Math.round(t*N)];FD(g,q[0],q[1],q[4]*r,c);});
   const hd=C[2];[-1,1].forEach(m=>FD(g,hd[0]-hd[3]*m*hd[4]*.55,hd[1]+hd[2]*m*hd[4]*.55,4,INK));};
  pad(w*.15,h*.7,46,.4);pad(w*.88,h*.3,34,2.2);pad(w*.2,h*.94,30,4);
  for(let a=0;a<8;a++)FE(g,w*.15+Math.cos(a*.785)*19,h*.7+Math.sin(a*.785)*19,19,9,'#ff8fb1',a*.785,3);for(let a=0;a<6;a++)FE(g,w*.15+Math.cos(a*1.047+.3)*9,h*.7+Math.sin(a*1.047+.3)*9,10,5,'#ffc2d4',a*1.047+.3,2);FD(g,w*.15,h*.7,7,'#ffd166');
  koi([[w*.28,h*.1],[w*.78,h*.04],[w*.62,h*.34],[w*.3,h*.36]],24,'#f4f1de',[[.3,.8,'#ee6c4d'],[.52,.7,'#ee6c4d'],[.15,.55,'#1b1424'],[.7,.5,'#1b1424']],'#f9d9c4');
  koi([[w*.82,h*.56],[w*.4,h*.54],[w*.44,h*.76],[w*.66,h*.8]],24,'#ee6c4d',[[.28,.7,'#f4f1de'],[.5,.65,'#1b1424'],[.68,.55,'#f4f1de']],'#f4a58f');},
 dlight(g,w,h){g.fillStyle=lin(g,0,0,0,h*.7,[[0,'#141a4a'],[.5,'#6a3d8f'],[.85,'#e87a8c'],[1,'#ffb36b']]);g.fillRect(0,0,w,h);
  [[.1,.08],[.25,.2],[.4,.06],[.6,.14],[.82,.07],[.92,.22],[.05,.3],[.5,.28]].forEach(([x,y])=>FD(g,w*x,h*y,2.5,'#fff3c4'));FD(g,w*.2,h*.38,w*.07,'#ffe8a3');FD(g,w*.225,h*.365,w*.06,'#7a4c96');
  g.fillStyle=lin(g,0,h*.62,0,h,[[0,'#2b4a7a'],[1,'#0c1f3c']]);g.fillRect(0,h*.62,w,h*.38);g.strokeStyle='rgba(255,200,170,.5)';g.lineWidth=4;g.lineCap='round';for(let i=0;i<9;i++){const y=h*(.65+i*.04),x=w*(.1+((i*37)%60)/100);g.beginPath();g.moveTo(x,y);g.lineTo(x+w*.18,y);g.stroke();}
  g.fillStyle='rgba(255,236,170,.28)';g.beginPath();g.moveTo(w*.68,h*.36);g.lineTo(0,h*.2);g.lineTo(0,h*.5);g.closePath();g.fill();
  FP(g,[[w*.34,h],[w*.4,h*.8],[w*.52,h*.72],[w*.82,h*.7],[w,h*.66],[w,h]],'#241f3a');FP(g,[[w*.42,h],[w*.5,h*.86],[w*.7,h*.8],[w,h*.76],[w,h]],'#17132b');
  const tx=(y)=>w*.66-(w*.07+(y-h*.36)/(h*.34)*w*.04);const bands=['#f4f1de','#d62839','#f4f1de','#d62839','#f4f1de'],y0=h*.36,y1=h*.7,bh=(y1-y0)/5;
  bands.forEach((c,i)=>{const ya=y0+i*bh,yb=ya+bh,wa=w*.07+(ya-y0)/(y1-y0)*w*.045,wb=w*.07+(yb-y0)/(y1-y0)*w*.045;FP(g,[[w*.66-wa,ya],[w*.66+wa,ya],[w*.66+wb,yb],[w*.66-wb,yb]],c,4);});
  FL(g,k=>k.rect(w*.66-w*.09,h*.345,w*.18,h*.02),'#241f3a');FL(g,k=>k.rect(w*.66-w*.055,h*.29,w*.11,h*.055),'#ffe9a0');FP(g,[[w*.66-w*.075,h*.29],[w*.66,h*.235],[w*.66+w*.075,h*.29]],'#d62839');FD(g,w*.66,h*.228,5,INK);
  FL(g,k=>k.rect(w*.66-w*.025,h*.6,w*.05,h*.1),'#3a2f5c');FL(g,k=>k.rect(w*.66-w*.02,h*.46,w*.04,h*.05),'#3a2f5c');},
 dboom(g,w,h){g.fillStyle='#2b2d42';g.fillRect(0,0,w,h);FD(g,w*.5,h*.5,w*.46,'#3d3f5e');FD(g,w*.5,h*.5,w*.34,'#4b4e74');
  g.fillStyle='#1b1424';g.beginPath();g.ellipse(w*.5,h*.8,w*.4,h*.025,0,0,7);g.fill();
  FL(g,k=>{k.moveTo(w*.22,h*.34);k.lineTo(w*.22,h*.26);k.quadraticCurveTo(w*.22,h*.22,w*.26,h*.22);k.lineTo(w*.74,h*.22);k.quadraticCurveTo(w*.78,h*.22,w*.78,h*.26);k.lineTo(w*.78,h*.34);},null,10);g.strokeStyle='#8d99ae';g.lineWidth=5;g.beginPath();g.moveTo(w*.22,h*.34);g.lineTo(w*.22,h*.26);g.quadraticCurveTo(w*.22,h*.22,w*.26,h*.22);g.lineTo(w*.74,h*.22);g.quadraticCurveTo(w*.78,h*.22,w*.78,h*.26);g.lineTo(w*.78,h*.34);g.stroke();
  FL(g,k=>{k.moveTo(w*.12,h*.34);k.lineTo(w*.88,h*.34);k.quadraticCurveTo(w*.92,h*.34,w*.92,h*.38);k.lineTo(w*.92,h*.74);k.quadraticCurveTo(w*.92,h*.78,w*.88,h*.78);k.lineTo(w*.12,h*.78);k.quadraticCurveTo(w*.08,h*.78,w*.08,h*.74);k.lineTo(w*.08,h*.38);k.quadraticCurveTo(w*.08,h*.34,w*.12,h*.34);},'#c9ced6');
  FL(g,k=>k.rect(w*.1,h*.36,w*.8,h*.025),'#e63946',3);
  [[.26],[.74]].forEach(([x])=>{FD(g,w*x,h*.56,w*.15+3,INK);FD(g,w*x,h*.56,w*.15,'#2f2f3a');FD(g,w*x,h*.56,w*.11,'#4a4a58');FD(g,w*x,h*.56,w*.065,'#1b1b24');FD(g,w*x,h*.56,w*.022,'#8d99ae');FD(g,w*x,h*.4,w*.016,'#ffd166');});
  FL(g,k=>k.rect(w*.4,h*.41,w*.2,h*.12),'#2f2f3a');FL(g,k=>k.rect(w*.42,h*.43,w*.16,h*.07),'#a8dadc',3);FD(g,w*.46,h*.465,w*.02+2,INK);FD(g,w*.46,h*.465,w*.02,'#f4f1de');FD(g,w*.54,h*.465,w*.02+2,INK);FD(g,w*.54,h*.465,w*.02,'#f4f1de');
  FL(g,k=>k.rect(w*.4,h*.55,w*.2,h*.04),'#1b3a2a',3);g.fillStyle='#52ff9c';[0,1,2,3,4,5,6].forEach(i=>g.fillRect(w*.415+i*w*.025,h*.565,w*.012,h*.015+((i*5)%3)*h*.004));
  FD(g,w*.44,h*.65,w*.035+3,INK);FD(g,w*.44,h*.65,w*.035,'#e63946');FD(g,w*.56,h*.65,w*.035+3,INK);FD(g,w*.56,h*.65,w*.035,'#ffd166');[0,1,2,3].forEach(i=>FL(g,k=>k.rect(w*.36+i*w*.07,h*.7,w*.06,h*.045),'#2f2f3a',3));
  FL(g,k=>k.rect(w*.14,h*.78,w*.1,h*.02),INK);FL(g,k=>k.rect(w*.76,h*.78,w*.1,h*.02),INK);
  g.strokeStyle='#ffd166';g.lineWidth=5;g.lineCap='round';[[.14,.14],[.86,.1]].forEach(([x,y])=>{FD(g,w*x,h*(y+.05),9,'#ffd166');g.beginPath();g.moveTo(w*x+8,h*(y+.05));g.lineTo(w*x+8,h*y-8);g.lineTo(w*x+24,h*y-2);g.stroke();});},
 dmartini(g,w,h){g.fillStyle=lin(g,0,0,0,h,[[0,'#2a1146'],[1,'#12091f']]);g.fillRect(0,0,w,h);[[.15,.14,26,'#ff4d8d'],[.3,.08,16,'#ffb703'],[.78,.12,30,'#4cc9f0'],[.9,.28,18,'#ff4d8d'],[.06,.36,20,'#ffb703'],[.62,.05,14,'#4cc9f0']].forEach(([x,y,r,c])=>{g.globalAlpha=.35;FD(g,w*x,h*y,r,c);g.globalAlpha=1;});
  g.fillStyle='#3a1d5c';g.fillRect(0,h*.78,w,h*.22);g.strokeStyle=INK;g.lineWidth=4;g.beginPath();g.moveTo(0,h*.78);g.lineTo(w,h*.78);g.stroke();
  FL(g,k=>{k.moveTo(w*.76,h*.78);k.lineTo(w*.76,h*.46);k.quadraticCurveTo(w*.76,h*.4,w*.8,h*.36);k.lineTo(w*.8,h*.28);k.lineTo(w*.88,h*.28);k.lineTo(w*.88,h*.36);k.quadraticCurveTo(w*.92,h*.4,w*.92,h*.46);k.lineTo(w*.92,h*.78);k.closePath();},'#1f6f5c');FL(g,k=>k.rect(w*.77,h*.52,w*.14,h*.14),'#f4f1de',3);
  FL(g,k=>{k.moveTo(w*.12,h*.3);k.lineTo(w*.58,h*.3);k.lineTo(w*.35,h*.56);k.closePath();},'#d8f3dc');FP(g,[[w*.15,h*.32],[w*.55,h*.32],[w*.35,h*.53]],'#b7e4c7',2);
  g.strokeStyle='#fff';g.lineWidth=5;g.lineCap='round';g.beginPath();g.moveTo(w*.18,h*.335);g.lineTo(w*.28,h*.46);g.stroke();
  FL(g,k=>k.rect(w*.335,h*.56,w*.03,h*.18),'#d8f3dc');FE(g,w*.35,h*.755,w*.14,h*.02,'#d8f3dc');
  g.strokeStyle=INK;g.lineWidth=4;g.beginPath();g.moveTo(w*.45,h*.2);g.lineTo(w*.28,h*.42);g.stroke();FD(g,w*.28,h*.42,11+3,INK);FD(g,w*.28,h*.42,11,'#6a994e');FD(g,w*.28,h*.42,4,'#e63946');
  FD(g,w*.58,h*.28,w*.07+3,INK);FD(g,w*.58,h*.28,w*.07,'#76c893');FD(g,w*.58,h*.28,w*.05,'#d9ed92');g.strokeStyle='#76c893';g.lineWidth=2.5;for(let a=0;a<6;a++){g.beginPath();g.moveTo(w*.58,h*.28);g.lineTo(w*.58+Math.cos(a*1.047)*w*.05,h*.28+Math.sin(a*1.047)*w*.05);g.stroke();}
  FL(g,k=>{k.moveTo(w*.46,h*.74);k.lineTo(w*.5,h*.46);k.lineTo(w*.7,h*.46);k.lineTo(w*.74,h*.74);k.closePath();},'#e07a3f');FP(g,[[w*.5,h*.46],[w*.7,h*.46],[w*.7,h*.52],[w*.5,h*.52]],'#f4a261',3);
  [[.54,.58],[.62,.64],[.58,.7]].forEach(([x,y])=>FL(g,k=>k.rect(w*x,h*y,w*.07,w*.07),'#fff3e0',3));
  g.strokeStyle='#ff4d8d';g.lineWidth=7;g.beginPath();g.moveTo(w*.66,h*.5);g.lineTo(w*.7,h*.3);g.stroke();FL(g,k=>k.arc(w*.7,h*.3,0,0,7),null,1);
  FD(g,w*.48,h*.4,w*.045+3,INK);FD(g,w*.48,h*.4,w*.045,'#ff9f1c');FD(g,w*.48,h*.4,w*.03,'#ffd166');},
 dcaravan(g,w,h){g.fillStyle=lin(g,0,0,0,h*.66,[[0,'#0a0e2a'],[.45,'#2d1b5e'],[.8,'#d9638c'],[1,'#ffb677']]);g.fillRect(0,0,w,h);
  [[.08,.06],[.2,.16],[.34,.05],[.46,.2],[.58,.08],[.9,.3],[.12,.34],[.3,.28],[.52,.34]].forEach(([x,y])=>FD(g,w*x,h*y,2.4,'#fff3c4'));
  FD(g,w*.72,h*.2,w*.13+3,INK);FD(g,w*.72,h*.2,w*.13,'#ffeaa8');FD(g,w*.68,h*.17,w*.02,'#f2d587');FD(g,w*.76,h*.24,w*.028,'#f2d587');FD(g,w*.7,h*.26,w*.015,'#f2d587');
  FP(g,[[0,h*.58],[w*.2,h*.5],[w*.45,h*.57],[w*.7,h*.51],[w,h*.58],[w,h],[0,h]],'#8f3b6e');
  FL(g,k=>{k.moveTo(0,h*.7);k.bezierCurveTo(w*.25,h*.62,w*.55,h*.78,w,h*.66);k.lineTo(w,h);k.lineTo(0,h);k.closePath();},'#512a63');
  FL(g,k=>{k.moveTo(0,h*.88);k.bezierCurveTo(w*.3,h*.82,w*.6,h*.94,w,h*.86);k.lineTo(w,h);k.lineTo(0,h);k.closePath();},'#1d1236');
  const camel=(x,y,s,rider,ph)=>{g.save();g.translate(x,y);g.scale(s,s);g.fillStyle=INK;g.strokeStyle=INK;g.lineJoin='round';g.lineCap='round';
   const leg=(lx,dx1,dx2)=>{g.lineWidth=11;g.beginPath();g.moveTo(lx,8);g.lineTo(lx+dx1,40);g.lineTo(lx+dx2,72);g.stroke();g.beginPath();g.ellipse(lx+dx2+2,74,9,5,0,0,7);g.fill();};
   leg(-40,ph?10:-8,ph?18:-14);leg(-22,ph?-8:8,ph?-14:12);leg(26,ph?-8:8,ph?-14:14);leg(44,ph?10:-8,ph?18:-12);
   g.lineWidth=5;g.beginPath();g.moveTo(-58,-8);g.quadraticCurveTo(-76,6,-72,40);g.stroke();g.beginPath();g.ellipse(-72,44,5,9,0,0,7);g.fill();
   g.beginPath();g.moveTo(-62,-6);g.bezierCurveTo(-62,-26,-30,-26,-8,-26);g.bezierCurveTo(20,-26,40,-26,58,-12);g.bezierCurveTo(66,4,40,26,0,26);g.bezierCurveTo(-40,26,-62,16,-62,-6);g.fill();
   g.beginPath();g.ellipse(-6,-34,17,19,0,0,7);g.fill();
   g.lineWidth=18;g.beginPath();g.moveTo(44,-8);g.quadraticCurveTo(72,-22,70,-58);g.stroke();g.lineWidth=13;g.beginPath();g.moveTo(66,-40);g.quadraticCurveTo(72,-56,72,-66);g.stroke();
   g.beginPath();g.ellipse(80,-70,20,10,.45,0,7);g.fill();g.beginPath();g.ellipse(97,-64,9,7,.5,0,7);g.fill();g.beginPath();g.moveTo(68,-76);g.lineTo(64,-92);g.lineTo(76,-80);g.closePath();g.fill();
   g.fillStyle='#ffd9a0';g.beginPath();g.arc(82,-72,2.2,0,7);g.fill();
   FP(g,[[-40,-18],[16,-18],[22,6],[-46,6]],'#e07a3f',3);g.strokeStyle='#ffd166';g.lineWidth=3;[-26,-10,6].forEach(xx=>{g.beginPath();g.moveTo(xx,-16);g.lineTo(xx+3,5);g.stroke();});g.strokeStyle=INK;
   g.lineWidth=2;g.strokeStyle='#d9638c';g.beginPath();g.moveTo(97,-62);g.quadraticCurveTo(80,-30,40,-26);g.stroke();
   if(rider){g.fillStyle=INK;g.beginPath();g.moveTo(-14,-26);g.lineTo(22,-26);g.lineTo(14,-74);g.lineTo(-2,-74);g.closePath();g.fill();g.beginPath();g.arc(6,-86,12,0,7);g.fill();g.fillStyle='#d9638c';g.beginPath();g.arc(6,-90,13,Math.PI,0);g.fill();}
   g.restore();};
  camel(w*.3,h*.7,.9,true,false);camel(w*.74,h*.7,.7,false,true);camel(w*.98,h*.66,.45,false,false);}, hrobe(g,w,h){const cx=w/2;g.fillStyle='#e9c46a';g.fillRect(0,0,w,h);FD(g,cx,h*.46,w*.4,'#f4d58d');
  FP(g,[[cx-w*.12,h*.58],[w*.04,h*.72],[w*.02,h],[w*.98,h],[w*.96,h*.72],[cx+w*.12,h*.58]],'#2a9d8f');FP(g,[[cx-w*.14,h*.58],[cx,h*.66],[cx+w*.14,h*.58],[cx+w*.1,h],[cx-w*.1,h]],'#1f7a6e');
  g.strokeStyle='#ffd166';g.lineWidth=6;g.lineCap='round';g.beginPath();g.moveTo(cx-w*.1,h*.6);g.quadraticCurveTo(cx,h*.7,cx+w*.1,h*.6);g.stroke();[.76,.84,.92].forEach(y=>{g.beginPath();g.moveTo(cx-w*.07,h*y);g.lineTo(cx+w*.07,h*y);g.stroke();});
  FL(g,k=>k.rect(cx-w*.06,h*.5,w*.12,h*.1),'#5c3a21');FE(g,cx,h*.4,w*.15,h*.17,'#6b4226');
  FL(g,k=>{k.moveTo(cx-w*.17,h*.31);k.lineTo(cx-w*.15,h*.14);k.quadraticCurveTo(cx,h*.1,cx+w*.15,h*.14);k.lineTo(cx+w*.17,h*.31);k.quadraticCurveTo(cx,h*.24,cx-w*.17,h*.31);},'#9d0208');g.strokeStyle='#ffd166';g.lineWidth=4;g.beginPath();g.moveTo(cx-w*.16,h*.25);g.quadraticCurveTo(cx,h*.19,cx+w*.16,h*.25);g.stroke();
  g.strokeStyle=INK;g.lineWidth=4;[-1,1].forEach(m=>{g.beginPath();g.arc(cx+m*w*.065,h*.39,w*.03,.15*Math.PI,.85*Math.PI);g.stroke();});FL(g,k=>{k.moveTo(cx-w*.09,h*.48);k.quadraticCurveTo(cx,h*.52,cx+w*.09,h*.48);k.quadraticCurveTo(cx,h*.58,cx-w*.09,h*.48);},'#2b1a14',3);FL(g,k=>{k.moveTo(cx-4,h*.41);k.lineTo(cx-7,h*.45);k.lineTo(cx+2,h*.45);},null,3);},
 xmoons(g,w,h){g.fillStyle='#14213d';g.fillRect(0,0,w,h);const P=[0,.28,.5,1,-.5,-.28];P.forEach((ph,i)=>{const cx=w*(i%2?.72:.28),cy=h*(.18+Math.floor(i/2)*.31),r=w*.17;g.save();g.beginPath();g.arc(cx,cy,r,0,7);g.clip();g.fillStyle='#fcefb4';g.fillRect(cx-r,cy-r,r*2,r*2);if(ph!==0){g.fillStyle='#14213d';g.beginPath();g.arc(cx+(ph>0?-1:1)*Math.abs(ph)*r*1.4+(ph>0?-r*.1:r*.1),cy,r*.98,0,7);if(ph===1)g.rect(cx-r,cy-r,r*2,r*2);g.fill();}g.restore();g.strokeStyle='#fcefb4';g.lineWidth=4;g.beginPath();g.arc(cx,cy,r,0,7);g.stroke();});
  [[.5,.06],[.05,.5],[.95,.5],[.5,.96],[.5,.52]].forEach(([x,y])=>FD(g,w*x,h*y,5,'#fcefb4'));},
 sfruit(g,w,h){g.fillStyle='#f1e3d3';g.fillRect(0,0,w,h);g.fillStyle='#b08968';g.fillRect(0,h*.74,w,h*.26);g.strokeStyle=INK;g.lineWidth=4;g.beginPath();g.moveTo(0,h*.74);g.lineTo(w,h*.74);g.stroke();
  FE(g,w*.62,h*.4,w*.075,h*.07,'#9d4edd');FE(g,w*.7,h*.43,w*.075,h*.07,'#9d4edd');FE(g,w*.66,h*.5,w*.075,h*.07,'#9d4edd');FL(g,k=>{k.moveTo(w*.64,h*.36);k.lineTo(w*.7,h*.28);},null,4);
  FL(g,k=>{k.moveTo(w*.3,h*.52);k.bezierCurveTo(w*.18,h*.4,w*.3,h*.2,w*.34,h*.22);k.bezierCurveTo(w*.4,h*.24,w*.46,h*.48,w*.44,h*.54);k.closePath();},'#90be6d');FL(g,k=>{k.moveTo(w*.35,h*.22);k.lineTo(w*.36,h*.16);},null,5);
  FD(g,w*.3,h*.58,w*.12+3,INK);FD(g,w*.3,h*.58,w*.12,'#e63946');FL(g,k=>{k.moveTo(w*.3,h*.46);k.lineTo(w*.32,h*.4);},null,5);FE(g,w*.34,h*.42,w*.04,h*.02,'#52b788',-.5,3);
  FD(g,w*.52,h*.57,w*.12+3,INK);FD(g,w*.52,h*.57,w*.12,'#f77f00');FL(g,k=>{k.moveTo(w*.52,h*.46);k.lineTo(w*.5,h*.4);},null,5);
  FL(g,k=>{k.moveTo(w*.14,h*.54);k.quadraticCurveTo(w*.5,h*.78,w*.86,h*.54);k.lineTo(w*.86,h*.58);k.quadraticCurveTo(w*.5,h*.86,w*.14,h*.58);k.closePath();},'#ffd166');
  FL(g,k=>{k.moveTo(w*.1,h*.58);k.lineTo(w*.9,h*.58);k.quadraticCurveTo(w*.84,h*.8,w*.6,h*.82);k.lineTo(w*.4,h*.82);k.quadraticCurveTo(w*.16,h*.8,w*.1,h*.58);k.closePath();},'#3d5a80');FL(g,k=>k.rect(w*.34,h*.82,w*.32,h*.025),'#293241');},
 steapot(g,w,h){g.fillStyle='#fdf0d5';g.fillRect(0,0,w,h);g.fillStyle='#c1121f';g.fillRect(0,h*.72,w,h*.28);g.strokeStyle=INK;g.lineWidth=4;g.beginPath();g.moveTo(0,h*.72);g.lineTo(w,h*.72);g.stroke();
  g.strokeStyle='#b7c4cf';g.lineWidth=6;g.lineCap='round';[[.3,.2],[.4,.16],[.5,.2]].forEach(([x,y])=>{g.beginPath();g.moveTo(w*x,h*(y+.1));g.quadraticCurveTo(w*(x+.04),h*(y+.05),w*x,h*y);g.stroke();});
  FL(g,k=>{k.moveTo(w*.7,h*.46);k.quadraticCurveTo(w*.95,h*.4,w*.92,h*.3);k.lineTo(w*.88,h*.3);k.quadraticCurveTo(w*.86,h*.4,w*.68,h*.5);k.closePath();},'#3d5a80');
  FL(g,k=>{k.moveTo(w*.3,h*.46);k.quadraticCurveTo(w*.06,h*.42,w*.1,h*.6);k.quadraticCurveTo(w*.14,h*.68,w*.3,h*.62);},null,12);g.strokeStyle='#3d5a80';g.lineWidth=7;g.beginPath();g.moveTo(w*.3,h*.46);g.quadraticCurveTo(w*.06,h*.42,w*.1,h*.6);g.quadraticCurveTo(w*.14,h*.68,w*.3,h*.62);g.stroke();
  FE(g,w*.5,h*.54,w*.22,h*.16,'#3d5a80');FE(g,w*.5,h*.4,w*.15,h*.04,'#98c1d9');FD(g,w*.5,h*.34,w*.03+3,INK);FD(g,w*.5,h*.34,w*.03,'#ee6c4d');
  g.strokeStyle='#e0fbfc';g.lineWidth=4;g.beginPath();g.arc(w*.5,h*.54,w*.14,.1*Math.PI,.9*Math.PI);g.stroke();
  [[.2,.9],[.74,.9]].forEach(([x,y])=>{});FE(g,w*.2,h*.86,w*.12,h*.025,'#e0fbfc');FL(g,k=>{k.moveTo(w*.12,h*.77);k.lineTo(w*.28,h*.77);k.quadraticCurveTo(w*.27,h*.85,w*.2,h*.85);k.quadraticCurveTo(w*.13,h*.85,w*.12,h*.77);},'#98c1d9');FE(g,w*.2,h*.77,w*.08,h*.012,'#6f4e37',0,3);
  FE(g,w*.78,h*.9,w*.14,h*.028,'#e0fbfc');FL(g,k=>{k.moveTo(w*.69,h*.8);k.lineTo(w*.87,h*.8);k.quadraticCurveTo(w*.86,h*.89,w*.78,h*.89);k.quadraticCurveTo(w*.7,h*.89,w*.69,h*.8);},'#98c1d9');FE(g,w*.78,h*.8,w*.09,h*.013,'#6f4e37',0,3);},
 scandle(g,w,h){g.fillStyle='#1d1b2f';g.fillRect(0,0,w,h);FD(g,w*.5,h*.28,w*.32,'#2c2a4a');FD(g,w*.5,h*.28,w*.2,'#3f3c6b');
  FL(g,k=>k.rect(w*.12,h*.78,w*.76,h*.14),'#e76f51');FL(g,k=>k.rect(w*.18,h*.64,w*.64,h*.14),'#2a9d8f');FL(g,k=>k.rect(w*.22,h*.52,w*.56,h*.12),'#e9c46a');
  g.strokeStyle=INK;g.lineWidth=4;[[.78,.14,.12],[.64,.14,.18],[.52,.12,.22]].forEach(([y,hh,x])=>{g.beginPath();g.moveTo(w*(x+.05),h*y);g.lineTo(w*(x+.05),h*(y+hh));g.moveTo(w*(x+.09),h*y);g.lineTo(w*(x+.09),h*(y+hh));g.stroke();});
  FL(g,k=>k.rect(w*.4,h*.3,w*.2,h*.22),'#fff1d6');FL(g,k=>{k.moveTo(w*.4,h*.3);k.quadraticCurveTo(w*.42,h*.36,w*.46,h*.3);},'#ffe0a3',3);g.strokeStyle=INK;g.lineWidth=4;g.beginPath();g.moveTo(w*.5,h*.3);g.lineTo(w*.5,h*.26);g.stroke();
  FL(g,k=>{k.moveTo(w*.5,h*.12);k.bezierCurveTo(w*.58,h*.18,w*.58,h*.26,w*.5,h*.27);k.bezierCurveTo(w*.42,h*.26,w*.42,h*.18,w*.5,h*.12);},'#ff9f1c');FL(g,k=>{k.moveTo(w*.5,h*.18);k.bezierCurveTo(w*.54,h*.21,w*.54,h*.25,w*.5,h*.26);k.bezierCurveTo(w*.46,h*.25,w*.46,h*.21,w*.5,h*.18);},'#ffe66d',3);},
 spine(g,w,h){g.fillStyle='#caf0f8';g.fillRect(0,0,w,h);g.fillStyle='#ffb703';g.fillRect(0,h*.78,w,h*.22);g.strokeStyle=INK;g.lineWidth=4;g.beginPath();g.moveTo(0,h*.78);g.lineTo(w,h*.78);g.stroke();
  [[.32,.3,'#2d6a4f'],[.38,.2,'#52b788'],[.5,.14,'#40916c'],[.62,.2,'#52b788'],[.68,.3,'#2d6a4f']].forEach(([x,y,c])=>FP(g,[[w*.5,h*.4],[w*x-w*.04,h*(y+.06)],[w*x,h*y],[w*x+w*.04,h*(y+.06)]],c));
  FE(g,w*.5,h*.6,w*.2,h*.22,'#f4a261');g.save();g.beginPath();g.ellipse(w*.5,h*.6,w*.2,h*.22,0,0,7);g.clip();g.strokeStyle='#bc6c25';g.lineWidth=4;for(let i=-6;i<=6;i++){g.beginPath();g.moveTo(w*.5+i*28-90,h*.36);g.lineTo(w*.5+i*28+90,h*.84);g.stroke();g.beginPath();g.moveTo(w*.5+i*28+90,h*.36);g.lineTo(w*.5+i*28-90,h*.84);g.stroke();}g.restore();g.strokeStyle=INK;g.lineWidth=4;g.beginPath();g.ellipse(w*.5,h*.6,w*.2,h*.22,0,0,7);g.stroke();
  FE(g,w*.18,h*.84,w*.13,h*.09,'#f94144',.2);FL(g,k=>{k.moveTo(w*.14,h*.76);k.lineTo(w*.1,h*.7);},null,5);FE(g,w*.13,h*.7,w*.05,h*.022,'#52b788',-.5,3);FE(g,w*.82,h*.86,w*.13,h*.085,'#f77f00',-.2);FL(g,k=>{k.moveTo(w*.84,h*.79);k.lineTo(w*.88,h*.73);},null,5);FE(g,w*.88,h*.725,w*.05,h*.02,'#52b788',.5,3);},
 sunset(g,w,h){g.fillStyle=lin(g,0,0,0,h*.66,[[0,'#3b1f8f'],[.45,'#c0398f'],[.75,'#ff7a3d'],[1,'#ffd34d']]);g.fillRect(0,0,w,h);
  g.fillStyle='#fff2a0';g.beginPath();g.arc(w*.55,h*.62,w*.13,0,7);g.fill();
  g.fillStyle=lin(g,0,h*.64,0,h,[[0,'#2a2a9a'],[1,'#0f1450']]);g.fillRect(0,h*.64,w,h*.36);
  g.strokeStyle='#ffd34d';g.lineCap='round';for(let i=0;i<9;i++){g.lineWidth=3+i*.5;g.globalAlpha=.8-i*.07;g.beginPath();const y=h*.67+i*h*.03,half=w*(.1-i*.008);g.moveTo(w*.55-half,y);g.lineTo(w*.55+half,y);g.stroke();}g.globalAlpha=1;
  g.fillStyle='#14102b';g.fillRect(0,h*.9,w,h*.1);
  g.strokeStyle='#14102b';g.lineWidth=11;g.beginPath();g.moveTo(w*.24,h*.92);g.quadraticCurveTo(w*.27,h*.55,w*.3,h*.3);g.stroke();
  g.lineWidth=7;[[-.2,.08],[-.14,-.02],[.0,-.06],[.14,-.02],[.2,.08],[-.1,.14],[.1,.14]].forEach(([dx,dy])=>{g.beginPath();g.moveTo(w*.3,h*.3);g.quadraticCurveTo(w*(.3+dx*.55),h*(.26+dy-.08),w*(.3+dx),h*(.3+dy+.06));g.stroke();});},
 flowers(g,w,h){g.fillStyle='#ffe9d6';g.fillRect(0,0,w,h);g.fillStyle='#d9b99b';g.fillRect(0,h*.82,w,h*.18);
  g.strokeStyle='#2f9e5b';g.lineWidth=6;[[.3,.3],[.5,.22],[.7,.32],[.4,.4],[.6,.42]].forEach(([x,y])=>{g.beginPath();g.moveTo(w*.5,h*.72);g.quadraticCurveTo(w*(x+.5)/2,h*(y+.6)/2,w*x,h*y);g.stroke();});
  [['#ff6fae',.3,.3],['#ffd23f',.5,.22],['#ff8a1f',.7,.32],['#7b4dff',.4,.4],['#e63946',.6,.42]].forEach(([c,x,y])=>{g.fillStyle=c;for(let i=0;i<7;i++){g.beginPath();g.ellipse(w*x+Math.cos(i*.9)*w*.06,h*y+Math.sin(i*.9)*w*.06,w*.045,w*.03,i*.9,0,7);g.fill();}g.fillStyle='#fff3b0';g.beginPath();g.arc(w*x,h*y,w*.025,0,7);g.fill();});
  g.fillStyle=lin(g,0,h*.66,w,h*.9,[[0,'#2d6cdf'],[1,'#1b3f99']]);g.beginPath();g.moveTo(w*.32,h*.66);g.lineTo(w*.68,h*.66);g.quadraticCurveTo(w*.76,h*.8,w*.64,h*.85);g.lineTo(w*.36,h*.85);g.quadraticCurveTo(w*.24,h*.8,w*.32,h*.66);g.fill();},
 mountains(g,w,h){g.fillStyle=lin(g,0,0,0,h*.6,[[0,'#8ec5ff'],[1,'#ffe3c2']]);g.fillRect(0,0,w,h);g.fillStyle='#fff6c9';g.beginPath();g.arc(w*.75,h*.2,w*.07,0,7);g.fill();
  g.fillStyle='#6b57c9';g.beginPath();g.moveTo(0,h*.6);g.lineTo(w*.3,h*.25);g.lineTo(w*.6,h*.6);g.fill();g.fillStyle='#4a3a9a';g.beginPath();g.moveTo(w*.35,h*.6);g.lineTo(w*.7,h*.3);g.lineTo(w,h*.6);g.fill();
  g.fillStyle='#fff';g.beginPath();g.moveTo(w*.3,h*.25);g.lineTo(w*.24,h*.34);g.lineTo(w*.36,h*.34);g.fill();
  g.fillStyle=lin(g,0,h*.6,0,h,[[0,'#4aa3d8'],[1,'#1c5a96']]);g.fillRect(0,h*.6,w,h*.4);g.globalAlpha=.35;g.fillStyle='#4a3a9a';g.beginPath();g.moveTo(w*.35,h*.6);g.lineTo(w*.7,h*.82);g.lineTo(w,h*.6);g.fill();g.globalAlpha=1;
  g.fillStyle='#1f6b46';[[.08,.6],[.16,.62],[.9,.6]].forEach(([x,y])=>{g.beginPath();g.moveTo(w*x,h*(y-.14));g.lineTo(w*(x-.05),h*y);g.lineTo(w*(x+.05),h*y);g.fill();});},
 city(g,w,h){g.fillStyle=lin(g,0,0,0,h,[[0,'#10163f'],[1,'#5b3fd4']]);g.fillRect(0,0,w,h);g.fillStyle='#fff6c9';g.beginPath();g.arc(w*.8,h*.15,w*.06,0,7);g.fill();
  const bs=[[.02,.5,.14],[.16,.35,.12],[.28,.55,.16],[.44,.3,.13],[.57,.48,.15],[.72,.38,.12],[.84,.52,.14]];bs.forEach(([x,y,bw],i)=>{g.fillStyle=i%2?'#1b1f4f':'#262a66';g.fillRect(w*x,h*y,w*bw,h*(1-y));g.fillStyle='#ffd34d';for(let r=0;r<9;r++)for(let c=0;c<3;c++)if((r*7+c*3+i)%3){g.fillRect(w*x+w*bw*(.15+c*.28),h*y+h*.03+r*h*.045,w*bw*.14,h*.025);}});},
 abstract(g,w,h){g.fillStyle='#fff4e0';g.fillRect(0,0,w,h);g.globalAlpha=.8;[['#ff6fae',.3,.3,.2],['#ffd23f',.62,.25,.17],['#2d6cdf',.5,.52,.24],['#2bb673',.25,.68,.17],['#ff8a1f',.72,.7,.2],['#7b4dff',.45,.85,.13]].forEach(([c,x,y,r])=>{g.fillStyle=c;g.beginPath();g.arc(w*x,h*y,w*r,0,7);g.fill();});g.globalAlpha=1;},
 cat(g,w,h){g.fillStyle='#ffd6e8';g.fillRect(0,0,w,h);g.fillStyle='#8a5a8f';g.fillRect(0,h*.85,w,h*.15);
  g.fillStyle='#f29a3d';g.beginPath();g.ellipse(w*.5,h*.68,w*.3,h*.2,0,0,7);g.fill();g.beginPath();g.arc(w*.5,h*.42,w*.24,0,7);g.fill();
  g.beginPath();g.moveTo(w*.29,h*.3);g.lineTo(w*.31,h*.14);g.lineTo(w*.44,h*.24);g.fill();g.beginPath();g.moveTo(w*.71,h*.3);g.lineTo(w*.69,h*.14);g.lineTo(w*.56,h*.24);g.fill();
  g.strokeStyle='#5a3414';g.lineWidth=5;g.lineCap='round';g.beginPath();g.arc(w*.4,h*.42,w*.04,.2,Math.PI-.2);g.stroke();g.beginPath();g.arc(w*.6,h*.42,w*.04,.2,Math.PI-.2);g.stroke();
  g.fillStyle='#ff6f91';g.beginPath();g.arc(w*.5,h*.48,w*.02,0,7);g.fill();g.strokeStyle='#5a3414';g.lineWidth=4;[[-1,-.01],[-1,.02],[1,-.01],[1,.02]].forEach(([s,d])=>{g.beginPath();g.moveTo(w*(.5+s*.05),h*(.49+d));g.lineTo(w*(.5+s*.16),h*(.47+d*2));g.stroke();});
  g.strokeStyle='#f29a3d';g.lineWidth=16;g.beginPath();g.moveTo(w*.78,h*.72);g.quadraticCurveTo(w*.95,h*.6,w*.86,h*.46);g.stroke();}
,
 sunflower(g,w,h){g.fillStyle=lin(g,0,0,0,h,[[0,'#bfe8ff'],[1,'#fff6d6']]);g.fillRect(0,0,w,h);g.fillStyle='#7bc96f';g.fillRect(0,h*.88,w,h*.12);
  g.strokeStyle='#2f9e5b';g.lineWidth=12;g.beginPath();g.moveTo(w*.5,h*.9);g.quadraticCurveTo(w*.46,h*.7,w*.5,h*.42);g.stroke();
  g.fillStyle='#3fae66';[[-1,.72],[1,.64]].forEach(([s,y])=>{g.beginPath();g.ellipse(w*(.5+s*.12),h*y,w*.12,h*.04,s*-.5,0,7);g.fill();});
  g.fillStyle='#ffc61a';for(let i=0;i<16;i++){const a=i/16*Math.PI*2;g.beginPath();g.ellipse(w*.5+Math.cos(a)*w*.2,h*.4+Math.sin(a)*w*.2,w*.1,w*.045,a,0,7);g.fill();}
  g.fillStyle='#ffa000';for(let i=0;i<16;i++){const a=i/16*Math.PI*2+.2;g.beginPath();g.ellipse(w*.5+Math.cos(a)*w*.14,h*.4+Math.sin(a)*w*.14,w*.07,w*.03,a,0,7);g.fill();}
  g.fillStyle='#5a3414';g.beginPath();g.arc(w*.5,h*.4,w*.12,0,7);g.fill();g.fillStyle='#3d220d';for(let i=0;i<14;i++){g.beginPath();g.arc(w*.5+Math.cos(i*2.4)*w*.01*i*.6,h*.4+Math.sin(i*2.4)*w*.01*i*.6,3,0,7);g.fill();}},
 fish(g,w,h){g.fillStyle=lin(g,0,0,0,h,[[0,'#d8f3ff'],[1,'#fff4e0']]);g.fillRect(0,0,w,h);g.fillStyle='#b98a5e';g.fillRect(0,h*.86,w,h*.14);
  g.fillStyle='rgba(120,200,240,.55)';g.beginPath();g.arc(w*.5,h*.56,w*.34,0,7);g.fill();g.strokeStyle='#7ab8d8';g.lineWidth=6;g.stroke();
  g.fillStyle='#d9b27a';g.beginPath();g.ellipse(w*.5,h*.8,w*.3,h*.04,0,0,Math.PI);g.fill();
  g.fillStyle='#ff8a1f';g.beginPath();g.ellipse(w*.48,h*.55,w*.13,h*.065,0,0,7);g.fill();g.beginPath();g.moveTo(w*.6,h*.55);g.lineTo(w*.72,h*.48);g.lineTo(w*.72,h*.62);g.fill();
  g.fillStyle='#fff';g.beginPath();g.arc(w*.42,h*.535,6,0,7);g.fill();g.fillStyle='#14102b';g.beginPath();g.arc(w*.42,h*.535,3,0,7);g.fill();
  g.strokeStyle='#fff';g.lineWidth=3;[[.3,.4,8],[.34,.34,6],[.3,.28,5]].forEach(([x,y,r])=>{g.beginPath();g.arc(w*x,h*y,r,0,7);g.stroke();});
  g.strokeStyle='#2bb673';g.lineWidth=7;[.38,.5,.62].forEach((x,i)=>{g.beginPath();g.moveTo(w*x,h*.8);g.quadraticCurveTo(w*(x+.04),h*(.7-i*.02),w*x,h*(.66-i*.02));g.stroke();});},
 house(g,w,h){g.fillStyle=lin(g,0,0,0,h*.7,[[0,'#8ec5ff'],[1,'#e8f6ff']]);g.fillRect(0,0,w,h);g.fillStyle='#7bc96f';g.fillRect(0,h*.7,w,h*.3);
  g.fillStyle='#fff6c9';g.beginPath();g.arc(w*.82,h*.14,w*.07,0,7);g.fill();
  g.fillStyle='#ffe2b8';g.fillRect(w*.22,h*.45,w*.5,h*.28);g.fillStyle='#d9503f';g.beginPath();g.moveTo(w*.16,h*.46);g.lineTo(w*.47,h*.27);g.lineTo(w*.78,h*.46);g.fill();
  g.fillStyle='#8a5a3b';g.fillRect(w*.41,h*.58,w*.12,h*.15);g.fillStyle='#8ec5ff';g.fillRect(w*.27,h*.52,w*.1,h*.09);g.fillRect(w*.58,h*.52,w*.1,h*.09);
  g.fillStyle='#8a5a3b';g.fillRect(w*.86,h*.55,w*.04,h*.2);g.fillStyle='#2f9e5b';g.beginPath();g.arc(w*.88,h*.5,w*.1,0,7);g.fill();
  g.fillStyle='#e8d9c0';g.fillRect(w*.1,h*.74,w*.8,h*.02);g.fillStyle='#ff6fae';[.2,.3,.62,.72].forEach(x=>{g.beginPath();g.arc(w*x,h*.78,7,0,7);g.fill();});},
 rocket(g,w,h){g.fillStyle=lin(g,0,0,0,h,[[0,'#0b0b2e'],[1,'#3a1c7a']]);g.fillRect(0,0,w,h);g.fillStyle='#fff';for(let i=0;i<30;i++){g.beginPath();g.arc((i*97%100)/100*w,(i*61%90)/100*h,1.5+i%3,0,7);g.fill();}
  g.fillStyle='#ffb04a';g.beginPath();g.arc(w*.2,h*.78,w*.1,0,7);g.fill();g.fillStyle='#6fd0ff';g.beginPath();g.arc(w*.8,h*.25,w*.06,0,7);g.fill();
  g.save();g.translate(w*.52,h*.45);g.rotate(.35);g.fillStyle='#ff7a3d';g.beginPath();g.moveTo(-w*.07,h*.18);g.lineTo(0,h*.38);g.lineTo(w*.07,h*.18);g.fill();
  g.fillStyle='#e8eaf6';g.beginPath();g.moveTo(0,-h*.22);g.quadraticCurveTo(w*.13,-h*.06,w*.1,h*.2);g.lineTo(-w*.1,h*.2);g.quadraticCurveTo(-w*.13,-h*.06,0,-h*.22);g.fill();
  g.fillStyle='#ff3d5a';g.beginPath();g.moveTo(0,-h*.22);g.quadraticCurveTo(w*.06,-h*.17,w*.075,-h*.12);g.lineTo(-w*.075,-h*.12);g.quadraticCurveTo(-w*.06,-h*.17,0,-h*.22);g.fill();
  g.fillStyle='#ff3d5a';g.beginPath();g.moveTo(-w*.1,h*.08);g.lineTo(-w*.2,h*.22);g.lineTo(-w*.1,h*.2);g.fill();g.beginPath();g.moveTo(w*.1,h*.08);g.lineTo(w*.2,h*.22);g.lineTo(w*.1,h*.2);g.fill();
  g.fillStyle='#3b82f6';g.beginPath();g.arc(0,0,w*.055,0,7);g.fill();g.strokeStyle='#fff';g.lineWidth=5;g.stroke();g.restore();},
 moonsea(g,w,h){g.fillStyle=lin(g,0,0,0,h,[[0,'#050a24'],[.55,'#16306b'],[1,'#0a1a3d']]);g.fillRect(0,0,w,h);
  g.fillStyle='#f6f1d8';g.beginPath();g.arc(w*.68,h*.24,w*.1,0,7);g.fill();g.fillStyle='rgba(246,241,216,.12)';g.beginPath();g.arc(w*.68,h*.24,w*.17,0,7);g.fill();
  for(let i=0;i<40;i++){g.fillStyle='rgba(255,255,255,'+(.3+.5*((i*37)%10)/10)+')';g.fillRect((i*97)%w,(i*53)%(h*.4),2,2);}
  g.fillStyle='#0b1c45';g.fillRect(0,h*.52,w,h*.48);
  for(let i=0;i<14;i++){g.strokeStyle='rgba(246,241,216,'+(.55-i*.035)+')';g.lineWidth=3;const y=h*.54+i*h*.03,ww=w*(.08+i*.02);g.beginPath();g.moveTo(w*.68-ww,y);g.lineTo(w*.68+ww,y);g.stroke();}
  g.strokeStyle='#1f3f85';g.lineWidth=4;for(let i=0;i<8;i++){const y=h*.58+i*h*.05;g.beginPath();g.moveTo(0,y);for(let x=0;x<=w;x+=20)g.lineTo(x,y+Math.sin(x/28+i)*6);g.stroke();}},
 dunes(g,w,h){g.fillStyle=lin(g,0,0,0,h*.6,[[0,'#f6c28b'],[.6,'#ee8a5b'],[1,'#c4565a']]);g.fillRect(0,0,w,h);
  g.fillStyle='#fff1c9';g.beginPath();g.arc(w*.3,h*.3,w*.09,0,7);g.fill();
  [['#a8453f',.52],['#8e3a3d',.62],['#6b2c36',.74],['#471e2e',.88]].forEach(([c,y],i)=>{g.fillStyle=c;g.beginPath();g.moveTo(0,h);g.lineTo(0,h*y);g.bezierCurveTo(w*.3,h*(y-.1+i*.01),w*.55,h*(y+.06),w,h*(y-.06));g.lineTo(w,h);g.fill();});},
 fluid(g,w,h){g.fillStyle='#0f1b3c';g.fillRect(0,0,w,h);const cols=['#ff4d6d','#ff9f1c','#ffd166','#06d6a0','#118ab2','#7b2ff7'];
  cols.forEach((c,i)=>{g.strokeStyle=c;g.lineWidth=46;g.lineCap='round';g.beginPath();g.moveTo(-20,h*(.1+i*.15));g.bezierCurveTo(w*.3,h*(i*.15-.1),w*.6,h*(i*.15+.35),w+20,h*(.05+i*.14));g.stroke();});
  g.strokeStyle='rgba(255,255,255,.35)';g.lineWidth=3;for(let i=0;i<6;i++){g.beginPath();g.moveTo(-20,h*(.08+i*.15));g.bezierCurveTo(w*.3,h*(i*.15-.12),w*.6,h*(i*.15+.33),w+20,h*(.03+i*.14));g.stroke();}},
 monstera(g,w,h){g.fillStyle=lin(g,0,0,w,h,[[0,'#06303a'],[1,'#0b4d3f']]);g.fillRect(0,0,w,h);
  const leaf=(x,y,s,r,c)=>{g.save();g.translate(x,y);g.rotate(r);g.fillStyle=c;g.beginPath();g.moveTo(0,0);g.bezierCurveTo(-s*.9,-s*.2,-s*.9,-s*1.1,0,-s*1.2);g.bezierCurveTo(s*.9,-s*1.1,s*.9,-s*.2,0,0);g.fill();
   g.strokeStyle='#06303a';g.lineWidth=5;g.beginPath();g.moveTo(0,0);g.lineTo(0,-s*1.1);g.stroke();for(let k=1;k<5;k++){g.beginPath();g.moveTo(0,-s*.22*k);g.lineTo(-s*.5,-s*(.22*k+.12));g.moveTo(0,-s*.22*k);g.lineTo(s*.5,-s*(.22*k+.12));g.stroke();}g.restore();};
  leaf(w*.3,h*.95,w*.5,-.5,'#1f9d6b');leaf(w*.72,h*.9,w*.46,.45,'#2fb67c');leaf(w*.5,h*.7,w*.4,.05,'#52d49a');leaf(w*.12,h*.5,w*.3,-1,'#17805a');leaf(w*.9,h*.45,w*.3,.9,'#1b8f64');},
 deco(g,w,h){g.fillStyle='#10132e';g.fillRect(0,0,w,h);const cx=w/2,cy=h*.72;
  for(let i=0;i<13;i++){const a=Math.PI+i*Math.PI/12;g.fillStyle=i%2?'#e8b04b':'#b8862e';g.beginPath();g.moveTo(cx,cy);g.arc(cx,cy,w*.95,a-.1,a+.1);g.fill();}
  [.42,.32,.22].forEach((r,i)=>{g.fillStyle=['#10132e','#e8b04b','#10132e'][i];g.beginPath();g.arc(cx,cy,w*r,Math.PI,0);g.fill();g.strokeStyle='#e8b04b';g.lineWidth=5;g.stroke();});
  g.fillStyle='#e8b04b';g.fillRect(0,cy,w,6);g.fillStyle='#1b1f4a';g.fillRect(0,cy+6,w,h);for(let i=0;i<6;i++){g.strokeStyle='#e8b04b';g.lineWidth=3;g.beginPath();g.moveTo(w*(i/5),cy+6);g.lineTo(w*(i/5),h);g.stroke();}},
 vinyl(g,w,h){g.fillStyle=lin(g,0,0,w,h,[[0,'#ff6b3d'],[1,'#8b1e5a']]);g.fillRect(0,0,w,h);const cx=w*.5,cy=h*.48;
  g.fillStyle='#111';g.beginPath();g.arc(cx,cy,w*.4,0,7);g.fill();for(let r=.12;r<.38;r+=.03){g.strokeStyle='rgba(255,255,255,.12)';g.lineWidth=2;g.beginPath();g.arc(cx,cy,w*r,0,7);g.stroke();}
  g.fillStyle='#ffd23f';g.beginPath();g.arc(cx,cy,w*.1,0,7);g.fill();g.fillStyle='#111';g.beginPath();g.arc(cx,cy,w*.016,0,7);g.fill();
  g.strokeStyle='rgba(255,255,255,.2)';g.lineWidth=14;g.beginPath();g.arc(cx,cy,w*.3,-2.6,-1.9);g.stroke();
  g.save();g.translate(w*.88,h*.1);g.rotate(.5);g.fillStyle='#ddd';g.fillRect(-4,0,8,h*.45);g.fillStyle='#999';g.fillRect(-12,h*.45,24,34);g.restore();},
 pines(g,w,h){g.fillStyle=lin(g,0,0,0,h,[[0,'#cfd8dc'],[1,'#8fa3ad']]);g.fillRect(0,0,w,h);
  [[.45,'#9fb3b8',.5],[.6,'#6f8a8f',.7],[.78,'#46636a',.9],[1,'#1f3a40',1.1]].forEach(([y,c,k],li)=>{g.fillStyle=c;for(let i=0;i<7;i++){const x=(i+.3*li)*w/6.2-20,t=h*(y-.38*k+((i*31+li*17)%10)/90),b=h*y+h*.2;g.beginPath();g.moveTo(x,t);g.lineTo(x-w*.1,b);g.lineTo(x+w*.1,b);g.fill();g.beginPath();g.moveTo(x,t+h*.08);g.lineTo(x-w*.13,b);g.lineTo(x+w*.13,b);g.fill();}
   g.fillStyle='rgba(235,240,243,.45)';g.fillRect(0,h*(y-.04),w,h*.07);});},
 neonrain(g,w,h){g.fillStyle=lin(g,0,0,0,h,[[0,'#120a2b'],[1,'#1e1040']]);g.fillRect(0,0,w,h);
  g.fillStyle='#1a1330';g.fillRect(0,h*.25,w*.3,h*.75);g.fillRect(w*.7,h*.15,w*.3,h*.85);g.fillStyle='#0c0820';g.fillRect(w*.3,h*.4,w*.4,h*.6);
  g.shadowBlur=22;g.shadowColor='#ff2e93';g.strokeStyle='#ff2e93';g.lineWidth=7;g.strokeRect(w*.04,h*.35,w*.2,h*.1);g.shadowColor='#00e5ff';g.strokeStyle='#00e5ff';g.strokeRect(w*.74,h*.28,w*.2,h*.1);g.shadowColor='#ffd23f';g.strokeStyle='#ffd23f';g.beginPath();g.arc(w*.5,h*.5,w*.06,0,7);g.stroke();g.shadowBlur=0;
  g.fillStyle='#2a1f4f';g.fillRect(0,h*.86,w,h*.14);g.fillStyle='rgba(255,46,147,.3)';g.fillRect(w*.05,h*.86,w*.2,h*.14);g.fillStyle='rgba(0,229,255,.3)';g.fillRect(w*.74,h*.86,w*.2,h*.14);
  g.strokeStyle='rgba(200,210,255,.45)';g.lineWidth=2;for(let i=0;i<70;i++){const x=(i*61)%w,y=(i*113)%h;g.beginPath();g.moveTo(x,y);g.lineTo(x-6,y+22);g.stroke();}
  g.fillStyle='#000';g.beginPath();g.arc(w*.5,h*.72,13,0,7);g.fill();g.fillRect(w*.5-12,h*.72+10,24,60);g.beginPath();g.moveTo(w*.5-24,h*.72+16);g.quadraticCurveTo(w*.5,h*.72-30,w*.5+24,h*.72+16);g.lineTo(w*.5,h*.72+16);g.fill();},
 bridge(g,w,h){g.fillStyle=lin(g,0,0,0,h*.6,[[0,'#2b2d6e'],[.5,'#d6537f'],[1,'#ffb36b']]);g.fillRect(0,0,w,h);
  g.fillStyle='#ffe2a8';g.beginPath();g.arc(w*.5,h*.46,w*.08,0,7);g.fill();
  g.fillStyle='#3a2a5a';g.fillRect(0,h*.62,w,h*.38);for(let i=0;i<12;i++){g.strokeStyle='rgba(255,226,168,'+(.5-i*.03)+')';g.lineWidth=3;const ww=w*(.06+i*.01);g.beginPath();g.moveTo(w*.5-ww,h*.64+i*h*.028);g.lineTo(w*.5+ww,h*.64+i*h*.028);g.stroke();}
  g.fillStyle='#1a1233';g.fillRect(0,h*.58,w,h*.05);for(let i=0;i<5;i++){const x=w*(.05+i*.22);g.beginPath();g.moveTo(x,h*.58);g.quadraticCurveTo(x+w*.11,h*.36,x+w*.22,h*.58);g.lineTo(x+w*.2,h*.58);g.quadraticCurveTo(x+w*.11,h*.42,x+w*.02,h*.58);g.fill();g.fillRect(x,h*.58,8,h*.1);}
  g.fillStyle='#ffe2a8';for(let i=0;i<24;i++)g.fillRect(i*w/23,h*.585,3,3);},
 aelephant(g,w,h){g.fillStyle='#f4a259';g.fillRect(0,0,w,h*.55);g.fillStyle='#e5634d';g.fillRect(0,h*.55,w,h*.25);FD(g,w*.3,h*.36,w*.13,'#ffd98a');g.fillStyle='#6b2e48';g.fillRect(0,h*.8,w,h*.2);
  const G='#7a8394',S=(pts,lw,col)=>{g.lineCap='round';g.lineJoin='round';[[lw+8,INK],[lw,col]].forEach(([l,c])=>{g.strokeStyle=c;g.lineWidth=l;g.beginPath();g.moveTo(pts[0][0],pts[0][1]);for(let i=1;i<pts.length;i++)g.lineTo(pts[i][0],pts[i][1]);g.stroke();});};
  [[.2],[.3],[.5],[.6]].forEach(([x])=>FL(g,k=>k.rect(w*x,h*.64,w*.085,h*.16),G));
  FE(g,w*.42,h*.6,w*.31,h*.17,G);FL(g,k=>{k.moveTo(w*.12,h*.54);k.quadraticCurveTo(w*.06,h*.64,w*.1,h*.74);},null,5);
  g.strokeStyle=INK;g.lineWidth=14;g.lineCap='round';g.beginPath();g.moveTo(w*.84,h*.5);g.bezierCurveTo(w*.95,h*.54,w*.97,h*.7,w*.88,h*.74);g.stroke();g.strokeStyle=G;g.lineWidth=7;g.beginPath();g.moveTo(w*.84,h*.5);g.bezierCurveTo(w*.95,h*.54,w*.97,h*.7,w*.88,h*.74);g.stroke();
  FE(g,w*.72,h*.5,w*.15,h*.15,G);g.strokeStyle=INK;g.lineWidth=36;g.beginPath();g.moveTo(w*.84,h*.52);g.bezierCurveTo(w*.9,h*.58,w*.92,h*.68,w*.84,h*.74);g.stroke();g.strokeStyle=G;g.lineWidth=28;g.beginPath();g.moveTo(w*.84,h*.52);g.bezierCurveTo(w*.9,h*.58,w*.92,h*.68,w*.84,h*.74);g.stroke();
  FE(g,w*.62,h*.52,w*.1,h*.17,'#6b7385',.15);FL(g,k=>{k.moveTo(w*.78,h*.58);k.quadraticCurveTo(w*.84,h*.64,w*.8,h*.7);k.lineTo(w*.76,h*.62);k.closePath();},'#fbf4e4',3);FD(g,w*.74,h*.47,5,INK);},
 afox(g,w,h){g.fillStyle='#1f2a5a';g.fillRect(0,0,w,h);FD(g,w*.74,h*.2,w*.11,'#f5ecd0');[[.15,.1],[.3,.2],[.5,.08],[.85,.38],[.12,.35]].forEach(([x,y])=>FD(g,w*x,h*y,3,'#f5ecd0'));
  FE(g,w*.5,h*1.0,w*.7,h*.17,'#e8eefc');
  FL(g,k=>{k.moveTo(w*.6,h*.82);k.bezierCurveTo(w*.95,h*.84,w*1,h*.52,w*.84,h*.5);k.bezierCurveTo(w*.84,h*.62,w*.76,h*.72,w*.62,h*.72);k.closePath();},'#f07a24');FL(g,k=>{k.moveTo(w*.84,h*.5);k.bezierCurveTo(w*.96,h*.5,w*.99,h*.6,w*.96,h*.64);k.bezierCurveTo(w*.92,h*.58,w*.88,h*.56,w*.84,h*.5);k.closePath();},'#fff6e8');
  FE(g,w*.5,h*.66,w*.17,h*.19,'#f07a24');FE(g,w*.5,h*.7,w*.08,h*.14,'#fff6e8',0,3);
  FP(g,[[w*.38,h*.4],[w*.36,h*.21],[w*.47,h*.32]],'#f07a24');FP(g,[[w*.62,h*.4],[w*.64,h*.21],[w*.53,h*.32]],'#f07a24');
  FE(g,w*.5,h*.4,w*.14,h*.1,'#f07a24');FP(g,[[w*.38,h*.43],[w*.62,h*.43],[w*.5,h*.53]],'#fff6e8');FD(g,w*.5,h*.515,8,INK);
  [[.43],[.57]].forEach(([x])=>{FD(g,w*x,h*.4,6,INK);});FL(g,k=>k.rect(w*.42,h*.82,w*.05,h*.09),INK);FL(g,k=>k.rect(w*.53,h*.82,w*.05,h*.09),INK);},
 astag(g,w,h){g.fillStyle='#0f4c5c';g.fillRect(0,0,w,h);FD(g,w*.5,h*.4,w*.3,'#f4e9c1');g.fillStyle=INK;g.fillRect(0,h*.8,w,h*.2);const D='#10151c';
  const S=(pts,lw)=>{g.strokeStyle=D;g.lineWidth=lw;g.lineCap='round';g.lineJoin='round';g.beginPath();g.moveTo(pts[0][0]*w,pts[0][1]*h);for(let i=1;i<pts.length;i++)g.lineTo(pts[i][0]*w,pts[i][1]*h);g.stroke();};
  [[.34,.64,.33,.8],[.4,.66,.42,.8],[.58,.66,.57,.8],[.64,.64,.66,.8]].forEach(([a,b,c,d])=>S([[a,b],[c,d]],11));
  FE(g,w*.5,h*.6,w*.2,h*.08,D,0,0);S([[.62,.58],[.7,.42]],34);FE(g,w*.74,h*.38,w*.07,h*.04,D,.5,0);
  S([[.72,.34],[.62,.2],[.56,.12]],7);S([[.66,.26],[.56,.24]],6);S([[.64,.22],[.7,.12]],6);S([[.74,.34],[.82,.2],[.86,.1]],7);S([[.8,.24],[.7,.2]],6);S([[.82,.2],[.9,.22]],6);FP(g,[[w*.7,h*.36],[w*.68,h*.3],[w*.74,h*.33]],D,2);},
 alion(g,w,h){g.fillStyle='#f6c453';g.fillRect(0,0,w,h);const cx=w/2,cy=h*.46;
  for(let i=0;i<18;i++){const a=i*Math.PI/9;FP(g,[[cx+Math.cos(a-.17)*w*.3,cy+Math.sin(a-.17)*w*.3],[cx+Math.cos(a)*w*.5,cy+Math.sin(a)*w*.5],[cx+Math.cos(a+.17)*w*.3,cy+Math.sin(a+.17)*w*.3]],'#d9622b',3);}
  FD(g,cx,cy,w*.31,'#a63a1c');FE(g,cx,cy,w*.25,w*.27,'#f0a64a');FE(g,cx-w*.22,cy-w*.2,18,22,'#f0a64a');FE(g,cx+w*.22,cy-w*.2,18,22,'#f0a64a');
  FD(g,cx-w*.1,cy-w*.05,8,INK);FD(g,cx+w*.1,cy-w*.05,8,INK);FP(g,[[cx-18,cy+8],[cx+18,cy+8],[cx,cy+30]],'#6b2e24');
  FL(g,k=>{k.moveTo(cx,cy+30);k.lineTo(cx,cy+48);k.moveTo(cx-34,cy+56);k.quadraticCurveTo(cx,cy+34,cx+34,cy+56);},null,4);},
 aflamingo(g,w,h){g.fillStyle='#0f766e';g.fillRect(0,0,w,h);[[.1,.2,.5],[.9,.3,-.5],[.15,.75,.9],[.88,.82,-.8]].forEach(([x,y,r])=>{g.save();g.translate(w*x,h*y);g.rotate(r);FE(g,0,0,w*.28,w*.07,'#0b5a54',0,3);g.restore();});
  FD(g,w*.5,h*.9,0,'#0f766e');g.strokeStyle=INK;g.lineWidth=5;g.lineCap='round';g.beginPath();g.moveTo(w*.5,h*.72);g.lineTo(w*.5,h*.92);g.moveTo(w*.56,h*.72);g.lineTo(w*.62,h*.88);g.stroke();
  FL(g,k=>{k.moveTo(w*.62,h*.5);k.bezierCurveTo(w*.9,h*.46,w*.78,h*.7,w*.5,h*.72);k.bezierCurveTo(w*.3,h*.72,w*.3,h*.52,w*.62,h*.5);k.closePath();},'#ff7ea8');
  FL(g,k=>{k.moveTo(w*.52,h*.56);k.bezierCurveTo(w*.7,h*.52,w*.78,h*.6,w*.7,h*.66);k.bezierCurveTo(w*.6,h*.7,w*.46,h*.64,w*.52,h*.56);},'#ffb3cc',3);
  g.strokeStyle=INK;g.lineWidth=30;g.lineCap='round';g.beginPath();g.moveTo(w*.38,h*.56);g.bezierCurveTo(w*.2,h*.44,w*.5,h*.34,w*.34,h*.2);g.stroke();g.strokeStyle='#ff7ea8';g.lineWidth=22;g.beginPath();g.moveTo(w*.38,h*.56);g.bezierCurveTo(w*.2,h*.44,w*.5,h*.34,w*.34,h*.2);g.stroke();
  FD(g,w*.34,h*.17,22,INK);FD(g,w*.34,h*.17,18,'#ff7ea8');FL(g,k=>{k.moveTo(w*.3,h*.16);k.lineTo(w*.18,h*.2);k.lineTo(w*.3,h*.22);k.closePath();},'#f6e3a0',4);FD(g,w*.35,h*.155,3,INK);},
 awhale(g,w,h){g.fillStyle='#ff9966';g.fillRect(0,0,w,h*.3);g.fillStyle='#ff5e62';g.fillRect(0,h*.3,w,h*.25);g.fillStyle='#8a2a6e';g.fillRect(0,h*.55,w,h*.1);FD(g,w*.5,h*.58,w*.16,'#ffe1a8');g.fillStyle='#1c2a5a';g.fillRect(0,h*.6,w,h*.4);
  FE(g,w*.5,h*.62,w*.2,h*.015,'#ffe1a8',0,0);
  FL(g,k=>{k.moveTo(w*.46,h*.9);k.quadraticCurveTo(w*.48,h*.66,w*.5,h*.62);k.quadraticCurveTo(w*.52,h*.66,w*.54,h*.9);k.closePath();},'#0d1736');
  FL(g,k=>{k.moveTo(w*.5,h*.62);k.quadraticCurveTo(w*.34,h*.6,w*.2,h*.44);k.quadraticCurveTo(w*.3,h*.42,w*.4,h*.46);k.quadraticCurveTo(w*.46,h*.5,w*.5,h*.56);k.quadraticCurveTo(w*.54,h*.5,w*.6,h*.46);k.quadraticCurveTo(w*.7,h*.42,w*.8,h*.44);k.quadraticCurveTo(w*.66,h*.6,w*.5,h*.62);},'#0d1736');
  g.strokeStyle='#ffd8c0';g.lineWidth=4;[[.4,.9,.2],[.5,.92,.3],[.6,.9,.2]].forEach(([x,y,r])=>{g.beginPath();g.ellipse(w*x,h*y,w*r*.5,h*.015,0,0,7);g.stroke();});},
 asun(g,w,h){g.fillStyle='#f6ead4';g.fillRect(0,0,w,h);const cx=w/2,cy=h*.66;['#3d405b','#81b29a','#f2cc8f','#e07a5f'].forEach((c,i)=>{FL(g,k=>k.arc(cx,cy,w*(.46-i*.09),Math.PI,0),c,4);});FL(g,k=>k.arc(cx,cy,w*.1,Math.PI,0),'#fff1c9',4);
  FP(g,[[0,h*.8],[w*.22,h*.56],[w*.5,h*.8]],'#2f3e46');FP(g,[[w*.3,h*.8],[w*.6,h*.5],[w*.95,h*.8]],'#354f52');FP(g,[[w*.7,h*.8],[w*.88,h*.62],[w,h*.8]],'#52796f');g.fillStyle='#2b2d42';g.fillRect(0,h*.8,w,h*.2);
  g.strokeStyle='#f2cc8f';g.lineWidth=4;g.lineCap='round';for(let i=0;i<9;i++){const a=Math.PI+i*Math.PI/8;g.beginPath();g.moveTo(cx+Math.cos(a)*w*.5,cy+Math.sin(a)*w*.5);g.lineTo(cx+Math.cos(a)*w*.57,cy+Math.sin(a)*w*.57);g.stroke();}},
 acat(g,w,h){g.fillStyle='#2b2d6e';g.fillRect(0,0,w,h);FD(g,w*.5,h*.4,w*.3,'#fff1c1');[[.12,.1],[.85,.15],[.9,.55],[.1,.6]].forEach(([x,y])=>FD(g,w*x,h*y,3,'#fff1c1'));g.fillStyle=INK;g.fillRect(0,h*.82,w,h*.18);const D='#0e0f1a';
  g.strokeStyle=D;g.lineCap='round';g.lineWidth=16;g.beginPath();g.moveTo(w*.66,h*.8);g.bezierCurveTo(w*.9,h*.8,w*.92,h*.62,w*.82,h*.56);g.stroke();
  FE(g,w*.5,h*.66,w*.17,h*.17,D,0,0);FD(g,w*.5,h*.42,w*.12,D);FP(g,[[w*.39,h*.4],[w*.38,h*.27],[w*.47,h*.34]],D,2);FP(g,[[w*.61,h*.4],[w*.62,h*.27],[w*.53,h*.34]],D,2);
  FD(g,w*.45,h*.42,7,'#ffd23f');FD(g,w*.55,h*.42,7,'#ffd23f');FD(g,w*.45,h*.42,3,D);FD(g,w*.55,h*.42,3,D);
  g.strokeStyle='#d9d9e8';g.lineWidth=2;[[-1],[1]].forEach(([m])=>{[0,6,12].forEach(o=>{g.beginPath();g.moveTo(w*.5+m*14,h*.46+o*.3);g.lineTo(w*.5+m*50,h*.45+o);g.stroke();});});
  g.fillStyle=D;g.fillRect(w*.38,h*.78,w*.08,h*.05);g.fillRect(w*.54,h*.78,w*.08,h*.05);},
 aowl(g,w,h){g.fillStyle='#3d2c5e';g.fillRect(0,0,w,h);FD(g,w*.8,h*.14,w*.08,'#f4e9c1');g.strokeStyle='#6b4a2a';g.lineWidth=14;g.lineCap='round';g.beginPath();g.moveTo(0,h*.84);g.lineTo(w,h*.8);g.stroke();
  FE(g,w*.5,h*.58,w*.26,h*.26,'#9c6b3f');FE(g,w*.5,h*.64,w*.16,h*.18,'#e8cfa4',0,3);
  for(let i=0;i<4;i++){FL(g,k=>{k.moveTo(w*(.42),h*(.56+i*.07));k.lineTo(w*.5,h*(.6+i*.07));k.lineTo(w*.58,h*(.56+i*.07));},null,3);}
  FP(g,[[w*.28,h*.36],[w*.3,h*.22],[w*.42,h*.32]],'#9c6b3f');FP(g,[[w*.72,h*.36],[w*.7,h*.22],[w*.58,h*.32]],'#9c6b3f');FE(g,w*.5,h*.38,w*.22,h*.14,'#9c6b3f');
  [[.4],[.6]].forEach(([x])=>{FD(g,w*x,h*.38,w*.085,INK);FD(g,w*x,h*.38,w*.07,'#ffd23f');FD(g,w*x,h*.38,w*.035,INK);});FP(g,[[w*.47,h*.43],[w*.53,h*.43],[w*.5,h*.5]],'#f2a33a');
  FE(g,w*.26,h*.6,w*.07,h*.16,'#7d5430',.2);FE(g,w*.74,h*.6,w*.07,h*.16,'#7d5430',-.2);[[.43],[.57]].forEach(([x])=>FL(g,k=>{k.moveTo(w*x,h*.82);k.lineTo(w*x,h*.86);},null,6));},
 abutterfly(g,w,h){g.fillStyle='#fdf0d5';g.fillRect(0,0,w,h);const cx=w/2,cy=h*.5;
  [-1,1].forEach(m=>{const X=a=>cx+m*a;
   FL(g,k=>{k.moveTo(cx,cy-10);k.bezierCurveTo(X(w*.5),cy-h*.4,X(w*.5),cy-h*.04,cx,cy+4);k.closePath();},'#ee6c4d');
   FL(g,k=>{k.moveTo(cx,cy+6);k.bezierCurveTo(X(w*.46),cy+h*.02,X(w*.42),cy+h*.3,cx,cy+h*.2);k.closePath();},'#3d5a80');
   FD(g,X(w*.28),cy-h*.14,w*.07,'#fdf0d5');FD(g,X(w*.28),cy-h*.14,w*.035,'#293241');FD(g,X(w*.24),cy+h*.1,w*.045,'#98c1d9');});
  FE(g,cx,cy+h*.04,9,h*.16,INK,0,3);FD(g,cx,cy-h*.14,11,INK);g.strokeStyle=INK;g.lineWidth=4;g.lineCap='round';g.beginPath();g.moveTo(cx-3,cy-h*.16);g.quadraticCurveTo(cx-30,cy-h*.28,cx-44,cy-h*.26);g.moveTo(cx+3,cy-h*.16);g.quadraticCurveTo(cx+30,cy-h*.28,cx+44,cy-h*.26);g.stroke();},
 bcamera(g,w,h){g.fillStyle='#ffd6a5';g.fillRect(0,0,w,h);g.fillStyle='#ffb877';g.fillRect(0,h*.76,w,h*.24);
  FL(g,k=>k.roundRect?k.roundRect(w*.14,h*.36,w*.72,h*.36,16):k.rect(w*.14,h*.36,w*.72,h*.36),'#2d3142');FL(g,k=>k.rect(w*.3,h*.28,w*.2,h*.08),'#2d3142');FL(g,k=>k.rect(w*.6,h*.3,w*.16,h*.06),'#bfc0c0');
  FL(g,k=>k.rect(w*.14,h*.46,w*.72,h*.07),'#ef8354',3);
  FD(g,w*.5,h*.57,w*.2,INK);FD(g,w*.5,h*.57,w*.18,'#bfc0c0');FD(g,w*.5,h*.57,w*.13,'#4f5d75');FD(g,w*.5,h*.57,w*.07,'#2d3142');FD(g,w*.46,h*.54,6,'#fff');
  FD(g,w*.78,h*.41,7,'#ffd23f');FL(g,k=>k.rect(w*.2,h*.4,w*.12,h*.04),'#fff1c9',3);},
 bguitar(g,w,h){g.fillStyle='#1f4068';g.fillRect(0,0,w,h);const cx=w*.5;
  FL(g,k=>k.rect(cx-w*.04,h*.12,w*.08,h*.5),'#7a4e2d');FP(g,[[cx-w*.07,h*.04],[cx+w*.07,h*.04],[cx+w*.06,h*.14],[cx-w*.06,h*.14]],'#4a2f1a');
  FD(g,cx,h*.7,w*.3+4,INK);FD(g,cx,h*.5,w*.21+4,INK);FD(g,cx,h*.7,w*.3,'#e08e45');FD(g,cx,h*.5,w*.21,'#e08e45');FD(g,cx,h*.6,w*.17,'#e08e45');
  FD(g,cx,h*.63,w*.09+4,INK);FD(g,cx,h*.63,w*.09,'#2b1a10');FL(g,k=>k.rect(cx-w*.11,h*.77,w*.22,h*.03),'#4a2f1a',3);
  g.strokeStyle='#f4f1de';g.lineWidth=2;for(let i=-2;i<=2;i++){g.beginPath();g.moveTo(cx+i*5,h*.14);g.lineTo(cx+i*5,h*.78);g.stroke();}
  [[-1],[1]].forEach(([m])=>[0,1,2].forEach(i=>FD(g,cx+m*w*.085,h*.06+i*h*.03,4,'#f4f1de')));},
 bheadphones(g,w,h){g.fillStyle='#6a4c93';g.fillRect(0,0,w,h);
  g.lineCap='round';g.strokeStyle=INK;g.lineWidth=40;g.beginPath();g.arc(w*.5,h*.54,w*.3,Math.PI,0);g.stroke();g.strokeStyle='#ffca3a';g.lineWidth=30;g.beginPath();g.arc(w*.5,h*.54,w*.3,Math.PI,0);g.stroke();
  FE(g,w*.2,h*.6,w*.1,h*.14,'#ff595e');FE(g,w*.8,h*.6,w*.1,h*.14,'#ff595e');FE(g,w*.2,h*.6,w*.05,h*.08,'#ffd6d8',0,3);FE(g,w*.8,h*.6,w*.05,h*.08,'#ffd6d8',0,3);
  [[.35,.2],[.55,.14],[.7,.24]].forEach(([x,y])=>{FD(g,w*x,h*(y+.06),w*.04+3,INK);FD(g,w*x,h*(y+.06),w*.04,'#8ac926');g.strokeStyle=INK;g.lineWidth=9;g.beginPath();g.moveTo(w*x+w*.04,h*(y+.06));g.lineTo(w*x+w*.04,h*(y-.06));g.stroke();g.strokeStyle='#8ac926';g.lineWidth=4;g.beginPath();g.moveTo(w*x+w*.04,h*(y+.06));g.lineTo(w*x+w*.04,h*(y-.06));g.stroke();});},
 btoast(g,w,h){g.fillStyle='#0b132b';g.fillRect(0,0,w,h);
  const glass=(x,y,rot)=>{g.save();g.translate(x,y);g.rotate(rot);FL(g,k=>{k.moveTo(-30,-150);k.lineTo(30,-150);k.bezierCurveTo(34,-90,18,-50,8,-30);k.lineTo(-8,-30);k.bezierCurveTo(-18,-50,-34,-90,-30,-150);k.closePath();},'#f6d365');FL(g,k=>{k.moveTo(-31,-150);k.lineTo(31,-150);k.lineTo(30,-124);k.lineTo(-30,-124);k.closePath();},'#fff1c9',3);FL(g,k=>k.rect(-5,-30,10,80),'#e8e8f0');FE(g,0,54,30,8,'#e8e8f0');[[-8,-95],[8,-75],[-4,-60],[10,-110]].forEach(([a,b])=>FD(g,a,b,3,'#fff'));g.restore();};
  glass(w*.34,h*.8,.28);glass(w*.66,h*.8,-.28);
  const star=(x,y,r)=>FP(g,[[x,y-r],[x+r*.25,y-r*.25],[x+r,y],[x+r*.25,y+r*.25],[x,y+r],[x-r*.25,y+r*.25],[x-r,y],[x-r*.25,y-r*.25]],'#ffd23f',2);star(w*.5,h*.38,34);star(w*.3,h*.22,18);star(w*.74,h*.2,22);star(w*.86,h*.42,12);star(w*.16,h*.42,14);},
 bperfume(g,w,h){g.fillStyle='#fde2e4';g.fillRect(0,0,w,h);g.fillStyle='#fad2e1';g.fillRect(0,h*.82,w,h*.18);const cx=w*.5;
  FL(g,k=>k.roundRect?k.roundRect(cx-w*.24,h*.42,w*.48,h*.4,22):k.rect(cx-w*.24,h*.42,w*.48,h*.4),'#cdb4db');FL(g,k=>k.roundRect?k.roundRect(cx-w*.18,h*.5,w*.36,h*.24,12):k.rect(cx-w*.18,h*.5,w*.36,h*.24),'#fff1f5',3);
  FL(g,k=>k.rect(cx-w*.07,h*.34,w*.14,h*.08),'#d4a017');FL(g,k=>k.roundRect?k.roundRect(cx-w*.12,h*.2,w*.24,h*.14,10):k.rect(cx-w*.12,h*.2,w*.24,h*.14),'#ffd23f');
  FD(g,cx,h*.62,w*.06+3,INK);FD(g,cx,h*.62,w*.06,'#d4a017');FL(g,k=>{k.moveTo(cx-w*.1,h*.7);k.lineTo(cx+w*.1,h*.7);},null,3);
  g.strokeStyle='rgba(255,255,255,.7)';g.lineWidth=7;g.lineCap='round';g.beginPath();g.moveTo(cx-w*.19,h*.5);g.lineTo(cx-w*.19,h*.76);g.stroke();
  [[.78,.3],[.84,.4],[.74,.42]].forEach(([x,y])=>FD(g,w*x,h*y,5,'#ffb3c6'));[[.2,.3],[.14,.4]].forEach(([x,y])=>FD(g,w*x,h*y,5,'#ffb3c6'));},
 hafro(g,w,h){g.fillStyle='#f9c74f';g.fillRect(0,0,w,h);const cx=w/2,SK='#8d5524';
  FP(g,[[w*.18,h],[w*.22,h*.84],[w*.4,h*.74],[w*.6,h*.74],[w*.78,h*.84],[w*.82,h]],'#e63946');FL(g,k=>k.rect(cx-w*.07,h*.6,w*.14,h*.16),SK);
  FD(g,cx,h*.36,w*.3+4,INK);FD(g,cx,h*.36,w*.3,'#241a2e');FE(g,cx,h*.44,w*.15,h*.19,SK);
  g.strokeStyle=INK;g.lineWidth=5;g.lineCap='round';[[-1],[1]].forEach(([m])=>{g.beginPath();g.moveTo(cx+m*w*.04,h*.42);g.quadraticCurveTo(cx+m*w*.09,h*.4,cx+m*w*.12,h*.425);g.stroke();g.beginPath();g.moveTo(cx+m*w*.045,h*.37);g.quadraticCurveTo(cx+m*w*.09,h*.35,cx+m*w*.125,h*.37);g.stroke();});
  FL(g,k=>{k.moveTo(cx-6,h*.44);k.lineTo(cx-10,h*.5);k.lineTo(cx+2,h*.5);},null,3);FE(g,cx,h*.555,w*.05,h*.018,'#c1121f',0,3);
  [[-1],[1]].forEach(([m])=>{g.strokeStyle='#e0a100';g.lineWidth=7;g.beginPath();g.arc(cx+m*w*.16,h*.56,w*.045,0,7);g.stroke();});},
 hdance(g,w,h){g.fillStyle='#3d2645';g.fillRect(0,0,w,h);FD(g,w*.5,h*.46,w*.46,'#573560');g.fillStyle='#2a1b33';g.fillRect(0,h*.88,w,h*.12);FE(g,w*.5,h*.9,w*.38,h*.025,'#1c1124',0,0);
  g.lineCap='round';g.lineJoin='round';const stroke=(pts,lw,col)=>{[[lw+7,INK],[lw,col]].forEach(([l,c])=>{g.strokeStyle=c;g.lineWidth=l;g.beginPath();g.moveTo(pts[0][0]*w,pts[0][1]*h);for(let i=1;i<pts.length;i++)g.lineTo(pts[i][0]*w,pts[i][1]*h);g.stroke();});};
  /* man */
  FP(g,[[w*.2,h*.9],[w*.22,h*.6],[w*.32,h*.6],[w*.34,h*.9]],'#14142b');FP(g,[[w*.33,h*.9],[w*.34,h*.6],[w*.44,h*.6],[w*.45,h*.9]],'#1c1c3a');FD(g,w*.27,h*.91,w*.04,'#0a0a14');FD(g,w*.4,h*.91,w*.04,'#0a0a14');
  FP(g,[[w*.18,h*.62],[w*.2,h*.38],[w*.46,h*.38],[w*.48,h*.62]],'#1c1c3a');FP(g,[[w*.3,h*.38],[w*.34,h*.5],[w*.38,h*.38]],'#f6f6f6',3);FP(g,[[w*.31,h*.42],[w*.34,h*.4],[w*.37,h*.42],[w*.34,h*.45]],'#c1121f',2);
  stroke([[.45,.42],[.56,.38],[.6,.3]],20,'#1c1c3a');FD(g,w*.6,h*.29,w*.028,'#6b3e26');stroke([[.2,.44],[.16,.54],[.3,.54]],18,'#1c1c3a');FD(g,w*.3,h*.54,w*.028,'#6b3e26');
  FL(g,k=>k.rect(w*.3,h*.3,w*.07,h*.08),'#6b3e26');FE(g,w*.335,h*.24,w*.075,h*.075,'#6b3e26');FL(g,k=>{k.moveTo(w*.26,h*.23);k.bezierCurveTo(w*.26,h*.15,w*.41,h*.15,w*.41,h*.23);k.bezierCurveTo(w*.38,h*.2,w*.29,h*.2,w*.26,h*.23);},'#1b1424',2);
  g.strokeStyle=INK;g.lineWidth=3;g.beginPath();g.arc(w*.35,h*.245,5,.15*Math.PI,.85*Math.PI);g.stroke();g.beginPath();g.moveTo(w*.34,h*.27);g.quadraticCurveTo(w*.355,h*.285,w*.37,h*.27);g.stroke();
  /* woman */
  FL(g,k=>{k.moveTo(w*.58,h*.5);k.bezierCurveTo(w*.5,h*.7,w*.5,h*.86,w*.58,h*.91);k.lineTo(w*.92,h*.91);k.bezierCurveTo(w*.98,h*.8,w*.9,h*.62,w*.78,h*.5);k.closePath();},'#e76f51');
  g.strokeStyle='#c4452c';g.lineWidth=4;[[.62,.66,.58,.88],[.7,.62,.7,.9],[.8,.64,.84,.88]].forEach(([a,b,c,d])=>{g.beginPath();g.moveTo(w*a,h*b);g.quadraticCurveTo(w*(a+c)/2+8,h*(b+d)/2,w*c,h*d);g.stroke();});
  FL(g,k=>{k.moveTo(w*.58,h*.5);k.lineTo(w*.6,h*.4);k.lineTo(w*.76,h*.4);k.lineTo(w*.78,h*.5);k.closePath();},'#f4a261');
  stroke([[.76,.42],[.8,.34],[.68,.28]],14,'#b5835a');FL(g,k=>k.rect(w*.64,h*.32,w*.06,h*.08),'#b5835a');FE(g,w*.675,h*.26,w*.07,h*.07,'#b5835a',.2);FD(g,w*.68,h*.19,w*.045,'#1b1424');FL(g,k=>{k.moveTo(w*.61,h*.25);k.bezierCurveTo(w*.62,h*.17,w*.74,h*.17,w*.74,h*.25);k.bezierCurveTo(w*.7,h*.21,w*.65,h*.21,w*.61,h*.25);},'#1b1424',2);
  g.strokeStyle=INK;g.lineWidth=3;g.beginPath();g.arc(w*.69,h*.265,4,.15*Math.PI,.85*Math.PI);g.stroke();FE(g,w*.69,h*.295,w*.02,h*.008,'#c1121f',0,2);FD(g,w*.74,h*.285,w*.012,'#ffd23f');},
 hpop(g,w,h){g.fillStyle='#3a86ff';g.fillRect(0,0,w,h);const cx=w/2;
  FP(g,[[w*.1,h],[w*.16,h*.82],[w*.38,h*.72],[w*.62,h*.72],[w*.84,h*.82],[w*.9,h]],'#ff006e');FP(g,[[w*.42,h*.72],[w*.5,h*.8],[w*.58,h*.72],[w*.5,h*.7]],'#fff');FL(g,k=>k.rect(cx-w*.08,h*.6,w*.16,h*.14),'#6b3e26');
  FE(g,cx,h*.46,w*.19,h*.2,'#6b3e26');FL(g,k=>{k.moveTo(w*.31,h*.38);k.bezierCurveTo(w*.3,h*.2,w*.7,h*.2,w*.69,h*.38);k.closePath();},'#ffbe0b');FL(g,k=>{k.moveTo(w*.28,h*.38);k.lineTo(w*.2,h*.4);k.lineTo(w*.72,h*.4);k.lineTo(w*.7,h*.36);k.closePath();},'#fb8500');
  FL(g,k=>k.rect(w*.3,h*.45,w*.17,h*.07),INK,4);FL(g,k=>k.rect(w*.53,h*.45,w*.17,h*.07),INK,4);g.strokeStyle=INK;g.lineWidth=5;g.beginPath();g.moveTo(w*.47,h*.47);g.lineTo(w*.53,h*.47);g.stroke();g.strokeStyle='#fff';g.lineWidth=4;g.beginPath();g.moveTo(w*.33,h*.47);g.lineTo(w*.38,h*.47);g.moveTo(w*.56,h*.47);g.lineTo(w*.61,h*.47);g.stroke();
  FL(g,k=>{k.moveTo(w*.4,h*.59);k.quadraticCurveTo(cx,h*.64,w*.6,h*.59);},null,5);FL(g,k=>{k.moveTo(cx-6,h*.52);k.lineTo(cx-10,h*.56);k.lineTo(cx+2,h*.56);},null,3);},
 hflower(g,w,h){g.fillStyle='#cdeac0';g.fillRect(0,0,w,h);const cx=w/2,SK='#c68642';
  FL(g,k=>{k.moveTo(w*.22,h*.9);k.bezierCurveTo(w*.1,h*.5,w*.2,h*.2,cx,h*.2);k.bezierCurveTo(w*.8,h*.2,w*.9,h*.5,w*.78,h*.9);k.lineTo(w*.66,h*.9);k.lineTo(w*.66,h*.5);k.lineTo(w*.34,h*.5);k.lineTo(w*.34,h*.9);k.closePath();},'#2b1a14');
  FP(g,[[w*.2,h],[w*.26,h*.84],[w*.42,h*.76],[w*.58,h*.76],[w*.74,h*.84],[w*.8,h]],'#f28482');FL(g,k=>k.rect(cx-w*.06,h*.64,w*.12,h*.14),SK);FE(g,cx,h*.46,w*.14,h*.19,SK);
  FL(g,k=>{k.moveTo(w*.34,h*.4);k.bezierCurveTo(w*.34,h*.26,w*.66,h*.26,w*.66,h*.4);k.bezierCurveTo(w*.6,h*.34,w*.4,h*.34,w*.34,h*.4);},'#2b1a14',3);
  g.strokeStyle=INK;g.lineWidth=4;g.lineCap='round';[[-1],[1]].forEach(([m])=>{g.beginPath();g.arc(cx+m*w*.065,h*.45,w*.028,.15*Math.PI,.85*Math.PI);g.stroke();});FE(g,cx,h*.56,w*.04,h*.014,'#d62839',0,3);FL(g,k=>{k.moveTo(cx-4,h*.47);k.lineTo(cx-7,h*.52);k.lineTo(cx+2,h*.52);},null,3);
  [[.32,.28,'#ff595e'],[.4,.22,'#ffca3a'],[.5,.2,'#fff'],[.6,.22,'#ffca3a'],[.68,.28,'#ff595e']].forEach(([x,y,c])=>{FD(g,w*x,h*y,w*.045+3,INK);FD(g,w*x,h*y,w*.045,c);FD(g,w*x,h*y,w*.015,'#8338ec');});},
 hsax(g,w,h){g.fillStyle='#3c096c';g.fillRect(0,0,w,h);FP(g,[[w*.1,0],[w*.4,h*.86],[w*.02,h*.86]],'#5a189a',0);FP(g,[[w*.9,0],[w*.6,h*.86],[w*.98,h*.86]],'#5a189a',0);FD(g,w*.78,h*.16,w*.07,'#ffe5a0');
  g.fillStyle='#10002b';g.fillRect(0,h*.9,w,h*.1);g.lineCap='round';g.lineJoin='round';const D='#1d1d2e';
  FP(g,[[w*.16,h*.92],[w*.2,h*.62],[w*.76,h*.62],[w*.8,h*.92]],D);FP(g,[[w*.42,h*.62],[w*.5,h*.8],[w*.58,h*.62]],'#f1f1f1',3);FP(g,[[w*.47,h*.66],[w*.5,h*.64],[w*.53,h*.66],[w*.5,h*.72]],'#c1121f',2);
  FL(g,k=>k.rect(w*.43,h*.54,w*.1,h*.1),'#7a4a2a');FE(g,w*.48,h*.45,w*.12,h*.12,'#7a4a2a');
  FE(g,w*.48,h*.355,w*.22,h*.035,'#2b2b3d');FL(g,k=>{k.moveTo(w*.35,h*.35);k.lineTo(w*.37,h*.2);k.quadraticCurveTo(w*.48,h*.17,w*.59,h*.2);k.lineTo(w*.61,h*.35);k.closePath();},'#2b2b3d');FL(g,k=>k.rect(w*.355,h*.31,w*.25,h*.035),'#c1121f',3);
  g.strokeStyle=INK;g.lineWidth=4;g.beginPath();g.arc(w*.43,h*.44,6,.15*Math.PI,.85*Math.PI);g.stroke();g.beginPath();g.arc(w*.54,h*.44,6,.15*Math.PI,.85*Math.PI);g.stroke();g.beginPath();g.moveTo(w*.485,h*.45);g.lineTo(w*.475,h*.5);g.lineTo(w*.5,h*.5);g.stroke();
  FE(g,w*.45,h*.48,6,5,'#b9683a',0,0);FE(g,w*.53,h*.48,6,5,'#b9683a',0,0);
  g.strokeStyle=INK;g.lineWidth=30;g.beginPath();g.moveTo(w*.54,h*.5);g.bezierCurveTo(w*.66,h*.5,w*.66,h*.6,w*.66,h*.7);g.bezierCurveTo(w*.66,h*.9,w*.9,h*.9,w*.88,h*.7);g.stroke();
  g.strokeStyle='#ffca3a';g.lineWidth=22;g.beginPath();g.moveTo(w*.54,h*.5);g.bezierCurveTo(w*.66,h*.5,w*.66,h*.6,w*.66,h*.7);g.bezierCurveTo(w*.66,h*.9,w*.9,h*.9,w*.88,h*.7);g.stroke();
  FE(g,w*.88,h*.68,w*.07,h*.025,'#ffca3a',0,4);FE(g,w*.88,h*.68,w*.045,h*.012,'#b8860b',0,0);
  [[.66,.58],[.66,.65],[.67,.72]].forEach(([x,y])=>{FD(g,w*x,h*y,6,'#fff1c9');});FD(g,w*.62,h*.6,w*.03,'#7a4a2a');FD(g,w*.62,h*.7,w*.03,'#7a4a2a');
  [[.12,.3],[.86,.42],[.2,.5]].forEach(([x,y])=>{FD(g,w*x,h*y,6,'#ffe5a0');g.strokeStyle='#ffe5a0';g.lineWidth=3;g.beginPath();g.moveTo(w*x+6,h*y);g.lineTo(w*x+6,h*y-26);g.stroke();});},
 balloon(g,w,h){g.fillStyle=lin(g,0,0,0,h,[[0,'#7ec8ff'],[1,'#ffe9c9']]);g.fillRect(0,0,w,h);
  g.fillStyle='rgba(255,255,255,.85)';[[.2,.2,.1],[.75,.3,.08],[.3,.82,.09]].forEach(([x,y,r])=>{g.beginPath();g.arc(w*x,h*y,w*r,0,7);g.arc(w*(x+.08),h*y+4,w*r*.8,0,7);g.fill();});
  const cx=w*.5,cy=h*.34,rx=w*.24,ry=h*.23;g.save();g.beginPath();g.ellipse(cx,cy,rx,ry,0,0,7);g.clip();
  ['#ff5a3c','#ffd23f','#3ddc97','#6c4bff','#ff7ab8'].forEach((c,i)=>{g.fillStyle=c;g.fillRect(cx-rx+i*rx*.4,cy-ry,rx*.4+1,ry*2);});g.restore();
  g.strokeStyle='#5a3414';g.lineWidth=3;g.beginPath();g.ellipse(cx,cy,rx,ry,0,0,7);g.stroke();
  g.strokeStyle='#5a3414';g.lineWidth=4;[[-.5,.7],[.5,.7]].forEach(([s])=>{g.beginPath();g.moveTo(cx+s*rx*.6,cy+ry*.9);g.lineTo(cx+s*w*.07,h*.66);g.stroke();});
  g.fillStyle='#b87a44';g.fillRect(cx-w*.08,h*.66,w*.16,h*.1);g.fillStyle='#8a5a3b';g.fillRect(cx-w*.08,h*.66,w*.16,6);
  g.fillStyle='#4aa86a';g.beginPath();g.moveTo(0,h*.92);g.quadraticCurveTo(w*.3,h*.82,w*.6,h*.9);g.quadraticCurveTo(w*.8,h*.84,w,h*.88);g.lineTo(w,h);g.lineTo(0,h);g.fill();}
};
/* Nigerian-style and everyday portraits (flat, bold outline) */
const RING=(g,x,y,r,c,lw)=>{g.strokeStyle=c;g.lineWidth=lw;g.beginPath();g.arc(x,y,r,0,7);g.stroke();};
/* eyes: each portrait picks its own line shape; lips/mouth styles differ too */
function pp_eyes(g,w,h,cx,ey,st){g.strokeStyle=INK;g.lineCap='round';
 [-1,1].forEach(m=>{const x=cx+m*w*.065;g.lineWidth=4;g.beginPath();
  if(st=='down')g.arc(x,ey,w*.028,.15*Math.PI,.85*Math.PI);
  else if(st=='up')g.arc(x,ey+h*.012,w*.03,1.15*Math.PI,1.85*Math.PI);
  else if(st=='flat'){g.moveTo(x-w*.032,ey);g.lineTo(x+w*.032,ey);}
  else if(st=='half'){g.moveTo(x-w*.035,ey-h*.004);g.quadraticCurveTo(x,ey+h*.016,x+w*.035,ey-h*.004);g.stroke();g.lineWidth=3;g.beginPath();g.moveTo(x+m*w*.032,ey-h*.002);g.lineTo(x+m*w*.05,ey-h*.014);}
  g.stroke();
  g.lineWidth=5;g.beginPath();g.moveTo(x-m*w*.025,ey-h*.03);g.quadraticCurveTo(x+m*w*.025,ey-h*.052,x+m*w*.055,ey-h*.027);g.stroke();});
 FL(g,k=>{k.moveTo(cx-6,ey+h*.012);k.lineTo(cx-10,ey+h*.062);k.lineTo(cx+2,ey+h*.062);},null,3);}
function pp_mouth(g,w,h,cx,y,st,c){g.strokeStyle=INK;g.lineCap='round';
 if(st=='lips')FE(g,cx,y,w*.05,h*.018,c||'#c1121f',0,3);
 if(st=='full'){FE(g,cx,y,w*.055,h*.024,c||'#9d0208',0,3);g.lineWidth=2.5;g.beginPath();g.moveTo(cx-w*.05,y);g.lineTo(cx+w*.05,y);g.stroke();}
 if(st=='grin'){FL(g,k=>{k.moveTo(cx-w*.05,y-h*.006);k.quadraticCurveTo(cx,y+h*.045,cx+w*.05,y-h*.006);k.closePath();},'#7a1020',3.5);FL(g,k=>{k.moveTo(cx-w*.04,y-h*.002);k.quadraticCurveTo(cx,y+h*.008,cx+w*.04,y-h*.002);},null,0);g.fillStyle='#fff';g.beginPath();g.moveTo(cx-w*.04,y-h*.002);g.quadraticCurveTo(cx,y+h*.012,cx+w*.04,y-h*.002);g.quadraticCurveTo(cx,y+h*.002,cx-w*.04,y-h*.002);g.fill();}
 if(st=='small')FE(g,cx,y,w*.03,h*.014,c||'#8a3b2a',0,3);}
const pp_drop=(g,w,h,cx,y,c)=>[-1,1].forEach(m=>{const x=cx+m*w*.155;FD(g,x,y-h*.015,4,c);FL(g,k=>{k.moveTo(x,y);k.lineTo(x-7,y+h*.035);k.lineTo(x,y+h*.075);k.lineTo(x+7,y+h*.035);k.closePath();},c,3);});
const pp_stars=(g,w,h,cx,y,c)=>[-1,1].forEach(m=>{const x=cx+m*w*.155;FL(g,k=>{k.moveTo(x,y-9);k.lineTo(x+9,y+8);k.lineTo(x-9,y+8);k.closePath();},c,3);FD(g,x,y+h*.04,5,c);});
const pp_hoops=(g,w,h,cx,y,c)=>[-1,1].forEach(m=>RING(g,cx+m*w*.16,y,w*.045,c||'#e0a100',7));
Object.assign(REFDRAW,{pgele(g,w,h){g.fillStyle='#7bdff2';g.fillRect(0,0,w,h);const cx=w/2,SK='#6b3e26';
 FP(g,[[w*.08,h],[w*.12,h*.84],[w*.34,h*.76],[w*.66,h*.76],[w*.88,h*.84],[w*.92,h]],'#2a9d8f');
 for(let i=0;i<7;i++)for(let j=0;j<3;j++)FD(g,w*(.2+i*.1),h*(.86+j*.055),5,'#ffd166');
 FL(g,k=>k.rect(cx-w*.06,h*.62,w*.12,h*.17),SK);
 FP(g,[[w*.34,h*.76],[w*.5,h*.82],[w*.66,h*.76],[w*.62,h*.72],[w*.38,h*.72]],'#ffd166',3);
 FE(g,cx,h*.47,w*.14,h*.18,SK);
 const wp=[[w*.3,h*.4],[w*.14,h*.3],[w*.16,h*.1],[w*.34,h*.1],[w*.42,h*.02],[w*.62,h*.04],[w*.7,h*.12],[w*.92,h*.08],[w*.92,h*.3],[w*.7,h*.4]];
 const P=k=>{k.moveTo(w*.3,h*.41);k.bezierCurveTo(w*.14,h*.3,w*.16,h*.1,w*.34,h*.1);k.bezierCurveTo(w*.42,h*.02,w*.62,h*.04,w*.7,h*.12);k.bezierCurveTo(w*.92,h*.08,w*.92,h*.3,w*.7,h*.41);k.bezierCurveTo(w*.6,h*.34,w*.4,h*.34,w*.3,h*.41);};
 FL(g,P,'#e63946');g.save();g.beginPath();P(g);g.clip();g.strokeStyle='#ffd166';g.lineWidth=7;for(let i=-4;i<12;i++){g.beginPath();g.moveTo(w*(.1+i*.08),h*.02);g.lineTo(w*(.0+i*.08),h*.44);g.stroke();}g.restore();
 g.strokeStyle=INK;g.lineWidth=4;g.beginPath();P(g);g.stroke();FL(g,k=>{k.moveTo(w*.7,h*.12);k.bezierCurveTo(w*.8,h*.2,w*.78,h*.3,w*.68,h*.37);},null,4);
 pp_eyes(g,w,h,cx,h*.465,'half');pp_mouth(g,w,h,cx,h*.57,'lips','#c1121f');pp_drop(g,w,h,cx,h*.52,'#e0a100');
 for(let i=0;i<9;i++){const t=i/8;FD(g,cx-w*.1+t*w*.2,h*.74+Math.sin(t*Math.PI)*h*.04,6,i%2?'#ffd166':'#e63946');}},
pkaftan(g,w,h){g.fillStyle='#e76f51';g.fillRect(0,0,w,h);const cx=w/2,SK='#4a2c1d';
 FP(g,[[w*.04,h],[w*.1,h*.82],[w*.34,h*.72],[w*.66,h*.72],[w*.9,h*.82],[w*.96,h]],'#2a9d8f');
 FL(g,k=>k.rect(cx-w*.07,h*.58,w*.14,h*.15),SK);
 FL(g,k=>{k.moveTo(w*.36,h*.72);k.quadraticCurveTo(cx,h*.82,w*.64,h*.72);k.lineTo(w*.6,h*.69);k.quadraticCurveTo(cx,h*.75,w*.4,h*.69);k.closePath();},'#e9c46a');
 FL(g,k=>{k.moveTo(cx,h*.77);k.lineTo(cx,h);},null,4);
 for(let i=0;i<5;i++){FD(g,cx-9,h*(.82+i*.035),4,'#e9c46a');FD(g,cx+9,h*(.82+i*.035),4,'#e9c46a');}
 [-1,1].forEach(m=>{for(let i=0;i<4;i++)FD(g,cx+m*w*(.2+i*.045),h*(.85+i*.025),5,'#e9c46a');});
 FE(g,cx,h*.45,w*.15,h*.19,SK);
 FL(g,k=>{k.moveTo(w*.345,h*.42);k.bezierCurveTo(w*.3,h*.14,w*.7,h*.14,w*.655,h*.42);k.lineTo(w*.635,h*.35);k.quadraticCurveTo(cx,h*.3,w*.365,h*.35);k.closePath();},'#1b1424',3);
 FL(g,k=>{k.moveTo(w*.42,h*.535);k.quadraticCurveTo(cx,h*.52,w*.58,h*.535);k.quadraticCurveTo(cx,h*.55,w*.42,h*.535);},'#1b1424',2);
 FL(g,k=>{k.moveTo(w*.43,h*.575);k.quadraticCurveTo(cx,h*.67,w*.57,h*.575);k.quadraticCurveTo(cx,h*.6,w*.43,h*.575);},'#1b1424',2);
 pp_eyes(g,w,h,cx,h*.43,'flat');g.strokeStyle='#fff';g.lineWidth=4;g.beginPath();g.moveTo(cx-w*.035,h*.558);g.quadraticCurveTo(cx,h*.575,cx+w*.035,h*.558);g.stroke();},
pbraids(g,w,h){g.fillStyle='#ffd166';g.fillRect(0,0,w,h);const cx=w/2,SK='#8d5524';
 const strand=(x0,y0,x1,y1)=>{const c=[(x0+x1)/2+(x1-x0)*.3,(y0+y1)/2];FL(g,k=>{k.moveTo(x0,y0);k.quadraticCurveTo(c[0],c[1],x1,y1);},null,17);g.strokeStyle='#2b1a14';g.lineWidth=11;g.beginPath();g.moveTo(x0,y0);g.quadraticCurveTo(c[0],c[1],x1,y1);g.stroke();FD(g,x1,y1+2,7,'#ffbe0b');};
 [-1,1].forEach(m=>{for(let i=0;i<3;i++)strand(cx+m*w*(.2+i*.05),h*.3+i*h*.04,cx+m*w*(.26+i*.06),h*.82+i*h*.02);});
 FP(g,[[w*.08,h],[w*.12,h*.84],[w*.34,h*.76],[w*.66,h*.76],[w*.88,h*.84],[w*.92,h]],'#3a86ff');
 FP(g,[[w*.38,h*.76],[w*.5,h*.84],[w*.62,h*.76],[w*.6,h*.98],[w*.4,h*.98]],'#ffbe0b',3);
 g.strokeStyle='#1d5fd0';g.lineWidth=3;[[.28,.82,.24,.98],[.72,.82,.76,.98]].forEach(([a,b,c,d])=>{g.beginPath();g.moveTo(w*a,h*b);g.lineTo(w*c,h*d);g.stroke();});
 FL(g,k=>k.rect(cx-w*.06,h*.62,w*.12,h*.16),SK);
 FE(g,cx,h*.46,w*.14,h*.19,SK);
 FL(g,k=>{k.moveTo(w*.325,h*.45);k.bezierCurveTo(w*.26,h*.1,w*.74,h*.1,w*.675,h*.45);k.bezierCurveTo(w*.67,h*.36,w*.6,h*.3,cx,h*.29);k.bezierCurveTo(w*.4,h*.3,w*.33,h*.36,w*.325,h*.45);},'#2b1a14');
 g.strokeStyle=INK;g.lineWidth=3;g.beginPath();g.moveTo(cx,h*.17);g.lineTo(cx,h*.29);g.stroke();
 pp_eyes(g,w,h,cx,h*.465,'up');pp_mouth(g,w,h,cx,h*.575,'full','#9d0208');pp_hoops(g,w,h,cx,h*.57,'#ffbe0b');},
phood(g,w,h){g.fillStyle='#8338ec';g.fillRect(0,0,w,h);const cx=w/2,SK='#5c3a21';
 FL(g,k=>{k.moveTo(w*.06,h);k.bezierCurveTo(w*.06,h*.8,w*.24,h*.72,w*.36,h*.7);k.lineTo(w*.64,h*.7);k.bezierCurveTo(w*.76,h*.72,w*.94,h*.8,w*.94,h);k.closePath();},'#ff8fab');
 FL(g,k=>{k.moveTo(w*.34,h*.7);k.bezierCurveTo(w*.36,h*.8,w*.64,h*.8,w*.66,h*.7);},null,4);
 g.strokeStyle='#fff';g.lineWidth=4;[-1,1].forEach(m=>{g.beginPath();g.moveTo(cx+m*w*.05,h*.78);g.lineTo(cx+m*w*.06,h*.9);g.stroke();});
 FL(g,k=>k.rect(cx-w*.06,h*.6,w*.12,h*.15),SK);
 FE(g,cx,h*.45,w*.145,h*.19,SK);
 for(let i=0;i<11;i++){const a=Math.PI*(1.05+i*.09);const x=cx+Math.cos(a)*w*.16,y=h*.37+Math.sin(a)*h*.19;FD(g,x,y-6,13,INK);FD(g,x,y-6,10,'#1b1424');}
 FL(g,k=>{k.moveTo(w*.34,h*.37);k.bezierCurveTo(w*.36,h*.24,w*.64,h*.24,w*.66,h*.37);k.bezierCurveTo(w*.6,h*.31,w*.4,h*.31,w*.34,h*.37);},'#1b1424',2);
 g.strokeStyle=INK;g.lineWidth=14;g.beginPath();g.arc(cx,h*.42,w*.2,Math.PI*1.08,Math.PI*1.92);g.stroke();g.strokeStyle='#ffd23f';g.lineWidth=8;g.beginPath();g.arc(cx,h*.42,w*.2,Math.PI*1.08,Math.PI*1.92);g.stroke();
 [-1,1].forEach(m=>FE(g,cx+m*w*.155,h*.46,w*.05,h*.07,'#ffd23f'));
 [-1,1].forEach(m=>{RING(g,cx+m*w*.065,h*.455,w*.055,INK,5);FD(g,cx+m*w*.065,h*.455,w*.014,INK);});g.strokeStyle=INK;g.lineWidth=4;g.beginPath();g.moveTo(cx-w*.01,h*.455);g.lineTo(cx+w*.01,h*.455);g.stroke();
 FL(g,k=>{k.moveTo(cx-3,h*.48);k.lineTo(cx-7,h*.52);k.lineTo(cx+3,h*.52);},null,3);pp_mouth(g,w,h,cx,h*.565,'small','#8a3b2a');},
ppuffs(g,w,h){g.fillStyle='#ffafcc';g.fillRect(0,0,w,h);const cx=w/2,SK='#a1662f';
 [.27,.73].forEach(x=>{FD(g,w*x,h*.2,w*.135+4,INK);FD(g,w*x,h*.2,w*.135,'#241a2e');});
 FP(g,[[w*.12,h],[w*.16,h*.84],[w*.38,h*.76],[w*.62,h*.76],[w*.84,h*.84],[w*.88,h]],'#ffbe0b');
 g.save();g.beginPath();g.moveTo(w*.12,h);g.lineTo(w*.16,h*.84);g.lineTo(w*.38,h*.76);g.lineTo(w*.62,h*.76);g.lineTo(w*.84,h*.84);g.lineTo(w*.88,h);g.closePath();g.clip();
 for(let i=0;i<5;i++)for(let j=0;j<3;j++){const x=w*(.2+i*.15)+(j%2)*w*.07,y=h*(.84+j*.08);RING(g,x,y,13,'#1d3557',5);FD(g,x,y,4,'#e63946');}g.restore();
 g.strokeStyle=INK;g.lineWidth=4;g.beginPath();g.moveTo(w*.12,h);g.lineTo(w*.16,h*.84);g.lineTo(w*.38,h*.76);g.lineTo(w*.62,h*.76);g.lineTo(w*.84,h*.84);g.lineTo(w*.88,h);g.stroke();
 FL(g,k=>k.rect(cx-w*.06,h*.62,w*.12,h*.16),SK);
 FE(g,cx,h*.46,w*.15,h*.19,SK);
 FL(g,k=>{k.moveTo(w*.34,h*.4);k.bezierCurveTo(w*.3,h*.16,w*.7,h*.16,w*.66,h*.4);k.bezierCurveTo(w*.6,h*.33,w*.4,h*.33,w*.34,h*.4);},'#241a2e',3);
 FL(g,k=>{k.moveTo(w*.33,h*.34);k.quadraticCurveTo(cx,h*.26,w*.67,h*.34);k.lineTo(w*.67,h*.37);k.quadraticCurveTo(cx,h*.29,w*.33,h*.37);k.closePath();},'#e63946',3);
 for(let i=0;i<13;i++){const t=i/12,a=Math.PI*(.12+t*.76);FD(g,cx-Math.cos(a)*w*.14,h*.72+Math.sin(a)*h*.05,5.5,['#e63946','#ffd23f','#3a86ff'][i%3]);}
 pp_eyes(g,w,h,cx,h*.465,'down');pp_mouth(g,w,h,cx,h*.57,'grin');pp_stars(g,w,h,cx,h*.52,'#ffd23f');}});

/* studio picker groups: every picture belongs to one type */
const REF_CATS=[['Portraits',['pgele','pkaftan','pbraids','phood','ppuffs','plocs','pcurls','pelder','psnap','pbeanie','pbob','phtie','pwaves','hafro','hpop','hflower','hrobe']],['People and music',['hdance','hsax','pfhand','pfseat']],['Animals',['cat','acat','fish','dkoi','aelephant','afox','astag','alion','aflamingo','awhale','aowl','abutterfly']],['Landscapes and places',['sunset','mountains','city','house','moonsea','dunes','pines','neonrain','bridge','asun','dlight','dcaravan','balloon','rocket','xmoons','deco']],['Flowers and plants',['flowers','sunflower','monstera']],['Objects',['bcamera','bguitar','bheadphones','btoast','bperfume','dboom','vinyl','dmartini']],['Still life and food',['sfruit','steapot','scandle','spine']],['Abstract',['abstract','fluid']]];
const refGroups=()=>{const seen=new Set(),out=[];REF_CATS.forEach(([t,ids])=>{const items=ids.map(i=>REFS.find(r=>r[0]===i)).filter(Boolean);items.forEach(r=>seen.add(r[0]));if(items.length)out.push([t,items]);});const rest=REFS.filter(r=>!seen.has(r[0]));if(rest.length)out.push(['More',rest]);return out;};
Object.assign(REFDRAW,{plocs(g,w,h){g.fillStyle='#2ec4b6';g.fillRect(0,0,w,h);const cx=w/2,SK='#5a3520';
 FP(g,[[w*.06,h],[w*.12,h*.82],[w*.36,h*.72],[w*.64,h*.72],[w*.88,h*.82],[w*.94,h]],'#f77f00');
 for(let i=0;i<4;i++)for(let j=0;j<3;j++){const x=w*(.2+i*.2)+(j%2)*w*.1,y=h*(.84+j*.055);FL(g,k=>{k.moveTo(x,y-9);k.lineTo(x+9,y+7);k.lineTo(x-9,y+7);k.closePath();},'#ffd23f',2.5);}
 FL(g,k=>k.rect(cx-w*.07,h*.58,w*.14,h*.15),SK);
 FP(g,[[w*.38,h*.72],[w*.5,h*.86],[w*.62,h*.72],[w*.58,h*.7],[w*.42,h*.7]],'#1b1424',3);
 FP(g,[[w*.43,h*.73],[w*.5,h*.83],[w*.57,h*.73]],'#ffd23f',3);
 FE(g,cx,h*.45,w*.15,h*.19,SK);
 FD(g,cx,h*.15,w*.095+4,INK);FD(g,cx,h*.15,w*.095,'#1b1424');
 FL(g,k=>{k.moveTo(w*.34,h*.42);k.bezierCurveTo(w*.28,h*.13,w*.72,h*.13,w*.66,h*.42);k.lineTo(w*.64,h*.34);k.quadraticCurveTo(cx,h*.29,w*.36,h*.34);k.closePath();},'#1b1424',3);
 g.strokeStyle='rgba(255,255,255,.25)';g.lineWidth=3;for(let i=0;i<4;i++){g.beginPath();g.moveTo(w*(.42+i*.05),h*.2);g.lineTo(w*(.43+i*.05),h*.3);g.stroke();}
 FL(g,k=>{k.moveTo(w*.35,h*.5);k.bezierCurveTo(w*.35,h*.68,w*.65,h*.68,w*.65,h*.5);k.bezierCurveTo(w*.6,h*.55,w*.56,h*.54,cx,h*.545);k.bezierCurveTo(w*.44,h*.54,w*.4,h*.55,w*.35,h*.5);},'#1b1424',3);
 pp_eyes(g,w,h,cx,h*.43,'up');
 g.strokeStyle='#fff';g.lineWidth=4;g.beginPath();g.moveTo(cx-w*.04,h*.585);g.quadraticCurveTo(cx,h*.607,cx+w*.04,h*.585);g.stroke();
 [-1,1].forEach(m=>FL(g,k=>k.rect(cx+m*w*.155-5,h*.5,10,10),'#ffd23f',3));},
pcurls(g,w,h){g.fillStyle='#c8b6ff';g.fillRect(0,0,w,h);const cx=w/2,SK='#8d5524';
 FP(g,[[w*.1,h],[w*.15,h*.84],[w*.38,h*.76],[w*.62,h*.76],[w*.85,h*.84],[w*.9,h]],'#264653');
 FP(g,[[w*.38,h*.76],[w*.5,h*.9],[w*.62,h*.76],[w*.57,h*.74],[w*.43,h*.74]],'#fff',3);
 FP(g,[[w*.38,h*.76],[w*.46,h*.88],[w*.5,h*.9],[w*.42,h*.8]],'#1d3641',3);FP(g,[[w*.62,h*.76],[w*.54,h*.88],[w*.5,h*.9],[w*.58,h*.8]],'#1d3641',3);
 FL(g,k=>k.rect(cx-w*.06,h*.62,w*.12,h*.15),SK);
 FE(g,cx,h*.46,w*.14,h*.19,SK);
 for(let i=0;i<9;i++){const a=Math.PI*(1+i*.125);const x=cx+Math.cos(a)*w*.17,y=h*.4+Math.sin(a)*h*.22;FD(g,x,y,w*.045+3,INK);}
 for(let i=0;i<9;i++){const a=Math.PI*(1+i*.125);const x=cx+Math.cos(a)*w*.17,y=h*.4+Math.sin(a)*h*.22;FD(g,x,y,w*.045,'#2b1a14');}
 FL(g,k=>{k.moveTo(w*.34,h*.42);k.bezierCurveTo(w*.3,h*.2,w*.7,h*.2,w*.66,h*.42);k.bezierCurveTo(w*.62,h*.34,w*.38,h*.34,w*.34,h*.42);},'#2b1a14',3);
 pp_eyes(g,w,h,cx,h*.47,'down');
 [-1,1].forEach(m=>{const x=cx+m*w*.065;FL(g,k=>{k.moveTo(x-w*.05,h*.45);k.lineTo(x+w*.05,h*.45);k.lineTo(x+w*.045,h*.5);k.lineTo(x-w*.045,h*.5);k.closePath();},null,5);});
 g.strokeStyle=INK;g.lineWidth=4;g.beginPath();g.moveTo(cx-w*.015,h*.46);g.lineTo(cx+w*.015,h*.46);g.stroke();
 pp_mouth(g,w,h,cx,h*.58,'lips','#d62839');
 [-1,1].forEach(m=>{const x=cx+m*w*.155;FL(g,k=>k.rect(x-3,h*.52,6,h*.06),'#ffd23f',3);});},
pelder(g,w,h){g.fillStyle='#f4a261';g.fillRect(0,0,w,h);const cx=w/2,SK='#8d5524';
 FP(g,[[w*.06,h],[w*.12,h*.82],[w*.36,h*.72],[w*.64,h*.72],[w*.88,h*.82],[w*.94,h]],'#f1e9d8');
 FL(g,k=>{k.moveTo(w*.36,h*.72);k.quadraticCurveTo(cx,h*.82,w*.64,h*.72);k.lineTo(w*.6,h*.69);k.quadraticCurveTo(cx,h*.76,w*.4,h*.69);k.closePath();},'#7a4a2a');
 for(let i=0;i<5;i++){FD(g,cx-w*.1+i*w*.05,h*(.745+Math.sin(i/4*Math.PI)*.02),3.5,'#ffd23f');}
 FL(g,k=>k.rect(cx-w*.07,h*.58,w*.14,h*.15),SK);
 FE(g,cx,h*.45,w*.16,h*.2,SK);
 const cap=k=>{k.moveTo(w*.3,h*.34);k.lineTo(w*.31,h*.18);k.quadraticCurveTo(cx,h*.1,w*.69,h*.18);k.lineTo(w*.7,h*.34);k.quadraticCurveTo(cx,h*.29,w*.3,h*.34);};
 FL(g,cap,'#fff');g.save();g.beginPath();cap(g);g.clip();[[.33,'#c1121f'],[.42,'#1b1424'],[.51,'#c1121f'],[.6,'#1b1424']].forEach(([x,c])=>{g.fillStyle=c;g.fillRect(w*x,0,w*.05,h);});g.restore();g.strokeStyle=INK;g.lineWidth=4;g.beginPath();cap(g);g.stroke();
  FL(g,k=>{k.moveTo(w*.335,h*.4);k.bezierCurveTo(w*.325,h*.7,w*.675,h*.7,w*.665,h*.4);k.bezierCurveTo(w*.665,h*.47,w*.63,h*.52,w*.58,h*.53);k.bezierCurveTo(w*.54,h*.5,w*.46,h*.5,w*.42,h*.53);k.bezierCurveTo(w*.37,h*.52,w*.335,h*.47,w*.335,h*.4);},'#e9e6e0',3.5);
 g.strokeStyle='#bdb9b0';g.lineWidth=2.5;[[.4,.575,.4,.6],[.46,.6,.46,.625],[.54,.6,.54,.625],[.6,.575,.6,.6]].forEach(([a,b,c,d])=>{g.beginPath();g.moveTo(w*a,h*b);g.quadraticCurveTo(w*a,h*(b+d)/2,w*c,h*d);g.stroke();});
 FL(g,k=>{k.moveTo(w*.4,h*.545);k.quadraticCurveTo(w*.45,h*.505,cx,h*.525);k.quadraticCurveTo(w*.55,h*.505,w*.6,h*.545);k.quadraticCurveTo(w*.55,h*.56,cx,h*.545);k.quadraticCurveTo(w*.45,h*.56,w*.4,h*.545);},'#f4f1ea',3);
 g.strokeStyle=INK;g.lineWidth=4;g.beginPath();g.moveTo(cx-w*.03,h*.585);g.quadraticCurveTo(cx,h*.595,cx+w*.03,h*.585);g.stroke();
 pp_eyes(g,w,h,cx,h*.44,'half');
 g.strokeStyle='rgba(27,20,36,.5)';g.lineWidth=3;[-1,1].forEach(m=>{g.beginPath();g.moveTo(cx+m*w*.05,h*.36);g.quadraticCurveTo(cx+m*w*.09,h*.345,cx+m*w*.12,h*.36);g.stroke();});},
psnap(g,w,h){g.fillStyle='#ffb703';g.fillRect(0,0,w,h);const cx=w/2,SK='#4a2c1d';
 FP(g,[[w*.08,h],[w*.14,h*.82],[w*.38,h*.72],[w*.62,h*.72],[w*.86,h*.82],[w*.92,h]],'#f8f9fa');
 FL(g,k=>k.rect(cx-w*.07,h*.58,w*.14,h*.15),SK);
 FL(g,k=>{k.moveTo(w*.36,h*.72);k.quadraticCurveTo(cx,h*.8,w*.64,h*.72);},'#e9ecef',4);
 FE(g,cx,h*.82,w*.12,h*.09,'#e63946',0,3);FD(g,cx,h*.82,w*.04,'#f8f9fa');
 for(let i=0;i<13;i++){const t=i/12;FD(g,cx-w*.13+t*w*.26,h*.735+Math.sin(t*Math.PI)*h*.09,4,'#ffd23f');}
 FD(g,cx,h*.855,8,'#ffd23f');
 FE(g,cx,h*.45,w*.17,h*.2,SK);
 FL(g,k=>{k.moveTo(w*.33,h*.385);k.bezierCurveTo(w*.3,h*.17,w*.7,h*.17,w*.67,h*.385);k.closePath();},'#1b1424');
 FL(g,k=>k.rect(cx-w*.02,h*.2,w*.04,h*.04),'#fb8500',3);
 FP(g,[[w*.28,h*.375],[w*.72,h*.375],[w*.77,h*.405],[w*.23,h*.405]],'#fb8500',4);
 [-1,1].forEach(m=>{FL(g,k=>{k.moveTo(cx+m*w*.025,h*.44);k.lineTo(cx+m*w*.155,h*.44);k.quadraticCurveTo(cx+m*w*.15,h*.5,cx+m*w*.09,h*.5);k.quadraticCurveTo(cx+m*w*.035,h*.5,cx+m*w*.025,h*.44);},INK,4);});
 g.strokeStyle='#f8f9fa';g.lineWidth=4;[-1,1].forEach(m=>{g.beginPath();g.moveTo(cx+m*w*.06,h*.455);g.lineTo(cx+m*w*.11,h*.455);g.stroke();});
 g.strokeStyle='#ffd23f';g.lineWidth=3;g.beginPath();g.moveTo(cx-w*.02,h*.445);g.lineTo(cx+w*.02,h*.445);g.stroke();
 FL(g,k=>{k.moveTo(cx-3,h*.53);k.lineTo(cx-7,h*.57);k.lineTo(cx+3,h*.57);},null,3);
 g.strokeStyle=INK;g.lineWidth=5;g.beginPath();g.moveTo(cx-w*.045,h*.62);g.lineTo(cx+w*.045,h*.62);g.stroke();},
pbeanie(g,w,h){g.fillStyle='#cdb4db';g.fillRect(0,0,w,h);const cx=w/2,SK='#6b3e26';
 FP(g,[[w*.1,h],[w*.15,h*.84],[w*.38,h*.76],[w*.62,h*.76],[w*.85,h*.84],[w*.9,h]],'#2d6a4f');
 FP(g,[[w*.38,h*.76],[w*.5,h*.84],[w*.62,h*.76],[w*.6,h],[w*.4,h]],'#f8f9fa',3);
 [[.15,.84,.14,.98],[.85,.84,.86,.98]].forEach(([a,b,c,d])=>FL(g,k=>{k.moveTo(w*a,h*b);k.lineTo(w*c,h*d);},null,4));
 FP(g,[[w*.34,h*.755],[w*.5,h*.8],[w*.66,h*.755],[w*.66,h*.72],[w*.5,h*.76],[w*.34,h*.72]],'#e9c46a',3);
 FL(g,k=>k.rect(cx-w*.06,h*.62,w*.12,h*.15),SK);
 FE(g,cx,h*.46,w*.14,h*.19,SK);
 FL(g,k=>{k.moveTo(w*.33,h*.36);k.bezierCurveTo(w*.3,h*.1,w*.7,h*.1,w*.67,h*.36);k.closePath();},'#f77f00');
 FD(g,cx,h*.1,w*.05+3,INK);FD(g,cx,h*.1,w*.05,'#fb8500');
 FL(g,k=>{k.moveTo(w*.3,h*.3);k.lineTo(w*.7,h*.3);k.lineTo(w*.72,h*.38);k.lineTo(w*.28,h*.38);k.closePath();},'#2d6a4f',4);
 g.strokeStyle='#1b4332';g.lineWidth=3;for(let i=0;i<9;i++){g.beginPath();g.moveTo(w*(.34+i*.04),h*.3);g.lineTo(w*(.34+i*.04),h*.38);g.stroke();}
 [-1,1].forEach(m=>{FE(g,cx+m*w*.07,h*.47,w*.062,h*.045,INK,0,4);});
 g.strokeStyle=INK;g.lineWidth=4;g.beginPath();g.moveTo(cx-w*.01,h*.465);g.lineTo(cx+w*.01,h*.465);g.stroke();
 g.strokeStyle='#fff';g.lineWidth=3.5;[-1,1].forEach(m=>{g.beginPath();g.moveTo(cx+m*w*.07-w*.03,h*.455);g.lineTo(cx+m*w*.07-w*.01,h*.452);g.stroke();});
 g.strokeStyle=INK;g.lineWidth=5;[-1,1].forEach(m=>{g.beginPath();g.moveTo(cx+m*w*.07,h*.41);g.quadraticCurveTo(cx+m*w*.1,h*.395,cx+m*w*.14,h*.41);g.stroke();});
 FL(g,k=>{k.moveTo(cx-3,h*.5);k.lineTo(cx-7,h*.545);k.lineTo(cx+3,h*.545);},null,3);
 g.lineWidth=5;g.beginPath();g.moveTo(cx-w*.04,h*.59);g.quadraticCurveTo(cx+w*.01,h*.595,cx+w*.05,h*.575);g.stroke();
 [-1,1].forEach(m=>{const x=cx+m*w*.155;FL(g,k=>{k.moveTo(x,h*.52);k.lineTo(x+7,h*.54);k.lineTo(x,h*.56);k.lineTo(x-7,h*.54);k.closePath();},'#ffd23f',3);});},
pbob(g,w,h){g.fillStyle='#ffe0cc';g.fillRect(0,0,w,h);const cx=w/2,SK='#b5703f';
 FL(g,k=>{k.moveTo(w*.28,h*.64);k.bezierCurveTo(w*.2,h*.34,w*.28,h*.14,cx,h*.14);k.bezierCurveTo(w*.72,h*.14,w*.8,h*.34,w*.72,h*.64);k.closePath();},'#2b1a14');
 FP(g,[[w*.12,h],[w*.16,h*.84],[w*.36,h*.76],[w*.64,h*.76],[w*.84,h*.84],[w*.88,h]],SK);
 FL(g,k=>k.rect(cx-w*.06,h*.62,w*.12,h*.16),SK);
 FL(g,k=>{k.moveTo(w*.1,h*.9);k.quadraticCurveTo(w*.3,h*.82,w*.5,h*.86);k.quadraticCurveTo(w*.7,h*.82,w*.9,h*.9);k.lineTo(w*.92,h);k.lineTo(w*.08,h);k.closePath();},'#9d0208');
 for(let i=0;i<8;i++){FD(g,w*(.14+i*.105),h*(i%2?.9:.88)+(i>3?0:0),4,'#ffd23f');}
 g.strokeStyle='#ffd23f';g.lineWidth=5;g.beginPath();g.moveTo(w*.1,h*.9);g.quadraticCurveTo(w*.3,h*.82,w*.5,h*.86);g.quadraticCurveTo(w*.7,h*.82,w*.9,h*.9);g.stroke();
 FE(g,cx,h*.46,w*.145,h*.19,SK);
 FL(g,k=>{k.moveTo(w*.33,h*.44);k.bezierCurveTo(w*.28,h*.14,w*.72,h*.14,w*.67,h*.44);k.bezierCurveTo(w*.66,h*.36,w*.62,h*.3,w*.54,h*.27);k.bezierCurveTo(w*.46,h*.32,w*.38,h*.36,w*.33,h*.44);},'#2b1a14',3);
 FL(g,k=>{k.moveTo(w*.3,h*.58);k.bezierCurveTo(w*.3,h*.5,w*.32,h*.46,w*.34,h*.44);},null,0);
 pp_eyes(g,w,h,cx,h*.465,'up');pp_mouth(g,w,h,cx,h*.57,'lips','#e76f51');
 [-1,1].forEach(m=>{const x=cx+m*w*.165;FD(g,x,h*.52,4,'#ffd23f');FL(g,k=>{k.moveTo(x,h*.535);k.bezierCurveTo(x+9,h*.55,x+9,h*.6,x,h*.62);k.bezierCurveTo(x-9,h*.6,x-9,h*.55,x,h*.535);},'#ffd23f',3);});
}});
function pp_bgd(g,w,h,st){const cx=w/2,W='rgba(255,255,255,';g.save();
 if(st=='arch'){g.fillStyle=W+'.4)';g.beginPath();g.moveTo(w*.1,h);g.lineTo(w*.1,h*.42);g.arc(cx,h*.42,w*.4,Math.PI,0);g.lineTo(w*.9,h);g.closePath();g.fill();g.fillStyle=W+'.3)';g.beginPath();g.moveTo(w*.2,h);g.lineTo(w*.2,h*.42);g.arc(cx,h*.42,w*.3,Math.PI,0);g.lineTo(w*.8,h);g.closePath();g.fill();}
 if(st=='diamond'){[.5,.36].forEach((r,i)=>{g.fillStyle=W+(.3+i*.12)+')';g.beginPath();g.moveTo(cx,h*.46-w*r*1.15);g.lineTo(cx+w*r,h*.46);g.lineTo(cx,h*.46+w*r*1.15);g.lineTo(cx-w*r,h*.46);g.closePath();g.fill();});}
 g.restore();}
Object.assign(REFDRAW,{phtie(g,w,h){g.fillStyle='#b7e4c7';g.fillRect(0,0,w,h);const cx=w/2,SK='#9a5b32';pp_bgd(g,w,h,'arch');
 FP(g,[[w*.1,h],[w*.14,h*.84],[w*.36,h*.76],[w*.64,h*.76],[w*.86,h*.84],[w*.9,h]],'#14697a');
 FL(g,k=>k.rect(cx-w*.06,h*.62,w*.12,h*.16),SK);
 FL(g,k=>{k.moveTo(w*.34,h*.76);k.quadraticCurveTo(cx,h*.94,w*.66,h*.76);k.closePath();},SK);
 FE(g,cx,h*.46,w*.14,h*.19,SK);
 const tie=k=>{k.moveTo(w*.29,h*.43);k.bezierCurveTo(w*.22,h*.1,w*.78,h*.1,w*.71,h*.43);k.bezierCurveTo(w*.62,h*.35,w*.38,h*.35,w*.29,h*.43);};
 FL(g,tie,'#e9c46a');g.save();g.beginPath();tie(g);g.clip();g.translate(cx,h*.25);g.rotate(-.6);g.fillStyle='#2a9d8f';for(let i=-8;i<9;i++)g.fillRect(i*40-10,-h,20,h*2);g.restore();
 g.strokeStyle=INK;g.lineWidth=4;g.beginPath();tie(g);g.stroke();
  FE(g,cx-w*.085,h*.205,w*.085,h*.05,'#c1121f',-.45,4);FE(g,cx+w*.085,h*.205,w*.085,h*.05,'#c1121f',.45,4);
 FD(g,cx,h*.225,w*.04+3,INK);FD(g,cx,h*.225,w*.04,'#ffd23f');
 pp_eyes(g,w,h,cx,h*.465,'half');pp_mouth(g,w,h,cx,h*.57,'lips','#9d0208');
 [-1,1].forEach(m=>{const x=cx+m*w*.155;FD(g,x,h*.52,4,'#ffd23f');FL(g,k=>{k.moveTo(x,h*.535);k.quadraticCurveTo(x+10,h*.58,x,h*.63);k.quadraticCurveTo(x-10,h*.58,x,h*.535);},'#ffd23f',3);});
 [[.09,.07,'#e63946'],[.125,.11,'#ffd23f'],[.16,.15,'#e63946']].forEach(([rx,ry,c],i)=>{for(let j=0;j<=10;j++){const a=Math.PI*(.12+j*.076);FD(g,cx+Math.cos(a)*w*rx,h*.7+Math.sin(a)*h*ry,5,j%2?c:'#ffd23f');}});
 FL(g,k=>{k.moveTo(cx-6,h*.855);k.lineTo(cx,h*.89);k.lineTo(cx+6,h*.855);k.closePath();},'#ffd23f',3);},
pwaves(g,w,h){g.fillStyle='#bde0fe';g.fillRect(0,0,w,h);const cx=w/2,SK='#8d5524';pp_bgd(g,w,h,'diamond');
 FL(g,k=>{k.moveTo(w*.26,h*.84);k.bezierCurveTo(w*.18,h*.4,w*.26,h*.12,cx,h*.12);k.bezierCurveTo(w*.74,h*.12,w*.82,h*.4,w*.74,h*.84);k.closePath();},'#2b1a14');
 FP(g,[[w*.12,h],[w*.16,h*.84],[w*.36,h*.76],[w*.64,h*.76],[w*.84,h*.84],[w*.88,h]],'#0b6e4f');
 FL(g,k=>k.rect(cx-w*.06,h*.62,w*.12,h*.16),SK);
 FL(g,k=>{k.moveTo(w*.38,h*.76);k.lineTo(cx,h*.92);k.lineTo(w*.62,h*.76);k.closePath();},SK);
 FE(g,cx,h*.46,w*.14,h*.19,SK);
 FL(g,k=>{k.moveTo(w*.325,h*.45);k.bezierCurveTo(w*.26,h*.1,w*.74,h*.1,w*.675,h*.45);k.bezierCurveTo(w*.67,h*.36,w*.58,h*.28,w*.5,h*.27);k.bezierCurveTo(w*.42,h*.28,w*.33,h*.36,w*.325,h*.45);},'#2b1a14');
 g.strokeStyle=INK;g.lineWidth=3;g.beginPath();g.moveTo(cx,h*.17);g.lineTo(cx,h*.27);g.stroke();
 [-1,1].forEach(m=>{FL(g,k=>{k.moveTo(cx+m*w*.17,h*.4);k.bezierCurveTo(cx+m*w*.24,h*.55,cx+m*w*.12,h*.66,cx+m*w*.2,h*.8);k.bezierCurveTo(cx+m*w*.27,h*.84,cx+m*w*.31,h*.76,cx+m*w*.27,h*.68);k.bezierCurveTo(cx+m*w*.33,h*.54,cx+m*w*.26,h*.44,cx+m*w*.2,h*.4);k.closePath();},'#2b1a14',3.5);});
 g.strokeStyle='rgba(255,255,255,.2)';g.lineWidth=3;[-1,1].forEach(m=>{g.beginPath();g.moveTo(cx+m*w*.2,h*.5);g.quadraticCurveTo(cx+m*w*.24,h*.6,cx+m*w*.22,h*.72);g.stroke();});
 pp_eyes(g,w,h,cx,h*.465,'down');pp_mouth(g,w,h,cx,h*.57,'lips','#d62839');
 [-1,1].forEach(m=>{const x=cx+m*w*.14;FD(g,x,h*.52,4,'#ffd23f');FL(g,k=>{k.moveTo(x,h*.535);k.quadraticCurveTo(x+7,h*.57,x,h*.61);k.quadraticCurveTo(x-7,h*.57,x,h*.535);},'#ffd23f',3);});
 for(let j=0;j<=14;j++){const a=Math.PI*(.1+j*.057);const x=cx+Math.cos(a)*w*.12,y=h*.7+Math.sin(a)*h*.13;FD(g,x,y,6.5,'#fff');g.strokeStyle=INK;g.lineWidth=2;g.beginPath();g.arc(x,y,6.5,0,7);g.stroke();}
 FL(g,k=>{k.moveTo(cx,h*.835);k.quadraticCurveTo(cx+12,h*.87,cx,h*.91);k.quadraticCurveTo(cx-12,h*.87,cx,h*.835);},'#ffd23f',3.5);
}});
/* traced flat-vector figures (green hand, purple seated) */
const PP_FIG={hand:[{"c":"#010000","d":"M267.1 58.6L267.1 59.7L272.6 65.1L277.3 68.4L283.9 71.3L293.7 72.1L300.6 70.2L302.4 68.8L301.0 65.9L297.0 64.0L284.2 63.3ZM262.0 49.5L262.4 50.6L267.5 48.0L277.0 45.1L287.9 44.8L294.1 46.6L302.1 51.7L303.9 50.6L303.2 46.9L299.2 42.9L294.4 40.4L288.2 38.9L279.9 39.3L274.1 41.1L266.8 45.1ZM154.7 0.0L150.3 22.9L149.2 22.6L147.8 17.5L144.9 12.7L140.1 9.8L136.1 9.8L132.5 11.6L129.9 14.2L126.3 20.7L121.9 35.7L117.9 57.1L114.7 82.2L112.1 117.9L110.3 123.4L99.0 140.8L87.0 156.5L38.6 209.6L26.2 228.2L19.3 243.4L16.4 254.0L15.3 262.4L16.0 274.7L19.0 285.3L26.2 298.4L44.1 317.0L47.3 323.5L47.7 328.2L45.9 335.2L42.2 341.7L38.2 346.8L14.6 370.8L7.0 381.4L2.2 390.5L-1.4 401.0L-3.2 412.3L-2.5 425.8L2.2 441.4L8.4 452.0L18.2 462.2L31.7 470.2L42.6 473.1L43.0 472.3L32.8 462.2L27.3 451.6L25.1 443.6L24.4 436.3L25.1 427.6L26.2 427.2L30.6 444.0L34.6 452.0L40.1 459.6L45.5 465.1L52.4 470.2L58.6 473.4L68.8 477.1L64.8 499.6L89.6 499.6L92.1 485.8L98.7 468.7L107.4 454.1L114.3 445.8L122.3 438.1L133.6 430.1L147.4 423.9L163.4 420.7L177.3 420.7L194.4 423.9L207.8 429.0L226.7 440.0L239.8 450.5L256.2 468.3L266.8 484.4L274.1 499.6L390.9 499.6L389.4 483.6L384.0 464.0L374.9 444.3L355.9 414.8L349.0 402.5L345.0 390.5L344.3 378.1L347.9 362.8L363.2 327.9L369.4 310.8L382.9 298.4L391.2 284.9L395.2 270.7L395.2 256.6L392.3 246.4L387.6 237.6L383.6 232.5L373.0 223.4L371.2 220.9L366.8 183.8L363.9 173.6L361.4 168.1L357.4 162.3L349.4 155.0L341.7 151.0L333.0 148.8L331.9 147.4L334.8 140.1L337.7 127.7L338.8 116.1L338.5 101.9L336.6 88.8L327.2 50.2L321.0 33.1L315.5 23.7L307.2 14.2L298.1 7.6L284.2 1.8L277.7 0.0L214.7 0.0L213.3 22.9L207.1 65.1L202.4 108.1L201.3 109.2L179.4 108.1L178.7 107.4L182.4 56.4L186.0 22.9L190.0 0.4L182.4 0.0L181.6 23.7L173.3 107.0L171.8 108.4L163.4 108.8L151.1 111.0L150.0 109.9L150.0 93.2L152.5 50.6L156.1 19.3L160.2 0.4ZM221.7 385.0L218.0 386.8L206.7 388.3L190.4 391.9L172.5 397.7L152.1 407.2L133.2 419.2L118.7 430.9L100.5 449.4L88.1 466.2L81.9 476.7L76.1 489.1L74.6 489.1L75.7 481.4L80.1 466.5L83.4 458.5L91.0 444.3L102.7 428.7L115.0 416.3L125.9 407.6L139.8 398.8L152.9 392.3L163.8 387.9L180.5 382.8L192.5 380.6L204.9 380.3L215.8 382.1ZM215.1 374.8L227.5 371.9L241.3 371.5L255.9 373.4L267.5 376.3L284.2 382.5L296.6 388.6L311.9 398.5L323.2 407.6L333.4 417.8L342.8 429.8L347.6 437.4L354.1 452.3L358.1 471.6L358.1 483.6L355.6 497.5L354.1 497.5L352.3 489.4L347.6 476.7L336.6 456.7L321.4 436.7L306.1 421.4L286.1 405.7L266.4 393.7L243.1 383.2L229.7 378.8L215.5 375.9ZM243.1 340.2L250.4 334.8L259.1 330.8L272.6 326.8L290.4 324.2L308.3 324.2L319.9 325.7L333.0 329.0L347.2 335.2L350.8 338.1L350.8 339.5L342.8 358.8L338.8 371.9L337.7 379.9L338.5 392.6L336.6 392.6L328.3 386.8L315.2 379.5L301.0 373.4L289.0 369.4L273.3 365.7L259.9 363.9L239.5 363.9L238.8 362.8L241.7 357.7L243.1 352.3ZM190.0 280.9L200.9 282.8L218.4 304.9L230.7 325.7L235.1 336.2L237.3 346.1L236.9 352.6L235.1 357.0L228.2 363.5L215.1 368.6L194.0 373.4L193.6 372.3L198.7 364.6L203.8 352.6L205.6 344.6L206.0 331.9L202.4 312.6L196.5 296.6L189.3 281.7ZM243.1 218.3L240.6 230.0L237.3 239.1L228.2 255.5L224.2 260.6L215.1 269.3L206.4 274.4L202.4 275.5L197.3 275.8L189.6 274.4L181.6 270.7L176.2 267.1L164.5 255.5L152.9 236.5L152.9 235.1L154.0 234.7L163.4 237.6L174.7 239.1L187.1 239.1L198.4 237.6L217.3 231.8L229.7 225.6L241.7 218.0ZM292.2 213.6L296.3 211.1L303.9 210.0L323.9 211.4L343.9 216.5L353.0 220.2L363.2 225.6L369.8 230.0L377.8 237.3L385.0 248.5L388.0 259.5L388.0 267.1L386.1 275.8L384.7 275.8L381.8 266.7L374.9 256.2L366.1 247.8L357.8 242.0L344.7 235.1L334.1 230.7L298.4 219.1L294.1 216.9L292.2 215.1ZM61.9 196.5L62.3 197.6L55.3 209.6L47.3 228.2L43.7 240.2L41.5 252.5L41.2 267.1L42.2 275.5L45.9 287.8L52.1 299.9L51.7 300.9L45.9 296.6L40.8 291.1L34.2 280.6L30.2 268.2L29.5 262.4L29.9 252.5L33.2 239.1L39.7 224.9L49.9 209.6ZM364.3 216.2L362.8 216.9L349.7 210.7L334.5 206.0L312.6 202.7L287.5 203.1L274.1 204.9L258.4 208.5L256.6 207.8L304.6 173.2L313.0 163.8L315.2 154.7L330.8 153.9L340.3 156.5L347.9 160.8L352.3 164.8L357.4 172.1L360.7 180.9L362.1 188.1ZM240.9 110.6L251.9 120.8L263.9 130.3L262.8 138.3L262.8 150.7L250.4 157.9L248.2 157.9L246.0 156.1L242.8 147.0L240.2 123.7L240.2 111.4ZM281.0 9.5L286.8 12.0L294.4 17.1L301.7 24.7L307.2 34.2L310.8 48.8L310.8 60.4L309.7 70.2L311.9 75.7L318.8 85.5L318.8 87.0L317.4 88.4L312.6 89.9L311.2 91.7L313.7 97.5L313.0 98.6L309.7 96.8L306.4 96.8L293.0 102.6L295.5 105.5L298.1 112.4L301.7 115.7L308.6 118.6L306.1 122.6L303.5 129.9L302.1 131.4L298.4 132.5L284.6 129.5L269.0 123.4L251.1 113.2L240.2 103.7L241.3 59.0L264.2 37.8L271.5 29.8L278.1 19.7L279.9 14.2L279.9 10.6ZM225.7 7.6L229.3 10.6L231.5 14.6L234.8 29.8L235.5 40.4L235.1 130.6L238.0 153.9L242.8 168.1L244.6 168.9L256.2 161.2L268.2 155.0L276.2 152.1L285.0 150.3L292.6 149.9L302.4 151.7L307.9 155.7L308.6 159.8L306.1 164.1L292.2 176.1L236.9 214.7L216.6 226.0L204.9 230.0L191.1 232.5L171.8 232.5L158.7 230.0L147.1 224.9L141.6 221.3L134.7 215.1L129.6 208.9L121.6 193.6L116.5 173.2L115.4 162.3L115.4 142.6L118.7 95.7L123.0 59.0L129.6 27.3L134.3 17.5L136.9 15.6L140.1 16.0L143.8 22.2L145.6 38.9L144.1 111.7L132.1 117.9L130.3 120.1L153.6 115.4L180.9 112.8L199.5 113.2L221.7 116.1L221.3 115.0L217.6 113.2L208.6 110.3L207.8 106.3L209.6 86.6L219.5 12.4L222.7 8.0Z"},{"c":"#12b886","d":"M221.3 385.0L215.8 382.5L204.9 380.6L192.5 381.0L180.5 383.2L163.8 388.3L152.9 392.6L139.8 399.2L125.9 407.9L115.0 416.7L103.0 428.7L91.4 444.3L83.7 458.5L80.5 466.5L76.1 481.4L75.0 489.1L75.7 489.1L81.6 476.7L87.7 466.2L100.1 449.4L113.9 434.9L133.2 418.9L152.1 406.8L172.5 397.4L190.4 391.6L206.7 387.9L218.0 386.5ZM215.5 374.8L215.5 375.5L229.7 378.5L243.1 382.8L266.4 393.4L286.1 405.4L306.1 421.0L321.7 436.7L337.0 456.7L347.9 476.7L352.7 489.4L354.5 497.5L355.2 497.5L357.8 483.6L357.8 471.6L353.7 452.3L350.5 444.0L342.5 429.8L333.0 417.8L323.2 407.9L311.9 398.8L296.6 389.0L284.2 382.8L267.5 376.6L255.9 373.7L241.3 371.9L227.5 372.3ZM190.0 281.3L198.7 300.9L202.7 312.6L206.4 331.9L206.0 344.6L204.2 352.6L199.1 364.6L194.0 373.0L215.1 368.3L228.2 363.2L234.8 357.0L236.6 352.6L236.9 346.1L234.8 336.2L230.4 325.7L218.0 304.9L200.9 283.1ZM292.6 213.6L292.6 215.1L294.1 216.5L298.4 218.7L341.4 233.3L353.4 239.1L362.1 244.5L368.7 249.6L376.7 258.0L381.4 265.3L384.7 275.1L385.8 275.8L387.6 267.1L387.6 259.5L385.4 250.4L379.2 239.4L369.8 230.3L353.0 220.5L333.0 213.6L310.4 210.3L297.7 211.1ZM61.9 196.9L50.3 209.6L40.1 224.9L33.5 239.1L30.2 252.5L29.9 262.4L30.6 268.2L34.6 280.6L41.2 291.1L45.9 296.2L51.7 300.6L45.5 287.8L41.9 275.5L40.8 267.1L41.2 252.5L43.3 240.2L47.0 228.2L55.0 209.6ZM278.1 0.0L293.0 4.7L305.0 12.0L313.7 20.7L321.4 33.1L327.5 50.2L337.0 88.8L338.8 101.9L339.2 116.1L338.1 127.7L335.2 140.1L332.3 147.4L333.0 148.5L343.6 151.4L349.4 154.7L357.8 162.3L361.8 168.1L364.3 173.6L367.2 183.8L371.6 220.9L373.0 223.1L384.0 232.5L388.0 237.6L392.7 246.4L395.2 254.4L396.0 267.8L393.0 281.3L389.0 290.0L384.7 296.6L369.4 311.5L363.6 327.9L348.3 362.8L345.0 375.2L344.7 385.7L346.1 393.7L351.6 406.8L372.3 439.2L382.1 458.5L387.2 472.7L389.4 481.8L391.2 499.6L408.0 499.6L408.0 0.0ZM154.3 0.0L-8.3 0.0L-8.3 499.6L64.4 499.6L68.4 477.1L58.6 473.8L52.4 470.5L45.5 465.4L39.7 459.6L34.2 452.0L30.2 444.0L27.0 433.4L26.2 427.6L25.5 427.6L24.8 436.3L25.5 443.6L27.7 451.6L33.2 462.2L43.3 472.3L42.6 473.4L31.7 470.5L23.3 466.2L15.7 460.3L9.5 453.8L4.0 445.8L0.0 437.0L-2.1 429.4L-3.6 418.9L-3.2 408.7L-1.1 398.5L2.9 387.9L14.2 370.8L37.9 346.8L41.9 341.7L45.5 335.2L47.3 328.2L47.0 323.5L43.7 317.0L28.8 302.0L19.7 287.8L17.1 280.9L15.3 272.2L15.7 255.8L17.9 246.7L21.9 236.2L33.9 215.4L48.1 198.0L86.6 156.5L98.7 140.8L109.9 123.4L111.8 117.9L114.3 82.2L117.6 57.1L121.6 35.7L125.9 20.7L129.6 14.2L132.5 11.3L136.1 9.5L140.1 9.5L145.2 12.7L148.1 17.5L149.6 22.6L150.3 22.6Z"},{"c":"#c26324","d":"M89.9 499.6L273.7 499.6L268.2 487.6L258.0 471.3L247.9 458.9L234.4 446.1L218.4 434.9L204.5 427.9L191.8 423.6L177.3 421.0L160.2 421.4L146.3 424.7L131.8 431.6L119.4 441.0L108.8 452.7L100.1 466.5L92.5 485.8ZM243.5 340.2L243.5 352.3L242.0 357.7L239.1 362.8L239.5 363.5L259.9 363.5L273.3 365.4L289.0 369.0L301.0 373.0L315.2 379.2L338.1 392.6L337.4 379.9L338.5 371.9L342.5 358.8L350.5 339.5L350.5 338.1L347.2 335.5L333.0 329.3L319.9 326.1L308.3 324.6L290.4 324.6L278.1 326.1L265.7 329.0L250.4 335.2ZM242.8 218.3L217.3 232.2L198.4 238.0L187.1 239.4L174.7 239.4L163.4 238.0L153.2 235.1L153.2 236.5L164.9 255.5L176.2 266.7L181.6 270.4L189.6 274.0L197.3 275.5L202.4 275.1L206.4 274.0L215.1 268.9L223.8 260.6L227.8 255.5L236.9 239.1L240.2 230.0ZM363.9 216.2L361.8 188.1L360.3 180.9L357.0 172.1L353.7 167.0L347.9 161.2L340.3 156.8L330.8 154.3L315.2 155.0L314.8 160.1L313.4 163.8L304.6 173.6L257.0 207.8L258.4 208.2L274.1 204.5L287.5 202.7L312.6 202.3L327.5 204.1L339.9 207.1L353.4 211.8L362.8 216.5ZM240.9 111.0L240.9 130.6L243.1 147.0L246.4 156.1L248.2 157.6L250.4 157.6L262.4 150.7L262.4 138.3L263.5 130.3L254.4 123.4ZM281.0 9.8L278.4 19.7L271.9 29.8L264.2 38.2L241.7 59.0L240.6 103.7L251.1 112.8L269.0 123.0L284.6 129.2L298.4 132.1L303.2 129.9L305.7 122.6L308.3 118.6L301.7 116.1L297.7 112.4L295.2 105.5L292.6 102.6L306.4 96.4L309.7 96.4L313.0 98.3L310.8 91.7L312.6 89.5L317.4 88.1L318.4 85.5L311.5 75.7L309.4 70.2L310.4 60.4L310.4 48.8L306.8 34.2L301.3 24.7L294.4 17.5L286.8 12.4ZM266.8 58.6L269.3 58.2L284.2 63.0L297.0 63.7L301.0 65.5L302.8 68.8L300.6 70.6L293.7 72.4L283.9 71.7L277.3 68.8L272.6 65.5L266.8 59.7ZM261.7 49.5L266.8 44.8L274.1 40.8L279.9 38.9L288.2 38.6L294.4 40.0L299.2 42.6L303.5 46.9L304.3 50.6L303.2 52.0L302.1 52.0L294.1 46.9L287.9 45.1L277.0 45.5L267.5 48.4L262.4 50.9ZM225.7 8.0L222.7 8.4L219.8 12.4L210.0 86.6L208.2 106.3L208.6 109.9L217.6 112.8L221.3 114.6L221.7 116.4L199.5 113.5L180.9 113.2L153.6 115.7L130.3 120.5L129.9 119.4L132.1 117.5L143.8 111.7L145.2 38.9L143.4 22.2L140.1 16.4L136.9 16.0L134.7 17.5L129.9 27.3L123.4 59.0L119.0 95.7L115.8 142.6L115.8 162.3L116.8 173.2L121.9 193.6L129.9 208.9L135.0 215.1L141.6 220.9L147.1 224.5L158.7 229.6L171.8 232.2L191.1 232.2L204.9 229.6L216.6 225.6L236.9 214.3L292.2 175.8L300.3 169.6L305.7 164.1L308.3 159.8L307.5 155.7L302.4 152.1L292.6 150.3L285.0 150.7L276.2 152.5L268.2 155.4L256.2 161.6L244.6 169.2L242.4 168.1L237.7 153.9L234.8 130.6L235.1 40.4L234.4 29.8L231.1 14.6L228.9 10.6ZM214.4 0.0L190.4 0.0L186.4 22.9L182.7 56.4L179.4 95.7L179.4 107.7L191.1 107.7L199.8 108.8L202.0 108.1L206.7 65.1L212.9 22.9ZM182.0 0.0L160.5 0.0L156.5 19.3L152.9 50.6L150.3 93.2L150.3 109.9L151.1 110.6L163.4 108.4L171.8 108.1L172.9 107.0L181.3 23.7Z"}],seat:[{"c":"#010000","d":"M254.4 87.3L246.0 84.8L242.0 84.8L239.5 86.2L235.1 87.0L230.7 92.8L237.3 97.5L243.9 97.5L248.2 95.3L254.4 88.4ZM274.4 48.8L273.0 48.8L266.4 53.9L261.0 56.8L251.1 59.0L248.2 61.9L251.1 63.0L258.8 63.0L263.9 61.5L267.5 59.3L271.5 55.3L274.4 50.2ZM273.0 36.0L270.8 34.9L264.2 34.9L256.6 37.1L247.9 43.3L244.9 46.9L243.9 50.2L244.6 50.9L246.4 50.6L252.6 44.8L260.2 40.0L271.5 37.1ZM289.7 0.0L210.4 0.0L197.6 10.9L191.8 18.2L180.5 35.3L174.7 41.1L164.2 46.9L141.2 54.6L129.2 60.0L120.5 66.2L115.0 72.1L110.7 79.7L109.2 84.8L108.8 90.6L109.9 95.7L113.6 101.9L123.8 108.8L125.9 111.7L125.9 116.1L122.7 120.5L117.9 123.4L108.1 125.9L95.7 125.9L68.8 122.3L58.3 122.3L45.9 124.5L38.2 127.4L28.8 132.8L19.3 141.6L14.6 148.1L10.2 157.6L8.4 167.8L9.5 176.5L13.1 184.5L19.0 190.7L25.9 194.7L34.6 196.9L46.3 196.1L51.7 194.3L52.4 193.2L45.9 191.4L39.3 187.4L33.9 181.2L31.0 173.6L30.6 167.0L31.7 161.2L36.8 151.4L45.2 143.0L57.9 136.1L74.3 132.5L88.8 132.8L88.5 133.9L80.5 136.5L69.5 142.6L63.7 148.1L58.6 156.1L56.8 161.9L56.8 169.6L58.6 175.4L64.1 183.4L65.9 188.9L65.2 192.9L63.0 196.5L58.6 200.5L52.1 204.1L32.1 211.1L19.7 218.0L10.6 227.4L6.6 236.2L5.9 240.2L6.2 246.7L7.3 250.4L10.2 255.1L16.0 259.8L32.4 266.4L35.3 268.9L37.2 272.6L36.8 275.8L35.3 278.4L32.4 281.3L17.1 291.1L9.5 300.2L6.6 307.5L5.9 311.9L7.3 321.3L11.0 327.9L18.2 334.1L27.7 338.1L37.5 339.5L43.0 339.2L44.1 340.6L33.5 394.1L29.9 406.1L21.9 426.9L20.1 434.9L2.6 446.1L-3.6 452.7L-8.3 460.3L-8.3 497.8L53.5 497.8L56.1 495.3L59.7 484.0L67.0 468.0L72.1 460.3L76.8 455.2L77.9 456.0L77.5 485.4L77.5 496.7L78.3 497.5L104.8 497.5L106.3 496.0L106.3 481.4L107.4 473.8L131.8 466.5L157.6 462.5L172.9 462.5L189.6 465.1L236.2 479.6L257.7 484.0L269.3 485.1L287.2 485.1L307.2 482.5L317.7 479.6L327.2 475.3L335.2 470.2L343.9 462.2L350.5 453.4L354.8 445.1L358.8 432.3L360.3 422.1L361.4 422.5L370.1 453.1L370.5 460.0L369.4 464.7L369.4 470.9L371.9 476.7L374.9 479.3L382.5 482.2L408.0 483.6L408.0 478.9L383.6 477.4L377.8 475.3L374.9 472.0L374.1 465.1L375.2 460.7L375.2 454.1L362.8 410.1L353.7 386.1L347.2 374.1L338.8 362.8L333.0 343.2L330.8 330.1L328.3 303.5L320.3 247.8L314.1 194.3L313.0 188.9L310.4 183.0L307.9 180.9L306.4 182.0L309.4 196.1L309.4 199.4L308.6 200.1L298.8 194.7L288.2 190.7L275.9 187.8L260.6 186.3L248.6 186.7L233.3 188.9L221.3 191.8L202.0 199.1L201.3 198.0L203.1 194.3L211.5 183.8L210.0 182.3L201.6 187.4L194.7 194.7L172.5 227.8L171.1 227.1L155.4 206.3L144.9 196.1L166.0 156.1L170.3 149.9L176.5 144.1L186.0 140.1L199.1 139.7L226.4 145.6L234.8 145.9L240.6 144.5L246.8 139.4L248.9 135.4L251.1 127.7L251.9 119.4L265.3 110.3L275.1 100.4L276.6 101.2L279.5 122.6L281.7 131.4L284.2 137.2L288.2 141.6L294.1 143.7L301.0 143.7L326.1 138.6L337.4 138.6L347.9 141.9L354.1 147.4L357.4 152.8L359.2 158.3L361.0 172.1L360.7 203.8L357.4 261.3L357.4 280.2L358.8 298.4L359.6 301.3L369.8 320.2L373.8 330.8L377.0 343.5L381.4 373.0L385.8 415.9L390.9 447.6L393.8 454.5L397.1 457.8L401.4 460.3L408.0 462.2L408.0 457.4L400.3 454.1L397.8 451.6L395.6 446.5L390.9 415.9L384.7 357.4L381.8 341.0L376.3 322.8L364.3 299.5L363.6 296.2L362.5 264.6L366.5 190.3L366.1 170.3L363.9 156.5L360.3 147.4L353.7 139.7L347.6 136.1L333.4 132.8L338.1 124.1L340.3 116.8L340.6 106.6L339.6 101.5L335.9 92.8L331.9 86.6L320.6 73.9L315.9 66.2L313.4 57.1L310.8 36.8L307.5 24.4L300.6 10.9ZM17.1 442.9L17.5 445.8L15.3 456.3L11.3 467.6L5.5 473.4L-5.4 481.1L-6.5 478.5L-6.5 471.6L-4.3 463.6L-2.1 459.2L6.2 449.4L12.8 444.7ZM99.7 442.5L100.8 443.6L101.2 448.7L100.8 489.8L99.4 492.0L86.3 492.4L85.2 491.3L85.6 449.1L86.6 447.6L92.8 444.7ZM224.6 290.8L226.0 289.3L232.6 287.1L250.0 284.2L270.1 284.9L280.6 287.1L286.1 289.7L280.6 304.9L280.6 315.5L254.4 309.3L241.3 307.9L226.0 307.5L225.3 306.0L226.4 302.4L226.4 298.0ZM193.3 258.7L201.6 259.5L208.2 268.9L220.2 292.9L221.7 299.1L220.2 304.9L218.0 303.1L203.8 277.3L193.3 260.6ZM314.1 245.3L315.2 245.6L319.5 275.8L326.1 332.2L329.7 350.4L329.0 352.3L318.4 342.8L294.8 324.2L288.6 317.7L285.3 310.8L286.4 303.5L290.4 292.9ZM106.7 229.6L113.6 233.3L119.8 238.0L125.2 243.8L129.6 250.4L132.1 255.8L134.7 265.3L135.0 281.3L130.7 304.9L123.4 327.5L89.9 407.2L89.6 415.6L96.5 429.0L98.7 436.3L77.2 446.9L64.4 457.4L59.4 463.6L53.9 472.3L48.8 483.6L46.6 490.9L45.2 492.4L-3.6 493.1L-5.1 492.0L-5.1 490.2L-2.9 486.2L13.5 472.7L18.2 464.3L26.6 428.7L34.6 407.9L38.6 394.5L56.8 302.0L67.0 260.9L73.9 237.6L81.2 231.1L89.6 227.8L98.7 227.4ZM104.8 192.5L117.6 191.4L124.9 192.5L132.5 195.1L144.1 202.3L155.1 213.6L181.6 251.1L203.8 287.5L223.8 325.0L230.4 339.5L234.8 351.9L237.3 364.6L235.8 375.5L231.1 394.1L222.7 415.9L215.5 429.4L205.6 442.9L194.0 453.4L185.3 457.8L182.7 457.8L179.8 456.3L173.3 451.2L162.3 440.0L151.4 424.7L138.0 397.7L129.9 373.4L127.0 355.2L127.4 335.5L138.0 300.6L140.9 279.1L140.1 266.4L138.0 256.9L135.4 250.7L130.7 242.7L123.4 234.4L115.8 228.5L107.0 224.2L99.0 222.3L91.4 222.3L84.1 224.2L77.5 227.8L76.5 227.1L81.2 214.0L87.7 203.8L96.5 196.1ZM212.9 90.2L214.4 90.6L215.1 93.5L212.2 98.3L211.1 105.5L213.6 112.1L218.4 115.0L222.7 115.0L230.0 110.6L235.1 114.6L232.9 120.5L229.7 123.7L225.3 126.3L216.9 127.0L213.3 125.9L207.5 121.5L204.2 116.1L203.1 112.4L203.1 105.2L204.2 101.2L207.8 95.0ZM297.3 67.3L304.6 70.6L310.4 77.1L312.6 82.6L313.0 91.3L309.7 100.4L304.6 106.3L299.2 109.2L292.2 109.9L288.6 109.2L283.5 106.3L280.2 102.6L278.4 96.8L282.4 91.3L286.8 95.7L289.7 97.2L295.5 96.8L297.7 95.7L301.3 91.7L302.8 87.3L301.7 79.0L299.9 75.7L293.3 70.2L294.1 67.7ZM257.3 13.5L261.0 17.1L268.6 27.7L281.3 40.0L285.7 54.9L286.8 68.4L285.3 75.0L281.7 84.1L272.6 96.4L264.2 104.1L257.0 109.2L249.7 112.4L243.5 112.8L238.0 110.6L230.7 105.2L221.7 95.0L216.9 86.2L225.7 71.3L233.3 46.6L238.0 39.7L251.9 24.4L254.8 19.3L255.9 14.9Z"},{"c":"#921de0","d":"M77.5 456.0L76.8 455.6L72.5 460.3L67.4 468.0L62.3 478.5L55.0 497.5L53.5 498.2L23.3 498.5L-8.3 498.2L-8.3 499.6L36.4 499.6L39.0 498.5L44.8 499.6L76.8 499.6L77.9 497.5L77.2 496.7ZM28.4 424.3L22.2 448.7L28.1 446.1L33.2 442.5L41.5 433.8L41.2 432.3L34.6 429.8L29.9 426.5ZM318.1 479.6L327.2 499.6L408.0 499.6L408.0 484.0L380.7 482.2L374.9 479.6L370.9 475.6L369.0 470.9L370.1 454.9L361.0 422.5L360.3 422.5L359.6 430.5L356.7 441.4L351.9 451.6L346.5 459.6L335.2 470.5L327.2 475.6ZM193.3 259.1L218.4 303.1L220.2 304.6L221.3 299.1L219.8 292.9L207.8 268.9L201.6 259.8ZM314.1 245.6L290.8 292.9L286.8 303.5L285.7 310.8L289.0 317.7L294.8 323.9L318.4 342.4L329.0 351.9L329.4 350.4L325.7 332.2L323.5 309.3L314.8 245.6ZM290.1 0.0L301.0 10.9L307.9 24.4L310.8 34.9L313.7 57.1L316.3 66.2L321.0 73.9L332.3 86.6L336.3 92.8L339.9 101.5L341.0 106.6L340.6 116.8L338.5 124.1L333.7 132.8L344.3 134.6L353.7 139.4L360.7 147.4L364.3 156.5L366.5 170.3L366.8 190.3L362.8 264.6L363.9 296.2L364.7 299.5L376.7 322.8L382.1 341.0L385.0 357.4L391.2 415.9L396.0 446.5L398.1 451.6L400.3 453.8L408.0 457.1L408.0 0.0ZM210.0 0.0L-8.3 0.0L-8.3 457.8L-7.6 458.9L-4.0 452.7L2.6 445.8L19.7 434.9L21.5 426.9L29.5 406.1L33.2 394.1L43.7 340.6L43.0 339.5L37.5 339.9L29.1 338.8L18.2 334.4L10.6 327.9L7.0 321.3L5.5 311.9L6.2 307.5L9.1 300.2L17.1 290.8L32.4 280.9L35.7 277.3L36.8 272.6L35.0 268.9L32.4 266.7L16.0 260.2L9.9 255.1L7.0 250.4L5.9 246.7L5.5 240.2L6.2 236.2L10.2 227.4L19.7 217.6L32.1 210.7L52.1 203.8L58.6 200.1L62.6 196.5L64.8 192.9L65.5 188.9L63.7 183.4L58.3 175.4L56.4 169.6L56.4 161.9L58.3 156.1L63.4 148.1L69.5 142.3L80.5 136.1L87.7 133.9L88.5 132.8L85.9 132.8L87.0 133.6L84.1 134.6L83.0 133.2L84.5 132.8L71.4 133.2L56.1 137.2L43.3 144.8L35.0 154.7L32.1 161.2L31.0 167.0L32.1 176.5L35.0 182.3L39.3 187.0L45.9 191.0L52.8 193.2L52.4 194.3L46.3 196.5L34.6 197.2L29.1 196.1L21.5 192.9L15.3 187.8L11.0 181.2L8.4 172.9L8.4 163.8L11.0 154.7L16.4 144.8L25.5 135.0L33.9 129.2L45.9 124.1L58.3 121.9L68.8 121.9L95.7 125.5L108.1 125.5L115.0 124.1L122.7 120.1L125.6 116.1L125.2 111.0L113.2 101.9L109.6 95.7L108.8 92.8L109.2 83.0L114.7 72.1L120.5 65.9L129.2 59.7L141.2 54.2L164.2 46.6L174.7 40.8L180.2 35.3L191.4 18.2L197.3 10.9Z"},{"c":"#b6551e","d":"M77.2 499.3L326.8 499.6L318.1 480.0L305.3 483.3L292.2 485.1L269.3 485.4L260.6 484.7L236.2 480.0L189.6 465.4L172.9 462.9L157.6 462.9L140.5 465.1L124.5 468.7L108.1 473.8L107.0 474.9L106.7 496.0L105.6 497.5L77.9 497.8ZM17.1 443.2L12.8 445.1L6.2 449.8L-1.8 459.2L-5.8 469.4L-6.1 478.5L-5.4 480.7L3.7 474.5L11.0 467.6L13.9 460.7ZM224.9 290.8L226.7 298.0L226.0 307.1L241.3 307.5L254.4 309.0L280.6 315.1L279.9 306.8L282.4 298.0L285.7 290.8L285.0 288.9L270.1 285.3L250.0 284.6L235.5 286.8L226.0 289.7ZM104.8 192.9L96.5 196.5L88.1 203.8L81.6 214.0L76.8 227.1L77.5 227.4L84.1 223.8L91.4 222.0L99.0 222.0L107.0 223.8L115.8 228.2L123.4 234.0L131.0 242.7L135.8 250.7L138.3 256.9L140.5 266.4L141.2 279.1L138.3 300.6L127.8 335.5L127.4 355.2L130.3 373.4L138.3 397.7L151.8 424.7L162.7 440.0L173.3 450.9L179.8 456.0L182.7 457.4L185.3 457.4L194.0 453.1L205.3 442.9L215.1 429.4L222.4 415.9L230.7 394.1L235.5 375.5L236.9 364.6L234.4 351.9L230.0 339.5L223.5 325.0L203.5 287.5L181.3 251.1L154.7 213.6L144.1 202.7L132.5 195.4L124.9 192.9L117.6 191.8ZM176.5 144.5L170.7 149.9L166.3 156.1L145.2 195.8L158.0 208.9L171.8 227.4L173.6 226.3L186.0 206.3L194.4 194.7L201.6 187.0L210.0 182.0L211.8 183.8L203.5 194.3L202.0 198.7L221.3 191.4L233.3 188.5L248.6 186.3L260.6 186.0L275.9 187.4L288.2 190.3L298.8 194.3L308.6 199.8L308.6 193.2L306.1 182.0L307.9 180.5L310.8 183.0L313.4 188.9L314.4 194.3L320.6 247.8L328.6 303.5L331.2 330.1L333.4 343.2L339.2 362.8L347.6 374.1L354.1 386.1L363.2 410.1L375.6 454.1L375.6 460.7L374.5 465.1L375.2 472.0L377.8 474.9L383.6 477.1L408.0 478.5L408.0 462.5L403.2 461.4L397.1 458.2L393.4 454.5L390.5 447.6L385.4 415.9L381.0 373.0L376.7 343.5L373.4 330.8L369.4 320.2L360.3 303.5L358.5 298.4L357.0 280.2L357.0 261.3L360.3 203.8L360.7 172.1L358.8 158.3L354.8 148.8L347.9 142.3L337.4 139.0L326.1 139.0L301.0 144.1L294.1 144.1L288.2 141.9L283.9 137.2L281.3 131.4L279.1 122.6L275.9 100.8L263.5 112.1L252.2 119.4L251.5 127.7L249.3 135.4L247.1 139.4L240.6 144.8L234.8 146.3L226.4 145.9L199.1 140.1L186.0 140.5ZM257.3 13.8L252.2 24.4L238.4 39.7L233.7 46.6L226.0 71.3L217.3 86.2L220.6 92.8L226.4 100.4L234.8 108.1L243.5 112.4L249.7 112.1L257.0 108.8L264.2 103.7L272.2 96.4L281.3 84.1L285.0 75.0L286.4 68.4L285.3 54.9L281.0 40.0L268.2 27.7ZM254.8 87.3L254.8 88.4L248.2 95.7L243.9 97.9L237.3 97.9L230.4 92.8L235.1 86.6L239.5 85.9L242.0 84.4L246.0 84.4L253.7 86.2ZM274.8 48.8L274.8 50.2L271.9 55.3L267.5 59.7L263.9 61.9L258.8 63.3L251.1 63.3L247.9 61.9L251.1 58.6L261.0 56.4L265.3 54.2L273.0 48.4ZM273.3 36.0L272.6 37.1L266.4 38.2L257.3 41.8L245.7 51.3L243.5 50.2L244.6 46.9L247.5 43.3L256.6 36.8L264.2 34.6L270.8 34.6Z"},{"c":"#fcc127","d":"M95.4 427.6L94.7 427.9L82.6 421.8L70.6 418.9L63.0 419.2L53.2 422.9L41.9 432.7L40.1 436.0L32.8 443.2L28.8 446.1L22.6 448.7L19.3 462.9L16.4 469.8L9.9 476.7L-2.5 486.5L-4.7 491.6L-4.0 492.4L45.5 491.6L53.9 471.3L61.5 460.0L69.5 452.0L76.8 446.5L97.9 436.3ZM49.2 342.1L43.7 371.9L51.3 369.0L58.6 368.6L65.2 370.5L70.3 373.7L75.4 379.5L78.3 385.0L83.7 401.7L88.8 411.2L89.9 405.4L100.1 381.0L98.7 379.5L96.5 373.4L93.2 354.8L89.6 345.7L83.7 339.2L79.0 336.6L74.3 335.5L68.8 335.5L61.9 337.0L52.8 340.2L50.3 342.4ZM65.5 269.3L57.5 302.4L68.4 297.3L75.7 295.5L88.1 295.5L95.7 297.7L101.9 301.7L107.0 306.8L110.7 311.9L116.5 324.2L117.6 325.0L117.2 325.7L121.2 331.5L128.1 311.9L131.8 298.4L134.3 283.1L134.7 272.2L116.1 258.7L107.8 255.5L100.1 254.4L92.8 255.1L85.9 257.3L75.0 263.5L68.1 268.9ZM213.3 90.6L207.8 95.7L204.2 103.0L203.5 110.6L204.9 116.4L207.5 120.8L214.0 125.5L222.7 126.3L226.4 125.2L232.6 120.1L234.8 115.0L229.3 111.0L223.5 115.4L218.7 115.7L215.5 114.3L212.6 111.4L210.7 107.0L210.7 101.5L214.4 93.5L214.4 91.7ZM296.6 67.7L294.8 67.7L293.7 70.2L300.3 75.3L303.2 81.9L303.5 86.6L301.7 92.1L298.1 96.1L293.7 97.9L287.5 96.8L283.2 92.1L282.1 92.4L279.1 96.8L281.3 103.3L285.3 107.0L290.8 109.2L297.0 109.2L304.3 105.9L309.0 100.8L311.2 96.4L312.6 89.9L311.9 81.9L307.9 74.2L303.2 70.2Z"},{"c":"#800eca","d":"M99.7 443.2L96.1 444.0L94.7 446.9L92.1 445.8L86.3 449.4L85.6 484.4L86.3 491.6L99.4 491.6L100.1 490.9L100.5 448.7ZM44.1 371.9L36.8 402.5L29.1 422.1L28.8 425.0L34.6 429.4L42.2 432.3L48.4 426.1L56.8 420.7L63.0 418.9L70.6 418.5L82.6 421.4L94.7 427.6L95.0 426.9L89.2 416.3L88.8 411.6L83.4 401.7L77.9 385.0L72.5 376.3L66.6 371.5L58.6 369.0L51.3 369.4ZM57.9 302.4L55.0 311.9L49.9 337.0L50.3 339.5L49.2 341.7L51.0 341.3L50.3 340.6L50.6 339.2L52.4 340.2L61.9 336.6L68.8 335.2L76.8 335.5L83.7 338.8L88.5 343.5L92.5 350.8L96.8 373.4L99.0 379.5L100.5 380.6L116.8 343.2L120.9 330.8L116.5 325.3L112.1 315.1L106.7 306.8L101.9 302.0L95.7 298.0L88.1 295.9L75.7 295.9L68.4 297.7ZM65.5 268.9L68.1 268.6L75.0 263.1L85.9 256.9L97.9 254.0L106.3 254.7L116.1 258.4L134.0 271.5L134.3 266.0L129.9 251.8L125.9 245.3L119.8 238.4L112.8 233.3L107.0 230.3L100.5 228.2L91.7 227.8L86.3 229.3L80.5 232.2L74.6 237.3Z"}]};
const ppFig=(g,w,h,L)=>{g.save();g.scale(w/400,h/500);g.fillStyle=L[0].c;g.fillRect(0,0,400,500);L.forEach(l=>{g.fillStyle=l.c;g.fill(new Path2D(l.d),'evenodd');});g.restore();};
Object.assign(REFDRAW,{pfhand:(g,w,h)=>ppFig(g,w,h,PP_FIG.hand),pfseat:(g,w,h)=>ppFig(g,w,h,PP_FIG.seat)});
const refCache=new Map();
function refCanvas(id,onLoad){
  if(refCache.has(id)){const k=refCache.get(id);
    /* a phone can quietly empty a picture it kept in memory: if the saved copy has gone blank, draw it again */
    let blank=false;try{blank=k.getContext('2d').getImageData(0,0,1,1).data[3]===0;}catch(e){}
    if(!blank)return k;refCache.delete(id);}
  const c=document.createElement('canvas');c.width=400;c.height=500;const g=c.getContext('2d');g.fillStyle='#eee';g.fillRect(0,0,400,500);
  if(/^ref:/.test(id||'')){const f=REFDRAW[id.slice(4)];if(f)try{f(g,400,500);}catch(e){}refCache.set(id,c);}
  else if(/^img:/.test(id||'')){const im=new Image();im.crossOrigin='anonymous';im.onload=()=>{const s=Math.max(400/im.width,500/im.height),dw=im.width*s,dh=im.height*s;g.drawImage(im,(400-dw)/2,(500-dh)/2,dw,dh);onLoad&&onLoad();};im.src=publicUrl('room-images',id.slice(4));refCache.set(id,c);}
  return c;
}

/* ---------------- stroke guide: an outline "skeleton" of the reference with arrows showing which way to stroke ---------------- */
const guideCache=new Map();
function guideCanvas(id,onLoad){
  const key=id||'';if(guideCache.has(key))return guideCache.get(key);
  const out=document.createElement('canvas');out.width=CW;out.height=CH;guideCache.set(key,out);
  if(!id)return out;
  const src=refCanvas(id,()=>{guideCache.delete(key);onLoad&&onLoad();});
  try{
    const w=128,hh=160,t=document.createElement('canvas');t.width=w;t.height=hh;const tg=t.getContext('2d');tg.imageSmoothingQuality='high';tg.drawImage(src,0,0,w,hh);
    const d=tg.getImageData(0,0,w,hh).data;
    const at=(x,y,c)=>d[((Math.min(hh-1,Math.max(0,y))*w)+Math.min(w-1,Math.max(0,x)))*4+c];
    const mag=new Float32Array(w*hh),gxs=new Float32Array(w*hh),gys=new Float32Array(w*hh);let mx=0;
    for(let y=0;y<hh;y++)for(let x=0;x<w;x++){let gx=0,gy=0;for(let c=0;c<3;c++){gx+=at(x+1,y,c)-at(x-1,y,c);gy+=at(x,y+1,c)-at(x,y-1,c);}
      const m=Math.hypot(gx,gy);const k=y*w+x;mag[k]=m;gxs[k]=gx;gys[k]=gy;if(m>mx)mx=m;}
    const thr=Math.max(30,mx*.12),athr=Math.max(40,mx*.3),g=out.getContext('2d'),sx=CW/w,sy=CH/hh;
    g.fillStyle='rgba(70,50,200,.55)';
    for(let y=1;y<hh-1;y++)for(let x=1;x<w-1;x++){const k=y*w+x,m=mag[k];if(m<thr)continue;
      g.fillRect(Math.round(x*sx-1),Math.round(y*sy-1),5,5);}
    /* arrows along the edges: the direction to sweep the brush */
    g.strokeStyle='#ff5a36';g.fillStyle='#ff5a36';g.lineWidth=4;g.lineCap='round';
    const cell=15;let n=0;
    for(let cy=0;cy<hh&&n<48;cy+=cell)for(let cx=0;cx<w&&n<48;cx+=cell){let bk=-1,bm=0;
      for(let y=cy;y<Math.min(hh,cy+cell);y++)for(let x=cx;x<Math.min(w,cx+cell);x++){const k=y*w+x;if(mag[k]>bm){bm=mag[k];bk=k;}}
      if(bk<0||bm<athr)continue;
      let tx=-gys[bk],ty=gxs[bk];const l=Math.hypot(tx,ty)||1;tx/=l;ty/=l;if(tx<-.2||(Math.abs(tx)<=.2&&ty<0)){tx=-tx;ty=-ty;}
      const px=(bk%w)*sx,py=Math.floor(bk/w)*sy,L=22;const ax=px-tx*L,ay=py-ty*L,bx=px+tx*L,by=py+ty*L;
      g.beginPath();g.moveTo(ax,ay);g.lineTo(bx,by);g.stroke();
      const a=Math.atan2(ty,tx);g.beginPath();g.moveTo(bx,by);g.lineTo(bx-12*Math.cos(a-.5),by-12*Math.sin(a-.5));g.lineTo(bx-12*Math.cos(a+.5),by-12*Math.sin(a+.5));g.closePath();g.fill();n++;}
  }catch(e){/* an uploaded picture that the browser will not let us read: no guide */}
  return out;
}

/* ---------------- the drawing engine: one painting = a list of strokes ---------------- */
class PC{
  constructor(onChange){this.cv=document.createElement('canvas');this.cv.width=CW;this.cv.height=CH;this.g=this.cv.getContext('2d');this.ops=[];this.redo=[];this.onChange=onChange||(()=>{});this.tex=null;this.pts=0;this.blank();}
  blank(){this.g.globalAlpha=1;this.g.fillStyle=PAPER;this.g.fillRect(0,0,CW,CH);}
  style(op){const g=this.g;g.lineCap='round';g.lineJoin='round';g.globalAlpha=1;
    if(op.t==='e'){g.strokeStyle=g.fillStyle=PAPER;g.lineWidth=op.z*1.7;}
    else if(op.t==='p'){g.strokeStyle=g.fillStyle=op.c;g.lineWidth=Math.max(1.2,op.z*.28);}
    else{g.strokeStyle=g.fillStyle=op.c;g.lineWidth=op.z;g.globalAlpha=.96;}}
  seg(op,i0){const p=op.p,g=this.g;if(!p||p.length<2)return;this.style(op);
    if(p.length===2||i0===0&&p.length<4){g.beginPath();g.arc(p[0],p[1],g.lineWidth/2,0,7);g.fill();if(p.length<4)return;}
    g.beginPath();g.moveTo(p[Math.max(0,i0-2)],p[Math.max(0,i0-2)+1]);for(let i=Math.max(2,i0);i<p.length;i+=2)g.lineTo(p[i],p[i+1]);g.stroke();g.globalAlpha=1;}
  render(){this.blank();this.pts=0;for(const op of this.ops){if(op.k==='clr')this.blank();else if(op.k==='s'){this.seg(op,0);this.pts+=op.p.length;}}this.onChange();}
  start(t,c,z,x,y,id){const op={k:'s',t,c,z,p:[Math.round(x),Math.round(y)],id:id||null};this.ops.push(op);this.redo=[];this.seg(op,0);this.pts+=2;this.onChange();return op;}
  extend(op,x,y){x=Math.round(x);y=Math.round(y);const p=op.p,lx=p[p.length-2],ly=p[p.length-1];if(Math.abs(x-lx)<2&&Math.abs(y-ly)<2)return false;p.push(x,y);this.pts+=2;this.seg(op,p.length-2);this.onChange();return true;}
  undo(){let i=this.ops.length-1;while(i>=0&&this.ops[i].k==='m')i--;if(i<0)return false;this.redo.push(...this.ops.splice(i,1));this.render();return true;}
  redoOp(){const o=this.redo.pop();if(!o)return false;this.ops.push(o);this.render();return true;}
  clear(){this.ops.push({k:'clr'});this.redo=[];this.render();}
  state(){for(let i=this.ops.length-1;i>=0;i--)if(this.ops[i].k==='m')return this.ops[i].s|0;return 0;}
  setState(s){this.ops=this.ops.filter(o=>o.k!=='m');if(s>0)this.ops.push({k:'m',s});}
  load(ops){this.ops=Array.isArray(ops)?ops.filter(o=>o&&(o.k==='s'||o.k==='clr'||o.k==='m')):[];this.redo=[];this.render();}
  empty(){return !this.ops.some(o=>o.k==='s');}
  /* a phone can empty a canvas it kept in memory while the app was in the background (e.g. after saving a picture to the phone): if the picture has gone blank, draw it again from the strokes */
  ensure(){try{const g=this.g;if(g.getImageData(0,0,1,1).data[3]===0||g.getImageData(CW-1,CH-1,1,1).data[3]===0){this.render();return true;}}catch(e){}return false;}
  /* re-draws the strokes at k times the size, so saved and downloaded paintings stay sharp */
  hires(k){const c=document.createElement('canvas');c.width=CW*k;c.height=CH*k;const t=Object.create(PC.prototype);t.g=c.getContext('2d');t.cv=c;t.g.scale(k,k);t.blank();for(const op of this.ops){if(op.k==='clr')t.blank();else if(op.k==='s')t.seg(op,0);}return c;}
  texture(){if(!this.tex){this.tex=new T.CanvasTexture(this.cv);this.tex.encoding=T.sRGBEncoding;this.tex.anisotropy=4;}return this.tex;}
}

/* ---------------- gallery of finished paintings (also used at the end of a session) ---------------- */
async function galleryView(spaceId,title,opts){
  const box=h('div',{class:'pt-gal'}),grid=h('div',{class:'pt-gg'});box.append(h('h3',null,'Gallery'),h('p',{class:'f-hint'},title||''),grid,spinner());
  let rows=[];try{const r=await sb.rpc('paint_list',{p_space:spaceId});if(r.error)throw r.error;rows=(r.data||[]).filter(x=>(x.ops||[]).some(o=>o.k==='s'));}catch(e){box.replaceChildren(empty('Could not load the gallery',friendlyError(e)));return box;}
  box.querySelector('.spin-wrap')&&box.querySelector('.spin-wrap').remove();
  if(!rows.length){box.append(empty('No paintings yet','Paintings appear here once people have painted something.'));return box;}
  rows.sort((a,b)=>(b.done-a.done)||((b.votes||0)-(a.votes||0)));
  const prem=!!(rows[0]&&rows[0].premium);const cards=[];
  const fm=n=>{n=Math.max(0,Math.round(n));return Math.floor(n/60)+':'+String(n%60).padStart(2,'0');};
  const st0=rows[0]&&rows[0].started_at?new Date(rows[0].started_at).getTime():0,en0=rows[0]&&rows[0].ends_at?new Date(rows[0].ends_at).getTime():0;
  let fast=null;if(prem&&st0){rows.forEach(r=>{if(!r.done||!r.done_at)return;const t=new Date(r.done_at).getTime();if(en0&&t>en0)return;if(!fast||t<fast.t)fast={u:r.user_id,t};});}
  const refreshV=()=>{let top=null;rows.forEach(r=>{if((r.votes||0)>0&&(!top||r.votes>top.v))top={u:r.user_id,v:r.votes};});
    cards.forEach(c=>{const r=c.r;c.cnt.textContent=prem?String(r.votes||0)+((r.votes||0)===1?' vote':' votes'):'';if(c.btn){c.btn.textContent=r.my_vote?'Voted ✓':'Vote';c.btn.classList.toggle('coral',!r.my_vote);}
      const bd=[];if(fast&&fast.u===r.user_id)bd.push('⚡ Fastest finisher '+fm((fast.t-st0)/1000));if(top&&top.u===r.user_id)bd.push('🏆 Most votes');c.bd.replaceChildren(...bd.map(t=>h('span',{class:'pt-aw'},t)));});};
  rows.forEach(r=>{const pc=new PC();pc.load(r.ops);const url=pc.cv.toDataURL('image/jpeg',.88),mine=Auth.user&&r.user_id===Auth.user.id;
    const save=mine?h('button',{class:'btn small coral'},'Save to my gallery'):null;
    if(save)save.onclick=()=>guard(save,async()=>{const blob=await new Promise(res=>pc.hires(2).toBlob(res,'image/jpeg',.95));const path=await uploadFile('room-images',blob,'jpg','image/jpeg');const x=await sb.rpc('paint_artwork_save',{p_path:path,p_title:'Painting by @'+r.username,p_space_title:title||''});if(x.error)throw x.error;save.textContent='Saved';save.disabled=true;toast('Saved to your gallery');});
    const dl=h('button',{class:'btn small'},'Download HD');dl.onclick=()=>guard(dl,async()=>{const blob=await new Promise(res=>pc.hires(4).toBlob(res,'image/png'));download(blob,'openwalls-painting-'+(r.username||'art')+'.png');});
    const cnt=h('span',{class:'pt-vc'}),bd=h('div',{class:'pt-awr'});let vb=null;
    if(prem&&!mine&&Auth.user){vb=h('button',{class:'btn small'},'Vote');vb.onclick=()=>guard(vb,async()=>{const was=!!r.my_vote;const x=await sb.rpc('paint_vote',{p_space:spaceId,p_artist:was?null:r.user_id});if(x.error)throw x.error;rows.forEach(o=>{if(o.my_vote){o.my_vote=false;o.votes=Math.max(0,(o.votes||0)-1);}});if(!was){r.my_vote=true;r.votes=(r.votes||0)+1;}refreshV();toast(was?'Vote removed':'Vote saved. You can change it any time.');});}
    cards.push({r,cnt,btn:vb,bd});
    grid.append(h('div',{class:'pt-gc'},h('img',{src:url,alt:'Painting by @'+r.username}),bd,h('div',{class:'pt-gw'},avatarEl({avatar_url:r.avatar_url,display_name:r.display_name,username:r.username},'sm'),h('div',null,h('b',null,'@'+r.username),h('span',null,(r.done?'Completed':'In progress')+' · '+(title||'Gist & Paint')))),h('div',{class:'pt-vrow'},cnt,vb),save,dl));});
  refreshV();
  return box;
}
function openArtwork(a){
  const url=publicUrl('room-images',a.image_path);
  sheet(a.space_title||'Artwork',(body,close)=>{
    const img=h('img',{src:url,alt:a.title||'Artwork',style:{width:'100%',maxHeight:'62vh',objectFit:'contain',borderRadius:'10px',background:'#fffdf8',display:'block'}});
    const wall=h('button',{class:'btn coral block'},'Add to my wall decorations');
    wall.onclick=()=>{try{localStorage.setItem('ow_pending_deco',JSON.stringify({path:a.image_path,asp:CW/CH,at:Date.now()}));}catch(e){toast('Could not prepare that. Try again.','err');return;}close();toast('Opening your room…');setTimeout(()=>go('#/edit'),250);};
    const save=h('button',{class:'btn block',style:{marginTop:'8px'}},'Save to my phone');
    save.onclick=()=>guard(save,async()=>{const blob=await (await fetch(url)).blob();download(blob,'openwalls-artwork.jpg');});
    const del=h('button',{class:'btn block',style:{marginTop:'8px',color:'#d33'}},'Delete this artwork');
    del.onclick=async()=>{if(!(await confirmBox('Delete this artwork?','It will be removed from My artworks for good. Copies already hung in your room stay until you remove them.','Delete',true)))return;
      guard(del,async()=>{const r=await sb.from('paint_artworks').delete().eq('id',a.id).eq('user_id',Auth.user.id).select('id');if(r.error)throw r.error;if(!(r.data||[]).length)throw new Error('Could not delete that artwork');
        try{await sb.storage.from('room-images').remove([a.image_path]);}catch(e){}
        close();toast('Artwork deleted','ok');setTimeout(()=>myArtworks(),250);});};
    body.append(img,h('p',{class:'f-hint',style:{margin:'8px 0'}},new Date(a.created_at).toLocaleDateString()+' \u00b7 It hangs on the wall you are facing and you can move or resize it.'),wall,save,del);
  });
}
async function myArtworks(){
  sheet('My artworks',async(body)=>{body.append(spinner());
    const r=await sb.from('paint_artworks').select('id,image_path,title,space_title,created_at').eq('user_id',Auth.user.id).order('created_at',{ascending:false}).limit(60);
    if(r.error||!(r.data||[]).length){body.replaceChildren(empty('No artworks yet','Finish a painting in a Gist & Paint space and save it here.'));return;}
    body.replaceChildren(h('div',{class:'pt-gg'},r.data.map(a=>h('div',{class:'pt-gc',role:'button',tabindex:'0','aria-label':'Open artwork',style:{cursor:'pointer'},onclick:()=>openArtwork(a)},h('img',{src:publicUrl('room-images',a.image_path),alt:a.title||'Artwork',loading:'lazy'}),h('div',{class:'pt-gw'},h('div',null,h('b',null,a.space_title||'Gist & Paint'),h('span',null,new Date(a.created_at).toLocaleDateString())))))));
  });
}

/* ---------------- attach the studio to a running Space stage ---------------- */
function attach(R,ctx){
  const st=R.stage,S=R.STAGE,SX=S.SX,SZ=S.SZ,DESKY=S.DESKY,me=Auth.user.id,spaceId=ctx.id;
  const canv=new Map();let dead=false,ch=null,chOk=false,saveT=null,flushT=null,pending=null,cur=null,sp={ref:null,state:'waiting',note:'',title:'',ends:0},award=null,upFlag=false,skew=0,nSeated=0,lastPaintPing=0,ov=null,lockUntil=0;
  const redraw=(()=>{let q=false;return()=>{if(q||dead)return;q=true;requestAnimationFrame(()=>{q=false;if(dead||ov)return;canv.forEach(pc=>{if(pc.tex)pc.tex.needsUpdate=true;});R.markDirty&&R.markDirty();});};})();
  const get=uid=>{let pc=canv.get(uid);if(!pc){pc=new PC(redraw);canv.set(uid,pc);}return pc;};
  const mine=get(me);
  const wake=()=>{if(dead||document.visibilityState==='hidden')return;let any=false;canv.forEach(pc=>{if(pc.ensure())any=true;});if(any){redraw();try{R.markDirty&&R.markDirty();}catch(e){}}};
  document.addEventListener('visibilitychange',wake);window.addEventListener('pageshow',wake);window.addEventListener('focus',wake);

  /* ---- 3D studio ---- */
  const G=new T.Group();st.g.add(G);st.cv=[];st.cvMesh=[];
  const mat=(c,r,m)=>new T.MeshStandardMaterial({color:c,roughness:r==null?.7:r,metalness:m||0});
  const bx=(w,hh,d,m,x,y,z)=>{const o=new T.Mesh(new T.BoxGeometry(w,hh,d),m);o.position.set(x,y,z);G.add(o);return o;};
  const backG=new T.Group();G.add(backG);
  const bxB=(w,hh,d,m,x,y,z)=>{const o=new T.Mesh(new T.BoxGeometry(w,hh,d),m);o.position.set(x,y,z);backG.add(o);return o;};
  /* wall, wooden slats, lights */
  const backdrop=bxB(5.2,3.1,.06,mat(0x2b2150,.9),0,1.5,SZ-1.35);
  function setBackdrop(c){backdrop.material.color.set(/^#[0-9a-f]{6}$/i.test(c||'')?c:0x2b2150);R.markDirty&&R.markDirty();}
  const slats=[];[-2.35,2.35].forEach((x,sd)=>{for(let i=0;i<5;i++){const o=bxB(.1,3.1,.1,mat(0xb98a55,.6),x+(i-2)*.16,1.5,SZ-1.28);o.userData.sd=sd;o.userData.i=i;slats.push(o);}});
  const neonStrip=bxB(4.6,.08,.08,mat(0x9a6bff,.3),0,.5,SZ-1.3);neonStrip.material.emissive=new T.Color(0x7b4dff);
  for(let i=0;i<3;i++){const l=new T.Mesh(new T.SphereGeometry(.07,12,10),new T.MeshBasicMaterial({color:0xffe2a8}));l.position.set((i-1)*1.2,2.95,SZ-.2);G.add(l);}
  const warm=new T.PointLight(0xffd9a8,.7,7);warm.position.set(0,2.6,SZ+.6);G.add(warm);
  /* plants */
  const plantGs=[];let plantKind='bush';
  function buildPlants(kind){
    plantKind=kind||'bush';plantGs.forEach(g=>{G.remove(g);g.traverse(o=>{if(o.geometry)o.geometry.dispose();});});plantGs.length=0;
    const cyl=(g,rt,rb,hh,m,x,y,z,rx,rz)=>{const o=new T.Mesh(new T.CylinderGeometry(rt,rb,hh,7),m);o.position.set(x,y,z);if(rx)o.rotation.x=rx;if(rz)o.rotation.z=rz;g.add(o);return o;};
    const ball=(g,r,m,x,y,z,sx,sy,sz)=>{const o=new T.Mesh(new T.SphereGeometry(r,8,6),m);o.position.set(x,y,z);o.scale.set(sx||1,sy||1,sz||1);g.add(o);return o;};
    const L0=st.lay,px_=Math.max(1.75,L0.maxX+.6);
    [-px_,px_].forEach((x,side)=>{
      const g=new T.Group();g.position.set(x,0,SZ-1.1-(L0.rows-1)*S.RS);G.add(g);plantGs.push(g);
      const pot=new T.Mesh(new T.BoxGeometry(.34,.34,.34),mat(0xf1eef9,.5));pot.position.y=.17;g.add(pot);
      const gr=mat(0x2f9e5b,.8),dg=mat(0x1f7a44,.8);
      if(plantKind==='tulip'){
        const cols=[0xe63946,0xff7aa8,0xffd23f,0xb04dff];
        for(let i=0;i<6;i++){const a=i*1.05,r=.07+.03*(i%2),hh=.55+.12*(i%3),px=Math.sin(a)*r,pz=Math.cos(a)*r;cyl(g,.01,.012,hh,gr,px,.34+hh/2,pz);const hd=ball(g,.055,mat(cols[(i+side)%4],.5),px,.34+hh+.03,pz,.85,1.25,.85);}
        for(let i=0;i<4;i++){const a=i*1.6;const l=ball(g,.06,dg,Math.sin(a)*.1,.5,Math.cos(a)*.1,.35,2.2,.8);l.rotation.z=Math.sin(a)*.3;}
      }else if(plantKind==='sunflower'){
        for(let i=0;i<3;i++){const hh=.95+.18*i,px=(i-1)*.09,pz=(i%2)*.05-.02;cyl(g,.014,.018,hh,gr,px,.34+hh/2,pz);
          const hy=.34+hh;const disc=cyl(g,.07,.07,.025,mat(0x5a3a1a,.8),px,hy,pz+.02,Math.PI/2);for(let k=0;k<10;k++){const a=k*Math.PI/5;const pe=ball(g,.032,mat(0xffc21f,.5),px+Math.cos(a)*.095,hy+Math.sin(a)*.095,pz+.015,1,1.7,.4);pe.rotation.z=a+Math.PI/2;}
          ball(g,.05,dg,px+.07,.34+hh*.45,pz,1.6,.25,.8);}
      }else if(plantKind==='rose'){
        for(let i=0;i<7;i++)ball(g,.17+.04*(i%3),gr,Math.sin(i*1.7)*.18,.58+i*.04,Math.cos(i*1.7)*.14,.85,1.1,.85);
        const rc=[0xe63946,0xff4d6d,0xff8fa3];for(let i=0;i<7;i++){const a=i*0.95;const rr_=ball(g,.05,mat(rc[(i+side)%3],.45),Math.sin(a)*.2,.72+(i%3)*.1,Math.cos(a)*.18+.04);ball(g,.028,mat(0xb11226,.5),rr_.position.x,rr_.position.y+.01,rr_.position.z+.02);}
      }else if(plantKind==='cactus'){
        cyl(g,.1,.11,.8,gr,0,.74,0);ball(g,.1,gr,0,1.14,0);
        cyl(g,.05,.05,.28,gr,.16,.84,0,0,Math.PI/2);cyl(g,.05,.05,.3,gr,.26,1.0,0);ball(g,.05,gr,.26,1.15,0);
        cyl(g,.05,.05,.24,gr,-.15,.74,0,0,Math.PI/2);cyl(g,.05,.05,.26,gr,-.25,.88,0);ball(g,.05,gr,-.25,1.01,0);
        ball(g,.045,mat(0xff5fa2,.5),0,1.22,0);
      }else if(plantKind==='fern'){
        for(let i=0;i<12;i++){const a=i*Math.PI*2/12,tilt=.55+.2*(i%3);const l=ball(g,.07,i%2?gr:dg,Math.sin(a)*.2,.62+.04*(i%3),Math.cos(a)*.2,.5,3.4+.4*(i%3),.18);l.rotation.z=-Math.sin(a)*tilt;l.rotation.x=Math.cos(a)*tilt;}
      }else if(plantKind==='lavender'){
        for(let i=0;i<14;i++){const a=i*2.4,r=.04+.09*((i*7)%5)/4,px=Math.sin(a)*r*1.6,pz=Math.cos(a)*r*1.6,hh=.55+.08*(i%4);cyl(g,.007,.009,hh,gr,px,.34+hh/2,pz);cyl(g,.022,.014,.2,mat(i%2?0x9b6bff:0x7b4dd8,.55),px,.34+hh+.08,pz);}
      }else{
        const b=gr;for(let i=0;i<7;i++){const sp_=new T.Mesh(new T.SphereGeometry(.17+.05*(i%3),10,8),b);sp_.scale.set(.8,1.3,.8);sp_.position.set(Math.sin(i*1.7)*.2,.62+i*.05,Math.cos(i*1.7)*.15);g.add(sp_);}
      }
    });
    R.markDirty&&R.markDirty(true);
  }
  buildPlants('bush');
  function setPlant(k){const kk=['bush','tulip','sunflower','rose','cactus','fern','lavender'].includes(k)?k:'bush';if(kk!==plantKind)buildPlants(kk);}
  /* neon sign */
  const sign=document.createElement('canvas');sign.width=768;sign.height=300;
  const NEONS=['#ff3fd0','#3fa9ff','#3dff9a','#ffd23f','#ff8a1f','#ff4d4d','#a66bff','#ffffff'];
  let neonC=(R.room&&R.room.theme&&R.room.theme.neon)||NEONS[0];let signT=null;
  let signTxt='Gist & Paint',tagTxt='Create \u00b7 Gist \u00b7 Connect';
  function drawSign(col){neonC=col||neonC;const g=sign.getContext('2d');g.clearRect(0,0,768,300);g.textAlign='center';
    let fs=118;g.font='italic 800 '+fs+'px Georgia,serif';while(g.measureText(signTxt).width>700&&fs>40){fs-=4;g.font='italic 800 '+fs+'px Georgia,serif';}
    const y1=125-(118-fs)*.25;g.shadowColor=neonC;g.shadowBlur=28;g.fillStyle='#fff';g.fillText(signTxt,384,y1);g.shadowBlur=22;g.fillStyle=neonC;g.fillText(signTxt,384,y1);g.shadowBlur=0;g.fillStyle='#fff';g.fillText(signTxt,384,y1);
    let f2=40;g.font='italic 600 '+f2+'px Georgia,serif';while(g.measureText(tagTxt).width>700&&f2>18){f2-=2;g.font='italic 600 '+f2+'px Georgia,serif';}
    g.shadowColor=neonC;g.shadowBlur=12;g.fillText(tagTxt,384,200);g.shadowBlur=0;g.strokeStyle=neonC;g.lineWidth=8;g.lineCap='round';g.beginPath();g.moveTo(190,230);g.lineTo(580,222);g.stroke();if(signT)signT.needsUpdate=true;R.markDirty&&R.markDirty();}
  function setSignText(a,b){const x=(a||'').trim().slice(0,18),y=(b||'').trim().slice(0,32);const nx=x||'Gist & Paint',ny=y||'Create \u00b7 Gist \u00b7 Connect';if(nx===signTxt&&ny===tagTxt)return;signTxt=nx;tagTxt=ny;drawSign();}
  drawSign();
  signT=new T.CanvasTexture(sign);signT.encoding=T.sRGBEncoding;const sm=new T.Mesh(new T.PlaneGeometry(1.7,.665),new T.MeshBasicMaterial({map:signT,transparent:true}));sm.position.set(0,2.62,SZ-1.31);backG.add(sm);
  /* reference screen */
  const wall=document.createElement('canvas');wall.width=1024;wall.height=576;const wg=wall.getContext('2d');const wallT=new T.CanvasTexture(wall);wallT.encoding=T.sRGBEncoding;wallT.anisotropy=4;
  bxB(1.86,1.1,.05,mat(0x15112a,.4),0,1.78,SZ-1.31);const wm=new T.Mesh(new T.PlaneGeometry(1.76,.99),new T.MeshBasicMaterial({map:wallT}));wm.position.set(0,1.78,SZ-1.28);backG.add(wm);
  const rr=(g,x,y,w,hh,r)=>{g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+hh,r);g.arcTo(x+w,y+hh,x,y+hh,r);g.arcTo(x,y+hh,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath();};
  let scr={pill:'#6a3df0',cnt:'#4a2fc4',bg:'#f3efff',tint:'#e4dcff',tick:'#7b4dff'};
  const mixC=(a,b,t)=>{const p=x=>[1,3,5].map(i=>parseInt(x.slice(i,i+2),16));const A=p(a),B=p(b);return '#'+A.map((v,i)=>Math.round(v+(B[i]-v)*t).toString(16).padStart(2,'0')).join('');};
  function setScreen(c){scr=/^#[0-9a-f]{6}$/i.test(c||'')?{pill:c,cnt:mixC(c,'#000000',.3),bg:mixC(c,'#ffffff',.92),tint:mixC(c,'#ffffff',.8),tick:c}:{pill:'#6a3df0',cnt:'#4a2fc4',bg:'#f3efff',tint:'#e4dcff',tick:'#7b4dff'};drawWall();}
  const nowS=()=>Date.now()+skew;
  const timeUp=()=>!!sp.ends&&nowS()>=sp.ends;
  const openNow=()=>sp.state==='painting'&&!timeUp();
  const fmtT=n=>{n=Math.max(0,Math.round(n));return Math.floor(n/60)+':'+String(n%60).padStart(2,'0');};
  function drawWall(){
    const g=wg,W=1024,H=576;g.clearRect(0,0,W,H);g.fillStyle=scr.bg;rr(g,0,0,W,H,34);g.fill();
    g.fillStyle=scr.pill;rr(g,28,24,610,92,46);g.fill();g.fillStyle='#fff';g.font='800 48px sans-serif';g.textBaseline='middle';g.fillText('What to Paint Today?',64,72);
    g.fillStyle=scr.cnt;rr(g,806,24,190,104,24);g.fill();g.fillStyle='#fff';g.textAlign='center';g.font='800 48px sans-serif';g.fillText(String(nSeated),900,60);g.font='600 26px sans-serif';g.fillText('Painting',900,102);g.textAlign='left';
    const rc=sp.ref?refCanvas(sp.ref,()=>{drawWall();wallT.needsUpdate=true;R.markDirty&&R.markDirty();}):null;
    if(rc){g.save();rr(g,36,142,350,390,14);g.clip();g.drawImage(rc,36,142,350,390);g.restore();}
    else{g.fillStyle=scr.tint;rr(g,36,142,350,390,14);g.fill();g.fillStyle=scr.pill;g.font='700 28px sans-serif';g.textAlign='center';g.fillText('Host picks',211,320);g.fillText('the picture',211,356);g.textAlign='left';}
    g.fillStyle='#1d1a2b';g.font='800 38px sans-serif';g.fillText('Your Canvas',470,190);g.font='600 30px sans-serif';
    const items=sp.note?[sp.note]:['Grab your brush','Paint the picture','Enjoy your drink'];
    if(sp.note){g.fillStyle='#1d1a2b';g.font='600 30px sans-serif';const words=sp.note.split(' ');let line='',y=250;words.forEach(w=>{const t=line?line+' '+w:w;if(g.measureText(t).width>480&&line){g.fillText(line,470,y);y+=40;line=w;}else line=t;});if(line)g.fillText(line,470,y);}
    else items.forEach((t,i)=>{const y=262+i*76;g.fillStyle=scr.tick;g.beginPath();g.arc(490,y,20,0,7);g.fill();g.strokeStyle='#fff';g.lineWidth=5;g.beginPath();g.moveTo(481,y);g.lineTo(488,y+8);g.lineTo(500,y-8);g.stroke();g.fillStyle='#1d1a2b';g.font='600 32px sans-serif';g.fillText(t,526,y+2);});
    if(!openNow()){g.fillStyle='rgba(30,20,70,.72)';rr(g,0,0,W,H,34);g.fill();g.fillStyle='#fff';g.textAlign='center';const up=timeUp();g.font='800 64px sans-serif';g.fillText(up?"Time's up!":sp.state==='paused'?'Paused':'Waiting for the host',512,250);g.font='600 34px sans-serif';
      if(up){const f=award&&award.fastest;g.fillText(f?'\u26a1 Fastest finisher: @'+f.username+' in '+fmtT(f.seconds):'Painting time is over',512,318);if(award&&award.top)g.fillText('\ud83c\udfc6 Most votes: @'+award.top.username+' ('+award.top.votes+')',512,370);else g.fillText('Open the Gallery to vote',512,370);}
      else{g.fillText(sp.state==='paused'?'The host will resume shortly':'Painting starts soon',512,310);}g.textAlign='left';}
    wallT.needsUpdate=true;R.markDirty&&R.markDirty();
  }
  /* table: easels + canvases, palettes, paints, cups */
  const paper=mat(0xfffdf8,.9),wood=mat(0xb98a55,.55),dark=mat(0x2b2f3a,.7);
  const cvW=.272,cvH=.34,tilt=-.12;
  let seatG=null,badges=[];
  function buildSeatProps(){
    if(seatG){G.remove(seatG);seatG.traverse(o=>{if(o.geometry)o.geometry.dispose();});}
    badges.forEach(b=>b.remove());
    seatG=new T.Group();G.add(seatG);st.cv=[];st.cvMesh=[];const L=st.lay,sc_=L.cap>8?.82:1;
    L.pos.forEach((q,i)=>{
      const x=q.x,Y=q.y,Z=q.z;
      const gr=new T.Group();gr.position.set(x,DESKY+Y,SZ+Z+.8);gr.scale.setScalar(sc_);seatG.add(gr);
      const board=new T.Mesh(new T.BoxGeometry(cvW+.03,cvH+.03,.022),mat(0xe9e1d3,.8));board.position.set(0,.04+cvH/2,0);board.rotation.x=tilt;gr.add(board);
      const face=new T.Mesh(new T.PlaneGeometry(cvW,cvH),new T.MeshBasicMaterial({color:0xfffdf8}));face.position.set(0,.04+cvH/2,0);face.rotation.x=tilt;face.translateZ(.0125);face.userData.idx=i;gr.add(face);
      const ledge=new T.Mesh(new T.BoxGeometry(cvW+.06,.025,.07),wood);ledge.position.set(0,.02,.015);gr.add(ledge);
      [-1,1].forEach(s=>{const leg=new T.Mesh(new T.BoxGeometry(.02,.3,.02),wood);leg.position.set(s*.12,.18,-.1);leg.rotation.x=.55;gr.add(leg);});
      gr.updateMatrixWorld(true);gr.userData.pt=face.localToWorld(new T.Vector3(0,0,-.05));st.cv[i]=gr;st.cvMesh[i]=face;gr.visible=false;
      if(L.cap<=8){
      const pal=new T.Mesh(new T.CylinderGeometry(.075,.075,.008,18),mat(0xf3e7d0,.7));pal.scale.set(1.15,1,.8);pal.position.set(x-.21,DESKY+Y+.006,SZ+Z+.66);seatG.add(pal);
      ['#e63946','#ffd23f','#2d6cdf','#2bb673','#ff8a1f'].forEach((c,k)=>{const d=new T.Mesh(new T.SphereGeometry(.014,8,6),mat(parseInt(c.slice(1),16),.5));d.scale.set(1,.5,1);d.position.set(x-.21+Math.cos(k*1.3)*.05,DESKY+Y+.014,SZ+Z+.66+Math.sin(k*1.3)*.03);seatG.add(d);});
      const br=new T.Mesh(new T.CylinderGeometry(.006,.006,.2,6),mat(0x6b4a2f,.6));br.rotation.z=1.45;br.rotation.y=.3;br.position.set(x+.2,DESKY+Y+.008,SZ+Z+.68);seatG.add(br);}
    });
    L.rowN.forEach((n,r)=>{const Y=r*S.RY,Z=-r*S.RS;
      const tray=new T.Mesh(new T.BoxGeometry(.7,.03,.12),dark);tray.position.set(0,DESKY+Y+.02,SZ+Z+.96);seatG.add(tray);[['#ffd23f'],['#e63946'],['#2d6cdf'],['#1a1a1f']].forEach(([c],k)=>{const b=new T.Mesh(new T.CylinderGeometry(.028,.032,.1,12),mat(parseInt(c.slice(1),16),.4));b.position.set(-.24+k*.16,DESKY+Y+.085,SZ+Z+.96);seatG.add(b);const cap=new T.Mesh(new T.CylinderGeometry(.015,.02,.03,10),mat(0xf5f5f5,.5));cap.position.set(-.24+k*.16,DESKY+Y+.15,SZ+Z+.96);seatG.add(cap);});
      if(L.cap<=8)[[-.95,.9],[.95,.9]].forEach(([x,z])=>{const c=new T.Mesh(new T.CylinderGeometry(.04,.03,.09,14),mat(0x6a3df0,.5));c.position.set(x,DESKY+Y+.065,SZ+Z+z);seatG.add(c);});
    });
    badges=L.pos.map(()=>{const b=h('div',{class:'pt-badge'});st.lbl.appendChild(b);return b;});
    const bw=Math.max(5.2,L.maxX*2+2.4);backdrop.scale.x=bw/5.2;neonStrip.scale.x=bw/5.2;slats.forEach(o=>{o.position.x=(o.userData.sd?1:-1)*(bw/2-.25)+(o.userData.i-2)*.16;});
    backG.position.z=-(L.rows-1)*S.RS;buildPlants(plantKind);
    R.markDirty&&R.markDirty(true);
  }
  buildSeatProps();
  /* hide the occupied-seat prop when a seat is empty */
  function seatSync(){
    nSeated=0;st.lay.pos.forEach((q,i)=>{const uid=st.seats[i];const gr=st.cv[i];if(uid)nSeated++;gr.visible=!!uid;if(uid){const pc=get(uid);const f=st.cvMesh[i];if(f.material.map!==pc.texture()){f.material.map=pc.texture();f.material.color.set(0xffffff);f.material.needsUpdate=true;}}});
    drawWall();
  }
  /* DOM badges (status under each canvas) */
  const oldTick=R.walkTick;
  R.walkTick=dt=>{oldTick(dt);if(!R.cam)return;const w=R.host.clientWidth,hh=R.host.clientHeight,v=new T.Vector3();
    st.lay.pos.forEach((q,i)=>{const uid=st.seats[i],b=badges[i];if(!b)return;if(!uid){b.style.display='none';return;}const pc=canv.get(uid),s=pc?pc.state():0;
      const t=STATES[s];if(b.dataset.s!==String(s)){b.dataset.s=String(s);b.textContent=(s===2?'✓ ':'')+t;b.className='pt-badge s'+s;}
      v.set(q.x,DESKY+q.y-.16,SZ+q.z+st.shift+1.07).project(R.cam);b.style.display=v.z>1?'none':'';b.style.transform='translate(-50%,-50%) translate('+((v.x*.5+.5)*w)+'px,'+((-v.y*.5+.5)*hh)+'px)';});};
  /* tap a canvas in the 3D view */
  const ray=new T.Raycaster(),m2=new T.Vector2();
  const onClick=e=>{if(e.target.closest&&e.target.closest('button,.pt-badge,.sp-lbl'))return;const r=R.host.getBoundingClientRect();m2.set(((e.clientX-r.left)/r.width)*2-1,-((e.clientY-r.top)/r.height)*2+1);ray.setFromCamera(m2,R.cam);
    const hit=ray.intersectObjects(st.cvMesh.filter((m,i)=>st.seats[i]),false)[0];
    if(!hit){if(st.lay.cap>8&&st.cb&&st.cb.onTap){let best=null;st.map.forEach((en,u)=>{const x=ray.intersectObject(en.f.holder,true)[0];if(x&&(!best||x.distance<best.d))best={d:x.distance,u};});if(best)st.cb.onTap(best.u);}return;}const uid=st.seats[hit.object.userData.idx];if(uid===me)openPaint();else if(uid)viewCanvas(uid);};
  R.host.addEventListener('click',onClick);

  /* ---- network: broadcast strokes, save to the database ---- */
  function send(ev,payload){if(ch&&chOk)try{ch.send({type:'broadcast',event:ev,payload});}catch(e){}}
  function connect(){
    try{ch=sb.channel('pt:'+spaceId,{config:{broadcast:{self:false}}});
      ch.on('broadcast',{event:'seg'},({payload:p})=>onSeg(p)).on('broadcast',{event:'sync'},({payload:p})=>{if(!p||!p.u||p.u===me||!Array.isArray(p.ops))return;if(!p.total||p.total<2){get(p.u).load(p.ops);return;}const b=syncIn[p.u]&&syncIn[p.u].sid===p.sid?syncIn[p.u]:(syncIn[p.u]={sid:p.sid,parts:{},n:0});if(!b.parts[p.part]){b.parts[p.part]=p.ops;b.n++;}if(b.n>=p.total){let all=[];for(let i=0;i<p.total;i++)all=all.concat(b.parts[i]||[]);delete syncIn[p.u];get(p.u).load(all);}})
        .on('broadcast',{event:'neon'},({payload:p})=>{if(p&&typeof p.c==='string'&&/^#[0-9a-f]{6}$/i.test(p.c))drawSign(p.c);}).on('broadcast',{event:'hello'},({payload:p})=>{if(p&&p.u!==me&&!mine.empty())setTimeout(()=>sendSync(),200+Math.random()*600);})
        .subscribe(s=>{if(s==='SUBSCRIBED'){chOk=true;send('hello',{u:me});}else if(s==='CLOSED'||s==='CHANNEL_ERROR')chOk=false;});}catch(e){}
  }
  const syncIn={};
  /* the whole painting is sent in pieces so a big painting still reaches viewers live (each realtime message stays small) */
  function sendSync(){const ops=mine.ops,parts=[];let cur=[],sz=0;for(const o of ops){const l=o.p?o.p.length*5+60:60;if(sz+l>90000&&cur.length){parts.push(cur);cur=[];sz=0;}cur.push(o);sz+=l;}parts.push(cur);const sid=Math.random().toString(36).slice(2,8);parts.forEach((pp,i)=>setTimeout(()=>send('sync',{u:me,ops:pp,part:i,total:parts.length,sid}),i*120));}
  const remoteOps=new Map();
  function onSeg(p){if(!p||!p.u||p.u===me||!Array.isArray(p.p))return;const pc=get(p.u);let op=remoteOps.get(p.u+':'+p.id);
    if(p.t){if(!op){op=pc.start(p.t,p.c,+p.z||8,p.p[0],p.p[1],p.id);if(!op)return;remoteOps.set(p.u+':'+p.id,op);for(let i=2;i<p.p.length;i+=2)pc.extend(op,p.p[i],p.p[i+1]);}}
    else if(op){for(let i=0;i<p.p.length;i+=2)pc.extend(op,p.p[i],p.p[i+1]);}
    const now=Date.now();if(now-lastPaintPing>600){lastPaintPing=now;R.stagePaint(p.u);}}
  function saveSoon(){clearTimeout(saveT);saveT=setTimeout(saveNow,2500);}
  async function saveNow(){clearTimeout(saveT);if(dead&&!ctx.final)return;try{const r=await sb.rpc('paint_save',{p_space:spaceId,p_ops:mine.ops,p_done:mine.state()===2});if(r.error)throw r.error;}catch(e){console.warn('paint save',e);}}
  async function loadAll(){try{const r=await sb.rpc('paint_list',{p_space:spaceId});if(r.error)throw r.error;(r.data||[]).forEach(x=>{if(x.user_id===me&&!mine.empty())return;get(x.user_id).load(x.ops);});seatSync();}catch(e){console.warn(e);}}
  connect();loadAll();

  /* ---- big view of someone else's painting (live) ---- */
  function viewCanvas(uid){
    const pc=get(uid),p=ctx.participants().find(x=>x.id===uid)||{};
    sheet('@'+(p.username||'painter'),(body)=>{const c=h('canvas',{width:CW,height:CH,class:'pt-view'});const g=c.getContext('2d');const t=setInterval(()=>{if(!c.isConnected){clearInterval(t);return;}g.drawImage(pc.cv,0,0);},400);g.drawImage(pc.cv,0,0);body.append(c,h('p',{class:'f-hint',style:{textAlign:'center'}},STATES[pc.state()]));});
  }
  /* ---- reference viewer ---- */
  function showRef(){
    if(ov){/* inside the painting screen: show it on top of that screen, not on the page behind it */
      ov.querySelector('.pt-refbox')&&ov.querySelector('.pt-refbox').remove();
      const c=h('canvas',{width:400,height:500,class:'pt-view',style:{width:'100%',height:'auto',borderRadius:'12px',display:'block'}}),g=c.getContext('2d');
      const paint=()=>{if(sp.ref)g.drawImage(refCanvas(sp.ref,paint),0,0);};paint();
      const box=h('div',{class:'pt-sig pt-refbox',onclick:e=>{if(e.target===box)box.remove();}},h('div',{class:'pt-sigc',style:{width:'min(360px,100%)',maxHeight:'100%',overflow:'auto'}},
        h('b',null,'Reference'),h('div',{style:{margin:'8px 0'}},sp.ref?c:h('p',{class:'f-hint'},'The host has not picked a picture yet.')),sp.note?h('p',{style:{margin:'0 0 8px'}},sp.note):null,h('button',{class:'btn block',onclick:()=>box.remove()},'Close')));
      ov.append(box);return;}
    sheet('Reference',(body)=>{const c=h('canvas',{width:400,height:500,class:'pt-view'});const g=c.getContext('2d');const paint=()=>{if(sp.ref){g.drawImage(refCanvas(sp.ref,paint),0,0);}else{g.fillStyle='#eee';g.fillRect(0,0,400,500);}};paint();
      body.append(sp.ref?c:h('p',{class:'f-hint'},'The host has not picked a picture yet.'),sp.note?h('p',null,sp.note):null);});
  }

  /* ---- the painting overlay ---- */
  function openPaint(){
    if(ov)return;
    if(!st.map.has(me)){toast('Only the host and people invited to paint have an easel. You are watching. Ask the host to invite you to paint.');return;}
    let tool='b',color=COLS[1][1],size=14,drawing=null,cur=null,sendBuf=[],lastSend=0,miniOn=true,Z=1,PX=0,PY=0,gA=false,gLock=false,g0=null,strokeT=0;const ptrs=new Map();
    const frame=h('div',{class:'pt-frame'});const cv=mine.cv;cv.className='pt-cv';let guideOn=true;const gcv=h('canvas',{class:'pt-guide',width:CW,height:CH});const stack=h('div',{class:'pt-stack'},cv,gcv);frame.append(stack);
    function drawGuide(){const g=gcv.getContext('2d');g.clearRect(0,0,CW,CH);gcv.style.display=guideOn&&sp.ref?'':'none';if(guideOn&&sp.ref)g.drawImage(guideCanvas(sp.ref,drawGuide),0,0);}
    const banner=h('div',{class:'pt-ban'});
    const sw=h('div',{class:'pt-sw'}),tools=h('div',{class:'pt-tools'}),stch=h('div',{class:'pt-st'}),size_=h('input',{type:'range',min:'3',max:'44',value:String(size),'aria-label':'Brush size'});
    let miniT=0;const mini=h('button',{class:'pt-mini','aria-label':'Hide this picture for a few seconds',onclick:()=>{mini.classList.add('away');clearTimeout(miniT);miniT=setTimeout(()=>mini.classList.remove('away'),6000);}});const mc=refCanvas(sp.ref||'',()=>drawMini());const mg=h('canvas',{width:120,height:150});mini.append(mg);
    function drawMini(){const g=mg.getContext('2d');g.fillStyle='#eee';g.fillRect(0,0,120,150);if(sp.ref)g.drawImage(refCanvas(sp.ref,drawMini),0,0,120,150);}
    let palRef='__';const paintSw=()=>{palRef=sp.ref||'';const PL=refPalette(sp.ref);if(!PL.some(([n,c])=>c===color))color=PL[0][1];sw.replaceChildren(...PL.map(([n,c])=>h('button',{class:'pt-c'+(c===color?' on':''),style:{background:c},'aria-label':n,title:c,onclick:()=>{color=c;if(tool==='e')tool='b';paintTools();paintSw();}})));};
    const T3=[['b','Brush'],['p','Pencil'],['e','Eraser']];
    const act=(l,fn,cls)=>h('button',{class:'pt-b '+(cls||''),onclick:fn},l);
    function paintTools(){tools.replaceChildren(...T3.map(([k,l])=>h('button',{class:'pt-b'+(tool===k?' on':''),onclick:()=>{tool=k;paintTools();}},l)),h('button',{class:'pt-b'+(guideOn?' on':''),onclick:()=>{guideOn=!guideOn;drawGuide();paintTools();}},'Guide'),act('Sign',()=>signPad(false)),act('Undo',()=>{if(mine.undo())changed(true);}),act('Redo',()=>{if(mine.redoOp())changed(true);}),act('Clear',()=>{if(mine.empty())return;if(confirm('Clear your whole canvas?')){mine.clear();changed(true);}},'warn'));}
    function paintState(){stch.replaceChildren(...STATES.map((l,i)=>h('button',{class:'pt-sc'+(mine.state()===i?' on':''),onclick:()=>{mine.setState(i);changed(true);paintState();if(i===2&&!mine.ops.some(o=>o.sig))signPad(true);}},l)));}
    function changed(full){redraw();if(full)sendSync();saveSoon();}
    /* sign the artwork: draw a signature on a small pad, it is stamped small in the bottom-right corner as ordinary strokes (so it syncs, saves and shows in the gallery) */
    function signPad(offer){
      if(!ov)return;ov.querySelector('.pt-sig')&&ov.querySelector('.pt-sig').remove();
      const W=320,H=120,pad=h('canvas',{width:W,height:H,class:'pt-sigpad'}),g=pad.getContext('2d');let strokes=[],cur=null,id=null;
      const paint=()=>{g.clearRect(0,0,W,H);g.fillStyle='#fffdf8';g.fillRect(0,0,W,H);g.strokeStyle='#e3d9c8';g.lineWidth=2;g.beginPath();g.moveTo(16,H-30);g.lineTo(W-16,H-30);g.stroke();
        g.strokeStyle='#1d1a2b';g.lineWidth=3;g.lineCap=g.lineJoin='round';strokes.forEach(st=>{g.beginPath();st.forEach((q,i)=>i?g.lineTo(q[0],q[1]):g.moveTo(q[0],q[1]));if(st.length===1)g.lineTo(st[0][0]+.1,st[0][1]);g.stroke();});};
      const pt=e=>{const r=pad.getBoundingClientRect();return[(e.clientX-r.left)*W/r.width,(e.clientY-r.top)*H/r.height];};
      pad.addEventListener('pointerdown',e=>{e.preventDefault();id=e.pointerId;try{pad.setPointerCapture(id);}catch(x){}cur=[pt(e)];strokes.push(cur);paint();});
      pad.addEventListener('pointermove',e=>{if(id!==e.pointerId||!cur)return;e.preventDefault();cur.push(pt(e));paint();});
      const up=e=>{if(id===e.pointerId){cur=null;id=null;}};pad.addEventListener('pointerup',up);pad.addEventListener('pointercancel',up);
      const box=h('div',{class:'pt-sig'});const closeS=()=>box.remove();
      const stamp=()=>{
        const pts=strokes.flat();if(!pts.length){toast('Draw your signature first');return;}
        const xs=pts.map(q=>q[0]),ys=pts.map(q=>q[1]),x0=Math.min(...xs),x1=Math.max(...xs),y0=Math.min(...ys),y1=Math.max(...ys),bw=Math.max(1,x1-x0),bh=Math.max(1,y1-y0);
        const TW=170,TH=60,sc=Math.min(TW/bw,TH/bh,1.4),ox=CW-24-bw*sc,oy=CH-26-bh*sc;
        mine.ops=mine.ops.filter(o=>!o.sig);
        const conv=st=>st.reduce((a,q)=>{a.push(Math.round(ox+(q[0]-x0)*sc),Math.round(oy+(q[1]-y0)*sc));return a;},[]);
        strokes.forEach(st=>{const c=conv(st);if(c.length<4)c.push(c[0]+1,c[1]);mine.ops.push({k:'s',t:'p',c:'#ffffff',z:20,p:c,id:null,sig:1});});
        strokes.forEach(st=>{const c=conv(st);if(c.length<4)c.push(c[0]+1,c[1]);mine.ops.push({k:'s',t:'p',c:'#1d1a2b',z:11,p:c,id:null,sig:1});});
        mine.render();changed(true);closeS();toast('Signed');};
      box.append(h('div',{class:'pt-sigc'},h('b',null,offer?'Your painting is complete. Sign it?':'Sign your artwork'),h('p',{class:'f-hint',style:{margin:'4px 0 8px'}},'Draw your signature with your finger. It goes small in the bottom-right corner.'),pad,
        h('div',{class:'pt-hc',style:{marginTop:'10px'}},h('button',{class:'btn small',onclick:()=>{strokes=[];paint();}},'Clear'),h('button',{class:'btn small',onclick:()=>{mine.ops=mine.ops.filter(o=>!o.sig);mine.render();changed(true);closeS();}},'Remove signature'),h('button',{class:'btn small',onclick:closeS},offer?'Skip':'Cancel'),h('button',{class:'btn coral small',onclick:stamp},'Sign'))));
      ov.append(box);paint();
    }
    const allowed=()=>openNow();
    function paintBan(){const ok=openNow();banner.textContent=ok?'':(timeUp()?"Time's up! Check the Gallery for the fastest finisher":sp.state==='paused'?'Painting is paused by the host':'Waiting for the host to start the session');banner.style.display=ok?'none':'';}
    const pos=e=>{const r=cv.getBoundingClientRect();return[(e.clientX-r.left)/r.width*CW,(e.clientY-r.top)/r.height*CH];};
    let lastMoveT=0;const endStroke=()=>{if(drawing===null)return;drawing=null;try{flush();}catch(x){}cur=null;saveSoon();};
    /* two fingers = pinch to zoom and drag to move; one finger always paints. A second finger landing right after a stroke began cancels that tiny stroke so no stray mark is left */
    const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y)||1;
    function startG(){
      if(drawing!==null){if(cur&&Date.now()-strokeT<350){drawing=null;cur=null;sendBuf=[];if(mine.undo())changed(true);}else endStroke();}
      const ps=[...ptrs.values()],a=ps[0],b=ps[1],mx=(a.x+b.x)/2,my=(a.y+b.y)/2,r=cv.getBoundingClientRect(),cx=r.left+r.width/2-PX,cy=r.top+r.height/2-PY;
      g0={d:dist(a,b),Z,cx,cy,ux:(mx-cx-PX)/Z,uy:(my-cy-PY)/Z};gA=true;gLock=true;
    }
    function moveG(){
      const ps=[...ptrs.values()];if(ps.length<2||!g0)return;const a=ps[0],b=ps[1],mx=(a.x+b.x)/2,my=(a.y+b.y)/2;
      Z=Math.max(1,Math.min(4,g0.Z*dist(a,b)/g0.d));PX=mx-g0.cx-Z*g0.ux;PY=my-g0.cy-Z*g0.uy;if(Z<1.03){Z=1;}applyZ();
    }
    const down=e=>{ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});try{cv.setPointerCapture(e.pointerId);}catch(x){}if(ptrs.size>=2){e.preventDefault();if(ptrs.size===2)startG();return;}if(gLock)return;if(!allowed())return;if(drawing!==null){if(Date.now()-lastMoveT>2000)endStroke();else return;}lastMoveT=Date.now();e.preventDefault();try{cv.setPointerCapture(e.pointerId);}catch(x){}drawing=e.pointerId;strokeT=Date.now();const[x,y]=pos(e);const id=Math.random().toString(36).slice(2,8);cur=mine.start(tool,color,size,x,y,id);if(!cur){drawing=null;return;}sendBuf=[cur.p[0],cur.p[1]];cur.first=true;flush();};
    const move=e=>{if(ptrs.has(e.pointerId))ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});if(gA){e.preventDefault();moveG();return;}if(gLock)return;if(drawing!==e.pointerId||!cur)return;lastMoveT=Date.now();e.preventDefault();const ev=e.getCoalescedEvents?e.getCoalescedEvents():[e];(ev.length?ev:[e]).forEach(q=>{const[x,y]=pos(q);if(mine.extend(cur,x,y))sendBuf.push(Math.round(x),Math.round(y));});const n=Date.now();if(n-lastSend>110)flush();if(n-lastPaintPing>600){lastPaintPing=n;R.stagePaint(me);}};
    const up=e=>{ptrs.delete(e.pointerId);if(gLock){if(ptrs.size<2)gA=false;if(ptrs.size===0)gLock=false;return;}if(drawing!==e.pointerId)return;drawing=null;flush();cur=null;saveSoon();};
    function flush(){lastSend=Date.now();if(!cur||!sendBuf.length)return;const p={u:me,id:cur.id,p:sendBuf};if(cur.first){p.t=cur.t;p.c=cur.c;p.z=cur.z;cur.first=false;}send('seg',p);sendBuf=[];}
    /* the canvas element is kept between visits, so these handlers must be removed on close or a second visit paints every stroke twice (old colour and size underneath) */
    if(mine._ac){try{mine._ac.abort();}catch(x){}}const ac=mine._ac=new AbortController(),sg={signal:ac.signal};
    cv.addEventListener('pointerdown',down,sg);cv.addEventListener('pointermove',move,sg);cv.addEventListener('pointerup',up,sg);cv.addEventListener('pointercancel',up,sg);cv.style.touchAction='none';
    /* leaving the page or switching apps mid-stroke can swallow the pointer-up; finish the stroke so the brush never gets stuck */
    cv.addEventListener('lostpointercapture',up,sg);
    const stuckFix=()=>{ptrs.clear();gA=false;gLock=false;if(document.visibilityState==='visible'){try{mine.ensure();}catch(x){}}if(!ov||!ov.isConnected){document.removeEventListener('visibilitychange',stuckFix);window.removeEventListener('blur',stuckFix);window.removeEventListener('pageshow',stuckFix);return;}endStroke();};
    try{mine.ensure();}catch(x){}
    document.addEventListener('visibilitychange',stuckFix);window.addEventListener('blur',stuckFix);window.addEventListener('pageshow',stuckFix);
    size_.oninput=()=>{size=+size_.value;};
    const key=e=>{if(e.target&&/INPUT|TEXTAREA/.test(e.target.tagName)&&e.target.type!=='range')return;const k=e.key.toLowerCase();
      if((e.ctrlKey||e.metaKey)&&k==='z'){e.preventDefault();if(e.shiftKey?mine.redoOp():mine.undo())changed(true);}else if((e.ctrlKey||e.metaKey)&&k==='y'){e.preventDefault();if(mine.redoOp())changed(true);}
      else if(k==='b'){tool='b';paintTools();}else if(k==='p'){tool='p';paintTools();}else if(k==='e'){tool='e';paintTools();}
      else if(k==='['){size=Math.max(3,size-3);size_.value=size;}else if(k===']'){size=Math.min(44,size+3);size_.value=size;}else if(k==='escape')close();};
    document.addEventListener('keydown',key);
    /* zoom setting: one Zoom button in the top bar opens a small panel; pinching on the canvas also works */
    const ZS=[1,1.5,2,3,4],zl=h('b',{class:'pt-zl'},'1x'),zp=h('div',{class:'pt-zp',hidden:true},
      h('button',{'aria-label':'Zoom out',onclick:()=>stepZ(-1)},'\u2212'),h('button',{class:'pt-z1','aria-label':'Back to full picture',onclick:()=>{Z=1;PX=PY=0;applyZ();}},zl),h('button',{'aria-label':'Zoom in',onclick:()=>stepZ(1)},'+'),
      h('span',{class:'pt-zh'},'Pinch with two fingers to zoom and move. One finger paints.'));
    function applyZ(){const w=cv.offsetWidth,hh=cv.offsetHeight,mx=(Z-1)*w/2,my=(Z-1)*hh/2;PX=Math.max(-mx,Math.min(mx,PX));PY=Math.max(-my,Math.min(my,PY));stack.style.transform=Z===1?'':'translate('+PX+'px,'+PY+'px) scale('+Z+')';zl.textContent=(Math.round(Z*10)/10)+'x';}
    function stepZ(d){const nz=d>0?(ZS.find(q=>q>Z+.01)||4):([...ZS].reverse().find(q=>q<Z-.01)||1);PX=PX*nz/Z;PY=PY*nz/Z;Z=nz;if(Z===1){PX=PY=0;}applyZ();}
    function fit(){const w=frame.clientWidth,hh=frame.clientHeight;if(!w||!hh)return;const s=Math.min(w/CW,hh/CH);cv.style.width=Math.floor(CW*s)+'px';cv.style.height=Math.floor(CH*s)+'px';applyZ();}
    const ro=window.ResizeObserver?new ResizeObserver(fit):null;
    function close(){if(!ov)return;flush();try{ac.abort();}catch(x){}document.removeEventListener('keydown',key);ro&&ro.disconnect();stack.remove();cv.remove();cv.removeAttribute('style');ov.remove();ov=null;R.setPaused&&R.setPaused(false);redraw();saveNow();sendSync();}
    ov=h('div',{class:'pt-ov'},
      h('div',{class:'pt-top'},h('button',{class:'pt-done',onclick:close},'Done'),h('b',null,'My canvas'),h('span',{class:'pt-topr'},h('button',{class:'pt-ref',onclick:()=>{zp.hidden=!zp.hidden;}},'Zoom'),h('button',{class:'pt-ref',onclick:showRef},'Reference'))),zp,
      banner,frame,mini,
      h('div',{class:'pt-dock'},tools,h('div',{class:'pt-sz'},h('span',null,'Size'),size_),sw,stch));
    document.body.appendChild(ov);R.setPaused&&R.setPaused(true);ro&&ro.observe(frame);fit();paintTools();paintSw();paintState();paintBan();drawMini();drawGuide();
    ov._upd=()=>{paintBan();drawMini();drawGuide();if((sp.ref||'')!==palRef)paintSw();};
  }

  /* ---- host studio panel ---- */
  function studio(){
    sheet('Studio controls',(body,close)=>{
      const draw=()=>{body.replaceChildren();build();};
      const build=()=>{
      const send_=(a,v)=>guard(null,async()=>{const r=await sb.rpc('paint_host',{p_space:spaceId,p_action:a,p_val:v==null?null:v});if(r.error)throw r.error;
        lockUntil=Date.now()+6000;if(a==='ref')sp.ref=v||null;else if(a==='note')sp.note=(v||'').trim().slice(0,200);else if(a==='start'||a==='resume')sp.state='painting';else if(a==='pause')sp.state='paused';
        seatSync();paintHud();ov&&ov._upd&&ov._upd();ctx.refresh&&ctx.refresh();if(a==='start'||a==='resume'){toast('Painting started');close();}else if(a!=='note')draw();});
      const grid=h('div',null,...refGroups().map(([title,items])=>h('div',null,h('div',{class:'pt-cat'},title),h('div',{class:'pt-refs'},items.map(([id,n])=>{const c=refCanvas('ref:'+id);const t=h('canvas',{width:100,height:125});t.getContext('2d').drawImage(c,0,0,100,125);return h('button',{class:'pt-rb'+(sp.ref==='ref:'+id?' on':''),onclick:async()=>{await send_('ref','ref:'+id);toast('Reference changed');}},t,h('span',null,n));})))));
      const note=h('textarea',{maxlength:'200',rows:'2',placeholder:'Instructions for everyone (optional)'});note.value=sp.note||'';
      const saveN=h('button',{class:'btn small'},'Show on the screen');saveN.onclick=()=>send_('note',note.value);
      const clr=h('button',{class:'btn small'},'Clear picture');clr.onclick=()=>send_('ref','');
      const ctl=h('div',{class:'pt-hc'},sp.state==='waiting'?h('button',{class:'btn coral',onclick:()=>send_('start')},'Start painting'):sp.state==='painting'?h('button',{class:'btn',onclick:()=>send_('pause')},'Pause'):h('button',{class:'btn coral',onclick:()=>send_('resume')},'Resume'));
      const timerSet=async m=>{try{const r=await sb.rpc('paint_host',{p_space:spaceId,p_action:'timer',p_val:String(m)});if(r.error)throw r.error;sp.ends=m?nowS()+m*60000:0;if(m)sp.state='painting';upFlag=false;award=null;lockUntil=Date.now()+6000;seatSync();paintHud();tickClock();ov&&ov._upd&&ov._upd();ctx.refresh&&ctx.refresh();toast(m?'Countdown started: '+m+' minutes':'Countdown cleared');draw();}catch(e){if(/PREMIUM_REQUIRED/.test(String(e&&e.message||e))){close();typeof OWPlans!=='undefined'&&OWPlans.limitSheet(spaceId);return;}toast(friendlyError(e),'err');}};
      const tmRow=h('div',{class:'pt-neon pt-tmrow'},...[10,15,20,30,45,60].map(m=>h('button',{class:'btn small',onclick:()=>timerSet(m)},m+' min')),sp.ends?h('button',{class:'btn small',onclick:()=>timerSet(0)},'Clear'):null);
      const neonRow=h('div',{class:'pt-neon'},NEONS.map(c=>h('button',{class:'pt-nsw'+(c.toLowerCase()===String(neonC).toLowerCase()?' on':''),style:{background:c},'aria-label':'Neon colour '+c,onclick:()=>{drawSign(c);send('neon',{c});Store.hostNeon&&Store.hostNeon(c);[...neonRow.children].forEach(x=>x.classList.toggle('on',x===neonRow.children[NEONS.indexOf(c)]));}})));
      body.append(h('p',{class:'f-hint'},'Session: '+(sp.state==='waiting'?'waiting to start':sp.state)),ctl,h('div',{class:'f-label',style:{margin:'14px 0 6px'}},'Reference picture'),grid,h('div',{class:'pt-hc',style:{marginTop:'8px'}},clr),h('div',{class:'f-label',style:{margin:'14px 0 6px'}},'Instructions'),note,h('div',{style:{marginTop:'6px'}},saveN),
        h('div',{class:'f-label',style:{margin:'14px 0 6px'}},'Painting countdown (Premium)'),h('p',{class:'f-hint',style:{margin:'0 0 6px'}},'Starts now and ends painting for everyone. The first painter to mark Completed wins the Fastest finisher award.'),tmRow,
        h('div',{class:'f-label',style:{margin:'14px 0 6px'}},'Neon sign colour'),neonRow,
        h('div',{class:'pt-hc',style:{marginTop:'14px'}},h('button',{class:'btn small',onclick:()=>{close();galleryModal();}},'Show all paintings')));
    };build();
    });
  }
  function galleryModal(){sheet('Gallery',async(body)=>{body.append(spinner());await saveNow();const gv=await galleryView(spaceId,sp.title);const t0=gv.querySelector('h3');t0&&t0.remove();body.replaceChildren(gv);});}

  /* ---- HUD buttons ---- */
  const hud=h('div',{class:'pt-hud'});
  const tchip=h('span',{class:'pt-hs pt-tm'});
  function paintHud(){hud.replaceChildren(...[
    sp.ends?tchip:null,
    h('button',{class:'pt-hb coral',onclick:openPaint},st.map.has(me)?'Paint':'Watching'),
    h('button',{class:'pt-hb',onclick:showRef},'Reference'),
    h('button',{class:'pt-hb',onclick:galleryModal},'Gallery'),
    ctx.isHost()?h('button',{class:'pt-hb',onclick:studio},'Studio'):null,
    sp.state!=='painting'?h('span',{class:'pt-hs'},sp.state==='paused'?'Paused':ctx.isHost()?'Press Studio, pick a picture, then start':'Waiting for the host to start'):null].filter(Boolean));}
  async function loadAward(){try{const r=await sb.rpc('paint_award',{p_space:spaceId});if(!r.error){award=r.data||null;drawWall();ov&&ov._upd&&ov._upd();}}catch(e){}}
  function tickClock(){
    if(!sp.ends){tchip.textContent='';return;}
    const ms=sp.ends-nowS();
    if(ms>0){tchip.textContent='\u23f1 '+fmtT(Math.ceil(ms/1000))+' to paint';tchip.classList.toggle('low',ms<=60000);}
    else{tchip.textContent="\u23f1 Time's up";tchip.classList.add('low');if(!upFlag){upFlag=true;toast("Time's up! Open the Gallery to see the fastest finisher and vote.");try{saveNow();}catch(e){}paintHud();drawWall();ov&&ov._upd&&ov._upd();setTimeout(loadAward,2500);}}
  }
  const clockT=setInterval(()=>{if(dead)clearInterval(clockT);else if(sp.ends)tickClock();},1000);
  paintHud();drawWall();tickClock();


  return{hud,setScreen,setBackdrop,setSignText,setPlant,relayout(){buildSeatProps();seatSync();},
    update(D){if(dead)return;const s=Object.assign({},D.space);if(Date.now()<lockUntil){s.paint_ref=sp.ref;s.paint_state=sp.state;s.paint_note=sp.note;}const ch_=sp.ref!==s.paint_ref||sp.state!==s.paint_state||sp.note!==(s.paint_note||'');
      if(s.server_now){const x=new Date(s.server_now).getTime();if(x)skew=x-Date.now();}const ne=s.paint_ends_at?new Date(s.paint_ends_at).getTime():0;const ce=ne!==sp.ends;sp={ref:s.paint_ref||null,state:s.paint_state||'waiting',note:s.paint_note||'',title:s.title,ends:ne};if(ce){upFlag=false;award=null;tickClock();}seatSync();if(ch_||ce){paintHud();ov&&ov._upd&&ov._upd();}},
    seatSync,
    async finalSave(){ctx.final=true;await saveNow();},
    destroy(){dead=true;document.removeEventListener('visibilitychange',wake);window.removeEventListener('pageshow',wake);window.removeEventListener('focus',wake);clearTimeout(saveT);try{if(mine._ac)mine._ac.abort();}catch(e){}try{if(ov){mine.cv.remove();ov.remove();ov=null;}}catch(e){}try{R.host.removeEventListener('click',onClick);}catch(e){}try{ch&&sb.removeChannel(ch);}catch(e){}badges.forEach(b=>b.remove());hud.remove();}};
}
return{attach,galleryView,myArtworks,PC,REFS,guideCanvas,refCanvas,refPalette};
})();
