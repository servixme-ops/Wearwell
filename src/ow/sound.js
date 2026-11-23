/* OpenWalls notification sounds: tiny WebAudio chimes, no files, no network. Respects a mute switch. */
(function(){
  let ctx=null;const KEY='ow_snd';
  const on=()=>{try{return localStorage.getItem(KEY)!=='0';}catch(e){return true;}};
  const get=()=>{if(!ctx){const A=window.AudioContext||window.webkitAudioContext;if(!A)return null;try{ctx=new A();}catch(e){return null;}}return ctx;};
  const unlock=()=>{const c=get();if(c&&c.state==='suspended')c.resume().catch(()=>{});};
  ['pointerdown','touchstart','keydown'].forEach(ev=>window.addEventListener(ev,unlock,{passive:true}));
  const tone=(c,t,f,d,v)=>{const o=c.createOscillator(),g=c.createGain();o.type='sine';o.frequency.value=f;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(v,t+.012);g.gain.exponentialRampToValueAtTime(.0001,t+d);o.connect(g);g.connect(c.destination);o.start(t);o.stop(t+d+.02);};
  const SEQ={msg:[[784,0,.22],[1047,.11,.32]],note:[[659,0,.2],[880,.1,.2],[1175,.2,.34]],sent:[[880,0,.12]]};
  let lastAt=0;
  window.OWSound={
    enabled:on,
    set(v){try{localStorage.setItem(KEY,v?'1':'0');}catch(e){}},
    play(kind){if(!on())return;const c=get();if(!c||c.state!=='running')return;const n=Date.now();if(n-lastAt<400&&kind!=='sent')return;lastAt=n;const s=SEQ[kind]||SEQ.note,t=c.currentTime+.01,v=kind==='sent'?.05:.12;s.forEach(x=>tone(c,t+x[1],x[0],x[2],v));try{if(kind!=='sent'&&navigator.vibrate)navigator.vibrate(40);}catch(e){}}
  };
})();
