(function () {
  // ─── State ──────────────────────────────────────────────────
  var items = [];
  var currentIndex = 0;
  var votedIds = new Set();
  var sessionId = getOrCreateSessionId();
  var currentSort = 'popular';
  var isVoting = false;
  var totalItemCount = 0; // Total foods in DB (for progress)

  // ─── DOM Elements ───────────────────────────────────────────
  var els = {
    cardContainer: document.getElementById('card-container'),
    endOfDeck: document.getElementById('end-of-deck'),
    swipeView: document.getElementById('swipe-view'),
    resultsView: document.getElementById('results-view'),
    resultsList: document.getElementById('results-list'),
    loadingOverlay: document.getElementById('loading-overlay'),
    btnNo: document.getElementById('btn-no'),
    btnYes: document.getElementById('btn-yes'),
    btnSeeResults: document.getElementById('btn-see-results'),
    btnBack: document.getElementById('btn-back'),
    tabSwipe: document.getElementById('tab-swipe'),
    tabResults: document.getElementById('tab-results'),
    sortPopular: document.getElementById('sort-popular'),
    sortDivisive: document.getElementById('sort-divisive'),
    buttonRow: document.getElementById('button-row'),
    progressText: document.getElementById('progress-text'),
    progressFill: document.getElementById('progress-fill')
  };

  // ─── Session ID ─────────────────────────────────────────────
  function getOrCreateSessionId() {
    var id = localStorage.getItem('lunchRoulette_sessionId');
    if (!id) {
      id = crypto.randomUUID
        ? crypto.randomUUID()
        : 'id-' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
      localStorage.setItem('lunchRoulette_sessionId', id);
    }
    return id;
  }

  // ─── Init ───────────────────────────────────────────────────
  async function init() {
    showLoading(true);
    try {
      var itemsRes = await fetch('/items');
      var votedRes = await fetch('/voted/' + sessionId);

      if (!itemsRes.ok) throw new Error('Failed to fetch items');

      var allItems = await itemsRes.json();
      var voted = votedRes.ok ? await votedRes.json() : [];

      totalItemCount = allItems.length;
      votedIds = new Set(voted.map(function(v) { return v.food_id; }));

      // Filter out already-voted items
      items = allItems.filter(function(i) { return !votedIds.has(i.id); });

      // Shuffle for variety
      shuffleArray(items);

      updateProgress();
      renderTopCards();
      preloadImages();
    } catch (err) {
      console.error('Init error:', err);
      els.cardContainer.innerHTML =
        '<div style="text-align:center;padding:40px;color:var(--text-secondary)">' +
        '<p style="font-size:18px;margin-bottom:12px">😕</p>' +
        '<p>Failed to load dishes.</p>' +
        '<button onclick="location.reload()" style="margin-top:16px;padding:10px 24px;' +
        'background:var(--surface-elevated);border-radius:12px;color:var(--text-primary);' +
        'font-weight:600;cursor:pointer;border:none">Retry</button></div>';
    } finally {
      showLoading(false);
    }
  }

  // ─── Utilities ──────────────────────────────────────────────
  function shuffleArray(array) {
    for (var i = array.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var temp = array[i];
      array[i] = array[j];
      array[j] = temp;
    }
  }

  function showLoading(show) {
    if (show) {
      els.loadingOverlay.classList.remove('hidden');
      els.loadingOverlay.style.opacity = '1';
    } else {
      els.loadingOverlay.style.opacity = '0';
      setTimeout(function() {
        els.loadingOverlay.classList.add('hidden');
      }, 400);
    }
  }

  function preloadImages() {
    var end = Math.min(currentIndex + 4, items.length);
    for (var i = currentIndex; i < end; i++) {
      var img = new Image();
      img.src = items[i].image_url;
    }
  }

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
  }

  // ─── Progress Indicator (Section 5) ─────────────────────────
  function updateProgress() {
    var rated = votedIds.size + currentIndex;
    els.progressText.textContent = rated + ' / ' + totalItemCount + ' dishes rated';
    var pct = totalItemCount > 0 ? (rated / totalItemCount) * 100 : 0;
    els.progressFill.style.width = pct + '%';
  }

  // ─── Card Rendering (Section 3) ─────────────────────────────
  function renderTopCards() {
    // Remove only food-card elements, keep end-of-deck
    var existingCards = els.cardContainer.querySelectorAll('.food-card');
    existingCards.forEach(function(c) { c.remove(); });

    if (currentIndex >= items.length) {
      // Section 4 — End of deck state
      els.endOfDeck.classList.remove('hidden');
      els.buttonRow.classList.add('hidden');
      return;
    }

    els.endOfDeck.classList.add('hidden');
    els.buttonRow.classList.remove('hidden');

    // Render up to 3 cards for stack depth (Section 3)
    var count = Math.min(3, items.length - currentIndex);

    // Render in reverse so top card (card-1) is last in DOM → visually on top
    for (var i = count - 1; i >= 0; i--) {
      var item = items[currentIndex + i];
      var cardEl = document.createElement('div');
      cardEl.className = 'food-card card-' + (i + 1);
      cardEl.style.backgroundImage = 'url(' + item.image_url + ')';

      cardEl.innerHTML =
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

      els.cardContainer.appendChild(cardEl);

      // Top card gets swipe handler
      if (i === 0) {
        attachSwipeHandler(cardEl, item);
      }
    }

    preloadImages();
  }

  // ─── Hammer.js Swipe Logic (Section 2) ──────────────────────
  function attachSwipeHandler(cardEl, item) {
    var hammer = new Hammer(cardEl);
    hammer.get('pan').set({ direction: Hammer.DIRECTION_HORIZONTAL });

    var tintYes = cardEl.querySelector('.tint-yes');
    var tintNo = cardEl.querySelector('.tint-no');
    var stampYes = cardEl.querySelector('.stamp-yes');
    var stampNo = cardEl.querySelector('.stamp-no');

    hammer.on('pan', function(e) {
      if (isVoting) return;

      // Section 2.1 — Rotation + translation
      var rotation = e.deltaX / 20;
      cardEl.style.transform = 'translateX(' + e.deltaX + 'px) rotate(' + rotation + 'deg)';

      // Section 2.2 — Colored overlay, max opacity 0.4 at 120px
      var progress = Math.min(Math.abs(e.deltaX) / 120, 1);

      if (e.deltaX > 0) {
        tintYes.style.opacity = progress * 0.4;
        tintNo.style.opacity = 0;
        // Section 2.3 — Show "✓ YES" stamp after 40px drag right (top-right)
        stampYes.style.opacity = e.deltaX > 40 ? progress : 0;
        stampNo.style.opacity = 0;
      } else {
        tintNo.style.opacity = progress * 0.4;
        tintYes.style.opacity = 0;
        // Section 2.3 — Show "✗ NO" stamp after 40px drag left (top-left)
        stampNo.style.opacity = e.deltaX < -40 ? progress : 0;
        stampYes.style.opacity = 0;
      }
    });

    hammer.on('panend', function(e) {
      if (isVoting) return;

      // Section 2.4 — Commit if > 80px, else snap back
      if (Math.abs(e.deltaX) > 80) {
        var choice = e.deltaX > 0 ? 'yes' : 'no';
        var dir = e.deltaX > 0 ? 'right' : 'left';
        commitVote(item.id, choice);
        animateCardOut(cardEl, dir);
      } else {
        // Section 2.4 — Spring snap-back
        snapBack(cardEl, stampYes, stampNo, tintYes, tintNo);
      }
    });
  }

  function animateCardOut(cardEl, direction) {
    cardEl.classList.add(direction === 'right' ? 'fly-out-right' : 'fly-out-left');
    cardEl.addEventListener('animationend', function() {
      currentIndex++;
      updateProgress(); // Section 5 — Update counter after every swipe
      renderTopCards();
    });
  }

  // Section 2.4 — Spring animation snap-back
  function snapBack(cardEl, stampYes, stampNo, tintYes, tintNo) {
    cardEl.style.transition = 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
    cardEl.style.transform = 'translateX(0) rotate(0deg)';
    stampYes.style.opacity = 0;
    stampNo.style.opacity = 0;
    tintYes.style.opacity = 0;
    tintNo.style.opacity = 0;
    // Remove transition after snap-back so drag feels direct
    setTimeout(function() {
      cardEl.style.transition = '';
    }, 300);
  }

  // ─── Voting ─────────────────────────────────────────────────
  async function commitVote(itemId, choice) {
    if (isVoting) return;
    isVoting = true;
    els.btnYes.disabled = true;
    els.btnNo.disabled = true;

    try {
      var res = await fetch('/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId: itemId, choice: choice, sessionId: sessionId })
      });
      if (!res.ok) {
        console.error('Vote response not OK:', res.status);
      }
    } catch (err) {
      console.error('Vote failed:', err);
    } finally {
      isVoting = false;
      els.btnYes.disabled = false;
      els.btnNo.disabled = false;
    }
  }

  // ─── Button Fallbacks ──────────────────────────────────────
  els.btnYes.addEventListener('click', function() {
    if (currentIndex >= items.length || isVoting) return;
    var item = items[currentIndex];
    var topCard = els.cardContainer.querySelector('.card-1');
    if (topCard) {
      commitVote(item.id, 'yes');
      animateCardOut(topCard, 'right');
    }
  });

  els.btnNo.addEventListener('click', function() {
    if (currentIndex >= items.length || isVoting) return;
    var item = items[currentIndex];
    var topCard = els.cardContainer.querySelector('.card-1');
    if (topCard) {
      commitVote(item.id, 'no');
      animateCardOut(topCard, 'left');
    }
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

  // ─── Results (Section 1) ────────────────────────────────────
  var currentResults = [];

  async function loadResults() {
    els.resultsList.innerHTML =
      '<div style="text-align:center;padding:40px;color:var(--text-secondary)"><div class="spinner" style="margin:0 auto 12px"></div>Loading results...</div>';
    try {
      var res = await fetch('/results');
      if (!res.ok) throw new Error('Failed to fetch results');
      currentResults = await res.json();
      renderResultsList();
    } catch (err) {
      console.error('Failed to load results:', err);
      els.resultsList.innerHTML =
        '<div style="text-align:center;padding:40px;color:var(--accent-red)">Failed to load results. Try again.</div>';
    }
  }

  function renderResultsList() {
    els.resultsList.innerHTML = '';

    // Section 1 — Filter out items with 0 total votes
    var voted = currentResults.filter(function(item) {
      return (item.yes_count + item.no_count) > 0;
    });

    // Sort
    var sorted = voted.slice();
    if (currentSort === 'popular') {
      sorted.sort(function(a, b) { return b.yes_pct - a.yes_pct; });
    } else {
      // Section 1 — Most Divisive: closest yes_pct to 50
      sorted.sort(function(a, b) {
        return Math.abs(a.yes_pct - 50) - Math.abs(b.yes_pct - 50);
      });
    }

    if (sorted.length === 0) {
      els.resultsList.innerHTML =
        '<div style="text-align:center;padding:40px;color:var(--text-secondary)">No votes yet. Start swiping!</div>';
      return;
    }

    sorted.forEach(function(item, idx) {
      var total = item.yes_count + item.no_count;

      var li = document.createElement('li');
      li.className = 'result-row';
      li.innerHTML =
        '<img src="' + item.image_url + '" class="result-thumb" alt="' + escapeHtml(item.name) + '" loading="lazy">' +
        '<div class="result-info">' +
          '<div class="result-name">' + escapeHtml(item.name) +
            '<span class="result-badge">' + escapeHtml(item.category) + '</span>' +
          '</div>' +
          '<div class="progress-track">' +
            '<div class="progress-fill" style="width: 0%"></div>' +
          '</div>' +
          '<div class="result-stats">' +
            '<span class="result-pct">' + item.yes_pct + '% YES</span>' +
            '<span>' + total + ' vote' + (total !== 1 ? 's' : '') + '</span>' +
          '</div>' +
        '</div>';

      els.resultsList.appendChild(li);

      // Animate progress bar in after render
      setTimeout(function() {
        var fill = li.querySelector('.progress-fill');
        if (fill) fill.style.width = item.yes_pct + '%';
      }, 30 + idx * 20);
    });
  }

  els.sortPopular.addEventListener('click', function() {
    currentSort = 'popular';
    els.sortPopular.classList.add('active');
    els.sortDivisive.classList.remove('active');
    renderResultsList();
  });

  els.sortDivisive.addEventListener('click', function() {
    currentSort = 'divisive';
    els.sortDivisive.classList.add('active');
    els.sortPopular.classList.remove('active');
    renderResultsList();
  });

  // ─── Start ──────────────────────────────────────────────────
  init();
})();
