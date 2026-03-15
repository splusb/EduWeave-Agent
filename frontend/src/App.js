import { useState } from "react";
import LessonStream from "./LessonStream";
import "./App.css";

export default function App() {
  const [topic, setTopic] = useState("");
  const [activeTopic, setActiveTopic] = useState(null);

  const handleStart = () => {
    if (topic.trim()) setActiveTopic(topic.trim());
  };

  return (
    <div className="app">
      <header className="header">
        <h1>🎓 EduWeave AI</h1>
        <p>Learn anything through interleaved narration and diagrams</p>
      </header>

      <div className="search-bar">
        <input
          type="text"
          placeholder="e.g. How do neural networks learn?"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleStart()}
        />
        <button onClick={handleStart} disabled={!topic.trim()}>
          Teach me ✨
        </button>
      </div>

      {activeTopic && (
        <LessonStream
          topic={activeTopic}
          key={activeTopic}
        />
      )}
    </div>
  );
}