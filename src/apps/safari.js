/* ---------- SAFARI: Photo Dump pages inside the phone; outside links open in your real browser ---------- */
const SAFARI_PAGES={
  about:{title:'About Photo Dump',body:['Photo Dump is a roll of film made by everyone. Photos people add to Randoms show up as negatives on the film. Tap a frame to develop it in full colour.','Want to be on the roll? Add a photo from Camera or Photos. One photo at a time, saved to Randoms.']},
  privacy:{title:'Privacy',body:['We store the details you give us (account, profile and photos) so the app can work across your devices.','Photos you add to Randoms while signed in appear on the Photo Dump film with your username and caption. Photos added while signed out stay on your device. Your original photo is never changed.']},
  help:{title:'Help',body:['Swipe up on the lock screen to unlock the phone. Press and hold an icon to rearrange the home screen.','Wallpapers, sound and notifications live in Account. Your public profile and social handles live in Photo Dump under My profile.']}
};
defApp({id:'safari',name:'Safari',bg:'#fff',dock:true,glyph:()=>`<svg viewBox="0 0 60 60"><defs><linearGradient id="sfg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1da1ff"/><stop offset="1" stop-color="#0a5fe0"/></linearGradient></defs><rect width="60" height="60" fill="url(#sfg)"/><circle cx="30" cy="30" r="21" fill="#fff" opacity=".95"/><circle cx="30" cy="30" r="19" fill="none" stroke="#c9d3e2" stroke-width="1"/><path d="M38.500 21.500L33 33l-11.500 5.500L27 27z" fill="#ff3b30"/><path d="M38.500 21.500L33 33l-6-6z" fill="#fff" stroke="#c9d3e2" stroke-width=".4"/></svg>`,
mount(el,ctx,live){
  let hist=[{p:'home'}],idx=0;
  const bar=h('div',{class:'saf-top'}),body=h('div',{class:'app-body'}),tools=h('div',{class:'saf-tools'});
  const url=h('input',{type:'search',class:'saf-url',placeholder:'Search Photo Dump or enter a website',enterkeyhint:'go','aria-label':'Address and search'});
  url.addEventListener('keydown',e=>{if(e.key==='Enter'){go(url.value);url.blur();}});
  const back=h('button',{class:'icon-btn','aria-label':'Back',onclick:()=>{if(idx>0){idx--;render();}}},icon('back')),fwd=h('button',{class:'icon-btn','aria-label':'Forward',onclick:()=>{if(idx<hist.length-1){idx++;render();}}},icon('chevR'));
  tools.append(back,fwd,h('button',{class:'icon-btn','aria-label':'Home page',onclick:()=>nav({p:'home'})},icon('home')),h('button',{class:'icon-btn','aria-label':'Share',onclick:share},icon('share')),h('button',{class:'icon-btn','aria-label':'Close',onclick:ctx.close},icon('close')));
  bar.append(url);el.append(bar,body,tools);
  const nav=pg=>{hist=hist.slice(0,idx+1);hist.push(pg);idx=hist.length-1;render();};
  function go(q){
    q=q.trim();if(!q)return;
    if(/^(photodump|lukks):\/\//i.test(q)){const k=q.replace(/^(photodump|lukks):\/\//i,'');if(SAFARI_PAGES[k]||['home'].includes(k))return nav({p:k});}
    if(/^https?:\/\//i.test(q)||(/^[^\s]+\.[a-z]{2,}(\/\S*)?$/i.test(q)&&!/\s/.test(q))){ext(/^https?:\/\//i.test(q)?q:'https://'+q);return;}
    nav({p:'search',q});
  }
  async function ext(u){
    const s=safeUrl(u);if(!s){toast('That address is not valid.','err');return;}
    const host=new URL(s).host;
    if(await confirmBox('Open '+host+'?','This opens in your web browser, outside Photo Dump.','Open')){window.open(s,'_blank','noopener,noreferrer');}
  }
  function share(){
    const pg=hist[idx];const t='Photo Dump';
    if(navigator.share)navigator.share({title:t,url:CFG.mainSite}).catch(()=>{});else copyText(CFG.mainSite).then(ok=>toast(ok?'Link copied':'Could not copy','ok'));
  }
  const favs=[['Events',null,'#d9a441','calendar'],['Testimonials',null,'#2a6f5c','notes',{section:'testimonials'}],['About','about','#c8372d'],['Privacy','privacy','#3d2c5e'],['Help','help','#2f5d4e'],['Photo Dump site','EXT','#2a1710']];
  async function render(){
    back.disabled=idx===0;fwd.disabled=idx>=hist.length-1;
    const pg=hist[idx];url.value=pg.p==='home'?'':'photodump://'+(pg.p==='search'?'search?q='+pg.q:pg.p);
    body.scrollTop=0;body.replaceChildren();
    if(pg.p==='home'){
      body.append(h('div',{class:'saf-home'},h('h3',null,'Favourites'),h('div',{class:'saf-favs'},favs.map(f=>h('button',{class:'saf-fav',onclick:()=>{if(f[1]==='EXT')ext(CFG.mainSite);else if(f[1])nav({p:f[1]});else ctx.open(f[3],f[4]);}},h('span',{style:{background:f[2]}},f[0][0]),f[0])))));
      return;
    }
    if(SAFARI_PAGES[pg.p]){const P=SAFARI_PAGES[pg.p];body.append(h('article',{class:'saf-page'},h('h1',null,P.title),P.body.map(t=>h('p',null,t))));return;}
    if(pg.p==='search'){
      const q=pg.q.toLowerCase();
      const pages=Object.keys(SAFARI_PAGES).filter(k=>(SAFARI_PAGES[k].title+SAFARI_PAGES[k].body.join(' ')).toLowerCase().includes(q)).map(k=>({t:SAFARI_PAGES[k].title,go:()=>nav({p:k})}));
      const all=[...pages];
      body.append(h('div',{class:'saf-page'},h('h1',null,'Results for “'+pg.q+'”'),all.length?h('div',{class:'group',style:{margin:0}},all.map(r=>h('button',{class:'item',onclick:r.go},h('span',{class:'grow'},r.t),h('span',{class:'chev'},icon('chevR'))))):h('p',{class:'muted'},'Nothing found. To open a website, type its address, like example.com.')));
    }
  }
  live(render);render();
}});
