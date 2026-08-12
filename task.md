## Design Context

### Users
Students and faculty at FAST campus who need a reliable, private carpool service. The context is often quick, on-the-go checks to see if a seat is available and to book it seamlessly. The primary job is to coordinate daily rides efficiently without the noise of ad-hoc WhatsApp groups.

### Brand Personality
**Friendly, Accessible, Casual**
Despite the dark, technical dashboard look, the actual tone and language should feel approachable and human. The emotional goal is to evoke confidence, reliability, and precision (like a well-oiled machine) while remaining calm, exclusive, and premium.

### Aesthetic Direction
**Theme:** Dark mode ("dashboard instrument cluster")
**Palette:** Asphalt (`#0b0d10`), Panel (`#16191d`), Chrome (`#c9cdd3`), Warmwhite (`#f2f1ed`). Accents in Route-Green and Signal-Amber.
**Typography:** Space Grotesk (Display/UI) for a technical but accessible feel; JetBrains Mono (Data) for precise numeric readouts.
**Anti-references:** Must explicitly avoid looking like a generic corporate app; it should feel custom, bespoke, and tailored to the closed university group.

### Design Principles
1. **Precision Meets Approachability:** The interface should look technical and precise (monospace numbers, dark panels) but the copy and interactions must remain friendly and casual.
2. **Instant Clarity:** The core actions (seat availability, booking status) must be immediately scannable using stark contrast (amber/green on dark asphalt).
3. **Exclusive, not Corporate:** Leverage the bespoke styling to make the passengers feel they are using a premium, closed-group service rather than a generic mass-market SaaS.

## Frontend Requirements & History
Below is a consolidated list of the frontend requirements and adjustments gathered throughout the project:

### 1. Typography & Readability
- **Time Format:** Use the 12-hour format for approval times.
- **Route Display:** Route heading arrows should match the arrows used in the route line (changed to white from grey).
- **Contrast Improvements:** Improved visibility of previously grey text ("Sign out", "Route Heading", "Next Trip", "Contact Me").

### 2. Layout & Information Hierarchy
- **Approval State:** The Approval time and message must be the main attraction once a ride is approved.
- **Trip Rate:** Rate display moved to the top of the dashboard (where the welcome message used to be, above the car layout) and made more significant/centered.
- **Sidebar Navigation:** Implemented a navigable, toggleable overlay drawer sidebar (similar to Claude Desktop UI) for scheduled trips. The welcome message was moved here.
- **Spacing:** Ensure footer contact details are always fully visible and not hidden by sticky elements.

### 3. Aesthetics & Styling
- **Color Scheme:** Accent color shifted to a red scheme for Route Headings, Book Ride buttons, and Signout text.
- **Approved State:** The Approved button state must distinctively avoid red (uses emerald green/success styling).
- **Anti-AI Slop:** Avoid over-boxing elements. Removed "frosted panels/boxes" from the Trip Rate and Next Trip displays in favor of typography-driven hierarchy.

### 4. Engineering & UX Principles
- **HCI Revamp:** Maintained a centered dashboard layout; the sidebar must act as an overlay rather than shifting the main content.
- **System Hardening:** Fortify the interface against edge cases (e.g., extremely long text, missing data, network errors) via truncation and defensive coding.
- **Normalization:** Strictly adhere to established design system tokens (e.g., standardizing custom green classes to `emerald-500`).
- **Performance:** Optimize React rendering (e.g., using `useMemo` for derived states) for a smoother user experience. Optimize Sidebar opening and hiding performance.
