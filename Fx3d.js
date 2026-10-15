/* The Black Horse — realistic 3D pint (Three.js r128).
   Loaded only when "3D pint" is on in the admin portal.
   window.BHPint.mount(el, {onPour(x,y)}) — tap the glass: it tips, pours, and hands the stream to the page. */
(function(){
  const THREE_URL='https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
  let state=null;
  const loadThree=()=> window.THREE ? Promise.resolve() : new Promise((ok,no)=>{ const s=document.createElement('script'); s.src=THREE_URL; s.onload=ok; s.onerror=no; document.head.appendChild(s); });
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
    for(let i=0;i<(mobile?10:18);i++){ const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:btex[i%3], transparent:true, opacity:.08+Math.random()*.14, depthWrite:false, blending:THREE.AdditiveBlending, fog:false}));
      const s=.4+Math.random()*1.1; sp.scale.set(s,s,1); sp.position.set((Math.random()-.5)*12, Math.random()*4-.3, -5-Math.random()*4); sp.userData={ph:Math.random()*6, sp:.3+Math.random()*.6, o:sp.material.opacity}; bk.add(sp); }

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
    { const pos=beerGeo.attributes.position, col=new Float32Array(pos.count*3), a=new THREE.Color(0x5e2a03), b=new THREE.Color(0xe19a2a), c=new THREE.Color();
      for(let i=0;i<pos.count;i++){ const t=clamp((pos.getY(i)-bottom)/liquidH,0,1); c.copy(a).lerp(b, Math.pow(t,.8)); col.set([c.r,c.g,c.b],i*3); } beerGeo.setAttribute('color',new THREE.BufferAttribute(col,3)); }
    const beer=new THREE.Mesh(beerGeo, new THREE.MeshPhysicalMaterial({vertexColors:true, emissive:0x6a2a00, emissiveIntensity:.42, roughness:.12, metalness:0, transparent:true, opacity:.96, envMapIntensity:.8, clearcoat:1, clearcoatRoughness:.08}));
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
    const pour=new THREE.Points(pg,new THREE.PointsMaterial({map:blob(), size:.14, transparent:true, opacity:.95, depthWrite:false})); pour.renderOrder=9; pour.frustumCulled=false; scene.add(pour); let pIdx=0;

    /* coaster, bar top, contact shadow, and the spill puddle */
    const co=new THREE.Mesh(new THREE.CylinderGeometry(1.05,1.05,.05,80), [new THREE.MeshStandardMaterial({color:0xC9A961, roughness:.6}), new THREE.MeshStandardMaterial({map:coaster(null), roughness:.75}), new THREE.MeshStandardMaterial({color:0x111111})]);
    co.position.y=-1.235; scene.add(co); const logo=new Image(); logo.onload=()=>{ co.material[1].map=coaster(logo); co.material[1].needsUpdate=true; }; logo.src='logo.jpg';
    const bar=new THREE.Mesh(new THREE.PlaneGeometry(16,9), new THREE.MeshStandardMaterial({map:wood(), roughness:.65, metalness:0, envMapIntensity:.3, color:0x9a8070})); bar.rotation.x=-Math.PI/2; bar.position.y=-1.262; scene.add(bar);
    const sh=new THREE.Mesh(new THREE.PlaneGeometry(3.2,3.2), new THREE.MeshBasicMaterial({map:soft(), transparent:true, depthWrite:false})); sh.rotation.x=-Math.PI/2; sh.position.y=-1.205; scene.add(sh);
    const puddle=new THREE.Mesh(new THREE.CircleGeometry(1,48), new THREE.MeshPhysicalMaterial({color:0xb86410, roughness:.05, clearcoat:1, transparent:true, opacity:0, envMapIntensity:1.6, depthWrite:false}));
    puddle.rotation.x=-Math.PI/2; puddle.position.set(1.8,-1.256,.45); puddle.scale.set(.01,.01,1); scene.add(puddle);

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
    function startPour(){ if(pourT>=0) return; pourT=0; handed=false; hover=false; setRun(true); }
    const rimWorld=new THREE.Vector3();
    const screenOf=v=>{ const p=v.clone().project(camera), r=cv.getBoundingClientRect(); return {x:r.left+(p.x+1)/2*r.width, y:r.top+(1-p.y)/2*r.height}; };

    /* render loop — paused off-screen (except while pouring) */
    const clock=new THREE.Clock(); let running=false, raf=0, visible=true;
    function frame(){ raf=requestAnimationFrame(frame); const dt=Math.min(clock.getDelta(),.05), t=clock.elapsedTime;
      if(!drag && pourT<0){ spinV+=(.22-spinV)*Math.min(1,dt*1.5); spin+=spinV*dt; }
      tiltX+=((my*.1)-tiltX)*Math.min(1,dt*4); tiltY+=((mx*.16)-tiltY)*Math.min(1,dt*4);
      let lift=Math.sin(t*1.1)*.025, tipZ=0, shiftX=0, level=1;
      if(pourT>=0){ pourT+=dt;
        const up=ease.inOut(seg(pourT,0,.6)), down=ease.inOut(seg(pourT,2.6,3.5)), k=up*(1-down);
        lift+=k*.5; tipZ=-k*1.28; shiftX=-k*.5;
        level = pourT<3.5 ? 1-.7*ease.inOut(seg(pourT,.5,2.5)) : .3+.7*ease.out(seg(pourT,3.6,5.4));
        spin+=((Math.round(spin/(Math.PI*2))*Math.PI*2)-spin)*Math.min(1,dt*5);
        if(pourT>.42 && pourT<2.55){ rimWorld.set(.74,1.2,0); pint.localToWorld(rimWorld);
          const n=Math.ceil(dt*210); for(let j=0;j<n;j++){ const i=pIdx++%P; pp[i*3]=rimWorld.x+(Math.random()-.5)*.05; pp[i*3+1]=rimWorld.y+(Math.random()-.5)*.03; pp[i*3+2]=rimWorld.z+(Math.random()-.5)*.05;
            pv[i*3]=.85+Math.random()*.35; pv[i*3+1]=.15+Math.random()*.25; pv[i*3+2]=(Math.random()-.5)*.1; pl[i]=1; }
          if(!handed && pourT>.8){ handed=true; const s=screenOf(rimWorld); hooks&&hooks.onPour&&hooks.onPour(s.x,s.y); } }
        if(pourT>.7 && pourT<2.9){ const g=ease.out(seg(pourT,.7,2.9)); puddle.material.opacity=.8*g; const s=.15+g*.85; puddle.scale.set(s,s*.72,1); }
        if(pourT>4) puddle.material.opacity*=Math.pow(.25,dt);
        if(pourT>5.6){ pourT=-1; puddle.material.opacity=0; puddle.scale.set(.01,.01,1); if(!visible) setRun(false); } }
      pint.rotation.set(tiltX, spin, tiltY*.35+tipZ); pint.position.set(shiftX, lift, 0);
      const hs=hover?1.035:1; pint.scale.lerp(s3.set(hs,hs,hs), Math.min(1,dt*8));
      /* liquid level: the beer column shortens and the head rides down on top of it */
      beer.scale.y=level; beer.position.y=bottom*(1-level); head.position.y=(level-1)*liquidH;
      back.intensity=3.6+Math.sin(t*2.3)*.3+(hover?1:0);
      bk.children.forEach(s=>{ s.material.opacity=s.userData.o*(.7+.3*Math.sin(t*s.userData.sp+s.userData.ph)); });
      const p=bg.attributes.position.array, topNow=bottom+liquidH*level-.03;
      for(let i=0;i<N;i++){ p[i*3+1]+=bv[i]*dt; p[i*3]+=Math.sin(t*4+i)*.0006; if(p[i*3+1]>topNow) seed(i,bottom+.02); }
      bg.attributes.position.needsUpdate=true;
      let any=false; for(let i=0;i<P;i++){ if(!pl[i]) continue; any=true; pv[i*3+1]-=5.4*dt; pp[i*3]+=pv[i*3]*dt; pp[i*3+1]+=pv[i*3+1]*dt; pp[i*3+2]+=pv[i*3+2]*dt;
        if(pp[i*3+1]<-1.25){ pl[i]=0; pp[i*3+1]=-99; } }
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
