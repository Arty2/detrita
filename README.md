# /detrita

**/detrita** is a kanban board that runs entirely in the web browser. It needs no account and no server: the whole application is a single HTML file, and the board is stored on the user's own device.

> **Not actively maintained.** /detrita works and is left as it is, but it is no longer being updated or maintained. Issues and pull requests may go unanswered; fork it freely if you need changes.

- Project page: [heracl.es/detrita](https://heracl.es/detrita)
- Demo: [detrita.vercel.app](https://detrita.vercel.app/)
- Source: [github.com/arty2/detrita](https://github.com/arty2/detrita)
- Current version: 0.86.0 (2026-10-12)

## Design

A board is a grid. Columns are *stages*, such as Backlog, Active and Done, and are shared by every row. Rows are *swimlanes*, typically one per project. Each cell, where a swimlane meets a stage, holds an ordered list of cards. An *inbox* sits below the board and collects cards that have not yet been sorted.

A card has a title, optional notes written in Markdown, assignees (`@name`), labels (`#label`), start and due dates, and a type: task, meeting or follow-up. Cards are moved by dragging, with the keyboard, or in bulk after selecting several. A stage can be marked as a "done" column, and one such stage can collect cards automatically when they are ticked off. Stage templates for common workflows (Kanban, Scrum, GTD, sales, CRM, content and support) rename and remap the columns without losing cards.

The filter bar narrows the board by assignee (`@`), label (`#`), card type (`$task`, `$meeting`, `$followup`) or status (`$overdue`, `$done`); plain text matches titles. Pressing `?` in the app lists the keyboard shortcuts and gestures.

## Storage and sync

The board is saved automatically in the browser's private file storage (OPFS), with IndexedDB as a fallback, and nothing leaves the device. Once the app has been opened from a website, it keeps working without a network connection, and it can be installed as a standalone app. It can be exported to Markdown, CSV or JSON, and imported back from any of them.

In Chrome and Edge the board can also be kept in sync with a local Markdown file. The file follows the format of the Obsidian Kanban plugin: stages become `##` headings, swimlanes `###` headings, and cards checklist items, each tagged with a block ID (`^id`) so that it keeps its identity between syncs. Because the file is ordinary text, it can be shared through tools such as Syncthing, Dropbox or Obsidian Sync, and changes made elsewhere are picked up automatically.

## Etymology

*Detritus* is a learned borrowing from Latin **dētrītus**, "that which is rubbed away", from **dēterere**, "to wear down".

The Latin noun is fourth declension, so its plural is **dētrītūs** — spelled exactly like the singular. *Detrita* is what you get by declining it as though it were second-declension neuter, on the model of *datum* → *data*. Wiktionary marks the result a hypercorrection: a plural for things that were never supposed to accumulate.

It has two anagrams, and a board like this earns both: *attired* and *eat dirt*.

## Development

The app uses no framework and has no runtime dependencies. Its source lives in `src/` and is joined into `detrita.html` (and an identical `index.html`) by a small Node script, which also writes the service worker, `sw.js`, that provides offline use:

```sh
node build.js            # rebuild detrita.html and index.html
npm run test:integrity   # build checks, no browser
npm test                 # browser smoke tests (Playwright)
```

The generated files are committed, so the app can be opened straight from disk or served by any static host without a build step. See [CLAUDE.md](CLAUDE.md) for the source layout and conventions.

## Browser support

Chrome 117+, Safari 17.5+ and Firefox 129+. Syncing with a local file requires Chrome or Edge.

## License

Dialectic Acheiropoieton of [Heracles Papatheodorou](https://heracl.es) and Claude, MIT License
