# Thinknine Process Intelligence
## AI Development Guide (AGENTS.md)

Version: 2.0

---

# Purpose

This file defines how AI agents and developers should work in the Thinknine Process Intelligence project.

The objective is to maintain a high-quality, maintainable and scalable codebase while continuously improving the product.

Every implementation should align with the architectural vision rather than simply solving the requested task.

---

# Product Vision

Thinknine Process Intelligence is an AI-assisted platform for documenting, reviewing and improving Microsoft Dynamics 365 Business Central processes.

The product is intended for:

- Business Central consultants
- Solution architects
- Implementation partners
- Key users
- Customers

The platform should eventually support the complete lifecycle:

Record

↓

Review

↓

Improve

↓

Generate Documentation

↓

Create Knowledge

↓

Reuse Knowledge

↓

Continuous Process Improvement

The product is NOT a click recorder.

It is a Business Process Intelligence platform.

---

# Product Modules

The system consists of five primary modules.

## Recorder

Captures user interaction.

Responsible only for recording.

Never responsible for documentation.

---

## Review Studio

The primary workspace.

Users spend most of their time here.

Responsibilities

- edit
- merge
- split
- reorder
- annotate
- validate

Every UX improvement should primarily target Review Studio.

---

## Document Generator

Responsible for producing

- Word
- PDF
- HTML (future)

Must never contain duplicated formatting logic.

Filename generation, metadata and styling should be shared.

---

## Knowledge Base

Stores reusable process knowledge.

Should eventually recognize similar processes.

Should never depend on Recorder.

---

## AI Assistant

Responsible for

- suggestions
- validation
- summarisation
- quality improvements

AI should support the user.

AI should never unexpectedly modify documentation.

---

# Architectural Principles

## Single Source of Truth

Business logic may only exist once.

Example:

Filename generation must be shared by

Preview

Word

PDF

Workspace

ZIP

Never duplicate algorithms.

---

## Separation of Concerns

UI

↓

Application logic

↓

Business logic

↓

Persistence

Do not mix these responsibilities.

---

## Reuse before creating

Always search the project before introducing

- new helper functions
- new utility classes
- new services

Avoid duplicate functionality.

---

## Generated Files

Never manually edit

dist/

Generated code should only be modified through source files.

---

# Folder Responsibilities

src/

Application source.

tests/

Behaviour and regression tests.

docs/

Architecture.

.github/

Automation.

dist/

Generated output.

---

# UI Principles

The UI should feel like a professional desktop application.

Prioritize

clarity

speed

consistency

discoverability

Avoid

hidden actions

unexpected dialogs

modal overload

The most common workflow should require the fewest clicks.

---

# Accessibility

Every new UI component should support

keyboard navigation

semantic HTML

ARIA labels

ARIA descriptions

screen readers

visible focus

Never sacrifice accessibility for appearance.

---

# Business Central Principles

Never assume captions are unique.

Prefer

IDs

stable identifiers

internal references

Support

Business Central

Aptean Food & Beverage

Future extensions.

---

# Filename Engine

One implementation only.

Preview

↓

Word

↓

PDF

↓

ZIP

↓

Workspace

must always use the same engine.

Never create a second implementation.

---

# Export Principles

Export should only define

destination

format

Everything else should be shared.

---

# Word Generator

Use the docx library.

Never manually generate OpenXML.

Preserve

image aspect ratio

styles

metadata

headers

footers

future compatibility

---

# Coding Standards

Prefer

small functions

pure functions

composition

clear names

Avoid

magic strings

magic numbers

deep nesting

large functions

duplicated logic

---

# Naming

Names should describe intent.

Avoid abbreviations.

Examples

generateFilename()

better than

genFile()

---

# Comments

Explain WHY.

Avoid explaining WHAT.

Good code should explain itself.

---

# Error Handling

Fail gracefully.

Never silently ignore errors.

Provide actionable messages.

---

# Performance

Prefer incremental updates.

Avoid unnecessary DOM manipulation.

Avoid repeated storage writes.

Avoid unnecessary re-rendering.

---

# Testing Strategy

Every bug becomes a regression test.

Prefer behaviour tests.

Examples

GOOD

click button

↓

preview changes

BAD

checking if a string exists

Test behaviour.

Not implementation.

---

# Definition of Done

A feature is complete only if

✓ implementation complete

✓ architecture respected

✓ no duplicated logic

✓ tests updated

✓ lint passes

✓ build passes

✓ README updated

✓ CHANGELOG updated

✓ accessibility reviewed

✓ self-review completed

---

# Feature Size Policy

Implement features in small, reviewable increments.

Rules

- A Release Candidate (RC) should normally require no more than 2–3 hours of implementation.
- If a feature requires significant changes across many files, split it into multiple RCs.
- Every RC should be independently buildable and testable.
- Every RC should leave the project in a releasable state.
- Prefer many small commits over one large commit.

Each RC should have:

- a clearly defined goal
- behaviour tests
- updated documentation
- successful lint
- successful build
- successful regression tests

Do not start implementing the next RC until the current RC has been reviewed and accepted.

---

# AI Self Review

Before finishing any task the AI should review

architecture

duplication

regressions

dead code

accessibility

performance

security

edge cases

Report findings honestly.

---

# Pull Request Checklist

Before considering work complete verify

README

CHANGELOG

Version

Manifest

Tests

Build

Lint

Release Notes

---

# Security

Never expose

API keys

tokens

personal information

local file paths

Never reduce browser security.

---

# Long-Term Roadmap

Current priorities

4.1.x

Export UX

4.2.x

Review Studio Professional

4.3.x

Workspace

4.4.x

Professional PDF Generator

4.5.x

Knowledge Packs

5.0

AI Process Intelligence

All architectural decisions should support this roadmap.

---

# AI Behaviour

When implementing features

Think first.

Understand existing architecture.

Reuse existing code.

Avoid introducing technical debt.

Prefer maintainability over cleverness.

When uncertain

explain assumptions

instead of inventing behaviour.

Never claim code has been executed unless it actually has.

Never claim tests passed unless they have actually been run.

Never fabricate build results.

Always distinguish between

implemented

proposed

recommended

---

# Quality Philosophy

Correctness

↓

Maintainability

↓

User Experience

↓

Performance

↓

Developer Convenience

If trade-offs exist, follow this order.

---

# Final Principle

Every commit should leave the codebase in a better state than before.