/* ---------- OPENWALLS app: Wall, Discover, Create, Inbox, Me, room editor and visitor view ---------- */
Object.assign(IC,{
  compass:'<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>',
  sofa:'<path d="M5 11V8a2 2 0 012-2h10a2 2 0 012 2v3"/><path d="M3 12a2 2 0 014 0v3h10v-3a2 2 0 014 0v5H3z"/><path d="M6 19v1.5M18 19v1.5"/>',
  frame:'<rect x="4" y="4" width="16" height="16" rx="1.5"/><path d="M7.5 16l3-4 2.5 3 2-2 2 3"/><circle cx="9" cy="9" r="1.2"/>',
  rotate:'<path d="M20 12a8 8 0 11-2.6-5.9"/><path d="M20 4v4h-4"/>',
  palette:'<path d="M12 3a9 9 0 100 18c1.4 0 2-1 1.5-2-.6-1.2.1-2.5 1.5-2.5H17a4 4 0 004-4c0-5-4-9.500-9-9.500z"/><circle cx="8" cy="11" r="1.1"/><circle cx="11" cy="7.500" r="1.1"/><circle cx="15.500" cy="8.500" r="1.1"/>',
  cube:'<path d="M12 3l8 4.500v9L12 21l-8-4.500v-9z"/><path d="M12 12l8-4.500M12 12v9M12 12L4 7.500"/>',
  house:'<path d="M4 11l8-7 8 7"/><path d="M6 10v10h12V10"/><path d="M10 20v-5h4v5"/>',
  inbox:'<path d="M4 13l2-8h12l2 8v6H4z"/><path d="M4 13h5l1 2h4l1-2h5"/>',
  reset:'<path d="M4 12a8 8 0 108-8"/><path d="M4 4v5h5"/>',
  more:'<circle cx="5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="19" cy="12" r="1.4"/>'
});
const $view=()=>document.getElementById('view'),$nav=()=>document.getElementById('nav');
const App={teardown:null,route:'',visited:{}};
const CATS=['Music','Football','Basketball','Movies','Gaming','Fashion','Travel','Photography','Books','Technology','Lifestyle','Art','Food'];
const EMOJI={love:'❤️',fire:'🔥',wow:'😮',clap:'👏'};
const needAuth=why=>{if(Auth.user)return true;authSheet('signin',why||'Sign in to do that');return false;};
const roomUrl=u=>CFG.site+'#/@'+u;
const ytId=u=>{try{const x=new URL(u);if(/youtu\.be$/.test(x.hostname))return x.pathname.slice(1);if(/youtube\.com$/.test(x.hostname)){if(x.searchParams.get('v'))return x.searchParams.get('v');const m=x.pathname.match(/\/(embed|shorts)\/([\w-]+)/);if(m)return m[2];}}catch(e){}return null;};
const go=hash=>{if(location.hash===hash)route();else location.hash=hash;};
function setView(full){const v=$view();v.classList.toggle('full',!!full);v.scrollTop=0;v.replaceChildren();$nav().classList.toggle('hide',!!full);return v;}
function teardown(){if(App.teardown){try{App.teardown();}catch(e){}App.teardown=null;}}

/* ---------- navigation ---------- */
const NAV=[['wall','Wall','house'],['discover','Discover','compass'],['create','Create','plus'],['inbox','Inbox','inbox'],['me','Me','user']];
let unreadN=0;
function drawNav(active){
  $nav().replaceChildren(...NAV.map(([k,l,ic])=>h('button',{class:'nv'+(k==='create'?' plus':'')+(k===active?' on':''),'aria-label':l+(k==='inbox'&&unreadN?' ('+unreadN+' unread)':''),'aria-current':k===active?'page':null,onclick:()=>k==='create'?create():go('#/'+k)},icon(ic),k==='create'?null:h('span',{class:'l'},l),k==='inbox'&&unreadN?h('i',{class:'badge'},unreadN>9?'9+':String(unreadN)):null)));
}
async function refreshUnread(){const n=await Store.unread();if(n!==unreadN){unreadN=n;const m=App.route.split('/')[0];if(['wall','discover','inbox','me'].includes(m||'wall'))drawNav(m||'wall');}}
setInterval(()=>{if(Auth.user&&!document.hidden)refreshUnread();},45000);
async function create(){
  if(!Auth.user){authSheet('signup','Create an account to build your room');return;}
  go('#/edit');
}

/* ---------- sign in / account ---------- */
function authSheet(mode,why){
  mode=mode||'signin';
  sheet(mode==='signup'?'Create your account':mode==='reset'?'Reset password':'Welcome back',(body,close)=>{
    const err=h('p',{class:'f-hint',style:{color:'#b3261e',minHeight:'18px'}});
    const em=h('input',{type:'email',autocomplete:'email',placeholder:'you@email.com'});const pw=h('input',{type:'password',autocomplete:mode==='signup'?'new-password':'current-password',placeholder:'Password (8+ characters)'});
    const name=h('input',{type:'text',maxlength:'60',placeholder:'Your name'}),user=h('input',{type:'text',maxlength:'24',autocapitalize:'none',placeholder:'username'}),hint=h('span',{class:'f-hint'},'3 to 24 letters, numbers or underscores.');
    let t;user.addEventListener('input',()=>{user.value=slugify(user.value);clearTimeout(t);if(user.value.length<3){hint.textContent='3 to 24 letters, numbers or underscores.';return;}t=setTimeout(async()=>{const r=await sb.rpc('username_available',{p_username:user.value});hint.textContent=r.error?'':(r.data?'✓ Available':'Already taken');},350);});
    const eye=h('button',{type:'button',class:'pw-eye','aria-label':'Show password'},icon('eye'));eye.onclick=()=>{const s=pw.type==='password';pw.type=s?'text':'password';eye.replaceChildren(icon(s?'eyeOff':'eye'));};
    const go1=h('button',{class:'btn primary block',type:'submit'},mode==='signup'?'Create account':mode==='reset'?'Send reset link':'Sign in');
    const form=h('form',{onsubmit:async e=>{e.preventDefault();err.textContent='';
      if(mode==='signup'&&user.value.length<3){err.textContent='Choose a username (3+ characters).';return;}
      if(mode!=='reset'&&pw.value.length<8){err.textContent='Password must be at least 8 characters.';return;}
      await guard(go1,async()=>{
        if(mode==='reset'){const r=await Auth.resetPassword(em.value.trim());if(r.error)throw r.error;toast('Check your email','ok');close();return;}
        if(mode==='signup'){const r=await Auth.signUp(em.value.trim(),pw.value,{username:user.value,display_name:name.value.trim()});if(r.error)throw r.error;if(r.needsConfirm){toast('Check your email to confirm your account','ok');close();return;}}
        else{const r=await Auth.signIn(em.value.trim(),pw.value);if(r.error)throw r.error;}
        close();toast('Welcome to OpenWalls','ok');
      });}},
      why?h('p',{class:'tag',style:{marginBottom:'12px'}},why):null,
      mode==='signup'?[field('Name',name),h('label',{class:'field'},h('span',{class:'f-label'},'Username'),user,hint)]:null,
      field('Email',em),mode==='reset'?null:field('Password',h('div',{class:'pw-wrap'},pw,eye)),err,go1,
      h('div',{style:{display:'flex',justifyContent:'space-between',marginTop:'12px'}},
        mode==='signin'?h('button',{type:'button',class:'btn small',onclick:()=>{close();authSheet('reset');}},'Forgot password'):null,
        h('button',{type:'button',class:'btn small',onclick:()=>{close();authSheet(mode==='signup'?'signin':'signup');}},mode==='signup'?'I have an account':'Create account')));
    body.append(form);
  });
}
function editProfileSheet(){
  const p=Auth.profile||{};
  sheet('Edit profile',(body,close)=>{
    const dn=h('input',{type:'text',maxlength:'60',value:p.display_name||''}),un=h('input',{type:'text',maxlength:'24',value:p.username||'',autocapitalize:'none'}),bio=h('textarea',{maxlength:'240'});bio.value=p.bio||'';
    const hint=h('span',{class:'f-hint'});let t;un.addEventListener('input',()=>{un.value=slugify(un.value);clearTimeout(t);if(un.value===p.username||un.value.length<3){hint.textContent='';return;}t=setTimeout(async()=>{const r=await sb.rpc('username_available',{p_username:un.value});hint.textContent=r.error?'':(r.data?'✓ Available':'Already taken');},350);});
    const av=h('button',{class:'btn small',onclick:async()=>{const f=await pickFile('image/jpeg,image/png,image/webp');if(!f)return;await guard(av,async()=>{const pr=await prepareImage(f,{max:512,quality:.85,maxMB:CFG.limits.avatarMB*3});const path=await uploadFile('avatars',pr.blob,'jpg','image/jpeg');const url=publicUrl('avatars',path);const r=await Auth.saveProfile({avatar_url:url});if(r.error)throw r.error;toast('Photo updated','ok');close();route();});}},'Change photo');
    const save=h('button',{class:'btn primary block',onclick:()=>guard(save,async()=>{const r=await Auth.saveProfile({display_name:dn.value.trim()||null,username:un.value,bio:bio.value.trim()||null});if(r.error)throw r.error;toast('Saved','ok');close();route();})},'Save');
    body.append(h('div',{style:{display:'flex',alignItems:'center',gap:'12px',marginBottom:'14px'}},avatarEl(p,'lg'),av),field('Name',dn),h('label',{class:'field'},h('span',{class:'f-label'},'Username'),un,hint),field('Bio',bio),save);
  });
}

/* ---------- MAIN WALL: an exhibition of everyone's rooms ---------- */
function rxBtn(r){
  const b=h('button',{class:'rx'+(r.mine?' on':''),'aria-label':'React to this room'});const paint=()=>{b.className='rx'+(r.mine?' on':'');b.replaceChildren(h('span',null,r.mine?EMOJI[r.mine]:'♡'),h('span',null,r.reactions?String(r.reactions):''));};paint();
  b.onclick=()=>{if(!needAuth('Sign in to react to rooms'))return;const was=r.mine;guard(b,async()=>{await Store.react(r.id,was?null:'love');r.mine=was?null:'love';r.reactions=Math.max(0,(+r.reactions||0)+(was?-1:1));paint();});};
  return b;}
function roomPiece(r,i){
  const prev=Store.previewUrl(r.theme,r.updated_at);
  const shot=prev?h('img',{class:'pshot',src:prev,alt:r.name+' by @'+r.username,loading:'lazy',decoding:'async'}):h('div',{class:'pshot ph'},r.name);
  return h('div',{class:'piece'},h('button',{class:'pframe','aria-label':'Visit '+r.name,onclick:()=>go('#/@'+r.username)},shot),
    h('div',{class:'plaque'},avatarEl({avatar_url:r.avatar_url,display_name:r.display_name,username:r.username},'sm'),h('div',{class:'who'},h('b',null,r.name),h('span',{class:'s'},'@'+r.username)),rxBtn(r),h('button',{class:'visit',onclick:()=>go('#/@'+r.username)},'Visit')),
    r.visits?h('div',{class:'vis'},r.visits+(r.visits===1?' visit':' visits')):null);
}
async function wallView(){
  const v=setView(false);drawNav('wall');
  const ex=h('div',{class:'exhibit'},h('div',{class:'pg-head'},h('div',{class:'brand'},logoEl(38),h('b',null,'OpenWalls')),h('p',{class:'tag'},'Discover what’s on everyone’s walls.')),h('div',{class:'ex-body'},spinner()));
  v.append(ex);const body=ex.querySelector('.ex-body');
  try{
    const rows=await Store.feed(30,0);
    if(!rows.length){body.replaceChildren(empty('The wall is empty','Be the first to hang your room here.',h('button',{class:'btn coral',onclick:create},'Build my room')));return;}
    /* keep it varied: no one creator takes over (feed is already scored on freshness and visits) */
    body.replaceChildren(h('div',{class:'ex-grid'},rows.map(roomPiece)));
  }catch(e){body.replaceChildren(empty('Could not load the wall',friendlyError(e),h('button',{class:'btn',onclick:wallView},'Try again')));}
}
/* ---------- DISCOVER ---------- */
async function discoverView(){
  const v=setView(false);drawNav('discover');let all=[],cat=null;
  const chips=h('div',{class:'scrollx'}),sec=h('div');
  v.append(h('div',{class:'pg-head'},h('div',{class:'brand'},h('b',null,'Discover')),h('p',{class:'tag'},'Rooms, creators and interests.')),chips,sec);
  const paint=()=>{
    chips.replaceChildren(...[null,...CATS].map(c=>h('button',{class:'chip'+(c===cat?' on':''),onclick:()=>{cat=c;paint();}},c||'All')));
    const rows=cat?all.filter(r=>(r.categories||[]).includes(cat)):all;
    if(!rows.length){sec.replaceChildren(empty(cat?'No '+cat+' rooms yet':'No rooms yet',cat?'Rooms can pick interests in their room settings.':'Check back soon.'));return;}
    const trend=[...rows].sort((a,b)=>b.visits-a.visits).slice(0,8),fresh=[...rows].sort((a,b)=>new Date(b.created_at||b.updated_at)-new Date(a.created_at||a.updated_at));
    const seen={},creators=[...rows].sort((a,b)=>b.visits-a.visits).filter(r=>!seen[r.username]&&(seen[r.username]=1)).slice(0,12);
    sec.replaceChildren(
      h('h2',{class:'sec'},'Trending rooms'),h('div',{class:'trend'},trend.map(r=>{const p=Store.previewUrl(r.theme,r.updated_at);return h('button',{class:'tcard',onclick:()=>go('#/@'+r.username)},p?h('img',{src:p,alt:'',loading:'lazy'}):h('div',{class:'pshot ph'},r.name),h('div',{class:'tb'},avatarEl({avatar_url:r.avatar_url,display_name:r.display_name,username:r.username},'sm'),h('div',null,h('b',null,r.name),h('span',{class:'s'},'@'+r.username+' · '+r.visits+' visits'))));})),
      h('h2',{class:'sec'},'Popular creators'),h('div',{class:'creators'},creators.map(r=>h('button',{class:'creator',onclick:()=>go('#/@'+r.username)},avatarEl({avatar_url:r.avatar_url,display_name:r.display_name,username:r.username}),'@'+r.username))),
      h('h2',{class:'sec'},'New rooms'),h('div',{class:'ex-grid',style:{background:'none'}},fresh.map(roomPiece)));
  };
  sec.replaceChildren(spinner());paint();
  try{all=await Store.feed(50,0);paint();}catch(e){sec.replaceChildren(empty('Could not load rooms',friendlyError(e)));}
}
/* ---------- ME ---------- */
async function meView(){
  const v=setView(false);drawNav('me');
  if(!Auth.user){v.append(h('div',{class:'pg-head'},h('div',{class:'brand'},logoEl(38),h('b',null,'OpenWalls'))),empty('Your room is waiting','Sign in to build your room and share it with everyone.',h('div',{style:{display:'flex',gap:'8px',justifyContent:'center'}},h('button',{class:'btn coral',onclick:()=>authSheet('signup')},'Create account'),h('button',{class:'btn',onclick:()=>authSheet('signin')},'Sign in'))));return;}
  const p=Auth.profile||{};v.append(spinner());
  let mine=null,cn={followers:0,following:0};try{[mine,cn]=await Promise.all([Store.mine(),Store.counts(Auth.user.id)]);}catch(e){console.warn(e);}
  const room=mine&&mine.room,prev=room&&Store.previewUrl(room.theme,room.updated_at);
  v.replaceChildren(h('div',{class:'pg-head'},h('div',{class:'brand'},h('b',null,'Me'))),
    h('div',{class:'me-card'},avatarEl(p,'lg'),h('h3',null,p.display_name||p.username||'You'),h('div',{class:'un'},'@'+(p.username||'')),p.bio?h('p',null,p.bio):null,h('div',{class:'counts'},h('div',null,h('b',null,cn.followers),h('span',null,'followers')),h('div',null,h('b',null,cn.following),h('span',null,'following')),h('div',null,h('b',null,room?room.visits:0),h('span',null,'room visits'))),h('button',{class:'btn small',onclick:editProfileSheet},'Edit profile')),
    h('div',{class:'roomcard'},prev?h('img',{class:'pshot',src:prev,alt:'Your room'}):h('div',{class:'pshot ph'},room?room.name:'Your room is not built yet'),
      h('div',{class:'row'},h('button',{class:'btn coral',onclick:()=>go('#/edit')},room?'Edit room':'Build my room'),room?h('button',{class:'btn light',onclick:()=>go('#/@'+p.username)},'View'):null,room?h('button',{class:'btn light',onclick:()=>shareRoom(p.username,room.name)},'Share'):null)),
    h('div',{class:'list'},room?h('button',{onclick:()=>roomSettings(room,()=>meView())},icon('sliders'),h('span',{class:'grow'},'Room settings'),h('span',{class:'f-hint'},room.visibility==='public'?'Public':'Private')):null,
      h('button',{onclick:privacySheet},icon('lock'),h('span',{class:'grow'},'Privacy & safety')),
      PWA.canInstall()?h('button',{onclick:()=>PWA.install()},icon('download'),h('span',{class:'grow'},'Install OpenWalls')):null,
      Auth.isAdmin?h('button',{onclick:()=>{location.href='admin.html';}},icon('lock'),h('span',{class:'grow'},'Admin')):null,
      h('button',{onclick:async()=>{await Auth.signOut();toast('Signed out');go('#/wall');}},icon('lock'),h('span',{class:'grow'},'Sign out'))));
}
async function shareRoom(username,name){
  const url=roomUrl(username);
  if(navigator.share){try{await navigator.share({title:name||'My room on OpenWalls',text:'Come and see my room on OpenWalls',url});return;}catch(e){if(e&&e.name==='AbortError')return;}}
  if(await copyText(url))toast('Room link copied','ok');else dialog({title:'Your room link',body:url});
}
function roomSettings(room,done){
  sheet('Room settings',(body,close)=>{
    const nm=h('input',{type:'text',maxlength:'60',value:room.name||''}),vis=h('select',null,h('option',{value:'public'},'Public: anyone with the link and on the Wall'),h('option',{value:'private'},'Private: only me'));vis.value=room.visibility==='private'?'private':'public';
    let cats=new Set(room.categories||[]);const cw=h('div',{class:'chips'});const pc=()=>cw.replaceChildren(...CATS.map(c=>h('button',{class:'chip'+(cats.has(c)?' on':''),onclick:()=>{cats.has(c)?cats.delete(c):cats.add(c);pc();}},c)));pc();
    const save=h('button',{class:'btn primary block',style:{marginTop:'14px'},onclick:()=>guard(save,async()=>{room.name=nm.value.trim()||'My room';room.visibility=vis.value;room.categories=[...cats];await Store.saveRoom(room);toast('Saved','ok');close();done&&done();})},'Save');
    body.append(field('Room name',nm),field('Who can see it',vis),h('div',{class:'field'},h('span',{class:'f-label'},'Interests (shown in Discover)'),cw),save);
  });
}

/* ---------- starter room: an improved Lagos living room ---------- */
function starterRoom(){
  const S=OW.SIZES.medium;
  const room={name:'My room',size:'medium',width:S.w,depth:S.d,height:S.h,theme:{key:'lagos'},categories:[],visibility:'public'};
  const f=(type,x,z,rot,extra)=>Object.assign({id:uuid(),kind:'furniture',type,x,y:0,z,rot:rot||0,scale:1,color:null,z_index:0,props:{}},extra||{});
  const d=(type,wall,x,y,extra)=>{const dd=OW.decor(type);return Object.assign({id:uuid(),kind:'decor',type,wall,x,y,z:0,rot:0,scale:1,width:dd.w,height:dd.h,frame:dd.frame||null,color:null,z_index:0,props:{}},extra||{});};
  const items=[f('rug',0,-.5),f('sofa',0,-2.15),f('coffee_table',0,-.6),f('bookshelf',-2.8,-1.2,Math.PI/2),f('plant',2.5,-2.2),f('floor_lamp',-2.5,-2.3),f('tv_stand',2.75,-.4,-Math.PI/2),f('tv',2.75,-.4,-Math.PI/2),
    d('curtains','back',1.08,1.5,{width:2.0,color:'#c4532d',z_index:1}),d('frame','back',-2.0,1.65,{z_index:2}),d('poster','back',-1.15,1.55,{z_index:3}),d('photo_frame','back',-.35,1.8,{z_index:4}),d('wall_clock','back',-1.15,2.3,{z_index:5}),d('neon','left',-.4,1.9,{title:'OPEN WALLS',z_index:6})];
  return{room,items};
}

/* ---------- ROOM EDITOR ---------- */
async function editorView(){
  if(!Auth.user){go('#/me');authSheet('signin','Sign in to edit your room');return;}
  const v=setView(true);const host=h('div',{class:'room'});v.append(host);
  if(!OWRoom.supported()){host.append(empty('3D is not available on this device','Try another browser or device to build your room.',h('button',{class:'btn',onclick:()=>go('#/me')},'Back')));return;}
  host.append(spinner('Opening your room…'));
  let data;try{data=await Store.mine();}catch(e){host.replaceChildren(empty('Could not open your room',friendlyError(e),h('button',{class:'btn',onclick:()=>go('#/me')},'Back')));return;}
  let fresh=false;if(!data){const s=starterRoom();data={room:s.room,items:s.items};fresh=true;}
  host.replaceChildren();
  let room=data.room,dirty=fresh,saving=false,savedIds=new Set(fresh?[]:data.items.map(i=>i.id)),timer=0,panel=null,statusEl=h('span',{class:'save'},fresh?'Not saved yet':'Saved'),titleEl=h('b',null,room.name||'My room');
  const R=new OWRoom(host,{edit:true,onSelect:it=>showPanel(it),onChange:()=>{dirty=true;statusEl.textContent='Unsaved changes';clearTimeout(timer);timer=setTimeout(()=>save(),2200);}});
  window.__room=R;
  R.load(room,data.items);
  async function save(withPreview){
    clearTimeout(timer);if(saving){timer=setTimeout(()=>save(withPreview),800);return;}
    if(!dirty&&!withPreview)return;saving=true;statusEl.textContent='Saving…';
    try{
      room=Object.assign(room,R.room);const items=R.items;
      if(!room.id){const r=await Store.createRoom(room,items);room=Object.assign(room,r);}
      else{const ids=new Set(items.map(i=>i.id));const removed=[...savedIds].filter(i=>!ids.has(i));await Store.saveRoom(room);await Store.saveItems(room.id,items,removed);}
      savedIds=new Set(items.map(i=>i.id));dirty=false;
      if(withPreview){statusEl.textContent='Saving preview…';try{const url=await OWRoom.preview(R.room,items,480,360);const path=await Store.uploadPreview(url);room.theme=Object.assign({},room.theme,{preview:path,pv:Date.now()});R.room.theme=room.theme;await Store.saveRoom(room);}catch(e){console.warn('preview',e);}}
      statusEl.textContent='Saved';
    }catch(e){console.error(e);statusEl.textContent='Could not save';toast(friendlyError(e),'err');dirty=true;}
    saving=false;
  }
  const finish=async()=>{statusEl.textContent='Saving…';await save(true);go('#/me');};
  const onHide=()=>{if(document.visibilityState==='hidden'&&dirty)save();};document.addEventListener('visibilitychange',onHide);
  App.teardown=()=>{clearTimeout(timer);document.removeEventListener('visibilitychange',onHide);R.destroy();window.__room=null;};
  host.append(h('div',{class:'rtop'},h('button',{class:'rbtn','aria-label':'Back',onclick:finish},icon('back')),h('div',{class:'rtitle'},titleEl,statusEl),
    h('button',{class:'rbtn','aria-label':'Reset camera',onclick:()=>R.resetCamera()},icon('reset')),h('button',{class:'rbtn dark',onclick:finish},'Done')));
  const tabs={};let active=null;
  const dock=h('div',{class:'dock'},h('div',{class:'bar'},
    ...[['furn','Furniture','sofa',()=>catalogue('living')],['wall','Wall','frame',()=>wallSheet()],['room','Room','house',()=>roomSheet()],['share','Share','share',async()=>{await save();if(!room.id){toast('Save your room first','err');return;}shareRoom(Auth.profile.username,room.name);}]].map(([k,l,ic,fn])=>h('button',{class:'dk',onclick:fn},icon(ic),h('span',null,l)))));
  host.append(dock,h('div',{class:'hint'},'Drag to look around · pinch to zoom · tap an item to edit'));
  setTimeout(()=>{const x=host.querySelector('.hint');x&&x.remove();},6000);
  /* ----- catalogue ----- */
  function addDeco(def,extra){return R.addDecor(def.id,extra);}
  async function addFromCatalogue(def,close){
    if(!def.deco){close();R.addFurniture(def.id);return;}
    if(def.img){const f=await pickFile('image/jpeg,image/png,image/webp');if(!f)return;
      await guard(null,async()=>{toast('Uploading…');const up=await Store.uploadPicture(f);const asp=up.width/up.height;let w=def.w,hh=def.h;if(def.id!=='album'){const area=def.w*def.h;hh=Math.sqrt(area/asp);w=hh*asp;}else{hh=w=def.w;}
        close();R.addDecor(def.id,{image_path:up.path,width:+w.toFixed(3),height:+hh.toFixed(3)});});return;}
    close();R.addDecor(def.id);
  }
  function catalogue(start,only){
    sheet(only?'Wall decorations':'Add to your room',(body,close)=>{
      let cat=start;const tabsEl=h('div',{class:'scrollx',style:{padding:'0 0 10px'}}),grid=h('div',{class:'cat-grid'});
      const paint=()=>{
        if(!only)tabsEl.replaceChildren(...OW.CATS.map(([k,l])=>h('button',{class:'chip'+(k===cat?' on':''),onclick:()=>{cat=k;paint();}},l)));
        const list=[...OW.FURN,...OW.DECOR].filter(d=>only?d.deco&&d.cat==='wall'||d.cat==='decor'&&d.deco:d.cat===cat||(d.deco&&d.cat===cat));
        const lst=only?list:[...OW.FURN,...OW.DECOR].filter(d=>d.cat===cat);
        grid.replaceChildren(...lst.map(d=>{const im=h('img',{alt:'',width:112,height:112});const b=h('button',{class:'cat',onclick:()=>addFromCatalogue(d,close)},im,d.name);
          setTimeout(()=>{try{im.src=OWRoom.thumb(d.id);}catch(e){}},20);return b;}));
      };
      paint();body.append(only?null:tabsEl,grid);
    });
  }
  function wallSheet(){
    sheet('Decorate a wall',(body,close)=>{
      body.append(h('p',{class:'tag',style:{margin:'0 0 8px'}},'Choose a wall to look at, then add pictures. Drag them around the wall.'),
        h('div',{class:'chips',style:{marginBottom:'14px'}},...[['back','Back wall'],['left','Left wall'],['right','Right wall'],['front','Front wall']].map(([k,l])=>h('button',{class:'chip',onclick:()=>{R.focusWall(k);}},l))),
        h('button',{class:'btn coral block',onclick:()=>{close();catalogue('wall',true);}},icon('frame'),'Add a picture, poster or decoration'));
    });
  }
  function roomSheet(){
    sheet('Your room',(body,close)=>{
      const sizes=h('div'),themes=h('div',{class:'themes'}),nm=h('input',{type:'text',maxlength:'60',value:room.name||''});
      const paint=()=>{
        sizes.replaceChildren(...Object.entries(OW.SIZES).map(([k,s])=>h('button',{class:'size-opt'+(R.room.size===k?' on':''),onclick:()=>{R.setSize(k);paint();}},h('i',{class:'box',style:{width:(26+s.w*3)+'px',height:(20+s.d*3)+'px'}}),h('div',null,h('b',null,s.label),h('span',null,s.w+' × '+s.d+' m, '+s.h+' m high')))));
        themes.replaceChildren(...Object.entries(OW.THEMES).map(([k,t])=>h('button',{class:'theme'+((R.room.theme&&R.room.theme.key||'lagos')===k?' on':''),onclick:()=>{R.setTheme(k);paint();}},h('i',{style:{background:t.wall,'--f':t.floor}}),t.name)));
      };paint();
      nm.addEventListener('change',()=>{room.name=nm.value.trim()||'My room';R.room.name=room.name;titleEl.textContent=room.name;R.changed();});
      body.append(field('Room name',nm),h('div',{class:'f-label',style:{margin:'4px 0 8px'}},'Room size'),sizes,h('div',{class:'f-label',style:{margin:'12px 0 8px'}},'Style'),themes,
        h('button',{class:'btn block',style:{marginTop:'14px'},onclick:()=>{close();roomSettings(Object.assign(room,{name:R.room.name||room.name}),()=>{R.room.visibility=room.visibility;R.room.categories=room.categories;});}},icon('sliders'),'Visibility & interests'));
    });
  }
  /* ----- selected item panel ----- */
  function showPanel(it){
    if(panel){panel.remove();panel=null;}R.setInset(0);if(!it)return;const def=OW.def(it.type);
    const rs=h('input',{type:'range',min:'-180',max:'180',step:'1',value:String(Math.round((it.rot||0)*180/Math.PI))});
    rs.addEventListener('input',()=>R.update(it.id,{rot:rs.value*Math.PI/180}));
    const sc=h('input',{type:'range',min:'40',max:'220',step:'1',value:String(Math.round((it.scale||1)*100))});sc.addEventListener('input',()=>R.update(it.id,{scale:sc.value/100}));
    const rows=h('div',{class:'rows'},h('label',null,'Rotate'),rs,h('label',null,'Size'),sc);
    const acts=h('div',{class:'acts'});
    if(it.kind==='decor'&&def.img){acts.append(h('button',{class:'btn',onclick:async()=>{const f=await pickFile('image/jpeg,image/png,image/webp');if(!f)return;await guard(null,async()=>{toast('Uploading…');const up=await Store.uploadPicture(f);const asp=up.width/up.height,area=(it.width||def.w)*(it.height||def.h),hh=def.id==='album'?it.height:Math.sqrt(area/asp);R.update(it.id,{image_path:up.path,height:+hh.toFixed(3),width:+(def.id==='album'?it.width:hh*asp).toFixed(3)});});}},icon('image'),it.image_path?'Change picture':'Add picture'));
      const fr=h('div',{class:'chips',style:{width:'100%'}});const pf=()=>fr.replaceChildren(...Object.entries(OW.FRAMES).map(([k,l])=>h('button',{class:'chip'+((it.frame||'none')===k?' on':''),onclick:()=>{R.update(it.id,{frame:k});pf();}},l)));pf();acts.append(fr);}
    if(it.type==='neon'||it.type==='curtains'||it.kind==='furniture'&&def.col){const cols=['#ff3d81','#3ddc97','#ffd23f','#6c4bff','#ff5a3c','#2d7bff','#c4532d','#2f6b4f','#d9a441','#e8d5b9','#1c1f2e','#f4f1ea'];const sw=h('div',{class:'swatches',style:{width:'100%'}});const pc=()=>sw.replaceChildren(...cols.map(c=>h('button',{class:'sw'+((it.color||def.col)===c?' on':''),style:{background:c},'aria-label':'Colour '+c,onclick:()=>{R.update(it.id,{color:c});pc();}})));pc();acts.append(sw);}
    const info=OW.INTERACT_HINT[def.hint]||(def.link?'Add a link and description':'');
    acts.append(h('button',{class:'btn',onclick:()=>detailsSheet(it,def)},icon('link'),it.kind==='decor'&&!def.img?'Text & link':'Details & link'));
    acts.append(h('button',{class:'btn danger',onclick:async()=>{if(await confirmBox('Remove this?','It will be taken out of your room.','Remove',true)){R.remove(it.id);}}},icon('trash'),'Remove'));
    panel=h('div',{class:'panel'},h('div',{class:'ph'},h('b',null,def.name),h('button',{class:'icon-btn','aria-label':'Close',onclick:()=>R.select(null)},icon('close'))),rows,acts,info?h('div',{class:'f-hint',style:{marginTop:'6px'}},info):null);
    host.append(panel);R.setInset((panel.offsetHeight+88)/2);
  }
  function detailsSheet(it,def){
    sheet('Details',(body,close)=>{
      const ti=h('input',{type:'text',maxlength:'80',value:it.title||'',placeholder:it.type==='neon'?'Text on the sign':'e.g. Artist, song, player or team'}),
        ds=h('textarea',{maxlength:'500',placeholder:it.type==='noticeboard'?'One note per line':'Tell visitors about it'}),li=h('input',{type:'url',maxlength:'500',value:it.link||'',placeholder:'https://…'});ds.value=it.description||'';
      body.append(field(it.type==='neon'?'Sign text':'Title',ti),field(it.type==='noticeboard'?'Notes':'Description',ds),it.type==='neon'?null:field('Link',li,'Music, video, website, book or any web link. Visitors can tap the object to open it.'),
        h('button',{class:'btn primary block',onclick:()=>{let l=li.value.trim();if(l&&!safeUrl(l)){const s=safeUrl('https://'+l);if(!s){toast('That link does not look right','err');return;}l=s;}R.update(it.id,{title:ti.value.trim()||null,description:ds.value.trim()||null,link:l||null});close();}},'Save'));
    });
  }
  if(fresh)save();
}

/* ---------- VISITOR VIEW ---------- */
async function visitView(username){
  const v=setView(true);const host=h('div',{class:'room'});v.append(host,h('div',{class:'rtop'},h('button',{class:'rbtn','aria-label':'Back',onclick:()=>{if(history.length>1&&App.hadRoute)history.back();else go('#/wall');}},icon('back'))));host.append(spinner('Opening room…'));
  let d;try{d=await Store.byUsername(username);}catch(e){host.replaceChildren(empty('Could not open this room',friendlyError(e),h('button',{class:'btn',onclick:()=>go('#/wall')},'Back to the Wall')));return;}
  if(!d){host.replaceChildren(empty('Room not found','This room is private or does not exist.',h('button',{class:'btn',onclick:()=>go('#/wall')},'Back to the Wall')));return;}
  const o=d.owner;
  if(!d.room){host.replaceChildren(empty('@'+o.username+' has not built a room yet',d.is_me?'Build yours now.':'Check back soon.',d.is_me?h('button',{class:'btn coral',onclick:()=>go('#/edit')},'Build my room'):h('button',{class:'btn',onclick:()=>go('#/wall')},'Back to the Wall')));return;}
  host.replaceChildren();document.title=d.room.name+' · @'+o.username+' · OpenWalls';
  let R=null;
  if(OWRoom.supported()){R=new OWRoom(host,{edit:false,onOpen:openItem});R.load(d.room,d.items);App.teardown=()=>{R.destroy();document.title="OpenWalls · Discover what's on everyone's walls";};}
  else{host.append(fallback(d));}
  if(!App.visited[d.room.id]&&!d.is_me){App.visited[d.room.id]=1;Store.visit(d.room.id);}
  let cn={followers:0,following:0,iFollow:false};try{cn=await Store.counts(o.id);}catch(e){}
  const fol=h('button',{class:'rbtn '+(cn.iFollow?'':'coral'),onclick:()=>{if(!Auth.user){authSheet('signin','Sign in to follow '+o.username);return;}guard(fol,async()=>{await Store.follow(o.id,!cn.iFollow);cn.iFollow=!cn.iFollow;fol.textContent=cn.iFollow?'Following':'Follow';fol.classList.toggle('coral',!cn.iFollow);});}},cn.iFollow?'Following':'Follow');
  const top=h('div',{class:'rtop'},h('button',{class:'rbtn','aria-label':'Back',onclick:()=>go(d.is_me?'#/me':'#/wall')},icon('back')),
    h('div',{class:'owner'},avatarEl(o,'sm'),h('div',{class:'who'},h('b',null,d.room.name),h('span',{class:'s'},'@'+o.username+(cn.followers?' · '+cn.followers+' followers':'')))),
    d.is_me?h('button',{class:'rbtn dark',onclick:()=>go('#/edit')},icon('edit'),'Edit'):fol,
    h('button',{class:'rbtn','aria-label':'Share room',onclick:()=>shareRoom(o.username,d.room.name)},icon('share')),
    R?h('button',{class:'rbtn','aria-label':'Reset camera',onclick:()=>R.resetCamera()},icon('reset')):null);
  v.querySelector('.rtop').replaceWith(top);
  if(R)host.append(h('div',{class:'hint'},'Drag to look · pinch to zoom · tap the dots'));
  host.append(socialBar(d,o));
  setTimeout(()=>{const x=host.querySelector('.hint');x&&x.remove();},6000);
  if(o.bio){/* shown in the owner sheet */}
  function openItem(it){
    const def=OW.def(it.type);const hasInfo=it.title||it.description||it.link||it.image_path;if(!hasInfo)return;
    sheet(it.title||def.name,(body)=>{
      const wrap=h('div',{class:'viewer'});
      if(it.image_path)wrap.append(h('img',{src:publicUrl('room-images',it.image_path),alt:it.title||def.name}));
      const yt=it.link&&ytId(it.link);if(yt)wrap.append(h('iframe',{src:'https://www.youtube-nocookie.com/embed/'+yt,allow:'accelerometer; encrypted-media; picture-in-picture',allowfullscreen:'',title:it.title||'Video',loading:'lazy'}));
      if(it.type==='noticeboard'&&it.description)wrap.append(h('div',{class:'chips',style:{marginBottom:'12px'}},it.description.split('\n').filter(Boolean).map(n=>h('span',{class:'chip'},n))));
      else if(it.description)wrap.append(h('p',null,it.description));
      if(it.link){const info=identifyLink(it.link);wrap.append(h('button',{class:'btn coral block',onclick:()=>openExternal(it.link)},icon('link'),info&&info.key!=='link'?'Open on '+info.name:'Open link'));}
      body.append(wrap);
    });
  }
}
function socialBar(d,o){
  let soc={counts:{},mine:null,comments:0};const room=d.room;
  const total=()=>Object.values(soc.counts).reduce((a,b)=>a+(+b||0),0);
  const rx=h('button',{class:'dk wide','aria-label':'React'}),cm=h('button',{class:'dk wide','aria-label':'Comments'}),ms=h('button',{class:'dk wide','aria-label':'Message'},icon('chat'),h('span',null,'Message')),mo=h('button',{class:'dk','aria-label':'More'},icon('more'),h('span',null,'More'));
  const paint=()=>{rx.replaceChildren(h('span',{class:'em'},soc.mine?EMOJI[soc.mine]:'♡'),h('span',null,total()||'React'));rx.classList.toggle('on',!!soc.mine);cm.replaceChildren(icon('chat'),h('span',null,soc.comments?soc.comments+(soc.comments==1?' comment':' comments'):'Comment'));};
  paint();Store.social(room.id).then(x=>{soc=x;paint();}).catch(()=>{});
  const pick=async kind=>{if(!needAuth('Sign in to react'))return;const was=soc.mine;const next=was===kind?null:kind;await guard(rx,async()=>{await Store.react(room.id,next);if(was)soc.counts[was]=Math.max(0,(soc.counts[was]||0)-1);if(next)soc.counts[next]=(soc.counts[next]||0)+1;soc.mine=next;paint();});};
  rx.onclick=e=>{const old=document.querySelector('.pop');if(old){old.remove();return;}const pop=h('div',{class:'pop'},Object.entries(EMOJI).map(([k,em])=>h('button',{class:soc.mine===k?'on':'','aria-label':k,onclick:()=>{pop.remove();pick(k);}},em)));rx.parentElement.parentElement.append(pop);setTimeout(()=>document.addEventListener('pointerdown',function f(ev){if(!pop.contains(ev.target)){pop.remove();document.removeEventListener('pointerdown',f);}}),0);};
  cm.onclick=()=>commentsSheet(d,n=>{soc.comments=n;paint();});
  ms.onclick=()=>{if(d.is_me){toast('This is your own room');return;}if(!needAuth('Sign in to send a message'))return;if(o.dm_policy==='nobody'){toast('@'+o.username+' is not taking messages','err');return;}go('#/chat/'+o.username);};
  mo.onclick=()=>moreSheet(d,o);
  if(d.is_me)ms.style.display='none';
  return h('div',{class:'dock social'},h('div',{class:'bar'},rx,cm,ms,mo));
}
function reportSheet(target,done){
  sheet('Report',(body,close)=>{
    const reasons=['Inappropriate or adult content','Hate or harassment','Spam or scam','Impersonation','Something else'];let sel=null;const det=h('textarea',{maxlength:'500',placeholder:'Anything else we should know? (optional)'});
    const w=h('div',{class:'chips',style:{marginBottom:'12px'}});const pc=()=>w.replaceChildren(...reasons.map(r=>h('button',{class:'chip'+(sel===r?' on':''),onclick:()=>{sel=r;pc();}},r)));pc();
    const send=h('button',{class:'btn primary block',onclick:()=>{if(!sel){toast('Choose a reason','err');return;}guard(send,async()=>{await Store.report(Object.assign({reason:sel,details:det.value.trim()||null},target));toast('Thanks, we will review it','ok');close();done&&done();});}},'Send report');
    body.append(h('p',{class:'tag',style:{margin:'0 0 10px'}},'Tell us what is wrong. Reports are private.'),w,field('Details',det),send);
  });
}
function moreSheet(d,o){
  sheet('@'+o.username,(body,close)=>{
    const row=(ic,t,fn,danger)=>h('button',{class:'btn block'+(danger?' danger':''),style:{marginBottom:'8px',justifyContent:'flex-start'},onclick:fn},icon(ic),t);
    body.append(row('share','Share this room',()=>{close();shareRoom(o.username,d.room.name);}));
    if(!d.is_me){
      body.append(row('flag','Report this room',()=>{close();if(needAuth('Sign in to report'))reportSheet({room_id:d.room.id});}),
        row('lock','Block @'+o.username,async()=>{close();if(!needAuth('Sign in to block'))return;if(await confirmBox('Block @'+o.username+'?','You will no longer see each other\u2019s rooms, comments or messages.','Block',true)){await guard(null,async()=>{await Store.block(o.id,true);toast('Blocked','ok');go('#/wall');});}},true));
    }
  });
}
function commentsSheet(d,onCount){
  sheet('Comments',(body)=>{
    const list=h('div',{style:{marginBottom:'10px'}},spinner()),inp=h('input',{type:'text',maxlength:'300',placeholder:Auth.user?'Say something nice…':'Sign in to comment',style:{flex:1,padding:'12px 14px',borderRadius:'99px',border:'1.5px solid var(--line)',background:'#fff'}});
    const send=h('button',{class:'btn coral small'},'Post');
    const load=async()=>{try{const cs=await Store.comments(d.room.id);onCount&&onCount(cs.length);
      list.replaceChildren(...(cs.length?cs.map(c=>h('div',{class:'cmt'},avatarEl(c,'sm'),h('div',{class:'cb'},h('b',null,'@'+c.username),h('span',{class:'t'},' '+timeAgo(c.created_at)),h('p',null,c.body),
        h('div',{class:'cact'},(Auth.user&&(c.user_id===Auth.user.id||d.is_me))?h('button',{onclick:()=>guard(null,async()=>{await Store.delComment(c.id);load();})},'Delete'):null,(Auth.user&&c.user_id!==Auth.user.id)?h('button',{onclick:()=>reportSheet({comment_id:c.id,room_id:d.room.id})},'Report'):null)))):[h('p',{class:'tag',style:{textAlign:'center',padding:'18px'}},'No comments yet. Start the conversation.')]));}catch(e){list.replaceChildren(h('p',{class:'tag'},friendlyError(e)));}};
    const post=()=>{const t=inp.value.trim();if(!t)return;if(!needAuth('Sign in to comment'))return;guard(send,async()=>{await Store.comment(d.room.id,t);inp.value='';await load();});};
    send.onclick=post;inp.addEventListener('keydown',e=>{if(e.key==='Enter')post();});
    body.append(list,h('div',{style:{display:'flex',gap:'8px',alignItems:'center'}},inp,send));load();
  });
}
/* ---------- INBOX: messages + activity ---------- */
async function inboxView(){
  const v=setView(false);drawNav('inbox');let tab='msg';
  if(!Auth.user){v.append(h('div',{class:'pg-head'},h('div',{class:'brand'},h('b',null,'Inbox'))),empty('Sign in to see your inbox','Messages, reactions and comments show up here.',h('button',{class:'btn coral',onclick:()=>authSheet('signin')},'Sign in')));return;}
  const tabs=h('div',{class:'scrollx'}),body=h('div');v.append(h('div',{class:'pg-head'},h('div',{class:'brand'},h('b',null,'Inbox'))),tabs,body);
  const paint=async()=>{
    tabs.replaceChildren(...[['msg','Messages'],['act','Activity']].map(([k,l])=>h('button',{class:'chip'+(tab===k?' on':''),onclick:()=>{tab=k;paint();}},l)));body.replaceChildren(spinner());
    try{
      if(tab==='msg'){const cs=await Store.conversations();body.replaceChildren(cs.length?h('div',{class:'list'},cs.map(c=>h('button',{onclick:()=>go('#/chat/'+c.username)},avatarEl(c),h('span',{class:'grow'},h('b',null,'@'+c.username),h('div',{class:'f-hint',style:{whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',maxWidth:'60vw'}},(c.mine?'You: ':'')+c.body)),c.unread?h('i',{class:'badge on'},String(c.unread)):h('span',{class:'f-hint'},timeAgo(c.created_at))))):empty('No messages yet','Visit a room and tap Message to say hello.'));}
      else{const ns=await Store.notifs();body.replaceChildren(ns.length?h('div',{class:'list'},ns.map(n=>h('button',{onclick:()=>{const path=n.payload&&n.payload.path;if(path&&/^#\//.test(path))go(path);}},h('span',{class:'grow'},h('b',{style:{fontWeight:n.read?600:800}},n.title),n.body?h('div',{class:'f-hint'},n.body):null),n.read?null:h('i',{class:'badge on'},'•'),h('span',{class:'f-hint'},timeAgo(n.created_at))))):empty('Nothing yet','Reactions, comments and new followers appear here.'));Store.readNotifs().then(refreshUnread);}
    }catch(e){body.replaceChildren(empty('Could not load',friendlyError(e)));}
  };
  paint();
}
async function chatView(username){
  if(!Auth.user){go('#/inbox');authSheet('signin','Sign in to send messages');return;}
  const v=setView(true);const wrap=h('div',{class:'chat'});v.append(wrap);wrap.append(spinner());
  let d;try{d=await Store.byUsername(username);}catch(e){wrap.replaceChildren(empty('Could not open chat',friendlyError(e)));return;}
  if(!d||!d.owner){wrap.replaceChildren(empty('Person not found','',h('button',{class:'btn',onclick:()=>go('#/inbox')},'Back')));return;}
  const o=d.owner;const list=h('div',{class:'cl'}),inp=h('input',{type:'text',maxlength:'1000',placeholder:'Message @'+o.username}),send=h('button',{class:'btn coral small'},'Send');
  const blocked=o.dm_policy==='nobody'&&!d.is_me;
  wrap.replaceChildren(h('div',{class:'rtop',style:{position:'relative',background:'var(--paper)',borderBottom:'1px solid var(--line)'}},h('button',{class:'rbtn','aria-label':'Back',onclick:()=>go('#/inbox')},icon('back')),h('button',{class:'owner',onclick:()=>go('#/@'+o.username)},avatarEl(o,'sm'),h('div',{class:'who'},h('b',null,o.display_name||'@'+o.username),h('span',{class:'s'},'@'+o.username)))),list,
    blocked?h('p',{class:'tag',style:{padding:'14px',textAlign:'center'}},'@'+o.username+' is not taking messages.'):h('div',{class:'cin'},inp,send));
  let last='';const load=async()=>{try{const ms=await Store.thread(o.id);const key=ms.length+':'+(ms[ms.length-1]||{}).id;if(key===last)return;last=key;const nearEnd=list.scrollHeight-list.scrollTop-list.clientHeight<80||!list.childNodes.length;
    list.replaceChildren(...(ms.length?ms.map(m=>h('div',{class:'bub '+(m.sender_id===Auth.user.id?'me':'them')},m.body)):[h('p',{class:'tag',style:{textAlign:'center',padding:'20px'}},'Say hello to @'+o.username)]));if(nearEnd)list.scrollTop=list.scrollHeight;Store.markRead(o.id).then(refreshUnread);}catch(e){}};
  const post=()=>{const t=inp.value.trim();if(!t)return;guard(send,async()=>{await Store.send(o.id,t);inp.value='';last='';await load();});};
  send.onclick=post;inp.addEventListener('keydown',e=>{if(e.key==='Enter')post();});
  await load();const iv=setInterval(()=>{if(!document.hidden)load();},6000);App.teardown=()=>clearInterval(iv);
}
function privacySheet(){
  sheet('Privacy & safety',(body,close)=>{
    const dm=h('select',null,h('option',{value:'everyone'},'Anyone can message me'),h('option',{value:'nobody'},'No one can message me'));dm.value=(Auth.profile&&Auth.profile.dm_policy)||'everyone';
    dm.onchange=()=>guard(null,async()=>{const r=await Auth.saveProfile({dm_policy:dm.value});if(r.error)throw r.error;toast('Saved','ok');});
    const bl=h('div',null,spinner());
    const load=async()=>{try{const xs=await Store.blocked();bl.replaceChildren(xs.length?h('div',{class:'list',style:{margin:0}},xs.map(u=>h('button',{onclick:()=>guard(null,async()=>{await Store.block(u.id,false);toast('Unblocked','ok');load();})},avatarEl(u,'sm'),h('span',{class:'grow'},'@'+u.username),h('span',{class:'f-hint'},'Unblock')))):h('p',{class:'f-hint'},'You have not blocked anyone.'));}catch(e){bl.replaceChildren(h('p',{class:'f-hint'},friendlyError(e)));}};load();
    body.append(field('Messages',dm),h('div',{class:'f-label',style:{margin:'4px 0 8px'}},'Blocked people'),bl,h('p',{class:'f-hint',style:{marginTop:'14px'}},'Room visibility and interests are in Room settings.'));
  });
}
/* simple flat view for devices without WebGL: every picture on the walls as a gallery */
function fallback(d){
  const pics=d.items.filter(i=>i.kind==='decor'&&i.image_path);
  return h('div',{style:{position:'absolute',inset:0,overflow:'auto'}},h('div',{class:'fallback'},pics.length?pics.map(i=>h('button',{class:'fb',onclick:()=>i.link?openExternal(i.link):null},h('img',{src:publicUrl('room-images',i.image_path),alt:i.title||'',loading:'lazy'}),h('div',null,i.title||'Picture'))):[h('p',{class:'tag'},'This device cannot show the 3D room, and there are no pictures on the walls yet.')]));
}

/* ---------- router ---------- */
function route(){
  document.querySelectorAll('.sheet-ov,.dlg-ov').forEach(e=>e.remove());teardown();const hs=decodeURIComponent(location.hash.replace(/^#\/?/,''));App.hadRoute=App.route!=='';App.route=hs||'wall';
  document.title="OpenWalls · Discover what's on everyone's walls";
  if(hs.startsWith('@'))return visitView(hs.slice(1).toLowerCase());
  if(hs.startsWith('chat/'))return chatView(hs.slice(5).toLowerCase());
  switch(hs){case'discover':return discoverView();case'inbox':return inboxView();case'me':return meView();case'edit':return editorView();default:return wallView();}
}
window.addEventListener('hashchange',route);
(function boot(){
  const ld=document.getElementById('ldlogo');if(ld)ld.append(logoEl(84));
  const q=new URLSearchParams(location.search).get('room');if(q&&!location.hash)history.replaceState(null,'',location.pathname+'#/@'+q);
  Auth.on(ev=>{if((ev==='signin'||ev==='signout')&&!/^(edit|@|chat)/.test(App.route))route();});
  Auth.init().then(()=>{route();refreshUnread();}).catch(()=>route());
  window.__ready=true;const l=document.getElementById('loading');setTimeout(()=>l&&l.classList.add('gone'),250);
  try{sessionStorage.removeItem('ow_try');}catch(e){}
  PWA.init();
})();
