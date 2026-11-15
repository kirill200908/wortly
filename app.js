(() => {
  'use strict';
  const C = window.Wortly;
  const $ = (q, el = document) => el.querySelector(q);
  const $$ = (q, el = document) => [...el.querySelectorAll(q)];
  const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const iconPaths = {
    home:'<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',
    book:'<path d="M12 5C9 3 5 3 2 4v15c3-1 7-1 10 1 3-2 7-2 10-1V4c-3-1-7-1-10 1Zm0 0v15"/>',
    sparkles:'<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5zM20 2v4m-2-2h4M3 18v4m-2-2h4"/>',
    chart:'<path d="M4 3v18h17M8 16v-4m5 4V8m5 8V5"/>',
    help:'<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.3 2.4c-.8.3-.8 1.3-.8 2.1M12 17h.01"/>',
    flame:'<path d="M12 2c1 5 6 6 6 12a6 6 0 1 1-12 0c0-3 2-5 3-6 0 3 1 4 2 4 1-3 1-6 1-10Z"/>',
    plus:'<path d="M12 5v14M5 12h14"/>',
    arrow:'<path d="M4 12h16m-6-6 6 6-6 6"/>',
    back:'<path d="M20 12H4m6-6-6 6 6 6"/>',
    check:'<path d="m5 12 4 4L19 6"/>',
    close:'<path d="m6 6 12 12M6 18 18 6"/>',
    search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
    clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    layers:'<rect x="7" y="6" width="13" height="15" rx="2"/><path d="M16 3H5a2 2 0 0 0-2 2v12m8-6h5m-5 4h3"/>',
    choices:'<rect x="3" y="3" width="18" height="18" rx="3"/><path d="m7 8 1 1 2-2m-3 7 1 1 2-2m3-5h4m-4 6h4"/>',
    keyboard:'<rect x="2" y="5" width="20" height="14" rx="3"/><path d="M6 9h.01M10 9h.01M14 9h.01M18 9h.01M6 12h.01M10 12h.01M14 12h.01M18 12h.01M7 15h10"/>',
    match:'<rect x="2" y="4" width="7" height="7" rx="2"/><rect x="15" y="13" width="7" height="7" rx="2"/><path d="M15 4h4a2 2 0 0 1 2 2v2M3 16v2a2 2 0 0 0 2 2h4m0-12 6 8"/>',
    sound:'<path d="m11 4-6 5H2v6h3l6 5zm4 4a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
    edit:'<path d="m16 3 5 5-12 12-6 1 1-6zM13 6l5 5"/>',
    trash:'<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7"/>',
    download:'<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
    upload:'<path d="M12 16V4m-5 5 5-5 5 5M4 16v5h16v-5"/>',
    shield:'<path d="m12 2 8 4v6c0 5-8 10-8 10S4 17 4 12V6zM8 11l3 3 5-5"/>',
    target:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
    leaf:'<path d="M20 3C9 1 2 7 5 15c8 5 17-2 15-12ZM3 21 15 9"/>',
  };
  const ico = (name, cls = '') => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${iconPaths[name] || iconPaths.sparkles}</svg>`;
  function hydrateIcons(el = document) { $$('[data-icon]', el).forEach(e => {e.innerHTML = ico(e.dataset.icon); e.removeAttribute('data-icon');}); }
  const KEY = 'wortly-v1';
  const starters = [['das Haus','дом'],['die Sonne','солнце'],['lernen','учить'],['die Freiheit','свобода'],['das Wasser','вода'],['die Reise','путешествие'],['sprechen','говорить'],['der Freund','друг'],['glücklich','счастливый'],['die Zeit','время'],['verstehen','понимать'],['der Morgen','утро']];
  let data, storageError = false;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {data = JSON.parse(raw); if (!C.validBackup(data)) throw new Error('invalid data');}
    else {data = {schema:1, words:starters.map(([de,ru]) => C.makeWord(de,ru,'Стартовый набор')), history:[]}; localStorage.setItem(KEY,JSON.stringify(data));}
  } catch (error) {
    storageError = true;
    data = {schema:1,words:[],history:[]};
    // Preserve unreadable data instead of silently overwriting the user's dictionary.
  }
  let page = 'overview', filter = 'all', search = '', deckFilter = 'all', tablePage = 0;
  let settings = {deck:'all',direction:'de-ru',count:10};
  let session = null, toastTimer, pendingConfirm;
  const main = $('#main-content');
  const names = {overview:'Обзор',dictionary:'Мой словарь',practice:'Тренировка',progress:'Мой прогресс'};
  const modes = [
    {id:'cards',icon:'layers',title:'Карточки',desc:'Вспомни перевод и переверни карточку.',tag:'Знакомство',time:'Без спешки'},
    {id:'choice',icon:'choices',title:'Выбери перевод',desc:'Один правильный ответ из нескольких.',tag:'Быстрый старт',time:'≈ 3 минуты'},
    {id:'typing',icon:'keyboard',title:'Напиши ответ',desc:'Вспомни слово без подсказок.',tag:'Проверь себя',time:'≈ 5 минут'},
    {id:'match',icon:'match',title:'Найди пару',desc:'Соедини слова и их переводы.',tag:'Игра на память',time:'≈ 2 минуты'},
  ];
  const shuffle = list => {const a = [...list]; for (let i = a.length - 1; i > 0; i--) {const j = Math.floor(Math.random() * (i + 1)); [a[i],a[j]]=[a[j],a[i]];} return a;};
  const decks = () => [...new Set(data.words.map(w => w.deck))].sort((a,b) => a.localeCompare(b,'ru'));
  function persist() {
    if (storageError) return false;
    try {localStorage.setItem(KEY,JSON.stringify(data)); return true;}
    catch {storageError = true; toast('Не удалось сохранить изменения. Скачайте резервную копию.'); return false;}
  }
  function toast(message) {const el=$('#toast'); el.textContent=message; el.classList.add('visible'); clearTimeout(toastTimer); toastTimer=setTimeout(()=>el.classList.remove('visible'),4500);}
  function showDialog(id) {const d = $('#'+id); d.showModal(); hydrateIcons(d);}
  function confirmAction(title, message, action, label = 'Удалить') {$('#confirm-title').textContent=title; $('#confirm-message').textContent=message; $('#confirm-yes').textContent=label; pendingConfirm=action; showDialog('confirm-dialog');}
  function metrics() {
    const mastered=data.words.filter(w=>C.status(w)==='mastered').length;
    const learning=data.words.filter(w=>C.status(w)==='learning').length;
    const due=data.words.filter(w=>w.attempts&&w.due<=Date.now()).length;
    const today=data.history.filter(h=>h.date===C.dateKey());
    return {total:data.words.length,mastered,learning,newCount:data.words.length-mastered-learning,due,today:today.length,todayWords:new Set(today.map(h=>h.id)).size,accuracy:data.history.length?Math.round(100*data.history.filter(h=>h.correct).length/data.history.length):0};
  }
  function headerUpdate() {const n=C.streak(data.history),mod=n%100,day=mod>=11&&mod<=14?'дней':n%10===1?'день':n%10>=2&&n%10<=4?'дня':'дней'; $('#nav-word-count').textContent=data.words.length; $('#streak-number').textContent=n; $('.streak-text').textContent=day+' подряд'; $('#page-label').textContent=names[page]; $$('[data-nav]').forEach(e=>{e.classList.toggle('active',e.dataset.nav===page); if(e.dataset.nav===page)e.setAttribute('aria-current','page');else e.removeAttribute('aria-current');});}
  function navigate(next) {
    if (!names[next]) next='overview';
    if (session && !session.finished) {confirmAction('Завершить тренировку?','Уже проверенные ответы сохранены. Оставшиеся слова можно повторить позже.',()=>{session=null; setPage(next);},'Завершить'); return;}
    session=null; setPage(next);
  }
  function setPage(next) {page=next; history.replaceState(null,'','#'+page); render(); window.scrollTo({top:0,behavior:'instant'});}
  function render() {
    headerUpdate();
    const warning=storageError?'<div class="storage-warning">Сохранение в браузере недоступно или сохранённая копия повреждена. Новые изменения останутся только до закрытия страницы. Скачайте резервную копию перед выходом.</div>':'';
    main.className=(page==='dictionary'?'dictionary-view ':'')+'fade-in';
    main.innerHTML=warning+({overview:overviewView,dictionary:dictionaryView,practice:practiceView,progress:progressView}[page])();
    hydrateIcons(main);
    if (page==='dictionary'||page==='overview'||page==='progress') renderTable();
  }
  const addButton = () => `<button class="button primary" data-action="add">${ico('plus')} Добавить слова</button>`;
  const statMini = () => '<div class="stat-mini" aria-hidden="true">'+[9,16,12,22,18,28,25].map(h=>`<i style="height:${h}px"></i>`).join('')+'</div>';
  function statsView() {const m=metrics(); return `<div class="stats-grid"><div class="stat-card"><div class="stat-top"><span class="stat-icon">${ico('book')}</span>В моём словаре</div><div class="stat-value">${m.total}</div><div class="stat-detail">Слов для твоего немецкого</div>${statMini()}</div><div class="stat-card"><div class="stat-top"><span class="stat-icon">${ico('check')}</span>Уже выучено</div><div class="stat-value">${m.mastered}<span class="stat-progress"><i style="width:${m.total?m.mastered/m.total*100:0}%"></i></span></div><div class="stat-detail"><strong>${m.total?Math.round(m.mastered/m.total*100):0}%</strong> от всего словаря</div></div><div class="stat-card"><div class="stat-top"><span class="stat-icon">${ico('clock')}</span>Пора повторить</div><div class="stat-value">${m.due}</div><div class="stat-detail">${m.due?'Освежим в памяти сегодня':'Новые слова ждут знакомства'}</div>${statMini()}</div></div>`;}
  function modeCards() {return modes.map(m=>`<button class="mode-card" data-mode="${m.id}"><div class="mode-visual">${ico(m.icon)}</div><h3>${m.title}</h3><p>${m.desc}</p><div class="mode-card-footer"><span class="tag">${m.tag}</span>${ico('arrow')}</div></button>`).join('');}
  function heroArt() {return '<div class="hero-art" aria-hidden="true"><div class="art-orbit"></div><span class="art-star">✦</span><div class="art-card back"><small>JEDEN TAG</small><span class="word-symbol">✺</span><strong>ein bisschen</strong></div><div class="art-card front"><small>WORT DES TAGES</small><span class="word-symbol">❋</span><strong>die Freiheit</strong><span class="translation">свобода</span><span class="art-corner">✧</span></div><div class="art-tick">'+ico('check')+'</div><span class="art-label">Wort für Wort. ↗</span></div>';}
  function overviewView() {
    const m=metrics();
    return `<div class="intro-row"><div><h1>Hallo! Готов учить слова?<span class="greeting-dot">✺</span></h1><p>Твой немецкий становится лучше с каждым маленьким шагом.</p></div>${addButton()}</div><section class="hero"><div class="hero-copy"><span class="eyebrow">DEIN KLEINER FORTSCHRITT</span><h2>От слова —<br>к <em>уверенности.</em></h2><p>Твои слова, немного практики и радость от того,<br>что с каждым днём понимаешь больше.</p><div class="hero-action"><button class="button primary" data-action="quick-start">Начать тренировку ${ico('arrow')}</button><span>Всего 5 минут для себя</span></div></div>${heroArt()}</section>${statsView()}${m.today?`<div class="goal-card"><div><h3>Маленькая цель на сегодня</h3><p>Повтори 10 разных слов</p></div><div class="goal-track"><i style="width:${Math.min(100,m.todayWords*10)}%"></i></div><span class="goal-number">${m.todayWords} / 10</span>${m.todayWords>=10?'<span class="tag">Цель достигнута ✓</span>':'<button class="button secondary small" data-action="quick-start">Продолжить</button>'}</div>`:''}<section><div class="section-head"><div><h2>Как будем учить?</h2><p>Выбери настроение. Мы подберём слова.</p></div><a href="#practice" class="text-link">Все тренировки ${ico('arrow')}</a></div><div class="modes-grid">${modeCards()}</div></section><section><div class="section-head"><h2>Твои слова</h2><a href="#dictionary" class="text-link">Открыть словарь ${ico('arrow')}</a></div>${tableShell(false)}</section>`;
  }
  function tableShell(full) {return `<div class="word-panel"><div class="table-toolbar"><label class="search-box" aria-label="Найти слово или перевод">${ico('search')}<input id="word-search" placeholder="Найти слово или перевод…" value="${esc(search)}"></label>${full?`<select id="deck-filter" class="filter-select" aria-label="Набор слов"><option value="all">Все наборы</option>${decks().map(d=>`<option ${deckFilter===d?'selected':''} value="${esc(d)}">${esc(d)}</option>`).join('')}</select>`:`<span class="deck-name">DE <span style="padding:0 7px;color:#bdc6ae">↔</span> RU</span>`}</div><div id="table-content"></div></div>`;}
  function dictionaryView() {const m=metrics(); return `<div class="intro-row"><div><h1>Мой словарь</h1><p>Слова, которые ты хочешь сделать своими.</p></div>${addButton()}</div><div class="dictionary-tools">${[['all','Все слова',m.total],['new','Новые',m.newCount],['learning','Учу',m.learning],['mastered','Выучено',m.mastered],['due','Повторить',m.due]].map(([id,label,n])=>`<button class="filter-chip ${filter===id?'active':''}" data-filter="${id}">${label} <span>${n}</span></button>`).join('')}<button class="text-link deck-filter" data-action="import">${ico('upload')} Импорт списка</button></div>${tableShell(true)}`;}
  function filteredWords() {
    let words=[...data.words];
    if (page==='dictionary') {
      if(filter==='due') words=words.filter(w=>w.attempts&&w.due<=Date.now());
      else if(filter!=='all') words=words.filter(w=>C.status(w)===filter);
      if(deckFilter!=='all') words=words.filter(w=>w.deck===deckFilter);
    }
    if(page==='progress') words=words.filter(w=>w.lapses>0).sort((a,b)=>b.lapses-a.lapses||a.level-b.level);
    if(search.trim()) {const q=C.normalize(search); words=words.filter(w=>C.normalize(w.de+' '+w.ru).includes(q));}
    return words;
  }
  function dueText(w) {
    if(!w.attempts) return 'Ещё не учили';
    const delta=w.due-Date.now();
    if(delta<=0) return 'Пора повторить';
    if(delta<3600000) return `Через ${Math.max(1,Math.ceil(delta/60000))} мин`;
    if(delta<C.DAY) return `Через ${Math.ceil(delta/C.HOUR)} ч`;
    return `Через ${Math.ceil(delta/C.DAY)} дн`;
  }
  function renderTable() {
    const el=$('#table-content'); if(!el) return;
    const words=filteredWords();
    const limit=page==='dictionary'?20:page==='progress'?8:4;
    const pages=Math.max(1,Math.ceil(words.length/limit)); tablePage=Math.min(tablePage,pages-1);
    const shown=words.slice(tablePage*limit,(tablePage+1)*limit);
    const statuses={new:'Новое',learning:'Учу',mastered:'Выучено'};
    if(!words.length) {el.innerHTML=`<div class="empty-state">${ico(page==='progress'?'check':'book')}<h3>${search||filter!=='all'||deckFilter!=='all'?'Таких слов пока нет':page==='progress'?'Здесь будут сложные слова':'Словарь ждёт первых слов'}</h3><p>${search?'Попробуй другое слово или перевод.':page==='progress'?'После тренировки здесь появятся слова, в которых были ошибки.':'Добавь свои слова или начни со стартового набора.'}</p>${!data.words.length?'<button class="button primary" data-action="add">Добавить слова</button>':''}</div>`; return;}
    el.innerHTML=`<div class="table-scroll"><table class="word-table"><thead><tr><th>НЕМЕЦКИЙ</th><th>ПЕРЕВОД</th><th>СТАТУС</th><th class="column-progress">${page==='progress'?'ОШИБКИ':'ПРОГРЕСС'}</th><th class="column-actions"><span class="sr-only" aria-label="Действия"></span></th></tr></thead><tbody>${shown.map(w=>{
      const article=w.de.match(/^(der|die|das)(\s+)(.+)$/s);
      return `<tr><td><div class="german-word">${article?`<span><span class="article">${esc(article[1])}</span>${esc(article[2])}${esc(article[3])}</span>`:`<span>${esc(w.de)}</span>`}<button class="word-sound" data-speak="${esc(w.id)}" aria-label="Послушать ${esc(w.de)}">${ico('sound')}</button></div>${page==='dictionary'?`<span class="deck-name">${esc(w.deck)}</span>`:''}</td><td class="translation-cell">${esc(w.ru)}</td><td><span class="status-badge ${C.status(w)}">${statuses[C.status(w)]}</span></td><td class="column-progress">${page==='progress'?`<span class="level-caption">${w.lapses} ошибок · ${dueText(w)}</span>`:`<div class="level-dots" aria-label="Уровень ${w.level} из 5">${[1,2,3,4,5].map(n=>`<i class="${w.level>=n?'on':''}"></i>`).join('')}</div><div class="level-caption">${dueText(w)}</div>`}</td><td class="column-actions"><div class="row-actions"><button class="icon-button" data-edit="${esc(w.id)}" aria-label="Изменить ${esc(w.de)}">${ico('edit')}</button><button class="icon-button" data-delete="${esc(w.id)}" aria-label="Удалить ${esc(w.de)}">${ico('trash')}</button></div></td></tr>`;
    }).join('')}</tbody></table></div><div class="table-bottom"><span>Показано ${tablePage*limit+1}–${tablePage*limit+shown.length} из ${words.length}</span>${page==='dictionary'?`<div class="pagination"><button data-table-page="${tablePage-1}" ${tablePage===0?'disabled':''} aria-label="Предыдущая страница">←</button><span>${tablePage+1} / ${pages}</span><button data-table-page="${tablePage+1}" ${tablePage===pages-1?'disabled':''} aria-label="Следующая страница">→</button></div>`:`<a href="#dictionary">Весь словарь →</a>`}</div>`;
  }
  function practiceView() {
    if(session) return session.finished?resultsView():sessionView();
    return `<div class="intro-row"><div><h1>Время для немецкого</h1><p>Несколько минут практики — ещё один шаг вперёд.</p></div></div><div class="practice-layout"><section class="practice-main"><span class="eyebrow">SPIELEND LERNEN</span><h2>Учиться можно с удовольствием.</h2><p>Начни с карточек или сразу проверь свою память.</p><div class="modes-grid">${modeCards()}</div></section><aside class="practice-settings"><h3>Твоя тренировка</h3><label>Набор слов<select id="practice-deck"><option value="all">Весь словарь</option>${decks().map(d=>`<option value="${esc(d)}" ${settings.deck===d?'selected':''}>${esc(d)}</option>`).join('')}</select></label><label>Направление<select id="practice-direction"><option value="de-ru" ${settings.direction==='de-ru'?'selected':''}>Немецкий → Русский</option><option value="ru-de" ${settings.direction==='ru-de'?'selected':''}>Русский → Немецкий</option></select></label><label>Слов за подход<select id="practice-count">${[5,10,20,50].map(n=>`<option value="${n}" ${settings.count===n?'selected':''}>${n} слов</option>`).join('')}</select></label><p>${ico('leaf')} Сначала предложим слова, которые пора повторить, затем новые и менее знакомые.</p></aside></div>`;
  }
  function readSettings() {if($('#practice-deck')) settings={deck:$('#practice-deck').value,direction:$('#practice-direction').value,count:Number($('#practice-count').value)};}
  function startSession(mode, specificIds) {
    readSettings();
    const available=data.words.filter(w=>(settings.deck==='all'||w.deck===settings.deck)&&(!specificIds||specificIds.includes(w.id)));
    if(!available.length) {toast('Сначала добавь слова для этой тренировки.'); openWords(); return;}
    const pool=C.uniquePrompts(C.queue(available,Date.now(),available.length),settings.direction);
    if(mode==='match' && pool.length<2) {toast('Для поиска пар нужны хотя бы две разные подсказки. Начнём с карточек.'); mode='cards';}
    if(mode==='choice' && new Set(pool.map(w=>(settings.direction==='de-ru'?w.ru:w.de).trim())).size<2) {toast('Для выбора нужны хотя бы два разных точных ответа. Начнём с карточек.'); mode='cards';}
    const selected=shuffle(pool.slice(0,mode==='match'?Math.min(12,settings.count):settings.count));
    session={mode,ids:selected.map(w=>w.id),index:0,answers:[],start:Date.now(),direction:settings.direction,pool,checked:false,flipped:false,finished:false,missed:[],correct:0,matchDone:[],matchRightDone:[],matchWrong:[],selected:null,matchPage:0};
    page='practice';history.replaceState(null,'','#practice');render();window.scrollTo({top:0,behavior:'instant'});
  }
  const currentWord = () => data.words.find(w=>w.id===session?.ids[session.index]);
  const promptOf = w => session.direction==='de-ru'?w.de:w.ru;
  const answerOf = w => session.direction==='de-ru'?w.ru:w.de;
  function sessionHeader() {const m=modes.find(m=>m.id===session.mode), done=session.mode==='match'?session.matchDone.length:session.index;return `<div class="session-top"><div class="session-title"><button class="icon-button" data-action="quit-session" aria-label="Выйти из тренировки">${ico('back')}</button><h2>${m.title}</h2></div><span class="session-count">${Math.min(done+1,session.ids.length)} / ${session.ids.length} · ${session.direction==='de-ru'?'DE → RU':'RU → DE'}</span></div><div class="session-progress" aria-label="Выполнено ${done} из ${session.ids.length}"><i style="width:${done/session.ids.length*100}%"></i></div>`;}
  function sessionView() {
    if(session.mode==='match') return matchView();
    const w=currentWord();if(!w) {session.finished=true;return resultsView();}
    let controls='';
    if(session.mode==='cards') controls=session.flipped?`<div class="flash-actions"><button class="button secondary" data-rate="wrong">${ico('close')} Пока не помню</button><button class="button primary" data-rate="correct">${ico('check')} Помню</button></div>`:`<div class="flash-actions"><button class="button primary" data-action="flip">Показать перевод ${ico('arrow')}</button></div>`;
    if(session.mode==='choice') {
      if(!session.options) {const seen=new Set([answerOf(w).trim()]); const distractors=shuffle(session.pool).map(answerOf).filter(value=>{const key=value.trim(); if(seen.has(key))return false; seen.add(key);return true;}).slice(0,3); session.options=shuffle([answerOf(w),...distractors]);}
      controls=`<div class="choice-grid">${session.options.map((a,i)=>`<button class="choice-button ${session.checked?(C.checkAnswer(a,answerOf(w))?'correct':i===session.chosen?'incorrect':''):''}" data-choice="${i}" ${session.checked?'disabled':''}><span class="choice-number">${i+1}</span>${esc(a)}</button>`).join('')}</div>`;
    }
    if(session.mode==='typing') controls=`<form class="typing-form" id="typing-form"><input id="typing-answer" name="answer" aria-label="Ваш перевод" placeholder="${session.direction==='de-ru'?'Напиши перевод…':'Schreib das Wort…'}" value="${esc(session.typed||'')}" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" maxlength="300" required ${session.checked?'disabled':''}><button class="button primary" ${session.checked?'disabled':''}>Проверить ${ico('check')}</button></form>${session.direction==='ru-de'&&!session.checked?'<div class="umlaut-keys" aria-label="Немецкие буквы">'+['ä','ö','ü','ß'].map(c=>`<button data-char="${c}" type="button">${c}</button>`).join('')+'</div>':''}`;
    const feedback=session.checked?`<div class="feedback ${session.lastCorrect?'':'wrong'}" role="status"><div><strong>${session.lastCorrect?'Richtig! Всё верно.':'Ничего, запомним вместе.'}</strong><p>${session.lastCorrect?'Ещё один маленький шаг вперёд.':`Правильный ответ: ${esc(answerOf(w))}`}</p></div><button class="button primary" data-action="next">${session.index+1===session.ids.length?'Результат':'Дальше'} ${ico('arrow')}</button></div>`:'';
    return sessionHeader()+`<div class="question-wrap"><div class="question-card ${session.flipped?'flipped':''}"><span class="eyebrow">${session.direction==='de-ru'?'СЛОВО НА НЕМЕЦКОМ':'ВСПОМНИ ПО-НЕМЕЦКИ'}</span>${session.direction==='de-ru'?`<button class="word-sound" data-speak="${esc(w.id)}" aria-label="Послушать слово">${ico('sound')}</button>`:''}<h2>${esc(promptOf(w))}</h2>${session.flipped?`<div class="flip-answer">${esc(answerOf(w))}</div>`:'<p class="question-hint">Какой перевод ты сохранил для этого слова?</p>'}</div>${controls}${feedback}<p class="session-tip">${session.mode==='cards'?'Вспомни весь сохранённый перевод. Потом проверь себя.':session.mode==='typing'?'Введи весь текст точно как в словаре: важны регистр, буквы, знаки и пробелы внутри. Пробелы по краям не учитываются.': 'Выбери точный перевод из своей пары. Клавиши 1–4 — ответ, Enter — дальше.'}</p></div>`;
  }
  function record(w,correct) {
    const pos=data.words.findIndex(x=>x.id===w.id);if(pos<0)return;
    const now=Date.now();data.words[pos]=C.applyAnswer(data.words[pos],correct,now);data.history.push({id:w.id,correct,at:now,date:C.dateKey(new Date(now)),mode:session.mode});
    session.answers.push({id:w.id,correct});if(correct)session.correct++;else if(!session.missed.includes(w.id))session.missed.push(w.id);
    persist();headerUpdate();
  }
  function answer(correct) {if(!session||session.checked)return;const w=currentWord();if(!w)return;session.checked=true;session.lastCorrect=correct;record(w,correct);render(); if(session.mode!=='cards')setTimeout(()=>$('[data-action="next"]')?.focus(),50);}
  function nextQuestion() {if(!session?.checked)return;session.index++;session.checked=false;session.flipped=false;session.options=null;session.chosen=null;session.typed='';if(session.index>=session.ids.length)session.finished=true;render();if(session.mode==='typing'&&!session.finished)setTimeout(()=>$('#typing-answer')?.focus(),30);}
  function matchView() {
    if(!session.matchBatch) {
      session.matchBatch=session.ids.slice(session.matchPage*4,(session.matchPage+1)*4);
      session.matchRight=shuffle(session.matchBatch);
      session.matchRightDone=[];
    }
    const tile=(id,side)=>{const w=data.words.find(x=>x.id===id);const matched=(side==='left'?session.matchDone:session.matchRightDone).includes(id);return `<button class="match-tile ${matched?'matched':''} ${session.selected?.id===id&&session.selected?.side===side?'selected':''}" data-match="${esc(id)}" data-side="${side}" ${matched?'disabled':''}>${esc(side==='left'?promptOf(w):answerOf(w))}</button>`;};
    return sessionHeader()+`<p class="match-instructions">Соедини слово с точным переводом, который ты сохранил для него.</p><div class="match-grid"><div class="match-column">${session.matchBatch.map(id=>tile(id,'left')).join('')}</div><div class="match-column">${session.matchRight.map(id=>tile(id,'right')).join('')}</div></div><p class="session-tip" aria-live="polite">${session.matchDone.length} пар найдено · ${session.matchErrors||0} ошибок</p>`;
  }
  function matchSelect(id,side) {
    if(!session||session.matchBusy||(side==='left'?session.matchDone:session.matchRightDone).includes(id))return;
    if(!session.selected||session.selected.side===side) {session.selected={id,side};render();return;}
    const left=side==='left'?id:session.selected.id, right=side==='right'?id:session.selected.id;
    const leftWord=data.words.find(w=>w.id===left), rightWord=data.words.find(w=>w.id===right);
    const correct=C.checkAnswer(answerOf(rightWord),answerOf(leftWord));
    if(correct) {
      session.matchDone.push(left);
      session.matchRightDone.push(right);
      if(!session.matchWrong.includes(left))record(leftWord,true);
      session.selected=null;
      if(session.matchBatch.every(x=>session.matchDone.includes(x))) {
        if(session.matchDone.length===session.ids.length)session.finished=true;
        else {session.matchPage++;session.matchBatch=null;}
      }
      render();
    } else {
      session.matchErrors=(session.matchErrors||0)+1;
      if(!session.matchWrong.includes(left)) {session.matchWrong.push(left);record(leftWord,false);}
      session.matchBusy=true;
      const activeSession=session;
      $$('[data-match]').filter(e=>(e.dataset.match===left&&e.dataset.side==='left')||(e.dataset.match===right&&e.dataset.side==='right')).forEach(e=>e.classList.add('error'));
      setTimeout(()=>{if(session!==activeSession)return;session.matchBusy=false;session.selected=null;render();},650);
    }
  }
  function resultsView() {
    const count=session.ids.length, correct=session.correct, pct=Math.round(correct/count*100), minutes=Math.max(1,Math.ceil((Date.now()-session.start)/60000));
    return `<div class="results"><div class="results-badge">${pct>=80?'✺':'❋'}</div><span class="eyebrow">KLEINER SCHRITT. GROSSER FORTSCHRITT.</span><h1>${pct>=80?'Wunderbar! Отличная работа.':'Шаг вперёд сделан.'}</h1><p>${pct>=80?'Твой немецкий сегодня стал немного увереннее.':'Ошибки показывают, с чем стоит познакомиться поближе.'}</p><div class="result-stats"><div><strong>${correct} / ${count}</strong><span>Верно с первого раза</span></div><div><strong>${pct}%</strong><span>Точность подхода</span></div><div><strong>${minutes} мин</strong><span>Время для себя</span></div></div><p class="subtle-note">Ответы сохранены${storageError?' только в памяти страницы':''}. Для закрепления возвращайся к словам через время.</p><div class="result-buttons">${session.missed.length?`<button class="button primary" data-action="retry">Повторить ошибки ${ico('arrow')}</button>`:'<button class="button primary" data-action="another">Ещё один подход '+ico('arrow')+'</button>'}<button class="button secondary" data-action="finish">К обзору ${ico('check')}</button></div>${session.missed.length?`<div class="result-words"><p>ЭТИМ СЛОВАМ — ЕЩЁ НЕМНОГО ВНИМАНИЯ</p>${session.missed.map(id=>data.words.find(w=>w.id===id)).filter(Boolean).map(w=>`<div class="missed-word"><span>${esc(w.de)}</span><span>${esc(w.ru)}</span></div>`).join('')}</div>`:''}</div>`;
  }
  function progressView() {
    const m=metrics(),percent=m.total?Math.round(m.mastered/m.total*100):0;
    const days=Array.from({length:7},(_,i)=>{const d=new Date();d.setDate(d.getDate()-(6-i));return {key:C.dateKey(d),label:['Вс','Пн','Вт','Ср','Чт','Пт','Сб'][d.getDay()],today:i===6};});
    days.forEach(d=>d.count=data.history.filter(h=>h.date===d.key).length);const max=Math.max(5,...days.map(d=>d.count));
    return `<div class="intro-row"><div><h1>Каждое слово — твой прогресс</h1><p>Посмотри, что уже получается и чему уделить внимание.</p></div><button class="button secondary" data-action="explain">${ico('help')} Как считаем</button></div><div class="progress-top"><section class="progress-card"><h2>Твой словарь в памяти</h2><p>Выучено — 4 успешных повторения с интервалами</p><div class="mastery-content"><div class="donut" style="--percent:${percent}"><div class="donut-text"><strong>${percent}%</strong><span>уже выучено</span></div></div><div class="legend"><div><span><i></i>Выучено</span><strong>${m.mastered}</strong></div><div><span><i></i>В процессе</span><strong>${m.learning}</strong></div><div><span><i></i>Новые слова</span><strong>${m.newCount}</strong></div></div></div></section><section class="progress-card"><h2>Понемногу каждый день</h2><p>Количество проверенных ответов за 7 дней</p><div class="activity-chart" role="img" aria-label="${days.map(d=>d.label+': '+d.count+' ответов').join(', ')}">${days.map(d=>`<div class="chart-column ${d.today?'today':''}"><span class="chart-number">${d.count}</span><div class="chart-bar" style="height:${Math.max(3,d.count/max*85)}px"></div><span class="day-name">${d.label}</span></div>`).join('')}</div></section></div><div class="progress-grid"><div class="metric-card"><span>Общая точность</span><strong>${data.history.length?m.accuracy+'%':'—'}</strong><small>По всем проверенным ответам</small></div><div class="metric-card"><span>Ответов за сегодня</span><strong>${m.today}</strong><small>${m.todayWords} разных слов</small></div><div class="metric-card"><span>Дней подряд</span><strong>${C.streak(data.history)}</strong><small>Твоя привычка учить немецкий</small></div></div><div class="progress-note">${ico('leaf')}<p>${m.due?`<strong>${m.due} слов пора повторить.</strong> Короткая тренировка поможет освежить их в памяти.`:m.total?'<strong>Хороший момент для новых слов.</strong> Тренировки со временем покажут, что уже закрепилось.':'<strong>Начни со своего словаря.</strong> Добавь слова, которые хочешь запомнить.'}</p><button class="text-link" data-action="quick-start">Потренируемся ${ico('arrow')}</button></div><div class="section-head"><div><h2>Нужно чуть больше внимания</h2><p>Слова, в которых ты ошибался. Сначала — самые сложные.</p></div></div>${tableShell(false)}`;
  }
  function openWords(id,bulk=false) {
    const form=$('#word-form');form.reset();form.elements.id.value='';$('#word-dialog-title').textContent=id?'Изменим слово':'Добавим новые слова';
    $('#bulk-form').reset();$('#import-feedback').textContent='';
    const w=data.words.find(w=>w.id===id);if(w){form.elements.id.value=w.id;form.elements.de.value=w.de;form.elements.ru.value=w.ru;form.elements.deck.value=w.deck;}
    $('#deck-names').innerHTML=decks().map(d=>`<option value="${esc(d)}"></option>`).join('');
    $('.modal-tabs').hidden=!!id;switchTab(bulk?'bulk':'single');showDialog('word-dialog');
    setTimeout(()=>{if(bulk)$('#bulk-form textarea').focus();else form.elements.de.focus();},50);
  }
  function switchTab(tab) {$('#word-form').hidden=tab!=='single';$('#bulk-form').hidden=tab!=='bulk';$$('[data-tab]').forEach(e=>e.classList.toggle('active',e.dataset.tab===tab));}
  function addMany(words) {
    const known=new Set(data.words.map(w=>C.pairKey(w.de,w.ru)));let added=0,duplicates=0;
    for(const w of words){const key=C.pairKey(w.de,w.ru);if(known.has(key)){duplicates++;continue;}if(data.words.length>=10000)break;known.add(key);data.words.push(w);added++;}
    persist();return {added,duplicates};
  }
  function exportData() {
    const blob=new Blob([JSON.stringify({...data,exportedAt:new Date().toISOString()},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=url;a.download='wortly-backup-'+C.dateKey()+'.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('Резервная копия скачана: слова и вся история.');
  }
  function speak(id) {
    const w=data.words.find(w=>w.id===id);if(!w)return;
    if(!('speechSynthesis' in window)){toast('В этом браузере озвучка недоступна.');return;}
    speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(w.de);u.lang='de-DE';u.rate=.85;
    const voice=speechSynthesis.getVoices().find(v=>v.lang.startsWith('de'));if(voice)u.voice=voice;
    u.onerror=()=>toast('Немецкая озвучка недоступна. Проверь настройки голосов браузера.');speechSynthesis.speak(u);
  }
  document.addEventListener('click',e=>{
    const close=e.target.closest('[data-close]');if(close){$('#'+close.dataset.close).close();return;}
    const nav=e.target.closest('a[href^="#"]');if(nav){const target=nav.hash.slice(1);if(names[target]){e.preventDefault();search='';filter='all';deckFilter='all';tablePage=0;navigate(target);return;}}
    const action=e.target.closest('[data-action]')?.dataset.action;
    if(action) {
      if(action==='add')openWords();
      if(action==='import')openWords(null,true);
      if(action==='explain')showDialog('info-dialog');
      if(action==='export')exportData();
      if(action==='show-progress')navigate('progress');
      if(action==='quick-start'){settings.deck='all';startSession('choice');}
      if(action==='flip'&&session){session.flipped=true;render();}
      if(action==='next')nextQuestion();
      if(action==='quit-session')navigate('practice');
      if(action==='finish'){session=null;search='';filter='all';deckFilter='all';setPage('overview');}
      if(action==='retry'&&session){const ids=[...session.missed],mode=session.mode;startSession(mode,ids);}
      if(action==='another'&&session)startSession(session.mode);
      return;
    }
    const mode=e.target.closest('[data-mode]');if(mode){startSession(mode.dataset.mode);return;}
    const rate=e.target.closest('[data-rate]');if(rate&&session){answer(rate.dataset.rate==='correct');nextQuestion();return;}
    const choice=e.target.closest('[data-choice]');if(choice&&session){session.chosen=Number(choice.dataset.choice);answer(C.checkAnswer(session.options[session.chosen],answerOf(currentWord())));return;}
    const match=e.target.closest('[data-match]');if(match){matchSelect(match.dataset.match,match.dataset.side);return;}
    const edit=e.target.closest('[data-edit]');if(edit){openWords(edit.dataset.edit);return;}
    const del=e.target.closest('[data-delete]');if(del){const w=data.words.find(w=>w.id===del.dataset.delete);if(w)confirmAction('Удалить слово?',`«${w.de}» и его прогресс будут удалены из словаря. История занятий останется.`,()=>{data.words=data.words.filter(x=>x.id!==w.id);persist();render();toast('Слово удалено.');});return;}
    const sound=e.target.closest('[data-speak]');if(sound){speak(sound.dataset.speak);return;}
    const tab=e.target.closest('[data-tab]');if(tab){switchTab(tab.dataset.tab);return;}
    const chip=e.target.closest('[data-filter]');if(chip){filter=chip.dataset.filter;tablePage=0;render();return;}
    const tp=e.target.closest('[data-table-page]');if(tp){tablePage=Math.max(0,Number(tp.dataset.tablePage));renderTable();return;}
    const char=e.target.closest('[data-char]');if(char){const input=$('#typing-answer');if(input){input.setRangeText(char.dataset.char,input.selectionStart,input.selectionEnd,'end');input.focus();}return;}
  });
  document.addEventListener('input',e=>{if(e.target.id==='word-search'){search=e.target.value;tablePage=0;renderTable();}});
  document.addEventListener('change',e=>{if(e.target.id==='deck-filter'){deckFilter=e.target.value;tablePage=0;renderTable();}if(e.target.id.startsWith('practice-'))readSettings();});
  document.addEventListener('submit',e=>{
    if(e.target.id==='typing-form'){e.preventDefault();if(!session||session.checked)return;session.typed=e.target.elements.answer.value;answer(C.checkAnswer(session.typed,answerOf(currentWord())));}
  });
  $('#word-form').addEventListener('submit',e=>{
    e.preventDefault();const f=e.target,de=f.elements.de.value.trim(),ru=f.elements.ru.value.trim(),deck=f.elements.deck.value.trim()||'Мои слова',id=f.elements.id.value;if(!de||!ru)return;
    const existing=data.words.find(w=>w.id===id);
    if(existing){const changed=existing.de!==de||existing.ru!==ru;Object.assign(existing,changed?{...C.makeWord(de,ru,deck),id:existing.id,createdAt:existing.createdAt}:{deck});persist();toast(changed?'Слово обновлено. Прогресс сброшен для нового перевода.':'Набор обновлён.');}
    else{const result=addMany([C.makeWord(de,ru,deck)]);if(!result.added){toast('Такое слово с этим переводом уже есть или словарь заполнен.');return;}toast('Слово добавлено. Ein kleiner Schritt!');}
    $('#word-dialog').close();tablePage=0;render();
  });
  $('#bulk-form').addEventListener('submit',e=>{
    e.preventDefault();const f=e.target,parsed=C.parseBulk(f.elements.words.value,f.elements.deck.value.trim()||'Мои слова');
    if(parsed.errors.length){$('#import-feedback').textContent=`Проверь строки ${parsed.errors.slice(0,10).join(', ')}${parsed.errors.length>10?'…':''}: нужны слово и перевод. Пока ничего не добавлено.`;return;}
    if(!parsed.words.length){$('#import-feedback').textContent='Список пуст. Добавь хотя бы одно слово с переводом.';return;}
    const r=addMany(parsed.words);$('#word-dialog').close();filter='all';deckFilter='all';search='';tablePage=0;render();toast(`Добавлено: ${r.added}.${r.duplicates?' Уже есть в словаре: '+r.duplicates+'.':''}${data.words.length>=10000?' Достигнут лимит 10 000 слов.':''}`);
  });
  $('#import-file').addEventListener('change',async e=>{
    const file=e.target.files[0];if(!file)return;
    if(!file.name.toLowerCase().endsWith('.json')&&file.size>15*1024*1024){$('#import-feedback').textContent='Файл слишком большой. Максимум — 15 МБ для текстового списка.';e.target.value='';return;}
    try {
      const text=await file.text();
      if(file.name.toLowerCase().endsWith('.json')) {
        const incoming=JSON.parse(text);if(!C.validBackup(incoming))throw new Error('backup');
        confirmAction('Восстановить резервную копию?',`В копии ${incoming.words.length} слов и ${incoming.history.length} ответов. Текущий словарь и история будут заменены. Сначала скачай текущую копию, если хочешь её сохранить.`,()=>{data={schema:1,words:incoming.words,history:incoming.history};storageError=false;persist();$('#word-dialog').close();session=null;filter='all';deckFilter='all';search='';tablePage=0;render();toast('Словарь и история восстановлены.');},'Восстановить');
      } else {$('#bulk-form textarea').value=text;$('#import-feedback').textContent='Файл загружен. Проверь список и нажми «Добавить список».';}
    } catch {$('#import-feedback').textContent='Не удалось прочитать файл. Нужен текстовый список или корректная резервная копия Wortly.';}
    e.target.value='';
  });
  $('#confirm-yes').addEventListener('click',()=>{$('#confirm-dialog').close();const fn=pendingConfirm;pendingConfirm=null;fn?.();});
  $$('dialog').forEach(d=>d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}}));
  document.addEventListener('keydown',e=>{
    if($('dialog[open]')||!session||session.finished||e.altKey||e.ctrlKey||e.metaKey)return;
    if(e.target.matches('input,textarea,select'))return;
    if(session.checked&&e.key==='Enter'){e.preventDefault();nextQuestion();return;}
    if(session.mode==='choice'&&!session.checked&&/^[1-4]$/.test(e.key)){$(`[data-choice="${Number(e.key)-1}"]`)?.click();}
    if(session.mode==='cards'&&e.code==='Space'){e.preventDefault();if(!session.flipped){session.flipped=true;render();}}
  });
  window.addEventListener('hashchange',()=>navigate(location.hash.slice(1)));
  window.addEventListener('storage',e=>{if(e.key===KEY&&e.newValue){try{const incoming=JSON.parse(e.newValue);if(C.validBackup(incoming)){data=incoming;session=null;render();toast('Словарь обновлён из другой вкладки.');}}catch{}}});
  hydrateIcons();page=names[location.hash.slice(1)]?location.hash.slice(1):'overview';render();
})();
