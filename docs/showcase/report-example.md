# Factory Takt Simulator Report Example

This sample report is synthetic. It demonstrates the report format for a generic modular process line and does not describe a real customer route, product, machine, operator, or production plan.

## Run Summary

| Report ID | Scenario | Mode | Horizon | Speed |
| --- | --- | --- | --- | --- |
| FTS-2026-0619-G01 | Generic Process A/B/C + Merge Line | Background simulation | 8 h | 120x |

| Metric | Value |
| --- | ---: |
| Finished output | 4,720 pcs |
| Simulated capacity | 590 pcs/h |
| Theoretical bottleneck capacity | 612 pcs/h |
| Line balance | 82.4% |
| Top bottleneck | FIN-B |

## Route

```text
FEED
  -> PROC-A-01 / PROC-A-02
  -> QA-A-01 / QA-A-02
  -> FIN-A-01 / FIN-A-02
  -> DRY-A
  -> MERGE

FEED
  -> PROC-B-01 / PROC-B-02
  -> QA-B-01 / QA-B-02
  -> PROC-C-01 / PROC-C-02
  -> QA-C-01 / QA-C-02
  -> FIN-B-01 / FIN-B-02
  -> DRY-B
  -> MERGE

MERGE
  -> WASH-A / WASH-B
  -> QA-A1 / QA-B1
  -> QA-A2 / QA-B2
  -> JOIN
  -> FASTEN
  -> WASH
  -> FUNC
  -> PERF
  -> FILL
  -> PRESS
  -> SURFACE
  -> PACK
```

## Bottleneck Ranking

| Rank | Stage | Capacity | Waiting | Blocking | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | FIN-B | 612 pcs/h | 4.1% | 18.7% | Downstream merge bursts amplify output blocking. |
| 2 | PROC-C | 650 pcs/h | 7.8% | 6.2% | Fed by the B-side branch, sensitive to loader-arm batch size. |
| 3 | JOIN | 690 pcs/h | 12.4% | 1.9% | Often waits for the slower B-side paired input. |
| 4 | FIN-A | 710 pcs/h | 3.5% | 8.1% | Close to balanced after dryer travel delay. |

## Transfer Checks

| Link | Type | Batch | Timing | Rule |
| --- | --- | ---: | --- | --- |
| FEED -> PROC-A group | Loader arm bus | 5 pcs | 15.0 s cycle | Deliver to the lowest-WIP available station. |
| FEED -> PROC-B group | Loader arm bus | 5 pcs | 15.0 s cycle | Skip blocked downstream ports. |
| FIN-A -> MERGE | Conveyor | 1 pc | 3.0 s dispatch, 40 s travel | Stop in-flight release when the merge input gate closes. |
| FIN-B -> MERGE | Conveyor | 1 pc | 3.0 s dispatch, 40 s travel | Same rule as A-side main line. |
| MERGE -> JOIN | Conveyor | 1 pc | 3.0 s dispatch | Synchronize A/B inputs at the join station. |

## Recommendations

| Priority | Action | Expected Effect |
| ---: | --- | --- |
| 1 | Add one parallel FIN-B station or shorten FIN-B process time | Reduce the highest blocking signal and raise finished output. |
| 2 | Increase MERGE B-side input capacity from 400 to 520 pcs | Absorb dryer travel bursts without starving JOIN. |
| 3 | Lower loader-arm trigger batch on the PROC-B to PROC-C group from 5 to 4 | Reduce wait-pick time when PROC-B output is intermittent. |
| 4 | Keep FIN-A unchanged until FIN-B is stabilized | FIN-A is near balanced and is not the current constraint. |

## Public-Sharing Note

The values above are illustrative. A real scenario should be reviewed for customer names, line IDs, route names, private takt targets, and raw machine parameters before being committed to a public repository.
