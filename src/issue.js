/* ---------- LUKKS · ISSUE 01: the one magazine. Real photos, every look on a receipt. ---------- */
const ISSUE_SECTIONS={
  soft:'Soft Statements',guest:'The Wedding Guest',drip:'Drip Gang',everyday:'Everyday Style',dark:'After Dark'
};
/* Prices are estimates in naira (current Lagos market), each piece listed as worn. */
const ISSUE_LOOKS=[
  {img:'p10',name:'Lilac Cloud',sec:'soft',kicker:'The cover story',wears:3,
   blurb:'A satin column, a cape of tulle and not a single loud thing about it. Softness, worn with total confidence.',
   story:'Sometimes the quietest colour in the room is the one everyone turns to. This lilac column dress is cut clean and lets a hand-gathered tulle cape do all the talking. The matching headscarf keeps the line unbroken, and the small structured bag in croc-effect black gives the pastel something to push against.',
   items:[['Satin column dress with tulle cape','Made to order',185000],['Matching headscarf','',12000],['Croc-effect top-handle bag','',65000],['Stacked ring','',18000]]},
  {img:'p05',name:'Blush Senator',sec:'guest',kicker:'Dressed for the invitation',wears:6,
   blurb:'A senator set in dusty blush with one drawn-on motif. Easy, sharp and made for a long reception.',
   story:'The two-piece that never gets it wrong. Dusty blush linen-look cloth, a relaxed three-quarter sleeve, one hand-drawn motif at the chest and a fila cap to finish. Wide trousers move well on a dance floor, and black velvet loafers keep the whole thing grown and settled.',
   items:[['Blush senator top with motif','Tailor made',85000],['Wide-leg trousers','Tailor made',45000],['Matching fila cap','',15000],['Black velvet loafers','',70000],['Gold-frame glasses','',45000]]},
  {img:'p02',name:'Cowrie Season',sec:'guest',kicker:'Print on print',wears:5,
   blurb:'Orange cowrie print from collar to cuff, matched cap, white bag. Proof that the loudest outfit can still be the most precise.',
   story:'Everything is the same print and that is exactly the point: cowrie shells and arrows in black on bright orange, cut into a loose top, straight trousers and a folded cap. A crisp white bag and flat black slides cool the colour down. It is a look that photographs from across the room.',
   items:[['Cowrie-print top','Didi Couture',95000],['Cowrie-print trousers','Didi Couture',55000],['Matching folded cap','Didi Couture',15000],['White mini top-handle bag','',140000],['Black leather slides','',48000]]},
  {img:'p04',name:'Patchwork Sunday',sec:'soft',kicker:'Small details, big feeling',wears:9,
   blurb:'A cream camp-collar shirt dotted with paint-chip patches in mustard, sky and red. Pale blue trousers keep it gentle.',
   story:'Think of it as a gallery wall you can wear: raised patches in mustard, powder blue and one confident red scattered across an otherwise plain cream shirt. Pale blue pleated trousers, a silver watch and a thin cross chain keep every other decision simple.',
   items:[['Cream shirt with colour patches','',68000],['Pale blue pleated trousers','',42000],['Silver bracelet watch','',280000],['Cross pendant chain','',25000]]},
  {img:'p03',name:'Homme Season',sec:'drip',kicker:'Moto, but make it Sunday',wears:14,
   blurb:'Panelled moto-style sweatshirt, wrap sunglasses, a smartwatch. Sporty lines worn with a straight face.',
   story:'Colour-blocked shoulders and a graphic chest panel give a plain white sweatshirt a racing-team edge. Small black sunglasses and a silver ring keep the attitude high, and a smartwatch makes sure the look is on time.',
   items:[['Panelled graphic sweatshirt','Homme Season',120000],['Black rectangle sunglasses','',75000],['Smartwatch','',320000],['Silver ring','',22000],['Chain bracelet','',18000]]},
  {img:'p06',name:'Twenty-Three',sec:'drip',kicker:'Game day, every day',wears:11,
   blurb:'Black number-23 jersey, baby blue pleated skirt, matching Dunks and headphones. A full colour story, start to finish.',
   story:'Pick two colours and commit. Black and baby blue run from the jersey print to the pleated skirt, the shoulder bag, the headphones and the Dunks. Bow details down the sleeves are the soft note in an otherwise sporty set.',
   items:[['Black number-23 jersey','Never Give Up',38000],['Baby blue pleated skirt','',22000],['Blue and white Dunk Low sneakers','Nike',185000],['Blue wireless headphones','',45000],['Blue shoulder bag','',28000]]},
  {img:'p09',name:'Stripe Heat',sec:'drip',kicker:'Football shirt, new rules',wears:8,
   blurb:'A red and gold striped jersey with gothic crest embroidery, red-tint shades and stacked bracelets.',
   story:'Retro football shirts are not just for match day anymore. This one comes in red and gold stripes with an embroidered crest and a polo collar. Red-lens sunglasses pick up the colour, stone cargos keep the lower half calm, and a stack of bracelets does the rest.',
   items:[['Red and gold striped jersey','',65000],['Red-tint aviator sunglasses','',30000],['Stone cargo trousers','',35000],['Stacked bracelets','',45000]]},
  {img:'p11',name:'Sky Day',sec:'everyday',kicker:'Shot from below',wears:20,
   blurb:'A paisley bandana, a rose-guitar tank, baggy denim. Easy pieces that look better the more you wear them.',
   story:'Photographed from the ground up, because this is a look that holds its own against the whole sky. A paisley bandana, a vintage-style guitar and roses tank, and baggy denim. Nothing here is precious, and that is why it works.',
   items:[['Paisley bandana','',6000],['Rose and guitar graphic tank','',22000],['Baggy denim','',38000],['Simple silver choker','',9000]]},
  {img:'p07',name:'Headphones On',sec:'everyday',kicker:'Campus to commute',wears:30,
   blurb:'A faded graphic tee, big headphones and neat knotless braids. The everyday uniform, done right.',
   story:'The most worn outfit in this issue and the cheapest per wear. A washed-out graphic tee in red and ash, over-ear headphones and a fresh set of knotless braids, done in one sitting. Cost per wear is what makes it a winner.',
   items:[['Faded graphic tee','',25000],['Over-ear headphones','JBL',65000],['Knotless box braids','',60000]]},
  {img:'p08',name:'Bar Seat Leather',sec:'dark',kicker:'First drink, last look',wears:7,
   blurb:'An oversized leather jacket thrown over a chocolate ribbed mini, faux locs and a star pendant.',
   story:'Dress for the bar stool, not the table. A soft oversized leather jacket sits off the shoulders over a chocolate-brown ribbed mini dress. A small star pendant and a beaded bracelet add light, and long faux locs frame it all.',
   items:[['Oversized black leather jacket','',120000],['Chocolate ribbed mini dress','',28000],['Star pendant necklace','',25000],['Beaded bracelet','',8000],['Faux locs','',70000]]},
  {img:'p01',name:'The Reading Room',sec:'dark',kicker:'Quiet luxury, loud confidence',wears:12,
   blurb:'A navy wool blouson, crisp white collar, black tie and wide trousers, read on a gilded sofa.',
   story:'A look that belongs in a room with gold-edged furniture. A navy wool blouson with a zip pocket, a crisp white collar and slim black tie, wide black trousers with a long break and a gold watch. Sharp, relaxed and in no hurry.',
   items:[['Navy wool zip blouson','',480000],['White poplin shirt','',48000],['Slim black tie','',22000],['Black wide-leg trousers','',110000],['Gold watch','',260000]]}
];
const ISSUE_IMG={};
function issuePreload(){
  return Promise.all(ISSUE_LOOKS.map(l=>new Promise(r=>{
    if(ISSUE_IMG[l.img]){r();return;}
    const im=new Image();im.onload=()=>{ISSUE_IMG[l.img]=im;r();};im.onerror=()=>r();im.src='mag/'+l.img+'.jpg';
  })));
}
function buildIssue(){
  const m={ci:0,mi:0,issue_mag:true,title:'Lukks',tagline:'Find your kind of style',variant:'issue',bg:'#9a6bb5',ink:'#ffffff',acc:'#ff7a3d',fab:'ankara',issue:'01',headline:'FIND YOUR KIND OF STYLE',count:ISSUE_LOOKS.length,looks:[]};
  ISSUE_LOOKS.forEach((d,li)=>{
    const items=d.items.map(i=>({name:i[0],brand:i[1],price:i[2],prior_wears:0}));
    const c=RC.calc({wear_count:d.wears},items);
    const look={id:'0-0-'+li,ci:0,mi:0,li,no:li+1,name:d.name,designer:ISSUE_SECTIONS[d.sec],sec:d.sec,kicker:d.kicker,coll:'Lukks · Issue 01',
      photo:'mag/'+d.img+'.jpg',img:d.img,fab:'ankara',cols:['#fff','#fff','#fff'],bg:'#eee',items,wears:d.wears,
      total:c.total,cpw:c.cpw,price:RC.money(c.total,'NGN'),blurb:d.blurb,desc:d.story,story:d.story};
    m.looks.push(look);LOOKS[look.id]=look;
  });
  return m;
}
/* ---------- drawing ---------- */
const PINK='#e8b4c8',MINT='#a0e0cf',LAV='#cbc5d8',CREAM='#fbf6ea',INK='#2a1812',ORG='#f0501b';
function coverFit(g,im,x,y,w,h,fy){
  if(!im){g.fillStyle='#ddd';g.fillRect(x,y,w,h);return;}
  const s=Math.max(w/im.width,h/im.height),dw=im.width*s,dh=im.height*s;
  g.save();g.beginPath();g.rect(x,y,w,h);g.clip();g.drawImage(im,x+(w-dw)/2,y+(h-dh)*(fy==null?.3:fy),dw,dh);g.restore();
}
function spaced(g,t,sp){try{g.letterSpacing=sp+'px';}catch(e){}}
function drawIssueCover(m,W,H){
  W=W||512;H=H||676;const c=mk(W,H),g=c.getContext('2d');const k=W/512;
  const im=ISSUE_IMG[ISSUE_LOOKS[0].img];coverFit(g,im,0,0,W,H,.15);
  let gr=g.createLinearGradient(0,0,0,H*.3);gr.addColorStop(0,'rgba(20,10,30,.55)');gr.addColorStop(1,'rgba(20,10,30,0)');g.fillStyle=gr;g.fillRect(0,0,W,H*.3);
  gr=g.createLinearGradient(0,H*.62,0,H);gr.addColorStop(0,'rgba(20,10,30,0)');gr.addColorStop(1,'rgba(20,10,30,.78)');g.fillStyle=gr;g.fillRect(0,H*.62,W,H*.38);
  g.textBaseline='alphabetic';g.textAlign='center';g.fillStyle='#fff';
  g.save();g.shadowColor='rgba(0,0,0,.35)';g.shadowBlur=10*k;
  spaced(g,'',6*k);const s=fitText(g,'LUKKS',W*.8,900,F.disp,150*k);g.font=`900 ${s}px ${F.disp}`;g.fillText('LUKKS',W/2+3*k,s*.82+22*k);
  g.restore();spaced(g,'',0);
  const by=s*.82+22*k;
  const pill=g.createLinearGradient(W*.3,0,W*.7,0);pill.addColorStop(0,'#ff9a3d');pill.addColorStop(1,'#ff2d8a');
  g.fillStyle=pill;const pw=W*.5,ph=24*k;g.beginPath();if(g.roundRect)g.roundRect(W/2-pw/2,by+14*k,pw,ph,ph/2);else g.rect(W/2-pw/2,by+14*k,pw,ph);g.fill();
  g.fillStyle='#fff';g.font=`700 ${11.5*k}px ${F.body}`;spaced(g,'',2*k);g.fillText('ISSUE 01  ·  OCTOBER 2026',W/2+k,by+14*k+16*k);spaced(g,'',0);
  g.textAlign='left';g.save();g.shadowColor='rgba(0,0,0,.5)';g.shadowBlur=8*k;g.fillStyle='#fff';
  {const fs=fitText(g,'STATEMENTS ISSUE',W-48*k,400,F.cond,66*k);g.font=`400 ${fs}px ${F.cond}`;g.fillText('THE SOFT',24*k,H-150*k);g.fillText('STATEMENTS ISSUE',24*k,H-98*k);}
  g.font=`italic 600 ${17*k}px ${F.disp}`;g.fillText('Find your kind of style.',24*k,H-70*k);
  g.font=`600 ${12*k}px ${F.body}`;g.fillText('11 real outfits, every price on the receipt',24*k,H-46*k);
  g.fillStyle='#ffd9b8';g.font=`700 ${10.5*k}px ${F.body}`;spaced(g,'',1*k);g.fillText('DRIP GANG · THE WEDDING GUEST · AFTER DARK',24*k,H-24*k);spaced(g,'',0);
  g.restore();
  return c;
}
function rrect(g,x,y,w,h,r){g.beginPath();if(g.roundRect)g.roundRect(x,y,w,h,r);else g.rect(x,y,w,h);}
function dashed(g,x1,x2,y,k){g.save();g.strokeStyle='#b9a98f';g.lineWidth=1*k;g.setLineDash([4*k,4*k]);g.beginPath();g.moveTo(x1,y);g.lineTo(x2,y);g.stroke();g.restore();}
function drawReceiptCard(g,look,x,y,w,h,k){
  g.save();g.shadowColor='rgba(40,20,10,.28)';g.shadowBlur=14*k;g.shadowOffsetY=4*k;g.fillStyle=CREAM;rrect(g,x,y,w,h,6*k);g.fill();g.restore();
  const p=18*k;let yy=y+26*k;
  g.textAlign='center';g.fillStyle=INK;g.font=`900 ${13*k}px ${F.disp}`;spaced(g,'',2.4*k);g.fillText('LUKKS RECEIPT',x+w/2,yy);spaced(g,'',0);
  yy+=14*k;g.font=`700 ${10*k}px ${F.body}`;g.fillStyle='#4a3a2e';g.fillText(`Lukk #${look.no} · Issue 01 · ${look.designer}`,x+w/2,yy);
  yy+=24*k;g.fillStyle=INK;g.font=`900 ${20*k}px ${F.disp}`;g.fillText(look.name,x+w/2,yy);
  yy+=12*k;dashed(g,x+p,x+w-p,yy,k);yy+=20*k;
  const rows=RC.calc({wear_count:look.wears},look.items).rows;
  rows.forEach(r=>{
    g.textAlign='left';g.fillStyle=INK;g.font=`700 ${12*k}px ${F.body}`;
    let nm=r.name;while(g.measureText(nm).width>w-p*2-86*k&&nm.length>6)nm=nm.slice(0,-2);if(nm!==r.name)nm=nm.trim()+'…';
    g.fillText(nm,x+p,yy);g.textAlign='right';g.font=`800 ${12*k}px ${F.body}`;g.fillText(RC.money(r.price,'NGN'),x+w-p,yy);
    g.textAlign='left';g.font=`600 ${10*k}px ${F.body}`;g.fillStyle='#4a3a2e';g.fillText((r.brand?r.brand+' · ':'')+r.total_wears+' wears',x+p,yy+12*k);
    g.textAlign='right';g.fillText(RC.money(r.cpw,'NGN')+' / wear',x+w-p,yy+12*k);yy+=29*k;
  });
  yy-=10*k;dashed(g,x+p,x+w-p,yy,k);yy+=19*k;
  g.textAlign='left';g.fillStyle=INK;g.font=`800 ${13.5*k}px ${F.body}`;g.fillText('Total spent',x+p,yy);g.textAlign='right';g.fillText(RC.money(look.total,'NGN'),x+w-p,yy);
  yy+=19*k;g.textAlign='left';g.fillStyle=ORG;g.fillText('Cost per wear',x+p,yy);g.textAlign='right';g.fillText(RC.money(look.cpw,'NGN'),x+w-p,yy);
  g.textAlign='left';
}
function pastelShapes(g,side,W,H,k,style){
  const mx=x=>side==='r'?x:W-x;
  if(style==='A'){
    // rainbow arcs + mint dome (left/outer column), melt blob at the bottom
    g.save();const cx=mx(72),cy=300;
    for(let i=0;i<5;i++){g.fillStyle=i%2?MINT:PINK;g.beginPath();g.arc(cx,cy,64-i*12,Math.PI,0);g.lineTo(cx+(64-i*12),cy);g.fill();}
    g.fillStyle='#fff';g.beginPath();g.arc(cx,cy,5,Math.PI,0);g.fill();
    g.fillStyle=MINT;g.beginPath();g.arc(cx,cy+74,66,Math.PI,0);g.lineTo(cx+66,cy+74);g.fill();
    g.fillStyle=PINK;const by=H-80;
    [[mx(8),by+10,36],[mx(52),by-18,34],[mx(100),by+16,30]].forEach(([x,y,r])=>{g.beginPath();g.arc(x,y,r,0,7);g.fill();});
    g.fillRect(Math.min(mx(0),mx(140)),by+10,140,H-by);
    g.restore();
  }else{
    g.save();
    // zig-zag strip on the outer edge
    const ex=side==='r'?W-20:0;
    for(let y=0;y<H;y+=34){g.fillStyle=MINT;g.beginPath();g.moveTo(ex+(side==='r'?20:0),y);g.lineTo(ex+(side==='r'?0:20),y+17);g.lineTo(ex+(side==='r'?20:0),y+34);g.fill();}
    for(let y=17;y<H;y+=34){g.fillStyle=PINK;g.beginPath();g.moveTo(ex+(side==='r'?20:0),y);g.lineTo(ex+(side==='r'?6:14),y+8);g.lineTo(ex+(side==='r'?20:0),y+17);g.fill();}
    g.fillStyle=PINK;g.beginPath();const px=side==='r'?W-130:130;g.arc(px,H-18,110,Math.PI,0);g.fill();
    g.fillStyle=MINT;g.beginPath();g.moveTo(mx(W-215),170);g.lineTo(mx(W-35),170);g.lineTo(mx(W-125),20);g.closePath();g.fill();
    g.restore();
  }
}
function drawLookFace(m,i,W,H,SC){
  const c=mk(W*SC,H*SC),g=c.getContext('2d');g.scale(SC,SC);const k=1;
  const li=i-2,look=m.looks[li],side=(i%2===0)?'r':'l';
  const spread=Math.floor((i-1)/2),style=spread%2===0?'A':'B';
  const mx=(x,w)=>side==='r'?x:W-x-w;
  g.textBaseline='alphabetic';g.textAlign='left';
  g.fillStyle=style==='A'?'#ffffff':LAV;g.fillRect(0,0,W,H);
  pastelShapes(g,side,W,H,k,style);
  const im=ISSUE_IMG[look.img];
  const hs=[];
  const folio=()=>{g.fillStyle='rgba(0,0,0,.45)';g.font=`600 ${11*k}px ${F.body}`;g.textAlign=side==='l'?'left':'right';
    g.fillText(`${i+1}   LUKKS · ISSUE 01`,side==='l'?30*k:W-30*k,H-14*k);g.textAlign='left';};
  if(style==='A'){
    const px=mx(150,450),py=62,pw=450,ph=390;
    // label block
    g.fillStyle=PINK;const lw=300;g.fillRect(mx(0,lw),0,lw,50);
    g.fillStyle=INK;g.font=`400 ${27*k}px ${F.cond}`;spaced(g,'',1.5);g.textAlign=side==='r'?'left':'right';
    g.fillText(ISSUE_SECTIONS[look.sec].toUpperCase(),side==='r'?26:W-26,35);spaced(g,'',0);g.textAlign='left';
    coverFit(g,im,px,py,pw,ph,.2);hs.push({x:px/W,y:py/H,w:pw/W,h:ph/H,look});
    g.fillStyle=INK;g.font=`400 ${88*k}px ${F.cond}`;g.textAlign='center';g.fillText(String(look.no).padStart(2,'0'),mx(0,140)+70,py+ph+60);g.textAlign='left';
    g.font=`italic 700 ${15*k}px ${F.disp}`;g.fillStyle='#1f1410';wrap(g,look.blurb,px,py+ph+24,pw,19*k);
    drawReceiptCard(g,look,px,539,pw,284,k);
  }else{
    const pw=340,ph=440,px=mx(48,pw),py=70;
    coverFit(g,im,px,py,pw,ph,.2);hs.push({x:px/W,y:py/H,w:pw/W,h:ph/H,look});
    g.fillStyle='#fff';g.fillRect(px,py,86,26);g.fillStyle=INK;g.font=`700 ${11*k}px ${F.body}`;g.textAlign='center';g.fillText('LUKK '+String(look.no).padStart(2,'0'),px+43,py+17);g.textAlign='left';
    {const words=ISSUE_SECTIONS[look.sec].toUpperCase().split(' '),mid=Math.ceil(words.length/2),ls=[words.slice(0,mid).join(' '),words.slice(mid).join(' ')].filter(Boolean);
     g.fillStyle=INK;g.font=`400 ${17*k}px ${F.cond}`;g.textAlign='center';spaced(g,'',1);ls.forEach((t,j)=>g.fillText(t,mx(W-125,0),(ls.length>1?136:146)+j*18));spaced(g,'',0);g.textAlign='left';}
    g.font=`italic 700 ${15*k}px ${F.disp}`;g.fillStyle='#1f1530';
    const qx=side==='r'?px+pw+16:16,qw=side==='r'?W-qx-40:px-32;
    g.fillText(look.kicker+'.',qx,200);g.font=`italic 600 ${14*k}px ${F.disp}`;wrap(g,look.blurb,qx,230,qw,19*k);
    const cw=395,cx=mx(side==='r'?210:36,cw);
    drawReceiptCard(g,look,cx,528,cw,290,k);
  }
  folio();
  return {c,hs};
}
function drawIssueFace(m,i,RW,RH){
  if(i===0)return {c:drawIssueCover(m,RW,RH),hs:[]};
  const SC=RW/640,W=640,H=845;
  if(i>=2&&i<=12)return drawLookFace(m,i,W,H,SC);
  const c=mk(RW,RH),g=c.getContext('2d');g.scale(SC,SC);const k=1,hs=[];g.textBaseline='alphabetic';g.textAlign='left';
  if(i===1){
    g.fillStyle=CREAM;g.fillRect(0,0,W,H);
    g.fillStyle=MINT;g.beginPath();g.moveTo(W-230,0);g.lineTo(W,0);g.lineTo(W,170);g.closePath();g.fill();
    g.fillStyle=PINK;g.beginPath();g.arc(0,H,130,-Math.PI/2,0);g.lineTo(0,H);g.fill();
    g.fillStyle=ORG;g.font=`700 ${12*k}px ${F.body}`;spaced(g,'',2);g.fillText("EDITOR'S NOTE",44,78);spaced(g,'',0);
    g.fillStyle=INK;g.font=`700 ${52*k}px ${F.disp}`;g.fillText('Find your',44,142);g.fillText('kind of style.',44,198);
    g.font=`600 ${16*k}px ${F.disp}`;g.fillStyle='#1f1410';let y=240;
    ['There is no single way to dress well. There is yours. This first issue of Lukks is eleven real outfits from real wardrobes, from a lilac cape gown to a campus tee, and every one of them comes with a receipt.',
     'We would rather show you the price than hide it. Style is not about spending the most. It is about wearing what you own, again and again, and still looking like you meant it.',
     'Tap any look to see how it is put together, what it cost and what it costs each time it is worn. Then show us yours.'].forEach(p=>{y=wrap(g,p,44,y,W-88,23*k)+8;});
    g.fillStyle=ORG;g.font=`italic 600 ${18*k}px ${F.disp}`;g.fillText('The Editors',44,y+14);
    g.fillStyle=INK;g.font=`700 ${12*k}px ${F.body}`;spaced(g,'',2);g.fillText('INSIDE',44,y+56);spaced(g,'',0);
    const items=[['03','The cover story','Lilac Cloud'],['04','The Wedding Guest','Blush Senator, Cowrie Season'],['06','Soft Statements','Patchwork Sunday'],['07','Drip Gang','Homme Season, Twenty-Three, Stripe Heat'],['10','Everyday Style','Sky Day, Headphones On'],['12','After Dark','Bar Seat Leather, The Reading Room']];
    let yy=y+80;items.forEach(r=>{g.fillStyle=ORG;g.font=`700 ${13*k}px ${F.body}`;g.fillText(r[0],44,yy);g.fillStyle=INK;g.font=`700 ${13*k}px ${F.body}`;g.fillText(r[1],84,yy);g.font=`600 ${11.5*k}px ${F.body}`;g.fillStyle='#3d2f27';g.fillText(r[2],84,yy+14);yy+=34;});
    g.fillStyle='rgba(0,0,0,.45)';g.font=`600 ${11*k}px ${F.body}`;g.fillText('2   LUKKS · ISSUE 01',30*k,H-14*k);
    return {c,hs};
  }
  // back page: how to be in the next issue
  g.fillStyle=LAV;g.fillRect(0,0,W,H);
  g.fillStyle=MINT;g.beginPath();g.moveTo(W/2-150,330);g.lineTo(W/2+150,330);g.lineTo(W/2,70);g.closePath();g.fill();
  g.fillStyle=PINK;g.beginPath();g.arc(W/2,H,230,Math.PI,0);g.fill();
  g.textAlign='center';g.fillStyle=INK;g.font=`400 ${64*k}px ${F.cond}`;g.fillText('BE IN THE',W/2,210);g.fillText('NEXT ISSUE',W/2,268);
  g.font=`700 ${15.5*k}px ${F.body}`;g.fillStyle='#1f1530';
  ['Post a lukk with its receipt in the Lukks app,','then choose "Feature in the magazine".','You can send up to two looks.','Approval is not guaranteed.'].forEach((t,j)=>g.fillText(t,W/2,400+j*26));
  g.font=`italic 600 ${20*k}px ${F.disp}`;g.fillStyle=INK;g.fillText('Find your kind of style.',W/2,H-210);
  barcode(g,W/2-70,H-170,140,80);g.font=`600 ${12*k}px ${F.body}`;g.fillStyle=INK;g.fillText('LUKKS',W/2,H-60);
  return {c,hs};
}
