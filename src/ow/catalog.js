/* ---------- OPENWALLS catalogue: room sizes, themes, furniture, wall decorations ----------
   Every model is built from a few primitives in code, so nothing heavy is downloaded and models are only created when placed. */
const OW={};
OW.SIZES={small:{w:4.2,d:4.0,h:2.7,label:'Small Room',note:'Cosy'},medium:{w:6.0,d:5.4,h:2.9,label:'Medium Room',note:'Roomy'},large:{w:8.4,d:7.2,h:3.1,label:'Large Room',note:'Spacious'}};
OW.THEMES={
  lagos:{name:'Lagos Living',wall:'#e9c9a0',floor:'#b98556',trim:'#fff3e0',ceil:'#fbf3e6',rug:['#b8322a','#f1e2c4','#14284b']},
  studio:{name:'Soft Studio',wall:'#d9d2f0',floor:'#d8c3a5',trim:'#ffffff',ceil:'#f7f4fc',rug:['#6c4bff','#fff','#ffd23f']},
  midnight:{name:'Midnight Gamer',wall:'#232a4a',floor:'#3a3f5c',trim:'#9aa4ff',ceil:'#1a1f38',rug:['#ff3d81','#1a1f38','#3ddc97']},
  sunset:{name:'Sunset',wall:'#f4a28c',floor:'#a8704f',trim:'#fff1e6',ceil:'#fde3d3',rug:['#ff5a3c','#ffd23f','#6c4bff']},
  forest:{name:'Forest',wall:'#9bc4a8',floor:'#8b6b4a',trim:'#f4efe2',ceil:'#e9f2e8',rug:['#2f6b4f','#f1e2c4','#d9a441']}
};
OW.CATS=[['bedroom','Bedroom'],['living','Living'],['gaming','Gaming'],['decor','Decoration'],['wall','Wall decoration']];
OW.INTERACT_HINT={speaker:'Visitors tap the speaker to play music together',tv:'Add a YouTube or Vimeo link, it plays for visitors',laptop:'Link to a website or project',record_player:'Link a song or album (Spotify, YouTube, SoundCloud, Apple Music) and visitors can listen',book_stack:'Book title, author and a reading link',poster:'Artist, song, player or team + link',music:'Artist or song + a music link',sports:'Player or team + a link',movie:'Movie or show + a trailer link',album:'Song or album + music link',noticeboard:'Pinned notes (one per line)',frame:'Tap shows the full photo',collage:'Add up to 6 photos to the board'};
OW.FPH={speaker:{t:'Playlist or vibe',d:'What visitors will hear',l:'SoundCloud, YouTube, Spotify or Audiomack link'},tv:{t:'What is on?',d:'About this video',l:'YouTube or Vimeo link'},laptop:{t:'Project or site name',d:'What visitors will find',l:'https://…'},record_player:{t:'Song or album',d:'Artist, why it matters to you',l:'Spotify, Apple Music, YouTube or SoundCloud link'},book_stack:{t:'Book title',d:'Author and what you thought',l:'Link to read or buy'}};
OW.FRAMES={none:'None',black:'Black',white:'White',wood:'Wood',gold:'Gold',polaroid:'Polaroid'};
OW.WALLS=['back','left','right','front'];
(function(){
const T=THREE,_m={};
const mat=(c,r,m)=>{const k=c+'|'+(r==null?.8:r)+'|'+(m||0);return _m[k]||(_m[k]=new T.MeshStandardMaterial({color:c,roughness:r==null?.8:r,metalness:m||0}));};
OW.mat=mat;
function bx(g,w,h,d,c,x,y,z,o){o=o||{};const m=new T.Mesh(new T.BoxGeometry(w,h,d),o.mat||mat(c,o.r,o.m));m.position.set(x||0,y||0,z||0);m.castShadow=o.cast!==false;m.receiveShadow=true;g.add(m);return m;}
function cy(g,rt,rb,h,c,x,y,z,o){o=o||{};const m=new T.Mesh(new T.CylinderGeometry(rt,rb,h,o.seg||18),o.mat||mat(c,o.r,o.m));m.position.set(x||0,y||0,z||0);m.castShadow=true;m.receiveShadow=true;g.add(m);return m;}
function sp(g,r,c,x,y,z,sx,sy,sz){const m=new T.Mesh(new T.SphereGeometry(r,14,10),mat(c,.85));m.position.set(x,y,z);m.scale.set(sx||1,sy||1,sz||1);m.castShadow=true;g.add(m);return m;}
function canvas(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return c;}
function tex(c,rep){const t=new T.CanvasTexture(c);t.encoding=T.sRGBEncoding;t.anisotropy=4;if(rep){t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(rep[0],rep[1]);}return t;}
OW.canvas=canvas;OW.tex=tex;
function glow(c){return new T.MeshStandardMaterial({color:c,emissive:c,emissiveIntensity:1.1,roughness:.5});}
function screenTex(a,b){const c=canvas(64,40),g=c.getContext('2d'),gr=g.createLinearGradient(0,0,64,40);gr.addColorStop(0,a);gr.addColorStop(1,b);g.fillStyle=gr;g.fillRect(0,0,64,40);return tex(c);}
function rugTex(cols,round){const c=canvas(256,256),g=c.getContext('2d');g.fillStyle=cols[0];g.fillRect(0,0,256,256);g.strokeStyle=cols[1];g.lineWidth=6;g.strokeRect(14,14,228,228);g.fillStyle=cols[2];
  for(let i=0;i<4;i++)for(let j=0;j<4;j++){const x=32+i*64,y=32+j*64;g.beginPath();g.moveTo(x,y-26);g.lineTo(x+26,y);g.lineTo(x,y+26);g.lineTo(x-26,y);g.closePath();g.globalAlpha=(i+j)%2?1:.55;g.fill();g.fillStyle=cols[1];g.globalAlpha=1;g.fillRect(x-4,y-4,8,8);g.fillStyle=cols[2];}
  return tex(c);}
/* ---------- furniture builders: origin = floor centre, front faces +z ---------- */
const B={
bed(w,len){return(g,col)=>{col=col||'#6c4bff';bx(g,w,.25,len,'#8a6a4a',0,.125,0);bx(g,w-.06,.2,len-.1,'#f4f1ea',0,.35,.02);bx(g,w,.75,.08,'#6e4f35',0,.5,-len/2+.04);bx(g,w-.04,.05,len*.55,col,0,.47,len*.2);bx(g,w*.38,.12,.28,'#fff',-w*.22,.5,-len/2+.3);if(w>1.2)bx(g,w*.38,.12,.28,'#fff',w*.22,.5,-len/2+.3);};},
bedside(g,col){bx(g,.45,.5,.4,col||'#c9a27a',0,.25,0);bx(g,.4,.02,.01,'#6e4f35',0,.34,.201);bx(g,.4,.02,.01,'#6e4f35',0,.16,.201);bx(g,.06,.03,.02,'#222',0,.4,.21);bx(g,.06,.03,.02,'#222',0,.22,.21);},
wardrobe(g,col){bx(g,1.2,2,.55,col||'#d8c3a5',0,1,0);bx(g,.012,1.9,.01,'#5a4632',0,1,.276);bx(g,.03,.25,.03,'#333',-.06,1,.3);bx(g,.03,.25,.03,'#333',.06,1,.3);bx(g,1.24,.04,.58,'#b79f80',0,2.01,0);},
dresser(g,col){bx(g,1.1,.8,.5,col||'#e8d5b9',0,.4,0);for(let i=0;i<3;i++){bx(g,1,.02,.01,'#8a6a4a',0,.2+i*.22,.251);bx(g,.1,.03,.02,'#333',0,.28+i*.22,.26);}bx(g,.8,.7,.04,'#b9d8e8',0,1.2,-.2,{r:.1,m:.6});bx(g,.86,.76,.03,'#8a6a4a',0,1.2,-.225);},
sofa(w){return(g,col)=>{col=col||'#c4532d';bx(g,w,.4,.9,col,0,.3,0);bx(g,w,.5,.25,col,0,.65,-.33);for(const s of[-1,1])bx(g,.22,.55,.9,col,s*(w/2-.11),.5,0);const n=w>1.5?3:2,cw=(w-.5)/n;for(let i=0;i<n;i++)bx(g,cw-.04,.15,.6,col,-((n-1)/2-i)*-cw*-1+0,.58,.08,{r:.95});bx(g,.35,.3,.12,'#f1e2c4',-w/2+.45,.75,-.1);bx(g,w-.1,.1,.8,'#3a2a22',0,.07,0);};},
coffee_table(g,col){col=col||'#8a6a4a';bx(g,1.1,.06,.6,col,0,.4,0);for(const x of[-.5,.5])for(const z of[-.25,.25])bx(g,.05,.38,.05,'#3a2a22',x,.19,z);bx(g,.9,.03,.4,'#6e4f35',0,.15,0);},
tv_stand(g,col){bx(g,1.5,.5,.45,col||'#3a2a22',0,.25,0);bx(g,.4,.3,.01,'#1b1410',-.4,.25,.226);bx(g,.4,.3,.01,'#1b1410',.4,.25,.226);bx(g,.4,.3,.01,'#1b1410',0,.25,.226);},
bookshelf(g,col){col=col||'#8a6a4a';bx(g,.05,1.9,.35,col,-.42,.95,0);bx(g,.05,1.9,.35,col,.42,.95,0);bx(g,.9,.03,.34,col,0,1.9,0);bx(g,.84,1.9,.02,'#6e4f35',0,.95,-.16);const cs=['#b8322a','#14284b','#d9a441','#2f6b4f','#6c4bff','#f1e2c4'];for(let r=0;r<5;r++){const y=.02+r*.4;bx(g,.84,.03,.34,col,0,y,0);let x=-.38;for(let i=0;i<9&&x<.36;i++){const w=.04+((i*7+r*3)%4)*.012,hh=.22+((i*5+r)%4)*.04;bx(g,w,hh,.22,cs[(i+r*2)%6],x+w/2,y+.015+hh/2,0);x+=w+.012;}}},
gaming_desk(g,col){bx(g,1.5,.05,.7,col||'#1c1f2e',0,.75,0);for(const x of[-.7,.7])bx(g,.05,.73,.6,'#2a2f45',x,.365,0);bx(g,1.4,.015,.015,'#b04cff',0,.7,.33,{mat:glow('#b04cff')});bx(g,1.2,.3,.02,'#2a2f45',0,.5,-.3);},
gaming_chair(g,col){col=col||'#e0245e';cy(g,.03,.03,.4,'#222',0,.25,0);for(let i=0;i<5;i++){const a=i*1.2566;bx(g,.3,.03,.04,'#222',Math.cos(a)*.15,.04,Math.sin(a)*.15).rotation.y=-a;}bx(g,.5,.1,.5,'#1b1b24',0,.5,0);bx(g,.5,.8,.12,col,0,.95,-.24).rotation.x=-.12;bx(g,.3,.2,.14,'#1b1b24',0,1.2,-.26);bx(g,.06,.04,.34,'#222',.28,.68,0);bx(g,.06,.04,.34,'#222',-.28,.68,0);},
monitor(g,col){bx(g,.6,.36,.03,'#111',0,.28,0);const s=new T.Mesh(new T.PlaneGeometry(.56,.32),new T.MeshBasicMaterial({map:screenTex('#3d2bff','#ff3d81')}));s.position.set(0,.28,.017);g.add(s);bx(g,.05,.1,.05,'#222',0,.07,-.02);bx(g,.22,.02,.14,'#222',0,.01,0);},
console(g,col){bx(g,.34,.06,.25,col||'#f4f4f4',0,.03,0);bx(g,.02,.04,.01,'#2d7bff',.1,.03,.126,{mat:glow('#2d7bff')});},
gaming_acc(g){bx(g,.44,.02,.14,'#222',-.05,.01,0);bx(g,.05,.025,.08,'#333',.25,.012,0);bx(g,.4,.004,.1,'#b04cff',-.05,.022,0,{mat:glow('#b04cff')});},
plant(g,col){cy(g,.16,.12,.26,col||'#c4532d',0,.13,0);const gc=['#2f8a4f','#3aa05c','#277a43'];for(let i=0;i<7;i++){const a=i*.9;sp(g,.17,gc[i%3],Math.cos(a)*.14,.42+i*.09,Math.sin(a)*.14,1,1.5,.7).rotation.y=a;}},
rug(g,col,th){const m=new T.Mesh(new T.BoxGeometry(2.2,.02,1.5),new T.MeshStandardMaterial({map:rugTex(th.rug),roughness:1}));m.position.y=.01;m.receiveShadow=true;g.add(m);},
rug_round(g,col,th){const m=new T.Mesh(new T.CylinderGeometry(.9,.9,.02,40),new T.MeshStandardMaterial({map:rugTex(th.rug),roughness:1}));m.position.y=.01;m.receiveShadow=true;g.add(m);},
floor_lamp(g,col){cy(g,.14,.16,.03,'#222',0,.015,0);cy(g,.012,.012,1.45,'#bbb',0,.75,0);cy(g,.12,.2,.3,'#f6e7c8',0,1.55,0,{mat:new T.MeshStandardMaterial({color:'#ffe9b8',emissive:'#ffcf7a',emissiveIntensity:.7})});},
table_lamp(g){cy(g,.08,.1,.03,'#333',0,.015,0);cy(g,.012,.012,.25,'#bbb',0,.15,0);cy(g,.07,.11,.17,'#f6e7c8',0,.33,0,{mat:new T.MeshStandardMaterial({color:'#ffe9b8',emissive:'#ffcf7a',emissiveIntensity:.8})});},
mirror_floor(g,col){bx(g,.6,1.7,.05,col||'#c9a27a',0,.85+.05,0);bx(g,.5,1.6,.01,'#bfe0ee',0,.9,.03,{r:.05,m:.7});bx(g,.04,.3,.2,'#8a6a4a',-.18,.15,-.1);bx(g,.04,.3,.2,'#8a6a4a',.18,.15,-.1);},
floor_vase(g,col){cy(g,.1,.16,.55,col||'#d9a441',0,.275,0);cy(g,.06,.1,.2,col||'#d9a441',0,.65,0);for(let i=0;i<5;i++){bx(g,.01,.7,.01,'#6a8f4a',(i-2)*.03,1.0,0).rotation.z=(i-2)*.16;sp(g,.035,'#ff5a3c',(i-2)*.12,1.34,0);}},
pouf(g,col){cy(g,.28,.3,.38,col||'#ffd23f',0,.19,0,{seg:24});},
tv(g){bx(g,1.1,.62,.05,'#111',0,.4,0);const s=new T.Mesh(new T.PlaneGeometry(1.04,.56),new T.MeshBasicMaterial({map:screenTex('#16213e','#0f3460')}));s.position.set(0,.4,.027);g.add(s);bx(g,.1,.08,.06,'#222',0,.07,-.01);bx(g,.4,.02,.2,'#222',0,.01,0);},
laptop(g,col){bx(g,.34,.015,.23,col||'#cfd3da',0,.008,0,{m:.5});const s=bx(g,.34,.22,.01,col||'#cfd3da',0,.12,-.115,{m:.5});s.rotation.x=-.2;const d=new T.Mesh(new T.PlaneGeometry(.31,.19),new T.MeshBasicMaterial({map:screenTex('#2d7bff','#3ddc97')}));d.position.set(0,.12,-.108);d.rotation.x=-.2;g.add(d);},
record_player(g,col){bx(g,.45,.08,.35,col||'#6e4f35',0,.04,0);cy(g,.15,.15,.02,'#111',-.04,.09,0,{seg:28});cy(g,.05,.05,.025,'#d9a441',-.04,.092,0);bx(g,.02,.02,.2,'#ccc',.17,.1,0);},
speaker(g,col){const c=col||'#23252d';bx(g,.34,.8,.3,c,0,.4,0,{r:.06});cy(g,.11,.11,.03,'#0d0d10',0,.28,.155,{seg:28}).rotation.x=Math.PI/2;cy(g,.045,.045,.035,'#3a3f4b',0,.28,.16,{seg:20}).rotation.x=Math.PI/2;cy(g,.06,.06,.03,'#0d0d10',0,.6,.155,{seg:24}).rotation.x=Math.PI/2;cy(g,.022,.022,.035,'#6c4bff',0,.6,.16,{seg:16}).rotation.x=Math.PI/2;bx(g,.2,.012,.012,'#6c4bff',0,.76,.151);},
book_stack(g,col){const cs=[col||'#b8322a','#14284b','#d9a441'];cs.forEach((c,i)=>bx(g,.24-i*.02,.04,.17,c,0,.02+i*.04,0).rotation.y=i*.2);}
};
/* id,cat,name,footprint w(x) d(z) h, top (surface height), surface (sits on other furniture), floor (flat, walk over it), color */
const F=(id,cat,name,w,d,h,fn,o)=>Object.assign({id,cat,name,w,d,h,fn},o||{});
OW.FURN=[
F('bed_single','bedroom','Single bed',1.0,2.0,.8,B.bed(1.0,2.0),{top:.5,col:'#6c4bff'}),
F('bed_double','bedroom','Double bed',1.6,2.0,.8,B.bed(1.6,2.0),{top:.5,col:'#ff5a3c'}),
F('bedside','bedroom','Bedside table',.45,.4,.5,B.bedside,{top:.5}),
F('wardrobe','bedroom','Wardrobe',1.2,.55,2.0,B.wardrobe),
F('dresser','bedroom','Dressing table',1.1,.5,1.5,B.dresser,{top:.8}),
F('sofa','living','Sofa',2.0,.9,.9,B.sofa(2.0),{col:'#c4532d'}),
F('armchair','living','Armchair',.9,.9,.9,B.sofa(.9),{col:'#2f6b4f'}),
F('coffee_table','living','Coffee table',1.1,.6,.4,B.coffee_table,{top:.43}),
F('tv_stand','living','TV stand',1.5,.45,.5,B.tv_stand,{top:.5}),
F('bookshelf','living','Bookshelf',.9,.35,1.9,B.bookshelf),
F('gaming_desk','gaming','Gaming desk',1.5,.7,.8,B.gaming_desk,{top:.78}),
F('gaming_chair','gaming','Gaming chair',.6,.6,1.3,B.gaming_chair),
F('monitor','gaming','Computer monitor',.6,.2,.46,B.monitor,{surface:true,link:true}),
F('console','gaming','Console',.34,.26,.1,B.console,{surface:true}),
F('gaming_acc','gaming','Keyboard & mouse',.5,.16,.04,B.gaming_acc,{surface:true}),
F('tv','living','Television',1.1,.2,.7,B.tv,{surface:true,link:true,hint:'tv'}),
F('laptop','gaming','Laptop',.34,.25,.22,B.laptop,{surface:true,link:true,hint:'laptop'}),
F('speaker','living','Speaker',.34,.3,.8,B.speaker,{link:true,hint:'speaker'}),
F('record_player','living','Record player',.45,.35,.12,B.record_player,{surface:true,link:true,hint:'record_player'}),
F('book_stack','living','Books',.24,.17,.13,B.book_stack,{surface:true,link:true,hint:'book_stack'}),
F('plant','decor','Indoor plant',.4,.4,1.1,B.plant,{col:'#c4532d'}),
F('rug','decor','Rug',2.2,1.5,.02,B.rug,{floor:true}),
F('rug_round','decor','Round rug',1.8,1.8,.02,B.rug_round,{floor:true}),
F('floor_lamp','decor','Floor lamp',.35,.35,1.7,B.floor_lamp),
F('table_lamp','decor','Table lamp',.22,.22,.45,B.table_lamp,{surface:true}),
F('mirror_floor','decor','Standing mirror',.6,.3,1.8,B.mirror_floor),
F('floor_vase','decor','Floor vase',.35,.35,1.4,B.floor_vase,{col:'#d9a441'}),
F('pouf','decor','Pouf',.6,.6,.38,B.pouf,{top:.38,col:'#ffd23f'})
];
OW.furn=id=>OW.FURN.find(f=>f.id===id);
/* ---------- wall decorations. w/h are metres on the wall; img = takes a picture ---------- */
const D=(id,cat,name,w,h,o)=>Object.assign({id,cat,name,w,h,deco:true},o||{});
OW.DECOR=[
D('frame','wall','Picture frame',.6,.8,{img:1,frame:'wood'}),
D('poster','wall','Poster',.6,.9,{img:1,frame:'none',hint:'poster'}),
D('music_poster','wall','Music poster',.6,.9,{img:1,frame:'none',hint:'music',ph:{t:'Artist or song',d:'Why you love it',l:'Spotify, Apple Music, YouTube or SoundCloud link'}}),
D('sports_poster','wall','Football / sports poster',.6,.9,{img:1,frame:'none',hint:'sports',ph:{t:'Player or team',d:'Club, position, favourite moment…',l:'Link to their page or highlights'}}),
D('movie_poster','wall','Movie / TV poster',.6,.9,{img:1,frame:'none',hint:'movie',ph:{t:'Movie or show',d:'What it is about, why you love it',l:'Trailer or streaming link'}}),
D('photo_frame','wall','Photo frame',.28,.34,{img:1,frame:'white'}),
D('artwork','wall','Artwork',.9,.7,{img:1,frame:'black'}),
D('album','wall','Album cover',.4,.4,{img:1,frame:'black',hint:'album'}),
D('wall_shelf','wall','Wall shelf',.9,.22),
D('wall_light','wall','Wall light',.2,.28),
D('noticeboard','wall','Noticeboard',.9,.6,{hint:'noticeboard'}),
D('collage','wall','Collage board',1.2,.9),
D('curtains','decor','Curtains',1.5,2.2),
D('window','decor','Window',1.2,1.3),
D('door','decor','Door',.95,2.05),
D('wall_clock','decor','Wall clock',.42,.42),
D('neon','decor','Neon sign',.9,.3,{text:1})
];
OW.decor=id=>OW.DECOR.find(f=>f.id===id);
OW.def=id=>OW.furn(id)||OW.decor(id);
OW.buildFurn=(def,col,theme)=>{const g=new T.Group();def.fn(g,col||def.col,theme||OW.THEMES.lagos);return g;};
/* ---------- wall decorations ---------- */
const frameCol={black:'#161616',white:'#f6f3ee',wood:'#8a5a34',gold:'#d4a82e'};
function clockTex(){const c=canvas(128,128),g=c.getContext('2d');g.fillStyle='#fffaf0';g.beginPath();g.arc(64,64,62,0,7);g.fill();g.fillStyle='#222';for(let i=0;i<12;i++){const a=i*Math.PI/6;g.fillRect(64+Math.sin(a)*50-2,64-Math.cos(a)*50-2,4,4);}g.strokeStyle='#222';g.lineWidth=4;g.beginPath();g.moveTo(64,64);g.lineTo(64,32);g.moveTo(64,64);g.lineTo(88,72);g.stroke();return tex(c);}
function neonTex(text,col){const c=canvas(512,170),g=c.getContext('2d');g.font='700 84px "Bricolage Grotesque",Arial,sans-serif';g.textAlign='center';g.textBaseline='middle';g.shadowColor=col;g.shadowBlur=26;g.fillStyle=col;const t=(text||'OPEN WALLS').slice(0,16);g.fillText(t,256,88,480);g.shadowBlur=6;g.fillStyle='#fff';g.fillText(t,256,88,480);return tex(c);}
function curtainTex(col){const c=canvas(128,256),g=c.getContext('2d');g.fillStyle=col;g.fillRect(0,0,128,256);for(let i=0;i<10;i++){g.fillStyle=i%2?'rgba(0,0,0,.16)':'rgba(255,255,255,.12)';g.fillRect(i*13,0,13,256);}return tex(c);}
function boardTex(kind,notes){const c=canvas(256,170),g=c.getContext('2d');g.fillStyle=kind==='cork'?'#c89a62':'#f4f1ea';g.fillRect(0,0,256,170);if(kind==='cork'){for(let i=0;i<500;i++){g.fillStyle=`rgba(${90+Math.random()*60|0},${55+Math.random()*30|0},20,.25)`;g.fillRect(Math.random()*256,Math.random()*170,2,2);}}
  const cols=['#fff59d','#ffab91','#b3e5fc','#c5e1a5'];(notes||[]).slice(0,6).forEach((n,i)=>{const x=10+(i%3)*80,y=10+Math.floor(i/3)*78;g.save();g.translate(x+34,y+34);g.rotate(((i*37)%9-4)*.02);g.fillStyle=cols[i%4];g.shadowColor='rgba(0,0,0,.3)';g.shadowBlur=5;g.fillRect(-34,-34,68,68);g.shadowBlur=0;g.fillStyle='#333';g.font='11px Arial';wrapText(g,n,-30,-20,60,12);g.restore();g.fillStyle='#d33';g.beginPath();g.arc(x+34,y+4,3,0,7);g.fill();});return tex(c);}
function wrapText(g,t,x,y,mw,lh){let line='',yy=y;String(t).split(' ').forEach(w=>{const test=line+w+' ';if(g.measureText(test).width>mw&&line){g.fillText(line,x,yy);line=w+' ';yy+=lh;}else line=test;});g.fillText(line,x,yy);}
function placeholderTex(){const c=canvas(128,160),g=c.getContext('2d'),gr=g.createLinearGradient(0,0,128,160);gr.addColorStop(0,'#ffe7d6');gr.addColorStop(1,'#d9ccff');g.fillStyle=gr;g.fillRect(0,0,128,160);g.fillStyle='rgba(60,40,90,.55)';g.beginPath();g.arc(64,66,22,0,7);g.fill();g.fillRect(40,98,48,8);g.fillRect(48,112,32,6);return tex(c);}
OW.placeholder=placeholderTex;
/* returns {group (face = +z), pic (mesh to put the picture on), w, h} in wall metres, already scaled */
OW.buildDecor=(item,def,theme)=>{
  const s=item.scale||1,w=(item.width||def.w)*s,h=(item.height||def.h)*s,g=new T.Group();let pic=null,tiles=null;const id=def.id;
  const fr=item.frame||def.frame||'none';
  if(def.img){
    const bd=fr==='none'?0:fr==='polaroid'?.03:.035,dep=.03;
    if(fr==='polaroid'){bx(g,w+.06,h+.06+.08,dep,'#fbfaf6',0,-.04,dep/2);}
    else if(bd){const c=frameCol[fr]||frameCol.wood;bx(g,w+bd*2,bd,dep,c,0,h/2+bd/2,dep/2,{r:.5,m:fr==='gold'?.6:0});bx(g,w+bd*2,bd,dep,c,0,-h/2-bd/2,dep/2);bx(g,bd,h,dep,c,-w/2-bd/2,0,dep/2);bx(g,bd,h,dep,c,w/2+bd/2,0,dep/2);}
    bx(g,w,h,.008,'#fff',0,0,.004,{cast:false});
    pic=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({color:'#ffffff'}));pic.position.z=.0095;g.add(pic);
  }else if(id==='wall_shelf'){bx(g,w,.035,.2*s,'#8a5a34',0,-.1*s+.0,.1*s);bx(g,.03,.1,.16,'#6e4f35',-w/2+.08,-.07*s,.08);bx(g,.03,.1,.16,'#6e4f35',w/2-.08,-.07*s,.08);
    ['#b8322a','#14284b','#d9a441'].forEach((c,i)=>bx(g,.035,.16*s,.12,c,-w/2+.18+i*.04,.0+.075*s+.0,.1*s));sp(g,.05*s,'#2f8a4f',w/2-.2,.07*s,.1*s,1,1,1);cy(g,.04*s,.03*s,.07*s,'#c4532d',w/2-.2,.035*s-.0,.1*s);}
  else if(id==='wall_light'){cy(g,.07*s,.07*s,.02,'#222',0,0,.01).rotation.x=Math.PI/2;bx(g,.04*s,.04*s,.1*s,'#444',0,0,.06*s);const sh=cy(g,.04*s,.1*s,.14*s,'#f6e7c8',0,.0,.13*s,{mat:new T.MeshStandardMaterial({color:'#ffe9b8',emissive:'#ffcf7a',emissiveIntensity:.9})});sh.rotation.x=Math.PI/2;}
  else if(id==='collage'){bx(g,w+.06,h+.06,.03,'#6e4f35',0,0,.015);const bg=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({map:boardTex('paper',[])}));bg.position.z=.032;g.add(bg);tiles=[];const imgs=((item.props&&item.props.images)||[]).slice(0,6),cols=imgs.length>4?3:2,rows=Math.ceil(imgs.length/cols)||1,cw=w/cols,ch=h/rows;
    imgs.forEach((path,i)=>{const cx=-w/2+cw*(i%cols)+cw/2,cy=h/2-ch*Math.floor(i/cols)-ch/2,tw=cw*.82,th=ch*.82;const gt=new T.Group();gt.position.set(cx,cy,.04+i*.002);gt.rotation.z=(((i*53)%9)-4)*.025;bx(gt,tw+.025,th+.025,.006,'#fff',0,0,0,{cast:false});const m=new T.Mesh(new T.PlaneGeometry(tw,th),new T.MeshBasicMaterial({color:'#ffffff'}));m.position.z=.0045;m.userData.path=path;gt.add(m);g.add(gt);tiles.push(m);});}
  else if(id==='noticeboard'){const kind='cork';bx(g,w+.06,h+.06,.03,'#6e4f35',0,0,.015);pic=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({map:boardTex(kind,id==='noticeboard'?(item.description||'').split('\n').filter(Boolean):[])}));pic.position.z=.032;g.add(pic);pic.userData.keep=1;}
  else if(id==='wall_clock'){bx(g,.01,.01,.01,'#000',0,0,0);const rim=cy(g,w/2+.015,w/2+.015,.04,'#222',0,0,.02);rim.rotation.x=Math.PI/2;const f=new T.Mesh(new T.CircleGeometry(w/2,32),new T.MeshBasicMaterial({map:clockTex()}));f.position.z=.042;g.add(f);}
  else if(id==='neon'){const p=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({map:neonTex(item.title,item.color||'#ff3d81'),transparent:true,depthWrite:false}));p.position.z=.02;g.add(p);bx(g,w*.9,h*.8,.01,'#101018',0,0,.004,{cast:false}).material=new T.MeshBasicMaterial({color:'#12121c',transparent:true,opacity:.55});}
  else if(id==='window'){const fc=item.color||'#fffaf0',c=OW.mat(fc,.5);bx(g,w+.12,.06,.07,fc,0,h/2+.03,.035);bx(g,w+.12,.06,.07,fc,0,-h/2-.03,.035);bx(g,.06,h,.07,fc,-w/2-.03,0,.035);bx(g,.06,h,.07,fc,w/2+.03,0,.035);
    const sc=canvas(8,128),sx=sc.getContext('2d'),gr=sx.createLinearGradient(0,0,0,128);gr.addColorStop(0,'#6fbaff');gr.addColorStop(1,'#fff1c9');sx.fillStyle=gr;sx.fillRect(0,0,8,128);
    const p=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({map:tex(sc)}));p.position.z=.008;g.add(p);bx(g,.03,h,.04,fc,0,0,.03);bx(g,w,.03,.04,fc,0,0,.03);bx(g,w+.2,.04,.14,fc,0,-h/2-.07,.07);}
  else if(id==='door'){const dm=item.color||'#8a5a34';bx(g,w+.1,.06,.06,'#f6efe4',0,h/2+.03,.03);bx(g,.06,h,.06,'#f6efe4',-w/2-.03,0,.03);bx(g,.06,h,.06,'#f6efe4',w/2+.03,0,.03);bx(g,w,h,.05,dm,0,0,.025);
    for(const y of[h*.2,-h*.22])bx(g,w*.68,h*.34,.012,'#7a4a28',0,y,.055);
    const hd=new T.Mesh(new T.SphereGeometry(.035,10,8),OW.mat('#d4a82e',.3,.8));hd.position.set(w*.38,-.05,.07);g.add(hd);}
  else if(id==='curtains'){const t=curtainTex(item.color||'#c4532d');for(const sx of[-1,1]){const m=new T.Mesh(new T.PlaneGeometry(w/2-.02,h),new T.MeshStandardMaterial({map:t,roughness:1,side:T.DoubleSide}));m.position.set(sx*(w/4),0,.05);m.castShadow=true;g.add(m);}cy(g,.015,.015,w+.1,'#8a6a4a',0,h/2+.03,.07).rotation.z=Math.PI/2;}
  return{group:g,pic,tiles,w,h};
};
})();
