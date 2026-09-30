// Лотос-хэдер: псевдо-3D от движения мыши и подсказка раздела в центре.
// Без JS хэдер остаётся рабочим: ссылки, hover и раскрытие сделаны на CSS.
(() => {
  const hero = document.querySelector('[data-lotus-hero]');
  if (!hero) return;

  const center = hero.querySelector('.lotus__center');
  const infoName = hero.querySelector('.center__info-name');
  const infoDesc = hero.querySelector('.center__info-desc');
  const links = [...hero.querySelectorAll('.petal__link')];

  links.forEach((link) => {
    const show = () => {
      infoName.textContent = link.dataset.name;
      infoDesc.textContent = link.dataset.desc;
      center.classList.add('is-info');
    };
    const hide = () => center.classList.remove('is-info');
    link.addEventListener('pointerenter', show);
    link.addEventListener('pointerleave', hide);
    link.addEventListener('focus', show);
    link.addEventListener('blur', hide);
  });

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

  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    update();
  }).observe(hero);
  desktop.addEventListener('change', update);
  reduced.addEventListener('change', update);
  update();
})();
