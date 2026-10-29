/* ---------- UI helpers shared by the phone and its apps ---------- */
const h=(tag,attrs,...kids)=>{
  const el=document.createElement(tag);
  if(attrs)for(const k in attrs){
    const v=attrs[k];if(v==null||v===false)continue;
    if(k==='class')el.className=v;
    else if(k==='style'&&typeof v==='object')Object.assign(el.style,v);
    else if(k==='html')el.innerHTML=v;
    else if(k.startsWith('on')&&typeof v==='function')el.addEventListener(k.slice(2),v);
    else if(k==='value'||k==='checked'||k==='disabled'||k==='selected')el[k]=v;
    else el.setAttribute(k,v===true?'':v);
  }
  const add=c=>{if(c==null||c===false)return;if(Array.isArray(c))c.forEach(add);else el.appendChild(c.nodeType?c:document.createTextNode(String(c)));};
  kids.forEach(add);return el;
};
const $$=(s,r)=>Array.from((r||document).querySelectorAll(s));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

const IC={
  bookmark:'<path d="M7 3.5h10v17l-5-4-5 4z"/>',people:'<circle cx="9" cy="8" r="3.2"/><path d="M3 19c.6-3.5 3-5.2 6-5.2s5.400 1.700 6 5.200"/><circle cx="17" cy="9" r="2.600"/><path d="M16.500 14c2.500 0 4.100 1.400 4.500 4"/>',trophy:'<path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8.500 20h7"/>',
  globe:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>',receipt:'<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/>',sparkle:'<path d="M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2z"/>',sliders:'<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>',dots:'<circle cx="12" cy="5" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="12" cy="19" r="1.4"/>',eyeOff:'<path d="M3 3l18 18M10 6.2A9 9 0 0 1 12 6c5 0 8 6 8 6a14 14 0 0 1-3 3.6M6.4 7.6A14 14 0 0 0 4 12s3 6 8 6a8 8 0 0 0 3-.6"/>',
  back:'<path d="M15 5l-7 7 7 7"/>',close:'<path d="M6 6l12 12M18 6L6 18"/>',plus:'<path d="M12 5v14M5 12h14"/>',check:'<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  heart:'<path d="M12 20.5C5 15.5 3 12 3 9a4.8 4.8 0 0 1 9-2.3A4.8 4.8 0 0 1 21 9c0 3-2 6.5-9 11.5z"/>',
  flag:'<path d="M5 21V4M5 4h12l-2 4 2 4H5"/>',trash:'<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
  cam:'<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.6"/>',image:'<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="M4 18l5-5 4 4 3-3 4 4"/>',
  flip:'<path d="M4 10a8 8 0 0 1 14-3M20 14a8 8 0 0 1-14 3M18 3v4h-4M6 21v-4h4"/>',
  send:'<path d="M4 12l16-8-6 16-3-7z"/>',user:'<circle cx="12" cy="8" r="4"/><path d="M4 20c1-4 4-6 8-6s7 2 8 6"/>',
  lock:'<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  chevR:'<path d="M9 5l7 7-7 7"/>',chevD:'<path d="M5 9l7 7 7-7"/>',
  share:'<path d="M12 4v11M7.5 8.5L12 4l4.5 4.5M5 13v6h14v-6"/>',copy:'<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>',
  link:'<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  bell:'<path d="M6 17V11a6 6 0 0 1 12 0v6l1.5 2h-15zM10 21h4"/>',
  speaker:'<path d="M4 9v6h4l5 4V5L8 9zM16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/>',
  mute:'<path d="M4 9v6h4l5 4V5L8 9zM17 9l5 6M22 9l-5 6"/>',
  search:'<circle cx="11" cy="11" r="6.5"/><path d="M16 16l5 5"/>',star:'<path d="M12 3.5l2.6 5.5 6 .8-4.4 4.2 1.1 6-5.3-2.9-5.3 2.9 1.1-6L3.4 9.8l6-.8z"/>',
  eye:'<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
  cal:'<rect x="4" y="5.5" width="16" height="14.5" rx="2"/><path d="M4 10h16M9 3.5v4M15 3.5v4"/>',
  home:'<path d="M4 11l8-7 8 7v9h-5v-6H9v6H4z"/>',more:'<circle cx="5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="19" cy="12" r="1.4"/>',
  refresh:'<path d="M4 12a8 8 0 1 0 3-6.2M4 4v4h4"/>',download:'<path d="M12 4v11M7.5 11L12 15.5 16.5 11M5 19h14"/>',edit:'<path d="M4 20l1-4L16.5 4.5l3 3L8 19z"/>',
  shirt:'<path d="M9 3.5L3 6.5l2.2 4.3L7.5 9.7V20.5h9V9.7l2.3 1.1L21 6.5l-6-3a3 3 0 0 1-6 0z"/>',
  wifi:'<path d="M2.5 9a14 14 0 0 1 19 0M5.5 12.5a9.5 9.5 0 0 1 13 0M8.6 16a5 5 0 0 1 6.8 0"/><circle cx="12" cy="19" r="1" fill="currentColor"/>'
};
const icon=(n,cls)=>h('span',{class:'ic'+(cls?' '+cls:''),html:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${IC[n]||''}</svg>`});

/* ---- formatting ---- */
const CUR={NGN:'₦',USD:'$',GBP:'£',EUR:'€'};
const fmtMoney=(v,cur,dec)=>{const s=CUR[cur||'NGN']||'₦';const n=Number(v)||0;return s+n.toLocaleString('en-NG',{minimumFractionDigits:dec??(n%1?2:0),maximumFractionDigits:dec??2});};
const fmtKobo=k=>'₦'+(k/100).toLocaleString('en-NG',{maximumFractionDigits:0});
const fmtDate=(d,o)=>new Date(d).toLocaleDateString(undefined,o||{weekday:'short',day:'numeric',month:'short',year:'numeric'});
const fmtTime=d=>new Date(d).toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit'});
const timeAgo=d=>{const s=(Date.now()-new Date(d))/1000;if(s<60)return 'now';if(s<3600)return Math.floor(s/60)+'m';if(s<86400)return Math.floor(s/3600)+'h';if(s<604800)return Math.floor(s/86400)+'d';return fmtDate(d,{day:'numeric',month:'short'});};
const isoDay=d=>{const x=new Date(d);return x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0')+'-'+String(x.getDate()).padStart(2,'0');};
const STATUS_LABEL={pending:'Pending review',approved:'Approved',rejected:'Not approved',awaiting_payment:'Awaiting payment',paid_in_review:'Paid, in review',creative_approved:'Creative approved',scheduled:'Scheduled',live:'Live',completed:'Completed',cancelled:'Cancelled'};
const chip=(status,label)=>h('span',{class:'chipS s-'+status},label||STATUS_LABEL[status]||status);

/* ---- toasts, dialogs, sheets (rendered inside the phone screen when it exists) ---- */
function hostEl(){return document.getElementById('screen')||document.body;}
function toast(msg,kind){
  const host=document.getElementById('toasts')||document.body;
  const t=h('div',{class:'toast '+(kind||''),role:'status'},msg);host.appendChild(t);
  setTimeout(()=>t.classList.add('out'),2600);setTimeout(()=>t.remove(),3000);
}
function dialog({title,body,actions}){
  return new Promise(res=>{
    const close=v=>{ov.classList.add('out');setTimeout(()=>ov.remove(),200);res(v);};
    const ov=h('div',{class:'dlg-ov',onclick:e=>{if(e.target===ov)close(null);}},
      h('div',{class:'dlg',role:'dialog','aria-modal':'true'},
        title&&h('h3',null,title),body&&(typeof body==='string'?h('p',null,body):body),
        h('div',{class:'dlg-acts'},(actions||[{label:'OK',value:true,primary:true}]).map(a=>h('button',{class:'btn '+(a.primary?'primary':a.danger?'danger':''),onclick:()=>close(a.value)},a.label)))));
    hostEl().appendChild(ov);
  });
}
const confirmBox=(title,body,ok,danger)=>dialog({title,body,actions:[{label:'Cancel',value:false},{label:ok||'Confirm',value:true,primary:!danger,danger}]}).then(v=>!!v);
function sheet(title,build,opts){
  const close=()=>{sh.classList.add('out');setTimeout(()=>ov.remove(),240);opts&&opts.onClose&&opts.onClose();};
  const body=h('div',{class:'sheet-body'});
  const sh=h('div',{class:'sheet-card'},h('div',{class:'sheet-grab'}),h('div',{class:'sheet-head'},h('h3',null,title),h('button',{class:'icon-btn','aria-label':'Close',onclick:close},icon('close'))),body);
  const ov=h('div',{class:'sheet-ov',onclick:e=>{if(e.target===ov)close();}},sh);
  hostEl().appendChild(ov);build(body,close);return {close,body};
}
function field(label,input,hint){return h('label',{class:'field'},h('span',{class:'f-label'},label),input,hint&&h('span',{class:'f-hint'},hint));}
function spinner(msg){return h('div',{class:'spin-wrap'},logoEl(64),msg&&h('p',null,msg));}
function empty(title,msg,action){return h('div',{class:'empty-state'},h('h4',null,title),msg&&h('p',null,msg),action);}
function appBar({title,onBack,right,backLabel}){
  return h('header',{class:'appbar'},
    onBack?h('button',{class:'bar-back',onclick:onBack,'aria-label':'Back'},icon('back'),backLabel&&h('span',null,backLabel)):h('span',{class:'bar-spacer'}),
    h('h2',null,title),h('div',{class:'bar-right'},right));
}
const copyText=async t=>{try{await navigator.clipboard.writeText(t);return true;}catch(e){const ta=h('textarea',{value:t,style:{position:'fixed',opacity:0}});document.body.appendChild(ta);ta.select();let ok=false;try{ok=document.execCommand('copy');}catch(_){}ta.remove();return ok;}};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safeUrl=u=>{try{const x=new URL(u);return /^https?:$/.test(x.protocol)?x.href:null;}catch(e){return null;}};
