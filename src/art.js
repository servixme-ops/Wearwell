/* ---------- ART: canvas-drawn figures, covers, pages, room textures ---------- */
const F={disp:"'Playfair Display', Georgia, serif",cond:"'Bebas Neue', Impact, 'Arial Narrow', sans-serif",body:"'Instrument Sans', Arial, Helvetica, sans-serif"};
function mk(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return c;}

function fabricTile(kind,cols,s){
  s=s||64;const c=mk(s,s),g=c.getContext('2d');const a=cols[0],b=cols[1],d=cols[2];
  g.fillStyle=a;g.fillRect(0,0,s,s);
  if(kind==='ankara'){
    g.fillStyle=b;[[16,16,12],[48,48,12]].forEach(p=>{g.beginPath();g.arc(p[0],p[1],p[2],0,7);g.fill();});
    g.fillStyle=d;[[16,16,6],[48,48,6]].forEach(p=>{g.beginPath();g.arc(p[0],p[1],p[2],0,7);g.fill();});
    g.fillStyle=a;[[16,16,2.5],[48,48,2.5]].forEach(p=>{g.beginPath();g.arc(p[0],p[1],p[2],0,7);g.fill();});
    g.strokeStyle=d;g.lineWidth=2;g.beginPath();g.moveTo(32,2);g.lineTo(40,10);g.lineTo(32,18);g.lineTo(24,26);g.lineTo(32,34);g.stroke();
    g.beginPath();g.moveTo(0,46);g.lineTo(8,54);g.lineTo(0,62);g.stroke();
  }else if(kind==='adire'){
    g.strokeStyle=b;g.lineWidth=2;
    [[32,32],[0,0],[64,0],[0,64],[64,64]].forEach(p=>{[5,10,15].forEach(r=>{g.beginPath();g.arc(p[0],p[1],r,0,7);g.stroke();});});
    g.fillStyle=d;[[16,16],[48,16],[16,48],[48,48]].forEach(p=>{g.beginPath();g.arc(p[0],p[1],2.2,0,7);g.fill();});
  }else if(kind==='asooke'){
    g.fillStyle=b;g.fillRect(8,0,6,s);g.fillRect(40,0,10,s);
    g.fillStyle=d;g.fillRect(18,0,2,s);g.fillRect(56,0,3,s);
    g.fillStyle='rgba(0,0,0,.18)';for(let y=0;y<s;y+=8)g.fillRect(0,y,s,1);
  }else if(kind==='lace'){
    g.fillStyle=b;for(let y=8;y<s;y+=16)for(let x=((y/16)%2)*8+4;x<s;x+=16){g.beginPath();g.arc(x,y,3.4,0,7);g.fill();}
    g.strokeStyle=d;g.lineWidth=1.2;for(let y=8;y<s;y+=16)for(let x=((y/16)%2)*8+4;x<s;x+=16){g.beginPath();g.arc(x,y,6,0,7);g.stroke();}
  }else{
    g.fillStyle=b;[[16,16],[48,48]].forEach(p=>{g.beginPath();g.moveTo(p[0],p[1]-14);g.lineTo(p[0]+14,p[1]);g.lineTo(p[0],p[1]+14);g.lineTo(p[0]-14,p[1]);g.fill();});
    g.fillStyle=d;[[16,16],[48,48]].forEach(p=>{g.beginPath();g.moveTo(p[0],p[1]-6);g.lineTo(p[0]+6,p[1]);g.lineTo(p[0],p[1]+6);g.lineTo(p[0]-6,p[1]);g.fill();});
    g.fillRect(0,31,s,2);
  }
  return c;
}
const _patCache={};
function fabricFill(g,kind,cols,scale){
  const key=kind+cols.join('')+scale;
  let t=_patCache[key];if(!t){t=fabricTile(kind,cols);_patCache[key]=t;}
  const p=g.createPattern(t,'repeat');
  try{p.setTransform(new DOMMatrix().scale(scale||1));}catch(e){}
  return p;
}

/* Draws a stylised fashion figure. cx = centre x, top = top y, H = full height */
function drawFigure(g,look,cx,top,H){
  const u=H/100,skin=look.skin,fk=look.fab,cols=look.cols;
  const sc=Math.max(.6,u*.14);
  const fab=fabricFill(g,fk,cols,sc);
  const fab2=fabricFill(g,fk,[cols[1],cols[0],cols[2]],sc);
  const Y=v=>top+v*u,X=v=>cx+v*u;
  g.save();
  // ground shadow
  g.fillStyle='rgba(0,0,0,.18)';g.beginPath();g.ellipse(cx,Y(98.5),26*u,2.4*u,0,0,7);g.fill();
  const poly=(pts,fill)=>{g.beginPath();pts.forEach((p,i)=>i?g.lineTo(X(p[0]),Y(p[1])):g.moveTo(X(p[0]),Y(p[1])));g.closePath();g.fillStyle=fill;g.fill();};
  const shape=look.shape;
  const legs=(y0,w,col)=>{g.fillStyle=col||skin;g.fillRect(X(-w-2.2),Y(y0),w*u,(96-y0)*u);g.fillRect(X(2.2),Y(y0),w*u,(96-y0)*u);
    g.fillStyle='#1c1210';g.beginPath();g.ellipse(X(-w/2-2.2),Y(97),(w/2+1.4)*u,1.6*u,0,0,7);g.fill();g.beginPath();g.ellipse(X(w/2+2.2),Y(97),(w/2+1.4)*u,1.6*u,0,0,7);g.fill();};
  const arm=(sx,y0,len,w,col,ang)=>{g.save();g.translate(X(sx),Y(y0));g.rotate(ang);g.fillStyle=col;g.beginPath();
    g.moveTo(-w*u/2,0);g.lineTo(w*u/2,0);g.lineTo(w*u*.4,len*u);g.lineTo(-w*u*.4,len*u);g.closePath();g.fill();g.restore();};
  // neck
  g.fillStyle=skin;g.fillRect(X(-2.6),Y(17),5.2*u,7*u);
  if(shape==='agbada'){
    legs(58,6.6,fab2);
    arm(-11,23,40,6,skin,.22);arm(11,23,40,6,skin,-.22);
    // robe
    g.beginPath();g.moveTo(X(-10),Y(22));g.bezierCurveTo(X(-34),Y(26),X(-44),Y(52),X(-38),Y(80));g.lineTo(X(-6),Y(82));g.lineTo(X(6),Y(82));g.lineTo(X(38),Y(80));g.bezierCurveTo(X(44),Y(52),X(34),Y(26),X(10),Y(22));g.closePath();g.fillStyle=fab;g.fill();
    g.fillStyle='rgba(0,0,0,.22)';g.beginPath();g.moveTo(X(-5),Y(22));g.lineTo(X(5),Y(22));g.lineTo(X(8),Y(82));g.lineTo(X(-8),Y(82));g.fill();
    g.strokeStyle=cols[2];g.lineWidth=1.6*u;g.beginPath();g.moveTo(X(-38),Y(80));g.lineTo(X(38),Y(80));g.stroke();
  }else if(shape==='gown'){
    arm(-9,24,36,4.6,skin,.12);arm(9,24,36,4.6,skin,-.12);
    g.beginPath();g.moveTo(X(-9),Y(22));g.quadraticCurveTo(X(0),Y(27),X(9),Y(22));g.lineTo(X(8),Y(42));g.bezierCurveTo(X(10),Y(60),X(36),Y(80),X(40),Y(97));g.lineTo(X(-40),Y(97));g.bezierCurveTo(X(-36),Y(80),X(-10),Y(60),X(-8),Y(42));g.closePath();g.fillStyle=fab;g.fill();
    g.fillStyle=cols[2];g.fillRect(X(-8.4),Y(41),16.8*u,2.2*u);
    g.fillStyle='rgba(255,255,255,.1)';g.beginPath();g.moveTo(X(-8),Y(44));g.bezierCurveTo(X(-10),Y(62),X(-30),Y(80),X(-38),Y(97));g.lineTo(X(-20),Y(97));g.bezierCurveTo(X(-18),Y(80),X(-8),Y(62),X(-6),Y(44));g.fill();
  }else if(shape==='iro'){
    arm(-10,24,28,6,cols[1],.3);arm(10,24,28,6,cols[1],-.3);
    g.beginPath();g.moveTo(X(-8),Y(44));g.lineTo(X(8),Y(44));g.bezierCurveTo(X(14),Y(60),X(20),Y(80),X(21),Y(97));g.lineTo(X(-21),Y(97));g.bezierCurveTo(X(-20),Y(80),X(-14),Y(60),X(-8),Y(44));g.closePath();g.fillStyle=fab;g.fill();
    g.fillStyle=cols[2];g.fillRect(X(-8.6),Y(43),17.2*u,2.4*u);
    poly([[-9,22],[9,22],[10,38],[13,50],[-13,50],[-10,38]],fab2);
    g.fillStyle=skin;g.beginPath();g.arc(X(0),Y(22.4),3.2*u,0,Math.PI);g.fill();
  }else if(shape==='jumpsuit'){
    arm(-9,24,36,4.6,skin,.1);arm(9,24,36,4.6,skin,-.1);
    poly([[-9,22],[9,22],[8,44],[10,48],[22,97],[2,97],[0,56],[-2,97],[-22,97],[-10,48],[-8,44]],fab);
    g.fillStyle=cols[2];g.fillRect(X(-8.6),Y(43),17.2*u,2.2*u);
  }else if(shape==='midi'){
    arm(-9,24,34,4.6,skin,.12);arm(9,24,34,4.6,skin,-.12);
    legs(78,3.8,skin);
    poly([[-9,22],[9,22],[8,42],[24,80],[-24,80],[-8,42]],fab);
    g.fillStyle=cols[2];g.fillRect(X(-8.4),Y(41),16.8*u,2.2*u);
  }else{ // kaftan
    legs(78,3.8,skin);
    arm(-11,24,30,7,fab2,.34);arm(11,24,30,7,fab2,-.34);
    poly([[-10,22],[10,22],[22,44],[26,80],[-26,80],[-22,44]],fab);
    g.fillStyle=skin;g.beginPath();g.moveTo(X(-3.4),Y(22));g.lineTo(X(3.4),Y(22));g.lineTo(X(0),Y(32));g.fill();
    g.strokeStyle=cols[2];g.lineWidth=1.4*u;g.beginPath();g.moveTo(X(-26),Y(80));g.lineTo(X(26),Y(80));g.stroke();
  }
  // head
  g.fillStyle=skin;g.beginPath();g.ellipse(X(0),Y(11),6.6*u,8.2*u,0,0,7);g.fill();
  g.fillStyle='rgba(0,0,0,.28)';g.beginPath();g.arc(X(-2.2),Y(11),.7*u,0,7);g.arc(X(2.2),Y(11),.7*u,0,7);g.fill();
  g.fillStyle='rgba(120,20,30,.65)';g.beginPath();g.ellipse(X(0),Y(15.2),1.7*u,.6*u,0,0,7);g.fill();
  if(look.gele){
    g.save();g.translate(X(1.5),Y(3));g.rotate(.14);
    g.fillStyle=fab2;g.beginPath();g.ellipse(0,0,15*u,8*u,0,0,7);g.fill();
    g.strokeStyle='rgba(0,0,0,.22)';g.lineWidth=.9*u;
    for(let i=-2;i<=2;i++){g.beginPath();g.moveTo(i*5*u,-7.5*u);g.quadraticCurveTo(i*6*u+2*u,0,i*5*u,7.5*u);g.stroke();}
    g.fillStyle=fab;g.beginPath();g.ellipse(9*u,-4*u,7*u,5*u,.5,0,7);g.fill();
    g.restore();
  }else if(shape==='agbada'){
    g.fillStyle=fab2;g.beginPath();g.moveTo(X(-7),Y(7));g.quadraticCurveTo(X(0),Y(-4),X(7),Y(7));g.lineTo(X(7),Y(9));g.lineTo(X(-7),Y(9));g.fill();
  }else{
    g.fillStyle='#1c1210';g.beginPath();g.ellipse(X(0),Y(5),7.6*u,6.4*u,0,Math.PI,0);g.fill();g.beginPath();g.arc(X(-6),Y(10),2.2*u,0,7);g.arc(X(6),Y(10),2.2*u,0,7);g.fill();
  }
  // earrings / light
  g.fillStyle=look.cols[2];g.beginPath();g.arc(X(-6.6),Y(14),1*u,0,7);g.arc(X(6.6),Y(14),1*u,0,7);g.fill();
  const sh=g.createLinearGradient(X(-40),0,X(40),0);sh.addColorStop(0,'rgba(255,255,255,.12)');sh.addColorStop(.5,'rgba(255,255,255,0)');sh.addColorStop(1,'rgba(0,0,0,.14)');
  g.globalCompositeOperation='source-atop';g.fillStyle=sh;g.fillRect(X(-45),Y(0),90*u,100*u);
  g.restore();
}

function fitText(g,text,maxW,weight,family,start){
  let s=start||200;g.font=`${weight} ${s}px ${family}`;
  while(g.measureText(text).width>maxW&&s>8){s-=4;g.font=`${weight} ${s}px ${family}`;}
  return s;
}
function wrap(g,text,x,y,maxW,lh){
  const words=text.split(' ');let line='';
  words.forEach(w=>{const t=line?line+' '+w:w;if(g.measureText(t).width>maxW&&line){g.fillText(line,x,y);line=w;y+=lh;}else line=t;});
  g.fillText(line,x,y);return y+lh;
}
function marker(g,x,y,r){
  g.save();g.fillStyle='rgba(255,255,255,.92)';g.strokeStyle='rgba(40,20,20,.55)';g.lineWidth=r*.18;
  g.beginPath();g.arc(x,y,r,0,7);g.fill();g.stroke();
  g.strokeStyle='#7a1f2b';g.lineWidth=r*.2;g.beginPath();g.moveTo(x-r*.4,y);g.lineTo(x+r*.4,y);g.moveTo(x,y-r*.4);g.lineTo(x,y+r*.4);g.stroke();
  g.restore();
}
function barcode(g,x,y,w,h,ink){
  g.fillStyle='#fff';g.fillRect(x,y,w,h);g.fillStyle='#111';const r=rng(x*7+y);
  for(let i=4;i<w-4;i+=2+Math.floor(r()*3)){g.fillRect(x+i,y+4,1+Math.floor(r()*2),h-12);}
}

/* ---- Covers ---- */
function drawCover(m,W,H){
  W=W||512;H=H||676;const c=mk(W,H),g=c.getContext('2d');const k=W/512;
  g.fillStyle=m.bg;g.fillRect(0,0,W,H);
  const look=m.looks[0];
  g.textBaseline='alphabetic';
  if(m.variant==='block'){
    g.fillStyle=m.acc;g.beginPath();g.arc(W*.5,H*.66,W*.46,0,7);g.fill();
    drawFigure(g,look,W*.5,H*.2,H*.78);
    g.fillStyle=m.ink;g.textAlign='center';
    const s=fitText(g,m.title.toUpperCase(),W*.9,900,F.disp,150*k);g.fillText(m.title.toUpperCase(),W/2,H*.03+s*.8);
  }else if(m.variant==='frame'){
    g.fillStyle=m.acc;g.beginPath();g.moveTo(W*.14,H*.96);g.lineTo(W*.14,H*.42);g.arc(W*.5,H*.42,W*.36,Math.PI,0);g.lineTo(W*.86,H*.96);g.fill();
    drawFigure(g,look,W*.5,H*.2,H*.76);
    g.strokeStyle=m.ink;g.lineWidth=3*k;g.strokeRect(14*k,14*k,W-28*k,H-28*k);
    g.fillStyle=m.ink;g.textAlign='center';
    const s=fitText(g,m.title.toUpperCase(),W*.78,700,F.disp,120*k);g.fillText(m.title.toUpperCase(),W/2,H*.03+s+22*k);
  }else{
    g.fillStyle=m.acc;g.fillRect(0,0,W*.5,H);
    drawFigure(g,look,W*.56,H*.17,H*.8);
    g.save();g.translate(W*.115,H*.96);g.rotate(-Math.PI/2);g.fillStyle=m.ink;g.textAlign='left';
    const s=fitText(g,m.title.toUpperCase(),H*.9,900,F.cond,170*k);g.fillText(m.title.toUpperCase(),0,0);g.restore();
  }
  // cover lines
  g.textAlign='left';
  g.fillStyle=m.ink;g.font=`700 ${64*k}px ${F.cond}`;
  const lx=m.variant==='split'?W*.56:26*k, ly=H*.5;
  if(m.variant!=='split'){
    g.save();g.shadowColor='rgba(0,0,0,.25)';g.shadowBlur=6*k;
    g.fillStyle=m.variant==='block'?m.ink:m.bg;g.font=`400 ${88*k}px ${F.cond}`;g.fillText(String(m.count),lx,ly);
    g.font=`600 ${14*k}px ${F.body}`;
    const t=['looks to wear','this season,','explained.'];t.forEach((s,i)=>g.fillText(s,lx,ly+20*k+i*17*k));
    g.restore();
  }
  g.fillStyle=m.variant==='split'?m.ink:m.ink;g.font=`600 ${12*k}px ${F.body}`;g.textAlign='right';
  g.fillText('ISSUE '+m.issue+'  ·  ₦3,500',W-24*k,H-26*k);
  g.textAlign='left';g.font=`italic 500 ${15*k}px ${F.disp}`;g.fillText(m.tagline,m.variant==='split'?W*.54:24*k,H-26*k);
  g.fillStyle='rgba(255,255,255,.08)';g.fillRect(0,0,W,H);
  return c;
}

/* ---- Interior faces. Returns {c, hs:[{x,y,w,h,look}]} ---- */
function drawFace(m,i,W,H){
  W=W||640;H=H||845;const c=mk(W,H),g=c.getContext('2d');const k=W/640,hs=[];
  const paper='#f4ecdd',ink='#2a1812';
  const hot=(x,y,w,h,li)=>hs.push({x:x/W,y:y/H,w:w/W,h:h/H,look:m.looks[li]});
  g.textBaseline='alphabetic';g.textAlign='left';
  const folio=(side)=>{g.fillStyle='rgba(0,0,0,.45)';g.font=`600 ${11*k}px ${F.body}`;g.textAlign=side==='l'?'left':'right';
    g.fillText(`${i+1}   WEARWELL · ${m.title.toUpperCase()}`,side==='l'?30*k:W-30*k,H-24*k);g.textAlign='left';};
  if(i===0){return {c:drawCover(m,W,H),hs};}
  if(i===1){
    g.fillStyle=paper;g.fillRect(0,0,W,H);
    g.fillStyle=m.bg;g.fillRect(0,0,W,16*k);
    g.fillStyle='#7a1f2b';g.font=`700 ${14*k}px ${F.body}`;g.fillText("EDITOR'S NOTE",44*k,90*k);
    g.fillStyle=ink;const s=fitText(g,'Dress like the room is yours.',W-90*k,700,F.disp,70*k);
    wrap(g,'Dress like the room is yours.',44*k,150*k,W-88*k,s*1.1);
    g.font=`400 ${19*k}px ${F.disp}`;g.fillStyle='#3a2a22';
    let y=330*k;
    ['Lagos does not do quiet. Neither does the cloth we reach for: the print that stops a conversation, the lace that took three fittings, the indigo that has been dyed by hand for generations.',
     `This issue of ${m.title} is about wearing it well. ${m.count} looks, each one tailored, tied or thrown together by someone who knows exactly what they are doing.`,
     'Tap any outfit to open its collection. Save the ones you love and build your wardrobe as you read.'].forEach(p=>{y=wrap(g,p,44*k,y,W-88*k,27*k)+14*k;});
    g.fillStyle='#7a1f2b';g.font=`italic 500 ${20*k}px ${F.disp}`;g.fillText('The Editors',44*k,y+10*k);
    g.fillStyle=ink;g.font=`700 ${13*k}px ${F.body}`;g.fillText('INSIDE',44*k,H-170*k);
    g.font=`500 ${14*k}px ${F.body}`;
    [['Looks, 03','The cover story'],['Prints, 05','The fabric edit'],['Shop, 09','Where to find it']].forEach((r,j)=>{g.fillText(r[0]+'  ·  '+r[1],44*k,H-142*k+j*24*k);});
    folio('l');return {c,hs};
  }
  const heroFace=(li,bg,txt,label)=>{
    g.fillStyle=bg;g.fillRect(0,0,W,H);
    const lk=m.looks[li];
    g.fillStyle='rgba(255,255,255,.18)';g.beginPath();g.arc(W*.5,H*.58,W*.42,0,7);g.fill();
    drawFigure(g,lk,W*.5,H*.1,H*.82);
    g.fillStyle=txt;g.font=`400 ${150*k}px ${F.cond}`;g.save();g.translate(30*k,H-60*k);g.rotate(-Math.PI/2);g.fillText(label,0,0);g.restore();
    g.font=`italic 600 ${26*k}px ${F.disp}`;g.textAlign='right';g.fillText(lk.name,W-30*k,70*k);
    g.font=`500 ${13*k}px ${F.body}`;g.fillText(lk.designer+'  ·  '+lk.price,W-30*k,94*k);g.textAlign='left';
    hot(W*.2,H*.08,W*.6,H*.86,li);marker(g,W*.5,H*.34,15*k);
    folio(i%2?'l':'r');
  };
  const gridFace=(lis,bg)=>{
    g.fillStyle=bg;g.fillRect(0,0,W,H);
    g.fillStyle='#fff';g.fillStyle=m.bg;
    const s=fitText(g,m.headline,W*.62,400,F.cond,200*k);g.fillText(m.headline,32*k,70*k+s*.55);
    g.fillStyle=ink;g.font=`400 ${14*k}px ${F.body}`;
    wrap(g,`A closer look at ${m.title}: fabric, fit and finish from the designers we are watching.`,32*k,60*k+s*.9+24*k,W*.5,20*k);
    const n=lis.length,cw=(W-32*k*2-14*k*(n-1))/n,ch=H*.52,cy=H-ch-70*k;
    lis.forEach((li,j)=>{const x=32*k+j*(cw+14*k);
      g.fillStyle='#fff';g.fillRect(x,cy,cw,ch);
      g.fillStyle=m.looks[li].bg;g.fillRect(x+6*k,cy+6*k,cw-12*k,ch-56*k);
      drawFigure(g,m.looks[li],x+cw/2,cy+14*k,ch-76*k);
      g.fillStyle=ink;g.font=`700 ${10.5*k}px ${F.body}`;g.textAlign='center';g.fillText(m.looks[li].name.toUpperCase(),x+cw/2,cy+ch-24*k);
      g.font=`500 ${10*k}px ${F.body}`;g.fillStyle='#6a5a50';g.fillText(m.looks[li].price,x+cw/2,cy+ch-9*k);g.textAlign='left';
      hot(x,cy,cw,ch,li);marker(g,x+cw/2,cy+ch*.36,11*k);});
    folio(i%2?'l':'r');
  };
  if(i===2){heroFace(0,m.looks[0].bg,m.ink,'LOOK 01');return {c,hs};}
  if(i===3){gridFace([1,2,3],paper);return {c,hs};}
  if(i===4){heroFace(4,m.looks[4].bg,m.ink==='#f4e9d6'?'#fff':m.ink,'LOOK 02');return {c,hs};}
  if(i===5){
    g.fillStyle='#ece3d3';g.fillRect(0,0,W,H);
    const labels=['COLOURBLOCKING','SOFT CLASSICS','PRINT & PATTERN'],kinds=['ankara','lace',m.fab];
    labels.forEach((lb,j)=>{const x=32*k+j*((W-64*k)/3),w=(W-64*k)/3-10*k;
      g.fillStyle='#fff';g.fillRect(x,40*k,w,150*k);
      const cols=FAB[kinds[j]].cols[0];g.fillStyle=fabricFill(g,kinds[j],cols,1.2*k);g.save();g.translate(x+5*k,45*k);g.fillRect(0,0,w-10*k,125*k);g.restore();
      g.fillStyle=ink;g.font=`700 ${10*k}px ${F.body}`;g.textAlign='center';g.fillText(lb,x+w/2,182*k);g.textAlign='left';});
    g.fillStyle=m.bg;const s=fitText(g,m.headline,W*.9,400,F.cond,230*k);g.fillText(m.headline,32*k,250*k+s*.6);
    g.fillStyle=ink;g.font=`400 ${15*k}px ${F.body}`;
    wrap(g,'Even if you have never opened a pattern book, these looks will make you want to start. Cloth, cut and colour, chosen by people who dress for the occasion every single weekend.',32*k,330*k+s*.45,W*.42,22*k);
    [5,1].forEach((li,j)=>{const x=W*.52+j*W*.24,w=W*.22;
      g.fillStyle=m.looks[li].bg;g.fillRect(x,300*k,w,H*.42);
      drawFigure(g,m.looks[li],x+w/2,310*k,H*.4);hot(x,300*k,w,H*.42,li);marker(g,x+w/2,300*k+H*.15,10*k);});
    g.fillStyle=m.looks[2].bg;g.fillRect(32*k,H*.6,W*.44,H*.3);
    drawFigure(g,m.looks[2],32*k+W*.22,H*.6+10*k,H*.28);hot(32*k,H*.6,W*.44,H*.3,2);marker(g,32*k+W*.22,H*.6+H*.1,10*k);
    folio('r');return {c,hs};
  }
  if(i===6){heroFace(2,m.looks[2].bg,m.ink,'THE EDIT');return {c,hs};}
  if(i===7){gridFace([0,1,4,5].slice(0,3),paper);return {c,hs};}
  if(i===8){
    g.fillStyle=paper;g.fillRect(0,0,W,H);
    g.fillStyle='#7a1f2b';g.font=`700 ${14*k}px ${F.body}`;g.fillText('WHERE TO SHOP',44*k,90*k);
    g.fillStyle=ink;g.font=`700 ${64*k}px ${F.disp}`;g.fillText('Find it in Nigeria.',44*k,160*k);
    g.font=`500 ${19*k}px ${F.disp}`;
    SHOPS.forEach((s,j)=>{g.fillStyle=m.bg;g.fillRect(44*k,235*k+j*78*k,8*k,44*k);g.fillStyle=ink;g.fillText(s.split(' · ')[0],68*k,252*k+j*78*k);
      g.font=`400 ${14*k}px ${F.body}`;g.fillStyle='#6a5a50';g.fillText(s.split(' · ')[1]||'',68*k,276*k+j*78*k);g.font=`500 ${19*k}px ${F.disp}`;});
    g.fillStyle=m.bg;g.fillRect(44*k,H-170*k,W-88*k,92*k);g.fillStyle=m.ink;g.font=`400 ${46*k}px ${F.cond}`;g.fillText('NEXT ISSUE',64*k,H-112*k);
    g.font=`500 ${14*k}px ${F.body}`;g.fillText('Wedding season, fully dressed.',64*k,H-88*k);
    folio('l');return {c,hs};
  }
  g.fillStyle=m.bg;g.fillRect(0,0,W,H);
  g.fillStyle=m.acc;g.beginPath();g.arc(W/2,H*.4,W*.3,0,7);g.fill();
  g.fillStyle=m.ink;g.font=`900 ${240*k}px ${F.disp}`;g.textAlign='center';g.fillText('W',W/2,H*.4+84*k);
  g.font=`600 ${16*k}px ${F.body}`;g.fillText('WEARWELL',W/2,H*.4+W*.3+60*k);
  g.font=`italic 500 ${18*k}px ${F.disp}`;g.fillText('Discover Nigerian fashion',W/2,H*.4+W*.3+90*k);
  barcode(g,W/2-70*k,H-130*k,140*k,80*k);
  return {c,hs};
}

/* collection-card illustration (DOM thumbnails) */
function lookImage(look,w,h){
  w=w||300;h=h||400;const c=mk(w,h),g=c.getContext('2d');
  g.fillStyle=look.bg;g.fillRect(0,0,w,h);
  g.fillStyle='rgba(255,255,255,.2)';g.beginPath();g.arc(w/2,h*.6,w*.42,0,7);g.fill();
  drawFigure(g,look,w/2,h*.06,h*.9);
  return c.toDataURL('image/jpeg',.88);
}

/* ---- Room textures ---- */
function texFloor(){
  const c=mk(1024,1024),g=c.getContext('2d');const r=rng(9);
  const plank=1024/8;
  for(let row=0;row<8;row++){
    for(let col=0;col<3;col++){
      const w=1024/3+ (row%2?-60:0);let x=col*(1024/3)+(row%2?60:0);
      const h=30+Math.floor(r()*14),l=46+Math.floor(r()*10);
      g.fillStyle=`hsl(${h},${40+r()*8}%,${l}%)`;g.fillRect(x,row*plank,w,plank);
      for(let s=0;s<14;s++){g.strokeStyle=`rgba(70,40,20,${.05+r()*.07})`;g.lineWidth=1+r()*1.4;g.beginPath();const yy=row*plank+r()*plank;g.moveTo(x,yy);g.bezierCurveTo(x+w*.3,yy+r()*8-4,x+w*.6,yy+r()*8-4,x+w,yy+r()*6-3);g.stroke();}
      g.fillStyle='rgba(40,20,10,.55)';g.fillRect(x,row*plank,w,2);g.fillRect(x,row*plank,2,plank);
    }
  }
  return c;
}
function texPlaster(col,speck){
  const c=mk(512,512),g=c.getContext('2d');g.fillStyle=col;g.fillRect(0,0,512,512);const r=rng(speck||3);
  for(let i=0;i<2600;i++){g.fillStyle=`rgba(${r()>.5?'255,255,255':'80,50,30'},${r()*.045})`;g.beginPath();g.arc(r()*512,r()*512,r()*14+2,0,7);g.fill();}
  return c;
}
function texRug(){
  const c=mk(1024,640),g=c.getContext('2d');g.fillStyle='#e8d9bd';g.fillRect(0,0,1024,640);
  const bands=[['#7a1f2b',40],['#e9c46a',14],['#14284b',34],['#f6e7cb',10],['#2b5d4f',30],['#e9c46a',12],['#7a1f2b',50]];
  let y=34;g.fillStyle='#14284b';g.fillRect(24,24,976,592);g.fillStyle='#e8d9bd';g.fillRect(40,40,944,560);
  // centre field with diamond motifs
  const t=fabricTile('akwete',['#8a2a3a','#e9c46a','#f6e7cb'],64);g.fillStyle=g.createPattern(t,'repeat');g.fillRect(120,120,784,400);
  g.strokeStyle='#14284b';g.lineWidth=10;g.strokeRect(120,120,784,400);
  y=58;bands.slice(0,3).forEach(b=>{g.fillStyle=b[0];g.fillRect(56,y,912,b[1]/2.4);y+=b[1]/2.4+4;});
  y=640-58;bands.slice(0,3).forEach(b=>{y-=b[1]/2.4;g.fillStyle=b[0];g.fillRect(56,y,912,b[1]/2.4);y-=4;});
  g.fillStyle='rgba(0,0,0,.07)';for(let i=0;i<640;i+=3)g.fillRect(0,i,1024,1);
  // fringe
  g.fillStyle='#f3e6c8';for(let i=0;i<640;i+=7){g.fillRect(0,i,24,3);g.fillRect(1000,i,24,3);}
  return c;
}
function texArt(kind){
  const c=mk(480,600),g=c.getContext('2d');
  if(kind==='adire'){
    g.fillStyle='#16294f';g.fillRect(0,0,480,600);
    const r=rng(5);for(let a=0;a<14;a++){const cx=r()*480,cy=r()*600;for(let rr=6;rr<56;rr+=9){g.strokeStyle=`rgba(190,210,235,${.8-rr/80})`;g.lineWidth=2.4;g.beginPath();g.arc(cx,cy,rr+r()*2,0,7);g.stroke();}}
  }else if(kind==='ankara'){
    g.fillStyle='#f4e9d6';g.fillRect(0,0,480,600);
    const t=fabricTile('ankara',['#c8372d','#f2b705','#1b1b1b'],64);g.fillStyle=g.createPattern(t,'repeat');g.fillRect(30,30,420,540);
  }else if(kind==='portrait'){
    g.fillStyle='#e9c46a';g.fillRect(0,0,480,600);g.fillStyle='#7a1f2b';g.beginPath();g.arc(240,340,190,0,7);g.fill();
    drawFigure(g,{skin:'#6b4330',fab:'ankara',cols:['#14284b','#f2b705','#f4e9d6'],shape:'gown',gele:true},240,80,500);
  }else{
    g.fillStyle='#2b5d4f';g.fillRect(0,0,480,600);g.fillStyle='#f2c14e';
    for(let i=0;i<5;i++){g.fillRect(40+i*84,60,44,480);}g.fillStyle='#7a1f2b';g.fillRect(0,280,480,40);
  }
  return c;
}
function texBasket(){
  const c=mk(256,128),g=c.getContext('2d');g.fillStyle='#c79a56';g.fillRect(0,0,256,128);
  for(let y=0;y<128;y+=8){g.fillStyle=y%16?'#b3853f':'#d6ac6a';g.fillRect(0,y,256,5);}
  g.fillStyle='#7a1f2b';g.fillRect(0,56,256,10);return c;
}
function texCrateLabel(name,col){
  const c=mk(512,128),g=c.getContext('2d');g.fillStyle='#f4e9d6';g.fillRect(0,0,512,128);
  g.strokeStyle=col;g.lineWidth=6;g.strokeRect(8,8,496,112);
  g.fillStyle=col;g.textAlign='center';g.font=`700 52px ${F.disp}`;
  fitText(g,name.toUpperCase(),440,700,F.disp,56);g.fillText(name.toUpperCase(),256,82);return c;
}
function texWood(base){
  const c=mk(256,256),g=c.getContext('2d');g.fillStyle=base;g.fillRect(0,0,256,256);const r=rng(21);
  for(let i=0;i<60;i++){g.strokeStyle=`rgba(60,30,10,${.06+r()*.1})`;g.lineWidth=.6+r()*1.6;g.beginPath();const y=r()*256;g.moveTo(0,y);g.bezierCurveTo(80,y+r()*10-5,170,y+r()*10-5,256,y+r()*8-4);g.stroke();}
  return c;
}
function texEdges(){
  const c=mk(64,64),g=c.getContext('2d');g.fillStyle='#f3efe6';g.fillRect(0,0,64,64);
  for(let y=0;y<64;y+=2){g.fillStyle=y%4?'rgba(0,0,0,.10)':'rgba(0,0,0,.03)';g.fillRect(0,y,64,1);}return c;
}
