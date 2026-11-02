/* ---------- LUKKS MAGAZINES: art (canvas page renderer), PDF writer, draft storage ---------- */
const MagW=900,MagH=1200;
const MAG_FONTS={
  classic:{label:'Classic',disp:"'Playfair Display', Georgia, serif",body:"'Instrument Sans', Arial, sans-serif",dw:'900',dstyle:''},
  modern:{label:'Modern',disp:"'Instrument Sans', Arial, sans-serif",body:"'Instrument Sans', Arial, sans-serif",dw:'700',dstyle:''},
  bold:{label:'Bold',disp:"'Bebas Neue', Impact, 'Arial Narrow', sans-serif",body:"'Instrument Sans', Arial, sans-serif",dw:'400',dstyle:''}
};
const MAG_KINDS={
  diary:{label:'Style Diary',bg:'#f6ecdc',ink:'#2a1a12',acc:'#c8553d',by:'A style diary by'},
  lookbook:{label:'Lookbook',bg:'#f4f4f2',ink:'#111111',acc:'#111111',by:'A lookbook by'},
  blank:{label:'Blank Magazine',bg:'#ece3f4',ink:'#1d1230',acc:'#ff5a1f',by:'A Lukks magazine by'},
  import:{label:'Imported magazine',bg:'#e9e4dc',ink:'#1c1c1c',acc:'#ff5a1f',by:'A Lukks magazine by'}
};
const COVER_LAYOUTS=['Full photo','Split','Framed','Bold'];
const _bmp=new WeakMap();
async function magBitmap(blob){
  if(!blob)return null;let p=_bmp.get(blob);
  if(!p){p=loadBitmap(blob).catch(()=>null);_bmp.set(blob,p);}
  return p;
}
const MagArt={
  fit(g,txt,maxW,weight,family,start){let s=start;g.font=`${weight} ${s}px ${family}`;while(g.measureText(txt).width>maxW&&s>14){s-=3;g.font=`${weight} ${s}px ${family}`;}return s;},
  cover(g,bmp,x,y,w,h){
    if(!bmp){g.fillStyle='#d8cfc2';g.fillRect(x,y,w,h);g.fillStyle='rgba(0,0,0,.28)';g.font=`600 ${Math.max(18,Math.min(w,h)/14)}px ${F.body}`;g.textAlign='center';g.textBaseline='middle';g.fillText('Add a photo',x+w/2,y+h/2);g.textAlign='left';g.textBaseline='alphabetic';return;}
    const r=Math.max(w/bmp.width,h/bmp.height),sw=w/r,sh=h/r;g.save();g.beginPath();g.rect(x,y,w,h);g.clip();g.drawImage(bmp,(bmp.width-sw)/2,(bmp.height-sh)/2,sw,sh,x,y,w,h);g.restore();
  },
  wrapLines(g,text,maxW){
    const out=[];String(text||'').split('\n').forEach(par=>{const words=par.split(/\s+/).filter(Boolean);if(!words.length){out.push('');return;}let line='';
      words.forEach(w=>{const t=line?line+' '+w:w;if(g.measureText(t).width>maxW&&line){out.push(line);line=w;}else line=t;});out.push(line);});return out;
  },
  para(g,text,x,y,maxW,lh,maxY){const ls=this.wrapLines(g,text,maxW);for(const l of ls){if(maxY&&y>maxY)break;g.fillText(l,x,y);y+=lh;}return y;},
  shadowRect(g,x,y,w,h,rot){g.save();g.translate(x+w/2,y+h/2);g.rotate(rot||0);g.shadowColor='rgba(0,0,0,.28)';g.shadowBlur=26;g.shadowOffsetY=10;g.fillStyle='#fff';g.fillRect(-w/2-10,-h/2-10,w+20,h+20);g.restore();},
  byline(d){const K=MAG_KINDS[d.kind]||MAG_KINDS.blank;const n=(d.byname||'').trim();return n?(d.kind==='import'?'by '+n:K.by+' '+n):'';},
  /* photo layouts: rects in a 900x1200 page, each [x,y,w,h,frame?,rot?] */
  photoLayouts(n){
    const grid=(c,r,m,gap)=>{const w=(MagW-2*m-gap*(c-1))/c,h=(MagH-2*m-gap*(r-1))/r,o=[];for(let j=0;j<r;j++)for(let i=0;i<c;i++)o.push([m+i*(w+gap),m+j*(h+gap),w,h]);return o;};
    if(n<=1)return[['Full page',[[0,0,900,1200]]],['Framed',[[70,70,760,940]]],['Polaroid',[[160,120,580,720,1,-.05]]]];
    if(n===2)return[['Stacked',[[0,0,900,600],[0,600,900,600]]],['Side by side',[[0,0,450,1200],[450,0,450,1200]]],['Overlap',[[60,80,560,740,1,-.03],[280,420,560,700,1,.035]]]];
    if(n===3)return[['One big, two small',[[0,0,900,780],[0,780,450,420],[450,780,450,420]]],['Strip',[[0,0,900,400],[0,400,900,400],[0,800,900,400]]],['Collage',[[60,70,520,620,1,-.025],[490,250,360,460,1,.03],[150,730,560,400,1,-.015]]]];
    if(n===4)return[['Grid',grid(2,2,40,16)],['Minimal lookbook',[[70,70,760,720],[70,830,236,300],[332,830,236,300],[594,830,236,300]]],['Mosaic',[[0,0,600,700],[600,0,300,350],[600,350,300,350],[0,700,450,500],[450,700,450,500]].slice(0,4)]];
    const rows=Math.ceil(n/2);
    return[['Grid',grid(2,rows,40,14).slice(0,n)],['Triple grid',grid(3,Math.ceil(n/3),40,14).slice(0,n)],['Big and row',(()=>{const o=[[70,70,760,640]],k=n-1,w=(760-14*(k-1))/k;for(let i=0;i<k;i++)o.push([70+i*(w+14),740,w,300]);return o;})()]];
  },
  storyLayouts:['Headline','Pull quote','Drop cap'],
  lookLayouts:['Photo on top','Full photo','Side by side'],
  nLayouts(p,d){
    if(p.type==='photo')return this.photoLayouts(Math.min(6,Math.max(1,(p.photos||[]).length))).length;
    if(p.type==='story')return 3;if(p.type==='look')return 3;return 1;
  },
  layoutName(p){
    if(p.type==='photo'){const L=this.photoLayouts(Math.min(6,Math.max(1,(p.photos||[]).length)));return L[(p.layout||0)%L.length][0];}
    if(p.type==='story')return this.storyLayouts[(p.layout||0)%3];if(p.type==='look')return this.lookLayouts[(p.layout||0)%3];return '';
  },
  newCanvas(){const c=document.createElement('canvas');c.width=MagW;c.height=MagH;const g=c.getContext('2d');g.textBaseline='alphabetic';g.textAlign='left';return[c,g];},
  async renderCover(d){
    const [c,g]=this.newCanvas(),K=MAG_KINDS[d.kind]||MAG_KINDS.blank,FO=MAG_FONTS[d.font]||MAG_FONTS.classic,W=MagW,H=MagH;
    const bmp=await magBitmap(d.cover&&d.cover.photo),L=((d.cover&&d.cover.layout)||0)%4;
    const title=(d.title||'Your magazine').toUpperCase(),by=this.byline(d);
    const draw=(x,y,maxW,start,color,align)=>{const s=this.fit(g,title,maxW,FO.dw,FO.disp,start);g.fillStyle=color;g.textAlign=align||'left';g.fillText(title,x,y);return s;};
    if(L===0){
      this.cover(g,bmp,0,0,W,H);
      let gr=g.createLinearGradient(0,0,0,360);gr.addColorStop(0,'rgba(0,0,0,.55)');gr.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=gr;g.fillRect(0,0,W,360);
      gr=g.createLinearGradient(0,H-300,0,H);gr.addColorStop(0,'rgba(0,0,0,0)');gr.addColorStop(1,'rgba(0,0,0,.6)');g.fillStyle=gr;g.fillRect(0,H-300,W,300);
      g.textAlign='center';draw(W/2,170,W-110,200,'#fff','center');
      g.fillStyle='#fff';g.font=`600 30px ${F.body}`;g.textAlign='center';g.fillText(by,W/2,H-70);
    }else if(L===1){
      g.fillStyle=K.bg;g.fillRect(0,0,W,H);this.cover(g,bmp,0,330,W,H-330);
      draw(60,220,W-120,190,K.ink,'left');g.fillStyle=K.acc;g.fillRect(60,252,120,8);
      g.fillStyle=K.ink;g.font=`600 26px ${F.body}`;g.textAlign='left';g.fillText(by,60,305);
    }else if(L===2){
      g.fillStyle=K.bg;g.fillRect(0,0,W,H);this.shadowRect(g,90,90,720,880,0);this.cover(g,bmp,90,90,720,880);
      g.textAlign='center';draw(W/2,1090,W-140,130,K.ink,'center');g.fillStyle=K.acc;g.font=`600 28px ${F.body}`;g.textAlign='center';g.fillText(by,W/2,1150);
    }else{
      this.cover(g,bmp,0,0,W,H);g.fillStyle='rgba(0,0,0,.28)';g.fillRect(0,0,W,H);
      const words=title.split(' ');g.textAlign='left';const size=Math.min(270,Math.max(120,Math.floor(1500/Math.max(4,title.length))*1));
      let y=H-90-(Math.min(words.length,4)-1)*size*.9;g.fillStyle='#fff';
      words.slice(0,4).forEach((w,i)=>{const s=this.fit(g,w,W-100,FO.dw,FO.disp,size);g.fillText(w,56,y+i*size*.9);});
      g.font=`600 28px ${F.body}`;g.fillStyle=K.acc==='#111111'?'#fff':'#ffb38a';g.fillText(by,60,90);
    }
    g.textAlign='left';return c;
  },
  async renderPage(d,p,idx){
    const [c,g]=this.newCanvas(),K=MAG_KINDS[d.kind]||MAG_KINDS.blank,FO=MAG_FONTS[d.font]||MAG_FONTS.classic,W=MagW,H=MagH;
    const lay=(p.layout||0);
    if(p.type==='img'){
      const bmp=await magBitmap(p.photos&&p.photos[0]);g.fillStyle='#1b1b1b';g.fillRect(0,0,W,H);
      if(bmp){try{g.save();g.filter='blur(36px)';this.cover(g,bmp,-60,-60,W+120,H+120);g.restore();g.filter='none';}catch(e){g.restore();}
        const r=Math.min(W/bmp.width,H/bmp.height);const w=bmp.width*r,h=bmp.height*r;g.drawImage(bmp,(W-w)/2,(H-h)/2,w,h);}
      return c;
    }
    g.fillStyle=K.bg;g.fillRect(0,0,W,H);let showFolio=false;
    if(p.type==='photo'){
      const ph=(p.photos||[]).slice(0,6),L=this.photoLayouts(Math.min(6,Math.max(1,ph.length))),rects=L[lay%L.length][1];
      const bms=await Promise.all(ph.map(magBitmap));
      for(let i=0;i<Math.max(1,ph.length)&&i<rects.length;i++){const r=rects[i];
        if(r[4]){this.shadowRect(g,r[0],r[1],r[2],r[3],r[5]);g.save();g.translate(r[0]+r[2]/2,r[1]+r[3]/2);g.rotate(r[5]||0);this.cover(g,bms[i],-r[2]/2,-r[3]/2,r[2],r[3]);g.restore();}
        else this.cover(g,bms[i],r[0],r[1],r[2],r[3]);}
      if(p.caption){const full=rects[0][2]>=W-1;showFolio=!full&&!p.caption;g.fillStyle=full?'rgba(0,0,0,.5)':'rgba(0,0,0,0)';if(full)g.fillRect(0,H-130,W,130);
        g.fillStyle=full?'#fff':K.ink;g.font=`italic 600 34px ${FO.disp.indexOf('Bebas')>=0?F.disp:FO.disp}`;g.textAlign='center';g.fillText(p.caption.slice(0,70),W/2,full?H-52:H-30);g.textAlign='left';}
    }else if(p.type==='story'){
      showFolio=lay%3!==1;
      const title=p.title||'Your title',text=p.text||'Write your story here.';
      if(lay%3===0){
        g.fillStyle=K.acc;g.fillRect(70,90,90,10);g.fillStyle=K.ink;const s=this.fit(g,title,W-140,FO.dw,FO.disp,110);
        const lines=this.wrapLines(g,title,W-140);g.font=`${FO.dw} ${Math.min(s,96)}px ${FO.disp}`;let y=220;lines.slice(0,3).forEach(l=>{g.fillText(l,70,y);y+=Math.min(s,96)*1.05;});
        g.font=`500 42px ${F.body}`;g.fillStyle=K.ink;this.para(g,text,70,y+50,W-140,64,H-90);
      }else if(lay%3===1){
        g.fillStyle=K.acc;g.fillRect(0,0,W,H);g.fillStyle='#fff';g.font=`${FO.dw} 130px ${FO.disp}`;g.globalAlpha=.35;g.fillText('“',60,230);g.globalAlpha=1;
        g.font=`${FO.dw} 78px ${FO.disp}`;const ls=this.wrapLines(g,title,W-150);let y=330;ls.slice(0,5).forEach(l=>{g.fillText(l,75,y);y+=88;});
        g.font=`500 40px ${F.body}`;this.para(g,text,75,y+40,W-150,60,H-80);
      }else{
        g.fillStyle=K.ink;g.font=`700 26px ${F.body}`;g.fillText(title.toUpperCase().slice(0,40),70,130);g.fillStyle=K.acc;g.fillRect(70,160,H>0?120:0,6);
        const first=text.charAt(0)||'T',rest=text.slice(1);g.fillStyle=K.acc;g.font=`${FO.dw} 220px ${FO.disp}`;g.fillText(first,66,400);
        g.fillStyle=K.ink;g.font=`500 36px ${F.body}`;
        let y=250;const ls=this.wrapLines(g,rest,W-140-160);
        ls.forEach((l,i)=>{if(y>H-80)return;if(i<4){g.fillText(l,70+170,y);y+=52;}else{if(i===4){const all=this.wrapLines(g,ls.slice(4).join(' '),W-140);y=Math.max(y,420);all.forEach(a=>{if(y<H-80){g.fillText(a,70,y);y+=52;}});}}});
      }
    }else if(p.type==='look'){
      const bm=await magBitmap(p.photos&&p.photos[0]),lk=p.look||{};
      const info=(x,y,maxW,col)=>{
        g.fillStyle=K.acc===col?K.acc:col;g.font=`700 24px ${F.body}`;g.fillText(('LOOK '+String(p.no||1).padStart(2,'0')),x,y);
        g.fillStyle=col;const s=this.fit(g,lk.name||'Name this look',maxW,FO.dw,FO.disp,76);g.fillText(lk.name||'Name this look',x,y+s+14);let yy=y+s+66;
        g.font=`500 30px ${F.body}`;yy=this.para(g,lk.details||'',x,yy,maxW,44,H-60);
        g.font=`700 26px ${F.body}`;if(lk.brand){g.fillText('Brand: '+lk.brand,x,yy+18);yy+=44;}
        if(lk.link){let host=lk.link;try{host=new URL(lk.link).hostname.replace(/^www\./,'');}catch(e){}g.fillStyle=K.acc;g.fillText('Shop: '+host,x,yy+18);yy+=44;}
        const tg=(lk.tags||[]).slice(0,4);if(tg.length){g.fillStyle=col;g.globalAlpha=.7;g.font=`600 26px ${F.body}`;g.fillText('With '+tg.map(t=>'@'+t).join(' '),x,yy+18);g.globalAlpha=1;}
      };
      if(lay%3===0){this.cover(g,bm,0,0,W,760);g.fillStyle=K.bg;info(70,830,W-140,K.ink);}
      else if(lay%3===1){this.cover(g,bm,0,0,W,H);const gr=g.createLinearGradient(0,H-520,0,H);gr.addColorStop(0,'rgba(0,0,0,0)');gr.addColorStop(1,'rgba(0,0,0,.78)');g.fillStyle=gr;g.fillRect(0,H-520,W,520);info(60,H-390,W-120,'#fff');}
      else{this.cover(g,bm,0,0,480,H);g.fillStyle=K.bg;info(520,130,W-520-50,K.ink);}
    }
    g.textAlign='left';
    if(showFolio){g.fillStyle=K.ink;g.globalAlpha=.4;g.font=`600 22px ${F.body}`;g.fillText(String(idx+1)+'   '+(d.title||'').toUpperCase().slice(0,30),50,H-26);g.globalAlpha=1;    }
    return c;
  },
  async renderCredits(d){
    const [c,g]=this.newCanvas(),K=MAG_KINDS[d.kind]||MAG_KINDS.blank,FO=MAG_FONTS[d.font]||MAG_FONTS.classic,W=MagW,H=MagH;
    g.fillStyle=K.ink;g.fillRect(0,0,W,H);g.fillStyle='#fff';g.textAlign='center';
    g.font=`${FO.dw} 110px ${FO.disp}`;g.fillText('Credits',W/2,230);g.fillStyle=K.acc==='#111111'?'#fff':K.acc;g.fillRect(W/2-45,262,90,7);
    g.fillStyle='#fff';g.font=`600 34px ${F.body}`;let y=360;
    const line=(a,b)=>{g.globalAlpha=.6;g.font=`700 22px ${F.body}`;g.fillText(a.toUpperCase(),W/2,y);g.globalAlpha=1;g.font=`500 36px ${F.body}`;y+=46;this.wrapLines(g,b,W-120).forEach(l=>{g.fillText(l,W/2,y);y+=52;});y+=26;};
    if(d.byname)line('Created by',d.byname);
    const tags=[...new Set((d.pages||[]).flatMap(p=>(p.look&&p.look.tags)||[]))].slice(0,8),brands=[...new Set((d.pages||[]).map(p=>p.look&&p.look.brand).filter(Boolean))].slice(0,8);
    if(tags.length)line('Friends & designers',tags.map(t=>'@'+t).join('  '));
    if(brands.length)line('Brands',brands.join(' · '));
    g.fillStyle='#fff';g.globalAlpha=.55;g.font=`600 26px ${F.body}`;g.fillText('Made with Lukks',W/2,H-90);g.globalAlpha=1;g.textAlign='left';return c;
  },
  async renderAll(d,prog){
    const out=[await this.renderCover(d)];prog&&prog(1);let no=0;
    for(let i=0;i<(d.pages||[]).length;i++){const p=d.pages[i];if(p.type==='look')no++;out.push(await this.renderPage(d,Object.assign({},p,{no}),i));prog&&prog(i+2);}
    out.push(await this.renderCredits(d));return out;
  }
};
const canvasBlob=(c,q)=>new Promise(res=>c.toBlob(res,'image/jpeg',q||.88));
/* minimal PDF writer: one JPEG page per canvas */
async function makePdf(canvases,q){
  const enc=new TextEncoder(),parts=[],offs={};let off=0;
  const push=b=>{const u=typeof b==='string'?enc.encode(b):b;parts.push(u);off+=u.length;};
  const obj=(n,dict,stream)=>{offs[n]=off;push(`${n} 0 obj\n${dict}\n`);if(stream){push('stream\n');push(stream);push('\nendstream\n');}push('endobj\n');};
  const n=canvases.length,pw=450,ph=Math.round(450*canvases[0].height/canvases[0].width);
  push('%PDF-1.4\n');
  obj(1,'<< /Type /Catalog /Pages 2 0 R >>');
  obj(2,`<< /Type /Pages /Kids [${canvases.map((_,i)=>(3+i*3)+' 0 R').join(' ')}] /Count ${n} >>`);
  for(let i=0;i<n;i++){
    const cv=canvases[i],jpg=new Uint8Array(await (await canvasBlob(cv,q)).arrayBuffer());
    const content=`q ${pw} 0 0 ${ph} 0 0 cm /Im0 Do Q`;
    obj(3+i*3,`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pw} ${ph}] /Resources << /XObject << /Im0 ${5+i*3} 0 R >> >> /Contents ${4+i*3} 0 R >>`);
    obj(4+i*3,`<< /Length ${content.length} >>`,enc.encode(content));
    obj(5+i*3,`<< /Type /XObject /Subtype /Image /Width ${cv.width} /Height ${cv.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpg.length} >>`,jpg);
  }
  const total=3+n*3,xref=off;let x=`xref\n0 ${total}\n0000000000 65535 f \n`;
  for(let i=1;i<total;i++)x+=String(offs[i]).padStart(10,'0')+' 00000 n \n';
  push(x+`trailer\n<< /Size ${total} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);
  return new Blob(parts,{type:'application/pdf'});
}
/* drafts live on the device (IndexedDB) so photos never have to be uploaded until you publish */
const MagDB={
  _db:null,
  open(){return this._db||(this._db=new Promise((res,rej)=>{const r=indexedDB.open('lukks-mags',1);r.onupgradeneeded=()=>r.result.createObjectStore('drafts',{keyPath:'id'});r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);}));},
  async tx(mode,fn){const db=await this.open();return new Promise((res,rej)=>{const t=db.transaction('drafts',mode),s=t.objectStore('drafts'),rq=fn(s);t.oncomplete=()=>res(rq&&rq.result);t.onerror=()=>rej(t.error);});},
  async list(){try{const a=await this.tx('readonly',s=>s.getAll());return(a||[]).sort((x,y)=>y.updated-x.updated);}catch(e){return[];}},
  async put(d){d.updated=Date.now();return this.tx('readwrite',s=>s.put(d));},
  async del(id){return this.tx('readwrite',s=>s.delete(id));}
};
let _pdfjs=null;
function loadPdfJs(){
  if(window.pdfjsLib)return Promise.resolve(window.pdfjsLib);
  return _pdfjs||(_pdfjs=new Promise((res,rej)=>{const s=document.createElement('script');s.src='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    s.onload=()=>{window.pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';res(window.pdfjsLib);};
    s.onerror=()=>{_pdfjs=null;rej(new Error('Could not load the PDF reader. Check your connection and try again.'));};document.head.appendChild(s);}));
}
async function pdfToBlobs(file,max,prog){
  const lib=await loadPdfJs(),doc=await lib.getDocument({data:await file.arrayBuffer()}).promise,out=[];
  for(let i=1;i<=Math.min(doc.numPages,max);i++){
    const pg=await doc.getPage(i),vp0=pg.getViewport({scale:1}),sc=1100/Math.max(vp0.width,vp0.height)*(vp0.width>vp0.height?1:1),vp=pg.getViewport({scale:Math.min(3,sc*1.0)});
    const c=document.createElement('canvas');c.width=Math.round(vp.width);c.height=Math.round(vp.height);const g=c.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,c.width,c.height);
    await pg.render({canvasContext:g,viewport:vp}).promise;out.push(await canvasBlob(c,.88));prog&&prog(i,Math.min(doc.numPages,max));
  }
  return out;
}
