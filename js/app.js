/* =====================================================================
   FuelApp — app.js
   Toast = badge persistant centré en haut de carte
   ===================================================================== */

const FUELS = ['Gazole', 'SP95', 'SP95-E10', 'SP98', 'GPLc', 'E85'];
const FC    = { Gazole: '#2563eb', SP95: '#16a34a', 'SP95-E10': '#059669', SP98: '#7c3aed', GPLc: '#0891b2', E85: '#ca8a04' };
const FCLS  = { Gazole: 'fc-g', SP95: 'fc-95', 'SP95-E10': 'fc-e10', SP98: 'fc-98', GPLc: 'fc-gpl', E85: 'fc-e85' };

const API_BASE  = 'https://data.economie.gouv.fr/api/explore/v2.1/catalog/datasets/prix-des-carburants-en-france-flux-instantane-v2/records';
const NOMINATIM = 'https://nominatim.openstreetmap.org/search';

/**
 * setMapBadge(state, text, revertAfterMs?)
 * state : 'ok' | 'loading' | 'error' | 'info'
 * revertAfterMs : si fourni, revient à l'état mémorisé après N ms
 */
let _badgeRevertTimer = null;
let _lastStableText  = 'Chargement…';
let _lastStableState = 'loading';

function setMapBadge(state, text, revertAfterMs) {
  const badge = document.getElementById('mapStationBadge');
  const label = document.getElementById('mapStationCount');
  if (!badge || !label) return;

  clearTimeout(_badgeRevertTimer);
  badge.className = 'map-station-badge' + (state !== 'ok' ? ' ' + state : '');
  label.textContent = text;

  if (!revertAfterMs) {
    // message stable — on le mémorise
    _lastStableText  = text;
    _lastStableState = state;
  } else {
    // message éphémère — on revient à l'état stable
    _badgeRevertTimer = setTimeout(() => {
      badge.className = 'map-station-badge' + (_lastStableState !== 'ok' ? ' ' + _lastStableState : '');
      label.textContent = _lastStableText;
    }, revertAfterMs);
  }
}

/** Remplace toast() — s'affiche dans le badge, disparait après 2.6s */
const toast = (msg) => setMapBadge('info', msg, 2600);

function mapApiStation(r) {
  const geom = r.geom || {};
  return {
    id:      r.id || r.id_station || String(Math.random()),
    name:    r.nom || r.Nom || 'Station',
    city:    r.ville || r.Ville || '',
    addr:    r.adresse || r.Adresse || '',
    lat:     parseFloat(r.latitude  || geom.lat || 0),
    lng:     parseFloat(r.longitude || geom.lon || 0),
    brand:   r.enseignes || '',
    updated: r.gazole_maj || r.sp95_maj || '',
    prices: {
      Gazole:     parseFloat(r.gazole_prix) || null,
      SP95:       parseFloat(r.sp95_prix)   || null,
      'SP95-E10': parseFloat(r.e10_prix)    || null,
      SP98:       parseFloat(r.sp98_prix)   || null,
      GPLc:       parseFloat(r.gplc_prix)   || null,
      E85:        parseFloat(r.e85_prix)    || null
    }
  };
}

async function fetchStationsAPI(lat, lng, radius = 50) {
  setMapBadge('loading', 'Chargement…');
  showSkeleton();
  try {
    const url = `${API_BASE}?where=distance(geom,geom'POINT(${lng} ${lat})',${radius}km)&limit=100&timezone=Europe%2FParis`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data.results && data.results.length) {
      S.stations = data.results.map(mapApiStation).filter(s => s.lat && s.lng);
      setMapBadge('ok', `${S.stations.length} stations chargées`);
      renderAll();
      return;
    }
    throw new Error('Aucun résultat');
  } catch (e) {
    console.warn('[FuelApp] API indisponible →', e.message);
    S.stations = JSON.parse(JSON.stringify(DEMO));
    setMapBadge('error', `Démo · ${S.stations.length} stations`);
    renderAll();
  }
}

async function geocodeAndLoad(query) {
  if (!query.trim()) return;
  setMapBadge('loading', 'Recherche…');
  showSkeleton();
  try {
    const url = `${NOMINATIM}?q=${encodeURIComponent(query)}&countrycodes=fr&format=json&limit=1`;
    const res = await fetch(url, { headers: { 'Accept-Language': 'fr' } });
    const results = await res.json();
    if (!results.length) { setMapBadge('error', 'Ville introuvable'); return; }
    const { lat, lon, display_name } = results[0];
    S.pos = { lat: parseFloat(lat), lng: parseFloat(lon) };
    renderUserPosition();
    await fetchStationsAPI(S.pos.lat, S.pos.lng, S.radius);
    // Affiche le nom de la ville par-dessus le badge stable, 3s
    setMapBadge('ok', `📍 ${display_name.split(',')[0]}`, 3000);
  } catch (e) {
    setMapBadge('error', 'Erreur géocodage');
  }
}

// —— Skeleton —————————————————————————————————————————————————————————
function showSkeleton() {
  const list = document.getElementById('stationList');
  if (!list) return;
  list.innerHTML = Array(4).fill(0).map(() => `
    <div class="skeleton-card">
      <div class="sk sk-name"></div>
      <div class="sk sk-sub"></div>
      <div class="sk sk-price"></div>
    </div>`).join('');
}

// —— Données démo ————————————————————————————————————————————————————
const DEMO = [
  { id:1, name:'TotalEnergies Rivoli', city:'Paris',           lat:48.855, lng: 2.357, addr:'12 Rue de Rivoli',   prices:{Gazole:1.702,SP95:1.829,'SP95-E10':1.781,SP98:1.902,GPLc:0.992,E85:0.869} },
  { id:2, name:'E.Leclerc Frouard',   city:'Frouard',         lat:48.761, lng: 6.132, addr:'Zone commerciale',   prices:{Gazole:1.621,SP95:1.748,'SP95-E10':1.709,SP98:1.832,GPLc:0.954,E85:0.792} },
  { id:3, name:'Carrefour Mérignac',  city:'Mérignac',        lat:44.842, lng:-0.667, addr:'Avenue de la Somme', prices:{Gazole:1.644,SP95:1.765,'SP95-E10':1.721,SP98:1.845,GPLc:0.979,E85:0.801} },
  { id:4, name:'Intermarché Brest',   city:'Brest',           lat:48.390, lng:-4.486, addr:'Bld de Plymouth',    prices:{Gazole:1.633,SP95:1.759,'SP95-E10':1.714,SP98:1.838,GPLc:0.966,E85:0.795} },
  { id:5, name:'Avia Nice Ouest',     city:'Nice',            lat:43.665, lng: 7.215, addr:'Route de Grenoble',  prices:{Gazole:1.712,SP95:1.852,'SP95-E10':1.807,SP98:1.931,GPLc:1.005,E85:0.884} },
  { id:6, name:'Auchan Noyelles',     city:'Noyelles-Godault',lat:50.417, lng: 2.995, addr:'Centre commercial',  prices:{Gazole:1.614,SP95:1.739,'SP95-E10':1.698,SP98:1.821,GPLc:0.949,E85:0.785} }
];

// —— État global ——————————————————————————————————————————————————————
const S = {
  user:null, fuel:'SP95-E10', statusFilter:'all',
  pos:{lat:46.6,lng:1.88}, radius:50,
  stations:JSON.parse(JSON.stringify(DEMO)),
  comments:[], proposals:[], activity:[],
  selId:null, map:null, clusterGroup:null, markers:[], userDot:null, watchId:null
};

// —— Utilitaires ——————————————————————————————————————————————————————
const now = () => new Date().toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'});
const km = (a,b,c,d) => {
  const R=6371,x=(c-a)*Math.PI/180,y=(d-b)*Math.PI/180;
  const z=Math.sin(x/2)**2+Math.cos(a*Math.PI/180)*Math.cos(c*Math.PI/180)*Math.sin(y/2)**2;
  return +(2*R*Math.atan2(Math.sqrt(z),Math.sqrt(1-z))).toFixed(1);
};

// —— Icônes carte ————————————————————————————————————————————————————
function userIcon() {
  return L.divIcon({className:'location-marker',html:'<div class="location-dot"></div>',iconSize:[16,16],iconAnchor:[8,8]});
}
function stationIcon(price, color, isBest=false) {
  return L.divIcon({
    html:`<div class="map-pin${isBest?' map-pin--best':''}" style="--pin-color:${color}">
      <span class="pin-price">${price!==null?price.toFixed(2):'—'}</span>
      <span class="pin-unit">€</span></div>`,
    className:'', iconSize:[58,30], iconAnchor:[29,30], popupAnchor:[0,-34]
  });
}

// —— Filtrage ————————————————————————————————————————————————————————
function filtered() {
  const f=S.fuel;
  const items = S.stations.filter(s => {
    if (!s.prices[f]) return false;
    if (S.radius && km(S.pos.lat,S.pos.lng,s.lat,s.lng)>S.radius) return false;
    return true;
  }).sort((a,b)=>a.prices[f]-b.prices[f]);
  if (S.statusFilter!=='all' && items.length>1) {
    const prices=items.map(s=>s.prices[f]), mn=Math.min(...prices), mx=Math.max(...prices), t=(mx-mn)/3;
    return items.filter(s=>{
      const p=s.prices[f];
      if(S.statusFilter==='cheaper') return p<=mn+t;
      if(S.statusFilter==='higher')  return p>=mx-t;
      if(S.statusFilter==='mid')     return p>mn+t&&p<mx-t;
      return true;
    });
  }
  return items;
}

// —— Carte ————————————————————————————————————————————————————————————
function ensureMap() {
  if (!S.map) {
    S.map = L.map('map').setView([46.6,1.88],6);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
      maxZoom:19, attribution:'© <a href="https://openstreetmap.org">OpenStreetMap</a>'
    }).addTo(S.map);
    S.clusterGroup = L.markerClusterGroup({
      maxClusterRadius:50, spiderfyOnMaxZoom:true, showCoverageOnHover:false,
      iconCreateFunction: cluster => L.divIcon({
        html:`<div class="cluster-icon">${cluster.getChildCount()}</div>`,
        className:'', iconSize:[40,40]
      })
    });
    S.map.addLayer(S.clusterGroup);
  }
}

function renderMap() {
  ensureMap();
  S.clusterGroup.clearLayers();
  S.markers=[];
  const items=filtered();
  const prices=items.map(s=>s.prices[S.fuel]).filter(Boolean);
  const bestPrice=prices.length?Math.min(...prices):null;
  items.forEach(st=>{
    const price=st.prices[S.fuel];
    const mk=L.marker([st.lat,st.lng],{icon:stationIcon(price,FC[S.fuel]||'#0b7f88',price===bestPrice)});
    mk.bindPopup(`<strong>${st.name}</strong><br>${st.city}<br><b style="color:${FC[S.fuel]}">${price?price.toFixed(3)+' €/L':'N/A'}</b><br><a href="https://maps.google.com/?q=${st.lat},${st.lng}" target="_blank" rel="noopener" style="color:#0b7f88;font-size:.85rem">🧭 Itinéraire</a>`);
    mk.on('click',()=>{S.selId=st.id;renderDetail();expandBottomSheet();});
    S.clusterGroup.addLayer(mk);
    S.markers.push(mk);
  });
  setTimeout(()=>S.map.invalidateSize(),50);
}

function renderUserPosition() {
  ensureMap();
  if(S.userDot) S.userDot.remove();
  S.userDot=L.marker([S.pos.lat,S.pos.lng],{icon:userIcon()}).addTo(S.map);
  S.map.flyTo([S.pos.lat,S.pos.lng],13,{animate:true,duration:1.5});
}

// —— Fiche détail ————————————————————————————————————————————————————
function renderDetail() {
  const st=S.stations.find(s=>s.id===S.selId);
  const box=document.getElementById('stationDetails');
  if(!box) return;
  if(!st){box.innerHTML='';return;}
  const vals=FUELS.map(f=>st.prices[f]).filter(Boolean);
  const min=Math.min(...vals),max=Math.max(...vals);
  const dist=km(S.pos.lat,S.pos.lng,st.lat,st.lng);
  let html=`<div class="detail-card">
    <div class="detail-header">
      <div>
        <div class="detail-name">${st.name}</div>
        <div class="detail-sub">${st.city}${st.addr?' · '+st.addr:''}</div>
        <div class="detail-dist">📍 ${dist} km${st.updated?' · màj '+new Date(st.updated).toLocaleDateString('fr-FR'):''}</div>
      </div>
      <a href="https://maps.google.com/?q=${st.lat},${st.lng}" target="_blank" rel="noopener" class="btn btn-itinerary">🧭 <span>Itinéraire</span></a>
    </div>
    <div class="price-grid">`;
  FUELS.forEach(f=>{
    if(!st.prices[f]) return;
    const cls=st.prices[f]===min?'best':st.prices[f]===max?'worst':'';
    const pct=max>min?Math.round(((st.prices[f]-min)/(max-min))*100):0;
    html+=`<div class="price-chip ${cls}">
      <div class="f-name">${f}</div>
      <div class="f-val" style="color:${FC[f]}">${st.prices[f].toFixed(3)} €</div>
      <div class="f-bar"><div class="f-bar-fill" style="width:${100-pct}%;background:${FC[f]}"></div></div>
    </div>`;
  });
  html+=`</div><div class="detail-actions">
    <button class="btn" onclick="openProposalFor(${st.id})">✏️ Corriger un prix</button>
    <button class="btn" onclick="S.selId=null;renderDetail()">&times; Fermer</button>
  </div></div>`;
  box.innerHTML=html;
}

window.openProposalFor=function(stId){
  const sel=document.getElementById('commentStation');
  if(sel) sel.value=stId;
  viewTransition('communityView');
  toast('Station pré-sélectionnée');
};

// —— Prix moyens pills ————————————————————————————————————————————————
function updatePillAverages() {
  const items=S.stations.filter(s=>!S.radius||km(S.pos.lat,S.pos.lng,s.lat,s.lng)<=S.radius);
  FUELS.forEach(f=>{
    const el=document.getElementById(`avg-${f}`); if(!el) return;
    const vals=items.map(s=>s.prices[f]).filter(Boolean);
    el.textContent=vals.length?(vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(2)+'€':'';
  });
}

// —— Liste stations ——————————————————————————————————————————————————
function renderStationList() {
  const list=document.getElementById('stationList'); if(!list) return;
  const fuel=S.fuel;
  const items=filtered();
  const best=items.length?Math.min(...items.map(s=>s.prices[fuel])):null;
  const worst=items.length?Math.max(...items.map(s=>s.prices[fuel])):null;
  const bestMini=document.getElementById('bestPriceMini');
  if(bestMini) bestMini.textContent=best!==null?`${best.toFixed(3)}€ min`:'—';
  updatePillAverages();

  if(!items.length){
    list.innerHTML=`<div class="empty">
      <div style="font-size:2rem;margin-bottom:.5rem">⛽</div>
      <h3>Aucune station trouvée</h3>
      <p>Augmentez le rayon ou changez de carburant.</p>
      <button class="btn btn-pri" style="margin-top:.75rem" onclick="openCitySearch()">🏙️ Chercher une ville</button>
    </div>`;
    return;
  }

  list.innerHTML=items.map((st,i)=>{
    const price=st.prices[fuel];
    const klass=price===best?'good':price===worst?'high':'mid';
    const dist=km(S.pos.lat,S.pos.lng,st.lat,st.lng);
    const pct=best!==null&&worst!==null&&worst>best?Math.round(((price-best)/(worst-best))*100):0;
    return `<div class="station-item" data-id="${st.id}">
      <div class="station-top">
        <div class="station-left">
          <div class="station-num">${String(i+1).padStart(2,'0')}</div>
          <div style="min-width:0">
            <div class="station-name">${st.name}</div>
            <div class="station-sub">${st.addr||st.city}</div>
          </div>
        </div>
        <div class="station-price ${klass}">${price.toFixed(3)}<div style="font-size:.72rem;font-weight:700;color:var(--tx2)">€/L</div></div>
      </div>
      <div class="station-bar"><div class="station-bar-fill ${klass}" style="width:${100-pct}%"></div></div>
      <div class="station-actions">
        <span class="station-action">📍 ${dist} km</span>
        <a class="station-action" href="https://maps.google.com/?q=${st.lat},${st.lng}" target="_blank" rel="noopener">🧭 Itinéraire</a>
      </div>
    </div>`;
  }).join('');

  list.querySelectorAll('.station-item').forEach(el=>{
    el.addEventListener('click',()=>{
      S.selId=+el.dataset.id;
      renderDetail(); expandBottomSheet();
      const st=S.stations.find(s=>s.id===S.selId);
      if(st&&S.map) S.map.flyTo([st.lat,st.lng],15,{animate:true,duration:1});
    });
  });
}

// —— Bottom sheet ————————————————————————————————————————————————————
function expandBottomSheet(){
  const panel=document.getElementById('stationPanel');
  if(panel&&window.innerWidth<=700) panel.classList.add('expanded');
}
function initDragHandle(){
  const handle=document.getElementById('dragHandle');
  const panel=document.getElementById('stationPanel');
  if(!handle||!panel) return;
  let startY=0;
  handle.addEventListener('pointerdown',e=>{startY=e.clientY;handle.setPointerCapture(e.pointerId);});
  handle.addEventListener('pointermove',e=>{
    if(!e.buttons) return;
    const dy=e.clientY-startY;
    if(dy<-30) panel.classList.add('expanded');
    if(dy>30)  panel.classList.remove('expanded');
  });
}

// —— Session ——————————————————————————————————————————————————————————
function renderSession(){
  const box=document.getElementById('sessionCard'); if(!box) return;
  if(!S.user){box.innerHTML='<div class="empty"><h3>Invité</h3><p>Créez un compte pour commenter.</p></div>';return;}
  box.innerHTML=`
    <div class="log-item" style="display:flex;justify-content:space-between"><span>Prénom</span><b>${S.user.name}</b></div>
    <div class="log-item" style="display:flex;justify-content:space-between"><span>Email</span><b>${S.user.email}</b></div>
    <div class="log-item" style="display:flex;justify-content:space-between"><span>Carburant</span><span class="fuel-chip ${FCLS[S.user.fuel]}">${S.user.fuel}</span></div>`;
}

// —— Admin ————————————————————————————————————————————————————————————
function renderAdmin(){
  const q=[
    ...S.comments.filter(c=>c.status==='pending').map(c=>({type:'comment',...c})),
    ...S.proposals.filter(p=>p.status==='pending').map(p=>({type:'proposal',...p}))
  ].sort((a,b)=>b.at-a.at);
  const blob=document.getElementById('adminBlob');
  const count=document.getElementById('adminQueueCount');
  if(blob) blob.textContent=q.length;
  if(count) count.textContent=q.length;
  const queue=document.getElementById('adminQueueFull');
  if(queue){
    queue.innerHTML=q.map(item=>{
      const st=S.stations.find(s=>s.id===item.stId);
      return `<div class="queue-item">
        <div style="display:flex;gap:.5rem;flex-wrap:wrap;margin-bottom:.5rem">
          <span class="badge ${item.type==='comment'?'bg-pri':'bg-acc'}">${item.type==='comment'?'Commentaire':'Correction'}</span>
          <span class="badge bg-acc">En attente</span>
        </div>
        <div style="font-weight:800;font-size:.92rem">${st?.name||'Station'} — ${st?.city||''}</div>
        <div style="font-size:.78rem;color:var(--tx2);margin:.2rem 0 .55rem">Par <b>${item.author}</b></div>
        <div style="background:var(--bg);border:1px solid var(--bor);border-radius:.9rem;padding:.65rem .75rem;font-size:.9rem;line-height:1.45;margin-bottom:.55rem">
          ${item.type==='comment'?item.text:`<span class="fuel-chip ${FCLS[item.fuel]}">${item.fuel}</span> → <strong style="color:var(--ok)">${item.price.toFixed(3)} €/L</strong><div style="margin-top:.35rem;font-size:.8rem">${item.reason}</div>`}
        </div>
        <div style="display:flex;gap:.5rem;flex-wrap:wrap">
          <button class="btn btn-pri" style="padding:.55rem .85rem" onclick="approve('${item.type}',${item.id})">✓ Approuver</button>
          <button class="btn btn-danger" style="padding:.55rem .85rem" onclick="reject('${item.type}',${item.id})">✕ Refuser</button>
        </div>
      </div>`;
    }).join('')||'<div class="empty"><h3>File vide</h3></div>';
  }
  const log=document.getElementById('activityLog');
  if(log) log.innerHTML=S.activity.map(x=>`<div class="log-item" style="display:flex;justify-content:space-between;gap:.75rem"><div>${x.msg}</div><div style="color:var(--tx2);font-size:.72rem;white-space:nowrap">${x.at}</div></div>`).join('')||'<div class="empty"><h3>Aucune activité</h3></div>';
}

function hydrateSelects(){
  const el=document.getElementById('profileFuelSelect');
  if(el){el.innerHTML=FUELS.map(x=>`<option value="${x}">${x}</option>`).join('');el.value=S.fuel;}
  const c=document.getElementById('commentStation');
  if(c) c.innerHTML=S.stations.map(s=>`<option value="${s.id}">${s.name} — ${s.city}</option>`).join('');
}

function renderAll(){
  hydrateSelects(); renderMap(); renderDetail(); renderSession(); renderAdmin(); renderStationList();
}

// —— Approve / Reject ————————————————————————————————————————————————
function approve(type,id){
  const c=S.comments.find(x=>x.id===id), p=S.proposals.find(x=>x.id===id);
  if(type==='comment'&&c) c.status='approved';
  if(type==='proposal'&&p){p.status='approved';const st=S.stations.find(s=>s.id===p.stId);if(st) st.prices[p.fuel]=p.price;}
  S.activity.unshift({id:Date.now(),msg:`✅ ${type==='comment'?'Commentaire':'Prix'} approuvé`,at:now()});
  renderAll(); toast('Approuvé ✓');
}
function reject(type,id){
  const c=S.comments.find(x=>x.id===id), p=S.proposals.find(x=>x.id===id);
  if(type==='comment'&&c) c.status='rejected';
  if(type==='proposal'&&p) p.status='rejected';
  S.activity.unshift({id:Date.now(),msg:`❌ ${type==='comment'?'Commentaire':'Correction'} refusé`,at:now()});
  renderAll(); toast('Refusé ✗');
}
window.approve=approve; window.reject=reject;

// —— Navigation ———————————————————————————————————————————————————————
function viewTransition(id){
  const doSwitch=()=>{
    document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
    document.getElementById(id)?.classList.add('active');
    document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===id));
    const mapPanel=document.getElementById('mapPanel');
    const adminPanel=document.getElementById('adminPanel');
    if(id==='adminView'){if(mapPanel) mapPanel.style.display='none';if(adminPanel) adminPanel.style.display='block';setTimeout(()=>renderAdmin(),50);}
    else{if(mapPanel) mapPanel.style.display='block';if(adminPanel) adminPanel.style.display='none';}
    if(id==='mapView'&&S.map) setTimeout(()=>S.map.invalidateSize(),120);
  };
  document.startViewTransition?document.startViewTransition(doSwitch):doSwitch();
}
window.view=viewTransition;

window.openCitySearch=function(){
  const btn=document.getElementById('cityBtn'), search=document.getElementById('citySearch');
  if(btn) btn.classList.add('active');
  if(search) search.style.display='block';
  setTimeout(()=>document.getElementById('cityInput')?.focus(),30);
};

// —— Listeners ————————————————————————————————————————————————————————
document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>viewTransition(b.dataset.view)));

const cityBtn=document.getElementById('cityBtn'), citySearch=document.getElementById('citySearch');
if(cityBtn&&citySearch){
  cityBtn.addEventListener('click',()=>{
    cityBtn.classList.toggle('active');
    citySearch.style.display=citySearch.style.display==='none'?'block':'none';
    if(citySearch.style.display==='block') setTimeout(()=>document.getElementById('cityInput')?.focus(),20);
  });
}

let geocodeTimer=null;
const cityInput=document.getElementById('cityInput');
if(cityInput){
  cityInput.addEventListener('keydown',e=>{if(e.key==='Enter'){clearTimeout(geocodeTimer);geocodeAndLoad(cityInput.value);}});
  cityInput.addEventListener('input',()=>{
    const q=cityInput.value.trim(); clearTimeout(geocodeTimer);
    if(q.length<3) return;
    geocodeTimer=setTimeout(()=>geocodeAndLoad(q),600);
  });
}

const aroundBtn=document.getElementById('aroundMeBtn'), aroundMenu=document.getElementById('aroundMenu');
if(aroundBtn&&aroundMenu) aroundBtn.addEventListener('click',()=>{aroundMenu.style.display=aroundMenu.style.display==='block'?'none':'block';});

const radiusRange=document.getElementById('radiusRange'), radiusVal=document.getElementById('radiusVal');
if(radiusRange&&radiusVal) radiusRange.addEventListener('input',()=>{S.radius=+radiusRange.value;radiusVal.textContent=S.radius;renderMap();renderStationList();});

const locateBtn = document.getElementById('locateBtn');
if (locateBtn) {
  locateBtn.addEventListener('click', () => {
    if (!navigator.geolocation) return setMapBadge('error', 'Géoloc indisponible');

    setMapBadge('loading', 'Localisation…');

    navigator.geolocation.getCurrentPosition(
      pos => {
        S.pos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        renderUserPosition();
        fetchStationsAPI(S.pos.lat, S.pos.lng, S.radius);
      },
      () => {
        const list = document.getElementById('stationList');
        if (list) {
          list.innerHTML = `<div class="empty">
            <div style="font-size:2rem;margin-bottom:.5rem">📵</div>
            <h3>Localisation refusée</h3>
            <p>Autorisez la géolocalisation ou recherchez une ville.</p>
            <button class="btn btn-pri" style="margin-top:.75rem" onclick="openCitySearch()">🏙️ Chercher une ville</button>
          </div>`;
        }
        setMapBadge('error', 'Position refusée');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  });
}

document.querySelectorAll('.fuel-pill').forEach(btn=>btn.addEventListener('click',()=>{
  document.querySelectorAll('.fuel-pill').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active'); S.fuel=btn.dataset.fuel;
  renderMap(); renderDetail(); renderStationList();
}));

document.querySelectorAll('.status-pill').forEach(btn=>btn.addEventListener('click',()=>{
  document.querySelectorAll('.status-pill').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active'); S.statusFilter=btn.dataset.status;
  renderMap(); renderStationList();
}));

const registerForm=document.getElementById('registerForm');
if(registerForm) registerForm.addEventListener('submit',e=>{
  e.preventDefault();
  const fd=new FormData(e.target);
  S.user={name:fd.get('name'),email:fd.get('email'),fuel:fd.get('preferredFuel')};
  S.fuel=S.user.fuel; e.target.reset();
  toast(`Bienvenue ${S.user.name} 👋`); renderAll();
});

const commentForm=document.getElementById('commentForm');
if(commentForm) commentForm.addEventListener('submit',e=>{
  e.preventDefault();
  if(!S.user) return toast('Créez un compte d\'abord.');
  const txt=document.getElementById('commentText')?.value.trim();
  if(!txt) return toast('Ajoutez un commentaire.');
  const file=document.getElementById('commentPhoto')?.files[0];
  S.comments.unshift({id:Date.now(),stId:+document.getElementById('commentStation').value,author:S.user.name,text:txt,status:'pending',photo:file?file.name:'',at:Date.now()});
  e.target.reset(); hidePreview('comment');
  S.activity.unshift({id:Date.now(),msg:`💬 Commentaire soumis par ${S.user.name}`,at:now()});
  renderAll(); toast('Envoyé — en attente de modération');
});

function preview(file,input){
  const wrap=document.getElementById(input+'Preview'); if(!wrap||!file){if(wrap) wrap.style.display='none';return;}
  const img=document.getElementById(input+'PreviewImg'), name=document.getElementById(input+'PreviewName'), size=document.getElementById(input+'PreviewSize');
  if(img) img.src=URL.createObjectURL(file);
  if(name) name.textContent=file.name;
  if(size) size.textContent=(file.size/1024/1024).toFixed(2)+' MB';
  wrap.style.display='flex';
}
function hidePreview(input){const wrap=document.getElementById(input+'Preview');if(wrap) wrap.style.display='none';}
const commentPhoto=document.getElementById('commentPhoto');
if(commentPhoto) commentPhoto.addEventListener('change',e=>preview(e.target.files[0],'comment'));

const seedBtn=document.getElementById('seedBtn');
if(seedBtn) seedBtn.addEventListener('click',()=>{
  S.stations=JSON.parse(JSON.stringify(DEMO));
  S.comments=[{id:1,stId:2,author:'Lucas',text:'Prix conformes ce matin.',status:'approved',at:Date.now()-3e5},{id:2,stId:1,author:'Nora',text:'Beaucoup de monde.',status:'pending',at:Date.now()-1e5}];
  S.proposals=[{id:1,stId:6,fuel:'SP95-E10',price:1.689,reason:'Photo ticket.',author:'Mathis',photo:'ticket.jpg',status:'pending',at:Date.now()}];
  S.activity=[{id:1,msg:'🎭 Mode démo activé',at:now()}];
  setMapBadge('ok',`${S.stations.length} stations démo`);
  renderAll(); toast('🎭 Démo activée');
});

const themeChk=document.getElementById('themeChk');
function setTheme(dark){
  document.documentElement.setAttribute('data-theme',dark?'dark':'light');
  if(themeChk) themeChk.checked=dark;
  const knob=document.querySelector('.ios-knob');
  if(knob) knob.innerHTML=dark
    ?'<svg class="ico-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>'
    :'<svg class="ico-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>';
  if(S.map) setTimeout(()=>S.map.invalidateSize(),120);
  localStorage.setItem('theme',dark?'dark':'light');
}
if(themeChk) themeChk.addEventListener('change',()=>setTheme(themeChk.checked));
const savedTheme=localStorage.getItem('theme'), prefersDark=matchMedia('(prefers-color-scheme: dark)').matches;
setTheme(savedTheme?savedTheme==='dark':prefersDark);

// —— Init ————————————————————————————————————————————————————————————
function init(){
  initDragHandle();
  hydrateSelects();
  setMapBadge('loading','Chargement…');
  renderAll();
  setTimeout(()=>S.map?.invalidateSize(),200);
  fetchStationsAPI(46.6,1.88,500);
}
document.addEventListener('DOMContentLoaded',init);
