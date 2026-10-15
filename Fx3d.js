/* The Black Horse — 3D pint (Three.js r128).
   Loaded only when "3D pint" is switched on in the admin portal. Exposes window.BHPint.mount(el) / .unmount(). */
(function(){
  const THREE_URL='https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
  let state=null;
  function loadThree(){ return window.THREE ? Promise.resolve() : new Promise((ok,no)=>{ const s=document.createElement('script'); s.src=THREE_URL; s.onload=ok; s.onerror=no; document.head.appendChild(s); }); }
  function webglOK(){ try{ const c=document.createElement('canvas'); return !!(c.getContext('webgl2')||c.getContext('webgl')); }catch(e){ return false; } }

  /* ---------- small canvas textures (no image downloads) ---------- */
  function canvasTex(w,h,draw){ const c=document.createElement('canvas'); c.width=w; c.height=h; draw(c.getContext('2d'),w,h); const t=new THREE.CanvasTexture(c); t.encoding=THREE.sRGBEncoding; return t; }
  const dotTex=()=>canvasTex(64,64,(x,w)=>{ const g=x.createRadialGradient(w/2,w/2,0,w/2,w/2,w/2); g.addColorStop(0,'rgba(255,250,235,1)'); g.addColorStop(.35,'rgba(255,240,205,.85)'); g.addColorStop(1,'rgba(255,230,180,0)'); x.fillStyle=g; x.fillRect(0,0,w,w); });
  const shadowTex=()=>canvasTex(256,256,(x,w)=>{ const g=x.createRadialGradient(w/2,w/2,0,w/2,w/2,w/2); g.addColorStop(0,'rgba(0,0,0,.75)'); g.addColorStop(.55,'rgba(0,0,0,.35)'); g.addColorStop(1,'rgba(0,0,0,0)'); x.fillStyle=g; x.fillRect(0,0,w,w); });
  function woodTex(){ return canvasTex(1024,512,(x,w,h)=>{ const g=x.createLinearGradient(0,0,0,h); g.addColorStop(0,'#2a170b'); g.addColorStop(1,'#140a04'); x.fillStyle=g; x.fillRect(0,0,w,h);
      for(let i=0;i<140;i++){ const y=Math.random()*h, a=Math.random()*.08+.02; x.strokeStyle=`rgba(${Math.random()<.5?'120,70,30':'10,5,2'},${a})`; x.lineWidth=Math.random()*2+.5; x.beginPath(); x.moveTo(0,y);
        for(let px=0;px<=w;px+=32) x.lineTo(px, y+Math.sin(px*.01+i)*4+Math.sin(px*.003+i*2)*8); x.stroke(); } }); }
  function coasterTex(logo){ return canvasTex(512,512,(x,w)=>{ const c=w/2;
      x.fillStyle='#0e0c09'; x.beginPath(); x.arc(c,c,c,0,7); x.fill();
      x.strokeStyle='#C9A961'; x.lineWidth=10; x.beginPath(); x.arc(c,c,c-14,0,7); x.stroke(); x.lineWidth=2; x.beginPath(); x.arc(c,c,c-30,0,7); x.stroke();
      if(logo){ x.save(); x.beginPath(); x.arc(c,c,150,0,7); x.clip(); x.drawImage(logo,c-150,c-150,300,300); x.restore(); x.strokeStyle='#8B6F35'; x.lineWidth=4; x.beginPath(); x.arc(c,c,150,0,7); x.stroke(); }
      x.fillStyle='#E4CE93'; x.font='600 30px Cinzel, Georgia, serif'; x.textAlign='center'; x.textBaseline='middle';
      const txt='THE BLACK HORSE · DRUNKEN WOK · KINGSTON · '; const r=c-56; x.save(); x.translate(c,c);
      for(let i=0;i<txt.length;i++){ x.save(); x.rotate(-Math.PI/2+i*(Math.PI*2/txt.length)); x.translate(0,-r); x.fillText(txt[i],0,0); x.restore(); } x.restore(); }); }

  /* ---------- the nonic pint profile (radius, height) ---------- */
  const OUTER=[[0,-1.20],[0.50,-1.20],[0.535,-1.16],[0.55,-1.05],[0.595,-0.50],[0.645,0.20],[0.675,0.55],[0.725,0.72],[0.735,0.80],[0.715,0.92],[0.72,1.08],[0.735,1.22]];
  const lathe=(pts,seg)=>new THREE.LatheGeometry(pts.map(p=>new THREE.Vector2(p[0],p[1])),seg||72);
  function radiusAt(y,inset){ for(let i=1;i<OUTER.length;i++){ const [r1,y1]=OUTER[i-1],[r2,y2]=OUTER[i]; if(y>=y1&&y<=y2){ const t=(y-y1)/((y2-y1)||1); return (r1+(r2-r1)*t)-(inset||0); } } return OUTER[OUTER.length-1][0]-(inset||0); }

  function build(el){
    const W=()=>el.clientWidth||600, H=()=>el.clientHeight||440;
    const mobile=matchMedia('(max-width: 700px)').matches;
    const renderer=new THREE.WebGLRenderer({antialias:true, alpha:true, powerPreference:'high-performance'});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1, mobile?1.5:1.75)); renderer.setSize(W(),H());
    renderer.outputEncoding=THREE.sRGBEncoding; renderer.toneMapping=THREE.ACESFilmicToneMapping; renderer.toneMappingExposure=1.0;
    el.appendChild(renderer.domElement); renderer.domElement.setAttribute('aria-hidden','true');
    const scene=new THREE.Scene();
    const camera=new THREE.PerspectiveCamera(32, W()/H(), .1, 100); camera.position.set(0,1.0,7.9); camera.lookAt(0,.32,0);
    scene.fog=new THREE.Fog(0x0c0a08, 7.5, 13);

    /* warm "pub interior" reflections for the glass, made from glowing panels */
    const env=new THREE.Scene(); env.background=new THREE.Color(0x120c07);
    const panel=(c,w,h,x,y,z,ry)=>{ const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h), new THREE.MeshBasicMaterial({color:c, side:THREE.DoubleSide})); m.position.set(x,y,z); m.rotation.y=ry||0; env.add(m); };
    panel(0xffc27a,3,1.2,-3,2,-2,0.8); panel(0xffe0b0,2,4,4,1,1,-1.2); panel(0xff9a3c,6,.6,0,-1.2,-4,0); panel(0xfff1d6,1.2,1.2,0,4,2,0); panel(0x6b4a2a,8,3,0,0,5,Math.PI);
    const pm=new THREE.PMREMGenerator(renderer); scene.environment=pm.fromScene(env,.04).texture; pm.dispose();

    /* lights: warm key, beer back-glow, cool rim */
    scene.add(new THREE.HemisphereLight(0xffe6c4,0x1a0d05,.55));
    const key=new THREE.SpotLight(0xffd29a,1.6,30,.42,.7,1); key.position.set(3.5,5,4.5); scene.add(key);
    const back=new THREE.PointLight(0xff8a1f,3.4,8,2); back.position.set(-.4,.1,-1.6); scene.add(back);
    const rim=new THREE.DirectionalLight(0xbcd2ff,.55); rim.position.set(-4,2,-3); scene.add(rim);

    const pint=new THREE.Group(); scene.add(pint);
    /* glass */
    const glassMat=new THREE.MeshPhysicalMaterial({color:0xffffff, metalness:0, roughness:.04, transmission:.92, transparent:true, opacity:.16,
      envMapIntensity:2.2, clearcoat:1, clearcoatRoughness:.03, side:THREE.DoubleSide, depthWrite:false});
    const glass=new THREE.Mesh(lathe(OUTER), glassMat); glass.renderOrder=3; pint.add(glass);
    const base=new THREE.Mesh(new THREE.CylinderGeometry(.49,.5,.16,64), new THREE.MeshPhysicalMaterial({color:0xfff6e8, roughness:.02, transmission:.9, transparent:true, opacity:.45, envMapIntensity:2})); base.position.y=-1.11; pint.add(base);
    const lip=new THREE.Mesh(new THREE.TorusGeometry(.733,.012,10,96), new THREE.MeshPhysicalMaterial({color:0xffffff, roughness:.02, transparent:true, opacity:.55, envMapIntensity:2.5})); lip.rotation.x=Math.PI/2; lip.position.y=1.22; pint.add(lip);

    /* beer + foam */
    const beerTop=.86, foamTop=1.17;
    const beerPts=[[0,-1.02]]; for(let y=-1.02;y<=beerTop+1e-6;y+=.06) beerPts.push([radiusAt(y,.035),y]); beerPts.push([radiusAt(beerTop,.035),beerTop],[0,beerTop]);
    const beerMat=new THREE.MeshPhysicalMaterial({color:0x8c3f05, emissive:0x5c2400, emissiveIntensity:.5, roughness:.18, metalness:0, transparent:true, opacity:.97, envMapIntensity:.9, clearcoat:.8, clearcoatRoughness:.1});
    const beer=new THREE.Mesh(lathe(beerPts,64), beerMat); beer.renderOrder=1; pint.add(beer);
    const fPts=[[0,beerTop-.02],[radiusAt(beerTop,.03),beerTop-.02]]; for(let y=beerTop;y<=foamTop;y+=.04) fPts.push([radiusAt(y,.028),y]);
    fPts.push([radiusAt(foamTop,.04),foamTop+.03],[.55,foamTop+.08],[.3,foamTop+.11],[0,foamTop+.12]);
    const foamMat=new THREE.MeshStandardMaterial({color:0xfbf0da, roughness:.95, metalness:0, emissive:0x2a1c08, emissiveIntensity:.25});
    const foam=new THREE.Mesh(lathe(fPts,64), foamMat); foam.renderOrder=2; pint.add(foam);
    /* foam texture: little bubbles on the head */
    const fb=new THREE.InstancedMesh(new THREE.SphereGeometry(1,8,6), foamMat, mobile?120:220); const m4=new THREE.Matrix4(), q=new THREE.Quaternion(), s3=new THREE.Vector3();
    for(let i=0;i<fb.count;i++){ const a=Math.random()*Math.PI*2, r=Math.sqrt(Math.random())*.62, y=foamTop+.09-r*r*.12; const sz=.018+Math.random()*.03;
      m4.compose(new THREE.Vector3(Math.cos(a)*r,y,Math.sin(a)*r), q, s3.set(sz,sz*.7,sz)); fb.setMatrixAt(i,m4); } pint.add(fb);

    /* rising bubbles */
    const N=mobile?110:200, bp=new Float32Array(N*3), bv=new Float32Array(N);
    const seed=i=>{ const y=-1+Math.random()*1.8, r=radiusAt(y,.08)*Math.sqrt(Math.random()), a=Math.random()*6.283; bp[i*3]=Math.cos(a)*r; bp[i*3+1]=y; bp[i*3+2]=Math.sin(a)*r; bv[i]=.18+Math.random()*.35; };
    for(let i=0;i<N;i++) seed(i);
    const bg=new THREE.BufferGeometry(); bg.setAttribute('position',new THREE.BufferAttribute(bp,3));
    const bubbles=new THREE.Points(bg,new THREE.PointsMaterial({map:dotTex(), size:.038, transparent:true, opacity:.8, depthWrite:false, blending:THREE.AdditiveBlending, color:0xfff1cf})); bubbles.renderOrder=2; pint.add(bubbles);

    /* condensation drops on the outside of the glass */
    const D=mobile?110:190, drops=new THREE.InstancedMesh(new THREE.SphereGeometry(1,10,8), new THREE.MeshPhysicalMaterial({color:0xffffff, roughness:0, transmission:1, transparent:true, opacity:.55, envMapIntensity:3, clearcoat:1}), D);
    const dropData=[];
    for(let i=0;i<D;i++){ const y=-1.0+Math.random()*1.85, a=Math.random()*6.283, r=radiusAt(y)+.006, sz=.006+Math.pow(Math.random(),4)*.022; dropData.push({a,y,sz,v:Math.random()<.06?(.03+Math.random()*.05):0});
      m4.compose(new THREE.Vector3(Math.cos(a)*r,y,Math.sin(a)*r), q, s3.set(sz,sz*1.25,sz)); drops.setMatrixAt(i,m4); } drops.renderOrder=4; pint.add(drops);

    /* coaster + bar top */
    const coaster=new THREE.Mesh(new THREE.CylinderGeometry(1.05,1.05,.05,72), [new THREE.MeshStandardMaterial({color:0xC9A961, roughness:.6}), new THREE.MeshStandardMaterial({color:0x111111, roughness:.9}), new THREE.MeshStandardMaterial({color:0x111111})]);
    coaster.position.y=-1.235; scene.add(coaster);
    const logo=new Image(); logo.onload=()=>{ coaster.material[1]=new THREE.MeshStandardMaterial({map:coasterTex(logo), roughness:.75}); }; logo.src='logo.jpg';
    coaster.material[1]=new THREE.MeshStandardMaterial({map:coasterTex(null), roughness:.75});
    const bar=new THREE.Mesh(new THREE.PlaneGeometry(16,9), new THREE.MeshStandardMaterial({map:woodTex(), roughness:.7, metalness:0, envMapIntensity:.25, color:0x9a8070})); bar.rotation.x=-Math.PI/2; bar.position.y=-1.262; scene.add(bar);
    const sh=new THREE.Mesh(new THREE.PlaneGeometry(3.2,3.2), new THREE.MeshBasicMaterial({map:shadowTex(), transparent:true, depthWrite:false})); sh.rotation.x=-Math.PI/2; sh.position.y=-1.205; scene.add(sh);

    /* interaction */
    const ray=new THREE.Raycaster(), ptr=new THREE.Vector2(); let hover=false, drag=null, spin=0, spinV=.25, tiltX=0, tiltY=0, mx=0, my=0, cheers=0, onBook=null;
    const hitTest=e=>{ const r=renderer.domElement.getBoundingClientRect(); ptr.set(((e.clientX-r.left)/r.width)*2-1, -((e.clientY-r.top)/r.height)*2+1); ray.setFromCamera(ptr,camera); return ray.intersectObjects([glass,beer,foam],false).length>0; };
    const cv=renderer.domElement; cv.style.touchAction='pan-y';
    cv.addEventListener('pointermove',e=>{ const r=cv.getBoundingClientRect(); mx=((e.clientX-r.left)/r.width-.5)*2; my=((e.clientY-r.top)/r.height-.5)*2;
      if(drag){ const dx=e.clientX-drag.x; spinV=dx*.02; spin+=dx*.012; drag.x=e.clientX; drag.moved+=Math.abs(dx); }
      hover=hitTest(e); cv.style.cursor= drag ? 'grabbing' : (hover ? 'pointer' : 'grab'); });
    cv.addEventListener('pointerdown',e=>{ drag={x:e.clientX, moved:0}; });
    cv.addEventListener('pointerleave',()=>{ hover=false; drag=null; mx=my=0; });
    window.addEventListener('pointerup',()=>{ drag=null; });
    cv.addEventListener('click',e=>{ if(drag&&drag.moved>6) return; if(hitTest(e)) toast(); });
    function toast(){ if(cheers>0) return; cheers=1.0; setTimeout(()=>{ onBook&&onBook(); },850); }

    /* render loop — paused when off-screen or the tab is hidden */
    const clock=new THREE.Clock(); let running=false, raf=0, visible=true;
    function frame(){ raf=requestAnimationFrame(frame); const dt=Math.min(clock.getDelta(),.05), t=clock.elapsedTime;
      if(!drag){ spinV+=(.25-spinV)*Math.min(1,dt*1.5); spin+=spinV*dt; }
      tiltX+=((my*.12)-tiltX)*Math.min(1,dt*4); tiltY+=((mx*.18)-tiltY)*Math.min(1,dt*4);
      let lift=Math.sin(t*1.1)*.03, lean=0; if(cheers>0){ cheers=Math.max(0,cheers-dt*.9); const k=Math.sin((1-cheers)*Math.PI); lift+=k*.45; lean=k*.32; }
      pint.rotation.set(tiltX+lean, spin, tiltY*.4); pint.position.y=lift; const hs=hover?1.035:1; pint.scale.lerp(s3.set(hs,hs,hs), Math.min(1,dt*8));
      back.intensity=3.4+Math.sin(t*2.3)*.3+(hover?1:0);
      const p=bg.attributes.position.array;
      for(let i=0;i<N;i++){ p[i*3+1]+=bv[i]*dt; p[i*3]+=Math.sin(t*3+i)*.0009; if(p[i*3+1]>beerTop-.03) seed(i), p[i*3+1]=-1.0; }
      bg.attributes.position.needsUpdate=true;
      let moved=false; for(let i=0;i<D;i++){ const d=dropData[i]; if(!d.v) continue; d.y-=d.v*dt; if(d.y<-1.05){ d.y=.8; d.a=Math.random()*6.283; } const r=radiusAt(d.y)+.006;
        m4.compose(s3.set(Math.cos(d.a)*r,d.y,Math.sin(d.a)*r).clone(), q, new THREE.Vector3(d.sz,d.sz*1.6,d.sz)); drops.setMatrixAt(i,m4); moved=true; }
      if(moved) drops.instanceMatrix.needsUpdate=true;
      renderer.render(scene,camera); }
    function setRun(on){ if(on&&!running){ running=true; clock.getDelta(); frame(); } else if(!on&&running){ running=false; cancelAnimationFrame(raf); } }
    const io=new IntersectionObserver(es=>{ visible=es[0].isIntersecting; setRun(visible&&!document.hidden); },{rootMargin:'120px'}); io.observe(el);
    const vis=()=>setRun(visible&&!document.hidden); document.addEventListener('visibilitychange',vis);
    const rs=()=>{ camera.aspect=W()/H(); camera.fov = W()<560 ? 44 : 30; camera.updateProjectionMatrix(); renderer.setSize(W(),H()); };
    window.addEventListener('resize',rs); rs();
    renderer.render(scene,camera);
    return { set onBook(f){ onBook=f; }, cheers:toast, destroy(){ setRun(false); io.disconnect(); document.removeEventListener('visibilitychange',vis); window.removeEventListener('resize',rs);
      scene.traverse(o=>{ if(o.geometry) o.geometry.dispose(); const m=o.material; (Array.isArray(m)?m:[m]).forEach(x=>{ if(!x) return; if(x.map) x.map.dispose(); x.dispose(); }); });
      renderer.dispose(); cv.remove(); } };
  }

  window.BHPint={
    supported: webglOK,
    async mount(el, onBook){
      if(state) return state; if(!webglOK()) throw new Error('no-webgl');
      await loadThree(); state=build(el); state.onBook=onBook; return state; },
    unmount(){ if(state){ state.destroy(); state=null; } }
  };
})();
