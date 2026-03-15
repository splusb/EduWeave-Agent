import { useEffect, useState, useRef } from "react";

const BACKEND_URL = "https://eduweave-backend.onrender.com";

export default function LessonStream({ topic }) {
  const [blocks, setBlocks] = useState([]);
  const [status, setStatus] = useState("connecting");
  const [wordCount, setWordCount] = useState(0);
  const bottomRef = useRef(null);

  useEffect(() => {
    const url = `${BACKEND_URL}/lesson/stream?topic=${encodeURIComponent(topic)}`;
    const es = new EventSource(url);
    setBlocks([]);
    setStatus("connecting");
    setWordCount(0);

    es.addEventListener("text", (e) => {
      const { content } = JSON.parse(e.data);
      setWordCount((w) => w + content.split(" ").length);
      setStatus("streaming");
      setBlocks((prev) => {
        const last = prev[prev.length - 1];
        if (last && last.type === "text") {
          return [
            ...prev.slice(0, -1),
            { ...last, content: last.content + content },
          ];
        }
        return [...prev, { type: "text", content }];
      });
    });

    es.addEventListener("image_loading", (e) => {
      const { description } = JSON.parse(e.data);
      setBlocks((prev) => [
        ...prev,
        { type: "image", id: Date.now(), status: "loading", description },
      ]);
    });

    es.addEventListener("image", (e) => {
      const { url, description } = JSON.parse(e.data);
      setBlocks((prev) =>
        prev.map((b) =>
          b.type === "image" && b.status === "loading"
            ? { ...b, status: "ready", url, description }
            : b
        )
      );
    });

    es.addEventListener("image_error", () => {
      setBlocks((prev) =>
        prev.map((b) =>
          b.type === "image" && b.status === "loading"
            ? { ...b, status: "error" }
            : b
        )
      );
    });

    es.addEventListener("done", () => {
      setStatus("done");
      es.close();
    });

    es.onerror = (e) => {
      if (e.data) {
        const { message } = JSON.parse(e.data);
        setBlocks((prev) => [...prev, { type: "error", content: message }]);
      }
      setStatus("error");
      es.close();
    };

    return () => es.close();
  }, [topic]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [blocks]);

  const diagramCount = blocks.filter(
    (b) => b.type === "image" && b.status === "ready"
  ).length;

  return (
    <div className="lesson-container">

      {/* Header */}
      <div className="lesson-header">
        <div className="lesson-topic-pill">📚 {topic}</div>
        <div className="lesson-meta">
          {status === "streaming" && (
            <span className="meta-badge streaming">● Live</span>
          )}
          {status === "done" && (
            <>
              <span className="meta-badge done">✓ Complete</span>
              <span className="meta-stat">~{wordCount} words</span>
              <span className="meta-stat">{diagramCount} diagrams</span>
            </>
          )}
        </div>
      </div>

      {/* Connecting skeleton */}
      {status === "connecting" && (
        <div className="skeleton-wrap">
          <div className="skeleton-line w80" />
          <div className="skeleton-line w60" />
          <div className="skeleton-line w90" />
          <div className="skeleton-line w70" />
        </div>
      )}

      {/* Lesson body */}
      <div className="lesson-body">
        {blocks.map((block, i) => {
          if (block.type === "text") {
            return (
              <p key={i} className="lesson-text">
                {block.content}
              </p>
            );
          }

          if (block.type === "image") {
            return (
              <div key={i} className="diagram-block">
                {block.status === "loading" && (
                  <div className="diagram-loading">
                    <div className="diagram-loading-inner">
                      <div className="spinner" />
                      <div>
                        <div className="loading-title">Generating diagram...</div>
                        <div className="loading-desc">{block.description?.slice(0, 60)}...</div>
                      </div>
                    </div>
                  </div>
                )}
                {block.status === "ready" && (
                  <figure className="diagram-figure">
                    <div className="diagram-img-wrap">
                      <img src={block.url} alt={block.description} />
                    </div>
                    <figcaption>
                      <span className="diagram-label">📊 Diagram</span>
                      {block.description?.slice(0, 80)}...
                    </figcaption>
                  </figure>
                )}
                {block.status === "error" && (
                  <div className="diagram-error">
                    ⚠️ Diagram could not be generated
                  </div>
                )}
              </div>
            );
          }

          if (block.type === "error") {
            return (
              <div key={i} className="error-block">
                ❌ {block.content}
              </div>
            );
          }

          return null;
        })}

        {status === "streaming" && <span className="cursor">▋</span>}

        {/* Completion card */}
        {status === "done" && blocks.length > 0 && (
          <div className="completion-card">
            <div className="completion-icon">🎉</div>
            <div className="completion-text">
              <strong>Lesson complete!</strong>
              <p>You just learned about <em>{topic}</em> with {diagramCount} visual diagrams.</p>
            </div>
            <div className="completion-stats">
              <div className="stat">
                <span className="stat-num">~{wordCount}</span>
                <span className="stat-label">words</span>
              </div>
              <div className="stat">
                <span className="stat-num">{diagramCount}</span>
                <span className="stat-label">diagrams</span>
              </div>
              <div className="stat">
                <span className="stat-num">1</span>
                <span className="stat-label">lesson</span>
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}