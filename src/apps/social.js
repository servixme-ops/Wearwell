/* ---------- SOCIAL apps: users add their own handles; nothing is preset ---------- */
const Socials={
  get(){const mine=(Auth.profile&&Auth.profile.socials)||null;const loc=Local.get('socials',{});return Auth.user?Object.assign({},mine||{}):loc;},
  async set(key,val){
    const cur=this.get();if(val)cur[key]=val;else delete cur[key];
    if(Auth.user){const r=await Auth.saveProfile({socials:cur});if(r.error)throw r.error;}else Local.set('socials',cur);
  },
  async migrate(){if(!Auth.user)return;const loc=Local.get('socials',{});const has=Auth.profile&&Auth.profile.socials||{};const merged=Object.assign({},loc,has);if(Object.keys(loc).length&&JSON.stringify(merged)!==JSON.stringify(has)){await Auth.saveProfile({socials:merged});Local.del('socials');}},
  url(key,handle){return CFG.socials[key].base+handle;},
  parse(key,input){
    let v=String(input||'').trim();if(!v)throw new Error('Enter your username or profile link.');
    if(/^https?:\/\//i.test(v)){
      let u;try{u=new URL(v);}catch(e){throw new Error('That link is not valid.');}
      const want=new URL(CFG.socials[key].base).host.replace(/^www\./,'');const got=u.host.replace(/^www\./,'');
      if(!(got===want||got.endsWith('.'+want)||(key==='x'&&got==='twitter.com')))throw new Error(`That link is not a ${CFG.socials[key].label} link.`);
      const seg=u.pathname.split('/').filter(Boolean);v=(key==='linkedin'?seg[1]||seg[0]:seg[0])||'';
    }
    v=v.replace(/^@/,'');
    if(!/^[A-Za-z0-9._-]{1,60}$/.test(v))throw new Error('Use letters, numbers, dots, dashes or underscores only.');
    return v;
  }
};
const SOC_UI={
  instagram:{bg:'linear-gradient(45deg,#fdc468,#f9572d 35%,#d6249f 65%,#4f5bd5)',g:'<rect x="15" y="15" width="30" height="30" rx="9" fill="none" stroke="#fff" stroke-width="3"/><circle cx="30" cy="30" r="7.500" fill="none" stroke="#fff" stroke-width="3"/><circle cx="39" cy="21" r="2" fill="#fff"/>'},
  x:{bg:'#000',g:'<path d="M17 16l11.500 15L17 44h3.500l9.500-11 8 11H44L32 28.500 42.500 16H39L30.500 26 23 16z" fill="#fff"/>'},
  youtube:{bg:'#ff0033',g:'<rect x="11" y="18" width="38" height="24" rx="8" fill="#fff"/><path d="M26 24l10 6-10 6z" fill="#ff0033"/>'},
  tiktok:{bg:'#000',g:'<path d="M33 14v20.500a6 6 0 1 1-6-6" fill="none" stroke="#25f4ee" stroke-width="4" transform="translate(-1.500 1)"/><path d="M33 14v20.500a6 6 0 1 1-6-6M33 14c.5 4.500 3.500 8 8 8.500" fill="none" stroke="#fe2c55" stroke-width="4" transform="translate(1.500 -1)"/><path d="M33 14v20.500a6 6 0 1 1-6-6M33 14c.5 4.500 3.500 8 8 8.500" fill="none" stroke="#fff" stroke-width="3.500"/>'},
  linkedin:{bg:'#0a66c2',g:'<rect x="15" y="25" width="6" height="19" fill="#fff"/><circle cx="18" cy="18" r="3.600" fill="#fff"/><path d="M27 25h5.500v2.800c1.200-2 3.200-3.300 6-3.300 5 0 6 3.300 6 7.500V44h-6V33c0-2.200-.6-3.600-2.600-3.600-2.200 0-2.900 1.600-2.900 3.700V44H27z" fill="#fff"/>'}
};
Object.keys(CFG.socials).forEach(key=>{
  const ui=SOC_UI[key],label=CFG.socials[key].label;
  defApp({id:'soc_'+key,name:label,bg:ui.bg,glyph:()=>`<svg viewBox="0 0 60 60">${ui.g}</svg>`,
  mount(el,ctx,live){
    const body=h('div',{class:'app-body'});el.append(appBar({title:label,onBack:ctx.close,backLabel:'Home'}),body);
    function draw(editing){
      const cur=Socials.get()[key];body.replaceChildren();
      const hero=h('div',{class:'soc-hero'},h('span',{class:'glyph soc-glyph',style:{background:ui.bg},html:`<svg viewBox="0 0 60 60">${ui.g}</svg>`}),h('h3',null,label));
      body.append(hero);
      if(cur&&!editing){
        body.append(h('div',{class:'pad stack'},h('div',{class:'card soc-card'},h('span',{class:'muted small-t'},'Your '+label),h('b',{style:{fontSize:'18px',wordBreak:'break-all'}},'@'+cur)),
          h('button',{class:'btn primary block',onclick:()=>openExternal(Socials.url(key,cur))},icon('link'),'Open '+label+' profile'),
          h('button',{class:'btn block',onclick:()=>draw(true)},icon('edit'),'Change'),
          h('button',{class:'btn danger block',onclick:e=>guard(e.currentTarget,async()=>{await Socials.set(key,null);toast('Removed');draw();})},'Remove link'),
          h('p',{class:'muted small-t'},'Opens in your web browser. '+(Auth.user?'This link also appears on your Lukks Profile.':'Sign in to show it on your Lukks Profile.'))));
        return;
      }
      const inp=h('input',{type:'text',autocapitalize:'none',autocorrect:'off',placeholder:'username or profile link',value:cur||'','aria-label':label+' username'}),err=h('p',{class:'err-t',role:'alert'});
      body.append(h('div',{class:'pad stack'},h('p',{class:'muted'},cur?'Update your '+label+' link.':'Add your own '+label+' profile. Nothing is shown until you add it.'),field('Your '+label+' username or link',inp,'Example: '+CFG.socials[key].base+'yourname'),err,
        h('button',{class:'btn primary block',onclick:e=>guard(e.currentTarget,async()=>{err.textContent='';try{const v=Socials.parse(key,inp.value);await Socials.set(key,v);toast('Saved','ok');draw();}catch(ex){err.textContent=errMsg(ex);}})},'Save'),cur&&h('button',{class:'btn block',onclick:()=>draw()},'Cancel')));
      setTimeout(()=>inp.focus({preventScroll:true}),300);
    }
    live(()=>draw());draw();
  }});
});
