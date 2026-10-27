/* ---------- LUKKS PROFILE: shareable fashion profile (Linktree for fashion) ---------- */
defApp({id:'profile',name:'Lukks Profile',bg:'linear-gradient(#8a2338,#4d0f1e)',glyph:()=>`<svg viewBox="0 0 60 60"><circle cx="30" cy="22" r="9" fill="#fff"/><path d="M13 47c1.500-9 8-14 17-14s15.500 5 17 14z" fill="#fff"/><rect x="21" y="49" width="18" height="3" rx="1.500" fill="#e9c46a"/></svg>`,
mount(el,ctx,live){
  let tab='edit';
  const bar=appBar({title:'Lukks Profile',onBack:ctx.close,backLabel:'Home'}),seg=h('div',{class:'pad',style:{paddingBottom:0}},h('div',{class:'seg'},[['edit','Edit'],['preview','Preview']].map(t=>h('button',{'data-t':t[0],onclick:()=>{tab=t[0];draw();}},t[1])))),body=h('div',{class:'app-body'});
  el.append(bar,seg,body);
  function draw(){
    $$('.seg button',seg).forEach(b=>b.classList.toggle('on',b.dataset.t===tab));
    if(!Auth.user){seg.hidden=true;body.replaceChildren(gate(ctx,'Sign in to create your shareable Lukks Profile.','signup'));return;}
    seg.hidden=false;
    tab==='edit'?edit():preview();
  }
  async function preview(){
    body.replaceChildren(spinner());
    const p=Auth.profile;
    if(!p||!p.is_public){body.replaceChildren(empty('Your profile is private','Turn on “Make my profile public” in Edit to preview and share it.',h('button',{class:'btn primary',onclick:()=>{tab='edit';draw();}},'Go to Edit')));return;}
    const r=await sb.rpc('get_public_profile',{p_username:p.username});
    if(r.error||!r.data){body.replaceChildren(empty('Could not load preview',r.error?errMsg(r.error):'Save your profile first.'));return;}
    body.replaceChildren(renderPublicProfile(r.data,{hideFooter:true}));
  }
  function edit(){
    const p=Auth.profile||{};const url=profileUrl(p.username||'');
    const state={display_name:p.display_name||'',bio:p.bio||'',style:p.style||'',theme:p.theme||'maroon',is_public:!!p.is_public,show_looks:p.show_looks!==false,show_gallery:p.show_gallery!==false,show_features:p.show_features!==false,show_wardrobe:!!p.show_wardrobe,show_prices:!!p.show_prices,storefront_url:p.storefront_url||'',collection_links:Array.isArray(p.collection_links)?p.collection_links.slice():[]};
    body.replaceChildren();
    const share=h('div',{class:'group',style:{marginTop:'14px'}},
      h('div',{class:'item'},h('span',{class:'grow'},h('b',null,'Make my profile public'),h('span',null,'Anyone with your link can view it')),toggleEl(state.is_public,v=>state.is_public=v,'Public profile')),
      h('div',{class:'item'},h('span',{class:'grow',style:{minWidth:0}},h('b',null,'Your link'),h('span',{style:{wordBreak:'break-all'}},url)),h('button',{class:'icon-btn','aria-label':'Copy link',onclick:async()=>toast(await copyText(url)?'Link copied':'Could not copy',''),},icon('copy')),
        h('button',{class:'icon-btn','aria-label':'Share link',onclick:()=>{if(navigator.share)navigator.share({title:(p.display_name||p.username)+' on Lukks',url}).catch(()=>{});else copyText(url).then(()=>toast('Link copied'));}},icon('share'))));
    const dn=h('input',{type:'text',maxlength:'60',value:state.display_name}),bio=h('textarea',{maxlength:'240'}),st=h('input',{type:'text',maxlength:'80',value:state.style,placeholder:'e.g. Ankara, Streetwear, Owambe'});bio.value=state.bio;
    const coverPrev=h('div',{class:'ad-prev'});if(p.cover_url)coverPrev.append(h('img',{src:p.cover_url,alt:'Cover'}));
    const theme=h('div',{class:'theme-pick'},Object.keys(PROFILE_THEMES).map(k=>h('button',{class:'t-'+k+(state.theme===k?' on':''),'aria-label':PROFILE_THEMES[k],'aria-pressed':String(state.theme===k),onclick:e=>{state.theme=k;$$('button',theme).forEach(b=>{const on=b===e.currentTarget;b.classList.toggle('on',on);b.setAttribute('aria-pressed',String(on));});}})));
    const sf=h('input',{type:'url',placeholder:'https://yourstore.com',value:state.storefront_url,inputmode:'url'});
    const linksBox=h('div',{class:'stack'});
    const drawLinks=()=>{linksBox.replaceChildren();state.collection_links.forEach((c,i)=>{const lb=h('input',{type:'text',maxlength:'60',placeholder:'Label',value:c.label||''}),ur=h('input',{type:'url',placeholder:'https://',value:c.url||''});lb.oninput=()=>c.label=lb.value;ur.oninput=()=>c.url=ur.value;
      linksBox.append(h('div',{class:'card stack'},lb,ur,h('button',{class:'btn small danger',onclick:()=>{state.collection_links.splice(i,1);drawLinks();}},'Remove')));});
      if(state.collection_links.length<8)linksBox.append(h('button',{class:'btn block',onclick:()=>{state.collection_links.push({label:'',url:''});drawLinks();}},icon('plus'),'Add a link'));};drawLinks();
    const soc=Socials.get();const socRow=h('div',{class:'group'},Object.keys(CFG.socials).map(k=>h('button',{class:'item',onclick:()=>ctx.open('soc_'+k)},h('span',{class:'grow'},h('b',null,CFG.socials[k].label),h('span',null,soc[k]?'@'+soc[k]:'Not added')),h('span',{class:'chev'},icon('chevR')))));
    const tg=(label,sub,key)=>h('div',{class:'item'},h('span',{class:'grow'},h('b',null,label),sub&&h('span',null,sub)),toggleEl(state[key],v=>state[key]=v,label));
    body.append(share,
      h('div',{class:'sec-t'},'About you'),h('div',{class:'pad stack',style:{paddingTop:0}},field('Display name',dn),field('Bio',bio),field('Style tags',st,'Separate with commas'),
        h('div',{class:'f-label'},'Cover photo'),coverPrev,h('button',{class:'btn block',onclick:e=>guard(e.currentTarget,async()=>{const f=await pickFile('image/jpeg,image/png,image/webp');if(!f)return;const pr=await prepareImage(f,{max:1400,maxMB:12});const path=await uploadFile('avatars',pr.blob,pr.ext,pr.type);const r=await Auth.saveProfile({cover_url:publicUrl('avatars',path)});if(r.error)throw r.error;toast('Cover updated','ok');edit();})},icon('image'),'Choose cover photo'),
        h('p',{class:'muted small-t',style:{margin:0}},'Change your profile photo and username in Account.')),
      h('div',{class:'sec-t'},'Theme'),h('div',{class:'pad'},theme),
      h('div',{class:'sec-t'},'Links'),h('div',{class:'pad stack',style:{paddingTop:0}},field('Online store',sf),h('div',{class:'f-label'},'Collection links'),linksBox),
      h('div',{class:'sec-t'},'Social links'),socRow,
      h('div',{class:'sec-t'},'What to show'),h('div',{class:'group'},tg('My looks','From Lukks Receipt, only looks you share','show_looks'),tg('My gallery','Approved community photos','show_gallery'),tg('Magazine features','Photos featured in Lukks','show_features'),tg('Wardrobe','Looks saved to your crate wardrobe','show_wardrobe'),tg('Prices on looks','Show what each item cost','show_prices')),
      h('div',{class:'pad'},h('button',{class:'btn primary block',onclick:e=>guard(e.currentTarget,async()=>{
        const sfv=sf.value.trim();if(sfv&&!(safeUrl(sfv)))throw new Error('Your store link is not a valid web address.');
        const links=state.collection_links.filter(c=>c.label&&c.label.trim()&&c.url&&c.url.trim());
        for(const c of links)if(!safeUrl(c.url.trim()))throw new Error('Check the link for “'+c.label+'”.');
        const r=await Auth.saveProfile({display_name:dn.value.trim()||null,bio:bio.value.trim()||null,style:st.value.trim()||null,theme:state.theme,is_public:state.is_public,show_looks:state.show_looks,show_gallery:state.show_gallery,show_features:state.show_features,show_wardrobe:state.show_wardrobe,show_prices:state.show_prices,storefront_url:sfv||null,collection_links:links.map(c=>({label:c.label.trim(),url:c.url.trim()}))});
        if(r.error)throw r.error;toast('Profile saved','ok');})},'Save profile')));
  }
  live(draw);draw();
}});
