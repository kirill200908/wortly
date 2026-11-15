const {test}=require('node:test');
const assert=require('node:assert/strict');
const C=require('../core.js');
test('answers match only the complete saved text, ignoring outer whitespace',()=>{
  assert.equal(C.checkAnswer('  glücklich  ','glücklich'),true);
  assert.equal(C.checkAnswer('учить / изучать','учить / изучать'),true);
  for(const [answer,expected] of [['изучать','учить / изучать'],['учить','учить; изучать'],['ДОМ','дом'],['все','всё'],['gluecklich','glücklich'],['Strasse','Straße'],['дом.','дом'],['guten  Tag','guten Tag'],['Katze','die Katze']]) {
    assert.equal(C.checkAnswer(answer,expected),false,`${answer} must not equal ${expected}`);
  }
});
test('parse common text, TSV and quoted CSV imports',()=>{
  const p=C.parseBulk('das Haus — дом\nlernen = учить / изучать\ndie Zeit;время\n"der Tag","день, сутки"\nsprechen\tговорить','A1');
  assert.equal(p.errors.length,0);assert.equal(p.words.length,5);assert.equal(p.words[3].ru,'день, сутки');assert.equal(p.words[0].deck,'A1');
});
test('bad import rows are identified before committing any data',()=>{
  const p=C.parseBulk('Haus — дом\nошибка\nZeit — ','A1');assert.deepEqual(p.errors,[2,3]);
});
test('CSV delimiters inside quoted fields do not corrupt imported words',()=>{
  for(const translation of ['день — сутки','день; сутки','день = сутки','день, сутки']) {
    const p=C.parseBulk(`"der Tag","${translation}"`,'A1');
    assert.deepEqual(p.errors,[]);assert.equal(p.words[0].de,'der Tag');assert.equal(p.words[0].ru,translation);
  }
  const escaped=C.parseBulk('"der Tag";"день, \"\"сутки\"\""','A1');
  assert.equal(escaped.words[0].ru,'день, "сутки"');
  const hyphenated=C.parseBulk('die E-Mail - электронная почта','A1');
  assert.equal(hyphenated.words[0].de,'die E-Mail');assert.equal(hyphenated.words[0].ru,'электронная почта');
  const phrase=C.parseBulk('Hallo, wie geht es dir? — Привет, как дела?','A1');
  assert.equal(phrase.words[0].de,'Hallo, wie geht es dir?');assert.equal(phrase.words[0].ru,'Привет, как дела?');
  assert.deepEqual(C.parseBulk('"der Tag","незакрытая строка','A1').errors,[1]);
});
test('a CSV or TSV header fixes the column separator for every following row',()=>{
  for(const delimiter of [',',';','\t']) {
    const p=C.parseBulk(`\nde${delimiter}ru\nder Tag${delimiter}день — сутки\nX${delimiter}размер 2=3`,'A1');
    assert.deepEqual(p.errors,[]);assert.equal(p.words.length,2);
    assert.equal(p.words[0].de,'der Tag');assert.equal(p.words[0].ru,'день — сутки');
    assert.equal(p.words[1].ru,'размер 2=3');
  }
  const quoted=C.parseBulk('"de","ru"\n"der Tag","день — сутки"','A1');
  assert.equal(quoted.words[0].ru,'день — сутки');
});
test('bulk imports validate the complete translation before persistence',()=>{
  const rejected=C.parseBulk('Haus;дом;'+'x'.repeat(300),'A1');
  assert.deepEqual(rejected.errors,[1]);assert.equal(rejected.words.length,0);
  const accepted=C.parseBulk('Haus;дом;жилище','A1');
  assert.equal(accepted.words[0].ru,'дом;жилище');
  assert.equal(C.validBackup({schema:1,words:accepted.words,history:[]}),true);
  assert.equal(C.parseBulk('X = размер 2=3','A1').words[0].ru,'размер 2=3');
  assert.equal(C.parseBulk('Haus — дом — жилище','A1').words[0].ru,'дом — жилище');
});
test('first success schedules a short review without claiming mastery',()=>{
  const w=C.applyAnswer(C.makeWord('Haus','дом'),true,1000000);assert.equal(w.level,1);assert.equal(w.due,1600000);assert.equal(C.status(w),'learning');
});
test('immediate repetitions do not inflate level or postpone a review',()=>{
  let w=C.applyAnswer(C.makeWord('Haus','дом'),true,1000000);const due=w.due;
  for(let i=1;i<20;i++)w=C.applyAnswer(w,true,1000000+i*1000);
  assert.equal(w.level,1);assert.equal(w.due,due);assert.equal(w.attempts,20);
});
test('mastery requires separated retrievals and mistakes reduce level',()=>{
  let w=C.makeWord('Haus','дом'),now=1000000;
  for(let i=0;i<4;i++){w=C.applyAnswer(w,true,now);now+=C.intervals[w.level]+4*C.HOUR;}
  assert.equal(w.level,4);assert.equal(C.status(w),'mastered');
  w=C.applyAnswer(w,false,now);assert.equal(w.level,3);assert.equal(C.status(w),'learning');assert.equal(w.lapses,1);
});
test('queue prioritizes due words then new words before early reviews',()=>{
  const now=Date.now(),early={...C.makeWord('a','а'),attempts:1,level:1,due:now+C.DAY},due={...C.makeWord('b','б'),attempts:1,level:2,due:now-1},fresh=C.makeWord('c','ц');
  assert.deepEqual(C.queue([early,fresh,due],now).map(w=>w.id),[due.id,fresh.id,early.id]);
});
test('streak counts yesterday if today has no answer and ignores repeats',()=>{
  const now=new Date(2026,10,15,15),history=[{date:'2026-11-14'},{date:'2026-11-14'},{date:'2026-11-13'}];
  assert.equal(C.streak(history,now),2);assert.equal(C.streak([],now),0);
});
test('backup validates and rejects invalid levels, duplicate IDs, and malformed history',()=>{
  const d={schema:1,words:[C.makeWord('Haus','дом')],history:[]};assert.equal(C.validBackup(d),true);
  assert.equal(C.validBackup({...d,words:[{...d.words[0],level:99}]}),false);
  assert.equal(C.validBackup({...d,words:[d.words[0],d.words[0]]}),false);
  assert.equal(C.validBackup({...d,history:[{id:'x',correct:'true',date:'today',at:1}]}),false);
});
test('backup rejects malformed mistake counters before they can alter statistics',()=>{
  const word=C.makeWord('Haus','дом');
  for(const lapses of ['0',-1,1.5,undefined]) assert.equal(C.validBackup({schema:1,words:[{...word,lapses}],history:[]}),false);
  let trained=C.applyAnswer(word,false,1000000);trained=C.applyAnswer(trained,false,2000000);
  assert.equal(trained.lapses,2);assert.equal(C.validBackup({schema:1,words:[trained],history:[]}),true);
});
test('adding an answer never invalidates a previously accepted long history',()=>{
  const word=C.makeWord('Haus','дом'),history=Array.from({length:100000},()=>({id:word.id,date:'2026-11-15',correct:true,at:1000000}));
  const data={schema:1,words:[word],history};
  assert.equal(C.validBackup(data),true);
  history.push({id:word.id,date:'2026-11-15',correct:false,at:2000000});
  assert.equal(C.validBackup(data),true);
});
test('strict pair keys preserve distinct letters, case, spacing, and literal separators',()=>{
  assert.notEqual(C.pairKey('glücklich','счастливый'),C.pairKey('gluecklich','счастливый'));
  assert.notEqual(C.pairKey('alle','все'),C.pairKey('alle','всё'));
  assert.notEqual(C.pairKey('a|b','c'),C.pairKey('a','b|c'));
  assert.notEqual(C.pairKey('Haus','дом'),C.pairKey('haus','дом'));
  assert.notEqual(C.pairKey('guten  Tag','привет'),C.pairKey('guten Tag','привет'));
  assert.equal(C.pairKey(' Haus ',' дом '),C.pairKey('Haus','дом'));
});
test('practice omits ambiguous duplicate prompts without merging their saved answers',()=>{
  const bank=C.makeWord('die Bank','банк'),bench=C.makeWord('die Bank','скамья'),house=C.makeWord('das Haus','дом / жилище'),building=C.makeWord('das Gebäude','жилище'),pool=[bank,bench,house,building];
  assert.deepEqual(C.uniquePrompts(pool).map(w=>w.id),[bank.id,house.id,building.id]);
  assert.equal(C.checkAnswer(bench.ru,bank.ru),false);
  assert.equal(C.checkAnswer(building.ru,house.ru),false);
  assert.equal(pool.length,4);
  const sameRussian=C.makeWord('das Heim','жилище');
  assert.deepEqual(C.uniquePrompts([building,sameRussian],'ru-de').map(w=>w.id),[building.id]);
});
test('due priority is applied before removing duplicate practice prompts',()=>{
  const now=Date.now(),early={...C.makeWord('die Bank','банк'),attempts:1,level:2,due:now+C.DAY,lastSeen:now},due={...C.makeWord('die Bank','скамья'),attempts:1,level:1,due:now-1,lastSeen:now-C.DAY},fresh=C.makeWord('das Haus','дом');
  const pool=C.uniquePrompts(C.queue([early,fresh,due],now,3));
  assert.deepEqual(pool.map(w=>w.id),[due.id,fresh.id]);
  assert.equal(pool[0].ru,'скамья');
});
