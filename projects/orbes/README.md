# ORBES case study draft

Static case study at `projects/orbes/`, linked from the existing homepage ORBES entry. Since the October 2026 redesign it uses the shared drafting-table styles and behavior in `assets/css/gy.css` and `assets/js/gy.js`, plus page rules inline in its `<style>` block. Relative links support the GitHub Pages project base `/Public-Portfolio-/` and local file previews.

The contribution section summarizes mechanical controls, reaction-wheel PID control, ROS2 simulation, motor PCB commissioning and EKF/avionics/VIO integration. The approved hardware photograph and architecture diagram are included. Implementation constraints, recorded demonstrations and measured results remain pending. The interactive walkthrough remains conceptual. Confirm and approve content before replacing the remaining placeholders.

At widths of 1640px and above, the section index is fixed in the outer left gutter, 112px below the viewport top. Smaller windows use compact sticky navigation. Native links, visible focus, readable no-JavaScript content and reduced-motion support are retained.

Validation covers JavaScript syntax, local paths, anchor targets and interaction logic. Rendered desktop/mobile, keyboard and overflow checks remain outstanding because an interactive browser was unavailable during preparation. No build step is required.

## Architecture and controls narrative

The approved fan-platform GNC diagram is reproduced unchanged in `assets/images/orbes/fan-platform-architecture.png` (661 x 591 pixels). Architecture credit belongs to Gavin. The figure includes a full-size link and a text description. It is distinct from the reaction-wheel work and is not evidence of measured hardware performance.

The narrative describes PID for initial hardware-in-the-loop work, followed by LQR to coordinate coupled states. Observability considerations informed sensor fusion separately. It makes no claim of formal rank proofs, measured gains or LQR hardware validation. Demonstration footage and validated results remain pending.

Embedded diagram-editor metadata is omitted from the public PNG; image data and visible diagram content are unchanged.

## Hardware photograph

Gavin supplied and approved the hardware photograph used in the homepage card and case-study hero. assets/images/orbes/hardware.png preserves the supplied PNG unchanged at 875 × 630 pixels. Both placements show the full frame without cropping. The photograph documents the physical hardware; it is not presented as a demonstration or performance measurement.

## Hardware-result and investigation scope

An earlier version of the site claimed a ±5° attitude hold measured on the robot. On 2026-10-25 the ORBES-sim session confirmed that the figure came from simulation only and that the one recorded bench control attempt was a documented failure, so the homepage and case study no longer state it. The replacement figure is the 3,817 MuJoCo Monte Carlo runs in ltmps/ORBES-sim: 910 in the design-cone campaign (October 18 to 20, where the 0.50 m inward orbit passed 50/50 and the 0.55 m sketch passed 8/50) and 2,907 in the measured-cone campaign (October 25). At the measured cone the sizing rule placed both failure boundaries, orbit radius and lemniscate amplitude, within one sweep step of the predicted bound. The ORBES-sim session supplied these totals from the final CSVs. The LQR paragraph describes a design change, while the estimator and allocator stories describe specific diagnostic experiments. The archive reports a transient spike absent in the October 29 follow-up, full-axis tests on October 30, and allocator diagnostics in November. These do not demonstrate universal estimator accuracy or complete autonomous-loop stability. Ed advised some EKF tuning weights. The page keeps the simulation result and design/diagnostic stories distinct without repeating these editorial caveats.
