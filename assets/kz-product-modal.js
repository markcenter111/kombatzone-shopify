/**
 * KOMBAT ZONE — Product Quick-Buy Modal
 * File: assets/kz-product-modal.js
 */

(function () {
  'use strict';

  /* ── Guard: impedisce doppio caricamento se incluso più volte ── */
  if (window._kzModalLoaded) return;
  window._kzModalLoaded = true;

  /* ── Stato ── */
  let currentProduct    = null;
  let selectedVariantId = null;
  let randomViewers     = 12;
  let viewersTimer      = null;

  /* ── Elementi DOM ── */
  const overlay     = document.getElementById('kz-modal-overlay');
  const closeBtn    = document.getElementById('kz-modal-close');
  const addBtn      = document.getElementById('kz-modal-add-btn');
  const productLink = document.getElementById('kz-modal-product-link');
  const toast       = document.getElementById('kz-modal-toast');

  if (!overlay) return;

  /* ══════════════════════════════════════
     SLIDESHOW
     ══════════════════════════════════════ */
  const SLIDE_INTERVAL_MS = 4000;

  let slideImages   = [];
  let slideIndex    = 0;
  let slideTimer    = null;
  let slidePaused   = false;
  let progressFills = [];
  let pausedAt      = 0; /* frazione 0-1 dove si è fermata la barra */

  /* Schedula il prossimo cambio slide dopo `delay` ms (setTimeout ricorsivo
     così possiamo usare un delay diverso al resume) */
  function scheduleNextSlide(delay) {
    clearTimeout(slideTimer);
    slideTimer = null;
    if (slideImages.length <= 1) return;
    slideTimer = setTimeout(() => {
      if (!slidePaused) {
        slideTo(slideIndex + 1);
        scheduleNextSlide(SLIDE_INTERVAL_MS);
      }
    }, delay);
  }

  function startSlideTimer() {
    scheduleNextSlide(SLIDE_INTERVAL_MS);
  }

  function pauseSlideshow() {
    slidePaused = true;
    clearTimeout(slideTimer);
    slideTimer = null;
    /* Cattura la posizione attuale della barra */
    const fill = progressFills[slideIndex];
    if (fill) {
      const fillW = parseFloat(getComputedStyle(fill).width) || 0;
      const segW  = fill.parentElement
        ? fill.parentElement.getBoundingClientRect().width : 0;
      pausedAt = segW > 0 ? fillW / segW : 0;
      fill.style.animation = 'none';
      fill.style.width = (pausedAt * 100) + '%';
    }
  }

  function resumeSlideshow() {
    slidePaused = false;
    const fill = progressFills[slideIndex];
    const remaining = Math.max(200, Math.round((1 - pausedAt) * SLIDE_INTERVAL_MS));
    if (fill) {
      /* animation-delay negativo = "questa animazione è già partita X ms fa"
         quindi la barra riparte esattamente da dove si era fermata */
      const elapsed = Math.round(pausedAt * SLIDE_INTERVAL_MS);
      fill.style.animation = 'none';
      fill.style.width = '';
      void fill.offsetWidth;
      fill.style.animation =
        `kz-progress-grow ${SLIDE_INTERVAL_MS}ms linear -${elapsed}ms forwards`;
    }
    scheduleNextSlide(remaining);
  }

  function slideTo(index) {
    if (slideImages.length === 0) return;

    slideIndex = ((index % slideImages.length) + slideImages.length) % slideImages.length;

    const mainImg    = document.getElementById('kz-modal-main-img');
    const thumbsWrap = document.getElementById('kz-modal-thumbs');

    if (mainImg) {
      mainImg.classList.add('kz-fade');
      setTimeout(() => {
        mainImg.src = slideImages[slideIndex];
        mainImg.classList.remove('kz-fade');
      }, 200);
    }

    if (thumbsWrap) {
      thumbsWrap.querySelectorAll('.kz-modal-thumb')
        .forEach((t, i) => t.classList.toggle('active', i === slideIndex));
    }

    /* Aggiorna progress bar */
    progressFills.forEach((fill, i) => {
      fill.style.animation = 'none';
      void fill.offsetWidth;
      if (i < slideIndex) {
        fill.style.width = '100%';
      } else if (i === slideIndex && !slidePaused && slideImages.length > 1) {
        fill.style.width = '0%';
        fill.style.animation = `kz-progress-grow ${SLIDE_INTERVAL_MS}ms linear forwards`;
      } else {
        fill.style.width = '0%';
      }
    });
  }

  /* ──────────────────────────────────────
     PROGRESS BAR
  ────────────────────────────────────── */
  function buildProgressBar() {
    const wrap = document.getElementById('kz-modal-progress');
    if (!wrap) return;
    wrap.innerHTML = '';
    progressFills = [];
    slideImages.forEach(() => {
      const seg  = document.createElement('div');
      seg.className = 'kz-modal-progress-seg';
      const fill = document.createElement('div');
      fill.className = 'kz-modal-progress-fill';
      seg.appendChild(fill);
      wrap.appendChild(seg);
      progressFills.push(fill);
    });
    wrap.style.display = slideImages.length > 1 ? 'flex' : 'none';
  }

  /* ──────────────────────────────────────
     VIEWERS
  ────────────────────────────────────── */
  const VIEWERS_UPDATE_MS = 60000;

  function hashStringToInt(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }

  function getBaseViewers(handle) {
    const seed = hashStringToInt(handle || 'kz-default');
    return 6 + (seed % 23);
  }

  function renderViewers() {
    const el = document.getElementById('kz-modal-viewers');
    if (el) el.textContent = `${randomViewers} persone`;
  }

  function startViewersTimer(handle) {
    stopViewersTimer();
    randomViewers = Math.max(3, getBaseViewers(handle) + Math.floor(Math.random() * 13) - 4);
    renderViewers();
    viewersTimer = setInterval(() => {
      const base  = getBaseViewers(handle);
      const delta = Math.floor(Math.random() * 9) - 4;
      randomViewers = Math.max(3, base + delta);
      renderViewers();
    }, VIEWERS_UPDATE_MS);
  }

  function stopViewersTimer() {
    clearInterval(viewersTimer);
    viewersTimer = null;
  }

  /* ──────────────────────────────────────
     POPOLA MODAL
  ────────────────────────────────────── */
  function populateModal(product) {
    document.getElementById('kz-modal-title').textContent = product.title;
    document.getElementById('kz-modal-category').textContent =
      product.type ? `${product.type} · ${product.vendor}` : product.vendor;

    productLink.href = `/products/${product.handle}`;

    /* Reset quantita e mini-popup */
    const qtyEl = document.getElementById('kz-modal-qty-input');
    if (qtyEl) qtyEl.value = 1;
    const addedEl = document.getElementById('kz-modal-added');
    if (addedEl) addedEl.classList.remove('show');

    /* Reset stato slideshow */
    slideImages  = (product.images || []).slice(0, 8);
    slideIndex   = 0;
    slidePaused  = false;
    clearInterval(slideTimer);
    slideTimer = null;

    const mainImg = document.getElementById('kz-modal-main-img');
    if (slideImages.length > 0) {
      mainImg.src = slideImages[0];
      mainImg.alt = product.title;
    }

    buildProgressBar();

    /* Thumbnails */
    const thumbsWrap = document.getElementById('kz-modal-thumbs');
    thumbsWrap.innerHTML = '';
    slideImages.forEach((imgUrl, i) => {
      const div = document.createElement('div');
      div.className = 'kz-modal-thumb' + (i === 0 ? ' active' : '');
      const img = document.createElement('img');
      img.src = imgUrl;
      img.alt = '';
      img.loading = 'lazy';
      div.appendChild(img);
      div.addEventListener('click', () => {
        slideTo(i);
        if (!slidePaused) startSlideTimer();
      });
      thumbsWrap.appendChild(div);
    });

    /* Navigazione stile stories: tap sinistra = indietro, destra = avanti,
       tap al centro = pausa/riprendi lo scorrimento */
    const imgWrap = document.getElementById('kz-modal-img-wrap');
    if (imgWrap) {
      imgWrap.onclick = (e) => {
        const zone = e.target && e.target.getAttribute ? e.target.getAttribute('data-kz-tap') : null;
        if (zone === 'prev') {
          slideTo(slideIndex - 1);
          if (!slidePaused) startSlideTimer();
        } else if (zone === 'next') {
          slideTo(slideIndex + 1);
          if (!slidePaused) startSlideTimer();
        } else {
          if (slidePaused) resumeSlideshow();
          else pauseSlideshow();
        }
      };
    }

    /* Avvia slideshow */
    slideTo(0);
    startSlideTimer();

    /* Varianti */
    const firstAvailable = product.variants.find(v => v.available) || product.variants[0];
    selectedVariantId = firstAvailable.id;
    renderVariants(product);
    updatePrice(firstAvailable);
    updateStock(firstAvailable);

    startViewersTimer(product.handle);
  }

  /* ──────────────────────────────────────
     VARIANTI
  ────────────────────────────────────── */
  function getOptionLabel(product) {
    const opt = product.options && product.options[0];
    if (!opt) return 'Variante';
    let name = typeof opt === 'string' ? opt : (opt.name || '');
    if (!name) return 'Variante';
    const lower = name.trim().toLowerCase();
    const translations = { size:'Taglia', taglia:'Taglia', color:'Colore', colour:'Colore', colore:'Colore', title:'Variante' };
    return translations[lower] || name;
  }

  function renderVariants(product) {
    const wrap      = document.getElementById('kz-modal-variants-wrap');
    const container = document.getElementById('kz-modal-variants');
    const label     = document.getElementById('kz-modal-variants-label');
    container.innerHTML = '';

    if (product.variants.length === 1 && product.variants[0].title === 'Default Title') {
      wrap.style.display = 'none';
      return;
    }

    wrap.style.display = 'block';
    label.textContent = getOptionLabel(product);

    product.variants.forEach(variant => {
      const btn = document.createElement('button');
      btn.className = 'kz-modal-var-btn' +
        (variant.id === selectedVariantId ? ' active' : '') +
        (!variant.available ? ' unavailable' : '');
      btn.textContent = variant.title;
      btn.disabled = !variant.available;
      btn.addEventListener('click', () => {
        if (!variant.available) return;
        selectedVariantId = variant.id;
        container.querySelectorAll('.kz-modal-var-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        updatePrice(variant);
        updateStock(variant);
      });
      container.appendChild(btn);
    });
  }

  /* ──────────────────────────────────────
     PREZZO
  ────────────────────────────────────── */
  function updatePrice(variant) {
    const priceEl = document.getElementById('kz-modal-price');
    const oldEl   = document.getElementById('kz-modal-price-old');
    const saveEl  = document.getElementById('kz-modal-price-save');

    priceEl.textContent = formatMoney(variant.price);

    if (variant.compare_at_price && variant.compare_at_price > variant.price) {
      oldEl.textContent   = formatMoney(variant.compare_at_price);
      oldEl.style.display = '';
      const pct = Math.round((1 - variant.price / variant.compare_at_price) * 100);
      saveEl.textContent   = `−${pct}%`;
      saveEl.style.display = '';
    } else {
      oldEl.style.display  = 'none';
      saveEl.style.display = 'none';
    }
  }

  /* ──────────────────────────────────────
     STOCK
  ────────────────────────────────────── */
  function updateStock(variant) {
    const stockWrap = document.getElementById('kz-modal-stock-wrap');
    const stockNum  = document.getElementById('kz-modal-stock-num');
    const stockFill = document.getElementById('kz-modal-stock-fill');

    if (!variant.available) {
      stockWrap.style.display = 'none';
      addBtn.disabled = true;
      addBtn.textContent = '✕ Esaurito';
      return;
    }

    addBtn.disabled = false;
    addBtn.textContent = '🛒 Aggiungi al carrello';

    const qty = variant.inventory_quantity;
    if (qty !== undefined && qty !== null && qty <= 10 && qty > 0) {
      stockWrap.style.display = '';
      stockNum.textContent = `${qty} rimasti`;
      const pct = Math.min(100, Math.max(8, (qty / 18) * 100));
      stockFill.style.width = pct + '%';
    } else {
      stockWrap.style.display = 'none';
    }
  }

  /* ──────────────────────────────────────
     CARRELLO
  ────────────────────────────────────── */
  /* Quantita nel popup */
  const qtyInput = document.getElementById('kz-modal-qty-input');
  const qtyMinus = document.getElementById('kz-modal-qty-minus');
  const qtyPlus  = document.getElementById('kz-modal-qty-plus');
  function getQty() {
    const v = parseInt(qtyInput && qtyInput.value, 10);
    return isNaN(v) || v < 1 ? 1 : v;
  }
  if (qtyMinus) qtyMinus.addEventListener('click', () => { qtyInput.value = Math.max(1, getQty() - 1); });
  if (qtyPlus)  qtyPlus.addEventListener('click', () => { qtyInput.value = getQty() + 1; });

  /* Mini-popup post aggiunta: continua lo shopping o vai al carrello */
  const addedPop = document.getElementById('kz-modal-added');
  function showAddedPop() {
    if (!addedPop) { window.location.href = '/cart'; return; }
    addedPop.classList.add('show');
  }
  function hideAddedPop() {
    if (addedPop) addedPop.classList.remove('show');
  }
  const addedContinue = document.getElementById('kz-modal-added-continue');
  if (addedContinue) addedContinue.addEventListener('click', () => { hideAddedPop(); closeModal(); });
  if (addedPop) addedPop.addEventListener('click', e => { if (e.target === addedPop) hideAddedPop(); });

  addBtn.addEventListener('click', () => {
    if (!selectedVariantId || addBtn.disabled) return;
    addBtn.disabled = true;
    addBtn.textContent = '…';

    fetch('/cart/add.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: selectedVariantId, quantity: getQty() })
    })
      .then(r => r.json())
      .then(() => {
        updateCartCount();
        addBtn.disabled = false;
        addBtn.textContent = 'Aggiungi al carrello';
        showAddedPop();
      })
      .catch(() => {
        addBtn.disabled = false;
        addBtn.textContent = 'Aggiungi al carrello';
        showToast('Errore — riprova');
      });
  });

  function updateCartCount() {
    fetch('/cart.js')
      .then(r => r.json())
      .then(cart => {
        const badge = document.querySelector('.kz-cart-count');
        if (!badge) return;
        badge.textContent = cart.item_count > 0 ? cart.item_count : '';
        badge.style.display = cart.item_count > 0 ? '' : 'none';
      });
  }

  /* ──────────────────────────────────────
     CHIUDI
  ────────────────────────────────────── */
  function closeModal() {
    overlay.classList.remove('open');
    document.body.style.overflow = '';
    currentProduct    = null;
    selectedVariantId = null;
    clearInterval(slideTimer);
    slideTimer = null;
    slidePaused = false;
    stopViewersTimer();
  }

  closeBtn.addEventListener('click', closeModal);
  overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });

  /* Cursore X: fuori dal popup il mouse diventa la stessa X del close */
  const cursorX = document.getElementById('kz-modal-cursor-x');
  if (cursorX && window.matchMedia('(pointer: fine)').matches) {
    overlay.addEventListener('mousemove', e => {
      if (e.target === overlay) {
        cursorX.style.left = e.clientX + 'px';
        cursorX.style.top = e.clientY + 'px';
        cursorX.classList.add('show');
      } else {
        cursorX.classList.remove('show');
      }
    });
    overlay.addEventListener('mouseleave', () => cursorX.classList.remove('show'));
  }
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

  /* ──────────────────────────────────────
     TOAST
  ────────────────────────────────────── */
  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
  }

  function formatMoney(cents) {
    return '€' + (cents / 100).toFixed(2).replace('.', ',');
  }

  /* ──────────────────────────────────────
     OPEN MODAL — carica dati prodotto e apre
  ────────────────────────────────────── */
  function openModal(handle) {
    fetch(`/products/${handle}.js`)
      .then(r => r.json())
      .then(product => {
        currentProduct = product;
        populateModal(product);
        overlay.classList.add('open');
        document.body.style.overflow = 'hidden';
      })
      .catch(() => {
        showToast('Impossibile caricare il prodotto');
      });
  }

  /* ──────────────────────────────────────
     INTERCETTA TASTO ATC NELLA PRODUCT PAGE
  ────────────────────────────────────── */
  function initProductPageATC() {
    if (!document.body.classList.contains('template-product')) return;

    // Recupera l'handle del prodotto corrente
    const productHandle = window.ShopifyAnalytics?.meta?.product?.handle
      || document.querySelector('[data-product-handle]')?.dataset?.productHandle
      || document.querySelector('meta[property="og:url"]')?.content?.match(/\/products\/([^/?#]+)/)?.[1];

    if (!productHandle) return;

    // Selettori tipici del tasto ATC in Shopify (Dawn, Craft, ecc.)
    const atcSelectors = [
      '[data-type="add-to-cart-form"] button[type="submit"]',
      'product-form button[name="add"]',
      'form[action="/cart/add"] button[type="submit"]',
      '.product-form__submit',
      '#AddToCart',
    ].join(', ');

    function bindATC() {
      document.querySelectorAll(atcSelectors).forEach(btn => {
        if (btn.dataset.kzAtcBound) return;
        btn.dataset.kzAtcBound = 'true';
        btn.addEventListener('click', function (e) {
          e.preventDefault();
          e.stopImmediatePropagation();
          openModal(productHandle);
        }, true); // capture phase per intercettare prima del tema
      });
    }

    bindATC();
    // Osserva DOM nel caso il form venga reso dinamicamente
    const observer = new MutationObserver(bindATC);
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initProductPageATC);
  } else {
    initProductPageATC();
  }

  /* ──────────────────────────────────────
     INTERCETTA CLICK CARD
  ────────────────────────────────────── */
  function initCardLinks() {
    if (document.body.classList.contains('template-product')) return;

    function bindCards() {
      document.querySelectorAll('product-card a[href*="/products/"], li[data-product-id] a[href*="/products/"]').forEach(link => {
        if (link.dataset.kzBound) return;
        link.dataset.kzBound = 'true';
        link.addEventListener('click', function (e) {
          if (e.target.closest('add-to-cart-component')) return;
          if (e.target.closest('[data-quick-add-button]')) return;
          const match = link.href.match(/\/products\/([^?#/]+)/);
          if (!match) return;
          e.preventDefault();
          e.stopPropagation();
          openModal(match[1]);
        });
      });
    }

    bindCards();

    const observer = new MutationObserver(bindCards);
    const grid = document.querySelector('results-list, .product-grid-container, main');
    if (grid) observer.observe(grid, { childList: true, subtree: true });
  }

  document.addEventListener('click', function (e) {
    const btn = e.target.closest('[data-kz-modal]');
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    const handle = btn.dataset.kzModal;
    if (handle) openModal(handle);
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCardLinks);
  } else {
    initCardLinks();
  }

})();