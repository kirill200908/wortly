(function (root) {
  'use strict';
  const DAY = 86400000, HOUR = 3600000;
  const intervals = [0, 600000, DAY, 3 * DAY, 7 * DAY, 21 * DAY];
  const normalize = value => String(value).normalize('NFKC').toLowerCase().replace(/ё/g, 'е').replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss').replace(/[.!?…]+$/g, '').replace(/\s+/g, ' ').trim();
  const alternatives = value => String(value).split(/\s*[\/;|]\s*/).map(normalize).filter(Boolean);
  const checkAnswer = (answer, expected) => alternatives(expected).includes(normalize(answer));
  const status = word => word.level >= 4 ? 'mastered' : word.attempts ? 'learning' : 'new';
  const dateKey = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  function applyAnswer(word, correct, now = Date.now()) {
    const next = {...word, attempts: word.attempts + 1, correct: word.correct + Number(correct), lastSeen: now};
    if (correct) {
      // Repeated immediate answers must not manufacture long-term mastery.
      if (!word.lastPromotion || now - word.lastPromotion >= 4 * HOUR) {
        next.level = Math.min(5, word.level + 1);
        next.lastPromotion = now;
        next.due = now + intervals[next.level];
      }
    } else {
      next.level = Math.max(0, word.level - 1);
      next.lapses = (word.lapses || 0) + 1;
      next.due = now + intervals[1];
    }
    return next;
  }
  function makeWord(de, ru, deck = 'Мои слова') {
    return {id: root.crypto?.randomUUID?.() || 'w-' + Date.now() + '-' + Math.random().toString(36).slice(2), de: de.trim(), ru: ru.trim(), deck: deck.trim() || 'Мои слова', level: 0, attempts: 0, correct: 0, lapses: 0, due: 0, lastSeen: 0, lastPromotion: 0, createdAt: Date.now()};
  }
  function splitRow(line) {
    let quote = false, current = '', result = [];
    const delimiter = line.includes('\t') ? '\t' : line.includes('—') || line.includes('–') || /\s-\s/.test(line) ? null : line.includes('=') ? '=' : line.includes(';') ? ';' : line.includes(',') ? ',' : undefined;
    if (delimiter === undefined) return [];
    if (delimiter === null) return line.split(/\s*[—–]\s*|\s-\s/).map(s => s.trim());
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') { if (quote && line[i + 1] === '"') {current += '"'; i++;} else quote = !quote; }
      else if (c === delimiter && !quote) {result.push(current.trim()); current = '';}
      else current += c;
    }
    result.push(current.trim());
    return result;
  }
  function parseBulk(text, deck) {
    const words = [], errors = [];
    const rows = text.replace(/^\uFEFF/, '').split(/\r?\n/);
    rows.forEach((line, i) => {
      if (!line.trim()) return;
      const parts = splitRow(line);
      if (i === 0 && /^(de|german|немецкий|слово)$/i.test(parts[0]) && /^(ru|russian|перевод|русский)$/i.test(parts[1])) return;
      if (parts.length < 2 || !parts[0] || !parts[1] || parts[0].length > 160 || parts[1].length > 240) {errors.push(i + 1); return;}
      words.push(makeWord(parts[0], parts.slice(1).join(' / '), deck));
    });
    return {words, errors};
  }
  function queue(words, now = Date.now(), limit = 10) {
    return [...words].sort((a, b) => {
      const priority = w => w.attempts && w.due <= now ? 0 : !w.attempts ? 1 : 2;
      return priority(a) - priority(b) || a.level - b.level || a.lastSeen - b.lastSeen;
    }).slice(0, limit);
  }
  function streak(history, now = new Date()) {
    const days = new Set(history.map(h => h.date));
    const cursor = new Date(now); cursor.setHours(12, 0, 0, 0);
    if (!days.has(dateKey(cursor))) cursor.setDate(cursor.getDate() - 1);
    let count = 0;
    while (days.has(dateKey(cursor))) {count++; cursor.setDate(cursor.getDate() - 1);}
    return count;
  }
  function validBackup(data) {
    if (!data || data.schema !== 1 || !Array.isArray(data.words) || !Array.isArray(data.history) || data.words.length > 10000 || data.history.length > 100000) return false;
    const finite = v => typeof v === 'number' && Number.isFinite(v) && v >= 0;
    const ids = new Set();
    for (const w of data.words) {
      if (!w || typeof w.id !== 'string' || !w.id || ids.has(w.id) || typeof w.de !== 'string' || !w.de.trim() || w.de.length > 160 || typeof w.ru !== 'string' || !w.ru.trim() || w.ru.length > 240 || typeof w.deck !== 'string' || w.deck.length > 60 || !Number.isInteger(w.level) || w.level < 0 || w.level > 5 || !Number.isInteger(w.attempts) || w.attempts < 0 || !Number.isInteger(w.correct) || w.correct < 0 || w.correct > w.attempts || ![w.due, w.lastSeen, w.lastPromotion, w.createdAt].every(finite)) return false;
      ids.add(w.id);
    }
    return data.history.every(h => h && typeof h.id === 'string' && typeof h.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(h.date) && typeof h.correct === 'boolean' && finite(h.at));
  }
  const api = {DAY, HOUR, intervals, normalize, alternatives, checkAnswer, status, dateKey, applyAnswer, makeWord, parseBulk, queue, streak, validBackup};
  root.Wortly = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
