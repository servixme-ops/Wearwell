/* ---------- CAMERA + contribution helpers (community photos, magazine submissions) ---------- */
/* Local (on-device) gallery for signed-out photos, kept in IndexedDB */
const LocalGallery={
  _db:null,
  open(){return this._db||(this._db=new Promise((res,rej)=>{try{const q=indexedDB.open('lukks-gallery',1);q.onupgradeneeded=()=>q.result.createObjectStore('photos',{keyPath:'id'});q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error);}catch(e){rej(e);}}));},
  async tx(mode,fn){const db=await this.open();return new Promise((res,rej)=>{const t=db.transaction('photos',mode),st=t.objectStore('photos');const r=fn(st);t.oncomplete=()=>res(r&&r.result);t.onerror=()=>rej(t.error);t.onabort=()=>rej(t.error);});},
  async list(){try{return (await this.tx('readonly',s=>s.getAll()))||[];}catch(e){return[];}},
  async add(blob,album,caption){const x={id:uuid(),blob,album,caption:caption||'',t:Date.now()};await this.tx('readwrite',s=>s.put(x));return x;},
  async del(id){await this.tx('readwrite',s=>s.delete(id));}
};
const Contrib={
  _albums:null,
  async albums(){
    if(this._albums)return this._albums;
    let a=[];try{const r=await sb.from('gallery_albums').select('*').neq('slug','community').order('sort');if(!r.error)a=r.data||[];}catch(e){}
    if(!a.some(x=>x.slug==='randoms'))a.push({slug:'randoms',title:'Randoms'});
    a=a.filter(x=>x.slug!=='community');
    return this._albums=a;
  },
  async newFolder(title){
    const slug='u-'+Auth.user.id.slice(0,8)+'-'+(String(title).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,24)||'folder')+'-'+Math.random().toString(36).slice(2,6);
    const r=await sb.from('gallery_albums').insert({slug,title:title.slice(0,40),owner_id:Auth.user.id,sort:100}).select().single();
    if(r.error)throw r.error;this._albums=null;return r.data;
  },
  /* shared dialog: save one or more photos into the gallery. Signed out: Randoms only, kept on this device. */
  sendSheet(ctx,input,opts){
    opts=opts||{};
    const files=(Array.isArray(input)?input:[input]).filter(Boolean).slice(0,Auth.user?50:1).map(x=>x instanceof File?x:new File([x],'photo.jpg',{type:x.type||'image/jpeg'}));
    sheet(files.length>1?'Save photos':'Save photo',async(b,close)=>{
      const albums=await this.albums();const signed=!!Auth.user;
      const items=files.map(f=>({file:f,url:URL.createObjectURL(f),pending:true}));
      const strip=h('div',{class:'lx-sendstrip'});
      const drawStrip=()=>strip.replaceChildren(...items.map(it=>h('div',{class:'lx-sthumb'},h('img',{src:it.url,alt:''}),it.pending?h('span',{class:'xspin'},spinner()):null,
        h('button',{class:'rm','aria-label':'Remove photo',onclick:()=>{const k=items.indexOf(it);if(k>=0)items.splice(k,1);drawStrip();}},icon('close')))));
      drawStrip();
      (async()=>{for(const it of items.slice()){try{const pr=await prepareImage(it.file,{max:1800});if(!items.includes(it))continue;Object.assign(it,{prepared:pr,pending:false});}catch(e){const k=items.indexOf(it);if(k>=0)items.splice(k,1);toast(errMsg(e),'err');}drawStrip();}})();
      let want=signed?(opts.album||'randoms'):'randoms';
      const sel=h('select',{disabled:!signed});
      const fillSel=()=>{sel.replaceChildren(...albums.map(a=>h('option',{value:a.slug,selected:a.slug===want},a.title)),signed?h('option',{value:'__new'},'+ New folder…'):null);sel.value=want;};fillSel();
      const nf=h('input',{type:'text',maxlength:'40',placeholder:'Folder name'});const nfBox=h('div',{hidden:true,class:'stack'},field('New folder',nf));
      sel.onchange=()=>{nfBox.hidden=sel.value!=='__new';if(sel.value!=='__new')want=sel.value;};
      const cap=h('input',{type:'text',maxlength:'200',placeholder:'Caption (optional)'});
      const cancel={v:false};const cancelB=h('button',{class:'btn block',hidden:true,style:{marginTop:'8px'},onclick:()=>{cancel.v=true;cancelB.textContent='Cancelling…';}},'Cancel');
      const saveLbl=signed?'Save to gallery':'Save to Randoms';
      const saveB=h('button',{class:'btn primary block',onclick:e=>guard(e.currentTarget,async()=>{
        if(items.some(i=>i.pending))throw new Error('Photos are still loading.');
        if(!items.length)throw new Error('No photos to save.');
        let slug=sel.value;
        if(signed&&slug==='__new'){const nm=nf.value.trim();if(!nm)throw new Error('Name the new folder.');const a=await this.newFolder(nm);albums.push(a);want=a.slug;slug=a.slug;fillSel();nfBox.hidden=true;}
        cancel.v=false;cancelB.hidden=false;let n=0;
        try{
          for(const it of items){
            if(cancel.v)break;saveB.textContent=`Saving ${n+1} of ${items.length}…`;
            const pr=it.prepared;
            if(signed){const path=await uploadFile('gallery',pr.blob,pr.ext,pr.type);
              if(cancel.v){removeFile('gallery',path);break;}
              const r=await sb.from('photos').insert({user_id:Auth.user.id,album_slug:slug,storage_path:path,caption:cap.value.trim().slice(0,200)||null,status:'private'});
              if(r.error){removeFile('gallery',path);throw r.error;}}
            else await LocalGallery.add(pr.blob,'randoms',cap.value.trim().slice(0,200));
            n++;
          }
        }finally{cancelB.hidden=true;cancelB.textContent='Cancel';saveB.textContent=saveLbl;}
        if(cancel.v&&!n){toast('Cancelled');return;}
        toast((n>1?n+' photos':'Photo')+' saved to '+(albums.find(a=>a.slug===slug)||{title:'Randoms'}).title+(cancel.v?' (cancelled the rest)':''),'ok');close();opts.done&&opts.done();
      })},saveLbl);
      b.append(...[strip,field('Folder',sel,signed?undefined:'Signed out: one photo at a time, saved to Randoms on this device. Sign in to add many and pick folders.'),nfBox,field('Caption',cap),saveB,cancelB,
        signed?null:h('button',{class:'btn block',style:{marginTop:'8px'},onclick:()=>{close();ctx.open('account',{mode:'signin'});}},'Sign in to choose a folder'),
        h('button',{class:'btn block',style:{marginTop:'8px'},onclick:async()=>{const ok=items.filter(i=>i.prepared);ok.forEach(i=>download(i.prepared.blob,'lukks-photo.'+i.prepared.ext));}},icon('download'),'Save to my device')].filter(Boolean));
    });
  }
};

let _camStop=null;
defApp({id:'camera',name:'Camera',bg:'linear-gradient(#b9b9bf,#6e6e75)',dock:true,glyph:()=>`<svg viewBox="0 0 60 60"><path d="M14 20h6l3-5h14l3 5h6a4 4 0 0 1 4 4v17a4 4 0 0 1-4 4H14a4 4 0 0 1-4-4V24a4 4 0 0 1 4-4z" fill="#1c1c1e"/><circle cx="30" cy="32" r="10" fill="#2c2c30" stroke="#8d8d93" stroke-width="2"/><circle cx="30" cy="32" r="5.5" fill="#0b1830"/><circle cx="27.5" cy="29.5" r="1.8" fill="#6f8fd0" opacity=".7"/><circle cx="42" cy="24.5" r="1.8" fill="#ffd60a"/></svg>`,
mount(el,ctx){
  el.classList.add('dark');
  let stream=null,facing='environment',shot=null;
  const video=h('video',{playsinline:'',muted:'',autoplay:'',class:'cam-video','aria-label':'Camera preview'});
  const msg=h('div',{class:'cam-msg'});
  const flash=h('div',{class:'cam-flash'});
  const shutter=h('button',{class:'shutter','aria-label':'Take photo',onclick:capture});
  const flip=h('button',{class:'cam-side','aria-label':'Switch camera',onclick:()=>{facing=facing==='environment'?'user':'environment';start();}},icon('flip'));
  const pick=h('button',{class:'cam-side','aria-label':'Choose a photo',onclick:async()=>{const fs=await pickFiles('image/jpeg,image/png,image/webp');if(fs.length){if(!Auth.user&&fs.length>1)toast('Sign in to add more than one photo');Contrib.sendSheet(ctx,fs);}}},icon('image'));
  const stage=h('div',{class:'cam-stage'},video,msg,flash);
  el.append(appBar({title:'Camera',onBack:ctx.close,backLabel:'Back'}),stage,h('div',{class:'cam-bar'},pick,shutter,flip));
  async function start(){
    stop();msg.textContent='';
    if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia||!window.isSecureContext){fallback('Live camera is not available here. You can still choose a photo from your device.');return;}
    try{stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:facing,width:{ideal:1920}},audio:false});video.srcObject=stream;video.classList.toggle('mirror',facing==='user');await video.play().catch(()=>{});}
    catch(e){fallback(e&&e.name==='NotAllowedError'?'Camera access was blocked. Allow it in your browser settings, or choose a photo instead.':'No camera found. Choose a photo from your device instead.');}
  }
  function fallback(t){msg.innerHTML='';msg.append(h('p',null,t),h('button',{class:'btn primary',onclick:async()=>{const fs=await pickFiles('image/jpeg,image/png,image/webp');if(fs.length)Contrib.sendSheet(ctx,fs);}},'Choose photos'),h('button',{class:'btn',style:{marginTop:'8px'},onclick:async()=>{const f=await pickFile('image/*','environment');if(f)Contrib.sendSheet(ctx,f);}},'Take a photo'));flip.hidden=true;shutter.disabled=true;}
  function stop(){if(stream){stream.getTracks().forEach(t=>t.stop());stream=null;}}
  async function capture(){
    if(!video.videoWidth)return;
    const c=document.createElement('canvas');c.width=video.videoWidth;c.height=video.videoHeight;const g=c.getContext('2d');
    if(facing==='user'){g.translate(c.width,0);g.scale(-1,1);}g.drawImage(video,0,0);
    flash.classList.remove('go');void flash.offsetWidth;flash.classList.add('go');
    const blob=await new Promise(r=>c.toBlob(r,'image/jpeg',.9));if(blob)Contrib.sendSheet(ctx,blob);
  }
  _camStop=stop;start();
},unmount(){_camStop&&_camStop();_camStop=null;}});
