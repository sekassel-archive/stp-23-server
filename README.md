# STP Server 2023

## Installation

Requires [`pnpm`](https://pnpm.js.org/) instead of [`npm`].

```bash
$ pnpm install
```

## Dependencies

MongoDB and NATS are required and provided with `docker-compose`.

```bash
$ docker compose up database nats
```

## Running the app

To run everything, use

```bash
$ docker compose up database nats
```

Otherwise, choose one of the following:

```bash
# development
$ pnpm run start

# watch mode (recommended)
$ pnpm run start:dev

# production mode
$ pnpm run start:prod
```

## Test

```bash
# unit tests
$ pnpm run test

# e2e tests
$ pnpm run test:e2e

# test coverage
$ pnpm run test:cov
```
