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

# v2.1.1 - Preparations for v3

## Improvements

### Content

* Added many new Walkable Roof tiles.
* Updated the Modern Exteriors spritesheet.

### Technical

* Large-scale refactoring in preparation for v3.

# v2.1.2 - Minor Fixes

## Improvements

* Presets endpoints now return `404 Not Found` instead of `500 Internal Server Error` when the requested preset does not exist.

## Bugfixes

* Fixed a bug where some update endpoints could result in a `500 Internal Server Error` instead of `404 Not Found`.
* Fixed the `GET /regions/{region}/trainers/{id}` endpoint reporting an outdated trainer position.
* Fixed the `GET /groups` endpoints causing an `500 Internal Server Error` when the `members` query parameter was present multiple times as an array.
* Fixed a potential problem where newly created monsters would not trigger `created` events.

# v2.1.3 - UDP Fixes

## Improvements

* UDP commands are now properly validated and send an `error` event when invalid.

## Bugfixes

* Fixed a problem with UDP sessions that would not unsubscribe correctly.
* It is no longer possible to teleport to other areas using trainer move commands.

# v2.1.4 - Presets Rate Limits

## General

+ Added rate limits for presets (some endpoints use different rate limits).

# v2.1.5 - Trainer Cleanup

## Improvements

* Trainers without any progress near spawn are now deleted after a while.

## Bugfixes

* Fixed an edge case where Roof tiles would allow walking through walls.
* Fixed some missing parameters in Swagger.

# v2.1.6 - Fix Ghost Trainers

## Bugfixes

* Fixed a bug where trainers would still block tiles after being deleted (manually or during cleanup).
* Preset requests for `@2x` images now return `404 Not Found` instead of the original image.

# v2.1.7 - v3 Backport

## Improvements

* Updated tilesets with v3 tile definitions.
* JSON presets are now minimized.
* Improved UDP error handling.
* Improved movement check performance.
* Trainer cleanup now happens regardless of position in the spawn area.

## Bugfixes

* Fixed tile Walkable check in non-infinite maps.
* Trainer cleanup and NPC movement are now disabled for outdated servers.

# v2.1.8

## Bugfixes

* Removed the trainer location cache to avoid ghost trainers and conflicts with newer server instances.
* Fixed an internal error in the UDP socket.
