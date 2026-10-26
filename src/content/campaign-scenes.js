const pair = (uk, en) => ({ uk, en });
const beat = (id, speaker, uk, en, visual, extra = {}) => ({ id, speaker, text: pair(uk, en), visual, ...extra });
const chapter = (id, uk, en, summaryUk, summaryEn, beats) => ({ id, title: pair(uk, en), summary: pair(summaryUk, summaryEn), beats });

export const SPEAKERS = {
  narrator: pair('Оповідь', 'Narrator'), hero: pair('Герой', 'Hero'), lucky: pair('Лакі', 'Lucky'),
  blud: pair('Блуд', 'Blud'), smith: pair('Коваль', 'Blacksmith'), rusalka: pair('Русалка', 'Rusalka'),
  lesovyk: pair('Лісовик', 'Forest Spirit'), apprentice: pair('Учень', 'Apprentice'),
  upyr: pair('Упир', 'Upyr'), grandfather: pair('Дідусь', 'Grandfather'),
};

export const CAMPAIGN_RULES = {
  deadline: 'dawn', realTimer: false, heroHp: 3, abilityUsesPerBattle: 1,
  riddleAnswersRequired: 3, riddleErrorsResetProgress: false,
  healingSkipsAttack: false, healingSkipsGuard: false, healingAllowsEnemyStrike: false,
  unlockAfterCompletion: ['new-game-plus', 'library'],
  newGamePlusUnlocks: { lucky: true, tail: true, heal: true, weight: true, charm: true },
};

export const CHAPTERS = [
  chapter('intro', 'До світанку', 'Before dawn', 'Лакі, дві новини та маршрут із прахом.', 'Lucky, two pieces of news, and the ashes route.', [
    beat('intro-hello', 'lucky', 'Привіт.', 'Hello.', 'lucky', { composition: 'large-moth' }),
    beat('intro-news', 'lucky', 'Є дві новини: погана і ще гірша.', 'I have two pieces of news: bad and worse.', 'lucky'),
    beat('intro-grandfather', 'lucky', 'Погана: твій дід помер.', 'The bad news: your grandfather died.', 'diagram-death'),
    beat('intro-medium', 'lucky', 'А ще гірша — він був медіумом. Так, про це теж варто було попередити.', 'The worse news: he was a medium. Yes, someone probably should have mentioned that.', 'diagram-death'),
    beat('intro-dawn', 'lucky', 'Якщо до світанку не розвіяти його прах біля родового кургану над Десною, дід стане неупокоєним духом.', 'Unless you scatter his ashes at the ancestral burial mound above the Desna before dawn, he will become a restless spirit.', 'diagram-dawn'),
    beat('intro-route', 'lucky', 'Твій маршрут: Наддеснянська галявина, берег Десни, а потім стежка на гору до кургану.', 'Your route: Desna Glade, the Desna riverbank, then the mountain path to the burial mound.', 'diagram-route'),
    beat('intro-release', 'lucky', 'Розвій прах — і дід повернеться до пращурів. Глечик не загуби. Там, власне, дід.', 'Scatter the ashes, and he can join his ancestors. Don’t lose the urn. Your grandfather is in it.', 'diagram-urn', { transition: 'blur-inward' }),
  ]),
  chapter('movement', 'Перші кроки', 'First steps', 'Керування на галявині й ворог на перехресті.', 'Movement in the glade and an enemy at the crossroads.', [
    beat('movement-welcome', 'lucky', 'Це Наддеснянська галявина. Є три способи керування — обери зручний:\n• клацай по доступній дорозі;\n• натискай стрілки на екрані;\n• використовуй WASD або стрілки клавіатури.', 'Welcome to Desna Glade. Choose any of these three ways to move:\n• click a walkable path;\n• use the on-screen arrows;\n• use WASD or the arrow keys.', 'clearing'),
    beat('movement-enemy', 'lucky', 'Підійди до чудища на перехресті — це Прихвостень Блуда. Потренуємося.', 'Approach the creature at the crossroads — Blud’s minion. Time for some practice.', 'tutorial', { action: 'approach', enemy: 'tutorial' }),
  ]),
  chapter('tutorial', 'Перший бій', 'Your first fight', 'Один удар: голова → захист корпусу.', 'One strike: head → guard body.', [
    beat('tutorial-analogy', 'lucky', 'Бій відбувається за принципом «камінь, ножиці, папір». Треба передбачити рішення суперника: обрати, куди бити й що захищати.', 'Combat follows the principle of rock, paper, scissors. Predict your opponent: choose where to strike and what to guard.', 'tutorial-arena', { diagram: 'attack-guard' }),
    beat('tutorial-health', 'lucky', 'Влучив у незахищену зону — забрав одне здоров’я. Хто перший упав, той програв. Дуже складна наука.', 'Hit an unguarded zone and take one health point. First to fall loses. Very advanced science.', 'tutorial-arena'),
    beat('tutorial-choose', 'lucky', 'Обери удар у голову. Потім захисти корпус. Інші варіанти поки залиш мені.', 'Choose a head strike. Then guard your body. Leave the other options alone for now.', 'tutorial-arena', { action: 'battle', enemy: 'tutorial', allowedAttack: 'head', allowedGuard: 'body' }),
    beat('tutorial-done', 'lucky', 'Чудова робота. Далі розберешся сам. Я, звісно, буду поруч. Коментувати.', 'Great work. You can take it from here. I’ll be nearby, of course. Commenting.', 'clearing'),
  ]),
  chapter('lucky-gift', 'Подарунок перед Блудом', 'A gift before Blud', 'Один повний блок на кожен бій.', 'One complete block per battle.', [
    beat('blud-approach', 'narrator', '', '', 'blud-map', { action: 'approach-blud' }),
    beat('lucky-gift-praise', 'lucky', 'Малий, ти непогано справляєшся. Я тобі допоможу.', 'Kid, you’re doing well. Let me help.', 'lucky-shield'),
    beat('lucky-gift-rule', 'lucky', 'Я заблокую будь-який удар. Будеш за мною як за кам’яною стіною! Раз за бій — тож користуйся з розумом.', 'I will block any strike. You’ll be safe behind me, like behind a stone wall! Once per battle — so use it wisely.', 'lucky-shield', { action: 'unlock', unlock: 'lucky' }),
    beat('blud-challenge', 'blud', 'Дорогу шукаєш? Підійди ближче.', 'Looking for the path? Come closer.', 'clearing', { action: 'battle', enemy: 'blud' }),
    beat('blud-defeated', 'lucky', 'Стежка вільна. Далі — берег Десни.', 'The path is clear. Next stop: the Desna riverbank.', 'river', { transition: 'blur-inward' }),
  ]),
  chapter('river', 'Берег Десни', 'The Desna riverbank', 'Пірс, відмова коваля та перший удар хвостом.', 'A pier, a busy blacksmith, and the first tail strike.', [
    beat('river-arrival', 'narrator', 'За пагорбами шлях звужується до дерев’яного пірса. На ньому чекає Русалка. Біля стежки працює Коваль.', 'Beyond the hills, the path narrows to a wooden pier. A rusalka waits there. A blacksmith works beside the path.', 'river'),
    beat('river-smith-busy', 'smith', 'Справ по вуха. Зараз не допоможу.', 'I’m up to my ears in work. Can’t help you now.', 'river', { action: 'approach-smith', optional: true, condition: 'before-rusalka-rejection' }),
    beat('river-rusalka-mock', 'rusalka', 'Що це за слабак? Куди це ти зібрався?', 'Who’s this weakling? Where do you think you’re going?', 'rusalka-closeup'),
    beat('river-first-knockback', 'narrator', 'Русалка вдарила хвостом. Герой повернувся на середину берега значно швидше, ніж прийшов.', 'The rusalka struck with her tail. The hero returned to the middle of the riverbank much faster than he arrived.', 'knockback', { action: 'knockback', flag: 'rusalka-rejected', repeatWithoutDialogue: true }),
    beat('river-find-help', 'lucky', 'Схоже, розмова не склалася. Може, Коваль щось придумає?', 'That conversation went well. Perhaps the blacksmith has an idea?', 'river'),
  ]),
  chapter('smith', 'Непереборний шарм', 'Irresistible charm', 'Залицяння, спільний політ і дуже важкий талісман.', 'Flirting, a shared flight, and a very heavy talisman.', [
    beat('smith-request', 'hero', 'Знаєш, як пройти Русалку? Вона не хоче говорити й просто лупить хвостом.', 'Do you know how to get past the rusalka? She won’t talk. She just hits me with her tail.', 'river'),
    beat('smith-boast', 'smith', 'Переді мною не встоїть жодна дама. Навіть надприродна. Ходімо — покажу, як це робиться.', 'No lady can resist me. Not even a supernatural one. Come along. I’ll show you how it’s done.', 'smith-proud'),
    beat('smith-follow', 'narrator', 'Герой і Коваль разом прямують до пірса.', 'The hero and the blacksmith head to the pier together.', 'river', { action: 'follow-smith' }),
    beat('smith-flirt', 'smith', 'Красуне, моєму другу треба пройти. Ти ж не відмовиш такому красеню?', 'Beautiful, my friend needs to get through. You couldn’t turn down a handsome fellow like me, could you?', 'smith-flirt'),
    beat('smith-rusalka-reply', 'rusalka', 'Це що за самозакоханий ряжений дід? Ану котись до біса звідси!', 'Who is this self-obsessed old man in fancy dress? Get out of here!', 'rusalka-closeup'),
    beat('smith-double-knockback', 'narrator', 'Один удар хвостом — і обидва знову біля ковальського місця.', 'One sweep of her tail, and both are back at the blacksmith’s spot.', 'knockback', { action: 'knockback', targets: ['hero', 'smith'] }),
    beat('smith-excuse', 'smith', 'Все зрозуміло. Вона тебе побачила, тому й відмовила. Був би я сам — ми б пройшли.', 'That explains it. She saw you, so she refused. If I’d been alone, we’d have got through.', 'smith-bruised'),
    beat('smith-offer', 'smith', 'Гаразд, допоможу такому непопулярному невдасі. Ось талісман: з ним удар хвостом тебе не здує.', 'Fine, I’ll help an unpopular failure like you. Here’s a talisman. Her tail won’t send you flying with this.', 'smith-bruised'),
    beat('smith-weight', 'lucky', 'Коваль передав тобі 100-кілограмову гирю. Тримайся за неї — і Русалка тебе не здує. Ось тобі й талісман переконливості.', 'The blacksmith gave you a 100-kilogram weight. Hold on to it, and the rusalka won’t blow you away. A very persuasive talisman.', 'weight', { action: 'unlock', unlock: 'weight' }),
  ]),
  chapter('rusalka', 'Покровителька води', 'Patron of the waters', 'Бій, прощання й удар крізь будь-який блок.', 'A battle, a farewell, and a strike through any guard.', [
    beat('rusalka-ready', 'rusalka', 'Бачу, ти підготувався. Ну що ж — тепер поговоримо.', 'I see you came prepared. All right, let’s talk.', 'river', { action: 'battle', enemy: 'rusalka', requires: 'weight' }),
    beat('rusalka-concede', 'rusalka', 'Я б тебе ще відлупила, але ти мені не такий уже й бридкий. Тримай талісман. А я пішла плавати.', 'I could keep beating you up, but you’re not entirely awful. Take this talisman. I’m going for a swim.', 'rusalka-win'),
    beat('rusalka-dive', 'narrator', 'Отримано талісман покровительки води. Русалка пірнає в Десну, звільняючи пірс.', 'Received the Water Patron’s Talisman. The rusalka dives into the Desna, leaving the pier clear.', 'rusalka-dive'),
    beat('rusalka-tail-gift', 'lucky', 'Малий, вітаю з перемогою! Ти отримав талісман Русалки. Протестуєш — розберешся. Уперед, на фінальну локацію!', 'Congratulations, kid! You received the rusalka’s talisman. Try it — you’ll figure it out. Onward to the final location!', 'river-empty', { action: 'unlock', unlock: 'tail' }),
  ]),
  chapter('mountain', 'Стежка до кургану', 'The path to the burial mound', 'Бар’єр, три загадки та допомога Учня.', 'A barrier, three riddles, and the apprentice’s help.', [
    beat('mountain-arrival', 'narrator', 'Трава поступається інею, а стежка підіймається до засніженого кургану. Посеред дороги стоїть зігнутий старець у капюшоні.', 'Grass gives way to frost as the path climbs toward the snowy burial mound. A hunched, hooded elder stands halfway up.', 'mountain'),
    beat('mountain-elder-refusal', 'lesovyk', 'Ти ще надто слабкий, щоб кинути виклик Упирю. Далі не пропущу.', 'You are too weak to challenge the Upyr. I will not let you pass.', 'elder', { optional: true, condition: 'before-barrier' }),
    beat('mountain-barrier', 'narrator', 'Магічний бар’єр відкидає героя від стежки. Силою тут не пройти.', 'The magical barrier throws the hero back from the path. Force will not open the way.', 'barrier', { action: 'knockback', flag: 'barrier-tested' }),
    beat('mountain-riddles-intro', 'lesovyk', 'Все ж пішов? Твоя настирність мене здивувала. Покажи тепер, чи вмієш помічати те, що поруч. Три правильні відповіді — і поговоримо.', 'You tried anyway? Your persistence surprises me. Now show me whether you notice what is around you. Three correct answers, and we’ll talk.', 'elder', { action: 'riddles' }),
    beat('mountain-apprentice', 'lesovyk', 'Очі в тебе уважні. Мій учню, допоможи йому. Настав час застосувати те, чого навчився.', 'You have a keen eye. My apprentice, help him. It is time to use what you have learned.', 'apprentice'),
    beat('mountain-open', 'apprentice', 'Я розвію бар’єр. І ще дещо: один раз за бій можу повністю відновити твоє здоров’я.', 'I will dispel the barrier. And one more thing: once per battle, I can restore all your health.', 'barrier', { action: 'clear-barrier' }),
    beat('mountain-heal', 'apprentice', 'Моя допомога повністю відновлює здоров’я й не витрачає твій хід. Після лікування обирай атаку та захист як завжди. Один раз за бій.', 'My help restores all your health without using your turn. Then choose your attack and guard as usual. Once per battle.', 'apprentice', { action: 'unlock', unlock: 'heal' }),
  ]),
  chapter('upyr', 'Старець на стежці', 'The elder on the path', 'Дві форми одного ворога: 2 HP + 2 HP.', 'One enemy, two forms: 2 HP + 2 HP.', [
    beat('upyr-elder', 'upyr', 'Поспішаєш до кургану? Спершу пройди повз мене.', 'In a hurry to reach the burial mound? Get past me first.', 'upyr-cloak', { action: 'battle', enemy: 'upyr', phaseVisuals: ['upyr-cloak', 'upyr-reveal'] }),
    beat('upyr-defeated', 'lucky', 'Оце вже остання перешкода. Курган попереду. Дід зачекався.', 'That was the last obstacle. The burial mound is ahead. Your grandfather has been waiting.', 'mountain'),
  ]),
  chapter('ending', 'Повернення до пращурів', 'Returning to the ancestors', 'Прах, спокій діда й відкриття нових режимів.', 'Ashes, grandfather’s peace, and new modes unlocked.', [
    beat('ending-ashes', 'narrator', '', '', 'altar', { action: 'approach-altar' }),
    beat('ending-grandfather', 'grandfather', 'Оце мій онук!', 'That’s my grandson!', 'altar-rest', { pose: 'grandfather-thumbs-up' }),
    beat('ending-lucky', 'lucky', 'Вітаю. Ти упокоїв свого діда, і він не став злим привидом. Непогано для першої прогулянки.', 'Congratulations. You laid your grandfather to rest, and he didn’t become an angry ghost. Not bad for a first outing.', 'lucky-finale'),
    beat('ending-unlocks', 'lucky', 'Тепер доступні Нова гра+ та Бібліотека. Можеш повернутися з усіма талісманами або познайомитися з історіями персонажів.', 'New Game+ and the Library are now available. Return with every talisman, or discover the stories behind the characters.', 'lucky-finale', { action: 'completion' }),
  ]),
  chapter('credits', 'Дякую за проходження', 'Thank you for playing', 'Бейсбол, квіти та справжня місія.', 'Baseball, flowers, and the real mission.', [
    beat('credits-sunrise', 'narrator', 'Дякую за проходження. Ви встигли до світанку.', 'Thank you for playing. You made it before dawn.', 'sunrise'),
    beat('credits-proposal', 'smith', 'А якщо з квітами?..', 'What if I bring flowers?..', 'proposal'),
    beat('credits-baseball', 'narrator', 'Дякую за проходження! Навіть героям і духам іноді потрібен вихідний.', 'Thank you for playing! Even heroes and spirits need a day off.', 'baseball'),
    beat('credits-sequel', 'lucky', 'Старий, а твій малий упорався. Тепер він отримає справжню місію.', 'Old man, your boy did it. Now he gets his real mission.', 'sequel'),
    beat('credits-continue', 'narrator', 'Далі буде…', 'To be continued…', 'sequel'),
  ]),
  chapter('menu', 'Повернення', 'Return', 'Новий забіг або бібліотека персонажів.', 'Another journey, or the character library.', [
    beat('menu-return', 'narrator', 'Нова гра+ починається з усіма талісманами. У бібліотеці — персонажі, їхні ранні образи та фольклорні джерела.', 'New Game+ begins with every talisman. The Library contains characters, their early designs, and folklore sources.', 'menu'),
  ]),
];

export const NG_PLUS_DIALOGUES = {
  lucky: pair('Знову ти? Усі талісмани вже з тобою. Цього разу пояснювати не буду.', 'You again? You already have every talisman. No explanations this time.'),
  smith: pair('Знову прийшов? Гиря ж у тебе є. Про квіти Русалці не кажи.', 'Back again? You already have the weight. Don’t tell the rusalka about the flowers.'),
  rusalka: pair('Знову ти? І з гирею. Гаразд, цього разу без розминки.', 'You again? With the weight, too. Fine, no warm-up this time.'),
  lesovyk: pair('Вітаю з поверненням. Учень уже знає дорогу, а ти — відповіді. Проходьте.', 'Welcome back. My apprentice knows the way, and you know the answers. Go ahead.'),
  apprentice: pair('Я вже поруч. Допомога, як і раніше, один раз за бій.', 'I’m right here. My help is still once per battle.'),
};

// Three existing author-written riddles from RIDDLES.md; not ethnographic quotations.
export const RIDDLES = [
  {
    id: 'river', question: pair('Маю гирло, та не говорю; маю русло, та не сплю. Два береги проводжають мене всю дорогу.', 'I have a mouth but never speak; a bed but never sleep. Two banks follow me all the way.'),
    options: [{ id: 'river', text: pair('Річка', 'River') }, { id: 'ravine', text: pair('Яр', 'Ravine') }, { id: 'road', text: pair('Дорога', 'Road') }],
    answer: 'river', explanation: pair('Гирло й русло — частини річки; вода тече між берегами.', 'A mouth and a bed are parts of a river; water flows between its banks.'),
  },
  {
    id: 'echo', question: pair('Слів не знаю, але твої повторю. Сам не почну розмову й завжди відповім пізніше за тебе.', 'I know no words, but repeat yours. I never start a conversation, and always answer after you.'),
    options: [{ id: 'wind', text: pair('Вітер', 'Wind') }, { id: 'echo', text: pair('Відлуння', 'Echo') }, { id: 'owl', text: pair('Сова', 'Owl') }],
    answer: 'echo', explanation: pair('Відбитий звук повертається із затримкою.', 'Reflected sound returns after a delay.'),
  },
  {
    id: 'icicle', question: pair('Виросла вниз під стріхою, коли вода замерзла. Кореня не маю; пригріє сонце — краплями зникаю.', 'I grew downward beneath the eaves when water froze. I have no root; the warm sun makes me vanish in drops.'),
    options: [{ id: 'root', text: pair('Корінь', 'Root') }, { id: 'rope', text: pair('Мотузка', 'Rope') }, { id: 'icicle', text: pair('Бурулька', 'Icicle') }],
    answer: 'icicle', explanation: pair('Бурулька — замерзла вода, яка звисає зі стріхи й тане від тепла.', 'An icicle is frozen water that hangs from the eaves and melts in warmth.'),
  },
];

export const FOLKLORE_SOURCE = {
  author: pair('Володимир Галайчук', 'Volodymyr Halaichuk'), year: 2022,
  title: pair('Демонологічно-світоглядні уявлення та вірування поліщуків Чернігівщини', 'Demonological beliefs of the Polishchuks of Chernihiv region'),
  url: 'https://nz.lviv.ua/2022-5-7/', pdf: 'https://nz.lviv.ua/archiv/2022-5/7.pdf',
  context: pair('Польові записи з Новгород-Сіверщини, 2019. Не реконструкція вірувань X століття.', 'Field records from Novhorod-Siverskyi, 2019. Not a reconstruction of tenth-century beliefs.'),
};
const source = (pages, pdfPage) => ({ ...FOLKLORE_SOURCE, pages, url: `${FOLKLORE_SOURCE.pdf}#page=${pdfPage}` });
const original = pair('Авторський персонаж гри; етнографічний прототип не заявлений.', 'Original game character; no ethnographic prototype claimed.');

export const LIBRARY_ENTRIES = [
  { id: 'hero', name: SPEAKERS.hero, folklore: original, adaptation: pair('Онук із глечиком праху. Його подорож поєднує сімейну втрату, абсурдні зустрічі та повернення діда до пращурів.', 'A grandson carrying an urn. His journey combines family loss, absurd encounters, and his grandfather’s return to the ancestors.'), source: null },
  { id: 'lucky', name: SPEAKERS.lucky, folklore: original, adaptation: pair('Метелик-провідник, коментатор і наставник. Великий образ — для інтро, чібі — для мапи. Суперблок захищає раз за бій.', 'A moth guide, commentator, and mentor. His large form appears in the intro; the chibi form on the map. His superblock protects once per battle.'), source: null },
  { id: 'blud', name: SPEAKERS.blud,
    folklore: pair('У записах знайомий ліс раптом стає чужим: людина ходить колами й не знаходить дороги.', 'In the records, a familiar forest becomes disorienting: people walk in circles and cannot find their way.'),
    adaptation: pair('У грі це видимий супротивник біля мосту, який підманює героя пальцем. Його зовнішність і бій — наша інтерпретація.', 'In the game, a visible opponent by the bridge beckons the hero. His appearance and battle are our interpretation.'), source: source('1099–1100', 8) },
  { id: 'rusalka', name: SPEAKERS.rusalka,
    folklore: pair('Місцеві оповіді описують дівчат із розпущеним волоссям, у вінках, біля води чи в лісі; зустрічі вважали небезпечними.', 'Local accounts describe girls with loose hair and wreaths near water or in forests; encounters were considered dangerous.'),
    adaptation: pair('Риб’ячий хвіст, комедійна сцена з Ковалем і бойовий талісман — авторська фантазія. Джерело не задає наш дизайн русалки.', 'The fish tail, comedy with the blacksmith, and battle talisman are original fantasy. The source does not prescribe our rusalka’s design.'), source: source('1093–1094', 2) },
  { id: 'lesovyk', name: SPEAKERS.lesovyk,
    folklore: pair('Згадки скупі: лісовиком застерігали від походів углиб лісу.', 'Accounts are sparse: the forest spirit warned people away from the deep forest.'),
    adaptation: pair('Бар’єр, перевірка загадками й Учень додані для гри. Загадки взяті з авторського набору про природу й побут.', 'The barrier, riddles, and apprentice were added for the game. The riddles come from our own nature-and-everyday-life set.'), source: source('1095', 4) },
  { id: 'smith', name: SPEAKERS.smith, folklore: original, adaptation: pair('Самовпевнений помічник. Його «талісман» виявляється 100-кілограмовою гирею. Комедійні портрети не змінюють основний спрайт.', 'An overconfident helper whose “talisman” turns out to be a 100-kilogram weight. His comic portraits do not replace his normal sprite.'), source: null },
  { id: 'apprentice', name: SPEAKERS.apprentice, folklore: original, adaptation: pair('Учень Лісовика розвіює бар’єр і раз за бій повністю лікує героя без втрати атаки й захисту цього ходу.', 'The forest spirit’s apprentice dispels the barrier and fully heals the hero once per battle, without spending that turn’s attack or guard.'), source: null },
  { id: 'upyr', name: SPEAKERS.upyr,
    folklore: pair('Окремий опис упиря в перевіреній статті не знайдено. Потрібне додаткове джерело перед фольклорним описом.', 'No separate description of the upyr was found in the verified article. An additional source is needed before adding a folklore description.'),
    adaptation: pair('Спершу зігнутий старець у капюшоні, потім велика відкрита форма. Це один бій із двома фазами по 2 HP.', 'First a hunched hooded elder, then a large revealed form. This is one battle with two phases of 2 HP each.'), source: null, sourceStatus: 'needs-additional-source' },
  { id: 'grandfather', name: SPEAKERS.grandfather, folklore: original, adaptation: pair('Медіум із родини героя. Умова «до світанку», глечик і веселий привид із піднятим пальцем — сюжет гри, не переказ етнографічного обряду.', 'A medium in the hero’s family. The dawn deadline, urn, and cheerful thumbs-up ghost belong to the game’s story, not an ethnographic ritual.'), source: null },
];
