/* ---------- LUKKS APP: discover style (Pinterest-style, iOS look), save ideas, challenges and groups ---------- */
defApp({id:'lukks',name:'Lukks',bg:'#0b0710',glyph:()=>LOGO_SVG.replace('class="lk-logo"','class="lk-logo st"'),
mount(el,ctx,live){
  const CATS=[].concat(...Object.values(CFG.categories));
  const ph=p=>publicUrl('looks',p);
  let tab='home',cat='',feed=null,seg='challenges',savedSeg='collections',saved=null,searchQ='';
  const stack=[];
  const it=ctx.intent||{};if(it.cat){const m=CATS.find(c=>c.toLowerCase()===String(it.cat).toLowerCase());if(m)cat=m;else{tab='search';searchQ=String(it.cat);}}
  const root=h('div',{class:'lx'});el.append(root);
  const main=h('div',{class:'lx-main'});
  const pill=h('nav',{class:'lx-nav'});
  root.append(main,pill);
  ctx.onBack=()=>{if(stack.length){popView();return true;}return false;};

  const authed=()=>{if(Auth.user)return true;toast('Sign in to do that','err');ctx.open('account',{mode:'signin'});return false;};
  function pushView(node){const v=h('div',{class:'lx-view'},node);root.append(v);stack.push(v);return v;}
  function popView(){const v=stack.pop();if(v)v.remove();}
  const backBtn=cls=>h('button',{class:'lx-circ '+(cls||''),'aria-label':'Back',onclick:popView},icon('back'));
  const bar=(title,right)=>h('div',{class:'lx-bar'},backBtn(),h('b',null,title),h('span',{class:'lx-r'},right));
  const avatar=p=>avatarEl(p,'lx-av');

  /* ---------- data ---------- */
  async function loadFeed(force){
    if(feed&&!force)return;
    const r=await sb.rpc('discover_lukks',{p_limit:80});
    if(r.error)throw r.error;feed=Array.isArray(r.data)?r.data:[];
  }
  async function loadSaved(){
    if(!Auth.user){saved={boards:[],saves:[],lukks:[]};return;}
    const [b,s]=await Promise.all([sb.from('save_boards').select('*').order('created_at',{ascending:false}),sb.from('saves').select('look_id,board_id,created_at').order('created_at',{ascending:false})]);
    const saves=s.data||[];let lukks=[];
    if(saves.length){const r=await sb.rpc('discover_lukks',{p_limit:80,p_ids:saves.map(x=>x.look_id)});lukks=Array.isArray(r.data)?r.data:[];}
    saved={boards:b.data||[],saves,lukks};
  }
  const isSaved=id=>saved&&saved.saves.some(s=>s.look_id===id);

  /* ---------- shell ---------- */
  function drawNav(){
    const t=(id,ic,label)=>h('button',{class:tab===id?'on':'','aria-label':label,onclick:()=>{tab=id;stack.splice(0).forEach(v=>v.remove());draw();}},icon(ic),h('span',null,label));
    pill.replaceChildren(h('div',{class:'lx-pill'},t('home','home','Home'),t('saved','bookmark','Saved'),t('community','people','Community')),
      h('button',{class:'lx-search-btn'+(tab==='search'?' on':''),'aria-label':'Search',onclick:()=>{tab='search';stack.splice(0).forEach(v=>v.remove());draw();}},icon('search')));
  }
  async function draw(){
    drawNav();
    main.replaceChildren(spinner());
    try{
      if(tab==='home'){await loadFeed();drawHome();}
      else if(tab==='saved'){if(!Auth.user){main.replaceChildren(titleBar('Saved'),gate(ctx,'Sign in to save lukks and make collections.','signup'));return;}await Promise.all([loadFeed(),loadSaved()]);drawSaved();}
      else if(tab==='community')await drawCommunity();
      else{await loadFeed();drawSearch();}
    }catch(e){main.replaceChildren(titleBar('Lukks'),empty('Could not load',errMsg(e),h('button',{class:'btn',onclick:()=>{feed=null;draw();}},'Try again')));}
  }
  function titleBar(t,right){
    const p=Auth.profile;
    return h('div',{class:'lx-title'},h('h1',null,t),h('span',{class:'grow'}),right,h('button',{class:'lx-me','aria-label':'Profile',onclick:()=>ctx.open('profile')},Auth.user?avatar(p):icon('user')));
  }
  const masonry=(list,open)=>list.length?h('div',{class:'lx-mas'},list.map(x=>h('button',{class:'lx-card',onclick:()=>open(x)},h('img',{src:ph(x.photo_path),alt:x.title,loading:'lazy'}),h('span',{class:'lx-cap'},x.title)))):null;

  /* ---------- Home ---------- */
  function drawHome(){
    const chips=h('div',{class:'lx-chips'},['For You'].concat(CATS).map(c=>h('button',{class:(c==='For You'&&!cat)||c===cat?'on':'',onclick:()=>{cat=c==='For You'?'':c;drawHome();}},c)));
    const list=feed.filter(x=>!cat||x.category===cat);
    const body=masonry(list,openLukk)||empty(cat?'No lukks in '+cat+' yet':'No lukks yet',cat?'Be the first: add a lukk with this category.':'Add a lukk from your Profile and share it with everyone.',h('button',{class:'btn primary',onclick:()=>ctx.open('profile')},'Open my profile'));
    main.replaceChildren(titleBar('Home'),chips,h('div',{class:'lx-scroll'},body));
    const sc=$('.lx-chips .on',main);sc&&sc.scrollIntoView({inline:'center',block:'nearest'});
  }

  /* ---------- Lukk detail ---------- */
  function openLukk(x){
    const same=feed?feed.filter(y=>y.id!==x.id&&x.category&&y.category===x.category):[];
    const more=same.length?same:(feed||[]).filter(y=>y.id!==x.id).slice(0,12);
    const ext=x.external_url&&safeUrl(x.external_url);
    const saveBtn=h('button',{class:'lx-pillbtn'},icon('bookmark'),h('span',null,isSaved(x.id)?'Saved':'Save'));
    const refreshSave=()=>{saveBtn.classList.toggle('on',isSaved(x.id));saveBtn.lastChild.textContent=isSaved(x.id)?'Saved':'Save';};
    saveBtn.onclick=()=>{if(!authed())return;guard(saveBtn,async()=>{if(!saved)await loadSaved();saveSheet(x,refreshSave);});};
    const v=pushView(h('div',{class:'lx-detail'},
      h('div',{class:'lx-hero'},h('img',{src:ph(x.photo_path),alt:x.title}),h('div',{class:'lx-herotop'},backBtn('glass'),h('span',{class:'grow'}),
        h('button',{class:'lx-circ glass','aria-label':'Share',onclick:()=>{const u=profileUrl(x.username,x.id);if(navigator.share)navigator.share({title:x.title+' on Lukks',url:u}).catch(()=>{});else copyText(u).then(()=>toast('Link copied'));}},icon('share')))),
      h('div',{class:'lx-info'},h('h2',null,x.title),
        h('button',{class:'lx-author',onclick:()=>openProfile(x)},avatar({avatar_url:x.avatar_url,display_name:x.display_name,username:x.username}),h('span',null,x.display_name||'@'+x.username),icon('chevR')),
        h('div',{class:'lx-acts'},saveBtn,same.length?h('button',{class:'lx-pillbtn',onclick:()=>similarSheet(x,same)},icon('bookmark'),h('span',null,'Similar')):null,ext?h('button',{class:'lx-pillbtn',onclick:()=>openExternal(ext)},icon('link'),h('span',null,'See more')):null),
        x.category&&h('span',{class:'lx-tag'},x.category),
        (x.items&&x.items.length)?h('div',{class:'group',style:{margin:'12px 0 0'}},x.items.map(i=>h('div',{class:'item'},h('span',{class:'grow'},h('b',null,i.name),h('span',null,i.brand||'')),i.price!=null&&h('span',{class:'muted'},fmtMoney(i.price,'NGN'))))):null,
        more.length?h('h3',{class:'lx-h3'},'More ideas'):null,more.length?masonry(more.slice(0,16),y=>{popView();openLukk(y);}):null)));
    v.classList.add('full');
  }
  function similarSheet(x,list){
    sheet('Similar',(b,close)=>{b.append(h('div',{class:'lx-simhead'},h('img',{src:ph(x.photo_path),alt:''}),h('span',null,h('b',null,x.title),h('em',null,list.length+' similar ideas'))),masonry(list,y=>{close();setTimeout(()=>{popView();openLukk(y);},260);}));});
  }
  async function openProfile(x){
    const v=pushView(h('div',{class:'lx-prof'},bar(x.display_name||'@'+x.username),spinner()));
    const r=await sb.rpc('get_public_profile',{p_username:x.username});
    const wrap=v.firstChild;
    if(r.error||!r.data){wrap.replaceChildren(bar('Profile'),empty('Profile unavailable','This profile is private or no longer exists.'));return;}
    wrap.replaceChildren(bar('@'+x.username,h('button',{class:'lx-circ','aria-label':'Share profile',onclick:()=>{const u=profileUrl(x.username);if(navigator.share)navigator.share({title:x.username+' on Lukks',url:u}).catch(()=>{});else copyText(u).then(()=>toast('Link copied'));}},icon('share'))),h('div',{class:'lx-profbody'},renderPublicProfile(r.data,{hideFooter:true,highlight:x.id})));
  }

  /* ---------- Save to collection ---------- */
  function saveSheet(x,done){
    sheet('Save to',(b,close)=>{
      const draw2=async()=>{
        if(!isSaved(x.id)){const r=await sb.from('saves').upsert({user_id:Auth.user.id,look_id:x.id},{onConflict:'user_id,look_id'});if(r.error){toast(errMsg(r.error),'err');close();return;}saved.saves.unshift({look_id:x.id,board_id:null});saved.lukks.unshift(x);toast('Saved','ok');done&&done();}
        const cur=saved.saves.find(s=>s.look_id===x.id);
        const nm=h('input',{type:'text',maxlength:'40',placeholder:'New collection name'});
        const add=h('button',{class:'btn primary',onclick:e=>guard(e.currentTarget,async()=>{const n=nm.value.trim();if(!n)return;const r=await sb.from('save_boards').insert({user_id:Auth.user.id,name:n}).select().single();if(r.error)throw r.error;saved.boards.unshift(r.data);await pick(r.data.id);})},'Create');
        b.replaceChildren(h('div',{class:'lx-newrow'},nm,add),
          h('div',{class:'group',style:{margin:'10px 14px'}},[{id:null,name:'All ideas'}].concat(saved.boards).map(bd=>{const n=saved.saves.filter(s=>s.board_id===bd.id).length;return h('button',{class:'item',onclick:()=>pick(bd.id)},h('span',{class:'grow'},h('b',null,bd.name),h('span',null,n+' ideas')),cur&&cur.board_id===bd.id?h('span',{style:{color:'var(--maroon)'}},icon('check')):null);})),
          h('div',{class:'pad'},h('button',{class:'btn danger block',onclick:e=>guard(e.currentTarget,async()=>{const r=await sb.from('saves').delete().eq('look_id',x.id).eq('user_id',Auth.user.id);if(r.error)throw r.error;saved.saves=saved.saves.filter(s=>s.look_id!==x.id);saved.lukks=saved.lukks.filter(l=>l.id!==x.id);toast('Removed');done&&done();close();})},'Remove from saved')));
      };
      const pick=async id=>{const r=await sb.from('saves').update({board_id:id}).eq('look_id',x.id).eq('user_id',Auth.user.id);if(r.error){toast(errMsg(r.error),'err');return;}const s=saved.saves.find(z=>z.look_id===x.id);if(s)s.board_id=id;toast('Saved','ok');done&&done();close();};
      draw2();
    });
  }

  /* ---------- Saved tab ---------- */
  function drawSaved(){
    const sg=h('div',{class:'seg lx-seg'},[['collections','Collections'],['ideas','Ideas']].map(t=>h('button',{class:savedSeg===t[0]?'on':'',onclick:()=>{savedSeg=t[0];drawSaved();}},t[1])));
    const add=h('button',{class:'lx-circ','aria-label':'New collection',onclick:newBoard},icon('plus'));
    const body=h('div',{class:'lx-scroll'});
    if(savedSeg==='ideas'){body.append(masonry(saved.lukks,openLukk)||empty('No saved ideas','Tap Save on any lukk to keep it here.'));}
    else{
      if(!saved.boards.length)body.append(empty('No collections yet','Make a collection to organise the lukks you love.',h('button',{class:'btn primary',onclick:newBoard},'New collection')));
      else body.append(h('div',{class:'lx-boards'},saved.boards.map(bd=>{const ids=saved.saves.filter(s=>s.board_id===bd.id).map(s=>s.look_id);const ls=ids.map(i=>saved.lukks.find(l=>l.id===i)).filter(Boolean);
        return h('button',{class:'lx-board',onclick:()=>openBoard(bd)},h('div',{class:'lx-mosaic'},[0,1,2,3].map(i=>ls[i]?h('img',{src:ph(ls[i].photo_path),alt:''}):h('i',null))),h('b',null,bd.name),h('span',null,ids.length+' ideas'));})));
    }
    main.replaceChildren(titleBar('Saved',add),h('div',{class:'pad',style:{paddingBottom:0}},sg),body);
  }
  function newBoard(){
    if(!authed())return;
    sheet('New collection',(b,close)=>{const nm=h('input',{type:'text',maxlength:'40',placeholder:'Collection name'});
      b.append(h('div',{class:'stack pad'},field('Name',nm),h('button',{class:'btn primary block',onclick:e=>guard(e.currentTarget,async()=>{const n=nm.value.trim();if(!n)throw new Error('Give it a name.');const r=await sb.from('save_boards').insert({user_id:Auth.user.id,name:n}).select().single();if(r.error)throw r.error;saved.boards.unshift(r.data);close();drawSaved();})},'Create')));});
  }
  function openBoard(bd){
    const ids=saved.saves.filter(s=>s.board_id===bd.id).map(s=>s.look_id);const ls=ids.map(i=>saved.lukks.find(l=>l.id===i)).filter(Boolean);
    pushView(h('div',{class:'lx-prof'},bar(bd.name,h('button',{class:'lx-circ','aria-label':'Delete collection',onclick:async()=>{if(!await confirmBox('Delete “'+bd.name+'”?','Saved lukks stay in All ideas.','Delete',true))return;const r=await sb.from('save_boards').delete().eq('id',bd.id);if(r.error){toast(errMsg(r.error),'err');return;}saved.boards=saved.boards.filter(b=>b.id!==bd.id);saved.saves.forEach(s=>{if(s.board_id===bd.id)s.board_id=null;});popView();drawSaved();}},icon('trash'))),
      h('div',{class:'lx-scroll'},masonry(ls,openLukk)||empty('Empty collection','Save a lukk and choose this collection.'))));
  }

  /* ---------- Search ---------- */
  function drawSearch(){
    const qi=h('input',{type:'search',placeholder:'Search lukks, styles or people',value:searchQ,'aria-label':'Search'});
    const out=h('div',{class:'lx-scroll'});
    let t;
    const run=async()=>{
      const s=searchQ.trim();out.replaceChildren();
      if(s){out.append(spinner());const r=await sb.rpc('discover_lukks',{p_limit:60,p_q:s});if(searchQ.trim()!==s)return;out.replaceChildren(r.error?empty('Search failed',errMsg(r.error)):(masonry(Array.isArray(r.data)?r.data:[],openLukk)||empty('Nothing found','Try another style, piece or name.')));return;}
      const counts=CATS.map(c=>({c,n:feed.filter(x=>x.category===c).length,cover:(feed.find(x=>x.category===c)||{}).photo_path}));
      const go=c=>{cat=c;tab='home';draw();};
      out.append(h('h3',{class:'lx-h3'},'Ideas for You'),h('div',{class:'lx-tiles'},counts.slice(0,8).map(o=>h('button',{class:'lx-tile',onclick:()=>go(o.c)},o.cover?h('img',{src:ph(o.cover),alt:''}):h('div',{class:'lx-tilebg'},logoEl(40)),h('span',null,o.c)))),
        h('h3',{class:'lx-h3'},'Trending'),h('div',{class:'group',style:{margin:'0 0 90px'}},counts.slice().sort((a,b)=>b.n-a.n).slice(0,6).map(o=>h('button',{class:'item',onclick:()=>go(o.c)},icon('search'),h('span',{class:'grow'},h('b',null,o.c.toLowerCase())),h('span',{class:'muted'},o.n+' lukks')))));
    };
    qi.oninput=()=>{searchQ=qi.value;clearTimeout(t);t=setTimeout(run,300);};
    main.replaceChildren(h('div',{class:'lx-title'},h('h1',null,'Search')),h('div',{class:'pad',style:{paddingBottom:0}},h('label',{class:'lk-search wide'},icon('search'),qi)),out);run();
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

  live(()=>{saved=null;if(tab==='saved'||tab==='community')draw();});
  draw();
}});
