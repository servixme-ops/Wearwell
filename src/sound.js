/* ---------- Optional background sound, generated live with WebAudio (no files).
   Nothing plays until the user picks a sound AND unmutes after interacting with the page. ---------- */
const Sound={
  ctx:null,master:null,kind:'off',muted:true,_nodes:[],_timer:null,_listeners:[],
  KINDS:[{id:'off',label:'Off'},{id:'rain',label:'Soft rain'},{id:'room',label:'Warm room'},{id:'highlife',label:'Highlife groove'}],
  on(fn){this._listeners.push(fn);},
  _emit(){this._listeners.forEach(f=>f(this.state()));},
  state(){return{kind:this.kind,muted:this.muted,playing:this.playing()};},
  playing(){return this.kind!=='off'&&!this.muted&&!!this.ctx&&this.ctx.state==='running';},
  load(kind,muted){this.kind=kind||'off';this.muted=muted!==false;},
  async _ensure(){
    if(!this.ctx){const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return false;this.ctx=new AC();this.master=this.ctx.createGain();this.master.gain.value=0;this.master.connect(this.ctx.destination);}
    if(this.ctx.state==='suspended'){try{await this.ctx.resume();}catch(e){return false;}}
    return true;
  },
  /* Must be called from a user gesture (tap on a sound control). */
  async apply(){
    this._stop();
    if(this.kind==='off'||this.muted){if(this.master)this.master.gain.setTargetAtTime(0,this.ctx.currentTime,.1);this._emit();return;}
    if(!(await this._ensure())){this._emit();return;}
    this.master.gain.cancelScheduledValues(this.ctx.currentTime);
    this.master.gain.setTargetAtTime(.5,this.ctx.currentTime,.4);
    ({rain:()=>this._rain(),room:()=>this._room(),highlife:()=>this._highlife()}[this.kind]||(()=>{}))();
    this._emit();
  },
  async set(kind){this.kind=kind;if(kind!=='off')this.muted=false;await this.apply();},
  async toggleMute(){
    if(this.kind==='off'){this.kind='rain';this.muted=false;}else this.muted=!this.muted;
    await this.apply();return this.muted;
  },
  suspendForHidden(){if(this.ctx&&this.ctx.state==='running')this.ctx.suspend();this._emit();},
  _stop(){
    this._nodes.forEach(n=>{try{n.stop&&n.stop();}catch(e){}try{n.disconnect();}catch(e){}});this._nodes=[];
    clearInterval(this._timer);this._timer=null;
  },
  _noise(type){
    const c=this.ctx,len=c.sampleRate*3,buf=c.createBuffer(1,len,c.sampleRate),d=buf.getChannelData(0);
    let last=0;for(let i=0;i<len;i++){const w=Math.random()*2-1;if(type==='brown'){last=(last+.02*w)/1.02;d[i]=last*3.2;}else d[i]=w*.6;}
    const s=c.createBufferSource();s.buffer=buf;s.loop=true;return s;
  },
  _rain(){
    const c=this.ctx,n=this._noise('white'),hp=c.createBiquadFilter(),lp=c.createBiquadFilter(),g=c.createGain();
    hp.type='highpass';hp.frequency.value=900;lp.type='lowpass';lp.frequency.value=7500;g.gain.value=.22;
    n.connect(hp);hp.connect(lp);lp.connect(g);g.connect(this.master);n.start();
    const b=this._noise('brown'),bl=c.createBiquadFilter(),bg=c.createGain();bl.type='lowpass';bl.frequency.value=380;bg.gain.value=.5;
    b.connect(bl);bl.connect(bg);bg.connect(this.master);b.start();this._nodes.push(n,b,hp,lp,g,bl,bg);
  },
  _room(){
    const c=this.ctx,f=c.createBiquadFilter(),g=c.createGain();f.type='lowpass';f.frequency.value=700;g.gain.value=.16;f.connect(g);g.connect(this.master);
    const lfo=c.createOscillator(),lg=c.createGain();lfo.frequency.value=.07;lg.gain.value=300;lfo.connect(lg);lg.connect(f.frequency);lfo.start();
    [110,164.8,220,277.2].forEach((fr,i)=>{const o=c.createOscillator();o.type=i%2?'triangle':'sine';o.frequency.value=fr;o.detune.value=(i-1.5)*4;o.connect(f);o.start();this._nodes.push(o);});
    const n=this._noise('brown'),nf=c.createBiquadFilter(),ng=c.createGain();nf.type='lowpass';nf.frequency.value=260;ng.gain.value=.12;n.connect(nf);nf.connect(ng);ng.connect(this.master);n.start();
    this._nodes.push(lfo,lg,f,g,n,nf,ng);
  },
  _highlife(){
    const c=this.ctx,bpm=104,beat=60/bpm;let step=0,next=c.currentTime+.1;
    const scale=[0,2,4,7,9],root=196;
    const pluck=(t,fr,vol,len)=>{const o=c.createOscillator(),g=c.createGain(),f=c.createBiquadFilter();o.type='triangle';o.frequency.value=fr;f.type='lowpass';f.frequency.value=2400;
      g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(vol,t+.008);g.gain.exponentialRampToValueAtTime(.0008,t+len);o.connect(f);f.connect(g);g.connect(this.master);o.start(t);o.stop(t+len+.05);};
    const hat=(t,vol)=>{const b=c.createBuffer(1,c.sampleRate*.05,c.sampleRate),d=b.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*(1-i/d.length);const s=c.createBufferSource(),g=c.createGain(),f=c.createBiquadFilter();s.buffer=b;f.type='highpass';f.frequency.value=6000;g.gain.value=vol;s.connect(f);f.connect(g);g.connect(this.master);s.start(t);};
    const bassN=[0,0,5,5,7,7,5,0];
    const tick=()=>{
      while(next<c.currentTime+.4){
        const s=step%16,bar=Math.floor(step/16)%8;
        if(s%4===0)pluck(next,root/2*Math.pow(2,bassN[bar]/12),.28,beat*.9);
        if(s%2===0)hat(next,.05);else hat(next+beat*.04,.025);
        if([0,3,6,8,10,13].includes(s)){const deg=scale[(s*3+bar)%5];pluck(next,root*2*Math.pow(2,deg/12),.11,beat*.6);}
        next+=beat/4*(s%2?1.12:.88);step++;
      }
    };
    tick();this._timer=setInterval(tick,120);
  }
};
document.addEventListener('visibilitychange',()=>{if(document.hidden)Sound.suspendForHidden();});
