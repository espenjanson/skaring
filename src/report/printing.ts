/** Temporarily names a print job without changing registration or file state. */
export function createReportPrinter(
  browser: Pick<Window, "print" | "addEventListener" | "removeEventListener">,
  document: Pick<Document, "title">,
) {
  let originalTitle: string | null = null
  const restore = () => {
    browser.removeEventListener("afterprint", restore)
    if (originalTitle !== null) document.title = originalTitle
    originalTitle = null
  }
  return {
    restore,
    print(fileName?: string) {
      restore()
      originalTitle = document.title
      const stem = fileName?.replace(/\.[^.]+$/, "")
      browser.addEventListener("afterprint", restore)
      document.title = stem ? `Resultat ${stem}` : "Resultat"
      try { browser.print() } catch (error) {
        restore()
        throw error
      }
    },
  }
}
