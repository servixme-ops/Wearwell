/* OpenWalls gallery: painterly-realistic artworks drawn in code (800x1000). Original scenes, no outside images. */
(function(){
  const W=800,H=1000,TAU=Math.PI*2;
  function rng(seed){let a=seed>>>0;return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
  const hasF=(()=>{try{const g=document.createElement('canvas').getContext('2d');g.filter='blur(2px)';return g.filter==='blur(2px)';}catch(e){return false;}})();
  const blur=(g,px,fn)=>{g.save();if(hasF&&px>0)g.filter='blur('+px+'px)';fn();g.restore();};
  const lin=(g,x0,y0,x1,y1,st)=>{const q=g.createLinearGradient(x0,y0,x1,y1);st.forEach(([o,c])=>q.addColorStop(o,c));return q;};
  const rad=(g,x,y,r0,r1,st)=>{const q=g.createRadialGradient(x,y,r0,x,y,r1);st.forEach(([o,c])=>q.addColorStop(o,c));return q;};
  let GR=null;
  function grainTile(){if(GR)return GR;const c=document.createElement('canvas');c.width=c.height=256;const x=c.getContext('2d'),d=x.createImageData(256,256),r=rng(7);for(let i=0;i<d.data.length;i+=4){const v=128+(r()-.5)*90;d.data[i]=d.data[i+1]=d.data[i+2]=v;d.data[i+3]=255;}x.putImageData(d,0,0);return GR=c;}
  function finish(g,seed,vig,grain){
    g.save();g.globalCompositeOperation='overlay';g.globalAlpha=grain==null?.22:grain;g.fillStyle=g.createPattern(grainTile(),'repeat');g.fillRect(0,0,W,H);g.restore();
    g.save();g.fillStyle=rad(g,W/2,H*.48,H*.35,H*.78,[[0,'rgba(0,0,0,0)'],[1,'rgba(10,6,12,'+(vig==null?.5:vig)+')']]);g.fillRect(0,0,W,H);g.restore();}
  function cloudBand(g,r,y,h,cols,n,wmin,wmax,al){for(let i=0;i<n;i++){const x=r()*W,w=wmin+r()*(wmax-wmin),hh=h*(.4+r()*.6),c=cols[(r()*cols.length)|0];blur(g,14+r()*16,()=>{g.fillStyle=c;g.globalAlpha=al*(.5+r()*.5);g.beginPath();g.ellipse(x,y+(r()-.5)*h,w,hh,0,0,TAU);g.fill();});}g.globalAlpha=1;}
  function streakClouds(g,r,y0,y1,cols,n){for(let i=0;i<n;i++){const y=y0+r()*(y1-y0),x=r()*W-100,w=160+r()*420,hh=4+r()*16,c=cols[(r()*cols.length)|0];blur(g,6+r()*8,()=>{g.fillStyle=c;g.globalAlpha=.25+r()*.4;g.beginPath();g.ellipse(x+w/2,y,w/2,hh,(r()-.5)*.05,0,TAU);g.fill();});}g.globalAlpha=1;}

  /* ---------------- Zuma Rock at golden hour ---------------- */
  function zuma(g){const r=rng(11);
    g.fillStyle=lin(g,0,0,0,H*.7,[[0,'#2c2f5e'],[.25,'#8a4a78'],[.5,'#e2733a'],[.72,'#ffb15a'],[1,'#ffe0a0']]);g.fillRect(0,0,W,H);
    streakClouds(g,r,60,520,['#ffd9a0','#ff9a5a','#b4507a','#5a3a7a'],46);
    blur(g,28,()=>{g.fillStyle=rad(g,W*.7,H*.52,0,330,[[0,'rgba(255,246,210,1)'],[.25,'rgba(255,214,140,.75)'],[1,'rgba(255,150,70,0)']]);g.fillRect(0,0,W,H);});
    g.fillStyle='#fff7da';g.beginPath();g.arc(W*.7,H*.52,38,0,TAU);g.fill();
    /* distant ridge in haze */
    g.fillStyle='rgba(120,70,92,.55)';g.beginPath();g.moveTo(0,H*.66);for(let x=0;x<=W;x+=20)g.lineTo(x,H*.66-14-Math.sin(x*.012)*12-r()*6);g.lineTo(W,H*.7);g.lineTo(0,H*.7);g.fill();
    /* the rock: a tall granite monolith, faceted, lit on its right flank by the low sun */
    const prof=[];{const base=[[60,.77],[96,.66],[124,.52],[150,.4],[176,.3],[214,.22],[262,.17],[318,.145],[372,.13],[424,.135],[468,.16],[500,.2],[528,.27],[556,.38],[590,.5],[630,.62],[680,.7],[742,.77]];base.forEach(([x,y],i)=>{const j=i>1&&i<base.length-2?1:0;prof.push([x+(r()-.5)*16*j,H*y+(r()-.5)*14*j]);});}
    const outline=()=>{g.beginPath();g.moveTo(prof[0][0],prof[0][1]);for(let i=1;i<prof.length-1;i++){const mx=(prof[i][0]+prof[i+1][0])/2,my=(prof[i][1]+prof[i+1][1])/2;g.quadraticCurveTo(prof[i][0],prof[i][1],mx,my);}g.lineTo(prof[prof.length-1][0],prof[prof.length-1][1]);g.closePath();};
    g.save();outline();g.clip();
    g.fillStyle='#1a0c14';g.fillRect(0,0,W,H);
    const cuts=[60,150,215,290,360,430,490,550,620,700,760];
    for(let i=0;i<cuts.length-1;i++){const x0=cuts[i],x1=cuts[i+1],lit=Math.pow(i/(cuts.length-2),1.8);const rr=Math.round(26+lit*180),gg=Math.round(12+lit*92),bb=Math.round(22+lit*54);
      g.fillStyle=lin(g,x0,H*.12,x1,H*.76,[[0,'rgb('+Math.round(rr*.9)+','+Math.round(gg*.9)+','+Math.round(bb*.9)+')'],[1,'rgb('+rr+','+gg+','+bb+')']]);
      g.beginPath();g.moveTo(x0+(r()-.5)*14,H*.1);g.lineTo(x1+(r()-.5)*14,H*.1);g.lineTo(x1+(r()-.5)*30,H*.8);g.lineTo(x0+(r()-.5)*30,H*.8);g.closePath();g.fill();}
    for(let i=0;i<230;i++){const x=70+r()*660,y0=H*(.13+r()*.35),l=70+r()*330;const lit=(x-60)/700;g.strokeStyle='rgba('+(r()<.5?'0,0,0':(lit>.5?'255,176,110':'90,50,60'))+','+(.07+r()*.16)+')';g.lineWidth=1+r()*4;g.beginPath();g.moveTo(x,y0);g.bezierCurveTo(x+(r()-.5)*18,y0+l*.35,x+(r()-.5)*28,y0+l*.7,x+(r()-.5)*22,y0+l);g.stroke();}
    for(let i=0;i<420;i++){g.fillStyle='rgba('+(r()<.55?'12,4,10':'255,190,130')+','+(.05+r()*.16)+')';g.beginPath();g.ellipse(70+r()*660,H*(.14+r()*.62),1.5+r()*9,1+r()*4,r()*3,0,TAU);g.fill();}
    g.fillStyle=lin(g,0,H*.5,0,H*.78,[[0,'rgba(236,140,90,0)'],[1,'rgba(246,160,96,.75)']]);g.fillRect(0,H*.5,W,H*.3);
    g.restore();
    g.save();outline();g.lineWidth=3;g.strokeStyle='rgba(255,196,130,.28)';g.stroke();g.restore();
    /* scrub clinging to the base */
    for(let i=0;i<70;i++){const x=60+r()*680,y=H*(.73+r()*.04);g.fillStyle='rgba('+(20+r()*20|0)+','+(14+r()*14|0)+',10,'+(.5+r()*.4)+')';g.beginPath();g.ellipse(x,y,6+r()*16,3+r()*7,0,0,TAU);g.fill();}
    /* savanna */
    g.fillStyle=lin(g,0,H*.74,0,H,[[0,'#7a4a2a'],[.4,'#4a2a1a'],[1,'#1a0d0c']]);g.fillRect(0,H*.745,W,H*.26);
    blur(g,3,()=>{g.fillStyle='rgba(255,190,110,.35)';g.fillRect(0,H*.74,W,6);});
    /* laterite road */
    g.fillStyle=lin(g,0,H*.76,0,H,[[0,'#b4562c'],[1,'#5a2418']]);g.beginPath();g.moveTo(W*.4,H*.755);g.lineTo(W*.52,H*.755);g.lineTo(W*.95,H);g.lineTo(W*.1,H);g.fill();
    g.fillStyle='rgba(255,200,130,.18)';g.beginPath();g.moveTo(W*.46,H*.76);g.lineTo(W*.5,H*.76);g.lineTo(W*.7,H);g.lineTo(W*.5,H);g.fill();
    for(let i=0;i<420;i++){const x=r()*W,y=H*.76+Math.pow(r(),.6)*H*.24,s=(y-H*.74)/(H*.26);g.strokeStyle='rgba('+(r()<.5?'20,10,6':'210,140,70')+','+(.25+r()*.4)+')';g.lineWidth=.8+s*2;g.beginPath();g.moveTo(x,y);g.quadraticCurveTo(x+(r()-.5)*10*s,y-14*s,x+(r()-.5)*18*s,y-(20+r()*40)*s);g.stroke();}
    const acacia=(x,y,s)=>{g.fillStyle='#0f0709';g.strokeStyle='#0f0709';g.lineWidth=7*s;g.lineCap='round';g.beginPath();g.moveTo(x,y);g.quadraticCurveTo(x+10*s,y-60*s,x-6*s,y-104*s);g.stroke();for(let k=0;k<5;k++){const a=-1+k*.5;g.lineWidth=4*s;g.beginPath();g.moveTo(x-6*s,y-100*s);g.lineTo(x-6*s+Math.sin(a)*70*s,y-118*s-Math.cos(a)*6*s);g.stroke();}
      g.beginPath();g.ellipse(x-4*s,y-122*s,92*s,20*s,0,0,TAU);g.fill();g.beginPath();g.ellipse(x-34*s,y-112*s,44*s,12*s,0,0,TAU);g.fill();g.beginPath();g.ellipse(x+40*s,y-114*s,46*s,12*s,0,0,TAU);g.fill();};
    acacia(150,H*.86,1.25);acacia(640,H*.8,.85);
    for(let i=0;i<5;i++){const x=470+r()*160,y=H*.78+r()*20;g.fillStyle='#0f0709';g.beginPath();g.ellipse(x,y,8,4,0,0,TAU);g.fill();g.fillRect(x-1,y-10,2,8);} /* grazing cattle far off */
    streakClouds(g,r,H*.74,H*.77,['#ffd9a0'],7);
    finish(g,11,.55,.2);}

  /* ---------------- Third Mainland Bridge at dusk ---------------- */
  function bridge(g){const r=rng(23);
    g.fillStyle=lin(g,0,0,0,H*.58,[[0,'#10163f'],[.3,'#3b2c74'],[.55,'#c04a7e'],[.8,'#ff9a5a'],[1,'#ffd08a']]);g.fillRect(0,0,W,H);
    cloudBand(g,r,H*.22,H*.22,['#6a3a8a','#c05a8a','#ff9a6a'],18,90,260,.55);streakClouds(g,r,H*.1,H*.5,['#ff9aa0','#ffb27a','#8a5aa8'],26);
    blur(g,24,()=>{g.fillStyle=rad(g,W*.28,H*.55,0,260,[[0,'rgba(255,236,170,.95)'],[.3,'rgba(255,170,100,.55)'],[1,'rgba(255,120,80,0)']]);g.fillRect(0,0,W,H);});
    g.fillStyle='#ffe9b5';g.beginPath();g.arc(W*.28,H*.55,26,0,TAU);g.fill();
    const hz=H*.63;
    /* far shore skyline in haze */
    const sky=(x0,x1,col,hmax,al)=>{g.fillStyle=col;let x=x0;while(x<x1){const bw=14+r()*34,bh=20+r()*hmax;g.globalAlpha=al;g.fillRect(x,hz-bh,bw,bh+2);x+=bw+r()*6;}g.globalAlpha=1;};
    sky(0,W,'#5b3a6e',60,.7);sky(0,W,'#2d2050',90,.9);
    for(let i=0;i<110;i++){g.fillStyle='rgba(255,214,130,'+(.4+r()*.5)+')';g.fillRect(r()*W,hz-r()*120,2,3);}
    /* water */
    g.fillStyle=lin(g,0,hz,0,H,[[0,'#d9814e'],[.12,'#8a3f6a'],[.45,'#2a2a62'],[1,'#0a0e2c']]);g.fillRect(0,hz,W,H-hz);
    blur(g,10,()=>{g.fillStyle=lin(g,0,hz,0,H*.9,[[0,'rgba(255,214,140,.85)'],[1,'rgba(255,170,100,0)']]);g.fillRect(W*.28-40,hz,80,H*.3);});
    for(let i=0;i<260;i++){const y=hz+4+Math.pow(r(),1.4)*(H-hz-4),k=(y-hz)/(H-hz),x=r()*W,l=20+k*120*r();g.strokeStyle='rgba('+(r()<.5?'255,210,150':'160,170,230')+','+(.08+r()*.22*(1-k*.5))+')';g.lineWidth=1+k*2;g.beginPath();g.moveTo(x,y);g.lineTo(x+l,y);g.stroke();}
    /* bridge: long low deck with a cable-stayed pylon and fans */
    const dy=hz+22;
    g.fillStyle='#0b0b22';g.fillRect(0,dy-8,W,12);g.fillRect(0,dy+4,W,4);
    for(let x=0;x<W;x+=40){g.fillRect(x,dy+8,6,30+((x/40)%2)*4);}
    g.fillStyle='rgba(255,226,150,.85)';for(let x=6;x<W;x+=20){g.fillRect(x,dy-14,2,5);}
    const pyl=(x,top)=>{g.fillStyle='#0d0d28';g.beginPath();g.moveTo(x-9,dy);g.lineTo(x-4,top);g.lineTo(x+4,top);g.lineTo(x+9,dy);g.fill();g.strokeStyle='rgba(20,18,50,.95)';g.lineWidth=1.6;for(let k=1;k<=11;k++){const ty=top+k*(dy-top)*.06;g.beginPath();g.moveTo(x,ty);g.lineTo(x-k*24,dy-8);g.moveTo(x,ty);g.lineTo(x+k*24,dy-8);g.stroke();}g.fillStyle='#ff4040';g.beginPath();g.arc(x,top-4,3,0,TAU);g.fill();};
    pyl(250,hz-210);pyl(560,hz-190);
    /* cars as light streaks */
    for(let i=0;i<42;i++){const x=r()*W,w=r()*14+6;g.fillStyle=r()<.5?'rgba(255,240,210,.95)':'rgba(255,60,50,.9)';g.fillRect(x,dy-12,w,3);blur(g,3,()=>{g.fillStyle=g.fillStyle;g.fillRect(x-4,dy-14,w+8,7);});}
    /* reflections of bridge lights */
    for(let x=6;x<W;x+=20){blur(g,2,()=>{g.fillStyle='rgba(255,210,130,.28)';g.fillRect(x,dy+40,2,120*(.4+r()*.6));});}
    for(let i=0;i<30;i++){blur(g,3,()=>{g.fillStyle='rgba(255,70,60,.22)';g.fillRect(r()*W,dy+44,3,60*r()+20);});}
    /* fishing canoes with lantern */
    const canoe=(x,y,s,lamp)=>{g.fillStyle='#07081a';g.beginPath();g.moveTo(x-70*s,y);g.quadraticCurveTo(x,y+16*s,x+70*s,y-2*s);g.quadraticCurveTo(x+56*s,y+8*s,x,y+14*s);g.quadraticCurveTo(x-56*s,y+10*s,x-70*s,y);g.fill();g.beginPath();g.ellipse(x-10*s,y-22*s,9*s,11*s,0,0,TAU);g.fill();g.fillRect(x-17*s,y-14*s,14*s,16*s);g.strokeStyle='#07081a';g.lineWidth=3*s;g.beginPath();g.moveTo(x+10*s,y-18*s);g.lineTo(x+78*s,y-34*s);g.stroke();
      if(lamp){blur(g,10,()=>{g.fillStyle='rgba(255,190,90,.8)';g.beginPath();g.arc(x+50*s,y-8*s,14*s,0,TAU);g.fill();});g.fillStyle='#ffe3a0';g.beginPath();g.arc(x+50*s,y-8*s,3.4*s,0,TAU);g.fill();blur(g,5,()=>{g.fillStyle='rgba(255,190,90,.35)';g.fillRect(x+47*s,y+4*s,6*s,70*s);});}};
    canoe(210,H*.8,1.25,true);canoe(560,H*.9,1.8,false);canoe(430,H*.73,.7,true);
    finish(g,23,.55,.2);}

  /* ---------------- Eyo masquerade at dusk ---------------- */
  function eyo(g){const r=rng(37);
    g.fillStyle=lin(g,0,0,0,H,[[0,'#2a1d3e'],[.4,'#a2543a'],[.7,'#e29a4a'],[1,'#3a2418']]);g.fillRect(0,0,W,H);
    /* out-of-focus Lagos Island street: bokeh lights, buildings, banners */
    blur(g,16,()=>{for(let i=0;i<14;i++){g.fillStyle=['#4a2a3a','#7a3a2a','#3a2a4a','#5a3a1a'][i%4];const x=i*70-20,h=300+r()*260;g.fillRect(x,H*.62-h,70+r()*20,h);}
      for(let i=0;i<46;i++){g.fillStyle='rgba('+(r()<.5?'255,210,120':'255,150,90')+','+(.35+r()*.5)+')';g.beginPath();g.arc(r()*W,H*.2+r()*H*.45,10+r()*24,0,TAU);g.fill();}
      for(let i=0;i<8;i++){g.fillStyle=['#e0b020','#0d7a74','#c03a3a','#f6f1e4'][i%4];g.fillRect(40+i*100,H*.3+(i%3)*30,60,36);}});
    blur(g,7,()=>{g.fillStyle=lin(g,0,H*.62,0,H,[[0,'#6a4a30'],[1,'#1c120c']]);g.fillRect(0,H*.62,W,H*.4);for(let i=0;i<60;i++){g.fillStyle='rgba(255,190,120,'+(.05+r()*.12)+')';g.fillRect(r()*W,H*.65+r()*H*.3,30+r()*80,3);}});
    /* warm rim light behind the figure */
    blur(g,30,()=>{g.fillStyle=rad(g,W*.52,H*.42,0,420,[[0,'rgba(255,205,130,.85)'],[1,'rgba(255,150,70,0)']]);g.fillRect(0,0,W,H);});
    const cx=W*.5;
    /* robe: shoulders first, then a wide flowing skirt of folds; lit from the left */
    const robe=()=>{g.beginPath();g.moveTo(cx-60,H*.385);g.bezierCurveTo(cx-130,H*.4,cx-190,H*.45,cx-215,H*.54);g.bezierCurveTo(cx-262,H*.68,cx-292,H*.84,cx-306,H*.965);g.lineTo(cx+306,H*.965);g.bezierCurveTo(cx+292,H*.84,cx+262,H*.68,cx+215,H*.54);g.bezierCurveTo(cx+190,H*.45,cx+130,H*.4,cx+60,H*.385);g.closePath();};
    g.save();robe();g.clip();g.fillStyle=lin(g,cx-300,0,cx+300,0,[[0,'#fff7e8'],[.3,'#f1e7d2'],[.65,'#c8bba2'],[1,'#6e5f50']]);g.fillRect(0,0,W,H);
    for(let i=0;i<30;i++){const t=i/29,x0=cx-70+t*140,x1=cx-306+t*612;const w=5+r()*14;g.strokeStyle='rgba(60,42,34,'+(.08+r()*.14)+')';g.lineWidth=w;g.beginPath();g.moveTo(x0,H*.42);g.bezierCurveTo(x0+(x1-x0)*.28+(r()-.5)*24,H*.56,x0+(x1-x0)*.72+(r()-.5)*40,H*.8,x1+(r()-.5)*18,H*.97);g.stroke();
      g.strokeStyle='rgba(255,252,240,'+(.1+r()*.2)+')';g.lineWidth=1.5+r()*4;g.beginPath();g.moveTo(x0+w*.5,H*.42);g.bezierCurveTo(x0+(x1-x0)*.28+w*.5,H*.56,x0+(x1-x0)*.72+w*.5,H*.8,x1+w*.5,H*.97);g.stroke();}
    /* soft shoulder shading and a darker hem near the ground */
    blur(g,30,()=>{g.fillStyle='rgba(70,50,40,.5)';g.beginPath();g.ellipse(cx+190,H*.62,70,170,.12,0,TAU);g.fill();g.fillStyle='rgba(255,252,240,.35)';g.beginPath();g.ellipse(cx-120,H*.55,36,140,-.12,0,TAU);g.fill();});
    g.fillStyle=lin(g,0,H*.86,0,H*.97,[[0,'rgba(60,40,30,0)'],[1,'rgba(40,26,20,.65)']]);g.fillRect(0,H*.86,W,H*.11);g.restore();
    /* hanging sleeve on the staff side */
    g.save();g.fillStyle=lin(g,cx+150,0,cx+340,0,[[0,'#d6cab2'],[1,'#7a6a58']]);g.beginPath();g.moveTo(cx+170,H*.47);g.bezierCurveTo(cx+240,H*.5,cx+300,H*.58,cx+330,H*.7);g.bezierCurveTo(cx+300,H*.73,cx+240,H*.69,cx+190,H*.63);g.closePath();g.fill();
    g.strokeStyle='rgba(60,42,34,.25)';g.lineWidth=3;for(let k=0;k<5;k++){g.beginPath();g.moveTo(cx+176+k*6,H*.48+k*14);g.quadraticCurveTo(cx+250,H*.55+k*8,cx+322-k*4,H*.69);g.stroke();}g.restore();
    /* opa staff held in the hand */
    g.strokeStyle='#5a3418';g.lineWidth=11;g.lineCap='round';g.beginPath();g.moveTo(cx+318,H*.3);g.lineTo(cx+332,H*.955);g.stroke();g.strokeStyle='rgba(255,200,130,.55)';g.lineWidth=3;g.beginPath();g.moveTo(cx+314,H*.3);g.lineTo(cx+328,H*.955);g.stroke();
    g.fillStyle='#6a4020';g.beginPath();g.arc(cx+318,H*.29,19,0,TAU);g.fill();g.fillStyle='#e8d6a8';for(let k=0;k<8;k++){g.beginPath();g.ellipse(cx+318+Math.cos(k*.8)*10,H*.29+Math.sin(k*.8)*10,3.4,2.4,k,0,TAU);g.fill();}
    for(let k=0;k<5;k++){g.strokeStyle='#c8a24a';g.lineWidth=5;g.beginPath();g.moveTo(cx+313+k*.6,H*.42+k*64);g.lineTo(cx+333+k*.6,H*.42+k*64+4);g.stroke();}
    g.fillStyle='#e4cfa8';g.beginPath();g.ellipse(cx+328,H*.705,17,15,0,0,TAU);g.fill();
    /* neck cloth and the veiled head */
    g.fillStyle=lin(g,cx-90,0,cx+90,0,[[0,'#fff6e6'],[.6,'#dcd0b8'],[1,'#8a7a66']]);g.beginPath();g.moveTo(cx-72,H*.36);g.quadraticCurveTo(cx,H*.345,cx+72,H*.36);g.quadraticCurveTo(cx+96,H*.4,cx+60,H*.43);g.quadraticCurveTo(cx,H*.45,cx-60,H*.43);g.quadraticCurveTo(cx-96,H*.4,cx-72,H*.36);g.fill();
    g.fillStyle=lin(g,cx-80,0,cx+80,0,[[0,'#fffaf0'],[.55,'#e8decb'],[1,'#8c7c68']]);g.beginPath();g.ellipse(cx,H*.265,70,102,0,0,TAU);g.fill();
    for(let k=0;k<7;k++){g.strokeStyle='rgba(80,58,44,'+(.06+r()*.08)+')';g.lineWidth=3+r()*4;g.beginPath();g.moveTo(cx-50+k*17,H*.19);g.quadraticCurveTo(cx-56+k*18,H*.27,cx-46+k*16,H*.355);g.stroke();}
    blur(g,6,()=>{g.fillStyle='rgba(40,26,24,.55)';g.beginPath();g.ellipse(cx-26,H*.262,17,6,.04,0,TAU);g.fill();g.beginPath();g.ellipse(cx+28,H*.262,17,6,-.04,0,TAU);g.fill();g.fillStyle='rgba(60,40,34,.28)';g.beginPath();g.ellipse(cx+36,H*.28,34,86,0,0,TAU);g.fill();});
    /* the wide hat: flat brim, short crown, woven band */
    const brim=()=>{g.beginPath();g.ellipse(cx,H*.185,214,28,0,0,TAU);};
    g.save();brim();g.fillStyle=lin(g,cx-214,0,cx+214,0,[[0,'#2c2640'],[.5,'#120e1c'],[1,'#07060c']]);g.fill();g.restore();
    g.save();g.fillStyle='rgba(255,206,140,.22)';g.beginPath();g.ellipse(cx-120,H*.178,70,9,-.05,0,TAU);g.fill();g.restore();
    g.fillStyle=lin(g,cx-100,0,cx+100,0,[[0,'#272139'],[.5,'#120e1c'],[1,'#07060c']]);g.beginPath();g.moveTo(cx-98,H*.18);g.bezierCurveTo(cx-92,H*.1,cx-70,H*.07,cx-30,H*.065);g.lineTo(cx+30,H*.065);g.bezierCurveTo(cx+70,H*.07,cx+92,H*.1,cx+98,H*.18);g.closePath();g.fill();
    g.fillStyle='rgba(255,206,140,.2)';g.beginPath();g.ellipse(cx-60,H*.11,22,32,.2,0,TAU);g.fill();
    g.fillStyle='#e8b830';g.fillRect(cx-100,H*.16,200,10);g.fillStyle='#0d7a74';g.fillRect(cx-100,H*.172,200,6);for(let k=0;k<12;k++){g.fillStyle='#c03a3a';g.fillRect(cx-96+k*17,H*.1615,7,4);}
    /* contact shadow and cobbles */
    blur(g,14,()=>{g.fillStyle='rgba(10,6,4,.6)';g.beginPath();g.ellipse(cx,H*.975,310,26,0,0,TAU);g.fill();});
    finish(g,37,.5,.2);}

  /* ---------------- Makoko morning ---------------- */
  function lagoon(g){const r=rng(53);
    g.fillStyle=lin(g,0,0,0,H*.56,[[0,'#4a8aa8'],[.35,'#9ac8c8'],[.7,'#f6d9a0'],[1,'#fff0c8']]);g.fillRect(0,0,W,H);
    cloudBand(g,r,H*.18,H*.16,['#ffffff','#ffe6c0','#cfe6ee'],14,80,220,.45);streakClouds(g,r,H*.1,H*.4,['#ffffff','#fff0d0'],16);
    blur(g,26,()=>{g.fillStyle=rad(g,W*.55,H*.5,0,300,[[0,'rgba(255,250,220,1)'],[.3,'rgba(255,236,170,.6)'],[1,'rgba(255,220,150,0)']]);g.fillRect(0,0,W,H);});
    g.fillStyle='#fffbe6';g.beginPath();g.arc(W*.55,H*.5,30,0,TAU);g.fill();
    const hz=H*.56;
    /* far stilt village in mist */
    const farH=(x,y,s,al)=>{g.globalAlpha=al;g.fillStyle='#6e7a7c';g.fillRect(x,y-26*s,44*s,24*s);g.beginPath();g.moveTo(x-6*s,y-26*s);g.lineTo(x+22*s,y-46*s);g.lineTo(x+50*s,y-26*s);g.fill();g.fillRect(x+4*s,y-2*s,3*s,12*s);g.fillRect(x+36*s,y-2*s,3*s,12*s);g.globalAlpha=1;};
    for(let i=0;i<9;i++)farH(i*95+r()*30,hz+4,.55+r()*.25,.5);
    blur(g,10,()=>{g.fillStyle=lin(g,0,hz-40,0,hz+30,[[0,'rgba(255,245,220,0)'],[.6,'rgba(255,245,220,.85)'],[1,'rgba(255,245,220,0)']]);g.fillRect(0,hz-40,W,70);});
    /* water */
    g.fillStyle=lin(g,0,hz,0,H,[[0,'#d8d2a0'],[.1,'#6aa6a0'],[.45,'#2f7a82'],[1,'#0e3e50']]);g.fillRect(0,hz,W,H-hz);
    blur(g,8,()=>{g.fillStyle=lin(g,0,hz,0,H*.85,[[0,'rgba(255,248,210,.9)'],[1,'rgba(255,240,190,0)']]);g.fillRect(W*.55-50,hz,100,H*.34);});
    for(let i=0;i<340;i++){const y=hz+3+Math.pow(r(),1.3)*(H-hz-3),k=(y-hz)/(H-hz),x=r()*W,l=14+k*100*r();g.strokeStyle='rgba('+(r()<.55?'255,250,220':'20,70,80')+','+(.06+r()*.2)+')';g.lineWidth=.8+k*2.2;g.beginPath();g.moveTo(x,y);g.quadraticCurveTo(x+l/2,y-1-k*3,x+l,y);g.stroke();}
    /* foreground stilt houses: weathered planks, rusted corrugated roofs */
    const house=(x,y,s)=>{
      const pw=200*s,ph=110*s;
      g.fillStyle='#2a1a10';for(let k=0;k<6;k++){g.fillRect(x+k*(pw/5.2),y,6*s,70*s);}
      blur(g,4,()=>{g.fillStyle='rgba(8,30,40,.55)';for(let k=0;k<6;k++)g.fillRect(x+k*(pw/5.2),y+70*s,6*s,40*s);});
      g.fillStyle='#5a3a24';g.fillRect(x-10*s,y-8*s,pw+20*s,12*s);
      const wall=lin(g,x,0,x+pw,0,[[0,'#8a6a4a'],[1,'#4a3220']]);g.fillStyle=wall;g.fillRect(x,y-ph,pw,ph-6*s);
      for(let k=0;k<12;k++){g.strokeStyle='rgba(20,10,4,'+(.25+r()*.2)+')';g.lineWidth=1.2*s;g.beginPath();g.moveTo(x,y-ph+k*(ph/12));g.lineTo(x+pw,y-ph+k*(ph/12));g.stroke();g.strokeStyle='rgba(255,220,170,.07)';g.beginPath();g.moveTo(x,y-ph+k*(ph/12)+2);g.lineTo(x+pw,y-ph+k*(ph/12)+2);g.stroke();}
      for(let k=0;k<40;k++){g.fillStyle='rgba('+(r()<.5?'20,10,4':'230,190,140')+','+(.06+r()*.12)+')';g.fillRect(x+r()*pw,y-ph+r()*ph,6+r()*20,2);}
      g.fillStyle='#d6a43a';g.fillRect(x+pw*.14,y-ph*.7,pw*.2,ph*.34);g.fillStyle='#2a3a3a';g.fillRect(x+pw*.16,y-ph*.67,pw*.16,ph*.28);
      g.fillStyle='#0f6a70';g.fillRect(x+pw*.62,y-ph*.8,pw*.22,ph*.74);g.fillStyle='rgba(0,0,0,.25)';g.fillRect(x+pw*.62,y-ph*.8,pw*.03,ph*.74);
      const roof=lin(g,x,0,x+pw,0,[[0,'#8a5a3a'],[.5,'#b46a3a'],[1,'#6a3a24']]);g.fillStyle=roof;g.beginPath();g.moveTo(x-22*s,y-ph);g.lineTo(x+pw*.5,y-ph-66*s);g.lineTo(x+pw+22*s,y-ph);g.closePath();g.fill();
      for(let k=0;k<22;k++){g.strokeStyle='rgba('+(k%2?'255,200,140':'40,20,10')+',.22)';g.lineWidth=1.4*s;g.beginPath();g.moveTo(x-22*s+k*(pw+44*s)/22,y-ph);g.lineTo(x+pw*.5+(k-11)*3*s,y-ph-66*s);g.stroke();}
      g.fillStyle='rgba(255,230,180,.35)';g.beginPath();g.moveTo(x-22*s,y-ph);g.lineTo(x+pw*.5,y-ph-66*s);g.lineTo(x+pw*.5,y-ph-60*s);g.closePath();g.fill();};
    house(40,H*.76,1.15);house(470,H*.72,.95);
    /* fisher in a long canoe, casting a net */
    const cy=H*.9;
    blur(g,6,()=>{g.fillStyle='rgba(4,24,32,.55)';g.beginPath();g.ellipse(400,cy+22,230,14,0,0,TAU);g.fill();});
    g.fillStyle='#24140c';g.beginPath();g.moveTo(150,cy-6);g.quadraticCurveTo(300,cy+22,640,cy-14);g.quadraticCurveTo(600,cy+22,420,cy+30);g.quadraticCurveTo(250,cy+32,150,cy-6);g.fill();
    g.strokeStyle='rgba(255,210,150,.35)';g.lineWidth=2;g.beginPath();g.moveTo(160,cy-6);g.quadraticCurveTo(320,cy+18,634,cy-14);g.stroke();
    g.fillStyle='#120a08';g.beginPath();g.ellipse(360,cy-96,22,26,0,0,TAU);g.fill();g.beginPath();g.moveTo(325,cy-6);g.bezierCurveTo(325,cy-60,335,cy-82,360,cy-82);g.bezierCurveTo(390,cy-82,398,cy-60,396,cy-6);g.fill();
    g.fillStyle='#2a1a10';g.beginPath();g.ellipse(360,cy-112,36,10,0,0,TAU);g.fill();g.beginPath();g.moveTo(336,cy-112);g.lineTo(360,cy-134);g.lineTo(384,cy-112);g.fill();
    g.strokeStyle='#120a08';g.lineWidth=7;g.lineCap='round';g.beginPath();g.moveTo(388,cy-66);g.lineTo(520,cy-132);g.stroke();
    g.strokeStyle='rgba(30,16,10,.8)';g.lineWidth=1.2;for(let k=0;k<16;k++){g.beginPath();g.moveTo(520,cy-132);g.quadraticCurveTo(520+Math.cos(k/16*2.5+.2)*60,cy-120+k*3,455+k*17,cy-30+(k%3)*4);g.stroke();}
    for(let k=0;k<20;k++){g.fillStyle='rgba(255,248,220,.8)';g.beginPath();g.arc(470+r()*130,cy-110+r()*90,1.6,0,TAU);g.fill();}
    for(let k=0;k<4;k++){g.strokeStyle='rgba(255,250,225,'+(.5-k*.1)+')';g.lineWidth=2;g.beginPath();g.ellipse(560,cy+4,30+k*20,6+k*3,0,0,TAU);g.stroke();}
    finish(g,53,.45,.2);}

  /* ---------------- Uli: painted mud wall ---------------- */
  function uli(g){const r=rng(71);
    /* clay wall with raking light */
    g.fillStyle=lin(g,0,0,W,H,[[0,'#d9a35a'],[.5,'#c4813e'],[1,'#a2602a']]);g.fillRect(0,0,W,H);
    for(let i=0;i<260;i++){const x=r()*W,y=r()*H,rr=20+r()*110;blur(g,18,()=>{g.fillStyle='rgba('+(r()<.5?'120,70,30':'240,190,120')+','+(.05+r()*.1)+')';g.beginPath();g.ellipse(x,y,rr,rr*(.4+r()*.6),r()*3,0,TAU);g.fill();});}
    for(let i=0;i<46;i++){let x=r()*W,y=r()*H;g.strokeStyle='rgba(70,36,14,'+(.18+r()*.2)+')';g.lineWidth=.8+r()*1.6;g.beginPath();g.moveTo(x,y);for(let k=0;k<10;k++){x+=(r()-.5)*34;y+=8+r()*22;g.lineTo(x,y);}g.stroke();}
    g.fillStyle=lin(g,0,H*.9,0,H,[[0,'rgba(120,50,20,0)'],[1,'rgba(120,50,20,.7)']]);g.fillRect(0,H*.9,W,H*.1);
    /* uli painting: variable-width brush strokes in charcoal black */
    const brush=(pts,w0)=>{const n=pts.length;g.lineCap='round';g.lineJoin='round';for(let pass=0;pass<3;pass++){g.strokeStyle=pass===0?'rgba(12,8,6,.35)':'rgba(12,8,6,'+(.75+pass*.1)+')';for(let i=0;i<n-1;i++){const t=i/(n-1),wv=w0*(.35+Math.sin(t*Math.PI)*.9)*(pass===0?1.5:1-pass*.12);g.lineWidth=Math.max(1,wv);g.beginPath();g.moveTo(pts[i][0],pts[i][1]);g.lineTo(pts[i+1][0],pts[i+1][1]);g.stroke();}}};
    const curve=(x0,y0,x1,y1,x2,y2,x3,y3,n)=>{const p=[];for(let i=0;i<=n;i++){const t=i/n,u=1-t;p.push([u*u*u*x0+3*u*u*t*x1+3*u*t*t*x2+t*t*t*x3+(r()-.5)*1.2,u*u*u*y0+3*u*u*t*y1+3*u*t*t*y2+t*t*t*y3+(r()-.5)*1.2]);}return p;};
    const leaf=(x,y,a,l,wd)=>{const p=[];for(let i=0;i<=14;i++){const t=i/14;p.push([x+Math.cos(a)*l*t-Math.sin(a)*Math.sin(t*Math.PI)*wd*.0,y+Math.sin(a)*l*t]);}g.save();g.translate(x,y);g.rotate(a);g.fillStyle='rgba(14,9,7,.92)';g.beginPath();g.moveTo(0,0);g.quadraticCurveTo(l*.5,-wd,l,0);g.quadraticCurveTo(l*.5,wd,0,0);g.fill();g.strokeStyle='rgba(214,160,90,.6)';g.lineWidth=1.4;g.beginPath();g.moveTo(l*.1,0);g.lineTo(l*.8,0);g.stroke();g.restore();};
    const spiral=(cx,cy,R,turns,dir)=>{const p=[];for(let a=0;a<turns*TAU;a+=.12){const rr=R*(1-a/(turns*TAU)*.9);p.push([cx+Math.cos(dir*a)*rr,cy+Math.sin(dir*a)*rr]);}brush(p,12);};
    /* border bands */
    for(const y of [H*.06,H*.94]){brush(curve(30,y,W*.3,y-16,W*.7,y+16,W-30,y,60),12);for(let i=0;i<14;i++){g.fillStyle='rgba(12,8,6,.9)';g.beginPath();g.ellipse(46+i*55,y+(y<H/2?22:-22),9,6,0,0,TAU);g.fill();}}
    /* central flowing stem with paired leaves */
    const stem=curve(W*.5,H*.12,W*.18,H*.3,W*.82,H*.56,W*.5,H*.88,80);brush(stem,15);
    for(let i=5;i<77;i+=6){const [x,y]=stem[i],[xa,ya]=stem[i-1],[xb,yb]=stem[Math.min(80,i+1)];const tg=Math.atan2(yb-ya,xb-xa),sd=(i/6|0)%2?1:-1;leaf(x,y,tg+sd*.95,74-Math.abs(i-40)*.35,17);leaf(x,y,tg-sd*.95+(i%12<6?0:0),56-Math.abs(i-40)*.3,13);}
    /* spirals and a sun-circle */
    spiral(W*.17,H*.2,78,2.6,1);spiral(W*.83,H*.2,78,2.6,-1);spiral(W*.17,H*.8,78,2.6,-1);spiral(W*.83,H*.8,78,2.6,1);
    for(let k=0;k<4;k++){g.strokeStyle='rgba(12,8,6,'+(.9-k*.1)+')';g.lineWidth=7-k;g.beginPath();g.ellipse(W*.5,H*.5,70+k*16,70+k*16,0,0,TAU);g.stroke();}
    g.fillStyle='rgba(12,8,6,.95)';g.beginPath();g.arc(W*.5,H*.5,28,0,TAU);g.fill();
    for(let k=0;k<18;k++){const a=k/18*TAU;g.fillStyle='rgba(12,8,6,.9)';g.beginPath();g.ellipse(W*.5+Math.cos(a)*126,H*.5+Math.sin(a)*126,6,3.6,a,0,TAU);g.fill();}
    /* dry pigment flecks and a soft raking light from the left */
    for(let i=0;i<380;i++){g.fillStyle='rgba(214,150,80,'+(.08+r()*.15)+')';g.fillRect(r()*W,r()*H,1+r()*3,1+r()*2);}
    g.fillStyle=lin(g,0,0,W,0,[[0,'rgba(255,230,170,.28)'],[.4,'rgba(255,230,170,0)'],[1,'rgba(40,16,4,.4)']]);g.fillRect(0,0,W,H);
    finish(g,71,.4,.24);}

  window.OW=window.OW||{};OW.realArt={zuma,bridge,eyo,lagoon,uli,W,H};
})();
