# Development Guide

**Project**: Village Simulation - Civilization Builder  
**Last Updated**: 2026-09-02

---

## 🚀 Quick Start

### Prerequisites
- Node.js >= 18.x
- npm >= 9.x
- Docker & Docker Compose
- Git
- Code editor (VS Code recommended)

### Initial Setup

```bash
# Clone repository
git clone <repository-url>
cd village-sim-demo

# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with your configuration

# Setup database
npm run db:setup
npm run db:migrate
npm run db:seed

# Start development servers
npm run dev

# In separate terminal, run tests
npm test
```

---

## 📁 Project Structure by Layer

### Presentation Layer (Client)
```
client/src/
├── scenes/          # Phaser game scenes
├── ui/              # UI components
├── services/        # Client-side services
└── types/           # TypeScript interfaces
```

### API/Gateway Layer
```
server/src/api/
├── routes/          # Express routes
├── middleware/      # Request interceptors
├── validators/      # Input validation
└── sockets/         # WebSocket handlers
```

### Application Layer
```
server/src/application/
├── useCases/        # Business operations (commands)
├── queries/         # Data retrieval operations
├── services/        # Orchestration services
└── dtos/            # Data transfer objects
```

### Domain Layer (Core)
```
server/src/domain/
├── entities/        # Domain entities
├── valueObjects/    # Immutable values
├── aggregates/      # Aggregate roots
├── services/        # Domain logic
├── events/          # Domain events
└── repositories/    # Repository interfaces
```

### Infrastructure Layer
```
server/src/infrastructure/
├── database/        # Data persistence
├── ai/              # LLM integration
├── logging/         # Logging system
├── caching/         # Cache layer
└── external/        # External services
```

---

## 🧪 Testing Guidelines

### Running Tests

```bash
# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run integration tests
npm run test:integration

# Run E2E tests
npm run test:e2e

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage

# Run specific test file
npm test -- path/to/test.spec.ts
```

### Writing Tests

#### Unit Test Example
```typescript
// tests/unit/domain/entities/Agent.entity.spec.ts
import { Agent } from '@domain/entities/Agent.entity';
import { Attributes } from '@domain/valueObjects/Attributes.vo';

describe('Agent Entity', () => {
  let agent: Agent;

  beforeEach(() => {
    const attributes = new Attributes({ str: 12, end: 14, agi: 10, int: 11, wis: 9, cha: 8 });
    agent = new Agent({
      id: 'test-agent',
      name: 'TestAgent',
      role: 'farmer',
      attributes
    });
  });

  describe('calculateMaxHP', () => {
    it('should calculate HP based on endurance', () => {
      expect(agent.maxHP).toBe(140); // END 14 × 10
    });
  });

  describe('consumeEnergy', () => {
    it('should reduce energy by specified amount', () => {
      const initialEnergy = agent.energy;
      agent.consumeEnergy(20);
      expect(agent.energy).toBe(initialEnergy - 20);
    });

    it('should not reduce energy below 0', () => {
      agent.consumeEnergy(10000);
      expect(agent.energy).toBe(0);
    });
  });

  describe('canPerformAction', () => {
    it('should return false if energy insufficient', () => {
      agent.consumeEnergy(agent.energy); // Drain all energy
      expect(agent.canPerformAction(10)).toBe(false);
    });

    it('should return true if energy sufficient', () => {
      expect(agent.canPerformAction(10)).toBe(true);
    });
  });
});
```

#### Integration Test Example
```typescript
// tests/integration/database/AgentRepository.spec.ts
import { AgentRepository } from '@infrastructure/database/repositories/AgentRepository';
import { setupTestDatabase, cleanupTestDatabase } from '@tests/helpers/testDatabase';

describe('AgentRepository Integration', () => {
  let repository: AgentRepository;
  let db: Database;

  beforeAll(async () => {
    db = await setupTestDatabase();
    repository = new AgentRepository(db);
  });

  afterAll(async () => {
    await cleanupTestDatabase(db);
  });

  afterEach(async () => {
    await db.run('DELETE FROM agents');
  });

  describe('save', () => {
    it('should persist agent to database', async () => {
      const agent = createTestAgent();
      await repository.save(agent);

      const retrieved = await repository.findById(agent.id);
      expect(retrieved).toBeDefined();
      expect(retrieved!.name).toBe(agent.name);
    });
  });

  describe('findById', () => {
    it('should return null for non-existent agent', async () => {
      const result = await repository.findById('non-existent');
      expect(result).toBeNull();
    });
  });
});
```

#### E2E Test Example
```typescript
// tests/e2e/simulation.e2e.spec.ts
import request from 'supertest';
import { app } from '@api/app';
import { setupTestEnvironment, teardownTestEnvironment } from '@tests/helpers/e2eSetup';

describe('Simulation E2E', () => {
  beforeAll(async () => {
    await setupTestEnvironment();
  });

  afterAll(async () => {
    await teardownTestEnvironment();
  });

  it('should run full simulation tick', async () => {
    // Start simulation
    const startResponse = await request(app)
      .post('/api/simulation/start')
      .expect(200);

    expect(startResponse.body.status).toBe('running');

    // Advance tick
    const tickResponse = await request(app)
      .post('/api/simulation/tick')
      .expect(200);

    expect(tickResponse.body.tick).toBeGreaterThan(0);

    // Get world state
    const stateResponse = await request(app)
      .get('/api/world/state')
      .expect(200);

    expect(stateResponse.body.agents).toHaveLength(9);
  });
});
```

### Test Fixtures

```typescript
// tests/fixtures/agents.fixture.ts
export const createTestAgent = (overrides?: Partial<AgentProps>): Agent => {
  return new Agent({
    id: faker.datatype.uuid(),
    name: faker.name.firstName(),
    role: 'farmer',
    attributes: new Attributes({ str: 12, end: 14, agi: 10, int: 11, wis: 9, cha: 8 }),
    ...overrides
  });
};
```

### Mocking LLM

```typescript
// tests/mocks/MockLLMClient.ts
export class MockLLMClient implements ILLMClient {
  async generateDecision(prompt: string): Promise<Decision> {
    // Return deterministic decision for testing
    return {
      action: 'work',
      target: 'Farm',
      thought: 'Test decision'
    };
  }
}
```

---

## 🎨 Code Style Guide

### TypeScript Conventions

#### Naming
- **Classes**: PascalCase - `AgentEntity`, `CombatResolver`
- **Interfaces**: PascalCase with `I` prefix - `IAgentRepository`, `IDecisionEngine`
- **Functions**: camelCase - `calculateDamage`, `processAgentAction`
- **Constants**: UPPER_SNAKE_CASE - `MAX_ENERGY`, `DEFAULT_TICK_RATE`
- **Files**: kebab-case - `agent.entity.ts`, `combat-resolver.service.ts`

#### File Organization
```typescript
// 1. Imports (grouped)
import { external } from 'external-lib';
import { internal } from '@domain/internal';
import { types } from './types';

// 2. Types/Interfaces
interface AgentProps {
  id: string;
  name: string;
}

// 3. Constants
const DEFAULT_ENERGY = 100;

// 4. Class/Function
export class Agent {
  // ...
}

// 5. Exports
export { Agent };
```

#### Function Structure
```typescript
/**
 * Concise description of what function does
 * 
 * @param param1 - Description
 * @param param2 - Description
 * @returns Description of return value
 * @throws ErrorType - When this error occurs
 */
export function functionName(param1: Type1, param2: Type2): ReturnType {
  // Input validation
  if (!param1) {
    throw new ValidationError('param1 is required');
  }

  // Early returns for edge cases
  if (param2 === 0) {
    return defaultValue;
  }

  // Main logic
  const result = computeSomething(param1, param2);

  // Return
  return result;
}
```

### ESLint Configuration

```javascript
// .eslintrc.js
module.exports = {
  parser: '@typescript-eslint/parser',
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:prettier/recommended'
  ],
  rules: {
    '@typescript-eslint/explicit-function-return-type': 'error',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'error',
    'max-lines': ['warn', { max: 300 }],
    'max-lines-per-function': ['warn', { max: 50 }],
    'complexity': ['warn', 10],
    'no-console': ['error', { allow: ['warn', 'error'] }]
  }
};
```

### Prettier Configuration

```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "arrowParens": "avoid"
}
```

---

## 🗄️ Database Management

### Migrations

```bash
# Create new migration
npm run migration:create -- add_blueprints_table

# Run migrations
npm run migration:up

# Rollback last migration
npm run migration:down

# Reset database (careful!)
npm run db:reset
```

#### Migration Template
```sql
-- migrations/003_add_blueprints.sql
-- UP
CREATE TABLE blueprints (
  id TEXT PRIMARY KEY,
  structure_type TEXT NOT NULL,
  x INTEGER NOT NULL,
  y INTEGER NOT NULL,
  planned_by TEXT NOT NULL,
  status TEXT DEFAULT 'planned',
  materials_required TEXT NOT NULL, -- JSON
  materials_delivered TEXT DEFAULT '[]', -- JSON
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (planned_by) REFERENCES agents(id)
);

CREATE INDEX idx_blueprints_status ON blueprints(status);
CREATE INDEX idx_blueprints_location ON blueprints(x, y);

-- DOWN
DROP INDEX idx_blueprints_location;
DROP INDEX idx_blueprints_status;
DROP TABLE blueprints;
```

### Seeds

```typescript
// database/seeds/items.seed.ts
export async function seedItems(db: Database): Promise<void> {
  const items = [
    { id: 'wood', name: 'Wood', type: 'material', stackable: true, max_stack: 100, weight: 2 },
    { id: 'stone', name: 'Stone', type: 'material', stackable: true, max_stack: 100, weight: 3 },
    { id: 'iron_ore', name: 'Iron Ore', type: 'material', stackable: true, max_stack: 50, weight: 5 },
    // ... more items
  ];

  const stmt = db.prepare('INSERT INTO items VALUES (?, ?, ?, ?, ?, ?)');
  for (const item of items) {
    stmt.run(item.id, item.name, item.type, item.stackable ? 1 : 0, item.max_stack, item.weight);
  }
}
```

---

## 🔧 Development Tools

### VS Code Extensions (Recommended)

```json
// .vscode/extensions.json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "orta.vscode-jest",
    "ms-vscode.vscode-typescript-next",
    "mikestead.dotenv",
    "gruntfuggly.todo-tree"
  ]
}
```

### VS Code Settings

```json
// .vscode/settings.json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "eslint.validate": ["typescript"],
  "typescript.tsdk": "node_modules/typescript/lib",
  "jest.autoRun": "off"
}
```

### Debug Configuration

```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Server",
      "program": "${workspaceFolder}/server/src/main.ts",
      "preLaunchTask": "npm: build",
      "outFiles": ["${workspaceFolder}/server/dist/**/*.js"],
      "env": {
        "NODE_ENV": "development"
      }
    },
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Tests",
      "program": "${workspaceFolder}/node_modules/jest/bin/jest",
      "args": ["--runInBand", "--no-cache"],
      "console": "integratedTerminal"
    }
  ]
}
```

---

## 📦 Package Scripts

```json
{
  "scripts": {
    "dev": "concurrently \"npm run dev:server\" \"npm run dev:client\"",
    "dev:server": "nodemon --watch server/src --exec ts-node server/src/main.ts",
    "dev:client": "webpack serve --config client/webpack.dev.js",
    
    "build": "npm run build:server && npm run build:client",
    "build:server": "tsc -p server/tsconfig.json",
    "build:client": "webpack --config client/webpack.prod.js",
    
    "test": "jest",
    "test:unit": "jest --testPathPattern=tests/unit",
    "test:integration": "jest --testPathPattern=tests/integration",
    "test:e2e": "jest --testPathPattern=tests/e2e",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    
    "lint": "eslint . --ext .ts,.tsx",
    "lint:fix": "eslint . --ext .ts,.tsx --fix",
    "format": "prettier --write \"**/*.{ts,tsx,js,json,md}\"",
    
    "db:setup": "ts-node scripts/setup-db.ts",
    "db:migrate": "ts-node scripts/run-migrations.ts",
    "db:seed": "ts-node scripts/seed-data.ts",
    "db:reset": "npm run db:setup && npm run db:migrate && npm run db:seed",
    
    "migration:create": "ts-node scripts/create-migration.ts",
    "migration:up": "ts-node scripts/run-migrations.ts up",
    "migration:down": "ts-node scripts/run-migrations.ts down",
    
    "start": "node server/dist/main.js",
    "docker:up": "docker-compose up -d",
    "docker:down": "docker-compose down",
    "docker:logs": "docker-compose logs -f"
  }
}
```

---

## 🔄 Git Workflow

### Branch Naming
```
feature/UX-001-database-setup
bugfix/fix-combat-damage-calculation
hotfix/critical-save-corruption
refactor/extract-decision-engine
docs/update-architecture
```

### Commit Messages
```
feat(UX-035): add blueprint creation system

- Implement Blueprint entity
- Add CreateBlueprint use case
- Add blueprint repository
- Add tests for blueprint validation

Closes #35
```

Format: `type(scope): subject`

**Types**: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `perf`

### Pull Request Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Feature (UX-XXX)
- [ ] Bug fix
- [ ] Refactor
- [ ] Documentation

## Checklist
- [ ] Tests added/updated
- [ ] All tests passing
- [ ] ESLint passing
- [ ] Documentation updated
- [ ] BACKLOGS.md task checked off

## Testing
How to test these changes

## Screenshots (if UI changes)
```

---

## 🚀 CI/CD Pipeline

### GitHub Actions Workflow

```yaml
# .github/workflows/test.yml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Lint
        run: npm run lint
      
      - name: Run unit tests
        run: npm run test:unit
      
      - name: Run integration tests
        run: npm run test:integration
        env:
          DATABASE_URL: postgresql://postgres:test@localhost:5432/test
      
      - name: Run E2E tests
        run: npm run test:e2e
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
```

---

## 🐛 Debugging Tips

### Common Issues

#### 1. **Tests Failing Randomly**
```bash
# Run tests sequentially instead of parallel
npm test -- --runInBand
```

#### 2. **Database Lock Issues**
```bash
# Reset database
npm run db:reset
```

#### 3. **Memory Leaks in Tests**
```typescript
// Always cleanup after tests
afterEach(async () => {
  await cleanupResources();
  jest.clearAllMocks();
});
```

#### 4. **LLM Timeouts**
```typescript
// Increase timeout for LLM tests
jest.setTimeout(30000); // 30 seconds
```

### Debugging Techniques

#### Enable Verbose Logging
```bash
DEBUG=* npm run dev
```

#### Database Query Logging
```typescript
// In development
db.on('trace', (sql) => {
  console.log('SQL:', sql);
});
```

#### Performance Profiling
```typescript
console.time('operation');
await expensiveOperation();
console.timeEnd('operation');
```

---

## 📚 Learning Resources

### Architecture Patterns
- Clean Architecture (Robert C. Martin)
- Domain-Driven Design (Eric Evans)
- Enterprise Integration Patterns

### TypeScript
- Official TypeScript Handbook
- Effective TypeScript (Dan Vanderkam)

### Testing
- Jest Documentation
- Testing Best Practices (Kent C. Dodds)

### Node.js
- Node.js Best Practices (Goldbergyoni)
- You Don't Know Node

---

## ✅ Pre-Development Checklist

Before starting a new task:
- [ ] Read relevant architecture documentation
- [ ] Understand the affected layers
- [ ] Check existing tests for similar features
- [ ] Create feature branch from `develop`
- [ ] Write tests first (TDD)
- [ ] Implement incrementally
- [ ] Run tests frequently
- [ ] Update documentation
- [ ] Create PR with proper description

---

## 🆘 Getting Help

1. Check documentation (`docs/` folder)
2. Search existing issues/PRs
3. Ask in team chat
4. Create detailed issue with:
   - Steps to reproduce
   - Expected vs actual behavior
   - Environment details
   - Relevant logs

---

**Last Updated**: 2026-09-02  
**Maintainer**: Development Team  
**Status**: Living Document
