# GL Upgrade Planner

Tracks the cooldowns of the free items in Galaxy Life so a player knows when to collect them again.

## Language

**Drop**:
One of the three free items a player can collect in Galaxy Life (Star Battery, Tool Case, Helmet).
_Avoid_: Item, reward, gift

**Cooldown**:
The fixed duration between collecting a Drop and being able to collect it again.
_Avoid_: Timer duration, delay

**Ready date**:
The instant at which a Drop becomes collectable again.
_Avoid_: Availability date, expiry

**Collect**:
The act of picking up a Drop in the game, which starts its Cooldown.
_Avoid_: Claim, redeem

**Player**:
The person using the app to track their Drops, whether signed in or not.
_Avoid_: User

**Sign in**:
Authenticating with Google to identify the Player as themself.
_Avoid_: Log in, authenticate

**Colony**:
A planet owned by the player, each with its own Star Base. There are twelve fixed Colonies, the main planet and eleven others, which the Observatory unlocks one per level. The main planet is a Colony like any other.
_Avoid_: Planet, base, world

**Star Base**:
The central building of a Colony, whose level caps the level and the count of every other Building on that Colony.
_Avoid_: HQ, town hall

**Building type**:
A kind of structure defined in the catalog (for example Barracks), with its limits per Star Base level. Some Building types exist only on the main planet.
_Avoid_: Class, model

**Building**:
One placed instance of a Building type on a Colony, with its own level. Decorations are not tracked.
_Avoid_: Structure, tile

**Observatory**:
The Building type, only on the main planet, whose level sets how many other Colonies are unlocked.
_Avoid_: Telescope

**Missing**:
Status of a Building type whose owned count is below its maximum count for the Star Base level.

**Below limit**:
Status of a Building whose level is below the maximum level the Star Base allows.
_Avoid_: Outdated

**Over limit**:
Status of a Building or count that exceeds what the Star Base now allows, after the Star Base level was lowered. The data is kept, never deleted.
_Avoid_: Invalid

**Planner**:
The area of the app that tracks a Colony's Buildings against what the Star Base allows and recommends what to build or upgrade next.
_Avoid_: Colonies tab, Colony tracker, progression view
