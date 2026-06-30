const appState = {
  selectedId: 'Phoenix-AZ',
  region: 'all',
  tier: 'all',
  metric: 'overallScore',
  search: '',
  sortKey: 'overallScore'
};

const metricLabels = {
  overallScore: 'Overall Opportunity',
  roofingScore: 'Roofing Score',
  fmScore: 'FM / Insurance Score',
  weatherRisk: 'Weather Risk',
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

const bounds = {
  minLat: 24,
  maxLat: 49.5,
  minLng: -124.8,
  maxLng: -66.6
};

function idFor(market) {
  return `${market.city}-${market.state}`;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function formatPopulation(value) {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  return `${Math.round(value / 1000)}K`;
}

function filteredMarkets() {
  const query = appState.search.trim().toLowerCase();
  return MARKETS.filter((market) => {
    const regionOk = appState.region === 'all' || market.region === appState.region;
    const tierOk = appState.tier === 'all' || market.tier === appState.tier;
    const searchOk = !query || `${market.city} ${market.state} ${market.region}`.toLowerCase().includes(query);
    return regionOk && tierOk && searchOk;
  });
}

function metricClass(value, metric) {
  const pct = value / metricMax[metric];
  if (metric === 'weatherRisk' || metric === 'competitionScore') {
    if (pct >= 0.75) return 'bad';
    if (pct >= 0.55) return 'mid';
    return 'good';
  }
  if (pct >= 0.78) return 'good';
  if (pct >= 0.62) return 'mid';
  return 'bad';
}

function metricSize(value, metric) {
  const pct = clamp(value / metricMax[metric], 0.15, 1);
  return Math.round(22 + pct * 26);
}

function projectPoint(market) {
  const x = ((market.lng - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * 100;
  const y = (1 - ((market.lat - bounds.minLat) / (bounds.maxLat - bounds.minLat))) * 100;
  return {
    x: clamp(x, 4, 96),
    y: clamp(y, 5, 92)
  };
}

function populateFilters() {
  const regions = [...new Set(MARKETS.map((m) => m.region))].sort();
  const tiers = [...new Set(MARKETS.map((m) => m.tier))].sort();
  const regionFilter = document.getElementById('regionFilter');
  const tierFilter = document.getElementById('tierFilter');

  regions.forEach((region) => {
    regionFilter.insertAdjacentHTML('beforeend', `<option value="${region}">${region}</option>`);
  });

  tiers.forEach((tier) => {
    tierFilter.insertAdjacentHTML('beforeend', `<option value="${tier}">Tier ${tier}</option>`);
  });
}

function ensureSelectedIsVisible() {
  const visible = filteredMarkets();
  if (!visible.some((m) => idFor(m) === appState.selectedId)) {
    appState.selectedId = visible[0] ? idFor(visible[0]) : idFor(MARKETS[0]);
  }
}

function selectedMarket() {
  return MARKETS.find((m) => idFor(m) === appState.selectedId) || MARKETS[0];
}

function avg(markets, key) {
  if (!markets.length) return 0;
  return Math.round(markets.reduce((sum, market) => sum + market[key], 0) / markets.length);
}

function renderKpis() {
  const visible = filteredMarkets();
  const top = [...visible].sort((a, b) => b.overallScore - a.overallScore)[0];
  const weatherTough = [...visible].sort((a, b) => b.weatherRisk - a.weatherRisk)[0];

  const items = [
    ['Visible Markets', visible.length, 'Current filtered universe'],
    ['Avg Opportunity', avg(visible, 'overallScore'), 'Composite market score'],
    ['Avg Workable Days', avg(visible, 'workableDays'), 'Modeled roofing production days'],
    ['Top Market', top ? `${top.city}` : 'None', top ? `${top.overallScore} opportunity score` : 'Adjust filters'],
    ['Highest Weather Risk', weatherTough ? `${weatherTough.city}` : 'None', weatherTough ? `${weatherTough.weatherRisk} delay risk` : 'Adjust filters']
  ];

  document.getElementById('kpis').innerHTML = items.map(([label, value, sub]) => `
    <article class="kpi-card">
      <span>${label}</span>
      <strong>${value}</strong>
      <small>${sub}</small>
    </article>
  `).join('');
}

function renderMap() {
  const visible = filteredMarkets();
  const dots = document.getElementById('marketDots');
  const metric = appState.metric;

  dots.innerHTML = visible.map((market) => {
    const point = projectPoint(market);
    const value = market[metric];
    const cls = metricClass(value, metric);
    const size = metricSize(value, metric);
    const selected = idFor(market) === appState.selectedId ? ' selected' : '';
    const label = `${market.city}, ${market.state} | ${metricLabels[metric]}: ${value}`;

    return `
      <button
        type="button"
        class="market-dot ${cls}${selected}"
        data-id="${idFor(market)}"
        title="${label}"
        aria-label="${label}"
        style="left:${point.x}%; top:${point.y}%; width:${size}px; height:${size}px;"
      >
        <span>${Math.round(value)}</span>
      </button>
    `;
  }).join('');

  document.getElementById('metricHelper').textContent = `Showing ${metricLabels[metric]}. Click any city marker to update the profile.`;
}

function renderTopMarkets() {
  const markets = [...filteredMarkets()].sort((a, b) => b.overallScore - a.overallScore).slice(0, 7);

  document.getElementById('topMarkets').innerHTML = markets.map((market, index) => `
    <button type="button" class="top-market ${idFor(market) === appState.selectedId ? 'active' : ''}" data-id="${idFor(market)}">
      <span class="rank">${index + 1}</span>
      <span class="top-meta">
        <strong>${market.city}, ${market.state}</strong>
        <small>${market.region} · Tier ${market.tier}</small>
      </span>
      <b>${market.overallScore}</b>
    </button>
  `).join('');

  document.getElementById('visibleCount').textContent = `${filteredMarkets().length}`;
}

function scoreBar(label, value, max = 100) {
  return `
    <div class="score-row">
      <div><span>${label}</span><b>${value}</b></div>
      <div class="score-track"><i style="width:${clamp((value / max) * 100, 0, 100)}%"></i></div>
    </div>
  `;
}

function salesMotion(market) {
  if (market.fmScore >= 84) {
    return 'Prioritize large-format industrial, logistics, food/bev, pharma, and insured portfolio owners. Lead with assembly reliability, documentation, compliance, and lifecycle risk reduction.';
  }
  if (market.weatherRisk >= 82) {
    return 'Lead with storm response, inspection programs, emergency leak readiness, insurance documentation, and resilient reroof assemblies.';
  }
  if (market.workableDays >= 290) {
    return 'Lead with production speed, year-round scheduling, heat-aging inspections, and low-disruption retrofit work.';
  }
  return 'Lead with service agreements, facility manager outreach, older-roof replacement planning, and selective commercial retrofit opportunities.';
}

function renderDetail() {
  const market = selectedMarket();

  document.getElementById('detailCard').innerHTML = `
    <div class="profile-head">
      <div>
        <span class="badge">Tier ${market.tier}</span>
        <h2>${market.city}, ${market.state}</h2>
        <p>${market.region}</p>
      </div>
      <div class="score-orb">${market.overallScore}</div>
    </div>

    <p class="market-note">${market.note}</p>

    <div class="mini-grid">
      <div><span>Population</span><strong>${formatPopulation(market.population)}</strong></div>
      <div><span>Rain Days</span><strong>${market.rainDays}</strong></div>
      <div><span>Rainfall</span><strong>${market.annualRainfall}"</strong></div>
      <div><span>Workable Days</span><strong>${market.workableDays}</strong></div>
    </div>

    <div class="score-stack">
      ${scoreBar('Roofing Demand', market.roofingScore)}
      ${scoreBar('FM / Insurance Fit', market.fmScore)}
      ${scoreBar('Industrial Growth', market.industrialGrowth)}
      ${scoreBar('Competition Pressure', market.competitionScore)}
      ${scoreBar('Weather Delay Risk', market.weatherRisk)}
    </div>

    <div class="strategy-card">
      <h3>Sales Motion</h3>
      <p>${salesMotion(market)}</p>
    </div>
  `;
}

function renderTable() {
  const visible = [...filteredMarkets()].sort((a, b) => b[appState.sortKey] - a[appState.sortKey]);

  document.getElementById('marketTable').innerHTML = visible.map((market) => `
    <tr data-id="${idFor(market)}" class="${idFor(market) === appState.selectedId ? 'active' : ''}">
      <td><strong>${market.city}, ${market.state}</strong><small>${formatPopulation(market.population)}</small></td>
      <td>${market.region}</td>
      <td>Tier ${market.tier}</td>
      <td>${market.overallScore}</td>
      <td>${market.roofingScore}</td>
      <td>${market.fmScore}</td>
      <td>${market.rainDays}</td>
      <td>${market.workableDays}</td>
      <td>${market.weatherRisk}</td>
    </tr>
  `).join('');
}

function renderReport() {
  const market = selectedMarket();
  document.getElementById('reportContent').innerHTML = `
    <p class="eyebrow">RoofIQ Market Brief</p>
    <h2>${market.city}, ${market.state}</h2>
    <p class="report-sub">Modeled commercial roofing market intelligence trial profile.</p>

    <div class="report-grid">
      <div><span>Overall</span><strong>${market.overallScore}</strong></div>
      <div><span>Roofing</span><strong>${market.roofingScore}</strong></div>
      <div><span>FM</span><strong>${market.fmScore}</strong></div>
      <div><span>Weather Risk</span><strong>${market.weatherRisk}</strong></div>
    </div>

    <h3>Market Summary</h3>
    <p>${market.note}</p>

    <h3>Recommended Sales Strategy</h3>
    <p>${salesMotion(market)}</p>

    <h3>Data Status</h3>
    <p>This trial uses modeled values. Source-grade release needs NOAA, Census, BLS, permits, and verified commercial inventory. Boring, but legally useful.</p>
  `;
}

function renderAll() {
  ensureSelectedIsVisible();
  renderKpis();
  renderMap();
  renderTopMarkets();
  renderDetail();
  renderTable();
}

function selectMarket(id) {
  appState.selectedId = id;
  renderAll();
  const detail = document.getElementById('detailCard');
  if (window.innerWidth < 980) detail.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function wireEvents() {
  document.getElementById('searchInput').addEventListener('input', (event) => {
    appState.search = event.target.value;
    renderAll();
  });

  document.getElementById('regionFilter').addEventListener('change', (event) => {
    appState.region = event.target.value;
    renderAll();
  });

  document.getElementById('tierFilter').addEventListener('change', (event) => {
    appState.tier = event.target.value;
    renderAll();
  });

  document.getElementById('metricSelect').addEventListener('change', (event) => {
    appState.metric = event.target.value;
    renderAll();
  });

  document.getElementById('resetView').addEventListener('click', () => {
    appState.search = '';
    appState.region = 'all';
    appState.tier = 'all';
    appState.metric = 'overallScore';
    appState.sortKey = 'overallScore';
    document.getElementById('searchInput').value = '';
    document.getElementById('regionFilter').value = 'all';
    document.getElementById('tierFilter').value = 'all';
    document.getElementById('metricSelect').value = 'overallScore';
    renderAll();
  });

  document.getElementById('sortToggle').addEventListener('click', () => {
    const order = ['overallScore', 'roofingScore', 'fmScore', 'weatherRisk', 'workableDays'];
    const current = order.indexOf(appState.sortKey);
    appState.sortKey = order[(current + 1) % order.length];
    document.getElementById('sortToggle').textContent = `Sort: ${metricLabels[appState.sortKey]}`;
    renderTable();
  });

  document.getElementById('exportReport').addEventListener('click', () => {
    renderReport();
    document.getElementById('reportModal').hidden = false;
  });

  document.getElementById('closeModal').addEventListener('click', () => {
    document.getElementById('reportModal').hidden = true;
  });

  document.getElementById('reportModal').addEventListener('click', (event) => {
    if (event.target.id === 'reportModal') event.currentTarget.hidden = true;
  });

  document.body.addEventListener('click', (event) => {
    const target = event.target.closest('[data-id]');
    if (!target) return;
    selectMarket(target.dataset.id);
  });
}

populateFilters();
wireEvents();
renderAll();
