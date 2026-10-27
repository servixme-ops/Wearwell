/* ---------- Lukks Admin: standalone dashboard. Every action is enforced by Supabase RLS / admin-only functions. ---------- */
const app=document.getElementById('app');
const Ads={async verify(reference){const r=await sb.functions.invoke('paystack-verify',{body:{reference}});let d=r.data;if(r.error&&r.error.context&&r.error.context.json){try{d=await r.error.context.json();}catch(_){}}if(!d)throw new Error('Could not verify payment.');if(d.error&&!d.paid)throw new Error(d.message||'Could not verify payment.');return d;}};
function thumb(look,w,h_){const c=mk(w,h_),g=c.getContext('2d');g.fillStyle=look.bg;g.fillRect(0,0,w,h_);drawFigure(g,look,w/2,h_*.05,h_*.9);return c;}
const ADM_TABS=[['overview','Overview'],['ads','Ads & payments'],['subs','Magazine submissions'],['photos','Photos'],['testi','Testimonials'],['events','Events'],['msgs','Team inbox']];
let tab='overview',counts={};
function loginView(msg){
  const em=h('input',{type:'email',placeholder:'Email',autocomplete:'email'}),pw=h('input',{type:'password',placeholder:'Password',autocomplete:'current-password'}),err=h('p',{class:'err-t'},msg||'');
  const go=h('button',{class:'btn primary block',onclick:async()=>{err.textContent='';go.disabled=true;const r=await Auth.signIn(em.value.trim(),pw.value);go.disabled=false;if(r.error){err.textContent=errMsg(r.error);return;}start();}},'Sign in');
  pw.addEventListener('keydown',e=>{if(e.key==='Enter')go.click();});
  app.replaceChildren(h('div',{class:'adm-login stack'},h('h1',null,'LUKKS'),h('p',{class:'muted',style:{margin:0}},'Admin sign in'),em,pw,err,go));
}
async function start(){
  if(!Auth.user){loginView();return;}
  if(!Auth.isAdmin){app.replaceChildren(h('div',{class:'adm-login stack'},h('h1',null,'No access'),h('p',null,'This account is not an admin account.'),h('button',{class:'btn block',onclick:async()=>{await Auth.signOut();loginView();}},'Sign out')));return;}
  shell();
}
async function loadCounts(){
  const q=(t,f)=>f(sb.from(t).select('id',{count:'exact',head:true})).then(r=>r.count||0);
  const [photos,testi,subs,ads,reports]=await Promise.all([q('photos',x=>x.eq('status','pending')),q('testimonials',x=>x.eq('status','pending')),q('magazine_submissions',x=>x.eq('status','pending')),q('ad_bookings',x=>x.in('status',['paid_in_review','creative_approved'])),q('photos',x=>x.gt('report_count',0))]);
  counts={photos:photos+reports,testi,subs,ads,reports,pendingPhotos:photos};
  counts.msgs=0;
}
function shell(){
  const nav=h('nav',null,h('h2',null,'LUKKS'),...ADM_TABS.map(t=>h('button',{'data-t':t[0],class:tab===t[0]?'on':'',onclick:()=>{tab=t[0];shell();}},t[1],counts[t[0]]?h('span',{class:'cnt'},counts[t[0]]):null)),h('span',{class:'sp'}),h('a',{class:'btn ghost',style:{color:'#f4ead9'},href:'./'},'Open Lukks'),h('button',{onclick:async()=>{await Auth.signOut();loginView();}},'Sign out'));
  const main=h('main');app.replaceChildren(h('div',{class:'adm'},nav,main));
  loadCounts().then(()=>{$$('nav button',nav).forEach(b=>{const t=b.dataset.t;let c=b.querySelector('.cnt');const n=({ads:counts.ads,subs:counts.subs,photos:counts.photos,testi:counts.testi,msgs:counts.msgs})[t];if(n){if(!c){c=h('span',{class:'cnt'});b.append(c);}c.textContent=n;}});});
  ({overview,ads,subs,photos,testi,events,msgs})[tab](main);
}
const sect=(main,title)=>{main.replaceChildren(h('h1',null,title));const box=h('div',{class:'tbl'});main.append(box);return box;};
const setStatus=async(table,id,status,note)=>{const r=await sb.rpc('admin_set_status',{p_table:table,p_id:id,p_status:status,p_note:note||null});if(r.error)throw r.error;};
const askNote=async(title)=>{const t=h('textarea',{placeholder:'Optional note shown to the user',maxlength:'300'});const v=await dialog({title,body:t,actions:[{label:'Cancel',value:false},{label:'Confirm',value:true,primary:true}]});return v?{note:t.value.trim()||null}:null;};

/* ---- overview ---- */
async function overview(main){
  const box=sect(main,'Overview');box.append(spinner());await loadCounts();
  const [u,ev]=await Promise.all([sb.from('profiles').select('id',{count:'exact',head:true}),sb.from('events').select('id',{count:'exact',head:true}).gte('starts_at',new Date().toISOString())]);
  box.replaceChildren(h('div',{class:'stat-grid'},[['Awaiting review: ads',counts.ads],['Magazine submissions',counts.subs],['Photos to review',counts.pendingPhotos],['Reported photos',counts.reports],['Testimonials',counts.testi],['Unread team messages',counts.msgs],['Members',u.count||0],['Upcoming events',ev.count||0]].map(s=>h('div',{class:'stat'},h('b',null,String(s[1])),h('span',null,s[0])))));
}
/* ---- ads ---- */
async function ads(main){
  const box=sect(main,'Ads & payments');box.append(spinner());
  const [r,iss]=await Promise.all([sb.from('ad_bookings').select('*').order('created_at',{ascending:false}).limit(200),sb.from('magazine_issues').select('id,title')]);
  if(r.error){box.replaceChildren(h('p',{class:'err-t'},errMsg(r.error)));return;}
  const t=Object.fromEntries((iss.data||[]).map(i=>[i.id,i.title]));
  box.replaceChildren();if(!r.data.length)box.append(empty('No bookings yet'));
  for(const b of r.data){
    const logo=h('img',{alt:'logo'}),cover=h('img',{alt:'creative'});
    if(b.logo_path)signedUrl('ad-creatives',b.logo_path).then(u=>u&&(logo.src=u));if(b.cover_image_path)signedUrl('ad-creatives',b.cover_image_path).then(u=>u&&(cover.src=u));
    const act=(label,status,cls)=>h('button',{class:'btn '+(cls||''),onclick:async e=>guard(e.currentTarget,async()=>{const n=await askNote(label+'?');if(!n)return;const x=await sb.rpc('admin_set_booking',{p_id:b.id,p_status:status,p_note:n.note});if(x.error)throw x.error;toast('Updated','ok');ads(main);})},label);
    box.append(h('div',{class:'rowc'},logo,cover,h('div',{class:'grow'},h('div',{class:'row-flex'},h('b',null,b.brand_name),chip(b.status)),
      h('div',{class:'muted small-t'},`${b.package_id==='cover'?'Front cover':'Page'} · ${t[b.issue_id]||b.issue_id} · ${b.start_date} → ${b.end_date}`),
      h('div',{class:'small-t'},`${fmtKobo(b.amount_kobo)} · payment: ${b.payment_status}${b.paystack_reference?' · '+b.paystack_reference:''}`),
      h('p',{class:'small-t',style:{margin:'6px 0'}},b.description),
      h('div',{class:'small-t'},h('a',{href:safeUrl(b.destination_url)||'#',target:'_blank',rel:'noopener noreferrer'},b.destination_url),' · ',b.contact_email,b.contact_phone?' · '+b.contact_phone:''),b.admin_note&&h('div',{class:'small-t muted'},'Note: '+b.admin_note)),
      h('div',{class:'acts'},b.paystack_reference&&b.payment_status!=='paid'&&h('button',{class:'btn',onclick:e=>guard(e.currentTarget,async()=>{const x=await Ads.verify(b.paystack_reference);toast(x.paid?'Paid':'Not paid yet');ads(main);})},'Verify payment'),
        b.status==='paid_in_review'&&act('Approve creative','creative_approved','primary'),b.status==='creative_approved'&&act('Schedule','scheduled','primary'),b.status==='scheduled'&&act('Go live','live','primary'),b.status==='live'&&act('Mark completed','completed'),
        !['rejected','cancelled','completed'].includes(b.status)&&act('Reject','rejected','danger'),['awaiting_payment'].includes(b.status)&&act('Cancel','cancelled'))));
  }
}
/* ---- submissions ---- */
async function subs(main){
  const box=sect(main,'Magazine submissions');box.append(spinner());
  const [r,iss]=await Promise.all([sb.from('magazine_submissions').select('*').order('created_at',{ascending:false}).limit(200),sb.from('magazine_issues').select('id,title,crate').order('issue_no')]);
  if(r.error){box.replaceChildren(h('p',{class:'err-t'},errMsg(r.error)));return;}
  box.replaceChildren();if(!r.data.length)box.append(empty('No submissions yet'));
  r.data.forEach(s=>{
    const im=h('img',{alt:s.caption});signedUrl('submissions',s.storage_path).then(u=>u&&(im.src=u));
    const sel=h('select',null,h('option',{value:''},'Choose magazine…'),(iss.data||[]).map(i=>h('option',{value:i.id,selected:s.issue_id===i.id},`${i.title} · ${i.crate}`)));
    box.append(h('div',{class:'rowc'},im,h('div',{class:'grow'},h('div',{class:'row-flex'},h('b',null,s.caption),chip(s.status)),h('div',{class:'muted small-t'},(s.credit?'Credit: '+s.credit+' · ':'')+timeAgo(s.created_at)+' ago · consent: '+(s.consent?'yes':'no')),s.admin_note&&h('div',{class:'small-t'},'Note: '+s.admin_note),
      s.status==='approved'&&h('div',{style:{marginTop:'8px',display:'flex',gap:'8px'}},sel,h('button',{class:'btn',onclick:async e=>guard(e.currentTarget,async()=>{if(!sel.value)throw new Error('Choose a magazine.');const x=await sb.rpc('admin_assign_issue',{p_id:s.id,p_issue:sel.value});if(x.error)throw x.error;toast('Assigned','ok');subs(main);})},'Assign'))),
      h('div',{class:'acts'},s.status==='pending'&&[sel,h('button',{class:'btn primary',onclick:e=>guard(e.currentTarget,async()=>{const n=await askNote('Approve this photo?');if(!n)return;const x=await sb.functions.invoke('admin-approve-submission',{body:{id:s.id,issue_id:sel.value||null,note:n.note}});if(x.error)throw x.error;toast('Approved','ok');subs(main);})},'Approve'),
        h('button',{class:'btn danger',onclick:e=>guard(e.currentTarget,async()=>{const n=await askNote('Reject this photo?');if(!n)return;await setStatus('magazine_submissions',s.id,'rejected',n.note);toast('Rejected');subs(main);})},'Reject')])));
  });
}
/* ---- photos ---- */
async function photos(main){
  const box=sect(main,'Photos');box.append(spinner());
  const [alb,r]=await Promise.all([sb.from('gallery_albums').select('slug,title').order('sort'),sb.from('photos').select('*').or('status.eq.pending,report_count.gt.0').order('created_at',{ascending:false}).limit(100)]);
  box.replaceChildren(addPhotoForm(alb.data||[],()=>photos(main)),h('h3',null,'Needs attention'));
  if(!(r.data||[]).length)box.append(empty('Nothing to review'));
  (r.data||[]).forEach(p=>{
    const rep=h('div',{class:'small-t'});if(p.report_count>0)sb.from('photo_reports').select('reason').eq('photo_id',p.id).then(x=>rep.textContent='Reports: '+(x.data||[]).map(z=>'“'+z.reason+'”').join(' · '));
    box.append(h('div',{class:'rowc'},h('img',{src:p.storage_path?publicUrl('gallery',p.storage_path):artImage(p.art_ref,200),alt:''}),h('div',{class:'grow'},h('div',{class:'row-flex'},h('b',null,p.caption||'No caption'),chip(p.status)),h('div',{class:'muted small-t'},p.album_slug+' · '+timeAgo(p.created_at)+' ago · '+p.like_count+' likes · '+p.report_count+' reports'),rep),
      h('div',{class:'acts'},p.status!=='approved'&&h('button',{class:'btn primary',onclick:e=>guard(e.currentTarget,async()=>{await setStatus('photos',p.id,'approved');photos(main);})},'Approve'),p.status!=='rejected'&&h('button',{class:'btn',onclick:e=>guard(e.currentTarget,async()=>{await setStatus('photos',p.id,'rejected');photos(main);})},'Reject'),
        h('button',{class:'btn danger',onclick:async e=>{if(!await confirmBox('Delete this photo permanently?',null,'Delete',true))return;const x=await sb.from('photos').delete().eq('id',p.id);if(x.error)toast(errMsg(x.error),'err');else{if(p.storage_path)removeFile('gallery',p.storage_path);photos(main);}}},'Delete'))));
  });
}
function addPhotoForm(albums,done){
  const al=h('select',null,albums.map(a=>h('option',{value:a.slug},a.title))),cap=h('input',{type:'text',maxlength:'200',placeholder:'Caption'});let file=null;
  const fb=h('button',{class:'btn',onclick:async()=>{const f=await pickFile('image/jpeg,image/png,image/webp');if(f){file=f;fb.textContent=f.name;}}},'Choose image');
  return h('div',{class:'adm-form'},h('b',{class:'full'},'Add an official photo'),field('Album',al),field('Caption',cap),h('div',{class:'full row-flex'},fb,h('button',{class:'btn primary',onclick:e=>guard(e.currentTarget,async()=>{if(!file)throw new Error('Choose an image first.');const p=await prepareImage(file,{max:1800});const path=await uploadFile('gallery',p.blob,p.ext,p.type);const r=await sb.from('photos').insert({user_id:Auth.user.id,album_slug:al.value,storage_path:path,caption:cap.value.trim()||null,status:'approved'});if(r.error)throw r.error;toast('Added','ok');done();})},'Publish')));
}
/* ---- testimonials ---- */
async function testi(main){
  const box=sect(main,'Testimonials');box.append(spinner());
  const r=await sb.from('testimonials').select('*').order('created_at',{ascending:false}).limit(100);
  box.replaceChildren();if(!(r.data||[]).length)box.append(empty('No testimonials yet'));
  (r.data||[]).forEach(t=>box.append(h('div',{class:'rowc'},h('div',{class:'grow'},h('div',{class:'row-flex'},h('b',null,t.display_name),h('span',null,'★'.repeat(t.rating||5)),chip(t.status)),h('p',{style:{margin:'6px 0'}},t.body)),
    h('div',{class:'acts'},t.status!=='approved'&&h('button',{class:'btn primary',onclick:e=>guard(e.currentTarget,async()=>{await setStatus('testimonials',t.id,'approved');testi(main);})},'Approve'),t.status!=='rejected'&&h('button',{class:'btn',onclick:e=>guard(e.currentTarget,async()=>{const n=await askNote('Reject?');if(!n)return;await setStatus('testimonials',t.id,'rejected',n.note);testi(main);})},'Reject'),
      h('button',{class:'btn danger',onclick:async()=>{if(!await confirmBox('Delete?',null,'Delete',true))return;const x=await sb.from('testimonials').delete().eq('id',t.id);if(x.error)toast(errMsg(x.error),'err');else testi(main);}},'Delete')))));
}
/* ---- events ---- */
const toLocal=d=>{if(!d)return '';const x=new Date(d);x.setMinutes(x.getMinutes()-x.getTimezoneOffset());return x.toISOString().slice(0,16);};
async function events(main){
  const box=sect(main,'Events');box.append(spinner());
  const r=await sb.from('events').select('*').order('starts_at',{ascending:false});
  box.replaceChildren(h('button',{class:'btn primary',style:{alignSelf:'flex-start'},onclick:()=>evForm(null)},'New event'));
  (r.data||[]).forEach(e=>box.append(h('div',{class:'rowc'},h('div',{class:'grow'},h('div',{class:'row-flex'},h('b',null,e.title),chip(e.published?'approved':'pending',e.published?'Published':'Draft')),h('div',{class:'muted small-t'},fmtDate(e.starts_at,{weekday:'short',day:'numeric',month:'short',year:'numeric'})+' · '+fmtTime(e.starts_at)+(e.location?' · '+e.location:'')+(e.capacity?' · cap '+e.capacity:''))),
    h('div',{class:'acts'},h('button',{class:'btn',onclick:()=>evForm(e)},'Edit'),h('button',{class:'btn danger',onclick:async()=>{if(!await confirmBox('Delete this event?','Registrations are removed too.','Delete',true))return;const x=await sb.from('events').delete().eq('id',e.id);if(x.error)toast(errMsg(x.error),'err');else events(main);}},'Delete')))));
  function evForm(e){
    sheet(e?'Edit event':'New event',(b,close)=>{
      const f={title:h('input',{type:'text',maxlength:'120',value:e?e.title:''}),desc:h('textarea',null),kind:h('input',{type:'text',maxlength:'40',value:e&&e.kind||'',placeholder:'e.g. Launch, Fitting, Meetup'}),start:h('input',{type:'datetime-local',value:toLocal(e&&e.starts_at)}),end:h('input',{type:'datetime-local',value:toLocal(e&&e.ends_at)}),loc:h('input',{type:'text',maxlength:'160',value:e&&e.location||''}),cap:h('input',{type:'number',min:'1',value:e&&e.capacity||''}),open:h('input',{type:'checkbox',checked:e?e.registration_open:true}),pub:h('input',{type:'checkbox',checked:e?e.published:true})};f.desc.value=e&&e.description||'';
      b.append(field('Title',f.title),field('Description',f.desc),field('Type',f.kind),field('Starts',f.start),field('Ends (optional)',f.end),field('Location',f.loc),field('Capacity (optional)',f.cap),h('label',{class:'check'},f.open,h('span',null,'Registration open')),h('label',{class:'check'},f.pub,h('span',null,'Published (visible in the app)')),
        h('button',{class:'btn primary block',onclick:x=>guard(x.currentTarget,async()=>{
          if(!f.title.value.trim()||!f.start.value)throw new Error('Title and start time are required.');
          const row={title:f.title.value.trim(),description:f.desc.value.trim()||null,kind:f.kind.value.trim()||null,starts_at:new Date(f.start.value).toISOString(),ends_at:f.end.value?new Date(f.end.value).toISOString():null,location:f.loc.value.trim()||null,capacity:f.cap.value?parseInt(f.cap.value):null,registration_open:f.open.checked,published:f.pub.checked};
          const r=e?await sb.from('events').update(row).eq('id',e.id):await sb.from('events').insert(row);if(r.error)throw r.error;toast('Saved','ok');close();events(main);})},'Save'));
    });
  }
}
/* ---- team inbox ---- */
async function msgs(main){
  const box=sect(main,'Team inbox');box.append(spinner());
  const r=await sb.from('messages').select('*').or('recipient_id.is.null,from_team.eq.true').order('created_at',{ascending:false}).limit(300);
  const by={};(r.data||[]).forEach(m=>{const k=m.recipient_id&&m.from_team?m.recipient_id:m.sender_id;(by[k]=by[k]||[]).push(m);});
  box.replaceChildren();const keys=Object.keys(by);if(!keys.length)box.append(empty('No messages yet'));
  keys.forEach(k=>{
    const list=by[k].slice().reverse();const unread=list[list.length-1].from_team?0:1;
    box.append(h('div',{class:'rowc'},h('div',{class:'grow'},h('b',null,'User '+k.slice(0,8)),unread>0&&h('span',{class:'cnt',style:{marginLeft:'8px',background:'#ff3b30',color:'#fff',borderRadius:'99px',padding:'1px 7px',fontSize:'12px'}},'Awaiting reply'),h('div',{class:'muted small-t'},list[list.length-1].body.slice(0,100))),h('div',{class:'acts'},h('button',{class:'btn primary',onclick:()=>thread(k,list)},'Open'))));
  });
  function thread(uid,list){
    sheet('Conversation',(b,close)=>{
      const wrap=h('div',{class:'chat-wrap'},list.map(m=>h('div',{class:'bubble '+(m.from_team?'me':'them')},m.body,h('small',null,fmtDate(m.created_at,{day:'numeric',month:'short'})+' '+fmtTime(m.created_at)))));
      const ta=h('textarea',{maxlength:'1000',placeholder:'Reply as Lukks Team'});
      b.append(wrap,ta,h('button',{class:'btn primary block',style:{marginTop:'8px'},onclick:e=>guard(e.currentTarget,async()=>{if(!ta.value.trim())return;const x=await sb.from('messages').insert({sender_id:Auth.user.id,recipient_id:uid,body:ta.value.trim()});if(x.error)throw x.error;toast('Sent','ok');close();msgs(main);})},'Send reply'));
    });
  }
}
(async()=>{await Auth.init();start();Auth.on(ev=>{if(ev==='signout')loginView();});})();
