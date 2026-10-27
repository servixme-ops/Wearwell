/* ---------- Public Lukks Profile view: shared by the Profile app preview and the public page ---------- */
const PROFILE_THEMES={maroon:'Maroon',ochre:'Ochre',indigo:'Indigo',forest:'Forest',noir:'Noir'};
function profileUrl(username){return CFG.mainSite+'u/'+username;}
function renderPublicProfile(d,opts){
  opts=opts||{};
  const p=d.profile,theme=PROFILE_THEMES[p.theme]?p.theme:'maroon';
  const root=h('div',{class:'pv t-'+theme});
  const cover=h('div',{class:'pv-cover',style:p.cover_url?{backgroundImage:`url("${p.cover_url}")`}:null});
  const av=h('div',{class:'pv-av',style:p.avatar_url?{backgroundImage:`url("${p.avatar_url}")`}:null},p.avatar_url?null:(p.display_name||p.username||'L').trim()[0].toUpperCase());
  root.append(cover,h('div',{class:'pv-head'},av,h('h1',null,p.display_name||'@'+p.username),h('div',{class:'pv-user'},'@'+p.username),p.bio&&h('p',{class:'pv-bio'},p.bio),
    p.style&&h('div',{class:'pv-tags'},String(p.style).split(/[,·|]/).map(s=>s.trim()).filter(Boolean).slice(0,6).map(s=>h('span',null,s)))));
  const links=h('div',{class:'pv-links'});
  const link=(label,url,sub)=>{const u=safeUrl(url);if(!u)return;links.append(h('a',{class:'pv-link',href:u,target:'_blank',rel:'noopener noreferrer nofollow'},h('b',null,label),sub&&h('span',null,sub)));};
  if(p.storefront_url)link('Shop my store',p.storefront_url,new URL(safeUrl(p.storefront_url)||'https://x.y').host);
  (Array.isArray(p.collection_links)?p.collection_links:[]).slice(0,8).forEach(c=>c&&c.label&&link(String(c.label).slice(0,60),c.url));
  Object.keys(p.socials||{}).forEach(k=>{if(CFG.socials[k]&&p.socials[k]&&/^[A-Za-z0-9._-]{1,60}$/.test(p.socials[k]))link(CFG.socials[k].label,CFG.socials[k].base+p.socials[k],'@'+p.socials[k]);});
  if(links.children.length)root.append(links);
  const sec=(t,node)=>root.append(h('section',{class:'pv-sec'},h('h2',null,t),node));
  const money=(n,cur)=>fmtMoney(n,cur||'NGN');
  if(d.looks&&d.looks.length){
    const g=h('div',{class:'pv-looks'});
    d.looks.forEach(l=>{
      const src=l.photo_path?publicUrl('looks',l.photo_path):null;
      const items=(l.items||[]);
      g.append(h('article',{class:'pv-look'},src?h('img',{src,alt:l.title,loading:'lazy'}):h('div',{class:'pv-noimg'},icon('shirt')),h('div',{class:'pv-lb'},h('b',null,l.title),h('span',null,'Look #'+l.look_no+(l.wear_count?` · worn ${l.wear_count}×`:'')),
        items.length?h('ul',null,items.map(i=>h('li',null,i.name+(i.brand?' · '+i.brand:'')+(i.price!=null?' · '+money(i.price,l.currency):'')))):null)));
    });
    sec('Looks',g);
  }
  if(d.photos&&d.photos.length)sec('Gallery',h('div',{class:'pv-grid'},d.photos.map(x=>h('figure',null,h('img',{src:publicUrl('gallery',x.path),alt:x.caption||'',loading:'lazy'}),x.caption&&h('figcaption',null,x.caption)))));
  if(d.features&&d.features.length)sec('Featured in Lukks',h('div',{class:'pv-grid'},d.features.map(x=>h('figure',null,h('img',{src:publicUrl('features',x.path),alt:x.caption||'',loading:'lazy'}),h('figcaption',null,(x.issue?x.issue+' · ':'')+(x.caption||''))))));
  if(d.wardrobe&&d.wardrobe.length&&typeof LOOKS!=='undefined'){
    ensureLooks();const items=d.wardrobe.map(id=>LOOKS[id]).filter(Boolean);
    if(items.length)sec('Wardrobe',h('div',{class:'pv-ward'},items.map(l=>h('span',null,l.name+' · '+l.designer))));
  }
  if(!opts.hideFooter)root.append(h('footer',{class:'pv-foot'},h('a',{href:CFG.mainSite,target:'_blank',rel:'noopener'},'Made with LUKKS'),h('span',null,'Discover Nigerian fashion')));
  return root;
}
