# Background Simulation Report

| Item | Value |
| --- | ---: |
| Scenario | Bearing raceway + assembly |
| Run length | 8 h |
| Target output | 10,000 pcs |
| Simulated output | 9,820 pcs |
| Line capacity | 146.4 pcs/h |
| Balance rate | 82.7% |
| Bottleneck | SF-IR-01 |

## Bottleneck

SF-IR-01 is the current capacity constraint. Its effective output is lower than upstream IR grinding and lower than the downstream assembly buffer demand.

## Operations View

| Area | Capacity | Status |
| --- | ---: | --- |
| Feed + gauge | 1,071 pcs/h | Ready |
| OR grinding | 479 pcs/h | Balanced |
| IR grinding | 473 pcs/h | Balanced |
| SF-IR-01 | 146 pcs/h | Bottleneck |
| Assembly storage | 400 + 400 pcs | Buffering |
| Final packing | Unlimited sink | Ready |

## Suggested Adjustment

1. Reduce SF-IR-01 cycle time.
2. Add one parallel SF station.
3. Lower upstream transfer batch size if output buffer pressure is too high.
4. Keep assembly storage as a downstream absorber instead of treating it as a bottleneck.
