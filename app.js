const crops = {
  carrot: { name: "Carrot", icon: "Carrot", seed: 5, sell: 12, days: 0.5, color: "#e67b31", unlock: 0 },
  strawberry: { name: "Berry", icon: "Berry", seed: 12, sell: 28, days: 0.75, color: "#d94b58", unlock: 0 },
  corn: { name: "Corn", icon: "Corn", seed: 18, sell: 46, days: 0.75, color: "#e7c744", unlock: 1 },
  pumpkin: { name: "Pumpkin", icon: "Pumpkin", seed: 28, sell: 78, days: 2, color: "#d96c25", unlock: 3 },
};

const weatherTable = [
  { name: "Clear", energy: 17, growBoost: 0, water: false },
  { name: "Rain", energy: 18, growBoost: 1, water: true },
  { name: "Breezy", energy: 20, growBoost: 0, water: false },
  { name: "Golden Sun", energy: 17, growBoost: 1, water: false },
];

const quests = [
  { title: "First Harvest", text: "Harvest 2 crops to earn 25 coins.", type: "harvest", target: 2, reward: 25 },
  { title: "Market Helper", text: "Complete 1 order to unlock corn.", type: "orders", target: 1, reward: 35 },
  { title: "Patch Builder", text: "Own 6 plots to earn 50 coins.", type: "plots", target: 6, reward: 50 },
  { title: "Berry Basket", text: "Harvest 8 berries to earn 80 coins.", type: "strawberry", target: 8, reward: 80 },
  { title: "Cozy Farm", text: "Reach 10 reputation for a 120 coin bonus.", type: "reputation", target: 10, reward: 120 },
];

const maxEnergy = 20;
const workEnergyCost = 0.5;
const maxVehicleLevel = 3;
const maxPlots = 24;
const saveKey = "pocket-patch-farm-public-test-1";
const oldSaveKeys = ["pocket-patch-farm"];

const garageUpgrades = {
  tractor: { name: "Tractor", perk: "Lower planting and watering energy cost" },
  harvester: { name: "Harvester", perk: "Bigger harvest coin payouts" },
  truck: { name: "Grain Truck", perk: "Bigger order delivery payouts" },
};

const automationUnlocks = { tractor: 2, harvester: 3, truck: 4 };
const maxHouseLevel = 4;
const lifestyleItems = {
  garden: { name: "Kitchen Garden", cost: 65, className: "has-garden" },
  porch: { name: "Porch Lights", cost: 80, className: "has-porch" },
  mailbox: { name: "Painted Mailbox", cost: 55, className: "has-mailbox" },
  patio: { name: "Stone Patio", cost: 120, className: "has-patio" },
};

const defaultState = {
  day: 1,
  time: 7,
  level: 1,
  xp: 0,
  coins: 45,
  energy: maxEnergy,
  storageLimit: 8,
  reputation: 0,
  plotCount: 4,
  scarecrow: false,
  sound: true,
  weather: weatherTable[0],
  plots: Array.from({ length: maxPlots }, (_, id) => ({ id, crop: null, plantedDay: 0, watered: false, ready: false })),
  inventory: { carrot: 0, strawberry: 0, corn: 0, pumpkin: 0 },
  fieldLoad: { carrot: 0, strawberry: 0, corn: 0, pumpkin: 0 },
  stats: { harvest: 0, orders: 0, carrot: 0, strawberry: 0, corn: 0, pumpkin: 0 },
  dailyStats: { harvest: 0, orders: 0, coins: 0 },
  dailyGoals: [],
  questIndex: 0,
  orders: [],
  vehicle: { type: "tractor", position: 0, seed: "carrot" },
  upgrades: { tractor: 1, harvester: 1, truck: 1 },
  automation: { tractor: false, harvester: false, truck: false },
  sellMode: "orders",
  houseLevel: 1,
  lifestyle: {},
};

let state = loadState();
let selectedPlot = null;
let toastTimer = null;
let automationTimer = null;

const $ = (id) => document.getElementById(id);
const plotGrid = $("plotGrid");
const ordersEl = $("orders");
const dailyGoalsEl = $("dailyGoals");
const shopEl = $("shop");
const barnEl = $("barn");
const garageEl = $("garage");
const homeShopEl = $("homeShop");
const deliveryTruck = $("deliveryTruck");
const homesteadEl = $("homestead");
const farmhouseVisual = $("farmhouseVisual");
const modal = $("plotModal");
const modalTitle = $("modalTitle");
const modalText = $("modalText");
const modalActions = $("modalActions");

function loadState() {
  const saved = localStorage.getItem(saveKey);
  if (!saved) {
    const fresh = structuredClone(defaultState);
    fresh.orders = makeOrders(fresh);
    fresh.dailyGoals = makeDailyGoals(fresh);
    return fresh;
  }

  try {
    const parsed = JSON.parse(saved);
    const merged = { ...structuredClone(defaultState), ...parsed };
    merged.weather = weatherTable.find((weather) => weather.name === parsed.weather?.name) || weatherTable[0];
    merged.orders = Array.isArray(parsed.orders) && parsed.orders.length ? parsed.orders : makeOrders(merged);
    while (merged.plots.length < maxPlots) {
      merged.plots.push({ id: merged.plots.length, crop: null, plantedDay: 0, watered: false, ready: false });
    }
    merged.vehicle = { ...structuredClone(defaultState.vehicle), ...parsed.vehicle };
    merged.fieldLoad = { ...structuredClone(defaultState.fieldLoad), ...parsed.fieldLoad };
    merged.upgrades = { ...structuredClone(defaultState.upgrades), ...parsed.upgrades };
    merged.automation = { ...structuredClone(defaultState.automation), ...parsed.automation };
    merged.sellMode = parsed.sellMode === "market" ? "market" : "orders";
    merged.houseLevel = Number.isFinite(parsed.houseLevel) ? parsed.houseLevel : defaultState.houseLevel;
    merged.lifestyle = { ...structuredClone(defaultState.lifestyle), ...parsed.lifestyle };
    merged.dailyStats = { ...structuredClone(defaultState.dailyStats), ...parsed.dailyStats };
    merged.dailyGoals = Array.isArray(parsed.dailyGoals) && parsed.dailyGoals.length ? parsed.dailyGoals : makeDailyGoals(merged);
    merged.level = Number.isFinite(parsed.level) ? parsed.level : defaultState.level;
    merged.xp = Number.isFinite(parsed.xp) ? parsed.xp : defaultState.xp;
    merged.time = Number.isFinite(parsed.time) ? parsed.time : defaultState.time;
    merged.storageLimit = Number.isFinite(parsed.storageLimit) ? parsed.storageLimit : defaultState.storageLimit;
    if (!Number.isFinite(parsed.energy) || parsed.energy <= 10) {
      merged.energy = Math.max(parsed.energy || 0, 12);
    }
    if (!Object.keys(crops).some((key) => key === merged.vehicle.seed && merged.reputation >= crops[key].unlock)) {
      merged.vehicle.seed = "carrot";
    }
    merged.orders = normalizeOrders(merged.orders, merged);
    return merged;
  } catch {
    return structuredClone(defaultState);
  }
}

function saveState() {
  localStorage.setItem(saveKey, JSON.stringify(state));
  $("saveStatus").textContent = "Saved";
}

function render() {
  updateAllReadiness();
  $("day").textContent = state.day;
  $("season").textContent = seasonName();
  $("coins").textContent = state.coins;
  $("energy").textContent = `${formatEnergy(state.energy)}/${maxEnergy}`;
  $("reputation").textContent = state.reputation;
  $("farmLevel").textContent = `${state.level} (${state.xp}/${nextLevelXp()} XP)`;
  $("clock").textContent = formatTime(state.time);
  $("binMeter").textContent = `${storageUsed()}/${state.storageLimit} · ${fieldLoadUsed()}/${fieldLoadLimit()}`;
  $("weatherBadge").textContent = state.weather.name;
  $("soundToggle").textContent = state.sound ? "SFX" : "Off";
  document.body.dataset.weather = state.weather.name.toLowerCase().replace(/\s+/g, "-");
  document.body.dataset.period = dayPeriod();
  renderPlots();
  renderShop();
  renderBarn();
  renderOrders();
  renderDailyGoals();
  renderQuest();
  renderVehicle();
  renderGarage();
  renderAutomationMode();
  renderHomestead();
  saveState();
  ensureAutomationTimer();
}

function renderPlots() {
  plotGrid.innerHTML = "";
  plotGrid.style.gridTemplateColumns = `repeat(${fieldColumns()}, minmax(0, 1fr))`;
  state.plots.forEach((plot) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `plot ${plot.id >= state.plotCount ? "locked" : ""}`;
    if (plot.id === state.vehicle.position) button.classList.add("vehicle-here");
    button.setAttribute("aria-label", plotLabel(plot));
    button.disabled = plot.id >= state.plotCount;

    if (plot.crop) {
      const crop = crops[plot.crop];
      const stage = cropStage(plot);
      const plant = document.createElement("span");
      plant.className = `plant ${stage}`;
      plant.style.setProperty("--crop-color", crop.color);
      button.appendChild(plant);

      const timer = document.createElement("span");
      timer.className = "timer";
      timer.textContent = plot.ready ? "Ready" : formatGrowTime(daysLeft(plot));
      button.appendChild(timer);
    }

    if (plot.watered) {
      const drop = document.createElement("span");
      drop.className = "water-drop";
      drop.textContent = "♦";
      button.appendChild(drop);
    }

    if (plot.id === state.vehicle.position) {
      const vehicle = document.createElement("span");
      const vehicleLevel = state.upgrades[state.vehicle.type] || 1;
      vehicle.className = `vehicle-sprite ${state.vehicle.type} level-${vehicleLevel}`;
      vehicle.setAttribute("aria-hidden", "true");
      vehicle.innerHTML = "<span></span>";
      button.appendChild(vehicle);
    }

    button.addEventListener("click", () => handlePlotTap(plot.id));
    plotGrid.appendChild(button);
  });
}

function handlePlotTap(id) {
  if (id >= state.plotCount) return;
  state.vehicle.position = id;
  renderPlots();
  openPlot(id);
}

function renderVehicle() {
  document.querySelectorAll(".vehicle-tab").forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.vehicle === state.vehicle.type);
  });

  const names = { tractor: "Tractor", harvester: "Harvester", truck: "Grain Truck" };
  const hints = {
    tractor: `Plant ${crops[state.vehicle.seed].name} on empty plots, or water growing crops.`,
    harvester: "Drive onto a ready crop and harvest it into the barn.",
    truck: state.sellMode === "orders"
      ? "Deliver the first order your barn can fill."
      : "Sell stored crops at the market to clear bin space.",
  };
  const action = { tractor: "Work", harvester: "Harvest", truck: state.sellMode === "orders" ? "Deliver" : "Sell" };
  $("vehicleName").textContent = names[state.vehicle.type];
  $("vehicleHint").textContent = hints[state.vehicle.type];
  $("vehicleActionButton").textContent = action[state.vehicle.type];
  $("autoStatus").textContent = automationStatusText();
  const selectedUnlocked = state.level >= automationUnlocks[state.vehicle.type];
  $("selectedDeployButton").disabled = !selectedUnlocked;
  $("selectedDeployButton").textContent = selectedUnlocked
    ? `${state.automation[state.vehicle.type] ? "Recall" : "Deploy"} ${names[state.vehicle.type]}`
    : `Auto unlocks level ${automationUnlocks[state.vehicle.type]}`;
  renderVehicleSeeds();
}

function renderVehicleSeeds() {
  const seedBox = $("vehicleSeeds");
  seedBox.innerHTML = "";
  Object.entries(crops).forEach(([key, crop]) => {
    if (state.reputation < crop.unlock) return;
    const button = document.createElement("button");
    button.type = "button";
    button.className = `seed-chip ${state.vehicle.seed === key ? "active" : ""}`;
    button.disabled = state.vehicle.type !== "tractor";
    button.textContent = crop.name;
    button.addEventListener("click", () => {
      state.vehicle.seed = key;
      toast(`Tractor seed: ${crop.name}.`, { quiet: true });
      render();
    });
    seedBox.appendChild(button);
  });
}

function renderShop() {
  shopEl.innerHTML = "";
  Object.entries(crops).forEach(([key, crop]) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "seed-button";
    const locked = state.reputation < crop.unlock;
    button.disabled = locked || state.coins < crop.seed;
    button.innerHTML = `<strong>${crop.name} seeds</strong><span>${locked ? `Rep ${crop.unlock} unlock` : `${crop.seed} coins · ${formatCropSpeed(crop.days)} · sells ${crop.sell}`}</span>`;
    button.addEventListener("click", () => buySeed(key));
    shopEl.appendChild(button);
  });

  const cost = plotCost();
  $("expandButton").disabled = state.plotCount >= state.plots.length || state.coins < cost;
  $("expandButton").textContent = state.plotCount >= state.plots.length ? "All fields owned" : `Buy field plot · ${cost} coins (${state.plotCount}/${state.plots.length})`;
  $("scarecrowButton").disabled = state.scarecrow || state.coins < 120;
  $("scarecrowButton").textContent = state.scarecrow ? "Scarecrow watching" : "Scarecrow · 120 coins";
  renderBinButtons();
  renderHomeShop();
}

function renderHomeShop() {
  homeShopEl.innerHTML = "";
  const upgrade = document.createElement("div");
  upgrade.className = "garage-card";
  const maxed = state.houseLevel >= maxHouseLevel;
  const cost = houseUpgradeCost();
  upgrade.innerHTML = `
    <div>
      <strong>Farmhouse Lv. ${state.houseLevel}</strong>
      <p>${maxed ? "Fully upgraded home" : `Next upgrade: ${cost} coins`}</p>
    </div>
  `;
  const button = document.createElement("button");
  button.type = "button";
  button.className = "action-button";
  button.textContent = maxed ? "Max" : "Upgrade";
  button.disabled = maxed || state.coins < cost;
  button.addEventListener("click", buyHouseUpgrade);
  upgrade.appendChild(button);
  homeShopEl.appendChild(upgrade);

  Object.entries(lifestyleItems).forEach(([key, item]) => {
    const owned = !!state.lifestyle[key];
    const card = document.createElement("div");
    card.className = "garage-card";
    card.innerHTML = `
      <div>
        <strong>${item.name}</strong>
        <p>${owned ? "Owned" : `${item.cost} coins`}</p>
      </div>
    `;
    const itemButton = document.createElement("button");
    itemButton.type = "button";
    itemButton.className = "action-button";
    itemButton.textContent = owned ? "Owned" : "Buy";
    itemButton.disabled = owned || state.coins < item.cost;
    itemButton.addEventListener("click", () => buyLifestyleItem(key));
    card.appendChild(itemButton);
    homeShopEl.appendChild(card);
  });
}

function renderHomestead() {
  $("houseLevelLabel").textContent = `Farmhouse Lv. ${state.houseLevel}`;
  farmhouseVisual.className = `farmhouse level-${state.houseLevel}`;
  homesteadEl.classList.remove("house-level-1", "house-level-2", "house-level-3", "house-level-4");
  homesteadEl.classList.add(`house-level-${state.houseLevel}`);
  Object.entries(lifestyleItems).forEach(([key, item]) => {
    homesteadEl.classList.toggle(item.className, !!state.lifestyle[key]);
  });
}

function renderBarn() {
  barnEl.innerHTML = "";
  renderBinButtons();
  const bin = document.createElement("div");
  bin.className = "inventory-item bin-item";
  bin.innerHTML = `<strong>Grain Bin</strong><span>${storageUsed()} of ${state.storageLimit} slots filled</span>`;
  barnEl.appendChild(bin);
  const trailer = document.createElement("div");
  trailer.className = "inventory-item bin-item";
  trailer.innerHTML = `<strong>Field Trailer</strong><span>${fieldLoadUsed()} of ${fieldLoadLimit()} loads waiting for truck</span>`;
  barnEl.appendChild(trailer);
  Object.entries(crops).forEach(([key, crop]) => {
    const item = document.createElement("div");
    item.className = "inventory-item";
    item.innerHTML = `<strong>${crop.name}</strong><span>${state.inventory[key]} in bin · ${state.fieldLoad[key]} in trailer</span>`;
    barnEl.appendChild(item);
  });
}

function renderBinButtons() {
  const cost = binUpgradeCost();
  const upgradeText = `Bigger bin · ${cost} coins (${state.storageLimit} slots)`;
  const canUpgrade = state.coins >= cost;
  const canSell = storageUsed() > 0 || fieldLoadUsed() > 0;
  $("binButton").disabled = !canUpgrade;
  $("binButton").textContent = upgradeText;
  $("barnBinButton").disabled = !canUpgrade;
  $("barnBinButton").textContent = upgradeText;
  $("barnSellButton").disabled = !canSell;
  $("barnSellButton").textContent = canSell ? "Sell bin at market" : "Bin empty";
}

function renderOrders() {
  ordersEl.innerHTML = "";
  state.orders.forEach((order, index) => {
    const crop = crops[order.crop];
    const ready = state.inventory[order.crop] >= order.qty;
    const card = document.createElement("div");
    card.className = "order-card";
    card.innerHTML = `
      <div>
        <strong>${order.customer}</strong>
        <p>${order.qty} ${crop.name}${order.qty > 1 ? "s" : ""} · ${order.reward} coins · +${order.rep} rep</p>
      </div>
    `;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "action-button";
    button.textContent = "Dispatch";
    button.disabled = !ready;
    button.addEventListener("click", () => completeOrder(index));
    card.appendChild(button);
    ordersEl.appendChild(card);
  });
}

function renderDailyGoals() {
  dailyGoalsEl.innerHTML = "";
  state.dailyGoals.forEach((goal) => {
    const progress = dailyGoalProgress(goal);
    const complete = progress >= goal.target;
    const card = document.createElement("div");
    card.className = `goal-card ${complete ? "complete" : ""}`;
    card.innerHTML = `
      <div>
        <strong>${goal.title}</strong>
        <p>${Math.min(progress, goal.target)}/${goal.target} · ${goal.reward} coins · ${goal.xp} XP</p>
      </div>
    `;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "action-button";
    button.textContent = goal.claimed ? "Claimed" : "Claim";
    button.disabled = !complete || goal.claimed;
    button.addEventListener("click", () => claimDailyGoal(goal.id));
    card.appendChild(button);
    dailyGoalsEl.appendChild(card);
  });
}

function renderGarage() {
  garageEl.innerHTML = "";
  Object.entries(garageUpgrades).forEach(([key, upgrade]) => {
    const level = state.upgrades[key];
    const cost = vehicleUpgradeCost(key);
    const maxed = level >= maxVehicleLevel;
    const unlocked = state.level >= automationUnlocks[key];
    const card = document.createElement("div");
    card.className = `garage-card ${state.automation[key] ? "deployed" : ""}`;
    card.innerHTML = `
      <div>
        <strong>${upgrade.name} Lv. ${level}</strong>
        <p>${upgrade.perk} · ${unlocked ? "Auto-run ready" : `Auto-run unlocks at farm level ${automationUnlocks[key]}`}</p>
      </div>
    `;
    const actions = document.createElement("div");
    actions.className = "garage-actions";
    const button = document.createElement("button");
    button.type = "button";
    button.className = "action-button";
    button.textContent = maxed ? "Max" : `${cost} coins`;
    button.disabled = maxed || state.coins < cost;
    button.addEventListener("click", () => upgradeVehicle(key));
    actions.appendChild(button);

    const deploy = document.createElement("button");
    deploy.type = "button";
    deploy.className = "action-button deploy-button";
    deploy.textContent = state.automation[key] ? "Recall" : "Deploy";
    deploy.disabled = !unlocked;
    deploy.addEventListener("click", () => toggleAutomation(key));
    actions.appendChild(deploy);
    card.appendChild(actions);
    garageEl.appendChild(card);
  });
}

function renderAutomationMode() {
  $("orderModeButton").classList.toggle("active", state.sellMode === "orders");
  $("marketModeButton").classList.toggle("active", state.sellMode === "market");
  $("orderModeButton").textContent = state.sellMode === "orders" ? "Truck: Orders active" : "Truck: Orders";
  $("marketModeButton").textContent = state.sellMode === "market" ? "Truck: Market active" : "Truck: Market";
}

function renderQuest() {
  const quest = quests[Math.min(state.questIndex, quests.length - 1)];
  const progress = questProgress(quest);
  $("questTitle").textContent = quest.title;
  $("questText").textContent = state.questIndex >= quests.length
    ? "You cleared the first test track. Keep farming for coins and reputation."
    : quest.text;
  $("questProgress").style.width = `${Math.min(100, (progress / quest.target) * 100)}%`;
}

function openPlot(id) {
  updatePlotReadiness(state.plots[id]);
  selectedPlot = state.plots[id];
  const plot = selectedPlot;
  modal.classList.add("active");
  modal.setAttribute("aria-hidden", "false");
  modalActions.innerHTML = "";

  if (!plot.crop) {
    modalTitle.textContent = "Empty Plot";
    modalText.textContent = "Choose a seed to plant. Planting uses a little energy.";
    Object.entries(crops).forEach(([key, crop]) => addModalButton(
      crop.name,
      `Plant ${crop.name}`,
      () => plantCrop(id, key),
      state.reputation < crop.unlock || state.coins < crop.seed || state.energy < tractorEnergyCost()
    ));
    return;
  }

  const crop = crops[plot.crop];
  modalTitle.textContent = crop.name;
  modalText.textContent = plot.ready
    ? "Ready to harvest."
    : `${formatGrowTime(daysLeft(plot))} left. Watering speeds crops up.`;
  addModalButton("Water", "Use a little energy", () => waterPlot(id), plot.watered || state.energy < tractorEnergyCost());
  addModalButton("Harvest", `Load ${crop.name}`, () => harvestPlot(id), !plot.ready || state.energy < workEnergyCost || fieldLoadUsed() >= fieldLoadLimit());
}

function addModalButton(label, detail, action, disabled) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "seed-button";
  button.disabled = disabled;
  button.innerHTML = `<strong>${label}</strong><span>${detail}</span>`;
  button.addEventListener("click", action);
  modalActions.appendChild(button);
}

function closePlot() {
  modal.classList.remove("active");
  modal.setAttribute("aria-hidden", "true");
  selectedPlot = null;
}

function plantCrop(id, cropKey) {
  const crop = crops[cropKey];
  const energyCost = tractorEnergyCost();
  if (state.coins < crop.seed || state.energy < energyCost) return;
  if (isTooLate()) return;
  spendEnergy(energyCost);
  state.coins -= crop.seed;
  state.plots[id] = { ...state.plots[id], crop: cropKey, plantedDay: state.day, watered: false, ready: crop.days === 0 };
  updatePlotReadiness(state.plots[id]);
  popPlot(id);
  closePlot();
  toast(`${crop.name} planted.`);
  render();
}

function waterPlot(id) {
  const energyCost = tractorEnergyCost();
  if (state.energy < energyCost) return;
  if (isTooLate()) return;
  spendEnergy(energyCost);
  applyWater(state.plots[id]);
  popPlot(id);
  closePlot();
  toast("Watered.");
  render();
}

function harvestPlot(id, options = {}) {
  const { silent = false, renderAfter = true } = options;
  const plot = state.plots[id];
  if (!plot?.crop) {
    if (!silent) toast("No crop here.");
    return false;
  }
  updatePlotReadiness(plot);
  if (!plot.ready) {
    if (!silent) toast(`${crops[plot.crop].name} needs ${formatGrowTime(daysLeft(plot))}.`);
    return false;
  }
  if (state.energy < workEnergyCost) {
    if (!silent) toast("Too tired. Sleep to refill energy.");
    return false;
  }
  if (fieldLoadUsed() >= fieldLoadLimit()) {
    if (!silent) toast("The field trailer is full. Use the grain truck to haul it.");
    return false;
  }
  if (isTooLate()) return false;
  spendEnergy(workEnergyCost);
  const cropKey = plot.crop;
  const crop = crops[cropKey];
  state.fieldLoad[cropKey] += 1;
  state.stats.harvest += 1;
  state.dailyStats.harvest += 1;
  state.stats[cropKey] += 1;
  gainXp(1);
  state.plots[id] = { id, crop: null, plantedDay: 0, watered: false, ready: false };
  checkQuest();
  popPlot(id);
  closePlot();
  if (!silent) toast(`${crop.name} loaded. Send grain truck to bin or market. +1 XP.`);
  if (renderAfter) render();
  return true;
}

function setVehicle(type) {
  state.vehicle.type = type;
  toast(`${type === "truck" ? "Grain truck" : type[0].toUpperCase() + type.slice(1)} selected.`, { quiet: true });
  render();
}

function driveVehicle(direction) {
  const current = state.vehicle.position;
  const columns = fieldColumns();
  const row = Math.floor(current / columns);
  const col = current % columns;
  const next = {
    up: row > 0 ? current - columns : current,
    down: row < Math.ceil(state.plotCount / columns) - 1 ? current + columns : current,
    left: col > 0 ? current - 1 : current,
    right: col < columns - 1 ? current + 1 : current,
  }[direction];

  if (next === current) {
    toast("Field edge.");
    return;
  }

  if (next >= state.plotCount) {
    toast("Buy that plot first.");
    return;
  }

  state.vehicle.position = next;
  advanceClock(0.25);
  render();
}

function useVehicle() {
  if (state.vehicle.type === "tractor") {
    useTractor();
    return;
  }
  if (state.vehicle.type === "harvester") {
    useHarvester();
    return;
  }
  useTruck();
}

function useTractor() {
  const plot = state.plots[state.vehicle.position];
  if (!plot || plot.id >= state.plotCount) return;

  if (!plot.crop) {
    const crop = crops[state.vehicle.seed];
    if (state.coins < crop.seed) {
      toast(`Need ${crop.seed} coins for ${crop.name}.`);
      return;
    }
    if (state.energy < tractorEnergyCost()) {
      toast("Too tired. Sleep to refill energy.");
      return;
    }
    plantCrop(plot.id, state.vehicle.seed);
    return;
  }

  if (plot.ready) {
    toast("Switch to harvester for ready crops.");
    return;
  }

  if (plot.watered) {
    toast("This plot is already watered.");
    return;
  }

  waterPlot(plot.id);
}

function useHarvester() {
  const plot = state.plots[state.vehicle.position];
  if (!plot) {
    toast("Move the harvester onto a crop.");
    return;
  }
  harvestPlot(plot.id);
}

function useTruck() {
  if (fieldLoadUsed() && moveFieldLoadToBin()) {
    render();
    return;
  }

  if (state.sellMode === "market") {
    if (!sellMarketStock()) {
      toast("No grain bin crops to sell.");
      return;
    }
    render();
    return;
  }

  const index = state.orders.findIndex((order) => state.inventory[order.crop] >= order.qty);
  if (index === -1) {
    toast(fieldLoadUsed() ? "Grain bin is full." : "No loaded order or trailer crop yet.");
    return;
  }
  completeOrder(index);
}

function cycleTractorSeed() {
  const unlocked = Object.keys(crops).filter((key) => state.reputation >= crops[key].unlock);
  const current = unlocked.indexOf(state.vehicle.seed);
  state.vehicle.seed = unlocked[(current + 1) % unlocked.length] || "carrot";
  toast(`Tractor seed: ${crops[state.vehicle.seed].name}.`);
  render();
}

function buySeed(cropKey) {
  const crop = crops[cropKey];
  if (state.coins < crop.seed) return;
  const empty = state.plots.find((plot) => plot.id < state.plotCount && !plot.crop);
  if (!empty) {
    toast("No empty plot yet.");
    return;
  }
  plantCrop(empty.id, cropKey);
}

function completeOrder(index) {
  const order = state.orders[index];
  if (!order || state.inventory[order.crop] < order.qty) return;
  advanceClock(0.5);
  const reward = truckReward(order.reward);
  state.inventory[order.crop] -= order.qty;
  addCoins(reward);
  state.reputation += order.rep;
  state.stats.orders += 1;
  state.dailyStats.orders += 1;
  gainXp(5);
  state.orders.splice(index, 1, makeOrder(state));
  checkQuest();
  animateDelivery("orders");
  toast(`Delivered for ${reward} coins, +5 XP.`);
  render();
}

function nextDay() {
  state.day += 1;
  state.time = 7;
  state.dailyStats = { harvest: 0, orders: 0, coins: 0 };
  state.dailyGoals = makeDailyGoals(state);
  state.weather = weatherTable[Math.floor(Math.random() * weatherTable.length)];
  state.energy = Math.min(maxEnergy, state.weather.energy + Math.floor(state.reputation / 3));

  state.plots.forEach((plot) => {
    if (!plot.crop) return;
    if (state.weather.water) plot.watered = true;
    updatePlotReadiness(plot);
    plot.watered = false;
  });

  if (!state.scarecrow && Math.random() < 0.16) {
    const grown = state.plots.filter((plot) => plot.crop && !plot.ready);
    if (grown.length) {
      const unlucky = grown[Math.floor(Math.random() * grown.length)];
      unlucky.plantedDay += 1;
      toast("A field critter slowed one crop. A scarecrow can stop that.");
    }
  } else {
    toast(`${state.weather.name} morning.`);
  }

  render();
}

function waterAll() {
  if (isTooLate()) return;
  const dry = state.plots.filter((plot) => canWaterPlot(plot));
  if (!dry.length) {
    toast("Nothing needs water.");
    return;
  }
  const count = Math.min(dry.length, Math.floor(state.energy / workEnergyCost));
  dry.slice(0, count).forEach((plot) => {
    applyWater(plot);
  });
  spendEnergy(count * workEnergyCost);
  toast(`Watered ${count} plot${count === 1 ? "" : "s"}.`);
  render();
}

function buyPlot() {
  const cost = plotCost();
  if (state.plotCount >= state.plots.length || state.coins < cost) return;
  state.coins -= cost;
  state.plotCount += 1;
  gainXp(3);
  checkQuest();
  toast(`New field plot unlocked (${state.plotCount}/${state.plots.length}).`);
  render();
}

function buyScarecrow() {
  if (state.scarecrow || state.coins < 120) return;
  state.coins -= 120;
  state.scarecrow = true;
  gainXp(3);
  toast("Scarecrow placed.");
  render();
}

function buyBin() {
  const cost = binUpgradeCost();
  if (state.coins < cost) {
    toast(`Need ${cost} coins for a bigger bin.`);
    return;
  }
  state.coins -= cost;
  state.storageLimit += 6;
  gainXp(3);
  toast(`Bin upgraded to ${state.storageLimit} slots.`);
  render();
}

function binUpgradeCost() {
  return storageUsed() >= state.storageLimit ? 45 : 90;
}

function sellAllMarketStock() {
  if (!storageUsed() && !fieldLoadUsed()) {
    toast("No stored crops to sell.");
    return;
  }
  let sold = 0;
  let total = 0;
  [state.fieldLoad, state.inventory].forEach((source) => {
    Object.entries(source).forEach(([cropKey, qty]) => {
      if (!qty) return;
      sold += qty;
      total += Math.round(crops[cropKey].sell * qty * 0.5);
      source[cropKey] = 0;
    });
  });
  addCoins(total);
  gainXp(Math.max(1, Math.floor(sold / 2)));
  toast(`Sold ${sold} stored crops at market. +${total} coins.`);
  animateDelivery("market");
  render();
}

function upgradeVehicle(type) {
  const cost = vehicleUpgradeCost(type);
  if (state.upgrades[type] >= maxVehicleLevel || state.coins < cost) return;
  state.coins -= cost;
  state.upgrades[type] += 1;
  gainXp(4);
  toast(`${garageUpgrades[type].name} upgraded to Lv. ${state.upgrades[type]}.`);
  render();
}

function buyHouseUpgrade() {
  const cost = houseUpgradeCost();
  if (state.houseLevel >= maxHouseLevel || state.coins < cost) return;
  state.coins -= cost;
  state.houseLevel += 1;
  gainXp(5);
  toast(`Farmhouse upgraded to Lv. ${state.houseLevel}.`);
  render();
}

function buyLifestyleItem(key) {
  const item = lifestyleItems[key];
  if (!item || state.lifestyle[key] || state.coins < item.cost) return;
  state.coins -= item.cost;
  state.lifestyle[key] = true;
  gainXp(2);
  toast(`${item.name} added to the homestead.`);
  render();
}

function toggleAutomation(type) {
  if (state.level < automationUnlocks[type]) return;
  state.vehicle.type = type;
  state.automation[type] = !state.automation[type];
  toast(`${garageUpgrades[type].name} ${state.automation[type] ? "deployed" : "recalled"}.`);
  ensureAutomationTimer();
  if (state.automation[type]) runAutomationTick(true);
  render();
}

function toggleSelectedAutomation() {
  toggleAutomation(state.vehicle.type);
}

function setSellMode(mode) {
  state.sellMode = mode;
  toast(`Truck mode: ${mode === "orders" ? "orders" : "market sell"}.`);
  render();
}

function spendEnergy(amount) {
  state.energy = Math.max(0, Math.round((state.energy - amount) * 10) / 10);
  advanceClock(amount);
}

function advanceClock(hours) {
  state.time = Math.min(22, Math.round((state.time + hours) * 4) / 4);
}

function isTooLate() {
  if (state.time < 20) return false;
  toast("It is too late to work. Sleep until morning.");
  return true;
}

function storageUsed() {
  return Object.values(state.inventory).reduce((total, count) => total + count, 0);
}

function fieldLoadUsed() {
  return Object.values(state.fieldLoad).reduce((total, count) => total + count, 0);
}

function fieldLoadLimit() {
  return state.plotCount + state.upgrades.truck * 2;
}

function fieldColumns() {
  if (state.plotCount <= 9) return 3;
  return 4;
}

function plotCost() {
  return 35 + state.plotCount * 10;
}

function moveFieldLoadToBin(options = {}) {
  const { silent = false } = options;
  if (!fieldLoadUsed()) return false;
  const available = state.storageLimit - storageUsed();
  if (available <= 0) {
    if (!silent) toast("Grain bin is full. Sell or upgrade it first.");
    return false;
  }

  let moved = 0;
  Object.keys(state.fieldLoad).forEach((cropKey) => {
    while (state.fieldLoad[cropKey] > 0 && moved < available) {
      state.fieldLoad[cropKey] -= 1;
      state.inventory[cropKey] += 1;
      moved += 1;
    }
  });

  if (!moved) return false;
  advanceClock(0.25);
  gainXp(1);
  animateDelivery("bin");
  if (!silent) toast(`Grain truck hauled ${moved} load${moved === 1 ? "" : "s"} to the bin.`);
  return true;
}

function canWaterPlot(plot) {
  return plot.id < state.plotCount && plot.crop && !plot.ready;
}

function applyWater(plot) {
  if (!plot?.crop) return;
  const before = daysLeft(plot);
  plot.watered = true;
  updatePlotReadiness(plot);
  if (before <= 0.75) plot.ready = true;
}

function addCoins(amount) {
  state.coins += amount;
  state.dailyStats.coins += amount;
}

function gainXp(amount) {
  state.xp += amount;
  while (state.xp >= nextLevelXp()) {
    state.xp -= nextLevelXp();
    state.level += 1;
    state.coins += 25 + state.level * 5;
    toast(`Farm level ${state.level}. Bonus coins added.`);
  }
}

function nextLevelXp() {
  return 18 + (state.level - 1) * 10;
}

function harvestPayout(crop) {
  return Math.round(crop.sell * (1 + (state.upgrades.harvester - 1) * 0.2));
}

function truckReward(baseReward) {
  return Math.round(baseReward * (1 + (state.upgrades.truck - 1) * 0.2));
}

function tractorEnergyCost() {
  return Math.max(0.25, workEnergyCost - (state.upgrades.tractor - 1) * 0.1);
}

function vehicleUpgradeCost(type) {
  return 95 + state.upgrades[type] * 55;
}

function houseUpgradeCost() {
  return 110 + state.houseLevel * 75;
}

function makeDailyGoals(currentState) {
  const harvestTarget = 2 + Math.min(3, Math.floor(currentState.level / 2));
  const coinTarget = 60 + currentState.level * 20;
  return [
    { id: `harvest-${currentState.day}`, title: "Harvest Run", type: "harvest", target: harvestTarget, reward: 18, xp: 4, claimed: false },
    { id: `delivery-${currentState.day}`, title: "Market Delivery", type: "orders", target: 1, reward: 24, xp: 5, claimed: false },
    { id: `coins-${currentState.day}`, title: "Cash Crop", type: "coins", target: coinTarget, reward: 30, xp: 6, claimed: false },
  ];
}

function dailyGoalProgress(goal) {
  return state.dailyStats[goal.type] || 0;
}

function claimDailyGoal(id) {
  const goal = state.dailyGoals.find((item) => item.id === id);
  if (!goal || goal.claimed || dailyGoalProgress(goal) < goal.target) return;
  goal.claimed = true;
  addCoins(goal.reward);
  gainXp(goal.xp);
  toast(`${goal.title} complete. +${goal.reward} coins, +${goal.xp} XP.`);
  render();
}

function ensureAutomationTimer() {
  if (automationTimer || !Object.values(state.automation).some(Boolean)) return;
  automationTimer = window.setInterval(runAutomationTick, 2400);
}

function runAutomationTick(runSilent = false) {
  if (!Object.values(state.automation).some(Boolean)) {
    window.clearInterval(automationTimer);
    automationTimer = null;
    return;
  }
  if (isTooLate()) {
    stopAutomationForNight();
    render();
    return;
  }

  const actions = [];
  const harvesterJobs = state.automation.harvester ? runCrewJobs(autoHarvest, state.plotCount) : 0;
  const truckJobs = state.automation.truck ? runCrewJobs(autoTruck, state.upgrades.truck) : 0;
  const tractorJobs = state.automation.tractor ? runCrewJobs(autoTractor, state.upgrades.tractor + 1) : 0;
  if (harvesterJobs) actions.push(`harvester x${harvesterJobs}`);
  if (truckJobs) actions.push(`truck x${truckJobs}`);
  if (tractorJobs) actions.push(`tractor x${tractorJobs}`);
  if (actions.length && !runSilent) {
    toast(`Auto crew ran: ${actions.join(", ")}.`);
    render();
  }
}

function automationStatusText() {
  const deployed = Object.entries(state.automation)
    .filter(([, enabled]) => enabled)
    .map(([type]) => garageUpgrades[type].name);

  if (!deployed.length) {
    const selected = garageUpgrades[state.vehicle.type].name;
    return `Manual ${selected} selected. Deploy to auto-run.`;
  }

  if (state.automation.harvester && fieldLoadUsed() >= fieldLoadLimit()) {
    return "Auto crew: Harvester waiting. Field trailer is full.";
  }
  if (state.automation.harvester && !hasReadyCrop()) {
    return "Auto crew: Harvester waiting for ready crops.";
  }
  if (state.automation.truck && state.sellMode === "orders" && !fieldLoadUsed()) {
    return "Auto crew: Grain Truck waiting at barn. Dispatch orders manually.";
  }
  return `Auto crew: ${deployed.join(", ")}`;
}

function hasReadyCrop() {
  return state.plots.some((plot) => {
    updatePlotReadiness(plot);
    return plot.id < state.plotCount && plot.crop && plot.ready;
  });
}

function runCrewJobs(job, limit) {
  let completed = 0;
  for (let index = 0; index < limit; index += 1) {
    if (!job()) break;
    completed += 1;
  }
  return completed;
}

function autoTractor() {
  const crop = crops[state.vehicle.seed];
  const energyCost = tractorEnergyCost();
  if (!crop || state.reputation < crop.unlock || state.coins < crop.seed || state.energy < energyCost) return false;

  const empty = state.plots.find((plot) => plot.id < state.plotCount && !plot.crop);
  if (empty) {
    state.vehicle.type = "tractor";
    state.vehicle.position = empty.id;
    spendEnergy(energyCost);
    state.coins -= crop.seed;
    empty.crop = state.vehicle.seed;
    empty.plantedDay = state.day;
    empty.ready = false;
    applyWater(empty);
    return true;
  }

  const dry = state.plots.find((plot) => plot.id < state.plotCount && plot.crop && !plot.ready && !plot.watered);
  if (!dry || state.energy < energyCost) return false;
  state.vehicle.type = "tractor";
  state.vehicle.position = dry.id;
  spendEnergy(energyCost);
  applyWater(dry);
  return true;
}

function autoHarvest() {
  const ready = state.plots.find((plot) => {
    updatePlotReadiness(plot);
    return plot.id < state.plotCount && plot.crop && plot.ready;
  });
  if (!ready || state.energy < workEnergyCost || fieldLoadUsed() >= fieldLoadLimit()) return false;
  state.vehicle.type = "harvester";
  state.vehicle.position = ready.id;
  return harvestPlot(ready.id, { silent: true, renderAfter: false });
}

function autoTruck() {
  state.vehicle.type = "truck";
  if (fieldLoadUsed()) return moveFieldLoadToBin({ silent: true });

  if (state.sellMode === "orders") {
    return false;
  }

  return sellMarketStock();
}

function sellMarketStock() {
  const source = state.inventory;
  const cropKey = Object.keys(source).find((key) => source[key] > 0);
  if (!cropKey) return false;
  const qty = Math.min(2 + state.upgrades.truck, source[cropKey]);
  const reward = Math.round(crops[cropKey].sell * qty * 0.5);
  source[cropKey] -= qty;
  addCoins(reward);
  gainXp(1);
  advanceClock(0.25);
  animateDelivery("market");
  toast(`Sold ${qty} ${crops[cropKey].name}${qty === 1 ? "" : "s"} at market. +${reward} coins.`);
  return true;
}

function animateDelivery(kind) {
  if (!deliveryTruck) return;
  deliveryTruck.classList.remove("run-orders", "run-market", "run-bin");
  void deliveryTruck.offsetWidth;
  deliveryTruck.classList.add(`run-${kind}`);
  window.setTimeout(() => deliveryTruck.classList.remove(`run-${kind}`), 1300);
}

function stopAutomationForNight() {
  state.automation = { tractor: false, harvester: false, truck: false };
  if (automationTimer) {
    window.clearInterval(automationTimer);
    automationTimer = null;
  }
}

function formatEnergy(value) {
  return Number.isInteger(value) ? value : value.toFixed(1);
}

function formatTime(value) {
  const hour = Math.floor(value);
  const minute = Math.round((value - hour) * 60);
  const suffix = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${String(minute).padStart(2, "0")} ${suffix}`;
}

function dayPeriod() {
  if (state.time >= 20) return "night";
  if (state.time >= 17) return "evening";
  if (state.time < 9) return "morning";
  return "day";
}

function cropStage(plot) {
  if (plot.ready) return "ready";
  const crop = crops[plot.crop];
  const progress = plotGrowth(plot) / crop.days;
  if (progress >= 0.55) return "leafy";
  return "sprout";
}

function daysLeft(plot) {
  const crop = crops[plot.crop];
  return Math.max(0, crop.days - plotGrowth(plot));
}

function formatGrowTime(value) {
  if (value <= 0.01) return "ready";
  if (value <= 0.75) return "water today";
  if (value <= 1) return "tomorrow";
  return `${Math.ceil(value)} days`;
}

function formatCropSpeed(value) {
  if (value <= 0.75) return "same-day crop";
  if (value <= 1) return "1-day crop";
  return `${value}-day crop`;
}

function plotGrowth(plot) {
  return state.day - plot.plantedDay + (plot.watered ? 0.75 : 0) + state.weather.growBoost;
}

function updatePlotReadiness(plot) {
  if (!plot.crop) return;
  plot.ready = daysLeft(plot) <= 0.01;
}

function updateAllReadiness() {
  state.plots.forEach(updatePlotReadiness);
}

function plotLabel(plot) {
  if (plot.id >= state.plotCount) return "Locked plot";
  if (!plot.crop) return "Empty plot";
  return `${crops[plot.crop].name} plot, ${plot.ready ? "ready" : `${formatGrowTime(daysLeft(plot))} left`}`;
}

function makeOrders(currentState) {
  return [makeOrder(currentState), makeOrder(currentState), makeOrder(currentState)];
}

function makeOrder(currentState) {
  const available = Object.keys(crops).filter((key) => currentState.reputation >= crops[key].unlock);
  const cropKey = available[Math.floor(Math.random() * available.length)] || "carrot";
  const qty = orderQuantity(currentState, cropKey);
  const crop = crops[cropKey];
  const names = ["Mina's Cafe", "Jun's Pantry", "River Stand", "Bluebell Inn", "Patch Market"];
  return {
    customer: names[Math.floor(Math.random() * names.length)],
    crop: cropKey,
    qty,
    reward: Math.ceil(crop.sell * qty * 1.2 + currentState.reputation * 2),
    rep: 1 + (qty > 2 ? 1 : 0),
  };
}

function orderQuantity(currentState, cropKey) {
  const min = minimumOrderQuantity(currentState, cropKey);
  const level = currentState.level || 1;
  const rep = currentState.reputation || 0;
  const fieldScale = Math.max(1, Math.floor((currentState.plotCount || 4) / 4));
  const base = 1 + Math.floor(level / 2) + Math.floor(rep / 3);
  const cropMultiplier = cropKey === "pumpkin" ? 0.65 : cropKey === "corn" ? 1.1 : cropKey === "strawberry" ? 1.25 : 1;
  const max = Math.max(min + 1, Math.round((base + fieldScale) * cropMultiplier));
  return Math.max(1, Math.min(24, min + Math.floor(Math.random() * (max - min + 1))));
}

function minimumOrderQuantity(currentState, cropKey) {
  const level = currentState.level || 1;
  const rep = currentState.reputation || 0;
  const fieldScale = Math.max(1, Math.floor((currentState.plotCount || 4) / 4));
  const cropFloor = cropKey === "pumpkin" ? 1 : cropKey === "corn" ? 2 : 1;
  return Math.max(cropFloor, level < 3 ? 1 : Math.min(10, fieldScale + Math.floor(rep / 4)));
}

function normalizeOrders(orders, currentState) {
  return orders.map((order) => {
    const crop = crops[order.crop] || crops.carrot;
    const minimum = minimumOrderQuantity(currentState, order.crop);
    if (order.qty >= minimum) return order;
    const qty = orderQuantity(currentState, order.crop);
    return {
      ...order,
      qty,
      reward: Math.ceil(crop.sell * qty * 1.2 + currentState.reputation * 2),
    };
  });
}

function checkQuest() {
  if (state.questIndex >= quests.length) return;
  const quest = quests[state.questIndex];
  if (questProgress(quest) < quest.target) return;
  state.coins += quest.reward;
  state.questIndex += 1;
  toast(`Quest complete. +${quest.reward} coins.`);
}

function questProgress(quest) {
  if (!quest) return 0;
  if (quest.type === "plots") return state.plotCount;
  if (quest.type === "reputation") return state.reputation;
  return state.stats[quest.type] || 0;
}

function seasonName() {
  return ["Sprout", "Bloom", "Suncrest", "Harvest"][Math.floor((state.day - 1) / 7) % 4];
}

function toast(message, options = {}) {
  const { quiet = false } = options;
  const toastEl = $("toast");
  toastEl.textContent = message;
  toastEl.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove("show"), 2100);
  if (!quiet) beep();
}

let audioCtx = null;

function beep() {
  const AudioEngine = window.AudioContext || window.webkitAudioContext;
  if (!state.sound || !AudioEngine) return;
  if (!audioCtx) audioCtx = new AudioEngine();
  if (audioCtx.state === "suspended") audioCtx.resume();
  const oscillator = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  oscillator.type = "triangle";
  oscillator.frequency.value = 480;
  gain.gain.value = 0.08;
  oscillator.connect(gain);
  gain.connect(audioCtx.destination);
  oscillator.start();
  gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.08);
  oscillator.stop(audioCtx.currentTime + 0.09);
}

function popPlot(id) {
  const plot = plotGrid.children[id];
  if (!plot) return;
  plot.classList.remove("pop");
  requestAnimationFrame(() => plot.classList.add("pop"));
}

function resetFarm() {
  if (!confirm("Reset Pocket Patch Farm?")) return;
  [saveKey, ...oldSaveKeys].forEach((key) => localStorage.removeItem(key));
  state = loadState();
  toast("Farm reset.");
  render();
}

document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((item) => item.classList.remove("active"));
    document.querySelectorAll(".panel").forEach((panel) => panel.classList.remove("active"));
    tab.classList.add("active");
    $(`${tab.dataset.panel}Panel`).classList.add("active");
  });
});

$("nextDayButton").addEventListener("click", nextDay);
$("waterAllButton").addEventListener("click", waterAll);
$("expandButton").addEventListener("click", buyPlot);
$("scarecrowButton").addEventListener("click", buyScarecrow);
$("binButton").addEventListener("click", buyBin);
$("barnBinButton").addEventListener("click", buyBin);
$("barnSellButton").addEventListener("click", sellAllMarketStock);
$("orderModeButton").addEventListener("click", () => setSellMode("orders"));
$("marketModeButton").addEventListener("click", () => setSellMode("market"));
$("closeModal").addEventListener("click", closePlot);
$("resetButton").addEventListener("click", resetFarm);
$("soundToggle").addEventListener("click", () => {
  state.sound = !state.sound;
  render();
});

document.querySelectorAll(".vehicle-tab").forEach((button) => {
  button.addEventListener("click", () => setVehicle(button.dataset.vehicle));
});

document.querySelectorAll("[data-drive]").forEach((button) => {
  button.addEventListener("click", () => driveVehicle(button.dataset.drive));
});

$("vehicleActionButton").addEventListener("click", useVehicle);
$("selectedDeployButton").addEventListener("click", toggleSelectedAutomation);

modal.addEventListener("click", (event) => {
  if (event.target === modal) closePlot();
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("service-worker.js").catch(() => {});
  });
}

ensureAutomationTimer();
render();
