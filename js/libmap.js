// Карта библиотечной программы: книжки появляются, когда карта попадает в экран,
// подсказка с городом — при наведении (CSS) или по нажатию на телефоне (класс is-open).
(() => {
  const map = document.querySelector('[data-libmap]');
  if (!map) return;
  // Обработчики на window и document снимаются по этому сигналу, когда радио открывает
  // следующую страницу без перезагрузки (js/radio.js)
  const { signal } = (window.__page ??= new AbortController());
  const points = [...map.querySelectorAll('.libmap__pt')];

  // Задержка появления — с запада на восток, чтобы книжки «разлетались» по карте
  points.forEach((pt) => pt.style.setProperty('--d', `${Math.round(parseFloat(pt.style.left) * 12)}ms`));
  const reveal = () => map.classList.add('is-visible');
  if ('IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    map.classList.add('is-armed');
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { reveal(); io.disconnect(); }
    }, { threshold: 0.25 });
    io.observe(map);
    signal.addEventListener('abort', () => io.disconnect());
  }

  let open = null;
  const close = () => { open?.classList.remove('is-open'); open = null; };
  map.addEventListener('click', (e) => {
    const pt = e.target.closest('.libmap__pt');
    if (!pt || pt === open) { close(); return; }
    close();
    open = pt;
    pt.classList.add('is-open');
  });
  document.addEventListener('click', (e) => { if (!map.contains(e.target)) close(); }, { signal });
})();
