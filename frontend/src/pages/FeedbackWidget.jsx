import { useState } from "react";

export default function FeedbackWidget({ predictionId }) {
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showComment, setShowComment] = useState(false);

  async function handleSubmit() {
    if (!rating || submitting) return;
    setSubmitting(true);

    try {
      await fetch("http://localhost:8000/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prediction_id: predictionId,
          rating,
          comment: comment.trim() || null,
        }),
      });
      setSubmitted(true);
    } catch (err) {
      // fail quietly — feedback is a nice-to-have, not core functionality
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  }

  if (!predictionId) return null;

  if (submitted) {
    return (
      <div className="rentora-feedback rentora-feedback-done">
        Thanks for the feedback!
      </div>
    );
  }

  return (
    <div className="rentora-feedback">
      <span className="rentora-feedback-label">Was this estimate helpful?</span>

      <div className="rentora-feedback-stars">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            className="rentora-star"
            onMouseEnter={() => setHovered(n)}
            onMouseLeave={() => setHovered(0)}
            onClick={() => {
              setRating(n);
              setShowComment(true);
            }}
            aria-label={`Rate ${n} out of 5`}
          >
            {(hovered || rating) >= n ? "★" : "☆"}
          </button>
        ))}
      </div>

      {showComment && (
        <div className="rentora-feedback-comment-row">
          <input
            type="text"
            placeholder="Add a comment (optional)"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
          <button
            type="button"
            className="rentora-feedback-submit"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? "..." : "Submit"}
          </button>
        </div>
      )}
    </div>
  );
}