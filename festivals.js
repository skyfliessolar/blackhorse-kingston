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
    {id:'christmas', name:'Christmas', icon:'🎄', when:'1–26 December', msg:'Merry Christmas from The Black Horse — book your festive table early!', range:y=>[D(y,12,1),D(y,12,26)]},
    {id:'newyear', name:'New Year', icon:'🎆', when:'27 Dec – 2 Jan', msg:'Happy New Year! Raise a glass with us at The Black Horse.', range:y=>[D(y,12,27),D(y+1,1,2)], prev:true},
    {id:'remembrance', name:'Remembrance', icon:'🌺', when:'Remembrance Sunday & 11 November', msg:'We will remember them.', range:y=>{ const s=nthSunday(y,11,2), d=D(y,11,11); return [add(d<s?d:s,-1), d>s?d:s]; }, quiet:true},
    {id:'bonfire', name:'Bonfire Night', icon:'🎇', when:'1–5 November', msg:'Remember, remember the fifth of November — warm up by our fire pit!', range:y=>[D(y,11,1),D(y,11,5)]},
    {id:'diwali', name:'Diwali', icon:'🪔', when:'Festival of Lights (date changes)', msg:'Happy Diwali — wishing you light, joy and good food!', range:y=>{ const d=fromTable(DIWALI,y); return d?[add(d,-2),add(d,1)]:null; }},
    {id:'halloween', name:'Halloween', icon:'🎃', when:'24–31 October', msg:'Happy Halloween! Spooky specials all week at The Black Horse.', range:y=>[D(y,10,24),D(y,10,31)]},
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
    {id:'standrew', name:"St Andrew's Day", icon:'🏴', when:'30 November', msg:"Happy St Andrew's Day!", range:y=>[D(y,11,30),D(y,11,30)]},
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
        else if(p.e){ ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(Math.sin(p.rot)*.5); ctx.globalAlpha=.85; ctx.font=`${Math.round(14+p.s*10)}px serif`; ctx.textAlign='center'; ctx.fillText(p.e,0,0); ctx.restore(); } }
      if(fireworks){ if(Math.random()<dt*.9) { const x=W*(.15+Math.random()*.7), y=H*(.12+Math.random()*.35), hue=Math.floor(Math.random()*360); for(let i=0;i<46;i++){ const a=i/46*6.283, sp=60+Math.random()*90; bursts.push({x,y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,l:1,h:hue}); } }
        for(const b of bursts){ b.vy+=60*dt; b.x+=b.vx*dt; b.y+=b.vy*dt; b.vx*=.985; b.vy*=.985; b.l-=dt*.75; if(b.l>0){ ctx.fillStyle=`hsla(${b.h},90%,${60+b.l*20}%,${b.l})`; ctx.beginPath(); ctx.arc(b.x,b.y,1.6,0,7); ctx.fill(); } }
        bursts=bursts.filter(b=>b.l>0); }
    };
    raf=requestAnimationFrame(loop);
  }
  function stopCanvas(){ running=false; cancelAnimationFrame(raf); if(cv){ removeEventListener('resize',cv._fit); cv.remove(); cv=null; } parts=[]; bursts=[]; }

  /* ---------- put it on the page ---------- */
  let shown=null;
  function apply(o){
    o=o||{}; const f=today(o), html=document.documentElement;
    const id=f?f.id:null, key=id+'|'+(o.msgs&&id?o.msgs[id]||'':'')+'|'+!!o.still;
    if(key===shown) return f; shown=key;
    document.querySelectorAll('.fest-ribbon,.fest-lights,.fest-web,.fest-poppy').forEach(e=>e.remove()); stopCanvas();
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
    if(!o.still && !matchMedia('(prefers-reduced-motion: reduce)').matches) startCanvas(th);
    return f;
  }
  window.BHFestivals={list:FESTIVALS, today, apply, datesFor};
})();
