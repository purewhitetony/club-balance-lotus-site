// Общее для страниц: кнопка «Наверх» и навигация по разделам страницы.
(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  // Обработчики на window и document снимаются по этому сигналу, когда радио открывает
  // следующую страницу без перезагрузки (js/radio.js)
  const { signal } = (window.__page ??= new AbortController());
  const behavior = () => (reduced.matches ? 'auto' : 'smooth');

  // Плавный переход между страницами браузер иногда пропускает (например, вкладка в фоне) —
  // это нормально, но без обработчика он пишет ошибку в консоль
  const quiet = (e) => e.viewTransition?.ready.catch(() => {});
  addEventListener('pageswap', quiet, { signal });
  addEventListener('pagereveal', quiet, { signal });

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
    }, { passive: true, signal });
    toTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: behavior() }));
    update();
  }

  // ── Мобильное меню (<details>): закрытие по Esc, при переходе на десктоп и при возврате «Назад» ──
  const menu = document.querySelector('[data-menu]');
  if (menu) {
    const btn = menu.querySelector('summary');
    const close = () => { menu.open = false; };
    menu.addEventListener('toggle', () => btn.setAttribute('aria-label', menu.open ? 'Закрыть меню' : 'Меню'));
    addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && menu.open) { close(); btn.focus(); }
    }, { signal });
    matchMedia('(min-width: 900px)').addEventListener('change', (e) => { if (e.matches) close(); }, { signal });
    addEventListener('pageshow', (e) => { if (e.persisted) close(); }, { signal });
  }

  // ── Шапка на телефоне: при прокрутке вниз прячется, при прокрутке вверх возвращается ──
  // У самого верха страницы шапка в обычном виде (на главной — прозрачная, только бургер).
  const bar = document.querySelector('[data-headroom]');
  if (bar) {
    const mobile = matchMedia('(max-width: 899px)');
    const STEP = 6; // мелкие подёргивания прокрутки не переключают шапку
    let lastY = Math.max(0, scrollY);
    let ticking = false;
    const set = (pinned, hidden) => {
      bar.classList.toggle('is-pinned', pinned);
      bar.classList.toggle('is-hidden', hidden);
    };
    const update = () => {
      ticking = false;
      const y = Math.max(0, scrollY); // iOS при отскоке даёт отрицательную прокрутку
      if (!mobile.matches || y <= bar.offsetHeight) {
        set(false, false);
        lastY = y;
        return;
      }
      if (menu?.open || Math.abs(y - lastY) < STEP) return;
      set(true, y > lastY);
      lastY = y;
    };
    addEventListener('scroll', () => {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true, signal });
    mobile.addEventListener('change', update, { signal });
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
  }, { passive: true, signal });
  addEventListener('scrollend', () => { lockUntil = 0; spy(); }, { signal });

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
