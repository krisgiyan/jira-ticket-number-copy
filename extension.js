const vscode = require('vscode');

const TOKEN = '${ticket}';
const STATUS_MS = 3500;

// ---------- helpers ----------

const cfg = () => vscode.workspace.getConfiguration('jiraCommit');
const escapeRegExp = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** All unique ticket keys in a string, upper-cased, in order of appearance. */
function findTickets(text) {
  if (!text) return [];
  const re = new RegExp(cfg().get('pattern'), 'gi');
  return [...new Set([...text.matchAll(re)].map(m => m[0].toUpperCase()))];
}

/** The ticket prefix already at the start of the message, if any. */
function existingPrefix(message) {
  const pattern = cfg().get('pattern');
  const format = cfg().get('format').replace(/\s+$/, '');
  const formatted = escapeRegExp(format).replace(escapeRegExp(TOKEN), () => `(?:${pattern})`);
  const strict = new RegExp(`^${formatted}\\s*`, 'i');
  const loose = new RegExp(`^\\[?(?:${pattern})\\]?[:\\s-]*`, 'i');
  const m = message.match(strict) || message.match(loose);
  return m ? { text: m[0], ticket: findTickets(m[0])[0] } : null;
}

function flash(text) {
  vscode.window.setStatusBarMessage(text, STATUS_MS);
}

async function getGit() {
  const ext = vscode.extensions.getExtension('vscode.git');
  if (!ext) throw new Error('The built-in Git extension is disabled.');
  const api = (ext.isActive ? ext.exports : await ext.activate()).getAPI(1);
  if (api.repositories.length === 0) throw new Error('No Git repository is open.');
  return api;
}

function pickRepository(git, arg) {
  const repos = git.repositories;
  if (arg && arg.rootUri) {
    const hit = repos.find(r => r.rootUri.toString() === arg.rootUri.toString());
    if (hit) return hit;
  }
  return repos.find(r => r.ui.selected) || repos[0];
}

// ---------- core ----------

function applyTicket(repo, ticket) {
  const box = repo.inputBox;
  const message = box.value;
  const prefix = cfg().get('format').split(TOKEN).join(ticket);
  const existing = existingPrefix(message);

  if (existing && existing.ticket === ticket) {
    flash(`$(check) ${ticket} is already in the message`);
    return;
  }
  if (existing) {
    box.value = prefix + message.slice(existing.text.length);
    flash(`$(sync) Replaced ${existing.ticket} with ${ticket}`);
    return;
  }
  if (findTickets(message).includes(ticket)) {
    flash(`$(check) ${ticket} is already in the message`);
    return;
  }
  box.value = prefix + message;
  flash(`$(tag) Added ${ticket}`);
}

async function pickTicket(repo, branchName) {
  const Separator = vscode.QuickPickItemKind.Separator;
  const current = findTickets(branchName);
  const items = [];

  if (current.length) {
    items.push({ label: 'Current branch', kind: Separator });
    current.forEach(t => items.push({ label: `$(tag) ${t}`, description: branchName, ticket: t }));
  }

  let branches = [];
  try {
    branches = await repo.getBranches({ remote: false, sort: 'committerdate' });
  } catch {
    // older VS Code: no getBranches, just skip this section
  }
  const others = new Map();
  for (const b of branches) {
    if (!b.name || b.name === branchName) continue;
    for (const t of findTickets(b.name)) {
      if (!current.includes(t) && !others.has(t)) others.set(t, b.name);
    }
  }
  if (others.size) {
    items.push({ label: 'Other local branches', kind: Separator });
    for (const [t, name] of others) {
      items.push({ label: `$(git-branch) ${t}`, description: name, ticket: t });
    }
  }

  items.push({ label: '', kind: Separator });
  items.push({ label: '$(edit) Type a ticket key…', manual: true });

  const placeHolder = current.length
    ? 'Choose the ticket for this commit'
    : `No ticket in "${branchName || 'detached HEAD'}". Pick one or type it`;

  const pick = await vscode.window.showQuickPick(items, {
    placeHolder,
    matchOnDescription: true,
    title: 'Jira ticket'
  });
  if (!pick) return undefined;
  if (!pick.manual) return pick.ticket;

  const exact = new RegExp(`^(?:${cfg().get('pattern')})$`, 'i');
  const typed = await vscode.window.showInputBox({
    title: 'Jira ticket',
    prompt: 'Ticket key',
    placeHolder: 'PLAT-1234',
    validateInput: v =>
      !v.trim() || exact.test(v.trim()) ? null : "That doesn't look like a ticket key (e.g. PLAT-1234)"
  });
  return typed && typed.trim() ? typed.trim().toUpperCase() : undefined;
}

async function run(arg, alwaysPick) {
  try {
    const git = await getGit();
    const repo = pickRepository(git, arg);
    const branch = repo.state.HEAD && repo.state.HEAD.name;
    const tickets = findTickets(branch);

    const ticket = !alwaysPick && tickets.length === 1
      ? tickets[0]
      : await pickTicket(repo, branch);

    if (ticket) applyTicket(repo, ticket);
  } catch (err) {
    vscode.window.showWarningMessage(`Jira Ticket: ${err.message}`);
  }
}

// ---------- activation ----------

function activate(context) {
  context.subscriptions.push(
    vscode.commands.registerCommand('jiraCommit.insertTicket', arg => run(arg, false)),
    vscode.commands.registerCommand('jiraCommit.pickTicket', arg => run(arg, true))
  );
}

function deactivate() {}

module.exports = { activate, deactivate };
