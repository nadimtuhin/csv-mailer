# Contributing to CSV Mailer

Thank you for your interest in contributing! Here's how to get started.

## Development Setup

```bash
# Clone the repo
git clone https://github.com/nadimtuhin/csv-mailer
cd csv-mailer

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env
# Edit .env with your values

# Run database migrations
npx prisma migrate dev

# Start development server
npm run dev
```

## Running Tests

```bash
npm test
npm run test:watch   # watch mode
```

## Submitting Changes

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/my-feature`
3. Make your changes and add tests
4. Ensure tests pass: `npm test`
5. Ensure lint passes: `npm run lint`
6. Commit using conventional commits: `feat: add X`, `fix: resolve Y`, `docs: update Z`
7. Push and open a Pull Request against `main`

## Code Style

- TypeScript strict mode
- ESLint (config in `eslint.config.mjs`)
- Prettier for formatting

## Reporting Bugs

Open an issue using the Bug Report template. Include steps to reproduce, expected vs actual behaviour, and environment details.

## Security Issues

Do **not** open a public issue for security vulnerabilities. Email the maintainer directly or use GitHub's private security advisory feature.
