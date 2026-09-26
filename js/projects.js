// Каталог образовательных проектов виртуальной STEM-лаборатории QazSTEM / AuylSTEM Lab
// Каждый проект реализует полный цикл:
// Теория -> Цель -> Компоненты -> Пошаговая сборка -> Код -> Симуляция и эксперимент -> Разбор ошибок -> Челлендж

window.STEM_PROJECTS = [
  {
    id: "led-blink",
    number: 1,
    title: "Управление светодиодом (Blink)",
    titleKz: "Жарықдиодты басқару (Blink)",
    difficulty: "Начальный",
    duration: "15 мин",
    board: "Arduino Uno",
    category: "Основы электроники",
    icon: "💡",
    summary: "Собери свою первую электрическую цепь, узнай зачем нужен резистор и научи микроконтроллер мигать светодиодом.",
    theory: `
      <h4>Как работает светодиод и зачем ему резистор?</h4>
      <p><strong>Светодиод (LED)</strong> — это полупроводниковый прибор, который светится, когда через него течёт электрический ток. У него две ножки:</p>
      <ul>
        <li><strong>Анод (+)</strong> — длинная ножка, подключается к плюсу (сигнальному пину Arduino).</li>
        <li><strong>Катод (–)</strong> — короткая ножка, подключается к минусу (земле <code>GND</code>).</li>
      </ul>
      <div class="theory-callout warning">
        <strong>⚡ Важное правило инженера:</strong> Пин Arduino выдаёт напряжение <strong>5 Вольт</strong>, а светодиоду нужно всего ~2 Вольта и ток не более 20 мА. Если подключить светодиод напрямую без <strong>токоограничивающего резистора</strong>, ток станет слишком большим и светодиод мгновенно перегорит!
      </div>
      <p>В программе Arduino есть две главные функции:</p>
      <ul>
        <li><code>void setup()</code> — выполняется один раз при включении платы (здесь мы настраиваем пины через <code>pinMode</code>).</li>
        <li><code>void loop()</code> — повторяется бесконечно в цикле (здесь мы включаем и выключаем свет через <code>digitalWrite</code>).</li>
      </ul>
    `,
    goal: "Собрать защищённую резистором цепь светодиода и написать программу, которая включает и выключает его каждую секунду.",
    componentsList: [
      { type: "arduino_uno", name: "Плата Arduino Uno", count: 1 },
      { type: "resistor", name: "Резистор 220 Ом", count: 1 },
      { type: "led", name: "Красный светодиод (LED)", count: 1 }
    ],
    steps: [
      "Соедини пин <strong>D13</strong> на плате Arduino с левым выводом <strong>Резистора (T1)</strong>.",
      "Соедини правый вывод <strong>Резистора (T2)</strong> с плюсовой ножкой светодиода — <strong>Анодом (+)</strong>.",
      "Соедини минусовую ножку светодиода — <strong>Катод (–)</strong> с пином земли <strong>GND</strong> на плате Arduino.",
      "Проверь код в редакторе и нажми кнопку <strong>«▶ Запустить симуляцию»</strong>."
    ],
    initialComponents: [
      { id: "comp_res1", type: "resistor", x: 410, y: 170, props: { resistance: 220, label: "R1" } },
      { id: "comp_led1", type: "led", x: 580, y: 155, props: { color: "red", label: "LED1" } }
    ],
    // Для быстрого старта ученик может либо соединить сам, либо нажать «Собрать по схеме»
    targetWires: [
      { from: "mcu:D13", to: "comp_res1:t1", color: "#ef4444" },
      { from: "comp_res1:t2", to: "comp_led1:anode", color: "#f97316" },
      { from: "comp_led1:cathode", to: "mcu:GND1", color: "#3b82f6" }
    ],
    // Специальный сценарий ошибки для демонстрации жюри и обучения
    brokenScenario: {
      description: "Светодиод подключён к пину D13 напрямую БЕЗ резистора! При запуске он перегорит от избыточного тока.",
      wires: [
        { from: "mcu:D13", to: "comp_led1:anode", color: "#ef4444" },
        { from: "comp_led1:cathode", to: "mcu:GND1", color: "#3b82f6" }
      ],
      code: `void setup() {\n  pinMode(13, OUTPUT);\n  Serial.begin(9600);\n  Serial.println("Старт теста светодиода...");\n}\n\nvoid loop() {\n  digitalWrite(13, HIGH);\n  delay(1000);\n  digitalWrite(13, LOW);\n  delay(1000);\n}`
    },
    starterCode: `// Урок 1: Управление светодиодом (Blink)
void setup() {
  // Настраиваем цифровой пин 13 как ВЫХОД
  pinMode(13, OUTPUT);
  Serial.begin(9600);
  Serial.println("Система запущена! Светодиод мигает.");
}

void loop() {
  digitalWrite(13, HIGH); // Подаём 5V (Включить LED)
  delay(1000);            // Ждём 1000 мс (1 секунду)
  digitalWrite(13, LOW);  // Подаём 0V (Выключить LED)
  delay(1000);            // Ждём 1000 мс (1 секунду)
}`,
    solutionExplanation: "Ток выходит из пина D13 (5V), проходит через резистор 220 Ом (который безопасно снижает ток до ~14 мА), зажигает светодиод от Анода к Катоду и возвращается в GND. Команда digitalWrite(13, HIGH) подаёт напряжение, а delay(1000) задаёт паузу.",
    challenge: {
      title: "Челлендж: Режим маяка",
      description: "Измени код так, чтобы светодиод мигал в 2 раза быстрее (задержка delay должна быть 500 мс вместо 1000 мс), и запусти симуляцию с правильно собранной цепью!",
      xp: 100,
      check: function(state) {
        if (!state.circuitValid || state.hasBurnedLed) {
          return { passed: false, message: "Сначала собери правильную схему с резистором, чтобы светодиод светился без ошибок!" };
        }
        const has500 = /delay\s*\(\s*500\s*\)/.test(state.code);
        if (!has500) {
          return { passed: false, message: "Измени значение внутри delay(...) на 500 и перезапусти симуляцию." };
        }
        return { passed: true, message: "Отлично! Теперь светодиод мигает каждые 0.5 секунды, а резистор защищает цепь от перегрузки!" };
      }
    }
  },

  {
    id: "button-led",
    number: 2,
    title: "Кнопка + Светодиод: Интерактивный пульт",
    titleKz: "Түйме + Жарықдиод: Интерактивті басқару",
    difficulty: "Начальный",
    duration: "20 мин",
    board: "Arduino Uno",
    category: "Цифровой ввод",
    icon: "🔘",
    summary: "Научи Arduino считывать нажатие тактовой кнопки и управлять освещением по условию if / else.",
    theory: `
      <h4>Цифровой вход и тактовая кнопка</h4>
      <p>Микроконтроллер умеет не только отдавать команды, но и «чувствовать» действия человека. Для этого пин настраивается как вход: <code>pinMode(2, INPUT_PULLUP)</code> или <code>INPUT</code>.</p>
      <p>В нашем симуляторе тактовая кнопка при нажатии подаёт логическую единицу (<code>HIGH</code>) на цифровой пин <strong>D2</strong>.</p>
      <div class="theory-callout info">
        <strong>💡 Как проверить нажатие в коде?</strong><br>
        Используй функцию <code>digitalRead(2)</code> внутри условия:<br>
        <code>if (digitalRead(2) == HIGH) { ... }</code>
      </div>
    `,
    goal: "Собрать схему с кнопкой и светодиодом так, чтобы светодиод включался при нажатии на кнопку.",
    componentsList: [
      { type: "arduino_uno", name: "Плата Arduino Uno", count: 1 },
      { type: "button", name: "Тактовая кнопка", count: 1 },
      { type: "resistor", name: "Резистор 220 Ом", count: 1 },
      { type: "led", name: "Зелёный светодиод (LED)", count: 1 }
    ],
    steps: [
      "Подключи вывод <strong>OUT</strong> кнопки к цифровому пину <strong>D2</strong>, а вывод <strong>GND</strong> кнопки — к <strong>GND</strong> платы.",
      "Подключи пин <strong>D13</strong> через <strong>Резистор 220 Ом</strong> к <strong>Аноду (+)</strong> светодиода.",
      "Подключи <strong>Катод (–)</strong> светодиода к <strong>GND</strong>.",
      "Запусти симуляцию и <strong>нажми мышкой на кнопку</strong> прямо на схеме!"
    ],
    initialComponents: [
      { id: "comp_btn1", type: "button", x: 390, y: 310, props: { pressed: false, label: "BTN1" } },
      { id: "comp_res1", type: "resistor", x: 410, y: 150, props: { resistance: 220, label: "R1" } },
      { id: "comp_led1", type: "led", x: 580, y: 135, props: { color: "green", label: "LED1" } }
    ],
    targetWires: [
      { from: "comp_btn1:out", to: "mcu:D2", color: "#a855f7" },
      { from: "comp_btn1:gnd", to: "mcu:GND2", color: "#3b82f6" },
      { from: "mcu:D13", to: "comp_res1:t1", color: "#22c55e" },
      { from: "comp_res1:t2", to: "comp_led1:anode", color: "#22c55e" },
      { from: "comp_led1:cathode", to: "mcu:GND1", color: "#3b82f6" }
    ],
    brokenScenario: {
      description: "В схеме кнопка подключена к пину D4, а в коде программа ждёт сигнал на пине D2!",
      wires: [
        { from: "comp_btn1:out", to: "mcu:D4", color: "#a855f7" },
        { from: "comp_btn1:gnd", to: "mcu:GND2", color: "#3b82f6" },
        { from: "mcu:D13", to: "comp_res1:t1", color: "#22c55e" },
        { from: "comp_res1:t2", to: "comp_led1:anode", color: "#22c55e" },
        { from: "comp_led1:cathode", to: "mcu:GND1", color: "#3b82f6" }
      ],
      code: `void setup() {\n  pinMode(2, INPUT);\n  pinMode(13, OUTPUT);\n  Serial.begin(9600);\n}\n\nvoid loop() {\n  int btn = digitalRead(2);\n  if (btn == HIGH) {\n    digitalWrite(13, HIGH);\n  } else {\n    digitalWrite(13, LOW);\n  }\n  delay(100);\n}`
    },
    starterCode: `// Урок 2: Управление светодиодом с помощью кнопки
void setup() {
  pinMode(2, INPUT);
  pinMode(13, OUTPUT);
  Serial.begin(9600);
  Serial.println("Нажми на кнопку BTN1 на схеме!");
}

void loop() {
  int btnState = digitalRead(2);
  if (btnState == HIGH) {
    digitalWrite(13, HIGH);
    Serial.println("Кнопка нажата -> Свет ВКЛЮЧЕН");
  } else {
    digitalWrite(13, LOW);
  }
  delay(150);
}`,
    solutionExplanation: "Когда ты нажимаешь кнопку на холсте, на пин D2 подаётся сигнал HIGH. Условие if (btnState == HIGH) срабатывает и включает пин D13.",
    challenge: {
      title: "Челлендж: Собери и включи свет кнопкой",
      description: "Запусти симуляцию и нажми на виртуальную кнопку BTN1 так, чтобы зелёный светодиод загорелся!",
      xp: 120,
      check: function(state) {
        if (!state.circuitValid) {
          return { passed: false, message: "Схема собрана не полностью. Проверь подключение кнопки к D2 и светодиода к D13." };
        }
        if (!state.ledLitEver) {
          return { passed: false, message: "Запусти симуляцию и кликни мышкой по кнопке BTN1 на схеме, чтобы зажечь светодиод!" };
        }
        return { passed: true, message: "Супер! Ты освоил цифровой ввод digitalRead() и управление схемой в реальном времени!" };
      }
    }
  },

  {
    id: "traffic-light",
    number: 3,
    title: "Умный светофор",
    titleKz: "Ақылды бағдаршам",
    difficulty: "Средний",
    duration: "25 мин",
    board: "Arduino Uno",
    category: "Автоматика и алгоритмы",
    icon: "🚦",
    summary: "Запрограммируй алгоритм настоящего дорожного светофора с тремя светодиодами: красным, жёлтым и зелёным.",
    theory: `
      <h4>Последовательные алгоритмы управления</h4>
      <p>Светофор — отличный пример конечного автомата. Три светодиода подключаются к разным цифровым пинам:</p>
      <ul>
        <li><strong>Красный LED</strong> → пин <code>D13</code></li>
        <li><strong>Жёлтый LED</strong> → пин <code>D12</code></li>
        <li><strong>Зелёный LED</strong> → пин <code>D11</code></li>
      </ul>
      <p>Чтобы цвета не сливались, перед включением следующего сигнала нужно не забывать выключать предыдущий командой <code>digitalWrite(pin, LOW)</code>.</p>
    `,
    goal: "Подключить три цветных светодиода и настроить циклическое переключение сигналов светофора.",
    componentsList: [
      { type: "arduino_uno", name: "Плата Arduino Uno", count: 1 },
      { type: "led", name: "Светодиоды (Красный, Жёлтый, Зелёный)", count: 3 },
      { type: "resistor", name: "Резисторы 220 Ом", count: 3 }
    ],
    steps: [
      "Подключи пины <strong>D13, D12, D11</strong> к трём резисторам R1, R2, R3.",
      "Соедини выходы резисторов с анодами (+) Красного, Жёлтого и Зелёного светодиодов.",
      "Объедини катоды (–) всех трёх светодиодов с пинами <strong>GND</strong>.",
      "Запусти симуляцию и проследи за циклом переключения цветов!"
    ],
    initialComponents: [
      { id: "comp_res1", type: "resistor", x: 390, y: 110, props: { resistance: 220, label: "R1" } },
      { id: "comp_led1", type: "led", x: 560, y: 95, props: { color: "red", label: "RED" } },
      { id: "comp_res2", type: "resistor", x: 390, y: 220, props: { resistance: 220, label: "R2" } },
      { id: "comp_led2", type: "led", x: 560, y: 205, props: { color: "yellow", label: "YEL" } },
      { id: "comp_res3", type: "resistor", x: 390, y: 330, props: { resistance: 220, label: "R3" } },
      { id: "comp_led3", type: "led", x: 560, y: 315, props: { color: "green", label: "GRN" } }
    ],
    targetWires: [
      { from: "mcu:D13", to: "comp_res1:t1", color: "#ef4444" },
      { from: "comp_res1:t2", to: "comp_led1:anode", color: "#ef4444" },
      { from: "comp_led1:cathode", to: "mcu:GND1", color: "#3b82f6" },
      { from: "mcu:D12", to: "comp_res2:t1", color: "#eab308" },
      { from: "comp_res2:t2", to: "comp_led2:anode", color: "#eab308" },
      { from: "comp_led2:cathode", to: "mcu:GND1", color: "#3b82f6" },
      { from: "mcu:D11", to: "comp_res3:t1", color: "#22c55e" },
      { from: "comp_res3:t2", to: "comp_led3:anode", color: "#22c55e" },
      { from: "comp_led3:cathode", to: "mcu:GND2", color: "#3b82f6" }
    ],
    brokenScenario: {
      description: "У зелёного светодиода забыли подключить провод заземления GND — из-за разомкнутой цепи зелёный сигнал светофора не загорается!",
      wires: [
        { from: "mcu:D13", to: "comp_res1:t1", color: "#ef4444" },
        { from: "comp_res1:t2", to: "comp_led1:anode", color: "#ef4444" },
        { from: "comp_led1:cathode", to: "mcu:GND1", color: "#3b82f6" },
        { from: "mcu:D12", to: "comp_res2:t1", color: "#eab308" },
        { from: "comp_res2:t2", to: "comp_led2:anode", color: "#eab308" },
        { from: "comp_led2:cathode", to: "mcu:GND1", color: "#3b82f6" },
        { from: "mcu:D11", to: "comp_res3:t1", color: "#22c55e" },
        { from: "comp_res3:t2", to: "comp_led3:anode", color: "#22c55e" }
      ],
      code: `void setup() {\n  pinMode(13, OUTPUT);\n  pinMode(12, OUTPUT);\n  pinMode(11, OUTPUT);\n}\nvoid loop() {\n  digitalWrite(13, HIGH);\n  delay(800);\n  digitalWrite(13, LOW);\n  digitalWrite(12, HIGH);\n  delay(400);\n  digitalWrite(12, LOW);\n  digitalWrite(11, HIGH);\n  delay(800);\n  digitalWrite(11, LOW);\n}`
    },
    starterCode: `// Урок 3: Алгоритм дорожного светофора
void setup() {
  pinMode(13, OUTPUT); // Красный
  pinMode(12, OUTPUT); // Жёлтый
  pinMode(11, OUTPUT); // Зелёный
  Serial.begin(9600);
  Serial.println("Светофор запущен!");
}

void loop() {
  // 1. Красный сигнал — СТОП
  digitalWrite(13, HIGH);
  digitalWrite(12, LOW);
  digitalWrite(11, LOW);
  Serial.println("КРАСНЫЙ: Стой!");
  delay(1000);

  // 2. Жёлтый сигнал — ВНИМАНИЕ
  digitalWrite(13, LOW);
  digitalWrite(12, HIGH);
  Serial.println("ЖЁЛТЫЙ: Приготовься...");
  delay(500);

  // 3. Зелёный сигнал — ИДИ
  digitalWrite(12, LOW);
  digitalWrite(11, HIGH);
  Serial.println("ЗЕЛЁНЫЙ: Путь свободен!");
  delay(1000);
}`,
    solutionExplanation: "Каждая фаза светофора управляется своим пином (D13, D12, D11). Все три светодиода имеют независимые токоограничивающие резисторы и общую шину земли GND.",
    challenge: {
      title: "Челлендж: Запусти все 3 сигнала светофора",
      description: "Собери полную схему из 3 светодиодов и запусти симуляцию так, чтобы все три цвета (красный, жёлтый, зелёный) последовательно загорелись!",
      xp: 150,
      check: function(state) {
        if (!state.circuitValid) {
          return { passed: false, message: "Проверь, что все 3 светодиода подключены через резисторы и имеют соединение с GND." };
        }
        return { passed: true, message: "Блестяще! Твой светофор работает без сбоев по всем правилам дорожной автоматики!" };
      }
    }
  },

  {
    id: "auto-street-light",
    number: 4,
    title: "Автоматическое освещение села (Фоторезистор)",
    titleKz: "Ауылды автоматты жарықтандыру (Фоторезистор)",
    difficulty: "Средний",
    duration: "20 мин",
    board: "Arduino Uno",
    category: "Аналоговые датчики",
    icon: "🌙",
    summary: "Собери умный уличный фонарь, который сам включает свет при наступлении сумерек с помощью датчика освещённости LDR.",
    theory: `
      <h4>Аналоговый сигнал и Фоторезистор (LDR)</h4>
      <p>В отличие от кнопки (которая знает только «вкл» и «выкл»), <strong>фоторезистор</strong> меняет своё сопротивление плавно в зависимости от яркости света.</p>
      <p>Пин <code>A0</code> на Arduino содержит <strong>АЦП (аналого-цифровой преобразователь)</strong>, который превращает уровень света в число от <code>0</code> (полная темнота) до <code>1023</code> (яркий солнечный день).</p>
      <div class="theory-callout info">
        <strong>🔬 Эксперимент в симуляторе:</strong><br>
        После запуска симуляции двигай ползунок <strong>«Освещённость (Lux)»</strong> прямо на датчике LDR, чтобы устроить день или ночь и увидеть, как срабатывает фонарь!
      </div>
    `,
    goal: "Настроить автоматическое включение светодиодного фонаря, когда уровень освещённости падает ниже порога (< 400).",
    componentsList: [
      { type: "arduino_uno", name: "Плата Arduino Uno", count: 1 },
      { type: "ldr", name: "Модуль фоторезистора (LDR)", count: 1 },
      { type: "resistor", name: "Резистор 220 Ом", count: 1 },
      { type: "led", name: "Уличный фонарь (Жёлтый/Белый LED)", count: 1 }
    ],
    steps: [
      "Подключи аналоговый выход датчика света <strong>AO</strong> к аналоговому пину <strong>A0</strong> платы Arduino (а <strong>GND</strong> датчика — к <strong>GND</strong>).",
      "Подключи пин <strong>D13</strong> через <strong>Резистор 220 Ом</strong> к <strong>Аноду (+)</strong> светодиода, а Катод — к <strong>GND</strong>.",
      "Запусти симуляцию и передвинь ползунок на датчике света влево (в темноту)!"
    ],
    initialComponents: [
      { id: "comp_ldr1", type: "ldr", x: 390, y: 290, props: { light: 75, label: "LDR1" } },
      { id: "comp_res1", type: "resistor", x: 410, y: 140, props: { resistance: 220, label: "R1" } },
      { id: "comp_led1", type: "led", x: 580, y: 125, props: { color: "yellow", label: "LAMP" } }
    ],
    targetWires: [
      { from: "comp_ldr1:out", to: "mcu:A0", color: "#06b6d4" },
      { from: "comp_ldr1:gnd", to: "mcu:GND2", color: "#3b82f6" },
      { from: "mcu:D13", to: "comp_res1:t1", color: "#eab308" },
      { from: "comp_res1:t2", to: "comp_led1:anode", color: "#eab308" },
      { from: "comp_led1:cathode", to: "mcu:GND1", color: "#3b82f6" }
    ],
    brokenScenario: {
      description: "Аналоговый датчик освещённости подключён к цифровому пину D2 вместо аналогового пина A0!",
      wires: [
        { from: "comp_ldr1:out", to: "mcu:D2", color: "#06b6d4" },
        { from: "comp_ldr1:gnd", to: "mcu:GND2", color: "#3b82f6" },
        { from: "mcu:D13", to: "comp_res1:t1", color: "#eab308" },
        { from: "comp_res1:t2", to: "comp_led1:anode", color: "#eab308" },
        { from: "comp_led1:cathode", to: "mcu:GND1", color: "#3b82f6" }
      ],
      code: `void setup() {\n  pinMode(13, OUTPUT);\n  Serial.begin(9600);\n}\nvoid loop() {\n  int light = analogRead(A0);\n  if (light < 400) {\n    digitalWrite(13, HIGH);\n  } else {\n    digitalWrite(13, LOW);\n  }\n  delay(300);\n}`
    },
    starterCode: `// Урок 4: Автоматическое уличное освещение
void setup() {
  pinMode(13, OUTPUT);
  Serial.begin(9600);
  Serial.println("Система умного освещения активна.");
}

void loop() {
  int lightLevel = analogRead(A0); // 0..1023
  Serial.print("Уровень света: ");
  Serial.println(lightLevel);

  if (lightLevel < 400) {
    digitalWrite(13, HIGH); // Наступила ночь -> включаем фонарь!
    Serial.println("Ночь: Уличный фонарь ВКЛЮЧЕН");
  } else {
    digitalWrite(13, LOW);  // Светло -> экономим энергию
  }
  delay(400);
}`,
    solutionExplanation: "Функция analogRead(A0) измеряет уровень освещённости (0–1023). Когда ползунок освещённости опускается ниже 40%, значение падает ниже 400 и Arduino включает фонарь на пине D13.",
    challenge: {
      title: "Челлендж: Испытай ночной режим",
      description: "Запусти симуляцию и уменьши ползунок освещённости на датчике LDR1 ниже 35%, чтобы уличный фонарь автоматически загорелся!",
      xp: 150,
      check: function(state) {
        if (!state.circuitValid) {
          return { passed: false, message: "Проверь подключение датчика LDR к аналоговому пину A0 и фонаря к D13." };
        }
        if (!state.ledLitEver) {
          return { passed: false, message: "Передвинь ползунок света на датчике LDR1 влево (сделай темно), чтобы фонарь загорелся!" };
        }
        return { passed: true, message: "Отлично! Теперь уличное освещение в селе работает автоматически и экономит электроэнергию днём!" };
      }
    }
  },

  {
    id: "temp-monitor-lcd",
    number: 5,
    title: "Климат-контроль: Датчик температуры + Дисплей",
    titleKz: "Климат-бақылау: Температура датчигі + Дисплей",
    difficulty: "Средний",
    duration: "25 мин",
    board: "Arduino Uno",
    category: "Экран и датчики",
    icon: "🌡️",
    summary: "Считывай температуру воздуха с датчика, выводи показания на цифровой экран LCD 16x2 и включай сигнал тревоги при перегреве.",
    theory: `
      <h4>Температурный мониторинг и дисплей</h4>
      <p>В школьных и сельских теплицах, инкубаторах и овощехранилищах критически важно следить за температурой.</p>
      <ul>
        <li><strong>Датчик температуры (TMP36 / NTC)</strong> подключается к аналоговому входу <code>A1</code> и передаёт текущую температуру в градусах Цельсия.</li>
        <li><strong>Дисплей LCD 16x2</strong> позволяет показывать текст и цифры прямо на устройстве без компьютера с помощью команды <code>lcd.print(...)</code>.</li>
      </ul>
    `,
    goal: "Вывести температуру на LCD-экран и настроить включение красного индикатора тревоги при температуре выше 30 °C.",
    componentsList: [
      { type: "arduino_uno", name: "Плата Arduino Uno", count: 1 },
      { type: "temp_sensor", name: "Датчик температуры (°C)", count: 1 },
      { type: "lcd", name: "Экран LCD 16x2 (I2C)", count: 1 },
      { type: "resistor", name: "Резистор 220 Ом", count: 1 },
      { type: "led", name: "Индикатор перегрева (Красный LED)", count: 1 }
    ],
    steps: [
      "Подключи выход <strong>OUT</strong> датчика температуры к пину <strong>A1</strong>, а его <strong>GND</strong> — к <strong>GND</strong>.",
      "Подключи вход данных <strong>SDA</strong> экрана LCD к пину <strong>A4</strong>, а <strong>GND</strong> экрана — к <strong>GND</strong>.",
      "Подключи пин <strong>D13</strong> через <strong>Резистор 220 Ом</strong> к красному светодиоду тревоги.",
      "Запусти симуляцию и подними температуру ползунком выше 30 °C!"
    ],
    initialComponents: [
      { id: "comp_temp1", type: "temp_sensor", x: 380, y: 310, props: { temp: 24, label: "TEMP1" } },
      { id: "comp_lcd1", type: "lcd", x: 560, y: 280, props: { line1: "Temp: 24 C", line2: "Status: OK", label: "LCD1" } },
      { id: "comp_res1", type: "resistor", x: 400, y: 130, props: { resistance: 220, label: "R1" } },
      { id: "comp_led1", type: "led", x: 570, y: 115, props: { color: "red", label: "ALARM" } }
    ],
    targetWires: [
      { from: "comp_temp1:out", to: "mcu:A1", color: "#f97316" },
      { from: "comp_temp1:gnd", to: "mcu:GND2", color: "#3b82f6" },
      { from: "comp_lcd1:sda", to: "mcu:A4", color: "#10b981" },
      { from: "comp_lcd1:gnd", to: "mcu:GND2", color: "#3b82f6" },
      { from: "mcu:D13", to: "comp_res1:t1", color: "#ef4444" },
      { from: "comp_res1:t2", to: "comp_led1:anode", color: "#ef4444" },
      { from: "comp_led1:cathode", to: "mcu:GND1", color: "#3b82f6" }
    ],
    brokenScenario: {
      description: "Экран LCD не подключён к линии данных A4 (SDA), поэтому показания температуры на дисплее не обновляются!",
      wires: [
        { from: "comp_temp1:out", to: "mcu:A1", color: "#f97316" },
        { from: "comp_temp1:gnd", to: "mcu:GND2", color: "#3b82f6" },
        { from: "mcu:D13", to: "comp_res1:t1", color: "#ef4444" },
        { from: "comp_res1:t2", to: "comp_led1:anode", color: "#ef4444" },
        { from: "comp_led1:cathode", to: "mcu:GND1", color: "#3b82f6" }
      ],
      code: `void setup() {\n  pinMode(13, OUTPUT);\n  Serial.begin(9600);\n}\nvoid loop() {\n  int temp = readTemp(A1);\n  lcd.print("Temp: " + temp + " C");\n  if (temp > 30) {\n    digitalWrite(13, HIGH);\n  } else {\n    digitalWrite(13, LOW);\n  }\n  delay(400);\n}`
    },
    starterCode: `// Урок 5: Термометр с LCD-экраном и защитой от перегрева
void setup() {
  pinMode(13, OUTPUT);
  Serial.begin(9600);
  Serial.println("Метео-модуль запущен.");
}

void loop() {
  int temp = readTemp(A1); // Читаем температуру в °C
  Serial.print("Температура: ");
  Serial.print(temp);
  Serial.println(" C");

  if (temp > 30) {
    digitalWrite(13, HIGH);
    lcd.print("Temp: " + temp + "C ALERT!");
    Serial.println("ВНИМАНИЕ: Перегрев! > 30 C");
  } else {
    digitalWrite(13, LOW);
    lcd.print("Temp: " + temp + "C NORMAL");
  }
  delay(400);
}`,
    solutionExplanation: "Датчик передаёт температуру на вход A1. Микроконтроллер выводит её на LCD-экран по шине I2C (пин A4) и сравнивает с порогом 30 °C.",
    challenge: {
      title: "Челлендж: Проверка тепловой тревоги",
      description: "Запусти симуляцию и увеличь ползунок температуры на датчике TEMP1 выше 31 °C, чтобы сработала сигнализация перегрева!",
      xp: 150,
      check: function(state) {
        if (!state.circuitValid) {
          return { passed: false, message: "Убедись, что датчик температуры подключён к A1, экран LCD — к A4, а светодиод — к D13." };
        }
        if (!state.ledLitEver) {
          return { passed: false, message: "Подними ползунок температуры на датчике TEMP1 выше 31 °C во время работы симуляции!" };
        }
        return { passed: true, message: "Отличная работа! Экран выводит данные, а сигнализация перегрева срабатывает мгновенно!" };
      }
    }
  },

  {
    id: "ultrasonic-servo-gate",
    number: 6,
    title: "Умный шлагбаум (Ультразвуковой радар + Сервопривод)",
    titleKz: "Ақылды шлагбаум (Ультрадыбыстық радар + Сервожетек)",
    difficulty: "Продвинутый",
    duration: "30 мин",
    board: "Arduino Uno",
    category: "Робототехника и мехатроника",
    icon: "🚧",
    summary: "Собери бесконтактный автоматический шлагбаум: ультразвуковой датчик измеряет расстояние до машины, а сервомотор поднимает стрелу на 90 градусов.",
    theory: `
      <h4>Как работает эхолокация и сервопривод?</h4>
      <p><strong>Ультразвуковой датчик HC-SR04</strong> работает как летучая мышь: отправляет звуковой импульс и замеряет время возврата эха, вычисляя расстояние в сантиметрах (от 2 до 200 см).</p>
      <p><strong>Сервопривод SG90</strong> — это умный мотор с редуктором, который умеет поворачивать вал на точный угол от <code>0°</code> до <code>180°</code> по команде <code>servo.write(угол)</code>.</p>
    `,
    goal: "Настроить автоматическое открытие шлагбаума (поворот сервопривода на 90°), когда объект приближается ближе чем на 50 см.",
    componentsList: [
      { type: "arduino_uno", name: "Плата Arduino Uno", count: 1 },
      { type: "ultrasonic", name: "Ультразвуковой датчик HC-SR04", count: 1 },
      { type: "servo", name: "Сервопривод SG90", count: 1 }
    ],
    steps: [
      "Подключи сигнальный пин <strong>ECHO</strong> ультразвукового датчика к пину <strong>D7</strong>, а <strong>GND</strong> — к <strong>GND</strong>.",
      "Подключи управляющий пин <strong>PWM</strong> сервопривода к пину <strong>D9</strong>, а <strong>GND</strong> — к <strong>GND</strong>.",
      "Запусти симуляцию и двигай ползунок «Расстояние (см)» на датчике HC-SR04!"
    ],
    initialComponents: [
      { id: "comp_us1", type: "ultrasonic", x: 390, y: 130, props: { distance: 120, label: "HC-SR04" } },
      { id: "comp_servo1", type: "servo", x: 550, y: 270, props: { angle: 0, label: "SERVO1" } }
    ],
    targetWires: [
      { from: "comp_us1:out", to: "mcu:D7", color: "#06b6d4" },
      { from: "comp_us1:gnd", to: "mcu:GND1", color: "#3b82f6" },
      { from: "comp_servo1:pwm", to: "mcu:D9", color: "#f97316" },
      { from: "comp_servo1:gnd", to: "mcu:GND2", color: "#3b82f6" }
    ],
    brokenScenario: {
      description: "Сервопривод подключён к пину D10, тогда как в коде команда servo.attach(9) управляет пином D9!",
      wires: [
        { from: "comp_us1:out", to: "mcu:D7", color: "#06b6d4" },
        { from: "comp_us1:gnd", to: "mcu:GND1", color: "#3b82f6" },
        { from: "comp_servo1:pwm", to: "mcu:D10", color: "#f97316" },
        { from: "comp_servo1:gnd", to: "mcu:GND2", color: "#3b82f6" }
      ],
      code: `void setup() {\n  servo.attach(9);\n  Serial.begin(9600);\n}\nvoid loop() {\n  int dist = readDistance(7);\n  if (dist < 50) {\n    servo.write(90);\n  } else {\n    servo.write(0);\n  }\n  delay(300);\n}`
    },
    starterCode: `// Урок 6: Автоматический шлагбаум с радаром HC-SR04 и сервоприводом
void setup() {
  servo.attach(9); // Сервопривод на пине D9
  Serial.begin(9600);
  Serial.println("Радар шлагбаума активен.");
}

void loop() {
  int dist = readDistance(7); // Расстояние в см с пина D7
  Serial.print("Расстояние до машины: ");
  Serial.print(dist);
  Serial.println(" см");

  if (dist < 50) {
    servo.write(90); // Открыть шлагбаум (90 градусов)
    Serial.println("Шлагбаум ОТКРЫТ (90°)");
  } else {
    servo.write(0);  // Закрыть шлагбаум (0 градусов)
  }
  delay(350);
}`,
    solutionExplanation: "Датчик HC-SR04 измеряет дистанцию до препятствия. Когда расстояние меньше 50 см, сервопривод на пине D9 поворачивает рычаг на 90 градусов.",
    challenge: {
      title: "Челлендж: Открой шлагбаум перед машиной",
      description: "Запусти симуляцию и уменьши расстояние на ультразвуковом датчике HC-SR04 до значения меньше 45 см, чтобы сервопривод повернулся на 90°!",
      xp: 200,
      check: function(state) {
        if (!state.circuitValid) {
          return { passed: false, message: "Проверь подключение датчика HC-SR04 к D7 и сервопривода к D9." };
        }
        if (!state.servoMovedEver) {
          return { passed: false, message: "Передвинь ползунок расстояния на датчике HC-SR04 влево (< 50 см), чтобы сервопривод открыл шлагбаум!" };
        }
        return { passed: true, message: "Великолепно! Ты собрал настоящую мехатронную систему бесконтактного доступа!" };
      }
    }
  },

  {
    id: "smart-irrigation",
    number: 7,
    title: "АгроТех: Автоматический полив для сельской теплицы",
    titleKz: "АгроТех: Ауыл жылыжайына арналған автосуару",
    difficulty: "Продвинутый",
    duration: "30 мин",
    board: "Arduino Uno",
    category: "АгроТех для села",
    icon: "🌱",
    summary: "Реальный проект для сельского хозяйства: датчик влажности почвы проверяет землю и сам включает водяной насос и дисплей, когда растениям нужна вода.",
    theory: `
      <h4>Точное земледелие своими руками</h4>
      <p>В сельской местности экономия воды и своевременный полив теплиц — важнейшая задача. С помощью микроконтроллера можно автоматизировать полив:</p>
      <ul>
        <li><strong>Датчик влажности почвы</strong> на входе <code>A2</code> измеряет влажность от 0% (засуха) до 100% (влажная почва).</li>
        <li><strong>Водяной насос (Мотор-помпа)</strong> на пине <code>D8</code> автоматически включается, когда влажность падает ниже 35%.</li>
        <li><strong>LCD-экран</strong> показывает фермеру текущее состояние почвы и статус насоса.</li>
      </ul>
    `,
    goal: "Собрать систему автополива, которая включает водяной насос при пересыхании почвы (< 35%) и выводит статус на экран.",
    componentsList: [
      { type: "arduino_uno", name: "Плата Arduino Uno", count: 1 },
      { type: "soil_sensor", name: "Датчик влажности почвы", count: 1 },
      { type: "pump", name: "Водяной насос (Помпа 5V)", count: 1 },
      { type: "lcd", name: "Экран LCD 16x2", count: 1 }
    ],
    steps: [
      "Подключи выход <strong>AO</strong> датчика влажности почвы к аналоговому пину <strong>A2</strong> (и <strong>GND</strong> к земле).",
      "Подключи вход управления водяного насоса <strong>IN</strong> к цифровому пину <strong>D8</strong> (и <strong>GND</strong> к земле).",
      "Подключи линию данных экрана <strong>SDA</strong> к пину <strong>A4</strong> (и <strong>GND</strong> к земле).",
      "Запусти симуляцию и уменьши влажность почвы ползунком ниже 35%, чтобы включился полив!"
    ],
    initialComponents: [
      { id: "comp_soil1", type: "soil_sensor", x: 380, y: 120, props: { moisture: 65, label: "SOIL1" } },
      { id: "comp_pump1", type: "pump", x: 570, y: 120, props: { active: false, label: "PUMP1" } },
      { id: "comp_lcd1", type: "lcd", x: 470, y: 295, props: { line1: "Soil: 65%", line2: "Pump: OFF", label: "LCD1" } }
    ],
    targetWires: [
      { from: "comp_soil1:out", to: "mcu:A2", color: "#10b981" },
      { from: "comp_soil1:gnd", to: "mcu:GND1", color: "#3b82f6" },
      { from: "comp_pump1:in", to: "mcu:D8", color: "#06b6d4" },
      { from: "comp_pump1:gnd", to: "mcu:GND1", color: "#3b82f6" },
      { from: "comp_lcd1:sda", to: "mcu:A4", color: "#a855f7" },
      { from: "comp_lcd1:gnd", to: "mcu:GND2", color: "#3b82f6" }
    ],
    brokenScenario: {
      description: "Водяной насос подключён к пину D8, но в функции setup() забыли настроить pinMode(8, OUTPUT), а провод GND насоса не подключён!",
      wires: [
        { from: "comp_soil1:out", to: "mcu:A2", color: "#10b981" },
        { from: "comp_soil1:gnd", to: "mcu:GND1", color: "#3b82f6" },
        { from: "comp_pump1:in", to: "mcu:D8", color: "#06b6d4" },
        { from: "comp_lcd1:sda", to: "mcu:A4", color: "#a855f7" },
        { from: "comp_lcd1:gnd", to: "mcu:GND2", color: "#3b82f6" }
      ],
      code: `void setup() {\n  pinMode(8, OUTPUT);\n  Serial.begin(9600);\n}\nvoid loop() {\n  int moisture = readMoisture(A2);\n  if (moisture < 35) {\n    digitalWrite(8, HIGH);\n    lcd.print("Soil:" + moisture + "% WATERING");\n  } else {\n    digitalWrite(8, LOW);\n    lcd.print("Soil:" + moisture + "% OK");\n  }\n  delay(400);\n}`
    },
    starterCode: `// Урок 7: Умная теплица — Автоматический полив
void setup() {
  pinMode(8, OUTPUT); // Пин управления водяным насосом
  Serial.begin(9600);
  Serial.println("Агро-контроллер теплицы запущен.");
}

void loop() {
  int moisture = readMoisture(A2); // Влажность почвы 0..100%
  Serial.print("Влажность почвы: ");
  Serial.print(moisture);
  Serial.println("%");

  if (moisture < 35) {
    digitalWrite(8, HIGH); // Включаем насос!
    lcd.print("Soil:" + moisture + "% WATERING");
    Serial.println("Почва сухая -> НАСОС ВКЛЮЧЕН 💧");
  } else {
    digitalWrite(8, LOW);  // Выключаем насос
    lcd.print("Soil:" + moisture + "% NORM");
  }
  delay(400);
}`,
    solutionExplanation: "Когда влажность почвы на датчике A2 опускается ниже 35%, Arduino подаёт сигнал HIGH на пин D8, запуская водяную помпу до тех пор, пока почва не увлажнится.",
    challenge: {
      title: "Челлендж: Спаси урожай от засухи",
      description: "Запусти симуляцию и опусти ползунок влажности почвы на датчике SOIL1 ниже 30%, чтобы автоматически включился водяной насос!",
      xp: 200,
      check: function(state) {
        if (!state.circuitValid) {
          return { passed: false, message: "Проверь соединения датчика влажности (A2), насоса (D8) и дисплея (A4)." };
        }
        if (!state.pumpActivatedEver) {
          return { passed: false, message: "Опусти ползунок влажности почвы на датчике SOIL1 ниже 30%, чтобы заработал водяной насос!" };
        }
        return { passed: true, message: "Потрясающе! Твоя автоматическая станция полива готова помогать фермерам и школьным теплицам!" };
      }
    }
  },

  {
    id: "esp32-iot-weather",
    number: 8,
    title: "IoT-метеостанция на ESP32 (Телеметрия)",
    titleKz: "ESP32 негізіндегі IoT-метеостанция",
    difficulty: "Продвинутый",
    duration: "30 мин",
    board: "ESP32 Wi-Fi",
    category: "Интернет вещей (IoT)",
    icon: "📡",
    summary: "Собери цифровую метеостанцию на микроконтроллере ESP32: считывай температуру, освещённость и влажность и отправляй телеметрию на экран и в монитор порта.",
    theory: `
      <h4>ESP32 и Интернет вещей (IoT)</h4>
      <p>Микроконтроллер <strong>ESP32</strong> отличается от классической Arduino тем, что имеет встроенный модуль <strong>Wi-Fi и Bluetooth</strong> и двухъядерный процессор.</p>
      <p>Это позволяет собирать данные сразу с нескольких датчиков (температура, свет, влажность) и формировать информационные пакеты для школьной метеостанции.</p>
    `,
    goal: "Собрать комплексную метеостанцию из датчика температуры, датчика света и дисплея под управлением платы ESP32.",
    componentsList: [
      { type: "esp32", name: "Контроллер ESP32 Wi-Fi", count: 1 },
      { type: "temp_sensor", name: "Датчик температуры", count: 1 },
      { type: "ldr", name: "Датчик освещённости LDR", count: 1 },
      { type: "lcd", name: "OLED / LCD Дисплей", count: 1 }
    ],
    steps: [
      "Подключи датчик температуры к пину <strong>A1</strong> (и <strong>GND</strong>).",
      "Подключи фоторезистор LDR к пину <strong>A0</strong> (и <strong>GND</strong>).",
      "Подключи дисплей к линии данных <strong>A4</strong> (и <strong>GND</strong>).",
      "Запусти симуляцию и меняй погодные параметры ползунками!"
    ],
    initialComponents: [
      { id: "comp_temp1", type: "temp_sensor", x: 380, y: 115, props: { temp: 22, label: "TEMP1" } },
      { id: "comp_ldr1", type: "ldr", x: 560, y: 115, props: { light: 80, label: "LDR1" } },
      { id: "comp_lcd1", type: "lcd", x: 465, y: 290, props: { line1: "IoT ESP32 Ready", line2: "T:22C L:80%", label: "OLED1" } }
    ],
    targetWires: [
      { from: "comp_temp1:out", to: "mcu:A1", color: "#f97316" },
      { from: "comp_temp1:gnd", to: "mcu:GND1", color: "#3b82f6" },
      { from: "comp_ldr1:out", to: "mcu:A0", color: "#06b6d4" },
      { from: "comp_ldr1:gnd", to: "mcu:GND1", color: "#3b82f6" },
      { from: "comp_lcd1:sda", to: "mcu:A4", color: "#10b981" },
      { from: "comp_lcd1:gnd", to: "mcu:GND2", color: "#3b82f6" }
    ],
    brokenScenario: {
      description: "Оба датчика ошибочно подключены к одному и тому же аналоговому входу A0 — возникает конфликт сигналов!",
      wires: [
        { from: "comp_temp1:out", to: "mcu:A0", color: "#f97316" },
        { from: "comp_temp1:gnd", to: "mcu:GND1", color: "#3b82f6" },
        { from: "comp_ldr1:out", to: "mcu:A0", color: "#06b6d4" },
        { from: "comp_ldr1:gnd", to: "mcu:GND1", color: "#3b82f6" },
        { from: "comp_lcd1:sda", to: "mcu:A4", color: "#10b981" },
        { from: "comp_lcd1:gnd", to: "mcu:GND2", color: "#3b82f6" }
      ],
      code: `void setup() {\n  Serial.begin(9600);\n  Serial.println("[WiFi] ESP32 Connected!");\n}\nvoid loop() {\n  int temp = readTemp(A1);\n  int light = analogRead(A0);\n  lcd.print("T:" + temp + "C L:" + light);\n  delay(500);\n}`
    },
    starterCode: `// Урок 8: Сельская IoT-метеостанция на ESP32
void setup() {
  Serial.begin(9600);
  Serial.println("[ESP32 Wi-Fi] Подключение к сети Auyl_School_Net...");
  Serial.println("[IoT Cloud] Соединение установлено! Передача телеметрии:");
}

void loop() {
  int temp = readTemp(A1);
  int light = analogRead(A0);

  lcd.print("T:" + temp + "C Light:" + light);
  Serial.print("📡 [IoT Пакет] Температура: ");
  Serial.print(temp);
  Serial.print(" C | Свет ADC: ");
  Serial.println(light);

  delay(500);
}`,
    solutionExplanation: "Контроллер ESP32 опрашивает сразу два аналоговых канала (A1 и A0), агрегирует данные на экране и отправляет пакеты телеметрии в консоль.",
    challenge: {
      title: "Челлендж: Запусти передачу IoT-телеметрии",
      description: "Собери схему метеостанции без конфликтов пинов и запусти симуляцию, чтобы пакеты телеметрии пошли в монитор порта!",
      xp: 250,
      check: function(state) {
        if (!state.circuitValid) {
          return { passed: false, message: "Проверь, что датчик температуры подключён к A1, фоторезистор — к A0, а экран — к A4." };
        }
        return { passed: true, message: "Поздравляем! Ты прошёл весь курс и создал полноценную IoT-метеостанцию на ESP32!" };
      }
    }
  }
];
