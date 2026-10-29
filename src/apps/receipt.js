/* ---------- LUKKS RECEIPT: outfit archive with cost per wear ---------- */
const RC={
  CATS:['Top','Bottom','Dress','Outerwear','Shoes','Bag','Accessory','Other'],
  calc(look,items){
    const wears=look.wear_count||0;
    const rows=items.map(i=>{const price=Number(i.price)||0,denom=Math.max(1,(i.prior_wears||0)+wears);return Object.assign({},i,{price,total_wears:(i.prior_wears||0)+wears,cpw:price/denom});});
    return{rows,total:rows.reduce((s,r)=>s+r.price,0),cpw:rows.reduce((s,r)=>s+r.cpw,0),wears};
  },
  money:(n,cur)=>fmtMoney(Math.round((Number(n)||0)*100)/100,cur||'NGN'),
  async image(look,items,col){
    const c=RC.calc(look,items),cur=look.currency||'NGN',W=760,pad=48;
    const lines=c.rows.length;const cv=document.createElement('canvas');
    let photo=null;if(look.photo_path){try{photo=await imgFromSrc(publicUrl('looks',look.photo_path));}catch(e){}}
    const phH=photo?Math.round((W-pad*2)*Math.min(1.1,photo.height/photo.width)):0;
    const H=pad*2+150+phH+(photo?24:0)+lines*70+240;cv.width=W;cv.height=H;
    const g=cv.getContext('2d');g.fillStyle='#2a1710';g.fillRect(0,0,W,H);
    const x0=22;g.fillStyle='#fbf6ea';g.beginPath();g.moveTo(x0,14);
    for(let x=x0;x<W-x0;x+=16){g.lineTo(x+8,22);g.lineTo(x+16,14);}g.lineTo(W-x0,H-14);
    for(let x=W-x0;x>x0;x-=16){g.lineTo(x-8,H-22);g.lineTo(x-16,H-14);}g.closePath();g.fill();
    let y=pad+24;g.fillStyle='#2a1710';g.textAlign='center';g.font="700 34px 'Playfair Display',Georgia,serif";g.fillText('LUKKS RECEIPT',W/2,y);
    y+=30;g.font="500 17px 'Instrument Sans',Arial,sans-serif";g.fillStyle='#6a5648';g.fillText(`Lukk #${look.look_no||''} · ${fmtDate(look.created_at||new Date(),{day:'numeric',month:'short',year:'numeric'})}`,W/2,y);
    y+=30;g.fillStyle='#2a1710';g.font="700 28px 'Playfair Display',Georgia,serif";g.fillText(look.title,W/2,y);
    y+=22;if(photo){g.drawImage(photo,pad,y,W-pad*2,phH);y+=phH+22;}
    g.textAlign='left';g.font="600 17px 'Instrument Sans',Arial,sans-serif";
    const dash=yy=>{g.strokeStyle='#b9a98f';g.setLineDash([6,6]);g.beginPath();g.moveTo(pad,yy);g.lineTo(W-pad,yy);g.stroke();g.setLineDash([]);};
    dash(y);y+=34;
    c.rows.forEach(r=>{g.fillStyle='#2a1710';g.font="600 19px 'Instrument Sans',Arial,sans-serif";g.textAlign='left';g.fillText(r.name.slice(0,30),pad,y);g.textAlign='right';g.fillText(RC.money(r.price,cur),W-pad,y);
      g.font="400 15px 'Instrument Sans',Arial,sans-serif";g.fillStyle='#6a5648';g.textAlign='left';g.fillText(`${r.brand?r.brand+' · ':''}${r.total_wears} wear${r.total_wears===1?'':'s'}`,pad,y+22);g.textAlign='right';g.fillText(RC.money(r.cpw,cur)+' / wear',W-pad,y+22);y+=64;});
    dash(y-18);y+=18;g.fillStyle='#2a1710';g.font="700 22px 'Instrument Sans',Arial,sans-serif";g.textAlign='left';g.fillText('Total spent',pad,y);g.textAlign='right';g.fillText(RC.money(c.total,cur),W-pad,y);
    y+=36;g.textAlign='left';g.fillStyle='#6b1a2b';g.fillText('Cost per wear',pad,y);g.textAlign='right';g.fillText(RC.money(c.cpw,cur),W-pad,y);
    y+=32;g.fillStyle='#6a5648';g.font="500 17px 'Instrument Sans',Arial,sans-serif";g.textAlign='left';g.fillText(`Worn ${c.wears} time${c.wears===1?'':'s'}`+(look.last_worn?` · last ${fmtDate(look.last_worn+'T12:00:00',{day:'numeric',month:'short'})}`:''),pad,y);
    g.textAlign='center';g.fillStyle='#2a1710';g.font="700 14px 'Instrument Sans',Arial,sans-serif";g.fillText('LUKKS · DISCOVER NIGERIAN FASHION',W/2,H-pad+8);
    return new Promise(r=>cv.toBlob(r,'image/png'));
  }
};
defApp({id:'receipt',name:'Lukks Receipt',bg:'linear-gradient(#f7efde,#e3d2ae)',glyph:()=>`<svg viewBox="0 0 60 60"><path d="M17 10h26v40l-4.300-3-4.300 3-4.400-3-4.300 3-4.300-3L17 50z" fill="#fff" stroke="#6b1a2b" stroke-width="2.500" stroke-linejoin="round"/><path d="M23 20h14M23 27h14M23 34h8" stroke="#6b1a2b" stroke-width="2.800" stroke-linecap="round"/><path d="M33 34h4" stroke="#d9a441" stroke-width="2.800" stroke-linecap="round"/></svg>`,
mount(el,ctx,live){
  let looks=[],items={},cols=[],filter='all';
  const root=h('div',{class:'msg-root'});el.append(root);
  async function load(){
    root.replaceChildren(appBar({title:'Lukks Receipt',onBack:ctx.close,backLabel:'Back'}),appBody(spinner()));
    if(!Auth.user){return guest();}
    try{
      const [l,i,c]=await Promise.all([sb.from('looks').select('*').order('created_at',{ascending:false}),sb.from('look_items').select('*').order('created_at'),sb.from('collections').select('*').order('created_at')]);
      if(l.error)throw l.error;looks=l.data||[];items={};(i.data||[]).forEach(x=>(items[x.look_id]=items[x.look_id]||[]).push(x));cols=c.data||[];
    }catch(e){root.replaceChildren(appBar({title:'Lukks Receipt',onBack:ctx.close,backLabel:'Back'}),appBody(empty('Could not load your lukks',errMsg(e),h('button',{class:'btn',onclick:load},'Try again'))));return;}
    list();
  }
  function guest(){
    const demo={title:'Sunday Gown',look_no:1,currency:'NGN',wear_count:6,created_at:new Date().toISOString()};
    const di=[{name:'Ankara gown',brand:'Atelier Ife',price:85000,prior_wears:0},{name:'Gold sandals',brand:'',price:24000,prior_wears:4}];
    root.replaceChildren(appBar({title:'Lukks Receipt',onBack:ctx.close,backLabel:'Back'}),appBody(h('div',{class:'pad stack'},h('h3',{class:'h-large',style:{margin:0,fontSize:'24px'}},'Know what your clothes really cost'),h('p',{class:'muted',style:{margin:0}},'Log outfits, mark when you wear them and watch the cost per wear fall. Here is an example:'),receiptCard(demo,di),h('button',{class:'btn primary block',onclick:()=>ctx.open('account',{mode:'signup'})},'Create a free account to start'))));
  }
  function stats(){
    const wears=looks.reduce((s,l)=>s+(l.wear_count||0),0);
    const spent=looks.reduce((s,l)=>s+(items[l.id]||[]).reduce((a,i)=>a+(Number(i.price)||0),0),0);
    const cpws=looks.filter(l=>(items[l.id]||[]).length).map(l=>RC.calc(l,items[l.id]||[]).cpw);
    const avg=cpws.length?cpws.reduce((a,b)=>a+b,0)/cpws.length:0;
    return h('div',{class:'rc-stats'},[['Spent',RC.money(spent)],['Outfits',String(looks.length)],['Wears',String(wears)],['Avg / wear',RC.money(avg)]].map(s=>h('div',null,h('b',null,s[1]),h('span',null,s[0]))));
  }
  function list(){
    const fl=looks.filter(l=>filter==='all'||(filter==='fav'?l.favourite:l.collection_id===filter));
    const pills=h('div',{class:'pill-tabs'},[['all','All'],['fav','Favourites'],...cols.map(c=>[c.id,c.name])].map(f=>h('button',{class:filter===f[0]?'on':'',onclick:()=>{filter=f[0];list();}},f[1])),h('button',{onclick:newCol},'+ Collection'));
    const body=appBody(stats(),pills);
    if(!fl.length)body.append(empty(looks.length?'Nothing in this filter':'No lukks yet',looks.length?'Try another filter.':'Add your first outfit to start tracking cost per wear.',h('button',{class:'btn primary',onclick:()=>form()},'Add a lukk')));
    else{const g=h('div',{class:'rc-grid'});fl.forEach(l=>{const c=RC.calc(l,items[l.id]||[]);
      g.append(h('button',{class:'rc-card',onclick:()=>detail(l.id)},l.photo_path?h('img',{src:publicUrl('looks',l.photo_path),alt:'',loading:'lazy'}):h('span',{class:'rc-noimg'},icon('shirt')),l.favourite&&h('span',{class:'rc-fav'},icon('heart')),h('b',null,l.title),h('em',null,`#${l.look_no} · ${c.wears} wear${c.wears===1?'':'s'}`),h('u',null,c.rows.length?RC.money(c.cpw,l.currency)+' / wear':'No items')));});body.append(g);}
    root.replaceChildren(appBar({title:'Lukks Receipt',onBack:ctx.close,backLabel:'Back',right:h('button',{class:'icon-btn','aria-label':'Add a lukk',onclick:()=>form()},icon('plus'))}),body);
    if(ctx.intent&&ctx.intent.add){ctx.intent=null;form();}
    else if(ctx.intent&&ctx.intent.look){const id=ctx.intent.look;ctx.intent=null;detail(id);}
  }
  async function newCol(){
    const nm=h('input',{type:'text',maxlength:'40',placeholder:'e.g. Work, Owambe, Travel'});
    const v=await dialog({title:'New collection',body:nm,actions:[{label:'Cancel',value:false},{label:'Create',value:true,primary:true}]});
    if(!v||!nm.value.trim())return;const r=await sb.from('collections').insert({user_id:Auth.user.id,name:nm.value.trim()}).select().single();
    if(r.error){toast(errMsg(r.error),'err');return;}cols.push(r.data);filter=r.data.id;list();
  }
  function receiptCard(look,its){
    const c=RC.calc(look,its),cur=look.currency||'NGN';
    return h('div',{class:'receipt'},h('div',{class:'rc-brand'},'LUKKS RECEIPT'),h('div',{class:'rc-sub'},`Lukk #${look.look_no||'—'} · ${fmtDate(look.created_at||new Date(),{day:'numeric',month:'short',year:'numeric'})}`),h('h3',null,look.title),
      look.photo_path&&h('img',{class:'rc-photo',src:publicUrl('looks',look.photo_path),alt:look.title}),
      h('div',{class:'rc-lines'},c.rows.length?c.rows.map(r=>h('div',{class:'rc-line'},h('div',{class:'rc-l1'},h('span',null,r.name),h('b',null,RC.money(r.price,cur))),h('div',{class:'rc-l2'},h('span',null,(r.brand?r.brand+' · ':'')+r.total_wears+' wear'+(r.total_wears===1?'':'s')),h('span',null,RC.money(r.cpw,cur)+' / wear')))):h('p',{class:'muted small-t'},'No items added.')),
      h('div',{class:'rc-total'},h('span',null,'Total spent'),h('b',null,RC.money(c.total,cur))),h('div',{class:'rc-total cpw'},h('span',null,'Cost per wear'),h('b',null,RC.money(c.cpw,cur))),
      h('div',{class:'rc-foot'},`Worn ${c.wears} time${c.wears===1?'':'s'}`+(look.last_worn?` · last ${fmtDate(look.last_worn+'T12:00:00',{day:'numeric',month:'short'})}`:'')));
  }
  async function detail(id){
    const look=looks.find(l=>l.id===id);if(!look){list();return;}const its=items[id]||[];
    const body=appBody(h('div',{class:'pad stack'},receiptCard(look,its),
      h('button',{class:'btn primary block',onclick:e=>guard(e.currentTarget,async()=>{const r=await sb.from('wear_logs').insert({look_id:id,user_id:Auth.user.id,worn_on:isoDay(new Date())});if(r.error)throw r.error;await refreshOne(id);toast('Logged. Cost per wear updated','ok');detail(id);})},icon('check'),'I wore it today'),
      h('div',{class:'row-flex'},h('button',{class:'btn grow',onclick:()=>history_(look)},'Wear history'),h('button',{class:'btn',onclick:async e=>guard(e.currentTarget,async()=>{const r=await sb.from('looks').update({favourite:!look.favourite}).eq('id',id);if(r.error)throw r.error;look.favourite=!look.favourite;detail(id);}),'aria-label':'Favourite'},icon('heart'),look.favourite?'Favourited':'Favourite')),
      h('div',{class:'group',style:{margin:0}},h('div',{class:'item'},h('span',{class:'grow'},h('b',null,'Show on my Lukks Profile'),h('span',null,Auth.profile&&Auth.profile.is_public?'Visible on your public page':'Your profile is private right now')),toggleEl(look.is_public,async v=>{const r=await sb.from('looks').update({is_public:v}).eq('id',id);if(r.error){toast(errMsg(r.error),'err');}else{look.is_public=v;toast(v?'Shared to your profile':'Removed from your profile');}},'Share on profile'))),
      h('button',{class:'btn block',onclick:e=>guard(e.currentTarget,async()=>{const bl=await RC.image(look,its);download(bl,'lukks-receipt-'+look.look_no+'.png');toast('Saved as image','ok');})},icon('download'),'Save as image'),
      h('div',{class:'row-flex'},h('button',{class:'btn grow',onclick:()=>form(look)},icon('edit'),'Edit'),h('button',{class:'btn danger grow',onclick:async()=>{if(!await confirmBox('Delete this lukk?','Its receipt and wear history will be removed.','Delete',true))return;const r=await sb.from('looks').delete().eq('id',id);if(r.error){toast(errMsg(r.error),'err');return;}if(look.photo_path)removeFile('looks',look.photo_path);toast('Deleted');await load();}},icon('trash'),'Delete'))));
    root.replaceChildren(appBar({title:'Receipt',onBack:list,backLabel:'Back'}),body);
  }
  async function refreshOne(id){const r=await sb.from('looks').select('*').eq('id',id).single();if(r.data){const i=looks.findIndex(l=>l.id===id);looks[i]=r.data;}}
  async function history_(look){
    sheet('Wear history',async(b,close)=>{
      const draw=async()=>{const r=await sb.from('wear_logs').select('*').eq('look_id',look.id).order('worn_on',{ascending:false});const ls=r.data||[];b.replaceChildren();
        if(!ls.length)b.append(h('p',{class:'muted'},'No wears logged yet.'));
        else b.append(h('div',{class:'group'},ls.map(w=>h('div',{class:'item'},h('span',{class:'grow'},fmtDate(w.worn_on+'T12:00:00')),h('button',{class:'icon-btn','aria-label':'Delete this wear',onclick:async()=>{const x=await sb.from('wear_logs').delete().eq('id',w.id);if(x.error)toast(errMsg(x.error),'err');else{await refreshOne(look.id);await draw();}}},icon('trash'))))));};
      await draw();
    },{onClose:()=>detail(look.id)});
  }
  /* ---- add / edit ---- */
  function form(look){
    const editing=!!look;let rows=editing?(items[look.id]||[]).map(i=>({name:i.name,brand:i.brand||'',category:i.category||'Other',price:i.price,prior_wears:i.prior_wears||0})):[{name:'',brand:'',category:'Top',price:'',prior_wears:0}];
    let photo=null;
    const title=h('input',{type:'text',maxlength:'80',placeholder:'e.g. Sunday gown',value:look?look.title:''}),notes=h('textarea',{maxlength:'400'}),cur=h('select',null,['NGN','USD','GBP','EUR'].map(c=>h('option',{value:c,selected:(look?look.currency:'NGN')===c},c))),
      cat=h('select',null,h('option',{value:''},'Choose a style'),Object.keys(CFG.categories).map(g=>h('optgroup',{label:g},CFG.categories[g].map(c=>h('option',{value:c,selected:look&&look.category===c},c))))),link=h('input',{type:'url',inputmode:'url',placeholder:'https://… (optional)',maxlength:'500',value:look&&look.external_url||''}),pub=h('input',{type:'checkbox'}),
      col=h('select',null,h('option',{value:''},'No collection'),cols.map(c=>h('option',{value:c.id,selected:look&&look.collection_id===c.id},c.name)));notes.value=look&&look.notes||'';pub.checked=look?!!look.is_public:true;
    const pv=h('div',{class:'ad-prev'});if(look&&look.photo_path)pv.append(h('img',{src:publicUrl('looks',look.photo_path),alt:''}));
    const box=h('div',{class:'stack'});
    const drawRows=()=>{box.replaceChildren();rows.forEach((r,i)=>{
      const n=h('input',{type:'text',maxlength:'80',placeholder:'Item, e.g. Ankara gown',value:r.name}),b=h('input',{type:'text',maxlength:'60',placeholder:'Brand (optional)',value:r.brand}),c=h('select',null,RC.CATS.map(x=>h('option',{value:x,selected:x===r.category},x))),p=h('input',{type:'number',inputmode:'decimal',min:'0',step:'any',placeholder:'Price',value:r.price}),w=h('input',{type:'number',inputmode:'numeric',min:'0',step:'1',placeholder:'Times worn before',value:r.prior_wears});
      n.oninput=()=>r.name=n.value;b.oninput=()=>r.brand=b.value;c.onchange=()=>r.category=c.value;p.oninput=()=>r.price=p.value;w.oninput=()=>r.prior_wears=w.value;
      box.append(h('div',{class:'card stack'},n,h('div',{class:'row-flex'},b,c),h('div',{class:'row-flex'},p,w),rows.length>1&&h('button',{class:'btn small danger',onclick:()=>{rows.splice(i,1);drawRows();}},'Remove item')));});
      box.append(h('button',{class:'btn block',onclick:()=>{rows.push({name:'',brand:'',category:'Other',price:'',prior_wears:0});drawRows();}},icon('plus'),'Add an item'));};drawRows();
    const err=h('p',{class:'err-t',role:'alert'});
    const wardrobeBtn=!editing&&wardrobe.size?h('button',{class:'btn block',onclick:()=>fromWardrobe(l=>{title.value=l.name;const pr=parseInt(String(l.price).replace(/[^\d]/g,''))||'';rows=[{name:l.name,brand:l.designer,category:'Dress',price:pr,prior_wears:0}];drawRows();})},icon('shirt'),'Start from My Lukks (crate)'):null;
    root.replaceChildren(appBar({title:editing?'Edit lukk':'New lukk',onBack:()=>editing?detail(look.id):list(),backLabel:'Back'}),appBody(h('div',{class:'pad stack'},wardrobeBtn,
      h('div',{class:'f-label'},'Photo (optional)'),pv,h('button',{class:'btn block',onclick:async()=>{try{const f=await pickFile('image/jpeg,image/png,image/webp');if(!f)return;photo=await prepareImage(f,{max:1400});pv.replaceChildren(h('img',{src:URL.createObjectURL(photo.blob),alt:''}));}catch(e){toast(errMsg(e),'err');}}},icon('image'),photo||pv.firstChild?'Change photo':'Add photo'),
      field('Lukk name',title),field('Style',cat,'Where should people find this lukk?'),field('Link to see more (optional)',link,'Shop or post link shown with your lukk'),h('label',{class:'check'},pub,h('span',null,'Share this lukk on Discover and my profile')),field('Currency',cur),field('Collection',col),h('div',{class:'f-label'},'Items'),box,field('Notes',notes),err,
      h('button',{class:'btn primary block',onclick:e=>guard(e.currentTarget,async()=>{
        err.textContent='';try{
          if(!title.value.trim())throw new Error('Give this lukk a name.');
          const clean=rows.filter(r=>r.name.trim()).map(r=>{const price=Number(r.price);if(r.price===''||isNaN(price)||price<0)throw new Error('Enter a price for “'+r.name+'”.');const pw=Math.max(0,parseInt(r.prior_wears)||0);return{name:r.name.trim().slice(0,80),brand:(r.brand||'').trim().slice(0,60)||null,category:r.category||'Other',price,prior_wears:pw};});
          if(!clean.length)throw new Error('Add at least one item with a price.');
          let path=look&&look.photo_path||null;
          if(photo){const np=await uploadFile('looks',photo.blob,photo.ext,photo.type);if(path)removeFile('looks',path);path=np;}
          const row={title:title.value.trim(),notes:notes.value.trim()||null,currency:cur.value,collection_id:col.value||null,photo_path:path,category:cat.value||null,external_url:(()=>{const v=link.value.trim();if(!v)return null;const u=safeUrl(v);if(!u)throw new Error('The link is not a valid web address.');return u;})(),is_public:pub.checked};
          let id;
          if(editing){const r=await sb.from('looks').update(row).eq('id',look.id);if(r.error)throw r.error;id=look.id;const d=await sb.from('look_items').delete().eq('look_id',id);if(d.error)throw d.error;}
          else{const r=await sb.from('looks').insert(Object.assign({user_id:Auth.user.id},row)).select().single();if(r.error)throw r.error;id=r.data.id;}
          const ir=await sb.from('look_items').insert(clean.map(c=>Object.assign({look_id:id,user_id:Auth.user.id},c)));if(ir.error)throw ir.error;
          toast('Saved','ok');await load();detail(id);
        }catch(ex){err.textContent=errMsg(ex);}
      })},editing?'Save changes':'Create receipt'))));
  }
  function fromWardrobe(cb){
    ensureLooks();
    sheet('My Lukks from the crate',(b,close)=>{b.append(h('div',{class:'group'},[...wardrobe].map(id=>LOOKS[id]).filter(Boolean).map(l=>h('button',{class:'item',onclick:()=>{close();cb(l);}},h('span',{class:'grow'},h('b',null,l.name),h('span',null,l.designer+' · '+l.price)),h('span',{class:'chev'},icon('chevR'))))));});
  }
  live(load);load();
}});
