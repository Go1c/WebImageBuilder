---
name: lumio-image-studio-design
description: Use this skill to generate well-branded interfaces and assets for Lumio Image Studio (img.lumio.games), either for production or throwaway prototypes/mocks/etc. Contains essential design guidelines, colors, type, fonts, assets, and UI kit components for prototyping.
user-invocable: true
---

Read the README.md file within this skill, and explore the other available files.

Key facts: all UI copy is Simplified Chinese; light theme = Studio mood (white cards on #fafafa), dark theme = Canvas mood (near-black #090a0f + dot-grid texture + orange annotation marks); domain identity colors are violet #8b78f5 (generation), teal #2cd4be (canvas), green #00bc7d (money); the admin surface uses its own `.ad-*` system (dark sidebar #16181F + light workspace + #5B61E8 accent). Link the root `styles.css` for all tokens. Two runnable hi-fi prototypes live in `designs/unified-shell/` and `designs/admin/` — copy their patterns (pills, buttons, ConfirmDialog, Toast, empty states) rather than inventing new ones.

If creating visual artifacts (slides, mocks, throwaway prototypes, etc), copy assets out and create static HTML files for the user to view. If working on production code, you can copy assets and read the rules here to become an expert in designing with this brand.

If the user invokes this skill without any other guidance, ask them what they want to build or design, ask some questions, and act as an expert designer who outputs HTML artifacts _or_ production code, depending on the need.
