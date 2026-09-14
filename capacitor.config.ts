import type { CapacitorConfig } from '@capacitor/cli';

// webDir points at the Vite build output -- Capacitor copies dist/ straight
// into the native Android project (android/app/src/main/assets/public) and
// serves it from a local WebView, so building an APK never needs a live,
// publicly hosted URL. This replaced Bubblewrap/TWA (see CLAUDE.md's
// "Android packaging" note): Bubblewrap wraps a *deployed* PWA and verifies
// domain ownership via Digital Asset Links, which has no localhost/offline
// escape hatch -- it hard-blocked every APK build until hosting existed.
const config: CapacitorConfig = {
  appId: 'com.wordventurebingo.app',
  appName: 'Wordventure Bingo',
  webDir: 'dist',
};

export default config;
