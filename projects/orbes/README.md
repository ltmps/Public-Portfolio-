# ORBES case study draft

Static case study at `projects/orbes/`, linked from the existing homepage ORBES entry. Styles and interaction code are loaded only by this page from `assets/css/orbes.css` and `assets/js/orbes.js`. Relative links support the GitHub Pages project base `/Public-Portfolio-/` and local file previews.

The contribution section summarizes mechanical controls, reaction-wheel PID control, ROS2 simulation, motor PCB commissioning and EKF/avionics/VIO integration. Media, detailed design rationale, constraints, actual architecture and results await supporting evidence. The diagram remains conceptual; no recorded demonstration, measured trace or performance figure is included. Confirm and approve content before replacing the remaining placeholders.

At widths of 1640px and above, the section index is fixed in the outer left gutter, 112px below the viewport top. Smaller windows use compact sticky navigation. Native links, visible focus, readable no-JavaScript content and reduced-motion support are retained.

Validation covers JavaScript syntax, local paths, anchor targets and interaction logic. Rendered desktop/mobile, keyboard and overflow checks remain outstanding because an interactive browser was unavailable during preparation. No build step is required.

## Architecture and controls narrative

The approved fan-platform GNC diagram is reproduced unchanged in `assets/images/orbes/fan-platform-architecture.png` (661 x 591 pixels). Architecture credit belongs to Gavin. The figure includes a full-size link and a text description. It is distinct from the reaction-wheel work and is not evidence of measured hardware performance.

The narrative describes PID for initial hardware-in-the-loop work, followed by LQR to coordinate coupled states. Observability considerations informed sensor fusion separately. It makes no claim of formal rank proofs, measured gains or LQR hardware validation. Hardware media and validated results remain pending.

Embedded diagram-editor metadata is omitted from the public PNG; image data and visible diagram content are unchanged.
