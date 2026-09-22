import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import type { GameConfig, ScreenName, SentenceQuestConfig, SynonymSafariConfig, WinPattern, WordscapesConfig } from './types';
import { useSettings } from './hooks/useSettings';
import { useReducedMotion } from './hooks/useReducedMotion';
import { useAppearance } from './hooks/useAppearance';
import {
  createProfile,
  getCurrentProfile,
  getProfiles,
  getSentenceQuestStats,
  getStreaks,
  getSynonymSafariStats,
  getWordscapesStats,
  recordGameResult,
  recordSentenceQuestRound,
  recordSynonymSafariRound,
  recordWordscapesCompletion,
} from './lib/storage';
import ProfileScreen from './components/ProfileScreen';
import MenuScreen from './components/MenuScreen';
import GameScreen from './components/GameScreen';
import WinScreen from './components/WinScreen';
import WordscapesGameScreen from './components/WordscapesGameScreen';
import WordscapesWinScreen from './components/WordscapesWinScreen';
import SentenceQuestScreen from './components/SentenceQuestScreen';
import SentenceQuestWinScreen from './components/SentenceQuestWinScreen';
import SynonymSafariScreen from './components/SynonymSafariScreen';
import SynonymSafariWinScreen from './components/SynonymSafariWinScreen';
import SettingsScreen from './components/SettingsScreen';

interface WinInfo {
  config: GameConfig;
  patterns: WinPattern[];
  winnerLabel?: string;
}

interface WordscapesWinInfo {
  config: WordscapesConfig;
  bonusWordsFound: number;
  /** True if the player used any reveal help (single-letter hints and/or
   * Give Up) at any point in this puzzle, even if they finished the rest
   * of it themselves. */
  assisted: boolean;
}

interface SentenceQuestWinInfo {
  config: SentenceQuestConfig;
  correctCount: number;
  totalCount: number;
}

interface SynonymSafariWinInfo {
  config: SynonymSafariConfig;
  pairsMatched: number;
  /** True if the player used the hint button anywhere in this round. */
  assisted: boolean;
}

export default function App() {
  // Named local profiles, not accounts -- see storage.ts. No profile yet
  // forces the picker screen before the menu; an existing one skips
  // straight to it.
  const [currentProfile, setCurrentProfile] = useState<string | null>(() => getCurrentProfile());
  const [profiles, setProfiles] = useState<string[]>(() => getProfiles());
  const [screen, setScreen] = useState<ScreenName>(() => (getCurrentProfile() ? 'menu' : 'profile'));
  const [previousScreen, setPreviousScreen] = useState<ScreenName>('menu');
  const [gameConfig, setGameConfig] = useState<GameConfig | null>(null);
  const [winInfo, setWinInfo] = useState<WinInfo | null>(null);
  const [streaks, setStreaks] = useState(() => getStreaks(currentProfile ?? ''));

  const [wordscapesConfig, setWordscapesConfig] = useState<WordscapesConfig | null>(null);
  const [wordscapesWinInfo, setWordscapesWinInfo] = useState<WordscapesWinInfo | null>(null);
  const [wordscapesStats, setWordscapesStats] = useState(() => getWordscapesStats(currentProfile ?? ''));
  // Words the most recently *started* Wordscapes puzzle placed, passed back
  // into the next puzzle as words to avoid repeating -- mirrors
  // synonymSafariRecentWords below (same reason: the screen unmounts
  // between puzzles, so it can't remember this itself).
  const [wordscapesRecentWords, setWordscapesRecentWords] = useState<string[]>([]);

  const [sentenceQuestConfig, setSentenceQuestConfig] = useState<SentenceQuestConfig | null>(null);
  const [sentenceQuestWinInfo, setSentenceQuestWinInfo] = useState<SentenceQuestWinInfo | null>(null);
  const [sentenceQuestStats, setSentenceQuestStats] = useState(() => getSentenceQuestStats(currentProfile ?? ''));
  // Sentences the most recently *started* Sentence Quest round used --
  // same pattern as wordscapesRecentWords/synonymSafariRecentWords.
  const [sentenceQuestRecentSentences, setSentenceQuestRecentSentences] = useState<string[]>([]);

  const [synonymSafariConfig, setSynonymSafariConfig] = useState<SynonymSafariConfig | null>(null);
  const [synonymSafariWinInfo, setSynonymSafariWinInfo] = useState<SynonymSafariWinInfo | null>(null);
  const [synonymSafariStats, setSynonymSafariStats] = useState(() => getSynonymSafariStats(currentProfile ?? ''));
  // Words the most recently *started* Synonym Safari round used, passed back
  // into the next round as words to avoid repeating -- see generateRound's
  // excludeWords param. Lives here (not inside SynonymSafariScreen) because
  // that screen unmounts between rounds (win screen in between), so it can't
  // remember this itself.
  const [synonymSafariRecentWords, setSynonymSafariRecentWords] = useState<string[]>([]);

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
    setStreaks(getStreaks(name));
    setWordscapesStats(getWordscapesStats(name));
    setSentenceQuestStats(getSentenceQuestStats(name));
    setSynonymSafariStats(getSynonymSafariStats(name));
    setScreen('menu');
  }, []);

  const switchProfile = useCallback(() => {
    window.history.pushState(null, '');
    setScreen('profile');
  }, []);

  const startGame = useCallback((config: GameConfig) => {
    window.history.pushState(null, '');
    setGameConfig(config);
    setScreen('game');
  }, []);

  const handleWin = useCallback((patterns: WinPattern[], winnerLabel?: string) => {
    if (!gameConfig || !currentProfile) return;
    setStreaks(recordGameResult(currentProfile, gameConfig.category, true));
    setWinInfo({ config: gameConfig, patterns, winnerLabel });
    setScreen('win');
  }, [gameConfig, currentProfile]);

  const playAgain = useCallback(() => {
    if (!winInfo) return;
    setGameConfig({ ...winInfo.config });
    setScreen('game');
  }, [winInfo]);

  const startWordscapes = useCallback((config: WordscapesConfig) => {
    window.history.pushState(null, '');
    setWordscapesConfig(config);
    setScreen('wordscapes-game');
  }, []);

  const handleWordscapesComplete = useCallback((bonusWordsFound: number, assisted: boolean) => {
    if (!wordscapesConfig || !currentProfile) return;
    // An assisted puzzle (any hint used, or Give Up) isn't a real solve --
    // `solved: !assisted` keeps it out of the "puzzles completed" stat, but
    // bonus words genuinely found are credited either way.
    setWordscapesStats(recordWordscapesCompletion(currentProfile, wordscapesConfig.category, bonusWordsFound, !assisted));
    setWordscapesWinInfo({ config: wordscapesConfig, bonusWordsFound, assisted });
    setScreen('wordscapes-win');
  }, [wordscapesConfig, currentProfile]);

  const nextWordscapesPuzzle = useCallback(() => {
    if (!wordscapesWinInfo) return;
    setWordscapesConfig({ ...wordscapesWinInfo.config });
    setScreen('wordscapes-game');
  }, [wordscapesWinInfo]);

  const handleWordscapesPuzzleStart = useCallback((words: string[]) => {
    setWordscapesRecentWords(words);
  }, []);

  const startSentenceQuest = useCallback((config: SentenceQuestConfig) => {
    window.history.pushState(null, '');
    setSentenceQuestConfig(config);
    setScreen('sentence-quest-game');
  }, []);

  const handleSentenceQuestComplete = useCallback(
    (correctCount: number, totalCount: number) => {
      if (!sentenceQuestConfig || !currentProfile) return;
      setSentenceQuestStats(
        recordSentenceQuestRound(currentProfile, sentenceQuestConfig.category, correctCount, totalCount, true),
      );
      setSentenceQuestWinInfo({ config: sentenceQuestConfig, correctCount, totalCount });
      setScreen('sentence-quest-win');
    },
    [sentenceQuestConfig, currentProfile],
  );

  const playSentenceQuestAgain = useCallback(() => {
    if (!sentenceQuestWinInfo) return;
    setSentenceQuestConfig({ ...sentenceQuestWinInfo.config });
    setScreen('sentence-quest-game');
  }, [sentenceQuestWinInfo]);

  const handleSentenceQuestRoundStart = useCallback((sentences: string[]) => {
    setSentenceQuestRecentSentences(sentences);
  }, []);

  const startSynonymSafari = useCallback((config: SynonymSafariConfig) => {
    window.history.pushState(null, '');
    setSynonymSafariConfig(config);
    setScreen('synonym-safari-game');
  }, []);

  const handleSynonymSafariComplete = useCallback(
    (pairsMatched: number, assisted: boolean) => {
      if (!synonymSafariConfig || !currentProfile) return;
      // An assisted round (hint used) isn't a real solve -- `solved: !assisted`
      // keeps it out of the "rounds completed" stat, but pairs genuinely
      // matched are credited either way, same as Wordscapes' bonus words.
      setSynonymSafariStats(
        recordSynonymSafariRound(currentProfile, synonymSafariConfig.category, pairsMatched, !assisted),
      );
      setSynonymSafariWinInfo({ config: synonymSafariConfig, pairsMatched, assisted });
      setScreen('synonym-safari-win');
    },
    [synonymSafariConfig, currentProfile],
  );

  const nextSynonymSafariRound = useCallback(() => {
    if (!synonymSafariWinInfo) return;
    setSynonymSafariConfig({ ...synonymSafariWinInfo.config });
    setScreen('synonym-safari-game');
  }, [synonymSafariWinInfo]);

  const handleSynonymSafariRoundStart = useCallback((words: string[]) => {
    setSynonymSafariRecentWords(words);
  }, []);

  const goToMenu = useCallback(() => {
    setGameConfig(null);
    setWinInfo(null);
    setWordscapesConfig(null);
    setWordscapesWinInfo(null);
    setSentenceQuestConfig(null);
    setSentenceQuestWinInfo(null);
    setSynonymSafariConfig(null);
    setSynonymSafariWinInfo(null);
    setScreen('menu');
  }, []);

  const openSettings = useCallback(() => {
    window.history.pushState(null, '');
    setPreviousScreen(screen);
    setScreen('settings');
  }, [screen]);

  const closeSettings = useCallback(() => {
    setScreen(previousScreen);
  }, [previousScreen]);

  // Wires the Android hardware/gesture back button (and desktop browser
  // back) to this same in-app navigation instead of letting it silently
  // background/exit the app. Capacitor's default Android back handling
  // (and a browser's) is just `history.back()` if there's a history entry
  // to go back to, else exit/minimize -- since nothing here ever pushed an
  // entry beyond the initial page load, that condition was never met, so
  // back always fell straight through to "exit," which read as "the app
  // just collapses and does nothing." Every function above that leaves
  // 'menu' for a divertable sub-flow (startGame, startWordscapes,
  // startSentenceQuest, startSynonymSafari, openSettings, switchProfile) now
  // pushes one entry; goToMenu/closeSettings/the profile "back to menu"
  // case deliberately do NOT push,
  // since they're the functions THIS handler calls to consume that entry.
  // A screen only ever needs one entry regardless of how many further
  // screens it leads to before returning to 'menu' (e.g. game -> win both
  // resolve back to 'menu' in one hop, matching their own visible
  // exit/Menu buttons), so no stack bookkeeping is needed here -- just a
  // direct mapping from "current screen" to "what its own back/exit/menu
  // button already does".
  const handleBackRef = useRef<() => void>(() => {});
  handleBackRef.current = () => {
    switch (screen) {
      case 'game':
      case 'win':
      case 'wordscapes-game':
      case 'wordscapes-win':
      case 'sentence-quest-game':
      case 'sentence-quest-win':
      case 'synonym-safari-game':
      case 'synonym-safari-win':
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

  return (
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
          streaks={streaks}
          wordscapesStats={wordscapesStats}
          sentenceQuestStats={sentenceQuestStats}
          synonymSafariStats={synonymSafariStats}
          onStartBingo={startGame}
          onStartWordscapes={startWordscapes}
          onStartSentenceQuest={startSentenceQuest}
          onStartSynonymSafari={startSynonymSafari}
          onOpenSettings={openSettings}
          onSwitchProfile={switchProfile}
          reduceMotion={reduceMotion}
        />
      )}
      {screen === 'game' && gameConfig && (
        <GameScreen
          key="game"
          config={gameConfig}
          onWin={handleWin}
          onExit={goToMenu}
          reduceMotion={reduceMotion}
          soundEnabled={settings.soundEnabled}
        />
      )}
      {screen === 'win' && winInfo && (
        <WinScreen
          key="win"
          config={winInfo.config}
          patterns={winInfo.patterns}
          winnerLabel={winInfo.winnerLabel}
          streaks={streaks}
          onPlayAgain={playAgain}
          onMenu={goToMenu}
          reduceMotion={reduceMotion}
        />
      )}
      {screen === 'wordscapes-game' && wordscapesConfig && (
        <WordscapesGameScreen
          key="wordscapes-game"
          config={wordscapesConfig}
          excludeWords={wordscapesRecentWords}
          onPuzzleStart={handleWordscapesPuzzleStart}
          onComplete={handleWordscapesComplete}
          onExit={goToMenu}
          reduceMotion={reduceMotion}
        />
      )}
      {screen === 'wordscapes-win' && wordscapesWinInfo && (
        <WordscapesWinScreen
          key="wordscapes-win"
          config={wordscapesWinInfo.config}
          bonusWordsFound={wordscapesWinInfo.bonusWordsFound}
          assisted={wordscapesWinInfo.assisted}
          stats={wordscapesStats}
          onNextPuzzle={nextWordscapesPuzzle}
          onMenu={goToMenu}
          reduceMotion={reduceMotion}
        />
      )}
      {screen === 'sentence-quest-game' && sentenceQuestConfig && (
        <SentenceQuestScreen
          key="sentence-quest-game"
          config={sentenceQuestConfig}
          excludeSentences={sentenceQuestRecentSentences}
          onRoundStart={handleSentenceQuestRoundStart}
          onComplete={handleSentenceQuestComplete}
          onExit={goToMenu}
          reduceMotion={reduceMotion}
        />
      )}
      {screen === 'sentence-quest-win' && sentenceQuestWinInfo && (
        <SentenceQuestWinScreen
          key="sentence-quest-win"
          config={sentenceQuestWinInfo.config}
          correctCount={sentenceQuestWinInfo.correctCount}
          totalCount={sentenceQuestWinInfo.totalCount}
          stats={sentenceQuestStats}
          onPlayAgain={playSentenceQuestAgain}
          onMenu={goToMenu}
          reduceMotion={reduceMotion}
        />
      )}
      {screen === 'synonym-safari-game' && synonymSafariConfig && (
        <SynonymSafariScreen
          key="synonym-safari-game"
          config={synonymSafariConfig}
          excludeWords={synonymSafariRecentWords}
          onRoundStart={handleSynonymSafariRoundStart}
          onComplete={handleSynonymSafariComplete}
          onExit={goToMenu}
          reduceMotion={reduceMotion}
        />
      )}
      {screen === 'synonym-safari-win' && synonymSafariWinInfo && (
        <SynonymSafariWinScreen
          key="synonym-safari-win"
          config={synonymSafariWinInfo.config}
          pairsMatched={synonymSafariWinInfo.pairsMatched}
          assisted={synonymSafariWinInfo.assisted}
          stats={synonymSafariStats}
          onNextRound={nextSynonymSafariRound}
          onMenu={goToMenu}
          reduceMotion={reduceMotion}
        />
      )}
      {screen === 'settings' && (
        <SettingsScreen
          key="settings"
          playerName={currentProfile ?? ''}
          streaks={streaks}
          wordscapesStats={wordscapesStats}
          sentenceQuestStats={sentenceQuestStats}
          synonymSafariStats={synonymSafariStats}
          settings={settings}
          onChange={updateSettings}
          onClose={closeSettings}
          reduceMotion={reduceMotion}
        />
      )}
    </AnimatePresence>
  );
}
