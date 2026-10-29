/* ---------- CAMERA + contribution helpers (community photos, magazine submissions) ---------- */
const Contrib={
  async postCommunity(p,caption){
    const fd=new FormData();fd.append('file',new File([p.blob],'photo.'+p.ext,{type:p.type}));fd.append('caption',(caption||'').slice(0,200));
    const headers={apikey:CFG.supabaseKey};
    try{const s=await sb.auth.getSession();if(s&&s.data&&s.data.session)headers.Authorization='Bearer '+s.data.session.access_token;}catch(e){}
    const ctl=new AbortController();const to=setTimeout(()=>ctl.abort(),45000);
    let res;try{res=await fetch(CFG.supabaseUrl+'/functions/v1/community-upload',{method:'POST',headers,body:fd,signal:ctl.signal});}catch(e){throw new Error('Could not reach the server. Check your connection and try again.');}finally{clearTimeout(to);}
    const j=await res.json().catch(()=>({}));
    if(!res.ok)throw new Error(j.message||'Could not upload the photo.');
  },
  async mySubmissions(){const r=await sb.from('magazine_submissions').select('*').eq('user_id',Auth.user.id).order('created_at',{ascending:false});return r.data||[];},
  async submitMagazine(p,caption,credit,consent){
    if(!Auth.user)throw new Error('Sign in first.');
    if(!consent)throw new Error('Please confirm you own this photo and agree to it being featured.');
    if(!caption||caption.trim().length<3)throw new Error('Add a short caption.');
    const mine=(await this.mySubmissions()).filter(s=>s.status!=='rejected');
    if(mine.length>=CFG.limits.magazinePhotos)throw new Error(`You can submit up to ${CFG.limits.magazinePhotos} photos. Delete a pending one or wait for a decision.`);
    const hash=await sha256(p.blob);
    const path=await uploadFile('submissions',p.blob,p.ext,p.type);
    const r=await sb.from('magazine_submissions').insert({user_id:Auth.user.id,storage_path:path,caption:caption.trim().slice(0,200),credit:(credit||'').trim().slice(0,80)||null,consent:true,content_hash:hash,status:'pending'});
    if(r.error){removeFile('submissions',path);throw r.error;}
  },
  /* shared dialog: what to do with a photo */
  sendSheet(ctx,blobOrFile){
    sheet('Share this photo',async(b,close)=>{
      let prepared;
      try{prepared=await prepareImage(blobOrFile instanceof File?blobOrFile:new File([blobOrFile],'photo.jpg',{type:blobOrFile.type||'image/jpeg'}),{max:1800});}catch(e){b.append(h('p',{class:'err-t'},errMsg(e)));return;}
      const url=URL.createObjectURL(prepared.blob);
      const cap=h('input',{type:'text',maxlength:'200',placeholder:'Caption'});
      const note=h('p',{class:'muted small-t'},'Photos are reviewed before they appear. Nothing is public until approved.');
      b.append(h('img',{src:url,alt:'Your photo',style:{width:'100%',maxHeight:'240px',objectFit:'contain',borderRadius:'12px',background:'#000'}}),
        field('Caption',cap),
        h('button',{class:'btn block',onclick:e=>guard(e.currentTarget,async()=>{await this.postCommunity(prepared,cap.value);toast('Sent for review','ok');close();})},icon('image'),'Post to Community album'),
        h('button',{class:'btn block',style:{marginTop:'8px'},onclick:()=>{download(prepared.blob,'lukks-photo.'+prepared.ext);}},icon('download'),'Save to my device'),note);
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
