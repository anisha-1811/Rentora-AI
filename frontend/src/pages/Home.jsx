import { useState, useRef, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import "./Home.css";

// Fix Leaflet's default marker icons not loading correctly with Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const WELCOME_MESSAGE = {
  sender: "bot",
  text: "Hi! Tell me what kind of place you're looking for — city, locality, size, furnishing — and I'll estimate the rent for you.",
};

function FeedbackWidget({ predictionId }) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [showComment, setShowComment] = useState(false);
  const [status, setStatus] = useState("idle"); // idle | sending | sent | error

  async function submit(selectedRating) {
    setRating(selectedRating);
    setStatus("sending");
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:8000"}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prediction_id: predictionId,
          rating: selectedRating,
          comment: comment.trim() || null,
        }),
      });
      const data = await res.json();
      // Backend returns { "success": true, "message": "..." } on success
      setStatus(data.success ? "sent" : "error");
    } catch {
      setStatus("error");
    }
  }

  if (!predictionId) return null;

  if (status === "sent") {
    return <div className="rentora-feedback rentora-feedback-done">Thanks for your feedback!</div>;
  }

  return (
    <div className="rentora-feedback">
      <span className="rentora-feedback-label">Was this estimate helpful?</span>
      <div className="rentora-stars">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            className={`rentora-star ${(hoverRating || rating) >= n ? "rentora-star-filled" : ""}`}
            onMouseEnter={() => setHoverRating(n)}
            onMouseLeave={() => setHoverRating(0)}
            onClick={() => {
              setShowComment(true);
              if (status !== "sending") submit(n);
            }}
            disabled={status === "sending"}
            aria-label={`Rate ${n} out of 5`}
          >
            ★
          </button>
        ))}
      </div>
      {showComment && status !== "sending" && (
        <div className="rentora-feedback-comment">
          <input
            type="text"
            placeholder="Anything you'd add? (optional)"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            onBlur={() => {
              if (rating) submit(rating);
            }}
          />
        </div>
      )}
      {status === "error" && (
        <span className="rentora-feedback-error">Couldn't save that — please try again.</span>
      )}
    </div>
  );
}

export default function Home() {
  const { currentUser, logout } = useAuth();
  const [messages, setMessages] = useState([WELCOME_MESSAGE]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  // Running memory of fields gathered across turns (city, locality, bhk, etc.)
  // Sent to /chat every turn so the backend can merge instead of starting over.
  const [knownFields, setKnownFields] = useState({});
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function sendMessage(e) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const userMessage = { sender: "user", text: trimmed };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:8000"}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed, known_fields: knownFields }),
      });

      if (!res.ok) throw new Error("Request failed");

      const data = await res.json();

      setMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text: data.reply,
          prediction: data.prediction || null,
        },
      ]);

      if (data.prediction) {
        // Prediction succeeded — reset memory so the next search starts fresh
        setKnownFields({});
      } else {
        // Still gathering info — keep the merged fields the backend sent back
        setKnownFields(data.known_fields || {});
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text: "Something went wrong reaching the server. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rentora-app">
      <header className="rentora-header">
        <span className="rentora-wordmark">Rentora AI</span>
        <div className="rentora-header-right">
          <span className="rentora-user-email">{currentUser?.email}</span>
          <button className="rentora-logout-btn" onClick={logout}>
            Log out
          </button>
        </div>
      </header>

      <main className="rentora-chat">
        {messages.map((msg, i) => (
          <div key={i} className={`rentora-row rentora-row-${msg.sender}`}>
            <div className={`rentora-bubble rentora-bubble-${msg.sender}`}>
              {msg.text}
            </div>

            {msg.prediction && msg.prediction.predicted_rent != null && (
              <div className="rentora-card">
                <div className="rentora-card-top">
                  <span className="rentora-card-label">Estimated rent</span>
                  <span className="rentora-card-rent">
                    ₹{msg.prediction.predicted_rent.toLocaleString("en-IN")}
                    <span className="rentora-card-permonth">/month</span>
                  </span>
                </div>
                <div className="rentora-card-location">
                  {msg.prediction.locality}, {msg.prediction.city}
                </div>

                {msg.prediction.latitude && msg.prediction.longitude && (
                  <div className="rentora-card-map">
                    <MapContainer
                      center={[msg.prediction.latitude, msg.prediction.longitude]}
                      zoom={13}
                      scrollWheelZoom={false}
                      style={{ height: "100%", width: "100%" }}
                    >
                      <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      />
                      <Marker
                        position={[msg.prediction.latitude, msg.prediction.longitude]}
                      >
                        <Popup>
                          {msg.prediction.locality}, {msg.prediction.city}
                          <br />
                          ₹{msg.prediction.predicted_rent.toLocaleString("en-IN")}/mo
                        </Popup>
                      </Marker>
                    </MapContainer>
                  </div>
                )}

                <FeedbackWidget predictionId={msg.prediction.prediction_id} />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="rentora-row rentora-row-bot">
            <div className="rentora-bubble rentora-bubble-bot rentora-typing">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </main>

      <form className="rentora-inputbar" onSubmit={sendMessage}>
        <input
          type="text"
          placeholder="Describe the place you're looking for..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading}
        />
        <button type="submit" disabled={loading || !input.trim()}>
          Send
        </button>
      </form>
    </div>
  );
}