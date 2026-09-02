# Development Guide

Quick reference for developers working on this project.

---

## Setup

```bash
# Start development environment
docker-compose -f docker-compose.dev.yml up -d

# Enter container
docker-compose -f docker-compose.dev.yml exec app bash

# Or use helper script
./docker-dev.sh
```

**Note**: Phase 1 has no HTTP server yet. Port 3000 is configured but won't respond until Phase 3 (API layer). Use `npm test` and `npm run db:reset` for now.

---

## Common Tasks

### Database
```bash
npm run db:reset         # Fresh start: delete → migrate → seed
npm run db:migrate       # Run migrations only
npm run db:seed          # Seed data only
```

### Testing
```bash
npm test                 # All tests
npm test:watch           # Watch mode
npm test:coverage        # Coverage report
npm test -- FileName     # Specific file
```

### Code Quality
```bash
npm run lint             # Check style
npm run lint:fix         # Auto-fix
npm run build            # Verify compilation
```

---

## Import Strategy

### Use Path Aliases (Preferred)
```typescript
// ✅ Correct
import { Agent } from '@domain/entities/Agent';
import { AgentRepository } from '@infrastructure/database/repositories/AgentRepository';

// ❌ Avoid
import { Agent } from '../../../domain/entities/Agent';
```

### Available Aliases
- `@domain/*` → `src/domain/*`
- `@infrastructure/*` → `src/infrastructure/*`
- `@application/*` → `src/application/*`
- `@api/*` → `src/api/*`
- `@shared/*` → `src/shared/*`
- `@tests/*` → `tests/*`

### For Standalone Scripts (migrations, seeds)
Already configured in package.json:
```json
{
  "scripts": {
    "db:migrate": "ts-node -r tsconfig-paths/register ..."
  }
}
```

### Troubleshooting Imports

**Problem**: "Cannot find module '@domain/...'"

**Solutions**:
1. Check path exists: `ls src/domain/`
2. For scripts: ensure `tsconfig-paths/register` in npm script
3. For tests: verify `moduleNameMapper` in jest.config.js
4. Restart TypeScript server in IDE

---

## Testing Patterns

### Unit Test Template
```typescript
describe('MyRepository', () => {
  let repo: MyRepository;
  let connection: DatabaseConnection;

  beforeEach(() => {
    connection = DatabaseConnection.getInstance({ path: ':memory:' });
    connection.connect();
    // Run migrations
    repo = new MyRepository(connection);
  });

  afterEach(() => {
    DatabaseConnection.resetInstance();
  });

  it('should do something', () => {
    // Arrange
    const input = { /* ... */ };
    
    // Act
    const result = repo.method(input);
    
    // Assert
    expect(result).toBeDefined();
  });
});
```

### Integration Test Template
```typescript
describe('Integration: Feature', () => {
  beforeEach(() => {
    // Clean database
    const db = connection.getConnection();
    db.exec('DELETE FROM inventory');
    db.exec('DELETE FROM agents');
    // ...
  });

  it('should test cross-repository operation', () => {
    // Test involving multiple repositories
  });
});
```

---

## Project Structure

```
src/
├── domain/              # Business entities & logic
│   └── entities/        # Agent, Item, Inventory, WorldTile
├── infrastructure/      # Technical implementations
│   └── database/        # Connection, repos, migrations, seeds
├── application/         # Use cases & services (Phase 2+)
├── api/                 # HTTP routes (Phase 3+)
└── shared/              # Common utilities

tests/
├── unit/                # Unit tests (isolated)
└── integration/         # Integration tests (multiple components)
```

---

## Database Migrations

### Creating a New Migration
```sql
-- migrations/00X_description.sql
CREATE TABLE my_table (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
```

Migrations run automatically on `npm run db:migrate`

---

## Docker Commands

```bash
# Build image
docker-compose -f docker-compose.dev.yml build

# Start services
docker-compose -f docker-compose.dev.yml up -d

# Stop services
docker-compose -f docker-compose.dev.yml down

# View logs
docker-compose -f docker-compose.dev.yml logs -f app

# Run command in container
docker-compose -f docker-compose.dev.yml run --rm app npm test

# Clean rebuild
docker-compose -f docker-compose.dev.yml down -v
docker-compose -f docker-compose.dev.yml build --no-cache
```

---

## Code Style

### Naming Conventions
- Files: `PascalCase.ts` for classes, `camelCase.ts` for utilities
- Classes: `PascalCase`
- Functions/variables: `camelCase`
- Constants: `UPPER_SNAKE_CASE`
- Types/Interfaces: `PascalCase`

### Import Order
```typescript
// 1. External dependencies
import express from 'express';

// 2. Path aliases (by layer)
import { Agent } from '@domain/entities/Agent';
import { AgentRepository } from '@infrastructure/database/repositories/AgentRepository';

// 3. Relative imports (if any)
import { helper } from './utils';
```

---

## Debugging

### View Database
```bash
# Enter container
docker-compose -f docker-compose.dev.yml exec app bash

# Open SQLite
sqlite3 /app/data/village-sim.db

# Useful queries
.tables                      # List tables
.schema agents              # Show schema
SELECT * FROM agents;       # Query data
.quit                       # Exit
```

### Common Issues

**Tests failing after changes**
```bash
# Clean and rebuild
npm run build
npm test
```

**Path aliases not resolving**
```bash
# Restart TypeScript server in IDE
# Or rebuild Docker image
docker-compose -f docker-compose.dev.yml build
```

**Database locked**
```bash
# Close all connections
docker-compose -f docker-compose.dev.yml down
docker-compose -f docker-compose.dev.yml up -d
```

---

## Git Workflow

```bash
# Create feature branch
git checkout -b phase-2/task-name

# Commit after each task
git add .
git commit -m "Phase 2 Task #X: Description"

# Push regularly
git push origin phase-2/task-name

# After phase complete
git tag v0.3.0
git push --tags
```

---

## Performance Tips

1. **Use transactions** for bulk operations:
```typescript
connection.transaction(() => {
  // Multiple operations here
});
```

2. **Index frequently queried columns** (already done for Phase 1):
- Unique constraints: item names, tile coordinates
- Foreign keys: automatically indexed

3. **Use prepared statements** (repositories already do this)

---

## Phase Guidelines

### Before Starting a Phase
- [ ] Review BACKLOGS.md for tasks
- [ ] Review MINIMAL-DATA-SETS.md for data requirements
- [ ] Create progress tracker (e.g., PHASE-2-GUIDE.md)
- [ ] Set up any new dependencies

### During a Phase
- [ ] Follow TDD: write tests first
- [ ] Use minimal data (3-5 examples)
- [ ] Commit after each task
- [ ] Update docs incrementally
- [ ] Delete obsolete files immediately

### After a Phase
- [ ] Run all tests: `npm test`
- [ ] Check build: `npm run build`
- [ ] Fix linting: `npm run lint:fix`
- [ ] Create phase completion doc
- [ ] Git tag: `git tag v0.X.0`

---

## Resources

- **Architecture**: See ARCHITECTURE.md
- **Roadmap**: See BACKLOGS.md
- **Data Strategy**: See MINIMAL-DATA-SETS.md
- **Phase 1 Summary**: See PHASE-1-GUIDE.md

---

**Questions?** Check documentation or README.md
