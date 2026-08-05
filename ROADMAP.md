# Roadmap

## Implemented

### Core Functionality
- [x] Five time horizons: Today, Week, Month, Year, No Date
- [x] Recursive subtasks with automatic completion propagation
- [x] Task creation via Enter (quick) and Cmd/Ctrl+Enter (with modal)
- [x] Markdown-based rich text editor for task descriptions (TipTap)
- [x] Local storage via localStorage (key: `octarine-tasks`)

### Adaptive UI
- [x] Columns layout for desktop and landscape orientation
- [x] Rows layout for portrait mobile devices
- [x] Automatic orientation detection via `useOrientation` hook
- [x] Seamless switching without app restart
- [x] Responsive spacing and header removal for mobile

### Build & Distribution
- [x] Android APK (debug) build via Gradle
- [x] macOS DMG build via Electron + electron-builder
- [x] Automated build script `build.sh` for all platforms
- [x] Git repository setup with SSH authentication
- [x] Project rename from `hello-timestripe`/`Tempo` to `Octarine`

### Code Quality
- [x] `.gitignore` covering Node, Vite, Android, macOS, IDE artifacts
- [x] Kotlin version pinning via `resolutionStrategy` (1.8.22)
- [x] Java 17 configuration in `android/app/build.gradle`

---

## Planned

### Data Storage (High Priority)
- [ ] Migrate from localStorage to Markdown files (local-first, Obsidian/Logseq-style)
- [ ] One task = one Markdown file, or structured vault format

### Synchronization
- [ ] Sync between devices via file system (iCloud, Dropbox, Syncthing)
- [ ] Optional cloud sync (Firebase, Supabase, or custom backend)
- [ ] Conflict resolution strategy

### UX Improvements
- [ ] Dark theme with toggle
- [ ] Settings: font family and font size
- [ ] Settings: using custom fonts (upload ttf-file) or allow custom CSS styles (preffered)
- [ ] Swipe gestures for mobile task management
- [ ] Extended keyboard shortcuts for desktop
- [ ] Reorder tasks manually using drag-and-drop
- [ ] Task filtering and search
- [ ] Tags and/or categories

### Release Build
- [ ] Android keystore setup for signed APK
- [ ] `assembleRelease` Gradle task
- [ ] macOS code signing for DMG distribution
- [ ] Preparation for Google Play / Mac App Store submission

### Advanced Features
- [ ] Recurring tasks (auto-create by schedule)
- [ ] Notifications/reminders for today's tasks
- [ ] Progress visualization and statistics
- [ ] Task templates

---

## Known Limitations

1. **Electron build warnings**: `npm run electron:build` may show `npm error` due to missing macOS code signing certificate, but the `.dmg` file is created successfully in `dist/`. This is expected for development builds.
2. **localStorage reset**: Changing `STORAGE_KEY` in `src/storage.ts` clears existing tasks in the browser. This was intentional during the rename refactor.
3. **macOS 11 (Big Sur) compatibility**: The project is developed on macOS 11 with Node 20. JDK 21 causes `posix_spawn` errors, so JDK 17 is used (see [DECISIONS.md](DECISIONS.md)).
4. **Debug builds only**: Currently only debug APK and unsigned DMG are produced. Release builds require additional keystore/signing setup.
