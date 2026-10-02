const hostOf = (href: string) => {
  try {
    return new URL(href).hostname.toLowerCase().replace(/^www\./, '')
  } catch {
    return null
  }
}

// The widget counts only if it carries this site's id and links home from inside it.
export async function detectWidget(
  response: Response,
  websiteId: string,
  homeHosts: string[]
) {
  let insideWidget = 0
  let found = false

  const rewriter = new HTMLRewriter()
    .on('[data-nnc-widget]', {
      element(element) {
        if (element.getAttribute('data-nnc-widget') !== websiteId) return
        try {
          element.onEndTag(() => {
            insideWidget--
          })
          insideWidget++
        } catch {
          // A void element has no end tag, so it can't contain the link.
        }
      },
    })
    .on('a[href]', {
      element(element) {
        const host = hostOf(element.getAttribute('href') ?? '')
        if (insideWidget > 0 && host && homeHosts.includes(host)) found = true
      },
    })

  await rewriter.transform(response).arrayBuffer()
  return found
}
