/* ---------- Gist & Paint: a painting studio inside a Space ----------
   - every seated person has their own canvas (a 2D canvas used as the live texture of the 3D canvas)
   - strokes are batched over a realtime broadcast channel (pt:<space>) and saved to the database (paint_canvases)
   - the host chooses the reference picture, starts / pauses the session; everyone paints their own version */
const OWPaint=(()=>{
const T=THREE,PAPER='#fffdf8',CW=512,CH=640;
const COLS=[['Red','#e63946'],['Blue','#2d6cdf'],['Yellow','#ffd23f'],['Green','#2bb673'],['Purple','#7b4dff'],['Orange','#ff8a1f'],['Black','#1a1a1f'],['White','#ffffff'],['Brown','#8b5a3c'],['Pink','#ff6fae']];
const STATES=['Painting','Almost done','Completed'];
const REFS=[['sunset','Palm sunset'],['flowers','Flower vase'],['mountains','Mountain lake'],['city','City at night'],['abstract','Colour circles'],['cat','Sleepy cat'],['sunflower','Sunflower'],['fish','Goldfish bowl'],['house','Cosy house'],['rocket','Rocket in space'],['moonsea','Moonlit sea'],['dunes','Desert dunes'],['gele','Gele portrait'],['fluid','Fluid colour'],['monstera','Monstera leaves'],['deco','Art-deco sunrise'],['vinyl','Vinyl night'],['pines','Misty pines'],['neonrain','Neon rain street'],['bridge','Lagoon bridge dusk'],['pfox','Fox in the snow'],['pbirds','Lovebirds on a branch'],['pwine','Wine pour'],['pcup','Coffee and succulents'],['pelephant','Elephant at sunset'],['psea','Seaside table'],['ptrio','Three little birds'],['plips','Bold lips'],['pqueen','Crowned queen'],['pface','Cubist face'],['ppanda','Panda and balloons'],['pvan','Yellow camper van'],['pcocktail','Hibiscus cocktail'],['pwinter','Winter lights'],['balloon','Hot-air balloon']];

/* ---------------- reference pictures (drawn in code, 400 x 500) ---------------- */
const lin=(g,x0,y0,x1,y1,stops)=>{const l=g.createLinearGradient(x0,y0,x1,y1);stops.forEach(([o,c])=>l.addColorStop(o,c));return l;};

/* ---- painterly helpers: acrylic-style brush texture so the reference pictures look hand painted ---- */
const SR=seed=>{let x=seed*9301+49297;return()=>{x=(x*9301+49297)%233280;return x/233280;};};
const SH=(c,d)=>{const n=parseInt(c.slice(1),16),f=v=>Math.max(0,Math.min(255,v+d));return 'rgb('+f(n>>16)+','+f((n>>8)&255)+','+f(n&255)+')';};
function wash(g,w,h,stops,seed,ang){const r=SR(seed||3);g.fillStyle=lin(g,0,0,ang?w:0,h,stops);g.fillRect(0,0,w,h);
  for(let i=0;i<260;i++){const y=r()*h,x=r()*w,l=40+r()*110,a=(ang||0)+(r()-.5)*.25;g.strokeStyle=r()>.5?'rgba(255,255,255,.045)':'rgba(0,0,0,.035)';g.lineWidth=8+r()*20;g.lineCap='round';g.beginPath();g.moveTo(x,y);g.lineTo(x+Math.cos(a)*l,y+Math.sin(a)*l);g.stroke();}}
function pt(g,shape,col,o){o=o||{};const r=SR(o.seed||7),b=o.b||[0,0,400,500],n=o.n||70;g.save();g.beginPath();shape(g);g.clip();g.fillStyle=col;g.fill();
  for(let i=0;i<n;i++){const x=b[0]+r()*b[2],y=b[1]+r()*b[3],l=14+r()*(o.len||44),a=(o.a==null?-.7:o.a)+(r()-.5)*.7;g.strokeStyle=SH(col,(r()-.5)*(o.v||56));g.globalAlpha=.4;g.lineWidth=4+r()*(o.wd||9);g.lineCap='round';g.beginPath();g.moveTo(x,y);g.lineTo(x+Math.cos(a)*l,y+Math.sin(a)*l);g.stroke();}
  g.globalAlpha=1;g.restore();if(o.line){g.save();g.beginPath();shape(g);g.strokeStyle=o.line;g.lineWidth=o.lw||3;g.lineJoin='round';g.stroke();g.restore();}}
const EL=(x,y,rx,ry,rot)=>g=>{g.ellipse(x,y,rx,ry,rot||0,0,7);};
const TRI=(a,b,c,d,e,f)=>g=>{g.moveTo(a,b);g.lineTo(c,d);g.lineTo(e,f);g.closePath();};
function tex(g,w,h){const r=SR(11);for(let i=0;i<5200;i++){g.fillStyle=r()>.5?'rgba(255,255,255,.05)':'rgba(0,0,0,.05)';g.fillRect(r()*w,r()*h,1.4,1.4);}
  g.strokeStyle='rgba(0,0,0,.03)';g.lineWidth=1;for(let x=0;x<w;x+=5){g.beginPath();g.moveTo(x,0);g.lineTo(x,h);g.stroke();}for(let y=0;y<h;y+=5){g.beginPath();g.moveTo(0,y);g.lineTo(w,y);g.stroke();}}
const bokeh=(g,w,h,seed,n)=>{const r=SR(seed);for(let i=0;i<n;i++){g.fillStyle='rgba(255,255,255,'+(.15+r()*.35)+')';g.beginPath();g.arc(r()*w,r()*h*.8,3+r()*9,0,7);g.fill();}};
const REFDRAW={
 sunset(g,w,h){g.fillStyle=lin(g,0,0,0,h*.66,[[0,'#3b1f8f'],[.45,'#c0398f'],[.75,'#ff7a3d'],[1,'#ffd34d']]);g.fillRect(0,0,w,h);
  g.fillStyle='#fff2a0';g.beginPath();g.arc(w*.55,h*.62,w*.13,0,7);g.fill();
  g.fillStyle=lin(g,0,h*.64,0,h,[[0,'#2a2a9a'],[1,'#0f1450']]);g.fillRect(0,h*.64,w,h*.36);
  g.strokeStyle='#ffd34d';g.lineCap='round';for(let i=0;i<9;i++){g.lineWidth=3+i*.5;g.globalAlpha=.8-i*.07;g.beginPath();const y=h*.67+i*h*.03,half=w*(.1-i*.008);g.moveTo(w*.55-half,y);g.lineTo(w*.55+half,y);g.stroke();}g.globalAlpha=1;
  g.fillStyle='#14102b';g.fillRect(0,h*.9,w,h*.1);
  g.strokeStyle='#14102b';g.lineWidth=11;g.beginPath();g.moveTo(w*.24,h*.92);g.quadraticCurveTo(w*.27,h*.55,w*.3,h*.3);g.stroke();
  g.lineWidth=7;[[-.2,.08],[-.14,-.02],[.0,-.06],[.14,-.02],[.2,.08],[-.1,.14],[.1,.14]].forEach(([dx,dy])=>{g.beginPath();g.moveTo(w*.3,h*.3);g.quadraticCurveTo(w*(.3+dx*.55),h*(.26+dy-.08),w*(.3+dx),h*(.3+dy+.06));g.stroke();});},
 flowers(g,w,h){g.fillStyle='#ffe9d6';g.fillRect(0,0,w,h);g.fillStyle='#d9b99b';g.fillRect(0,h*.82,w,h*.18);
  g.strokeStyle='#2f9e5b';g.lineWidth=6;[[.3,.3],[.5,.22],[.7,.32],[.4,.4],[.6,.42]].forEach(([x,y])=>{g.beginPath();g.moveTo(w*.5,h*.72);g.quadraticCurveTo(w*(x+.5)/2,h*(y+.6)/2,w*x,h*y);g.stroke();});
  [['#ff6fae',.3,.3],['#ffd23f',.5,.22],['#ff8a1f',.7,.32],['#7b4dff',.4,.4],['#e63946',.6,.42]].forEach(([c,x,y])=>{g.fillStyle=c;for(let i=0;i<7;i++){g.beginPath();g.ellipse(w*x+Math.cos(i*.9)*w*.06,h*y+Math.sin(i*.9)*w*.06,w*.045,w*.03,i*.9,0,7);g.fill();}g.fillStyle='#fff3b0';g.beginPath();g.arc(w*x,h*y,w*.025,0,7);g.fill();});
  g.fillStyle=lin(g,0,h*.66,w,h*.9,[[0,'#2d6cdf'],[1,'#1b3f99']]);g.beginPath();g.moveTo(w*.32,h*.66);g.lineTo(w*.68,h*.66);g.quadraticCurveTo(w*.76,h*.8,w*.64,h*.85);g.lineTo(w*.36,h*.85);g.quadraticCurveTo(w*.24,h*.8,w*.32,h*.66);g.fill();},
 mountains(g,w,h){g.fillStyle=lin(g,0,0,0,h*.6,[[0,'#8ec5ff'],[1,'#ffe3c2']]);g.fillRect(0,0,w,h);g.fillStyle='#fff6c9';g.beginPath();g.arc(w*.75,h*.2,w*.07,0,7);g.fill();
  g.fillStyle='#6b57c9';g.beginPath();g.moveTo(0,h*.6);g.lineTo(w*.3,h*.25);g.lineTo(w*.6,h*.6);g.fill();g.fillStyle='#4a3a9a';g.beginPath();g.moveTo(w*.35,h*.6);g.lineTo(w*.7,h*.3);g.lineTo(w,h*.6);g.fill();
  g.fillStyle='#fff';g.beginPath();g.moveTo(w*.3,h*.25);g.lineTo(w*.24,h*.34);g.lineTo(w*.36,h*.34);g.fill();
  g.fillStyle=lin(g,0,h*.6,0,h,[[0,'#4aa3d8'],[1,'#1c5a96']]);g.fillRect(0,h*.6,w,h*.4);g.globalAlpha=.35;g.fillStyle='#4a3a9a';g.beginPath();g.moveTo(w*.35,h*.6);g.lineTo(w*.7,h*.82);g.lineTo(w,h*.6);g.fill();g.globalAlpha=1;
  g.fillStyle='#1f6b46';[[.08,.6],[.16,.62],[.9,.6]].forEach(([x,y])=>{g.beginPath();g.moveTo(w*x,h*(y-.14));g.lineTo(w*(x-.05),h*y);g.lineTo(w*(x+.05),h*y);g.fill();});},
 city(g,w,h){g.fillStyle=lin(g,0,0,0,h,[[0,'#10163f'],[1,'#5b3fd4']]);g.fillRect(0,0,w,h);g.fillStyle='#fff6c9';g.beginPath();g.arc(w*.8,h*.15,w*.06,0,7);g.fill();
  const bs=[[.02,.5,.14],[.16,.35,.12],[.28,.55,.16],[.44,.3,.13],[.57,.48,.15],[.72,.38,.12],[.84,.52,.14]];bs.forEach(([x,y,bw],i)=>{g.fillStyle=i%2?'#1b1f4f':'#262a66';g.fillRect(w*x,h*y,w*bw,h*(1-y));g.fillStyle='#ffd34d';for(let r=0;r<9;r++)for(let c=0;c<3;c++)if((r*7+c*3+i)%3){g.fillRect(w*x+w*bw*(.15+c*.28),h*y+h*.03+r*h*.045,w*bw*.14,h*.025);}});},
 abstract(g,w,h){g.fillStyle='#fff4e0';g.fillRect(0,0,w,h);g.globalAlpha=.8;[['#ff6fae',.3,.3,.2],['#ffd23f',.62,.25,.17],['#2d6cdf',.5,.52,.24],['#2bb673',.25,.68,.17],['#ff8a1f',.72,.7,.2],['#7b4dff',.45,.85,.13]].forEach(([c,x,y,r])=>{g.fillStyle=c;g.beginPath();g.arc(w*x,h*y,w*r,0,7);g.fill();});g.globalAlpha=1;},
 cat(g,w,h){g.fillStyle='#ffd6e8';g.fillRect(0,0,w,h);g.fillStyle='#8a5a8f';g.fillRect(0,h*.85,w,h*.15);
  g.fillStyle='#f29a3d';g.beginPath();g.ellipse(w*.5,h*.68,w*.3,h*.2,0,0,7);g.fill();g.beginPath();g.arc(w*.5,h*.42,w*.24,0,7);g.fill();
  g.beginPath();g.moveTo(w*.29,h*.3);g.lineTo(w*.31,h*.14);g.lineTo(w*.44,h*.24);g.fill();g.beginPath();g.moveTo(w*.71,h*.3);g.lineTo(w*.69,h*.14);g.lineTo(w*.56,h*.24);g.fill();
  g.strokeStyle='#5a3414';g.lineWidth=5;g.lineCap='round';g.beginPath();g.arc(w*.4,h*.42,w*.04,.2,Math.PI-.2);g.stroke();g.beginPath();g.arc(w*.6,h*.42,w*.04,.2,Math.PI-.2);g.stroke();
  g.fillStyle='#ff6f91';g.beginPath();g.arc(w*.5,h*.48,w*.02,0,7);g.fill();g.strokeStyle='#5a3414';g.lineWidth=4;[[-1,-.01],[-1,.02],[1,-.01],[1,.02]].forEach(([s,d])=>{g.beginPath();g.moveTo(w*(.5+s*.05),h*(.49+d));g.lineTo(w*(.5+s*.16),h*(.47+d*2));g.stroke();});
  g.strokeStyle='#f29a3d';g.lineWidth=16;g.beginPath();g.moveTo(w*.78,h*.72);g.quadraticCurveTo(w*.95,h*.6,w*.86,h*.46);g.stroke();}
,
 sunflower(g,w,h){g.fillStyle=lin(g,0,0,0,h,[[0,'#bfe8ff'],[1,'#fff6d6']]);g.fillRect(0,0,w,h);g.fillStyle='#7bc96f';g.fillRect(0,h*.88,w,h*.12);
  g.strokeStyle='#2f9e5b';g.lineWidth=12;g.beginPath();g.moveTo(w*.5,h*.9);g.quadraticCurveTo(w*.46,h*.7,w*.5,h*.42);g.stroke();
  g.fillStyle='#3fae66';[[-1,.72],[1,.64]].forEach(([s,y])=>{g.beginPath();g.ellipse(w*(.5+s*.12),h*y,w*.12,h*.04,s*-.5,0,7);g.fill();});
  g.fillStyle='#ffc61a';for(let i=0;i<16;i++){const a=i/16*Math.PI*2;g.beginPath();g.ellipse(w*.5+Math.cos(a)*w*.2,h*.4+Math.sin(a)*w*.2,w*.1,w*.045,a,0,7);g.fill();}
  g.fillStyle='#ffa000';for(let i=0;i<16;i++){const a=i/16*Math.PI*2+.2;g.beginPath();g.ellipse(w*.5+Math.cos(a)*w*.14,h*.4+Math.sin(a)*w*.14,w*.07,w*.03,a,0,7);g.fill();}
  g.fillStyle='#5a3414';g.beginPath();g.arc(w*.5,h*.4,w*.12,0,7);g.fill();g.fillStyle='#3d220d';for(let i=0;i<14;i++){g.beginPath();g.arc(w*.5+Math.cos(i*2.4)*w*.01*i*.6,h*.4+Math.sin(i*2.4)*w*.01*i*.6,3,0,7);g.fill();}},
 fish(g,w,h){g.fillStyle=lin(g,0,0,0,h,[[0,'#d8f3ff'],[1,'#fff4e0']]);g.fillRect(0,0,w,h);g.fillStyle='#b98a5e';g.fillRect(0,h*.86,w,h*.14);
  g.fillStyle='rgba(120,200,240,.55)';g.beginPath();g.arc(w*.5,h*.56,w*.34,0,7);g.fill();g.strokeStyle='#7ab8d8';g.lineWidth=6;g.stroke();
  g.fillStyle='#d9b27a';g.beginPath();g.ellipse(w*.5,h*.8,w*.3,h*.04,0,0,Math.PI);g.fill();
  g.fillStyle='#ff8a1f';g.beginPath();g.ellipse(w*.48,h*.55,w*.13,h*.065,0,0,7);g.fill();g.beginPath();g.moveTo(w*.6,h*.55);g.lineTo(w*.72,h*.48);g.lineTo(w*.72,h*.62);g.fill();
  g.fillStyle='#fff';g.beginPath();g.arc(w*.42,h*.535,6,0,7);g.fill();g.fillStyle='#14102b';g.beginPath();g.arc(w*.42,h*.535,3,0,7);g.fill();
  g.strokeStyle='#fff';g.lineWidth=3;[[.3,.4,8],[.34,.34,6],[.3,.28,5]].forEach(([x,y,r])=>{g.beginPath();g.arc(w*x,h*y,r,0,7);g.stroke();});
  g.strokeStyle='#2bb673';g.lineWidth=7;[.38,.5,.62].forEach((x,i)=>{g.beginPath();g.moveTo(w*x,h*.8);g.quadraticCurveTo(w*(x+.04),h*(.7-i*.02),w*x,h*(.66-i*.02));g.stroke();});},
 house(g,w,h){g.fillStyle=lin(g,0,0,0,h*.7,[[0,'#8ec5ff'],[1,'#e8f6ff']]);g.fillRect(0,0,w,h);g.fillStyle='#7bc96f';g.fillRect(0,h*.7,w,h*.3);
  g.fillStyle='#fff6c9';g.beginPath();g.arc(w*.82,h*.14,w*.07,0,7);g.fill();
  g.fillStyle='#ffe2b8';g.fillRect(w*.22,h*.45,w*.5,h*.28);g.fillStyle='#d9503f';g.beginPath();g.moveTo(w*.16,h*.46);g.lineTo(w*.47,h*.27);g.lineTo(w*.78,h*.46);g.fill();
  g.fillStyle='#8a5a3b';g.fillRect(w*.41,h*.58,w*.12,h*.15);g.fillStyle='#8ec5ff';g.fillRect(w*.27,h*.52,w*.1,h*.09);g.fillRect(w*.58,h*.52,w*.1,h*.09);
  g.fillStyle='#8a5a3b';g.fillRect(w*.86,h*.55,w*.04,h*.2);g.fillStyle='#2f9e5b';g.beginPath();g.arc(w*.88,h*.5,w*.1,0,7);g.fill();
  g.fillStyle='#e8d9c0';g.fillRect(w*.1,h*.74,w*.8,h*.02);g.fillStyle='#ff6fae';[.2,.3,.62,.72].forEach(x=>{g.beginPath();g.arc(w*x,h*.78,7,0,7);g.fill();});},
 rocket(g,w,h){g.fillStyle=lin(g,0,0,0,h,[[0,'#0b0b2e'],[1,'#3a1c7a']]);g.fillRect(0,0,w,h);g.fillStyle='#fff';for(let i=0;i<30;i++){g.beginPath();g.arc((i*97%100)/100*w,(i*61%90)/100*h,1.5+i%3,0,7);g.fill();}
  g.fillStyle='#ffb04a';g.beginPath();g.arc(w*.2,h*.78,w*.1,0,7);g.fill();g.fillStyle='#6fd0ff';g.beginPath();g.arc(w*.8,h*.25,w*.06,0,7);g.fill();
  g.save();g.translate(w*.52,h*.45);g.rotate(.35);g.fillStyle='#ff7a3d';g.beginPath();g.moveTo(-w*.07,h*.18);g.lineTo(0,h*.38);g.lineTo(w*.07,h*.18);g.fill();
  g.fillStyle='#e8eaf6';g.beginPath();g.moveTo(0,-h*.22);g.quadraticCurveTo(w*.13,-h*.06,w*.1,h*.2);g.lineTo(-w*.1,h*.2);g.quadraticCurveTo(-w*.13,-h*.06,0,-h*.22);g.fill();
  g.fillStyle='#ff3d5a';g.beginPath();g.moveTo(0,-h*.22);g.quadraticCurveTo(w*.06,-h*.17,w*.075,-h*.12);g.lineTo(-w*.075,-h*.12);g.quadraticCurveTo(-w*.06,-h*.17,0,-h*.22);g.fill();
  g.fillStyle='#ff3d5a';g.beginPath();g.moveTo(-w*.1,h*.08);g.lineTo(-w*.2,h*.22);g.lineTo(-w*.1,h*.2);g.fill();g.beginPath();g.moveTo(w*.1,h*.08);g.lineTo(w*.2,h*.22);g.lineTo(w*.1,h*.2);g.fill();
  g.fillStyle='#3b82f6';g.beginPath();g.arc(0,0,w*.055,0,7);g.fill();g.strokeStyle='#fff';g.lineWidth=5;g.stroke();g.restore();},
 moonsea(g,w,h){g.fillStyle=lin(g,0,0,0,h,[[0,'#050a24'],[.55,'#16306b'],[1,'#0a1a3d']]);g.fillRect(0,0,w,h);
  g.fillStyle='#f6f1d8';g.beginPath();g.arc(w*.68,h*.24,w*.1,0,7);g.fill();g.fillStyle='rgba(246,241,216,.12)';g.beginPath();g.arc(w*.68,h*.24,w*.17,0,7);g.fill();
  for(let i=0;i<40;i++){g.fillStyle='rgba(255,255,255,'+(.3+.5*((i*37)%10)/10)+')';g.fillRect((i*97)%w,(i*53)%(h*.4),2,2);}
  g.fillStyle='#0b1c45';g.fillRect(0,h*.52,w,h*.48);
  for(let i=0;i<14;i++){g.strokeStyle='rgba(246,241,216,'+(.55-i*.035)+')';g.lineWidth=3;const y=h*.54+i*h*.03,ww=w*(.08+i*.02);g.beginPath();g.moveTo(w*.68-ww,y);g.lineTo(w*.68+ww,y);g.stroke();}
  g.strokeStyle='#1f3f85';g.lineWidth=4;for(let i=0;i<8;i++){const y=h*.58+i*h*.05;g.beginPath();g.moveTo(0,y);for(let x=0;x<=w;x+=20)g.lineTo(x,y+Math.sin(x/28+i)*6);g.stroke();}},
 dunes(g,w,h){g.fillStyle=lin(g,0,0,0,h*.6,[[0,'#f6c28b'],[.6,'#ee8a5b'],[1,'#c4565a']]);g.fillRect(0,0,w,h);
  g.fillStyle='#fff1c9';g.beginPath();g.arc(w*.3,h*.3,w*.09,0,7);g.fill();
  [['#a8453f',.52],['#8e3a3d',.62],['#6b2c36',.74],['#471e2e',.88]].forEach(([c,y],i)=>{g.fillStyle=c;g.beginPath();g.moveTo(0,h);g.lineTo(0,h*y);g.bezierCurveTo(w*.3,h*(y-.1+i*.01),w*.55,h*(y+.06),w,h*(y-.06));g.lineTo(w,h);g.fill();});},
 fluid(g,w,h){g.fillStyle='#0f1b3c';g.fillRect(0,0,w,h);const cols=['#ff4d6d','#ff9f1c','#ffd166','#06d6a0','#118ab2','#7b2ff7'];
  cols.forEach((c,i)=>{g.strokeStyle=c;g.lineWidth=46;g.lineCap='round';g.beginPath();g.moveTo(-20,h*(.1+i*.15));g.bezierCurveTo(w*.3,h*(i*.15-.1),w*.6,h*(i*.15+.35),w+20,h*(.05+i*.14));g.stroke();});
  g.strokeStyle='rgba(255,255,255,.35)';g.lineWidth=3;for(let i=0;i<6;i++){g.beginPath();g.moveTo(-20,h*(.08+i*.15));g.bezierCurveTo(w*.3,h*(i*.15-.12),w*.6,h*(i*.15+.33),w+20,h*(.03+i*.14));g.stroke();}},
 monstera(g,w,h){g.fillStyle=lin(g,0,0,w,h,[[0,'#06303a'],[1,'#0b4d3f']]);g.fillRect(0,0,w,h);
  const leaf=(x,y,s,r,c)=>{g.save();g.translate(x,y);g.rotate(r);g.fillStyle=c;g.beginPath();g.moveTo(0,0);g.bezierCurveTo(-s*.9,-s*.2,-s*.9,-s*1.1,0,-s*1.2);g.bezierCurveTo(s*.9,-s*1.1,s*.9,-s*.2,0,0);g.fill();
   g.strokeStyle='#06303a';g.lineWidth=5;g.beginPath();g.moveTo(0,0);g.lineTo(0,-s*1.1);g.stroke();for(let k=1;k<5;k++){g.beginPath();g.moveTo(0,-s*.22*k);g.lineTo(-s*.5,-s*(.22*k+.12));g.moveTo(0,-s*.22*k);g.lineTo(s*.5,-s*(.22*k+.12));g.stroke();}g.restore();};
  leaf(w*.3,h*.95,w*.5,-.5,'#1f9d6b');leaf(w*.72,h*.9,w*.46,.45,'#2fb67c');leaf(w*.5,h*.7,w*.4,.05,'#52d49a');leaf(w*.12,h*.5,w*.3,-1,'#17805a');leaf(w*.9,h*.45,w*.3,.9,'#1b8f64');},
 deco(g,w,h){g.fillStyle='#10132e';g.fillRect(0,0,w,h);const cx=w/2,cy=h*.72;
  for(let i=0;i<13;i++){const a=Math.PI+i*Math.PI/12;g.fillStyle=i%2?'#e8b04b':'#b8862e';g.beginPath();g.moveTo(cx,cy);g.arc(cx,cy,w*.95,a-.1,a+.1);g.fill();}
  [.42,.32,.22].forEach((r,i)=>{g.fillStyle=['#10132e','#e8b04b','#10132e'][i];g.beginPath();g.arc(cx,cy,w*r,Math.PI,0);g.fill();g.strokeStyle='#e8b04b';g.lineWidth=5;g.stroke();});
  g.fillStyle='#e8b04b';g.fillRect(0,cy,w,6);g.fillStyle='#1b1f4a';g.fillRect(0,cy+6,w,h);for(let i=0;i<6;i++){g.strokeStyle='#e8b04b';g.lineWidth=3;g.beginPath();g.moveTo(w*(i/5),cy+6);g.lineTo(w*(i/5),h);g.stroke();}},
 vinyl(g,w,h){g.fillStyle=lin(g,0,0,w,h,[[0,'#ff6b3d'],[1,'#8b1e5a']]);g.fillRect(0,0,w,h);const cx=w*.5,cy=h*.48;
  g.fillStyle='#111';g.beginPath();g.arc(cx,cy,w*.4,0,7);g.fill();for(let r=.12;r<.38;r+=.03){g.strokeStyle='rgba(255,255,255,.12)';g.lineWidth=2;g.beginPath();g.arc(cx,cy,w*r,0,7);g.stroke();}
  g.fillStyle='#ffd23f';g.beginPath();g.arc(cx,cy,w*.1,0,7);g.fill();g.fillStyle='#111';g.beginPath();g.arc(cx,cy,w*.016,0,7);g.fill();
  g.strokeStyle='rgba(255,255,255,.2)';g.lineWidth=14;g.beginPath();g.arc(cx,cy,w*.3,-2.6,-1.9);g.stroke();
  g.save();g.translate(w*.88,h*.1);g.rotate(.5);g.fillStyle='#ddd';g.fillRect(-4,0,8,h*.45);g.fillStyle='#999';g.fillRect(-12,h*.45,24,34);g.restore();},
 pines(g,w,h){g.fillStyle=lin(g,0,0,0,h,[[0,'#cfd8dc'],[1,'#8fa3ad']]);g.fillRect(0,0,w,h);
  [[.45,'#9fb3b8',.5],[.6,'#6f8a8f',.7],[.78,'#46636a',.9],[1,'#1f3a40',1.1]].forEach(([y,c,k],li)=>{g.fillStyle=c;for(let i=0;i<7;i++){const x=(i+.3*li)*w/6.2-20,t=h*(y-.38*k+((i*31+li*17)%10)/90),b=h*y+h*.2;g.beginPath();g.moveTo(x,t);g.lineTo(x-w*.1,b);g.lineTo(x+w*.1,b);g.fill();g.beginPath();g.moveTo(x,t+h*.08);g.lineTo(x-w*.13,b);g.lineTo(x+w*.13,b);g.fill();}
   g.fillStyle='rgba(235,240,243,.45)';g.fillRect(0,h*(y-.04),w,h*.07);});},
 neonrain(g,w,h){g.fillStyle=lin(g,0,0,0,h,[[0,'#120a2b'],[1,'#1e1040']]);g.fillRect(0,0,w,h);
  g.fillStyle='#1a1330';g.fillRect(0,h*.25,w*.3,h*.75);g.fillRect(w*.7,h*.15,w*.3,h*.85);g.fillStyle='#0c0820';g.fillRect(w*.3,h*.4,w*.4,h*.6);
  g.shadowBlur=22;g.shadowColor='#ff2e93';g.strokeStyle='#ff2e93';g.lineWidth=7;g.strokeRect(w*.04,h*.35,w*.2,h*.1);g.shadowColor='#00e5ff';g.strokeStyle='#00e5ff';g.strokeRect(w*.74,h*.28,w*.2,h*.1);g.shadowColor='#ffd23f';g.strokeStyle='#ffd23f';g.beginPath();g.arc(w*.5,h*.5,w*.06,0,7);g.stroke();g.shadowBlur=0;
  g.fillStyle='#2a1f4f';g.fillRect(0,h*.86,w,h*.14);g.fillStyle='rgba(255,46,147,.3)';g.fillRect(w*.05,h*.86,w*.2,h*.14);g.fillStyle='rgba(0,229,255,.3)';g.fillRect(w*.74,h*.86,w*.2,h*.14);
  g.strokeStyle='rgba(200,210,255,.45)';g.lineWidth=2;for(let i=0;i<70;i++){const x=(i*61)%w,y=(i*113)%h;g.beginPath();g.moveTo(x,y);g.lineTo(x-6,y+22);g.stroke();}
  g.fillStyle='#000';g.beginPath();g.arc(w*.5,h*.72,13,0,7);g.fill();g.fillRect(w*.5-12,h*.72+10,24,60);g.beginPath();g.moveTo(w*.5-24,h*.72+16);g.quadraticCurveTo(w*.5,h*.72-30,w*.5+24,h*.72+16);g.lineTo(w*.5,h*.72+16);g.fill();},
 bridge(g,w,h){g.fillStyle=lin(g,0,0,0,h*.6,[[0,'#2b2d6e'],[.5,'#d6537f'],[1,'#ffb36b']]);g.fillRect(0,0,w,h);
  g.fillStyle='#ffe2a8';g.beginPath();g.arc(w*.5,h*.46,w*.08,0,7);g.fill();
  g.fillStyle='#3a2a5a';g.fillRect(0,h*.62,w,h*.38);for(let i=0;i<12;i++){g.strokeStyle='rgba(255,226,168,'+(.5-i*.03)+')';g.lineWidth=3;const ww=w*(.06+i*.01);g.beginPath();g.moveTo(w*.5-ww,h*.64+i*h*.028);g.lineTo(w*.5+ww,h*.64+i*h*.028);g.stroke();}
  g.fillStyle='#1a1233';g.fillRect(0,h*.58,w,h*.05);for(let i=0;i<5;i++){const x=w*(.05+i*.22);g.beginPath();g.moveTo(x,h*.58);g.quadraticCurveTo(x+w*.11,h*.36,x+w*.22,h*.58);g.lineTo(x+w*.2,h*.58);g.quadraticCurveTo(x+w*.11,h*.42,x+w*.02,h*.58);g.fill();g.fillRect(x,h*.58,8,h*.1);}
  g.fillStyle='#ffe2a8';for(let i=0;i<24;i++)g.fillRect(i*w/23,h*.585,3,3);},
 pfox(g,w,h){wash(g,w,h,[[0,'#1f3a8f'],[.55,'#6f8fe0'],[1,'#e6efff']],5);bokeh(g,w,h,4,26);
  pt(g,EL(w*.5,h*1.02,w*.75,h*.18),'#f4f8ff',{b:[0,h*.82,w,h*.2],a:-.1,seed:2});
  pt(g,g=>{g.moveTo(w*.62,h*.82);g.bezierCurveTo(w*.95,h*.8,w*.98,h*.52,w*.82,h*.5);g.bezierCurveTo(w*.86,h*.62,w*.74,h*.7,w*.62,h*.7);g.fill&&0;},'#ee6a1a',{b:[w*.6,h*.48,w*.4,h*.36],seed:3,a:-1});
  pt(g,EL(w*.5,h*.66,w*.2,h*.2),'#ee6a1a',{b:[w*.28,h*.46,w*.44,h*.4],seed:4,a:-1.4});
  pt(g,EL(w*.5,h*.7,w*.09,h*.15),'#fff5e8',{b:[w*.4,h*.55,w*.2,h*.3],seed:5,a:-1.5,v:30});
  pt(g,EL(w*.5,h*.4,w*.16,h*.12),'#ee6a1a',{b:[w*.32,h*.28,w*.36,h*.24],seed:6,a:-.3});
  pt(g,TRI(w*.36,h*.34,w*.38,h*.17,w*.46,h*.3),'#e55b10',{b:[w*.3,h*.15,w*.2,h*.2],seed:8,n:20,line:'#2a1408'});
  pt(g,TRI(w*.64,h*.34,w*.62,h*.17,w*.54,h*.3),'#e55b10',{b:[w*.5,h*.15,w*.2,h*.2],seed:9,n:20,line:'#2a1408'});
  pt(g,TRI(w*.38,h*.44,w*.62,h*.44,w*.5,h*.52),'#fff5e8',{b:[w*.35,h*.42,w*.3,h*.12],seed:10,n:20,v:20});
  g.fillStyle='#1a0e08';g.beginPath();g.arc(w*.5,h*.505,9,0,7);g.fill();g.strokeStyle='#1a0e08';g.lineWidth=4;g.lineCap='round';[[.43],[.57]].forEach(([x])=>{g.beginPath();g.arc(w*x,h*.4,10,.15*Math.PI,.85*Math.PI);g.stroke();});
  g.fillStyle='#1a0e08';[[.43],[.53]].forEach(([x])=>g.fillRect(w*x,h*.8,w*.05,h*.1));tex(g,w,h);},
 pbirds(g,w,h){wash(g,w,h,[[0,'#7fd3e8'],[1,'#ffe9b8']],6);
  pt(g,g=>{g.moveTo(0,h*.55);g.bezierCurveTo(w*.3,h*.5,w*.6,h*.58,w,h*.5);g.lineTo(w,h*.56);g.bezierCurveTo(w*.6,h*.64,w*.3,h*.56,0,h*.62);g.closePath();},'#6b4a2f',{b:[0,h*.48,w,h*.18],seed:3,a:-.1,n:60});
  [[.3,.25,'#f08a2d'],[.62,.3,'#e8453c']].forEach(([x,y,c],i)=>{pt(g,EL(w*x,h*(y+.2),w*.09,h*.13,i?.2:-.2),c,{b:[w*(x-.1),h*(y+.07),w*.2,h*.26],seed:4+i,a:-1.2});pt(g,EL(w*x,h*(y+.06),w*.06,h*.06),c,{b:[w*(x-.06),h*(y),w*.12,h*.12],seed:9+i,n:20});
    g.fillStyle='#fff';g.beginPath();g.arc(w*x+(i?-8:8),h*(y+.05),4,0,7);g.fill();g.fillStyle='#2a1408';g.beginPath();g.arc(w*x+(i?-8:8),h*(y+.05),2,0,7);g.fill();g.fillStyle='#ffc24a';g.beginPath();g.moveTo(w*x+(i?-13:13),h*(y+.07));g.lineTo(w*x+(i?-26:26),h*(y+.09));g.lineTo(w*x+(i?-13:13),h*(y+.1));g.fill();});
  const r=SR(13);for(let i=0;i<28;i++){const x=r()*w*.6,y=r()*h*.4;g.fillStyle=['#ff9ec4','#ff6fa5','#ffd0e2'][i%3];g.beginPath();g.arc(x,y,6+r()*9,0,7);g.fill();}
  g.fillStyle='#ff4d6d';g.beginPath();g.arc(w*.46,h*.16,9,0,7);g.arc(w*.5,h*.16,9,0,7);g.fill();tex(g,w,h);},
 pcup(g,w,h){wash(g,w,h,[[0,'#f2522e'],[.35,'#ff6fa5'],[.7,'#ffd23f'],[1,'#ffe9a0']],9);
  [['#2f6f4e',.76,.68,.16,-.7],['#17805a',.76,.7,.14,.2]].forEach(([c,x,y,s,a])=>{for(let k=0;k<7;k++){const ang=-1.4+k*.35;pt(g,g=>{g.moveTo(w*x,h*y);g.lineTo(w*x+Math.cos(ang-.12)*w*s*1.5,h*y+Math.sin(ang-.12)*w*s*1.5);g.lineTo(w*x+Math.cos(ang+.12)*w*s*1.5,h*y+Math.sin(ang+.12)*w*s*1.5);g.closePath();},c,{b:[w*(x-.3),h*(y-.3),w*.6,h*.35],n:12,seed:k+1,line:'#0b3a2a',lw:2});}});
  pt(g,g=>{g.rect(w*.62,h*.66,w*.3,h*.26);},'#c4532d',{b:[w*.6,h*.64,w*.34,h*.3],seed:3,a:-1.5});
  pt(g,g=>{g.rect(w*.2,h*.82,w*.55,h*.1);},'#1fa58a',{b:[w*.2,h*.8,w*.55,h*.14],seed:4,a:0,n:30});
  pt(g,g=>{g.rect(w*.22,h*.72,w*.5,h*.1);},'#ffd23f',{b:[w*.2,h*.7,w*.55,h*.14],seed:5,a:0,n:30});
  pt(g,g=>{g.rect(w*.28,h*.62,w*.38,h*.1);},'#2a3b8f',{b:[w*.25,h*.6,w*.45,h*.14],seed:6,a:0,n:30});
  pt(g,g=>{g.moveTo(w*.3,h*.5);g.lineTo(w*.64,h*.5);g.lineTo(w*.58,h*.62);g.lineTo(w*.36,h*.62);g.closePath();},'#f8f6f0',{b:[w*.28,h*.48,w*.4,h*.16],seed:7,n:20,v:30,line:'#c9c2b4'});
  g.fillStyle='#5a2a16';g.beginPath();g.ellipse(w*.47,h*.5,w*.17,h*.025,0,0,7);g.fill();tex(g,w,h);},
 pelephant(g,w,h){wash(g,w,h,[[0,'#f6a13a'],[.5,'#ec5a3a'],[1,'#7a2a5a']],12);
  g.fillStyle='#ffe3a0';g.beginPath();g.arc(w*.7,h*.38,w*.12,0,7);g.fill();
  pt(g,g=>{g.fillRect(0,h*.78,w,h*.22);},'#2b1430',{b:[0,h*.76,w,h*.24],a:0,seed:3});
  const E='#1d0f26';pt(g,EL(w*.42,h*.62,w*.24,h*.14),E,{b:[w*.15,h*.46,w*.5,h*.3],seed:4,v:20});
  pt(g,EL(w*.2,h*.58,w*.11,h*.11),E,{b:[w*.08,h*.48,w*.2,h*.22],seed:5,v:20});
  pt(g,g=>{g.moveTo(w*.13,h*.6);g.bezierCurveTo(w*.05,h*.72,w*.08,h*.84,w*.14,h*.82);g.lineTo(w*.18,h*.66);g.closePath();},E,{n:10,seed:6});
  [[.3],[.38],[.5],[.58]].forEach(([x])=>pt(g,g=>{g.rect(w*x,h*.66,w*.05,h*.16);},E,{b:[w*x,h*.64,w*.06,h*.2],n:8,seed:7}));
  pt(g,g=>{g.moveTo(w*.6,h*.58);g.quadraticCurveTo(w*.66,h*.64,w*.64,h*.72);g.lineTo(w*.62,h*.66);g.closePath();},E,{n:6,seed:8});
  g.strokeStyle=E;g.lineWidth=7;g.beginPath();g.moveTo(w*.76,h*.78);g.lineTo(w*.76,h*.5);g.stroke();for(let k=0;k<5;k++){g.beginPath();g.moveTo(w*.76,h*(.52+k*.01));g.quadraticCurveTo(w*(.7+k*.02),h*(.44-k*.01),w*(.58+k*.06),h*(.47+k*.005));g.stroke();}tex(g,w,h);},
 psea(g,w,h){wash(g,w,h,[[0,'#3ba7e0'],[.45,'#8fd8f2'],[.5,'#1f86d6'],[1,'#0e5fb0']],14);
  pt(g,g=>{g.moveTo(0,h*.44);g.lineTo(w*.2,h*.37);g.lineTo(w*.45,h*.42);g.lineTo(w*.7,h*.35);g.lineTo(w,h*.43);g.lineTo(w,h*.47);g.lineTo(0,h*.47);},'#6fa6c2',{b:[0,h*.34,w,h*.14],a:0,seed:2,n:30});
  pt(g,TRI(w*.62,h*.44,w*.62,h*.26,w*.78,h*.44),'#ffffff',{b:[w*.6,h*.24,w*.2,h*.22],n:14,seed:3,v:20});pt(g,TRI(w*.6,h*.46,w*.6,h*.32,w*.52,h*.46),'#eef3f8',{n:8,seed:4,b:[w*.5,h*.3,w*.12,h*.16]});
  pt(g,g=>{g.rect(w*.5,h*.46,w*.28,h*.012);},'#3a2a20',{n:2,seed:5,b:[w*.5,h*.46,w*.28,h*.012]});
  pt(g,g=>{g.rect(0,h*.84,w,h*.16);},'#f1dcb4',{b:[0,h*.82,w,h*.18],a:0,seed:6});
  pt(g,g=>{g.rect(w*.32,h*.68,w*.36,h*.04);},'#9a6a3c',{n:10,seed:7,b:[w*.3,h*.67,w*.4,h*.06]});[[.36],[.62]].forEach(([x])=>pt(g,g=>{g.rect(w*x,h*.72,w*.025,h*.2);},'#7a4f2c',{n:6,seed:8,b:[w*x,h*.7,w*.03,h*.22]}));
  pt(g,g=>{g.rect(0,0,w*.06,h);},'#6e4a2a',{b:[0,0,w*.08,h],a:-1.5,seed:9,n:30});
  const r=SR(21);for(let i=0;i<40;i++){g.fillStyle=['#ff5f9e','#ff8fbf','#d6247a'][i%3];g.beginPath();g.arc(r()*w*.5,r()*h*.22,6+r()*8,0,7);g.fill();}
  pt(g,EL(w*.5,h*.66,w*.04,h*.03),'#d6247a',{n:6,seed:9,b:[w*.46,h*.63,w*.08,h*.06]});tex(g,w,h);},
 ptrio(g,w,h){wash(g,w,h,[[0,'#46c4f0'],[1,'#b8ecff']],16);
  pt(g,g=>{g.rect(0,h*.82,w,h*.18);},'#4cc46a',{b:[0,h*.8,w,h*.2],a:0,seed:2});g.fillStyle='#ffe23f';g.beginPath();g.arc(w*.8,h*.14,w*.08,0,7);g.fill();
  [[.5,.28,'#1a1a1a'],[.46,.5,'#ffd92b'],[.52,.72,'#ee3a32']].forEach(([x,y,c],i)=>{pt(g,EL(w*x,h*y,w*.17,h*.07,i%2?.2:-.2),c,{b:[w*(x-.18),h*(y-.08),w*.36,h*.16],seed:3+i,a:-.4,n:30,line:'#111',lw:4});pt(g,EL(w*(x+(i%2?-.13:.13)),h*(y-.05),w*.06,h*.05),c,{n:8,seed:9+i,b:[w*(x-.2),h*(y-.1),w*.4,h*.1],line:'#111',lw:3});g.fillStyle='#fff';g.beginPath();g.arc(w*(x+(i%2?-.15:.15)),h*(y-.06),4,0,7);g.fill();g.strokeStyle='#111';g.lineWidth=3;g.beginPath();g.moveTo(w*(x-.02),h*(y+.06));g.lineTo(w*(x-.02),h*(y+.12));g.moveTo(w*(x+.04),h*(y+.06));g.lineTo(w*(x+.04),h*(y+.12));g.stroke();});
  [[.08],[.92]].forEach(([x])=>{g.strokeStyle='#1d5f7a';g.lineWidth=7;g.beginPath();g.moveTo(w*x,h*.9);g.bezierCurveTo(w*(x+.05),h*.7,w*(x-.05),h*.55,w*x,h*.4);g.stroke();g.fillStyle='#ffd92b';g.beginPath();g.arc(w*x,h*.37,20,0,7);g.fill();g.fillStyle='#fff';g.beginPath();g.arc(w*x,h*.37,7,0,7);g.fill();});tex(g,w,h);},
 plips(g,w,h){wash(g,w,h,[[0,'#ffb347'],[1,'#e8782a']],18,1);
  pt(g,g=>{g.moveTo(w*.1,h*.5);g.bezierCurveTo(w*.22,h*.32,w*.38,h*.34,w*.5,h*.42);g.bezierCurveTo(w*.62,h*.34,w*.78,h*.32,w*.9,h*.5);g.bezierCurveTo(w*.78,h*.64,w*.62,h*.68,w*.5,h*.66);g.bezierCurveTo(w*.38,h*.68,w*.22,h*.64,w*.1,h*.5);},'#d6246e',{b:[w*.08,h*.3,w*.84,h*.4],a:-.2,seed:3,line:'#5a0f3a',lw:4});
  pt(g,g=>{g.moveTo(w*.14,h*.5);g.bezierCurveTo(w*.3,h*.46,w*.4,h*.5,w*.5,h*.52);g.bezierCurveTo(w*.6,h*.5,w*.7,h*.46,w*.86,h*.5);g.bezierCurveTo(w*.7,h*.56,w*.6,h*.58,w*.5,h*.57);g.bezierCurveTo(w*.4,h*.58,w*.3,h*.56,w*.14,h*.5);},'#fff4f0',{b:[w*.1,h*.44,w*.8,h*.16],a:0,seed:4,n:30,v:20});
  g.strokeStyle='rgba(255,255,255,.6)';g.lineWidth=6;g.lineCap='round';g.beginPath();g.moveTo(w*.28,h*.4);g.quadraticCurveTo(w*.4,h*.37,w*.46,h*.41);g.stroke();tex(g,w,h);},
 pqueen(g,w,h){wash(g,w,h,[[0,'#ffe83a'],[1,'#f0d21c']],20);
  pt(g,g=>{g.moveTo(w*.18,h);g.bezierCurveTo(w*.18,h*.76,w*.34,h*.72,w*.5,h*.72);g.bezierCurveTo(w*.66,h*.72,w*.82,h*.76,w*.82,h);},'#b9714a',{b:[w*.15,h*.7,w*.7,h*.3],seed:3,a:-1.2});
  pt(g,g=>{g.moveTo(w*.28,h);g.lineTo(w*.34,h*.84);g.lineTo(w*.66,h*.84);g.lineTo(w*.72,h);},'#e32636',{b:[w*.25,h*.8,w*.5,h*.2],seed:4,n:40});
  pt(g,EL(w*.5,h*.6,w*.065,h*.12),'#b9714a',{b:[w*.42,h*.5,w*.16,h*.22],seed:5,n:20,a:-1.5});
  pt(g,EL(w*.5,h*.4,w*.32,h*.3),'#15110f',{b:[w*.15,h*.1,w*.7,h*.6],seed:6,n:140,v:30,a:-1});
  pt(g,EL(w*.5,h*.56,w*.15,h*.1),'#c27b52',{b:[w*.35,h*.5,w*.3,h*.2],seed:7,n:30,a:-1.5});
  g.fillStyle='#d3202e';g.beginPath();g.ellipse(w*.5,h*.63,w*.06,h*.016,0,0,7);g.fill();g.fillStyle='#2a1a14';g.beginPath();g.ellipse(w*.5,h*.58,w*.012,h*.012,0,0,7);g.fill();
  g.strokeStyle='#ffe83a';g.lineWidth=7;g.lineJoin='round';g.beginPath();g.moveTo(w*.3,h*.26);g.lineTo(w*.28,h*.12);g.lineTo(w*.38,h*.2);g.lineTo(w*.45,h*.1);g.lineTo(w*.5,h*.22);g.stroke();
  pt(g,g=>{g.moveTo(w*.78,h*.66);g.lineTo(w*.78,h*.56);g.lineTo(w*.9,h*.56);g.lineTo(w*.9,h*.72);g.lineTo(w*.78,h*.74);},'#b9714a',{n:8,seed:8,b:[w*.76,h*.54,w*.16,h*.2],line:'#5a3220'});tex(g,w,h);},
 pface(g,w,h){wash(g,w,h,[[0,'#f6ecd4'],[1,'#efe0bd']],22);
  pt(g,g=>{g.moveTo(w*.22,h*.22);g.lineTo(w*.5,h*.12);g.lineTo(w*.5,h*.62);g.lineTo(w*.3,h*.78);g.lineTo(w*.22,h*.5);},'#2c8cc4',{b:[w*.2,h*.1,w*.32,h*.7],seed:3,a:-1.2,line:'#1d1530',lw:5});
  pt(g,g=>{g.moveTo(w*.5,h*.12);g.lineTo(w*.78,h*.24);g.lineTo(w*.74,h*.56);g.lineTo(w*.5,h*.62);},'#f2c230',{b:[w*.48,h*.1,w*.32,h*.54],seed:4,a:-1.2,line:'#1d1530',lw:5});
  pt(g,g=>{g.moveTo(w*.3,h*.78);g.lineTo(w*.5,h*.62);g.lineTo(w*.74,h*.56);g.lineTo(w*.66,h*.84);g.lineTo(w*.44,h*.92);},'#7a3a9a',{b:[w*.28,h*.55,w*.5,h*.38],seed:5,a:-.6,line:'#1d1530',lw:5});
  pt(g,TRI(w*.22,h*.22,w*.5,h*.12,w*.36,h*.3),'#2f8f5a',{n:20,seed:6,b:[w*.2,h*.1,w*.3,h*.22],line:'#1d1530',lw:4});
  [[.34],[.62]].forEach(([x])=>{pt(g,g=>{g.moveTo(w*(x-.1),h*.42);g.quadraticCurveTo(w*x,h*.34,w*(x+.1),h*.42);g.quadraticCurveTo(w*x,h*.5,w*(x-.1),h*.42);},'#ffffff',{n:6,seed:7,b:[w*(x-.1),h*.36,w*.2,h*.14],line:'#1d1530',lw:4});g.fillStyle='#1d1530';g.beginPath();g.arc(w*x,h*.42,8,0,7);g.fill();});
  pt(g,g=>{g.moveTo(w*.34,h*.72);g.quadraticCurveTo(w*.52,h*.62,w*.7,h*.7);g.quadraticCurveTo(w*.52,h*.8,w*.34,h*.72);},'#ee5a9a',{n:14,seed:8,b:[w*.3,h*.6,w*.4,h*.2],line:'#1d1530',lw:4});tex(g,w,h);},
 ppanda(g,w,h){wash(g,w,h,[[0,'#ff7fae'],[1,'#ff4f8e']],24);
  [[.72,.22],[.84,.3],[.62,.3]].forEach(([x,y],i)=>{g.strokeStyle='#6a1030';g.lineWidth=2;g.beginPath();g.moveTo(w*x,h*(y+.12));g.lineTo(w*.58,h*.7);g.stroke();pt(g,EL(w*x,h*y,w*.1,h*.09),['#e8283c','#ff4a5c','#c91a30'][i],{b:[w*(x-.1),h*(y-.09),w*.2,h*.18],n:20,seed:3+i,line:'#6a1030',lw:3});g.fillStyle='rgba(255,255,255,.55)';g.beginPath();g.ellipse(w*(x-.04),h*(y-.03),6,10,-.5,0,7);g.fill();});
  pt(g,EL(w*.28,h*.86,w*.3,h*.22),'#fbf8f2',{b:[0,h*.66,w*.6,h*.34],seed:5,n:40,v:24});
  pt(g,EL(w*.08,h*.7,w*.07,h*.07),'#16121a',{n:8,seed:6,b:[0,h*.62,w*.16,h*.16]});pt(g,EL(w*.48,h*.7,w*.07,h*.07),'#16121a',{n:8,seed:7,b:[w*.4,h*.62,w*.16,h*.16]});
  [[.14],[.42]].forEach(([x])=>{pt(g,EL(w*x,h*.82,w*.07,h*.06,.3),'#16121a',{n:8,seed:8,b:[w*(x-.08),h*.76,w*.16,h*.12]});g.fillStyle='#fff';g.beginPath();g.arc(w*(x+.01),h*.81,5,0,7);g.fill();});
  g.strokeStyle='#16121a';g.lineWidth=4;g.lineCap='round';g.beginPath();g.moveTo(w*.22,h*.9);g.quadraticCurveTo(w*.25,h*.93,w*.28,h*.9);g.quadraticCurveTo(w*.31,h*.93,w*.34,h*.9);g.stroke();tex(g,w,h);},
 pvan(g,w,h){wash(g,w,h,[[0,'#ff8a1f'],[.25,'#2f9ae8'],[.55,'#7ec8f6']],26);
  pt(g,g=>{g.moveTo(0,h*.58);g.bezierCurveTo(w*.3,h*.52,w*.7,h*.66,w,h*.6);g.lineTo(w,h);g.lineTo(0,h);},'#5ad04a',{b:[0,h*.5,w,h*.5],a:-.3,seed:3});
  pt(g,g=>{g.moveTo(0,h*.74);g.bezierCurveTo(w*.3,h*.66,w*.6,h*.82,w,h*.72);g.lineTo(w,h*.82);g.bezierCurveTo(w*.6,h*.92,w*.3,h*.76,0,h*.84);},'#7a5538',{b:[0,h*.64,w,h*.3],a:-.2,seed:4});
  pt(g,g=>{g.moveTo(w*.18,h*.58);g.quadraticCurveTo(w*.2,h*.38,w*.34,h*.36);g.lineTo(w*.74,h*.36);g.quadraticCurveTo(w*.84,h*.4,w*.84,h*.56);g.lineTo(w*.82,h*.66);g.lineTo(w*.2,h*.68);g.closePath();},'#ffe23a',{b:[w*.15,h*.34,w*.7,h*.36],seed:5,a:-.2,line:'#9a7a10',lw:4});
  pt(g,g=>{g.moveTo(w*.26,h*.54);g.lineTo(w*.3,h*.42);g.lineTo(w*.7,h*.42);g.lineTo(w*.74,h*.54);g.closePath();},'#bfe6ff',{n:10,seed:6,b:[w*.24,h*.4,w*.5,h*.16],line:'#9a7a10',lw:3});
  g.fillStyle='#fff6c0';g.fillRect(w*.19,h*.6,w*.64,h*.025);
  [[.3],[.7]].forEach(([x])=>{g.fillStyle='#15121a';g.beginPath();g.arc(w*x,h*.68,w*.07,0,7);g.fill();g.fillStyle='#d8d8d8';g.beginPath();g.arc(w*x,h*.68,w*.03,0,7);g.fill();});tex(g,w,h);},
 pcocktail(g,w,h){wash(g,w,h,[[0,'#ff9f43'],[.5,'#ff5e62'],[1,'#8e2c6e']],28);
  pt(g,g=>{g.moveTo(w*.3,h*.3);g.lineTo(w*.7,h*.3);g.lineTo(w*.52,h*.62);g.lineTo(w*.48,h*.62);g.closePath();},'#ffd166',{b:[w*.28,h*.28,w*.44,h*.36],seed:3,a:-1.2,n:50,line:'#fff3d6',lw:4});
  pt(g,g=>{g.moveTo(w*.3,h*.3);g.lineTo(w*.7,h*.3);g.lineTo(w*.64,h*.4);g.lineTo(w*.36,h*.4);g.closePath();},'#ff7a45',{n:20,seed:4,b:[w*.3,h*.3,w*.4,h*.12]});
  g.strokeStyle='#fff3d6';g.lineWidth=6;g.lineCap='round';g.beginPath();g.moveTo(w*.5,h*.62);g.lineTo(w*.5,h*.84);g.moveTo(w*.34,h*.86);g.lineTo(w*.66,h*.86);g.stroke();
  g.strokeStyle='#2f9d6a';g.lineWidth=8;g.beginPath();g.moveTo(w*.6,h*.32);g.lineTo(w*.74,h*.1);g.stroke();
  const fl=(x,y,s)=>{for(let k=0;k<5;k++){const a=k*1.2566;pt(g,EL(x+Math.cos(a)*s*.55,y+Math.sin(a)*s*.55,s*.5,s*.32,a),'#ff2d55',{n:6,seed:5+k,b:[x-s,y-s,s*2,s*2],line:'#8a0f2a',lw:2});}g.fillStyle='#ffd23f';g.beginPath();g.arc(x,y,s*.18,0,7);g.fill();};
  fl(w*.22,h*.2,44);fl(w*.8,h*.7,34);pt(g,EL(w*.2,h*.72,w*.12,h*.03,-.5),'#2f9d6a',{n:8,seed:9,b:[w*.08,h*.68,w*.24,h*.08]});tex(g,w,h);},
 pwinter(g,w,h){wash(g,w,h,[[0,'#101a4a'],[.5,'#3b5fb8'],[1,'#a8c4f2']],30);bokeh(g,w,h,3,34);
  g.fillStyle='#fff7c8';g.beginPath();g.arc(w*.74,h*.16,w*.07,0,7);g.fill();
  [[.2,.5,.8],[.45,.55,1],[.7,.5,.85],[.9,.55,.7]].forEach(([x,y,k],i)=>{for(let t=0;t<3;t++)pt(g,TRI(w*x,h*(y-.26*k+t*.1*k),w*(x-.1*k+t*.01),h*(y+t*.07*k+.1),w*(x+.1*k-t*.01),h*(y+t*.07*k+.1)),['#16442f','#1d5a3d','#2a7050'][t],{b:[w*(x-.12),h*(y-.3),w*.24,h*.5],n:16,seed:i*3+t,a:-1.2});});
  pt(g,EL(w*.5,h*1.05,w*.8,h*.22),'#f4f8ff',{b:[0,h*.82,w,h*.2],a:-.1,seed:3});
  g.fillStyle='#2a2a3a';g.fillRect(w*.08,h*.5,6,h*.34);g.fillStyle='#ffd870';g.beginPath();g.arc(w*.08+3,h*.49,13,0,7);g.fill();g.fillStyle='rgba(255,216,112,.25)';g.beginPath();g.arc(w*.08+3,h*.49,34,0,7);g.fill();tex(g,w,h);},
 gele(g,w,h){wash(g,w,h,[[0,'#f8c94a'],[.55,'#ea9a30'],[1,'#c26a22']],40);
  const K='#1a0e0a',SK='#9a5530';
  const stripeBands=(shape,base,col,cx,cy,gap,wd)=>{g.save();g.beginPath();shape(g);g.clip();g.fillStyle=base;g.fillRect(0,0,w,h);g.strokeStyle=col;g.lineWidth=wd;g.lineCap='round';for(let r=10;r<w;r+=gap){g.beginPath();g.ellipse(cx,cy,r*1.05,r*.8,-.35,Math.PI*1.05,Math.PI*1.95);g.stroke();}g.restore();g.beginPath();shape(g);g.strokeStyle=K;g.lineWidth=4;g.lineJoin='round';g.stroke();};
  /* shoulders and neck */
  pt(g,g=>{g.moveTo(w*.46,h*.56);g.lineTo(w*.66,h*.5);g.lineTo(w*.7,h*.74);g.quadraticCurveTo(w*.55,h*.8,w*.36,h*.76);g.closePath();},'#8c4a26',{b:[w*.34,h*.5,w*.38,h*.3],seed:3,a:-1.4,n:60});
  pt(g,g=>{g.moveTo(w*.46,h*.6);g.quadraticCurveTo(w*.56,h*.66,w*.7,h*.56);g.lineTo(w*.7,h*.7);g.quadraticCurveTo(w*.56,h*.72,w*.46,h*.66);},'#5e2f16',{b:[w*.44,h*.55,w*.28,h*.18],seed:4,a:-.3,n:30,v:30});
  pt(g,g=>{g.moveTo(w*.06,h);g.lineTo(w*.1,h*.82);g.quadraticCurveTo(w*.22,h*.74,w*.38,h*.76);g.quadraticCurveTo(w*.55,h*.82,w*.72,h*.74);g.quadraticCurveTo(w*.86,h*.72,w*.94,h*.8);g.lineTo(w*.98,h);g.closePath();},'#9a5530',{b:[w*.05,h*.7,w*.92,h*.3],seed:5,a:-.3,n:60});
  const dress=g=>{g.moveTo(w*.04,h);g.lineTo(w*.08,h*.86);g.quadraticCurveTo(w*.3,h*.8,w*.46,h*.86);g.quadraticCurveTo(w*.62,h*.92,w*.76,h*.82);g.quadraticCurveTo(w*.9,h*.78,w*.98,h*.84);g.lineTo(w*.99,h);g.closePath();};
  stripeBands(dress,'#17100c','#efb73c',w*.9,h*1.1,24,12);
  /* head and face */
  pt(g,EL(w*.57,h*.4,w*.15,h*.16),SK,{b:[w*.42,h*.24,w*.3,h*.34],seed:6,a:-1.2,n:90});
  pt(g,TRI(w*.45,h*.36,w*.392,h*.445,w*.46,h*.47),SK,{b:[w*.39,h*.34,w*.08,h*.14],seed:7,n:12});
  pt(g,EL(w*.5,h*.52,w*.075,h*.065),SK,{b:[w*.42,h*.46,w*.16,h*.14],seed:8,n:28});
  /* form shadow under the jaw and light on cheek / brow */
  g.save();g.globalAlpha=.35;g.fillStyle='#3a1a0a';g.beginPath();g.ellipse(w*.58,h*.58,w*.1,h*.04,.2,0,7);g.fill();g.globalAlpha=.28;g.fillStyle='#ffd9a0';g.beginPath();g.ellipse(w*.52,h*.44,w*.045,h*.03,-.3,0,7);g.fill();g.beginPath();g.ellipse(w*.5,h*.33,w*.04,h*.025,-.3,0,7);g.fill();g.restore();
  g.strokeStyle=K;g.lineWidth=3.5;g.lineCap='round';g.lineJoin='round';g.beginPath();g.moveTo(w*.47,h*.3);g.lineTo(w*.455,h*.36);g.lineTo(w*.392,h*.445);g.lineTo(w*.43,h*.464);g.lineTo(w*.424,h*.486);g.lineTo(w*.43,h*.516);g.lineTo(w*.44,h*.552);g.quadraticCurveTo(w*.5,h*.61,w*.6,h*.57);g.stroke();
  g.fillStyle='#bf1f3c';g.beginPath();g.moveTo(w*.424,h*.486);g.quadraticCurveTo(w*.398,h*.497,w*.424,h*.508);g.quadraticCurveTo(w*.46,h*.508,w*.472,h*.497);g.closePath();g.fill();g.beginPath();g.moveTo(w*.424,h*.508);g.quadraticCurveTo(w*.405,h*.532,w*.44,h*.536);g.quadraticCurveTo(w*.472,h*.53,w*.472,h*.508);g.closePath();g.fill();g.fillStyle='rgba(255,255,255,.5)';g.beginPath();g.ellipse(w*.435,h*.52,5,3,-.3,0,7);g.fill();
  g.strokeStyle=K;g.lineWidth=5;g.beginPath();g.moveTo(w*.468,h*.372);g.quadraticCurveTo(w*.52,h*.34,w*.59,h*.372);g.stroke();
  g.fillStyle='#fff';g.lineWidth=3;g.beginPath();g.moveTo(w*.478,h*.41);g.quadraticCurveTo(w*.52,h*.382,w*.575,h*.405);g.quadraticCurveTo(w*.525,h*.44,w*.478,h*.41);g.fill();g.stroke();g.fillStyle='#3a1608';g.beginPath();g.arc(w*.5,h*.409,7.5,0,7);g.fill();g.fillStyle='#000';g.beginPath();g.arc(w*.5,h*.409,3.5,0,7);g.fill();g.fillStyle='#fff';g.beginPath();g.arc(w*.497,h*.405,2.2,0,7);g.fill();
  g.strokeStyle=K;g.lineWidth=3;g.beginPath();g.moveTo(w*.575,h*.405);g.lineTo(w*.6,h*.392);g.moveTo(w*.56,h*.402);g.lineTo(w*.58,h*.385);g.stroke();
  /* hoop earring with shine */
  g.strokeStyle='#e6a92a';g.lineWidth=6;g.beginPath();g.ellipse(w*.635,h*.58,w*.055,h*.07,0,0,7);g.stroke();g.strokeStyle='rgba(255,255,255,.55)';g.lineWidth=2;g.beginPath();g.ellipse(w*.635,h*.58,w*.055,h*.07,0,3.6,4.6);g.stroke();
  /* headwrap: layered folds, curved stripes, knot */
  const gele=g=>{g.moveTo(w*.38,h*.4);g.bezierCurveTo(w*.33,h*.22,w*.46,h*.07,w*.64,h*.07);g.bezierCurveTo(w*.84,h*.08,w*.88,h*.3,w*.76,h*.42);g.bezierCurveTo(w*.7,h*.32,w*.58,h*.3,w*.5,h*.34);g.bezierCurveTo(w*.46,h*.36,w*.42,h*.39,w*.38,h*.4);};
  stripeBands(gele,'#14606a','#f2a63a',w*.74,h*.38,20,9);
  g.save();g.beginPath();gele(g);g.clip();g.strokeStyle='rgba(0,0,0,.28)';g.lineWidth=5;[[.36,.3,.6,.2],[.4,.36,.72,.28]].forEach(([a,b,c,d])=>{g.beginPath();g.moveTo(w*a,h*b);g.quadraticCurveTo(w*(a+c)/2,h*(b-.1),w*c,h*d);g.stroke();});g.fillStyle='rgba(255,255,255,.16)';g.beginPath();g.ellipse(w*.6,h*.14,w*.1,h*.03,-.2,0,7);g.fill();g.restore();
  pt(g,g=>{g.moveTo(w*.66,h*.08);g.bezierCurveTo(w*.74,h*.02,w*.9,h*.08,w*.86,h*.2);g.bezierCurveTo(w*.84,h*.14,w*.76,h*.12,w*.66,h*.08);},'#0f4a52',{n:8,seed:9,b:[w*.64,h*.02,w*.26,h*.2],line:K,lw:3.5});
  /* choker with stones */
  g.strokeStyle=K;g.lineWidth=11;g.lineCap='round';g.beginPath();g.ellipse(w*.57,h*.665,w*.11,h*.032,0.14,0,Math.PI);g.stroke();g.fillStyle='#f6d878';for(let k=0;k<6;k++){g.beginPath();g.arc(w*(.47+k*.038),h*(.695-Math.abs(k-2.5)*.004),3.5,0,7);g.fill();}
  /* finishing: ear, jaw and neck lines, nostril, lip line, forehead shadow, cheek warmth */
  pt(g,EL(w*.605,h*.46,w*.022,h*.04,.2),'#84431f',{b:[w*.58,h*.42,w*.05,h*.08],n:6,seed:12,line:K,lw:2.5});
  g.strokeStyle=K;g.lineWidth=3;g.lineCap='round';g.beginPath();g.moveTo(w*.47,h*.59);g.quadraticCurveTo(w*.47,h*.66,w*.4,h*.76);g.stroke();
  g.fillStyle='rgba(40,16,8,.7)';g.beginPath();g.ellipse(w*.428,h*.461,3,2,0,0,7);g.fill();
  g.strokeStyle='#5a0f20';g.lineWidth=2;g.beginPath();g.moveTo(w*.424,h*.507);g.quadraticCurveTo(w*.45,h*.512,w*.472,h*.5);g.stroke();
  g.save();g.globalAlpha=.3;g.fillStyle='#2a1208';g.beginPath();g.ellipse(w*.58,h*.34,w*.13,h*.03,-.1,0,7);g.fill();g.globalAlpha=.22;g.fillStyle='#e0483a';g.beginPath();g.ellipse(w*.52,h*.47,w*.04,h*.025,0,0,7);g.fill();g.restore();
  tex(g,w,h);},
 pwine(g,w,h){wash(g,w,h,[[0,'#4a2410'],[.5,'#c9781a'],[1,'#f2b84a']],8,1);
  const B=(shape,c,o)=>pt(g,shape,c,o);
  g.save();g.translate(w*.8,h*.07);g.rotate(-2.5);
  B(g=>{g.moveTo(-34,0);g.lineTo(-34,-150);g.bezierCurveTo(-34,-190,-12,-196,-12,-230);g.lineTo(-12,-256);g.lineTo(12,-256);g.lineTo(12,-230);g.bezierCurveTo(12,-196,34,-190,34,-150);g.lineTo(34,0);g.closePath();},'#1f4d2e',{b:[-36,-258,72,260],seed:3,a:-1.5,n:60,line:'#0b1d12',lw:4});
  B(g=>{g.rect(-35,-130,70,70);},'#f4e8c8',{b:[-35,-130,70,70],seed:4,n:14,v:20,line:'#6b4a1a',lw:2});
  g.fillStyle='#8a1f2f';g.fillRect(-20,-110,40,6);g.fillRect(-14,-96,28,4);
  B(g=>{g.rect(-13,-262,26,16);},'#7a1128',{b:[-13,-262,26,16],seed:5,n:6,line:'#2a0a10',lw:3});
  g.strokeStyle='rgba(255,255,255,.35)';g.lineWidth=6;g.lineCap='round';g.beginPath();g.moveTo(-22,-20);g.lineTo(-22,-140);g.stroke();
  g.restore();
  const tx=w*.8-Math.sin(-2.5)*262*-1,ty=h*.07;
  g.strokeStyle='#7a1128';g.lineCap='round';g.lineWidth=11;g.beginPath();g.moveTo(w*.41,h*.5);g.bezierCurveTo(w*.4,h*.55,w*.39,h*.6,w*.39,h*.7);g.stroke();
  g.strokeStyle='rgba(255,200,200,.35)';g.lineWidth=3;g.beginPath();g.moveTo(w*.4,h*.52);g.lineTo(w*.39,h*.68);g.stroke();
  pt(g,g=>{g.moveTo(w*.18,h*.68);g.lineTo(w*.62,h*.68);g.bezierCurveTo(w*.64,h*.86,w*.5,h*.92,w*.4,h*.92);g.bezierCurveTo(w*.3,h*.92,w*.16,h*.86,w*.18,h*.68);},'#7a1128',{b:[w*.16,h*.66,w*.48,h*.28],seed:6,a:-.3,line:'#f6e3b0',lw:4});
  pt(g,g=>{g.moveTo(w*.19,h*.69);g.lineTo(w*.61,h*.69);g.lineTo(w*.6,h*.76);g.lineTo(w*.2,h*.76);},'#a3213f',{b:[w*.18,h*.68,w*.46,h*.1],seed:7,a:0,n:24});
  g.fillStyle='rgba(122,17,40,.9)';g.beginPath();g.ellipse(w*.4,h*.68,w*.22,h*.012,0,0,7);g.fill();g.strokeStyle='#f6e3b0';g.lineWidth=4;g.stroke();
  g.strokeStyle='#f6e3b0';g.lineWidth=5;g.lineCap='round';g.beginPath();g.moveTo(w*.4,h*.92);g.lineTo(w*.4,h*.97);g.moveTo(w*.28,h*.98);g.lineTo(w*.52,h*.98);g.stroke();
  g.fillStyle='#7a1128';[[.46,.6],[.34,.62],[.43,.64]].forEach(([x,y])=>{g.beginPath();g.arc(w*x,h*y,4,0,7);g.fill();});tex(g,w,h);},
 balloon(g,w,h){g.fillStyle=lin(g,0,0,0,h,[[0,'#7ec8ff'],[1,'#ffe9c9']]);g.fillRect(0,0,w,h);
  g.fillStyle='rgba(255,255,255,.85)';[[.2,.2,.1],[.75,.3,.08],[.3,.82,.09]].forEach(([x,y,r])=>{g.beginPath();g.arc(w*x,h*y,w*r,0,7);g.arc(w*(x+.08),h*y+4,w*r*.8,0,7);g.fill();});
  const cx=w*.5,cy=h*.34,rx=w*.24,ry=h*.23;g.save();g.beginPath();g.ellipse(cx,cy,rx,ry,0,0,7);g.clip();
  ['#ff5a3c','#ffd23f','#3ddc97','#6c4bff','#ff7ab8'].forEach((c,i)=>{g.fillStyle=c;g.fillRect(cx-rx+i*rx*.4,cy-ry,rx*.4+1,ry*2);});g.restore();
  g.strokeStyle='#5a3414';g.lineWidth=3;g.beginPath();g.ellipse(cx,cy,rx,ry,0,0,7);g.stroke();
  g.strokeStyle='#5a3414';g.lineWidth=4;[[-.5,.7],[.5,.7]].forEach(([s])=>{g.beginPath();g.moveTo(cx+s*rx*.6,cy+ry*.9);g.lineTo(cx+s*w*.07,h*.66);g.stroke();});
  g.fillStyle='#b87a44';g.fillRect(cx-w*.08,h*.66,w*.16,h*.1);g.fillStyle='#8a5a3b';g.fillRect(cx-w*.08,h*.66,w*.16,6);
  g.fillStyle='#4aa86a';g.beginPath();g.moveTo(0,h*.92);g.quadraticCurveTo(w*.3,h*.82,w*.6,h*.9);g.quadraticCurveTo(w*.8,h*.84,w,h*.88);g.lineTo(w,h);g.lineTo(0,h);g.fill();}
};
const refCache=new Map();
function refCanvas(id,onLoad){
  if(refCache.has(id))return refCache.get(id);
  const c=document.createElement('canvas');c.width=400;c.height=500;const g=c.getContext('2d');g.fillStyle='#eee';g.fillRect(0,0,400,500);
  if(/^ref:/.test(id||'')){const f=REFDRAW[id.slice(4)];if(f)try{f(g,400,500);}catch(e){}refCache.set(id,c);}
  else if(/^img:/.test(id||'')){const im=new Image();im.crossOrigin='anonymous';im.onload=()=>{const s=Math.max(400/im.width,500/im.height),dw=im.width*s,dh=im.height*s;g.drawImage(im,(400-dw)/2,(500-dh)/2,dw,dh);onLoad&&onLoad();};im.src=publicUrl('room-images',id.slice(4));refCache.set(id,c);}
  return c;
}

/* ---------------- stroke guide: an outline "skeleton" of the reference with arrows showing which way to stroke ---------------- */
const guideCache=new Map();
function guideCanvas(id,onLoad){
  const key=id||'';if(guideCache.has(key))return guideCache.get(key);
  const out=document.createElement('canvas');out.width=CW;out.height=CH;guideCache.set(key,out);
  if(!id)return out;
  const src=refCanvas(id,()=>{guideCache.delete(key);onLoad&&onLoad();});
  try{
    const w=128,hh=160,t=document.createElement('canvas');t.width=w;t.height=hh;const tg=t.getContext('2d');tg.imageSmoothingQuality='high';tg.drawImage(src,0,0,w,hh);
    const d=tg.getImageData(0,0,w,hh).data;
    const at=(x,y,c)=>d[((Math.min(hh-1,Math.max(0,y))*w)+Math.min(w-1,Math.max(0,x)))*4+c];
    const mag=new Float32Array(w*hh),gxs=new Float32Array(w*hh),gys=new Float32Array(w*hh);let mx=0;
    for(let y=0;y<hh;y++)for(let x=0;x<w;x++){let gx=0,gy=0;for(let c=0;c<3;c++){gx+=at(x+1,y,c)-at(x-1,y,c);gy+=at(x,y+1,c)-at(x,y-1,c);}
      const m=Math.hypot(gx,gy);const k=y*w+x;mag[k]=m;gxs[k]=gx;gys[k]=gy;if(m>mx)mx=m;}
    const thr=Math.max(30,mx*.12),athr=Math.max(40,mx*.3),g=out.getContext('2d'),sx=CW/w,sy=CH/hh;
    g.fillStyle='rgba(70,50,200,.55)';
    for(let y=1;y<hh-1;y++)for(let x=1;x<w-1;x++){const k=y*w+x,m=mag[k];if(m<thr)continue;
      g.fillRect(Math.round(x*sx-1),Math.round(y*sy-1),5,5);}
    /* arrows along the edges: the direction to sweep the brush */
    g.strokeStyle='#ff5a36';g.fillStyle='#ff5a36';g.lineWidth=4;g.lineCap='round';
    const cell=15;let n=0;
    for(let cy=0;cy<hh&&n<48;cy+=cell)for(let cx=0;cx<w&&n<48;cx+=cell){let bk=-1,bm=0;
      for(let y=cy;y<Math.min(hh,cy+cell);y++)for(let x=cx;x<Math.min(w,cx+cell);x++){const k=y*w+x;if(mag[k]>bm){bm=mag[k];bk=k;}}
      if(bk<0||bm<athr)continue;
      let tx=-gys[bk],ty=gxs[bk];const l=Math.hypot(tx,ty)||1;tx/=l;ty/=l;if(tx<-.2||(Math.abs(tx)<=.2&&ty<0)){tx=-tx;ty=-ty;}
      const px=(bk%w)*sx,py=Math.floor(bk/w)*sy,L=22;const ax=px-tx*L,ay=py-ty*L,bx=px+tx*L,by=py+ty*L;
      g.beginPath();g.moveTo(ax,ay);g.lineTo(bx,by);g.stroke();
      const a=Math.atan2(ty,tx);g.beginPath();g.moveTo(bx,by);g.lineTo(bx-12*Math.cos(a-.5),by-12*Math.sin(a-.5));g.lineTo(bx-12*Math.cos(a+.5),by-12*Math.sin(a+.5));g.closePath();g.fill();n++;}
  }catch(e){/* an uploaded picture that the browser will not let us read: no guide */}
  return out;
}

/* ---------------- the drawing engine: one painting = a list of strokes ---------------- */
class PC{
  constructor(onChange){this.cv=document.createElement('canvas');this.cv.width=CW;this.cv.height=CH;this.g=this.cv.getContext('2d');this.ops=[];this.redo=[];this.onChange=onChange||(()=>{});this.tex=null;this.pts=0;this.blank();}
  blank(){this.g.globalAlpha=1;this.g.fillStyle=PAPER;this.g.fillRect(0,0,CW,CH);}
  style(op){const g=this.g;g.lineCap='round';g.lineJoin='round';g.globalAlpha=1;
    if(op.t==='e'){g.strokeStyle=g.fillStyle=PAPER;g.lineWidth=op.z*1.7;}
    else if(op.t==='p'){g.strokeStyle=g.fillStyle=op.c;g.lineWidth=Math.max(1.2,op.z*.28);}
    else{g.strokeStyle=g.fillStyle=op.c;g.lineWidth=op.z;}}
  seg(op,i0){const p=op.p,g=this.g;if(!p||p.length<2)return;this.style(op);
    if(p.length===2||i0===0&&p.length<4){g.beginPath();g.arc(p[0],p[1],g.lineWidth/2,0,7);g.fill();if(p.length<4)return;}
    g.beginPath();g.moveTo(p[Math.max(0,i0-2)],p[Math.max(0,i0-2)+1]);for(let i=Math.max(2,i0);i<p.length;i+=2)g.lineTo(p[i],p[i+1]);g.stroke();g.globalAlpha=1;}
  render(){this.blank();this.pts=0;for(const op of this.ops){if(op.k==='clr')this.blank();else if(op.k==='s'){this.seg(op,0);this.pts+=op.p.length;}}this.onChange();}
  start(t,c,z,x,y,id){const op={k:'s',t,c,z,p:[Math.round(x),Math.round(y)],id:id||null};this.ops.push(op);this.redo=[];this.seg(op,0);this.pts+=2;this.onChange();return op;}
  extend(op,x,y){x=Math.round(x);y=Math.round(y);const p=op.p,lx=p[p.length-2],ly=p[p.length-1];if(Math.abs(x-lx)<2&&Math.abs(y-ly)<2)return false;p.push(x,y);this.pts+=2;this.seg(op,p.length-2);this.onChange();return true;}
  undo(){let i=this.ops.length-1;while(i>=0&&this.ops[i].k==='m')i--;if(i<0)return false;this.redo.push(...this.ops.splice(i,1));this.render();return true;}
  redoOp(){const o=this.redo.pop();if(!o)return false;this.ops.push(o);this.render();return true;}
  clear(){this.ops.push({k:'clr'});this.redo=[];this.render();}
  state(){for(let i=this.ops.length-1;i>=0;i--)if(this.ops[i].k==='m')return this.ops[i].s|0;return 0;}
  setState(s){this.ops=this.ops.filter(o=>o.k!=='m');if(s>0)this.ops.push({k:'m',s});}
  load(ops){this.ops=Array.isArray(ops)?ops.filter(o=>o&&(o.k==='s'||o.k==='clr'||o.k==='m')):[];this.redo=[];this.render();}
  empty(){return !this.ops.some(o=>o.k==='s');}
  /* re-draws the strokes at k times the size, so saved and downloaded paintings stay sharp */
  hires(k){const c=document.createElement('canvas');c.width=CW*k;c.height=CH*k;const t=Object.create(PC.prototype);t.g=c.getContext('2d');t.cv=c;t.g.scale(k,k);t.blank();for(const op of this.ops){if(op.k==='clr')t.blank();else if(op.k==='s')t.seg(op,0);}return c;}
  texture(){if(!this.tex){this.tex=new T.CanvasTexture(this.cv);this.tex.encoding=T.sRGBEncoding;this.tex.anisotropy=4;}return this.tex;}
}

/* ---------------- gallery of finished paintings (also used at the end of a session) ---------------- */
async function galleryView(spaceId,title,opts){
  const box=h('div',{class:'pt-gal'}),grid=h('div',{class:'pt-gg'});box.append(h('h3',null,'Gallery'),h('p',{class:'f-hint'},title||''),grid,spinner());
  let rows=[];try{const r=await sb.rpc('paint_list',{p_space:spaceId});if(r.error)throw r.error;rows=(r.data||[]).filter(x=>(x.ops||[]).some(o=>o.k==='s'));}catch(e){box.replaceChildren(empty('Could not load the gallery',friendlyError(e)));return box;}
  box.querySelector('.spin-wrap')&&box.querySelector('.spin-wrap').remove();
  if(!rows.length){box.append(empty('No paintings yet','Paintings appear here once people have painted something.'));return box;}
  rows.sort((a,b)=>(b.done-a.done));
  rows.forEach(r=>{const pc=new PC();pc.load(r.ops);const url=pc.cv.toDataURL('image/jpeg',.88),mine=Auth.user&&r.user_id===Auth.user.id;
    const save=mine?h('button',{class:'btn small coral'},'Save to my gallery'):null;
    if(save)save.onclick=()=>guard(save,async()=>{const blob=await new Promise(res=>pc.hires(2).toBlob(res,'image/jpeg',.95));const path=await uploadFile('room-images',blob,'jpg','image/jpeg');const x=await sb.rpc('paint_artwork_save',{p_path:path,p_title:'Painting by @'+r.username,p_space_title:title||''});if(x.error)throw x.error;save.textContent='Saved';save.disabled=true;toast('Saved to your gallery');});
    const dl=h('button',{class:'btn small'},'Download HD');dl.onclick=()=>guard(dl,async()=>{const blob=await new Promise(res=>pc.hires(4).toBlob(res,'image/png'));download(blob,'openwalls-painting-'+(r.username||'art')+'.png');});
    grid.append(h('div',{class:'pt-gc'},h('img',{src:url,alt:'Painting by @'+r.username}),h('div',{class:'pt-gw'},avatarEl({avatar_url:r.avatar_url,display_name:r.display_name,username:r.username},'sm'),h('div',null,h('b',null,'@'+r.username),h('span',null,(r.done?'Completed':'In progress')+' · '+(title||'Gist & Paint')))),save,dl));});
  return box;
}
function openArtwork(a){
  const url=publicUrl('room-images',a.image_path);
  sheet(a.space_title||'Artwork',(body,close)=>{
    const img=h('img',{src:url,alt:a.title||'Artwork',style:{width:'100%',maxHeight:'62vh',objectFit:'contain',borderRadius:'10px',background:'#fffdf8',display:'block'}});
    const wall=h('button',{class:'btn coral block'},'Add to my wall decorations');
    wall.onclick=()=>{try{localStorage.setItem('ow_pending_deco',JSON.stringify({path:a.image_path,asp:CW/CH,at:Date.now()}));}catch(e){toast('Could not prepare that. Try again.','err');return;}close();toast('Opening your room…');setTimeout(()=>go('#/edit'),250);};
    const save=h('button',{class:'btn block',style:{marginTop:'8px'}},'Save to my phone');
    save.onclick=()=>guard(save,async()=>{const blob=await (await fetch(url)).blob();download(blob,'openwalls-artwork.jpg');});
    body.append(img,h('p',{class:'f-hint',style:{margin:'8px 0'}},new Date(a.created_at).toLocaleDateString()+' \u00b7 It hangs on the wall you are facing and you can move or resize it.'),wall,save);
  });
}
async function myArtworks(){
  sheet('My artworks',async(body)=>{body.append(spinner());
    const r=await sb.from('paint_artworks').select('id,image_path,title,space_title,created_at').eq('user_id',Auth.user.id).order('created_at',{ascending:false}).limit(60);
    if(r.error||!(r.data||[]).length){body.replaceChildren(empty('No artworks yet','Finish a painting in a Gist & Paint space and save it here.'));return;}
    body.replaceChildren(h('div',{class:'pt-gg'},r.data.map(a=>h('div',{class:'pt-gc',role:'button',tabindex:'0','aria-label':'Open artwork',style:{cursor:'pointer'},onclick:()=>openArtwork(a)},h('img',{src:publicUrl('room-images',a.image_path),alt:a.title||'Artwork',loading:'lazy'}),h('div',{class:'pt-gw'},h('div',null,h('b',null,a.space_title||'Gist & Paint'),h('span',null,new Date(a.created_at).toLocaleDateString())))))));
  });
}

/* ---------------- attach the studio to a running Space stage ---------------- */
function attach(R,ctx){
  const st=R.stage,S=R.STAGE,SX=S.SX,SZ=S.SZ,DESKY=S.DESKY,me=Auth.user.id,spaceId=ctx.id;
  const canv=new Map();let dead=false,ch=null,chOk=false,saveT=null,flushT=null,pending=null,cur=null,sp={ref:null,state:'waiting',note:'',title:''},nSeated=0,lastPaintPing=0,ov=null,lockUntil=0;
  const redraw=(()=>{let q=false;return()=>{if(q||dead)return;q=true;requestAnimationFrame(()=>{q=false;if(dead||ov)return;canv.forEach(pc=>{if(pc.tex)pc.tex.needsUpdate=true;});R.markDirty&&R.markDirty();});};})();
  const get=uid=>{let pc=canv.get(uid);if(!pc){pc=new PC(redraw);canv.set(uid,pc);}return pc;};
  const mine=get(me);

  /* ---- 3D studio ---- */
  const G=new T.Group();st.g.add(G);st.cv=[];st.cvMesh=[];
  const mat=(c,r,m)=>new T.MeshStandardMaterial({color:c,roughness:r==null?.7:r,metalness:m||0});
  const bx=(w,hh,d,m,x,y,z)=>{const o=new T.Mesh(new T.BoxGeometry(w,hh,d),m);o.position.set(x,y,z);G.add(o);return o;};
  /* wall, wooden slats, lights */
  bx(5.2,3.1,.06,mat(0x2b2150,.9),0,1.5,SZ-1.35);
  [-2.35,2.35].forEach(x=>{for(let i=0;i<5;i++)bx(.1,3.1,.1,mat(0xb98a55,.6),x+(i-2)*.16,1.5,SZ-1.28);});
  bx(4.6,.08,.08,mat(0x9a6bff,.3),0,.5,SZ-1.3).material.emissive=new T.Color(0x7b4dff);
  for(let i=0;i<3;i++){const l=new T.Mesh(new T.SphereGeometry(.07,12,10),new T.MeshBasicMaterial({color:0xffe2a8}));l.position.set((i-1)*1.2,2.95,SZ-.2);G.add(l);}
  const warm=new T.PointLight(0xffd9a8,.7,7);warm.position.set(0,2.6,SZ+.6);G.add(warm);
  /* plants */
  [-1.75,1.75].forEach(x=>{bx(.34,.34,.34,mat(0xf1eef9,.5),x,.17,SZ-1.1);const b=mat(0x2f9e5b,.8);for(let i=0;i<7;i++){const s=new T.Mesh(new T.SphereGeometry(.17+.05*(i%3),10,8),b);s.scale.set(.8,1.3,.8);s.position.set(x+Math.sin(i*1.7)*.2,.62+i*.05,SZ-1.1+Math.cos(i*1.7)*.15);G.add(s);}});
  /* neon sign */
  const sign=document.createElement('canvas');sign.width=768;sign.height=300;
  const NEONS=['#ff3fd0','#3fa9ff','#3dff9a','#ffd23f','#ff8a1f','#ff4d4d','#a66bff','#ffffff'];
  let neonC=(R.room&&R.room.theme&&R.room.theme.neon)||NEONS[0];let signT=null;
  function drawSign(col){neonC=col||neonC;const g=sign.getContext('2d');g.clearRect(0,0,768,300);g.textAlign='center';g.font='italic 800 118px Georgia,serif';g.shadowColor=neonC;g.shadowBlur=28;g.fillStyle='#fff';g.fillText('Gist & Paint',384,125);g.shadowBlur=22;g.fillStyle=neonC;g.fillText('Gist & Paint',384,125);g.shadowBlur=0;g.fillStyle='#fff';g.fillText('Gist & Paint',384,125);g.font='italic 600 40px Georgia,serif';g.shadowColor=neonC;g.shadowBlur=12;g.fillText('Create \u00b7 Gist \u00b7 Connect',384,200);g.shadowBlur=0;g.strokeStyle=neonC;g.lineWidth=8;g.lineCap='round';g.beginPath();g.moveTo(190,230);g.lineTo(580,222);g.stroke();if(signT)signT.needsUpdate=true;}
  drawSign();
  signT=new T.CanvasTexture(sign);signT.encoding=T.sRGBEncoding;const sm=new T.Mesh(new T.PlaneGeometry(1.7,.665),new T.MeshBasicMaterial({map:signT,transparent:true}));sm.position.set(0,2.62,SZ-1.31);G.add(sm);
  /* reference screen */
  const wall=document.createElement('canvas');wall.width=1024;wall.height=576;const wg=wall.getContext('2d');const wallT=new T.CanvasTexture(wall);wallT.encoding=T.sRGBEncoding;wallT.anisotropy=4;
  bx(1.86,1.1,.05,mat(0x15112a,.4),0,1.78,SZ-1.31);const wm=new T.Mesh(new T.PlaneGeometry(1.76,.99),new T.MeshBasicMaterial({map:wallT}));wm.position.set(0,1.78,SZ-1.28);G.add(wm);
  const rr=(g,x,y,w,hh,r)=>{g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+hh,r);g.arcTo(x+w,y+hh,x,y+hh,r);g.arcTo(x,y+hh,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath();};
  function drawWall(){
    const g=wg,W=1024,H=576;g.clearRect(0,0,W,H);g.fillStyle='#f3efff';rr(g,0,0,W,H,34);g.fill();
    g.fillStyle='#6a3df0';rr(g,28,24,610,92,46);g.fill();g.fillStyle='#fff';g.font='800 48px sans-serif';g.textBaseline='middle';g.fillText('What to Paint Today?',64,72);
    g.fillStyle='#4a2fc4';rr(g,806,24,190,104,24);g.fill();g.fillStyle='#fff';g.textAlign='center';g.font='800 48px sans-serif';g.fillText(String(nSeated),900,60);g.font='600 26px sans-serif';g.fillText('Painting',900,102);g.textAlign='left';
    const rc=sp.ref?refCanvas(sp.ref,()=>{drawWall();wallT.needsUpdate=true;R.markDirty&&R.markDirty();}):null;
    if(rc){g.save();rr(g,36,142,350,390,14);g.clip();g.drawImage(rc,36,142,350,390);g.restore();}
    else{g.fillStyle='#e4dcff';rr(g,36,142,350,390,14);g.fill();g.fillStyle='#6a3df0';g.font='700 28px sans-serif';g.textAlign='center';g.fillText('Host picks',211,320);g.fillText('the picture',211,356);g.textAlign='left';}
    g.fillStyle='#1d1a2b';g.font='800 38px sans-serif';g.fillText('Your Canvas',470,190);g.font='600 30px sans-serif';
    const items=sp.note?[sp.note]:['Grab your brush','Paint the picture','Enjoy your drink'];
    if(sp.note){g.fillStyle='#1d1a2b';g.font='600 30px sans-serif';const words=sp.note.split(' ');let line='',y=250;words.forEach(w=>{const t=line?line+' '+w:w;if(g.measureText(t).width>480&&line){g.fillText(line,470,y);y+=40;line=w;}else line=t;});if(line)g.fillText(line,470,y);}
    else items.forEach((t,i)=>{const y=262+i*76;g.fillStyle='#7b4dff';g.beginPath();g.arc(490,y,20,0,7);g.fill();g.strokeStyle='#fff';g.lineWidth=5;g.beginPath();g.moveTo(481,y);g.lineTo(488,y+8);g.lineTo(500,y-8);g.stroke();g.fillStyle='#1d1a2b';g.font='600 32px sans-serif';g.fillText(t,526,y+2);});
    if(sp.state!=='painting'){g.fillStyle='rgba(30,20,70,.72)';rr(g,0,0,W,H,34);g.fill();g.fillStyle='#fff';g.textAlign='center';g.font='800 64px sans-serif';g.fillText(sp.state==='paused'?'Paused':'Waiting for the host',512,270);g.font='600 34px sans-serif';g.fillText(sp.state==='paused'?'The host will resume shortly':'Painting starts soon',512,330);g.textAlign='left';}
    wallT.needsUpdate=true;R.markDirty&&R.markDirty();
  }
  /* table: easels + canvases, palettes, paints, cups */
  const paper=mat(0xfffdf8,.9),wood=mat(0xb98a55,.55),dark=mat(0x2b2f3a,.7);
  const cvW=.272,cvH=.34,tilt=-.12;
  SX.forEach((x,i)=>{
    const gr=new T.Group();gr.position.set(x,DESKY,SZ+.8);G.add(gr);
    const board=new T.Mesh(new T.BoxGeometry(cvW+.03,cvH+.03,.022),mat(0xe9e1d3,.8));board.position.set(0,.04+cvH/2,0);board.rotation.x=tilt;gr.add(board);
    const face=new T.Mesh(new T.PlaneGeometry(cvW,cvH),new T.MeshBasicMaterial({color:0xfffdf8}));face.position.set(0,.04+cvH/2,0);face.rotation.x=tilt;face.translateZ(.0125);face.userData.idx=i;gr.add(face);
    const ledge=new T.Mesh(new T.BoxGeometry(cvW+.06,.025,.07),wood);ledge.position.set(0,.02,.015);gr.add(ledge);
    [-1,1].forEach(s=>{const leg=new T.Mesh(new T.BoxGeometry(.02,.3,.02),wood);leg.position.set(s*.12,.18,-.1);leg.rotation.x=.55;gr.add(leg);});
    gr.updateMatrixWorld(true);gr.userData.pt=face.localToWorld(new T.Vector3(0,0,-.05));st.cv[i]=gr;st.cvMesh[i]=face;gr.visible=false;
    const pal=new T.Mesh(new T.CylinderGeometry(.075,.075,.008,18),mat(0xf3e7d0,.7));pal.scale.set(1.15,1,.8);pal.position.set(x-.21,DESKY+.006,SZ+.66);G.add(pal);
    ['#e63946','#ffd23f','#2d6cdf','#2bb673','#ff8a1f'].forEach((c,k)=>{const d=new T.Mesh(new T.SphereGeometry(.014,8,6),mat(parseInt(c.slice(1),16),.5));d.scale.set(1,.5,1);d.position.set(x-.21+Math.cos(k*1.3)*.05,DESKY+.014,SZ+.66+Math.sin(k*1.3)*.03);G.add(d);});
    const br=new T.Mesh(new T.CylinderGeometry(.006,.006,.2,6),mat(0x6b4a2f,.6));br.rotation.z=1.45;br.rotation.y=.3;br.position.set(x+.2,DESKY+.008,SZ+.68);G.add(br);
  });
  const tray=bx(.7,.03,.12,dark,0,DESKY+.02,SZ+.96);[['#ffd23f'],['#e63946'],['#2d6cdf'],['#1a1a1f']].forEach(([c],k)=>{const b=new T.Mesh(new T.CylinderGeometry(.028,.032,.1,12),mat(parseInt(c.slice(1),16),.4));b.position.set(-.24+k*.16,DESKY+.085,SZ+.96);G.add(b);const cap=new T.Mesh(new T.CylinderGeometry(.015,.02,.03,10),mat(0xf5f5f5,.5));cap.position.set(-.24+k*.16,DESKY+.15,SZ+.96);G.add(cap);});
  [[-.95,.9],[.95,.9]].forEach(([x,z])=>{const c=new T.Mesh(new T.CylinderGeometry(.04,.03,.09,14),mat(0x6a3df0,.5));c.position.set(x,DESKY+.065,SZ+z);G.add(c);});
  /* hide the occupied-seat prop when a seat is empty */
  function seatSync(){
    nSeated=0;SX.forEach((x,i)=>{const uid=st.seats[i];const gr=st.cv[i];if(uid)nSeated++;gr.visible=!!uid;if(uid){const pc=get(uid);const f=st.cvMesh[i];if(f.material.map!==pc.texture()){f.material.map=pc.texture();f.material.color.set(0xffffff);f.material.needsUpdate=true;}}});
    drawWall();
  }
  /* DOM badges (status under each canvas) */
  const badges=SX.map(()=>{const b=h('div',{class:'pt-badge'});st.lbl.appendChild(b);return b;});
  const oldTick=R.walkTick;
  R.walkTick=dt=>{oldTick(dt);if(!R.cam)return;const w=R.host.clientWidth,hh=R.host.clientHeight,v=new T.Vector3();
    SX.forEach((x,i)=>{const uid=st.seats[i],b=badges[i];if(!uid){b.style.display='none';return;}const pc=canv.get(uid),s=pc?pc.state():0;
      const t=STATES[s];if(b.dataset.s!==String(s)){b.dataset.s=String(s);b.textContent=(s===2?'✓ ':'')+t;b.className='pt-badge s'+s;}
      v.set(x,DESKY-.16,SZ+1.07).project(R.cam);b.style.display=v.z>1?'none':'';b.style.transform='translate(-50%,-50%) translate('+((v.x*.5+.5)*w)+'px,'+((-v.y*.5+.5)*hh)+'px)';});};
  /* tap a canvas in the 3D view */
  const ray=new T.Raycaster(),m2=new T.Vector2();
  const onClick=e=>{if(e.target.closest&&e.target.closest('button,.pt-badge,.sp-lbl'))return;const r=R.host.getBoundingClientRect();m2.set(((e.clientX-r.left)/r.width)*2-1,-((e.clientY-r.top)/r.height)*2+1);ray.setFromCamera(m2,R.cam);
    const hit=ray.intersectObjects(st.cvMesh.filter((m,i)=>st.seats[i]),false)[0];if(!hit)return;const uid=st.seats[hit.object.userData.idx];if(uid===me)openPaint();else if(uid)viewCanvas(uid);};
  R.host.addEventListener('click',onClick);

  /* ---- network: broadcast strokes, save to the database ---- */
  function send(ev,payload){if(ch&&chOk)try{ch.send({type:'broadcast',event:ev,payload});}catch(e){}}
  function connect(){
    try{ch=sb.channel('pt:'+spaceId,{config:{broadcast:{self:false}}});
      ch.on('broadcast',{event:'seg'},({payload:p})=>onSeg(p)).on('broadcast',{event:'sync'},({payload:p})=>{if(!p||!p.u||p.u===me||!Array.isArray(p.ops))return;if(!p.total||p.total<2){get(p.u).load(p.ops);return;}const b=syncIn[p.u]&&syncIn[p.u].sid===p.sid?syncIn[p.u]:(syncIn[p.u]={sid:p.sid,parts:{},n:0});if(!b.parts[p.part]){b.parts[p.part]=p.ops;b.n++;}if(b.n>=p.total){let all=[];for(let i=0;i<p.total;i++)all=all.concat(b.parts[i]||[]);delete syncIn[p.u];get(p.u).load(all);}})
        .on('broadcast',{event:'neon'},({payload:p})=>{if(p&&typeof p.c==='string'&&/^#[0-9a-f]{6}$/i.test(p.c))drawSign(p.c);}).on('broadcast',{event:'hello'},({payload:p})=>{if(p&&p.u!==me&&!mine.empty())setTimeout(()=>sendSync(),200+Math.random()*600);})
        .subscribe(s=>{if(s==='SUBSCRIBED'){chOk=true;send('hello',{u:me});}else if(s==='CLOSED'||s==='CHANNEL_ERROR')chOk=false;});}catch(e){}
  }
  const syncIn={};
  /* the whole painting is sent in pieces so a big painting still reaches viewers live (each realtime message stays small) */
  function sendSync(){const ops=mine.ops,parts=[];let cur=[],sz=0;for(const o of ops){const l=o.p?o.p.length*5+60:60;if(sz+l>90000&&cur.length){parts.push(cur);cur=[];sz=0;}cur.push(o);sz+=l;}parts.push(cur);const sid=Math.random().toString(36).slice(2,8);parts.forEach((pp,i)=>setTimeout(()=>send('sync',{u:me,ops:pp,part:i,total:parts.length,sid}),i*120));}
  const remoteOps=new Map();
  function onSeg(p){if(!p||!p.u||p.u===me||!Array.isArray(p.p))return;const pc=get(p.u);let op=remoteOps.get(p.u+':'+p.id);
    if(p.t){if(!op){op=pc.start(p.t,p.c,+p.z||8,p.p[0],p.p[1],p.id);if(!op)return;remoteOps.set(p.u+':'+p.id,op);for(let i=2;i<p.p.length;i+=2)pc.extend(op,p.p[i],p.p[i+1]);}}
    else if(op){for(let i=0;i<p.p.length;i+=2)pc.extend(op,p.p[i],p.p[i+1]);}
    const now=Date.now();if(now-lastPaintPing>600){lastPaintPing=now;R.stagePaint(p.u);}}
  function saveSoon(){clearTimeout(saveT);saveT=setTimeout(saveNow,2500);}
  async function saveNow(){clearTimeout(saveT);if(dead&&!ctx.final)return;try{const r=await sb.rpc('paint_save',{p_space:spaceId,p_ops:mine.ops,p_done:mine.state()===2});if(r.error)throw r.error;}catch(e){console.warn('paint save',e);}}
  async function loadAll(){try{const r=await sb.rpc('paint_list',{p_space:spaceId});if(r.error)throw r.error;(r.data||[]).forEach(x=>{if(x.user_id===me&&!mine.empty())return;get(x.user_id).load(x.ops);});seatSync();}catch(e){console.warn(e);}}
  connect();loadAll();

  /* ---- big view of someone else's painting (live) ---- */
  function viewCanvas(uid){
    const pc=get(uid),p=ctx.participants().find(x=>x.id===uid)||{};
    sheet('@'+(p.username||'painter'),(body)=>{const c=h('canvas',{width:CW,height:CH,class:'pt-view'});const g=c.getContext('2d');const t=setInterval(()=>{if(!c.isConnected){clearInterval(t);return;}g.drawImage(pc.cv,0,0);},400);g.drawImage(pc.cv,0,0);body.append(c,h('p',{class:'f-hint',style:{textAlign:'center'}},STATES[pc.state()]));});
  }
  /* ---- reference viewer ---- */
  function showRef(){
    if(ov){/* inside the painting screen: show it on top of that screen, not on the page behind it */
      ov.querySelector('.pt-refbox')&&ov.querySelector('.pt-refbox').remove();
      const c=h('canvas',{width:400,height:500,class:'pt-view',style:{width:'100%',height:'auto',borderRadius:'12px',display:'block'}}),g=c.getContext('2d');
      const paint=()=>{if(sp.ref)g.drawImage(refCanvas(sp.ref,paint),0,0);};paint();
      const box=h('div',{class:'pt-sig pt-refbox',onclick:e=>{if(e.target===box)box.remove();}},h('div',{class:'pt-sigc',style:{width:'min(360px,100%)',maxHeight:'100%',overflow:'auto'}},
        h('b',null,'Reference'),h('div',{style:{margin:'8px 0'}},sp.ref?c:h('p',{class:'f-hint'},'The host has not picked a picture yet.')),sp.note?h('p',{style:{margin:'0 0 8px'}},sp.note):null,h('button',{class:'btn block',onclick:()=>box.remove()},'Close')));
      ov.append(box);return;}
    sheet('Reference',(body)=>{const c=h('canvas',{width:400,height:500,class:'pt-view'});const g=c.getContext('2d');const paint=()=>{if(sp.ref){g.drawImage(refCanvas(sp.ref,paint),0,0);}else{g.fillStyle='#eee';g.fillRect(0,0,400,500);}};paint();
      body.append(sp.ref?c:h('p',{class:'f-hint'},'The host has not picked a picture yet.'),sp.note?h('p',null,sp.note):null);});
  }

  /* ---- the painting overlay ---- */
  function openPaint(){
    if(ov)return;
    if(!st.map.has(me)){toast('All four painting seats are taken. You can watch until one frees up.');return;}
    let tool='b',color=COLS[1][1],size=14,drawing=null,cur=null,sendBuf=[],lastSend=0,miniOn=true;
    const frame=h('div',{class:'pt-frame'});const cv=mine.cv;cv.className='pt-cv';let guideOn=true;const gcv=h('canvas',{class:'pt-guide',width:CW,height:CH});const stack=h('div',{class:'pt-stack'},cv,gcv);frame.append(stack);
    function drawGuide(){const g=gcv.getContext('2d');g.clearRect(0,0,CW,CH);gcv.style.display=guideOn&&sp.ref?'':'none';if(guideOn&&sp.ref)g.drawImage(guideCanvas(sp.ref,drawGuide),0,0);}
    const banner=h('div',{class:'pt-ban'});
    const sw=h('div',{class:'pt-sw'}),tools=h('div',{class:'pt-tools'}),stch=h('div',{class:'pt-st'}),size_=h('input',{type:'range',min:'3',max:'44',value:String(size),'aria-label':'Brush size'});
    const mini=h('button',{class:'pt-mini','aria-label':'Show the reference larger',onclick:showRef});const mc=refCanvas(sp.ref||'',()=>drawMini());const mg=h('canvas',{width:120,height:150});mini.append(mg);
    function drawMini(){const g=mg.getContext('2d');g.fillStyle='#eee';g.fillRect(0,0,120,150);if(sp.ref)g.drawImage(refCanvas(sp.ref,drawMini),0,0,120,150);}
    const paintSw=()=>sw.replaceChildren(...COLS.map(([n,c])=>h('button',{class:'pt-c'+(c===color?' on':''),style:{background:c},'aria-label':n,title:n,onclick:()=>{color=c;if(tool==='e')tool='b';paintTools();paintSw();}})));
    const T3=[['b','Brush'],['p','Pencil'],['e','Eraser']];
    const act=(l,fn,cls)=>h('button',{class:'pt-b '+(cls||''),onclick:fn},l);
    function paintTools(){tools.replaceChildren(...T3.map(([k,l])=>h('button',{class:'pt-b'+(tool===k?' on':''),onclick:()=>{tool=k;paintTools();}},l)),h('button',{class:'pt-b'+(guideOn?' on':''),onclick:()=>{guideOn=!guideOn;drawGuide();paintTools();}},'Guide'),act('Sign',()=>signPad(false)),act('Undo',()=>{if(mine.undo())changed(true);}),act('Redo',()=>{if(mine.redoOp())changed(true);}),act('Clear',()=>{if(mine.empty())return;if(confirm('Clear your whole canvas?')){mine.clear();changed(true);}},'warn'));}
    function paintState(){stch.replaceChildren(...STATES.map((l,i)=>h('button',{class:'pt-sc'+(mine.state()===i?' on':''),onclick:()=>{mine.setState(i);changed(true);paintState();if(i===2&&!mine.ops.some(o=>o.sig))signPad(true);}},l)));}
    function changed(full){redraw();if(full)sendSync();saveSoon();}
    /* sign the artwork: draw a signature on a small pad, it is stamped small in the bottom-right corner as ordinary strokes (so it syncs, saves and shows in the gallery) */
    function signPad(offer){
      if(!ov)return;ov.querySelector('.pt-sig')&&ov.querySelector('.pt-sig').remove();
      const W=320,H=120,pad=h('canvas',{width:W,height:H,class:'pt-sigpad'}),g=pad.getContext('2d');let strokes=[],cur=null,id=null;
      const paint=()=>{g.clearRect(0,0,W,H);g.fillStyle='#fffdf8';g.fillRect(0,0,W,H);g.strokeStyle='#e3d9c8';g.lineWidth=2;g.beginPath();g.moveTo(16,H-30);g.lineTo(W-16,H-30);g.stroke();
        g.strokeStyle='#1d1a2b';g.lineWidth=3;g.lineCap=g.lineJoin='round';strokes.forEach(st=>{g.beginPath();st.forEach((q,i)=>i?g.lineTo(q[0],q[1]):g.moveTo(q[0],q[1]));if(st.length===1)g.lineTo(st[0][0]+.1,st[0][1]);g.stroke();});};
      const pt=e=>{const r=pad.getBoundingClientRect();return[(e.clientX-r.left)*W/r.width,(e.clientY-r.top)*H/r.height];};
      pad.addEventListener('pointerdown',e=>{e.preventDefault();id=e.pointerId;try{pad.setPointerCapture(id);}catch(x){}cur=[pt(e)];strokes.push(cur);paint();});
      pad.addEventListener('pointermove',e=>{if(id!==e.pointerId||!cur)return;e.preventDefault();cur.push(pt(e));paint();});
      const up=e=>{if(id===e.pointerId){cur=null;id=null;}};pad.addEventListener('pointerup',up);pad.addEventListener('pointercancel',up);
      const box=h('div',{class:'pt-sig'});const closeS=()=>box.remove();
      const stamp=()=>{
        const pts=strokes.flat();if(!pts.length){toast('Draw your signature first');return;}
        const xs=pts.map(q=>q[0]),ys=pts.map(q=>q[1]),x0=Math.min(...xs),x1=Math.max(...xs),y0=Math.min(...ys),y1=Math.max(...ys),bw=Math.max(1,x1-x0),bh=Math.max(1,y1-y0);
        const TW=170,TH=60,sc=Math.min(TW/bw,TH/bh,1.4),ox=CW-24-bw*sc,oy=CH-26-bh*sc;
        mine.ops=mine.ops.filter(o=>!o.sig);
        const conv=st=>st.reduce((a,q)=>{a.push(Math.round(ox+(q[0]-x0)*sc),Math.round(oy+(q[1]-y0)*sc));return a;},[]);
        strokes.forEach(st=>{const c=conv(st);if(c.length<4)c.push(c[0]+1,c[1]);mine.ops.push({k:'s',t:'p',c:'#ffffff',z:20,p:c,id:null,sig:1});});
        strokes.forEach(st=>{const c=conv(st);if(c.length<4)c.push(c[0]+1,c[1]);mine.ops.push({k:'s',t:'p',c:'#1d1a2b',z:11,p:c,id:null,sig:1});});
        mine.render();changed(true);closeS();toast('Signed');};
      box.append(h('div',{class:'pt-sigc'},h('b',null,offer?'Your painting is complete. Sign it?':'Sign your artwork'),h('p',{class:'f-hint',style:{margin:'4px 0 8px'}},'Draw your signature with your finger. It goes small in the bottom-right corner.'),pad,
        h('div',{class:'pt-hc',style:{marginTop:'10px'}},h('button',{class:'btn small',onclick:()=>{strokes=[];paint();}},'Clear'),h('button',{class:'btn small',onclick:()=>{mine.ops=mine.ops.filter(o=>!o.sig);mine.render();changed(true);closeS();}},'Remove signature'),h('button',{class:'btn small',onclick:closeS},offer?'Skip':'Cancel'),h('button',{class:'btn coral small',onclick:stamp},'Sign'))));
      ov.append(box);paint();
    }
    const allowed=()=>sp.state==='painting';
    function paintBan(){banner.textContent=sp.state==='painting'?'':(sp.state==='paused'?'Painting is paused by the host':'Waiting for the host to start the session');banner.style.display=sp.state==='painting'?'none':'';}
    const pos=e=>{const r=cv.getBoundingClientRect();return[(e.clientX-r.left)/r.width*CW,(e.clientY-r.top)/r.height*CH];};
    const down=e=>{if(!allowed()||drawing!==null)return;e.preventDefault();try{cv.setPointerCapture(e.pointerId);}catch(x){}drawing=e.pointerId;const[x,y]=pos(e);const id=Math.random().toString(36).slice(2,8);cur=mine.start(tool,color,size,x,y,id);if(!cur){drawing=null;return;}sendBuf=[cur.p[0],cur.p[1]];cur.first=true;flush();};
    const move=e=>{if(drawing!==e.pointerId||!cur)return;e.preventDefault();const ev=e.getCoalescedEvents?e.getCoalescedEvents():[e];(ev.length?ev:[e]).forEach(q=>{const[x,y]=pos(q);if(mine.extend(cur,x,y))sendBuf.push(Math.round(x),Math.round(y));});const n=Date.now();if(n-lastSend>110)flush();if(n-lastPaintPing>600){lastPaintPing=n;R.stagePaint(me);}};
    const up=e=>{if(drawing!==e.pointerId)return;drawing=null;flush();cur=null;saveSoon();};
    function flush(){lastSend=Date.now();if(!cur||!sendBuf.length)return;const p={u:me,id:cur.id,p:sendBuf};if(cur.first){p.t=cur.t;p.c=cur.c;p.z=cur.z;cur.first=false;}send('seg',p);sendBuf=[];}
    cv.addEventListener('pointerdown',down);cv.addEventListener('pointermove',move);cv.addEventListener('pointerup',up);cv.addEventListener('pointercancel',up);cv.style.touchAction='none';
    size_.oninput=()=>{size=+size_.value;};
    const key=e=>{if(e.target&&/INPUT|TEXTAREA/.test(e.target.tagName)&&e.target.type!=='range')return;const k=e.key.toLowerCase();
      if((e.ctrlKey||e.metaKey)&&k==='z'){e.preventDefault();if(e.shiftKey?mine.redoOp():mine.undo())changed(true);}else if((e.ctrlKey||e.metaKey)&&k==='y'){e.preventDefault();if(mine.redoOp())changed(true);}
      else if(k==='b'){tool='b';paintTools();}else if(k==='p'){tool='p';paintTools();}else if(k==='e'){tool='e';paintTools();}
      else if(k==='['){size=Math.max(3,size-3);size_.value=size;}else if(k===']'){size=Math.min(44,size+3);size_.value=size;}else if(k==='escape')close();};
    document.addEventListener('keydown',key);
    function fit(){const w=frame.clientWidth,hh=frame.clientHeight;if(!w||!hh)return;const s=Math.min(w/CW,hh/CH);cv.style.width=Math.floor(CW*s)+'px';cv.style.height=Math.floor(CH*s)+'px';}
    const ro=window.ResizeObserver?new ResizeObserver(fit):null;
    function close(){if(!ov)return;flush();document.removeEventListener('keydown',key);ro&&ro.disconnect();stack.remove();cv.remove();cv.removeAttribute('style');ov.remove();ov=null;R.setPaused&&R.setPaused(false);redraw();saveNow();sendSync();}
    ov=h('div',{class:'pt-ov'},
      h('div',{class:'pt-top'},h('button',{class:'pt-done',onclick:close},'Done'),h('b',null,'My canvas'),h('button',{class:'pt-ref',onclick:showRef},'Reference')),
      banner,frame,mini,
      h('div',{class:'pt-dock'},tools,h('div',{class:'pt-sz'},h('span',null,'Size'),size_),sw,stch));
    document.body.appendChild(ov);R.setPaused&&R.setPaused(true);ro&&ro.observe(frame);fit();paintTools();paintSw();paintState();paintBan();drawMini();drawGuide();
    ov._upd=()=>{paintBan();drawMini();drawGuide();};
  }

  /* ---- host studio panel ---- */
  function studio(){
    sheet('Studio controls',(body,close)=>{
      const draw=()=>{body.replaceChildren();build();};
      const build=()=>{
      const send_=(a,v)=>guard(null,async()=>{const r=await sb.rpc('paint_host',{p_space:spaceId,p_action:a,p_val:v==null?null:v});if(r.error)throw r.error;
        lockUntil=Date.now()+6000;if(a==='ref')sp.ref=v||null;else if(a==='note')sp.note=(v||'').trim().slice(0,200);else if(a==='start'||a==='resume')sp.state='painting';else if(a==='pause')sp.state='paused';
        seatSync();paintHud();ov&&ov._upd&&ov._upd();ctx.refresh&&ctx.refresh();if(a==='start'||a==='resume'){toast('Painting started');close();}else if(a!=='note')draw();});
      const grid=h('div',{class:'pt-refs'},REFS.map(([id,n])=>{const c=refCanvas('ref:'+id);const t=h('canvas',{width:100,height:125});t.getContext('2d').drawImage(c,0,0,100,125);return h('button',{class:'pt-rb'+(sp.ref==='ref:'+id?' on':''),onclick:async()=>{await send_('ref','ref:'+id);toast('Reference changed');}},t,h('span',null,n));}));
      const note=h('textarea',{maxlength:'200',rows:'2',placeholder:'Instructions for everyone (optional)'});note.value=sp.note||'';
      const saveN=h('button',{class:'btn small'},'Show on the screen');saveN.onclick=()=>send_('note',note.value);
      const clr=h('button',{class:'btn small'},'Clear picture');clr.onclick=()=>send_('ref','');
      const ctl=h('div',{class:'pt-hc'},sp.state==='waiting'?h('button',{class:'btn coral',onclick:()=>send_('start')},'Start painting'):sp.state==='painting'?h('button',{class:'btn',onclick:()=>send_('pause')},'Pause'):h('button',{class:'btn coral',onclick:()=>send_('resume')},'Resume'));
      const neonRow=h('div',{class:'pt-neon'},NEONS.map(c=>h('button',{class:'pt-nsw'+(c.toLowerCase()===String(neonC).toLowerCase()?' on':''),style:{background:c},'aria-label':'Neon colour '+c,onclick:()=>{drawSign(c);send('neon',{c});Store.hostNeon&&Store.hostNeon(c);[...neonRow.children].forEach(x=>x.classList.toggle('on',x===neonRow.children[NEONS.indexOf(c)]));}})));
      body.append(h('p',{class:'f-hint'},'Session: '+(sp.state==='waiting'?'waiting to start':sp.state)),ctl,h('div',{class:'f-label',style:{margin:'14px 0 6px'}},'Reference picture'),grid,h('div',{class:'pt-hc',style:{marginTop:'8px'}},clr),h('div',{class:'f-label',style:{margin:'14px 0 6px'}},'Instructions'),note,h('div',{style:{marginTop:'6px'}},saveN),
        h('div',{class:'f-label',style:{margin:'14px 0 6px'}},'Neon sign colour'),neonRow,
        h('div',{class:'pt-hc',style:{marginTop:'14px'}},h('button',{class:'btn small',onclick:()=>{close();galleryModal();}},'Show all paintings')));
    };build();
    });
  }
  function galleryModal(){sheet('Gallery',async(body)=>{body.append(spinner());await saveNow();const gv=await galleryView(spaceId,sp.title);const t0=gv.querySelector('h3');t0&&t0.remove();body.replaceChildren(gv);});}

  /* ---- HUD buttons ---- */
  const hud=h('div',{class:'pt-hud'});
  function paintHud(){hud.replaceChildren(...[
    h('button',{class:'pt-hb coral',onclick:openPaint},st.map.has(me)?'Paint':'Watching'),
    h('button',{class:'pt-hb',onclick:showRef},'Reference'),
    h('button',{class:'pt-hb',onclick:galleryModal},'Gallery'),
    ctx.isHost()?h('button',{class:'pt-hb',onclick:studio},'Studio'):null,
    sp.state!=='painting'?h('span',{class:'pt-hs'},sp.state==='paused'?'Paused':ctx.isHost()?'Press Studio, pick a picture, then start':'Waiting for the host to start'):null].filter(Boolean));}
  paintHud();drawWall();

  return{hud,
    update(D){if(dead)return;const s=Object.assign({},D.space);if(Date.now()<lockUntil){s.paint_ref=sp.ref;s.paint_state=sp.state;s.paint_note=sp.note;}const ch_=sp.ref!==s.paint_ref||sp.state!==s.paint_state||sp.note!==(s.paint_note||'');
      sp={ref:s.paint_ref||null,state:s.paint_state||'waiting',note:s.paint_note||'',title:s.title};seatSync();if(ch_){paintHud();ov&&ov._upd&&ov._upd();}},
    seatSync,
    async finalSave(){ctx.final=true;await saveNow();},
    destroy(){dead=true;clearTimeout(saveT);try{if(ov){mine.cv.remove();ov.remove();ov=null;}}catch(e){}try{R.host.removeEventListener('click',onClick);}catch(e){}try{ch&&sb.removeChannel(ch);}catch(e){}badges.forEach(b=>b.remove());hud.remove();}};
}
return{attach,galleryView,myArtworks,PC,REFS,guideCanvas,refCanvas};
})();
