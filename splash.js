/* The Black Horse — "splash in the face".
   A drink is thrown at the visitor: it flies at the screen, smacks onto the glass,
   runs down in rivulets and fades as "Cheers!" appears. Plain 2D canvas, no libraries.
   window.BHSplash.play(kind, opts)    one splash. opts: {cheers:true, at:{x,y}, size:1, onImpact(fn({x,y}))}
   window.BHSplash.series(kind, n)     2–3 splashes from different angles, "Cheers!" on the last
   kind: 'water' | 'ale' | 'wine' | 'prosecco'   */
(function(){
  'use strict';
  if(window.BHSplash) return;
  const KINDS={
    water:   {body:[150,190,215], a:.16, rim:[10,25,40],  rimA:.62, hi:.95, glow:.30, foam:0,   fizz:0},
    ale:     {body:[205,128,30],  a:.58, rim:[70,32,4],   rimA:.55, hi:.85, glow:.38, foam:.9,  fizz:.5},
    wine:    {body:[105,6,28],    a:.80, rim:[30,0,8],    rimA:.70, hi:.70, glow:.30, foam:0,   fizz:0},
    prosecco:{body:[232,206,120], a:.34, rim:[95,72,20],  rimA:.5,  hi:.95, glow:.40, foam:.25, fizz:1}
  };
  const rnd=(a,b)=>a+Math.random()*(b-a), clamp=(v,a,b)=>v<a?a:v>b?b:v;
  const gauss=()=>{ let u=0,v=0; while(!u) u=Math.random(); while(!v) v=Math.random(); return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v); };
  let live=0;

  function play(kindName, opts){
    opts=opts||{};
    if(live>=4 || matchMedia('(prefers-reduced-motion: reduce)').matches){ opts.onImpact&&opts.onImpact({x:innerWidth/2,y:innerHeight*.4}); return; }
    const K=KINDS[kindName]||KINDS.water; live++;
    const dpr=Math.min(2, window.devicePixelRatio||1), W=innerWidth, H=innerHeight, S=Math.min(W,H);
    const mk=()=>{ const c=document.createElement('canvas'); c.width=W*dpr; c.height=H*dpr; const x=c.getContext('2d'); x.scale(dpr,dpr); return [c,x]; };
    const [cv,ctx]=mk(), [bodyC,bc]=mk(), [rimC,rc]=mk();
    cv.className='bh-splash'; cv.style.cssText='position:fixed;inset:0;width:100vw;height:100vh;z-index:9000;pointer-events:none;';
    const blur=document.createElement('div');
    blur.style.cssText='position:fixed;inset:0;z-index:8999;pointer-events:none;opacity:0;-webkit-backdrop-filter:blur(3px) saturate(1.3) brightness(1.08);backdrop-filter:blur(3px) saturate(1.3) brightness(1.08);';
    const cheers=document.createElement('div'); cheers.className='bh-cheers'; cheers.setAttribute('aria-hidden','true');
    cheers.innerHTML='<b>Cheers!</b><span>Welcome to The Black Horse</span>';
    document.body.append(blur, cv); if(opts.cheers!==false) document.body.append(cheers);

    /* ---------- the splat: an irregular sheet, tapered fingers, flung drops ---------- */
    const cx=opts.at?opts.at.x:W*rnd(.40,.60), cy=opts.at?opts.at.y:H*rnd(.34,.46), R=S*(W<700?rnd(.2,.24):rnd(.12,.15))*(opts.size||1);
    const core={pts:[], cx, cy, sag:0, shrink:1};
    const N=56, ph=[rnd(0,6),rnd(0,6),rnd(0,6)];
    for(let i=0;i<N;i++){ const a=i/N*6.283;
      const r=R*(1 + .16*Math.sin(a*3+ph[0]) + .10*Math.sin(a*5+ph[1]) + .07*Math.sin(a*9+ph[2]) + .05*gauss());
      core.pts.push([Math.cos(a)*r, Math.sin(a)*r*.9]); }
    const fingers=[]; const nf=16+Math.floor(Math.random()*8);
    for(let i=0;i<nf;i++){ const a=i/nf*6.283+rnd(-.18,.18), long=Math.random()<.28, len=R*(long?rnd(.8,1.5):rnd(.12,.5)), w=R*(long?rnd(.09,.14):rnd(.14,.26)), bend=rnd(-.1,.1);
      fingers.push({a, len, w, bend, tip:Math.max(2.5, w*(long?rnd(.55,.9):rnd(.6,.85)))}); }
    const drops=[];
    const addDrop=(x,y,r,stretch,rot,kind)=>{ if(x<-30||x>W+30||y<-30||y>H+30) return; drops.push({x,y,r,rx:r*stretch,ry:r,rot,vy:0,kind,run:false,trail:[],life:1}); };
    fingers.forEach(f=>{ // a drop flicked off the end of each finger, and a couple beyond it
      const ex=cx+Math.cos(f.a)*(R*.85+f.len), ey=cy+Math.sin(f.a)*(R*.85+f.len)*.9;
      for(let k=1;k<=3;k++){ const d=R*rnd(.15,.55)*k; addDrop(ex+Math.cos(f.a)*d, ey+Math.sin(f.a)*d, Math.max(1.6,f.tip*rnd(.3,.75)/k), rnd(1.1,1.8), f.a,'sat'); } });
    for(let i=0;i<110;i++){ const a=Math.random()*6.283, d=R*(1.2+Math.pow(Math.random(),.8)*3.2), r=Math.max(1.2,S*.02*Math.pow(Math.random(),2.4));
      addDrop(cx+Math.cos(a)*d, cy+Math.sin(a)*d*.92, r, 1+Math.min(1.6,d/R*.25)*Math.random(), a,'sat'); }
    for(let i=0;i<220;i++){ const a=Math.random()*6.283, d=R*(.9+Math.random()*4.2); addDrop(cx+Math.cos(a)*d, cy+Math.sin(a)*d, rnd(.5,1.4), 1, 0,'mist'); }
    for(let i=0;i<20;i++) addDrop(rnd(0,W), rnd(0,H), Math.max(1,S*.011*Math.random()), 1, 0,'sat');
    // rivulets that will run down from the bottom of the sheet and fingers
    const runners=[]; const nr=5+Math.floor(Math.random()*4);
    for(let i=0;i<nr;i++){ const a=rnd(.35,2.8); const f=fingers.reduce((b,x)=>Math.abs(x.a%6.283-a)<Math.abs(b.a%6.283-a)?x:b,fingers[0]);
      const onFinger=Math.random()<.5, dist= onFinger ? R*.85+f.len*rnd(.4,.9) : R*rnd(.75,.95), aa= onFinger ? f.a : a;
      runners.push({x:cx+Math.cos(aa)*dist, y:cy+Math.sin(aa)*dist*.9, r:R*rnd(.07,.12), vy:0, start:rnd(.25,1.1), trail:[], wob:rnd(0,6), pause:0}); }
    // the drink in flight
    const sx=W*rnd(.42,.58), sy=H*1.08;
    const fly=[]; for(let i=0;i<70;i++){ const a=Math.random()*6.283, d=Math.abs(gauss())*R*1.3; fly.push({tx:cx+Math.cos(a)*d, ty:cy+Math.sin(a)*d, r:R*rnd(.12,.35)*(1-Math.min(.8,d/(R*3))), delay:rnd(0,.06)}); }
    const fizz=[]; if(K.fizz) for(let i=0;i<90;i++) fizz.push({a:Math.random()*6.283, d:Math.sqrt(Math.random())*R*.85, s:rnd(.6,1.8), sp:rnd(12,35), ph:Math.random()});
    const foam=[]; if(K.foam) for(let i=0;i<70;i++){ const a=Math.random()*6.283, d=R*(.55+Math.random()*.5); foam.push({a,d,s:rnd(1,3.4)*S/700}); }

    const FLY=.32, T_FADE=3.4, T_END=4.6; const t0=performance.now(); let last=t0, hit=false, blurSet=false, fastOut=0, flashA=0;
    const wipe=()=>{ if(!fastOut) fastOut=performance.now(); };
    addEventListener('pointerdown',wipe,{once:true}); addEventListener('keydown',wipe,{once:true});
    const col=(c,a)=>`rgba(${c[0]},${c[1]},${c[2]},${a})`;
    const softRim = 'filter' in ctx;

    /* ---------- geometry ---------- */
    function traceCore(x, ox, oy, k){
      const s=core.shrink*k, c0=core.cx+ox, c1=core.cy+oy+core.sag;
      const P=core.pts.map(([px,py])=>[c0+px*s, c1+py*s + Math.max(0,py)*core.sag*.012]);
      x.moveTo((P[0][0]+P[N-1][0])/2,(P[0][1]+P[N-1][1])/2);
      for(let i=0;i<N;i++){ const p=P[i], q=P[(i+1)%N]; x.quadraticCurveTo(p[0],p[1],(p[0]+q[0])/2,(p[1]+q[1])/2); }
      x.closePath();
      for(const f of fingers){ // tapered finger with a round end
        const base=R*.55*s, L=(base+f.len*core.grow)*1, ca=Math.cos(f.a), sa=Math.sin(f.a), nx=-sa, ny=ca, w=f.w*s*k, tip=f.tip*s*k*core.grow;
        const bx=c0+ca*base, by=c1+sa*base*.9, ex=c0+ca*L, ey=c1+sa*L*.9 + core.sag*.3, mx=(bx+ex)/2+nx*f.bend*f.len, my=(by+ey)/2+ny*f.bend*f.len;
        x.moveTo(bx+nx*w, by+ny*w); x.quadraticCurveTo(mx+nx*tip*.8, my+ny*tip*.8, ex+nx*tip, ey+ny*tip);
        x.arc(ex, ey, tip, Math.atan2(ny,nx), Math.atan2(-ny,-nx), true);
        x.quadraticCurveTo(mx-nx*tip*.8, my-ny*tip*.8, bx-nx*w, by-ny*w); x.closePath(); }
    }
    function traceDrops(x, ox, oy, k){
      for(const d of drops){ if(d.life<=0) continue; const g=d.grow||1, rx=d.rx*g*k, ry=d.ry*g*k*(d.run?1.15:1);
        x.moveTo(d.x+ox+rx*Math.cos(d.rot), d.y+oy+rx*Math.sin(d.rot)); x.ellipse(d.x+ox, d.y+oy, rx, ry, d.rot, 0, 6.283); }
      for(const r of runners){ if(!r.on) continue; x.moveTo(r.x+ox+r.r*k, r.y+oy); x.ellipse(r.x+ox, r.y+oy, r.r*k, r.r*k*1.25, 0, 0, 6.283); }
    }
    function strokeTrails(x, ox, oy, k){
      x.lineCap='round'; x.lineJoin='round';
      for(const r of runners){ const T=r.trail; if(T.length<2) continue;
        for(let i=1;i<T.length;i++){ x.beginPath(); x.lineWidth=Math.max(.8, T[i][2]*k); x.moveTo(T[i-1][0]+ox,T[i-1][1]+oy); x.lineTo(T[i][0]+ox,T[i][1]+oy); x.stroke(); } }
    }

    /* ---------- motion ---------- */
    function step(tt, dt){
      core.grow = clamp(tt/.07,0,1); core.grow = core.grow<1 ? core.grow*(1.25-.25*core.grow) : 1;
      const imp = tt<.1 ? 1+.22*Math.sin(tt/.1*Math.PI) : 1;
      core.shrink = imp * (1 - .22*clamp((tt-.6)/2.6,0,1));      // the sheet thins as it runs off
      core.sag += dt * (tt>.4 ? 9+tt*7 : 0) * S/800;               // and slowly slumps down the glass
      for(const d of drops){ d.grow = d.kind==='mist'?1:(tt<.08?1+.4*Math.sin(tt/.08*Math.PI):1);
        if(d.kind==='sat' && d.r>S*.012 && tt>.6 && !d.run && Math.random()<dt*.4) d.run=true;
        if(d.run){ d.vy=Math.min(d.vy+60*dt, 25+d.r*4); if(Math.random()<dt*1.5) d.vy*=.2; d.y+=d.vy*dt; d.rot=Math.PI/2; d.rx=d.ry=d.r; } }
      for(const r of runners){ if(tt<r.start) continue; r.on=true;
        if(r.pause>0){ r.pause-=dt; continue; }
        r.vy=Math.min(r.vy+(140+r.r*6)*dt*S/800, (60+r.r*5)*S/800); if(Math.random()<dt*1.1){ r.pause=rnd(.05,.25); r.vy*=.3; }
        r.wob+=dt*2.2; const dy=r.vy*dt; r.y+=dy; r.x+=Math.sin(r.wob)*.35;
        r.trail.push([r.x, r.y-r.r*.4, r.r*rnd(.55,.8)]); if(r.trail.length>260) r.trail.shift();
        r.r*=1-dt*.08; }
    }

    /* ---------- drawing ---------- */
    function drawFlight(t){
      for(const f of fly){ const p=clamp((t-f.delay)/FLY,0,1); if(p<=0) continue; const e=p*p*p;
        const z=1+(1-e)*10, x=sx+(f.tx-sx)*e, y=sy+(f.ty-sy)*e - Math.sin(e*Math.PI)*H*.06, r=f.r/z*1.6, ang=Math.atan2(f.ty-sy,f.tx-sx), st=1+(1-e)*2.5;
        ctx.save(); ctx.translate(x,y); ctx.rotate(ang); ctx.globalAlpha=Math.min(1,.3+e)*Math.min(1,K.a+.45);
        ctx.fillStyle=col(K.body,1); ctx.beginPath(); ctx.ellipse(0,0,r*st,r,0,0,6.283); ctx.fill();
        ctx.globalAlpha*=.8; ctx.fillStyle='rgba(255,255,255,.7)'; ctx.beginPath(); ctx.ellipse(-r*.2,-r*.4,r*st*.3,r*.14,0,0,6.283); ctx.fill(); ctx.restore(); }
    }
    function drawLiquid(tt, alpha){
      bc.clearRect(0,0,W,H); rc.clearRect(0,0,W,H);
      // 1) body: everything as one shape so overlaps never double up
      bc.fillStyle=col(K.body,1); bc.strokeStyle=col(K.body,1);
      bc.beginPath(); traceCore(bc,0,0,1); traceDrops(bc,0,0,1); bc.fill(); strokeTrails(bc,0,0,1);
      // 2) lens rim: the shape minus itself nudged down-right — a dark crescent on the upper-left edge, like a real drop on glass
      const sh=Math.max(1.5,S*.004);
      rc.fillStyle=col(K.rim,1); rc.strokeStyle=col(K.rim,1);
      rc.beginPath(); traceCore(rc,0,0,1); traceDrops(rc,0,0,1); rc.fill(); strokeTrails(rc,0,0,1);
      rc.globalCompositeOperation='destination-out';
      rc.beginPath(); traceCore(rc,sh*1.2,sh*1.6,.985); traceDrops(rc,sh*.45,sh*.6,.86); rc.fill(); strokeTrails(rc,sh*.4,sh*.5,.7);
      rc.globalCompositeOperation='source-over';
      ctx.globalAlpha=alpha*K.a; ctx.drawImage(bodyC,0,0,W,H);
      ctx.globalAlpha=alpha*K.rimA; if(softRim) ctx.filter='blur(.8px)'; ctx.drawImage(rimC,0,0,W,H); ctx.filter='none';
      // 3) light focused through the liquid at the lower edge
      ctx.globalCompositeOperation='lighter'; ctx.globalAlpha=alpha*K.glow;
      const g=ctx.createRadialGradient(core.cx+R*.25, core.cy+core.sag+R*.5, 0, core.cx+R*.25, core.cy+core.sag+R*.5, R*core.shrink*.9);
      g.addColorStop(0,'rgba(255,240,215,.55)'); g.addColorStop(1,'rgba(255,240,215,0)'); ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
      ctx.fillStyle='rgba(255,236,200,.5)';
      for(const d of drops){ if(d.life<=0||d.r<2.2) continue; const r=d.r*(d.grow||1); ctx.beginPath(); ctx.ellipse(d.x+r*.12, d.y+r*.45, r*.5, r*.2, 0, 0, 6.283); ctx.fill(); }
      for(const r of runners){ if(!r.on) continue; ctx.beginPath(); ctx.ellipse(r.x+r.r*.1, r.y+r.r*.55, r.r*.5, r.r*.22, 0, 0, 6.283); ctx.fill(); }
      ctx.globalCompositeOperation='source-over';
      // 4) crisp window reflections near the top of each drop
      ctx.globalAlpha=alpha*K.hi; ctx.fillStyle='rgba(255,255,255,.92)';
      for(const d of drops){ if(d.life<=0||d.r<1.8) continue; const r=d.r*(d.grow||1); ctx.beginPath(); ctx.ellipse(d.x-r*.3, d.y-r*.42, Math.max(.6,r*.2), Math.max(.4,r*.1), -.5, 0, 6.283); ctx.fill(); }
      for(const r of runners){ if(!r.on) continue; ctx.beginPath(); ctx.ellipse(r.x-r.r*.3, r.y-r.r*.45, r.r*.22, r.r*.11, -.5, 0, 6.283); ctx.fill(); }
      // reflections along the top edge of the sheet
      const s=core.shrink, c1=core.cy+core.sag; ctx.lineCap='round';
      for(let i=0;i<5;i++){ const a=-2.5+i*.32+ph[0]*.02, rr=R*s*(.72+.05*i%2); ctx.globalAlpha=alpha*K.hi*(.55-.07*i); ctx.strokeStyle='rgba(255,255,255,.9)'; ctx.lineWidth=Math.max(1,R*.035*(1-i*.12));
        ctx.beginPath(); ctx.arc(core.cx, c1, rr, a, a+.22); ctx.stroke(); }
      ctx.globalAlpha=alpha*K.hi*.5; ctx.fillStyle='rgba(255,255,255,.9)'; ctx.beginPath(); ctx.ellipse(core.cx-R*s*.35, c1-R*s*.42, R*s*.16, R*s*.06, -.55, 0, 6.283); ctx.fill();
      // 5) foam flecks / bubbles for beer and fizz
      if(K.foam){ ctx.globalAlpha=alpha*K.foam*.8; ctx.fillStyle='rgba(255,248,230,.95)';
        for(const f of foam){ ctx.beginPath(); ctx.arc(core.cx+Math.cos(f.a)*f.d*s, c1+Math.sin(f.a)*f.d*s*.9, f.s, 0, 6.283); ctx.fill(); } }
      if(K.fizz){ ctx.globalAlpha=alpha*.85*K.fizz; ctx.strokeStyle='rgba(255,255,255,.75)'; ctx.lineWidth=.8;
        for(const f of fizz){ const yy=(f.ph*f.d + tt*f.sp)%(f.d*2+1); ctx.beginPath(); ctx.arc(core.cx+Math.cos(f.a)*f.d*s, c1+Math.sin(f.a)*f.d*s*.9 - yy*.4, f.s, 0, 6.283); ctx.stroke(); } }
      if(flashA>0){ ctx.globalAlpha=flashA*.16; ctx.fillStyle='#fff3dc'; ctx.fillRect(0,0,W,H); flashA=Math.max(0,flashA-.2); }
      ctx.globalAlpha=1;
    }
    function shake(){ const m=document.querySelector('main')||document.body.firstElementChild; if(!m||!m.animate) return;
      m.animate([{transform:'none'},{transform:'translate(-8px,6px) rotate(-.3deg)'},{transform:'translate(6px,-4px) rotate(.2deg)'},{transform:'translate(-3px,2px)'},{transform:'none'}],{duration:320,easing:'ease-out'}); }
    function setBlurMask(){ try{ const u=bodyC.toDataURL('image/png'); blur.style.webkitMaskImage=blur.style.maskImage=`url(${u})`; blur.style.webkitMaskSize=blur.style.maskSize='100% 100%'; blur.style.transition='opacity .25s'; blur.style.opacity='1'; }catch(e){} }

    function frame(now){
      let t=(now-t0)/1000; const dt=Math.min(.05,(now-last)/1000); last=now;
      if(fastOut) t=Math.max(t, T_FADE+(now-fastOut)/1000*3);
      ctx.clearRect(0,0,W,H);
      if(t<FLY+.08) drawFlight(t);
      if(t>=FLY){
        if(!hit){ hit=true; flashA=1; shake(); try{ navigator.vibrate&&navigator.vibrate(30); }catch(e){} opts.onImpact&&opts.onImpact({x:cx,y:cy}); }
        const tt=t-FLY; step(tt,dt);
        const alpha = t<T_FADE ? 1 : clamp(1-(t-T_FADE)/(T_END-T_FADE),0,1);
        drawLiquid(tt, alpha);
        if(!blurSet && tt>.12){ blurSet=true; setBlurMask(); }
        if(blurSet) blur.style.opacity=String(alpha*.9);
        if(tt>.45) cheers.classList.add('on');
        if(t>T_FADE+.2) cheers.classList.add('out');
        if(alpha<=0){ cleanup(); return; }
      }
      requestAnimationFrame(frame);
    }
    function cleanup(){ cv.remove(); blur.remove(); setTimeout(()=>cheers.remove(),900); removeEventListener('pointerdown',wipe); removeEventListener('keydown',wipe); live=Math.max(0,live-1); }
    requestAnimationFrame(frame);
  }

  const st=document.createElement('style');
  st.textContent=`.bh-cheers{position:fixed;left:50%;top:74%;transform:translate(-50%,-50%) scale(.6);z-index:9001;pointer-events:none;text-align:center;opacity:0;transition:opacity .5s,transform .7s cubic-bezier(.2,1.4,.4,1);padding:18px 40px;background:radial-gradient(ellipse at center,rgba(8,6,4,.62),rgba(8,6,4,0) 70%);}
  .bh-cheers.on{opacity:1;transform:translate(-50%,-50%) scale(1);} .bh-cheers.out{opacity:0;transform:translate(-50%,-62%) scale(1.04);transition:opacity .9s,transform 1.2s;}
  .bh-cheers b{display:block;font-family:'Playfair Display','Fraunces',Georgia,serif;font-style:italic;font-size:clamp(46px,11vw,110px);line-height:1.05;background:linear-gradient(100deg,#8a6a2c,#f6e3a8 40%,#fff6d6 50%,#d9b25c 60%,#8a6a2c);-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 4px 18px rgba(0,0,0,.7));}
  .bh-cheers span{display:block;margin-top:8px;font-family:'Oswald',sans-serif;letter-spacing:.32em;text-transform:uppercase;font-size:clamp(11px,2.6vw,14px);color:#f1e8d6;text-shadow:0 2px 10px rgba(0,0,0,.9);}`;
  document.head.appendChild(st);
  // a round of splashes: left, right, then the big one in the middle with "Cheers!"
  function series(kind, n){
    n=Math.max(1,Math.min(3,Math.round(n)||1)); const W=innerWidth, H=innerHeight;
    const spots=[{x:W*.28,y:H*.34,size:.75},{x:W*.72,y:H*.30,size:.8},{x:W*.5,y:H*.42,size:1.05}].slice(3-n);
    spots.forEach((sp,i)=>setTimeout(()=>play(kind,{at:{x:sp.x+(Math.random()-.5)*W*.06,y:sp.y+(Math.random()-.5)*H*.06}, size:sp.size, cheers:i===spots.length-1}), i*850));
  }
  window.BHSplash={play, series};
})();
