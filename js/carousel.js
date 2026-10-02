// Карусель фото: прокрутка со «щелчком» на CSS (scroll-snap), кнопки листают на ширину видимой области.
// Без JS лента всё равно прокручивается пальцем, колесом и клавиатурой.
(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');

  document.querySelectorAll('[data-carousel]').forEach((carousel) => {
    const track = carousel.querySelector('.carousel__track');
    const prev = carousel.querySelector('[data-dir="-1"]');
    const next = carousel.querySelector('[data-dir="1"]');

    const update = () => {
      const max = track.scrollWidth - track.clientWidth - 2;
      prev.disabled = track.scrollLeft <= 2;
      next.disabled = track.scrollLeft >= max;
    };

    carousel.querySelectorAll('.carousel__btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        track.scrollBy({
          left: Number(btn.dataset.dir) * track.clientWidth * 0.8,
          behavior: reduced.matches ? 'auto' : 'smooth',
        });
      });
    });

    track.addEventListener('scroll', update, { passive: true });
    addEventListener('resize', update);
    update();
  });
})();
