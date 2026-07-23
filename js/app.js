const FUELS=['Gazole','SP95','SP95-E10','SP98','GPLc','E85'];
const FC={Gazole:'#2563eb',SP95:'#16a34a','SP95-E10':'#059669',SP98:'#7c3aed',GPLc:'#0891b2',E85:'#ca8a04'};
const FCLS={Gazole:'fc-g',SP95:'fc-95','SP95-E10':'fc-e10',SP98:'fc-98',GPLc:'fc-gpl',E85:'fc-e85'};

const DEMO=[
{id:1,name:'TotalEnergies Rivoli',city:'Paris',lat:48.855,lng:2.357,addr:'12 Rue de Rivoli',prices:{Gazole:1.702,SP95:1.829,'SP95-E10':1.781,SP98:1.902,GPLc:0.992,E85:0.869}},
{id:2,name:'E.Leclerc Frouard',city:'Frouard',lat:48.761,lng:6.132,addr:'Zone commerciale Grand Air',prices:{Gazole:1.621,SP95:1.748,'SP95-E10':1.709,SP98:1.832,GPLc:0.954,E85:0.792}},
{id:3,name:'Carrefour Mérignac',city:'Mérignac',lat:44.842,lng:-0.667,addr:'Avenue de la Somme',prices:{Gazole:1.644,SP95:1.765,'SP95-E10':1.721,SP98:1.845,GPLc:0.979,E85:0.801}},
{id:4,name:'Intermarché Brest',city:'Brest',lat:48.390,lng:-4.486,addr:'Bld de Plymouth',prices:{Gazole:1.633,SP95:1.759,'SP95-E10':1.714,SP98:1.838,GPLc:0.966,E85:0.795}},
{id:5,name:'Avia Nice Ouest',city:'Nice',lat:43.665,lng:7.215,addr:'Route de Grenoble',prices:{Gazole:1.712,SP95:1.852,'SP95-E10':1.807,SP98:1.931,GPLc:1.005,E85:0.884}},
{id:6,name:'Auchan Noyelles',city:'Noyelles-Godault',lat:50.417,lng:2.995,addr:'Centre commercial',prices:{Gazole:1.614,SP95:1.739,'SP95-E10':1.698,SP98:1.821,GPLc:0.949,E85:0.785}}
];

const S={
  user:null,
  fuel:'SP95-E10',
  pos:{lat:46.6,lng:1.88},
  radius:10,
  stations:JSON.parse(JSON.stringify(DEMO)),
  comments:[],
  proposals:[],
  activity:[],
  selId:null,
  map:null,
  markers:[],
  userDot:null,
  userAccuracy:null
};

const toast=(m,d=2200)=>{
  const t=document.getElementById('toast');
  if(!t)return;
  t.textContent=m;
  t.style.opacity=1;
  clearTimeout(t._x);
  t._x=setTimeout(()=>t.style.opacity=0,d);
};

const now=()=>new Date().toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'});

const km=(a,b,c,d)=>{
  const R=6371;
  const x=(c-a)*Math.PI/180;
  const y=(d-b)*Math.PI/180;
  const z=Math.sin(x/2)**2+Math.cos(a*Math.PI/180)*Math.cos(c*Math.PI/180)*Math.sin(y/2)**2;
  return +(2*R*Math.atan2(Math.sqrt(z),Math.sqrt(1-z))).toFixed(1);
};

function hydrateSelects(){
  const f=FUELS.map(x=>`<option value="${x}">${x}</option>`).join('');
  const el=document.getElementById('profileFuelSelect');
  if(el){
    el.innerHTML=f;
    el.value=S.fuel;
  }

  const st=S.stations.map(s=>`<option value="${s.id}">${s.name} — ${s.city}</option>`).join('');
  const c=document.getElementById('commentStation');
  if(c)c.innerHTML=st;
}

function filtered(){
  const f=S.fuel;
  const q=(document.getElementById('searchFilter')?.value||'').toLowerCase();
  const mx=parseFloat(document.getElementById('maxPriceFilter')?.value||'999');
  const so=document.getElementById('sortFilter')?.value||'price';

  return S.stations.filter(s=>{
    if(!s.prices[f]||s.prices[f]>mx)return false;
    if(q&&!`${s.name} ${s.city} ${s.addr||''}`.toLowerCase().includes(q))return false;
    if(S.radius){
      const d=km(S.pos.lat,S.pos.lng,s.lat,s.lng);
      if(d>S.radius)return false;
    }
    return true;
  }).sort((a,b)=>{
    if(so==='name')return a.name.localeCompare(b.name);
    if(so==='distance')return km(S.pos.lat,S.pos.lng,a.lat,a.lng)-km(S.pos.lat,S.pos.lng,b.lat,b.lng);
    return a.prices[f]-b.prices[f];
  });
}

function ensureMap(){
  if(!S.map){
    S.map=L.map('map').setView([46.6,1.88],6);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
      maxZoom:19,
      attribution:'© OpenStreetMap'
    }).addTo(S.map);
  }
}

function userIcon(){
  return L.divIcon({
    className:'location-marker',
    html:'<div class="location-dot"></div>',
    iconSize:[16,16],
    iconAnchor:[8,8]
  });
}

function stationIcon(color){
  return L.divIcon({
    html:`<svg xmlns="http://www.w3.org/2000/svg" width="28" height="36" viewBox="0 0 28 36"><path d="M14 0C6.3 0 0 6.3 0 14c0 10.2 14 22 14 22s14-11.8 14-22C28 6.3 21.7 0 14 0z" fill="${color}"/><circle cx="14" cy="14" r="6" fill="white" opacity=".92"/></svg>`,
    className:'',
    iconSize:[28,36],
    iconAnchor:[14,36],
    popupAnchor:[0,-36]
  });
}

function renderMap(){
  ensureMap();
  S.markers.forEach(m=>m.remove());
  S.markers=[];

  filtered().forEach(st=>{
    const mk=L.marker([st.lat,st.lng],{icon:stationIcon(FC[S.fuel]||'#0b7f88')}).addTo(S.map);
    mk.bindPopup(`<strong>${st.name}</strong><br>${st.city}<br><b style="color:${FC[S.fuel]}">${st.prices[S.fuel].toFixed(3)} €/L</b>`);
    mk.on('click',()=>{S.selId=st.id;renderDetail();});
    S.markers.push(mk);
  });

  setTimeout(()=>S.map.invalidateSize(),50);
}

function renderUserPosition(){
  ensureMap();
  if(S.userDot)S.userDot.remove();
  if(S.userAccuracy)S.userAccuracy.remove();
  S.userDot=L.marker([S.pos.lat,S.pos.lng],{icon:userIcon()}).addTo(S.map);
  S.map.flyTo([S.pos.lat,S.pos.lng],16,{animate:true,duration:1.8});
}

function renderDetail(){
  const st=S.stations.find(s=>s.id===S.selId);
  const box=document.getElementById('stationDetails');
  if(!box)return;
  if(!st){
    box.innerHTML='<div class="empty"><h3>Choisissez une station</h3><p>Le détail s\'affichera ici.</p></div>';
    return;
  }

  const vals=FUELS.map(f=>st.prices[f]).filter(v=>v);
  const min=Math.min(...vals),max=Math.max(...vals);

  let html=`<div style="margin-bottom:.8rem"><div style="font-family:var(--fdis);font-size:1.15rem;font-weight:900">${st.name}</div><div style="font-size:.88rem;color:var(--tx1)">${st.city}${st.addr?` · ${st.addr}`:''}</div></div><div class="price-grid">`;

  FUELS.forEach(f=>{
    if(st.prices[f]){
      const cls=st.prices[f]===min?'best':st.prices[f]===max?'worst':'';
      html+=`<div class="price-chip ${cls}"><div class="f-name">${f}</div><div class="f-val" style="color:${FC[f]}">${st.prices[f].toFixed(3)} €</div></div>`;
    }
  });

  html+='</div>';
  box.innerHTML=html;
}

function renderSession(){
  const box=document.getElementById('sessionCard');
  if(!box)return;
  if(!S.user){
    box.innerHTML='<div class="empty"><h3>Invité</h3><p>Créez un compte pour commenter.</p></div>';
    return;
  }
  box.innerHTML=`<div class="log-item" style="display:flex;justify-content:space-between"><span>Prénom</span><b>${S.user.name}</b></div><div class="log-item" style="display:flex;justify-content:space-between"><span>Email</span><b>${S.user.email}</b></div><div class="log-item" style="display:flex;justify-content:space-between"><span>Carburant</span><span class="fuel-chip ${FCLS[S.user.fuel]}">${S.user.fuel}</span></div>`;
}

function renderAdmin(){
  const q=[
    ...S.comments.filter(c=>c.status==='pending').map(c=>({type:'comment',...c})),
    ...S.proposals.filter(p=>p.status==='pending').map(p=>({type:'proposal',...p}))
  ].sort((a,b)=>b.at-a.at);

  const blob=document.getElementById('adminBlob');
  const count=document.getElementById('adminQueueCount');
  if(blob)blob.textContent=q.length;
  if(count)count.textContent=q.length;

  const queue=document.getElementById('adminQueueFull');
  if(queue){
    const html=q.map(item=>{
      const st=S.stations.find(s=>s.id===item.stId);
      return `<div class="queue-item"><div style="display:flex;gap:.5rem;flex-wrap:wrap;margin-bottom:.5rem"><span class="badge ${item.type==='comment'?'bg-pri':'bg-acc'}">${item.type==='comment'?'Commentaire':'Correction'}</span><span class="badge bg-acc">En attente</span></div><div style="font-weight:800;font-size:.92rem">${st?.name||'Station'} — ${st?.city||''}</div><div style="font-size:.78rem;color:var(--tx2);margin:.2rem 0 .55rem">Par <b>${item.author}</b></div><div style="background:var(--bg);border:1px solid var(--bor);border-radius:.9rem;padding:.65rem .75rem;font-size:.9rem;line-height:1.45;margin-bottom:.55rem">${item.type==='comment'?item.text:`<span class="fuel-chip ${FCLS[item.fuel]}">${item.fuel}</span> → <strong style="color:var(--ok)">${item.price.toFixed(3)} €/L</strong><div style="margin-top:.35rem;color:var(--tx1);font-size:.8rem">${item.reason}</div>`}</div><div style="display:flex;gap:.5rem;margin-top:.75rem;flex-wrap:wrap"><button class="btn btn-pri" style="padding:.55rem .85rem" onclick="approve('${item.type}',${item.id})">✓</button><button class="btn btn-danger" style="padding:.55rem .85rem" onclick="reject('${item.type}',${item.id})">✕</button></div></div>`;
    }).join('');
    queue.innerHTML=html||'<div class="empty"><h3>File vide</h3><p>Aucune contribution en attente.</p></div>';
  }

  const log=document.getElementById('activityLog');
  if(log){
    log.innerHTML=S.activity.map(x=>`<div class="log-item" style="display:flex;justify-content:space-between;gap:.75rem"><div>${x.msg}</div><div style="color:var(--tx2);font-size:.72rem;white-space:nowrap">${x.at}</div></div>`).join('')||'<div class="empty"><h3>Aucune activité</h3></div>';
  }
}

function renderStationList(){
  const list=document.getElementById('stationList');
  if(!list)return;

  const fuel=S.fuel;
  const items=filtered();
  const best=items.length?Math.min(...items.map(s=>s.prices[fuel])):null;
  const worst=items.length?Math.max(...items.map(s=>s.prices[fuel])):null;

  const bestMini=document.getElementById('bestPriceMini');
  if(bestMini)bestMini.textContent=best!==null?`${best.toFixed(3)}€ min`:'—';

  list.innerHTML=items.length?items.map((st,i)=>{
    const price=st.prices[fuel];
    const klass=price===best?'good':price===worst?'high':'mid';
    const dist=km(S.pos.lat,S.pos.lng,st.lat,st.lng);
    return `<div class="station-item" data-id="${st.id}"><div class="station-top"><div class="station-left"><div class="station-num">${String(i+1).padStart(2,'0')}</div><div style="min-width:0"><div class="station-name">${st.name}</div><div class="station-sub">${st.addr || st.city}</div></div></div><div class="station-price ${klass}">${price.toFixed(3)}<div style="font-size:.72rem;font-weight:700;color:var(--tx2)">€/L</div></div></div><div class="station-actions"><span class="station-action">📍 ${dist} km</span><span class="station-action">💬 Suivre cette station</span><span class="station-action">#${st.id}</span></div></div>`;
  }).join(''):'<div class="empty"><h3>Aucune station</h3><p>Aucun résultat pour ces filtres.</p></div>';

  list.querySelectorAll('.station-item').forEach(el=>{
    el.addEventListener('click',()=>{
      S.selId=+el.dataset.id;
      renderDetail();
    });
  });
}

function renderAll(){
  hydrateSelects();
  renderMap();
  renderDetail();
  renderSession();
  renderAdmin();
  renderStationList();
  const nFuelBadge=document.getElementById('nFuelBadge');
  if(nFuelBadge)nFuelBadge.textContent=S.fuel;
}

function approve(type,id){
  const c=S.comments.find(x=>x.id===id);
  const p=S.proposals.find(x=>x.id===id);
  if(type==='comment'&&c)c.status='approved';
  if(type==='proposal'&&p){
    p.status='approved';
    const st=S.stations.find(s=>s.id===p.stId);
    if(st)st.prices[p.fuel]=p.price;
  }
  renderAll();
  toast('Approuvé');
}

function reject(type,id){
  const c=S.comments.find(x=>x.id===id);
  const p=S.proposals.find(x=>x.id===id);
  if(type==='comment'&&c)c.status='rejected';
  if(type==='proposal'&&p)p.status='rejected';
  renderAll();
  toast('Refusé');
}

window.approve=approve;
window.reject=reject;

function view(id){
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
  const el=document.getElementById(id);
  if(el)el.classList.add('active');
  document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===id));

  const mapPanel=document.getElementById('mapPanel');
  const adminPanel=document.getElementById('adminPanel');

  if(id==='adminView'){
    if(mapPanel)mapPanel.style.display='none';
    if(adminPanel)adminPanel.style.display='block';
    setTimeout(()=>renderAdmin(),50);
  }else{
    if(mapPanel)mapPanel.style.display='block';
    if(adminPanel)adminPanel.style.display='none';
  }

  if(id==='mapView'&&S.map)setTimeout(()=>S.map.invalidateSize(),120);
}
window.view=view;

document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>view(b.dataset.view)));

const cityBtn=document.getElementById('cityBtn');
const citySearch=document.getElementById('citySearch');
if(cityBtn&&citySearch){
  cityBtn.addEventListener('click',()=>{
    cityBtn.classList.toggle('active');
    citySearch.style.display=citySearch.style.display==='none'?'block':'none';
    const input=document.getElementById('cityInput');
    if(citySearch.style.display==='block'&&input)setTimeout(()=>input.focus(),20);
  });
}

const cityInput=document.getElementById('cityInput');
if(cityInput){
  cityInput.addEventListener('input',()=>{
    const q=cityInput.value.toLowerCase().trim();
    if(!q){
      renderMap();
      renderStationList();
      return;
    }
    const station=S.stations.find(s=>`${s.name} ${s.city} ${s.addr||''}`.toLowerCase().includes(q));
    if(station){
      S.selId=station.id;
      renderDetail();
      S.pos={lat:station.lat,lng:station.lng};
      renderUserPosition();
      renderMap();
      renderStationList();
      return;
    }
    renderMap();
    renderStationList();
  });
}

const aroundBtn=document.getElementById('aroundMeBtn');
const aroundMenu=document.getElementById('aroundMenu');
if(aroundBtn&&aroundMenu){
  aroundBtn.addEventListener('click',()=>{
    aroundMenu.style.display=aroundMenu.style.display==='block'?'none':'block';
  });
}

const radiusRange=document.getElementById('radiusRange');
const radiusVal=document.getElementById('radiusVal');
if(radiusRange&&radiusVal){
  radiusRange.addEventListener('input',()=>{
    S.radius=+radiusRange.value;
    radiusVal.textContent=S.radius;
    renderMap();
    renderStationList();
  });
}

const locateBtn=document.getElementById('locateBtn');
if(locateBtn){
  locateBtn.addEventListener('click',()=>{
    if(!navigator.geolocation)return toast('Géolocalisation indisponible.');
    navigator.geolocation.getCurrentPosition(pos=>{
      S.pos={lat:pos.coords.latitude,lng:pos.coords.longitude};
      S.lastAccuracy=pos.coords.accuracy||20;
      renderUserPosition();
      renderMap();
      renderStationList();
      toast('Position détectée');
    },()=>toast('Position refusée'),{enableHighAccuracy:true,timeout:10000,maximumAge:0});
  });
}

document.querySelectorAll('.fuel-pill').forEach(btn=>{
  btn.addEventListener('click',()=>{
    document.querySelectorAll('.fuel-pill').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    S.fuel=btn.dataset.fuel;
    renderMap();
    renderDetail();
    renderStationList();
  });
});

document.querySelectorAll('.status-pill').forEach(btn=>{
  btn.addEventListener('click',()=>{
    document.querySelectorAll('.status-pill').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
  });
});

const registerForm=document.getElementById('registerForm');
if(registerForm){
  registerForm.addEventListener('submit',e=>{
    e.preventDefault();
    const fd=new FormData(e.target);
    S.user={name:fd.get('name'),email:fd.get('email'),fuel:fd.get('preferredFuel')};
    S.fuel=S.user.fuel;
    e.target.reset();
    toast('Bienvenue');
    renderAll();
  });
}

const commentForm=document.getElementById('commentForm');
if(commentForm){
  commentForm.addEventListener('submit',e=>{
    e.preventDefault();
    if(!S.user)return toast('Créez un compte d\'abord.');
    const txt=document.getElementById('commentText')?.value.trim();
    if(!txt)return toast('Ajoutez un commentaire.');
    const file=document.getElementById('commentPhoto')?.files[0];
    S.comments.unshift({
      id:Date.now(),
      stId:+document.getElementById('commentStation').value,
      author:S.user.name,
      text:txt,
      status:'pending',
      photo:file?file.name:'',
      at:Date.now()
    });
    e.target.reset();
    hidePreview('comment');
    renderAll();
    toast('Envoyé');
  });
}

function preview(file,input){
  const wrap=document.getElementById(input+'Preview');
  if(!wrap)return;
  if(!file){
    wrap.style.display='none';
    return;
  }
  const img=document.getElementById(input+'PreviewImg');
  const name=document.getElementById(input+'PreviewName');
  const size=document.getElementById(input+'PreviewSize');
  if(img)img.src=URL.createObjectURL(file);
  if(name)name.textContent=file.name;
  if(size)size.textContent=(file.size/1024/1024).toFixed(2)+' MB';
  wrap.style.display='flex';
}

function hidePreview(input){
  const wrap=document.getElementById(input+'Preview');
  if(wrap)wrap.style.display='none';
}

const commentPhoto=document.getElementById('commentPhoto');
if(commentPhoto){
  commentPhoto.addEventListener('change',e=>preview(e.target.files[0],'comment'));
}

const seedBtn=document.getElementById('seedBtn');
if(seedBtn){
  seedBtn.addEventListener('click',()=>{
    S.stations=JSON.parse(JSON.stringify(DEMO));
    S.comments=[
      {id:1,stId:2,author:'Lucas',text:'Prix conformes ce matin.',status:'approved',at:Date.now()-3e5},
      {id:2,stId:1,author:'Nora',text:'Beaucoup de monde mais prix corrects.',status:'pending',at:Date.now()-1e5}
    ];
    S.proposals=[
      {id:1,stId:6,fuel:'SP95-E10',price:1.689,reason:'Photo ticket 18h20.',author:'Mathis',photo:'ticket.jpg',status:'pending',at:Date.now()}
    ];
    S.activity=[{id:1,msg:'🎭 Mode démo activé',at:now()}];
    renderAll();
    toast('Démo activée');
  });
}

const themeChk=document.getElementById('themeChk');

function setTheme(dark){
  document.documentElement.setAttribute('data-theme',dark?'dark':'light');
  if(themeChk)themeChk.checked=dark;
  const ico=document.querySelector('.ico-sun,.ico-moon');
  if(ico){
    ico.outerHTML=dark
      ? `<svg class="ico-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`
      : `<svg class="ico-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`;
  }
  if(S.map)setTimeout(()=>S.map.invalidateSize(),120);
  localStorage.setItem('theme',dark?'dark':'light');
}

if(themeChk){
  themeChk.addEventListener('change',()=>setTheme(themeChk.checked));
}

const savedTheme=localStorage.getItem('theme');
const prefersDark=matchMedia('(prefers-color-scheme: dark)').matches;
setTheme(savedTheme?savedTheme==='dark':prefersDark);

function init(){
  hydrateSelects();
  renderAll();
  if(document.getElementById('mapPanel')) setTimeout(()=>{ if(S.map) S.map.invalidateSize(); },200);
}
document.addEventListener('DOMContentLoaded',init);