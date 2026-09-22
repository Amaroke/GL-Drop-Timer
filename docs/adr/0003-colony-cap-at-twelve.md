# Cap Colonies at 12, matching the game

Spec 3 first decided no limit on the number of Colonies, so the app would never block the player. Designing the Planner's placeholder against the Galaxy Life wiki showed the game itself caps a player at 12 total: the main planet plus 11 more unlocked through the Observatory. We chose to mirror that real cap instead of allowing unlimited Colonies, so the Planner cannot represent a state the game itself does not allow.

## Considered Options

- No limit: simpler validation, but lets a player record Colonies that could never exist in the game, which the Planner is meant to reflect accurately.
