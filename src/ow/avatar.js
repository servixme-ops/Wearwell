/* ---------- OWA.build: avatars from real, professionally modelled GLB characters ----------
 * No geometry is generated here. The mesh, skin weights, skeleton, morph targets and textures all come from the GLB
 * (assets/avatars/*.glb) loaded by OWGLB. This file only drives it: materials (tints), bone proportions, face morphs,
 * procedural walk/sit/lie/wave/dance poses on the real skeleton, and optional extra skinned garments/hair (attach()).
 * Interface used by the room (walk.js): {group,height,scale,lift,seatTop,update(dt,speed),setPose(name),pose,dispose()}. */
(function(){
const T=THREE,PI=Math.PI,clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),lerp=(a,b,t)=>a+(b-a)*t;
const bufCache={};
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
  const S=img.naturalWidth||64,c=document.createElement('canvas');c.width=c.height=S;const g=c.getContext('2d');g.drawImage(img,0,0,S,S);
  const im=g.getImageData(0,0,S,S),d=im.data,tc=new T.Color(hex),R=S*.215;
  for(let y=0;y<S;y++)for(let x=0;x<S;x++){const dx=x+.5-S/2,dy=y+.5-S*.49,r=Math.hypot(dx,dy);if(r>R*1.05)continue;const i=(y*S+x)*4,lum=(.3*d[i]+.59*d[i+1]+.11*d[i+2])/255;
    if(lum>.6)continue;const k=clamp(lum/.3,.25,1.6),w=clamp((R*1.05-r)/(R*.25),0,1);
    d[i]=lerp(d[i],clamp(tc.r*255*k,0,255),w);d[i+1]=lerp(d[i+1],clamp(tc.g*255*k,0,255),w);d[i+2]=lerp(d[i+2],clamp(tc.b*255*k,0,255),w);}
  g.putImageData(im,0,0);const t=new T.CanvasTexture(c);t.flipY=false;t.encoding=T.sRGBEncoding;t.anisotropy=2;return t;}

function build(cfg){
  cfg=OWA.migrate(cfg);const M=OWA.MODELS[cfg.g]||OWA.MODELS.f;
  const group=new T.Group();group.name='avatar';
  const st={pose:'stand',t:Math.random()*10,walk:0,blink:2+Math.random()*3,bl:0,w:{},ready:false,disposed:false};
  const av={group,cfg,height:M.height,scale:M.height/1.68,lift:0,seatTop:null,ready:null,A:null,
    update,setPose(p){st.pose=p;},get pose(){return st.pose;},apply,dispose,attach,detach,morphNames:[],slots:{}};
  let A=null,root=null,bones={},rest={},home={},skin={},eyeImg=null,eyeKey='',rs=1,floor=0,ankle=0,geo={},baseHidden={};
  const parts=()=>A.skinned;

  av.ready=fetchBuf(M.url).then(buf=>OWGLB.parse(buf)).then(init).then(()=>av);
  function init(G){
    if(st.disposed)return;A=av.A=G;root=new T.Group();root.name='model';root.add(G.scene);group.add(root);bones=G.bones;
    for(const n in bones){const b=bones[n];rest[n]={p:b.position.clone(),q:b.quaternion.clone(),s:b.scale.clone()};}
    G.scene.updateMatrixWorld(true);Object.values(G.skinned).forEach(m=>m.skeleton.update());
    /* measure the real skinned extents once, in model units */
    const ext=(m)=>{let mn=1e9,mx=-1e9;const p=m.geometry.attributes.position,t=new T.Vector3();for(let i=0;i<p.count;i++){m.boneTransform(i,t);t.applyMatrix4(m.matrixWorld);mn=Math.min(mn,t.y);mx=Math.max(mx,t.y);}return[mn,mx];};
    const fh=ext(G.skinned.Wolf3D_Outfit_Footwear||G.skinned.Wolf3D_Body),hh=ext(G.skinned.Wolf3D_Hair||G.skinned.Wolf3D_Head),hd=ext(G.skinned.Wolf3D_Head);
    geo.H0=Math.max(hh[1],hd[1])-fh[0];geo.foot0=fh[0];
    const wy=n=>bones[n].getWorldPosition(new T.Vector3()).y;
    geo.ankle0=Math.min(wy('LeftFoot'),wy('RightFoot'))-geo.foot0;
    Object.values(G.materials).forEach(m=>{if(m.map&&m.map.image)m.userData.avg=avgLinear(m.map.image);});
    for(const m of G.materials)skin[m.name]=m;eyeImg=skin.Wolf3D_Eye&&skin.Wolf3D_Eye.map?skin.Wolf3D_Eye.map.image:null;
    av.morphNames=G.morphs.slice();
    Object.values(G.meshes).forEach(m=>{m.castShadow=false;});
    apply(cfg);st.ready=true;av.onReady&&av.onReady(av);
  }

  /* ---------- live customisation ---------- */
  function setSkin(hex){const body=skin.Wolf3D_Body,head=skin.Wolf3D_Skin;if(body)body.color.copy(lin(hex));if(head)head.color.copy(tintFor(hex,head.userData.avg||new T.Color(.6,.45,.38)));
    if(head)head.roughness=.62;}
  function tintMat(m,hex){if(!m)return;if(!hex){m.color.set(0xffffff);return;}m.color.copy(tintFor(hex,m.userData.avg||new T.Color(.4,.4,.4)));}
  function applyBody(c){
    const P=Object.assign({},c),mp=M.prop;if(mp)for(const k in mp)P[k]=clamp((P[k]||0)+mp[k],-1.2,1.2);
    for(const n in bones){const b=bones[n],r=rest[n];b.position.copy(r.p);b.scale.copy(r.s);}
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
    geo.thigh=wp('LeftUpLeg').distanceTo(wp('LeftLeg'))*rs;geo.shin=(wp('LeftLeg').y-floor)*rs;
  }
  function apply(c){
    c=av.cfg=OWA.migrate(c);if(!A)return;
    setSkin(OWA.SKIN[clamp(c.skin|0,0,OWA.SKIN.length-1)]);
    const hm=skin.Wolf3D_Hair;if(hm)hm.color.copy(lin(OWA.HAIRC[clamp(c.hc|0,0,OWA.HAIRC.length-1)]));
    if(parts().Wolf3D_Hair)parts().Wolf3D_Hair.visible=c.hair!=='none'&&!st.hairSlot;
    if(parts().Wolf3D_Glasses){parts().Wolf3D_Glasses.visible=!!c.glasses;if(c.glc&&skin.Wolf3D_Glasses)skin.Wolf3D_Glasses.color.copy(lin(c.glc));}
    tintMat(skin.Wolf3D_Outfit_Top,c.topc);tintMat(skin.Wolf3D_Outfit_Bottom,c.botc);tintMat(skin.Wolf3D_Outfit_Footwear,c.shoec);
    if(parts().Wolf3D_Outfit_Footwear)parts().Wolf3D_Outfit_Footwear.visible=!c.bare;
    /* eye colour: recolour the iris texture only when it changed */
    const ek=OWA.EYEC[clamp(c.eyec|0,0,OWA.EYEC.length-1)];
    if(eyeImg&&skin.Wolf3D_Eye&&ek!==eyeKey){eyeKey=ek;const old=skin.Wolf3D_Eye.map,t=eyeTexture(eyeImg,ek);skin.Wolf3D_Eye.map=t;skin.Wolf3D_Eye.needsUpdate=true;if(old&&old!==t&&old._own)old.dispose();t._own=true;}
    applyBody(c);
    for(const slot in c.extras||{})if(!av.slots[slot]||av.slots[slot].id!==c.extras[slot])loadExtra(slot,c.extras[slot]);
    for(const slot in av.slots)if(!(c.extras&&c.extras[slot]))detach(slot);
    av.dirty&&av.dirty();
  }
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
  const leg=(s,tx,ty,tz,sx,sy,sz)=>{const S=s==='L'?'Left':'Right',sg=s==='L'?1:-1;aim(S+'UpLeg',S+'Leg',sg*tx,ty,tz);aim(S+'Leg',S+'Foot',sg*sx,sy,sz);aim(S+'Foot',S+'ToeBase',0,-.18,1);};
  function pose(dt,spd){
    for(const n in bones){const b=bones[n];if(home[n])b.quaternion.copy(home[n].q);}bones.Hips.position.copy(home.Hips.p);
    root.updateMatrixWorld(true);const w=clamp(spd,0,1),t=st.t,P=st.pose,br=Math.sin(t*1.7);
    if(P==='sit'||P==='play'||P==='type'){
      const top=av.seatTop==null?.46:av.seatTop,hp=top+.11,S=Math.max(.25,geo.shin),L=Math.max(.25,geo.thigh),al=Math.asin(clamp((hp-S)/L,-.9,.9));
      placeHips(hp,-.05);leg('L',.09,-Math.sin(al),Math.cos(al),.02,-1,.12);leg('R',.09,-Math.sin(al),Math.cos(al),.02,-1,.12);
      rot('Spine1',1,0,0,.06);rot('Spine2',1,0,0,-.02+br*.01);
      if(P==='sit'){arm('L',.15,-.9,.35,.1,-.35,1);arm('R',.15,-.9,.35,.1,-.35,1);rot('Head',1,0,0,.04);}
      else{arm('L',.2,-.7,.55,.06,-.2,1);arm('R',.2,-.7,.55,.06,-.2,1);rot('Head',1,0,0,.16);rot('LeftHand',1,0,0,Math.sin(t*14)*.1);rot('RightHand',1,0,0,Math.sin(t*13+1)*.1);}
    }else if(P==='lie'){
      arm('L',.3,-1,.0,.2,-1,.05);arm('R',.3,-1,.0,.2,-1,.05);leg('L',.06,-1,0,.04,-1,0);leg('R',.06,-1,0,.04,-1,0);
    }else if(P==='wave'){
      const wv=Math.sin(t*10);arm('L',.2,-1,.03,.12,-1,.14);arm('R',.6,.7,.25,.2+wv*.55,1,.1);rot('Head',0,0,1,.05);leg('L',.04,-1,0,.03,-1,0);leg('R',.04,-1,0,.03,-1,0);rot('Spine2',1,0,0,br*.01);
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
    st.blink-=dt;if(st.blink<0){st.bl=.16;st.blink=2.4+Math.random()*3.2;}
    let b=0;if(st.bl>0){st.bl-=dt;b=Math.sin(clamp(st.bl/.16,0,1)*PI);}
    tgt.eyeBlinkLeft=Math.max(tgt.eyeBlinkLeft||0,b);tgt.eyeBlinkRight=Math.max(tgt.eyeBlinkRight||0,b*(c.ex==='wink'?0:1));
    const k=Math.min(1,dt*14);
    for(const m of [parts().Wolf3D_Head,parts().Wolf3D_EyeLeft,parts().Wolf3D_EyeRight,parts().Wolf3D_Teeth]){if(!m||!m.morphTargetDictionary)continue;
      for(const name in m.morphTargetDictionary){const i=m.morphTargetDictionary[name],key=name,want=tgt[key]||0,cur=m.morphTargetInfluences[i];
        const v=Math.abs(want-cur)<.002?want:cur+(want-cur)*k;if(v!==cur)m.morphTargetInfluences[i]=v;}}
  }
  function update(dt,spd){if(!st.ready)return;st.t+=dt;pose(dt,spd||0);face(dt);}
  function dispose(){st.disposed=true;if(!A)return;for(const s in av.slots)detach(s);
    A.scene.traverse(o=>{if(o.geometry)o.geometry.dispose();});A.materials.forEach(m=>{['map','roughnessMap','metalnessMap','normalMap','emissiveMap'].forEach(k=>{if(m[k])m[k].dispose();});m.dispose();});}
  return av;
}
OWA.build=build;
/* optional catalogue of extra skinned hair / garments / accessories (assets/avatars/catalog.json) */
OWA.catalog={items:[]};
OWA.loadCatalog=()=>fetch(OWA.BASE+'catalog.json').then(r=>r.ok?r.json():{items:[]}).then(c=>{OWA.catalog=c;return c;}).catch(()=>OWA.catalog);
})();
