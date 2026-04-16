import { memo } from 'react'

export const DropPreviewNode = memo(function DropPreviewNode() {
  // Minimal, Apple-style snap indicator: a soft translucent fill with a
  // subtle 1px border in the brand-neutral gray. No animation. The wrapper
  // also carries a matching style (see globals.css) so the skeleton is
  // always visible even if this component mounts after measurement.
  return null
})
