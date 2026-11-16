/* OpenWalls topics: a board for every interest, with discussions like an old-school forum (title, replies, views, last activity). */
const OWForum=(()=>{
  const rpc=async(n,a)=>{const r=await sb.rpc(n,a||{});if(r.error)throw r.error;return r.data;};
  const nm=u=>(u&&(u.display_name||(u.username&&('@'+u.username))))||'Someone';
  const para=(t)=>String(t==null?'':t).split(/\n{2,}/).map(p=>h('p',{class:'fm-p'},...p.split('\n').flatMap((l,i)=>i?[h('br'),l]:[l])));
  const who=(u,size)=>avatarEl({avatar_url:u&&u.avatar_url,display_name:u&&u.display_name,username:u&&u.username},size||'sm');
  const back=to=>h('button',{class:'fm-back','aria-label':'Back',onclick:()=>{if(to)go(to);else if(history.length>1)history.back();else go('#/discover');}},'‹');
  const toBoard=i=>go('#/forum'+(i?'/'+encodeURIComponent(i):''));

  /* one topic row */
  function row(t,showInterest){
    return h('button',{class:'fm-row'+(t.pinned?' pin':''),onclick:()=>go('#/topic/'+t.id)},
      h('div',{class:'fm-main'},
        h('div',{class:'fm-title'},t.pinned?h('span',{class:'fm-tag'},'Pinned'):null,t.locked?h('span',{class:'fm-tag lock'},'Locked'):null,t.title),
        t.snippet?h('div',{class:'fm-snip'},t.snippet):null,
        h('div',{class:'fm-meta'},showInterest?h('span',{class:'fm-int'},t.interest):null,h('span',null,'by '+nm(t.author)),h('span',null,timeAgo(t.last_activity)+' ago'))),
      h('div',{class:'fm-stat'},h('b',null,String(t.replies)),h('span',null,t.replies===1?'reply':'replies'),h('i',null,t.views+' views')));
  }

  /* the Discover section: hot topics (follows the chosen interest chip) */
  function discoverBlock(){
    const box=h('div',{class:'fm-block'});let cur=null,seq=0;
    async function load(cat){cur=cat||null;const my=++seq;
      box.replaceChildren(h('h2',{class:'sec'},'Topics & discussions'),h('p',{class:'sec-sub'},cur?'Conversations in '+cur+'.':'Join the conversation with people who share your interests.'),h('div',{class:'fm-list'},spinner()));
      let rows=[];try{rows=await rpc('forum_topics_list',{p_interest:cur,p_sort:'hot',p_limit:6,p_offset:0})||[];}catch(e){if(my!==seq)return;box.replaceChildren();return;}
      if(my!==seq)return;
      box.replaceChildren(h('h2',{class:'sec'},'Topics & discussions'),h('p',{class:'sec-sub'},cur?'Conversations in '+cur+'.':'Join the conversation with people who share your interests.'),
        rows.length?h('div',{class:'fm-list'},rows.map(t=>row(t,!cur))):h('div',{class:'fm-none'},h('b',null,cur?'No '+cur+' topics yet':'No topics yet'),h('span',null,'Be the first to start a discussion.')),
        h('div',{class:'fm-acts'},h('button',{class:'btn coral',onclick:()=>newTopic(cur)},'Start a topic'),h('button',{class:'btn',onclick:()=>toBoard(cur)},cur?'All '+cur+' topics':'Browse all topics')));
    }
    return{el:box,load};
  }

  /* a board: all topics, or one interest */
  async function boardView(interest){
    const v=setView(false);drawNav('discover');document.title='OpenWalls · '+(interest?interest+' topics':'Topics');
    const list=h('div',{class:'fm-list'}),more=h('div',{class:'ex-more'});let sort=interest?'latest':'hot',offset=0,done=false,busy=false,boards=[];
    const chips=h('div',{class:'scrollx',style:{padding:'0 18px 8px'}}),tabs=h('div',{class:'fm-tabs'});
    const drawChips=()=>chips.replaceChildren(...[null,...(boards.length?boards.map(b=>b.interest):CATS)].map(c=>{const b=boards.find(x=>x.interest===c);return h('button',{class:'chip'+((c||null)===(interest||null)?' on':''),onclick:()=>toBoard(c)},c||'All',b&&b.topics?h('small',{class:'fm-cnt'},String(b.topics)):null);}));
    const drawTabs=()=>tabs.replaceChildren(...[['hot','Hot'],['latest','Latest']].map(([k,l])=>h('button',{class:k===sort?'on':'',onclick:()=>{sort=k;offset=0;done=false;list.replaceChildren();drawTabs();load();}},l)));
    v.append(h('div',{class:'pg-head fm-head'},h('div',{class:'row-flex'},back('#/discover'),h('div',{class:'brand'},h('b',null,interest?interest+' room':'Topics'))),h('p',{class:'tag'},interest?'Discussions about '+interest.toLowerCase()+'.':'Discussions across every interest.'),
      h('button',{class:'btn coral block',style:{marginTop:'10px'},onclick:()=>newTopic(interest)},'Start a topic')),chips,tabs,list,more);
    drawChips();drawTabs();
    rpc('forum_boards').then(b=>{boards=b||[];drawChips();}).catch(()=>{});
    async function load(){if(busy||done)return;busy=true;more.replaceChildren(spinner());
      try{const rows=await rpc('forum_topics_list',{p_interest:interest||null,p_sort:sort,p_limit:20,p_offset:offset})||[];offset+=rows.length;if(rows.length<20)done=true;
        rows.forEach(t=>list.append(row(t,!interest)));
        if(!list.children.length)list.append(h('div',{class:'fm-none'},h('b',null,'No topics here yet'),h('span',null,'Start the first one.')));
        more.replaceChildren(done?null:h('button',{class:'btn',onclick:load},'Show more'));}
      catch(e){more.replaceChildren(empty('Could not load topics',friendlyError(e),h('button',{class:'btn',onclick:()=>{busy=false;load();}},'Try again')));}
      busy=false;}
    load();
  }

  /* one topic with its replies */
  async function topicView(id){
    const v=setView(false);drawNav('discover');const body=h('div',{class:'fm-topic'});v.append(body);body.append(spinner());
    let d;try{d=await rpc('forum_topic_get',{p_id:id,p_offset:0});}catch(e){body.replaceChildren(h('div',{class:'pg-head'},back('#/forum')),empty('Topic not available',friendlyError(e),h('button',{class:'btn',onclick:()=>go('#/forum')},'All topics')));return;}
    const t=d.topic;document.title='OpenWalls · '+t.title;let posts=d.posts||[],offset=posts.length;
    const postsBox=h('div',{class:'fm-posts'}),moreBox=h('div',{class:'ex-more'});
    const del=(kind,pid,after)=>async()=>{if(!await confirmBox(kind==='topic'?'Delete this topic?':'Delete this reply?','It will be removed for everyone.','Delete',true))return;try{await rpc('forum_remove',{p_kind:kind,p_id:pid});toast('Deleted','ok');after();}catch(e){toast(friendlyError(e),'err');}};
    const rep=(kind,pid)=>async()=>{try{await rpc('forum_report',{p_kind:kind,p_id:pid,p_reason:null});toast('Thanks, we will take a look','ok');}catch(e){toast(friendlyError(e),'err');}};
    const tools=(kind,pid,mine,after)=>h('div',{class:'fm-tools'},mine||d.admin?h('button',{onclick:del(kind,pid,after)},'Delete'):null,mine?null:h('button',{onclick:rep(kind,pid)},'Report'));
    const postEl=(p,n)=>h('article',{class:'fm-post'},h('div',{class:'fm-ph'},h('button',{class:'fm-who',onclick:()=>go('#/@'+p.author.username)},who(p.author),h('div',null,h('b',null,nm(p.author)),h('span',null,'@'+p.author.username+' · '+timeAgo(p.created_at)+' ago'))),h('span',{class:'fm-n'},'#'+n)),h('div',{class:'fm-body'},...para(p.body)),tools('post',p.id,p.mine,()=>topicView(id)));
    const drawPosts=()=>{postsBox.replaceChildren(...posts.map((p,i)=>postEl(p,i+1)));};
    const loadMore=async()=>{try{const x=await rpc('forum_topic_get',{p_id:id,p_offset:offset});posts=posts.concat(x.posts||[]);offset=posts.length;drawPosts();drawMore();}catch(e){toast(friendlyError(e),'err');}};
    const drawMore=()=>moreBox.replaceChildren(offset<t.replies?h('button',{class:'btn',onclick:loadMore},'Show more replies'):null);
    /* reply box */
    const ta=h('textarea',{class:'fm-ta',placeholder:'Write a reply…',maxlength:'3000',rows:'3','aria-label':'Your reply'});
    const send=h('button',{class:'btn coral'},'Post reply');
    send.onclick=()=>guard(send,async()=>{const text=ta.value.trim();if(!text){toast('Write a reply first');return;}await rpc('forum_reply',{p_topic:id,p_body:text});ta.value='';toast('Reply posted','ok');
      const x=await rpc('forum_topic_get',{p_id:id,p_offset:Math.max(0,offset)});posts=posts.concat(x.posts||[]);offset=posts.length;t.replies=Math.max(t.replies,offset);drawPosts();drawMore();setTimeout(()=>ta.scrollIntoView({block:'center',behavior:'smooth'}),50);});
    const compose=t.locked?h('p',{class:'fm-lock'},'This topic is locked. No new replies.'):h('div',{class:'fm-reply'},ta,h('div',{class:'row-flex',style:{justifyContent:'flex-end'}},send));
    body.replaceChildren(
      h('div',{class:'pg-head fm-head'},h('div',{class:'row-flex'},back(),h('button',{class:'fm-int',onclick:()=>toBoard(t.interest)},t.interest+' room'))),
      h('div',{class:'fm-op'},h('h1',{class:'fm-h1'},t.pinned?h('span',{class:'fm-tag'},'Pinned'):null,t.locked?h('span',{class:'fm-tag lock'},'Locked'):null,t.title),
        h('div',{class:'fm-ph'},h('button',{class:'fm-who',onclick:()=>go('#/@'+t.author.username)},who(t.author),h('div',null,h('b',null,nm(t.author)),h('span',null,'@'+t.author.username+' · '+timeAgo(t.created_at)+' ago · '+t.views+' views'))),h('span',{class:'fm-n'},t.replies+(t.replies===1?' reply':' replies'))),
        h('div',{class:'fm-body'},...para(t.body)),tools('topic',t.id,t.mine,()=>go('#/forum/'+encodeURIComponent(t.interest)))),
      h('h3',{class:'fm-rh'},t.replies?'Replies':'No replies yet'),postsBox,moreBox,compose);
    drawPosts();drawMore();
  }

  /* start a topic */
  function newTopic(interest){
    if(!needAuth('Sign in to start a topic'))return;
    sheet('Start a topic',(b,close)=>{
      let pick=interest||null;const chipsEl=h('div',{class:'chips'});const pc=()=>chipsEl.replaceChildren(...CATS.map(c=>h('button',{class:'chip'+(c===pick?' on':''),onclick:()=>{pick=c;pc();}},c)));pc();
      const ti=h('input',{type:'text',placeholder:'A clear title for your topic',maxlength:'140','aria-label':'Title'}),tx=h('textarea',{placeholder:'What do you want to talk about?',maxlength:'5000',rows:'6','aria-label':'Your post'});
      const go_=h('button',{class:'btn coral block',style:{marginTop:'14px'}},'Post topic');
      go_.onclick=()=>guard(go_,async()=>{
        if(!pick){toast('Pick an interest for your topic','err');return;}
        if(ti.value.trim().length<4){toast('Give your topic a title (4+ characters)','err');ti.focus();return;}
        if(!tx.value.trim()){toast('Write something to start the discussion','err');tx.focus();return;}
        const id=await rpc('forum_topic_create',{p_interest:pick,p_title:ti.value.trim(),p_body:tx.value.trim()});close();toast('Topic posted','ok');go('#/topic/'+id);});
      b.append(h('div',{class:'f-label'},'Interest room'),chipsEl,h('div',{class:'f-label',style:{margin:'12px 0 6px'}},'Title'),ti,h('div',{class:'f-label',style:{margin:'12px 0 6px'}},'Your post'),tx,go_,h('p',{class:'f-hint',style:{marginTop:'8px'}},'Be kind and keep it on topic. Posts can be reported and removed.'));
    });
  }
  /* Discover search: topics whose title or text match */
  async function search(q){
    let rows=[];try{rows=await rpc('forum_search',{p_q:q,p_limit:8})||[];}catch(e){return null;}
    if(!rows.length)return null;
    return h('div',{class:'fm-block'},h('h2',{class:'sec'},'Topics'),h('div',{class:'fm-list'},rows.map(t=>row(t,true))));
  }
  /* a person's topics, for the Topics button inside their room */
  async function userData(uid){try{return await rpc('forum_user_topics',{p_user:uid,p_limit:30});}catch(e){return{count:0,topics:[]};}}
  function userSheet(uid,username,isMe,onCount){
    sheet(isMe?'My topics':'Topics by @'+username,(b,close)=>{
      const list=h('div',{class:'fm-list',style:{padding:'0'}},spinner());
      const load=async()=>{const d=await userData(uid);onCount&&onCount(d.count||0);const rows=d.topics||[];
        list.replaceChildren(...(rows.length?rows.map(t=>{const r=row(t,true);r.addEventListener('click',close);return r;}):[h('div',{class:'fm-none',style:{margin:'0'}},h('b',null,isMe?'You have not started a topic yet':'@'+username+' has not started a topic yet'),h('span',null,isMe?'Start a discussion about something you love.':'Check back soon.'))]));};
      b.append(list,isMe?h('button',{class:'btn coral block',style:{marginTop:'12px'},onclick:()=>{close();newTopic(null);}},'Start a topic'):null);load();
    });
  }
  return{discoverBlock,boardView,topicView,newTopic,row,search,userData,userSheet};
})();
