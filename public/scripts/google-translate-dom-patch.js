;(function () {
  if (typeof Node === 'undefined' || !Node.prototype || Node.prototype.__ghostRentalsDomPatched) {
    return
  }

  Node.prototype.__ghostRentalsDomPatched = true

  var originalRemoveChild = Node.prototype.removeChild
  Node.prototype.removeChild = function (child) {
    if (child.parentNode !== this) {
      if (child.parentNode) {
        return child.parentNode.removeChild(child)
      }
      return child
    }
    return originalRemoveChild.call(this, child)
  }

  var originalInsertBefore = Node.prototype.insertBefore
  Node.prototype.insertBefore = function (newNode, referenceNode) {
    if (referenceNode && referenceNode.parentNode !== this) {
      return this.appendChild(newNode)
    }
    return originalInsertBefore.call(this, newNode, referenceNode)
  }
})()
