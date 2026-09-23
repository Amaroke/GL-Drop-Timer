# Fixed Colony slots unlocked by the Observatory

Spec 3 first decided no limit on the number of Colonies, then a cap of 12 with the player creating and deleting them. Reviewing it against the Galaxy Life wiki showed the game does not let a player create Colonies freely: there are exactly twelve, the main planet plus eleven others, and each Observatory level on the main planet unlocks one. We chose twelve fixed Colony slots with fixed names, shown at all times in a navigation bar, where a slot is editable only once the Observatory level unlocks it. The Planner therefore has no create, rename or delete of Colonies, and cannot represent a state the game itself does not allow.

Lowering the Observatory level relocks a slot but keeps its data.

## Considered Options

- No limit on Colonies: never blocks the player, but lets the Planner represent Colonies the game does not have.
- A cap of 12 with free creation, naming and deletion: matches the count, but needs create, rename and delete flows, tombstones to sync deletions, and a rule for importing Colonies past the cap, for a set the game already fixes.
