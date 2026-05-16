/**
 * ClickCounter Application
 * A feature-rich counter app with themes, history, undo/redo, and achievements
 * 
 * Storage Keys:
 * - clickCounter_v2: Current count and session data
 * - clickCounter_startedAt: Session start timestamp
 * - clickCounter_theme_v2: User-saved theme preferences
 * - clickCounter_history_v2: Click history with timestamps
 * - clickCounter_undo_v2: Undo stack for reverting actions
 */

(function () {
  // ============================================================================
  // CONSTANTS - Magic values extracted for maintainability
  // ============================================================================
  const CONFIG = {
    STORAGE_KEY: 'clickCounter_v2',
    START_KEY: 'clickCounter_startedAt',
    THEME_KEY: 'clickCounter_theme_v2',
    IMPRESSION_KEY: 'clickCounter_impression_v1',
    HISTORY_KEY: 'clickCounter_history_v2',
    UNDO_KEY: 'clickCounter_undo_v2',
    SECONDARY_KEY: 'clickCounter_secondary_v1',
    SECONDARY_HISTORY_KEY: 'clickCounter_secondary_history_v1',
    SECONDARY_IMPRESSION_KEY: 'clickCounter_secondary_impression_v1',
    
    SAVE_INTERVAL: 4000, // ms - auto-save interval
    DEBOUNCE_DELAY: 500, // ms - debounce save operations
    HISTORY_MAX_ITEMS: 500,
    HISTORY_DISPLAY_ITEMS: 50,
    ANIMATION_DURATION: 220, // ms
    SHOW_SAVE_TOAST: false,
    
    MILESTONE_THRESHOLDS: [10, 50, 100, 500, 1000, 5000, 10000],
  };

  const MESSAGES = {
    RESET_CONFIRM: 'আপনি কি নিশ্চিত? কাউন্টার রিসেট হবে।',
    CLEAR_HISTORY: 'আপনি কি ক্লিক হিস্ট্রি মুছে ফেলতে চান?',
    RESET_THEME: 'Reset to default theme?',
    THEME_SAVED: 'Theme saved and applied for this session.',
    MILESTONE: (num) => `🎉 Milestone reached: ${num} clicks!`,
  };

  const KEYBOARD_SHORTCUTS = {
    '+': () => changeBy(1),
    'Add': () => changeBy(1),
    '-': () => changeBy(-1),
    'Subtract': () => changeBy(-1),
    'r': () => resetCounter(),
    'R': () => resetCounter(),
    'z': () => undoAction(),
    'Z': () => undoAction(),
  };

  // ============================================================================
  // DOM ELEMENTS - Cache all DOM references
  // ============================================================================
  const DOM = {
    // Main elements
    countEl: document.getElementById('count'),
    countEl2: document.getElementById('count2'),
    meter: document.getElementById('meter'),
    meter2: document.getElementById('meter2'),
    impressionText: document.getElementById('impressionText'),
    impressionText2: document.getElementById('impressionText2'),
    controls: document.querySelector('.controls'),
    controls2: document.getElementById('controls2'),
    resetBtn: document.getElementById('resetBtn'),
    resetBtn2: document.getElementById('resetBtn2'),
    secondaryCard: document.getElementById('secondaryCard'),
    secondaryDeleteBtn: document.getElementById('secondaryDeleteBtn'),
    
    // Meta display
    startedAtEl: document.getElementById('startedAt'),
    lastSavedEl: document.getElementById('lastSaved'),
    startedAtEl2: document.getElementById('startedAt2'),
    lastSavedEl2: document.getElementById('lastSaved2'),
    
    // Header & Modal
    settingsBtn: document.getElementById('settingsBtn'),
    addMeterBtn: document.getElementById('addMeterBtn'),
    settingsModal: document.getElementById('settingsModal'),
    modalClose: document.getElementById('modalClose'),

    // Data transfer controls
    exportBtn: document.getElementById('exportBtn'),
    importBtn: document.getElementById('importBtn'),
    leadUpdateBtn: document.getElementById('leadUpdateBtn'),
    
    // Manual number controls
    manualNumber: document.getElementById('manualNumber'),
    decManual: document.getElementById('decManual'),
    incManual: document.getElementById('incManual'),
    applyAdd: document.getElementById('applyAdd'),
    applySub: document.getElementById('applySub'),
    setExact: document.getElementById('setExact'),
    
    // Theme controls
    themeTop: document.getElementById('themeTop'),
    themeBottom: document.getElementById('themeBottom'),
    glassOpacity: document.getElementById('glassOpacity'),
    previewTheme: document.getElementById('previewTheme'),
    saveTheme: document.getElementById('saveTheme'),
    resetTheme: document.getElementById('resetTheme'),
    presetButtons: document.querySelectorAll('.preset-swatch'),
    
    // History controls
    historyListEl: document.getElementById('historyList'),
    clearHistoryBtn: document.getElementById('clearHistory'),
    historyListEl2: document.getElementById('historyList2'),
    clearHistoryBtn2: document.getElementById('clearHistory2'),
    secondaryManualSection: document.getElementById('secondaryManualSection'),
    secondaryHistorySection: document.getElementById('secondaryHistorySection'),
    manualNumber2: document.getElementById('manualNumber2'),
    decManual2: document.getElementById('decManual2'),
    incManual2: document.getElementById('incManual2'),
    applyAdd2: document.getElementById('applyAdd2'),
    applySub2: document.getElementById('applySub2'),
    setExact2: document.getElementById('setExact2'),
  };

  // ============================================================================
  // APPLICATION STATE
  // ============================================================================
  let state = {
    count: 0,
    startedAt: null,
    lastSaved: null,
    history: [], // { when, delta, type, newCount }
    undoStack: [], // for undo/redo functionality
    autoSaveScheduled: false,
    isSaving: false,
    milestonesSeen: new Set(),
    secondary: { enabled:false, count:0, startedAt:null, lastSaved:null, history:[] },
  };

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================

  /**
   * Get current timestamp in ISO format
   * @returns {string} ISO formatted timestamp
   */
  function nowISO() {
    return new Date().toISOString();
  }

  /**
   * Format ISO timestamp to localized string
   * @param {string} iso - ISO formatted timestamp
   * @returns {string} Formatted date/time or '—' if empty
   */
  function formatTimestamp(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleString();
  }

  /**
   * Debounce function to limit execution frequency
   * @param {Function} func - Function to debounce
   * @param {number} delay - Delay in milliseconds
   * @returns {Function} Debounced function
   */
  function debounce(func, delay) {
    let timeoutId = null;
    return function debounced(...args) {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        func.apply(this, args);
        timeoutId = null;
      }, delay);
    };
  }

  /**
   * Animate element with pulse effect
   * @param {HTMLElement} el - Element to animate
   */
  function animatePulse(el) {
    if (!el) return;
    el.animate(
      [
        { transform: 'scale(1)', opacity: 1 },
        { transform: 'scale(0.98)', opacity: 0.98 },
        { transform: 'scale(1)', opacity: 1 }
      ],
      { duration: CONFIG.ANIMATION_DURATION, easing: 'cubic-bezier(.2,.9,.3,1)' }
    );
  }

  /**
   * Show auto-save indicator
   */
  function showAutoSaveIndicator() {
    if (!CONFIG.SHOW_SAVE_TOAST) return;
    const indicator = document.createElement('div');
    indicator.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: rgba(43, 180, 169, 0.9);
      color: white;
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 12px;
      z-index: 100;
      animation: fadeInOut 2s ease;
    `;
    indicator.textContent = '✓ Saved';
    document.body.appendChild(indicator);
    setTimeout(() => indicator.remove(), 2000);
  }

  /**
   * Show milestone achievement notification
   * @param {number} milestone - Milestone number reached
   */
  function showMilestoneNotification(milestone) {
    if (state.milestonesSeen.has(milestone)) return;
    state.milestonesSeen.add(milestone);

    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 100px;
      left: 50%;
      transform: translateX(-50%);
      background: linear-gradient(180deg, #ffd86b, #f1b940);
      color: #0e2b00;
      padding: 16px 24px;
      border-radius: 12px;
      font-weight: 600;
      z-index: 100;
      animation: slideDown 0.5s ease, slideUp 0.5s ease 2.5s forwards;
    `;
    notification.textContent = MESSAGES.MILESTONE(milestone);
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
  }

  /**
   * Convert hex color to RGBA string
   * @param {string} hex - Hex color code
   * @param {number} alpha - Alpha value (0-1)
   * @returns {string} RGBA string
   */
  function hexToRgba(hex, alpha) {
    const h = hex.replace('#', '');
    const r = parseInt(h.substring(0, 2), 16);
    const g = parseInt(h.substring(2, 4), 16);
    const b = parseInt(h.substring(4, 6), 16);
    return `rgba(${r},${g},${b},${Number(alpha)})`;
  }

  function blendHex(hexA, hexB, ratio = 0.5) {
    const a = hexA.replace('#', '');
    const b = hexB.replace('#', '');
    const r = Math.round(parseInt(a.substring(0, 2), 16) * (1 - ratio) + parseInt(b.substring(0, 2), 16) * ratio);
    const g = Math.round(parseInt(a.substring(2, 4), 16) * (1 - ratio) + parseInt(b.substring(2, 4), 16) * ratio);
    const bl = Math.round(parseInt(a.substring(4, 6), 16) * (1 - ratio) + parseInt(b.substring(4, 6), 16) * ratio);
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${bl.toString(16).padStart(2, '0')}`;
  }

  /**
   * Convert RGB/RGBA color to hex
   * @param {string} color - Color string (rgb, rgba, or hex)
   * @returns {string|null} Hex color or null if invalid
   */
  function rgbToHex(color) {
    if (!color) return null;
    color = color.replace(/\s/g, '');
    if (color.startsWith('#')) return color;
    const m = color.match(/rgba?\((\d+),(\d+),(\d+)/i);
    if (!m) return null;
    const r = parseInt(m[1]).toString(16).padStart(2, '0');
    const g = parseInt(m[2]).toString(16).padStart(2, '0');
    const b = parseInt(m[3]).toString(16).padStart(2, '0');
    return `#${r}${g}${b}`;
  }

  function sanitizeImpressionText(value) {
    const normalized = String(value || '').replace(/\s+/g, ' ').trim();
    return normalized.slice(0, 15);
  }

  function isTypingContext(target) {
    if (!target) return false;
    const tag = target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return true;
    if (target.isContentEditable) return true;
    return Boolean(target.closest && target.closest('[contenteditable="true"]'));
  }

  // ============================================================================
  // STORAGE OPERATIONS
  // ============================================================================

  /**
   * Load application state from storage
   */
  function loadState() {
    try {
      const raw = localStorage.getItem(CONFIG.STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        state.count = Number(parsed.count) || 0;
        state.lastSaved = parsed.lastSaved || null;
      }

      const s2 = localStorage.getItem(CONFIG.SECONDARY_KEY);
      if (s2) {
        const p2 = JSON.parse(s2);
        state.secondary.enabled = Boolean(p2.enabled);
        state.secondary.count = Math.max(0, Number(p2.count) || 0);
        state.secondary.startedAt = p2.startedAt || null;
        state.secondary.lastSaved = p2.lastSaved || null;
      }

      const s = localStorage.getItem(CONFIG.START_KEY);
      if (s) {
        state.startedAt = s;
      } else {
        state.startedAt = nowISO();
        localStorage.setItem(CONFIG.START_KEY, state.startedAt);
      }
    } catch (e) {
      console.error('loadState error:', e);
      state.count = 0;
      state.lastSaved = null;
      state.startedAt = nowISO();
      localStorage.setItem(CONFIG.START_KEY, state.startedAt);
    }

    if (DOM.impressionText2) {
      DOM.impressionText2.addEventListener('input', () => {
        const cleaned = sanitizeImpressionText(DOM.impressionText2.textContent);
        if (cleaned !== DOM.impressionText2.textContent) DOM.impressionText2.textContent = cleaned;
      });
      DOM.impressionText2.addEventListener('blur', () => saveSecondary());
      DOM.impressionText2.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); DOM.impressionText2.blur(); }});
    }
  }

  /**
   * Debounced save function
   */
  const debouncedSave = debounce(() => {
    try {
      const payload = {
        count: state.count,
        lastSaved: nowISO()
      };
      localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(payload));
      state.lastSaved = payload.lastSaved;
      renderMeta();
      showAutoSaveIndicator();
      state.isSaving = false;
    } catch (e) {
      console.error('saveState error:', e);
      state.isSaving = false;
    }

    if (DOM.impressionText2) {
      DOM.impressionText2.addEventListener('input', () => {
        const cleaned = sanitizeImpressionText(DOM.impressionText2.textContent);
        if (cleaned !== DOM.impressionText2.textContent) DOM.impressionText2.textContent = cleaned;
      });
      DOM.impressionText2.addEventListener('blur', () => saveSecondary());
      DOM.impressionText2.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); DOM.impressionText2.blur(); }});
    }
  }, CONFIG.DEBOUNCE_DELAY);

  /**
   * Save application state (debounced)
   */
  function saveState() {
    state.isSaving = true;
    debouncedSave();
  }

  // ============================================================================
  // HISTORY OPERATIONS
  // ============================================================================

  /**
   * Load history from storage
   */
  function loadHistory() {
    try {
      const raw = localStorage.getItem(CONFIG.HISTORY_KEY);
      if (!raw) {
        state.history = [];
        return;
      }
      state.history = JSON.parse(raw) || [];
      const raw2 = localStorage.getItem(CONFIG.SECONDARY_HISTORY_KEY);
      state.secondary.history = raw2 ? (JSON.parse(raw2) || []) : [];
    } catch (e) {
      console.warn('loadHistory error:', e);
      state.history = [];
    }

    if (DOM.impressionText2) {
      DOM.impressionText2.addEventListener('input', () => {
        const cleaned = sanitizeImpressionText(DOM.impressionText2.textContent);
        if (cleaned !== DOM.impressionText2.textContent) DOM.impressionText2.textContent = cleaned;
      });
      DOM.impressionText2.addEventListener('blur', () => saveSecondary());
      DOM.impressionText2.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); DOM.impressionText2.blur(); }});
    }
  }

  /**
   * Save history to storage
   */
  function saveHistory() {
    try {
      localStorage.setItem(CONFIG.HISTORY_KEY, JSON.stringify(state.history));
    } catch (e) {
      console.warn('saveHistory error:', e);
    }

    if (DOM.impressionText2) {
      DOM.impressionText2.addEventListener('input', () => {
        const cleaned = sanitizeImpressionText(DOM.impressionText2.textContent);
        if (cleaned !== DOM.impressionText2.textContent) DOM.impressionText2.textContent = cleaned;
      });
      DOM.impressionText2.addEventListener('blur', () => saveSecondary());
      DOM.impressionText2.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); DOM.impressionText2.blur(); }});
    }
  }

  /**
   * Record a history entry
   * @param {number} delta - Change in count
   * @param {string} type - Action type: 'change', 'set', 'reset', 'add', 'sub'
   */
  function recordHistory(delta, type = 'change') {
    const entry = {
      when: nowISO(),
      delta: Number(delta),
      type: String(type),
      newCount: Number(state.count)
    };

    state.history.unshift(entry); // newest first
    if (state.history.length > CONFIG.HISTORY_MAX_ITEMS) {
      state.history.length = CONFIG.HISTORY_MAX_ITEMS;
    }

    saveHistory();

    // Only update UI if modal is open
    if (DOM.settingsModal?.getAttribute('aria-hidden') === 'false') {
      renderHistory();
    }

    if (DOM.impressionText2) {
      DOM.impressionText2.addEventListener('input', () => {
        const cleaned = sanitizeImpressionText(DOM.impressionText2.textContent);
        if (cleaned !== DOM.impressionText2.textContent) DOM.impressionText2.textContent = cleaned;
      });
      DOM.impressionText2.addEventListener('blur', () => saveSecondary());
      DOM.impressionText2.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); DOM.impressionText2.blur(); }});
    }
  }

  /**
   * Render history list with lazy loading
   */
  function renderHistory() {
    if (!DOM.historyListEl) return;

    DOM.historyListEl.innerHTML = '';

    if (!state.history || state.history.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'history-item';
      empty.textContent = 'No history yet.';
      DOM.historyListEl.appendChild(empty);
      return;
    }

    // Lazy load: only display recent items
    const toRender = state.history.slice(0, CONFIG.HISTORY_DISPLAY_ITEMS);
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
      meta.textContent = formatTimestamp(h.when);

      left.appendChild(label);
      left.appendChild(meta);

      const right = document.createElement('div');
      right.style.fontSize = '13px';
      right.style.opacity = '0.95';
      right.textContent = (h.type || '').toUpperCase();

      item.appendChild(left);
      item.appendChild(right);
      DOM.historyListEl.appendChild(item);
    }

    // Show count if more items exist
    if (state.history.length > CONFIG.HISTORY_DISPLAY_ITEMS) {
      const more = document.createElement('div');
      more.className = 'history-item';
      more.style.textAlign = 'center';
      more.style.opacity = '0.7';
      more.textContent = `... and ${state.history.length - CONFIG.HISTORY_DISPLAY_ITEMS} more`;
      DOM.historyListEl.appendChild(more);
    }

    if (DOM.impressionText2) {
      DOM.impressionText2.addEventListener('input', () => {
        const cleaned = sanitizeImpressionText(DOM.impressionText2.textContent);
        if (cleaned !== DOM.impressionText2.textContent) DOM.impressionText2.textContent = cleaned;
      });
      DOM.impressionText2.addEventListener('blur', () => saveSecondary());
      DOM.impressionText2.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); DOM.impressionText2.blur(); }});
    }
  }

  /**
   * Clear all history with confirmation
   * @param {boolean} confirmDialog - Show confirmation dialog
   */
  function clearHistory(confirmDialog = true) {
    if (confirmDialog) {
      const ok = confirm(MESSAGES.CLEAR_HISTORY);
      if (!ok) return;
    }
    state.history = [];
    saveHistory();
    renderHistory();
  }

  // ============================================================================
  // UNDO/REDO OPERATIONS
  // ============================================================================

  /**
   * Load undo stack from storage
   */
  function loadUndoStack() {
    try {
      const raw = localStorage.getItem(CONFIG.UNDO_KEY);
      if (!raw) {
        state.undoStack = [];
        return;
      }
      state.undoStack = JSON.parse(raw) || [];
    } catch (e) {
      console.warn('loadUndoStack error:', e);
      state.undoStack = [];
    }

    if (DOM.impressionText2) {
      DOM.impressionText2.addEventListener('input', () => {
        const cleaned = sanitizeImpressionText(DOM.impressionText2.textContent);
        if (cleaned !== DOM.impressionText2.textContent) DOM.impressionText2.textContent = cleaned;
      });
      DOM.impressionText2.addEventListener('blur', () => saveSecondary());
      DOM.impressionText2.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); DOM.impressionText2.blur(); }});
    }
  }

  /**
   * Save undo stack to storage
   */
  function saveUndoStack() {
    try {
      localStorage.setItem(CONFIG.UNDO_KEY, JSON.stringify(state.undoStack));
    } catch (e) {
      console.warn('saveUndoStack error:', e);
    }

    if (DOM.impressionText2) {
      DOM.impressionText2.addEventListener('input', () => {
        const cleaned = sanitizeImpressionText(DOM.impressionText2.textContent);
        if (cleaned !== DOM.impressionText2.textContent) DOM.impressionText2.textContent = cleaned;
      });
      DOM.impressionText2.addEventListener('blur', () => saveSecondary());
      DOM.impressionText2.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); DOM.impressionText2.blur(); }});
    }
  }

  /**
   * Record undo point
   */
  function recordUndo() {
    state.undoStack.push({
      count: state.count,
      when: nowISO()
    });

    // Limit undo stack size
    if (state.undoStack.length > 50) {
      state.undoStack.shift();
    }

    saveUndoStack();
  }

  /**
   * Undo last action
   */
  function undoAction() {
    if (state.undoStack.length === 0) {
      console.warn('Nothing to undo');
      return;
    }

    const previousState = state.undoStack.pop();
    state.count = previousState.count;
    recordHistory(0, 'undo');
    saveState();
    render();
    animatePulse(DOM.meter);
    saveUndoStack();
  }

  // ============================================================================
  // EXPORT/IMPORT OPERATIONS
  // ============================================================================

  /**
   * Export all data as JSON
   */
  function exportData() {
    const data = {
      count: state.count,
      startedAt: state.startedAt,
      lastSaved: state.lastSaved,
      history: state.history,
      exportedAt: nowISO()
    };

    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `clickCounter_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Import data from JSON file
   */
  function importData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';

    input.onchange = function (e) {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = function (event) {
        try {
          const data = JSON.parse(event.target.result);
          if (!data || typeof data !== 'object') {
            throw new Error('Invalid backup format');
          }

          if (Number.isFinite(data.count)) {
            state.count = Math.max(0, Number(data.count));
          }

          if (Array.isArray(data.history)) {
            state.history = data.history
              .filter((item) => item && typeof item === 'object')
              .map((item) => ({
                when: item.when || nowISO(),
                delta: Number(item.delta) || 0,
                type: String(item.type || 'change'),
                newCount: Math.max(0, Number(item.newCount) || 0)
              }))
              .slice(0, CONFIG.HISTORY_MAX_ITEMS);
          }

          if (typeof data.startedAt === 'string' && data.startedAt) {
            state.startedAt = data.startedAt;
          }

          saveState();
          saveHistory();
          render();
          alert('Data imported successfully!');
          closeModal();
        } catch (error) {
          alert('Error importing file: ' + error.message);
        }
      };

      reader.readAsText(file);
    };

    input.click();
  }

  // ============================================================================
  // STATISTICS
  // ============================================================================

  /**
   * Calculate session statistics
   * @returns {Object} Statistics object
   */
  function getStatistics() {
    const now = new Date();
    const started = new Date(state.startedAt);
    const elapsedMinutes = (now - started) / (1000 * 60);
    const avgClicksPerMinute = elapsedMinutes > 0 ? (state.count / elapsedMinutes).toFixed(2) : 0;

    return {
      totalClicks: state.count,
      elapsedMinutes: Math.floor(elapsedMinutes),
      avgClicksPerMinute,
      historyCount: state.history.length,
      sessionStarted: formatTimestamp(state.startedAt)
    };
  }

  /**
   * Show statistics in a readable format
   */
  function showStatistics() {
    const stats = getStatistics();
    alert(
      `📊 Session Statistics\n\n` +
      `Total Clicks: ${stats.totalClicks}\n` +
      `Time Elapsed: ${stats.elapsedMinutes} min\n` +
      `Avg Clicks/min: ${stats.avgClicksPerMinute}\n` +
      `History Entries: ${stats.historyCount}\n` +
      `Session Started: ${stats.sessionStarted}`
    );
  }

  // ============================================================================
  // THEME OPERATIONS
  // ============================================================================

  /**
   * Apply theme to document
   * @param {Object} theme - Theme configuration
   * @param {boolean} persist - Whether to save to storage
   */
  function applyTheme(theme, persist = false) {
    if (!theme) return;

    const root = document.documentElement;
    if (theme.top) root.style.setProperty('--bg-top', theme.top);
    root.style.setProperty('--bg-mid-1', theme.mid1 || blendHex(theme.top || '#79bfe9', theme.bottom || '#f0b79a', 0.35));
    root.style.setProperty('--bg-mid-2', theme.mid2 || blendHex(theme.top || '#79bfe9', theme.bottom || '#f0b79a', 0.7));
    if (theme.bottom) root.style.setProperty('--bg-bottom', theme.bottom);
    if (theme.glass) root.style.setProperty('--glass', hexToRgba('#ffffff', theme.glass));
    if (theme.glass2) root.style.setProperty('--glass-2', hexToRgba('#ffffff', theme.glass2));

    if (persist) {
      try {
        localStorage.setItem(CONFIG.THEME_KEY, JSON.stringify(theme));
      } catch (e) {
        console.warn('theme save failed:', e);
      }
    }

    if (DOM.impressionText2) {
      DOM.impressionText2.addEventListener('input', () => {
        const cleaned = sanitizeImpressionText(DOM.impressionText2.textContent);
        if (cleaned !== DOM.impressionText2.textContent) DOM.impressionText2.textContent = cleaned;
      });
      DOM.impressionText2.addEventListener('blur', () => saveSecondary());
      DOM.impressionText2.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); DOM.impressionText2.blur(); }});
    }
  }

  /**
   * Load theme from storage
   */
  function loadTheme() {
    try {
      const raw = localStorage.getItem(CONFIG.THEME_KEY);
      if (!raw) return;

      const theme = JSON.parse(raw);
      applyTheme(theme, false);

      if (theme.top) DOM.themeTop.value = theme.top;
      if (theme.bottom) DOM.themeBottom.value = theme.bottom;
    } catch (e) {
      console.warn('load theme:', e);
    }

    if (DOM.impressionText2) {
      DOM.impressionText2.addEventListener('input', () => {
        const cleaned = sanitizeImpressionText(DOM.impressionText2.textContent);
        if (cleaned !== DOM.impressionText2.textContent) DOM.impressionText2.textContent = cleaned;
      });
      DOM.impressionText2.addEventListener('blur', () => saveSecondary());
      DOM.impressionText2.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); DOM.impressionText2.blur(); }});
    }
  }

  function loadImpression() {
    if (!DOM.impressionText) return;
    try {
      const saved = localStorage.getItem(CONFIG.IMPRESSION_KEY);
      const nextText = sanitizeImpressionText(saved || 'Impression') || 'Impression';
      DOM.impressionText.textContent = nextText;
    } catch (e) {
      DOM.impressionText.textContent = 'Impression';
    }

    if (DOM.impressionText2) {
      DOM.impressionText2.addEventListener('input', () => {
        const cleaned = sanitizeImpressionText(DOM.impressionText2.textContent);
        if (cleaned !== DOM.impressionText2.textContent) DOM.impressionText2.textContent = cleaned;
      });
      DOM.impressionText2.addEventListener('blur', () => saveSecondary());
      DOM.impressionText2.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); DOM.impressionText2.blur(); }});
    }
  }

  function saveImpression(text) {
    try {
      localStorage.setItem(CONFIG.IMPRESSION_KEY, sanitizeImpressionText(text) || 'Impression');
    } catch (e) {
      console.warn('impression save failed:', e);
    }

    if (DOM.impressionText2) {
      DOM.impressionText2.addEventListener('input', () => {
        const cleaned = sanitizeImpressionText(DOM.impressionText2.textContent);
        if (cleaned !== DOM.impressionText2.textContent) DOM.impressionText2.textContent = cleaned;
      });
      DOM.impressionText2.addEventListener('blur', () => saveSecondary());
      DOM.impressionText2.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); DOM.impressionText2.blur(); }});
    }
  }

  function getGlassOpacityValue() {
    if (!DOM.glassOpacity) return 0.45;
    return Number(DOM.glassOpacity.value) || 0.45;
  }

  /**
   * Reset theme to default
   */
  function resetThemeToDefault() {
    localStorage.removeItem(CONFIG.THEME_KEY);
    const defaultTheme = {
      top: '#79bfe9',
      bottom: '#f0b79a',
      glass: 0.45,
      glass2: 0.06
    };

    applyTheme(defaultTheme, false);

    DOM.themeTop.value = defaultTheme.top;
    DOM.themeBottom.value = defaultTheme.bottom;
    if (DOM.glassOpacity) DOM.glassOpacity.value = defaultTheme.glass;
  }

  function getPresetTheme(name) {
    const presets = {
      default: { top: '#79bfe9', bottom: '#f0b79a', glass: 0.45, glass2: 0.06 },
      dark: { top: '#1b2533', mid1: '#243243', mid2: '#2f3f52', bottom: '#3a4659', glass: 0.22, glass2: 0.08 },
      deepmint: { top: '#1A6060', mid1: '#476f6f', mid2: '#627f7f', bottom: '#7A9090', glass: 0.38, glass2: 0.08 },
      mist: { top: '#d7e6ef', mid1: '#dce8e8', mid2: '#e3e0d7', bottom: '#eadfce', glass: 0.5, glass2: 0.08 },
      sand: { top: '#e7d9cb', mid1: '#e7ddcf', mid2: '#dfd8cf', bottom: '#d4d1cf', glass: 0.5, glass2: 0.08 }
    };
    return presets[name] || presets.default;
  }

  // ============================================================================
  // UI RENDERING
  // ============================================================================

  /**
   * Render counter display
   */
  function render() {
    DOM.countEl.textContent = String(state.count);
    if (DOM.countEl2) DOM.countEl2.textContent = String(state.secondary.count);
    renderMeta();
  }

  /**
   * Render metadata (timestamps)
   */
  function renderMeta() {
    DOM.startedAtEl.textContent = formatTimestamp(state.startedAt);
    DOM.lastSavedEl.textContent = formatTimestamp(state.lastSaved);
    if (DOM.startedAtEl2) DOM.startedAtEl2.textContent = formatTimestamp(state.secondary.startedAt);
    if (DOM.lastSavedEl2) DOM.lastSavedEl2.textContent = formatTimestamp(state.secondary.lastSaved);
  }

  /**
   * Open settings modal
   */
  function openModal() {
    DOM.settingsModal.setAttribute('aria-hidden', 'false');
    DOM.settingsModal.style.pointerEvents = 'auto';
    DOM.manualNumber.value = 1;

    try {
      const ct = getComputedStyle(document.documentElement)
        .getPropertyValue('--bg-top')
        .trim();
      const cb = getComputedStyle(document.documentElement)
        .getPropertyValue('--bg-bottom')
        .trim();
      if (ct) DOM.themeTop.value = rgbToHex(ct) || DOM.themeTop.value;
      if (cb) DOM.themeBottom.value = rgbToHex(cb) || DOM.themeBottom.value;
    } catch (e) {
      console.warn('Error syncing theme colors:', e);
    }

    renderHistory();
  }

  /**
   * Close settings modal
   */
  function closeModal() {
    DOM.settingsModal.setAttribute('aria-hidden', 'true');
    DOM.settingsModal.style.pointerEvents = 'none';
  }

  // ============================================================================
  // COUNTER ACTIONS
  // ============================================================================

  /**
   * Change counter by delta value
   * @param {number} delta - Amount to change
   */
  function changeBy(delta) {
    recordUndo();
    const newVal = Number(state.count) + Number(delta);
    state.count = newVal < 0 ? 0 : newVal; // prevent negative

    // Check for milestones
    CONFIG.MILESTONE_THRESHOLDS.forEach(milestone => {
      if (state.count >= milestone && state.count - delta < milestone) {
        showMilestoneNotification(milestone);
      }
    });

    saveState();
    render();
    animatePulse(DOM.meter);
    recordHistory(delta, 'change');
  }

  /**
   * Reset counter to zero
   */
  function resetCounter() {
    const ok = confirm(MESSAGES.RESET_CONFIRM);
    if (!ok) return;

    recordUndo();
    state.count = 0;
    recordHistory(0, 'reset');
    localStorage.removeItem(CONFIG.STORAGE_KEY);
    state.lastSaved = null;
    saveState();
    render();
    animatePulse(DOM.resetBtn);
  }

  // ============================================================================
  // EVENT LISTENERS INITIALIZATION
  // ============================================================================

  /**
   * Initialize all event listeners
   */
  function initListeners() {
    // ---- MAIN COUNTER ----
    DOM.meter.addEventListener('click', () => changeBy(1));
    DOM.meter.addEventListener('keydown', (e) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        changeBy(1);
      }
    });
    DOM.meter2?.addEventListener('click', () => changeBySecondary(1));
    DOM.meter2?.addEventListener('keydown', (e) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        changeBySecondary(1);
      }
    });

    // ---- CONTROL BUTTONS ----
    DOM.controls.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-action]');
      if (!btn) return;

      const action = btn.dataset.action;
      const value = Number(btn.dataset.value || 0);

      if (action === 'inc') changeBy(Math.abs(value));
      else if (action === 'dec') changeBy(-Math.abs(value));
    });

    DOM.controls2?.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-action]');
      if (!btn) return;
      const action = btn.dataset.action;
      const value = Number(btn.dataset.value || 0);
      if (action === 'inc') changeBySecondary(Math.abs(value));
      else if (action === 'dec') changeBySecondary(-Math.abs(value));
    });

    // ---- RESET BUTTON ----
    DOM.resetBtn.addEventListener('click', resetCounter);
    DOM.resetBtn2?.addEventListener('click', () => {
      const ok = confirm('Reset secondary counter?');
      if (!ok) return;
      state.secondary.count = 0;
      state.secondary.history.unshift({ when: nowISO(), delta: 0, newCount: 0 });
      render(); renderSecondaryHistory(); saveSecondary();
    });

    // ---- AUTO-SAVE ----
    setInterval(() => saveState(), CONFIG.SAVE_INTERVAL);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') saveState();
    });
    window.addEventListener('beforeunload', () => saveState());

    // ---- MODAL MANAGEMENT ----
    DOM.settingsBtn.addEventListener('click', openModal);
    if (DOM.addMeterBtn) {
      DOM.addMeterBtn.addEventListener('click', () => {
        if (state.secondary.enabled) return;
        state.secondary.enabled = true;
        state.secondary.startedAt = nowISO();
        renderSecondaryVisibility();
        saveSecondary();
      });
    }
    DOM.modalClose.addEventListener('click', closeModal);

    if (DOM.exportBtn) {
      DOM.exportBtn.addEventListener('click', exportData);
    }
    if (DOM.importBtn) {
      DOM.importBtn.addEventListener('click', importData);
    }
    if (DOM.leadUpdateBtn) {
      DOM.leadUpdateBtn.addEventListener('click', () => {
        window.open('https://sihab03s.github.io/Affilancers-Lead-Update/', '_blank', 'noopener,noreferrer');
      });
    }
    DOM.settingsModal.addEventListener('click', (e) => {
      if (e.target === DOM.settingsModal) closeModal();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeModal();
    });

    // ---- MANUAL NUMBER CONTROLS ----
    DOM.decManual.addEventListener('click', () => {
      DOM.manualNumber.value = Math.max(0, Number(DOM.manualNumber.value) - 1);
    });
    DOM.incManual.addEventListener('click', () => {
      DOM.manualNumber.value = Number(DOM.manualNumber.value) + 1;
    });
    DOM.applyAdd.addEventListener('click', () => {
      const v = Number(DOM.manualNumber.value) || 0;
      changeBy(v);
    });
    DOM.applySub.addEventListener('click', () => {
      const v = Number(DOM.manualNumber.value) || 0;
      changeBy(-v);
    });
    DOM.setExact.addEventListener('click', () => {
      const v = Math.max(0, Number(DOM.manualNumber.value) || 0);
      recordUndo();
      state.count = v;
      saveState();
      render();
      animatePulse(DOM.meter);
      recordHistory(v, 'set');
    });
    DOM.decManual2?.addEventListener('click', () => { DOM.manualNumber2.value = Math.max(0, Number(DOM.manualNumber2.value) - 1); });
    DOM.incManual2?.addEventListener('click', () => { DOM.manualNumber2.value = Number(DOM.manualNumber2.value) + 1; });
    DOM.applyAdd2?.addEventListener('click', () => changeBySecondary(Number(DOM.manualNumber2.value) || 0));
    DOM.applySub2?.addEventListener('click', () => changeBySecondary(-(Number(DOM.manualNumber2.value) || 0)));
    DOM.setExact2?.addEventListener('click', () => {
      state.secondary.count = Math.max(0, Number(DOM.manualNumber2.value) || 0);
      state.secondary.history.unshift({ when: nowISO(), delta: 0, newCount: state.secondary.count });
      render(); renderSecondaryHistory(); saveSecondary();
    });
    DOM.secondaryDeleteBtn?.addEventListener('click', () => {
      const ok = confirm('Delete secondary click meter?');
      if (!ok) return;
      state.secondary = { enabled:false, count:0, startedAt:null, lastSaved:null, history:[] };
      renderSecondaryVisibility(); renderSecondaryHistory(); render(); saveSecondary();
    });

    // ---- THEME CONTROLS ----
    DOM.previewTheme.addEventListener('click', () => {
      applyTheme({
        top: DOM.themeTop.value,
        bottom: DOM.themeBottom.value,
        glass: getGlassOpacityValue(),
        glass2: Math.max(0.01, getGlassOpacityValue() - 0.35)
      }, false);
    });

    DOM.saveTheme.addEventListener('click', () => {
      const theme = {
        top: DOM.themeTop.value,
        bottom: DOM.themeBottom.value,
        glass: getGlassOpacityValue(),
        glass2: Math.max(0.01, getGlassOpacityValue() - 0.35)
      };
      applyTheme(theme, true);
      alert(MESSAGES.THEME_SAVED);
      closeModal();
    });

    DOM.presetButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const preset = getPresetTheme(btn.dataset.preset);
        applyTheme(preset, false);
        DOM.themeTop.value = preset.top;
        DOM.themeBottom.value = preset.bottom;
        if (DOM.glassOpacity) DOM.glassOpacity.value = preset.glass;
      });
    });

    DOM.resetTheme.addEventListener('click', () => {
      const ok = confirm(MESSAGES.RESET_THEME);
      if (!ok) return;
      resetThemeToDefault();
      alert('Theme reset to default.');
    });

    // ---- HISTORY CONTROLS ----
    if (DOM.clearHistoryBtn) {
      DOM.clearHistoryBtn.addEventListener('click', () => clearHistory(true));
    }
    if (DOM.clearHistoryBtn2) {
      DOM.clearHistoryBtn2.addEventListener('click', () => {
        const ok = confirm('Clear secondary history?');
        if (!ok) return;
        state.secondary.history = [];
        renderSecondaryHistory();
        saveSecondary();
      });
    }

    // ---- KEYBOARD SHORTCUTS ----
    document.addEventListener('keydown', (e) => {
      // Don't trigger shortcuts when typing in inputs
      if (isTypingContext(e.target)) {
        return;
      }

      const key = e.key;
      if (KEYBOARD_SHORTCUTS[key]) {
        e.preventDefault();
        KEYBOARD_SHORTCUTS[key]();
      }
    });

    // ---- GLOBAL SHORTCUTS (press 's' to show stats, 'e' to export, 'i' to import) ----
    document.addEventListener('keydown', (e) => {
      if (isTypingContext(e.target)) {
        return;
      }

      // 's' reserved; no stats popup now
      if (e.key === 'e' || e.key === 'E') {
        e.preventDefault();
        exportData();
      }
      if (e.key === 'i' || e.key === 'I') {
        e.preventDefault();
        importData();
      }
    });

    if (DOM.impressionText) {
      DOM.impressionText.addEventListener('focus', () => {
        DOM.impressionText.dataset.beforeEdit = DOM.impressionText.textContent || '';
      });
      DOM.impressionText.addEventListener('input', () => {
        const cleaned = sanitizeImpressionText(DOM.impressionText.textContent);
        if (cleaned !== DOM.impressionText.textContent) {
          DOM.impressionText.textContent = cleaned;
          const range = document.createRange();
          range.selectNodeContents(DOM.impressionText);
          range.collapse(false);
          const sel = window.getSelection();
          sel.removeAllRanges();
          sel.addRange(range);
        }
      });
      DOM.impressionText.addEventListener('blur', () => {
        const finalText = sanitizeImpressionText(DOM.impressionText.textContent) || 'Impression';
        DOM.impressionText.textContent = finalText;
        saveImpression(finalText);
      });
      DOM.impressionText.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          DOM.impressionText.blur();
        }
      });
    }

    if (DOM.impressionText2) {
      DOM.impressionText2.addEventListener('input', () => {
        const cleaned = sanitizeImpressionText(DOM.impressionText2.textContent);
        if (cleaned !== DOM.impressionText2.textContent) DOM.impressionText2.textContent = cleaned;
      });
      DOM.impressionText2.addEventListener('blur', () => saveSecondary());
      DOM.impressionText2.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); DOM.impressionText2.blur(); }});
    }
  }


  function renderSecondaryVisibility() {
    const on = state.secondary.enabled;
    if (DOM.secondaryCard) DOM.secondaryCard.classList.toggle('hidden', !on);
    if (DOM.secondaryManualSection) DOM.secondaryManualSection.classList.toggle('hidden', !on);
    if (DOM.secondaryHistorySection) DOM.secondaryHistorySection.classList.toggle('hidden', !on);
    if (DOM.addMeterBtn) DOM.addMeterBtn.disabled = on;
  }

  function renderSecondaryHistory() {
    if (!DOM.historyListEl2) return;
    DOM.historyListEl2.innerHTML = '';
    if (!state.secondary.history.length) {
      const empty = document.createElement('div');
      empty.className = 'history-item';
      empty.textContent = 'No history yet.';
      DOM.historyListEl2.appendChild(empty);
      return;
    }
    for (const h of state.secondary.history.slice(0, CONFIG.HISTORY_DISPLAY_ITEMS)) {
      const item = document.createElement('div');
      item.className = 'history-item';
      item.textContent = `${h.delta > 0 ? '+' : ''}${h.delta} → ${h.newCount} · ${formatTimestamp(h.when)}`;
      DOM.historyListEl2.appendChild(item);
    }

    if (DOM.impressionText2) {
      DOM.impressionText2.addEventListener('input', () => {
        const cleaned = sanitizeImpressionText(DOM.impressionText2.textContent);
        if (cleaned !== DOM.impressionText2.textContent) DOM.impressionText2.textContent = cleaned;
      });
      DOM.impressionText2.addEventListener('blur', () => saveSecondary());
      DOM.impressionText2.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); DOM.impressionText2.blur(); }});
    }
  }

  function changeBySecondary(delta) {
    if (!state.secondary.enabled) return;
    const newVal = Number(state.secondary.count) + Number(delta);
    state.secondary.count = Math.max(0, newVal);
    state.secondary.history.unshift({ when: nowISO(), delta: Number(delta), newCount: state.secondary.count });
    if (state.secondary.history.length > CONFIG.HISTORY_MAX_ITEMS) state.secondary.history.length = CONFIG.HISTORY_MAX_ITEMS;
    saveHistory();
    saveState();
    render();
    renderSecondaryHistory();
    animatePulse(DOM.meter2);
  }

  function saveSecondary() {
    localStorage.setItem(CONFIG.SECONDARY_KEY, JSON.stringify({
      enabled: state.secondary.enabled,
      count: state.secondary.count,
      startedAt: state.secondary.startedAt,
      lastSaved: state.secondary.lastSaved
    }));
    localStorage.setItem(CONFIG.SECONDARY_HISTORY_KEY, JSON.stringify(state.secondary.history));
    localStorage.setItem(CONFIG.SECONDARY_IMPRESSION_KEY, DOM.impressionText2?.textContent || 'Impression');
  }

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  /**
   * Initialize application
   */
  function init() {
    loadState();
    loadHistory();
    loadUndoStack();
    render();
    initListeners();
    loadTheme();
    loadImpression();
    try {
      const imp2 = localStorage.getItem(CONFIG.SECONDARY_IMPRESSION_KEY);
      if (DOM.impressionText2) DOM.impressionText2.textContent = sanitizeImpressionText(imp2 || 'Impression') || 'Impression';
    } catch (e) {}
    renderSecondaryVisibility();
    renderSecondaryHistory();

    // Add CSS animation keyframes dynamically
    const style = document.createElement('style');
    style.textContent = `
      @keyframes fadeInOut {
        0% { opacity: 0; }
        10% { opacity: 1; }
        90% { opacity: 1; }
        100% { opacity: 0; }
      }
      @keyframes slideDown {
        from { transform: translateX(-50%) translateY(-100%); opacity: 0; }
        to { transform: translateX(-50%) translateY(0); opacity: 1; }
      }
      @keyframes slideUp {
        from { transform: translateX(-50%) translateY(0); opacity: 1; }
        to { transform: translateX(-50%) translateY(-100%); opacity: 0; }
      }
    `;
    document.head.appendChild(style);

    console.log('ClickCounter initialized. Keyboard shortcuts: +/-/r/z/s/e/i');
  }

  // Boot application
  init();
})();
