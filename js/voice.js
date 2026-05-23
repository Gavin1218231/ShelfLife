/**
 * Voice — Web Speech API for voice input.
 */
const Voice = (() => {
  let recognition = null;
  let isListening = false;

  function isSupported() {
    return typeof window.SpeechRecognition !== 'undefined' ||
           typeof window.webkitSpeechRecognition !== 'undefined';
  }

  function init() {
    if (!isSupported()) return false;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SR();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    return true;
  }

  function listen(onResult, onError) {
    if (!recognition && !init()) {
      onError && onError('Voice recognition not supported');
      return;
    }
    if (isListening) return;
    isListening = true;
    recognition.onresult = (event) => {
      const text = event.results[0][0].transcript;
      isListening = false;
      onResult && onResult(text);
    };
    recognition.onerror = (event) => {
      isListening = false;
      onError && onError(event.error || 'Recognition error');
    };
    recognition.onend = () => { isListening = false; };
    try { recognition.start(); }
    catch (e) { isListening = false; onError && onError(e.message); }
  }

  function stop() {
    if (recognition && isListening) {
      recognition.stop();
      isListening = false;
    }
  }

  function speak(text) {
    if (!('speechSynthesis' in window)) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    speechSynthesis.speak(utterance);
  }

  /**
   * Parse natural language command into item data.
   * Examples:
   *   "Add milk expires Friday in fridge"
   *   "Add 2 pounds chicken expires tomorrow"
   *   "Add 12 eggs in fridge expires in 14 days"
   */
  function parseCommand(text) {
    const lower = text.toLowerCase().trim();
    if (!lower.startsWith('add')) {
      return { error: 'Command should start with "add"', original: text };
    }
    let remaining = lower.slice(3).trim();
    let quantity = 1;
    let unit = 'pieces';
    let location = null;
    let expirationDate = null;

    // Parse quantity and unit (e.g., "2 pounds", "12", "1 gallon")
    const qtyMatch = remaining.match(/^(\d+(?:\.\d+)?)\s*(\w+)?\s+/);
    if (qtyMatch) {
      quantity = parseFloat(qtyMatch[1]);
      const possibleUnit = qtyMatch[2];
      const unitMap = {
        pound: 'lbs', pounds: 'lbs', lb: 'lbs', lbs: 'lbs',
        ounce: 'oz', ounces: 'oz', oz: 'oz',
        gallon: 'gallons', gallons: 'gallons',
        cup: 'cups', cups: 'cups',
        can: 'cans', cans: 'cans',
        bottle: 'bottles', bottles: 'bottles',
        box: 'boxes', boxes: 'boxes',
        bag: 'bags', bags: 'bags',
        gram: 'g', grams: 'g',
        kilogram: 'kg', kilograms: 'kg', kg: 'kg',
        liter: 'liters', liters: 'liters',
      };
      if (possibleUnit && unitMap[possibleUnit]) {
        unit = unitMap[possibleUnit];
        remaining = remaining.slice(qtyMatch[0].length);
      } else {
        remaining = remaining.slice(qtyMatch[1].length).trim();
      }
    }

    // Parse location
    const locationKeywords = {
      'in fridge': 'fridge', 'in refrigerator': 'fridge', 'fridge': 'fridge', 'refrigerator': 'fridge',
      'in freezer': 'freezer', 'freezer': 'freezer',
      'in pantry': 'pantry', 'pantry': 'pantry',
      'in cabinet': 'cabinet', 'cabinet': 'cabinet',
      'on counter': 'countertop', 'countertop': 'countertop',
      'spice rack': 'spiceRack', 'wine cellar': 'wineCellar',
    };
    for (const [keyword, loc] of Object.entries(locationKeywords)) {
      const idx = remaining.indexOf(keyword);
      if (idx >= 0) {
        location = loc;
        remaining = (remaining.slice(0, idx) + remaining.slice(idx + keyword.length)).trim();
        break;
      }
    }

    // Parse expiration date
    const expirationMatch = remaining.match(/expires?\s+(.+?)(?:$|\s+(?:in|at)\s)/);
    let expirationText = null;
    if (expirationMatch) {
      expirationText = expirationMatch[1].trim();
      remaining = remaining.replace(expirationMatch[0], '').trim();
    }

    if (expirationText) {
      expirationDate = parseDateString(expirationText);
    }

    // Whatever's left is the name
    const name = remaining.trim().replace(/^(of\s+)?/, '');

    return {
      name: name || null,
      quantity, unit, location, expirationDate,
      original: text,
    };
  }

  function parseDateString(text) {
    text = text.toLowerCase().trim();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (text === 'today') return today.toISOString().split('T')[0];
    if (text === 'tomorrow') {
      const d = new Date(today); d.setDate(d.getDate() + 1);
      return d.toISOString().split('T')[0];
    }

    const inDays = text.match(/in (\d+) days?/);
    if (inDays) {
      const d = new Date(today); d.setDate(d.getDate() + parseInt(inDays[1]));
      return d.toISOString().split('T')[0];
    }

    const inWeeks = text.match(/in (\d+) weeks?/);
    if (inWeeks) {
      const d = new Date(today); d.setDate(d.getDate() + parseInt(inWeeks[1]) * 7);
      return d.toISOString().split('T')[0];
    }

    const days = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
    for (let i = 0; i < days.length; i++) {
      if (text.includes(days[i])) {
        const d = new Date(today);
        const diff = (i - d.getDay() + 7) % 7 || 7;
        d.setDate(d.getDate() + diff);
        return d.toISOString().split('T')[0];
      }
    }

    if (text.includes('next week')) {
      const d = new Date(today); d.setDate(d.getDate() + 7);
      return d.toISOString().split('T')[0];
    }

    // Try to parse as date directly
    const parsed = new Date(text);
    if (!isNaN(parsed.getTime())) return parsed.toISOString().split('T')[0];

    return null;
  }

  return {
    isSupported, listen, stop, speak, parseCommand, parseDateString,
    isListening: () => isListening,
  };
})();
