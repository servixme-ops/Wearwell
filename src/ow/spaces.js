/* ---------- Live Spaces: audio rooms on LiveKit. Rules live in Supabase (RPCs + RLS); audio via livekit-client ---------- */
const Spaces=(()=>{
const CATS=[['talk','Talk'],['music','Music'],['tech','Tech'],['gaming','Gaming'],['art','Art & Design'],['fashion','Fashion'],['wellness','Wellness'],['business','Business'],['learning','Learning'],['chill','Just chatting']];
const catLabel=id=>(CATS.find(c=>c[0]===id)||[0,'Talk'])[1];
const REACTS=['👏','❤️','🔥','😂','😮','🎉'];
const rpc=async(n,a)=>{const r=await sb.rpc(n,a||{});if(r.error)throw r.error;return r.data;};
async function fn(name,body){
  const r=await sb.functions.invoke(name,{body});
  if(r.error){let m=r.error.message;try{const j=await r.error.context.json();m=j.error||m;}catch(e){}const e=new Error(m);throw e;}
  if(r.data&&r.data.error)throw new Error(r.data.error);return r.data;
}
const adm=(action,space,extra)=>fn('space-admin',Object.assign({action,space_id:space},extra||{}));
const person=p=>(p&&(p.display_name||p.username))||'Someone';
const sp_av=(p,cls)=>h('span',{class:'sp-av '+(cls||'')},avatarEl(p));
const when=t=>{const d=new Date(t),n=new Date(),same=d.toDateString()===n.toDateString();return(same?'Today':d.toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric'}))+' · '+d.toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit'});};

/* ================= LiveKit wrapper ================= */
class Audio{
  constructor(ev){this.ev=ev;this.room=null;this.box=h('div',{style:{display:'none'}});document.body.appendChild(this.box);this.blocked=new Set();this.state='idle';}
  static ready(){return !!window.LivekitClient;}
  async connect(spaceId){
    if(!Audio.ready())throw new Error('The audio engine did not load. Check your connection and reload.');
    const t=await fn('livekit-token',{space_id:spaceId});
    const L=window.LivekitClient;
    await this.close(true);
    const room=new L.Room({adaptiveStream:false,dynacast:true,audioCaptureDefaults:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}});
    this.room=room;this.role=t.role;
    room.on(L.RoomEvent.TrackSubscribed,(tr,pub,p)=>{if(tr.kind!=='audio')return;if(this.blocked.has(p.identity)){try{pub.setSubscribed(false);}catch(e){}return;}const el=tr.attach();el.dataset.uid=p.identity;this.box.appendChild(el);});
    room.on(L.RoomEvent.TrackUnsubscribed,(tr)=>{try{tr.detach().forEach(e=>e.remove());}catch(e){}});
    room.on(L.RoomEvent.ActiveSpeakersChanged,s=>this.ev('speaking',new Set(s.map(x=>x.identity))));
    room.on(L.RoomEvent.TrackMuted,()=>this.ev('mics'));room.on(L.RoomEvent.TrackUnmuted,()=>this.ev('mics'));
    room.on(L.RoomEvent.LocalTrackPublished,()=>this.ev('mics'));room.on(L.RoomEvent.LocalTrackUnpublished,()=>this.ev('mics'));
    room.on(L.RoomEvent.ParticipantPermissionsChanged,()=>this.ev('perm'));
    room.on(L.RoomEvent.AudioPlaybackStatusChanged,()=>this.ev('playback',room.canPlaybackAudio));
    room.on(L.RoomEvent.Reconnecting,()=>{this.state='reconnecting';this.ev('state','reconnecting');});
    room.on(L.RoomEvent.Reconnected,()=>{this.state='connected';this.ev('state','connected');});
    room.on(L.RoomEvent.Disconnected,r=>{if(this.room!==room)return;this.state='disconnected';this.ev('state','disconnected',r);});
    await room.connect(t.url,t.token);
    this.state='connected';this.ev('state','connected');this.ev('playback',room.canPlaybackAudio);
    return t;
  }
  get canPublish(){const p=this.room&&this.room.localParticipant;return !!(p&&p.permissions&&p.permissions.canPublish);}
  get micOn(){const p=this.room&&this.room.localParticipant;return !!(p&&p.isMicrophoneEnabled);}
  isMicOn(uid){const r=this.room;if(!r)return false;const p=r.localParticipant&&r.localParticipant.identity===uid?r.localParticipant:(r.remoteParticipants||r.participants||new Map()).get(uid);return !!(p&&p.isMicrophoneEnabled);}
  async mic(on){
    const p=this.room&&this.room.localParticipant;if(!p)return false;
    try{await p.setMicrophoneEnabled(on);return true;}
    catch(e){if(on){const n=(e&&e.name)||'';const err=new Error(/NotAllowed|Permission|Security/i.test(n+(e.message||''))?'mic-denied':/NotFound|Devices/i.test(n+(e.message||''))?'mic-missing':(e.message||'mic-failed'));throw err;}throw e;}
  }
  async startPlayback(){try{await this.room.startAudio();}catch(e){}}
  setBlocked(ids){
    this.blocked=new Set(ids);const r=this.room;if(!r)return;
    (r.remoteParticipants||r.participants||new Map()).forEach(p=>{const bl=this.blocked.has(p.identity);(p.audioTrackPublications||p.audioTracks||new Map()).forEach(pub=>{try{pub.setSubscribed(!bl);}catch(e){}});});
  }
  async close(silent){
    const r=this.room;this.room=null;
    if(r){try{if(r.localParticipant)await r.localParticipant.setMicrophoneEnabled(false);}catch(e){}
      try{(r.remoteParticipants||new Map()).forEach(p=>(p.audioTrackPublications||new Map()).forEach(pub=>{if(pub.track)try{pub.track.detach().forEach(e=>e.remove());}catch(e){}}));}catch(e){}
      try{r.removeAllListeners&&r.removeAllListeners();}catch(e){}try{await r.disconnect();}catch(e){}}
    this.box.replaceChildren();if(!silent)this.box.remove();
  }
}

/* ================= sheets ================= */
function reportSheet(spaceId,user){
  sheet(user?'Report '+person(user):'Report this space',(b,close)=>{
    let reason='harassment';const det=h('textarea',{rows:'3',maxlength:'500',placeholder:'Add details (optional)'});
    const opts=[['harassment','Harassment or bullying'],['hate','Hate speech'],['sexual','Sexual content'],['violence','Violence or threats'],['spam','Spam or scams'],['other','Something else']];
    const sel=h('div',{class:'sp-opts'},opts.map(([k,l])=>h('button',{class:'chip'+(k===reason?' on':''),onclick:e=>{reason=k;sel.querySelectorAll('.chip').forEach(c=>c.classList.remove('on'));e.currentTarget.classList.add('on');}},l)));
    const go=h('button',{class:'btn coral block'},'Send report');
    go.onclick=()=>guard(go,async()=>{await rpc('space_report',{p_space:spaceId,p_user:user?user.id:null,p_reason:reason,p_details:det.value});toast('Thanks. Our team will review it.');close();});
    b.append(h('p',{class:'tag',style:{marginBottom:'10px'}},'Reports are private. The host cannot see who sent it.'),sel,field('Details',det),go);
  });
}
async function blockUser(user,on){
  const ok=!on||await confirmBox('Block '+person(user)+'?','You will not hear or see them in Spaces, and they cannot join your spaces.','Block',true);
  if(!ok)return false;await rpc('user_block',{p_user:user.id,p_on:on});toast(on?'Blocked '+person(user):'Unblocked');return true;
}
function createSheet(onDone){
  if(!Auth.user){authSheet('signup','Create an account to host a space');return;}
  sheet('Start a space',(b,close)=>{
    const title=h('input',{type:'text',maxlength:'80',placeholder:'What do you want to talk about?'});
    const desc=h('textarea',{rows:'3',maxlength:'400',placeholder:'Tell people what this space is about'});
    const cat=h('select',null,CATS.map(([k,l])=>h('option',{value:k},l)));
    let vis='public',live=true,chat=true;
    const mk=(opts,get,set)=>{const w=h('div',{class:'sp-seg'});const paint=()=>w.replaceChildren(...opts.map(([k,l])=>h('button',{class:get()===k?'on':'',onclick:()=>{set(k);paint();}},l)));paint();return w;};
    const st=h('input',{type:'datetime-local'}),en=h('input',{type:'datetime-local'});
    const sched=h('div',{style:{display:'none'}},field('Starts',st),field('Ends (optional)',en));
    const timing=mk([['now','Go live now'],['later','Schedule']],()=>live?'now':'later',k=>{live=k==='now';sched.style.display=live?'none':'block';});
    const visw=mk([['public','Public'],['private','Private']],()=>vis,k=>vis=k);
    const goB=h('button',{class:'btn coral block'},'Create space');
    goB.onclick=()=>guard(goB,async()=>{
      if(title.value.trim().length<3){toast('Give your space a title.','err');return;}
      if(!live&&!st.value){toast('Pick a start time.','err');return;}
      const id=await rpc('space_create',{p_title:title.value,p_desc:desc.value,p_category:cat.value,p_visibility:vis,p_start:live?null:new Date(st.value).toISOString(),p_end:!live&&en.value?new Date(en.value).toISOString():null,p_go_live:live,p_chat:chat});
      close();if(live)go('#/space/'+id);else{toast('Space scheduled');onDone&&onDone('upcoming');}
    });
    b.append(field('Title',title),field('Description',desc),field('Category',cat),
      field('Who can join',visw,'Private spaces are only visible to people you invite.'),
      field('When',timing),sched,
      h('div',{class:'sp-row'},h('span',null,'Allow text chat'),toggleEl(true,v=>chat=v,'Allow text chat')),goB);
  });
}
function inviteSheet(space){
  sheet('Invite people',(b)=>{
    let role='listener';const q=h('input',{type:'search',placeholder:'Search by name or @username'}),res=h('div',{class:'sp-list'});
    const seg=h('div',{class:'sp-seg'});const paintSeg=()=>seg.replaceChildren(...[['listener','As listener'],['speaker','As speaker']].map(([k,l])=>h('button',{class:role===k?'on':'',onclick:()=>{role=k;paintSeg();}},l)));paintSeg();
    let t;q.addEventListener('input',()=>{clearTimeout(t);t=setTimeout(async()=>{const s=q.value.trim().replace(/^@/,'');if(s.length<2){res.replaceChildren();return;}
      try{const rows=await rpc('space_find_people',{p_q:s});res.replaceChildren(...(rows.length?rows.map(p=>{const bt=h('button',{class:'btn small'},'Invite');bt.onclick=()=>guard(bt,async()=>{await rpc('space_invite',{p_space:space.id,p_user:p.id,p_role:role});bt.textContent='Invited';bt.disabled=true;});return h('div',{class:'sp-person'},sp_av(p,'sm'),h('div',{class:'who'},h('b',null,person(p)),h('span',null,'@'+p.username)),bt);}):[h('p',{class:'tag'},'No one found.')]));}catch(e){toast(friendlyError(e),'err');}},250);});
    b.append(seg,field('Find people',q),res);
  });
}

/* ================= discovery ================= */
async function discover(){
  const v=setView(false);drawNav('discover');let tab='live',cat='';
  const tabs=h('div',{class:'sp-tabs'}),chips=h('div',{class:'scrollx'}),list=h('div',{class:'sp-cards'}),inv=h('div');
  const startBtn=h('button',{class:'btn coral small',onclick:()=>createSheet(t=>{tab=t;load();})},icon('plus'),' Start');
  v.append(h('div',{class:'pg-head sp-head'},h('div',null,h('div',{class:'brand'},h('b',null,'Live Spaces')),h('p',{class:'tag'},'Drop in on conversations happening now.')),startBtn),inv,tabs,chips,list);
  const T=[['live','Live now'],['popular','Popular'],['following','Following'],['upcoming','Upcoming']];
  const card=s=>{
    const live=s.status==='live',mine=Auth.user&&s.host.id===Auth.user.id;
    const act=live?h('span',{class:'sp-live'},h('i'),'LIVE'):h('span',{class:'sp-when'},s.scheduled_start?when(s.scheduled_start):'Not scheduled');
    const right=!live&&mine?h('button',{class:'btn small coral',onclick:e=>{e.stopPropagation();guard(e.currentTarget,async()=>{await rpc('space_start',{p_space:s.id});go('#/space/'+s.id);});}},'Start now'):null;
    return h('div',{class:'sp-card',role:'button',tabindex:'0',onclick:()=>live||mine?go('#/space/'+s.id):toast('This space starts '+(s.scheduled_start?when(s.scheduled_start):'soon')+'.'),onkeydown:e=>{if(e.key==='Enter')e.currentTarget.click();}},
      h('div',{class:'sp-top'},act,h('span',{class:'sp-cat'},catLabel(s.category)),s.visibility==='private'&&h('span',{class:'sp-lock','aria-label':'Private'},icon('lock')),s.followed&&h('span',{class:'sp-fol'},'Following')),
      h('h3',null,s.title),s.description&&h('p',{class:'sp-desc'},s.description),
      h('div',{class:'sp-foot'},h('button',{class:'sp-host',onclick:e=>{e.stopPropagation();go('#/@'+s.host.username);}},sp_av(s.host,'xs'),h('span',null,'Hosted by ',h('b',null,person(s.host)))),
        h('span',{class:'sp-count'},icon('mic'),String(s.speakers),' · ',icon('people'),String(s.listeners)),right));
  };
  const load=async()=>{
    tabs.replaceChildren(...T.map(([k,l])=>h('button',{class:tab===k?'on':'',onclick:()=>{tab=k;load();}},l)));
    chips.replaceChildren(...[['','All'],...CATS].map(([k,l])=>h('button',{class:'chip'+(k===cat?' on':''),onclick:()=>{cat=k;load();}},l)));
    if(!Auth.user){list.replaceChildren(empty('Sign in to join Live Spaces','Listen in, raise your hand, or host your own.',h('button',{class:'btn coral',onclick:()=>authSheet('signin','Sign in to join Live Spaces')},'Sign in')));return;}
    list.replaceChildren(spinner());
    try{
      const [rows,invs]=await Promise.all([rpc('space_discover',{p_filter:tab,p_category:cat||null}),tab==='live'?rpc('space_my_invites'):Promise.resolve([])]);
      inv.replaceChildren(...invs.map(i=>h('div',{class:'sp-invite'},h('div',null,h('b',null,i.host+' invited you '),h('span',null,(i.role==='speaker'?'to speak in ':'to join ')+i.title)),
        h('div',{class:'sp-iacts'},h('button',{class:'btn small',onclick:async()=>{await rpc('space_respond_invite',{p_invite:i.id,p_accept:false});load();}},'Decline'),h('button',{class:'btn small coral',onclick:()=>guard(null,async()=>{const sid=await rpc('space_respond_invite',{p_invite:i.id,p_accept:true});go('#/space/'+sid);})},'Join')))));
      list.replaceChildren(...(rows.length?rows.map(card):[empty(tab==='upcoming'?'Nothing scheduled':tab==='following'?'No one you follow is live':'No live spaces yet',tab==='following'?'Follow people to see their spaces here.':'Be the first. Start a space and invite people in.',h('button',{class:'btn coral',onclick:()=>createSheet(t=>{tab=t;load();})},'Start a space'))]));
    }catch(e){list.replaceChildren(empty('Could not load spaces',friendlyError(e),h('button',{class:'btn',onclick:load},'Try again')));}
  };
  const iv=setInterval(()=>{if(!document.hidden&&Auth.user&&!document.querySelector('.sheet-ov'))load();},15000);App.teardown=()=>clearInterval(iv);
  load();
}

/* ================= live room ================= */
async function room(id){
  if(!Auth.user){authSheet('signin','Sign in to join Live Spaces');go('#/spaces');return;}
  const v=setView(true);v.classList.add('sp-view');
  let D=null,audio=null,speaking=new Set(),dead=false,lastMsg=0,connecting=false,micErr=null,chatOpen=false,chatSeen=0,playbackOk=true,connState='connecting',lastRole=null,reqBusy=false;
  const stage=h('div',{class:'sp-stage'}),crowd=h('div',{class:'sp-crowd'}),reqBox=h('div'),banner=h('div'),floats=h('div',{class:'sp-floats'});
  const titleEl=h('h2'),metaEl=h('div',{class:'sp-meta'}),bar=h('div',{class:'sp-bar'});
  const msgs=h('div',{class:'sp-msgs'}),inp=h('input',{type:'text',maxlength:'300',placeholder:'Say something…'}),sendB=h('button',{class:'btn coral small'},icon('send'));
  const chatBox=h('div',{class:'sp-chat'},msgs,h('div',{class:'cin'},inp,sendB));
  const top=h('div',{class:'sp-topbar'});
  v.append(top,banner,h('div',{class:'sp-scroll'},titleEl,metaEl,reqBox,h('h4',{class:'sp-h'},'On stage'),stage,h('h4',{class:'sp-h',id:'sp-lh'},'Listening'),crowd),floats,chatBox,bar);
  const me=()=>D&&D.me;const role=()=>(me()&&me().role)||'listener';const isHost=()=>role()==='host';const onStage=()=>role()==='host'||role()==='speaker';
  const user=u=>({id:u.id,username:u.username,display_name:u.display_name,avatar_url:u.avatar_url});

  const ev=(k,a,b)=>{
    if(dead)return;
    if(k==='speaking'){speaking=a;paintSpeaking();}
    else if(k==='mics')paintStage();
    else if(k==='playback'){playbackOk=a;paintBanner();}
    else if(k==='state'){connState=a;paintBanner();if(a==='disconnected'&&!dead&&!connecting&&D&&D.space.status==='live'&&me()&&me().status==='active')setTimeout(()=>reconnect(),1500);}
    else if(k==='perm')syncMic();
  };
  audio=new Audio(ev);

  async function reconnect(){
    if(dead||connecting)return;connecting=true;connState='reconnecting';paintBanner();
    try{await audio.connect(id);connState='connected';lastRole=null;await syncMic();}
    catch(e){connState='failed';paintBanner(e.message);}
    finally{connecting=false;}
  }
  async function syncMic(){
    if(dead||!audio.room)return;
    const want=onStage();
    if(!want&&audio.micOn){try{await audio.mic(false);}catch(e){}}
    if(want&&!audio.canPublish){if(lastRole!==role()){lastRole=role();await reconnect();}return;}
    if(want&&!audio.micOn&&!micErr&&lastRole!=='mic-'+role()&&!(me()&&me().muted)){lastRole='mic-'+role();try{await audio.mic(true);}catch(e){micErr=e.message;if(e.message==='mic-denied'||e.message==='mic-missing')micSheet(e.message);}}
    if(me()&&me().muted&&audio.micOn){try{await audio.mic(false);}catch(e){}}
    paintBar();paintStage();
  }
  function micSheet(kind){
    sheet(kind==='mic-missing'?'No microphone found':'Microphone is blocked',(b,close)=>{
      b.append(h('p',{class:'tag',style:{marginBottom:'12px'}},kind==='mic-missing'?'Connect a microphone or headset, then try again. You can keep listening in the meantime.':'To speak, allow microphone access for this site. On Android Chrome: tap the lock icon in the address bar, choose Permissions, and set Microphone to Allow. Then tap Try again.'),
        h('button',{class:'btn coral block',onclick:()=>{micErr=null;lastRole=null;close();toggleMic();}},'Try again'),h('button',{class:'btn block',style:{marginTop:'8px'},onclick:close},'Keep listening'));
    });
  }
  async function toggleMic(){
    if(!audio.room||!onStage())return;if(me().muted){toast('The host muted you.');return;}
    try{micErr=null;await audio.mic(!audio.micOn);}catch(e){if(e.message==='mic-denied'||e.message==='mic-missing')micSheet(e.message);else toast(friendlyError(e),'err');}
    paintBar();paintStage();
  }

  function paintBanner(extra){
    const parts=[];
    if(connState==='reconnecting'||connState==='connecting')parts.push(h('div',{class:'sp-ban warn'},connState==='connecting'?'Connecting to audio…':'Reconnecting…'));
    if(connState==='failed')parts.push(h('div',{class:'sp-ban err'},(extra||'Audio could not connect.')+' ',h('button',{onclick:reconnect},'Retry')));
    if(!playbackOk&&connState==='connected')parts.push(h('button',{class:'sp-ban act',onclick:()=>audio.startPlayback()},icon('speaker'),' Tap to turn on sound'));
    banner.replaceChildren(...parts);
  }
  function tile(p,big){
    const lkOn=audio.room?audio.isMicOn(p.id):false;
    const mic=p.muted?'mute':lkOn?'mic':'mute';
    const t=h('button',{class:'sp-tile'+(big?' big':''),'data-uid':p.id,onclick:()=>personSheet(p)},
      h('span',{class:'sp-ring'+(speaking.has(p.id)?' on':'')},sp_av(p)),
      h('span',{class:'sp-name'},person(p)+(p.id===Auth.user.id?' (you)':'')),
      h('span',{class:'sp-role'},p.role==='host'?'Host':'Speaker',h('span',{class:'sp-mic '+(mic==='mute'?'off':'on')},icon(mic==='mute'?'micoff':'mic'))));
    return t;
  }
  function paintStage(){
    if(!D)return;const ps=D.participants.filter(p=>!p.blocked||p.role==='host');
    const on=ps.filter(p=>p.role==='host'||p.role==='speaker'),ls=ps.filter(p=>p.role==='listener');
    stage.replaceChildren(...on.map(p=>tile(p,true)));
    crowd.replaceChildren(...(ls.length?ls.map(p=>h('button',{class:'sp-lis','data-uid':p.id,onclick:()=>personSheet(p)},h('span',{class:'sp-ring'+(speaking.has(p.id)?' on':'')},sp_av(p,'sm')),h('span',{class:'sp-name'},person(p).split(' ')[0]),p.hand&&h('span',{class:'sp-hand'},'✋'))):[h('p',{class:'tag'},'No listeners yet. Share the link to invite people.')]));
    metaEl.replaceChildren(...[h('span',{class:'sp-live'},h('i'),'LIVE'),h('span',{class:'sp-cat'},catLabel(D.space.category)),D.space.visibility==='private'&&h('span',{class:'sp-lock'},icon('lock')),h('span',{class:'sp-count'},icon('mic'),String(on.length),' · ',icon('people'),String(ls.length))].filter(Boolean));
  }
  function paintSpeaking(){
    document.querySelectorAll('.sp-view [data-uid]').forEach(el=>{const r=el.querySelector('.sp-ring');if(r)r.classList.toggle('on',speaking.has(el.dataset.uid));});
  }
  function paintReq(){
    if(!isHost()||!D.requests.length){reqBox.replaceChildren();return;}
    reqBox.replaceChildren(h('div',{class:'sp-reqs'},h('h4',{class:'sp-h'},'✋ Wants to speak ('+D.requests.length+')'),...D.requests.map(q=>h('div',{class:'sp-person'},sp_av(q,'sm'),h('div',{class:'who'},h('b',null,person(q)),h('span',null,'@'+q.username)),
      h('button',{class:'btn small',onclick:e=>guard(e.currentTarget,async()=>{await adm('deny',id,{request_id:q.id});tick();})},'Deny'),
      h('button',{class:'btn small coral',onclick:e=>guard(e.currentTarget,async()=>{await adm('approve',id,{request_id:q.id});tick();})},'Allow')))));
  }
  function paintBar(){
    if(!D)return;const r=role(),muted=me()&&me().muted;
    const btns=[];
    if(onStage())btns.push(h('button',{class:'sp-mic-btn'+(audio.micOn?' live':''),disabled:!!muted||connState!=='connected','aria-label':audio.micOn?'Mute microphone':'Unmute microphone',onclick:toggleMic},icon(audio.micOn?'mic':'micoff'),h('span',null,muted?'Muted by host':audio.micOn?'Mute':'Unmute')));
    else{const pend=D.my_request==='pending';btns.push(h('button',{class:'sp-hand-btn'+(pend?' on':''),disabled:reqBusy,onclick:async e=>{reqBusy=true;try{if(pend){await rpc('space_cancel_request',{p_space:id});toast('Request cancelled');}else{await rpc('space_request_speak',{p_space:id});toast('The host has been asked. Hang tight.');}await tick();}catch(er){toast(friendlyError(er),'err');}finally{reqBusy=false;paintBar();}}},'✋',h('span',null,pend?'Cancel':'Raise hand')));}
    btns.push(h('button',{class:'sp-round','aria-label':'React',onclick:reactSheet},'😊'));
    if(D.space.chat_enabled)btns.push(h('button',{class:'sp-round'+(chatOpen?' on':''),'aria-label':'Chat',onclick:()=>{chatOpen=!chatOpen;chatBox.classList.toggle('open',chatOpen);if(chatOpen){chatSeen=lastMsg;msgs.scrollTop=msgs.scrollHeight;}paintBar();}},icon('chat'),(!chatOpen&&unread>0)?h('i',{class:'sp-dot'}):null));
    btns.push(h('button',{class:'sp-leave',onclick:leave},isHost()?'Leave':'Leave quietly'));
    bar.replaceChildren(...btns);
  }
  function paintTop(){
    top.replaceChildren(h('button',{class:'rbtn','aria-label':'Minimise',onclick:leave},icon('chevD')),
      h('button',{class:'sp-hostline',onclick:()=>go('#/@'+D.host.username)},sp_av(D.host,'xs'),h('span',null,'Hosted by ',h('b',null,person(D.host)))),
      h('button',{class:'rbtn','aria-label':'More',onclick:menu},icon('more')));
    titleEl.textContent=D.space.title;
  }
  function menu(){
    sheet('Space options',(b,close)=>{
      const row=(l,ic,cb,danger)=>h('button',{class:'sp-menu'+(danger?' danger':''),onclick:()=>{close();cb();}},icon(ic),l);
      b.append(...[D.space.description?h('p',{class:'tag',style:{marginBottom:'12px'}},D.space.description):null,
        row('Share link','share',async()=>{const u=CFG.site+'#/space/'+id;try{if(navigator.share)await navigator.share({title:D.space.title,url:u});else{await navigator.clipboard.writeText(u);toast('Link copied');}}catch(e){}}),
        isHost()?row('Invite people','people',()=>inviteSheet(D.space)):null,
        isHost()?row('End space for everyone','close',endSpace,true):null,
        !isHost()?row('Report this space','flag',()=>reportSheet(id,null),true):null].filter(Boolean));
    });
  }
  function personSheet(p){
    const mine=p.id===Auth.user.id;
    sheet(person(p),(b,close)=>{
      const row=(l,ic,cb,danger)=>h('button',{class:'sp-menu'+(danger?' danger':''),onclick:async()=>{close();try{await cb();}catch(e){toast(friendlyError(e),'err');}}},icon(ic),l);
      const act=(a,extra)=>async()=>{await adm(a,id,Object.assign({user_id:p.id},extra||{}));await tick();};
      b.append(...[h('div',{class:'sp-pcard'},sp_av(p,'lg'),h('b',null,person(p)),h('span',null,'@'+p.username+' · '+(p.role==='host'?'Host':p.role==='speaker'?'Speaker':'Listener'))),
        row('View profile','user',()=>go('#/@'+p.username)),
        isHost()&&!mine&&p.role==='listener'?row('Invite to speak','mic',act('promote')):null,
        isHost()&&!mine&&p.role==='speaker'?row(p.muted?'Allow to unmute':'Mute','micoff',act(p.muted?'unmute':'mute')):null,
        isHost()&&!mine&&p.role==='speaker'?row('Move to listeners','people',act('demote')):null,
        isHost()&&!mine?row('Remove from space','close',async()=>{if(await confirmBox('Remove '+person(p)+'?','They will not be able to rejoin this space.','Remove',true))await act('remove')();},true):null,
        !mine?row(p.blocked?'Unblock':'Block','lock',async()=>{if(await blockUser(user(p),!p.blocked)){await tick();}},true):null,
        !mine?row('Report','flag',()=>reportSheet(id,user(p)),true):null].filter(Boolean));
    });
  }
  function reactSheet(){
    sheet('React',(b,close)=>{b.append(h('div',{class:'sp-reacts'},REACTS.map(e=>h('button',{onclick:()=>{close();rpc('space_message',{p_space:id,p_kind:'reaction',p_body:e}).catch(er=>toast(friendlyError(er),'err'));pop(e);}},e))));});
  }
  function pop(e){const s=h('span',{class:'sp-float',style:{left:(10+Math.random()*70)+'%'}},e);floats.appendChild(s);setTimeout(()=>s.remove(),2400);}
  async function endSpace(){
    if(!await confirmBox('End this space?','Everyone will be disconnected.','End space',true))return;
    await guard(null,async()=>{await adm('end',id);await finish('You ended the space.');});
  }
  async function leave(){
    dead=true;clearInterval(pollT);clearInterval(hbT);clearInterval(chatT);
    try{await audio.close();}catch(e){}
    try{await rpc('space_leave',{p_space:id});}catch(e){}
    go('#/spaces');
  }
  async function finish(msg){
    dead=true;clearInterval(pollT);clearInterval(hbT);clearInterval(chatT);try{await audio.close();}catch(e){}
    v.replaceChildren(h('div',{class:'sp-ended'},h('h2',null,'This space has ended'),h('p',{class:'tag'},msg||'Thanks for listening.'),h('button',{class:'btn coral',onclick:()=>go('#/spaces')},'Back to Spaces')));
  }

  let unread=0;
  async function chat(){
    try{
      const rows=await rpc('space_chat',{p_space:id,p_after:lastMsg});if(!rows.length)return;
      const first=lastMsg===0;
      rows.forEach(m=>{lastMsg=Math.max(lastMsg,m.id);
        if(m.kind==='reaction'){if(!first&&m.user_id!==Auth.user.id)pop(m.body);return;}
        msgs.appendChild(h('div',{class:'sp-msg'+(m.user_id===Auth.user.id?' me':'')},h('b',null,m.name),h('span',null,m.body)));if(!first&&m.user_id!==Auth.user.id&&!chatOpen)unread++;});
      while(msgs.childNodes.length>80)msgs.firstChild.remove();
      if(chatOpen){chatSeen=lastMsg;unread=0;msgs.scrollTop=msgs.scrollHeight;}else paintBar();
    }catch(e){}
  }
  const sendMsg=()=>{const t=inp.value.trim();if(!t)return;guard(sendB,async()=>{await rpc('space_message',{p_space:id,p_kind:'text',p_body:t});inp.value='';await chat();});};
  sendB.onclick=sendMsg;inp.addEventListener('keydown',e=>{if(e.key==='Enter')sendMsg();});

  async function tick(){
    if(dead)return;
    try{
      const d=await rpc('space_get',{p_space:id});if(dead)return;D=d;
      if(d.space.status==='ended')return finish('The host ended this space.');
      if(d.me&&d.me.status==='removed'){toast('You were removed from this space.','err');return finish('You were removed by the host.');}
      if(isHost()&&d.space.scheduled_end&&new Date(d.space.scheduled_end)<new Date()&&!tick.asked){tick.asked=true;if(await confirmBox('Scheduled time is up','Keep the space going or end it now?','End space',true)){await adm('end',id);return finish('Your space has ended.');}}
      paintTop();paintStage();paintReq();paintBar();
      if(audio.room)audio.setBlocked(d.participants.filter(p=>p.blocked).map(p=>p.id));
      if(role()!==lastRole&&audio.room&&connState==='connected')syncMic();
    }catch(e){if(/not found/i.test(e.message||'')){finish('This space is no longer available.');}}
  }
  const hb=()=>{if(!dead&&D&&me()&&me().status==='active')rpc('space_heartbeat',{p_space:id}).catch(()=>{});};
  let pollT,hbT,chatT;
  window.addEventListener('pagehide',()=>{if(!dead){try{rpc('space_leave',{p_space:id});}catch(e){}}},{once:true});

  /* join */
  v.append(h('div',{class:'sp-joining'},spinner('Joining…')));
  try{
    connecting=true;await audio.connect(id);connecting=false;connState='connected';
    await tick();v.querySelector('.sp-joining')&&v.querySelector('.sp-joining').remove();
    pollT=setInterval(()=>{if(!document.hidden)tick();},3000);hbT=setInterval(hb,15000);chatT=setInterval(()=>{if(!document.hidden)chat();},3000);
    document.addEventListener('visibilitychange',()=>{if(!document.hidden&&!dead){tick();chat();hb();if(audio.room)audio.startPlayback();}});
    await chat();await syncMic();paintBanner();
  }catch(e){
    connecting=false;dead=true;try{await audio.close();}catch(er){}
    const m=friendlyError(e);
    v.replaceChildren(h('div',{class:'sp-ended'},h('h2',null,/not configured/i.test(m)?'Live audio is not set up yet':'Could not join'),h('p',{class:'tag'},m),h('button',{class:'btn coral',onclick:()=>go('#/spaces')},'Back to Spaces')));
    return;
  }
  App.teardown=()=>{if(dead)return;dead=true;clearInterval(pollT);clearInterval(hbT);clearInterval(chatT);audio.close();rpc('space_leave',{p_space:id}).catch(()=>{});};
}

return{discover,room,createSheet};
})();
