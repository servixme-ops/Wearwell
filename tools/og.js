/* builds assets/og/*.png (1200x630 link-card images). run: NODE_PATH=$(npm root -g) node tools/og.js */
const {chromium}=require('playwright');const fs=require('fs'),path=require('path');
const logo='data:image/png;base64,'+fs.readFileSync(path.join(__dirname,'../icons/logo.png')).toString('base64');
const gal=['zuma','eyo','uli'].map(k=>'data:image/jpeg;base64,'+fs.readFileSync(path.join(__dirname,'../assets/gallery/'+k+'.jpg')).toString('base64'));
const C={
 default:{bg:'#f6efe4',ac:'#6b1a2b',pill:'OPEN ROOMS · PAINT · GIST',t:'Step into open rooms.',s:'Visit rooms, paint together in Gist & Paint, and meet people on OpenWalls.'},
 room:{bg:'#f6efe4',ac:'#6b1a2b',pill:'OPEN ROOM',t:'Come and see this room',s:'Walk in, look at the walls and say hello.'},
 private:{bg:'#ece6f3',ac:'#3b2a6b',pill:'PRIVATE ROOM',t:'A private room',s:'Open with the invite link or code from its owner.'},
 space:{bg:'#fbe9df',ac:'#c2410c',pill:'GIST & PAINT',t:'Paint and gist together',s:'Live easels, voice and friends, in one space.'},
 live:{bg:'#fde0d6',ac:'#b91c1c',pill:'● LIVE NOW · GIST & PAINT',t:'Join the painting session',s:'Pick an easel and paint along, live.'},
 gallery:{bg:'#1b1410',ac:'#e8b04a',pill:'THE OPENWALLS GALLERY',t:'Nigerian & African art, on show',s:'Walk the gallery, play the instruments, inspect the objects in 3D.',dark:1}};
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1200,height:630}});
for(const [k,c] of Object.entries(C)){
 const art=c.dark?`<div style="position:absolute;right:-30px;top:60px;display:flex;gap:18px;transform:rotate(3deg) scale(.82);transform-origin:right top">${gal.map((g,i)=>`<img src="${g}" style="width:${i==1?250:210}px;height:${i==1?330:280}px;object-fit:cover;border:10px solid #f3e7d0;margin-top:${i==1?-20:30}px;box-shadow:0 14px 30px #0008">`).join('')}</div>`:
 `<div style="position:absolute;right:70px;top:90px;width:300px;height:380px;border:14px solid ${c.ac};border-radius:6px;background:#fff8;transform:rotate(3deg)"><div style="margin:34px;height:210px;background:${c.ac}22;border-radius:4px"></div><div style="margin:0 34px;height:16px;background:${c.ac}55;border-radius:8px"></div><div style="margin:14px 34px;height:16px;width:60%;background:${c.ac}33;border-radius:8px"></div></div>`;
 await p.setContent(`<body style="margin:0;width:1200px;height:630px;background:${c.bg};position:relative;font-family:Georgia,serif;color:${c.dark?'#f3e7d0':'#1d1a2b'};overflow:hidden"><img src="${logo}" style="position:absolute;left:64px;top:56px;width:72px;height:72px;border-radius:16px"><div style="position:absolute;left:152px;top:70px;font:700 40px Georgia,serif;color:${c.ac}">OpenWalls</div>${art}<div style="position:absolute;left:64px;top:230px;width:${c.dark?"520px":"640px"}"><div style="display:inline-block;font:700 22px system-ui,sans-serif;letter-spacing:2px;color:${c.dark?'#1b1410':'#fff'};background:${c.ac};padding:10px 20px;border-radius:30px">${c.pill}</div><div style="font:700 ${c.dark?56:66}px/1.1 Georgia,serif;margin-top:26px">${c.t}</div><div style="font:400 28px/1.35 system-ui,sans-serif;margin-top:20px;opacity:.8">${c.s}</div></div></body>`);
 await (c.dark?p.screenshot({path:path.join(__dirname,'../assets/og/'+k+'.jpg'),type:'jpeg',quality:78}):p.screenshot({path:path.join(__dirname,'../assets/og/'+k+'.png')}));}
await b.close();})();
