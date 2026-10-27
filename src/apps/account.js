/* ---------- ACCOUNT (Settings): sign in, profile, wallpapers, sound, notifications ---------- */
defApp({id:'account',name:'Account',bg:'linear-gradient(#a8a8ae,#6a6a70)',glyph:()=>`<svg viewBox="0 0 60 60"><g fill="#3a3a3f"><path d="M30 12l3.200 3.400 4.600-1.200 1.600 4.500 4.600 1.400-.6 4.700 3.400 3.300-3 3.800 1.300 4.600-4.500 1.800-1 4.700-4.800-.1L30 46l-3.800-2.800-4.800.1-1-4.700-4.500-1.800 1.300-4.600-3-3.800 3.400-3.300-.6-4.700 4.600-1.400 1.600-4.500 4.600 1.200z"/></g><circle cx="30" cy="30" r="8.500" fill="#d9d9de"/><circle cx="30" cy="30" r="4" fill="#3a3a3f"/></svg>`,
mount(el,ctx,live){
  const wanted=ctx.intent&&ctx.intent.mode;let mode='signin';ctx.intent=null;
  const root=h('div',{class:'msg-root'});el.append(root);
  const bar=(title,back,right)=>appBar({title,onBack:back,backLabel:back?'Account':'Home',right});
  function main(){
    const body=appBody();root.replaceChildren(appBar({title:'Account',onBack:ctx.close,backLabel:'Home'}),body);
    if(Auth.user){
      const p=Auth.profile||{};
      body.append(h('button',{class:'group acct-card',onclick:editProfile},h('span',{class:'item'},avatarEl(p,'lg'),h('span',{class:'grow'},h('b',{style:{fontSize:'20px'}},p.display_name||p.username||'You'),h('span',null,'@'+(p.username||'')),h('span',null,Auth.user.email)),h('span',{class:'chev'},icon('chevR')))));
    }else{
      body.append(h('div',{class:'group'},h('div',{class:'pad stack'},h('b',{style:{fontSize:'18px'}},'Welcome to Lukks'),h('span',{class:'muted'},'Sign in to save your wallpapers, looks, photos and profile across devices.'),h('button',{class:'btn primary block',onclick:()=>auth('signin')},'Sign in'),h('button',{class:'btn block',onclick:()=>auth('signup')},'Create account'))));
    }
    const row=(ic,t,sub,fn)=>h('button',{class:'item',onclick:fn},icon(ic),h('span',{class:'grow'},h('b',null,t),sub&&h('span',null,sub)),h('span',{class:'chev'},icon('chevR')));
    body.append(h('div',{class:'sec-t'},'Personalise'),h('div',{class:'group'},row('image','Wallpapers','Lock screen and home screen',wallpapers),row('speaker','Sound',Sound.kind==='off'?'Off':Sound.KINDS.find(k=>k.id===Sound.kind).label+(Sound.muted?' (muted)':''),soundSheet),row('bell','Notifications','Choose what you hear about',notifPrefs)));
    if(Auth.user)body.append(h('div',{class:'sec-t'},'Your content'),h('div',{class:'group'},row('image','My photos and submissions','Review status and magazine entries',()=>ctx.open('photos',{tab:'mine'})),row('user','Lukks Profile','Your public style page',()=>ctx.open('profile')),row('shirt','Lukks Receipt','Your outfit archive',()=>ctx.open('receipt')),row('bell','Lukks Ads','Your featured campaigns',()=>ctx.open('ads',{tab:'mine'}))));
    const more=h('div',{class:'group'});
    if(typeof PWA!=='undefined'&&PWA.canInstall())more.append(row('download','Install Lukks','Add to your home screen',()=>PWA.install()));
    else if(typeof PWA!=='undefined'&&PWA.isIosSafari&&PWA.isIosSafari()&&!PWA.isStandalone())more.append(row('download','Install Lukks','Share, then Add to Home Screen',()=>PWA.iosHelp()));
    more.append(row('home','Reset home screen layout','Restore the original icon order',async()=>{if(await confirmBox('Reset icon layout?',null,'Reset')){Local.del('iconorder');if(Auth.user)await Auth.saveSettings({icon_order:[]});Phone.renderHome();toast('Layout reset','ok');}}));
    if(Auth.isAdmin)more.append(row('lock','Admin dashboard','Review submissions, ads and events',()=>window.open('admin.html','_blank','noopener')));
    body.append(h('div',{class:'sec-t'},'More'),more);
    if(Auth.user)body.append(h('div',{class:'pad'},h('button',{class:'btn danger block',onclick:async()=>{if(await confirmBox('Sign out?','Your saved data stays safe on your account.','Sign out')){await Auth.signOut();toast('Signed out');}}},'Sign out')));
    body.append(h('p',{class:'muted small-t',style:{textAlign:'center',padding:'6px 20px 20px'}},'Lukks · Discover Nigerian fashion'));
  }
  /* ---- auth forms ---- */
  function auth(m){
    mode=m;const body=appBody();root.replaceChildren(bar(m==='signup'?'Create account':m==='forgot'?'Reset password':'Sign in',main),body);
    const err=h('p',{class:'err-t',role:'alert'});
    const email=h('input',{type:'email',autocomplete:'email',inputmode:'email',required:true,placeholder:'you@example.com'});
    const pw=h('input',{type:'password',autocomplete:m==='signup'?'new-password':'current-password',minlength:'8',placeholder:m==='signup'?'At least 8 characters':'Password'});
    const form=h('form',{class:'pad',novalidate:true});
    let name,user,cons;
    if(m==='signup'){
      name=h('input',{type:'text',maxlength:'60',autocomplete:'name',placeholder:'Your name'});
      const hint=h('span',{class:'f-hint'},'3 to 24 letters, numbers or underscores.');
      user=h('input',{type:'text',maxlength:'24',autocapitalize:'none',autocomplete:'username',placeholder:'username'});
      let t;user.addEventListener('input',()=>{user.value=slugify(user.value);clearTimeout(t);if(user.value.length<3){hint.textContent='3 to 24 letters, numbers or underscores.';hint.className='f-hint';return;}t=setTimeout(async()=>{const r=await sb.rpc('username_available',{p_username:user.value});hint.textContent=r.data?'✓ Available':'Already taken';hint.className='f-hint '+(r.data?'ok-t':'err-t');},350);});
      cons=h('input',{type:'checkbox'});
      form.append(field('Name',name),h('label',{class:'field'},h('span',{class:'f-label'},'Username'),user,hint));
    }
    form.append(field('Email',email),field('Password',pw));
    if(m==='signup')form.append(h('label',{class:'check'},cons,h('span',null,'I agree to the Lukks terms and privacy notice.')));
    if(m==='forgot'){form.replaceChildren(h('p',{class:'muted'},'Enter your email and we will send you a link to choose a new password.'),field('Email',email));}
    const go=h('button',{class:'btn primary block',type:'submit'},m==='signup'?'Create account':m==='forgot'?'Send reset link':'Sign in');
    form.append(err,go);
    if(m==='signin')form.append(h('button',{type:'button',class:'btn ghost block',onclick:()=>auth('forgot')},'Forgot password?'),h('button',{type:'button',class:'btn block',onclick:()=>auth('signup')},'Create an account'));
    if(m!=='signin')form.append(h('button',{type:'button',class:'btn ghost block',onclick:()=>auth('signin')},'I already have an account'));
    form.addEventListener('submit',async e=>{
      e.preventDefault();err.textContent='';
      const em=email.value.trim();if(!/^\S+@\S+\.\S+$/.test(em)){err.textContent='Enter a valid email address.';return;}
      if(m!=='forgot'&&pw.value.length<8){err.textContent='Password must be at least 8 characters.';return;}
      if(m==='signup'){if(user.value.length<3){err.textContent='Choose a username (3+ characters).';return;}if(!cons.checked){err.textContent='Please accept the terms to continue.';return;}}
      go.disabled=true;
      try{
        if(m==='signin'){const r=await Auth.signIn(em,pw.value);if(r.error)throw r.error;toast('Welcome back','ok');main();}
        else if(m==='signup'){const r=await Auth.signUp(em,pw.value,{username:user.value,display_name:name.value.trim()});if(r.error)throw r.error;
          if(r.needsConfirm){root.replaceChildren(bar('Check your email',main),appBody(empty('Confirm your email','We sent a link to '+em+'. Open it to finish creating your account, then sign in here.',h('button',{class:'btn primary',onclick:()=>auth('signin')},'Go to sign in'))));}
          else{toast('Account created','ok');main();}}
        else{const r=await Auth.resetPassword(em);if(r.error)throw r.error;root.replaceChildren(bar('Check your email',main),appBody(empty('Link sent','If an account exists for '+em+', a reset link is on its way.',h('button',{class:'btn primary',onclick:()=>auth('signin')},'Back to sign in'))));}
      }catch(ex){err.textContent=errMsg(ex);}finally{go.disabled=false;}
    });
    body.append(form);
  }
  /* ---- profile edit ---- */
  function editProfile(){
    const p=Auth.profile||{};const body=appBody();root.replaceChildren(bar('Edit profile',main),body);
    const dn=h('input',{type:'text',maxlength:'60',value:p.display_name||''}),un=h('input',{type:'text',maxlength:'24',value:p.username||'',autocapitalize:'none'}),bio=h('textarea',{maxlength:'240'},p.bio||'');bio.value=p.bio||'';
    const av=h('div',{class:'row-flex pad'},avatarEl(p,'lg'),h('button',{class:'btn small',onclick:e=>guard(e.currentTarget,async()=>{
      const f=await pickFile('image/jpeg,image/png,image/webp');if(!f)return;
      const pr=await prepareImage(f,{max:512,maxMB:CFG.limits.avatarMB*3});const path=await uploadFile('avatars',pr.blob,pr.ext,pr.type);
      const r=await Auth.saveProfile({avatar_url:publicUrl('avatars',path)});if(r.error)throw r.error;toast('Photo updated','ok');editProfile();})},'Change photo'));
    const hint=h('span',{class:'f-hint'});let t;
    un.addEventListener('input',()=>{un.value=slugify(un.value);clearTimeout(t);if(un.value===p.username||un.value.length<3){hint.textContent='';return;}t=setTimeout(async()=>{const r=await sb.rpc('username_available',{p_username:un.value});hint.textContent=r.data?'✓ Available':'Already taken';hint.className='f-hint '+(r.data?'ok-t':'err-t');},350);});
    body.append(av,h('div',{class:'pad'},field('Name',dn),h('label',{class:'field'},h('span',{class:'f-label'},'Username'),un,hint),field('Bio',bio),
      h('button',{class:'btn primary block',onclick:e=>guard(e.currentTarget,async()=>{
        if(un.value.length<3)throw new Error('Username must be at least 3 characters.');
        const r=await Auth.saveProfile({display_name:dn.value.trim()||null,username:un.value,bio:bio.value.trim()||null});if(r.error)throw r.error;toast('Saved','ok');main();})},'Save')));
  }
  /* ---- wallpapers ---- */
  function wallpapers(){
    const body=appBody();root.replaceChildren(bar('Wallpapers',main),body);
    const card=async kind=>{
      const url=await Wall.url(kind);
      const prev=h('div',{class:'wp-prev '+kind,style:{backgroundImage:`url("${url}")`}},h('span',null,kind==='lock'?'Lock screen':'Home screen'));
      return h('div',{class:'pad stack'},prev,h('div',{class:'row-flex'},
        h('button',{class:'btn grow',onclick:e=>guard(e.currentTarget,async()=>{const f=await pickFile('image/jpeg,image/png,image/webp,image/gif');if(!f)return;await Wall.set(kind,f);toast('Wallpaper updated','ok');wallpapers();})},'Choose image or GIF'),
        Wall.isCustom(kind)&&h('button',{class:'btn danger',onclick:e=>guard(e.currentTarget,async()=>{await Wall.remove(kind);toast('Wallpaper reset');wallpapers();})},'Reset')));
    };
    Promise.all([card('lock'),card('home')]).then(([a,b])=>body.append(a,b,h('p',{class:'muted small-t pad'},'JPG, PNG, WebP up to '+CFG.limits.wallpaperMB+' MB. GIFs up to '+CFG.limits.gifMB+' MB. '+(Auth.user?'Saved to your account.':'Saved on this device. Sign in to keep them everywhere.'))));
  }
  /* ---- sound ---- */
  function soundSheet(){
    const body=appBody();root.replaceChildren(bar('Sound',main),body);
    const draw=()=>{body.replaceChildren(h('p',{class:'muted pad small-t'},'Ambient sound is optional and starts only when you tap. It is generated on your device.'),
      h('div',{class:'group'},Sound.KINDS.map(k=>h('button',{class:'item',onclick:async()=>{await Sound.set(k.id);persist();draw();}},h('span',{class:'grow'},k.label),Sound.kind===k.id&&icon('check')))),
      h('div',{class:'group',style:{marginTop:'14px'}},h('div',{class:'item'},h('span',{class:'grow'},'Muted'),toggleEl(Sound.muted,async v=>{Sound.muted=v;if(!v&&Sound.kind==='off')Sound.kind='rain';await Sound.apply();persist();draw();},'Mute'))));};
    const persist=()=>{Local.set('sound',{kind:Sound.kind,muted:Sound.muted});if(Auth.user)Auth.saveSettings({sound:Sound.kind,muted:Sound.muted});};draw();
  }
  /* ---- notifications ---- */
  function notifPrefs(){
    const body=appBody();root.replaceChildren(bar('Notifications',main),body);const pr=Notifs.prefs();
    const items=[['events','Events','New and upcoming Lukks events'],['community','Community','New photos and activity'],['features','Magazines','New issues in the crate'],['testimonials','Testimonial reminders','Occasional prompts'],['campaigns','Campaigns and account','Ads, reviews and team updates']];
    body.append(h('div',{class:'group',style:{marginTop:'14px'}},items.map(i=>h('div',{class:'item'},h('span',{class:'grow'},h('b',null,i[1]),h('span',null,i[2])),toggleEl(pr[i[0]]!==false,async v=>{pr[i[0]]=v;const r=await Notifs.savePrefs(pr);if(r&&r.error)toast(errMsg(r.error),'err');Notifs.build();},i[1])))),
      h('div',{class:'pad stack'},h('button',{class:'btn block',onclick:async()=>{const r=await Notifs.enableBrowser();toast(r.msg,r.ok?'ok':'');}},'Allow browser notifications'),h('p',{class:'muted small-t'},'Notifications always appear on the phone lock screen. Browser notifications are optional.')));
  }
  live(()=>{main();});
  if(!Auth.user&&wanted)auth(wanted);else main();
}});
