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
Home's scene title, state and progress occupy a solid white full-width footer, including its outer padding. The café background ends above this footer; it must not show around the text panel.

Realtime transcription connects only on microphone input and reuses its live socket across turns. Text entry and report/export screens never prewarm a speech session. Pending connection requests are shared, leaving the scene cancels them, and rate-limit retries respect the server cooldown while file recording remains available.

Ending character art uses `contain` for both server and bundled assets inside its reserved image frame. Never crop a full-body reaction with `cover`: the face and full pose must remain visible at narrow and wide card widths. The same `EndingDialogue` owns current results and reopened saved endings.

Character expressions use the server's transparent image URL, with the bundled portrait as a loading/error fallback. `CharacterActor` preloads changes, fades the new pose in, and shows a brief speech-bubble reaction to the character's right. The bubble sits 104px inside the scene's right edge, leaving 30px between it and the 50px hint control at a 24px inset, including at narrow mobile widths. The actor emotion is independent of O/△/X/? learning judgment. Happy, angry, sad and confused reactions have quiet original local audio cues; Settings and pause controls share a persisted sound-effects toggle. Reduced motion uses a static brief reaction. Replays, input typing and unrelated state updates must not retrigger a reaction; recording, pause and unmount stop effects. Existing C colors and Feather icons own the visual treatment.

Profile disclosure contains seven concise rows only: name, occupation, age, hobbies, favorite foods, dislikes and current interests. `/characters/{characterId}/personalities/{personalityId}/profile?language=…` owns translated card facts; `profileCopy` owns labels. Raw prompt biographies, relationship lectures and sample speech do not appear on the card. Locale is for international students learning Korean; Japanese support does not imply Japan-specific business flows.

Home follows the supplied photo-card reference: character and background fill the hero, a white bottom card overlaps the artwork, and the black state tag sits above the scene title. The subtitle combines character, personality and actual status. The progress track uses the saved current checkpoint (completed cards are full; a new next scene starts at zero), never a sample percentage. Two navigation tiles and the main action stay below the hero. Short viewports scroll rather than shrinking the artwork away. A 44px white ⋯ button sits at the artwork's upper right and opens the character traits sheet.

Language selection is required once before learning: 한국어, 日本語, English and 中文, using bundled Twemoji flags and 74px radio cards. This language controls explanations and translated subtitles; the learning pack remains Korean. Switching language filters old subtitles by language and requests fresh chapter/briefing translations. Existing users confirm the language once; Settings reopens the same screen. Translation errors offer retry rather than displaying another language. Entry briefings show one situation sentence and one learning-goal sentence only in the selected guide language, including labels. Do not duplicate Korean source text or add simulation/turn-count boilerplate.

After each answer, the current O/△/X/? symbol appears in a 48px upper-right button. It never opens feedback automatically or blocks the next input. Explicit tap opens a scrollable feedback sheet with close and retry; retry restores the actual previous question through the server. AI replies remain on screen and play completely, without a timer replacing them with authored dialogue. Only a completed story transitions to results after its final voice finishes. Shared sheets are capped at 90% of the viewport so long feedback remains reachable.

Personality photo cards reuse existing character assets: cheerful uses a smile, picky uses a mild frown, calm retains the bundled portrait. `personaPhoto` selects known reactions from the public asset catalog and excludes ending art. Card geometry and selection remain stable while images load; offline or broken images retain the bundled portrait. No image generation occurs on selection.

The home character artwork has a 44px circular ⋯ button at its upper right (no refresh/loading icon). It opens `CharacterTraitsSheet`, the same bottom sheet as the ⋯ on the character list: `GET /characters/{id}/personalities/{id}/profile?language=` summarized as age · occupation, hobbies, dislikes and current interests (at most three items each), in the selected UI language. Loading and error states are explicit, with retry. Switching character, personality or language discards the previous response.

Demo mode controls the learning script and local evaluation; it does not select a device narrator. All character speech uses authenticated, cached server MP3s. Failure preserves text and offers replay. No silent fallback to device TTS. Author-defined demo reaction emotions are independent of learner score. Runtime checks: lint, typecheck, test:voice and web export; browser verification includes the existing demo scene and replay.

Report review: one short summary, four labeled sections, at most two concise sentences each. Each exchange expands independently. All coaching and controls follow UI language; Korean practice quotes remain Korean. Never mix cached report languages or duplicate historical feedback paragraphs.

Keep PR #49's report review, mood graph, practice navigation and localization. The final character remains the deployed EndingDialogue: full image with contain in a 300px area, ending badge and untruncated final dialogue/audio, followed by recap. Do not replace it with a round thumbnail.

Conversation video uses the real screen, never reconstructed cards. `screen-recorder.ts` owns one local capture; `screen-recording.tsx` owns the toolbar recording icon, result controls and a recovery tray after navigation. Reuse Btn/Card/Sheet and UI-language strings. The third icon, beside pause and history, starts recording directly and turns red with a stop icon while recording, without an elapsed-time label. Tap again to stop and open save controls. Start only on a direct user action, disclose screen + tab audio + microphone, and require the current browser tab with audio. Supported Chromium browsers crop the captured tab to PhoneFrame; otherwise keep the real tab view. The microphone track is disabled and its gain is zero except during an actual speaking interval. Open that gate only when the input recorder is ready; close synchronously at stop, cancel, text input, pause, exit, and cleanup. Speaking uses tap-to-start/tap-to-stop, with duplicate-start protection. Show only the red recording icon (no timer), allow cancellation/stop, preserve the clip across scene → report, and stop capture when leaving that flow. The owning report screen stops recording automatically three seconds after mounting, retains preview/save controls, and cancels its timer on manual stop, unmount or owner change. Recording byte updates never reset this deadline. Stop finalizes a local MP4 or WebM; saving starts a browser download without server rendering or extra TTS. Unsupported browsers offer device screen-recording guidance. Never silently replace a previous clip. Confirm deletion; warn on unload until download is initiated, and explain that refresh/closing loses an unsaved local clip. A 512 MiB safety limit stops and retains the recording. Keep PDF as a separate server export; historical server videos remain available through their API, but are not newly requested by FE.

Welcome is the first setup screen, matching the supplied reference: white surface, Welcome! heading, existing Malo logo with lime dot, the four existing full-body characters, black pill Get started with lime arrow, outlined Sign in with Google with black G, and text-only Start without signing in. These pre-language-selection labels are English. Use existing Logo, Lineup, Btn and GoogleButton; short screens scroll instead of cropping characters or hiding actions. Both start actions continue to language selection; Google uses the existing OAuth flow before setup. Completed setup still opens Home on return. Unconfigured deep links first show Welcome.

Settings always offers initial setup: return to Welcome, keeping account, coins and learning history. The language selector follows an explicit start action and its back action returns to Welcome (or Settings when opened there). Guest/member identity follows the server's `kind`, including token refresh and previously saved sessions. Guests can start Google login from Settings; temporary configuration network failures remain retryable.
