# Asynchronous UDP Socket

The asynchronous UDP socket is available under the `${environment.udpAddress}` address.
It accepts incoming commands and sends outgoing events.
To receive events, you first need to subscribe to them.

Neither subscription nor event delivery is guaranteed due to limitations of UDP.
The maximum safe message size is 508 bytes (see [1]).

## Commands

The WebSocket supports the following commands:

| Command                                   | Payload                                                    |
|-------------------------------------------|------------------------------------------------------------|
| `subscribe`                               | Event Pattern (string)                                     |
| `unsubscribe`                             | Event Pattern (string)                                     |
| `areas.<areaId>.players.<playerId>.moved` | [`Player`](#model-Player); only `_id`, `area`, `x` and `y` |

Commands are sent as JSON, for example:

```json
{"event":"subscribe","data":"users.*.*"}
```

## Events

See the WebSocket documentation for general information about events.

The following table shows which events may be sent.
<!-- Some events are only visible to certain users for privacy reasons. -->

| Event Name                                | Payload                                                    | Visible to |
|-------------------------------------------|------------------------------------------------------------|------------|
| `areas.<areaId>.players.<playerId>.moved` | [`Player`](#model-Player); only `_id`, `area`, `x` and `y` | Everyone   |

[1]: https://stackoverflow.com/a/1099359/4138801
