/* ---------- OpenWalls advertising: delivery, tracking, advertiser dashboard, analytics ----------
   Everything an ad shows comes from the database (ow_ads_serve). Nothing is hardcoded.
   Permissions are enforced in Postgres (RPCs + RLS), not in this file. */
const OWAds=(()=>{
  const PL={discover:['Discover banner','Top of the Discover page'],wall:['Sponsored wall post','Pinned among rooms on the Main Wall'],search:['Sponsored search','Shown when people search for your topic']};
  const url_=p=>p?publicUrl('room-images',p):null;
  const okUrl=u=>/^https:\/\/[^\s]+$/.test(u||'');
  const mem='m'+Math.random().toString(36).slice(2,12);
  const visitor=()=>{try{let k=localStorage.getItem('ow_adv');if(!k||k.length<8){k='v'+(crypto.randomUUID?crypto.randomUUID().replace(/-/g,''):Math.random().toString(36).slice(2)+Date.now().toString(36));localStorage.setItem('ow_adv',k);}return k.slice(0,64);}catch(e){return mem;}};
  let cfgP=null;const cfg=()=>cfgP||(cfgP=sb.rpc('ad_config').then(r=>r.data||{}).catch(()=>({})));
  const timers=[],obs=[];
  const stop=()=>{timers.splice(0).forEach(clearInterval);obs.splice(0).forEach(o=>o.disconnect());};
  async function serve(placement,q,n,exclude){try{const r=await sb.rpc('ow_ads_serve',{p_placement:placement,p_q:q||null,p_n:n||1,p_exclude:exclude||[]});return Array.isArray(r.data)?r.data:[];}catch(e){return[];}}
  const send=(id,kind,placement)=>{try{sb.rpc('ow_ad_event',{p_id:id,p_kind:kind,p_placement:placement,p_visitor:visitor()}).then(()=>{},()=>{});}catch(e){}};

  /* an impression counts only when at least half of the ad is on screen for one second, once per page view */
  const seen=new Set();
  function watch(el,ad,placement,vid){
    const key=ad.id+placement;let t=null;
    if(!('IntersectionObserver' in window))return;
    const io=new IntersectionObserver(es=>es.forEach(e=>{
      const on=e.isIntersecting&&e.intersectionRatio>=.5&&!document.hidden;
      if(vid){try{on?vid.play().catch(()=>{}):vid.pause();}catch(x){}}
      if(on&&!seen.has(key)&&!t){t=setTimeout(()=>{t=null;if(seen.has(key))return;seen.add(key);send(ad.id,'imp',placement);},1000);}
      if(!on&&t){clearTimeout(t);t=null;}
    }),{threshold:[0,.5,.75]});
    io.observe(el);obs.push(io);
  }
  function link(ad,placement,cls,kids){
    const a=h('a',{class:cls,href:okUrl(ad.url)?ad.url:'#',target:'_blank',rel:'sponsored noopener noreferrer'},...kids);
    a.addEventListener('click',()=>send(ad.id,'click',placement));
    return a;
  }
  /* artwork: a still image, or a silent looping video (never any sound) */
  function art(ad,cls){
    if(ad.video_url&&okUrl(ad.video_url)){const v=h('video',{class:cls,muted:'',loop:'',playsinline:'',preload:'metadata','aria-label':ad.headline});v.muted=true;v.setAttribute('muted','');v.setAttribute('playsinline','');v.src=ad.video_url;if(ad.image_path)v.poster=url_(ad.image_path);return v;}
    if(ad.image_path)return h('img',{class:cls,src:url_(ad.image_path),alt:ad.headline,loading:'lazy'});
    return h('div',{class:cls+' ph'},ad.headline);
  }
  const tag=()=>h('span',{class:'ad-tag'},'Sponsored');
  const logo=ad=>ad.logo_path?h('img',{class:'ad-logo',src:url_(ad.logo_path),alt:ad.business,loading:'lazy'}):h('span',{class:'ad-logo mono'},(ad.business||'?').trim().charAt(0).toUpperCase());

  /* ---- Discover banner (rotates when several campaigns are live) ---- */
  function bannerCard(ad,placement,live){
    const m=art(ad,'ad-art'),card=link(ad,placement,'ad-banner',[m,h('div',{class:'ad-shade'}),tag(),h('div',{class:'ad-txt'},h('div',{class:'ad-by'},logo(ad),h('span',null,ad.business)),h('h3',null,ad.headline),ad.body?h('p',null,ad.body):null,h('span',{class:'ad-cta'},ad.cta||'Learn more'))]);
    if(live)watch(card,ad,placement,m.tagName==='VIDEO'?m:null);
    return card;
  }
  async function banner(host,q){
    host.replaceChildren();
    const ads=await serve('discover',q,3);
    if(!ads.length)return;
    const wrap=h('div',{class:'ad-wrap'});host.append(wrap);
    let i=0;const show=()=>{wrap.replaceChildren(bannerCard(ads[i%ads.length],'discover',true),ads.length>1?h('div',{class:'ad-dots'},ads.map((_,k)=>h('i',{class:k===i%ads.length?'on':''}))):null);};
    show();
    if(ads.length>1)timers.push(setInterval(()=>{if(!document.hidden&&host.isConnected){i++;show();}},9000));
  }

  /* ---- sponsored wall post: same framed, pinned, tilted piece as a room ---- */
  function wallPiece(ad){
    const m=art(ad,'pshot'),fr=link(ad,'wall','pframe',[m,tag()]);
    const el=h('div',{class:'piece ad-piece'},fr,h('div',{class:'plaque'},logo(ad),h('div',{class:'who'},h('b',null,ad.headline),h('span',{class:'s'},ad.body||ad.business)),h('span',{class:'visit'},ad.cta||'Learn more')));
    el.querySelector('.plaque .visit').addEventListener('click',()=>{window.open(ad.url,'_blank','noopener,noreferrer');send(ad.id,'click','wall');});
    watch(el,ad,'wall',m.tagName==='VIDEO'?m:null);
    return el;
  }

  /* ---- sponsored search result ---- */
  function searchRow(ad){
    const row=link(ad,'search','ad-sr',[h('span',{class:'ad-srth'},art(ad,'ad-srimg')),h('span',{class:'ad-srt'},h('span',{class:'ad-by'},tag(),h('span',null,ad.business)),h('b',null,ad.headline),ad.body?h('span',{class:'s'},ad.body):null),h('span',{class:'ad-cta sm'},ad.cta||'Learn more')]);
    watch(row,ad,'search',null);return row;
  }
  async function searchBlock(q){
    const c=await cfg(),n=Math.max(1,Math.min(3,+c.search_max||2));
    const ads=await serve('search',q,n);
    if(!ads.length)return null;
    return h('div',{class:'ad-sres'},ads.map(searchRow));
  }

  /* ================= advertiser side ================= */
  const fmtD=d=>new Date(d+'T00:00:00').toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'});
  const STATE={draft:['Awaiting payment','warn'],pending:['In review','warn'],approved:['Live','ok'],paused:['Paused','mute'],rejected:['Not approved','bad'],archived:['Archived','mute']};
  function phase(c){
    const t=c.today;
    if(c.status==='archived')return'archived';
    if(c.status==='approved'||c.status==='paused'){if(c.end_date<t)return'completed';return'active';}
    return'pending';
  }
  const label=c=>{const p=phase(c);if(p==='completed')return['Completed','mute'];if(c.status==='approved'&&c.start_date>c.today)return['Scheduled','ok'];return STATE[c.status]||[c.status,'mute'];};
  const ctr=(t)=>t.imp>0?((t.clicks/t.imp)*100).toFixed(1)+'%':'0%';
  const price=async()=>{const c=await cfg();return +c.price_kobo_per_week||3000000;};
  const weeksOf=(s,e)=>Math.ceil(((new Date(e)-new Date(s))/864e5+1)/7);

  async function pay(c,btn){
    await guard(btn,async()=>{
      const r=await sb.functions.invoke('ad-pay',{body:{action:'init',campaign_id:c.id,callback_url:CFG.site+'?adpay=1'}});
      let d=r.data;if(r.error&&r.error.context&&r.error.context.json){try{d=await r.error.context.json();}catch(e){}}
      if(!d||!d.authorization_url){toast((d&&d.message)||'Payment could not be started.','err');return;}
      location.href=d.authorization_url;
    });
  }
  async function checkReturn(){
    const p=new URLSearchParams(location.search),ref=p.get('reference')||p.get('trxref');
    if(!ref||!/^OWAD-/.test(ref))return false;
    history.replaceState(null,'',location.pathname+'#/ads');
    try{const r=await sb.functions.invoke('ad-pay',{body:{action:'verify',reference:ref}});let d=r.data;if(r.error&&r.error.context&&r.error.context.json){try{d=await r.error.context.json();}catch(e){}}
      toast(d&&d.paid?'Payment received. Your campaign is now in review.':((d&&d.message)||'We could not confirm that payment yet.'),d&&d.paid?'':'err');}catch(e){toast('We could not confirm that payment yet.','err');}
    return true;
  }

  async function upload(file,max){const p=await prepareImage(file,{max,quality:.85,maxMB:12});return uploadFile('room-images',p.blob,'jpg','image/jpeg');}

  function formSheet(c,done){
    const edit=!!c,paid=edit&&c.pay_status==='paid';
    const tomorrow=new Date(Date.now()+36e5);const iso=d=>d.toISOString().slice(0,10);
    const S=Object.assign({name:'',business:'',headline:'',body:'',cta:'Learn more',url:'https://',video_url:'',image_path:'',logo_path:'',placements:['discover','wall'],keywords:[],start_date:iso(tomorrow),end_date:iso(new Date(tomorrow.getTime()+6*864e5))},c||{});
    sheet(edit?'Edit campaign':'New campaign',(body,close)=>{
      const I=(k,o)=>{const i=h(o&&o.area?'textarea':'input',Object.assign({value:S[k]||''},o||{}));i.value=S[k]||'';i.addEventListener('input',()=>{S[k]=i.value;prev();});return i;};
      const cost=h('div',{class:'ad-cost'}),pv=h('div',{class:'ad-prev'});
      const prev=async()=>{
        if(!S.headline&&!S.image_path&&!S.video_url){pv.replaceChildren();}
        else{const a=document.createElement('div');a.append(bannerCard({id:'x',business:S.business||'Your business',logo_path:S.logo_path,image_path:S.image_path,video_url:okUrl(S.video_url)?S.video_url:'',headline:S.headline||'Your headline',body:S.body,cta:S.cta,url:'#'},'discover',false));a.firstChild.removeAttribute('href');a.firstChild.onclick=e=>e.preventDefault();pv.replaceChildren(h('div',{class:'f-label'},'Preview'),a.firstChild);}
        const p=await price(),wk=S.end_date>=S.start_date?weeksOf(S.start_date,S.end_date):0;
        cost.textContent=paid?'Paid '+fmtKobo(c.amount_kobo)+'. Dates are locked once paid.':(wk?wk+(wk===1?' week':' weeks')+' · '+fmtKobo(wk*p)+' (all chosen placements)':'Choose valid dates');
      };
      const up=(k,max,lab)=>{const b=h('button',{class:'btn small',type:'button'},S[k]?'Change '+lab:'Add '+lab),st=h('span',{class:'f-hint'},S[k]?'Added':'');
        b.onclick=async()=>{const f=await pickFile('image/jpeg,image/png,image/webp');if(!f)return;await guard(b,async()=>{S[k]=await upload(f,max);b.textContent='Change '+lab;st.textContent='Added';prev();});};
        return h('div',{class:'ad-up'},b,st);};
      const pls=h('div',{class:'ad-pls'});
      const drawPl=async()=>{const c0=await cfg(),av=c0.placements||{};pls.replaceChildren(...Object.keys(PL).map(k=>{const off=av[k]===false,on=S.placements.includes(k)&&!off;return h('button',{type:'button',class:'ad-pl'+(on?' on':''),disabled:off?'':null,onclick:()=>{S.placements=on?S.placements.filter(x=>x!==k):[...S.placements,k];drawPl();}},h('b',null,PL[k][0]),h('span',null,off?'Not available right now':PL[k][1]));}));};
      const kw=I('kw',{placeholder:'e.g. fashion, football, music'});kw.value=(S.keywords||[]).join(', ');kw.oninput=()=>{S.keywords=kw.value.split(',').map(x=>x.trim().toLowerCase()).filter(x=>x.length>1).slice(0,8);};
      const sd=h('input',{type:'date',value:S.start_date,disabled:paid?'':null}),ed=h('input',{type:'date',value:S.end_date,disabled:paid?'':null});
      sd.onchange=()=>{S.start_date=sd.value;prev();};ed.onchange=()=>{S.end_date=ed.value;prev();};
      const save=h('button',{class:'btn coral block',style:{marginTop:'14px'}},edit?'Save changes':'Save campaign');
      save.onclick=()=>guard(save,async()=>{
        const r=await sb.rpc('ad_save',{p:{id:c&&c.id||null,name:S.name,business:S.business,headline:S.headline,body:S.body,cta:S.cta,url:S.url,video_url:S.video_url,image_path:S.image_path,logo_path:S.logo_path,placements:S.placements,keywords:S.keywords,start_date:S.start_date,end_date:S.end_date}});
        if(r.error)throw r.error;close();toast(edit?'Saved':'Campaign saved. Pay to send it for review.');done&&done(r.data);});
      body.append(
        h('p',{class:'f-hint',style:{margin:'0 0 10px'}},'Every campaign is reviewed by OpenWalls before it goes live.'),
        field('Campaign name',I('name',{maxlength:'80',placeholder:'Only you see this'})),
        field('Business or brand name',I('business',{maxlength:'80'})),
        h('div',{class:'ad-row'},up('logo_path',256,'logo'),up('image_path',1200,'artwork')),
        field('Video (optional)',I('video_url',{type:'url',placeholder:'https://…/clip.mp4'}),'A direct https link to an .mp4 or .webm. It plays silently on a loop.'),
        field('Headline',I('headline',{maxlength:'60'})),
        field('Short description',I('body',{area:1,maxlength:'140',rows:'2'}),'Up to 140 characters'),
        field('Button text',I('cta',{maxlength:'20'})),
        field('Destination link',I('url',{type:'url',placeholder:'https://yourwebsite.com'})),
        h('div',{class:'f-label',style:{margin:'12px 0 6px'}},'Where should it appear?'),pls,
        field('Interests (comma separated)',kw,'Used to match searches such as football or fashion.'),
        h('div',{class:'ad-row'},field('Starts',sd),field('Ends',ed)),
        cost,pv,save);
      drawPl();prev();
    });
  }

  function statSheet(c){
    sheet('Analytics',(body)=>{
      body.append(spinner());
      sb.rpc('ad_stats',{p_id:c.id}).then(r=>{
        if(r.error){body.replaceChildren(empty('Could not load analytics',friendlyError(r.error)));return;}
        const s=r.data,days=s.days||[],mx=Math.max(1,...days.map(d=>d.imp)),left=Math.max(0,Math.round((new Date(s.end_date)-new Date(s.today))/864e5));
        const card=(k,v,n)=>h('div',{class:'ad-st'},h('span',null,k),h('b',null,String(v)),n?h('i',null,n):null);
        const st=label({status:s.status,end_date:s.end_date,start_date:s.start_date,today:s.today});
        body.replaceChildren(
          h('h4',{style:{margin:'0 0 10px'}},c.name||c.headline),
          h('div',{class:'ad-sts'},card('Impressions',s.imp),card('Unique viewers',s.uimp),card('Clicks',s.clicks),card('Click-through rate',s.ctr+'%'),card('Campaign visits',s.uclicks,'people who opened your link'),card('Status',st[0],fmtD(s.start_date)+' to '+fmtD(s.end_date))),
          h('div',{class:'f-hint',style:{margin:'4px 0 10px'}},s.duration_days+' day'+(s.duration_days===1?'':'s')+' in total'+(s.end_date>=s.today?' · '+left+' left':'')),
          h('div',{class:'f-label'},'Daily impressions and clicks'),
          days.length?h('div',{class:'ad-chart'},days.slice(-30).map(d=>h('div',{class:'ad-bar',title:fmtD(d.d.slice(0,10))+': '+d.imp+' impressions, '+d.clk+' clicks'},h('i',{style:{height:Math.max(3,d.imp/mx*100)+'%'}}),h('u',{style:{height:Math.min(100,d.clk/mx*100)+'%'}})))):h('p',{class:'f-hint'},'Nothing to show yet.'),
          h('div',{class:'ad-leg'},h('span',null,h('i',{class:'a'}),'Impressions'),h('span',null,h('i',{class:'b'}),'Clicks')),
          (s.by_placement||[]).length?h('div',{class:'list',style:{marginTop:'12px'}},s.by_placement.map(p=>h('div',{class:'ad-pr'},h('span',{class:'grow'},(PL[p.p]||[p.p])[0]),h('b',null,p.imp+' views · '+p.clk+' clicks')))):null,
          h('p',{class:'f-hint'},'An impression is counted when at least half of your ad is on screen for one second, once per person per hour. Your own views are not counted.'));
      });
    });
  }

  async function dashboard(v){
    v.replaceChildren(h('div',{class:'pg-head'},h('div',{class:'brand'},h('button',{class:'rbtn',style:{position:'static',marginRight:'8px'},'aria-label':'Back',onclick:()=>{location.hash='#/me';}},icon('back')),h('b',null,'Advertise')),h('p',{class:'tag'},'Promote your brand on OpenWalls.')),h('div',{style:{padding:'0 16px'}},spinner()));
    await checkReturn();
    const [r,p]=await Promise.all([sb.rpc('ad_list_mine'),price()]);
    let tab='active';const box=h('div',{class:'ad-dash'}),list=h('div');
    const reload=()=>dashboard(v);
    const draw=()=>{
      const cs=(r.data||[]),by={active:[],pending:[],completed:[],archived:[]};cs.forEach(c=>by[phase(c)].push(c));
      tabs.replaceChildren(...[['active','Active'],['pending','Pending'],['completed','Completed'],['archived','Archived']].map(([k,l])=>h('button',{class:'chip'+(tab===k?' on':''),onclick:()=>{tab=k;draw();}},l+(by[k].length?' ('+by[k].length+')':''))));
      list.replaceChildren(...(by[tab].length?by[tab].map(card):[empty('Nothing here yet',tab==='active'?'Approved campaigns that are running appear here.':tab==='pending'?'Campaigns waiting for payment or review appear here.':'')]));
    };
    const tabs=h('div',{class:'scrollx',style:{padding:'0 0 10px'}});
    const act=(label,fn,cls)=>{const b=h('button',{class:'btn small '+(cls||'')},label);b.onclick=()=>guard(b,async()=>{await fn();});return b;};
    const rpcSet=async(id,a)=>{const x=await sb.rpc('ad_owner_set',{p_id:id,p_action:a});if(x.error)throw x.error;await reload();};
    const card=c=>{const st=label(c),t=c.totals||{imp:0,clicks:0},ph=phase(c);
      return h('div',{class:'ad-c'},h('div',{class:'ad-ch'},h('b',null,c.name),h('span',{class:'ad-chip '+st[1]},st[0])),
        h('div',{class:'f-hint'},c.business+' · '+fmtD(c.start_date)+' to '+fmtD(c.end_date)+' · '+fmtKobo(c.amount_kobo)),
        h('div',{class:'f-hint'},c.placements.map(k=>PL[k][0]).join(' · ')),
        c.status==='rejected'&&c.admin_note?h('div',{class:'ad-note'},'Reviewer note: '+c.admin_note):null,
        c.admin_hold&&c.status==='paused'&&c.admin_note?h('div',{class:'ad-note'},'Paused by OpenWalls: '+c.admin_note):null,
        h('div',{class:'ad-mini'},h('span',null,h('b',null,t.imp),' views'),h('span',null,h('b',null,t.clicks),' clicks'),h('span',null,h('b',null,ctr(t)),' CTR')),
        h('div',{class:'ad-acts'},
          h('button',{class:'btn small',onclick:()=>statSheet(c)},'Analytics'),
          c.pay_status!=='paid'&&c.status!=='archived'?act('Pay '+fmtKobo(c.amount_kobo),()=>pay(c,null),'coral'):null,
          ph!=='completed'&&ph!=='archived'?h('button',{class:'btn small',onclick:()=>formSheet(c,reload)},'Edit'):null,
          c.status==='approved'&&ph==='active'?act('Pause',()=>rpcSet(c.id,'pause')):null,
          c.status==='paused'&&!c.admin_hold&&ph==='active'?act('Resume',()=>rpcSet(c.id,'resume')):null,
          c.pay_status!=='paid'?act('Delete',()=>rpcSet(c.id,'delete')):(c.status!=='archived'?act('Archive',()=>rpcSet(c.id,'archive')):null)));};
    box.append(h('div',{class:'ad-hero'},h('b',null,fmtKobo(p)+' per week'),h('span',null,'One price covers every placement you choose: the Discover banner, sponsored wall posts and sponsored search. Pay securely with Paystack. New campaigns go live after review.')),
      h('button',{class:'btn coral block',onclick:()=>formSheet(null,reload)},'New campaign'),h('div',{style:{height:'12px'}}),tabs,list);
    v.replaceChildren(v.firstChild,h('div',{style:{padding:'0 16px 110px'}},r.error?empty('Could not load campaigns',friendlyError(r.error)):box));
    if(!r.error)draw();
  }

  /* ================= admin side ================= */
  async function adminPanel(main,dlg){
    main.replaceChildren(h('h1',null,'OpenWalls ads'));const box=h('div',{class:'tbl'});main.append(box);box.append(spinner());
    const [r,c]=await Promise.all([sb.rpc('ad_admin_list'),sb.rpc('ad_config')]);
    if(r.error){box.replaceChildren(h('p',{class:'err-t'},friendlyError(r.error)));return;}
    const conf=c.data||{},reload=()=>adminPanel(main,dlg);
    const setv=async(k,v)=>{const x=await sb.rpc('ad_admin_setting',{p_key:k,p_value:v});if(x.error)throw x.error;await reload();};
    const pl=conf.placements||{};
    const settings=h('div',{class:'ad-set'},h('b',null,'Settings'),
      h('div',{class:'ad-row'},...Object.keys(PL).map(k=>h('label',{class:'ad-chk'},h('input',{type:'checkbox',checked:pl[k]!==false?'':null,onchange:e=>guard(null,()=>setv('placements',Object.assign({},pl,{[k]:e.target.checked})))}),PL[k][0]))),
      h('div',{class:'ad-row'},...[['price_kobo_per_week','Price per week (₦)',100],['wall_every','Wall: one ad every N rooms',1],['wall_max','Wall: max ads per visit',1],['search_max','Search: max sponsored results',1]].map(([k,l,div])=>{const i=h('input',{type:'number',min:'1',value:String((+conf[k]||0)/div)});const b=h('button',{class:'btn small'},'Save');b.onclick=()=>guard(b,()=>setv(k,Math.round(+i.value*div)));return h('label',{class:'field'},h('span',{class:'f-label'},l),h('div',{style:{display:'flex',gap:'6px'}},i,b));})));
    const ask=async(title)=>{const t=h('textarea',{placeholder:'Note for the advertiser (optional)',maxlength:'300'});const ok=await dlg({title,body:t,actions:[{label:'Cancel',value:false},{label:'Confirm',value:true,primary:true}]});return ok?t.value.trim():null;};
    const set=(id,a,note)=>guard(null,async()=>{const x=await sb.rpc('ad_admin_set',{p_id:id,p_action:a,p_note:note||null});if(x.error)throw x.error;await reload();});
    const row=c=>{const st=label(c),o=c.owner||{},t=c.totals||{imp:0,clicks:0},prevEl=document.createElement('div');
      prevEl.append(bannerCard({id:c.id,business:c.business,logo_path:c.logo_path,image_path:c.image_path,video_url:c.video_url,headline:c.headline,body:c.body,cta:c.cta,url:'#'},'discover',false));prevEl.firstChild.removeAttribute('href');prevEl.firstChild.onclick=e=>e.preventDefault();
      const b=(l,fn,cls)=>h('button',{class:'btn small '+(cls||''),onclick:fn},l);
      return h('div',{class:'ad-arow'},h('div',{class:'ad-aprev'},prevEl.firstChild),
        h('div',{class:'ad-ainfo'},h('b',null,c.name+' · '+c.business),h('span',{class:'ad-chip '+st[1]},st[0]+(c.admin_hold?' (held)':'')),
          h('div',{class:'small-t'},'Advertiser: '+(o.name||o.username||'?')+(o.username?' (@'+o.username+')':'')+' · '+(o.email||'')),
          h('div',{class:'small-t'},c.placements.map(k=>PL[k][0]).join(', ')+' · '+fmtD(c.start_date)+' to '+fmtD(c.end_date)),
          h('div',{class:'small-t'},fmtKobo(c.amount_kobo)+' · payment: '+c.pay_status+(c.paystack_reference?' · '+c.paystack_reference:'')),
          h('div',{class:'small-t'},'Destination: ',h('a',{href:c.url,target:'_blank',rel:'noopener noreferrer'},c.url)),
          h('div',{class:'small-t'},t.imp+' views · '+t.uimp+' unique · '+t.clicks+' clicks · CTR '+ctr(t)),
          c.admin_note?h('div',{class:'small-t'},'Note: '+c.admin_note):null,
          h('div',{class:'acts'},
            c.pay_status==='paid'&&(c.status==='pending'||c.status==='rejected')?b('Approve',()=>set(c.id,'approve'),'primary'):null,
            c.status==='pending'?b('Reject',async()=>{const n=await ask('Reject this campaign');if(n!==null)set(c.id,'reject',n);}):null,
            c.status==='approved'?b('Pause',async()=>{const n=await ask('Pause this campaign');if(n!==null)set(c.id,'hold',n);}):null,
            c.status==='paused'&&c.admin_hold?b('Resume',()=>set(c.id,'release')):null,
            c.status!=='archived'?b('Remove',async()=>{const n=await ask('Remove this advertisement');if(n!==null)set(c.id,'remove',n);},'danger'):null,
            c.pay_status!=='paid'&&c.status!=='archived'?b('Mark as paid (offline)',()=>{if(confirm('Only do this after the money has actually arrived. Continue?'))set(c.id,'mark_paid');}):null,
            b('Analytics',()=>statSheet(c)))));};
    box.replaceChildren(settings,h('div',{style:{height:'14px'}}),...(r.data.length?r.data.map(row):[h('p',null,'No campaigns yet.')]));
  }
  return{serve,banner,wallPiece,searchBlock,searchRow,dashboard,adminPanel,stop,cfg,checkReturn,formSheet,statSheet};
})();
