/* ---------- CALENDAR: events, registration, reminders ---------- */
defApp({id:'calendar',name:'Calendar',bg:'#fff',glyph:()=>{const d=new Date();return `<div class="cal-g"><b>${d.toLocaleDateString('en',{weekday:'short'}).toUpperCase()}</b><i>${d.getDate()}</i></div>`;},
mount(el,ctx,live){
  let events=[],mine=new Set(),month=new Date(),sel=isoDay(new Date()),loading=true,fail=false;
  const body=h('div',{class:'app-body'});
  el.append(appBar({title:'Calendar',onBack:ctx.close,backLabel:'Home',right:h('button',{class:'icon-btn','aria-label':'Today',onclick:()=>{month=new Date();sel=isoDay(month);draw();}},icon('cal'))}),body);
  async function load(){
    loading=true;fail=false;draw();
    try{
      if(!sb)throw new Error('offline');
      const r=await sb.from('events').select('*').order('starts_at');if(r.error)throw r.error;events=r.data||[];
      mine=new Set();if(Auth.user){const q=await sb.from('event_registrations').select('event_id,reminder').eq('user_id',Auth.user.id);(q.data||[]).forEach(x=>mine.add(x.event_id));}
    }catch(e){fail=true;}
    loading=false;draw();
    if(ctx.intent&&ctx.intent.event){const ev=events.find(x=>x.id===ctx.intent.event);if(ev){sel=isoDay(ev.starts_at);month=new Date(ev.starts_at);draw();detail(ev);}ctx.intent=null;}
  }
  function byDay(){const m={};events.forEach(e=>{(m[isoDay(e.starts_at)]=m[isoDay(e.starts_at)]||[]).push(e);});return m;}
  function draw(){
    body.innerHTML='';
    const y=month.getFullYear(),mo=month.getMonth(),first=new Date(y,mo,1),days=new Date(y,mo+1,0).getDate(),lead=first.getDay(),bd=byDay(),today=isoDay(new Date());
    body.append(h('div',{class:'cal-head'},h('button',{class:'icon-btn','aria-label':'Previous month',onclick:()=>{month=new Date(y,mo-1,1);draw();}},icon('back')),h('h3',null,first.toLocaleDateString(undefined,{month:'long',year:'numeric'})),h('button',{class:'icon-btn','aria-label':'Next month',onclick:()=>{month=new Date(y,mo+1,1);draw();}},icon('chevR'))));
    const g=h('div',{class:'cal-grid',role:'grid'});['S','M','T','W','T','F','S'].forEach(d=>g.append(h('span',{class:'dow'},d)));
    for(let i=0;i<lead;i++)g.append(h('span'));
    for(let d=1;d<=days;d++){const key=y+'-'+String(mo+1).padStart(2,'0')+'-'+String(d).padStart(2,'0');const has=bd[key];
      g.append(h('button',{class:'day'+(key===today?' today':'')+(key===sel?' sel':''),'aria-label':new Date(y,mo,d).toDateString()+(has?', '+has.length+' event':''),onclick:()=>{sel=key;draw();}},h('b',null,d),has&&h('i',{class:'dot'})));}
    body.append(g);
    body.append(h('div',{class:'sec-t'},fmtDate(sel+'T12:00:00',{weekday:'long',day:'numeric',month:'long'})));
    if(loading){body.append(spinner('Loading events…'));return;}
    if(fail){body.append(empty('Could not load events','Check your connection and try again.',h('button',{class:'btn',onclick:load},'Try again')));return;}
    const list=bd[sel]||[];
    if(list.length){const grp=h('div',{class:'group'});list.forEach(e=>grp.append(evRow(e)));body.append(grp);}
    else body.append(h('p',{class:'muted pad small-t'},'No events on this day.'));
    const up=events.filter(e=>new Date(e.starts_at)>=new Date()&&isoDay(e.starts_at)!==sel).slice(0,6);
    if(up.length){body.append(h('div',{class:'sec-t'},'Coming up'));const grp=h('div',{class:'group'});up.forEach(e=>grp.append(evRow(e,true)));body.append(grp);}
  }
  function evRow(e,withDate){return h('button',{class:'item',onclick:()=>detail(e)},h('span',{class:'ev-bar'}),h('span',{class:'grow'},h('b',null,e.title),h('span',null,(withDate?fmtDate(e.starts_at,{weekday:'short',day:'numeric',month:'short'})+' · ':'')+fmtTime(e.starts_at)+(e.location?' · '+e.location:''))),mine.has(e.id)&&chip('approved','Going'),h('span',{class:'chev'},icon('chevR')));}
  function detail(e){
    sheet(e.title,(b,close)=>{
      const going=mine.has(e.id);
      b.append(h('p',{class:'muted'},fmtDate(e.starts_at,{weekday:'long',day:'numeric',month:'long',year:'numeric'})+' · '+fmtTime(e.starts_at)+(e.ends_at?' – '+fmtTime(e.ends_at):'')),
        e.location&&h('p',null,'📍 '+e.location),e.description&&h('p',null,e.description),
        e.capacity&&h('p',{class:'muted small-t'},'Limited to '+e.capacity+' guests.'));
      const acts=h('div',{class:'stack'});b.append(acts);
      const ics=h('button',{class:'btn block',onclick:()=>{download(new Blob([toIcs(e)],{type:'text/calendar'}),'lukks-event.ics');toast('Added a calendar file','ok');}},icon('cal'),'Add to my phone calendar');
      if(!e.registration_open||new Date(e.starts_at)<new Date()){acts.append(h('p',{class:'muted small-t'},new Date(e.starts_at)<new Date()?'This event has passed.':'Registration is closed for this event.'),ics);return;}
      if(!Auth.user){acts.append(h('button',{class:'btn primary block',onclick:()=>{close();ctx.open('account',{mode:'signin'});}},'Sign in to register'),ics);return;}
      if(going){
        acts.append(chip('approved','You are registered'));
        acts.append(h('label',{class:'row-flex'},h('span',{class:'grow'},'Remind me'),toggleEl(true,async v=>{const r=await sb.from('event_registrations').update({reminder:v}).eq('event_id',e.id).eq('user_id',Auth.user.id);if(r.error)toast(errMsg(r.error),'err');else toast(v?'Reminder on':'Reminder off');},'Remind me')));
        acts.append(ics,h('button',{class:'btn danger block',onclick:async ev=>guard(ev.currentTarget,async()=>{const r=await sb.from('event_registrations').delete().eq('event_id',e.id).eq('user_id',Auth.user.id);if(r.error)throw r.error;mine.delete(e.id);toast('Registration cancelled');close();draw();})},'Cancel registration'));
      }else{
        acts.append(h('button',{class:'btn primary block',onclick:async ev=>guard(ev.currentTarget,async()=>{const r=await sb.from('event_registrations').insert({event_id:e.id,user_id:Auth.user.id,reminder:true});if(r.error)throw r.error;mine.add(e.id);toast('You are registered','ok');close();draw();})},'Register'),ics);
      }
    });
  }
  function toIcs(e){const f=d=>new Date(d).toISOString().replace(/[-:]/g,'').replace(/\.\d+/,'');const t=s=>String(s||'').replace(/[,;\\]/g,m=>'\\'+m).replace(/\n/g,'\\n');
    return ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Lukks//EN','BEGIN:VEVENT','UID:'+e.id+'@lukks','DTSTAMP:'+f(new Date()),'DTSTART:'+f(e.starts_at),'DTEND:'+f(e.ends_at||new Date(new Date(e.starts_at).getTime()+36e5*2)),'SUMMARY:'+t(e.title),'LOCATION:'+t(e.location),'DESCRIPTION:'+t(e.description),'END:VEVENT','END:VCALENDAR'].join('\r\n');}
  live(load);load();
}});
