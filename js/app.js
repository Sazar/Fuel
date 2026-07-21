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
  stations:JSON.parse(JSON.stringify(DEMO)),
  comments:[],
  proposals:[],
  activity:[],
  selId:null,
  map:null,
  markers:[]
};

function toast(m,d=2200){
  const t=document.getElementById('toast');
  if(!t)return;
  t.textContent=m;
  t.style.opacity=1;
  clearTimeout(t._x);
  t._x=setTimeout(()=>t.style.opacity=0,d);
}

function km(a,b,c,d){
  const R=6371;
  const x=(c-a)*Math.PI/180;
  const y=(d-b)*Math.PI/180;
  const z=Math.sin(x/2)**2+Math.cos(a*Math.PI/180)*Math.cos(c*Math.PI/180)*Math.sin(y/2)**2;
  return +(2*R*Math.atan2(Math.sqrt(z),Math.sqrt(1-z))).toFixed(1);
}

function now(){
  return new Date().toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'});
}

function log(msg){
  S.activity.unshift({id:Date.now(),msg,at:now()});
  S.activity=S.activity.slice(0,20);
}

function hydrateSelects(){
  const f=FUELS.map(x=>'<option value="'+x+'">'+x+'</option>').join('');
  ['fuelFilter','profileFuelSelect','proposalFuel'].forEach(id=>{
    const el=document.getElementById(id);
    if(el){el.innerHTML=f;el.value=S.fuel}
  });
  
  const st=S.stations.map(s=>' <option value="'+s.id+'">'+s.name+' — '+s.city+'</option>').join('');
  ['commentStation','proposalStation'].forEach(id=>{
    const el=document.getElementById(id);
    if(el)el.innerHTML=st;
  });
}

function filtered(){
  const f=document.getElementById('fuelFilter').value||S.fuel;
  const q=(document.getElementById('searchFilter').value||'').toLowerCase();
  const mx=parseFloat(document.getElementById('maxPriceFilter').value||'999');
  const so=document.getElementById('sortFilter').value||'price';
  
  return S.stations.filter(s=>{
    return s.prices[f]&&s.prices[f]<=mx&&(q?String(s.name+' '+s.city+' '+(s.addr||'')).toLowerCase().includes(q):true);
  }).sort((a,b)=>{
    if(so==='name')return a.name.localeCompare(b.name);
    if(so==='distance')return km(S.pos.lat,S.pos.lng,a.lat,a.lng)-km(S.pos.lat,S.pos.lng,b.lat,b.lng);
    return a.prices[f]-b.prices[f];
  });
}

function icon(color){
  const svg='<svg xmlns="http://www.w3.org/2000/svg" width="28" height="36" viewBox="0 0 28 36"><path d="M14 0C6.3 0 0 6.3 0 14c0 10.2 14 22 14 22s14-11.8 14-22C28 6.3 21.7 0 14 0z" fill="'+color+'"/><circle cx="14" cy="14" r="6" fill="white" opacity=".92"/></svg>';
  return L.divIcon({html:svg,className:'',iconSize:[28,36],iconAnchor:[14,36],popupAnchor:[0,-36]});
}

function renderMap(){
  if(!S.map){
    S.map=L.map('map').setView([46.6,1.88],6);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap'}).addTo(S.map);
  }
  
  S.markers.forEach(m=>m.remove());
  S.markers=[];
  
  const f=document.getElementById('fuelFilter').value||S.fuel;
  filtered().slice(0,500).forEach(st=>{
    const mk=L.marker([st.lat,st.lng],{icon:icon(FC[f]||'#0b7f88')}).addTo(S.map);
    mk.bindPopup('<strong>'+st.name+'</strong><br>'+st.city+'<br><b style="color:'+FC[f]+'">'+st.prices[f].toFixed(3)+' €/L</b>');
    mk.on('click',()=>{S.selId=st.id;renderDetail();});
    S.markers.push(mk);
  });
}

function rankItem(st,f,i,dist){
  return '<div class="rank-item"><div class="rank-num r'+(i+1)+'">'+(i+1)+'</div><div class="rank-info"><div class="rank-name">'+st.name+'</div><div class="rank-city">'+st.city+(dist?' · '+dist+' km':'')+'</div></div><div class="rank-price">'+st.prices[f].toFixed(3)+' €</div></div>';
}

function renderRankings(){
  const f=S.fuel;
  document.getElementById('nFuelBadge').textContent=f;
  document.getElementById('stationCount').textContent=S.stations.length;
  document.getElementById('pendingCount').textContent=S.comments.filter(c=>c.status==='pending').length+S.proposals.filter(p=>p.status==='pending').length;
  document.getElementById('commentCount').textContent=S.comments.filter(c=>c.status==='approved').length;
  
  const arr=S.stations.filter(s=>s.prices[f]);
  const nat=[...arr].sort((a,b)=>a.prices[f]-b.prices[f]).slice(0,3);
  const near=[...arr].sort((a,b)=>km(S.pos.lat,S.pos.lng,a.lat,a.lng)-km(S.pos.lat,S.pos.lng,b.lat,b.lng)).slice(0,20).sort((a,b)=>a.prices[f]-b.prices[f]).slice(0,3);
  
  document.getElementById('nationalTop').innerHTML=nat.map((s,i)=>rankItem(s,f,i,'')).join('')||'<div class="empty"><h3>Aucune station</h3><p>Chargez la démo.</p></div>';
  document.getElementById('nearbyTop').innerHTML=near.map((s,i)=>rankItem(s,f,i,km(S.pos.lat,S.pos.lng,s.lat,s.lng))).join('')||'<div class="empty"><h3>GPS requis</h3><p>Activez votre position.</p></div>';
}

function renderDetail(){
  const st=S.stations.find(s=>s.id===S.selId);
  const box=document.getElementById('stationDetails');
  
  if(!st){
    box.innerHTML='<div class="empty"><h3>Choisissez une station</h3><p>Le détail s\'affichera ici.</p></div>';
    return;
  }
  
  const vals=FUELS.map(f=>st.prices[f]).filter(v=>v);
  const min=Math.min(...vals), max=Math.max(...vals);
  
  let html='<div style="margin-bottom:.8rem"><div style="font-family:var(--fdis);font-size:1.15rem;font-weight:900">'+st.name+'</div><div style="font-size:.88rem;color:var(--tx1)">'+st.city+(st.addr?' · '+st.addr:'')+'</div></div><div class="price-grid">';
  
  FUELS.forEach(f=>{
    if(st.prices[f]){
      const cls=st.prices[f]===min?'best':st.prices[f]===max?'worst':'';
      html+='<div class="price-chip '+cls+'"><div class="f-name">'+f+'</div><div class="f-val" style="color:'+FC[f]+'">'+st.prices[f].toFixed(3)+' €</div></div>';
    }
  });
  
  html+='</div>';
  box.innerHTML=html;
}

function renderSession(){
  const box=document.getElementById('sessionCard');
  
  if(!S.user){
    box.innerHTML='<div class="empty"><h3>Invité</h3><p>Créez un compte pour commenter et proposer des corrections.</p></div>';
    return;
  }
  
  box.innerHTML='<div class="log-item" style="display:flex;justify-content:space-between"><span>Prénom</span><b>'+S.user.name+'</b></div><div class="log-item" style="display:flex;justify-content:space-between"><span>Email</span><b>'+S.user.email+'</b></div><div class="log-item" style="display:flex;justify-content:space-between"><span>Carburant</span><span class="fuel-chip '+FCLS[S.user.fuel]+'">'+S.user.fuel+'</span></div>';
}

function renderAdmin(){
  const q=[
    ...S.comments.filter(c=>c.status==='pending').map(c=>({type:'comment',...c})),
    ...S.proposals.filter(p=>p.status==='pending').map(p=>({type:'proposal',...p}))
  ].sort((a,b)=>b.at-a.at);
  
  document.getElementById('queueCount').textContent=q.length;
  document.getElementById('adminBlob').textContent=q.length;
  document.getElementById('adminMobBlob').textContent=q.length;
  
  let queueHtml=q.map(item=>{
    const st=S.stations.find(s=>s.id===item.stId);
    let previewHtml='';
    if(item.photo){
      previewHtml='<div class="preview-link" onclick="alert(\'Simulation : photo \"'+item.photo+'\" affichée pour validation.\')">📷 Prevoir : '+item.photo+'</div>';
    }
    
    return '<div class="queue-item"><div style="display:flex;gap:.5rem;flex-wrap:wrap;margin-bottom:.5rem"><span class="badge '+(item.type==='comment'?'bg-pri':'bg-acc')+'">'+(item.type==='comment'?'Commentaire':'Correction')+'</span><span class="badge bg-acc">En attente</span></div><div style="font-weight:800;font-size:.92rem">'+(st?.name||'Station')+' — '+(st?.city||'')+'</div><div style="font-size:.78rem;color:var(--tx2);margin:.2rem 0 .55rem">Par <b>'+item.author+'</b></div><div style="background:var(--bg);border:1px solid var(--bor);border-radius:.9rem;padding:.65rem .75rem;font-size:.9rem;line-height:1.45;margin-bottom:.55rem">'+(item.type==='comment'?item.text:'<span class="fuel-chip '+FCLS[item.fuel]+'">'+item.fuel+'</span> → <strong style="color:var(--ok)">'+item.price.toFixed(3)+' €/L</strong><div style="margin-top:.35rem;color:var(--tx1);font-size:.8rem">'+item.reason+'</div>')+'</div>'+previewHtml+'<div style="display:flex;gap:.5rem;margin-top:.75rem;flex-wrap:wrap"><button class="btn btn-pri" style="padding:.55rem .85rem" onclick="approve(\''+item.type+'\','+item.id+')">✓ Approuver</button><button class="btn btn-danger" style="padding:.55rem .85rem" onclick="reject(\''+item.type+'\','+item.id+')">✕ Refuser</button></div></div>';
  }).join('');
  
  document.getElementById('adminQueue').innerHTML=queueHtml||'<div class="empty"><h3>File vide</h3><p>Aucune contribution en attente.</p></div>';
  
  let activityHtml=S.activity.map(x=>'<div class="log-item" style="display:flex;justify-content:space-between;gap:.75rem"><div>'+x.msg+'</div><div style="color:var(--tx2);font-size:.72rem;white-space:nowrap">'+x.at+'</div></div>').join('');
  document.getElementById('activityLog').innerHTML=activityHtml||'<div class="empty"><h3>Aucune activité</h3><p>Les actions récentes apparaîtront ici.</p></div>';
}

function renderAll(){
  hydrateSelects();
  renderMap();
  renderRankings();
  renderDetail();
  renderSession();
  renderAdmin();
  document.getElementById('lastUpdateVal').textContent=now();
}

function approve(type,id){
  const ts=new Date().toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'});
  
  if(type==='comment'){
    const c=S.comments.find(x=>x.id===id);
    if(c){
      c.status='approved';
      log('✅ Commentaire approuvé par '+(S.user?.name||'système')+' à '+ts+': texte ajouté.');
    }
  }else{
    const p=S.proposals.find(x=>x.id===id);
    if(p){
      p.status='approved';
      const st=S.stations.find(s=>s.id===p.stId);
      if(st){
        st.prices[p.fuel]=p.price;
        log('⛽ Prix mis à jour pour '+p.fuel+' sur '+st.name+' à '+ts+': '+p.price.toFixed(3)+' €/L');
      }
      if(p.photo)log('📷 Preuve photo acceptée : '+p.photo);
    }
  }
  
  renderAll();
  toast('Approuvé');
}

function reject(type,id){
  const ts=new Date().toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'});
  
  if(type==='comment'){
    const c=S.comments.find(x=>x.id===id);
    if(c){
      c.status='rejected';
      log('🚫 Commentaire refusé par '+(S.user?.name||'système')+' à '+ts+': texto retiré.');
    }
  }else{
    const p=S.proposals.find(x=>x.id===id);
    if(p){
      p.status='rejected';
      log('🚫 Correction refusée pour '+p.fuel+' à '+ts+': prix non modifié.');
    }
    if(p.photo)log('🗑️ Preuve photo rejetée : '+p.photo);
  }
  
  renderAll();
  toast('Refusé');
}

window.approve=approve;
window.reject=reject;

function view(id){
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  
  document.querySelectorAll('[data-view]').forEach(b=>{
    if(b.dataset.view===id){
      b.classList.add('active');
    }else{
      b.classList.remove('active');
    }
  });
  
  if(id==='mapView'&&S.map){
    setTimeout(()=>S.map.invalidateSize(),120);
  }
}

// Initialization
document.querySelectorAll('[data-view]').forEach(b=>{
  b.addEventListener('click',()=>view(b.dataset.view));
});

['fuelFilter','searchFilter','maxPriceFilter','sortFilter'].forEach(id=>{
  document.getElementById(id).addEventListener('input',()=>{
    renderMap();
    renderDetail();
    if(id==='fuelFilter')renderRankings();
  });
});

document.getElementById('registerForm').addEventListener('submit',e=>{
  e.preventDefault();
  const fd=new FormData(e.target);
  S.user={name:fd.get('name'),email:fd.get('email'),fuel:fd.get('preferredFuel')};
  S.fuel=S.user.fuel;
  log('👤 Compte créé : '+S.user.name);
  e.target.reset();
  toast('Bienvenue, '+S.user.name+' !');
  renderAll();
});

document.getElementById('commentForm').addEventListener('submit',e=>{
  e.preventDefault();
  if(!S.user)return toast('Créez un compte d\'abord.');
  const txt=document.getElementById('commentText').value.trim();
  if(!txt)return toast('Ajoutez un commentaire.');
  const file=document.getElementById('commentPhoto').files[0];
  S.comments.unshift({
    id:Date.now(),
    stId:+document.getElementById('commentStation').value,
    author:S.user.name,
    text:txt,
    status:'pending',
    photo:file?file.name:'',
    at:Date.now()
  });
  log('💬 Commentaire soumis par '+S.user.name);
  document.getElementById('commentText').value='';
  document.getElementById('commentPhoto').value='';
  hidePreview('comment');
  renderAll();
  toast('Envoyé en modération');
});

document.getElementById('priceProposalForm').addEventListener('submit',e=>{
  e.preventDefault();
  if(!S.user)return toast('Créez un compte d\'abord.');
  const pr=parseFloat(document.getElementById('proposalPrice').value);
  const re=document.getElementById('proposalReason').value.trim();
  if(!pr||!re)return toast('Complétez le formulaire.');
  const file=document.getElementById('proposalPhoto').files[0];
  S.proposals.unshift({
    id:Date.now(),
    stId:+document.getElementById('proposalStation').value,
    fuel:document.getElementById('proposalFuel').value,
    price:pr,
    reason:re,
    author:S.user.name,
    photo:file?file.name:'',
    status:'pending',
    at:Date.now()
  });
  log('✏️ Correction proposée par '+S.user.name);
  e.target.reset();
  document.getElementById('proposalPhoto').value='';
  hidePreview('proposal');
  renderAll();
  toast('Proposition envoyée');
});

document.getElementById('locateBtn').addEventListener('click',()=>{
  if(!navigator.geolocation)return toast('Géolocalisation indisponible.');
  navigator.geolocation.getCurrentPosition(p=>{
    S.pos={lat:p.coords.latitude,lng:p.coords.longitude};
    if(S.map)S.map.setView([S.pos.lat,S.pos.lng],11);
    renderRankings();
    toast('Position détectée');
  },()=>toast('Position refusée'));
});

document.getElementById('seedBtn').addEventListener('click',()=>{
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

function preview(file,input){
  const wrap=document.getElementById(input+'Preview');
  if(!file){wrap.style.display='none';return}
  document.getElementById(input+'PreviewImg').src=URL.createObjectURL(file);
  document.getElementById(input+'PreviewName').textContent=file.name;
  document.getElementById(input+'PreviewSize').textContent=(file.size/1024/1024).toFixed(2)+' MB';
  wrap.style.display='flex';
}

function hidePreview(input){
  const wrap=document.getElementById(input+'Preview');
  if(wrap)wrap.style.display='none';
}

document.getElementById('commentPhoto').addEventListener('change',e=>preview(e.target.files[0],'comment'));
document.getElementById('proposalPhoto').addEventListener('change',e=>preview(e.target.files[0],'proposal'));

const themeChk=document.getElementById('themeChk');
const themeIcon=document.getElementById('theme-toggle').querySelector('.icon');

function setTheme(dark){
  document.documentElement.setAttribute('data-theme',dark?'dark':'light');
  themeChk.checked=dark;
  themeIcon.textContent=dark?'🌙':'☀️';
  if(S.map)setTimeout(()=>S.map.invalidateSize(),120);
  localStorage.setItem('theme',dark?'dark':'light');
}

themeChk.addEventListener('change',()=>setTheme(themeChk.checked));
document.getElementById('theme-toggle').addEventListener('click',()=>setTheme(!themeChk.checked));

const saved=localStorage.getItem('theme');
const dark=saved==='dark'||(!saved&&window.matchMedia('(prefers-color-scheme:dark)').matches);
setTheme(dark);

S.comments=[];S.proposals=[];S.activity=[];
renderAll();