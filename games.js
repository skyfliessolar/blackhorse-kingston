/* The Black Horse — more games: Spin & Win, Perfect Pint, Scratch the Beer Mat.
   Loaded only when the games section is switched on. Wok Toss lives in index.html.
   Which games show on which day, and each game's on/off switch, come from the admin (site/promo). */
(function(){
  'use strict';
  const $=id=>document.getElementById(id);
  const box=$('gameBox'), copy=document.querySelector('#play .play-copy'), grid=document.querySelector('#play .play-grid');
  if(!box||!copy||!grid||window.__bhGames) return; window.__bhGames=true;
  const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const store={ get(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } }, set(k,v){ try{ localStorage.setItem(k,v); }catch(e){} } };
  const promo=()=>window.bhPromo||{};
  const what=()=>promo().appliesTo==='bill'?'your bill':'food';
  const londonDay=()=>{ const p=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit',weekday:'short'}).formatToParts(new Date()).map(x=>[x.type,x.value]));
    return {iso:`${p.year}-${p.month}-${p.day}`, dow:['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].indexOf(p.weekday)}; };
  const playedToday=g=>store.get('bh_g_'+g)===londonDay().iso;
  const markPlayed=g=>store.set('bh_g_'+g, londonDay().iso);

  /* ---------- game list, defaults and the day-by-day plan ---------- */
  const GAMES={
    wok:    {icon:'🔥', name:'Wok Toss', tag:'Catch & cook', daily:false},
    spin:   {icon:'🎡', name:'Spin & Win', tag:'One spin a day', daily:true},
    pour:   {icon:'🍺', name:'Perfect Pint', tag:'Three pours a day', daily:true},
    scratch:{icon:'🪙', name:'Scratch the Mat', tag:'One card a day', daily:true}
  };
  const DEF_DAYS={0:['wok','spin','pour','scratch'],1:['wok'],2:['pour'],3:['scratch'],4:['spin'],5:['spin','wok'],6:['wok','spin','pour','scratch']};
  const DEF_WHEEL=[{label:'25% OFF',percent:25},{label:'TRY AGAIN',percent:0},{label:'10% OFF',percent:10},{label:'15% OFF',percent:15},{label:'TRY AGAIN',percent:0},{label:'20% OFF',percent:20},{label:'10% OFF',percent:10},{label:'TRY AGAIN',percent:0}];
  function todays(){
    const p=promo(), on=Object.keys(GAMES).filter(g=>(p.games||{})[g]!==false);
    const plan=(p.days||DEF_DAYS)[londonDay().dow];
    const list=(plan||on).filter(g=>on.includes(g));
    return list.length ? list : on.slice(0,1);
  }

  /* ---------- look ---------- */
  const st=document.createElement('style');
  st.textContent=`
  .g-tabs{grid-column:1/-1;display:flex;gap:10px;flex-wrap:wrap;justify-content:center;margin:0 0 6px;}
  .g-tabs:empty{display:none;}
  .g-tabs button{display:flex;align-items:center;gap:10px;padding:10px 16px 10px 12px;border-radius:12px;cursor:pointer;color:#f4e6c6;font-family:'Oswald',sans-serif;letter-spacing:.06em;text-transform:uppercase;font-size:13px;text-align:left;
    border:1px solid #9c7431;background:linear-gradient(180deg,#3d2614,#24160b);box-shadow:inset 0 1px 0 rgba(255,220,150,.15),0 3px 0 #140b05;transition:transform .12s;}
  .g-tabs button .i{font-size:24px;line-height:1;}
  .g-tabs button small{display:block;font-size:10.5px;letter-spacing:.08em;opacity:.7;text-transform:none;}
  .g-tabs button:active{transform:translateY(2px);}
  .g-tabs button.on{color:#1d1309;border-color:#6b4a1c;background:linear-gradient(180deg,#f6e2a4,#d6ad5a 50%,#b98a3b);box-shadow:0 0 18px rgba(228,206,147,.45),0 3px 0 #5b3e16;}
  .g-tabs .today{grid-column:1/-1;width:100%;text-align:center;font-family:'Oswald',sans-serif;letter-spacing:.24em;text-transform:uppercase;font-size:11.5px;color:var(--gold);margin-bottom:-2px;}
  .g2{position:absolute;inset:0;z-index:3;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;background:#120c07;}
  .g2[hidden]{display:none;}
  .g2 canvas{position:absolute;inset:0;width:100%;height:100%;touch-action:none;}
  .g2 .g2-ui{position:relative;z-index:2;display:flex;flex-direction:column;align-items:center;gap:8px;padding:0 16px 18px;width:100%;text-align:center;pointer-events:none;}
  .g2 .g2-ui > *{pointer-events:auto;}
  .g2 .g2-msg{font-family:'Oswald',sans-serif;letter-spacing:.08em;text-transform:uppercase;font-size:14px;color:#f4e6c6;min-height:20px;text-shadow:0 2px 8px #000;}
  .g2 .g2-msg.bad{color:#f0b3a5;}
  .g2 .btn{min-width:200px;justify-content:center;}
  .g2 .tries{display:flex;gap:6px;justify-content:center;font-size:20px;}
  .g2 .tries span.used{opacity:.25;filter:grayscale(1);}`;
  document.head.appendChild(st);

  /* ---------- markup ---------- */
  const wokCopy=copy.innerHTML, claimP=($('gClaimBox').querySelector('p')||{}).innerHTML;
  grid.insertAdjacentHTML('afterbegin','<div class="g-tabs" id="gTabs" role="tablist" aria-label="Choose a game"></div>');
  box.insertAdjacentHTML('beforeend','<div class="g2" id="g2" hidden><canvas id="g2c" width="400" height="560"></canvas><div class="g2-ui"><div class="tries" id="g2Tries"></div><div class="g2-msg" id="g2Msg" role="status"></div><button class="btn btn-gold" id="g2Btn" type="button"></button></div></div>');
  const g2=$('g2'), cv=$('g2c'), ctx=cv.getContext('2d'), W=400, H=560;
  const dpr=Math.min(2,window.devicePixelRatio||1); cv.width=W*dpr; cv.height=H*dpr; ctx.scale(dpr,dpr);
  let cur='wok', stop=null;
  const msg=(t,bad)=>{ const m=$('g2Msg'); m.textContent=t||''; m.classList.toggle('bad',!!bad); };
  const btn=(t,fn,dis)=>{ const b=$('g2Btn'); b.textContent=t; b.onclick=fn; b.disabled=!!dis; b.hidden=!t; };

  const COPY={
    spin:()=>`<span class="eyebrow">Play &amp; win</span><h2>Spin &amp; Win</h2><p>One spin of the Black Horse wheel every day. Land on a discount and it's yours — a real QR code to show at the till.</p>
      <ul class="play-steps"><li><span class="k">🎡</span><span>Tap <b>Spin the wheel</b>.</span></li><li><span class="k">🎟️</span><span>Win up to <b class="g-max">25% off</b> ${what()}.</span></li><li><span class="k">📅</span><span>One spin a day — come back tomorrow for another go.</span></li></ul>`,
    pour:()=>`<span class="eyebrow">Play &amp; win</span><h2>Perfect Pint</h2><p>Think you can pull a proper pint? Hold to pour and let go when the head sits right between the gold lines.</p>
      <ul class="play-steps"><li><span class="k">👆</span><span>Press and hold to pour, release to stop.</span></li><li><span class="k">🎯</span><span>Stop with the top of the head between the gold lines.</span></li><li><span class="k">🍺</span><span>Three pours a day · perfect pint wins <b class="g-prize-txt"></b>.</span></li></ul>`,
    scratch:()=>`<span class="eyebrow">Play &amp; win</span><h2>Scratch the Mat</h2><p>A beer mat with a secret. Scratch off the gold foil — find three matching drinks and you win.</p>
      <ul class="play-steps"><li><span class="k">🪙</span><span>Rub the foil with your finger or mouse.</span></li><li><span class="k">🍺</span><span>Three the same wins <b class="g-prize-txt"></b>.</span></li><li><span class="k">📅</span><span>One card a day.</span></li></ul>`
  };

  function renderTabs(){
    const list=todays(), t=$('gTabs');
    if(!list.includes(cur)) cur=list[0];
    t.innerHTML = list.length>1 ? `<div class="today">Today's games</div>`+list.map(g=>`<button type="button" role="tab" data-g="${g}" aria-selected="${g===cur}" class="${g===cur?'on':''}"><span class="i">${GAMES[g].icon}</span><span>${GAMES[g].name}<small>${GAMES[g].tag}</small></span></button>`).join('') : '';
    show(cur, true);
  }
  $('gTabs').addEventListener('click',e=>{ const b=e.target.closest('[data-g]'); if(b) show(b.dataset.g); });

  function show(g, quiet){
    if(stop){ stop(); stop=null; }
    cur=g; document.querySelectorAll('#gTabs [data-g]').forEach(b=>{ b.classList.toggle('on',b.dataset.g===g); b.setAttribute('aria-selected',b.dataset.g===g); });
    ['gEnd','gVoucher'].forEach(id=>$(id).hidden=true);
    if(g==='wok'){ copy.innerHTML=wokCopy; const cp=$('gClaimBox').querySelector('p'); if(cp&&claimP) cp.innerHTML=claimP; g2.hidden=true; $('gStart').hidden=false; window.__bhPrize=null; $('gAgain').hidden=false; window.dispatchEvent(new Event('bh-promo')); return; }
    copy.innerHTML=COPY[g](); window.dispatchEvent(new Event('bh-promo'));
    const mx=Math.max(...wheel().map(s=>s.percent)); copy.querySelectorAll('.g-max').forEach(el=>el.textContent=mx+'% off');
    $('gStart').hidden=true; g2.hidden=false; msg(''); $('g2Tries').innerHTML='';
    stop=({spin:Spin, pour:Pour, scratch:Scratch})[g]();
    if(!quiet && innerWidth<900) box.scrollIntoView({behavior:reduce?'auto':'smooth', block:'center'});
  }

  /* ---------- a win: hand over to the same "get my QR code" screen the Wok Toss uses ---------- */
  function win(percent, game, line){
    window.__bhPrize={percent, game}; window.__bhLastScore=0;
    $('gEndEyebrow').textContent='Winner!'; $('gScore').textContent=percent+'%'; $('gEndLine').textContent='off '+what()+(line?' · '+line:'');
    const p=$('gClaimBox').querySelector('p'); if(p) p.innerHTML=`You've won <b>${percent}% off ${what()}</b>.`;
    $('gAgain').hidden=true; g2.hidden=true; $('gEnd').hidden=false; $('gClaim').focus({preventScroll:true});
  }

  /* ---------- drawing helpers ---------- */
  function backdrop(){
    const g=ctx.createRadialGradient(W/2,H*.38,20,W/2,H*.4,H*.75); g.addColorStop(0,'#3a2412'); g.addColorStop(.6,'#1a0f07'); g.addColorStop(1,'#0b0704');
    ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
    ctx.globalAlpha=.08; ctx.fillStyle='#e4ce93'; for(let i=0;i<40;i++){ const x=(i*97)%W, y=(i*53)%H; ctx.fillRect(x,y,1,1); } ctx.globalAlpha=1;
  }
  const raf=f=>requestAnimationFrame(f);

  /* ================= SPIN & WIN ================= */
  function wheel(){ const w=(promo().wheel||DEF_WHEEL).filter(s=>s&&typeof s.percent==='number'); return w.length>=2?w:DEF_WHEEL; }
  function Spin(){
    const segs=wheel(), N=segs.length, R=168, cx=W/2, cy=232; let ang=0, spinning=false, alive=true, glow=0;
    const COLS=[['#7b1e1e','#4e0f12'],['#e2bd6a','#a77b2c'],['#2f4a2f','#1c2e1c'],['#e2bd6a','#a77b2c']];
    function draw(){
      backdrop(); ctx.save(); ctx.translate(cx,cy);
      ctx.beginPath(); ctx.arc(0,0,R+18,0,7); const rim=ctx.createLinearGradient(-R,-R,R,R); rim.addColorStop(0,'#f6e2a4'); rim.addColorStop(.5,'#9c7230'); rim.addColorStop(1,'#e7c676'); ctx.fillStyle=rim; ctx.fill();
      for(let i=0;i<24;i++){ const a=i/24*6.283+(spinning?0:Math.sin(Date.now()/300+i)*0); ctx.beginPath(); ctx.arc(Math.cos(a)*(R+9),Math.sin(a)*(R+9),3.2,0,7); ctx.fillStyle=(i+Math.floor(Date.now()/(spinning?90:400)))%2?'#fff6d6':'#7a5622'; ctx.fill(); }
      ctx.rotate(ang);
      for(let i=0;i<N;i++){ const a0=i/N*6.283-Math.PI/2-Math.PI/N, a1=a0+6.283/N, s=segs[i], c= s.percent<=0 ? COLS[2] : (i%2 ? COLS[1] : COLS[0]);
        const g=ctx.createRadialGradient(0,0,10,0,0,R); g.addColorStop(0,c[0]); g.addColorStop(1,c[1]);
        ctx.beginPath(); ctx.moveTo(0,0); ctx.arc(0,0,R,a0,a1); ctx.closePath(); ctx.fillStyle=g; ctx.fill(); ctx.strokeStyle='rgba(30,18,6,.7)'; ctx.lineWidth=2; ctx.stroke();
        ctx.save(); ctx.rotate((a0+a1)/2); ctx.translate(R*.62,0); ctx.rotate(Math.PI/2); ctx.textAlign='center'; ctx.textBaseline='middle';
        const light=c[0]==='#e2bd6a'; ctx.fillStyle=light?'#2a1608':'#fbecc8'; ctx.font=`700 ${N>8?15:17}px Oswald, sans-serif`;
        const parts=String(s.label||'').split(' '); parts.forEach((t,k)=>ctx.fillText(t,0,(k-(parts.length-1)/2)*18)); ctx.restore(); }
      ctx.beginPath(); ctx.arc(0,0,34,0,7); const hub=ctx.createRadialGradient(-8,-8,4,0,0,34); hub.addColorStop(0,'#fff5cf'); hub.addColorStop(.5,'#d6ad5a'); hub.addColorStop(1,'#6e4c18'); ctx.fillStyle=hub; ctx.fill();
      ctx.restore();
      ctx.save(); ctx.translate(cx,cy); ctx.fillStyle='#1d1309'; ctx.font='700 13px Cinzel, serif'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText('BLACK',0,-6); ctx.fillText('HORSE',0,9); ctx.restore();
      // pointer
      ctx.save(); ctx.translate(cx,cy-R-14); ctx.beginPath(); ctx.moveTo(-16,-14); ctx.lineTo(16,-14); ctx.lineTo(0,22); ctx.closePath();
      const pg=ctx.createLinearGradient(-16,0,16,0); pg.addColorStop(0,'#9c7230'); pg.addColorStop(.5,'#fff1c2'); pg.addColorStop(1,'#9c7230'); ctx.fillStyle=pg; ctx.shadowColor='rgba(0,0,0,.6)'; ctx.shadowBlur=8; ctx.fill(); ctx.restore();
      if(glow>0){ ctx.save(); ctx.globalCompositeOperation='lighter'; ctx.globalAlpha=glow*.5; const gg=ctx.createRadialGradient(cx,cy-R,0,cx,cy-R,90); gg.addColorStop(0,'rgba(255,220,140,.9)'); gg.addColorStop(1,'rgba(255,220,140,0)'); ctx.fillStyle=gg; ctx.fillRect(0,0,W,H); ctx.restore(); glow=Math.max(0,glow-.02); }
    }
    function idle(){ if(!alive) return; if(!spinning){ ang+=.002; draw(); } raf(idle); } idle();
    const done=playedToday('spin');
    if(done){ msg("You've had today's spin — come back tomorrow!"); btn('',null); } else { msg(''); btn('🎡 Spin the wheel', go); }
    function go(){
      if(spinning||playedToday('spin')) return; spinning=true; btn('Spinning…',null,true); msg('');
      const pick=Math.floor(Math.random()*N), turns=5+Math.floor(Math.random()*2), TAU=Math.PI*2;
      // segment i sits under the top pointer when the wheel's angle is -(i/N)·2π; add a little randomness inside the segment
      const target=-(pick/N)*TAU + (Math.random()-.5)*(TAU/N)*.6;
      const startA=ang, total=turns*TAU + ((((target-startA)%TAU)+TAU)%TAU);
      const T=reduce?600:4600, t0=performance.now();
      (function step(now){ if(!alive) return; const k=Math.min(1,(now-t0)/T), e=1-Math.pow(1-k,4); ang=startA+total*e; draw(); if(k<1) return raf(step);
        spinning=false; markPlayed('spin'); glow=1; const s=segs[pick];
        if(s.percent>0){ msg('🎉 '+s.label+'!'); setTimeout(()=>alive&&win(s.percent,'spin','Spin & Win'),900); }
        else{ msg('So close! Come back tomorrow for another spin.',true); btn('',null); }
      })(t0);
    }
    return ()=>{ alive=false; };
  }

  /* ================= PERFECT PINT ================= */
  function Pour(){
    let alive=true, level=0, foam=0, pouring=false, settled=true, tries=3, band=0, speed=0, wobble=0, bubbles=[];
    const used=()=>Number(store.get('bh_g_pour_n_'+londonDay().iso)||0);
    tries=Math.max(0,3-used());
    const gx=W/2, top=110, bottom=470, wTop=118, wBot=84;          // glass shape
    const newBand=()=>{ band=.74+Math.random()*.14; };
    newBand();
    const lerp=(a,b,t)=>a+(b-a)*t, halfW=y=>lerp(wBot,wTop,(bottom-y)/(bottom-top));
    function drawGlass(){
      backdrop();
      // bar top
      ctx.fillStyle='#2a1a0c'; ctx.fillRect(0,bottom+6,W,H-bottom); ctx.fillStyle='rgba(255,220,150,.12)'; ctx.fillRect(0,bottom+6,W,2);
      // tap
      ctx.save(); ctx.translate(gx-6,40); const tg=ctx.createLinearGradient(-20,0,20,0); tg.addColorStop(0,'#7a5622'); tg.addColorStop(.5,'#fff1c2'); tg.addColorStop(1,'#7a5622');
      ctx.fillStyle=tg; ctx.fillRect(-34,-40,58,16); ctx.fillRect(14,-26,10,30); ctx.beginPath(); ctx.ellipse(19,6,9,5,0,0,7); ctx.fill(); ctx.restore();
      if(pouring){ const sw=6+Math.sin(Date.now()/40)*1.2, ys=50, ye=lerp(bottom,top,level)-(foam*40); const sg=ctx.createLinearGradient(gx+8,0,gx+20,0); sg.addColorStop(0,'#c77818'); sg.addColorStop(.5,'#ffd27a'); sg.addColorStop(1,'#a85d0e');
        ctx.fillStyle=sg; ctx.beginPath(); ctx.moveTo(gx+13-sw/2,ys); ctx.lineTo(gx+13+sw/2,ys); ctx.lineTo(gx+13+sw/2+1,ye); ctx.lineTo(gx+13-sw/2-1,ye); ctx.fill(); }
      // beer
      const yBeer=lerp(bottom,top,level), yFoam=yBeer - foam*42*(1+Math.sin(wobble)*.04);
      if(level>0){ ctx.save(); ctx.beginPath(); ctx.moveTo(gx-halfW(bottom)+6,bottom-6); ctx.lineTo(gx+halfW(bottom)-6,bottom-6); ctx.lineTo(gx+halfW(yBeer)-6,yBeer); ctx.lineTo(gx-halfW(yBeer)+6,yBeer); ctx.closePath();
        const bg=ctx.createLinearGradient(gx-wTop,0,gx+wTop,0); bg.addColorStop(0,'#8a4a08'); bg.addColorStop(.35,'#e39a2c'); bg.addColorStop(.6,'#f2b545'); bg.addColorStop(1,'#7a3e05'); ctx.fillStyle=bg; ctx.fill(); ctx.clip();
        for(const b of bubbles){ ctx.fillStyle='rgba(255,240,200,.55)'; ctx.beginPath(); ctx.arc(b.x,b.y,b.r,0,7); ctx.fill(); } ctx.restore(); }
      if(foam>0){ ctx.save(); const fy=yFoam, by=yBeer; ctx.beginPath(); ctx.moveTo(gx-halfW(by)+6,by); ctx.lineTo(gx+halfW(by)-6,by); ctx.lineTo(gx+halfW(fy)-6,fy+6);
        for(let i=8;i>=0;i--){ const x=gx-halfW(fy)+6+(halfW(fy)*2-12)*i/8; ctx.quadraticCurveTo(x+6,fy-6+Math.sin(i*1.7+wobble)*2,x,fy+2); } ctx.closePath();
        const fg=ctx.createLinearGradient(0,fy,0,by); fg.addColorStop(0,'#fffaf0'); fg.addColorStop(1,'#efdcb6'); ctx.fillStyle=fg; ctx.fill(); ctx.restore(); }
      // gold target lines
      const yb=lerp(bottom,top,band), y2=lerp(bottom,top,band+.05);
      ctx.save(); ctx.setLineDash([8,6]); ctx.lineWidth=2; ctx.strokeStyle='#ffd77a'; ctx.shadowColor='rgba(255,210,120,.8)'; ctx.shadowBlur=8;
      [yb,y2].forEach(y=>{ ctx.beginPath(); ctx.moveTo(gx-halfW(y)-22,y); ctx.lineTo(gx+halfW(y)+22,y); ctx.stroke(); }); ctx.restore();
      ctx.fillStyle='#ffd77a'; ctx.font='600 11px Oswald, sans-serif'; ctx.textAlign='left'; ctx.fillText('PERFECT',gx+halfW(y2)+26,(yb+y2)/2+4);
      // glass
      ctx.save(); ctx.lineWidth=3; ctx.strokeStyle='rgba(235,245,255,.55)'; ctx.beginPath(); ctx.moveTo(gx-wTop,top); ctx.lineTo(gx-wBot,bottom); ctx.lineTo(gx+wBot,bottom); ctx.lineTo(gx+wTop,top); ctx.stroke();
      ctx.fillStyle='rgba(235,245,255,.08)'; ctx.fillRect(gx-wBot,bottom-8,wBot*2,8);
      ctx.strokeStyle='rgba(255,255,255,.35)'; ctx.lineWidth=5; ctx.beginPath(); ctx.moveTo(gx-wTop+16,top+20); ctx.lineTo(gx-wBot+12,bottom-30); ctx.stroke(); ctx.restore();
      $('g2Tries').innerHTML=[0,1,2].map(i=>`<span class="${i<3-tries?'used':''}">🍺</span>`).join('');
    }
    let last=performance.now();
    function loop(now){ if(!alive) return; const dt=Math.min(.05,(now-last)/1000); last=now; wobble+=dt*6;
      if(pouring){ speed=Math.min(.34, speed+dt*.22); level=Math.min(1.08, level+dt*speed); foam=Math.min(1, foam+dt*.9);
        if(Math.random()<.6) bubbles.push({x:gx-60+Math.random()*120, y:bottom-10, r:.8+Math.random()*1.6, v:30+Math.random()*60}); }
      else if(!settled){ foam=Math.max(.45, foam-dt*.35); }
      bubbles.forEach(b=>{ b.y-=b.v*dt; }); bubbles=bubbles.filter(b=>b.y>lerp(bottom,top,level));
      drawGlass(); raf(loop); }
    raf(loop);
    const headTop=()=>level + foam*42/(bottom-top);
    function start(e){ if(e) e.preventDefault(); if(!tries||pouring||!settled) return; pouring=true; settled=false; speed=.06; msg('Pouring… let go at the gold lines'); btn('Let go to stop',null); }
    function end(){ if(!pouring) return; pouring=false; const h=headTop(); tries--; store.set('bh_g_pour_n_'+londonDay().iso, String(3-tries));
      setTimeout(()=>{ if(!alive) return; settled=true; const ok=h>=band-.005 && h<=band+.055;
        if(ok){ markPlayed('pour'); msg('🍺 Perfect pint!'); setTimeout(()=>alive&&win(Number(promo().percent)||25,'pour','Perfect Pint'),800); return; }
        msg(h>1.02?'Overflowing! Too much.':h<band?'A bit short.':'Just over the line.', true);
        if(tries>0){ btn('🍺 Pour another ('+tries+' left)', reset); } else { markPlayed('pour'); btn('',null); msg('No more pours today — come back tomorrow!',true); } }, 600); }
    function reset(){ level=0; foam=0; speed=0; bubbles=[]; newBand(); msg(''); ready(); }
    function ready(){ btn('👆 Press & hold to pour', null); const b=$('g2Btn'); b.onpointerdown=start; }
    const b=$('g2Btn'); const up=()=>end();
    addEventListener('pointerup',up); addEventListener('pointercancel',up); cv.addEventListener('pointerdown',start);
    const key=e=>{ if(e.code==='Space'&&!e.repeat&&!g2.hidden){ e.preventDefault(); start(); } }, keyUp=e=>{ if(e.code==='Space') end(); };
    addEventListener('keydown',key); addEventListener('keyup',keyUp);
    if(!tries || playedToday('pour')){ tries=0; msg("You've used today's pours — come back tomorrow!"); btn('',null); } else ready();
    return ()=>{ alive=false; b.onpointerdown=null; removeEventListener('pointerup',up); removeEventListener('pointercancel',up); cv.removeEventListener('pointerdown',start); removeEventListener('keydown',key); removeEventListener('keyup',keyUp); };
  }

  /* ================= SCRATCH THE MAT ================= */
  function Scratch(){
    let alive=true, done=false, scratched=0;
    const ICONS=['🍺','🍷','🥃','🍤','🌶️','⭐'];
    const odds=Math.max(0,Math.min(1,Number(promo().scratchOdds ?? .4)));
    const key='bh_g_scratch_card_'+londonDay().iso;
    let card=null; try{ card=JSON.parse(store.get(key)||'null'); }catch(e){}
    if(!card){ const winning=Math.random()<odds, sym=ICONS[Math.floor(Math.random()*ICONS.length)], cells=[];
      if(winning){ cells.push(sym,sym,sym); const rest=ICONS.filter(x=>x!==sym); while(cells.length<6){ cells.push(rest[Math.floor(Math.random()*rest.length)]); } }
      else{ const pool=ICONS.flatMap(x=>[x,x]); for(let i=pool.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [pool[i],pool[j]]=[pool[j],pool[i]]; } cells.push(...pool.slice(0,6)); }
      const counts={}; cells.forEach(c=>counts[c]=(counts[c]||0)+1);
      if(!winning && Object.values(counts).some(n=>n>=3)) cells.splice(0,6,'🍺','🍷','🥃','🍤','🌶️','⭐');
      for(let i=cells.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [cells[i],cells[j]]=[cells[j],cells[i]]; }
      card={cells, win:winning, sym}; store.set(key, JSON.stringify(card)); }
    const cx=W/2, cy=250, R=170;
    const foil=document.createElement('canvas'); foil.width=W*dpr; foil.height=H*dpr; const f=foil.getContext('2d'); f.scale(dpr,dpr);
    const spots=[[-70,-60],[0,-60],[70,-60],[-70,30],[0,30],[70,30]].map(([x,y])=>[cx+x,cy+y+6]);
    function drawMat(){
      backdrop();
      ctx.save(); ctx.shadowColor='rgba(0,0,0,.6)'; ctx.shadowBlur=24; ctx.shadowOffsetY=8; ctx.beginPath(); ctx.arc(cx,cy,R,0,7);
      const mg=ctx.createRadialGradient(cx-40,cy-50,10,cx,cy,R); mg.addColorStop(0,'#f8eed6'); mg.addColorStop(.75,'#e6d1a4'); mg.addColorStop(1,'#c9a96d'); ctx.fillStyle=mg; ctx.fill(); ctx.restore();
      ctx.save(); ctx.strokeStyle='#7b1e1e'; ctx.lineWidth=3; ctx.setLineDash([4,5]); ctx.beginPath(); ctx.arc(cx,cy,R-12,0,7); ctx.stroke(); ctx.restore();
      ctx.fillStyle='#7b1e1e'; ctx.textAlign='center'; ctx.font='700 15px Cinzel, serif'; ctx.fillText('THE BLACK HORSE',cx,cy-R+40); ctx.font='600 11px Oswald, sans-serif'; ctx.fillText('FIND THREE THE SAME',cx,cy+R-30);
      ctx.font='38px serif'; ctx.textBaseline='middle'; card.cells.forEach((c,i)=>ctx.fillText(c,spots[i][0],spots[i][1])); ctx.textBaseline='alphabetic';
      ctx.drawImage(foil,0,0,W,H);
    }
    function paintFoil(){
      f.clearRect(0,0,W,H); spots.forEach(([x,y])=>{ f.save(); f.beginPath(); f.arc(x,y,32,0,7);
        const g=f.createLinearGradient(x-32,y-32,x+32,y+32); g.addColorStop(0,'#f6e2a4'); g.addColorStop(.3,'#b98a3b'); g.addColorStop(.55,'#fff1c2'); g.addColorStop(1,'#8d6526'); f.fillStyle=g; f.fill();
        f.globalAlpha=.25; f.strokeStyle='#5a3d15'; for(let k=-30;k<30;k+=5){ f.beginPath(); f.moveTo(x+k,y-32); f.lineTo(x+k+20,y+32); f.stroke(); } f.restore();
        f.fillStyle='rgba(60,36,10,.55)'; f.font='700 12px Oswald, sans-serif'; f.textAlign='center'; f.fillText('SCRATCH',x,y+4); }); }
    const total=spots.length*Math.PI*32*32;
    function scratchAt(x,y){ f.save(); f.globalCompositeOperation='destination-out'; f.beginPath(); f.arc(x,y,17,0,7); f.fill(); f.restore(); scratched+=Math.PI*17*17*.35; drawMat();
      if(!done && scratched>total*.62) finish(); }
    function finish(){ done=true; f.clearRect(0,0,W,H); drawMat(); markPlayed('scratch');
      if(card.win){ ctx.save(); ctx.strokeStyle='#ffd77a'; ctx.lineWidth=4; ctx.shadowColor='#ffd77a'; ctx.shadowBlur=14; card.cells.forEach((c,i)=>{ if(c===card.sym){ ctx.beginPath(); ctx.arc(spots[i][0],spots[i][1],32,0,7); ctx.stroke(); } }); ctx.restore();
        msg('🎉 Three '+card.sym+' — you win!'); setTimeout(()=>alive&&win(Number(promo().percent)||25,'scratch','Scratch the Mat'),1000); }
      else{ msg('No match this time — a new card tomorrow!',true); }
      btn('',null); }
    const pos=e=>{ const r=cv.getBoundingClientRect(); return [(e.clientX-r.left)*W/r.width,(e.clientY-r.top)*H/r.height]; };
    let down=false, lastP=null;
    const pd=e=>{ if(done) return; down=true; cv.setPointerCapture&&cv.setPointerCapture(e.pointerId); lastP=pos(e); scratchAt(...lastP); };
    const pm=e=>{ if(!down||done) return; const p=pos(e); const d=Math.hypot(p[0]-lastP[0],p[1]-lastP[1]), n=Math.max(1,Math.ceil(d/8)); for(let i=1;i<=n;i++) scratchAt(lastP[0]+(p[0]-lastP[0])*i/n, lastP[1]+(p[1]-lastP[1])*i/n); lastP=p; };
    const pu=()=>{ down=false; };
    cv.addEventListener('pointerdown',pd); cv.addEventListener('pointermove',pm); addEventListener('pointerup',pu);
    if(playedToday('scratch')){ done=true; drawMat(); msg(card.win?"You've already won today — check your code above.":"You've scratched today's card — a new one tomorrow!"); btn('',null); }
    else{ paintFoil(); drawMat(); msg('Scratch the gold foil 👆'); btn('Reveal all', ()=>{ if(!done) finish(); }); }
    return ()=>{ alive=false; cv.removeEventListener('pointerdown',pd); cv.removeEventListener('pointermove',pm); removeEventListener('pointerup',pu); };
  }

  window.addEventListener('bh-promo',()=>{ const t=$('gTabs'); if(t && !t.dataset.busy){ t.dataset.busy='1'; renderTabs(); delete t.dataset.busy; } });
  renderTabs();
  window.BHGames={show, todays};
})();
