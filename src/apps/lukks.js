/* ---------- LUKKS APP: discover style (Pinterest-style, iOS look), posts, profiles, folders, challenges ---------- */
defApp({id:'lukks',name:'Lukks',bg:'#ffffff',glyph:()=>'<img src="icons/logo.png" alt="" style="width:100%;height:100%;object-fit:contain;padding:4px">',
mount(el,ctx,live){
  const CATS=[].concat(...Object.values(CFG.categories));
  const ph=Posts.ph;
  let tab=Local.get('lxTab','home'),cat=Local.get('lxCat',''),feed=null,searchQ='',seg=Local.get('lxSeg','challenges');
  if(tab!=='home'&&tab!=='community'&&tab!=='search')tab='home';
  let saved=null;
  const stack=[];
  const it=ctx.intent||{};
  if(it.cat){const m=CATS.find(c=>c.toLowerCase()===String(it.cat).toLowerCase());if(m){cat=m;tab='home';}else{tab='search';searchQ=String(it.cat);}}
  const root=h('div',{class:'lx'});el.append(root);
  const main=h('div',{class:'lx-main'});
  const pill=h('nav',{class:'lx-nav'});
  root.append(main,pill);
  let direct=!!it.me;
  ctx.onBack=()=>{if(stack.length){if(direct&&stack.length===1)return false;popView();return true;}return false;};
  const shuffle=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
  const authed=()=>{if(Auth.user)return true;toast('Sign in to do that','err');ctx.open('account',{mode:'signin'});return false;};
  function pushView(node){const v=h('div',{class:'lx-view'},node);root.append(v);stack.push(v);return v;}
  function popView(){if(direct&&stack.length<=1){ctx.close();return;}const v=stack.pop();if(v)v.remove();}
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
  /* styles shown on the home screen: the built-in ones, plus any style people added once it has 5 or more lukks */
  const styles=()=>{const base=CATS.slice(),n={};(feed||[]).forEach(x=>{if(x.category)n[x.category]=(n[x.category]||0)+1;});const extra=Object.keys(n).filter(c=>!base.includes(c)&&n[c]>=5).sort((a,b)=>n[b]-n[a]);return base.concat(extra);};
  const customStyles=()=>{const set=new Set(CATS);return [...new Set((feed||[]).map(x=>x.category).filter(c=>c&&!set.has(c)))];};
  const afterChange=()=>{feed=null;saved=null;const top=stack[stack.length-1];if(top&&top._reload)top._reload();if(tab==='home'||tab==='search')draw();};
  const isSaved=id=>saved&&saved.saves.some(s=>s.look_id===id);

  /* ---------- shell ---------- */
  function setTab(t){direct=false;tab=t;Local.set('lxTab',t);stack.splice(0).forEach(v=>v.remove());draw();}
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
  const addBtn=()=>h('button',{class:'lx-circ plus','aria-label':'Add a lukk',onclick:()=>{if(authed())Posts.compose(null,()=>afterChange(),customStyles());}},icon('plus'));
  const masonry=(list,open)=>list.length?h('div',{class:'lx-mas'},list.map(x=>h('div',{class:'lx-card'},
    h('button',{class:'lx-cardimg','aria-label':x.title,onclick:()=>open(x)},h('img',{src:ph(x.photos[0]),alt:x.title,loading:'lazy'}),x.photos.length>1?h('span',{class:'lx-multi'},icon('image'),String(x.photos.length)):null),
    h('div',{class:'lx-capr'},h('span',{class:'lx-cap'},x.title),Posts.likeBtn(x,authed))))):null;

  /* ---------- Home ---------- */
  function drawHome(){
    const chips=h('div',{class:'lx-chips'},['For You'].concat(styles()).map(c=>h('button',{class:(c==='For You'&&!cat)||c===cat?'on':'',onclick:()=>{cat=c==='For You'?'':c;Local.set('lxCat',cat);drawHome();}},c)));
    const list=feed.filter(x=>!cat||x.category===cat);
    const body=masonry(list,openPost)||empty(cat?'No lukks in '+cat+' yet':'No lukks yet',cat?'Be the first to post one.':'Tap + to share your first lukk.',h('button',{class:'btn primary',onclick:()=>{if(authed())Posts.compose(null,()=>afterChange(),customStyles());}},'Add a lukk'));
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
    const menu=()=>sheet('Options',(b,close)=>{const rows=x.mine?[['Edit lukk',()=>Posts.compose(x,()=>{popView();afterChange();},customStyles())],['Delete lukk',async()=>{if(!await confirmBox('Delete this lukk?','Its photos and likes will be removed.','Delete',true))return;const r=await sb.from('posts').delete().eq('id',x.id);if(r.error){toast(errMsg(r.error),'err');return;}x.photos.forEach(p=>removeFile('looks',p));popView();afterChange();toast('Deleted');}]]:[['Report this lukk',()=>{if(!authed())return;sb.from('post_reports').upsert({post_id:x.id,user_id:Auth.user.id,reason:'reported'},{onConflict:'post_id,user_id'}).then(r=>toast(r.error?errMsg(r.error):'Thanks, we will review it',r.error?'err':'ok'));}]];
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
        more.length?h('h3',{class:'lx-h3'},'More lukks'):null,more.length?masonry(more.slice(0,16),y=>{popView();openPost(y);}):null)));
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
      try{const f=await sb.rpc('follow_list',{p_username:username,p_kind:'followers'});sum._fav=(Array.isArray(f.data)?f.data:[]).slice(0,3);}catch(e){sum._fav=[];}
      return true;
    };
    const lists=kind=>sheet(kind==='followers'?'Lukkers':'Lukking',async(b)=>{b.append(spinner());const r=await sb.rpc('follow_list',{p_username:username,p_kind:kind});const ls=r.data||[];b.replaceChildren(ls.length?h('div',{class:'group lx-ulist',style:{margin:'8px 14px'}},ls.map(u=>h('button',{class:'item',onclick:()=>{document.querySelector('.sheet-ov')&&document.querySelector('.sheet-ov').remove();openProfile(u.username);}},avatar(u),h('span',{class:'grow',style:{marginLeft:'10px'}},h('b',null,u.display_name||'@'+u.username),h('span',null,'@'+u.username))))):empty(kind==='followers'?'No lukkers yet':'Not lukking anyone yet'));});
    const render=()=>{
      const me=sum.is_me;
      const followBtn=me?h('button',{class:'btn small',onclick:menuSelf},'Edit profile'):h('button',{class:'btn small '+(sum.is_following?'':'primary'),onclick:e=>{if(!authed())return;guard(e.currentTarget,async()=>{const r=sum.is_following?await sb.from('follows').delete().eq('follower_id',Auth.user.id).eq('followee_id',sum.id):await sb.from('follows').insert({follower_id:Auth.user.id,followee_id:sum.id});if(r.error)throw r.error;sum.is_following=!sum.is_following;sum.followers=Number(sum.followers)+(sum.is_following?1:-1);render();});}},sum.is_following?'Lukking':'Lukk');
      const head=h('div',{class:'lx-pbanner',style:sum.cover_url?{backgroundImage:`url("${sum.cover_url}")`}:null},h('div',{class:'lx-herotop'},backBtn('glass'),h('span',{class:'grow'}),h('button',{class:'lx-circ glass','aria-label':'Share profile',onclick:()=>shareUrl(profileUrl(sum.username),(sum.display_name||sum.username)+' on Lukks')},icon('share')),me?h('button',{class:'lx-circ glass','aria-label':'Menu',onclick:menuSelf},icon('dots')):null));
      const info=h('div',{class:'lx-pinfo'},h('button',{class:'lx-bigav','aria-label':me?'Change photo':'Profile photo',onclick:me?e=>guard(e.currentTarget,async()=>{if(await uploadImg('avatar_url',600)){toast('Photo updated','ok');await Auth.refresh();await load();render();}}):null},avatar(sum)),
        h('div',{class:'lx-pname'},h('b',null,sum.display_name||'@'+sum.username),h('span',null,'@'+sum.username)),
        (sum.badges&&sum.badges.length)?h('div',{class:'lx-badges'},sum.badges.map(bd=>h('span',{class:'lx-badge',title:bd.votes+' votes'},icon('trophy'),'Winner · '+bd.title))):null,
        h('div',{class:'lx-counts'},h('button',{class:'lx-fbtn',onclick:()=>lists('followers')},h('b',null,String(sum.followers)),' lukkers'),h('span',null,'·'),h('button',{onclick:()=>lists('following')},h('b',null,String(sum.following)),' lukking')),
        h('div',{class:'lx-pbtns'},followBtn,me?h('button',{class:'btn small',onclick:shareSheet},'Share'):null));
      const tabs=h('div',{class:'lx-ptabs'},[['created','Lukks']].concat(me?[['saved','Saved']]:[]).map(t=>h('button',{class:ptab===t[0]?'on':'',onclick:()=>{ptab=t[0];folder=null;render();}},t[1])));
      const body=h('div',{class:'lx-pbody'});
      if(ptab==='created')body.append(masonry(posts,openPost)||empty(me?'No lukks yet':'No lukks yet',me?'Tap + to share your first lukk.':'This person has not posted yet.'));
      else if(folder)body.append(folderGrid(folder));
      else body.append(foldersGrid());
      const fab=me&&ptab==='created'?h('button',{class:'lx-fab','aria-label':'Add a lukk',onclick:()=>Posts.compose(null,async()=>{feed=null;await load();render();},customStyles())},icon('plus')):null;
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
    v._reload=async()=>{try{if(await load())render();}catch(e){}};
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
      const counts=styles().map(c=>({c,n:feed.filter(x=>x.category===c).length,cover:(feed.find(x=>x.category===c)||{photos:[]}).photos[0]}));
      const go=c=>{cat=c;Local.set('lxCat',c);setTab('home');};
      out.append(h('h3',{class:'lx-h3'},'Lukks for You'),h('div',{class:'lx-tiles'},counts.slice(0,8).map(o=>h('button',{class:'lx-tile',onclick:()=>go(o.c)},o.cover?h('img',{src:ph(o.cover),alt:''}):h('div',{class:'lx-tilebg'},logoEl(40)),h('span',null,o.c)))),
        h('h3',{class:'lx-h3'},'Trending'),h('div',{class:'group',style:{margin:'0 0 90px'}},counts.slice().sort((a,b)=>b.n-a.n).slice(0,6).map(o=>h('button',{class:'item',onclick:()=>go(o.c)},icon('search'),h('span',{class:'grow'},h('b',null,o.c.toLowerCase())),h('span',{class:'muted'},o.n+' lukks')))));
    };
    qi.oninput=()=>{searchQ=qi.value;clearTimeout(t);t=setTimeout(run,300);};
    main.replaceChildren(h('div',{class:'lx-title'},h('button',{class:'lx-circ','aria-label':'Back',onclick:ctx.close},icon('back')),h('h1',null,'Search'),h('span',{class:'grow'}),meBtn()),h('div',{class:'pad',style:{paddingBottom:0}},h('label',{class:'lk-search wide'},icon('search'),qi)),out);run();
  }

  /* ---------- Community: weekly spotlight + challenges (post, vote, win a badge) ---------- */
  const leftTxt=c=>{const ms=new Date(c.ends_at)-Date.now();if(c.ended||ms<=0)return 'Ended';const d=Math.floor(ms/864e5),hr=Math.floor(ms%864e5/36e5);return d>0?d+'d '+hr+'h left':Math.max(1,Math.floor(ms%36e5/6e4)+hr*60)+(hr?'h left':'m left');};
  function glitter(host){
    if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
    const cv=h('canvas',{class:'lx-glitter','aria-hidden':'true'});host.append(cv);
    const W=cv.width=host.clientWidth||360,H=cv.height=host.clientHeight||640,g=cv.getContext('2d');
    const cols=['#ff7a3d','#ff2d8a','#ffd34d','#3d7bff','#ffffff','#a0e0cf'];
    const ps=Array.from({length:150},()=>({x:Math.random()*W,y:-Math.random()*H*.6,vx:(Math.random()-.5)*1.2,vy:1.2+Math.random()*2.8,r:2+Math.random()*4,rot:Math.random()*6,vr:(Math.random()-.5)*.3,c:cols[Math.random()*cols.length|0],star:Math.random()<.4,ph:Math.random()*6}));
    const t0=performance.now();
    (function tick(now){
      const t=(now-t0)/1000;g.clearRect(0,0,W,H);
      ps.forEach(p=>{p.x+=p.vx+Math.sin(t*3+p.ph)*.5;p.y+=p.vy;p.rot+=p.vr;
        g.save();g.translate(p.x,p.y);g.rotate(p.rot);g.globalAlpha=Math.max(0,Math.min(1,(4.2-t)/1.2))*(.55+.45*Math.sin(t*14+p.ph));g.fillStyle=p.c;
        if(p.star){g.beginPath();for(let i=0;i<8;i++){const r=i%2?p.r*.4:p.r*1.6,a=i*Math.PI/4;g.lineTo(Math.cos(a)*r,Math.sin(a)*r);}g.closePath();g.fill();}
        else g.fillRect(-p.r,-p.r/2,p.r*2,p.r);
        g.restore();});
      if(t<4.2&&cv.isConnected)requestAnimationFrame(tick);else cv.remove();
    })(t0);
  }
  const chCard=c=>h('button',{class:'lx-chcard',onclick:()=>openChallenge(c.id)},c.cover_path?h('img',{src:ph(c.cover_path),alt:''}):h('div',{class:'lx-chbg'},logoEl(46)),
    h('span',{class:'lx-chpill'+(c.ended?' end':'')},leftTxt(c)),
    h('span',{class:'lx-chtxt'},h('b',null,c.title),h('em',null,'by @'+c.owner+' · '+c.entries+(c.entries==1?' entry':' entries')+' · '+c.votes+(c.votes==1?' vote':' votes'))));
  async function drawCommunity(){
    const sg=h('div',{class:'seg lx-seg'},[['challenges','Challenges'],['groups','Groups']].map(t=>h('button',{class:seg===t[0]?'on':'',onclick:()=>{seg=t[0];Local.set('lxSeg',seg);drawCommunity();}},t[1])));
    const add=h('button',{class:'lx-circ plus','aria-label':seg==='groups'?'Create a group':'Create a challenge',onclick:()=>seg==='groups'?createGroup():createSheet()},icon('plus'));
    const body=h('div',{class:'lx-scroll'},spinner());
    main.replaceChildren(titleBar('Community',add),h('div',{class:'pad',style:{paddingBottom:0}},sg),body);
    if(seg==='groups')return drawGroups(body);
    const r=await sb.rpc('list_challenges',{});if(r.error){body.replaceChildren(empty('Could not load',errMsg(r.error)));return;}
    const list=r.data||[];
    const spot=h('button',{class:'lx-spot',onclick:openSpotlight},h('span',{class:'lx-spoticon'},icon('trophy')),h('span',{class:'grow'},h('b',null,'Weekly Spotlight'),h('em',null,'Top looks and challenges this week')),h('span',{class:'chev'},icon('chevR')));
    body.replaceChildren(spot,list.length?h('div',{class:'lx-ch'},list.map(chCard)):empty('No challenges yet','Start one, everyone posts a photo, and the most voted wins a badge.',h('button',{class:'btn primary',onclick:()=>createSheet()},'Create a challenge')));
  }
  /* ---------- Groups ---------- */
  let gTab='all',gQ='';
  async function drawGroups(body){
    const r=await sb.rpc('list_groups',{});if(r.error){body.replaceChildren(empty('Could not load',errMsg(r.error)));return;}
    const all=r.data||[];
    const paint=()=>{
      const tabs=h('div',{class:'lx-gtabs'},[['mine','My groups'],['all','All groups']].map(t=>h('button',{class:gTab===t[0]?'on':'',onclick:()=>{gTab=t[0];paint();}},t[1])));
      const q=h('input',{type:'search',class:'lx-gsearch',placeholder:'Search groups',value:gQ,oninput:e=>{gQ=e.target.value;grid();}});
      const host=h('div',{class:'lx-gwrap'});
      const grid=()=>{
        let list=all.filter(g=>(gTab==='all'||g.joined||g.mine)&&(!gQ||(g.name+' '+g.style).toLowerCase().includes(gQ.toLowerCase())));
        if(!list.length){host.replaceChildren(empty(gTab==='mine'?'You have not joined any groups':'No groups yet',gTab==='mine'?'Join one from All groups, or start your own.':'Start a group for your style crew.',h('button',{class:'btn primary',onclick:()=>createGroup()},'Create a group')));return;}
        const by={};list.forEach(g=>(by[g.style]=by[g.style]||[]).push(g));
        host.replaceChildren(...Object.keys(by).map(st=>h('div',{class:'lx-gsec'},h('h3',{class:'lx-h3'},st),h('div',{class:'lx-ggrid'},by[st].map(g=>h('button',{class:'lx-gtile',onclick:()=>openGroup(g.id)},
          g.cover_path?h('img',{src:ph(g.cover_path),alt:'',loading:'lazy'}):h('span',{class:'lx-gimg ph'},logoEl(36)),h('b',null,g.name),h('em',null,icon('people'),Number(g.members).toLocaleString())))))));
      };
      body.replaceChildren(tabs,h('div',{class:'lx-gq'},q),host);grid();
    };
    paint();
  }
  function createGroup(){
    if(!authed())return;let cover=null,style='';
    sheet('Create a group',(b,close)=>{
      const nm=h('input',{type:'text',maxlength:'60',placeholder:'Group name'}),ds=h('textarea',{maxlength:'500',placeholder:'Who is it for? What do you post?'});
      const st=h('input',{type:'text',maxlength:'40',placeholder:'Type your own style',list:'lx-gstyles'});
      const dl=h('datalist',{id:'lx-gstyles'},CATS.map(c=>h('option',{value:c})));
      const chips=h('div',{class:'lx-chips lx-sugg'},CATS.slice(0,14).map(c=>h('button',{type:'button',onclick:e=>{st.value=c;chips.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===e.currentTarget));}},c)));
      const pv=h('div',{class:'ad-prev'});
      b.append(h('div',{class:'stack pad'},field('Name',nm),h('div',{class:'f-label'},'Style (pick a suggestion or add your own)'),chips,st,dl,field('About',ds),h('div',{class:'f-label'},'Cover photo'),pv,
        h('button',{class:'btn block',onclick:async()=>{try{const f=await pickFile('image/jpeg,image/png,image/webp');if(!f)return;cover=await prepareImage(f,{max:1200});pv.replaceChildren(h('img',{src:URL.createObjectURL(cover.blob),alt:''}));}catch(e){toast(errMsg(e),'err');}}},icon('image'),'Choose cover'),
        h('button',{class:'btn primary block',onclick:e=>guard(e.currentTarget,async()=>{
          const n=nm.value.trim();if(n.length<2)throw new Error('Add a name.');
          const sty=Posts.cleanStyle?Posts.cleanStyle(st.value):st.value.trim();if(!sty)throw new Error('Pick or type a style.');
          let path=null;if(cover)path=await uploadFile('looks',cover.blob,cover.ext,cover.type);
          const r=await sb.from('groups').insert({owner_id:Auth.user.id,name:n,description:ds.value.trim()||null,cover_path:path,style:sty.slice(0,80)}).select().single();if(r.error){if(path)removeFile('looks',path);throw r.error;}
          await sb.from('group_members').insert({group_id:r.data.id,user_id:Auth.user.id});
          toast('Group created','ok');close();seg='groups';Local.set('lxSeg','groups');tab='community';await draw();openGroup(r.data.id);
        })},'Create group')));
    });
  }
  async function openGroup(id){
    const v=pushView(h('div',{class:'lx-prof'},bar('Group'),spinner()));const wrap=v.firstChild;let gt='wall';
    const load=async()=>{
      const r=await sb.rpc('group_detail',{p_id:id});if(r.error||!r.data){wrap.replaceChildren(bar('Group'),empty('Not found','This group is no longer available.'));return;}
      const g=r.data;v._reload=load;
      const jb=h('button',{class:'btn '+(g.joined?'':'primary')+' block',onclick:e=>{if(!authed())return;guard(e.currentTarget,async()=>{const x=g.joined?await sb.from('group_members').delete().eq('group_id',id).eq('user_id',Auth.user.id):await sb.from('group_members').insert({group_id:id,user_id:Auth.user.id});if(x.error)throw x.error;await load();});}},g.joined?'Leave group':'Join group');
      const members=g.members.length?h('div',{class:'lx-members'},g.members.map(m=>h('button',{onclick:()=>openProfile(m.username)},avatar(m),h('em',null,m.display_name||m.username)))):null;
      const tx=h('textarea',{maxlength:'800',placeholder:'Write something for the group'});
      const composer=g.joined?h('div',{class:'lx-composer'},tx,h('button',{class:'btn primary',onclick:e=>guard(e.currentTarget,async()=>{const t=tx.value.trim();if(!t)throw new Error('Write something first.');const x=await sb.from('group_posts').insert({group_id:id,user_id:Auth.user.id,body:t});if(x.error)throw x.error;await load();})},'Post')):h('p',{class:'muted small-t',style:{textAlign:'center'}},'Join the group to post and comment.');
      const wall=g.wall.length?g.wall.map(p=>wallPost(g,p,load)):[empty('No posts yet',g.joined?'Be the first to post.':'Join to start the conversation.')];
      const paintBody=async()=>{
        const host=h('div');
        if(gt==='wall')host.append(composer,...wall);
        else{
          const share=g.joined?h('button',{class:'btn primary block',onclick:()=>shareLukk(g,load)},icon('plus'),'Share a lukk'):null;
          host.append(share);
          if(g.lukk_ids.length){host.append(spinner());const q=await sb.rpc('discover_posts',{p_limit:100,p_ids:g.lukk_ids});const ls=Array.isArray(q.data)?q.data:[];host.lastChild.replaceWith(ls.length?masonry(ls,openPost):empty('No lukks yet','Members can share lukks here.'));}
          else host.append(empty('No lukks yet',g.joined?'Share one of yours.':'Join to share lukks.'));
        }
        return host;
      };
      const tabs=h('div',{class:'lx-gtabs'},[['wall','Wall'],['lukks','Lukks']].map(t=>h('button',{class:gt===t[0]?'on':'',onclick:async()=>{gt=t[0];tabs.querySelectorAll('button').forEach((x,i)=>x.classList.toggle('on',i===(gt==='wall'?0:1)));cont.replaceChildren(await paintBody());}},t[1])));
      const cont=h('div',{class:'lx-gbody'});
      wrap.replaceChildren(bar(g.name,g.mine?h('button',{class:'lx-circ','aria-label':'Delete group',onclick:async()=>{if(!await confirmBox('Delete this group?','Posts and lukks shared here will be removed.','Delete',true))return;const x=await sb.from('groups').delete().eq('id',id);if(x.error){toast(errMsg(x.error),'err');return;}popView();drawCommunity();}},icon('trash')):null),
        h('div',{class:'lx-scroll'},h('div',{class:'lx-gcover'},g.cover_path?h('img',{src:ph(g.cover_path),alt:''}):h('span',{class:'lx-gimg ph big'},logoEl(54))),
          h('div',{class:'lx-ginfo'},h('h2',null,g.name),h('p',{class:'lx-gby'},'By ',h('button',{onclick:()=>g.owner&&openProfile(g.owner)},'@'+(g.owner||'lukks'))),
            h('div',{class:'lx-gstats'},h('span',null,icon('people'),Number(g.member_count).toLocaleString()),h('span',null,'Created '+fmtDate(g.created_at,{month:'short',day:'numeric',year:'numeric'})),g.style?h('span',{class:'lx-gstyle'},g.style):null),
            jb,g.description?h('p',{class:'lx-gabout'},g.description):null),
          h('div',{class:'lx-gmem'},h('h3',{class:'lx-h3'},'Members'),members),tabs,cont));
      cont.replaceChildren(await paintBody());
    };
    load();
  }
  function wallPost(g,p,reload){
    const lk=h('button',{class:'lx-like'+(p.liked?' on':''),'aria-label':'Like'});
    const dr=()=>{lk.classList.toggle('on',!!p.liked);lk.innerHTML=Posts.eyeSvg(p.liked)+`<b>${p.likes||0}</b>`;};dr();
    lk.onclick=async()=>{if(!authed())return;if(lk._b)return;lk._b=true;const was=!!p.liked;p.liked=!was;p.likes=Math.max(0,(p.likes||0)+(was?-1:1));dr();
      try{const r=was?await sb.from('group_post_likes').delete().eq('post_id',p.id).eq('user_id',Auth.user.id):await sb.from('group_post_likes').insert({post_id:p.id,user_id:Auth.user.id});if(r.error&&r.error.code!=='23505')throw r.error;}
      catch(e){p.liked=was;p.likes=Math.max(0,(p.likes||0)+(was?1:-1));dr();toast(errMsg(e),'err');}lk._b=false;};
    const cm=h('button',{class:'lx-like','aria-label':'Comments',onclick:()=>comments(p,g,reload)},icon('chat'),h('b',null,String(p.comments||0)));
    return h('div',{class:'lx-post'},h('div',{class:'lx-ph'},h('button',{class:'lx-ph',onclick:()=>openProfile(p.username)},avatar(p),h('b',null,p.display_name||'@'+p.username)),h('span',{class:'muted small-t'},timeAgo(p.created_at)),h('span',{class:'grow'}),
      (p.mine||g.mine)?h('button',{class:'icon-btn','aria-label':'Delete post',onclick:async()=>{if(!await confirmBox('Delete this post?',null,'Delete',true))return;const x=await sb.from('group_posts').delete().eq('id',p.id);if(x.error)toast(errMsg(x.error),'err');else reload();}},icon('trash')):null),
      h('p',null,p.body),h('div',{class:'lx-pacts'},lk,cm));
  }
  function comments(p,g,reload){
    sheet('Comments',async(b)=>{
      const host=h('div');b.append(host);
      const draw2=async()=>{
        host.replaceChildren(spinner());const r=await sb.rpc('group_comments',{p_post:p.id});const ls=Array.isArray(r.data)?r.data:[];
        const inp=h('input',{type:'text',maxlength:'400',placeholder:g.joined?'Add a comment':'Join the group to comment',disabled:!g.joined});
        const send=h('button',{class:'btn primary small',disabled:!g.joined,onclick:e=>guard(e.currentTarget,async()=>{const t=inp.value.trim();if(!t)return;const x=await sb.from('group_post_comments').insert({post_id:p.id,user_id:Auth.user.id,body:t});if(x.error)throw x.error;p.comments=(p.comments||0)+1;await draw2();})},'Send');
        host.replaceChildren(ls.length?h('div',{class:'lx-cmts'},ls.map(c=>h('div',{class:'lx-cm'},avatar(c),h('div',{class:'grow'},h('b',null,c.display_name||'@'+c.username),h('p',null,c.body)),c.mine?h('button',{class:'icon-btn','aria-label':'Delete comment',onclick:async()=>{const x=await sb.from('group_post_comments').delete().eq('id',c.id);if(x.error)toast(errMsg(x.error),'err');else{p.comments=Math.max(0,(p.comments||1)-1);draw2();}}},icon('trash')):null))):h('p',{class:'muted',style:{textAlign:'center'}},'No comments yet.'),h('div',{class:'row-flex',style:{marginTop:'10px'}},inp,send));
      };
      draw2();
    },{onClose:reload});
  }
  async function shareLukk(g,reload){
    sheet('Share a lukk',async(b,close)=>{
      b.append(spinner());
      const r=await sb.rpc('discover_posts',{p_limit:100,p_user:Auth.profile&&Auth.profile.username});const mine=(Array.isArray(r.data)?r.data:[]).filter(x=>!g.lukk_ids.includes(x.id));
      const newBtn=h('button',{class:'btn block',onclick:()=>{close();Posts.compose(null,()=>{reload();},customStyles());}},icon('plus'),'Create a new lukk');
      b.replaceChildren(h('div',{class:'stack pad'},newBtn,mine.length?h('div',{class:'lx-pick'},mine.map(x=>h('button',{class:'lx-pickc',onclick:e=>guard(e.currentTarget,async()=>{const q=await sb.from('group_lukks').insert({group_id:g.id,post_id:x.id,user_id:Auth.user.id});if(q.error)throw q.error;toast('Shared','ok');close();reload();})},h('img',{src:ph(x.photos[0]),alt:x.title}),h('span',null,x.title)))):h('p',{class:'muted',style:{textAlign:'center'}},'You have no more lukks to share. Create one above.')));
    });
  }
  async function openSpotlight(){
    const v=pushView(h('div',{class:'lx-prof lx-spotpage'},bar('Weekly Spotlight'),spinner()));const wrap=v.firstChild;
    let seg2='looks';
    const r=await sb.rpc('weekly_spotlight',{});
    if(r.error||!r.data){wrap.replaceChildren(bar('Weekly Spotlight'),empty('Could not load',r.error?errMsg(r.error):''));return;}
    const d=r.data;let posts=[];
    if((d.looks||[]).length){const q=await sb.rpc('discover_posts',{p_limit:50,p_ids:d.looks.map(x=>x.id)});const m=new Map((Array.isArray(q.data)?q.data:[]).map(x=>[x.id,x]));posts=d.looks.map(x=>m.get(x.id)).filter(Boolean);}
    const draw2=()=>{
      const tabs=h('div',{class:'lx-chips lx-spottabs'},[['looks','Looks'],['challenges','Challenges']].map(t=>h('button',{class:seg2===t[0]?'on':'',onclick:()=>{seg2=t[0];draw2();}},t[1])));
      const winners=(d.winners||[]).length?h('div',{class:'lx-winners'},h('h3',{class:'lx-h3'},'Recent winners'),h('div',{class:'lx-wrow'},d.winners.map(w=>h('button',{class:'lx-win',onclick:()=>openProfile(w.username)},avatar(w),h('b',null,w.display_name||'@'+w.username),h('em',null,w.title))))):null;
      const content=seg2==='looks'?(posts.length?masonry(posts,openPost):empty('No looks yet this week','The most liked looks of the week show up here. Post yours and share it.')):
        ((d.challenges||[]).length?h('div',{class:'lx-ch'},d.challenges.map(c=>chCard(Object.assign({owner:c.owner||'lukks'},c)))):empty('No challenges this week','Start one from the Challenges tab.'));
      wrap.replaceChildren(bar('Weekly Spotlight'),h('div',{class:'lx-scroll'},h('div',{class:'lx-spothead'},h('span',{class:'lx-crown'},icon('trophy')),h('h2',null,'Weekly Spotlight'),h('p',null,'The most loved this week')),tabs,winners,h('div',{style:{padding:'0 14px 90px'}},content)));
    };
    draw2();glitter(v);
  }
  function createSheet(){
    if(!authed())return;let cover=null;
    sheet('Create a challenge',(b,close)=>{
      const nm=h('input',{type:'text',maxlength:'80',placeholder:'Challenge title'}),ds=h('textarea',{maxlength:'500',placeholder:'What should people post?'});
      const dur=h('select',null,[[3,'3 days'],[7,'1 week'],[14,'2 weeks']].map(o=>h('option',{value:o[0],selected:o[0]===7},o[1])));
      const pv=h('div',{class:'ad-prev'});
      b.append(h('div',{class:'stack pad'},field('Title',nm),field('About',ds),field('Voting lasts',dur,'The most voted entry wins a badge on their profile.'),h('div',{class:'f-label'},'Cover photo (optional)'),pv,
        h('button',{class:'btn block',onclick:async()=>{try{const f=await pickFile('image/jpeg,image/png,image/webp');if(!f)return;cover=await prepareImage(f,{max:1200});pv.replaceChildren(h('img',{src:URL.createObjectURL(cover.blob),alt:''}));}catch(e){toast(errMsg(e),'err');}}},icon('image'),'Choose cover'),
        h('button',{class:'btn primary block',onclick:e=>guard(e.currentTarget,async()=>{
          const n=nm.value.trim();if(n.length<3)throw new Error('Add a title.');
          let path=null;if(cover)path=await uploadFile('looks',cover.blob,cover.ext,cover.type);
          const row={owner_id:Auth.user.id,title:n,description:ds.value.trim()||null,cover_path:path,ends_at:new Date(Date.now()+Number(dur.value)*864e5).toISOString()};
          const r=await sb.from('challenges').insert(row).select().single();if(r.error){if(path)removeFile('looks',path);throw r.error;}
          toast('Challenge started','ok');close();tab='community';await draw();openChallenge(r.data.id);
        })},'Start challenge')));
    });
  }
  async function openChallenge(id){
    const v=pushView(h('div',{class:'lx-prof'},bar('Challenge'),spinner()));const wrap=v.firstChild;let seg3='top';
    const load=async()=>{
      const r=await sb.rpc('challenge_detail',{p_id:id});if(r.error||!r.data){wrap.replaceChildren(bar('Challenge'),empty('Not found','This challenge is no longer available.'));return;}
      const c=r.data;v._reload=load;
      const mineIn=c.entries.some(e=>e.mine);
      const join=c.ended?h('div',{class:'lx-ended'},'Voting has ended'+(c.entries[0]&&c.entries[0].votes?'. Winner: @'+c.entries[0].username:'')):
        h('button',{class:'btn primary block',disabled:mineIn,onclick:()=>{if(!authed())return;joinChallenge(c,load);}},mineIn?'You are in':'Participate');
      const list=seg3==='top'?c.entries:c.entries.slice().sort((a,b)=>String(b.created_at).localeCompare(String(a.created_at)));
      const vote=e=>h('button',{class:'lx-vote'+(e.voted?' on':''),'aria-label':e.voted?'Remove vote':'Vote','aria-pressed':String(!!e.voted),onclick:ev=>{
        if(!authed())return;if(e.mine){toast('You cannot vote for your own entry','err');return;}if(c.ended)return;
        guard(ev.currentTarget,async()=>{const x=e.voted?await sb.from('challenge_votes').delete().eq('entry_id',e.id).eq('user_id',Auth.user.id):await sb.from('challenge_votes').insert({entry_id:e.id});if(x.error)throw x.error;await load();});}},
        h('span',{html:Posts.eyeSvg(!!e.voted)}),h('b',null,String(e.votes)));
      wrap.replaceChildren(bar(c.title,c.mine?h('button',{class:'lx-circ','aria-label':'Delete challenge',onclick:async()=>{if(!await confirmBox('Delete this challenge?','All entries will be removed.','Delete',true))return;const x=await sb.from('challenges').delete().eq('id',id);if(x.error){toast(errMsg(x.error),'err');return;}popView();drawCommunity();}},icon('trash')):null),
        h('div',{class:'lx-scroll'},c.cover_path?h('img',{class:'lx-cover',src:ph(c.cover_path),alt:''}):h('div',{class:'lx-cover ph'},logoEl(64)),
          h('div',{class:'lx-info'},h('h2',null,c.title),h('p',{class:'muted'},'by @'+c.owner+' · '+leftTxt(c)),c.description&&h('p',null,c.description),join,
            h('div',{class:'lx-chips lx-spottabs'},[['top','Top'],['recent','Recent']].map(t=>h('button',{class:seg3===t[0]?'on':'',onclick:()=>{seg3=t[0];load();}},t[1]))),
            list.length?h('div',{class:'lx-mas'},list.map((e,i)=>h('div',{class:'lx-card'},h('div',{class:'lx-cardimg'},h('img',{src:ph(e.photo_path),alt:e.caption||'',loading:'lazy'}),(c.ended&&seg3==='top'&&i===0&&e.votes>0)?h('span',{class:'lx-crownTag'},icon('trophy'),'Winner'):null),
              h('div',{class:'lx-capr'},h('button',{class:'lx-cap lx-who',onclick:()=>openProfile(e.username)},(e.caption?e.caption+' · ':'')+'@'+e.username),vote(e)),
              e.mine&&!c.ended?h('button',{class:'lx-del','aria-label':'Delete my entry',onclick:async()=>{const x=await sb.from('challenge_entries').delete().eq('id',e.id);if(x.error)toast(errMsg(x.error),'err');else{toast('Removed');load();}}},icon('trash')):null))):
              empty('Be the first to join','Post a photo of your take and let people vote.'))));
    };
    load();
  }
  function joinChallenge(c,done){
    let photo=null;
    sheet('Join: '+c.title,(b,close)=>{const cap=h('input',{type:'text',maxlength:'200',placeholder:'Caption (optional)'}),pv=h('div',{class:'ad-prev'});
      b.append(h('div',{class:'stack pad'},pv,h('button',{class:'btn block',onclick:async()=>{try{const f=await pickFile('image/jpeg,image/png,image/webp');if(!f)return;photo=await prepareImage(f,{max:1400});pv.replaceChildren(h('img',{src:URL.createObjectURL(photo.blob),alt:''}));}catch(e){toast(errMsg(e),'err');}}},icon('image'),'Choose a photo'),field('Caption',cap),
        h('button',{class:'btn primary block',onclick:e=>guard(e.currentTarget,async()=>{if(!photo)throw new Error('Choose a photo first.');const path=await uploadFile('looks',photo.blob,photo.ext,photo.type);const r=await sb.from('challenge_entries').insert({challenge_id:c.id,user_id:Auth.user.id,photo_path:path,caption:cap.value.trim()||null});if(r.error){removeFile('looks',path);throw r.error;}toast('You are in!','ok');close();done();})},'Post entry')));});
  }

  live(()=>{saved=null;feed=null;if(!stack.length)draw();});
  if(it.me&&Auth.user&&Auth.profile)setTimeout(()=>openProfile(Auth.profile.username),50);
  else if(it.me)authed();
  else if(it.challenge)setTimeout(()=>openChallenge(it.challenge),80);
  else if(it.group)setTimeout(()=>openGroup(it.group),80);
  else if(it.profile)setTimeout(()=>openProfile(it.profile),80);
  else if(it.post)sb.rpc('discover_posts',{p_ids:[it.post]}).then(r=>{const x=(r.data||[])[0];if(x)openPost(x);});
  draw();
}});
