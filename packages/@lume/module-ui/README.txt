Shared module UI

src/modules/<feature>/static/ owns the Vue views, components, widgets, styles
and browser API adapters used by apps/web-lume and apps/riagri-website.
The static subdirectory is retained during migration to preserve relative imports.
Third-party UI dependencies are supplied by the consuming application; its Vite,
Nuxt and TypeScript configurations resolve them explicitly.

This package contains no backend controllers or services. New browser assets belong
here, not in backend source. Temporary symlinks from backend/src/modules/*/static
preserve the legacy application's static-file paths during migration. Remove them
when the standalone Express application is retired (migration task M17).

Checks are run through both consuming applications: typecheck, test and build.
See docs/nestjs-migration-tasks.txt for the current migration task list.
