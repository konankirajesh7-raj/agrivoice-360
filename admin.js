/* =============================================
   AGRI VOICE 360 — ADMIN DASHBOARD (admin.js)
   ============================================= */

'use strict';

// ─── State ───────────────────────────────────────────────
let allSubmissions = [];
let filteredSubmissions = [];
let currentPage = 0;
const ROWS_PER_PAGE = 20;
let trendChart, categoryChart, roleChart, stateChart;
let leafletMap;
const CATEGORIES = ['crop_price','weather_climate','pest_disease','water_irrigation','loans_credit','transport_storage','govt_schemes','seed_input','information_gap','health_safety'];
const CAT_LABELS = {
  crop_price:'Crop Price & Market', weather_climate:'Weather & Climate',
  pest_disease:'Pest, Disease & Crop Loss', water_irrigation:'Water & Irrigation',
  loans_credit:'Loans, Credit & Money', transport_storage:'Transport & Storage',
  govt_schemes:'Govt Scheme Access', seed_input:'Seed & Input Quality',
  information_gap:'Information & Advisory Gap', health_safety:'Health & Safety'
};
const CAT_ICONS = { crop_price:'📉',weather_climate:'🌧️',pest_disease:'🐛',water_irrigation:'💧',loans_credit:'🏦',transport_storage:'🚛',govt_schemes:'📋',seed_input:'🌱',information_gap:'📱',health_safety:'🏥' };
const STATE_COORDS = {
  'Andhra Pradesh':[16.5,80.6],'Arunachal Pradesh':[28.2,94.7],'Assam':[26.2,92.9],
  'Bihar':[25.1,85.1],'Chhattisgarh':[21.3,81.6],'Goa':[15.3,74.0],
  'Gujarat':[22.3,71.2],'Haryana':[29.0,76.1],'Himachal Pradesh':[31.1,77.2],
  'Jharkhand':[23.6,85.3],'Karnataka':[15.3,75.7],'Kerala':[10.8,76.3],
  'Madhya Pradesh':[22.9,78.7],'Maharashtra':[19.7,75.7],'Manipur':[24.6,93.9],
  'Meghalaya':[25.5,91.4],'Mizoram':[23.1,92.9],'Nagaland':[26.2,94.5],
  'Odisha':[20.9,84.2],'Punjab':[31.1,75.3],'Rajasthan':[27.0,74.2],
  'Sikkim':[27.5,88.5],'Tamil Nadu':[11.1,78.7],'Telangana':[17.9,79.0],
  'Tripura':[23.9,91.9],'Uttar Pradesh':[26.8,80.9],'Uttarakhand':[30.1,79.3],
  'West Bengal':[22.9,87.9],'Delhi':[28.7,77.1],'Jammu & Kashmir':[34.1,74.8]
};

// ─── DOM Loaded ───────────────────────────────────────────
document.addEventListener('DOMContentLoaded', checkAuth);

// ─── Auth ─────────────────────────────────────────────────
async function checkAuth() {
  try {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session) {
      showDashboard(session.user);
    }
  } catch (e) { /* stay on login */ }
}

async function doLogin() {
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  const btn = document.getElementById('loginBtn');
  const errEl = document.getElementById('loginError');
  errEl.style.display = 'none';
  if (!email || !password) { errEl.textContent = 'Please enter email and password.'; errEl.style.display = 'block'; return; }
  btn.textContent = 'Signing in...'; btn.disabled = true;
  try {
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) throw error;
    showDashboard(data.user);
  } catch (e) {
    errEl.textContent = e.message || 'Login failed. Check credentials.';
    errEl.style.display = 'block';
    btn.textContent = 'Sign In'; btn.disabled = false;
  }
}

async function doLogout() {
  await supabaseClient.auth.signOut();
  document.getElementById('dashboard').classList.remove('visible');
  document.getElementById('loginScreen').style.display = 'flex';
}

function showDashboard(user) {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('dashboard').classList.add('visible');
  const adminEmail = user?.email || 'admin';
  document.getElementById('adminEmail').textContent = adminEmail;
  document.getElementById('adminAvatar').textContent = adminEmail[0].toUpperCase();
  loadAllData();
  setInterval(loadAllData, 30000); // refresh every 30s
  // Subscribe to real-time
  supabaseClient
    .channel('submissions-changes')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'submissions' }, () => loadAllData())
    .subscribe();
}

// ─── Core Data Loader ─────────────────────────────────────
async function loadAllData() {
  try {
    const { data, error } = await supabaseClient
      .from('submissions')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    allSubmissions = data || [];
    filteredSubmissions = [...allSubmissions];
    updateRefreshTime();
    renderStats();
    renderCharts();
    renderBreakdown();
    renderTable();
    renderMap();
  } catch (e) {
    console.error('Data load error:', e);
  }
}

function updateRefreshTime() {
  document.getElementById('lastRefresh').textContent = 'Updated ' + new Date().toLocaleTimeString('en-IN');
}

// ─── Page Navigation ──────────────────────────────────────
function showPage(pageId, el) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-' + pageId).classList.add('active');
  document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
  if (el) el.classList.add('active');
  const titles = { overview:'Overview', breakdown:'Category Breakdown', map:'State Heatmap', submissions:'All Submissions' };
  document.getElementById('pageTitle').textContent = titles[pageId] || pageId;
  if (pageId === 'map') { setTimeout(() => { if(leafletMap) leafletMap.invalidateSize(); }, 100); }
}

// ─── Stats Cards ──────────────────────────────────────────
function renderStats() {
  const total = allSubmissions.length;
  const farmers = allSubmissions.filter(s => s.is_farmer).length;
  const states = new Set(allSubmissions.map(s => s.state).filter(Boolean)).size;

  // Count categories
  const catCounts = {};
  CATEGORIES.forEach(c => catCounts[c] = 0);
  allSubmissions.forEach(s => { if(s.problem_category) catCounts[s.problem_category] = (catCounts[s.problem_category]||0) + 1; });
  const topCat = Object.entries(catCounts).sort((a,b) => b[1]-a[1])[0];

  document.getElementById('statTotal').textContent = total.toLocaleString('en-IN');
  document.getElementById('statFarmers').textContent = farmers.toLocaleString('en-IN');
  document.getElementById('statStates').textContent = states;
  if (topCat) {
    document.getElementById('statTopProblem').textContent = (CAT_ICONS[topCat[0]]||'') + ' ' + (CAT_LABELS[topCat[0]]||topCat[0]);
    document.getElementById('statTopProblemCount').textContent = topCat[1] + ' reports';
  }

  // Recent: last 7 days
  const sevenDaysAgo = new Date(); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const recent = allSubmissions.filter(s => new Date(s.created_at) > sevenDaysAgo).length;
  document.getElementById('statTotalChange').textContent = '+' + recent + ' in last 7 days';
  const recentFarmers = allSubmissions.filter(s => s.is_farmer && new Date(s.created_at) > sevenDaysAgo).length;
  document.getElementById('statFarmersChange').textContent = '+' + recentFarmers + ' in last 7 days';
}

// ─── Charts ───────────────────────────────────────────────
const CHART_COLORS = ['#7aab8a','#c8922a','#4a9eba','#a07ac8','#e05252','#5252e0','#e0a052','#52e0ba','#e052a0','#a0e052'];

function renderCharts() {
  renderTrendChart();
  renderCategoryChart();
  renderRoleChart();
  renderStateChart();
}

function renderTrendChart() {
  // Last 30 days
  const days = 30;
  const labels = [];
  const counts = {};
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const key = d.toISOString().split('T')[0];
    labels.push(key.slice(5)); // MM-DD
    counts[key] = 0;
  }
  allSubmissions.forEach(s => {
    const key = s.created_at?.split('T')[0];
    if (key && counts[key] !== undefined) counts[key]++;
  });

  const ctx = document.getElementById('trendChart').getContext('2d');
  if (trendChart) trendChart.destroy();
  trendChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Submissions',
        data: Object.values(counts),
        borderColor: '#7aab8a',
        backgroundColor: 'rgba(122,171,138,0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 2,
        borderWidth: 2,
      }]
    },
    options: chartOpts('Submissions per day')
  });
}

function renderCategoryChart() {
  const catCounts = {};
  CATEGORIES.forEach(c => catCounts[c] = 0);
  allSubmissions.forEach(s => { if(s.problem_category) catCounts[s.problem_category] = (catCounts[s.problem_category]||0)+1; });

  const ctx = document.getElementById('categoryChart').getContext('2d');
  if (categoryChart) categoryChart.destroy();
  categoryChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: CATEGORIES.map(c => CAT_LABELS[c]),
      datasets: [{ data: CATEGORIES.map(c => catCounts[c]), backgroundColor: CHART_COLORS, borderWidth: 0 }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: 'right', labels: { color: '#7a9a80', font: { size: 11 }, boxWidth: 12, padding: 12 } } }
    }
  });
}

function renderRoleChart() {
  const roles = {};
  allSubmissions.forEach(s => { const r = s.role||'farmer'; roles[r] = (roles[r]||0) + 1; });
  const roleLabels = { farmer:'Farmer', family:'Family', student:'Student', expert:'Expert', trader:'Trader', ngo:'NGO' };

  const ctx = document.getElementById('roleChart').getContext('2d');
  if (roleChart) roleChart.destroy();
  roleChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: Object.keys(roles).map(r => roleLabels[r]||r),
      datasets: [{ data: Object.values(roles), backgroundColor: CHART_COLORS, borderRadius: 6, borderWidth: 0 }]
    },
    options: { ...chartOpts(), plugins: { legend: { display: false } } }
  });
}

function renderStateChart() {
  const stateCounts = {};
  allSubmissions.forEach(s => { if(s.state) stateCounts[s.state] = (stateCounts[s.state]||0) + 1; });
  const top5 = Object.entries(stateCounts).sort((a,b) => b[1]-a[1]).slice(0,5);

  const ctx = document.getElementById('stateChart').getContext('2d');
  if (stateChart) stateChart.destroy();
  stateChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: top5.map(([s]) => s),
      datasets: [{ data: top5.map(([,c]) => c), backgroundColor: '#c8922a', borderRadius: 6, borderWidth: 0 }]
    },
    options: { ...chartOpts(), plugins: { legend: { display: false } }, indexAxis: 'y' }
  });
}

function chartOpts(title) {
  return {
    responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { backgroundColor: '#1a2820', titleColor: '#f5f0e8', bodyColor: '#7aab8a', padding: 12 }
    },
    scales: {
      x: { grid: { color: 'rgba(122,171,138,0.08)' }, ticks: { color: '#7a9a80', font: { size: 11 } } },
      y: { grid: { color: 'rgba(122,171,138,0.08)' }, ticks: { color: '#7a9a80', font: { size: 11 } } }
    }
  };
}

// ─── Breakdown Page ───────────────────────────────────────
function renderBreakdown() {
  const catCounts = {};
  CATEGORIES.forEach(c => catCounts[c] = 0);
  allSubmissions.forEach(s => { if(s.problem_category) catCounts[s.problem_category] = (catCounts[s.problem_category]||0)+1; });
  const max = Math.max(...Object.values(catCounts), 1);
  CATEGORIES.forEach(c => {
    const cnt = catCounts[c] || 0;
    const el = document.getElementById('cnt_' + c);
    const bar = document.getElementById('bar_' + c);
    if (el) el.textContent = cnt;
    if (bar) bar.style.width = ((cnt / max) * 100) + '%';
  });
}

// ─── Map (Leaflet) ────────────────────────────────────────
function renderMap() {
  if (!document.getElementById('page-map').classList.contains('active')) return;
  const stateCounts = {};
  allSubmissions.forEach(s => { if(s.state) stateCounts[s.state] = (stateCounts[s.state]||0)+1; });

  if (!leafletMap) {
    leafletMap = L.map('stateMap', { center: [22, 82], zoom: 4, zoomControl: true });
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>',
      subdomains: 'abcd', maxZoom: 19
    }).addTo(leafletMap);
  } else {
    leafletMap.eachLayer(l => { if (l instanceof L.CircleMarker || l instanceof L.Marker) leafletMap.removeLayer(l); });
  }

  Object.entries(stateCounts).forEach(([state, count]) => {
    const coords = STATE_COORDS[state];
    if (!coords) return;
    const opacity = Math.min(0.2 + (count / Math.max(...Object.values(stateCounts))) * 0.8, 1);
    const radius = 8 + Math.min(count * 2, 30);
    L.circleMarker(coords, {
      radius, color: '#7aab8a', fillColor: '#7aab8a',
      fillOpacity: opacity, weight: 1, opacity: 0.8
    }).addTo(leafletMap)
      .bindPopup(`<b>${state}</b><br>${count} submission${count !== 1 ? 's' : ''}`);
  });
}

// ─── Table ────────────────────────────────────────────────
function filterTable() {
  const search = document.getElementById('tableSearch').value.toLowerCase();
  const catFilter = document.getElementById('filterCategory').value;
  const roleFilter = document.getElementById('filterRole').value;

  filteredSubmissions = allSubmissions.filter(s => {
    const matchSearch = !search ||
      (s.full_name || '').toLowerCase().includes(search) ||
      (s.state || '').toLowerCase().includes(search) ||
      (s.district || '').toLowerCase().includes(search) ||
      (s.problem_detail || '').toLowerCase().includes(search);
    const matchCat = !catFilter || s.problem_category === catFilter;
    const matchRole = !roleFilter || s.role === roleFilter;
    return matchSearch && matchCat && matchRole;
  });
  currentPage = 0;
  renderTable();
}

function renderTable() {
  const tbody = document.getElementById('subTableBody');
  const total = filteredSubmissions.length;
  const start = currentPage * ROWS_PER_PAGE;
  const pageData = filteredSubmissions.slice(start, start + ROWS_PER_PAGE);

  document.getElementById('tableCount').textContent = `Showing ${Math.min(start + pageData.length, total)} of ${total} results`;

  if (pageData.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="table-empty">No submissions found.</td></tr>';
    renderPagination(total);
    return;
  }

  tbody.innerHTML = pageData.map((s, i) => {
    const idx = start + i + 1;
    const name = escapeHtml(s.full_name || 'Anonymous');
    const loc = [s.district, s.state].filter(Boolean).join(', ') || '—';
    const role = s.role || '—';
    const cat = s.problem_category ? (CAT_ICONS[s.problem_category] + ' ' + CAT_LABELS[s.problem_category]) : '—';
    const preview = (s.problem_detail || '').slice(0, 60) + (s.problem_detail?.length > 60 ? '...' : '');
    const date = new Date(s.created_at).toLocaleDateString('en-IN');
    return `<tr onclick="openModal(${s.id})">
      <td style="color:var(--text-muted)">${idx}</td>
      <td>${name}</td>
      <td>${escapeHtml(loc)}</td>
      <td><span class="role-pill">${role}</span></td>
      <td><span class="cat-pill" style="white-space:nowrap">${cat}</span></td>
      <td style="color:var(--text-muted)">${escapeHtml(preview)}</td>
      <td style="color:var(--text-muted)">${date}</td>
    </tr>`;
  }).join('');

  renderPagination(total);
}

function renderPagination(total) {
  const pages = Math.ceil(total / ROWS_PER_PAGE);
  const btnContainer = document.getElementById('paginationBtns');
  btnContainer.innerHTML = '';
  const prev = document.createElement('button');
  prev.className = 'page-btn'; prev.textContent = '←';
  prev.onclick = () => { if(currentPage > 0) { currentPage--; renderTable(); } };
  prev.disabled = currentPage === 0;
  btnContainer.appendChild(prev);

  for (let i = 0; i < Math.min(pages, 5); i++) {
    const btn = document.createElement('button');
    btn.className = 'page-btn' + (i === currentPage ? ' active' : '');
    btn.textContent = i + 1;
    btn.onclick = (ii => () => { currentPage = ii; renderTable(); })(i);
    btnContainer.appendChild(btn);
  }

  const next = document.createElement('button');
  next.className = 'page-btn'; next.textContent = '→';
  next.onclick = () => { if(currentPage < pages - 1) { currentPage++; renderTable(); } };
  next.disabled = currentPage >= pages - 1;
  btnContainer.appendChild(next);
}

// ─── Detail Modal ─────────────────────────────────────────
function openModal(id) {
  const s = allSubmissions.find(x => x.id === id);
  if (!s) return;
  document.getElementById('modalName').textContent = s.full_name || 'Anonymous';
  document.getElementById('modalSub').textContent = [s.district, s.state].filter(Boolean).join(', ') + ' · ' + new Date(s.created_at).toLocaleString('en-IN');
  document.getElementById('mState').textContent = s.state || '—';
  document.getElementById('mDistrict').textContent = s.district || '—';
  document.getElementById('mRole').textContent = s.role || '—';
  document.getElementById('mFarming').textContent = s.is_farmer ? 'Yes, actively farming' : 'Not directly, but connected';
  document.getElementById('mCrop').textContent = s.crop_type || '—';
  document.getElementById('mCategory').textContent = (CAT_ICONS[s.problem_category]||'') + ' ' + (CAT_LABELS[s.problem_category]||s.problem_category||'—');
  document.getElementById('mProblem').textContent = s.problem_detail || '—';
  document.getElementById('mSolution').textContent = s.suggested_solution || '—';
  const extra = document.getElementById('mExtra');
  const extraWrap = document.getElementById('mExtraWrap');
  if (s.extra_comments) { extra.textContent = s.extra_comments; extraWrap.style.display = 'block'; }
  else { extraWrap.style.display = 'none'; }
  document.getElementById('detailModal').classList.add('open');
}

function closeModal() {
  document.getElementById('detailModal').classList.remove('open');
}

// ─── CSV Export ───────────────────────────────────────────
function exportCSV() {
  const headers = ['ID','Name','Email','State','District','Role','Is Farmer','Crop Type','Farm Size','Problem Category','Problem Detail','Suggested Solution','Extra Comments','Submitted At'];
  const rows = filteredSubmissions.map(s => [
    s.id, s.full_name, s.email, s.state, s.district, s.role,
    s.is_farmer ? 'Yes' : 'No', s.crop_type, s.farm_size,
    CAT_LABELS[s.problem_category] || s.problem_category,
    s.problem_detail, s.suggested_solution, s.extra_comments,
    new Date(s.created_at).toLocaleString('en-IN')
  ].map(v => '"' + (v || '').toString().replace(/"/g, '""') + '"'));

  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'agrivoice360_submissions_' + new Date().toISOString().split('T')[0] + '.csv';
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Utilities ────────────────────────────────────────────
function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
