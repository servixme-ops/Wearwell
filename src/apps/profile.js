/* ---------- LUKKS: your style hub (profile, lukks, discover, shareable link) ---------- */
defApp({id:'profile',name:'Lukks',bg:'linear-gradient(#a89bdc,#6f5fb8)',glyph:()=>`<svg viewBox="0 0 60 60"><circle cx="30" cy="22" r="9" fill="#fff"/><path d="M13 47c1.500-9 8-14 17-14s15.500 5 17 14z" fill="#fff"/><path d="M44 8l1.600 4.400L50 14l-4.400 1.600L44 20l-1.600-4.400L38 14l4.400-1.600z" fill="#ffe08a"/></svg>`,
mount(el,ctx,live){
  let view='me',tab='lukks',q='',favOnly=false,sort='new',data=null,feed=null,feedQ='';
  const root=h('div',{class:'lk'});el.append(root);
  const S=(title,fn)=>sheet(title,(body,close)=>{const n=fn(close);if(n)body.append(n);});
  const goReceipt=intent=>ctx.open('receipt',intent);
  const completion=()=>{const p=Auth.profile||{},n=data?data.looks.length:0;return[
    ['Add a profile photo',!!p.avatar_url,()=>ctx.open('account')],['Add your name',!!p.display_name,editSheet],['Write a short bio',!!p.bio,editSheet],
    ['Add your style tags',!!p.style,editSheet],['Add your first lukk',n>0,()=>goReceipt({add:1})],['Make your profile shareable',!!p.is_public,shareSheet]];};

  async function load(){
    if(!Auth.user)return;
    const [l,i,c,g]=await Promise.all([sb.from('looks').select('*').eq('user_id',Auth.user.id).order('created_at',{ascending:false}),sb.from('look_items').select('*').eq('user_id',Auth.user.id),sb.from('collections').select('*').eq('user_id',Auth.user.id),sb.from('photos').select('*').eq('user_id',Auth.user.id).eq('status','approved')]);
    data={looks:l.data||[],items:i.data||[],cols:c.data||[],photos:g.data||[]};
  }
  async function draw(){
    root.className='lk';
    if(!Auth.user){root.replaceChildren(appBar({title:'Lukks',onBack:ctx.close,backLabel:'Back'}),gate(ctx,'Sign in to showcase your style, share your profile and discover others.','signup'));return;}
    if(view==='discover')return drawDiscover();
    if(!data){root.replaceChildren(appBar({title:'Lukks',onBack:ctx.close,backLabel:'Back'}),spinner());try{await load();}catch(e){root.replaceChildren(appBar({title:'Lukks',onBack:ctx.close,backLabel:'Back'}),empty('Could not load',errMsg(e),h('button',{class:'btn',onclick:()=>draw()},'Try again')));return;}}
    drawMe();
  }
  function ring(pct){const r=44,c=2*Math.PI*r;return h('div',{class:'lk-ring',html:`<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="${r}" class="bg"/><circle cx="50" cy="50" r="${r}" class="fg" stroke-dasharray="${c}" stroke-dashoffset="${c*(1-pct/100)}" transform="rotate(-90 50 50)"/></svg>`});}
  function shell(content,active){
    const nb=(id,ic,label,fn)=>h('button',{class:'lk-nb'+(active===id?' on':''),onclick:fn},icon(ic),h('span',null,label));
    return[content,h('nav',{class:'lk-bar'},nb('discover','globe','Discover',()=>{view='discover';draw();}),nb('cal','cal','Calendar',()=>ctx.open('calendar')),
      h('button',{class:'lk-plus','aria-label':'Add a lukk',onclick:()=>goReceipt({add:1})},icon('plus')),nb('rc','receipt','Receipts',()=>goReceipt()),nb('me','sparkle','Lukks',()=>{view='me';draw();}))];
  }
  function drawMe(){
    const p=Auth.profile||{},steps=completion(),done=steps.filter(s=>s[1]).length,pct=Math.round(done/steps.length*100);
    const head=h('header',{class:'lk-head'},
      h('div',{class:'lk-top'},h('button',{class:'lk-x','aria-label':'Back',onclick:ctx.close},icon('back')),h('span',{class:'grow'}),h('button',{class:'lk-x','aria-label':'Menu',onclick:menu},icon('dots'))),
      h('div',{class:'lk-avwrap'},ring(pct),avatarEl(p,'lk-av'),h('span',{class:'lk-pct'},pct+'%')),
      h('div',{class:'lk-round'},
        h('button',{onclick:()=>{favOnly=!favOnly;drawMe();}},h('i',{class:favOnly?'on':''},icon('heart')),h('span',null,'Saved')),
        h('button',{onclick:themeSheet},h('i',null,icon('sparkle')),h('span',null,'Theme')),
        h('button',{onclick:statsSheet},h('i',null,icon('receipt')),h('span',null,'Stats'))));
    const card=h('div',{class:'lk-card'},h('b',null,p.display_name||p.username||'Your name'),h('span',null,'@'+(p.username||'username')),p.bio&&h('p',null,p.bio),
      p.style&&h('div',{class:'lk-tags'},String(p.style).split(/[,·|]/).map(s=>s.trim()).filter(Boolean).slice(0,6).map(s=>h('em',null,s))));
    const tabs=h('div',{class:'lk-tabs'},[['lukks','Lukks',data.looks.length],['pieces','Pieces',data.items.length],['gallery','Gallery',data.photos.length],['cols','Collections',data.cols.length]].map(t=>h('button',{class:tab===t[0]?'on':'',onclick:()=>{tab=t[0];drawMe();}},h('b',null,t[2]),h('span',null,t[1]))));
    const body=h('div',{class:'lk-body'});
    if(done<steps.length)body.append(h('div',{class:'lk-check'},h('b',null,'Finish setting up'),h('span',null,done+' of '+steps.length+' done'),
      steps.map(s=>h('button',{class:s[1]?'done':'',onclick:s[1]?null:s[2]},h('i',null,s[1]?icon('check'):null),s[0]))));
    const qi=h('input',{type:'search',placeholder:'Search your lukks',value:q,'aria-label':'Search your lukks'});qi.oninput=()=>{q=qi.value;list();};
    body.append(h('div',{class:'lk-tools'},h('label',{class:'lk-search'},icon('search'),qi),
      h('button',{class:favOnly?'on':'','aria-label':'Show favourites',onclick:()=>{favOnly=!favOnly;drawMe();}},icon('heart')),
      h('button',{'aria-label':p.is_public?'Profile is public':'Profile is private',class:p.is_public?'on':'',onclick:shareSheet},icon(p.is_public?'eye':'eyeOff')),
      h('button',{'aria-label':'Sort',onclick:()=>{sort=sort==='new'?'wears':sort==='wears'?'name':'new';toast('Sorted by '+({new:'newest',wears:'most worn',name:'name'})[sort]);list();}},icon('sliders'))));
    const out=h('div',{class:'lk-list'});body.append(out);
    function list(){
      out.replaceChildren();const s=q.trim().toLowerCase();
      if(tab==='lukks'){
        let ls=data.looks.filter(l=>(!favOnly||l.favourite)&&(!s||(l.title||'').toLowerCase().includes(s)||data.items.some(i=>i.look_id===l.id&&((i.name||'')+' '+(i.brand||'')).toLowerCase().includes(s))));
        ls=ls.slice().sort((a,b)=>sort==='wears'?(b.wear_count||0)-(a.wear_count||0):sort==='name'?(a.title||'').localeCompare(b.title||''):0);
        if(!ls.length){out.append(collage(data.looks.length?'No lukks match':'Hit the plus button to start styling',data.looks.length?'Try another search.':'Add an outfit with a photo and the pieces you wore.'));return;}
        out.append(h('div',{class:'rc-grid'},ls.map(l=>{const c=RC.calc(l,data.items.filter(i=>i.look_id===l.id));return h('button',{class:'rc-card',onclick:()=>goReceipt({look:l.id})},l.photo_path?h('img',{src:publicUrl('looks',l.photo_path),alt:'',loading:'lazy'}):h('span',{class:'rc-noimg'},icon('shirt')),l.favourite&&h('span',{class:'rc-fav'},icon('heart')),h('b',null,l.title),h('em',null,'#'+l.look_no+' · worn '+(l.wear_count||0)+'×'));})));
      }else if(tab==='pieces'){
        const its=data.items.filter(i=>!s||((i.name||'')+' '+(i.brand||'')).toLowerCase().includes(s));
        if(!its.length){out.append(collage('No pieces yet','Pieces appear here when you add them to a lukk.'));return;}
        out.append(h('div',{class:'group',style:{margin:'6px 14px'}},its.map(i=>h('div',{class:'item'},h('span',{class:'grow'},h('b',null,i.name),h('span',null,i.brand||i.category||'')),i.price!=null&&h('span',{class:'muted'},fmtMoney(i.price,'NGN'))))));
      }else if(tab==='gallery'){
        if(!data.photos.length){out.append(collage('No gallery photos','Photos you post to the community show up here once approved.'));return;}
        out.append(h('div',{class:'pv-grid',style:{padding:'6px 14px'}},data.photos.map(x=>h('figure',{style:{margin:0}},h('img',{src:publicUrl('gallery',x.path),alt:x.caption||'',loading:'lazy'})))));
      }else{
        if(!data.cols.length){out.append(collage('No collections yet','Group your lukks into collections from Lukks Receipt.'));return;}
        out.append(h('div',{class:'group',style:{margin:'6px 14px'}},data.cols.map(c=>h('button',{class:'item',onclick:()=>goReceipt()},h('span',{class:'grow'},h('b',null,c.name),h('span',null,data.looks.filter(l=>l.collection_id===c.id).length+' lukks')),h('span',{class:'chev'},icon('chevR'))))));
      }
    }
    list();
    const scroll=h('div',{class:'app-body lk-scroll'},head,card,tabs,body);
    root.className='lk lk-t-'+(PROFILE_THEMES[p.theme]?p.theme:'lilac');
    root.replaceChildren(...shell(scroll,'me'));
  }
  function collage(t,m){return h('div',{class:'lk-empty'},h('div',{class:'lk-col'},[0,1,2,3].map(i=>h('i',{class:'c'+i},icon('shirt')))),h('b',null,t),h('span',null,m));}

  /* ---------- Discover ---------- */
  async function drawDiscover(){
    const bar=appBar({title:'Discover',onBack:()=>{view='me';draw();},backLabel:'Lukks'});
    const qi=h('input',{type:'search',placeholder:'Search styles, pieces or people',value:feedQ,'aria-label':'Search'});
    const out=h('div',{class:'lk-list'});
    const scroll=h('div',{class:'app-body'},h('div',{class:'pad',style:{paddingBottom:0}},h('label',{class:'lk-search wide'},icon('search'),qi)),out);
    root.className='lk';root.replaceChildren(...shell(h('div',{class:'lk-wrap'},bar,scroll),'discover'));
    const show=()=>{
      out.replaceChildren();const s=feedQ.trim().toLowerCase();
      const fl=(feed||[]).filter(x=>!s||((x.title||'')+' '+(x.style||'')+' '+(x.username||'')+' '+(x.display_name||'')+' '+(x.items||[]).map(i=>i.name+' '+(i.brand||'')).join(' ')).toLowerCase().includes(s));
      if(!fl.length){out.append(empty(feed&&feed.length?'Nothing matches':'No public lukks yet',feed&&feed.length?'Try another search.':'Be the first: add a lukk and turn on your public profile.'));return;}
      out.append(h('div',{class:'rc-grid'},fl.map(x=>h('button',{class:'rc-card',onclick:()=>openLukk(x)},x.photo_path?h('img',{src:publicUrl('looks',x.photo_path),alt:'',loading:'lazy'}):h('span',{class:'rc-noimg'},icon('shirt')),h('b',null,x.title),h('em',null,'@'+x.username)))));
    };
    qi.oninput=()=>{feedQ=qi.value;if(feed)show();};
    if(!feed){out.append(spinner());const r=await sb.rpc('discover_lukks',{});if(r.error){out.replaceChildren(empty('Could not load Discover',errMsg(r.error),h('button',{class:'btn',onclick:()=>{feed=null;drawDiscover();}},'Try again')));return;}feed=Array.isArray(r.data)?r.data:[];}
    show();
  }
  function openLukk(x){
    S(x.title,close=>h('div',{class:'stack pad'},
      x.photo_path&&h('img',{src:publicUrl('looks',x.photo_path),alt:x.title,style:{width:'100%',borderRadius:'14px'}}),
      h('div',{class:'row-flex'},avatarEl({avatar_url:x.avatar_url,display_name:x.display_name,username:x.username}),h('span',{class:'grow'},h('b',null,x.display_name||'@'+x.username),h('br'),h('span',{class:'muted'},'@'+x.username+(x.style?' · '+x.style:'')))),
      (x.items||[]).length?h('div',{class:'group',style:{margin:0}},x.items.map(i=>h('div',{class:'item'},h('span',{class:'grow'},h('b',null,i.name),h('span',null,i.brand||'')),x.show_prices&&i.price!=null&&h('span',{class:'muted'},fmtMoney(i.price,'NGN'))))):null,
      h('button',{class:'btn block',onclick:()=>{const u=profileUrl(x.username);if(navigator.share)navigator.share({title:x.title+' on Lukks',url:u}).catch(()=>{});else copyText(u).then(()=>toast('Link copied'));}},icon('share'),'Share @'+x.username)));
  }

  /* ---------- sheets ---------- */
  function menu(){S('Lukks',close=>h('div',{class:'group',style:{margin:'8px 14px'}},
    [['Edit profile',editSheet],['Share my profile',shareSheet],['Preview public page',previewSheet],['Account & settings',()=>ctx.open('account')]].map(a=>h('button',{class:'item',onclick:()=>{close();setTimeout(a[1],120);}},h('span',{class:'grow'},h('b',null,a[0])),h('span',{class:'chev'},icon('chevR'))))));}
  function statsSheet(){
    const L=data.looks,items=data.items;const worn=L.reduce((a,l)=>a+(l.wear_count||0),0);
    const val=L.reduce((a,l)=>a+RC.calc(l,items.filter(i=>i.look_id===l.id)).total,0);
    S('Your stats',()=>h('div',{class:'group',style:{margin:'8px 14px'}},[['Lukks',L.length],['Pieces',items.length],['Times worn',worn],['Total value',fmtMoney(val,'NGN')]].map(r=>h('div',{class:'item'},h('span',{class:'grow'},h('b',null,r[0])),h('span',null,String(r[1]))))));
  }
  function themeSheet(){
    const p=Auth.profile||{};
    S('Profile theme',close=>{const box=h('div',{class:'theme-pick',style:{padding:'12px 16px 20px'}},Object.keys(PROFILE_THEMES).map(k=>h('button',{class:'t-'+k+((p.theme||'lilac')===k?' on':''),'aria-label':PROFILE_THEMES[k],onclick:e=>guard(e.currentTarget,async()=>{const r=await Auth.saveProfile({theme:k});if(r.error)throw r.error;toast('Theme saved','ok');close();drawMe();})})));return box;});
  }
  function shareSheet(){
    const p=Auth.profile||{},url=profileUrl(p.username||'');
    S('Share my Lukks profile',close=>{const w=h('div',{class:'stack pad'});
      const st={is_public:!!p.is_public,show_looks:p.show_looks!==false,show_gallery:p.show_gallery!==false,show_features:p.show_features!==false,show_wardrobe:!!p.show_wardrobe,show_prices:!!p.show_prices};
      const tg=(label,sub,key)=>h('div',{class:'item'},h('span',{class:'grow'},h('b',null,label),sub&&h('span',null,sub)),toggleEl(st[key],v=>st[key]=v,label));
      w.append(h('div',{class:'group',style:{margin:0}},tg('Make my profile public','Anyone with your link can view it','is_public'),tg('My lukks','Lukks from Lukks Receipt','show_looks'),tg('My gallery','Approved community photos','show_gallery'),tg('Featured photos','Photos featured in Lukks','show_features'),tg('My Lukks from the crate','Outfits you saved in the crate','show_wardrobe'),tg('Prices','Show what each piece cost','show_prices')),
        h('div',{class:'group',style:{margin:0}},h('div',{class:'item'},h('span',{class:'grow',style:{minWidth:0}},h('b',null,'Your link'),h('span',{style:{wordBreak:'break-all'}},url)),h('button',{class:'icon-btn','aria-label':'Copy link',onclick:async()=>toast(await copyText(url)?'Link copied':'Could not copy')},icon('copy')),
          h('button',{class:'icon-btn','aria-label':'Share link',onclick:()=>{if(navigator.share)navigator.share({title:(p.display_name||p.username)+' on Lukks',url}).catch(()=>{});else copyText(url).then(()=>toast('Link copied'));}},icon('share')))),
        h('button',{class:'btn primary block',onclick:e=>guard(e.currentTarget,async()=>{const r=await Auth.saveProfile(st);if(r.error)throw r.error;toast('Saved','ok');close();drawMe();})},'Save'),
        h('button',{class:'btn block',onclick:()=>{close();setTimeout(previewSheet,120);}},icon('eye'),'Preview public page'));return w;});
  }
  async function previewSheet(){
    const p=Auth.profile;if(!p||!p.is_public){toast('Turn on “Make my profile public” first');return shareSheet();}
    S('Public page',()=>{const b=h('div',null,spinner());sb.rpc('get_public_profile',{p_username:p.username}).then(r=>{b.replaceChildren(r.error||!r.data?empty('Could not load preview',r.error?errMsg(r.error):'Save your profile first.'):renderPublicProfile(r.data,{hideFooter:true}));});return b;});
  }
  function editSheet(){
    const p=Auth.profile||{};
    S('Edit profile',close=>{
      const dn=h('input',{type:'text',maxlength:'60',value:p.display_name||''}),bio=h('textarea',{maxlength:'240'}),st=h('input',{type:'text',maxlength:'80',value:p.style||'',placeholder:'e.g. Ankara, Streetwear, Owambe'}),sf=h('input',{type:'url',placeholder:'https://yourstore.com',value:p.storefront_url||'',inputmode:'url'});bio.value=p.bio||'';
      const cp=h('div',{class:'ad-prev'});if(p.cover_url)cp.append(h('img',{src:p.cover_url,alt:'Cover'}));
      return h('div',{class:'stack pad'},field('Display name',dn),field('Bio',bio),field('Style tags',st,'Separate with commas'),field('Online store (optional)',sf),
        h('div',{class:'f-label'},'Cover photo'),cp,
        h('button',{class:'btn block',onclick:e=>guard(e.currentTarget,async()=>{const f=await pickFile('image/jpeg,image/png,image/webp');if(!f)return;const pr=await prepareImage(f,{max:1400,maxMB:12});const path=await uploadFile('avatars',pr.blob,pr.ext,pr.type);const r=await Auth.saveProfile({cover_url:publicUrl('avatars',path)});if(r.error)throw r.error;toast('Cover updated','ok');cp.replaceChildren(h('img',{src:publicUrl('avatars',path),alt:'Cover'}));})},icon('image'),'Choose cover photo'),
        h('p',{class:'muted small-t',style:{margin:0}},'Change your profile photo and username in Account.'),
        h('button',{class:'btn primary block',onclick:e=>guard(e.currentTarget,async()=>{const sfv=sf.value.trim();if(sfv&&!safeUrl(sfv))throw new Error('Your store link is not a valid web address.');
          const r=await Auth.saveProfile({display_name:dn.value.trim()||null,bio:bio.value.trim()||null,style:st.value.trim()||null,storefront_url:sfv||null});if(r.error)throw r.error;toast('Profile saved','ok');close();drawMe();})},'Save profile'));
    });
  }
  live(()=>{data=null;feed=null;draw();});draw();
}});
