// Лотос в шапке внутренних страниц.
// Стрелки и лепестки — обычные ссылки на страницы разделов. Скрипт сначала докручивает цветок
// к выбранному лепестку, а когда поворот закончился — открывает его страницу. Новая страница
// приходит уже повёрнутой так же, поэтому цветок остаётся на месте, а меняются заголовок
// и текст (плавно — через View Transitions в site.css).
// Впереди стоит лепесток с номером cur − spin (см. --rot в site.css).
(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const prefetched = new Set();

  // Заранее подгружаем соседнюю страницу, чтобы после поворота она открылась мгновенно
  const prefetch = (href) => {
    if (!href || prefetched.has(href)) return;
    prefetched.add(href);
    document.head.append(Object.assign(document.createElement('link'), { rel: 'prefetch', href }));
  };

  document.querySelectorAll('[data-wheel]').forEach((wheel) => {
    const disc = wheel.querySelector('.wheel__disc');
    const petals = [...wheel.querySelectorAll('.wpetal')];
    const links = petals.map((p) => p.querySelector('.wpetal__link'));
    const arrows = [...wheel.querySelectorAll('[data-step]')];
    const n = links.length;
    const cur = Number(getComputedStyle(wheel).getPropertyValue('--cur')) || 0;
    let spin = 0;
    let leaving = false;

    const front = () => (((cur - spin) % n) + n) % n;

    const setSpin = (value) => {
      spin = value;
      wheel.style.setProperty('--spin', spin);
      // подписи показываем у переднего лепестка и двух его соседей
      const f = front();
      petals.forEach((p, i) => {
        const d = (i - f + n) % n;
        p.classList.toggle('is-near', d === 0 || d === 1 || d === n - 1);
      });
    };

    // ближайший к текущему повороту вариант, чтобы цветок не делал лишний круг
    const spinFor = (i) => {
      const target = cur - i;
      return target + Math.round((spin - target) / n) * n;
    };

    // Повернуть цветок к лепестку i и после поворота перейти по ссылке
    const go = (i, href) => {
      if (leaving) return;
      const target = spinFor(i);
      if (reduced.matches || target === spin) {
        location.href = href;
        return;
      }
      leaving = true;
      prefetch(href);
      setSpin(target);
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        location.href = href;
      };
      disc.addEventListener('transitionend', (e) => { if (e.target === disc) finish(); });
      setTimeout(finish, 900); // на случай, если transitionend не придёт
    };

    // Клик с модификаторами (новая вкладка и т. п.) оставляем браузеру
    const plainClick = (e) => e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;

    arrows.forEach((arrow) => {
      arrow.addEventListener('click', (e) => {
        if (!plainClick(e)) return;
        e.preventDefault();
        go((front() + Number(arrow.dataset.step) + n) % n, arrow.getAttribute('href'));
      });
      arrow.addEventListener('pointerenter', () => prefetch(arrow.getAttribute('href')));
      arrow.addEventListener('focus', () => prefetch(arrow.getAttribute('href')));
    });

    links.forEach((link, i) => {
      link.addEventListener('click', (e) => {
        if (!plainClick(e) || link.getAttribute('aria-current') === 'page') return;
        e.preventDefault();
        go(i, link.getAttribute('href'));
      });
      link.addEventListener('focus', () => {
        // при переходе с клавиатуры цветок поворачивается к выбранному лепестку, без перехода
        if (link.matches(':focus-visible') && !leaving) setSpin(spinFor(i));
      });
    });

    // Соседние страницы подгружаем, когда браузер свободен
    (window.requestIdleCallback || setTimeout)(() => arrows.forEach((a) => prefetch(a.getAttribute('href'))));

    // Возврат кнопкой «Назад» из кэша браузера: ставим цветок в исходное положение без анимации
    addEventListener('pageshow', (e) => {
      if (!e.persisted) return;
      leaving = false;
      wheel.classList.add('is-instant');
      setSpin(0);
      requestAnimationFrame(() => requestAnimationFrame(() => wheel.classList.remove('is-instant')));
    });
  });
})();
