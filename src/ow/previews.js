/* ---------- room previews that cost almost nothing on a phone ----------
   1. A room with a saved picture shows that picture (small jpeg, lazy, async decode).
   2. A room without one is drawn as a tiny floor plan from its real data: wall and floor colours,
      rug, each piece of furniture where it stands, and the wall decor along the walls.
      The plan is drawn only when the card scrolls into view, two at a time, then cached.
   3. The owner's own room gets a real 3D snapshot made once, in idle time, and uploaded. */
const OWPrev=(()=>{
  const cache=new Map(),waiters=new Map();let running=0;const queue=[];
  const WALLC={curtains:'#c4532d',neon:'#ff3d81',wall_clock:'#f4f1ea',window:'#bfe3f5',door:'#8a5a3a',shelf:'#8b6b4a',mirror:'#cfe3ee'};
  const CATC={bedroom:'#8f7bd6',living:'#c98f5a',gaming:'#4a4f7a',decor:'#7fa88a',wall:'#a98'};
  const shade=(hex,k)=>{const m=/^#?([0-9a-f]{6})$/i.exec(hex||'');if(!m)return hex||'#888';const n=parseInt(m[1],16);const c=s=>Math.max(0,Math.min(255,Math.round(((n>>s)&255)*k)));return'rgb('+c(16)+','+c(8)+','+c(0)+')';};
  async function items(id){
    if(cache.has(id))return cache.get(id);
    const r=await sb.rpc('ow_room_items',{p_room:id});if(r.error)throw r.error;
    const a=Array.isArray(r.data)?r.data:[];cache.set(id,a);return a;
  }
  function draw(cv,r,its){
    const th=(OW.THEMES[r.theme&&r.theme.key]||OW.THEMES.lagos);
    const W=+r.width||OW.SIZES.medium.w,D=+r.depth||OW.SIZES.medium.d;
    const cw=cv.width,ch=cv.height,pad=14,wt=11;
    const s=Math.min((cw-pad*2-wt*2)/W,(ch-pad*2-wt*2)/D);
    const rw=W*s,rd=D*s,ox=(cw-rw)/2,oy=(ch-rd)/2;
    const g=cv.getContext('2d');
    g.fillStyle='#efe7f7';g.fillRect(0,0,cw,ch);
    /* walls */
    g.fillStyle=th.wall;g.fillRect(ox-wt,oy-wt,rw+wt*2,rd+wt*2);
    g.strokeStyle=th.trim;g.lineWidth=2;g.strokeRect(ox-1,oy-1,rw+2,rd+2);
    /* floor with plank lines */
    g.fillStyle=th.floor;g.fillRect(ox,oy,rw,rd);
    g.strokeStyle='rgba(0,0,0,.09)';g.lineWidth=1;
    for(let y=oy+s*.45;y<oy+rd;y+=s*.45){g.beginPath();g.moveTo(ox,y);g.lineTo(ox+rw,y);g.stroke();}
    const cx=ox+rw/2,cz=oy+rd/2;
    const fur=[],dec=[];
    its.forEach(i=>(i.kind==='decor'?dec:fur).push(i));
    fur.sort((a,b)=>(a.type==='rug'?0:1)-(b.type==='rug'?0:1)||(+a.y||0)-(+b.y||0));
    fur.forEach(i=>{
      const d=OW.furn(i.type);if(!d)return;
      const sc=+i.scale||1,w=d.w*sc*s,dp=d.d*sc*s;
      const col=i.color||(i.type==='rug'?th.rug[0]:d.col)||CATC[d.cat]||'#a98';
      g.save();g.translate(cx+(+i.x||0)*s,cz+(+i.z||0)*s);g.rotate(+i.rot||0);
      if(i.type==='rug'){
        g.fillStyle=col;g.fillRect(-w/2,-dp/2,w,dp);g.strokeStyle=th.rug[1]||'#fff';g.lineWidth=2;g.strokeRect(-w/2+3,-dp/2+3,w-6,dp-6);
      }else{
        g.fillStyle='rgba(0,0,0,.18)';g.fillRect(-w/2+1.5,-dp/2+2,w,dp);
        g.fillStyle=col;g.fillRect(-w/2,-dp/2,w,dp);
        g.fillStyle=shade(col,1.18);g.fillRect(-w/2+1,-dp/2+1,w-2,Math.max(2,dp*.28));
        g.strokeStyle=shade(col,.62);g.lineWidth=1;g.strokeRect(-w/2,-dp/2,w,dp);
      }
      g.restore();
    });
    /* wall decor: little marks along the wall it hangs on (pictures show as framed, others in their own colour) */
    dec.forEach(i=>{
      const w=Math.max(4,(+i.width||.6)*(+i.scale||1)*s),t=5,wall=i.wall||'back';
      const col=i.color||WALLC[i.type]||(i.image_path?'#fff':'#f7d56b');
      const along=(+i.x||0)*s;let x,y,bw,bh;
      if(wall==='back'){x=cx+along-w/2;y=oy-t-1;bw=w;bh=t;}
      else if(wall==='front'){x=cx+along-w/2;y=oy+rd+1;bw=w;bh=t;}
      else if(wall==='left'){x=ox-t-1;y=cz+along-w/2;bw=t;bh=w;}
      else{x=ox+rw+1;y=cz+along-w/2;bw=t;bh=w;}
      g.fillStyle=col;g.fillRect(x,y,bw,bh);g.strokeStyle=i.image_path?'#5a4a7a':'rgba(0,0,0,.35)';g.lineWidth=1;g.strokeRect(x+.5,y+.5,bw-1,bh-1);
    });
  }
  async function paint(box,r){
    try{
      const its=await items(r.id);
      const cv=document.createElement('canvas');cv.width=320;cv.height=240;cv.className='plan-cv';
      cv.setAttribute('role','img');cv.setAttribute('aria-label',(r.name||'Room')+' floor plan');
      draw(cv,r,its);box.replaceChildren(cv);box.classList.add('ready');
    }catch(e){box.classList.add('fail');}
  }
  function pump(){
    while(running<2&&queue.length){const j=queue.shift();running++;paint(j.box,j.r).finally(()=>{running--;pump();});}
  }
  let io=null;
  function watch(box,r){
    if(!('IntersectionObserver' in window)){queue.push({box,r});pump();return;}
    if(!io)io=new IntersectionObserver(es=>es.forEach(e=>{if(!e.isIntersecting)return;io.unobserve(e.target);const j=waiters.get(e.target);if(j){waiters.delete(e.target);queue.push(j);pump();}}),{rootMargin:'250px'});
    waiters.set(box,{box,r});io.observe(box);
  }
  /* the picture for a room card: saved image if there is one, else a lazily drawn plan of the real room */
  function node(r,cls,alt){
    const url=Store.previewUrl(r.theme,r.updated_at);
    if(url)return h('img',{class:cls,src:url,alt:alt||r.name||'',width:'480',height:'360',loading:'lazy',decoding:'async'});
    return h('div',{class:cls+' ph'},r.name||'Room');
    const box=h('div',{class:cls+' plan','aria-label':alt||r.name||'Room'},h('span',{class:'plan-n'},r.name||'Room'));
    if(r.id)watch(box,r);return box;
  }
  /* own room: make the 3D snapshot once, quietly, when it is missing */
  let ownDone=false;
  async function ensureMine(){
    if(ownDone||!Auth.user||typeof OWRoom==='undefined')return;ownDone=true;
    try{
      const m=await Store.mine();if(!m||!m.room||(m.room.theme&&m.room.theme.preview))return;
      if(!m.items.length)return;
      await new Promise(res=>('requestIdleCallback' in window?requestIdleCallback(res,{timeout:6000}):setTimeout(res,2500)));
      if(/^#\/edit/.test(location.hash))return;
      const url=await OWRoom.preview(m.room,m.items,480,360);const path=await Store.uploadPreview(url);
      const theme=Object.assign({},m.room.theme,{preview:path,pv:Date.now()});
      const u=await sb.from('rooms').update({theme}).eq('id',m.room.id);if(u.error)throw u.error;
    }catch(e){console.warn('ensureMine preview',e);ownDone=false;}
  }
  return{node,ensureMine,draw};
})();
