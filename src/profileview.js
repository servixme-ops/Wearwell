/* ---------- Public Lukks Profile view: shared by the Profile app preview and the public page ---------- */
const PROFILE_THEMES={brand:'Lukks',lilac:'Lilac',maroon:'Maroon',ochre:'Ochre',indigo:'Indigo',forest:'Forest',noir:'Noir'};
function profileUrl(username,lukkId){return lukkId?CFG.mainSite+'profile.html?u='+username+'&l='+lukkId:CFG.mainSite+'u/'+username;}
function renderPublicProfile(d,opts){
  opts=opts||{};
  const p=d.profile,theme=PROFILE_THEMES[p.theme]?p.theme:'brand';
  const root=h('div',{class:'pv t-'+theme});
  const cover=h('div',{class:'pv-cover',style:p.cover_url?{backgroundImage:`url("${p.cover_url}")`}:null});
  const av=h('div',{class:'pv-av',style:p.avatar_url?{backgroundImage:`url("${p.avatar_url}")`}:null},p.avatar_url?null:(p.display_name||p.username||'L').trim()[0].toUpperCase());
  root.append(cover,h('div',{class:'pv-head'},av,h('h1',null,p.display_name||'@'+p.username),h('div',{class:'pv-user'},'@'+p.username)));
  const sec=(t,node)=>root.append(h('section',{class:'pv-sec'},h('h2',null,t),node));
  const money=(n,cur)=>fmtMoney(n,cur||'NGN');
  if(d.looks&&d.looks.length){
    const g=h('div',{class:'pv-looks'});
    d.looks.forEach(l=>{
      const src=l.photo_path?publicUrl('looks',l.photo_path):null;
      const items=(l.items||[]);
      const ext=l.external_url&&safeUrl(l.external_url);
      const art=h('article',{class:'pv-look'+(opts.highlight===l.id?' hl':''),id:'lk-'+l.id},src?h('img',{src,alt:l.title,loading:'lazy'}):h('div',{class:'pv-noimg'},icon('shirt')),h('div',{class:'pv-lb'},h('b',null,l.title),l.category&&h('span',null,l.category),
        items.length?h('ul',null,items.map(i=>h('li',null,i.name+(i.brand?' · '+i.brand:'')+(i.price!=null?' · '+money(i.price,l.currency):'')))):null,
        ext&&h('a',{class:'pv-more',href:ext,target:'_blank',rel:'noopener noreferrer nofollow'},'See more ↗')));
      g.append(art);if(opts.highlight===l.id)setTimeout(()=>art.scrollIntoView({block:'center',behavior:'smooth'}),400);
    });
    sec('Lukks',g);
  }
  if(d.photos&&d.photos.length)sec('Gallery',h('div',{class:'pv-grid'},d.photos.map(x=>h('figure',null,h('img',{src:publicUrl('gallery',x.path),alt:x.caption||'',loading:'lazy'}),x.caption&&h('figcaption',null,x.caption)))));
  if(d.features&&d.features.length)sec('Featured in Lukks',h('div',{class:'pv-grid'},d.features.map(x=>h('figure',null,h('img',{src:publicUrl('features',x.path),alt:x.caption||'',loading:'lazy'}),h('figcaption',null,(x.issue?x.issue+' · ':'')+(x.caption||''))))));
  if(d.wardrobe&&d.wardrobe.length&&typeof LOOKS!=='undefined'){
    ensureLooks();const items=d.wardrobe.map(id=>LOOKS[id]).filter(Boolean);
    if(items.length)sec('My Lukks',h('div',{class:'pv-ward'},items.map(l=>h('span',null,l.name+' · '+l.designer))));
  }
  if(!opts.hideFooter)root.append(h('footer',{class:'pv-foot'},h('a',{href:CFG.mainSite,target:'_blank',rel:'noopener'},'Made with LUKKS'),h('span',null,'Find Your Kind of Style')));
  return root;
}
