import { config } from "dotenv";
import { resolve } from "node:path";
import { getMonorepoRoot } from "./monorepo-root";

config({ path: resolve(getMonorepoRoot(), ".env") });
