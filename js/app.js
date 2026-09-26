// Главный контроллер образовательного симулятора QazSTEM / AuylSTEM Virtual Lab
// Связывает каталог проектов, интерактивный схемотехнический стенд, редактор кода Arduino,
// интеллектуальный анализатор ошибок (Smart STEM Mentor) и систему челленджей.

(function () {
  const state = {
    currentProjectIndex: 0,
    lang: "ru", // "ru" | "kz"
    xp: 0,
    completedProjects: {},
    ledLitEver: false,
    hasBurnedLed: false,
    servoMovedEver: false,
    pumpActivatedEver: false
  };

  // Загружаем сохранённый прогресс из localStorage (офлайн-режим для сельских школ)
  try {
    const saved = localStorage.getItem("qazstem_progress_v1");
    if (saved) {
      const parsed = JSON.parse(saved);
      state.xp = parsed.xp || 0;
      state.completedProjects = parsed.completedProjects || {};
    }
  } catch (e) {
    // Игнорируем ошибки приватного режима
  }

  function saveProgress() {
    try {
      localStorage.setItem("qazstem_progress_v1", JSON.stringify({
        xp: state.xp,
        completedProjects: state.completedProjects
      }));
    } catch (e) {}
  }

  let circuitEngine = null;
  let interpreter = null;

  const I18N = {
    ru: {
      appSubtitle: "Виртуальная STEM-лаборатория для школ без сложного оборудования",
      offlineBadge: "⚡ Офлайн-режим (0 МБ трафика · Работает при слабом интернете)",
      tabTheory: "1. Теория и шаги",
      tabMentor: "2. Умный разбор ошибок",
      tabChallenge: "3. Задание (Челлендж)",
      btnRun: "▶ Запустить симуляцию",
      btnStop: "⏹ Остановить",
      btnAutoWire: "🪄 Собрать по схеме",
      btnBrokenDemo: "⚠️ Смоделировать ошибку ученика",
      btnClearWires: "✂️ Очистить провода",
      btnCheckChallenge: "✅ Проверить задание"
    },
    kz: {
      appSubtitle: "Күрделі жабдықсыз мектептерге арналған виртуалды STEM-зертхана",
      offlineBadge: "⚡ Офлайн-режим (0 МБ трафик · Әлсіз интернетте жұмыс істейді)",
      tabTheory: "1. Теория және қадамдар",
      tabMentor: "2. Қателерді ақылды талдау",
      tabChallenge: "3. Тапсырма (Челлендж)",
      btnRun: "▶ Симуляцияны іске қосу",
      btnStop: "⏹ Тоқтату",
      btnAutoWire: "🪄 Схема бойынша жинау",
      btnBrokenDemo: "⚠️ Оқушы қатесін көрсету",
      btnClearWires: "✂️ Сымдарды тазалау",
      btnCheckChallenge: "✅ Тапсырманы тексеру"
    }
  };

  function init() {
    const canvasContainer = document.getElementById("circuitContainer");
    circuitEngine = new CircuitEngine(canvasContainer, {
      onCircuitChange: () => {
        updateDiagnosticsPanel();
      },
      onSensorChange: () => {
        // Если симуляция запущена, датчики мгновенно влияют на работу схемы
      }
    });

    interpreter = new ArduinoInterpreter(circuitEngine, {
      onSerialOut: (text, isLn) => {
        appendSerialOutput(text, isLn);
      },
      onStateUpdate: (flags) => {
        if (flags.ledLit) state.ledLitEver = true;
        if (flags.burnedLed) {
          state.hasBurnedLed = true;
          updateDiagnosticsPanel();
          switchRightTab("mentor");
        }
        if (flags.servoMoved) state.servoMovedEver = true;
        if (flags.pumpActivated) state.pumpActivatedEver = true;
      }
    });

    renderProjectsSidebar();
    bindToolbarEvents();
    selectProject(0);
    updateXpUI();
  }

  function renderProjectsSidebar() {
    const listEl = document.getElementById("projectsList");
    listEl.innerHTML = window.STEM_PROJECTS.map((proj, idx) => {
      const isDone = !!state.completedProjects[proj.id];
      const isActive = idx === state.currentProjectIndex;
      const title = state.lang === "kz" && proj.titleKz ? proj.titleKz : proj.title;
      return `
        <button class="project-nav-item ${isActive ? 'active' : ''} ${isDone ? 'completed' : ''}"
                data-proj-index="${idx}">
          <span class="proj-icon">${proj.icon}</span>
          <div class="proj-meta">
            <div class="proj-name">${proj.number}. ${title}</div>
            <div class="proj-tags">
              <span class="tag-badge">${proj.board}</span>
              <span class="tag-diff">${proj.difficulty}</span>
              ${isDone ? '<span class="tag-done">✓ Пройдено</span>' : ''}
            </div>
          </div>
        </button>
      `;
    }).join("");

    listEl.querySelectorAll(".project-nav-item").forEach(btn => {
      btn.addEventListener("click", () => {
        const idx = parseInt(btn.getAttribute("data-proj-index"), 10);
        selectProject(idx);
      });
    });
  }

  function selectProject(index) {
    if (interpreter && interpreter.running) {
      stopSimulation();
    }
    state.currentProjectIndex = index;
    state.ledLitEver = false;
    state.hasBurnedLed = false;
    state.servoMovedEver = false;
    state.pumpActivatedEver = false;

    const proj = window.STEM_PROJECTS[index];
    renderProjectsSidebar();

    // Заголовок активного урока
    const title = state.lang === "kz" && proj.titleKz ? proj.titleKz : proj.title;
    document.getElementById("currentProjectTitle").textContent = `Урок ${proj.number}: ${title}`;
    document.getElementById("currentProjectCategory").textContent = `${proj.category} · ${proj.board} · ${proj.duration}`;

    // Заполняем вкладку Теория и пошаговая инструкция
    const compBadges = proj.componentsList.map(c => `<span class="comp-pill">${c.name} ×${c.count}</span>`).join("");
    const stepsHtml = proj.steps.map((s, i) => `
      <li class="step-item">
        <span class="step-num">${i + 1}</span>
        <span class="step-text">${s}</span>
      </li>
    `).join("");

    document.getElementById("theoryPanelContent").innerHTML = `
      <div class="lesson-goal-box">
        <div class="goal-label">🎯 Цель лабораторной работы</div>
        <div class="goal-text">${proj.goal}</div>
      </div>
      <div class="lesson-components-box">
        <div class="section-mini-title">🧰 Необходимые компоненты:</div>
        <div class="comp-pills-wrap">${compBadges}</div>
      </div>
      <div class="lesson-theory-body">
        ${proj.theory}
      </div>
      <div class="lesson-steps-box">
        <h4>📋 Пошаговая сборка схемы:</h4>
        <ol class="steps-list">${stepsHtml}</ol>
      </div>
      <div class="solution-explain-box">
        <strong>💡 Как работает правильное решение:</strong>
        <p>${proj.solutionExplanation}</p>
      </div>
    `;

    // Заполняем вкладку Челлендж
    document.getElementById("challengeTitle").textContent = proj.challenge.title;
    document.getElementById("challengeDesc").textContent = proj.challenge.description;
    document.getElementById("challengeXpBadge").textContent = `+${proj.challenge.xp} XP`;
    document.getElementById("challengeFeedback").innerHTML = "";

    // Загружаем стартовый код
    const codeEditor = document.getElementById("codeEditor");
    codeEditor.value = proj.starterCode;
    updateLineNumbers();

    // Очищаем монитор порта
    clearSerialMonitor();
    appendSerialOutput(`[Система] Загружен проект «${proj.title}» (${proj.board}). Готов к запуску!`, true);

    // Загружаем схему в движок
    circuitEngine.loadProject(proj);
    updateDiagnosticsPanel();
  }

  function updateDiagnosticsPanel() {
    const code = document.getElementById("codeEditor").value;
    const circuitAnalysis = circuitEngine.analyzeCircuit();
    const codeIssues = interpreter.analyzeCodeAndCircuit(code, circuitAnalysis);
    const allIssues = [...circuitAnalysis.diagnostics, ...codeIssues];

    const badgeEl = document.getElementById("mentorCountBadge");
    const statusBanner = document.getElementById("circuitStatusBanner");
    const listEl = document.getElementById("diagnosticsList");

    badgeEl.textContent = allIssues.length;
    badgeEl.className = "tab-badge " + (allIssues.length > 0 ? "badge-alert" : "badge-ok");

    if (allIssues.length === 0) {
      statusBanner.className = "circuit-status-banner status-ok";
      statusBanner.innerHTML = `
        <span>✅ <strong>Схема и код собраны верно!</strong> Электрическая цепь замкнута, защита резисторами в норме.</span>
      `;
      listEl.innerHTML = `
        <div class="mentor-success-card">
          <div class="mentor-icon">🎉</div>
          <div>
            <h4>Ошибок не обнаружено!</h4>
            <p>Все компоненты подключены правильно, цепи питания и заземления (GND) замкнуты, а пины в коде соответствуют схеме.</p>
            <p class="mentor-tip">💡 Хочешь увидеть, как система обучает на ошибках? Нажми кнопку <strong>«⚠️ Смоделировать ошибку ученика»</strong> над схемой или удали любой провод кликом мыши!</p>
          </div>
        </div>
      `;
    } else {
      const firstIssue = allIssues[0];
      statusBanner.className = "circuit-status-banner status-error";
      statusBanner.innerHTML = `
        <span>⚠️ <strong>Найдена ошибка (${allIssues.length}):</strong> ${firstIssue.title}</span>
        <button class="banner-link-btn" id="openMentorBtn">Разобрать ошибку →</button>
      `;
      const openBtn = document.getElementById("openMentorBtn");
      if (openBtn) {
        openBtn.addEventListener("click", () => switchRightTab("mentor"));
      }

      listEl.innerHTML = allIssues.map(iss => `
        <div class="diagnostic-card diag-${iss.severity}">
          <div class="diag-header">
            <span class="diag-badge">${iss.severity === 'danger' ? '🔥 ОПАСНОСТЬ ПЕРЕГОРАНИЯ' : iss.severity === 'warning' ? '⚡ ПРЕДУПРЕЖДЕНИЕ' : '❌ ОШИБКА СХЕМЫ / КОДА'}</span>
            <h5>${iss.title}</h5>
          </div>
          <p class="diag-explanation">${iss.explanation}</p>
        </div>
      `).join("");
    }
  }

  function startSimulation() {
    const code = document.getElementById("codeEditor").value;
    state.ledLitEver = false;
    state.hasBurnedLed = false;
    state.servoMovedEver = false;
    state.pumpActivatedEver = false;

    updateDiagnosticsPanel();
    clearSerialMonitor();
    appendSerialOutput("▶ Запуск симуляции микроконтроллера...", true);

    const runBtn = document.getElementById("runSimBtn");
    const stopBtn = document.getElementById("stopSimBtn");
    runBtn.classList.add("hidden");
    stopBtn.classList.remove("hidden");

    interpreter.start(code);
  }

  function stopSimulation() {
    interpreter.stop();
    const runBtn = document.getElementById("runSimBtn");
    const stopBtn = document.getElementById("stopSimBtn");
    runBtn.classList.remove("hidden");
    stopBtn.classList.add("hidden");
    appendSerialOutput("⏹ Симуляция остановлена.", true);
  }

  function appendSerialOutput(text, isLn) {
    const monitor = document.getElementById("serialOutput");
    if (!monitor) return;
    if (isLn) {
      const time = new Date().toLocaleTimeString("ru-RU", { hour12: false });
      const lineEl = document.createElement("div");
      lineEl.className = "serial-line";
      lineEl.innerHTML = `<span class="serial-time">[${time}]</span> ${escapeHtml(text)}`;
      monitor.appendChild(lineEl);
    } else {
      const last = monitor.lastElementChild;
      if (last) {
        last.innerHTML += escapeHtml(text);
      } else {
        const lineEl = document.createElement("div");
        lineEl.className = "serial-line";
        lineEl.textContent = text;
        monitor.appendChild(lineEl);
      }
    }
    monitor.scrollTop = monitor.scrollHeight;
  }

  function clearSerialMonitor() {
    const monitor = document.getElementById("serialOutput");
    if (monitor) monitor.innerHTML = "";
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function updateLineNumbers() {
    const code = document.getElementById("codeEditor").value;
    const linesCount = code.split("\n").length;
    const numsEl = document.getElementById("lineNumbers");
    let html = "";
    for (let i = 1; i <= linesCount; i++) {
      html += `<div>${i}</div>`;
    }
    numsEl.innerHTML = html;
  }

  function switchRightTab(tabName) {
    document.querySelectorAll(".right-tab-btn").forEach(btn => {
      btn.classList.toggle("active", btn.getAttribute("data-tab") === tabName);
    });
    document.querySelectorAll(".right-tab-pane").forEach(pane => {
      pane.classList.toggle("active", pane.getAttribute("data-pane") === tabName);
    });
  }

  function updateXpUI() {
    document.getElementById("xpCounter").textContent = `${state.xp} XP`;
    const completedCount = Object.keys(state.completedProjects).length;
    document.getElementById("progressCounter").textContent = `${completedCount} / ${window.STEM_PROJECTS.length} уроков`;
  }

  function applyLanguage() {
    const dict = I18N[state.lang];
    document.getElementById("appSubtitle").textContent = dict.appSubtitle;
    document.getElementById("offlineBadge").textContent = dict.offlineBadge;
    document.getElementById("tabBtnTheory").textContent = dict.tabTheory;
    document.getElementById("tabBtnMentorLabel").textContent = dict.tabMentor;
    document.getElementById("tabBtnChallenge").textContent = dict.tabChallenge;
    document.getElementById("runSimBtn").textContent = dict.btnRun;
    document.getElementById("stopSimBtn").textContent = dict.btnStop;
    document.getElementById("autoWireBtn").textContent = dict.btnAutoWire;
    document.getElementById("brokenDemoBtn").textContent = dict.btnBrokenDemo;
    document.getElementById("clearWiresBtn").textContent = dict.btnClearWires;
    document.getElementById("checkChallengeBtn").textContent = dict.btnCheckChallenge;

    renderProjectsSidebar();
    const proj = window.STEM_PROJECTS[state.currentProjectIndex];
    const title = state.lang === "kz" && proj.titleKz ? proj.titleKz : proj.title;
    document.getElementById("currentProjectTitle").textContent = `Урок ${proj.number}: ${title}`;
  }

  function bindToolbarEvents() {
    document.getElementById("runSimBtn").addEventListener("click", startSimulation);
    document.getElementById("stopSimBtn").addEventListener("click", stopSimulation);

    document.getElementById("autoWireBtn").addEventListener("click", () => {
      stopSimulation();
      const proj = window.STEM_PROJECTS[state.currentProjectIndex];
      document.getElementById("codeEditor").value = proj.starterCode;
      updateLineNumbers();
      circuitEngine.autoWireTarget();
      updateDiagnosticsPanel();
      appendSerialOutput("🪄 Схема собрана по эталону урока.", true);
    });

    document.getElementById("brokenDemoBtn").addEventListener("click", () => {
      stopSimulation();
      const proj = window.STEM_PROJECTS[state.currentProjectIndex];
      if (proj.brokenScenario) {
        document.getElementById("codeEditor").value = proj.brokenScenario.code;
        updateLineNumbers();
        circuitEngine.loadBrokenScenario(proj.brokenScenario);
        updateDiagnosticsPanel();
        switchRightTab("mentor");
        appendSerialOutput(`⚠️ Смоделирована типичная ошибка: ${proj.brokenScenario.description}`, true);
        // Сразу запускаем симуляцию, чтобы жюри/ученик увидел визуальный эффект ошибки (например перегорание LED)
        startSimulation();
      }
    });

    document.getElementById("clearWiresBtn").addEventListener("click", () => {
      stopSimulation();
      circuitEngine.clearWires();
      updateDiagnosticsPanel();
    });

    document.getElementById("toggleHintsBtn").addEventListener("click", (e) => {
      circuitEngine.showHints = !circuitEngine.showHints;
      e.currentTarget.classList.toggle("btn-active-toggle", circuitEngine.showHints);
      circuitEngine.render();
    });

    // Выбор цвета провода
    document.querySelectorAll(".wire-color-swatch").forEach(sw => {
      sw.addEventListener("click", () => {
        document.querySelectorAll(".wire-color-swatch").forEach(s => s.classList.remove("active"));
        sw.classList.add("active");
        circuitEngine.selectedWireColor = sw.getAttribute("data-color");
      });
    });

    // Добавление компонентов из палитры
    document.getElementById("addComponentSelect").addEventListener("change", (e) => {
      const val = e.target.value;
      if (!val) return;
      circuitEngine.addComponent(val);
      e.target.value = "";
    });

    // Вкладки правой панели
    document.querySelectorAll(".right-tab-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        switchRightTab(btn.getAttribute("data-tab"));
      });
    });

    // Редактор кода
    const codeEditor = document.getElementById("codeEditor");
    codeEditor.addEventListener("input", () => {
      updateLineNumbers();
      updateDiagnosticsPanel();
    });
    codeEditor.addEventListener("scroll", () => {
      document.getElementById("lineNumbers").scrollTop = codeEditor.scrollTop;
    });

    // Кнопка проверки Челленджа
    document.getElementById("checkChallengeBtn").addEventListener("click", () => {
      const proj = window.STEM_PROJECTS[state.currentProjectIndex];
      const circuitAnalysis = circuitEngine.analyzeCircuit();
      const code = document.getElementById("codeEditor").value;
      const codeIssues = interpreter.analyzeCodeAndCircuit(code, circuitAnalysis);
      const isValid = circuitAnalysis.isCircuitValid && codeIssues.filter(i => i.severity === "error").length === 0;

      const result = proj.challenge.check({
        circuitValid: isValid,
        hasBurnedLed: state.hasBurnedLed,
        ledLitEver: state.ledLitEver,
        servoMovedEver: state.servoMovedEver,
        pumpActivatedEver: state.pumpActivatedEver,
        code
      });

      const fb = document.getElementById("challengeFeedback");
      if (result.passed) {
        if (!state.completedProjects[proj.id]) {
          state.completedProjects[proj.id] = true;
          state.xp += proj.challenge.xp;
          saveProgress();
          updateXpUI();
          renderProjectsSidebar();
        }
        fb.innerHTML = `<div class="challenge-result result-pass">🏆 <strong>Задание выполнено! (+${proj.challenge.xp} XP)</strong><br>${result.message}</div>`;
      } else {
        fb.innerHTML = `<div class="challenge-result result-fail">🤔 <strong>Пока не засчитано:</strong><br>${result.message}</div>`;
      }
    });

    // Переключатель языка RU / KZ
    document.getElementById("langToggleBtn").addEventListener("click", () => {
      state.lang = state.lang === "ru" ? "kz" : "ru";
      document.getElementById("langToggleBtn").textContent = state.lang === "ru" ? "🌐 RU / KZ" : "🌐 KZ / RU";
      applyLanguage();
    });

    // Сохранение и экспорт проекта в JSON файл
    document.getElementById("exportProjectBtn").addEventListener("click", () => {
      const proj = window.STEM_PROJECTS[state.currentProjectIndex];
      const payload = {
        projectId: proj.id,
        board: circuitEngine.boardType,
        components: circuitEngine.components,
        wires: circuitEngine.wires,
        code: document.getElementById("codeEditor").value,
        savedAt: new Date().toISOString()
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `auylstem-${proj.id}.json`;
      a.click();
      URL.revokeObjectURL(url);
      appendSerialOutput("💾 Проект успешно сохранён в файл .json!", true);
    });

    document.getElementById("clearSerialBtn").addEventListener("click", clearSerialMonitor);
  }

  window.addEventListener("DOMContentLoaded", init);
})();
