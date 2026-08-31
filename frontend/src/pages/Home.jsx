import { useState } from "react";
import { useAuth } from "../context/AuthContext";

export default function Home() {
  const { currentUser, logout } = useAuth();
  const [form, setForm] = useState({
    city: "",
    locality: "",
    bhk: 1,
    size_sqft: "",
    furnishing: "Unfurnished",
    bathrooms: 1,
    near_highway: 0,
    near_mall: 0,
    near_river: 0,
    near_mountain: 0
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? (checked ? 1 : 0) : value
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setResult(null);
    setLoading(true);

    try {
      const res = await fetch("http://localhost:8000/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          bhk: Number(form.bhk),
          size_sqft: Number(form.size_sqft),
          bathrooms: Number(form.bathrooms)
        })
      });

      if (!res.ok) throw new Error("Prediction request failed");

      const data = await res.json();
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h2>Welcome, {currentUser?.email}</h2>
      <button onClick={logout}>Log Out</button>

      <h3>Predict Rent</h3>
      <form onSubmit={handleSubmit}>
        <input name="city" placeholder="City" value={form.city} onChange={handleChange} required />
        <input name="locality" placeholder="Locality" value={form.locality} onChange={handleChange} required />
        <input name="bhk" type="number" min="1" placeholder="BHK" value={form.bhk} onChange={handleChange} required />
        <input name="size_sqft" type="number" placeholder="Size (sqft)" value={form.size_sqft} onChange={handleChange} required />
        <input name="bathrooms" type="number" min="1" placeholder="Bathrooms" value={form.bathrooms} onChange={handleChange} required />

        <select name="furnishing" value={form.furnishing} onChange={handleChange}>
          <option value="Unfurnished">Unfurnished</option>
          <option value="Semi-Furnished">Semi-Furnished</option>
          <option value="Furnished">Furnished</option>
        </select>

        <label><input type="checkbox" name="near_highway" onChange={handleChange} /> Near Highway</label>
        <label><input type="checkbox" name="near_mall" onChange={handleChange} /> Near Mall</label>
        <label><input type="checkbox" name="near_river" onChange={handleChange} /> River View</label>
        <label><input type="checkbox" name="near_mountain" onChange={handleChange} /> Mountain Facing</label>

        <button type="submit" disabled={loading}>
          {loading ? "Predicting..." : "Predict Rent"}
        </button>
      </form>

      {error && <p style={{ color: "red" }}>{error}</p>}
      {result && (
        <div>
          <h4>Predicted Rent: ₹{result.predicted_rent}</h4>
          <p>{result.city}, {result.locality}</p>
        </div>
      )}
    </div>
  );
}