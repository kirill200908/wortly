(function (root) {
  'use strict';
  const DAY = 86400000, HOUR = 3600000;
  const intervals = [0, 600000, DAY, 3 * DAY, 7 * DAY, 21 * DAY];
  const normalize = value => String(value).normalize('NFKC').toLowerCase().replace(/ё/g, 'е').replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss').replace(/[.!?…]+$/g, '').replace(/\s+/g, ' ').trim();
  const checkAnswer = (answer, expected) => String(answer).trim() === String(expected).trim();
  const pairKey = (de, ru) => JSON.stringify([String(de).trim(), String(ru).trim()]);
  function uniquePrompts(words, direction = 'de-ru') {
    const field = direction === 'de-ru' ? 'de' : 'ru', seen = new Set();
    return words.filter(word => {const key = word[field].trim(); if (seen.has(key)) return false; seen.add(key); return true;});
  }
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
  function splitRow(line, preferredSeparator) {
    let quote = false, separator = -1, comma = -1;
    // Delimiters inside a quoted CSV field belong to the word or its translation.
    // Prefer an explicit separator; a comma may be punctuation in a German phrase.
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (quote && line[i + 1] === '"') i++;
        else quote = !quote;
      } else if (!quote && preferredSeparator) {
        if (c === preferredSeparator) {separator = i; break;}
      } else if (!quote && c === ',') {
        if (comma < 0) comma = i;
        if (line.trimStart().startsWith('"')) {separator = i; break;}
      } else if (!quote && ('\t;=—–'.includes(c) || (c === '-' && /\s/.test(line[i - 1] || '') && /\s/.test(line[i + 1] || '')))) {
        separator = i;
        break;
      }
    }
    if (separator < 0 && !preferredSeparator) separator = comma;
    if (separator < 0) return [];
    function field(value) {
      const trimmed = value.trim();
      if (!trimmed.startsWith('"')) return trimmed;
      let decoded = '';
      for (let i = 1; i < trimmed.length; i++) {
        if (trimmed[i] !== '"') decoded += trimmed[i];
        else if (trimmed[i + 1] === '"') {decoded += '"'; i++;}
        else return trimmed.slice(i + 1).trim() ? null : decoded.trim();
      }
      return null;
    }
    const de = field(line.slice(0, separator)), ru = field(line.slice(separator + 1));
    if (de === null || ru === null) return [];
    const fields = [de, ru];
    fields.separator = line[separator];
    return fields;
  }
  function parseBulk(text, deck) {
    const words = [], errors = [];
    let preferredSeparator, firstRow = true;
    const rows = text.replace(/^\uFEFF/, '').split(/\r?\n/);
    rows.forEach((line, i) => {
      if (!line.trim()) return;
      const parts = splitRow(line, preferredSeparator), isFirstRow = firstRow;
      firstRow = false;
      if (isFirstRow && /^(de|german|немецкий|слово)$/i.test(parts[0]) && /^(ru|russian|перевод|русский)$/i.test(parts[1])) {preferredSeparator = parts.separator; return;}
      const [de, ru] = parts;
      if (parts.length < 2 || !de || !parts[1] || de.length > 160 || ru.length > 240) {errors.push(i + 1); return;}
      words.push(makeWord(de, ru, deck));
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
    if (!data || data.schema !== 1 || !Array.isArray(data.words) || !Array.isArray(data.history) || data.words.length > 10000) return false;
    const finite = v => typeof v === 'number' && Number.isFinite(v) && v >= 0;
    const ids = new Set();
    for (const w of data.words) {
      if (!w || typeof w.id !== 'string' || !w.id || ids.has(w.id) || typeof w.de !== 'string' || !w.de.trim() || w.de.length > 160 || typeof w.ru !== 'string' || !w.ru.trim() || w.ru.length > 240 || typeof w.deck !== 'string' || w.deck.length > 60 || !Number.isInteger(w.level) || w.level < 0 || w.level > 5 || !Number.isInteger(w.attempts) || w.attempts < 0 || !Number.isInteger(w.correct) || w.correct < 0 || w.correct > w.attempts || !Number.isInteger(w.lapses) || w.lapses < 0 || ![w.due, w.lastSeen, w.lastPromotion, w.createdAt].every(finite)) return false;
      ids.add(w.id);
    }
    return data.history.every(h => h && typeof h.id === 'string' && typeof h.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(h.date) && typeof h.correct === 'boolean' && finite(h.at));
  }
  const api = {DAY, HOUR, intervals, normalize, checkAnswer, pairKey, uniquePrompts, status, dateKey, applyAnswer, makeWord, parseBulk, queue, streak, validBackup};
  root.Wortly = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
