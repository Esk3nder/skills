# ImplementWithPrinciples Workflow

> **Trigger:** "implement UI", "accessibility", "responsive design"
> **Input:** UI requirement or existing code to improve
> **Output:** Implementation guidance with accessibility and responsive design built-in

## Step 1: Understand Requirements

Clarify before implementing:
- What is the UI component or feature?
- What devices/viewports must be supported?
- What accessibility level is required (A, AA, AAA)?
- Is there an existing design system to follow?

## Step 2: Accessibility Implementation

### Semantic HTML First

Use appropriate elements:

| Purpose | Element | NOT |
|---------|---------|-----|
| Navigation | `<nav>` | `<div class="nav">` |
| Button action | `<button>` | `<div onclick>` |
| Link navigation | `<a href>` | `<span onclick>` |
| Heading | `<h1>`-`<h6>` | `<div class="heading">` |
| List | `<ul>`, `<ol>` | Divs with bullets |

### ARIA When Needed

ARIA supplements, never replaces semantic HTML:

```html
<!-- Good: ARIA for custom widgets -->
<div role="tablist">
  <button role="tab" aria-selected="true" aria-controls="panel-1">Tab 1</button>
</div>

<!-- Bad: ARIA for native elements -->
<div role="button">Click me</div>  <!-- Just use <button> -->
```

### Keyboard Navigation

Ensure all interactive elements:
- Are focusable (natural or `tabindex="0"`)
- Show visible focus indicator
- Respond to expected keys (Enter, Space, Escape, Arrow keys)

```css
/* Visible focus indicator */
:focus-visible {
  outline: 2px solid #1a73e8;
  outline-offset: 2px;
}
```

### Screen Reader Support

| Requirement | Implementation |
|-------------|----------------|
| Images | `alt="description"` or `alt=""` for decorative |
| Icons | `aria-label` or visually hidden text |
| Dynamic content | `aria-live="polite"` for updates |
| Forms | `<label>` associated with input |
| Errors | `aria-describedby` linking to error message |

## Step 3: Responsive Implementation

### Mobile-First CSS

Start with mobile styles, add complexity for larger screens:

```css
/* Base (mobile) */
.container {
  padding: 1rem;
  flex-direction: column;
}

/* Tablet and up */
@media (min-width: 640px) {
  .container {
    padding: 2rem;
    flex-direction: row;
  }
}

/* Desktop */
@media (min-width: 1024px) {
  .container {
    max-width: 1200px;
    margin: 0 auto;
  }
}
```

### Fluid Typography

Use `clamp()` for smooth scaling:

```css
h1 {
  font-size: clamp(1.5rem, 4vw, 3rem);
}

p {
  font-size: clamp(1rem, 2vw, 1.125rem);
}
```

### Touch Targets

Minimum 44x44px for interactive elements:

```css
button, a {
  min-height: 44px;
  min-width: 44px;
  padding: 12px 16px;
}
```

### Container Queries (Modern)

Component-level responsiveness:

```css
.card-container {
  container-type: inline-size;
}

@container (min-width: 400px) {
  .card {
    flex-direction: row;
  }
}
```

## Step 4: Performance Considerations

### Image Optimization

```html
<img
  src="image-800.jpg"
  srcset="image-400.jpg 400w, image-800.jpg 800w, image-1200.jpg 1200w"
  sizes="(max-width: 640px) 100vw, 50vw"
  alt="Description"
  loading="lazy"
/>
```

### CSS Performance

- Avoid expensive selectors (deep nesting, universal)
- Use `will-change` sparingly for animations
- Prefer `transform` and `opacity` for animations

### Layout Stability

Prevent layout shift:
- Set explicit dimensions on images/videos
- Reserve space for dynamic content
- Use `font-display: swap` for web fonts

## Step 5: Provide Implementation

Deliver code with:
1. **Semantic HTML** structure
2. **CSS** with responsive breakpoints
3. **ARIA** attributes where needed
4. **Comments** explaining accessibility decisions

## Completion

After implementation:
1. Test with keyboard navigation
2. Test with screen reader (VoiceOver, NVDA)
3. Test at all breakpoints
4. Run automated accessibility check (axe, Lighthouse)

Ask: "Should I help test this implementation or make adjustments?"

## Skills Invoked

| Condition | Skill |
|-----------|-------|
| None | This workflow does not invoke other skills |
