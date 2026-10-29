/* ---------- LUKKS POSTS: create/edit a post, eye-star likes, photo carousel ---------- */
const Posts={
  ph:p=>publicUrl('looks',p),
  eyeSvg(liked){return `<svg viewBox="0 0 24 28" aria-hidden="true" class="eye${liked?' on':''}"><ellipse cx="12" cy="14" rx="9.5" ry="12" class="e"/><path class="s" d="M12 6.500l1.900 5.100L19 13.500l-5.100 1.900L12 20.500l-1.900-5.100L5 13.500l5.100-1.900z"/></svg>`;},
  /* Like button: the black eye with the sparkle from the Lukks logo, with a count */
  likeBtn(x,authed){
    const b=h('button',{class:'lx-like'+(x.liked?' on':''),'aria-label':'Like','aria-pressed':String(!!x.liked)});
    const draw=()=>{b.classList.toggle('on',!!x.liked);b.setAttribute('aria-pressed',String(!!x.liked));b.innerHTML=Posts.eyeSvg(x.liked)+`<b>${x.like_count||0}</b>`;};
    draw();
    b.onclick=async e=>{
      e.stopPropagation();if(authed&&!authed())return;if(b._busy)return;b._busy=true;
      const was=!!x.liked;x.liked=!was;x.like_count=Math.max(0,(x.like_count||0)+(was?-1:1));draw();if(!was){b.classList.add('pop');setTimeout(()=>b.classList.remove('pop'),420);Sound&&Sound.tap&&Sound.tap();}
      const r=was?await sb.from('post_likes').delete().eq('post_id',x.id).eq('user_id',Auth.user.id):await sb.from('post_likes').insert({post_id:x.id,user_id:Auth.user.id});
      if(r.error&&!(r.error.code==='23505')){x.liked=was;x.like_count=Math.max(0,(x.like_count||0)+(was?1:-1));draw();toast(errMsg(r.error),'err');}
      b._busy=false;
    };
    return b;
  },
  carousel(photos,alt){
    const wrap=h('div',{class:'lx-car'});const sc=h('div',{class:'lx-carsc'},photos.map(p=>h('img',{src:Posts.ph(p),alt:alt||'',loading:'lazy'})));
    wrap.append(sc);
    if(photos.length>1){const dots=h('div',{class:'lx-dots'},photos.map((_,i)=>h('i',{class:i?'':'on'})));wrap.append(dots);
      sc.addEventListener('scroll',()=>{const i=Math.round(sc.scrollLeft/Math.max(1,sc.clientWidth));[...dots.children].forEach((d,k)=>d.classList.toggle('on',k===i));},{passive:true});}
    return wrap;
  },
  /* Create or edit a post. existing = a post object from discover_posts */
  cleanStyle(s){s=String(s||'').trim().replace(/\s+/g,' ').slice(0,30);if(!s)return null;const all=[].concat(...Object.values(CFG.categories));const m=all.find(c=>c.toLowerCase()===s.toLowerCase());return m||s.replace(/\b([a-z])/g,(x,c)=>c.toUpperCase());},
  async compose(existing,onDone,extraStyles){
    if(!Auth.user){toast('Sign in to post','err');return;}
    let recs=[];try{const r=await sb.from('looks').select('id,title').eq('user_id',Auth.user.id).order('created_at',{ascending:false});recs=r.data||[];}catch(e){}
    const items=(existing?existing.photos:[]).map(p=>({path:p}));   // {path} existing or {blob,ext,type,url} new
    sheet(existing?'Edit lukk':'New lukk',(b,close)=>{
      const grid=h('div',{class:'lx-pgrid'});
      const title=h('input',{type:'text',maxlength:'100',placeholder:'Give your lukk a title',value:existing?existing.title:''}),
        det=h('textarea',{maxlength:'1000',placeholder:'Tell people about this lukk: what you wore, where it is from…'}),
        link=h('input',{type:'url',inputmode:'url',maxlength:'500',placeholder:'https://… (optional link to see more)',value:existing&&existing.external_url||''}),
        cat=h('input',{type:'text',maxlength:'30',list:'lxStyles',placeholder:'Pick a style or type your own',value:existing&&existing.category||''}),dl=h('datalist',{id:'lxStyles'},[].concat(...Object.values(CFG.categories)).concat(extraStyles||[]).map(c=>h('option',{value:c}))),
        rec=h('select',null,h('option',{value:''},'No receipt'),recs.map(r=>h('option',{value:r.id,selected:existing&&existing.receipt_id===r.id},r.title)));
      det.value=existing&&existing.details||'';
      const draw=()=>{grid.replaceChildren(...items.map((it,i)=>h('div',{class:'lx-pthumb'+(i===0?' cover':'')},h('img',{src:it.url||Posts.ph(it.path),alt:''}),i===0?h('em',null,'Cover'):h('button',{class:'mk','aria-label':'Make cover',onclick:()=>{items.unshift(items.splice(i,1)[0]);draw();}},'Cover'),h('button',{class:'rm','aria-label':'Remove photo',onclick:()=>{items.splice(i,1);draw();}},icon('close')))).concat([
        items.length<8?h('button',{class:'lx-padd',onclick:async()=>{try{const f=await pickFile('image/jpeg,image/png,image/webp');if(!f)return;const pr=await prepareImage(f,{max:1600,maxMB:12});items.push({blob:pr.blob,ext:pr.ext,type:pr.type,url:URL.createObjectURL(pr.blob)});draw();}catch(e){toast(errMsg(e),'err');}}},icon('plus'),h('span',null,items.length?'Add more':'Add photo')):null]).filter(Boolean));};
      draw();
      const err=h('p',{class:'err-t',role:'alert'});
      b.append(h('div',{class:'stack pad'},h('div',{class:'f-label'},'Photos (the first one is the cover)'),grid,field('Title',title),field('Details',det),field('Link',link),field('Style',cat,'Type your own style if it is not listed. Styles with plenty of lukks appear on the home screen.'),dl,field('Tag a receipt',rec,'Show the pieces and cost per wear on this lukk'),err,
        h('p',{class:'muted small-t',style:{margin:0}},'Lukks are public. Anyone can see them.'),
        h('button',{class:'btn primary block',onclick:e=>guard(e.currentTarget,async()=>{
          err.textContent='';try{
            const t=title.value.trim();if(!t)throw new Error('Add a title.');if(!items.length)throw new Error('Add at least one photo.');
            let u=link.value.trim();if(u){u=safeUrl(u);if(!u)throw new Error('The link is not a valid web address.');}
            const row={title:t,details:det.value.trim()||null,category:Posts.cleanStyle(cat.value),external_url:u||null,receipt_id:rec.value||null};
            let id;
            if(existing){const r=await sb.from('posts').update(row).eq('id',existing.id);if(r.error)throw r.error;id=existing.id;}
            else{const r=await sb.from('posts').insert(Object.assign({user_id:Auth.user.id},row)).select().single();if(r.error)throw r.error;id=r.data.id;}
            const paths=[];for(const it of items){paths.push(it.path||await uploadFile('looks',it.blob,it.ext,it.type));}
            if(existing){const d=await sb.from('post_photos').delete().eq('post_id',id);if(d.error)throw d.error;existing.photos.filter(p=>!paths.includes(p)).forEach(p=>removeFile('looks',p));}
            const ins=await sb.from('post_photos').insert(paths.map((p,i)=>({post_id:id,path:p,sort:i})));if(ins.error)throw ins.error;
            toast(existing?'Saved':'Posted','ok');close();onDone&&onDone(id);
          }catch(ex){err.textContent=errMsg(ex);}
        })},existing?'Save changes':'Post lukk')));
    });
  }
};
