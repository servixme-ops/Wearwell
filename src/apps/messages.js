/* ---------- MESSAGES: chat with the Lukks team and replies to direct messages ---------- */
defApp({id:'messages',name:'Messages',bg:'linear-gradient(#5bf675,#0cbd2a)',dock:true,glyph:()=>`<svg viewBox="0 0 60 60"><path d="M30 12c11.6 0 21 7.4 21 16.6S41.600 45.200 30 45.200c-2.200 0-4.300-.3-6.300-.8-3 2.600-6.700 3.800-10.500 3.600 2.300-2 3.700-4.300 4-6.800C13.400 38.600 9 33.900 9 28.600 9 19.400 18.400 12 30 12z" fill="#fff"/></svg>`,
mount(el,ctx,live){
  let threads=[],cur=null,ch=null,msgs=[];
  const root=h('div',{class:'msg-root'});el.append(root);
  const meId=()=>Auth.user&&Auth.user.id;
  async function loadThreads(){
    root.replaceChildren(appBar({title:'Messages',onBack:ctx.close,backLabel:'Back'}));
    if(!Auth.user){root.append(appBody(gate(ctx,'Sign in to message the Lukks team.')));return;}
    const body=appBody(spinner());root.append(body);
    const r=await sb.from('messages').select('*').order('created_at',{ascending:false}).limit(300);
    if(r.error){body.replaceChildren(empty('Could not load messages',errMsg(r.error),h('button',{class:'btn',onclick:loadThreads},'Try again')));return;}
    const by={};
    (r.data||[]).forEach(m=>{const other=m.sender_id===meId()?(m.recipient_id||'team'):(m.from_team?'team':m.sender_id);(by[other]=by[other]||[]).push(m);});
    if(!by.team)by.team=[];
    threads=Object.keys(by).map(k=>({key:k,msgs:by[k],last:by[k][0],unread:by[k].filter(m=>m.recipient_id===meId()&&!m.read_at).length}));
    threads.sort((a,b)=>(b.last?new Date(b.last.created_at):Infinity)-(a.last?new Date(a.last.created_at):Infinity));
    const g=h('div',{class:'group',style:{marginTop:'12px'}});
    threads.forEach(t=>g.append(h('button',{class:'item',onclick:()=>openThread(t.key)},
      h('span',{class:'avatar'},t.key==='team'?'L':'#'),
      h('span',{class:'grow'},h('b',null,t.key==='team'?'Lukks Team':'Direct message'),h('span',null,t.last?t.last.body.slice(0,60):'Say hello. We reply as soon as we can.')),
      t.unread>0&&h('span',{class:'badge',style:{position:'static'}},String(t.unread)),t.last&&h('span',{class:'muted small-t'},timeAgo(t.last.created_at)))));
    body.replaceChildren(g);
    if(ctx.intent&&ctx.intent.thread){const k=ctx.intent.thread;ctx.intent=null;openThread(k);}
  }
  async function openThread(key){
    cur=key;msgs=[];
    const list=h('div',{class:'chat-wrap'});const scroll=h('div',{class:'app-body'},list);
    const ta=h('textarea',{rows:'1',maxlength:'1000',placeholder:'Message','aria-label':'Message'});
    const send=h('button',{class:'send','aria-label':'Send',disabled:true},icon('send'));
    ta.addEventListener('input',()=>{send.disabled=!ta.value.trim();ta.style.height='auto';ta.style.height=Math.min(110,ta.scrollHeight)+'px';});
    ta.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send.click();}});
    root.replaceChildren(appBar({title:key==='team'?'Lukks Team':'Direct message',onBack:()=>{unsub();cur=null;loadThreads();},backLabel:'Back'}),scroll,h('div',{class:'compose'},ta,send));
    const draw=()=>{list.replaceChildren();if(!msgs.length)list.append(h('p',{class:'muted',style:{textAlign:'center',margin:'30px 0'}},'No messages yet. Write the first one.'));
      msgs.forEach(m=>list.append(h('div',{class:'bubble '+(m.sender_id===meId()?'me':'them')},m.body,h('small',null,fmtTime(m.created_at)))));scroll.scrollTop=scroll.scrollHeight;};
    const q=key==='team'?sb.from('messages').select('*').or(`and(sender_id.eq.${meId()},recipient_id.is.null),and(recipient_id.eq.${meId()},from_team.eq.true)`):sb.from('messages').select('*').or(`and(sender_id.eq.${meId()},recipient_id.eq.${key}),and(sender_id.eq.${key},recipient_id.eq.${meId()})`);
    const r=await q.order('created_at');msgs=r.data||[];draw();
    const unread=msgs.filter(m=>m.recipient_id===meId()&&!m.read_at).map(m=>m.id);
    if(unread.length)sb.from('messages').update({read_at:new Date().toISOString()}).in('id',unread).then(()=>Phone.updateBadges());
    send.onclick=()=>guard(send,async()=>{
      const body=ta.value.trim();if(!body)return;
      const row={sender_id:meId(),recipient_id:key==='team'?null:key,body:body.slice(0,1000)};
      const r=await sb.from('messages').insert(row).select().single();if(r.error)throw r.error;
      ta.value='';send.disabled=true;ta.style.height='auto';if(!msgs.find(x=>x.id===r.data.id))msgs.push(r.data);draw();
    });
    unsub();
    ch=sb.channel('msg-'+meId()).on('postgres_changes',{event:'INSERT',schema:'public',table:'messages',filter:'recipient_id=eq.'+meId()},p=>{
      const m=p.new;if(cur&&((key==='team'&&m.from_team)||m.sender_id===key)){if(!msgs.find(x=>x.id===m.id)){msgs.push(m);draw();sb.from('messages').update({read_at:new Date().toISOString()}).eq('id',m.id).then(()=>{});}}
    }).subscribe();
  }
  function unsub(){if(ch&&sb){try{sb.removeChannel(ch);}catch(e){}ch=null;}}
  _msgUnsub=unsub;
  live(()=>{unsub();cur=null;loadThreads();});
  loadThreads();
},unmount(){_msgUnsub&&_msgUnsub();_msgUnsub=null;}});
var _msgUnsub=null;
