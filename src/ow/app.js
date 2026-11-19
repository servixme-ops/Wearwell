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
  undo:'<path d="M9 7L4 12l5 5"/><path d="M4 12h10a6 6 0 010 12" transform="translate(0 -5)"/>',
  redo:'<path d="M15 7l5 5-5 5"/><path d="M20 12H10a6 6 0 000 12" transform="translate(0 -5)"/>',
  copy:'<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 00-2-2H6a2 2 0 00-2 2v8a2 2 0 002 2h2"/>',
  reset:'<path d="M4 12a8 8 0 108-8"/><path d="M4 4v5h5"/>',
  more:'<circle cx="5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="19" cy="12" r="1.4"/>'
});
const $view=()=>document.getElementById('view'),$nav=()=>document.getElementById('nav');
const App={teardown:null,route:'',visited:{}};
const roomLabel=r=>((r&&r.name)||'').trim()||'Room';
const CATS=['Music','Sports','Football','Basketball','Movies','Anime','Gaming','Fashion','Travel','Photography','Books','Technology','Lifestyle','Art','Food'];
const EMOJI={love:'❤️',fire:'🔥',wow:'😮',clap:'👏'};
const needAuth=why=>{if(Auth.user)return true;authSheet('signin',why||'Sign in to do that');return false;};
function embedFor(u){
  try{const x=new URL(u),host=x.hostname.replace(/^www\./,'');
    const yt=ytId(u);if(yt)return{src:'https://www.youtube-nocookie.com/embed/'+yt,ratio:'16/9',kind:'video',name:'YouTube'};
    let m;if(host==='vimeo.com'&&(m=x.pathname.match(/\/(\d+)/)))return{src:'https://player.vimeo.com/video/'+m[1],ratio:'16/9',kind:'video',name:'Vimeo'};
    if(host==='open.spotify.com'&&(m=x.pathname.match(/\/(track|album|playlist|artist|episode|show)\/([A-Za-z0-9]+)/)))return{src:'https://open.spotify.com/embed/'+m[1]+'/'+m[2],height:m[1]==='track'||m[1]==='episode'?152:352,kind:'music',name:'Spotify'};
    if(host==='soundcloud.com')return{src:'https://w.soundcloud.com/player/?auto_play=false&url='+encodeURIComponent(u),height:166,kind:'music',name:'SoundCloud'};
    if(host==='music.apple.com')return{src:'https://embed.music.apple.com'+x.pathname+x.search,height:x.pathname.includes('/song/')||x.search.includes('i=')?175:352,kind:'music',name:'Apple Music'};
  }catch(e){}return null;}
const roomUrl=u=>CFG.site+'#/@'+u;
const ytId=u=>{try{const x=new URL(u);if(/youtu\.be$/.test(x.hostname))return x.pathname.slice(1);if(/youtube\.com$/.test(x.hostname)){if(x.searchParams.get('v'))return x.searchParams.get('v');const m=x.pathname.match(/\/(embed|shorts)\/([\w-]+)/);if(m)return m[2];}}catch(e){}return null;};
const go=hash=>{if(location.hash===hash)route();else location.hash=hash;};
function setView(full){const v=$view();v.classList.toggle('full',!!full);v.classList.remove('sp-view','intro-view');v.scrollTop=0;v.replaceChildren();$nav().classList.toggle('hide',!!full);return v;}
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
      mode==='reset'?null:h('div',null,
        h('button',{type:'button',class:'btn block gbtn',onclick:async()=>{err.textContent='';const r=await Auth.signInGoogle();if(r&&r.error)err.textContent=r.error.message||'Google sign-in is not available right now.';}},
          h('span',{class:'gmark'},'G'),'Continue with Google'),
        h('div',{class:'or-line'},h('span',null,'or use email'))),
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
  const shot=OWPrev.node(r,'pshot',roomLabel(r)+' by @'+r.username);
  return h('div',{class:'piece'},r.featured?h('span',{class:'star'},'★ Featured'):null,h('button',{class:'pframe','aria-label':'Visit '+roomLabel(r)+' by @'+r.username,onclick:()=>go('#/@'+r.username)},shot),
    h('div',{class:'plaque'},avatarEl({avatar_url:r.avatar_url,display_name:r.display_name,username:r.username},'sm'),h('div',{class:'who'},h('b',null,'@'+r.username)),h('button',{class:'visit',onclick:()=>go('#/@'+r.username)},'Visit')),
    r.visits?h('div',{class:'vis'},r.visits+(r.visits===1?' visit':' visits')):null);
}
const WALL_SEED=Math.random().toString(36).slice(2,8);
async function adsView(){const v=setView(false);drawNav('me');App.teardown=()=>OWAds.stop();return OWAds.dashboard(v);}
async function wallView(){
  const v=setView(false);drawNav('wall');
  const grid=h('div',{class:'ex-grid'}),more=h('div',{class:'ex-more'}),ex=h('div',{class:'exhibit'},h('div',{class:'pg-head'},h('div',{class:'brand'},logoEl(38),h('b',null,'OpenWalls')),h('p',{class:'tag'},'Discover what\u2019s on everyone\u2019s walls.')),h('div',{class:'ex-body'},grid,more));
  v.append(ex);let offset=0,done=false,busy=false,count=0;const PAGE=16,adIds=[];
  more.append(spinner());
  const load=async()=>{if(busy||done)return;busy=true;
    try{const rows=await Store.feed(PAGE,offset,WALL_SEED);offset+=rows.length;if(rows.length<PAGE)done=true;const cf=await OWAds.cfg(),EVERY=Math.max(4,+cf.wall_every||7),MAXAD=Math.max(0,+cf.wall_max||3);for(const r of rows){grid.append(roomPiece(r,count++));if(count%EVERY===0&&adIds.length<MAXAD){const ad=(await OWAds.serve('wall',null,1,adIds))[0];if(ad){adIds.push(ad.id);grid.append(OWAds.wallPiece(ad));}}}
      if(!count){more.replaceChildren(empty('The wall is empty','Hang a picture in your room and it shows up here.',h('button',{class:'btn coral',onclick:create},'Build my open room')));return;}
      more.replaceChildren(done?h('div',{class:'ex-end'},'You have seen every room'):h('div',{class:'ex-sent'}));
    }catch(e){more.replaceChildren(empty('Could not load the wall',friendlyError(e),h('button',{class:'btn',onclick:()=>{busy=false;more.replaceChildren(spinner());load();}},'Try again')));busy=false;return;}
    busy=false;watch();};
  let io=null;const watch=()=>{const s=more.querySelector('.ex-sent');if(!s)return;if('IntersectionObserver' in window){io&&io.disconnect();io=new IntersectionObserver(es=>{if(es.some(e=>e.isIntersecting))load();},{root:v,rootMargin:'600px'});io.observe(s);}else{const b=h('button',{class:'btn',onclick:load},'Load more');more.replaceChildren(b);}};
  App.teardown=()=>{io&&io.disconnect();OWAds.stop();};
  load();
}
/* ---------- DISCOVER ---------- */
let FLAGS=null,FLAGS_AT=0;
async function appFlags(){if(FLAGS&&Date.now()-FLAGS_AT<60000)return FLAGS;try{const r=await sb.rpc('app_flags_get');FLAGS=(r.data&&typeof r.data==='object')?r.data:{};}catch(e){FLAGS=FLAGS||{};}FLAGS_AT=Date.now();return FLAGS;}
async function discoverView(){
  const v=setView(false);drawNav('discover');let feed=[],trend=[],feat=[],cat=null;
  const chips=h('div',{class:'scrollx'}),sec=h('div');
  const adHost=h('div',{class:'ad-host'}),sr=h('div'),qi=h('input',{type:'search',class:'ds-search',placeholder:'Search rooms and creators','aria-label':'Search',maxlength:'60'});let qv='',qt=null,qn=0;
  let act=[];const crBox=h('div',{class:'cr-box'});
  const KIND={space:'LIVE',movie:'WATCHING',music:'LISTENING'};
  const drawCreators=()=>{
    const seenU={},rows=[];
    act.forEach(a=>{if(!seenU[a.username]){seenU[a.username]=1;rows.push({username:a.username,display_name:a.display_name,avatar_url:a.avatar_url,a});}});
    [...feed].sort((x,y)=>y.visits-x.visits).forEach(r=>{if(!seenU[r.username]&&rows.length<14){seenU[r.username]=1;rows.push(r);}});
    if(!rows.length){crBox.replaceChildren();return;}
    crBox.replaceChildren(h('h2',{class:'sec'},'Creators'),h('p',{class:'sec-sub'},act.length?'A glowing ring means they are live right now. Tap to join.':'Rings light up when a creator goes live, watches a video or plays music.'),
      h('div',{class:'creators'},rows.map(r=>{const a=r.a,u={avatar_url:r.avatar_url,display_name:r.display_name,username:r.username};
        return h('button',{class:'creator'+(a?' live':''),title:a?(a.label||''):'','aria-label':'@'+r.username+(a?', '+KIND[a.kind].toLowerCase()+' now: '+a.label:''),onclick:()=>go(a&&a.kind==='space'?'#/space/'+a.target:'#/@'+r.username)},
          h('span',{class:'ring'},avatarEl(u)),a?h('span',{class:'now '+a.kind},KIND[a.kind]):null,'@'+r.username);}))); };
  const loadAct=async()=>{try{const r=await sb.rpc('ow_active_now');act=Array.isArray(r.data)?r.data:[];}catch(e){act=[];}drawCreators();};
  loadAct();const actT=setInterval(()=>{if(document.hidden||!crBox.isConnected)return;loadAct();},30000);
  const FL=await appFlags();
  v.append(h('div',{class:'pg-head'},h('div',{class:'brand'},h('b',null,'Discover')),h('p',{class:'tag'},'Walls, paintings and creators.'),FL.sip_paint===false?null:Spaces.paintSection(),h('div',{class:'ent-list'},FL.live_spaces!==true?null:h('button',{class:'ent2 live',onclick:()=>go('#/spaces')},h('span',{class:'ent2-ic'},icon('mic')),h('span',{class:'ent2-tx'},h('b',null,'Live Spaces'),h('span',null,'Join live audio rooms and talk with people')),h('span',{class:'ent2-go'},h('i',{class:'ent-dot'}),'Listen')),FL.forum!==true?null:h('button',{class:'ent2 forum',onclick:()=>go('#/forum')},h('span',{class:'ent2-ic'},icon('topics')),h('span',{class:'ent2-tx'},h('b',null,'Forum'),h('span',null,'Start topics, join discussions, meet people')),h('span',{class:'ent2-go'},'Join')))),crBox,qi,adHost,sr,sec);
  App.teardown=()=>{OWAds.stop();clearInterval(actT);};
  const searchRun=async()=>{const q=qv.trim().toLowerCase(),my=++qn;
    if(q.length<2){sr.replaceChildren();sec.style.display='';adHost.style.display='';return;}
    sec.style.display='none';adHost.style.display='none';
    const pool=[...feat,...trend,...feed],seenR={},hit=pool.filter(r=>!seenR[r.id||r.username+r.name]&&(seenR[r.id||r.username+r.name]=1)&&([r.name,r.username,r.display_name].join(' ').toLowerCase().includes(q)));
    const [sp,tp]=await Promise.all([OWAds.searchBlock(q),FL.forum!==true?null:OWForum.search(q)]);if(my!==qn)return;
    sr.replaceChildren(...[sp,tp,h('h2',{class:'sec'},hit.length?'Results for \u201c'+qv.trim()+'\u201d':(tp?'No rooms match \u201c':'No rooms match \u201c')+qv.trim()+'\u201d'),hit.length?h('div',{class:'ex-grid',style:{background:'none'}},hit.map(roomPiece)):h('p',{class:'f-hint',style:{padding:'0 18px'}},'Try another word, or pick an interest above.')].filter(Boolean));};
  qi.addEventListener('input',()=>{qv=qi.value;clearTimeout(qt);qt=setTimeout(searchRun,300);});
  const ok=r=>!cat||(r.categories||[]).includes(cat);
  const tcard=r=>{return h('button',{class:'tcard',onclick:()=>go('#/@'+r.username)},OWPrev.node(r,'pshot',''),h('div',{class:'tb'},avatarEl({avatar_url:r.avatar_url,display_name:r.display_name,username:r.username},'sm'),h('div',null,h('b',null,roomLabel(r)),h('span',{class:'s'},'@'+r.username+' \u00b7 '+r.visits+' visits'))));};
  const paint=()=>{
    const f=feat.filter(ok),t=trend.filter(ok),rows=feed.filter(ok);
    if(!f.length&&!t.length&&!rows.length){sec.replaceChildren(empty(cat?'No '+cat+' rooms yet':'No rooms yet',cat?'Rooms can pick interests in Room settings.':'Check back soon.'));return;}
        const fresh=[...rows].sort((a,b)=>new Date(b.created_at||b.updated_at)-new Date(a.created_at||a.updated_at));
    sec.replaceChildren(...[
      [h('h2',{class:'sec'},'Rooms'),h('p',{class:'sec-sub'},'Walk into someone\u2019s room and look around.')],
      f.length?[h('h2',{class:'sec'},'Featured rooms'),h('div',{class:'trend'},f.map(tcard))]:null,
      t.length?[h('h2',{class:'sec'},'Trending rooms'),h('div',{class:'trend'},t.map(tcard))]:null,
      rows.length?[h('h2',{class:'sec'},'New rooms'),h('div',{class:'ex-grid',style:{background:'none'}},fresh.map(roomPiece))]:null].flat().filter(Boolean));
  };
  sec.replaceChildren(spinner());OWAds.banner(adHost,null);
  try{[feed,trend,feat]=await Promise.all([Store.feed(50,0,WALL_SEED),Store.trending(10).catch(()=>[]),Store.featured().catch(()=>[])]);paint();drawCreators();}catch(e){sec.replaceChildren(empty('Could not load rooms',friendlyError(e)));}
}
/* ---------- ME ---------- */
function interestSheet(room,done){
  sheet('Your room interest',(b,close)=>{
    let pick=(room.categories||[])[0]||null;const w=h('div',{class:'chips'});const pc=()=>w.replaceChildren(...CATS.map(c=>h('button',{class:'chip'+(c===pick?' on':''),onclick:()=>{pick=c;pc();}},c+' Room')));pc();
    const save=h('button',{class:'btn coral block',style:{marginTop:'14px'}},'Save');
    save.onclick=()=>guard(save,async()=>{if(!pick){toast('Pick one interest','err');return;}const r=await sb.from('rooms').update({categories:[pick]}).eq('id',room.id);if(r.error)throw r.error;room.categories=[pick];toast('Your room is now a '+pick+' Room','ok');close();done&&done();});
    b.append(h('p',{class:'f-hint',style:{margin:'0 0 10px'}},'Pick the one interest your room is about. It shows on your card on the Wall and in Discover, and you can change it any time.'),w,save);});
}
function updRow(){
  const hint=h('span',{class:'f-hint'},'Checking\u2026'),lab=h('span',{class:'grow'},'App version');let st='unknown';
  const b=h('button',{onclick:()=>{if(st==='current'){toast('You already have the latest version','ok');return;}PWA.refreshNow();}},icon('refresh'),lab,hint);
  PWA.versionInfo().then(i=>{st=i.state;
    if(st==='current'){lab.textContent='You have the latest version';hint.textContent=i.offline?'\u2713 Up to date \u00b7 opens offline':'\u2713 Up to date';b.classList.add('upd-ok');}
    else if(st==='old'){lab.textContent='A new version is available';hint.textContent='Tap to update';}
    else{lab.textContent='Get the latest version';hint.textContent='Reloads the app';}});
  return b;}

/* ---- Settings: suggestions, complaints, password, sign out everywhere ---- */
function settingsSheet(){
  sheet('Settings',(body,close)=>{
    const msg=(kind,title,ph)=>{
      sheet(title,(b,c)=>{
        const t=h('textarea',{maxlength:'2000',rows:'6',placeholder:ph,style:{width:'100%'}});
        b.append(t,h('button',{class:'btn primary',style:{marginTop:'10px',width:'100%'},onclick:e=>guard(e.currentTarget,async()=>{
          const v=t.value.trim();if(v.length<3){toast('Write a little more','err');return;}
          const r=await sb.rpc('feedback_submit',{p_kind:kind,p_body:v});if(r.error){toast(errMsg(r.error),'err');return;}
          toast('Thank you, we got it','ok');c();})},'Send'));
      });
    };
    const pw=()=>sheet('Change password',(b,c)=>{
      const a=h('input',{type:'password',autocomplete:'new-password',placeholder:'New password (6+ characters)'}),
            z=h('input',{type:'password',autocomplete:'new-password',placeholder:'Type it again'});
      b.append(field('New password',a),field('Confirm',z),h('button',{class:'btn primary',style:{marginTop:'10px',width:'100%'},onclick:e=>guard(e.currentTarget,async()=>{
        if(a.value.length<6){toast('Use at least 6 characters','err');return;}
        if(a.value!==z.value){toast('The two do not match','err');return;}
        const r=await sb.auth.updateUser({password:a.value});if(r.error){toast(errMsg(r.error),'err');return;}
        toast('Password changed','ok');c();})},'Save password'));
    });
    body.append(h('div',{class:'list'},
      h('button',{onclick:()=>msg('suggestion','Suggestion','What would make OpenWalls better?')},icon('sliders'),h('span',{class:'grow'},'Suggestions')),
      h('button',{onclick:()=>msg('complaint','Complaint','Tell us what went wrong')},icon('lock'),h('span',{class:'grow'},'Complaint')),
      h('button',{onclick:pw},icon('lock'),h('span',{class:'grow'},'Change password')),
      h('button',{onclick:async()=>{if(!await confirmBox('Log out of all devices?','You will be signed out here and on every other phone or computer.','Log out everywhere',true))return;
        try{await sb.auth.signOut({scope:'global'});}catch(e){}
        try{await Auth.signOut();OWTv.stopMusic();}catch(e){}close();toast('Signed out everywhere');go('#/wall');}},icon('lock'),h('span',{class:'grow'},'Log out of all devices'))));
  });
}
async function meView(){
  const v=setView(false);drawNav('me');
  if(!Auth.user){v.append(h('div',{class:'pg-head'},h('div',{class:'brand'},logoEl(38),h('b',null,'OpenWalls'))),empty('Your room is waiting','Sign in to build your room and share it with everyone.',h('div',{style:{display:'flex',gap:'8px',justifyContent:'center'}},h('button',{class:'btn coral',onclick:()=>authSheet('signup')},'Create account'),h('button',{class:'btn',onclick:()=>authSheet('signin')},'Sign in'))));return;}
  const p=Auth.profile||{};v.append(spinner());
  let mine=null,cn={followers:0,following:0};try{[mine,cn]=await Promise.all([Store.mine(),Store.counts(Auth.user.id)]);}catch(e){console.warn(e);}
  const room=mine&&mine.room,prev=room&&Store.previewUrl(room.theme,room.updated_at);
  v.replaceChildren(h('div',{class:'pg-head'},h('div',{class:'brand'},h('b',null,'Me'))),
    h('div',{class:'me-card'},avatarEl(p,'lg'),h('h3',null,p.display_name||p.username||'You'),h('div',{class:'un'},'@'+(p.username||'')),p.bio?h('p',null,p.bio):null,h('div',{class:'counts'},h('button',{onclick:()=>followSheet(Auth.user.id,'followers')},h('b',null,cn.followers),h('span',null,'followers')),h('button',{onclick:()=>followSheet(Auth.user.id,'following')},h('b',null,cn.following),h('span',null,'following')),h('div',null,h('b',null,room?room.visits:0),h('span',null,'room visits'))),h('button',{class:'btn small',onclick:editProfileSheet},'Edit profile')),
    h('div',{class:'roomcard'},room?OWPrev.node(Object.assign({},room,{id:room.id}),'pshot','Your room'):h('div',{class:'pshot ph'},'Your room is not built yet'),
      activeSpaces(Auth.user.id),h('div',{class:'row'},h('button',{class:'btn coral',onclick:()=>go('#/edit')},room?'Edit room':'Build my open room'),room?h('button',{class:'btn light',onclick:()=>go('#/@'+p.username)},'View'):null,room?h('button',{class:'btn light',onclick:()=>shareRoom(p.username,room.name,room.visibility)},'Share'):null)),
    h('div',{class:'list'},h('button',{onclick:()=>{App.avBack='#/me';go('#/avatar');}},icon('body'),h('span',{class:'grow'},'My avatar')),room?h('button',{onclick:()=>roomSettings(room,()=>meView())},icon('sliders'),h('span',{class:'grow'},'Room settings')):null,
      PWA.canInstall()?h('button',{onclick:()=>PWA.install()},icon('download'),h('span',{class:'grow'},'Install OpenWalls')):null,
      updRow(),
      h('button',{onclick:()=>OWPaint.myArtworks()},icon('cam'),h('span',{class:'grow'},'My artworks')),
      h('button',{onclick:()=>go('#/ads')},icon('sliders'),h('span',{class:'grow'},'Advertise on OpenWalls')),
      Auth.isAdmin?h('button',{onclick:()=>{location.href='admin.html';}},icon('lock'),h('span',{class:'grow'},'Admin')):null,
      h('button',{onclick:()=>settingsSheet()},icon('sliders'),h('span',{class:'grow'},'Settings')),
      h('button',{onclick:async()=>{await Auth.signOut();try{OWTv.stopMusic();}catch(e){}toast('Signed out');go('#/wall');}},icon('lock'),h('span',{class:'grow'},'Sign out'))));
}
function followSheet(uid,kind){
  sheet(kind==='followers'?'Followers':'Following',(body,close)=>{
    body.append(spinner());
    Store.followList(uid,kind).then(xs=>{body.replaceChildren(xs.length?h('div',{class:'list',style:{margin:0}},xs.map(u=>h('button',{onclick:()=>{close();go('#/@'+u.username);}},avatarEl(u,'sm'),h('span',{class:'grow'},h('b',null,u.display_name||'@'+u.username),h('div',{class:'f-hint'},'@'+u.username))))):empty(kind==='followers'?'No followers yet':'Not following anyone yet',''));}).catch(e=>body.replaceChildren(empty('Could not load',friendlyError(e))));
  });
}
function activeSpaces(uid,close){
  const box=h('div',{class:'list',style:{margin:'12px 0 0',display:'none'}});
  sb.rpc('ow_user_spaces',{p_user:uid}).then(r=>{const xs=(r.data||[]);if(!xs.length)return;box.style.display='';
    box.replaceChildren(h('div',{class:'f-label',style:{padding:'0 4px 6px'}},'Spaces'),...xs.map(x=>h('button',{onclick:()=>{close&&close();go('#/space/'+x.id);}},icon('mic'),h('span',{class:'grow'},x.title),h('b',null,x.status==='live'?'Live now':'Soon'))));}).catch(()=>{});
  return box;
}
function photoSheet(R,name,hasMe){
  sheet('Take a photo',(body,close)=>{
    let withMe=hasMe,url='';const img=h('img',{style:{width:'100%',borderRadius:'12px',display:'block'},alt:'Photo preview'});
    const snap=()=>{try{url=R.photo(withMe);img.src=url;}catch(e){toast('Could not take the photo','err');}};
    const seg=h('div',{class:'seg'});
    const ps=()=>seg.replaceChildren(h('button',{class:withMe?'on':'',onclick:()=>{withMe=true;ps();snap();}},'With me'),h('button',{class:withMe?'':'on',onclick:()=>{withMe=false;ps();snap();}},'Room only'));
    if(hasMe)ps();
    const fname='openwalls-'+(name||'room').replace(/[^a-z0-9]+/gi,'-').toLowerCase()+'.png';
    const blob=()=>fetch(url).then(r=>r.blob());
    body.append(img,hasMe?h('div',{class:'field',style:{marginTop:'10px'}},seg):null,
      h('button',{class:'btn coral block',style:{marginTop:'10px'},onclick:()=>{const a=h('a',{href:url,download:fname});document.body.append(a);a.click();a.remove();toast('Photo saved','ok');}},'Save photo'),
      navigator.canShare?h('button',{class:'btn block',style:{marginTop:'8px'},onclick:async()=>{try{const f=new File([await blob()],fname,{type:'image/png'});if(navigator.canShare({files:[f]}))await navigator.share({files:[f],title:name||'OpenWalls'});else toast('Sharing images is not supported here');}catch(e){}}},'Share'):null);
    snap();
  });
}
function ownerSheet(o,cn){
  sheet('@'+o.username,(body,close)=>{
    body.append(h('div',{style:{textAlign:'center'}},h('div',{style:{display:'flex',justifyContent:'center'}},avatarEl(o,'lg')),h('h3',{style:{margin:'10px 0 2px',font:'800 22px var(--disp)'}},o.display_name||'@'+o.username),o.bio?h('p',null,o.bio):null,
      h('div',{class:'counts'},h('button',{onclick:()=>{close();followSheet(o.id,'followers');}},h('b',null,cn.followers),h('span',null,'followers')),h('button',{onclick:()=>{close();followSheet(o.id,'following');}},h('b',null,cn.following),h('span',null,'following')))),activeSpaces(o.id,close));
  });
}
async function shareRoom(username,name,vis){
  let url=roomUrl(username);
  if(vis==='private'){try{url+='/'+await Store.inviteCode();}catch(e){toast('Could not make the invite link','err');return;}}
  if(navigator.share){try{await navigator.share({title:name||'My open room on OpenWalls',text:'Come and see my open room on OpenWalls',url});return;}catch(e){if(e&&e.name==='AbortError')return;}}
  if(await copyText(url))toast('Room link copied','ok');else dialog({title:'Your room link',body:url});
}
/* choose paintings (from My artworks) to feature on the room card; at most 2 */
function featPicker(current,done){
  sheet('Choose paintings',async(body,close)=>{
    body.append(spinner());
    let r;try{r=await sb.from('paint_artworks').select('id,image_path,title').eq('user_id',Auth.user.id).order('created_at',{ascending:false}).limit(60);}catch(e){r={error:e};}
    if(r.error||!(r.data||[]).length){body.replaceChildren(empty('No paintings yet','Finish a Gist & Paint painting and save it, then choose it here.'));return;}
    const sel=[...current];const g=h('div',{class:'pt-gg'}),cnt=h('p',{class:'f-hint',style:{margin:'0 0 8px'}});
    const paint=()=>{cnt.textContent=sel.length+' of 2 chosen';g.replaceChildren(...r.data.map(a=>{const on=sel.indexOf(a.image_path)>=0;return h('button',{class:'pt-gc ft-pick'+(on?' on':''),style:{padding:0},'aria-label':a.title||'Painting',onclick:()=>{const k=sel.indexOf(a.image_path);if(k>=0)sel.splice(k,1);else if(sel.length>=2){toast('You can pick up to 2','err');return;}else sel.push(a.image_path);paint();}},h('img',{src:publicUrl('room-images',a.image_path),alt:'',loading:'lazy'}),on?h('i',{class:'ft-n'},String(sel.indexOf(a.image_path)+1)):null);}));};paint();
    body.replaceChildren(cnt,g,h('button',{class:'btn primary block',style:{marginTop:'12px'},onclick:()=>{close();done(sel);}},'Done'));
  });
}
function roomSettings(room,done){
  sheet('Room settings',(body,close)=>{
    const nm=h('input',{type:'text',maxlength:'60',value:room.name||''});
    /* up to 4 paintings shown on the room card */
    let feat=((room.theme&&room.theme.featured)||[]).filter(x=>typeof x==='string').slice(0,2);const fw=h('div',{class:'ft-slots'});
    const pf=()=>{fw.replaceChildren(...[0,1].map(n=>feat[n]?h('button',{class:'ft-slot on','aria-label':'Remove painting '+(n+1),onclick:()=>{feat.splice(n,1);pf();}},h('img',{src:publicUrl('room-images',feat[n]),alt:''}),h('i',null,'\u00d7')):h('button',{class:'ft-slot','aria-label':'Add a painting',onclick:()=>featPicker(feat,x=>{feat=x;pf();})},'+')));};pf();
    let vis=room.visibility==='private'?'private':'public';const vw=h('div',{class:'seg'});
    const pv=()=>vw.replaceChildren(...[['public','Public','Anyone can visit and see it on Discover'],['private','Private','Only you and people with your invite link can enter. Hidden from Discover and the Wall']].map(([k,l,n])=>h('button',{class:k===vis?'on':'',onclick:()=>{vis=k;pv();}},h('b',null,l),h('span',null,n))));pv();
    const hide=Object.assign({},room.theme&&room.theme.hide);
    const save=h('button',{class:'btn primary block',style:{marginTop:'14px'},onclick:()=>guard(save,async()=>{room.name=nm.value.trim()||'Open room';room.visibility=vis;room.theme=Object.assign({},room.theme,{hide});if(feat.length)room.theme.featured=feat;else delete room.theme.featured;await Store.saveRoom(room);toast('Saved','ok');close();done&&done();})},'Save');
    body.append(field('Room name',nm),h('div',{class:'field'},h('span',{class:'f-label'},'Who can visit'),vw),h('div',{class:'field'},h('span',{class:'f-label'},'Paintings on your room card (up to 2)'),fw,h('p',{class:'f-hint',style:{margin:'6px 0 0'}},'These show on your card in Discover and on the Wall. Tap a painting to remove it.')),room.id?h('div',{class:'field'},h('span',{class:'f-label'},'Invite link (for private rooms)'),h('div',{class:'row',style:{gap:'8px'}},h('button',{class:'btn',onclick:async()=>{if((room.visibility||'public')!=='private'){toast('Save the room as Private first');return;}shareRoom(Auth.profile.username,room.name,'private');}},'Share link'),h('button',{class:'btn light',onclick:()=>guard(null,async()=>{if((room.visibility||'public')!=='private'){toast('Save the room as Private first');return;}await Store.inviteCode(true);toast('Old links no longer work','ok');})},'New link'))):null,save);
  });
}

/* ---------- starter room: an improved Lagos living room ---------- */
function starterRoom(){
  const S=OW.SIZES.large,kx=S.w/6,kz=S.d/5.4;
  const room={name:'Open room',size:'large',width:S.w,depth:S.d,height:S.h,theme:{key:'lagos'},categories:[],visibility:'public'};
  const f=(type,x,z,rot,extra)=>Object.assign({id:uuid(),kind:'furniture',type,x:x*kx,y:0,z:z*kz,rot:rot||0,scale:1,color:null,z_index:0,props:{}},extra||{});
  const d=(type,wall,x,y,extra)=>{const dd=OW.decor(type);return Object.assign({id:uuid(),kind:'decor',type,wall,x:x*(wall==='left'||wall==='right'?kz:kx),y,z:0,rot:0,scale:1,width:dd.w,height:dd.h,frame:dd.frame||null,color:null,z_index:0,props:{}},extra||{});};
  const items=[f('rug',0,-.5),f('sofa',0,-2.15),f('coffee_table',0,-.6),f('bookshelf',-2.8,-1.2,Math.PI/2),f('plant',2.5,-2.2),f('floor_lamp',-2.5,-2.3),f('tv_stand',2.75,-.4,-Math.PI/2),f('tv',2.75,-.4,-Math.PI/2),
    d('curtains','back',1.08,1.5,{width:2.0,color:'#c4532d',z_index:1}),d('frame','back',-2.0,1.65,{z_index:2}),d('poster','back',-1.15,1.55,{z_index:3}),d('photo_frame','back',-.35,1.8,{z_index:4}),d('wall_clock','back',-1.15,2.3,{z_index:5}),d('neon','left',-.4,1.9,{title:'OPEN WALLS',z_index:6})];
  return{room,items};
}

/* every account gets a room of its own the first time it signs in (it only reaches the Wall once a picture is hung) */
let ensuring=false;
async function ensureRoom(){if(ensuring||!Auth.user)return;ensuring=true;try{const m=await Store.mine();if(!m){const st=starterRoom();await Store.createRoom(st.room,st.items);if(App.route==='me')route();}}catch(e){console.warn('ensureRoom',e);}ensuring=false;}
/* ---------- ROOM EDITOR ---------- */
async function editorView(){
  if(!Auth.user){go('#/me');authSheet('signin','Sign in to edit your room');return;}
  const v=setView(true);const host=h('div',{class:'room'});v.append(host);
  if(!OWRoom.supported()){host.append(empty('3D is not available on this device','Try another browser or device to build your room.',h('button',{class:'btn',onclick:()=>go('#/me')},'Back')));return;}
  host.append(spinner('Opening your room…'));
  let data;try{data=await Store.mine();}catch(e){host.replaceChildren(empty('Could not open your room',friendlyError(e),h('button',{class:'btn',onclick:()=>go('#/me')},'Back')));return;}
  let fresh=false;if(!data){const st=starterRoom();data={room:st.room,items:st.items};fresh=true;}
  host.replaceChildren();
  let room=data.room,dirty=fresh,saving=false,savedIds=new Set(fresh?[]:data.items.map(i=>i.id)),timer=0,panel=null,statusEl=h('span',{class:'save'},fresh?'Not saved yet':'Saved'),titleEl=h('b',null,room.name||'Open room');
  const R=new OWRoom(host,{edit:true,onHistory:()=>{try{hist();}catch(e){}},onSelect:it=>showPanel(it),onChange:()=>{dirty=true;statusEl.textContent='Unsaved changes';clearTimeout(timer);timer=setTimeout(()=>save(),2200);}});
  window.__room=R;
  R.load(room,data.items);
  try{const raw=localStorage.getItem('ow_pending_deco');if(raw){localStorage.removeItem('ow_pending_deco');const pd=JSON.parse(raw);
    if(pd&&pd.path&&Date.now()-pd.at<10*60*1000){const asp=pd.asp||.8,hh=+Math.sqrt(.63/asp).toFixed(3),w=+(hh*asp).toFixed(3);
      setTimeout(()=>{try{R.addDecor('artwork',{image_path:pd.path,width:w,height:hh,props:{art:true}});toast('Artwork added to your wall');}catch(e){toast('Could not add the artwork','err');}},700);}}}catch(e){}
  let previewTimer=0,stale=!room.theme||!room.theme.preview;
  async function persist(rm,items,withPreview,ui){
    const say=t=>{if(ui)statusEl.textContent=t;};
    try{
      if(!rm.id){const r=await Store.createRoom(rm,items);Object.assign(rm,r);if(R&&R.room)R.room.id=rm.id;room.id=rm.id;}
      else{const ids=new Set(items.map(i=>i.id));const removed=[...savedIds].filter(i=>!ids.has(i));await Store.saveRoom(rm);await Store.saveItems(rm.id,items,removed);}
      savedIds=new Set(items.map(i=>i.id));
      if(false){say('Saving preview…');try{const url=await OWRoom.preview(rm,items,480,360);const path=await Store.uploadPreview(url);rm.theme=Object.assign({},rm.theme,{preview:path,pv:Date.now()});if(R&&R.alive)R.room.theme=rm.theme;room.theme=rm.theme;await Store.saveRoom(rm);stale=false;}catch(e){console.warn('preview',e);}}
      say('Saved');return true;
    }catch(e){console.error(e);say('Could not save');if(ui)toast(friendlyError(e),'err');return false;}
  }
  async function save(withPreview){
    clearTimeout(timer);if(saving){timer=setTimeout(()=>save(withPreview),800);return;}
    if(!dirty&&!withPreview)return;saving=true;statusEl.textContent='Saving…';
    room=Object.assign(room,R.room);const ok=await persist(room,R.items.map(i=>({...i})),withPreview,true);if(ok){dirty=false;if(!withPreview){stale=true;clearTimeout(previewTimer);previewTimer=setTimeout(()=>{if(R.alive&&!dirty)save(true);},12000);}}else dirty=true;
    saving=false;
  }
  const finish=async()=>{statusEl.textContent='Saving…';await save(true);go('#/me');};
  const onHide=()=>{if(document.visibilityState==='hidden'&&dirty)save();};document.addEventListener('visibilitychange',onHide);
  App.teardown=()=>{clearTimeout(timer);clearTimeout(previewTimer);document.removeEventListener('visibilitychange',onHide);clearInterval(loadIv);
    /* leaving any other way (browser back, a nav tab): still save the latest room and refresh its preview */
    const rm=Object.assign(room,R.room),items=R.items.map(i=>({...i})),need=dirty||stale;R.destroy();window.__room=null;if(need&&room.id!==undefined)persist(rm,items,true,false);else if(need)persist(rm,items,true,false);};
  /* loading bar while pictures arrive */
  const lb=h('div',{class:'loadbar'},h('i'));host.append(lb);let loadIv=setInterval(()=>{lb.classList.toggle('on',R.loading>0);},250);
  const undoB=h('button',{class:'rbtn','aria-label':'Undo',onclick:()=>R.undo()},icon('undo')),redoB=h('button',{class:'rbtn','aria-label':'Redo',onclick:()=>R.redo()},icon('redo'));
  host.append(h('div',{class:'rtop'},h('button',{class:'rbtn','aria-label':'Back',onclick:finish},icon('back')),h('div',{class:'rtitle'},titleEl,statusEl),
    undoB,redoB,h('button',{class:'rbtn','aria-label':'Reset camera',onclick:()=>R.resetCamera()},icon('reset')),h('button',{class:'rbtn dark',onclick:finish},'Done')));
  const hist=()=>{undoB.disabled=!R.canUndo();redoB.disabled=!R.canRedo();};hist();
  const tabs={};let active=null;
  const dock=h('div',{class:'dock'},h('div',{class:'bar'},
    ...[['furn','Furniture','sofa',()=>catalogue('living')],['wall','Wall','frame',()=>wallSheet()],['room','Room','house',()=>roomSheet()],['share','Share','share',async()=>{await save();if(!room.id){toast('Save your room first','err');return;}shareRoom(Auth.profile.username,room.name,room.visibility);}]].map(([k,l,ic,fn])=>h('button',{class:'dk',onclick:fn},icon(ic),h('span',null,l)))));
  host.append(dock,h('div',{class:'hint'},'Drag to look around · pinch to zoom · tap an item to edit'));
  setTimeout(()=>{const x=host.querySelector('.hint');x&&x.remove();},6000);
  /* ----- catalogue ----- */
  function addDeco(def,extra){return R.addDecor(def.id,extra);}
  async function addFromCatalogue(def,close){
    if(!def.deco){close();R.addFurniture(def.id);return;}
    if(def.img){close();paintingPicker();return;}
    if(false){const f=await pickFile('image/jpeg,image/png,image/webp');if(!f)return;
      await guard(null,async()=>{toast('Uploading…');const up=await Store.uploadPicture(f);const asp=up.width/up.height;let w=def.w,hh=def.h;if(def.id!=='album'){const area=def.w*def.h;hh=Math.sqrt(area/asp);w=hh*asp;}else{hh=w=def.w;}
        close();R.addDecor(def.id,{image_path:up.path,width:+w.toFixed(3),height:+hh.toFixed(3)});});return;}
    close();R.addDecor(def.id);
  }
  /* only paintings made in Gist & Paint can hang on a wall */
  function paintingPicker(swapId){
    sheet(swapId?'Choose another painting':'Hang a painting',async(body,close)=>{
      body.append(spinner());
      let r;try{r=await sb.from('paint_artworks').select('id,image_path,title,space_title,created_at').eq('user_id',Auth.user.id).order('created_at',{ascending:false}).limit(60);}catch(e){r={error:e};}
      if(r.error||!(r.data||[]).length){body.replaceChildren(empty('No paintings yet','Join a Gist & Paint session, finish a painting and save it. Then you can hang it here.'),h('button',{class:'btn coral block',style:{marginTop:'12px'},onclick:()=>{close();go('#/discover');}},'Go to Gist & Paint'));return;}
      const hang=a=>{const im=new Image();im.onload=()=>{const asp=(im.naturalWidth||4)/(im.naturalHeight||5),hh=+Math.sqrt(.63/asp).toFixed(3),w=+(hh*asp).toFixed(3);close();
          if(swapId)R.update(swapId,{image_path:a.image_path,width:w,height:hh,props:Object.assign({},(R.get(swapId)||{}).props,{art:true,adj:undefined})});else R.addDecor('artwork',{image_path:a.image_path,width:w,height:hh,props:{art:true}});};
        im.onerror=()=>toast('Could not load that painting','err');im.src=publicUrl('room-images',a.image_path);};
      body.replaceChildren(h('p',{class:'f-hint',style:{margin:'0 0 8px'}},'Tap a painting to hang it on the wall you are facing.'),h('div',{class:'pt-gg'},r.data.map(a=>h('button',{class:'pt-gc',style:{padding:0},'aria-label':a.title||'Painting',onclick:()=>hang(a)},h('img',{src:publicUrl('room-images',a.image_path),alt:a.title||'Painting',loading:'lazy'})))));
    });
  }
  function catalogue(start,only){
    sheet(only?'Wall decorations':'Add to your room',(body,close)=>{
      let cat=start;const tabsEl=h('div',{class:'scrollx',style:{padding:'0 0 10px'}}),grid=h('div',{class:'cat-grid'});
      const paint=()=>{
        if(!only)tabsEl.replaceChildren(...OW.CATS.map(([k,l])=>h('button',{class:'chip'+(k===cat?' on':''),onclick:()=>{cat=k;paint();}},l)));
        const noPic=d=>!(d.img||d.id==='collage'||d.id==='noticeboard');const list=[...OW.FURN,...OW.DECOR].filter(noPic).filter(d=>only?d.deco&&d.cat==='wall'||d.cat==='decor'&&d.deco:d.cat===cat||(d.deco&&d.cat===cat));
        const lst=only?list:[...OW.FURN,...OW.DECOR].filter(noPic).filter(d=>d.cat===cat);
        grid.replaceChildren(...lst.map(d=>{const im=h('img',{alt:'',width:112,height:112});const b=h('button',{class:'cat',onclick:()=>addFromCatalogue(d,close)},im,d.name);
          setTimeout(()=>{try{im.src=OWRoom.thumb(d.id);}catch(e){}},20);return b;}));
      };
      paint();body.append(only?null:tabsEl,grid);
    });
  }
  function wallSheet(){
    sheet('Decorate a wall',(body,close)=>{
      body.append(h('p',{class:'tag',style:{margin:'0 0 8px'}},'Choose a wall to look at, then hang your paintings. Drag them around the wall.'),
        h('div',{class:'chips',style:{marginBottom:'14px'}},...[['back','Back wall'],['left','Left wall'],['right','Right wall'],['front','Front wall']].map(([k,l])=>h('button',{class:'chip',onclick:()=>{R.focusWall(k);}},l))),
        h('button',{class:'btn coral block',onclick:()=>{close();paintingPicker();}},icon('frame'),'Hang one of my paintings'),
        h('button',{class:'btn block',style:{marginTop:'8px'},onclick:()=>{close();catalogue('wall',true);}},'Add a decoration (clock, lights, curtains…)'),
        h('div',{class:'f-label',style:{margin:'18px 0 8px'}},'Tidy the wall you are facing'),
        (()=>{const gap=h('input',{type:'range',min:'3',max:'40',value:'12',style:{width:'100%',accentColor:'var(--violet)'}});const lab=h('span',{class:'f-hint'},'Spacing: 12 cm');gap.oninput=()=>{lab.textContent='Spacing: '+gap.value+' cm';};
          const run=mode=>{const w=R.facing(),n=R.arrangeWall(w,mode,gap.value/100);toast(n?'Arranged '+n+' on the '+w+' wall':'No pictures on the '+w+' wall to arrange',n?'ok':'err');};
          return h('div',null,lab,gap,h('div',{style:{display:'flex',gap:'8px',marginTop:'8px'}},h('button',{class:'btn',style:{flex:1},onclick:()=>{run('grid');}},'Grid'),h('button',{class:'btn',style:{flex:1},onclick:()=>{run('row');}},'Single row')),h('p',{class:'f-hint',style:{marginTop:'8px'}},'You can also pinch a selected picture to resize it.'));})());
    });
  }
  function roomSheet(){
    sheet('Your room',(body,close)=>{
      const sizes=h('div'),themes=h('div',{class:'themes'}),floors=h('div',{class:'fl-row'}),nm=h('input',{type:'text',maxlength:'60',value:room.name||''});
      const paint=()=>{
        sizes.replaceChildren(...Object.entries(OW.SIZES).map(([k,s])=>h('button',{class:'size-opt'+(R.room.size===k?' on':''),onclick:()=>{R.setSize(k);paint();}},h('i',{class:'box',style:{width:(26+s.w*3)+'px',height:(20+s.d*3)+'px'}}),h('div',null,h('b',null,s.label),h('span',null,s.w+' × '+s.d+' m, '+s.h+' m high')))));
        themes.replaceChildren(...Object.entries(OW.THEMES).map(([k,t])=>h('button',{class:'theme'+((R.room.theme&&R.room.theme.key||'lagos')===k?' on':''),onclick:()=>{R.setTheme(k);paint();}},h('i',{style:{background:t.wall,'--f':t.floor}}),t.name)));
        const cur=(R.room.theme&&R.room.theme.floor)||'',FC=[['','Style default'],['#ffffff','White'],['#111111','Black'],['#8a8f98','Grey'],['#f1e6d0','Cream'],['#d8b98a','Light wood'],['#7a5230','Dark wood'],['#c9a26b','Sand'],['#3b5bdb','Blue'],['#2f9e6f','Green'],['#e8749a','Pink'],['#c0392b','Red'],['#7b4dff','Purple']];
        floors.replaceChildren(...FC.map(([c,l])=>h('button',{class:'fl-sw'+(cur.toLowerCase()===c?' on':''),'aria-label':l,title:l,onclick:()=>{R.setFloor(c);paint();}},h('i',{style:{background:c||'repeating-linear-gradient(45deg,#e6dcc8,#e6dcc8 5px,#f6efe4 5px,#f6efe4 10px)'}}),h('span',null,l))),
          h('label',{class:'fl-sw fl-own'+(cur&&!FC.some(x=>x[0]===cur.toLowerCase())?' on':'')},h('i',{style:{background:'conic-gradient(red,yellow,lime,cyan,blue,magenta,red)'}}),h('span',null,'Your colour'),h('input',{type:'color',value:/^#[0-9a-f]{6}$/i.test(cur)?cur:'#ffffff',onchange:e=>{R.setFloor(e.target.value);paint();}})));
      };paint();
      nm.addEventListener('change',()=>{room.name=nm.value.trim()||'Open room';R.room.name=room.name;titleEl.textContent=room.name;R.changed();});
      body.append(field('Room name',nm),h('div',{class:'f-label',style:{margin:'4px 0 8px'}},'Room size'),sizes,h('div',{class:'f-label',style:{margin:'12px 0 8px'}},'Style'),themes,h('div',{class:'f-label',style:{margin:'14px 0 8px'}},'Floor colour'),floors,
        h('button',{class:'btn block',style:{marginTop:'14px'},onclick:()=>{close();roomSettings(Object.assign(room,{name:R.room.name||room.name,theme:R.room.theme}),()=>{R.room.categories=room.categories;R.room.theme=room.theme;R.buildShell();R.changed();});}},icon('sliders'),'Room name & card'));
    });
  }
  /* ----- selected item panel ----- */
  function showPanel(it){
    if(panel){panel.remove();panel=null;}R.setInset(0);const dk=host.querySelector('.dock');dk&&dk.classList.remove('off');if(!it)return;const def=OW.def(it.type);
    const rs=h('input',{type:'range',min:'-180',max:'180',step:'1',value:String(Math.round((it.rot||0)*180/Math.PI))});
    rs.addEventListener('input',()=>R.update(it.id,{rot:rs.value*Math.PI/180}));
    const sc=h('input',{type:'range',min:'40',max:'220',step:'1',value:String(Math.round((it.scale||1)*100))});sc.addEventListener('input',()=>R.update(it.id,{scale:sc.value/100}));
    const rows=h('div',{class:'rows'},h('label',null,'Rotate'),rs,h('label',null,'Size'),sc);
    const acts=h('div',{class:'acts'});
    if(it.kind==='decor'&&def.img){acts.append(h('button',{class:'btn',onclick:()=>paintingPicker(it.id)},icon('image'),'Choose another painting'));
      if(it.image_path){const ad=Object.assign({z:1,x:0,y:0},it.props&&it.props.adj);let raf=0;const ap=()=>{cancelAnimationFrame(raf);raf=requestAnimationFrame(()=>R.update(it.id,{props:Object.assign({},it.props,{adj:Object.assign({},ad)})}));};
        const sl=(l,k,mn,mx,st)=>{const i=h('input',{type:'range',min:mn,max:mx,step:st,value:String(ad[k])});i.addEventListener('input',()=>{ad[k]=+i.value;ap();});return[h('label',null,l),i];};
        const box=h('div',{class:'rows',style:{display:'none'}},...sl('Zoom','z','1','3','.05'),...sl('Left / right','x','-1','1','.05'),...sl('Up / down','y','-1','1','.05'),h('button',{class:'btn',onclick:()=>{ad.z=1;ad.x=0;ad.y=0;ap();box.querySelectorAll('input').forEach((i,n)=>i.value=[1,0,0][n]);}},'Reset'));
        acts.append(h('button',{class:'btn',onclick:()=>{box.style.display=box.style.display==='none'?'':'none';}},'Adjust picture'),box);}
      const fr=h('div',{class:'chips'});const pf=()=>fr.replaceChildren(...Object.entries(OW.FRAMES).map(([k,l])=>h('button',{class:'chip'+((it.frame||'none')===k?' on':''),onclick:()=>{R.update(it.id,{frame:k});pf();}},l)));pf();acts.append(fr);}
    if(it.type==='neon'||it.type==='curtains'||it.kind==='furniture'&&def.col){const cols=['#ff3d81','#3ddc97','#ffd23f','#6c4bff','#ff5a3c','#2d7bff','#c4532d','#2f6b4f','#d9a441','#e8d5b9','#1c1f2e','#f4f1ea'];const sw=h('div',{class:'swatches'});const pc=()=>sw.replaceChildren(...cols.map(c=>h('button',{class:'sw'+((it.color||def.col)===c?' on':''),style:{background:c},'aria-label':'Colour '+c,onclick:()=>{R.update(it.id,{color:c});pc();}})));pc();acts.append(sw);}
    if(it.type==='collage'){acts.append(h('button',{class:'btn',onclick:async()=>{const have=((it.props&&it.props.images)||[]).length;if(have>=6){toast('The board holds 6 photos');return;}const fs=await pickFiles('image/jpeg,image/png,image/webp',6-have);if(!fs||!fs.length)return;await guard(null,async()=>{toast('Uploading…');const out=[...((it.props&&it.props.images)||[])];for(const f of fs.slice(0,6-have)){const up=await Store.uploadPicture(f);out.push(up.path);}R.update(it.id,{props:Object.assign({},it.props,{images:out})});});}},icon('image'),'Add photos'),((it.props&&it.props.images)||[]).length?h('button',{class:'btn',onclick:()=>R.update(it.id,{props:Object.assign({},it.props,{images:[]})})},'Clear photos'):null);}
    const ib=(ic,label,fn,cls)=>h('button',{class:'icon-btn'+(cls?' '+cls:''),'aria-label':label,title:label,onclick:fn},icon(ic));
    const hdr=h('div',{class:'ph'},h('b',null,def.name),
      ib('move','Move with arrows',()=>moveMode(it,def)),ib('copy','Duplicate',()=>R.duplicate(it.id)),(it.kind==='decor'&&def.img)?null:ib('link',it.kind==='decor'?'Text and link':'Details and link',()=>detailsSheet(it,def)),
      ib('trash','Remove',async()=>{if(await confirmBox('Remove this?','It will be taken out of your room.','Remove',true)){R.remove(it.id);}},'danger'),
      ib('close','Close',()=>R.select(null)));
    panel=h('div',{class:'panel compact'},hdr,rows,acts.children.length?acts:null);
    host.append(panel);dk&&dk.classList.add('off');R.setInset((panel.offsetHeight+20)/2);
  }
  /* move with arrows: the arrows follow the way you are looking; Cancel puts it back, Done keeps it */
  function moveMode(it,def){
    const start={x:it.x,y:it.y,z:it.z};const STEP=.08;
    const stepBy=(dir)=>{
      const live=R.get(it.id);if(!live)return;const az=R.az;
      if(live.kind==='furniture'){
        const fx=-Math.sin(az),fz=-Math.cos(az),rx=Math.cos(az),rz=-Math.sin(az);
        const dx=dir==='u'?fx:dir==='d'?-fx:dir==='r'?rx:-rx,dz=dir==='u'?fz:dir==='d'?-fz:dir==='r'?rz:-rz;
        R.update(live.id,{x:+(live.x+dx*STEP).toFixed(3),z:+(live.z+dz*STEP).toFixed(3)});
      }else{
        if(dir==='u'||dir==='d'){R.update(live.id,{y:+(live.y+(dir==='u'?STEP:-STEP)).toFixed(3)});return;}
        const f=R.wf()[live.wall||'back'],rx=Math.cos(az),rz=-Math.sin(az),sg=(f&&(f.u[0]*rx+f.u[2]*rz)<0)?-1:1;
        R.update(live.id,{x:+(live.x+(dir==='r'?1:-1)*sg*STEP).toFixed(3)});
      }
    };
    const arrow=(d,ic,label)=>{let t=null;const stop=()=>{clearInterval(t);t=null;};const b=h('button',{class:'ar ar-'+d,'aria-label':label},icon(ic));
      b.addEventListener('pointerdown',e=>{e.preventDefault();stepBy(d);stop();t=setInterval(()=>stepBy(d),90);});['pointerup','pointerleave','pointercancel'].forEach(ev=>b.addEventListener(ev,stop));return b;};
    const pad=h('div',{class:'pad'},arrow('u','arrU','Move up'),arrow('l','arrL','Move left'),h('span',{class:'pad-c'},icon('move')),arrow('r','arrR','Move right'),arrow('d','arrD','Move down'));
    const back=()=>showPanel(R.get(it.id)||null);
    const cancel=h('button',{class:'btn',onclick:()=>{R.update(it.id,{x:start.x,y:start.y,z:start.z});back();}},'Cancel'),done=h('button',{class:'btn coral',onclick:back},icon('check'),'Done');
    panel.replaceChildren(h('div',{class:'mv'},pad,h('div',{class:'mv-side'},h('b',null,def.name),h('span',{class:'f-hint'},it.kind==='decor'?'Slide it along the wall, or up and down.':'Nudge it across the floor. Hold to keep moving.'),h('div',{class:'mv-btns'},cancel,done))));
    R.setInset((panel.offsetHeight+20)/2);
  }
  function detailsSheet(it,def){
    sheet('Details',(body,close)=>{
      const ph=def.ph||OW.FPH[it.type]||{},ti=h('input',{type:'text',maxlength:'80',value:it.title||'',placeholder:it.type==='neon'?'Text on the sign':ph.t||'Title'}),
        ds=h('textarea',{maxlength:'500',placeholder:it.type==='noticeboard'?'One note per line':ph.d||'Tell visitors about it'}),li=h('input',{type:'url',maxlength:'500',value:it.link||'',placeholder:ph.l||'https://…'});ds.value=it.description||'';
      body.append(field(it.type==='neon'?'Sign text':'Title',ti),field(it.type==='noticeboard'?'Notes':'Description',ds),it.type==='neon'?null:field('Link',li,'YouTube, Vimeo, Spotify, SoundCloud and Apple Music links play right inside the room. Any other link opens in the browser.'),
        h('button',{class:'btn primary block',onclick:()=>{let l=li.value.trim();if(l&&!safeUrl(l)){const s=safeUrl('https://'+l);if(!s){toast('That link does not look right','err');return;}l=s;}R.update(it.id,{title:ti.value.trim()||null,description:ds.value.trim()||null,link:l||null});close();}},'Save'));
    });
  }
  if(fresh)save();
}

/* ---------- VISITOR VIEW ---------- */
async function visitView(hs0){
  const pp=hs0.split('/'),username=pp[0],code=(pp[1]||'').toLowerCase();
  const v=setView(true);const host=h('div',{class:'room'});v.append(host,h('div',{class:'rtop'},h('button',{class:'rbtn','aria-label':'Back',onclick:()=>{if(history.length>1&&App.hadRoute)history.back();else go('#/wall');}},icon('back'))));host.append(spinner('Opening room…'));
  let d,ci;try{d=await Store.byUsername(username,code);}catch(e){host.replaceChildren(empty('Could not open this room',friendlyError(e),h('button',{class:'btn',onclick:()=>go('#/wall')},'Back to the Wall')));return;}
  if(!d){host.replaceChildren(empty('Room not found','This room is private or does not exist. If you were given an invite code, enter it here.',h('div',{class:'row',style:{gap:'8px',justifyContent:'center',flexWrap:'wrap'}},ci=h('input',{type:'text',maxlength:'20',placeholder:'Invite code',autocapitalize:'none',style:{maxWidth:'180px'}}),h('button',{class:'btn coral',onclick:()=>{const c=ci.value.trim().toLowerCase();if(c)go('#/@'+username+'/'+encodeURIComponent(c));}},'Enter'),h('button',{class:'btn',onclick:()=>go('#/wall')},'Back to the Wall'))));return;}
  const o=d.owner;
  if(!d.room){host.replaceChildren(empty('@'+o.username+' has not built a room yet',d.is_me?'Build yours now.':'Check back soon.',d.is_me?h('button',{class:'btn coral',onclick:()=>go('#/edit')},'Build my open room'):h('button',{class:'btn',onclick:()=>go('#/wall')},'Back to the Wall')));return;}
  host.replaceChildren();document.title=d.room.name+' · @'+o.username+' · OpenWalls';
  let R=null;
  let hud=null;
  if(OWRoom.supported()){R=new OWRoom(host,{edit:false,onOpen:openItem,onNear:n=>hud&&hud.setAction(n),onLook:()=>{App.avBack='#/@'+hs0;go('#/avatar');},onToast:t=>toast(t)});R.load(d.room,d.items);try{OWTv.unpark();}catch(e){}App.teardown=()=>{OWTv.close(d.room.id);OWTv.park();hud&&hud.destroy();R.destroy();document.title="OpenWalls · Discover what's on everyone's walls";};
    R.liveStart({roomId:d.room.id,uid:Auth.user&&Auth.user.id,ownerId:o.id,cb:{onTap:info=>info.owner?ownerSheet(o,cn):sheet(info.name,(b,close)=>{b.append(info.username?h('button',{class:'btn coral block',onclick:()=>{close();go('#/@'+info.username);}},'View profile'):h('p',{class:'tag'},'Visiting this room'));})}});}
  else{host.append(fallback(d));}
  if(!App.visited[d.room.id]&&!d.is_me){App.visited[d.room.id]=1;Store.visit(d.room.id);}
  let cn={followers:0,following:0,iFollow:false};try{cn=await Store.counts(o.id);}catch(e){}
  const fol=h('button',{class:'rbtn '+(cn.iFollow?'':'coral'),onclick:()=>{if(!Auth.user){authSheet('signin','Sign in to follow '+o.username);return;}guard(fol,async()=>{await Store.follow(o.id,!cn.iFollow);cn.iFollow=!cn.iFollow;fol.textContent=cn.iFollow?'Following':'Follow';fol.classList.toggle('coral',!cn.iFollow);});}},cn.iFollow?'Following':'Follow');
  const cntPill=h('span',{class:'live-n',style:{display:'none'},'aria-label':'People in this room'});if(R)R.onCount=n=>{cntPill.style.display=n>0?'':'none';cntPill.replaceChildren(h('i'),String(n));};
  const top=h('div',{class:'rtop'},h('button',{class:'rbtn','aria-label':'Back',onclick:()=>go(d.is_me?'#/me':'#/wall')},icon('back')),
    h('button',{class:'owner',onclick:()=>ownerSheet(o,cn)},avatarEl(o,'sm'),h('div',{class:'who'},h('b',null,d.room.name),h('span',{class:'s'},'@'+o.username+(cn.followers?' · '+cn.followers+' followers':'')))),
    cntPill,
    d.is_me?h('button',{class:'rbtn dark',onclick:()=>go('#/edit')},icon('edit'),'Edit'):fol,
    h('button',{class:'rbtn','aria-label':'Share room',onclick:()=>{if(d.room.visibility==='private'&&!d.is_me){toast('Only the owner can share a private room');return;}shareRoom(o.username,d.room.name,d.room.visibility);}},icon('share')),
    R?h('button',{class:'rbtn','aria-label':'Take a photo',onclick:()=>photoSheet(R,d.room.name,!!R.me)},icon('cam')):null,
    R?h('button',{class:'rbtn','aria-label':'Reset camera',onclick:()=>R.resetCamera()},icon('reset')):null,
    R?h('button',{class:'rbtn walkbtn','aria-label':'Walk around or overview',onclick:()=>hud?leaveWalk():enterWalk(true)},icon('walk')):null);
  v.querySelector('.rtop').replaceWith(top);
  const walkBtn=()=>v.querySelector('.walkbtn');
  async function enterWalk(manual){if(!R||hud)return;const cfg=await Store.loadAvatar();if(!cfg){if(manual){App.avBack='#/@'+username;chooseAvatar();}return;}R.startWalk(cfg);hud=walkHud(host,R);if(Auth.user){const pf=Auth.profile||{};R.liveTrack({uid:Auth.user.id,name:pf.display_name||pf.username||'Guest',username:pf.username||'',cfg});}const b=walkBtn();b&&b.classList.add('on');host.classList.add('walking');
    const hn=host.querySelector('.hint');hn&&hn.remove();host.append(h('div',{class:'hint'},'Joystick to walk · tap the floor to go there · drag to look'));setTimeout(()=>{const x=host.querySelector('.hint');x&&x.remove();},6000);}
  function leaveWalk(){if(!hud)return;hud.destroy();hud=null;R.liveUntrack();R.stopWalk();const b=walkBtn();b&&b.classList.remove('on');host.classList.remove('walking');}
  if(R)host.append(h('div',{class:'hint'},'Drag to look · pinch to zoom · tap the dots'));
  if(R)enterWalk();
  host.append(socialBar(d,o));
  setTimeout(()=>{const x=host.querySelector('.hint');x&&x.remove();},6000);
  if(Auth.isAdmin&&!d.is_me){let on=!!d.room.featured;const fb=h('button',{class:'rbtn dark',style:{position:'absolute',left:'12px',top:'calc(64px + var(--sat))',zIndex:5},onclick:()=>guard(fb,async()=>{await Store.setFeatured(d.room.id,!on);on=!on;fb.textContent=on?'★ Featured (tap to remove)':'☆ Feature this room';})},on?'★ Featured (tap to remove)':'☆ Feature this room');host.append(fb);}
  if(R){const lb=h('div',{class:'loadbar'},h('i'));host.append(lb);const iv=setInterval(()=>{lb.classList.toggle('on',R.loading>0);},250);const old=App.teardown;App.teardown=()=>{clearInterval(iv);old&&old();};}
  /* YouTube links play on the room's shared TV (synced for everyone in the room) */
  function tvPlay(it,src){OWTv.open({host,roomId:d.room.id,uid:Auth.user&&Auth.user.id,isOwner:!!d.is_me,vid:src,title:it.title||null,comments:{load:v=>Store.videoComments(d.room.id,v),post:async(v,t)=>{if(!needAuth('Sign in to comment'))throw new Error('auth');try{await Store.videoComment(d.room.id,v,t);}catch(e){toast(friendlyError(e),'err');throw e;}}}});}
  function openItem(it){
    if(it.type==='speaker'){const src=it.link&&OWTv.parse(it.link);OWTv.open({host,roomId:d.room.id,uid:Auth.user&&Auth.user.id,isOwner:!!d.is_me,vid:src||null,title:it.title||null,music:true,seed:d.is_me?(d.room.theme&&d.room.theme.playlist):null,onQueue:d.is_me?(q=>Store.savePlaylist(q)):null});return;}
    const src=it.link&&OWTv.parse(it.link);if(src)return tvPlay(it,src);
    const def=OW.def(it.type);const hasInfo=it.title||it.description||it.link||it.image_path||(it.props&&it.props.images&&it.props.images.length);if(!hasInfo)return;
    sheet(it.title||def.name,(body)=>{
      const wrap=h('div',{class:'viewer'});if(def.hint==='book_stack'&&it.title)wrap.append(h('div',{class:'bookcard'},h('b',null,it.title)));
      if(it.image_path)wrap.append(h('img',{src:publicUrl('room-images',it.image_path),alt:it.title||def.name}));
      const ci=it.type==='collage'&&it.props&&it.props.images;if(ci&&ci.length)wrap.append(h('div',{class:'cgrid'},ci.map(pth=>h('img',{src:publicUrl('room-images',pth),alt:'',loading:'lazy'}))));
      const em=it.link&&embedFor(it.link);if(em)wrap.append(h('iframe',{src:em.src,allow:'autoplay; encrypted-media; picture-in-picture; clipboard-write',allowfullscreen:'',title:it.title||em.name,loading:'lazy',style:em.height?{aspectRatio:'auto',height:em.height+'px'}:{aspectRatio:em.ratio}}));
      if(it.type==='noticeboard'&&it.description)wrap.append(h('div',{class:'chips',style:{marginBottom:'12px'}},it.description.split('\n').filter(Boolean).map(n=>h('span',{class:'chip'},n))));
      else if(it.description)wrap.append(h('p',null,it.description));
      if(it.link){const info=identifyLink(it.link);wrap.append(h('button',{class:'btn coral block',onclick:()=>openExternal(it.link)},icon('link'),(def.hint==='book_stack'?'Read or buy':info&&info.key!=='link'?'Open on '+info.name:'Open link')));}
      body.append(wrap);
    });
  }
}
function socialBar(d,o){
  let soc={counts:{},mine:null,comments:0};const room=d.room;
  const total=()=>Object.values(soc.counts).reduce((a,b)=>a+(+b||0),0);
  const rx=h('button',{class:'dk wide','aria-label':'React'}),cm=h('button',{class:'dk wide','aria-label':'Comments'}),ms=h('button',{class:'dk wide','aria-label':'Message'},icon('send'),h('span',null,'Message')),tp=h('button',{class:'dk wide','aria-label':'Topics'});let tpN=0;const paintTp=()=>tp.replaceChildren(icon('topics'),h('span',null,tpN?'Topics '+tpN:'Topics'));paintTp();
  tp.style.display='none';appFlags().then(F=>{if(F.forum!==true)return;tp.style.display='';OWForum.userData(room.owner_id).then(x=>{tpN=x.count||0;paintTp();});});
  const paint=()=>{rx.replaceChildren(h('span',{class:'em'},soc.mine?EMOJI[soc.mine]:'♡'),h('span',null,total()||'React'));rx.classList.toggle('on',!!soc.mine);cm.replaceChildren(icon('chat'),h('span',null,soc.comments?soc.comments+(soc.comments==1?' comment':' comments'):'Comment'));};
  paint();Store.social(room.id).then(x=>{soc=x;paint();}).catch(()=>{});
  const pick=async kind=>{if(!needAuth('Sign in to react'))return;const was=soc.mine;const next=was===kind?null:kind;await guard(rx,async()=>{await Store.react(room.id,next);if(was)soc.counts[was]=Math.max(0,(soc.counts[was]||0)-1);if(next)soc.counts[next]=(soc.counts[next]||0)+1;soc.mine=next;paint();});};
  rx.onclick=e=>{const old=document.querySelector('.pop');if(old){old.remove();return;}const pop=h('div',{class:'pop'},Object.entries(EMOJI).map(([k,em])=>h('button',{class:soc.mine===k?'on':'','aria-label':k,onclick:()=>{pop.remove();pick(k);}},em)));rx.parentElement.parentElement.append(pop);setTimeout(()=>document.addEventListener('pointerdown',function f(ev){if(!pop.contains(ev.target)){pop.remove();document.removeEventListener('pointerdown',f);}}),0);};
  cm.onclick=()=>commentsSheet(d,n=>{soc.comments=n;paint();});
  ms.onclick=()=>{if(d.is_me){toast('This is your own room');return;}if(!needAuth('Sign in to send a message'))return;go('#/chat/'+o.username);};
  tp.onclick=()=>OWForum.userSheet(room.owner_id,o.username,!!d.is_me,n=>{tpN=n;paintTp();});
  if(d.is_me)ms.style.display='none';
  return h('div',{class:'dock social'},h('div',{class:'bar'},rx,cm,ms,tp));
}
function commentsSheet(d,onCount){
  sheet('Comments',(body)=>{
    const list=h('div',{style:{marginBottom:'10px'}},spinner()),inp=h('input',{type:'text',maxlength:'300',placeholder:Auth.user?'Say something nice…':'Sign in to comment',style:{flex:1,padding:'12px 14px',borderRadius:'99px',border:'1.5px solid var(--line)',background:'#fff'}});
    const send=h('button',{class:'btn coral small'},'Post');
    const load=async()=>{try{const cs=await Store.comments(d.room.id);onCount&&onCount(cs.length);
      list.replaceChildren(...(cs.length?cs.map(c=>h('div',{class:'cmt'},avatarEl(c,'sm'),h('div',{class:'cb'},h('b',null,'@'+c.username),h('span',{class:'t'},' '+timeAgo(c.created_at)),h('p',null,c.body),
        h('div',{class:'cact'},(Auth.user&&(c.user_id===Auth.user.id||d.is_me))?h('button',{onclick:()=>guard(null,async()=>{await Store.delComment(c.id);load();})},'Delete'):null)))):[h('p',{class:'tag',style:{textAlign:'center',padding:'18px'}},'No comments yet. Start the conversation.')]));}catch(e){list.replaceChildren(h('p',{class:'tag'},friendlyError(e)));}};
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
    wrap.replaceChildren(h('div',{class:'rtop',style:{position:'relative',background:'var(--paper)',borderBottom:'1px solid var(--line)'}},h('button',{class:'rbtn','aria-label':'Back',onclick:()=>go('#/inbox')},icon('back')),h('button',{class:'owner',onclick:()=>go('#/@'+o.username)},avatarEl(o,'sm'),h('div',{class:'who'},h('b',null,o.display_name||'@'+o.username),h('span',{class:'s'},'@'+o.username)))),list,
    h('div',{class:'cin'},inp,send));
  let last='';const load=async()=>{try{const ms=await Store.thread(o.id);const key=ms.length+':'+(ms[ms.length-1]||{}).id;if(key===last)return;last=key;const nearEnd=list.scrollHeight-list.scrollTop-list.clientHeight<80||!list.childNodes.length;
    list.replaceChildren(...(ms.length?ms.map(m=>h('div',{class:'bub '+(m.sender_id===Auth.user.id?'me':'them')},m.body)):[h('p',{class:'tag',style:{textAlign:'center',padding:'20px'}},'Say hello to @'+o.username)]));if(nearEnd)list.scrollTop=list.scrollHeight;Store.markRead(o.id).then(refreshUnread);}catch(e){}};
  const post=()=>{const t=inp.value.trim();if(!t)return;guard(send,async()=>{await Store.send(o.id,t);inp.value='';last='';await load();});};
  send.onclick=post;inp.addEventListener('keydown',e=>{if(e.key==='Enter')post();});
  await load();const iv=setInterval(()=>{if(!document.hidden)load();},6000);App.teardown=()=>clearInterval(iv);
}
/* simple flat view for devices without WebGL: every picture on the walls as a gallery */
function fallback(d){
  const pics=d.items.filter(i=>i.kind==='decor'&&i.image_path);
  return h('div',{style:{position:'absolute',inset:0,overflow:'auto'}},h('div',{class:'fallback'},pics.length?pics.map(i=>h('button',{class:'fb',onclick:()=>i.link?openExternal(i.link):null},h('img',{src:publicUrl('room-images',i.image_path),alt:i.title||'',loading:'lazy'}),h('div',null,i.title||'Picture'))):[h('p',{class:'tag'},'This device cannot show the 3D room, and there are no pictures on the walls yet.')]));
}

/* ---------- router ---------- */
/* ---------- welcome page for new visitors ---------- */
const introSeen=()=>{try{return localStorage.getItem('ow_intro')==='1';}catch(e){return false;}};
const introDone=()=>{try{localStorage.setItem('ow_intro','1');}catch(e){}};
function introView(){
  try{return introBuild();}catch(e){console.error(e);
    const v=setView(true);v.classList.add('intro-view');
    v.append(h('div',{class:'in-wrap'},h('div',{class:'in-hero',style:{marginTop:'20vh'}},logoEl(64),h('h1',null,'Paint it. Hang it. Visit friends’ walls.')),h('div',{class:'in-cta',style:{marginTop:'auto'}},h('button',{class:'btn coral block',onclick:()=>{introDone();authSheet('signup','Create an account to build your room');}},'Create account'),h('button',{class:'btn block',onclick:()=>{introDone();authSheet('signin');}},'Sign in'))));}
}
function introBuild(){
  document.title='Welcome to OpenWalls';
  const v=setView(true);v.classList.add('intro-view');
  const C={v:'#6c4bff',c:'#ff5a3c',s:'#ffd23f',m:'#3ddc97',i:'#1d1a2b',p:'#f6efe4',b:'#3b82f6',k:'#ff7ab8'};
  const av=(x,y,col,r)=>`<circle cx="${x}" cy="${y-r*1.5}" r="${r*.62}" fill="#f2c9a0"/><path d="M${x-r} ${y+r*1.1}q0-${r*1.5} ${r}-${r*1.5}t${r} ${r*1.5}z" fill="${col}"/>`;
  const S=[
    {t:'Choose your avatar',d:'Design your look, step into your room and drop in on friends’ rooms to see their art.',
     art:`<rect x="30" y="20" width="140" height="118" rx="10" fill="${C.v}" opacity=".18"/><rect x="118" y="40" width="40" height="86" rx="4" fill="#8a6b4a"/><circle cx="150" cy="86" r="3" fill="${C.s}"/>${av(78,112,C.c,22)}<circle cx="46" cy="40" r="8" fill="${C.s}"/><path d="M40 118h56" stroke="#00000022" stroke-width="6" stroke-linecap="round"/>`},
    {t:'Paint together',d:'Join a Gist & Paint session and paint the same picture with friends. When you finish, hang it on your wall.',
     art:`<rect x="14" y="16" width="172" height="118" rx="10" fill="${C.i}"/><g>${[0,1,2,3].map(n=>`<rect x="${26+n*40}" y="40" width="32" height="42" rx="3" fill="#fffdf8"/>`).join('')}</g><circle cx="42" cy="58" r="9" fill="${C.k}"/><circle cx="82" cy="62" r="10" fill="${C.b}"/><circle cx="122" cy="56" r="8" fill="${C.s}"/><circle cx="162" cy="62" r="10" fill="${C.m}"/><g>${[0,1,2,3].map(n=>av(42+n*40,122,[C.c,C.v,C.s,C.m][n],9)).join('')}</g><rect x="84" y="20" width="32" height="10" rx="5" fill="${C.c}"/>`},
    {t:'Hang your paintings',d:'Pick walls and floors, add furniture, and hang the paintings you made. Make it feel like you.',
     art:`<rect x="20" y="14" width="160" height="92" rx="6" fill="#efe4d2"/><path d="M20 106h160l14 34H6z" fill="#d9a066"/><rect x="38" y="28" width="38" height="30" rx="3" fill="${C.v}"/><circle cx="50" cy="40" r="6" fill="${C.s}"/><path d="M40 56l12-10 10 8 10-8" stroke="#fff" stroke-width="3" fill="none"/><rect x="92" y="26" width="26" height="36" rx="3" fill="${C.c}"/><rect x="128" y="32" width="34" height="24" rx="3" fill="${C.m}"/><rect x="52" y="84" width="96" height="28" rx="12" fill="${C.i}"/><rect x="44" y="92" width="16" height="24" rx="7" fill="${C.i}"/><rect x="140" y="92" width="16" height="24" rx="7" fill="${C.i}"/><rect x="150" y="62" width="4" height="48" fill="#8a6b4a"/><path d="M142 62h20l-4-14h-12z" fill="${C.s}"/>`},
    {t:'Watch and listen together',d:'Play a video or music on your room’s TV in sync, so everyone inside sees and hears the same thing.',
     art:`<rect x="32" y="22" width="136" height="82" rx="8" fill="${C.i}"/><rect x="40" y="30" width="120" height="66" rx="4" fill="${C.v}"/><path d="M92 48l30 15-30 15z" fill="#fff"/><rect x="88" y="104" width="24" height="8" fill="${C.i}"/><rect x="60" y="112" width="80" height="6" rx="3" fill="${C.i}"/><path d="M22 52v-14l14-3v14" stroke="${C.c}" stroke-width="4" fill="none"/><circle cx="22" cy="54" r="5" fill="${C.c}"/><circle cx="36" cy="49" r="5" fill="${C.c}"/>${av(60,138,C.c,10)}${av(100,138,C.m,10)}${av(140,138,C.s,10)}`},
    {t:'Discover the Wall',d:'Browse rooms from creators everywhere. React, comment and message the ones you love. Rings show who is active right now.',
     art:`<g transform="rotate(-4 50 80)"><rect x="18" y="66" width="56" height="68" rx="6" fill="#fff"/><rect x="24" y="72" width="44" height="42" rx="3" fill="${C.k}"/></g><g transform="rotate(3 100 80)"><rect x="72" y="60" width="56" height="68" rx="6" fill="#fff"/><rect x="78" y="66" width="44" height="42" rx="3" fill="${C.m}"/></g><g transform="rotate(-2 150 80)"><rect x="126" y="70" width="56" height="68" rx="6" fill="#fff"/><rect x="132" y="76" width="44" height="42" rx="3" fill="${C.s}"/></g><g fill="none" stroke-width="4"><circle cx="46" cy="30" r="16" stroke="${C.c}"/><circle cx="100" cy="30" r="16" stroke="${C.v}"/><circle cx="154" cy="30" r="16" stroke="${C.m}"/></g><circle cx="46" cy="30" r="11" fill="#f2c9a0"/><circle cx="100" cy="30" r="11" fill="#e0a77a"/><circle cx="154" cy="30" r="11" fill="#c98b60"/>`}
  ];
  const track=h('div',{class:'in-track'},S.map(s=>{const art=h('div',{class:'in-art'});art.innerHTML='<svg viewBox="0 0 200 150" aria-hidden="true">'+s.art+'</svg>';return h('div',{class:'in-slide'},art,h('h2',null,s.t),h('p',null,s.d));}));
  const dots=h('div',{class:'in-dots'},S.map((_,i)=>h('button',{class:'in-dot','aria-label':'Slide '+(i+1),onclick:()=>show(i,true)})));
  let cur=0,timer=0,dx=0,sx=null;
  function show(i,user){cur=(i+S.length)%S.length;track.style.transform='translateX(-'+cur*100+'%)';track.style.transition='transform .35s ease';[...dots.children].forEach((d,k)=>d.classList.toggle('on',k===cur));if(user)restart();}
  function restart(){clearInterval(timer);timer=setInterval(()=>{if(!document.body.contains(track)){clearInterval(timer);return;}show(cur+1);},4800);}
  const view=h('div',{class:'in-view'},track);
  view.addEventListener('pointerdown',e=>{sx=e.clientX;dx=0;clearInterval(timer);track.style.transition='none';});
  view.addEventListener('pointermove',e=>{if(sx==null)return;dx=e.clientX-sx;track.style.transform='translateX(calc(-'+cur*100+'% + '+dx+'px))';});
  const end=()=>{if(sx==null)return;const d=dx;sx=null;if(d<-45)show(cur+1,true);else if(d>45)show(cur-1,true);else show(cur,true);};
  view.addEventListener('pointerup',end);view.addEventListener('pointercancel',end);
  v.append(h('div',{class:'in-wrap'},
    h('div',{class:'in-hero'},logoEl(52),h('h1',null,'Paint it. Hang it. Visit friends’ walls.')),
    view,dots,
    h('div',{class:'in-cta'},
      h('button',{class:'btn coral block',onclick:()=>{introDone();authSheet('signup','Create an account to build your room');}},'Create account'),
      h('button',{class:'btn block',onclick:()=>{introDone();authSheet('signin');}},'Sign in'))));
  show(0);restart();
}
function route(){
  document.querySelectorAll('.sheet-ov,.dlg-ov').forEach(e=>e.remove());teardown();const hs=decodeURIComponent(location.hash.replace(/^#\/?/,''));App.hadRoute=App.route!=='';App.route=hs||'wall';
  document.title="OpenWalls · Discover what's on everyone's walls";
  if(!Auth.user){App.route='welcome';return introView();}
  if(hs==='welcome'){history.replaceState(null,'','#/wall');App.route='wall';return wallView?wallView():discoverView();}
  if(hs.startsWith('@'))return visitView(hs.slice(1).toLowerCase());
  if(hs.startsWith('chat/'))return chatView(hs.slice(5).toLowerCase());
  if(hs==='scheduled')return Spaces.scheduledPage();
  if(hs==='paint'){history.replaceState(null,'','#/discover');return discoverView();}
  if(hs.startsWith('space/'))return Spaces.room(hs.slice(6));
  if(hs==='forum'||hs.startsWith('forum/')||hs.startsWith('topic/')){appFlags().then(F=>{if(F.forum!==true){history.replaceState(null,'','#/discover');return discoverView();}return hs==='forum'?OWForum.boardView(null):hs.startsWith('forum/')?OWForum.boardView(hs.slice(6)):OWForum.topicView(hs.slice(6));});return;}
  if(hs==='forum')return OWForum.boardView(null);
  if(hs.startsWith('forum/'))return OWForum.boardView(hs.slice(6));
  if(hs.startsWith('topic/'))return OWForum.topicView(hs.slice(6));
  switch(hs){case'spaces':appFlags().then(F=>{if(F.live_spaces!==true){history.replaceState(null,'','#/discover');return discoverView();}return Spaces.discover();});return;case'discover':return discoverView();case'inbox':return inboxView();case'me':return meView();case'edit':return editorView();case'avatar':return avatarView();case'ads':return adsView();default:return wallView();}
}
window.addEventListener('hashchange',route);
(function boot(){
  const ld=document.getElementById('ldlogo');if(ld)ld.append(logoEl(84));
  {const sp=new URLSearchParams(location.search),rf=sp.get('reference')||sp.get('trxref');if(rf&&/^OWAD-/.test(rf))history.replaceState(null,'',location.pathname+location.search+'#/ads');}
  const q=new URLSearchParams(location.search).get('room');if(q&&!location.hash)history.replaceState(null,'',location.pathname+'#/@'+q);
  Auth.on(ev=>{if((ev==='signin'||ev==='signout')&&!/^(edit|@|chat|space\/)/.test(App.route))route();});
  Auth.init().then(()=>{route();try{if(Auth.user)OWTv.restore(Auth.user.id);}catch(e){}
    if(Auth.user&&window.OWA&&OWA.prefetch){let g='f';try{g=(JSON.parse(localStorage.getItem('ow_avatar')||'{}').g)||'f';}catch(e){}OWA.prefetch([g]);setTimeout(()=>OWA.prefetch(['m','f']),5000);}
    refreshUnread();ensureRoom().then(()=>setTimeout(()=>OWPrev.ensureMine(),4000));}).catch(()=>route());
  Auth.on(ev=>{if(ev==='signin')ensureRoom().then(()=>setTimeout(()=>OWPrev.ensureMine(),4000));});
  /* when the connection comes back, reload what is on screen by itself (never inside a room, editor, chat or space, where it would interrupt) */
  let wasOff=!navigator.onLine;
  window.addEventListener('offline',()=>{wasOff=true;});
  window.addEventListener('online',()=>{if(!wasOff&&!document.querySelector('.empty-state,.spin-wrap'))return;wasOff=false;
    setTimeout(()=>{if(!navigator.onLine)return;toast('Back online','ok');if(/^(edit|@|chat|space\/)/.test(App.route))return;try{route();refreshUnread();}catch(e){}},600);});
  window.__ready=true;const l=document.getElementById('loading');setTimeout(()=>l&&l.classList.add('gone'),250);
  try{sessionStorage.removeItem('ow_try');}catch(e){}
  PWA.init();
})();
