import { useState, useEffect, useLayoutEffect, useRef } from "react";
import "./App.css";
import WelcomePage from "./WelcomePage";

const API_URL = "http://127.0.0.1:8000";

// Coins visible inside the piggy bank: [x% , row (0 = bottom, 1 = top), rotation]
const JAR_COINS = [
  [2, 0, -8], [22, 0, 10], [42, 0, -4], [62, 0, 12], [80, 0, -10],
  [12, 1, 6], [32, 1, -12], [52, 1, 8], [70, 1, -6],
];

function App() {
  const [mode, setMode] = useState("signup");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loggedInUser, setLoggedInUser] = useState("");

  const isSignup = mode === "signup";

  // ===== REFS =====
  const authCardRef = useRef(null);
  const leftEyeRef = useRef(null);
  const rightEyeRef = useRef(null);

  const piggySceneRef = useRef(null);
  const piggyRef = useRef(null);
  const ropeAnchorRef = useRef(null);
  const ropeShadowRef = useRef(null);
  const ropePathRef = useRef(null);
  const ropeHighlightRef = useRef(null);
  const ropeGripRef = useRef(null);
  const coinsLayerRef = useRef(null);
  const followRaf = useRef(null);
  const happyTimer = useRef(null);

  const [showRopeCounter, setShowRopeCounter] = useState(false);
  const [ropeCounterValue, setRopeCounterValue] = useState(0);

  const ropeDragState = useRef({
    isDragging: false,
    startY: 0,
    maxPull: 100,
    power: 0,
  });

  // ===== 3D TILT =====
  useEffect(() => {
    const card = authCardRef.current;
    if (!card) return;

    const isTouchDevice = window.matchMedia("(hover: none)").matches;
    if (isTouchDevice) return;

    let animationFrame = null;

    const handleMouseMove = (e) => {
      if (animationFrame) cancelAnimationFrame(animationFrame);
      animationFrame = requestAnimationFrame(() => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        const rotateX = ((y - centerY) / centerY) * -6;
        const rotateY = ((x - centerX) / centerX) * 6;

        card.style.transform = `perspective(1200px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-6px) scale(1.01)`;

        card.style.setProperty("--shine-x", `${(x / rect.width) * 100}%`);
        card.style.setProperty("--shine-y", `${(y / rect.height) * 100}%`);
      });
    };

    const handleMouseLeave = () => {
      if (animationFrame) cancelAnimationFrame(animationFrame);
      card.style.transform = "";
    };

    card.addEventListener("mousemove", handleMouseMove);
    card.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      card.removeEventListener("mousemove", handleMouseMove);
      card.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, []);

  // ===== PIGGY EYES =====
  useEffect(() => {
    const leftEye = leftEyeRef.current;
    const rightEye = rightEyeRef.current;
    if (!leftEye || !rightEye) return;

    const handleMouseMove = (e) => {
      [leftEye, rightEye].forEach((eye) => {
        const rect = eye.getBoundingClientRect();
        const eyeCenterX = rect.left + rect.width / 2;
        const eyeCenterY = rect.top + rect.height / 2;
        const dx = e.clientX - eyeCenterX;
        const dy = e.clientY - eyeCenterY;
        const angle = Math.atan2(dy, dx);
        const distance = Math.min(2.5, Math.hypot(dx, dy) / 50);
        eye.style.transform = `translate(${Math.cos(angle) * distance}px, ${Math.sin(angle) * distance}px)`;
      });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [isLoggedIn]);

  // ===== ROPE: always drawn from the jar anchor to the grip =====
  const updateRope = () => {
    const path = ropePathRef.current;
    const shadow = ropeShadowRef.current;
    const highlight = ropeHighlightRef.current;
    const grip = ropeGripRef.current;
    const anchor = ropeAnchorRef.current;
    if (!path || !grip || !anchor) return;

    const svgRect = path.ownerSVGElement.getBoundingClientRect();
    const a = anchor.getBoundingClientRect();
    const g = grip.getBoundingClientRect();

    const x1 = a.left + a.width / 2 - svgRect.left;
    const y1 = a.top + a.height / 2 - svgRect.top;
    const x2 = g.left + g.width / 2 - svgRect.left;
    const y2 = g.top + g.height * 0.3 - svgRect.top; // tucked under the grip

    const dy = y2 - y1;
    const d = `M ${x1} ${y1} C ${x1} ${y1 + dy * 0.45}, ${x2} ${y2 - dy * 0.45}, ${x2} ${y2}`;

    path.setAttribute("d", d);
    if (highlight) highlight.setAttribute("d", d);
    if (shadow) shadow.setAttribute("d", d);
  };

  // keep the rope glued for a while (jar shaking / grip springing back)
  const followRope = (duration = 600) => {
    if (followRaf.current) cancelAnimationFrame(followRaf.current);
    const end = performance.now() + duration;
    const tick = () => {
      updateRope();
      if (performance.now() < end) {
        followRaf.current = requestAnimationFrame(tick);
      } else {
        followRaf.current = null;
      }
    };
    followRaf.current = requestAnimationFrame(tick);
  };

  useLayoutEffect(() => {
    if (isLoggedIn) return;
    updateRope();
    // run once more after fonts / layout settle
    const t = setTimeout(updateRope, 150);
    const onResize = () => updateRope();
    window.addEventListener("resize", onResize);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", onResize);
      if (followRaf.current) cancelAnimationFrame(followRaf.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn]);

  // ===== ROPE HANDLERS =====
  const handleRopePullStart = (e) => {
    e.preventDefault();
    if (followRaf.current) cancelAnimationFrame(followRaf.current);
    if (happyTimer.current) clearTimeout(happyTimer.current);

    // cute face: eyes squeeze shut, mouth opens
    const sc = piggySceneRef.current;
    if (sc) {
      sc.classList.remove("piggy-happy");
      sc.classList.add("piggy-pulling");
    }

    ropeDragState.current.isDragging = true;
    ropeDragState.current.startY = e.clientY;
    ropeDragState.current.power = 0;

    if (ropeGripRef.current) ropeGripRef.current.style.transition = "";

    window.addEventListener("pointermove", handleRopePullMove);
    window.addEventListener("pointerup", handleRopePullEnd);
    window.addEventListener("pointercancel", handleRopePullEnd);
  };

  const handleRopePullMove = (e) => {
    if (!ropeDragState.current.isDragging) return;

    const deltaY = e.clientY - ropeDragState.current.startY;
    const clamped = Math.max(0, Math.min(deltaY, ropeDragState.current.maxPull));
    const power = (clamped / ropeDragState.current.maxPull) * 100;
    ropeDragState.current.power = power;

    if (ropeGripRef.current) {
      ropeGripRef.current.style.transform = `translateX(-50%) translateY(${clamped}px)`;
    }

    if (piggyRef.current) {
      const stretch = 1 + (power / 100) * 0.03;
      piggyRef.current.style.transform = `scale(${1 / stretch}, ${stretch}) rotate(-3deg)`;
    }

    updateRope();
  };

  const handleRopePullEnd = () => {
    if (!ropeDragState.current.isDragging) return;
    ropeDragState.current.isDragging = false;
    const power = ropeDragState.current.power;

    window.removeEventListener("pointermove", handleRopePullMove);
    window.removeEventListener("pointerup", handleRopePullEnd);
    window.removeEventListener("pointercancel", handleRopePullEnd);

    if (ropeGripRef.current) {
      ropeGripRef.current.style.transition = "transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)";
      ropeGripRef.current.style.transform = "translateX(-50%) translateY(0)";
      setTimeout(() => {
        if (ropeGripRef.current) ropeGripRef.current.style.transition = "";
      }, 400);
    }

    if (piggyRef.current) {
      piggyRef.current.style.transition = "transform 0.3s ease";
      piggyRef.current.style.transform = "";
      setTimeout(() => {
        if (piggyRef.current) piggyRef.current.style.transition = "";
      }, 300);
    }

    // rope follows the grip while it springs back
    followRope(900);

    const sc2 = piggySceneRef.current;
    if (sc2) sc2.classList.remove("piggy-pulling");

    if (power < 20) return;

    // coins came out -> happy smile for a moment
    if (sc2) {
      sc2.classList.add("piggy-happy");
      happyTimer.current = setTimeout(() => {
        if (piggySceneRef.current) piggySceneRef.current.classList.remove("piggy-happy");
      }, 1600);
    }

    triggerLandingCoinRain(power);
  };

  const triggerLandingCoinRain = (power) => {
    const scene = piggySceneRef.current;
    const piggy = piggyRef.current;
    if (!scene || !piggy) return;

    scene.classList.add("piggy-shaking");
    if (navigator.vibrate) navigator.vibrate([25, 15, 25, 15, 50]);

    const coinCount = Math.floor(12 + (power / 100) * 16);
    const totalAmount = Math.floor(25 + (power / 100) * 275);

    setRopeCounterValue(totalAmount);
    setShowRopeCounter(true);
    setTimeout(() => setShowRopeCounter(false), 1100);

    playCoinSound();
    followRope(1400); // jar shakes, rope stays attached

    // coins burst out of the slot on top of the piggy bank
    const piggyRect = piggy.getBoundingClientRect();
    const sceneRect = scene.getBoundingClientRect();
    const centerX = piggyRect.left - sceneRect.left + piggyRect.width / 2;
    const slotY = piggyRect.top - sceneRect.top + piggyRect.height * 0.04;

    let spawned = 0;
    const interval = setInterval(() => {
      if (spawned >= coinCount) {
        clearInterval(interval);
        return;
      }
      spawnLandingCoin(centerX, slotY, power);
      spawned++;
    }, 45);

    setTimeout(() => {
      scene.classList.remove("piggy-shaking");
      scene.classList.add("piggy-released");
      setTimeout(() => scene.classList.remove("piggy-released"), 500);
    }, 500);
  };

  const spawnLandingCoin = (startX, startY, power) => {
    const container = coinsLayerRef.current;
    if (!container) return;

    const coin = document.createElement("div");
    coin.className = "landing-coin";

    // 🚨 RUPEE SIGN HATA DIYA HAI - AB SIRF EMOJI AAYENGE 🚨
    const symbols = ["🪙", "🪙", "🪙", "💰", "✨", "💎"];
    coin.textContent = symbols[Math.floor(Math.random() * symbols.length)];

    const startXRandom = startX + (Math.random() - 0.5) * 36;

    coin.style.left = `${startXRandom}px`;
    coin.style.top = `${startY}px`;
    container.appendChild(coin);

    let posX = startXRandom;
    let posY = startY;
    // strong upward pop out of the slot, then it arcs sideways and falls
    let velX = (Math.random() - 0.5) * 9;
    let velY = -9 - Math.random() * 5 - (power / 100) * 4;
    let rotation = Math.random() * 360;
    const rotSpeed = (Math.random() - 0.5) * 18;

    const gravity = 0.6;
    const groundLevel = container.clientHeight - 20;
    let bounces = 0;
    const maxBounces = 3;

    const animate = () => {
      velY += gravity;
      posY += velY;
      posX += velX;
      rotation += rotSpeed;
      velX *= 0.992;

      if (posY > groundLevel) {
        posY = groundLevel;
        velY *= -0.5;
        velX *= 0.7;
        bounces++;
        if (bounces >= maxBounces || Math.abs(velY) < 0.8) {
          coin.style.transform = `translate(${posX - startXRandom}px, ${posY - startY}px) rotate(${rotation}deg)`;
          coin.style.transition = "opacity 0.6s ease 0.4s";
          coin.style.opacity = "0";
          setTimeout(() => coin.remove(), 1100);
          return;
        }
      }

      if (posY > container.clientHeight + 80 || posX < -120 || posX > container.clientWidth + 120) {
        coin.remove();
        return;
      }

      coin.style.transform = `translate(${posX - startXRandom}px, ${posY - startY}px) rotate(${rotation}deg)`;
      requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);
  };

  const playCoinSound = () => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioContext();
      for (let i = 0; i < 5; i++) {
        setTimeout(() => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "triangle";
          osc.frequency.setValueAtTime(1100 + Math.random() * 400, ctx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(550, ctx.currentTime + 0.15);
          gain.gain.setValueAtTime(0.12, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 0.2);
        }, i * 70);
      }
    } catch (e) {}
  };

  useEffect(() => {
    return () => {
      window.removeEventListener("pointermove", handleRopePullMove);
      window.removeEventListener("pointerup", handleRopePullEnd);
      window.removeEventListener("pointercancel", handleRopePullEnd);
    };
  }, []);

  const switchMode = (newMode) => {
    setMode(newMode);
    setMessage("");
    setMessageType("");
    setPassword("");
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    setIsLoggedIn(false);
    setLoggedInUser("");
    setName("");
    setEmail("");
    setPassword("");
    setMode("login");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage("");
    setMessageType("");

    if (isSignup && !name.trim()) {
      setMessage("Please enter your name.");
      setMessageType("error");
      return;
    }

    setLoading(true);

    try {
      let response;

      if (isSignup) {
        response = await fetch(`${API_URL}/auth/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            full_name: name.trim(),
            email: email.trim(),
            password,
          }),
        });
      } else {
        const formData = new URLSearchParams();
        formData.append("username", email.trim());
        formData.append("password", password);

        response = await fetch(`${API_URL}/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: formData.toString(),
        });
      }

      let data = {};
      try {
        data = await response.json();
      } catch (e) {
        console.error("Response was not JSON:", e);
      }

      if (!response.ok) {
        let detail = "Please check your details and try again.";
        if (typeof data.detail === "string") detail = data.detail;
        else if (Array.isArray(data.detail)) {
          detail = data.detail.map((err) => err.msg || JSON.stringify(err)).join(", ");
        } else if (typeof data.message === "string") detail = data.message;
        throw new Error(detail);
      }

      if (isSignup) {
        setMessage("Account created successfully!");
        setMessageType("success");
        if (data.access_token) localStorage.setItem("token", data.access_token);
        const displayName = name.trim() || email.split("@")[0];
        setLoggedInUser(displayName);
        setTimeout(() => setIsLoggedIn(true), 800);
        return;
      }

      if (data.access_token) localStorage.setItem("token", data.access_token);

      setMessage("Signed in successfully!");
      setMessageType("success");

      const displayName = (data.user && data.user.name) || name.trim() || email.split("@")[0];
      setLoggedInUser(displayName);
      setTimeout(() => setIsLoggedIn(true), 600);
    } catch (error) {
      setMessage(error.message || "Could not connect to the server. Please try again.");
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  if (isLoggedIn) {
    return <WelcomePage userName={loggedInUser} onLogout={handleLogout} />;
  }

  return (
    <main className="page-shell">
      <div className="aurora-bg" aria-hidden="true">
        <div className="aurora-blob aurora-blob-1" />
        <div className="aurora-blob aurora-blob-2" />
        <div className="aurora-blob aurora-blob-3" />
        <div className="aurora-blob aurora-blob-4" />
        <div className="aurora-blob aurora-blob-5" />
      </div>

      <header className="topbar">
        <a className="brand" href="#" aria-label="PennyBloom home">
          <span className="brand-icon" aria-hidden="true">
            <svg viewBox="0 0 40 40" fill="none">
              <rect x="3" y="3" width="34" height="34" rx="12" />
              <path d="M13 25.5C13 19 17 13 27 11.5C26 21 21.5 26 13 25.5Z" />
              <path d="M12 29C15 23 19 19 25 15" />
              <circle cx="12" cy="12" r="2" />
            </svg>
          </span>
          <span>Penny<span className="brand-accent">Bloom</span></span>
        </a>

        <div className="topbar-right">
          <span>{isSignup ? "Already growing with us?" : "New to PennyBloom?"}</span>
          <button
            type="button"
            className="text-button"
            onClick={() => switchMode(isSignup ? "login" : "signup")}
          >
            {isSignup ? "Sign in" : "Create account"}
          </button>
        </div>
      </header>

      <section className="main-layout">
        <section className="story-panel">
          <div className="eyebrow">
            <span className="eyebrow-dot" />
            YOUR MONEY, YOUR WAY
          </div>

          <h1>
            Make room for
            <br />
            <span>what matters.</span>
          </h1>

          <p className="story-description">
            A calmer way to understand your spending, build better habits,
            and make your money work for the things you love.
          </p>

          <div className="illustration-area" aria-label="Decorative money illustration">
            <div className="orbit orbit-one" />
            <div className="orbit orbit-two" />

            {/* 🚨 FLOATING COINS - RUPEE SIGN HATA DIYA HAI 🚨 */}
            <span className="float-coin coin-one"></span>
            <span className="float-coin coin-two"></span>
            <span className="float-coin coin-three">+</span>

            <div className="leaf leaf-left" />
            <div className="leaf leaf-right" />

            <div className="piggy-scene" ref={piggySceneRef}>
              <div className="piggy-shadow" />

              <div className="money-jar" ref={piggyRef}>
                <div className="jar-neck" />
                <div className="jar-slot" />
                <div className="jar-shine" />
                <div className="jar-face">
                  <span ref={leftEyeRef} className="jar-eye jar-eye-left" />
                  <span ref={rightEyeRef} className="jar-eye jar-eye-right" />
                  <i />
                </div>
                <div className="jar-leaf">
                  <span />
                  <span />
                </div>
                <div className="jar-cheek jar-cheek-left" />
                <div className="jar-cheek jar-cheek-right" />

                {/* Coins visible inside the piggy bank */}
                <div className="jar-pile" aria-hidden="true">
                  {JAR_COINS.map(([x, row, rot], i) => (
                    <span
                      key={i}
                      className="pile-coin"
                      style={{
                        "--x": `${x}%`,
                        "--row": row,
                        "--r": `${rot}deg`,
                        "--d": `${i * 0.03}s`,
                      }}
                    >
                      {/* 🚨 RUPEE SIGN HATA DIYA HAI 🚨 */}
                    </span>
                  ))}
                </div>

                {/* Rope attachment anchor */}
                <div className="jar-rope-anchor" ref={ropeAnchorRef} />
              </div>

              {/* Rope (drawn from jar anchor to grip) */}
              <svg className="piggy-rope-svg" aria-hidden="true">
                <path
                  ref={ropeShadowRef}
                  d="M 0 0 L 0 0"
                  stroke="rgba(141, 84, 96, 0.25)"
                  strokeWidth="10"
                  fill="none"
                  strokeLinecap="round"
                  transform="translate(1.5, 2)"
                />
                <path
                  ref={ropePathRef}
                  d="M 0 0 L 0 0"
                  stroke="#b9707f"
                  strokeWidth="7"
                  fill="none"
                  strokeLinecap="round"
                />
                <path
                  ref={ropeHighlightRef}
                  d="M 0 0 L 0 0"
                  stroke="rgba(255, 255, 255, 0.7)"
                  strokeWidth="1.8"
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray="4 8"
                />
              </svg>

              <div className="piggy-rope-wrap">
                <div
                  className="piggy-rope-grip"
                  ref={ropeGripRef}
                  onPointerDown={handleRopePullStart}
                  title="Pull me!"
                >
                  <div className="grip-shine" />
                  <span className="grip-emoji">💰</span>
                  <div className="grip-ring" />
                </div>
              </div>

              {/* Mini note */}
              <div className="mini-note">
                <span className="note-check">✓</span>
                <span>
                  <strong>Little steps add up</strong>
                  <small>One choice at a time</small>
                </span>
              </div>

              <div className="piggy-coins-layer" ref={coinsLayerRef} />

              {/* 🚨 COUNTER SE BHI RUPEE SIGN HATA DIYA HAI 🚨 */}
              {showRopeCounter && (
                <div className="piggy-counter">+{ropeCounterValue}</div>
              )}
            </div>
          </div>

          <div className="story-footer">
            <span className="footer-line" />
            <p>Spend mindfully. Save happily.</p>
          </div>
        </section>

        <section className="auth-panel">
          <div className="auth-card" ref={authCardRef}>
            <div className="card-kicker">A FRESH START</div>

            <h2>{isSignup ? "Your money, in bloom." : "Welcome back."}</h2>

            <p className="card-description">
              {isSignup
                ? "Create your account and give your goals a little room to grow."
                : "Sign in to pick up where your money journey left off."}
            </p>

            <div className="auth-tabs">
              <button
                type="button"
                className={isSignup ? "auth-tab active" : "auth-tab"}
                onClick={() => switchMode("signup")}
              >
                Create account
              </button>
              <button
                type="button"
                className={!isSignup ? "auth-tab active" : "auth-tab"}
                onClick={() => switchMode("login")}
              >
                Sign in
              </button>
            </div>

            <form onSubmit={handleSubmit} className="auth-form">
              {isSignup && (
                <div className="field-group">
                  <label htmlFor="name">Your name</label>
                  <input
                    id="name"
                    type="text"
                    placeholder="e.g. Alex Morgan"
                    autoComplete="name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    required
                  />
                </div>
              )}

              <div className="field-group">
                <label htmlFor="email">Email address</label>
                <input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </div>

              <div className="field-group">
                <div className="label-row">
                  <label htmlFor="password">Password</label>
                  {!isSignup && (
                    <span className="password-hint">Your account password</span>
                  )}
                </div>

                <div className="password-wrap">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    autoComplete={isSignup ? "new-password" : "current-password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    minLength={isSignup ? 8 : undefined}
                    required
                  />
                  <button
                    type="button"
                    className="show-password"
                    onClick={() => setShowPassword((prev) => !prev)}
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>

                {isSignup && <p className="field-help">Use at least 8 characters.</p>}
              </div>

              {message && (
                <div className={`form-message ${messageType}`} role="status">
                  {message}
                </div>
              )}

              <button className="submit-button" type="submit" disabled={loading}>
                <span>
                  {loading
                    ? "Please wait..."
                    : isSignup
                    ? "Create my account"
                    : "Sign in to PennyBloom"}
                </span>
                {!loading && <span className="button-arrow">↗</span>}
              </button>
            </form>

            <div className="privacy-note">
              <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <rect x="4" y="8" width="12" height="9" rx="2" />
                <path d="M7 8V5.8a3 3 0 0 1 6 0V8" />
              </svg>
              Your account details stay private.
            </div>
          </div>

          <p className="below-card">
            Small steps today. More possibilities tomorrow.
          </p>
        </section>
      </section>

      <footer className="page-footer">
        <span>© {new Date().getFullYear()} PennyBloom</span>
        <span>Made for a healthier relationship with money.</span>
      </footer>
    </main>
  );
}

export default App;