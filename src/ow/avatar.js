/* ---------- OWA.build: avatars from real, professionally modelled GLB characters ----------
 * No geometry is generated here. The mesh, skin weights, skeleton, morph targets and textures all come from the GLB
 * (assets/avatars/*.glb) loaded by OWGLB. This file only drives it: materials (tints), bone proportions, face morphs,
 * procedural walk/sit/lie/wave/dance poses on the real skeleton, and optional extra skinned garments/hair (attach()).
 * Interface used by the room (walk.js): {group,height,scale,lift,seatTop,update(dt,speed),setPose(name),pose,dispose()}. */
(function(){
const T=THREE,PI=Math.PI,clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),lerp=(a,b,t)=>a+(b-a)*t;
const bufCache={},GC={};OWA._lin=hex=>{const c=new THREE.Color(hex);c.convertSRGBToLinear();return c;};
/* start downloading the avatar models early, so a room opens with them already in memory */
OWA.prefetch=function(gs){(gs||['m','f']).forEach(g=>{const m=OWA.MODELS[g];if(m)fetchBuf(m.url).catch(()=>{});});};
function fetchBuf(url){return bufCache[url]||(bufCache[url]=fetch(url).then(r=>{if(!r.ok)throw new Error('avatar model '+r.status);return r.arrayBuffer();}).catch(e=>{delete bufCache[url];throw e;}));}
const lin=hex=>{const c=new T.Color(hex);c.convertSRGBToLinear();return c;};
/* average linear colour of a texture image (used so a tint hits its target on average and keeps the painted detail) */
function avgLinear(img){
  try{const c=document.createElement('canvas');c.width=c.height=24;const g=c.getContext('2d');g.drawImage(img,0,0,24,24);const d=g.getImageData(0,0,24,24).data;let r=0,gg=0,b=0,n=0;
    const f=v=>{v/=255;return v<=.04045?v/12.92:Math.pow((v+.055)/1.055,2.4);};
    for(let i=0;i<d.length;i+=4){r+=f(d[i]);gg+=f(d[i+1]);b+=f(d[i+2]);n++;}return new T.Color(r/n,gg/n,b/n);}catch(e){return new T.Color(.5,.5,.5);}
}
function tintFor(hex,avg){const t=lin(hex);return new T.Color(clamp(t.r/Math.max(.02,avg.r),0,3),clamp(t.g/Math.max(.02,avg.g),0,3),clamp(t.b/Math.max(.02,avg.b),0,3));}
/* recolour only the iris of the 64px eye texture, keeping its shading, pupil and highlight */
function eyeTexture(img,hex){
  const S=img.S||img.naturalWidth||img.width||64;let d;if(img.raw)d=new Uint8ClampedArray(img.raw);else{const c=document.createElement('canvas');c.width=c.height=S;const g=c.getContext('2d');g.drawImage(img,0,0,S,S);d=g.getImageData(0,0,S,S).data;}
  const tc=new T.Color(hex||'#000'),R=S*.215;
  for(let y=0;hex&&y<S;y++)for(let x=0;x<S;x++){const dx=x+.5-S/2,dy=y+.5-S*.49,r=Math.hypot(dx,dy);if(r>R*1.05)continue;const i=(y*S+x)*4,lum=(.3*d[i]+.59*d[i+1]+.11*d[i+2])/255;
    if(lum>.6)continue;const k=clamp(lum/.3,.25,1.6),w=clamp((R*1.05-r)/(R*.25),0,1);
    d[i]=lerp(d[i],clamp(tc.r*255*k,0,255),w);d[i+1]=lerp(d[i+1],clamp(tc.g*255*k,0,255),w);d[i+2]=lerp(d[i+2],clamp(tc.b*255*k,0,255),w);}
  /* kept as raw pixels in JS memory: a canvas-backed texture can be blanked by the browser when the tab is in the background */
  const t=new T.DataTexture(new Uint8Array(d),S,S,T.RGBAFormat);t.flipY=false;t.encoding=T.sRGBEncoding;t.generateMipmaps=true;t.minFilter=T.LinearMipmapLinearFilter;t.magFilter=T.LinearFilter;t.anisotropy=2;t.needsUpdate=true;return t;}

function build(cfg){
  cfg=OWA.migrate(cfg);const M=OWA.MODELS[cfg.g]||OWA.MODELS.f;
  const group=new T.Group();group.name='avatar';
  const st={pose:'stand',t:Math.random()*10,walk:0,blink:2+Math.random()*3,bl:0,talk:0,talkS:0,syl:0,gR:0,gL:0,w:{},ready:false,disposed:false,wear:{}};
  const av={group,cfg,height:M.height,scale:M.height/1.68,lift:0,seatTop:null,ready:null,A:null,
    update,setPose(p){st.pose=p;},headPos(v){if(bones.Head)bones.Head.getWorldPosition(v);return v;},setGesture(n,t,w,tg){st.gn=n||null;st.gt=t||0;st.gw=w==null?1:w;st.gtg=tg||null;},get pose(){return st.pose;},apply,dispose,attach,detach,setTalk(v){st.talk=clamp(+v||0,0,1);},get talking(){return st.talkS>.05;},morphNames:[],slots:{}};
  let A=null,root=null,bones={},rest={},home={},skin={},eyeImg=null,eyeKey='',rs=1,floor=0,ankle=0,geo={},baseHidden={};
  const parts=()=>A.skinned;

  av.ready=fetchBuf(M.url).then(buf=>OWGLB.parse(buf)).then(init).then(()=>av);
  function init(G){
    if(st.disposed)return;A=av.A=G;root=new T.Group();root.name='model';root.add(G.scene);group.add(root);bones=G.bones;
    for(const n in bones){const b=bones[n];rest[n]={p:b.position.clone(),q:b.quaternion.clone(),s:b.scale.clone()};}
    G.scene.updateMatrixWorld(true);Object.values(G.skinned).forEach(m=>m.skeleton.update());
    /* measure the real skinned extents once, in model units */
    const ext=(m)=>{let mn=1e9,mx=-1e9;const p=m.geometry.attributes.position,t=new T.Vector3();for(let i=0;i<p.count;i++){m.boneTransform(i,t);t.applyMatrix4(m.matrixWorld);mn=Math.min(mn,t.y);mx=Math.max(mx,t.y);}return[mn,mx];};
    const GCk=M.url,GCc=GC[GCk];
    if(GCc){/* identical rig every time: reuse the measurements from the first avatar of this model (saves most of the per-avatar setup time) */
      geo.H0=GCc.H0;geo.foot0=GCc.foot0;geo.ankle0=GCc.ankle0;geo.bw=JSON.parse(JSON.stringify(GCc.bw));
      for(const k in G.skinned)if(GCc.D[k])G.skinned[k]._D=GCc.D[k];
      Object.values(G.materials).forEach(m=>{if(GCc.avg[m.name])m.userData.avg=GCc.avg[m.name].clone();});
    }else{
    const fh=ext(G.skinned.Wolf3D_Outfit_Footwear||G.skinned.Wolf3D_Body),hh=ext(G.skinned.Wolf3D_Hair||G.skinned.Wolf3D_Head),hd=ext(G.skinned.Wolf3D_Head);
    geo.H0=Math.max(hh[1],hd[1])-fh[0];geo.foot0=fh[0];
    const wy=n=>bones[n].getWorldPosition(new T.Vector3()).y;
    /* the GLB's meshes are stored in a normalised per-mesh space: D (per axis) maps raw -> model space. Wear pieces are modelled in model space and converted. */
    for(const k in G.skinned){const m=G.skinned[k],P=m.geometry.attributes.position,t=new T.Vector3(),a=[1e9,1e9,1e9],b=[-1e9,-1e9,-1e9],ra=[1e9,1e9,1e9],rb=[-1e9,-1e9,-1e9];
      for(let i=0;i<P.count;i++){m.boneTransform(i,t);t.applyMatrix4(m.matrixWorld);const v=[t.x,t.y,t.z];for(let q=0;q<3;q++){const r=P.array[i*3+q];a[q]=Math.min(a[q],v[q]);b[q]=Math.max(b[q],v[q]);ra[q]=Math.min(ra[q],r);rb[q]=Math.max(rb[q],r);}}
      const sc=[0,1,2].map(q=>(rb[q]-ra[q])>1e-9?(b[q]-a[q])/(rb[q]-ra[q]):1);m._D={s:sc,t:[0,1,2].map(q=>a[q]-sc[q]*ra[q])};}
    geo.bw={};for(const n in bones){const v=bones[n].getWorldPosition(new T.Vector3());geo.bw[n]={x:v.x,y:v.y,z:v.z};}
    geo.ankle0=Math.min(wy('LeftFoot'),wy('RightFoot'))-geo.foot0;
    Object.values(G.materials).forEach(m=>{if(m.map&&m.map.image)m.userData.avg=avgLinear(m.map.image);});
      GC[GCk]={H0:geo.H0,foot0:geo.foot0,ankle0:geo.ankle0,bw:JSON.parse(JSON.stringify(geo.bw)),D:Object.fromEntries(Object.entries(G.skinned).map(([k,m])=>[k,m._D])),avg:Object.fromEntries(Object.values(G.materials).filter(m=>m.userData.avg).map(m=>[m.name,m.userData.avg.clone()]))};
    }
    for(const m of G.materials)skin[m.name]=m;eyeImg=skin.Wolf3D_Eye&&skin.Wolf3D_Eye.map?skin.Wolf3D_Eye.map.image:null;if(eyeImg){try{const S0=eyeImg.naturalWidth||eyeImg.width||64,c0=document.createElement('canvas');c0.width=c0.height=S0;const g0=c0.getContext('2d');g0.drawImage(eyeImg,0,0,S0,S0);eyeImg={S:S0,raw:g0.getImageData(0,0,S0,S0).data};}catch(e){}}
    av.morphNames=G.morphs.slice();av._geo=geo;
    Object.values(G.meshes).forEach(m=>{m.castShadow=false;});
    apply(cfg);st.ready=true;av.onReady&&av.onReady(av);
  }

  /* ---------- live customisation ---------- */
  function setSkin(hex){const body=skin.Wolf3D_Body,head=skin.Wolf3D_Skin;if(body)body.color.copy(lin(hex));if(head)head.color.copy(tintFor(hex,head.userData.avg||new T.Color(.6,.45,.38)));
    if(head)head.roughness=.62;}
  function tintMat(m,hex){if(!m)return;if(!hex){m.color.set(0xffffff);return;}m.color.copy(tintFor(hex,m.userData.avg||new T.Color(.4,.4,.4)));}
  function applyBody(c){
    const P=Object.assign({},c),mp=M.prop;if(mp)for(const k in mp)P[k]=clamp((P[k]||0)+mp[k],-1.2,1.2);
    for(const n in bones){const b=bones[n],r=rest[n];b.position.copy(r.p);b.scale.copy(r.s);b.quaternion.copy(r.q);}
    const mul=(n,f)=>{if(bones[n])bones[n].position.multiplyScalar(f);};
    const af=1+.12*P.arms,lf=1+.1*P.legs,nf=1+.3*P.neck;
    for(const s of['Left','Right']){mul(s+'ForeArm',af);mul(s+'Hand',af);mul(s+'Leg',lf);mul(s+'Foot',lf);
      const sg=s==='Left'?1:-1,H=geo.H0;
      if(bones[s+'Shoulder'])bones[s+'Shoulder'].position.x+=sg*P.sh*.035*H*(1/ (bones[s+'Shoulder'].parent.scale.x||1));
      if(bones[s+'UpLeg'])bones[s+'UpLeg'].position.x+=sg*P.hips*.02*H/(bones[s+'UpLeg'].parent.scale.x||1);
      if(bones[s+'Hand'])bones[s+'Hand'].scale.multiplyScalar(1+.16*P.hands);if(bones[s+'Foot'])bones[s+'Foot'].scale.multiplyScalar(1+.14*P.feet);}
    mul('Head',nf);
    if(bones.Head)bones.Head.scale.multiplyScalar(1+.12*P.hd);
    const cw=1+.12*P.chest,ww=1+.14*P.waist;
    if(bones.Spine1)bones.Spine1.scale.x*=ww;if(bones.Spine2)bones.Spine2.scale.x*=cw/ww;if(bones.Neck)bones.Neck.scale.x/=cw;
    /* keep the head undistorted: Neck compensates the chest width, so Head only carries its own size */
    for(const n in bones){home[n]={q:bones[n].quaternion.clone()};}home.Hips.p=bones.Hips.position.clone();
    const hs=1+.07*c.h;rs=M.height/geo.H0*hs*(M.prop&&M.prop.h?1:1);root.scale.setScalar(rs);
    root.updateMatrixWorld(true);
    const fy=Math.min(bones.LeftFoot.getWorldPosition(new T.Vector3()).y,bones.RightFoot.getWorldPosition(new T.Vector3()).y);
    /* ground the feet: world foot bone y (model units, root scaled) minus the ankle height */
    const fyLocal=Math.min(root.worldToLocal(bones.LeftFoot.getWorldPosition(new T.Vector3())).y,root.worldToLocal(bones.RightFoot.getWorldPosition(new T.Vector3())).y);
    floor=fyLocal-geo.ankle0*(1+.14*P.feet*0);root.position.y=-floor*rs;
    av.height=M.height*hs*(1+.5*(.12*P.legs*.1));av.scale=av.height/1.68;
    geo.hipsH=(root.worldToLocal(bones.Hips.getWorldPosition(new T.Vector3())).y-floor)*rs;
    geo.thigh=bones.LeftUpLeg.position.length()*0;
    const wp=n=>root.worldToLocal(bones[n].getWorldPosition(new T.Vector3()));
    {const f=wp('LeftFoot'),t=wp('LeftToeBase'),d=t.sub(f).normalize();geo.toeDir={x:0,y:d.y,z:Math.max(.3,d.z)};}
    geo.thigh=wp('LeftUpLeg').distanceTo(wp('LeftLeg'))*rs;geo.shin=(wp('LeftLeg').y-floor)*rs;
  }
  function apply(c){
    c=av.cfg=OWA.migrate(c);if(!A)return;
    setSkin(OWA.SKIN[clamp(c.skin|0,0,OWA.SKIN.length-1)]);
    const hm=skin.Wolf3D_Hair;if(hm)hm.color.copy(lin(OWA.HAIRC[clamp(c.hc|0,0,OWA.HAIRC.length-1)]));
    
    if(parts().Wolf3D_Glasses){parts().Wolf3D_Glasses.visible=!!c.glasses;if(c.glc&&skin.Wolf3D_Glasses)skin.Wolf3D_Glasses.color.copy(lin(c.glc));}
    tintMat(skin.Wolf3D_Outfit_Top,c.topc);tintMat(skin.Wolf3D_Outfit_Bottom,c.botc);tintMat(skin.Wolf3D_Outfit_Footwear,c.shoec);
    if(parts().Wolf3D_Outfit_Footwear)parts().Wolf3D_Outfit_Footwear.visible=!c.bare;
    /* eye colour: recolour the iris texture only when it changed */
    const ek=OWA.EYEC[clamp(c.eyec|0,0,OWA.EYEC.length-1)];
    if(eyeImg&&skin.Wolf3D_Eye&&ek!==eyeKey){eyeKey=ek;const old=skin.Wolf3D_Eye.map,t=eyeTexture(eyeImg,ek);skin.Wolf3D_Eye.map=t;skin.Wolf3D_Eye.needsUpdate=true;if(old&&old!==t&&old._own)old.dispose();t._own=true;}
    applyBody(c);
    applyWear(c);
    for(const slot in c.extras||{})if(!isWear(slot,c.extras[slot])&&(!av.slots[slot]||av.slots[slot].id!==c.extras[slot]))loadExtra(slot,c.extras[slot]);
    for(const slot in av.slots)if(!(c.extras&&c.extras[slot]))detach(slot);
    av.dirty&&av.dirty();
  }
  /* built-in extra hairstyles / garments / hats (avatar-wear.js), made from the model's own meshes and skeleton */
  const isWear=(slot,id)=>!!(OWA.WEAR&&OWA.WEAR[slot]&&Array.isArray(OWA.WEAR[slot])&&OWA.WEAR[slot].some(x=>x[0]===id));
  function wearCtx(){if(geo.wctx)return geo.wctx;const bt=parts().Wolf3D_Outfit_Bottom,P=OWA._wpos(bt),hy=geo.bw.Hips.y,tol=geo.H0*.02;let x0=1e9,x1=-1e9,z0=1e9,z1=-1e9;
    for(let i=0;i<P.length/3;i++)if(Math.abs(P[i*3+1]-hy)<tol){x0=Math.min(x0,P[i*3]);x1=Math.max(x1,P[i*3]);z0=Math.min(z0,P[i*3+2]);z1=Math.max(z1,P[i*3+2]);}
    return geo.wctx={parts:parts(),bones,H0:geo.H0,bw:geo.bw,skirtRx:(x1-x0)/2,skirtRz:(z1-z0)/2,skirtCz:(z0+z1)/2};}
  function applyWear(c){
    const W=OWA.WEAR;if(!W||!W.make)return;const ex=c.extras||{},def=W.defaults,hid=new Set();
    for(const slot of['hair','top','bottom','hat']){const id=isWear(slot,ex[slot])?ex[slot]:null,cur=st.wear[slot];
      if(cur&&cur.id!==id){cur.meshes.forEach(m=>{m.parent&&m.parent.remove(m);m.geometry.dispose();m.material.dispose();});delete st.wear[slot];}
      if(id&&!st.wear[slot]){try{const r=W.make(slot,id,wearCtx());if(r){const par=parts().Wolf3D_Head.parent||A.scene;r.meshes.forEach(m=>par.add(m));st.wear[slot]={id,meshes:r.meshes,hide:r.hide,color:r.color,skin:r.skin};}}catch(e){console.warn('wear',slot,id,e);}}
      const w=st.wear[slot];if(w){w.hide.forEach(n=>hid.add(n));
        const hex=slot==='hair'?OWA.HAIRC[clamp(c.hc|0,0,OWA.HAIRC.length-1)]:slot==='top'?(c.topc||def.top):slot==='bottom'?(c.botc||def.bottom):(c.hatc||def.hat);w.color.color.copy(lin(hex));if(w.skin)w.skin.color.copy(lin(OWA.SKIN[clamp(c.skin|0,0,OWA.SKIN.length-1)]));}}
    const P=parts();if(P.Wolf3D_Hair)P.Wolf3D_Hair.visible=c.hair!=='none'&&!hid.has('Wolf3D_Hair')&&!st.hairSlot;
    if(P.Wolf3D_Outfit_Top)P.Wolf3D_Outfit_Top.visible=!hid.has('Wolf3D_Outfit_Top');if(P.Wolf3D_Outfit_Bottom)P.Wolf3D_Outfit_Bottom.visible=!hid.has('Wolf3D_Outfit_Bottom');}
  function loadExtra(slot,id){const cat=OWA.catalog&&OWA.catalog.items.find(i=>i.id===id);if(!cat)return;attach(slot,OWA.BASE+cat.url,cat).catch(e=>console.warn('avatar extra',id,e.message));}

  /* extra skinned garments / hair: any GLB authored on the same skeleton. The base mesh listed in opts.hide is hidden. */
  async function attach(slot,url,opts){
    opts=opts||{};await av.ready;const buf=await fetchBuf(url),G=await OWGLB.parse(buf);detach(slot);const added=[],hidden=[];
    for(const [name,mesh] of Object.entries(G.skinned)){
      if(opts.pick&&!opts.pick.includes(name))continue;const src=mesh.skeleton,bs=src.bones.map(b=>bones[b.name]);
      if(bs.some(b=>!b)){console.warn('attach: skeleton mismatch for',name);continue;}
      const sk=new T.Skeleton(bs,src.boneInverses.map(m=>m.clone())),bm=mesh.bindMatrix.clone();
      mesh.parent&&mesh.parent.remove(mesh);mesh.bind(sk,bm);mesh.castShadow=false;A.scene.add(mesh);added.push(mesh);
      if(opts.tint&&mesh.material){const col=opts.tint;mesh.material.color.copy(tintFor(col,mesh.material.map&&mesh.material.map.image?avgLinear(mesh.material.map.image):new T.Color(.4,.4,.4)));}}
    for(const [name,m] of Object.entries(G.meshes)){if(G.skinned[name]||(opts.pick&&!opts.pick.includes(name)))continue;
      const b=bones[opts.bone||'Head'];if(!b)continue;m.parent&&m.parent.remove(m);if(opts.offset)m.position.fromArray(opts.offset);b.add(m);added.push(m);}
    (opts.hide||[]).forEach(n=>{const p=parts()[n];if(p&&p.visible){p.visible=false;hidden.push(p);}});
    if(slot==='hair')st.hairSlot=true;
    av.slots[slot]={id:opts.id||url,meshes:added,hidden,G};av.dirty&&av.dirty();return added;}
  function detach(slot){const s=av.slots[slot];if(!s)return;s.meshes.forEach(m=>{m.parent&&m.parent.remove(m);m.geometry&&m.geometry.dispose();});s.hidden.forEach(p=>{p.visible=true;});
    if(slot==='hair')st.hairSlot=false;delete av.slots[slot];if(A)apply(Object.assign({},av.cfg));}

  /* ---------- procedural animation on the real skeleton ---------- */
  const _p=new T.Vector3(),_c=new T.Vector3(),_cur=new T.Vector3(),_rq=new T.Quaternion(),_rqi=new T.Quaternion(),_dq=new T.Quaternion(),_bq=new T.Quaternion(),_nq=new T.Quaternion(),_pq=new T.Quaternion(),_ax=new T.Vector3(),_t=new T.Vector3();
  function setWorldRot(bone,deltaRoot){root.getWorldQuaternion(_rq);_rqi.copy(_rq).invert();bone.getWorldQuaternion(_bq);
    _nq.copy(_rq).multiply(deltaRoot).multiply(_rqi).multiply(_bq);bone.parent.getWorldQuaternion(_pq);bone.quaternion.copy(_pq.invert().multiply(_nq));bone.updateMatrixWorld(true);}
  function aim(n,cn,x,y,z){const b=bones[n],c=bones[cn];if(!b||!c)return;b.getWorldPosition(_p);c.getWorldPosition(_c);_cur.subVectors(_c,_p);root.getWorldQuaternion(_rq);_rqi.copy(_rq).invert();_cur.applyQuaternion(_rqi).normalize();
    _t.set(x,y,z).normalize();_dq.setFromUnitVectors(_cur,_t);setWorldRot(b,_dq);}
  function rot(n,ax,ay,az,ang){const b=bones[n];if(!b)return;_ax.set(ax,ay,az).normalize();_dq.setFromAxisAngle(_ax,ang);setWorldRot(b,_dq);}
  function placeHips(yMeters,zMeters){const b=bones.Hips;root.updateMatrixWorld(true);const cur=root.worldToLocal(b.getWorldPosition(new T.Vector3()));
    _t.set(cur.x,floor+yMeters/rs,cur.z+zMeters/rs);root.localToWorld(_t);b.parent.worldToLocal(_t);b.position.copy(_t);b.updateMatrixWorld(true);}
  const arm=(s,ux,uy,uz,fx,fy,fz)=>{const S=s==='L'?'Left':'Right',sg=s==='L'?1:-1;aim(S+'Arm',S+'ForeArm',sg*ux,uy,uz);aim(S+'ForeArm',S+'Hand',sg*fx,fy,fz);};
  const leg=(s,tx,ty,tz,sx,sy,sz)=>{const S=s==='L'?'Left':'Right',sg=s==='L'?1:-1;aim(S+'UpLeg',S+'Leg',sg*tx,ty,tz);aim(S+'Leg',S+'Foot',sg*sx,sy,sz);const d=geo.toeDir||{x:0,y:-.18,z:1};aim(S+'Foot',S+'ToeBase',d.x,d.y,d.z);};
  /* seated: arms rest on the desk, lift into natural hand gestures while talking, head nods and sways */
  const mixv=(a,b,k)=>[a[0]+(b[0]-a[0])*k,a[1]+(b[1]-a[1])*k,a[2]+(b[2]-a[2])*k];
  /* host gestures: hands are moved by IK to targets (chest, cheek, lips, desk, bottle), the face gets a matching expression */
  const GFACE={angry:{browDownLeft:.9,browDownRight:.9,eyeSquintLeft:.45,eyeSquintRight:.45,mouthFrownLeft:.6,mouthFrownRight:.6,noseSneerLeft:.4,noseSneerRight:.4,mouthPressLeft:.3,mouthPressRight:.3,jawForward:.15},
    smile:{mouthSmileLeft:.9,mouthSmileRight:.9,cheekSquintLeft:.45,cheekSquintRight:.45,eyeSquintLeft:.2,eyeSquintRight:.2,browInnerUp:.15},
    quiet:{mouthPucker:.5,browInnerUp:.3,eyeWideLeft:.15,eyeWideRight:.15},clap:{mouthSmileLeft:.55,mouthSmileRight:.55,cheekSquintLeft:.2,cheekSquintRight:.2},
    cheek:{mouthSmileLeft:.25,mouthSmileRight:.25,browInnerUp:.12},fold:{mouthSmileLeft:.2,mouthSmileRight:.2,browInnerUp:.1},drink:{mouthPucker:.3,jawOpen:.1}};
  function reachTo(S,sg,T_,pole,lp){
    if(!bones[S+'Hand']||!bones[S+'ForeArm'])return;
    const sh=lp(S+'Arm'),el0=lp(S+'ForeArm'),ha0=lp(S+'Hand'),l1=sh.distanceTo(el0),l2=el0.distanceTo(ha0);
    const dv=T_.clone().sub(sh);let d=dv.length();const mx=(l1+l2)*.98;if(d>mx){dv.multiplyScalar(mx/d);d=mx;}else if(d<.05/rs)d=.05/rs;
    const dir=dv.clone().normalize(),aa=(l1*l1-l2*l2+d*d)/(2*d),hh=Math.sqrt(Math.max(0,l1*l1-aa*aa));
    const po=pole.clone();po.addScaledVector(dir,-po.dot(dir)).normalize();
    const el=sh.clone().addScaledVector(dir,aa).addScaledVector(po,hh),u=el.sub(sh).normalize();aim(S+'Arm',S+'ForeArm',u.x,u.y,u.z);
    const ea=lp(S+'ForeArm'),f=T_.clone().sub(ea).normalize();aim(S+'ForeArm',S+'Hand',f.x,f.y,f.z);}
  function gesture(lp){
    const n=st.gn,w=Math.min(1,st.gw),t=st.gt,m=1/rs,V=(x,y,z)=>new T.Vector3(x,y,z);
    const head=lp('Head'),chest=lp('Spine2');
    const go=(S,sg,Tg,pole)=>{const h0=lp(S+'Hand');reachTo(S,sg,h0.lerp(Tg,w),pole,lp);};
    const both=(fn,pole)=>{[['Left',1],['Right',-1]].forEach(([S,sg])=>go(S,sg,fn(sg),V(sg*pole[0],pole[1],pole[2])));};
    const tg=st.gtg;
    if(n==='clap'){const ph=Math.sin(t*11),sep=.03+.075*(ph*.5+.5);both(sg=>V(chest.x+sg*sep*m,chest.y-.03*m,chest.z+.24*m),[.6,-.4,-.3]);rot('Head',1,0,0,.03*w);}
    else if(n==='fold'){both(sg=>V(chest.x+sg*.035*m,chest.y-.16*m,chest.z+.2*m),[.6,-.8,-.2]);}
    else if(n==='cheek'){go('Right',-1,V(head.x-.075*m,head.y-.09*m,head.z+.09*m),V(-.2,-1,.35));rot('Head',0,0,1,-.1*w);}
    else if(n==='quiet'){go('Right',-1,V(head.x-.012*m,head.y-.075*m,head.z+.135*m),V(-.4,-1,.25));}
    else if(n==='angry'&&tg&&tg.desk){const d=root.worldToLocal(tg.desk.clone());both(sg=>V(d.x+sg*.2*m,d.y+.02*m,d.z),[.5,-.5,-.6]);rot('Spine1',1,0,0,.12*w);rot('Head',1,0,0,.1*w);}
    else if(n==='drink'&&tg&&tg.bottle){const b=root.worldToLocal(tg.bottle.clone());go('Right',-1,b,V(-.4,-1,-.2));rot('Head',1,0,0,-.2*(tg.near||0)*w);}
  }
  function sitUpper(dt){
    const t=st.t,ts=st.talkS,k=Math.min(1,dt*4);
    const tR=ts*Math.pow(Math.max(0,Math.sin(t*.85+1)),.5),tL=ts*Math.pow(Math.max(0,Math.sin(t*.63+3.6)),.5);
    st.gR+=(tR-st.gR)*k;st.gL+=(tL-st.gL)*k;
    const sd=(g,ph)=>{const be=Math.sin(t*4.4+ph),b2=Math.sin(t*2.9+ph*2);
      return{u:mixv([.15,-.9,.35],[.36+.08*b2,-.55,.5],g),f:mixv([.1,-.35,1],[.05+.22*b2,.4+.28*be,1],g)};};
    const R=sd(st.gR,0),L=sd(st.gL,2.1);
    arm('R',R.u[0],R.u[1],R.u[2],R.f[0],R.f[1],R.f[2]);arm('L',L.u[0],L.u[1],L.u[2],L.f[0],L.f[1],L.f[2]);
    const lp=n=>root.worldToLocal(bones[n].getWorldPosition(new T.Vector3()));
    if(st.gn)gesture(lp);
    if(st.gR>.05)rot('RightHand',0,0,1,Math.sin(t*5.2)*.3*st.gR);if(st.gL>.05)rot('LeftHand',0,0,1,-Math.sin(t*4.7)*.3*st.gL);
    rot('Head',1,0,0,.04+Math.sin(t*.8)*.02+ts*(.05*Math.sin(t*3.3)+.03*Math.sin(t*5.7)));
    rot('Head',0,1,0,Math.sin(t*.5)*.07+ts*Math.sin(t*1.7)*.12);rot('Head',0,0,1,Math.sin(t*.6+1)*.025);
    rot('Spine1',0,1,0,Math.sin(t*.4)*.03+ts*Math.sin(t*1.1)*.05);rot('Spine2',0,0,1,Math.sin(t*.33)*.02);
  }
  function pose(dt,spd){
    for(const n in bones){const b=bones[n];if(home[n])b.quaternion.copy(home[n].q);}bones.Hips.position.copy(home.Hips.p);
    root.updateMatrixWorld(true);const w=clamp(spd,0,1),t=st.t,P=st.pose,br=Math.sin(t*1.7);
    if(P==='sit'||P==='play'||P==='type'){
      const top=av.seatTop==null?.46:av.seatTop,hp=top+.11,S=Math.max(.25,geo.shin),L=Math.max(.25,geo.thigh),kt=top+.07,al=Math.asin(clamp((hp-Math.max(S,kt))/L,-.9,.9));
      placeHips(hp,.14);leg('L',.09,-Math.sin(al),Math.cos(al),.02,-1,.12);leg('R',.09,-Math.sin(al),Math.cos(al),.02,-1,.12);
      rot('Spine1',1,0,0,.06);rot('Spine2',1,0,0,-.02+br*.01);
      if(P==='sit'){sitUpper(dt);}
      else{arm('L',.2,-.7,.55,.06,-.2,1);arm('R',.2,-.7,.55,.06,-.2,1);rot('Head',1,0,0,.16);rot('LeftHand',1,0,0,Math.sin(t*14)*.1);rot('RightHand',1,0,0,Math.sin(t*13+1)*.1);}
    }else if(P==='lie'){
      arm('L',.3,-1,.0,.2,-1,.05);arm('R',.3,-1,.0,.2,-1,.05);leg('L',.06,-1,0,.04,-1,0);leg('R',.06,-1,0,.04,-1,0);
    }else if(P==='wave'){
      const wv=Math.sin(t*10);arm('L',.2,-1,.03,.12,-1,.14);arm('R',.6,.7,.25,.2+wv*.55,1,.1);rot('Head',0,0,1,.05);leg('L',.04,-1,0,.03,-1,0);leg('R',.04,-1,0,.03,-1,0);rot('Spine2',1,0,0,br*.01);
    }else if(P==='dance2'){
      /* side step and sway, arms swing across */
      const b=Math.sin(t*5),st2=Math.sin(t*2.5),sw=st2*.5;placeHips(geo.hipsH-Math.abs(b)*.03,0);
      const sl=Math.max(0,st2),sr=Math.max(0,-st2);
      leg('L',.1+sl*.25,-1,0,.03+sl*.1,-1,0);leg('R',.1+sr*.25,-1,0,.03+sr*.1,-1,0);
      arm('L',.45,.2+sw*.5,.3,.3,.5+sw*.6,.4);arm('R',.45,.2-sw*.5,.3,.3,.5-sw*.6,.4);
      rot('Hips',0,1,0,Math.sin(t*5)*.22);rot('Spine1',0,1,0,-Math.sin(t*5)*.14);rot('Head',0,0,1,Math.sin(t*2.5)*.1);
    }else if(P==='dance3'){
      /* raise the roof: arms pump overhead, knees bounce */
      const b=Math.sin(t*8),bb=(b+1)/2;placeHips(geo.hipsH-bb*.07,0);
      leg('L',.14,-Math.cos(.35),Math.sin(.35),.05,-Math.cos(.35-.55),Math.sin(.35-.55));leg('R',.14,-Math.cos(.35),Math.sin(.35),.05,-Math.cos(.35-.55),Math.sin(.35-.55));
      arm('L',.35,.8+b*.15,.15,.15,1,.15+b*.3);arm('R',.35,.8+b*.15,.15,.15,1,.15+b*.3);
      rot('Spine1',1,0,0,-.08-bb*.1);rot('Head',1,0,0,-.1+bb*.1);rot('Head',0,0,1,Math.sin(t*4)*.07);
    }else if(P==='dance4'){
      /* robot: stiff snapping arm angles and a hip twist */
      const q=Math.floor(t*3.2)%4,A=[[.9,.2,0],[.2,.9,0],[.9,.0,.4],[.1,-.8,.3]][q],B=[[.2,.9,0],[.9,.2,0],[.2,-.4,.8],[.9,.1,.3]][q];
      placeHips(geo.hipsH-.03,0);leg('L',.12,-1,0,.03,-1,0);leg('R',.12,-1,0,.03,-1,0);
      arm('L',A[0],A[1],A[2],A[0],A[1]+.6,A[2]+.3);arm('R',B[0],B[1],B[2],B[0],B[1]+.6,B[2]+.3);
      rot('Hips',0,1,0,((q%2)?1:-1)*.3);rot('Head',0,1,0,((q%2)?-1:1)*.35);
    }else if(P==='dance'){
      const b=Math.sin(t*7),bb=Math.abs(b);placeHips(geo.hipsH-bb*.04,0);const fl=Math.max(0,b),fr=Math.max(0,-b);
      leg('L',.1,-Math.cos(fl*.5),Math.sin(fl*.5),.03,-Math.cos(fl*.5-fl*.7),Math.sin(fl*.5-fl*.7));leg('R',.1,-Math.cos(fr*.5),Math.sin(fr*.5),.03,-Math.cos(fr*.5-fr*.7),Math.sin(fr*.5-fr*.7));
      arm('L',.5,.55+Math.sin(t*7)*.4,.2,.3,.9,.3);arm('R',.5,.55-Math.sin(t*7)*.4,.2,.3,.9,.3);rot('Spine1',0,1,0,Math.sin(t*3.5)*.18);rot('Head',0,0,1,Math.sin(t*3.5)*.08);
    }else{
      /* stand / walk */
      st.walk+=dt*(5+4*w)*(w>.05?1:0);const p=st.walk,s=Math.sin(p),c=Math.cos(p),A_=.5*w;
      const fl=.08+.62*Math.max(0,c)*w,fr=.08+.62*Math.max(0,-c)*w,aL=A_*s,aR=-A_*s;
      if(w>.02)placeHips(geo.hipsH+Math.abs(c)*.018*w,0);
      leg('L',.05,-Math.cos(aL),Math.sin(aL),.03,-Math.cos(aL-fl),Math.sin(aL-fl));leg('R',.05,-Math.cos(aR),Math.sin(aR),.03,-Math.cos(aR-fr),Math.sin(aR-fr));
      const sL=-.5*w*s,sR=.5*w*s;arm('L',.17,-Math.cos(sL),Math.sin(sL),.12,-Math.cos(sL+.3*w+.15),Math.sin(sL+.3*w+.15));arm('R',.17,-Math.cos(sR),Math.sin(sR),.12,-Math.cos(sR+.3*w+.15),Math.sin(sR+.3*w+.15));
      rot('Spine2',0,1,0,-.1*w*s);rot('Hips',0,1,0,.08*w*s);rot('Spine2',1,0,0,br*.008);rot('Head',0,1,0,Math.sin(t*.6)*.05*(1-w));
    }
  }
  /* ---------- face: expression preset + custom sliders + blink, applied to every mesh that owns the morph ---------- */
  function face(dt){
    const c=av.cfg,tgt={},ex=(OWA.EXPR.find(e=>e[0]===c.ex)||OWA.EXPR[0])[2];
    for(const k in ex)tgt[k]=ex[k];for(const k in c.mx||{})tgt[k]=Math.max(tgt[k]||0,c.mx[k]);
    if(st.gn&&GFACE[st.gn]){const gf=GFACE[st.gn],gw=Math.min(1,st.gw);for(const k in gf)tgt[k]=Math.max(tgt[k]||0,gf[k]*gw*(k.startsWith('mouthPucker')&&st.gn==='drink'?(st.gtg&&st.gtg.near||0):1));}
    /* blinking, sometimes twice in a row */
    st.blink-=dt;if(st.blink<0){st.bl=.17;st.blink=Math.random()<.2?.22:2.2+Math.random()*3.4;}
    let b=0;if(st.bl>0){st.bl-=dt;b=Math.sin(clamp(st.bl/.17,0,1)*PI);}
    tgt.eyeBlinkLeft=Math.max(tgt.eyeBlinkLeft||0,b);tgt.eyeBlinkRight=Math.max(tgt.eyeBlinkRight||0,b*(c.ex==='wink'?0:1));
    /* talking: syllable-like mouth shapes, a little brow and cheek life */
    const ts=st.talkS;
    if(ts>.03){
      st.syl+=dt*(8+3*Math.sin(st.t*.9));const ph=st.syl,amp=ts*(.3+.7*Math.abs(Math.sin(ph))*(.65+.35*Math.abs(Math.sin(ph*.41+1))));
      const V=['viseme_aa','viseme_O','viseme_E','viseme_U','viseme_I','viseme_aa','viseme_FF','viseme_O'],vi=V[Math.floor(ph/PI)%V.length];
      tgt.jawOpen=Math.max(tgt.jawOpen||0,amp*.5);tgt.mouthOpen=Math.max(tgt.mouthOpen||0,amp*.35);tgt[vi]=Math.max(tgt[vi]||0,amp*.75);
      if(vi==='viseme_O'||vi==='viseme_U')tgt.mouthFunnel=Math.max(tgt.mouthFunnel||0,amp*.4);
      tgt.browInnerUp=Math.max(tgt.browInnerUp||0,ts*(.12+.1*Math.sin(st.t*1.3)));tgt.mouthSmileLeft=Math.max(tgt.mouthSmileLeft||0,ts*.12);tgt.mouthSmileRight=Math.max(tgt.mouthSmileRight||0,ts*.12);
    }
    const k=Math.min(1,dt*16);
    for(const key in parts()){const m=parts()[key];if(!m||!m.morphTargetDictionary)continue;
      for(const name in m.morphTargetDictionary){const i=m.morphTargetDictionary[name],want=tgt[name]||0,cur=m.morphTargetInfluences[i];
        const v=Math.abs(want-cur)<.002?want:cur+(want-cur)*k;if(v!==cur)m.morphTargetInfluences[i]=v;}}
  }
  /* eyes drift and dart about a little, so a face never looks frozen */
  function gaze(dt){
    const fx=(OWA.EYEFIX&&OWA.EYEFIX[av.cfg.g])||0,z=st.gz||(st.gz={x:0,y:0,tx:0,ty:0,t:1});
    z.t-=dt;if(z.t<=0){z.t=.7+Math.random()*2.2;const far=Math.random()<.3;z.tx=(Math.random()-.5)*(far?.16:.06);z.ty=(Math.random()-.5)*(far?.07:.03);}
    const k=Math.min(1,dt*12);z.x+=(z.tx-z.x)*k;z.y+=(z.ty-z.y)*k;
    for(const n of['LeftEye','RightEye']){rot(n,0,1,0,z.x);rot(n,1,0,0,fx+z.y);}
  }
  function update(dt,spd){if(!st.ready)return;st.t+=dt;st.talkS+=(st.talk-st.talkS)*Math.min(1,dt*7);pose(dt,spd||0);gaze(dt);face(dt);}
  function dispose(){st.disposed=true;if(!A)return;for(const k in st.wear){st.wear[k].meshes.forEach(m=>{m.geometry.dispose();m.material.dispose();});}st.wear={};for(const s in av.slots)detach(s);
    A.scene.traverse(o=>{if(o.geometry)o.geometry.dispose();});A.materials.forEach(m=>{['map','roughnessMap','metalnessMap','normalMap','emissiveMap'].forEach(k=>{if(m[k])m[k].dispose();});m.dispose();});}
  return av;
}
OWA.build=build;
/* optional catalogue of extra skinned hair / garments / accessories (assets/avatars/catalog.json) */
OWA.catalog={items:[]};
OWA.loadCatalog=()=>fetch(OWA.BASE+'catalog.json').then(r=>r.ok?r.json():{items:[]}).then(c=>{OWA.catalog=c;return c;}).catch(()=>OWA.catalog);
})();
