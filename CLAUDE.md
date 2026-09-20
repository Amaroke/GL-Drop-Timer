## Git

Après chaque commit créé par /implement, push la branche courante sur origin sans demander confirmation. Ne jamais push sur main.

## Fin d'un /implement

Une fois le commit poussé et la revue faite, dans cet ordre :

1. Aligner les issues GitHub : cocher les critères d'acceptation remplis dans le corps de l'issue traitée, commenter avec le lien du commit ou de la branche, mettre à jour les labels selon `docs/agents/triage-labels.md`, et retirer la mention "Blocked by" des issues débloquées. Ne pas fermer l'issue, elle se ferme au merge de la PR.
2. Synchroniser les branches : `git fetch --prune`, mettre main à jour avec `git pull --ff-only`, supprimer les branches locales dont l'upstream a disparu et qui sont déjà mergées (vérifier le diff avant de supprimer).
3. Choisir la suite :
   - s'il existe une issue ouverte et débloquée liée à celle qui vient d'être traitée (même parent, ou débloquée par elle), la proposer à l'utilisateur et, s'il accepte, créer sa branche depuis main à jour
   - sinon, se replacer sur main à jour

Ne jamais supprimer une branche non mergée ni pousser sur main.

## Agent skills

### Issue tracker

Issues are tracked in GitHub Issues (Amaroke/GL-Drop-Timer) via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Default five-label vocabulary (needs-triage, needs-info, ready-for-agent, ready-for-human, wontfix). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `CONTEXT.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.
