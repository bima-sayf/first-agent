# Chatbot Project Backlogs

## Overview
This document tracks improvements, enhancements, and future features for the Reysa Telegram Bot project.

---

Shipped work is **not** listed here — see
[`changelogs/features-shipped-history.md`](changelogs/features-shipped-history.md). A backlog that
lists finished items stops being trusted.

---

## 🔴 Critical

### TRUST-001: Refuse to answer on unresolved identifiers
**Status**: 🔴 Open
**Effort**: Medium
**Depends on**: the lineage tools in
[`IMPLEMENTATION-PLAN-codeviz-knowledge.md`](IMPLEMENTATION-PLAN-codeviz-knowledge.md) Phase 2

**Description**: When asked about a column or catalog that does not exist, the bot answers anyway
from assumption. A confident answer about a misspelled column is worse than no answer, because
nothing in the reply reveals the mistake.

**Assessment and design**: see
[`IMPLEMENTATION-PLAN-codeviz-knowledge.md` § Part 3](IMPLEMENTATION-PLAN-codeviz-knowledge.md).
The short version: gate the model behind a resolver that runs *before* generation, reusing
`resolve()` and `suggest()` from code-viz's `tools/compare_columns.py`, and return ranked candidates
instead of prose when a name does not resolve.

**Acceptance criteria**:
- a misspelled column produces a candidate list, never an answer
- a well-formed but non-existent name produces an explicit "no match", never an answer
- answers about the two template catalogs are labelled as unverified
- the guarantee holds without relying on the model choosing to behave

---

## 🟡 High Priority

### PERS-001: Persistent Conversation History
**Status**: 🟡 Open  
**Effort**: Medium  
**Description**: Conversation history resets on container restart, breaking context continuity.

**Options**:
1. SQLite database in mounted volume
2. JSON file in session directory
3. Redis for distributed setup

**Tasks**:
- [ ] Design conversation storage schema (message, role, timestamp, chat_id)
- [ ] Implement storage adapter interface
- [ ] Add SQLite backend as default implementation
- [ ] Migrate in-memory history to storage adapter
- [ ] Add conversation pruning (by date or count limit)
- [ ] Add `/reset` command to clear history manually

**Acceptance Criteria**:
- Conversation history survives bot restarts
- History automatically prunes to prevent unbounded growth
- User can manually reset conversation context

---

### REL-001: Ollama Health Check & Auto-Reconnect
**Status**: 🟡 Open  
**Effort**: Small  
**Description**: If Ollama container restarts, bot doesn't recover automatically.

**Tasks**:
- [ ] Implement retry logic with exponential backoff
- [ ] Add health check endpoint polling before requests
- [ ] Log connection state changes
- [ ] Send notification to user when connection lost/restored

**Acceptance Criteria**:
- Bot automatically reconnects after Ollama restarts
- User gets notification when service is temporarily unavailable
- Logs clearly show connection state transitions

---

### UX-001: Bot Commands System
**Status**: 🟡 Open  
**Effort**: Medium  
**Description**: Add Telegram-style commands for bot control.

**Proposed Commands**:
- `/help` - Show available commands
- `/reset` - Clear conversation history
- `/model <name>` - Switch model dynamically
- `/status` - Show bot status (model, history length, uptime)
- `/export` - Export conversation history
- `/system <prompt>` - Change system prompt temporarily

**Tasks**:
- [ ] Implement command parser
- [ ] Add command handler registry
- [ ] Implement each command handler
- [ ] Update documentation with command list
- [ ] Add help text for each command

**Acceptance Criteria**:
- Commands work in group chats
- Help command shows all available commands
- Commands provide feedback on success/failure

---

### UX-002: Streaming Responses
**Status**: 🟡 Open  
**Effort**: Medium  
**Description**: Show responses as they're generated (like ChatGPT) instead of waiting for completion.

**Tasks**:
- [ ] Switch Ollama API call to use `"stream": true`
- [ ] Implement SSE response parsing with httpx
- [ ] Edit message incrementally as tokens arrive
- [ ] Handle Telegram rate limits (edit throttling)
- [ ] Add "..." indicator while streaming

**Acceptance Criteria**:
- User sees response being typed in real-time
- Telegram rate limits are respected
- Error handling works for interrupted streams

---

## 🟢 Medium Priority

### CODE-001: Add Type Hints
**Status**: 🟢 Open  
**Effort**: Small  
**Description**: Improve code maintainability with comprehensive type hints.

**Tasks**:
- [ ] Add type hints to all function signatures
- [ ] Add return type annotations
- [ ] Use `typing` module for complex types (Dict, List, Optional)
- [ ] Add mypy to development dependencies
- [ ] Configure mypy in `pyproject.toml`
- [ ] Fix all mypy errors

**Acceptance Criteria**:
- All functions have complete type annotations
- `mypy --strict` passes without errors
- CI runs mypy checks

---

### CODE-002: Error Handling Improvement
**Status**: 🟢 Open  
**Effort**: Small  
**Description**: Replace broad exception handling with specific error types.

**Tasks**:
- [ ] Identify specific exceptions (httpx errors, Telethon errors)
- [ ] Create custom exception classes for domain errors
- [ ] Replace `except Exception` with specific handlers
- [ ] Add structured logging with error context
- [ ] Implement error recovery strategies per error type

**Acceptance Criteria**:
- No bare `except:` or overly broad exception handlers
- Logs include useful context for debugging
- Different error types have appropriate recovery behavior

---

### CODE-003: Configuration Management
**Status**: 🟢 Open  
**Effort**: Medium  
**Description**: Move hardcoded values to configuration system.

**Tasks**:
- [ ] Create `config.py` module with dataclasses
- [ ] Move all constants to config (MAX_HISTORY_MESSAGES, etc.)
- [ ] Support YAML/TOML config file (optional, overrides env vars)
- [ ] Add config validation with pydantic
- [ ] Document all configuration options in README

**Acceptance Criteria**:
- No magic numbers/strings in main.py
- Configuration is centralized and documented
- Config validation fails fast with helpful errors

---

### CODE-004: Add Logging Framework
**Status**: 🟢 Open  
**Effort**: Small  
**Description**: Replace print statements with structured logging.

**Tasks**:
- [ ] Configure Python logging module
- [ ] Add log levels (DEBUG, INFO, WARNING, ERROR)
- [ ] Add log formatting with timestamps
- [ ] Log to file in addition to stdout
- [ ] Add LOG_LEVEL environment variable
- [ ] Add correlation IDs for request tracing

**Acceptance Criteria**:
- All output uses logging instead of print
- Logs are structured and filterable
- Log level configurable via environment variable

---

### TEST-001: Unit Tests
**Status**: 🟢 Open  
**Effort**: Medium  
**Description**: Add unit tests for core functionality.

**Tasks**:
- [ ] Add pytest to dev dependencies
- [ ] Create `tests/` directory structure
- [ ] Mock Ollama API responses
- [ ] Mock Telethon client
- [ ] Test conversation history management
- [ ] Test command parsing
- [ ] Test error handling paths
- [ ] Add coverage reporting

**Acceptance Criteria**:
- Core logic has >80% test coverage
- Tests run in CI
- Mocks isolate unit tests from external dependencies

---

### TEST-002: Integration Tests
**Status**: 🟢 Open  
**Effort**: Medium  
**Description**: Test bot with real Ollama and mock Telegram.

**Tasks**:
- [ ] Create test docker-compose with test containers
- [ ] Use Telethon's test mode or mock server
- [ ] Test full message flow end-to-end
- [ ] Test error scenarios (Ollama down, network issues)
- [ ] Test session persistence
- [ ] Test model switching

**Acceptance Criteria**:
- Integration tests validate full stack
- Tests can run in CI environment
- Tests cover happy path and error scenarios

---

### FEAT-001: Multi-Model Support
**Status**: 🟢 Open  
**Effort**: Medium  
**Description**: Allow switching between multiple models without rebuild.

**Tasks**:
- [ ] Preload multiple models in model-init (configurable list)
- [ ] Add model registry/catalog in config
- [ ] Implement `/model` command to switch at runtime
- [ ] Store current model per chat
- [ ] Show current model in status command
- [ ] Add model-specific system prompts

**Acceptance Criteria**:
- User can switch models with a command
- No rebuild required to add new models
- Model choice persists across restarts

---

### FEAT-002: Conversation Export
**Status**: 🟢 Open  
**Effort**: Small  
**Description**: Export conversation history in various formats.

**Tasks**:
- [ ] Implement `/export` command
- [ ] Support JSON format export
- [ ] Support Markdown format export
- [ ] Send as Telegram file attachment
- [ ] Add date range filtering
- [ ] Sanitize/anonymize if needed

**Acceptance Criteria**:
- User can export full conversation history
- Export includes timestamps and metadata
- File sent via Telegram

---

### FEAT-003: Usage Tracking & Rate Limiting
**Status**: 🟢 Open  
**Effort**: Medium  
**Description**: Track API usage and implement rate limiting.

**Tasks**:
- [ ] Add metrics collection (message count, tokens, latency)
- [ ] Implement rate limiter (messages per minute/hour)
- [ ] Add usage statistics command
- [ ] Store metrics in database
- [ ] Add Prometheus metrics endpoint (optional)
- [ ] Alert user when rate limit approached

**Acceptance Criteria**:
- Bot tracks usage metrics
- Rate limiting prevents abuse
- User can view their usage statistics

---

### FEAT-004: Context Injection
**Status**: 🟢 Open  
**Effort**: Medium  
**Description**: Allow injecting documents/links as additional context.

**Tasks**:
- [ ] Detect URLs in messages
- [ ] Fetch and extract URL content
- [ ] Support file uploads (PDF, TXT)
- [ ] Parse documents and add to context
- [ ] Add `/context` command to manage injected context
- [ ] Implement context expiry/cleanup

**Acceptance Criteria**:
- Bot can read URLs shared in chat
- Uploaded documents are processed and used as context
- Context can be reviewed and cleared

---

## 🔵 Low Priority

### DOC-001: Architecture Diagrams
**Status**: 🔵 Open  
**Effort**: Small  
**Description**: Add visual diagrams for architecture and data flow.

---

### DOC-002: API Documentation
**Status**: 🔵 Open  
**Effort**: Small  
**Description**: Document internal APIs and extension points.

---

### DEVOPS-001: CI/CD Pipeline
**Status**: 🔵 Open  
**Effort**: Medium  
**Description**: Automate testing and deployment.

---

### DEVOPS-002: Development Environment
**Status**: 🔵 Open  
**Effort**: Small  
**Description**: Improve local development experience with hot reload and pre-commit hooks.

---

### DEVOPS-003: Monitoring & Observability
**Status**: 🔵 Open  
**Effort**: Large  
**Description**: Add production monitoring capabilities with Prometheus/Grafana.

---

### PERF-001: GPU Acceleration
**Status**: 🔵 Open  
**Effort**: Large  
**Description**: Enable GPU support for faster inference.

---

### PERF-002: Response Caching
**Status**: 🔵 Open  
**Effort**: Medium  
**Description**: Cache responses to identical questions.

---

### PERF-003: Parallel Request Handling
**Status**: 🔵 Open  
**Effort**: Medium  
**Description**: Handle multiple concurrent requests efficiently.

---

## 🎯 Future Ideas

- Voice Message Support (Whisper integration)
- Image Analysis (LLaVA vision models)
- Multi-Language Support & Translation
- Conversation Summaries
- Scheduled Messages
- Plugin System
- Web Interface
- Mobile App
- Voice Responses (TTS)
- Sentiment Analysis
- Knowledge Base Integration (RAG)
- Multi-User Support
- Federation
- Blockchain Integration

---

## 📊 Statistics

**Open items**: 25 — 1 critical · 4 high · 9 medium · 8 low, plus future ideas  
**Shipped**: see [`changelogs/features-shipped-history.md`](changelogs/features-shipped-history.md)

---

**Last Updated**: 2026-09-03  
**Status**: Production v1.0
