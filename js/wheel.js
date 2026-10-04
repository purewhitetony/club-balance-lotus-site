// Лотос в шапке внутренних страниц.
// Лепестки — обычные ссылки на страницы разделов. Скрипт сначала докручивает цветок к выбранному
// лепестку, а когда поворот закончился — открывает его страницу. Новая страница приходит уже
// повёрнутой так же, поэтому цветок остаётся на месте, а меняются заголовок и текст
// (плавно — через View Transitions в site.css).
// На телефоне цветок крутится и свайпом: он поворачивается вслед за пальцем, а отпущенный
// встаёт ровно на соседний лепесток (на один шаг) и открывает его раздел.
// Впереди стоит лепесток с номером cur − spin (см. --rot в site.css).
(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  // Обработчики на window и document снимаются по этому сигналу, когда радио открывает
  // следующую страницу без перезагрузки (js/radio.js)
  const { signal } = (window.__page ??= new AbortController());
  const mobile = matchMedia('(max-width: 899px)');
  const prefetched = new Set();
  // Пока играет радио, переход делает js/radio.js — без перезагрузки, чтобы не прервать эфир
  const leave = (href) => { if (!window.__radioNav?.(href)) location.href = href; };

  const STEP = 40; // градусов между лепестками
  const COMMIT = STEP / 3; // на сколько нужно довернуть пальцем, чтобы перейти к соседу

  // Заранее подгружаем соседние страницы, чтобы после поворота они открылись мгновенно
  const prefetch = (href) => {
    if (!href || prefetched.has(href)) return;
    prefetched.add(href);
    document.head.append(Object.assign(document.createElement('link'), { rel: 'prefetch', href }));
  };

  document.querySelectorAll('[data-wheel]').forEach((wheel) => {
    const disc = wheel.querySelector('.wheel__disc');
    const petals = [...wheel.querySelectorAll('.wpetal')];
    const links = petals.map((p) => p.querySelector('.wpetal__link'));
    const n = links.length;
    const cur = Number(getComputedStyle(wheel).getPropertyValue('--cur')) || 0;
    let spin = 0;
    let leaving = false;

    const front = () => (((cur - spin) % n) + n) % n;
    const hrefOf = (i) => links[i].getAttribute('href');

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
        leave(href);
        return;
      }
      leaving = true;
      prefetch(href);
      setSpin(target);
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        leave(href);
      };
      disc.addEventListener('transitionend', (e) => { if (e.target === disc) finish(); });
      setTimeout(finish, 900); // на случай, если transitionend не придёт
    };

    // Клик с модификаторами (новая вкладка и т. п.) оставляем браузеру
    const plainClick = (e) => e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;

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

    // ── Свайп на телефоне ──
    // Палец тянет нижний край цветка: вправо — цветок поворачивается против часовой стрелки
    // и вперёд выходит лепесток слева («следующий»), влево — наоборот. Не больше одного шага.
    let drag = null;
    let swallowClick = false;
    // Радиус, на котором палец «держит» цветок: середина видимой части лепестков
    const radius = () => links[0].offsetHeight * (560 / 700);
    const setDrag = (deg) => wheel.style.setProperty('--drag', `${deg}deg`);

    wheel.addEventListener('pointerdown', (e) => {
      if (!mobile.matches || leaving || !e.isPrimary || (e.pointerType === 'mouse' && e.button !== 0)) return;
      drag = { id: e.pointerId, x0: e.clientX, y0: e.clientY, deg: 0, active: false };
    });

    wheel.addEventListener('pointermove', (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      const dx = e.clientX - drag.x0;
      const dy = e.clientY - drag.y0;
      if (!drag.active) {
        // Пока движение короткое или больше вертикальное, это касание лепестка или прокрутка страницы
        if (Math.abs(dx) < 10 || Math.abs(dx) < Math.abs(dy)) return;
        drag.active = true;
        try { wheel.setPointerCapture(e.pointerId); } catch { /* указатель уже отпущен */ }
        wheel.classList.add('is-dragging');
      }
      let deg = (-dx / radius()) * (180 / Math.PI);
      // дальше одного шага цветок идёт туго — понятно, что больше одного лепестка за раз не прокрутить
      if (Math.abs(deg) > STEP) deg = Math.sign(deg) * (STEP + (Math.abs(deg) - STEP) * 0.2);
      drag.deg = deg;
      setDrag(deg);
    });

    const end = (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      const { active, deg } = drag;
      drag = null;
      if (!active) return;
      // Касание превратилось в свайп — клик по лепестку под пальцем не засчитываем
      swallowClick = true;
      setTimeout(() => { swallowClick = false; }, 0);
      // Снятие --drag и новый поворот — в одном кадре: цветок доезжает до места плавно
      wheel.classList.remove('is-dragging');
      setDrag(0);
      const step = e.type === 'pointercancel' ? 0 : deg <= -COMMIT ? 1 : deg >= COMMIT ? -1 : 0;
      if (step) {
        const i = (front() + step + n) % n;
        go(i, hrefOf(i));
      }
    };
    wheel.addEventListener('pointerup', end);
    wheel.addEventListener('pointercancel', end);
    wheel.addEventListener('click', (e) => {
      if (!swallowClick) return;
      e.preventDefault();
      e.stopPropagation();
    }, true);

    // Соседние страницы подгружаем, когда браузер свободен
    (window.requestIdleCallback || setTimeout)(() => {
      prefetch(hrefOf((front() + 1) % n));
      prefetch(hrefOf((front() - 1 + n) % n));
    });

    // Возврат кнопкой «Назад» из кэша браузера: ставим цветок в исходное положение без анимации
    addEventListener('pageshow', (e) => {
      if (!e.persisted) return;
      leaving = false;
      wheel.classList.add('is-instant');
      setDrag(0);
      setSpin(0);
      requestAnimationFrame(() => requestAnimationFrame(() => wheel.classList.remove('is-instant')));
    }, { signal });
  });
})();
