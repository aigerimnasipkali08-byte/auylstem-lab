// Браузерный интерпретатор и анализатор кода Arduino C++ / ESP32 (ArduinoInterpreter)
// Поддерживает setup(), loop(), переменные, условия if/else, delay(), digitalWrite/Read, analogRead, Serial, Servo и LCD

class ArduinoInterpreter {
  constructor(circuitEngine, callbacks = {}) {
    this.circuit = circuitEngine;
    this.callbacks = callbacks; // onSerialOut, onStateUpdate, onError
    this.running = false;
    this.loopTimer = null;
    this.abortController = null;
    this.pinModes = {};
    this.servoPin = null;
  }

  normalizePinName(rawPin) {
    const s = String(rawPin).trim();
    if (s.startsWith("A")) return s;
    const num = parseInt(s, 10);
    if (!isNaN(num)) return "D" + num;
    return s;
  }

  // Статический анализ кода и сверка со схемой
  analyzeCodeAndCircuit(code, circuitAnalysis) {
    const issues = [];
    const clean = code.replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");

    if (!/void\s+setup\s*\(\s*\)/.test(clean)) {
      issues.push({
        severity: "error",
        title: "В коде отсутствует функция void setup()",
        explanation: "Каждая программа Arduino должна содержать функцию void setup() { ... }, которая запускается один раз при старте."
      });
    }
    if (!/void\s+loop\s*\(\s*\)/.test(clean)) {
      issues.push({
        severity: "error",
        title: "В коде отсутствует функция void loop()",
        explanation: "Добавь функцию void loop() { ... } — в ней пишутся основные команды, которые повторяются по кругу."
      });
    }

    // Собираем объявленные pinMode
    const declaredPinModes = {};
    const pinModeRegex = /pinMode\s*\(\s*([A-Za-z0-9]+)\s*,\s*(OUTPUT|INPUT|INPUT_PULLUP)\s*\)/g;
    let m;
    while ((m = pinModeRegex.exec(clean)) !== null) {
      declaredPinModes[this.normalizePinName(m[1])] = m[2];
    }

    // Проверяем digitalWrite
    const dwRegex = /digitalWrite\s*\(\s*([A-Za-z0-9]+)\s*,\s*(HIGH|LOW|1|0)\s*\)/g;
    const usedOutputPins = new Set();
    while ((m = dwRegex.exec(clean)) !== null) {
      const pName = this.normalizePinName(m[1]);
      usedOutputPins.add(pName);
      if (!declaredPinModes[pName]) {
        issues.push({
          severity: "warning",
          title: `Не указан pinMode(${m[1]}, OUTPUT) в setup()`,
          explanation: `Ты подаёшь напряжение на пин ${pName} через digitalWrite, но забыл настроить его как выход в функции setup(). На реальной плате Arduino светодиод из-за этого будет светиться очень тускло!`
        });
      }
    }

    // Сверяем выходные пины кода со схемой (светодиоды, помпа)
    usedOutputPins.forEach(pName => {
      const hasLedOnPin = circuitAnalysis.ledBindings.some(b => b.mcuPin === pName);
      const hasActuatorOnPin = Boolean(circuitAnalysis.sensorBindings[pName]);
      if (!hasLedOnPin && !hasActuatorOnPin && this.circuit.wires.length > 0) {
        // Ищем, куда реально подключён светодиод или помпа
        const actualLed = circuitAnalysis.ledBindings[0];
        const actualPumpEntry = Object.entries(circuitAnalysis.sensorBindings).find(([, c]) => c.type === "pump");
        if (actualLed) {
          issues.push({
            severity: "error",
            title: `Несовпадение пинов между кодом и схемой!`,
            explanation: `В коде ты управляешь пином ${pName}, а на схеме светодиод подключён к пину ${actualLed.mcuPin}. Измени номер пина в коде или переключи провод!`
          });
        } else if (actualPumpEntry) {
          issues.push({
            severity: "error",
            title: `Несовпадение пина насоса (${pName} vs ${actualPumpEntry[0]})`,
            explanation: `В коде управляется пин ${pName}, а насос подключён к ${actualPumpEntry[0]}.`
          });
        }
      }
    });

    // Проверяем чтение датчиков digitalRead / analogRead / readTemp / readDistance / readMoisture
    const readRegex = /(digitalRead|analogRead|readTemp|readDistance|readMoisture)\s*\(\s*([A-Za-z0-9]+)\s*\)/g;
    while ((m = readRegex.exec(clean)) !== null) {
      const fn = m[1];
      const pName = this.normalizePinName(m[2]);
      const connectedComp = circuitAnalysis.sensorBindings[pName];
      if (!connectedComp && this.circuit.wires.length > 0) {
        // Найдём, куда на самом деле подключён датчик
        const entries = Object.entries(circuitAnalysis.sensorBindings);
        const hintEntry = entries.find(([, c]) => c.type !== "lcd" && c.type !== "servo" && c.type !== "pump");
        issues.push({
          severity: "error",
          title: `Функция ${fn}(${m[2]}) читает пустой пин ${pName}!`,
          explanation: hintEntry
            ? `В коде программа ждёт сигнал с датчика на пине ${pName}, но на схеме датчик «${hintEntry[1].props.label}» подключён к пину ${hintEntry[0]}! Переключи провод на ${pName} или исправь код.`
            : `К пину ${pName} сейчас не подключён ни один датчик.`
        });
      }
    }

    // Проверяем servo.attach(pin)
    const servoMatch = /servo\.attach\s*\(\s*([0-9]+)\s*\)/.exec(clean);
    if (servoMatch) {
      const sPin = this.normalizePinName(servoMatch[1]);
      const connectedComp = circuitAnalysis.sensorBindings[sPin];
      if ((!connectedComp || connectedComp.type !== "servo") && this.circuit.wires.length > 0) {
        const actualServo = Object.entries(circuitAnalysis.sensorBindings).find(([, c]) => c.type === "servo");
        issues.push({
          severity: "error",
          title: `Сервопривод не найден на пине ${sPin}!`,
          explanation: actualServo
            ? `Команда servo.attach(${servoMatch[1]}) настроена на пин ${sPin}, а на схеме сервопривод подключён к пину ${actualServo[0]}!`
            : `Подключи вывод PWM сервопривода к пину ${sPin}.`
        });
      }
    }

    // Проверяем наличие LCD-экрана при вызове lcd.print
    if (/lcd\.print\s*\(/.test(clean)) {
      const hasLcdConnected = Object.values(circuitAnalysis.sensorBindings).some(c => c.type === "lcd");
      if (!hasLcdConnected && this.circuit.components.some(c => c.type === "lcd")) {
        issues.push({
          severity: "error",
          title: `Команда lcd.print() не может вывести текст — экран не подключён!`,
          explanation: `Подключи вывод SDA экрана LCD к пину A4/SDA на плате и вывод GND к земле.`
        });
      }
    }

    return issues;
  }

  extractFunctionBody(code, fnName) {
    const clean = code.replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
    const regex = new RegExp(`void\\s+${fnName}\\s*\\(\\s*\\)\\s*\\{`);
    const match = regex.exec(clean);
    if (!match) return "";
    let idx = match.index + match[0].length;
    let depth = 1;
    let body = "";
    while (idx < clean.length && depth > 0) {
      const ch = clean[idx];
      if (ch === "{") depth++;
      else if (ch === "}") depth--;
      if (depth > 0) body += ch;
      idx++;
    }
    return body.trim();
  }

  // Разбивает тело функции на инструкции верхнего уровня (включая блоки if/else)
  parseStatements(body) {
    const statements = [];
    let i = 0;
    const n = body.length;

    const skipWs = () => {
      while (i < n && /\s/.test(body[i])) i++;
    };

    const readParen = () => {
      skipWs();
      if (body[i] !== "(") return "";
      i++;
      let depth = 1;
      let res = "";
      while (i < n && depth > 0) {
        if (body[i] === "(") depth++;
        else if (body[i] === ")") depth--;
        if (depth > 0) res += body[i];
        i++;
      }
      return res.trim();
    };

    const readBlock = () => {
      skipWs();
      if (body[i] !== "{") return "";
      i++;
      let depth = 1;
      let res = "";
      while (i < n && depth > 0) {
        if (body[i] === "{") depth++;
        else if (body[i] === "}") depth--;
        if (depth > 0) res += body[i];
        i++;
      }
      return res.trim();
    };

    while (i < n) {
      skipWs();
      if (i >= n) break;

      if (body.slice(i).startsWith("if") && /[\s(]/.test(body[i + 2] || "")) {
        i += 2;
        const cond = readParen();
        const thenBlock = readBlock();
        let elseBlock = "";
        skipWs();
        if (body.slice(i).startsWith("else") && /[\s{]/.test(body[i + 4] || "")) {
          i += 4;
          elseBlock = readBlock();
        }
        statements.push({
          type: "if",
          cond,
          thenStmts: this.parseStatements(thenBlock),
          elseStmts: elseBlock ? this.parseStatements(elseBlock) : []
        });
      } else {
        // Обычная инструкция до точки с запятой
        let stmt = "";
        while (i < n && body[i] !== ";") {
          stmt += body[i];
          i++;
        }
        if (body[i] === ";") i++;
        stmt = stmt.trim();
        if (stmt) {
          statements.push({ type: "line", text: stmt });
        }
      }
    }
    return statements;
  }

  readSensorValue(fnName, rawPin, circuitAnalysis) {
    const pName = this.normalizePinName(rawPin);
    const comp = circuitAnalysis.sensorBindings[pName];
    if (!comp) return 0;

    if (fnName === "digitalRead") {
      if (comp.type === "button") return comp.props.pressed ? 1 : 0;
      return 0;
    }
    if (fnName === "analogRead") {
      if (comp.type === "ldr") return Math.round((comp.props.light ?? 75) * 10.23);
      if (comp.type === "temp_sensor") return comp.props.temp ?? 24;
      if (comp.type === "soil_sensor") return Math.round((comp.props.moisture ?? 65) * 10.23);
      return 512;
    }
    if (fnName === "readTemp") {
      return comp.type === "temp_sensor" ? (comp.props.temp ?? 24) : 24;
    }
    if (fnName === "readDistance") {
      return comp.type === "ultrasonic" ? (comp.props.distance ?? 100) : 100;
    }
    if (fnName === "readMoisture") {
      return comp.type === "soil_sensor" ? (comp.props.moisture ?? 65) : 60;
    }
    return 0;
  }

  evalExpression(expr, env, circuitAnalysis) {
    const s = expr.trim();
    if (s === "HIGH" || s === "true") return 1;
    if (s === "LOW" || s === "false") return 0;

    // Вызов функции чтения датчика
    const fnMatch = /^(digitalRead|analogRead|readTemp|readDistance|readMoisture)\s*\(\s*([A-Za-z0-9]+)\s*\)$/.exec(s);
    if (fnMatch) {
      return this.readSensorValue(fnMatch[1], fnMatch[2], circuitAnalysis);
    }

    // Конкатенация строк (например "Temp: " + temp + " C")
    if (s.includes('"')) {
      const parts = s.split("+").map(p => p.trim());
      return parts.map(p => {
        if (p.startsWith('"') && p.endsWith('"')) return p.slice(1, -1);
        if (env[p] !== undefined) return env[p];
        return p;
      }).join("");
    }

    // Сравнения: <, >, <=, >=, ==, !=
    const cmpMatch = /^(.+?)\s*(<=|>=|==|!=|<|>)\s*(.+)$/.exec(s);
    if (cmpMatch) {
      const left = this.evalExpression(cmpMatch[1], env, circuitAnalysis);
      const op = cmpMatch[2];
      const right = this.evalExpression(cmpMatch[3], env, circuitAnalysis);
      if (op === "<") return left < right;
      if (op === ">") return left > right;
      if (op === "<=") return left <= right;
      if (op === ">=") return left >= right;
      if (op === "==") return left == right;
      if (op === "!=") return left != right;
    }

    if (env[s] !== undefined) return env[s];
    const num = Number(s);
    if (!isNaN(num)) return num;
    return s;
  }

  async executeStatements(stmts, env, signal) {
    for (const st of stmts) {
      if (!this.running || signal.aborted) return;
      const circuitAnalysis = this.circuit.analyzeCircuit();

      if (st.type === "if") {
        const condResult = Boolean(this.evalExpression(st.cond, env, circuitAnalysis));
        if (condResult) {
          await this.executeStatements(st.thenStmts, env, signal);
        } else if (st.elseStmts && st.elseStmts.length > 0) {
          await this.executeStatements(st.elseStmts, env, signal);
        }
        continue;
      }

      const line = st.text;

      // 1. Объявление переменной: int x = ...
      const varMatch = /^(?:int|float|long|bool|String)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*(.+)$/.exec(line);
      if (varMatch) {
        env[varMatch[1]] = this.evalExpression(varMatch[2], env, circuitAnalysis);
        continue;
      }

      // 2. Присваивание: x = ...
      const assignMatch = /^([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*(.+)$/.exec(line);
      if (assignMatch) {
        env[assignMatch[1]] = this.evalExpression(assignMatch[2], env, circuitAnalysis);
        continue;
      }

      // 3. pinMode(pin, mode)
      const pmMatch = /^pinMode\s*\(\s*([A-Za-z0-9]+)\s*,\s*([A-Z_]+)\s*\)$/.exec(line);
      if (pmMatch) {
        this.pinModes[this.normalizePinName(pmMatch[1])] = pmMatch[2];
        continue;
      }

      // 4. digitalWrite(pin, val)
      const dwMatch = /^digitalWrite\s*\(\s*([A-Za-z0-9]+)\s*,\s*(.+)\s*\)$/.exec(line);
      if (dwMatch) {
        const pName = this.normalizePinName(dwMatch[1]);
        const val = this.evalExpression(dwMatch[2], env, circuitAnalysis);
        this.applyPinOutput(pName, val ? 1 : 0, circuitAnalysis);
        continue;
      }

      // 5. servo.attach(pin)
      const saMatch = /^servo\.attach\s*\(\s*([0-9]+)\s*\)$/.exec(line);
      if (saMatch) {
        this.servoPin = this.normalizePinName(saMatch[1]);
        continue;
      }

      // 6. servo.write(angle)
      const swMatch = /^servo\.write\s*\(\s*(.+)\s*\)$/.exec(line);
      if (swMatch) {
        const angle = Number(this.evalExpression(swMatch[1], env, circuitAnalysis)) || 0;
        const targetPin = this.servoPin || "D9";
        const servoComp = circuitAnalysis.sensorBindings[targetPin];
        if (servoComp && servoComp.type === "servo") {
          servoComp.props.angle = Math.max(0, Math.min(180, angle));
          this.circuit.render();
          if (this.callbacks.onStateUpdate) {
            this.callbacks.onStateUpdate({ servoMoved: angle > 0 });
          }
        }
        continue;
      }

      // 7. lcd.print(...)
      const lcdMatch = /^lcd\.print\s*\(\s*(.+)\s*\)$/.exec(line);
      if (lcdMatch) {
        const text = String(this.evalExpression(lcdMatch[1], env, circuitAnalysis));
        Object.values(circuitAnalysis.sensorBindings).forEach(c => {
          if (c.type === "lcd") {
            const words = text.split(" ");
            if (text.length <= 16) {
              c.props.line1 = text;
              c.props.line2 = "Sistema OK";
            } else {
              c.props.line1 = text.slice(0, 16);
              c.props.line2 = text.slice(16, 32);
            }
            this.circuit.render();
          }
        });
        continue;
      }

      // 8. Serial.print / Serial.println
      const serMatch = /^Serial\.(print|println)\s*\(\s*(.+)\s*\)$/.exec(line);
      if (serMatch) {
        const isLn = serMatch[1] === "println";
        const val = this.evalExpression(serMatch[2], env, circuitAnalysis);
        if (this.callbacks.onSerialOut) {
          this.callbacks.onSerialOut(String(val), isLn);
        }
        continue;
      }

      // 9. delay(ms)
      const delayMatch = /^delay\s*\(\s*(.+)\s*\)$/.exec(line);
      if (delayMatch) {
        const ms = Math.max(50, Math.min(5000, Number(this.evalExpression(delayMatch[1], env, circuitAnalysis)) || 300));
        await new Promise((resolve) => {
          const t = setTimeout(resolve, ms);
          signal.addEventListener("abort", () => {
            clearTimeout(t);
            resolve();
          }, { once: true });
        });
        continue;
      }
    }
  }

  applyPinOutput(pName, isHigh, circuitAnalysis) {
    this.circuit.mcuPinStates[pName] = isHigh;

    // 1. Обновляем светодиоды на этом пине
    let anyLedLit = false;
    let anyBurned = false;

    circuitAnalysis.ledBindings.forEach(binding => {
      if (binding.mcuPin === pName) {
        if (!binding.comp.runtime) binding.comp.runtime = {};
        if (isHigh) {
          if (!binding.hasResistor) {
            binding.comp.runtime.burned = true;
            binding.comp.runtime.lit = false;
            anyBurned = true;
          } else {
            binding.comp.runtime.burned = false;
            binding.comp.runtime.lit = true;
            // Яркость зависит от сопротивления резистора! (Экспериментальная физика)
            const ohms = binding.resistorOhms || 220;
            binding.comp.runtime.brightness = ohms <= 100 ? 1.0 : ohms <= 220 ? 0.95 : ohms <= 1000 ? 0.65 : 0.35;
            anyLedLit = true;
          }
        } else {
          binding.comp.runtime.lit = false;
        }
      }
    });

    // 2. Обновляем водяной насос (помпу) на этом пине
    let pumpActivated = false;
    const boundComp = circuitAnalysis.sensorBindings[pName];
    if (boundComp && boundComp.type === "pump") {
      boundComp.props.active = Boolean(isHigh);
      if (isHigh) pumpActivated = true;
    }

    this.circuit.render();
    if (this.callbacks.onStateUpdate) {
      this.callbacks.onStateUpdate({
        ledLit: anyLedLit,
        burnedLed: anyBurned,
        pumpActivated
      });
    }
  }

  async start(code) {
    this.stop();
    this.running = true;
    this.circuit.isRunning = true;
    this.circuit.resetSimulationVisuals();
    this.pinModes = {};
    this.servoPin = null;
    this.abortController = new AbortController();
    const signal = this.abortController.signal;

    const setupBody = this.extractFunctionBody(code, "setup");
    const loopBody = this.extractFunctionBody(code, "loop");

    const setupStmts = this.parseStatements(setupBody);
    const loopStmts = this.parseStatements(loopBody);
    const env = {};

    this.circuit.render();
    await this.executeStatements(setupStmts, env, signal);

    while (this.running && !signal.aborted) {
      await this.executeStatements(loopStmts, env, signal);
      // Страховочная пауза на случай, если ученик удалил delay() из loop()
      await new Promise(r => setTimeout(r, 60));
    }
  }

  stop() {
    this.running = false;
    this.circuit.isRunning = false;
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    this.circuit.resetSimulationVisuals();
    this.circuit.render();
  }
}

window.ArduinoInterpreter = ArduinoInterpreter;
