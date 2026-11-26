/* OpenWalls link cards (Cloudflare Worker).
   WhatsApp, X, Facebook, Telegram, Slack, Discord and LinkedIn never run the app and ignore the "#" part of a link,
   so shared links point at /r/<username>, /s/<space> and /gallery. This Worker answers those with a small page that holds
   the card text and image, then sends real people straight into the app. Everything else is served as normal files.
   Only public details come from the database (ow_share_room / ow_share_space), never private ones. */
const SB='https://iybiznrvhkeimkzepyvv.supabase.co';
const KEY='sb_publishable_I7FU3Y4jSTtzJR_6fD289w_nxfMongA'; // public key, safe to ship (same one the app uses)
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clip=(s,n)=>{s=String(s||'').replace(/\s+/g,' ').trim();return s.length>n?s.slice(0,n-1).trimEnd()+'…':s;};
const plural=(n,w)=>n+' '+w+(n===1?'':'s');
async function rpc(fn,args){
  try{const r=await fetch(SB+'/rest/v1/rpc/'+fn,{method:'POST',headers:{apikey:KEY,Authorization:'Bearer '+KEY,'Content-Type':'application/json'},body:JSON.stringify(args)});
    if(!r.ok)return null;return await r.json();}catch(e){return null;}
}
function wat(iso){
  try{return new Intl.DateTimeFormat('en-GB',{timeZone:'Africa/Lagos',weekday:'short',day:'numeric',month:'short',hour:'numeric',minute:'2-digit',hour12:true}).format(new Date(iso))+' (Lagos time)';}catch(e){return '';}
}
const DEFAULT={title:'OpenWalls · Step into open rooms',desc:'Visit rooms, paint together in Gist & Paint, and meet people on OpenWalls.',img:'/assets/og/default.png'};
function roomCard(d,user){
  if(!d)return Object.assign({},DEFAULT);
  if(d.kind==='gallery')return galleryCard();
  if(d.kind==='private')return {title:'A private room on OpenWalls',desc:'@'+user+' has a private room. Open it with the invite link or code they sent you.',img:'/assets/og/private.png'};
  if(d.kind==='noroom')return {title:clip(d.name,60)+' (@'+user+') on OpenWalls',desc:'Say hello to '+clip(d.name,40)+' on OpenWalls.',img:'/assets/og/default.png'};
  const bits=[];
  if(d.paintings>0)bits.push(plural(d.paintings,'painting')+' on the walls');
  if(d.visits>0)bits.push(plural(d.visits,'visit'));
  const cats=(d.categories||[]).slice(0,3).join(', ');if(cats)bits.push(cats);
  return {title:clip(d.name,60)+' · a room by '+clip(d.owner,40),
    desc:'Walk into '+clip(d.owner,40)+"'s open room"+(bits.length?' · '+bits.join(' · '):'')+'. Look around, see the art and say hello on OpenWalls.',img:'/assets/og/room.png'};
}
function galleryCard(){
  return {title:'The OpenWalls Gallery · Nigerian & African art',desc:'Walk the official gallery: Nigerian and African artworks, instruments you can play, and objects you can turn around and inspect in 3D.',img:'/assets/og/gallery.jpg',type:'jpg'};
}
function spaceCard(d){
  if(!d)return {title:'Gist & Paint on OpenWalls',desc:'Paint together on live easels, with voice and chat, on OpenWalls.',img:'/assets/og/space.png'};
  if(d.kind==='private')return {title:'A private Gist & Paint session',desc:'Hosted by '+clip(d.host,40)+'. Open the invite you were sent to join.',img:'/assets/og/private.png'};
  const live=d.status==='live',ended=d.status==='ended'||d.status==='cancelled';
  const head=live?'Live now: ':ended?'Ended: ':'';
  const bits=[];
  bits.push(live?'Hosted by '+clip(d.host,40)+(d.here>0?' · '+(d.here===1?'1 person':d.here+' people')+' in the room':''):'Hosted by '+clip(d.host,40));
  if(!live&&!ended&&d.start)bits.push('Starts '+wat(d.start));
  if(d.category==='sipandpaint'){bits.push((d.easels>4?'Up to '+d.easels:'4')+' painting easels');}
  const about=clip(d.description,110);
  let desc=bits.join(' · ')+'.';
  if(about)desc+=' '+about+(/[.!?…]$/.test(about)?'':'.');
  desc+=live?' Tap to join.':ended?'':' Tap to join when it starts.';
  return {title:head+clip(d.title,70)+(d.category==='sipandpaint'?' · Gist & Paint':' · OpenWalls Space'),desc,img:live?'/assets/og/live.png':'/assets/og/space.png'};
}
function page(origin,path,card,dest){
  const img=origin+card.img,url=origin+path;
  return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
  +'<title>'+esc(card.title)+'</title><meta name="description" content="'+esc(card.desc)+'">'
  +'<link rel="canonical" href="'+esc(url)+'">'
  +'<meta property="og:site_name" content="OpenWalls"><meta property="og:type" content="website"><meta property="og:url" content="'+esc(url)+'">'
  +'<meta property="og:title" content="'+esc(card.title)+'"><meta property="og:description" content="'+esc(card.desc)+'">'
  +'<meta property="og:image" content="'+esc(img)+'"><meta property="og:image:secure_url" content="'+esc(img)+'"><meta property="og:image:type" content="image/'+(card.type==='jpg'?'jpeg':'png')+'"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">'
  +'<meta property="og:image:alt" content="'+esc(card.title)+'">'
  +'<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="'+esc(card.title)+'"><meta name="twitter:description" content="'+esc(card.desc)+'"><meta name="twitter:image" content="'+esc(img)+'">'
  +'<meta name="theme-color" content="#6b1a2b"><meta http-equiv="refresh" content="0;url='+esc(dest)+'">'
  +'<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f6efe4;color:#1d1a2b;font:16px system-ui,sans-serif;text-align:center;padding:24px}a{color:#6b1a2b;font-weight:700}</style></head>'
  +'<body><p>Opening OpenWalls… <a href="'+esc(dest)+'">Tap here if nothing happens</a></p>'
  +'<script>location.replace('+JSON.stringify(dest)+')</script></body></html>';
}
function reply(html){return new Response(html,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'public, max-age=120','X-Robots-Tag':'noindex'}});}
/* ---- photo -> illustration with Cloudflare Workers AI (FLUX.2 klein), only when the person agrees to it in the app ----
   The photo is sent here, passed straight to the model and never saved. Each person gets 3 a day and everyone together 120 a day
   (counted in the database), which keeps the free daily AI allowance from running out. */
const AI_MODEL='@cf/black-forest-labs/flux-2-klein-4b';
const PROMPT='Redraw the person in image 0 as a flat vector cartoon illustration drawn in exactly the style of images 1 and 2: bold clean dark outlines, flat solid colours with no gradients or shading, simplified geometric shapes, simple face with small dark eyes, a small nose line and a simple mouth, simplified hair and clothing, and one plain solid colour background. Keep this person\'s face shape, skin tone, hairstyle, facial hair, glasses and clothing. Head and shoulders only, one person, centred.';
const json=(o,st)=>new Response(JSON.stringify(o),{status:st||200,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
async function userRpc(fn,token){
  try{const r=await fetch(SB+'/rest/v1/rpc/'+fn,{method:'POST',headers:{apikey:KEY,Authorization:'Bearer '+token,'Content-Type':'application/json'},body:'{}'});
    if(!r.ok)return null;const t=await r.text();return t?JSON.parse(t):{};}catch(e){return null;}
}
async function illustrate(request,env,u){
  if(request.method!=='POST')return json({ok:false,why:'method'},405);
  if(!env.AI)return json({ok:false,why:'off'});
  const token=(request.headers.get('Authorization')||'').replace(/^Bearer\s+/i,'');
  if(!token)return json({ok:false,why:'login'},401);
  const buf=await request.arrayBuffer();
  if(!buf.byteLength||buf.byteLength>1500000)return json({ok:false,why:'size'},413);
  const q=await userRpc('photo_art_take',token);
  if(!q)return json({ok:false,why:'login'},401);
  if(!q.ok)return json({ok:false,why:q.why||'limit'});
  try{
    const fd=new FormData();fd.append('prompt',PROMPT);fd.append('width','384');fd.append('height','480');
    fd.append('input_image_0',new Blob([buf],{type:request.headers.get('Content-Type')||'image/jpeg'}),'photo.jpg');
    for(const [i,n] of [[1,'hflower'],[2,'hpop']]){const r=await env.ASSETS.fetch(new Request(u.origin+'/assets/style/'+n+'.jpg'));if(!r.ok)throw new Error('style');fd.append('input_image_'+i,await r.blob(),n+'.jpg');}
    const form=new Response(fd);
    const out=await env.AI.run(AI_MODEL,{multipart:{body:form.body,contentType:form.headers.get('content-type')}});
    const img=out&&(out.image||(out.result&&out.result.image));
    if(!img||typeof img!=='string')throw new Error('empty');
    return json({ok:true,image:img,left:q.left});
  }catch(e){
    await userRpc('photo_art_refund',token);
    return json({ok:false,why:'ai'});
  }
}
export async function handle(request,env){
  const u=new URL(request.url),p=u.pathname;let m;
  if(p==='/api/illustrate')return illustrate(request,env,u);
  if(request.method!=='GET'&&request.method!=='HEAD')return env.ASSETS.fetch(request);
  if(p==='/gallery'||p==='/gallery/')return reply(page(u.origin,'/gallery',galleryCard(),'/#/@openwalls'));
  if((m=p.match(/^\/r\/([A-Za-z0-9_]{3,24})(?:\/([A-Za-z0-9]{6,64}))?\/?$/))){
    const user=m[1].toLowerCase(),code=m[2]?m[2].toLowerCase():'';
    const d=await rpc('ow_share_room',{p_username:user});
    const card=roomCard(d,user);
    const dest=d&&d.kind==='gallery'?'/#/@openwalls':'/#/@'+user+(code?'/'+code:'');
    return reply(page(u.origin,p,card,dest));
  }
  if((m=p.match(/^\/s\/([0-9a-fA-F-]{36})\/?$/))){
    const d=await rpc('ow_share_space',{p_space:m[1].toLowerCase()});
    return reply(page(u.origin,p,spaceCard(d),'/#/space/'+m[1].toLowerCase()));
  }
  return env.ASSETS.fetch(request);
}
export default {fetch:handle};
export {roomCard,spaceCard,galleryCard,page};
