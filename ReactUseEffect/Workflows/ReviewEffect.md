# ReviewEffect Workflow

> **Trigger:** User writing useEffect, reviewing Effects, or discussing React state patterns
> **Input:** React component code or question about Effects
> **Output:** Best practice recommendation with code example

## Step 1: Identify Pattern

Determine what the user is trying to do:
- Derived state from props
- Expensive calculations
- Resetting state on prop change
- Responding to user events
- Notifying parent components
- Data fetching

## Step 2: Check If Effect Is Needed

Apply the "You might not need an Effect" principle:

| Situation | Avoid | Prefer |
|-----------|-------|--------|
| Derived state | `useState` + `useEffect` | Calculate during render |
| Expensive calculations | `useEffect` to cache | `useMemo` |
| Reset state on prop change | `useEffect` with `setState` | `key` prop |
| User event responses | `useEffect` watching state | Event handler directly |
| Notify parent | `useEffect` calling `onChange` | Call in event handler |

## Step 3: Provide Recommendation

If Effect IS needed (e.g., data fetching):
- Show cleanup pattern with AbortController
- Warn about race conditions
- Suggest using framework data fetching when available

## Completion

Best practice recommendation delivered with code example.

## Skills Invoked

| Step | Skill |
|------|-------|
| None | Self-contained knowledge skill |
