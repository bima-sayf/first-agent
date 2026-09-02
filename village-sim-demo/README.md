# Village Simulation Demo

9-villager autonomous AI village simulation with progressive world building. Built with TypeScript, SQLite, Docker.

**Status**: Phase 1 Complete (v0.2) | **Tests**: 134/134 passing

---

## Quick Start

```bash
# Setup and run
docker-compose -f docker-compose.dev.yml up -d
docker-compose -f docker-compose.dev.yml run --rm app npm run db:reset

# Run tests
docker-compose -f docker-compose.dev.yml run --rm app npm test

# Development
docker-compose -f docker-compose.dev.yml run --rm app npm run dev
```

---

## What's Built (Phase 1)

- ✅ **4 Core Entities**: Agent, Item, Inventory, WorldTile
- ✅ **SQLite Database**: With migrations, seeds, foreign keys
- ✅ **Repository Pattern**: Clean architecture, full CRUD
- ✅ **134 Tests**: 100% passing (unit + integration)
- ✅ **Minimal Data**: 3 agents, 5 items, 5×5 grid

---

## Tech Stack

- **Runtime**: Node 20, TypeScript 5
- **Database**: SQLite (better-sqlite3), WAL mode
- **Testing**: Jest, 134 tests
- **Container**: Docker, multi-stage builds
- **Linting**: ESLint, Prettier

---

## Documentation

- **[INDEX.md](INDEX.md)** - Documentation map
- **[DEVELOPMENT-GUIDE.md](DEVELOPMENT-GUIDE.md)** - Commands, imports, patterns
- **[ARCHITECTURE.md](ARCHITECTURE.md)** - System design
- **[BACKLOGS.md](BACKLOGS.md)** - 14-phase roadmap
- **[PHASE-1-GUIDE.md](PHASE-1-GUIDE.md)** - Phase 1 summary

---

## Project Structure

```
src/
├── domain/entities/           # Agent, Item, Inventory, WorldTile
├── infrastructure/database/   # Repos, migrations, seeds
└── shared/                    # Common types

tests/
├── unit/                      # 115 unit tests
└── integration/               # 19 integration tests

data/
└── village-sim.db            # SQLite database
```

---

## Commands

```bash
npm test              # Run all tests
npm run db:reset      # Reset database
npm run lint:fix      # Fix linting
npm run build         # Compile TypeScript
```

---

## Next Phase

**Phase 2** (v0.3): Attributes & Stats
- Expand from 3 to 6 attributes
- Add hunger stat
- Attribute points on level up

See [BACKLOGS.md](BACKLOGS.md) for full roadmap.

---

**License**: MIT | **Version**: 0.2.0
