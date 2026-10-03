// Общее для страниц: кнопка «Наверх» и навигация по разделам страницы.
(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const behavior = () => (reduced.matches ? 'auto' : 'smooth');

  // Плавный переход между страницами браузер иногда пропускает (например, вкладка в фоне) —
  // это нормально, но без обработчика он пишет ошибку в консоль
  const quiet = (e) => e.viewTransition?.ready.catch(() => {});
  addEventListener('pageswap', quiet);
  addEventListener('pagereveal', quiet);

  // ── Кнопка «Наверх»: появляется, когда ушли ниже первого экрана ──
  const toTop = document.querySelector('[data-to-top]');
  if (toTop) {
    let ticking = false;
    const update = () => {
      ticking = false;
      toTop.classList.toggle('is-visible', scrollY > innerHeight * 0.9);
    };
    addEventListener('scroll', () => {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    toTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: behavior() }));
    update();
  }

  // ── Навигация по странице: плавная прокрутка и подсветка текущего раздела ──
  // Текущий пункт перестаёт выглядеть ссылкой (см. .toc в site.css), поэтому видно,
  // что человек остался на этой же странице и находится в этом разделе.
  const toc = document.querySelector('[data-toc]');
  if (!toc) return;
  const links = [...toc.querySelectorAll('a[href^="#"]')];
  const items = links
    .map((link) => ({ link, target: document.getElementById(decodeURIComponent(link.hash.slice(1))) }))
    .filter((item) => item.target);
  if (!items.length) return;

  let current = null;
  let lockUntil = 0; // пока идёт прокрутка по клику, не перескакиваем на промежуточные разделы

  const setCurrent = (item) => {
    if (item === current) return;
    current?.link.removeAttribute('aria-current');
    current = item;
    current?.link.setAttribute('aria-current', 'location');
  };

  // Текущий раздел — последний, чей заголовок поднялся выше трети экрана.
  // Если долистали до самого низа — последний раздел.
  const spy = () => {
    if (performance.now() < lockUntil) return;
    const line = innerHeight * 0.33;
    let found = null;
    for (const item of items) {
      if (item.target.getBoundingClientRect().top <= line) found = item;
    }
    if (innerHeight + scrollY >= document.documentElement.scrollHeight - 2) found = items[items.length - 1];
    setCurrent(found);
  };

  let ticking = false;
  addEventListener('scroll', () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(() => { ticking = false; spy(); });
    }
  }, { passive: true });
  addEventListener('scrollend', () => { lockUntil = 0; spy(); });

  items.forEach((item) => {
    item.link.addEventListener('click', (e) => {
      e.preventDefault();
      setCurrent(item);
      lockUntil = performance.now() + 1200;
      item.target.scrollIntoView({ behavior: behavior(), block: 'start' });
      history.replaceState(null, '', item.link.hash);
    });
  });

  spy();
})();
