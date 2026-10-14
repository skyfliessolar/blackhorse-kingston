/* The Black Horse — staff tools inside the website.
   Loaded only when someone opens "Staff login". Shows only the areas the main admin approved. */
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, addDoc, onSnapshot, writeBatch,
  serverTimestamp, query, where } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const app = getApps()[0] || initializeApp(firebaseConfig), auth = getAuth(app), db = getFirestore(app);
const $ = id => document.getElementById(id);
const esc = s => s==null ? '' : String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money = n => '£' + Number(n||0).toFixed(2).replace(/\.00$/,'');
const todayISO = () => { const d=new Date(); d.setMinutes(d.getMinutes()-d.getTimezoneOffset()); return d.toISOString().slice(0,10); };
const fmtD = iso => { const d=new Date(iso+'T00:00'); return isNaN(d) ? iso : d.toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'}); };
const tsMs = t => t&&t.toMillis ? t.toMillis() : (t&&t.seconds ? t.seconds*1000 : 0);
const STAFF_DOMAIN = 'blackhorsedrunkenwok.co.uk';
const loginId = v => { v=String(v||'').trim(); return v.includes('@') ? v : v.toLowerCase().replace(/[^a-z0-9._-]/g,'')+'@'+STAFF_DOMAIN; };
const store = { get(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } }, set(k,v){ try{ localStorage.setItem(k,v); }catch(e){} }, del(k){ try{ localStorage.removeItem(k); }catch(e){} } };
const sess = { get(k){ try{ return sessionStorage.getItem(k); }catch(e){ return null; } }, set(k,v){ try{ sessionStorage.setItem(k,v); }catch(e){} } };

/* ---------------- look ---------------- */
document.head.insertAdjacentHTML('beforeend', `<style>
.sf-modal{position:fixed;inset:0;z-index:1200;background:rgba(6,5,4,.78);backdrop-filter:blur(3px);display:flex;align-items:center;justify-content:center;padding:18px;}
.sf-modal[hidden]{display:none;}
.sf-card{background:#151310;border:1px solid var(--gold-dark);border-radius:4px;max-width:380px;width:100%;padding:28px 26px;color:var(--cream);box-shadow:0 30px 80px rgba(0,0,0,.6);}
.sf-card h3{color:var(--gold-light);font-size:24px;margin:6px 0 6px;}
.sf-card p{font-size:14.5px;color:rgba(241,232,214,.75);margin:0 0 16px;}
.sf-in{width:100%;background:rgba(241,232,214,.06);border:1px solid var(--line-dark);color:var(--cream);padding:12px 13px;font:inherit;font-size:16px;border-radius:2px;margin:0 0 12px;}
.sf-in:focus{outline:none;border-color:var(--gold);}
.sf-lbl{display:block;font-family:'Oswald',sans-serif;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--gold);margin-bottom:6px;}
.sf-err{color:#F0A496;font-size:14px;min-height:20px;}
.sf-x{float:right;background:none;border:none;color:var(--cream);font-size:26px;line-height:1;cursor:pointer;opacity:.7;}
.sf-bar{position:fixed;left:50%;bottom:16px;transform:translateX(-50%);z-index:1100;display:flex;align-items:center;gap:6px;background:#151310;border:1px solid var(--gold);border-radius:999px;padding:6px 6px 6px 16px;box-shadow:0 12px 40px rgba(0,0,0,.55);color:var(--cream);font-size:14px;max-width:calc(100vw - 24px);}
.sf-bar[hidden]{display:none;}
.sf-bar b{color:var(--gold-light);font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:34vw;}
.sf-bar button{border:none;border-radius:999px;padding:9px 14px;font-family:'Oswald',sans-serif;letter-spacing:.08em;text-transform:uppercase;font-size:12px;cursor:pointer;white-space:nowrap;}
.sf-bar .go{background:var(--gold);color:#0C0B09;position:relative;}
.sf-bar .out{background:transparent;color:var(--cream);border:1px solid var(--line-dark);}
.sf-badge{position:absolute;top:-7px;right:-6px;background:#D9534F;color:#fff;border-radius:999px;font-size:11px;min-width:20px;height:20px;line-height:20px;padding:0 5px;letter-spacing:0;}
.sf-panel{position:fixed;inset:0;z-index:1150;background:#0C0B09;color:var(--cream);display:flex;flex-direction:column;}
.sf-panel[hidden]{display:none;}
.sf-head{display:flex;align-items:center;gap:12px;padding:14px 18px;border-bottom:1px solid var(--line-dark);}
.sf-head h2{font-size:20px;color:var(--gold-light);margin:0;flex:1;}
.sf-head .who{font-size:13px;color:rgba(241,232,214,.65);}
.sf-tabs{display:flex;gap:6px;overflow-x:auto;padding:10px 18px;border-bottom:1px solid var(--line-dark);scrollbar-width:none;}
.sf-tabs button{flex:0 0 auto;background:transparent;border:1px solid var(--line-dark);color:var(--cream);padding:9px 14px;border-radius:999px;font-family:'Oswald',sans-serif;letter-spacing:.08em;text-transform:uppercase;font-size:12px;cursor:pointer;position:relative;}
.sf-tabs button.on{background:var(--gold);color:#0C0B09;border-color:var(--gold);}
.sf-body{flex:1;overflow:auto;padding:18px;max-width:980px;width:100%;margin:0 auto;}
.sf-body h3{color:var(--gold-light);font-size:20px;margin:4px 0 12px;}
.sf-row{background:#151310;border:1px solid var(--line-dark);border-radius:3px;padding:12px 14px;margin-bottom:10px;}
.sf-row.urgent{border-left:4px solid #D9534F;}
.sf-row .top{display:flex;gap:10px;align-items:center;flex-wrap:wrap;}
.sf-row .top b{font-size:16px;}
.sf-row .sub{font-size:13.5px;color:rgba(241,232,214,.7);margin-top:3px;}
.sf-row a{color:var(--gold-light);}
.sf-sel{background:#0C0B09;color:var(--cream);border:1px solid var(--line-dark);padding:7px 8px;border-radius:2px;font:inherit;font-size:14px;}
.sf-btn{background:var(--gold);color:#0C0B09;border:none;padding:10px 16px;border-radius:2px;font-family:'Oswald',sans-serif;letter-spacing:.08em;text-transform:uppercase;font-size:12.5px;cursor:pointer;}
.sf-btn.ghost{background:transparent;color:var(--cream);border:1px solid var(--line-dark);}
.sf-btn.danger{background:transparent;color:#F0A496;border:1px solid #8a3b30;}
.sf-btn:disabled{opacity:.5;cursor:wait;}
.sf-msg{min-height:20px;font-size:14px;color:#8FD19E;margin:8px 0;}
.sf-msg.bad{color:#F0A496;}
.sf-toast{margin:0;padding:0 18px;max-width:980px;width:100%;align-self:center;min-height:0;}
.sf-toast:not(:empty){padding:10px 18px;}
.sf-tools{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:14px;}
.sf-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px;}
.sf-grid figure{margin:0;background:#151310;border:1px solid var(--line-dark);padding:5px;}
.sf-grid img{width:100%;aspect-ratio:4/3;object-fit:cover;display:block;}
.sf-mi{display:grid;grid-template-columns:1fr 130px 60px;gap:8px;align-items:center;padding:7px 0;border-bottom:1px solid rgba(228,206,147,.08);}
.sf-mi input[type=text]{background:rgba(241,232,214,.06);border:1px solid var(--line-dark);color:var(--cream);padding:8px;font:inherit;font-size:14px;border-radius:2px;width:100%;}
.sf-mi.off .nm{opacity:.45;text-decoration:line-through;}
.sf-mi label{font-size:12px;display:flex;gap:4px;align-items:center;}
.sf-cat{font-family:'Oswald',sans-serif;letter-spacing:.12em;text-transform:uppercase;color:var(--gold);font-size:13px;margin:18px 0 4px;}
.sf-v{border:2px solid var(--line-dark);border-radius:3px;padding:14px;margin-top:12px;}
.sf-v.ok{border-color:#3f8a55;background:rgba(63,138,85,.12);} .sf-v.bad{border-color:#a94a3d;background:rgba(169,74,61,.12);}
.sf-v .st{font-family:'Oswald',sans-serif;letter-spacing:.08em;text-transform:uppercase;font-size:20px;}
.sf-scan{position:relative;max-width:340px;aspect-ratio:1;background:#000;border-radius:4px;overflow:hidden;margin-bottom:10px;}
.sf-scan video{width:100%;height:100%;object-fit:cover;}
.pub-add{display:flex;justify-content:center;gap:10px;margin:0 0 22px;flex-wrap:wrap;}
.pub-del{position:absolute;top:8px;right:8px;background:rgba(12,11,9,.8);color:#F0A496;border:1px solid #8a3b30;border-radius:999px;padding:5px 10px;font-size:12px;cursor:pointer;z-index:2;}
#pubphotos figure{position:relative;}
@media(max-width:600px){ .sf-mi{grid-template-columns:1fr 100px;} .sf-mi label{grid-column:1/-1;} .sf-bar{font-size:13px;} }
</style>`);

/* ---------------- markup ---------------- */
document.body.insertAdjacentHTML('beforeend', `
<div class="sf-modal" id="sfLogin" hidden><form class="sf-card" id="sfLoginForm" novalidate>
  <button type="button" class="sf-x" id="sfLoginX" aria-label="Close">&times;</button>
  <span class="eyebrow">The Black Horse</span><h3>Staff login</h3><p>Sign in with the username and password from your manager.</p>
  <label class="sf-lbl" for="sfUser">Username</label><input class="sf-in" id="sfUser" autocomplete="username" autocapitalize="none" spellcheck="false">
  <label class="sf-lbl" for="sfPass">Password</label><input class="sf-in" id="sfPass" type="password" autocomplete="current-password">
  <div class="sf-err" id="sfLoginErr"></div><button class="sf-btn" id="sfLoginBtn" style="width:100%">Sign in</button></form></div>
<div class="sf-modal" id="sfName" hidden><form class="sf-card" id="sfNameForm">
  <span class="eyebrow">Shared staff login</span><h3>Who's working?</h3><p>Type your first name so your changes are recorded under your name.</p>
  <input class="sf-in" id="sfNameIn" maxlength="40" autocomplete="off"><button class="sf-btn" style="width:100%">Continue</button></form></div>
<div class="sf-bar" id="sfBar" hidden><span>👤 <b id="sfWho"></b></span><button class="go" id="sfOpen">Staff tools<span class="sf-badge" id="sfBadge" hidden></span></button><button class="out" id="sfOut">Sign out</button></div>
<div class="sf-panel" id="sfPanel" hidden role="dialog" aria-label="Staff tools">
  <div class="sf-head"><h2>Staff tools</h2><span class="who" id="sfWho2"></span><button class="sf-btn ghost" id="sfClose">Back to website</button></div>
  <div class="sf-tabs" id="sfTabs"></div><div class="sf-msg sf-toast" id="sfMsg" role="status"></div><div class="sf-body" id="sfBody"></div></div>`);

/* ---------------- state ---------------- */
let me=null, perms={}, isOwner=false, isShared=false, staffName='', tab='', unsubs=[];
let bookings=[], offers=[], gallery=[], hires=[], messages=[], menuData=null, menuSaved='';
const LEGACY={bookings:true,hire:true,messages:true,calls:true};
const can = p => isOwner || perms[p]===true;
const TABS=[['bookings','Bookings','bookings'],['offers','Offers','offers'],['menu','Menu prices','menu'],['photos','Pub photos','pubphotos'],
  ['codes','Discount codes','vouchers'],['inbox','Messages','messages','hire']];

/* ---------------- activity log (same log the main admin reads) ---------------- */
async function logAct(area, text){
  try{ const e={at:serverTimestamp(), by: isOwner ? 'Main admin' : (me?.email||'').toLowerCase(), area:String(area).slice(0,40), text:String(text).slice(0,300)};
    if(isShared && staffName) e.name=staffName.slice(0,40);
    await addDoc(collection(db,'logs'), e); }catch(err){ console.warn('log', err); }
}
function say(t, bad){ const m=$('sfMsg'); if(!m) return; m.textContent=t; m.classList.toggle('bad',!!bad); clearTimeout(m._t); m._t=setTimeout(()=>{ m.textContent=''; }, bad?7000:3500); }
const FRIENDLY={'permission-denied':"You don't have access to do that.",'unavailable':'No internet connection — please try again.'};
const fail = e => { console.error(e); say((e&&FRIENDLY[e.code])||'Something went wrong — please try again.', true); };

/* ---------------- login ---------------- */
export function openLogin(){
  if(auth.currentUser){ openPanel(); return; }
  $('sfLogin').hidden=false; $('sfLoginErr').textContent=''; setTimeout(()=>$('sfUser').focus(),50);
}
$('sfLoginX').onclick=()=>{ $('sfLogin').hidden=true; };
$('sfLogin').addEventListener('click',e=>{ if(e.target.id==='sfLogin') $('sfLogin').hidden=true; });
$('sfLoginForm').onsubmit=async e=>{
  e.preventDefault(); const u=$('sfUser').value, p=$('sfPass').value; $('sfLoginErr').textContent='';
  if(!u.trim()||!p) return $('sfLoginErr').textContent='Please enter your username and password.';
  $('sfLoginBtn').disabled=true;
  try{ await signInWithEmailAndPassword(auth, loginId(u), p); $('sfPass').value=''; $('sfLogin').hidden=true; store.set('bh_staff','1'); }
  catch(err){ $('sfLoginErr').textContent = ['auth/invalid-credential','auth/wrong-password','auth/user-not-found','auth/invalid-email'].includes(err.code) ? 'Username or password is not right.' : err.code==='auth/too-many-requests' ? 'Too many tries — please wait a few minutes.' : 'Could not sign in — check your connection.'; }
  finally{ $('sfLoginBtn').disabled=false; }
};
function askName(){ return new Promise(res=>{
  const saved=sess.get('bh_staffname'); const done=n=>{ staffName=n; sess.set('bh_staffname',n); $('sfName').hidden=true; res(); };
  if(saved) return done(saved);
  $('sfName').hidden=false; setTimeout(()=>$('sfNameIn').focus(),50);
  $('sfNameForm').onsubmit=e=>{ e.preventDefault(); const n=$('sfNameIn').value.trim().replace(/\s+/g,' ').slice(0,40); if(n.length<2) return $('sfNameIn').focus(); done(n); };
}); }
$('sfOut').onclick=async()=>{ await signOut(auth); store.del('bh_staff'); try{ sessionStorage.removeItem('bh_staffname'); }catch(e){} location.hash=''; };
$('sfOpen').onclick=()=>openPanel();
$('sfClose').onclick=()=>closePanel();

onAuthStateChanged(auth, async user=>{
  unsubs.forEach(u=>u()); unsubs=[]; me=user; perms={}; isOwner=false; isShared=false;
  if(!user){ $('sfBar').hidden=true; closePanel(); pubTools(); return; }
  try{ await getDocs(collection(db,'staff')); isOwner=true; }catch(e){ isOwner=false; }
  if(!isOwner){
    try{ const s=await getDoc(doc(db,'staff',user.email.toLowerCase())); if(s.exists()){ perms=s.data().perms||LEGACY; isShared=s.data().shared===true; } }catch(e){}
    if(!Object.values(perms).some(Boolean)){ alert('This login has no staff access yet. Ask the manager to switch on what you can use.'); await signOut(auth); store.del('bh_staff'); return; }
  }
  if(isShared) await askName();
  const who = isOwner ? 'Main admin' : (isShared ? staffName : user.email.split('@')[0]);
  $('sfWho').textContent=who; $('sfWho2').textContent=who+(isShared?' · shared login':''); $('sfBar').hidden=false;
  store.set('bh_staff','1'); startData(); pubTools();
  if(location.hash==='#staff') openPanel();
});

/* ---------------- live data ---------------- */
function startData(){
  if(can('bookings')) unsubs.push(onSnapshot(query(collection(db,'bookings'), where('date','>=', todayISO())), s=>{ bookings=s.docs.map(d=>({id:d.id,...d.data()})); refresh(); }, e=>console.warn(e)));
  if(can('offers')) unsubs.push(onSnapshot(collection(db,'offers'), s=>{ offers=s.docs.map(d=>({id:d.id,...d.data()})); refresh(); }));
  if(can('pubphotos')||can('photos')) unsubs.push(onSnapshot(collection(db,'gallery'), s=>{ gallery=s.docs.map(d=>({id:d.id,...d.data()})); refresh(); pubTools(); }));
  if(can('hire')) unsubs.push(onSnapshot(collection(db,'hireEnquiries'), s=>{ hires=s.docs.map(d=>({id:d.id,...d.data()})); refresh(); }, e=>console.warn(e)));
  if(can('messages')) unsubs.push(onSnapshot(collection(db,'messages'), s=>{ messages=s.docs.map(d=>({id:d.id,...d.data()})); refresh(); }, e=>console.warn(e)));
}
const needsTable = b => b.tableId==='request' && b.status!=='cancelled' && b.status!=='confirmed';
function badgeCount(){ return bookings.filter(b=>needsTable(b) || (b.seen===false && b.status!=='cancelled')).length + hires.filter(h=>h.status==='new').length + messages.filter(m=>m.seen===false).length; }
function refresh(){ const n=badgeCount(); $('sfBadge').textContent=n; $('sfBadge').hidden=!n; if(!$('sfPanel').hidden) render(); }

/* ---------------- panel ---------------- */
function myTabs(){ return TABS.filter(t=>t.slice(2).some(p=>can(p))); }
function openPanel(){ const t=myTabs(); if(!t.length) return; if(!t.find(x=>x[0]===tab)) tab=t[0][0];
  $('sfPanel').hidden=false; document.body.style.overflow='hidden'; if(location.hash!=='#staff') history.replaceState(null,'','#staff'); render(); }
function closePanel(){ $('sfPanel').hidden=true; document.body.style.overflow=''; stopScan(); if(location.hash==='#staff') history.replaceState(null,'',location.pathname+location.search); }
$('sfTabs').onclick=e=>{ const b=e.target.closest('[data-t]'); if(b){ tab=b.dataset.t; stopScan(); render(); } };
function render(){
  const tabs=myTabs(); $('sfTabs').innerHTML=tabs.map(([k,n])=>`<button data-t="${k}" class="${k===tab?'on':''}">${n}</button>`).join('');
  const body=$('sfBody');
  ({bookings:rBookings, offers:rOffers, menu:rMenu, photos:rPhotos, codes:rCodes, inbox:rInbox})[tab]?.(body);
}

/* ---- bookings ---- */
let bDate='';
function rBookings(body){
  bDate = bDate || todayISO();
  const urgent=bookings.filter(needsTable).sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time));
  const day=bookings.filter(b=>b.date===bDate).sort((a,b)=>(a.time||'').localeCompare(b.time||''));
  const row=(b,u)=>`<div class="sf-row ${u?'urgent':''}"><div class="top"><b>${esc(b.time)} · ${esc(b.name)}</b><span>${esc(b.guests)} guests</span>
      <select class="sf-sel" data-bs="${esc(b.id)}" style="margin-left:auto">${['pending','confirmed','cancelled'].map(s=>`<option value="${s}" ${b.status===s?'selected':''}>${s[0].toUpperCase()+s.slice(1)}</option>`).join('')}</select></div>
    <div class="sub">${u?'⚠️ Needs a table · '+esc(fmtD(b.date))+' · ':''}${esc(b.tableName||'')} · <a href="tel:${esc(b.phone)}">${esc(b.phone)}</a>${b.notes?' · “'+esc(b.notes)+'”':''}${b.seen===false?' · <b style="color:#F0C36D">NEW</b>':''}</div></div>`;
  body.innerHTML=`
    ${urgent.length?`<h3>⚠️ Need a table (${urgent.length})</h3><p class="sub" style="margin:-6px 0 10px;color:rgba(241,232,214,.7)">Booked at a busy time or a big group — arrange the seating, call the customer, then set to Confirmed.</p>${urgent.map(b=>row(b,true)).join('')}`:''}
    <div class="sf-tools"><h3 style="margin:0;flex:1">Bookings</h3><input type="date" class="sf-sel" id="sfDate" value="${bDate}"><button class="sf-btn ghost" id="sfToday">Today</button></div>
    ${day.length?day.map(b=>row(b,needsTable(b))).join(''):'<p style="color:rgba(241,232,214,.6)">No bookings on this day.</p>'}`;
  $('sfDate').onchange=e=>{ bDate=e.target.value||todayISO(); render(); }; $('sfToday').onclick=()=>{ bDate=todayISO(); render(); };
  const unseen=day.filter(b=>b.seen===false); if(unseen.length){ const w=writeBatch(db); unseen.forEach(b=>w.update(doc(db,'bookings',b.id),{seen:true})); w.commit().catch(()=>{}); }
}
const keysOf=b=> (b.locks&&b.locks.length) ? b.locks : [];
$('sfBody').addEventListener('change', async e=>{
  const id=e.target.dataset.bs; if(!id) return; const b=bookings.find(x=>x.id===id), s=e.target.value; if(!b) return;
  const w=writeBatch(db); w.update(doc(db,'bookings',b.id),{status:s, seen:true});
  if(s==='cancelled' && b.status!=='cancelled') keysOf(b).forEach(k=>w.delete(doc(db,'tableLocks',k)));
  if(b.status==='cancelled' && s!=='cancelled') keysOf(b).forEach(k=>{ const [d,t,tid]=k.split('_'); w.set(doc(db,'tableLocks',k),{date:d,time:t,tableId:tid,bookingId:b.id}); });
  try{ await w.commit(); say(s==='cancelled'?'Cancelled — the table is free again.':'Updated.'); logAct('Bookings', `${b.name} · ${b.date} ${b.time} · ${b.guests} guests → ${s}`); }
  catch(err){ fail(err.code==='permission-denied' && s!=='cancelled' ? {code:'x'} : err); if(err.code==='permission-denied'&&s!=='cancelled') say('That table has been booked by someone else since.',true); render(); }
});

/* ---- offers ---- */
function rOffers(body){
  const l=offers.slice().sort((a,b)=>(a.order||0)-(b.order||0)), t=todayISO();
  body.innerHTML=`<div class="sf-tools"><h3 style="margin:0;flex:1">Offers &amp; discounts</h3><button class="sf-btn" id="sfAddOffer">+ New offer</button></div>
  ${l.map(o=>{ const live=o.active!==false && (!o.from||o.from<=t) && (!o.to||o.to>=t);
    return `<div class="sf-row" data-oid="${esc(o.id)}"><div class="top"><span>${live?'🟢 On the website':'⚪ Not showing'}</span>
      <label style="margin-left:auto;display:flex;gap:6px;align-items:center"><input type="checkbox" data-of="active" ${o.active!==false?'checked':''}> On</label><button class="sf-btn danger" data-odel>Delete</button></div>
      <div class="sf-mi" style="grid-template-columns:110px 1fr"><input type="text" data-of="badge" value="${esc(o.badge||'')}" placeholder="Badge" maxlength="20"><input type="text" data-of="title" value="${esc(o.title||'')}" placeholder="Title" maxlength="80"></div>
      <div class="sf-mi" style="grid-template-columns:1fr 1fr"><input type="text" data-of="text" value="${esc(o.text||'')}" placeholder="Details" maxlength="300"><input type="text" data-of="when" value="${esc(o.when||'')}" placeholder="When (e.g. Tuesdays 5–9pm)" maxlength="80"></div></div>`; }).join('') || '<p style="color:rgba(241,232,214,.6)">No offers yet.</p>'}`;
  $('sfAddOffer').onclick=async()=>{ try{ await addDoc(collection(db,'offers'),{badge:'NEW',title:'New offer',text:'',when:'',from:'',to:'',active:false,order:offers.length,createdAt:serverTimestamp()}); say('Offer added — fill it in and tick On.'); logAct('Offers','New offer added'); }catch(e){ fail(e); } };
}
$('sfBody').addEventListener('change', async e=>{
  const card=e.target.closest('[data-oid]'), f=e.target.dataset.of; if(!card||!f) return; const o=offers.find(x=>x.id===card.dataset.oid)||{};
  const v = f==='active' ? e.target.checked : e.target.value.trim();
  try{ await updateDoc(doc(db,'offers',card.dataset.oid),{[f]:v}); say('Saved — live on the website.'); window.bhReloadOffers?.();
    logAct('Offers', f==='active' ? `Offer "${o.title||''}" switched ${v?'ON':'OFF'}` : `Offer "${o.title||''}": ${f} → "${String(v).slice(0,60)}"`); }catch(err){ fail(err); }
});
$('sfBody').addEventListener('click', async e=>{
  if(!e.target.matches('[data-odel]')) return; const id=e.target.closest('[data-oid]').dataset.oid, o=offers.find(x=>x.id===id)||{};
  if(!confirm('Delete this offer?')) return;
  try{ await deleteDoc(doc(db,'offers',id)); say('Offer deleted.'); window.bhReloadOffers?.(); logAct('Offers',`Deleted offer "${o.title||''}"`); }catch(err){ fail(err); }
});

/* ---- menu prices ---- */
async function loadMenu(){
  try{ const s=await getDoc(doc(db,'site','menu')); menuData = s.exists() ? s.data() : (window.bhMenuDefault ? window.bhMenuDefault() : null); }catch(e){ menuData = window.bhMenuDefault?.()||null; }
  menuSaved=JSON.stringify(menuData);
}
let mWhich='food';
async function rMenu(body){
  if(!menuData){ body.innerHTML='<p>Loading menu…</p>'; await loadMenu(); if(tab!=='menu') return; }
  if(!menuData){ body.innerHTML='<p>Menu could not be loaded.</p>'; return; }
  const cats=menuData[mWhich]||[];
  body.innerHTML=`<div class="sf-tools"><h3 style="margin:0;flex:1">Menu prices</h3><select class="sf-sel" id="sfMw"><option value="food">Food menu</option><option value="lunch">Lunch menu</option></select><button class="sf-btn" id="sfSaveMenu">Save prices</button></div>
    <p class="sub" style="color:rgba(241,232,214,.7);margin:-6px 0 6px">Change prices or tick <b>Sold out</b> to hide a dish, then press Save prices.</p>
    ${cats.map((c,ci)=>`<div class="sf-cat">${esc(c.t)}</div>`+c.items.map((it,ii)=>`<div class="sf-mi ${it.off?'off':''}" data-ci="${ci}" data-ii="${ii}"><span class="nm">${esc(it.n)}</span>
      <input type="text" data-mf="p" value="${esc(it.p||'')}" placeholder="price" maxlength="60"><label><input type="checkbox" data-mf="off" ${it.off?'checked':''}> Sold out</label></div>`).join('')).join('')}
    ${mWhich==='lunch'?`<div class="sf-cat">Lunch deal prices</div>${['main','two','three'].map(k=>`<div class="sf-mi"><span class="nm">${{main:'Main',two:'Starter + main',three:'Starter + main + drink'}[k]}</span><input type="text" data-deal="${k}" value="${esc((menuData.deal||{})[k]||'')}" maxlength="20"></div>`).join('')}`:''}`;
  $('sfMw').value=mWhich; $('sfMw').onchange=e=>{ mWhich=e.target.value; render(); };
  $('sfSaveMenu').onclick=saveMenu;
}
$('sfBody').addEventListener('input', e=>{
  if(tab!=='menu' || !menuData) return;
  if(e.target.dataset.deal){ menuData.deal=menuData.deal||{}; menuData.deal[e.target.dataset.deal]=e.target.value; return; }
  const r=e.target.closest('[data-ci]'); if(!r||!e.target.dataset.mf) return;
  const it=menuData[mWhich][r.dataset.ci].items[r.dataset.ii];
  if(e.target.dataset.mf==='off'){ it.off=e.target.checked; r.classList.toggle('off',it.off); } else it.p=e.target.value;
});
async function saveMenu(){
  const before=JSON.parse(menuSaved||'{}'), ch=[];
  ['food','lunch'].forEach(w=>(menuData[w]||[]).forEach((c,ci)=>c.items.forEach((it,ii)=>{ const o=(((before[w]||[])[ci]||{}).items||[])[ii]||{};
    if((o.p||'')!==(it.p||'')) ch.push(`${it.n} ${o.p||'—'} → ${it.p||'—'}`); if(!!o.off!==!!it.off) ch.push(`${it.n} ${it.off?'sold out':'back on'}`); })));
  ['main','two','three'].forEach(k=>{ const a=(before.deal||{})[k], b=(menuData.deal||{})[k]; if((a||'')!==(b||'')) ch.push(`lunch deal ${k} ${a||'—'} → ${b||'—'}`); });
  if(!ch.length) return say('Nothing has changed.');
  $('sfSaveMenu').disabled=true;
  try{ await setDoc(doc(db,'site','menu'), menuData); menuSaved=JSON.stringify(menuData); window.bhSetMenu?.(JSON.parse(menuSaved)); say('Saved — the website menu is updated.');
    logAct('Menu & prices', ch.slice(0,12).join('; ')+(ch.length>12?` (+${ch.length-12} more)`:'')); }
  catch(err){ fail(err); } finally{ const b=$('sfSaveMenu'); if(b) b.disabled=false; }
}

/* ---- pub photos ---- */
const pubItems=()=>gallery.filter(g=>g.place==='pub').sort((a,b)=>(a.order||0)-(b.order||0));
function shrink(file, max, q){ return new Promise((res,rej)=>{ const img=new Image(); img.onload=()=>{ let w=img.width,h=img.height; const r=Math.min(1,max/Math.max(w,h)); w=Math.round(w*r); h=Math.round(h*r);
  const c=document.createElement('canvas'); c.width=w; c.height=h; c.getContext('2d').drawImage(img,0,0,w,h); URL.revokeObjectURL(img.src); res(c.toDataURL('image/jpeg',q)); }; img.onerror=rej; img.src=URL.createObjectURL(file); }); }
async function toData(f){ let d=await shrink(f,1400,.8); if(d.length>950000) d=await shrink(f,1100,.66); if(d.length>950000) d=await shrink(f,900,.6); return d; }
async function addPhotos(files, report){
  files=[...files].filter(f=>f.type.startsWith('image/')); if(!files.length) return report('Please choose photos (JPG or PNG).',true);
  const base=pubItems().length;
  for(let i=0;i<files.length;i++){ report(`Uploading ${i+1} of ${files.length}…`);
    try{ await addDoc(collection(db,'gallery'),{kind:'photo',place:'pub',img:await toData(files[i]),caption:'',order:base+i,createdAt:serverTimestamp()}); }catch(err){ return report((FRIENDLY[err.code])||'Upload failed — please try again.',true); } }
  report(files.length>1?`${files.length} photos added — live on the website.`:'Photo added — live on the website.');
  logAct('Pub photos', `Added ${files.length} photo${files.length>1?'s':''} to "Our Pub"`); window.bhReloadGallery?.();
}
async function removePhoto(id, report){ if(!confirm('Remove this photo from the website?')) return;
  try{ await deleteDoc(doc(db,'gallery',id)); report('Photo removed.'); logAct('Pub photos','Removed a photo from "Our Pub"'); window.bhReloadGallery?.(); }catch(err){ report(FRIENDLY[err.code]||'Could not remove it.',true); } }
function rPhotos(body){
  const l=pubItems();
  body.innerHTML=`<div class="sf-tools"><h3 style="margin:0;flex:1">Pub photos</h3><label class="sf-btn" style="cursor:pointer">📷 Add photos<input type="file" id="sfPf" accept="image/*" multiple hidden></label></div>
    <p class="sub" style="color:rgba(241,232,214,.7);margin:-6px 0 12px">These appear in the "Our Pub" section at the end of the website.</p>
    <div class="sf-grid">${l.map(g=>`<figure><img src="${g.img}" alt=""><button class="sf-btn danger" style="width:100%;margin-top:5px" data-pdel="${esc(g.id)}">Remove</button></figure>`).join('')||'<p style="color:rgba(241,232,214,.6)">No pub photos yet.</p>'}</div>`;
  $('sfPf').onchange=e=>addPhotos(e.target.files, say);
}
$('sfBody').addEventListener('click', e=>{ const id=e.target.dataset.pdel; if(id) removePhoto(id, say); });
/* buttons right on the "Our Pub" section at the end of the website */
function pubTools(){
  const sec=document.getElementById('pubphotos'); if(!sec) return;
  let bar=document.getElementById('pubAdd');
  const allowed = me && can('pubphotos');
  if(!allowed){ bar?.remove(); sec.querySelectorAll('.pub-del').forEach(b=>b.remove()); if(!sec.querySelector('figure')) sec.hidden=true; return; }
  sec.hidden=false;
  if(!bar){ sec.querySelector('.wrap').insertAdjacentHTML('afterbegin', `<div class="pub-add" id="pubAdd"><label class="btn btn-gold" style="cursor:pointer">📷 Add pub photos<input type="file" id="pubAddIn" accept="image/*" multiple hidden></label><span id="pubAddMsg" style="align-self:center;font-size:14px;color:#8FD19E"></span></div>`);
    $('pubAddIn').onchange=e=>addPhotos(e.target.files,(t,bad)=>{ const m=$('pubAddMsg'); m.textContent=t; m.style.color=bad?'#F0A496':'#8FD19E'; }); }
  // a Remove button on each photo for staff
  const ids=pubItems().map(g=>g.id); sec.querySelectorAll('.media-grid figure').forEach((f,i)=>{ if(f.querySelector('.pub-del')||!ids[i]) return;
    f.insertAdjacentHTML('afterbegin',`<button class="pub-del" data-pid="${esc(ids[i])}">Remove</button>`); });
}
document.addEventListener('click', e=>{ const b=e.target.closest('.pub-del'); if(b){ e.preventDefault(); e.stopPropagation(); removePhoto(b.dataset.pid,(t,bad)=>{ const m=$('pubAddMsg'); if(m){ m.textContent=t; m.style.color=bad?'#F0A496':'#8FD19E'; } }); } }, true);
window.addEventListener('bh-gallery', ()=>setTimeout(pubTools,50));

/* ---- discount codes ---- */
let scanStream=null, scanTimer=0, detector=null;
function rCodes(body){
  body.innerHTML=`<h3>Check a discount code</h3>
    <div class="sf-scan" id="sfScanBox" hidden><video id="sfVid" playsinline muted></video></div>
    <div class="sf-tools"><button class="sf-btn" id="sfScanBtn">📷 Scan QR code</button><input type="text" class="sf-sel" id="sfCode" maxlength="8" placeholder="Or type the code" style="text-transform:uppercase;letter-spacing:.14em;width:170px"><button class="sf-btn ghost" id="sfCheck">Check</button></div>
    <div id="sfRes"></div>`;
  $('sfScanBtn').onclick=()=> scanStream ? stopScan() : startScan();
  $('sfCheck').onclick=()=>lookup($('sfCode').value); $('sfCode').onkeydown=e=>{ if(e.key==='Enter') lookup($('sfCode').value); };
}
const parseCode=t=>{ t=String(t||'').trim(); const m=t.match(/[#?&]v=([A-Za-z0-9]{8})/i)||t.match(/^([A-Za-z0-9]{8})$/); return m?m[1].toUpperCase():null; };
function res(cls,title,html){ $('sfRes').innerHTML=`<div class="sf-v ${cls}"><div class="st">${title}</div>${html||''}</div>`; }
let cur=null;
async function lookup(raw){
  stopScan(); const code=parseCode(raw);
  if(!code||!/^[A-HJ-NP-Z2-9]{8}$/.test(code)) return res('bad','✕ Not a valid code','<p>Codes are 8 letters and numbers.</p>');
  res('','Checking…');
  try{ const s=await getDoc(doc(db,'vouchers',code)); if(!s.exists()) return res('bad','✕ Code not found',`<p>${code} was not issued by the website. Do not apply the discount.</p>`);
    cur={id:s.id,...s.data()}; const v=cur, pct=v.percent||25, what=v.appliesTo==='bill'?'whole bill':'food', exp=tsMs(v.expiresAt);
    const info=`<p style="margin:8px 0"><b>${esc(v.id)}</b> · ${pct}% off ${what}${v.name?' · '+esc(v.name):''} · expires ${new Date(exp).toLocaleDateString('en-GB')}</p>`;
    if(v.used) return res('bad','✕ Already used', info);
    if(exp && exp<Date.now()) return res('bad','✕ Expired', info);
    res('ok',`✓ Valid — apply ${pct}% off ${what}`, info+`<div class="sf-tools"><input type="text" class="sf-sel" id="sfSpend" inputmode="decimal" placeholder="${v.appliesTo==='bill'?'Bill':'Food'} total £" style="width:150px"><b id="sfOff"></b><button class="sf-btn" id="sfRedeem">Mark as used</button></div>`);
    $('sfSpend').oninput=()=>{ const n=parseFloat($('sfSpend').value); $('sfOff').textContent = n>0 ? 'Take off '+money(Math.round(n*pct)/100) : ''; };
    $('sfRedeem').onclick=redeem;
  }catch(e){ res('',''); fail(e); }
}
async function redeem(){
  const v=cur; if(!v) return; const n=parseFloat($('sfSpend')?.value), pct=v.percent||25;
  const upd={used:true, usedAt:serverTimestamp(), usedBy: isOwner?'Main admin':(isShared?staffName+' (shared login)':(me?.email||'Staff'))};
  if(n>0){ upd.spend=Math.round(n*100)/100; upd.saved=Math.round(n*pct)/100; }
  $('sfRedeem').disabled=true;
  try{ await updateDoc(doc(db,'vouchers',v.id), upd); say(`Code ${v.id} marked as used${upd.saved?' — '+money(upd.saved)+' off':''}.`); logAct('Discount codes',`Code ${v.id} redeemed${upd.saved?' — '+money(upd.saved)+' off':''}`); lookup(v.id); }
  catch(e){ if(e.code==='permission-denied'){ say('This code could not be redeemed — it may already have been used.',true); lookup(v.id); } else fail(e); }
}
function loadJsQR(){ return window.jsQR ? Promise.resolve() : new Promise((ok,no)=>{ const s=document.createElement('script'); s.src='https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js'; s.onload=ok; s.onerror=no; document.head.appendChild(s); }); }
async function startScan(){
  if(!navigator.mediaDevices?.getUserMedia) return say('The camera is not available here — type the code instead.',true);
  try{ scanStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}},audio:false}); }catch(e){ scanStream=null; return say('Camera access was blocked — allow the camera, or type the code.',true); }
  const v=$('sfVid'); v.srcObject=scanStream; $('sfScanBox').hidden=false; $('sfScanBtn').textContent='Stop camera'; try{ await v.play(); }catch(e){}
  if(!detector && 'BarcodeDetector' in window){ try{ if((await BarcodeDetector.getSupportedFormats()).includes('qr_code')) detector=new BarcodeDetector({formats:['qr_code']}); }catch(e){} }
  if(!detector){ try{ await loadJsQR(); }catch(e){ stopScan(); return say('Could not start the scanner — type the code instead.',true); } }
  const c=document.createElement('canvas'), x=c.getContext('2d',{willReadFrequently:true});
  const tick=async()=>{ if(!scanStream) return; let t=null;
    try{ if(v.readyState>=2){ if(detector){ const r=await detector.detect(v); if(r.length) t=r[0].rawValue; }
      else{ const k=Math.min(1,720/Math.max(v.videoWidth,v.videoHeight)); c.width=v.videoWidth*k; c.height=v.videoHeight*k; x.drawImage(v,0,0,c.width,c.height); const r=window.jsQR(x.getImageData(0,0,c.width,c.height).data,c.width,c.height,{inversionAttempts:'attemptBoth'}); if(r) t=r.data; } } }catch(e){}
    if(t && parseCode(t)){ $('sfCode').value=parseCode(t); return lookup(t); } scanTimer=setTimeout(tick,160); };
  tick();
}
function stopScan(){ clearTimeout(scanTimer); if(scanStream) scanStream.getTracks().forEach(t=>t.stop()); scanStream=null; const b=$('sfScanBox'); if(b) b.hidden=true; const s=$('sfScanBtn'); if(s) s.textContent='📷 Scan QR code'; }

/* ---- messages & enquiries ---- */
function rInbox(body){
  const h=hires.slice().sort((a,b)=>tsMs(b.createdAt)-tsMs(a.createdAt)).slice(0,40), m=messages.slice().sort((a,b)=>tsMs(b.createdAt)-tsMs(a.createdAt)).slice(0,40);
  body.innerHTML=`
    ${can('hire')?`<h3>Private hire enquiries</h3>${h.map(x=>`<div class="sf-row ${x.status==='new'?'urgent':''}"><div class="top"><b>${esc(x.name)}</b><span>${esc(x.type||'Event')} · ${esc(x.guests)} guests${x.date?' · '+esc(fmtD(x.date)):''}</span>
      <select class="sf-sel" data-hs="${esc(x.id)}" style="margin-left:auto">${['new','confirmed','cancelled'].map(s=>`<option value="${s}" ${x.status===s?'selected':''}>${s[0].toUpperCase()+s.slice(1)}</option>`).join('')}</select></div>
      <div class="sub"><a href="tel:${esc(x.phone)}">${esc(x.phone)}</a> · <a href="mailto:${esc(x.email)}">${esc(x.email)}</a>${x.message?' · '+esc(x.message):''}</div></div>`).join('')||'<p style="color:rgba(241,232,214,.6)">No enquiries.</p>'}`:''}
    ${can('messages')?`<h3 style="margin-top:20px">Messages</h3>${m.map(x=>`<div class="sf-row ${x.seen===false?'urgent':''}"><div class="top"><b>${esc(x.name)}</b>${x.seen===false?`<button class="sf-btn ghost" data-mseen="${esc(x.id)}" style="margin-left:auto">Mark read</button>`:''}</div>
      <div class="sub">${esc(x.message)}<br><a href="mailto:${esc(x.email)}">${esc(x.email)}</a>${x.phone?' · <a href="tel:'+esc(x.phone)+'">'+esc(x.phone)+'</a>':''}</div></div>`).join('')||'<p style="color:rgba(241,232,214,.6)">No messages.</p>'}`:''}`;
}
$('sfBody').addEventListener('change', async e=>{ const id=e.target.dataset.hs; if(!id) return; const x=hires.find(h=>h.id===id)||{};
  try{ await updateDoc(doc(db,'hireEnquiries',id),{status:e.target.value,seen:true}); say('Updated.'); logAct('Private hire',`Enquiry from ${x.name||''} → ${e.target.value}`); }catch(err){ fail(err); } });
$('sfBody').addEventListener('click', async e=>{ const id=e.target.dataset.mseen; if(!id) return;
  try{ await updateDoc(doc(db,'messages',id),{seen:true}); }catch(err){ fail(err); } });

window.addEventListener('hashchange',()=>{ if(location.hash==='#staff' && me) openPanel(); });
