/* ---------- Shared helpers for apps ---------- */
const errMsg=e=>friendlyError(e);
async function guard(btn,fn){
  if(btn){if(btn.disabled)return;btn.disabled=true;}
  try{return await fn();}catch(e){console.error(e);toast(errMsg(e),'err');}finally{if(btn)btn.disabled=false;}
}
function download(blob,name){const u=URL.createObjectURL(blob);const a=h('a',{href:u,download:name});document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),4000);}
function openExternal(url){const u=safeUrl(url);if(!u){toast('That link is not valid.','err');return;}window.open(u,'_blank','noopener,noreferrer');}
const toggleEl=(on,cb,label)=>{const b=h('button',{class:'switch',role:'switch','aria-checked':String(!!on),'aria-label':label||'Toggle',onclick:()=>{const v=b.getAttribute('aria-checked')!=='true';b.setAttribute('aria-checked',String(v));cb(v);}});return b;};
const avatarEl=(p,cls)=>{const url=p&&p.avatar_url;const nm=(p&&(p.display_name||p.username))||'L';return h('span',{class:'avatar '+(cls||''),style:url?{backgroundImage:`url("${url}")`}:null,'aria-hidden':'true'},url?null:nm.trim()[0].toUpperCase());};
const dataUrlBlob=async u=>(await fetch(u)).blob();
function imgFromSrc(src){return new Promise((res,rej)=>{const i=new Image();i.crossOrigin='anonymous';i.onload=()=>res(i);i.onerror=()=>rej(new Error('Image failed to load'));i.src=src;});}
const slugify=s=>String(s||'').toLowerCase().replace(/[^a-z0-9_]/g,'').slice(0,24);
