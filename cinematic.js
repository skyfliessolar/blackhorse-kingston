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
  // three r149: the last build with a classic <script> file that also has real glass (transmission). r128 is the last-resort fallback.
  const loadThree=()=> window.THREE ? Promise.resolve() : one('https://cdn.jsdelivr.net/npm/three@0.149.0/build/three.min.js')
      .catch(()=>one('https://unpkg.com/three@0.149.0/build/three.min.js')).catch(()=>one('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js'));
  const webglOK=()=>{ try{ const c=document.createElement('canvas'); return !!(c.getContext('webgl2')||c.getContext('webgl')); }catch(e){ return false; } };

  /* ---------- titles: one span per letter, staggered (the blur-up reveal) ---------- */
  // screen readers get the whole headline (aria-label); the letter spans are for the eye only.
  // A new line in admin text (or <br>) starts a new line here.
  const esc=c=>c.replace(/[&<>]/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[x]));
  function splitTitles(){ sec.querySelectorAll('.cin-title').forEach(t=>{ if(t.dataset.split) return; t.dataset.split='1'; let n=0;
    const lines = t.querySelector('br') ? t.innerHTML.split(/<br\s*\/?>/i).map(h=>{ const d=document.createElement('div'); d.innerHTML=h; return d.textContent; }) : t.textContent.split(/\n|\s\/\s/);
    t.setAttribute('aria-label', lines.map(l=>l.trim()).join(' '));
    t.innerHTML=lines.map(l=>`<span aria-hidden="true">${l.trim().split(/\s+/).map(w=>`<span class="w">${[...w].map(c=>`<span class="ch" style="transition-delay:${(n++*0.03).toFixed(3)}s">${esc(c)}</span>`).join('')}</span>`).join(' ')}</span>`).join('<br>'); }); }
  splitTitles(); addEventListener('bh-content', splitTitles);

  let state=null, started=false;

  function build(lite){
    const T=window.THREE;
    const canvas=document.createElement('canvas'); canvas.className='cin-canvas'; canvas.setAttribute('aria-hidden','true'); stage.prepend(canvas);
    const renderer=new T.WebGLRenderer({canvas, antialias:true, alpha:false, powerPreference:'high-performance'});
    let DPR=Math.min(window.devicePixelRatio||1, lite?1.5:2); renderer.setPixelRatio(DPR);   // sharp on retina phones; steps down by itself if a phone struggles
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
          gl_FragColor=vec4(pow(col,vec3(2.2)),1.0);
          #include <encodings_fragment>
        }`}));
    bg.position.z=-8; bg.renderOrder=-10; camera.add(bg);

    /* --- wooden bar top --- */
    const wood=(()=>{ const c=document.createElement('canvas'); c.width=1024; c.height=256; const x=c.getContext('2d');
      const g=x.createLinearGradient(0,0,0,256); g.addColorStop(0,'#3a2112'); g.addColorStop(.5,'#5a3418'); g.addColorStop(1,'#2e1a0d'); x.fillStyle=g; x.fillRect(0,0,1024,256);
      for(let i=0;i<140;i++){ x.strokeStyle=`rgba(${20+Math.random()*30},${10+Math.random()*12},4,${.18+Math.random()*.25})`; x.lineWidth=1+Math.random()*2.5; x.beginPath(); const y=Math.random()*256;
        x.moveTo(0,y); for(let k=0;k<=8;k++) x.lineTo(k*128, y+Math.sin(k*1.3+i)*6+Math.random()*3); x.stroke(); }
      for(let i=0;i<5;i++){ x.fillStyle='rgba(15,8,3,.5)'; x.beginPath(); x.ellipse(Math.random()*1024,Math.random()*256,14,5,0,0,7); x.fill(); }
      const t=new T.CanvasTexture(c); t.encoding=T.sRGBEncoding; t.wrapS=t.wrapT=T.RepeatWrapping; t.repeat.set(1.5,1); t.anisotropy=4; return t; })();
    const bar=new T.Mesh(new T.BoxGeometry(7,0.14,2.6), new T.MeshStandardMaterial({map:wood, roughness:.55, metalness:.05, envMapIntensity:.1, color:0x9a8070}));
    bar.position.y=-0.07; bar.receiveShadow=true; scene.add(bar);
    const brass=new T.MeshStandardMaterial({color:0xc9a55a, metalness:1, roughness:.22});
    const rail=new T.Mesh(new T.CylinderGeometry(0.035,0.035,7,16), brass); rail.rotation.z=Math.PI/2; rail.position.set(0,-0.03,1.36); scene.add(rail);

    /* --- beer mat with the pub logo --- */
    const logoTex=new T.TextureLoader().load('logo.jpg'); logoTex.encoding=T.sRGBEncoding;
    const mat=new T.Mesh(new T.CylinderGeometry(0.52,0.52,0.012,48), [new T.MeshStandardMaterial({color:0xe9dcc0,roughness:.9}), new T.MeshStandardMaterial({map:logoTex,roughness:.85}), new T.MeshStandardMaterial({color:0xe9dcc0,roughness:.9})]);
    mat.position.y=0.006; mat.rotation.y=0.6; mat.receiveShadow=true; scene.add(mat);

    /* --- the pint: a real nonic glass ---------------------------------------------------------------
       - the glass is a solid with real wall thickness, a rounded lip and a heavy base, and it REFRACTS what's behind
         it (physical transmission, index of refraction 1.5), so it reads as glass rather than a tinted plastic shell
       - the ale is shaded by hand: deep amber looking straight through, glowing gold at the edges and under the head
         (lit ale goes pale under tone mapping); it is cut by a level "surface" plane so it stays flat when the glass tilts
       - a domed, creamy head with a bubbly texture; a nucleation stream of bubbles from the etched base; condensation
         beads on the cold part of the glass; an amber caustic and a contact shadow on the mat */
    const REAL = (parseInt(T.REVISION,10)||0) >= 130;            // transmission needs three r130+
    renderer.localClippingEnabled = true;
    const pint=new T.Group(); scene.add(pint);
    const outer=[[0.29,0],[0.31,0.02],[0.33,0.18],[0.39,1.18],[0.425,1.32],[0.43,1.38],[0.405,1.5],[0.41,1.597]];
    const wallT=0.014;
    const prof=[[0.001,0]].concat(outer, [[0.408,1.606],[0.402,1.608],[0.397,1.6]],
      outer.slice(2).reverse().filter(([r,y])=>y<1.59).map(([r,y])=>[r-wallT,y]), [[0.296,0.075],[0.001,0.075]]).map(([r,y])=>new T.Vector2(r,y));
    const glassMat = REAL
      ? new T.MeshPhysicalMaterial({color:0xffffff, metalness:0, roughness:0.025, transmission:1, thickness:0.035, ior:1.5, specularIntensity:1, envMapIntensity:1.5})
      : new T.MeshPhysicalMaterial({color:0xffffff, metalness:0, roughness:.04, transparent:true, opacity:.1, clearcoat:1, clearcoatRoughness:.03, envMapIntensity:2.2, side:T.DoubleSide, depthWrite:false});
    const glass=new T.Mesh(new T.LatheGeometry(prof,96), glassMat); glass.renderOrder=3; pint.add(glass);
    const innerR=y=>{ for(let i=1;i<outer.length;i++){ const [r0,y0]=outer[i-1],[r1,y1]=outer[i]; if(y<=y1) return r0+(r1-r0)*(y-y0)/(y1-y0)-wallT; } return outer[outer.length-1][0]-wallT; };
    const LEVEL=1.3;
    const aleProf=[[0.001,0.078],[0.292,0.078],[innerR(0.2)-0.004,0.2],[innerR(0.7)-0.004,0.7],[innerR(1.18)-0.004,1.18],[innerR(1.3)-0.004,LEVEL],[0.001,LEVEL]].map(([r,y])=>new T.Vector2(r,y));
    const surf=new T.Plane(new T.Vector3(0,-1,0), 100);          // the level surface of the ale (world space)
    const aleU={uFlick:{value:1}};
    const ALE_FRAG=`
        vec3 aleColour(vec3 n, vec3 v, float h){ float f=1.-abs(dot(n,v));
          vec3 deep=vec3(.24,.05,.004), mid=vec3(.6,.2,.018), edge=vec3(1.,.6,.2);
          vec3 c=mix(deep,mid,.2+.5*smoothstep(.0,1.,h));
          c=mix(c,edge,pow(f,2.4)*.8);
          c+=vec3(.25,.12,.03)*smoothstep(.86,1.,h);
          c+=vec3(.7,.34,.06)*exp(-pow((n.x+.45)*5.,2.))*.6*(.5+.5*h);   // lamp light passing through the ale
          c+=vec3(.5,.22,.04)*exp(-pow((n.x-.6)*6.,2.))*.25;
          return c; }`;
    const ale=new T.Mesh(new T.LatheGeometry(aleProf,64), new T.ShaderMaterial({uniforms:aleU, side:T.DoubleSide, clipping:true, clippingPlanes:[surf], toneMapped:false,
      vertexShader:`#include <clipping_planes_pars_vertex>
        varying vec3 vN; varying vec3 vV; varying float vY;
        void main(){ vec4 mvPosition=modelViewMatrix*vec4(position,1.); vN=normalize(normalMatrix*normal); vV=normalize(-mvPosition.xyz); vY=position.y; gl_Position=projectionMatrix*mvPosition;
          #include <clipping_planes_vertex>
        }`,
      fragmentShader:`#include <clipping_planes_pars_fragment>
        uniform float uFlick; varying vec3 vN; varying vec3 vV; varying float vY;${ALE_FRAG}
        void main(){
          #include <clipping_planes_fragment>
          float h=clamp((vY-.08)/1.22,0.,1.); vec3 c;
          if(gl_FrontFacing) c=aleColour(normalize(vN),normalize(vV),h);
          else c=mix(vec3(.62,.24,.035),vec3(.95,.84,.62),.18);          // looking down onto the surface while it pours
          c*=.93+.07*uFlick;
          gl_FragColor=vec4(pow(c,vec3(2.2)),1.);
          #include <encodings_fragment>
        }`}));
    ale.renderOrder=1; pint.add(ale);
    /* the head: domed a touch above the rim's inside, creamy, made of tiny bubbles */
    const foamTex=(()=>{ const c=document.createElement('canvas'); c.width=512; c.height=128; const x=c.getContext('2d');
      x.fillStyle='#efe3c6'; x.fillRect(0,0,512,128);
      for(let i=0;i<2600;i++){ const r=Math.random()<.92?0.6+Math.random()*1.6:2+Math.random()*3, X=Math.random()*512, Y=Math.random()*128;
        x.fillStyle=`rgba(${150+Math.random()*40},${120+Math.random()*30},${80+Math.random()*30},${.25+Math.random()*.3})`; x.beginPath(); x.arc(X,Y,r,0,7); x.fill();
        x.fillStyle=`rgba(255,252,240,${.5+Math.random()*.4})`; x.beginPath(); x.arc(X-r*.3,Y-r*.3,r*.45,0,7); x.fill(); }
      const t=new T.CanvasTexture(c); t.encoding=T.sRGBEncoding; t.wrapS=t.wrapT=T.RepeatWrapping; t.repeat.set(5,1); t.anisotropy=4; return t; })();
    const headProf=[[0.001,LEVEL-0.004],[innerR(1.3)-0.003,LEVEL-0.004],[innerR(1.38)-0.003,1.38],[innerR(1.5)-0.003,1.5],[innerR(1.56)-0.004,1.555],[0.36,1.578],[0.24,1.592],[0.001,1.598]].map(([r,y])=>new T.Vector2(r,y));
    const headMat=new T.MeshStandardMaterial({color:0xfff6e4, map:foamTex, bumpMap:foamTex, bumpScale:0.004, roughness:.88, emissive:0x2a1a08, emissiveIntensity:.16});
    const head=new T.Mesh(new T.LatheGeometry(headProf,64), headMat); head.renderOrder=2; pint.add(head);
    /* bubbles: a steady stream from the etched spot in the base plus a few strays */
    const NB=lite?70:160, bpos=new Float32Array(NB*3), bsp=new Float32Array(NB);
    const seedB=i=>{ const stream=i%3!==0, a=Math.random()*6.283, r=stream?Math.random()*0.012:Math.random()*0.28; bpos[i*3]=Math.cos(a)*r; bpos[i*3+1]=0.09+Math.random()*1.15; bpos[i*3+2]=Math.sin(a)*r; bsp[i]=stream?0.28+Math.random()*0.1:0.1+Math.random()*0.2; };
    for(let i=0;i<NB;i++) seedB(i);
    const bubGeo=new T.BufferGeometry(); bubGeo.setAttribute('position',new T.BufferAttribute(bpos,3));
    const dot=(()=>{ const c=document.createElement('canvas'); c.width=c.height=32; const x=c.getContext('2d'), g=x.createRadialGradient(16,16,0,16,16,16);
      g.addColorStop(0,'rgba(255,255,255,1)'); g.addColorStop(.25,'rgba(255,255,255,.85)'); g.addColorStop(.6,'rgba(255,255,255,.3)'); g.addColorStop(1,'rgba(0,0,0,0)'); x.fillStyle=g; x.fillRect(0,0,32,32); return new T.CanvasTexture(c); })();
    const bubbles=new T.Points(bubGeo,new T.PointsMaterial({size:0.0105, map:dot, color:0xffd99a, alphaTest:.45})); bubbles.renderOrder=2; pint.add(bubbles);
    /* condensation beads on the cold part of the glass */
    const NC=lite?90:240, beads=new T.InstancedMesh(new T.SphereGeometry(1,8,6), new T.MeshStandardMaterial({color:0xffffff, roughness:.04, metalness:0, transparent:true, opacity:.32, envMapIntensity:2.6}), NC);
    { const o=new T.Object3D(); for(let i=0;i<NC;i++){ const y=0.22+Math.random()*1.04, a=Math.random()*6.283, r=innerR(y)+wallT+0.002, s=0.004+Math.pow(Math.random(),2.2)*0.012;
        o.position.set(Math.cos(a)*r,y,Math.sin(a)*r); o.lookAt(Math.cos(a)*5,y,Math.sin(a)*5); o.scale.set(s,s*1.25,s*0.45); o.updateMatrix(); beads.setMatrixAt(i,o.matrix); } }
    beads.renderOrder=4; pint.add(beads);
    /* amber light thrown through the ale onto the mat, and a soft contact shadow */
    const radial=(stops)=>{ const c=document.createElement('canvas'); c.width=c.height=128; const x=c.getContext('2d'), g=x.createRadialGradient(64,64,0,64,64,64); stops.forEach(([o,col])=>g.addColorStop(o,col)); x.fillStyle=g; x.fillRect(0,0,128,128); return new T.CanvasTexture(c); };
    const caustic=new T.Mesh(new T.PlaneGeometry(1,1), new T.MeshBasicMaterial({map:radial([[0,'rgba(255,170,60,.9)'],[.35,'rgba(230,120,30,.45)'],[1,'rgba(0,0,0,0)']]), transparent:true, blending:T.AdditiveBlending, depthWrite:false, toneMapped:false}));
    caustic.rotation.x=-Math.PI/2; caustic.position.set(-0.42,0.014,-0.34); caustic.rotation.z=0.68; caustic.scale.set(0.95,0.55,1); scene.add(caustic);
    const contact=new T.Mesh(new T.PlaneGeometry(1,1), new T.MeshBasicMaterial({map:radial([[0,'rgba(0,0,0,.55)'],[.6,'rgba(0,0,0,.25)'],[1,'rgba(0,0,0,0)']]), transparent:true, depthWrite:false}));
    contact.rotation.x=-Math.PI/2; contact.position.y=0.0135; contact.scale.set(0.82,0.82,1); scene.add(contact);
    /* the stream that leaves the lip when the pint is poured (a tube rebuilt each frame from a falling arc) */
    const SR=26, SS=8, sPos=new Float32Array((SR+1)*SS*3), sNor=new Float32Array((SR+1)*SS*3), sIdx=[];
    for(let i=0;i<SR;i++) for(let j=0;j<SS;j++){ const a=i*SS+j, b=i*SS+(j+1)%SS, c=(i+1)*SS+j, d=(i+1)*SS+(j+1)%SS; sIdx.push(a,c,b, b,c,d); }
    const sGeoT=new T.BufferGeometry(); sGeoT.setAttribute('position',new T.BufferAttribute(sPos,3)); sGeoT.setAttribute('normal',new T.BufferAttribute(sNor,3)); sGeoT.setIndex(sIdx);
    const streamU={uFoam:{value:0}};
    const stream=new T.Mesh(sGeoT, new T.ShaderMaterial({uniforms:streamU, toneMapped:false,
      vertexShader:'varying vec3 vN; varying vec3 vV; void main(){ vec4 mv=modelViewMatrix*vec4(position,1.); vN=normalize(normalMatrix*normal); vV=normalize(-mv.xyz); gl_Position=projectionMatrix*mv; }',
      fragmentShader:`uniform float uFoam; varying vec3 vN; varying vec3 vV;${ALE_FRAG}
        void main(){ vec3 c=aleColour(normalize(vN),normalize(vV),.7); c=mix(c,vec3(.95,.88,.7),uFoam);
          float spec=pow(max(0.,1.-abs(dot(normalize(vN),normalize(vV)))),6.)*.0+pow(max(0.,dot(reflect(-normalize(vV),normalize(vN)),normalize(vec3(.4,.8,.4)))),40.)*.8;
          c+=vec3(1.,.95,.85)*spec; gl_FragColor=vec4(pow(c,vec3(2.2)),1.);
          #include <encodings_fragment>
        }`}));
    stream.frustumCulled=false; stream.visible=false; scene.add(stream);
    if(!lite){ pint.traverse(o=>{ if(o===ale) o.castShadow=true; }); }

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
    const toScreen=v=>{ const p=v.clone().project(camera), r=canvas.getBoundingClientRect(); return {x:r.left+(p.x+1)/2*r.width, y:r.top+(1-p.y)/2*r.height}; };
    const handOff=v=>{ const {x,y}=toScreen(v); if(window.bhPour) window.bhPour(x,y); else location.hash='#book'; };
    /* tap the pint: it is lifted and tilted like someone pouring it. The ale stays level, reaches the lip and runs out in
       a real stream; that stream then carries on down the page into Book a Table. Afterwards the glass is set back and refilled. */
    let pour=null; const sm=(a,b,x)=>{ x=Math.min(1,Math.max(0,(x-a)/(b-a))); return x*x*(3-2*x); };
    const RIM=[...Array(28)].map((_,i)=>new T.Vector3(Math.cos(i/28*6.283)*0.405,1.604,Math.sin(i/28*6.283)*0.405)), tv=new T.Vector3(), lipW=new T.Vector3(), q0=new T.Quaternion();
    function pourFromPint(){
      const fx=window.bhEffects||{};
      // the lift-and-tilt pour is its own admin switch (off by default): otherwise pour straight down from the pint
      if(reduce || fx.pintTap==='none' || fx.cinemaTilt!==true || pour){ if(!pour){ tv.set(0.38,1.45,0); pint.localToWorld(tv); handOff(tv); } return; }
      camera.updateMatrixWorld(); const right=new T.Vector3().setFromMatrixColumn(camera.matrixWorld,0); right.y=0; right.normalize();
      const fwd=new T.Vector3().setFromMatrixColumn(camera.matrixWorld,2).negate(); fwd.y=0; fwd.normalize();
      const top=new T.Vector3(0,1,0).applyQuaternion(new T.Quaternion().setFromAxisAngle(fwd,0.5));
      pour={t:0, axis:fwd, right, sign: top.dot(right)>0 ? 1 : -1, level:LEVEL, flowT:0, handed:false, back:0};
      setRun(true);
    }
    function resetPint(){ pour=null; pint.position.set(0,0,0); pint.quaternion.identity(); surf.constant=100; head.visible=true; head.position.y=0; head.scale.set(1,1,1); bubbles.visible=true; stream.visible=false; }
    function updatePour(dt){
      if(!pour) return; const P=pour; P.t+=dt; const t=P.t;
      // picked up clear of the bar first (so it never looks knocked over), then tipped like a real pour
      let lift, side, ang;
      if(t<4.0){ lift=0.85*sm(0,.7,t); side=0.35*sm(0,.8,t); ang=0.25*sm(.1,.6,t)+0.55*sm(.5,1.0,t)+0.5*sm(1.0,2.6,t)+0.45*sm(2.6,3.6,t); }
      else { const a=sm(4.0,4.7,t), d=sm(4.3,5.0,t); ang=1.75*(1-a); lift=0.85*(1-d); side=0.35*(1-d); }   // turned upright, set back on the mat
      camera.updateMatrixWorld(); P.axis.setFromMatrixColumn(camera.matrixWorld,2).negate(); P.axis.y=0; P.axis.normalize();
      P.right.setFromMatrixColumn(camera.matrixWorld,0); P.right.y=0; P.right.normalize();
      // keep the tipped glass in frame: on narrow screens slide the base the other way as the top swings out
      const narrow=innerWidth<900; if(narrow){ side=-0.78*Math.sin(ang); lift*=0.7; } else side-=0.25*Math.sin(ang);
      pint.position.copy(P.right).multiplyScalar(side*P.sign); pint.position.y=lift;
      pint.quaternion.setFromAxisAngle(P.axis, P.sign*ang);
      pint.updateMatrixWorld(true);
      // the lowest point of the lip is where the ale leaves the glass
      let low=1e9; for(const r of RIM){ tv.copy(r).applyMatrix4(pint.matrixWorld); if(tv.y<low){ low=tv.y; lipW.copy(tv); } }
      if(t<4.0){
        // a tilted glass keeps its surface through the same point on its axis, until the lip is lower than that: then it spills
        const up=tv.set(0,1,0).applyQuaternion(pint.quaternion).y, restLevel=pint.position.y+LEVEL*up;
        let bottom=1e9; for(const r of RIM){ const b=r.clone(); b.x*=0.72; b.z*=0.72; b.y=0.08; b.applyMatrix4(pint.matrixWorld); bottom=Math.min(bottom,b.y); }
        const spill = restLevel > low-0.006;
        if(spill) P.spilled=true;
        P.level = P.spilled ? Math.min(P.level, restLevel, low-0.006) : Math.min(restLevel, low-0.006);
        const flowing = spill && P.level>bottom+0.01;
        if(flowing){ P.flowT+=dt; P.lastFlow=t; }
        surf.constant=P.level;
        { const k=1-sm(.12,.55,t); head.scale.set(1,Math.max(.02,k),1); head.position.y=(1-k)*LEVEL; head.visible=k>0.03; } bubbles.visible=t<.2;
        // the stream: falls from the lip in an arc, thinning as it speeds up
        if(P.flowT>0 && t-(P.lastFlow||0)<0.18){
          stream.visible=true; streamU.uFoam.value=Math.max(0,.75-P.flowT*1.6);
          const out=tv.copy(lipW).sub(pint.position); out.y=0; out.normalize();
          const len=Math.min(1,P.flowT/.35), g=32, v0=0.55, uMax=P.handed ? Math.sqrt(2*0.27/g) : len*0.62;   // once the page stream takes over, the 3D one stops where it begins
          for(let i=0;i<=SR;i++){ const u=i/SR*uMax, px=lipW.x+out.x*v0*u, py=lipW.y-0.5*g*u*u, pz=lipW.z+out.z*v0*u;
            const vx=out.x*v0, vy=-g*u, vz=out.z*v0, vl=Math.hypot(vx,vy,vz)||1, tx=vx/vl, ty=vy/vl, tz=vz/vl;
            let ax=-tz, az=tx; const al=Math.hypot(ax,az)||1; ax/=al; az/=al;                 // one side vector (horizontal)
            const bx=ty*az-0, by=tz*ax-tx*az, bz=-ty*ax;                                      // the other: tangent x side
            const rr=0.045/Math.sqrt(1+u*14) * (1+0.08*Math.sin(u*90-t*30));
            for(let j=0;j<SS;j++){ const a=j/SS*6.283, ca=Math.cos(a), sa=Math.sin(a), nx=ax*ca+bx*sa, ny=by*sa, nz=az*ca+bz*sa, k=(i*SS+j)*3;
              sPos[k]=px+nx*rr; sPos[k+1]=py+ny*rr; sPos[k+2]=pz+nz*rr; sNor[k]=nx; sNor[k+1]=ny; sNor[k+2]=nz; } }
          sGeoT.attributes.position.needsUpdate=true; sGeoT.attributes.normal.needsUpdate=true;
          if(!P.handed && P.flowT>.32){ P.handed=true; const uH=Math.sqrt(2*0.27/g); tv.set(lipW.x+out.x*v0*uH, lipW.y-0.27, lipW.z+out.z*v0*uH); handOff(tv); }
        } else stream.visible=false;
      } else {
        stream.visible=false;
        const f=sm(5.0,6.3,t); surf.constant=0.08+(LEVEL-0.08)*f; bubbles.visible=f>.9;
        { const k=sm(6.0,6.8,t); head.visible=k>0.02; head.scale.set(1,Math.max(.02,k),1); head.position.y=(1-k)*LEVEL; }
        if(t>6.9) resetPint();
      }
    }
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
    const clock=new T.Clock(); let raf=0, running=false, frames=0, acc=0, quality=lite?2:3, slow=0, cool=2;
    const tmpV=new T.Vector3(), look=new T.Vector3();
    function frame(){
      raf=requestAnimationFrame(frame);
      const raw=clock.getDelta(), dt=Math.min(raw,.05), t=clock.elapsedTime;
      // automatic quality: if the device can't keep up, lower resolution, then drop shadows
      frames++; acc+=raw; if(frames>=60){ const fps=frames/acc; frames=0; acc=0;
        if(t<cool){ /* settling after a change */ } else if(fps<34){ if(++slow>=2 && quality>0){ slow=0; cool=t+4; quality--;
            if(DPR>1.25){ DPR=Math.max(1,DPR*0.75); renderer.setPixelRatio(DPR); size(); }
            else if(renderer.shadowMap.enabled || motes.visible){ renderer.shadowMap.enabled=false; motes.visible=false; beads.visible=false; }
            else if(REAL && glassMat.transmission>0){ glassMat.transmission=0; glassMat.transparent=true; glassMat.opacity=.12; glassMat.depthWrite=false; glassMat.side=T.DoubleSide; glassMat.needsUpdate=true; } } }
        else slow=0; }
      target=progress(); const kS=(reduce||snapCam)?1:1-Math.exp(-dt*4.5); cur+=(target-cur)*kS;
      const kM=1-Math.exp(-dt*3); mx+=(tmx-mx)*kM; my+=(tmy-my)*kM;
      // the camera circles the pint as you scroll (one full turn), rising and closing in through the middle
      const p=cur, phi=p*Math.PI*2 - 0.35, wide=innerWidth>=900;
      const y=1.25+Math.sin(p*Math.PI)*0.6, rad=(wide?5.4:6.9)-Math.sin(p*Math.PI)*0.7;
      tmpV.set(Math.sin(phi)*rad + mx*0.25, y - my*0.15, Math.cos(phi)*rad);
      camera.position.lerp(tmpV, (reduce||snapCam)?1:1-Math.exp(-dt*5));
      // move the pint away from whichever side the words are on (left for 1 & 4, right for 2 & 3)
      const sm=(a,b,x)=>{x=Math.min(1,Math.max(0,(x-a)/(b-a)));return x*x*(3-2*x);};
      const side=wide ? (-1 + 2*sm(0.15,0.27,p) - 2*sm(0.70,0.80,p)) : 0;
      look.set(0, (wide ? 0.85 : 0.2) + pint.position.y*0.55, 0); camera.lookAt(look);   // the camera follows the glass up when it's poured   // phones: pint sits in the top half, words below
      const fo=side*7.5; if(Math.abs(fo-camera.filmOffset)>0.01){ camera.filmOffset=fo; camera.updateProjectionMatrix(); }
      // the sign swings a little; bubbles rise in the ale
      swing.rotation.z=Math.sin(t*0.9)*0.05+Math.sin(t*0.37)*0.02;
      for(let i=0;i<NB;i++){ bpos[i*3+1]+=bsp[i]*dt; bpos[i*3]+=Math.sin(t*3+i)*0.0003; if(bpos[i*3+1]>LEVEL-0.02) seedB(i), bpos[i*3+1]=0.09; }
      bubGeo.attributes.position.needsUpdate=true;
      // embers drift up, swirling harder while you scroll fast
      const vel=Math.abs(target-cur), speed=1+vel*9, turb=vel*0.8;
      for(let i=0;i<NS;i++){ const d=sdat[i], k=i*3;
        spos[k]+=d.vx*dt*speed; spos[k+1]+=d.vy*dt*speed; spos[k+2]+=d.vz*dt*speed;
        const sw=d.sr*(1+turb*4); spos[k]+=Math.sin(t*d.sw+d.ph)*sw*dt; spos[k+2]+=Math.cos(t*d.sw+d.ph)*sw*dt;
        if(spos[k+1]>3.6||Math.abs(spos[k])>3.5||Math.abs(spos[k+2])>3.5){ spos[k+1]=-0.8; spos[k]=(Math.random()-.5)*3; spos[k+2]=(Math.random()-.5)*3; } }
      sGeo.attributes.position.needsUpdate=true;
      motes.position.copy(camera.position); motes.rotation.y=t*0.02; motes.rotation.x=Math.sin(t*0.05)*0.2;
      updatePour(dt);
      lampGlow.intensity=1.3+Math.sin(t*2.1)*0.12+Math.sin(t*5.3)*0.06; aleU.uFlick.value=0.5+Math.sin(t*2.1)*0.35+Math.sin(t*5.3)*0.15;
      U.uTime.value=t; U.uScroll.value=cur; U.uMouse.value.set(mx,-my);
      if(Math.abs(cur-lastShown)>0.002){ story(cur); lastShown=cur; }
      renderer.render(scene,camera);
    }
    const setRun=on=>{ if(on&&!running){ running=true; clock.getDelta(); if(pour && pour.t>0.9) resetPint(); frame(); } else if(!on&&running){ running=false; cancelAnimationFrame(raf); } };
    const io=new IntersectionObserver(es=>setRun(es[0].isIntersecting && !document.hidden),{rootMargin:'200px'}); io.observe(sec);
    const vis=()=>setRun(!document.hidden && sec.getBoundingClientRect().bottom>0 && sec.getBoundingClientRect().top<innerHeight); document.addEventListener('visibilitychange',vis);
    const onSkip=e=>{ e.preventDefault(); const tgt=document.getElementById('welcome')||sec; scrollTo({top:tgt.getBoundingClientRect().top+scrollY-70, behavior:reduce?'auto':'smooth'}); };
    sec.querySelectorAll('[data-cin-skip]').forEach(a=>a.addEventListener('click',onSkip));
    function destroy(){ setRun(false); io.disconnect(); document.removeEventListener('visibilitychange',vis); removeEventListener('resize',size); removeEventListener('pointermove',onMove);
      scene.traverse(o=>{ if(o.geometry) o.geometry.dispose(); const ms=o.material?[].concat(o.material):[]; ms.forEach(m=>{ ['map','emissiveMap','roughnessMap','normalMap'].forEach(k=>m[k]&&m[k].dispose()); m.dispose(); }); });
      if(scene.environment) scene.environment.dispose(); renderer.dispose(); canvas.remove(); }
    // if the graphics card drops the scene, fall back to the plain story rather than a frozen picture
    canvas.addEventListener('webglcontextlost',e=>{ e.preventDefault(); setRun(false); sec.classList.remove('cin-live'); sec.style.removeProperty('--cin-h'); },false);
    story(cur); renderer.render(scene,camera); requestAnimationFrame(()=>canvas.classList.add('ready'));   // fade in over the photo
    // test hook: step the pour animation to a given time (used by the automated checks)
    let snapCam=false;
    const seek=to=>{ snapCam=true; frame(); cancelAnimationFrame(raf); running=false; snapCam=false; if(!pour) pourFromPint(); while(pour && pour.t<to) updatePour(1/60); renderer.render(scene,camera); };
    return { stop(){ setRun(false); }, resume(){ vis(); }, destroy, seek };
  }

  function start(o){
    o=o||{};
    if(started){ state&&state.resume(); return; }
    if(reduce || !webglOK()){ sec.classList.remove('cin-live'); return; }      // plain readable story instead
    started=true;
    sec.style.setProperty('--cin-h', o.lite ? '320vh' : '420vh');
    sec.classList.add('cin-live');
    loadThree().then(()=>{ state=build(!!o.lite); }).catch(e=>{ console.warn('cinema',e); sec.classList.remove('cin-live'); sec.style.removeProperty('--cin-h'); started=false; });
  }
  function goEnd(){ const top=sec.getBoundingClientRect().top+scrollY, span=sec.offsetHeight-innerHeight; scrollTo({top:top+span*0.9, behavior:reduce?'auto':'smooth'}); }
  // switched off by the admin (or a timer): free the graphics memory, not just pause
  function stop(){ if(state){ try{ state.destroy(); }catch(e){} state=null; } started=false; sec.classList.remove('cin-live','scrolled'); sec.style.removeProperty('--cin-h'); }
  window.BHCinema={ start, stop, goEnd, _seek:t=>state&&state.seek(t) };
})();
