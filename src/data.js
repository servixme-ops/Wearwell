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
const SHOPS=['Lekki Phase 1 · Admiralty Way','Victoria Island · Adeola Odeku','Ikeja City Mall · Obafemi Awolowo Way','Balogun Market · Lagos Island','Yaba · Herbert Macaulay Way','Abuja · Wuse 2'];

/* One crate, one magazine: Lukks, Issue 01 (built in issue.js) */
const CRATES=[{id:'lukks',name:'Lukks',blurb:'Issue 01 · Find your kind of style',wood:'#b9854c',label:'#ff5a1f',mags:[]}];
const LOOKS={};
const _built={};
function crateMags(ci){
  if(_built[ci])return _built[ci];
  _built[ci]=ci===0&&typeof buildIssue==='function'?[buildIssue()]:[];
  return _built[ci];
}
