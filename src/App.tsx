import { useCallback, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import type { GameConfig, ScreenName, WinPattern, WordscapesConfig } from './types';
import { useSettings } from './hooks/useSettings';
import { useReducedMotion } from './hooks/useReducedMotion';
import {
  createProfile,
  getCurrentProfile,
  getProfiles,
  getStreaks,
  getWordscapesStats,
  recordGameResult,
  recordWordscapesCompletion,
} from './lib/storage';
import ProfileScreen from './components/ProfileScreen';
import MenuScreen from './components/MenuScreen';
import GameScreen from './components/GameScreen';
import WinScreen from './components/WinScreen';
import WordscapesGameScreen from './components/WordscapesGameScreen';
import WordscapesWinScreen from './components/WordscapesWinScreen';
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

  const { settings, updateSettings } = useSettings();
  const reduceMotion = useReducedMotion(settings.reduceMotion);

  // Handles both picking an existing profile and creating a new one --
  // createProfile is idempotent for a name already in the list, so
  // ProfileScreen doesn't need to distinguish the two cases.
  const chooseProfile = useCallback((name: string) => {
    createProfile(name);
    setCurrentProfile(name);
    setProfiles(getProfiles());
    setStreaks(getStreaks(name));
    setWordscapesStats(getWordscapesStats(name));
    setScreen('menu');
  }, []);

  const switchProfile = useCallback(() => {
    setScreen('profile');
  }, []);

  const startGame = useCallback((config: GameConfig) => {
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

  const goToMenu = useCallback(() => {
    setGameConfig(null);
    setWinInfo(null);
    setWordscapesConfig(null);
    setWordscapesWinInfo(null);
    setScreen('menu');
  }, []);

  const openSettings = useCallback(() => {
    setPreviousScreen(screen);
    setScreen('settings');
  }, [screen]);

  const closeSettings = useCallback(() => {
    setScreen(previousScreen);
  }, [previousScreen]);

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
          onStartBingo={startGame}
          onStartWordscapes={startWordscapes}
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
      {screen === 'settings' && (
        <SettingsScreen
          key="settings"
          settings={settings}
          onChange={updateSettings}
          onClose={closeSettings}
          reduceMotion={reduceMotion}
        />
      )}
    </AnimatePresence>
  );
}
