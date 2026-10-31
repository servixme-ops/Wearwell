/* ---------- PHOTOS: albums, community uploads, likes, reports ---------- */
defApp({id:'photos',name:'Photos',bg:'#fff',dock:true,glyph:()=>`<svg viewBox="0 0 60 60"><g transform="translate(30 30)" style="mix-blend-mode:multiply">${['#ff9500','#ffcc00','#34c759','#00c7be','#0a84ff','#af52de','#ff2d55','#ff3b30'].map((c,i)=>`<ellipse cx="0" cy="-10" rx="7" ry="11" fill="${c}" opacity=".85" transform="rotate(${i*45})"/>`).join('')}</g></svg>`,
mount(el,ctx,live){
  let albums=[],view={t:'albums'},counts={},covers={};
  const body=h('div',{class:'app-body'});let bar=h('div');el.append(bar,body);
  const urls=[];const objUrl=b=>{const u=URL.createObjectURL(b);urls.push(u);return u;};
  async function loadAlbums(){
    body.replaceChildren(spinner());
    albums=await Contrib.albums();
    counts={};covers={};
    if(Auth.user&&sb){try{const r=await sb.from('photos').select('album_slug,storage_path').eq('user_id',Auth.user.id).order('created_at',{ascending:false});(r.data||[]).forEach(x=>{counts[x.album_slug]=(counts[x.album_slug]||0)+1;if(!covers[x.album_slug])covers[x.album_slug]=publicUrl('gallery',x.storage_path);});}catch(e){}}
    try{const l=await LocalGallery.list();l.forEach(x=>{counts[x.album]=(counts[x.album]||0)+1;if(!covers[x.album])covers[x.album]=objUrl(x.blob);});}catch(e){}
    drawAlbums();
    if(ctx.intent){const i=ctx.intent;ctx.intent=null;if(i.album){const a=albums.find(x=>x.slug===i.album);if(a)openAlbum(a);}}
  }
  function top(title,back,right){bar.replaceWith(bar=appBar({title,onBack:back,backLabel:'Back',right}));}
  function drawAlbums(){
    view={t:'albums'};const mineF=a=>Auth.user&&a.owner_id&&a.owner_id===Auth.user.id&&a.slug!=='randoms';const hasMine=albums.some(mineF);
    top('Photos',()=>{if(sel){sel=null;drawAlbums();}else ctx.close();},sel?null:h('button',{class:'icon-btn','aria-label':'Add a photo',onclick:()=>addPhoto()},icon('plus')));
    body.replaceChildren();
    const g=h('div',{class:'album-grid'});
    albums.forEach(a=>{const ab=h('button',{class:'album'+(sel&&sel.has(a.slug)?' picked':'')+(sel&&!mineF(a)?' dim':''),onclick:()=>{if(!sel)return openAlbum(a);if(!mineF(a))return toast(a.slug==='randoms'?'Randoms can’t be deleted':'Only folders you made can be deleted');if(sel.has(a.slug))sel.delete(a.slug);else sel.add(a.slug);drawAlbums();}},
      h('span',{class:'album-img empty'},covers[a.slug]?h('img',{src:covers[a.slug],alt:'',loading:'lazy'}):icon('image')),
      h('b',null,a.title),h('em',null,counts[a.slug]?counts[a.slug]+(counts[a.slug]===1?' photo':' photos'):'Empty'));
      if(!sel&&mineF(a))hold(ab,()=>{sel=new Set([a.slug]);drawAlbums();});g.append(ab);});
    body.append(g);
    if(sel)body.append(selBar(sel.size,()=>{if(!sel.size)return;delFolders(albums.filter(a=>sel.has(a.slug)),drawAlbums0);}));
    if(!Auth.user)body.append(h('p',{class:'muted small-t',style:{textAlign:'center',padding:'6px 24px 24px'}},'Photos you add while signed out are kept on this device in Randoms. Sign in to save to any folder.'));
  }
  async function listAlbum(a){
    const out=[];
    if(Auth.user&&sb){const r=await sb.from('photos').select('*').eq('user_id',Auth.user.id).eq('album_slug',a.slug).order('created_at',{ascending:false}).limit(300);if(r.error)throw r.error;(r.data||[]).forEach(x=>out.push({kind:'cloud',id:x.id,path:x.storage_path,src:publicUrl('gallery',x.storage_path),caption:x.caption,t:x.created_at}));}
    const l=await LocalGallery.list();l.filter(x=>x.album===a.slug).forEach(x=>out.push({kind:'local',id:x.id,src:objUrl(x.blob),blob:x.blob,caption:x.caption,t:new Date(x.t).toISOString()}));
    return out.sort((x,y)=>String(y.t).localeCompare(String(x.t)));
  }
  /* press and hold to start selecting (signed in only) */
  function hold(el,fn){
    let t=null,x=0,y=0;el._held=false;
    const stop=()=>{clearTimeout(t);t=null;};
    el.addEventListener('pointerdown',e=>{if(!Auth.user)return;x=e.clientX;y=e.clientY;stop();t=setTimeout(()=>{t=null;el._held=true;try{getSelection().removeAllRanges();}catch(_){}try{navigator.vibrate&&navigator.vibrate(15);}catch(_){}fn();},450);});
    el.addEventListener('pointermove',e=>{if(t&&(Math.abs(e.clientX-x)>8||Math.abs(e.clientY-y)>8))stop();});
    ['pointerup','pointercancel','pointerleave'].forEach(n=>el.addEventListener(n,stop));
    el.addEventListener('contextmenu',e=>e.preventDefault());
    el.addEventListener('click',e=>{if(el._held){e.stopImmediatePropagation();e.preventDefault();el._held=false;}},true);
    return el;
  }
  let sel=null; // Set of selected ids while in select mode
  const selBar=(n,onDel,extra)=>h('div',{class:'ph-selbar'},h('button',{class:'btn small danger',disabled:!n,onclick:onDel},icon('trash'),n?'Delete ('+n+')':'Delete'),...[].concat(extra||[]).filter(Boolean),h('button',{class:'btn small',onclick:()=>{sel=null;view.t==='album'?showAlbum(view.a,view.list):drawAlbums();}},'Done'));
  function movePhotos(a,items){
    const cloud=items.filter(p=>p.kind==='cloud'),local=items.length-cloud.length;
    if(!cloud.length)return toast('Photos saved on this device can’t be moved. Sign in to save to folders.','err');
    sheet('Move to…',(b,close)=>{
      const dests=albums.filter(x=>x.slug!==a.slug);
      b.append(h('div',{class:'group',style:{margin:'8px 14px'}},dests.map(d=>h('button',{class:'item',onclick:async e=>{
        try{const r=await sb.from('photos').update({album_slug:d.slug}).in('id',cloud.map(p=>p.id));if(r.error)throw r.error;
          close();toast('Moved '+cloud.length+(cloud.length===1?' photo':' photos')+' to '+d.title+(local?' ('+local+' on-device skipped)':''),'ok');sel=null;openAlbum(a);}catch(er){toast(errMsg(er),'err');}}},h('span',{class:'grow'},h('b',null,d.title))))));
    });
  }
  async function delPhotos(a,items){
    for(const p of items){if(p.kind==='local')await LocalGallery.del(p.id);else{const r=await sb.from('photos').delete().eq('id',p.id);if(r.error)throw r.error;removeFile('gallery',p.path);}}
  }
  async function openAlbum(a){
    view={t:'album',a};top(a.title,()=>{sel=null;drawAlbums();},h('button',{class:'icon-btn','aria-label':'Add a photo',onclick:()=>addPhoto(a)},icon('plus')));
    body.replaceChildren(spinner());
    let list=[];try{list=await listAlbum(a);}catch(e){body.replaceChildren(empty('Could not load photos',errMsg(e)));return;}
    showAlbum(a,list);
  }
  /* draws instantly from the loaded list, so selecting photos never shows the loading logo */
  function showAlbum(a,list){
    const own=Auth.user&&a.owner_id&&a.owner_id===Auth.user.id;
    view={t:'album',a,list};top(a.title,()=>{sel=null;drawAlbums();},sel?null:h('button',{class:'icon-btn','aria-label':'Add a photo',onclick:()=>addPhoto(a)},icon('plus')));
    body.replaceChildren();
    if(!list.length){sel=null;body.append(h('div',{class:'empty-state'},h('span',{class:'empty-ic'},icon('image')),h('h4',null,'No photos yet'),h('p',null,'Photos you add to '+a.title+' will show up here.'),h('button',{class:'btn primary',onclick:()=>addPhoto(a)},'Add a photo')));
      if(own)body.append(h('div',{class:'ph-selbar'},h('button',{class:'btn small danger',onclick:()=>delFolders([a],()=>drawAlbums0())},icon('trash'),'Delete folder')));return;}
    const g=h('div',{class:'photo-grid'});
    list.forEach((p,i)=>{const b=h('button',{class:'ph'+(sel&&sel.has(p.id)?' picked':''),'aria-label':p.caption||'Photo',onclick:()=>{if(!sel)return viewer(a,list,i);if(sel.has(p.id))sel.delete(p.id);else sel.add(p.id);showAlbum(a,list);}},h('img',{src:p.src,alt:p.caption||'',loading:'lazy'}),sel?h('span',{class:'ph-tick'},sel.has(p.id)?icon('check'):null):null);if(!sel)hold(b,()=>{sel=new Set([p.id]);showAlbum(a,list);});g.append(b);});
    body.append(g);
    if(sel)body.append(selBar(sel.size,async()=>{if(!sel.size)return;if(!await confirmBox('Delete '+sel.size+(sel.size===1?' photo?':' photos?'),'This cannot be undone.','Delete',true))return;try{await delPhotos(a,list.filter(p=>sel.has(p.id)));toast('Deleted','ok');}catch(e){toast(errMsg(e),'err');}sel=null;openAlbum(a);},
      [h('button',{class:'btn small',disabled:!sel.size,onclick:()=>movePhotos(a,list.filter(p=>sel.has(p.id)))},'Move'),
       h('button',{class:'btn small',onclick:()=>{if(sel.size===list.length)sel.clear();else list.forEach(p=>sel.add(p.id));showAlbum(a,list);}},sel.size===list.length?'Clear':'All'),
       own?h('button',{class:'btn small danger',onclick:()=>delFolders([a],()=>drawAlbums0())},'Delete folder'):null]));
  }
  const drawAlbums0=()=>{Contrib._albums=null;sel=null;loadAlbums();};
  async function delFolders(fs,after){
    if(!await confirmBox(fs.length>1?'Delete '+fs.length+' folders?':'Delete folder "'+fs[0].title+'"?','Every photo inside will be deleted too.','Delete',true))return;
    try{for(const a of fs){const l=await listAlbum(a);await delPhotos(a,l);const r=await sb.from('gallery_albums').delete().eq('slug',a.slug);if(r.error)throw r.error;}toast('Deleted','ok');}catch(e){toast(errMsg(e),'err');}
    after&&after();
  }
  async function addPhoto(a){
    const fs=await pickFiles('image/jpeg,image/png,image/webp');if(fs.length)Contrib.sendSheet(ctx,fs,{album:a&&a.slug,done:()=>{if(view.t==='album')openAlbum(view.a);else loadAlbums();}});
  }
  function viewer(a,list,i){
    const p=list[i];
    sheet(p.caption||'Photo',(b,close)=>{
      b.append(h('img',{src:p.src,alt:p.caption||'',style:{width:'100%',borderRadius:'14px',display:'block'}}),
        h('div',{class:'row-flex',style:{marginTop:'12px',flexWrap:'wrap'}},
          h('button',{class:'btn small',onclick:async()=>{try{const bl=p.blob||await (await fetch(p.src)).blob();download(bl,'lukks-photo.jpg');}catch(e){toast('Could not save that photo','err');}}},icon('download'),'Save to device'),
          h('button',{class:'btn small danger',onclick:async()=>{if(!await confirmBox('Delete this photo?',null,'Delete',true))return;
            try{if(p.kind==='local')await LocalGallery.del(p.id);else{const r=await sb.from('photos').delete().eq('id',p.id);if(r.error)throw r.error;removeFile('gallery',p.path);}close();openAlbum(a);}catch(e){toast(errMsg(e),'err');}}},icon('trash'),'Delete')));
    });
  }
  live(()=>{if(view.t==='album')openAlbum(view.a);else loadAlbums();});
  ctx.onBack=()=>{if(view.t==='album'){drawAlbums();return true;}return false;};
  loadAlbums();
},unmount(){}});
