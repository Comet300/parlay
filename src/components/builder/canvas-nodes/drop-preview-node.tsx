import { memo } from 'react'
import { type NodeProps } from '@xyflow/react'

export const DropPreviewNode = memo(function DropPreviewNode() {
  return (
    <div className="rounded-md border-2 border-dashed border-blue-300 bg-blue-50/50 w-full h-full animate-pulse" />
  )
})
