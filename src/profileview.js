/* ---------- Public Photo Dump Profile view: shared by the Profile app preview and the public page ---------- */
const PROFILE_THEMES={brand:'Photo Dump',lilac:'Lilac',maroon:'Maroon',ochre:'Ochre',indigo:'Indigo',forest:'Forest',noir:'Noir'};
function profileUrl(username,lukkId){return lukkId?CFG.mainSite+'profile.html?u='+username+'&l='+lukkId:CFG.mainSite+'u/'+username;}
function renderPublicProfile(d,opts){
  opts=opts||{};
  const p=d.profile,theme=PROFILE_THEMES[p.theme]?p.theme:'brand';
  const root=h('div',{class:'pv t-'+theme});
  const cover=h('div',{class:'pv-cover',style:p.cover_url?{backgroundImage:`url("${p.cover_url}")`}:null});
  const av=h('div',{class:'pv-av',style:p.avatar_url?{backgroundImage:`url("${p.avatar_url}")`}:null},p.avatar_url?null:(p.display_name||p.username||'L').trim()[0].toUpperCase());
  root.append(cover,h('div',{class:'pv-head'},av,h('h1',null,p.display_name||'@'+p.username),h('div',{class:'pv-user'},'@'+p.username),h('div',{class:'pv-user'},(p.followers||0)+' followers \u00b7 '+(p.following||0)+' following'),(p.badges&&p.badges.length)?h('div',{class:'pv-badges'},p.badges.map(b=>h('span',{class:'pv-badge'},'\u{1F3C6} Winner \u00b7 '+b.title))):null));
  if(p.bio)root.append(h('p',{class:'pv-bio',style:{padding:'0 20px',margin:'10px 0',textAlign:'center'}},p.bio));
  const soc=socialList(p.socials);if(soc.length)root.append(h('div',{class:'pv-soc',style:{display:'flex',gap:'8px',flexWrap:'wrap',justifyContent:'center',padding:'4px 16px 10px'}},soc.map(x=>h('a',{href:x.url,target:'_blank',rel:'noopener noreferrer nofollow',style:{background:x.bg,color:x.dark?'#111':'#fff',padding:'7px 13px',borderRadius:'99px',fontWeight:'600',fontSize:'13px',textDecoration:'none'}},x.label))));
  const sec=(t,node)=>root.append(h('section',{class:'pv-sec'},h('h2',null,t),node));
  const money=(n,cur)=>fmtMoney(n,cur||'NGN');
  if(d.photos&&d.photos.length)sec('Photos',h('div',{class:'pv-grid'},d.photos.map(x=>h('figure',null,h('img',{src:publicUrl('gallery',x.path),alt:x.caption||'',loading:'lazy'}),x.caption&&h('figcaption',null,x.caption)))));
  if(!opts.hideFooter)root.append(h('footer',{class:'pv-foot'},h('a',{href:CFG.mainSite,target:'_blank',rel:'noopener'},'Made with PHOTO DUMP'),h('span',null,'Browse the film')));
  return root;
}
