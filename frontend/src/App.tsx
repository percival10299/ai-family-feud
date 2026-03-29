import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { X } from 'lucide-react';

// --- Types matching our Backend Models ---
interface Answer {
  text: string;
  points: number;
}

interface GameBoard {
  question: string;
  answers: Answer[];
}

const API_BASE = 'http://localhost:8000/api';

export default function App() {
  const [board, setBoard] = useState<GameBoard | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Game State
  const [guess, setGuess] = useState('');
  const [evaluating, setEvaluating] = useState(false);
  const [revealedIndices, setRevealedIndices] = useState<number[]>([]);
  const [strikes, setStrikes] = useState(0);
  const [score, setScore] = useState(0);

  // 1. Fetch the board on mount (The Generator)
  useEffect(() => {
    fetchBoard();
  }, []);

  const fetchBoard = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/generate-board`);
      setBoard(res.data);
    } catch (error) {
      console.error("Failed to fetch board:", error);
      alert("Failed to load game. Check console/backend.");
    } finally {
      setLoading(false);
    }
  };

  // 2. Handle user guess submission (The Judge)
  const handleGuess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guess.trim() || !board || evaluating || strikes >= 3) return;

    setEvaluating(true);
    try {
      // Extract just the text of the answers for the Judge context
      const hiddenAnswers = board.answers.map(a => a.text);
      
      const res = await axios.post(`${API_BASE}/evaluate-guess`, {
        user_guess: guess,
        hidden_answers: hiddenAnswers
      });

      const matchIndex = res.data.match_index; // Returns 1-5, or 0

      if (matchIndex > 0) {
        // Convert the 1-based index to 0-based for our array
        const arrayIndex = matchIndex - 1;
        
        if (!revealedIndices.includes(arrayIndex)) {
          new Audio('/correct.mp3').play().catch(e => console.error("Audio play failed:", e));
          setRevealedIndices(prev => [...prev, arrayIndex]);
          setScore(prev => prev + board.answers[arrayIndex].points);
        }

      } else {
        // Strike!
        new Audio('/strike.mp3').play().catch(e => console.error("Audio play failed:", e));
        setStrikes(prev => prev + 1);
      }
      
      setGuess('');
    } catch (error) {
      console.error("Evaluation failed:", error);
    } finally {
      setEvaluating(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <h2>AI is reading the internet to build your gameboard...</h2>
      </div>
    );
  }

  if (!board) return null;

  const isGameOver = strikes >= 3 || revealedIndices.length === board.answers.length;

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.scoreBoard}>Score: {score}</div>
        <div style={styles.strikes}>
          {Array.from({ length: 3 }).map((_, i) => (
            <X key={i} color={i < strikes ? "red" : "#ccc"} size={40} />
          ))}
        </div>
      </div>

      <h1 style={styles.question}>{board.question}</h1>

      {/* Game Board Grid */}
      {/* Game Board Grid */}
      <div style={styles.grid}>
        {board.answers.map((answer, index) => {
          // Did the user actually guess this specific tile?
          const wasGuessed = revealedIndices.includes(index);
          
          // Reveal the tile if they guessed it OR if the game is over
          const isRevealed = wasGuessed || isGameOver;
          
          // Green if they guessed it, Grey if it was revealed at the end, Blue for unrevealed
          const bgColor = wasGuessed ? '#4CAF50' : (isRevealed ? '#757575' : '#2196F3');

          return (
            <div key={index} style={{...styles.tile, backgroundColor: bgColor}}>
              {isRevealed ? (
                <>
                  <span style={styles.answerText}>{answer.text}</span>
                  <span style={styles.points}>{answer.points}</span>
                </>
              ) : (
                <span style={styles.number}>{index + 1}</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Input Area */}
      {!isGameOver ? (
        <form onSubmit={handleGuess} style={styles.form}>
          <input
            type="text"
            value={guess}
            onChange={(e) => setGuess(e.target.value)}
            placeholder="Type your guess here..."
            style={styles.input}
            disabled={evaluating}
            autoFocus
          />
          <button type="submit" style={styles.button} disabled={evaluating}>
            {evaluating ? "Judging..." : "Guess"}
          </button>
        </form>
      ) : (
        <div style={styles.gameOver}>
          <h2>Game Over! {strikes >= 3 ? "You struck out." : "You cleared the board!"}</h2>
          <button onClick={() => window.location.reload()} style={styles.button}>Play Again</button>
        </div>
      )}
    </div>
  );
}

// --- Quick Inline Styles to avoid CSS file overhead ---
const styles = {
  container: { fontFamily: 'sans-serif', maxWidth: '800px', margin: '0 auto', padding: '20px', textAlign: 'center' as const },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  scoreBoard: { fontSize: '24px', fontWeight: 'bold', padding: '10px 20px', backgroundColor: '#333', color: '#fff', borderRadius: '8px' },
  strikes: { display: 'flex', gap: '5px' },
  question: { fontSize: '28px', marginBottom: '30px' },
  grid: { display: 'flex', flexDirection: 'column' as const, gap: '10px', marginBottom: '30px' },
  tile: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px', borderRadius: '8px', color: 'white', fontSize: '20px', fontWeight: 'bold', minHeight: '60px', border: '2px solid #000' },
  number: { margin: '0 auto', fontSize: '24px', color: '#fff', opacity: 0.5 },
  answerText: { flex: 1, textAlign: 'left' as const, marginLeft: '10px' },
  points: { borderLeft: '2px solid white', paddingLeft: '20px', minWidth: '40px', textAlign: 'center' as const },
  form: { display: 'flex', gap: '10px', justifyContent: 'center' },
  input: { padding: '15px', fontSize: '18px', width: '300px', borderRadius: '8px', border: '1px solid #ccc' },
  button: { padding: '15px 30px', fontSize: '18px', backgroundColor: '#333', color: 'white', borderRadius: '8px', border: 'none', cursor: 'pointer' },
  gameOver: { marginTop: '20px' }
};