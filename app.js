/* =============================================
   AGRI VOICE 360 — PUBLIC PORTAL LOGIC (app.js)
   ============================================= */

'use strict';

// ─── State ───────────────────────────────────────────────
let currentStep = 1;
let selectedCategory = '';
let selectedMiniCategory = '';
let selectedRole = 'farmer';
let selectedFarming = 'yes';
let submissionsPage = 0;
const PAGE_SIZE = 6;
let isSubmitting = false;
let currentLang = 'en';

// ─── DOM Ready ────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  animateCounters();
  initScrollEffects();
  initNavScroll();
  loadCommunityVoices();
  // Animate stat fill bars
  setTimeout(() => {
    document.querySelectorAll('.hero-stat-fill').forEach(el => {
      el.style.transition = 'width 1.5s ease';
    });
  }, 600);
});

// ─── Language Toggle ──────────────────────────────────────
function setLang(lang) {
  currentLang = lang;
  document.body.classList.toggle('lang-hi', lang === 'hi');
  document.getElementById('btnEn').classList.toggle('active', lang === 'en');
  document.getElementById('btnHi').classList.toggle('active', lang === 'hi');

  document.querySelectorAll('.show-en').forEach(el => {
    el.style.display = lang === 'en' ? '' : 'none';
  });
  document.querySelectorAll('.show-hi').forEach(el => {
    el.style.display = lang === 'hi' ? '' : 'none';
  });
}

// ─── Navigation scroll handling ───────────────────────────
function initNavScroll() {
  const nav = document.getElementById('mainNav');
  const floatingCTA = document.getElementById('floatingCTA');
  const hero = document.getElementById('hero');

  const observer = new IntersectionObserver((entries) => {
    if (!entries[0].isIntersecting) {
      floatingCTA.classList.add('visible');
    } else {
      floatingCTA.classList.remove('visible');
    }
  }, { threshold: 0.1 });
  if (hero) observer.observe(hero);

  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 20);
  }, { passive: true });
}

function scrollToForm() {
  document.getElementById('experience').scrollIntoView({ behavior: 'smooth' });
}

// ─── Counter Animation ────────────────────────────────────
function animateCounters() {
  // Real-time count from Supabase
  try {
    supabaseClient
      .from('submissions')
      .select('id', { count: 'exact', head: true })
      .then(({ count }) => {
        if (count !== null && count > 0) {
          document.querySelectorAll('.counter[data-target="2847"]').forEach(el => {
            el.dataset.target = count;
          });
        }
        // animate
        document.querySelectorAll('.counter').forEach(animateCounter);
      });
  } catch (e) {
    document.querySelectorAll('.counter').forEach(animateCounter);
  }
}

function animateCounter(el) {
  const target = parseInt(el.dataset.target, 10);
  const duration = 2000;
  const start = performance.now();
  const update = (now) => {
    const elapsed = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - elapsed, 3);
    el.textContent = Math.floor(eased * target).toLocaleString('en-IN');
    if (elapsed < 1) requestAnimationFrame(update);
  };
  requestAnimationFrame(update);
}

// ─── Scroll Reveal ────────────────────────────────────────
function initScrollEffects() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
}

// ─── Problem Category Selection (big cards) ──────────────
function selectProblem(card, value) {
  document.querySelectorAll('.problem-card').forEach(c => c.classList.remove('active'));
  card.classList.add('active');
  selectedCategory = value;
  // Also select in mini grid
  document.querySelectorAll('.problem-mini-card').forEach(c => {
    c.classList.toggle('selected', c.dataset.val === value);
  });
  selectedMiniCategory = value;
  scrollToForm();
}

// ─── Role Selection ───────────────────────────────────────
function selectRole(el, value) {
  document.querySelectorAll('.role-option').forEach(o => o.classList.remove('selected'));
  el.classList.add('selected');
  selectedRole = value;
}

// ─── Farming Toggle ───────────────────────────────────────
function selectFarming(el, value) {
  document.querySelectorAll('.farming-option').forEach(o => o.classList.remove('selected'));
  el.classList.add('selected');
  selectedFarming = value;
}

// ─── Mini Category (in form) ──────────────────────────────
function selectMiniCategory(el, value) {
  document.querySelectorAll('.problem-mini-card').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
  selectedMiniCategory = value;
  document.getElementById('catError').style.display = 'none';
}

// ─── Multi-Step Form ──────────────────────────────────────
function showStep(step) {
  document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
  const el = document.getElementById('step' + step);
  if (el) el.classList.add('active');

  // Update progress bar
  for (let i = 1; i <= 4; i++) {
    const p = document.getElementById('pstep' + i);
    if (!p) continue;
    p.className = 'progress-step';
    if (i < step) p.classList.add('done');
    else if (i === step) p.classList.add('active');
  }
  document.getElementById('stepNum').textContent = step;
  currentStep = step;
  document.querySelector('.form-panel').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function nextStep(from) {
  if (!validateStep(from)) return;
  showStep(from + 1);
}

function prevStep(from) {
  showStep(from - 1);
}

function validateStep(step) {
  let valid = true;

  if (step === 1) {
    const name = document.getElementById('inp_name').value.trim();
    const email = document.getElementById('inp_email').value.trim();
    const state = document.getElementById('inp_state').value;

    setFieldError('ff_name', !name || name.length < 2);
    setFieldError('ff_email', !email || !email.includes('@'));
    if (!state) { showToast('Please select your state.', 'error'); valid = false; }
    if (!name || name.length < 2 || !email || !email.includes('@')) valid = false;
  }

  if (step === 3) {
    if (!selectedMiniCategory) {
      document.getElementById('catError').style.display = 'block';
      valid = false;
    }
    const problem = document.getElementById('inp_problem').value.trim();
    setFieldError('ff_problem', problem.length < 30);
    if (problem.length < 30) valid = false;
  }

  return valid;
}

function setFieldError(fieldId, hasError) {
  const el = document.getElementById(fieldId);
  if (!el) return;
  el.classList.toggle('error', hasError);
}

// ─── Form Submit ──────────────────────────────────────────
async function submitForm() {
  if (isSubmitting) return;
  const solution = document.getElementById('inp_solution').value.trim();
  if (!solution || solution.length < 10) {
    setFieldError('inp_solution', true);
    document.querySelector('#step4 .field-error').style.display = 'block';
    showToast('Please share your solution idea.', 'error');
    return;
  }

  isSubmitting = true;
  const btn = document.getElementById('submitBtn');
  const btnText = document.getElementById('submitText');
  btn.disabled = true;
  btnText.textContent = 'Submitting...';

  const payload = {
    full_name: document.getElementById('inp_name').value.trim(),
    email: document.getElementById('inp_email').value.trim(),
    state: document.getElementById('inp_state').value,
    district: document.getElementById('inp_district').value.trim(),
    is_farmer: selectedFarming === 'yes',
    role: selectedRole,
    crop_type: document.getElementById('inp_crop').value.trim(),
    farm_size: document.getElementById('inp_farmsize').value,
    problem_category: selectedMiniCategory || selectedCategory,
    problem_detail: document.getElementById('inp_problem').value.trim(),
    suggested_solution: solution,
    extra_comments: document.getElementById('inp_extra').value.trim(),
    language: currentLang,
  };

  try {
    const { error } = await supabaseClient.from('submissions').insert([payload]);
    if (error) throw error;

    // Show success
    document.querySelector('.form-progress').style.display = 'none';
    document.querySelectorAll('.step').forEach(s => s.style.display = 'none');
    const success = document.getElementById('successState');
    success.classList.add('visible');
    document.getElementById('confirmEmail').textContent = payload.email;
    showToast('Response submitted successfully! 🌾', 'success');

    // Reload voices
    submissionsPage = 0;
    loadCommunityVoices();

  } catch (err) {
    console.error('Submit error:', err);
    showToast('Submission failed. Please try again.', 'error');
    btn.disabled = false;
    btnText.textContent = 'Submit Your Response →';
    isSubmitting = false;
  }
}

function submitAnother() {
  // Reset form
  document.querySelector('.form-progress').style.display = 'block';
  document.getElementById('successState').classList.remove('visible');
  document.querySelectorAll('.step').forEach(s => s.style.display = '');
  document.getElementById('inp_name').value = '';
  document.getElementById('inp_email').value = '';
  document.getElementById('inp_district').value = '';
  document.getElementById('inp_crop').value = '';
  document.getElementById('inp_problem').value = '';
  document.getElementById('inp_solution').value = '';
  document.getElementById('inp_extra').value = '';
  selectedCategory = '';
  selectedMiniCategory = '';
  isSubmitting = false;
  showStep(1);
}

// ─── WhatsApp Share ───────────────────────────────────────
function shareWhatsApp() {
  const msg = encodeURIComponent('I just shared my farming experience with AgriVoice 360 — a research project to understand real problems farmers face in India. Share yours too: ' + window.location.href);
  window.open('https://wa.me/?text=' + msg, '_blank');
}

// ─── Community Voices ─────────────────────────────────────
async function loadCommunityVoices() {
  const grid = document.getElementById('voicesGrid');
  if (!grid) return;

  // Show skeletons
  if (submissionsPage === 0) {
    grid.innerHTML = '<div class="voice-card skeleton" style="height:180px"></div>'.repeat(3);
  }

  try {
    const { data, error } = await supabaseClient
      .from('submissions')
      .select('id,state,district,problem_category,problem_detail,created_at,role')
      .order('created_at', { ascending: false })
      .range(submissionsPage * PAGE_SIZE, (submissionsPage + 1) * PAGE_SIZE - 1);

    if (error) throw error;

    if (submissionsPage === 0) grid.innerHTML = '';
    if (!data || data.length === 0) {
      if (submissionsPage === 0) {
        grid.innerHTML = '<div class="voices-empty" style="grid-column:1/-1"><p style="font-size:3rem">🌾</p><p style="margin-top:12px">No stories yet. Be the first to share!</p></div>';
      }
      document.getElementById('loadMoreVoices').style.display = 'none';
      return;
    }

    data.forEach(s => {
      const card = document.createElement('div');
      card.className = 'voice-card reveal';
      // Anonymize: show role-based label instead of real name
      const roleLabel = s.role === 'researcher' ? 'A Researcher' : s.role === 'agri_worker' ? 'An Agri Worker' : 'A Farmer';
      const avatarEmoji = s.role === 'researcher' ? '🔬' : s.role === 'agri_worker' ? '👷' : '🌾';
      const location = [s.district, s.state].filter(Boolean).join(', ') || 'India';
      const catLabel = categoryLabel(s.problem_category);
      const preview = (s.problem_detail || '').slice(0, 180) + (s.problem_detail?.length > 180 ? '...' : '');
      const date = new Date(s.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

      card.innerHTML = `
        <div class="voice-card-top">
          <div class="voice-avatar">${avatarEmoji}</div>
          <div>
            <div class="voice-name">${escapeHtml(roleLabel)}</div>
            <div class="voice-location">📍 ${escapeHtml(location)}</div>
          </div>
        </div>
        <span class="voice-category-badge">${catLabel}</span>
        <p class="voice-text">${escapeHtml(preview)}</p>
        <div class="voice-date">${date}</div>
      `;
      grid.appendChild(card);
    });

    // Re-observe new cards
    initScrollEffects();
    submissionsPage++;
    document.getElementById('loadMoreVoices').style.display = data.length < PAGE_SIZE ? 'none' : '';
  } catch (err) {
    console.error('Load voices error:', err);
    if (submissionsPage === 0) {
      grid.innerHTML = `<div class="voices-empty" style="grid-column:1/-1"><p>Could not load stories. <a href="#" onclick="location.reload()" style="color:var(--gold)">Retry</a></p></div>`;
    }
  }
}

function loadMoreVoices() {
  loadCommunityVoices();
}

// ─── Helpers ──────────────────────────────────────────────
function categoryLabel(val) {
  const map = {
    crop_price: '📉 Crop Price', weather_climate: '🌧️ Weather',
    pest_disease: '🐛 Pest & Disease', water_irrigation: '💧 Water',
    loans_credit: '🏦 Loans & Credit', transport_storage: '🚛 Transport',
    govt_schemes: '📋 Govt Schemes', seed_input: '🌱 Seeds',
    information_gap: '📱 Info Gap', health_safety: '🏥 Health',
  };
  return map[val] || '🌾 Other';
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ─── Toast ────────────────────────────────────────────────
let toastTimer;
function showToast(msg, type = 'success') {
  const toast = document.getElementById('toast');
  toast.textContent = type === 'success' ? '✅ ' + msg : '⚠️ ' + msg;
  toast.className = 'toast show ' + type;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 3500);
}
