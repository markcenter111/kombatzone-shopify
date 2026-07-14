/* ══════════════════════════════════════════════════════════
   KOMBAT ZONE — Fighter Locker
   Logica: selezione pezzi per slot -> layer sull'illustrazione,
   prezzo totale live, add multiplo a /cart/add.js.
   Stato solo in memoria (nessun localStorage).
   ══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  document.querySelectorAll('[id^="kz2-locker-"]').forEach(initLocker);

  function initLocker(root) {
    var dataEl = root.querySelector('[data-locker-data]');
    var i18nEl = root.querySelector('[data-locker-i18n]');
    if (!dataEl) return;

    var pieces, i18n;
    try {
      pieces = JSON.parse(dataEl.textContent);
      i18n = i18nEl ? JSON.parse(i18nEl.textContent) : {};
    } catch (e) { return; }
    if (!pieces.length) return;

    var SLOTS = ['testa', 'corpo', 'gambe', 'piedi', 'accessorio'];
    var editSetId = new URLSearchParams(window.location.search).get('edit_set');
    var stage = root.querySelector('[data-locker-stage]');
    var totalEl = root.querySelector('[data-locker-total]');
    var countEl = root.querySelector('[data-locker-count]');
    var addBtn = root.querySelector('[data-locker-add]');
    var addedPop = root.querySelector('[data-locker-added]');

    /* Stato: per slot -> { piece, variantId } (null = vuoto) */
    var state = {};
    var layers = {};

    /* Precarica tutte le immagini layer per cambi istantanei */
    pieces.forEach(function (p) {
      if (p.layer) { var im = new Image(); im.src = p.layer; }
    });

    /* Layer <img> per slot, ordinati per z_index */
    SLOTS.forEach(function (slot) {
      var img = document.createElement('img');
      img.className = 'kz2-locker-layer kz2-hidden';
      img.alt = '';
      img.setAttribute('aria-hidden', 'true');
      stage.appendChild(img);
      layers[slot] = img;
      state[slot] = null;
    });

    function firstAvailableVariant(piece) {
      var v = piece.variants.find(function (x) { return x.available; });
      return v || piece.variants[0];
    }

    function formatMoney(cents) {
      return '€' + (cents / 100).toFixed(2).replace('.', ',');
    }

    function selectedEntries() {
      return SLOTS.map(function (s) { return state[s]; }).filter(Boolean);
    }

    function refreshTotals() {
      var entries = selectedEntries();
      var total = entries.reduce(function (sum, e) {
        var v = e.piece.variants.find(function (x) { return x.id === e.variantId; });
        return sum + (v ? v.price : 0);
      }, 0);
      totalEl.textContent = formatMoney(total);
      countEl.textContent = entries.length
        ? entries.length + ' ' + (entries.length === 1 ? i18n.piece : i18n.pieces)
        : '';
      addBtn.disabled = entries.length === 0;
      /* Pallino verde sui tab con pezzo selezionato */
      root.querySelectorAll('[data-locker-tab]').forEach(function (tab) {
        var slot = tab.getAttribute('data-locker-tab');
        var dot = tab.querySelector('.kz2-locker-tab-dot');
        if (state[slot] && !dot) {
          var d = document.createElement('span');
          d.className = 'kz2-locker-tab-dot';
          tab.appendChild(d);
        } else if (!state[slot] && dot) {
          dot.remove();
        }
      });
    }

    function refreshStage(slot) {
      var img = layers[slot];
      if (state[slot]) {
        var p = state[slot].piece;
        img.src = p.layer;
        img.style.zIndex = p.z || 1;
        img.classList.remove('kz2-hidden');
      } else {
        img.classList.add('kz2-hidden');
      }
    }

    function renderSizes(slot) {
      var wrap = root.querySelector('[data-locker-sizes-wrap="' + slot + '"]');
      var box = root.querySelector('[data-locker-sizes="' + slot + '"]');
      box.innerHTML = '';
      var entry = state[slot];
      if (!entry || entry.piece.variants.length <= 1) {
        wrap.style.display = 'none';
        return;
      }
      wrap.style.display = 'block';
      entry.piece.variants.forEach(function (v) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'kz2-locker-size-btn' +
          (v.id === entry.variantId ? ' active' : '') +
          (!v.available ? ' unavailable' : '');
        b.textContent = v.title;
        b.disabled = !v.available;
        b.setAttribute('aria-pressed', v.id === entry.variantId ? 'true' : 'false');
        b.addEventListener('click', function () {
          if (!v.available) return;
          entry.variantId = v.id;
          renderSizes(slot);
          refreshTotals();
        });
        box.appendChild(b);
      });
    }

    function renderPieces(slot) {
      var box = root.querySelector('[data-locker-pieces="' + slot + '"]');
      box.innerHTML = '';

      /* Opzione "Vuoto" per liberare lo slot */
      var none = document.createElement('button');
      none.type = 'button';
      none.className = 'kz2-locker-piece' + (state[slot] ? '' : ' active');
      none.setAttribute('aria-pressed', state[slot] ? 'false' : 'true');
      none.innerHTML = '<span class="kz2-locker-piece-img kz2-none" aria-hidden="true">&times;</span>' +
        '<span class="kz2-locker-piece-name">' + i18n.none + '</span>';
      none.addEventListener('click', function () {
        state[slot] = null;
        renderPieces(slot);
        renderSizes(slot);
        refreshStage(slot);
        refreshTotals();
      });
      box.appendChild(none);

      pieces.filter(function (p) { return p.slot === slot; }).forEach(function (p) {
        var isActive = state[slot] && state[slot].piece.handle === p.handle;
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'kz2-locker-piece' + (isActive ? ' active' : '') + (p.available ? '' : ' unavailable');
        b.disabled = !p.available;
        b.setAttribute('aria-pressed', isActive ? 'true' : 'false');
        var v0 = firstAvailableVariant(p);
        b.innerHTML =
          '<img class="kz2-locker-piece-img" src="' + p.thumb + '" alt="' + p.title.replace(/"/g, '&quot;') + '" loading="lazy">' +
          '<span class="kz2-locker-piece-name">' + p.title + '</span>' +
          '<span class="kz2-locker-piece-price">' + (p.available ? formatMoney(v0.price) : i18n.out_of_stock) + '</span>';
        b.addEventListener('click', function () {
          if (!p.available) return;
          state[slot] = { piece: p, variantId: firstAvailableVariant(p).id };
          renderPieces(slot);
          renderSizes(slot);
          refreshStage(slot);
          refreshTotals();
        });
        box.appendChild(b);
      });
    }

    /* Tabs */
    var tabs = root.querySelectorAll('[data-locker-tab]');
    function activateTab(slot) {
      tabs.forEach(function (t) {
        var is = t.getAttribute('data-locker-tab') === slot;
        t.classList.toggle('active', is);
        t.setAttribute('aria-selected', is ? 'true' : 'false');
      });
      root.querySelectorAll('[data-locker-panel]').forEach(function (pn) {
        pn.classList.toggle('active', pn.getAttribute('data-locker-panel') === slot);
      });
    }
    tabs.forEach(function (t) {
      t.addEventListener('click', function () { activateTab(t.getAttribute('data-locker-tab')); });
    });

    /* Default outfit: primo bestseller di ogni slot (o, in modifica, i pezzi del carrello) */
    function renderAll() {
      SLOTS.forEach(function (slot) {
        renderPieces(slot);
        renderSizes(slot);
        refreshStage(slot);
      });
      refreshTotals();
    }

    if (editSetId) {
      /* Modalita modifica: riprendi i pezzi del set dal carrello */
      if (addBtn && i18n.update_set) addBtn.textContent = i18n.update_set;
      fetch('/cart.js')
        .then(function (r) { return r.json(); })
        .then(function (cart) {
          cart.items.forEach(function (it) {
            if (!it.properties || it.properties._kz_set !== editSetId) return;
            var piece = pieces.find(function (p) {
              return p.variants.some(function (v) { return v.id === it.variant_id; });
            });
            if (piece) state[piece.slot] = { piece: piece, variantId: it.variant_id };
          });
          renderAll();
        })
        .catch(function () { renderAll(); });
    } else {
      SLOTS.forEach(function (slot) {
        var def = pieces.find(function (p) { return p.slot === slot && p.bestseller && p.available; });
        if (def) state[slot] = { piece: def, variantId: firstAvailableVariant(def).id };
      });
      renderAll();
    }

    /* Primo tab con pezzi disponibili */
    var firstSlot = SLOTS.find(function (s) {
      return pieces.some(function (p) { return p.slot === s; });
    }) || SLOTS[0];
    activateTab(firstSlot);

    /* Add set al carrello: una sola chiamata con array items */
    addBtn.addEventListener('click', function () {
      var entries = selectedEntries();
      if (!entries.length || addBtn.disabled) return;
      var label = addBtn.textContent;
      addBtn.disabled = true;
      addBtn.textContent = '…';

      var setId = editSetId || ('kzset-' + Date.now().toString(36));

      /* In modifica: prima azzera le righe del vecchio set */
      var clearOld = editSetId
        ? fetch('/cart.js')
            .then(function (r) { return r.json(); })
            .then(function (cart) {
              var updates = {};
              cart.items.forEach(function (it) {
                if (it.properties && it.properties._kz_set === editSetId) updates[it.key] = 0;
              });
              if (!Object.keys(updates).length) return null;
              return fetch('/cart/update.js', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ updates: updates })
              });
            })
        : Promise.resolve(null);

      clearOld.then(function () {
        return fetch('/cart/add.js', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: entries.map(function (e) {
              return { id: e.variantId, quantity: 1, properties: { _kz_set: setId } };
            })
          })
        });
      })
        .then(function (r) {
          if (!r.ok) throw new Error('add failed');
          return r.json();
        })
        .then(function () {
          if (editSetId) { window.location.href = '/cart'; return; }
          addBtn.disabled = false;
          addBtn.textContent = label;
          /* Aggiorna il badge del carrello nell'header */
          fetch('/cart.js').then(function (r) { return r.json(); }).then(function (cart) {
            var badge = document.querySelector('.kz-cart-count');
            if (!badge) return;
            badge.textContent = cart.item_count > 0 ? cart.item_count : '';
            badge.style.display = cart.item_count > 0 ? '' : 'none';
          });
          if (addedPop) addedPop.classList.add('show');
          else window.location.href = '/cart';
        })
        .catch(function () {
          addBtn.disabled = false;
          addBtn.textContent = i18n.error || label;
          setTimeout(function () { addBtn.textContent = label; }, 2500);
        });
    });

    if (addedPop) {
      addedPop.addEventListener('click', function (e) { if (e.target === addedPop) addedPop.classList.remove('show'); });
      var cont = addedPop.querySelector('[data-locker-continue]');
      if (cont) cont.addEventListener('click', function () { addedPop.classList.remove('show'); });
    }
  }
})();
