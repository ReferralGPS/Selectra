/**
 * Sifter - A library for textually searching arrays and hashes of objects.
 * Designed specifically for autocomplete. Supports diacritics, smart scoring,
 * multi-field sorting, and nested properties.
 *
 * Originally by Brian Reavis, modernized as ES module.
 */

const DIACRITICS = {
  a: '[aḀḁĂăÂâǍǎȺⱥȦȧẠạÄäÀàÁáĀāÃãÅåąĄÃąĄ]',
  b: '[b␢βΒB฿𐌁ᛒ]',
  c: '[cĆćĈĉČčĊċC̄c̄ÇçḈḉȻȼƇƈɕᴄＣｃ]',
  d: '[dĎďḊḋḐḑḌḍḒḓḎḏĐđD̦d̦ƉɖƊɗƋƌᵭᶁᶑȡᴅＤｄð]',
  e: '[eÉéÈèÊêḘḙĚěĔĕẼẽḚḛẺẻĖėËëĒēȨȩĘęᶒɆɇȄȅẾếỀềỄễỂểḜḝḖḗḔḕȆȇẸẹỆệⱸᴇＥｅɘǝƏƐε]',
  f: '[fƑƒḞḟ]',
  g: '[gɢ₲ǤǥĜĝĞğĢģƓɠĠġ]',
  h: '[hĤĥĦħḨḩẖẖḤḥḢḣɦʰǶƕ]',
  i: '[iÍíÌìĬĭÎîǏǐÏïḮḯĨĩĮįĪīỈỉȈȉȊȋỊịḬḭƗɨɨ̆ᵻᶖİiIıɪＩｉ]',
  j: '[jȷĴĵɈɉʝɟʲ]',
  k: '[kƘƙꝀꝁḰḱǨǩḲḳḴḵκϰ₭]',
  l: '[lŁłĽľĻļĹĺḶḷḸḹḼḽḺḻĿŀȽƚⱠⱡⱢɫɬᶅɭȴʟＬｌ]',
  n: '[nŃńǸǹŇňÑñṄṅŅņṆṇṊṋṈṉN̈n̈ƝɲȠƞᵰᶇɳȵɴＮｎŊŋ]',
  o: '[oØøÖöÓóÒòÔôǑǒŐőŎŏȮȯỌọƟɵƠơỎỏŌōÕõǪǫȌȍՕօ]',
  p: '[pṔṕṖṗⱣᵽƤƥᵱ]',
  q: '[qꝖꝗʠɊɋꝘꝙq̃]',
  r: '[rŔŕɌɍŘřŖŗṘṙȐȑȒȓṚṛⱤɽ]',
  s: '[sŚśṠṡṢṣꞨꞩŜŝŠšŞşȘșS̈s̈]',
  t: '[tŤťṪṫŢţṬṭƮʈȚțṰṱṮṯƬƭ]',
  u: '[uŬŭɄʉỤụÜüÚúÙùÛûǓǔŰűŬŭƯưỦủŪūŨũŲųȔȕ∪]',
  v: '[vṼṽṾṿƲʋꝞꝟⱱʋ]',
  w: '[wẂẃẀẁŴŵẄẅẆẇẈẉ]',
  x: '[xẌẍẊẋχ]',
  y: '[yÝýỲỳŶŷŸÿỸỹẎẏỴỵɎɏƳƴ]',
  z: '[zŹźẐẑŽžŻżẒẓẔẕƵƶ]',
};

const asciifold = (() => {
  const lookup = {};
  let i18nChars = '';
  for (const k in DIACRITICS) {
    const chunk = DIACRITICS[k].substring(2, DIACRITICS[k].length - 1);
    i18nChars += chunk;
    for (let i = 0; i < chunk.length; i++) {
      lookup[chunk.charAt(i)] = k;
    }
  }
  const regexp = new RegExp('[' + i18nChars + ']', 'g');
  return (str) =>
    str
      .replace(regexp, (ch) => lookup[ch] || '')
      .toLowerCase();
})();

function escapeRegex(str) {
  return (str + '').replace(/([.?*+^$[\]\\(){}|-])/g, '\\$1');
}

function getAttr(obj, name, nesting) {
  if (!obj || !name) return undefined;
  if (!nesting) return obj[name];
  const names = name.split('.');
  let current = obj;
  while (names.length && current) {
    current = current[names.shift()];
  }
  return current;
}

function cmp(a, b) {
  if (typeof a === 'number' && typeof b === 'number') {
    return a > b ? 1 : a < b ? -1 : 0;
  }
  a = asciifold(String(a || ''));
  b = asciifold(String(b || ''));
  if (a > b) return 1;
  if (b > a) return -1;
  return 0;
}

export default class Sifter {
  constructor(items, settings = {}) {
    this.items = items;
    this.settings = { diacritics: true, ...settings };
  }

  tokenize(query, respectWordBoundaries) {
    query = String(query || '').toLowerCase().trim();
    if (!query.length) return [];

    const tokens = [];
    const words = query.split(/\s+/);

    for (const word of words) {
      let regex = escapeRegex(word);
      if (this.settings.diacritics) {
        for (const letter in DIACRITICS) {
          regex = regex.replace(new RegExp(letter, 'g'), DIACRITICS[letter]);
        }
      }
      if (respectWordBoundaries) regex = '\\b' + regex;
      tokens.push({ string: word, regex: new RegExp(regex, 'i') });
    }

    return tokens;
  }

  getScoreFunction(search, options) {
    search = this.prepareSearch(search, options);
    const { tokens } = search;
    const { fields } = search.options;
    const tokenCount = tokens.length;
    const { nesting } = search.options;

    const scoreValue = (value, token) => {
      if (!value) return 0;
      value = String(value || '');
      const pos = value.search(token.regex);
      if (pos === -1) return 0;
      let score = token.string.length / value.length;
      if (pos === 0) score += 0.5;
      return score;
    };

    const fieldCount = fields.length;
    const scoreObject =
      fieldCount === 0
        ? () => 0
        : fieldCount === 1
          ? (token, data) => scoreValue(getAttr(data, fields[0], nesting), token)
          : (token, data) => {
              let sum = 0;
              for (let i = 0; i < fieldCount; i++) {
                sum += scoreValue(getAttr(data, fields[i], nesting), token);
              }
              return sum / fieldCount;
            };

    if (!tokenCount) return () => 0;
    if (tokenCount === 1) return (data) => scoreObject(tokens[0], data);

    if (search.options.conjunction === 'and') {
      return (data) => {
        let sum = 0;
        for (let i = 0; i < tokenCount; i++) {
          const score = scoreObject(tokens[i], data);
          if (score <= 0) return 0;
          sum += score;
        }
        return sum / tokenCount;
      };
    }

    return (data) => {
      let sum = 0;
      for (let i = 0; i < tokenCount; i++) {
        sum += scoreObject(tokens[i], data);
      }
      return sum / tokenCount;
    };
  }

  getSortFunction(search, options) {
    search = this.prepareSearch(search, options);
    const sort = (!search.query && options.sort_empty) || options.sort;

    const getField = (name, result) => {
      if (name === '$score') return result.score;
      return getAttr(this.items[result.id], name, options.nesting);
    };

    const fields = [];
    if (sort) {
      for (const s of sort) {
        if (search.query || s.field !== '$score') {
          fields.push(s);
        }
      }
    }

    if (search.query) {
      let implicitScore = true;
      for (const f of fields) {
        if (f.field === '$score') {
          implicitScore = false;
          break;
        }
      }
      if (implicitScore) fields.unshift({ field: '$score', direction: 'desc' });
    } else {
      const idx = fields.findIndex((f) => f.field === '$score');
      if (idx !== -1) fields.splice(idx, 1);
    }

    const multipliers = fields.map((f) => (f.direction === 'desc' ? -1 : 1));
    const fieldCount = fields.length;

    if (!fieldCount) return null;
    if (fieldCount === 1) {
      const field = fields[0].field;
      const mult = multipliers[0];
      return (a, b) => mult * cmp(getField(field, a), getField(field, b));
    }

    return (a, b) => {
      for (let i = 0; i < fieldCount; i++) {
        const result = multipliers[i] * cmp(getField(fields[i].field, a), getField(fields[i].field, b));
        if (result) return result;
      }
      return 0;
    };
  }

  prepareSearch(query, options) {
    if (typeof query === 'object') return query;
    options = { ...options };

    if (options.fields && !Array.isArray(options.fields)) options.fields = [options.fields];
    if (options.sort && !Array.isArray(options.sort)) options.sort = [options.sort];
    if (options.sort_empty && !Array.isArray(options.sort_empty))
      options.sort_empty = [options.sort_empty];

    return {
      options,
      query: String(query || '').toLowerCase(),
      tokens: this.tokenize(query, options.respect_word_boundaries),
      total: 0,
      items: [],
    };
  }

  search(query, options) {
    const search = this.prepareSearch(query, options);
    const opts = search.options;
    const q = search.query;

    const fnScore = opts.score || this.getScoreFunction(search);

    const items = this.items;
    if (q.length) {
      const iterate = Array.isArray(items)
        ? (cb) => items.forEach((item, i) => cb(item, i))
        : (cb) => Object.keys(items).forEach((key) => cb(items[key], key));

      iterate((item, id) => {
        const score = fnScore(item);
        if (opts.filter === false || score > 0) {
          search.items.push({ score, id });
        }
      });
    } else {
      const iterate = Array.isArray(items)
        ? (cb) => items.forEach((item, i) => cb(item, i))
        : (cb) => Object.keys(items).forEach((key) => cb(items[key], key));

      iterate((item, id) => {
        search.items.push({ score: 1, id });
      });
    }

    const fnSort = this.getSortFunction(search, opts);
    if (fnSort) search.items.sort(fnSort);

    search.total = search.items.length;
    if (typeof opts.limit === 'number') {
      search.items = search.items.slice(0, opts.limit);
    }

    return search;
  }
}
