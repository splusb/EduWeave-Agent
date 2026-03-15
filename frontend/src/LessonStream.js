import { useEffect, useState, useRef } from "react";

const BACKEND_URL = "https://eduweave-backend.onrender.com";

export default function LessonStream({ topic }) {
  const [blocks, setBlocks] = useState([]);
  const [status, setStatus] = useState("connecting");
  const bottomRef = useRef(null);

  useEffect(() => {
    const url = `${BACKEND_URL}/lesson/stream?topic=${encodeURIComponent(topic)}`;
    const es = new EventSource(url);

    setBlocks([]);
    setStatus("streaming");

    es.addEventListener("text", (e) => {
      const { content } = JSON.parse(e.data);
      setBlocks((prev) => {
        const last = prev[prev.length - 1];
        // Append to last text block if it exists, else create new
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
      const id = Date.now();
      setBlocks((prev) => [
        ...prev,
        { type: "image", id, status: "loading", description },
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

    es.addEventListener("error", (e) => {
      if (e.data) {
        const { message } = JSON.parse(e.data);
        setBlocks((prev) => [...prev, { type: "error", content: message }]);
      }
      setStatus("error");
      es.close();
    });

    return () => es.close();
  }, [topic]);

  // Auto-scroll as content streams in
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [blocks]);

  return (
    <div className="lesson-container">
      <div className="lesson-topic">
        <span>📚</span> {topic}
      </div>

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
                    <div className="spinner" />
                    <span>Generating diagram...</span>
                  </div>
                )}
                {block.status === "ready" && (
                  <figure>
                    <img src={block.url} alt={block.description} />
                    <figcaption>{block.description}</figcaption>
                  </figure>
                )}
                {block.status === "error" && (
                  <div className="diagram-error">
                    ⚠️ Diagram generation failed
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

        {status === "streaming" && (
          <span className="cursor">▋</span>
        )}

        {status === "done" && (
          <div className="done-badge">✅ Lesson complete</div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}