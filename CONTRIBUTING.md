# Contributing to MonoStart

Thanks for your interest in improving MonoStart! Contributions of all kinds —
bug reports, feature ideas, docs, and code — are welcome.

> [!IMPORTANT]
> **Licensing of contributions.** MonoStart is **source-available** under the
> [PolyForm Noncommercial License 1.0.0](LICENSE). By submitting a contribution — an
> issue, pull request, code, documentation, or any other material — you agree to **all**
> of the following:
>
> 1. **Project license.** Your contribution is licensed to the public, as part of
>    MonoStart, under the PolyForm Noncommercial License 1.0.0 (or any later version of
>    that license the project adopts).
> 2. **Grant to the maintainer.** You **additionally** grant **Paurush Rai** (the
>    copyright holder and project maintainer) a perpetual, worldwide, non-exclusive,
>    royalty-free, irrevocable, sublicensable, and transferable license to use, reproduce,
>    modify, distribute, publicly display and perform, and otherwise exploit your
>    contribution **for any purpose, including commercial purposes**, and to relicense it
>    under different terms. This lets MonoStart be offered commercially or under
>    alternative licenses without having to track down every contributor.
> 3. **You keep your rights.** You retain copyright in your contribution and remain free
>    to use it elsewhere however you wish. The grant above is **in addition to** — not
>    instead of — your own rights.
> 4. **Originality & authority.** You confirm the contribution is your original work (or
>    that you otherwise have the right to submit it under these terms), and that, to your
>    knowledge, it does not infringe any third party's rights. If your employer holds
>    rights to work you create, you confirm you have permission to contribute it.
>
> If you cannot agree to these terms, please do not submit a contribution. These terms
> keep the project free for noncommercial use while preserving the maintainer's ability
> to sustain it commercially.

## Code of conduct

Be respectful, constructive, and patient. Assume good intent, keep discussion focused
on the work, and help keep this a welcoming space for everyone. Harassment or abusive
behavior will not be tolerated.

## Ways to contribute

- 🐛 **Report a bug** — open an issue with clear steps to reproduce.
- 💡 **Suggest a feature** — open an issue describing the problem it solves.
- 📖 **Improve docs** — fix typos, clarify setup, add examples.
- 🛠️ **Submit code** — fix a bug or build a feature (ideally tied to an open issue).

For anything large, please **open an issue first** to align on the approach before
investing time in a PR.

## Reporting bugs

Open a [GitHub issue](https://github.com/paurushrai/monostart-chrome-extension/issues)
and include:

- **What happened** vs. **what you expected**.
- **Steps to reproduce** (be specific).
- Your **Chrome version** and **OS**.
- Screenshots or console output if relevant (`chrome://extensions` → _Inspect views_).

> For **security vulnerabilities**, do **not** open a public issue — report it
> privately via [GitHub Security Advisories](https://github.com/paurushrai/monostart-chrome-extension/security/advisories/new)
> or email **paurushrai96@gmail.com**.

## Development setup

Requires **Node.js 22+**.

```bash
git clone https://github.com/paurushrai/monostart-chrome-extension.git
cd monostart-chrome-extension
npm install
npm run build        # outputs to dist/
```

Load the unpacked extension: `chrome://extensions` → enable **Developer mode** →
**Load unpacked** → select the `dist/` folder. Use `npm run watch` to rebuild on
change, then reload the extension to see updates.

See the [README](README.md#development) for the full script list.

## Quality gates

Every PR must pass these before review:

```bash
npm run lint        # ESLint — zero errors
npm run typecheck   # tsc --noEmit (strict mode)
npm test            # Vitest — all green
```

## Coding standards

- **TypeScript, strict.** No `any`, no non-null assertions (`!`); add explicit return
  types on exports.
- **Keep it small.** Prefer focused functions and files; extract duplicated logic.
- **Pure logic in `src/lib/`** with unit tests in `src/lib/__tests__/`. UI in
  `src/components/`, shared hooks in `src/hooks/`.
- **Naming.** `camelCase` for values/functions, `PascalCase` for types/components,
  booleans read as `is`/`has`/`can`/`should`. No cryptic abbreviations.
- **Comments explain _why_,** not _what_. Document public APIs.
- **Security.** Validate external input, sanitize any rendered HTML (we use DOMPurify
  for embeds), never hardcode secrets.

## Testing

- We use **[Vitest](https://vitest.dev)**. Add tests for new logic — happy path, edge
  case, and failure case.
- Keep tests **deterministic**: mock time, randomness, and network.
- Name tests by behavior, e.g. `should place link in next free cell when grid is full`.

## Commit messages

Use [Conventional Commits](https://www.conventionalcommits.org): `type(scope): summary`.

```text
feat(widgets): add custom color picker to sticky notes
fix(search): debounce autocomplete requests
docs(readme): clarify unpacked install steps
```

Common types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `style`.

## Pull requests

The `main` branch is **protected** — direct pushes, force pushes, and branch deletion
are blocked. All changes land through a pull request from a fork.

1. **Fork** the repo and create a branch: `feat/short-description` or `fix/short-description`.
2. Make your change; keep the PR **focused** on a single concern.
3. Ensure all [quality gates](#quality-gates) pass.
4. Open the PR with a clear description of **what** changed, **why**, and **how to test** it.
5. Link any related issue (e.g. `Closes #12`).
6. Confirm you agree to the [contribution terms](#contributing-to-monostart) above
   (project license + grant to the maintainer). Opening a PR is taken as your agreement.

A maintainer will review as soon as possible. Thanks for contributing! 🙌
