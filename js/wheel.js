// Лотос в шапке внутренних страниц: кнопки докручивают цветок на один лепесток,
// а при переходе по лепесткам с клавиатуры цветок сам поворачивается к выбранному.
// Впереди стоит лепесток с номером cur − spin (см. --rot в site.css).
(() => {
  document.querySelectorAll('[data-wheel]').forEach((wheel) => {
    const petals = [...wheel.querySelectorAll('.wpetal')];
    const links = petals.map((p) => p.querySelector('.wpetal__link'));
    const n = links.length;
    const cur = Number(getComputedStyle(wheel).getPropertyValue('--cur')) || 0;
    let spin = 0;

    const setSpin = (value) => {
      spin = value;
      wheel.style.setProperty('--spin', spin);
      // подписи показываем у переднего лепестка и двух его соседей
      const front = (((cur - spin) % n) + n) % n;
      petals.forEach((p, i) => {
        const d = (i - front + n) % n;
        p.classList.toggle('is-near', d === 0 || d === 1 || d === n - 1);
      });
    };

    wheel.querySelectorAll('[data-spin]').forEach((btn) => {
      btn.addEventListener('click', () => setSpin(spin + Number(btn.dataset.spin)));
    });

    links.forEach((link, i) => {
      link.addEventListener('focus', () => {
        if (!link.matches(':focus-visible')) return;
        // ближайший к текущему повороту вариант, чтобы цветок не делал лишний круг
        let target = cur - i;
        target += Math.round((spin - target) / n) * n;
        setSpin(target);
      });
    });
  });
})();
