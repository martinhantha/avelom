import { copyFileSync, existsSync, mkdirSync, unlinkSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const iconSrc = resolve("resources/icon.png");
const appIcon = resolve("ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png");
const splashDir = resolve("ios/App/App/Assets.xcassets/Splash.imageset");
const splashFiles = [
  "splash-2732x2732.png",
  "splash-2732x2732-1.png",
  "splash-2732x2732-2.png",
];

if (!existsSync(iconSrc)) {
  console.warn("Missing resources/icon.png — skip iOS branding.");
  process.exit(0);
}

function ensureParent(file) {
  mkdirSync(dirname(file), { recursive: true });
}

function copyIcon() {
  if (!existsSync(dirname(appIcon))) return false;
  ensureParent(appIcon);
  copyFileSync(iconSrc, appIcon);
  return true;
}

function makeSplash() {
  if (!existsSync(splashDir)) return false;
  const tmp = resolve("resources/.splash-2732.png");
  const result = spawnSync(
    "sips",
    ["--padToHeightWidth", "2732", "2732", "--padColor", "000000", iconSrc, "--out", tmp],
    { encoding: "utf8" },
  );
  if (result.status !== 0) {
    console.warn(result.stderr || "sips could not build the splash image.");
    return false;
  }
  for (const name of splashFiles) {
    copyFileSync(tmp, resolve(splashDir, name));
  }
  try {
    unlinkSync(tmp);
  } catch {
    // ignore
  }
  return true;
}

const iconOk = copyIcon();
const splashOk = makeSplash();
if (iconOk) console.log("Applied Alpiplan app icon to iOS.");
if (splashOk) console.log("Applied Alpiplan splash to iOS.");
if (!iconOk && !splashOk) process.exit(0);
