/* ---------- LUKKS ADS: book a front-cover feature or a magazine page; pay with Paystack ---------- */
const Ads={
  async pay(bookingId){
    const r=await sb.functions.invoke('paystack-init',{body:{booking_id:bookingId,callback_url:CFG.site+'?pay=1'}});
    let d=r.data,e=r.error;
    if(e&&e.context&&e.context.json){try{d=await e.context.json();}catch(_){}}
    if(d&&d.authorization_url){location.href=d.authorization_url;return{redirect:true};}
    if(d&&d.error==='payments_not_configured')return{notConfigured:true,message:d.message};
    throw new Error((d&&d.message)||'Could not start payment. Please try again.');
  },
  async verify(reference){
    const r=await sb.functions.invoke('paystack-verify',{body:{reference}});
    let d=r.data,e=r.error;if(e&&e.context&&e.context.json){try{d=await e.context.json();}catch(_){}}
    if(!d)throw new Error('Could not confirm payment.');if(d.error&&!d.paid)throw new Error(d.message||'Could not confirm payment.');return d;
  }
};
defApp({id:'ads',name:'Lukks Ads',bg:'linear-gradient(#e9b44c,#c2701c)',glyph:()=>`<svg viewBox="0 0 60 60"><path d="M14 26h8l16-9v26l-16-9h-8z" fill="#fff"/><path d="M42 24c3 3 3 9 0 12" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/><path d="M24 36l2 9h5l-2-9" fill="#fff"/></svg>`,
mount(el,ctx,live){
  let tab=(ctx.intent&&ctx.intent.tab)||'new',pkgs=[],issues=[];const intent=ctx.intent;ctx.intent=null;
  const bar=appBar({title:'Lukks Ads',onBack:ctx.close,backLabel:'Home'});
  const seg=h('div',{class:'pad',style:{paddingBottom:0}},h('div',{class:'seg'},[['new','Advertise'],['mine','My campaigns']].map(t=>h('button',{'data-t':t[0],onclick:()=>{tab=t[0];draw();}},t[1]))));
  const body=h('div',{class:'app-body'});el.append(bar,seg,body);
  async function boot(){
    body.replaceChildren(spinner());
    try{const [p,i]=await Promise.all([sb.from('ad_packages').select('*').eq('active',true).order('price_kobo',{ascending:false}),sb.from('magazine_issues').select('id,title,crate,issue_no').eq('published',true).order('issue_no')]);
      if(p.error)throw p.error;pkgs=p.data||[];issues=i.data||[];}catch(e){body.replaceChildren(empty('Could not load Ads',errMsg(e),h('button',{class:'btn',onclick:boot},'Try again')));return;}
    if(intent&&intent.verify){await verifyRef(intent.verify);}
    draw();
  }
  function draw(){
    $$('.seg button',seg).forEach(b=>b.classList.toggle('on',b.dataset.t===tab));
    body.replaceChildren();
    if(tab==='mine')return mine();
    body.append(h('div',{class:'pad stack'},h('h3',{class:'h-large',style:{fontSize:'24px',margin:'4px 0'}},'Put your brand in the crate'),h('p',{class:'muted',style:{margin:0}},'Reach readers of Nigerian fashion. Pick a package, choose your magazine and dates, then pay securely with Paystack.')),
      ...pkgs.map(p=>h('div',{class:'pad'},h('div',{class:'card stack'},h('div',{class:'row-flex'},h('b',{class:'grow',style:{fontSize:'17px'}},p.name),h('b',{style:{color:'var(--maroon)',fontSize:'19px'}},fmtKobo(p.price_kobo))),h('span',{class:'muted small-t'},p.description),h('span',{class:'chipS'},p.days+' days'),
        h('button',{class:'btn primary block',onclick:()=>wizard(p)},'Book '+(p.id==='cover'?'cover':'a page'))))));
    body.append(h('p',{class:'muted small-t pad'},'Every creative is reviewed before it goes live. Dates already taken for a magazine cannot be booked.'));
  }
  function wizard(pkg){
    if(!Auth.user){toast('Sign in to book an ad');ctx.open('account',{mode:'signin'});return;}
    sheet(pkg.name,(b,close)=>{
      const tm=new Date(Date.now()+864e5);
      const issue=h('select',null,issues.map(i=>h('option',{value:i.id},`${i.title} · ${i.crate}`)));
      const start=h('input',{type:'date',min:isoDay(tm),max:isoDay(new Date(Date.now()+360*864e5)),value:isoDay(new Date(Date.now()+7*864e5))});
      const brand=h('input',{type:'text',maxlength:'80',placeholder:'Brand name'}),desc=h('textarea',{maxlength:'400',placeholder:'What do you want readers to know?'}),
        dest=h('input',{type:'url',placeholder:'https://yourbrand.com',inputmode:'url'}),mail=h('input',{type:'email',value:Auth.user.email||''}),tel=h('input',{type:'tel',placeholder:'Optional'});
      const files={logo:null,cover:null};const prev=k=>h('div',{class:'ad-prev'});const lp=prev(),cp=prev();
      const pickBtn=(k,label,box)=>h('button',{class:'btn block',onclick:async()=>{try{const f=await pickFile('image/jpeg,image/png,image/webp');if(!f)return;const p=await prepareImage(f,{max:1600});files[k]=p;box.replaceChildren(h('img',{src:URL.createObjectURL(p.blob),alt:label+' preview'}));}catch(e){toast(errMsg(e),'err');}}},icon('image'),label);
      const info=h('p',{class:'muted small-t'});const upd=()=>{if(start.value){const e=new Date(start.value+'T12:00:00');e.setDate(e.getDate()+pkg.days-1);info.textContent=`Runs ${fmtDate(start.value+'T12:00:00',{day:'numeric',month:'short'})} to ${fmtDate(e,{day:'numeric',month:'short',year:'numeric'})}`;}};start.addEventListener('input',upd);upd();
      const err=h('p',{class:'err-t',role:'alert'});
      b.append(field('Magazine',issue),field('Start date',start,'Campaigns start tomorrow or later.'),info,field('Brand name',brand),field('Description',desc),field('Link readers will visit',dest,'Must start with https://'),field('Contact email',mail),field('Contact phone',tel),
        h('div',{class:'f-label',style:{margin:'4px 0'}},'Logo (required)'),lp,pickBtn('logo','Choose logo',lp),
        h('div',{class:'f-label',style:{margin:'12px 0 4px'}},pkg.id==='cover'?'Cover image (required)':'Page creative (required)'),cp,pickBtn('cover',pkg.id==='cover'?'Choose cover image':'Choose page image',cp),
        err,h('div',{class:'row-flex',style:{marginTop:'10px'}},h('b',{class:'grow'},'Total'),h('b',{style:{fontSize:'20px'}},fmtKobo(pkg.price_kobo))),
        h('button',{class:'btn primary block',style:{marginTop:'8px'},onclick:e=>guard(e.currentTarget,async()=>{
          err.textContent='';
          try{
            if(!brand.value.trim())throw new Error('Add your brand name.');if(desc.value.trim().length<10)throw new Error('Add a short description.');
            const u=safeUrl(dest.value.trim());if(!u||!/^https:/.test(u))throw new Error('Enter a link starting with https://');
            if(!/^\S+@\S+\.\S+$/.test(mail.value.trim()))throw new Error('Enter a valid contact email.');
            if(!files.logo)throw new Error('Please add your logo.');if(!files.cover)throw new Error('Please add your '+(pkg.id==='cover'?'cover image.':'page creative.'));
            if(!start.value)throw new Error('Choose a start date.');
            const lg=await uploadFile('ad-creatives',files.logo.blob,files.logo.ext,files.logo.type),cv=await uploadFile('ad-creatives',files.cover.blob,files.cover.ext,files.cover.type);
            const s=new Date(start.value+'T12:00:00'),en=new Date(s);en.setDate(en.getDate()+pkg.days-1);
            const r=await sb.from('ad_bookings').insert({user_id:Auth.user.id,package_id:pkg.id,issue_id:issue.value,brand_name:brand.value.trim(),description:desc.value.trim(),destination_url:u,contact_email:mail.value.trim(),contact_phone:tel.value.trim()||null,logo_path:lg,cover_image_path:cv,creatives:[cv],start_date:start.value,end_date:isoDay(en)}).select().single();
            if(r.error){removeFile('ad-creatives',lg);removeFile('ad-creatives',cv);throw r.error;}
            close();await startPay(r.data);
          }catch(ex){err.textContent=errMsg(ex);}
        })},'Continue to payment'));
    });
  }
  async function startPay(bk){
    toast('Booking saved. Opening secure payment…');
    try{const r=await Ads.pay(bk.id);if(r.redirect)return;
      if(r.notConfigured){await dialog({title:'Payment is not switched on yet',body:'Your booking is saved as “Awaiting payment”. No money has been taken. You can pay from My campaigns once online payment is enabled.'});}
    }catch(e){toast(errMsg(e),'err');}
    tab='mine';draw();
  }
  async function verifyRef(ref){
    try{const r=await Ads.verify(ref);if(r.paid){await dialog({title:'Payment received',body:'Thank you. Your creative is now in review and we will notify you once it is approved.'});}else await dialog({title:'Payment not confirmed',body:'We could not confirm that payment yet. If you were charged, it will update shortly, or use “Check payment” on your booking.'});}
    catch(e){toast(errMsg(e),'err');}
    tab='mine';
  }
  async function mine(){
    if(!Auth.user){body.replaceChildren(gate(ctx,'Sign in to see your campaigns.'));return;}
    body.replaceChildren(spinner());
    const r=await sb.from('ad_bookings').select('*').eq('user_id',Auth.user.id).order('created_at',{ascending:false});
    if(r.error){body.replaceChildren(empty('Could not load campaigns',errMsg(r.error)));return;}
    const list=r.data||[];body.replaceChildren();
    if(!list.length){body.append(empty('No campaigns yet','Your bookings will appear here.',h('button',{class:'btn primary',onclick:()=>{tab='new';draw();}},'Book an ad')));return;}
    list.forEach(bk=>{
      const iss=issues.find(i=>i.id===bk.issue_id);const unpaid=bk.status==='awaiting_payment';
      body.append(h('div',{class:'pad',style:{paddingBottom:0}},h('div',{class:'card stack'},
        h('div',{class:'row-flex'},h('b',{class:'grow'},bk.brand_name),chip(bk.status)),
        h('span',{class:'muted small-t'},(bk.package_id==='cover'?'Front cover':'Magazine page')+' · '+(iss?iss.title:bk.issue_id)),
        h('span',{class:'small-t'},fmtDate(bk.start_date+'T12:00:00',{day:'numeric',month:'short'})+' – '+fmtDate(bk.end_date+'T12:00:00',{day:'numeric',month:'short',year:'numeric'})+' · '+fmtKobo(bk.amount_kobo)),
        bk.admin_note&&h('p',{class:'small-t',style:{margin:0}},'Note from Lukks: '+bk.admin_note),
        h('div',{class:'row-flex',style:{flexWrap:'wrap'}},
          unpaid&&h('button',{class:'btn primary small',onclick:e=>guard(e.currentTarget,async()=>{const x=await Ads.pay(bk.id);if(x.notConfigured)toast('Online payment is not switched on yet','err');})},'Pay now'),
          bk.paystack_reference&&bk.payment_status!=='paid'&&h('button',{class:'btn small',onclick:e=>guard(e.currentTarget,async()=>{const x=await Ads.verify(bk.paystack_reference);toast(x.paid?'Payment confirmed':'Not paid yet',x.paid?'ok':'');mine();})},'Check payment'),
          unpaid&&h('button',{class:'btn danger small',onclick:async e=>{if(!await confirmBox('Cancel this booking?','The dates will be released.','Cancel booking',true))return;const x=await sb.rpc('cancel_my_booking',{p_id:bk.id});if(x.error)toast(errMsg(x.error),'err');else{toast('Booking cancelled');mine();}}},'Cancel')))));
    });
  }
  live(()=>draw());boot();
}});
