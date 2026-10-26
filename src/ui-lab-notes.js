// Review annotations describe visual inspiration separately from the actual assets.
export const LAB_NOTES = {
  uk: {
    titleLabel: 'Назва гри',
    titles: { unmourned: 'Невідспівані', rebirth: 'Друге народження богів' },
    legendTitle: 'Звідки взято ідею',
    legendIntro: 'Позначка гри означає напрям оформлення. Назву шрифту та його походження вказано окремо під кожним зразком.',
    legend: [
      ['smt', 'Shin Megami Tensei V', 'Виразний текст, простір сцени, повідомлення про хід і результат удару.'],
      ['persona', 'Persona 2', 'Портрет над діалогом, темне вікно, контрастні рамки та схематичні значки.'],
      ['own', 'Наша адаптація', 'Кирилиця, пряме накреслення, лісові кольори та читабельність на телефоні.'],
    ],
    labels: { font: 'Шрифт у зразку', idea: 'Ідея', change: 'Наше рішення' },
    fonts: {
      condensed: { tone: 'smt', direction: 'Ближче до SMT V', font: 'Roboto Condensed · назва, підназва й репліки. Google Fonts, локальний файл.', idea: 'Компактний виразний текст у напрямі SMT V.', change: 'Наш шрифтовий аналог із українськими літерами та без курсиву; не шрифт із гри.' },
      clean: { tone: 'own', direction: 'Наш варіант · читабельність', font: 'Roboto · назва, підназва й репліки. Google Fonts, локальний файл.', idea: 'Стриманий текст і вільніший рядок для малого екрана.', change: 'Самостійна альтернатива для порівняння. Не відтворює конкретний шрифт SMT V чи Persona 2.' },
      classic: { tone: 'own', direction: 'Наш варіант · літературний', font: 'Georgia · назва, підназва й репліки. Системний шрифт; запасний — Times New Roman / serif.', idea: 'Книжковий, міфологічний тон поруч із діалоговим напрямом Persona 2.', change: 'Це наш експеримент із зарубками, не шрифт Persona 2. На різних пристроях вигляд може відрізнятися.' },
      hybrid: { tone: 'mix', direction: 'Наше поєднання · акцент SMT V', font: 'Roboto Condensed · назва; Roboto · підназва й репліки. Обидва з Google Fonts, локальні файли.', idea: 'Щільна назва у напрямі SMT V та спокійніший основний текст.', change: 'Шрифти обрано нами. У діалогах нижче вони поєднуються з композицією Persona 2 або SMT V.' },
      heritage: { tone: 'own', direction: 'Погоджене поєднання · варіант 3 + 2', font: 'Georgia · слово «Невідспівані»; Roboto · «Прах над Десною» та репліки.', idea: 'Назва з «Тихої класики» та чистий основний текст із «Чистого голосу».', change: 'Поєднання обрав Андрій. Основний напрям тепер цей; попередні чотири варіанти залишаються для порівняння.' },
    },
    dialogues: {
      map: { name: 'Портрет і репліка', tone: 'persona', direction: 'Композиція Persona 2', idea: 'Великий портрет зліва над нижнім темним вікном, червона верхня лінія, зелене ім’я та біла репліка.', change: 'Наш Лакі, наша мапа й обраний шрифт. З референсу взято розташування елементів, не оригінальний шрифт.' },
      prebattle: { name: 'Розмова в сцені', tone: 'smt', direction: 'Композиція SMT V', idea: 'Обидва персонажі залишаються в сцені; знизу — м’яке затемнення, ім’я та білий текст по центру.', change: 'Наші спрайти до пояса, приглушений ліс і обраний шрифт. Це адаптація композиції з наданого відео.' },
    },
    skins: {
      veil: { tone: 'own', direction: 'Наш варіант · статична текстура', idea: 'Нижня напівпрозора підкладка з наданого smt dialog; звичайна репліка замість заголовкового тексту.', change: 'Нерухомі ромби, темно-зелена текстура та окрема плашка імені. Текстура створена для нашого UI, без перенесення графіки гри.' },
      drift: { tone: 'mix', direction: 'SMT V + рухома геометрія', idea: 'Текст залишається нерухомим і читабельним, а фон має ледь помітну динаміку.', change: 'Прямокутники повільно зміщуються й обертаються; окрема плашка імені. Рух вимикається кнопкою або системним reduced motion.' },
      orbit: { tone: 'smt', direction: 'Ближче до smt boxes', idea: 'Прямокутна форма, світлий край, темна середина й орнамент із кіл у наданому асеті.', change: 'Залишено одну орбіту зліва; наш зеленуватий колір і нова плашка імені. Відтворена ідея, не скопійований бокс.' },
    },
    palettes: {
      reference: { tone: 'smt', direction: 'Найближче до зразка SMT V', font: 'Roboto Condensed · жирний, із програмним нахилом. Окремий курсивний файл не використовується.', idea: 'Яскраві кольори, темний контур і нахил написів CRITICAL / MISS / GUARD із наданого UI-референсу.', change: 'Текст набрано заново українською й англійською. Це обрана яскрава палітра; назви ходів залишено прямими.' },
      muted: { tone: 'mix', direction: 'SMT V + наша палітра', font: 'Roboto Condensed · жирний, прямий. Google Fonts, локальний файл.', idea: 'Та сама виразність і типи повідомлень, що у зразку SMT V.', change: 'Зелений замість салатового, приглушені бузковий і мідний; без курсиву.' },
      outline: { tone: 'mix', direction: 'SMT V × Persona 2 · наша інтерпретація', font: 'Roboto Condensed · жирний, прямий. Google Fonts, локальний файл.', idea: 'Форма бойового повідомлення — від SMT V; білий знак і колір по контуру — наша інтерпретація контрастних елементів Persona 2.', change: 'Біла заливка, кольорова обводка й лісові акценти. Це нове поєднання, не готовий елемент із Persona 2.' },
    },
    pacing: { tone: 'smt', direction: 'Подача SMT V · наш темп', font: 'Roboto Condensed · повідомлення та назви ходів. Вибір шрифту вище їх не змінює.', idea: 'Окреме оголошення ходу на прямокутній підкладці: поява, легке збільшення, утримання й зникнення; потім удар і результат біля цілі.', change: 'Hero Turn замість Player Turn. Наш візерунок та паузи; механіку SMT V не копіюємо. Анімацію масштабу вимкнено за reduced motion.' },
    icons: { tone: 'persona', direction: 'Значки за мотивами Persona 2', idea: 'Схематична голова / корпус поруч із мечем або щитом у кнопках справжнього бою.', change: 'Наші SVG-значки та анімація торкання мечем, намальовані за ідеєю наданих піктограм; не вирізані спрайти Persona 2.' },
    sourcesTitle: 'Джерела та точність підписів',
    sourcesText: 'Оригінальні гарнітури SMT V і Persona 2 тут не визначено й не підключено. З ігор беремо візуальні ідеї з твоїх зображень і записів; назви Roboto, Roboto Condensed і Georgia описують саме те, чим відображаються наші зразки.',
    sourcesFonts: 'Roboto / Roboto Condensed: Google Fonts, ліцензія SIL Open Font License 1.1. У локальних файлах перевірено українські літери, включно з Ґ, Є, І, Ї. Georgia залежить від системи пристрою.',
    sourcesReference: 'Відкрити попередній UI Kit',
  },
  en: {
    titleLabel: 'Game title',
    titles: { unmourned: 'The Unmourned', rebirth: 'The Second Birth of the Gods' },
    legendTitle: 'Where the ideas come from',
    legendIntro: 'A game badge identifies a visual direction. The actual typeface and its origin are listed separately beneath each sample.',
    legend: [
      ['smt', 'Shin Megami Tensei V', 'Expressive text, room for the scene, turn announcements and impact feedback.'],
      ['persona', 'Persona 2', 'Portraits above dialogue, dark windows, contrasting frames and schematic icons.'],
      ['own', 'Our adaptation', 'Ukrainian characters, upright lettering, forest colours and phone readability.'],
    ],
    labels: { font: 'Typeface in this sample', idea: 'Inspiration', change: 'Our adaptation' },
    fonts: {
      condensed: { tone: 'smt', direction: 'Closer to SMT V', font: 'Roboto Condensed · title, subtitle and dialogue. Google Fonts, stored locally.', idea: 'Compact, expressive text in an SMT V-inspired direction.', change: 'Our upright alternative with Ukrainian characters; not a font extracted from the game.' },
      clean: { tone: 'own', direction: 'Our direction · readability', font: 'Roboto · title, subtitle and dialogue. Google Fonts, stored locally.', idea: 'Restrained text and a more open line for small screens.', change: 'An independent comparison option. It does not recreate a specific SMT V or Persona 2 typeface.' },
      classic: { tone: 'own', direction: 'Our direction · literary', font: 'Georgia · title, subtitle and dialogue. System font; fallback: Times New Roman / serif.', idea: 'A literary, mythological tone alongside the Persona 2 dialogue direction.', change: 'Our serif experiment, not the Persona 2 font. Its appearance may vary between devices.' },
      hybrid: { tone: 'mix', direction: 'Our combination · SMT V accent', font: 'Roboto Condensed · title; Roboto · subtitle and dialogue. Both from Google Fonts, stored locally.', idea: 'An SMT V-inspired compact heading with calmer body text.', change: 'Our font choices combine with either the Persona 2 or SMT V composition in the dialogue samples below.' },
      heritage: { tone: 'own', direction: 'Chosen combination · option 3 + 2', font: 'Georgia · The Unmourned; Roboto · Ashes over the Desna and dialogue.', idea: 'The Quiet classic title paired with the clear body text from A clear voice.', change: 'Chosen by Andrii as the main direction. The previous four alternatives remain available for comparison.' },
    },
    dialogues: {
      map: { name: 'Portrait and reply', tone: 'persona', direction: 'Persona 2 composition', idea: 'A large left portrait above a dark lower panel, a red top rule, a green speaker name and white dialogue.', change: 'Our Lucky, map and selected typeface. The reference informs the arrangement, not the font file.' },
      prebattle: { name: 'Conversation in the scene', tone: 'smt', direction: 'SMT V composition', idea: 'Both characters remain in the scene, with a soft lower gradient, speaker name and centred white text.', change: 'Our waist-up sprites, muted forest and selected typeface. The composition adapts your video reference.' },
    },
    skins: {
      veil: { tone: 'own', direction: 'Our direction · still texture', idea: 'The translucent lower panel from your smt dialog reference, with regular dialogue instead of heading-like text.', change: 'Still diamonds, a dark green texture and a separate nameplate. The pattern is made for our UI, not copied game artwork.' },
      drift: { tone: 'mix', direction: 'SMT V + moving geometry', idea: 'Text stays still and readable while the background gains a little motion.', change: 'Rectangles slowly drift and turn beneath a separate speaker plate. Motion can be paused or disabled through reduced motion.' },
      orbit: { tone: 'smt', direction: 'Closer to smt boxes', idea: 'The rectangular shape, luminous edge, dark centre and circle ornaments in your supplied sheet.', change: 'A single orbit on the left, our green tint and a new nameplate. It adapts the idea rather than copying the box.' },
    },
    palettes: {
      reference: { tone: 'smt', direction: 'Closest to the SMT V sample', font: 'Roboto Condensed · bold with a synthetic slant. No separate italic font file is used.', idea: 'Bright colours, dark outlines and slanted CRITICAL / MISS / GUARD labels from your UI reference.', change: 'Text is recreated in Ukrainian and English. This is the chosen bright palette; turn labels remain upright.' },
      muted: { tone: 'mix', direction: 'SMT V + our palette', font: 'Roboto Condensed · bold, upright. Google Fonts, stored locally.', idea: 'The expressive impact labels and message types of the SMT V reference.', change: 'Forest green replaces lime, with muted mauve and copper. No italics.' },
      outline: { tone: 'mix', direction: 'SMT V × Persona 2 · our interpretation', font: 'Roboto Condensed · bold, upright. Google Fonts, stored locally.', idea: 'Impact-message form from SMT V; white symbols with coloured edges are our interpretation of Persona 2’s contrasting elements.', change: 'White fill, coloured outlines and forest accents. A new combination, not a ready-made Persona 2 element.' },
    },
    pacing: { tone: 'smt', direction: 'SMT V presentation · our timing', font: 'Roboto Condensed · impact and turn labels. The font selector above does not change these.', idea: 'A separate rectangular turn band: reveal, slight enlargement, hold and fade, followed by an attack and feedback beside the target.', change: 'Hero Turn replaces Player Turn. Our pattern and pauses; SMT V’s combat system is not copied. Reduced motion removes the scaling animation.' },
    icons: { tone: 'persona', direction: 'Icons inspired by Persona 2', idea: 'A schematic head / torso beside a sword or shield in the real battle buttons.', change: 'Our SVG icons and sword-contact animation, drawn from the idea of your reference icons; not cropped Persona 2 sprites.' },
    sourcesTitle: 'Sources and attribution',
    sourcesText: 'The original SMT V and Persona 2 typefaces have not been identified or loaded here. Your screenshots and recordings inform visual ideas; Roboto, Roboto Condensed and Georgia name the actual fonts used in our samples.',
    sourcesFonts: 'Roboto / Roboto Condensed: Google Fonts, SIL Open Font License 1.1. The local files have verified Ukrainian glyphs, including Ґ, Є, І and Ї. Georgia depends on the device’s system fonts.',
    sourcesReference: 'Open the previous UI Kit',
  },
};

export function directionBadge(note) {
  return `<span class="lab-direction lab-direction--${note.tone}">${note.direction}</span>`;
}

export function provenanceNote(note, language, font = note.font) {
  const labels = LAB_NOTES[language].labels;
  const rows = [[labels.font, font], [labels.idea, note.idea], [labels.change, note.change]].filter(([, value]) => value);
  return `<div class="lab-provenance">${directionBadge(note)}<dl>${rows.map(([label, value]) => `<div><dt>${label}</dt><dd>${value}</dd></div>`).join('')}</dl></div>`;
}
