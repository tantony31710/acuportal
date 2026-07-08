# Master Implementation Plan: Acuportal 4-Track Evolution

This plan covers the massive overhaul requested, encompassing all tracks (Data, AI, Dev, Infra, Security, UX) in three prioritized batches.

## Status: IN PROGRESS

## Batch A: Infrastructure, Security & Auth (Foundations)
*   **Target**: RLS Enforcement, Auth, CI/CD.
*   **Tasks**:
    *   [ ] Audit all tables for RLS enablement.
    *   [ ] Refactor `src/lib/auth.ts` for robust session handling.
    *   [ ] Enhance `.github/workflows/` for reliable CI/CD.
*   **Verification**: Comprehensive test suites for Auth and RLS.

## Batch B: Data & AI Pipeline Optimization
*   **Target**: Schema hardening, AI-Agent integration.
*   **Tasks**:
    *   [ ] Optimize Supabase schema (indexes, types).
    *   [ ] Implement initial RAG pipeline for attendance insights.
*   **Verification**: Pipeline integration tests.

## Batch C: UX/UI & Performance Overhaul
*   **Target**: Component modernization, performance.
*   **Tasks**:
    *   [ ] Component refactoring to reusable patterns.
    *   [ ] State management modernization (Zustand).
*   **Verification**: Component unit tests and Lighthouse scores.
