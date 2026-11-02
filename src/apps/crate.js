/* ---------- MAGAZINE CRATE app: opens the crate with the Lukks magazine in it (no room, nothing else) ---------- */
defApp({id:'crate',name:'Magazine Crate',bg:'linear-gradient(#d9a15a,#a8682c)',
  glyph:()=>`<svg viewBox="0 0 60 60"><path d="M10 26h40v22a2 2 0 0 1-2 2H12a2 2 0 0 1-2-2z" fill="#fff"/><path d="M10 26l4-8h32l4 8" fill="none" stroke="#fff" stroke-width="3" stroke-linejoin="round"/><rect x="19" y="10" width="14" height="19" rx="1.5" fill="#ff5a1f"/><rect x="27" y="8" width="14" height="19" rx="1.5" fill="#ffe0b0" opacity=".9"/><path d="M18 36h24" stroke="#a8682c" stroke-width="3" stroke-linecap="round"/></svg>`,
  launch(P){P.openCrate();},
  mount(){}});
