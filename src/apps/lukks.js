/* ---------- LUKKS APP: discover style (Pinterest-style, iOS look), posts, profiles, folders, challenges and groups ---------- */
defApp({id:'lukks',name:'Lukks',bg:'#ffffff',glyph:()=>'<img src="icons/logo.png" alt="" style="width:100%;height:100%;object-fit:contain;padding:4px">',
mount(el,ctx,live){
  const CATS=[].concat(...Object.values(CFG.categories));
  const ph=Posts.ph;
  let tab=Local.get('lxTab','home'),cat=Local.get('lxCat',''),feed=null,seg='challenges',searchQ='';
  if(tab!=='home'&&tab!=='community'&&tab!=='search')tab='home';
  let saved=null;
  const stack=[];
  const it=ctx.intent||{};
  if(it.cat){const m=CATS.find(c=>c.toLowerCase()===String(it.cat).toLowerCase());if(m){cat=m;tab='home';}else{tab='search';searchQ=String(it.cat);}}
  const root=h('div',{class:'lx'});el.append(root);
  const main=h('div',{class:'lx-main'});
  const pill=h('nav',{class:'lx-nav'});
  root.append(main,pill);
  ctx.onBack=()=>{if(stack.length){popView();return true;}return false;};
  const shuffle=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
  const authed=()=>{if(Auth.user)return true;toast('Sign in to do that','err');ctx.open('account',{mode:'signin'});return false;};
  function pushView(node){const v=h('div',{class:'lx-view'},node);root.append(v);stack.push(v);return v;}
  function popView(){const v=stack.pop();if(v)v.remove();}
  const backBtn=cls=>h('button',{class:'lx-circ '+(cls||''),'aria-label':'Back',onclick:popView},icon('back'));
  const bar=(title,right)=>h('div',{class:'lx-bar'},backBtn(),h('b',null,title),h('span',{class:'lx-r'},right));
  const avatar=p=>avatarEl(p,'lx-av');
  const shareUrl=(u,t)=>{if(navigator.share)navigator.share({title:t,url:u}).catch(()=>{});else copyText(u).then(()=>toast('Link copied'));};

  /* ---------- data ---------- */
  async function loadFeed(force){
    if(feed&&!force)return;
    const r=await sb.rpc('discover_posts',{p_limit:100});
    if(r.error)throw r.error;feed=shuffle(Array.isArray(r.data)?r.data:[]);
  }
  async function loadSaved(){
    if(!Auth.user){saved={boards:[],saves:[],lukks:[]};return;}
    const [b,s]=await Promise.all([sb.from('save_boards').select('*').order('created_at',{ascending:false}),sb.from('saves').select('look_id,board_id,created_at').order('created_at',{ascending:false})]);
    const saves=s.data||[];let lukks=[];
    if(saves.length){const r=await sb.rpc('discover_posts',{p_limit:100,p_ids:saves.map(x=>x.look_id)});lukks=Array.isArray(r.data)?r.data:[];}
    saved={boards:b.data||[],saves,lukks};
  }
  const isSaved=id=>saved&&saved.saves.some(s=>s.look_id===id);

  /* ---------- shell ---------- */
  function setTab(t){tab=t;Local.set('lxTab',t);stack.splice(0).forEach(v=>v.remove());draw();}
  function drawNav(){
    const t=(id,ic,label)=>h('button',{class:tab===id?'on':'','aria-label':label,onclick:()=>setTab(id)},icon(ic),h('span',null,label));
    pill.replaceChildren(h('div',{class:'lx-pill'},t('home','home','Home'),t('community','people','Community')),
      h('button',{class:'lx-search-btn'+(tab==='search'?' on':''),'aria-label':'Search',onclick:()=>setTab('search')},icon('search')));
  }
  async function draw(){
    drawNav();
    main.replaceChildren(spinner());
    try{
      if(tab==='home'){await loadFeed();drawHome();}
      else if(tab==='community')await drawCommunity();
      else{await loadFeed();drawSearch();}
    }catch(e){main.replaceChildren(titleBar('Lukks'),empty('Could not load',errMsg(e),h('button',{class:'btn',onclick:()=>{feed=null;draw();}},'Try again')));}
  }
  const meBtn=()=>h('button',{class:'lx-me','aria-label':'My profile',onclick:()=>{if(authed())openProfile(Auth.profile&&Auth.profile.username);}},Auth.user?avatar(Auth.profile):icon('user'));
  function titleBar(t,right){
    return h('div',{class:'lx-title'},h('button',{class:'lx-circ','aria-label':'Back',onclick:ctx.close},icon('back')),h('h1',null,t),h('span',{class:'grow'}),right,meBtn());
  }
  const addBtn=()=>h('button',{class:'lx-circ plus','aria-label':'Add a lukk',onclick:()=>{if(authed())Posts.compose(null,()=>{feed=null;if(tab==='home')draw();});}},icon('plus'));
  const masonry=(list,open)=>list.length?h('div',{class:'lx-mas'},list.map(x=>h('div',{class:'lx-card'},
    h('button',{class:'lx-cardimg','aria-label':x.title,onclick:()=>open(x)},h('img',{src:ph(x.photos[0]),alt:x.title,loading:'lazy'}),x.photos.length>1?h('span',{class:'lx-multi'},icon('image'),String(x.photos.length)):null),
    h('div',{class:'lx-capr'},h('span',{class:'lx-cap'},x.title),Posts.likeBtn(x,authed))))):null;

  /* ---------- Home ---------- */
  function drawHome(){
    const chips=h('div',{class:'lx-chips'},['For You'].concat(CATS).map(c=>h('button',{class:(c==='For You'&&!cat)||c===cat?'on':'',onclick:()=>{cat=c==='For You'?'':c;Local.set('lxCat',cat);drawHome();}},c)));
    const list=feed.filter(x=>!cat||x.category===cat);
    const body=masonry(list,openPost)||empty(cat?'No lukks in '+cat+' yet':'No lukks yet',cat?'Be the first to post one.':'Tap + to share your first lukk.',h('button',{class:'btn primary',onclick:()=>{if(authed())Posts.compose(null,()=>{feed=null;draw();});}},'Add a lukk'));
    main.replaceChildren(titleBar('Home',addBtn()),chips,h('div',{class:'lx-scroll'},body));
    const sc=$('.lx-chips .on',main);sc&&sc.scrollIntoView({inline:'center',block:'nearest'});
  }

  /* ---------- Post detail ---------- */
  function openPost(x){
    const same=feed?feed.filter(y=>y.id!==x.id&&x.category&&y.category===x.category):[];
    const more=same.length?same:(feed||[]).filter(y=>y.id!==x.id).slice(0,12);
    const ext=x.external_url&&safeUrl(x.external_url);
    const saveBtn=h('button',{class:'lx-pillbtn'},icon('bookmark'),h('span',null,isSaved(x.id)?'Saved':'Save'));
    const refreshSave=()=>{saveBtn.classList.toggle('on',isSaved(x.id));saveBtn.lastChild.textContent=isSaved(x.id)?'Saved':'Save';};
    saveBtn.classList.toggle('on',isSaved(x.id));
    saveBtn.onclick=()=>{if(!authed())return;guard(saveBtn,async()=>{if(!saved)await loadSaved();saveSheet(x,refreshSave);});};
    if(Auth.user&&!saved)loadSaved().then(refreshSave).catch(()=>{});
    const rc=x.receipt;let receiptCard=null;
    if(rc&&rc.items&&rc.items.length){const c=RC.calc({wear_count:rc.wear_count},rc.items.map(i=>({name:i.name,price:i.price,prior_wears:i.prior_wears})));
      receiptCard=h('div',{class:'lx-receipt'},h('b',null,'Receipt · '+rc.title),h('div',{class:'group',style:{margin:'8px 0 0'}},c.rows.map(r=>h('div',{class:'item'},h('span',{class:'grow'},h('b',null,r.name),h('span',null,(rc.items.find(i=>i.name===r.name)||{}).brand||'')),h('span',{class:'muted'},RC.money(r.price,rc.currency||'NGN')))),
        h('div',{class:'item'},h('span',{class:'grow'},h('b',null,'Total')),h('b',null,RC.money(c.total,rc.currency||'NGN'))),h('div',{class:'item'},h('span',{class:'grow'},h('b',null,'Cost per wear'),h('span',null,'Worn '+c.wears+(c.wears===1?' time':' times'))),h('b',null,RC.money(c.cpw,rc.currency||'NGN')))));}
    const menu=()=>sheet('Options',(b,close)=>{const rows=x.mine?[['Edit lukk',()=>Posts.compose(x,()=>{feed=null;popView();draw();})],['Delete lukk',async()=>{if(!await confirmBox('Delete this lukk?','Its photos and likes will be removed.','Delete',true))return;const r=await sb.from('posts').delete().eq('id',x.id);if(r.error){toast(errMsg(r.error),'err');return;}x.photos.forEach(p=>removeFile('looks',p));feed=null;saved=null;popView();draw();toast('Deleted');}]]:[['Report this lukk',()=>{if(!authed())return;sb.from('post_reports').upsert({post_id:x.id,user_id:Auth.user.id,reason:'reported'},{onConflict:'post_id,user_id'}).then(r=>toast(r.error?errMsg(r.error):'Thanks, we will review it',r.error?'err':'ok'));}]];
      b.append(h('div',{class:'group',style:{margin:'8px 14px'}},rows.concat([['Copy link',()=>copyText(profileUrl(x.username)).then(()=>toast('Link copied'))]]).map(a=>h('button',{class:'item',onclick:()=>{close();setTimeout(a[1],150);}},h('span',{class:'grow'},h('b',null,a[0]))))));});
    const v=pushView(h('div',{class:'lx-detail'},
      h('div',{class:'lx-hero'},Posts.carousel(x.photos,x.title),h('div',{class:'lx-herotop'},backBtn('glass'),h('span',{class:'grow'}),
        h('button',{class:'lx-circ glass','aria-label':'Share',onclick:()=>shareUrl(profileUrl(x.username,x.id),x.title+' on Lukks')},icon('share')),h('button',{class:'lx-circ glass','aria-label':'More',onclick:menu},icon('dots')))),
      h('div',{class:'lx-info'},
        h('div',{class:'lx-acts'},Posts.likeBtn(x,authed),h('span',{class:'grow'}),saveBtn),
        h('h2',null,x.title),
        h('button',{class:'lx-author',onclick:()=>openProfile(x.username)},avatar({avatar_url:x.avatar_url,display_name:x.display_name,username:x.username}),h('span',null,x.display_name||'@'+x.username),icon('chevR')),
        x.details&&h('p',{class:'lx-details'},x.details),
        ext?h('button',{class:'btn block lx-visit',onclick:()=>openExternal(ext)},icon('link'),'Visit link'):null,
        x.category&&h('span',{class:'lx-tag'},x.category),
        receiptCard,
        more.length?h('h3',{class:'lx-h3'},'More ideas'):null,more.length?masonry(more.slice(0,16),y=>{popView();openPost(y);}):null)));
    v.classList.add('full');
  }

  /* ---------- Profiles (yours and other people's) ---------- */
  async function openProfile(username){
    if(!username)return;
    const v=pushView(h('div',{class:'lx-prof'},bar('@'+username),spinner()));const wrap=v.firstChild;
    let sum=null,posts=[],ptab='created',folder=null;
    const load=async()=>{
      const [s,p]=await Promise.all([sb.rpc('profile_summary',{p_username:username}),sb.rpc('discover_posts',{p_limit:100,p_user:username})]);
      if(s.error||!s.data){wrap.replaceChildren(bar('Profile'),empty('Profile not found','This person could not be found.'));return false;}
      sum=s.data;posts=Array.isArray(p.data)?p.data:[];
      if(sum.is_me){await loadSaved();}
      return true;
    };
    const lists=kind=>sheet(kind==='followers'?'Lukkers':'Lukking',async(b)=>{b.append(spinner());const r=await sb.rpc('follow_list',{p_username:username,p_kind:kind});const ls=r.data||[];b.replaceChildren(ls.length?h('div',{class:'group',style:{margin:'8px 14px'}},ls.map(u=>h('button',{class:'item',onclick:()=>{document.querySelector('.sheet-ov')&&document.querySelector('.sheet-ov').remove();openProfile(u.username);}},avatar(u),h('span',{class:'grow',style:{marginLeft:'10px'}},h('b',null,u.display_name||'@'+u.username),h('span',null,'@'+u.username))))):empty(kind==='followers'?'No lukkers yet':'Not lukking anyone yet'));});
    const render=()=>{
      const me=sum.is_me;
      const followBtn=me?h('button',{class:'btn small',onclick:menuSelf},'Edit profile'):h('button',{class:'btn small '+(sum.is_following?'':'primary'),onclick:e=>{if(!authed())return;guard(e.currentTarget,async()=>{const r=sum.is_following?await sb.from('follows').delete().eq('follower_id',Auth.user.id).eq('followee_id',sum.id):await sb.from('follows').insert({follower_id:Auth.user.id,followee_id:sum.id});if(r.error)throw r.error;sum.is_following=!sum.is_following;sum.followers=Number(sum.followers)+(sum.is_following?1:-1);render();});}},sum.is_following?'Lukking':'Lukk');
      const head=h('div',{class:'lx-pbanner',style:sum.cover_url?{backgroundImage:`url("${sum.cover_url}")`}:null},h('div',{class:'lx-herotop'},backBtn('glass'),h('span',{class:'grow'}),h('button',{class:'lx-circ glass','aria-label':'Share profile',onclick:()=>shareUrl(profileUrl(sum.username),(sum.display_name||sum.username)+' on Lukks')},icon('share')),me?h('button',{class:'lx-circ glass','aria-label':'Menu',onclick:menuSelf},icon('dots')):null));
      const info=h('div',{class:'lx-pinfo'},h('button',{class:'lx-bigav','aria-label':me?'Change photo':'Profile photo',onclick:me?e=>guard(e.currentTarget,async()=>{if(await uploadImg('avatar_url',600)){toast('Photo updated','ok');await Auth.refresh();await load();render();}}):null},avatar(sum)),
        h('div',{class:'lx-pname'},h('b',null,sum.display_name||'@'+sum.username),h('span',null,'@'+sum.username)),
        h('div',{class:'lx-counts'},h('button',{onclick:()=>lists('followers')},h('b',null,String(sum.followers)),' lukkers'),h('span',null,'·'),h('button',{onclick:()=>lists('following')},h('b',null,String(sum.following)),' lukking')),
        h('div',{class:'lx-pbtns'},followBtn,me?h('button',{class:'btn small',onclick:shareSheet},'Share'):null));
      const tabs=h('div',{class:'lx-ptabs'},[['created','Lukks']].concat(me?[['saved','Saved']]:[]).map(t=>h('button',{class:ptab===t[0]?'on':'',onclick:()=>{ptab=t[0];folder=null;render();}},t[1])));
      const body=h('div',{class:'lx-pbody'});
      if(ptab==='created')body.append(masonry(posts,openPost)||empty(me?'No lukks yet':'No lukks yet',me?'Tap + to share your first lukk.':'This person has not posted yet.'));
      else if(folder)body.append(folderGrid(folder));
      else body.append(foldersGrid());
      const fab=me&&ptab==='created'?h('button',{class:'lx-fab','aria-label':'Add a lukk',onclick:()=>Posts.compose(null,async()=>{feed=null;await load();render();})},icon('plus')):null;
      wrap.replaceChildren(...[h('div',{class:'lx-scroll nopad'},head,info,tabs,body),fab].filter(Boolean));
    };
    const uploadImg=(field,max)=>pickFile('image/jpeg,image/png,image/webp').then(async f=>{if(!f)return false;const pr=await prepareImage(f,{max,maxMB:12});const path=await uploadFile('avatars',pr.blob,pr.ext,pr.type);const r=await Auth.saveProfile({[field]:publicUrl('avatars',path)});if(r.error)throw r.error;return true;});
    function foldersGrid(){
      const all=saved.lukks;const mos=ls=>h('div',{class:'lx-mosaic'},[0,1,2,3].map(i=>ls[i]?h('img',{src:ph(ls[i].photos[0]),alt:''}):h('i',null)));
      const tiles=[h('button',{class:'lx-board',onclick:()=>{folder={id:'all',name:'All Lukks'};render();}},mos(all),h('b',null,'All Lukks'),h('span',null,all.length+' Lukks'))];
      saved.boards.forEach(bd=>{const ls=saved.saves.filter(s=>s.board_id===bd.id).map(s=>saved.lukks.find(l=>l.id===s.look_id)).filter(Boolean);tiles.push(h('button',{class:'lx-board',onclick:()=>{folder=bd;render();}},mos(ls),h('b',null,bd.name),h('span',null,ls.length+' Lukks')));});
      return h('div',null,h('div',{class:'lx-folderhead'},h('b',null,'Folders'),h('button',{class:'lx-pillbtn',onclick:newBoard},icon('plus'),h('span',null,'New folder'))),h('div',{class:'lx-boards'},tiles));
    }
    function folderGrid(f){
      const ls=(f.id==='all'?saved.lukks:saved.saves.filter(s=>s.board_id===f.id).map(s=>saved.lukks.find(l=>l.id===s.look_id)).filter(Boolean));
      return h('div',null,h('div',{class:'lx-folderhead'},h('button',{class:'lx-circ','aria-label':'Back to folders',onclick:()=>{folder=null;render();}},icon('back')),h('b',null,f.name),f.id==='all'?null:h('button',{class:'lx-circ','aria-label':'Folder options',onclick:()=>folderMenu(f)},icon('dots'))),masonry(ls,openPost)||empty('Nothing here yet','Save a lukk and choose this folder.'));
    }
    function folderMenu(f){sheet(f.name,(b,close)=>{b.append(h('div',{class:'group',style:{margin:'8px 14px'}},
      h('button',{class:'item',onclick:()=>{close();setTimeout(()=>sheet('Rename folder',(b2,c2)=>{const nm=h('input',{type:'text',maxlength:'40',value:f.name});b2.append(h('div',{class:'stack pad'},field('Name',nm),h('button',{class:'btn primary block',onclick:e=>guard(e.currentTarget,async()=>{const n=nm.value.trim();if(!n)return;const r=await sb.from('save_boards').update({name:n}).eq('id',f.id);if(r.error)throw r.error;f.name=n;c2();render();})},'Save')));}),150);}},h('span',{class:'grow'},h('b',null,'Rename'))),
      h('button',{class:'item',onclick:async()=>{close();if(!await confirmBox('Delete “'+f.name+'”?','Lukks inside stay in All Lukks.','Delete',true))return;const r=await sb.from('save_boards').delete().eq('id',f.id);if(r.error){toast(errMsg(r.error),'err');return;}saved.boards=saved.boards.filter(x=>x.id!==f.id);saved.saves.forEach(s=>{if(s.board_id===f.id)s.board_id=null;});folder=null;render();}},h('span',{class:'grow'},h('b',{style:{color:'#d33'}},'Delete folder'))))); });}
    function newBoard(){sheet('New folder',(b,close)=>{const nm=h('input',{type:'text',maxlength:'40',placeholder:'Folder name'});b.append(h('div',{class:'stack pad'},field('Name',nm),h('button',{class:'btn primary block',onclick:e=>guard(e.currentTarget,async()=>{const n=nm.value.trim();if(!n)throw new Error('Give it a name.');const r=await sb.from('save_boards').insert({user_id:Auth.user.id,name:n}).select().single();if(r.error)throw r.error;saved.boards.unshift(r.data);close();render();})},'Create')));});}
    function menuSelf(){sheet('Profile',(b,close)=>{b.append(h('div',{class:'group',style:{margin:'8px 14px'}},[['Edit name',editName],['Change banner',()=>guard(null,async()=>{if(await uploadImg('cover_url',1600)){toast('Banner updated','ok');await load();render();}})],['Change photo',()=>guard(null,async()=>{if(await uploadImg('avatar_url',600)){toast('Photo updated','ok');await Auth.refresh();await load();render();}})],['Share my profile',shareSheet],['Account & settings',()=>ctx.open('account')]].map(a=>h('button',{class:'item',onclick:()=>{close();setTimeout(a[1],150);}},h('span',{class:'grow'},h('b',null,a[0])),h('span',{class:'chev'},icon('chevR'))))));});}
    function editName(){const p=Auth.profile||{};sheet('Edit name',(b,close)=>{const dn=h('input',{type:'text',maxlength:'60',value:p.display_name||''});b.append(h('div',{class:'stack pad'},field('Name',dn),h('p',{class:'muted small-t',style:{margin:0}},'Change your username in Account.'),h('button',{class:'btn primary block',onclick:e=>guard(e.currentTarget,async()=>{const r=await Auth.saveProfile({display_name:dn.value.trim()||null});if(r.error)throw r.error;toast('Saved','ok');close();await load();render();})},'Save')));});}
    function shareSheet(){const p=Auth.profile||{},url=profileUrl(p.username||'');sheet('Share my profile',(b,close)=>{const st={is_public:!!p.is_public};b.append(h('div',{class:'stack pad'},h('div',{class:'group',style:{margin:0}},h('div',{class:'item'},h('span',{class:'grow'},h('b',null,'Public web page'),h('span',null,'Let anyone open your link without the app')),toggleEl(st.is_public,v=>st.is_public=v,'Public web page'))),
      h('div',{class:'group',style:{margin:0}},h('div',{class:'item'},h('span',{class:'grow',style:{minWidth:0}},h('b',null,'Your link'),h('span',{style:{wordBreak:'break-all'}},url)),h('button',{class:'icon-btn','aria-label':'Copy link',onclick:async()=>toast(await copyText(url)?'Link copied':'Could not copy')},icon('copy')),h('button',{class:'icon-btn','aria-label':'Share link',onclick:()=>shareUrl(url,(p.display_name||p.username)+' on Lukks')},icon('share')))),
      h('button',{class:'btn primary block',onclick:e=>guard(e.currentTarget,async()=>{const r=await Auth.saveProfile({is_public:st.is_public,show_looks:true});if(r.error)throw r.error;toast('Saved','ok');close();})},'Save')));});}
    load().then(ok=>{if(ok)render();}).catch(e=>wrap.replaceChildren(bar('Profile'),empty('Could not load',errMsg(e))));
  }

  /* ---------- Save to folder ---------- */
  function saveSheet(x,done){
    sheet('Save to',(b,close)=>{
      const draw2=async()=>{
        if(!isSaved(x.id)){const r=await sb.from('saves').upsert({user_id:Auth.user.id,look_id:x.id},{onConflict:'user_id,look_id'});if(r.error){toast(errMsg(r.error),'err');close();return;}saved.saves.unshift({look_id:x.id,board_id:null});saved.lukks.unshift(x);toast('Saved','ok');done&&done();}
        const cur=saved.saves.find(s=>s.look_id===x.id);
        const nm=h('input',{type:'text',maxlength:'40',placeholder:'New folder name'});
        const add=h('button',{class:'btn primary',onclick:e=>guard(e.currentTarget,async()=>{const n=nm.value.trim();if(!n)return;const r=await sb.from('save_boards').insert({user_id:Auth.user.id,name:n}).select().single();if(r.error)throw r.error;saved.boards.unshift(r.data);await pick(r.data.id);})},'Create');
        b.replaceChildren(h('div',{class:'lx-newrow'},nm,add),
          h('div',{class:'group',style:{margin:'10px 14px'}},[{id:null,name:'All Lukks'}].concat(saved.boards).map(bd=>{const n=saved.saves.filter(s=>s.board_id===bd.id).length;return h('button',{class:'item',onclick:()=>pick(bd.id)},h('span',{class:'grow'},h('b',null,bd.name),h('span',null,n+' Lukks')),cur&&cur.board_id===bd.id?h('span',{style:{color:'var(--maroon)'}},icon('check')):null);})),
          h('div',{class:'pad'},h('button',{class:'btn danger block',onclick:e=>guard(e.currentTarget,async()=>{const r=await sb.from('saves').delete().eq('look_id',x.id).eq('user_id',Auth.user.id);if(r.error)throw r.error;saved.saves=saved.saves.filter(s=>s.look_id!==x.id);saved.lukks=saved.lukks.filter(l=>l.id!==x.id);toast('Removed');done&&done();close();})},'Remove from saved')));
      };
      const pick=async id=>{const r=await sb.from('saves').update({board_id:id}).eq('look_id',x.id).eq('user_id',Auth.user.id);if(r.error){toast(errMsg(r.error),'err');return;}const s=saved.saves.find(z=>z.look_id===x.id);if(s)s.board_id=id;toast('Saved','ok');done&&done();close();};
      draw2();
    });
  }

  /* ---------- Search ---------- */
  function drawSearch(){
    const qi=h('input',{type:'search',placeholder:'Search lukks, styles or people',value:searchQ,'aria-label':'Search'});
    const out=h('div',{class:'lx-scroll'});
    let t;
    const run=async()=>{
      const s=searchQ.trim();out.replaceChildren();
      if(s){out.append(spinner());const r=await sb.rpc('discover_posts',{p_limit:60,p_q:s});if(searchQ.trim()!==s)return;out.replaceChildren(r.error?empty('Search failed',errMsg(r.error)):(masonry(Array.isArray(r.data)?r.data:[],openPost)||empty('Nothing found','Try another style, piece or name.')));return;}
      const counts=CATS.map(c=>({c,n:feed.filter(x=>x.category===c).length,cover:(feed.find(x=>x.category===c)||{photos:[]}).photos[0]}));
      const go=c=>{cat=c;Local.set('lxCat',c);setTab('home');};
      out.append(h('h3',{class:'lx-h3'},'Ideas for You'),h('div',{class:'lx-tiles'},counts.slice(0,8).map(o=>h('button',{class:'lx-tile',onclick:()=>go(o.c)},o.cover?h('img',{src:ph(o.cover),alt:''}):h('div',{class:'lx-tilebg'},logoEl(40)),h('span',null,o.c)))),
        h('h3',{class:'lx-h3'},'Trending'),h('div',{class:'group',style:{margin:'0 0 90px'}},counts.slice().sort((a,b)=>b.n-a.n).slice(0,6).map(o=>h('button',{class:'item',onclick:()=>go(o.c)},icon('search'),h('span',{class:'grow'},h('b',null,o.c.toLowerCase())),h('span',{class:'muted'},o.n+' lukks')))));
    };
    qi.oninput=()=>{searchQ=qi.value;clearTimeout(t);t=setTimeout(run,300);};
    main.replaceChildren(h('div',{class:'lx-title'},h('button',{class:'lx-circ','aria-label':'Back',onclick:ctx.close},icon('back')),h('h1',null,'Search'),h('span',{class:'grow'}),meBtn()),h('div',{class:'pad',style:{paddingBottom:0}},h('label',{class:'lk-search wide'},icon('search'),qi)),out);run();
  }

  /* ---------- Community: challenges + groups ---------- */
  async function drawCommunity(){
    const sg=h('div',{class:'seg lx-seg'},[['challenges','Challenges'],['groups','Groups']].map(t=>h('button',{class:seg===t[0]?'on':'',onclick:()=>{seg=t[0];drawCommunity();}},t[1])));
    const add=h('button',{class:'lx-circ','aria-label':seg==='groups'?'Create a group':'Create a challenge',onclick:()=>createSheet(seg)},icon('plus'));
    const body=h('div',{class:'lx-scroll'},spinner());
    main.replaceChildren(titleBar('Community',add),h('div',{class:'pad',style:{paddingBottom:0}},sg),body);
    if(seg==='challenges'){
      const r=await sb.rpc('list_challenges',{});if(r.error){body.replaceChildren(empty('Could not load',errMsg(r.error)));return;}
      const list=r.data||[];
      body.replaceChildren(list.length?h('div',{class:'lx-ch'},list.map(c=>h('button',{class:'lx-chcard',onclick:()=>openChallenge(c.id)},c.cover_path?h('img',{src:ph(c.cover_path),alt:''}):h('div',{class:'lx-chbg'},logoEl(46)),h('span',{class:'lx-chtxt'},h('b',null,c.title),h('em',null,'by @'+c.owner+' · '+c.entries+(c.entries==1?' entry':' entries')))))):empty('No challenges yet','Start one and invite everyone to join.',h('button',{class:'btn primary',onclick:()=>createSheet('challenges')},'Create a challenge')));
    }else{
      const r=await sb.rpc('list_groups',{});if(r.error){body.replaceChildren(empty('Could not load',errMsg(r.error)));return;}
      const list=r.data||[];
      body.replaceChildren(list.length?h('div',{class:'group',style:{margin:'4px 14px 90px'}},list.map(g=>h('button',{class:'item lx-grow',onclick:()=>openGroup(g.id)},g.cover_path?h('img',{class:'lx-gimg',src:ph(g.cover_path),alt:''}):h('span',{class:'lx-gimg ph'},logoEl(30)),h('span',{class:'grow'},h('b',null,g.name),h('span',null,g.members+(g.members==1?' member':' members')+(g.joined?' · Joined':''))),h('span',{class:'chev'},icon('chevR'))))):empty('No groups yet','Create a group for your style crew.',h('button',{class:'btn primary',onclick:()=>createSheet('groups')},'Create a group')));
    }
  }
  function createSheet(kind){
    if(!authed())return;
    const g=kind==='groups';let cover=null;
    sheet(g?'Create a group':'Create a challenge',(b,close)=>{
      const nm=h('input',{type:'text',maxlength:g?'60':'80',placeholder:g?'Group name':'Challenge title'}),ds=h('textarea',{maxlength:'500',placeholder:'What is it about?'});
      const pv=h('div',{class:'ad-prev'});
      b.append(h('div',{class:'stack pad'},field(g?'Name':'Title',nm),field('About',ds),h('div',{class:'f-label'},'Cover photo (optional)'),pv,
        h('button',{class:'btn block',onclick:async()=>{try{const f=await pickFile('image/jpeg,image/png,image/webp');if(!f)return;cover=await prepareImage(f,{max:1200});pv.replaceChildren(h('img',{src:URL.createObjectURL(cover.blob),alt:''}));}catch(e){toast(errMsg(e),'err');}}},icon('image'),'Choose cover'),
        h('button',{class:'btn primary block',onclick:e=>guard(e.currentTarget,async()=>{
          const n=nm.value.trim();if(n.length<(g?2:3))throw new Error('Add a '+(g?'name':'title')+'.');
          let path=null;if(cover)path=await uploadFile('looks',cover.blob,cover.ext,cover.type);
          const row=g?{owner_id:Auth.user.id,name:n,description:ds.value.trim()||null,cover_path:path}:{owner_id:Auth.user.id,title:n,description:ds.value.trim()||null,cover_path:path};
          const r=await sb.from(g?'groups':'challenges').insert(row).select().single();if(r.error){if(path)removeFile('looks',path);throw r.error;}
          if(g)await sb.from('group_members').insert({group_id:r.data.id,user_id:Auth.user.id});
          toast('Created','ok');close();seg=g?'groups':'challenges';tab='community';await draw();g?openGroup(r.data.id):openChallenge(r.data.id);
        })},'Create')));
    });
  }
  async function openChallenge(id){
    const v=pushView(h('div',{class:'lx-prof'},bar('Challenge'),spinner()));const wrap=v.firstChild;
    const load=async()=>{
      const r=await sb.rpc('challenge_detail',{p_id:id});if(r.error||!r.data){wrap.replaceChildren(bar('Challenge'),empty('Not found','This challenge is no longer available.'));return;}
      const c=r.data;
      const join=h('button',{class:'btn primary block',onclick:()=>{if(!authed())return;joinChallenge(c,load);}},'Join challenge');
      wrap.replaceChildren(bar(c.title,c.mine?h('button',{class:'lx-circ','aria-label':'Delete challenge',onclick:async()=>{if(!await confirmBox('Delete this challenge?','All entries will be removed.','Delete',true))return;const x=await sb.from('challenges').delete().eq('id',id);if(x.error){toast(errMsg(x.error),'err');return;}popView();drawCommunity();}},icon('trash')):null),
        h('div',{class:'lx-scroll'},c.cover_path?h('img',{class:'lx-cover',src:ph(c.cover_path),alt:''}):h('div',{class:'lx-cover ph'},logoEl(64)),
          h('div',{class:'lx-info'},h('h2',null,c.title),h('p',{class:'muted'},'by @'+c.owner),c.description&&h('p',null,c.description),join,
            h('h3',{class:'lx-h3'},c.entries.length+(c.entries.length==1?' entry':' entries')),
            c.entries.length?h('div',{class:'lx-mas'},c.entries.map(e=>h('div',{class:'lx-card'},h('img',{src:ph(e.photo_path),alt:e.caption||'',loading:'lazy'}),h('span',{class:'lx-cap'},(e.caption?e.caption+' · ':'')+'@'+e.username),e.mine&&h('button',{class:'lx-del','aria-label':'Delete my entry',onclick:async()=>{const x=await sb.from('challenge_entries').delete().eq('id',e.id);if(x.error)toast(errMsg(x.error),'err');else{toast('Removed');load();}}},icon('trash'))))):empty('Be the first to join','Share a photo of your take on it.'))));
    };
    load();
  }
  function joinChallenge(c,done){
    let photo=null;
    sheet('Join: '+c.title,(b,close)=>{const cap=h('input',{type:'text',maxlength:'200',placeholder:'Caption (optional)'}),pv=h('div',{class:'ad-prev'});
      b.append(h('div',{class:'stack pad'},pv,h('button',{class:'btn block',onclick:async()=>{try{const f=await pickFile('image/jpeg,image/png,image/webp');if(!f)return;photo=await prepareImage(f,{max:1400});pv.replaceChildren(h('img',{src:URL.createObjectURL(photo.blob),alt:''}));}catch(e){toast(errMsg(e),'err');}}},icon('image'),'Choose a photo'),field('Caption',cap),
        h('button',{class:'btn primary block',onclick:e=>guard(e.currentTarget,async()=>{if(!photo)throw new Error('Choose a photo first.');const path=await uploadFile('looks',photo.blob,photo.ext,photo.type);const r=await sb.from('challenge_entries').insert({challenge_id:c.id,user_id:Auth.user.id,photo_path:path,caption:cap.value.trim()||null});if(r.error){removeFile('looks',path);throw r.error;}toast('You are in!','ok');close();done();})},'Post entry')));});
  }
  async function openGroup(id){
    const v=pushView(h('div',{class:'lx-prof'},bar('Group'),spinner()));const wrap=v.firstChild;
    const load=async()=>{
      const r=await sb.rpc('group_detail',{p_id:id});if(r.error||!r.data){wrap.replaceChildren(bar('Group'),empty('Not found','This group is no longer available.'));return;}
      const g=r.data;
      const jb=h('button',{class:'btn '+(g.joined?'':'primary')+' block',onclick:e=>{if(!authed())return;guard(e.currentTarget,async()=>{const x=g.joined?await sb.from('group_members').delete().eq('group_id',id).eq('user_id',Auth.user.id):await sb.from('group_members').insert({group_id:id,user_id:Auth.user.id});if(x.error)throw x.error;await load();});}},g.joined?'Leave group':'Join group');
      const body=ta=>ta;
      let photo=null;const tx=h('textarea',{maxlength:'600',placeholder:'Share something with the group'}),pv=h('div',{class:'ad-prev'});
      const composer=g.joined?h('div',{class:'lx-composer'},tx,pv,h('div',{class:'row-flex'},h('button',{class:'btn grow',onclick:async()=>{try{const f=await pickFile('image/jpeg,image/png,image/webp');if(!f)return;photo=await prepareImage(f,{max:1400});pv.replaceChildren(h('img',{src:URL.createObjectURL(photo.blob),alt:''}));}catch(e){toast(errMsg(e),'err');}}},icon('image'),'Photo'),
        h('button',{class:'btn primary grow',onclick:e=>guard(e.currentTarget,async()=>{const t=tx.value.trim();if(!t&&!photo)throw new Error('Write something or add a photo.');let path=null;if(photo)path=await uploadFile('looks',photo.blob,photo.ext,photo.type);const x=await sb.from('group_posts').insert({group_id:id,user_id:Auth.user.id,body:t||null,photo_path:path});if(x.error){if(path)removeFile('looks',path);throw x.error;}await load();})},'Post'))):null;
      wrap.replaceChildren(bar(g.name,g.mine?h('button',{class:'lx-circ','aria-label':'Delete group',onclick:async()=>{if(!await confirmBox('Delete this group?','Posts will be removed.','Delete',true))return;const x=await sb.from('groups').delete().eq('id',id);if(x.error){toast(errMsg(x.error),'err');return;}popView();drawCommunity();}},icon('trash')):null),
        h('div',{class:'lx-scroll'},g.cover_path?h('img',{class:'lx-cover',src:ph(g.cover_path),alt:''}):h('div',{class:'lx-cover ph'},logoEl(64)),
          h('div',{class:'lx-info'},h('h2',null,g.name),h('p',{class:'muted'},'By @'+g.owner+' · '+g.member_count+(g.member_count==1?' member':' members')),jb,g.description&&h('p',null,g.description),
            g.members.length?h('div',{class:'lx-members'},g.members.map(m=>h('span',null,avatar(m),h('em',null,m.display_name||m.username)))):null,
            composer,
            h('h3',{class:'lx-h3'},'Wall'),
            g.posts.length?g.posts.map(p=>h('div',{class:'lx-post'},h('div',{class:'lx-ph'},avatar(p),h('b',null,p.display_name||'@'+p.username),h('span',{class:'grow'}),p.mine&&h('button',{class:'icon-btn','aria-label':'Delete post',onclick:async()=>{const x=await sb.from('group_posts').delete().eq('id',p.id);if(x.error)toast(errMsg(x.error),'err');else load();}},icon('trash'))),p.body&&h('p',null,p.body),p.photo_path&&h('img',{src:ph(p.photo_path),alt:'',loading:'lazy'}))):empty('No posts yet',g.joined?'Be the first to post.':'Join the group to post.'))));
    };
    load();
  }

  live(()=>{saved=null;feed=null;if(!stack.length)draw();});
  if(it.me&&Auth.user&&Auth.profile)setTimeout(()=>openProfile(Auth.profile.username),50);
  else if(it.me)authed();
  else if(it.post)sb.rpc('discover_posts',{p_ids:[it.post]}).then(r=>{const x=(r.data||[])[0];if(x)openPost(x);});
  draw();
}});
