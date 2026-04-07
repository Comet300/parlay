import { BaseContentFields } from './base-content-fields'

export function EmailCollectionEditor({ nodeId }: { nodeId: string }) {
  return (
    <div className="p-3">
      <h3 className="text-sm font-semibold mb-3">Email Collection</h3>
      <BaseContentFields nodeId={nodeId} showRequired />
    </div>
  )
}
