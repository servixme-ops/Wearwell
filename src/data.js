/* ---------- DATA: crates, magazines, looks ---------- */
function rng(seed){let a=seed>>>0;return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}

const SKIN=['#5a3a28','#7a4e34','#8d5b3c','#6b4330','#a06a46','#4a2e22'];
const FAB={
  ankara:{label:'Ankara wax print',cols:[['#1d3a8a','#f2b705','#f4e9d6'],['#c8372d','#f6e7cb','#1b1b1b'],['#2a6f5c','#f4a261','#fbeedd'],['#7a1f2b','#f2b705','#f6e7cb']]},
  adire:{label:'Adire indigo',cols:[['#14284b','#9fb8d8','#e9eef5'],['#1b2f5a','#c7d5ea','#f5f7fa']]},
  asooke:{label:'Aso-oke',cols:[['#8a2a3a','#e9c46a','#f6e7cb'],['#2b5d4f','#f2c14e','#f6e7cb'],['#5a2d82','#f4b942','#f6e7cb']]},
  lace:{label:'Swiss lace',cols:[['#e8cfa8','#fff6e4','#c8553d'],['#c8553d','#ffe3d0','#fff6e4'],['#2f6f6a','#d6efe9','#fff6e4']]},
  akwete:{label:'Akwete weave',cols:[['#c9873a','#2a1a12','#f6e7cb'],['#a63a2c','#f2c14e','#2a1a12']]}
};
const FABKEYS=Object.keys(FAB);
const DESIGNERS=['Atelier Ife','Kemi Adeyemi Studio','Zuri House','Studio Oma','Bisi & Co.','Nneka Atelier','Tolu Couture','Sade Loom','Amara Thread','Ayo Cuts'];
const LOOKNAMES=['Sunday Gown','Palm Wine Wrapper','Iro & Buba Set','Lagos Midi','Harmattan Agbada','Bridal Peplum','Coral Dress','Eko Jumpsuit','Terra Kaftan','Indigo Two-Piece','Owambe Mermaid','Market Day Wrap','Island Linen Set','Gele Statement','Naming Day Gown','Yaba Shift','Lekki Evening','Abeokuta Wrap'];
const SHAPES=['gown','agbada','iro','jumpsuit','midi','kaftan'];
const DETAILS=['with a nipped waist and a sweeping hem','tailored by hand in Lagos','finished with a matching head wrap','cut loose for hot afternoons','with structured shoulders and a clean line','made to move on the dance floor','with hand-stitched trims at the neckline','in a relaxed, easy silhouette'];
const COVERBG=[['#1d3a8a','#f4e9d6','#f2b705'],['#c8372d','#fff3e0','#1b1b1b'],['#e9c46a','#2a1a12','#7a1f2b'],['#2a6f5c','#fbeedd','#f4a261'],['#f1e4d1','#4a1424','#c8553d'],['#0f2a43','#f6e7cb','#e76f51'],['#7a1f2b','#f6e7cb','#f2b705'],['#e76f51','#1d1d1d','#f7ede2'],['#3d2c5e','#f6e7cb','#f4b942']];
const HEADLINES=["LET'S DO IT","WEAR IT LOUD","MADE IN LAGOS","STEP OUT","FULL COLOUR","THE EDIT"];
const SHOPS=['Lekki Phase 1 · Admiralty Way','Victoria Island · Adeola Odeku','Ikeja City Mall · Obafemi Awolowo Way','Balogun Market · Lagos Island','Yaba · Herbert Macaulay Way','Abuja · Wuse 2'];

const CRATES=[
  {id:'styles',name:'Fashion Styles',blurb:'Find your kind of style',wood:'#b9854c',label:'#d4351f',
    mags:[['Creative Models','Full looks, modelled your way',0,'block'],['Baddies','Confidence, dressed up',1,'frame'],['Aesthetic Girlyss','Soft, pretty, put together',4,'split'],['Drip Gang','Street heat and fresh kicks',5,'block'],['Nature Aesthetic','Earth tones and easy layers',3,'frame'],['Monochrome','Black, white and everything between',7,'split'],['Soft Statements','Quiet looks that say a lot',2,'frame']]},
  {id:'occasions',name:'Occasions',blurb:'Dressed for the moment',wood:'#a8723f',label:'#2f5d4e',
    mags:[['Beach Fun','Sun, sand and light fabrics',3,'frame'],['Matrimonio','Wedding season, all of it',4,'block'],['Dream Wedding','Gowns, lace and aso ebi',1,'frame'],['The Wedding Guest','What to wear when invited',2,'split'],['School Outfits','Smart, simple, campus ready',5,'block'],['Cozy Style','Soft layers for slow days',6,'frame'],['Everyday Style','Looks for the daily run',0,'split']]},
  {id:'night',name:'After Dark',blurb:'Evenings, events and glam',wood:'#8f5e34',label:'#14284b',
    mags:[['After Dark','Night out, dressed to land',5,'split'],['Date Night','Dinner looks with a spark',1,'frame'],['Owambe Glam','Celebration season, glowing',2,'block'],['Club Fits','Dance floor ready',7,'frame'],['Midnight Soft','Evening, but gentle',4,'split'],['Gala Lights','Black tie, Lagos style',6,'block'],['Lounge Hour','Low light, high style',0,'frame']]}
];

const LOOKS={};
const _built={};
function crateMags(ci){
  if(_built[ci])return _built[ci];
  const c=CRATES[ci];
  const mags=c.mags.map((m,mi)=>{
    const r=rng(ci*131+mi*17+7);
    const th=COVERBG[m[2]%COVERBG.length];
    const fab=FABKEYS[(ci*3+mi*2)%FABKEYS.length];
    const mag={ci,mi,title:m[0],tagline:m[1],variant:m[3],bg:th[0],ink:th[1],acc:th[2],fab,issue:String(mi+1+ci*7).padStart(2,'0'),
      headline:HEADLINES[(mi+ci)%HEADLINES.length],count:[21,27,18,24,30,16,25][mi%7],looks:[]};
    const collName=m[0]+' collection';
    for(let li=0;li<6;li++){
      const fk=li%2===0?fab:FABKEYS[Math.floor(r()*FABKEYS.length)];
      const cols=FAB[fk].cols[Math.floor(r()*FAB[fk].cols.length)];
      const shape=li===0?(mi%2?'gown':'iro'):SHAPES[Math.floor(r()*SHAPES.length)];
      const look={id:`${ci}-${mi}-${li}`,ci,mi,li,name:LOOKNAMES[Math.floor(r()*LOOKNAMES.length)],
        designer:DESIGNERS[Math.floor(r()*DESIGNERS.length)],coll:collName,fab:fk,shape,cols,
        skin:SKIN[Math.floor(r()*SKIN.length)],gele:(shape==='gown'||shape==='iro')&&r()<.7,
        bg:li%3===0?th[2]:(li%3===1?th[1]:th[0]),
        price:'₦'+(Math.round((40000+r()*340000)/5000)*5000).toLocaleString('en-NG'),
        desc:`${FAB[fk].label}, ${DETAILS[Math.floor(r()*DETAILS.length)]}.`};
      mag.looks.push(look);LOOKS[look.id]=look;
    }
    return mag;
  });
  _built[ci]=mags;return mags;
}
