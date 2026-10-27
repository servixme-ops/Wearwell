/* ---------- NOTES: About Lukks + Testimonials (two separate sections) ---------- */
defApp({id:'notes',name:'Notes',bg:'#fff',glyph:()=>`<svg viewBox="0 0 60 60"><rect width="60" height="60" fill="#fff"/><rect width="60" height="17" fill="#fecc02"/><g stroke="#d8d8dc" stroke-width="1.3"><path d="M0 28h60M0 38h60M0 48h60"/></g><path d="M0 17h60" stroke="#e5b400" stroke-width="1"/></svg>`,
mount(el,ctx,live){
  let sec=null;const root=h('div',{class:'msg-root'});el.append(root);
  const ABOUT=[
    ['What is Lukks?','Lukks is a fashion magazine you can hold. Each crate in the living room holds a set of Nigerian fashion issues. Pull one out, turn the pages with your finger and tap an outfit to see who made it and what it costs.'],
    ['Collections','Every magazine has collections: groups of outfits you can save to your favourites or add to your wardrobe. Your saved looks follow you across devices when you have an account.'],
    ['Your phone','The phone on the coffee table is yours. Set your wallpapers, add your social links, share photos, build a public style profile and keep receipts of what you wear.'],
    ['Be featured','Send a photo from the Camera app to be considered for a magazine page. Brands can also book the front cover or a page in Ads.'],
    ['Contact','Message the Lukks Team any time from the Messages app.']];
  function home(){
    sec=null;root.replaceChildren(appBar({title:'Notes',onBack:ctx.close,backLabel:'Home'}));
    const g=h('div',{class:'group',style:{marginTop:'14px'}},
      h('button',{class:'item',onclick:()=>open('about')},icon('shirt'),h('span',{class:'grow'},h('b',null,'About Lukks'),h('span',null,'What Lukks is and how it works')),h('span',{class:'chev'},icon('chevR'))),
      h('button',{class:'item',onclick:()=>open('testimonials')},icon('star'),h('span',{class:'grow'},h('b',null,'Testimonials'),h('span',null,'What readers say about Lukks')),h('span',{class:'chev'},icon('chevR'))));
    root.append(appBody(h('div',{class:'sec-t'},'Lukks'),g));
  }
  async function open(s,compose){
    sec=s;
    if(s==='about'){
      root.replaceChildren(appBar({title:'About Lukks',onBack:home,backLabel:'Notes'}),appBody(h('article',{class:'note-doc'},h('h1',null,'About Lukks'),ABOUT.map(a=>[h('h3',null,a[0]),h('p',null,a[1])]))));return;
    }
    const add=h('button',{class:'icon-btn','aria-label':'Write a testimonial',onclick:write},icon('edit'));
    const body=appBody(spinner());root.replaceChildren(appBar({title:'Testimonials',onBack:home,backLabel:'Notes',right:add}),body);
    let list=[],mine=[];
    try{const r=await sb.from('testimonials').select('*').order('created_at',{ascending:false}).limit(60);if(r.error)throw r.error;list=r.data||[];}catch(e){body.replaceChildren(empty('Could not load testimonials',errMsg(e),h('button',{class:'btn',onclick:()=>open('testimonials')},'Try again')));return;}
    mine=Auth.user?list.filter(x=>x.user_id===Auth.user.id&&x.status!=='approved'):[];
    const apr=list.filter(x=>x.status==='approved');
    body.replaceChildren(h('div',{class:'note-doc'},h('h1',null,'Testimonials'),
      mine.map(m=>h('div',{class:'quote mine'},chip(m.status),h('p',null,m.body),h('div',{class:'row-flex'},h('span',{class:'grow muted small-t'},'Your testimonial'),h('button',{class:'btn small danger',onclick:async()=>{if(!await confirmBox('Delete your testimonial?',null,'Delete',true))return;const r=await sb.from('testimonials').delete().eq('id',m.id);if(r.error)toast(errMsg(r.error),'err');else open('testimonials');}},'Delete')))),
      apr.length?apr.map(q=>h('blockquote',{class:'quote'},h('div',{class:'stars','aria-label':(q.rating||5)+' out of 5'},'★'.repeat(q.rating||5)),h('p',null,q.body),h('footer',null,'— '+q.display_name))):h('p',{class:'muted'},'No testimonials yet. Be the first to write one.'),
      h('button',{class:'btn primary block',style:{marginTop:'12px'},onclick:write},'Write a testimonial')));
    if(compose)write();
  }
  function write(){
    if(!Auth.user){toast('Sign in to write a testimonial');ctx.open('account',{mode:'signin'});return;}
    sheet('Write a testimonial',(b,close)=>{
      let rating=5;const name=h('input',{type:'text',maxlength:'60',value:(Auth.profile&&Auth.profile.display_name)||''}),txt=h('textarea',{maxlength:'600',placeholder:'What do you like about Lukks?'});
      const stars=h('div',{class:'star-pick',role:'radiogroup','aria-label':'Rating'});
      const paint=()=>{stars.replaceChildren();for(let i=1;i<=5;i++)stars.append(h('button',{role:'radio','aria-checked':String(i===rating),'aria-label':i+' stars',class:i<=rating?'on':'',onclick:()=>{rating=i;paint();}},'★'));};paint();
      b.append(field('Rating',stars),field('Display name',name),field('Your words',txt),h('p',{class:'muted small-t'},'Testimonials appear after a quick review.'),
        h('button',{class:'btn primary block',onclick:e=>guard(e.currentTarget,async()=>{
          if(txt.value.trim().length<10)throw new Error('Please write at least a sentence.');if(!name.value.trim())throw new Error('Add a display name.');
          const r=await sb.from('testimonials').insert({user_id:Auth.user.id,display_name:name.value.trim(),body:txt.value.trim(),rating,status:'pending'});if(r.error)throw r.error;
          toast('Thank you! Sent for review','ok');close();open('testimonials');})},'Send'));
    });
  }
  live(()=>{if(sec)open(sec);else home();});
  const i=ctx.intent;ctx.intent=null;
  if(i&&i.section)open(i.section,i.compose);else home();
}});
