// Лотос на главной: описание раздела в центре, псевдо-3D от движения мыши и выбор лепестка касанием.
// Без JS лотос остаётся рабочим: лепестки — обычные ссылки, наведение и раскрытие сделаны на CSS.
(() => {
  const hero = document.querySelector('[data-lotus-hero]');
  if (!hero) return;
  // Обработчики на window и document снимаются по этому сигналу, когда радио открывает
  // следующую страницу без перезагрузки (js/radio.js)
  const { signal } = (window.__page ??= new AbortController());

  const center = hero.querySelector('.lotus__center');
  const infoName = hero.querySelector('.center__info-name');
  const infoDesc = hero.querySelector('.center__info-desc');
  const go = hero.querySelector('.center__go');
  const links = [...hero.querySelectorAll('.petal__link')];

  // ── Описание раздела в центре ──
  // Мышь и клавиатура: описание при наведении или фокусе, клик сразу открывает раздел.
  // Касание: первое касание выбирает лепесток и показывает описание с кнопкой «Перейти»,
  // второе касание того же лепестка открывает раздел.
  let picked = null;
  let touch = false; // последнее нажатие было пальцем или пером, а не мышью

  const show = (link) => {
    infoName.textContent = link.dataset.name;
    infoDesc.textContent = link.dataset.desc;
    center.classList.add('is-info');
  };
  const hide = () => {
    if (picked) show(picked);
    else center.classList.remove('is-info');
  };
  const pick = (link) => {
    picked?.classList.remove('is-picked');
    picked = link;
    center.classList.toggle('is-picked', !!link);
    if (!link) { hide(); return; }
    link.classList.add('is-picked');
    go.href = link.href;
    show(link);
  };

  hero.addEventListener('pointerdown', (e) => { touch = e.pointerType !== 'mouse'; }, true);
  links.forEach((link) => {
    link.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') show(link); });
    link.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') hide(); });
    link.addEventListener('focus', () => { if (link.matches(':focus-visible')) show(link); });
    link.addEventListener('blur', hide);
    link.addEventListener('click', (e) => {
      const tap = touch;
      touch = false; // Enter с клавиатуры после касания — уже не касание
      if (!tap || picked === link) return;
      e.preventDefault();
      pick(link);
    });
  });
  // Касание мимо лепестков снимает выбор
  document.addEventListener('click', (e) => {
    if (picked && !e.target.closest('.petal__link, .center__go')) pick(null);
  }, { signal });
  // Возврат «Назад» из кэша: цветок снова в исходном виде
  addEventListener('pageshow', (e) => { if (e.persisted) pick(null); }, { signal });

  // ── Псевдо-3D на десктопе ──
  const desktop = matchMedia('(min-width: 900px) and (hover: hover) and (pointer: fine)');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');

  const EASE = 0.07; // доля пути к курсору за кадр — даёт плавное «догоняние»
  const PETAL_STEP = (2 * Math.PI) / links.length;
  let targetX = 0, targetY = 0, x = 0, y = 0;
  let raf = 0, visible = true;

  const onMove = (e) => {
    const r = hero.getBoundingClientRect();
    targetX = ((e.clientX - r.left) / r.width - 0.5) * 2;
    targetY = ((e.clientY - r.top) / r.height - 0.5) * 2;
  };
  const onLeave = () => { targetX = 0; targetY = 0; };

  const frame = (now) => {
    x += (targetX - x) * EASE;
    y += (targetY - y) * EASE;
    hero.style.setProperty('--mx', x.toFixed(4));
    hero.style.setProperty('--my', y.toFixed(4));

    // Лепестки, смотрящие в сторону курсора, слегка вытягиваются к нему,
    // остальные подворачиваются; поверх — медленное «дыхание».
    const mag = Math.min(1, Math.hypot(x, y));
    const ang = Math.atan2(y, x);
    const t = now / 1000;
    links.forEach((link, i) => {
      const dir = i * PETAL_STEP - Math.PI / 2;
      const along = Math.cos(dir - ang) * mag;
      const across = Math.sin(ang - dir) * mag;
      const breath = Math.sin(t * 0.8 + i * 1.7);
      link.style.setProperty('--ty', (along * -14 + breath * 2).toFixed(2));
      link.style.setProperty('--tw', (across * 1.6 + breath * 0.35).toFixed(3) + 'deg');
    });

    raf = requestAnimationFrame(frame);
  };

  const reset = () => {
    hero.style.removeProperty('--mx');
    hero.style.removeProperty('--my');
    links.forEach((link) => {
      link.style.removeProperty('--ty');
      link.style.removeProperty('--tw');
    });
  };

  const update = () => {
    const on = desktop.matches && !reduced.matches && visible;
    if (on && !raf) {
      hero.addEventListener('pointermove', onMove);
      hero.addEventListener('pointerleave', onLeave);
      raf = requestAnimationFrame(frame);
    } else if (!on && raf) {
      hero.removeEventListener('pointermove', onMove);
      hero.removeEventListener('pointerleave', onLeave);
      cancelAnimationFrame(raf);
      raf = 0;
      if (!desktop.matches || reduced.matches) reset();
    }
  };

  const io = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    update();
  });
  io.observe(hero);
  desktop.addEventListener('change', update, { signal });
  reduced.addEventListener('change', update, { signal });
  signal.addEventListener('abort', () => {
    io.disconnect();
    cancelAnimationFrame(raf);
  });
  update();
})();
