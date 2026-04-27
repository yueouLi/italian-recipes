/* ── cucina italiana · app.js ── */

// ── XSS Protection ──
function esc(str) {
  if (!str) return '';
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

// ── Constants ──
const CAT_EMOJI = {
  Pasta: '🍝', Risotto: '🍚', Fleisch: '🥩', Fisch: '🐟',
  'Gemüse': '🥦', Antipasti: '🫒', Suppe: '🍲', Dessert: '🍮', Sonstiges: '🍽️'
};
const CAT_BG = {
  Pasta: '#fef3e8', Risotto: '#f0f5e0', Fleisch: '#fbeaea', Fisch: '#e8f2fa',
  'Gemüse': '#eaf5ea', Antipasti: '#f5f0e0', Suppe: '#f0eef5', Dessert: '#fdf0f5', Sonstiges: '#f5f5f7'
};

// ── Protein / Mood / Occasion detection word lists ──
const STOP_WORDS = new Set(['salz','pfeffer','wasser','olivenöl','butter','nach','geschmack','etwa','etwas','frisches','frischer','frische','getrockneter','getrocknete','gehackte','gehackter','geriebener','geriebene','fein','grob','schwarzer','weißer','roten','rote','roter','kleine','kleiner','großer','große','frisch','getrocknet','eingelegte','eingelegter','und','oder','trockenes','lauwarmes','lauwarme','feines','junger','junge','kaltes','kalter']);
const PROTEIN_WORDS = {
  wild: ['kaninchen','coniglio','hase','lepre','hirsch','cervo','reh','capriolo','wildschwein','cinghiale','ente','anatra','taube','piccione','wachtel','quaglia','perlhuhn'],
  lamm: ['lamm','lammfleisch','lammkeule','agnello','abbacchio'],
  'meeresfrüchte': ['garnelen','gamberi','muscheln','vongole','calamari','tintenfisch','cozze','scampi','meeresfrüchte','aragosta','polpo'],
  fisch: ['fisch','lachs','thunfisch','wolfsbarsch','branzino','dorade','kabeljau','sardellen','sardellenfilets','tonno','pesce','merluzzo'],
  'geflügel': ['huhn','hühnchen','hähnchen','geflügel','poularde','pute','pollo','gallina'],
  rind: ['rind','rindfleisch','kalbfleisch','kalb','ossobuco','bistecca','vitello','manzo'],
  schwein: ['schwein','schweinefleisch','pancetta','prosciutto','guanciale','salsiccia','mortadella','coppa','porchetta','maiale']
};

function detectProtein(name, category, ingredients) {
  const nameLow = name.toLowerCase();
  const top3 = ingredients.slice(0, 3).join(' ').toLowerCase();
  const all = ingredients.join(' ').toLowerCase();
  for (const [prot, words] of Object.entries(PROTEIN_WORDS)) {
    for (const w of words) {
      if (nameLow.includes(w)) return prot;
    }
  }
  for (const [prot, words] of Object.entries(PROTEIN_WORDS)) {
    for (const w of words) {
      if (top3.includes(w)) return prot;
    }
  }
  for (const [prot, words] of Object.entries(PROTEIN_WORDS)) {
    for (const w of words) {
      if (all.includes(w)) return prot;
    }
  }
  if (category === 'Fisch') return 'fisch';
  return 'vegetarisch';
}

function detectMood(category, difficulty, totalTime) {
  const moods = [];
  if (totalTime && totalTime <= 30) moods.push('schnell');
  if (difficulty === 'Einfach') moods.push('entspannt');
  if (['Dessert', 'Suppe', 'Risotto'].includes(category) || difficulty === 'Einfach') moods.push('comfort');
  if (difficulty === 'Schwer' || (totalTime && totalTime > 90)) moods.push('besonderes');
  if (['Gemüse', 'Fisch'].includes(category) || difficulty === 'Einfach') moods.push('leicht');
  return moods.length ? moods : ['entspannt'];
}

function detectOccasion(difficulty, totalTime, servings) {
  const occasions = [];
  if (totalTime && totalTime <= 45 && difficulty !== 'Schwer') occasions.push('woche');
  if (difficulty === 'Schwer' || (totalTime && totalTime > 90)) occasions.push('sonntag');
  if (servings && servings >= 6) occasions.push('familie');
  if (['Mittel', 'Schwer'].includes(difficulty)) occasions.push('freunde');
  if (difficulty === 'Schwer') occasions.push('romantisch');
  return occasions.length ? occasions : ['woche'];
}

function extractKeywords(ingredients) {
  const keywords = [];
  for (const ing of ingredients) {
    const cleaned = ing.toLowerCase()
      .replace(/\d+[\s,./]*\d*/g, '')
      .replace(/\b(g|kg|ml|l|cl|dl|el|tl|stück|pkg|bund|scheibe|scheiben|prise|prisen|dose|dosen|becher|tasse|tassen)\b/gi, '')
      .trim();
    const words = cleaned.split(/[\s,()]+/).filter(w => w.length > 2 && !STOP_WORDS.has(w));
    keywords.push(...words);
  }
  return [...new Set(keywords)];
}

// ── IndexedDB for Photos ──
const PhotoDB = {
  _db: null,
  DB_NAME: 'cucina_photos',
  STORE: 'photos',

  async open() {
    if (this._db) return this._db;
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(this.DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(this.STORE);
      req.onsuccess = () => { this._db = req.result; resolve(this._db); };
      req.onerror = () => reject(req.error);
    });
  },

  async get(name) {
    const db = await this.open();
    return new Promise((resolve) => {
      const tx = db.transaction(this.STORE, 'readonly');
      const req = tx.objectStore(this.STORE).get(name);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  },

  async set(name, data) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.STORE, 'readwrite');
      tx.objectStore(this.STORE).put(data, name);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },

  async getAll() {
    const db = await this.open();
    return new Promise((resolve) => {
      const tx = db.transaction(this.STORE, 'readonly');
      const store = tx.objectStore(this.STORE);
      const photos = {};
      const req = store.openCursor();
      req.onsuccess = () => {
        const cursor = req.result;
        if (cursor) {
          photos[cursor.key] = cursor.value;
          cursor.continue();
        } else {
          resolve(photos);
        }
      };
      req.onerror = () => resolve({});
    });
  }
};

// ── Safe localStorage wrapper ──
function storageGet(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) || fallback; }
  catch { return fallback; }
}
function storageSet(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); }
  catch (e) {
    if (e.name === 'QuotaExceededError') {
      console.warn('localStorage voll:', key);
    }
  }
}

// ── State ──
let builtInRecipes = [];
let userRecipes = storageGet('cucina_user', []);
let allRecipes = [];
let photos = {};
let cookedSet = new Set(storageGet('cucina_cooked', []));
let ratings = storageGet('cucina_ratings', {});

let searchIngredients = [];
let matchMode = false;
let filters = { cat: null, diff: null, time: null, mood: null, occ: null, prot: null, mine: null };
let currentIndex = -1;
let currentPortions = 4;
let basePortions = 4;

// Index for fast lookups instead of O(n) findIndex per card
let recipeIndexMap = new Map();
function rebuildIndex() {
  recipeIndexMap.clear();
  allRecipes.forEach((r, i) => recipeIndexMap.set(r.name + '|' + (r.name_it || ''), i));
}

// ── Data Loading ──
async function loadRecipes() {
  try {
    const res = await fetch('recipes-processed.json');
    builtInRecipes = await res.json();
    // Compute missing fields (protein, mood, occasion) if not present
    builtInRecipes.forEach(r => {
      if (!r.protein) r.protein = detectProtein(r.name, r.category, r.ingredients || []);
      if (!r.mood) r.mood = detectMood(r.category, r.difficulty, r.time);
      if (!r.occasion) r.occasion = detectOccasion(r.difficulty, r.time, r.servings);
    });
  } catch {
    builtInRecipes = [];
    console.warn('recipes-processed.json konnte nicht geladen werden');
  }
  allRecipes = [...builtInRecipes, ...userRecipes];
  rebuildIndex();
  photos = await PhotoDB.getAll();
  renderGrid();
  document.getElementById('nav-count').textContent = allRecipes.length + ' Rezepte';
}

// ── Ingredient Search ──
function addIngredient() {
  const input = document.getElementById('ingredient-input');
  const value = input.value.trim().toLowerCase();
  if (!value || searchIngredients.includes(value)) { input.value = ''; return; }
  searchIngredients.push(value);
  input.value = '';
  renderTags();
}

function removeIngredient(value) {
  searchIngredients = searchIngredients.filter(i => i !== value);
  renderTags();
  if (matchMode) renderGrid();
}

function renderTags() {
  const container = document.getElementById('tags');
  if (!searchIngredients.length) {
    container.innerHTML = '<span style="font-size:13px;color:#aeaeb2">Noch keine Zutaten</span>';
    return;
  }
  container.innerHTML = '';
  searchIngredients.forEach(ing => {
    const span = document.createElement('span');
    span.className = 'tag';
    span.textContent = ing;
    const btn = document.createElement('button');
    btn.className = 'tagx';
    btn.textContent = '×';
    btn.setAttribute('aria-label', 'Entferne ' + ing);
    btn.addEventListener('click', () => removeIngredient(ing));
    span.appendChild(btn);
    container.appendChild(span);
  });
}

function startMatch() {
  matchMode = true;
  renderGrid();
}

// ── Filter Chips ──
function handleChipClick(el, group) {
  const wasActive = el.classList.contains('active');
  document.querySelectorAll('.chip.' + group).forEach(c => c.classList.remove('active'));
  if (!wasActive) el.classList.add('active');
  filters[group] = wasActive ? null : (el.dataset.val || el.textContent.trim().toLowerCase());
  renderGrid();
}

// ── Scoring with word-boundary matching ──
function scoreRecipe(recipe) {
  if (!searchIngredients.length) return 1;
  const keywords = recipe.keywords || [];
  const hits = searchIngredients.filter(searchTerm => {
    return keywords.some(kw => {
      // Exact match or word-starts-with
      if (kw === searchTerm) return true;
      // Only match if search term is at a word boundary (3+ chars)
      if (searchTerm.length >= 3 && kw.startsWith(searchTerm)) return true;
      if (searchTerm.length >= 3 && searchTerm.startsWith(kw)) return true;
      return false;
    });
  }).length;
  return hits / searchIngredients.length;
}

// ── Filtering ──
function getFilteredRecipes() {
  return allRecipes
    .map(r => ({ ...r, _score: scoreRecipe(r) }))
    .filter(r => {
      if (matchMode && searchIngredients.length && r._score === 0) return false;
      if (filters.cat && r.category !== filters.cat) return false;
      if (filters.diff && r.difficulty !== filters.diff) return false;
      if (filters.mood && !(r.mood || []).includes(filters.mood)) return false;
      if (filters.occ && !(r.occasion || []).includes(filters.occ)) return false;
      if (filters.prot) {
        if (filters.prot === 'fleisch') {
          if (!['rind', 'schwein', 'geflügel', 'fleisch', 'wild', 'lamm'].includes(r.protein)) return false;
        } else if (r.protein !== filters.prot) return false;
      }
      if (filters.mine === 'user' && !r._user) return false;
      if (filters.mine === 'cooked' && !cookedSet.has(r.name)) return false;
      if (filters.mine === 'fav' && (ratings[r.name] || 0) < 4) return false;
      if (filters.mine === 'rated' && !ratings[r.name]) return false;
      if (filters.time) {
        const max = parseInt(filters.time) || 9999;
        if (r.time > 0 && r.time > max) return false;
      }
      return true;
    })
    .sort((a, b) => b._score - a._score);
}

// ── Render Grid ──
function renderGrid() {
  const list = getFilteredRecipes();
  document.getElementById('rcount').textContent = list.length + ' Rezept' + (list.length !== 1 ? 'e' : '');
  const grid = document.getElementById('grid');
  const showScore = matchMode && searchIngredients.length > 0;

  if (!list.length) {
    grid.innerHTML = '<div class="nores" role="status">🍽️<br><br>Keine Treffer — Filter anpassen?</div>';
    return;
  }

  // Batch DOM creation instead of innerHTML
  const fragment = document.createDocumentFragment();
  list.forEach((r, i) => {
    const idx = recipeIndexMap.get(r.name + '|' + (r.name_it || ''));
    const card = document.createElement('article');
    card.className = 'card';
    card.tabIndex = 0;
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', esc(r.name));
    card.style.animationDelay = Math.min(i, 20) * 0.03 + 's';

    const emoji = CAT_EMOJI[r.category] || '🍽️';
    const bg = CAT_BG[r.category] || '#f5f5f7';
    const photo = photos[r.name];
    const scorePct = Math.round(r._score * 100);

    card.innerHTML = `
      <div class="cthumb" style="background:${esc(bg)}">
        ${photo ? '<img src="' + esc(photo) + '" alt="' + esc(r.name) + '"><span class="efb" style="opacity:0">' + emoji + '</span>' : '<span class="efb">' + emoji + '</span>'}
      </div>
      <div class="cbody">
        <div class="ccat">${esc(r.category)}</div>
        <div class="ctitle">${esc(r.name)}${r._user ? '<span class="user-badge">Eigenes</span>' : ''}</div>
        <div class="cit">${r.name_it ? '<span lang="it">' + esc(r.name_it) + '</span>' : '&nbsp;'}</div>
        <div class="cmeta">${r.time ? '<span>⏱ ' + r.time + ' Min</span>' : ''}<span>👨‍🍳 ${esc(r.difficulty)}</span></div>
        <div style="display:flex;align-items:center;justify-content:space-between;margin-top:8px">
          ${cookedSet.has(r.name) ? '<span class="badge-cooked">✓ Gekocht</span>' : '<span></span>'}
          ${ratings[r.name] ? '<span style="font-size:13px">' + '⭐'.repeat(ratings[r.name]) + '</span>' : ''}
        </div>
        ${showScore ? '<div class="mrow"><span>' + scorePct + '%</span><div class="mbar"><div class="mfill" style="width:' + scorePct + '%"></div></div></div>' : ''}
      </div>`;

    const openHandler = () => openRecipe(idx);
    card.addEventListener('click', openHandler);
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openHandler(); }
    });
    fragment.appendChild(card);
  });

  grid.innerHTML = '';
  grid.appendChild(fragment);
}

// ── Portion Scaling ──
// Indivisible ingredients: round up for items like eggs, cloves
const INDIVISIBLE = /\b(ei|eier|eigelb|eiweiß|knoblauchzehe|knoblauchzehen|zwiebel|zwiebeln|zitrone|zitronen|lorbeerblatt|lorbeerblätter|brötchen|dose|dosen)\b/i;

function scaleNumber(val, portions, base) {
  const scaled = val * portions / base;
  if (scaled >= 100) return Math.round(scaled / 10) * 10;
  if (scaled >= 10) return Math.round(scaled);
  const rounded = Math.round(scaled * 4) / 4;
  return rounded % 1 === 0 ? rounded : parseFloat(rounded.toFixed(2));
}

function scaleIngredient(ing, portions, base) {
  if (portions === base) return ing;
  const isIndivisible = INDIVISIBLE.test(ing);
  return ing.replace(/^((\d+)\s+)?(\d+)\/(\d+)|^\d+[,.]?\d*/, (m) => {
    const frac = m.match(/^(?:(\d+)\s+)?(\d+)\/(\d+)/);
    let val;
    if (frac) val = (parseInt(frac[1] || 0) + parseInt(frac[2]) / parseInt(frac[3]));
    else val = parseFloat(m.replace(',', '.'));
    if (isNaN(val)) return m;
    if (isIndivisible) return String(Math.ceil(val * portions / base));
    return String(scaleNumber(val, portions, base));
  });
}

function scaleStepText(text, portions, base) {
  if (portions === base) return text;
  const SCALE_UNITS = /^(g|kg|ml|l|cl|dl|EL|TL|Prise|Prisen|Stück|Pkg|Becher|Bund|Scheibe|Scheiben|Tasse|Tassen|Liter)/i;
  const SKIP_UNITS = /^(°|°C|°F|Grad|Min|Std|Stunden|Minuten|Sekunden|cm|mm)/i;
  return text.replace(/((?:\d+\s+)?\d+\/\d+|\d+[,.]?\d*)\s*([A-Za-zäöüÄÖÜß°]*)/g, (match, num, unit) => {
    if (!unit || SKIP_UNITS.test(unit)) return match;
    if (!SCALE_UNITS.test(unit)) return match;
    const frac = num.match(/^(?:(\d+)\s+)?(\d+)\/(\d+)/);
    let val;
    if (frac) val = (parseInt(frac[1] || 0) + parseInt(frac[2]) / parseInt(frac[3]));
    else val = parseFloat(num.replace(',', '.'));
    if (isNaN(val) || val === 0) return match;
    return scaleNumber(val, portions, base) + ' ' + unit;
  });
}

// ── Recipe Detail Modal ──
function renderModal() {
  const r = allRecipes[currentIndex];
  const photo = photos[r.name];
  const emoji = CAT_EMOJI[r.category] || '🍽️';
  const bg = CAT_BG[r.category] || '#f5f5f7';
  const isCookedClass = cookedSet.has(r.name) ? 'done' : '';
  const cookLabel = cookedSet.has(r.name) ? '✓ Schon gekocht' : '👨‍🍳 Gekocht?';

  const mc = document.getElementById('modal-content');
  mc.innerHTML = `
    <div class="mthumb" style="background:${esc(bg)}">
      ${photo ? '<img src="' + esc(photo) + '" alt="' + esc(r.name) + '">' : ''}
      <span class="efb" style="${photo ? 'opacity:0' : ''}">${emoji}</span>
      <button class="photo-btn" id="photo-upload-btn">${photo ? '📷 Foto ändern' : '📷 Foto hinzufügen'}</button>
    </div>
    <div class="mbody">
      <div class="mcat">${esc(r.category)}</div>
      <div class="mtitle">${esc(r.name)}</div>
      ${r.name_it ? '<div class="mit" lang="it">' + esc(r.name_it) + '</div>' : ''}
      <div class="mmeta">
        ${r.time ? '<span>⏱ ' + r.time + ' Min</span>' : ''}
        <span>👨‍🍳 ${esc(r.difficulty)}</span>
        <span>🍽 ${esc(r.servings_label || r.servings + ' Portionen')}</span>
      </div>
      <div class="modal-actions">
        <button class="cook-btn ${isCookedClass}" id="cook-toggle-btn" aria-label="Als gekocht markieren">${cookLabel}</button>
        <div class="modal-stars" role="group" aria-label="Bewertung">
          ${[1, 2, 3, 4, 5].map(i =>
            '<button class="modal-star" data-stars="' + i + '" aria-label="' + i + ' Sterne">' + (ratings[r.name] >= i ? '⭐' : '☆') + '</button>'
          ).join('')}
        </div>
      </div>
      <div class="scaler">
        <div><div class="slbl">Portionen</div><div class="ssub">Basis: ${esc(r.servings_label || r.servings + ' Portionen')}</div></div>
        <div class="sctrl">
          <button class="sbtn" id="portion-minus" aria-label="Weniger Portionen" ${currentPortions <= 1 ? 'disabled' : ''}>−</button>
          <div class="sval" aria-live="polite">${currentPortions}</div>
          <button class="sbtn" id="portion-plus" aria-label="Mehr Portionen" ${currentPortions >= 20 ? 'disabled' : ''}>+</button>
        </div>
      </div>
      <div class="sh">Zutaten</div>
      <ul class="ilist">${(r.ingredients || []).map(i => '<li class="ii"><span>' + esc(scaleIngredient(i, currentPortions, basePortions)) + '</span></li>').join('')}</ul>
      <div class="sh">Zubereitung</div>
      ${(r.steps || []).map((s, i) => '<div class="step"><div class="snum">' + (i + 1) + '</div><div class="stxt">' + esc(scaleStepText(s, currentPortions, basePortions)) + '</div></div>').join('')}
      ${r.tips ? '<div class="tip"><div class="tlbl">Tipp</div><p>' + esc(r.tips) + '</p></div>' : ''}
    </div>`;

  // Event listeners (no inline onclick)
  mc.querySelector('#photo-upload-btn')?.addEventListener('click', () => uploadPhoto(r.name));
  mc.querySelector('#cook-toggle-btn')?.addEventListener('click', toggleCooked);
  mc.querySelector('#portion-minus')?.addEventListener('click', () => changePortions(-1));
  mc.querySelector('#portion-plus')?.addEventListener('click', () => changePortions(1));
  mc.querySelectorAll('.modal-star').forEach(btn => {
    btn.addEventListener('click', () => setRating(parseInt(btn.dataset.stars)));
  });
}

function openRecipe(idx) {
  currentIndex = idx;
  const r = allRecipes[idx];
  currentPortions = r.servings;
  basePortions = r.servings;
  renderModal();
  document.getElementById('recipe-overlay').classList.add('open');
  document.body.style.overflow = 'hidden';
  // Focus trap: focus close button
  document.getElementById('modal-close-btn').focus();
}

function closeRecipeModal() {
  document.getElementById('recipe-overlay').classList.remove('open');
  document.body.style.overflow = '';
}

function changePortions(delta) {
  const next = currentPortions + delta;
  if (next < 1 || next > 20) return;
  currentPortions = next;
  renderModal();
}

function toggleCooked() {
  const name = allRecipes[currentIndex].name;
  if (cookedSet.has(name)) cookedSet.delete(name); else cookedSet.add(name);
  storageSet('cucina_cooked', [...cookedSet]);
  renderModal();
  renderGrid();
}

function setRating(stars) {
  const name = allRecipes[currentIndex].name;
  ratings[name] = ratings[name] === stars ? 0 : stars;
  storageSet('cucina_ratings', ratings);
  renderModal();
  renderGrid();
}

// ── Photo Upload ──
function compressImage(src, maxW, maxH, quality, callback) {
  const img = new Image();
  img.onload = () => {
    const scale = Math.min(1, maxW / img.width, maxH / img.height);
    const w = Math.round(img.width * scale);
    const h = Math.round(img.height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    canvas.getContext('2d').drawImage(img, 0, 0, w, h);
    callback(canvas.toDataURL('image/jpeg', quality));
  };
  img.src = src;
}

function uploadPhoto(name) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      compressImage(ev.target.result, 800, 500, 0.75, async (data) => {
        try {
          await PhotoDB.set(name, data);
          photos[name] = data;
          renderModal();
          renderGrid();
        } catch (err) {
          console.error('Foto konnte nicht gespeichert werden:', err);
        }
      });
    };
    reader.readAsDataURL(file);
  });
  input.click();
}

// ── Add Recipe Modal ──
let pendingMdData = null;
let pendingPhoto = null;

function openAddModal() {
  document.getElementById('add-overlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeAddModal() {
  document.getElementById('add-overlay').classList.remove('open');
  document.body.style.overflow = '';
  pendingMdData = null;
  pendingPhoto = null;
}

function switchAddTab(id, el) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('on'));
  el.classList.add('on');
  document.getElementById('tab-manual').style.display = id === 'manual' ? 'block' : 'none';
  document.getElementById('tab-md').style.display = id === 'md' ? 'block' : 'none';
}

function previewNewPhoto(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    compressImage(ev.target.result, 800, 500, 0.75, (data) => {
      pendingPhoto = data;
      document.getElementById('photo-preview-img').src = data;
      document.getElementById('photo-preview').style.display = 'block';
      document.getElementById('photo-drop').textContent = '📷 Anderes Foto wählen';
    });
  };
  reader.readAsDataURL(file);
}

function parseMd(text) {
  const lines = text.split(/\r?\n/);
  let name = '', nameit = '', sv = 4, diff = 'Mittel', ings = [], steps = [], tip = '';
  let section = '';
  for (const l of lines) {
    const t = l.trim();
    if (!t) continue;
    if (t.startsWith('# ')) { name = t.slice(2).trim(); continue; }
    if (t.startsWith('*') && t.endsWith('*') && !t.startsWith('**')) { nameit = t.replace(/\*/g, '').trim(); continue; }
    if (/^##\s*(Zutaten|Ingredients)/i.test(t)) { section = 'ing'; continue; }
    if (/^##\s*(Zubereitung|Anleitung|Steps|Schritte)/i.test(t)) { section = 'steps'; continue; }
    if (/^##\s*(Tipp|Hinweis|Note)/i.test(t)) { section = 'tip'; continue; }
    if (t.startsWith('#')) { section = ''; continue; }
    if (/Portionen|Personen/i.test(t)) { const m = t.match(/(\d+)/); if (m) sv = parseInt(m[1]); }
    if (/Schwierigkeit/i.test(t)) {
      if (/schwer/i.test(t)) diff = 'Schwer';
      else if (/einfach/i.test(t)) diff = 'Einfach';
      else diff = 'Mittel';
    }
    if (section === 'ing' && (t.startsWith('-') || t.startsWith('*') || /^\d/.test(t))) {
      ings.push(t.replace(/^[-*\d.]+\s*/, ''));
    } else if (section === 'steps') {
      steps.push(t.replace(/^\d+\.\s*/, '').replace(/^[-*]\s*/, ''));
    } else if (section === 'tip') {
      tip += t + ' ';
    }
  }
  return { name, nameit, sv, diff, ings, steps, tip: tip.trim() };
}

function loadMdFile(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    const text = e.target.result;
    document.getElementById('md-preview').textContent = text.substring(0, 600) + (text.length > 600 ? '...' : '');
    document.getElementById('md-preview').style.display = 'block';
    pendingMdData = parseMd(text);
    document.getElementById('md-name').value = pendingMdData.name;
    document.getElementById('md-sv').value = pendingMdData.sv;
    const dc = document.getElementById('md-diff');
    [...dc.options].forEach(o => { if (o.value === pendingMdData.diff) o.selected = true; });
    document.getElementById('md-parsed').style.display = 'block';
  };
  reader.readAsText(file, 'UTF-8');
}

function buildRecipeObj(name, nameit, cat, diff, sv, prep, cook, ingLines, stepLines, tip) {
  const totalTime = prep + cook;
  return {
    name, name_it: nameit, category: cat, servings: sv,
    servings_label: sv + ' Portionen', prep, cook, time: totalTime,
    difficulty: diff, ingredients: ingLines,
    keywords: extractKeywords(ingLines),
    protein: detectProtein(name, cat, ingLines),
    mood: detectMood(cat, diff, totalTime),
    occasion: detectOccasion(diff, totalTime, sv),
    steps: stepLines, tips: tip || null,
    _user: true
  };
}

async function saveRecipe() {
  const isMd = document.getElementById('tab-md').style.display !== 'none';
  let rec;
  if (isMd) {
    if (!pendingMdData || !pendingMdData.ings.length) { alert('Bitte zuerst eine Markdown-Datei laden.'); return; }
    const name = document.getElementById('md-name').value.trim();
    if (!name) { alert('Name fehlt.'); return; }
    rec = buildRecipeObj(
      name, pendingMdData.nameit,
      document.getElementById('md-cat').value,
      document.getElementById('md-diff').value,
      parseInt(document.getElementById('md-sv').value) || 4,
      0, 0, pendingMdData.ings, pendingMdData.steps, pendingMdData.tip
    );
  } else {
    const name = document.getElementById('f-name').value.trim();
    if (!name) { alert('Name fehlt.'); return; }
    const ingLines = document.getElementById('f-ing').value.split('\n').map(s => s.trim()).filter(Boolean);
    if (!ingLines.length) { alert('Bitte mindestens eine Zutat eingeben.'); return; }
    const stepLines = document.getElementById('f-steps').value.split('\n').map(s => s.trim()).filter(Boolean);
    rec = buildRecipeObj(
      name, document.getElementById('f-nameit').value.trim(),
      document.getElementById('f-cat').value,
      document.getElementById('f-diff').value,
      parseInt(document.getElementById('f-sv').value) || 4,
      parseInt(document.getElementById('f-prep').value) || 0,
      parseInt(document.getElementById('f-cook').value) || 0,
      ingLines, stepLines,
      document.getElementById('f-tip').value.trim()
    );
  }

  userRecipes.push(rec);
  storageSet('cucina_user', userRecipes);

  if (pendingPhoto) {
    try {
      await PhotoDB.set(rec.name, pendingPhoto);
      photos[rec.name] = pendingPhoto;
    } catch (err) {
      console.error('Foto konnte nicht gespeichert werden:', err);
    }
    pendingPhoto = null;
  }

  allRecipes = [...builtInRecipes, ...userRecipes];
  rebuildIndex();
  closeAddModal();
  renderGrid();
  document.getElementById('nav-count').textContent = allRecipes.length + ' Rezepte';
}

// ── Event Listeners (no inline onclick) ──
document.addEventListener('DOMContentLoaded', () => {
  // Search
  document.getElementById('ingredient-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addIngredient();
  });
  document.getElementById('add-ing-btn').addEventListener('click', addIngredient);
  document.getElementById('match-btn').addEventListener('click', startMatch);

  // Filter chips
  document.querySelectorAll('.chip').forEach(chip => {
    const group = ['cat', 'diff', 'time', 'mood', 'occ', 'prot', 'mine'].find(g => chip.classList.contains(g));
    if (group) {
      chip.tabIndex = 0;
      chip.setAttribute('role', 'button');
      chip.addEventListener('click', () => handleChipClick(chip, group));
      chip.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleChipClick(chip, group); }
      });
    }
  });

  // FAB
  document.getElementById('fab-add').addEventListener('click', openAddModal);

  // Add modal
  document.getElementById('add-overlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeAddModal();
  });
  document.getElementById('cancel-add-btn').addEventListener('click', closeAddModal);
  document.getElementById('save-recipe-btn').addEventListener('click', saveRecipe);

  // Tab switching
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => switchAddTab(tab.dataset.tab, tab));
  });

  // MD upload
  document.getElementById('md-file').addEventListener('change', function () { loadMdFile(this); });
  document.getElementById('md-drop-zone').addEventListener('click', () => document.getElementById('md-file').click());

  // Photo upload in add form
  document.getElementById('f-photo').addEventListener('change', function () { previewNewPhoto(this); });
  document.getElementById('photo-drop').addEventListener('click', () => document.getElementById('f-photo').click());

  // Recipe detail modal
  document.getElementById('recipe-overlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeRecipeModal();
  });
  document.getElementById('modal-close-btn').addEventListener('click', closeRecipeModal);

  // Escape key closes modals
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (document.getElementById('add-overlay').classList.contains('open')) {
        closeAddModal();
      } else if (document.getElementById('recipe-overlay').classList.contains('open')) {
        closeRecipeModal();
      }
    }
  });

  // Load data
  loadRecipes();
});
