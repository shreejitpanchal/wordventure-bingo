import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import type { GameMode, ScreenName, WordEntry } from './types';
import type { AnyMode, MenuSelection, ModeConfigBase, ModeContext, ModeStatsRecord } from './modes/types';
import { MODES } from './modes';
import { resolveMenuSelection } from './modes/menuSelection';
import { useSettings } from './hooks/useSettings';
import { useReducedMotion } from './hooks/useReducedMotion';
import { useAppearance } from './hooks/useAppearance';
import {
  createProfile,
  getCurrentProfile,
  getFreeplayWords,
  getMenuSelection,
  getModeStats,
  getProfiles,
  saveFreeplayWords,
  saveMenuSelection,
  saveModeStats,
} from './lib/storage';
import ErrorBoundary from './components/ErrorBoundary';
import ProfileScreen from './components/ProfileScreen';
import MenuScreen from './components/MenuScreen';
import SettingsScreen from './components/SettingsScreen';

type StatsByMode = Record<GameMode, ModeStatsRecord>;

/** The mode currently being played (or whose win screen is showing), with
 * the config it was started from and -- once finished -- its result. */
interface Session {
  mode: AnyMode;
  config: ModeConfigBase;
  result: unknown | null;
}

function loadAllStats(profile: string): StatsByMode {
  return Object.fromEntries(
    MODES.map((mode) => [mode.id, getModeStats(mode.stats.key, profile, mode.stats.defaults)]),
  ) as StatsByMode;
}

export default function App() {
  // Named local profiles, not accounts -- see storage.ts. No profile yet
  // forces the picker screen before the menu; an existing one skips
  // straight to it.
  const [currentProfile, setCurrentProfile] = useState<string | null>(() => getCurrentProfile());
  const [profiles, setProfiles] = useState<string[]>(() => getProfiles());
  const [screen, setScreen] = useState<ScreenName>(() => (getCurrentProfile() ? 'menu' : 'profile'));

  // Everything mode-specific is held generically, keyed by mode id, and the
  // mode's own descriptor (src/modes/) says what to do with it. This is what
  // keeps App.tsx the same size for four modes or fourteen.
  const [session, setSession] = useState<Session | null>(null);
  const [statsByMode, setStatsByMode] = useState<StatsByMode>(() => loadAllStats(currentProfile ?? ''));
  // What each mode's most recently *started* round reported via
  // onRoundStart (words placed, sentences used, ...), handed back to that
  // mode's next round as items to avoid repeating. Lives here, not in the
  // game screens, because they unmount between rounds (the win screen sits
  // in between) and so can't remember it themselves.
  const [recentByMode, setRecentByMode] = useState<Partial<Record<GameMode, string[]>>>({});
  // The menu's last picks, per profile. Held here (MenuScreen is controlled)
  // because MenuScreen unmounts while a game is on -- and persisted so a
  // reopened app comes back to the same mode/category/difficulty/options.
  const [menuSelection, setMenuSelection] = useState<MenuSelection>(() =>
    resolveMenuSelection(getMenuSelection(currentProfile ?? '')),
  );

  // Device-wide Free Play list: App owns it so the editor (Settings) and the
  // consumers (word-bank modes) share one source of truth through props,
  // instead of each reading storage on its own.
  const [freeplayWords, setFreeplayWords] = useState<WordEntry[]>(() => getFreeplayWords());
  const modeContext = useMemo<ModeContext>(() => ({ freeplayWords }), [freeplayWords]);

  const { settings, updateSettings } = useSettings();
  const reduceMotion = useReducedMotion(settings.reduceMotion);
  useAppearance(settings);

  // Handles both picking an existing profile and creating a new one --
  // createProfile is idempotent for a name already in the list, so
  // ProfileScreen doesn't need to distinguish the two cases.
  const chooseProfile = useCallback((name: string) => {
    createProfile(name);
    setCurrentProfile(name);
    setProfiles(getProfiles());
    setStatsByMode(loadAllStats(name));
    setMenuSelection(resolveMenuSelection(getMenuSelection(name)));
    setScreen('menu');
  }, []);

  const updateMenuSelection = useCallback(
    (next: MenuSelection) => {
      setMenuSelection(next);
      if (currentProfile) saveMenuSelection(currentProfile, next);
    },
    [currentProfile],
  );

  const switchProfile = useCallback(() => {
    window.history.pushState(null, '');
    setScreen('profile');
  }, []);

  const startMode = useCallback((mode: AnyMode, config: ModeConfigBase) => {
    window.history.pushState(null, '');
    setSession({ mode, config, result: null });
    setScreen('game');
  }, []);

  const handleRoundStart = useCallback(
    (items: string[]) => {
      if (!session) return;
      setRecentByMode((prev) => ({ ...prev, [session.mode.id]: items }));
    },
    [session],
  );

  const handleComplete = useCallback(
    (result: unknown) => {
      if (!session || !currentProfile) return;
      const { mode, config } = session;
      const next = mode.stats.record(statsByMode[mode.id], config, result);
      saveModeStats(mode.stats.key, currentProfile, next);
      setStatsByMode((prev) => ({ ...prev, [mode.id]: next }));
      setSession({ mode, config, result });
      setScreen('win');
    },
    [session, currentProfile, statsByMode],
  );

  const playAgain = useCallback(() => {
    if (!session) return;
    setSession({ ...session, result: null });
    setScreen('game');
  }, [session]);

  const goToMenu = useCallback(() => {
    // Leaving mid-game (visible Menu button or hardware back) is the mode's
    // "abandon" event, if it has one -- e.g. Bingo counts it as the loss
    // that lets a streak actually break. Computed from current state, not
    // inside a setState updater, so the storage write runs exactly once.
    if (screen === 'game' && session && currentProfile && session.mode.stats.recordAbandon) {
      const { mode, config } = session;
      const next = mode.stats.recordAbandon(statsByMode[mode.id], config);
      saveModeStats(mode.stats.key, currentProfile, next);
      setStatsByMode((prev) => ({ ...prev, [mode.id]: next }));
    }
    setSession(null);
    setScreen('menu');
  }, [screen, session, currentProfile, statsByMode]);

  // Recovery path for the error boundary: back to the menu with no stats
  // side effects -- a crash isn't a loss.
  const resetToMenu = useCallback(() => {
    setSession(null);
    setScreen('menu');
  }, []);

  const openSettings = useCallback(() => {
    window.history.pushState(null, '');
    setScreen('settings');
  }, []);

  // Settings is only reachable from the menu, so closing always returns
  // there -- no "where was it opened from" bookkeeping needed.
  const closeSettings = useCallback(() => {
    setScreen('menu');
  }, []);

  const updateFreeplayWords = useCallback((words: WordEntry[]) => {
    saveFreeplayWords(words);
    setFreeplayWords(words);
  }, []);

  // Wires the Android hardware/gesture back button (and desktop browser
  // back) to this same in-app navigation instead of letting it silently
  // background/exit the app. Capacitor's default Android back handling
  // (and a browser's) is just `history.back()` if there's a history entry
  // to go back to, else exit/minimize -- since nothing here ever pushed an
  // entry beyond the initial page load, that condition was never met, so
  // back always fell straight through to "exit," which read as "the app
  // just collapses and does nothing." Every function above that leaves
  // 'menu' for a divertable sub-flow (startMode, openSettings,
  // switchProfile) pushes one entry; goToMenu/closeSettings/the profile
  // "back to menu" case deliberately do NOT push, since they're the
  // functions THIS handler calls to consume that entry. A screen only ever
  // needs one entry regardless of how many further screens it leads to
  // before returning to 'menu' (game -> win both resolve back to 'menu' in
  // one hop, matching their own visible exit/Menu buttons), so no stack
  // bookkeeping is needed -- just a direct mapping from "current screen"
  // to "what its own back/exit/menu button already does".
  //
  // Kept in a ref (assigned from an effect, never during render -- refs
  // written in render break React's rendering rules) so both listeners
  // below can be registered once yet always call the latest closure.
  const handleBackRef = useRef<() => void>(() => {});
  useEffect(() => {
    handleBackRef.current = () => {
      switch (screen) {
        case 'game':
        case 'win':
          goToMenu();
          break;
        case 'settings':
          closeSettings();
          break;
        case 'profile':
          if (currentProfile) {
            setScreen('menu');
          } else {
            // First-launch picker: nothing to go back to. Re-push so this
            // press is fully absorbed rather than draining history toward
            // an unexpected exit on some later, unrelated press.
            window.history.pushState(null, '');
          }
          break;
        default:
          // 'menu': the root screen. Nothing left to go back to in-app --
          // let the browser/Capacitor's own "no history left" fallback
          // (exit/background) happen, same as any Android app's home screen.
          break;
      }
    };
  }, [screen, currentProfile, goToMenu, closeSettings]);

  useEffect(() => {
    function onPopState() {
      handleBackRef.current();
    }
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // Real-device testing showed the popstate-based fix above (relying on
  // Capacitor's default Android back handling, which is documented to call
  // history.back() for us) doesn't reliably reach the app in the native
  // APK -- WebView back-button-to-history bridging is apparently not
  // trustworthy enough to depend on alone. `@capacitor/app`'s `backButton`
  // event is a direct native signal that bypasses that bridging entirely:
  // registering a listener for it also disables Capacitor's default
  // history.back()/exit behavior, so this becomes the sole, authoritative
  // back-press path on native Android -- call the same resolver directly,
  // no history state involved. Only registered when actually running
  // inside Capacitor (Capacitor.isNativePlatform()); on the web/PWA the
  // popstate listener above remains the only mechanism, since this plugin
  // event doesn't exist there.
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const listenerHandle = CapacitorApp.addListener('backButton', () => {
      handleBackRef.current();
    });
    return () => {
      listenerHandle.then((handle) => handle.remove());
    };
  }, []);

  const mode = session?.mode;

  return (
    // Every src/lib generator throws loudly on a data bug; without this the
    // throw would blank the whole app. The boundary shows the message and
    // offers a way back to the menu instead -- see ErrorBoundary.tsx.
    <ErrorBoundary onReset={resetToMenu}>
      <AnimatePresence mode="wait">
        {screen === 'profile' && (
          <ProfileScreen
            key="profile"
            profiles={profiles}
            onChoose={chooseProfile}
            onCancel={currentProfile ? () => setScreen('menu') : undefined}
            reduceMotion={reduceMotion}
          />
        )}
        {screen === 'menu' && currentProfile && (
          <MenuScreen
            key="menu"
            playerName={currentProfile}
            statsByMode={statsByMode}
            selection={menuSelection}
            onSelectionChange={updateMenuSelection}
            onStart={startMode}
            onOpenSettings={openSettings}
            onSwitchProfile={switchProfile}
            reduceMotion={reduceMotion}
          />
        )}
        {/* Mode screens are lazy (their chunk includes the mode's content
            banks), so they sit inside Suspense. The chunk is precached by
            the service worker, so the null fallback is a one-frame blank at
            most, and only the first time a mode is played. */}
        {screen === 'game' && session && mode && (
          <Suspense key={`game:${mode.id}`} fallback={null}>
            <mode.GameScreen
              config={session.config}
              context={modeContext}
              excludeItems={recentByMode[mode.id] ?? []}
              onRoundStart={handleRoundStart}
              onComplete={handleComplete}
              onExit={goToMenu}
              reduceMotion={reduceMotion}
            />
          </Suspense>
        )}
        {screen === 'win' && session && mode && session.result !== null && (
          <Suspense key={`win:${mode.id}`} fallback={null}>
            <mode.WinScreen
              config={session.config}
              result={session.result}
              stats={statsByMode[mode.id]}
              onPlayAgain={playAgain}
              onMenu={goToMenu}
              reduceMotion={reduceMotion}
            />
          </Suspense>
        )}
        {screen === 'settings' && (
          <SettingsScreen
            key="settings"
            playerName={currentProfile ?? ''}
            statsByMode={statsByMode}
            settings={settings}
            onChange={updateSettings}
            freeplayWords={freeplayWords}
            onFreeplayWordsChange={updateFreeplayWords}
            onClose={closeSettings}
            reduceMotion={reduceMotion}
          />
        )}
      </AnimatePresence>
    </ErrorBoundary>
  );
}
