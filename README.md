# Jira Ticket from Branch

Stop typing ticket numbers. One click on the tag icon in Source Control puts the Jira key from your branch name at the start of your commit message.

`feature/PLAT-1234-loki-retention` → `PLAT-1234: your message`

## Features

**One-click insert.** Click the tag icon in the Source Control title bar. If your branch has exactly one ticket, it goes straight in.

**Replaces the old ticket.** Switched branches with a half-written message? The ticket at the start of the message is swapped for the new one instead of stacking up (`PLAT-1: fix` → `OPS-22: fix`).

**Never duplicates.** If the ticket is already in the message, nothing changes.

**Ticket picker.** When the branch has no ticket, or several (`feature/PLAT-12-OPS-9`), a picker opens with:
- tickets from the current branch
- tickets from your other local branches, most recent first
- an option to type a key by hand, with validation

You can open the picker any time with **Jira: Pick Ticket…** in the Source Control `...` menu or the Command Palette.

**Quiet feedback.** Results show briefly in the status bar instead of popups.

## Settings

| Setting | Default | What it does |
|---|---|---|
| `jiraCommit.pattern` | `[A-Z][A-Z0-9]+-\d+` | Regex for a ticket key (case-insensitive). Narrow it to your projects, e.g. `(PLAT\|OPS)-\d+`. |
| `jiraCommit.format` | `${ticket}: ` | How the ticket is written. Try `[${ticket}] ` or `${ticket} - `. |

## Tip

If the tag icon isn't visible, hover over the Source Control header, or set
`"workbench.view.alwaysShowHeaderActions": true` to always show it.
