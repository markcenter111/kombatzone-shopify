/* ══════════════════════════════════════════════════════════
   KOMBAT ZONE — Fighter Locker v2 (hotspot sul manichino)
   Pallini chiusi -> hover/tap apre il menu -> selezione:
   pallino verde, layer sul manichino, totale aggiornato.
   Add multiplo a /cart/add.js con proprieta _kz_set.
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

    var SLOTS = ['casco', 'maglia', 'pantaloncini', 'guanti', 'parastinchi', 'paradenti'];
    var stage = root.querySelector('[data-locker-stage]');
    var totalEl = root.querySelector('[data-locker-total]');
    var countEl = root.querySelector('[data-locker-count]');
    var addBtn = root.querySelector('[data-locker-add]');
    var addedPop = root.querySelector('[data-locker-added]');
    var editSetId = new URLSearchParams(window.location.search).get('edit_set');
    var isTouch = !window.matchMedia('(hover: hover) and (pointer: fine)').matches;

    var state = {};
    var layers = {};

    pieces.forEach(function (p) {
      if (p.layer) { var im = new Image(); im.src = p.layer; }
    });

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
    function entryVariant(e) {
      return e.piece.variants.find(function (x) { return x.id === e.variantId; });
    }

    function refreshTotals() {
      var entries = selectedEntries();
      var total = entries.reduce(function (sum, e) {
        var v = entryVariant(e);
        return sum + (v ? v.price : 0);
      }, 0);
      totalEl.textContent = formatMoney(total);
      countEl.textContent = entries.length
        ? entries.length + ' ' + (entries.length === 1 ? i18n.piece : i18n.pieces)
        : '';
      addBtn.disabled = entries.length === 0;

      SLOTS.forEach(function (slot) {
        var wrap = root.querySelector('[data-locker-dot][data-slot="' + slot + '"]');
        if (wrap) wrap.classList.toggle('filled', !!state[slot]);
        var row = root.querySelector('[data-locker-sum="' + slot + '"]');
        if (row) {
          var nameEl = row.querySelector('[data-sum-name]');
          var priceEl = row.querySelector('[data-sum-price]');
          if (state[slot]) {
            var v = entryVariant(state[slot]);
            nameEl.textContent = state[slot].piece.title;
            nameEl.classList.remove('kz2-empty');
            priceEl.textContent = v ? formatMoney(v.price) : '';
          } else {
            nameEl.textContent = i18n.none;
            nameEl.classList.add('kz2-empty');
            priceEl.textContent = '';
          }
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
      if (!wrap || !box) return;
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
        b.className = 'kz2-size-btn' +
          (v.id === entry.variantId ? ' active' : '') +
          (!v.available ? ' unavailable' : '');
        b.textContent = v.title;
        b.disabled = !v.available;
        b.setAttribute('aria-pressed', v.id === entry.variantId ? 'true' : 'false');
        b.addEventListener('click', function (e) {
          e.stopPropagation();
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
      if (!box) return;
      box.innerHTML = '';

      var none = document.createElement('button');
      none.type = 'button';
      none.className = 'kz2-piece' + (state[slot] ? '' : ' active');
      none.setAttribute('aria-pressed', state[slot] ? 'false' : 'true');
      none.innerHTML = '<span class="kz2-piece-img kz2-none" aria-hidden="true">&times;</span>' +
        '<span class="kz2-piece-name">' + i18n.none + '</span>';
      none.addEventListener('click', function (e) {
        e.stopPropagation();
        state[slot] = null;
        renderPieces(slot); renderSizes(slot); refreshStage(slot); refreshTotals();
      });
      box.appendChild(none);

      pieces.filter(function (p) { return p.slot === slot; }).forEach(function (p) {
        var isActive = state[slot] && state[slot].piece.handle === p.handle;
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'kz2-piece' + (isActive ? ' active' : '') + (p.available ? '' : ' unavailable');
        b.disabled = !p.available;
        b.setAttribute('aria-pressed', isActive ? 'true' : 'false');
        var v0 = firstAvailableVariant(p);
        b.innerHTML =
          '<img class="kz2-piece-img" src="' + p.thumb + '" alt="' + p.title.replace(/"/g, '&quot;') + '" loading="lazy">' +
          '<span class="kz2-piece-name">' + p.title + '</span>' +
          '<span class="kz2-piece-price">' + (p.available ? formatMoney(v0.price) : i18n.out_of_stock) + '</span>';
        b.addEventListener('click', function (e) {
          e.stopPropagation();
          if (!p.available) return;
          state[slot] = { piece: p, variantId: firstAvailableVariant(p).id };
          renderPieces(slot); renderSizes(slot); refreshStage(slot); refreshTotals();
        });
        box.appendChild(b);
      });
    }

    /* ── Pallini: hover apre (desktop), tap apre/chiude (touch) ── */
    var dots = root.querySelectorAll('[data-locker-dot]');
    var closeTimer = null;
    function closeAll(except) {
      dots.forEach(function (d) {
        if (d !== except) {
          d.classList.remove('open');
          var b = d.querySelector('.kz2-dot');
          if (b) b.setAttribute('aria-expanded', 'false');
        }
      });
    }
    dots.forEach(function (wrap) {
      var btn = wrap.querySelector('.kz2-dot');
      function open() {
        clearTimeout(closeTimer);
        closeAll(wrap);
        wrap.classList.add('open');
        btn.setAttribute('aria-expanded', 'true');
      }
      function scheduleClose() {
        clearTimeout(closeTimer);
        closeTimer = setTimeout(function () {
          wrap.classList.remove('open');
          btn.setAttribute('aria-expanded', 'false');
        }, 260);
      }
      if (!isTouch) {
        wrap.addEventListener('mouseenter', open);
        wrap.addEventListener('mouseleave', scheduleClose);
      }
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        if (wrap.classList.contains('open')) {
          wrap.classList.remove('open');
          btn.setAttribute('aria-expanded', 'false');
        } else {
          open();
        }
      });
    });
    document.addEventListener('click', function () { closeAll(); });

    function renderAll() {
      SLOTS.forEach(function (slot) {
        renderPieces(slot); renderSizes(slot); refreshStage(slot);
      });
      refreshTotals();
    }

    if (editSetId) {
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

    /* ── Add set al carrello ── */
    addBtn.addEventListener('click', function () {
      var entries = selectedEntries();
      if (!entries.length || addBtn.disabled) return;
      var label = addBtn.textContent;
      addBtn.disabled = true;
      addBtn.textContent = '…';

      var setId = editSetId || ('kzset-' + Date.now().toString(36));
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
          addBtn.disabled = false;
          addBtn.textContent = label;
          if (editSetId) { window.location.href = '/cart'; return; }
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
