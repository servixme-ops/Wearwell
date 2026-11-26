/* OpenWalls photo -> illustration engine.
   Runs in a Web Worker on the phone: the photo never leaves the device.
   Uses OpenCV.js (vendor/opencv.js) only. No AI model, no online service.
   In:  {w,h,data}  RGBA pixels of the (already resized) photo
   Out: flat colour regions as outlines + a simple face description, drawn by photo-art.js */
let ready=null;
function loadCV(){
  if(ready)return ready;
  ready=new Promise((res,rej)=>{
    try{importScripts('../../vendor/opencv.js');}catch(e){rej(new Error('engine'));return;}
    const to=setTimeout(()=>rej(new Error('engine')),60000);
    /* this OpenCV.js build hands back a promise that resolves to the ready library */
    Promise.resolve(self.cv).then(m=>{clearTimeout(to);m&&m.Mat&&m.bilateralFilter?res(m):rej(new Error('engine'));},()=>rej(new Error('engine')));
  });
  return ready;
}

/* ---------- small colour helpers ---------- */
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
function rgb2hsv(r,g,b){r/=255;g/=255;b/=255;const mx=Math.max(r,g,b),mn=Math.min(r,g,b),d=mx-mn;let h=0;if(d){if(mx===r)h=((g-b)/d+6)%6;else if(mx===g)h=(b-r)/d+2;else h=(r-g)/d+4;h*=60;}return[h,mx?d/mx:0,mx];}
function hsv2rgb(h,s,v){const c=v*s,x=c*(1-Math.abs((h/60)%2-1)),m=v-c;let r=0,g=0,b=0;if(h<60){r=c;g=x;}else if(h<120){r=x;g=c;}else if(h<180){g=c;b=x;}else if(h<240){g=x;b=c;}else if(h<300){r=x;b=c;}else{r=c;b=x;}return[(r+m)*255,(g+m)*255,(b+m)*255];}
const hex=a=>'#'+a.map(v=>Math.round(clamp(v,0,255)).toString(16).padStart(2,'0')).join('');
/* sRGB <-> Lab (D65) so that colour distance matches what people see */
function lin(c){c/=255;return c<=.04045?c/12.92:Math.pow((c+.055)/1.055,2.4);}
function rgb2lab(r,g,b){r=lin(r);g=lin(g);b=lin(b);let x=(r*.4124+g*.3576+b*.1805)/.95047,y=r*.2126+g*.7152+b*.0722,z=(r*.0193+g*.1192+b*.9505)/1.08883;const f=t=>t>.008856?Math.cbrt(t):7.787*t+16/116;x=f(x);y=f(y);z=f(z);return[116*y-16,500*(x-y),200*(y-z)];}
function lab2rgb(L,a,b){let y=(L+16)/116,x=a/500+y,z=y-b/200;const f=t=>{const t3=t*t*t;return t3>.008856?t3:(t-16/116)/7.787;};x=f(x)*.95047;y=f(y);z=f(z)*1.08883;const r=x*3.2406+y*-1.5372+z*-.4986,g=x*-.9689+y*1.8758+z*.0415,bb=x*.0557+y*-.2040+z*1.0570;const gm=c=>255*(c<=.0031308?12.92*c:1.055*Math.pow(Math.max(0,c),1/2.4)-.055);return[gm(r),gm(g),gm(bb)];}

/* ---------- k-means on Lab samples (small, deterministic) ---------- */
function kmeans(S,n,K,iters){
  /* k-means++ start with a fixed seed so the same photo always gives the same picture */
  let seed=12345;const rnd=()=>{seed=(seed*1103515245+12345)&0x7fffffff;return seed/0x7fffffff;};
  const C=[];const first=Math.floor(rnd()*n);C.push([S[first*3],S[first*3+1],S[first*3+2]]);
  const dist=new Float32Array(n).fill(1e9);
  while(C.length<K){const c=C[C.length-1];let sum=0;for(let i=0;i<n;i++){const d=(S[i*3]-c[0])**2+(S[i*3+1]-c[1])**2+(S[i*3+2]-c[2])**2;if(d<dist[i])dist[i]=d;sum+=dist[i];}
    let r=rnd()*sum,k=0;for(;k<n-1;k++){r-=dist[k];if(r<=0)break;}C.push([S[k*3],S[k*3+1],S[k*3+2]]);}
  const asg=new Uint8Array(n);
  for(let it=0;it<iters;it++){
    for(let i=0;i<n;i++){let b=0,bd=1e9;for(let k=0;k<K;k++){const d=(S[i*3]-C[k][0])**2+(S[i*3+1]-C[k][1])**2+(S[i*3+2]-C[k][2])**2;if(d<bd){bd=d;b=k;}}asg[i]=b;}
    const acc=C.map(()=>[0,0,0,0]);for(let i=0;i<n;i++){const a=acc[asg[i]];a[0]+=S[i*3];a[1]+=S[i*3+1];a[2]+=S[i*3+2];a[3]++;}
    for(let k=0;k<K;k++)if(acc[k][3]){C[k]=[acc[k][0]/acc[k][3],acc[k][1]/acc[k][3],acc[k][2]/acc[k][3]];}
  }
  return C;
}

/* ---------- the pipeline ---------- */
async function run(inp){
  const cv=await loadCV();const W=inp.w,H=inp.h,N=W*H,keep=[],FLAT=!!inp.flat;   /* FLAT: the picture is already an illustration (from the AI): no cut-out, no face repainting, keep its colours */
  const K_=m=>(keep.push(m),m);
  try{
    const rgba=K_(cv.matFromArray(H,W,cv.CV_8UC4,Array.from(inp.data)));
    const rgb=K_(new cv.Mat());cv.cvtColor(rgba,rgb,cv.COLOR_RGBA2RGB);
    /* 1. smooth the photo but keep edges: bilateral filtering, three passes */
    let cur=rgb;for(let i=0;i<3;i++){const nx=K_(new cv.Mat());cv.bilateralFilter(cur,nx,7,48,7,cv.BORDER_DEFAULT);cur=nx;}
    const sm=cur;

    /* 2. find the person: GrabCut on a smaller copy, started from where portraits usually put people */
    const gw=Math.round(W/2.5),gh=Math.round(H/2.5);
    const small=K_(new cv.Mat());cv.resize(sm,small,new cv.Size(gw,gh),0,0,cv.INTER_AREA);
    const gmask=K_(new cv.Mat(gh,gw,cv.CV_8UC1,new cv.Scalar(cv.GC_PR_BGD)));
    const gd=gmask.data;
    for(let y=0;y<gh;y++)for(let x=0;x<gw;x++){
      const nx=(x+.5)/gw-.5,ny=(y+.5)/gh;
      const e=(nx/.36)**2+((ny-.55)/.5)**2;  /* a tall oval around the middle: head and shoulders */
      let v=cv.GC_PR_BGD;
      if(e<1)v=cv.GC_PR_FGD;
      if(((nx/.13)**2+((ny-.36)/.17)**2)<1)v=cv.GC_FGD;       /* the face area is surely the person */
      if(ny>.86&&Math.abs(nx)<.34)v=cv.GC_PR_FGD;              /* shoulders run off the bottom edge */
      if(x<gw*.04||x>gw*.96||y<gh*.03)v=cv.GC_BGD;             /* the frame's edge is surely background */
      gd[y*gw+x]=v;
    }
    let person=null;
    if(!FLAT)try{
      const bg=K_(new cv.Mat()),fg=K_(new cv.Mat());
      cv.grabCut(small,gmask,new cv.Rect(0,0,gw,gh),bg,fg,4,cv.GC_INIT_WITH_MASK);
      person=new Uint8Array(N);
      for(let y=0;y<H;y++){const sy=Math.min(gh-1,Math.floor(y*gh/H));for(let x=0;x<W;x++){const v=gd[sy*gw+Math.min(gw-1,Math.floor(x*gw/W))];person[y*W+x]=(v===cv.GC_FGD||v===cv.GC_PR_FGD)?255:0;}}
    }catch(e){person=null;}
    const pm=K_(person?cv.matFromArray(H,W,cv.CV_8UC1,Array.from(person)):new cv.Mat(H,W,cv.CV_8UC1,new cv.Scalar(0)));
    /* clean the cut-out: round off, drop specks, fill holes, keep the biggest piece */
    const k5=K_(cv.getStructuringElement(cv.MORPH_ELLIPSE,new cv.Size(7,7)));
    cv.morphologyEx(pm,pm,cv.MORPH_OPEN,k5);cv.morphologyEx(pm,pm,cv.MORPH_CLOSE,k5);cv.medianBlur(pm,pm,7);
    {const cl=K_(new cv.Mat()),st=K_(new cv.Mat()),ce=K_(new cv.Mat());const n=cv.connectedComponentsWithStats(pm,cl,st,ce,8,cv.CV_32S);
      let best=0,ba=0;for(let i=1;i<n;i++){const a=st.intPtr(i,cv.CC_STAT_AREA)[0];if(a>ba){ba=a;best=i;}}
      const ld=cl.data32S;person=new Uint8Array(N);if(best)for(let i=0;i<N;i++)person[i]=ld[i]===best?1:0;
      /* fill holes: flood the outside from the edges */
      const out=new Uint8Array(N),stack=[];const push=i=>{if(!out[i]&&!person[i]){out[i]=1;stack.push(i);}};
      for(let x=0;x<W;x++){push(x);push((H-1)*W+x);}for(let y=0;y<H;y++){push(y*W);push(y*W+W-1);}
      while(stack.length){const i=stack.pop(),x=i%W,y=(i/W)|0;if(x>0)push(i-1);if(x<W-1)push(i+1);if(y>0)push(i-W);if(y<H-1)push(i+W);}
      for(let i=0;i<N;i++)if(!out[i])person[i]=1;}
    let pa=0;for(let i=0;i<N;i++)pa+=person[i];
    if(FLAT)person.fill(1);
    else if(pa<N*.12||pa>N*.93){ /* the cut-out failed: fall back to the oval so we still make a picture */
      for(let y=0;y<H;y++)for(let x=0;x<W;x++){const nx=(x+.5)/W-.5,ny=(y+.5)/H;person[y*W+x]=((nx/.38)**2+((ny-.58)/.5)**2)<1?1:0;}}

    /* 3. flat colours: k-means in Lab on the person, one flat colour for the background */
    const sd=sm.data,L=new Float32Array(N*3);
    for(let i=0;i<N;i++){const l=rgb2lab(sd[i*3],sd[i*3+1],sd[i*3+2]);L[i*3]=l[0];L[i*3+1]=l[1];L[i*3+2]=l[2];}
    const idx=[];for(let i=0;i<N;i+=2)if(person[i])idx.push(i);
    const S=new Float32Array(idx.length*3);idx.forEach((p,j)=>{S[j*3]=L[p*3];S[j*3+1]=L[p*3+1];S[j*3+2]=L[p*3+2];});
    let C=kmeans(S,idx.length,FLAT?9:7,14);
    /* merge colours that look the same, so we end up with a few bold flat colours */
    const near=(c,x)=>{let b=0,bd=1e9;for(let k=0;k<c.length;k++){const d=(x[0]-c[k][0])**2+(x[1]-c[k][1])**2+(x[2]-c[k][2])**2;if(d<bd){bd=d;b=k;}}return b;};
    let cnt=new Array(C.length).fill(0);
    for(let j=0;j<idx.length;j++)cnt[near(C,[S[j*3],S[j*3+1],S[j*3+2]])]++;
    for(let again=true;again;){again=false;
      outer:for(let a=0;a<C.length;a++)for(let b=a+1;b<C.length;b++){const d=Math.hypot(C[a][0]-C[b][0],(C[a][1]-C[b][1])*1.2,(C[a][2]-C[b][2])*1.2),dk=C[a][0]<38&&C[b][0]<38;   /* dark skin and dark hair must stay apart */
        if(d<(dk?8:(FLAT?15:22))||((cnt[a]<idx.length*.02||cnt[b]<idx.length*.02)&&d<(dk?12:40))){const t=cnt[a]+cnt[b]||1;C[a]=C[a].map((v,i)=>(v*cnt[a]+C[b][i]*cnt[b])/t);cnt[a]=t;C.splice(b,1);cnt.splice(b,1);again=true;break outer;}}}
    const K=C.length;
    const lab=new Uint8Array(N);   /* 0 = background, 1..K = colours */
    for(let i=0;i<N;i++)if(person[i])lab[i]=1+near(C,[L[i*3],L[i*3+1],L[i*3+2]]);

    /* 4. tidy the colour map: median filter, then give tiny islands to their neighbours */
    {const lm=K_(cv.matFromArray(H,W,cv.CV_8UC1,Array.from(lab)));cv.medianBlur(lm,lm,5);cv.medianBlur(lm,lm,7);cv.medianBlur(lm,lm,7);const d=lm.data;
      for(let i=0;i<N;i++)lab[i]=person[i]?(d[i]||1):0;}
    function dropIslands(labels,minA){
      const seen=new Uint8Array(N),st=[];let moved=0;
      for(let s=0;s<N;s++){if(seen[s])continue;const v=labels[s];const comp=[];seen[s]=1;st.push(s);
        while(st.length){const i=st.pop();comp.push(i);const x=i%W,y=(i/W)|0;
          if(x>0&&!seen[i-1]&&labels[i-1]===v){seen[i-1]=1;st.push(i-1);}if(x<W-1&&!seen[i+1]&&labels[i+1]===v){seen[i+1]=1;st.push(i+1);}
          if(y>0&&!seen[i-W]&&labels[i-W]===v){seen[i-W]=1;st.push(i-W);}if(y<H-1&&!seen[i+W]&&labels[i+W]===v){seen[i+W]=1;st.push(i+W);}}
        if(v===0||comp.length>=minA)continue;
        const t=new Map();for(const i of comp){const x=i%W,y=(i/W)|0;[[x-1,y],[x+1,y],[x,y-1],[x,y+1]].forEach(([a,b])=>{if(a<0||b<0||a>=W||b>=H)return;const q=labels[b*W+a];if(q!==v&&q!==0)t.set(q,(t.get(q)||0)+1);});}
        let bq=0,bc=0;t.forEach((c,q)=>{if(c>bc){bc=c;bq=q;}});if(bq){for(const i of comp)labels[i]=bq;moved++;}}
      return moved;}
    for(let i=0;i<3;i++)if(!dropIslands(lab,Math.round(N*.004)))break;

    /* 5. the picture's colours: bolder, flatter, darks turn into the deep ink colour the collection uses */
    const cols=[null];
    for(let k=0;k<K;k++){let[r,g,b]=lab2rgb(C[k][0],C[k][1],C[k][2]);let[h,s,v]=rgb2hsv(r,g,b);
      if(FLAT){cols.push([r,g,b]);continue;}
      s=clamp(s*1.14,0,1);
      if(v<.2&&!((h<=38||h>=345)&&s>.3))[r,g,b]=[30,22,40];   /* very dark skin stays brown, only true darks become ink */
      else{if(v<.26&&(h<=38||h>=345)&&s>.3)v=.26;[r,g,b]=hsv2rgb(h,s,v);if(C[k][0]>88&&s<.14)[r,g,b]=[247,243,236];}   /* near-white clothes stay clean white */
      cols.push([r,g,b]);}
    let br=0,bgc=0,bb=0,bn=0;for(let i=0;i<N;i++)if(!person[i]){br+=sd[i*3];bgc+=sd[i*3+1];bb+=sd[i*3+2];bn++;}
    let bgCol=bn?[br/bn,bgc/bn,bb/bn]:[240,220,170];
    {let[h,s,v]=rgb2hsv(bgCol[0],bgCol[1],bgCol[2]);if(s<.13){h=42;s=.52;v=Math.max(.9,v);}else{s=clamp(s*1.2,.35,.9);v=clamp(v*1.05,.5,.97);}bgCol=hsv2rgb(h,s,v);}

    /* 6. the face: find it from skin colour, clean it and describe simple features */
    const face=FLAT?null:findFace(cv,K_,sm,lab,cols,K,W,H,L);

    /* 7. outlines of every colour region (with holes) */
    const regions=[];
    for(let k=1;k<=K;k++){
      const m=new Uint8Array(N);let a=0;for(let i=0;i<N;i++)if(lab[i]===k){m[i]=255;a++;}
      if(a<20)continue;
      const mat=K_(cv.matFromArray(H,W,cv.CV_8UC1,Array.from(m)));const cs=new cv.MatVector(),hi=K_(new cv.Mat());
      cv.findContours(mat,cs,hi,cv.RETR_CCOMP,cv.CHAIN_APPROX_NONE);
      const paths=[];
      for(let i=0;i<cs.size();i++){const c=cs.get(i),ap=new cv.Mat();cv.approxPolyDP(c,ap,1.7,true);
        if(ap.rows>=3){const d=ap.data32S,p=new Array(ap.rows*2);for(let j=0;j<p.length;j++)p[j]=d[j];paths.push(p);}ap.delete();c.delete();}
      cs.delete();
      if(paths.length)regions.push({c:hex(cols[k]),a,paths,k});
    }
    regions.sort((p,q)=>q.a-p.a);
    return{ok:true,w:W,h:H,bg:FLAT&&regions.length?regions[0].c:hex(bgCol),regions,face};
  }finally{keep.forEach(m=>{try{m.delete();}catch(e){}});}
}

/* ---------- face finding ----------
   Skin colour (YCrCb) picks out the face. Anything inside it that is not skin (eyes, brows, nostrils, lips)
   is repainted as skin, and simple flat features are drawn at the places where those things really were. */
function findFace(cv,K_,sm,lab,cols,K,W,H,L){
  try{
    const N=W*H,sd=sm.data;
    const ycc=K_(new cv.Mat());cv.cvtColor(sm,ycc,cv.COLOR_RGB2YCrCb);const yd=ycc.data;
    const isSkin=i=>{const Y=yd[i*3],Cr=yd[i*3+1],Cb=yd[i*3+2];return Y>38&&Cr>134&&Cr<178&&Cb>78&&Cb<130&&(Cr-128)>(128-Cb)*.35;};
    const tot=new Array(K+1).fill(0),sk=new Array(K+1).fill(0);
    for(let i=0;i<N;i++){const l=lab[i];if(!l)continue;tot[l]++;if(isSkin(i))sk[l]++;}
    const skinK=[];for(let k=1;k<=K;k++){const c=cols[k],[hh,ss,vv]=rgb2hsv(c[0],c[1],c[2]);
      const skinHue=(hh<=38||hh>=345)&&ss>.12&&ss<.8&&vv>.16;
      if(tot[k]>N*.006&&sk[k]/tot[k]>.55&&skinHue)skinK.push(k);}
    if(!skinK.length)return null;
    const sm_=new Uint8Array(N);for(let i=0;i<N;i++)if(skinK.indexOf(lab[i])>=0)sm_[i]=1;
    const comp=new Int32Array(N).fill(-1);const comps=[];const st=[];
    for(let s=0;s<N;s++){if(!sm_[s]||comp[s]>=0)continue;const id=comps.length;let a=0,sy=0,sx=0,x0=W,x1=0,y0=H,y1=0;comp[s]=id;st.push(s);
      while(st.length){const i=st.pop(),x=i%W,y=(i/W)|0;a++;sx+=x;sy+=y;if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y;
        [[x-1,y],[x+1,y],[x,y-1],[x,y+1]].forEach(([p,q])=>{if(p<0||q<0||p>=W||q>=H)return;const j=q*W+p;if(sm_[j]&&comp[j]<0){comp[j]=id;st.push(j);}});}
      comps.push({id,a,cx:sx/a,cy:sy/a,x0,x1,y0,y1});}
    let best=null,bs=0;for(const c of comps){if(c.a<N*.012||c.a/((c.x1-c.x0+1)*(c.y1-c.y0+1))<.38)continue;const sc=c.a*(c.cy<H*.62?1:.35)*(1-Math.abs(c.cx/W-.5));if(sc>bs){bs=sc;best=c;}}
    if(!best)return null;
    const rowW=new Array(H+3).fill(0),rowL=new Array(H+3).fill(W),rowR=new Array(H+3).fill(0);
    for(let y=best.y0;y<=best.y1;y++)for(let x=best.x0;x<=best.x1;x++)if(comp[y*W+x]===best.id){rowW[y]++;if(x<rowL[y])rowL[y]=x;if(x>rowR[y])rowR[y]=x;}
    let hw=0,hy=best.y0;for(let y=best.y0;y<=best.y0+(best.y1-best.y0)*.7;y++){const s=(rowW[y]+rowW[y+1]+rowW[y+2])/3;if(s>hw){hw=s;hy=y;}}
    let chin=best.y1;for(let y=hy;y<=best.y1;y++){const s=(rowW[y]+rowW[y+1]+rowW[y+2])/3;if(s<hw*.64){chin=y;break;}}
    let fx0=W,fx1=0;for(let y=best.y0;y<=chin;y++){if(rowW[y]>hw*.55){fx0=Math.min(fx0,rowL[y]);fx1=Math.max(fx1,rowR[y]);}}
    const fw=fx1-fx0;if(fw<W*.12)return null;
    let fy=best.y0,fh=chin-fy;
    if(fh<fw*.85)fh=fw*.95;if(fh>fw*1.55){fy=chin-fw*1.35;fh=fw*1.35;}
    const cx=(fx0+fx1)/2,fy0=Math.round(fy),fy1=Math.min(H-1,Math.round(fy+fh));
    const inside=new Uint8Array(N);for(let y=fy0;y<=fy1;y++)for(let x=fx0;x<=fx1;x++){const i=y*W+x;if(comp[i]!==best.id)inside[i]=1;}
    /* only holes surrounded by skin count (hair or beard touching the face edge do not) */
    const outside=new Uint8Array(N),stk=[];
    const pushO=i=>{if(!outside[i]&&inside[i]){outside[i]=1;stk.push(i);}};
    for(let y=fy0;y<=fy1;y++)for(let x=fx0;x<=fx1;x++)if(x===fx0||x===fx1||y===fy0||y===fy1)pushO(y*W+x);
    while(stk.length){const i=stk.pop(),x=i%W,y=(i/W)|0;if(x>0)pushO(i-1);if(x<W-1)pushO(i+1);if(y>0)pushO(i-W);if(y<H-1)pushO(i+W);}
    const holes=[];const hs=new Uint8Array(N);
    for(let s=0;s<N;s++){if(!inside[s]||outside[s]||hs[s])continue;let a=0,sx=0,sy=0,x0=W,x1=0,y0=H,y1=0,lum=0;const px=[];hs[s]=1;st.push(s);
      while(st.length){const i=st.pop(),x=i%W,y=(i/W)|0;a++;px.push(i);sx+=x;sy+=y;lum+=L[i*3];if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y;
        [[x-1,y],[x+1,y],[x,y-1],[x,y+1]].forEach(([p,q])=>{if(p<0||q<0||p>=W||q>=H)return;const j=q*W+p;if(inside[j]&&!outside[j]&&!hs[j]){hs[j]=1;st.push(j);}});}
      holes.push({a,cx:sx/a,cy:sy/a,x0,x1,y0,y1,L:lum/a,px});}
    const skinLab=skinK.slice().sort((p,q)=>tot[q]-tot[p])[0];
    const small=holes.filter(h=>h.a<fw*fh*.06);
    small.forEach(h=>{for(const i of h.px)lab[i]=skinLab;});
    const rel=h=>({x:(h.cx-cx)/fw,y:(h.cy-fy)/fh});
    const eyeBand=small.filter(h=>{const r=rel(h);return r.y>.2&&r.y<.58&&Math.abs(r.x)>.08&&Math.abs(r.x)<.42&&h.a>=3&&h.L<60;}).sort((p,q)=>q.a-p.a);
    const eL=eyeBand.find(h=>h.cx<cx),eR=eyeBand.find(h=>h.cx>=cx);
    const eyeY=eL&&eR?(eL.cy+eR.cy)/2:fy+fh*.42;
    const eyes=[eL?eL.cx:cx-fw*.2,eR?eR.cx:cx+fw*.2];
    const mouthC=small.filter(h=>{const r=rel(h);return r.y>.64&&r.y<.95&&Math.abs(r.x)<.3&&h.a>=3;}).sort((p,q)=>q.a-p.a);
    let mx0=cx-fw*.17,mx1=cx+fw*.17,my=fy+fh*.79;
    if(mouthC.length){const m=mouthC.slice(0,3);mx0=Math.min(...m.map(h=>h.x0));mx1=Math.max(...m.map(h=>h.x1));my=m.reduce((s,h)=>s+h.cy*h.a,0)/m.reduce((s,h)=>s+h.a,0);
      mx0=Math.max(mx0,cx-fw*.3);mx1=Math.min(mx1,cx+fw*.3);if(mx1-mx0<fw*.18){const c=(mx0+mx1)/2;mx0=c-fw*.09;mx1=c+fw*.09;}}
    my=clamp(my,fy+fh*.68,Math.min(fy+fh*.9,chin-fh*.08));
    let teeth=0,tn=0;mouthC.slice(0,3).forEach(h=>{for(const i of h.px){tn++;if(L[i*3]>70&&Math.abs(L[i*3+1])<16&&Math.abs(L[i*3+2])<24)teeth++;}});
    const open=tn>8&&teeth/tn>.12;
    let lip=null;if(mouthC.length){const q=mouthC[0],i=Math.round(q.cy)*W+Math.round(q.cx);lip=[sd[i*3],sd[i*3+1],sd[i*3+2]];}
    return{cx,fy,fw,fh,eyeY,eyes,mouth:{x0:mx0,x1:mx1,y:my,open},skin:hex(cols[skinLab]),lip:lip&&hex(lip),chin};
  }catch(e){return null;}
}

self.onmessage=async e=>{
  const m=e.data;
  try{const r=await run(m);self.postMessage({id:m.id,res:r});}
  catch(err){self.postMessage({id:m.id,err:String(err&&err.message||err)});}
};
