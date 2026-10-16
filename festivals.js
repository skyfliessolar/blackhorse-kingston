/* The Black Horse — festival themes.
   On the right days the website dresses up: Christmas snow and fairy lights, Halloween bats and pumpkins,
   Bonfire Night fireworks, and so on. Switched on/off (all, or one by one) in the admin under "Animations & 3D".
   window.BHFestivals.list            — every festival with its dates for a given year
   window.BHFestivals.today(opts)     — which festival (if any) is on today in UK time
   window.BHFestivals.apply(opts)     — show/hide the theme on the page              */
(function(){
  'use strict';
  if(window.BHFestivals) return;

  /* ---------- the calendar ---------- */
  function easter(y){ const a=y%19,b=Math.floor(y/100),c=y%100,d=Math.floor(b/4),e=b%4,f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),h=(19*a+b-d-g+15)%30,i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k)%7,m=Math.floor((a+11*h+22*l)/451);
    return new Date(Date.UTC(y,Math.floor((h+l-7*m+114)/31)-1,((h+l-7*m+114)%31)+1)); }
  const D=(y,m,d)=>new Date(Date.UTC(y,m-1,d)), add=(dt,n)=>new Date(dt.getTime()+n*864e5);
  const nthSunday=(y,m,n)=>{ const d=D(y,m,1); const first=add(d,(7-d.getUTCDay())%7); return add(first,7*(n-1)); };
  const lastMonday=(y,m)=>{ const d=D(y,m+1,1); let x=add(d,-1); while(x.getUTCDay()!==1) x=add(x,-1); return x; };
  // moving dates that follow the moon (built in for the years ahead)
  const LUNAR={2026:[2,17],2027:[2,6],2028:[1,26],2029:[2,13],2030:[2,3],2031:[1,23],2032:[2,11]};
  const DIWALI={2026:[11,8],2027:[10,29],2028:[10,17],2029:[11,5],2030:[10,26],2031:[11,14],2032:[11,2]};
  const EID={2026:[3,20],2027:[3,10],2028:[2,27],2029:[2,14],2030:[2,4],2031:[1,24],2032:[1,14]};
  const fromTable=(t,y)=>t[y]?D(y,t[y][0],t[y][1]):null;

  // priority: earlier in the list wins if two fall on the same day
  const FESTIVALS=[
    {id:'standrew', name:"St Andrew's Day", icon:'🏴', when:'30 November', msg:"Happy St Andrew's Day!", range:y=>[D(y,11,30),D(y,11,30)]},
    {id:'christmas', name:'Christmas', icon:'🎄', when:'25 November – 26 December', msg:'Merry Christmas from The Black Horse — book your festive table early!', range:y=>[D(y,11,25),D(y,12,26)]},
    {id:'newyear', name:'New Year', icon:'🎆', when:'27 Dec – 2 Jan', msg:'Happy New Year! Raise a glass with us at The Black Horse.', range:y=>[D(y,12,27),D(y+1,1,2)], prev:true},
    {id:'remembrance', name:'Remembrance', icon:'🌺', when:'Remembrance Sunday & 11 November', msg:'We will remember them.', range:y=>{ const s=nthSunday(y,11,2), d=D(y,11,11); return [add(d<s?d:s,-1), d>s?d:s]; }, quiet:true},
    {id:'bonfire', name:'Bonfire Night', icon:'🎇', when:'1–5 November', msg:'Remember, remember the fifth of November — warm up by our fire pit!', range:y=>[D(y,11,1),D(y,11,5)]},
    {id:'diwali', name:'Diwali', icon:'🪔', when:'Festival of Lights (date changes)', msg:'Happy Diwali — wishing you light, joy and good food!', range:y=>{ const d=fromTable(DIWALI,y); return d?[add(d,-2),add(d,1)]:null; }},
    {id:'halloween', name:'Halloween', icon:'🎃', when:'10–31 October', msg:'Happy Halloween! Spooky season is here at The Black Horse.', range:y=>[D(y,10,10),D(y,10,31)]},
    {id:'easter', name:'Easter', icon:'🐣', when:'Good Friday – Easter Monday', msg:'Happy Easter from The Black Horse!', range:y=>{ const e=easter(y); return [add(e,-2),add(e,1)]; }},
    {id:'mothers', name:"Mother's Day", icon:'💐', when:'Mothering Sunday (3 weeks before Easter)', msg:"Treat Mum this Mother's Day — book a table for the family.", range:y=>{ const m=add(easter(y),-21); return [add(m,-3),m]; }},
    {id:'pancake', name:'Pancake Day', icon:'🥞', when:'Shrove Tuesday', msg:'Happy Pancake Day! Flip by for a treat.', range:y=>{ const p=add(easter(y),-47); return [p,p]; }},
    {id:'fathers', name:"Father's Day", icon:'🍺', when:'Third Sunday in June', msg:"Father's Day — treat Dad to a pint and a Thai feast.", range:y=>{ const f=nthSunday(y,6,3); return [add(f,-3),f]; }},
    {id:'valentine', name:"Valentine's Day", icon:'💘', when:'10–14 February', msg:"Valentine's at The Black Horse — book a table for two.", range:y=>[D(y,2,10),D(y,2,14)]},
    {id:'lunar', name:'Lunar New Year', icon:'🏮', when:'Chinese New Year (date changes)', msg:'Happy Lunar New Year from the Drunken Wok kitchen!', range:y=>{ const d=fromTable(LUNAR,y); return d?[add(d,-1),add(d,3)]:null; }},
    {id:'eid', name:'Eid al-Fitr', icon:'🌙', when:'End of Ramadan (date changes)', msg:'Eid Mubarak from all of us at The Black Horse!', range:y=>{ const d=fromTable(EID,y); return d?[add(d,-1),add(d,2)]:null; }},
    {id:'stpatrick', name:"St Patrick's Day", icon:'☘️', when:'15–17 March', msg:"Happy St Patrick's Day — the Guinness is flowing!", range:y=>[D(y,3,15),D(y,3,17)]},
    {id:'stdavid', name:"St David's Day", icon:'🌼', when:'1 March', msg:'Dydd Gŵyl Dewi Hapus — Happy St David’s Day!', range:y=>[D(y,3,1),D(y,3,1)]},
    {id:'stgeorge', name:"St George's Day", icon:'🌹', when:'23 April', msg:"Happy St George's Day — a proper English pint awaits!", range:y=>[D(y,4,23),D(y,4,23)]},
    {id:'burns', name:'Burns Night', icon:'🥃', when:'24–25 January', msg:'Burns Night — a wee dram and good company.', range:y=>[D(y,1,24),D(y,1,25)]},
    {id:'summer', name:'Summer Bank Holiday', icon:'☀️', when:'Last weekend of August', msg:'Bank holiday sunshine on our terrace — see you there!', range:y=>{ const m=lastMonday(y,8); return [add(m,-2),m]; }}
  ];
  function londonToday(){ const p=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()).map(x=>[x.type,x.value]));
    return D(+p.year,+p.month,+p.day); }
  function today(o){ o=o||{}; const off=o.off||[];
    if(o.preview){ const f=FESTIVALS.find(x=>x.id===o.preview); if(f) return f; }
    if(o.enabled===false) return null;
    const t=londonToday(), y=t.getUTCFullYear();
    return FESTIVALS.find(f=>{ if(off.includes(f.id)) return false; return [y-1,y].some(yy=>{ const r=f.range(yy); return r && t>=r[0] && t<=r[1]; }); }) || null; }
  // the next festival coming up (for the admin status line)
  function next(o){ o=o||{}; const off=o.off||[], t=londonToday(), y=t.getUTCFullYear(); let best=null;
    FESTIVALS.forEach(f=>{ if(off.includes(f.id)) return; [y,y+1].forEach(yy=>{ const r=f.range(yy); if(r && r[0]>t && (!best||r[0]<best.start)) best={f, start:r[0], end:r[1]}; }); });
    return best; }
  function until(f){ const t=londonToday(), y=t.getUTCFullYear(); for(const yy of [y-1,y]){ const r=f.range(yy); if(r && t>=r[0] && t<=r[1]) return r[1]; } return null; }
  const fmt=d=>d.toLocaleDateString('en-GB',{day:'numeric',month:'short',timeZone:'UTC'});
  function datesFor(f,y){ const r=f.range(y); return r ? (r[0].getTime()===r[1].getTime() ? fmt(r[0]) : fmt(r[0])+' – '+fmt(r[1])) : '—'; }

  /* ---------- the look of each festival ---------- */
  const THEME={
    christmas:{accent:'#c8102e', glow:'rgba(200,16,46,.25)', fall:'snow', deco:'lights', ribbon:'linear-gradient(90deg,#0b3d23,#7a0c1e 50%,#0b3d23)'},
    newyear:{accent:'#e4ce93', glow:'rgba(228,206,147,.25)', fall:'confetti', fire:true, ribbon:'linear-gradient(90deg,#0c0b09,#3a2a0c 50%,#0c0b09)'},
    remembrance:{accent:'#b3121b', glow:'rgba(179,18,27,.12)', fall:null, deco:'poppy', ribbon:'linear-gradient(90deg,#120808,#2a0a0a 50%,#120808)'},
    bonfire:{accent:'#ff7a1a', glow:'rgba(255,122,26,.22)', fall:'sparks', fire:true, ribbon:'linear-gradient(90deg,#1a0a02,#6a2405 50%,#1a0a02)'},
    diwali:{accent:'#ffb300', glow:'rgba(255,179,0,.25)', fall:'diyas', ribbon:'linear-gradient(90deg,#3a0d38,#8a3b00 50%,#3a0d38)'},
    halloween:{accent:'#ff7a00', glow:'rgba(255,122,0,.22)', fall:['🦇','🎃','🕸️','👻'], deco:'web', ribbon:'linear-gradient(90deg,#1a0b1f,#5a2a00 50%,#1a0b1f)'},
    easter:{accent:'#f5d76e', glow:'rgba(245,215,110,.2)', fall:['🥚','🐣','🌷','🐰'], ribbon:'linear-gradient(90deg,#2d4a2b,#6b5a9a 50%,#2d4a2b)'},
    mothers:{accent:'#f4a6c1', glow:'rgba(244,166,193,.2)', fall:['🌸','💐','🌷'], ribbon:'linear-gradient(90deg,#3a1a28,#7a3a5a 50%,#3a1a28)'},
    pancake:{accent:'#f2c46d', glow:'rgba(242,196,109,.2)', fall:['🥞','🍋','🍯'], ribbon:'linear-gradient(90deg,#3a2410,#8a5a20 50%,#3a2410)'},
    fathers:{accent:'#e4ce93', glow:'rgba(228,206,147,.2)', fall:['🍺','👔','⭐'], ribbon:'linear-gradient(90deg,#14202e,#3a5068 50%,#14202e)'},
    valentine:{accent:'#ff4d7a', glow:'rgba(255,77,122,.22)', fall:['❤️','💕','💘','🌹'], ribbon:'linear-gradient(90deg,#3a0716,#8a1236 50%,#3a0716)'},
    lunar:{accent:'#e8202a', glow:'rgba(232,32,42,.25)', fall:'lanterns', ribbon:'linear-gradient(90deg,#5a0a0a,#b8860b 50%,#5a0a0a)'},
    eid:{accent:'#7fd1ae', glow:'rgba(127,209,174,.2)', fall:['🌙','⭐','✨'], ribbon:'linear-gradient(90deg,#0b2a2a,#1f5a4a 50%,#0b2a2a)'},
    stpatrick:{accent:'#2fa84f', glow:'rgba(47,168,79,.22)', fall:['☘️','🍀','🍺'], ribbon:'linear-gradient(90deg,#0b3a1c,#1f7a3a 50%,#0b3a1c)'},
    stdavid:{accent:'#ffd400', glow:'rgba(255,212,0,.2)', fall:['🌼','🌼','🐉'], ribbon:'linear-gradient(90deg,#0f3a1f,#7a0c12 50%,#0f3a1f)'},
    stgeorge:{accent:'#cf142b', glow:'rgba(207,20,43,.18)', fall:['🌹','🏴󠁧󠁢󠁥󠁮󠁧󠁿','🌹'], ribbon:'linear-gradient(90deg,#f4f1ea,#cf142b 50%,#f4f1ea)', dark:true},
    standrew:{accent:'#3a7bd5', glow:'rgba(58,123,213,.2)', fall:['🏴󠁧󠁢󠁳󠁣󠁴󠁿','💜'], ribbon:'linear-gradient(90deg,#0b2a5a,#3a7bd5 50%,#0b2a5a)'},
    burns:{accent:'#8e7cc3', glow:'rgba(142,124,195,.2)', fall:['💜','🥃'], ribbon:'linear-gradient(90deg,#1a1430,#3a2a5a 50%,#1a1430)'},
    summer:{accent:'#ffcc33', glow:'rgba(255,204,51,.2)', fall:['☀️','🍹','🌻'], ribbon:'linear-gradient(90deg,#0b3a4a,#c47a10 50%,#0b3a4a)'}
  };

  const css=document.createElement('style');
  css.textContent=`
  .fest-ribbon{position:relative;z-index:49;display:flex;align-items:center;justify-content:center;gap:12px;padding:9px 44px 9px 16px;text-align:center;color:#fff7e6;font-family:'Oswald',sans-serif;letter-spacing:.06em;font-size:14px;box-shadow:0 2px 12px rgba(0,0,0,.4);}
  .fest-ribbon.dark{color:#3a0a0a;}
  .fest-ribbon .fi{font-size:20px;}
  .fest-ribbon .fx{position:absolute;right:10px;top:50%;transform:translateY(-50%);background:none;border:none;color:inherit;font-size:20px;cursor:pointer;opacity:.75;}
  .fest-canvas{position:fixed;inset:0;width:100vw;height:100vh;z-index:45;pointer-events:none;}
  html.fest .hero::after{content:'';position:absolute;inset:0;pointer-events:none;background:radial-gradient(ellipse at 50% 30%,var(--fest-glow),transparent 65%);z-index:0;}
  .fest-lights{position:absolute;left:0;right:0;bottom:-14px;height:22px;pointer-events:none;z-index:2;display:flex;justify-content:space-around;}
  .fest-lights::before{content:'';position:absolute;left:0;right:0;top:3px;height:12px;border-bottom:2px solid rgba(20,40,20,.9);border-radius:0 0 50% 50%/0 0 100% 100%;}
  .fest-lights i{position:relative;width:8px;height:12px;border-radius:50% 50% 45% 45%;margin-top:8px;animation:festTw 1.6s ease-in-out infinite;}
  .fest-lights i:nth-child(4n+1){background:#ff3b3b;color:#ff3b3b;} .fest-lights i:nth-child(4n+2){background:#ffd23b;color:#ffd23b;animation-delay:.4s}
  .fest-lights i:nth-child(4n+3){background:#3bff7a;color:#3bff7a;animation-delay:.8s} .fest-lights i:nth-child(4n){background:#3bb8ff;color:#3bb8ff;animation-delay:1.2s}
  @keyframes festTw{0%,100%{box-shadow:0 0 10px 2px currentColor;opacity:1}50%{box-shadow:0 0 2px 0 currentColor;opacity:.45}}
  .fest-web{position:absolute;top:0;width:min(220px,30vw);height:min(220px,30vw);pointer-events:none;z-index:1;opacity:.55;}
  .fest-web.l{left:0} .fest-web.r{right:0;transform:scaleX(-1)}
  .fest-poppy{display:block;margin:0 auto 8px;width:46px;height:46px;}
  html.fest .eyebrow{color:var(--fest-accent);}
  @media (prefers-reduced-motion: reduce){ .fest-lights i{animation:none;} }`;
  document.head.appendChild(css);

  const WEB='<svg viewBox="0 0 200 200" fill="none" stroke="rgba(230,230,230,.8)" stroke-width="1.2"><path d="M0 0L200 200M0 0L200 80M0 0L80 200M0 0L200 0M0 0L0 200"/>'+
    [40,75,110,150,190].map(r=>`<path d="M${r} 0 Q${r*.75} ${r*.25} ${r*.92} ${r*.4} Q${r*.62} ${r*.62} ${r*.4} ${r*.92} Q${r*.25} ${r*.75} 0 ${r}"/>`).join('')+'<circle cx="62" cy="88" r="5" fill="#111" stroke="#666"/><path d="M62 83V0" stroke="rgba(230,230,230,.6)"/></svg>';
  const POPPY='<svg class="fest-poppy" viewBox="0 0 64 64" aria-hidden="true"><g fill="#c8102e"><ellipse cx="32" cy="18" rx="16" ry="14"/><ellipse cx="18" cy="34" rx="14" ry="16"/><ellipse cx="46" cy="34" rx="14" ry="16"/><ellipse cx="32" cy="46" rx="16" ry="14"/></g><circle cx="32" cy="32" r="7" fill="#111"/><path d="M32 46 L30 64" stroke="#2f5a2a" stroke-width="3"/></svg>';

  /* ---------- falling / rising things ---------- */
  let cv=null, raf=0, parts=[], kind=null, fireworks=false, bursts=[], lastT=0, running=false;
  // emojis are drawn once into little pictures — drawing text every frame is slow on phones
  const sprites={};
  function emojiSprite(e){ if(sprites[e]) return sprites[e]; const c=document.createElement('canvas'); c.width=c.height=48; const x=c.getContext('2d'); x.font='36px serif'; x.textAlign='center'; x.textBaseline='middle'; x.fillText(e,24,26); return sprites[e]=c; }
  function startCanvas(th){
    stopCanvas(); kind=th.fall; fireworks=!!th.fire; if(!kind && !fireworks) return;
    cv=document.createElement('canvas'); cv.className='fest-canvas'; cv.setAttribute('aria-hidden','true'); document.body.appendChild(cv);
    const ctx=cv.getContext('2d'); let W=0,H=0, dpr=Math.min(2,devicePixelRatio||1);
    const fit=()=>{ W=innerWidth; H=innerHeight; cv.width=W*dpr; cv.height=H*dpr; ctx.setTransform(dpr,0,0,dpr,0,0); }; fit(); addEventListener('resize',fit); cv._fit=fit;
    const n=Math.round(Math.min(70, W/18)) * (kind==='snow'?1.4:kind==='lanterns'?.25:kind==='diyas'?.35:Array.isArray(kind)?.45:1);
    const spawn=(top)=>{ const p={x:Math.random()*W, y:top?-20-Math.random()*H:Math.random()*H, s:.6+Math.random()*1.2, sw:Math.random()*6.28, rot:Math.random()*6.28, vr:(Math.random()-.5)*1.4};
      if(Array.isArray(kind)) p.e=kind[Math.floor(Math.random()*kind.length)];
      if(kind==='confetti') p.c=['#e4ce93','#ffffff','#c8102e','#3bb8ff','#ffd23b'][Math.floor(Math.random()*5)];
      if(kind==='lanterns'||kind==='diyas'){ p.y=top?H+40+Math.random()*H:Math.random()*H; }
      return p; };
    parts=Array.from({length:Math.round(n)},()=>spawn(false));
    running=true; lastT=performance.now();
    const loop=now=>{ if(!running) return; raf=requestAnimationFrame(loop); if(document.hidden) return; const dt=Math.min(.05,(now-lastT)/1000); lastT=now;
      ctx.clearRect(0,0,W,H);
      for(const p of parts){ p.sw+=dt*1.2; p.rot+=p.vr*dt;
        if(kind==='lanterns'||kind==='diyas'){ p.y-=dt*(14+p.s*14); p.x+=Math.sin(p.sw)*.25; if(p.y<-60) Object.assign(p,spawn(true));
          const r=kind==='lanterns'?5*p.s+4:4*p.s+2, g=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,r*3.2); g.addColorStop(0,kind==='lanterns'?'rgba(255,120,60,.55)':'rgba(255,200,80,.6)'); g.addColorStop(1,'rgba(255,120,60,0)');
          ctx.fillStyle=g; ctx.beginPath(); ctx.arc(p.x,p.y,r*3.2,0,7); ctx.fill();
          if(kind==='lanterns'){ ctx.fillStyle='#d4141e'; ctx.beginPath(); ctx.ellipse(p.x,p.y,r*.8,r,0,0,7); ctx.fill(); ctx.fillStyle='#ffcc4d'; ctx.fillRect(p.x-r*.5,p.y-r-2,r,3); ctx.fillRect(p.x-r*.5,p.y+r-1,r,3); }
          else{ ctx.fillStyle='#fff3c0'; ctx.beginPath(); ctx.ellipse(p.x,p.y,r*.5,r,0,0,7); ctx.fill(); }
          continue; }
        if(kind==='sparks'){ p.y-=dt*(40+p.s*50); p.x+=Math.sin(p.sw*2)*.6; if(p.y<-10){ Object.assign(p,spawn(true)); p.y=H+10; }
          ctx.fillStyle=`rgba(255,${140+Math.floor(p.s*60)},40,${.5+.4*Math.sin(p.sw*4)})`; ctx.beginPath(); ctx.arc(p.x,p.y,1+p.s,0,7); ctx.fill(); continue; }
        p.y+=dt*(kind==='snow'?18+p.s*26:22+p.s*22); p.x+=Math.sin(p.sw)*(kind==='snow'?.5:.7); if(p.y>H+30) Object.assign(p,spawn(true));
        if(kind==='snow'){ ctx.fillStyle=`rgba(255,255,255,${.45+p.s*.3})`; ctx.beginPath(); ctx.arc(p.x,p.y,1+p.s*2,0,7); ctx.fill(); }
        else if(kind==='confetti'){ ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.rot); ctx.fillStyle=p.c; ctx.fillRect(-3*p.s,-1.5*p.s,6*p.s,3*p.s); ctx.restore(); }
        else if(p.e){ const sp=emojiSprite(p.e), z=(14+p.s*10)/40; ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(Math.sin(p.rot)*.5); ctx.globalAlpha=.85; ctx.drawImage(sp,-24*z,-24*z,48*z,48*z); ctx.restore(); } }
      if(fireworks){ if(Math.random()<dt*.9) { const x=W*(.15+Math.random()*.7), y=H*(.12+Math.random()*.35), hue=Math.floor(Math.random()*360); for(let i=0;i<46;i++){ const a=i/46*6.283, sp=60+Math.random()*90; bursts.push({x,y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,l:1,h:hue}); } }
        for(const b of bursts){ b.vy+=60*dt; b.x+=b.vx*dt; b.y+=b.vy*dt; b.vx*=.985; b.vy*=.985; b.l-=dt*.75; if(b.l>0){ ctx.fillStyle=`hsla(${b.h},90%,${60+b.l*20}%,${b.l})`; ctx.beginPath(); ctx.arc(b.x,b.y,1.6,0,7); ctx.fill(); } }
        bursts=bursts.filter(b=>b.l>0); }
    };
    raf=requestAnimationFrame(loop);
  }
  function stopCanvas(){ running=false; cancelAnimationFrame(raf); if(cv){ removeEventListener('resize',cv._fit); cv.remove(); cv=null; } parts=[]; bursts=[]; }

  /* ---------- put it on the page ---------- */
  /* ================= DECORATIONS =================
     Drawn pieces that dress the website for each festival. They always show (even with animations off);
     when motion is allowed they twinkle, swing, flicker and float. Everything added has the class "fest-d". */
  const dcss=document.createElement('style');
  dcss.textContent=`
  .fest-d{pointer-events:none;}
  .hero .fest-props{position:absolute;left:0;right:0;bottom:0;height:0;z-index:1;}
  .fest-props > *{position:absolute;bottom:0;}
  .fest-props .l{left:max(8px,3vw);} .fest-props .l2{left:calc(max(8px,3vw) + clamp(84px,13vw,180px));} .fest-props .r{right:max(8px,3vw);} .fest-props .r2{right:calc(max(8px,3vw) + clamp(70px,10vw,140px));}
  .fest-tree{width:clamp(92px,13vw,190px);} .fest-gifts{width:clamp(70px,9vw,128px);} .fest-snowman{width:clamp(70px,9.5vw,136px);}
  .fest-pumpkin{width:clamp(70px,9vw,128px);} .fest-pumpkin.s{width:clamp(50px,6vw,86px);}
  .fest-bonfire{width:clamp(96px,13vw,190px);} .fest-balloons{width:clamp(70px,9vw,130px);}
  .fest-emo{font-size:clamp(42px,6vw,78px);line-height:1;filter:drop-shadow(0 6px 10px rgba(0,0,0,.5));}
  .fest-drift{position:absolute;left:0;right:0;bottom:-2px;height:clamp(26px,4vw,52px);z-index:1;}
  .fest-grass{position:absolute;left:0;right:0;bottom:-2px;height:clamp(30px,4.5vw,58px);z-index:1;}
  .fest-diyas{position:absolute;left:50%;transform:translateX(-50%);bottom:6px;display:flex;gap:clamp(10px,3vw,36px);z-index:2;}
  .fest-diyas svg{width:clamp(34px,4.6vw,58px);}
  .fest-hang{position:absolute;left:0;right:0;top:0;height:0;z-index:2;}
  .fest-hang > *{position:absolute;top:0;transform-origin:50% 0;}
  .fest-bell{width:clamp(46px,6vw,78px);} .fest-lantern{width:clamp(30px,4vw,54px);}
  .fest-bunting{position:absolute;left:0;right:0;top:0;width:100%;height:clamp(40px,6vw,70px);z-index:2;}
  .fest-ring{position:absolute;inset:-24%;z-index:-1;}
  html.fest .hero-medallion:has(.fest-ring){margin-top:22px;margin-bottom:52px;}
  html.fest .hero-medallion{isolation:isolate;}
  .fest-moon{position:absolute;right:max(14px,8vw);top:clamp(24px,6vw,70px);width:clamp(70px,10vw,140px);z-index:0;opacity:.95;}
  .fest-sun{position:absolute;right:max(14px,8vw);top:clamp(30px,6vw,70px);width:clamp(70px,9vw,120px);z-index:0;}
  .fest-flyer{position:absolute;top:clamp(14px,3vw,34px);left:-30%;font-size:clamp(22px,3vw,40px);white-space:nowrap;z-index:1;opacity:0;}
  .fest-spider{position:absolute;right:clamp(40px,9vw,110px);top:0;width:24px;z-index:2;}
  .fest-divi{font-size:22px;margin:0 14px;align-self:center;}
  .divider{align-items:center;}
  .fest-corner{position:absolute !important;top:-6px;right:-6px;width:clamp(58px,8vw,92px);z-index:3 !important;transform:rotate(8deg);}
  /* motion (only when animations are allowed) */
  html.fest-anim .tw{animation:fdTw 2.2s ease-in-out infinite;}
  @keyframes fdTw{0%,100%{opacity:1}50%{opacity:.35}}
  html.fest-anim .glowp{animation:fdGlow 2.6s ease-in-out infinite;transform-origin:center;transform-box:fill-box;}
  @keyframes fdGlow{0%,100%{filter:drop-shadow(0 0 4px #ffd75a)}50%{filter:drop-shadow(0 0 14px #ffe9a8)}}
  html.fest-anim .swing{animation:fdSwing 3.4s ease-in-out infinite;}
  @keyframes fdSwing{0%,100%{transform:rotate(-7deg)}50%{transform:rotate(7deg)}}
  html.fest-anim .flick{animation:fdFlick .18s steps(2) infinite alternate;}
  @keyframes fdFlick{from{opacity:.75}to{opacity:1}}
  html.fest-anim .flame{animation:fdFlame .5s ease-in-out infinite alternate;transform-origin:50% 100%;transform-box:fill-box;}
  @keyframes fdFlame{from{transform:scaleY(.9) skewX(-2deg)}to{transform:scaleY(1.08) skewX(3deg)}}
  html.fest-anim .bob{animation:fdBob 4s ease-in-out infinite;}
  @keyframes fdBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
  html.fest-anim .fest-flyer{animation:fdFly 22s linear infinite;}
  @keyframes fdFly{0%{left:-30%;opacity:0;transform:translateY(0)}4%{opacity:1}25%{transform:translateY(-18px)}50%{transform:translateY(8px)}75%{transform:translateY(-12px)}46%{opacity:1}50%,100%{left:120%;opacity:0}}
  html.fest-anim .fest-spider{animation:fdSpider 6s ease-in-out infinite;}
  @keyframes fdSpider{0%,100%{transform:translateY(0)}45%{transform:translateY(46px)}60%{transform:translateY(40px)}}
  html.fest-anim .spin-slow{animation:fdSpin 60s linear infinite;transform-origin:center;transform-box:fill-box;}
  @keyframes fdSpin{to{transform:rotate(360deg)}}
  @media (max-width:640px){ .fest-props .l2,.fest-props .r2{display:none;} .fest-moon,.fest-sun{opacity:.6;} }`;
  document.head.appendChild(dcss);

  const svg=(vb,inner,cls)=>`<svg class="${cls||''}" viewBox="${vb}" aria-hidden="true">${inner}</svg>`;
  const star=(cx,cy,r)=>{ let d=''; for(let i=0;i<10;i++){ const a=-Math.PI/2+i*Math.PI/5, rr=i%2?r*.45:r; d+=(i?'L':'M')+(cx+Math.cos(a)*rr).toFixed(1)+' '+(cy+Math.sin(a)*rr).toFixed(1); } return d+'Z'; };

  /* ---- Christmas ---- */
  function tree(){
    const balls=[[62,70,'#c8102e'],[96,78,'#f4c542'],[48,112,'#f4c542'],[80,104,'#c8102e'],[112,116,'#d8d8e8'],[36,152,'#c8102e'],[70,146,'#d8d8e8'],[104,150,'#f4c542'],[132,160,'#c8102e'],[56,176,'#f4c542'],[94,178,'#c8102e']];
    const lights=[[54,58],[74,86],[104,92],[40,128],[64,124],[92,130],[122,136],[30,170],[50,164],[82,168],[116,172],[140,178]];
    const cols=['#ff4d4d','#ffd84d','#4dff88','#4dc3ff'];
    return svg('0 0 160 230',`<defs><linearGradient id="fTr" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2f8a4f"/><stop offset="1" stop-color="#0b3a1f"/></linearGradient>
      <radialGradient id="fBl" cx=".35" cy=".35" r=".7"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset=".25" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>
      <rect x="70" y="190" width="20" height="26" fill="#5a3418"/>
      <path d="M80 92 L8 196 Q80 206 152 196 Z" fill="url(#fTr)"/><path d="M80 56 L20 146 Q80 156 140 146 Z" fill="url(#fTr)"/><path d="M80 24 L34 98 Q80 106 126 98 Z" fill="url(#fTr)"/>
      <path d="M42 90 Q82 112 120 86 M28 138 Q80 166 134 132 M16 186 Q84 210 146 178" fill="none" stroke="#e8c15a" stroke-width="3" stroke-linecap="round" opacity=".9"/>
      ${lights.map(([x,y],i)=>`<circle class="tw" style="animation-delay:${(i*.27)%2}s" cx="${x}" cy="${y}" r="3" fill="${cols[i%4]}" filter="drop-shadow(0 0 3px ${cols[i%4]})"/>`).join('')}
      ${balls.map(([x,y,c])=>`<circle cx="${x}" cy="${y}" r="7" fill="${c}"/><circle cx="${x}" cy="${y}" r="7" fill="url(#fBl)"/>`).join('')}
      <path class="glowp" d="${star(80,20,15)}" fill="#ffd75a" stroke="#fff3c0" stroke-width="1"/>`,'fest-tree l');
  }
  const gifts=()=>svg('0 0 130 90',`<rect x="4" y="38" width="56" height="50" rx="3" fill="#c8102e"/><rect x="28" y="38" width="8" height="50" fill="#f4c542"/><rect x="4" y="56" width="56" height="8" fill="#f4c542"/>
      <path d="M32 38 Q18 22 24 18 Q32 16 32 38 Q34 14 42 18 Q46 24 32 38" fill="#f4c542"/>
      <rect x="64" y="52" width="40" height="36" rx="3" fill="#1f6b3a"/><rect x="80" y="52" width="7" height="36" fill="#f2f2f2"/><rect x="64" y="66" width="40" height="7" fill="#f2f2f2"/>
      <rect x="96" y="30" width="30" height="58" rx="3" fill="#2a4f9e"/><rect x="108" y="30" width="6" height="58" fill="#e8c15a"/>`,'fest-gifts l2');
  const snowman=()=>svg('0 -20 120 190',`<defs><radialGradient id="fSn" cx=".4" cy=".35" r=".7"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#c9d8ea"/></radialGradient></defs>
      <circle cx="60" cy="128" r="38" fill="url(#fSn)"/><circle cx="60" cy="74" r="28" fill="url(#fSn)"/><circle cx="60" cy="34" r="21" fill="url(#fSn)"/>
      <path d="M36 70 L6 52 M84 70 L112 50 M12 56 L4 50 M106 54 L114 46" stroke="#5a3418" stroke-width="3" stroke-linecap="round"/>
      <rect x="40" y="8" width="40" height="6" rx="2" fill="#151515"/><rect x="46" y="-14" width="28" height="24" rx="2" fill="#151515"/><rect x="46" y="4" width="28" height="4" fill="#c8102e"/>
      <circle cx="53" cy="30" r="2.6" fill="#151515"/><circle cx="67" cy="30" r="2.6" fill="#151515"/><path d="M60 36 L78 40 L60 41Z" fill="#f08a24"/>
      <path d="M40 54 Q60 64 80 54 L80 60 Q60 70 40 60Z" fill="#c8102e"/><path d="M72 58 L80 82 L72 82 L68 60Z" fill="#a50d26"/>
      <circle cx="60" cy="68" r="2.6" fill="#151515"/><circle cx="60" cy="80" r="2.6" fill="#151515"/><circle cx="60" cy="118" r="3" fill="#151515"/><circle cx="60" cy="134" r="3" fill="#151515"/>`,'fest-snowman r');
  const drift=()=>`<svg class="fest-drift fest-d" viewBox="0 0 1000 60" preserveAspectRatio="none" aria-hidden="true"><path d="M0 60 L0 34 Q60 10 130 30 T270 26 T420 32 T560 22 T700 30 T850 20 T1000 30 L1000 60Z" fill="#eef4fb"/><path d="M0 60 L0 44 Q90 28 190 42 T400 40 T620 44 T820 38 T1000 44 L1000 60Z" fill="#d6e2f0" opacity=".8"/></svg>`;
  const bell=(x,delay)=>`<div class="swing" style="left:${x};animation-delay:${delay}s">${svg('0 0 80 120',`<line x1="40" y1="0" x2="40" y2="34" stroke="#c8102e" stroke-width="3"/>
      <path d="M40 30 Q26 18 20 28 Q18 36 40 34 Q62 36 60 28 Q54 18 40 30Z" fill="#c8102e"/><path d="M40 34 L30 52 M40 34 L50 52" stroke="#a50d26" stroke-width="4" stroke-linecap="round"/>
      <defs><linearGradient id="fBe" x1="0" x2="1"><stop offset="0" stop-color="#9c7230"/><stop offset=".45" stop-color="#ffe7a0"/><stop offset="1" stop-color="#9c7230"/></linearGradient></defs>
      <path d="M22 90 Q22 48 34 42 Q40 38 46 42 Q58 48 58 90 Q62 94 64 98 L16 98 Q18 94 22 90Z" fill="url(#fBe)"/><circle cx="40" cy="102" r="6" fill="#b58a3a"/>
      <path d="M50 92 Q48 52 40 46" stroke="#fff6d6" stroke-width="2" fill="none" opacity=".6"/>`,'fest-bell')}</div>`;
  function hollyRing(){ let g=''; for(let i=0;i<22;i++){ const a=i/22*Math.PI*2, x=110+Math.cos(a)*92, y=110+Math.sin(a)*92, r=a*180/Math.PI+90;
      g+=`<path transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${(r+(i%2?35:-35)).toFixed(0)})" d="M0 -18 Q5 -12 3 -7 Q9 -4 5 1 Q10 5 4 9 Q6 14 0 18 Q-6 14 -4 9 Q-10 5 -5 1 Q-9 -4 -3 -7 Q-5 -12 0 -18Z" fill="${i%2?'#1f6b3a':'#2f8a4f'}" stroke="#0b3a1f" stroke-width=".8"/>`;
      if(i%3===0) g+=`<g transform="translate(${(110+Math.cos(a)*86).toFixed(1)} ${(110+Math.sin(a)*86).toFixed(1)})"><circle r="4.5" fill="#d0121f"/><circle cx="6" cy="3" r="4" fill="#d0121f"/><circle cx="2" cy="-5" r="3.6" fill="#e0242f"/></g>`; }
    g+=`<path d="M110 22 Q92 12 88 26 Q92 36 110 28 Q128 36 132 26 Q128 12 110 22Z" fill="#c8102e"/><circle cx="110" cy="24" r="5" fill="#a50d26"/>`;
    return svg('0 0 220 220',g,'fest-ring fest-d'); }
  const hollySprig=(cls)=>svg('0 0 90 70',`<path transform="translate(30 36) rotate(-30)" d="M0 -26 Q7 -18 4 -10 Q13 -6 7 1 Q14 7 6 13 Q9 20 0 26 Q-9 20 -6 13 Q-14 7 -7 1 Q-13 -6 -4 -10 Q-7 -18 0 -26Z" fill="#2f8a4f" stroke="#0b3a1f"/>
      <path transform="translate(58 34) rotate(40)" d="M0 -26 Q7 -18 4 -10 Q13 -6 7 1 Q14 7 6 13 Q9 20 0 26 Q-9 20 -6 13 Q-14 7 -7 1 Q-13 -6 -4 -10 Q-7 -18 0 -26Z" fill="#1f6b3a" stroke="#0b3a1f"/>
      <circle cx="44" cy="38" r="6" fill="#d0121f"/><circle cx="52" cy="44" r="5.5" fill="#d0121f"/><circle cx="40" cy="47" r="5" fill="#e0242f"/><circle cx="42" cy="36" r="2" fill="#fff" opacity=".6"/>`,cls||'');

  /* ---- Halloween ---- */
  const pumpkin=(cls,face)=>svg('0 0 120 104',`<defs><radialGradient id="fPk" cx=".45" cy=".35" r=".75"><stop offset="0" stop-color="#ffb347"/><stop offset=".6" stop-color="#f07a12"/><stop offset="1" stop-color="#a84a05"/></radialGradient>
      <radialGradient id="fPg" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff3a0"/><stop offset="1" stop-color="#ffb000"/></radialGradient></defs>
      <path d="M58 22 Q56 8 66 2 L70 6 Q62 12 64 22Z" fill="#3f6b1f"/>
      <ellipse cx="34" cy="62" rx="30" ry="38" fill="url(#fPk)"/><ellipse cx="86" cy="62" rx="30" ry="38" fill="url(#fPk)"/><ellipse cx="60" cy="62" rx="32" ry="40" fill="url(#fPk)"/>
      <path d="M60 24 Q48 62 60 102 M60 24 Q72 62 60 102 M34 26 Q22 62 34 100 M86 26 Q98 62 86 100" fill="none" stroke="#a84a05" stroke-width="1.6" opacity=".55"/>
      ${face!==false?`<g class="flick"><path d="M38 50 L50 50 L44 38Z M70 50 L82 50 L76 38Z M56 64 L64 64 L60 56Z M34 76 Q60 96 86 76 L80 76 L76 82 L70 76 L64 84 L58 76 L52 84 L46 76 L40 82Z" fill="url(#fPg)"/></g>`:''}`,cls);
  const moon=()=>svg('0 0 140 140',`<defs><radialGradient id="fMg" cx=".5" cy=".5" r=".5"><stop offset=".55" stop-color="#fff2b8" stop-opacity=".55"/><stop offset="1" stop-color="#fff2b8" stop-opacity="0"/></radialGradient></defs>
      <circle cx="70" cy="70" r="70" fill="url(#fMg)"/><circle cx="70" cy="70" r="40" fill="#f6e7b0"/><circle cx="56" cy="58" r="7" fill="#e3d08f"/><circle cx="82" cy="80" r="9" fill="#e3d08f"/><circle cx="78" cy="54" r="4" fill="#e3d08f"/>`,'fest-moon fest-d');
  const spider=()=>`<div class="fest-spider fest-d">${svg('0 0 24 120',`<line x1="12" y1="0" x2="12" y2="96" stroke="rgba(230,230,230,.7)" stroke-width="1"/><g transform="translate(12 104)"><ellipse rx="6" ry="7.5" fill="#111"/><circle cy="-8" r="4" fill="#111"/>
      <path d="M-5 -2 L-12 -8 M-5 2 L-13 0 M-5 5 L-12 10 M5 -2 L12 -8 M5 2 L13 0 M5 5 L12 10" stroke="#111" stroke-width="1.6"/><circle cx="-1.6" cy="-9" r="1" fill="#f33"/><circle cx="1.6" cy="-9" r="1" fill="#f33"/></g>`)}</div>`;

  /* ---- Bonfire / New Year ---- */
  const bonfire=()=>svg('0 0 200 170',`<defs><radialGradient id="fFg" cx=".5" cy=".8" r=".7"><stop offset="0" stop-color="#ffb347" stop-opacity=".55"/><stop offset="1" stop-color="#ff7a1a" stop-opacity="0"/></radialGradient></defs>
      <ellipse cx="100" cy="120" rx="98" ry="60" fill="url(#fFg)"/>
      <g class="flame"><path d="M100 18 Q70 70 78 108 Q60 92 64 64 Q40 100 58 140 L142 140 Q160 100 136 64 Q140 92 122 108 Q130 70 100 18Z" fill="#ff6a00"/>
      <path d="M100 52 Q82 90 90 128 L112 128 Q120 90 100 52Z" fill="#ffd23b"/><path d="M100 84 Q92 108 96 132 L106 132 Q110 108 100 84Z" fill="#fff6c0"/></g>
      <path d="M30 156 L170 128 M30 128 L170 156 M60 162 L140 120" stroke="#5a3418" stroke-width="11" stroke-linecap="round"/><path d="M30 156 L170 128 M30 128 L170 156" stroke="#7a4a22" stroke-width="5" stroke-linecap="round"/>`,'fest-bonfire l');
  const balloons=(cls,cols)=>svg('0 0 130 200',(cols||['#e4ce93','#f6e2a4','#c9a961']).map((c,i)=>{ const x=30+i*35, y=50+(i%2)*24; return `<path d="M${x} ${y+40} Q${x-8} ${y+90} ${x+6} ${y+150}" stroke="#e4ce93" stroke-width="1.2" fill="none"/>
      <ellipse cx="${x}" cy="${y}" rx="24" ry="30" fill="${c}"/><ellipse cx="${x-8}" cy="${y-10}" rx="6" ry="10" fill="#fff" opacity=".45"/><path d="M${x-4} ${y+30} L${x+4} ${y+30} L${x} ${y+36}Z" fill="${c}"/>`; }).join(''),cls);

  /* ---- bunting, lanterns, diyas, grass ---- */
  function bunting(colors, opts){ opts=opts||{}; const W=1000, sw=[[0,500],[500,1000]]; let g='';
    sw.forEach(([a,b])=>{ const mid=(a+b)/2, sag=44; g+=`<path d="M${a} 6 Q${mid} ${sag+6} ${b} 6" stroke="${opts.rope||'#d8c08a'}" stroke-width="2" fill="none"/>`;
      const n=11; for(let i=1;i<n;i++){ const t=i/n, x=(1-t)*(1-t)*a+2*(1-t)*t*mid+t*t*b, y=(1-t)*(1-t)*6+2*(1-t)*t*(sag+6)+t*t*6, c=colors[(i+(a?1:0))%colors.length];
        if(opts.heart) g+=`<path transform="translate(${x.toFixed(1)} ${(y+2).toFixed(1)})" d="M0 22 C-22 8 -14 -6 -6 -2 Q0 1 0 6 Q0 1 6 -2 C14 -6 22 8 0 22Z" fill="${c}"/>`;
        else g+=`<path d="M${(x-13).toFixed(1)} ${y.toFixed(1)} L${(x+13).toFixed(1)} ${y.toFixed(1)} L${x.toFixed(1)} ${(y+34).toFixed(1)}Z" fill="${c}"/>`+(opts.cross&&c==='#ffffff'?`<path d="M${x.toFixed(1)} ${y.toFixed(1)} L${x.toFixed(1)} ${(y+30).toFixed(1)} M${(x-10).toFixed(1)} ${(y+8).toFixed(1)} L${(x+10).toFixed(1)} ${(y+8).toFixed(1)}" stroke="#cf142b" stroke-width="3"/>`:''); } });
    return `<svg class="fest-bunting fest-d" viewBox="0 0 ${W} 80" preserveAspectRatio="none" aria-hidden="true">${g}</svg>`; }
  const lantern=(x,len,delay,gold)=>`<div class="swing" style="left:${x};animation-delay:${delay}s">${svg('0 0 50 '+(len+70),`<line x1="25" y1="0" x2="25" y2="${len}" stroke="#d4a53a" stroke-width="1.5"/>
      ${gold?`<path d="M25 ${len} L14 ${len+10} L12 ${len+40} L25 ${len+52} L38 ${len+40} L36 ${len+10}Z" fill="#c9962e" stroke="#7a5a12"/><path d="M18 ${len+14} L18 ${len+38} M25 ${len+12} L25 ${len+44} M32 ${len+14} L32 ${len+38}" stroke="#fff1b0" stroke-width="2" opacity=".8"/><circle class="tw" cx="25" cy="${len+28}" r="6" fill="#fff3b0"/>`
      :`<rect x="17" y="${len}" width="16" height="5" fill="#d4a53a"/><ellipse cx="25" cy="${len+26}" rx="20" ry="22" fill="#d4141e"/><path d="M25 ${len+4} Q12 ${len+26} 25 ${len+48} M25 ${len+4} Q38 ${len+26} 25 ${len+48}" stroke="#a50d16" stroke-width="1.4" fill="none"/>
        <ellipse class="tw" cx="25" cy="${len+26}" rx="10" ry="14" fill="#ff7a3a" opacity=".55"/><rect x="17" y="${len+46}" width="16" height="5" fill="#d4a53a"/><path d="M25 ${len+51} L25 ${len+66} M22 ${len+52} L20 ${len+64} M28 ${len+52} L30 ${len+64}" stroke="#ffcc4d" stroke-width="1.5"/>`}`,'fest-lantern')}</div>`;
  const diya=()=>svg('0 0 60 50',`<g class="flame"><path d="M30 2 Q22 14 26 22 Q30 26 34 22 Q38 14 30 2Z" fill="#ffb300"/><path d="M30 10 Q26 17 28 21 Q30 23 32 21 Q34 17 30 10Z" fill="#fff3b0"/></g>
      <path d="M4 26 Q30 52 56 26 Q44 32 30 32 Q16 32 4 26Z" fill="#b5541c"/><path d="M4 26 Q16 32 30 32 Q44 32 56 26" stroke="#ffcc66" stroke-width="2" fill="none"/><path d="M14 34 L18 38 M24 37 L26 41 M34 37 L36 41 M44 34 L46 38" stroke="#ffcc66" stroke-width="2"/>`);
  const grass=(eggs)=>`<svg class="fest-grass fest-d" viewBox="0 0 1000 70" preserveAspectRatio="none" aria-hidden="true"><path d="M0 70 L0 40 ${Array.from({length:60},(_,i)=>`L${i*17+8} ${18+(i*37%22)} L${i*17+17} 40`).join(' ')} L1000 40 L1000 70Z" fill="#4f9a3a"/><path d="M0 70 L0 52 ${Array.from({length:60},(_,i)=>`L${i*17+4} ${34+(i*29%16)} L${i*17+12} 52`).join(' ')} L1000 52 L1000 70Z" fill="#3c7f2c"/></svg>`;
  const eggs=()=>svg('0 0 150 70',[['#f7c6d9',20],['#c6e4f7',56],['#f7efb0',92],['#d6c6f7',126]].map(([c,x],i)=>`<ellipse cx="${x}" cy="${38+(i%2)*6}" rx="16" ry="21" fill="${c}"/><path d="M${x-14} ${36+(i%2)*6} l7 -6 l7 6 l7 -6 l7 6" stroke="#fff" stroke-width="2.5" fill="none"/><path d="M${x-15} ${46+(i%2)*6} q15 6 30 0" stroke="${i%2?'#e58aa8':'#7ab8e0'}" stroke-width="3" fill="none"/>`).join(''),'fest-gifts r');
  function ring(colors, poppies){ let g=''; const N=poppies?12:28; for(let i=0;i<N;i++){ const a=i/N*Math.PI*2, x=110+Math.cos(a)*92, y=110+Math.sin(a)*92;
      if(poppies) g+=`<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)})"><path transform="rotate(${(a*57).toFixed(0)})" d="M0 -16 Q10 -10 6 0 Q12 6 0 12 Q-12 6 -6 0 Q-10 -10 0 -16Z" fill="#2f5a2a"/><circle r="11" fill="#c8102e"/><circle cx="-5" cy="-3" r="7" fill="#d82a36"/><circle r="3.6" fill="#111"/></g>`;
      else g+=`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="8" fill="${colors[i%colors.length]}"/><circle cx="${(x-2).toFixed(1)}" cy="${(y-2).toFixed(1)}" r="3" fill="#fff" opacity=".35"/>`; }
    return svg('0 0 220 220',g,'fest-ring fest-d'+(poppies?'':' spin-slow')); }

  /* ---- what each festival gets ---- */
  const emo=(e,cls)=>`<span class="fest-emo ${cls} bob">${e}</span>`;
  const DECO={
    christmas:{props:()=>tree()+gifts()+snowman(), extra:()=>drift(), hang:()=>bell('max(10px,4vw)',0)+bell('calc(100% - max(10px,4vw) - clamp(46px,6vw,78px))',.6), ring:hollyRing, fly:'🦌 🦌 🦌 🛷🎅 ✨', divi:'🎄', corner:()=>hollySprig('fest-corner fest-d')},
    halloween:{props:()=>pumpkin('fest-pumpkin l')+pumpkin('fest-pumpkin s l2')+pumpkin('fest-pumpkin r'), extra:()=>moon()+spider(), fly:'🦇　　🦇　🦇', divi:'🎃', corner:()=>pumpkin('fest-corner fest-d')},
    bonfire:{props:()=>bonfire()+emo('🎇','r'), divi:'🎆', corner:()=>`<span class="fest-corner fest-d fest-emo">🎇</span>`},
    newyear:{props:()=>balloons('fest-balloons l')+balloons('fest-balloons r'), hang:()=>bunting(['#e4ce93','#c9a961','#f6e2a4','#ffffff']), divi:'🥂', corner:()=>`<span class="fest-corner fest-d fest-emo">🥂</span>`},
    remembrance:{ring:()=>ring(null,true), divi:'🌺'},
    diwali:{extra:()=>`<div class="fest-diyas fest-d">${diya().repeat(innerWidth<640?4:7)}</div>`, ring:()=>ring(['#ff9933','#ffcc00','#e0245e','#ff6600','#2bb3a3']), hang:()=>bunting(['#ff9933','#ffcc00','#2f8a4f','#ff6600']), divi:'🪔', corner:()=>`<span class="fest-corner fest-d fest-emo">🪔</span>`},
    lunar:{hang:()=>lantern('6%',30,0)+lantern('20%',70,.4)+lantern('76%',60,.2)+lantern('90%',24,.7), props:()=>emo('🧧','l')+emo('🐉','r'), divi:'🏮', corner:()=>`<span class="fest-corner fest-d fest-emo">🏮</span>`},
    eid:{hang:()=>lantern('8%',40,0,true)+lantern('22%',80,.5,true)+lantern('78%',60,.2,true)+lantern('92%',30,.6,true), extra:()=>moon(), divi:'🌙', corner:()=>`<span class="fest-corner fest-d fest-emo">🌙</span>`},
    easter:{extra:()=>grass(), props:()=>eggs()+emo('🐰','l'), hang:()=>bunting(['#f7c6d9','#c6e4f7','#f7efb0','#d6c6f7','#c6f7d9']), divi:'🐣', corner:()=>`<span class="fest-corner fest-d fest-emo">🐣</span>`},
    valentine:{hang:()=>bunting(['#e0245e','#ff6b9a','#ffffff','#c8102e'],{heart:true}), props:()=>emo('🌹','l')+emo('💝','r'), divi:'💕', corner:()=>`<span class="fest-corner fest-d fest-emo">🌹</span>`},
    mothers:{hang:()=>bunting(['#f4a6c1','#ffffff','#c8a2d8','#ffd1dc']), props:()=>emo('💐','l')+emo('🌷','r'), divi:'🌸', corner:()=>`<span class="fest-corner fest-d fest-emo">💐</span>`},
    fathers:{hang:()=>bunting(['#14325a','#e4ce93','#3a5068','#ffffff']), props:()=>emo('🍺','l')+emo('🏆','r'), divi:'🍺'},
    pancake:{hang:()=>bunting(['#f2c46d','#fff3b0','#f7a440','#ffffff']), props:()=>emo('🥞','l')+emo('🍋','r'), divi:'🥞'},
    stpatrick:{hang:()=>bunting(['#169b62','#ffffff','#ff883e']), props:()=>emo('☘️','l')+emo('🍀','r'), divi:'☘️', corner:()=>`<span class="fest-corner fest-d fest-emo">☘️</span>`},
    stdavid:{hang:()=>bunting(['#00843d','#ffffff','#ffd400']), props:()=>emo('🌼','l')+emo('🐉','r'), divi:'🌼'},
    stgeorge:{hang:()=>bunting(['#ffffff','#cf142b'],{cross:true}), props:()=>emo('🌹','l')+emo('🐉','r'), divi:'🌹'},
    standrew:{hang:()=>bunting(['#0065bd','#ffffff']), props:()=>emo('🏴󠁧󠁢󠁳󠁣󠁴󠁿','r'), divi:'🏴󠁧󠁢󠁳󠁣󠁴󠁿'},
    burns:{hang:()=>bunting(['#5a2a6a','#2f6b3a','#c8102e','#e4ce93']), props:()=>emo('🥃','l'), divi:'🥃'},
    summer:{hang:()=>bunting(['#ff5a5a','#ffd23b','#3bb8ff','#4dd17a','#ff9a3b']), extra:()=>svg('0 0 120 120',`<g class="spin-slow">${Array.from({length:12},(_,i)=>`<path transform="rotate(${i*30} 60 60)" d="M60 4 L66 24 L54 24Z" fill="#ffcc33"/>`).join('')}</g><circle cx="60" cy="60" r="30" fill="#ffd23b"/>`,'fest-sun fest-d'), props:()=>emo('🍹','l')+emo('🌻','r'), divi:'☀️'}
  };
  function decorate(id, still){
    document.querySelectorAll('.fest-d').forEach(e=>e.remove());
    const html=document.documentElement; html.classList.toggle('fest-anim', !still && !matchMedia('(prefers-reduced-motion: reduce)').matches);
    const D=DECO[id]; if(!D) return;
    const hero=document.querySelector('.hero'), med=document.querySelector('.hero-medallion');
    if(hero){
      if(D.props) hero.insertAdjacentHTML('beforeend',`<div class="fest-props fest-d">${D.props()}</div>`);
      if(D.extra) hero.insertAdjacentHTML('beforeend',D.extra());
      if(D.hang){ const h=D.hang(); hero.insertAdjacentHTML('afterbegin', h.includes('fest-bunting') ? h : `<div class="fest-hang fest-d">${h}</div>`); }
      if(D.fly) hero.insertAdjacentHTML('beforeend',`<div class="fest-flyer fest-d" aria-hidden="true">${D.fly}</div>`);
    }
    if(D.ring && med) med.insertAdjacentHTML('afterbegin', D.ring());
    if(D.divi) document.querySelectorAll('.divider').forEach(d=>{ d.insertAdjacentHTML('afterbegin',`<span class="fest-divi fest-d" aria-hidden="true">${D.divi}</span>`); d.insertAdjacentHTML('beforeend',`<span class="fest-divi fest-d" aria-hidden="true">${D.divi}</span>`); });
    const form=document.querySelector('form.book-form'); if(D.corner && form) form.insertAdjacentHTML('beforeend', D.corner());
    document.querySelectorAll('.fest-props, .fest-hang').forEach(el=>el.setAttribute('aria-hidden','true'));
  }

  let shown=null;
  function apply(o){
    o=o||{}; const f=today(o), html=document.documentElement;
    const id=f?f.id:null, key=id+'|'+(o.msgs&&id?o.msgs[id]||'':'')+'|'+!!o.still;
    if(key===shown) return f; shown=key;
    document.querySelectorAll('.fest-ribbon,.fest-lights,.fest-web,.fest-poppy,.fest-d').forEach(e=>e.remove()); stopCanvas(); html.classList.remove('fest-anim');
    html.classList.remove('fest'); if(html.dataset.fest) delete html.dataset.fest;
    if(!f) return null;
    let dismissed=false; try{ dismissed=sessionStorage.getItem('bh_fest_x')===f.id; }catch(e){}
    const th=THEME[f.id]||{}; html.classList.add('fest'); html.dataset.fest=f.id;
    html.style.setProperty('--fest-accent',th.accent||'#e4ce93'); html.style.setProperty('--fest-glow',th.glow||'transparent');
    const header=document.querySelector('header'), hero=document.querySelector('.hero');
    if(!dismissed && header){ const r=document.createElement('div'); r.className='fest-ribbon'+(th.dark?' dark':''); r.style.background=th.ribbon||'#1a0f07'; r.setAttribute('role','note');
      const text=(o.msgs&&o.msgs[f.id])||f.msg; r.innerHTML=`<span class="fi" aria-hidden="true">${f.icon}</span><span></span><span class="fi" aria-hidden="true">${f.icon}</span><button class="fx" type="button" aria-label="Hide">×</button>`;
      r.children[1].textContent=text; r.querySelector('.fx').onclick=()=>{ r.remove(); try{ sessionStorage.setItem('bh_fest_x',f.id); }catch(e){} };
      header.insertAdjacentElement('afterend', r); }
    if(th.deco==='lights' && header){ const l=document.createElement('div'); l.className='fest-lights'; l.setAttribute('aria-hidden','true'); l.innerHTML='<i></i>'.repeat(Math.min(40,Math.round(innerWidth/34))); header.appendChild(l); }
    if(th.deco==='web' && hero){ hero.insertAdjacentHTML('afterbegin',`<div class="fest-web l" aria-hidden="true">${WEB}</div><div class="fest-web r" aria-hidden="true">${WEB}</div>`); }
    if(th.deco==='poppy' && hero){ const m=hero.querySelector('.hero-medallion'); if(m) m.insertAdjacentHTML('beforebegin',POPPY); }
    decorate(f.id, !!o.still);
    if(!o.still && !matchMedia('(prefers-reduced-motion: reduce)').matches) startCanvas(th);
    return f;
  }
  window.BHFestivals={list:FESTIVALS, today, apply, datesFor, next, until, fmt:d=>fmt(d)};
})();
