/* ---------- SAFARI: Lukks pages inside the phone; outside links open in your real browser ---------- */
const SAFARI_PAGES={
  about:{title:'About Lukks',body:['Lukks is where you showcase your style and discover other people\'s. Find your kinda style, share your lukks and see what everyone else is wearing.','The magazine crate in the room is full of Nigerian fashion to flip through, and your phone holds your Lukks, your shareable profile and your outfit receipts.']},
  privacy:{title:'Privacy',body:['We store the details you give us (account, profile, photos, lukks and messages) so the app can work across your devices.','Photos and magazine submissions are reviewed before they are shown to anyone. Your public profile only shows the sections you switch on, and prices stay hidden unless you choose to show them.','You can edit or delete what you add at any time. Ask us to delete your account by messaging the Lukks Team.']},
  help:{title:'Help',body:['Swipe up on the lock screen to unlock the phone. Press and hold an icon to rearrange the home screen.','Wallpapers, sound and notifications live in Account. Your public profile link lives in Lukks.','Need a hand? Message the Lukks Team in Messages.']}
};
defApp({id:'safari',name:'Safari',bg:'#fff',dock:true,glyph:()=>`<svg viewBox="0 0 60 60"><defs><linearGradient id="sfg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1da1ff"/><stop offset="1" stop-color="#0a5fe0"/></linearGradient></defs><rect width="60" height="60" fill="url(#sfg)"/><circle cx="30" cy="30" r="21" fill="#fff" opacity=".95"/><circle cx="30" cy="30" r="19" fill="none" stroke="#c9d3e2" stroke-width="1"/><path d="M38.500 21.500L33 33l-11.500 5.500L27 27z" fill="#ff3b30"/><path d="M38.500 21.500L33 33l-6-6z" fill="#fff" stroke="#c9d3e2" stroke-width=".4"/></svg>`,
mount(el,ctx,live){
  let hist=[{p:'home'}],idx=0,issues=null;
  const bar=h('div',{class:'saf-top'}),body=h('div',{class:'app-body'}),tools=h('div',{class:'saf-tools'});
  const url=h('input',{type:'search',class:'saf-url',placeholder:'Search Lukks or enter a website',enterkeyhint:'go','aria-label':'Address and search'});
  url.addEventListener('keydown',e=>{if(e.key==='Enter'){go(url.value);url.blur();}});
  const back=h('button',{class:'icon-btn','aria-label':'Back',onclick:()=>{if(idx>0){idx--;render();}}},icon('back')),fwd=h('button',{class:'icon-btn','aria-label':'Forward',onclick:()=>{if(idx<hist.length-1){idx++;render();}}},icon('chevR'));
  tools.append(back,fwd,h('button',{class:'icon-btn','aria-label':'Home page',onclick:()=>nav({p:'home'})},icon('home')),h('button',{class:'icon-btn','aria-label':'Share',onclick:share},icon('share')),h('button',{class:'icon-btn','aria-label':'Close',onclick:ctx.close},icon('close')));
  bar.append(url);el.append(bar,body,tools);
  const nav=pg=>{hist=hist.slice(0,idx+1);hist.push(pg);idx=hist.length-1;render();};
  function go(q){
    q=q.trim();if(!q)return;
    if(/^lukks:\/\//i.test(q)){const k=q.replace(/^lukks:\/\//i,'');if(SAFARI_PAGES[k]||['home','magazines'].includes(k))return nav({p:k});}
    if(/^https?:\/\//i.test(q)||(/^[^\s]+\.[a-z]{2,}(\/\S*)?$/i.test(q)&&!/\s/.test(q))){ext(/^https?:\/\//i.test(q)?q:'https://'+q);return;}
    nav({p:'search',q});
  }
  async function ext(u){
    const s=safeUrl(u);if(!s){toast('That address is not valid.','err');return;}
    const host=new URL(s).host;
    if(await confirmBox('Open '+host+'?','This opens in your web browser, outside Lukks.','Open')){window.open(s,'_blank','noopener,noreferrer');}
  }
  function share(){
    const pg=hist[idx];const t=pg.p==='issue'?'Lukks: '+pg.title:'Lukks';
    if(navigator.share)navigator.share({title:t,url:CFG.mainSite}).catch(()=>{});else copyText(CFG.mainSite).then(ok=>toast(ok?'Link copied':'Could not copy','ok'));
  }
  async function loadIssues(){
    if(issues)return issues;
    try{const r=await sb.from('magazine_issues').select('*').eq('published',true).order('issue_no');if(r.error)throw r.error;issues=r.data||[];}catch(e){issues=null;}
    if(!issues||!issues.length){issues=[];CRATES.forEach((c,ci)=>crateMags(ci).forEach((m,mi)=>issues.push({id:ci+'-'+mi,title:m.title,crate:c.name,issue_no:ci*7+mi+1})));}
    return issues;
  }
  const favs=[['Magazines','magazines','#6b1a2b'],['Events',null,'#d9a441','calendar'],['Advertise',null,'#14284b','ads'],['Testimonials',null,'#2a6f5c','notes',{section:'testimonials'}],['About','about','#c8372d'],['Privacy','privacy','#3d2c5e'],['Help','help','#2f5d4e'],['Lukks site','EXT','#2a1710']];
  async function render(){
    back.disabled=idx===0;fwd.disabled=idx>=hist.length-1;
    const pg=hist[idx];url.value=pg.p==='home'?'':'lukks://'+(pg.p==='issue'?'issue/'+pg.id:pg.p==='search'?'search?q='+pg.q:pg.p);
    body.scrollTop=0;body.replaceChildren();
    if(pg.p==='home'){
      body.append(h('div',{class:'saf-home'},h('h3',null,'Favourites'),h('div',{class:'saf-favs'},favs.map(f=>h('button',{class:'saf-fav',onclick:()=>{if(f[1]==='EXT')ext(CFG.mainSite);else if(f[1])nav({p:f[1]});else ctx.open(f[3],f[4]);}},h('span',{style:{background:f[2]}},f[0][0]),f[0])))));
      return;
    }
    if(SAFARI_PAGES[pg.p]){const P=SAFARI_PAGES[pg.p];body.append(h('article',{class:'saf-page'},h('h1',null,P.title),P.body.map(t=>h('p',null,t))));return;}
    if(pg.p==='magazines'){
      body.append(spinner());const list=await loadIssues();body.replaceChildren();
      const wrap=h('div',{class:'saf-page'},h('h1',null,'Magazines'));
      const by={};list.forEach(i=>(by[i.crate]=by[i.crate]||[]).push(i));
      Object.keys(by).forEach(c=>{wrap.append(h('h3',null,c));const row=h('div',{class:'saf-row'});by[c].forEach(i=>{const [ci,mi]=String(i.id).split('-').map(Number);const src=!isNaN(ci)&&!isNaN(mi)?issueCover(mi,ci,200):null;row.append(h('button',{class:'saf-mag',onclick:()=>nav({p:'issue',id:i.id,title:i.title,crate:i.crate,no:i.issue_no})},src?h('img',{src,alt:''}):h('span',{class:'saf-nocover'},i.title),h('b',null,i.title),h('em',null,'No. '+i.issue_no)));});wrap.append(row);});
      body.append(wrap);return;
    }
    if(pg.p==='issue'){
      const [ci,mi]=String(pg.id).split('-').map(Number);const src=!isNaN(ci)?issueCover(mi,ci,360):null;
      body.append(h('article',{class:'saf-page'},src&&h('img',{src,alt:pg.title+' cover',class:'saf-cover'}),h('h1',null,pg.title),h('p',{class:'muted'},pg.crate+' · No. '+pg.no),
        h('p',null,'Open this issue in the magazine crate to flip through the pages and tap any outfit.'),
        h('button',{class:'btn primary block',onclick:()=>{Phone.exit();setTimeout(()=>{if(typeof goIssue==='function')goIssue(pg.id);},500);}},'Read in the crate')));return;
    }
    if(pg.p==='search'){
      const list=await loadIssues();const q=pg.q.toLowerCase();
      const pages=Object.keys(SAFARI_PAGES).filter(k=>(SAFARI_PAGES[k].title+SAFARI_PAGES[k].body.join(' ')).toLowerCase().includes(q)).map(k=>({t:SAFARI_PAGES[k].title,go:()=>nav({p:k})}));
      const mags=list.filter(i=>(i.title+' '+i.crate).toLowerCase().includes(q)).map(i=>({t:i.title+' · '+i.crate,go:()=>nav({p:'issue',id:i.id,title:i.title,crate:i.crate,no:i.issue_no})}));
      const all=[...mags,...pages];
      body.append(h('div',{class:'saf-page'},h('h1',null,'Results for “'+pg.q+'”'),all.length?h('div',{class:'group',style:{margin:0}},all.map(r=>h('button',{class:'item',onclick:r.go},h('span',{class:'grow'},r.t),h('span',{class:'chev'},icon('chevR'))))):h('p',{class:'muted'},'Nothing found. To open a website, type its address, like example.com.')));
    }
  }
  live(render);render();
}});
