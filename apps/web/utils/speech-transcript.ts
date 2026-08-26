function normalizeSpeech(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function isRefinement(previous: string, incoming: string): boolean {
  const a = previous.toLowerCase();
  const b = incoming.toLowerCase();
  if (!a || !b) return false;
  if (a === b) return true;
  if (b.startsWith(a) || a.startsWith(b)) return true;
  return a.length >= 2 && b.length >= 2 && a.slice(0, 2) === b.slice(0, 2);
}

/**
 * Fold engine snapshots into one phrase: keep extensions, replace last-word
 * corrections ("lo" → "Louis"), append only truly new utterances.
 */
export function foldSpeechParts(parts: string[]): string {
  let committed = "";
  for (const raw of parts) {
    const incoming = normalizeSpeech(raw);
    if (!incoming) continue;
    if (!committed) {
      committed = incoming;
      continue;
    }
    const committedLc = committed.toLowerCase();
    const incomingLc = incoming.toLowerCase();
    if (incomingLc === committedLc) continue;
    if (incomingLc.startsWith(committedLc) || incomingLc.includes(` ${committedLc}`) || incomingLc.endsWith(committedLc)) {
      committed = incoming;
      continue;
    }
    if (committedLc.startsWith(incomingLc) || committedLc.includes(` ${incomingLc}`) || committedLc.endsWith(incomingLc)) {
      continue;
    }

    const words = committed.split(" ");
    const lastWord = words[words.length - 1] ?? "";
    const firstIncoming = incoming.split(" ")[0] ?? "";
    if (incoming.split(" ").length === 1 && isRefinement(lastWord, incoming)) {
      words[words.length - 1] = incoming;
      committed = words.join(" ");
      continue;
    }
    if (isRefinement(lastWord, firstIncoming)) {
      words[words.length - 1] = incoming;
      committed = words.join(" ");
      continue;
    }
    committed = `${committed} ${incoming}`;
  }
  return committed;
}

export function spokenFromRecognition(finals: string[], lastInterim: string): string {
  return foldSpeechParts([...finals, lastInterim]);
}
