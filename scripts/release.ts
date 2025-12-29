import { $ } from "bun";
import { mkdir, rm, cp, writeFile, readFile } from "node:fs/promises";
import path from "node:path";
import fs from "node:fs";

const RELEASE_DIR = "./roobie_cms_release";

async function build() {
  try {
    console.log("--------------------------------------------------");
    console.log("🚀 START: Budowanie wersji produkcyjnej Roobie CMS");
    console.log("--------------------------------------------------");

    // 1. Czyszczenie procesów i folderów
    if (process.platform === "win32") {
      try {
        await $`taskkill /F /IM build_server.exe /T`.quiet();
        await $`taskkill /F /IM RoobieCMS.exe /T`.quiet();
      } catch (e) {}
    }
    await rm(RELEASE_DIR, { recursive: true, force: true });
    await mkdir(RELEASE_DIR, { recursive: true });

    // 2. Pobieranie zmiennych środowiskowych
    console.log("📄 Przygotowywanie .env...");
    const rootEnv = path.join(process.cwd(), ".env");
    const backendEnv = path.join(process.cwd(), "backend", ".env");
    let envContent = "";

    if (fs.existsSync(rootEnv)) {
      envContent = await readFile(rootEnv, "utf-8");
    } else if (fs.existsSync(backendEnv)) {
      envContent = await readFile(backendEnv, "utf-8");
    } else {
      envContent = "PORT=3001\nNODE_ENV=production\nNEXT_PUBLIC_API_URL=http://localhost:3001\n";
    }

    // Zapisujemy .env do folderu release dla Launchera
    await writeFile(path.join(RELEASE_DIR, ".env"), envContent);

    // 3. Budowanie Backend
    console.log("⚙️  Budowanie Backend...");
    await $`cd backend && bun build --compile --outfile ../${RELEASE_DIR}/build_server.exe ./src/server.ts`;
    await cp("./backend/drizzle", path.join(RELEASE_DIR, "drizzle"), { recursive: true });

    // 4. Budowanie Frontend (NAPRAWA 404 I PRZEŁADOWYWANIA)
    console.log("🌐 Budowanie Frontend (Next.js)...");

    // Klucz: Next.js potrzebuje .env przed buildem!
    await writeFile(path.join(process.cwd(), "frontend", ".env.local"), envContent);
    await $`cd frontend && bun run build`;

    const frontendDest = path.join(RELEASE_DIR, "frontend" );
    await mkdir(frontendDest, { recursive: true });

    // Kopiowanie standalone
    await cp("./frontend/.next/standalone", frontendDest, { recursive: true });

    // FIX DLA 404: Standalone szuka plików statycznych w folderze .next/static wewnątrz swojej lokalizacji
    const internalStatic = path.join(frontendDest, "frontend", ".next", "static");
    await mkdir(path.dirname(internalStatic), { recursive: true });
    await cp("./frontend/.next/static", internalStatic, { recursive: true });

    // Kopiowanie public
    await cp("./frontend/public", path.join(frontendDest, "public"), { recursive: true });

    // 5. Tworzenie Launchera (Zintegrowane sterowanie)
    console.log("🚀 Generowanie RoobieCMS.exe...");
    const launcherCode = [
      'import { $ } from "bun";',
      'import path from "node:path";',
      'import fs from "node:fs";',
      '',
      'const dir = process.cwd();',
      'const envVars = { ...process.env };',
      'const envPath = path.join(dir, ".env");',
      '',
      'if (fs.existsSync(envPath)) {',
      '  fs.readFileSync(envPath, "utf-8").split("\\n").forEach(line => {',
      '    const [k, v] = line.split("=");',
      '    if (k && v) envVars[k.trim()] = v.trim();',
      '  });',
      '}',
      '',
      '// Naprawa połączenia z bazą i komunikacji',
      'envVars["DB_PATH"] = path.resolve(dir, "roobie.db");',
      'envVars["DB_MIGRATIONS_PATH"] = path.resolve(dir, "drizzle");',
      'envVars["PORT"] = envVars["PORT"] || "3001";',
      'envVars["NODE_ENV"] = "production";',
      '',
      'console.log("-----------------------------------------");',
      'console.log("🟢 Roobie CMS jest uruchomiony");',
      'console.log("🔗 http://localhost:3000");',
      'console.log("-----------------------------------------");',
      '',
      'const api = Bun.spawn(["./build_server.exe"], { env: envVars, stdout: "inherit" });',
      'const web = Bun.spawn(["bun", "./frontend/server.js"], {',
      '  cwd: path.resolve(dir, "frontend"),',
      '  env: { ...envVars, PORT: "3000", HOSTNAME: "localhost" },',
      '  stdout: "inherit"',
      '});',
      '',
      'if (process.platform === "win32") {',
      '  setTimeout(() => Bun.spawn(["cmd", "/c", "start", "http://localhost:3000"]), 2000);',
      '}',
      '',
      'process.on("SIGINT", () => { api.kill(); web.kill(); process.exit(); });',
      'setInterval(() => {}, 60000);'
    ].join('\n');

    await writeFile("launcher_final.ts", launcherCode);
    await $`bun build --compile --outfile ./${RELEASE_DIR}/RoobieCMS.exe ./launcher_final.ts`;
    await rm("launcher_final.ts");

    console.log("\n✅ GOTOWE! Paczka znajduje się w folderze: " + path.resolve(RELEASE_DIR));

  } catch (err) {
    console.error("\n❌ BŁĄD KRYTYCZNY:");
    console.error(err);
  }
}

build();