import { useState, useEffect, useMemo, useCallback } from "react";
import "./WelcomePage.css";

const API_URL = "http://127.0.0.1:8000";

const moods = [
  { id: "calm", emoji: "🌿", label: "Calm", tip: "A great day to save a little." },
  { id: "focused", emoji: "🎯", label: "Focused", tip: "Perfect time to hit a goal." },
  { id: "curious", emoji: "🔍", label: "Curious", tip: "Explore where your money went." },
  { id: "tired", emoji: "🌙", label: "Tired", tip: "Rest. Your money is safe with us." },
  { id: "happy", emoji: "🌸", label: "Happy", tip: "Celebrate a small win today." },
];

const spendingMoods = [
  { id: "happy", emoji: "😊", label: "Happy" },
  { id: "stressed", emoji: "😰", label: "Stressed" },
  { id: "impulsive", emoji: "⚡", label: "Impulsive" },
  { id: "excited", emoji: "🤩", label: "Excited" },
  { id: "necessary", emoji: "🧾", label: "Necessary" },
];

const goalIcons = ["🎯", "🏖️", "💻", "🚗", "🎸", "📱", "🏠", "🎓", "💍", "🐶", "✈️", "🎮"];

const quotes = [
  { text: "Money is a terrible master but an excellent servant.", author: "P.T. Barnum" },
  { text: "Beware of little expenses; a small leak will sink a great ship.", author: "Benjamin Franklin" },
  { text: "It's not your salary that makes you rich, it's your spending habits.", author: "Charles A. Jaffe" },
  { text: "The best time to plant a tree was 20 years ago. The second best time is now.", author: "Chinese Proverb" },
];

const winSuggestions = [
  "Skipped a chai today ☕",
  "Packed lunch instead of ordering 🥗",
  "Waited 24 hours before buying ⏳",
  "Walked instead of cabbing 🚶",
  "Used a coupon 🎟️",
  "Said no to an impulse buy 🛑",
  "Saved ₹50 from pocket change 💰",
];

const emptyBloomDays = [
  { day: "M", filled: false, icon: "🌱" },
  { day: "T", filled: false, icon: "🌿" },
  { day: "W", filled: false, icon: "🍀" },
  { day: "T", filled: false, icon: "🌸" },
  { day: "F", filled: false, icon: "🌼" },
  { day: "S", filled: false, icon: "🌻" },
  { day: "S", filled: false, icon: "🌷" },
];

function WelcomePage({ userName, onLogout }) {
  // ===== Data state (from backend) =====
  const [expenses, setExpenses] = useState([]);
  const [goals, setGoals] = useState([]);
  const [journal, setJournal] = useState([]);
  const [wins, setWins] = useState([]);
  const [bloomDays, setBloomDays] = useState(emptyBloomDays);
  const [loading, setLoading] = useState(true);

  // ===== UI state =====
  const [selectedMood, setSelectedMood] = useState(null);
  const [activeModal, setActiveModal] = useState(null);
  const [toast, setToast] = useState(null);
  const [confetti, setConfetti] = useState([]);

  // Form states
  const [expenseForm, setExpenseForm] = useState({
    title: "", amount: "", category: "food", note: "",
    date: new Date().toISOString().split("T")[0],
    mood: null, paymentMethod: "upi",
  });
  const [goalForm, setGoalForm] = useState({
    name: "", target: "", saved: "", deadline: "", why: "", icon: "🎯",
  });
  const [editingGoalId, setEditingGoalId] = useState(null);
  const [journalForm, setJournalForm] = useState({ mood: "calm", entry: "" });
  const [newWin, setNewWin] = useState("");

  // ===== Helpers =====
  const getToken = () => localStorage.getItem("token") || "";

  const apiFetch = useCallback(async (path, options = {}) => {
    const token = getToken();
    const headers = {
      "Content-Type": "application/json",
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
    const res = await fetch(`${API_URL}${path}`, { ...options, headers });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Request failed: ${res.status}`);
    }
    return res.json();
  }, []);

  const showToast = (message, emoji = "✨") => {
    setToast({ message, emoji });
    setTimeout(() => setToast(null), 2400);
  };

  // ===== Load all data on mount =====
  useEffect(() => {
    let cancelled = false;

    const loadAll = async () => {
      try {
        setLoading(true);
        const [exp, gls, jrn, wns, blm] = await Promise.all([
          apiFetch("/expenses").catch(() => []),
          apiFetch("/goals").catch(() => []),
          apiFetch("/journal").catch(() => []),
          apiFetch("/wins").catch(() => []),
          apiFetch("/bloom").catch(() => []),
        ]);
        if (cancelled) return;

        setExpenses((exp || []).map((e) => ({
          id: e.id,
          title: e.title,
          amount: e.amount,
          category: e.category,
          date: e.date,
          note: e.note,
          mood: e.mood,
          paymentMethod: e.payment_method,
        })));

        setGoals((gls || []).map((g) => ({
          id: g.id,
          name: g.name,
          target: g.target,
          saved: g.saved,
          deadline: g.deadline,
          why: g.why,
          icon: g.icon,
        })));

        setJournal((jrn || []).map((j) => ({
          id: j.id,
          mood: j.mood,
          entry: j.entry,
          date: j.date,
        })));

        setWins((wns || []).map((w) => ({
          id: w.id,
          text: w.text,
          date: w.date,
        })));

        if (blm && blm.length === 7) {
          setBloomDays(blm.map((d) => ({
            day: d.day_letter,
            icon: d.icon,
            filled: d.filled === 1,
          })));
        }
      } catch (err) {
        console.error("Load error:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadAll();
    return () => { cancelled = true; };
  }, [apiFetch]);

  const firstName = userName ? userName.split(" ")[0] : "Friend";
  const initial = firstName.charAt(0).toUpperCase();
  const activeMood = moods.find((m) => m.id === selectedMood);
  const todayQuote = quotes[Math.floor(Math.random() * quotes.length)];

  const todayStr = new Date().toISOString().split("T")[0];
  const todayExpenses = expenses.filter((e) => e.date === todayStr);
  const totalToday = todayExpenses.reduce((s, e) => s + e.amount, 0);
  const totalAllTime = expenses.reduce((s, e) => s + e.amount, 0);
  const filledBloom = bloomDays.filter((d) => d.filled).length;

  // Category donut data
  const categoryData = useMemo(() => {
    const map = { food: 0, transport: 0, fun: 0, bills: 0, shopping: 0, other: 0 };
    expenses.forEach((e) => { map[e.category] = (map[e.category] || 0) + e.amount; });
    const total = Object.values(map).reduce((a, b) => a + b, 0);
    return Object.entries(map)
      .filter(([, v]) => v > 0)
      .map(([k, v]) => ({ cat: k, value: v, pct: total > 0 ? (v / total) * 100 : 0 }))
      .sort((a, b) => b.value - a.value);
  }, [expenses]);

  // Mood insights
  const moodInsights = useMemo(() => {
    const map = {};
    expenses.forEach((e) => {
      if (e.mood) {
        map[e.mood] = map[e.mood] || { count: 0, total: 0 };
        map[e.mood].count += 1;
        map[e.mood].total += e.amount;
      }
    });
    return Object.entries(map)
      .map(([moodId, data]) => ({
        mood: spendingMoods.find((m) => m.id === moodId),
        ...data,
      }))
      .filter((m) => m.mood)
      .sort((a, b) => b.total - a.total);
  }, [expenses]);

  const createRipple = (event) => {
    const button = event.currentTarget;
    const circle = document.createElement("span");
    const diameter = Math.max(button.clientWidth, button.clientHeight);
    const radius = diameter / 2;
    const rect = button.getBoundingClientRect();
    circle.style.width = circle.style.height = `${diameter}px`;
    circle.style.left = `${event.clientX - rect.left - radius}px`;
    circle.style.top = `${event.clientY - rect.top - radius}px`;
    circle.classList.add("wb-ripple");
    const existing = button.querySelector(".wb-ripple");
    if (existing) existing.remove();
    button.appendChild(circle);
    setTimeout(() => circle.remove(), 700);
  };

  const fireConfetti = (emojis = ["✨", "💰", "🌸", "⭐", "🍃", "💎"]) => {
    const particles = Array.from({ length: 18 }, (_, i) => ({
      id: Date.now() + i,
      emoji: emojis[Math.floor(Math.random() * emojis.length)],
      left: Math.random() * 100,
      delay: Math.random() * 0.3,
      duration: 1 + Math.random() * 1.5,
      rotate: Math.random() * 360,
    }));
    setConfetti(particles);
    setTimeout(() => setConfetti([]), 2500);
  };

  const closeModal = () => {
    setActiveModal(null);
    setEditingGoalId(null);
  };

  // ===== Handlers =====
  const handleMoodSelect = (e, mood) => {
    createRipple(e);
    setSelectedMood(mood.id);
    showToast(`${mood.label} — noted!`, mood.emoji);
  };

  const handleBloomToggle = async (e, index) => {
    createRipple(e);
    try {
      const updated = await apiFetch(`/bloom/${index}`, { method: "PUT" });
      setBloomDays((prev) => prev.map((d, i) =>
        i === index ? { ...d, filled: updated.filled === 1 } : d
      ));
      showToast(
        updated.filled === 1 ? "Day marked! 🌸" : "Day cleared",
        updated.filled === 1 ? "🌸" : "🌙"
      );
    } catch (err) {
      showToast("Couldn't update bloom", "⚠️");
    }
  };

  const handleSaveExpense = async (e) => {
    e.preventDefault();
    if (!expenseForm.title.trim() || !expenseForm.amount) return;
    try {
      const newExpense = await apiFetch("/expenses", {
        method: "POST",
        body: JSON.stringify({
          title: expenseForm.title.trim(),
          amount: Number(expenseForm.amount),
          category: expenseForm.category,
          date: expenseForm.date,
          note: expenseForm.note.trim() || null,
          mood: expenseForm.mood,
          payment_method: expenseForm.paymentMethod,
        }),
      });
      setExpenses([
        {
          id: newExpense.id,
          title: newExpense.title,
          amount: newExpense.amount,
          category: newExpense.category,
          date: newExpense.date,
          note: newExpense.note,
          mood: newExpense.mood,
          paymentMethod: newExpense.payment_method,
        },
        ...expenses,
      ]);
      setExpenseForm({
        title: "", amount: "", category: "food", note: "",
        date: todayStr, mood: null, paymentMethod: "upi",
      });
      closeModal();
      fireConfetti();
      showToast(`₹${newExpense.amount} added!`, "💰");
    } catch (err) {
      showToast("Couldn't save expense", "⚠️");
    }
  };

  const handleSaveGoal = async (e) => {
    e.preventDefault();
    if (!goalForm.name.trim() || !goalForm.target) return;
    try {
      const payload = {
        name: goalForm.name.trim(),
        target: Number(goalForm.target),
        saved: Number(goalForm.saved) || 0,
        deadline: goalForm.deadline || null,
        why: goalForm.why.trim() || null,
        icon: goalForm.icon,
      };
      if (editingGoalId) {
        const updated = await apiFetch(`/goals/${editingGoalId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        setGoals(goals.map((g) => g.id === editingGoalId ? {
          id: updated.id, name: updated.name, target: updated.target,
          saved: updated.saved, deadline: updated.deadline,
          why: updated.why, icon: updated.icon,
        } : g));
        showToast("Goal updated!", "✏️");
      } else {
        const created = await apiFetch("/goals", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setGoals([{
          id: created.id, name: created.name, target: created.target,
          saved: created.saved, deadline: created.deadline,
          why: created.why, icon: created.icon,
        }, ...goals]);
        showToast(`Goal "${created.name}" created!`, "🎯");
      }
      setGoalForm({ name: "", target: "", saved: "", deadline: "", why: "", icon: "🎯" });
      closeModal();
    } catch (err) {
      showToast("Couldn't save goal", "⚠️");
    }
  };

  const handleEditGoal = (goal) => {
    setGoalForm({
      name: goal.name, target: goal.target, saved: goal.saved,
      deadline: goal.deadline || "", why: goal.why || "", icon: goal.icon,
    });
    setEditingGoalId(goal.id);
    setActiveModal("goal");
  };

  const handleAddMoney = async (goalId, amount) => {
    try {
      const updated = await apiFetch(`/goals/${goalId}/add-money?amount=${amount}`, {
        method: "PATCH",
      });
      setGoals(goals.map((g) => g.id === goalId ? { ...g, saved: updated.saved } : g));
      fireConfetti(["💰", "✨", "🌟"]);
      showToast(`₹${amount} added to jar!`, "🐷");
    } catch (err) {
      showToast("Couldn't add money", "⚠️");
    }
  };

  const handleWithdraw = async (goalId, amount) => {
    const goal = goals.find((g) => g.id === goalId);
    if (!goal) return;
    const newSaved = Math.max(0, goal.saved - amount);
    try {
      const updated = await apiFetch(`/goals/${goalId}`, {
        method: "PUT",
        body: JSON.stringify({
          name: goal.name, target: goal.target, saved: newSaved,
          deadline: goal.deadline || null, why: goal.why || null, icon: goal.icon,
        }),
      });
      setGoals(goals.map((g) => g.id === goalId ? { ...g, saved: updated.saved } : g));
      showToast(`₹${amount} withdrawn`, "💸");
    } catch (err) {
      showToast("Couldn't withdraw", "⚠️");
    }
  };

  const handleDeleteGoal = async (id) => {
    try {
      await apiFetch(`/goals/${id}`, { method: "DELETE" });
      setGoals(goals.filter((g) => g.id !== id));
      showToast("Goal removed", "🗑️");
    } catch (err) {
      showToast("Couldn't delete goal", "⚠️");
    }
  };

  const handleSaveJournal = async (e) => {
    e.preventDefault();
    if (!journalForm.entry.trim()) return;
    try {
      const created = await apiFetch("/journal", {
        method: "POST",
        body: JSON.stringify({
          mood: journalForm.mood,
          entry: journalForm.entry.trim(),
          date: new Date().toISOString(),
        }),
      });
      setJournal([{
        id: created.id, mood: created.mood,
        entry: created.entry, date: created.date,
      }, ...journal]);
      setJournalForm({ mood: "calm", entry: "" });
      closeModal();
      showToast("Journal saved 💌", "📝");
    } catch (err) {
      showToast("Couldn't save journal", "⚠️");
    }
  };

  const handleDeleteExpense = async (id) => {
    try {
      await apiFetch(`/expenses/${id}`, { method: "DELETE" });
      setExpenses(expenses.filter((e) => e.id !== id));
      showToast("Expense removed", "🗑️");
    } catch (err) {
      showToast("Couldn't delete expense", "⚠️");
    }
  };

  const handleAddWin = async (e) => {
    if (e) e.preventDefault();
    if (!newWin.trim()) return;
    try {
      const created = await apiFetch("/wins", {
        method: "POST",
        body: JSON.stringify({
          text: newWin.trim(),
          date: new Date().toISOString(),
        }),
      });
      setWins([{ id: created.id, text: created.text, date: created.date }, ...wins]);
      setNewWin("");
      fireConfetti(["🎉", "⭐", "🌟", "💚", "🌸"]);
      showToast("Win saved to piggy! 🐷", "🌟");
    } catch (err) {
      showToast("Couldn't save win", "⚠️");
    }
  };

  const handleAddSuggestedWin = async (text) => {
    try {
      const created = await apiFetch("/wins", {
        method: "POST",
        body: JSON.stringify({ text, date: new Date().toISOString() }),
      });
      setWins([{ id: created.id, text: created.text, date: created.date }, ...wins]);
      fireConfetti(["🎉", "⭐", "🌟", "💚", "🌸"]);
      showToast("Win saved to piggy! 🐷", "🌟");
    } catch (err) {
      showToast("Couldn't save win", "⚠️");
    }
  };

  const handleDeleteWin = async (id) => {
    try {
      await apiFetch(`/wins/${id}`, { method: "DELETE" });
      setWins(wins.filter((w) => w.id !== id));
      showToast("Win removed", "🗑️");
    } catch (err) {
      showToast("Couldn't delete win", "⚠️");
    }
  };

  return (
    <main className="wb-shell">
      {/* ===== SUBTLE BACKGROUND SPARKLES ===== */}
      <div className="wb-bg-animation" aria-hidden="true">
        {Array.from({ length: 8 }).map((_, i) => (
          <span
            key={i}
            className={`wb-float-coin coin-${i % 4}`}
            style={{
              left: `${(i * 13.5) % 100}%`,
              animationDelay: `${i * 1.6}s`,
              animationDuration: `${16 + (i % 4) * 3}s`,
            }}
          >
            {["✨", "🌸", "💎", "✦"][i % 4]}
          </span>
        ))}
      </div>

      {/* ===== CONFETTI ===== */}
      {confetti.length > 0 && (
        <div className="wb-confetti">
          {confetti.map((c) => (
            <span key={c.id} className="wb-confetti-piece"
              style={{
                left: `${c.left}%`,
                animationDelay: `${c.delay}s`,
                animationDuration: `${c.duration}s`,
                transform: `rotate(${c.rotate}deg)`,
              }}>{c.emoji}</span>
          ))}
        </div>
      )}

      {/* ===== TOAST ===== */}
      {toast && (
        <div className="wb-toast">
          <span className="wb-toast-emoji">{toast.emoji}</span>
          <span className="wb-toast-msg">{toast.message}</span>
        </div>
      )}

      {/* ===== EXPENSE MODAL ===== */}
      {activeModal === "expense" && (
        <div className="wb-modal-overlay" onClick={closeModal}>
          <div className="wb-modal" onClick={(e) => e.stopPropagation()}>
            <div className="wb-modal-head">
              <div>
                <span className="wb-modal-kicker">NEW EXPENSE</span>
                <h3>What did you spend on?</h3>
              </div>
              <button className="wb-modal-close" onClick={closeModal} type="button">×</button>
            </div>
            <form className="wb-modal-form" onSubmit={handleSaveExpense}>
              <label>
                <span>Description</span>
                <input type="text" placeholder="e.g. Chai & biscuits"
                  value={expenseForm.title}
                  onChange={(e) => setExpenseForm({ ...expenseForm, title: e.target.value })}
                  autoFocus required />
              </label>
              <div className="wb-form-row">
                <label><span>Amount (₹)</span>
                  <input type="number" placeholder="60" value={expenseForm.amount}
                    onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                    min="1" required /></label>
                <label><span>Date</span>
                  <input type="date" value={expenseForm.date}
                    onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })} required /></label>
              </div>
              <label><span>Category</span>
                <div className="wb-cat-grid">
                  {[
                    { id: "food", emoji: "🍜", label: "Food" },
                    { id: "transport", emoji: "🚕", label: "Transport" },
                    { id: "fun", emoji: "🎬", label: "Fun" },
                    { id: "bills", emoji: "💡", label: "Bills" },
                    { id: "shopping", emoji: "🛍️", label: "Shopping" },
                    { id: "other", emoji: "✨", label: "Other" },
                  ].map((cat) => (
                    <button key={cat.id} type="button"
                      className={`wb-cat-card ${expenseForm.category === cat.id ? "active" : ""}`}
                      onClick={() => setExpenseForm({ ...expenseForm, category: cat.id })}>
                      <span className="wb-cat-emoji">{cat.emoji}</span>
                      <span className="wb-cat-label">{cat.label}</span>
                    </button>
                  ))}
                </div>
              </label>
              <label><span>How did it feel? <small style={{color:'#928994',fontWeight:'400'}}>(optional)</small></span>
                <div className="wb-mood-spend-grid">
                  {spendingMoods.map((m) => (
                    <button key={m.id} type="button"
                      className={`wb-mood-spend ${expenseForm.mood === m.id ? "active" : ""}`}
                      onClick={() => setExpenseForm({ ...expenseForm, mood: expenseForm.mood === m.id ? null : m.id })}>
                      <span className="wb-mood-spend-emoji">{m.emoji}</span>
                      <span className="wb-mood-spend-label">{m.label}</span>
                    </button>
                  ))}
                </div>
              </label>
              <label><span>Payment method</span>
                <div className="wb-pay-grid">
                  {[
                    { id: "upi", emoji: "📱", label: "UPI" },
                    { id: "cash", emoji: "💵", label: "Cash" },
                    { id: "card", emoji: "💳", label: "Card" },
                    { id: "other", emoji: "✨", label: "Other" },
                  ].map((p) => (
                    <button key={p.id} type="button"
                      className={`wb-pay-card ${expenseForm.paymentMethod === p.id ? "active" : ""}`}
                      onClick={() => setExpenseForm({ ...expenseForm, paymentMethod: p.id })}>
                      <span>{p.emoji}</span><span>{p.label}</span>
                    </button>
                  ))}
                </div>
              </label>
              <div className="wb-modal-actions">
                <button type="button" className="wb-modal-cancel" onClick={closeModal}>Cancel</button>
                <button className="wb-modal-save" type="submit">Save expense</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== GOAL MODAL ===== */}
      {activeModal === "goal" && (
        <div className="wb-modal-overlay" onClick={closeModal}>
          <div className="wb-modal" onClick={(e) => e.stopPropagation()}>
            <div className="wb-modal-head">
              <div>
                <span className="wb-modal-kicker">{editingGoalId ? "EDIT GOAL" : "NEW GOAL"}</span>
                <h3>{editingGoalId ? "Adjust your dream" : "What are you saving for?"}</h3>
              </div>
              <button className="wb-modal-close" onClick={closeModal} type="button">×</button>
            </div>
            <form className="wb-modal-form" onSubmit={handleSaveGoal}>
              <label><span>Goal icon</span>
                <div className="wb-icon-grid">
                  {goalIcons.map((icon) => (
                    <button key={icon} type="button"
                      className={`wb-icon-pick ${goalForm.icon === icon ? "active" : ""}`}
                      onClick={() => setGoalForm({ ...goalForm, icon })}>{icon}</button>
                  ))}
                </div>
              </label>
              <label><span>Goal name</span>
                <input type="text" placeholder="e.g. Goa trip"
                  value={goalForm.name}
                  onChange={(e) => setGoalForm({ ...goalForm, name: e.target.value })}
                  autoFocus required /></label>
              <div className="wb-form-row">
                <label><span>Target (₹)</span>
                  <input type="number" placeholder="20000"
                    value={goalForm.target}
                    onChange={(e) => setGoalForm({ ...goalForm, target: e.target.value })}
                    min="1" required /></label>
                <label><span>Already saved (₹)</span>
                  <input type="number" placeholder="0"
                    value={goalForm.saved}
                    onChange={(e) => setGoalForm({ ...goalForm, saved: e.target.value })}
                    min="0" /></label>
              </div>
              <label><span>Target date</span>
                <input type="date" value={goalForm.deadline}
                  onChange={(e) => setGoalForm({ ...goalForm, deadline: e.target.value })} /></label>
              <label><span>Why does this matter? (optional)</span>
                <input type="text" placeholder="e.g. First vacation with friends"
                  value={goalForm.why}
                  onChange={(e) => setGoalForm({ ...goalForm, why: e.target.value })} /></label>
              <div className="wb-modal-actions">
                <button type="button" className="wb-modal-cancel" onClick={closeModal}>Cancel</button>
                <button className="wb-modal-save" type="submit">{editingGoalId ? "Save changes" : "Create goal"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== WEEK MODAL ===== */}
      {activeModal === "week" && (
        <div className="wb-modal-overlay" onClick={closeModal}>
          <div className="wb-modal wb-modal-wide" onClick={(e) => e.stopPropagation()}>
            <div className="wb-modal-head">
              <div>
                <span className="wb-modal-kicker">THIS WEEK</span>
                <h3>Your money at a glance</h3>
              </div>
              <button className="wb-modal-close" onClick={closeModal} type="button">×</button>
            </div>

            <div className="wb-week-stats">
              <div className="wb-week-stat">
                <span className="wb-week-stat-label">Total spent</span>
                <span className="wb-week-stat-value">₹ {totalAllTime}</span>
              </div>
              <div className="wb-week-stat">
                <span className="wb-week-stat-label">Expenses</span>
                <span className="wb-week-stat-value">{expenses.length}</span>
              </div>
              <div className="wb-week-stat">
                <span className="wb-week-stat-label">Blooms</span>
                <span className="wb-week-stat-value">{filledBloom}/7</span>
              </div>
              <div className="wb-week-stat">
                <span className="wb-week-stat-label">Wins</span>
                <span className="wb-week-stat-value">{wins.length}</span>
              </div>
            </div>

            {categoryData.length > 0 ? (
              <div className="wb-donut-wrap">
                <svg viewBox="0 0 100 100" className="wb-donut">
                  {(() => {
                    const colors = {
                      food: "#d48a94", transport: "#8fae7d", fun: "#eec873",
                      bills: "#9b76a8", shopping: "#c9a8d9", other: "#b6c9a8",
                    };
                    let offset = 0;
                    const r = 40;
                    const circumference = 2 * Math.PI * r;
                    return categoryData.map((d) => {
                      const dash = (d.pct / 100) * circumference;
                      const el = (
                        <circle key={d.cat} cx="50" cy="50" r={r} fill="none"
                          stroke={colors[d.cat]} strokeWidth="14"
                          strokeDasharray={`${dash} ${circumference - dash}`}
                          strokeDashoffset={-offset}
                          transform="rotate(-90 50 50)" />
                      );
                      offset += dash;
                      return el;
                    });
                  })()}
                  <text x="50" y="49" textAnchor="middle" fontSize="11" fontWeight="700" fill="#2c2430">
                    ₹{totalAllTime}
                  </text>
                  <text x="50" y="60" textAnchor="middle" fontSize="6" fill="#928994">total</text>
                </svg>
                <div className="wb-donut-legend">
                  {categoryData.map((d) => (
                    <div key={d.cat} className="wb-donut-legend-item">
                      <span className={`wb-donut-dot cat-${d.cat}`} />
                      <span className="wb-donut-label">{d.cat}</span>
                      <strong>₹{d.value}</strong>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="wb-modal-empty">
                <span>📊</span>
                <p>No expenses yet. Add your first one to see insights.</p>
              </div>
            )}

            {expenses.length > 0 && (
              <div className="wb-modal-list">
                <div className="wb-modal-list-head"><span>Recent expenses</span></div>
                {expenses.slice(0, 5).map((exp) => (
                  <div key={exp.id} className="wb-list-item">
                    <span className="wb-list-item-emoji">
                      {exp.category === "food" ? "🍜"
                        : exp.category === "transport" ? "🚕"
                        : exp.category === "fun" ? "🎬"
                        : exp.category === "bills" ? "💡"
                        : exp.category === "shopping" ? "🛍️" : "✨"}
                    </span>
                    <div className="wb-list-item-info">
                      <strong>{exp.title}</strong>
                      <small>
                        {new Date(exp.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                      </small>
                    </div>
                    <span className="wb-list-item-amt">₹{exp.amount}</span>
                    <button className="wb-list-item-del" onClick={() => handleDeleteExpense(exp.id)} type="button">×</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== JOURNAL MODAL ===== */}
      {activeModal === "journal" && (
        <div className="wb-modal-overlay" onClick={closeModal}>
          <div className="wb-modal" onClick={(e) => e.stopPropagation()}>
            <div className="wb-modal-head">
              <div>
                <span className="wb-modal-kicker">JOURNAL</span>
                <h3>How did money feel today?</h3>
              </div>
              <button className="wb-modal-close" onClick={closeModal} type="button">×</button>
            </div>
            <form className="wb-modal-form" onSubmit={handleSaveJournal}>
              <label><span>Pick a mood</span>
                <div className="wb-journal-moods">
                  {moods.map((m) => (
                    <button key={m.id} type="button"
                      className={`wb-journal-mood ${journalForm.mood === m.id ? "active" : ""}`}
                      onClick={() => setJournalForm({ ...journalForm, mood: m.id })}
                      aria-label={m.label}>
                      <span className="wb-journal-mood-emoji">{m.emoji}</span>
                      <span className="wb-journal-mood-label">{m.label}</span>
                    </button>
                  ))}
                </div>
              </label>
              <label><span>Your thoughts</span>
                <textarea rows={5} placeholder="Today I felt..."
                  value={journalForm.entry}
                  onChange={(e) => setJournalForm({ ...journalForm, entry: e.target.value })}
                  autoFocus required />
              </label>
              <div className="wb-modal-actions">
                <button type="button" className="wb-modal-cancel" onClick={closeModal}>Cancel</button>
                <button className="wb-modal-save" type="submit">Save entry</button>
              </div>
            </form>
            {journal.length > 0 && (
              <div className="wb-journal-past">
                <span className="wb-journal-past-head">Past entries</span>
                {journal.slice(0, 3).map((j) => (
                  <div key={j.id} className="wb-journal-entry">
                    <span className="wb-journal-entry-emoji">
                      {moods.find((m) => m.id === j.mood)?.emoji || "✨"}
                    </span>
                    <div>
                      <p>{j.entry}</p>
                      <small>
                        {new Date(j.date).toLocaleDateString("en-IN", {
                          day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                        })}
                      </small>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== WIN MODAL ===== */}
      {activeModal === "win" && (
        <div className="wb-modal-overlay" onClick={closeModal}>
          <div className="wb-modal" onClick={(e) => e.stopPropagation()}>
            <div className="wb-modal-head">
              <div>
                <span className="wb-modal-kicker">TINY WIN</span>
                <h3>Celebrate a small win 🎉</h3>
              </div>
              <button className="wb-modal-close" onClick={closeModal} type="button">×</button>
            </div>
            <form className="wb-modal-form" onSubmit={async (e) => {
              e.preventDefault();
              if (!newWin.trim()) return;
              await handleAddWin();
              closeModal();
            }}>
              <label>
                <span>What did you do well today?</span>
                <input
                  type="text"
                  placeholder="e.g. Said no to a chai"
                  value={newWin}
                  onChange={(e) => setNewWin(e.target.value)}
                  autoFocus
                  required
                />
              </label>
              <div className="wb-win-suggestions">
                <span className="wb-win-suggestions-label">Or pick one:</span>
                {winSuggestions.slice(0, 5).map((s, i) => (
                  <button
                    key={i}
                    type="button"
                    className="wb-win-suggestion"
                    onClick={() => setNewWin(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
              <div className="wb-modal-actions">
                <button type="button" className="wb-modal-cancel" onClick={closeModal}>Cancel</button>
                <button className="wb-modal-save" type="submit">Save win 🐷</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== TOPBAR ===== */}
      <header className="wb-topbar">
        <div className="wb-brand">
          <span className="wb-brand-icon" aria-hidden="true">
            <svg viewBox="0 0 40 40" fill="none">
              <rect x="3" y="3" width="34" height="34" rx="12" />
              <path d="M13 25.5C13 19 17 13 27 11.5C26 21 21.5 26 13 25.5Z" />
              <path d="M12 29C15 23 19 19 25 15" />
              <circle cx="12" cy="12" r="2" />
            </svg>
          </span>
          <span>Penny<span className="wb-brand-accent">Bloom</span></span>
        </div>
        <div className="wb-topbar-right">
          <div className="wb-avatar">{initial}</div>
          <button className="wb-logout" onClick={(e) => { createRipple(e); onLogout(); }} type="button">Log out</button>
        </div>
      </header>

      {/* ===== HERO ===== */}
      <section className="wb-hero">
        <div className="wb-hero-left">
          <div className="wb-eyebrow">
            <span className="wb-dot" />
            {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short" })}
          </div>
          <h1 className="wb-title">
            Good to see you,<br /><em>{firstName}.</em>
          </h1>
          <p className="wb-subtitle">
            Let's check in on how your money has been feeling this week.
            No pressure, no judgment — just a gentle look.
          </p>
          <div className="wb-hero-actions">
            <button className="wb-btn-primary"
              onClick={(e) => { createRipple(e); setActiveModal("expense"); }} type="button">
              Add today's expense <span>↗</span>
            </button>
            <button className="wb-btn-ghost"
              onClick={(e) => { createRipple(e); setActiveModal("goal"); }} type="button">
              🎯 Set a new goal
            </button>
          </div>

          {expenses.length > 0 ? (
            <div className="wb-expenses-preview">
              <div className="wb-expenses-head">
                <span>Today's spending</span>
                <strong>₹ {totalToday}</strong>
              </div>
              <div className="wb-expenses-list">
                {todayExpenses.length === 0 ? (
                  <p style={{ fontSize: 12, color: "#928994", margin: "8px 0" }}>Nothing today — a fresh start.</p>
                ) : (
                  todayExpenses.slice(0, 3).map((exp) => (
                    <div key={exp.id} className="wb-expense-item">
                      <span className="wb-expense-dot" />
                      <span className="wb-expense-title">
                        {exp.mood && spendingMoods.find((m) => m.id === exp.mood)?.emoji} {exp.title}
                      </span>
                      <span className="wb-expense-amt">₹{exp.amount}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            <div className="wb-expenses-empty">
              <span className="wb-empty-icon">💸</span>
              <p>No expenses tracked yet. Add one to get started.</p>
            </div>
          )}
        </div>

        <div className="wb-hero-right">
          <div className="wb-mood-card">
            <div className="wb-mood-head">
              <span className="wb-mood-tag">MONEY MOOD</span>
              <span className="wb-mood-date">Today</span>
            </div>
            <h3 className="wb-mood-question">
              {selectedMood ? activeMood.tip : "How are you feeling about money?"}
            </h3>
            <div className="wb-mood-options">
              {moods.map((mood) => (
                <button key={mood.id} type="button"
                  className={`wb-mood-btn ${selectedMood === mood.id ? "active" : ""}`}
                  onClick={(e) => handleMoodSelect(e, mood)}
                  aria-label={mood.label}>
                  <span className="wb-mood-emoji">{mood.emoji}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="wb-bloom-card">
            <span className="wb-piggy-peek" aria-hidden="true">🐷</span>
            <div className="wb-bloom-head">
              <h3>This week's bloom</h3>
              <span>{filledBloom === 0 ? "Not started" : `${filledBloom}/7 days`}</span>
            </div>
            <div className="wb-bloom-days">
              {bloomDays.map((d, i) => (
                <button key={i} type="button"
                  className={`wb-bloom-day ${d.filled ? "filled" : ""}`}
                  onClick={(e) => handleBloomToggle(e, i)}
                  aria-label={`Day ${d.day}`}>
                  <span className="wb-bloom-icon">{d.icon || "🌱"}</span>
                  <span className="wb-bloom-label">{d.day}</span>
                </button>
              ))}
            </div>
            <div className="wb-bloom-foot">
              <span className="wb-bloom-dot" />
              <p>
                {filledBloom === 0 ? "Tap a petal to mark a mindful day"
                  : filledBloom === 7 ? "Full bloom! 🌸 Amazing week."
                  : `${7 - filledBloom} more days to complete`}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ===== QUICK ACTIONS ===== */}
      <section className="wb-quick">
        <div className="wb-quick-head">
          <h2>Quick actions</h2>
          <span>One tap away</span>
        </div>
        <div className="wb-quick-grid">
          <button type="button" className="wb-quick-btn rose"
            onClick={(e) => { createRipple(e); setActiveModal("week"); }}>
            <span className="wb-quick-icon">📊</span>
            <span className="wb-quick-label">This week</span>
          </button>
          <button type="button" className="wb-quick-btn plum"
            onClick={(e) => { createRipple(e); setActiveModal("journal"); }}>
            <span className="wb-quick-icon">💌</span>
            <span className="wb-quick-label">Journal</span>
          </button>
          <button type="button" className="wb-quick-btn green"
            onClick={(e) => { createRipple(e); setActiveModal("win"); }}>
            <span className="wb-quick-icon">🌟</span>
            <span className="wb-quick-label">Log a win</span>
          </button>
          <button type="button" className="wb-quick-btn gold"
            onClick={(e) => {
              createRipple(e);
              document.querySelector(".wb-quote")?.scrollIntoView({ behavior: "smooth" });
            }}>
            <span className="wb-quick-icon">💡</span>
            <span className="wb-quick-label">Daily tip</span>
          </button>
        </div>
      </section>

      {/* ===== PIGGY OF WINS ===== */}
      <section className="wb-wins">
        <div className="wb-stories-head">
          <h2>🐷 Piggy of Wins</h2>
          <span className="wb-wins-count">{wins.length} {wins.length === 1 ? "win" : "wins"}</span>
        </div>
        <div className="wb-wins-layout">
          <div className="wb-jar-visual">
            <div className="wb-piggy-bank">
              <svg className="wb-piggy-svg" viewBox="0 0 200 180" xmlns="http://www.w3.org/2000/svg">
                <ellipse cx="100" cy="168" rx="70" ry="8" fill="rgba(212,138,148,0.25)" />
                <path d="M168 95 Q 185 90, 182 105 Q 180 115, 172 112"
                  stroke="#c97a88" strokeWidth="4" fill="none" strokeLinecap="round" />
                <rect x="65" y="140" width="20" height="22" rx="9" fill="#c97a88" />
                <rect x="115" y="140" width="20" height="22" rx="9" fill="#c97a88" />
                <ellipse cx="100" cy="105" rx="75" ry="55" fill="url(#piggyBody)" />
                <ellipse cx="100" cy="120" rx="50" ry="30" fill="rgba(255,255,255,0.25)" />
                <clipPath id="bodyClip">
                  <ellipse cx="100" cy="105" rx="75" ry="55" />
                </clipPath>
                <rect
                  x="25" y={165 - Math.min(100, wins.length * 10)}
                  width="150" height={Math.min(100, wins.length * 10)}
                  fill="url(#coinFill)"
                  clipPath="url(#bodyClip)"
                  style={{ transition: "y 0.8s cubic-bezier(0.2,0.8,0.2,1), height 0.8s cubic-bezier(0.2,0.8,0.2,1)" }}
                />
                <rect x="55" y="140" width="22" height="24" rx="10" fill="#d48a94" />
                <rect x="123" y="140" width="22" height="24" rx="10" fill="#d48a94" />
                <path d="M55 65 Q 50 40, 72 52 Z" fill="#c97a88" />
                <path d="M145 65 Q 150 40, 128 52 Z" fill="#c97a88" />
                <path d="M58 62 Q 55 48, 68 56 Z" fill="#f5b8c5" />
                <path d="M142 62 Q 145 48, 132 56 Z" fill="#f5b8c5" />
                <rect x="88" y="52" width="24" height="5" rx="2.5" fill="#8d3f4c" />
                <circle cx="75" cy="92" r="5" fill="#4a2030" />
                <circle cx="125" cy="92" r="5" fill="#4a2030" />
                <circle cx="77" cy="90" r="1.8" fill="#fff" />
                <circle cx="127" cy="90" r="1.8" fill="#fff" />
                <ellipse cx="62" cy="108" rx="9" ry="5" fill="rgba(245,140,160,0.55)" />
                <ellipse cx="138" cy="108" rx="9" ry="5" fill="rgba(245,140,160,0.55)" />
                <ellipse cx="100" cy="112" rx="18" ry="13" fill="#f5a8bb" stroke="#d48a94" strokeWidth="1.5" />
                <ellipse cx="94" cy="112" rx="2.5" ry="3.5" fill="#8d3f4c" />
                <ellipse cx="106" cy="112" rx="2.5" ry="3.5" fill="#8d3f4c" />
                <path d="M92 128 Q 100 135, 108 128" stroke="#8d3f4c" strokeWidth="2.2" fill="none" strokeLinecap="round" />
                <defs>
                  <radialGradient id="piggyBody" cx="35%" cy="30%" r="75%">
                    <stop offset="0%" stopColor="#ffd6de" />
                    <stop offset="55%" stopColor="#f5a8bb" />
                    <stop offset="100%" stopColor="#d48a94" />
                  </radialGradient>
                  <linearGradient id="coinFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ffd97a" />
                    <stop offset="100%" stopColor="#e8a83d" />
                  </linearGradient>
                </defs>
              </svg>
              {wins.length > 0 && (
                <span className="wb-piggy-sparkle">✨</span>
              )}
            </div>
            <span className="wb-jar-caption">
              {wins.length === 0 ? "Feed your piggy a win 🐷" :
               wins.length < 5 ? "Oinky is filling up ✨" :
               wins.length < 10 ? "Look at that chubby piggy! 🌟" :
               "Oinky is stuffed with wins! 🎉"}
            </span>
          </div>
          <div className="wb-wins-content">
            <form className="wb-win-form" onSubmit={handleAddWin}>
              <input type="text" placeholder="What's a tiny win today?"
                value={newWin}
                onChange={(e) => setNewWin(e.target.value)} />
              <button type="submit" className="wb-win-add" aria-label="Add win">+</button>
            </form>
            {wins.length === 0 && (
              <div className="wb-win-suggestions">
                <span className="wb-win-suggestions-label">Or try one of these:</span>
                {winSuggestions.slice(0, 4).map((s, i) => (
                  <button key={i} type="button" className="wb-win-suggestion"
                    onClick={() => handleAddSuggestedWin(s)}>{s}</button>
                ))}
              </div>
            )}
            {wins.length > 0 && (
              <div className="wb-wins-list">
                {wins.slice(0, 5).map((w) => (
                  <div key={w.id} className="wb-win-item">
                    <span className="wb-win-item-emoji">⭐</span>
                    <div className="wb-win-item-info">
                      <p>{w.text}</p>
                      <small>
                        {new Date(w.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                      </small>
                    </div>
                    <button className="wb-list-item-del" onClick={() => handleDeleteWin(w.id)}
                      type="button" aria-label="Delete win">×</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ===== DREAM JARS ===== */}
      {goals.length > 0 && (
        <section className="wb-jars-section">
          <div className="wb-jars-head">
            <div>
              <h2>🐷 Dream Jars</h2>
              <p className="wb-jars-sub">Every rupee you save waters a dream.</p>
            </div>
            <button className="wb-jars-new" onClick={(e) => {
              createRipple(e);
              setGoalForm({ name: "", target: "", saved: "", deadline: "", why: "", icon: "🎯" });
              setEditingGoalId(null);
              setActiveModal("goal");
            }} type="button">+ New jar</button>
          </div>
          <div className="wb-jars-grid">
            {goals.map((goal) => {
              const pct = Math.min(100, Math.round((goal.saved / goal.target) * 100));
              const remaining = Math.max(0, goal.target - goal.saved);
              const completed = goal.saved >= goal.target;
              return (
                <div key={goal.id} className={`wb-jar-card ${completed ? "complete" : ""}`}>
                  <div className="wb-jar-card-head">
                    <span className="wb-jar-card-icon">{goal.icon}</span>
                    <div className="wb-jar-card-actions">
                      <button className="wb-jar-action" onClick={() => handleEditGoal(goal)} type="button" aria-label="Edit">✏️</button>
                      <button className="wb-jar-action danger" onClick={() => handleDeleteGoal(goal.id)} type="button" aria-label="Delete">×</button>
                    </div>
                  </div>
                  <h3>{goal.name}</h3>
                  {goal.why && <p className="wb-jar-why">"{goal.why}"</p>}
                  <div className="wb-jar-visual-mini">
                    <div className="wb-jar-mini-glass">
                      <div className="wb-jar-mini-fill" style={{ height: `${pct}%` }} />
                      <div className="wb-jar-mini-lid" />
                      {completed && <span className="wb-jar-mini-crown">👑</span>}
                    </div>
                  </div>
                  <div className="wb-jar-numbers">
                    <span className="wb-jar-saved">₹{goal.saved.toLocaleString("en-IN")}</span>
                    <span className="wb-jar-target">of ₹{goal.target.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="wb-jar-bar"><span style={{ width: `${pct}%` }} /></div>
                  <div className="wb-jar-meta">
                    <span>{pct}%</span>
                    <span>{completed ? "🎉 Complete!" : `₹${remaining.toLocaleString("en-IN")} to go`}</span>
                  </div>
                  <div className="wb-jar-card-actions-row">
                    <button className="wb-jar-add-money" onClick={() => {
                      const val = prompt(`How much to add to "${goal.name}"? (₹)`);
                      if (val && !isNaN(val) && Number(val) > 0) handleAddMoney(goal.id, Number(val));
                    }} type="button">+ Add money</button>
                    <button className="wb-jar-withdraw" onClick={() => {
                      const val = prompt(`How much to withdraw from "${goal.name}"? (₹)`);
                      if (val && !isNaN(val) && Number(val) > 0) handleWithdraw(goal.id, Number(val));
                    }} type="button">Withdraw</button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ===== MOOD INSIGHTS ===== */}
      {moodInsights.length > 0 && (
        <section className="wb-mood-insights">
          <div className="wb-stories-head">
            <h2>🥰 Mood & Money</h2>
            <span className="wb-mood-count">{expenses.filter((e) => e.mood).length} tagged</span>
          </div>
          <div className="wb-mood-insights-grid">
            {moodInsights.map((m) => (
              <div key={m.mood.id} className="wb-mood-insight-card">
                <span className="wb-mood-insight-emoji">{m.mood.emoji}</span>
                <div className="wb-mood-insight-info">
                  <strong>{m.mood.label}</strong>
                  <small>{m.count} {m.count === 1 ? "purchase" : "purchases"}</small>
                </div>
                <span className="wb-mood-insight-amt">₹{m.total}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ===== QUOTE ===== */}
      <section className="wb-quote">
        <div className="wb-quote-inner">
          <span className="wb-quote-mark">"</span>
          <p>{todayQuote.text}</p>
          <span className="wb-quote-author">— {todayQuote.author}</span>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="wb-footer">
        <span>© {new Date().getFullYear()} PennyBloom</span>
        <span>Made for a healthier relationship with money.</span>
      </footer>
    </main>
  );
}

export default WelcomePage;