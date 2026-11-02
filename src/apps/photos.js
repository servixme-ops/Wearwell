/* ---------- PHOTOS: albums, community uploads, likes, reports ---------- */
defApp({id:'photos',name:'Photos',bg:'#fff',dock:true,glyph:()=>`<svg viewBox="0 0 60 60"><g transform="translate(30 30)" style="mix-blend-mode:multiply">${['#ff9500','#ffcc00','#34c759','#00c7be','#0a84ff','#af52de','#ff2d55','#ff3b30'].map((c,i)=>`<ellipse cx="0" cy="-10" rx="7" ry="11" fill="${c}" opacity=".85" transform="rotate(${i*45})"/>`).join('')}</g></svg>`,
mount(el,ctx,live){
  /* Photos = one folder, Randoms. Nothing here can be deleted. */
  let list=[],loaded=false;
  const body=h('div',{class:'app-body'});el.append(appBar({title:'Randoms',onBack:ctx.close,backLabel:'Back',right:h('button',{class:'icon-btn','aria-label':'Add a photo',onclick:()=>addPhoto()},icon('plus'))}),body);
  const urls=[];const objUrl=b=>{const u=URL.createObjectURL(b);urls.push(u);return u;};
  let viewerOpen=null;
  async function fetchList(){
    const out=[];
    if(Auth.user&&sb){try{const r=await sb.from('photos').select('*').eq('user_id',Auth.user.id).eq('album_slug','randoms').order('created_at',{ascending:false}).limit(300);
      (r.data||[]).forEach(x=>out.push({kind:'cloud',id:x.id,path:x.storage_path,src:publicUrl('gallery',x.storage_path),caption:x.caption,link:x.link,t:x.created_at}));}catch(e){}}
    try{const l=await LocalGallery.list();l.filter(x=>x.album==='randoms').forEach(x=>out.push({kind:'local',id:x.id,src:objUrl(x.blob),blob:x.blob,caption:x.caption,link:x.link,t:new Date(x.t).toISOString()}));}catch(e){}
    return out.sort((x,y)=>String(y.t).localeCompare(String(x.t)));
  }
  async function load(first){
    if(first&&!loaded)body.replaceChildren(spinner());
    list=await fetchList();loaded=true;draw();
  }
  const linkBadge=p=>{const i=identifyLink(p.link);return i?h('span',{class:'ph-link',role:'link','aria-label':'Open '+i.name,onclick:e=>{e.stopPropagation();e.preventDefault();openExternal(i.url);}},linkChip(i,{small:true})):null;};
  function draw(){
    body.replaceChildren();
    if(!list.length){body.append(h('div',{class:'empty-state'},h('span',{class:'empty-ic'},icon('image')),h('h4',null,'No photos yet'),h('p',null,'Photos you add to Randoms show up here.'),h('button',{class:'btn primary',onclick:()=>addPhoto()},'Add a photo')));}
    else{
      const g=h('div',{class:'photo-grid'});
      list.forEach((p,i)=>g.append(h('button',{class:'ph','aria-label':p.caption||'Photo',onclick:()=>viewer(i)},h('img',{src:p.src,alt:p.caption||'',loading:'lazy'}),p.link?linkBadge(p):null)));
      body.append(g);
    }
    if(!Auth.user)body.append(h('p',{class:'muted small-t',style:{textAlign:'center',padding:'6px 24px 24px'}},'Photos you add while signed out stay on this device, one at a time.'));
  }
  async function addPhoto(){
    const f=await pickFile('image/jpeg,image/png,image/webp');if(!f)return;
    Contrib.sendSheet(ctx,[f]);
  }
  /* shown the moment a photo is saved from anywhere (camera, this app) */
  Contrib.onSaved=async()=>{await load(false);};

  /* ---- full-screen viewer, like the iPhone gallery: swipe between photos, pinch or double-tap to zoom, drag down to close ---- */
  function viewer(start){
    if(viewerOpen)return;
    let i=start,scale=1,tx=0,ty=0,chrome=true,anim=false;
    const ov=h('div',{class:'pv-ov'});const stage=h('div',{class:'pv-stage'});
    const imgs=[-1,0,1].map(()=>h('img',{class:'pv-img',alt:'',draggable:'false'}));
    const track=h('div',{class:'pv-track'},imgs);stage.append(track);
    const top=h('div',{class:'pv-top'},h('button',{class:'pv-btn',onclick:()=>closeV()},'Done'),h('span',{class:'pv-count'}),h('span',{style:{width:'56px'}}));
    const bot=h('div',{class:'pv-bot'});
    ov.append(stage,top,bot);el.append(ov);viewerOpen={close:()=>closeV()};
    requestAnimationFrame(()=>ov.classList.add('in'));
    const W=()=>stage.clientWidth||360,H=()=>stage.clientHeight||640;
    const cur=()=>list[i];
    function setSrc(){[-1,0,1].forEach((d,k)=>{const p=list[i+d];imgs[k].src=p?p.src:'';imgs[k].style.visibility=p?'visible':'hidden';});
      top.querySelector('.pv-count').textContent=(i+1)+' of '+list.length;paintBot();}
    function paintBot(){
      const p=cur(),li=identifyLink(p.link);bot.replaceChildren(...[
        li?h('button',{class:'pv-link',onclick:()=>openExternal(li.url)},linkChip(li),h('span',null,li.key==='link'?li.host:'Open on '+li.name)):null,
        p.caption?h('p',{class:'pv-cap'},p.caption):null,
        h('div',{class:'pv-row'},h('button',{class:'pv-btn',onclick:async()=>{try{const bl=p.blob||await (await fetch(p.src)).blob();const f=new File([bl],'lukks-photo.jpg',{type:bl.type||'image/jpeg'});
          if(navigator.canShare&&navigator.canShare({files:[f]}))await navigator.share({files:[f]});else download(bl,'lukks-photo.jpg');}catch(e){if(e&&e.name!=='AbortError')toast('Could not save that photo','err');}}},icon('share'),'Save or share'))].filter(Boolean));
    }
    function apply(dx,dy,sc,fade){
      track.style.transition=anim?'transform .28s cubic-bezier(.2,.8,.2,1)':'none';
      imgs[1].style.transition=anim?'transform .28s cubic-bezier(.2,.8,.2,1)':'none';
      track.style.transform=`translate3d(${scale>1?0:dx}px,0,0)`;
      imgs[1].style.transform=`translate3d(${scale>1?tx:0}px,${scale>1?ty:dy}px,0) scale(${sc})`;
      ov.style.background=`rgba(0,0,0,${fade==null?1:fade})`;
    }
    const clamp=()=>{const mx=(scale-1)*W()/2,my=(scale-1)*H()/2;tx=Math.max(-mx,Math.min(mx,tx));ty=Math.max(-my,Math.min(my,ty));};
    function closeV(){ov.classList.remove('in');setTimeout(()=>ov.remove(),220);viewerOpen=null;}
    const pts=new Map();let g=null,lastTap=0,lastTapXY=null,tapTimer=null;
    stage.style.touchAction='none';
    stage.addEventListener('pointerdown',e=>{stage.setPointerCapture(e.pointerId);pts.set(e.pointerId,{x:e.clientX,y:e.clientY});anim=false;
      if(pts.size===2){const [a,b]=[...pts.values()];g={mode:'pinch',d0:Math.hypot(a.x-b.x,a.y-b.y)||1,s0:scale,tx0:tx,ty0:ty,cx:(a.x+b.x)/2,cy:(a.y+b.y)/2};}
      else if(pts.size===1)g={mode:'pan',x0:e.clientX,y0:e.clientY,tx0:tx,ty0:ty,t0:performance.now(),dx:0,dy:0,moved:false,dir:null};});
    stage.addEventListener('pointermove',e=>{if(!pts.has(e.pointerId))return;pts.set(e.pointerId,{x:e.clientX,y:e.clientY});if(!g)return;
      if(g.mode==='pinch'&&pts.size>=2){const [a,b]=[...pts.values()];const d=Math.hypot(a.x-b.x,a.y-b.y);scale=Math.max(.8,Math.min(5,g.s0*d/g.d0));clamp();apply(0,0,scale);return;}
      if(g.mode==='pan'&&pts.size===1){const dx=e.clientX-g.x0,dy=e.clientY-g.y0;if(Math.abs(dx)+Math.abs(dy)>6)g.moved=true;
        if(scale>1){tx=g.tx0+dx;ty=g.ty0+dy;clamp();apply(0,0,scale);return;}
        if(!g.dir&&(Math.abs(dx)>8||Math.abs(dy)>8))g.dir=Math.abs(dx)>Math.abs(dy)?'h':'v';
        g.dx=dx;g.dy=dy;
        if(g.dir==='h'){let d=dx;if((i===0&&d>0)||(i===list.length-1&&d<0))d*=.35;apply(d,0,1);}
        else if(g.dir==='v'){const k=Math.max(.6,1-Math.abs(dy)/900);apply(0,dy,k,Math.max(0,1-Math.abs(dy)/420));}}});
    const end=e=>{if(!pts.has(e.pointerId))return;pts.delete(e.pointerId);
      if(g&&g.mode==='pinch'){if(pts.size<2){if(scale<1)scale=1;if(scale===1){tx=0;ty=0;}anim=true;clamp();apply(0,0,scale);const rem=[...pts.values()][0];g=rem?{mode:'pan',x0:rem.x,y0:rem.y,tx0:tx,ty0:ty,t0:performance.now(),dx:0,dy:0,moved:true,dir:null}:null;}return;}
      if(!g||g.mode!=='pan'||pts.size)return;const gg=g;g=null;anim=true;
      if(scale>1&&gg.moved){apply(0,0,scale);return;}
      if(scale===1&&gg.dir==='h'&&Math.abs(gg.dx)>W()*.22||(gg.dir==='h'&&Math.abs(gg.dx)>40&&performance.now()-gg.t0<260)){
        const dir=gg.dx<0?1:-1;if(i+dir>=0&&i+dir<list.length){track.style.transition='transform .22s ease-out';track.style.transform=`translate3d(${-dir*W()}px,0,0)`;
          setTimeout(()=>{i+=dir;track.style.transition='none';track.style.transform='translate3d(0,0,0)';imgs[1].style.transform='';setSrc();},210);return;}}
      if(scale===1&&gg.dir==='v'&&Math.abs(gg.dy)>110){closeV();return;}
      if(!gg.moved){ // tap
        const now=performance.now(),xy={x:e.clientX,y:e.clientY};
        if(now-lastTap<300&&lastTapXY&&Math.hypot(xy.x-lastTapXY.x,xy.y-lastTapXY.y)<40){clearTimeout(tapTimer);lastTap=0;
          if(scale>1){scale=1;tx=0;ty=0;}else{scale=2.6;const r=stage.getBoundingClientRect();tx=-(xy.x-r.left-W()/2)*(scale-1);ty=-(xy.y-r.top-H()/2)*(scale-1);clamp();}
          apply(0,0,scale);}
        else{lastTap=now;lastTapXY=xy;tapTimer=setTimeout(()=>{chrome=!chrome;ov.classList.toggle('bare',!chrome);},300);}
        return;}
      apply(0,0,1);};
    stage.addEventListener('pointerup',end);stage.addEventListener('pointercancel',end);
    stage.addEventListener('wheel',e=>{e.preventDefault();scale=Math.max(1,Math.min(5,scale*(e.deltaY<0?1.15:.87)));if(scale===1){tx=0;ty=0;}clamp();anim=false;apply(0,0,scale);},{passive:false});
    setSrc();apply(0,0,1);
    ov.closeV=closeV;
  }
  ctx.onBack=()=>{if(viewerOpen){viewerOpen.close();return true;}return false;};
  live(()=>load(false));
  load(true);
},unmount(){Contrib.onSaved=null;}});
