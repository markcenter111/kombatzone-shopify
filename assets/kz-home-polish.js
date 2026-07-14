/* KOMBAT ZONE — Home polish: reveal allo scroll con stagger */
(function () {
  if (!('IntersectionObserver' in window)) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var targets = document.querySelectorAll(
    '.cat-card, .kzp-card, .kz-tt-card, .how-step, .custom-visual, .email-form'
  );
  if (!targets.length) return;

  targets.forEach(function (el) { el.classList.add('kzh-hidden'); });

  var io = new IntersectionObserver(function (entries) {
    var delay = 0;
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      entry.target.style.animationDelay = delay + 'ms';
      delay += 70;
      entry.target.classList.remove('kzh-hidden');
      entry.target.classList.add('kzh-in');
      io.unobserve(entry.target);
    });
  }, { rootMargin: '0px 0px -6% 0px', threshold: 0.05 });

  targets.forEach(function (el) { io.observe(el); });
})();
