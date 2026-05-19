(function () {
  'use strict';

  // ─── State ──────────────────────────────────────────────────
  let items = [];
  let currentIndex = 0;
  let votedIds = new Set();
  let totalItemCount = 0;
  let isAnimating = false;
  let activeHammer = null;
  let currentSort = 'popular';
  const sessionId = getOrCreateSessionId();

  // ─── DOM ────────────────────────────────────────────────────
  const els = {
    cardContainer: document.getElementById('card-container'),
    endOfDeck:     document.getElementById('end-of-deck'),
    swipeView:     document.getElementById('swipe-view'),
    resultsView:   document.getElementById('results-view'),
    resultsList:   document.getElementById('results-list'),
    loadingOverlay:document.getElementById('loading-overlay'),
    btnNo:         document.getElementById('btn-no'),
    btnYes:        document.getElementById('btn-yes'),
    btnSeeResults: document.getElementById('btn-see-results'),
    btnBack:       document.getElementById('btn-back'),
    tabSwipe:      document.getElementById('tab-swipe'),
    tabResults:    document.getElementById('tab-results'),
    sortPopular:   document.getElementById('sort-popular'),
    sortDivisive:  document.getElementById('sort-divisive'),
    buttonRow:     document.getElementById('button-row'),
    progressText:  document.getElementById('progress-text'),
    progressFill:  document.getElementById('progress-fill')
  };

  // ─── Session ────────────────────────────────────────────────
  function getOrCreateSessionId() {
    let id = localStorage.getItem('lunchRoulette_sessionId_v3');
    if (!id) {
      id = crypto.randomUUID
        ? crypto.randomUUID()
        : 'id-' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
      localStorage.setItem('lunchRoulette_sessionId_v3', id);
    }
    return id;
  }

  // ─── Init ───────────────────────────────────────────────────
  async function init() {
    showLoading(true);
    try {
      const [itemsRes, votedRes] = await Promise.all([
        fetch('/items'),
        fetch('/voted/' + sessionId)
      ]);
      if (!itemsRes.ok) throw new Error('Failed to fetch items');

      const allItems = await itemsRes.json();
      const voted = votedRes.ok ? await votedRes.json() : [];

      totalItemCount = allItems.length;
      votedIds = new Set(voted.map(v => v.food_id));

      items = allItems.filter(i => !votedIds.has(i.id));
      shuffle(items);

      // Preload first batch of images, then render
      await preloadBatch(0, 5);
      renderInitialCards();
      updateProgress();
      preloadBatch(3, 8); // preload more in background
    } catch (err) {
      console.error('Init error:', err);
      els.cardContainer.innerHTML =
        '<div style="text-align:center;padding:40px;color:rgba(255,255,255,0.5)">' +
        '<p style="font-size:16px;margin-bottom:10px">😕</p>' +
        '<p style="font-size:13px">Failed to load dishes.</p>' +
        '<button onclick="location.reload()" style="margin-top:14px;padding:10px 20px;background:#1c1c1e;border-radius:10px;color:#fff;font-weight:500;font-size:13px;cursor:pointer;border:none">Retry</button></div>';
    } finally {
      showLoading(false);
    }
  }

  // ─── Utilities ──────────────────────────────────────────────
  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
  }

  function showLoading(show) {
    if (show) {
      els.loadingOverlay.classList.remove('hidden');
      els.loadingOverlay.style.opacity = '1';
    } else {
      els.loadingOverlay.style.opacity = '0';
      setTimeout(() => els.loadingOverlay.classList.add('hidden'), 300);
    }
  }

  function escapeHtml(s) {
    const d = document.createElement('div');
    d.textContent = s || '';
    return d.innerHTML;
  }

  // Preload images so cards render instantly
  const imageCache = new Set();
  function preloadBatch(startOffset, endOffset) {
    const promises = [];
    for (let i = currentIndex + startOffset; i < Math.min(currentIndex + endOffset, items.length); i++) {
      const url = items[i].image_url;
      if (imageCache.has(url)) continue;
      promises.push(new Promise(resolve => {
        const img = new Image();
        img.onload = img.onerror = () => { imageCache.add(url); resolve(); };
        img.src = url;
      }));
    }
    return Promise.all(promises);
  }

  function updateProgress() {
    const rated = votedIds.size + currentIndex;
    els.progressText.textContent = rated + ' / ' + totalItemCount + ' dishes rated';
    els.progressFill.style.width = (totalItemCount > 0 ? (rated / totalItemCount) * 100 : 0) + '%';
  }

  // ─── Card Building ─────────────────────────────────────────
  function buildCard(itemIndex, stackClass) {
    const item = items[itemIndex];
    const el = document.createElement('div');
    el.className = 'food-card ' + stackClass;
    el.dataset.itemIndex = itemIndex;
    el.style.backgroundImage = 'url(' + item.image_url + ')';
    el.innerHTML =
      '<div class="tint-yes"></div>' +
      '<div class="tint-no"></div>' +
      '<div class="card-gradient"></div>' +
      '<div class="stamp stamp-yes">✓ YES</div>' +
      '<div class="stamp stamp-no">✗ NO</div>' +
      '<div class="card-info">' +
        '<h2>' + escapeHtml(item.name) + '</h2>' +
        '<div class="badges">' +
          '<span class="badge">' + escapeHtml(item.category) + '</span>' +
          '<span class="badge">' + escapeHtml(item.area) + '</span>' +
        '</div>' +
      '</div>';
    return el;
  }

  // ─── Initial Render ────────────────────────────────────────
  function renderInitialCards() {
    // Clear any existing cards
    els.cardContainer.querySelectorAll('.food-card').forEach(c => c.remove());

    if (currentIndex >= items.length) {
      showEndOfDeck();
      return;
    }

    els.endOfDeck.classList.add('hidden');
    els.buttonRow.classList.remove('hidden');

    const count = Math.min(3, items.length - currentIndex);

    // Insert back-to-front so card-1 is last in DOM (on top)
    for (let i = count - 1; i >= 0; i--) {
      const card = buildCard(currentIndex + i, 'card-' + (i + 1));
      els.cardContainer.appendChild(card);
    }

    // Attach swipe to top card
    const top = els.cardContainer.querySelector('.card-1');
    if (top) attachSwipe(top);
  }

  function showEndOfDeck() {
    els.endOfDeck.classList.remove('hidden');
    els.buttonRow.classList.add('hidden');
  }

  // ─── Swipe Handler ─────────────────────────────────────────
  function attachSwipe(cardEl) {
    if (activeHammer) { activeHammer.destroy(); activeHammer = null; }

    const mc = new Hammer.Manager(cardEl, { touchAction: 'pan-y' });
    mc.add(new Hammer.Pan({ direction: Hammer.DIRECTION_HORIZONTAL, threshold: 8 }));
    activeHammer = mc;

    const tintY = cardEl.querySelector('.tint-yes');
    const tintN = cardEl.querySelector('.tint-no');
    const stmpY = cardEl.querySelector('.stamp-yes');
    const stmpN = cardEl.querySelector('.stamp-no');

    mc.on('panstart', () => {
      cardEl.classList.add('dragging');
    });

    mc.on('panmove', e => {
      if (isAnimating) return;
      const dx = e.deltaX;
      const rot = dx / 18;
      cardEl.style.transform = 'translateX(' + dx + 'px) rotate(' + rot + 'deg)';

      const prog = Math.min(Math.abs(dx) / 120, 1);
      if (dx > 0) {
        tintY.style.opacity = prog * 0.35;
        tintN.style.opacity = 0;
        stmpY.style.opacity = dx > 40 ? prog : 0;
        stmpN.style.opacity = 0;
      } else {
        tintN.style.opacity = prog * 0.35;
        tintY.style.opacity = 0;
        stmpN.style.opacity = dx < -40 ? prog : 0;
        stmpY.style.opacity = 0;
      }
    });

    mc.on('panend', e => {
      if (isAnimating) return;
      cardEl.classList.remove('dragging');

      if (Math.abs(e.deltaX) > 80) {
        const dir = e.deltaX > 0 ? 'right' : 'left';
        flyAndAdvance(cardEl, dir);
      } else {
        // Snap back
        cardEl.style.transition = 'transform 0.3s cubic-bezier(.17,.88,.32,1.28)';
        cardEl.style.transform = '';
        tintY.style.opacity = 0; tintN.style.opacity = 0;
        stmpY.style.opacity = 0; stmpN.style.opacity = 0;
        setTimeout(() => { cardEl.style.transition = ''; }, 300);
      }
    });
  }

  // ─── Advance Card (the core performance fix) ───────────────
  function flyAndAdvance(cardEl, direction) {
    isAnimating = true;

    // Vote (fire-and-forget)
    const item = items[currentIndex];
    commitVote(item.id, direction === 'right' ? 'yes' : 'no');

    // Destroy swipe on outgoing card
    if (activeHammer) { activeHammer.destroy(); activeHammer = null; }

    // Fly out using inline style (faster than class-based animation)
    const tx = direction === 'right' ? '120%' : '-120%';
    const rot = direction === 'right' ? '18deg' : '-18deg';
    cardEl.style.transition = 'transform 0.25s ease-out, opacity 0.2s ease-out';
    cardEl.style.transform = 'translateX(' + tx + ') rotate(' + rot + ')';
    cardEl.style.opacity = '0';

    setTimeout(() => {
      cardEl.remove();
      currentIndex++;
      updateProgress();

      if (currentIndex >= items.length) {
        showEndOfDeck();
        isAnimating = false;
        return;
      }

      // Promote existing cards (card-2 → card-1, card-3 → card-2)
      const c2 = els.cardContainer.querySelector('.card-2');
      const c3 = els.cardContainer.querySelector('.card-3');
      if (c2) { c2.className = 'food-card card-1'; attachSwipe(c2); }
      if (c3) { c3.className = 'food-card card-2'; }

      // Add new card at back of stack
      const backIdx = currentIndex + 2;
      if (backIdx < items.length) {
        const newCard = buildCard(backIdx, 'card-3');
        // Insert as first child so it's behind in DOM stacking
        els.cardContainer.insertBefore(newCard, els.cardContainer.firstChild);
      }

      // Preload upcoming images
      preloadBatch(3, 6);
      isAnimating = false;
    }, 260); // Slightly longer than the 250ms transition
  }

  // ─── Vote ───────────────────────────────────────────────────
  async function commitVote(itemId, choice) {
    try {
      await fetch('/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId, choice, sessionId })
      });
    } catch (err) {
      console.error('Vote failed:', err);
    }
  }

  // ─── Button Voting ─────────────────────────────────────────
  els.btnYes.addEventListener('click', () => {
    if (isAnimating || currentIndex >= items.length) return;
    const top = els.cardContainer.querySelector('.card-1');
    if (top) flyAndAdvance(top, 'right');
  });

  els.btnNo.addEventListener('click', () => {
    if (isAnimating || currentIndex >= items.length) return;
    const top = els.cardContainer.querySelector('.card-1');
    if (top) flyAndAdvance(top, 'left');
  });

  // ─── Navigation ─────────────────────────────────────────────
  function showSwipeView() {
    els.swipeView.classList.remove('hidden');
    els.resultsView.classList.add('hidden');
    els.tabSwipe.classList.add('active');
    els.tabResults.classList.remove('active');
  }

  function showResultsView() {
    els.swipeView.classList.add('hidden');
    els.resultsView.classList.remove('hidden');
    els.tabSwipe.classList.remove('active');
    els.tabResults.classList.add('active');
    loadResults();
  }

  els.tabSwipe.addEventListener('click', showSwipeView);
  els.tabResults.addEventListener('click', showResultsView);
  els.btnBack.addEventListener('click', showSwipeView);
  els.btnSeeResults.addEventListener('click', showResultsView);

  // ─── Results ────────────────────────────────────────────────
  let currentResults = [];

  async function loadResults() {
    els.resultsList.innerHTML =
      '<div style="text-align:center;padding:40px;color:rgba(255,255,255,0.4)"><div class="spinner" style="margin:0 auto 10px"></div>Loading…</div>';
    try {
      const res = await fetch('/results');
      if (!res.ok) throw new Error('bad');
      currentResults = await res.json();
      renderResults();
    } catch (e) {
      els.resultsList.innerHTML =
        '<div style="text-align:center;padding:40px;color:rgba(255,59,48,0.7)">Failed to load results.</div>';
    }
  }

  function renderResults() {
    els.resultsList.innerHTML = '';

    // Filter to voted items only
    let list = currentResults.filter(i => (i.yes_count + i.no_count) > 0);

    if (currentSort === 'popular') {
      list.sort((a, b) => b.yes_pct - a.yes_pct);
    } else {
      list.sort((a, b) => Math.abs(a.yes_pct - 50) - Math.abs(b.yes_pct - 50));
    }

    if (list.length === 0) {
      els.resultsList.innerHTML =
        '<div style="text-align:center;padding:40px;color:rgba(255,255,255,0.4);font-size:13px">No votes yet. Start swiping!</div>';
      return;
    }

    list.forEach((item, idx) => {
      const total = item.yes_count + item.no_count;
      const pct = item.yes_pct;
      const li = document.createElement('li');
      li.className = 'result-item';
      li.innerHTML =
        '<div class="result-rank">#' + (idx + 1) + '</div>' +
        '<img src="' + item.image_url + '" class="result-thumb" alt="' + escapeHtml(item.name) + '" loading="lazy">' +
        '<div class="result-info">' +
          '<div class="result-name-row">' +
            '<span class="result-name">' + escapeHtml(item.name) + '</span>' +
            '<span class="result-badge">' + escapeHtml(item.category) + '</span>' +
          '</div>' +
          '<div class="result-bar-track">' +
            '<div class="result-bar-fill" data-width="' + pct + '" style="width:0%"></div>' +
          '</div>' +
          '<div class="result-meta">' +
            '<span class="result-pct">' + pct + '% YES</span>' +
            '<span class="result-votes">' + total + ' vote' + (total !== 1 ? 's' : '') + '</span>' +
          '</div>' +
        '</div>';
      els.resultsList.appendChild(li);
    });

    // Staggered bar animation with color coding
    const fills = els.resultsList.querySelectorAll('.result-bar-fill');
    fills.forEach((fill, i) => {
      const w = parseFloat(fill.getAttribute('data-width'));
      // Color-code by approval
      if (w >= 70) fill.style.background = '#4eff8c';
      else if (w >= 40) fill.style.background = '#ffd60a';
      else fill.style.background = '#ff4f4f';
      setTimeout(() => { fill.style.width = w + '%'; }, i * 30);
    });
  }

  els.sortPopular.addEventListener('click', () => {
    currentSort = 'popular';
    els.sortPopular.classList.add('active');
    els.sortDivisive.classList.remove('active');
    renderResults();
  });

  els.sortDivisive.addEventListener('click', () => {
    currentSort = 'divisive';
    els.sortDivisive.classList.add('active');
    els.sortPopular.classList.remove('active');
    renderResults();
  });

  // ─── Start ──────────────────────────────────────────────────
  init();
})();
