// Радио «Гималаи» на всём сайте: один эфир, который не обрывается при переходах между страницами.
// • Включают и ставят на паузу эфир: кнопка радио в шапке ([data-radio-live], есть на всех страницах),
//   плашка в мобильном меню и большая кнопка на странице радио ([data-radio-play]).
// • Чтобы звук не прерывался, пока эфир играет, ссылки внутри сайта открываются без перезагрузки:
//   скрипт загружает страницу, меняет <body> и заголовки в <head>, заново запускает скрипты страницы.
//   Скрипты страниц вешают обработчики с сигналом window.__page — перед сменой страницы он отменяется,
//   и старые обработчики снимаются. Когда радио выключено, сайт работает обычными переходами.
(() => {
  if (window.__radioNav) return; // скрипт уже работает — при переходе без перезагрузки его не перезапускаем

  const cfg = document.querySelector('[data-radio-live], [data-radio]')?.dataset ?? {};
  const STREAM = cfg.stream;
  const STATUS = cfg.status;
  if (!STREAM) return;
  const SELF = document.currentScript?.src;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');

  // ── Эфир ──
  const audio = new Audio();
  audio.preload = 'none';
  let state = 'idle'; // idle | loading | playing
  let title = '';

  const render = () => {
    const on = state !== 'idle';
    document.querySelectorAll('[data-radio-play], [data-radio-live]').forEach((b) => {
      b.classList.toggle('is-playing', state === 'playing');
      b.classList.toggle('is-loading', state === 'loading');
      b.setAttribute('aria-pressed', String(on));
      const label = b.querySelector('.radio-play__label');
      if (label) label.textContent = on ? 'Пауза' : 'Слушать';
    });
    document.querySelectorAll('[data-radio-live]').forEach((b) => {
      const what = title ? `в эфире: ${title}` : 'радио «Гималаи»';
      b.setAttribute('aria-label', on ? `Пауза — ${what}` : 'Слушать радио «Гималаи»');
      b.title = on ? `${what[0].toUpperCase()}${what.slice(1)}. Нажмите, чтобы поставить на паузу` : 'Слушать радио «Гималаи»';
    });
    document.querySelectorAll('[data-radio-note]').forEach((el) => {
      el.textContent = state === 'loading' ? 'Подключаемся к эфиру…'
        : on ? (title ? `В эфире: ${title}` : 'В эфире') : 'Слушать эфир';
    });
    if (title) {
      document.querySelectorAll('[data-radio-now]').forEach((el) => {
        el.querySelector('[data-radio-title]').textContent = title;
        el.hidden = false;
      });
    }
  };

  // Экран блокировки и шторка уведомлений на телефоне: название эфира и кнопка паузы
  const session = () => {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.playbackState = state === 'idle' ? 'paused' : 'playing';
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: title || 'Радио «Гималаи»',
        artist: 'Радио «Гималаи»',
        artwork: [{ src: new URL('apple-touch-icon.png', location.href).href, sizes: '180x180', type: 'image/png' }],
      });
    } catch { /* старый браузер без MediaMetadata */ }
  };

  const setState = (next) => {
    state = next;
    render();
    session();
  };

  const stop = () => {
    audio.pause();
    audio.removeAttribute('src');
    audio.load();
    setState('idle');
  };

  const start = () => {
    // Каждый раз — свежий адрес: после паузы эфир продолжается с текущего момента, а не с буфера
    audio.src = `${STREAM}?t=${Date.now()}`;
    setState('loading');
    audio.play().catch(() => setState('idle'));
    poll();
  };

  audio.addEventListener('playing', () => setState('playing'));
  audio.addEventListener('waiting', () => { if (state !== 'idle') setState('loading'); });
  audio.addEventListener('error', () => { if (state !== 'idle') stop(); });

  if ('mediaSession' in navigator) {
    navigator.mediaSession.setActionHandler('play', start);
    navigator.mediaSession.setActionHandler('pause', stop);
    try { navigator.mediaSession.setActionHandler('stop', stop); } catch { /* не везде есть «стоп» */ }
  }

  document.addEventListener('click', (e) => {
    if (!e.target.closest('[data-radio-play], [data-radio-live]')) return;
    if (state === 'idle') start();
    else stop();
  });

  // ── «Сейчас в эфире»: название передачи из статуса сервера вещания ──
  // Спрашиваем, пока играет эфир или открыта страница радио, и только в открытой вкладке.
  let timer = 0;
  const poll = async () => {
    clearTimeout(timer);
    if (!STATUS || (state === 'idle' && !document.querySelector('[data-radio]'))) return;
    if (!document.hidden) {
      try {
        const data = await (await fetch(STATUS, { cache: 'no-store' })).json();
        const src = [].concat(data.icestats?.source || [])[0];
        const text = (src?.title || src?.yp_currently_playing || '').replace(/\s+/g, ' ').trim();
        if (text && text !== title) {
          title = text;
          render();
          session();
        }
      } catch { /* сервер недоступен — просто не показываем название */ }
    }
    timer = setTimeout(poll, 30000);
  };
  document.addEventListener('visibilitychange', () => { if (!document.hidden) poll(); });

  // ── Переходы без перезагрузки, пока играет радио ──
  let soft = false; // была ли уже такая навигация — тогда кнопку «Назад» тоже обрабатываем сами
  let current = location.pathname;
  let loading = null;

  const isPage = (url) => url.origin === location.origin && (/\.html$/.test(url.pathname) || url.pathname.endsWith('/'));

  const syncHead = (doc) => {
    document.title = doc.title;
    const sel = 'meta[name="description"], meta[name="robots"], link[rel="canonical"], script[type="application/ld+json"]';
    document.head.querySelectorAll(sel).forEach((el) => el.remove());
    doc.head.querySelectorAll(sel).forEach((el) => document.head.append(el));
  };

  // Скрипты из загруженной разметки сами не выполняются — пересоздаём их по порядку
  const runScripts = () => {
    document.body.querySelectorAll('script[src]').forEach((old) => {
      if (old.src === SELF) return;
      const s = document.createElement('script');
      s.src = old.src;
      s.async = false;
      old.replaceWith(s);
    });
  };

  const go = async (href, push = true) => {
    const url = new URL(href, location.href);
    const ctrl = new AbortController();
    loading?.abort();
    loading = ctrl;
    let doc;
    try {
      const res = await fetch(url.href, { signal: ctrl.signal });
      if (!res.ok) throw new Error(String(res.status));
      doc = new DOMParser().parseFromString(await res.text(), 'text/html');
    } catch (err) {
      if (err.name !== 'AbortError') location.href = url.href; // не загрузилось — обычный переход
      return;
    }
    if (loading !== ctrl) return;
    loading = null;

    if (!soft) {
      soft = true;
      history.scrollRestoration = 'manual';
    }
    if (push) history.replaceState({ ...history.state, scroll: scrollY }, '');

    const swap = () => {
      window.__page?.abort();
      window.__page = new AbortController();
      syncHead(doc);
      document.body.replaceWith(doc.body);
      if (push) history.pushState({ scroll: 0 }, '', url.href);
      current = url.pathname;
      const target = url.hash && document.getElementById(decodeURIComponent(url.hash.slice(1)));
      if (target) target.scrollIntoView();
      else scrollTo(0, push ? 0 : history.state?.scroll || 0);
      // Фокус — на заголовок новой страницы, чтобы программа экранного доступа начала с него
      const h1 = document.querySelector('h1');
      if (h1) {
        h1.tabIndex = -1;
        h1.focus({ preventScroll: true });
      }
      runScripts();
      render();
      poll();
    };

    let swapped = false;
    const once = () => {
      if (swapped) return;
      swapped = true;
      swap();
    };
    if (document.startViewTransition && !reduced.matches && !document.hidden) {
      // Если браузер так и не начал анимацию (окно перекрыто, вкладка ушла в фон),
      // через 0,8 с меняем страницу без неё — иначе слой перехода остаётся поверх страницы
      const vt = document.startViewTransition(once);
      vt.ready.catch(() => {});
      vt.updateCallbackDone.catch(() => {});
      setTimeout(() => {
        if (swapped) return;
        vt.skipTransition();
        once();
      }, 800);
    } else {
      once();
    }
  };

  // Для скриптов страниц (лотос в шапке докручивается и потом переходит): true — переход взяли на себя
  window.__radioNav = (href) => {
    if (state === 'idle') return false;
    go(href);
    return true;
  };

  document.addEventListener('click', (e) => {
    if (state === 'idle' || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest('a[href]');
    if (!a || (a.target && a.target !== '_self') || a.hasAttribute('download')) return;
    const url = new URL(a.href, location.href);
    if (!isPage(url) || (url.pathname === location.pathname && url.hash)) return; // якорь на этой же странице — браузеру
    e.preventDefault();
    go(url.href);
  });

  addEventListener('popstate', () => {
    if (soft && location.pathname !== current) go(location.href, false);
  });

  render();
  poll();
})();
