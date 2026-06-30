const state = {
  selectedId: 'Phoenix-AZ',
  region: 'all',
  tier: 'all',
  metric: 'overallScore',
  search: ''
};

const metricLabels = {
  overallScore: 'Overall Opportunity',
  roofingScore: 'Roofing Score',
  fmScore: 'FM / Insurance Score',
  weatherRisk: 'Weather Delay Risk',
  workableDays: 'Workable Roof Days',
  competitionScore: 'Competition Pressure'
};

const metricMax = {
  overallScore: 100,
  roofingScore: 100,
  fmScore: 100,
  weatherRisk: 100,
  workableDays: 330,
  competitionScore: 100
};

function marketId(m) { return `${m.city}-${m.state}`; }

function scoreClass(value, metric) {
  const pct = value / metricMax[metric];
  if (metric === 'competitionScore' || metric === 'weatherRisk') {
    if (pct >= .75) return 'riskHigh';
    if (pct >= .55) return 'riskMid';
    return 'riskLow';
  }
  if (pct >= .78) return 'high';
  if (pct >= .62) return 'mid';
  return 'low';
}

function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }

function projectMarket(m) {
  // Simple U.S. continental projection. Not cartography. Product trial, not NASA.
  const x = ((m.lng + 124.8) / 58.5) * 100;
  const y = ((50.2 - m.lat) / 25.2) * 100;
  return { x: clamp(x, 4, 96), y: clamp(y, 7, 94) };
}

function filteredMarkets() {
  return MARKETS.filter(m => {
    const matchesRegion = state.region === 'all' || m.region === state.region;
    const matchesTier = state.tier === 'all' || m.tier === state.tier;
    const q = state.search.trim().toLowerCase();
    const matchesSearch = !q || `${m.city} ${m.state} ${m.region}`.toLowerCase().includes(q);
    return matchesRegion && matchesTier && matchesSearch;
  });
}

function populateFilters() {
  const regions = [...new Set(MARKETS.map(m => m.region))].sort();
  const tiers = [...new Set(MARKETS.map(m => m.tier))].sort();
  const regionFilter = document.getElementById('regionFilter');
  const tierFilter = document.getElementById('tierFilter');
  regions.forEach(r => regionFilter.insertAdjacentHTML('beforeend', `<option value="${r}">${r}</option>`));
  tiers.forEach(t => tierFilter.insertAdjacentHTML('beforeend', `<option value="${t}">Tier ${t}</option>`));
}

function renderMap() {
  const layer = document.getElementById('markerLayer');
  const tooltip = '<div id="mapTooltip" class="market-tooltip"></div>';
  layer.innerHTML = tooltip;
  const tip = document.getElementById('mapTooltip');
  const markets = filteredMarkets();

  markets.forEach(m => {
    const value = m[state.metric];
    const pct = value / metricMax[state.metric];
    const size = Math.round(clamp(18 + pct * 26, 20, 44));
    const point = projectMarket(m);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `market-pin ${scoreClass(value, state.metric)} ${marketId(m) === state.selectedId ? 'selected' : ''}`;
    btn.dataset.id = marketId(m);
    btn.style.left = `${point.x}%`;
    btn.style.top = `${point.y}%`;
    btn.style.width = `${size}px`;
    btn.style.height = `${size}px`;
    btn.title = `${m.city}, ${m.state} | ${metricLabels[state.metric]}: ${value}`;
    btn.innerHTML = `<span>${Math.round(value)}</span>`;
    btn.addEventListener('mouseenter', () => {
      tip.innerHTML = `<strong>${m.city}, ${m.state}</strong><br>${metricLabels[state.metric]}: ${value}<br>Overall: ${m.overallScore} · Tier ${m.tier}`;
      tip.style.left = `${point.x}%`;
      tip.style.top = `${point.y}%`;
      tip.style.display = 'block';
    });
    btn.addEventListener('mouseleave', () => { tip.style.display = 'none'; });
    layer.appendChild(btn);
  });

  document.getElementById('mapSubtitle').textContent = `Metric: ${metricLabels[state.metric]}`;
  document.getElementById('visibleCountMap').textContent = `${markets.length} markets`;
}

function renderKpis() {
  const markets = filteredMarkets();
  const avg = key => Math.round(markets.reduce((s, m) => s + m[key], 0) / Math.max(1, markets.length));
  const top = [...markets].sort((a,b) => b.overallScore - a.overallScore)[0];
  document.getElementById('kpis').innerHTML = [
    { label:'Visible Markets', value:markets.length, sub:'Filtered count' },
    { label:'Avg Opportunity', value:avg('overallScore'), sub:'0-100 modeled score' },
    { label:'Avg Workable Days', value:avg('workableDays'), sub:'Estimated roof days/year' },
    { label:'Top Market', value: top ? top.city : 'None', sub: top ? `${top.overallScore} overall score` : 'Adjust filters' }
  ].map(k => `<article class="kpi"><span>${k.label}</span><strong>${k.value}</strong><small>${k.sub}</small></article>`).join('');
}

function renderTopMarkets() {
  const markets = [...filteredMarkets()].sort((a,b) => b.overallScore - a.overallScore).slice(0,5);
  document.getElementById('topMarkets').innerHTML = markets.map((m,i) => `
    <button class="top-item" data-id="${marketId(m)}">
      <span class="rank">${i+1}</span>
      <span><strong>${m.city}, ${m.state}</strong><small>${m.region} · Tier ${m.tier}</small></span>
      <b>${m.overallScore}</b>
    </button>
  `).join('');
}

function renderDetail() {
  const selected = MARKETS.find(m => marketId(m) === state.selectedId) || filteredMarkets()[0] || MARKETS[0];
  state.selectedId = marketId(selected);
  document.getElementById('detailCard').innerHTML = `
    <div class="detail-head">
      <div><span class="pill">Tier ${selected.tier}</span><h2>${selected.city}, ${selected.state}</h2><p>${selected.region}</p></div>
      <div class="big-score">${selected.overallScore}</div>
    </div>
    <p class="market-note">${selected.note}</p>
    <div class="score-bars">
      ${bar('Roofing Demand', selected.roofingScore, 100)}
      ${bar('FM / Insurance Fit', selected.fmScore, 100)}
      ${bar('Industrial Growth', selected.industrialGrowth, 100)}
      ${bar('Competition Pressure', selected.competitionScore, 100)}
      ${bar('Weather Delay Risk', selected.weatherRisk, 100)}
    </div>
    <div class="weather-grid">
      <div><span>Annual Rainfall</span><strong>${selected.annualRainfall}"</strong></div>
      <div><span>Rain Days</span><strong>${selected.rainDays}</strong></div>
      <div><span>Workable Roof Days</span><strong>${selected.workableDays}</strong></div>
      <div><span>Population</span><strong>${(selected.population/1000000).toFixed(1)}M</strong></div>
    </div>
    <div class="strategy-box"><h3>Suggested Sales Motion</h3><p>${strategyText(selected)}</p></div>
  `;
}

function bar(label, value, max) {
  return `<div class="bar-row"><div><span>${label}</span><b>${value}</b></div><div class="bar"><i style="width:${Math.min(100, value/max*100)}%"></i></div></div>`;
}

function strategyText(m) {
  if (m.fmScore >= 82) return 'Lead with large-format industrial, food/bev, logistics, pharma, and insurance-driven roof assemblies. Push compliance, risk reduction, and lifecycle documentation.';
  if (m.weatherRisk >= 80) return 'Lead with storm resilience, emergency response, inspection programs, insurance documentation, and rapid reroof capacity.';
  if (m.workableDays >= 290) return 'Lead with production speed, year-round crew availability, heat-aging inspections, and low-disruption retrofit cycles.';
  return 'Lead with targeted commercial retrofit, service agreements, facility manager outreach, and older-roof replacement planning.';
}

function renderTable() {
  const markets = filteredMarkets().sort((a,b) => b.overallScore - a.overallScore);
  document.getElementById('visibleCount').textContent = `${markets.length} markets`;
  document.getElementById('marketTable').innerHTML = markets.map(m => `
    <tr data-id="${marketId(m)}" class="${marketId(m) === state.selectedId ? 'active' : ''}">
      <td><strong>${m.city}, ${m.state}</strong></td><td>${m.region}</td><td>Tier ${m.tier}</td><td>${m.overallScore}</td><td>${m.roofingScore}</td><td>${m.fmScore}</td><td>${m.rainDays}</td><td>${m.workableDays}</td><td>${m.weatherRisk}</td>
    </tr>
  `).join('');
}

function renderAll() {
  renderKpis();
  renderTopMarkets();
  renderMap();
  renderDetail();
  renderTable();
}

function selectMarket(id) {
  state.selectedId = id;
  renderAll();
}

function resetFilters() {
  state.region = 'all'; state.tier = 'all'; state.search = ''; state.metric = 'overallScore';
  document.getElementById('regionFilter').value = 'all';
  document.getElementById('tierFilter').value = 'all';
  document.getElementById('searchInput').value = '';
  document.getElementById('metricSelect').value = 'overallScore';
  renderAll();
}

function wireEvents() {
  document.getElementById('regionFilter').addEventListener('change', e => { state.region = e.target.value; renderAll(); });
  document.getElementById('tierFilter').addEventListener('change', e => { state.tier = e.target.value; renderAll(); });
  document.getElementById('metricSelect').addEventListener('change', e => { state.metric = e.target.value; renderAll(); });
  document.getElementById('searchInput').addEventListener('input', e => { state.search = e.target.value; renderAll(); });
  document.getElementById('clearFilters').addEventListener('click', resetFilters);
  document.getElementById('rankByOpportunity').addEventListener('click', () => {
    state.metric = 'overallScore';
    document.getElementById('metricSelect').value = 'overallScore';
    renderAll();
  });
  document.body.addEventListener('click', e => {
    const item = e.target.closest('[data-id]');
    if (item && (item.classList.contains('market-pin') || item.classList.contains('top-item') || item.tagName === 'TR')) selectMarket(item.dataset.id);
  });
}

function boot() {
  if (!Array.isArray(window.MARKETS || MARKETS)) {
    document.body.innerHTML = '<main style="padding:24px;color:white">Market data failed to load. Check market-data.js.</main>';
    return;
  }
  populateFilters();
  wireEvents();
  renderAll();
}

boot();
