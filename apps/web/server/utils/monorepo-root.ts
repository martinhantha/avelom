import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** Repo-Root, ausgehend von `server/utils`. */
export function getMonorepoRoot(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  return resolve(here, "../../../..");
}
