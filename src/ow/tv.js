/* ---------- Room TV: a shared video player ----------
   Everyone in the same room sees the same video at the same moment. Play, pause, seek, +/-10s,
   next and the playlist are shared over a Supabase Realtime broadcast channel (tv:<roomId>).
   Nothing is stored in the database: the state lives with the people watching, and a newcomer
   asks "hello" and whoever is watching answers. Live emoji reactions use the same channel. */
const OWTv=(()=>{
  const EM=['❤️','🔥','😮','👏'];
  let ytP=null;const cur={};
  const loadYT=()=>ytP||(ytP=new Promise((res,rej)=>{
    if(window.YT&&YT.Player)return res();
    const prev=window.onYouTubeIframeAPIReady;window.onYouTubeIframeAPIReady=()=>{prev&&prev();res();};
    const s=document.createElement('script');s.src='https://www.youtube.com/iframe_api';s.onerror=()=>{ytP=null;rej(new Error('YouTube could not load'));};document.head.appendChild(s);
  }));
  const fmt=t=>{t=Math.max(0,Math.floor(t||0));return Math.floor(t/60)+':'+String(t%60).padStart(2,'0');};
  /* ----- what links can play: YouTube, Vimeo, direct video files / HLS streams, and a few embeddable sites ----- */
  const h36=t=>{let a=5381,b=52711;for(let i=0;i<t.length;i++){const c=t.charCodeAt(i);a=(((a<<5)+a)^c)>>>0;b=(((b<<5)+b)^c)>>>0;}return a.toString(36)+b.toString(36);};
  const EMBED_HOSTS=['www.dailymotion.com','streamable.com','player.twitch.tv','www.loom.com'];
  const FILE_RE=/\.(mp4|m4v|webm|ogv|mov|m3u8)$/i;
  function parse(u){
    try{
      const x=new URL(String(u).trim());if(!/^https?:$/.test(x.protocol))return null;
      const host=x.hostname.replace(/^(www|m)\./,'');let m;
      const yid=typeof ytId==='function'?ytId(x.href):null;if(yid&&/^[\w-]{11}$/.test(yid))return{k:'yt',id:yid,u:yid,n:'YouTube video'};
      if((host==='vimeo.com'&&(m=x.pathname.match(/^\/(?:channels\/[^/]+\/|groups\/[^/]+\/videos\/)?(\d+)/)))||(host==='player.vimeo.com'&&(m=x.pathname.match(/^\/video\/(\d+)/))))return{k:'vm',id:'vm_'+m[1],u:m[1],n:'Vimeo video'};
      if(x.protocol!=='https:')return null;
      let e=null,nm='';
      if(host==='dailymotion.com'&&(m=x.pathname.match(/^\/video\/([A-Za-z0-9]+)/))){e='https://www.dailymotion.com/embed/video/'+m[1]+'?autoplay=1';nm='Dailymotion video';}
      else if(host==='dai.ly'&&(m=x.pathname.match(/^\/([A-Za-z0-9]+)/))){e='https://www.dailymotion.com/embed/video/'+m[1]+'?autoplay=1';nm='Dailymotion video';}
      else if(host==='streamable.com'&&(m=x.pathname.match(/^\/(?:e\/)?([a-z0-9]+)$/i))){e='https://streamable.com/e/'+m[1]+'?autoplay=1';nm='Streamable video';}
      else if(host==='twitch.tv'&&(m=x.pathname.match(/^\/videos\/(\d+)/))){e='https://player.twitch.tv/?video=v'+m[1]+'&parent='+location.hostname+'&autoplay=true';nm='Twitch video';}
      else if(host==='twitch.tv'&&(m=x.pathname.match(/^\/([A-Za-z0-9_]{3,25})$/))){e='https://player.twitch.tv/?channel='+m[1]+'&parent='+location.hostname+'&autoplay=true';nm='Twitch stream';}
      else if(host==='loom.com'&&(m=x.pathname.match(/^\/(?:share|embed)\/([a-f0-9]+)/))){e='https://www.loom.com/embed/'+m[1]+'?autoplay=1';nm='Loom video';}
      if(e)return{k:'em',id:'em_'+h36(e),u:e,n:nm};
      if(FILE_RE.test(x.pathname)){const f=decodeURIComponent(x.pathname.split('/').pop()||'').replace(FILE_RE,'');return{k:'fl',id:'fl_'+h36(x.href),u:x.href,n:f||x.hostname};}
    }catch(e){}
    return null;
  }
  /* queue items can arrive from other people's phones, so every one is re-checked before it touches the page */
  function valid(v){
    if(!v||typeof v.id!=='string'||typeof v.u!=='string')return false;const k=v.k||'yt';
    if(k==='yt')return/^[\w-]{11}$/.test(v.u);
    if(k==='vm')return/^\d{1,12}$/.test(v.u);
    try{const x=new URL(v.u);if(x.protocol!=='https:')return false;
      if(k==='fl')return FILE_RE.test(x.pathname);
      if(k==='em')return EMBED_HOSTS.includes(x.hostname);}catch(e){}
    return false;
  }
  const norm=v=>v.k?v:Object.assign({},v,{k:'yt',u:v.u||v.id});
  async function titleOf(src){
    try{
      if(src.k==='yt'){const r=await fetch('https://www.youtube.com/oembed?format=json&url='+encodeURIComponent('https://youtu.be/'+src.u));if(r.ok){const j=await r.json();if(j.title)return j.title;}}
      if(src.k==='vm'){const r=await fetch('https://vimeo.com/api/oembed.json?url='+encodeURIComponent('https://vimeo.com/'+src.u));if(r.ok){const j=await r.json();if(j.title)return j.title;}}
    }catch(e){}
    return src.n||'Video';
  }
  const scripts={};
  const loadScript=(src,ok)=>scripts[src]||(scripts[src]=new Promise((res,rej)=>{if(ok())return res();const t=document.createElement('script');t.src=src;t.onload=()=>res();t.onerror=()=>{delete scripts[src];rej(new Error('script'));};document.head.appendChild(t);}));
  const mount=slot=>{const d=h('div',{class:'tv-fill'});slot.append(d);return d;};

  /* one small adapter per kind of video, all with the same handful of methods */
  async function A_yt(slot,evt){
    await loadYT();const d=mount(slot),el=h('div',{id:'tv-yt-'+Math.random().toString(36).slice(2,8)});d.append(el);let p,rd;const ready=new Promise(r=>rd=r);
    p=new YT.Player(el.id,{host:'https://www.youtube-nocookie.com',width:'100%',height:'100%',playerVars:{controls:0,disablekb:1,fs:0,playsinline:1,rel:0,modestbranding:1,iv_load_policy:3,autoplay:1},events:{
      onReady:()=>rd(),onStateChange:e=>{if(e.data===1)evt.state(true);else if(e.data===2)evt.state(false);else if(e.data===0)evt.end();},onError:()=>evt.err()}});
    await ready;
    return{ctl:true,load(v,pos,play){p.loadVideoById(v.u,pos||0);if(!play)setTimeout(()=>{evt.busy();try{p.pauseVideo();}catch(e){}},700);},play(){p.playVideo();},pause(){p.pauseVideo();},seek(t){p.seekTo(t,true);},time(){return p.getCurrentTime()||0;},dur(){return p.getDuration()||0;},destroy(){try{p.destroy();}catch(e){}d.remove();}};
  }
  async function A_vm(slot,evt){
    await loadScript('https://player.vimeo.com/api/player.js',()=>window.Vimeo&&Vimeo.Player);const d=mount(slot);let p=null,t=0,du=0;
    const bind=()=>{p.on('play',()=>evt.state(true));p.on('pause',()=>evt.state(false));p.on('ended',()=>evt.end());p.on('error',()=>evt.err());p.on('timeupdate',e=>{t=e.seconds||0;du=e.duration||du;});};
    return{ctl:true,
      load(v,pos,play){const go=()=>{Promise.resolve(p.setCurrentTime(pos||0)).catch(()=>{}).then(()=>play?p.play().catch(()=>evt.blocked(true)):p.pause());};
        if(!p){p=new Vimeo.Player(d,{id:+v.u,playsinline:true,autopause:false,byline:false,title:false,portrait:false,dnt:true});bind();p.ready().then(go).catch(()=>evt.err());}
        else p.loadVideo(+v.u).then(go).catch(()=>evt.err());},
      play(){p&&p.play().catch(()=>evt.blocked(true));},pause(){p&&p.pause();},seek(x){p&&p.setCurrentTime(x);t=x;},time(){return t;},dur(){return du;},destroy(){try{p&&p.destroy();}catch(e){}d.remove();}};
  }
  async function A_fl(slot,evt){
    const d=mount(slot),vd=h('video',{class:'tv-vid'});vd.setAttribute('playsinline','');vd.preload='auto';d.append(vd);let hls=null;
    vd.addEventListener('play',()=>evt.state(true));vd.addEventListener('pause',()=>evt.state(false));vd.addEventListener('ended',()=>evt.end());vd.addEventListener('error',()=>evt.err());
    const start=play=>{if(play)vd.play().then(()=>evt.blocked(false)).catch(()=>evt.blocked(true));};
    return{ctl:true,
      async load(v,pos,play){
        if(hls){try{hls.destroy();}catch(e){}hls=null;}
        vd.addEventListener('loadedmetadata',()=>{if(pos)try{vd.currentTime=pos;}catch(e){}},{once:true});
        if(/\.m3u8$/i.test(new URL(v.u).pathname)&&!vd.canPlayType('application/vnd.apple.mpegurl')){
          try{await loadScript('https://cdnjs.cloudflare.com/ajax/libs/hls.js/1.5.7/hls.min.js',()=>window.Hls);}catch(e){evt.err();return;}
          if(!Hls.isSupported()){evt.err();return;}
          hls=new Hls();hls.on(Hls.Events.ERROR,(_,e)=>{if(e&&e.fatal)evt.err();});hls.loadSource(v.u);hls.attachMedia(vd);
        }else vd.src=v.u;
        start(play);},
      play(){start(true);},pause(){vd.pause();},seek(x){try{vd.currentTime=x;}catch(e){}},time(){return vd.currentTime||0;},dur(){return isFinite(vd.duration)?vd.duration:0;},destroy(){if(hls){try{hls.destroy();}catch(e){}}vd.pause();vd.removeAttribute('src');d.remove();}};
  }
  async function A_em(slot,evt){
    const d=mount(slot),f=h('iframe',{allow:'autoplay; fullscreen; picture-in-picture',allowfullscreen:'',title:'Video'});d.append(f);
    return{ctl:false,load(v){f.src=v.u;},play(){},pause(){},seek(){},time(){return 0;},dur(){return 0;},destroy(){d.remove();}};
  }
  const ADAPTERS={yt:A_yt,vm:A_vm,fl:A_fl,em:A_em};

  function open(o){
    const old=cur[o.roomId];if(old&&old.alive){old.addOrFocus(o.vid,o.title);return old;}
    const me=o.uid||('g'+Math.random().toString(36).slice(2,8));
    let S={q:[],i:0,play:true,pos:0},ad=null,adP=null,applySeq=0,loadedId=null,busyUntil=0,lead=false,alive=true,got=false,ch=null,hb=0,tick=0,lastRx=0,seeking=false;
    const busy=(ms)=>{busyUntil=Date.now()+(ms||900);};
    const isBusy=()=>Date.now()<busyUntil;
    const pos=()=>{try{return ad?ad.time():S.pos;}catch(e){return S.pos;}};

    /* ----- UI ----- */
    const ic=(n)=>icon(n);
    const bdg=h('i',{class:'tv-badge'}),cmB=h('button',{class:'tv-b tv-cm','aria-label':'Comments'},ic('chat'),bdg),rot=h('button',{class:'tv-b','aria-label':'Rotate to landscape'},ic('rotate')),ex=h('button',{class:'tv-b','aria-label':'Expand'},ic('expand')),cl=h('button',{class:'tv-b','aria-label':'Close TV'},ic('close'));
    const ttl=h('span',null,'TV');
    const slot=h('div',{class:'tv-slot'}),startB=h('button',{class:'tv-start'},'Tap to play');
    const fl=h('div',{class:'tv-float'});
    const tap=h('div',{class:'tv-tap'});
    const ping=h('div',{class:'tv-ping'});
    const screen=h('div',{class:'tv-screen'},slot,tap,startB,fl,ping,h('div',{class:'tv-msg'}));
    const bPlay=h('button',{class:'tv-c big','aria-label':'Play or pause'},ic('play')),bBack=h('button',{class:'tv-c','aria-label':'Back 10 seconds'},h('b',null,'-10')),bFwd=h('button',{class:'tv-c','aria-label':'Forward 10 seconds'},h('b',null,'+10')),bNext=h('button',{class:'tv-c','aria-label':'Next video'},ic('next')),bList=h('button',{class:'tv-b','aria-label':'Playlist'},ic('list')),ctlB=h('button',{class:'tv-b tv-pb-ctl','aria-label':'Playback controls'},ic('play')),rxB=h('button',{class:'tv-b tv-pb-rx','aria-label':'Reactions'},'\u2764\ufe0f');
    const rng=h('input',{type:'range',min:'0',max:'1000',value:'0',class:'tv-rng','aria-label':'Seek'}),tm=h('span',{class:'tv-tm'},'0:00');
    const ctr=h('div',{class:'tv-ctr'},bBack,bPlay,bFwd,bNext);
    const seekRow=h('div',{class:'tv-seek'},rng,tm);
    const rx=h('div',{class:'tv-rx'},h('span',null,'Live reactions'),...EM.map(e=>h('button',{'aria-label':'React '+e,onclick:()=>react(e)},e)));
    const urlIn=h('input',{type:'url',placeholder:'Paste a video link to queue',class:'tv-in'}),addB=h('button',{class:'tv-add'},'Add');
    const lst=h('div',{class:'tv-list'});
    const pl=h('div',{class:'tv-pl'},h('div',{class:'tv-add-row'},urlIn,addB),lst);
    const cList=h('div',{class:'tv-clist'}),cIn=h('input',{type:'text',maxlength:'300',placeholder:'Say something nice\u2026',class:'tv-in'}),cSend=h('button',{class:'tv-add'},'Post');
    const QUICK=['\ud83d\ude31 What happened?','\ud83d\ude28 This is scary','\ud83d\ude02 This is funny','\ud83e\udd14 This is interesting','\ud83d\udd25 Fire','\ud83d\udc4f Great one','\u2764\ufe0f Love this'];
    const cHead=h('div',{class:'tv-ch'},'Comments on this video'),cWrite=h('button',{class:'tv-add tv-wr'},'Write a comment');
    const cChips=h('div',{class:'tv-chips'},...QUICK.map(t=>h('button',{onclick:()=>postC(t)},t)),cWrite);
    const cRow=h('div',{class:'tv-add-row tv-typing'},cIn,cSend);
    const cmP=h('div',{class:'tv-cmp'},cHead,cList,cChips,cRow);
    const box=h('div',{class:'tvplayer'},h('div',{class:'tv-bar'},ttl,ctlB,bList,rxB,cmB,rot,ex,cl),screen,seekRow,ctr,rx,pl,cmP);
    o.host.append(box);

    /* ----- messaging ----- */
    const send=(payload)=>{try{ch&&ch.send({type:'broadcast',event:'tv',payload});}catch(e){}};
    const snap=(seek)=>({k:'state',s:{q:S.q,i:S.i,play:S.play,pos:pos(),seek:!!seek}});
    const announce=(seek)=>{lead=true;send(snap(seek));};
    function react(e){const t=Date.now();if(t-lastRx<250)return;lastRx=t;float(e);send({k:'react',e});}
    function float(e){const s=h('span',{class:'tv-fe',style:{left:(10+Math.random()*80)+'%'}},e);fl.append(s);setTimeout(()=>s.remove(),2200);while(fl.children.length>14)fl.firstChild.remove();}

    /* ----- applying state to the player ----- */
    const evt={
      busy:()=>busy(900),
      state:p=>{if(!alive||isBusy())return;if(p&&!S.play){S.play=true;render();announce();}else if(!p&&S.play){S.play=false;render();announce();}},
      end:()=>{if(!alive||isBusy())return;if(S.i+1<S.q.length){const i=S.i+1;S.i=i;apply({q:S.q,i,play:true,pos:0});}else{S.play=false;render();}},
      err:()=>{if(!alive)return;const m=box.querySelector('.tv-msg');m.textContent='This video cannot be played here. Skipping\u2026';setTimeout(()=>{m.textContent='';if(alive&&S.i+1<S.q.length)next();},1800);},
      blocked:on=>{startB.classList.toggle('on',!!on);}
    };
    startB.onclick=()=>{startB.classList.remove('on');try{ad&&ad.play();}catch(e){}};
    function use(kind){
      if(adP&&adP.k===kind)return adP.p;
      if(adP){const old=adP;adP=null;ad=null;loadedId=null;old.p.then(a=>{try{a.destroy();}catch(e){}}).catch(()=>{});}
      const p=(ADAPTERS[kind]||A_yt)(slot,evt);adP={k:kind,p};p.then(a=>{if(adP&&adP.p===p)ad=a;}).catch(()=>{if(adP&&adP.p===p)adP=null;box.querySelector('.tv-msg').textContent='The player could not load. Check your connection.';});return p;
    }
    async function apply(s){
      const q=(s.q||[]).filter(valid).map(norm);
      S={q,i:Math.min(Math.max(0,s.i|0),Math.max(0,q.length-1)),play:!!s.play,pos:+s.pos||0};
      render();
      const v=S.q[S.i],my=++applySeq;
      if(!v){loadedId=null;if(ad){busy();try{ad.pause();}catch(e){}}return;}
      let a;try{a=await use(v.k);}catch(e){return;}
      if(!alive||my!==applySeq)return;
      busy(1200);startB.classList.remove('on');
      try{
        if(v.id!==loadedId){loadedId=v.id;a.load(v,S.pos||0,S.play);}
        else if(a.ctl){const d=Math.abs(a.time()-S.pos);if(s.seek||(S.play&&d>2.5)||(!S.play&&d>1))a.seek(S.pos);S.play?a.play():a.pause();}
      }catch(e){}
    }
    function onMsg(m){
      const p=m&&m.payload;if(!p||!alive)return;
      if(p.k==='hello'){if(got||S.q.length){setTimeout(()=>{if(alive)send(snap());},Math.random()*400);}}
      else if(p.k==='state'&&p.s){got=true;lead=false;apply(p.s);}
      else if(p.k==='react'&&EM.includes(p.e))float(p.e);
      else if(p.k==='cm'){const v=S.q[S.i];if(v&&p.v===v.id){if(box.classList.contains('cm-on'))loadC();else{cnt[v.id]=(cnt[v.id]||0)+1;badge();refreshCount();}}}
    }

    /* ----- actions (always shared) ----- */
    const toggle=()=>{S.play=!S.play;busy();try{S.play?ad.play():ad.pause();}catch(e){}render();announce();};
    const seekBy=d=>{const t=Math.max(0,pos()+d);S.pos=t;busy();try{ad.seek(t);}catch(e){}announce(true);};
    const playIndex=i=>{if(i<0||i>=S.q.length)return;S.i=i;S.pos=0;S.play=true;apply({q:S.q,i,play:true,pos:0});announce(true);};
    const next=()=>{if(S.i+1<S.q.length)playIndex(S.i+1);else toast('That was the last video in the queue');};
    async function add(src){
      if(S.q.some(v=>v.id===src.id)){toast('Already in the queue');return;}
      const t=await titleOf(src);S.q=S.q.concat([Object.assign({},src,{t,by:me})]);
      if(S.q.length===1){S.i=0;S.pos=0;S.play=true;apply({q:S.q,i:0,play:true,pos:0});}else render();
      announce();toast('Added to the TV queue','ok');
    }
    function remove(i){
      const was=i===S.i;S.q=S.q.filter((_,k)=>k!==i);
      if(i<S.i)S.i--;if(S.i>=S.q.length)S.i=Math.max(0,S.q.length-1);
      if(was)apply({q:S.q,i:S.i,play:S.play&&S.q.length>0,pos:0});else render();announce(was);
    }
    function fromInput(){
      const src=parse(urlIn.value);if(!src){toast('That link cannot play on the TV. Use YouTube, Vimeo, Dailymotion, Streamable, Twitch, Loom, or a direct .mp4 / .webm / .m3u8 link.','err');return;}
      urlIn.value='';add(src);
    }
    addB.onclick=fromInput;urlIn.addEventListener('keydown',e=>{if(e.key==='Enter')fromInput();});
    bPlay.onclick=toggle;bBack.onclick=()=>seekBy(-10);bFwd.onclick=()=>seekBy(10);bNext.onclick=next;
    bList.onclick=()=>pp('pl-on');
    rng.addEventListener('input',()=>{seeking=true;});
    rng.addEventListener('change',()=>{seeking=false;try{const d=ad.dur()||0;if(d)seekBy(rng.value/1000*d-pos());}catch(e){}});
    ex.onclick=()=>{const big=box.classList.toggle('big');ex.setAttribute('aria-label',big?'Shrink':'Expand');box.style.left=box.style.top='';};
    rot.onclick=()=>{const on=box.classList.toggle('rot');box.style.left=box.style.top='';PP.forEach(c=>box.classList.remove(c));box.classList.remove('side-on');clearTimeout(uiT);box.classList.remove('ui-on');document.body.classList.toggle('tv-rotated',on);rot.setAttribute('aria-label',on?'Back to portrait':'Rotate to landscape');
      if(on){try{const e=document.documentElement;e.requestFullscreen&&e.requestFullscreen().catch(()=>{});}catch(_){}}else{try{document.fullscreenElement&&document.exitFullscreen();}catch(_){}}};

    /* full screen: only the video until you tap it; the controls fade in over the picture, then fade out */
    let uiT=0,shownVid=null;
    function showUi(){box.classList.add('ui-on');clearTimeout(uiT);uiT=setTimeout(()=>{if(!box.classList.contains('side-on'))box.classList.remove('ui-on');},3500);}
    let ctlT=0;
    tap.addEventListener('click',()=>{if(!box.classList.contains('rot')){clearTimeout(ctlT);if(PP.some(c=>box.classList.contains(c)))PP.forEach(c=>box.classList.remove(c));else{pp('pp-ctl');ctlT=setTimeout(()=>box.classList.remove('pp-ctl'),4000);}return;}if(box.classList.contains('side-on')){box.classList.remove('side-on','pl-on','cm-on');showUi();return;}if(box.classList.contains('ui-on')){box.classList.remove('ui-on');clearTimeout(uiT);}else showUi();});
    box.addEventListener('pointerdown',()=>{if(box.classList.contains('rot')&&box.classList.contains('ui-on')&&!box.classList.contains('side-on'))showUi();});
    let cT=0;
    async function loadC(){const v=S.q[S.i];if(!o.comments||!alive||!v){cList.replaceChildren(h('p',{class:'tv-none'},'Nothing is playing.'));return;}try{const cs=await o.comments.load(v.id);if(!S.q[S.i]||S.q[S.i].id!==v.id)return;cList.replaceChildren(...(cs.length?cs.slice(-40).map(c=>h('div',{class:'tv-c1'},h('b',null,'@'+c.username),' '+c.body)):[h('p',{class:'tv-none'},'No comments yet.')]));cList.scrollTop=cList.scrollHeight;cnt[v.id]=cs.length;seen[v.id]=cs.length;badge();}catch(e){}}
    cmB.style.display=o.comments?'':'none';
    /* unread count on the comment icon: comments on this video you have not opened yet */
    const cnt={},seen={};
    let prevN=0,pingT=0;
    function badge(){const v=S.q[S.i],n=v?Math.max(0,(cnt[v.id]||0)-(seen[v.id]||0)):0;if(n>prevN&&box.classList.contains('rot')&&!box.classList.contains('cm-on')){ping.textContent='\ud83d\udcac '+n+(n===1?' new comment':' new comments');ping.classList.add('on');clearTimeout(pingT);pingT=setTimeout(()=>ping.classList.remove('on'),4000);}prevN=n;bdg.textContent=n>99?'99+':String(n||'');bdg.classList.toggle('on',n>0);cmB.setAttribute('aria-label',n?'Comments, '+n+' new':'Comments');}
    async function refreshCount(){const v=S.q[S.i];if(!o.comments||!alive||!v||document.hidden)return;try{const cs=await o.comments.load(v.id);cnt[v.id]=cs.length;if(box.classList.contains('cm-on'))seen[v.id]=cs.length;badge();}catch(e){}}
    const cI=setInterval(refreshCount,2500);setTimeout(refreshCount,1800);
    /* the icons in the title bar each open one panel over the video; tapping the icon again closes it */
    const PP=['pp-ctl','pp-rx','pl-on','cm-on'];
    const pp=k=>{const on=!box.classList.contains(k);PP.forEach(c=>box.classList.remove(c));if(on)box.classList.add(k);box.classList.toggle('side-on',box.classList.contains('cm-on')||box.classList.contains('pl-on'));
      clearInterval(cT);if(k==='cm-on'&&on){loadC();cT=setInterval(loadC,5000);}if(box.classList.contains('rot'))showUi();};
    cmB.onclick=()=>pp('cm-on');ctlB.onclick=()=>pp('pp-ctl');rxB.onclick=()=>pp('pp-rx');
    const postC=async(txt)=>{const t=(typeof txt==='string'?txt:cIn.value).trim();const v=S.q[S.i];if(!t||!o.comments||!v)return;try{await o.comments.post(v.id,t);if(typeof txt!=='string')cIn.value='';seen[v.id]=(cnt[v.id]||0)+1;cnt[v.id]=seen[v.id];badge();cIn.blur();PP.forEach(c=>box.classList.remove(c));box.classList.remove('side-on');clearInterval(cT);undodge();send({k:'cm',v:v.id});}catch(e){}};
    cSend.onclick=()=>postC();cIn.addEventListener('keydown',e=>{if(e.key==='Enter')postC();});
    /* typing needs the phone keyboard, which cannot share a sideways full screen. So "Write a comment" leaves full screen and
       puts the video in the top corner, with the comment box right under it, so the keyboard never covers the picture. */
    function typingMode(){if(box.classList.contains('rot')){rot.onclick();}PP.forEach(c=>box.classList.remove(c));box.classList.add('cm-on');loadC();clearInterval(cT);cT=setInterval(loadC,5000);setTimeout(()=>cIn.focus(),120);}
    /* the window keeps its size; if the keyboard would cover it, it just slides up out of the way */
    const vv=window.visualViewport;let savedTop=null;
    function dodge(){if(!alive||box.classList.contains('rot'))return;const lim=(vv?vv.height:innerHeight)-8,r=box.getBoundingClientRect();if(r.bottom>lim){const hr=o.host.getBoundingClientRect();if(savedTop===null)savedTop=box.style.top;box.style.top=Math.max(0,r.top-hr.top-(r.bottom-lim))+'px';}}
    function undodge(){if(savedTop!==null){box.style.top=savedTop;savedTop=null;}}
    if(vv)vv.addEventListener('resize',()=>{if(document.activeElement===cIn)dodge();else undodge();});
    cWrite.onclick=()=>{typingMode();};
    cIn.addEventListener('focus',()=>{setTimeout(dodge,350);});
    cIn.addEventListener('blur',()=>{setTimeout(()=>{if(document.activeElement!==cIn)undodge();},250);});

    /* draggable by its title bar (not while expanded or rotated) */
    (function(){const bar=box.querySelector('.tv-bar');let st=null;
      bar.addEventListener('pointerdown',e=>{if(e.target.closest('button')||box.classList.contains('rot'))return;const r=box.getBoundingClientRect(),hr=o.host.getBoundingClientRect();st={dx:e.clientX-r.left,dy:e.clientY-r.top,hr};bar.setPointerCapture(e.pointerId);e.preventDefault();});
      bar.addEventListener('pointermove',e=>{if(!st)return;const w=box.offsetWidth,hh=box.offsetHeight;let x=e.clientX-st.dx-st.hr.left,y=e.clientY-st.dy-st.hr.top;x=Math.max(0,Math.min(st.hr.width-w,x));y=Math.max(0,Math.min(st.hr.height-hh,y));box.style.left=x+'px';box.style.top=y+'px';});
      const end=()=>{st=null;};bar.addEventListener('pointerup',end);bar.addEventListener('pointercancel',end);})();

    function render(){
      const v=S.q[S.i];ttl.textContent=v?v.t:'TV';if((v&&v.id)!==shownVid){shownVid=v&&v.id;if(box.classList.contains('cm-on'))loadC();else if(typeof refreshCount==='function')setTimeout(refreshCount,300);if(typeof badge==='function')badge();}box.classList.toggle('empty',!v);box.classList.toggle('noctl',!!v&&v.k==='em');
      bPlay.replaceChildren(ic(S.play?'pause':'play'));bNext.disabled=S.i+1>=S.q.length;
      lst.replaceChildren(...(S.q.length?S.q.map((q,k)=>h('div',{class:'tv-li'+(k===S.i?' on':'')},
        h('button',{class:'tv-th','aria-label':'Play '+q.t,onclick:()=>playIndex(k)},(q.k==='yt'?h('img',{src:'https://i.ytimg.com/vi/'+q.u+'/default.jpg',alt:'',loading:'lazy',width:'64',height:'36'}):h('span',{class:'tv-gth'},'\u25b6')),h('span',null,(k===S.i?'▶ ':'')+q.t)),
        (o.isOwner||q.by===me)?h('button',{class:'tv-x','aria-label':'Remove from queue',onclick:()=>remove(k)},ic('close')):null)):[h('p',{class:'tv-none'},'The queue is empty. Paste a video link above.')]));
    }
    tick=setInterval(()=>{if(!ad||!ad.ctl||!alive)return;try{const d=ad.dur()||0,t=ad.time()||0;tm.textContent=fmt(t)+(d?' / '+fmt(d):'');if(!seeking&&d)rng.value=Math.round(t/d*1000);}catch(e){}},500);
    hb=setInterval(()=>{if(alive&&lead&&S.play&&S.q.length)send(snap());},8000);

    /* ----- channel ----- */
    if(typeof sb!=='undefined'&&sb.channel){
      ch=sb.channel('tv:'+o.roomId,{config:{broadcast:{self:false}}});
      ch.on('broadcast',{event:'tv'},onMsg);
      ch.subscribe(s=>{if(s==='SUBSCRIBED'){send({k:'hello'});}});
    }
    /* nobody answered: this person starts the TV with the video they tapped */
    setTimeout(()=>{if(!alive)return;if(!got){got=true;const t=o.title;S={q:[],i:0,play:true,pos:0};if(o.vid&&valid(o.vid)){S.q=[Object.assign({},o.vid,{t:t||o.vid.n||'Video',by:me})];apply({q:S.q,i:0,play:true,pos:0});lead=true;if(!t)titleOf(o.vid).then(x=>{if(S.q[0])S.q[0].t=x;render();});}}
      else if(o.vid&&valid(o.vid)&&!S.q.some(v=>v.id===o.vid.id))add(o.vid);},1400);
    render();

    const api={alive:true,
      addOrFocus(src){if(!src||!valid(src))return;if(!S.q.some(v=>v.id===src.id))add(src);else{const k=S.q.findIndex(v=>v.id===src.id);if(k!==S.i)playIndex(k);}},
      destroy(){if(!alive)return;alive=false;api.alive=false;clearInterval(tick);clearInterval(hb);clearInterval(cT);clearInterval(cI);clearTimeout(uiT);try{adP&&adP.p.then(a=>a.destroy()).catch(()=>{});}catch(e){}try{ch&&sb.removeChannel(ch);}catch(e){}box.remove();document.body.classList.remove('tv-rotated');try{document.fullscreenElement&&document.exitFullscreen();}catch(e){}delete cur[o.roomId];o.onClose&&o.onClose();}};
    cl.onclick=()=>api.destroy();
    cur[o.roomId]=api;return api;
  }
  return{open,parse,close:id=>cur[id]&&cur[id].destroy(),_state:()=>cur};
})();
