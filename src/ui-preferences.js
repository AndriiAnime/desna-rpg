const choice = (value, allowed, fallback) => allowed.includes(value) ? value : fallback;

export function readUIPreferences(search = window.location.search) {
  const query = new URLSearchParams(search);
  return {
    language: choice(query.get('lang'), ['uk', 'en'], 'uk'),
    font: choice(query.get('font'), ['condensed', 'clean', 'classic', 'hybrid'], 'hybrid'),
    feedback: choice(query.get('feedback'), ['reference', 'muted', 'outline'], 'outline'),
  };
}

export const UI_PREFERENCES = readUIPreferences();
document.documentElement.lang = UI_PREFERENCES.language;
document.documentElement.dataset.uiFont = UI_PREFERENCES.font;
document.documentElement.dataset.feedback = UI_PREFERENCES.feedback;

const COPY = {
  uk: {
    phase:'ФАЗА ДНЯ', day:'День', chapter:'ЧЕРНІГІВСЬКЕ ПОЛІССЯ', location:'Наддеснянська галявина',
    pause:'ПАУЗА', journey:'Подорож', resume:'Продовжити', howTo:'Як грати', restart:'Почати заново', lab:'Майстерня UI ↗', home:'На головну',
    mute:'Вимкнути музику', unmute:'Увімкнути музику', loading:'Готуємо стежку…', start:'Почати гру', retry:'Спробувати ще раз',
    loadError:'Не вдалося завантажити мапу. Натисни, щоб повторити.', lucky:'Лакі', narrator:'Твій супутник', next:'Далі', go:'Вирушити', understood:'Зрозуміло',
    rock:'Тут не пройти.', rockBlocked:'Камінь перекрив дорогу. Обійди нижньою стежкою.', groundBlocked:'Тут не пройти. Тримайся стежки.',
    arrived:'Ти на місці.', invalid:'Тут не пройти. Обери стежку.', unreachable:'До цього місця немає проходу.', approaching:'Підійду ближче й огляну камінь.', destination:'Ціль позначено.',
    victory:'Блуд розвіявся. Переправа вільна.', defeat:'Ти знову на стежці. Здоров’я відновлено.', battleError:'Не вдалося відкрити бій. Підійди до Блуда ще раз.',
    objective:'Камінь перекрив коротку стежку. Знайди обхід нижньою дорогою та підійди до Блуда біля мосту.', clearedObjective:'Блуд зник. Дорога до переправи відкрита.',
    steps:'Кроків', map:'Лісова галявина. Рухайтесь стрілками, WASD або натисніть на стежку.', menu:'Меню гри', controls:'Рух персонажа',
    directions:['Рух угору ліворуч','Рух угору','Рух угору праворуч','Рух ліворуч','Рух праворуч','Рух униз ліворуч','Рух униз','Рух униз праворуч'],
    tutorialTitle:'Тримайся стежки', tutorialEyebrow:'КЕРУВАННЯ', tutorialLines:[
      'Рухайся стрілками, WASD або круглими кнопками на екрані. Два напрямки разом дають рух по діагоналі.',
      'Натисни на стежку — герой піде до світлого кола. Червона позначка означає, що пройти неможливо. Новий клік змінить ціль.',
      'Камінь перекриває дорогу. Натисни на нього, щоб підійти й оглянути. Для обходу є нижня стежка.',
      'Біля мосту чекає Блуд. У бою обери удар і захист. Спочатку побачиш свою дію, потім відповідь ворога. Обидва удари обрано в одному раунді.'
    ]
  },
  en: {
    phase:'DAY PHASE', day:'Day', chapter:'CHERNIHIV POLISSIA', location:'Desna River Clearing',
    pause:'PAUSED', journey:'Journey', resume:'Continue', howTo:'How to play', restart:'Start again', lab:'UI workshop ↗', home:'Title screen',
    mute:'Mute music', unmute:'Enable music', loading:'Preparing the path…', start:'Start game', retry:'Try again',
    loadError:'The map could not load. Press to retry.', lucky:'Lucky', narrator:'Your companion', next:'Continue', go:'Set out', understood:'Understood',
    rock:'No way through here.', rockBlocked:'The boulder blocks this path. Take the lower trail.', groundBlocked:'You cannot walk here. Stay on the path.',
    arrived:'You have arrived.', invalid:'You cannot walk here. Choose a path.', unreachable:'There is no route to that spot.', approaching:'I will take a closer look at the boulder.', destination:'Destination marked.',
    victory:'Blud has faded. The crossing is clear.', defeat:'Back on the path. Your health is restored.', battleError:'The battle could not start. Approach Blud again.',
    objective:'A boulder blocks the short path. Find the lower trail and approach Blud by the bridge.', clearedObjective:'Blud is gone. The crossing is clear.',
    steps:'Steps', map:'Forest clearing. Use arrow keys, WASD or click a path.', menu:'Game menu', controls:'Character movement',
    directions:['Move up left','Move up','Move up right','Move left','Move right','Move down left','Move down','Move down right'],
    tutorialTitle:'Stay on the path', tutorialEyebrow:'HOW TO PLAY', tutorialLines:[
      'Move with arrow keys, WASD, or the round buttons on screen. Combine two directions to move diagonally.',
      'Click a path to walk towards the bright circle. A red marker means the spot is blocked. Click again to change the destination.',
      'The boulder blocks the road. Click it to approach and inspect it. The lower trail takes you around.',
      'Blud waits by the bridge. Choose where to strike and what to guard. Your action plays first, then the enemy replies. Both attacks belong to the same committed round.'
    ]
  }
};
export const UI_COPY = COPY[UI_PREFERENCES.language];

export function applyInterfaceCopy() {
  for (const element of document.querySelectorAll('[data-copy]')) {
    if (UI_COPY[element.dataset.copy]) element.textContent = UI_COPY[element.dataset.copy];
  }
  for (const link of document.querySelectorAll('[data-lab-link]')) {
    const url = new URL(link.href);
    url.searchParams.set('lang', UI_PREFERENCES.language);
    url.searchParams.set('font', UI_PREFERENCES.font);
    url.searchParams.set('feedback', UI_PREFERENCES.feedback);
    link.href = url;
  }
}
