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
  /* shared dialog: save a photo into the gallery. Signed out: Randoms only, kept on this device. */
  sendSheet(ctx,blobOrFile,opts){
    opts=opts||{};
    sheet('Save photo',async(b,close)=>{
      let prepared;
      try{prepared=await prepareImage(blobOrFile instanceof File?blobOrFile:new File([blobOrFile],'photo.jpg',{type:blobOrFile.type||'image/jpeg'}),{max:1800});}catch(e){b.append(h('p',{class:'err-t'},errMsg(e)));return;}
      const albums=await this.albums();
      const url=URL.createObjectURL(prepared.blob);
      const signed=!!Auth.user;
      const want=signed?(opts.album||'randoms'):'randoms';
      const sel=h('select',{disabled:!signed},albums.map(a=>h('option',{value:a.slug,selected:a.slug===want},a.title)));
      const cap=h('input',{type:'text',maxlength:'200',placeholder:'Caption (optional)'});
      b.append(h('img',{src:url,alt:'Your photo',style:{width:'100%',maxHeight:'240px',objectFit:'contain',borderRadius:'12px',background:'#000'}}),
        field('Folder',sel,signed?null:'Signed out, photos go to Randoms and stay on this device.'),
        field('Caption',cap),
        h('button',{class:'btn primary block',onclick:e=>guard(e.currentTarget,async()=>{
          if(signed){const path=await uploadFile('gallery',prepared.blob,prepared.ext,prepared.type);
            const r=await sb.from('photos').insert({user_id:Auth.user.id,album_slug:sel.value,storage_path:path,caption:cap.value.trim().slice(0,200)||null,status:'private'});
            if(r.error){removeFile('gallery',path);throw r.error;}}
          else await LocalGallery.add(prepared.blob,'randoms',cap.value.trim().slice(0,200));
          toast('Saved to '+(albums.find(a=>a.slug===sel.value)||{title:'Randoms'}).title,'ok');close();opts.done&&opts.done();})},icon('image'),'Save to gallery'),
        signed?null:h('button',{class:'btn block',style:{marginTop:'8px'},onclick:()=>{close();ctx.open('account',{mode:'signin'});}},'Sign in to choose a folder'),
        h('button',{class:'btn block',style:{marginTop:'8px'},onclick:()=>{download(prepared.blob,'lukks-photo.'+prepared.ext);}},icon('download'),'Save to my device'));
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
  const pick=h('button',{class:'cam-side','aria-label':'Choose a photo',onclick:async()=>{const f=await pickFile('image/jpeg,image/png,image/webp');if(f)Contrib.sendSheet(ctx,f);}},icon('image'));
  const stage=h('div',{class:'cam-stage'},video,msg,flash);
  el.append(appBar({title:'Camera',onBack:ctx.close,backLabel:'Back'}),stage,h('div',{class:'cam-bar'},pick,shutter,flip));
  async function start(){
    stop();msg.textContent='';
    if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia||!window.isSecureContext){fallback('Live camera is not available here. You can still choose a photo from your device.');return;}
    try{stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:facing,width:{ideal:1920}},audio:false});video.srcObject=stream;video.classList.toggle('mirror',facing==='user');await video.play().catch(()=>{});}
    catch(e){fallback(e&&e.name==='NotAllowedError'?'Camera access was blocked. Allow it in your browser settings, or choose a photo instead.':'No camera found. Choose a photo from your device instead.');}
  }
  function fallback(t){msg.innerHTML='';msg.append(h('p',null,t),h('button',{class:'btn primary',onclick:async()=>{const f=await pickFile('image/*','environment');if(f)Contrib.sendSheet(ctx,f);}},'Choose or take a photo'));flip.hidden=true;shutter.disabled=true;}
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
