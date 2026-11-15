const {test}=require('node:test');
const assert=require('node:assert/strict');
const C=require('../core.js');
test('accept alternatives and German keyboard substitutions',()=>{
  assert.equal(C.checkAnswer('изучать','учить / изучать'),true);
  assert.equal(C.checkAnswer('  GLUECKLICH  ','glücklich'),true);
  assert.equal(C.checkAnswer('Strasse','Straße'),true);
  assert.equal(C.checkAnswer('домик','дом'),false);
  assert.equal(C.checkAnswer('Katze','die Katze'),false);
});
test('parse common text, TSV and quoted CSV imports',()=>{
  const p=C.parseBulk('das Haus — дом\nlernen = учить / изучать\ndie Zeit;время\n"der Tag","день, сутки"\nsprechen\tговорить','A1');
  assert.equal(p.errors.length,0);assert.equal(p.words.length,5);assert.equal(p.words[3].ru,'день, сутки');assert.equal(p.words[0].deck,'A1');
});
test('bad import rows are identified before committing any data',()=>{
  const p=C.parseBulk('Haus — дом\nошибка\nZeit — ','A1');assert.deepEqual(p.errors,[2,3]);
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
