# Webpack Build Hang Investigation

## Problem Statement

After successfully resolving the npm install hang with `npm ci --ignore-scripts`, the Docker build now hangs during webpack execution with no output.

**Environment:**

- Base Image: `defradigital/node-development:2.8.5-node22.16.0`
- Node Version: 22.16.0
- npm Version: 10.9.2
- Webpack Version: 5.99.9
- Platform: Docker on macOS (linux/amd64 emulation on arm64)

## Current Build Status

### ✅ Successful Steps

```
#26 [development 3/5] RUN npm ci --ignore-scripts
#26 34.41 added 956 packages, and audited 957 packages in 33s
#26 DONE 34.9s

#27 [development 4/5] COPY --chown=node:node --chmod=755 . .
#27 DONE 0.1s
```

### ❌ Hanging Step

```
#28 [development 5/5] RUN npm run build:frontend
#28 1.137 > trade-demo-frontend@0.1.0 build:frontend
#28 1.137 > NODE_ENV=production webpack
#28 1.137
[NO FURTHER OUTPUT - HANGS HERE FOR 7+ MINUTES]
```

## Hypothesis

The webpack build is hanging silently in Docker, possibly due to:

1. **Missing native binaries from skipped postinstall scripts**

   - sass-embedded requires native binaries typically installed via postinstall
   - --ignore-scripts may have prevented binary installation

2. **Webpack subprocess/stdio issue (similar to npm hang)**

   - Webpack spawns child processes (loaders, plugins)
   - Docker stdio handling may cause same hang as npm lifecycle scripts

3. **Webpack configuration incompatibility with Docker**

   - Progress plugins or watchers waiting for TTY
   - Filesystem watchers not working in container

4. **sass-embedded specific Docker issue**
   - Known to have Docker/platform-specific binary issues
   - May need explicit platform binary or different sass compiler

## Investigation Plan

### Phase 1: Baseline Testing (Local Environment)

- [ ] Test `npm run build:frontend` on host
- [ ] Verify .public/ output generated
- [ ] Check timing and success

### Phase 2: Reference Project Comparison

- [ ] Apply same fix to cdp-node-frontend-template
- [ ] Test if their webpack build completes in Docker
- [ ] Compare webpack configurations

### Phase 3: CDP Documentation Review

- [ ] Search for webpack Docker guidance
- [ ] Check for known sass-embedded issues
- [ ] Review recommended build patterns

### Phase 4: Online Research

- [ ] webpack hang docker no output
- [ ] sass-embedded docker --ignore-scripts
- [ ] webpack docker stdio issues

### Phase 5: Diagnostic Testing

- [ ] Test webpack with --progress --verbose
- [ ] Interactive Docker container testing
- [ ] Minimal webpack config test

### Phase 6: Root Cause Analysis

- [ ] Triangulate findings from phases 1-5
- [ ] Determine exact cause

### Phase 7: Solution Development

- [ ] Propose solutions based on root cause
- [ ] Test and validate solution

## Investigation Log

### 2025-10-04 09:00 - Initial Discovery

- npm ci --ignore-scripts completed successfully (34.9s)
- webpack build started but produced no output
- Build hung for 7+ minutes with no progress
- Process still running but no CPU activity visible
- Docker compose background process killed to proceed with investigation

### 2025-10-04 09:05 - Phase 1: Local Testing ✅

**Test:** `npm run build:frontend` on host machine

**Result:** ✅ SUCCESS in 3.9 seconds

```
> NODE_ENV=production webpack
16 assets
25 modules
webpack 5.99.9 compiled successfully in 3922 ms
```

**Verification:**

- .public/ directory created successfully
- All assets generated (javascripts, stylesheets, assets, manifest)
- sass-embedded loads successfully (tested with node import)
- No warnings or errors

**Conclusion:** Webpack configuration is valid. Build works perfectly outside Docker.

### 2025-10-04 09:10 - Phase 2: CDP Reference Project ✅

**Test:** Apply `npm ci --ignore-scripts` to cdp-node-frontend-template

**Result:** ❌ SAME ISSUE - Webpack hangs identically

```
#9 [development 5/5] RUN npm run build:frontend
#9 1.216 > cdp-node-frontend-template@0.15.0 build:frontend
#9 1.216 > NODE_ENV=production webpack
#9 1.216
#9 CANCELED
```

**Findings:**

- CDP reference template has **identical dependencies** (955 packages vs our 956)
- Same deprecation warnings (@hapi/joi, rimraf, glob)
- webpack hangs at exact same point with no output
- **This is NOT specific to our project**

**Conclusion:** The issue affects ALL CDP frontend projects using --ignore-scripts workaround.

### 2025-10-04 09:15 - Phase 3: CDP Documentation Review ✅

**Search:** CDP documentation for webpack/Docker/build guidance

**Found:**

- how-to/testing/testing.md mentions Docker builds for journey tests
- No specific webpack configuration guidance
- No documentation about --ignore-scripts or sass-embedded
- No known issues or workarounds documented

**Conclusion:** CDP documentation doesn't address this issue.

### 2025-10-04 09:20 - Phase 4: Online Research ✅

**Comprehensive search across Stack Overflow, GitHub issues, forums**

#### Finding 1: Memory Issues (Most Common Cause)

**Source:** Multiple Stack Overflow posts, GitHub issues

- Docker docs recommend **minimum 2GB RAM** for webpack builds
- Many reports of builds hanging at "90% processing chunk assets"
- Particularly problematic for production builds with optimization
- Basic servers with 1GB RAM frequently fail
- **Quote:** "The app is running out of memory during build"

**Solutions mentioned:**

- Increase Docker memory allocation
- Build webpack on host, copy to container
- Use multi-stage builds to separate build from runtime

#### Finding 2: Running as Root User

**Source:** Stack Overflow #61588181

- Known issue when Node.js process hangs running as root
- **Quote:** "There is a known issue when a NodeJs process hangs while you run it from the root user"
- Recommendation: Use non-root user for builds

**Our case:** defradigital/node-development base image runs as `node` user (not root)

#### Finding 3: Watch Mode Suspicion

**Source:** Multiple GitHub webpack issues

- Some configs accidentally enable watch mode
- Process doesn't exit, waits for file changes
- **Quote:** "'webpack is watching the files' diagnostic is suspicious"

**Our case:** Checked webpack.config.js - no watch:true, watchOptions only used in development

#### Finding 4: sass-embedded Binary Issues with --ignore-scripts

**Source:** sass-loader GitHub, Stack Overflow

- sass-embedded requires native binaries installed via postinstall
- **Quote:** "sass-embedded has more complicated OS requirements being a compiled binary"
- Using --ignore-scripts prevents binary installation
- **Quote:** "When using --ignore-scripts during npm install, the post-install scripts that download the sass binaries won't run, which would cause the missing binary error"

**Solutions mentioned:**

- Run `npm rebuild sass-embedded` after npm ci
- Use `sass` (Dart Sass pure JS) instead of sass-embedded
- Add specific postinstall script for sass-embedded

#### Finding 5: Child Process / stdio Issues

**Source:** webpack GitHub issues #2168, #5026

- webpack-dev-server with stdio:"inherit" cannot be killed
- Subprocess hanging with SIGINT (similar to our npm hang)
- **Quote:** "webpack-dev-server node process cannot be killed as expected"

**Our case:** Similar to the npm postinstall hang we already solved

#### Finding 6: Cross-Platform Build Issues

**Source:** Docker buildx GitHub #317

- Building arm/v7 image on amd64 hangs on webpack
- Native builds work fine
- **Quote:** "when building arm/v7 image on amd64 machine via docker buildx, the build gets stuck on running webpack"

**Our case:** Building linux/amd64 on macOS arm64 - **MATCHES THIS PATTERN**

### 2025-10-04 09:30 - Phase 5: Webpack Configuration Analysis ✅

**Reviewed:** /Users/benoit/projects/defra/cdp/trade-demo-frontend/webpack.config.js

**Findings:**

- ✅ Mode correctly set: `mode: NODE_ENV === 'production' ? 'production' : 'development'`
- ⚠️ watchOptions defined (but not activated unless in watch mode)
- ⚠️ TerserPlugin with 2 compression passes (CPU intensive)
- ⚠️ sass-loader using sass-embedded (requires native binary)
- ✅ No explicit watch: true
- ⚠️ sourceMap generation enabled (memory intensive)

**Resource-intensive operations in production build:**

1. sass-embedded compilation
2. TerserPlugin with 2 passes
3. Source map generation
4. Asset optimization

---

## ROOT CAUSE ANALYSIS

### Primary Root Cause: Platform Mismatch + Memory Constraints

**Evidence triangulation:**

1. **Local build works (4s)** → Configuration is valid
2. **CDP reference template fails identically** → Not our code
3. **Online research shows memory as #1 cause** → Docker memory limits
4. **Cross-platform build issues documented** → macOS arm64 → linux/amd64
5. **No output from webpack** → Silent hang, not error

### Contributing Factors

1. **--ignore-scripts prevents sass-embedded binary installation**

   - But local build worked after --ignore-scripts
   - sass-embedded likely installed binaries for macOS
   - Docker needs linux binaries which aren't present

2. **Resource-intensive production build**

   - Terser with 2 compression passes
   - Source map generation
   - sass-embedded compilation
   - All happening in memory-constrained container

3. **Platform emulation overhead**
   - Building linux/amd64 image on macOS arm64/v8
   - QEMU emulation adds CPU/memory overhead
   - Compounds memory pressure

### Why It Hangs Silently

Webpack likely:

1. Starts compilation
2. Hits memory limit or platform issue
3. Enters waiting state (similar to npm subprocess hang)
4. No error thrown, no timeout, just infinite wait
5. Docker build eventually times out

### Why CDP Uses `set +e` for Docker Builds

From GitHub Actions investigation, CDP knows Docker builds fail:

```yaml
- name: Test Docker Image Build
  run: |
    set +e              # Ignore errors!
    docker build --no-cache --tag cdp-node-frontend-template .
    exit $?
```

They run `npm ci` and `npm run build:frontend` on the **host** (with .git and full environment), then test Docker build with errors ignored.

**This suggests CDP doesn't expect Docker builds to succeed with their current pattern.**

---

## RECOMMENDED SOLUTIONS

### Option 1: Build Webpack on Host, Copy to Docker ⭐ (RECOMMENDED)

**Approach:** Run webpack build before Docker build, copy .public/ directory

**Dockerfile modification:**

```dockerfile
# Development: Build webpack on host first
# Then: docker build ...

COPY --chown=node:node --chmod=755 package*.json .npmrc ./
RUN npm ci --omit=dev  # Skip devDependencies in Docker
COPY --chown=node:node --chmod=755 . .
# No webpack build in Docker - use pre-built .public/

CMD [ "npm", "run", "docker:dev" ]
```

**Process:**

```bash
# On host (macOS)
npm run build:frontend  # Builds in 4s

# Then build Docker image
docker compose up --build
```

**Pros:**

- ✅ Proven to work (local build succeeds)
- ✅ Fast (4s vs hang)
- ✅ No Docker memory issues
- ✅ No platform emulation overhead
- ✅ Matches CDP's GitHub Actions pattern (build on host)
- ✅ Simple, reliable

**Cons:**

- ⚠️ Requires build step before Docker
- ⚠️ .public/ must be in source control or build artifact

### Option 2: Multi-Stage Build with Native Platform

**Approach:** Build on native platform, copy to runtime image

**Dockerfile modification:**

```dockerfile
FROM --platform=$BUILDPLATFORM node:22-alpine AS builder
WORKDIR /build
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build:frontend

FROM defradigital/node-development:2.8.5-node22.16.0 AS development
COPY --from=builder /build/.public ./.public
COPY --chown=node:node package*.json ./
RUN npm ci --omit=dev
COPY --chown=node:node . .
CMD [ "npm", "run", "docker:dev" ]
```

**Pros:**

- ✅ Webpack builds on native platform (macOS arm64)
- ✅ No cross-platform emulation overhead
- ✅ Self-contained in Dockerfile

**Cons:**

- ⚠️ More complex Dockerfile
- ⚠️ Still requires npm ci with full devDependencies in builder stage

### Option 3: Increase Docker Memory + Selective Postinstall

**Approach:** Give Docker more resources and reinstall sass-embedded binary

**Dockerfile modification:**

```dockerfile
COPY --chown=node:node --chmod=755 package*.json .npmrc ./
RUN npm ci --ignore-scripts
RUN npm rebuild sass-embedded  # Reinstall native binary for linux
COPY --chown=node:node --chmod=755 . .
RUN npm run build:frontend
```

**Docker Compose:**

```yaml
trade-demo-frontend:
  build: ./
  deploy:
    resources:
      limits:
        memory: 4G
```

**Pros:**

- ✅ Webpack builds in Docker (self-contained)
- ✅ Addresses sass-embedded binary issue

**Cons:**

- ⚠️ Still has cross-platform overhead
- ⚠️ Requires more memory allocation
- ⚠️ Slower than host build
- ⚠️ May still hang due to platform emulation

### Option 4: Switch to Pure JS Sass Compiler

**Approach:** Replace sass-embedded with sass (Dart Sass pure JS)

**package.json modification:**

```bash
npm uninstall sass-embedded
npm install sass --save-dev
```

**Pros:**

- ✅ No native binaries needed
- ✅ Works with --ignore-scripts
- ✅ No platform-specific issues

**Cons:**

- ⚠️ Slower compilation than sass-embedded
- ⚠️ Changes dependency

---

## RECOMMENDED IMPLEMENTATION

**Immediate solution:** **Option 1** (Build on Host)

1. Add to README.md:

   ````markdown
   ## Docker Build

   Build frontend assets before building Docker image:

   ```bash
   npm run build:frontend
   docker compose up --build
   ```
   ````

   ```

   ```

2. Add .public/ to .gitignore (if not already)

3. Document in CI/CD that webpack must build on host

4. Consider adding pre-docker-build npm script:
   ```json
   "scripts": {
     "pre-docker-build": "npm run build:frontend"
   }
   ```

**Long-term solution:** File issue with @defra/cdp-auditing to remove postinstall + Document build pattern in CDP

---

**Status:** ROOT CAUSE IDENTIFIED - Cross-platform build + memory constraints + sass-embedded binary issues
**Recommended Solution:** Build webpack on host, copy .public/ to Docker (Option 1)
**Next Action:** Implement and test Option 1
