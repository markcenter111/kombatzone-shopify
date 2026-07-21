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

    function vParts(v) {
      var parts = String(v.title).split(' / ');
      return { size: parts[0] || '', color: parts[1] || '' };
    }
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
          var thumbEl = row.querySelector('[data-sum-thumb]');
          if (state[slot]) {
            var v = entryVariant(state[slot]);
            nameEl.textContent = state[slot].piece.title;
            nameEl.classList.remove('kz2-empty');
            priceEl.textContent = v ? formatMoney(v.price) : '';
            if (thumbEl) {
              thumbEl.style.backgroundImage = 'url("' + state[slot].piece.thumb + '")';
              thumbEl.classList.add('kz2-has');
            }
            /* riga variante: taglia + pallino colore */
            if (v && v.title !== 'Default Title') {
              var pv = vParts(v);
              var varEl = document.createElement('span');
              varEl.className = 'kz2-sum-var';
              var html = '';
              if (pv.size) html += '<span>' + pv.size + '</span>';
              if (pv.color) html += (pv.size ? '<span>/</span>' : '') + '<span class="kz2-sum-dot" style="background-color:' + cssColor(pv.color) + '" title="' + pv.color + '"></span>';
              varEl.innerHTML = html;
              nameEl.appendChild(varEl);
            }
          } else {
            nameEl.textContent = i18n.none;
            nameEl.classList.add('kz2-empty');
            priceEl.textContent = '';
            if (thumbEl) {
              thumbEl.style.backgroundImage = '';
              thumbEl.classList.remove('kz2-has');
            }
          }
        }
      });
    }

    function refreshStage(slot) {
      var img = layers[slot];
      if (state[slot] && state[slot].piece.layer) {
        var p = state[slot].piece;
        img.src = p.layer;
        img.style.zIndex = p.z || 1;
        img.classList.remove('kz2-hidden');
      } else {
        img.classList.add('kz2-hidden');
      }
    }

    function cssColor(name) {
      return String(name).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-');
    }

    function renderSizes(slot) {
      var box = root.querySelector('[data-locker-opts="' + slot + '"]');
      if (!box) return;
      box.innerHTML = '';
      var entry = state[slot];
      if (!entry || entry.piece.variants.length <= 1) return;

      var vs = entry.piece.variants;
      var cur = vs.find(function (v) { return v.id === entry.variantId; }) || vs[0];
      var curP = vParts(cur);
      var colors = []; var sizes = [];
      vs.forEach(function (v) {
        var p = vParts(v);
        if (p.color && colors.indexOf(p.color) < 0) colors.push(p.color);
        if (p.size && sizes.indexOf(p.size) < 0) sizes.push(p.size);
      });

      function pick(size, color) {
        var exact = vs.find(function (v) { var p = vParts(v); return p.size === size && p.color === color && v.available; });
        if (exact) return exact;
        var byColor = vs.find(function (v) { return vParts(v).color === color && v.available; });
        if (color && byColor) return byColor;
        var bySize = vs.find(function (v) { return vParts(v).size === size && v.available; });
        return bySize || null;
      }

      /* COLORE sopra (pallini) */
      if (colors.length > 1) {
        var cl = document.createElement('div');
        cl.className = 'kz2-pop-sizes-label';
        cl.textContent = (i18n.color || 'Colore');
        box.appendChild(cl);
        var crow = document.createElement('div');
        crow.className = 'kz2-swatches';
        colors.forEach(function (c) {
          var anyAvail = vs.some(function (v) { return vParts(v).color === c && v.available; });
          var b = document.createElement('button');
          b.type = 'button';
          b.className = 'kz2-swatch' + (c === curP.color ? ' active' : '') + (anyAvail ? '' : ' unavailable');
          b.style.backgroundColor = cssColor(c);
          b.title = c;
          b.setAttribute('aria-label', c);
          b.disabled = !anyAvail;
          b.addEventListener('click', function (e) {
            e.stopPropagation();
            var v = pick(curP.size, c);
            if (!v) return;
            entry.variantId = v.id;
            renderSizes(slot);
            refreshTotals();
          });
          crow.appendChild(b);
        });
        box.appendChild(crow);
      }

      /* TAGLIA sotto */
      if (sizes.length > 0) {
        var sl = document.createElement('div');
        sl.className = 'kz2-pop-sizes-label';
        sl.textContent = (i18n.size || 'Taglia');
        box.appendChild(sl);
        var srow = document.createElement('div');
        srow.className = 'kz2-pop-sizes';
        sizes.forEach(function (sz) {
          var avail = vs.some(function (v) {
            var p = vParts(v);
            if (colors.length > 1) return p.size === sz && p.color === curP.color && v.available;
            return p.size === sz && v.available;
          });
          var b = document.createElement('button');
          b.type = 'button';
          b.className = 'kz2-size-btn' + (sz === curP.size ? ' active' : '') + (avail ? '' : ' unavailable');
          b.textContent = sz;
          b.disabled = !avail;
          b.addEventListener('click', function (e) {
            e.stopPropagation();
            var v = pick(sz, curP.color);
            if (!v) return;
            entry.variantId = v.id;
            renderSizes(slot);
            refreshTotals();
          });
          srow.appendChild(b);
        });
        box.appendChild(srow);
      }
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
      var closeBtn = wrap.querySelector('[data-pop-close]');
      if (closeBtn) closeBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        wrap.classList.remove('open');
        btn.setAttribute('aria-expanded', 'false');
      });
    });
    document.addEventListener('click', function () { closeAll(); });

    /* Zoom del manichino */
    var zoomBtn = root.querySelector('[data-locker-zoom]');
    if (zoomBtn) {
      zoomBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        var canvas = stage;
        var on = canvas.classList.toggle('kz2-zoomed');
        zoomBtn.classList.toggle('active', on);
        zoomBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
    }

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

    function resetLocker() {
      SLOTS.forEach(function (slot) { state[slot] = null; });
      closeAll();
      renderAll();
    }

    if (addedPop) {
      addedPop.addEventListener('click', function (e) { if (e.target === addedPop) addedPop.classList.remove('show'); });
      var cont = addedPop.querySelector('[data-locker-continue]');
      if (cont) cont.addEventListener('click', function () {
        addedPop.classList.remove('show');
        /* il set e' gia' nel carrello: armadietto svuotato, pronto per il prossimo */
        resetLocker();
        root.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  }
})();
