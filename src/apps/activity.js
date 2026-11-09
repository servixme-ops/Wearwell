/* ---------- NOTIFICATIONS app: every like, comment, follow, group and challenge update, with quick actions ---------- */
defApp({id:'activity',name:'Notifications',hidden:true,bg:'linear-gradient(#ff5a5f,#ff2d55)',glyph:()=>`<svg viewBox="0 0 60 60"><path d="M30 14c-8 0-13 6-13 14v7l-4 6h34l-4-6v-7c0-8-5-14-13-14z" fill="#fff"/><path d="M25 46a5 5 0 0 0 10 0z" fill="#fff"/></svg>`,
mount(el,ctx,live){
  const root=h('div',{class:'msg-root act-root'});el.append(root);
  let rows=[],tab='all',busy=false;
  const kindOf=n=>{const t=(n.title||'').toLowerCase();
    if(/liked/.test(t))return{k:'like',ic:'heart',c:'#ff2d55'};
    if(/commented/.test(t))return{k:'comment',ic:'chat',c:'#0a84ff'};
    if(/lukking you/.test(t))return{k:'follow',ic:'user',c:'#af52de'};
    if(/joined|new post in/.test(t))return{k:'group',ic:'people',c:'#34c759'};
    if(/voted|badge|won/.test(t))return{k:'win',ic:'trophy',c:'#ff9f0a'};
    if(/magazine/.test(t))return{k:'mag',ic:'bookmark',c:'#ff6a2a'};
    return{k:'other',ic:'bell',c:'#8e8e93'};};
  const DAY=864e5;
  async function load(){
    if(!Auth.user){root.replaceChildren(appBar({title:'Notifications',onBack:ctx.close,backLabel:'Back'}),appBody(gate(ctx,'Sign in to see likes, comments, new lukkers and group activity.')));return;}
    const r=await sb.from('notifications').select('*').order('created_at',{ascending:false}).limit(120);
    if(r.error){root.replaceChildren(appBar({title:'Notifications',onBack:ctx.close,backLabel:'Back'}),appBody(empty('Could not load',errMsg(r.error),h('button',{class:'btn',onclick:()=>{root.replaceChildren(appBar({title:'Notifications',onBack:ctx.close,backLabel:'Back'}),spinner());load();}},'Try again'))));return;}
    rows=r.data||[];draw();
  }
  async function markRead(ids){
    if(!ids.length)return;rows.forEach(x=>{if(ids.includes(x.id))x.read=true;});
    await sb.from('notifications').update({read:true}).in('id',ids);Notifs._rows=Notifs._rows.filter(x=>!ids.includes(x.id));Notifs.items=Notifs.items.filter(i=>!ids.includes(i.dbId));Notifs.paintBadges();Phone.renderNotifs();
  }
  async function remove(n){
    rows=rows.filter(x=>x.id!==n.id);draw();
    await sb.from('notifications').delete().eq('id',n.id);Notifs._rows=Notifs._rows.filter(x=>x.id!==n.id);Notifs.items=Notifs.items.filter(i=>i.dbId!==n.id);Notifs.paintBadges();Phone.renderNotifs();
  }
  function open(n){
    markRead([n.id]);draw();
    const p=n.payload||{};ctx.open(n.app||'lukks',p);
  }
  function actions(n,K){
    const p=n.payload||{},out=[];
    if(K.k==='follow'&&p.profile)out.push(h('button',{class:'btn small primary',onclick:async e=>{e.stopPropagation();await guard(e.currentTarget,async()=>{const u=await sb.rpc('profile_summary',{p_username:p.profile});const d=u.data;if(!d)throw new Error('Profile not found.');if(d.is_following){toast('Already lukking '+(d.display_name||'@'+p.profile));return;}const r=await sb.from('follows').insert({follower_id:Auth.user.id,followee_id:d.id});if(r.error)throw r.error;toast('Lukking back','ok');});}},'Lukk back'));
    if(p.post||p.group||p.challenge||p.profile)out.push(h('button',{class:'btn small',onclick:e=>{e.stopPropagation();open(n);}},K.k==='follow'?'View profile':K.k==='like'||K.k==='comment'&&p.post?'View lukk':p.group?'Open group':p.challenge?'See challenge':'View'));
    out.push(h('button',{class:'btn small danger',onclick:e=>{e.stopPropagation();remove(n);}},'Delete'));
    return out;
  }
  function card(n){
    const K=kindOf(n);
    return h('div',{class:'act-card'+(n.read?'':' unread'),role:'button',tabindex:'0',onclick:()=>open(n)},
      h('span',{class:'act-ic',style:{background:K.c}},icon(K.ic)),
      h('div',{class:'act-txt'},h('b',null,n.title),n.body?h('span',{class:'act-body'},n.body):null,h('em',null,timeAgo(new Date(n.created_at).getTime())),
        h('div',{class:'act-btns'},actions(n,K))),
      n.read?null:h('i',{class:'act-dot','aria-label':'Unread'}));
  }
  function draw(){
    const unread=rows.filter(x=>!x.read).length;
    const filt=x=>tab==='all'||(tab==='unread'?!x.read:kindOf(x).k===tab);
    const tabs=[['all','All'],['unread','Unread'+(unread?' ('+unread+')':'')],['like','Likes'],['comment','Comments'],['follow','Followers'],['group','Groups'],['win','Challenges']];
    const list=rows.filter(filt);
    const body=appBody(h('div',{class:'pill-tabs act-tabs'},tabs.map(t=>h('button',{class:tab===t[0]?'on':'',onclick:()=>{tab=t[0];draw();}},t[1]))));
    if(!list.length)body.append(empty(tab==='all'?'Nothing yet':'Nothing here','Likes, comments, new lukkers and group activity will show up here.'));
    else{
      const now=Date.now(),groups=[['New',x=>!x.read],['Today',x=>x.read&&now-new Date(x.created_at)<DAY],['Earlier',x=>x.read&&now-new Date(x.created_at)>=DAY]];
      groups.forEach(([label,f])=>{const g=list.filter(f);if(!g.length)return;body.append(h('h3',{class:'act-h'},label),h('div',{class:'act-list'},g.map(card)));});
    }
    root.replaceChildren(appBar({title:'Notifications',onBack:ctx.close,backLabel:'Back',right:unread?h('button',{class:'icon-btn',style:{fontSize:'14px',fontWeight:'600'},onclick:()=>{markRead(rows.filter(x=>!x.read).map(x=>x.id));draw();}},'Read all'):null}),body);
  }
  root.append(appBar({title:'Notifications',onBack:ctx.close,backLabel:'Back'}),spinner());
  load();
  live(()=>load());
  Notifs.onChange=()=>{if(Phone.app&&Phone.app.id==='activity')load();};
},unmount(){Notifs.onChange=null;}});
