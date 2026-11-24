/* ---------- the OpenWalls house gallery: white walls, marble floor, LED track lights, framed art, plinths and wall instruments.
   Used when a room's theme has house:true. Everything is drawn from primitives and canvases: nothing is downloaded. ---------- */
(function(){
const T=THREE,P=OWRoom.prototype,PI=Math.PI,M=(c,r,m)=>OW.mat(c,r,m);
OW.THEMES.gallery={name:'OpenWalls Gallery',wall:'#f7f6f2',floor:'#464952',trim:'#ffffff',ceil:'#2b2b30',rug:['#fff','#fff','#fff']};
OW.GALLERY={w:9,d:13,h:3.7};
const box=(g,w,h,d,mat,x,y,z,cast)=>{const m=new T.Mesh(new T.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);m.castShadow=!!cast;m.receiveShadow=true;g.add(m);return m;};
const cyl=(g,rt,rb,h,mat,x,y,z,seg)=>{const m=new T.Mesh(new T.CylinderGeometry(rt,rb,h,seg||20),mat);m.position.set(x,y,z);m.castShadow=false;m.receiveShadow=true;g.add(m);return m;};
const glowM=(c,i)=>new T.MeshStandardMaterial({color:c,emissive:c,emissiveIntensity:i||1.4});

/* ----- marble floor ----- */
function marble(W,D){
  const c=OW.canvas(512,512),g=c.getContext('2d');g.fillStyle='#464952';g.fillRect(0,0,512,512);
  let s=7;const rnd=()=>(s=(s*16807)%2147483647)/2147483647;
  for(let i=0;i<46;i++){let x=rnd()*512,y=rnd()*512,a=rnd()*6.28;g.strokeStyle='rgba('+(190+rnd()*50|0)+','+(190+rnd()*50|0)+','+(195+rnd()*50|0)+','+(.05+rnd()*.17)+')';g.lineWidth=.7+rnd()*2.6;g.beginPath();g.moveTo(x,y);
    for(let k=0;k<14;k++){a+=(rnd()-.5)*1.1;x+=Math.cos(a)*(14+rnd()*26);y+=Math.sin(a)*(14+rnd()*26);g.lineTo(x,y);}g.stroke();}
  for(let i=0;i<70;i++){g.fillStyle='rgba(255,255,255,'+(.015+rnd()*.035)+')';g.beginPath();g.arc(rnd()*512,rnd()*512,6+rnd()*30,0,7);g.fill();}
  g.strokeStyle='rgba(15,15,20,.7)';g.lineWidth=2;g.strokeRect(1,1,510,510);
  return OW.tex(c,[W/1.6,D/1.6]);}

/* ----- original African-inspired artworks, drawn in code ----- */
const ART={
  adire(g,w,h){g.fillStyle='#14246b';g.fillRect(0,0,w,h);
    const rnd=(()=>{let s=3;return()=>(s=(s*16807)%2147483647)/2147483647;})();
    for(let i=0;i<900;i++){g.fillStyle='rgba('+(rnd()<.5?'30,50,130':'10,20,70')+','+(.1+rnd()*.15)+')';g.fillRect(rnd()*w,rnd()*h,2+rnd()*8,1+rnd()*2);}
    g.strokeStyle='#eaf0ff';g.lineCap='round';
    for(let i=0;i<4;i++)for(let j=0;j<5;j++){const x=50+i*100,y=52+j*98;g.lineWidth=4;for(let r=38;r>4;r-=9){g.globalAlpha=.9-(r<10?.2:0);g.beginPath();g.arc(x+(rnd()-.5)*3,y+(rnd()-.5)*3,r,0,7);g.stroke();}
      g.globalAlpha=.8;g.lineWidth=3;for(let k=0;k<8;k++){const a=k/8*6.28;g.beginPath();g.moveTo(x+Math.cos(a)*42,y+Math.sin(a)*42);g.lineTo(x+Math.cos(a)*54,y+Math.sin(a)*54);g.stroke();}}
    g.globalAlpha=1;g.lineWidth=3;for(let i=0;i<9;i++){g.beginPath();g.moveTo(0,i*58+6);for(let x=0;x<=w;x+=20)g.lineTo(x,i*58+6+((x/20)%2?7:-7));g.stroke();}},
  ankara(g,w,h){const cols=['#ff7a1a','#0d7a74','#ffd23f','#b3203a','#1b1b3a'];g.fillStyle='#fff4dc';g.fillRect(0,0,w,h);
    for(let j=0;j<7;j++)for(let i=0;i<5;i++){const x=i*86,y=j*86+((i%2)?43:0)-20;g.fillStyle=cols[(i+j)%5];g.beginPath();g.moveTo(x,y+86);g.lineTo(x+43,y);g.lineTo(x+86,y+86);g.closePath();g.fill();g.fillStyle=cols[(i+j+2)%5];g.beginPath();g.arc(x+43,y+58,13,0,7);g.fill();g.fillStyle='#fff4dc';g.beginPath();g.arc(x+43,y+58,5,0,7);g.fill();}},
  danfo(g,w,h){
    const sky=g.createLinearGradient(0,0,0,h*.62);sky.addColorStop(0,'#2a1a4a');sky.addColorStop(.45,'#d9503a');sky.addColorStop(1,'#ffb347');g.fillStyle=sky;g.fillRect(0,0,w,h);
    g.fillStyle='#fff1b8';g.beginPath();g.arc(w*.72,h*.36,46,0,7);g.fill();g.fillStyle='rgba(255,241,184,.25)';g.beginPath();g.arc(w*.72,h*.36,74,0,7);g.fill();
    const sk=[[8,.32,40],[52,.22,34],[90,.4,44],[140,.27,38],[184,.35,42],[232,.2,34],[270,.38,46],[322,.26,40],[366,.3,34]];
    g.fillStyle='#2b1c3a';sk.forEach(([x,k,ww])=>g.fillRect(x,h*.62-h*k,ww,h*k));g.fillStyle='rgba(255,205,110,.85)';sk.forEach(([x,k,ww])=>{for(let y=h*.62-h*k+10;y<h*.62-8;y+=16)for(let xx=x+6;xx<x+ww-6;xx+=12)if(((xx*7+y*3)|0)%3)g.fillRect(xx,y,5,6);});
    g.fillStyle='#1a1a22';g.fillRect(0,h*.62,w,h*.38);g.fillStyle='rgba(255,255,255,.55)';for(let i=0;i<5;i++)g.fillRect(w*.5-3+(i-2)*.0,h*.66+i*i*10+i*8,6+i*5,3+i*2);
    const bx=60,by=h*.66;
    g.fillStyle='rgba(0,0,0,.4)';g.beginPath();g.ellipse(bx+150,by+158,150,14,0,0,7);g.fill();
    g.fillStyle='#f6c20d';g.beginPath();g.moveTo(bx,by+40);g.lineTo(bx+6,by+4);g.quadraticCurveTo(bx+10,by-6,bx+24,by-6);g.lineTo(bx+236,by-6);g.quadraticCurveTo(bx+262,by-4,bx+272,by+22);g.lineTo(bx+290,by+52);g.lineTo(bx+292,by+130);g.lineTo(bx,by+130);g.closePath();g.fill();
    g.fillStyle='#111';g.fillRect(bx,by+78,292,22);g.fillStyle='#f6c20d';g.font='700 15px system-ui,sans-serif';g.textBaseline='middle';g.fillText('OSHODI – YABA',bx+18,by+89);
    g.fillStyle='#bfe0f2';[[18,0],[78,0],[138,0],[198,0]].forEach(([x])=>g.fillRect(bx+x,by+8,50,40));g.beginPath();g.moveTo(bx+248,by+8);g.lineTo(bx+262,by+8);g.lineTo(bx+278,by+48);g.lineTo(bx+248,by+48);g.fill();
    g.fillStyle='rgba(255,255,255,.35)';[[18,0],[78,0],[138,0],[198,0]].forEach(([x])=>g.fillRect(bx+x+4,by+10,10,34));
    g.fillStyle='#e8e8ea';g.fillRect(bx+270,by+104,22,14);g.fillStyle='#fff6c8';g.beginPath();g.arc(bx+284,by+66,9,0,7);g.fill();g.fillStyle='#d0d0d4';g.fillRect(bx-4,by+118,300,10);
    [[62],[236]].forEach(([x])=>{g.fillStyle='#0b0b0d';g.beginPath();g.arc(bx+x,by+132,30,0,7);g.fill();g.fillStyle='#b9bcc2';g.beginPath();g.arc(bx+x,by+132,15,0,7);g.fill();g.fillStyle='#777';g.beginPath();g.arc(bx+x,by+132,5,0,7);g.fill();});
    g.fillStyle='#ffffff';g.fillRect(bx+120,by+104,60,16);g.fillStyle='#222';g.font='700 10px system-ui,sans-serif';g.fillText('LAGOS 4EVA',bx+124,by+112);},
  gele(g,w,h){
    const bg=g.createLinearGradient(0,0,0,h);bg.addColorStop(0,'#f6e3c4');bg.addColorStop(1,'#e8bd8a');g.fillStyle=bg;g.fillRect(0,0,w,h);
    g.fillStyle='rgba(180,90,40,.12)';for(let i=0;i<6;i++){g.beginPath();g.arc(30+i*72,470,60,0,7);g.fill();}
    /* dress: ankara print shoulders */
    const dr=g.createLinearGradient(0,330,0,h);dr.addColorStop(0,'#0f7a6e');dr.addColorStop(1,'#0a4f4a');g.fillStyle=dr;g.beginPath();g.moveTo(18,h);g.quadraticCurveTo(24,380,128,350);g.lineTo(272,350);g.quadraticCurveTo(376,380,382,h);g.closePath();g.fill();
    g.fillStyle='#ffd23f';for(let y=372;y<h;y+=34)for(let x=40+((y/34|0)%2)*20;x<370;x+=40){if(x>150&&x<250&&y<420)continue;g.beginPath();g.arc(x,y,6,0,7);g.fill();g.fillStyle='#ff7a1a';g.beginPath();g.arc(x,y,2.5,0,7);g.fill();g.fillStyle='#ffd23f';}
    /* neck and collar */
    const sk=g.createLinearGradient(150,0,260,0);sk.addColorStop(0,'#3a1d12');sk.addColorStop(.5,'#5a3020');sk.addColorStop(1,'#3a1d12');g.fillStyle=sk;g.beginPath();g.moveTo(168,300);g.lineTo(168,356);g.quadraticCurveTo(200,392,232,356);g.lineTo(232,300);g.closePath();g.fill();
    g.strokeStyle='#e5c15a';g.lineWidth=5;g.beginPath();g.arc(200,350,36,.15,Math.PI-.15);g.stroke();for(let i=0;i<9;i++){const a=.3+i*.28;g.fillStyle='#ffd23f';g.beginPath();g.arc(200+Math.cos(a)*36,350+Math.sin(a)*36,4.5,0,7);g.fill();}
    /* face */
    const fc=g.createRadialGradient(188,250,10,200,262,96);fc.addColorStop(0,'#7a4630');fc.addColorStop(.7,'#5e3322');fc.addColorStop(1,'#42210f');g.fillStyle=fc;g.beginPath();g.ellipse(200,262,70,92,0,0,7);g.fill();
    g.fillStyle='rgba(255,210,170,.16)';g.beginPath();g.ellipse(186,236,26,34,-.3,0,7);g.fill();g.fillStyle='rgba(20,5,0,.22)';g.beginPath();g.ellipse(250,268,16,60,0,0,7);g.fill();
    /* ears + earrings */
    g.fillStyle='#4f2a1a';[[128,268],[272,268]].forEach(([x,y])=>{g.beginPath();g.ellipse(x,y,10,18,0,0,7);g.fill();});g.strokeStyle='#e5c15a';g.lineWidth=4;[[128,292],[272,292]].forEach(([x,y])=>{g.beginPath();g.arc(x,y+14,15,0,7);g.stroke();});
    /* eyes */
    [[170,250,1],[230,250,-1]].forEach(([x,y,s])=>{g.fillStyle='#f6efe4';g.beginPath();g.ellipse(x,y,17,8.5,0,0,7);g.fill();g.fillStyle='#2a140a';g.beginPath();g.arc(x,y+.5,7.2,0,7);g.fill();g.fillStyle='#000';g.beginPath();g.arc(x,y+.5,3.6,0,7);g.fill();g.fillStyle='#fff';g.beginPath();g.arc(x+2.5,y-2,1.8,0,7);g.fill();
      g.strokeStyle='#120804';g.lineWidth=3;g.beginPath();g.moveTo(x-18,y+1);g.quadraticCurveTo(x,y-14,x+18,y+1);g.stroke();g.lineWidth=2;for(let k=0;k<5;k++){g.beginPath();g.moveTo(x+s*(-14+k*7)*-1,y-8);g.lineTo(x+s*(-14+k*7)*-1+s*2,y-13);g.stroke();}
      g.strokeStyle='#1c0e07';g.lineWidth=5;g.lineCap='round';g.beginPath();g.moveTo(x-20,y-20);g.quadraticCurveTo(x,y-31,x+20,y-19);g.stroke();});
    /* nose + lips */
    g.strokeStyle='rgba(20,5,0,.35)';g.lineWidth=3;g.beginPath();g.moveTo(194,262);g.quadraticCurveTo(190,288,184,296);g.quadraticCurveTo(200,306,216,296);g.stroke();g.fillStyle='rgba(255,200,160,.18)';g.beginPath();g.ellipse(196,280,5,14,0,0,7);g.fill();
    g.fillStyle='#8a1b2c';g.beginPath();g.moveTo(170,322);g.quadraticCurveTo(186,312,200,318);g.quadraticCurveTo(214,312,230,322);g.quadraticCurveTo(200,346,170,322);g.fill();g.fillStyle='#b8334a';g.beginPath();g.moveTo(176,322);g.quadraticCurveTo(200,314,224,322);g.quadraticCurveTo(200,328,176,322);g.fill();g.fillStyle='rgba(255,255,255,.4)';g.beginPath();g.ellipse(206,333,8,2.5,0,0,7);g.fill();
    /* gele: big folded headwrap */
    const folds=[[-.55,-30,'#7a2fa8','#c58cff'],[.5,-34,'#a8266f','#ff7ab6'],[-.15,-60,'#e0a21a','#ffe07a'],[.2,-6,'#5b2390','#a35de0'],[-.7,10,'#e0a21a','#ffd45a'],[.75,14,'#7a2fa8','#c58cff']];
    folds.forEach(([r,dy,c1,c2],i)=>{g.save();g.translate(200+r*80,150+dy);g.rotate(r*.7);const gr=g.createLinearGradient(-110,-40,110,40);gr.addColorStop(0,c1);gr.addColorStop(.5,c2);gr.addColorStop(1,c1);g.fillStyle=gr;g.beginPath();g.moveTo(-110,10);g.bezierCurveTo(-120,-60,-40,-90,20,-70);g.bezierCurveTo(100,-60,130,-10,100,36);g.bezierCurveTo(60,60,-60,60,-110,10);g.fill();
      g.strokeStyle='rgba(255,255,255,.22)';g.lineWidth=3;for(let k=-3;k<=3;k++){g.beginPath();g.moveTo(-90+k*4,10+k*5);g.bezierCurveTo(-40,-30+k*3,30,-40+k*3,90,10+k*4);g.stroke();}g.restore();});
    g.fillStyle='#e0a21a';g.beginPath();g.ellipse(200,232,86,14,0,Math.PI,0);g.fill();g.fillStyle='rgba(0,0,0,.18)';g.beginPath();g.ellipse(200,236,82,8,0,0,Math.PI);g.fill();
    g.fillStyle='#ffe07a';[[136,150],[262,118],[226,70],[150,98]].forEach(([x,y])=>{g.beginPath();g.arc(x,y,5,0,7);g.fill();});},
  aso(g,w,h){const cols=['#b3203a','#ffd23f','#0d7a74','#1b1b3a','#ff7a1a','#f4efe2'];for(let i=0;i<10;i++){g.fillStyle=cols[i%6];g.fillRect(i*w/10,0,w/10+1,h);}
    for(let j=0;j<12;j++){g.fillStyle=cols[(j*2+1)%6];g.globalAlpha=.85;g.fillRect(0,j*h/12,w,h/48);g.globalAlpha=1;}
    g.strokeStyle='rgba(255,255,255,.6)';g.lineWidth=3;for(let j=0;j<6;j++){g.beginPath();g.moveTo(0,j*84+30);for(let x=0;x<=w;x+=20)g.lineTo(x,j*84+30+((x/20)%2?14:-14));g.stroke();}
    g.strokeStyle='rgba(0,0,0,.08)';g.lineWidth=1;for(let y=0;y<h;y+=3){g.beginPath();g.moveTo(0,y);g.lineTo(w,y);g.stroke();}},
  drum(g,w,h){
    const sky=g.createLinearGradient(0,0,0,h);sky.addColorStop(0,'#f08a24');sky.addColorStop(.55,'#f5c542');sky.addColorStop(1,'#1d5a6a');g.fillStyle=sky;g.fillRect(0,0,w,h);
    g.fillStyle='#fff3c8';g.beginPath();g.arc(w*.5,h*.5,140,0,7);g.fill();g.fillStyle='rgba(255,243,200,.35)';g.beginPath();g.arc(w*.5,h*.5,176,0,7);g.fill();
    g.fillStyle='#164a58';g.fillRect(0,h*.78,w,h*.22);g.fillStyle='rgba(255,243,200,.5)';for(let i=0;i<7;i++)g.fillRect(w*.5-60+i*4-i*i*1.5,h*.8+i*13,120-i*8+i*i*3,3);
    /* drummer silhouette with a talking drum */
    g.fillStyle='#120b10';g.beginPath();g.ellipse(190,196,28,32,0,0,7);g.fill();
    g.beginPath();g.moveTo(150,240);g.quadraticCurveTo(190,226,236,244);g.lineTo(250,340);g.lineTo(240,mathMax(h*.78,380));g.lineTo(150,mathMax(h*.78,380));g.lineTo(138,330);g.closePath();g.fill();
    g.beginPath();g.moveTo(150,236);g.lineTo(120,310);g.lineTo(138,318);g.lineTo(170,262);g.fill();
    g.beginPath();g.moveTo(236,244);g.quadraticCurveTo(290,270,300,330);g.lineTo(284,336);g.quadraticCurveTo(268,290,226,274);g.fill();
    g.fillStyle='#1c1218';g.beginPath();g.moveTo(106,318);g.quadraticCurveTo(94,350,106,384);g.lineTo(150,384);g.quadraticCurveTo(162,350,150,318);g.quadraticCurveTo(128,330,106,318);g.fill();
    g.strokeStyle='#f5c542';g.lineWidth=3;for(let i=0;i<5;i++){g.beginPath();g.moveTo(108+i*9,320);g.lineTo(124+(i-2)*2,384);g.stroke();}
    g.strokeStyle='#120b10';g.lineWidth=6;g.lineCap='round';g.beginPath();g.moveTo(296,330);g.quadraticCurveTo(330,300,320,262);g.stroke();g.fillStyle='#120b10';g.beginPath();g.arc(320,260,9,0,7);g.fill();
    g.fillStyle='#e8d6a8';g.beginPath();g.ellipse(128,318,24,7,0,0,7);g.fill();
    g.fillStyle='#120b10';g.beginPath();g.ellipse(170,170,16,10,.2,0,7);g.fill();},
  /* ---- new works: original, Nigerian / African subjects ---- */
  uli(g,w,h){g.fillStyle='#d8a24a';g.fillRect(0,0,w,h);g.fillStyle='#c4862f';g.fillRect(0,0,w,h*.06);g.fillRect(0,h*.94,w,h*.06);
    g.strokeStyle='#1a120c';g.fillStyle='#1a120c';g.lineCap='round';g.lineWidth=5;
    const leaf=(x,y,a,l)=>{g.save();g.translate(x,y);g.rotate(a);g.beginPath();g.moveTo(0,0);g.quadraticCurveTo(l*.5,-l*.28,l,0);g.quadraticCurveTo(l*.5,l*.28,0,0);g.fill();g.restore();};
    const spiral=(x,y,r,t)=>{g.lineWidth=4;g.beginPath();for(let a=0;a<t*6.28;a+=.15){const rr=r*(a/(t*6.28));const px=x+Math.cos(a)*rr,py=y+Math.sin(a)*rr;a?g.lineTo(px,py):g.moveTo(px,py);}g.stroke();};
    g.lineWidth=4;g.beginPath();g.moveTo(w*.5,h*.1);g.bezierCurveTo(w*.2,h*.3,w*.8,h*.5,w*.5,h*.9);g.stroke();
    for(let i=0;i<9;i++){const t=.1+i*.1,y=h*(.1+t*.8),x=w*.5+Math.sin(t*9)*52;leaf(x,y,-.3-(i%2)*2.5,48);leaf(x,y,.3+(i%2)*-.2+(i%2?2.6:0),40);}
    spiral(w*.2,h*.22,38,2.5);spiral(w*.8,h*.22,38,2.5);spiral(w*.2,h*.78,38,2.5);spiral(w*.8,h*.78,38,2.5);
    for(let i=0;i<8;i++){g.beginPath();g.arc(30+i*48,h*.035,6,0,7);g.fill();g.beginPath();g.arc(30+i*48,h*.965,6,0,7);g.fill();}
    g.lineWidth=3;g.strokeStyle='#7a4a16';for(let k=0;k<3;k++){g.beginPath();g.arc(w*.5,h*.5,60+k*10,0,7);g.stroke();}
    g.fillStyle='#1a120c';g.beginPath();g.arc(w*.5,h*.5,20,0,7);g.fill();},
  zuma(g,w,h){const sk=g.createLinearGradient(0,0,0,h);sk.addColorStop(0,'#7a2a55');sk.addColorStop(.35,'#e0562e');sk.addColorStop(.62,'#ffb347');sk.addColorStop(1,'#ffe3a0');g.fillStyle=sk;g.fillRect(0,0,w,h);
    g.fillStyle='#ffe9b0';g.beginPath();g.arc(w*.72,h*.42,52,0,7);g.fill();g.fillStyle='rgba(255,233,176,.28)';g.beginPath();g.arc(w*.72,h*.42,82,0,7);g.fill();
    g.fillStyle='#3b1a26';g.beginPath();g.moveTo(40,h*.72);g.bezierCurveTo(70,h*.5,90,h*.3,130,h*.2);g.bezierCurveTo(165,h*.13,215,h*.14,244,h*.24);g.bezierCurveTo(274,h*.34,296,h*.52,330,h*.72);g.closePath();g.fill();
    g.strokeStyle='rgba(255,170,90,.35)';g.lineWidth=3;for(let i=0;i<7;i++){g.beginPath();g.moveTo(120+i*22,h*.2+Math.abs(i-3)*8);g.lineTo(100+i*30,h*.7);g.stroke();}
    g.fillStyle='#4a2a18';g.fillRect(0,h*.72,w,h*.28);g.fillStyle='#2a1810';for(let i=0;i<40;i++)g.fillRect((i*47)%w,h*.74+(i*13)%90,22,3);
    const palm=(x,y,s)=>{g.strokeStyle='#150b0e';g.lineWidth=5*s;g.beginPath();g.moveTo(x,y);g.quadraticCurveTo(x+14*s,y-70*s,x+4*s,y-130*s);g.stroke();for(let a=-2;a<=2;a++){g.lineWidth=3*s;g.beginPath();g.moveTo(x+4*s,y-130*s);g.quadraticCurveTo(x+4*s+a*28*s,y-160*s+Math.abs(a)*14*s,x+4*s+a*48*s,y-120*s+Math.abs(a)*18*s);g.stroke();}};
    palm(340,h*.82,1.2);palm(60,h*.88,1);g.fillStyle='#150b0e';[[200,h*.8],[250,h*.85]].forEach(([x,y])=>{g.beginPath();g.ellipse(x,y,16,7,0,0,7);g.fill();});},
  bridge(g,w,h){const sk=g.createLinearGradient(0,0,0,h*.62);sk.addColorStop(0,'#1d2a6b');sk.addColorStop(.5,'#c2467a');sk.addColorStop(1,'#ffb25a');g.fillStyle=sk;g.fillRect(0,0,w,h);
    g.fillStyle='#ffe2a0';g.beginPath();g.arc(w*.3,h*.52,44,0,7);g.fill();
    const wt=g.createLinearGradient(0,h*.62,0,h);wt.addColorStop(0,'#e9964a');wt.addColorStop(.3,'#8b3a6a');wt.addColorStop(1,'#141c4a');g.fillStyle=wt;g.fillRect(0,h*.62,w,h*.38);
    g.fillStyle='rgba(255,226,160,.5)';for(let i=0;i<9;i++)g.fillRect(w*.3-40+i*3-Math.abs(i-4)*3,h*.64+i*11,80-i*3,3);
    g.fillStyle='#121530';[[20,40,.62],[80,55,.62],[300,50,.62],[345,64,.62]].forEach(([x,bw,y])=>{g.fillRect(x,h*y-(bw*2.2),bw*.6,bw*2.2);});
    for(let i=0;i<30;i++){g.fillStyle='rgba(255,220,130,.8)';g.fillRect(24+(i%3)*14+(i>15?280:0),h*.62-100+((i*17)%90),4,5);}
    g.strokeStyle='#121530';g.lineWidth=7;g.beginPath();g.moveTo(0,h*.66);g.lineTo(w,h*.66);g.stroke();g.lineWidth=2;g.beginPath();g.moveTo(0,h*.66+10);g.lineTo(w,h*.66+10);g.stroke();for(let x=10;x<w;x+=34){g.beginPath();g.moveTo(x,h*.66);g.lineTo(x,h*.66+10);g.stroke();}
    [[110],[290]].forEach(([x])=>{g.lineWidth=7;g.beginPath();g.moveTo(x,h*.66);g.lineTo(x,h*.45);g.stroke();g.lineWidth=1.5;for(let k=-5;k<=5;k++){g.beginPath();g.moveTo(x,h*.45+Math.abs(k)*0);g.lineTo(x+k*26,h*.66);g.stroke();}});
    g.fillStyle='#0b0d22';[[170,h*.78,90],[250,h*.86,70],[90,h*.9,60]].forEach(([x,y,l])=>{g.beginPath();g.moveTo(x-l/2,y);g.quadraticCurveTo(x,y+14,x+l/2,y);g.quadraticCurveTo(x+l/2+8,y-8,x+l/2+14,y-14);g.lineTo(x-l/2-10,y-12);g.closePath();g.fill();g.fillRect(x-1,y-48,2,36);});},
  eyo(g,w,h){const bg=g.createLinearGradient(0,0,0,h);bg.addColorStop(0,'#10102a');bg.addColorStop(1,'#3b1a4a');g.fillStyle=bg;g.fillRect(0,0,w,h);
    g.fillStyle='#e8963c';g.beginPath();g.arc(w*.5,h*.45,150,0,7);g.fill();g.fillStyle='#f3b15c';g.beginPath();g.arc(w*.5,h*.45,118,0,7);g.fill();
    g.fillStyle='#f6f1e4';g.beginPath();g.moveTo(w*.5-70,h*.36);g.quadraticCurveTo(w*.5-130,h*.7,w*.5-120,h*.93);g.lineTo(w*.5+120,h*.93);g.quadraticCurveTo(w*.5+130,h*.7,w*.5+70,h*.36);g.closePath();g.fill();
    g.fillStyle='#ddd5c0';for(let i=0;i<6;i++){g.beginPath();g.moveTo(w*.5-90+i*36,h*.5);g.quadraticCurveTo(w*.5-96+i*36,h*.7,w*.5-100+i*36,h*.93);g.lineTo(w*.5-90+i*36+10,h*.93);g.quadraticCurveTo(w*.5-86+i*36,h*.7,w*.5-90+i*36+6,h*.5);g.fill();}
    g.fillStyle='#f6f1e4';g.beginPath();g.moveTo(w*.5-74,h*.37);g.quadraticCurveTo(w*.5,h*.31,w*.5+74,h*.37);g.lineTo(w*.5+64,h*.45);g.quadraticCurveTo(w*.5,h*.4,w*.5-64,h*.45);g.closePath();g.fill();
    g.fillStyle='#1b1b3a';g.beginPath();g.moveTo(w*.5-82,h*.2);g.lineTo(w*.5-48,h*.07);g.quadraticCurveTo(w*.5,h*.0,w*.5+48,h*.07);g.lineTo(w*.5+82,h*.2);g.quadraticCurveTo(w*.5,h*.26,w*.5-82,h*.2);g.fill();
    g.fillStyle='#f6f1e4';g.beginPath();g.ellipse(w*.5,h*.27,60,34,0,0,7);g.fill();g.fillStyle='#1b1b3a';g.fillRect(w*.5-30,h*.255,16,5);g.fillRect(w*.5+14,h*.255,16,5);
    g.fillStyle='#ffd23f';g.fillRect(w*.5-82,h*.2,164,7);g.fillStyle='#0d7a74';g.fillRect(w*.5-74,h*.215,148,5);
    g.strokeStyle='#d9a441';g.lineWidth=6;g.beginPath();g.moveTo(w*.5+104,h*.6);g.lineTo(w*.5+104,h*.9);g.stroke();g.fillStyle='#d9a441';g.beginPath();g.arc(w*.5+104,h*.58,12,0,7);g.fill();
    g.fillStyle='#0b0b1c';g.fillRect(0,h*.93,w,h*.07);},
  lagoon(g,w,h){const sk=g.createLinearGradient(0,0,0,h*.55);sk.addColorStop(0,'#3a8aa8');sk.addColorStop(.6,'#f6d27a');sk.addColorStop(1,'#fff0c0');g.fillStyle=sk;g.fillRect(0,0,w,h);
    g.fillStyle='#fff6d0';g.beginPath();g.arc(w*.5,h*.5,60,0,7);g.fill();
    const wt=g.createLinearGradient(0,h*.55,0,h);wt.addColorStop(0,'#e7c06a');wt.addColorStop(.25,'#2f8a8e');wt.addColorStop(1,'#0e3b4e');g.fillStyle=wt;g.fillRect(0,h*.55,w,h*.45);
    g.strokeStyle='rgba(255,255,255,.35)';g.lineWidth=2;for(let i=0;i<14;i++){const y=h*.6+i*15;g.beginPath();g.moveTo(10+(i*53)%80,y);g.quadraticCurveTo(60+(i*53)%80,y-5,110+(i*53)%80,y);g.moveTo(230+(i*31)%70,y+5);g.quadraticCurveTo(270+(i*31)%70,y,310+(i*31)%70,y+5);g.stroke();}
    /* stilt houses */
    const house=(x,y,s)=>{g.fillStyle='#3a2415';for(let k=0;k<4;k++)g.fillRect(x+k*14*s,y,3*s,34*s);g.fillStyle='#5a3a22';g.fillRect(x-4*s,y-3*s,64*s,5*s);g.fillStyle='#7a4a2a';g.fillRect(x,y-34*s,56*s,31*s);g.fillStyle='#2a1a10';g.beginPath();g.moveTo(x-8*s,y-34*s);g.lineTo(x+28*s,y-58*s);g.lineTo(x+64*s,y-34*s);g.closePath();g.fill();g.fillStyle='#ffd23f';g.fillRect(x+10*s,y-26*s,10*s,10*s);g.fillStyle='#0d7a74';g.fillRect(x+34*s,y-26*s,12*s,22*s);};
    house(40,h*.66,1.2);house(250,h*.64,1);house(150,h*.6,.7);
    /* canoe with a fisher and a net */
    g.fillStyle='#1a0f08';g.beginPath();g.moveTo(90,h*.84);g.quadraticCurveTo(190,h*.9,300,h*.82);g.quadraticCurveTo(300,h*.86,284,h*.87);g.quadraticCurveTo(190,h*.93,100,h*.88);g.closePath();g.fill();
    g.fillStyle='#120b10';g.beginPath();g.ellipse(188,h*.74,14,16,0,0,7);g.fill();g.beginPath();g.moveTo(170,h*.78);g.quadraticCurveTo(188,h*.75,208,h*.78);g.lineTo(212,h*.84);g.lineTo(166,h*.85);g.fill();
    g.strokeStyle='#120b10';g.lineWidth=4;g.beginPath();g.moveTo(206,h*.78);g.lineTo(290,h*.66);g.stroke();g.lineWidth=1.5;g.strokeStyle='#120b10';for(let i=0;i<6;i++){g.beginPath();g.moveTo(290,h*.66);g.lineTo(240+i*20,h*.8);g.stroke();}},

};
function mathMax(a,b){return Math.max(a,b);}
const artCache={};
const PHOTO=['zuma','bridge','eyo','lagoon','uli'];let curRoom=null;
function artTex(k){
  if(artCache[k])return artCache[k];const c=OW.canvas(400,500),g=c.getContext('2d');
  if(ART[k])ART[k](g,400,500);else{g.fillStyle='#ccc';g.fillRect(0,0,400,500);}
  const tex=OW.tex(c);
  if(PHOTO.includes(k)){const im=new Image();im.onload=()=>{tex.image=im;tex.needsUpdate=true;if(curRoom&&curRoom.markDirty)curRoom.markDirty(true);};im.src='assets/gallery/'+k+'.jpg';}
  return artCache[k]=tex;}

OW.artCanvases=function(){return['adire','ankara','danfo','gele','aso','drum','uli','zuma','bridge','eyo','lagoon'].map(k=>{const c=OW.canvas(400,500);ART[k](c.getContext('2d'),400,500);return c;});};
/* a framed picture on a wall; n = wall normal axis */
function frame(g,k,x,y,z,ry,w,h,fm){
  const grp=new T.Group();grp.position.set(x,y,z);grp.rotation.y=ry;
  box(grp,w+.14,h+.14,.07,fm||M('#1a1a1a',.5),0,0,.035,false);box(grp,w+.02,h+.02,.02,M('#fbfaf6',.9),0,0,.075);
  const p=new T.Mesh(new T.PlaneGeometry(w-.1,h-.1),new T.MeshStandardMaterial({map:artTex(k),roughness:.7}));p.userData.own=1;p.position.z=.09;grp.add(p);
  grp.userData.info={kind:'art',key:k};g.add(grp);return grp;}

/* ----- plinth objects, all small and original ----- */
const OBJ=(function(){
  const sphere=(g,r,mat,x,y,z,sx,sy,sz)=>{const m=new T.Mesh(new T.SphereGeometry(r,18,14),mat);m.position.set(x,y,z);m.scale.set(sx||1,sy||1,sz||1);m.castShadow=true;g.add(m);return m;};
  const lathe=(g,pts,mat,x,y,z,seg)=>{const m=new T.Mesh(new T.LatheGeometry(pts.map(p=>new T.Vector2(p[0],p[1])),seg||28),mat);m.position.set(x||0,y||0,z||0);m.castShadow=true;m.receiveShadow=true;g.add(m);return m;};
  const spr=sphere,lat=lathe;const ring=(g,r,tube,mat,x,y,z,rx,ry,rz)=>{const m=new T.Mesh(new T.TorusGeometry(r,tube,8,28),mat);m.position.set(x,y,z);m.rotation.set(rx||0,ry||0,rz||0);g.add(m);return m;};
  const extr=(shape,depth,mat,bev)=>{const m=new T.Mesh(new T.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelSize:bev||.012,bevelThickness:bev||.012,bevelSegments:2,curveSegments:8}),mat);m.castShadow=true;m.receiveShadow=true;return m;};
  const tyre=(g,r,w,x,y,z,ax)=>{const t=new T.Mesh(new T.TorusGeometry(r*.78,r*.24,10,22),M('#0e0e10',.9));t.position.set(x,y,z);if(ax==='x')t.rotation.y=PI/2;g.add(t);t.castShadow=true;const h=cyl(g,r*.55,r*.55,w*.5,M('#b9bcc2',.35,.8),x,y,z,16);if(ax!=='x')h.rotation.x=PI/2;else h.rotation.z=PI/2;};
  const dec2=(w,h,fn)=>{const c=OW.canvas(w,h);fn(c.getContext('2d'),w,h);return OW.tex(c);};
  function decal(w,h,draw){const c=OW.canvas(w,h),g=c.getContext('2d');draw(g,w,h);return OW.tex(c);}
  return{
  danfo(g){
    const yel=M('#f4c20d',.38,.15),blk=M('#121214',.5),glass=new T.MeshStandardMaterial({color:'#1b2a38',roughness:.12,metalness:.6}),chr=M('#c9ccd2',.25,.9);
    const s=new T.Shape();s.moveTo(-.5,.1);s.lineTo(.49,.1);s.quadraticCurveTo(.54,.12,.54,.2);s.lineTo(.5,.27);s.lineTo(.37,.31);s.lineTo(.31,.5);s.quadraticCurveTo(.3,.55,.25,.55);s.lineTo(-.45,.55);s.quadraticCurveTo(-.5,.55,-.5,.5);s.lineTo(-.5,.1);
    const body=extr(s,.34,yel,.014);body.position.z=-.17;g.add(body);
    const stripe=decal(512,64,(c,w,h)=>{c.fillStyle='#111';c.fillRect(0,0,w,h);c.fillStyle='#f4c20d';c.font='700 34px system-ui,sans-serif';c.textBaseline='middle';c.fillText('OSHODI – YABA',14,34);});
    [1,-1].forEach(sd=>{const z=sd*.186;const st=new T.Mesh(new T.PlaneGeometry(.96,.075),new T.MeshStandardMaterial({map:stripe,roughness:.6}));st.position.set(-.02,.27,z);if(sd<0)st.rotation.y=PI;g.add(st);
      [-.4,-.24,-.08,.08,.24].forEach((x,i)=>{const gl=new T.Mesh(new T.PlaneGeometry(.12,.12),glass);gl.position.set(x,.4,z+sd*.002);if(sd<0)gl.rotation.y=PI;g.add(gl);});
      const ws=new T.Mesh(new T.PlaneGeometry(.12,.13),glass);ws.position.set(.37,.4,z+sd*.002);ws.rotation.y=sd<0?PI:0;g.add(ws);
      const dh=box(g,.035,.012,.012,chr,.2,.34,z+sd*.01);box(g,.004,.17,.004,blk,.15,.4,z+sd*.002);});
    const wsf=new T.Mesh(new T.PlaneGeometry(.31,.15),glass);wsf.position.set(.39,.4,0);wsf.rotation.set(0,PI/2,0);wsf.rotation.x=0;const wsq=new T.Mesh(new T.PlaneGeometry(.3,.17),glass);wsq.position.set(.345,.41,0);wsq.rotation.y=PI/2;wsq.rotation.x=-.28;g.add(wsq);
    box(g,.02,.1,.3,blk,.545,.19,0);box(g,.03,.035,.34,chr,.55,.12,0,true);[-1,1].forEach(z=>{sphere(g,.035,M('#fff6dc',.2),.54,.2,z*.12,.5,1,1);box(g,.012,.018,.05,M('#ff9a1a',.4),.54,.14,z*.15);});
    [-1,1].forEach(z=>{box(g,.04,.045,.012,blk,.3,.34,z*.215);});box(g,.03,.03,.34,chr,-.52,.12,0,true);box(g,.04,.025,.1,M('#fff',.5),-.505,.2,0);
    [[-.31,.098],[.32,.098]].forEach(([x])=>[-1,1].forEach(z=>tyre(g,.09,.07,x,.095,z*.18)));
    box(g,.68,.012,.28,M('#222',.4,.6),-.1,.565,0);[-.3,-.1,.1].forEach(x=>box(g,.012,.04,.28,M('#222',.4,.6),x,.58,0));const sack=sphere(g,.07,M('#c9b27a',.95),-.2,.62,0,1.5,.7,1.4);sphere(g,.05,M('#8d5a2b',.9),.02,.61,.04,1.3,.8,1);
    box(g,.3,.06,.004,M('#f4f4f4',.5),-.1,.15,.19);},
  keke(g){
    const yel=M('#f2bf10',.38,.12),blk=M('#141416',.55),glass=new T.MeshStandardMaterial({color:'#1c2c3a',roughness:.1,metalness:.5,transparent:true,opacity:.7,side:T.DoubleSide}),chr=M('#c9ccd2',.25,.9),seat=M('#2a2a30',.85);
    const s=new T.Shape();s.moveTo(-.36,.12);s.lineTo(.18,.12);s.quadraticCurveTo(.34,.12,.38,.2);s.quadraticCurveTo(.4,.3,.3,.34);s.lineTo(.12,.36);s.lineTo(-.3,.36);s.quadraticCurveTo(-.38,.34,-.38,.26);s.lineTo(-.36,.12);
    const lower=extr(s,.34,yel,.014);lower.position.z=-.17;g.add(lower);
    /* black stripe + number plate */
    [1,-1].forEach(sd=>{box(g,.7,.04,.006,blk,-.02,.24,sd*.186);const pl=box(g,.1,.05,.006,M('#f4f4f0',.5),-.3,.16,sd*.186);});
    /* roof shell, pillars, glass */
    const rs=new T.Shape();rs.moveTo(.2,.0);rs.quadraticCurveTo(.2,.14,.08,.16);rs.lineTo(-.3,.16);rs.quadraticCurveTo(-.4,.16,-.4,.08);rs.lineTo(-.4,.04);rs.lineTo(-.3,.1);rs.lineTo(.04,.1);rs.quadraticCurveTo(.12,.1,.12,.0);rs.lineTo(.2,.0);
    const roof=extr(rs,.42,yel,.01);roof.position.set(0,.5,-.21);g.add(roof);box(g,.62,.02,.42,blk,-.08,.665,0);
    [[.17,-.19],[.17,.19],[-.31,-.19],[-.31,.19]].forEach(([x,z])=>box(g,.022,.2,.022,blk,x,.46,z));
    const ws=new T.Mesh(new T.PlaneGeometry(.38,.2),glass);ws.position.set(.2,.5,0);ws.rotation.set(0,PI/2,0);ws.rotation.x=-.3;g.add(ws);
    box(g,.3,.1,.34,seat,-.14,.4,0);box(g,.04,.26,.34,seat,-.3,.5,0);box(g,.3,.03,.34,M('#3a3a42',.8),-.14,.46,0);
    /* front wheel under a fender, handlebars, headlight, mirrors */
    const fw=cyl(g,.1,.1,.06,M('#0e0e10',.9),.43,.1,0,20);fw.rotation.x=PI/2;const fh=cyl(g,.05,.05,.07,chr,.43,.1,0,14);fh.rotation.x=PI/2;
    const fd=new T.Mesh(new T.TorusGeometry(.115,.022,8,20,PI),yel);fd.position.set(.43,.1,0);fd.rotation.z=0;fd.scale.z=1.6;g.add(fd);
    const fk=box(g,.014,.18,.014,chr,.43,.2,.0);fk.rotation.z=.25;
    box(g,.26,.014,.014,blk,.29,.42,0);spr(g,.034,M('#fff6dc',.2),.4,.3,0,.6,1,1);[-1,1].forEach(z=>{box(g,.012,.07,.012,chr,.3,.45,z*.13);spr(g,.024,M('#444',.4),.3,.5,z*.15,.5,1,.8);});
    [-1,1].forEach(z=>{const w=cyl(g,.1,.1,.07,M('#0e0e10',.9),-.2,.1,z*.205,20);w.rotation.x=PI/2;const h=cyl(g,.05,.05,.075,chr,-.2,.1,z*.205,14);h.rotation.x=PI/2;
      const fe=new T.Mesh(new T.TorusGeometry(.12,.02,8,20,PI),yel);fe.position.set(-.2,.1,z*.205);fe.scale.z=1.4;g.add(fe);});
    box(g,.4,.02,.04,blk,-.02,.1,.19);box(g,.4,.02,.04,blk,-.02,.1,-.19);},
  eyo(g){
    const wh=M('#f8f6f0',.95),sh=M('#ebe7dc',.95),dark=M('#1a1a1e',.7);
    const fold=(m,n,amp)=>{const pos=m.geometry.attributes.position;for(let i=0;i<pos.count;i++){const x=pos.getX(i),z=pos.getZ(i),r=Math.hypot(x,z);if(r<.01)continue;const a=Math.atan2(z,x),k=1+amp*Math.sin(a*n)*Math.min(1,r/.12);pos.setXYZ(i,x*k,pos.getY(i),z*k);}m.geometry.computeVertexNormals();};
    const robe=lat(g,[[0,0],[.18,0],[.2,.05],[.18,.3],[.15,.55],[.12,.72],[.085,.82],[.07,.9],[.068,.95],[0,.97]],wh,0,0,0,40);fold(robe,9,.06);
    const shd=spr(g,.16,sh,0,.72,0,1.35,.42,.8);fold(shd,6,.04);
    [-1,1].forEach(sd=>{const sl=new T.Mesh(new T.CylinderGeometry(.05,.085,.42,14),sh);sl.position.set(sd*.27,.52,.03);sl.rotation.z=sd*.2;sl.rotation.x=-.1;sl.castShadow=true;g.add(sl);fold(sl,5,.05);});
    box(g,.07,.022,.02,dark,0,.9,.066);
    lat(g,[[0,0],[.24,0],[.25,.012],[.24,.022],[.1,.03],[.082,.1],[.086,.2],[0,.2]],dark,0,.93,0,40);lat(g,[[0,0],[.098,0],[.09,.03],[0,.03]],M('#2f7d46',.5),0,1.13,0,24);
    const st=cyl(g,.009,.009,1.0,M('#7a4a28',.8),.3,.5,.12,8);spr(g,.022,M('#c9a227',.4,.6),.3,1.02,.12);for(let i=0;i<8;i++){const a=i/8*6.28;box(g,.005,.14,.005,wh,.3+Math.cos(a)*.035,.92,.12+Math.sin(a)*.035);}
    lat(g,[[0,0],[.25,0],[.26,.015],[0,.015]],M('#e8e4d6',.8),0,0,0,32);},
  towers(g){
    const win=(c1,c2)=>decal(128,256,(c,w,h)=>{c.fillStyle=c1;c.fillRect(0,0,w,h);c.fillStyle=c2;for(let y=8;y<h;y+=16)for(let x=6;x<w;x+=14)c.fillRect(x,y,8,9);});
    const tw=(x,z,w,h,d,a,b)=>{const t=win(a,b);t.wrapS=T.RepeatWrapping;const m=new T.MeshStandardMaterial({map:t,roughness:.3,metalness:.3});const mesh=new T.Mesh(new T.BoxGeometry(w,h,d),m);mesh.position.set(x,h/2,z);mesh.castShadow=true;g.add(mesh);box(g,w+.01,.012,d+.01,M('#dfe6ee',.4),x,h+.006,z);};
    tw(-.17,-.05,.12,.78,.12,'#2d4d7a','#bfe0ff');tw(.04,.05,.14,.98,.14,'#1f3a5e','#a8d4ff');tw(.2,-.03,.11,.6,.11,'#3b6e9a','#d8efff');tw(-.05,-.14,.1,.46,.1,'#48627f','#cfe4f7');
    lathe(g,[[0,0],[.15,0],[.15,.1],[.12,.13],[.07,.16],[0,.17]],M('#d8d3c6',.7),-.1,.0,.2,32);lathe(g,[[0,0],[.1,0],[.1,.04],[0,.04]],M('#9a958a',.7),-.1,.17,.2,28);
    box(g,.6,.018,.5,M('#7fc0d8',.2,.2),0,.009,.04);
    /* cable-stayed bridge across the foreground, cables drawn as fine lines */
    const dk=M('#b9bcc2',.4,.5);box(g,.64,.016,.07,dk,0,.05,.22);const pyl=[[-.12,.3],[.16,.26]];
    pyl.forEach(([x,h])=>{box(g,.014,h,.014,dk,x-.012,.05+h/2,.22);box(g,.014,h,.014,dk,x+.012,.05+h/2,.22);});
    const pts=[];pyl.forEach(([x,h],pi)=>{for(let i=1;i<=6;i++){const top=.05+h-i*.022;[-1,1].forEach(sd=>{pts.push(x,top,.22,x+sd*i*.036,.058,.22);});}});
    const cg=new T.BufferGeometry();cg.setAttribute('position',new T.Float32BufferAttribute(pts,3));g.add(new T.LineSegments(cg,new T.LineBasicMaterial({color:0xf2f4f8})));
    [[-.1,.62],[.05,.88],[.22,.5]].forEach(([x,h])=>cyl(g,.004,.004,.1,M('#c33',.4),x,h+.05,0,6));},
  pot(g){
    const clay=decal(256,128,(c,w,h)=>{c.fillStyle='#b9552b';c.fillRect(0,0,w,h);c.strokeStyle='#4a1d10';c.lineWidth=3;for(let i=0;i<4;i++){c.beginPath();c.moveTo(0,22+i*5);c.lineTo(w,22+i*5);c.stroke();}c.fillStyle='#4a1d10';for(let x=0;x<w;x+=16){c.beginPath();c.moveTo(x,60);c.lineTo(x+8,84);c.lineTo(x+16,60);c.closePath();c.fill();}for(let x=0;x<w;x+=16){c.fillRect(x+4,92,8,8);}});
    const cm=new T.MeshStandardMaterial({map:clay,roughness:.85});
    lathe(g,[[0,0],[.1,0],[.17,.05],[.23,.17],[.24,.26],[.2,.36],[.12,.43],[.13,.5],[.15,.53],[.14,.545],[.105,.52],[0,.5]],cm,0,0,0,36);
    lathe(g,[[0,0],[.06,0],[.11,.04],[.12,.1],[.08,.16],[.05,.18],[.06,.2],[.045,.21],[0,.19]],cm,.34,0,.2,28);
    const cal=new T.Mesh(new T.SphereGeometry(.12,22,16),M('#cf9a2c',.55));cal.scale.set(1,.8,1);cal.position.set(-.3,.1,.16);cal.castShadow=true;g.add(cal);lathe(g,[[0,0],[.03,0],[.045,.08],[.03,.12],[0,.12]],M('#cf9a2c',.55),-.3,.17,.16,16);
    lathe(g,[[.13,0],[.145,0],[.15,.06],[.135,.06]],M('#7a4a28',.8),-.3,.0,.16,24);},
  mask(g){
    const face=dec2(512,512,(c,w,h)=>{const gr=c.createLinearGradient(0,0,w,0);gr.addColorStop(0,'#3d2410');gr.addColorStop(.25,'#8a5a2c');gr.addColorStop(.5,'#3d2410');gr.addColorStop(1,'#5a3a1c');c.fillStyle=gr;c.fillRect(0,0,w,h);
      c.strokeStyle='rgba(20,8,2,.35)';c.lineWidth=1;for(let y=0;y<h;y+=4){c.beginPath();c.moveTo(0,y);c.bezierCurveTo(w*.3,y+3,w*.6,y-3,w,y);c.stroke();}
      const cx=128;c.fillStyle='#e8dcc0';
      c.lineCap='round';c.strokeStyle='#120a06';c.lineWidth=8;[-1,1].forEach(s=>{c.beginPath();c.moveTo(cx+s*14,182);c.quadraticCurveTo(cx+s*42,160,cx+s*66,184);c.stroke();});
      c.fillStyle='#f2ead4';[-1,1].forEach(s=>{c.beginPath();c.ellipse(cx+s*38,208,22,8,s*.12,0,7);c.fill();c.fillStyle='#120a06';c.beginPath();c.moveTo(cx+s*16,208);c.quadraticCurveTo(cx+s*38,222,cx+s*60,207);c.quadraticCurveTo(cx+s*38,200,cx+s*16,208);c.fill();c.fillStyle='#f2ead4';});
      c.strokeStyle='#120a06';c.lineWidth=7;c.beginPath();c.moveTo(cx,190);c.lineTo(cx-3,268);c.moveTo(cx-18,276);c.quadraticCurveTo(cx,290,cx+18,276);c.stroke();
      c.fillStyle='#8a1b14';c.beginPath();c.moveTo(cx-24,316);c.quadraticCurveTo(cx,304,cx+24,316);c.quadraticCurveTo(cx,336,cx-24,316);c.fill();c.strokeStyle='#120a06';c.lineWidth=3;c.beginPath();c.moveTo(cx-24,316);c.quadraticCurveTo(cx,320,cx+24,316);c.stroke();
      c.strokeStyle='#efe3c4';c.lineWidth=4;for(let i=0;i<4;i++){[-1,1].forEach(s=>{c.beginPath();c.moveTo(cx+s*(70+i*3),236+i*10);c.lineTo(cx+s*(88+i*3),232+i*10);c.stroke();});}
      c.fillStyle='#efe3c4';for(let i=0;i<5;i++){c.beginPath();c.arc(cx,130+i*0,0,0,7);c.fill();}[-3,-2,-1,0,1,2,3].forEach(i=>{c.beginPath();c.moveTo(cx+i*16,100);c.lineTo(cx+i*16+4,128);c.lineTo(cx+i*16-4,128);c.fill();});});
    const wd=new T.MeshStandardMaterial({map:face,roughness:.7}),wood=M('#4a2a14',.7),dk=M('#120a06',.8);
    const head=new T.Mesh(new T.SphereGeometry(.11,32,24),wd);head.scale.set(.82,1.45,.62);head.position.set(0,.4,0);head.castShadow=true;g.add(head);
    box(g,.045,.12,.05,M('#6b4220',.7),0,.38,.075,true);
    /* coiffure crest: three carved tiers with a ridge pattern and a red bead */
    [[.07,.56,.075],[.095,.63,.07],[.06,.7,.055]].forEach(([r,y,hh],i)=>{lat(g,[[0,0],[r,0],[r*1.12,hh*.5],[r,hh],[0,hh]],M(i%2?'#2a160a':'#4a2a14',.55),0,y,0,28);ring(g,r*1.02,.006,M('#c9a227',.4,.6),0,y+.02,0,PI/2,0,0);});
    sphere(g,.026,M('#a3201a',.5),0,.79,0);
    lat(g,[[0,0],[.07,0],[.058,.07],[.04,.14],[0,.14]],wood,0,.19,0,24);lat(g,[[0,0],[.12,0],[.12,.03],[.07,.05],[0,.05]],M('#3a2010',.7),0,.15,0,28);
    [-1,1].forEach(s=>{const ear=new T.Mesh(new T.TorusGeometry(.03,.008,6,14,PI*1.4),wood);ear.position.set(s*.088,.4,0);ear.rotation.y=PI/2;g.add(ear);});},
  agbada(g){
    const emb=decal(256,256,(c,w,h)=>{c.fillStyle='#2250a5';c.fillRect(0,0,w,h);c.strokeStyle='#e5c15a';c.lineWidth=3;for(let y=20;y<h;y+=42){c.beginPath();for(let x=0;x<=w;x+=16)c.lineTo(x,y+((x/16)%2?8:-8));c.stroke();}c.fillStyle='#e5c15a';for(let x=24;x<w;x+=48)for(let y=40;y<h;y+=84){c.beginPath();c.arc(x,y,5,0,7);c.fill();}c.fillStyle='#e5c15a';c.fillRect(w/2-14,0,28,h);});
    const rm=new T.MeshStandardMaterial({map:emb,roughness:.8,side:T.DoubleSide});
    cyl(g,.02,.02,.9,M('#2a2a2e',.5,.5),0,.45,0,10);lathe(g,[[0,0],[.16,0],[.16,.02],[0,.02]],M('#2a2a2e',.5,.5),0,0,0,24);
    lathe(g,[[0,.12],[.12,.12],[.2,.28],[.24,.5],[.16,.78],[.08,.88],[.06,.9],[0,.9]],M('#f4efe2',.9),0,0,0,28);
    lathe(g,[[.06,.9],[.12,.88],[.26,.68],[.3,.36],[.3,.3],[.2,.3],[.22,.5],[.1,.8],[.06,.84]],rm,0,0,0,28);
    [-1,1].forEach(s=>{const sl=new T.Mesh(new T.CylinderGeometry(.05,.11,.5,14,1,true),rm);sl.position.set(s*.22,.62,0);sl.rotation.z=s*.9;g.add(sl);});
    sphere(g,.065,M('#6b4430',.7),0,1.0,0,1,1.15,1);lathe(g,[[0,0],[.075,0],[.08,.04],[.07,.1],[.06,.13],[0,.13]],M('#2250a5',.8),0,.99,0,24);},
  };})();

/* ----- wall instruments ----- */
const INSTR=(function(){
  const spr=(g,r,mat,x,y,z,sx,sy,sz)=>{const m=new T.Mesh(new T.SphereGeometry(r,16,12),mat);m.position.set(x,y,z);m.scale.set(sx||1,sy||1,sz||1);m.castShadow=true;g.add(m);return m;};
  const lat=(g,pts,mat,x,y,z,seg)=>{const m=new T.Mesh(new T.LatheGeometry(pts.map(p=>new T.Vector2(p[0],p[1])),seg||28),mat);m.position.set(x||0,y||0,z||0);m.castShadow=true;m.receiveShadow=true;g.add(m);return m;};
  const dec=(w,h,fn)=>{const c=OW.canvas(w,h);fn(c.getContext('2d'),w,h);const t=OW.tex(c);return t;};
  const ring=(g,r,tube,mat,x,y,z,rx,ry,rz)=>{const m=new T.Mesh(new T.TorusGeometry(r,tube,8,28),mat);m.position.set(x,y,z);m.rotation.set(rx||0,ry||0,rz||0);g.add(m);return m;};
  return{
  guitar(g){
    const top=new T.MeshStandardMaterial({color:'#d9a65a',roughness:.45}),side=M('#7a3b17',.5),dk=M('#1f130c',.55),fb=M('#2a1a10',.6),mt=M('#c9ccd2',.3,.85),bone=M('#efe6cf',.5);
    const half=[[0,.11],[.07,.105],[.105,.07],[.115,.02],[.098,-.04],[.092,-.09],[.12,-.15],[.155,-.22],[.162,-.3],[.14,-.37],[.09,-.41],[0,-.42]];
    const sh=new T.Shape();half.forEach((q,i)=>i?sh.lineTo(q[0],q[1]):sh.moveTo(q[0],q[1]));for(let i=half.length-2;i>=1;i--)sh.lineTo(-half[i][0],half[i][1]);sh.lineTo(0,.11);
    const geo=new T.ExtrudeGeometry(sh,{depth:.085,bevelEnabled:true,bevelSize:.008,bevelThickness:.008,bevelSegments:3,curveSegments:24});
    const body=new T.Mesh(geo,[top,side]);body.position.z=-.04;body.castShadow=true;g.add(body);
    ring(g,.056,.007,dk,0,-.17,.052,0,0,0);ring(g,.07,.004,M('#c9a227',.5),0,-.17,.052);const hole=new T.Mesh(new T.CircleGeometry(.055,24),dk);hole.position.set(0,-.17,.0495);g.add(hole);
    const br=box(g,.15,.022,.016,fb,0,-.31,.055);box(g,.1,.004,.006,bone,0,-.3,.064);
    box(g,.052,.66,.05,M('#5a3a22',.6),0,.43,-.005,true);box(g,.046,.66,.012,fb,0,.43,.025);
    for(let i=0;i<14;i++)box(g,.048,.0035,.004,mt,0,.12+i*.044-i*i*.0007,.033);
    [[0,.11],[.12,.13]].forEach(()=>{});
    box(g,.064,.14,.034,M('#4a2c18',.6),0,.835,-.01);for(let i=0;i<3;i++)[-1,1].forEach(s=>{const p=cyl(g,.007,.007,.03,mt,s*.04,.8+i*.04,-.01,8);p.rotation.z=PI/2;box(g,.012,.022,.01,bone,s*.058,.8+i*.04,-.01);});
    box(g,.05,.008,.016,bone,0,.765,.02);
    for(let i=0;i<6;i++){const x=-.0125+i*.005,s=box(g,.0013,1.08,.0013,i<3?M('#d8d4c8',.4,.4):M('#b58a43',.4,.7),x,.18,.04);}
    const sp=spr;g.userData.len=1.3;},
  drum(g){
    const wd=dec(64,256,(c,w,h)=>{const gr=c.createLinearGradient(0,0,w,0);gr.addColorStop(0,'#5a2e12');gr.addColorStop(.5,'#9a5a2a');gr.addColorStop(1,'#5a2e12');c.fillStyle=gr;c.fillRect(0,0,w,h);c.strokeStyle='rgba(30,12,4,.55)';c.lineWidth=2;for(let y=0;y<h;y+=32){c.beginPath();c.moveTo(0,y);c.lineTo(w,y);c.stroke();}c.fillStyle='#e8d8b0';for(let y=16;y<h;y+=32)for(let x=8;x<w;x+=16){c.beginPath();c.moveTo(x,y-5);c.lineTo(x+5,y);c.lineTo(x,y+5);c.lineTo(x-5,y);c.fill();}});
    const body=lat(g,[[0,-.27],[.1,-.27],[.092,-.2],[.06,-.1],[.042,0],[.06,.1],[.092,.2],[.1,.27],[0,.27]],new T.MeshStandardMaterial({map:wd,roughness:.65}),0,0,0,32);
    const skin=M('#eadcb9',.8),leather=M('#b0743a',.75);[-1,1].forEach(s=>{lat(g,[[0,0],[.108,0],[.108,.01],[.1,.022],[0,.016]],skin,0,s*.275,0,32);ring(g,.108,.012,leather,0,s*.272,0,PI/2,0,0);});
    for(let i=0;i<14;i++){const a=i/14*6.28,cx=Math.cos(a),cz=Math.sin(a);const c1=box(g,.007,.56,.007,leather,cx*.07,0,cz*.07);c1.rotation.set(0,0,0);}
    for(let i=0;i<7;i++){const y=-.2+i*.067;ring(g,.05+Math.abs(y)*.28,.004,M('#8a5a2c',.7),0,y,0,PI/2,0,0);}
    const stk=new T.Group();stk.name='stick';const st=cyl(stk,.009,.011,.34,M('#6a4a22',.7),0,0,0,8);spr(stk,.028,M('#6a4a22',.7),0,.19,0);stk.position.set(.16,-.3,.07);g.add(stk);},
  djembe(g){
    const wd=dec(256,128,(c,w,h)=>{const gr=c.createLinearGradient(0,0,0,h);gr.addColorStop(0,'#8a4f24');gr.addColorStop(1,'#5a3014');c.fillStyle=gr;c.fillRect(0,0,w,h);c.strokeStyle='rgba(20,8,2,.6)';c.lineWidth=3;for(let x=0;x<w;x+=16){c.beginPath();c.moveTo(x,26);c.lineTo(x+8,50);c.lineTo(x+16,26);c.stroke();c.beginPath();c.moveTo(x,70);c.lineTo(x+8,94);c.lineTo(x+16,70);c.stroke();}c.lineWidth=2;for(let y=8;y<h;y+=3){c.globalAlpha=.1;c.beginPath();c.moveTo(0,y);c.lineTo(w,y);c.stroke();}c.globalAlpha=1;});
    lat(g,[[0,-.3],[.075,-.3],[.095,-.25],[.07,-.12],[.05,-.04],[.075,.06],[.14,.18],[.175,.28],[.18,.31],[0,.31]],new T.MeshStandardMaterial({map:wd,roughness:.6}),0,0,0,36);
    const sk=M('#efe0bd',.85),rp=M('#c9a227',.45,.5);lat(g,[[0,0],[.19,0],[.19,.012],[.17,.03],[0,.026]],sk,0,.31,0,36);ring(g,.185,.014,rp,0,.32,0,PI/2,0,0);ring(g,.095,.01,rp,0,-.2,0,PI/2,0,0);ring(g,.08,.007,rp,0,.1,0,PI/2,0,0);
    for(let i=0;i<12;i++){const a=i/12*6.28,x=Math.cos(a),z=Math.sin(a);const c1=box(g,.006,.18,.006,M('#c8a16a',.8),x*.17,.21,z*.17);c1.rotation.set(0,0,0);const c2=box(g,.006,.4,.006,M('#c8a16a',.8),x*.1,.0,z*.1);}},
  agogo(g){
    const gold=new T.MeshStandardMaterial({color:'#d8b640',roughness:.28,metalness:.9,side:T.DoubleSide});
    [[-.1,.0,.17,.38],[.1,-.05,.13,.3]].forEach(([x,y,r,h])=>{const c=new T.Mesh(new T.CylinderGeometry(r*.28,r,h,28,1,true),gold);c.scale.z=.55;c.position.set(x,y+.02,0);c.castShadow=true;g.add(c);const top=new T.Mesh(new T.CircleGeometry(r*.28,20),gold);top.rotation.x=-PI/2;top.scale.set(1,.55,1);top.position.set(x,y+.02+h/2,0);g.add(top);ring(g,r*.6,.006,gold,x,y+.02-h/2+.02,0,PI/2,0,0).scale.set(1,.55,1);});
    const hnd=new T.Mesh(new T.TorusGeometry(.1,.012,8,24,PI),gold);hnd.position.set(0,-.12,0);hnd.rotation.z=PI;g.add(hnd);cyl(g,.014,.014,.12,M('#2a2a2e',.5),0,-.28,0,10);
    const stk=new T.Group();stk.name='stick';cyl(stk,.009,.009,.34,M('#5a3a22',.7),0,0,0,8);spr(stk,.026,M('#5a3a22',.7),0,.19,0);stk.position.set(.28,-.05,.06);g.add(stk);},
  shekere(g){
    const gour=M('#d19a3a',.55);lat(g,[[0,-.22],[.1,-.2],[.19,-.1],[.21,.02],[.17,.12],[.09,.18],[.05,.21],[.05,.3],[.062,.34],[.04,.345],[.036,.3],[0,.3]],gour,0,0,0,32).castShadow=true;
    const bead=(c)=>M(c,.35,.1);const cols=['#f6f4ee','#b3203a','#1c7a46','#e5c15a'];
    const rings=8;for(let i=0;i<rings;i++){const y=-.16+i*.045,rad=[.15,.185,.205,.21,.2,.175,.14,.1][i]+.012,n=16;for(let k=0;k<n;k++){const a=k/n*6.28+(i%2)*3.14/n;const b=new T.Mesh(new T.SphereGeometry(.0105,8,6),bead(cols[(k+i)%4]));b.position.set(Math.cos(a)*rad,y,Math.sin(a)*rad);g.add(b);}}
    for(let k=0;k<16;k++){const a=k/16*6.28;const l=box(g,.002,.4,.002,M('#e9dfc8',.8),Math.cos(a)*.19,-.02,Math.sin(a)*.19);}},
  kalimba(g){
    const wd=M('#6b3f1d',.55),dk=M('#2a1608',.7),mt=M('#d4d6da',.28,.9);
    const sh=new T.Shape();const w=.13,h=.17,r=.04;sh.moveTo(-w+r,-h);sh.lineTo(w-r,-h);sh.quadraticCurveTo(w,-h,w,-h+r);sh.lineTo(w,h-r);sh.quadraticCurveTo(w,h,w-r,h);sh.lineTo(-w+r,h);sh.quadraticCurveTo(-w,h,-w,h-r);sh.lineTo(-w,-h+r);sh.quadraticCurveTo(-w,-h,-w+r,-h);
    const b=new T.Mesh(new T.ExtrudeGeometry(sh,{depth:.05,bevelEnabled:true,bevelSize:.008,bevelThickness:.008,bevelSegments:2}),wd);b.position.z=-.025;b.castShadow=true;g.add(b);
    const hole=new T.Mesh(new T.CircleGeometry(.032,20),dk);hole.position.set(0,-.07,.034);g.add(hole);
    box(g,.2,.014,.016,mt,0,.02,.04);box(g,.2,.012,.014,mt,0,-.12,.036);
    for(let i=0;i<9;i++){const L=.22-Math.abs(i-4)*.014;box(g,.012,L,.005,mt,-.1+i*.025,.02+L/2-.02,.034);}
    for(let i=0;i<9;i++)box(g,.004,.01,.004,dk,-.1+i*.025,-.12,.042);},
  udu(g){
    const clay=dec(256,128,(c,w,h)=>{c.fillStyle='#a8482a';c.fillRect(0,0,w,h);c.strokeStyle='#3a140a';c.lineWidth=3;for(let i=0;i<3;i++){c.beginPath();c.moveTo(0,40+i*6);c.lineTo(w,40+i*6);c.stroke();}c.fillStyle='#e8d8b0';for(let x=0;x<w;x+=18){c.beginPath();c.arc(x+9,78,4,0,7);c.fill();}c.fillStyle='#3a140a';for(let x=0;x<w;x+=18){c.beginPath();c.moveTo(x,96);c.lineTo(x+9,110);c.lineTo(x+18,96);c.fill();}});
    const cm=new T.MeshStandardMaterial({map:clay,roughness:.85});lat(g,[[0,-.21],[.1,-.21],[.18,-.14],[.22,-.02],[.2,.1],[.12,.19],[.07,.23],[.065,.3],[.085,.33],[.06,.33],[.05,.3],[0,.24]],cm,0,0,0,36);
    const hole=new T.Mesh(new T.CircleGeometry(.065,20),M('#1a0a05',.9));hole.position.set(0,.0,.221);g.add(hole);ring(g,.068,.012,M('#7a2f18',.85),0,0,.218);},
  flute(g){
    const bm=dec(64,256,(c,w,h)=>{const gr=c.createLinearGradient(0,0,w,0);gr.addColorStop(0,'#b8943f');gr.addColorStop(.5,'#ecd48c');gr.addColorStop(1,'#a07c2c');c.fillStyle=gr;c.fillRect(0,0,w,h);c.fillStyle='rgba(90,60,10,.6)';[40,110,180,235].forEach(y=>c.fillRect(0,y,w,5));});
    const t=new T.Mesh(new T.CylinderGeometry(.021,.021,.72,18),new T.MeshStandardMaterial({map:bm,roughness:.5}));t.castShadow=true;g.add(t);const dk=M('#3a2008',.7);
    for(let i=0;i<6;i++){const h=new T.Mesh(new T.CircleGeometry(.0075,10),dk);h.position.set(0,-.3+i*.065+(i>2?.04:0),.0215);g.add(h);}const e=new T.Mesh(new T.CircleGeometry(.009,10),dk);e.position.set(0,.3,.0215);g.add(e);
    [-.35,.35].forEach(y=>ring(g,.022,.004,M('#8a2a1a',.7),0,y,0,PI/2,0,0));[0.12,0.2].forEach(y=>ring(g,.0225,.0035,M('#2a2a2e',.6),0,y,0,PI/2,0,0));}
  };})();

/* ----- plain speaker column (the music comes from the room playlist) ----- */
function speaker(g,x,z,ry){const grp=new T.Group();grp.position.set(x,0,z);grp.rotation.y=ry;const bm=M('#16161a',.6);
  box(grp,.5,1.5,.4,bm,0,.75,0,true);[[1.1,.17],[.72,.12],[.42,.09]].forEach(([y,r])=>{const c=cyl(grp,r,r,.03,M('#2d2d34',.4,.3),0,y,.205,28);c.rotation.x=PI/2;const d=cyl(grp,r*.4,r*.4,.04,M('#0a0a0c',.5),0,y,.205,20);d.rotation.x=PI/2;});
  box(grp,.12,.012,.012,glowM('#3ddc97',1.6),0,1.42,.202);g.add(grp);return grp;}

/* ----- LED track light: rail + heads aimed at a point ----- */
function track(g,x,len,z0,H,targets){
  box(g,.06,.04,len,M('#0d0d10',.5,.2),x,H-.02,z0);
  targets.forEach(t=>{const h=new T.Group();h.position.set(x,H-.07,t.z);const stem=cyl(h,.012,.012,.1,M('#0d0d10'),0,0,0,6);const can=cyl(h,.045,.06,.15,M('#111114',.4,.3),0,-.1,0,14);
    const lens=cyl(h,.04,.04,.012,glowM('#fff6dc',2.2),0,-.18,0,14);const aim=new T.Vector3(t.tx-x,t.ty-(H-.17),t.tz-t.z);h.lookAt(h.position.clone().add(new T.Vector3(aim.x,aim.y,aim.z)));h.rotateX(-PI/2);h.updateMatrix();g.add(h);});}


/* ----- wall texts: what each work, instrument and object is ----- */
const INFO={
  art:{
    adire:['Adire Eleko','Yoruba · indigo resist-dye','Adire is cloth patterned by resisting the dye, traditionally indigo, around Abeokuta. In adire eleko the pattern is painted on with cassava paste, so the covered lines stay pale when the cloth is dyed. Circles, waves and small repeated marks are classic.'],
    aso:['Aso Oke','Yoruba · hand-woven strips','Aso oke means "top cloth". It is woven on a narrow loom in long strips that are sewn together into wrappers, caps and headties for weddings and naming ceremonies. The stripes and colour blocks here follow that strip-weave look.'],
    gele:['Gele','Yoruba · the headtie','A gele is a stiff wrapped headtie worn by women for celebrations. Tying one is an art: the folds are pleated and sculpted over the head, and the size of the wrap is part of the occasion.'],
    ankara:['Ankara Print','West African wax print','Ankara is bold wax-printed cotton loved across West Africa. Tailors in Lagos turn it into everything from iro and buba to modern streetwear. This piece plays with its big motifs and hot colours.'],
    danfo:['Danfo','Lagos · the yellow bus','The yellow-and-black danfo minibus is the heartbeat of Lagos traffic. Conductors shout the stops, the buses are hand-painted with sayings, and a ride costs a few naira.'],
    drum:['Dùndún at Sunset','Yoruba · the talking drum','A drummer plays the dùndún, the hourglass talking drum. Pressing the cords changes the pitch, so the drum can copy the tones of Yoruba speech. This work shows a drummer against a golden evening.'],
    uli:['Uli','Igbo · line and leaf','Uli is the Igbo tradition of flowing, curved line drawing, painted on bodies and walls. Leaves, spirals and bold black lines on warm earth colours are typical. This piece is an original drawing in that spirit.'],
    zuma:['Zuma Rock','Niger State · near Abuja','Zuma Rock is a huge granite monolith beside the highway to Abuja, rising roughly 700 metres above the plain. It is often called the Gateway to Abuja.'],
    bridge:['Third Mainland Bridge','Lagos Lagoon · at dusk','Third Mainland Bridge runs for about 11.8 km across the Lagos Lagoon, linking the mainland to Lagos Island. Fishermen still paddle under it as the evening lights come on.'],
    eyo:['Eyo','Lagos Island · masquerade','Eyo masquerades dress in flowing white and a wide hat, carrying a staff called opa. They parade through Lagos Island at special ceremonies, and the white figures move like moving statues.'],
    lagoon:['Makoko Morning','Lagos Lagoon · stilt houses','Makoko is a community built on stilts over the Lagos Lagoon. Families fish from long wooden canoes, casting nets at sunrise while their houses stand on the water.']},
  obj:{
    danfo:['Danfo Bus','Lagos · model','A small model of the Lagos danfo: yellow body, black stripe, ladder at the back, and a conductor hanging by the door.'],
    keke:['Keke Napep','Nigeria · the tricycle taxi','The keke is the three-wheel tricycle taxi that fills the short routes in Nigerian cities. Yellow and compact, it fits through spaces buses cannot.'],
    eyo:['Eyo Figure','Lagos Island · masquerade','A small figure of an Eyo masquerade in white robes, wide hat and staff. Turn it around to see the folds of the robe.'],
    towers:['Lagos Skyline','Victoria Island · model','A small sculpture of glass towers, a cable-stayed bridge and an antenna mast, to suggest the skyline of Lagos Island and Victoria Island.'],
    pot:['Clay Pot','Nigeria · hand-built pottery','Hand-built clay pots carry water, palm wine and stew across Nigeria. The incised bands and dots on this one echo traditional pottery decoration.'],
    mask:['Carved Mask','West African tradition · original','A carved wooden mask in the spirit of West African masquerade carving, with a long face, narrow eyes and incised marks. It is an original design, not a copy of a museum piece.'],
    agbada:['Agbada','Yoruba · the grand robe','The agbada is a wide, flowing robe worn over a shirt and trousers for weddings and festivals. Gold embroidery along the neck and chest is part of what makes it special.']},
  instr:{
    guitar:['Highlife Guitar','West Africa · strings','Highlife, born in Ghana and loved in Nigeria, is built on bright, rolling guitar lines. Pick it up and strum along.'],
    drum:['Talking Drum','Yoruba · dùndún','Squeeze the cords under your arm to bend the pitch and make the drum "speak". Played with a curved stick.'],
    djembe:['Djembe','Mali, Guinea · goblet drum','A goblet-shaped drum played with bare hands. Bass in the middle, tone and slap near the rim.'],
    agogo:['Agogo Bells','Yoruba · double bell','A pair of iron bells of different pitch, struck with a stick. In many rhythms the agogo holds the pattern that everyone else follows.'],
    shekere:['Shekere','Yoruba · gourd rattle','A dried gourd wrapped in a net of beads. Shake it for a rattle, tap the base for a deep thud.'],
    kalimba:['Kalimba','Africa · thumb piano','Metal tines on a wooden board, plucked with the thumbs. Related thumb pianos include the mbira and the Igbo ubo.'],
    udu:['Udu','Igbo · clay pot drum','Udu means "vessel" in Igbo. Hit the side for a thud, and cover or uncover the hole for a deep, wobbly bass.'],
    flute:['Bamboo Flute','Many cultures · wind','A simple bamboo flute with finger holes. Each key plays a different note of the scale.']}
};
const LBL={guitar:'Highlife Guitar',drum:'Talking Drum',djembe:'Djembe',agogo:'Agogo Bells',shekere:'Shekere',kalimba:'Kalimba',udu:'Udu',flute:'Bamboo Flute'};
function labelMesh(title,sub,w,h,dark){
  const c=OW.canvas(512,Math.round(512*h/w)),x=c.getContext('2d');x.fillStyle=dark?'#1b1b20':'#f4f2ec';x.fillRect(0,0,c.width,c.height);
  x.strokeStyle=dark?'#c8a24a':'#b9b5a8';x.lineWidth=4;x.strokeRect(5,5,c.width-10,c.height-10);
  x.textBaseline='middle';x.fillStyle=dark?'#f4f2ec':'#15131c';let fs=Math.round(c.height*.42);x.font='700 '+fs+'px system-ui,sans-serif';while(x.measureText(title).width>c.width-36&&fs>14){fs-=2;x.font='700 '+fs+'px system-ui,sans-serif';}
  x.fillText(title,18,c.height*.36);x.fillStyle=dark?'#c8a24a':'#6b6679';x.font='500 '+Math.round(c.height*.24)+'px system-ui,sans-serif';let t2=sub;while(x.measureText(t2).width>c.width-36&&t2.length>6)t2=t2.slice(0,-2);x.fillText(t2===sub?sub:t2+'…',18,c.height*.74);
  const m=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({map:OW.tex(c)}));m.userData.own=1;return m;}

P._galleryBuild=function(g){
  curRoom=this;
  Object.keys(artCache).forEach(k=>delete artCache[k]);
  const G=OW.GALLERY,W=this.W,D=this.D,H=this.H,fl=new T.Mesh(new T.PlaneGeometry(W,D),new T.MeshStandardMaterial({map:marble(W,D),roughness:.2,metalness:.1}));
  g.children.forEach(c=>{if(c!==fl&&c.isMesh&&c.geometry&&c.geometry.type==='PlaneGeometry'&&Math.abs(c.rotation.x+PI/2)<.01&&c.position.y<.01)c.visible=false;});/* the plain room floor sits at the same height and flickered through the marble */
  fl.rotation.x=-PI/2;fl.position.y=.002;fl.receiveShadow=true;fl.userData.own=1;g.add(fl);
  /* soft floor reflection of the room: a faint lighter sheen strip under each wall */
  const trim=M('#d9d7d0',.5);[[-D/2+.03,0],[D/2-.03,0]].forEach(([z])=>box(g,W,.09,.04,trim,0,.045,z));[-W/2+.03,W/2-.03].forEach(x=>box(g,.04,.09,D,trim,x,.045,0));
  const fm=M('#16161a',.45),gold=M('#c8a24a',.35,.7);
  /* back wall: three large works */
  [['adire',-2.4,.62*0+2.0],['aso',0,2.0],['gele',2.4,2.0]].forEach(([k,x,y])=>frame(g,k,x,y,-D/2+.01,0,1.5,1.85,fm));
  /* left wall (faces +x) and right wall (faces -x): rows of works and instruments */
  const L=[['uli',-4.6],['ankara',-2.0],['danfo',2.4],['drum',4.8]],R=[['zuma',-4.6],['bridge',-2.0],['eyo',2.4],['lagoon',4.8]];
  L.forEach(([k,z])=>frame(g,k,-W/2+.01,2.0,z,PI/2,1.0,1.3,fm));R.forEach(([k,z])=>frame(g,k,W/2-.01,2.0,z,-PI/2,1.0,1.3,fm));
  const artLbl=(k,x,y,z,ry)=>{const m=labelMesh(INFO.art[k][0],INFO.art[k][1],.5,.13,false);m.position.set(x,y,z);m.rotation.y=ry;m.userData.info={kind:'art',key:k};g.add(m);};
  L.forEach(([k,z])=>artLbl(k,-W/2+.012,1.1,z,PI/2));R.forEach(([k,z])=>artLbl(k,W/2-.012,1.1,z,-PI/2));[['adire',-2.4],['aso',0],['gele',2.4]].forEach(([k,x])=>artLbl(k,x,.9,-D/2+.012,0));
  /* each instrument hangs on a bracket: [mount height, centre offset, distance from the wall, scale] */
  const MNT={guitar:[1.45,.22,.1,.82],drum:[.8,0,.14,1],djembe:[.85,0,.25,1],agogo:[.85,0,.12,1],shekere:[.8,0,.27,1],kalimba:[.5,0,.07,1.1],udu:[.65,0,.26,1],flute:[.9,0,.06,1]};
  const inst=(kind,wall,z,y,s)=>{const M2=MNT[kind],grp=new T.Group();INSTR[kind](grp);grp.scale.setScalar(M2[3]);const side=wall<0?1:-1;
    const off=M2[2]+.02;grp.position.set(wall*(W/2-off),y+M2[1]*0,z);grp.rotation.y=side>0?PI/2:-PI/2;
    const back=box(g,.035,M2[0],.5,M('#e4e1d8',.9),wall*(W/2-.02),y+M2[1],z,false);
    if(off>.15)box(g,off-.03,.03,.05,M('#2a2a2e',.5,.4),wall*(W/2-.03-(off-.03)/2),y,z,false);
    const pq=labelMesh(LBL[kind],INFO.instr[kind][1],.4,.11,true);pq.position.set(wall*(W/2-.034),y-M2[0]/2+M2[1]-.12,z);pq.rotation.y=side>0?PI/2:-PI/2;pq.userData.info={kind:'instr',key:kind};g.add(pq);
    grp.userData.info={kind:'instr',key:kind};g.add(grp);grp.userData.instr=kind;(this.instruments=this.instruments||[]).push({kind,x:grp.position.x,y,z,wall:side>0?'left':'right',node:grp});return grp;};
  this.instruments=[];
  inst('guitar',-1,-3.3,1.75,1);inst('drum',-1,-1.0,1.75,1);inst('djembe',-1,.2,1.75,1);inst('agogo',-1,1.4,1.75,1);inst('shekere',1,-3.3,1.75,1);inst('kalimba',1,-1.0,1.75,1);inst('udu',1,.2,1.75,1);inst('flute',1,1.4,1.75,1);
  /* pillars (plinths) of different heights, each carrying something from Lagos or Nigeria */
  const pw=M('#fbfaf7',.55),cap=M('#e6e3dc',.5);
  const PL=[['danfo',-1.7,-3.6,1.05,1.0,.62,.85],['keke',1.8,-3.1,.95,.8,.56,1.05],['eyo',-1.9,-.8,.9,.58,.58,.9],['towers',1.9,.3,1.0,.86,.62,1],['pot',-1.6,2.3,.85,.72,.6,1.25],['mask',1.6,3.1,1.0,.52,.52,1.05],['agbada',0,-1.3,.8,.6,.6,.85]];
  PL.forEach(([k,x,z,h,w,d,sc])=>{box(g,w,h,d,pw,x,h/2,z,true);box(g,w+.06,.04,d+.06,cap,x,h+.02,z);box(g,w+.03,.03,d+.03,M('#d9d7d0',.5),x,.015,z);const o=new T.Group();o.position.set(x,h+.04,z);OBJ[k](o);o.rotation.y=(x>0?-.55:.55);o.scale.setScalar(sc);o.userData.info={kind:'obj',key:k};g.add(o);
    const pl2=labelMesh(INFO.obj[k][0],INFO.obj[k][1],.46,.13,true);pl2.position.set(x,h-.17,z+d/2+.008);pl2.userData.info={kind:'obj',key:k};g.add(pl2);});
  /* speakers in the front corners */
  this.spots=this.instruments.map(i=>({kind:i.kind,label:'Pick up '+({guitar:'the guitar',drum:'the talking drum',shekere:'the shekere',kalimba:'the kalimba',djembe:'the djembe',udu:'the udu pot',agogo:'the agogo bells',flute:'the bamboo flute'})[i.kind],x:i.x,z:i.z,nx:i.wall==='left'?1:-1,nz:0,node:i.node,y:i.y}));
  [[-W/2+.45,D/2-.5,PI*.78],[W/2-.45,D/2-.5,-PI*.78]].forEach(([x,z,r])=>{const sp=speaker(g,x,z,r);this.spots.push({kind:'speaker',label:'Play music',x,z,nx:Math.sign(-x)*.6,nz:-.8,node:sp});});
  this._gxObjs=this.spots.map(sp=>{sp.node.userData.spot=sp;return sp.node;});
  /* ceiling: dark with LED tracks aimed at the art */
  const wallT=[-4.6,-2.0,2.4,4.8];
  track(g,-2.9,D-1,0,H,[-4.6,-2.0,.2,2.4,4.8].map(z=>({z,tx:-W/2,ty:2.0,tz:z})));track(g,2.9,D-1,0,H,[-4.6,-2.0,.2,2.4,4.8].map(z=>({z,tx:W/2,ty:2.0,tz:z})));
  track(g,0,W-3,-D/2+1.3,H,[]);
  box(g,W-3.4,.04,.06,M('#0d0d10',.5,.2),0,H-.02,-D/2+1.3);[-2.4,0,2.4].forEach(x=>{const h=new T.Group();h.position.set(x,H-.07,-D/2+1.3);cyl(h,.012,.012,.1,M('#0d0d10'),0,0,0,6);const c=cyl(h,.045,.06,.15,M('#111114',.4,.3),0,-.1,0,14);cyl(h,.04,.04,.012,glowM('#fff6dc',2.2),0,-.18,0,14);h.rotation.x=.55;h.position.z-=0;g.add(h);});
  /* a long soft LED strip along the base of the ceiling edges */
  [-1,1].forEach(s=>box(g,.03,.03,D-.2,glowM('#fff3d4',.9),s*(W/2-.08),H-.05,0));
  /* the verified plaque on the entrance wall */
  const pc=OW.canvas(512,128),px=pc.getContext('2d');px.fillStyle='#f7f6f2';px.fillRect(0,0,512,128);px.fillStyle='#14111f';px.font='700 46px system-ui,sans-serif';px.textBaseline='middle';px.fillText('OpenWalls Gallery',24,50);
  px.fillStyle='#6c4bff';px.beginPath();px.arc(458,50,28,0,7);px.fill();px.strokeStyle='#fff';px.lineWidth=7;px.lineCap='round';px.beginPath();px.moveTo(446,50);px.lineTo(455,60);px.lineTo(472,40);px.stroke();
  px.fillStyle='#6b6679';px.font='500 24px system-ui,sans-serif';px.fillText('Verified · curated by OpenWalls',24,100);
  const pl=new T.Mesh(new T.PlaneGeometry(1.6,.4),new T.MeshBasicMaterial({map:OW.tex(pc)}));pl.position.set(0,2.9,D/2-.02);pl.rotation.y=PI;g.add(pl);
  /* the lights that actually light the art (few, no shadows: kind to phones) */
  (this._gl||[]).forEach(l=>{this.scene.remove(l);if(l.target)this.scene.remove(l.target);});this._gl=[];
  [[-2.9,-3.4,-W/2,2.0,-3.4],[-2.9,1.2,-W/2,2.0,1.2],[2.9,-3.4,W/2,2.0,-3.4],[2.9,1.2,W/2,2.0,1.2],[0,-D/2+1.3,0,2.0,-D/2]].forEach(([x,z,tx,ty,tz])=>{const s=new T.SpotLight(0xfff1d6,.9,9,.62,.7,1.4);s.position.set(x,H-.2,z);s.target.position.set(tx,ty,tz);this.scene.add(s,s.target);this._gl.push(s);});
  /* walking collisions around plinths and speakers */
  this.colliders=PL.map(([k,x,z,h,w,d])=>({x,z,hw:Math.max(w,d)/2+.05})).concat([{x:-W/2+.45,z:D/2-.5,hw:.35},{x:W/2-.45,z:D/2-.5,hw:.35}]);
};

/* wrap the shell build: a house room swaps the cosy parts for the gallery */
const baseShell=P.buildShell;
P.buildShell=function(){
  const th=this.room.theme;if(!(th&&th.house)){this._house=false;return baseShell.call(this);}
  const G=OW.GALLERY;this.room.width=G.w;this.room.depth=G.d;this.room.height=G.h;this._house=true;
  const real=this.room.theme;this.room.theme=Object.assign({},real,{key:'gallery',hide:{window:1,door:1,light:1}});
  try{baseShell.call(this);}finally{this.room.theme=real;}
  this.hemi.intensity=.78;this.sun.intensity=.2;this.pend.intensity=.1;this.hemi.color.set(0xffffff);this.hemi.groundColor.set(0x9a9a9f);
  this._galleryBuild(this.shell);this.markDirty(true);
};
/* people can no longer walk through plinths and speakers */
const baseBlk=P.blockers;
P.blockers=function(){const l=baseBlk.call(this);if(!this._house||!this.colliders)return l;return l.concat(this.colliders.map(c=>({kind:'furniture',type:'__col',x:c.x,z:c.z,rot:0,scale:c.hw*2/.9})));};
const baseFurn=OW.furn;OW.furn=function(t){if(t==='__col')return{w:.9,d:.9,floor:false,surface:false};return baseFurn.apply(this,arguments);};
/* ---------- playing the instruments: pick one off the wall, your avatar holds it, pads make real sounds (heard on your phone only) ---------- */
let AC=null,master=null;
function audio(){if(!AC){const C=window.AudioContext||window.webkitAudioContext;if(!C)return null;AC=new C();master=AC.createGain();master.gain.value=.7;const cp=AC.createDynamicsCompressor();master.connect(cp);cp.connect(AC.destination);}if(AC.state==='suspended')AC.resume();return AC;}
const ksCache={};
function ksBuf(f){const k=Math.round(f);if(ksCache[k])return ksCache[k];const sr=AC.sampleRate,len=Math.floor(sr*1.9),N=Math.max(2,Math.round(sr/f)),b=AC.createBuffer(1,len,sr),d=b.getChannelData(0),ring=new Float32Array(N);
  for(let i=0;i<N;i++)ring[i]=Math.random()*2-1;let p=0;for(let i=0;i<len;i++){const n=(p+1)%N,v=(ring[p]+ring[n])*.5*.9965;ring[p]=v;d[i]=v*(1-i/len*.35);p=n;}return ksCache[k]=b;}
const CH={Am:[110,164.8,220,261.6,329.6,220],C:[130.8,164.8,196,261.6,329.6,392],G:[98,123.5,146.8,196,246.9,392],Em:[82.4,123.5,164.8,196,246.9,329.6]};
function strum(ch,up){const a=audio();if(!a)return;const fs=CH[ch]||CH.Am,t0=a.currentTime;(up?fs.slice().reverse():fs).forEach((f,i)=>{const s=a.createBufferSource();s.buffer=ksBuf(f);const g=a.createGain();g.gain.value=.34;s.connect(g);g.connect(master);s.start(t0+i*.032);});}
function drum(hi,glide){const a=audio();if(!a)return;const t=a.currentTime,o=a.createOscillator(),g=a.createGain(),f=hi?300:170;o.type='sine';o.frequency.setValueAtTime(f*(glide?.7:1),t);
  if(glide){o.frequency.linearRampToValueAtTime(f*1.5,t+.16);o.frequency.linearRampToValueAtTime(f*.9,t+.5);}else{o.frequency.exponentialRampToValueAtTime(f*.78,t+.35);}
  g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.9,t+.008);g.gain.exponentialRampToValueAtTime(.0001,t+(glide?.62:.42));o.connect(g);g.connect(master);o.start(t);o.stop(t+.7);
  const nb=a.createBuffer(1,Math.floor(a.sampleRate*.05),a.sampleRate),nd=nb.getChannelData(0);for(let i=0;i<nd.length;i++)nd[i]=(Math.random()*2-1)*(1-i/nd.length);const ns=a.createBufferSource();ns.buffer=nb;const nf=a.createBiquadFilter();nf.type='bandpass';nf.frequency.value=1800;const ng=a.createGain();ng.gain.value=.5;ns.connect(nf);nf.connect(ng);ng.connect(master);ns.start(t);}
function shake(n){const a=audio();if(!a)return;const t=a.currentTime;for(let i=0;i<(n||3);i++){const nb=a.createBuffer(1,Math.floor(a.sampleRate*.11),a.sampleRate),nd=nb.getChannelData(0);for(let k=0;k<nd.length;k++)nd[k]=(Math.random()*2-1)*Math.pow(1-k/nd.length,1.6);const s=a.createBufferSource();s.buffer=nb;const f=a.createBiquadFilter();f.type='bandpass';f.frequency.value=5200+i*500;f.Q.value=.9;const g=a.createGain();g.gain.value=.55;s.connect(f);f.connect(g);g.connect(master);s.start(t+i*.085);}}
const KAL=[523.3,587.3,659.3,784,880,1046.5,1174.7];
function kal(i){const a=audio();if(!a)return;const t=a.currentTime,f=KAL[i%KAL.length];[[1,.5,1.1],[4.02,.12,.35]].forEach(([m,v,dur])=>{const o=a.createOscillator(),g=a.createGain();o.type='sine';o.frequency.value=f*m;g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(v,t+.004);g.gain.exponentialRampToValueAtTime(.0001,t+dur);o.connect(g);g.connect(master);o.start(t);o.stop(t+dur+.05);});}

function bell(f){const a=audio();if(!a)return;const t=a.currentTime;[[1,.5,.7],[2.76,.28,.45],[5.4,.14,.25]].forEach(([m,v,d])=>{const o=a.createOscillator(),g=a.createGain();o.type='sine';o.frequency.value=f*m;g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(v,t+.003);g.gain.exponentialRampToValueAtTime(.0001,t+d);o.connect(g);g.connect(master);o.start(t);o.stop(t+d+.05);});}
function djem(kind){const a=audio();if(!a)return;const t=a.currentTime;if(kind==='bass'){drum(false);return;}
  const nb=a.createBuffer(1,Math.floor(a.sampleRate*.09),a.sampleRate),nd=nb.getChannelData(0);for(let i=0;i<nd.length;i++)nd[i]=(Math.random()*2-1)*Math.pow(1-i/nd.length,2);const s=a.createBufferSource();s.buffer=nb;const f=a.createBiquadFilter();f.type='bandpass';f.frequency.value=kind==='slap'?3200:1500;f.Q.value=1.2;const g=a.createGain();g.gain.value=.9;s.connect(f);f.connect(g);g.connect(master);s.start(t);
  const o=a.createOscillator(),og=a.createGain();o.frequency.setValueAtTime(kind==='slap'?420:260,t);o.frequency.exponentialRampToValueAtTime(180,t+.12);og.gain.setValueAtTime(.5,t);og.gain.exponentialRampToValueAtTime(.0001,t+.16);o.connect(og);og.connect(master);o.start(t);o.stop(t+.2);}
function udu(hole){const a=audio();if(!a)return;const t=a.currentTime,o=a.createOscillator(),g=a.createGain();o.type='sine';if(hole){o.frequency.setValueAtTime(190,t);o.frequency.exponentialRampToValueAtTime(70,t+.45);}else{o.frequency.setValueAtTime(260,t);o.frequency.exponentialRampToValueAtTime(210,t+.2);}
  g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.85,t+.01);g.gain.exponentialRampToValueAtTime(.0001,t+(hole?.7:.3));o.connect(g);g.connect(master);o.start(t);o.stop(t+.8);}
const FL=[392,440,523.3,587.3,659.3,784];
function flute(i){const a=audio();if(!a)return;const t=a.currentTime,f=FL[i%FL.length],o=a.createOscillator(),g=a.createGain(),lf=a.createOscillator(),lg=a.createGain();o.type='sine';o.frequency.value=f;lf.frequency.value=5.2;lg.gain.value=f*.007;lf.connect(lg);lg.connect(o.frequency);
  g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(.42,t+.07);g.gain.setValueAtTime(.4,t+.5);g.gain.linearRampToValueAtTime(.0001,t+.85);o.connect(g);g.connect(master);o.start(t);lf.start(t);o.stop(t+.9);lf.stop(t+.9);
  const nb=a.createBuffer(1,Math.floor(a.sampleRate*.85),a.sampleRate),nd=nb.getChannelData(0);for(let k=0;k<nd.length;k++)nd[k]=(Math.random()*2-1);const ns=a.createBufferSource();ns.buffer=nb;const nf=a.createBiquadFilter();nf.type='bandpass';nf.frequency.value=f*2;nf.Q.value=4;const ng=a.createGain();ng.gain.setValueAtTime(.0001,t);ng.gain.linearRampToValueAtTime(.06,t+.07);ng.gain.linearRampToValueAtTime(.0001,t+.85);ns.connect(nf);nf.connect(ng);ng.connect(master);ns.start(t);}

function css(){if(document.getElementById('gx-css'))return;const st=document.createElement('style');st.id='gx-css';st.textContent=
'.gx-info{position:absolute;inset:0;z-index:40;background:rgba(10,8,18,.62);display:flex;align-items:flex-end;justify-content:center}.gx-card{position:relative;width:100%;max-width:520px;max-height:92%;overflow:auto;background:#fbfaf6;border-radius:22px 22px 0 0;padding:14px 16px calc(18px + var(--sab,0px));box-shadow:0 -12px 40px rgba(0,0,0,.35)}'+
'.gx-x{position:absolute;top:10px;right:12px;z-index:3;width:38px;height:38px;border-radius:50%;background:rgba(20,17,31,.85);color:#fff;font-size:16px}'+
'.gx-stage{position:relative;display:flex;justify-content:center;background:radial-gradient(circle at 50% 40%,#fff,#e9e6dc);border-radius:16px;margin-top:6px;overflow:hidden}.gx-art{max-width:100%;max-height:44vh;width:auto;height:auto;aspect-ratio:4/5;object-fit:contain;padding:12px;box-sizing:border-box}'+
'.gx-cv{width:100%;height:40vh;display:block}.gx-hint{position:absolute;left:0;right:0;bottom:8px;text-align:center;font:600 12px var(--disp,system-ui);color:#6b6679;pointer-events:none}'+
'.gx-body h3{margin:12px 0 2px;font:800 22px var(--disp,system-ui);color:#15131c}.gx-sub{font:700 12px var(--disp,system-ui);color:#6c4bff;text-transform:uppercase;letter-spacing:.04em}.gx-body p{margin:8px 0 0;font:500 15px/1.5 var(--body,system-ui);color:#2c2838}'+
'.room.gx-on .joy,.room.gx-on .emobtn,.room.gx-on .emopop{display:none!important}.gx-pl{bottom:calc(100px + var(--sab,0px))!important;padding:0 14px;box-sizing:border-box}'+
'.gx-pl{position:absolute;left:0;right:0;bottom:calc(92px + var(--sab,0px));z-index:6;display:flex;flex-direction:column;align-items:center;gap:8px;pointer-events:none}.gx-pl *{pointer-events:auto}'+
'.gx-t{background:rgba(20,17,31,.82);color:#fff;border-radius:99px;padding:6px 14px;font:700 13px var(--disp,system-ui);backdrop-filter:blur(6px)}'+
'.gx-pads{display:flex;gap:8px;flex-wrap:wrap;justify-content:center;max-width:94vw}.gx-pad{min-width:62px;min-height:62px;border:2px solid rgba(255,255,255,.85);border-radius:18px;background:rgba(108,75,255,.88);color:#fff;font:800 15px var(--disp,system-ui);touch-action:manipulation;user-select:none;-webkit-user-select:none}'+
'.gx-pad:active{transform:scale(.94);background:#ff5a3c}.gx-pad.big{min-width:140px}.gx-pad.k{min-width:44px;min-height:92px;border-radius:12px;font-size:12px}';document.head.append(st);}
const LAB={djembe:'Djembe',udu:'Udu clay pot drum',agogo:'Agogo bells',flute:'Bamboo flute',guitar:'Guitar · tap a chord to strum',drum:'Talking drum',shekere:'Shekere',kalimba:'Kalimba'};
P.gxUi=function(kind){
  this.gxUiOff();css();const wrap=document.createElement('div');wrap.className='gx-pl';const pads=document.createElement('div');pads.className='gx-pads';
  const add=(txt,fn,cls)=>{const b=document.createElement('button');b.className='gx-pad'+(cls?' '+cls:'');b.textContent=txt;const go=e=>{e.preventDefault();fn();const m=this.me;if(m)m.av.act();this.markDirty(true);};b.addEventListener('pointerdown',go);pads.append(b);};
  if(kind==='guitar'){Object.keys(CH).forEach(c=>add(c,()=>strum(c)));add('↑ Up',()=>strum('Am',true));}
  else if(kind==='drum'){add('High',()=>drum(true),'big');add('Low',()=>drum(false),'big');add('Talk',()=>drum(true,true),'big');}
  else if(kind==='djembe'){add('Bass',()=>djem('bass'),'big');add('Tone',()=>djem('tone'),'big');add('Slap',()=>djem('slap'),'big');}
  else if(kind==='udu'){add('Hit',()=>udu(false),'big');add('Hole',()=>udu(true),'big');}
  else if(kind==='agogo'){add('Low bell',()=>bell(520),'big');add('High bell',()=>bell(780),'big');}
  else if(kind==='flute'){FL.forEach((f,i)=>add(String(i+1),()=>flute(i),'k'));}
  else if(kind==='shekere'){add('Shake',()=>shake(3),'big');add('Tap',()=>shake(1),'big');}
  else{KAL.forEach((f,i)=>add(String(i+1),()=>kal(i),'k'));}
  const t=document.createElement('div');t.className='gx-t';t.textContent=LAB[kind]+' · only you hear it';wrap.append(t,pads);this.host.append(wrap);this._gxEl=wrap;};
P.gxUiOff=function(){if(this._gxEl){this._gxEl.remove();this._gxEl=null;}};
/* hold position and orientation of each instrument relative to the avatar (facing +z) */
const HOLD={
  guitar:{p:[.10,1.147,.3],r:[0,0,-1.15],s:.82,pose:'strum',L:[.40,1.27,.33],R:[-.03,1.08,.37],mo:{R:[0,.07,0]}},
  drum:{p:[.14,1.0,.18],r:[0,0,1.25],s:.85,pose:'drum',L:[.22,.97,.31],R:[-.12,1.17,.38],mo:{R:[0,.05,.05]}},
  shekere:{p:[0,1.12,.34],r:[0,0,0],s:.8,pose:'shake',L:[.19,1.12,.34],R:[-.19,1.12,.34],mo:{L:[0,.09,0],R:[0,-.09,0]}},
  kalimba:{p:[0,1.05,.3],r:[-.9,0,0],s:1.25,pose:'kali',L:[.18,1.1,.37],R:[-.18,1.1,.37],mo:{L:[0,.01,0],R:[0,.01,0]}},
  djembe:{p:[0,.8,.36],r:[0,0,0],s:.9,pose:'pat',L:[.11,1.1,.36],R:[-.11,1.1,.36],mo:{L:[0,.06,0],R:[0,-.06,0]}},
  udu:{p:[0,.95,.34],r:[0,0,0],s:.75,pose:'pat',L:[.17,1.04,.4],R:[-.17,1.04,.4],mo:{R:[0,.06,0]}},
  agogo:{p:[.24,1.12,.24],r:[0,0,0],s:.72,pose:'drum',L:[.2,1.1,.38],R:[-.02,1.17,.4],mo:{R:[.05,0,0]}},
  flute:{p:[.22,1.5,.13],r:[0,0,1.5708],s:.75,pose:'flute',L:[.32,1.47,.18],R:[.12,1.46,.16],mo:{}}};
P.gxPlay=function(sp){
  const m=this.me;if(!m||this.seat)return;const H=HOLD[sp.kind];if(!H)return;
  m.x=sp.x+sp.nx*.8;m.z=sp.z+sp.nz*.8;const q=this.pushOut(m.x,m.z,.24,this.blockers());m.x=q[0];m.z=q[1];m.yaw=Math.atan2(sp.nx,sp.nz===0?0:sp.nz);if(sp.nz===0)m.yaw=sp.nx>0?PI/2:-PI/2;m.y=0;
  const k=m.av.scale||1,g=new T.Group();INSTR[sp.kind](g);g.traverse(o=>{if(o.name==='stick')o.visible=false;});g.scale.setScalar(H.s);g.position.set(H.p[0],H.p[1]*k,H.p[2]);g.rotation.set(...H.r);m.holder.add(g);this._held={g,sp};this.host.classList.add('gx-on');this.cb.onMusicHold&&this.cb.onMusicHold(true);m.av.setHold({L:H.L&&[H.L[0],H.L[1]*k,H.L[2]],R:H.R&&[H.R[0],H.R[1]*k,H.R[2]],mo:H.mo});sp.node.visible=false;this.cb.onMusicHold&&this.cb.onMusicHold(true);
  m.av.setPose(H.pose);m.pose=H.pose;this.seat={it:{id:'gx'},gx:true,front:[Math.sin(m.yaw),Math.cos(m.yaw)],d:.2};this.goal=null;this.placeFigure(m);this.setNear(null);this.nearId='';
  this.cb.onNear&&this.cb.onNear({act:{k:'stand',label:'Put back'}});this.gxUi(sp.kind);this.markDirty(true);};
P.gxStop=function(){
  const m=this.me,h=this._held;this.gxUiOff();this.host.classList.remove('gx-on');if(h){this.cb.onMusicHold&&this.cb.onMusicHold(false);h.sp.node.visible=true;if(m)m.holder.remove(h.g);h.g.traverse(o=>{if(o.geometry)o.geometry.dispose();});this._held=null;}
  if(m&&this.seat&&this.seat.gx){m.av.setHold(null);m.av.setPose('stand');m.pose='stand';}if(this.seat&&this.seat.gx)this.seat=null;this.nearId='x';this.setNear(null);this.markDirty(true);};
const baseStand=P.standUp;P.standUp=function(){if(this.seat&&this.seat.gx)return this.gxStop();return baseStand.call(this);};
const baseStop=P.stopWalk;P.stopWalk=function(){if(this._held)this.gxStop();return baseStop.apply(this,arguments);};
const baseDestroy=P.destroy;if(baseDestroy)P.destroy=function(){this.gxUiOff();this.gxInfoOff();return baseDestroy.apply(this,arguments);};
/* near an instrument or speaker the usual action button appears */
const baseNear=P.nearest;P.nearest=function(){
  if(!this._house||!this.me||!this.spots)return baseNear.call(this);
  const m=this.me;let best=null,bd=1.7;this.spots.forEach(sp=>{if(sp.kind!=='speaker'&&this._held&&this._held.sp===sp)return;const d=Math.hypot(m.x-sp.x,m.z-sp.z);if(d<bd){bd=d;best=sp;}});
  return best?{it:{id:'gx:'+best.kind+best.x+best.z,kind:'gx',spot:best},act:{k:'gx',label:best.label}}:baseNear.call(this);};
const baseOf=P.interactOf;P.interactOf=function(it){if(it&&it.kind==='gx')return{k:'gx',label:it.spot.label};return baseOf.call(this,it);};
const baseInter=P.interact;P.interact=function(it,k){
  if(it&&it.kind==='gx'){const sp=it.spot;if(sp.kind==='speaker'){this.cb.onOpen&&this.cb.onOpen({type:'speaker',kind:'furniture',id:'house-speaker',link:'',title:'OpenWalls Gallery speaker'});return;}return this.gxPlay(sp);}
  return baseInter.call(this,it,k);};
/* tapping an instrument or speaker walks you to it and uses it */
const baseTap=P.walkTap;P.walkTap=function(it,e){
  if(this._house&&this.me&&!this.seat&&this._gxObjs){this.ray.setFromCamera(this.ndc(e),this.cam);const live=this._gxObjs.filter(o=>o.visible);const hit=this.ray.intersectObjects(live,true)[0];
    if(hit){let o=hit.object;while(o&&!o.userData.spot)o=o.parent;if(o){const sp=o.userData.spot,m=this.me,tx=sp.x+sp.nx*.8,tz=sp.z+sp.nz*.8,q=this.pushOut(tx,tz,.24,this.blockers());
      this.goal={x:q[0],z:q[1],t:0,stuck:0,lx:m.x,lz:m.z,then:{it:{id:'gx',kind:'gx',spot:sp},k:'gx'}};this.showMark(q[0],q[1]);return;}}}
  if(it&&it.kind==='gxinfo'){if(this.seat&&this.seat.gx)return;this.gxInfo(it.info);return;}
  return baseTap.call(this,it,e);};

/* ----- tap a work, an object or an instrument to read about it (objects and instruments can be turned in 3D) ----- */
const vis=o=>{while(o){if(!o.visible)return false;o=o.parent;}return true;};
const basePick=P.pickItem;P.pickItem=function(e){
  if(this._house&&!this.edit){this.ray.setFromCamera(this.ndc(e),this.cam);const hits=this.ray.intersectObjects([this.shell,this.root],true);
    for(const h of hits){if(!vis(h.object))continue;
      let o=h.object;while(o&&!o.userData.info)o=o.parent;if(o)return{kind:'gxinfo',id:'gxi:'+o.userData.info.kind+o.userData.info.key,info:o.userData.info};
      if(h.object.geometry&&h.object.geometry.type!=='PlaneGeometry')break;}}
  return basePick.call(this,e);};
P.gxInfo=function(inf){
  css();this.gxInfoOff();const d=INFO[inf.kind][inf.key];if(!d)return;
  const bg=document.createElement('div');bg.className='gx-info';const card=document.createElement('div');card.className='gx-card';bg.append(card);
  const close=document.createElement('button');close.className='gx-x';close.setAttribute('aria-label','Close');close.textContent='✕';close.onclick=()=>this.gxInfoOff();
  const body=document.createElement('div');body.className='gx-body';
  const t=document.createElement('h3');t.textContent=d[0];const sb=document.createElement('div');sb.className='gx-sub';sb.textContent=d[1];const tx=document.createElement('p');tx.textContent=d[2];
  const stage=document.createElement('div');stage.className='gx-stage';
  if(inf.kind==='art'){const c=document.createElement('canvas');if(PHOTO.includes(inf.key)){const im=document.createElement('img');im.src='assets/gallery/'+inf.key+'.jpg';im.className='gx-art';im.alt=d[0];stage.append(im);}else{c.width=400;c.height=500;ART[inf.key](c.getContext('2d'),400,500);c.className='gx-art';stage.append(c);}}
  else{const hint=document.createElement('div');hint.className='gx-hint';hint.textContent='Drag to turn · pinch or scroll to zoom';stage.append(hint);this._gxInspect=inspect(stage,inf);}
  body.append(t,sb,tx);card.append(close,stage,body);this.host.append(bg);this._gxInfoEl=bg;};
P.gxInfoOff=function(){if(this._gxInspect){this._gxInspect.stop();this._gxInspect=null;}if(this._gxInfoEl){this._gxInfoEl.remove();this._gxInfoEl=null;}};
function inspect(stage,inf){
  const cv=document.createElement('canvas');cv.className='gx-cv';stage.prepend(cv);
  let r;try{r=new T.WebGLRenderer({canvas:cv,antialias:true,alpha:true});}catch(e){return{stop(){}};}
  r.setPixelRatio(Math.min(window.devicePixelRatio||1,1.75));r.outputEncoding=T.sRGBEncoding;
  const sc=new T.Scene(),cam=new T.PerspectiveCamera(36,1,.05,50);sc.add(new T.HemisphereLight(0xffffff,0x8a8a92,.95));const dl=new T.DirectionalLight(0xffffff,.9);dl.position.set(2,3,2.5);sc.add(dl);const dl2=new T.DirectionalLight(0xffeedd,.35);dl2.position.set(-2,1,-2);sc.add(dl2);
  const pivot=new T.Group(),obj=new T.Group();pivot.add(obj);sc.add(pivot);(inf.kind==='obj'?OBJ:INSTR)[inf.key](obj);
  obj.traverse(o=>{if(o.name==='stick')o.visible=true;});
  const bb=new T.Box3().setFromObject(obj),ctr=bb.getCenter(new T.Vector3()),sz=bb.getSize(new T.Vector3()),m=Math.max(sz.x,sz.y,sz.z)||1;
  obj.position.sub(ctr);pivot.scale.setScalar(1.5/m);
  let yaw=-.6,pit=.18,dist=4.2,auto=true,run=true;const ptr=new Map();let pd=0;
  const size=()=>{const w=stage.clientWidth||300,h=stage.clientHeight||300;r.setSize(w,h,false);cam.aspect=w/h;cam.updateProjectionMatrix();};
  const draw=()=>{if(!run)return;if(auto)yaw+=.006;pivot.rotation.set(pit,yaw,0);cam.position.set(0,0,dist);cam.lookAt(0,0,0);r.render(sc,cam);raf=requestAnimationFrame(draw);};let raf=0;
  cv.style.touchAction='none';
  cv.addEventListener('pointerdown',e=>{cv.setPointerCapture(e.pointerId);ptr.set(e.pointerId,[e.clientX,e.clientY]);auto=false;pd=0;});
  cv.addEventListener('pointermove',e=>{const p=ptr.get(e.pointerId);if(!p)return;if(ptr.size===2){const a=[...ptr.values()],o=Math.hypot(a[0][0]-a[1][0],a[0][1]-a[1][1]);ptr.set(e.pointerId,[e.clientX,e.clientY]);const b=[...ptr.values()],n=Math.hypot(b[0][0]-b[1][0],b[0][1]-b[1][1]);dist=Math.max(2.2,Math.min(7,dist*(o/(n||o))));return;}
    yaw+=(e.clientX-p[0])*.012;pit=Math.max(-1.2,Math.min(1.2,pit+(e.clientY-p[1])*.01));ptr.set(e.pointerId,[e.clientX,e.clientY]);});
  const up=e=>{ptr.delete(e.pointerId);};cv.addEventListener('pointerup',up);cv.addEventListener('pointercancel',up);
  cv.addEventListener('wheel',e=>{e.preventDefault();auto=false;dist=Math.max(2.2,Math.min(7,dist*(1+e.deltaY*.001)));},{passive:false});
  size();const ro=window.ResizeObserver?new ResizeObserver(size):null;if(ro)ro.observe(stage);draw();
  return{stop(){run=false;cancelAnimationFrame(raf);if(ro)ro.disconnect();obj.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material){const ms=Array.isArray(o.material)?o.material:[o.material];ms.forEach(mm=>{if(mm.map)mm.map.dispose();mm.dispose();});}});r.dispose();try{r.forceContextLoss();}catch(e){}cv.remove();}};}
})();
