# Contributing to GreenMiles

Thanks for your interest in contributing! 🌱

## Getting set up

```bash
git clone https://github.com/TakamiyaHaruka/greenmiles.git
cd greenmiles
npm install
cp .env.local.example .env.local   # then set JWT_SECRET
npm run dev
```

The SQLite database is created and seeded automatically on first run.
Test account: `test@greenmiles.com` / `password123`.

## Before you open a PR

```bash
npm run lint   # must pass
npm test       # must pass
npm run build  # must succeed
```

Please add or update tests when you change business logic
(carbon calculation, auth, cart/settlement, API handlers).

## Guidelines

- **Commits** — use [Conventional Commits](https://www.conventionalcommits.org/)
  (`feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:` …).
- **Scope** — keep PRs focused; one concern per PR is easiest to review.
- **UI language** — the interface is in Chinese; keep new UI copy consistent
  with existing wording.
- **Style** — match the existing code style; ESLint + Prettier defaults of the
  Next.js scaffold apply.

## Reporting bugs / suggesting features

Open an [issue](https://github.com/TakamiyaHaruka/greenmiles/issues) using the
bug or feature template. Include steps to reproduce, expected vs. actual
behavior, and your Node.js version.

## License

By contributing, you agree that your contributions will be licensed under the
[MIT License](LICENSE).
