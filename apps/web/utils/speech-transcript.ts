function normalizeSpeech(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

/**
 * Android delivers growing snapshots ("morgen", "morgen Flo", …). Keep one hypothesis
 * by extending or overlapping, never concatenating the snapshots.
 */
export function stitchTranscript(previous: string, next: string): string {
  const prev = normalizeSpeech(previous);
  const incoming = normalizeSpeech(next);
  if (!prev) return incoming;
  if (!incoming) return prev;

  const prevLc = prev.toLowerCase();
  const incomingLc = incoming.toLowerCase();
  if (incomingLc === prevLc) return incoming;
  if (incomingLc.startsWith(prevLc) || incomingLc.endsWith(prevLc)) return incoming;
  if (prevLc.startsWith(incomingLc) || prevLc.endsWith(incomingLc)) return prev;

  const prevWords = prev.split(" ");
  const nextWords = incoming.split(" ");
  const maxOverlap = Math.min(prevWords.length, nextWords.length);
  for (let size = maxOverlap; size >= 1; size -= 1) {
    const suffix = prevWords.slice(-size).join(" ").toLowerCase();
    const prefix = nextWords.slice(0, size).join(" ").toLowerCase();
    if (suffix === prefix) {
      return collapseRepeatedTranscript([...prevWords, ...nextWords.slice(size)].join(" "));
    }
  }

  return collapseRepeatedTranscript(`${prev} ${incoming}`);
}

export function longestTranscript(transcripts: string[]): string {
  let best = "";
  for (const raw of transcripts) {
    const value = normalizeSpeech(raw);
    if (value.length >= best.length) best = value;
  }
  return best;
}

/** Join speech fragments and drop consecutive duplicates / extensions. */
export function mergeSpeechSegments(segments: string[]): string {
  let merged = "";
  for (const segment of segments) {
    merged = stitchTranscript(merged, segment);
  }
  return merged;
}

/** "Termin morgen Termin morgen" → "Termin morgen" */
export function collapseRepeatedTranscript(value: string): string {
  let words = normalizeSpeech(value).split(" ").filter(Boolean);
  if (words.length < 2) return words.join(" ");

  let changed = true;
  while (changed) {
    changed = false;
    for (let size = Math.floor(words.length / 2); size >= 1; size -= 1) {
      const next: string[] = [];
      let index = 0;
      while (index < words.length) {
        if (index + 2 * size <= words.length) {
          const phrase = words.slice(index, index + size);
          const phraseLc = phrase.join(" ").toLowerCase();
          const duplicate = words.slice(index + size, index + 2 * size).join(" ").toLowerCase();
          if (phraseLc === duplicate) {
            next.push(...phrase);
            index += 2 * size;
            while (
              index + size <= words.length &&
              words.slice(index, index + size).join(" ").toLowerCase() === phraseLc
            ) {
              index += size;
            }
            changed = true;
            continue;
          }
        }
        next.push(words[index]);
        index += 1;
      }
      words = next;
    }
  }
  return words.join(" ");
}
