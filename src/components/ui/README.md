# Nyabag UI Primitives

Nyabag UI should feel compact, calm, and deliberate. New feature UI should start from these components instead of adding global control classes.

For the full product design system, see `docs/NYABAG_DESIGN_SYSTEM.md`.

## Actions

- Use `Button` for every app action.
- Use `IconButton` for toolbar-only actions and always provide `aria-label`, `label`, or `title`.
- Prefer `default` for primary actions, `outline` for secondary actions, `ghost` for low-emphasis actions, and `destructive` only for irreversible actions.
- Use `sm` or `md` sizes in dense app surfaces.

## Forms

- Use `Field`, `FieldLabel`, `FieldHint`, and `FieldError` around `Input` and `Textarea`.
- Keep validation text close to the field and use `FieldError` for errors.
- Avoid new `.field` CSS. It remains only for legacy surfaces.

## Overlays

- Use `Dialog` for modal flows and keep the structure:
  `DialogContent`, `DialogHeader`, `DialogTitle`, optional `DialogDescription`, body content, and `DialogFooter`.
- Use `DropdownMenu`, `Popover`, `Tooltip`, `Tabs`, and `Sheet` for their matching interaction patterns instead of hand-rolled overlays.

## Content

- Use `Card` only for grouped content, not every layout container.
- Use `Badge` for metadata and `StatusBadge` for known workflow states.
- Use `EmptyState` for empty screens or empty panels.
- Use `Skeleton` for loading placeholders.
- Use `Kbd` for keyboard shortcuts.

## Tokens

- Tailwind utilities read semantic HSL tokens such as `background`, `surface`, `border`, `primary`, `accent`, `success`, and `warning`.
- Legacy CSS variables such as `--bg`, `--text`, `--border`, and `--accent` stay mapped for compatibility.
- Do not redefine control colors in global CSS for new work; extend the primitive variants instead.
- App spacing uses 8px increments. Prefer `p-2`, `p-4`, `p-6`, `gap-2`, `gap-4`, `px-4`, and `py-2`.
- App radius is strictly `10px`. Use `rounded-[10px]` or the global `--radius` token.
- Run `npm run check:colors` and `npm run check:design-system` before handing off UI changes.
