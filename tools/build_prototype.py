# Генерирует prototype/index.html и prototype/razdel.html (позже это заменит цикл в компоненте Astro).
# Запуск: python tools/build_prototype.py
from pathlib import Path

HERE = Path(__file__).parent
OUT = HERE.parent / "prototype"
MEDAL = (HERE / "medallion.txt").read_text().strip()

# Тексты desc — заглушки до получения настоящих описаний разделов.
SECTIONS = [
    ("utrennie-nastrojki", "Утренние", "настройки", "Начните день в равновесии"),
    ("vechernie-vstrechi", "Вечерние", "встречи", "Тёплые разговоры в конце дня"),
    ("knigi", "Книги", "Рузова В.О.", "Читать и возвращаться к важному"),
    ("studiya-tanca", "Студия", "танца", "Движение как путь к гармонии"),
    ("onlajn-vstrechi", "Онлайн", "встречи", "С клубом из любой точки мира"),
    ("radio-gimalai", "Радио", "Гималаи", "Эфир, который настраивает"),
    ("biblioteka", "Библиотечная", "программа", "Знания, собранные для вас"),
    ("video-arhiv", "Видео", "архив", "Записи встреч и лекций"),
    ("shkola-astrologii", "Школа", "астрологии", "Учимся понимать ритмы"),
]
N = len(SECTIONS)

P_FRONT = "M0,-170C-70,-200 -182,-300 -182,-425C-182,-535 -42,-590 0,-662C42,-590 182,-535 182,-425C182,-300 70,-200 0,-170Z"
P_BACK = "M0,-200C-90,-240 -215,-360 -215,-510C-215,-650 -50,-715 0,-800C50,-715 215,-650 215,-510C215,-360 90,-240 0,-200Z"

DEFS = f"""<svg class="svg-defs" width="0" height="0" aria-hidden="true" focusable="false">
  <defs>
    <path id="p-front" d="{P_FRONT}"/>
    <path id="p-back" d="{P_BACK}"/>
    <path id="p-medal" d="{MEDAL}"/>
    <path id="p-float" d="M6,72C30,18 122,-2 194,40C170,98 78,126 6,72Z"/>
    <linearGradient id="g-front" x1="0" y1="1" x2="0" y2="0">
      <stop offset="0" stop-color="#a5468c"/><stop offset=".45" stop-color="#c665a5"/><stop offset="1" stop-color="#e3a2c7"/>
    </linearGradient>
    <radialGradient id="g-front-hi" cx=".5" cy=".42" r=".6">
      <stop offset="0" stop-color="#fff" stop-opacity=".24"/><stop offset="1" stop-color="#fff" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="g-rim" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#ffe3d2"/><stop offset=".5" stop-color="#f2a8bf"/><stop offset="1" stop-color="#ffdcc8"/>
    </linearGradient>
    <linearGradient id="g-back" x1="0" y1="1" x2="0" y2="0">
      <stop offset="0" stop-color="#5a3a92"/><stop offset="1" stop-color="#8768ba"/>
    </linearGradient>
    <linearGradient id="g-medal-edge" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#dcaee0"/><stop offset="1" stop-color="#c58ad0"/>
    </linearGradient>
    <radialGradient id="g-medal" cx=".5" cy=".42" r=".62">
      <stop offset="0" stop-color="#cf9fdd"/><stop offset="1" stop-color="#b47dc9"/>
    </radialGradient>
    <linearGradient id="g-float" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#ffe9ee"/><stop offset=".6" stop-color="#f4b3cb"/><stop offset="1" stop-color="#e687b0"/>
    </linearGradient>
  </defs>
</svg>"""

# Временный знак до получения векторного логотипа от заказчика.
LOGO = """<g fill="none" stroke="#fff" stroke-width="5">
        <circle cx="0" cy="-44" r="46"/><circle cx="31.1" cy="-31.1" r="46"/><circle cx="44" cy="0" r="46"/><circle cx="31.1" cy="31.1" r="46"/>
        <circle cx="0" cy="44" r="46"/><circle cx="-31.1" cy="31.1" r="46"/><circle cx="-44" cy="0" r="46"/><circle cx="-31.1" cy="-31.1" r="46"/>
      </g>"""


def head(title, description):
    return f"""<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{title}</title>
  <meta name="description" content="{description}">
  <link rel="stylesheet" href="css/site.css">
</head>
<body>
{DEFS}
"""


def z_of(i):
    """Порядок наложения как в исходнике: верхний лепесток поверх всех, дальше каскадом вниз."""
    return N - min(i, N - i) - (1 if i == N // 2 + 1 else 0)


def petal(i, s):
    slug, a, b, desc = s
    return f"""        <li class="petal" style="--i:{i};--r:{i * 360 // N}deg;--z:{z_of(i)}">
          <a class="petal__link" href="razdel.html" data-name="{a} {b}" data-desc="{desc}">
            <svg class="petal__hitbox" viewBox="-230 -700 460 700" aria-hidden="true" focusable="false"><use class="petal__hit" href="#p-front"/></svg>
            <span class="petal__move">
              <span class="petal__body">
                <svg class="petal__shape" viewBox="-230 -700 460 700" aria-hidden="true" focusable="false">
                  <use href="#p-front" fill="url(#g-front)"/>
                  <use href="#p-front" fill="url(#g-front-hi)"/>
                  <path class="petal__vein" d="M0,-250C-5,-380 5,-520 0,-640"/>
                  <use class="petal__rim" href="#p-front" fill="none" stroke="url(#g-rim)" stroke-width="3.5"/>
                </svg>
                <span class="petal__label"><span class="petal__num" aria-hidden="true">{i + 1}.</span> <span class="petal__name">{a} <br>{b}</span></span>
              </span>
            </span>
          </a>
        </li>"""


def uses(ref, angles):
    return "\n".join(f'          <use href="#{ref}" transform="rotate({a})"/>' for a in angles)


def float_petal(x, y, s, d, rot, blur, o, t, extra=""):
    return (f'    <span class="float{extra}" style="--x:{x}%;--y:{y}%;--s:{s};--d:{d};--rot:{rot}deg;--blur:{blur};--o:{o};--t:{t}s">'
            f'<svg viewBox="0 0 200 120"><use href="#p-float" fill="url(#g-float)"/></svg></span>')


back_angles = [20 + 40 * i for i in range(N)]
deco_order = sorted(range(N), key=z_of)
petals = "\n".join(petal(i, s) for i, s in enumerate(SECTIONS))

index = head("Клуб «Баланс»", "Клуб «Баланс»: утренние настройки, вечерние и онлайн-встречи, книги, студия танца, радио, библиотека, видеоархив и школа астрологии.") + f"""
<header class="hero" data-lotus-hero>
  <div class="hero__decor" aria-hidden="true">
{float_petal(1, 5, 120, -14, -55, 5, .8, 16)}
{float_petal(18, 3, 120, -22, 25, 2, .9, 13)}
{float_petal(-2, 40, 240, -38, 40, 1, .95, 18)}
{float_petal(4, 70, 110, -18, -10, 5, .75, 15)}
{float_petal(84, 6, 270, -42, 18, 1.5, .95, 17)}
{float_petal(75, 0, 80, -12, -35, 4, .8, 12)}
  </div>

  <div class="hero__stage">
    <div class="lotus">
      <svg class="lotus__back" viewBox="-850 -850 1700 1700" aria-hidden="true" focusable="false">
        <g fill="url(#g-back)" fill-opacity=".62" stroke="#b79ae0" stroke-opacity=".55" stroke-width="2.5">
{uses("p-back", back_angles)}
        </g>
      </svg>

      <svg class="lotus__deco" viewBox="-850 -850 1700 1700" aria-hidden="true" focusable="false">
        <g fill="url(#g-front)" stroke="url(#g-rim)" stroke-width="3.5">
{uses("p-front", [40 * i for i in deco_order])}
        </g>
      </svg>

      <nav aria-label="Разделы клуба">
        <ul class="lotus__petals">
{petals}
        </ul>
      </nav>

      <div class="lotus__center">
        <svg class="center__plate" viewBox="-330 -330 660 660" aria-hidden="true" focusable="false">
          <use class="center__hit" href="#p-medal" fill="url(#g-medal-edge)" stroke="url(#g-rim)" stroke-width="2.5"/>
          <use href="#p-medal" transform="scale(.94)" fill="none" stroke="url(#g-rim)" stroke-width="2" opacity=".8"/>
          <use href="#p-medal" transform="scale(.875)" fill="url(#g-medal)" stroke="url(#g-rim)" stroke-width="1.6"/>
        </svg>
        <svg class="center__logo" viewBox="-100 -100 200 200" aria-hidden="true" focusable="false">
      {LOGO}
        </svg>
        <h1 class="center__title">Клуб <strong>«БАЛАНС»</strong></h1>
        <div class="center__info" aria-hidden="true">
          <p class="center__info-name"></p>
          <p class="center__info-desc"></p>
        </div>
      </div>
    </div>
  </div>

  <div class="hero__decor hero__decor--front" aria-hidden="true">
{float_petal(95, 28, 150, -60, -20, 6, .85, 20)}
{float_petal(-3, 86, 190, -70, 15, 8, .8, 19)}
  </div>

  <div class="hero__aside">
    <div class="hero__resources">
      <p class="resources__title">Наши информационные ресурсы</p>
      <ul class="resources__list">
        <li><a href="#">Telegram</a></li>
        <li><a href="#">VK</a></li>
        <li><a href="#">Rutube</a></li>
        <li><a href="#">MAX</a></li>
        <li><a href="#">Instagram</a></li>
      </ul>
    </div>
    <p class="hero__quote">Жизнь — это постоянный поиск баланса</p>
  </div>
</header>

<main class="content">
  <h2>О клубе</h2>
  <p class="stub">Текст-заглушка. Основной текст главной страницы появится позже.</p>
  <p>Клуб «Баланс» объединяет девять направлений: от утренних настроек и вечерних встреч до школы астрологии. Выберите лепесток, чтобы перейти в раздел.</p>
</main>

<footer class="footer">Клуб «Баланс»</footer>

<script src="js/lotus.js" defer></script>
</body>
</html>
"""

# Внутренняя страница — пример для первого раздела.
CURRENT = 0


def nav_petal(i, s):
    slug, a, b, _ = s
    k = i - N // 2
    cur = ' aria-current="page"' if i == CURRENT else ""
    return f"""        <li class="pn__item" style="--k:{k};--z:{N - abs(k)}">
          <a class="pn__link" href="razdel.html"{cur}>
            <svg class="pn__hitbox" viewBox="-230 0 460 700" aria-hidden="true" focusable="false"><use class="pn__hit" href="#p-front" transform="rotate(180)"/></svg>
            <span class="pn__move">
              <svg class="pn__shape" viewBox="-230 0 460 700" aria-hidden="true" focusable="false">
                <g transform="rotate(180)">
                  <use href="#p-front" fill="url(#g-front)"/>
                  <use href="#p-front" fill="url(#g-front-hi)"/>
                  <use class="pn__rim" href="#p-front" fill="none" stroke="url(#g-rim)" stroke-width="4"/>
                </g>
              </svg>
              <span class="pn__label">{a} <br>{b}</span>
            </span>
          </a>
        </li>"""


cur = SECTIONS[CURRENT]
cur_name = f"{cur[1]} {cur[2]}"
nav_petals = "\n".join(nav_petal(i, s) for i, s in enumerate(SECTIONS))

razdel = head(f"{cur_name} — клуб «Баланс»", f"{cur_name} в клубе «Баланс».") + f"""
<header class="top">
  <div class="top__bar">
    <a class="top__home" href="index.html">
      <svg viewBox="-100 -100 200 200" aria-hidden="true" focusable="false">
      {LOGO}
      </svg>
      Клуб «Баланс»
    </a>
  </div>

  <nav class="pn" aria-label="Разделы клуба">
    <ul class="pn__list">
{nav_petals}
    </ul>
  </nav>

  <div class="top__title">
    <p class="crumbs"><a href="index.html">Главная</a> → {cur_name}</p>
    <h1>{cur_name}</h1>
  </div>
</header>

<main class="content">
  <p class="stub">Текст-заглушка. Описание раздела появится позже.</p>
  <p>{cur[3]}. Здесь будет основной материал раздела: расписание, записи, анонсы и всё, что относится к направлению «{cur_name}».</p>
</main>

<footer class="footer">Клуб «Баланс»</footer>
</body>
</html>
"""

(OUT / "index.html").write_text(index, encoding="utf-8", newline="\n")
(OUT / "razdel.html").write_text(razdel, encoding="utf-8", newline="\n")
print("ok", [z_of(i) for i in range(N)], deco_order)
