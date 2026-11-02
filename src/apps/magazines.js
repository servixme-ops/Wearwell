/* ---------- MAGAZINES app: make your own Lukks magazine, publish it, read and enjoy other people's ---------- */
defApp({id:'mags',name:'Magazines',bg:'linear-gradient(#ff7a3d,#d81bff)',
glyph:()=>`<svg viewBox="0 0 60 60"><rect x="15" y="9" width="30" height="42" rx="3" fill="#fff"/><rect x="20" y="15" width="20" height="3.5" rx="1.7" fill="#d81bff"/><rect x="20" y="23" width="20" height="14" rx="2" fill="#ffb38a"/><rect x="20" y="41" width="13" height="3" rx="1.5" fill="#bbb"/><path d="M46 38v12M40 44h12" stroke="#fff" stroke-width="4" stroke-linecap="round"/></svg>`,
mount(el,ctx,live){
  const root=h('div',{class:'msg-root mg-root'});el.append(root);
  const stack=[];let tab=Local.get('mgTab','discover'),alive=true;
  const needAuth=()=>{if(Auth.user)return true;toast('Sign in to do that','err');ctx.open('account',{mode:'signin'});return false;};
  const coverUrl=m=>publicUrl('looks',m.cover_path);
  const myName=()=>(Auth.profile&&(Auth.profile.display_name||Auth.profile.username))||'';
  ctx.onBack=()=>{if(stack.length){const f=stack.pop();f();return true;}return false;};
  const barFor=(title,back,right)=>appBar({title,onBack:back,backLabel:'Back',right});
  const uid=()=>uuid();
  const shareUrl=(u,t)=>{if(navigator.share)navigator.share({title:t,url:u}).catch(()=>{});else copyText(u).then(()=>toast('Link copied'));};

  /* ---------------- home ---------------- */
  async function home(){
    stack.length=0;const mine=[],body=appBody();
    root.replaceChildren(barFor('Magazines',ctx.close),body);
    body.append(h('div',{class:'pad stack'},
      h('button',{class:'btn primary block mg-create',onclick:startSheet},icon('plus'),'Create Magazine'),
      h('div',{class:'pill-tabs'},[['discover','Discover'],['mine','Mine'],['saved','Saved']].map(t=>h('button',{class:tab===t[0]?'on':'',onclick:()=>{tab=t[0];Local.set('mgTab',tab);home();}},t[1])))));
    const host=h('div',{class:'pad'});body.append(host);host.append(spinner());
    try{
      if(tab==='discover'){const r=await sb.rpc('mags_feed',{p_limit:60});host.replaceChildren(grid(r.data||[],'No magazines yet','Be the first. Tap Create Magazine to make one.'));}
      else if(tab==='saved'){
        if(!Auth.user){host.replaceChildren(gate(ctx,'Sign in to see the magazines you saved.'));return;}
        const r=await sb.rpc('mags_feed',{p_limit:60,p_saved:true});host.replaceChildren(grid(r.data||[],'Nothing saved yet','Tap the bookmark in any magazine to keep it here.'));
      }else{
        const drafts=await MagDB.list();host.replaceChildren();
        if(drafts.length){host.append(h('h3',{class:'lx-h3'},'Drafts'),h('div',{class:'mg-grid'},drafts.map(d=>draftCard(d))));}
        if(Auth.user&&Auth.profile){const r=await sb.rpc('mags_feed',{p_limit:60,p_user:Auth.profile.username});const ls=r.data||[];
          if(ls.length)host.append(h('h3',{class:'lx-h3'},'Published'),grid(ls));}
        if(!host.children.length)host.append(empty('No magazines yet','Create one and it shows up here.'));
      }
    }catch(e){host.replaceChildren(empty('Could not load',errMsg(e),h('button',{class:'btn',onclick:home},'Try again')));}
  }
  function grid(list,t,m){
    if(!list.length)return empty(t||'Nothing here',m);
    return h('div',{class:'mg-grid'},list.map(m=>h('button',{class:'mg-card',onclick:()=>openRead(m.id)},
      h('img',{src:coverUrl(m),alt:m.title,loading:'lazy'}),h('b',null,m.title),h('span',null,'by '+(m.display_name||'@'+m.username)),h('em',null,'♥ '+m.likes+' · '+m.page_count+' pages'))));
  }
  function draftCard(d){
    const cv=h('canvas',{width:300,height:400,class:'mg-dthumb'});
    MagArt.renderCover(d).then(c=>{const g=cv.getContext('2d');g.drawImage(c,0,0,300,400);}).catch(()=>{});
    return h('button',{class:'mg-card',onclick:()=>edit(d)},cv,h('b',null,d.title||'Untitled'),h('span',null,'Draft · '+(d.pages||[]).length+' pages'));
  }

  /* ---------------- start ---------------- */
  function startSheet(){
    sheet('Choose how to start',(b,close)=>{
      const opt=(emoji,t,s,fn)=>h('button',{class:'mg-opt',onclick:()=>{close();fn();}},h('span',{class:'mg-e'},emoji),h('span',{class:'grow'},h('b',null,t),h('em',null,s)),icon('chevR'));
      b.append(h('div',{class:'stack pad'},
        opt('\u{1F4D4}','Style Diary','Share your outfits, memories and personal style.',()=>newDraft('diary')),
        opt('\u{1F457}','Lookbook','Create a collection of your favourite looks.',()=>newDraft('lookbook')),
        opt('✨','Blank Magazine','Start fresh and build your own.',()=>newDraft('blank')),
        h('div',{class:'mg-or'},'or'),
        opt('\u{1F4E5}','Import your own design','Upload a PDF or pictures you made in Canva, Photoshop or anywhere.',importFlow)));
    });
  }
  async function newDraft(kind){
    const d={id:uid(),kind,title:'',byname:myName(),font:'classic',cover:{photo:null,layout:0},pages:[],updated:Date.now()};
    if(kind==='diary')d.pages.push({type:'story',title:'Introduction',text:'',layout:0});
    if(kind==='lookbook')d.pages.push({type:'look',photos:[],look:{name:'',details:'',brand:'',link:'',tags:[]},layout:0});
    await MagDB.put(d);edit(d,true);
  }
  async function importFlow(){
    const picked=await new Promise(res=>{const i=h('input',{type:'file',accept:'application/pdf,image/jpeg,image/png,image/webp',multiple:true,style:{display:'none'}});window.__picking=true;
      i.addEventListener('change',()=>{setTimeout(()=>{window.__picking=false;},1500);res(Array.from(i.files||[]));i.remove();});i.addEventListener('cancel',()=>{window.__picking=false;res([]);i.remove();});document.body.appendChild(i);i.click();});
    if(!picked.length)return;
    const note=h('p',{class:'muted',style:{textAlign:'center'}},'Preparing your pages…');
    const sh=sheet('Importing',b=>b.append(h('div',{class:'stack pad'},spinner(),note)));
    try{
      let blobs=[];
      for(const f of picked){
        if(f.type==='application/pdf'){note.textContent='Reading '+f.name+'…';blobs.push(...await pdfToBlobs(f,40-blobs.length,(i,n)=>{note.textContent='Reading page '+i+' of '+n+'…';}));}
        else{const pr=await prepareImage(f,{max:1800,maxMB:25});blobs.push(pr.blob);}
        if(blobs.length>=40)break;
      }
      if(!blobs.length)throw new Error('No pages found in those files.');
      blobs=blobs.slice(0,40);
      const d={id:uid(),kind:'import',title:(picked[0].name||'').replace(/\.[^.]+$/,'').slice(0,40)||'My magazine',byname:myName(),font:'classic',cover:{photo:blobs[0],layout:0},pages:blobs.slice(1).map(b=>({type:'img',photos:[b],layout:0})),updated:Date.now()};
      await MagDB.put(d);sh.close();edit(d,true);
    }catch(e){sh.close();toast(errMsg(e),'err');}
  }

  /* ---------------- editor ---------------- */
  async function edit(d,fresh){
    stack.length=0;stack.push(()=>home());
    const save=()=>MagDB.put(d).catch(()=>{});
    const body=appBody();root.replaceChildren(barFor(d.title||'New magazine',()=>{save().then(home);}),body);
    const list=h('div',{class:'mg-pages'});
    const covCv=h('canvas',{width:300,height:400,class:'mg-dthumb big'});
    const draw=async()=>{
      const c=await MagArt.renderCover(d);covCv.getContext('2d').drawImage(c,0,0,300,400);
      list.replaceChildren();
      let no=0;
      for(let i=0;i<d.pages.length;i++){const p=d.pages[i];if(p.type==='look')no++;
        const t=h('canvas',{width:90,height:120,class:'mg-pthumb'});
        MagArt.renderPage(d,Object.assign({},p,{no}),i).then(c=>t.getContext('2d').drawImage(c,0,0,90,120)).catch(()=>{});
        const lbl={photo:'Photo page',story:'Story page',look:'Look page',img:'Imported page'}[p.type];
        const sub=p.type==='story'?(p.title||''):p.type==='look'?(p.look&&p.look.name||''):p.type==='photo'?(p.caption||(p.photos||[]).length+' photo'+((p.photos||[]).length===1?'':'s')):'';
        list.append(h('div',{class:'mg-prow'},h('button',{class:'mg-pmain',onclick:()=>editPage(i)},t,h('span',{class:'grow'},h('b',null,(i+1)+'. '+lbl),h('em',null,sub||'Tap to edit'))),
          h('div',{class:'mg-pact'},
            h('button',{'aria-label':'Move up',disabled:i===0,onclick:()=>{[d.pages[i-1],d.pages[i]]=[d.pages[i],d.pages[i-1]];save();draw();}},'↑'),
            h('button',{'aria-label':'Move down',disabled:i===d.pages.length-1,onclick:()=>{[d.pages[i+1],d.pages[i]]=[d.pages[i],d.pages[i+1]];save();draw();}},'↓'),
            h('button',{'aria-label':'Remove page',onclick:async()=>{if(!await confirmBox('Remove this page?','','Remove',true))return;d.pages.splice(i,1);save();draw();}},icon('trash')))));
      }
      if(!d.pages.length)list.append(h('p',{class:'muted',style:{textAlign:'center',margin:'8px 0'}},'No pages yet. Tap Add page.'));
      list.append(h('div',{class:'mg-prow auto'},h('div',{class:'mg-pmain'},h('span',{class:'mg-pthumb cr'},'Credits'),h('span',{class:'grow'},h('b',null,'Credits page'),h('em',null,'Added automatically at the end')))));
    };
    const fontSel=h('select',{onchange:()=>{d.font=fontSel.value;save();draw();}},Object.keys(MAG_FONTS).map(k=>h('option',{value:k,selected:d.font===k},MAG_FONTS[k].label)));
    body.append(h('div',{class:'pad stack'},
      h('div',{class:'mg-covrow'},covCv,h('div',{class:'stack grow'},h('b',{class:'mg-bigt'},d.title||'Name your magazine'),h('em',{class:'muted'},MAG_KINDS[d.kind].label),
        h('button',{class:'btn small primary',onclick:()=>editCover(d,save,draw,()=>{root.querySelector('.appbar h2').textContent=d.title||'New magazine';const bt=root.querySelector('.mg-bigt');if(bt)bt.textContent=d.title||'Name your magazine';})},icon('edit'),'Edit cover'),field('Font',fontSel))),
      h('div',{class:'f-label'},'Pages'),list,
      h('button',{class:'btn block',onclick:()=>addPageSheet(d,save,draw,editPage)},icon('plus'),'Add page'),
      h('div',{class:'row-flex'},h('button',{class:'btn grow',onclick:()=>preview(d)},'Preview'),h('button',{class:'btn grow',onclick:e=>downloadDraft(d,e.currentTarget)},'Download PDF')),
      h('button',{class:'btn primary block',onclick:()=>publish(d)},'Publish to Lukks'),
      h('button',{class:'btn danger block',onclick:async()=>{if(!await confirmBox('Delete this draft?','Your pages and photos on this device will be removed.','Delete',true))return;await MagDB.del(d.id);home();}},'Delete draft')));
    await draw();
    if(fresh&&!d.title)editCover(d,save,draw,()=>{root.querySelector('.appbar h2').textContent=d.title||'New magazine';const bt=root.querySelector('.mg-bigt');if(bt)bt.textContent=d.title||'Name your magazine';});
    function editPage(i){editPageSheet(d,i,save,draw);}
  }
  function addPageSheet(d,save,draw,editPage){
    if(d.pages.length>=40){toast('A magazine can have up to 40 pages.','err');return;}
    sheet('Add a page',(b,close)=>{
      const opt=(e,t,s,mk)=>h('button',{class:'mg-opt',onclick:()=>{close();d.pages.push(mk());save();draw().then(()=>editPage(d.pages.length-1));}},h('span',{class:'mg-e'},e),h('span',{class:'grow'},h('b',null,t),h('em',null,s)),icon('chevR'));
      b.append(h('div',{class:'stack pad'},
        opt('\u{1F4F8}','Photo page','Add one or more pictures.',()=>({type:'photo',photos:[],caption:'',layout:0})),
        opt('✍️','Story page','Add a title and short text.',()=>({type:'story',title:'',text:'',layout:0})),
        opt('\u{1F457}','Look page','Add an outfit and its details.',()=>({type:'look',photos:[],look:{name:'',details:'',brand:'',link:'',tags:[]},layout:0}))));
    });
  }
  async function pickPhotos(max){
    const files=await new Promise(res=>{const i=h('input',{type:'file',accept:'image/jpeg,image/png,image/webp',multiple:max>1,style:{display:'none'}});window.__picking=true;
      i.addEventListener('change',()=>{setTimeout(()=>{window.__picking=false;},1500);res(Array.from(i.files||[]));i.remove();});i.addEventListener('cancel',()=>{window.__picking=false;res([]);i.remove();});document.body.appendChild(i);i.click();});
    const out=[];for(const f of files.slice(0,max)){try{out.push((await prepareImage(f,{max:1800,maxMB:25})).blob);}catch(e){toast(errMsg(e),'err');}}return out;
  }
  function previewCanvas(){const cv=h('canvas',{width:300,height:400,class:'mg-livecv'});return cv;}
  function liveRender(cv,fn){let n=0;return()=>{const my=++n;setTimeout(async()=>{if(my!==n)return;try{const c=await fn();if(my===n)cv.getContext('2d').drawImage(c,0,0,300,400);}catch(e){}},60);};}
  function editCover(d,save,draw,after){
    sheet('Your cover',(b,close)=>{
      const cv=previewCanvas(),rr=liveRender(cv,()=>MagArt.renderCover(d));
      const title=h('input',{type:'text',maxlength:'40',placeholder:'e.g. Lagos After Dark',value:d.title||'',oninput:()=>{d.title=title.value;save();rr();}}),
        who=h('input',{type:'text',maxlength:'40',placeholder:'Your name',value:d.byname||'',oninput:()=>{d.byname=who.value;save();rr();}}),
        lname=h('span',{class:'mg-lname'},COVER_LAYOUTS[d.cover.layout%4]);
      const step=n=>{d.cover.layout=(d.cover.layout+n+4)%4;lname.textContent=COVER_LAYOUTS[d.cover.layout];save();rr();};
      const fsel=h('select',{onchange:()=>{d.font=fsel.value;save();rr();}},Object.keys(MAG_FONTS).map(k=>h('option',{value:k,selected:d.font===k},MAG_FONTS[k].label)));
      b.append(h('div',{class:'stack pad'},h('div',{class:'mg-livewrap'},cv),
        h('div',{class:'mg-layrow'},h('button',{class:'btn small','aria-label':'Previous layout',onclick:()=>step(-1)},'←'),lname,h('button',{class:'btn small','aria-label':'Next layout',onclick:()=>step(1)},'→')),
        h('button',{class:'btn block',onclick:async()=>{const [p]=await pickPhotos(1);if(p){d.cover.photo=p;save();rr();}}},icon('image'),d.cover.photo?'Change photo':'Choose cover photo'),
        field('Magazine name',title),field('Your name',who,'Shows under the title, like "A style diary by '+(d.byname||'you')+'"'),field('Font',fsel),
        h('button',{class:'btn primary block',onclick:()=>{if(!d.title.trim()){toast('Give your magazine a name.','err');return;}close();}},'Done')));
      rr();
    },{onClose:()=>{save();draw();after&&after();}});
  }
  function editPageSheet(d,i,save,draw){
    const p=d.pages[i];if(!p)return;
    sheet({photo:'Photo page',story:'Story page',look:'Look page',img:'Imported page'}[p.type],(b,close)=>{
      const cv=previewCanvas();
      const noOf=()=>d.pages.slice(0,i+1).filter(x=>x.type==='look').length;
      const rr=liveRender(cv,()=>MagArt.renderPage(d,Object.assign({},p,{no:noOf()}),i));
      const lname=h('span',{class:'mg-lname'},MagArt.layoutName(p)||'Page');
      const upd=()=>{lname.textContent=MagArt.layoutName(p)||'Page';save();rr();};
      const step=n=>{const k=MagArt.nLayouts(p,d);p.layout=((p.layout||0)+n+k)%k;upd();};
      const thumbs=h('div',{class:'mg-thumbs'});
      const max=p.type==='photo'?6:1;
      const drawThumbs=()=>{thumbs.replaceChildren(...(p.photos||[]).map((bl,k)=>{const u=URL.createObjectURL(bl);return h('div',{class:'mg-th'},h('img',{src:u,alt:''}),h('button',{'aria-label':'Remove photo',onclick:()=>{p.photos.splice(k,1);drawThumbs();upd();}},icon('close')));}),
        (p.photos||[]).length<max?h('button',{class:'mg-th add',onclick:async()=>{const room=max-(p.photos||[]).length;const got=await pickPhotos(room);if(got.length){p.photos=(p.photos||[]).concat(got);drawThumbs();upd();}}},icon('plus')):h('span'));};
      p.photos=p.photos||[];
      const L=p.look=p.look||{};
      const inp=(ph,val,fn,type,ml)=>h('input',{type:type||'text',placeholder:ph,maxlength:String(ml||80),value:val||'',oninput:e=>{fn(e.target.value);upd();}});
      const fields=[];
      if(p.type==='photo')fields.push(field('Caption (optional)',inp('A short caption',p.caption,v=>p.caption=v,'text',70)));
      if(p.type==='story'){fields.push(field('Title',inp('Give it a title',p.title,v=>p.title=v,'text',80)));
        const ta=h('textarea',{maxlength:'900',rows:'6',placeholder:'Write your story…',oninput:e=>{p.text=e.target.value;upd();}});ta.value=p.text||'';fields.push(field('Story',ta));}
      if(p.type==='look'){
        fields.push(field('Look name',inp('e.g. Sunday brunch',L.name,v=>L.name=v,'text',40)));
        const ta=h('textarea',{maxlength:'300',rows:'3',placeholder:'What you wore, where you went…',oninput:e=>{L.details=e.target.value;upd();}});ta.value=L.details||'';fields.push(field('Details',ta));
        fields.push(field('Brand or designer',inp('Who made it?',L.brand,v=>L.brand=v,'text',40)));
        fields.push(field('Link to the clothing item',inp('https://… (optional)',L.link,v=>L.link=v,'url',300)));
        fields.push(field('Tag friends or designers',inp('Lukks usernames, e.g. ada, tolu',(L.tags||[]).join(', '),v=>L.tags=v.split(/[,\s]+/).map(x=>x.replace(/^@/,'').toLowerCase().replace(/[^a-z0-9_]/g,'')).filter(Boolean).slice(0,6),'text',80),'Separate with commas. Tags appear in the credits.'));
      }
      b.append(h('div',{class:'stack pad'},h('div',{class:'mg-livewrap'},cv),
        p.type!=='img'?h('div',{class:'mg-layrow'},h('button',{class:'btn small','aria-label':'Previous layout',onclick:()=>step(-1)},'←'),lname,h('button',{class:'btn small','aria-label':'Next layout',onclick:()=>step(1)},'→')):null,
        p.type!=='story'&&p.type!=='img'?h('div',null,h('div',{class:'f-label'},p.type==='look'?'Photo of the look':'Photos'),thumbs):null,
        ...fields,
        h('button',{class:'btn primary block',onclick:close},'Done')));
      drawThumbs();rr();
    },{onClose:()=>{save();draw();}});
  }

  /* ---------------- preview / flip ---------------- */
  function flipper(pages,onPage){
    let i=0,busy=false;const stage=h('div',{class:'mg-stage'}),ind=h('span',{class:'mg-ind'});
    const place=n=>{stage.replaceChildren(pages[n]);pages[n].className='mg-pg';ind.textContent=(n===0?'Cover':(n+1)+' / '+pages.length);onPage&&onPage(n);};
    const go=dir=>{
      const n=i+dir;if(busy||n<0||n>=pages.length)return;busy=true;
      const cur=pages[i],nxt=pages[n];nxt.className='mg-pg under';stage.insertBefore(nxt,cur);
      cur.style.transformOrigin=dir>0?'left center':'right center';cur.classList.add('flipping');
      requestAnimationFrame(()=>{cur.style.transform=`perspective(1400px) rotateY(${dir>0?-105:105}deg)`;cur.style.opacity='.0';});
      setTimeout(()=>{cur.className='mg-pg';cur.style.cssText='';nxt.className='mg-pg';i=n;stage.replaceChildren(nxt);ind.textContent=(n===0?'Cover':(n+1)+' / '+pages.length);busy=false;onPage&&onPage(n);},520);
    };
    let sx=null;stage.addEventListener('pointerdown',e=>{sx=e.clientX;});stage.addEventListener('pointerup',e=>{if(sx==null)return;const dx=e.clientX-sx;sx=null;if(dx<-35)go(1);else if(dx>35)go(-1);else go(e.clientX>stage.getBoundingClientRect().left+stage.offsetWidth/2?1:-1);});
    place(0);
    const prev=h('button',{class:'btn small','aria-label':'Previous page',onclick:()=>go(-1)},'←'),next=h('button',{class:'btn small','aria-label':'Next page',onclick:()=>go(1)},'→');
    return{el:h('div',{class:'mg-flip'},stage,h('div',{class:'mg-flipbar'},prev,ind,next)),go,index:()=>i};
  }
  async function preview(d){
    const sh=sheet('Preview',b=>b.append(h('div',{class:'stack pad'},spinner('Building your pages…'))),{});
    try{
      const cs=await MagArt.renderAll(d);sh.close();
      stack.push(()=>edit(d));
      const f=flipper(cs);root.replaceChildren(barFor('Preview',()=>{stack.pop();edit(d);}),appBody(h('div',{class:'pad stack'},f.el,
        h('p',{class:'muted',style:{textAlign:'center',margin:0}},'Swipe or tap the page to flip it.'),
        h('div',{class:'row-flex'},h('button',{class:'btn grow',onclick:e=>downloadDraft(d,e.currentTarget)},'Download PDF'),h('button',{class:'btn primary grow',onclick:()=>publish(d)},'Publish')))));
    }catch(e){sh.close();toast(errMsg(e),'err');}
  }
  function validate(d){
    if(!d.title.trim())return'Give your magazine a name first.';
    if(!d.cover.photo)return'Add a cover photo first.';
    for(let i=0;i<d.pages.length;i++){const p=d.pages[i];
      if((p.type==='photo'||p.type==='look')&&!(p.photos||[]).length)return'Page '+(i+1)+' needs a photo.';
      if(p.type==='story'&&!(p.title||p.text||'').trim())return'Page '+(i+1)+' is empty.';}
    return null;
  }
  async function downloadDraft(d,btn){
    const bad=validate(d);if(bad){toast(bad,'err');return;}
    await guard(btn,async()=>{toast('Making your PDF…');const cs=await MagArt.renderAll(d);const pdf=await makePdf(cs);download(pdf,(d.title.trim()||'magazine').replace(/[^\w\- ]+/g,'').replace(/\s+/g,'-')+'.pdf');toast('Downloaded','ok');});
  }
  async function publish(d){
    const bad=validate(d);if(bad){toast(bad,'err');return;}
    if(!Auth.user){toast('Sign in to publish','err');ctx.open('account',{mode:'signin'});return;}
    if(!await confirmBox('Publish to Lukks?','Anyone can read, like and comment on your magazine. You can delete it later from Mine.','Publish'))return;
    const sh=sheet('Publishing',b=>b.append(h('div',{class:'stack pad'},spinner(),h('p',{id:'mgPubNote',class:'muted',style:{textAlign:'center'}},'Getting your pages ready…'))));
    const up=[];let magId=null;
    try{
      const note=document.getElementById('mgPubNote'),cs=await MagArt.renderAll(d);
      const paths=[];for(let i=0;i<cs.length;i++){if(note)note.textContent='Uploading page '+(i+1)+' of '+cs.length+'…';const bl=await canvasBlob(cs[i],.86);const pth=await uploadFile('looks',bl,'jpg','image/jpeg');up.push(pth);paths.push(pth);}
      const r=await sb.from('u_mags').insert({user_id:Auth.user.id,title:d.title.trim().slice(0,60),byline:MagArt.byline(d)||null,kind:d.kind,cover_path:paths[0],page_count:paths.length}).select().single();
      if(r.error)throw r.error;magId=r.data.id;
      let no=0;const rows=paths.map((pth,i)=>{const p=i>0&&i<=d.pages.length?d.pages[i-1]:null;if(p&&p.type==='look')no++;
        const meta=p&&p.type==='look'?{t:'look',name:p.look.name||'',brand:p.look.brand||'',link:safeUrl(p.look.link||'')||'',tags:p.look.tags||[]}:{t:i===0?'cover':i===paths.length-1?'credits':(p?p.type:'')};
        return{mag_id:magId,idx:i,path:pth,meta};});
      const pr=await sb.from('u_mag_pages').insert(rows);if(pr.error)throw pr.error;
      await MagDB.del(d.id);sh.close();toast('Published','ok');
      shareSheet(magId,d.title);openRead(magId);
    }catch(e){sh.close();if(magId)sb.from('u_mags').delete().eq('id',magId);up.forEach(x=>removeFile('looks',x));toast(errMsg(e),'err');}
  }
  const magLink=id=>CFG.mainSite+'?mag='+id;
  function shareSheet(id,title){
    sheet('Your magazine is live',(b,close)=>b.append(h('div',{class:'stack pad'},h('p',{class:'muted',style:{margin:0}},'Share this link so anyone can read it.'),h('div',{class:'group'},h('div',{class:'item'},h('span',{class:'grow',style:{wordBreak:'break-all'}},magLink(id)))),
      h('button',{class:'btn primary block',onclick:()=>shareUrl(magLink(id),title||'My Lukks magazine')},icon('share'),'Share link'),
      h('button',{class:'btn block',onclick:()=>copyText(magLink(id)).then(()=>toast('Link copied','ok'))},icon('copy'),'Copy link'))));
  }

  /* ---------------- reader ---------------- */
  async function openRead(id){
    stack.push(()=>home());
    root.replaceChildren(barFor('Magazine',()=>{const f=stack.pop();f&&f();}),spinner());
    let m;try{const r=await sb.rpc('mag_get',{p_id:id});if(r.error)throw r.error;m=r.data;if(!m)throw new Error('This magazine is no longer available.');}
    catch(e){root.replaceChildren(barFor('Magazine',()=>{stack.pop();home();}),appBody(empty('Could not open it',errMsg(e),h('button',{class:'btn',onclick:()=>{stack.pop();openRead(id);}},'Try again'))));return;}
    const imgs=m.pages.map(pg=>{const im=h('img',{src:publicUrl('looks',pg.path),alt:m.title+' page '+(pg.idx+1),draggable:'false'});return im;});
    const likeBtn=h('button',{class:'mg-act','aria-label':'Like this page'}),saveBtn=h('button',{class:'mg-act','aria-label':'Save magazine'}),comBtn=h('button',{class:'mg-act','aria-label':'Comments'});
    const chips=h('div',{class:'mg-chips'});let cur=0;
    const paint=()=>{const pg=m.pages[cur];likeBtn.classList.toggle('on',!!pg.liked);likeBtn.replaceChildren(icon('heart'),h('b',null,String(pg.likes||0)));
      saveBtn.classList.toggle('on',!!m.saved);saveBtn.replaceChildren(icon('bookmark'),h('b',null,m.saved?'Saved':'Save'));
      comBtn.replaceChildren(icon('chat'),h('b',null,String(m.comments.length)));
      chips.replaceChildren();const mt=pg.meta||{};
      if(mt.t==='look'){if(mt.name)chips.append(h('span',{class:'mg-chip plain'},mt.name));if(mt.brand)chips.append(h('span',{class:'mg-chip plain'},mt.brand));
        const u=mt.link&&safeUrl(mt.link);if(u)chips.append(h('button',{class:'mg-chip',onclick:()=>openExternal(u)},'Shop this look ↗'));
        (mt.tags||[]).forEach(t=>chips.append(h('button',{class:'mg-chip',onclick:()=>ctx.open('lukks',{profile:t})},'@'+t)));}};
    const f=flipper(imgs,n=>{cur=n;paint();});
    likeBtn.onclick=()=>{if(!needAuth())return;const pg=m.pages[cur];guard(likeBtn,async()=>{const r=pg.liked?await sb.from('u_mag_likes').delete().eq('page_id',pg.id).eq('user_id',Auth.user.id):await sb.from('u_mag_likes').insert({page_id:pg.id,user_id:Auth.user.id});if(r.error)throw r.error;pg.liked=!pg.liked;pg.likes=Math.max(0,(pg.likes||0)+(pg.liked?1:-1));paint();});};
    saveBtn.onclick=()=>{if(!needAuth())return;guard(saveBtn,async()=>{const r=m.saved?await sb.from('u_mag_saves').delete().eq('mag_id',m.id).eq('user_id',Auth.user.id):await sb.from('u_mag_saves').insert({mag_id:m.id,user_id:Auth.user.id});if(r.error)throw r.error;m.saved=!m.saved;paint();toast(m.saved?'Saved to your magazines':'Removed from saved','ok');});};
    comBtn.onclick=()=>comments(m,paint,()=>cur);
    const follow=h('button',{class:'btn small'+(m.following?'':' primary')},m.following?'Following':'Follow');
    follow.onclick=()=>{if(!needAuth())return;guard(follow,async()=>{const r=m.following?await sb.from('follows').delete().eq('follower_id',Auth.user.id).eq('followee_id',m.creator_id):await sb.from('follows').insert({follower_id:Auth.user.id,followee_id:m.creator_id});if(r.error)throw r.error;m.following=!m.following;follow.textContent=m.following?'Following':'Follow';follow.classList.toggle('primary',!m.following);});};
    const more=h('div',{class:'mg-more'});
    root.replaceChildren(barFor(m.title,()=>{const b=stack.pop();b&&b();},h('button',{class:'icon-btn','aria-label':'Share',onclick:()=>shareUrl(magLink(m.id),m.title)},icon('share'))),appBody(h('div',{class:'pad stack'},
      h('div',{class:'mg-who'},h('button',{class:'mg-whob',onclick:()=>ctx.open('lukks',{profile:m.username})},avatarEl({avatar_url:m.avatar_url,display_name:m.display_name,username:m.username}),h('span',{class:'grow'},h('b',null,m.display_name||'@'+m.username),h('em',null,m.byline||''))),m.mine?null:follow),
      f.el,chips,
      h('div',{class:'mg-acts'},likeBtn,comBtn,saveBtn,h('button',{class:'mg-act',onclick:e=>guard(e.currentTarget,async()=>{toast('Making your PDF…');const bls=await Promise.all(imgs.map(im=>fetch(im.src).then(r=>r.blob())));const cvs=[];for(const bl of bls){const bm=await loadBitmap(bl);const c=document.createElement('canvas');c.width=bm.width;c.height=bm.height;c.getContext('2d').drawImage(bm,0,0);cvs.push(c);}download(await makePdf(cvs),m.title.replace(/[^\w\- ]+/g,'').replace(/\s+/g,'-')+'.pdf');toast('Downloaded','ok');})},icon('copy'),h('b',null,'PDF'))),
      m.mine?h('button',{class:'btn danger block',onclick:async()=>{if(!await confirmBox('Delete this magazine?','It will be removed for everyone.','Delete',true))return;const r=await sb.from('u_mags').delete().eq('id',m.id);if(r.error){toast(errMsg(r.error),'err');return;}m.pages.forEach(p=>removeFile('looks',p.path));toast('Deleted');stack.pop();home();}},'Delete magazine'):null,
      h('h3',{class:'lx-h3'},'More magazines'),more)));
    paint();
    try{const r=await sb.rpc('mags_feed',{p_limit:12});let ls=(r.data||[]).filter(x=>x.id!==m.id);ls.sort((a,b)=>(b.kind===m.kind)-(a.kind===m.kind));more.replaceChildren(ls.length?grid(ls.slice(0,6)):h('p',{class:'muted'},'No other magazines yet.'));
      more.querySelectorAll('.mg-card').forEach(c=>{const old=c.onclick;});}catch(e){}
  }
  function comments(m,paint,curIdx){
    sheet('Comments',(b,close)=>{
      const list=h('div',{class:'mg-clist'}),inp=h('input',{type:'text',maxlength:'500',placeholder:'Add a comment…'});
      const draw=()=>{list.replaceChildren(...(m.comments.length?m.comments.map(c=>h('div',{class:'mg-c'},avatarEl({avatar_url:c.avatar_url,display_name:c.display_name,username:c.username}),h('span',{class:'grow'},h('b',null,c.display_name||'@'+c.username,c.page_idx!=null&&c.page_idx>0?h('i',null,' · page '+(c.page_idx+1)):null),h('em',null,c.body)),
        c.mine||m.mine?h('button',{class:'icon-btn','aria-label':'Delete comment',onclick:async()=>{const r=await sb.from('u_mag_comments').delete().eq('id',c.id);if(r.error){toast(errMsg(r.error),'err');return;}m.comments=m.comments.filter(x=>x.id!==c.id);draw();paint();}},icon('trash')):null)):[h('p',{class:'muted',style:{textAlign:'center'}},'No comments yet. Say something nice.')]));};
      draw();
      const send=h('button',{class:'btn primary',onclick:e=>{if(!Auth.user){toast('Sign in to comment','err');ctx.open('account',{mode:'signin'});return;}const t=inp.value.trim();if(!t)return;guard(e.currentTarget,async()=>{const r=await sb.from('u_mag_comments').insert({mag_id:m.id,user_id:Auth.user.id,body:t,page_idx:curIdx()}).select().single();if(r.error)throw r.error;
        m.comments.push({id:r.data.id,body:t,created_at:r.data.created_at,page_idx:curIdx(),username:Auth.profile&&Auth.profile.username,display_name:Auth.profile&&Auth.profile.display_name,avatar_url:Auth.profile&&Auth.profile.avatar_url,mine:true});inp.value='';draw();paint();});}},icon('send'));
      b.append(h('div',{class:'stack pad'},list,h('div',{class:'row-flex'},inp,send)));
    });
  }

  /* ---------------- boot ---------------- */
  const it=ctx.intent||{};ctx.intent=null;
  if(it.mag)openRead(it.mag);else home();
  live(()=>{if(!stack.length)home();});
},unmount(){}});
