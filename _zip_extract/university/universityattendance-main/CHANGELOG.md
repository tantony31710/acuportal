# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- GitHub Actions CI/CD workflows (lint, test, deploy)
- Pull request template with comprehensive checklist
- Contributing guidelines with code style standards
- Issue templates (bug reports and feature requests)
- Project plan and development roadmap
- Changelog documentation

### Changed
- Enhanced development workflow guidelines
- Improved project structure documentation

### Infrastructure
- Created GitHub Actions workflows for automated testing
- Added linting and build verification pipeline
- Added security audit workflow
- Added production deployment configuration

## [1.0.0] - 2026-06-04

### Initial Release

#### Added
- Core attendance system with PIN-based check-in
- Real-time session management
- Admin dashboard with live statistics
- Student roster management
- Flag detection for proxy attempts
- Group-based session targeting
- Local data persistence
- Responsive UI with Tailwind CSS and Radix components
- Error handling and validation
- Type-safe development with TypeScript

#### Features
- **Student Features**
  - Check-in with 4-digit PIN
  - Real-time session status
  - Attendance confirmation

- **Teacher Features**
  - Start/close attendance sessions
  - Set group targeting
  - Configure session duration
  - View active attendees

- **Admin Features**
  - View all sessions
  - Monitor flagged submissions
  - Generate reports
  - Manage user access

#### Technical
- React 19 with TypeScript
- TanStack Router for navigation
- TanStack Query for state management
- Tailwind CSS for styling
- Radix UI for accessible components
- Vite for build tooling
- Bun as runtime/package manager

---

## Version Format

- **Major**: Breaking changes
- **Minor**: New features (backward compatible)
- **Patch**: Bug fixes

## How to Update This File

When making a PR:
1. Add your changes under `[Unreleased]`
2. Use these categories: Added, Changed, Deprecated, Removed, Fixed, Security
3. Link issues with `#123`
4. Release maintainers will create a new version section

## Release Schedule

- **Patch releases**: As needed for critical fixes
- **Minor releases**: Monthly or as features complete
- **Major releases**: Quarterly or for significant changes
