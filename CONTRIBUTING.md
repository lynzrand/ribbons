# Contributing

Follow the [local setup](README.md#run-locally) to install dependencies and start the playground. The Vue app lives in `src/`; the sampler, color conversions, and layouts live in `packages/ribbon-core/src/`.

## Checks

```sh
pnpm test
pnpm build
pnpm format:check
```

Use `pnpm format` to apply the project's formatting.

## Visual previews

Regenerate the README layout comparison and context illustrations:

```sh
pnpm build:lib
node --experimental-strip-types scripts/readme-previews.ts
```

The script writes `docs/avatars.svg` and `docs/contexts.svg` using the core library's palette and layout functions. Keep the same colors and weights across styles, and place ribbons near the top or bottom of UI and label mockups.

## Sampling studies

```sh
pnpm study
pnpm ablate
```

The ribbon study writes SVG comparisons into `artifacts/`. The ablation runner compares individual sampling contributions with matched seeds and writes results to the system temporary directory, outside the repository.

## Deployment

[GitHub Pages](.github/workflows/pages.yml) builds and deploys the playground on pushes to `main`. Its workflow runs formatting checks, tests, and a production build before deployment.
