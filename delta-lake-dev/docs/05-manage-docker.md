# Everyday Docker commands for this project

A quick-reference cheat sheet for the `docker compose` commands used day to day in `server/`. Run
everything below from `delta-lake-dev/server/`.

## Viewing containers

```bash
# List running containers
docker ps

# List ALL containers (including stopped ones)
docker ps -a

# Compose-scoped view (only containers from this project's docker-compose.yml)
docker compose ps
```

## Starting / stopping

```bash
# Start (build if needed, run in background)
docker compose up -d

# Stop containers but keep them (fast to resume, keeps container state)
docker compose stop

# Resume stopped containers
docker compose start

# Stop AND remove containers/network (../data bind mount AND the metastore_pgdata
# volume both survive - plain `down` never removes named volumes, only -v does)
docker compose down

# Restart (useful after changing spark_session.py config, etc.)
docker compose restart spark-delta
```

`stop`/`start` vs `down`/`up`: `stop` just pauses the container (keeps it around, faster to resume);
`down` removes the container and network entirely, so the next `up` creates a fresh container. Verified
directly: a plain `down` (no `-v`) leaves both halves of persisted state intact - the Delta files in
`../data` (a host bind mount) and the Hive metastore schema in the `metastore_pgdata` **named volume**
(this project uses Postgres, not the folder-based Derby metastore an earlier version used). Only
`docker compose down -v` removes that named volume - see the README's "Reset both halves together" note
for why a bare `-v` without also clearing `../data` causes `DELTA_CREATE_TABLE_WITH_NON_EMPTY_LOCATION`.

## Logs

```bash
# Tail logs, follow in real time
docker compose logs -f spark-delta

# Last N lines only
docker compose logs --tail=100 spark-delta

# Without -f (just dump what's there so far)
docker compose logs spark-delta
```

## A few extras worth having

```bash
# Shell into the running container
docker compose exec spark-delta bash

# Live resource usage (CPU/RAM) - handy for checking you're within your mem_limit
docker stats delta-lake-dev

# Rebuild the image after editing the Dockerfile
docker compose up --build -d

# Full reset: containers + image + the metastore volume (careful - this is the
# `down -v` that requires clearing ../data/* too; see the README)
docker compose down --rmi all -v
```

One gotcha worth flagging: `docker compose down` removes the container, so anything written *inside* the
container but outside a bind-mounted path (e.g. a stray file saved to `/tmp`) is lost. Your Delta tables
are safe (`../data` is a bind mount) and so is the metastore schema (`metastore_pgdata` is a named volume,
untouched by a plain `down`) - but always reset both together if you do use `-v`. See the main
`README.md`'s "Reset both halves together" callout and `server/metastore-init/README.md`.