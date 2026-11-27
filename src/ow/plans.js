/* ---------- Gist & Paint plans: pricing page, upgrade prompt, "My Gist & Paint Plan", payment return ----------
   Limits and entitlements live in Postgres (sp_* functions). Payments are created and verified by the
   plan-pay edge function with Paystack. Nothing here can switch Premium on: this file only asks the
   server and shows what it says. */
const OWPlans=(()=>{
  const rpc=async(n,a)=>{const r=await sb.rpc(n,a||{});if(r.error)throw r.error;return r.data;};
  const call=async body=>{
    try{const r=await sb.functions.invoke('plan-pay',{body});let d=r.data;
      if(r.error&&r.error.context&&r.error.context.json){try{d=await r.error.context.json();}catch(e){}}
      return d||{error:'network',message:'Could not connect. Check your internet and try again.'};
    }catch(e){return {error:'network',message:'Could not connect. Check your internet and try again.'};}
  };
  let PR=null;
  const prices=async force=>{if(PR&&!force)return PR;try{PR=await rpc('sp_prices_get');}catch(e){PR=PR||{session_kobo:250000,monthly_kobo:750000,monthly_recurring:false};}return PR;};
  const dt=s=>s?new Date(s).toLocaleDateString('en-NG',{day:'numeric',month:'short',year:'numeric'}):'';
  const isLimit=e=>!!(e&&/PLAN_LIMIT/.test((e.message||'')+''));

  /* what each plan includes; "soon" perks are shown honestly as coming later */
  const FEATS={
    free:[['Up to 4 painters on easels, you included'],['Unlimited viewers'],['Shared live canvas'],['30-minute sessions'],['Painting reference pictures'],['Save, download in HD and share your artwork']],
    session:[['Up to 20 painters on easels for that session'],['Unlimited viewers'],['Pay once, no renewal'],['Co-host'],['Edit the neon sign words, space title and description, and change the background, chair and screen colours'],['Painting countdown and Fastest finisher award'],['Artwork voting in the gallery'],['Longer sessions, up to 2 hours']],
    monthly:[['Every session you host, as many as you like'],['Up to 20 painters on easels in each'],['Unlimited viewers'],['Cancel any time, access lasts to the end of the paid month'],['Co-host'],['Edit the neon sign words, space title and description, and change the background, chair and screen colours'],['Painting countdown and Fastest finisher award'],['Artwork voting in the gallery'],['Longer sessions, up to 2 hours']]
  };
  const feats=k=>h('ul',{class:'pl-feats'},...FEATS[k].map(([t,soon])=>h('li',null,icon('check'),h('span',null,t),soon?h('em',{class:'pl-soon'},'Coming soon'):null)));

  /* ---------- paying ---------- */
  function notConfigured(){
    sheet('Payment is not open yet',(b,c)=>{
      b.append(h('p',{class:'pl-p'},'Online payment has not been switched on yet. Nothing was charged and nothing was unlocked.'),
        h('button',{class:'btn light block',onclick:c},'OK'));
    });
  }
  async function buy(kind,spaceId,btn){
    try{sessionStorage.setItem('ow_plan_ret',JSON.stringify({kind,space:spaceId||null}));}catch(e){}
    await guard(btn,async()=>{
      const d=await call({action:'init',kind,space_id:spaceId||undefined,callback_url:CFG.site+'?plan=1'});
      if(d.authorization_url){location.href=d.authorization_url;return;}
      if(d.error==='payments_not_configured'){notConfigured();return;}
      toast(d.message||'Payment could not be started.','err');
    });
  }
  async function pickSession(btn){
    if(!needAuth('Sign in to upgrade a session'))return;
    await guard(btn,async()=>{
      const [mine,plan]=await Promise.all([sb.from('spaces').select('id,title,status').eq('host_id',Auth.user.id).eq('category','sipandpaint').eq('solo',false).in('status',['live','scheduled']).order('created_at',{ascending:false}),rpc('sp_my_plan')]);
      const have=new Set((plan.sessions||[]).map(s=>s.space_id)),list=((mine.data)||[]).filter(s=>!have.has(s.id));
      if(!list.length){
        sheet('Start a session first',(b,c)=>b.append(h('p',{class:'pl-p'},'Premium Session upgrades one Gist & Paint session you are hosting. Start or schedule one, then upgrade it from inside the room.'),h('button',{class:'btn coral block',onclick:()=>{c();go('#/discover');}},'Go to Gist & Paint')));
        return;
      }
      if(list.length===1){await buy('session',list[0].id);return;}
      sheet('Which session?',(b,c)=>b.append(h('div',{class:'list'},...list.map(s=>h('button',{onclick:()=>{c();buy('session',s.id);}},h('span',{class:'grow'},s.title),h('span',{class:'tag'},s.status==='live'?'Live':'Scheduled'))))));
    });
  }

  /* ---------- pricing page ---------- */
  function card({name,price,per,k,btn,rec,note}){
    return h('div',{class:'pl-card'+(rec?' rec':'')},rec?h('span',{class:'pl-rib'},'Recommended'):null,h('h3',null,name),
      h('div',{class:'pl-price'},h('b',null,price),h('span',null,per)),note?h('p',{class:'pl-note'},note):null,feats(k),btn);
  }
  async function pricingPage(){
    const v=setView(false);drawNav('me');
    const bk=h('button',{class:'fm-back','aria-label':'Back',onclick:()=>{if(history.length>1&&App.hadRoute)history.back();else go('#/me');}},'‹');
    v.append(h('div',{class:'pg-head pl-head'},h('div',{class:'row-flex'},bk,h('div',{class:'brand'},h('b',null,'Plans')))),spinner());
    const P=await prices(true);
    const sessionBtn=h('button',{class:'btn light block',onclick:e=>pickSession(e.currentTarget)},'Upgrade This Session');
    const monthlyBtn=h('button',{class:'btn coral block',onclick:e=>{if(!needAuth('Sign in to subscribe'))return;buy('monthly',null,e.currentTarget);}},'Get Premium Monthly');
    const freeBtn=h('button',{class:'btn light block',onclick:()=>go('#/discover')},'Get Started');
    v.replaceChildren(h('div',{class:'pg-head pl-head'},h('div',{class:'row-flex'},bk,h('div',{class:'brand'},h('b',null,'Plans')))),
      h('div',{class:'pl-wrap'},h('div',{class:'pl-hero'},h('h1',null,'Paint Together. Create More.'),h('p',null,'Choose how you want to host your Gist & Paint sessions. Start free, or unlock more room for creativity with Premium.')),
        h('div',{class:'pl-cards'},
          card({name:'Free',price:'₦0',per:'forever',k:'free',btn:freeBtn}),
          card({name:'Premium Session',price:fmtKobo(P.session_kobo),per:'one session',k:'session',btn:sessionBtn,note:'Pay once for one session. It never renews.'}),
          card({name:'Premium Monthly',price:fmtKobo(P.monthly_kobo),per:'a month',k:'monthly',btn:monthlyBtn,rec:true,note:P.monthly_recurring?'Renews every month until you cancel.':'Pay for a month at a time.'})),
        h('p',{class:'pl-foot'},'Painting, saving, downloading and sharing your artwork stay free for everyone. Limits are checked on our servers.'),
        h('button',{class:'btn light',style:{margin:'4px auto 24px',display:'block'},onclick:()=>mySheet()},'My Gist & Paint Plan')));
  }

  /* ---------- the prompt a Free host sees when seating a fifth painter ---------- */
  async function limitSheet(spaceId){
    const P=await prices();
    sheet('Make Room for More Creativity',(b,c)=>{
      b.append(h('p',{class:'pl-p'},'Your current plan has 4 easels, you included. Upgrade to Premium for up to 20 painters on easels. Viewers and speakers are unlimited on every plan.'),
        h('div',{class:'pl-opt'},h('div',null,h('b',null,'Premium Session – '+fmtKobo(P.session_kobo)),h('span',null,'Up to 20 painters on easels for this session only.')),
          h('button',{class:'btn coral',onclick:e=>buy('session',spaceId,e.currentTarget)},'Choose Premium Session')),
        h('div',{class:'pl-opt'},h('div',null,h('b',null,'Premium Monthly – '+fmtKobo(P.monthly_kobo)+'/month'),h('span',null,'Host unlimited sessions with up to 20 painters on easels in each.')),
          h('button',{class:'btn light',onclick:e=>buy('monthly',null,e.currentTarget)},'Choose Monthly Premium')),
        h('p',{class:'pl-small'},'You will come back to this session after paying. Your invitations and painting stay as they are.'),
        h('button',{class:'btn ghost block',onclick:c},'Maybe Later'));
    });
  }

  /* ---------- coming back from Paystack ---------- */
  function result(d,ret,ref){
    const ok=d&&d.paid,st=d&&d.status;
    sheet(ok?'Payment received':st==='pending'?'Still checking':'Payment not completed',(b,c)=>{
      if(ok){
        const sess=d.kind==='session';
        b.append(h('div',{class:'pl-ok'},icon('check')),h('h3',{class:'pl-h'},sess?'This session now has Premium':'Premium Monthly is active'),
          h('p',{class:'pl-p'},sess?'You can seat up to 20 painters on easels in this session.':'Host as many sessions as you like, with up to 20 painters on easels in each.'),
          h('button',{class:'btn coral block',onclick:()=>{c();if(sess&&(d.space_id||(ret&&ret.space)))go('#/space/'+(d.space_id||ret.space));else go('#/me');}},sess?'Back to my session':'Done'));
        return;
      }
      if(st==='pending'){
        b.append(h('p',{class:'pl-p'},'Your bank has not confirmed this payment yet. This can take a minute. You have not been charged twice.'),
          h('button',{class:'btn coral block',onclick:e=>guard(e.currentTarget,async()=>{const x=await call({action:'verify',reference:ref});c();result(x,ret,ref);})},'Check again'),h('button',{class:'btn ghost block',onclick:c},'Close'));
        return;
      }
      b.append(h('p',{class:'pl-p'},(d&&d.message)||'The payment did not go through, so you were not charged and nothing was unlocked.'),
        ret?h('button',{class:'btn coral block',onclick:e=>{c();buy(ret.kind,ret.space,e.currentTarget);}},'Try again'):null,h('button',{class:'btn ghost block',onclick:c},'Close'));
    });
  }
  async function checkReturn(){
    const p=new URLSearchParams(location.search),ref=p.get('reference')||p.get('trxref');
    if(!ref||!/^OWP[SM]-/.test(ref))return false;
    history.replaceState(null,'',location.pathname+(location.hash||'#/me'));
    let ret=null;try{ret=JSON.parse(sessionStorage.getItem('ow_plan_ret')||'null');}catch(e){}
    if(!Auth.user)await new Promise(r=>setTimeout(r,800));
    const d=await call({action:'verify',reference:ref});
    result(d,ret,ref);return true;
  }

  /* ---------- My Gist & Paint Plan ---------- */
  async function mySheet(){
    if(!needAuth('Sign in to see your plan'))return;
    sheet('My Gist & Paint Plan',async(b,c)=>{
      b.append(spinner());
      let m;try{m=await rpc('sp_my_plan');}catch(e){b.replaceChildren(h('p',{class:'err-t'},errMsg(e)));return;}
      const sub=m.subscription,monthly=m.plan==='monthly',P=m.prices||{};
      const stat=!sub?'Free':monthly?(sub.status==='cancelled'?'Cancelled, access continues':'Active'):'Expired';
      const rows=[['Current plan',monthly?'Premium Monthly':'Free'],['Status',stat],['Painters per session',String(m.limit)+', you included'],['Premium sessions open',String((m.sessions||[]).length)]];
      if(sub){rows.push([monthly?(sub.status==='cancelled'||!sub.auto_renew?'Access ends':'Next renewal'):'Expired on',dt(sub.current_period_end)]);}
      const el=[h('div',{class:'pl-me'},...rows.map(([k,v])=>h('div',{class:'pl-row'},h('span',null,k),h('b',null,v))))];
      if(monthly&&sub){el.push(h('p',{class:'pl-small'},sub.status==='cancelled'?'Your plan will not renew. You keep Premium until '+dt(sub.current_period_end)+'.':sub.auto_renew?'Renews automatically each month until you cancel.':'This plan does not renew by itself. Pay again before '+dt(sub.current_period_end)+' to keep it.'));}
      if((m.sessions||[]).length){el.push(h('h4',{class:'pl-h4'},'Sessions with Premium'),h('div',{class:'list'},...m.sessions.map(s=>h('button',{onclick:()=>{c();go('#/space/'+s.space_id);}},h('span',{class:'grow'},s.title),h('span',{class:'tag'},s.status==='live'?'Live':'Scheduled')))));}
      el.push(h('h4',{class:'pl-h4'},'Payments'));
      const pay=m.payments||[];
      el.push(pay.length?h('div',{class:'pl-pays'},...pay.map(p=>h('div',{class:'pl-pay'},h('div',null,h('b',null,(p.kind==='session'?'Premium Session':'Premium Monthly')+' · '+fmtKobo(p.amount_kobo)),h('span',null,dt(p.created_at)+(p.space_title?' · '+p.space_title:''))),h('em',{class:'pl-st '+p.status},p.status)))):h('p',{class:'pl-small'},'No payments yet.'));
      const acts=[];
      if(monthly&&sub&&sub.status!=='cancelled')acts.push(h('button',{class:'btn danger block',onclick:e=>guard(e.currentTarget,async()=>{
        if(!await confirmBox('Cancel Premium Monthly?','It will not renew. You keep Premium until '+dt(sub.current_period_end)+'.','Cancel plan',true))return;
        const d=await call({action:'cancel'});if(d.ok){toast('Your plan will not renew','ok');c();mySheet();}else toast(d.message||'Could not cancel right now.','err');})},'Cancel subscription'));
      if(!monthly)acts.push(h('button',{class:'btn coral block',onclick:()=>{c();go('#/plans');}},sub?'Get Premium Monthly again':'See plans'));
      else acts.push(h('button',{class:'btn light block',onclick:()=>{c();go('#/plans');}},'See plans'));
      el.push(h('div',{class:'stack',style:{marginTop:'14px'}},...acts));
      b.replaceChildren(...el);
    });
  }
  return{pricingPage,limitSheet,mySheet,checkReturn,isLimit,prices};
})();
