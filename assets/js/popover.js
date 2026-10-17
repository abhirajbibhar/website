function htmlToElement(html) {
  const template = document.createElement("template")
  html = html.trim()
  template.innerHTML = html
  return template.content.firstChild
}

function initPopover(baseURL, useContextualBacklinks, renderLatex) {
  const basePath = baseURL.replace(window.location.origin, "")
  fetchData.then(({ content }) => {
    const links = [...document.getElementsByClassName("internal-link")]
    links
      .filter(li => li.dataset.src || (li.dataset.idx && useContextualBacklinks))
      .forEach(li => {
        var el
        if (li.dataset.ctx) {
          const linkDest = content[li.dataset.src]
          if (!linkDest) return
          const popoverElement = `<div class="popover">
    <h3>${linkDest.title}</h3>
    <p>${highlight(removeMarkdown(linkDest.content), li.dataset.ctx)}...</p>
    <p class="meta">${new Date(linkDest.lastmodified).toLocaleDateString()}</p>
</div>`
          el = htmlToElement(popoverElement)
        } else {
          const linkDest = content[li.dataset.src.replace(/\/$/g, "").replace(basePath, "")]
          if (linkDest) {
            let splitLink = li.href.split("#")
            let cleanedContent = removeMarkdown(linkDest.content)
            if (splitLink.length > 1) {
              let headingName = splitLink[1].replace(/\-/g, " ")
              let headingIndex = cleanedContent.toLowerCase().indexOf("<b>" + headingName + "</b>")
              cleanedContent = cleanedContent.substring(headingIndex, cleanedContent.length)
            }
            const popoverElement = `<div class="popover">
    <h3>${linkDest.title}</h3>
    <p>${cleanedContent.split(" ", 20).join(" ")}...</p>
    <p class="meta">${new Date(linkDest.lastmodified).toLocaleDateString()}</p>
</div>`
            el = htmlToElement(popoverElement)
          }
        }

        if (el) {
          li.appendChild(el)
          if (renderLatex) {
            renderMathInElement(el, {
              delimiters: [
                { left: '$$', right: '$$', display: false },
                { left: '$', right: '$', display: false },
                { left: '\\(', right: '\\)', display: false },
                { left: '\\[', right: '\\]', display: false }
              ],
              throwOnError: false
            })
          }

          let showTimer
          const place = () =>
            window.FloatingUIDOM.computePosition(li, el, {
              // Below the link, left edges aligned; flips above when there is no room
              // underneath, and is nudged to stay 12px inside the viewport edges.
              placement: "bottom-start",
              middleware: [
                window.FloatingUIDOM.offset(8),
                window.FloatingUIDOM.inline(),
                window.FloatingUIDOM.flip({ padding: 12 }),
                window.FloatingUIDOM.shift({ padding: 12 }),
              ],
            }).then(({ x, y }) => {
              Object.assign(el.style, { left: `${x}px`, top: `${y}px` })
            })
          const show = () => {
            clearTimeout(showTimer)
            // Small hover-intent delay so cards don't flash while the pointer passes over links.
            showTimer = setTimeout(() => {
              el.classList.add("visible") // must be displayed before it can be measured
              place()
            }, 120)
          }
          const hide = () => {
            clearTimeout(showTimer)
            el.classList.remove("visible")
          }
          li.addEventListener("mouseenter", show)
          li.addEventListener("mouseleave", hide)
          li.addEventListener("focus", show)
          li.addEventListener("blur", hide)
        }
      })
  }).catch(() => {}) // index failed to load: no previews, but nothing else should break
}
