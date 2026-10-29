/* Profile now lives inside the Lukks app. This icon opens it. */
defApp({id:'profile',name:'Profile',bg:'linear-gradient(#ff7a3d,#ff2d8a)',glyph:()=>`<svg viewBox="0 0 60 60"><circle cx="30" cy="22" r="9" fill="#fff"/><path d="M13 47c1.500-9 8-14 17-14s15.500 5 17 14z" fill="#fff"/></svg>`,
mount(el,ctx){el.append(spinner());setTimeout(()=>Phone.openApp('lukks',{me:1}),0);}});
