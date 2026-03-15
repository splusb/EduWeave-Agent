import { useState } from "react";
import LessonStream from "./LessonStream";
import "./App.css";

const EXAMPLE_TOPICS = [
  "How do neural networks learn?",
  "How does photosynthesis work?",
  "Explain quantum entanglement",
  "How does the immune system fight viruses?",
  "How do black holes form?",
  "How does DNA replication work?",
];

export default function App() {
  const [topic, setTopic] = useState("");
  const [activeTopic, setActiveTopic] = useState(null);

  const handleStart = (t) => {
    const finalTopic = t || topic;
    if (finalTopic.trim()) {
      setActiveTopic(finalTopic.trim());
      setTopic("");
    }
  };

  return (
    <div className="app">
      <header className="header">
        <div className="logo">
          <span className="logo-icon">🎓</span>
          <span className="logo-text">EduWeave <span className="logo-ai">AI</span></span>
        </div>
        <p className="tagline">
          Learn anything through AI-narrated lessons with auto-generated diagrams
        </p>

        <div className="search-bar">
          <input
            type="text"
            placeholder="What do you want to learn today?"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleStart()}
          />
          <button onClick={() => handleStart()} disabled={!topic.trim()}>
            Teach me ✨
          </button>
        </div>

        {!activeTopic && (
          <div className="examples">
            <p className="examples-label">Try an example:</p>
            <div className="example-chips">
              {EXAMPLE_TOPICS.map((t) => (
                <button
                  key={t}
                  className="chip"
                  onClick={() => handleStart(t)}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        )}
      </header>

      {activeTopic && (
        <>
          <LessonStream topic={activeTopic} key={activeTopic} />
          <div className="new-lesson-bar">
            <button
              className="new-lesson-btn"
              onClick={() => setActiveTopic(null)}
            >
              ← Start a new lesson
            </button>
          </div>
        </>
      )}
    </div>
  );
}