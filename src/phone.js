/* ---------- PHONE OS: lock screen, home screen, app host, notifications, wallpapers ---------- */
const Apps={list:[],reg(a){this.list.push(a);},get(id){return this.list.find(a=>a.id===id);}};
const G_=(inner,bg)=>`<svg viewBox="0 0 60 60" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;

/* ---------- Wallpapers ---------- */
const Wall={
  _def:{},_urls:{},
  def(kind){
    if(this._def[kind])return this._def[kind];
    const W=780,H=1688,c=document.createElement('canvas');c.width=W;c.height=H;const g=c.getContext('2d');
    if(kind==='lock'){
      const gr=g.createLinearGradient(0,0,W*.4,H);gr.addColorStop(0,'#7d1f33');gr.addColorStop(.55,'#4a1020');gr.addColorStop(1,'#1f0a0f');g.fillStyle=gr;g.fillRect(0,0,W,H);
      g.globalAlpha=.16;g.fillStyle=fabricFill(g,'asooke',['#8a2a3a','#e9c46a','#f6e7cb'],2.4);g.fillRect(0,H*.52,W,H*.48);g.globalAlpha=1;
      const rg=g.createRadialGradient(W*.75,H*.82,10,W*.75,H*.82,W*.7);rg.addColorStop(0,'rgba(233,196,106,.55)');rg.addColorStop(1,'rgba(233,196,106,0)');g.fillStyle=rg;g.fillRect(0,0,W,H);
      g.strokeStyle='rgba(233,196,106,.35)';g.lineWidth=3;for(let i=0;i<7;i++){g.beginPath();g.arc(W*.78,H*.86,120+i*70,Math.PI,Math.PI*1.6);g.stroke();}
    }else{
      const gr=g.createLinearGradient(0,0,0,H);gr.addColorStop(0,'#efe0c4');gr.addColorStop(1,'#c98f62');g.fillStyle=gr;g.fillRect(0,0,W,H);
      g.globalAlpha=.2;g.fillStyle=fabricFill(g,'adire',['#14284b','#9fb8d8','#e9eef5'],3);g.fillRect(0,0,W,H);g.globalAlpha=1;
      const rg=g.createRadialGradient(W*.2,H*.12,10,W*.2,H*.12,W);rg.addColorStop(0,'rgba(255,248,232,.7)');rg.addColorStop(1,'rgba(255,248,232,0)');g.fillStyle=rg;g.fillRect(0,0,W,H);
    }
    return this._def[kind]=c.toDataURL('image/jpeg',.82);
  },
  async url(kind){
    const key=kind==='lock'?'lock_wallpaper':'home_wallpaper';
    if(Auth.user&&Auth.settings&&Auth.settings[key])return Auth.settings[key];
    if(!Auth.user){
      if(this._urls[kind])return this._urls[kind];
      const b=await Media.get(kind+'wp');
      if(b){return this._urls[kind]=URL.createObjectURL(b);}
    }
    return this.def(kind);
  },
  isCustom(kind){
    const key=kind==='lock'?'lock_wallpaper':'home_wallpaper';
    return Auth.user?!!(Auth.settings&&Auth.settings[key]):!!this._urls[kind];
  },
  async set(kind,file){
    const p=await prepareImage(file,{max:1170,quality:.86,allowGif:true,maxMB:CFG.limits.wallpaperMB});
    if(Auth.user){
      const old=Auth.settings&&Auth.settings[kind==='lock'?'lock_wallpaper':'home_wallpaper'];
      const path=await uploadFile('wallpapers',p.blob,p.ext,p.type);
      const url=publicUrl('wallpapers',path);
      const r=await Auth.saveSettings({[kind==='lock'?'lock_wallpaper':'home_wallpaper']:url});
      if(r.error)throw r.error;
      if(old)removeWallpaperFile(old);
    }else{
      await Media.put(kind+'wp',p.blob);
      if(this._urls[kind])URL.revokeObjectURL(this._urls[kind]);
      this._urls[kind]=URL.createObjectURL(p.blob);
      Local.set('customised',true);
    }
    await Phone.applyWallpapers();
  },
  async remove(kind){
    if(Auth.user){
      const key=kind==='lock'?'lock_wallpaper':'home_wallpaper';const old=Auth.settings&&Auth.settings[key];
      const r=await Auth.saveSettings({[key]:null});if(r.error)throw r.error;if(old)removeWallpaperFile(old);
    }else{await Media.del(kind+'wp');if(this._urls[kind])URL.revokeObjectURL(this._urls[kind]);delete this._urls[kind];}
    await Phone.applyWallpapers();
  },
  async migrateGuest(){ // after sign-in: save wallpapers picked as a guest to the account
    for(const kind of ['lock','home']){
      const key=kind==='lock'?'lock_wallpaper':'home_wallpaper';
      if(Auth.settings&&Auth.settings[key])continue;
      const b=await Media.get(kind+'wp');if(!b)continue;
      try{const type=b.type||'image/jpeg';const ext=type==='image/gif'?'gif':type==='image/png'?'png':type==='image/webp'?'webp':'jpg';
        const path=await uploadFile('wallpapers',b,ext,type);await Auth.saveSettings({[key]:publicUrl('wallpapers',path)});await Media.del(kind+'wp');
        if(this._urls[kind]){URL.revokeObjectURL(this._urls[kind]);delete this._urls[kind];}}catch(e){console.warn('wallpaper migrate',e);}
    }
  }
};
function removeWallpaperFile(url){const m=/\/wallpapers\/(.+)$/.exec(url||'');if(m)removeFile('wallpapers',decodeURIComponent(m[1].split('?')[0]));}

/* ---------- Notifications ---------- */
const Notifs={
  items:[],_ch:null,
  prefs(){const d={events:true,community:true,features:true,testimonials:true,campaigns:true};return Object.assign(d,Auth.settings?Auth.settings.notif_prefs:Local.get('notifprefs',{}));},
  async savePrefs(p){if(Auth.user){const r=await Auth.saveSettings({notif_prefs:p});return r;}Local.set('notifprefs',p);return{};},
  dismissed(){const d=Local.get('dismissed',{});const now=Date.now();let ch=false;for(const k in d)if(now-d[k]>7*864e5){delete d[k];ch=true;}if(ch)Local.set('dismissed',d);return d;},
  async dismiss(n){
    const d=this.dismissed();d[n.id]=Date.now();Local.set('dismissed',d);
    this.items=this.items.filter(x=>x.id!==n.id);
    if(n.dbId&&sb&&Auth.user)sb.from('notifications').update({read:true}).eq('id',n.dbId).then(()=>{});
    Phone.renderNotifs();
  },
  async build(){
    const pr=this.prefs(),dis=this.dismissed(),out=[];
    const week=Math.floor(Date.now()/(7*864e5)),day=Math.floor(Date.now()/864e5);
    const add=n=>{if(!dis[n.id])out.push(n);};
    if(sb){
      try{
        if(pr.events){const r=await sb.from('events').select('id,title,starts_at').gte('starts_at',new Date().toISOString()).order('starts_at').limit(1);
          const e=r.data&&r.data[0];if(e)add({id:'ev:'+e.id,app:'calendar',cat:'events',title:'New Lukks event coming up',body:`${e.title} · ${fmtDate(e.starts_at,{weekday:'short',day:'numeric',month:'short'})}`,intent:{event:e.id},t:Date.now()-3e5});}
        if(pr.community){const since=new Date(Date.now()-7*864e5).toISOString();
          const r=await sb.from('photos').select('id',{count:'exact',head:true}).eq('album_slug','community').eq('status','approved').gte('created_at',since);
          if(r.count>0)add({id:'comm:'+week,app:'photos',cat:'community',title:'New community activity',body:`${r.count} new photo${r.count>1?'s':''} in the Community album`,intent:{album:'community'},t:Date.now()-9e5});}
        if(pr.features){const since=new Date(Date.now()-45*864e5).toISOString().slice(0,10);
          const r=await sb.from('magazine_issues').select('id,title,release_date').eq('published',true).gte('release_date',since).order('release_date',{ascending:false}).limit(1);
          const m=r.data&&r.data[0];if(m)add({id:'mag:'+m.id,app:'safari',cat:'features',title:'A new fashion magazine is available',body:`${m.title} is now in the crate`,intent:{page:'issue',issue:m.id},t:Date.now()-18e5});}
      }catch(e){console.warn('notif build',e);}
    }
    if(pr.testimonials&&(day%3!==1)){
      let mine=0;if(Auth.user&&sb){const r=await sb.from('testimonials').select('id',{count:'exact',head:true}).eq('user_id',Auth.user.id);mine=r.count||0;}
      if(!mine)add({id:'testi:'+week,app:'notes',cat:'testimonials',title:'Got a lukk to share?',body:'Leave a testimonial about Lukks.',intent:{section:'testimonials',compose:true},t:Date.now()-36e5});
    }
    if(Auth.user&&sb){
      try{
        const r=await sb.from('notifications').select('*').eq('read',false).order('created_at',{ascending:false}).limit(30);
        (r.data||[]).forEach(x=>add({id:'db:'+x.id,dbId:x.id,app:x.app||'account',cat:'campaigns',title:x.title,body:x.body||'',intent:x.payload||{},t:new Date(x.created_at).getTime()}));
        const [ph,sub,ad]=await Promise.all([
          sb.from('photos').select('id',{count:'exact',head:true}).eq('user_id',Auth.user.id).eq('status','pending'),
          sb.from('magazine_submissions').select('id',{count:'exact',head:true}).eq('user_id',Auth.user.id).eq('status','pending'),
          sb.from('ad_bookings').select('id,status',{count:'exact'}).eq('user_id',Auth.user.id).in('status',['awaiting_payment','paid_in_review'])]);
        const pend=(ph.count||0)+(sub.count||0);
        if(pend)add({id:'pend:'+pend,app:'camera',cat:'community',title:'Your photos are awaiting review',body:`${pend} photo${pend>1?'s':''} pending approval`,intent:{tab:'mine'},t:Date.now()-72e5});
        const rev=(ad.data||[]).filter(b=>b.status==='paid_in_review').length;
        if(rev&&pr.campaigns)add({id:'adrev:'+rev,app:'ads',cat:'campaigns',title:'Your featured campaign is awaiting approval',body:'We are reviewing your creative.',intent:{tab:'mine'},t:Date.now()-5e6});
      }catch(e){console.warn('notif build (account)',e);}
    }else if(Local.get('customised')||(Local.get('opens',0)>2)){
      add({id:'save:'+week,app:'account',cat:'features',title:'Keep your phone set up',body:'Sign up to save your wallpapers, photos and lukks on every device.',intent:{mode:'signup'},t:Date.now()-96e5});
    }
    out.sort((a,b)=>b.t-a.t);this.items=out;Phone.renderNotifs();
  },
  subscribe(){
    if(this._ch&&sb){try{sb.removeChannel(this._ch);}catch(e){}this._ch=null;}
    if(!Auth.user||!sb)return;
    this._ch=sb.channel('notifs-'+Auth.user.id).on('postgres_changes',{event:'INSERT',schema:'public',table:'notifications',filter:'user_id=eq.'+Auth.user.id},p=>{
      const x=p.new;const n={id:'db:'+x.id,dbId:x.id,app:x.app||'account',cat:'campaigns',title:x.title,body:x.body||'',intent:x.payload||{},t:Date.now()};
      this.items.unshift(n);Phone.renderNotifs();Phone.banner(n);
      if('Notification' in window&&Notification.permission==='granted'&&document.hidden){try{new Notification(x.title,{body:x.body||'',icon:'icons/icon-192.png'});}catch(e){}}
    }).subscribe();
  },
  async enableBrowser(){
    if(!('Notification' in window))return{ok:false,msg:'This browser does not support notifications. You will still see updates on the phone lock screen.'};
    if(Notification.permission==='denied')return{ok:false,msg:'Notifications are blocked in your browser settings. You will still see updates on the lock screen.'};
    const p=await Notification.requestPermission();
    return p==='granted'?{ok:true,msg:'Browser notifications are on.'}:{ok:false,msg:'Permission was not granted. You will still see updates on the lock screen.'};
  }
};

/* ---------- Phone ---------- */
const Phone={
  state:'closed',app:null,appEl:null,editing:false,intentAfterUnlock:null,_batt:null,_hist:false,
  init(){
    this.build();
    this.tick();setInterval(()=>this.tick(),1000);
    this.initBattery();this.initNet();
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)this.onReturn();});
    addEventListener('popstate',e=>this.onPop(e));
    addEventListener('resize',()=>this.fit());
    Auth.on(ev=>{
      if(ev==='signin'){Wall.migrateGuest().then(()=>this.applyWallpapers());syncSavedLooks();this.afterAuth();}
      if(ev==='signout'){this.applyWallpapers();this.afterAuth();}
      if(ev==='refresh')this.applyWallpapers();
    });
    Sound.on(()=>this.updateSoundBtn());
    this.applyWallpapers();this.renderHome();
    Local.set('opens',Local.get('opens',0)+1);
  },
  afterAuth(){
    const s=Auth.settings;
    if(s){Sound.load(s.sound,s.muted);}
    Notifs.build();Notifs.subscribe();this.renderHome();this.updateSoundBtn();
    Apps.list.forEach(a=>a.onAuth&&a.onAuth());
  },
  build(){
    const L=this.layer=h('div',{id:'phoneLayer',class:'phone-layer',hidden:true,'aria-label':'Lukks phone'});
    const scr=this.screen=h('div',{id:'screen',class:'phone-screen'});
    this.status=h('div',{class:'statusbar'},
      this.sbTime=h('span',{class:'sb-time'},'9:41'),
      h('span',{class:'sb-island'}),
      h('span',{class:'sb-right'},
        this.sbMute=h('button',{class:'sb-btn',onclick:e=>{e.stopPropagation();this.soundTap();},'aria-label':'Sound','aria-pressed':'false'}),
        this.sbSig=h('span',{class:'sb-sig'}),
        this.sbWifi=h('span',{class:'sb-wifi',html:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">${IC.wifi}</svg>`}),
        this.sbBatt=h('span',{class:'sb-batt'},h('span',{class:'sb-pct'},'—'),h('span',{class:'sb-cell'},h('i')))));
    // Lock
    this.lockEl=h('div',{class:'lock',tabindex:'0','aria-label':'Lock screen. Swipe up or press Enter to unlock.'},
      this.lockBg=h('div',{class:'wp'}),h('div',{class:'lock-shade'}),
      h('div',{class:'lock-top'},icon('lock','lk-ic'),this.lkDate=h('div',{class:'lk-date'}),this.lkTime=h('div',{class:'lk-time'})),
      this.notifBox=h('div',{class:'notif-stack','aria-live':'polite'}),
      h('div',{class:'lock-bottom'},
        h('button',{class:'lk-shortcut',onclick:e=>{e.stopPropagation();this.unlock({open:'camera'});},'aria-label':'Camera'},icon('cam')),
        h('div',{class:'swipe-hint',onclick:()=>this.unlock()},icon('chevD','up'),h('span',null,'Swipe up to unlock')),
        h('button',{class:'lk-shortcut',onclick:e=>{e.stopPropagation();this.unlock({open:'notes',intent:{section:'about'}});},'aria-label':'Notes'},icon('edit'))));
    this.bindLockGestures();
    // Home
    this.homeEl=h('div',{class:'home'},this.homeBg=h('div',{class:'wp'}),h('div',{class:'home-shade'}),
      this.homeScroll=h('div',{class:'home-scroll'}),this.dotsEl=h('div',{class:'page-dots'},h('i',{class:'on'}),h('i')),this.dockEl=h('div',{class:'dock'}),
      this.doneBtn=h('button',{class:'edit-done',hidden:true,onclick:()=>this.setEditing(false)},'Done'));
    this.appHost=h('div',{class:'app-host'});
    this.indicator=h('div',{class:'home-bar',role:'button','aria-label':'Home',tabindex:'0',onclick:()=>this.goHome(),onkeydown:e=>{if(e.key==='Enter')this.goHome();}});
    this.roomBtn=h('button',{class:'room-btn',onclick:()=>this.exit(),'aria-label':'Put phone down and return to the room'},icon('back'),h('span',null,'Room'));
    this.toasts=h('div',{id:'toasts',class:'toasts'});this.bannerBox=h('div',{class:'banner-box'});
    scr.append(this.homeEl,this.appHost,this.lockEl,this.status,this.roomBtn,this.bannerBox,this.toasts,this.indicator);
    this.shell=h('div',{class:'phone-shell'},h('span',{class:'side-btn b1'}),h('span',{class:'side-btn b2'}),h('span',{class:'side-btn b3'}),h('span',{class:'side-btn pw'}),scr);
    L.appendChild(this.shell);document.body.appendChild(L);
    this.updateSoundBtn();this.setBatt(null);
  },
  fit(){
    const mobile=innerWidth<=520||innerHeight<=560;this.layer.classList.toggle('full',mobile);
    if(mobile){this.shell.style.removeProperty('--fit');this.layer.style.removeProperty('--fit');return;}
    const s=Math.min(1,(innerHeight-28)/884,(innerWidth-28)/414);this.layer.style.setProperty('--fit',s);
  },
  /* ---- clock, battery, network ---- */
  tick(){
    const d=new Date();
    const parts=new Intl.DateTimeFormat(undefined,{hour:'numeric',minute:'2-digit'}).formatToParts(d).filter(p=>p.type!=='dayPeriod'&&!(p.type==='literal'&&/\s/.test(p.value)&&false));
    const t=parts.map(p=>p.value).join('').trim();
    this.sbTime.textContent=t;this.lkTime.textContent=t;
    this.lkDate.textContent=d.toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric'});
    if(this._lastMin!==d.getMinutes()){this._lastMin=d.getMinutes();if(typeof updatePhoneScreenTexture==='function')updatePhoneScreenTexture();this.renderCalIcon&&this.renderCalIcon();}
  },
  async initBattery(){
    try{
      if(navigator.getBattery){const b=await navigator.getBattery();this._batt=b;const up=()=>this.setBatt({level:b.level,charging:b.charging});['levelchange','chargingchange'].forEach(ev=>b.addEventListener(ev,up));setInterval(up,30000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)up();});up();return;}
    }catch(e){}
    this.setBatt(null);
  },
  setBatt(real){
    const cell=this.sbBatt.lastChild.firstChild;
    if(!real){this.sbBatt.firstChild.textContent='';this.sbBatt.title='Battery level is not shared by this browser';cell.style.width='100%';this.sbBatt.classList.remove('low','chg');this.sbBatt.classList.add('sim');return;}
    const pct=Math.round(real.level*100),chg=real.charging;
    this.sbBatt.firstChild.textContent=pct+'%';this.sbBatt.title='Battery'+(chg?' (charging)':'');
    cell.style.width=pct+'%';this.sbBatt.classList.toggle('low',pct<=20);this.sbBatt.classList.remove('sim');this.sbBatt.classList.toggle('chg',chg);
  },
  initNet(){
    const up=()=>{
      const on=navigator.onLine!==false;const c=navigator.connection;
      const bars=!on?0:c&&c.effectiveType?({'slow-2g':1,'2g':1,'3g':2,'4g':4}[c.effectiveType]||4):4;
      this.sbSig.innerHTML=[1,2,3,4].map(i=>`<i class="${i<=bars?'on':''}" style="height:${3+i*2}px"></i>`).join('');
      this.sbWifi.style.opacity=on&&(!c||!c.type||c.type==='wifi'||c.type==='unknown')?1:.25;
      this.sbSig.title=on?'Signal':'No connection';
    };
    up();addEventListener('online',up);addEventListener('offline',up);if(navigator.connection)navigator.connection.addEventListener('change',up);
  },
  /* ---- sound control in status bar ---- */
  updateSoundBtn(){
    const st=Sound.state();const b=this.sbMute;if(!b)return;
    b.innerHTML='';b.appendChild(icon(st.playing?'speaker':'mute'));
    b.setAttribute('aria-pressed',String(st.playing));b.title=st.playing?'Mute sound':(Sound.kind==='off'?'Turn on ambient sound':'Unmute sound');
    b.classList.toggle('on',st.playing);
  },
  async soundTap(){
    if(Sound.kind!=='off'&&Sound.muted===false&&!Sound.playing()){await Sound.apply();}
    else await Sound.toggleMute();
    Local.set('sound',{kind:Sound.kind,muted:Sound.muted});
    if(Auth.user)Auth.saveSettings({sound:Sound.kind,muted:Sound.muted});
    toast(Sound.playing()?'Sound on':'Sound off');
  },
  /* ---- wallpapers ---- */
  async applyWallpapers(){
    const [l,hm]=await Promise.all([Wall.url('lock'),Wall.url('home')]);
    this.lockBg.style.backgroundImage=`url("${l}")`;this.homeBg.style.backgroundImage=`url("${hm}")`;
    this.appHost.dataset.wp='1';
  },
  /* ---- lock / unlock ---- */
  bindLockGestures(){
    const el=this.lockEl;let st=null;
    el.addEventListener('pointerdown',e=>{if(e.target.closest('.notif,.lk-shortcut'))return;st={y:e.clientY,t:performance.now(),id:e.pointerId};el.setPointerCapture(e.pointerId);el.classList.add('dragging');});
    el.addEventListener('pointermove',e=>{if(!st)return;const dy=Math.min(0,e.clientY-st.y);el.style.transform=`translateY(${dy}px)`;el.style.opacity=String(1-Math.min(.6,-dy/700));});
    const end=e=>{
      if(!st)return;const dy=e.clientY-st.y,dt=performance.now()-st.t;st=null;el.classList.remove('dragging');
      if(dy<-110||(dy<-45&&dt<260))this.unlock();else{el.style.transform='';el.style.opacity='';}
    };
    el.addEventListener('pointerup',end);el.addEventListener('pointercancel',end);
    el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key==='ArrowUp'||e.key===' '){e.preventDefault();this.unlock();}});
    el.addEventListener('wheel',e=>{if(e.deltaY>40)this.unlock();},{passive:true});
  },
  lock(silent){
    if(this.state==='closed'&&!silent)return;
    this.closeAppNow();this.setEditing(false);
    this.state='lock';this.screen.dataset.state='lock';
    this.lockEl.style.transform='';this.lockEl.style.opacity='';this.lockEl.classList.remove('gone');
    this.renderNotifs();
  },
  unlock(after){
    if(this.state!=='lock')return;
    this.state='home';this.screen.dataset.state='home';
    this.lockEl.style.transform='';this.lockEl.style.opacity='';this.lockEl.classList.add('gone');
    this.homeEl.classList.remove('enter');void this.homeEl.offsetWidth;this.homeEl.classList.add('enter');
    Local.set('phoneSeen',true);
    const a=after||this.intentAfterUnlock;this.intentAfterUnlock=null;
    if(a&&a.open)setTimeout(()=>this.openApp(a.open,a.intent),320);
    this.renderHome();
  },
  onReturn(){
    // Coming back to the tab: the phone stays exactly where it was.
    if(this.state==='lock'||this.state==='home')Notifs.build();
  },
  /* ---- enter / exit from the 3D room ---- */
  enter(){
    if(this.state==='closing'||(this.state!=='closed'&&this.layer.hidden)){clearTimeout(this._ct);this.layer.hidden=true;this.state='closed';}
    if(this.state!=='closed')return;
    this.layer.hidden=false;this.fit();
    this.state='lock';this.screen.dataset.state='lock';this.lockEl.classList.remove('gone');this.lockEl.style.transform='';this.lockEl.style.opacity='';
    requestAnimationFrame(()=>this.layer.classList.add('open'));
    Notifs.build();Notifs.subscribe();this.renderNotifs();this.tick();
    try{history.pushState({lukks:'phone'},'');this._hist=true;}catch(e){}
    Local.set('inPhone',true);
    const last=Local.get('lastApp',null),pend=this.intentAfterUnlock;
    if(pend){this.intentAfterUnlock=null;setTimeout(()=>{if(this.state==='lock')this.unlock(pend);},60);}
    else if(last&&Apps.get(last))this.restore(last);
    else setTimeout(()=>this.lockEl.focus({preventScroll:true}),400);
  },
  /* Come back exactly where you were: straight into the app, no lock screen, no zoom animation. */
  restore(id){
    this.state='home';this.screen.dataset.state='home';this.lockEl.classList.add('gone');this.renderHome();
    this._instant=true;try{this.openApp(id,undefined,null,null);}finally{this._instant=false;}
  },
  exit(fromPop){
    if(this.state==='closed')return;
    Local.set('inPhone',false);if(this.app)Local.set('lastApp',this.app.id);
    this.closeAppNow();this.setEditing(false);
    this.layer.classList.remove('open');
    const done=()=>{this.layer.hidden=true;this.state='closed';};
    clearTimeout(this._ct);this._ct=setTimeout(done,380);this.state='closing';
    if(typeof phoneClosed==='function')phoneClosed();
    const extra=this._appN||0;this._appN=0;
    if(!fromPop&&(this._hist||extra)){const k=extra+(this._hist?1:0);try{history.go(-k);}catch(e){}}
    this._hist=false;
  },
  onPop(e){
    if(this.state==='closed'||this.state==='closing')return;
    if(this._skipPop>0){this._skipPop--;return;}
    if(this.app){if(this.ctx&&typeof this.ctx.onBack==='function'&&this.ctx.onBack()){try{history.pushState({lukks:'app'},'');}catch(_){}return;}this.closeApp(true);return;}
    if(this.state==='lock'||this.state==='home'){this.exit(true);return;}
    this.exit(true);
  },
  goHome(){
    if(this.app){this.backTo=null;this.closeApp();}else if(this.state==='home'){this.homeScroll.scrollTo({left:0,behavior:'smooth'});this.setEditing(false);}
  },
  /* ---- notifications on lock screen ---- */
  renderNotifs(){
    if(!this.notifBox)return;
    this.notifBox.innerHTML='';
    this.items=Notifs.items;
    Notifs.items.slice(0,4).forEach((n,i)=>{
      const app=Apps.get(n.app)||{};
      const card=h('div',{class:'notif',style:{animationDelay:(i*110+150)+'ms'},role:'button',tabindex:'0','aria-label':n.title+'. '+n.body},
        h('span',{class:'n-ic',html:app.glyph?app.glyph():''}),
        h('div',{class:'n-txt'},h('div',{class:'n-title'},n.title),h('div',{class:'n-body'},n.body)),
        h('span',{class:'n-time'},timeAgo(n.t)),
        h('button',{class:'n-x','aria-label':'Dismiss notification',onclick:e=>{e.stopPropagation();card.classList.add('swipe-out');setTimeout(()=>Notifs.dismiss(n),260);}},icon('close')));
      const open=()=>{this.intentAfterUnlock={open:n.app,intent:n.intent};this.unlock();};
      card.addEventListener('click',open);card.addEventListener('keydown',e=>{if(e.key==='Enter')open();});
      // swipe left to dismiss
      let sx=null;card.addEventListener('pointerdown',e=>{sx=e.clientX;});
      card.addEventListener('pointermove',e=>{if(sx==null)return;const dx=e.clientX-sx;if(Math.abs(dx)>8){card.style.transform=`translateX(${dx}px)`;card.style.opacity=String(1-Math.min(.8,Math.abs(dx)/260));card._moved=true;}});
      const up=e=>{if(sx==null)return;const dx=e.clientX-sx;sx=null;if(Math.abs(dx)>90){card.classList.add('swipe-out');card.style.transform=`translateX(${dx>0?420:-420}px)`;setTimeout(()=>Notifs.dismiss(n),220);}else{card.style.transform='';card.style.opacity='';}setTimeout(()=>{card._moved=false;},10);};
      card.addEventListener('pointerup',up);card.addEventListener('pointercancel',up);
      card.addEventListener('click',e=>{if(card._moved){e.stopImmediatePropagation();}},true);
      this.notifBox.appendChild(card);
    });
    if(Notifs.items.length>4)this.notifBox.appendChild(h('div',{class:'n-more'},`+ ${Notifs.items.length-4} more notifications`));
    if(typeof phoneBadge==='function')phoneBadge(Notifs.items.length);
  },
  banner(n){
    if(this.state==='closed')return;
    const app=Apps.get(n.app)||{};
    const b=h('div',{class:'banner',role:'alert',onclick:()=>{b.remove();if(this.state==='lock'){this.intentAfterUnlock={open:n.app,intent:n.intent};this.unlock();}else this.openApp(n.app,n.intent);}},
      h('span',{class:'n-ic',html:app.glyph?app.glyph():''}),h('div',{class:'n-txt'},h('div',{class:'n-title'},n.title),h('div',{class:'n-body'},n.body)));
    this.bannerBox.appendChild(b);setTimeout(()=>b.classList.add('out'),4200);setTimeout(()=>b.remove(),4600);
  },
  /* ---- home screen ---- */
  order(){
    const all=Apps.list.filter(a=>!a.dock).map(a=>a.id);
    const saved=(Auth.settings&&Auth.settings.icon_order&&Auth.settings.icon_order.length)?Auth.settings.icon_order:Local.get('iconorder',[]);
    const out=saved.filter(id=>all.includes(id));all.forEach(id=>{if(!out.includes(id))out.push(id);});return out;
  },
  saveOrder(o){Local.set('iconorder',o);if(Auth.user)Auth.saveSettings({icon_order:o});},
  iconEl(a){
    const b=h('button',{class:'app-icon','data-id':a.id,'aria-label':a.name},
      h('span',{class:'glyph',style:{background:a.bg},html:a.glyph?a.glyph():''}),h('span',{class:'lbl'},a.name),h('span',{class:'badge',hidden:true}));
    this.bindIcon(b,a);return b;
  },
  bindIcon(el,a){
    let timer=null,drag=null;
    el.addEventListener('pointerdown',e=>{
      if(this.editing){drag={x:e.clientX,y:e.clientY,moved:false,started:false};el.setPointerCapture(e.pointerId);return;}
      timer=setTimeout(()=>{timer=null;this.setEditing(true);},520);drag={x:e.clientX,y:e.clientY,moved:false};
    });
    el.addEventListener('pointermove',e=>{
      if(!drag)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;
      if(!this.editing){if(Math.hypot(dx,dy)>8&&timer){clearTimeout(timer);timer=null;}return;}
      if(!drag.started&&Math.hypot(dx,dy)>6){drag.started=true;drag.moved=true;el.classList.add('lift');}
      if(drag.started){el.style.transform=`translate(${dx}px,${dy}px) scale(1.12)`;this.reorderPreview(el,e.clientX,e.clientY);}
    });
    const end=e=>{
      if(timer){clearTimeout(timer);timer=null;}
      if(!drag)return;const was=drag;drag=null;
      if(this.editing){
        if(was.started){el.classList.remove('lift');el.style.transform='';const o=$$('.home-grid .app-icon',this.homeScroll).map(x=>x.dataset.id);this.saveOrder(o);}
        return;
      }
      if(!was.moved&&e.type==='pointerup')this.openApp(a.id,null,el);
    };
    el.addEventListener('pointerup',end);el.addEventListener('pointercancel',end);
    el.addEventListener('keydown',e=>{if(e.key==='Enter'&&!this.editing)this.openApp(a.id,null,el);});
    el.addEventListener('contextmenu',e=>e.preventDefault());
  },
  reorderPreview(el,x,y){
    const grid=el.parentElement;const sibs=$$('.app-icon',grid).filter(s=>s!==el);
    let target=null,best=1e9;sibs.forEach(s=>{const r=s.getBoundingClientRect();const d=Math.hypot(x-(r.left+r.width/2),y-(r.top+r.height/2));if(d<best&&d<r.width*.7){best=d;target=s;}});
    if(target){const before=target.compareDocumentPosition(el)&Node.DOCUMENT_POSITION_FOLLOWING;
      const fromRect=el.getBoundingClientRect();
      grid.insertBefore(el,before?target:target.nextSibling);
      const to=el.getBoundingClientRect();const cur=el.style.transform.match(/translate\(([-\d.]+)px,\s*([-\d.]+)px\)/);
      if(cur){const nx=parseFloat(cur[1])+(fromRect.left-to.left),ny=parseFloat(cur[2])+(fromRect.top-to.top);el.style.transform=`translate(${nx}px,${ny}px) scale(1.12)`;}
    }
  },
  setEditing(v){this.editing=v;this.homeEl.classList.toggle('editing',v);this.doneBtn.hidden=!v;if(!v)$$('.app-icon.lift',this.homeEl).forEach(x=>{x.classList.remove('lift');x.style.transform='';});},
  renderHome(){
    if(!this.homeScroll)return;
    this.homeScroll.innerHTML='';this.dockEl.innerHTML='';
    const page1=h('div',{class:'home-page'}),page2=h('div',{class:'home-page'});
    // widgets
    this.widgetEl=h('div',{class:'widgets'},
      this.wToday=h('button',{class:'widget w-today',onclick:()=>this.openApp('calendar')},h('div',{class:'w-k'},'Today'),h('div',{class:'w-big'},new Date().getDate()),h('div',{class:'w-s'},new Date().toLocaleDateString(undefined,{weekday:'long'})),h('div',{class:'w-e'},'Loading events…')),
      h('button',{class:'widget w-crate',onclick:()=>{this.exit();setTimeout(()=>{if(typeof goBrowse==='function'&&S.mode==='room')goBrowse();},420);}},h('div',{class:'w-k'},'Magazine crate'),h('div',{class:'w-spines'},[0,1,2,3,4].map(i=>h('i',{style:{background:['#1d3a8a','#c8372d','#e9c46a','#2a6f5c','#7d1f33'][i]}}))),h('div',{class:'w-s'},'Pull one out →')));
    page2.appendChild(this.widgetEl);
    this.loadWidgetEvent();
    const grid=h('div',{class:'home-grid'});this.order().forEach(id=>{const a=Apps.get(id);if(a)grid.appendChild(this.iconEl(a));});
    page1.appendChild(grid);this.homeScroll.append(page1,page2);
    if(!this._dotBound){this._dotBound=true;this.homeScroll.addEventListener('scroll',()=>{const i=Math.round(this.homeScroll.scrollLeft/Math.max(1,this.homeScroll.clientWidth));[...this.dotsEl.children].forEach((d,j)=>d.classList.toggle('on',j===i));},{passive:true});}
    Apps.list.filter(a=>a.dock).forEach(a=>this.dockEl.appendChild(this.iconEl(a)));
    this.renderCalIcon();this.updateBadges();
  },
  async loadWidgetEvent(){
    if(!sb||!this.wToday)return;
    try{const r=await sb.from('events').select('id,title,starts_at').gte('starts_at',new Date().toISOString()).order('starts_at').limit(1);
      const e=r.data&&r.data[0];const el=this.wToday.querySelector('.w-e');if(el)el.textContent=e?`${e.title} · ${fmtDate(e.starts_at,{day:'numeric',month:'short'})}`:'No events yet';}catch(e){}
  },
  renderCalIcon(){
    const a=Apps.get('calendar');if(!a)return;
    $$('.app-icon[data-id=calendar] .glyph').forEach(g=>{g.innerHTML=a.glyph();});
    $$('.n-ic').forEach(()=>{});
  },
  async updateBadges(){
    if(!Auth.user||!sb)return;
    try{const r=await sb.from('messages').select('id',{count:'exact',head:true}).eq('recipient_id',Auth.user.id).is('read_at',null);
      const b=$$('.app-icon[data-id=messages] .badge');b.forEach(x=>{x.hidden=!r.count;x.textContent=r.count>9?'9+':r.count;});}catch(e){}
  },
  /* ---- app host ---- */
  openApp(id,intent,fromEl,opener){
    const a=Apps.get(id);if(!a)return;
    if(a.redirect){const r=a.redirect;if(r.auth&&!Auth.user)return this.openApp('account',{mode:'signin'},fromEl,opener);return this.openApp(r.id,Object.assign({},r.intent),fromEl,opener);}
    if(this.state==='lock'){this.intentAfterUnlock={open:id,intent};this.unlock();return;}
    const noPush=this._noPush;this._noPush=false;
    if(this.app){if(!opener&&this.app.id&&this.app.id!==id)opener=null;this.closeAppNow();}
    this.backTo=opener||null;
    this.setEditing(false);
    const el=h('div',{class:'app','data-app':id});this.appEl=el;this.app=a;
    this.appHost.innerHTML='';this.appHost.appendChild(el);this.screen.dataset.state='app';this.state='app';
    const ctx={close:()=>this.closeApp(),open:(i,n)=>this.openApp(i,n,null,id),el,intent:intent||{}};
    try{a.mount(el,ctx);}catch(e){console.error(e);el.appendChild(empty('Something went wrong','Please close the app and try again.'));}
    this.ctx=ctx;
    // The tap that opened the app must not also press whatever is under the finger in the new screen.
    if(!this._instant){el.style.pointerEvents='none';setTimeout(()=>{el.style.pointerEvents='';},420);}
    if(!noPush){try{history.pushState({lukks:'app',id},'');this._appN=(this._appN||0)+1;}catch(e){}}
    // zoom from icon
    const src=fromEl||this.homeEl.querySelector(`.app-icon[data-id="${id}"] .glyph`)||this.dockEl.querySelector(`.app-icon[data-id="${id}"] .glyph`);
    const sr=this.screen.getBoundingClientRect();
    if(src&&el.animate&&!this._instant&&!matchMedia('(prefers-reduced-motion: reduce)').matches){
      const r=(src.querySelector?src.querySelector('.glyph')||src:src).getBoundingClientRect();const sc=this.shell.getBoundingClientRect().width/this.shell.offsetWidth||1;
      const cx=(r.left+r.width/2-sr.left)/sc,cy=(r.top+r.height/2-sr.top)/sc,W=this.screen.offsetWidth,H=this.screen.offsetHeight;
      el.animate([{transform:`translate(${cx-W/2}px,${cy-H/2}px) scale(${r.width/sc/W},${r.height/sc/H})`,borderRadius:'18px',opacity:.4},{transform:'none',borderRadius:'0px',opacity:1}],{duration:380,easing:'cubic-bezier(.2,.85,.25,1)'});
    }
    this.homeEl.classList.add('behind');
    Local.set('lastApp',id);
  },
  closeApp(fromPop){
    if(!this.app)return;
    const el=this.appEl;const a=this.app;
    if(el&&el.animate&&!matchMedia('(prefers-reduced-motion: reduce)').matches){
      const an=el.animate([{transform:'none',opacity:1,borderRadius:'0px'},{transform:'scale(.9) translateY(30px)',opacity:0,borderRadius:'28px'}],{duration:230,easing:'ease-in'});
      an.onfinish=()=>{if(el.parentElement)el.remove();};
    }else if(el)el.remove();
    a.unmount&&a.unmount();
    this.app=null;this.appEl=null;this.state='home';this.screen.dataset.state='home';this.homeEl.classList.remove('behind');Local.set('lastApp',null);
    const back=this.backTo;this.backTo=null;
    const n=this._appN||0;
    if(back&&Apps.get(back)){ if(!fromPop&&n>0){try{history.back();this._skipPop=(this._skipPop||0)+1;}catch(e){}} this._appN=Math.max(0,n-1); }
    else{ const k=fromPop?n-1:n; if(k>0){try{history.go(-k);this._skipPop=(this._skipPop||0)+1;}catch(e){}} this._appN=0; }
    this.updateBadges();
    if(back&&Apps.get(back)){this._noPush=true;this.openApp(back,undefined,null,null);}
  },
  closeAppNow(){
    if(this.appEl)this.appEl.remove();if(this.app&&this.app.unmount)this.app.unmount();
    this.app=null;this.appEl=null;this.homeEl&&this.homeEl.classList.remove('behind');
  }
};
