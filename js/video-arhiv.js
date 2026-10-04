// Видеоархив: видео RuTube играет прямо на странице.
// • Каталог (названия, длительности, обложки, состав плейлистов) — снимок в <script id="va-data">,
//   его собирает tools/fetch_video_arhiv.py; сам ролик грузится плеером RuTube в момент нажатия.
// • Лента плейлистов над плеером меняет список справа; строка поиска ищет по названиям всех видео.
// • Пока плеер не нажат, вместо него обложка: страница не грузит плеер RuTube зря.
// • Видео и радио «Гималаи» не звучат одновременно: включили видео — радио встаёт на паузу, и наоборот.
(() => {
  const root = document.querySelector('[data-va]');
  const dataEl = document.getElementById('va-data');
  if (!root || !dataEl) return;
  // Обработчики на window и document снимаются по этому сигналу при переходе без перезагрузки (js/radio.js)
  const { signal } = (window.__page ??= new AbortController());

  const DATA = JSON.parse(dataEl.textContent);
  const V = DATA.v; // [id, название, длительность (с), дата, путь обложки]
  const LISTS = Object.fromEntries(DATA.l.map((l) => [l.k, l]));
  const CDN = 'https://pic.rtbcdn.ru/';
  const MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');

  const $ = (sel) => root.querySelector(sel);
  const screen = $('[data-va-screen]');
  const list = $('[data-va-list]');
  const search = $('[data-va-search]');
  const plTitle = $('[data-va-pl-title]');
  const plMeta = $('[data-va-pl-meta]');
  const chapters = $('[data-va-chapters]');
  const nowTitle = $('[data-va-title]');
  const nowMeta = $('[data-va-meta]');
  const nowLink = $('[data-va-link]');
  const shelf = document.querySelectorAll('[data-va-pl]');

  let current = Number(root.dataset.start); // видео в плеере (или на обложке)
  let active = { key: 'new', ch: null }; // какая лента открыта справа
  let iframe = null;

  const img = (v, size) => (v[4] ? `${v[4].startsWith('http') ? '' : CDN}${v[4]}${size ? `?size=${size}` : ''}` : '');
  const dur = (s) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = String(s % 60).padStart(2, '0');
    return h ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`;
  };
  const date = (d) => {
    const [y, m, dd] = d.split('-');
    return `${Number(dd)} ${MONTHS[Number(m) - 1]} ${y}`;
  };
  const el = (tag, cls, text) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  };

  // Строка списка — та же разметка, что строит генератор (item_html в tools/video_arhiv.py)
  const item = (n) => {
    const v = V[n];
    const li = document.createElement('li');
    const a = el('a', 'va-item');
    a.href = `https://rutube.ru/video/${v[0]}/`;
    a.target = '_blank';
    a.rel = 'noopener';
    a.dataset.i = n;
    if (n === current) a.setAttribute('aria-current', 'true');
    const th = el('span', 'va-item__thumb');
    if (v[4]) {
      const im = el('img');
      im.src = img(v, 's');
      im.alt = '';
      im.loading = 'lazy';
      im.decoding = 'async';
      th.append(im);
    }
    th.append(el('span', 'va-item__dur', dur(v[2])));
    const body = el('span', 'va-item__body');
    body.append(el('span', 'va-item__title', v[1]), el('span', 'va-item__date', date(v[3])));
    a.append(th, body);
    li.append(a);
    return li;
  };

  const renderList = (ids) => {
    const frag = document.createDocumentFragment();
    ids.forEach((n) => frag.append(item(n)));
    list.replaceChildren(frag);
    list.scrollTop = 0;
  };

  const meta = (count, url, linkText = 'все на RuTube ↗') => {
    plMeta.replaceChildren(`${count} видео`);
    if (url) {
      const a = el('a', null, linkText);
      a.href = url;
      a.target = '_blank';
      a.rel = 'noopener';
      plMeta.append(' · ', a);
    }
  };

  // Главы «Бхагавад-гиты» — кнопки над списком; «Все» — цикл целиком по порядку глав
  const renderChapters = (l) => {
    if (!l.ch) {
      chapters.hidden = true;
      chapters.replaceChildren();
      return;
    }
    const make = (label, ch) => {
      const b = el('button', 'va__chip', label);
      b.type = 'button';
      b.dataset.vaCh = ch ?? '';
      b.setAttribute('aria-pressed', String(active.ch === ch));
      return b;
    };
    chapters.replaceChildren(make('Все', null), ...l.ch.map((c, i) => make(c.t.replace('Глава ', 'Гл. '), i)));
    if (l.yt) {
      const a = el('a', 'va__yt', `${l.ytt} ↗`);
      a.href = l.yt;
      a.target = '_blank';
      a.rel = 'noopener';
      chapters.append(a);
    }
    chapters.hidden = false;
  };

  const select = (key, ch = null) => {
    const l = LISTS[key];
    if (!l) return;
    active = { key, ch };
    const src = ch != null ? l.ch[ch] : l;
    search.value = '';
    plTitle.textContent = ch != null ? `${l.t.replace(/\.\s*Главы.*$/, '')}. ${src.t}` : l.t;
    meta(src.ids.length, src.u);
    renderChapters(l);
    renderList(src.ids);
    shelf.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.vaPl === key)));
    // Пока ничего не играет, на обложке — первое видео выбранной ленты
    if (!iframe && src.ids.length) cue(src.ids[0]);
  };

  const showNow = (n) => {
    const v = V[n];
    current = n;
    nowTitle.textContent = v[1];
    nowMeta.textContent = `${date(v[3])} · ${dur(v[2])}`;
    nowLink.href = `https://rutube.ru/video/${v[0]}/`;
    list.querySelectorAll('[aria-current]').forEach((a) => a.removeAttribute('aria-current'));
    list.querySelector(`[data-i="${n}"]`)?.setAttribute('aria-current', 'true');
  };

  // Обложка вместо плеера: видео ещё не запущено
  const cue = (n) => {
    const v = V[n];
    const facade = screen.querySelector('[data-va-facade]');
    if (!facade) return;
    facade.querySelector('[data-va-cover]').src = img(v);
    facade.setAttribute('aria-label', `Смотреть: ${v[1]}`);
    showNow(n);
  };

  const play = (n) => {
    const v = V[n];
    window.__radioStop?.(); // два звука сразу ни к чему
    if (!iframe) {
      iframe = document.createElement('iframe');
      iframe.allow = 'clipboard-write; autoplay; fullscreen; picture-in-picture';
      iframe.allowFullscreen = true;
      screen.replaceChildren(iframe);
    }
    iframe.title = `Видео: ${v[1]}`;
    iframe.src = `https://rutube.ru/play/embed/${v[0]}/?autoplay=true&skinColor=${DATA.skin}`;
    showNow(n);
  };

  const scrollToPlayer = () => {
    const top = root.getBoundingClientRect().top;
    if (top < 0 || top > innerHeight * 0.4) {
      root.scrollIntoView({ behavior: reduced.matches ? 'auto' : 'smooth', block: 'start' });
    }
  };

  // ── Поиск по названиям: все слова запроса, без учёта регистра и «ё» ──
  // У слов отбрасывается гласное окончание, чтобы «семья» нашла «семьи» и «семью», «страхи» — «страх»
  const norm = (s) => s.toLowerCase().replace(/ё/g, 'е');
  const stem = (w) => {
    const s = w.replace(/[аеиоуыэюяйь]+$/, '');
    return s.length >= 3 ? s : w;
  };
  const index = V.map((v) => norm(v[1]));
  let timer = 0;
  const runSearch = () => {
    const words = norm(search.value).split(/[\s,.!?«»"]+/).filter(Boolean).map(stem);
    if (!words.length) {
      select(active.key, active.ch);
      return;
    }
    const found = [];
    index.forEach((t, n) => {
      if (words.every((w) => t.includes(w))) found.push(n);
    });
    plTitle.textContent = found.length ? `Найдено: ${found.length}` : 'Ничего не нашлось';
    plMeta.replaceChildren(found.length ? 'новые сверху' : 'попробуйте другое слово или выберите плейлист');
    chapters.hidden = true;
    renderList(found.slice(0, 100));
  };
  search.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(runSearch, 150);
  });
  search.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && search.value) {
      search.value = '';
      runSearch();
    }
  });

  // ── Нажатия ──
  shelf.forEach((b) => b.addEventListener('click', () => {
    select(b.dataset.vaPl);
    scrollToPlayer();
  }));
  chapters.addEventListener('click', (e) => {
    const b = e.target.closest('[data-va-ch]');
    if (b) select(active.key, b.dataset.vaCh === '' ? null : Number(b.dataset.vaCh));
  });
  list.addEventListener('click', (e) => {
    const a = e.target.closest('[data-i]');
    if (!a || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return; // в новой вкладке — как обычно
    e.preventDefault();
    play(Number(a.dataset.i));
    if (matchMedia('(max-width: 899px)').matches) scrollToPlayer();
  });
  screen.addEventListener('click', (e) => {
    if (e.target.closest('[data-va-facade]')) play(current);
  });

  // ── Видео и радио по очереди ──
  // Плеер RuTube сообщает о запуске (в том числе после паузы, нажатой внутри плеера) — тогда глушим радио
  addEventListener('message', (e) => {
    if (!iframe || e.source !== iframe.contentWindow) return;
    try {
      const msg = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
      if (msg?.type === 'player:changeState' && msg.data?.state === 'playing') window.__radioStop?.();
    } catch { /* чужое сообщение */ }
  }, { signal });
  // Включили радио — ставим видео на паузу
  addEventListener('radio:start', () => {
    iframe?.contentWindow?.postMessage(JSON.stringify({ type: 'player:pause', data: {} }), '*');
  }, { signal });
})();
