# HireTrack Documentation Pack

This folder contains the baseline project documentation for HireTrack, a
single-college MERN placement management system.

## Documents

1.  `PRD.md` --- product vision, goals, scope, users and functional
    priorities.
2.  `SRS.md` --- detailed software requirements and use cases.
3.  `ARCHITECTURE.md` --- system architecture, request flow and
    deployment topology.
4.  `TECH_STACK.md` --- technology decisions, dependencies and
    environment variables.
5.  `DATABASE_SCHEMA.md` --- MongoDB collections, fields, indexes and
    relationships.
6.  `API_DOCUMENTATION.md` --- REST endpoint contracts and request
    examples.
7.  `UI_UX_GUIDELINES.md` --- visual direction, navigation, components
    and accessibility.
8.  `DEVELOPMENT_ROADMAP.md` --- 24-hour implementation plan and
    prioritized backlog.
9.  `TESTING.md` --- test strategy, critical cases and release criteria.
10. `AGENTS.md` --- instructions for AI coding agents and contributors.

## Project baseline

-   **Product:** HireTrack
-   **Scope:** Single college for MVP
-   **Roles:** Student, Recruiter, Placement Admin
-   **Stack:** MongoDB, Express.js, React.js, Node.js
-   **Architecture:** React SPA + modular Express API + MongoDB
-   **Delivery:** 24-hour MVP sprint
-   **Future direction:** Multi-college support

## How to use these documents

Treat the PRD and SRS as the requirements baseline. Use the architecture
and schema to guide implementation. Keep API contracts synchronized with
backend routes. Follow the roadmap in priority order and use the testing
checklist before the demo.

The 24-hour estimate is a focused MVP target, not a guarantee that every
Should-have feature will be completed. Protect the core workflow first:
admin approves recruiter → recruiter publishes job → student applies →
recruiter updates status → student tracks status.
