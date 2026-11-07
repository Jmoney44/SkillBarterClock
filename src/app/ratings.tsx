"use client";

import { useState } from "react";

export type TeacherReview = {
  id: string;
  rating: number;
  comment: string;
  skill: string;
  reviewer_first_name: string;
  created_at: string;
};

export function Stars({ rating, label }: { rating: number; label?: string }) {
  const rounded = Math.round(rating);
  return (
    <span className="stars" role="img" aria-label={label ?? `${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <span key={star} aria-hidden="true" className={star <= rounded ? "star-on" : "star-off"}>★</span>
      ))}
    </span>
  );
}

/** "★ 4.8 · 12 reviews", or a "New" label when there are no reviews yet. */
export function RatingSummary({ average, count }: { average: number | string | null | undefined; count: number | null | undefined }) {
  const total = Number(count ?? 0);
  if (!total || average === null || average === undefined) {
    return <span className="rating-summary rating-new">New · no reviews yet</span>;
  }
  const value = Number(average);
  return (
    <span className="rating-summary" aria-label={`Rated ${value.toFixed(1)} out of 5 from ${total} review${total === 1 ? "" : "s"}`}>
      <span className="star-on" aria-hidden="true">★</span> <b>{value.toFixed(1)}</b> · {total} review{total === 1 ? "" : "s"}
    </span>
  );
}

export function ReviewList({ reviews }: { reviews: TeacherReview[] }) {
  return (
    <div className="review-list">
      {reviews.map((review) => (
        <article className="review-item" key={review.id}>
          <div className="review-item-top">
            <Stars rating={review.rating} />
            <span>{review.reviewer_first_name} · {review.skill} · {new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(review.created_at))}</span>
          </div>
          {review.comment && <p>{review.comment}</p>}
        </article>
      ))}
    </div>
  );
}

const ratingWords = ["", "Poor", "Fair", "Good", "Great", "Excellent"];

/** The learner's review form for a completed session (create or edit). */
export function ReviewForm({
  sessionId,
  initialRating,
  initialComment,
  onSaved,
  onCancel,
}: {
  sessionId: string;
  initialRating?: number | null;
  initialComment?: string | null;
  onSaved: () => void | Promise<void>;
  onCancel?: () => void;
}) {
  const [rating, setRating] = useState(initialRating ?? 0);
  const [comment, setComment] = useState(initialComment ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!rating) {
      setError("Choose a rating from 1 to 5 stars.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, rating, comment }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Could not save your review.");
        return;
      }
      await onSaved();
    } catch {
      setError("We couldn’t reach the server. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="review-form" onSubmit={submit}>
      <fieldset className="star-input">
        <legend>Your rating</legend>
        {[1, 2, 3, 4, 5].map((star) => (
          <label key={star} className={star <= rating ? "star-on" : "star-off"}>
            <input
              type="radio"
              name={`rating-${sessionId}`}
              value={star}
              checked={rating === star}
              onChange={() => {
                setRating(star);
                setError("");
              }}
            />
            <span aria-hidden="true">★</span>
            <span className="visually-hidden">{star} star{star === 1 ? "" : "s"}, {ratingWords[star]}</span>
          </label>
        ))}
        <span className="star-input-word" aria-hidden="true">{ratingWords[rating]}</span>
      </fieldset>
      <label className="field-wrap meeting-field">
        <span>Comment <small>(optional)</small></span>
        <textarea
          rows={3}
          maxLength={500}
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          placeholder="What was helpful? Other learners will see this with your first name."
        />
      </label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="meeting-editor-actions">
        <button className="button button-primary small-button" type="submit" disabled={saving}>
          {saving ? "Saving…" : initialRating ? "Update review" : "Submit review"}
        </button>
        {onCancel && <button className="button button-secondary small-button" type="button" disabled={saving} onClick={onCancel}>Cancel</button>}
      </div>
    </form>
  );
}
