/* ---------- LIVE WATER lock-screen wallpaper: the water surface sloshes as you tilt the phone ---------- */
const WaterWall={
  /* draw one frame. tilt: -1..1 (phone bent left/right), t: seconds */
  draw(g,W,H,t,tilt,lvl){
    const ang=-(lvl==null?tilt:lvl)*0.28;                 // water level angle (radians)
    const y0=H*0.34,cx=W/2,tn=Math.tan(ang);
    const surf=x=>y0+(x-cx)*tn+Math.sin(x/W*9+t*1.6)*H*0.0035+Math.sin(x/W*17-t*2.3)*H*0.0018;
    /* sky */
    let gr=g.createLinearGradient(0,0,0,y0+H*.05);gr.addColorStop(0,'#7fcbe8');gr.addColorStop(.7,'#c8ecf5');gr.addColorStop(1,'#eaf8fb');g.fillStyle=gr;g.fillRect(0,0,W,H);
    let rg=g.createRadialGradient(W*.5,H*.05,2,W*.5,H*.05,W*.7);rg.addColorStop(0,'rgba(255,255,255,.95)');rg.addColorStop(.25,'rgba(255,255,240,.55)');rg.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=rg;g.fillRect(0,0,W,y0+H*.1);
    g.fillStyle='rgba(255,255,255,.55)';[[.22,.2,.2,.02],[.78,.16,.17,.018],[.6,.26,.22,.015]].forEach(c=>{g.beginPath();g.ellipse(W*c[0]+Math.sin(t*.1+c[0]*9)*6,H*c[1],W*c[2],H*c[3],0,0,7);g.fill();});
    /* palms */
    const palm=(px,py,dir,s)=>{g.save();g.translate(px,py);g.scale(dir*s,s);g.strokeStyle='#1f5a34';g.lineCap='round';
      for(let i=0;i<7;i++){const a=-0.3+i*0.42,sw=Math.sin(t*.8+i)*0.04;for(const [lw,col] of [[10,'#1f5a34'],[4,'#3f8a52']]){g.strokeStyle=col;g.lineWidth=lw;g.beginPath();g.moveTo(0,0);g.quadraticCurveTo(Math.cos(a+sw)*70,Math.sin(a+sw)*70-40,Math.cos(a+sw)*130,Math.sin(a+sw)*130+10);g.stroke();}}
      g.restore();};
    palm(W*.04,H*.02,1,W/380);palm(W*.97,H*.05,-1,W/420);
    /* water body */
    g.save();g.beginPath();g.moveTo(-5,H+5);g.lineTo(-5,surf(-5));for(let x=0;x<=W+8;x+=8)g.lineTo(x,surf(x));g.lineTo(W+5,H+5);g.closePath();g.clip();
    gr=g.createLinearGradient(0,y0-H*.12,0,H);gr.addColorStop(0,'#4fd0de');gr.addColorStop(.25,'#1e9cb8');gr.addColorStop(.6,'#0f7896');gr.addColorStop(1,'#0a5a74');g.fillStyle=gr;g.fillRect(0,0,W,H);
    /* sandy floor */
    gr=g.createLinearGradient(0,H*.68,0,H);gr.addColorStop(0,'rgba(170,225,222,0)');gr.addColorStop(.45,'rgba(170,225,222,.75)');gr.addColorStop(1,'rgba(205,238,232,.95)');g.fillStyle=gr;g.fillRect(0,H*.66,W,H*.34);
    const px=tilt*W*.05;
    /* light rays */
    g.globalCompositeOperation='lighter';
    for(let i=0;i<6;i++){const x=W*(.1+i*.17)+Math.sin(t*.35+i*1.7)*W*.05+px*.6,w=W*(.05+.03*Math.sin(t*.5+i)),yy=surf(x);
      const lg=g.createLinearGradient(0,yy,0,H*.85);lg.addColorStop(0,'rgba(255,255,255,.26)');lg.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=lg;
      g.beginPath();g.moveTo(x-w*.4,yy);g.lineTo(x+w*.4,yy);g.lineTo(x+w*1.6+Math.sin(t*.4+i)*W*.04,H*.85);g.lineTo(x-w*1.2,H*.85);g.closePath();g.fill();}
    /* caustics: drifting bright lines on the water and sand */
    g.lineWidth=Math.max(1.5,W/260);
    for(let k=0;k<16;k++){const by=H*(.42+k*.032);g.strokeStyle='rgba(255,255,255,'+(.05+.05*Math.sin(t+k))+')';g.beginPath();
      for(let x=-10;x<=W+10;x+=10){const y=by+Math.sin(x/W*11+t*1.1+k)*H*.011+Math.sin(x/W*23-t*1.5+k*2)*H*.006+px*.2;x===-10?g.moveTo(x,y):g.lineTo(x,y);}g.stroke();}
    g.globalCompositeOperation='source-over';
    /* shark */
    const sx=cx+Math.sin(t*.22)*W*.12+tilt*W*.1,sy=H*.77+Math.sin(t*.5)*H*.012-lvl_off(tilt)*H*.04;
    g.fillStyle='rgba(8,50,60,.18)';g.beginPath();g.ellipse(sx+W*.04,H*.935,W*.34,H*.012,0,0,7);g.fill();
    g.save();g.translate(sx,sy);const sc=W*.0024;g.scale(sc,sc);g.rotate(Math.sin(t*.5)*.03+ang*.5);
    const sg=g.createLinearGradient(0,-60,0,40);sg.addColorStop(0,'#2b4a5b');sg.addColorStop(.55,'#55798a');sg.addColorStop(.62,'#cfe0e3');sg.addColorStop(1,'#e9f3f3');g.fillStyle=sg;
    g.beginPath();g.moveTo(150,2);g.bezierCurveTo(120,-20,60,-30,15,-30);g.bezierCurveTo(5,-50,-10,-62,-22,-64);g.bezierCurveTo(-22,-45,-30,-32,-45,-26);
    g.bezierCurveTo(-90,-18,-120,-8,-150,-12);g.lineTo(-178,-52+Math.sin(t*1.3)*6);g.lineTo(-160,-4);g.lineTo(-174,36-Math.sin(t*1.3)*5);g.lineTo(-136,12);
    g.bezierCurveTo(-60,22,40,32,100,22);g.bezierCurveTo(125,16,142,10,150,2);g.closePath();g.fill();
    g.fillStyle='#46687a';g.beginPath();g.moveTo(52,16);g.quadraticCurveTo(24,52,-6,64);g.lineTo(12,22);g.closePath();g.fill();
    g.fillStyle='#0d2530';g.beginPath();g.arc(112,-6,3.2,0,7);g.fill();
    g.strokeStyle='rgba(20,50,60,.35)';g.lineWidth=2;for(let i=0;i<3;i++){g.beginPath();g.moveTo(82-i*8,-14);g.quadraticCurveTo(78-i*8,-4,82-i*8,6);g.stroke();}
    g.restore();
    /* bubbles */
    g.strokeStyle='rgba(255,255,255,.6)';g.lineWidth=Math.max(1,W/380);
    for(let i=0;i<12;i++){const f=((t*.05+i*.173)%1),bx=W*(.12+((i*.37)%.8))+Math.sin(t+i*3)*8+px*.5,by=H*(.9-f*.55),r=W*(.006+.008*((i*7)%5)/5);g.beginPath();g.arc(bx,by,r,0,7);g.stroke();}
    g.restore();
    /* surface highlight, bending with the water level */
    g.save();g.lineCap='round';g.strokeStyle='rgba(255,255,255,.9)';g.lineWidth=Math.max(2,W/130);g.beginPath();for(let x=-5;x<=W+5;x+=6){x===-5?g.moveTo(x,surf(x)):g.lineTo(x,surf(x));}g.stroke();
    g.globalCompositeOperation='lighter';g.strokeStyle='rgba(255,255,255,.25)';g.lineWidth=Math.max(5,W/55);g.beginPath();for(let x=-5;x<=W+5;x+=6){x===-5?g.moveTo(x,surf(x)+W*.012):g.lineTo(x,surf(x)+W*.012);}g.stroke();g.restore();
  },
  _el:null,_cv:null,_raf:0,_tilt:0,_lvl:0,_vel:0,_target:0,_drag:null,_on:false,
  attach(el){
    if(this._el===el&&this._cv&&this._cv.parentNode)return;this.detach();
    this._el=el;const cv=document.createElement('canvas');cv.className='wp-live';cv.width=420;cv.height=910;cv.style.cssText='position:absolute;inset:0;width:100%;height:100%;display:block';
    el.appendChild(cv);this._cv=cv;this._g=cv.getContext('2d');this._on=true;
    this._ori=e=>{if(e.gamma==null)return;const o=(screen.orientation&&screen.orientation.angle)||0;let v=(o===90?e.beta:o===270?-e.beta:e.gamma)/35;this._target=Math.max(-1,Math.min(1,v||0));this._real=true;};
    addEventListener('deviceorientation',this._ori,true);
    /* iOS needs a tap to allow motion */
    if(typeof DeviceOrientationEvent!=='undefined'&&typeof DeviceOrientationEvent.requestPermission==='function'){this._ask=()=>{DeviceOrientationEvent.requestPermission().catch(()=>{});removeEventListener('click',this._ask,true);};addEventListener('click',this._ask,true);}
    /* desktop / no sensor: drag sideways to tilt the water */
    this._pd=e=>{this._drag={x:e.clientX,t:this._target};};this._pm=e=>{if(!this._drag||this._real)return;this._target=Math.max(-1,Math.min(1,this._drag.t+(e.clientX-this._drag.x)/160));};this._pu=()=>{this._drag=null;if(!this._real)this._target=0;};
    el.addEventListener('pointerdown',this._pd);addEventListener('pointermove',this._pm);addEventListener('pointerup',this._pu);
    const t0=performance.now();let last=t0;
    const loop=now=>{
      if(!this._on)return;this._raf=requestAnimationFrame(loop);
      if(document.hidden||(typeof Phone!=='undefined'&&Phone.state!=='lock'))return;
      const dt=Math.min(.05,(now-last)/1000);last=now;
      /* spring: the water level lags behind the phone and overshoots a little, like real water */
      this._tilt+=(this._target-this._tilt)*Math.min(1,dt*6);
      this._vel+=((this._target-this._lvl)*60-this._vel*5)*dt;this._lvl+=this._vel*dt;
      WaterWall.draw(this._g,cv.width,cv.height,(now-t0)/1000,this._tilt,this._lvl);
    };
    this._raf=requestAnimationFrame(loop);
  },
  detach(){
    this._on=false;cancelAnimationFrame(this._raf);
    if(this._ori)removeEventListener('deviceorientation',this._ori,true);
    if(this._ask)removeEventListener('click',this._ask,true);
    if(this._el&&this._pd){this._el.removeEventListener('pointerdown',this._pd);removeEventListener('pointermove',this._pm);removeEventListener('pointerup',this._pu);}
    if(this._cv&&this._cv.parentNode)this._cv.remove();this._cv=null;this._el=null;
  }
};
function lvl_off(t){return Math.abs(t)*0.3;}
