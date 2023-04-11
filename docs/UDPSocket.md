# Asynchronous UDP Socket

The asynchronous UDP socket is available under the `${environment.udpAddress}` address.
It accepts incoming commands and sends outgoing events.
To receive events, you first need to subscribe to them.

Neither subscription nor event delivery is guaranteed due to limitations of UDP.
The maximum safe message size is 508 bytes (see [1]).

## Commands

The UDP Socket supports the following commands:

| Command                                      | Payload                                   |
|----------------------------------------------|-------------------------------------------|
| `subscribe`                                  | Event Pattern (string)                    |
| `unsubscribe`                                | Event Pattern (string)                    |
| `areas.<areaId>.trainers.<trainerId>.moved`  | [`MoveTrainerDto`](#model-MoveTrainerDto) |
| `areas.<areaId>.trainers.<trainerId>.talked` | [`TalkTrainerDto`](#model-TalkTrainerDto) |

Commands are sent as JSON, for example:

```json
{"event":"subscribe","data":"users.*.*"}
```

```json
{
  "event":"areas.507f191e810c19729de860ea.trainers.507f191e810c19729de860ea.moved",
  "data":{
    "_id": "507f191e810c19729de860ea",
    "area": "507f191e810c19729de860ea",
    "x": 10,
    "y": 20,
    "direction": 1
  }
}
```

## Events

See the WebSocket documentation for general information about events.

The following table shows which events may be sent.
<!-- Some events are only visible to certain users for privacy reasons. -->

| Event Name                                  | Payload                                   | Visible to |
|---------------------------------------------|-------------------------------------------|------------|
| `areas.<areaId>.trainers.<trainerId>.moved` | [`MoveTrainerDto`](#model-MoveTrainerDto) | Everyone   |

[1]: https://stackoverflow.com/a/1099359/4138801