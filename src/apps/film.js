/* ---------- PHOTO DUMP: browse a roll of film. Every photo starts as a colour negative; tap a frame to develop it. ---------- */
const Film={
  /* A real colour negative is an orange base with the picture inverted on top of it. Shown only on screen: the stored photo is never touched. */
  negative(cv,img,w,h,cover){
    cv.width=w;cv.height=h;const g=cv.getContext('2d',{willReadFrequently:true});
    const iw=img.naturalWidth||img.width,ih=img.naturalHeight||img.height;
    if(cover){const r=Math.max(w/iw,h/ih),sw=w/r,sh=h/r;g.drawImage(img,(iw-sw)/2,(ih-sh)/2,sw,sh,0,0,w,h);}else g.drawImage(img,0,0,w,h);
    const d=g.getImageData(0,0,w,h),a=d.data;
    for(let i=0;i<a.length;i+=4){
      const r=a[i]/255,gg=a[i+1]/255,b=a[i+2]/255,n=(Math.random()-.5)*16;
      /* fade the highlights a little so it looks like old, flat film */
      const R=.91-.74*r,G=.54-.54*gg*1.0,B=.27-.30*b;
      a[i]=Math.max(0,Math.min(255,R*255+n));a[i+1]=Math.max(0,Math.min(255,G*255+n*.8+8));a[i+2]=Math.max(0,Math.min(255,B*255+n*.6+6));
    }
    g.putImageData(d,0,0);
    /* slightly uneven exposure at the edges */
    const vg=g.createRadialGradient(w/2,h/2,Math.min(w,h)*.25,w/2,h/2,Math.max(w,h)*.75);vg.addColorStop(0,'rgba(120,50,0,0)');vg.addColorStop(1,'rgba(60,20,0,.38)');g.fillStyle=vg;g.fillRect(0,0,w,h);
    return cv;
  },
  load(url){return new Promise((res,rej)=>{const i=new Image();i.crossOrigin='anonymous';i.decoding='async';i.onload=()=>res(i);i.onerror=()=>rej(new Error('Could not load that photo.'));i.src=url;});},
  canister(){
    const ns='http://www.w3.org/2000/svg';
    const w=h('span',{class:'fd-canwrap',html:`<svg class="fd-can" viewBox="0 0 340 150" aria-hidden="true">
      <defs><clipPath id="fdBody"><rect x="22" y="26" width="256" height="92" rx="34"/></clipPath>
      <linearGradient id="fdShade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".28"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".22"/></linearGradient></defs>
      <ellipse cx="150" cy="136" rx="124" ry="9" fill="#1f5a45" opacity=".35"/>
      <g transform="translate(-4 -3)" fill="none" stroke="#e8574a" stroke-width="2.2" opacity=".85"><rect x="22" y="26" width="256" height="92" rx="34"/><ellipse cx="288" cy="72" rx="27" ry="48"/></g>
      <g clip-path="url(#fdBody)"><rect x="22" y="26" width="256" height="92" fill="#ff9500"/><polygon points="90,120 280,24 280,120" fill="#ffbf00"/><rect x="22" y="26" width="256" height="92" fill="url(#fdShade)"/></g>
      <rect x="22" y="26" width="256" height="92" rx="34" fill="none" stroke="#141414" stroke-width="5"/>
      <line x1="94" y1="118" x2="276" y2="27" stroke="#141414" stroke-width="2.4"/>
      <ellipse cx="282" cy="72" rx="25" ry="46" fill="#fff" stroke="#141414" stroke-width="5"/>
      <ellipse cx="282" cy="72" rx="19" ry="36" fill="none" stroke="#141414" stroke-width="2.2"/>
      <ellipse cx="282" cy="72" rx="13" ry="26" fill="#fff" stroke="#141414" stroke-width="2.2"/>
      <rect x="282" y="52" width="40" height="40" rx="8" fill="#141414" transform="translate(0 0)"/>
      <ellipse cx="322" cy="72" rx="9" ry="20" fill="#141414" stroke="#fff" stroke-width="3.5"/>
      <g transform="translate(322 72) scale(1 2.2)"><g class="fd-reel"><circle r="4.6" fill="none" stroke="#fff" stroke-width="2.2" stroke-dasharray="4.2 3.3"/></g></g>
      <ellipse cx="282" cy="72" rx="13" ry="26" fill="none" stroke="#fff" stroke-width="1" opacity=".0"/>
    </svg>`});
    return w;
  }
};
defApp({id:'dump',name:'Photo Dump',bg:'#80c5a9',
glyph:()=>`<img src="icons/logo.png" alt="" style="width:100%;height:100%;object-fit:cover;display:block;border-radius:inherit" draggable="false">`,
mount(el,ctx,live){
  el.classList.add('fd-app');
  const root=h('div',{class:'fd-root'});el.append(root);
  let items=[],offset=0,done=false,busy=false,failed=false,viewer=null,alive=true,rot=0,lastTop=0,raf=0;
  const PAGE=18,stack=[];
  ctx.onBack=()=>{if(viewer){viewer.close();return true;}if(stack.length){stack.pop()();return true;}return false;};

  /* ---------------- the film ---------------- */
  const scroller=h('div',{class:'fd-scroll'});
  const can=Film.canister();
  const header=h('div',{class:'fd-head'},can,
    h('button',{class:'fd-hbtn left','aria-label':'Back',onclick:()=>ctx.close()},icon('back')),
    h('div',{class:'fd-hright'},
      h('button',{class:'fd-hbtn','aria-label':'Add a photo',onclick:addPhoto},icon('plus')),
      h('button',{class:'fd-hbtn me','aria-label':'My profile',onclick:()=>{if(!Auth.user){toast('Sign in to see your profile','err');ctx.open('account',{mode:'signin'});return;}openProfile(Auth.profile&&Auth.profile.username);}},Auth.user?avatarEl(Auth.profile):icon('user'))));
  const strip=h('div',{class:'fd-strip'}),tail=h('div',{class:'fd-tail'});
  const status=h('div',{class:'fd-status'});
  scroller.append(header,h('div',{class:'fd-stripwrap'},strip,status),tail);
  root.append(scroller);
  const reel=can.querySelector('.fd-reel');
  scroller.addEventListener('scroll',()=>{
    if(raf)return;raf=requestAnimationFrame(()=>{raf=0;const t=scroller.scrollTop;rot-=(t-lastTop)*.9;lastTop=t;reel.setAttribute('transform','rotate('+(rot%360)+')');
      can.style.transform='translateY('+Math.min(6,t*.02)+'px)';
      if(!done&&!busy&&scroller.scrollHeight-t-scroller.clientHeight<900)loadMore();},{passive:true});
  },{passive:true});
  const io='IntersectionObserver' in window?new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){io.unobserve(e.target);develop(e.target);}}),{root:scroller,rootMargin:'900px 0px'}):null;

  /* one frame on the roll */
  function frameEl(it,i){
    const cv=h('canvas',{class:'fd-neg',width:300,height:400,'aria-hidden':'true'});
    const f=h('button',{class:'fd-frame','aria-label':(it.caption||'Photo')+' by @'+it.username,style:{'--tilt':((i*37%9)-4)/10+'deg'},onclick:()=>openViewer(i,f)},cv,h('span',{class:'fd-grain'}));
    f._it=it;f._cv=cv;
    return h('div',{class:'fd-cell'},h('div',{class:'fd-edge'},h('span',null,'PHOTO DUMP 400'),h('span',null,String(i+1).padStart(2,'0')+' ▸')),f,h('div',{class:'fd-edge low'},h('span',null,String(i+1).padStart(2,'0')+'A'),h('span',null,'@'+it.username)));
  }
  async function develop(f){ /* turn the stored photo into its negative, on screen only */
    const it=f._it;if(!it||f._done)return;f._done=true;
    try{const img=await Film.load(publicUrl('gallery',it.path));Film.negative(f._cv,img,300,400,true);f.classList.add('on');}
    catch(e){f.classList.add('bad');}
  }
  function observe(cell){const f=cell.querySelector('.fd-frame');if(io)io.observe(f);else develop(f);}
  function draw(from){
    if(!from)strip.replaceChildren();
    for(let i=from||0;i<items.length;i++){const c=frameEl(items[i],i);strip.append(c);observe(c);}
    status.replaceChildren();
    if(!items.length&&done&&!failed)status.append(h('div',{class:'fd-empty'},h('b',null,'The roll is empty'),h('span',null,'Add a photo from the + button and it shows up here as a negative.'),h('button',{class:'btn primary',onclick:addPhoto},'Add a photo')));
    else if(failed)status.append(h('div',{class:'fd-empty'},h('b',null,'Could not load the film'),h('span',null,'Check your connection and try again.'),h('button',{class:'btn primary',onclick:()=>{failed=false;loadMore();}},'Try again')));
    else if(busy)status.append(h('div',{class:'fd-spin'},'Winding on…'));
    else if(done&&items.length)status.append(h('div',{class:'fd-end'},'End of the roll'));
  }
  async function loadMore(reset){
    if(busy)return;if(reset){items=[];offset=0;done=false;failed=false;}
    busy=true;if(!items.length){strip.replaceChildren(...[0,1,2].map(i=>h('div',{class:'fd-cell'},h('div',{class:'fd-frame skel'}))));}else draw(items.length);
    try{
      if(!sb)throw new Error('offline');
      const r=await sb.rpc('film_feed',{p_limit:PAGE,p_offset:offset});if(r.error)throw r.error;
      const rows=Array.isArray(r.data)?r.data:[];const start=items.length;items=items.concat(rows);offset+=rows.length;if(rows.length<PAGE)done=true;
      busy=false;if(!start)draw();else draw(start);
    }catch(e){busy=false;failed=true;if(!items.length)strip.replaceChildren();draw(items.length);}
  }
  async function addPhoto(){
    const f=await pickFile('image/jpeg,image/png,image/webp');if(!f)return;
    Contrib.sendSheet(ctx,[f],{done:()=>{if(Auth.user)loadMore(true);}});
  }

  /* ---------------- full-screen viewer: the negative develops into the real photo ---------------- */
  function openViewer(i,frameBtn,list){
    if(viewer)return;list=list||items;let cur=i;
    const ov=h('div',{class:'fd-v'});
    const stage=h('div',{class:'fd-vstage'});
    const photo=h('div',{class:'fd-vphoto'});stage.append(photo);
    const top=h('div',{class:'fd-vtop'},h('button',{class:'fd-vbtn',onclick:()=>closeV()},'Done'),h('span',{class:'fd-vcount'}),h('span',{style:{width:'62px'}}));
    const info=h('div',{class:'fd-vinfo'});
    const dev=h('div',{class:'fd-vdev'},'Developing…');
    ov.append(stage,top,info,dev);el.append(ov);
    viewer={close:()=>closeV()};requestAnimationFrame(()=>ov.classList.add('in'));
    let token=0,sw=null,busyAnim=false;
    const it=()=>list[cur];
    function paintInfo(){
      const x=it();const li=x.link&&identifyLink(x.link);
      info.replaceChildren(
        h('button',{class:'fd-vuser',onclick:()=>{closeV(true);openProfile(x.username);}},avatarEl({avatar_url:x.avatar_url,display_name:x.display_name,username:x.username}),h('span',{class:'grow'},h('b',null,x.display_name||'@'+x.username),h('em',null,'@'+x.username)),h('span',{class:'fd-vgo'},'Profile')),
        x.caption?h('p',{class:'fd-vcap'},x.caption):null,
        li?h('button',{class:'fd-vlink',onclick:()=>openExternal(li.url)},linkChip(li),h('span',null,li.key==='link'?li.host:'Open on '+li.name)):null);
      top.querySelector('.fd-vcount').textContent=(cur+1)+' of '+list.length;
    }
    /* show photo n: negative first, then it develops */
    async function show(n,fromRect){
      const my=++token;cur=n;paintInfo();photo.replaceChildren();photo.style.cssText='';dev.classList.remove('on');
      const x=it(),url=publicUrl('gallery',x.path);
      let img;try{img=await Film.load(url);}catch(e){if(my===token)toast('Could not load that photo','err');return;}
      if(my!==token)return;
      const W=stage.clientWidth,H=stage.clientHeight,ir=img.naturalWidth/img.naturalHeight;
      let cw=W,ch=W/ir;if(ch>H){ch=H;cw=H*ir;}
      photo.style.width=cw+'px';photo.style.height=ch+'px';
      const orig=h('img',{class:'fd-orig',src:url,alt:x.caption||'',draggable:'false'});
      const neg=document.createElement('canvas');neg.className='fd-vneg';
      const longSide=Math.min(900,Math.max(img.naturalWidth,img.naturalHeight));const k=longSide/Math.max(img.naturalWidth,img.naturalHeight);
      Film.negative(neg,img,Math.round(img.naturalWidth*k),Math.round(img.naturalHeight*k),false);
      photo.append(orig,neg);
      const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
      let intro=Promise.resolve();
      if(fromRect&&!reduce){
        const sr=stage.getBoundingClientRect(),pr=photo.getBoundingClientRect();
        const s=Math.max(fromRect.width/cw,fromRect.height/ch);
        const dx=fromRect.left+fromRect.width/2-(pr.left+pr.width/2),dy=fromRect.top+fromRect.height/2-(pr.top+pr.height/2);
        const ix=Math.max(0,(cw-fromRect.width/s)/2),iy=Math.max(0,(ch-fromRect.height/s)/2);
        const a=photo.animate([{transform:`translate(${dx}px,${dy}px) scale(${s})`,clipPath:`inset(${iy}px ${ix}px)`},{transform:'none',clipPath:'inset(0px 0px)'}],{duration:460,easing:'cubic-bezier(.2,.8,.2,1)'});
        intro=a.finished.catch(()=>{});
      }
      await intro;if(my!==token)return;
      if(reduce){neg.style.opacity='0';return;}
      /* the development: the orange cast and inverted tones clear to the real colours */
      dev.classList.add('on');
      orig.animate([{filter:'sepia(1) saturate(.35) brightness(.55) contrast(.8) blur(2px)'},{filter:'sepia(.5) saturate(.7) brightness(.85) contrast(.95) blur(.5px)',offset:.55},{filter:'none'}],{duration:2200,easing:'ease-in-out',fill:'both'});
      const an=neg.animate([{opacity:1,filter:'blur(0px)'},{opacity:.7,filter:'blur(1px) brightness(1.15)',offset:.35},{opacity:0,filter:'blur(3px) brightness(1.4)'}],{duration:2200,easing:'ease-in-out',fill:'both'});
      an.finished.then(()=>{if(my===token){dev.classList.remove('on');}}).catch(()=>{});
    }
    function closeV(skipBack){
      if(!viewer)return;viewer=null;token++;
      const finish=()=>{ov.remove();};
      const fr=!skipBack&&frameBtn&&document.contains(frameBtn)&&list===items&&cur===i?frameBtn.getBoundingClientRect():null;
      ov.classList.remove('in');setTimeout(finish,260);
    }
    /* swipe left/right for the next photo, drag down to close */
    stage.style.touchAction='none';
    stage.addEventListener('pointerdown',e=>{stage.setPointerCapture(e.pointerId);sw={x:e.clientX,y:e.clientY,t:performance.now(),dir:null,dx:0,dy:0};});
    stage.addEventListener('pointermove',e=>{if(!sw)return;const dx=e.clientX-sw.x,dy=e.clientY-sw.y;if(!sw.dir&&(Math.abs(dx)>8||Math.abs(dy)>8))sw.dir=Math.abs(dx)>Math.abs(dy)?'h':'v';sw.dx=dx;sw.dy=dy;
      if(sw.dir==='h')photo.style.transform=`translateX(${dx}px)`;else if(sw.dir==='v'&&dy>0){photo.style.transform=`translateY(${dy}px) scale(${Math.max(.7,1-dy/900)})`;ov.style.background=`rgba(8,14,12,${Math.max(.2,1-dy/420)})`;}});
    const up=()=>{if(!sw)return;const g=sw;sw=null;ov.style.background='';
      if(g.dir==='h'&&(Math.abs(g.dx)>70||(Math.abs(g.dx)>35&&performance.now()-g.t<250))){const n=cur+(g.dx<0?1:-1);if(n>=0&&n<list.length){photo.animate([{transform:photo.style.transform||'none'},{transform:`translateX(${g.dx<0?-110:110}%)`,opacity:0}],{duration:200,fill:'forwards'}).finished.then(()=>show(n)).catch(()=>show(n));return;}}
      if(g.dir==='v'&&g.dy>110){closeV();return;}
      photo.style.transform='';};
    stage.addEventListener('pointerup',up);stage.addEventListener('pointercancel',up);
    const fromRect=frameBtn&&document.contains(frameBtn)?frameBtn.getBoundingClientRect():null;
    show(cur,fromRect);
  }

  /* ---------------- profile: photos as negatives, bio, social handles, follow ---------------- */
  async function openProfile(username){
    if(!username)return;
    const v=h('div',{class:'fd-prof'});el.append(v);requestAnimationFrame(()=>v.classList.add('in'));
    const close=()=>{v.classList.remove('in');setTimeout(()=>v.remove(),240);const k=stack.indexOf(close);if(k>=0)stack.splice(k,1);};
    stack.push(close);
    const head=(title,right)=>h('div',{class:'fd-ptop'},h('button',{class:'fd-hbtn',onclick:close,'aria-label':'Back'},icon('back')),h('b',null,title),right||h('span',{style:{width:'38px'}}));
    v.append(head('@'+username),h('div',{class:'fd-pbody'},spinner()));
    let d;try{const r=await sb.rpc('film_profile',{p_username:username});if(r.error)throw r.error;d=r.data;if(!d)throw new Error('This profile could not be found.');}
    catch(e){v.replaceChildren(head('@'+username),h('div',{class:'fd-pbody'},empty('Could not open this profile',errMsg(e))));return;}
    const photos=(d.photos||[]).map(p=>({id:p.id,path:p.path,caption:p.caption,link:p.link,username:d.username,display_name:d.display_name,avatar_url:d.avatar_url}));
    const soc=socialList(d.socials);
    const follow=d.is_me?h('button',{class:'btn small',onclick:()=>ctx.open('account',{edit:1})},'Edit profile'):h('button',{class:'btn small'+(d.is_following?'':' primary')},d.is_following?'Following':'Follow');
    if(!d.is_me)follow.onclick=()=>{if(!Auth.user){toast('Sign in to follow','err');ctx.open('account',{mode:'signin'});return;}guard(follow,async()=>{const r=d.is_following?await sb.from('follows').delete().eq('follower_id',Auth.user.id).eq('followee_id',d.id):await sb.from('follows').insert({follower_id:Auth.user.id,followee_id:d.id});if(r.error)throw r.error;d.is_following=!d.is_following;d.followers+=d.is_following?1:-1;follow.textContent=d.is_following?'Following':'Follow';follow.classList.toggle('primary',!d.is_following);cnt.textContent=d.followers+' followers · '+d.following+' following';});};
    const cnt=h('span',{class:'fd-pcnt'},d.followers+' followers · '+d.following+' following');
    const grid=h('div',{class:'fd-pgrid'});
    const pio='IntersectionObserver' in window?new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){pio.unobserve(e.target);const t=e.target;Film.load(publicUrl('gallery',t._p.path)).then(img=>{Film.negative(t._cv,img,200,260,true);t.classList.add('on');}).catch(()=>t.classList.add('bad'));}}),{root:v.querySelector?v:null,rootMargin:'600px'}):null;
    photos.forEach((p,k)=>{const cv=h('canvas',{class:'fd-neg',width:200,height:260});const t=h('button',{class:'fd-ptile','aria-label':p.caption||'Photo',onclick:()=>openViewer(k,t,photos)},cv);t._p=p;t._cv=cv;grid.append(t);if(pio)pio.observe(t);else Film.load(publicUrl('gallery',p.path)).then(img=>{Film.negative(cv,img,200,260,true);t.classList.add('on');}).catch(()=>{});});
    v.replaceChildren(head('@'+d.username),h('div',{class:'fd-pbody'},
      h('div',{class:'fd-phead'},avatarEl({avatar_url:d.avatar_url,display_name:d.display_name,username:d.username},'lg'),h('b',null,d.display_name||'@'+d.username),h('em',null,'@'+d.username),cnt,d.bio?h('p',null,d.bio):null,
        soc.length?h('div',{class:'fd-psoc'},soc.map(x=>h('button',{class:'fd-chip',style:{background:x.bg,color:x.dark?'#111':'#fff'},onclick:()=>openExternal(x.url)},x.label))):null,follow),
      photos.length?grid:h('p',{class:'muted',style:{textAlign:'center',padding:'24px'}},'No photos on the film yet.')));
  }

  /* ---------------- start ---------------- */
  const it0=ctx.intent||{};ctx.intent=null;
  loadMore(true);
  if(it0.me&&Auth.user&&Auth.profile)setTimeout(()=>openProfile(Auth.profile.username),50);
  else if(it0.profile)setTimeout(()=>openProfile(it0.profile),50);
  live(()=>{loadMore(true);});
  window.addEventListener('online',()=>{if(failed&&alive){failed=false;loadMore();}});
},unmount(){}});
