/* ---------- API: Supabase client, auth, local storage, media helpers ---------- */
let sb=null;
/* Durable session storage: mirrors to a second key and a cookie so a cleared/blocked store doesn't log people out. */
const DurableStore={
  getItem(k){return DurableStore.get(k);},setItem(k,v){return DurableStore.set(k,v);},removeItem(k){return DurableStore.remove(k);},
  get(k){try{const v=localStorage.getItem(k);if(v)return v;}catch(e){}
    try{const b=localStorage.getItem(k+'.bak');if(b)return b;}catch(e){}
    try{const m=document.cookie.match(new RegExp('(?:^|; )'+k+'=([^;]*)'));if(m)return decodeURIComponent(m[1]);}catch(e){}
    return DurableStore._mem[k]||null;},
  set(k,v){DurableStore._mem[k]=v;try{localStorage.setItem(k,v);localStorage.setItem(k+'.bak',v);}catch(e){}
    try{const s=JSON.parse(v);const small=JSON.stringify({access_token:s.access_token,refresh_token:s.refresh_token,expires_at:s.expires_at,expires_in:s.expires_in,token_type:s.token_type,user:{id:s.user&&s.user.id,email:s.user&&s.user.email}});
      if(small.length<3800)document.cookie=k+'='+encodeURIComponent(small)+'; max-age=31536000; path=/; SameSite=Lax'+(location.protocol==='https:'?'; Secure':'');}catch(e){}},
  remove(k){delete DurableStore._mem[k];try{localStorage.removeItem(k);localStorage.removeItem(k+'.bak');}catch(e){}try{document.cookie=k+'=; max-age=0; path=/';}catch(e){}},
  _mem:{}
};
try{if(window.supabase&&window.supabase.createClient)sb=window.supabase.createClient(CFG.supabaseUrl,CFG.supabaseKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,storageKey:'lukks-auth',storage:DurableStore},global:{fetch:(u,o)=>{const c=new AbortController();const t=setTimeout(()=>c.abort(),/\/auth\/v1\//.test(String(u))?60000:20000);const sg=o&&o.signal;if(sg){if(sg.aborted)c.abort();else sg.addEventListener('abort',()=>c.abort());}return fetch(u,Object.assign({},o,{signal:c.signal})).finally(()=>clearTimeout(t));}}});}catch(e){console.warn('Supabase unavailable',e);}

const Local={
  get(k,d){try{const v=localStorage.getItem('lukks_'+k);return v==null?d:JSON.parse(v);}catch(e){return d;}},
  set(k,v){try{localStorage.setItem('lukks_'+k,JSON.stringify(v));}catch(e){}},
  del(k){try{localStorage.removeItem('lukks_'+k);}catch(e){}}
};

/* IndexedDB for guest wallpapers (too large for localStorage) */
const Media={
  _db:null,
  open(){
    if(this._db)return this._db;
    this._db=new Promise((res,rej)=>{try{const r=indexedDB.open('lukks',1);r.onupgradeneeded=()=>r.result.createObjectStore('media');r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);}catch(e){rej(e);}});
    return this._db;
  },
  async put(k,blob){try{const db=await this.open();return await new Promise((res,rej)=>{const t=db.transaction('media','readwrite');t.objectStore('media').put(blob,k);t.oncomplete=()=>res(true);t.onerror=()=>rej(t.error);});}catch(e){return false;}},
  async get(k){try{const db=await this.open();return await new Promise((res)=>{const q=db.transaction('media').objectStore('media').get(k);q.onsuccess=()=>res(q.result||null);q.onerror=()=>res(null);});}catch(e){return null;}},
  async del(k){try{const db=await this.open();return await new Promise((res)=>{const t=db.transaction('media','readwrite');t.objectStore('media').delete(k);t.oncomplete=()=>res(true);t.onerror=()=>res(false);});}catch(e){return false;}}
};

/* ---------- Auth ---------- */
const Auth={
  user:null,profile:null,settings:null,isAdmin:false,ready:false,_ls:[],
  on(fn){this._ls.push(fn);return()=>{this._ls=this._ls.filter(f=>f!==fn);};},
  emit(ev){this._ls.forEach(f=>{try{f(ev);}catch(e){console.error(e);}});},
  get signedIn(){return !!this.user;},
  async init(){
    if(!sb){this.ready=true;return;}
    try{
      let data=(await sb.auth.getSession()).data;
      if(!data||!data.session){await new Promise(r=>setTimeout(r,400));data=(await sb.auth.getSession()).data;}
      if(data&&data.session){this.user=data.session.user;try{await this._load(data.session.user);}catch(e){console.warn(e);}}
    }catch(e){console.warn(e);}
    this.ready=true;
    sb.auth.onAuthStateChange((ev,session)=>{
      if(ev==='INITIAL_SESSION')return;
      // Never call Supabase inside this callback (it deadlocks the client): defer to the next tick.
      setTimeout(async()=>{
        try{
          if(session&&session.user){
            if(this.user&&this.user.id===session.user.id&&ev!=='USER_UPDATED'){this.user=session.user;return;}
            const was=this.user&&this.user.id;await this._load(session.user);if(was!==session.user.id)this.emit('signin');else this.emit('refresh');
          }else if(ev==='SIGNED_OUT'){this.user=null;this.profile=null;this.settings=null;this.isAdmin=false;this.emit('signout');}
        }catch(e){console.warn(e);}
      },0);
    });
  },
  async _load(user){
    this.user=user;
    const [p,s,a]=await Promise.all([
      sb.from('profiles').select('*').eq('id',user.id).maybeSingle(),
      sb.from('user_settings').select('*').eq('user_id',user.id).maybeSingle(),
      sb.rpc('am_i_admin')
    ]);
    this.profile=p.data||null;this.settings=s.data||null;this.isAdmin=a&&a.data===true;
  },
  async _adopt(user){const was=this.user&&this.user.id;await this._load(user);if(was!==user.id)this.emit('signin');else this.emit('refresh');},
  async signUp(email,password,meta){
    if(!sb)return{error:{message:'The server is not reachable right now.'}};
    const r=await sb.auth.signUp({email,password,options:{data:meta,emailRedirectTo:CFG.site}});
    if(!r.error&&r.data&&r.data.session)await this._adopt(r.data.session.user);
    return{error:r.error,needsConfirm:!r.error&&r.data&&!r.data.session};
  },
  async signIn(email,password){
    if(!sb)return{error:{message:'The server is not reachable right now.'}};
    const r=await sb.auth.signInWithPassword({email,password});
    if(!r.error&&r.data&&r.data.session)await this._adopt(r.data.session.user);
    return{error:r.error};
  },
  async signOut(){if(sb)await sb.auth.signOut();this.user=null;this.profile=null;this.settings=null;this.isAdmin=false;this.emit('signout');},
  async resetPassword(email){if(!sb)return{error:{message:'The server is not reachable right now.'}};const r=await sb.auth.resetPasswordForEmail(email,{redirectTo:CFG.site});return{error:r.error};},
  async refresh(){if(this.user)await this._load(this.user);this.emit('refresh');},
  async saveProfile(patch){
    if(!this.user)return{error:{message:'Sign in first.'}};
    const r=await sb.from('profiles').update(patch).eq('id',this.user.id).select().maybeSingle();
    if(!r.error&&r.data)this.profile=r.data;
    return{error:r.error,data:r.data};
  },
  async saveSettings(patch){
    if(!this.user)return{error:{message:'Sign in first.'}};
    const r=await sb.from('user_settings').upsert(Object.assign({user_id:this.user.id},patch)).select().maybeSingle();
    if(!r.error&&r.data)this.settings=r.data;
    return{error:r.error,data:r.data};
  }
};
const friendlyError=e=>{
  const m=(e&&e.message)||String(e||'Something went wrong.');
  if(/duplicate key.*username|profiles_username_key/i.test(m))return 'That username is already taken.';
  if(/magazine_submissions_hash/i.test(m))return 'This photo has already been submitted.';
  if(/Invalid login/i.test(m))return 'Email or password is not right.';
  if(/already registered/i.test(m))return 'That email already has an account. Try signing in.';
  if(/row-level security|permission denied/i.test(m))return 'You do not have permission to do that.';
  if(/Failed to fetch|NetworkError|network/i.test(m))return 'No connection. Check your internet and try again.';
  if(/Payload too large|exceeded the maximum/i.test(m))return 'That file is too large.';
  if(/mime type|not supported/i.test(m))return 'That file type is not allowed.';
  return m.replace(/^P0001:\s*/,'');
};

/* ---------- Images ---------- */
const IMG_TYPES=['image/jpeg','image/png','image/webp'];
async function prepareImage(file,{max=1600,quality=.85,allowGif=false,maxMB=CFG.limits.imageMB,gifMB=CFG.limits.gifMB}={}){
  if(!file)throw new Error('No file selected.');
  const isGif=file.type==='image/gif';
  if(!IMG_TYPES.includes(file.type)&&!(allowGif&&isGif))throw new Error(allowGif?'Use a JPG, PNG, WebP or GIF image.':'Use a JPG, PNG or WebP image.');
  if(file.size>maxMB*1048576)throw new Error(`That file is over ${maxMB} MB.`);
  if(isGif){if(file.size>gifMB*1048576)throw new Error(`GIFs must be ${gifMB} MB or smaller.`);return{blob:file,type:'image/gif',ext:'gif'};}
  const bmp=await loadBitmap(file);
  const r=Math.min(1,max/Math.max(bmp.width,bmp.height));
  const w=Math.max(1,Math.round(bmp.width*r)),hh=Math.max(1,Math.round(bmp.height*r));
  const c=document.createElement('canvas');c.width=w;c.height=hh;
  const g=c.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,w,hh);g.drawImage(bmp,0,0,w,hh);
  const blob=await new Promise(res=>c.toBlob(res,'image/jpeg',quality));
  if(!blob)throw new Error('Could not process that image.');
  return{blob,type:'image/jpeg',ext:'jpg',width:w,height:hh};
}
async function loadBitmap(file){
  if('createImageBitmap' in window){try{return await createImageBitmap(file,{imageOrientation:'from-image'});}catch(e){}}
  return await new Promise((res,rej)=>{const u=URL.createObjectURL(file);const i=new Image();i.onload=()=>{URL.revokeObjectURL(u);res(i);};i.onerror=()=>{URL.revokeObjectURL(u);rej(new Error('Could not read that image.'));};i.src=u;});
}
async function sha256(blob){
  const buf=await blob.arrayBuffer();
  const d=await crypto.subtle.digest('SHA-256',buf);
  return Array.from(new Uint8Array(d)).map(b=>b.toString(16).padStart(2,'0')).join('');
}
const uuid=()=>crypto.randomUUID?crypto.randomUUID():'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{const r=Math.random()*16|0;return(c==='x'?r:(r&3|8)).toString(16);});
async function uploadFile(bucket,blob,ext,type){
  if(!Auth.user)throw new Error('Sign in first.');
  const path=`${Auth.user.id}/${uuid()}.${ext}`;
  const r=await sb.storage.from(bucket).upload(path,blob,{contentType:type,cacheControl:'31536000',upsert:false});
  if(r.error)throw r.error;
  return path;
}
const removeFile=async(bucket,path)=>{try{await sb.storage.from(bucket).remove([path]);}catch(e){}};
const publicUrl=(bucket,path)=>path&&sb?sb.storage.from(bucket).getPublicUrl(path).data.publicUrl:null;
const _signed={};
async function signedUrl(bucket,path,secs=3600){
  const k=bucket+'/'+path;if(_signed[k]&&_signed[k].exp>Date.now())return _signed[k].url;
  const r=await sb.storage.from(bucket).createSignedUrl(path,secs);
  if(r.error||!r.data)return null;_signed[k]={url:r.data.signedUrl,exp:Date.now()+secs*900};return r.data.signedUrl;
}
function pickFiles(accept){
  return new Promise(res=>{
    const i=h('input',{type:'file',accept,multiple:true,style:{display:'none'}});
    window.__picking=true;const done=()=>{setTimeout(()=>{window.__picking=false;},1500);};const guardT=setTimeout(()=>{window.__picking=false;},180000);
    i.addEventListener('change',()=>{clearTimeout(guardT);done();res(Array.from(i.files||[]));i.remove();});
    i.addEventListener('cancel',()=>{clearTimeout(guardT);done();res([]);i.remove();});
    document.body.appendChild(i);i.click();
  });
}
function pickFile(accept,capture){
  return new Promise(res=>{
    const i=h('input',{type:'file',accept,capture:capture||null,style:{display:'none'}});
    window.__picking=true;const done=()=>{setTimeout(()=>{window.__picking=false;},1500);};const guardT=setTimeout(()=>{window.__picking=false;},180000);
    i.addEventListener('change',()=>{clearTimeout(guardT);done();res(i.files&&i.files[0]||null);i.remove();});
    i.addEventListener('cancel',()=>{clearTimeout(guardT);done();res(null);i.remove();});
    document.body.appendChild(i);i.click();
  });
}

/* ---------- Generated fashion art (placeholder photography) ---------- */
let _looksReady=false;
function ensureLooks(){if(_looksReady)return;[0,1,2].forEach(crateMags);_looksReady=true;}
const _art={};
function artImage(ref,w,hh){
  ensureLooks();
  const k=ref+'|'+(w||300);if(_art[k])return _art[k];
  const look=LOOKS[ref];if(!look)return null;
  const c=thumb(look,w||300,hh||Math.round((w||300)*1.33));
  return _art[k]=c.toDataURL('image/jpeg',.82);
}
const issueCover=(mi,ci,w)=>{ensureLooks();const m=crateMags(ci)[mi];return m?drawCover(m,w||240,Math.round((w||240)*1.32)).toDataURL('image/jpeg',.82):null;};

/* ---------- Saved looks (crate wardrobe) sync ---------- */
async function syncSavedLooks(){
  if(!Auth.user||!sb)return;
  try{
    const r=await sb.from('saved_looks').select('look_id,kind');
    if(r.error)return;
    const have={saved:new Set(),wardrobe:new Set()};
    (r.data||[]).forEach(x=>have[x.kind]&&have[x.kind].add(x.look_id));
    const add=[];
    ['saved','wardrobe'].forEach(kind=>{
      const loc=kind==='saved'?saved:wardrobe;
      loc.forEach(id=>{if(!have[kind].has(id))add.push({user_id:Auth.user.id,look_id:id,kind});});
      have[kind].forEach(id=>loc.add(id));
      store.set(kind,[...loc]);
    });
    if(add.length)await sb.from('saved_looks').upsert(add,{onConflict:'user_id,look_id,kind',ignoreDuplicates:true});
  }catch(e){console.warn('saved sync',e);}
}
async function pushSaved(kind,id,on){
  if(!Auth.user||!sb)return;
  try{
    if(on)await sb.from('saved_looks').upsert({user_id:Auth.user.id,look_id:id,kind},{onConflict:'user_id,look_id,kind',ignoreDuplicates:true});
    else await sb.from('saved_looks').delete().eq('user_id',Auth.user.id).eq('look_id',id).eq('kind',kind);
  }catch(e){}
}
