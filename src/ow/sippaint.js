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
const REFS=[['sunset','Palm sunset'],['flowers','Flower vase'],['mountains','Mountain lake'],['city','City at night'],['abstract','Colour circles'],['cat','Sleepy cat'],['sunflower','Sunflower'],['fish','Goldfish bowl'],['house','Cosy house'],['rocket','Rocket in space'],['moonsea','Moonlit sea'],['dunes','Desert dunes'],['fluid','Fluid colour'],['monstera','Monstera leaves'],['deco','Art-deco sunrise'],['vinyl','Vinyl night'],['pines','Misty pines'],['neonrain','Neon rain street'],['bridge','Lagoon bridge dusk'],['aelephant','Elephant at sunset'],['afox','Fox under the moon'],['astag','Stag and moon'],['alion','Lion mane'],['aflamingo','Flamingo'],['awhale','Whale tail'],['asun','Boho sun and mountains'],['acat','Cat and moon'],['aowl','Night owl'],['abutterfly','Butterfly'],['bcamera','Vintage camera'],['bguitar','Acoustic guitar'],['bheadphones','Headphones and notes'],['btoast','Cheers'],['bperfume','Perfume bottle'],['hafro','Afro portrait'],['hdance','Dancing couple'],['hpop','Cap and shades'],['hflower','Flower crown'],['hsax','Saxophone player'],['balloon','Hot-air balloon'],['hrobe','Man in a flowing robe'],['xmoons','Moon phases'],['sfruit','Fruit bowl'],['steapot','Teapot and cups'],['scandle','Candle and books'],['spine','Pineapple and mangoes'],['dkoi','Koi pond'],['dlight','Lighthouse at dusk'],['dboom','Retro boombox'],['dmartini','Cocktail hour'],['dcaravan','Desert caravan']];

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
const refCache=new Map();
function refCanvas(id,onLoad){
  if(refCache.has(id))return refCache.get(id);
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
  rows.sort((a,b)=>(b.done-a.done));
  rows.forEach(r=>{const pc=new PC();pc.load(r.ops);const url=pc.cv.toDataURL('image/jpeg',.88),mine=Auth.user&&r.user_id===Auth.user.id;
    const save=mine?h('button',{class:'btn small coral'},'Save to my gallery'):null;
    if(save)save.onclick=()=>guard(save,async()=>{const blob=await new Promise(res=>pc.hires(2).toBlob(res,'image/jpeg',.95));const path=await uploadFile('room-images',blob,'jpg','image/jpeg');const x=await sb.rpc('paint_artwork_save',{p_path:path,p_title:'Painting by @'+r.username,p_space_title:title||''});if(x.error)throw x.error;save.textContent='Saved';save.disabled=true;toast('Saved to your gallery');});
    const dl=h('button',{class:'btn small'},'Download HD');dl.onclick=()=>guard(dl,async()=>{const blob=await new Promise(res=>pc.hires(4).toBlob(res,'image/png'));download(blob,'openwalls-painting-'+(r.username||'art')+'.png');});
    grid.append(h('div',{class:'pt-gc'},h('img',{src:url,alt:'Painting by @'+r.username}),h('div',{class:'pt-gw'},avatarEl({avatar_url:r.avatar_url,display_name:r.display_name,username:r.username},'sm'),h('div',null,h('b',null,'@'+r.username),h('span',null,(r.done?'Completed':'In progress')+' · '+(title||'Gist & Paint')))),save,dl));});
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
    body.append(img,h('p',{class:'f-hint',style:{margin:'8px 0'}},new Date(a.created_at).toLocaleDateString()+' \u00b7 It hangs on the wall you are facing and you can move or resize it.'),wall,save);
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
  const canv=new Map();let dead=false,ch=null,chOk=false,saveT=null,flushT=null,pending=null,cur=null,sp={ref:null,state:'waiting',note:'',title:''},nSeated=0,lastPaintPing=0,ov=null,lockUntil=0;
  const redraw=(()=>{let q=false;return()=>{if(q||dead)return;q=true;requestAnimationFrame(()=>{q=false;if(dead||ov)return;canv.forEach(pc=>{if(pc.tex)pc.tex.needsUpdate=true;});R.markDirty&&R.markDirty();});};})();
  const get=uid=>{let pc=canv.get(uid);if(!pc){pc=new PC(redraw);canv.set(uid,pc);}return pc;};
  const mine=get(me);

  /* ---- 3D studio ---- */
  const G=new T.Group();st.g.add(G);st.cv=[];st.cvMesh=[];
  const mat=(c,r,m)=>new T.MeshStandardMaterial({color:c,roughness:r==null?.7:r,metalness:m||0});
  const bx=(w,hh,d,m,x,y,z)=>{const o=new T.Mesh(new T.BoxGeometry(w,hh,d),m);o.position.set(x,y,z);G.add(o);return o;};
  /* wall, wooden slats, lights */
  const backdrop=bx(5.2,3.1,.06,mat(0x2b2150,.9),0,1.5,SZ-1.35);
  function setBackdrop(c){backdrop.material.color.set(/^#[0-9a-f]{6}$/i.test(c||'')?c:0x2b2150);R.markDirty&&R.markDirty();}
  [-2.35,2.35].forEach(x=>{for(let i=0;i<5;i++)bx(.1,3.1,.1,mat(0xb98a55,.6),x+(i-2)*.16,1.5,SZ-1.28);});
  bx(4.6,.08,.08,mat(0x9a6bff,.3),0,.5,SZ-1.3).material.emissive=new T.Color(0x7b4dff);
  for(let i=0;i<3;i++){const l=new T.Mesh(new T.SphereGeometry(.07,12,10),new T.MeshBasicMaterial({color:0xffe2a8}));l.position.set((i-1)*1.2,2.95,SZ-.2);G.add(l);}
  const warm=new T.PointLight(0xffd9a8,.7,7);warm.position.set(0,2.6,SZ+.6);G.add(warm);
  /* plants */
  [-1.75,1.75].forEach(x=>{bx(.34,.34,.34,mat(0xf1eef9,.5),x,.17,SZ-1.1);const b=mat(0x2f9e5b,.8);for(let i=0;i<7;i++){const s=new T.Mesh(new T.SphereGeometry(.17+.05*(i%3),10,8),b);s.scale.set(.8,1.3,.8);s.position.set(x+Math.sin(i*1.7)*.2,.62+i*.05,SZ-1.1+Math.cos(i*1.7)*.15);G.add(s);}});
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
  signT=new T.CanvasTexture(sign);signT.encoding=T.sRGBEncoding;const sm=new T.Mesh(new T.PlaneGeometry(1.7,.665),new T.MeshBasicMaterial({map:signT,transparent:true}));sm.position.set(0,2.62,SZ-1.31);G.add(sm);
  /* reference screen */
  const wall=document.createElement('canvas');wall.width=1024;wall.height=576;const wg=wall.getContext('2d');const wallT=new T.CanvasTexture(wall);wallT.encoding=T.sRGBEncoding;wallT.anisotropy=4;
  bx(1.86,1.1,.05,mat(0x15112a,.4),0,1.78,SZ-1.31);const wm=new T.Mesh(new T.PlaneGeometry(1.76,.99),new T.MeshBasicMaterial({map:wallT}));wm.position.set(0,1.78,SZ-1.28);G.add(wm);
  const rr=(g,x,y,w,hh,r)=>{g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+hh,r);g.arcTo(x+w,y+hh,x,y+hh,r);g.arcTo(x,y+hh,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath();};
  let scr={pill:'#6a3df0',cnt:'#4a2fc4',bg:'#f3efff',tint:'#e4dcff',tick:'#7b4dff'};
  const mixC=(a,b,t)=>{const p=x=>[1,3,5].map(i=>parseInt(x.slice(i,i+2),16));const A=p(a),B=p(b);return '#'+A.map((v,i)=>Math.round(v+(B[i]-v)*t).toString(16).padStart(2,'0')).join('');};
  function setScreen(c){scr=/^#[0-9a-f]{6}$/i.test(c||'')?{pill:c,cnt:mixC(c,'#000000',.3),bg:mixC(c,'#ffffff',.92),tint:mixC(c,'#ffffff',.8),tick:c}:{pill:'#6a3df0',cnt:'#4a2fc4',bg:'#f3efff',tint:'#e4dcff',tick:'#7b4dff'};drawWall();}
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
    if(sp.state!=='painting'){g.fillStyle='rgba(30,20,70,.72)';rr(g,0,0,W,H,34);g.fill();g.fillStyle='#fff';g.textAlign='center';g.font='800 64px sans-serif';g.fillText(sp.state==='paused'?'Paused':'Waiting for the host',512,270);g.font='600 34px sans-serif';g.fillText(sp.state==='paused'?'The host will resume shortly':'Painting starts soon',512,330);g.textAlign='left';}
    wallT.needsUpdate=true;R.markDirty&&R.markDirty();
  }
  /* table: easels + canvases, palettes, paints, cups */
  const paper=mat(0xfffdf8,.9),wood=mat(0xb98a55,.55),dark=mat(0x2b2f3a,.7);
  const cvW=.272,cvH=.34,tilt=-.12;
  SX.forEach((x,i)=>{
    const gr=new T.Group();gr.position.set(x,DESKY,SZ+.8);G.add(gr);
    const board=new T.Mesh(new T.BoxGeometry(cvW+.03,cvH+.03,.022),mat(0xe9e1d3,.8));board.position.set(0,.04+cvH/2,0);board.rotation.x=tilt;gr.add(board);
    const face=new T.Mesh(new T.PlaneGeometry(cvW,cvH),new T.MeshBasicMaterial({color:0xfffdf8}));face.position.set(0,.04+cvH/2,0);face.rotation.x=tilt;face.translateZ(.0125);face.userData.idx=i;gr.add(face);
    const ledge=new T.Mesh(new T.BoxGeometry(cvW+.06,.025,.07),wood);ledge.position.set(0,.02,.015);gr.add(ledge);
    [-1,1].forEach(s=>{const leg=new T.Mesh(new T.BoxGeometry(.02,.3,.02),wood);leg.position.set(s*.12,.18,-.1);leg.rotation.x=.55;gr.add(leg);});
    gr.updateMatrixWorld(true);gr.userData.pt=face.localToWorld(new T.Vector3(0,0,-.05));st.cv[i]=gr;st.cvMesh[i]=face;gr.visible=false;
    const pal=new T.Mesh(new T.CylinderGeometry(.075,.075,.008,18),mat(0xf3e7d0,.7));pal.scale.set(1.15,1,.8);pal.position.set(x-.21,DESKY+.006,SZ+.66);G.add(pal);
    ['#e63946','#ffd23f','#2d6cdf','#2bb673','#ff8a1f'].forEach((c,k)=>{const d=new T.Mesh(new T.SphereGeometry(.014,8,6),mat(parseInt(c.slice(1),16),.5));d.scale.set(1,.5,1);d.position.set(x-.21+Math.cos(k*1.3)*.05,DESKY+.014,SZ+.66+Math.sin(k*1.3)*.03);G.add(d);});
    const br=new T.Mesh(new T.CylinderGeometry(.006,.006,.2,6),mat(0x6b4a2f,.6));br.rotation.z=1.45;br.rotation.y=.3;br.position.set(x+.2,DESKY+.008,SZ+.68);G.add(br);
  });
  const tray=bx(.7,.03,.12,dark,0,DESKY+.02,SZ+.96);[['#ffd23f'],['#e63946'],['#2d6cdf'],['#1a1a1f']].forEach(([c],k)=>{const b=new T.Mesh(new T.CylinderGeometry(.028,.032,.1,12),mat(parseInt(c.slice(1),16),.4));b.position.set(-.24+k*.16,DESKY+.085,SZ+.96);G.add(b);const cap=new T.Mesh(new T.CylinderGeometry(.015,.02,.03,10),mat(0xf5f5f5,.5));cap.position.set(-.24+k*.16,DESKY+.15,SZ+.96);G.add(cap);});
  [[-.95,.9],[.95,.9]].forEach(([x,z])=>{const c=new T.Mesh(new T.CylinderGeometry(.04,.03,.09,14),mat(0x6a3df0,.5));c.position.set(x,DESKY+.065,SZ+z);G.add(c);});
  /* hide the occupied-seat prop when a seat is empty */
  function seatSync(){
    nSeated=0;SX.forEach((x,i)=>{const uid=st.seats[i];const gr=st.cv[i];if(uid)nSeated++;gr.visible=!!uid;if(uid){const pc=get(uid);const f=st.cvMesh[i];if(f.material.map!==pc.texture()){f.material.map=pc.texture();f.material.color.set(0xffffff);f.material.needsUpdate=true;}}});
    drawWall();
  }
  /* DOM badges (status under each canvas) */
  const badges=SX.map(()=>{const b=h('div',{class:'pt-badge'});st.lbl.appendChild(b);return b;});
  const oldTick=R.walkTick;
  R.walkTick=dt=>{oldTick(dt);if(!R.cam)return;const w=R.host.clientWidth,hh=R.host.clientHeight,v=new T.Vector3();
    SX.forEach((x,i)=>{const uid=st.seats[i],b=badges[i];if(!uid){b.style.display='none';return;}const pc=canv.get(uid),s=pc?pc.state():0;
      const t=STATES[s];if(b.dataset.s!==String(s)){b.dataset.s=String(s);b.textContent=(s===2?'✓ ':'')+t;b.className='pt-badge s'+s;}
      v.set(x,DESKY-.16,SZ+1.07).project(R.cam);b.style.display=v.z>1?'none':'';b.style.transform='translate(-50%,-50%) translate('+((v.x*.5+.5)*w)+'px,'+((-v.y*.5+.5)*hh)+'px)';});};
  /* tap a canvas in the 3D view */
  const ray=new T.Raycaster(),m2=new T.Vector2();
  const onClick=e=>{if(e.target.closest&&e.target.closest('button,.pt-badge,.sp-lbl'))return;const r=R.host.getBoundingClientRect();m2.set(((e.clientX-r.left)/r.width)*2-1,-((e.clientY-r.top)/r.height)*2+1);ray.setFromCamera(m2,R.cam);
    const hit=ray.intersectObjects(st.cvMesh.filter((m,i)=>st.seats[i]),false)[0];if(!hit)return;const uid=st.seats[hit.object.userData.idx];if(uid===me)openPaint();else if(uid)viewCanvas(uid);};
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
    const allowed=()=>sp.state==='painting';
    function paintBan(){banner.textContent=sp.state==='painting'?'':(sp.state==='paused'?'Painting is paused by the host':'Waiting for the host to start the session');banner.style.display=sp.state==='painting'?'none':'';}
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
    cv.addEventListener('pointerdown',down);cv.addEventListener('pointermove',move);cv.addEventListener('pointerup',up);cv.addEventListener('pointercancel',up);cv.style.touchAction='none';
    /* leaving the page or switching apps mid-stroke can swallow the pointer-up; finish the stroke so the brush never gets stuck */
    cv.addEventListener('lostpointercapture',up);
    const stuckFix=()=>{ptrs.clear();gA=false;gLock=false;if(!ov||!ov.isConnected){document.removeEventListener('visibilitychange',stuckFix);window.removeEventListener('blur',stuckFix);window.removeEventListener('pageshow',stuckFix);return;}endStroke();};
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
    function close(){if(!ov)return;flush();document.removeEventListener('keydown',key);ro&&ro.disconnect();stack.remove();cv.remove();cv.removeAttribute('style');ov.remove();ov=null;R.setPaused&&R.setPaused(false);redraw();saveNow();sendSync();}
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
      const grid=h('div',{class:'pt-refs'},REFS.map(([id,n])=>{const c=refCanvas('ref:'+id);const t=h('canvas',{width:100,height:125});t.getContext('2d').drawImage(c,0,0,100,125);return h('button',{class:'pt-rb'+(sp.ref==='ref:'+id?' on':''),onclick:async()=>{await send_('ref','ref:'+id);toast('Reference changed');}},t,h('span',null,n));}));
      const note=h('textarea',{maxlength:'200',rows:'2',placeholder:'Instructions for everyone (optional)'});note.value=sp.note||'';
      const saveN=h('button',{class:'btn small'},'Show on the screen');saveN.onclick=()=>send_('note',note.value);
      const clr=h('button',{class:'btn small'},'Clear picture');clr.onclick=()=>send_('ref','');
      const ctl=h('div',{class:'pt-hc'},sp.state==='waiting'?h('button',{class:'btn coral',onclick:()=>send_('start')},'Start painting'):sp.state==='painting'?h('button',{class:'btn',onclick:()=>send_('pause')},'Pause'):h('button',{class:'btn coral',onclick:()=>send_('resume')},'Resume'));
      const neonRow=h('div',{class:'pt-neon'},NEONS.map(c=>h('button',{class:'pt-nsw'+(c.toLowerCase()===String(neonC).toLowerCase()?' on':''),style:{background:c},'aria-label':'Neon colour '+c,onclick:()=>{drawSign(c);send('neon',{c});Store.hostNeon&&Store.hostNeon(c);[...neonRow.children].forEach(x=>x.classList.toggle('on',x===neonRow.children[NEONS.indexOf(c)]));}})));
      body.append(h('p',{class:'f-hint'},'Session: '+(sp.state==='waiting'?'waiting to start':sp.state)),ctl,h('div',{class:'f-label',style:{margin:'14px 0 6px'}},'Reference picture'),grid,h('div',{class:'pt-hc',style:{marginTop:'8px'}},clr),h('div',{class:'f-label',style:{margin:'14px 0 6px'}},'Instructions'),note,h('div',{style:{marginTop:'6px'}},saveN),
        h('div',{class:'f-label',style:{margin:'14px 0 6px'}},'Neon sign colour'),neonRow,
        h('div',{class:'pt-hc',style:{marginTop:'14px'}},h('button',{class:'btn small',onclick:()=>{close();galleryModal();}},'Show all paintings')));
    };build();
    });
  }
  function galleryModal(){sheet('Gallery',async(body)=>{body.append(spinner());await saveNow();const gv=await galleryView(spaceId,sp.title);const t0=gv.querySelector('h3');t0&&t0.remove();body.replaceChildren(gv);});}

  /* ---- HUD buttons ---- */
  const hud=h('div',{class:'pt-hud'});
  function paintHud(){hud.replaceChildren(...[
    h('button',{class:'pt-hb coral',onclick:openPaint},st.map.has(me)?'Paint':'Watching'),
    h('button',{class:'pt-hb',onclick:showRef},'Reference'),
    h('button',{class:'pt-hb',onclick:galleryModal},'Gallery'),
    ctx.isHost()?h('button',{class:'pt-hb',onclick:studio},'Studio'):null,
    sp.state!=='painting'?h('span',{class:'pt-hs'},sp.state==='paused'?'Paused':ctx.isHost()?'Press Studio, pick a picture, then start':'Waiting for the host to start'):null].filter(Boolean));}
  paintHud();drawWall();

  return{hud,setScreen,setBackdrop,setSignText,
    update(D){if(dead)return;const s=Object.assign({},D.space);if(Date.now()<lockUntil){s.paint_ref=sp.ref;s.paint_state=sp.state;s.paint_note=sp.note;}const ch_=sp.ref!==s.paint_ref||sp.state!==s.paint_state||sp.note!==(s.paint_note||'');
      sp={ref:s.paint_ref||null,state:s.paint_state||'waiting',note:s.paint_note||'',title:s.title};seatSync();if(ch_){paintHud();ov&&ov._upd&&ov._upd();}},
    seatSync,
    async finalSave(){ctx.final=true;await saveNow();},
    destroy(){dead=true;clearTimeout(saveT);try{if(ov){mine.cv.remove();ov.remove();ov=null;}}catch(e){}try{R.host.removeEventListener('click',onClick);}catch(e){}try{ch&&sb.removeChannel(ch);}catch(e){}badges.forEach(b=>b.remove());hud.remove();}};
}
return{attach,galleryView,myArtworks,PC,REFS,guideCanvas,refCanvas,refPalette};
})();
