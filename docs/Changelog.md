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

### Content

+ Added the Albertania region.
+ Added Clemeville.
+ Added Route 100.
+ Added Natchester.
+ Added various building interiors.
+ Added 109 monsters.
+ Added 118 abilities.
+ Added 66 character sprites.

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

# v2.0.1 - Minor Fixes

## Bugfixes

* Group members are now notified via WebSocket when they are removed from the group. [STP23SRV-3](https://jira.uniks.de/browse/STP23SRV-3)

## Documentation

* Documented some Presets endpoint with image responses.
* Documented region and trainer parameters in Trainer and Monster endpoints.
* Updated the Cascading Deletes documentation.

# v2.0.2 - Minor Fixes

## Improvements

* Added error logging with Sentry.
* Improved the check for duplicate username sign ups.

## Bugfixes

* Fixed a typo in the `Kid_Karen` character filename.
* Updated the `width` and `height` of all maps.

# v2.1.0 - Roof Tiles, Achievements and Update Trainer

## New Features

### Content

+ Added `Roof` tiles. [STP23SRV-6](https://jira.uniks.de/browse/STP23SRV-6)

### Resources

+ Added Achievements. [STP23SRV-5](https://jira.uniks.de/browse/STP23SRV-5)
+ Added the `PATCH /regions/{region}/trainers/{id}` endpoint for updating name and image. [STP23SRV-4](https://jira.uniks.de/browse/STP23SRV-4) 

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
+ Added `team` to `Trainer`.
+ Added `encounteredMonsterTypes` to `Trainer`.
  > I.e. the Mondex.

## Improvements

* Trainers no longer receive a monster when they are created.
  > Visit the Prof. to select your start monster.
* Wild Encounters can be triggered by Tall Grass.
* Players can trigger encounters by talking to other trainers.
* Players can heal their monsters by talking to a Nurse.
* NPCs may start encounters when they see you.
