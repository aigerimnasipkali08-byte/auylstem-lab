// Интерактивный движок схемотехники и физической симуляции компонентов (CircuitEngine)
// Отвечает за отрисовку платы Arduino/ESP32, компонентов, виртуальных проводов и диагностику электрических цепей

class CircuitEngine {
  constructor(containerEl, callbacks = {}) {
    this.container = containerEl;
    this.callbacks = callbacks; // onCircuitChange, onPinClick, onSensorChange
    this.boardType = "Arduino Uno";
    this.components = [];
    this.wires = [];
    this.targetWires = [];
    this.showHints = false;
    this.isRunning = false;

    // Интерактивное состояние протягивания провода и перетаскивания
    this.activePin = null; // { compId, pinId, x, y }
    this.mousePos = { x: 0, y: 0 };
    this.draggingComp = null;
    this.dragOffset = { x: 0, y: 0 };
    this.selectedWireColor = "#ef4444";

    // Состояния пинов микроконтроллера во время симуляции
    this.mcuPinStates = {}; // { D13: 1, D9: 90, ... }

    this.initDOM();
    this.bindEvents();
  }

  initDOM() {
    this.container.innerHTML = `
      <div class="workbench-canvas" id="workbenchCanvas">
        <svg class="wires-svg" id="wiresSvg" viewBox="0 0 860 470" preserveAspectRatio="xMidYMid meet">
          <defs>
            <filter id="glowFilter" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <pattern id="gridPattern" width="20" height="20" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1" fill="rgba(148, 163, 184, 0.18)" />
            </pattern>
          </defs>
          <rect width="860" height="470" fill="url(#gridPattern)" />
          <g id="hintWiresLayer"></g>
          <g id="wiresLayer"></g>
          <g id="activeWireLayer"></g>
        </svg>
        <div class="components-layer" id="componentsLayer"></div>
      </div>
    `;
    this.workbench = this.container.querySelector("#workbenchCanvas");
    this.wiresSvg = this.container.querySelector("#wiresSvg");
    this.wiresLayer = this.container.querySelector("#wiresLayer");
    this.hintWiresLayer = this.container.querySelector("#hintWiresLayer");
    this.activeWireLayer = this.container.querySelector("#activeWireLayer");
    this.componentsLayer = this.container.querySelector("#componentsLayer");
  }

  getMcuPins() {
    // Координаты пинов на плате Arduino Uno / ESP32 (левая часть рабочей области)
    return [
      { id: "D13", label: "D13", x: 255, y: 72, type: "digital" },
      { id: "D12", label: "D12", x: 255, y: 98, type: "digital" },
      { id: "D11", label: "D11~", x: 255, y: 124, type: "digital" },
      { id: "D10", label: "D10~", x: 255, y: 150, type: "digital" },
      { id: "D9",  label: "D9~",  x: 255, y: 176, type: "digital" },
      { id: "D8",  label: "D8",   x: 255, y: 202, type: "digital" },
      { id: "D7",  label: "D7",   x: 255, y: 228, type: "digital" },
      { id: "D4",  label: "D4",   x: 255, y: 254, type: "digital" },
      { id: "D2",  label: "D2",   x: 255, y: 280, type: "digital" },
      { id: "5V",  label: "5V",   x: 255, y: 312, type: "power" },
      { id: "GND1", label: "GND", x: 255, y: 340, type: "gnd" },
      { id: "GND2", label: "GND", x: 255, y: 366, type: "gnd" },
      { id: "A0",  label: "A0",   x: 255, y: 394, type: "analog" },
      { id: "A1",  label: "A1",   x: 255, y: 418, type: "analog" },
      { id: "A2",  label: "A2",   x: 185, y: 418, type: "analog" },
      { id: "A4",  label: "A4/SDA", x: 115, y: 418, type: "analog" }
    ];
  }

  getComponentPins(comp) {
    // Возвращает список пинов компонента с абсолютными координатами на холсте 860x470
    const cx = comp.x;
    const cy = comp.y;
    switch (comp.type) {
      case "resistor":
        return [
          { id: "t1", label: "T1", x: cx + 10, y: cy + 36 },
          { id: "t2", label: "T2", x: cx + 126, y: cy + 36 }
        ];
      case "led":
        return [
          { id: "anode", label: "+ Анод", x: cx + 28, y: cy + 98 },
          { id: "cathode", label: "- Катод", x: cx + 76, y: cy + 98 }
        ];
      case "button":
        return [
          { id: "out", label: "OUT", x: cx + 25, y: cy + 92 },
          { id: "gnd", label: "GND", x: cx + 85, y: cy + 92 }
        ];
      case "ldr":
        return [
          { id: "out", label: "AO", x: cx + 30, y: cy + 112 },
          { id: "gnd", label: "GND", x: cx + 105, y: cy + 112 }
        ];
      case "temp_sensor":
        return [
          { id: "out", label: "OUT", x: cx + 30, y: cy + 112 },
          { id: "gnd", label: "GND", x: cx + 105, y: cy + 112 }
        ];
      case "ultrasonic":
        return [
          { id: "out", label: "ECHO", x: cx + 35, y: cy + 116 },
          { id: "gnd", label: "GND", x: cx + 115, y: cy + 116 }
        ];
      case "soil_sensor":
        return [
          { id: "out", label: "AO", x: cx + 35, y: cy + 116 },
          { id: "gnd", label: "GND", x: cx + 115, y: cy + 116 }
        ];
      case "servo":
        return [
          { id: "pwm", label: "PWM", x: cx + 30, y: cy + 114 },
          { id: "gnd", label: "GND", x: cx + 105, y: cy + 114 }
        ];
      case "pump":
        return [
          { id: "in", label: "IN+", x: cx + 30, y: cy + 110 },
          { id: "gnd", label: "GND", x: cx + 105, y: cy + 110 }
        ];
      case "lcd":
        return [
          { id: "sda", label: "SDA", x: cx + 38, y: cy + 108 },
          { id: "gnd", label: "GND", x: cx + 142, y: cy + 108 }
        ];
      default:
        return [];
    }
  }

  getPinCoords(fullPinId) {
    // fullPinId формата "mcu:D13" или "comp_led1:anode"
    const [ownerId, pinId] = fullPinId.split(":");
    if (ownerId === "mcu") {
      const p = this.getMcuPins().find(pin => pin.id === pinId);
      return p ? { x: p.x, y: p.y, label: p.label } : null;
    }
    const comp = this.components.find(c => c.id === ownerId);
    if (!comp) return null;
    const p = this.getComponentPins(comp).find(pin => pin.id === pinId);
    return p ? { x: p.x, y: p.y, label: p.label } : null;
  }

  loadProject(project) {
    this.boardType = project.board || "Arduino Uno";
    this.components = JSON.parse(JSON.stringify(project.initialComponents || []));
    this.targetWires = JSON.parse(JSON.stringify(project.targetWires || []));
    // По умолчанию загружаем собранную эталонную схему или пустую?
    // Загрузим эталонные провода сразу, чтобы ученик мог либо сразу запустить и увидеть как работает,
    // либо пересобрать/сломать/добавить провода!
    this.wires = JSON.parse(JSON.stringify(project.targetWires || []));
    this.activePin = null;
    this.resetSimulationVisuals();
    this.render();
    if (this.callbacks.onCircuitChange) this.callbacks.onCircuitChange();
  }

  clearWires() {
    this.wires = [];
    this.activePin = null;
    this.resetSimulationVisuals();
    this.render();
    if (this.callbacks.onCircuitChange) this.callbacks.onCircuitChange();
  }

  autoWireTarget() {
    this.wires = JSON.parse(JSON.stringify(this.targetWires || []));
    this.activePin = null;
    this.resetSimulationVisuals();
    this.render();
    if (this.callbacks.onCircuitChange) this.callbacks.onCircuitChange();
  }

  loadBrokenScenario(broken) {
    if (!broken) return;
    this.wires = JSON.parse(JSON.stringify(broken.wires || []));
    this.activePin = null;
    this.resetSimulationVisuals();
    this.render();
    if (this.callbacks.onCircuitChange) this.callbacks.onCircuitChange();
  }

  addComponent(type) {
    const id = "comp_" + type + "_" + Math.floor(Math.random() * 9000 + 1000);
    const x = 420 + Math.floor(Math.random() * 140);
    const y = 140 + Math.floor(Math.random() * 140);
    const defaultProps = {
      resistor: { resistance: 220, label: "R" },
      led: { color: "red", label: "LED" },
      button: { pressed: false, label: "BTN" },
      ldr: { light: 70, label: "LDR" },
      temp_sensor: { temp: 25, label: "TEMP" },
      ultrasonic: { distance: 80, label: "HC-SR04" },
      soil_sensor: { moisture: 60, label: "SOIL" },
      servo: { angle: 0, label: "SERVO" },
      pump: { active: false, label: "PUMP" },
      lcd: { line1: "STEM Lab Ready", line2: "Waiting...", label: "LCD" }
    };
    this.components.push({
      id,
      type,
      x,
      y,
      props: Object.assign({}, defaultProps[type] || {})
    });
    this.render();
    if (this.callbacks.onCircuitChange) this.callbacks.onCircuitChange();
  }

  resetSimulationVisuals() {
    this.mcuPinStates = {};
    this.components.forEach(c => {
      c.runtime = {
        lit: false,
        burned: false,
        brightness: 1
      };
      if (c.type === "servo") c.props.angle = 0;
      if (c.type === "pump") c.props.active = false;
    });
  }

  bindEvents() {
    // Преобразование координат мыши к системе 860x470
    const getLogicalCoords = (e) => {
      const rect = this.workbench.getBoundingClientRect();
      const scaleX = 860 / rect.width;
      const scaleY = 470 / rect.height;
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY
      };
    };

    this.workbench.addEventListener("mousemove", (e) => {
      const pos = getLogicalCoords(e);
      this.mousePos = pos;

      if (this.draggingComp) {
        this.draggingComp.x = Math.max(290, Math.min(710, pos.x - this.dragOffset.x));
        this.draggingComp.y = Math.max(20, Math.min(345, pos.y - this.dragOffset.y));
        this.render();
        return;
      }

      if (this.activePin) {
        this.renderActiveWire();
      }
    });

    window.addEventListener("mouseup", () => {
      if (this.draggingComp) {
        this.draggingComp = null;
        if (this.callbacks.onCircuitChange) this.callbacks.onCircuitChange();
      }
    });

    // Отмена протяжки провода по клику на пустое место или по клавише Esc
    this.workbench.addEventListener("click", (e) => {
      if (e.target === this.workbench || e.target === this.wiresSvg || e.target.tagName === "rect") {
        if (this.activePin) {
          this.activePin = null;
          this.activeWireLayer.innerHTML = "";
          this.render();
        }
      }
    });

    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this.activePin) {
        this.activePin = null;
        this.activeWireLayer.innerHTML = "";
        this.render();
      }
    });
  }

  handlePinClick(fullPinId, e) {
    e.stopPropagation();
    if (!this.activePin) {
      const coords = this.getPinCoords(fullPinId);
      if (!coords) return;
      this.activePin = { fullPinId, x: coords.x, y: coords.y };
      this.render();
      this.renderActiveWire();
    } else {
      if (this.activePin.fullPinId === fullPinId) {
        this.activePin = null;
        this.activeWireLayer.innerHTML = "";
        this.render();
        return;
      }
      // Проверяем, нет ли уже такого провода
      const exists = this.wires.some(
        w => (w.from === this.activePin.fullPinId && w.to === fullPinId) ||
             (w.from === fullPinId && w.to === this.activePin.fullPinId)
      );
      if (!exists) {
        // Автоматический выбор цвета провода: синий для GND, красный для 5V, иначе выбранный цвет
        let wireColor = this.selectedWireColor;
        if (fullPinId.includes("GND") || this.activePin.fullPinId.includes("GND") || fullPinId.includes(":gnd") || this.activePin.fullPinId.includes(":gnd")) {
          wireColor = "#3b82f6";
        } else if (fullPinId.includes("5V") || this.activePin.fullPinId.includes("5V")) {
          wireColor = "#ef4444";
        }
        this.wires.push({
          from: this.activePin.fullPinId,
          to: fullPinId,
          color: wireColor
        });
      }
      this.activePin = null;
      this.activeWireLayer.innerHTML = "";
      this.render();
      if (this.callbacks.onCircuitChange) this.callbacks.onCircuitChange();
    }
  }

  removeWire(index) {
    this.wires.splice(index, 1);
    this.render();
    if (this.callbacks.onCircuitChange) this.callbacks.onCircuitChange();
  }

  buildBezierPath(x1, y1, x2, y2) {
    const dx = Math.abs(x2 - x1) * 0.45 + 25;
    const dy = (y2 - y1) * 0.15;
    return `M ${x1} ${y1} C ${x1 + dx} ${y1 + dy}, ${x2 - dx} ${y2 - dy}, ${x2} ${y2}`;
  }

  renderActiveWire() {
    if (!this.activePin) {
      this.activeWireLayer.innerHTML = "";
      return;
    }
    const d = this.buildBezierPath(this.activePin.x, this.activePin.y, this.mousePos.x, this.mousePos.y);
    this.activeWireLayer.innerHTML = `
      <path d="${d}" fill="none" stroke="${this.selectedWireColor}" stroke-width="4" stroke-dasharray="6,4" stroke-linecap="round" />
      <circle cx="${this.mousePos.x}" cy="${this.mousePos.y}" r="5" fill="${this.selectedWireColor}" />
    `;
  }

  renderWires() {
    // 1. Отрисовка подсказок (если включены)
    if (this.showHints && this.targetWires.length > 0) {
      this.hintWiresLayer.innerHTML = this.targetWires.map(tw => {
        const p1 = this.getPinCoords(tw.from);
        const p2 = this.getPinCoords(tw.to);
        if (!p1 || !p2) return "";
        const d = this.buildBezierPath(p1.x, p1.y, p2.x, p2.y);
        return `<path d="${d}" fill="none" stroke="${tw.color || '#94a3b8'}" stroke-width="3" stroke-dasharray="5,6" opacity="0.45" />`;
      }).join("");
    } else {
      this.hintWiresLayer.innerHTML = "";
    }

    // 2. Отрисовка реальных проводов ученика
    this.wiresLayer.innerHTML = this.wires.map((w, idx) => {
      const p1 = this.getPinCoords(w.from);
      const p2 = this.getPinCoords(w.to);
      if (!p1 || !p2) return "";
      const d = this.buildBezierPath(p1.x, p1.y, p2.x, p2.y);
      return `
        <g class="wire-group" data-wire-index="${idx}">
          <path d="${d}" fill="none" stroke="transparent" stroke-width="14" class="wire-hit" />
          <path d="${d}" fill="none" stroke="rgba(15,23,42,0.55)" stroke-width="6.5" stroke-linecap="round" />
          <path d="${d}" fill="none" stroke="${w.color || '#ef4444'}" stroke-width="4" stroke-linecap="round" class="wire-Main" />
          <circle cx="${p1.x}" cy="${p1.y}" r="4.5" fill="${w.color || '#ef4444'}" />
          <circle cx="${p2.x}" cy="${p2.y}" r="4.5" fill="${w.color || '#ef4444'}" />
        </g>
      `;
    }).join("");

    this.wiresLayer.querySelectorAll(".wire-group").forEach(g => {
      g.addEventListener("click", (e) => {
        e.stopPropagation();
        const idx = parseInt(g.getAttribute("data-wire-index"), 10);
        this.removeWire(idx);
      });
    });
  }

  renderMcuBoard() {
    const isEsp = this.boardType.toLowerCase().includes("esp");
    const mcuPins = this.getMcuPins();
    const d13Active = !!this.mcuPinStates["D13"];

    const pinsHtml = mcuPins.map(p => {
      const fullId = `mcu:${p.id}`;
      const isSelected = this.activePin && this.activePin.fullPinId === fullId;
      const isPinHigh = !!this.mcuPinStates[p.id];
      return `
        <button class="pin-node mcu-pin pin-${p.type} ${isSelected ? 'pin-selected' : ''} ${isPinHigh ? 'pin-active-signal' : ''}"
                style="left: ${p.x}px; top: ${p.y}px;"
                data-pin-id="${fullId}"
                title="Пин ${p.label} (Нажми для подключения провода)">
          <span class="pin-label">${p.label}</span>
          <span class="pin-hole"></span>
        </button>
      `;
    }).join("");

    return `
      <div class="mcu-board ${isEsp ? 'mcu-esp32' : 'mcu-arduino'}">
        <div class="mcu-header">
          <span class="mcu-chip-badge">${isEsp ? 'ESP32 Wi-Fi IoT' : 'ARDUINO UNO R3'}</span>
          <span class="mcu-power-led ${this.isRunning ? 'power-on' : ''}" title="Индикатор питания ON">ON</span>
        </div>
        <div class="mcu-body-art">
          <div class="usb-port">USB</div>
          <div class="mcu-main-ic">
            <span>${isEsp ? 'ESP-WROOM-32' : 'ATmega328P'}</span>
            <small>${isEsp ? '240MHz Dual Core' : '16MHz MCU'}</small>
          </div>
          <div class="mcu-status-row">
            <div class="BuiltIn-led ${d13Active ? 'led-builtin-on' : ''}">
              <span class="led-dot"></span> L (D13)
            </div>
            <div class="BuiltIn-led ${this.isRunning ? 'led-tx-on' : ''}">
              <span class="led-dot"></span> TX/RX
            </div>
          </div>
          <div class="mcu-hint-footer">
            Кликни по пину, чтобы провести провод
          </div>
        </div>
      </div>
      ${pinsHtml}
    `;
  }

  getResistorBands(ohms) {
    if (ohms <= 100) return ["#92400e", "#0f172a", "#92400e", "#eab308"]; // 100 Ohm
    if (ohms <= 220) return ["#ef4444", "#ef4444", "#92400e", "#eab308"]; // 220 Ohm
    if (ohms <= 1000) return ["#92400e", "#0f172a", "#ef4444", "#eab308"]; // 1 kOhm
    return ["#92400e", "#0f172a", "#f97316", "#eab308"]; // 10 kOhm
  }

  renderComponentItem(comp) {
    const pins = this.getComponentPins(comp);
    const runtime = comp.runtime || {};
    let innerHtml = "";

    if (comp.type === "resistor") {
      const ohms = comp.props.resistance || 220;
      const bands = this.getResistorBands(ohms);
      const labelText = ohms >= 1000 ? (ohms / 1000) + " кОм" : ohms + " Ом";
      innerHtml = `
        <div class="comp-card comp-resistor" style="left:${comp.x}px; top:${comp.y}px;" data-comp-id="${comp.id}">
          <div class="comp-drag-handle">
            <span class="comp-title">${comp.props.label || 'R'} · ${labelText}</span>
            <button class="comp-Config-btn" data-action="cycle-ohms" title="Изменить сопротивление (100 Ом / 220 Ом / 1 кОм)">⚙️</button>
          </div>
          <div class="resistor-visual">
            <div class="resistor-lead"></div>
            <div class="resistor-body">
              <span class="r-band" style="background:${bands[0]}"></span>
              <span class="r-band" style="background:${bands[1]}"></span>
              <span class="r-band" style="background:${bands[2]}"></span>
              <span class="r-band" style="background:${bands[3]}"></span>
            </div>
            <div class="resistor-lead"></div>
          </div>
        </div>
      `;
    } else if (comp.type === "led") {
      const color = comp.props.color || "red";
      const isLit = !!runtime.lit && !runtime.burned;
      const isBurned = !!runtime.burned;
      innerHtml = `
        <div class="comp-card comp-led" style="left:${comp.x}px; top:${comp.y}px;" data-comp-id="${comp.id}">
          <div class="comp-drag-handle">
            <span class="comp-title">${comp.props.label || 'LED'}</span>
            <button class="comp-Config-btn" data-action="cycle-color" title="Сменить цвет светодиода">🎨</button>
          </div>
          <div class="led-visual-wrap">
            <div class="led-bulb led-${color} ${isLit ? 'led-glow-on' : ''} ${isBurned ? 'led-burned' : ''}"
                 style="--led-alpha: ${runtime.brightness || 1}">
              ${isBurned ? '<span class="burned-icon" title="Светодиод перегорел без резистора!">💥</span>' : ''}
            </div>
            <div class="led-legs">
              <span class="leg leg-anode">+</span>
              <span class="leg leg-cathode">–</span>
            </div>
          </div>
        </div>
      `;
    } else if (comp.type === "button") {
      const pressed = !!comp.props.pressed;
      innerHtml = `
        <div class="comp-card comp-button" style="left:${comp.x}px; top:${comp.y}px;" data-comp-id="${comp.id}">
          <div class="comp-drag-handle">
            <span class="comp-title">${comp.props.label || 'BTN'} (Кнопка)</span>
          </div>
          <div class="button-visual-wrap">
            <button class="tactile-btn ${pressed ? 'btn-pressed' : ''}" data-action="toggle-btn">
              <span class="btn-cap"></span>
              <span class="btn-status-text">${pressed ? 'НАЖАТА (HIGH)' : 'НАЖМИ МЕНЯ'}</span>
            </button>
          </div>
        </div>
      `;
    } else if (comp.type === "ldr") {
      const light = comp.props.light ?? 75;
      innerHtml = `
        <div class="comp-card comp-sensor" style="left:${comp.x}px; top:${comp.y}px;" data-comp-id="${comp.id}">
          <div class="comp-drag-handle">
            <span class="comp-title">☀️ Фоторезистор ${comp.props.label || 'LDR'}</span>
          </div>
          <div class="sensor-control-body">
            <div class="sensor-value-badge">Свет: <strong>${light}%</strong> (${Math.round(light * 10.23)} ADC)</div>
            <input type="range" min="0" max="100" value="${light}" class="sensor-slider" data-slider="light" />
            <div class="slider-labels"><span>🌙 Ночь</span><span>☀️ День</span></div>
          </div>
        </div>
      `;
    } else if (comp.type === "temp_sensor") {
      const temp = comp.props.temp ?? 24;
      innerHtml = `
        <div class="comp-card comp-sensor" style="left:${comp.x}px; top:${comp.y}px;" data-comp-id="${comp.id}">
          <div class="comp-drag-handle">
            <span class="comp-title">🌡️ Температура ${comp.props.label || 'TEMP'}</span>
          </div>
          <div class="sensor-control-body">
            <div class="sensor-value-badge ${temp > 30 ? 'badge-hot' : ''}">Темп: <strong>${temp} °C</strong></div>
            <input type="range" min="-10" max="60" value="${temp}" class="sensor-slider" data-slider="temp" />
            <div class="slider-labels"><span>❄️ -10°C</span><span>🔥 +60°C</span></div>
          </div>
        </div>
      `;
    } else if (comp.type === "ultrasonic") {
      const dist = comp.props.distance ?? 100;
      innerHtml = `
        <div class="comp-card comp-sensor" style="left:${comp.x}px; top:${comp.y}px;" data-comp-id="${comp.id}">
          <div class="comp-drag-handle">
            <span class="comp-title">📡 Радар ${comp.props.label || 'HC-SR04'}</span>
          </div>
          <div class="sensor-control-body">
            <div class="sensor-value-badge">Дистанция: <strong>${dist} см</strong></div>
            <input type="range" min="5" max="200" value="${dist}" class="sensor-slider" data-slider="distance" />
            <div class="slider-labels"><span>🚗 5 см</span><span>200 см</span></div>
          </div>
        </div>
      `;
    } else if (comp.type === "soil_sensor") {
      const moisture = comp.props.moisture ?? 65;
      innerHtml = `
        <div class="comp-card comp-sensor" style="left:${comp.x}px; top:${comp.y}px;" data-comp-id="${comp.id}">
          <div class="comp-drag-handle">
            <span class="comp-title">🌱 Почва ${comp.props.label || 'SOIL'}</span>
          </div>
          <div class="sensor-control-body">
            <div class="sensor-value-badge ${moisture < 35 ? 'badge-hot' : ''}">Влажность: <strong>${moisture}%</strong></div>
            <input type="range" min="0" max="100" value="${moisture}" class="sensor-slider" data-slider="moisture" />
            <div class="slider-labels"><span>🏜️ Сухо</span><span>💧 Влажно</span></div>
          </div>
        </div>
      `;
    } else if (comp.type === "servo") {
      const angle = comp.props.angle || 0;
      innerHtml = `
        <div class="comp-card comp-servo" style="left:${comp.x}px; top:${comp.y}px;" data-comp-id="${comp.id}">
          <div class="comp-drag-handle">
            <span class="comp-title">⚙️ Серво ${comp.props.label || 'SG90'} (${angle}°)</span>
          </div>
          <div class="servo-visual-body">
            <div class="servo-casing">
              <div class="servo-horn" style="transform: rotate(${angle - 45}deg);">
                <span class="horn-arm"></span>
              </div>
              <div class="servo-pivot"></div>
            </div>
          </div>
        </div>
      `;
    } else if (comp.type === "pump") {
      const active = !!comp.props.active;
      innerHtml = `
        <div class="comp-card comp-pump ${active ? 'pump-running' : ''}" style="left:${comp.x}px; top:${comp.y}px;" data-comp-id="${comp.id}">
          <div class="comp-drag-handle">
            <span class="comp-title">💧 Насос ${comp.props.label || 'PUMP'}</span>
          </div>
          <div class="pump-visual-body">
            <div class="pump-impeller ${active ? 'spin-active' : ''}">⚙️</div>
            <div class="pump-status">${active ? 'ПОЛИВ ВКЛЮЧЕН 💦' : 'ОЖИДАНИЕ'}</div>
          </div>
        </div>
      `;
    } else if (comp.type === "lcd") {
      const line1 = comp.props.line1 || "STEM Lab Ready";
      const line2 = comp.props.line2 || "";
      innerHtml = `
        <div class="comp-card comp-lcd" style="left:${comp.x}px; top:${comp.y}px;" data-comp-id="${comp.id}">
          <div class="comp-drag-handle">
            <span class="comp-title">📟 Дисплей ${comp.props.label || 'LCD 16x2'}</span>
          </div>
          <div class="lcd-screen ${this.isRunning ? 'lcd-backlight-on' : ''}">
            <div class="lcd-line">${line1}</div>
            <div class="lcd-line">${line2}</div>
          </div>
        </div>
      `;
    }

    const pinsHtml = pins.map(p => {
      const fullId = `${comp.id}:${p.id}`;
      const isSelected = this.activePin && this.activePin.fullPinId === fullId;
      return `
        <button class="pin-node comp-pin ${isSelected ? 'pin-selected' : ''}"
                style="left: ${p.x}px; top: ${p.y}px;"
                data-pin-id="${fullId}"
                title="${comp.props.label || comp.type}: ${p.label}">
          <span class="pin-hole"></span>
          <span class="pin-sublabel">${p.label}</span>
        </button>
      `;
    }).join("");

    return innerHtml + pinsHtml;
  }

  render() {
    const mcuHtml = this.renderMcuBoard();
    const compsHtml = this.components.map(c => this.renderComponentItem(c)).join("");
    this.componentsLayer.innerHTML = mcuHtml + compsHtml;
    this.renderWires();
    this.attachComponentListeners();
  }

  attachComponentListeners() {
    // Клики по пинам
    this.componentsLayer.querySelectorAll(".pin-node").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const pinId = btn.getAttribute("data-pin-id");
        this.handlePinClick(pinId, e);
      });
    });

    // Перетаскивание компонентов за заголовок
    this.componentsLayer.querySelectorAll(".comp-card").forEach(card => {
      const compId = card.getAttribute("data-comp-id");
      const comp = this.components.find(c => c.id === compId);
      if (!comp) return;

      const handle = card.querySelector(".comp-drag-handle");
      if (handle) {
        handle.addEventListener("mousedown", (e) => {
          if (e.target.tagName === "BUTTON") return;
          const rect = this.workbench.getBoundingClientRect();
          const scaleX = 860 / rect.width;
          const scaleY = 470 / rect.height;
          const mouseX = (e.clientX - rect.left) * scaleX;
          const mouseY = (e.clientY - rect.top) * scaleY;
          this.draggingComp = comp;
          this.dragOffset = { x: mouseX - comp.x, y: mouseY - comp.y };
        });
      }

      // Кнопки настройки компонента (смена номинала резистора, цвета светодиода, нажатие кнопки)
      card.querySelectorAll("[data-action]").forEach(actBtn => {
        actBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          const action = actBtn.getAttribute("data-action");
          if (action === "cycle-ohms") {
            const order = [100, 220, 1000, 10000];
            const idx = order.indexOf(comp.props.resistance || 220);
            comp.props.resistance = order[(idx + 1) % order.length];
            this.render();
            if (this.callbacks.onCircuitChange) this.callbacks.onCircuitChange();
          } else if (action === "cycle-color") {
            const colors = ["red", "green", "yellow", "blue"];
            const idx = colors.indexOf(comp.props.color || "red");
            comp.props.color = colors[(idx + 1) % colors.length];
            this.render();
          } else if (action === "toggle-btn") {
            comp.props.pressed = !comp.props.pressed;
            this.render();
            if (this.callbacks.onSensorChange) this.callbacks.onSensorChange(comp);
          }
        });
      });

      // Ползунки датчиков (освещённость, температура, расстояние, влажность)
      card.querySelectorAll(".sensor-slider").forEach(slider => {
        slider.addEventListener("input", (e) => {
          e.stopPropagation();
          const propName = slider.getAttribute("data-slider");
          comp.props[propName] = parseInt(slider.value, 10);
          // Обновляем бейдж без полной перерисовки DOM, чтобы ползунок двигался плавно
          const badge = card.querySelector(".sensor-value-badge");
          if (badge) {
            if (propName === "light") {
              badge.innerHTML = `Свет: <strong>${comp.props.light}%</strong> (${Math.round(comp.props.light * 10.23)} ADC)`;
            } else if (propName === "temp") {
              badge.innerHTML = `Темп: <strong>${comp.props.temp} °C</strong>`;
              badge.classList.toggle("badge-hot", comp.props.temp > 30);
            } else if (propName === "distance") {
              badge.innerHTML = `Дистанция: <strong>${comp.props.distance} см</strong>`;
            } else if (propName === "moisture") {
              badge.innerHTML = `Влажность: <strong>${comp.props.moisture}%</strong>`;
              badge.classList.toggle("badge-hot", comp.props.moisture < 35);
            }
          }
          if (this.callbacks.onSensorChange) this.callbacks.onSensorChange(comp);
        });
      });
    });
  }

  // ==================== ЭЛЕКТРИЧЕСКИЙ АНАЛИЗАТОР СХЕМЫ ====================
  // Строит граф соединений и проверяет правильность электрических цепей
  analyzeCircuit() {
    const adj = {};
    const addEdge = (a, b) => {
      if (!adj[a]) adj[a] = [];
      if (!adj[b]) adj[b] = [];
      adj[a].push(b);
      adj[b].push(a);
    };

    this.wires.forEach(w => addEdge(w.from, w.to));

    // Резисторы пропускают ток между выводами t1 и t2
    this.components.filter(c => c.type === "resistor").forEach(r => {
      addEdge(`${r.id}:t1`, `${r.id}:t2`);
    });

    const isConnectedToGnd = (startPin) => {
      const visited = new Set();
      const queue = [startPin];
      while (queue.length > 0) {
        const curr = queue.shift();
        if (curr === "mcu:GND1" || curr === "mcu:GND2") return true;
        visited.add(curr);
        (adj[curr] || []).forEach(next => {
          // Не проходим сквозь другие компоненты кроме резисторов
          if (!visited.has(next)) {
            queue.push(next);
          }
        });
      }
      return false;
    };

    const traceToMcuSignal = (startPin) => {
      // Ищет, к какому пину MCU подключён вывод (и проходит ли путь через резистор)
      const visited = new Set();
      const queue = [{ pin: startPin, resistorOhms: null }];
      while (queue.length > 0) {
        const { pin, resistorOhms } = queue.shift();
        if (pin.startsWith("mcu:") && !pin.includes("GND")) {
          return { mcuPin: pin.split(":")[1], hasResistor: resistorOhms !== null, resistorOhms };
        }
        visited.add(pin);
        for (const next of (adj[pin] || [])) {
          if (!visited.has(next)) {
            let nextOhms = resistorOhms;
            if (next.startsWith("comp_") && (next.endsWith(":t1") || next.endsWith(":t2"))) {
              const rId = next.split(":")[0];
              const rComp = this.components.find(c => c.id === rId);
              if (rComp && rComp.type === "resistor") {
                nextOhms = rComp.props.resistance || 220;
              }
            }
            queue.push({ pin: next, resistorOhms: nextOhms });
          }
        }
      }
      return null;
    };

    const diagnostics = [];
    const ledBindings = []; // [{ comp, mcuPin, hasResistor, resistorOhms }]
    const sensorBindings = {}; // { D2: comp, A0: comp, ... }
    const pinUsageCount = {};

    // 1. Проверяем каждый светодиод
    this.components.filter(c => c.type === "led").forEach(led => {
      const anodeSignal = traceToMcuSignal(`${led.id}:anode`);
      const cathodeGnd = isConnectedToGnd(`${led.id}:cathode`);
      const cathodeSignal = traceToMcuSignal(`${led.id}:cathode`);
      const anodeGnd = isConnectedToGnd(`${led.id}:anode`);

      if (!anodeSignal && !cathodeGnd && !cathodeSignal && !anodeGnd) {
        diagnostics.push({
          severity: "error",
          title: `Светодиод ${led.props.label} не подключён`,
          explanation: `Подключи длинную ножку (+ Анод) через резистор к цифровому пину Arduino, а короткую ножку (– Катод) — к пину земли GND.`
        });
      } else if (cathodeSignal && anodeGnd) {
        diagnostics.push({
          severity: "error",
          title: `Перепутана полярность светодиода ${led.props.label}!`,
          explanation: `Светодиод пропускает ток только в одну сторону! Сейчас плюс подан на Катод (–), а Анод (+) уходит в GND. Поменяй провода местами.`
        });
      } else if (anodeSignal && !cathodeGnd) {
        diagnostics.push({
          severity: "error",
          title: `Разомкнута цепь у светодиода ${led.props.label} (нет GND)`,
          explanation: `Плюс на светодиод подан с пина ${anodeSignal.mcuPin}, но второй вывод (– Катод) не соединён с землёй GND. Электрический ток может течь только по замкнутому контуру!`
        });
      } else if (!anodeSignal && cathodeGnd) {
        diagnostics.push({
          severity: "error",
          title: `Нет управляющего сигнала на светодиоде ${led.props.label}`,
          explanation: `Катод (–) подключён к GND, но Анод (+) не соединён ни с одним пином Arduino.`
        });
      } else if (anodeSignal && cathodeGnd) {
        if (!anodeSignal.hasResistor) {
          diagnostics.push({
            severity: "danger",
            title: `ОПАСНОСТЬ: Светодиод ${led.props.label} подключён БЕЗ резистора!`,
            explanation: `Пин ${anodeSignal.mcuPin} выдаёт 5 Вольт. Без токоограничивающего резистора (220 Ом) ток превышает 40 мА, и светодиод перегорает! Пропусти провод через резистор.`
          });
        }
        ledBindings.push({
          comp: led,
          mcuPin: anodeSignal.mcuPin,
          hasResistor: anodeSignal.hasResistor,
          resistorOhms: anodeSignal.resistorOhms || 0
        });
      }
    });

    // 2. Проверяем датчики и исполнительные модули
    this.components.filter(c => c.type !== "led" && c.type !== "resistor").forEach(comp => {
      const pins = this.getComponentPins(comp);
      const sigPinDef = pins.find(p => p.id !== "gnd");
      const gndPinDef = pins.find(p => p.id === "gnd");

      const sigTrace = sigPinDef ? traceToMcuSignal(`${comp.id}:${sigPinDef.id}`) : null;
      const gndOk = gndPinDef ? isConnectedToGnd(`${comp.id}:${gndPinDef.id}`) : true;

      if (!sigTrace) {
        diagnostics.push({
          severity: "error",
          title: `Модуль ${comp.props.label || comp.type} не подключён к пину Arduino`,
          explanation: `Соедини сигнальный вывод (${sigPinDef ? sigPinDef.label : 'OUT'}) модуля с нужным пином микроконтроллера.`
        });
      } else if (!gndOk) {
        diagnostics.push({
          severity: "error",
          title: `У модуля ${comp.props.label || comp.type} не подключён провод земли GND`,
          explanation: `Любому датчику, экрану или мотору необходим общий провод GND для работы.`
        });
      } else {
        // Проверка: аналоговый датчик подключён к цифровому пину
        if ((comp.type === "ldr" || comp.type === "temp_sensor" || comp.type === "soil_sensor") && !sigTrace.mcuPin.startsWith("A")) {
          diagnostics.push({
            severity: "warning",
            title: `Аналоговый датчик ${comp.props.label} подключён к цифровому пину ${sigTrace.mcuPin}`,
            explanation: `Этот датчик выдаёт плавный аналоговый сигнал. Подключи его к аналоговому входу (A0, A1 или A2), чтобы функция analogRead() работала корректно!`
          });
        }
        pinUsageCount[sigTrace.mcuPin] = (pinUsageCount[sigTrace.mcuPin] || 0) + 1;
        if (pinUsageCount[sigTrace.mcuPin] > 1) {
          diagnostics.push({
            severity: "error",
            title: `Конфликт пина ${sigTrace.mcuPin}!`,
            explanation: `К пину ${sigTrace.mcuPin} подключено сразу несколько сигнальных линий. Разнеси датчики по разным пинам микроконтроллера.`
          });
        }
        sensorBindings[sigTrace.mcuPin] = comp;
      }
    });

    return {
      diagnostics,
      ledBindings,
      sensorBindings,
      isCircuitValid: diagnostics.filter(d => d.severity === "error" || d.severity === "danger").length === 0 && this.wires.length > 0
    };
  }
}

window.CircuitEngine = CircuitEngine;
