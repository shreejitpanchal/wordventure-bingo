import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import type { DailyRecord, GameMode, ScreenName, WordEntry } from './types';
import type { AnyMode, MenuSelection, ModeConfigBase, ModeContext, ModeStatsRecord } from './modes/types';
import { MODES } from './modes';
import { resolveMenuSelection } from './modes/menuSelection';
import { advanceDailyStreak, dailyChallenge, dateKey, isDailyStreakAlive } from './modes/daily';
import { createSoundPlayer } from './lib/sound';
import { useSettings } from './hooks/useSettings';
import { useReducedMotion } from './hooks/useReducedMotion';
import { useAppearance } from './hooks/useAppearance';
import { useModeTheme } from './hooks/useModeTheme';
import {
  createProfile,
  getAvatars,
  getCurrentProfile,
  getDailyRecord,
  getFreeplayWords,
  getMenuSelection,
  getModeStats,
  getProfiles,
  saveAvatar,
  saveDailyRecord,
  saveFreeplayWords,
  saveMenuSelection,
  saveModeStats,
} from './lib/storage';
import Backdrop from './components/Backdrop';
import ErrorBoundary from './components/ErrorBoundary';
import ProfileScreen, { DEFAULT_AVATAR } from './components/ProfileScreen';
import MenuScreen from './components/MenuScreen';
import SettingsScreen from './components/SettingsScreen';
import TrophyScreen from './components/TrophyScreen';

type StatsByMode = Record<GameMode, ModeStatsRecord>;

/** The mode currently being played (or whose win screen is showing), with
 * the config it was started from and -- once finished -- its result. */
interface Session {
  mode: AnyMode;
  config: ModeConfigBase;
  result: unknown | null;
  /** Every random draw the game screen makes goes through this: Math.random
   * for a normal game, a date-seeded rng for the daily challenge. */
  rng: () => number;
  /** True when this session is today's challenge, so completing it
   * advances the daily streak. */
  daily: boolean;
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
  const [avatars, setAvatars] = useState<Record<string, string>>(() => getAvatars());
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
  const [dailyRecord, setDailyRecord] = useState<DailyRecord>(() => getDailyRecord(currentProfile ?? ''));

  // Device-wide Free Play list: App owns it so the editor (Settings) and the
  // consumers (word-bank modes) share one source of truth through props,
  // instead of each reading storage on its own.
  const [freeplayWords, setFreeplayWords] = useState<WordEntry[]>(() => getFreeplayWords());

  const { settings, updateSettings } = useSettings();
  const reduceMotion = useReducedMotion(settings.reduceMotion);
  useAppearance(settings);
  // The palette follows the mode being played, else the one selected on
  // the menu -- so tapping a mode chip visibly changes the whole "world".
  useModeTheme(session?.mode.id ?? menuSelection.modeId);

  // One sound player for the whole app, gated on the setting, handed down
  // explicitly (ModeContext / props) -- never reached for as a global.
  const sound = useMemo(() => createSoundPlayer(), []);
  useEffect(() => {
    sound.setEnabled(settings.soundEnabled);
  }, [sound, settings.soundEnabled]);

  const modeContext = useMemo<ModeContext>(() => ({ freeplayWords, sound }), [freeplayWords, sound]);

  // Today's challenge is a pure function of the date; recomputed on every
  // render is cheap, but memoised per day key so the object is stable.
  const today = dateKey();
  const daily = useMemo(() => dailyChallenge(today, MODES), [today]);

  // Handles both picking an existing profile and creating a new one --
  // createProfile is idempotent for a name already in the list, so
  // ProfileScreen doesn't need to distinguish the two cases.
  const chooseProfile = useCallback((name: string, avatar?: string) => {
    createProfile(name);
    if (avatar) {
      saveAvatar(name, avatar);
      setAvatars(getAvatars());
    }
    setCurrentProfile(name);
    setProfiles(getProfiles());
    setStatsByMode(loadAllStats(name));
    setMenuSelection(resolveMenuSelection(getMenuSelection(name)));
    setDailyRecord(getDailyRecord(name));
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
    setSession({ mode, config, result: null, rng: Math.random, daily: false });
    setScreen('game');
  }, []);

  const startDaily = useCallback(() => {
    window.history.pushState(null, '');
    setSession({ mode: daily.mode, config: daily.config, result: null, rng: daily.makeRng(), daily: true });
    setScreen('game');
  }, [daily]);

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
      if (session.daily) {
        const record = advanceDailyStreak(dailyRecord, today);
        saveDailyRecord(currentProfile, record);
        setDailyRecord(record);
      }
      setSession({ ...session, result });
      setScreen('win');
    },
    [session, currentProfile, statsByMode, dailyRecord, today],
  );

  const playAgain = useCallback(() => {
    if (!session) return;
    // A replayed daily is the same puzzle again (fresh seeded rng), by design.
    setSession({ ...session, result: null, rng: session.daily ? daily.makeRng() : Math.random });
    setScreen('game');
  }, [session, daily]);

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

  const openTrophies = useCallback(() => {
    window.history.pushState(null, '');
    sound.play('select');
    setScreen('trophies');
  }, [sound]);

  // Settings and the Trophy Room are only reachable from the menu, so
  // closing always returns there -- no "where was it opened from" bookkeeping.
  const backToMenu = useCallback(() => {
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
  // 'menu' for a divertable sub-flow (startMode, startDaily, openSettings,
  // openTrophies, switchProfile) pushes one entry; goToMenu/backToMenu/the
  // profile "back to menu" case deliberately do NOT push, since they're the
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
        case 'trophies':
          backToMenu();
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
  }, [screen, currentProfile, goToMenu, backToMenu]);

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
    <>
      <Backdrop reduceMotion={reduceMotion} />
      {/* Every src/lib generator throws loudly on a data bug; without this
          the throw would blank the whole app. The boundary shows the message
          and offers a way back to the menu instead -- see ErrorBoundary.tsx. */}
      <ErrorBoundary onReset={resetToMenu}>
        <AnimatePresence mode="wait">
          {screen === 'profile' && (
            <ProfileScreen
              key="profile"
              profiles={profiles}
              avatars={avatars}
              onChoose={chooseProfile}
              onCancel={currentProfile ? () => setScreen('menu') : undefined}
              sound={sound}
              reduceMotion={reduceMotion}
            />
          )}
          {screen === 'menu' && currentProfile && (
            <MenuScreen
              key="menu"
              playerName={currentProfile}
              avatar={avatars[currentProfile] ?? DEFAULT_AVATAR}
              statsByMode={statsByMode}
              selection={menuSelection}
              onSelectionChange={updateMenuSelection}
              daily={{
                challenge: daily,
                record: dailyRecord,
                doneToday: dailyRecord.lastCompleted === today,
                streakAlive: isDailyStreakAlive(dailyRecord, today),
              }}
              sound={sound}
              onStart={startMode}
              onStartDaily={startDaily}
              onOpenTrophies={openTrophies}
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
                rng={session.rng}
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
                context={modeContext}
                onPlayAgain={playAgain}
                onMenu={goToMenu}
                reduceMotion={reduceMotion}
              />
            </Suspense>
          )}
          {screen === 'trophies' && (
            <TrophyScreen
              key="trophies"
              playerName={currentProfile ?? ''}
              statsByMode={statsByMode}
              sound={sound}
              onClose={backToMenu}
              reduceMotion={reduceMotion}
            />
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
              onClose={backToMenu}
              reduceMotion={reduceMotion}
            />
          )}
        </AnimatePresence>
      </ErrorBoundary>
    </>
  );
}
