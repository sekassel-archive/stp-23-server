# v1.0.0 - Auth, Users, Regions and Messages

## New Features

### Resources

+ Added Authentication.
+ Added Users.
+ Added Groups.
+ Added Messages.
+ Added Regions.

### Technical

+ Added rate limit.
+ Added event WebSocket.

# v2.0.0 - Open World

## New Features

### Resources

+ Added Areas.
+ Added Monsters.
+ Added Trainers.
+ Added Presets (Tilesets, Characters, Monster Types, Abilities).
+ Added Region map.

### Technical

+ Added UDP socket.

## Improvements

* Region messages are now only visible to users with a trainer.

# v3.0.0 - Battle

## New Features

### Content

+ Added the Encounter Test region.

### Resources

+ Added Encounters.
+ Added Opponents
  > This is the representation of a trainer in battle.
+ Added `TalkTrainerDto`
  > This UDP action can be used to talk to trainers.
+ Added `encounterOnSight`, `canHeal`, `encountered` and `starters` to `Trainer.npc`.
+ Added `encounteredMonsterTypes` to `Trainer`.
  > I.e. the Mondex.

## Improvements

* Trainers no longer receive a monster when they are created.
  > Visit the Prof. to select your start monster.
* Wild Encounters can be triggered by Tall Grass.
* Players can trigger encounters by talking to other trainers.
* Players can heal their monsters by talking to a Nurse.
* NPCs may start encounters when they see you.
