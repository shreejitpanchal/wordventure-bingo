import { useCallback, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import type { GameConfig, ScreenName, WinPattern } from './types';
import { useSettings } from './hooks/useSettings';
import { useReducedMotion } from './hooks/useReducedMotion';
import { getStreaks, recordGameResult } from './lib/storage';
import MenuScreen from './components/MenuScreen';
import GameScreen from './components/GameScreen';
import WinScreen from './components/WinScreen';
import SettingsScreen from './components/SettingsScreen';

interface WinInfo {
  config: GameConfig;
  patterns: WinPattern[];
  winnerLabel?: string;
}

export default function App() {
  const [screen, setScreen] = useState<ScreenName>('menu');
  const [previousScreen, setPreviousScreen] = useState<ScreenName>('menu');
  const [gameConfig, setGameConfig] = useState<GameConfig | null>(null);
  const [winInfo, setWinInfo] = useState<WinInfo | null>(null);
  const [streaks, setStreaks] = useState(() => getStreaks());

  const { settings, updateSettings } = useSettings();
  const reduceMotion = useReducedMotion(settings.reduceMotion);

  const startGame = useCallback((config: GameConfig) => {
    setGameConfig(config);
    setScreen('game');
  }, []);

  const handleWin = useCallback((patterns: WinPattern[], winnerLabel?: string) => {
    if (!gameConfig) return;
    setStreaks(recordGameResult(gameConfig.category, true));
    setWinInfo({ config: gameConfig, patterns, winnerLabel });
    setScreen('win');
  }, [gameConfig]);

  const playAgain = useCallback(() => {
    if (!winInfo) return;
    setGameConfig({ ...winInfo.config });
    setScreen('game');
  }, [winInfo]);

  const goToMenu = useCallback(() => {
    setGameConfig(null);
    setWinInfo(null);
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
      {screen === 'menu' && (
        <MenuScreen key="menu" streaks={streaks} onStart={startGame} onOpenSettings={openSettings} reduceMotion={reduceMotion} />
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
