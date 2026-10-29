/* ---------- PROFILE: your name, banner and lukks (shareable page) ---------- */
defApp({id:'profile',name:'Profile',bg:'linear-gradient(#ff7a3d,#ff2d8a)',glyph:()=>`<svg viewBox="0 0 60 60"><circle cx="30" cy="22" r="9" fill="#fff"/><path d="M13 47c1.500-9 8-14 17-14s15.500 5 17 14z" fill="#fff"/></svg>`,
mount(el,ctx,live){
  let q='',favOnly=false,sort='new',data=null;
  const root=h('div',{class:'lk lk-prof'});el.append(root);
  const S=(title,fn)=>sheet(title,(body,close)=>{const n=fn(close);if(n)body.append(n);});
  const goReceipt=intent=>ctx.open('receipt',intent);
  async function load(){
    if(!Auth.user)return;
    const l=await sb.from('looks').select('*').eq('user_id',Auth.user.id).order('created_at',{ascending:false});
    if(l.error)throw l.error;data={looks:l.data||[]};
  }
  async function draw(){
    if(!Auth.user){root.replaceChildren(appBar({title:'Profile',onBack:ctx.close,backLabel:'Back'}),gate(ctx,'Sign in to showcase your style and share your profile.','signup'));return;}
    if(!data){root.replaceChildren(appBar({title:'Profile',onBack:ctx.close,backLabel:'Back'}),spinner());try{await load();}catch(e){root.replaceChildren(appBar({title:'Profile',onBack:ctx.close,backLabel:'Back'}),empty('Could not load',errMsg(e),h('button',{class:'btn',onclick:()=>draw()},'Try again')));return;}}
    drawMe();
  }
  const upload=(bucketField)=>pickFile('image/jpeg,image/png,image/webp').then(async f=>{if(!f)return false;const pr=await prepareImage(f,{max:bucketField==='cover_url'?1600:600,maxMB:12});const path=await uploadFile('avatars',pr.blob,pr.ext,pr.type);const r=await Auth.saveProfile({[bucketField]:publicUrl('avatars',path)});if(r.error)throw r.error;return true;});
  function drawMe(){
    const p=Auth.profile||{};
    const head=h('header',{class:'lk-head',style:p.cover_url?{backgroundImage:`linear-gradient(rgba(0,0,0,.05),rgba(0,0,0,.35)),url("${p.cover_url}")`}:null},
      h('div',{class:'lk-top'},h('button',{class:'lk-x','aria-label':'Back',onclick:ctx.close},icon('back')),h('span',{class:'grow'}),h('button',{class:'lk-x','aria-label':'Menu',onclick:menu},icon('dots'))));
    const av=h('button',{class:'lk-avbtn','aria-label':'Change profile photo',onclick:e=>guard(e.currentTarget,async()=>{if(await upload('avatar_url')){toast('Photo updated','ok');drawMe();}})},avatarEl(p,'lk-av'));
    const card=h('div',{class:'lk-id'},av,h('b',null,p.display_name||p.username||'Your name'),h('span',null,'@'+(p.username||'username')));
    const qi=h('input',{type:'search',placeholder:'Search your lukks',value:q,'aria-label':'Search your lukks'});qi.oninput=()=>{q=qi.value;list();};
    const tools=h('div',{class:'lk-tools'},h('label',{class:'lk-search'},icon('search'),qi),
      h('button',{class:favOnly?'on':'','aria-label':'Show favourites',onclick:()=>{favOnly=!favOnly;drawMe();}},icon('heart')),
      h('button',{'aria-label':p.is_public?'Profile is public':'Profile is private',class:p.is_public?'on':'',onclick:shareSheet},icon(p.is_public?'eye':'eyeOff')),
      h('button',{'aria-label':'Sort',onclick:()=>{sort=sort==='new'?'wears':sort==='wears'?'name':'new';toast('Sorted by '+({new:'newest',wears:'most worn',name:'name'})[sort]);list();}},icon('sliders')));
    const out=h('div',{class:'lk-list'});
    function list(){
      out.replaceChildren();const s=q.trim().toLowerCase();
      let ls=data.looks.filter(l=>(!favOnly||l.favourite)&&(!s||(l.title||'').toLowerCase().includes(s)||(l.category||'').toLowerCase().includes(s)));
      ls=ls.slice().sort((a,b)=>sort==='wears'?(b.wear_count||0)-(a.wear_count||0):sort==='name'?(a.title||'').localeCompare(b.title||''):0);
      if(!ls.length){out.append(collage(data.looks.length?'No lukks match':'Hit the plus button to add your first lukk',data.looks.length?'Try another search.':'Add a photo of an outfit and share it with everyone.'));return;}
      out.append(h('div',{class:'rc-grid'},ls.map(l=>h('button',{class:'rc-card',onclick:()=>goReceipt({look:l.id})},l.photo_path?h('img',{src:publicUrl('looks',l.photo_path),alt:'',loading:'lazy'}):h('span',{class:'rc-noimg'},icon('shirt')),l.favourite&&h('span',{class:'rc-fav'},icon('heart')),h('b',null,l.title),h('em',null,(l.category||'No category')+(l.is_public?'':' · private'))))));
    }
    list();
    const scroll=h('div',{class:'app-body lk-scroll'},head,card,tools,out);
    root.replaceChildren(scroll,h('button',{class:'lk-fab','aria-label':'Add a lukk',onclick:()=>goReceipt({add:1})},icon('plus')));
  }
  function collage(t,m){return h('div',{class:'lk-empty'},h('div',{class:'lk-col'},[0,1,2,3].map(i=>h('i',{class:'c'+i},icon('shirt')))),h('b',null,t),h('span',null,m));}
  function menu(){S('Profile',close=>h('div',{class:'group',style:{margin:'8px 14px'}},
    [['Edit name',editSheet],['Change banner',()=>guard(null,async()=>{if(await upload('cover_url')){toast('Banner updated','ok');drawMe();}})],['Share my profile',shareSheet],['Account & settings',()=>ctx.open('account')]].map(a=>h('button',{class:'item',onclick:()=>{close();setTimeout(a[1],120);}},h('span',{class:'grow'},h('b',null,a[0])),h('span',{class:'chev'},icon('chevR'))))));}
  function shareSheet(){
    const p=Auth.profile||{},url=profileUrl(p.username||'');
    S('Share my profile',close=>{const st={is_public:!!p.is_public,show_prices:!!p.show_prices};
      const tg=(label,sub,key)=>h('div',{class:'item'},h('span',{class:'grow'},h('b',null,label),sub&&h('span',null,sub)),toggleEl(st[key],v=>st[key]=v,label));
      return h('div',{class:'stack pad'},h('div',{class:'group',style:{margin:0}},tg('Make my profile public','Anyone with your link can see your lukks','is_public'),tg('Show prices','Show what each piece cost','show_prices')),
        h('div',{class:'group',style:{margin:0}},h('div',{class:'item'},h('span',{class:'grow',style:{minWidth:0}},h('b',null,'Your link'),h('span',{style:{wordBreak:'break-all'}},url)),h('button',{class:'icon-btn','aria-label':'Copy link',onclick:async()=>toast(await copyText(url)?'Link copied':'Could not copy')},icon('copy')),
          h('button',{class:'icon-btn','aria-label':'Share link',onclick:()=>{if(navigator.share)navigator.share({title:(p.display_name||p.username)+' on Lukks',url}).catch(()=>{});else copyText(url).then(()=>toast('Link copied'));}},icon('share')))),
        h('button',{class:'btn primary block',onclick:e=>guard(e.currentTarget,async()=>{const r=await Auth.saveProfile(Object.assign({show_looks:true},st));if(r.error)throw r.error;toast('Saved','ok');close();drawMe();})},'Save'));});
  }
  function editSheet(){
    const p=Auth.profile||{};
    S('Edit name',close=>{const dn=h('input',{type:'text',maxlength:'60',value:p.display_name||''});
      return h('div',{class:'stack pad'},field('Name',dn),h('p',{class:'muted small-t',style:{margin:0}},'Change your username in Account.'),
        h('button',{class:'btn primary block',onclick:e=>guard(e.currentTarget,async()=>{const r=await Auth.saveProfile({display_name:dn.value.trim()||null});if(r.error)throw r.error;toast('Saved','ok');close();drawMe();})},'Save'));});
  }
  live(()=>{data=null;draw();});draw();
}});
