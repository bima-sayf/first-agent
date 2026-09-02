# Village Simulation - Software Architecture

**Version**: 1.0  
**Date**: 2026-09-02  
**Status**: Design Complete

---

## 🎯 Architecture Principles

1. **Separation of Concerns**: Clear boundaries between layers
2. **Testability**: Every component independently testable
3. **Maintainability**: Modular, documented, and consistent
4. **Scalability**: Designed to grow from 9 to 100+ agents
5. **Data Integrity**: Database as single source of truth
6. **Fail-Safe**: Graceful degradation, LLM fallback always works
7. **Observable**: Comprehensive logging and monitoring

---

## 📐 Layered Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     PRESENTATION LAYER                       │
│  (Client-side: Phaser 3, UI Components, WebSocket Client)  │
└─────────────────────────────────────────────────────────────┘
                            ▲ │
                    Events  │ │ State
                            │ ▼
┌─────────────────────────────────────────────────────────────┐
│                      API/GATEWAY LAYER                       │
│   (Express Routes, Socket.IO, API Validation, Rate Limit)  │
└─────────────────────────────────────────────────────────────┘
                            ▲ │
                  Commands  │ │ Events
                            │ ▼
┌─────────────────────────────────────────────────────────────┐
│                     APPLICATION LAYER                        │
│     (Use Cases, Orchestration, Business Logic, CQRS)        │
└─────────────────────────────────────────────────────────────┘
                            ▲ │
                  Commands  │ │ Queries
                            │ ▼
┌─────────────────────────────────────────────────────────────┐
│                       DOMAIN LAYER                           │
│  (Entities, Value Objects, Domain Services, Aggregates)     │
└─────────────────────────────────────────────────────────────┘
                            ▲ │
                  Persist   │ │ Retrieve
                            │ ▼
┌─────────────────────────────────────────────────────────────┐
│                   INFRASTRUCTURE LAYER                       │
│   (Database, File System, External APIs, LLM, Logging)      │
└─────────────────────────────────────────────────────────────┘
```

---

## 📁 Project Structure (Target)

```
village-sim-demo/
│
├── client/                          # Frontend (Phaser 3)
│   ├── src/
│   │   ├── scenes/                  # Game scenes
│   │   │   ├── VillageScene.ts
│   │   │   ├── DungeonScene.ts
│   │   │   └── UIScene.ts
│   │   ├── ui/                      # UI components
│   │   │   ├── panels/
│   │   │   ├── inspectors/
│   │   │   └── overlays/
│   │   ├── services/                # Client services
│   │   │   ├── SocketService.ts
│   │   │   └── StateManager.ts
│   │   ├── utils/
│   │   ├── types/
│   │   └── main.ts                  # Entry point
│   ├── assets/                      # Sprites, tilesets, sounds
│   │   ├── sprites/
│   │   ├── tilesets/
│   │   └── audio/
│   ├── public/
│   │   ├── index.html
│   │   └── style.css
│   ├── tests/                       # Client tests
│   ├── tsconfig.json
│   └── package.json
│
├── server/                          # Backend (Node.js)
│   ├── src/
│   │   │
│   │   ├── api/                     # API/Gateway Layer
│   │   │   ├── routes/
│   │   │   │   ├── world.routes.ts
│   │   │   │   ├── agent.routes.ts
│   │   │   │   └── admin.routes.ts
│   │   │   ├── middleware/
│   │   │   │   ├── auth.middleware.ts
│   │   │   │   ├── validation.middleware.ts
│   │   │   │   ├── errorHandler.middleware.ts
│   │   │   │   └── rateLimiter.middleware.ts
│   │   │   ├── validators/
│   │   │   │   └── schemas.ts      # Joi/Zod schemas
│   │   │   └── sockets/
│   │   │       ├── socketServer.ts
│   │   │       └── socketHandlers.ts
│   │   │
│   │   ├── application/             # Application Layer
│   │   │   ├── useCases/            # Use cases (commands)
│   │   │   │   ├── simulation/
│   │   │   │   │   ├── StartSimulation.useCase.ts
│   │   │   │   │   ├── PauseSimulation.useCase.ts
│   │   │   │   │   └── AdvanceTick.useCase.ts
│   │   │   │   ├── agents/
│   │   │   │   │   ├── CreateAgent.useCase.ts
│   │   │   │   │   ├── ProcessAgentAction.useCase.ts
│   │   │   │   │   └── LevelUpAgent.useCase.ts
│   │   │   │   ├── building/
│   │   │   │   │   ├── CreateBlueprint.useCase.ts
│   │   │   │   │   ├── BuildStructure.useCase.ts
│   │   │   │   │   └── UpgradeStructure.useCase.ts
│   │   │   │   ├── crafting/
│   │   │   │   │   ├── CraftItem.useCase.ts
│   │   │   │   │   └── ValidateRecipe.useCase.ts
│   │   │   │   ├── combat/
│   │   │   │   │   ├── InitiateCombat.useCase.ts
│   │   │   │   │   ├── ProcessCombatTurn.useCase.ts
│   │   │   │   │   └── FormParty.useCase.ts
│   │   │   │   └── environment/
│   │   │   │       ├── SpawnEntity.useCase.ts
│   │   │   │       ├── ProcessEntityBehavior.useCase.ts
│   │   │   │       └── TriggerEvent.useCase.ts
│   │   │   │
│   │   │   ├── queries/             # Queries (read operations)
│   │   │   │   ├── GetWorldState.query.ts
│   │   │   │   ├── GetAgentDetails.query.ts
│   │   │   │   ├── GetResourceDashboard.query.ts
│   │   │   │   └── GetRelationshipGraph.query.ts
│   │   │   │
│   │   │   ├── services/            # Application services
│   │   │   │   ├── SimulationOrchestrator.service.ts
│   │   │   │   ├── DecisionCoordinator.service.ts
│   │   │   │   └── EventPublisher.service.ts
│   │   │   │
│   │   │   └── dtos/                # Data Transfer Objects
│   │   │       ├── AgentDTO.ts
│   │   │       ├── StructureDTO.ts
│   │   │       └── WorldStateDTO.ts
│   │   │
│   │   ├── domain/                  # Domain Layer (Core Business Logic)
│   │   │   ├── entities/            # Domain entities
│   │   │   │   ├── Agent.entity.ts
│   │   │   │   ├── Structure.entity.ts
│   │   │   │   ├── Item.entity.ts
│   │   │   │   ├── WorldTile.entity.ts
│   │   │   │   ├── EnvironmentEntity.entity.ts
│   │   │   │   └── Relationship.entity.ts
│   │   │   │
│   │   │   ├── valueObjects/        # Immutable value objects
│   │   │   │   ├── Attributes.vo.ts
│   │   │   │   ├── Stats.vo.ts
│   │   │   │   ├── Position.vo.ts
│   │   │   │   ├── Inventory.vo.ts
│   │   │   │   └── CombatStats.vo.ts
│   │   │   │
│   │   │   ├── aggregates/          # Aggregate roots
│   │   │   │   ├── Village.aggregate.ts
│   │   │   │   ├── Party.aggregate.ts
│   │   │   │   └── Dungeon.aggregate.ts
│   │   │   │
│   │   │   ├── services/            # Domain services
│   │   │   │   ├── CombatResolver.service.ts
│   │   │   │   ├── PathfindingService.ts
│   │   │   │   ├── RelationshipCalculator.service.ts
│   │   │   │   ├── SkillProgressionService.ts
│   │   │   │   └── ResourceProductionService.ts
│   │   │   │
│   │   │   ├── events/              # Domain events
│   │   │   │   ├── AgentLeveledUp.event.ts
│   │   │   │   ├── StructureCompleted.event.ts
│   │   │   │   ├── CombatEnded.event.ts
│   │   │   │   └── ResourceDepleted.event.ts
│   │   │   │
│   │   │   └── repositories/        # Repository interfaces
│   │   │       ├── IAgentRepository.ts
│   │   │       ├── IStructureRepository.ts
│   │   │       ├── IWorldRepository.ts
│   │   │       └── IEventRepository.ts
│   │   │
│   │   ├── infrastructure/          # Infrastructure Layer
│   │   │   ├── database/
│   │   │   │   ├── repositories/    # Repository implementations
│   │   │   │   │   ├── AgentRepository.ts
│   │   │   │   │   ├── StructureRepository.ts
│   │   │   │   │   ├── WorldRepository.ts
│   │   │   │   │   └── EventRepository.ts
│   │   │   │   ├── migrations/      # Database migrations
│   │   │   │   │   ├── 001_initial_schema.sql
│   │   │   │   │   ├── 002_add_blueprints.sql
│   │   │   │   │   └── 003_add_environment.sql
│   │   │   │   ├── seeds/           # Seed data
│   │   │   │   │   ├── items.seed.ts
│   │   │   │   │   ├── recipes.seed.ts
│   │   │   │   │   └── agents.seed.ts
│   │   │   │   ├── connection.ts    # DB connection manager
│   │   │   │   ├── migrator.ts      # Migration runner
│   │   │   │   └── queryBuilder.ts  # Query builder utility
│   │   │   │
│   │   │   ├── ai/                  # AI/LLM integration
│   │   │   │   ├── LLMClient.ts
│   │   │   │   ├── PromptBuilder.ts
│   │   │   │   ├── ResponseParser.ts
│   │   │   │   ├── FallbackEngine.ts
│   │   │   │   └── DecisionCache.ts
│   │   │   │
│   │   │   ├── logging/             # Logging infrastructure
│   │   │   │   ├── Logger.ts
│   │   │   │   ├── LogTransports.ts
│   │   │   │   └── PerformanceMonitor.ts
│   │   │   │
│   │   │   ├── caching/             # Caching layer
│   │   │   │   ├── CacheManager.ts
│   │   │   │   └── RedisAdapter.ts
│   │   │   │
│   │   │   └── external/            # External service adapters
│   │   │       └── OllamaAdapter.ts
│   │   │
│   │   ├── shared/                  # Shared utilities
│   │   │   ├── constants/
│   │   │   │   ├── gameConstants.ts
│   │   │   │   ├── errorCodes.ts
│   │   │   │   └── eventTypes.ts
│   │   │   ├── types/               # Shared types
│   │   │   │   ├── index.ts
│   │   │   │   ├── enums.ts
│   │   │   │   └── interfaces.ts
│   │   │   ├── utils/               # Utility functions
│   │   │   │   ├── math.utils.ts
│   │   │   │   ├── validation.utils.ts
│   │   │   │   ├── date.utils.ts
│   │   │   │   └── random.utils.ts
│   │   │   ├── errors/              # Custom errors
│   │   │   │   ├── BaseError.ts
│   │   │   │   ├── ValidationError.ts
│   │   │   │   ├── NotFoundError.ts
│   │   │   │   └── BusinessError.ts
│   │   │   └── config/              # Configuration
│   │   │       ├── index.ts
│   │   │       ├── database.config.ts
│   │   │       ├── llm.config.ts
│   │   │       └── simulation.config.ts
│   │   │
│   │   ├── tests/                   # Server tests
│   │   │   ├── unit/                # Unit tests
│   │   │   │   ├── domain/
│   │   │   │   ├── application/
│   │   │   │   └── infrastructure/
│   │   │   ├── integration/         # Integration tests
│   │   │   │   ├── api/
│   │   │   │   ├── database/
│   │   │   │   └── ai/
│   │   │   ├── e2e/                 # End-to-end tests
│   │   │   │   └── simulation.e2e.test.ts
│   │   │   ├── fixtures/            # Test data
│   │   │   │   ├── agents.fixture.ts
│   │   │   │   └── world.fixture.ts
│   │   │   └── helpers/             # Test utilities
│   │   │       ├── testDatabase.ts
│   │   │       └── mockLLM.ts
│   │   │
│   │   └── main.ts                  # Server entry point
│   │
│   ├── tsconfig.json
│   ├── jest.config.js               # Test configuration
│   ├── .eslintrc.js                 # Linting rules
│   ├── .prettierrc                  # Code formatting
│   └── package.json
│
├── shared/                          # Shared between client/server
│   ├── types/                       # TypeScript types
│   │   ├── Agent.types.ts
│   │   ├── World.types.ts
│   │   ├── API.types.ts
│   │   └── Events.types.ts
│   └── constants/
│       ├── gameRules.ts
│       └── uiConstants.ts
│
├── scripts/                         # Utility scripts
│   ├── setup-db.sh                  # Database initialization
│   ├── seed-data.ts                 # Data seeding
│   ├── run-migrations.ts            # Migration runner
│   ├── generate-types.ts            # Type generation
│   └── performance-test.ts          # Load testing
│
├── docs/                            # Documentation
│   ├── api/                         # API documentation
│   │   ├── endpoints.md
│   │   └── websocket-events.md
│   ├── architecture/                # Architecture docs
│   │   ├── diagrams/
│   │   └── decisions/               # ADRs
│   ├── guides/                      # Developer guides
│   │   ├── setup.md
│   │   ├── testing.md
│   │   └── contributing.md
│   └── changelog/
│       └── CHANGELOG.md
│
├── config/                          # Environment configs
│   ├── development.json
│   ├── test.json
│   └── production.json
│
├── docker/                          # Docker configuration
│   ├── Dockerfile.server
│   ├── Dockerfile.client
│   └── docker-compose.yml
│
├── .github/                         # CI/CD
│   └── workflows/
│       ├── test.yml
│       ├── lint.yml
│       └── deploy.yml
│
├── .gitignore
├── .env.example
├── package.json                     # Root package.json
├── tsconfig.base.json               # Shared TypeScript config
├── README.md
├── ARCHITECTURE.md                  # This file
├── BACKLOGS.md
├── PROJECT-CONTEXT.md
└── INDEX.md
```

---

## 🔧 Design Patterns & Practices

### 1. **Repository Pattern**
- Abstract data access behind interfaces
- Domain layer doesn't know about database
- Easy to swap SQLite ↔ PostgreSQL

```typescript
// domain/repositories/IAgentRepository.ts
export interface IAgentRepository {
  findById(id: string): Promise<Agent | null>;
  save(agent: Agent): Promise<void>;
  findAll(): Promise<Agent[]>;
  delete(id: string): Promise<void>;
}

// infrastructure/database/repositories/AgentRepository.ts
export class AgentRepository implements IAgentRepository {
  constructor(private db: Database) {}
  
  async findById(id: string): Promise<Agent | null> {
    // Database-specific implementation
  }
  // ...
}
```

### 2. **CQRS (Command Query Responsibility Segregation)**
- Separate commands (write) from queries (read)
- Commands: Change state, no return value
- Queries: Read state, no side effects

```typescript
// Command
class CraftItemCommand {
  constructor(
    public agentId: string,
    public recipeId: string
  ) {}
}

// Query
class GetAgentInventoryQuery {
  constructor(public agentId: string) {}
}
```

### 3. **Domain Events**
- Publish events when significant domain actions occur
- Loosely coupled components
- Easy to add new features (event listeners)

```typescript
// When agent levels up
eventPublisher.publish(new AgentLeveledUpEvent(agent.id, newLevel));

// Other systems can react
eventBus.subscribe(AgentLeveledUpEvent, (event) => {
  logger.info(`Agent ${event.agentId} leveled up!`);
  notificationService.notifyClients(event);
});
```

### 4. **Dependency Injection**
- Constructor injection for dependencies
- Easier testing (mock dependencies)
- Flexible configuration

```typescript
class SimulationOrchestrator {
  constructor(
    private agentRepository: IAgentRepository,
    private decisionEngine: IDecisionEngine,
    private eventPublisher: IEventPublisher,
    private logger: ILogger
  ) {}
}
```

### 5. **Strategy Pattern**
- For LLM fallback mechanisms
- Different decision strategies (LLM, rules, hybrid)

```typescript
interface IDecisionStrategy {
  decide(context: DecisionContext): Promise<Decision>;
}

class LLMDecisionStrategy implements IDecisionStrategy { ... }
class RuleBasedDecisionStrategy implements IDecisionStrategy { ... }
```

### 6. **Factory Pattern**
- Create complex objects
- Centralize object creation logic

```typescript
class EntityFactory {
  createAgent(def: AgentDefinition): Agent {
    // Complex creation logic
  }
  
  createStructure(type: StructureType, position: Position): Structure {
    // Creation logic with validation
  }
}
```

### 7. **Observer Pattern**
- For real-time updates to clients
- Pub/sub for events

---

## 🧪 Testing Strategy

### Test Pyramid

```
        /\
       /  \       E2E Tests (5%)
      /────\      - Full simulation runs
     /      \     - Critical user journeys
    /────────\    
   /  Integr  \   Integration Tests (20%)
  /────────────\  - API endpoints
 /              \ - Database operations
/────────────────\ - LLM integration
    Unit Tests      Unit Tests (75%)
                    - Domain logic
                    - Business rules
                    - Utilities
```

### Test Organization

```
tests/
├── unit/                    # Fast, isolated tests
│   ├── domain/              # Domain entities, value objects
│   ├── application/         # Use cases, services
│   └── utils/               # Utility functions
│
├── integration/             # Tests with real dependencies
│   ├── database/            # Repository tests
│   ├── api/                 # Route tests
│   └── ai/                  # LLM integration tests
│
├── e2e/                     # Full system tests
│   ├── simulation.test.ts   # Run full simulation
│   └── combat.test.ts       # Combat scenarios
│
├── fixtures/                # Reusable test data
├── mocks/                   # Mock implementations
└── helpers/                 # Test utilities
```

### Testing Tools

- **Jest**: Unit & integration testing
- **Supertest**: API endpoint testing
- **ts-mockito**: Mocking in TypeScript
- **faker**: Generate test data
- **testcontainers**: Docker containers for integration tests

### Code Coverage Targets

- **Unit Tests**: >80% coverage
- **Integration Tests**: Critical paths covered
- **E2E Tests**: Happy path + error scenarios

---

## 📊 Data Flow Patterns

### 1. **Write Path (Command)**

```
Client Action
    ↓
API Gateway (validation)
    ↓
Use Case (orchestration)
    ↓
Domain Entity (business logic)
    ↓
Repository (persistence)
    ↓
Database
    ↓
Domain Event Published
    ↓
Event Handlers (side effects)
    ↓
Socket Notification → Clients
```

### 2. **Read Path (Query)**

```
Client Request
    ↓
API Gateway
    ↓
Query Handler
    ↓
Repository (optimized read query)
    ↓
Database
    ↓
DTO Mapping
    ↓
Response → Client
```

### 3. **Simulation Tick**

```
Tick Timer
    ↓
Simulation Orchestrator
    ↓
┌─────────────────┐
│ For Each Agent  │
│  - Get Context  │
│  - Make Decision│ (LLM or fallback)
│  - Execute      │
│  - Update State │
└─────────────────┘
    ↓
┌──────────────────┐
│ Environment Tick │
│  - Animals       │
│  - Trees         │
│  - Events        │
└──────────────────┘
    ↓
Persist State
    ↓
Broadcast Update → All Clients
```

---

## 🔐 Security Considerations

### 1. **Input Validation**
- Validate all client input (Joi/Zod schemas)
- Sanitize strings (prevent injection)
- Type checking with TypeScript

### 2. **Rate Limiting**
- Limit API requests per IP
- Limit WebSocket events per client
- Prevent abuse/DoS

### 3. **Authentication** (Future)
- JWT tokens for multi-user
- Session management
- Admin vs observer roles

### 4. **Database Security**
- Parameterized queries (prevent SQL injection)
- Encrypt sensitive data (if any)
- Regular backups

### 5. **LLM Prompt Safety**
- Sanitize user-generated content in prompts
- Limit prompt length
- Validate LLM responses before execution

---

## 📈 Performance Optimization

### 1. **Database**
- Proper indexes on frequently queried columns
- Connection pooling
- Batch inserts/updates
- Periodic vacuum/analyze

### 2. **Caching**
- Cache frequently accessed data (agent stats, recipes)
- Redis for distributed caching (future)
- In-memory cache for hot data

### 3. **LLM Calls**
- Cache recent decisions (similar context)
- Batch multiple agent decisions
- Parallel execution where possible
- Timeout and fallback quickly

### 4. **WebSocket**
- Delta updates (send only changes)
- Compress large payloads
- Throttle updates (max 60/sec)

### 5. **Client Rendering**
- Sprite batching in Phaser
- Object pooling (reuse sprites)
- Culling off-screen entities
- Lazy load assets

---

## 🔍 Monitoring & Observability

### 1. **Logging Levels**
- **ERROR**: Failures requiring attention
- **WARN**: Recoverable issues (LLM timeout, fallback triggered)
- **INFO**: Important events (simulation start, agent level up)
- **DEBUG**: Detailed flow (development only)

### 2. **Metrics to Track**
- Simulation tick duration (target: <100ms)
- LLM response times
- Database query times
- Active WebSocket connections
- Memory usage
- Event throughput

### 3. **Structured Logging**
```typescript
logger.info('Agent action executed', {
  agentId: 'elin',
  action: 'craft',
  item: 'iron_sword',
  success: true,
  duration: 45
});
```

### 4. **Health Checks**
- `/health`: Basic health endpoint
- `/health/db`: Database connectivity
- `/health/llm`: LLM availability
- `/metrics`: Prometheus-compatible metrics

---

## 🚀 Deployment Architecture

### Development
```
Developer Machine
├── Docker Compose
│   ├── ollama (LLM)
│   ├── postgres (Database)
│   └── app (Server + Client)
```

### Production (Future)
```
Cloud Infrastructure
├── Load Balancer
├── App Servers (N instances)
│   ├── Node.js server
│   └── Static client files
├── Database (Primary + Replica)
├── Redis Cache
├── Ollama Service (GPU instance)
└── Monitoring (Prometheus + Grafana)
```

---

## 📝 Code Quality Standards

### 1. **TypeScript Strict Mode**
```json
{
  "strict": true,
  "noImplicitAny": true,
  "strictNullChecks": true,
  "strictFunctionTypes": true
}
```

### 2. **ESLint Rules**
- No unused variables
- Consistent naming (camelCase, PascalCase)
- Max function length: 50 lines
- Max file length: 300 lines
- Complexity limit: 10

### 3. **Code Review Checklist**
- [ ] Tests written and passing
- [ ] Code follows style guide
- [ ] No console.logs (use logger)
- [ ] Error handling present
- [ ] Documentation updated
- [ ] Performance considered

### 4. **Git Workflow**
```
main (protected)
  ↑
develop
  ↑
feature/UX-001-database-setup
feature/UX-035-progressive-building
```

- Feature branches from `develop`
- PR reviews required
- CI must pass before merge

---

## 🔄 Migration Path

### Phase 1: Refactor Current Code
1. Extract business logic from current files
2. Create domain entities
3. Setup TypeScript
4. Add basic tests

### Phase 2: Layer Separation
1. Create application layer (use cases)
2. Implement repositories
3. Move LLM logic to infrastructure
4. Add dependency injection

### Phase 3: Advanced Features
1. Add CQRS pattern
2. Implement domain events
3. Add caching layer
4. Setup monitoring

---

## 📚 Documentation Standards

### 1. **Code Comments**
```typescript
/**
 * Calculates damage dealt in combat considering attacker
 * and defender stats.
 * 
 * @param attacker - The attacking entity
 * @param defender - The defending entity
 * @returns Final damage value (always >= 1)
 */
calculateDamage(attacker: Agent, defender: Agent): number {
  // Implementation
}
```

### 2. **README per Module**
Each major folder has README explaining:
- Purpose of the module
- Key files and their roles
- Dependencies
- How to test

### 3. **ADRs (Architecture Decision Records)**
Document significant decisions:
```
docs/architecture/decisions/
├── 001-use-sqlite-for-database.md
├── 002-cqrs-pattern-for-scale.md
└── 003-separate-llm-infrastructure.md
```

---

## ✅ Quality Gates

### Pre-Commit
- ESLint passes
- Prettier formats code
- Unit tests pass (fast tests only)

### Pre-Push
- All tests pass (unit + integration)
- Build succeeds
- No TypeScript errors

### Pre-Merge (CI)
- All tests pass
- Code coverage >= 80%
- No security vulnerabilities (npm audit)
- Build successful
- E2E tests pass

---

## 🎯 Success Metrics

### Code Quality
- Test coverage > 80%
- 0 critical bugs in production
- Code review approval rate > 95%
- Average PR review time < 24h

### Performance
- Tick duration < 100ms (p95)
- LLM response time < 5s (p95)
- API response time < 200ms (p95)
- Client FPS >= 60

### Reliability
- Uptime > 99.9%
- Database backup success rate: 100%
- LLM fallback triggers < 5% of decisions
- Zero data loss events

---

**Status**: Architecture design complete, ready for implementation  
**Next**: Begin Phase 1 with this architecture in mind  
**Owner**: Development Team
