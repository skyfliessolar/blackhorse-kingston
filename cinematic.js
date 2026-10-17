/* The Black Horse — "Amber and Time", the cinematic chapter.
   Adapted from two cinematic WebGL briefs ("Bronze and Time" and "Flow Wave") for a real pub:
   - a pint of ale on a wooden bar under a hanging Black Horse sign, lit like a painting (warm lamp, cool window rim light)
   - the camera circles it as you scroll; embers and lamplight dust drift; a slow "liquid ale" wave breathes behind,
     going from molten amber to late-night stout as you scroll
   - four story panels reveal letter by letter; at the end, tapping the pint pours your table (Book a Table)
   Only draws while on screen; lighter on phones; drops quality by itself if a device struggles.
   Uses the same Three.js (r128) the 3D pint uses.                                                         */
(function(){
  'use strict';
  if(window.BHCinema) return;
  const sec=document.getElementById('cinema'); if(!sec) return;
  const stage=sec.querySelector('.cin-stage');
  const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine=matchMedia('(pointer: fine)').matches;
  const one=src=>new Promise((ok,no)=>{ const s=document.createElement('script'); s.src=src; s.onload=ok; s.onerror=()=>{ s.remove(); no(new Error(src)); }; document.head.appendChild(s); });
  const loadThree=()=> window.THREE ? Promise.resolve() : one('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js')
      .catch(()=>one('https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js')).catch(()=>one('https://unpkg.com/three@0.128.0/build/three.min.js'));
  const webglOK=()=>{ try{ const c=document.createElement('canvas'); return !!(c.getContext('webgl2')||c.getContext('webgl')); }catch(e){ return false; } };

  /* ---------- titles: one span per letter, staggered (the blur-up reveal) ---------- */
  sec.querySelectorAll('.cin-title').forEach(t=>{ if(t.dataset.split) return; t.dataset.split='1'; let n=0;
    t.innerHTML=t.innerHTML.split(/(<br\s*\/?>)/i).map(part=>/^<br/i.test(part)?part:[...part].map(c=>c===' '?' ':`<span class="ch" style="transition-delay:${(n++*0.035).toFixed(3)}s">${c.replace(/[&<>]/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[x]))}</span>`).join('')).join(''); });

  let state=null, started=false;

  function build(lite){
    const T=window.THREE;
    const canvas=document.createElement('canvas'); canvas.className='cin-canvas'; canvas.setAttribute('aria-hidden','true'); stage.prepend(canvas);
    const renderer=new T.WebGLRenderer({canvas, antialias:!lite, alpha:false, powerPreference:'high-performance'});
    let DPR=Math.min(window.devicePixelRatio||1, lite?1:1.75); renderer.setPixelRatio(DPR);
    renderer.outputEncoding=T.sRGBEncoding; renderer.toneMapping=T.ACESFilmicToneMapping; renderer.toneMappingExposure=0.9;
    renderer.shadowMap.enabled=!lite; renderer.shadowMap.type=T.PCFSoftShadowMap;
    const scene=new T.Scene(); scene.background=new T.Color('#050403'); scene.fog=new T.FogExp2('#050403',0.045);
    const camera=new T.PerspectiveCamera(lite?52:42,1,0.1,100); camera.position.set(0,1.2,4.4); scene.add(camera);

    /* --- reflections: a tiny pub room (lamps + a cool window) baked into an environment map --- */
    const pm=new T.PMREMGenerator(renderer), env=new T.Scene();
    env.add(new T.Mesh(new T.BoxGeometry(20,10,20), new T.MeshBasicMaterial({color:0x1a0f08, side:T.BackSide})));
    [[-4,3,-6,0xffb060,4,2],[5,2.5,-5,0xffc070,3,2],[0,4.5,6,0xffe2b0,6,1],[-8,2,3,0x9fc4ff,1.5,4]].forEach(([x,y,z,c,w,h])=>{ const m=new T.Mesh(new T.PlaneGeometry(w,h), new T.MeshBasicMaterial({color:c})); m.position.set(x,y,z); m.lookAt(0,1,0); env.add(m); });
    const envMap=pm.fromScene(env,0.04).texture; scene.environment=envMap;

    /* --- light: warm lamp (key), cool moonlit window (rim), faint warm fill --- */
    scene.add(new T.AmbientLight(0xffe8cc,0.12));
    const key=new T.SpotLight(0xffd29a,lite?6:8,30,Math.PI/5,0.85,1.2); key.position.set(3.2,5.5,2.6); key.target.position.set(0,0.6,0); scene.add(key,key.target);
    if(!lite){ key.castShadow=true; key.shadow.mapSize.set(1024,1024); key.shadow.camera.near=1; key.shadow.camera.far=15; key.shadow.bias=-0.0008; }
    const rim=new T.DirectionalLight(0xbcd8ff,1.6); rim.position.set(-5,3,-4); scene.add(rim);
    const fill=new T.DirectionalLight(0xfff0dd,0.35); fill.position.set(-2,-3,3); scene.add(fill);
    const lampGlow=new T.PointLight(0xff9a40,0.9,6,2); lampGlow.position.set(0.2,1.1,0.4); scene.add(lampGlow);

    /* --- the liquid-ale wave behind everything (follows the camera) --- */
    const U={uTime:{value:0}, uRes:{value:new T.Vector2(1,1)}, uMouse:{value:new T.Vector2()}, uScroll:{value:0}};
    const bg=new T.Mesh(new T.PlaneGeometry(30,30), new T.ShaderMaterial({uniforms:U, depthWrite:false, depthTest:false, fog:false,
      vertexShader:'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
      fragmentShader:`uniform float uTime; uniform vec2 uRes; uniform vec2 uMouse; uniform float uScroll;
        void main(){
          vec2 uv=(gl_FragCoord.xy-0.5*uRes.xy)/uRes.y; float aspect=uRes.x/uRes.y; float time=uTime*0.08; float sd=uScroll*5.0;
          vec2 w=uv;
          w.x+=sin(uv.y*2.5+time*0.2+sd)*0.35; w.y+=cos(uv.x*2.5-time*0.15-sd*0.8)*0.35;
          w.x+=sin(uv.y*1.2-time*0.1-sd*1.5)*0.25; w.y+=cos(uv.x*1.2+time*0.18+sd*1.2)*0.25;
          w+=vec2(uScroll*0.04,-uScroll*0.02)+vec2(uMouse.x*aspect*0.05,uMouse.y*0.05);
          float w1=sin(dot(w,vec2(cos(0.6),sin(0.6)))*2.4+time);
          float w2=cos(dot(w,vec2(cos(-0.7),sin(-0.7)))*3.2-time*1.4+w1*0.4);
          float w3=sin(dot(w,vec2(cos(1.2),sin(1.2)))*4.0+time*1.8+w2*0.5);
          float f=w1*0.5+w2*0.35+w3*0.15;
          float crest=pow(max(0.0,1.0-abs(f-0.1)),2.5)*0.5+pow(max(0.0,1.0-abs(f-0.15)),8.0)*0.9;
          // early evening: molten ale amber  ->  closing time: dark stout with a midnight-blue sheen
          vec3 s0=vec3(0.0012,0.0007,0.0003), a0=vec3(0.095,0.045,0.012), b0=vec3(0.055,0.025,0.006), c0=vec3(0.52,0.33,0.12);
          vec3 s1=vec3(0.0006,0.0005,0.0008), a1=vec3(0.035,0.022,0.020), b1=vec3(0.018,0.012,0.014), c1=vec3(0.22,0.26,0.38);
          float t=smoothstep(0.0,1.0,uScroll);
          vec3 col=mix(s0,s1,t);
          col=mix(col,mix(b0,b1,t),smoothstep(-0.6,0.2,f)); col=mix(col,mix(a0,a1,t),smoothstep(0.0,0.8,f));
          col+=mix(c0,c1,t)*crest*1.25;
          // a warm haze glowing in from the corners, like lamps just off-screen
          float corner=smoothstep(0.55,1.25,abs(uv.x)/aspect*2.0)*smoothstep(-0.2,0.6,-uv.y*sign(uv.x));
          col+=vec3(0.16,0.07,0.015)*corner*(1.0-t*0.6);
          col*=1.0-dot(uv,uv)*0.14;
          gl_FragColor=vec4(col,1.0);
        }`}));
    bg.position.z=-8; bg.renderOrder=-10; camera.add(bg);

    /* --- wooden bar top --- */
    const wood=(()=>{ const c=document.createElement('canvas'); c.width=1024; c.height=256; const x=c.getContext('2d');
      const g=x.createLinearGradient(0,0,0,256); g.addColorStop(0,'#3a2112'); g.addColorStop(.5,'#5a3418'); g.addColorStop(1,'#2e1a0d'); x.fillStyle=g; x.fillRect(0,0,1024,256);
      for(let i=0;i<140;i++){ x.strokeStyle=`rgba(${20+Math.random()*30},${10+Math.random()*12},4,${.18+Math.random()*.25})`; x.lineWidth=1+Math.random()*2.5; x.beginPath(); const y=Math.random()*256;
        x.moveTo(0,y); for(let k=0;k<=8;k++) x.lineTo(k*128, y+Math.sin(k*1.3+i)*6+Math.random()*3); x.stroke(); }
      for(let i=0;i<5;i++){ x.fillStyle='rgba(15,8,3,.5)'; x.beginPath(); x.ellipse(Math.random()*1024,Math.random()*256,14,5,0,0,7); x.fill(); }
      const t=new T.CanvasTexture(c); t.encoding=T.sRGBEncoding; t.wrapS=t.wrapT=T.RepeatWrapping; t.repeat.set(1.5,1); t.anisotropy=4; return t; })();
    const bar=new T.Mesh(new T.BoxGeometry(7,0.14,2.6), new T.MeshStandardMaterial({map:wood, roughness:.5, metalness:.05, envMapIntensity:.3, color:0x9a8070}));
    bar.position.y=-0.07; bar.receiveShadow=true; scene.add(bar);
    const brass=new T.MeshStandardMaterial({color:0xc9a55a, metalness:1, roughness:.22});
    const rail=new T.Mesh(new T.CylinderGeometry(0.035,0.035,7,16), brass); rail.rotation.z=Math.PI/2; rail.position.set(0,-0.03,1.36); scene.add(rail);

    /* --- beer mat with the pub logo --- */
    const logoTex=new T.TextureLoader().load('logo.jpg'); logoTex.encoding=T.sRGBEncoding;
    const mat=new T.Mesh(new T.CylinderGeometry(0.52,0.52,0.012,48), [new T.MeshStandardMaterial({color:0xe9dcc0,roughness:.9}), new T.MeshStandardMaterial({map:logoTex,roughness:.85}), new T.MeshStandardMaterial({color:0xe9dcc0,roughness:.9})]);
    mat.position.y=0.006; mat.rotation.y=0.6; mat.receiveShadow=true; scene.add(mat);

    /* --- the pint: nonic glass, ale, creamy head, rising bubbles, condensation glint --- */
    const pint=new T.Group(); scene.add(pint);
    const prof=[[0.001,0],[0.29,0],[0.31,0.02],[0.33,0.18],[0.39,1.18],[0.425,1.32],[0.43,1.38],[0.405,1.5],[0.41,1.6]].map(([r,y])=>new T.Vector2(r,y));
    const glass=new T.Mesh(new T.LatheGeometry(prof,64), new T.MeshPhysicalMaterial({color:0xffffff, metalness:0, roughness:.04, transparent:true, opacity:.16, clearcoat:1, clearcoatRoughness:.03, envMapIntensity:2.2, side:T.DoubleSide, depthWrite:false}));
    glass.castShadow=true; glass.renderOrder=3; pint.add(glass);
    const inner=[[0.001,0.05],[0.285,0.05],[0.305,0.2],[0.365,1.18],[0.39,1.3]].map(([r,y])=>new T.Vector2(r,y));
    const ale=new T.Mesh(new T.LatheGeometry(inner,48), new T.MeshPhysicalMaterial({color:0x8a3a06, emissive:0x2e0e00, emissiveIntensity:.6, roughness:.16, metalness:0, transparent:true, opacity:.96, clearcoat:.7, envMapIntensity:.9}));
    ale.renderOrder=1; pint.add(ale);
    const headGeo=new T.CylinderGeometry(0.405,0.392,0.14,48,3,false); const hp=headGeo.attributes.position;
    for(let i=0;i<hp.count;i++){ if(hp.getY(i)>0.06) hp.setY(i, hp.getY(i)+ (Math.random()*0.012) + Math.sin(hp.getX(i)*20)*0.004); }
    headGeo.computeVertexNormals();
    const head=new T.Mesh(headGeo, new T.MeshStandardMaterial({color:0xefe2c4, roughness:.95, emissive:0x1a0f04, emissiveIntensity:.2})); head.position.y=1.37; head.renderOrder=2; pint.add(head);
    const NB=lite?60:140, bpos=new Float32Array(NB*3), bsp=new Float32Array(NB);
    const seedB=i=>{ const a=Math.random()*6.283, r=Math.random()*0.3; bpos[i*3]=Math.cos(a)*r; bpos[i*3+1]=0.08+Math.random()*1.2; bpos[i*3+2]=Math.sin(a)*r; bsp[i]=0.12+Math.random()*0.25; };
    for(let i=0;i<NB;i++) seedB(i);
    const bubGeo=new T.BufferGeometry(); bubGeo.setAttribute('position',new T.BufferAttribute(bpos,3));
    const dot=(()=>{ const c=document.createElement('canvas'); c.width=c.height=32; const x=c.getContext('2d'), g=x.createRadialGradient(16,16,0,16,16,16);
      g.addColorStop(0,'rgba(255,255,255,1)'); g.addColorStop(.25,'rgba(255,255,255,.85)'); g.addColorStop(.6,'rgba(255,255,255,.3)'); g.addColorStop(1,'rgba(0,0,0,0)'); x.fillStyle=g; x.fillRect(0,0,32,32); return new T.CanvasTexture(c); })();
    const bubbles=new T.Points(bubGeo,new T.PointsMaterial({size:0.022, map:dot, color:0xfff2d0, transparent:true, opacity:.75, depthWrite:false})); bubbles.renderOrder=2; pint.add(bubbles);
    pint.traverse(o=>{ if(o.isMesh){ o.castShadow=!lite; } });

    /* --- the hanging pub sign: wrought-iron bracket, gilt frame, The Black Horse --- */
    const signGroup=new T.Group(); signGroup.position.set(-1.25,2.35,-1.1); signGroup.rotation.y=0.55; scene.add(signGroup);
    const iron=new T.MeshStandardMaterial({color:0x17140f, metalness:.7, roughness:.45});
    const arm=new T.Mesh(new T.CylinderGeometry(0.025,0.025,1.5,10), iron); arm.rotation.z=Math.PI/2; arm.position.set(0.55,0.62,0); signGroup.add(arm);
    const curl=new T.Mesh(new T.TorusGeometry(0.22,0.018,8,40,Math.PI*1.5), iron); curl.position.set(0.05,0.4,0); signGroup.add(curl);
    const swing=new T.Group(); swing.position.set(0.55,0.62,0); signGroup.add(swing);
    [-0.35,0.35].forEach(x=>{ const ch=new T.Mesh(new T.CylinderGeometry(0.008,0.008,0.22,6), iron); ch.position.set(x,-0.11,0); swing.add(ch); });
    const board=new T.Mesh(new T.BoxGeometry(0.95,0.95,0.05), [iron,iron,iron,iron,new T.MeshStandardMaterial({map:logoTex,roughness:.6,metalness:.1}),new T.MeshStandardMaterial({map:logoTex,roughness:.6,metalness:.1})]);
    board.position.y=-0.7; board.castShadow=!lite; swing.add(board);
    const gilt=new T.MeshStandardMaterial({color:0xd6b25e, metalness:1, roughness:.25});
    [[0,-0.2,1,0.05],[0,-1.2,1,0.05],[-0.5,-0.7,0.05,1.05],[0.5,-0.7,0.05,1.05]].forEach(([x,y,w,h])=>{ const f=new T.Mesh(new T.BoxGeometry(w,h,0.07),gilt); f.position.set(x,y,0); swing.add(f); });

    /* --- embers & lamplight sparks rising around the bar (60% amber, 40% creamy foam-white) --- */
    const NS=lite?150:380, spos=new Float32Array(NS*3), scol=new Float32Array(NS*3), sdat=[];
    for(let i=0;i<NS;i++){ spos[i*3]=(Math.random()-.5)*6.5; spos[i*3+1]=(Math.random()-.5)*4+1.2; spos[i*3+2]=(Math.random()-.5)*6.5;
      if(Math.random()<.6){ scol[i*3]=1; scol[i*3+1]=.42+Math.random()*.15; scol[i*3+2]=.06+Math.random()*.08; } else { scol[i*3]=1; scol[i*3+1]=.93; scol[i*3+2]=.8; }
      sdat.push({vx:(Math.random()-.5)*.3, vy:.12+Math.random()*.25, vz:(Math.random()-.5)*.3, sw:.5+Math.random()*1.5, sr:.05+Math.random()*.12, ph:Math.random()*6.28}); }
    const sGeo=new T.BufferGeometry(); sGeo.setAttribute('position',new T.BufferAttribute(spos,3)); sGeo.setAttribute('color',new T.BufferAttribute(scol,3));
    const sparks=new T.Points(sGeo,new T.PointsMaterial({size:0.03, vertexColors:true, transparent:true, opacity:.8, blending:T.AdditiveBlending, depthWrite:false, map:dot})); scene.add(sparks);
    /* --- dust motes floating in the lamplight, travelling with the camera (from the "Flow Wave" brief) --- */
    const NM=lite?70:180, mpos=new Float32Array(NM*3); for(let i=0;i<NM*3;i++) mpos[i]=(Math.random()*2-1)*3;
    const mGeo=new T.BufferGeometry(); mGeo.setAttribute('position',new T.BufferAttribute(mpos,3));
    const motes=new T.Points(mGeo,new T.PointsMaterial({size:0.018, map:dot, color:0xffd9a0, transparent:true, opacity:.35, blending:T.AdditiveBlending, depthWrite:false})); scene.add(motes);

    /* ---------- sizing ---------- */
    function size(){ const w=stage.clientWidth, h=stage.clientHeight; renderer.setSize(w,h,false); camera.aspect=w/h; camera.fov = w<700 ? 54 : 42; camera.updateProjectionMatrix(); U.uRes.value.set(w*DPR,h*DPR); }
    size(); addEventListener('resize',size);

    /* ---------- input ---------- */
    let mx=0,my=0,tmx=0,tmy=0;
    const onMove=e=>{ tmx=(e.clientX/innerWidth)*2-1; tmy=(e.clientY/innerHeight)*2-1; };
    if(fine) addEventListener('pointermove',onMove,{passive:true});
    const ray=new T.Raycaster(), ndc=new T.Vector2();
    function pourFromPint(){ const p=new T.Vector3(0.38,1.45,0); pint.localToWorld(p); p.project(camera); const r=canvas.getBoundingClientRect();
      const x=r.left+(p.x+1)/2*r.width, y=r.top+(1-p.y)/2*r.height; if(window.bhPour) window.bhPour(x,y); else location.hash='#book'; }
    canvas.addEventListener('click',e=>{ const r=canvas.getBoundingClientRect(); ndc.set(((e.clientX-r.left)/r.width)*2-1, -((e.clientY-r.top)/r.height)*2+1); ray.setFromCamera(ndc,camera);
      if(ray.intersectObjects([glass,ale,head],false).length) pourFromPint(); });
    canvas.addEventListener('pointermove',e=>{ if(!fine) return; const r=canvas.getBoundingClientRect(); ndc.set(((e.clientX-r.left)/r.width)*2-1, -((e.clientY-r.top)/r.height)*2+1); ray.setFromCamera(ndc,camera);
      canvas.style.cursor = ray.intersectObjects([glass,ale,head],false).length ? 'pointer' : ''; },{passive:true});
    sec.querySelectorAll('[data-cin-pour]').forEach(a=>a.addEventListener('click',e=>{ e.preventDefault(); pourFromPint(); }));

    /* ---------- scroll → story ---------- */
    const slides=[...sec.querySelectorAll('.cin-slide')], mask=sec.querySelector('.cin-mask'), fills=[...sec.querySelectorAll('.cin-prog s')];
    const RANGES=[[-0.1,0.17],[0.25,0.44],[0.52,0.71],[0.79,1.05]];
    const progress=()=>{ const r=sec.getBoundingClientRect(), span=Math.max(1,sec.offsetHeight-innerHeight); return Math.max(0,Math.min(1,-r.top/span)); };
    let target=progress(), cur=target, lastShown=-1;
    function story(p){
      fills.forEach((f,i)=>{ const k=Math.max(0,Math.min(1,(p-i*.25)/.25)); f.style.transform=`scaleY(${k})`; });
      slides.forEach((s,i)=>s.classList.toggle('on', p>=RANGES[i][0] && p<=RANGES[i][1]));
      if(mask) mask.classList.toggle('on', p>=RANGES[1][0] && p<=RANGES[1][1]);
      sec.classList.toggle('scrolled', p>0.03);
    }
    // a photo from the pub for the second panel, when there is one
    const usePhoto=()=>{ const im=document.querySelector('#pubphotos img[src^="data:image"], #gallery img[src^="data:image"]'); if(im && mask) mask.querySelector('img').src=im.src; };
    addEventListener('bh-gallery',()=>setTimeout(usePhoto,100)); usePhoto();

    /* ---------- loop: draws only while the chapter is on screen ---------- */
    const clock=new T.Clock(); let raf=0, running=false, frames=0, acc=0, quality=lite?1:2;
    const tmpV=new T.Vector3(), look=new T.Vector3();
    function frame(){
      raf=requestAnimationFrame(frame);
      const raw=clock.getDelta(), dt=Math.min(raw,.05), t=clock.elapsedTime;
      // automatic quality: if the device can't keep up, lower resolution, then drop shadows
      frames++; acc+=raw; if(frames>=50){ const fps=frames/acc; frames=0; acc=0;
        if(fps<34 && quality>0){ quality--; if(DPR>1){ DPR=1; renderer.setPixelRatio(1); size(); } else { renderer.shadowMap.enabled=false; motes.visible=false; } } }
      target=progress(); const kS=reduce?1:1-Math.exp(-dt*4.5); cur+=(target-cur)*kS;
      const kM=1-Math.exp(-dt*3); mx+=(tmx-mx)*kM; my+=(tmy-my)*kM;
      // the camera circles the pint as you scroll (one full turn), rising and closing in through the middle
      const p=cur, phi=p*Math.PI*2 - 0.35, wide=innerWidth>=900;
      const y=1.25+Math.sin(p*Math.PI)*0.6, rad=(wide?5.4:6.3)-Math.sin(p*Math.PI)*0.7;
      tmpV.set(Math.sin(phi)*rad + mx*0.25, y - my*0.15, Math.cos(phi)*rad);
      camera.position.lerp(tmpV, reduce?1:1-Math.exp(-dt*5));
      // move the pint away from whichever side the words are on (left for 1 & 4, right for 2 & 3)
      const sm=(a,b,x)=>{x=Math.min(1,Math.max(0,(x-a)/(b-a)));return x*x*(3-2*x);};
      const side=wide ? (-1 + 2*sm(0.15,0.27,p) - 2*sm(0.70,0.80,p)) : 0;
      look.set(0, 0.85 - (wide?0:0.15), 0); camera.lookAt(look);
      const fo=side*7.5; if(Math.abs(fo-camera.filmOffset)>0.01){ camera.filmOffset=fo; camera.updateProjectionMatrix(); }
      // the sign swings a little; bubbles rise in the ale
      swing.rotation.z=Math.sin(t*0.9)*0.05+Math.sin(t*0.37)*0.02;
      for(let i=0;i<NB;i++){ bpos[i*3+1]+=bsp[i]*dt; bpos[i*3]+=Math.sin(t*3+i)*0.0004; if(bpos[i*3+1]>1.3) seedB(i), bpos[i*3+1]=0.08; }
      bubGeo.attributes.position.needsUpdate=true;
      // embers drift up, swirling harder while you scroll fast
      const vel=Math.abs(target-cur), speed=1+vel*9, turb=vel*0.8;
      for(let i=0;i<NS;i++){ const d=sdat[i], k=i*3;
        spos[k]+=d.vx*dt*speed; spos[k+1]+=d.vy*dt*speed; spos[k+2]+=d.vz*dt*speed;
        const sw=d.sr*(1+turb*4); spos[k]+=Math.sin(t*d.sw+d.ph)*sw*dt; spos[k+2]+=Math.cos(t*d.sw+d.ph)*sw*dt;
        if(spos[k+1]>3.6||Math.abs(spos[k])>3.5||Math.abs(spos[k+2])>3.5){ spos[k+1]=-0.8; spos[k]=(Math.random()-.5)*3; spos[k+2]=(Math.random()-.5)*3; } }
      sGeo.attributes.position.needsUpdate=true;
      motes.position.copy(camera.position); motes.rotation.y=t*0.02; motes.rotation.x=Math.sin(t*0.05)*0.2;
      lampGlow.intensity=1.3+Math.sin(t*2.1)*0.12+Math.sin(t*5.3)*0.06;
      U.uTime.value=t; U.uScroll.value=cur; U.uMouse.value.set(mx,-my);
      if(Math.abs(cur-lastShown)>0.002){ story(cur); lastShown=cur; }
      renderer.render(scene,camera);
    }
    const setRun=on=>{ if(on&&!running){ running=true; clock.getDelta(); frame(); } else if(!on&&running){ running=false; cancelAnimationFrame(raf); } };
    const io=new IntersectionObserver(es=>setRun(es[0].isIntersecting && !document.hidden),{rootMargin:'200px'}); io.observe(sec);
    const vis=()=>setRun(!document.hidden && sec.getBoundingClientRect().bottom>0 && sec.getBoundingClientRect().top<innerHeight); document.addEventListener('visibilitychange',vis);
    story(cur); renderer.render(scene,camera);
    return { stop(){ setRun(false); }, resume(){ vis(); } };
  }

  function start(o){
    o=o||{};
    if(started){ state&&state.resume(); return; }
    if(reduce || !webglOK()){ sec.classList.remove('cin-live'); return; }      // plain readable story instead
    started=true;
    sec.style.setProperty('--cin-h', o.lite ? '320vh' : '420vh');
    sec.classList.add('cin-live');
    loadThree().then(()=>{ state=build(!!o.lite); }).catch(e=>{ console.warn('cinema',e); sec.classList.remove('cin-live'); started=false; });
  }
  function goEnd(){ const top=sec.getBoundingClientRect().top+scrollY, span=sec.offsetHeight-innerHeight; scrollTo({top:top+span*0.9, behavior:reduce?'auto':'smooth'}); }
  window.BHCinema={ start, stop(){ state&&state.stop(); }, goEnd };
})();
