---
version: alpha
name: Malo
description: Korean conversation practice with character dialogue, lime actions and calm learning cards.
colors:
  ink: "#111111"
  sub: "#6B6B6B"
  line: "#E6E4DE"
  background: "#F3F2EE"
  primary: "#D4FF4F"
  white: "#FFFFFF"
  profileSurface: "rgba(255,255,255,0.94)"
  danger: "#FF4D4F"
typography:
  sans:
    fontFamily: NotoSansKR_400Regular
rounded:
  card: 20px
  button: 28px
  pill: 999px
omitted:
  - section: spacing
    reason: Existing component-local geometry remains owned by src/components/ui.tsx.
components:
  button: {}
  card: {}
  dialog: {}
---

# Malo Design System

## Overview
Korean conversation practice for international students. Mobile layouts, character dialogue and clear feedback follow the existing app, not a new visual direction. Korean source dialogue may have a selected-language subtitle. Existing API and behavior contracts are in docs/FE_INTEGRATION.md and docs/FE_MIGRATION_V2.md.

## Colors
The values above document the existing palette. `src/lib/theme.ts` C is the runtime source; shared components import C. This document does not generate or replace tokens. Lime marks primary actions and red marks errors; textual messages also convey state.

## Typography
Runtime typography is F in `src/lib/theme.ts`: Noto Sans KR regular, medium, bold and black. The existing logo asset/Black Han Sans treatment remains unchanged.

## Layout
`src/components/ui.tsx` owns Screen, FRAME, safe areas and shared geometry. Scene voice loading and errors retain the dialogue card and replay control. No dimensions change for this audio fix.

## Elevation & Depth
Existing cards, character layers and Sheet/Modal primitives own depth. Audio behavior adds no overlays.

## Shapes
Runtime R in `src/lib/theme.ts` owns card 20, button 28 and pill 999 radii. This fix changes no shapes or colors.

## Components
Scene playback owns its session player; `src/lib/voice.ts` owns demo-ending and expression-practice playback. Both use the same server voice contract. A stale response must not start an old line. Existing notice text and ending error/replay state own recoverable audio errors.

## Patterns
Language selection is required once before learning: 한국어, 日本語, English and 中文, using bundled Twemoji flags and 74px radio cards. This language controls explanations and translated subtitles; the learning pack remains Korean. Switching language filters old subtitles by language and requests fresh chapter/briefing translations. Existing users confirm the language once; Settings reopens the same screen. Translation errors offer retry rather than displaying another language. Entry briefings show one situation sentence and one learning-goal sentence only in the selected guide language, including labels. Do not duplicate Korean source text or add simulation/turn-count boilerplate.

After each answer, the current O/△/X/? symbol appears in a 48px upper-right button. It never opens feedback automatically or blocks the next input. Explicit tap opens a scrollable feedback sheet with close and retry; retry restores the actual previous question through the server. AI replies remain on screen and play completely, without a timer replacing them with authored dialogue. Only a completed story transitions to results after its final voice finishes. Shared sheets are capped at 90% of the viewport so long feedback remains reachable.

Personality photo cards reuse existing character assets: cheerful uses a smile, picky uses a mild frown, calm retains the bundled portrait. `personaPhoto` selects known reactions from the public asset catalog and excludes ending art. Card geometry and selection remain stable while images load; offline or broken images retain the bundled portrait. No image generation occurs on selection.

The home character artwork has a 44px circular profile disclosure at its upper right. `CharacterProfileOverlay` owns this non-modal inline layer: white 94% opacity, scrollable content, close toggle and Escape on web. The covered artwork cannot start a scene or take keyboard focus; footer and navigation stay available. `C.profileSurface` owns the surface color. Profile content comes from the selected server personality, with explicit loading, unavailable, error and retry states. Switching character/personality closes the disclosure and never shows the previous profile.

Demo mode controls the learning script and local evaluation; it does not select a device narrator. All character speech uses authenticated, cached server MP3s. Failure preserves text and offers replay. No silent fallback to device TTS. Author-defined demo reaction emotions are independent of learner score. Runtime checks: lint, typecheck, test:voice and web export; browser verification includes the existing demo scene and replay.
