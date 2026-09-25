import { useState } from 'react';
import type { WordEntry } from '../types';
import styles from './WordListEditor.module.css';

interface Props {
  /** The current device-wide Free Play list, owned by App.tsx (which is
   * what persists it) -- this editor never touches storage itself. */
  words: WordEntry[];
  onChange: (words: WordEntry[]) => void;
}

export default function WordListEditor({ words, onChange }: Props) {
  const [word, setWord] = useState('');
  const [definition, setDefinition] = useState('');
  const [error, setError] = useState<string | null>(null);

  function addWord() {
    const trimmedWord = word.trim().toUpperCase();
    const trimmedDefinition = definition.trim();
    if (!trimmedWord || !trimmedDefinition) return;

    // `word` doubles as the list's identity (React key, removeWord target,
    // Bingo cell matching), so a duplicate would render two identical
    // entries and remove both at once -- reject it with a visible reason.
    if (words.some((w) => w.word === trimmedWord)) {
      setError(`"${trimmedWord}" is already in the list.`);
      return;
    }

    onChange([...words, { word: trimmedWord, difficulty: 'easy', definition: trimmedDefinition }]);
    setWord('');
    setDefinition('');
    setError(null);
  }

  function removeWord(target: string) {
    onChange(words.filter((w) => w.word !== target));
  }

  return (
    <div className={styles.editor}>
      <div className={styles.form}>
        <input
          className={styles.input}
          placeholder="Word (e.g. TREEHOUSE)"
          value={word}
          onChange={(e) => {
            setWord(e.target.value);
            setError(null);
          }}
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
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

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
