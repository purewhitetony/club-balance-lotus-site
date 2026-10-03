// Радио Гималаи: кнопки «Слушать» управляют одним эфиром, рядом — название текущей передачи.
// Поток подключается только по нажатию и отключается на паузе, чтобы не качать звук впустую.
(() => {
  const root = document.querySelector('[data-radio]');
  if (!root) return;
  const buttons = [...document.querySelectorAll('[data-radio-play]')];
  const stream = root.dataset.stream;
  const audio = new Audio();
  audio.preload = 'none';
  let playing = false;

  const render = (state) => {
    playing = state !== 'idle';
    buttons.forEach((b) => {
      b.classList.toggle('is-playing', state === 'playing');
      b.classList.toggle('is-loading', state === 'loading');
      b.setAttribute('aria-pressed', String(playing));
      b.querySelector('.radio-play__label').textContent = playing ? 'Пауза' : 'Слушать';
    });
  };

  const stop = () => {
    audio.pause();
    audio.removeAttribute('src');
    audio.load();
    render('idle');
  };

  const start = () => {
    // Каждый раз — свежий адрес: после паузы эфир продолжается с текущего момента, а не с буфера
    audio.src = `${stream}?t=${Date.now()}`;
    render('loading');
    audio.play().catch(() => render('idle'));
  };

  audio.addEventListener('playing', () => render('playing'));
  audio.addEventListener('waiting', () => playing && render('loading'));
  audio.addEventListener('error', () => { if (playing) stop(); });
  buttons.forEach((b) => b.addEventListener('click', () => (playing ? stop() : start())));

  // ── «Сейчас в эфире»: название из статуса сервера вещания, пока вкладка открыта
  const now = root.querySelector('[data-radio-now]');
  const title = root.querySelector('[data-radio-title]');
  const status = root.dataset.status;
  if (!now || !status) return;
  const load = async () => {
    if (document.hidden) return;
    try {
      const data = await (await fetch(status, { cache: 'no-store' })).json();
      const src = [].concat(data.icestats?.source || [])[0];
      const text = (src?.title || src?.yp_currently_playing || '').replace(/\s+/g, ' ').trim();
      if (text) { title.textContent = text; now.hidden = false; }
    } catch { /* сервер недоступен — просто не показываем строку */ }
  };
  load();
  setInterval(load, 30000);
  document.addEventListener('visibilitychange', load);
})();
