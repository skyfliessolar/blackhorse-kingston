/* The Black Horse — realistic 3D pint (Three.js r128).
   Loaded only when "3D pint" is on in the admin portal.
   window.BHPint.mount(el, {onPour(x,y)}) — tap the glass: it tips, pours, and hands the stream to the page. */
(function(){
  const THREE_URL='https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
  let state=null;
  const one=src=>new Promise((ok,no)=>{ const s=document.createElement('script'); s.src=src; s.onload=ok; s.onerror=()=>{ s.remove(); no(new Error(src)); }; document.head.appendChild(s); });
  // if one library host is down or blocked, try the next
  const loadThree=()=> window.THREE ? Promise.resolve() : one(THREE_URL).catch(()=>one('https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js')).catch(()=>one('https://unpkg.com/three@0.128.0/build/three.min.js'));
  const webglOK=()=>{ try{ const c=document.createElement('canvas'); return !!(c.getContext('webgl2')||c.getContext('webgl')); }catch(e){ return false; } };
  const ease={ inOut:t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2, out:t=>1-Math.pow(1-t,3) };
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)), seg=(t,a,b)=>clamp((t-a)/(b-a),0,1);

  /* ---------- procedural textures (nothing extra to download) ---------- */
  function tex(w,h,draw,srgb){ const c=document.createElement('canvas'); c.width=w; c.height=h; draw(c.getContext('2d'),w,h); const t=new THREE.CanvasTexture(c); if(srgb!==false) t.encoding=THREE.sRGBEncoding; return t; }
  const dot=()=>tex(64,64,(x,w)=>{ const g=x.createRadialGradient(w/2,w/2,0,w/2,w/2,w/2); g.addColorStop(0,'rgba(255,252,240,1)'); g.addColorStop(.3,'rgba(255,240,205,.9)'); g.addColorStop(1,'rgba(255,225,170,0)'); x.fillStyle=g; x.fillRect(0,0,w,w); });
  const blob=()=>tex(64,64,(x,w)=>{ const g=x.createRadialGradient(w*.42,w*.4,0,w/2,w/2,w/2); g.addColorStop(0,'rgba(255,220,130,1)'); g.addColorStop(.45,'rgba(222,134,24,.95)'); g.addColorStop(1,'rgba(150,70,5,0)'); x.fillStyle=g; x.fillRect(0,0,w,w); });
  const soft=()=>tex(256,256,(x,w)=>{ const g=x.createRadialGradient(w/2,w/2,0,w/2,w/2,w/2); g.addColorStop(0,'rgba(0,0,0,.8)'); g.addColorStop(.5,'rgba(0,0,0,.35)'); g.addColorStop(1,'rgba(0,0,0,0)'); x.fillStyle=g; x.fillRect(0,0,w,w); });
  const bokeh=c=>tex(128,128,(x,w)=>{ const g=x.createRadialGradient(w/2,w/2,w*.3,w/2,w/2,w/2); g.addColorStop(0,c); g.addColorStop(.8,c); g.addColorStop(1,'rgba(0,0,0,0)'); x.fillStyle=g; x.beginPath(); x.arc(w/2,w/2,w/2,0,7); x.fill(); });
  /* condensation: thousands of tiny drops and a few runs, wrapped round the glass */
  const frost=()=>tex(1024,512,(x,w,h)=>{ x.clearRect(0,0,w,h);
    for(let i=0;i<5200;i++){ const px=Math.random()*w, py=h*.1+Math.random()*h*.9, r=Math.random()<.92?Math.random()*1.6+.4:Math.random()*4+2;
      const g=x.createRadialGradient(px-r*.3,py-r*.3,0,px,py,r); g.addColorStop(0,'rgba(255,255,255,.95)'); g.addColorStop(.6,'rgba(230,240,255,.35)'); g.addColorStop(1,'rgba(255,255,255,0)'); x.fillStyle=g; x.beginPath(); x.arc(px,py,r,0,7); x.fill(); }
    for(let i=0;i<18;i++){ const px=Math.random()*w, y0=h*.2+Math.random()*h*.4, len=60+Math.random()*180; x.strokeStyle='rgba(255,255,255,.35)'; x.lineWidth=2.4; x.lineCap='round'; x.beginPath(); x.moveTo(px,y0);
      for(let k=0;k<len;k+=6) x.lineTo(px+Math.sin(k*.08+i)*1.5, y0+k); x.stroke(); x.fillStyle='rgba(255,255,255,.8)'; x.beginPath(); x.arc(px,y0+len,3.2,0,7); x.fill(); } }, false);
  /* foam lacing on the inside of the glass above the beer */
  const lace=()=>tex(1024,256,(x,w,h)=>{ x.clearRect(0,0,w,h); for(let b=0;b<4;b++){ const y=30+b*52; x.strokeStyle=`rgba(255,248,232,${.5-b*.09})`;
      for(let i=0;i<w;i+=3){ const hh=6+Math.sin(i*.05+b)*5+Math.random()*7; x.lineWidth=2+Math.random()*2; x.beginPath(); x.moveTo(i,y); x.lineTo(i+Math.random()*2,y+hh); x.stroke(); } } }, false);
  const wood=()=>tex(1024,512,(x,w,h)=>{ const g=x.createLinearGradient(0,0,0,h); g.addColorStop(0,'#2d190c'); g.addColorStop(1,'#120804'); x.fillStyle=g; x.fillRect(0,0,w,h);
    for(let i=0;i<180;i++){ const y=Math.random()*h, a=Math.random()*.08+.02; x.strokeStyle=`rgba(${Math.random()<.5?'130,78,34':'8,4,2'},${a})`; x.lineWidth=Math.random()*2+.5; x.beginPath(); x.moveTo(0,y); for(let px=0;px<=w;px+=32) x.lineTo(px, y+Math.sin(px*.01+i)*4+Math.sin(px*.003+i*2)*9); x.stroke(); }
    const s=x.createRadialGradient(w/2,h*.45,10,w/2,h*.45,w*.45); s.addColorStop(0,'rgba(255,190,110,.18)'); s.addColorStop(1,'rgba(0,0,0,0)'); x.fillStyle=s; x.fillRect(0,0,w,h); });
  function coaster(logo){ return tex(512,512,(x,w)=>{ const c=w/2;
    x.fillStyle='#0e0c09'; x.beginPath(); x.arc(c,c,c,0,7); x.fill();
    x.strokeStyle='#C9A961'; x.lineWidth=10; x.beginPath(); x.arc(c,c,c-14,0,7); x.stroke(); x.lineWidth=2; x.beginPath(); x.arc(c,c,c-30,0,7); x.stroke();
    if(logo){ x.save(); x.beginPath(); x.arc(c,c,150,0,7); x.clip(); x.drawImage(logo,c-150,c-150,300,300); x.restore(); }
    x.fillStyle='#E4CE93'; x.font='600 30px Cinzel, Georgia, serif'; x.textAlign='center'; x.textBaseline='middle';
    const t='THE BLACK HORSE · DRUNKEN WOK · KINGSTON · '; x.save(); x.translate(c,c); for(let i=0;i<t.length;i++){ x.save(); x.rotate(-Math.PI/2+i*(Math.PI*2/t.length)); x.translate(0,-(c-56)); x.fillText(t[i],0,0); x.restore(); } x.restore(); }); }


  /* ---------- vintage back-bar: brick, shelves of bottles, a gilded mirror sign and Edison bulbs ---------- */
  function backbar(){ return tex(2048,1024,(x,w,h)=>{
    const R=(a,b)=>a+Math.random()*(b-a);
    // brick wall
    x.fillStyle='#1b0f09'; x.fillRect(0,0,w,h);
    const bw=118, bh=46; for(let row=0,y=0;y<h*.62;row++,y+=bh){ for(let c=-1,xx=(row%2)*bw/2-bw/2;xx<w;c++,xx+=bw){
      const r=R(70,110), g=R(30,48), b=R(20,32); x.fillStyle=`rgb(${r},${g},${b})`; x.fillRect(xx+3,y+3,bw-6,bh-6);
      const gr=x.createLinearGradient(0,y,0,y+bh); gr.addColorStop(0,'rgba(255,200,150,.06)'); gr.addColorStop(1,'rgba(0,0,0,.25)'); x.fillStyle=gr; x.fillRect(xx+3,y+3,bw-6,bh-6); } }
    const soot=x.createLinearGradient(0,0,0,h*.62); soot.addColorStop(0,'rgba(0,0,0,.55)'); soot.addColorStop(1,'rgba(0,0,0,.15)'); x.fillStyle=soot; x.fillRect(0,0,w,h*.62);
    // dark wood panelling below
    const wd=x.createLinearGradient(0,h*.6,0,h); wd.addColorStop(0,'#2a160a'); wd.addColorStop(1,'#120804'); x.fillStyle=wd; x.fillRect(0,h*.6,w,h*.4);
    for(let i=0;i<w;i+=170){ x.strokeStyle='rgba(0,0,0,.45)'; x.lineWidth=6; x.strokeRect(i+14,h*.66,140,h*.3); x.strokeStyle='rgba(201,169,97,.12)'; x.lineWidth=2; x.strokeRect(i+20,h*.67,128,h*.28); }
    // gilded mirror sign in the middle
    const mx=w*.32, my=h*.06, mw=w*.36, mh=h*.25; const mg=x.createLinearGradient(mx,my,mx+mw,my+mh); mg.addColorStop(0,'#16120e'); mg.addColorStop(.5,'#2b2219'); mg.addColorStop(1,'#120e0a');
    x.fillStyle=mg; x.fillRect(mx,my,mw,mh); x.strokeStyle='#8B6F35'; x.lineWidth=14; x.strokeRect(mx,my,mw,mh); x.strokeStyle='#E4CE93'; x.lineWidth=3; x.strokeRect(mx+16,my+16,mw-32,mh-32);
    const shine=x.createLinearGradient(mx,my,mx+mw*.6,my+mh); shine.addColorStop(0,'rgba(255,255,255,.08)'); shine.addColorStop(.5,'rgba(255,255,255,0)'); x.fillStyle=shine; x.fillRect(mx,my,mw,mh);
    x.textAlign='center'; x.textBaseline='middle'; x.fillStyle='#E4CE93'; x.shadowColor='rgba(228,206,147,.6)'; x.shadowBlur=16;
    x.font='600 76px Cinzel, Georgia, serif'; x.fillText('THE BLACK HORSE', w/2, my+mh*.42);
    x.shadowBlur=0; x.font='600 30px Oswald, Arial, sans-serif'; x.fillStyle='#C9A961'; x.fillText('FINE ALES  ·  SPIRITS  ·  THAI KITCHEN', w/2, my+mh*.74);
    // shelves of bottles either side of the mirror
    const shelf=(y,x0,x1)=>{ x.fillStyle='#3a2210'; x.fillRect(x0,y,x1-x0,16); x.fillStyle='#C9A961'; x.fillRect(x0,y,x1-x0,3);
      for(let bx=x0+16;bx<x1-30;){ const kind=Math.random(), bwid=kind<.3?R(30,38):kind<.6?R(22,28):R(34,46), bht=kind<.3?R(120,150):kind<.6?R(150,185):R(95,120);
        const cols=[['#5a2a06','#c27a1c'],['#0e3b20','#2f8a4c'],['#d9d4c8','#ffffff'],['#4a0f12','#a3343a'],['#6b4a0a','#e2b04a'],['#1a2c3d','#4f7ca8']]; const [c0,c1]=cols[Math.floor(Math.random()*cols.length)];
        const top=y-bht, g=x.createLinearGradient(bx,0,bx+bwid,0); g.addColorStop(0,c0); g.addColorStop(.35,c1); g.addColorStop(.6,c0); g.addColorStop(1,'#000'); x.fillStyle=g;
        x.beginPath(); const neck=bwid*.32; x.moveTo(bx,y); x.lineTo(bx,top+bht*.38); x.quadraticCurveTo(bx,top+bht*.26,bx+bwid/2-neck/2,top+bht*.2); x.lineTo(bx+bwid/2-neck/2,top);
        x.lineTo(bx+bwid/2+neck/2,top); x.lineTo(bx+bwid/2+neck/2,top+bht*.2); x.quadraticCurveTo(bx+bwid,top+bht*.26,bx+bwid,top+bht*.38); x.lineTo(bx+bwid,y); x.closePath(); x.fill();
        x.fillStyle='rgba(255,255,255,.35)'; x.fillRect(bx+bwid*.18,top+bht*.4,3,bht*.5);
        if(Math.random()<.8){ x.fillStyle=['#efe4cc','#d8c9a6','#1d1a16','#C9A961'][Math.floor(Math.random()*4)]; x.fillRect(bx+3,top+bht*.55,bwid-6,bht*.22); }
        x.fillStyle='#2a1a0c'; x.fillRect(bx+bwid/2-neck/2,top-6,neck,8);
        bx+=bwid+R(4,14); } };
    shelf(h*.28,30,mx-30); shelf(h*.5,30,mx-30); shelf(h*.28,mx+mw+30,w-30); shelf(h*.5,mx+mw+30,w-30); shelf(h*.5,mx+20,mx+mw-20);
    // Edison bulbs with warm halos
    [[w*.12,h*.08],[w*.26,h*.13],[w*.74,h*.13],[w*.88,h*.08],[w*.5,h*.36]].forEach(([bx,by])=>{
      x.strokeStyle='rgba(20,12,6,.9)'; x.lineWidth=3; x.beginPath(); x.moveTo(bx,0); x.lineTo(bx,by-26); x.stroke();
      const halo=x.createRadialGradient(bx,by,4,bx,by,220); halo.addColorStop(0,'rgba(255,200,120,.55)'); halo.addColorStop(.25,'rgba(255,160,70,.18)'); halo.addColorStop(1,'rgba(255,140,50,0)'); x.fillStyle=halo; x.fillRect(bx-220,by-220,440,440);
      x.fillStyle='rgba(255,224,170,.95)'; x.beginPath(); x.ellipse(bx,by,15,22,0,0,7); x.fill(); x.fillStyle='#3b2a1a'; x.fillRect(bx-9,by-34,18,12); });
    // vignette & haze
    const v=x.createRadialGradient(w/2,h*.45,h*.2,w/2,h*.45,w*.7); v.addColorStop(0,'rgba(0,0,0,0)'); v.addColorStop(1,'rgba(0,0,0,.7)'); x.fillStyle=v; x.fillRect(0,0,w,h);
  }); }
  /* ---------- the nonic pint profile ---------- */
  const OUTER=[[0,-1.20],[0.50,-1.20],[0.535,-1.16],[0.55,-1.05],[0.595,-0.50],[0.645,0.20],[0.675,0.55],[0.725,0.72],[0.735,0.80],[0.715,0.92],[0.72,1.08],[0.735,1.22]];
  function rAt(y,inset){ for(let i=1;i<OUTER.length;i++){ const [r1,y1]=OUTER[i-1],[r2,y2]=OUTER[i]; if(y>=y1&&y<=y2){ const t=(y-y1)/((y2-y1)||1); return r1+(r2-r1)*t-(inset||0); } } return OUTER[OUTER.length-1][0]-(inset||0); }
  const lathe=(pts,seg)=>new THREE.LatheGeometry(pts.map(p=>new THREE.Vector2(Math.max(0,p[0]),p[1])),seg||96);
  const profile=(y0,y1,inset,step)=>{ const p=[]; for(let y=y0;y<=y1+1e-6;y+=step||.04) p.push([rAt(y,inset),y]); return p; };

  function build(el, hooks){
    const W=()=>el.clientWidth||600, H=()=>el.clientHeight||460, mobile=matchMedia('(max-width: 700px)').matches;
    const renderer=new THREE.WebGLRenderer({antialias:true, alpha:true, powerPreference:'high-performance'});
    renderer.setPixelRatio(Math.min(devicePixelRatio||1, mobile?1.5:1.75)); renderer.setSize(W(),H());
    renderer.outputEncoding=THREE.sRGBEncoding; renderer.toneMapping=THREE.ACESFilmicToneMapping; renderer.toneMappingExposure=1.0;
    el.appendChild(renderer.domElement); renderer.domElement.setAttribute('aria-hidden','true');
    const scene=new THREE.Scene(); scene.fog=new THREE.Fog(0x0c0a08,7.5,14);
    const camera=new THREE.PerspectiveCamera(30, W()/H(), .1, 100); camera.position.set(0,1.0,7.9); camera.lookAt(0,.32,0);

    /* studio-style reflections: tall soft-boxes give the glass its long vertical highlights */
    const env=new THREE.Scene(); env.background=new THREE.Color(0x100a06);
    const box=(c,w,h,x,y,z)=>{ const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h), new THREE.MeshBasicMaterial({color:c, side:THREE.DoubleSide})); m.position.set(x,y,z); m.lookAt(0,y*.3,0); env.add(m); };
    box(0xfff4e0,.55,6,-3.2,1,2.2); box(0xffe2b8,.4,6,3.4,1,1.6); box(0xff9a3c,7,.8,0,-1.6,-4); box(0xffd9a0,2.4,1.2,0,4.5,1.5); box(0x6b4a2a,9,4,0,0,-6); box(0xffffff,.25,5,1.6,1,4);
    const pm=new THREE.PMREMGenerator(renderer); scene.environment=pm.fromScene(env,.02).texture; pm.dispose();

    scene.add(new THREE.HemisphereLight(0xffe6c4,0x1a0d05,.5));
    const key=new THREE.SpotLight(0xffd29a,1.7,30,.42,.7,1); key.position.set(3.5,5,4.5); scene.add(key);
    const back=new THREE.PointLight(0xff8a1f,3.6,8,2); back.position.set(-.3,.1,-1.6); scene.add(back);
    const rim=new THREE.DirectionalLight(0xbcd2ff,.6); rim.position.set(-4,2,-3); scene.add(rim);

    /* soft out-of-focus pub lights far behind */
    const bk=new THREE.Group(); scene.add(bk); const btex=[bokeh('rgba(255,190,110,1)'),bokeh('rgba(255,150,60,1)'),bokeh('rgba(255,230,190,1)')];
    for(let i=0;i<(mobile?10:18);i++){ const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:btex[i%3], transparent:true, opacity:.035+Math.random()*.05, depthWrite:false, blending:THREE.AdditiveBlending, fog:false}));
      const s=.3+Math.random()*.7; sp.scale.set(s,s,1); const side=Math.random()<.5?-1:1; sp.position.set(side*(2.6+Math.random()*4.5), Math.random()*2.4-.6, -8-Math.random()*4); sp.userData={ph:Math.random()*6, sp:.3+Math.random()*.6, o:sp.material.opacity}; bk.add(sp); }

    const bbTex=backbar(); const backdrop=new THREE.Mesh(new THREE.PlaneGeometry(24,12), new THREE.MeshBasicMaterial({map:bbTex, fog:false, depthWrite:false, color:0xb8aaa0}));
    backdrop.position.set(0,1.75,-9); backdrop.renderOrder=-1; scene.add(backdrop);
    { const c=bbTex.image, x2=c.getContext('2d'); if('filter' in x2){ const tmp=document.createElement('canvas'); tmp.width=c.width; tmp.height=c.height; const t2=tmp.getContext('2d'); t2.filter='blur(3px)'; t2.drawImage(c,0,0); x2.clearRect(0,0,c.width,c.height); x2.drawImage(tmp,0,0); bbTex.needsUpdate=true; } }
    /* brass beer pumps with cream handles, standing back on the bar */
    const brass=new THREE.MeshStandardMaterial({color:0xC9A961, metalness:1, roughness:.25, envMapIntensity:1.4}), ceramic=new THREE.MeshPhysicalMaterial({color:0xc9b48e, roughness:.3, clearcoat:1, envMapIntensity:.8}), wood2=new THREE.MeshStandardMaterial({color:0x3a1d0c, roughness:.45, metalness:.1});
    const pump=(px,pz,lean)=>{ const g=new THREE.Group(); g.position.set(px,-1.26,pz); g.rotation.z=lean;
      const baseP=new THREE.Mesh(new THREE.CylinderGeometry(.16,.2,.12,32),brass); baseP.position.y=.06; g.add(baseP);
      const stem=new THREE.Mesh(new THREE.CylinderGeometry(.05,.06,.5,24),brass); stem.position.y=.37; g.add(stem);
      const collar=new THREE.Mesh(new THREE.SphereGeometry(.09,24,16),brass); collar.position.y=.64; g.add(collar);
      const handle=new THREE.Mesh(new THREE.LatheGeometry([[0,0],[.07,0],[.085,.12],[.07,.5],[.09,.85],[.075,1.0],[0,1.02]].map(p=>new THREE.Vector2(p[0],p[1])),32),ceramic); handle.position.y=.68; g.add(handle);
      const clip=new THREE.Mesh(new THREE.CylinderGeometry(.092,.092,.2,32,1,true),wood2); clip.position.y=1.25; g.add(clip);
      const spout=new THREE.Mesh(new THREE.TorusGeometry(.12,.025,10,24,Math.PI),brass); spout.position.set(.12,.25,0); spout.rotation.z=Math.PI/2; g.add(spout);
      scene.add(g); return g; };
    [[-2.3,-1.5,.04],[-1.7,-1.85,-.03],[2.4,-1.7,.02]].forEach(([a,b,c])=>pump(a,b,c).scale.setScalar(.85));
    const pint=new THREE.Group(); scene.add(pint);
    /* thick glass: outer skin, inner skin, heavy base and rolled lip */
    const glassOuter=new THREE.Mesh(lathe(OUTER), new THREE.MeshPhysicalMaterial({color:0xffffff, roughness:.03, metalness:0, transmission:.95, transparent:true, opacity:.14, envMapIntensity:2.6, clearcoat:1, clearcoatRoughness:.02, side:THREE.FrontSide, depthWrite:false}));
    const glassInner=new THREE.Mesh(lathe(profile(-1.04,1.21,.035,.06)), new THREE.MeshPhysicalMaterial({color:0xfff8ee, roughness:.05, transmission:.95, transparent:true, opacity:.1, envMapIntensity:1.8, side:THREE.BackSide, depthWrite:false}));
    glassOuter.renderOrder=6; glassInner.renderOrder=2; pint.add(glassInner, glassOuter);
    const base=new THREE.Mesh(new THREE.CylinderGeometry(.5,.505,.16,72), new THREE.MeshPhysicalMaterial({color:0xfff2dd, roughness:.02, transmission:.9, transparent:true, opacity:.5, envMapIntensity:2.4, clearcoat:1})); base.position.y=-1.11; base.renderOrder=5; pint.add(base);
    const lip=new THREE.Mesh(new THREE.TorusGeometry(.718,.018,12,120), new THREE.MeshPhysicalMaterial({color:0xffffff, roughness:.02, transparent:true, opacity:.6, envMapIntensity:3, clearcoat:1})); lip.rotation.x=Math.PI/2; lip.position.y=1.22; lip.renderOrder=7; pint.add(lip);
    const fr=frost(); fr.wrapS=THREE.RepeatWrapping; fr.repeat.set(2,1);
    const frostMesh=new THREE.Mesh(lathe(profile(-1.06,.86,-.004,.05)), new THREE.MeshPhysicalMaterial({map:fr, transparent:true, opacity:.75, roughness:.15, envMapIntensity:2, depthWrite:false, color:0xffffff}));
    frostMesh.renderOrder=8; pint.add(frostMesh);

    /* the beer: darker at the bottom, glowing gold near the top */
    const beerTop=.86, foamTop=1.16, bottom=-1.02, liquidH=beerTop-bottom;
    const beerGeo=lathe([[0,bottom],...profile(bottom,beerTop,.038,.05),[0,beerTop]],80);
    { const pos=beerGeo.attributes.position, col=new Float32Array(pos.count*3), a=new THREE.Color(0x3f1801), b=new THREE.Color(0xc8740f), c=new THREE.Color();
      for(let i=0;i<pos.count;i++){ const t=clamp((pos.getY(i)-bottom)/liquidH,0,1); c.copy(a).lerp(b, Math.pow(t,.8)); col.set([c.r,c.g,c.b],i*3); } beerGeo.setAttribute('color',new THREE.BufferAttribute(col,3)); }
    const beer=new THREE.Mesh(beerGeo, new THREE.MeshPhysicalMaterial({vertexColors:true, emissive:0x5a2200, emissiveIntensity:.38, roughness:.12, metalness:0, transparent:true, opacity:.96, envMapIntensity:.8, clearcoat:1, clearcoatRoughness:.08}));
    beer.renderOrder=3; pint.add(beer);
    /* creamy foam head with an uneven top */
    const head=new THREE.Group(); pint.add(head);
    const fpts=[[0,beerTop-.02],[rAt(beerTop,.034),beerTop-.02],...profile(beerTop,foamTop,.032,.03),[rAt(foamTop,.045),foamTop+.035],[.6,foamTop+.075],[.42,foamTop+.105],[.2,foamTop+.12],[0,foamTop+.125]];
    const foamGeo=lathe(fpts,96); { const p=foamGeo.attributes.position; for(let i=0;i<p.count;i++){ const x=p.getX(i), y=p.getY(i), z=p.getZ(i); if(y>foamTop){ p.setY(i, y+Math.sin(x*14)*Math.cos(z*13)*.012+Math.sin((x+z)*31)*.005); } } foamGeo.computeVertexNormals(); }
    const foamMat=new THREE.MeshPhysicalMaterial({color:0xfbefd8, roughness:.92, metalness:0, emissive:0x2b1c09, emissiveIntensity:.25});
    const foam=new THREE.Mesh(foamGeo, foamMat); foam.renderOrder=4; head.add(foam);
    const fb=new THREE.InstancedMesh(new THREE.SphereGeometry(1,8,6), foamMat, mobile?140:260), m4=new THREE.Matrix4(), q=new THREE.Quaternion(), v3=new THREE.Vector3(), s3=new THREE.Vector3();
    for(let i=0;i<fb.count;i++){ const a=Math.random()*6.283, r=Math.sqrt(Math.random())*.64, y=foamTop+.1-r*r*.13, sz=.012+Math.random()*.028; m4.compose(v3.set(Math.cos(a)*r,y,Math.sin(a)*r), q, s3.set(sz,sz*.7,sz)); fb.setMatrixAt(i,m4); } head.add(fb);
    const laceMesh=new THREE.Mesh(lathe(profile(foamTop+.02,1.2,.036,.03)), new THREE.MeshBasicMaterial({map:lace(), transparent:true, opacity:.55, side:THREE.DoubleSide, depthWrite:false})); laceMesh.renderOrder=5; pint.add(laceMesh);

    /* bubble streams rising from points on the glass bottom */
    const N=mobile?140:240, bp=new Float32Array(N*3), bv=new Float32Array(N), streams=[...Array(9)].map(()=>({a:Math.random()*6.283, r:Math.random()*.42}));
    const seed=(i,y)=>{ const s=streams[i%streams.length]; bp[i*3]=Math.cos(s.a)*s.r+(Math.random()-.5)*.03; bp[i*3+1]=y!=null?y:bottom+Math.random()*1.8; bp[i*3+2]=Math.sin(s.a)*s.r+(Math.random()-.5)*.03; bv[i]=.22+Math.random()*.3; };
    for(let i=0;i<N;i++) seed(i);
    const bg=new THREE.BufferGeometry(); bg.setAttribute('position',new THREE.BufferAttribute(bp,3));
    const bubbles=new THREE.Points(bg,new THREE.PointsMaterial({map:dot(), size:.03, transparent:true, opacity:.8, depthWrite:false, blending:THREE.AdditiveBlending, color:0xfff3d6})); bubbles.renderOrder=4; pint.add(bubbles);

    /* poured liquid (only during the pour) */
    const P=mobile?280:460, pp=new Float32Array(P*3), pv=new Float32Array(P*3), pl=new Uint8Array(P); for(let i=0;i<P;i++) pp[i*3+1]=-99;
    const pg=new THREE.BufferGeometry(); pg.setAttribute('position',new THREE.BufferAttribute(pp,3));
    const pour=new THREE.Points(pg,new THREE.PointsMaterial({map:blob(), size:.07, transparent:true, opacity:.9, depthWrite:false}));
    /* the pouring stream itself: a glossy amber ribbon that follows the arc from the rim to the bar */
    const streamMat=new THREE.MeshPhysicalMaterial({color:0xc06a0e, emissive:0x6a2c00, emissiveIntensity:.5, roughness:.08, clearcoat:1, clearcoatRoughness:.05, transparent:true, opacity:.93, envMapIntensity:1.4});
    let stream=null; const streamPts=[...Array(18)].map(()=>new THREE.Vector3());
    function drawStream(origin, strength){
      if(stream){ scene.remove(stream); stream.geometry.dispose(); stream=null; } if(strength<=.02) return;
      const vx=.95, vy=.18, g=5.4; let tEnd=0; while(origin.y+vy*tEnd-.5*g*tEnd*tEnd>-1.24 && tEnd<2) tEnd+=.02;
      streamPts.forEach((p,i)=>{ const t=tEnd*i/(streamPts.length-1); p.set(origin.x+vx*t, origin.y+vy*t-.5*g*t*t, origin.z); });
      const curve=new THREE.CatmullRomCurve3(streamPts), geo=new THREE.TubeGeometry(curve,40,.028+.03*strength,10,false);
      const pos=geo.attributes.position; for(let i=0;i<pos.count;i++){ const y=pos.getY(i); pos.setX(i,pos.getX(i)+Math.sin(y*22+clock.elapsedTime*18)*.006); }
      stream=new THREE.Mesh(geo,streamMat); stream.renderOrder=9; scene.add(stream); } pour.renderOrder=9; pour.frustumCulled=false; scene.add(pour); let pIdx=0;

    /* coaster, bar top, contact shadow, and the spill puddle */
    const co=new THREE.Mesh(new THREE.CylinderGeometry(1.05,1.05,.05,80), [new THREE.MeshStandardMaterial({color:0xC9A961, roughness:.6}), new THREE.MeshStandardMaterial({map:coaster(null), roughness:.75}), new THREE.MeshStandardMaterial({color:0x111111})]);
    co.position.y=-1.235; scene.add(co); const logo=new Image(); logo.onload=()=>{ co.material[1].map=coaster(logo); co.material[1].needsUpdate=true; }; logo.src='logo.jpg';
    const bar=new THREE.Mesh(new THREE.PlaneGeometry(16,9), new THREE.MeshStandardMaterial({map:wood(), roughness:.65, metalness:0, envMapIntensity:.3, color:0x9a8070})); bar.rotation.x=-Math.PI/2; bar.position.y=-1.262; scene.add(bar);
    const sh=new THREE.Mesh(new THREE.PlaneGeometry(3.2,3.2), new THREE.MeshBasicMaterial({map:soft(), transparent:true, depthWrite:false})); sh.rotation.x=-Math.PI/2; sh.position.y=-1.205; scene.add(sh);
    const pudTex=tex(256,256,(x,w)=>{ const g=x.createRadialGradient(w/2,w/2,0,w/2,w/2,w/2); g.addColorStop(0,'rgba(170,82,8,.95)'); g.addColorStop(.62,'rgba(190,98,14,.85)'); g.addColorStop(.85,'rgba(230,150,50,.45)'); g.addColorStop(1,'rgba(230,150,50,0)'); x.fillStyle=g; x.fillRect(0,0,w,w); });
    const puddle=new THREE.Mesh(new THREE.CircleGeometry(1,48), new THREE.MeshPhysicalMaterial({map:pudTex, roughness:.04, clearcoat:1, clearcoatRoughness:.02, transparent:true, opacity:0, envMapIntensity:2.2, depthWrite:false}));
    puddle.rotation.x=-Math.PI/2; puddle.position.set(1.55,-1.256,.35); puddle.scale.set(.01,.01,1); scene.add(puddle);

    /* interaction */
    const ray=new THREE.Raycaster(), ptr=new THREE.Vector2(); let hover=false, drag=null, spin=0, spinV=.22, tiltX=0, tiltY=0, mx=0, my=0, pourT=-1, handed=false;
    const cv=renderer.domElement; cv.style.touchAction='pan-y';
    const hit=e=>{ const r=cv.getBoundingClientRect(); ptr.set(((e.clientX-r.left)/r.width)*2-1, -((e.clientY-r.top)/r.height)*2+1); ray.setFromCamera(ptr,camera); return ray.intersectObjects([glassOuter,beer,foam],false).length>0; };
    cv.addEventListener('pointermove',e=>{ const r=cv.getBoundingClientRect(); mx=((e.clientX-r.left)/r.width-.5)*2; my=((e.clientY-r.top)/r.height-.5)*2;
      if(drag){ const dx=e.clientX-drag.x; spinV=dx*.02; spin+=dx*.012; drag.x=e.clientX; drag.moved+=Math.abs(dx); }
      hover=pourT<0 && hit(e); cv.style.cursor= drag ? 'grabbing' : (hover ? 'pointer' : 'grab'); });
    cv.addEventListener('pointerdown',e=>{ drag={x:e.clientX, moved:0}; });
    cv.addEventListener('pointerleave',()=>{ hover=false; drag=null; mx=my=0; });
    addEventListener('pointerup',()=>{ drag=null; });
    cv.addEventListener('click',e=>{ if(drag&&drag.moved>6) return; if(hit(e)) startPour(); });
    let pourMode='face';
    function startPour(){ if(pourT>=0) return; pourMode=(hooks&&hooks.mode&&hooks.mode())==='pour'?'pour':'face'; pourT=0; handed=false; hover=false; setRun(true); }
    const rimWorld=new THREE.Vector3();
    const screenOf=v=>{ const p=v.clone().project(camera), r=cv.getBoundingClientRect(); return {x:r.left+(p.x+1)/2*r.width, y:r.top+(1-p.y)/2*r.height}; };

    /* render loop — paused off-screen (except while pouring) */
    const clock=new THREE.Clock(); let running=false, raf=0, visible=true;
    /* automatic quality: if the device can't keep up, lower the resolution and drop the finest details */
    let qN=0, qT=0, qLevel=0; const baseDpr=renderer.getPixelRatio();
    function quality(raw){ qN++; qT+=raw; if(qN<60) return; const fps=qN/qT; qN=0; qT=0;
      if(fps<28 && qLevel===0){ qLevel=1; renderer.setPixelRatio(Math.min(1,baseDpr)); }
      else if(fps<18 && qLevel===1){ qLevel=2; renderer.setPixelRatio(.75); frostMesh.visible=false; laceMesh.visible=false; fb.visible=false; bk.visible=false; } }
    function frame(){ raf=requestAnimationFrame(frame); const raw=clock.getDelta(), dt=Math.min(raw,.05), t=clock.elapsedTime; quality(raw);
      if(!drag && pourT<0){ spinV+=(.22-spinV)*Math.min(1,dt*1.5); spin+=spinV*dt; }
      tiltX+=((my*.1)-tiltX)*Math.min(1,dt*4); tiltY+=((mx*.16)-tiltY)*Math.min(1,dt*4);
      let lift=Math.sin(t*1.1)*.025, tipX=0, tipZ=0, toward=0, level=1;
      if(pourT>=0 && pourMode==='pour'){ pourT+=dt;
        /* POUR DOWN: the glass tips over to the right and pours a glossy stream onto the bar; the page carries it down to the booking */
        const tip=ease.inOut(seg(pourT,0,.55)), back2=ease.inOut(seg(pourT,2.7,3.3)), k=tip*(1-back2);
        tipZ=-1.15*k; lift+=k*.28; toward=k*.15;
        level = pourT<3.1 ? 1-.75*ease.out(seg(pourT,.4,2.6)) : .25+.75*ease.out(seg(pourT,3.3,4.6));
        spin+=((Math.round(spin/(Math.PI*2))*Math.PI*2)-spin)*Math.min(1,dt*6);
        const strength = pourT<.38 ? 0 : pourT<.6 ? (pourT-.38)/.22 : pourT<2.5 ? 1-.35*(pourT-.6)/1.9 : Math.max(0,.65-(pourT-2.5)/.35);
        rimWorld.set(.7,1.18,0); pint.localToWorld(rimWorld);
        drawStream(rimWorld, strength);
        if(strength>0){ puddle.material.opacity=Math.min(.9,puddle.material.opacity+dt*.6); const ps=Math.min(.9,puddle.scale.x+dt*.22); puddle.scale.set(ps,ps*.7,1); }
        else if(pourT>3) { puddle.material.opacity=Math.max(0,puddle.material.opacity-dt*.5); }
        if(!handed && pourT>.7){ handed=true; const end=streamPts[streamPts.length-1], s2=screenOf(end); hooks&&hooks.onPour&&hooks.onPour(s2.x,s2.y); }
        if(pourT>4.8){ pourT=-1; drawStream(rimWorld,0); puddle.scale.set(.01,.01,1); puddle.material.opacity=0; if(!visible) setRun(false); } }
      else if(pourT>=0){ pourT+=dt;
        /* "Cheers!" — the glass is swung at the viewer and the ale is thrown straight at the screen (one direction: toward you) */
        const wind=ease.inOut(seg(pourT,0,.32)), up=ease.out(seg(pourT,.32,.62)), down=ease.inOut(seg(pourT,1.5,2.5)), k=up*(1-down);
        tipX = -.18*wind*(1-up) + k*1.05; toward = k*1.25 - .15*wind*(1-up); lift += k*.35;
        level = pourT<2.6 ? 1-.78*ease.out(seg(pourT,.5,1.05)) : .22+.78*ease.out(seg(pourT,2.6,3.8));
        spin+=((Math.round(spin/(Math.PI*2))*Math.PI*2)-spin)*Math.min(1,dt*6);
        const flow = pourT>.45 && pourT<.95 ? 1 : 0;
        rimWorld.set(0,1.2,.35); pint.localToWorld(rimWorld);
        if(flow>0){ const n=Math.ceil(dt*260); for(let j=0;j<n;j++){ const i=pIdx++%P; pp[i*3]=rimWorld.x+(Math.random()-.5)*.35; pp[i*3+1]=rimWorld.y+(Math.random()-.5)*.12; pp[i*3+2]=rimWorld.z+(Math.random()-.5)*.1;
            pv[i*3]=(Math.random()-.5)*1.6; pv[i*3+1]=.6+Math.random()*1.2; pv[i*3+2]=6+Math.random()*4; pl[i]=1; } }
        if(!handed && pourT>.62){ handed=true; const s=screenOf(rimWorld); hooks&&hooks.onPour&&hooks.onPour(s.x,s.y); }
        if(pourT>4){ pourT=-1; if(!visible) setRun(false); } }
      pint.rotation.set(tiltX+tipX, spin, tiltY*.35+tipZ); pint.position.set(0, lift, toward);
      const hs=hover?1.035:1; pint.scale.lerp(s3.set(hs,hs,hs), Math.min(1,dt*8));
      /* liquid level: the beer column shortens and the head rides down on top of it */
      beer.scale.y=level; beer.position.y=bottom*(1-level); head.position.y=(level-1)*liquidH;
      back.intensity=3.6+Math.sin(t*2.3)*.3+(hover?1:0);
      bk.children.forEach(s=>{ s.material.opacity=s.userData.o*(.7+.3*Math.sin(t*s.userData.sp+s.userData.ph)); });
      const p=bg.attributes.position.array, topNow=bottom+liquidH*level-.03;
      for(let i=0;i<N;i++){ p[i*3+1]+=bv[i]*dt; p[i*3]+=Math.sin(t*4+i)*.0006; if(p[i*3+1]>topNow) seed(i,bottom+.02); }
      bg.attributes.position.needsUpdate=true;
      let any=false; for(let i=0;i<P;i++){ if(!pl[i]) continue; any=true; pv[i*3+1]-=5.4*dt; pp[i*3]+=pv[i*3]*dt; pp[i*3+1]+=pv[i*3+1]*dt; pp[i*3+2]+=pv[i*3+2]*dt;
        if(pp[i*3+1]<-1.25 || pp[i*3+2]>camera.position.z-.6){ pl[i]=0; pp[i*3+1]=-99; } }
      if(any) pg.attributes.position.needsUpdate=true;
      renderer.render(scene,camera); }
    function setRun(on){ if(on&&!running){ running=true; clock.getDelta(); frame(); } else if(!on&&running){ running=false; cancelAnimationFrame(raf); } }
    const io=new IntersectionObserver(es=>{ visible=es[0].isIntersecting; setRun((visible||pourT>=0)&&!document.hidden); },{rootMargin:'160px'}); io.observe(el);
    const vis=()=>setRun((visible||pourT>=0)&&!document.hidden); document.addEventListener('visibilitychange',vis);
    const rs=()=>{ camera.aspect=W()/H(); camera.fov=W()<560?44:30; camera.updateProjectionMatrix(); renderer.setSize(W(),H()); };
    addEventListener('resize',rs); rs(); renderer.render(scene,camera);
    return { pour:startPour, destroy(){ setRun(false); io.disconnect(); document.removeEventListener('visibilitychange',vis); removeEventListener('resize',rs);
      scene.traverse(o=>{ if(o.geometry) o.geometry.dispose(); const m=o.material; (Array.isArray(m)?m:[m]).forEach(x=>{ if(!x) return; if(x.map) x.map.dispose(); x.dispose(); }); }); renderer.dispose(); cv.remove(); } };
  }

  window.BHPint={ supported:webglOK,
    async mount(el, hooks){ if(state) return state; if(!webglOK()) throw new Error('no-webgl'); await loadThree(); state=build(el, typeof hooks==='function'?{onPour:hooks}:hooks); return state; },
    pour(){ state&&state.pour(); },
    unmount(){ if(state){ state.destroy(); state=null; } } };
})();
