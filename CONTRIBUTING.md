# Contributing to RepoMind

Thank you for your interest in contributing to RepoMind! We welcome contributions from developers, researchers, and open-source enthusiasts.

## Development Setup

1. **Prerequisites:**
   - Node.js 22+ (LTS or Current)
   - pnpm 9+ (`npm install -g pnpm`)
   - Git

2. **Clone & Install:**
   ```bash
   git clone https://github.com/LostGit/repomind.git
   cd repomind
   pnpm install
   ```

3. **Build All Packages:**
   ```bash
   pnpm build
   ```

4. **Run Tests:**
   ```bash
   pnpm test
   ```

## Development Guidelines

- **Strict Type Safety:** All code must pass `pnpm typecheck` with TypeScript strict mode enabled.
- **Zero Hallucinated Metrics:** Never introduce mocked or hardcoded metrics into production reports.
- **Security First:** Never weaken path containment assertions (`assertPathContained`) or secret exclusions (`isSensitivePath`).
- **Tests Alongside Features:** Every new feature or parser must include corresponding unit and integration tests under `test/`.

## Pull Request Process

1. Fork the repository and create a feature branch (`git checkout -b feature/my-feature`).
2. Write unit tests covering your changes.
3. Ensure all tests and type checks pass (`pnpm build && pnpm test`).
4. Commit your changes using conventional commit messages (`feat: ...`, `fix: ...`, `docs: ...`).
5. Open a pull request against the `main` branch.
