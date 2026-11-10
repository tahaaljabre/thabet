export function installDomSecurity() {
  // Secure DOM against XSS globally
  if (typeof window.DOMPurify !== 'undefined') {
    const originalInnerHTML = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML');
    if (originalInnerHTML) {
      Object.defineProperty(Element.prototype, 'innerHTML', {
        get: function() {
          return originalInnerHTML.get.call(this);
        },
        set: function(value) {
          originalInnerHTML.set.call(this, window.DOMPurify.sanitize(value));
        }
      });
    }
  
    const originalInsertAdjacentHTML = Element.prototype.insertAdjacentHTML;
    if (originalInsertAdjacentHTML) {
      Element.prototype.insertAdjacentHTML = function(position, text) {
        originalInsertAdjacentHTML.call(this, position, window.DOMPurify.sanitize(text));
      };
    }
  }
}
