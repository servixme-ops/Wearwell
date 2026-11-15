/* ---------- Sip & Paint: a painting studio inside a Space ----------
   - every seated person has their own canvas (a 2D canvas used as the live texture of the 3D canvas)
   - strokes are batched over a realtime broadcast channel (pt:<space>) and saved to the database (paint_canvases)
   - the host chooses the reference picture, starts / pauses the session; everyone paints their own version */
const OWPaint=(()=>{
const T=THREE,PAPER='#fffdf8',CW=512,CH=640,MAXPTS=60000;
const COLS=[['Red','#e63946'],['Blue','#2d6cdf'],['Yellow','#ffd23f'],['Green','#2bb673'],['Purple','#7b4dff'],['Orange','#ff8a1f'],['Black','#1a1a1f'],['White','#ffffff'],['Brown','#8b5a3c'],['Pink','#ff6fae']];
const STATES=['Painting','Almost done','Completed'];
const REFS=[['sunset','Palm sunset'],['flowers','Flower vase'],['mountains','Mountain lake'],['city','City at night'],['abstract','Colour circles'],['cat','Sleepy cat']];

/* ---------------- reference pictures (drawn in code, 400 x 500) ---------------- */
const lin=(g,x0,y0,x1,y1,stops)=>{const l=g.createLinearGradient(x0,y0,x1,y1);stops.forEach(([o,c])=>l.addColorStop(o,c));return l;};
const REFDRAW={
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
  start(t,c,z,x,y,id){if(this.pts>MAXPTS)return null;const op={k:'s',t,c,z,p:[Math.round(x),Math.round(y)],id:id||null};this.ops.push(op);this.redo=[];this.seg(op,0);this.pts+=2;this.onChange();return op;}
  extend(op,x,y){x=Math.round(x);y=Math.round(y);const p=op.p,lx=p[p.length-2],ly=p[p.length-1];if(Math.abs(x-lx)<2&&Math.abs(y-ly)<2)return false;if(this.pts>MAXPTS)return false;p.push(x,y);this.pts+=2;this.seg(op,p.length-2);this.onChange();return true;}
  undo(){let i=this.ops.length-1;while(i>=0&&this.ops[i].k==='m')i--;if(i<0)return false;this.redo.push(...this.ops.splice(i,1));this.render();return true;}
  redoOp(){const o=this.redo.pop();if(!o)return false;this.ops.push(o);this.render();return true;}
  clear(){this.ops.push({k:'clr'});this.redo=[];this.render();}
  state(){for(let i=this.ops.length-1;i>=0;i--)if(this.ops[i].k==='m')return this.ops[i].s|0;return 0;}
  setState(s){this.ops=this.ops.filter(o=>o.k!=='m');if(s>0)this.ops.push({k:'m',s});}
  load(ops){this.ops=Array.isArray(ops)?ops.filter(o=>o&&(o.k==='s'||o.k==='clr'||o.k==='m')):[];this.redo=[];this.render();}
  empty(){return !this.ops.some(o=>o.k==='s');}
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
    if(save)save.onclick=()=>guard(save,async()=>{const blob=await (await fetch(url)).blob();const path=await uploadFile('room-images',blob,'jpg','image/jpeg');const x=await sb.rpc('paint_artwork_save',{p_path:path,p_title:'Painting by @'+r.username,p_space_title:title||''});if(x.error)throw x.error;save.textContent='Saved';save.disabled=true;toast('Saved to your gallery');});
    grid.append(h('div',{class:'pt-gc'},h('img',{src:url,alt:'Painting by @'+r.username}),h('div',{class:'pt-gw'},avatarEl({avatar_url:r.avatar_url,display_name:r.display_name,username:r.username},'sm'),h('div',null,h('b',null,'@'+r.username),h('span',null,(r.done?'Completed':'In progress')+' · '+(title||'Sip & Paint')))),save));});
  return box;
}
async function myArtworks(){
  sheet('My artworks',async(body)=>{body.append(spinner());
    const r=await sb.from('paint_artworks').select('id,image_path,title,space_title,created_at').eq('user_id',Auth.user.id).order('created_at',{ascending:false}).limit(60);
    if(r.error||!r.data.length){body.replaceChildren(empty('No artworks yet','Finish a painting in a Sip & Paint space and save it here.'));return;}
    body.replaceChildren(h('div',{class:'pt-gg'},r.data.map(a=>h('div',{class:'pt-gc'},h('img',{src:publicUrl('room-images',a.image_path),alt:a.title||'Artwork',loading:'lazy'}),h('div',{class:'pt-gw'},h('div',null,h('b',null,a.space_title||'Sip & Paint'),h('span',null,new Date(a.created_at).toLocaleDateString())))))));
  });
}

/* ---------------- attach the studio to a running Space stage ---------------- */
function attach(R,ctx){
  const st=R.stage,S=R.STAGE,SX=S.SX,SZ=S.SZ,DESKY=S.DESKY,me=Auth.user.id,spaceId=ctx.id;
  const canv=new Map();let dead=false,ch=null,chOk=false,saveT=null,flushT=null,pending=null,cur=null,sp={ref:null,state:'waiting',note:'',title:''},nSeated=0,lastPaintPing=0,ov=null,lockUntil=0;
  const redraw=(()=>{let q=false;return()=>{if(q||dead)return;q=true;requestAnimationFrame(()=>{q=false;if(dead)return;canv.forEach(pc=>{if(pc.tex)pc.tex.needsUpdate=true;});R.markDirty&&R.markDirty();});};})();
  const get=uid=>{let pc=canv.get(uid);if(!pc){pc=new PC(redraw);canv.set(uid,pc);}return pc;};
  const mine=get(me);

  /* ---- 3D studio ---- */
  const G=new T.Group();st.g.add(G);st.cv=[];st.cvMesh=[];
  const mat=(c,r,m)=>new T.MeshStandardMaterial({color:c,roughness:r==null?.7:r,metalness:m||0});
  const bx=(w,hh,d,m,x,y,z)=>{const o=new T.Mesh(new T.BoxGeometry(w,hh,d),m);o.position.set(x,y,z);G.add(o);return o;};
  /* wall, wooden slats, lights */
  bx(5.2,3.1,.06,mat(0x2b2150,.9),0,1.5,SZ-1.35);
  [-2.35,2.35].forEach(x=>{for(let i=0;i<5;i++)bx(.1,3.1,.1,mat(0xb98a55,.6),x+(i-2)*.16,1.5,SZ-1.28);});
  bx(4.6,.08,.08,mat(0x9a6bff,.3),0,.5,SZ-1.3).material.emissive=new T.Color(0x7b4dff);
  for(let i=0;i<3;i++){const l=new T.Mesh(new T.SphereGeometry(.07,12,10),new T.MeshBasicMaterial({color:0xffe2a8}));l.position.set((i-1)*1.2,2.95,SZ-.2);G.add(l);}
  const warm=new T.PointLight(0xffd9a8,.7,7);warm.position.set(0,2.6,SZ+.6);G.add(warm);
  /* plants */
  [-1.75,1.75].forEach(x=>{bx(.34,.34,.34,mat(0xf1eef9,.5),x,.17,SZ-1.1);const b=mat(0x2f9e5b,.8);for(let i=0;i<7;i++){const s=new T.Mesh(new T.SphereGeometry(.17+.05*(i%3),10,8),b);s.scale.set(.8,1.3,.8);s.position.set(x+Math.sin(i*1.7)*.2,.62+i*.05,SZ-1.1+Math.cos(i*1.7)*.15);G.add(s);}});
  /* neon sign */
  const sign=document.createElement('canvas');sign.width=768;sign.height=300;{const g=sign.getContext('2d');g.textAlign='center';g.font='italic 800 118px Georgia,serif';g.shadowColor='#ff3fd0';g.shadowBlur=28;g.fillStyle='#fff';g.fillText('Sip & Paint',384,125);g.shadowBlur=22;g.fillStyle='#ff6fe0';g.fillText('Sip & Paint',384,125);g.shadowBlur=0;g.fillStyle='#fff';g.fillText('Sip & Paint',384,125);g.font='italic 600 40px Georgia,serif';g.shadowColor='#ffd23f';g.shadowBlur=12;g.fillText('Create · Sip · Connect',384,200);g.shadowBlur=0;g.strokeStyle='#ffd23f';g.lineWidth=8;g.lineCap='round';g.beginPath();g.moveTo(190,230);g.lineTo(580,222);g.stroke();}
  const signT=new T.CanvasTexture(sign);signT.encoding=T.sRGBEncoding;const sm=new T.Mesh(new T.PlaneGeometry(1.7,.665),new T.MeshBasicMaterial({map:signT,transparent:true}));sm.position.set(0,2.62,SZ-1.31);G.add(sm);
  /* reference screen */
  const wall=document.createElement('canvas');wall.width=1024;wall.height=576;const wg=wall.getContext('2d');const wallT=new T.CanvasTexture(wall);wallT.encoding=T.sRGBEncoding;wallT.anisotropy=4;
  bx(1.86,1.1,.05,mat(0x15112a,.4),0,1.78,SZ-1.31);const wm=new T.Mesh(new T.PlaneGeometry(1.76,.99),new T.MeshBasicMaterial({map:wallT}));wm.position.set(0,1.78,SZ-1.28);G.add(wm);
  const rr=(g,x,y,w,hh,r)=>{g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+hh,r);g.arcTo(x+w,y+hh,x,y+hh,r);g.arcTo(x,y+hh,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath();};
  function drawWall(){
    const g=wg,W=1024,H=576;g.clearRect(0,0,W,H);g.fillStyle='#f3efff';rr(g,0,0,W,H,34);g.fill();
    g.fillStyle='#6a3df0';rr(g,28,24,610,92,46);g.fill();g.fillStyle='#fff';g.font='800 48px sans-serif';g.textBaseline='middle';g.fillText('What to Paint Today?',64,72);
    g.fillStyle='#4a2fc4';rr(g,806,24,190,104,24);g.fill();g.fillStyle='#fff';g.textAlign='center';g.font='800 48px sans-serif';g.fillText(String(nSeated),900,60);g.font='600 26px sans-serif';g.fillText('Painting',900,102);g.textAlign='left';
    const rc=sp.ref?refCanvas(sp.ref,()=>{drawWall();wallT.needsUpdate=true;R.markDirty&&R.markDirty();}):null;
    if(rc){g.save();rr(g,36,142,350,390,14);g.clip();g.drawImage(rc,36,142,350,390);g.restore();}
    else{g.fillStyle='#e4dcff';rr(g,36,142,350,390,14);g.fill();g.fillStyle='#6a3df0';g.font='700 28px sans-serif';g.textAlign='center';g.fillText('Host picks',211,320);g.fillText('the picture',211,356);g.textAlign='left';}
    g.fillStyle='#1d1a2b';g.font='800 38px sans-serif';g.fillText('Your Canvas',470,190);g.font='600 30px sans-serif';
    const items=sp.note?[sp.note]:['Grab your brush','Paint the picture','Enjoy your drink'];
    if(sp.note){g.fillStyle='#1d1a2b';g.font='600 30px sans-serif';const words=sp.note.split(' ');let line='',y=250;words.forEach(w=>{const t=line?line+' '+w:w;if(g.measureText(t).width>480&&line){g.fillText(line,470,y);y+=40;line=w;}else line=t;});if(line)g.fillText(line,470,y);}
    else items.forEach((t,i)=>{const y=262+i*76;g.fillStyle='#7b4dff';g.beginPath();g.arc(490,y,20,0,7);g.fill();g.strokeStyle='#fff';g.lineWidth=5;g.beginPath();g.moveTo(481,y);g.lineTo(488,y+8);g.lineTo(500,y-8);g.stroke();g.fillStyle='#1d1a2b';g.font='600 32px sans-serif';g.fillText(t,526,y+2);});
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
      ch.on('broadcast',{event:'seg'},({payload:p})=>onSeg(p)).on('broadcast',{event:'sync'},({payload:p})=>{if(p&&p.u&&p.u!==me&&Array.isArray(p.ops)){get(p.u).load(p.ops);}})
        .on('broadcast',{event:'hello'},({payload:p})=>{if(p&&p.u!==me&&!mine.empty())setTimeout(()=>sendSync(),200+Math.random()*600);})
        .subscribe(s=>{if(s==='SUBSCRIBED'){chOk=true;send('hello',{u:me});}else if(s==='CLOSED'||s==='CHANNEL_ERROR')chOk=false;});}catch(e){}
  }
  function sendSync(){const ops=mine.ops;if(JSON.stringify(ops).length>180000)return;send('sync',{u:me,ops});}
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
    sheet('Reference',(body)=>{const c=h('canvas',{width:400,height:500,class:'pt-view'});const g=c.getContext('2d');const paint=()=>{if(sp.ref){g.drawImage(refCanvas(sp.ref,paint),0,0);}else{g.fillStyle='#eee';g.fillRect(0,0,400,500);}};paint();
      body.append(sp.ref?c:h('p',{class:'f-hint'},'The host has not picked a picture yet.'),sp.note?h('p',null,sp.note):null);});
  }

  /* ---- the painting overlay ---- */
  function openPaint(){
    if(ov)return;
    if(!st.map.has(me)){toast('All four painting seats are taken. You can watch until one frees up.');return;}
    let tool='b',color=COLS[1][1],size=14,drawing=null,cur=null,sendBuf=[],lastSend=0,miniOn=true;
    const frame=h('div',{class:'pt-frame'});const cv=mine.cv;cv.className='pt-cv';let guideOn=true;const gcv=h('canvas',{class:'pt-guide',width:CW,height:CH});const stack=h('div',{class:'pt-stack'},cv,gcv);frame.append(stack);
    function drawGuide(){const g=gcv.getContext('2d');g.clearRect(0,0,CW,CH);gcv.style.display=guideOn&&sp.ref?'':'none';if(guideOn&&sp.ref)g.drawImage(guideCanvas(sp.ref,drawGuide),0,0);}
    const banner=h('div',{class:'pt-ban'});
    const sw=h('div',{class:'pt-sw'}),tools=h('div',{class:'pt-tools'}),stch=h('div',{class:'pt-st'}),size_=h('input',{type:'range',min:'3',max:'44',value:String(size),'aria-label':'Brush size'});
    const mini=h('button',{class:'pt-mini','aria-label':'Show the reference larger',onclick:showRef});const mc=refCanvas(sp.ref||'',()=>drawMini());const mg=h('canvas',{width:120,height:150});mini.append(mg);
    function drawMini(){const g=mg.getContext('2d');g.fillStyle='#eee';g.fillRect(0,0,120,150);if(sp.ref)g.drawImage(refCanvas(sp.ref,drawMini),0,0,120,150);}
    const paintSw=()=>sw.replaceChildren(...COLS.map(([n,c])=>h('button',{class:'pt-c'+(c===color?' on':''),style:{background:c},'aria-label':n,title:n,onclick:()=>{color=c;if(tool==='e')tool='b';paintTools();paintSw();}})));
    const T3=[['b','Brush'],['p','Pencil'],['e','Eraser']];
    const act=(l,fn,cls)=>h('button',{class:'pt-b '+(cls||''),onclick:fn},l);
    function paintTools(){tools.replaceChildren(...T3.map(([k,l])=>h('button',{class:'pt-b'+(tool===k?' on':''),onclick:()=>{tool=k;paintTools();}},l)),h('button',{class:'pt-b'+(guideOn?' on':''),onclick:()=>{guideOn=!guideOn;drawGuide();paintTools();}},'Guide'),act('Undo',()=>{if(mine.undo())changed(true);}),act('Redo',()=>{if(mine.redoOp())changed(true);}),act('Clear',()=>{if(mine.empty())return;if(confirm('Clear your whole canvas?')){mine.clear();changed(true);}},'warn'));}
    function paintState(){stch.replaceChildren(...STATES.map((l,i)=>h('button',{class:'pt-sc'+(mine.state()===i?' on':''),onclick:()=>{mine.setState(i);changed(true);paintState();}},l)));}
    function changed(full){redraw();if(full)sendSync();saveSoon();}
    const allowed=()=>sp.state==='painting';
    function paintBan(){banner.textContent=sp.state==='painting'?'':(sp.state==='paused'?'Painting is paused by the host':'Waiting for the host to start the session');banner.style.display=sp.state==='painting'?'none':'';}
    const pos=e=>{const r=cv.getBoundingClientRect();return[(e.clientX-r.left)/r.width*CW,(e.clientY-r.top)/r.height*CH];};
    const down=e=>{if(!allowed()||drawing!==null)return;e.preventDefault();try{cv.setPointerCapture(e.pointerId);}catch(x){}drawing=e.pointerId;const[x,y]=pos(e);const id=Math.random().toString(36).slice(2,8);cur=mine.start(tool,color,size,x,y,id);if(!cur){drawing=null;toast('This painting is full. Undo something or clear it to keep going.');return;}sendBuf=[cur.p[0],cur.p[1]];cur.first=true;flush();};
    const move=e=>{if(drawing!==e.pointerId||!cur)return;e.preventDefault();const ev=e.getCoalescedEvents?e.getCoalescedEvents():[e];(ev.length?ev:[e]).forEach(q=>{const[x,y]=pos(q);if(mine.extend(cur,x,y))sendBuf.push(Math.round(x),Math.round(y));});const n=Date.now();if(n-lastSend>110)flush();if(n-lastPaintPing>600){lastPaintPing=n;R.stagePaint(me);}};
    const up=e=>{if(drawing!==e.pointerId)return;drawing=null;flush();cur=null;saveSoon();};
    function flush(){lastSend=Date.now();if(!cur||!sendBuf.length)return;const p={u:me,id:cur.id,p:sendBuf};if(cur.first){p.t=cur.t;p.c=cur.c;p.z=cur.z;cur.first=false;}send('seg',p);sendBuf=[];}
    cv.addEventListener('pointerdown',down);cv.addEventListener('pointermove',move);cv.addEventListener('pointerup',up);cv.addEventListener('pointercancel',up);cv.style.touchAction='none';
    size_.oninput=()=>{size=+size_.value;};
    const key=e=>{if(e.target&&/INPUT|TEXTAREA/.test(e.target.tagName)&&e.target.type!=='range')return;const k=e.key.toLowerCase();
      if((e.ctrlKey||e.metaKey)&&k==='z'){e.preventDefault();if(e.shiftKey?mine.redoOp():mine.undo())changed(true);}else if((e.ctrlKey||e.metaKey)&&k==='y'){e.preventDefault();if(mine.redoOp())changed(true);}
      else if(k==='b'){tool='b';paintTools();}else if(k==='p'){tool='p';paintTools();}else if(k==='e'){tool='e';paintTools();}
      else if(k==='['){size=Math.max(3,size-3);size_.value=size;}else if(k===']'){size=Math.min(44,size+3);size_.value=size;}else if(k==='escape')close();};
    document.addEventListener('keydown',key);
    function fit(){const w=frame.clientWidth,hh=frame.clientHeight;if(!w||!hh)return;const s=Math.min(w/CW,hh/CH);cv.style.width=Math.floor(CW*s)+'px';cv.style.height=Math.floor(CH*s)+'px';}
    const ro=window.ResizeObserver?new ResizeObserver(fit):null;
    function close(){if(!ov)return;flush();document.removeEventListener('keydown',key);ro&&ro.disconnect();stack.remove();cv.remove();cv.removeAttribute('style');ov.remove();ov=null;redraw();saveNow();sendSync();}
    ov=h('div',{class:'pt-ov'},
      h('div',{class:'pt-top'},h('button',{class:'pt-done',onclick:close},'Done'),h('b',null,'My canvas'),h('button',{class:'pt-ref',onclick:showRef},'Reference')),
      banner,frame,mini,
      h('div',{class:'pt-dock'},tools,h('div',{class:'pt-sz'},h('span',null,'Size'),size_),sw,stch));
    document.body.appendChild(ov);ro&&ro.observe(frame);fit();paintTools();paintSw();paintState();paintBan();drawMini();drawGuide();
    ov._upd=()=>{paintBan();drawMini();drawGuide();};
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
      const up=h('button',{class:'btn small'},'Upload my own picture');up.onclick=async()=>{const f=await pickFile('image/jpeg,image/png,image/webp');if(!f)return;await guard(up,async()=>{const p=await prepareImage(f,{max:900,quality:.85,maxMB:12});const path=await uploadFile('room-images',p.blob,'jpg','image/jpeg');await send_('ref','img:'+path);toast('Reference changed');});};
      const note=h('textarea',{maxlength:'200',rows:'2',placeholder:'Instructions for everyone (optional)'});note.value=sp.note||'';
      const saveN=h('button',{class:'btn small'},'Show on the screen');saveN.onclick=()=>send_('note',note.value);
      const clr=h('button',{class:'btn small'},'Clear picture');clr.onclick=()=>send_('ref','');
      const ctl=h('div',{class:'pt-hc'},sp.state==='waiting'?h('button',{class:'btn coral',onclick:()=>send_('start')},'Start painting'):sp.state==='painting'?h('button',{class:'btn',onclick:()=>send_('pause')},'Pause'):h('button',{class:'btn coral',onclick:()=>send_('resume')},'Resume'));
      body.append(h('p',{class:'f-hint'},'Session: '+(sp.state==='waiting'?'waiting to start':sp.state)),ctl,h('div',{class:'f-label',style:{margin:'14px 0 6px'}},'Reference picture'),grid,h('div',{class:'pt-hc',style:{marginTop:'8px'}},up,clr),h('div',{class:'f-label',style:{margin:'14px 0 6px'}},'Instructions'),note,h('div',{style:{marginTop:'6px'}},saveN),
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

  return{hud,
    update(D){if(dead)return;const s=Object.assign({},D.space);if(Date.now()<lockUntil){s.paint_ref=sp.ref;s.paint_state=sp.state;s.paint_note=sp.note;}const ch_=sp.ref!==s.paint_ref||sp.state!==s.paint_state||sp.note!==(s.paint_note||'');
      sp={ref:s.paint_ref||null,state:s.paint_state||'waiting',note:s.paint_note||'',title:s.title};seatSync();if(ch_){paintHud();ov&&ov._upd&&ov._upd();}},
    seatSync,
    async finalSave(){ctx.final=true;await saveNow();},
    destroy(){dead=true;clearTimeout(saveT);try{if(ov){mine.cv.remove();ov.remove();ov=null;}}catch(e){}try{R.host.removeEventListener('click',onClick);}catch(e){}try{ch&&sb.removeChannel(ch);}catch(e){}badges.forEach(b=>b.remove());hud.remove();}};
}
return{attach,galleryView,myArtworks,PC,REFS,guideCanvas,refCanvas};
})();
