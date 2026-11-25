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
  d.regions.forEach(r=>add(r.c));add(d.bg);add(INK);if(d.face){add(lipOf(d));add(WHITE);}
  return out.map((c,i)=>['Colour '+(i+1),c]);}

/* ---------- drawing guide: only the clean outlines of this exact illustration, with arrows for the stroke direction ---------- */
function drawGuide(g,d,w,h){
  const s=w/d.w;g.clearRect(0,0,w,h);g.lineJoin='round';g.lineCap='round';
  const lines=[];
  d.regions.forEach(r=>r.paths.forEach(p=>{const pts=smooth(p,3);let len=0;for(let i=0;i<pts.length;i++){const a=pts[i],b=pts[(i+1)%pts.length];len+=Math.hypot(b[0]-a[0],b[1]-a[1])*s;}if(len>70)lines.push({pts,len});}));
  g.strokeStyle='rgba(92,62,220,.85)';g.lineWidth=3;
  lines.forEach(l=>{g.beginPath();tracePath(g,l.pts,s);g.stroke();});
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
      const dx=(b[0]-a[0])*s,dy=(b[1]-a[1])*s,m=Math.hypot(dx,dy);if(m<1)continue;const ux=dx/m,uy=dy/m,px=a[0]*s,py=a[1]*s,L=14;
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
function runWorker(img){return new Promise((res,rej)=>{const id=++seq,wk=getWorker();const t=setTimeout(()=>{waits.delete(id);try{wk.terminate();}catch(e){}worker=null;rej(new Error('slow'));},90000);waits.set(id,{res,rej,t});wk.postMessage({id,w:img.width,h:img.height,data:img.data});});}

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
  const paint=d=>{draw(g,d,W,H);};
  if(mem.has(id)){paint(mem.get(id));cvs.set(id,c);}
  else{cvs.set(id,c);load(id).then(d=>{if(d){paint(d);guides.delete(id);onLoad&&onLoad();}});}
  return c;
}
function guide(id,onLoad){
  if(guides.has(id))return guides.get(id);
  const c=document.createElement('canvas');c.width=512;c.height=640;
  if(mem.has(id)){drawGuide(c.getContext('2d'),mem.get(id),512,640);guides.set(id,c);}
  else load(id).then(d=>{if(d){drawGuide(c.getContext('2d'),d,512,640);guides.set(id,c);onLoad&&onLoad();}});
  return c;
}
function colours(id){const d=mem.get(id);return d?palette(d):null;}

return{make,friendly,save,load,remove,isMine,canvas,guide,colours,draw,palette,drawGuide,PREFIX};
})();
