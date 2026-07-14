import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Check, ChevronLeft, ChevronRight, Flame, Loader2, X, Play, Pause,
  ArrowRight, FlaskConical, ExternalLink, RotateCcw,
} from "lucide-react";

// ---- Cycle config -----------------------------------------------------
const CYCLE = ["Push", "Pull", "Rest"];
const CYCLE_META = {
  Push: { color: "#F2994A", soft: "rgba(242,153,74,0.16)", label: "Push", sub: "Chest · Shoulders · Triceps" },
  Pull: { color: "#4FA8C9", soft: "rgba(79,168,201,0.16)", label: "Pull", sub: "Back · Biceps" },
  Rest: { color: "#7C8B7A", soft: "rgba(124,139,122,0.16)", label: "Rest", sub: "Recovery day" },
};

const MS_DAY = 86400000;
const DONE_COLOR = "#4CD07D";
const BETA_TIMER = 8;
const STORE_KEY = "rota:state:v2";

// Demo image loading strategy:
// 1. wsrv.nl proxy (bypasses hotlink blocking, serves animated GIF with open CORS)
// 2. direct fitnessprogramer URL
// 3. an alternate image from a second fitness site (when available)
// 4. wsrv.nl proxy of the alternate
// If ALL fail, the app falls back to a built-in motion animation + video button,
// so the workout screen always shows a demo.
const px = (u) => `https://wsrv.nl/?url=${encodeURIComponent(u)}&n=-1`;
const fp = (path) => `fitnessprogramer.com/wp-content/uploads/${path}`;
const chain = (path, alt) => {
  const direct = `https://${fp(path)}`;
  const list = [px(fp(path)), direct];
  if (alt) list.push(alt, px(alt.replace(/^https?:\/\//, "")));
  return list;
};
const YT = (q) => `https://www.youtube.com/results?search_query=${encodeURIComponent(q + " exercise proper form")}`;

// ---- Workout data -------------------------------------------------------
// GIF paths verified against fitnessprogramer.com where marked ✓.
const PUSH_MAIN = [
  {
    id: "push-chest-press", name: "Standing Dumbbell Chest Press", muscle: "Chest",
    type: "reps", sets: 3, reps: 12, anim: "press",
    srcs: chain("2021/09/Dumbbell-Standing-Palms-In-Press.gif"),
    cue: "Stand tall, dumbbells at chest height, elbows tucked in. Press both straight forward until arms lock, then pull back slowly.",
  },
  {
    id: "push-svend", name: "Standing Svend Press", muscle: "Chest (inner)",
    type: "reps", sets: 3, reps: 12, anim: "press",
    srcs: chain("2021/06/Svend-Press.gif"),
    cue: "Squeeze one dumbbell hard between both palms at chest height. Press it straight out, keep squeezing, then return.",
  },
  {
    id: "push-shoulder-press", name: "Dumbbell Shoulder Press", muscle: "Shoulders",
    type: "reps", sets: 3, reps: 10, anim: "overhead",
    srcs: chain("2021/02/Dumbbell-Shoulder-Press.gif", // ✓ verified
      "https://app-media.fitbod.me/v2/120/images/landscape/0_960x540.jpg"),
    cue: "Dumbbells at ear height, elbows out. Press straight overhead until arms lock, then lower under control.",
  },
  {
    id: "push-lateral-raise", name: "Dumbbell Lateral Raise", muscle: "Shoulders (side)",
    type: "reps", sets: 3, reps: 12, anim: "raise",
    srcs: chain("2021/02/Dumbbell-Lateral-Raise.gif", // ✓ verified
      "https://app-media.fitbod.me/v2/121/images/landscape/0_960x540.jpg"),
    cue: "Arms at your sides, slight bend in the elbows. Raise out sideways to shoulder height, no higher. Lower slowly.",
  },
  {
    id: "push-kickback", name: "Dumbbell Triceps Kickback", muscle: "Triceps",
    type: "reps", sets: 3, reps: 12, anim: "hinge",
    srcs: chain("2021/02/Dumbbell-Kickback.gif", // ✓ verified
      "https://app-media.fitbod.me/v2/113/images/landscape/0_960x540.jpg"),
    cue: "Hinge forward, upper arms pinned to your ribs. Only the forearms move: straighten back, squeeze, return.",
  },
];

const PULL_MAIN = [
  {
    id: "pull-deadlift", name: "Barbell Deadlift (W-bar)", muscle: "Back / Legs",
    type: "reps", sets: 3, reps: 8, anim: "hinge",
    srcs: chain("2021/02/Barbell-Deadlift.gif"), // ✓ verified
    cue: "Bar over mid-foot, back flat, chest up. Drive through your heels and stand tall. Hinge back down, don't round the back.",
  },
  {
    id: "pull-row", name: "Standing Dumbbell Bent-Over Row", muscle: "Back",
    type: "reps", sets: 3, reps: 12, anim: "hinge",
    srcs: chain("2021/02/Dumbbell-Bent-Over-Row.gif",
      "https://weighttraining.guide/wp-content/uploads/2016/10/bent-over-one-arm-dumbbell-row-resized.png"),
    cue: "Hinge forward about 45°, back flat. Pull the dumbbells to your ribs, elbows back, squeeze the shoulder blades.",
  },
  {
    id: "pull-ez-curl", name: "EZ-Bar Bicep Curl", muscle: "Biceps",
    type: "reps", sets: 3, reps: 12, anim: "curl",
    srcs: chain("2021/02/EZ-Bar-Curl.gif",
      "https://app-media.fitbod.me/v2/102/images/landscape/0_960x540.jpg"),
    cue: "Grip the W-bar underhand. Elbows locked at your sides — curl up, squeeze, lower slowly. No swinging.",
  },
  {
    id: "pull-hammer", name: "Dumbbell Hammer Curl", muscle: "Biceps",
    type: "reps", sets: 3, reps: 12, anim: "curl",
    srcs: chain("2021/02/Hammer-Curl.gif",
      "https://app-media.fitbod.me/v2/158/images/landscape/0_960x540.jpg"),
    cue: "Same as a curl, but palms face each other the whole way (thumbs up, like holding a hammer).",
  },
  {
    id: "pull-reverse-row", name: "Barbell Reverse-Grip Bent-Over Row", muscle: "Back / Biceps",
    type: "reps", sets: 3, reps: 12, anim: "hinge",
    srcs: chain("2021/02/Reverse-Grip-Bent-Over-Row.gif"),
    cue: "W-bar with an underhand grip. Hinge forward, pull the bar to your belly button, elbows tight to your body.",
  },
];

const ABS = [
  {
    id: "abs-crunch", name: "Crunches", muscle: "Core", type: "timer", duration: 60, anim: "core",
    srcs: chain("2021/02/Crunch.gif",
      "https://weighttraining.guide/wp-content/uploads/2016/05/Crunch-resized.png"),
    cue: "On your back, knees bent. Lift your shoulder blades off the floor, hands to the head, don't pull on your neck.",
  },
  {
    id: "abs-bicycle", name: "Bicycle Crunch", muscle: "Core", type: "timer", duration: 60, anim: "core",
    srcs: chain("2021/02/Bicycle-Crunch.gif",
      "https://weighttraining.guide/wp-content/uploads/2016/11/bicycle-crunch-resized-1.png"),
    cue: "On your back. Bring the opposite elbow and knee together, alternating, while the other leg extends out.",
  },
  {
    id: "abs-leg-raise", name: "Leg Raise", muscle: "Core (lower)", type: "timer", duration: 60, anim: "core",
    srcs: chain("2021/02/Lying-Leg-Raise.gif",
      "https://app-media.fitbod.me/v2/233/images/landscape/0_960x540.jpg"),
    cue: "Flat on your back, legs straight. Raise them to vertical, then lower slowly without letting the heels touch the floor.",
  },
  {
    id: "abs-russian", name: "Russian Twist", muscle: "Core (obliques)", type: "timer", duration: 60, anim: "twist",
    srcs: chain("2021/02/Russian-Twist.gif",
      "https://spotebi.com/wp-content/uploads/2015/04/russian-twist-exercise-illustration.jpg"),
    cue: "Sit, lean back, heels up. Rotate your torso side to side, tapping the floor next to each hip.",
  },
  {
    id: "abs-climbers", name: "Mountain Climbers", muscle: "Core / Cardio", type: "timer", duration: 60, anim: "climb",
    srcs: chain("2021/02/Mountain-Climber.gif",
      "https://spotebi.com/wp-content/uploads/2014/10/mountain-climbers-exercise-illustration.jpg"),
    cue: "Push-up position, hands under shoulders. Drive the knees to your chest one at a time, fast, hips low.",
  },
  {
    id: "abs-heel-touch", name: "Heel Touches", muscle: "Core (obliques)", type: "timer", duration: 60, anim: "twist",
    srcs: chain("2021/06/Heel-Touch.gif"),
    cue: "On your back, knees bent, feet flat, shoulders slightly lifted. Reach side to side and tap each heel with your hand.",
  },
  {
    id: "abs-plank", name: "Plank", muscle: "Core", type: "timer", duration: 60, anim: "plank",
    srcs: chain("2021/02/Plank.gif",
      "https://app-media.fitbod.me/v2/270/images/landscape/0_960x540.jpg"),
    cue: "Forearms under shoulders, body in one straight line from head to heels. Squeeze the glutes, don't let the hips sag.",
  },
];

const EXERCISES = { Push: [...PUSH_MAIN, ...ABS], Pull: [...PULL_MAIN, ...ABS], Rest: [] };
const BETA_DAY = [PUSH_MAIN[2], PUSH_MAIN[3], { ...ABS[5], duration: 10 }, { ...ABS[6], duration: 10 }];

// ---- Date helpers -------------------------------------------------------
const toKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const dayTypeFor = (date, anchor) =>
  CYCLE[((Math.round((startOfDay(date) - startOfDay(anchor)) / MS_DAY) % 3) + 3) % 3];
const formatTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

// ---- Built-in motion animation (last-resort fallback, always works) ------
function MotionFallback({ kind, color }) {
  const dot = { position: "absolute", borderRadius: 6, background: color };
  const body = { position: "absolute", borderRadius: 4, background: "#EDEFF2" };
  return (
    <div style={{ position: "relative", width: 120, height: 120 }}>
      {kind === "overhead" && (<>
        <div style={{ ...body, left: 54, top: 34, width: 12, height: 52 }} />
        <div style={{ ...body, left: 51, top: 18, width: 18, height: 18, borderRadius: "50%" }} />
        <div className="mf-up" style={{ ...dot, left: 30, top: 30, width: 14, height: 14 }} />
        <div className="mf-up" style={{ ...dot, left: 76, top: 30, width: 14, height: 14 }} />
      </>)}
      {kind === "press" && (<>
        <div style={{ ...body, left: 24, top: 34, width: 12, height: 52 }} />
        <div style={{ ...body, left: 21, top: 18, width: 18, height: 18, borderRadius: "50%" }} />
        <div className="mf-fwd" style={{ ...dot, left: 52, top: 46, width: 14, height: 14 }} />
      </>)}
      {kind === "raise" && (<>
        <div style={{ ...body, left: 54, top: 30, width: 12, height: 56 }} />
        <div style={{ ...body, left: 51, top: 14, width: 18, height: 18, borderRadius: "50%" }} />
        <div className="mf-raise-l" style={{ ...dot, left: 26, top: 72, width: 13, height: 13 }} />
        <div className="mf-raise-r" style={{ ...dot, left: 81, top: 72, width: 13, height: 13 }} />
      </>)}
      {kind === "curl" && (<>
        <div style={{ ...body, left: 54, top: 30, width: 12, height: 56 }} />
        <div style={{ ...body, left: 51, top: 14, width: 18, height: 18, borderRadius: "50%" }} />
        <div className="mf-curl" style={{ ...dot, left: 76, top: 78, width: 14, height: 14 }} />
      </>)}
      {kind === "hinge" && (<>
        <div className="mf-hinge" style={{ ...body, left: 40, top: 30, width: 12, height: 46, transformOrigin: "bottom center" }} />
        <div style={{ ...body, left: 46, top: 74, width: 11, height: 34 }} />
        <div className="mf-updown" style={{ ...dot, left: 24, top: 82, width: 14, height: 14 }} />
      </>)}
      {kind === "core" && (<>
        <div style={{ ...body, left: 22, top: 84, width: 76, height: 9 }} />
        <div className="mf-crunch" style={{ ...body, left: 22, top: 58, width: 10, height: 30, transformOrigin: "bottom center" }} />
        <div style={{ ...dot, left: 88, top: 70, width: 12, height: 12 }} />
      </>)}
      {kind === "twist" && (<>
        <div style={{ ...body, left: 54, top: 58, width: 12, height: 36 }} />
        <div className="mf-twist" style={{ ...dot, left: 46, top: 34, width: 28, height: 12 }} />
      </>)}
      {kind === "climb" && (<>
        <div style={{ ...body, left: 24, top: 62, width: 72, height: 9, transform: "rotate(8deg)" }} />
        <div className="mf-climb-a" style={{ ...dot, left: 68, top: 80, width: 12, height: 12 }} />
        <div className="mf-climb-b" style={{ ...dot, left: 86, top: 80, width: 12, height: 12 }} />
      </>)}
      {kind === "plank" && (<>
        <div className="mf-plank" style={{ ...body, left: 22, top: 66, width: 76, height: 9 }} />
        <div style={{ ...body, left: 12, top: 60, width: 16, height: 16, borderRadius: "50%" }} />
      </>)}
    </div>
  );
}

// ---- Demo: walks the source chain; guaranteed fallback ---------------------
function ExerciseDemo({ exercise, color, size = 190 }) {
  const [idx, setIdx] = useState(0);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => { setIdx(0); setLoaded(false); }, [exercise.id]);

  const exhausted = idx >= exercise.srcs.length;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
      <div style={{
        ...styles.demoStage, width: size, height: size,
        background: exhausted ? "#1E232B" : "#F4F5F7",
      }}>
        {!exhausted && (
          <img
            key={exercise.id + ":" + idx}
            src={exercise.srcs[idx]}
            alt={exercise.name}
            onLoad={() => setLoaded(true)}
            onError={() => { setLoaded(false); setIdx((i) => i + 1); }}
            style={{ ...styles.demoImg, display: loaded ? "block" : "none" }}
          />
        )}
        {!exhausted && !loaded && <Loader2 size={20} color="#8A93A0" className="rota-spin" />}
        {exhausted && <MotionFallback kind={exercise.anim} color={color} />}
      </div>
      <a href={YT(exercise.name)} target="_blank" rel="noreferrer"
        style={{ ...styles.videoLink, borderColor: color + "66", color }}>
        <Play size={11} fill={color} /> Watch full video
      </a>
    </div>
  );
}

function Thumb({ exercise }) {
  const [idx, setIdx] = useState(0);
  if (idx >= exercise.srcs.length) return <div style={{ ...styles.thumb, background: "#22262E" }} />;
  return (
    <img
      key={exercise.id + ":" + idx}
      src={exercise.srcs[idx]}
      alt=""
      onError={() => setIdx((i) => i + 1)}
      style={styles.thumb}
    />
  );
}

// =========================================================================
export default function RotaApp() {
  const [loading, setLoading] = useState(true);
  const [anchor, setAnchor] = useState(null);
  const [completed, setCompleted] = useState({});
  const [progress, setProgress] = useState({});
  const [beta, setBeta] = useState(false);
  const [today] = useState(startOfDay(new Date()));
  const [viewMonth, setViewMonth] = useState(() => {
    const t = new Date();
    return new Date(t.getFullYear(), t.getMonth(), 1);
  });
  const [saveState, setSaveState] = useState("idle");
  const [dayScreenKey, setDayScreenKey] = useState(null);
  const [session, setSession] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await window.storage.get(STORE_KEY);
        if (res && res.value) {
          const p = JSON.parse(res.value);
          setAnchor(p.anchor ? new Date(p.anchor) : startOfDay(new Date()));
          setCompleted(p.completed || {});
          setProgress(p.progress || {});
        } else setAnchor(startOfDay(new Date()));
      } catch {
        setAnchor(startOfDay(new Date()));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const persist = useCallback(async (a, c, pr) => {
    setSaveState("saving");
    try {
      await window.storage.set(STORE_KEY, JSON.stringify({
        anchor: a.toISOString(), completed: c, progress: pr,
      }));
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 900);
    } catch { setSaveState("idle"); }
  }, []);

  useEffect(() => {
    if (!loading && anchor) persist(anchor, completed, progress);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [completed, progress]);

  const streak = useMemo(() => {
    if (!anchor) return 0;
    let count = 0, cursor = today;
    while (count < 400) {
      const t = dayTypeFor(cursor, anchor);
      if (!(t === "Rest" || completed[toKey(cursor)])) break;
      count++; cursor = addDays(cursor, -1);
    }
    return count;
  }, [anchor, completed, today]);

  const rhythm = useMemo(() => {
    if (!anchor) return [];
    return Array.from({ length: 15 }, (_, i) => {
      const d = addDays(today, i - 7);
      return { key: toKey(d), type: dayTypeFor(d, anchor), isToday: i === 7 };
    });
  }, [anchor, today]);

  const monthGrid = useMemo(() => {
    if (!anchor) return [];
    const y = viewMonth.getFullYear(), m = viewMonth.getMonth();
    const cells = Array(new Date(y, m, 1).getDay()).fill(null);
    for (let d = 1; d <= new Date(y, m + 1, 0).getDate(); d++) {
      const date = new Date(y, m, d);
      cells.push({ date, key: toKey(date), type: dayTypeFor(date, anchor) });
    }
    return cells;
  }, [anchor, viewMonth]);

  const todayKey = toKey(today);
  const todayType = anchor ? dayTypeFor(today, anchor) : null;

  const dayScreenDate = useMemo(() => {
    if (!dayScreenKey) return null;
    if (dayScreenKey === "beta") return today;
    const [y, m, d] = dayScreenKey.split("-").map(Number);
    return new Date(y, m - 1, d);
  }, [dayScreenKey, today]);

  const dayScreenType = dayScreenKey === "beta" ? "Push"
    : (dayScreenDate && anchor ? dayTypeFor(dayScreenDate, anchor) : null);
  const dayScreenExercises = dayScreenKey === "beta" ? BETA_DAY : (EXERCISES[dayScreenType] || []);
  const dayDoneIds = dayScreenKey && dayScreenKey !== "beta" ? (progress[dayScreenKey] || []) : [];

  // ---- Exercise done toggling (mark + UNMARK) ----
  const toggleExercise = (dateKey, exerciseId) => {
    if (dateKey === "beta") return;
    setProgress((prev) => {
      const list = prev[dateKey] || [];
      const next = list.includes(exerciseId)
        ? list.filter((id) => id !== exerciseId)
        : [...list, exerciseId];
      const copy = { ...prev };
      if (next.length) copy[dateKey] = next; else delete copy[dateKey];
      return copy;
    });
  };
  const markExerciseDone = (dateKey, exerciseId) => {
    if (dateKey === "beta") return;
    setProgress((prev) => {
      const list = prev[dateKey] || [];
      if (list.includes(exerciseId)) return prev;
      return { ...prev, [dateKey]: [...list, exerciseId] };
    });
  };

  const startWorkout = (key, type, list) => {
    const exercises = (list || []).map((ex) =>
      beta && ex.type === "timer" ? { ...ex, duration: Math.min(ex.duration, BETA_TIMER) } : ex
    );
    if (!exercises.length) return;
    const doneIds = key === "beta" ? [] : (progress[key] || []);
    let start = exercises.findIndex((ex) => !doneIds.includes(ex.id));
    if (start === -1) start = 0;
    const ex = exercises[start];
    setSession({
      dateKey: key, type, exercises, index: start,
      timerLeft: ex.type === "timer" ? ex.duration : null,
      timerRunning: true, done: false,
    });
  };

  const restartWorkout = (key, type, list) => {
    setProgress((prev) => { const n = { ...prev }; delete n[key]; return n; });
    const exercises = list || [];
    if (!exercises.length) return;
    const ex = exercises[0];
    setSession({
      dateKey: key, type, exercises, index: 0,
      timerLeft: ex.type === "timer" ? ex.duration : null,
      timerRunning: true, done: false,
    });
  };

  const goNext = useCallback(() => {
    setSession((prev) => {
      if (!prev) return prev;
      markExerciseDone(prev.dateKey, prev.exercises[prev.index].id);
      const i = prev.index + 1;
      if (i >= prev.exercises.length) return { ...prev, done: true };
      const ex = prev.exercises[i];
      return { ...prev, index: i, timerLeft: ex.type === "timer" ? ex.duration : null, timerRunning: true };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const finishWorkout = () => {
    if (session && session.dateKey !== "beta") {
      const key = session.dateKey;
      setCompleted((prev) => (prev[key] ? prev : { ...prev, [key]: true }));
    }
    setSession(null);
    setDayScreenKey(null);
  };

  useEffect(() => {
    if (!session || session.done) return;
    const ex = session.exercises[session.index];
    if (ex.type !== "timer" || !session.timerRunning) return;
    if (session.timerLeft <= 0) { goNext(); return; }
    const t = setTimeout(() => setSession((p) => (p ? { ...p, timerLeft: p.timerLeft - 1 } : p)), 1000);
    return () => clearTimeout(t);
  }, [session, goNext]);

  if (loading) {
    return (
      <div style={styles.phoneWrap}>
        <GlobalStyle />
        <div style={{ ...styles.phone, display: "flex", alignItems: "center", justifyContent: "center", minHeight: 420 }}>
          <Loader2 size={22} color="#8A93A0" className="rota-spin" />
        </div>
      </div>
    );
  }

  const todayMeta = CYCLE_META[todayType];
  const todayDone = !!completed[todayKey];
  const currentEx = session ? session.exercises[session.index] : null;
  const sessionMeta = session ? CYCLE_META[session.type] : null;
  const sessionDoneIds = session && session.dateKey !== "beta" ? (progress[session.dateKey] || []) : [];

  return (
    <div style={styles.phoneWrap}>
      <GlobalStyle />
      <div style={styles.phone}>
        <div style={styles.header}>
          <div>
            <div style={styles.brand}>ROTA</div>
            <div style={styles.brandSub}>Push · Pull · Rest · Repeat</div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button className="rota-btn" onClick={() => setBeta((b) => !b)}
              style={{
                ...styles.chip,
                background: beta ? "#2A2233" : "#1E232B",
                borderColor: beta ? "#A879E0" : "#2E3540",
              }}>
              <FlaskConical size={13} color={beta ? "#A879E0" : "#5C6470"} strokeWidth={2.4} />
            </button>
            <div style={styles.chip}>
              <Flame size={14} color="#F2994A" strokeWidth={2.5} />
              <span style={styles.streakNum}>{streak}</span>
            </div>
          </div>
        </div>

        <div style={styles.rhythmRow}>
          {rhythm.map((d) => (
            <div key={d.key} style={styles.rhythmCol}>
              <div style={{
                ...styles.rhythmBar,
                background: CYCLE_META[d.type].color,
                opacity: d.isToday ? 1 : 0.42,
                height: d.isToday ? 30 : 20,
                boxShadow: d.isToday ? `0 0 0 2px #14171C, 0 0 0 3.5px ${CYCLE_META[d.type].color}` : "none",
              }} />
            </div>
          ))}
        </div>

        {beta && (
          <button className="rota-btn" onClick={() => setDayScreenKey("beta")} style={styles.betaCard}>
            <div>
              <div style={styles.betaEyebrow}>BETA TEST DAY</div>
              <div style={styles.betaTitle}>Run a 4-exercise sample</div>
              <div style={styles.betaSub}>Timers shortened to 8s. Nothing gets saved.</div>
            </div>
            <Play size={18} color="#A879E0" fill="#A879E0" />
          </button>
        )}

        <button className="rota-btn" onClick={() => setDayScreenKey(todayKey)}
          style={{ ...styles.todayCard, borderColor: todayMeta.color + "55" }}>
          <div style={styles.todayTopRow}>
            <span style={styles.todayEyebrow}>TODAY</span>
            <span style={styles.todayDate}>
              {today.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
            </span>
          </div>
          <div style={styles.todayMain}>
            <div>
              <div style={{ ...styles.todayType, color: todayMeta.color }}>{todayMeta.label}</div>
              <div style={styles.todaySub}>
                {todayType !== "Rest" && (progress[todayKey] || []).length > 0 && !todayDone
                  ? `${(progress[todayKey] || []).length} of ${EXERCISES[todayType].length} done`
                  : todayMeta.sub}
              </div>
            </div>
            <div style={{
              ...styles.checkBtn,
              background: todayDone ? DONE_COLOR : "transparent",
              borderColor: todayDone ? DONE_COLOR : todayMeta.color,
            }}>
              <Check size={20} color={todayDone ? "#0F1510" : todayMeta.color} strokeWidth={3} />
            </div>
          </div>
        </button>

        <div style={styles.calendarCard}>
          <div style={styles.calHeader}>
            <button className="rota-btn" style={styles.navBtn}
              onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1))}>
              <ChevronLeft size={16} color="#8A93A0" />
            </button>
            <span style={styles.calMonth}>
              {viewMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
            </span>
            <button className="rota-btn" style={styles.navBtn}
              onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1))}>
              <ChevronRight size={16} color="#8A93A0" />
            </button>
          </div>
          <div style={styles.weekRow}>
            {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => <div key={i} style={styles.weekLabel}>{d}</div>)}
          </div>
          <div style={styles.grid}>
            {monthGrid.map((cell, i) => {
              if (!cell) return <div key={"e" + i} />;
              const meta = CYCLE_META[cell.type];
              const isDone = !!completed[cell.key];
              const partial = !isDone && (progress[cell.key] || []).length > 0;
              return (
                <button key={cell.key} className="rota-cell" onClick={() => setDayScreenKey(cell.key)}
                  style={{
                    ...styles.dayCell,
                    background: isDone ? DONE_COLOR : meta.soft,
                    outline: cell.key === todayKey ? "1.5px solid #EDEFF2" : "none",
                  }}>
                  <span style={{ ...styles.dayNum, color: isDone ? "#0F1510" : meta.color }}>
                    {cell.date.getDate()}
                  </span>
                  {isDone && <Check size={10} color="#0F1510" strokeWidth={3.5} style={styles.dayCheck} />}
                  {partial && <div style={{ ...styles.partialDot, background: meta.color }} />}
                </button>
              );
            })}
          </div>
        </div>

        <div style={styles.saveRow}>
          {saveState !== "idle" && <span style={styles.saveText}>{saveState === "saving" ? "Saving…" : "Saved"}</span>}
        </div>

        {dayScreenKey && !session && (
          <DayScreen
            date={dayScreenDate}
            isBeta={dayScreenKey === "beta"}
            type={dayScreenType}
            exercises={dayScreenExercises}
            doneIds={dayDoneIds}
            isDone={!!completed[dayScreenKey]}
            onClose={() => setDayScreenKey(null)}
            onToggleExercise={(exId) => toggleExercise(dayScreenKey, exId)}
            onToggleComplete={() => setCompleted((prev) => {
              const next = { ...prev };
              if (next[dayScreenKey]) delete next[dayScreenKey];
              else next[dayScreenKey] = true;
              return next;
            })}
            onStart={() => startWorkout(dayScreenKey, dayScreenType, dayScreenExercises)}
            onRestart={() => restartWorkout(dayScreenKey, dayScreenType, dayScreenExercises)}
          />
        )}

        {session && !session.done && currentEx && (
          <SessionScreen
            session={session} exercise={currentEx} meta={sessionMeta} doneIds={sessionDoneIds}
            onClose={() => setSession(null)}
            onContinue={goNext}
            onToggleExercise={() => toggleExercise(session.dateKey, currentEx.id)}
            onTogglePause={() => setSession((p) => ({ ...p, timerRunning: !p.timerRunning }))}
          />
        )}

        {session && session.done && (
          <CompleteScreen meta={sessionMeta} isBeta={session.dateKey === "beta"} onDone={finishWorkout} />
        )}
      </div>
    </div>
  );
}

// ---- Day screen ----------------------------------------------------------
function DayScreen({
  date, isBeta, type, exercises, doneIds, isDone,
  onClose, onToggleExercise, onToggleComplete, onStart, onRestart,
}) {
  const meta = CYCLE_META[type];
  const doneCount = doneIds.length;
  const inProgress = !isBeta && doneCount > 0 && doneCount < exercises.length;
  const hasProgress = !isBeta && doneCount > 0;

  return (
    <div style={styles.overlay}>
      <div style={styles.overlayHeader}>
        <button className="rota-btn" style={styles.iconBtn} onClick={onClose}><X size={18} color="#8A93A0" /></button>
        <div style={{ textAlign: "center" }}>
          <div style={styles.overlayDate}>
            {isBeta ? "BETA TEST" : date.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
          </div>
          <div style={{ ...styles.overlayType, color: isBeta ? "#A879E0" : meta.color }}>
            {isBeta ? "Sample workout" : meta.label}
          </div>
        </div>
        {hasProgress ? (
          <button className="rota-btn" style={styles.iconBtn} onClick={onRestart} title="Reset progress">
            <RotateCcw size={15} color="#8A93A0" />
          </button>
        ) : <div style={{ width: 30 }} />}
      </div>

      {type === "Rest" && !isBeta ? (
        <div style={styles.restBox}>
          <div style={{ ...styles.restDot, background: meta.color }} />
          <div style={styles.restTitle}>Rest day</div>
          <div style={styles.restSub}>Nothing scheduled. Let the muscles rebuild.</div>
        </div>
      ) : (
        <>
          {!isBeta && exercises.length > 0 && (
            <div style={styles.dayProgress}>
              <span style={{ color: meta.color, fontWeight: 600 }}>{doneCount}</span>
              <span> / {exercises.length} exercises done · tap a row to check / uncheck</span>
            </div>
          )}

          <div style={styles.exerciseList}>
            {exercises.map((ex, i) => {
              const done = doneIds.includes(ex.id);
              return (
                <button
                  key={ex.id + i}
                  className="rota-btn"
                  onClick={() => !isBeta && onToggleExercise(ex.id)}
                  style={{
                    ...styles.exerciseRow,
                    borderColor: done ? DONE_COLOR + "55" : "#22262E",
                    cursor: isBeta ? "default" : "pointer",
                  }}
                >
                  <Thumb exercise={ex} />
                  <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
                    <div style={{ ...styles.exerciseName, color: done ? "#8A93A0" : "#F1F3F5" }}>{ex.name}</div>
                    <div style={styles.exerciseMuscle}>{ex.muscle}</div>
                  </div>
                  {done ? (
                    <div style={styles.rowCheck}>
                      <Check size={12} color="#0F1510" strokeWidth={3.5} />
                    </div>
                  ) : (
                    <div style={styles.exerciseSpec}>
                      {ex.type === "timer" ? `${ex.duration}s` : `${ex.sets} × ${ex.reps}`}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          <div style={styles.overlayFooter}>
            {!isBeta && (
              <button className="rota-btn" onClick={onToggleComplete} style={{
                ...styles.secondaryBtn,
                background: isDone ? DONE_COLOR : "transparent",
                borderColor: isDone ? DONE_COLOR : "#2E3540",
                color: isDone ? "#0F1510" : "#8A93A0",
              }}>
                {isDone ? "Completed" : "Mark done"}
              </button>
            )}
            <button className="rota-btn" onClick={onStart}
              style={{ ...styles.primaryBtn, background: isBeta ? "#A879E0" : meta.color }}>
              <Play size={16} color="#14171C" strokeWidth={2.5} fill="#14171C" />
              {inProgress ? "Resume Workout" : "Start Workout"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ---- Session screen --------------------------------------------------------
function SessionScreen({ session, exercise, meta, doneIds, onClose, onContinue, onToggleExercise, onTogglePause }) {
  const isTimer = exercise.type === "timer";
  const alreadyDone = doneIds.includes(exercise.id);
  const isBeta = session.dateKey === "beta";

  return (
    <div style={styles.overlay}>
      <div style={styles.overlayHeader}>
        <button className="rota-btn" style={styles.iconBtn} onClick={onClose}><X size={18} color="#8A93A0" /></button>
        <div style={styles.progressText}>{session.index + 1} / {session.exercises.length}</div>
        <a href={YT(exercise.name)} target="_blank" rel="noreferrer" style={styles.iconBtn}>
          <ExternalLink size={15} color="#8A93A0" />
        </a>
      </div>

      <div style={styles.progressTrack}>
        <div style={{
          ...styles.progressFill, background: meta.color,
          width: `${((session.index + 1) / session.exercises.length) * 100}%`,
        }} />
      </div>

      <div style={styles.sessionBody}>
        <div style={{ ...styles.sessionMuscle, color: meta.color }}>{exercise.muscle}</div>
        <div style={styles.sessionNameRow}>
          <span style={styles.sessionName}>{exercise.name}</span>
          {!isBeta && alreadyDone && (
            <button className="rota-btn" onClick={onToggleExercise} title="Uncheck this exercise"
              style={{ ...styles.rowCheck, border: "none" }}>
              <Check size={11} color="#0F1510" strokeWidth={3.5} />
            </button>
          )}
        </div>

        <ExerciseDemo exercise={exercise} color={meta.color} />

        {isTimer ? (
          <>
            <div style={styles.timerNum}>{formatTime(session.timerLeft)}</div>
            <div style={styles.timerLabel}>{session.timerRunning ? "in progress" : "paused"}</div>
          </>
        ) : (
          <div style={styles.repsSpec}>
            {exercise.sets} sets <span style={{ color: "#5C6470" }}>×</span> {exercise.reps} reps
          </div>
        )}

        <div style={styles.cueBox}>{exercise.cue}</div>
      </div>

      <div style={styles.overlayFooter}>
        {isTimer && (
          <button className="rota-btn" onClick={onTogglePause}
            style={{ ...styles.secondaryBtn, borderColor: meta.color, color: meta.color }}>
            {session.timerRunning ? <Pause size={15} /> : <Play size={15} fill={meta.color} />}
            {session.timerRunning ? "Pause" : "Resume"}
          </button>
        )}
        <button className="rota-btn" onClick={onContinue} style={{ ...styles.primaryBtn, background: meta.color }}>
          Continue <ArrowRight size={16} color="#14171C" strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}

function CompleteScreen({ meta, isBeta, onDone }) {
  return (
    <div style={{ ...styles.overlay, alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ ...styles.completeCheck, background: isBeta ? "#A879E0" : DONE_COLOR }}>
          <Check size={30} color="#0F1510" strokeWidth={3.5} />
        </div>
        <div style={styles.completeTitle}>{isBeta ? "Beta run finished" : "Workout complete"}</div>
        <div style={styles.completeSub}>
          {isBeta ? "Test only — nothing was saved." : "Logged as done. The day turns green."}
        </div>
        <button className="rota-btn" onClick={onDone}
          style={{ ...styles.primaryBtn, background: isBeta ? "#A879E0" : meta.color, margin: "22px auto 0", maxWidth: 160 }}>
          Done
        </button>
      </div>
    </div>
  );
}

function GlobalStyle() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@500&display=swap');
      * { box-sizing: border-box; }
      .rota-cell:active { transform: scale(0.94); }
      .rota-btn { cursor: pointer; }
      .rota-btn:active { transform: scale(0.97); }
      @keyframes spin { to { transform: rotate(360deg); } }
      .rota-spin { animation: spin 1s linear infinite; }

      @keyframes mf-up { 0%,100% { transform: translateY(26px); } 50% { transform: translateY(-6px); } }
      @keyframes mf-fwd { 0%,100% { transform: translateX(0); } 50% { transform: translateX(34px); } }
      @keyframes mf-raise-l { 0%,100% { transform: translate(0,0); } 50% { transform: translate(-14px,-34px); } }
      @keyframes mf-raise-r { 0%,100% { transform: translate(0,0); } 50% { transform: translate(14px,-34px); } }
      @keyframes mf-curl { 0%,100% { transform: translate(0,0); } 50% { transform: translate(-6px,-42px); } }
      @keyframes mf-hinge { 0%,100% { transform: rotate(0deg); } 50% { transform: rotate(52deg); } }
      @keyframes mf-updown { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-30px); } }
      @keyframes mf-crunch { 0%,100% { transform: rotate(64deg); } 50% { transform: rotate(20deg); } }
      @keyframes mf-twist { 0%,100% { transform: rotate(-30deg); } 50% { transform: rotate(30deg); } }
      @keyframes mf-climb-a { 0%,100% { transform: translate(0,0); } 50% { transform: translate(-30px,-6px); } }
      @keyframes mf-climb-b { 0%,100% { transform: translate(-30px,-6px); } 50% { transform: translate(0,0); } }
      @keyframes mf-plank { 0%,100% { transform: translateY(0); } 50% { transform: translateY(2px); } }

      .mf-up { animation: mf-up 1.5s ease-in-out infinite; }
      .mf-fwd { animation: mf-fwd 1.4s ease-in-out infinite; }
      .mf-raise-l { animation: mf-raise-l 1.7s ease-in-out infinite; }
      .mf-raise-r { animation: mf-raise-r 1.7s ease-in-out infinite; }
      .mf-curl { animation: mf-curl 1.5s ease-in-out infinite; }
      .mf-hinge { animation: mf-hinge 2.2s ease-in-out infinite; }
      .mf-updown { animation: mf-updown 2.2s ease-in-out infinite; }
      .mf-crunch { animation: mf-crunch 1.4s ease-in-out infinite; }
      .mf-twist { animation: mf-twist 1.3s ease-in-out infinite; }
      .mf-climb-a { animation: mf-climb-a 0.8s linear infinite; }
      .mf-climb-b { animation: mf-climb-b 0.8s linear infinite; }
      .mf-plank { animation: mf-plank 2.4s ease-in-out infinite; }
    `}</style>
  );
}

// ---- Styles -------------------------------------------------------------
const styles = {
  phoneWrap: {
    minHeight: "100vh", width: "100%", display: "flex", justifyContent: "center",
    alignItems: "flex-start", background: "#0B0D10", padding: "24px 12px", fontFamily: "'Inter', sans-serif",
  },
  phone: {
    width: "100%", maxWidth: 400, background: "#14171C", borderRadius: 28, padding: "22px 18px 16px",
    boxShadow: "0 30px 60px rgba(0,0,0,0.5)", border: "1px solid #22262E", position: "relative", overflow: "hidden",
  },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 },
  brand: { fontFamily: "'Oswald', sans-serif", fontSize: 24, letterSpacing: 2, color: "#F1F3F5", fontWeight: 600 },
  brandSub: { fontSize: 11, color: "#8A93A0", marginTop: 2, letterSpacing: 0.3 },
  chip: {
    display: "flex", alignItems: "center", gap: 5, background: "#1E232B", border: "1px solid #2E3540",
    borderRadius: 20, padding: "7px 10px", height: "fit-content",
  },
  streakNum: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, color: "#F1F3F5", fontWeight: 500 },
  rhythmRow: { display: "flex", alignItems: "flex-end", justifyContent: "space-between", height: 40, marginBottom: 20, padding: "0 2px" },
  rhythmCol: { flex: 1, display: "flex", justifyContent: "center" },
  rhythmBar: { width: 4, borderRadius: 2, transition: "all 0.2s ease" },

  betaCard: {
    width: "100%", background: "#1E1A26", border: "1.5px solid #4A3A63", borderRadius: 16,
    padding: "12px 16px", marginBottom: 12, display: "flex", alignItems: "center",
    justifyContent: "space-between", textAlign: "left",
  },
  betaEyebrow: { fontSize: 9.5, letterSpacing: 1.4, color: "#A879E0", fontWeight: 700 },
  betaTitle: { fontSize: 14, color: "#F1F3F5", fontWeight: 600, marginTop: 3 },
  betaSub: { fontSize: 11, color: "#8A93A0", marginTop: 2 },

  todayCard: {
    background: "#1A1E24", border: "1.5px solid", borderRadius: 18, padding: "16px 18px",
    marginBottom: 14, width: "100%", textAlign: "left", display: "block",
  },
  todayTopRow: { display: "flex", justifyContent: "space-between", marginBottom: 10 },
  todayEyebrow: { fontSize: 10.5, letterSpacing: 1.5, color: "#8A93A0", fontWeight: 600 },
  todayDate: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: "#8A93A0" },
  todayMain: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  todayType: { fontFamily: "'Oswald', sans-serif", fontSize: 30, fontWeight: 600, letterSpacing: 0.5 },
  todaySub: { fontSize: 12.5, color: "#8A93A0", marginTop: 2 },
  checkBtn: { width: 46, height: 46, borderRadius: 14, border: "1.5px solid", display: "flex", alignItems: "center", justifyContent: "center" },

  calendarCard: { background: "#1A1E24", border: "1px solid #22262E", borderRadius: 18, padding: "14px 14px 8px" },
  calHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, padding: "0 2px" },
  navBtn: { background: "transparent", border: "none", padding: 4, display: "flex" },
  calMonth: { fontFamily: "'Oswald', sans-serif", fontSize: 14, letterSpacing: 1, color: "#F1F3F5", fontWeight: 500 },
  weekRow: { display: "grid", gridTemplateColumns: "repeat(7, 1fr)", marginBottom: 4 },
  weekLabel: { textAlign: "center", fontSize: 10, color: "#5C6470", padding: "2px 0" },
  grid: { display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 },
  dayCell: {
    aspectRatio: "1", borderRadius: 9, border: "none", display: "flex", alignItems: "center",
    justifyContent: "center", position: "relative", transition: "transform 0.1s ease",
  },
  dayNum: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, fontWeight: 500 },
  dayCheck: { position: "absolute", bottom: 3, right: 3 },
  partialDot: { position: "absolute", bottom: 4, right: 4, width: 5, height: 5, borderRadius: "50%" },
  saveRow: { height: 18, textAlign: "center", marginTop: 8 },
  saveText: { fontSize: 10.5, color: "#5C6470" },

  overlay: {
    position: "absolute", inset: 0, background: "#14171C", padding: "22px 18px 18px",
    display: "flex", flexDirection: "column",
  },
  overlayHeader: { display: "flex", alignItems: "center", justifyContent: "space-between" },
  iconBtn: {
    width: 30, height: 30, borderRadius: 10, background: "#1E232B", border: "1px solid #2E3540",
    display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none", flexShrink: 0,
  },
  overlayDate: { fontSize: 11, color: "#8A93A0", fontFamily: "'IBM Plex Mono', monospace" },
  overlayType: { fontFamily: "'Oswald', sans-serif", fontSize: 19, fontWeight: 600, marginTop: 1 },
  progressText: { fontSize: 12, color: "#8A93A0", fontFamily: "'IBM Plex Mono', monospace" },
  progressTrack: { height: 3, background: "#22262E", borderRadius: 2, marginTop: 12, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 2, transition: "width 0.3s ease" },

  dayProgress: { fontSize: 11, color: "#8A93A0", marginTop: 12, textAlign: "center" },
  exerciseList: { flex: 1, overflowY: "auto", marginTop: 10, display: "flex", flexDirection: "column", gap: 7 },
  exerciseRow: {
    display: "flex", alignItems: "center", gap: 10, background: "#1A1E24",
    border: "1px solid", borderRadius: 14, padding: "8px 12px 8px 8px", width: "100%",
  },
  thumb: {
    width: 42, height: 42, borderRadius: 10, objectFit: "cover",
    background: "#F4F5F7", flexShrink: 0,
  },
  exerciseName: { fontSize: 13, fontWeight: 500 },
  exerciseMuscle: { fontSize: 11, color: "#8A93A0", marginTop: 1 },
  exerciseSpec: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: "#8A93A0", flexShrink: 0 },
  rowCheck: {
    width: 19, height: 19, borderRadius: "50%", background: DONE_COLOR, display: "flex",
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },

  restBox: {
    flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
    justifyContent: "center", textAlign: "center", padding: "0 20px",
  },
  restDot: { width: 14, height: 14, borderRadius: "50%", marginBottom: 14 },
  restTitle: { fontFamily: "'Oswald', sans-serif", fontSize: 22, color: "#F1F3F5", fontWeight: 600, marginBottom: 6 },
  restSub: { fontSize: 13, color: "#8A93A0", lineHeight: 1.5 },

  overlayFooter: { display: "flex", gap: 10, marginTop: 14 },
  primaryBtn: {
    flex: 1.4, border: "none", borderRadius: 14, padding: "13px 0", color: "#14171C", fontWeight: 600,
    fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontFamily: "'Inter', sans-serif",
  },
  secondaryBtn: {
    flex: 1, border: "1.5px solid", borderRadius: 14, padding: "13px 0", background: "transparent",
    fontWeight: 600, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center",
    gap: 6, fontFamily: "'Inter', sans-serif",
  },

  sessionBody: {
    flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
    justifyContent: "center", textAlign: "center",
  },
  sessionMuscle: { fontSize: 11.5, letterSpacing: 1, fontWeight: 600, textTransform: "uppercase" },
  sessionNameRow: { display: "flex", alignItems: "center", gap: 7, marginTop: 3, padding: "0 6px" },
  sessionName: { fontFamily: "'Oswald', sans-serif", fontSize: 20, color: "#F1F3F5", fontWeight: 600 },
  demoStage: {
    borderRadius: 20, border: "1px solid #2E3540", marginTop: 12,
    overflow: "hidden", display: "flex", alignItems: "center",
    justifyContent: "center", flexShrink: 0,
  },
  demoImg: { width: "100%", height: "100%", objectFit: "contain" },
  videoLink: {
    display: "flex", alignItems: "center", gap: 5, border: "1px solid", borderRadius: 9,
    padding: "5px 11px", fontSize: 11, fontWeight: 600, textDecoration: "none",
  },
  repsSpec: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 16, color: "#F1F3F5", marginTop: 10 },
  timerNum: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 36, color: "#F1F3F5", fontWeight: 500, lineHeight: 1, marginTop: 10 },
  timerLabel: { fontSize: 11, color: "#8A93A0", letterSpacing: 0.5, marginTop: 4 },
  cueBox: { fontSize: 12, color: "#8A93A0", lineHeight: 1.55, marginTop: 10, padding: "0 4px", maxWidth: 320 },

  completeCheck: {
    width: 62, height: 62, borderRadius: "50%", display: "flex", alignItems: "center",
    justifyContent: "center", margin: "0 auto 16px",
  },
  completeTitle: { fontFamily: "'Oswald', sans-serif", fontSize: 22, color: "#F1F3F5", fontWeight: 600 },
  completeSub: { fontSize: 13, color: "#8A93A0", marginTop: 6 },
};
