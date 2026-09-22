---
name: align
description: Reconcile local branches and GitHub issues with GitHub's current state, after merging a PR or closing an issue by hand on GitHub.
disable-model-invocation: false
---

Run after acting directly on GitHub (merging a PR, closing an issue). Same reconciliation, entered from GitHub's state instead of from a just-created PR.

If a PR or issue number is given, scope every step below to it. Otherwise, work from every local branch whose upstream just disappeared.

## 1. Synchronize branches

`git fetch --prune`, then update main with `git pull --ff-only`.

For each local branch whose upstream is now gone, check it's fully merged into main (`git log main..<branch>` is empty) before deleting it. Never delete a branch that isn't merged: surface it to the user instead.

Done when main is up to date and no fully-merged branch with a stale upstream remains locally.

## 2. Align the GitHub issues

For each branch deleted in step 1 (or the targeted PR), find the PR that merged it (`gh pr list --state merged --head <branch>`, or `gh pr view <number>` when targeting directly) and read its linked issues (`closingIssuesReferences`).

For each linked issue:

- Tick any acceptance criteria in the body still unticked.
- Update labels per `docs/agents/triage-labels.md`.
- Remove the "Blocked by" mention from any other issue this one was blocking, now that it's closed.

The issue itself is already closed by the merge: don't close it again.

Done when every issue linked to a branch cleaned up in step 1 has correct labels, ticked criteria, and no stale "Blocked by" reference remains on another issue.

## 3. Pick what comes next

If there's an open, unblocked issue related to the one just handled (same parent, or unblocked by it), propose it to the user and, ask him to reset the current context/session.

Otherwise, stay on the up-to-date main.
