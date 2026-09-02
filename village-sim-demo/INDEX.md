# Village Simulation RPG - Documentation Index

Quick navigation for all project documentation.

---

## 📖 Core Documentation

### [README.md](README.md)
**Purpose**: Quick start guide and project overview  
**Contents**:
- Vision statement
- Quick start instructions
- Docker setup
- Current project structure
- How the simulation tick works

**Read this first** if you're new to the project.

---

### [ARCHITECTURE.md](ARCHITECTURE.md) ⭐ NEW
**Purpose**: Complete software architecture and engineering standards  
**Contents**:
- Layered architecture (Presentation → API → Application → Domain → Infrastructure)
- Project structure (detailed folder organization)
- Design patterns (Repository, CQRS, Domain Events, DI, Strategy, Factory, Observer)
- Testing strategy (Test Pyramid, unit/integration/E2E)
- Data flow patterns
- Security considerations
- Performance optimization
- Monitoring & observability
- Deployment architecture
- Code quality standards
- Migration path from current code

**Read this** before implementing any major feature - defines how code should be organized.

---

### [DEVELOPMENT-GUIDE.md](DEVELOPMENT-GUIDE.md) ⭐ NEW
**Purpose**: Developer onboarding and daily development workflow  
**Contents**:
- Quick start setup
- Project structure by layer
- Testing guidelines (how to write & run tests)
- Code style guide (naming, formatting, ESLint, Prettier)
- Database management (migrations, seeds)
- Development tools (VS Code setup, debugging)
- Package scripts
- Git workflow (branching, commits, PRs)
- CI/CD pipeline
- Debugging tips
- Pre-development checklist

**Read this** when starting development - practical day-to-day guide.

---

### [PROJECT-CONTEXT.md](PROJECT-CONTEXT.md)
**Purpose**: Complete technical vision and architecture  
**Contents**:
- Project vision and goals
- Current state analysis (what exists, what's missing)
- Target architecture (v1.0.0)
- Core system designs:
  - Character system (attributes, stats, skills)
  - Resource system (energy, hunger, inventory, gold)
  - Dungeon & combat system
  - Enhanced locations
  - Relationship system
- Visual upgrade path
- Simulation loop evolution
- Technical considerations
- Code structure (current vs target)
- Gameplay vision and emergent scenarios
- Design principles and success metrics

**Read this** to understand the complete vision and architectural plans.

---

### [BACKLOGS.md](BACKLOGS.md)
**Purpose**: Detailed development roadmap and task list  
**Contents**:
- 13 development phases overview (v0.2 to v1.4)
- 142 discrete tasks across all phases
- Estimated durations
- Phase-by-phase breakdown:
  - **Phase 1**: Database & Core Data Models (v0.2) ⭐
  - **Phase 2**: Attributes & Stats (v0.3)
  - **Phase 3**: Resource Management & Crafting (v0.4)
  - **Phase 4**: Skills & Leveling (v0.5)
  - **Phase 5**: Progressive Map Building System (v0.6) ⭐
  - **Phase 6**: Real-World Physics Crafting (v0.7) ⭐
  - **Phase 7**: Environment Systems Non-LLM (v0.8) ⭐
  - **Phase 8**: Visual Upgrade Sprites (v0.9)
  - **Phase 9**: Advanced Observation UI (v1.0) ⭐
  - **Phase 10**: Relationships & Collaboration (v1.1)
  - **Phase 11**: Combat & Dungeons (v1.2)
  - **Phase 12**: Time, Weather & Seasons (v1.3)
  - **Phase 13**: Polish & Balance (v1.4)
- Stretch goals (post-v1.4)
- Priority matrix
- Current status tracker

⭐ = New major systems (progressive building, physics crafting, environment, observation UI)

**Read this** when you're ready to start development and need actionable tasks.

---

## 🗂️ Code Documentation

### Server Code (`server/`)

- **`index.js`** - Main Express server, Socket.IO setup, simulation tick loop
- **`agent.js`** - Agent class: movement, actions, memory, state management
- **`villagers.js`** - Static definitions for 9 villagers (personality, roles, starting positions)
- **`world.js`** - Map data: grid size, locations, coordinates
- **`decisionEngine.js`** - LLM integration: Ollama calls, prompt building, fallback logic

### Client Code (`public/`)

- **`game.js`** - Phaser 3 scene: rendering, sprites, Socket.IO client
- **`index.html`** - Page structure and layout
- **`style.css`** - UI styling for panels and log

---

## 🎯 Getting Started Workflow

### For New Developers
1. Read [README.md](README.md) - Understand what the project is
2. Read [ARCHITECTURE.md](ARCHITECTURE.md) - Understand how it's built
3. Read [DEVELOPMENT-GUIDE.md](DEVELOPMENT-GUIDE.md) - Setup your environment
4. Run `docker compose up --build` - See it working
5. Read [PROJECT-CONTEXT.md](PROJECT-CONTEXT.md) - Understand where it's going
6. Read [BACKLOGS.md](BACKLOGS.md) - Pick a task from Phase 1 (Database setup)

### For Contributors
1. Check [BACKLOGS.md](BACKLOGS.md) - Find the current phase
2. Review [ARCHITECTURE.md](ARCHITECTURE.md) - Understand layer responsibilities
3. Follow [DEVELOPMENT-GUIDE.md](DEVELOPMENT-GUIDE.md) - Code standards & testing
4. Pick an unchecked task (`[ ]`)
5. Create feature branch: `feature/UX-XXX-description`
6. Write tests first (TDD)
7. Implement, test, check off (`[x]`)
8. Submit PR with proper description

### For Observers
1. Read [README.md](README.md) - Quick overview
2. Browse [PROJECT-CONTEXT.md](PROJECT-CONTEXT.md) - See the vision
3. Check "Gameplay Vision" section for emergent scenarios

---

## 📋 Current Status

**Version**: 0.1.0 (Minimal Demo)  
**Next Version**: 0.2.0 (Database & Core Data Models)  
**Current Phase**: Planning Complete → Ready for Phase 1  
**Next Task**: UX-001 (Choose and setup database system)

---

## 🔗 Quick Links by Topic

### Architecture & Design
- [Current State Analysis](PROJECT-CONTEXT.md#-current-state-v010)
- [Target Architecture](PROJECT-CONTEXT.md#-target-architecture-v100)
- [Design Principles](PROJECT-CONTEXT.md#-key-design-principles)

### Systems
- [Character System Design](PROJECT-CONTEXT.md#1-character-system)
- [Resource System Design](PROJECT-CONTEXT.md#2-resource-system)
- [Progressive Building System](BACKLOGS.md#-phase-5-progressive-map-building-system-v06)
- [Physics Crafting System](BACKLOGS.md#-phase-6-real-world-physics-crafting-v07)
- [Environment System](BACKLOGS.md#-phase-7-environment-systems-non-llm-v08)
- [Observation UI](BACKLOGS.md#-phase-9-advanced-observation-ui-v10)
- [Combat System Design](PROJECT-CONTEXT.md#3-dungeon--combat-system)
- [Relationship System Design](PROJECT-CONTEXT.md#5-relationship-system)

### Development
- [Phase 1 Tasks (Database)](BACKLOGS.md#-phase-1-database--core-data-models-v02)
- [Phase 2 Tasks (Attributes)](BACKLOGS.md#-phase-2-attributes--stats-system-v03)
- [Phase 3 Tasks (Resources & Crafting)](BACKLOGS.md#-phase-3-resource-management--crafting-foundation-v04)
- [Phase 5 Tasks (Progressive Building)](BACKLOGS.md#-phase-5-progressive-map-building-system-v06)
- [All 13 Phases Overview](BACKLOGS.md#-development-phases-overview)
- [Stretch Goals](BACKLOGS.md#-stretch-goals-post-v14)

### Vision & Gameplay
- [Gameplay Vision](PROJECT-CONTEXT.md#-gameplay-vision)
- [Emergent Scenarios](PROJECT-CONTEXT.md#emergent-scenarios)
- [Success Metrics](PROJECT-CONTEXT.md#-success-metrics)

---

## 📝 Document Updates

- **2026-09-02**: Initial documentation created (PROJECT-CONTEXT, BACKLOGS, INDEX)
- Planning phase complete
- Ready for implementation

---

## 🤝 Contributing

When working on tasks:
1. Check off tasks in BACKLOGS.md as you complete them
2. Update PROJECT-CONTEXT.md if you discover architectural changes needed
3. Keep this INDEX.md updated if you add new documentation
4. Use task IDs in commit messages (e.g., "UX-015: Add XP and leveling system")

---

**Last Updated**: 2026-09-02  
**Status**: Documentation Complete, Development Ready
