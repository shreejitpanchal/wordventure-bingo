import { useState } from 'react';
import type { WordEntry } from '../types';
import { getFreeplayWords, saveFreeplayWords } from '../lib/storage';
import styles from './WordListEditor.module.css';

export default function WordListEditor() {
  const [words, setWords] = useState<WordEntry[]>(() => getFreeplayWords());
  const [word, setWord] = useState('');
  const [definition, setDefinition] = useState('');

  function addWord() {
    const trimmedWord = word.trim().toUpperCase();
    const trimmedDefinition = definition.trim();
    if (!trimmedWord || !trimmedDefinition) return;

    const next = [...words, { word: trimmedWord, difficulty: 'easy' as const, definition: trimmedDefinition }];
    setWords(next);
    saveFreeplayWords(next);
    setWord('');
    setDefinition('');
  }

  function removeWord(target: string) {
    const next = words.filter((w) => w.word !== target);
    setWords(next);
    saveFreeplayWords(next);
  }

  return (
    <div className={styles.editor}>
      <div className={styles.form}>
        <input
          className={styles.input}
          placeholder="Word (e.g. TREEHOUSE)"
          value={word}
          onChange={(e) => setWord(e.target.value)}
          maxLength={20}
        />
        <input
          className={styles.input}
          placeholder="Clue or definition"
          value={definition}
          onChange={(e) => setDefinition(e.target.value)}
          maxLength={140}
        />
        <button className={styles.addButton} onClick={addWord}>
          Add
        </button>
      </div>

      {words.length === 0 ? (
        <p className={styles.empty}>No custom words yet. Add some above!</p>
      ) : (
        <ul className={styles.list}>
          {words.map((w) => (
            <li key={w.word} className={styles.item}>
              <span>
                <strong>{w.word}</strong> — {w.definition}
              </span>
              <button className={styles.removeButton} onClick={() => removeWord(w.word)} aria-label={`Remove ${w.word}`}>
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
