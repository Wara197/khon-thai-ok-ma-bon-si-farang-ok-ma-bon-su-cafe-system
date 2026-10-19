---
name: Coffee Shop POS
description: A contemporary cafe service system with warm, precise tools for ordering, preparation, and oversight.
colors:
  espresso-deep: "#352a23"
  roast-dark: "#44362d"
  roast-mid: "#5b493c"
  roast-soft: "#77624f"
  roast-light: "#947a64"
  toasted-caramel: "#8b603e"
  caramel-highlight: "#b08a69"
  caramel-deep: "#765038"
  caramel-soft: "#efe4d8"
  oat-ground: "#f4f0e9"
  oat-surface: "#ebe5dc"
  oat-border: "#dcd3c7"
  oat-divider: "#c7b9a8"
  warm-ink: "#352f29"
  muted-ink: "#665d54"
  soft-ink: "#756c61"
  surface-cream: "#fbf9f5"
  botanical-wash: "#e8ede8"
  botanical-ink: "#53675c"
  clay-wash: "#f5e6e2"
  clay-edge: "#ddb6aa"
  clay-ink: "#a54f3f"
  pending-wash: "#f1e7d8"
  pending-edge: "#d8bd98"
  pending-ink: "#805b38"
  preparing-wash: "#f2e3d8"
  preparing-edge: "#d7b198"
  preparing-ink: "#8b583c"
  ready-wash: "#e2e9e1"
  ready-edge: "#b3c4b1"
  ready-ink: "#4d6652"
  complete-wash: "#eae6df"
  complete-edge: "#cec5b9"
  complete-ink: "#625c54"
typography:
  body:
    fontFamily: "Prompt, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif"
    fontSize: "clamp(15px, 0.2vw + 14px, 16px)"
    fontWeight: 400
    lineHeight: 1.5
  title:
    fontFamily: "Prompt, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif"
    fontSize: "clamp(1.25rem, 1.6vw, 1.5rem)"
    fontWeight: 700
    lineHeight: 1.2
  numeric:
    fontFamily: "Prompt, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif"
    fontWeight: 600
rounded:
  sm: "6px"
  md: "10px"
  lg: "14px"
  xl: "18px"
  2xl: "22px"
  full: "9999px"
spacing:
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  2xl: "24px"
  3xl: "28px"
components:
  button-primary:
    backgroundColor: "{colors.toasted-caramel}"
    textColor: "{colors.surface-cream}"
    rounded: "{rounded.md}"
    padding: "14px"
  button-primary-hover:
    backgroundColor: "{colors.caramel-deep}"
    textColor: "{colors.surface-cream}"
  card-product:
    backgroundColor: "{colors.surface-cream}"
    textColor: "{colors.espresso-deep}"
    rounded: "{rounded.lg}"
    padding: "16px"
  card-queue:
    backgroundColor: "{colors.surface-cream}"
    textColor: "{colors.warm-ink}"
    rounded: "{rounded.lg}"
    padding: "20px"
  nav-selected:
    backgroundColor: "{colors.toasted-caramel}"
    textColor: "{colors.surface-cream}"
    rounded: "{rounded.full}"
    padding: "8px 20px"
  chip-selected:
    backgroundColor: "{colors.roast-dark}"
    textColor: "{colors.surface-cream}"
    rounded: "{rounded.full}"
    padding: "8px 18px"
  option-choice:
    backgroundColor: "{colors.oat-ground}"
    textColor: "{colors.warm-ink}"
    rounded: "{rounded.md}"
    padding: "12px 14px"
  dialog:
    backgroundColor: "{colors.surface-cream}"
    textColor: "{colors.warm-ink}"
    rounded: "{rounded.xl}"
    padding: "20px 24px"
---

# Design System: Coffee Shop POS

## Overview

**Creative North Star: "The Contemporary Coffee Atelier"**

The interface brings the considered warmth of a contemporary cafe to everyday service software. Deep-roast ink and oat-tinted surfaces form a calm foundation; a restrained toasted-caramel accent marks selection and the next useful action. The feeling is premium and composed, while controls remain familiar and quick to operate.

The cashier and barista work areas are designed for tablet and large touch displays. Product choices, order totals, queue states, and primary actions stay easy to scan. The owner's dashboard uses the same system in a denser desktop layout. Information hierarchy comes from spacing, weight, and surface contrast instead of decorative gradients or generic black-and-white contrast.

**Key Characteristics:**
- Warm oat neutrals and deep, brown-tinted ink.
- Prompt provides one consistent Thai and Latin type voice; tabular numerals keep prices aligned.
- Refined 6–18px surface corners, with pills reserved for compact controls.
- Solid, restrained accents; soft ambient shadows and a higher modal layer.

## Colors

Deep Roast & Oat pairs warm cream surfaces with brown-tinted ink, toasted caramel actions, and muted botanical and clay status colors.

### Primary
- **Roast Scale** (`espresso-deep` through `roast-light`): A warm brown scale for the shared navigation, important labels, and hierarchy; it replaces generic near-black UI ink.
- **Toasted Caramel** (`toasted-caramel`, `caramel-soft`): A muted clay-caramel marks the selected tab, key actions, and selected options. Use it as a solid accent rather than a gradient.

### Secondary
- **Botanical Sage** (`botanical-wash`, `botanical-ink`): Reserved for informative states and supporting dashboard data.
- **Soft Clay** (`clay-wash`, `clay-ink`): Reserved for errors and destructive or attention states.

### Neutral
- **Oat Ground & Surface** (`oat-ground`, `oat-surface`, `surface-cream`): Warm tinted page and card surfaces that remain distinct without a stark white/black split.
- **Oat Borders** (`oat-border`, `oat-divider`): Quiet dividers and component outlines; do not double every shadow with a heavy border.
- **Warm Ink** (`warm-ink`, `muted-ink`, `soft-ink`): Primary, supporting, and subtle text colors. Keep body text at readable contrast.

### Named Rules
**The One Accent Rule.** Toasted caramel identifies the current action or selection; don't build a screen from competing saturated accents.

## Typography

**Display Font:** Prompt (with system sans-serif fallbacks)
**Body Font:** Prompt (with system sans-serif fallbacks)
**Label/Mono Font:** Prompt with tabular numerals for prices and measurements

**Character:** Prompt keeps Thai and Latin copy coherent and crisp. Fluid base and heading sizes preserve hierarchy across tablet and desktop widths; weight and tabular alignment distinguish numbers without introducing a second generic font.

### Hierarchy
- **Title** (700, fluid 1.25–1.5rem, 1.2 line-height): Screen and section titles.
- **Body** (400, fluid 15–16px, 1.5 line-height): Product information, forms, and working copy.
- **Label** (500, 0.75–0.9rem): Navigation subtitles, filter labels, and concise metadata.
- **Numeric** (600–700, tabular lining numerals): Prices, totals, and queue identifiers, using the surrounding component's established size.
- In owner KPI values, the baht symbol is slightly smaller and lighter than the amount, with a deliberate baseline gap; keep the amount as the visual anchor.
- In the barista queue summary, counts lead and status labels sit beneath them so numbers remain distinct at a glance.

## Layout

Keep a clear shared top navigation and align each screen to its job. It stays 72px tall on wide layouts; below 1024px it becomes a 124px two-row header so the brand, branch controls, and workflow tabs remain readable and touchable. The cashier pairs a product grid (210px minimum card column) with a sticky 400px cart on wide displays. The barista queue uses clear status filters and cards (320px minimum on wide layouts); the owner dashboard prioritizes scannable metrics and tables on desktop. The existing responsive thresholds are 1024px, 768px, and 680px. Preserve touch targets of at least 44px on service screens.

## Elevation & Depth

Use warm-tinted, soft shadows to separate nearby surfaces. Cards sit close to the canvas; hover raises interactive cards subtly. The dialog is the strongest foreground layer, with its existing dimmed backdrop and xl shadow. Keep borders light and avoid stacking strong border and shadow treatments together.

**The Modal Foreground Rule.** Reserve the strongest lift for dialogs; working cards use ambient separation only.

## Shapes

The refined corner scale is 6px for compact details, 10px for controls, 14px for cards, and 18px for dialogs. A 22px radius is reserved for larger outer groupings. Full pills belong to filters and small counters, not every surface. Keep borders crisp and warm rather than cool gray.

## Components

- **Primary action:** Solid toasted caramel with warm off-white text, a 10px radius, and a restrained warm shadow. Hover darkens the same color family.
- **Navigation:** Deep-roast shell with a caramel selected state; retain 44px minimum tab height for touch.
- **Product card:** Warm off-white surface with light oat border and shadow. The whole card is one keyboard- and touch-operable selection target; a visible toasted-caramel action cue keeps the next step obvious.
- **Required drink options:** Drink type defaults to Hot and cup size defaults to S; staff can change either with one touch. Selected controls use a solid toasted-caramel treatment with warm off-white text and a check.
- **Optional modifiers:** Five sweetness choices use a touch-friendly, equal-sized 3-column responsive grid with restrained lift. Toppings use compact 3-column choice buttons on tablet and 2 columns on narrow screens, with clear check marks.
- **Customization actions:** The total price uses a strong numeric hierarchy, paired with a prominent toasted-caramel add-to-cart action in the modal footer.
- **Queue filter:** Full pill with a 44px minimum target; selected filters use the deep-roast tone.
- **Queue card:** Oat-white surface with a quiet border and warm shadow. Status remains visible through its paired status color and label.
- **Dialog:** 18px corners, warm off-white surface, clear title/body hierarchy, and the highest elevation. Drink customization keeps its quantity control and confirm action visible together at standard tablet heights; choice and quantity controls retain comfortable touch targets.

## Do's and Don'ts

### Do:
- **Do** use the shared semantic tokens across cashier, barista, and owner surfaces.
- **Do** let spacing, weight, and clear state labels carry the hierarchy.
- **Do** use tabular numerals for values that should scan or align quickly.
- **Do** keep touch targets at least 44px where staff act during service.
- **Do** reserve status colors for their operational meaning.

### Don't:
- **Don't** use pure black, Inter, or saturated orange/purple gradients.
- **Don't** let a gradient carry an action state; use a solid token instead.
- **Don't** use cool gray as the default border or canvas color.
- **Don't** make every surface a pill or oversized rounded card.
- **Don't** rely on color alone to communicate order status.
