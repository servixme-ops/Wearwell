/* ---------- Room TV: a shared YouTube player ----------
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
  async function titleOf(id){
    try{const r=await fetch('https://www.youtube.com/oembed?format=json&url='+encodeURIComponent('https://youtu.be/'+id));if(r.ok){const j=await r.json();return j.title||id;}}catch(e){}return 'YouTube video';
  }

  function open(o){
    const old=cur[o.roomId];if(old&&old.alive){old.addOrFocus(o.vid,o.title);return old;}
    const me=o.uid||('g'+Math.random().toString(36).slice(2,8));
    let S={q:[],i:0,play:true,pos:0},player=null,ready=false,pending=null,loadedId=null,busyUntil=0,lead=false,alive=true,got=false,ch=null,hb=0,tick=0,lastRx=0,seeking=false;
    const busy=(ms)=>{busyUntil=Date.now()+(ms||900);};
    const isBusy=()=>Date.now()<busyUntil;
    const pos=()=>{try{return ready&&player.getCurrentTime?player.getCurrentTime():S.pos;}catch(e){return S.pos;}};

    /* ----- UI ----- */
    const ic=(n)=>icon(n);
    const bdg=h('i',{class:'tv-badge'}),cmB=h('button',{class:'tv-b tv-cm','aria-label':'Comments'},ic('chat'),bdg),rot=h('button',{class:'tv-b','aria-label':'Rotate to landscape'},ic('rotate')),ex=h('button',{class:'tv-b','aria-label':'Expand'},ic('expand')),cl=h('button',{class:'tv-b','aria-label':'Close TV'},ic('close'));
    const ttl=h('span',null,'TV');
    const slot=h('div',{id:'tv-yt-'+Math.random().toString(36).slice(2,7)});
    const fl=h('div',{class:'tv-float'});
    const tap=h('div',{class:'tv-tap'});
    const ping=h('div',{class:'tv-ping'});
    const screen=h('div',{class:'tv-screen'},slot,tap,fl,ping,h('div',{class:'tv-msg'}));
    const bPlay=h('button',{class:'tv-c big','aria-label':'Play or pause'},ic('play')),bBack=h('button',{class:'tv-c','aria-label':'Back 10 seconds'},h('b',null,'-10')),bFwd=h('button',{class:'tv-c','aria-label':'Forward 10 seconds'},h('b',null,'+10')),bNext=h('button',{class:'tv-c','aria-label':'Next video'},ic('next')),bList=h('button',{class:'tv-b','aria-label':'Playlist'},ic('list')),ctlB=h('button',{class:'tv-b tv-pb-ctl','aria-label':'Playback controls'},ic('play')),rxB=h('button',{class:'tv-b tv-pb-rx','aria-label':'Reactions'},'\u2764\ufe0f');
    const rng=h('input',{type:'range',min:'0',max:'1000',value:'0',class:'tv-rng','aria-label':'Seek'}),tm=h('span',{class:'tv-tm'},'0:00');
    const ctr=h('div',{class:'tv-ctr'},bBack,bPlay,bFwd,bNext);
    const seekRow=h('div',{class:'tv-seek'},rng,tm);
    const rx=h('div',{class:'tv-rx'},h('span',null,'Live reactions'),...EM.map(e=>h('button',{'aria-label':'React '+e,onclick:()=>react(e)},e)));
    const urlIn=h('input',{type:'url',placeholder:'Paste a YouTube link to queue',class:'tv-in'}),addB=h('button',{class:'tv-add'},'Add');
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
    function apply(s,quiet){
      S={q:s.q||[],i:Math.min(Math.max(0,s.i|0),Math.max(0,(s.q||[]).length-1)),play:!!s.play,pos:+s.pos||0};
      render();
      const v=S.q[S.i];if(!v){if(ready){busy();try{player.stopVideo();}catch(e){}}loadedId=null;return;}
      if(!ready){pending=s;return;}
      busy();
      try{
        if(v.id!==loadedId){loadedId=v.id;player.loadVideoById(v.id,S.pos||0);if(!S.play)setTimeout(()=>{busy();try{player.pauseVideo();}catch(e){}},700);}
        else{const d=Math.abs(player.getCurrentTime()-S.pos);if(s.seek||(S.play&&d>2.5)||(!S.play&&d>1))player.seekTo(S.pos,true);S.play?player.playVideo():player.pauseVideo();}
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
    const toggle=()=>{S.play=!S.play;busy();try{S.play?player.playVideo():player.pauseVideo();}catch(e){}render();announce();};
    const seekBy=d=>{const t=Math.max(0,pos()+d);S.pos=t;busy();try{player.seekTo(t,true);}catch(e){}announce(true);};
    const playIndex=i=>{if(i<0||i>=S.q.length)return;S.i=i;S.pos=0;S.play=true;apply({q:S.q,i,play:true,pos:0});announce(true);};
    const next=()=>{if(S.i+1<S.q.length)playIndex(S.i+1);else toast('That was the last video in the queue');};
    async function add(id){
      if(S.q.some(v=>v.id===id)){toast('Already in the queue');return;}
      const t=await titleOf(id);S.q=S.q.concat([{id,t,by:me}]);
      if(S.q.length===1){S.i=0;S.pos=0;S.play=true;apply({q:S.q,i:0,play:true,pos:0});}else render();
      announce();toast('Added to the TV queue','ok');
    }
    function remove(i){
      const was=i===S.i;S.q=S.q.filter((_,k)=>k!==i);
      if(i<S.i)S.i--;if(S.i>=S.q.length)S.i=Math.max(0,S.q.length-1);
      if(was)apply({q:S.q,i:S.i,play:S.play&&S.q.length>0,pos:0});else render();announce(was);
    }
    function fromInput(){
      const id=ytId(urlIn.value.trim());if(!id){toast('Paste a YouTube link','err');return;}
      urlIn.value='';add(id);
    }
    addB.onclick=fromInput;urlIn.addEventListener('keydown',e=>{if(e.key==='Enter')fromInput();});
    bPlay.onclick=toggle;bBack.onclick=()=>seekBy(-10);bFwd.onclick=()=>seekBy(10);bNext.onclick=next;
    bList.onclick=()=>pp('pl-on');
    rng.addEventListener('input',()=>{seeking=true;});
    rng.addEventListener('change',()=>{seeking=false;try{const d=player.getDuration()||0;if(d)seekBy(rng.value/1000*d-pos());}catch(e){}});
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
      const v=S.q[S.i];ttl.textContent=v?v.t:'TV';if((v&&v.id)!==shownVid){shownVid=v&&v.id;if(box.classList.contains('cm-on'))loadC();else if(typeof refreshCount==='function')setTimeout(refreshCount,300);if(typeof badge==='function')badge();}box.classList.toggle('empty',!v);
      bPlay.replaceChildren(ic(S.play?'pause':'play'));bNext.disabled=S.i+1>=S.q.length;
      lst.replaceChildren(...(S.q.length?S.q.map((q,k)=>h('div',{class:'tv-li'+(k===S.i?' on':'')},
        h('button',{class:'tv-th','aria-label':'Play '+q.t,onclick:()=>playIndex(k)},h('img',{src:'https://i.ytimg.com/vi/'+q.id+'/default.jpg',alt:'',loading:'lazy',width:'64',height:'36'}),h('span',null,(k===S.i?'▶ ':'')+q.t)),
        (o.isOwner||q.by===me)?h('button',{class:'tv-x','aria-label':'Remove from queue',onclick:()=>remove(k)},ic('close')):null)):[h('p',{class:'tv-none'},'The queue is empty. Paste a YouTube link above.')]));
    }
    tick=setInterval(()=>{if(!ready||!alive)return;try{const d=player.getDuration()||0,t=player.getCurrentTime()||0;tm.textContent=fmt(t)+(d?' / '+fmt(d):'');if(!seeking&&d)rng.value=Math.round(t/d*1000);}catch(e){}},500);
    hb=setInterval(()=>{if(alive&&lead&&S.play&&S.q.length)send(snap());},8000);

    /* ----- player ----- */
    loadYT().then(()=>{
      if(!alive)return;
      player=new YT.Player(slot.id,{host:'https://www.youtube-nocookie.com',width:'100%',height:'100%',playerVars:{controls:0,disablekb:1,fs:0,playsinline:1,rel:0,modestbranding:1,iv_load_policy:3,autoplay:1},events:{
        onReady:()=>{ready=true;if(pending){const p=pending;pending=null;apply(p);}},
        onStateChange:e=>{
          if(!alive||isBusy())return;
          if(e.data===1&&!S.play){S.play=true;render();announce();}
          else if(e.data===2&&S.play){S.play=false;render();announce();}
          else if(e.data===0){if(S.i+1<S.q.length){const i=S.i+1;S.i=i;apply({q:S.q,i,play:true,pos:0});}else{S.play=false;render();}}
        },
        onError:()=>{box.querySelector('.tv-msg').textContent='This video cannot be played here. Skipping…';setTimeout(()=>{box.querySelector('.tv-msg').textContent='';if(S.i+1<S.q.length)next();},1800);}}});
    }).catch(()=>{box.querySelector('.tv-msg').textContent='YouTube could not load. Check your connection.';});

    /* ----- channel ----- */
    if(typeof sb!=='undefined'&&sb.channel){
      ch=sb.channel('tv:'+o.roomId,{config:{broadcast:{self:false}}});
      ch.on('broadcast',{event:'tv'},onMsg);
      ch.subscribe(s=>{if(s==='SUBSCRIBED'){send({k:'hello'});}});
    }
    /* nobody answered: this person starts the TV with the video they tapped */
    setTimeout(()=>{if(!alive)return;if(!got){got=true;const t=o.title;S={q:[],i:0,play:true,pos:0};if(o.vid){S.q=[{id:o.vid,t:t||'YouTube video',by:me}];apply({q:S.q,i:0,play:true,pos:0});lead=true;if(!t)titleOf(o.vid).then(x=>{if(S.q[0])S.q[0].t=x;render();});}}
      else if(o.vid&&!S.q.some(v=>v.id===o.vid))add(o.vid);},1400);
    render();

    const api={alive:true,
      addOrFocus(id){if(!id)return;if(!S.q.some(v=>v.id===id))add(id);else{const k=S.q.findIndex(v=>v.id===id);if(k!==S.i)playIndex(k);}},
      destroy(){if(!alive)return;alive=false;api.alive=false;clearInterval(tick);clearInterval(hb);clearInterval(cT);clearInterval(cI);clearTimeout(uiT);try{player&&player.destroy();}catch(e){}try{ch&&sb.removeChannel(ch);}catch(e){}box.remove();document.body.classList.remove('tv-rotated');try{document.fullscreenElement&&document.exitFullscreen();}catch(e){}delete cur[o.roomId];o.onClose&&o.onClose();}};
    cl.onclick=()=>api.destroy();
    cur[o.roomId]=api;return api;
  }
  return{open,close:id=>cur[id]&&cur[id].destroy(),_state:()=>cur};
})();
