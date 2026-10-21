"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "../site";

const teachingOptions = [
  "Excel",
  "Canva & design",
  "Public speaking",
  "Yoruba",
  "French",
  "Guitar",
  "Portfolio review",
  "Budgeting",
];

const learningOptions = [
  "Yoruba",
  "Coding",
  "Brand design",
  "French",
  "Excel",
  "Guitar",
  "Public speaking",
  "Photography",
];

const timezones = [
  "Lagos (UTC+1)",
  "London (UTC+0)",
  "New York (UTC-5)",
  "Dubai (UTC+4)",
  "Johannesburg (UTC+2)",
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [teach, setTeach] = useState<string[]>(["Excel", "Canva & design"]);
  const [learn, setLearn] = useState<string[]>(["Yoruba", "French"]);
  const [timezone, setTimezone] = useState("Lagos (UTC+1)");
  const [availability, setAvailability] = useState("Weeknights, 6:00–9:00 PM");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadProfile() {
      try {
        const response = await fetch("/api/profile", { cache: "no-store" });
        if (!response.ok) {
          router.replace("/login");
          return;
        }

        const data = await response.json();
        if (data?.user?.onboardingComplete) {
          router.replace("/");
        }

        if (data?.user?.teaching?.length) setTeach(data.user.teaching);
        if (data?.user?.learning?.length) setLearn(data.user.learning);
        if (data?.user?.timezone) setTimezone(data.user.timezone);
        if (data?.user?.availability) setAvailability(data.user.availability);
      } catch {
        router.replace("/login");
      }
    }

    loadProfile();
  }, [router]);

  const progress = useMemo(() => ((step + 1) / 3) * 100, [step]);

  const toggleSkill = (value: string, target: "teach" | "learn") => {
    if (target === "teach") {
      setTeach((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value]);
      return;
    }

    setLearn((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value]);
  };

  const nextStep = () => {
    if (step === 0 && teach.length === 0) {
      setError("Choose at least one skill you can teach.");
      return;
    }
    if (step === 1 && learn.length === 0) {
      setError("Choose at least one skill you want to learn.");
      return;
    }
    setError("");
    setStep((current) => Math.min(current + 1, 2));
  };
  const prevStep = () => setStep((current) => Math.max(current - 1, 0));
  const isFinalStep = step === 2;

  async function finishOnboarding() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teaching: teach, learning: learn, timezone, availability }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Unable to save your profile.");
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      setError("We couldn’t reach the server. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell title="Onboarding">
      <div className="onboarding-wrap">
        <div className="onboarding-header">
          <div>
            <div className="eyebrow">WELCOME ABOARD</div>
            <h1>Set up your skill exchange profile.</h1>
          </div>
          <span className="starter-badge">+2 starter credits</span>
        </div>

        <div className="progress-bar" aria-label="Onboarding progress">
          <span style={{ width: `${progress}%` }} />
        </div>

        <div className="onboarding-card">
          {step === 0 && (
            <>
              <div className="eyebrow">STEP 1 OF 3</div>
              <h2>Skills you can teach</h2>
              <p className="lead">Pick a few things you enjoy sharing. One hour taught = 1 time credit.</p>

              <div className="pill-grid">
                {teachingOptions.map((option) => (
                  <button
                    key={option}
                    type="button"
                    className={`pill ${teach.includes(option) ? "selected" : ""}`}
                    onClick={() => toggleSkill(option, "teach")}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <div className="eyebrow">STEP 2 OF 3</div>
              <h2>Skills you want to learn</h2>
              <p className="lead">Tell the community what you want to explore next.</p>

              <div className="pill-grid">
                {learningOptions.map((option) => (
                  <button
                    key={option}
                    type="button"
                    className={`pill ${learn.includes(option) ? "selected" : ""}`}
                    onClick={() => toggleSkill(option, "learn")}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="eyebrow">STEP 3 OF 3</div>
              <h2>Availability & timezone</h2>
              <p className="lead">Help people find a time that works for both of you.</p>

              <div className="field-stack">
                <label className="field-wrap">
                  <span>Timezone</span>
                  <select value={timezone} onChange={(event) => setTimezone(event.target.value)}>
                    {timezones.map((value) => <option key={value} value={value}>{value}</option>)}
                  </select>
                </label>

                <label className="field-wrap">
                  <span>Availability</span>
                  <input value={availability} onChange={(event) => setAvailability(event.target.value)} />
                </label>
              </div>
            </>
          )}

          {error && <p className="form-error" role="alert">{error}</p>}

          <div className="onboarding-actions">
            {step > 0 && (
              <button type="button" className="button button-secondary" onClick={prevStep}>Back</button>
            )}

            {!isFinalStep ? (
              <button type="button" className="button button-primary" onClick={nextStep}>Continue</button>
            ) : (
              <button type="button" className="button button-primary" onClick={finishOnboarding} disabled={loading}>
                {loading ? "Saving profile..." : "Finish onboarding"}
              </button>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
