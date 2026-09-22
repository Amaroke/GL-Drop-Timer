## Git

After each commit created by /implement, push the current branch to origin without asking for confirmation. Never push to main: GitHub branch protection enforces this (PR + passing CI required), except for the repo admin.

## End of an /implement

Once the commit is pushed and the review is done, in this order:

1. Create the PR to main with `gh pr create`: short title reflecting the purpose of the commit, body with a summary, the acceptance criteria covered, the tests added and `Closes #N` for the issue that was worked on. If a PR already exists for the branch, update it instead of creating another one. The user only has to review and merge.
2. Align the GitHub issues: tick the fulfilled acceptance criteria in the body of the issue that was worked on, comment with the link to the PR, update the labels according to `docs/agents/triage-labels.md`, and remove the "Blocked by" mention from the issues that are now unblocked. Do not close the issue, it closes when the PR is merged.
3. Synchronize the branches: `git fetch --prune`, update main with `git pull --ff-only`, delete the local branches whose upstream is gone and that are already merged (check the diff before deleting).
4. Pick what comes next:
   - if there is an open, unblocked issue related to the one just handled (same parent, or unblocked by it), propose it to the user and, if they accept, create its branch from the up-to-date main
   - otherwise, go back to the up-to-date main

Never delete an unmerged branch.

## Agent skills

### Issue tracker

Issues are tracked in GitHub Issues (Amaroke/GL-Drop-Timer) via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Default five-label vocabulary (needs-triage, needs-info, ready-for-agent, ready-for-human, wontfix). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `CONTEXT.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.
