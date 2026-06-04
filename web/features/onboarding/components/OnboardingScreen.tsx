"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { QUESTIONS, useOnboardingFlow } from "../hooks/useOnboardingFlow";
import styles from "./OnboardingScreen.module.css";

const PRESET_GOALS = ["LEARN A NEW SKILL", "FITNESS JOURNEY", "MINDFULNESS"];
const ONBOARDING_ASSETS = {
  mochiCat: "/cat.webp",
} as const;

function MochiCatImage({ active = false }: { active?: boolean }) {
  return (
    <div className={styles.mochiWrapper}>
      <div className={`${styles.mochiPeek} ${active ? styles.mochiPeekActive : ""}`}>
        <Image
          src={ONBOARDING_ASSETS.mochiCat}
          alt="Mochi the black cat"
          width={128}
          height={128}
          className={styles.mochiImage}
        />
      </div>
    </div>
  );
}

export function OnboardingScreen() {
  const router = useRouter();
  const flow = useOnboardingFlow();

  if (flow.authLoading) {
    return <main className={styles.page}><div className={styles.loading}>Loading...</div></main>;
  }

  const totalSteps = QUESTIONS.length + 1;
  const currentStepNum = flow.step === "goal" ? 1 : flow.step === "questions" ? flow.questionIndex + 2 : totalSteps;
  const progressPercent = (currentStepNum / totalSteps) * 100;

  // ─── Shared Layout Wrapper ──────────────────────────────────────
  const renderLayout = (children: React.ReactNode, hideFooter = false, nextDisabled = false, onNext?: () => void, onBack?: () => void, nextLabel = "NEXT CHAPTER") => (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerTop}>
          <span className={styles.headerTitle}>Mochi Rescue</span>
          <span className={styles.headerStep}>STEP {currentStepNum}/{totalSteps}</span>
        </div>
        <div className={styles.progressTrack}>
          <div className={styles.progressFill} style={{ width: `${progressPercent}%` }} />
        </div>
      </header>

      <main className={styles.mainContainer}>
        {children}
      </main>

      {!hideFooter && (
        <footer className={styles.footer}>
          <div className={styles.footerInner}>
            {onBack ? (
              <button className={styles.backBtn} onClick={onBack}>
                Back
              </button>
            ) : <div />}
            <button
              className={`${styles.pencilBorder} ${styles.highlighterHover} ${styles.nextBtn}`}
              disabled={nextDisabled}
              onClick={onNext}
              style={{ opacity: nextDisabled ? 0.5 : 1, pointerEvents: nextDisabled ? "none" : "auto" }}
            >
              <span className={styles.nextBtnText}>{nextLabel}</span>
              <span className="material-symbols-outlined">arrow_forward</span>
            </button>
          </div>
        </footer>
      )}
    </div>
  );

  // ─── Step: Goal ────────────────────────────────────────────────
  if (flow.step === "goal") {
    const hasValue = flow.mainGoal.trim().length > 0;
    
    return renderLayout(
      <>
        <section className={styles.hero}>
          <MochiCatImage active={hasValue} />
          <h1 className={styles.title}>What&apos;s your goal?</h1>
          <p className={styles.subtitle}>Every big journey starts with a small sketch. Tell Mochi what you&apos;re aiming for.</p>
        </section>

        <section className={styles.interactionArea}>
          <div className={styles.contentBox}>
            {PRESET_GOALS.map((preset) => (
              <button 
                key={preset}
                className={`${styles.pencilBorder} ${styles.highlighterHover} ${styles.optionBtn} ${flow.mainGoal === preset ? styles.optionActive : ""}`}
                onClick={() => flow.setMainGoal(preset)}
              >
                <span className={styles.optionText}>{preset}</span>
                <span className={`material-symbols-outlined ${styles.optionIcon}`}>check_circle</span>
              </button>
            ))}

            <div className="mt-4 w-full">
              <p className={styles.divider}>OR WRITE YOUR OWN</p>
              <div className={`${styles.pencilBorder} ${styles.textareaWrapper}`}>
                <textarea
                  className={styles.textarea}
                  value={PRESET_GOALS.includes(flow.mainGoal) ? "" : flow.mainGoal}
                  onChange={(e) => flow.setMainGoal(e.target.value)}
                  placeholder="Describe your unique goal here..."
                />
                <div className={styles.textareaDeco} />
              </div>
            </div>
          </div>
        </section>
      </>,
      false,
      !hasValue,
      () => flow.setStep("questions")
    );
  }

  // ─── Step: Questions ──────────────────────────────────────────
  if (flow.step === "questions") {
    const question = QUESTIONS[flow.questionIndex];
    const isLast = flow.questionIndex === QUESTIONS.length - 1;
    const hasAnswer = !!flow.answers[question.id];

    return renderLayout(
      <>
        <section className={styles.hero}>
          <MochiCatImage active={hasAnswer} />
          <h1 className={styles.title}>{question.question}</h1>
          <p className={styles.subtitle}>Help us tailor your journey.</p>
        </section>

        <section className={styles.interactionArea}>
          <div className={styles.contentBox}>
            {question.options.map((option) => {
              const active = flow.answers[question.id] === option;
              return (
                <button
                  key={option}
                  className={`${styles.pencilBorder} ${styles.highlighterHover} ${styles.optionBtn} ${active ? styles.optionActive : ""}`}
                  onClick={() => flow.setAnswer(question.id, option)}
                >
                  <span className={styles.optionText}>{option}</span>
                  <span className={`material-symbols-outlined ${styles.optionIcon}`}>check_circle</span>
                </button>
              );
            })}
            {flow.error && <p className={styles.error}>{flow.error}</p>}
          </div>
        </section>
      </>,
      false,
      !hasAnswer,
      () => (isLast ? void flow.forge() : flow.setQuestionIndex(flow.questionIndex + 1)),
      () => (flow.questionIndex === 0 ? flow.setStep("goal") : flow.setQuestionIndex(flow.questionIndex - 1)),
      isLast ? "FORGE ARC" : "NEXT CHAPTER"
    );
  }

  // ─── Step: Loading ────────────────────────────────────────────
  if (flow.step === "loading") {
    return renderLayout(
      <section className={styles.hero}>
        <MochiCatImage active />
        <h1 className={styles.title}>Forging your arc...</h1>
        <p className={styles.subtitle}>Mochi is untangling the yarn.</p>
      </section>,
      true
    );
  }

  // ─── Step: Result ─────────────────────────────────────────────
  if (flow.result) {
    return renderLayout(
      <>
         <section className={styles.hero}>
          <h1 className={styles.title}>Arc forged!</h1>
          <p className={styles.subtitle}>{flow.result.active_arc.arc_name}</p>
        </section>
        <section className={styles.interactionArea}>
          <div className={styles.contentBox}>
             {flow.result.active_arc.milestones.map((milestone) => (
                <div key={milestone.week_number} className={`${styles.pencilBorder} p-4`}>
                  <p className={styles.divider}>WEEK {milestone.week_number}</p>
                  <p className={styles.optionText}>{milestone.objective}</p>
                </div>
             ))}
          </div>
        </section>
      </>,
      false,
      false,
      () => router.push("/daily-plan"),
      undefined,
      "GO TO DAILY PLAN"
    );
  }

  return null;
}
