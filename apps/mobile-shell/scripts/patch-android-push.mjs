import { copyFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const sourceJson =
  [
    resolve(root, "google-services.json"),
    resolve(root, "../../google-services.json"),
  ].find((file) => existsSync(file)) ?? null;

if (!sourceJson) process.exit(0);

const appJson = resolve(root, "android/app/google-services.json");
const appGradle = resolve(root, "android/app/build.gradle");
const rootGradle = resolve(root, "android/build.gradle");
if (!existsSync(appGradle) || !existsSync(rootGradle)) process.exit(0);

copyFileSync(sourceJson, appJson);

let app = readFileSync(appGradle, "utf8");
let appChanged = false;
if (!app.includes("firebase-messaging")) {
  const next = app.replace(
    /dependencies\s*\{/,
    "dependencies {\n    implementation 'com.google.firebase:firebase-messaging:24.1.0'",
  );
  if (next !== app) {
    app = next;
    appChanged = true;
  }
}
if (!app.includes("com.google.gms.google-services")) {
  app = `${app.trimEnd()}\n\napply plugin: 'com.google.gms.google-services'\n`;
  appChanged = true;
}
if (appChanged) writeFileSync(appGradle, app);

let rootBuild = readFileSync(rootGradle, "utf8");
if (!rootBuild.includes("com.google.gms:google-services")) {
  rootBuild = rootBuild.replace(
    /dependencies\s*\{/,
    "dependencies {\n        classpath 'com.google.gms:google-services:4.4.2'",
  );
  writeFileSync(rootGradle, rootBuild);
}

console.log("Patched Android Firebase Cloud Messaging for background push.");
