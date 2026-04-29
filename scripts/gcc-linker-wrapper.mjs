import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
} from 'node:fs';
import path from 'node:path';

const linkArgs = process.argv.slice(2);
const expandedLinkArgs = expandResponseArgs(linkArgs);
const sqliteLibDir = findSqliteLibraryDir(expandedLinkArgs);
const lldBinDir = resolveRustLldBinDir();
const finalArgs = [
  '-fuse-ld=lld',
  ...(sqliteLibDir ? ['-L', ensureStrippedSqliteArchive(sqliteLibDir)] : []),
  ...linkArgs,
];
const childEnv = buildChildEnv(lldBinDir);

const gcc = spawnSync('x86_64-w64-mingw32-gcc.exe', finalArgs, {
  env: childEnv,
  stdio: 'inherit',
  shell: false,
});

process.exit(gcc.status ?? 1);

function findSqliteLibraryDir(args) {
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === '-L' && index + 1 < args.length) {
      const candidate = args[index + 1];
      if (existsSync(path.join(candidate, 'libsqlite3.a'))) {
        return candidate;
      }
      index += 1;
    } else if (args[index].startsWith('-L') && args[index].length > 2) {
      const candidate = args[index].slice(2);
      if (existsSync(path.join(candidate, 'libsqlite3.a'))) {
        return candidate;
      }
    }
  }

  return null;
}

function expandResponseArgs(args) {
  const expanded = [];

  for (const arg of args) {
    if (arg.startsWith('@') && existsSync(arg.slice(1))) {
      const responseArgs = readFileSync(arg.slice(1), 'utf8')
        .split(/\r?\n/)
        .map((item) => item.trim())
        .filter(Boolean)
        .map((item) => item.replace(/^"(.*)"$/, '$1'));
      expanded.push(...responseArgs);
    } else {
      expanded.push(arg);
    }
  }

  return expanded;
}

function ensureStrippedSqliteArchive(sourceDir) {
  const sourceArchive = path.join(sourceDir, 'libsqlite3.a');
  const tempRoot = process.env.TEMP ?? process.env.TMP ?? sourceDir;
  const cacheDir = path.join(tempRoot, 'feiq-sqlite-link-cache', 'windows-gnu');
  const cacheArchive = path.join(cacheDir, 'libsqlite3.a');
  const workDir = path.join(cacheDir, 'work');

  if (existsSync(cacheArchive)) {
    const cacheStat = statSync(cacheArchive);
    const sourceStat = statSync(sourceArchive);
    if (cacheStat.mtimeMs >= sourceStat.mtimeMs) {
      return cacheDir;
    }
  }

  rmSync(cacheDir, { recursive: true, force: true });
  mkdirSync(workDir, { recursive: true });

  runCommand('ar', ['x', sourceArchive], workDir);

  const objectFiles = readdirSync(workDir).filter((file) => file.endsWith('.o'));
  for (const objectFile of objectFiles) {
    const fullPath = path.join(workDir, objectFile);
    const strippedPath = path.join(workDir, `${path.parse(objectFile).name}.stripped.o`);
    runCommand('objcopy', ['--strip-debug', fullPath, strippedPath], workDir);
    renameSync(strippedPath, fullPath);
  }

  runCommand('ar', ['rcs', cacheArchive, ...objectFiles], workDir);
  return cacheDir;
}

function resolveRustLldBinDir() {
  const candidates = [];
  const rustcSysroot = runQuietly('rustc', ['--print', 'sysroot']);
  if (rustcSysroot) {
    candidates.push(rustcSysroot);
  }

  const rustupToolchainHome = resolveRustupToolchainHome();
  if (rustupToolchainHome) {
    candidates.push(rustupToolchainHome);
  }

  for (const rootDir of candidates) {
    const candidate = path.join(
      rootDir,
      'lib',
      'rustlib',
      'x86_64-pc-windows-gnu',
      'bin',
      'gcc-ld',
    );

    if (existsSync(path.join(candidate, 'ld.lld.exe'))) {
      return candidate;
    }
  }

  return null;
}

function resolveRustupToolchainHome() {
  const rustupHome = process.env.RUSTUP_HOME ?? path.join(process.env.USERPROFILE ?? '', '.rustup');
  if (!rustupHome) {
    return null;
  }

  const explicitToolchain = process.env.RUSTUP_TOOLCHAIN?.trim();
  if (explicitToolchain) {
    const explicitHome = path.join(rustupHome, 'toolchains', explicitToolchain);
    if (existsSync(explicitHome)) {
      return explicitHome;
    }
  }

  const settingsPath = path.join(rustupHome, 'settings.toml');
  if (!existsSync(settingsPath)) {
    return null;
  }

  const settingsContent = readFileSync(settingsPath, 'utf8');
  const match = settingsContent.match(/^default_toolchain\s*=\s*"(.+)"$/m);
  if (!match) {
    return null;
  }

  const toolchainHome = path.join(rustupHome, 'toolchains', match[1]);
  return existsSync(toolchainHome) ? toolchainHome : null;
}

function buildChildEnv(lldBinDir) {
  const normalizedEnv = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (key.toLowerCase() !== 'path') {
      normalizedEnv[key] = value;
    }
  }

  const basePath = process.env.Path ?? process.env.PATH ?? '';
  const resolvedPath = lldBinDir
    ? `${lldBinDir}${path.delimiter}${basePath}`
    : basePath;

  normalizedEnv.Path = resolvedPath;
  normalizedEnv.PATH = resolvedPath;
  return normalizedEnv;
}

function runQuietly(command, args) {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    shell: false,
  });

  if (result.status !== 0) {
    return null;
  }

  return result.stdout?.trim() || null;
}

function runCommand(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    stdio: 'inherit',
    shell: false,
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
