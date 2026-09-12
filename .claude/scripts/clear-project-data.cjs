#!/usr/bin/env node
// clear-project-data.cjs - delete everything Claude Code keeps on this machine
// for THIS project, and nothing that belongs to any other project.
//
// Usage: node .claude/scripts/clear-project-data.cjs [options]
//   -n, --dry-run      list what would be deleted, delete nothing
//       --keep-memory  leave the auto-memory folder in place
//       --plans        also delete plan files that mention this project by name
//       --hook         SessionStart mode: keep memory, print one JSON line
//   -h, --help         show this help
//
// "This project" is the folder two levels above this script plus its
// subfolders, so a session started in frontend/ counts too. Copy the whole
// .claude folder into another project's root and it targets that project.
// Every account on this machine is covered: CLAUDE_CONFIG_DIR, ~/.claude and
// each ~/.claude-* config dir are all searched. Needs Node.js.
//
// DELETES: session transcripts (with their subagents, tool results and
//   workflow scripts), auto-memory, this project's prompts in history.jsonl,
//   the rewind snapshots, session env, todos, task lists, debug logs, telemetry
//   leftovers and session-index files of its sessions, pasted text its prompts
//   point at, its session stats in .claude.json and in that file's backups, and
//   IDE lock files for this folder whose editor has closed.
// KEEPS: other projects, credentials, settings, plugins, skills, shell
//   snapshots, the files in this repo, this project's trust, permission and
//   MCP settings in .claude.json, and every file of a session that is still
//   running. Plan files record no project, so they are only listed unless
//   --plans is given.

'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

// --- options -----------------------------------------------------------------
const opt = { dry: false, keepMemory: false, plans: false, hook: false };
for (const arg of process.argv.slice(2)) {
  if (arg === '-n' || arg === '--dry-run') opt.dry = true;
  else if (arg === '--keep-memory') opt.keepMemory = true;
  else if (arg === '--plans') opt.plans = true;
  else if (arg === '--hook') opt.hook = true;
  else if (arg === '-h' || arg === '--help') {
    const lines = fs.readFileSync(__filename, 'utf8').split(/\r?\n/).slice(1);
    const end = lines.findIndex((l) => !l.startsWith('//'));
    console.log(lines.slice(0, end).map((l) => l.replace(/^\/\/ ?/, '')).join('\n'));
    process.exit(0);
  } else if (arg !== '') {
    console.error(`unknown option: ${arg} (try --help)`);
    process.exit(2);
  }
}
// The hook runs on every startup, and wiping memory there would make it useless.
if (opt.hook) {
  opt.keepMemory = true;
  opt.plans = false;
}

// --- paths -------------------------------------------------------------------
// Only Linux treats Foo and foo as different paths.
const FOLD_CASE = process.platform !== 'linux';
const fold = (s) => (FOLD_CASE ? s.toLowerCase() : s);
// Fold every spelling of a path to one key: C:\Users\x, c:/Users/x/ and
// /c/Users/x all become c:/users/x.
const norm = (p) => {
  let key = fold(String(p || '').replace(/[\\/]+/g, '/').replace(/\/+$/, ''));
  if (process.platform === 'win32') key = key.replace(/^\/([a-z])\//i, '$1:/');
  return key;
};
const isWithin = (p, root) => {
  const k = norm(p);
  const r = norm(root);
  return k === r || k.startsWith(`${r}/`);
};
// Claude Code names a project's folder by turning every non-alphanumeric
// character of its path into "-".
const slugOf = (p) => p.replace(/[^a-zA-Z0-9]/g, '-');
const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
const uuidsIn = (name) => (String(name).match(UUID_RE) || []).map((u) => u.toLowerCase());
const leadingUuid = (name) => {
  const m = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.exec(name);
  return m ? m[0].toLowerCase() : null;
};

const PROJECT_DIR = path.resolve(__dirname, '..', '..');
const PROJECT_NAME = path.basename(PROJECT_DIR);
const HOME = os.homedir();
const inProject = (p) => typeof p === 'string' && p !== '' && isWithin(p, PROJECT_DIR);

// Session data inside this project's .claude.json entry: the last* stats
// (cost, tokens, durations, lastSessionId), prompt history from older versions
// and the example-file cache. Trust, permission and MCP settings stay.
const isSessionField = (field) =>
  /^last/.test(field) || field === 'history' || /^exampleFiles/.test(field);

// Per-session folders and files named after the session's UUID.
const SESSION_STORES = [
  ['file-history', 'rewind snapshots'],
  ['session-env', 'session env'],
  ['todos', 'todos'],
  ['tasks', 'task lists'],
  ['debug', 'debug logs'],
  ['telemetry', 'telemetry'],
];

// --- fs helpers --------------------------------------------------------------
const lstat = (p) => {
  try {
    return fs.lstatSync(p);
  } catch {
    return null;
  }
};
const entries = (dir) => {
  try {
    return fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
};
const readText = (p) => {
  try {
    return fs.readFileSync(p, 'utf8');
  } catch {
    return null;
  }
};
const readJson = (p) => {
  const text = readText(p);
  if (text === null) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};

function sizeOf(p) {
  const st = lstat(p);
  if (!st) return { files: 0, bytes: 0 };
  if (!st.isDirectory()) return { files: 1, bytes: st.size };
  let files = 0;
  let bytes = 0;
  for (const e of entries(p)) {
    const s = sizeOf(path.join(p, e.name));
    files += s.files;
    bytes += s.bytes;
  }
  return { files, bytes };
}

function human(bytes) {
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  while (bytes >= 1024 && i < units.length - 1) {
    bytes /= 1024;
    i++;
  }
  return i === 0 ? `${bytes} B` : `${bytes.toFixed(1)} ${units[i]}`;
}

function pidAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    return err.code === 'EPERM';
  }
}

function writeAtomic(file, text) {
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, text);
  try {
    fs.renameSync(tmp, file);
  } catch {
    // Windows refuses the rename while another process holds the file open.
    fs.writeFileSync(file, text);
    fs.rmSync(tmp, { force: true });
  }
}

// --- report ------------------------------------------------------------------
const sections = [];
const locked = [];
const notes = [];
const keptPlans = [];
let openIdeLocks = 0;
let deletedFiles = 0;
let deletedBytes = 0;
let editedFiles = 0;

function group(sec, label) {
  let g = sec.groups.get(label);
  if (!g) {
    g = { items: [], files: 0, bytes: 0, count: 0, unit: '' };
    sec.groups.set(label, g);
  }
  return g;
}

function remove(sec, label, target) {
  // Every deletion must land strictly inside the config dir being purged.
  if (!isWithin(target, sec.dir) || norm(target) === norm(sec.dir)) {
    throw new Error(`refusing to delete ${target}: not inside ${sec.dir}`);
  }
  const { files, bytes } = sizeOf(target);
  const g = group(sec, label);
  g.items.push(path.relative(sec.dir, target));
  g.files += files;
  g.bytes += bytes;
  deletedFiles += files;
  deletedBytes += bytes;
  if (opt.dry) return;
  try {
    fs.rmSync(target, { recursive: true, force: true, maxRetries: 2 });
  } catch {
    // whatever survived is reported as in use below
  }
  if (lstat(target)) {
    const left = sizeOf(target);
    g.files -= left.files;
    g.bytes -= left.bytes;
    deletedFiles -= left.files;
    deletedBytes -= left.bytes;
    locked.push(target);
  }
}

// Record edits to a JSON or JSONL file that is kept but cleaned.
function edited(sec, label, unit, count, file) {
  const g = group(sec, label);
  g.unit = unit;
  g.count += count;
  g.items.push(isWithin(file, sec.dir) ? path.relative(sec.dir, file) : file);
  editedFiles++;
}

// --- discovery ---------------------------------------------------------------
// Each account has its own config dir: ~/.claude by default, ~/.claude-<name>
// for the others, or wherever CLAUDE_CONFIG_DIR points.
function configDirs() {
  const candidates = [];
  if (process.env.CLAUDE_CONFIG_DIR) candidates.push({ dir: process.env.CLAUDE_CONFIG_DIR, named: true });
  for (const e of entries(HOME)) {
    if (e.name === '.claude' || /^\.claude[-_]/.test(e.name)) candidates.push({ dir: path.join(HOME, e.name), named: false });
  }
  const dirs = [];
  for (const { dir: candidate, named } of candidates) {
    const dir = path.resolve(candidate);
    let st = null;
    try {
      st = fs.statSync(dir);
    } catch {
      continue;
    }
    if (!st.isDirectory() || dirs.some((d) => norm(d) === norm(dir)) || inProject(dir)) continue;
    // A folder picked up by its name must hold something only Claude Code
    // writes; other tools also create ~/.claude-something folders.
    const markers = ['projects', 'history.jsonl', '.claude.json', '.credentials.json'];
    if (named) markers.push('settings.json');
    if (!markers.some((m) => lstat(path.join(dir, m)))) continue;
    dirs.push(dir);
  }
  return dirs;
}

// Slugs of the project folder and its subfolders, for project folders that
// hold no transcript to read a cwd from.
function subfolderSlugs() {
  const skip = new Set(['node_modules', 'dist', 'build', 'out', 'coverage', 'vendor', 'venv', '__pycache__']);
  const slugs = new Set();
  (function walk(dir, depth) {
    slugs.add(fold(slugOf(dir)));
    if (depth === 0) return;
    for (const e of entries(dir)) {
      if (e.isDirectory() && !e.name.startsWith('.') && !skip.has(e.name)) {
        walk(path.join(dir, e.name), depth - 1);
      }
    }
  })(PROJECT_DIR, 4);
  return slugs;
}

function transcriptFiles(dir, depth = 3, out = []) {
  for (const e of entries(dir)) {
    if (out.length >= 50) break;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (depth > 0 && e.name !== 'memory') transcriptFiles(p, depth - 1, out);
    } else if (e.name.endsWith('.jsonl')) {
      out.push(p);
    }
  }
  return out;
}

function firstCwd(file) {
  let fd;
  try {
    fd = fs.openSync(file, 'r');
    const buf = Buffer.alloc(256 * 1024);
    const n = fs.readSync(fd, buf, 0, buf.length, 0);
    const m = buf.toString('utf8', 0, n).match(/"cwd":"((?:[^"\\]|\\.)*)"/);
    return m ? JSON.parse(`"${m[1]}"`) : null;
  } catch {
    return null;
  } finally {
    if (fd !== undefined) fs.closeSync(fd);
  }
}

function projectFolders(dir, subSlugs) {
  const root = path.join(dir, 'projects');
  // Claude Code cuts slugs longer than 200 characters and appends a hash, so
  // compare that much and let the transcripts' cwd decide.
  const prefix = fold(slugOf(PROJECT_DIR)).slice(0, 200);
  const ours = [];
  for (const e of entries(root)) {
    if (!e.isDirectory() || !fold(e.name).startsWith(prefix)) continue;
    const folder = path.join(root, e.name);
    // Slugs are lossy (<project>/frontend and a sibling <project>-frontend
    // share one), so the cwd recorded in the transcripts wins when there is one.
    const cwds = transcriptFiles(folder).map(firstCwd).filter(Boolean);
    const inside = cwds.filter(inProject).length;
    if (cwds.length ? inside === cwds.length : subSlugs.has(fold(e.name))) {
      ours.push(folder);
    } else if (inside) {
      notes.push(`Skipped ${folder}: its transcripts belong to more than one folder.`);
    }
  }
  return ours;
}

// sessions/<pid>.json describes a session that is, or was, running.
function sessionIndex(dir) {
  const root = path.join(dir, 'sessions');
  const out = [];
  for (const e of entries(root)) {
    if (!e.isFile() || !/^\d+\.json$/.test(e.name)) continue;
    const info = readJson(path.join(root, e.name));
    if (!info || typeof info !== 'object') continue;
    out.push({
      filePid: e.name.slice(0, -'.json'.length),
      sessionId: String(info.sessionId || '').toLowerCase(),
      cwd: info.cwd,
      alive: pidAlive(info.pid),
    });
  }
  return out;
}

function historyRows(dir) {
  const text = readText(path.join(dir, 'history.jsonl'));
  if (text === null) return null;
  return text
    .split(/\r?\n/)
    .filter((line) => line.trim())
    .map((line) => {
      let o = null;
      try {
        o = JSON.parse(line);
      } catch {
        // unreadable lines are kept as they are
      }
      return { line, o };
    });
}

// Large pastes live in paste-cache/<hash>.txt and the prompt keeps the hash.
function pasteHashes(o) {
  const out = [];
  (function walk(v) {
    if (typeof v === 'string') {
      if (/^[0-9a-f]{16,64}$/i.test(v)) out.push(v.toLowerCase());
    } else if (v && typeof v === 'object') {
      Object.values(v).forEach(walk);
    }
  })(o.pastedContents);
  return out;
}

// --- purge -------------------------------------------------------------------
function scrubConfig(file) {
  const text = readText(file);
  if (text === null) return 0;
  let cfg;
  try {
    cfg = JSON.parse(text);
  } catch {
    return 0;
  }
  let removed = 0;
  const projects = cfg && typeof cfg.projects === 'object' && cfg.projects ? cfg.projects : {};
  for (const [key, entry] of Object.entries(projects)) {
    if (!inProject(key) || !entry || typeof entry !== 'object') continue;
    for (const field of Object.keys(entry)) {
      if (!isSessionField(field)) continue;
      delete entry[field];
      removed++;
    }
  }
  if (removed && !opt.dry) {
    const indent = /^\{\r?\n([ \t]+)"/.exec(text);
    writeAtomic(file, JSON.stringify(cfg, null, indent ? indent[1] : undefined) + (text.endsWith('\n') ? '\n' : ''));
  }
  return removed;
}

function purge(dir, folders, index, ids, hashes, live) {
  const sec = { dir, groups: new Map() };
  sections.push(sec);

  // 1. transcripts and memory
  for (const folder of folders) {
    for (const e of entries(folder)) {
      const p = path.join(folder, e.name);
      if (e.name === 'memory') {
        if (!opt.keepMemory) remove(sec, 'memory', p);
      } else if (!live.has(leadingUuid(e.name))) {
        remove(sec, 'transcripts', p);
      }
    }
    if (!opt.dry && entries(folder).length === 0) fs.rmSync(folder, { recursive: true, force: true });
  }

  // 2. session index of finished sessions
  const sessionsDir = path.join(dir, 'sessions');
  for (const s of index) {
    if (s.alive || live.has(s.sessionId) || !inProject(s.cwd)) continue;
    for (const e of entries(sessionsDir)) {
      if (e.name.startsWith(`${s.filePid}.`)) remove(sec, 'session index', path.join(sessionsDir, e.name));
    }
  }

  // 3. per-session stores keyed by UUID
  for (const [sub, label] of SESSION_STORES) {
    const root = path.join(dir, sub);
    for (const e of entries(root)) {
      const found = uuidsIn(e.name);
      if (found.some((id) => ids.has(id)) && !found.some((id) => live.has(id))) {
        remove(sec, label, path.join(root, e.name));
      }
    }
  }

  // 4. pasted text referenced by this project's prompts
  const pasteDir = path.join(dir, 'paste-cache');
  for (const e of entries(pasteDir)) {
    if (hashes.has(e.name.replace(/\.[^.]*$/, '').toLowerCase())) remove(sec, 'pasted text', path.join(pasteDir, e.name));
  }

  // 5. plans: no project on record, so match on the project name
  if (!opt.hook) {
    const escaped = PROJECT_NAME.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const mentions = new RegExp(`\\b${escaped}\\b`, 'i');
    const plansDir = path.join(dir, 'plans');
    for (const e of entries(plansDir)) {
      if (!e.isFile() || !e.name.endsWith('.md')) continue;
      const p = path.join(plansDir, e.name);
      if (!mentions.test(readText(p) || '')) continue;
      if (opt.plans) remove(sec, 'plans', p);
      else keptPlans.push(p);
    }
  }

  // 6. prompt history: drop only this project's lines
  const histFile = path.join(dir, 'history.jsonl');
  const rows = historyRows(dir);
  if (rows) {
    const ours = ({ o }) =>
      o && inProject(o.project) && !live.has(String(o.sessionId || '').toLowerCase());
    const keep = rows.filter((r) => !ours(r));
    const dropped = rows.length - keep.length;
    if (dropped) {
      edited(sec, 'prompt history', 'prompts', dropped, histFile);
      if (!opt.dry) writeAtomic(histFile, keep.map((r) => r.line).join('\n') + (keep.length ? '\n' : ''));
    }
  }

  // 7. .claude.json and its backups. Without CLAUDE_CONFIG_DIR the config file
  // sits next to ~/.claude rather than inside it.
  const cfgFiles = [path.join(dir, '.claude.json')];
  if (norm(dir) === norm(path.join(HOME, '.claude'))) cfgFiles.push(path.join(HOME, '.claude.json'));
  const backups = [];
  for (const cfg of cfgFiles) {
    const n = scrubConfig(cfg);
    if (n) edited(sec, '.claude.json', 'fields', n, cfg);
    const parent = path.dirname(cfg);
    for (const e of entries(parent)) {
      if (e.isFile() && e.name.startsWith('.claude.json.backup')) backups.push(path.join(parent, e.name));
    }
  }
  for (const e of entries(path.join(dir, 'backups'))) {
    if (e.isFile() && e.name.startsWith('.claude.json')) backups.push(path.join(dir, 'backups', e.name));
  }
  for (const b of backups) {
    if (scrubConfig(b)) edited(sec, 'config backups', 'files scrubbed', 1, b);
  }

  // 8. IDE lock files for this folder whose editor has closed
  const ideDir = path.join(dir, 'ide');
  for (const e of entries(ideDir)) {
    if (!e.name.endsWith('.lock')) continue;
    const p = path.join(ideDir, e.name);
    const lock = readJson(p);
    if (!lock || !Array.isArray(lock.workspaceFolders) || !lock.workspaceFolders.some(inProject)) continue;
    if (pidAlive(lock.pid)) openIdeLocks++;
    else remove(sec, 'ide locks', p);
  }
}

// --- output ------------------------------------------------------------------
function finish(liveOurs) {
  if (opt.hook) {
    const verb = opt.dry ? 'Would clear' : 'Cleared';
    let msg = `${PROJECT_NAME} session history already clear`;
    if (deletedFiles) msg = `${verb} ${deletedFiles} ${PROJECT_NAME} session files (${human(deletedBytes)})`;
    else if (editedFiles) msg = `${verb} ${PROJECT_NAME} session stats`;
    if (locked.length) msg += `; ${locked.length} in use`;
    process.stdout.write(`${JSON.stringify({ systemMessage: msg, suppressOutput: true })}\n`);
    return;
  }

  const out = [];
  out.push(opt.dry ? 'DRY RUN - nothing will be deleted' : `Clearing Claude Code data for ${PROJECT_NAME}`);
  out.push(`project: ${PROJECT_DIR} (and its subfolders)`, '');
  for (const sec of sections) {
    out.push(sec.dir);
    if (!sec.groups.size) out.push('  nothing for this project');
    for (const [label, g] of sec.groups) {
      let amount = `${g.files} files, ${human(g.bytes)}`;
      if (g.unit) amount = `${g.count} ${g.unit}`;
      else if (!g.files) amount = `${g.items.length} empty folder(s)`;
      out.push(`  ${label.padEnd(18)} ${amount}`);
      if (opt.dry) for (const item of g.items) out.push(`      ${item}`);
    }
    out.push('');
  }

  if (!deletedFiles && !editedFiles) {
    out.push(`Nothing to clear for ${PROJECT_NAME}.`);
  } else if (opt.dry) {
    out.push(
      `Would delete ${deletedFiles} files (${human(deletedBytes)}) and clean ${editedFiles} history/config files. ` +
        'Run again without --dry-run to do it.',
    );
  } else {
    out.push(
      `Deleted ${deletedFiles} files (${human(deletedBytes)}) and cleaned ${editedFiles} history/config files for ${PROJECT_NAME}.`,
    );
  }
  if (locked.length) {
    out.push(`${locked.length} item(s) are in use and were left behind:`);
    for (const p of locked) out.push(`    ${p}`);
  }
  if (liveOurs.length) {
    out.push(
      `Spared running session ${liveOurs.join(', ')}. Exit Claude Code and run this from a terminal to clear it too.`,
    );
  }
  if (opt.keepMemory) out.push('Memory kept (--keep-memory).');
  if (keptPlans.length) {
    out.push(`${keptPlans.length} plan file(s) mention ${PROJECT_NAME} but record no project, so they were kept (add --plans to delete them):`);
    for (const p of keptPlans) out.push(`    ${p}`);
  }
  if (openIdeLocks) out.push(`Kept ${openIdeLocks} IDE lock file(s) of an editor still open on this folder.`);
  out.push(...notes);
  out.push(
    "Other projects, credentials, settings, shell snapshots and this repo's files were not touched; " +
      ".claude.json keeps this project's trust, permission and MCP settings.",
  );
  console.log(out.join('\n'));
}

function main() {
  // A copy of this script outside <project>/.claude/scripts/ would make its
  // "project" the home folder or a drive root, which is every project at once.
  if (path.dirname(PROJECT_DIR) === PROJECT_DIR || isWithin(HOME, PROJECT_DIR)) {
    throw new Error(`${PROJECT_DIR} is not a project folder; keep this script in <project>/.claude/scripts/`);
  }

  const live = new Set();
  if (process.env.CLAUDE_CODE_SESSION_ID) live.add(process.env.CLAUDE_CODE_SESSION_ID.toLowerCase());
  if (opt.hook && !process.stdin.isTTY) {
    try {
      const input = JSON.parse(fs.readFileSync(0, 'utf8'));
      if (input.session_id) live.add(String(input.session_id).toLowerCase());
    } catch {
      // no hook payload; the session index still marks the live session
    }
  }

  // Every running session is known before anything is read or touched, so one
  // running under any account is spared in all of them.
  const dirs = configDirs();
  const indexes = new Map(dirs.map((dir) => [dir, sessionIndex(dir)]));
  for (const index of indexes.values()) {
    for (const s of index) if (s.alive && s.sessionId) live.add(s.sessionId);
  }

  const subSlugs = subfolderSlugs();
  const ids = new Set();
  const hashes = new Set();
  const plan = dirs.map((dir) => {
    const folders = projectFolders(dir, subSlugs);
    for (const folder of folders) {
      for (const e of entries(folder)) {
        const id = leadingUuid(e.name);
        if (id) ids.add(id);
      }
    }
    for (const s of indexes.get(dir)) {
      if (inProject(s.cwd) && s.sessionId) ids.add(s.sessionId);
    }
    for (const { o } of historyRows(dir) || []) {
      if (!o || !inProject(o.project) || !o.sessionId) continue;
      const id = String(o.sessionId).toLowerCase();
      ids.add(id);
      if (!live.has(id)) pasteHashes(o).forEach((h) => hashes.add(h));
    }
    return { dir, folders, index: indexes.get(dir) };
  });

  for (const { dir, folders, index } of plan) purge(dir, folders, index, ids, hashes, live);
  finish([...live].filter((id) => ids.has(id)));
}

try {
  main();
} catch (err) {
  if (opt.hook) {
    process.stdout.write(`${JSON.stringify({ systemMessage: `Project data purge failed: ${err.message}` })}\n`);
    process.exit(0);
  }
  console.error(`clear-project-data: ${err.message}`);
  process.exit(1);
}
