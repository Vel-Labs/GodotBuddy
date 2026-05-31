# Prompt Patterns

## Canonical base

Create the canonical base reference for a game sprite asset. Asset name: `<name>`. Asset type: `<type>`. Description: `<description>`. Style target: `<style lock>`. Output one centered full-body/object reference image on a perfectly flat chroma-key background `<key>`. No text, labels, UI, scenery, borders, shadows, or watermarks.

## Single state

Create one game-ready sprite state for `<name>`. State id: `<state>`. State description: `<state description>`. Make it the same asset as the canonical base reference, with only the state change requested. Flat chroma-key background, safe padding, no labels, no shadows.

## Animation strip

Create exactly `<N>` complete frames in a horizontal left-to-right strip for `<animation>`. Same character/object as the canonical base. Same style, palette, proportions, materials, and camera. Show motion through pose changes only. Flat chroma-key background. No text, frame numbers, grid, borders, blur, speed lines, dust, shadows, or detached effects.

## Variation set

Create `<variant>` as an alternate version of the same asset. Preserve silhouette and proportions. Only change `<allowed changes>`. Do not change camera, material style, or scale.
