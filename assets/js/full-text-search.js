; (function() {
  const encoder = (str) => str.toLowerCase().split(/([^a-z]|[^\x00-\x7F])/)

  // The index is built the first time search is opened, not at page load. It used to be
  // built eagerly for every visitor: it walks the full text of every page through
  // removeMarkdown(), which grows with the site and showed up as main-thread blocking
  // time on ordinary pages. Building it is a one-off cost paid only by people who search.
  let ready = null
  const buildIndex = () => (ready ??= (async () => {
    const contentIndex = new FlexSearch.Document({
      cache: true,
      charset: "latin:extra",
      optimize: true,
      index: [
        { field: "content", tokenize: "reverse", encode: encoder },
        { field: "title", tokenize: "forward", encode: encoder },
      ],
    })
    const { content } = await fetchData
    let n = 0
    for (const [key, value] of Object.entries(content)) {
      contentIndex.add({ id: key, title: value.title, content: removeMarkdown(value.content) })
      // Yield now and then so a large site never blocks input for one long task.
      if (++n % 25 === 0) await new Promise((r) => setTimeout(r))
    }
    return { contentIndex, content }
  })())

  registerHandlers(async (e) => {
    term = e.target.value // global on purpose: util.js highlight()/redir() read it
    const { contentIndex, content } = await buildIndex()
    if (term !== e.target.value) return // a newer keystroke superseded this one
    const searchResults = contentIndex.search(term, [
      { field: "content", limit: 10 },
      { field: "title", limit: 5 },
    ])
    const getByField = (field) => {
      const results = searchResults.filter((x) => x.field === field)
      return results.length === 0 ? [] : [...results[0].result]
    }
    const allIds = new Set([...getByField("title"), ...getByField("content")])
    displayResults(
      [...allIds].map((id) => ({ id, url: id, title: content[id].title, content: content[id].content })),
      true,
    )
  })

  // Start building as soon as the box is focused, so results are usually ready by the
  // time the first character has been typed.
  document.getElementById("search-bar")?.addEventListener("focus", buildIndex, { once: true })
})()
