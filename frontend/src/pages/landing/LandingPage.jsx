import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './LandingPage.css';

export default function LandingPage() {
  const navigate = useNavigate();
  const quizIntervalRef = useRef(null);
  const blankTimeoutRef = useRef(null);
  const blankTyperRef = useRef(null);
  const xpObsRef = useRef(null);
  const revealObsRef = useRef(null);

  useEffect(() => {
    // ── NAVBAR SCROLL ──
    const handleScroll = () => {
      const navbar = document.getElementById('navbar');
      if (navbar) navbar.classList.toggle('scrolled', window.scrollY > 60);
    };
    window.addEventListener('scroll', handleScroll);

    // ── STATS TICKER ──
    const tickerItems = [
      '🎓 10,000+ Students Enrolled', '📚 500+ Courses Available',
      '🤖 AI-Adaptive Quiz Engine', '🎮 Gamified Learning Activities',
      '⭐ 4.9/5 Average Rating', '🔥 95% Course Completion Rate',
      '♿ Fully Accessible Platform', '🏆 Real-time Leaderboard',
      '🧠 Groq AI Powered', '📊 Real-time Analytics'
    ];
    const track = document.getElementById('tickerTrack');
    if (track && track.children.length === 0) {
      [...tickerItems, ...tickerItems].forEach(t => {
        const el = document.createElement('div');
        el.className = 'ticker-item';
        el.innerHTML = `<span class="ticker-dot"></span>${t}`;
        track.appendChild(el);
      });
    }

    // ── SCROLL REVEAL ──
    const reveals = document.querySelectorAll('.reveal');
    revealObsRef.current = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
    }, { threshold: 0.1 });
    reveals.forEach(r => revealObsRef.current.observe(r));

    // ── XP COUNTER ──
    let xpDone = false;
    const xpEl = document.getElementById('xpCounter');
    if (xpEl) {
      xpObsRef.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && !xpDone) {
          xpDone = true;
          let val = 0;
          const target = 2450;
          const step = () => {
            val = Math.min(val + Math.ceil(target / 80), target);
            xpEl.textContent = val.toLocaleString();
            if (val < target) requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
        }
      }, { threshold: 0.5 });
      xpObsRef.current.observe(xpEl);
    }

    // ── AI QUIZ DEMO ──
    const questions = [
      { q: 'What is a recursive function in Python?', opts: ['A function that calls itself', 'A function with no return value', 'A type of loop structure', 'A class method decorator'], correct: 0, diff: 'MEDIUM', diffClass: 'diff-medium', exp: 'A recursive function calls itself until it reaches a base case. AI is increasing difficulty to Hard.', next: 'HARD', nextClass: 'diff-hard', nextQ: 'Q4 / 10', prog: '40%' },
      { q: 'What is the time complexity of binary search?', opts: ['O(n)', 'O(log n)', 'O(n²)', 'O(1)'], correct: 1, diff: 'HARD', diffClass: 'diff-hard', exp: 'Binary search halves the search space each step — O(log n). Keeping difficulty at Hard.', next: 'HARD', nextClass: 'diff-hard', nextQ: 'Q5 / 10', prog: '50%' },
      { q: 'Which keyword creates a generator in Python?', opts: ['return', 'async', 'yield', 'lambda'], correct: 2, diff: 'HARD', diffClass: 'diff-hard', exp: 'yield turns a function into a generator. Adjusting to Medium.', next: 'MEDIUM', nextClass: 'diff-medium', nextQ: 'Q6 / 10', prog: '60%' },
    ];
    let qi = 0;

    const runQuizDemo = () => {
      const q = questions[qi % questions.length];
      const badge = document.getElementById('diffBadge');
      const qText = document.getElementById('qText');
      const qCounter = document.getElementById('qCounter');
      const opts = document.querySelectorAll('#optsList .opt');
      const result = document.getElementById('aiResult');
      const resultText = document.getElementById('aiResultText');
      const progFill = document.getElementById('progFill');
      const progPct = document.getElementById('progPct');
      if (!badge) return;
      badge.className = 'diff-badge ' + q.diffClass;
      badge.textContent = q.diff;
      qText.textContent = q.q;
      opts.forEach((o, i) => {
        const letters = ['A', 'B', 'C', 'D'];
        o.className = 'opt';
        o.innerHTML = `<span class="opt-letter">${letters[i]}</span> ${q.opts[i]}`;
      });
      result.classList.remove('show');
      setTimeout(() => {
        if (!document.getElementById('diffBadge')) return;
        opts[q.correct].classList.add('correct');
        opts.forEach((o, i) => { if (i !== q.correct) o.classList.add('wrong'); });
        resultText.textContent = q.exp;
        result.classList.add('show');
      }, 1800);
      setTimeout(() => {
        if (!document.getElementById('diffBadge')) return;
        badge.className = 'diff-badge ' + q.nextClass;
        badge.textContent = q.next;
        qCounter.textContent = q.nextQ;
        progFill.style.width = q.prog;
        progPct.textContent = q.prog;
        qi++;
      }, 4000);
    };
    runQuizDemo();
    quizIntervalRef.current = setInterval(runQuizDemo, 5500);

    // ── BLANK INPUT ANIMATION ──
    const blankWords = ['list', 'array', 'tuple', 'set'];
    let bi = 0;
    const blankEl = document.getElementById('blankInput');
    const animateBlank = () => {
      if (!blankEl) return;
      blankEl.value = '';
      blankEl.style.borderColor = 'var(--p)';
      const word = blankWords[bi % blankWords.length];
      let idx = 0;
      blankTyperRef.current = setInterval(() => {
        blankEl.value += word[idx];
        idx++;
        if (idx >= word.length) {
          clearInterval(blankTyperRef.current);
          blankEl.style.borderColor = 'var(--s)';
          blankTimeoutRef.current = setTimeout(() => { bi++; animateBlank(); }, 2000);
        }
      }, 120);
    };
    setTimeout(animateBlank, 500);

    // ── PARTICLES ──
    const pContainer = document.getElementById('particles');
    if (pContainer && pContainer.children.length === 0) {
      for (let i = 0; i < 30; i++) {
        const p = document.createElement('div');
        p.className = 'particle';
        p.style.cssText = `left:${Math.random() * 100}%;top:${Math.random() * 100}%;--dur:${3 + Math.random() * 4}s;--del:${Math.random() * 3}s;opacity:${0.1 + Math.random() * 0.3};width:${1 + Math.random() * 2}px;height:${1 + Math.random() * 2}px;background:${Math.random() > .5 ? 'var(--p)' : 'var(--s)'};position:absolute;border-radius:50%;animation:particleFloat var(--dur) ease-in-out infinite var(--del) alternate;`;
        pContainer.appendChild(p);
      }
    }

    // ── CLEANUP ──
    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearInterval(quizIntervalRef.current);
      clearInterval(blankTyperRef.current);
      clearTimeout(blankTimeoutRef.current);
      if (revealObsRef.current) revealObsRef.current.disconnect();
      if (xpObsRef.current) xpObsRef.current.disconnect();
    };
  }, []);

  const toggleMenu = () => {
    document.getElementById('hamburger').classList.toggle('open');
    const menu = document.getElementById('mobileMenu');
    menu.classList.toggle('open');
    document.body.style.overflow = menu.classList.contains('open') ? 'hidden' : '';
  };

  const closeMenu = () => {
    document.getElementById('hamburger').classList.remove('open');
    document.getElementById('mobileMenu').classList.remove('open');
    document.body.style.overflow = '';
  };

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    closeMenu();
  };

  return (
    <>
      {/* ══ NAVBAR ══ */}
      <nav id="navbar">
        <div className="container">
          <div className="nav-inner">
            <div className="logo">
              <div className="logo-icon">⚡</div>
              <span>EduAI</span>
            </div>
            <ul className="nav-links">
              <li><a href="#features" onClick={(e) => { e.preventDefault(); scrollTo('features'); }}>Features</a></li>
              <li><a href="#how" onClick={(e) => { e.preventDefault(); scrollTo('how'); }}>How It Works</a></li>
              <li><a href="#ai" onClick={(e) => { e.preventDefault(); scrollTo('ai'); }}>AI Learning</a></li>
              <li><a href="#games" onClick={(e) => { e.preventDefault(); scrollTo('games'); }}>Gamification</a></li>
              <li><a href="#testimonials" onClick={(e) => { e.preventDefault(); scrollTo('testimonials'); }}>Reviews</a></li>
            </ul>
            <div className="nav-btns">
              <button className="nav-login" onClick={() => navigate('/login')}>Login</button>
              <button className="nav-cta" onClick={() => navigate('/role-selection')}>Get Started Free</button>
            </div>
            <button className="hamburger" id="hamburger" onClick={toggleMenu}>
              <span></span><span></span><span></span>
            </button>
          </div>
        </div>
      </nav>

      {/* ══ MOBILE MENU ══ */}
      <div className="mobile-menu" id="mobileMenu">
        <a href="#features" onClick={(e) => { e.preventDefault(); scrollTo('features'); }}>Features</a>
        <a href="#how" onClick={(e) => { e.preventDefault(); scrollTo('how'); }}>How It Works</a>
        <a href="#ai" onClick={(e) => { e.preventDefault(); scrollTo('ai'); }}>AI Learning</a>
        <a href="#games" onClick={(e) => { e.preventDefault(); scrollTo('games'); }}>Gamification</a>
        <a href="#testimonials" onClick={(e) => { e.preventDefault(); scrollTo('testimonials'); }}>Reviews</a>
        <div className="mobile-menu-btns">
          <button className="btn-outline" onClick={() => navigate('/login')}>Login</button>
          <button className="btn-primary" onClick={() => navigate('/role-selection')}>Get Started Free →</button>
        </div>
      </div>

      {/* ══ HERO ══ */}
      <section id="hero">
        <div className="hero-bg">
          <div className="grid-bg"></div>
          <div className="orb orb1"></div>
          <div className="orb orb2"></div>
          <div className="orb orb3"></div>
        </div>
        <div className="container">
          <div className="hero-inner">
            <div className="hero-content">
              <div className="pill">
                <span className="pill-dot"></span>
                ✨ Powered by Groq AI — Adaptive Learning Engine
              </div>
              <h1 className="hero-title">
                Learn Smarter.<br />
                Grow Faster.<br />
                <span className="line3 grad-text">With AI That Adapts To You.</span>
              </h1>
              <p className="hero-sub">
                EduAI personalizes every lesson to your skill level. Watch videos, read notes,
                take AI-adaptive quizzes — and earn rewards while you learn.
              </p>
              <div className="hero-btns">
                <button className="btn-primary" onClick={() => navigate('/register')}>
                  Start Learning Free <span style={{ fontSize: '16px' }}>→</span>
                </button>
                <button className="btn-outline" onClick={() => scrollTo('how')}>
                  <span style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'linear-gradient(135deg,#7B6EF6,#00E5C3)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px' }}>▶</span>
                  How It Works
                </button>
              </div>
              <div className="hero-social-proof">
                <div className="proof-item">⭐ <strong>4.9/5</strong> Rating</div>
                <div className="proof-divider"></div>
                <div className="proof-item">👥 <strong>10,000+</strong> Students</div>
                <div className="proof-divider"></div>
                <div className="proof-item">📚 <strong>500+</strong> Courses</div>
                <div className="proof-divider"></div>
                <div className="proof-item">🏆 <strong>95%</strong> Completion Rate</div>
              </div>
            </div>

            {/* Hero Visual */}
            <div className="hero-visual">
              <div className="float-badge fb1">🏆 <strong style={{ color: '#FFD166' }}>Rank #3</strong> Leaderboard</div>
              <div className="float-badge fb2">🧠 <span style={{ color: '#7B6EF6' }}>AI:</span> Study Functions next</div>
              <div className="float-badge fb3">⚡ <strong style={{ color: '#FFD166' }}>+50 XP</strong> Earned! 🎉</div>
              <div className="dashboard-card">
                <div className="window-dots">
                  <span className="wd1"></span>
                  <span className="wd2"></span>
                  <span className="wd3"></span>
                  <span className="card-title-bar">EduAI Dashboard</span>
                </div>
                <div className="dash-welcome">Welcome back, Arjun! 🌟</div>
                <div className="dash-chips">
                  <span className="chip a">🔥 12 Day Streak</span>
                  <span className="chip s">⚡ 2,450 XP</span>
                  <span className="chip">📚 4 Subjects</span>
                </div>
                <div className="course-mini">
                  <div className="course-mini-title">
                    📘 Python Programming
                    <span style={{ fontSize: '11px', color: 'var(--t2)', float: 'right' }}>75%</span>
                  </div>
                  <div className="prog-bar"><div className="prog-fill"></div></div>
                  <div className="prog-label">Topic 6 of 8 — Functions</div>
                </div>
                <div className="quiz-mini">
                  <div className="quiz-mini-header">
                    <span className="quiz-mini-label">🧠 AI Quiz — Today</span>
                    <span className="ai-badge">ADAPTIVE AI</span>
                  </div>
                  <div className="quiz-q">Q4/10: What is a Python list comprehension?</div>
                  <div className="quiz-opts">
                    <div className="quiz-opt active">A. A compact way to create lists</div>
                    <div className="quiz-opt">B. A type of loop</div>
                    <div className="quiz-opt">C. A dictionary method</div>
                  </div>
                  <div className="quiz-ai-msg">🤖 AI adjusted difficulty to <strong>Medium</strong></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══ STATS TICKER ══ */}
      <div id="ticker">
        <div className="ticker-track" id="tickerTrack"></div>
      </div>

      {/* ══ FEATURES ══ */}
      <section id="features">
        <div className="container">
          <div className="section-head reveal">
            <div className="eyebrow">Everything You Need</div>
            <h2 className="section-title">One Platform. <span className="grad-text">Infinite Learning.</span></h2>
            <p className="section-sub">From AI-powered quizzes to gamified activities, EduAI has every tool to make learning stick.</p>
          </div>
          <div className="features-grid">
            {[
              { icon: '🧠', cls: 'fi-p', title: 'AI Adaptive Quizzes', desc: 'Our AI engine analyzes your answers in real time and adjusts quiz difficulty automatically. Struggle? Get easier questions. Excel? Face harder challenges.', tag: '✦ Powered by Groq AI', tagCls: 'ft-p' },
              { icon: '🎮', cls: 'fi-a', title: 'Gamified Learning', desc: 'Turn studying into a game. Earn XP points, unlock badges, climb the leaderboard, and compete with peers — all while actually learning.', tag: '🏆 1,200+ Badges Earned', tagCls: 'ft-a' },
              { icon: '📚', cls: 'fi-s', title: 'Rich Content Library', desc: 'Access video lectures, downloadable PDFs, and interactive slides for every topic — all in one clean, distraction-free learning environment.', tag: '📹 Video · 📄 PDF · 📊 Slides', tagCls: 'ft-s' },
              { icon: '📊', cls: 'fi-p', title: 'Real-time Progress Tracking', desc: 'See exactly where you stand. Detailed analytics show your strengths, weak topics, quiz history, and improvement over time.', tag: '✦ Live Analytics Dashboard', tagCls: 'ft-p' },
              { icon: '🧩', cls: 'fi-r', title: '3 Interactive Game Types', desc: 'Match the Following, Drag and Drop, and Fill in the Blanks — three unique game formats that make memorization and recall actually enjoyable.', tag: '🎯 3 Game Formats', tagCls: 'ft-r' },
              { icon: '♿', cls: 'fi-s', title: 'Built for Every Learner', desc: 'Text-to-speech, speech-to-text, dyslexia-friendly fonts, color blind modes, and high contrast — because education belongs to everyone.', tag: '✦ Fully Accessible', tagCls: 'ft-s' },
            ].map((f, i) => (
              <div key={i} className={`feat-card reveal reveal-delay-${(i % 3) + 1}`}>
                <div className={`feat-icon ${f.cls}`}>{f.icon}</div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
                <span className={`feat-tag ${f.tagCls}`}>{f.tag}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ HOW IT WORKS ══ */}
      <section id="how">
        <div className="container">
          <div className="section-head reveal" style={{ textAlign: 'center' }}>
            <div className="eyebrow">The Process</div>
            <h2 className="section-title">From Zero to Expert <span className="grad-text">in 4 Steps</span></h2>
          </div>
          <div className="steps-row">
            {[
              { num: '01', icon: '🎯', title: 'Pick Your Subject', desc: 'Browse 500+ courses across programming, design, math, and more. Enroll in any subject with one click.' },
              { num: '02', icon: '📖', title: 'Study the Content', desc: 'Watch video lectures, read downloadable notes, and view slide presentations — all in one interface.' },
              { num: '03', icon: '🧠', title: 'Take AI-Adaptive Quizzes', desc: 'Our AI adjusts question difficulty based on YOUR performance — making every quiz a personalized challenge.' },
              { num: '04', icon: '🚀', title: 'Earn Rewards & Progress', desc: 'Collect XP, unlock badges, compete on the leaderboard, and track your improvement with detailed analytics.' },
            ].map((s, i) => (
              <div key={i} className={`step reveal reveal-delay-${i + 1}`}>
                <div className="step-num">{s.num}</div>
                <div className="step-icon">{s.icon}</div>
                <h3>{s.title}</h3>
                <p>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ AI SHOWCASE ══ */}
      <section id="ai">
        <div className="container">
          <div className="two-col">
            <div className="reveal">
              <div className="eyebrow">AI-Powered Engine</div>
              <h2 className="section-title">A Quiz That <span className="grad-text">Learns As You Learn</span></h2>
              <p style={{ color: 'var(--t2)', fontSize: '15px', lineHeight: '1.8', fontWeight: 300 }}>
                Most quizzes are the same for everyone. EduAI's adaptive engine watches your performance in real time
                and dynamically shifts difficulty. Answer correctly and the AI upgrades your challenge.
                Struggle and it rebuilds your foundation first.
              </p>
              <ul className="ai-points">
                {[
                  ['✦', 'Real-time difficulty adjustment mid-quiz'],
                  ['🤖', 'Wrong answer explanations powered by Groq AI'],
                  ['📈', 'Personalized topic recommendations after every quiz'],
                  ['💡', 'Performance summary with study roadmap'],
                ].map(([icon, text], i) => (
                  <li key={i} className="ai-point">
                    <span className="ai-point-icon">{icon}</span> {text}
                  </li>
                ))}
              </ul>
              <button className="btn-primary" onClick={() => navigate('/register')}>Try Adaptive Quiz Free →</button>
            </div>
            <div className="ai-visual reveal reveal-delay-2">
              <div className="ai-card">
                <div className="ai-card-header">
                  <div className="ai-card-title">
                    🧠 AI Adaptive Quiz <span id="diffBadge" className="diff-badge diff-medium">MEDIUM</span>
                  </div>
                  <span className="q-counter" id="qCounter">Q3 / 10</span>
                </div>
                <div className="q-text" id="qText">What is a recursive function in Python?</div>
                <div className="options-list" id="optsList">
                  <div className="opt" id="opt0"><span className="opt-letter">A</span> A function that calls itself</div>
                  <div className="opt" id="opt1"><span className="opt-letter">B</span> A function with no return value</div>
                  <div className="opt" id="opt2"><span className="opt-letter">C</span> A type of loop structure</div>
                  <div className="opt" id="opt3"><span className="opt-letter">D</span> A class method decorator</div>
                </div>
                <div className="ai-result" id="aiResult">
                  <div className="ai-result-title">✅ Correct! +10 XP earned</div>
                  <div className="ai-result-text" id="aiResultText">
                    A recursive function calls itself with a modified argument until it reaches a base case. AI is increasing difficulty.
                  </div>
                </div>
                <div className="ai-prog">
                  <div className="ai-prog-label">
                    <span>Progress</span><span id="progPct">30%</span>
                  </div>
                  <div className="ai-prog-bar">
                    <div className="ai-prog-fill" id="progFill" style={{ width: '30%' }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══ GAMIFICATION ══ */}
      <section id="games">
        <div className="container">
          <div className="section-head reveal" style={{ textAlign: 'center' }}>
            <div className="eyebrow">Gamified Learning</div>
            <h2 className="section-title">Learning That <span className="grad-text">Feels Like Playing</span></h2>
            <p className="section-sub" style={{ margin: '0 auto' }}>Three unique game formats keep your brain engaged and make knowledge stick.</p>
          </div>
          <div className="games-grid">
            {/* Game 1 */}
            <div className="game-row reveal">
              <div className="game-text">
                <div className="game-icon-big">🧩</div>
                <div className="eyebrow" style={{ marginBottom: '8px' }}>Game Type 01</div>
                <h3>Match the Following</h3>
                <p>Connect terms to their definitions by drawing lines. Tests memory and understanding through active visual recall. Correct matches lock in with a satisfying green glow.</p>
                <div style={{ marginTop: '16px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <span className="feat-tag ft-p">🧠 Memory Boost</span>
                  <span className="feat-tag ft-s">⚡ +20 XP per match</span>
                </div>
              </div>
              <div className="game-visual">
                {[
                  ['Python', 'High-level language', 'var(--g1)'],
                  ['Variable', 'Stores a value', 'linear-gradient(90deg,#00E5C3,#7B6EF6)'],
                  ['Loop', 'Repeats code blocks', 'linear-gradient(90deg,#FFD166,#FF6B6B)'],
                ].map(([term, def, bg], i) => (
                  <div key={i} className="match-row">
                    <div className="match-term">{term}</div>
                    <div className="match-line" style={{ background: bg }}></div>
                    <div className="match-def">{def}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Game 2 */}
            <div className="game-row reveal" style={{ direction: 'rtl' }}>
              <div className="game-text" style={{ direction: 'ltr' }}>
                <div className="game-icon-big">🖱️</div>
                <div className="eyebrow" style={{ marginBottom: '8px' }}>Game Type 02</div>
                <h3>Drag &amp; Drop</h3>
                <p>Categorize concepts by dragging them into the right boxes. Perfect for understanding relationships and classification. Placed items glow on correct drop.</p>
                <div style={{ marginTop: '16px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <span className="feat-tag ft-s">🎯 Practical Understanding</span>
                  <span className="feat-tag ft-a">⚡ +25 XP per item</span>
                </div>
              </div>
              <div className="game-visual" style={{ direction: 'ltr' }}>
                <div className="drag-zones">
                  {[['Frontend', ['React', 'CSS']], ['Backend', ['Node.js']], ['Database', ['MongoDB']]].map(([label, items], i) => (
                    <div key={i} className="drag-zone">
                      <div className="drag-zone-label">{label}</div>
                      {items.map(item => <span key={item} className="drag-item placed">{item}</span>)}
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap', padding: '10px', borderRadius: '10px', border: '1px dashed rgba(255,255,255,0.08)' }}>
                  <span className="drag-item" style={{ cursor: 'grab' }}>Express</span>
                  <span className="drag-item" style={{ cursor: 'grab' }}>Redux</span>
                </div>
              </div>
            </div>

            {/* Game 3 */}
            <div className="game-row reveal">
              <div className="game-text">
                <div className="game-icon-big">✍️</div>
                <div className="eyebrow" style={{ marginBottom: '8px' }}>Game Type 03</div>
                <h3>Fill in the Blanks</h3>
                <p>Type missing words directly into paragraphs. Builds deep recall, spelling accuracy, and contextual understanding. Hints available with a small XP cost.</p>
                <div style={{ marginTop: '16px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <span className="feat-tag ft-a">✍️ Deep Recall</span>
                  <span className="feat-tag ft-p">⚡ +15 XP per blank</span>
                </div>
              </div>
              <div className="game-visual">
                <p className="blank-text">
                  A <input className="blank-input" id="blankInput" defaultValue="" placeholder="____" readOnly /> is a collection of ordered items in Python. Lists are{' '}
                  <input className="blank-input" defaultValue="mutable" readOnly style={{ width: '70px', borderColor: 'var(--s)' }} /> meaning they can be changed after creation.
                </p>
                <div style={{ marginTop: '12px', fontSize: '11px', color: 'var(--s)' }}>✅ "mutable" is correct! Keep going...</div>
              </div>
            </div>
          </div>

          {/* XP / Badges Strip */}
          <div className="xp-strip reveal">
            <div>
              <div className="xp-counter" id="xpCounter">0</div>
              <div style={{ fontSize: '12px', color: 'var(--t2)', marginTop: '4px' }}>Total XP Earned ⚡</div>
            </div>
            <div style={{ width: '1px', height: '60px', background: 'var(--b)' }}></div>
            {[['🏅', 'First Quiz', true], ['⚡', 'Speed Run', true], ['🎯', 'Perfect Score', true], ['🔥', '7-Day Streak', false], ['📚', 'Subject Master', false], ['👑', 'Top Learner', false]].map(([icon, label, earned], i) => (
              <div key={i} className="badge-item">
                <div className={`badge-circle ${earned ? 'earned' : 'locked'}`}>{icon}</div>
                <div className="badge-label">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ ACCESSIBILITY ══ */}
      <section id="access">
        <div className="container">
          <div className="section-head reveal" style={{ textAlign: 'center' }}>
            <div className="eyebrow">Inclusive by Design</div>
            <h2 className="section-title">Education For <span className="grad-text">Every Learner</span></h2>
            <p className="section-sub" style={{ margin: '0 auto' }}>EduAI is built so that no student is left behind — regardless of ability or learning style.</p>
          </div>
          <div className="access-grid">
            {[
              { icon: '🔊', title: 'Text-to-Speech', desc: 'Every lesson, note, and quiz question can be read aloud — hands-free learning for visually impaired or dyslexic students.' },
              { icon: '🎤', title: 'Speech-to-Text', desc: 'Answer quiz questions using your voice. No typing required — ideal for motor impairment or learning on the go.' },
              { icon: '👁️', title: 'Visual Accessibility', desc: 'High contrast mode, adjustable font sizes, dyslexia-friendly fonts, and color blind filter modes for every visual need.' },
              { icon: '⌨️', title: 'Full Keyboard Navigation', desc: 'Every feature is fully navigable by keyboard. All interactive elements have ARIA labels and proper focus indicators.' },
            ].map((a, i) => (
              <div key={i} className={`access-card reveal reveal-delay-${i + 1}`}>
                <div className="access-icon">{a.icon}</div>
                <div className="access-text">
                  <h3>{a.title}</h3>
                  <p>{a.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ TESTIMONIALS ══ */}
      <section id="testimonials">
        <div className="container">
          <div className="section-head reveal" style={{ textAlign: 'center' }}>
            <div className="eyebrow">Student Stories</div>
            <h2 className="section-title">Real Results From <span className="grad-text">Real Learners</span></h2>
          </div>
          <div className="testi-track">
            {[
              { initials: 'AS', bg: 'linear-gradient(135deg,#7B6EF6,#00E5C3)', name: 'Arjun Sharma', role: 'Python Programming Student', quote: 'The AI quiz system is mind-blowing. It knew I was struggling with recursion before I even realized it, and gave me simpler questions to build my confidence. I went from failing to 87% in two weeks.' },
              { initials: 'PN', bg: 'linear-gradient(135deg,#00E5C3,#7B6EF6)', name: 'Priya Nair', role: 'Web Design Student', quote: 'I have dyslexia, and the text-to-speech and dyslexia font options changed everything for me. Finally a learning platform that actually thinks about students like me.' },
              { initials: 'RV', bg: 'linear-gradient(135deg,#FFD166,#FF6B6B)', name: 'Rahul Verma', role: 'Data Science Student', quote: 'The gamification keeps me coming back. I am competing on the leaderboard with my classmates and somehow that makes me study harder than any deadline ever did.' },
            ].map((t, i) => (
              <div key={i} className={`testi-card reveal reveal-delay-${i + 1}`}>
                <div className="testi-stars">★★★★★</div>
                <p className="testi-quote">{t.quote}</p>
                <div className="testi-author">
                  <div className="testi-avatar" style={{ background: t.bg }}>{t.initials}</div>
                  <div>
                    <div className="testi-name">{t.name}</div>
                    <div className="testi-role">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ CTA BANNER ══ */}
      <section id="cta">
        <div className="cta-particles" id="particles"></div>
        <div className="container">
          <div className="cta-content reveal">
            <span className="cta-emoji">🚀</span>
            <h2 className="cta-title">Ready to <span className="grad-text">Learn Smarter?</span></h2>
            <p className="cta-sub">Join 10,000+ students already using EduAI to achieve their learning goals — faster.</p>
            <div className="cta-btns">
              <button className="btn-primary" style={{ padding: '18px 48px', fontSize: '16px', borderRadius: '14px', boxShadow: '0 0 60px var(--pg)' }} onClick={() => navigate('/role-selection')}>
                Create Free Account →
              </button>
              <button className="btn-outline" style={{ padding: '18px 48px', fontSize: '16px', borderRadius: '14px' }} onClick={() => navigate('/login')}>
                Login to My Account
              </button>
            </div>
            <div className="trust-strip">
              <span className="trust-item">🔒 No Credit Card Required</span>
              <span className="trust-item">✅ Free Forever Plan</span>
              <span className="trust-item">🎓 Start in Under 2 Minutes</span>
            </div>
          </div>
        </div>
      </section>

      {/* ══ FOOTER ══ */}
      <footer>
        <div className="container">
          <div className="footer-grid">
            <div className="footer-brand">
              <div className="logo">
                <div className="logo-icon" style={{ width: '32px', height: '32px', fontSize: '16px' }}>⚡</div>
                <span>EduAI</span>
              </div>
              <p>AI-powered learning that adapts to you. Smarter quizzes, gamified activities, real results.</p>
              <div className="social-row">
                <button className="social-btn">𝕏</button>
                <button className="social-btn">in</button>
                <button className="social-btn">gh</button>
                <button className="social-btn">▶</button>
              </div>
            </div>
            <div className="footer-col">
              <h4>Platform</h4>
              <ul>
                {['Features', 'How It Works', 'AI Learning', 'Gamification', 'Accessibility'].map(l => (
                  <li key={l}><a href={`#${l.toLowerCase().replace(/ /g, '')}`}>{l}</a></li>
                ))}
              </ul>
            </div>
            <div className="footer-col">
              <h4>Account</h4>
              <ul>
                <li><a href="/register">Create Account</a></li>
                <li><a href="/login">Login</a></li>
                <li><a href="/register">For Instructors</a></li>
                <li><a href="/register">For Institutions</a></li>
              </ul>
            </div>
            <div className="footer-col">
              <h4>Company</h4>
              <ul>
                {['About EduAI', 'Blog', 'Careers', 'Contact Us', 'Privacy Policy', 'Terms of Service'].map(l => (
                  <li key={l}><a href="#">{l}</a></li>
                ))}
              </ul>
            </div>
          </div>
          <div className="footer-bottom">
            <p>© 2025 EduAI. All rights reserved.</p>
            <p>Made with ❤️ for learners everywhere</p>
          </div>
        </div>
      </footer>
    </>
  );
}
