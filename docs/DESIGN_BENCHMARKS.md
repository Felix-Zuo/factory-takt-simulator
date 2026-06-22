# Design Benchmarks

This note records the public design references used to improve the Factory Takt Simulator showcase page. It is a design-orientation document, not a claim of feature parity with commercial simulation products.

## References Reviewed

- [FlexSim 3D Simulation Modeling Software](https://www.flexsim.com/flexsim/)
- [Siemens Tecnomatix Plant Simulation](https://www.siemens.com/en-us/products/tecnomatix/plant-simulation-software/)
- [AnyLogic Simulation Software](https://www.anylogic.com/)
- [Simio Digital Twin Simulation Software](https://www.simio.com/)
- [React Flow](https://reactflow.dev/)
- [React Flow Showcase](https://reactflow.dev/showcase)
- [Supabase](https://supabase.com/)
- [Linear](https://linear.app/)

## Design Takeaways

- Lead with the actual product surface, not generic decorative graphics.
- Make the first screen explain what the product does, who it is for, and what action to take next.
- Show trustworthy proof early: validation, license, public data boundary, release state, and live deployment.
- Use concise capability sections that match real workflows instead of broad marketing claims.
- Pair product screenshots with concrete operational outcomes: capacity, line balance, transfer time, reports, and bottleneck review.
- Keep visual density controlled. The page should feel like engineering software, not a landing-page template.

## Applied To This Project

- The hero now uses a real workbench screenshot as the full-bleed background.
- The page opens with a direct product promise and three working actions: open workbench, load template, view GitHub.
- The middle sections are split into product capabilities, operating workflow, product surface, integration bridge, roadmap, and engineering evidence.
- The color system now alternates dark industrial sections with light documentation-style sections to improve scanning and reduce one-note dark panels.
- The public data boundary remains visible so the showcase does not imply disclosure of private factory work.
