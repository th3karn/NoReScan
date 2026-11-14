# UNIVERSAL POLYGLOT ECOSYSTEM SUPPORT
## Supported Languages, Package Managers, and Toolchains

BugBrain is designed from the ground up as a universal, multi-language codebase intelligence platform supporting 31 programming languages and their respective ecosystems.

---

## 1. Supported Languages & Tiers

| Tier | Language | Manifests & Lockfiles | Build & Package Tools | Detection Strategy |
| :--- | :--- | :--- | :--- | :--- |
| **P0** | **TypeScript / JavaScript** | `package.json`, `pnpm-lock.yaml`, `package-lock.json`, `yarn.lock`, `bun.lockb` | npm, pnpm, yarn, bun | `.ts`, `.tsx`, `.js`, `.jsx`, `.mjs`, `package.json` |
| **P0** | **Python** | `requirements.txt`, `pyproject.toml`, `Pipfile`, `poetry.lock` | pip, uv, poetry, venv | `.py`, `.pyi`, `requirements.txt`, `pyproject.toml` |
| **P0** | **Rust** | `Cargo.toml`, `Cargo.lock` | cargo, rustc, crates.io | `.rs`, `Cargo.toml` |
| **P0** | **Go** | `go.mod`, `go.sum`, `go.work` | go CLI, go modules | `.go`, `go.mod` |
| **P1** | **Java & Kotlin** | `pom.xml`, `build.gradle`, `build.gradle.kts` | Maven (`mvnw`), Gradle (`gradlew`) | `.java`, `.kt`, `.kts`, `pom.xml`, `build.gradle` |
| **P1** | **C# / .NET** | `*.csproj`, `*.sln`, `packages.lock.json` | dotnet CLI, NuGet | `.cs`, `*.csproj` |
| **P1** | **PHP** | `composer.json`, `composer.lock` | Composer, Packagist | `.php`, `composer.json` |
| **P1** | **Ruby** | `Gemfile`, `Gemfile.lock` | Bundler, RubyGems | `.rb`, `Gemfile` |
| **P1** | **Dart & Flutter** | `pubspec.yaml`, `pubspec.lock` | pub, flutter CLI | `.dart`, `pubspec.yaml` |
| **P2** | **C / C++** | `CMakeLists.txt`, `vcpkg.json`, `Makefile` | CMake, Make, vcpkg | `.c`, `.cpp`, `.h`, `.hpp`, `CMakeLists.txt` |
| **P2** | **Swift** | `Package.swift` | Swift Package Manager (SPM) | `.swift`, `Package.swift` |
| **P2** | **Elixir & Erlang** | `mix.exs`, `mix.lock` | Mix, Hex | `.ex`, `.exs`, `.erl`, `mix.exs` |
| **P2** | **Zig** | `build.zig`, `build.zig.zon` | zig build | `.zig`, `build.zig` |
| **P2** | **Haskell** | `package.yaml`, `*.cabal` | Cabal, Stack | `.hs`, `*.cabal` |
| **P3** | **Lua** | Rockspec | Luarocks | `.lua` |
| **P3** | **R** | `DESCRIPTION` | renv, CRAN | `.r`, `.R` |
| **P3** | **Julia** | `Project.toml` | Pkg | `.jl`, `Project.toml` |
| **P3** | **Perl** | `cpanfile`, `Makefile.PL` | cpanm | `.pl`, `.pm` |
| **P3** | **Scala** | `build.sbt` | sbt | `.scala`, `build.sbt` |
| **P3** | **Clojure** | `deps.edn`, `project.clj` | Leiningen, Clojure CLI | `.clj`, `.cljs` |
| **Core** | **Shell & Scripts** | `*.sh`, `*.bash`, `*.zsh`, `*.ps1` | sh, bash, powershell | Scripts & CLI automation |
| **Core** | **SQL & Markup** | `*.sql`, `*.html`, `*.css` | Database & Web | Static frontend & migrations |

---

## 2. Command Intelligence

BugBrain automatically parses package manifests and project files to extract safe-to-run development commands:
- **Build commands:** `npm run build`, `cargo build`, `go build`, `mvn package`, `dotnet build`.
- **Test commands:** `npm test`, `cargo test`, `go test`, `pytest`, `mvn test`.
- **Lint commands:** `npm run lint`, `cargo clippy`, `golangci-lint`, `ruff check`.
- **Dev commands:** `npm run dev`, `cargo run`, `fastapi dev`, `python manage.py runserver`.

### Security Policy & Safe Command Runner
Every command executed via `bugbrain run <cmd>` or MCP `execute_command` passes through the `SafeCommandRunner` security policy:
- **Permanently Blocked:** Arbitrary pipe-to-shell patterns (`curl | sh`, `wget | bash`), fork bombs, recursive filesystem destruction (`rm -rf /`), destructive disk operations.
- **Pre-flight Inspection:** Commands declare working directories, network requirements, and side effects.

