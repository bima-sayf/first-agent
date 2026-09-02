# Database Migrations

## Phase 1 (v0.2): Core Data Models

### Migration Files

1. **001_create_agents_table.sql** - Agent/Villager entities
   - Stores 9 villagers (starting with 3 for testing)
   - Attributes: `{str, end, agi}` (Phase 2 adds `int, wis, cha`)
   - Stats: `{hp, maxHp, energy, maxEnergy}` (Phase 3 adds hunger)
   - Position: `x, y` coordinates on the map

2. **002_create_items_table.sql** - Item definitions
   - Starting with 5 items: `wood, stone, food, water, basic_tool`
   - Properties: stackable, weight, type
   - Phase 3 expands to 10+ items, Phase 6 to 50+ items

3. **003_create_inventory_table.sql** - Agent inventory
   - Links agents to items they carry
   - Supports stackable items (quantity)
   - Supports durability for tools
   - Foreign keys with CASCADE delete

4. **004_create_world_tiles_table.sql** - World map tiles
   - Starting with 5×5 grid (25 tiles)
   - Terrain types: `grass, water` (Phase 5 adds more)
   - Resources: JSON object `{"wood": 10, "stone": 5}`
   - Phase 5 expands to 8×9 grid (72 tiles)

### Running Migrations

```bash
# In Docker
./docker-dev.sh migrate

# Or directly
docker-compose -f docker-compose.dev.yml run --rm app npm run db:migrate
```

### Database Schema Design

**Design Principles**:
- JSON fields for flexibility (attributes, stats, resources, properties)
- Proper indexing for performance (position, role, type queries)
- Foreign keys with CASCADE for data integrity
- Timestamps for audit trail
- Unique constraints where appropriate (coordinates, agent-item pairs)

**Why SQLite?**
- Phase 1-2: Simple, file-based, perfect for development
- Phase 3+: Architecture supports PostgreSQL migration
- Single file, easy backup, no server needed

### Migration Tracking

Migrations are tracked in the `migrations` table:
```sql
CREATE TABLE migrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  filename TEXT NOT NULL UNIQUE,
  executed_at INTEGER NOT NULL
);
```

Each migration runs only once. Re-running `npm run db:migrate` is safe (idempotent).

### Future Migrations

- **Phase 2**: Add more attribute columns (int, wis, cha)
- **Phase 3**: Add hunger stat, recipe tables, crafting tables
- **Phase 4**: Add skills table, skill_levels table
- **Phase 5**: Add structures table, relationships table
- **Phase 7**: Add animals table, npcs table, events table

### Minimal Data Strategy

Following `MINIMAL-DATA-SETS.md`:
- Start with 3 agents (not 9)
- Start with 5 items (not 50+)
- Start with 5×5 grid (not 8×9)
- **Validate → Expand → Repeat**

### Database Location

- **Development**: `/app/data/village-sim.db` (inside Docker)
- **Test**: `:memory:` (in-memory, fast, clean)
- **Production**: Configurable via `DB_PATH` environment variable
