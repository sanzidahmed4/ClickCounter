// app.js — click counter with settings modal, custom theme save, + history
(function () {
  const STORAGE_KEY = 'clickCounter_v1';
  const START_KEY = 'clickCounter_startedAt';
  const THEME_KEY = 'clickCounter_theme_v1';
  const HISTORY_KEY = 'clickCounter_history_v1';

  // DOM
  const countEl = document.getElementById('count');
  const meter = document.getElementById('meter');
  const controls = document.querySelector('.controls');
  const startedAtEl = document.getElementById('startedAt');
  const lastSavedEl = document.getElementById('lastSaved');
  const resetBtn = document.getElementById('resetBtn');

  // header + modal elements (logo upload removed)
  // const logoInput = document.getElementById('logoInput'); // removed
  // const logoImg = document.getElementById('logoImg'); // removed
  // const logoWrap = document.getElementById('logoWrap'); // not needed

  const settingsBtn = document.getElementById('settingsBtn');
  const settingsModal = document.getElementById('settingsModal');
  const modalClose = document.getElementById('modalClose');

  // modal controls
  const manualNumber = document.getElementById('manualNumber');
  const decManual = document.getElementById('decManual');
  const incManual = document.getElementById('incManual');
  const applyAdd = document.getElementById('applyAdd');
  const applySub = document.getElementById('applySub');
  const setExact = document.getElementById('setExact');

  const themeTop = document.getElementById('themeTop');
  const themeBottom = document.getElementById('themeBottom');
  const glassOpacity = document.getElementById('glassOpacity');
  const accentColor = document.getElementById('accentColor');
  const previewTheme = document.getElementById('previewTheme');
  const saveTheme = document.getElementById('saveTheme');
  const resetTheme = document.getElementById('resetTheme');

  // history DOM
  const historyListEl = document.getElementById('historyList');
  const clearHistoryBtn = document.getElementById('clearHistory');

  // state
  let count = 0;
  let startedAt = null;
  let lastSaved = null;
  let history = []; // array of { when: ISO, delta: number, type: 'change'|'set'|'reset'|'add'|'sub', newCount: number }

  // helpers
  function nowISO() { return new Date().toISOString(); }
  function nice(iso) { if (!iso) return '—'; return new Date(iso).toLocaleString(); }

  function loadState() {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        count = Number(parsed.count) || 0;
        lastSaved = parsed.lastSaved || null;
      } else {
        count = 0;
        lastSaved = null;
      }
      const s = sessionStorage.getItem(START_KEY);
      if (s) startedAt = s;
      else {
        startedAt = nowISO();
        sessionStorage.setItem(START_KEY, startedAt);
      }
    } catch (e) {
      console.error('loadState error', e);
      count = 0; lastSaved = null; startedAt = nowISO();
      sessionStorage.setItem(START_KEY, startedAt);
    }
  }

  function saveState() {
    try {
      const payload = { count, lastSaved: nowISO() };
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      lastSaved = payload.lastSaved;
      renderMeta();
    } catch (e) {
      console.error('saveState error', e);
    }
  }

  function render() {
    countEl.textContent = String(count);
    renderMeta();
  }

  function renderMeta() {
    startedAtEl.textContent = nice(startedAt);
    lastSavedEl.textContent = nice(lastSaved);
  }

  function pulse(el) {
    if (!el) return;
    el.animate([
      { transform: 'scale(1)', opacity: 1 },
      { transform: 'scale(0.98)', opacity: 0.98 },
      { transform: 'scale(1)', opacity: 1 }
    ], { duration: 220, easing: 'cubic-bezier(.2,.9,.3,1)' });
  }

  // HISTORY: load/save and render
  function loadHistory() {
    try {
      const raw = sessionStorage.getItem(HISTORY_KEY);
      if (!raw) { history = []; return; }
      history = JSON.parse(raw) || [];
    } catch (e) {
      console.warn('loadHistory error', e);
      history = [];
    }
  }

  function saveHistory() {
    try {
      sessionStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    } catch (e) {
      console.warn('saveHistory error', e);
    }
  }

  function recordHistory(delta, type = 'change') {
    const entry = {
      when: nowISO(),
      delta: Number(delta),
      type: String(type),
      newCount: Number(count)
    };
    history.unshift(entry); // newest first
    if (history.length > 500) history.length = 500;
    saveHistory();
    if (settingsModal.getAttribute('aria-hidden') === 'false') {
      renderHistory();
    }
  }

  function renderHistory() {
    if (!historyListEl) return;
    historyListEl.innerHTML = '';
    if (!history || history.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'history-item';
      empty.textContent = 'No history yet.';
      historyListEl.appendChild(empty);
      return;
    }
    const toRender = history.slice(0, 200);
    for (const h of toRender) {
      const item = document.createElement('div');
      item.className = 'history-item';
      const left = document.createElement('div');
      left.style.display = 'flex';
      left.style.flexDirection = 'column';
      left.style.gap = '4px';
      const label = document.createElement('div');
      let actionText = '';
      if (h.type === 'set') actionText = `Set → ${h.newCount}`;
      else if (h.type === 'reset') actionText = `Reset → ${h.newCount}`;
      else {
        const sign = h.delta > 0 ? `+${h.delta}` : `${h.delta}`;
        actionText = `${sign} → ${h.newCount}`;
      }
      label.textContent = actionText;
      label.style.fontWeight = '600';
      const meta = document.createElement('div');
      meta.className = 'meta';
      meta.textContent = new Date(h.when).toLocaleString();
      left.appendChild(label);
      left.appendChild(meta);

      const right = document.createElement('div');
      right.style.fontSize = '13px';
      right.style.opacity = '0.95';
      right.textContent = (h.type || '').toUpperCase();

      item.appendChild(left);
      item.appendChild(right);
      historyListEl.appendChild(item);
    }
  }

  function clearHistory(confirmDialog = true) {
    if (confirmDialog) {
      const ok = confirm('আপনি কি ক্লিক হিস্ট্রি মুছে ফেলতে চান?');
      if (!ok) return;
    }
    history = [];
    saveHistory();
    renderHistory();
  }

  // THEME: apply / preview / save to sessionStorage (persist for session)
  function applyTheme(theme, persist = false) {
    if (!theme) return;
    const root = document.documentElement;
    if (theme.top) root.style.setProperty('--bg-top', theme.top);
    if (theme.bottom) root.style.setProperty('--bg-bottom', theme.bottom);
    if (theme.glass) root.style.setProperty('--glass', hexToRgba('#ffffff', theme.glass));
    if (theme.glass2) root.style.setProperty('--glass-2', hexToRgba('#ffffff', theme.glass2));
    if (theme.accent) root.style.setProperty('--accent-white', theme.accent);
    if (persist) {
      try {
        sessionStorage.setItem(THEME_KEY, JSON.stringify(theme));
      } catch (e) { console.warn('theme save failed', e); }
    }
  }

  function loadTheme() {
    try {
      const raw = sessionStorage.getItem(THEME_KEY);
      if (!raw) return;
      const theme = JSON.parse(raw);
      applyTheme(theme, false);
      if (theme.top) themeTop.value = theme.top;
      if (theme.bottom) themeBottom.value = theme.bottom;
      if (typeof theme.glass === 'number') glassOpacity.value = theme.glass;
      if (theme.accent) accentColor.value = theme.accent;
    } catch (e) { console.warn('load theme', e); }
  }

  function resetThemeToDefault() {
    sessionStorage.removeItem(THEME_KEY);
    applyTheme({
      top: '#79bfe9',
      bottom: '#f0b79a',
      glass: 0.45,
      glass2: 0.06,
      accent: '#ffffff'
    }, false);
    themeTop.value = '#79bfe9';
    themeBottom.value = '#f0b79a';
    glassOpacity.value = 0.45;
    accentColor.value = '#ffffff';
  }

  function hexToRgba(hex, alpha) {
    const h = hex.replace('#','');
    const r = parseInt(h.substring(0,2),16);
    const g = parseInt(h.substring(2,4),16);
    const b = parseInt(h.substring(4,6),16);
    return `rgba(${r},${g},${b},${Number(alpha)})`;
  }

  // modal open/close
  function openModal() {
    settingsModal.setAttribute('aria-hidden','false');
    settingsModal.style.pointerEvents = 'auto';
    manualNumber.value = 1;
    try {
      const ct = getComputedStyle(document.documentElement).getPropertyValue('--bg-top').trim();
      const cb = getComputedStyle(document.documentElement).getPropertyValue('--bg-bottom').trim();
      if (ct) themeTop.value = rgbToHex(ct) || themeTop.value;
      if (cb) themeBottom.value = rgbToHex(cb) || themeBottom.value;
    } catch (e) {}
    renderHistory();
  }
  function closeModal() {
    settingsModal.setAttribute('aria-hidden','true');
    settingsModal.style.pointerEvents = 'none';
  }

  function rgbToHex(color) {
    if (!color) return null;
    color = color.replace(/\s/g,'');
    if (color.startsWith('#')) return color;
    const m = color.match(/rgba?\((\d+),(\d+),(\d+)/i);
    if (!m) return null;
    const r = parseInt(m[1]).toString(16).padStart(2,'0');
    const g = parseInt(m[2]).toString(16).padStart(2,'0');
    const b = parseInt(m[3]).toString(16).padStart(2,'0');
    return `#${r}${g}${b}`;
  }

  // init listeners
  function initListeners() {
    meter.addEventListener('click', () => changeBy(1));
    meter.addEventListener('keydown', (e) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        changeBy(1);
      }
    });

    controls.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-action]');
      if (!btn) return;
      const action = btn.dataset.action;
      const value = Number(btn.dataset.value || 0);
      if (action === 'inc') changeBy(Math.abs(value));
      else if (action === 'dec') changeBy(-Math.abs(value));
    });

    resetBtn.addEventListener('click', () => {
      const ok = confirm('আপনি কি নিশ্চিত? কাউন্টার রিসেট হবে।');
      if (!ok) return;
      count = 0;
      recordHistory(0, 'reset');
      sessionStorage.removeItem(STORAGE_KEY);
      lastSaved = null;
      saveState();
      render();
      pulse(resetBtn);
    });

    setInterval(() => saveState(), 4000);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') saveState();
    });
    window.addEventListener('beforeunload', () => saveState());

    settingsBtn.addEventListener('click', openModal);
    modalClose.addEventListener('click', closeModal);
    settingsModal.addEventListener('click', (e) => {
      if (e.target === settingsModal) closeModal();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeModal();
    });

    decManual.addEventListener('click', () => {
      manualNumber.value = Math.max(0, Number(manualNumber.value) - 1);
    });
    incManual.addEventListener('click', () => {
      manualNumber.value = Number(manualNumber.value) + 1;
    });
    applyAdd.addEventListener('click', () => {
      const v = Number(manualNumber.value) || 0;
      changeBy(v);
      recordHistory(v, 'add');
    });
    applySub.addEventListener('click', () => {
      const v = Number(manualNumber.value) || 0;
      changeBy(-v);
      recordHistory(-v, 'sub');
    });
    setExact.addEventListener('click', () => {
      const v = Math.max(0, Number(manualNumber.value) || 0);
      count = v;
      saveState();
      render();
      pulse(meter);
      recordHistory(v, 'set');
    });

    previewTheme.addEventListener('click', () => {
      applyTheme({
        top: themeTop.value,
        bottom: themeBottom.value,
        glass: Number(glassOpacity.value),
        glass2: Math.max(0.01, Number(glassOpacity.value) - 0.35),
        accent: accentColor.value
      }, false);
    });

    saveTheme.addEventListener('click', () => {
      const theme = {
        top: themeTop.value,
        bottom: themeBottom.value,
        glass: Number(glassOpacity.value),
        glass2: Math.max(0.01, Number(glassOpacity.value) - 0.35),
        accent: accentColor.value
      };
      applyTheme(theme, true);
      alert('Theme saved and applied for this session.');
      closeModal();
    });

    resetTheme.addEventListener('click', () => {
      const ok = confirm('Reset to default theme?');
      if (!ok) return;
      resetThemeToDefault();
      alert('Theme reset to default.');
    });

    if (clearHistoryBtn) {
      clearHistoryBtn.addEventListener('click', () => clearHistory(true));
    }
  }

  // actions
  function changeBy(delta) {
    const newVal = Number(count) + Number(delta);
    count = newVal < 0 ? 0 : newVal; // prevent negative
    saveState();
    render();
    pulse(meter);
    recordHistory(delta, 'change');
  }

  // boot
  function init() {
    loadState();
    loadHistory();
    render();
    initListeners();
    // loadLogo();  // removed — logo upload has been disabled per request
    loadTheme();
  }

  init();
})();
