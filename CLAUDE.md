## Git

After each commit created by /implement, push the current branch to origin without asking for confirmation. Never push to main: GitHub branch protection enforces this (PR + passing CI required), except for the repo admin.

## End of an /implement

Once the commit is pushed and the review is done, create the PR to main with `gh pr create`: short title reflecting the purpose of the commit, body with a summary, the acceptance criteria covered, the tests added and `Closes #N` for the issue that was worked on. If a PR already exists for the branch, update it instead of creating another one. The user only has to review and merge.

## Agent skills

### Issue tracker

Issues are tracked in GitHub Issues (Amaroke/GL-Drop-Timer) via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Default five-label vocabulary (needs-triage, needs-info, ready-for-agent, ready-for-human, wontfix). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `CONTEXT.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.
