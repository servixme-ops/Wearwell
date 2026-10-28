/* ---------- PHOTOS: albums, community uploads, likes, reports ---------- */
defApp({id:'photos',name:'Photos',bg:'#fff',dock:true,glyph:()=>`<svg viewBox="0 0 60 60"><g transform="translate(30 30)" style="mix-blend-mode:multiply">${['#ff9500','#ffcc00','#34c759','#00c7be','#0a84ff','#af52de','#ff2d55','#ff3b30'].map((c,i)=>`<ellipse cx="0" cy="-10" rx="7" ry="11" fill="${c}" opacity=".85" transform="rotate(${i*45})"/>`).join('')}</g></svg>`,
mount(el,ctx,live){
  let albums=[],view={t:'albums'},likes=new Set(),mine=[];
  const body=h('div',{class:'app-body'});let bar=h('div');el.append(bar,body);
  const photoSrc=(p,w)=>p.storage_path?publicUrl('gallery',p.storage_path):artImage(p.art_ref,w||320);
  async function loadAlbums(){
    body.replaceChildren(spinner());
    try{const r=await sb.from('gallery_albums').select('*').order('sort');if(r.error)throw r.error;albums=r.data||[];}catch(e){albums=[];}
    if(Auth.user&&sb){const q=await sb.from('photo_likes').select('photo_id').eq('user_id',Auth.user.id);likes=new Set((q.data||[]).map(x=>x.photo_id));}
    drawAlbums();
    if(ctx.intent){const i=ctx.intent;ctx.intent=null;if(i.album){const a=albums.find(x=>x.slug===i.album);if(a)openAlbum(a);}if(i.tab==='mine')openMine();}
  }
  function top(title,back,right){bar.replaceWith(bar=appBar({title,onBack:back,backLabel:'Back',right}));}
  function drawAlbums(){
    view={t:'albums'};top('Photos',ctx.close,h('button',{class:'icon-btn','aria-label':'My uploads',onclick:openMine},icon('user')));
    body.replaceChildren();
    if(!albums.length){body.append(empty('No albums yet','Check back soon, or check your connection.',h('button',{class:'btn',onclick:loadAlbums},'Try again')));return;}
    const g=h('div',{class:'album-grid'});
    albums.forEach(a=>g.append(h('button',{class:'album',onclick:()=>openAlbum(a)},h('span',{class:'album-img'},h('img',{src:artImage(a.art_ref,300,300)||'',alt:'',loading:'lazy'})),h('b',null,a.title),h('em',null,a.description||''))));
    body.append(g);
  }
  async function openAlbum(a){
    view={t:'album',a};top(a.title,drawAlbums,a.slug==='community'?h('button',{class:'icon-btn','aria-label':'Add a photo',onclick:addPhoto},icon('plus')):null);
    body.replaceChildren(spinner());
    const r=await sb.from('photos').select('*').eq('album_slug',a.slug).eq('status','approved').order('created_at',{ascending:false}).limit(120);
    const list=r.data||[];body.replaceChildren();
    if(r.error){body.append(empty('Could not load photos',errMsg(r.error)));return;}
    if(!list.length){body.append(empty('Nothing here yet',a.slug==='community'?'Be the first to share. Photos appear after a quick review.':'New photos are added regularly.',a.slug==='community'?h('button',{class:'btn primary',onclick:addPhoto},'Add a photo'):null));return;}
    const g=h('div',{class:'photo-grid'});list.forEach((p,i)=>g.append(h('button',{class:'ph','aria-label':p.caption||'Photo',onclick:()=>viewer(list,i)},h('img',{src:photoSrc(p),alt:p.caption||'',loading:'lazy'}))));
    body.append(g);
  }
  async function addPhoto(){
    if(!Auth.user){toast('Sign in to share photos');ctx.open('account',{mode:'signin'});return;}
    const f=await pickFile('image/jpeg,image/png,image/webp');if(f)Contrib.sendSheet(ctx,f);
  }
  async function openMine(){
    view={t:'mine'};top('My uploads',drawAlbums,h('button',{class:'icon-btn','aria-label':'Add a photo',onclick:addPhoto},icon('plus')));
    if(!Auth.user){body.replaceChildren(gate(ctx,'Sign in to see photos and magazine submissions you have sent.'));return;}
    body.replaceChildren(spinner());
    const [p,s]=await Promise.all([sb.from('photos').select('*').eq('user_id',Auth.user.id).order('created_at',{ascending:false}),Contrib.mySubmissions()]);
    body.replaceChildren();
    body.append(h('div',{class:'sec-t'},'Community photos'));
    const list=p.data||[];
    if(!list.length)body.append(h('p',{class:'muted pad small-t'},'You have not shared any photos yet.'));
    list.forEach(x=>body.append(h('div',{class:'group',style:{marginBottom:'8px'}},h('div',{class:'item'},h('img',{class:'thumb',src:photoSrc(x,120),alt:''}),h('span',{class:'grow'},h('b',null,x.caption||'Untitled'),h('span',null,timeAgo(x.created_at)+' ago · '+x.like_count+' likes')),chip(x.status),h('button',{class:'icon-btn','aria-label':'Delete photo',onclick:async()=>{if(!await confirmBox('Delete this photo?','It will be removed for good.','Delete',true))return;const r=await sb.from('photos').delete().eq('id',x.id);if(r.error)toast(errMsg(r.error),'err');else{if(x.storage_path)removeFile('gallery',x.storage_path);openMine();}}},icon('trash'))))));
    body.append(h('div',{class:'sec-t'},'Magazine submissions ('+(s.filter(x=>x.status!=='rejected').length)+'/'+CFG.limits.magazinePhotos+')'));
    if(!s.length)body.append(h('p',{class:'muted pad small-t'},'Submit a photo from the Camera app for a chance to be featured.'));
    for(const x of s){
      const im=h('img',{class:'thumb',alt:''});signedUrl('submissions',x.storage_path).then(u=>{if(u)im.src=u;});
      body.append(h('div',{class:'group',style:{marginBottom:'8px'}},h('div',{class:'item'},im,h('span',{class:'grow'},h('b',null,x.caption),h('span',null,x.admin_note&&x.status==='rejected'?x.admin_note:timeAgo(x.created_at)+' ago')),chip(x.status),x.status==='pending'&&h('button',{class:'icon-btn','aria-label':'Withdraw submission',onclick:async()=>{if(!await confirmBox('Withdraw this submission?',null,'Withdraw',true))return;const r=await sb.from('magazine_submissions').delete().eq('id',x.id);if(r.error)toast(errMsg(r.error),'err');else{removeFile('submissions',x.storage_path);openMine();}}},icon('trash')))));
    }
  }
  function viewer(list,i){
    const p=list[i];
    sheet(p.caption||'Photo',(b,close)=>{
      const liked=likes.has(p.id);let n=p.like_count||0;
      const lk=h('button',{class:'btn small'+(liked?' primary':''),'aria-pressed':String(liked)},icon('heart'),h('span',null,String(n)));
      let on=liked;
      lk.onclick=()=>guard(lk,async()=>{
        if(!Auth.user){toast('Sign in to like photos');return;}
        if(on){const r=await sb.from('photo_likes').delete().eq('photo_id',p.id).eq('user_id',Auth.user.id);if(r.error)throw r.error;on=false;n=Math.max(0,n-1);likes.delete(p.id);}
        else{const r=await sb.from('photo_likes').insert({photo_id:p.id,user_id:Auth.user.id});if(r.error)throw r.error;on=true;n++;likes.add(p.id);}
        lk.classList.toggle('primary',on);lk.lastChild.textContent=n;
      });
      const src=photoSrc(p,900);
      b.append(h('img',{src,alt:p.caption||'',style:{width:'100%',borderRadius:'14px',display:'block'}}),
        h('div',{class:'row-flex',style:{marginTop:'12px',flexWrap:'wrap'}},lk,
          h('button',{class:'btn small',onclick:async()=>{try{const bl=await (await fetch(src)).blob();download(bl,'lukks-photo.jpg');}catch(e){toast('Could not save that photo','err');}}},icon('download'),'Save'),
          h('button',{class:'btn small danger',onclick:()=>report(p,close)},icon('flag'),'Report')));
    });
  }
  async function report(p,close){
    if(!Auth.user){toast('Sign in to report a photo');return;}
    const reason=h('textarea',{maxlength:'300',placeholder:'What is wrong with this photo?'});
    const v=await dialog({title:'Report photo',body:reason,actions:[{label:'Cancel',value:false},{label:'Report',value:true,danger:true}]});
    if(!v)return;if(reason.value.trim().length<3){toast('Please add a reason','err');return;}
    const r=await sb.from('photo_reports').insert({photo_id:p.id,user_id:Auth.user.id,reason:reason.value.trim()});
    if(r.error)toast(/duplicate/.test(r.error.message)?'You already reported this photo':errMsg(r.error),'err');else{toast('Thanks, we will take a look','ok');close();}
  }
  live(()=>{if(view.t==='mine')openMine();else loadAlbums();});
  loadAlbums();
}});
