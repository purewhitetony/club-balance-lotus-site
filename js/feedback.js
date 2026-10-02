// Форма обратной связи. Пока у сайта нет сервера, заявка открывается письмом в почтовой программе посетителя.
// Когда появится приёмник заявок (бот Telegram, сервис форм или серверная функция),
// достаточно указать его адрес в атрибуте data-endpoint у формы — данные уйдут туда POST-запросом.
(() => {
  const form = document.querySelector('[data-feedback]');
  if (!form) return;
  const status = form.querySelector('.form__status');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!form.reportValidity()) return;
    const data = new FormData(form);
    const endpoint = form.dataset.endpoint;

    if (endpoint) {
      status.textContent = 'Отправляем…';
      try {
        const res = await fetch(endpoint, { method: 'POST', body: data });
        if (!res.ok) throw new Error(res.status);
        status.textContent = 'Спасибо! Мы свяжемся с вами.';
        form.reset();
      } catch {
        status.textContent = 'Не получилось отправить. Позвоните нам или напишите в Telegram.';
      }
      return;
    }

    const body = `Имя: ${data.get('name')}\nТелефон: ${data.get('phone')}\n\n${data.get('message') || ''}`;
    const subject = 'Вопрос с сайта клуба «Баланс»';
    location.href = `mailto:${form.dataset.mailto}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    status.textContent = 'Открываем почтовую программу, чтобы отправить письмо…';
  });
})();
