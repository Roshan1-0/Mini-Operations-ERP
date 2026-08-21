# Mini Operations ERP — Coding Standards

## Architecture
- Routes: connect HTTP endpoints to middleware + controllers only
- Controllers: read request → validate → call service → return response
- Services: all business logic, DB queries, transaction boundaries
- Models: Drizzle schema definitions only
- Middleware: auth, role checks, validation, error handling

## Code Style
- ES modules (import/export)
- async/await only
- Descriptive variable names
- Short focused functions
- Comments only for business behavior
- No one-letter variables except trivial loops

## API Responses
Success: { success: true, message: '...', data: ... }
Error: { success: false, message: '...' }

## Critical Rules
- NEVER trust frontend quantities for availability checks
- ALWAYS use atomic DB updates for inventory mutations under concurrency
- ALWAYS use transactions for multi-step business operations
- NEVER put business logic in React components
- NEVER put DB queries in controllers
- NEVER enforce authorization only on frontend

## DO NOT
- Negative inventory (DB constraint + service check)
- Trust frontend calculated available quantities
- Allow status transitions out of order
- Receive same transfer twice
- Reserve above available inventory
- Use floating point for stock quantities (integers only)
- Create microservices, message queues, event buses
- Add features not in the case study spec
- Import axios directly in React components
