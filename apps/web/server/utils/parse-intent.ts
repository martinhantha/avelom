export interface IntentEntity {
  id: string;
  displayName: string;
}

export interface IntentCustomer extends IntentEntity {
  phones?: { e164: string | null; raw: string | null }[];
}

export interface IntentLessonType extends IntentEntity {
  defaultDurationMin: number | null;
}

export interface IntentCatalog {
  now?: Date;
  timeZone: string;
  teacherLabel: string;
  teachers: IntentEntity[];
  resources: { id: string; name: string }[];
  lessonTypes: IntentLessonType[];
  customers: IntentCustomer[];
}

export interface ClarifyingOption {
  value: string;
  label: string;
}

export interface ClarifyingQuestion {
  id: string;
  prompt: string;
  options: ClarifyingOption[];
}

export interface ParsedAppointmentIntent {
  date?: string;
  time?: string;
  durationMinutes?: number;
  teacherId?: string;
  teacherName?: string;
  resourceId?: string;
  resourceName?: string;
  lessonTypeId?: string;
  lessonTypeName?: string;
  customerId?: string;
  customerName?: string;
  createCustomer?: boolean;
  phone?: string;
  note?: string;
  contactText?: string;
}

export interface ParseIntentResult {
  parsed: ParsedAppointmentIntent;
  fieldConfidence: Record<string, number>;
  clarifyingQuestions: ClarifyingQuestion[];
  suggestedDefaults: Record<string, unknown>;
}

const WEEKDAYS: Record<string, number> = {
  sonntag: 0,
  montag: 1,
  dienstag: 2,
  mittwoch: 3,
  donnerstag: 4,
  freitag: 5,
  samstag: 6,
  sonnabend: 6,
};

const WEEKDAY_ABBR: Record<string, number> = {
  so: 0,
  mo: 1,
  di: 2,
  mi: 3,
  do: 4,
  fr: 5,
  sa: 6,
};

const MONTHS: Record<string, number> = {
  januar: 1,
  jan: 1,
  februar: 2,
  feb: 2,
  maerz: 3,
  marz: 3,
  mar: 3,
  april: 4,
  apr: 4,
  mai: 5,
  juni: 6,
  jun: 6,
  juli: 7,
  jul: 7,
  august: 8,
  aug: 8,
  september: 9,
  sept: 9,
  sep: 9,
  oktober: 10,
  okt: 10,
  november: 11,
  nov: 11,
  dezember: 12,
  dez: 12,
};

const STOPWORDS = new Set([
  "am",
  "an",
  "auf",
  "bei",
  "beim",
  "bitte",
  "das",
  "dem",
  "den",
  "der",
  "des",
  "die",
  "dort",
  "ein",
  "eine",
  "einen",
  "einer",
  "fuer",
  "hier",
  "im",
  "in",
  "ins",
  "ist",
  "mal",
  "mit",
  "nach",
  "noch",
  "ok",
  "okay",
  "plus",
  "so",
  "um",
  "und",
  "von",
  "vom",
  "zu",
  "zum",
  "zur",
  "uhr",
  "heute",
  "morgen",
  "uebermorgen",
  "naechste",
  "naechsten",
  "kommenden",
  "kommende",
]);

const NAME_STOP = new Set([
  ...STOPWORDS,
  "telefon",
  "telefonnummer",
  "tel",
  "handy",
  "mobil",
  "mobilnummer",
  "nummer",
  "passagier",
  "passagiere",
  "passagierin",
  "kunde",
  "kundin",
  "schueler",
  "schuelerin",
  "gast",
  "teilnehmer",
  "teilnehmerin",
  "flug",
  "stunde",
  "stunden",
  "minute",
  "minuten",
  "min",
  "termin",
]);

const PASSENGER_LABEL =
  /\b(passagier(?:in|e|en)?|kunde|kundin|schueler(?:in)?|gast|teilnehmer(?:in)?)\b/i;

function fold(value: string): string {
  return value
    .normalize("NFKC")
    .replace(/ß/g, "ss")
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/Ä/g, "ae")
    .replace(/Ö/g, "oe")
    .replace(/Ü/g, "ue")
    .toLowerCase();
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function dateKey(year: number, month: number, day: number): string {
  return `${year}-${pad(month)}-${pad(day)}`;
}

function zonedYmd(now: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  }).formatToParts(now);
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    weekday: weekdayMap[map.weekday] ?? now.getDay(),
  };
}

function addDaysYmd(
  ymd: { year: number; month: number; day: number },
  days: number,
): { year: number; month: number; day: number } {
  const utc = Date.UTC(ymd.year, ymd.month - 1, ymd.day + days);
  const date = new Date(utc);
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate() };
}

function nextWeekday(
  ymd: { year: number; month: number; day: number; weekday: number },
  target: number,
): { year: number; month: number; day: number } {
  const delta = (target - ymd.weekday + 7) % 7;
  return addDaysYmd(ymd, delta);
}

function consume(text: string, start: number, end: number): string {
  return `${text.slice(0, start)}${" ".repeat(Math.max(0, end - start))}${text.slice(end)}`;
}

function replaceFirst(text: string, regex: RegExp, replacer: (match: RegExpExecArray) => boolean): string {
  const match = regex.exec(text);
  if (!match || !replacer(match)) return text;
  return consume(text, match.index, match.index + match[0].length);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizePhone(raw: string): string {
  let value = raw.replace(/plus/gi, "+").replace(/[^\d+]/g, "");
  if (value.startsWith("00")) value = `+${value.slice(2)}`;
  if (/^\d{10,}$/.test(value) && /^(49|43|41)/.test(value)) {
    value = `+${value}`;
  }
  if (value.startsWith("+") || (value.startsWith("0") && value.length >= 7)) return value;
  return raw.replace(/\s+/g, " ").trim();
}

function phoneDigits(value: string | null | undefined): string {
  return (value ?? "").replace(/\D/g, "");
}

function phonesMatch(a: string, b: string): boolean {
  const left = phoneDigits(a);
  const right = phoneDigits(b);
  if (left.length < 6 || right.length < 6) return false;
  return left === right || left.endsWith(right.slice(-8)) || right.endsWith(left.slice(-8));
}

function wordTokens(text: string) {
  const tokens: { raw: string; folded: string; start: number; end: number }[] = [];
  const regex = /[A-Za-zÄÖÜäöüß][A-Za-zÄÖÜäöüß\-']*/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text))) {
    tokens.push({
      raw: match[0],
      folded: fold(match[0]),
      start: match.index,
      end: match.index + match[0].length,
    });
  }
  return tokens;
}

function isNameToken(token: string): boolean {
  return token.length >= 2 && !NAME_STOP.has(token) && !/^\d+$/.test(token);
}

function titleCaseName(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function entityWords(name: string): string[] {
  return fold(name)
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length >= 2 && !STOPWORDS.has(word));
}

function nameMatchesQuery(displayName: string, query: string): boolean {
  const foldedName = fold(displayName);
  const foldedQuery = fold(query.trim());
  if (!foldedQuery || foldedQuery.length < 2) return false;
  if (foldedName === foldedQuery) return true;
  const words = entityWords(displayName);
  if (words.includes(foldedQuery)) return true;
  return foldedName.startsWith(`${foldedQuery} `) || foldedName.endsWith(` ${foldedQuery}`);
}

function findNameMatches<T>(items: T[], query: string, nameOf: (item: T) => string): T[] {
  return items.filter((item) => nameMatchesQuery(nameOf(item), query));
}

function uniqueById<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

function catalogHits<T>(
  items: T[],
  remaining: string,
  nameOf: (item: T) => string,
): { item: T; score: number }[] {
  const foldedRemaining = fold(remaining);
  const hits: { item: T; score: number }[] = [];
  for (const item of items) {
    const name = nameOf(item).trim();
    if (!name) continue;
    const foldedName = fold(name);
    const first = entityWords(name)[0];
    const candidates = [foldedName, ...(first && first !== foldedName ? [first] : [])].filter(
      (value) => value.length >= 2,
    );
    for (const candidate of candidates) {
      const regex = new RegExp(`(?:^|[^a-z0-9])${escapeRegExp(candidate)}(?=[^a-z0-9]|$)`);
      if (!regex.test(foldedRemaining)) continue;
      const exact = foldedName === candidate;
      hits.push({ item, score: exact ? 3 : 2 });
      break;
    }
  }
  hits.sort((a, b) => b.score - a.score);
  return hits;
}

function consumeName(text: string, name: string): string {
  const first = entityWords(name)[0];
  if (!first) return text;
  return text.replace(new RegExp(`\\b${escapeRegExp(first)}\\b`, "ig"), " ");
}

function extractPhone(text: string): { phone?: string; remaining: string } {
  const labeled =
    /\b(?:telefonnummer|telefon|tel\.?|handy|mobilnummer|mobil|nummer)\b\s*[:.]?\s*((?:plus\s*)?\+?\s*(?:00)?\s*(?:49|43|41)?[\d\s./-]{6,})/i;
  const labeledMatch = labeled.exec(text);
  if (labeledMatch) {
    return {
      phone: normalizePhone(labeledMatch[1]),
      remaining: consume(text, labeledMatch.index, labeledMatch.index + labeledMatch[0].length),
    };
  }
  const standalone = /(?:plus\s*)?\+\s*(?:00)?\s*(?:49|43|41)[\d\s./-]{6,}|\b(?:00(?:49|43|41)|0\d{3,})[\d\s./-]{4,}\b/i;
  const standaloneMatch = standalone.exec(text);
  if (standaloneMatch) {
    return {
      phone: normalizePhone(standaloneMatch[0]),
      remaining: consume(text, standaloneMatch.index, standaloneMatch.index + standaloneMatch[0].length),
    };
  }
  return { remaining: text };
}

function extractTime(text: string): { time?: string; remaining: string; confidence: number } {
  const clock = /\b(?:um\s+)?(\d{1,2})\s*[:.]\s*(\d{2})(?:\s*uhr)?\b/i;
  const clockMatch = clock.exec(text);
  if (clockMatch) {
    const hour = Number(clockMatch[1]);
    const minute = Number(clockMatch[2]);
    if (hour <= 23 && minute <= 59) {
      return {
        time: `${pad(hour)}:${pad(minute)}`,
        remaining: consume(text, clockMatch.index, clockMatch.index + clockMatch[0].length),
        confidence: 0.95,
      };
    }
  }
  const uhr = /\b(?:um\s+)?(\d{1,2})\s*uhr(?:\s*(\d{1,2}))?\b/i;
  const uhrMatch = uhr.exec(text);
  if (uhrMatch) {
    const hour = Number(uhrMatch[1]);
    const minute = uhrMatch[2] ? Number(uhrMatch[2]) : 0;
    if (hour <= 23 && minute <= 59) {
      return {
        time: `${pad(hour)}:${pad(minute)}`,
        remaining: consume(text, uhrMatch.index, uhrMatch.index + uhrMatch[0].length),
        confidence: 0.93,
      };
    }
  }
  return { remaining: text, confidence: 0 };
}

function extractDuration(text: string): { durationMinutes?: number; remaining: string; confidence: number } {
  const minutes = /\b(\d{1,3})\s*(?:minuten|minute|min)\b/i;
  const minutesMatch = minutes.exec(text);
  if (minutesMatch) {
    return {
      durationMinutes: Number(minutesMatch[1]),
      remaining: consume(text, minutesMatch.index, minutesMatch.index + minutesMatch[0].length),
      confidence: 0.92,
    };
  }
  if (/\banderthalb\s+stunden?\b/i.test(text)) {
    return {
      durationMinutes: 90,
      remaining: replaceFirst(text, /\banderthalb\s+stunden?\b/i, () => true),
      confidence: 0.9,
    };
  }
  if (/\beine\s+stunde\b/i.test(text)) {
    return {
      durationMinutes: 60,
      remaining: replaceFirst(text, /\beine\s+stunde\b/i, () => true),
      confidence: 0.9,
    };
  }
  const hours = /\b(\d{1,2})\s*stunden?\b/i;
  const hoursMatch = hours.exec(text);
  if (hoursMatch) {
    return {
      durationMinutes: Number(hoursMatch[1]) * 60,
      remaining: consume(text, hoursMatch.index, hoursMatch.index + hoursMatch[0].length),
      confidence: 0.88,
    };
  }
  return { remaining: text, confidence: 0 };
}

function extractDate(
  text: string,
  now: Date,
  timeZone: string,
): { date?: string; remaining: string; confidence: number } {
  const today = zonedYmd(now, timeZone);
  let remaining = text;
  let date: string | undefined;
  let confidence = 0;

  const take = (start: number, end: number, next: { year: number; month: number; day: number }, conf: number) => {
    if (date) return;
    date = dateKey(next.year, next.month, next.day);
    confidence = conf;
    remaining = consume(remaining, start, end);
  };

  const iso = /\b(\d{4})-(\d{2})-(\d{2})\b/;
  const isoMatch = iso.exec(remaining);
  if (isoMatch) {
    take(
      isoMatch.index,
      isoMatch.index + isoMatch[0].length,
      { year: Number(isoMatch[1]), month: Number(isoMatch[2]), day: Number(isoMatch[3]) },
      0.97,
    );
  }

  const numeric = /\b(\d{1,2})\.\s*(\d{1,2})\.(?:\s*(\d{2,4}))?\b/;
  const numericMatch = numeric.exec(remaining);
  if (numericMatch && !date) {
    const day = Number(numericMatch[1]);
    const month = Number(numericMatch[2]);
    let year = numericMatch[3] ? Number(numericMatch[3]) : today.year;
    if (year < 100) year += 2000;
    if (!numericMatch[3] && (month < today.month || (month === today.month && day < today.day))) {
      year += 1;
    }
    take(numericMatch.index, numericMatch.index + numericMatch[0].length, { year, month, day }, 0.9);
  }

  const named = new RegExp(`\\b(\\d{1,2})\\.\\s*(${Object.keys(MONTHS).join("|")})(?:\\s*(\\d{4}))?\\b`, "i");
  const namedMatch = named.exec(fold(remaining));
  if (namedMatch && !date) {
    const day = Number(namedMatch[1]);
    const month = MONTHS[fold(namedMatch[2])];
    let year = namedMatch[3] ? Number(namedMatch[3]) : today.year;
    if (!namedMatch[3] && month < today.month) year += 1;
    if (month) {
      take(namedMatch.index, namedMatch.index + namedMatch[0].length, { year, month, day }, 0.9);
    }
  }

  const relative: { pattern: RegExp; days: number; conf: number }[] = [
    { pattern: /\bheute\b/i, days: 0, conf: 0.95 },
    { pattern: /\buebermorgen\b|\bübermorgen\b/i, days: 2, conf: 0.95 },
    { pattern: /\bmorgen\b/i, days: 1, conf: 0.95 },
    { pattern: /\bin\s+einem\s+tag\b/i, days: 1, conf: 0.9 },
    { pattern: /\bin\s+zwei\s+tagen\b/i, days: 2, conf: 0.9 },
  ];
  for (const item of relative) {
    const match = item.pattern.exec(remaining);
    if (match && !date) {
      take(match.index, match.index + match[0].length, addDaysYmd(today, item.days), item.conf);
    }
  }

  const nextDays = /\bin\s+(\d{1,2})\s+tagen\b/i;
  const nextDaysMatch = nextDays.exec(remaining);
  if (nextDaysMatch && !date) {
    take(
      nextDaysMatch.index,
      nextDaysMatch.index + nextDaysMatch[0].length,
      addDaysYmd(today, Number(nextDaysMatch[1])),
      0.9,
    );
  }

  const weekdayNames = Object.keys(WEEKDAYS).join("|");
  const nextWeekdayRe = new RegExp(
    `\\b(?:naechste[n]?|nächste[n]?|kommende[n]?)\\s+(${weekdayNames})\\b`,
    "i",
  );
  const nextWeekdayMatch = nextWeekdayRe.exec(fold(remaining));
  if (nextWeekdayMatch && !date) {
    const target = WEEKDAYS[fold(nextWeekdayMatch[1])];
    const next = nextWeekday(today, target);
    const shifted = next.day === today.day && next.month === today.month ? addDaysYmd(next, 7) : next;
    take(nextWeekdayMatch.index, nextWeekdayMatch.index + nextWeekdayMatch[0].length, shifted, 0.86);
  }

  const weekdayRe = new RegExp(`\\b(${weekdayNames})\\b`, "i");
  const weekdayMatch = weekdayRe.exec(fold(remaining));
  if (weekdayMatch && !date) {
    const target = WEEKDAYS[fold(weekdayMatch[1])];
    take(weekdayMatch.index, weekdayMatch.index + weekdayMatch[0].length, nextWeekday(today, target), 0.84);
  }

  const abbrRe = new RegExp(`\\b(${Object.keys(WEEKDAY_ABBR).join("|")})\\b`, "i");
  const abbrMatch = abbrRe.exec(fold(remaining));
  if (abbrMatch && !date) {
    const target = WEEKDAY_ABBR[fold(abbrMatch[1])];
    take(abbrMatch.index, abbrMatch.index + abbrMatch[0].length, nextWeekday(today, target), 0.7);
  }

  return { date, remaining, confidence };
}

function extractLabeledName(text: string, pattern: RegExp): { name?: string; remaining: string } {
  const match = pattern.exec(text);
  if (!match) return { remaining: text };
  const after = text.slice(match.index + match[0].length);
  const tokens = wordTokens(after);
  const picked: string[] = [];
  let end = match.index + match[0].length;
  for (const token of tokens) {
    if (token.start > 2) break;
    if (!isNameToken(token.folded)) break;
    picked.push(token.raw);
    end = match.index + match[0].length + token.end;
    if (picked.length >= 3) break;
  }
  if (!picked.length) return { remaining: text };
  return {
    name: titleCaseName(picked.join(" ")),
    remaining: consume(text, match.index, end),
  };
}

function leftoverNote(text: string): string | undefined {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned) return undefined;
  const tokens = cleaned
    .split(" ")
    .map((token) => fold(token.replace(/[^\p{L}\p{N}-]+/gu, "")))
    .filter((token) => token && !STOPWORDS.has(token) && !NAME_STOP.has(token) && token.length > 1);
  if (!tokens.length) return undefined;
  return cleaned;
}

function applyAnswers(
  parsed: ParsedAppointmentIntent,
  catalog: IntentCatalog,
  answers: Record<string, string>,
  fieldConfidence: Record<string, number>,
  questions: ClarifyingQuestion[],
) {
  const teacherId = answers.teacher || answers.teacherId;
  if (teacherId) {
    const teacher = catalog.teachers.find((item) => item.id === teacherId);
    if (teacher) {
      parsed.teacherId = teacher.id;
      parsed.teacherName = teacher.displayName;
      fieldConfidence.teacherId = 1;
      removeQuestion(questions, "teacher");
    }
  }
  const lessonTypeId = answers.lessonType || answers.lessonTypeId;
  if (lessonTypeId) {
    const lessonType = catalog.lessonTypes.find((item) => item.id === lessonTypeId);
    if (lessonType) {
      parsed.lessonTypeId = lessonType.id;
      parsed.lessonTypeName = lessonType.displayName;
      fieldConfidence.lessonTypeId = 1;
      removeQuestion(questions, "lessonType");
    }
  }
  const resourceId = answers.resource || answers.resourceId;
  if (resourceId) {
    const resource = catalog.resources.find((item) => item.id === resourceId);
    if (resource) {
      parsed.resourceId = resource.id;
      parsed.resourceName = resource.name;
      fieldConfidence.resourceId = 1;
      removeQuestion(questions, "resource");
    }
  }
  const customerValue = answers.customer || answers.customerId;
  if (customerValue === "new") {
    parsed.customerId = undefined;
    parsed.createCustomer = true;
    fieldConfidence.customerId = 1;
    removeQuestion(questions, "customer");
  } else if (customerValue) {
    const customer = catalog.customers.find((item) => item.id === customerValue);
    if (customer) {
      parsed.customerId = customer.id;
      parsed.customerName = customer.displayName;
      parsed.createCustomer = false;
      fieldConfidence.customerId = 1;
      removeQuestion(questions, "customer");
    }
  }
}

function removeQuestion(questions: ClarifyingQuestion[], id: string) {
  const index = questions.findIndex((question) => question.id === id);
  if (index >= 0) questions.splice(index, 1);
}

export function parseAppointmentIntent(
  rawText: string,
  catalog: IntentCatalog,
  answers: Record<string, string> = {},
): ParseIntentResult {
  const original = rawText.replace(/\s+/g, " ").trim();
  const parsed: ParsedAppointmentIntent = { contactText: original };
  const fieldConfidence: Record<string, number> = {};
  const clarifyingQuestions: ClarifyingQuestion[] = [];
  const now = catalog.now ?? new Date();

  let working = original.replace(/\bplus\b/gi, "+");

  const phoneHit = extractPhone(working);
  working = phoneHit.remaining;
  if (phoneHit.phone) {
    parsed.phone = phoneHit.phone;
    fieldConfidence.phone = 0.9;
  }

  const dateHit = extractDate(working, now, catalog.timeZone);
  working = dateHit.remaining;
  if (dateHit.date) {
    parsed.date = dateHit.date;
    fieldConfidence.date = dateHit.confidence;
  }

  const timeHit = extractTime(working);
  working = timeHit.remaining;
  if (timeHit.time) {
    parsed.time = timeHit.time;
    fieldConfidence.time = timeHit.confidence;
  }

  const durationHit = extractDuration(working);
  working = durationHit.remaining;
  if (durationHit.durationMinutes) {
    parsed.durationMinutes = durationHit.durationMinutes;
    fieldConfidence.durationMinutes = durationHit.confidence;
  }

  const passengerHit = extractLabeledName(working, PASSENGER_LABEL);
  working = passengerHit.remaining;
  if (passengerHit.name) {
    parsed.customerName = passengerHit.name;
    fieldConfidence.customerName = 0.86;
  }

  const roleLabels = [
    catalog.teacherLabel,
    "lehrer",
    "lehrerin",
    "pilot",
    "pilotin",
    "fluglehrer",
    "fluglehrerin",
    "instructor",
    "trainer",
  ]
    .map((label) => fold(label).trim())
    .filter((label, index, all) => label && all.indexOf(label) === index);
  const teacherLabelRe = new RegExp(`\\b(?:${roleLabels.map(escapeRegExp).join("|")})\\b`, "i");
  const teacherHit = extractLabeledName(working, teacherLabelRe);
  working = teacherHit.remaining;

  const lessonHits = uniqueById(
    catalogHits(catalog.lessonTypes, working, (item) => item.displayName).map((hit) => hit.item),
  );
  if (lessonHits.length === 1) {
    parsed.lessonTypeId = lessonHits[0].id;
    parsed.lessonTypeName = lessonHits[0].displayName;
    fieldConfidence.lessonTypeId = 0.9;
    working = consumeName(working, lessonHits[0].displayName);
  } else if (lessonHits.length > 1) {
    clarifyingQuestions.push({
      id: "lessonType",
      prompt: "Welche Terminart ist gemeint?",
      options: lessonHits.slice(0, 5).map((item) => ({ value: item.id, label: item.displayName })),
    });
    fieldConfidence.lessonTypeId = 0.4;
  }

  const resourceHits = uniqueById(
    catalogHits(
      catalog.resources.map((item) => ({ id: item.id, displayName: item.name })),
      working,
      (item) => item.displayName,
    ).map((hit) => hit.item),
  );
  if (resourceHits.length === 1) {
    parsed.resourceId = resourceHits[0].id;
    parsed.resourceName = resourceHits[0].displayName;
    fieldConfidence.resourceId = 0.85;
    working = consumeName(working, resourceHits[0].displayName);
  } else if (resourceHits.length > 1) {
    clarifyingQuestions.push({
      id: "resource",
      prompt: "Welche Ressource ist gemeint?",
      options: resourceHits.slice(0, 5).map((item) => ({ value: item.id, label: item.displayName })),
    });
    fieldConfidence.resourceId = 0.4;
  }

  let teacherQuery = teacherHit.name;
  let teacherHits = teacherQuery
    ? findNameMatches(catalog.teachers, teacherQuery, (item) => item.displayName)
    : uniqueById(catalogHits(catalog.teachers, working, (item) => item.displayName).map((hit) => hit.item));

  if (teacherHits.length === 1) {
    parsed.teacherId = teacherHits[0].id;
    parsed.teacherName = teacherHits[0].displayName;
    fieldConfidence.teacherId = teacherHit.name ? 0.92 : 0.82;
    working = consumeName(working, teacherHits[0].displayName);
  } else if (teacherHits.length > 1) {
    clarifyingQuestions.push({
      id: "teacher",
      prompt: `Welcher „${teacherQuery || catalog.teacherLabel}“ ist gemeint?`,
      options: teacherHits.slice(0, 5).map((item) => ({ value: item.id, label: item.displayName })),
    });
    fieldConfidence.teacherId = 0.4;
  }

  if (parsed.phone && !parsed.customerId) {
    const byPhone = catalog.customers.filter((customer) =>
      (customer.phones ?? []).some((phone) => phonesMatch(parsed.phone!, phone.e164 || phone.raw || "")),
    );
    if (byPhone.length === 1 && !parsed.customerName) {
      parsed.customerId = byPhone[0].id;
      parsed.customerName = byPhone[0].displayName;
      fieldConfidence.customerId = 0.88;
    }
  }

  if (parsed.customerName) {
    const customerHits = findNameMatches(catalog.customers, parsed.customerName, (item) => item.displayName);
    if (customerHits.length === 1) {
      parsed.customerId = customerHits[0].id;
      parsed.customerName = customerHits[0].displayName;
      parsed.createCustomer = false;
      fieldConfidence.customerId = 0.9;
    } else if (customerHits.length > 1) {
      clarifyingQuestions.push({
        id: "customer",
        prompt: `Welcher Passagier „${parsed.customerName}“ ist gemeint?`,
        options: [
          ...customerHits.slice(0, 4).map((item) => ({ value: item.id, label: item.displayName })),
          { value: "new", label: `Neu anlegen: ${parsed.customerName}` },
        ],
      });
      fieldConfidence.customerId = 0.4;
    } else {
      parsed.createCustomer = true;
      fieldConfidence.customerId = 0.78;
    }
  }

  applyAnswers(parsed, catalog, answers, fieldConfidence, clarifyingQuestions);

  const note = leftoverNote(working);
  if (note) parsed.note = note;

  return {
    parsed,
    fieldConfidence,
    clarifyingQuestions: clarifyingQuestions.slice(0, 3),
    suggestedDefaults: {},
  };
}
