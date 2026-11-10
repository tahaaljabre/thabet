// Compatibility facade for legacy onclick handlers.
if (typeof window !== 'undefined') {
  window.printArchivedEmployeeStatement = printArchivedEmployeeStatement;
  window.printArchivedSupplierStatement = printArchivedSupplierStatement;
}
