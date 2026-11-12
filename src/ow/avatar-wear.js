/* ---------- OWA.WEAR: extra hairstyles, garments and hats built on the avatar's own skeleton ----------
 * Everything is derived from the supplied model: garments are shells of its own top/bottom meshes (same vertices,
 * same skin weights, cut by the bone that owns each vertex), hair/hats are small procedural meshes weighted to the
 * Head/Neck/Hips bones. They are stylised, simple pieces: replace any of them with a real GLB via catalog.json.
 * make(slot,id,ctx) -> {meshes:[SkinnedMesh], hide:[base mesh names], color:fn(hex)}   (geometry is in model bind space) */
(function(){
const T=THREE,PI=Math.PI;
OWA.WEAR={
  hair:[['buzz','Buzz cut'],['afro','Afro'],['bun','Bun'],['long','Long straight']],
  top:[['sweater','Sweater']],
  bottom:[['shorts','Shorts']],
  hat:[['beanie','Beanie']],
  defaults:{hair:null,top:'#e8e6df',bottom:'#3b3f46',hat:'#14284b'}
};
function wpos(m){const P=m.geometry.attributes.position,D=m._D,o=new Float32Array(P.count*3);for(let i=0;i<P.count;i++)for(let k=0;k<3;k++)o[i*3+k]=P.array[i*3+k]*D.s[k]+D.t[k];return o;}
OWA._wpos=wpos;
function mat(color,rough){const m=new T.MeshStandardMaterial({roughness:rough==null?.85:rough,metalness:0,side:T.DoubleSide});m.skinning=true;m.morphTargets=false;m.color.copy(OWA._lin(color));return m;}
function skinOf(ref,geo,material,world){if(world){const D=ref._D,P=geo.attributes.position;for(let i=0;i<P.count;i++)P.setXYZ(i,(P.getX(i)-D.t[0])/D.s[0],(P.getY(i)-D.t[1])/D.s[1],(P.getZ(i)-D.t[2])/D.s[2]);geo.computeVertexNormals();}const m=new T.SkinnedMesh(geo,material);m.frustumCulled=false;m.bind(ref.skeleton,ref.bindMatrix.clone());m.castShadow=false;return m;}
/* weights: every vertex bound 100% to one bone index, or custom per-vertex via fn */
function setSkin(geo,n,fn){const si=new Uint16Array(n*4),sw=new Float32Array(n*4);for(let i=0;i<n;i++){const r=fn(i);for(let k=0;k<4;k++){si[i*4+k]=r[k*2]||0;sw[i*4+k]=r[k*2+1]||0;}}
  geo.setAttribute('skinIndex',new T.BufferAttribute(si,4));geo.setAttribute('skinWeight',new T.BufferAttribute(sw,4));}
/* shell of a base garment: keep triangles whose vertices all pass keep(bone name, vertex i), inflate along normals */
function shell(src,keep,infl,material){
  const g0=src.geometry,P=g0.attributes.position,N=g0.attributes.normal,SI=g0.attributes.skinIndex,SW=g0.attributes.skinWeight,names=src.skeleton.bones.map(b=>b.name),n=P.count;
  const ok=new Uint8Array(n);for(let i=0;i<n;i++){let bi=0,bw=-1;for(let k=0;k<4;k++){const w=SW.array[i*4+k];if(w>bw){bw=w;bi=SI.array[i*4+k];}}ok[i]=keep(names[bi],i)?1:0;}
  const idx=g0.index.array,out=[];for(let t=0;t<idx.length;t+=3)if(ok[idx[t]]&&ok[idx[t+1]]&&ok[idx[t+2]])out.push(idx[t],idx[t+1],idx[t+2]);
  {const D=src._D;infl=infl/((D.s[0]+D.s[1]+D.s[2])/3);}const g=new T.BufferGeometry(),pos=new Float32Array(n*3);for(let i=0;i<n;i++){pos[i*3]=P.getX(i)+N.getX(i)*infl;pos[i*3+1]=P.getY(i)+N.getY(i)*infl;pos[i*3+2]=P.getZ(i)+N.getZ(i)*infl;}
  g.setAttribute('position',new T.BufferAttribute(pos,3));g.setAttribute('normal',g0.attributes.normal.clone());if(g0.attributes.uv)g.setAttribute('uv',g0.attributes.uv.clone());
  g.setAttribute('skinIndex',SI.clone());g.setAttribute('skinWeight',SW.clone());g.setIndex(out);return skinOf(src,g,material);}
/* head frame measured from the model's own head meshes */
function headFrame(parts){
  const h=parts.Wolf3D_Head,P=wpos(h),n=P.length/3;let yT=-1e9,xs=[1e9,-1e9],zs=[1e9,-1e9];
  for(let i=0;i<n;i++)yT=Math.max(yT,P[i*3+1]);
  const EP=wpos(parts.Wolf3D_EyeLeft||h);let ey=0;for(let i=0;i<EP.length/3;i++)ey+=EP[i*3+1];const yE=ey/(EP.length/3);
  for(let i=0;i<n;i++){const y=P[i*3+1];if(Math.abs(y-yE)<.01){xs[0]=Math.min(xs[0],P[i*3]);xs[1]=Math.max(xs[1],P[i*3]);}if(y>yE&&y<yT){zs[0]=Math.min(zs[0],P[i*3+2]);zs[1]=Math.max(zs[1],P[i*3+2]);}}
  const r=(xs[1]-xs[0])/2;return{yT,yE,hh:yT-yE,r,cx:(xs[0]+xs[1])/2,cz:(zs[0]+zs[1])/2,front:zs[1],back:zs[0],P};}
function boneIdx(ref,name){return ref.skeleton.bones.findIndex(b=>b.name===name);}
function merge(gs){let n=0,ni=0;gs.forEach(g=>{n+=g.attributes.position.count;ni+=g.index.count;});const pos=new Float32Array(n*3),nor=new Float32Array(n*3),si=new Uint16Array(n*4),sw=new Float32Array(n*4),ix=new Uint32Array(ni);let o=0,io=0;
  gs.forEach(g=>{const c=g.attributes.position.count;pos.set(g.attributes.position.array,o*3);nor.set(g.attributes.normal.array,o*3);si.set(g.attributes.skinIndex.array,o*4);sw.set(g.attributes.skinWeight.array,o*4);for(let i=0;i<g.index.count;i++)ix[io+i]=g.index.array[i]+o;o+=c;io+=g.index.count;});
  const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(pos,3));g.setAttribute('normal',new T.BufferAttribute(nor,3));g.setAttribute('skinIndex',new T.BufferAttribute(si,4));g.setAttribute('skinWeight',new T.BufferAttribute(sw,4));g.setIndex(new T.BufferAttribute(ix,1));return g;}
/* a procedural piece: geometry from three.js, rigidly weighted to one bone */
function rigid(g,bone){g=g.index?g:g.toNonIndexed();if(!g.index){const n=g.attributes.position.count,ix=new Uint32Array(n);for(let i=0;i<n;i++)ix[i]=i;g.setIndex(new T.BufferAttribute(ix,1));}
  if(!g.attributes.normal)g.computeVertexNormals();setSkin(g,g.attributes.position.count,()=>[bone,1]);return g;}
const ss=(a,b,x)=>{x=Math.max(0,Math.min(1,(x-a)/(b-a)));return x*x*(3-2*x);};
/* scalp cap: a smooth hairline (high at the front, above the ears at the sides, down to the nape at the back) */
function scalp(parts,F,infl,hb){
  const src=parts.Wolf3D_Head,P=F.P,dz=Math.max(1e-4,F.front-F.cz);
  return shell(src,(bn,i)=>{const x=P[i*3],y=P[i*3+1],z=P[i*3+2];
    const sx=Math.abs(x-F.cx)/F.r,fz=Math.max(-1,Math.min(1,(z-F.cz)/dz));
    const f=ss(-.2,.5,fz),base=.08+.38*f,w=ss(.55,.9,sx)*ss(-.8,-.4,fz),t=base*(1-w)+Math.max(base,.44)*w;
    return y>F.yE+F.hh*t;},infl,null);}
function lumpy(g,amp,seed){const P=g.attributes.position;for(let i=0;i<P.count;i++){const x=P.getX(i),y=P.getY(i),z=P.getZ(i),k=1+amp*(Math.sin(x*37+seed)*Math.sin(y*29)*Math.sin(z*41+seed*2));P.setXYZ(i,x*k,y*k,z*k);}g.computeVertexNormals();}

const MAKE={
  hair:{
    buzz(c){const m=mat('#14100e',.9),s=scalp(c.parts,c.F,c.H0*.004);s.material=m;return{meshes:[s],hide:['Wolf3D_Hair'],color:m};},
    afro(c){const F=c.F,m=mat('#14100e',1),hb=boneIdx(c.ref,'Head'),R=F.r*1.7;let g=new T.SphereGeometry(R,40,28);g.translate(F.cx,F.yE+F.hh*.62,F.cz-F.r*.25);
      const P=g.attributes.position,keep=[];lumpy(g,.022,3);
      if(!g.index){const n=P.count,q=new Uint32Array(n);for(let i=0;i<n;i++)q[i]=i;g.setIndex(new T.BufferAttribute(q,1));}const ix=g.index.array,out=[];const bad=i=>P.getZ(i)>F.cz+F.r*.5&&P.getY(i)<F.yE+F.hh*.75;
      for(let t=0;t<ix.length;t+=3)if(!bad(ix[t])&&!bad(ix[t+1])&&!bad(ix[t+2]))out.push(ix[t],ix[t+1],ix[t+2]);g.setIndex(out);
      const gm=rigid(g,hb);return{meshes:[skinOf(c.ref,gm,m,true)],hide:['Wolf3D_Hair'],color:m};},
    bun(c){const F=c.F,m=mat('#14100e',.9),hb=boneIdx(c.ref,'Head'),s=scalp(c.parts,F,c.H0*.004);s.material=m;
      const b=new T.SphereGeometry(F.r*.5,20,14);b.translate(F.cx,F.yT+F.hh*.02,F.cz-F.r*.62);return{meshes:[s,skinOf(c.ref,rigid(b,hb),m,true)],hide:['Wolf3D_Hair'],color:m};},
    long(c){const F=c.F,m=mat('#14100e',.9),hb=boneIdx(c.ref,'Head'),sb=boneIdx(c.ref,'Spine2'),nb=boneIdx(c.ref,'Neck'),s=scalp(c.parts,F,c.H0*.004);s.material=m;
      const cols=14,rows=12,pos=[],ix=[],si=[];const yTop=F.yE+F.hh*.4,yBot=F.yE-F.hh*2.2;
      for(let j=0;j<=rows;j++){const f=j/rows,y=yTop+(yBot-yTop)*f;for(let i=0;i<=cols;i++){const a=PI*(.42+1.16*i/cols),rr=F.r*(1.06+.12*Math.min(1,f*2)),w=F.r*(1-.1*f);
          const x=F.cx+Math.sin(a)*rr*(1-.25*f),z=F.cz+Math.cos(a)*rr*(1+.08*f)-F.r*1.0*f;pos.push(x,y,z);
          const wh=Math.max(0,1-f*1.8),wn=Math.max(0,Math.min(1,f*1.8))*(f<.55?1:Math.max(0,1-(f-.55)*3)),ws=1-wh-wn;si.push([hb,wh,nb,wn,sb,ws,0,0]);}}
      for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){const a=j*(cols+1)+i,b=a+1,c2=a+cols+1,d=c2+1;ix.push(a,c2,b,b,c2,d);}
      const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setIndex(ix);g.computeVertexNormals();setSkin(g,pos.length/3,i=>si[i]);
      return{meshes:[s,skinOf(c.ref,g,m,true)],hide:['Wolf3D_Hair'],color:m};}
  },
  top:{
    sweater(c){return garment(c,'Wolf3D_Outfit_Top',n=>true,c.H0*.014,'#7a8f5a');}
  },
  bottom:{
    shorts(c){return garment(c,'Wolf3D_Outfit_Bottom',n=>!/^(Left|Right)(Leg|Foot|ToeBase)$/.test(n),c.H0*.007,'#3b3f46');}
  },
  hat:{
    beanie(c){const F=c.F,m=mat('#14284b',.95),hb=boneIdx(c.ref,'Head'),d=new T.SphereGeometry(F.r*1.14,24,16,0,PI*2,0,PI*.58);d.scale(1,1.05,1.1);d.translate(F.cx,F.yE+F.hh*.66,F.cz-F.r*.02);
      return{meshes:[skinOf(c.ref,rigid(d,hb),m,true)],hide:[],color:m};}
  }
};
function garment(c,name,keep,infl,def){const src=c.parts[name];const m=mat(def,.9),s=shell(src,keep,infl,m),r={meshes:[s],hide:[name],color:m};
  if(name==='Wolf3D_Outfit_Bottom')legs(c,r);return r;}
/* the supplied body has no legs of its own (the leggings are the legs), so bare legs are a skin-coloured shell of the same mesh */
function legs(c,r){const sm=mat('#c58a60',.7);r.meshes.push(shell(c.parts.Wolf3D_Outfit_Bottom,()=>true,0,sm));r.skin=sm;}
/* ctx: {parts, bones, H0, bw:{boneName:{x,y,z} rest model-space}, skirtRx,skirtRz} */
OWA.WEAR.make=function(slot,id,ctx){
  ctx.ref=ctx.parts.Wolf3D_Head;ctx.F=ctx.F||(ctx.F=headFrame(ctx.parts));
  const f=MAKE[slot]&&MAKE[slot][id];return f?f(ctx):null;};
})();
