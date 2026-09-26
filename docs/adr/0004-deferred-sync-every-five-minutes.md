# Deferred sync every five minutes

Drops synced to Firestore on every change. With the Planner, a Colony is edited with + and - buttons, so a burst of clicks would mean a burst of writes, and the durable copy is already the local one. We decided that every change is saved locally at once and sent to Firestore at most every five minutes, for Drops and Colonies alike, with a Save now button, a send when the tab goes to the background or closes, and a status dot next to the account name (green synced, yellow sending, red not synced). Reading is unchanged, the real-time listener stays, so another device still sees changes as soon as they are sent.

Conflict resolution is unchanged: last write wins per document, on the updated-at of the edit, not of the send.

## Considered Options

- Write on every change: simplest and freshest across devices, but one write per click on a Colony, for data that changes in bursts.
- Debounce of one second: cuts the burst, but still writes on every editing session and gives no clear moment at which the player can trust the account copy.

## Consequences

- Another device can lag behind by up to five minutes, unless the player uses Save now or the tab is closed or hidden.
- The already shipped Drop sync changes policy, so this needs its own issue rather than living inside the Planner spec.
