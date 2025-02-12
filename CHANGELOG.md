# launch3d

## 0.3.0

### Minor Changes

- 840286c: Update Shadcn components to React19
- f3af812:
  - Upgrade to Next 15
  - React 19
  - Async dynamic API calls (e.g. `headers` and `cookies`)
  - Upgrade `next-auth`
  - Move `next.config` to ts
  - Eslint 9, move to `esling.config.mjs`
  - Upgrade to `pnpm@10`

### Patch Changes

- 2a32aa6: fix create ~/.ssh files bug, based on wrong error codes.
- 8b71b8a: fix typo in CLASS_PATH variable name to match template name.

## 0.2.6

### Patch Changes

- Add slurm partition+account association when querying available partitions for the user and submitting jobs

## 0.2.5

### Patch Changes

- f85d58c: Submit username as env variable to annotat3d container.

## 0.2.4

### Patch Changes

- Stop sharing SSH cached connections between user sessions and better check if connection still alive before using from cache

## 0.2.3

### Patch Changes

- Update annotat3d job submission to use ssh session connection

## 0.2.2

### Patch Changes

- Add TTL cache to store SSH sessions

## 0.2.1

### Patch Changes

- Fixing cuda checks in job script and small fixes on form placeholder.

## 0.2.0

### Minor Changes

- 9534beb: Test Release CI
- New form components for navigating and selecting input files for the remote job and better job status management on "view" component.
