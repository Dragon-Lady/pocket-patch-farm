# Pocket Patch Farm

A small iPhone-friendly farming sim prototype for family playtesting.

## Play Loop

- Plant seeds in empty plots.
- Water crops to speed them through the night.
- Sleep to advance the day.
- Harvest crops into the barn.
- Complete orders for coins and reputation.
- Unlock crops, buy plots, and add a scarecrow.
- Drive the tractor, harvester, and grain truck with on-screen controls.
- Use the tractor to plant or water, the harvester to collect ready crops, and
  the grain truck to deliver any order the barn can fill.
- Tap an unlocked plot to drive the selected vehicle there and open the plot
  controls in one tap.
- Choose visible tractor seed buttons for carrots, berries, and later unlocks.
- Watch the clock move from morning to night as work gets done.
- Harvested crops use grain-bin space until orders are delivered or the bin is
  upgraded.
- Harvesting also pays coins immediately, while orders provide extra delivery
  rewards from stored crops.
- Early pacing is intentionally quick for testing: carrots, berries, and corn
  can be same-day crops when watered, corn unlocks after the first completed
  order, and pumpkins unlock after a few reputation points.
- Energy is tuned for playtesting: the pool is larger, work costs a half point,
  and sleeping refills most or all energy depending on weather.
- Progression now includes farm level XP, daily goals, and garage upgrades for
  the tractor, harvester, and grain truck.
- Garage automation unlocks by farm level: tractor at level 2, harvester at
  level 3, and grain truck at level 4. Deployed workers run while the page is
  open, use the selected tractor seed, and stop at night.
- Truck mode can be set to order delivery or market selling from the Garage;
  the mode affects both manual truck use and deployed auto-trucks.
- Barn includes direct bin recovery controls: sell stored crops at market or
  buy a bigger bin. If the bin is full, the bin upgrade cost drops to prevent
  a stuck state.
- Harvester now loads crops into a field trailer first. The grain truck is
  responsible for hauling trailer crops into the grain bin or selling them at
  market, so it has a distinct job from harvesting.
- Grain truck always hauls field-trailer crops to the barn/bin first; vendor
  selling only happens from grain-bin inventory.
- Deployed grain truck no longer auto-delivers order-board requests. It hauls
  field-trailer crops to the barn/bin, then waits for manual order dispatch.
- Deployed harvester now sweeps all ready plots it can fit in the field trailer.
- Order quantities now scale with farm level, reputation, and field size so
  later vendor contracts ask for larger crop loads.
- Field expansion now grows beyond the original 3x3 test patch, up to 24 plots,
  so the player can build separate crop areas over time.
- Watering is explicit for "water today" crops; Water all makes those crops
  ready instead of leaving them stuck near-ready.
- Daily Goals now live in their own tab.
- The field includes farm hands, vendor stands, and an animated delivery truck
  that runs to vendors or the barn when selling, delivering, or hauling crops.
- The vendor buildings and farmhouse now live outside the field in a separate
  farmstead strip. The farmhouse can be upgraded from the Shop, and lifestyle
  items add visible homestead details. Higher farmhouse levels now change the
  house silhouette from modest farm home toward an estate-style mansion.
- Graphics have a first polish pass with a barn, silo, fence, richer field
  tiles, and dimensional vehicle sprites. Tractor, harvester, and grain truck
  upgrades now visibly improve the equipment style.

Progress saves in the browser with `localStorage`.

## Run

```bash
python3 -m http.server 8088
```

Then open `http://localhost:8088` from this folder. For iPhone testing on the
same Wi-Fi, use the computer's local network IP with the same port.
