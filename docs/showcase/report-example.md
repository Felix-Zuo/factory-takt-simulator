# Factory Takt Simulation Report

| Report ID | Scenario | Run Mode | Run Length | Speed |
| --- | --- | --- | ---: | ---: |
| FTS-2026-0606-A01 | 深沟球后磨 + 装配整线 | Background simulation | 8 h | 120x |

## Executive Dashboard

| Metric | Value | Metric | Value |
| --- | ---: | --- | ---: |
| Planned target | 10,000 pcs | Simulated output | 9,820 pcs |
| Line takt | 24.44 s/pc | Line capacity | 147.3 pcs/h |
| First bottleneck | SF-IR-01 | Bottleneck capacity | 146.4 pcs/h |
| Balance rate | 82.7% | End-to-end WIP peak | 742 pcs |
| OR side output | 4,932 pcs | IR side output | 4,888 pcs |
| Assembly paired output | 4,861 sets | Final packed output | 4,820 sets |
| Average utilization | 68.4% | Effective running ratio | 91.8% |

## Route Topology

```text
SRC-OR
  -> OR-GAUGE-FEED
  -> OR-GRIND-01 / OR-GRIND-02
  -> OR-GAUGE-01 / OR-GAUGE-02
  -> SF-OR-01 / SF-OR-02
  -> DRY-OR
  -> OR-MAIN-LINE
  -> ASM-STORAGE-OR
  -> WASH-OR
  -> EDDY-OR
  -> SIZE-OR
  -> PAIR

SRC-IR
  -> IR-GAUGE-FEED
  -> IR-GRIND-01 / IR-GRIND-02
  -> BORE-01 / BORE-02
  -> IR-GAUGE-01 / IR-GAUGE-02
  -> SF-IR-01 / SF-IR-02
  -> DRY-IR
  -> IR-MAIN-LINE
  -> ASM-STORAGE-IR
  -> WASH-IR
  -> EDDY-IR
  -> SIZE-IR
  -> PAIR

PAIR
  -> RIVET
  -> WASH-2CH
  -> FLEX
  -> VIB-OPEN
  -> WASH-2
  -> DRY-ASM
  -> VIB-CLOSED
  -> GREASE
  -> CAP
  -> VISION
  -> MANUAL-TABLE
  -> RUST
  -> PACK-END
```

## Stage Capacity

| Stage | Parallel units | Takt setting | Effective capacity | Utilization | Output | Status |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| OR source + feeder | 2 outlets | 3.00 s/pc | 1,200 pcs/h | 41.1% | 4,932 | Ready |
| IR source + feeder | 2 outlets | 3.00 s/pc | 1,200 pcs/h | 40.7% | 4,888 | Ready |
| Feed gauge | 2 | 3.00 s/pc | 1,160 pcs/h | 42.5% | 9,820 | Capacity margin |
| OR grinding | 2 | 13.0 s/pc | 504 pcs/h | 93.8% | 4,932 | Balanced |
| IR grinding | 2 | 13.0 s/pc | 498 pcs/h | 94.1% | 4,888 | Balanced |
| Bore grinding | 2 | 13.0 s/pc | 487 pcs/h | 93.2% | 4,875 | Balanced |
| OR gauge | 2 | 3.00 s/pc | 1,080 pcs/h | 45.8% | 4,921 | Buffer absorber |
| IR gauge | 2 | 3.00 s/pc | 1,080 pcs/h | 45.2% | 4,870 | Buffer absorber |
| OR superfinish | 2 | 12.8 s/pc | 506 pcs/h | 92.0% | 4,906 | Balanced |
| IR superfinish | 2 | 24.6 s/pc | 292 pcs/h | 99.1% | 4,861 | Bottleneck group |
| Grinding dryer OR | 1 | 25 pcs / 17 s | 529 pcs/h | 88.2% | 4,897 | Balanced |
| Grinding dryer IR | 1 | 25 pcs / 17 s | 529 pcs/h | 87.5% | 4,852 | Balanced |
| OR main line | 1 | 3.00 s/pc, 40 s travel | 1,200 pcs/h | 40.8% | 4,884 | Transport margin |
| IR main line | 1 | 3.00 s/pc, 40 s travel | 1,200 pcs/h | 40.4% | 4,846 | Transport margin |
| Assembly storage OR | 400 pcs | pass-through + storage | 1,080 pcs/h | 44.6% | 4,872 | Buffering |
| Assembly storage IR | 400 pcs | pass-through + storage | 1,080 pcs/h | 44.1% | 4,832 | Buffering |
| OR wash | 20 pcs in machine | 2.50 s push + 5 pcs air | 680 pcs/h | 71.5% | 4,858 | Ready |
| IR wash | 25 pcs in machine | 2.50 s push + 5 pcs air | 690 pcs/h | 70.2% | 4,819 | Ready |
| Eddy current OR | 1 | 4.00 s/pc | 900 pcs/h | 54.0% | 4,850 | Capacity margin |
| Eddy current IR | 1 | 4.00 s/pc | 900 pcs/h | 53.5% | 4,812 | Capacity margin |
| Size gauge OR | 1 | 4.00 s/pc | 900 pcs/h | 53.7% | 4,846 | Capacity margin |
| Size gauge IR | 1 | 4.00 s/pc | 900 pcs/h | 53.2% | 4,806 | Capacity margin |
| Pairing | 1 | 4.50 s/set | 800 sets/h | 60.8% | 4,861 | OR/IR sync |
| Riveting | 1 | 4.00 s/set | 900 sets/h | 53.9% | 4,845 | Ready |
| Semi-finished wash 2CH | 2 channels | 8.40 s/channel batch | 857 sets/h | 56.4% | 4,832 | Channel balance |
| Flexibility check | 1 | 4.00 s/set | 900 sets/h | 53.5% | 4,820 | Ready |
| Open vibration | 1 | 4.00 s/set | 900 sets/h | 53.3% | 4,812 | Ready |
| Final wash | 2 channels | 8.40 s/channel batch | 857 sets/h | 56.0% | 4,799 | Channel balance |
| Assembly dryer | 4 lanes × 4 pcs | 17.0 s/cycle | 3,388 sets/h | 14.2% | 4,792 | High margin |
| Closed vibration | 1 | 4.00 s/set | 900 sets/h | 53.0% | 4,780 | Ready |
| Grease filling | 1 | 4.00 s/set | 900 sets/h | 52.8% | 4,764 | Ready |
| Cap pressing | 1 | 4.00 s/set | 900 sets/h | 52.7% | 4,755 | Ready |
| Vision inspection | 1 | 4.00 s/set | 900 sets/h | 52.5% | 4,744 | Ready |
| Manual inspection table | 100 pcs buffer | pass-through | 900 sets/h | 51.9% | 4,731 | Buffering |
| Rust prevention | 1 | 4.00 s/set | 900 sets/h | 51.6% | 4,720 | Ready |
| Packing endpoint | unlimited sink | receive only | unlimited | 0.0% | 4,820 | Finished |

## Bottleneck Ranking

| Rank | Position | Effective capacity | Evidence | Classification |
| ---: | --- | ---: | --- | --- |
| 1 | SF-IR-01 | 146.4 pcs/h | Longest effective takt, 99.1% utilization, downstream remains hungry | Primary bottleneck |
| 2 | SF-IR-02 | 148.1 pcs/h | Same process group, slightly better availability | Bottleneck group |
| 3 | Bore grinding group | 487 pcs/h | Near OR/IR grinding capacity, no persistent downstream full | Watch |
| 4 | OR grinding group | 504 pcs/h | Output buffer peaks but clears through SF-OR | Watch |
| 5 | Pairing | 800 sets/h | Waits for IR side balance, not capacity-limited | Synchronization point |

## Gauge Treatment

| Gauge | Capacity vs upstream | Waiting time | Blocked time | Judgment |
| --- | ---: | ---: | ---: | --- |
| Feed gauge | 2.30x | 41.6% | 0.4% | Normal reserve |
| OR gauge | 2.16x | 46.8% | 0.6% | Normal reserve |
| IR gauge | 2.17x | 47.3% | 0.7% | Normal reserve |
| Eddy current OR | 1.84x | 44.2% | 0.2% | Normal reserve |
| Eddy current IR | 1.85x | 45.0% | 0.3% | Normal reserve |
| Size gauge OR | 1.84x | 44.7% | 0.2% | Normal reserve |
| Size gauge IR | 1.85x | 45.4% | 0.3% | Normal reserve |
| Vision inspection | 1.83x | 46.5% | 0.1% | Normal reserve |

Fast inspection stations are not promoted to bottleneck when their effective capacity is above upstream demand and their waiting time is caused by deliberate line reserve or downstream synchronization.

## Loader Arm and Transfer Logic

| Transfer | Mode | Batch | Cycle / travel | Rule | Output |
| --- | --- | ---: | ---: | --- | ---: |
| FEED -> OR-GRIND group | loader arm bus | 5 pcs | 3.0 s/pc equivalent | pick from first full outlet, deliver to lowest WIP machine | 4,932 |
| FEED -> IR-GRIND group | loader arm bus | 5 pcs | 3.0 s/pc equivalent | pick from first full outlet, deliver to lowest WIP machine | 4,888 |
| OR-GRIND -> SF-OR | loader arm bus | 5 pcs | 15.0 s cycle | rotate pickup between full OR outputs, skip full downstream ports | 4,906 |
| IR/BORE -> SF-IR | loader arm bus | 5 pcs | 15.0 s cycle | wait-pick when no output reaches batch, wait-space when SF input is full | 4,861 |
| DRY-OR -> ASM-STORAGE-OR | conveyor | 1 pc | 3.0 s dispatch, 40 s travel | moving WIP stops in place when downstream storage gate closes | 4,884 |
| DRY-IR -> ASM-STORAGE-IR | conveyor | 1 pc | 3.0 s dispatch, 40 s travel | moving WIP stops in place when downstream storage gate closes | 4,846 |
| ASM-STORAGE -> WASH | conveyor | 1 pc | 3.0 s dispatch | pass-through first, storage discharge when upstream is empty | 9,690 |
| WASH-2CH distribution | route splitter | 1 set | 8.4 s/channel | round-robin, blocked channel skipped | 4,832 |

## Buffer Pressure

| Buffer | Capacity | Average | Peak | Full time | Empty time | Result |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| OR grinder output | 30 | 18 | 28 | 3.8% | 1.4% | Stable |
| IR grinder output | 30 | 21 | 30 | 8.9% | 0.8% | Pressure before SF-IR |
| Bore output | 30 | 20 | 29 | 6.4% | 1.2% | Watch |
| SF-IR input | 20 | 17 | 20 | 18.6% | 0.2% | Constraint visible |
| DRY-OR internal | 25 | 16 | 25 | 5.1% | 7.0% | Batch rhythm |
| DRY-IR internal | 25 | 15 | 25 | 4.8% | 7.8% | Batch rhythm |
| OR main line WIP | 100 | 26 | 62 | 0.0% | 2.1% | Transport reserve |
| IR main line WIP | 100 | 24 | 59 | 0.0% | 2.7% | Transport reserve |
| Assembly storage OR | 400 | 114 | 226 | 0.0% | 4.9% | Absorbing upstream variation |
| Assembly storage IR | 400 | 96 | 208 | 0.0% | 7.4% | IR side follows SF constraint |
| Manual inspection table | 100 | 22 | 61 | 0.0% | 18.0% | Downstream reserve |

## State Time Summary

| Group | RUN | WAIT | BLOCK | DRESS | CHANGE | STOP/FAULT |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Feed | 41.0% | 58.5% | 0.5% | 0.0% | 0.0% | 0.0% |
| Grinding | 93.7% | 3.8% | 1.2% | 0.8% | 0.5% | 0.0% |
| Superfinish | 95.6% | 1.9% | 1.0% | 0.0% | 1.5% | 0.0% |
| Gauge | 53.8% | 45.5% | 0.5% | 0.0% | 0.2% | 0.0% |
| Drying | 87.8% | 7.4% | 4.8% | 0.0% | 0.0% | 0.0% |
| Main line | 40.6% | 2.4% | 0.0% | 0.0% | 0.0% | 0.0% |
| Assembly | 54.9% | 43.8% | 1.3% | 0.0% | 0.0% | 0.0% |
| Endpoint | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% |

## Maintenance and Consumables

| Process | Interval | Duration | Count | Lost time | Capacity impact |
| --- | ---: | ---: | ---: | ---: | ---: |
| OR grinding dressing | 300 pcs | 45 s | 16 | 12.0 min | 2.5% |
| IR grinding dressing | 300 pcs | 45 s | 16 | 12.0 min | 2.5% |
| Bore grinding dressing | 300 pcs | 45 s | 16 | 12.0 min | 2.5% |
| OR grinding consumable | 1,500 pcs | 180 s | 3 | 9.0 min | 1.9% |
| IR grinding consumable | 1,500 pcs | 180 s | 3 | 9.0 min | 1.9% |
| Superfinish oilstone | 1,200 pcs | 120 s | 4 | 8.0 min | 1.7% |
| Gauge probe check | 2,000 pcs | 60 s | 2 | 2.0 min | 0.4% |

## Yield and NG Flow

| Area | Input | Good | NG | Yield |
| --- | ---: | ---: | ---: | ---: |
| Raceway grinding OR | 4,982 | 4,932 | 50 | 99.0% |
| Raceway grinding IR | 4,937 | 4,888 | 49 | 99.0% |
| Bore grinding | 4,924 | 4,875 | 49 | 99.0% |
| Superfinish | 9,775 | 9,687 | 88 | 99.1% |
| Gauge total | 9,730 | 9,694 | 36 | 99.6% |
| Assembly pairing | 4,876 sets | 4,861 sets | 15 sets | 99.7% |
| Final assembly | 4,861 sets | 4,820 sets | 41 sets | 99.2% |

## Optimization Actions

| Priority | Action | Expected effect |
| ---: | --- | --- |
| 1 | Reduce SF-IR single-piece effective takt from 24.6 s to below 20.0 s | Raise line capacity from 147 pcs/h to about 180 pcs/h |
| 2 | Add one parallel SF-IR station or split two-pass superfinish load | Lower IR-side buffer full time by 70%+ |
| 3 | Keep gauge takt at 3-4 s and preserve inspection reserve | Prevent false bottleneck decisions from normal waiting time |
| 4 | Keep OR/IR main line at 3 s dispatch, 100 pcs WIP, 40 s travel | Maintain assembly feed smoothing without starving pairing |
| 5 | Apply loader-arm lowest-WIP delivery rule on OR/IR/SF buses | Reduce one-machine bias and stabilize machine utilization |
| 6 | Treat assembly storage as absorber, not as process bottleneck | Separate upstream grinding constraint from downstream reserve logic |
| 7 | Use background simulation for 8 h / 24 h before changing machine count | Avoid judging by short warm-up oscillation |

## Export Fields

| Category | Fields |
| --- | --- |
| Scenario | node id, edge id, process group, material type, station count, route rule |
| Takt | manual takt, calculated takt, cycle time, batch, uptime, yield, NG ratio |
| Buffer | input capacity, output capacity, current WIP, average WIP, peak WIP |
| Transfer | conveyor speed, travel time, in-transit capacity, loader cycle, pickup rule, delivery rule |
| State | RUN, WAIT, BLOCK, DRESS, CHANGE, STOP, FAULT, IDLE |
| Output | input count, output count, good count, NG count, final count |
| Analysis | bottleneck rank, capacity gap, buffer pressure, utilization rank, recommendation |

## Final Result

| Output | Quantity |
| --- | ---: |
| OR raceway output | 4,932 pcs |
| IR raceway output | 4,888 pcs |
| Grinding finished rings | 9,687 pcs |
| Assembly paired sets | 4,861 sets |
| Final packed sets | 4,820 sets |
| Remaining OR assembly storage | 114 pcs |
| Remaining IR assembly storage | 96 pcs |
