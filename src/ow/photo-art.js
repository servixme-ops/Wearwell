/* OpenWalls "my photo" illustrations (Gist & Paint).
   make(file) -> a finished illustration made from the person's own photo, on their device only.
   The photo is resized here, cut into flat colours by the OpenCV.js worker (photo-worker.js) and drawn as bold outlined shapes.
   Nothing is uploaded: the result is kept in this browser (IndexedDB) and is never saved to the server.
   The same drawing data gives the reference picture, the clean outline guide and the exact colour swatches. */
const OWPhoto=(()=>{
const W=400,H=500,INK='#1b1424',WHITE='#ffffff',PREFIX='me:';
const MAX_BYTES=20*1024*1024,TYPES=/^image\/(jpeg|png|webp)$/i;
let worker=null,seq=0;const waits=new Map();
const mem=new Map(),cvs=new Map(),guides=new Map();

/* ---------- smooth outlines (Chaikin corner cutting) ---------- */
function smooth(p,it){let a=[];for(let i=0;i<p.length;i+=2)a.push([p[i],p[i+1]]);
  /* add points along long straight stretches first, so rounding only softens real corners and straight edges stay straight */
  {const b=[];for(let i=0;i<a.length;i++){const u=a[i],v=a[(i+1)%a.length],n=Math.max(1,Math.ceil(Math.hypot(v[0]-u[0],v[1]-u[1])/5));for(let k=0;k<n;k++)b.push([u[0]+(v[0]-u[0])*k/n,u[1]+(v[1]-u[1])*k/n]);}a=b;}
  for(let k=0;k<it;k++){const b=[];for(let i=0;i<a.length;i++){const u=a[i],v=a[(i+1)%a.length];b.push([u[0]*.75+v[0]*.25,u[1]*.75+v[1]*.25],[u[0]*.25+v[0]*.75,u[1]*.25+v[1]*.75]);}a=b;}
  return a;}
function tracePath(g,pts,s){g.moveTo(pts[0][0]*s,pts[0][1]*s);for(let i=1;i<pts.length;i++)g.lineTo(pts[i][0]*s,pts[i][1]*s);g.closePath();}
const shade=(hexc,f)=>{const n=parseInt(hexc.slice(1),16),c=v=>Math.max(0,Math.min(255,Math.round(v*f)));return '#'+[(n>>16)&255,(n>>8)&255,n&255].map(v=>c(v).toString(16).padStart(2,'0')).join('');};
const lipOf=d=>{const f=d.face;if(!f)return '#b84a5a';if(f.lip){return f.lip;}return shade(f.skin,.72);};

/* ---------- drawing: reference picture ---------- */
function draw(g,d,w,h){
  const s=w/d.w;g.save();g.fillStyle=d.bg;g.fillRect(0,0,w,h);
  g.lineJoin='round';g.lineCap='round';
  const polys=d.regions.map(r=>r.paths.map(p=>smooth(p,2)));
  /* flat colour fills (a same-colour hairline under the outline closes any gap between neighbours) */
  d.regions.forEach((r,i)=>{g.beginPath();polys[i].forEach(pp=>tracePath(g,pp,s));g.fillStyle=r.c;g.fill('evenodd');g.strokeStyle=r.c;g.lineWidth=2;g.stroke();});
  /* bold clean dark outlines */
  g.strokeStyle=INK;g.lineWidth=Math.max(3,w/110);
  d.regions.forEach((r,i)=>{g.beginPath();polys[i].forEach(pp=>tracePath(g,pp,s));g.stroke();});
  const f=d.face;if(f)features(g,d,f,s);
  g.restore();
}
function features(g,d,f,s){
  const cx=f.cx*s,fw=f.fw*s,fh=f.fh*s,ey=f.eyeY*s,lw=Math.max(3,fw*.035);
  g.strokeStyle=INK;g.fillStyle=INK;g.lineWidth=lw;
  /* brows */
  f.eyes.forEach((x0,i)=>{const x=x0*s,sg=i?1:-1;g.beginPath();g.lineWidth=lw*1.25;g.moveTo(x-fw*.095,ey-fw*.115+(sg*-0.0));g.quadraticCurveTo(x,ey-fw*.16,x+fw*.095,ey-fw*.115);g.stroke();});
  /* eyes: dark almond with a small white sparkle */
  f.eyes.forEach(x0=>{const x=x0*s;g.beginPath();g.ellipse(x,ey,fw*.062,fw*.05,0,0,7);g.fillStyle=INK;g.fill();g.beginPath();g.arc(x+fw*.02,ey-fw*.017,fw*.013,0,7);g.fillStyle=WHITE;g.fill();});
  /* nose: a small L like the collection's faces */
  g.beginPath();g.lineWidth=lw*.9;g.moveTo(cx+fw*.012,ey+fh*.07);g.lineTo(cx-fw*.028,ey+fh*.2);g.lineTo(cx+fw*.035,ey+fh*.205);g.stroke();
  /* mouth */
  const m=f.mouth,x0=m.x0*s,x1=m.x1*s,my=m.y*s,mw=x1-x0,lip=lipOf(d);
  if(m.open){
    g.beginPath();g.moveTo(x0,my-mw*.06);g.quadraticCurveTo((x0+x1)/2,my-mw*.16,x1,my-mw*.06);g.quadraticCurveTo((x0+x1)/2,my+mw*.5,x0,my-mw*.06);g.closePath();g.fillStyle=INK;g.fill();
    g.save();g.clip();g.beginPath();g.rect(x0,my-mw*.12,mw,mw*.2);g.fillStyle=WHITE;g.fill();g.restore();
    g.beginPath();g.moveTo(x0,my-mw*.06);g.quadraticCurveTo((x0+x1)/2,my-mw*.16,x1,my-mw*.06);g.quadraticCurveTo((x0+x1)/2,my+mw*.5,x0,my-mw*.06);g.closePath();g.lineWidth=lw;g.stroke();
  }else{
    g.beginPath();g.ellipse((x0+x1)/2,my+mw*.07,mw*.34,mw*.11,0,0,7);g.fillStyle=lip;g.fill();g.lineWidth=lw*.8;g.stroke();
    g.beginPath();g.moveTo(x0,my);g.quadraticCurveTo((x0+x1)/2,my+mw*.1,x1,my);g.lineWidth=lw;g.stroke();
  }
}

/* ---------- the colours really used (the painting swatches) ---------- */
function palette(d){const seen=new Set(),out=[];const add=c=>{c=c.toLowerCase();if(!seen.has(c)){seen.add(c);out.push(c);}};
  d.regions.forEach(r=>add(r.c));if(!d.ai){add(d.bg);add(INK);if(d.face){add(lipOf(d));add(WHITE);}}
  return out.map((c,i)=>['Colour '+(i+1),c]);}

/* ---------- drawing guide: only the clean outlines of this exact illustration, with arrows for the stroke direction ---------- */
function drawGuide(g,d,w,h){
  const s=w/d.w;g.clearRect(0,0,w,h);g.lineJoin='round';g.lineCap='round';
  const lines=[];
  /* a thin dark stroke (the illustration's own ink line) would give two parallel lines: keep one, the neighbouring colour's edge */
  const perim=r=>r.paths.reduce((t,p)=>{let l=0;for(let i=0;i<p.length;i+=2){const j=(i+2)%p.length;l+=Math.hypot(p[j]-p[i],p[j+1]-p[i+1]);}return t+l;},0);
  const lum=c=>{const n=parseInt(c.slice(1),16);return(.3*(n>>16&255)+.59*(n>>8&255)+.11*(n&255))/255;};
  d.regions.forEach(r=>{if(lum(r.c)<.2&&r.a/Math.max(1,perim(r))<3.2)return;r.paths.forEach(p=>{const pts=smooth(p,3);let len=0;for(let i=0;i<pts.length;i++){const a=pts[i],b=pts[(i+1)%pts.length];len+=Math.hypot(b[0]-a[0],b[1]-a[1])*s;}if(len>70)lines.push({pts,len});});});
  g.strokeStyle='rgba(92,62,220,.85)';g.lineWidth=3;
  /* skip the stretches that only run along the picture's own edge, so the guide has no frame */
  const edge=(p)=>p[0]<2.5||p[1]<2.5||p[0]>d.w-3.5||p[1]>d.h-3.5;
  lines.forEach(l=>{const pts=l.pts;let pen=false;g.beginPath();for(let i=0;i<=pts.length;i++){const a=pts[i%pts.length],b=pts[(i+1)%pts.length];if(i===pts.length&&!pen)break;if(edge(a)&&edge(b)){pen=false;continue;}if(!pen){g.moveTo(a[0]*s,a[1]*s);pen=true;}g.lineTo(b[0]*s,b[1]*s);}g.stroke();});
  if(d.face){const f=d.face;g.save();g.globalAlpha=.78;g.lineWidth=2.6;g.strokeStyle='#5c3edc';g.fillStyle='transparent';
    const cx=f.cx*s,fw=f.fw*s,fh=f.fh*s,ey=f.eyeY*s,m=f.mouth,x0=m.x0*s,x1=m.x1*s,my=m.y*s,mw=x1-x0;
    f.eyes.forEach(x0e=>{const x=x0e*s;g.beginPath();g.ellipse(x,ey,fw*.062,fw*.05,0,0,7);g.stroke();g.beginPath();g.moveTo(x-fw*.095,ey-fw*.115);g.quadraticCurveTo(x,ey-fw*.16,x+fw*.095,ey-fw*.115);g.stroke();});
    g.beginPath();g.moveTo(cx+fw*.012,ey+fh*.07);g.lineTo(cx-fw*.028,ey+fh*.2);g.lineTo(cx+fw*.035,ey+fh*.205);g.stroke();
    g.beginPath();g.moveTo(x0,my);g.quadraticCurveTo((x0+x1)/2,my+mw*.1+(m.open?mw*.2:0),x1,my);g.stroke();g.restore();}
  /* arrows: on the longest outlines, pointing the way to draw (clockwise), spaced out */
  g.fillStyle='#ff5a36';g.strokeStyle='#ff5a36';g.lineWidth=3.2;let n=0;
  lines.sort((a,b)=>b.len-a.len);
  for(const l of lines){if(n>=16)break;const pts=l.pts,step=Math.max(1,Math.floor(pts.length*Math.max(170,l.len/2)/l.len));
    let area=0;for(let i=0;i<pts.length;i++){const a=pts[i],b=pts[(i+1)%pts.length];area+=a[0]*b[1]-b[0]*a[1];}
    const dir=area>=0?1:-1;
    for(let i=Math.floor(step/2);i<pts.length&&n<16;i+=step){const a=pts[i],b=pts[(i+(dir>0?3:pts.length-3))%pts.length];
      if(edge(a))continue;const dx=(b[0]-a[0])*s,dy=(b[1]-a[1])*s,m=Math.hypot(dx,dy);if(m<1)continue;const ux=dx/m,uy=dy/m,px=a[0]*s,py=a[1]*s,L=14;
      g.beginPath();g.moveTo(px-ux*L,py-uy*L);g.lineTo(px+ux*L*.4,py+uy*L*.4);g.stroke();
      const hx=px+ux*L,hy=py+uy*L;g.beginPath();g.moveTo(hx,hy);g.lineTo(hx-ux*10+uy*6,hy-uy*10-ux*6);g.lineTo(hx-ux*10-uy*6,hy-uy*10+ux*6);g.closePath();g.fill();n++;}}
}

/* ---------- the engine (Web Worker) ---------- */
function getWorker(){
  if(worker)return worker;
  worker=new Worker('src/ow/photo-worker.js');
  worker.onmessage=e=>{const m=e.data,w=waits.get(m.id);if(!w)return;waits.delete(m.id);clearTimeout(w.t);m.err?w.rej(new Error(m.err)):w.res(m.res);};
  worker.onerror=()=>{waits.forEach(w=>{clearTimeout(w.t);w.rej(new Error('engine'));});waits.clear();try{worker.terminate();}catch(e){}worker=null;};
  return worker;
}
function runWorker(img){return new Promise((res,rej)=>{const id=++seq,wk=getWorker();const t=setTimeout(()=>{waits.delete(id);try{wk.terminate();}catch(e){}worker=null;rej(new Error('slow'));},90000);waits.set(id,{res,rej,t});wk.postMessage({id,w:img.width,h:img.height,data:img.data,flat:!!img.flat});});}

/* decode, shrink (phones give 12 MP photos) and crop to the picture shape, keeping the head area */
async function prepare(file){
  if(!file)throw new Error('none');
  if(!TYPES.test(file.type||'')&&!/\.(jpe?g|png|webp)$/i.test(file.name||''))throw new Error('type');
  if(file.size>MAX_BYTES)throw new Error('big');
  let bmp=null;
  try{bmp=await createImageBitmap(file);}catch(e){
    bmp=await new Promise((res,rej)=>{const im=new Image(),u=URL.createObjectURL(file);im.onload=()=>{URL.revokeObjectURL(u);res(im);};im.onerror=()=>{URL.revokeObjectURL(u);rej(new Error('decode'));};im.src=u;});}
  const sw=bmp.width,sh=bmp.height;if(!sw||!sh)throw new Error('decode');
  const TW=300,TH=375,sc=Math.max(TW/sw,TH/sh),dw=sw*sc,dh=sh*sc,dx=(TW-dw)/2,dy=-(dh-TH)*(dh>TH*1.25?.3:.5);
  const c=document.createElement('canvas');c.width=TW;c.height=TH;const g=c.getContext('2d',{willReadFrequently:true});g.imageSmoothingQuality='high';g.fillStyle='#ffffff';g.fillRect(0,0,TW,TH);g.drawImage(bmp,dx,dy,dw,dh);
  try{bmp.close&&bmp.close();}catch(e){}
  return g.getImageData(0,0,TW,TH);
}
/* AI route (only when the person agrees): the photo goes to our Cloudflare Worker, which asks Workers AI (FLUX.2 klein) to redraw it in the
   OpenWalls style and sends the picture back. It is not saved anywhere. We then turn that picture into the same flat outlined shapes as the
   on-device route, so the reference, guide and swatches all match it exactly. */
async function prepareJpeg(file){
  if(!file)throw new Error('none');
  if(!TYPES.test(file.type||'')&&!/\.(jpe?g|png|webp)$/i.test(file.name||''))throw new Error('type');
  if(file.size>MAX_BYTES)throw new Error('big');
  let bmp;try{bmp=await createImageBitmap(file);}catch(e){bmp=await new Promise((res,rej)=>{const im=new Image(),u=URL.createObjectURL(file);im.onload=()=>{URL.revokeObjectURL(u);res(im);};im.onerror=()=>{URL.revokeObjectURL(u);rej(new Error('decode'));};im.src=u;});}
  const sw=bmp.width,sh=bmp.height;if(!sw||!sh)throw new Error('decode');
  const TW=384,TH=480,sc=Math.max(TW/sw,TH/sh),dw=sw*sc,dh=sh*sc,dx=(TW-dw)/2,dy=-(dh-TH)*(dh>TH*1.25?.3:.5);
  const c=document.createElement('canvas');c.width=TW;c.height=TH;const g=c.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,TW,TH);g.drawImage(bmp,dx,dy,dw,dh);try{bmp.close&&bmp.close();}catch(e){}
  return new Promise((res,rej)=>c.toBlob(b=>b?res(b):rej(new Error('decode')),'image/jpeg',.9));
}
async function makeAI(file,token){
  const blob=await prepareJpeg(file);
  const ctl=new AbortController(),t=setTimeout(()=>ctl.abort(),70000);let r;
  try{r=await fetch('/api/illustrate',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'image/jpeg'},body:blob,signal:ctl.signal});}
  catch(e){throw new Error('net');}finally{clearTimeout(t);}
  let j=null;try{j=await r.json();}catch(e){}
  if(!j||!j.ok||!j.image)throw new Error('ai:'+((j&&j.why)||'fail'));
  const bin=atob(j.image),u8=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u8[i]=bin.charCodeAt(i);
  const bmp=await createImageBitmap(new Blob([u8],{type:j.image.indexOf('iVBOR')===0?'image/png':'image/jpeg'}));
  const c=document.createElement('canvas');c.width=300;c.height=375;const g=c.getContext('2d',{willReadFrequently:true});g.imageSmoothingQuality='high';g.drawImage(bmp,0,0,300,375);try{bmp.close&&bmp.close();}catch(e){}
  const id=g.getImageData(0,0,300,375);id.flat=true;
  const d=await runWorker(id);if(!d||!d.ok||!d.regions||!d.regions.length)throw new Error('empty');
  d.ai=true;if(j.lines){const b2=atob(j.lines),v8=new Uint8Array(b2.length);for(let i=0;i<b2.length;i++)v8[i]=b2.charCodeAt(i);d.lines=new Blob([v8],{type:j.lines.indexOf('iVBOR')===0?'image/png':'image/jpeg'});}d.photo=new Blob([u8],{type:j.image.indexOf('iVBOR')===0?'image/png':'image/jpeg'});return d;   /* the AI picture itself is the reference; the flat shapes are only used for the guide and the swatches */
}
async function make(file){
  const img=await prepare(file);
  const d=await runWorker(img);
  if(!d||!d.ok||!d.regions||!d.regions.length)throw new Error('empty');
  return d;
}
function friendly(e){const m=String(e&&e.message||e);
  if(m==='type')return 'Please choose a JPG, PNG or WebP photo.';
  if(m==='big')return 'That photo is too large. Choose one under 20 MB.';
  if(m==='decode')return 'This phone could not open that photo. Try another one.';
  if(m==='slow')return 'That took too long. Try a smaller photo.';
  if(m==='ai:limit')return 'You have used your 3 AI illustrations for today. Try again tomorrow, or make one on this phone.';
  if(m==='ai:busy')return 'The AI is busy today. Try again tomorrow, or make one on this phone.';
  if(m==='ai:login')return 'Please sign in again to use the AI illustration.';
  if(m==='ai:off'||m.indexOf('ai:')===0||m==='net')return 'The AI illustration is not available right now.';
  if(m==='engine')return 'The illustration tool could not start. Check your connection and try again.';
  return 'We could not make an illustration from that photo. Try a clearer photo with the face in view.';}

/* ---------- private storage on this device ---------- */
function idb(){return new Promise((res,rej)=>{try{const r=indexedDB.open('ow-photo-art',1);r.onupgradeneeded=()=>r.result.createObjectStore('refs');r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);}catch(e){rej(e);}});}
async function save(key,d){mem.set(key,d);cvs.delete(key);guides.delete(key);try{const db=await idb();await new Promise((res,rej)=>{const t=db.transaction('refs','readwrite');t.objectStore('refs').put(d,key);t.oncomplete=res;t.onerror=()=>rej(t.error);});db.close();}catch(e){}}
async function load(key){if(mem.has(key))return mem.get(key);try{const db=await idb();const d=await new Promise((res,rej)=>{const q=db.transaction('refs').objectStore('refs').get(key);q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error);});db.close();if(d&&d.regions){mem.set(key,d);return d;}}catch(e){}return null;}
async function remove(key){mem.delete(key);cvs.delete(key);guides.delete(key);try{const db=await idb();await new Promise(res=>{const t=db.transaction('refs','readwrite');t.objectStore('refs').delete(key);t.oncomplete=res;t.onerror=res;});db.close();}catch(e){}}

/* ---------- what Gist & Paint asks for (keyed by a "me:" picture id) ---------- */
const isMine=id=>typeof id==='string'&&id.indexOf(PREFIX)===0;
function canvas(id,onLoad){
  const hit=cvs.get(id);if(hit){let blank=false;try{blank=hit.getContext('2d').getImageData(0,0,1,1).data[3]===0;}catch(e){}if(!blank)return hit;cvs.delete(id);}
  const c=document.createElement('canvas');c.width=W;c.height=H;const g=c.getContext('2d');g.fillStyle='#eee';g.fillRect(0,0,W,H);
  const paint=d=>{if(d.ai&&d.photo){createImageBitmap(d.photo).then(b=>{g.drawImage(b,0,0,W,H);try{b.close&&b.close();}catch(e){}guides.delete(id);onLoad&&onLoad();}).catch(()=>{});}else draw(g,d,W,H);};
  if(mem.has(id)){paint(mem.get(id));cvs.set(id,c);}
  else{cvs.set(id,c);load(id).then(d=>{if(d){paint(d);guides.delete(id);onLoad&&onLoad();}});}
  return c;
}
/* guide from the AI's own line drawing: its dark lines become clean purple lines, with arrows along them showing which way to draw */
async function guideFromLines(c,blob,art){
  const bmp=await createImageBitmap(blob);const w=512,h=640;
  const t=document.createElement('canvas');t.width=w;t.height=h;const tg=t.getContext('2d',{willReadFrequently:true});tg.fillStyle='#fff';tg.fillRect(0,0,w,h);tg.drawImage(bmp,0,0,w,h);try{bmp.close&&bmp.close();}catch(e){}
  const im=tg.getImageData(0,0,w,h),dd=im.data,dark=new Float32Array(w*h);
  const lumA=new Float32Array(w*h);for(let i=0;i<w*h;i++)lumA[i]=dd[i*4]*.3+dd[i*4+1]*.59+dd[i*4+2]*.11;
  if(art){
    /* the illustration itself: thin dark strokes (outlines, eyes, brows, nose, mouth, folds) stand out against their surroundings;
       big dark areas like a dark jumper do not. That is a "black top-hat": closing minus the picture. */
    const R=5,mm=(src,max)=>{const t=new Float32Array(w*h),o=new Float32Array(w*h);
      for(let y=0;y<h;y++)for(let x=0;x<w;x++){let v=src[y*w+x];for(let k=Math.max(0,x-R);k<=Math.min(w-1,x+R);k++){const u=src[y*w+k];if(max?u>v:u<v)v=u;}t[y*w+x]=v;}
      for(let y=0;y<h;y++)for(let x=0;x<w;x++){let v=t[y*w+x];for(let k=Math.max(0,y-R);k<=Math.min(h-1,y+R);k++){const u=t[k*w+x];if(max?u>v:u<v)v=u;}o[y*w+x]=v;}
      return o;};
    const closed=mm(mm(lumA,true),false);
    for(let i=0;i<w*h;i++){const bh=closed[i]-lumA[i];const a=Math.max(0,Math.min(1,(bh-28)/55));dark[i]=a;}
    /* big colour changes with no ink line on them (dark jumper against a light wall) are also outlines: strong edges, thinned and kept one pixel wide */
    const ed=new Float32Array(w*h);
    for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){const i=y*w+x,gx=lumA[i+1]-lumA[i-1],gy=lumA[i+w]-lumA[i-w],m=Math.hypot(gx,gy);
      if(m>70&&dark[i]<.2&&dark[i-1]<.2&&dark[i+1]<.2&&dark[i-w]<.2&&dark[i+w]<.2)ed[i]=Math.min(1,(m-70)/90);}
    for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){const i=y*w+x;let v=ed[i];for(const k of [-1,1,-w,w])if(ed[i+k]>v)v=ed[i+k];if(v*.9>dark[i])dark[i]=v*.9;}
  }else for(let i=0;i<w*h;i++)dark[i]=Math.max(0,Math.min(1,(200-lumA[i])/110));
  let tot=0;for(let i=0;i<w*h;i++){tot+=dark[i];dd[i*4]=92;dd[i*4+1]=62;dd[i*4+2]=220;dd[i*4+3]=Math.round(dark[i]*235);}
  if(art&&tot<w*h*.004)throw new Error('nolines');
  const g=c.getContext('2d');g.clearRect(0,0,w,h);g.putImageData(im,0,0);
  /* arrows: in each cell pick the darkest line spot, point along the line */
  const cell=44,cands=[];
  for(let cy=0;cy<h-cell+1;cy+=cell)for(let cx=0;cx<w-cell+1;cx+=cell){let sum=0,bx=0,by=0,bv=0;
    for(let y=cy;y<cy+cell;y++)for(let x=cx;x<cx+cell;x++){const v=dark[y*w+x];sum+=v;if(v>bv){bv=v;bx=x;by=y;}}
    if(sum<cell*.9||bv<.6)continue;
    /* direction of the line = the way it extends (principal axis of dark pixels near the spot) */
    let sxx=0,sxy=0,syy=0,mx=0,my=0,n=0;for(let y=Math.max(0,by-14);y<Math.min(h,by+15);y++)for(let x=Math.max(0,bx-14);x<Math.min(w,bx+15);x++){const v=dark[y*w+x];if(v>.5){mx+=x;my+=y;n++;}}
    if(n<8)continue;mx/=n;my/=n;for(let y=Math.max(0,by-14);y<Math.min(h,by+15);y++)for(let x=Math.max(0,bx-14);x<Math.min(w,bx+15);x++){const v=dark[y*w+x];if(v>.5){sxx+=(x-mx)**2;sxy+=(x-mx)*(y-my);syy+=(y-my)**2;}}
    const ang=.5*Math.atan2(2*sxy,sxx-syy);let ux=Math.cos(ang),uy=Math.sin(ang);if(ux<-.2||(Math.abs(ux)<=.2&&uy<0)){ux=-ux;uy=-uy;}
    cands.push({x:bx,y:by,ux,uy,sum});}
  cands.sort((a,b)=>b.sum-a.sum);
  const picked=[];for(const k of cands){if(picked.length>=18)break;if(picked.every(p=>Math.hypot(p.x-k.x,p.y-k.y)>70))picked.push(k);}
  g.strokeStyle='#ff5a36';g.fillStyle='#ff5a36';g.lineWidth=3.4;g.lineCap='round';
  for(const k of picked){const L=15,ax=k.x-k.ux*L,ay=k.y-k.uy*L,bx=k.x+k.ux*L,by=k.y+k.uy*L;g.beginPath();g.moveTo(ax,ay);g.lineTo(bx,by);g.stroke();
    g.beginPath();g.moveTo(bx+k.ux*6,by+k.uy*6);g.lineTo(bx-k.ux*7+k.uy*8,by-k.uy*7-k.ux*8);g.lineTo(bx-k.ux*7-k.uy*8,by-k.uy*7+k.ux*8);g.closePath();g.fill();}
}
function guide(id,onLoad){
  if(guides.has(id))return guides.get(id);
  const c=document.createElement('canvas');c.width=512;c.height=640;
  const ready=d=>{if(d.ai&&(d.lines||d.photo)){guideFromLines(c,d.lines||d.photo,!d.lines).then(()=>{guides.set(id,c);onLoad&&onLoad();}).catch(()=>{drawGuide(c.getContext('2d'),d,512,640);guides.set(id,c);onLoad&&onLoad();});return true;}return false;};
  if(mem.has(id)&&ready(mem.get(id)))return c;
  if(!mem.has(id)){load(id).then(d=>{if(d&&!ready(d)){drawGuide(c.getContext('2d'),d,512,640);guides.set(id,c);onLoad&&onLoad();}});return c;}
  if(mem.has(id)){drawGuide(c.getContext('2d'),mem.get(id),512,640);guides.set(id,c);}
  else load(id).then(d=>{if(d){drawGuide(c.getContext('2d'),d,512,640);guides.set(id,c);onLoad&&onLoad();}});
  return c;
}
function colours(id){const d=mem.get(id);return d?palette(d):null;}

return{make,makeAI,friendly,save,load,remove,isMine,canvas,guide,colours,draw,palette,drawGuide,PREFIX};
})();
