/**
 * Google Translate re-parents DOM nodes while React still owns the tree.
 * Patch DOM APIs so React reconciliation does not throw NotFoundError.
 */
export function patchDomForGoogleTranslate() {
  if (typeof Node === 'undefined' || !Node.prototype) return

  const proto = Node.prototype as Node & {
    __ghostRentalsDomPatched?: boolean
  }
  if (proto.__ghostRentalsDomPatched) return
  proto.__ghostRentalsDomPatched = true

  const originalRemoveChild = proto.removeChild
  proto.removeChild = function removeChildPatched<T extends Node>(child: T): T {
    if (child.parentNode !== this) {
      if (child.parentNode) {
        return child.parentNode.removeChild(child) as T
      }
      return child
    }
    return originalRemoveChild.call(this, child) as T
  }

  const originalInsertBefore = proto.insertBefore
  proto.insertBefore = function insertBeforePatched<T extends Node>(
    newNode: T,
    referenceNode: Node | null,
  ): T {
    if (referenceNode && referenceNode.parentNode !== this) {
      return this.appendChild(newNode) as T
    }
    return originalInsertBefore.call(this, newNode, referenceNode) as T
  }
}

patchDomForGoogleTranslate()
