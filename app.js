const markets = window.MARKETS || [];
let selected = markets[0];
let filtered = [...markets];

const els = {
 map: document.getElementById('map'), rows: document.getElementById('marketRows'), topList: document.getElementById('topList'),
 search: document.getElementById('searchInput'), region: document.getElementById('regionFilter'), tier: document.getElementById('tierFilter'),
 score: document.getElementById('scoreFilter'), scoreValue: document.getElementById('scoreValue'), metric: document.getElementById('metricSelect'), reset: document.getElementById('resetBtn'),
 topMarket: document.getElementById('topMarket'), topScore: document.getElementById('topScore'), marketCount: document.getElementById('marketCount'), avgScore: document.getElementById('avgScore'), highCount: document.getElementById('highCount'),
 selectedName: document.getElementById('selectedName'), selectedSummary: document.getElementById('selectedSummary'), dRoof: document.getElementById('dRoof'), dFm: document.getElementById('dFm'), dWeather: document.getElementById('dWeather'), dWork: document.getElementById('dWork')
};

function init(){
 [...new Set(markets.map(m=>m.region))].sort().forEach(r=>{const o=document.createElement('option');o.value=r;o.textContent=r;els.region.appendChild(o)});
 drawMap(); bind(); applyFilters(); selectMarket(selected.city, selected.state);
}
function bind(){
 [els.search,els.region,els.tier,els.score,els.metric].forEach(el=>el.addEventListener('input',applyFilters));
 els.reset.addEventListener('click',()=>{els.search.value='';els.region.value='all';els.tier.value='all';els.score.value=0;els.metric.value='roofing';applyFilters();});
}
function metricVal(m){return Number(m[els.metric.value] ?? m.roofing)}
function dotClass(m){const v=metricVal(m); if(v>=70)return 'high'; if(v>=55)return 'mid'; return 'low'}
function drawMap(){
 els.map.innerHTML='';
 markets.forEach(m=>{
   const dot=document.createElement('button'); dot.className='dot'; dot.type='button'; dot.style.left=m.x+'%'; dot.style.top=m.y+'%'; dot.title=`${m.city}, ${m.state}`; dot.dataset.key=key(m); dot.setAttribute('aria-label',`${m.city}, ${m.state}`); dot.addEventListener('click',()=>selectMarket(m.city,m.state));
   const label=document.createElement('div'); label.className='dotLabel'; label.style.left=m.x+'%'; label.style.top=m.y+'%'; label.textContent=`${m.city}, ${m.state} · ${metricVal(m)}`;
   els.map.appendChild(dot); els.map.appendChild(label);
 });
}
function key(m){return `${m.city}-${m.state}`.replace(/\s+/g,'-')}
function applyFilters(){
 const q=els.search.value.trim().toLowerCase(); const min=Number(els.score.value); els.scoreValue.textContent=min;
 filtered=markets.filter(m=>(!q||`${m.city} ${m.state}`.toLowerCase().includes(q))&&(els.region.value==='all'||m.region===els.region.value)&&(els.tier.value==='all'||m.tier===els.tier.value)&&m.roofing>=min);
 updateDots(); updateRows(); updateKpis(); updateTopList(); updateDotLabels();
 if(!filtered.find(m=>key(m)===key(selected)) && filtered[0]) selectMarket(filtered[0].city,filtered[0].state);
}
function updateDots(){
 document.querySelectorAll('.dot').forEach(d=>{const m=markets.find(x=>key(x)===d.dataset.key); d.className=`dot ${dotClass(m)} ${filtered.includes(m)?'':'hidden'} ${key(m)===key(selected)?'active':''}`; const size=10+Math.max(0,Math.min(18,(metricVal(m)-35)/3)); d.style.width=size+'px'; d.style.height=size+'px';});
}
function updateDotLabels(){document.querySelectorAll('.dotLabel').forEach((l,i)=>{const m=markets[i]; l.textContent=`${m.city}, ${m.state} · ${metricVal(m)}`; l.style.display=filtered.includes(m)?'block':'none';});}
function updateRows(){
 els.rows.innerHTML='';
 filtered.slice().sort((a,b)=>b.roofing-a.roofing).forEach(m=>{const tr=document.createElement('tr');tr.className=key(m)===key(selected)?'active':'';tr.addEventListener('click',()=>selectMarket(m.city,m.state));tr.innerHTML=`<td><b>${m.city}, ${m.state}</b><div class="muted">Pop. ${formatPop(m.pop)}</div></td><td>${m.region}</td><td><span class="pill tier">${m.tier}</span></td><td><span class="pill">${m.roofing}</span></td><td>${m.fm}</td><td>${m.rainDays}</td><td>${m.workDays}</td>`;els.rows.appendChild(tr);});
}
function updateKpis(){
 const list=filtered.length?filtered:[]; const top=list.slice().sort((a,b)=>b.roofing-a.roofing)[0];
 els.marketCount.textContent=list.length; els.avgScore.textContent=list.length?Math.round(list.reduce((s,m)=>s+m.roofing,0)/list.length):'-'; els.highCount.textContent=list.filter(m=>m.roofing>=70).length; els.topMarket.textContent=top?`${top.city}, ${top.state}`:'-'; els.topScore.textContent=top?top.roofing:'-';
}
function updateTopList(){
 els.topList.innerHTML=''; filtered.slice().sort((a,b)=>b.roofing-a.roofing).slice(0,5).forEach(m=>{const li=document.createElement('li');li.innerHTML=`<span>${m.city}, ${m.state}</span><b>${m.roofing}</b>`;li.addEventListener('click',()=>selectMarket(m.city,m.state));els.topList.appendChild(li);});
}
function selectMarket(city,state){
 const m=markets.find(x=>x.city===city&&x.state===state); if(!m)return; selected=m;
 els.selectedName.textContent=`${m.city}, ${m.state}`; els.selectedSummary.textContent=m.summary; els.dRoof.textContent=m.roofing; els.dFm.textContent=m.fm; els.dWeather.textContent=m.weather; els.dWork.textContent=m.workDays;
 updateDots(); updateRows();
}
function formatPop(n){return n>=1000000?(n/1000000).toFixed(1)+'M':Math.round(n/1000)+'K'}
init();
