---
title: "Components"
description: "Demo of the button, card, form and carousel components."
---

Reference page for the UI components. Every variant is shown below; delete this file (or set `draft: true`) when you no longer need it.

## Buttons

Three styles, three sizes. Without `href` a real `<button>` is rendered; with `href` it is a link that looks the same.

{{< buttons >}}
{{< button href="/about" >}}Primary{{< /button >}}
{{< button href="/posts" style="secondary" >}}Secondary{{< /button >}}
{{< button href="/notes" style="ghost" >}}Ghost{{< /button >}}
{{< /buttons >}}

{{< buttons >}}
{{< button href="/about" size="sm" >}}Small{{< /button >}}
{{< button href="/about" size="md" >}}Medium{{< /button >}}
{{< button href="/about" size="lg" >}}Large{{< /button >}}
{{< /buttons >}}

With an icon (any name from `icon.html`), an external link (opens in a new tab on its own), an icon-only button, and a disabled one:

{{< buttons >}}
{{< button href="https://github.com/abhirajbibhar" icon="github" style="secondary" >}}GitHub{{< /button >}}
{{< button href="mailto:abhiraj.phd@gmail.com" icon="email" >}}Write to me{{< /button >}}
{{< button href="/notes" icon="search" style="secondary" aria-label="Search notes" />}}
{{< button href="/about" disabled="true" style="secondary" >}}Not yet{{< /button >}}
{{< /buttons >}}

```
{{</* button href="/about" style="primary|secondary|ghost" size="sm|md|lg" icon="github" newtab="true|false" disabled="true" */>}}Label{{</* /button */>}}
```

## Cards

A card takes a title, body text, an optional image and an optional footer. With `href`, the whole card becomes one link.

{{< cards cols="2" >}}
{{< card title="Field notes" href="/notes" image="img/demo/field-notes.svg" alt="" footer="Working notes" >}}
How a research day goes, written down while it is still fresh. The whole card is a link.
{{< /card >}}
{{< card title="Reading list" image="img/demo/library.svg" alt="" >}}
A card without a link, with buttons in the footer instead.
{{< card-footer >}}
{{< button href="/posts" size="sm" >}}Read{{< /button >}}
{{< button href="/notes" size="sm" style="secondary" >}}Notes{{< /button >}}
{{< /card-footer >}}
{{< /card >}}
{{< /cards >}}

A card with no image, and a horizontal one:

{{< cards cols="2" >}}
{{< card title="Text only" footer="Footer text, kept quiet" >}}
Body text supports *markdown*, [links](/about) and `code`.
{{< /card >}}
{{< card title="No footer" >}}
The footer band only appears when there is something to put in it.
{{< /card >}}
{{< /cards >}}

{{< card title="Horizontal layout" layout="horizontal" image="img/demo/archive.svg" alt="" href="/about" footer="Image on the left from 780px up; stacked below that." >}}
Use it for a single featured item.
{{< /card >}}

```
{{</* card title="…" href="/x" image="img/demo/a.svg" alt="…" footer="…" layout="horizontal" level="3" */>}}
Body (markdown).
{{</* card-footer */>}} {{</* button … */>}} {{</* /card-footer */>}}
{{</* /card */>}}

{{</* cards cols="3" */>}} {{</* card … */>}} … {{</* /cards */>}}
```

## Form

Posts to an endpoint service, since the site is static. Replace the `action` with your own (for example a Formspree form URL). Without JS it falls back to a normal POST.

{{< form action="https://formspree.io/f/YOUR_FORM_ID" submit="Send message" >}}
{{< field name="name" label="Your name" required="true" autocomplete="name" >}}
{{< field name="email" type="email" label="Email" required="true" autocomplete="email" help="Only used to reply to you." placeholder="you@example.org" >}}
{{< field name="topic" type="select" label="Topic" options="collab:Collaboration, question:A question about my writing, other:Something else" placeholder="Choose one" >}}
{{< field name="message" type="textarea" label="Message" required="true" rows="6" >}}
{{< field name="updates" type="checkbox" label="Email me when I publish something new" >}}
{{< /form >}}

Other controls, for reference:

{{< form action="#" ajax="false" submit="Save" submit-style="secondary" >}}
{{< field name="date" type="date" label="Date" >}}
{{< field name="contact" type="radio" label="How should I reply?" options="email:By email, none:Don't reply" value="email" >}}
{{< field name="locked" label="Read-only field" value="Cannot be changed" readonly="true" >}}
{{< field name="off" label="Disabled field" disabled="true" placeholder="Disabled" >}}
{{< /form >}}

```
{{</* form action="https://…" submit="Send message" success="…" error="…" */>}}
{{</* field name="email" type="email" label="Email" required="true" help="…" */>}}
{{</* field name="topic" type="select" options="a:Label A, b:Label B" placeholder="Choose one" */>}}
{{</* field name="message" type="textarea" rows="6" */>}}
{{</* /form */>}}
```

Field types: `text` `email` `tel` `url` `number` `password` `date` `search` `textarea` `select` `radio` `checkbox`.

## Carousel

Scroll by touch, trackpad, arrow buttons, dots, or the arrow keys when the track has focus. Image slides take a caption:

{{< carousel aria-label="Field sites" >}}
{{< slide src="img/demo/field-notes.svg" alt="" >}}First site: the *notes* that started it{{< /slide >}}
{{< slide src="img/demo/archive.svg" alt="" >}}The archive{{< /slide >}}
{{< slide src="img/demo/fieldsite.svg" alt="" >}}A day in the field{{< /slide >}}
{{< slide src="img/demo/library.svg" alt="" >}}The library{{< /slide >}}
{{< /carousel >}}

Slides can hold cards, and `per-view` shows several at once on wide screens (always one on narrow ones):

{{< carousel per-view="2" aria-label="Featured notes" >}}
{{< slide >}}{{< card title="Setup" href="/notes/setup" footer="Notes" >}}Getting the site running.{{< /card >}}{{< /slide >}}
{{< slide >}}{{< card title="Hosting" href="/notes/hosting" footer="Notes" >}}Where it lives and how it deploys.{{< /card >}}{{< /slide >}}
{{< slide >}}{{< card title="Search" href="/notes/search" footer="Notes" >}}How search works here.{{< /card >}}{{< /slide >}}
{{< slide >}}{{< card title="Philosophy" href="/notes/philosophy" footer="Notes" >}}Why it is built this way.{{< /card >}}{{< /slide >}}
{{< /carousel >}}

And a slide of plain text:

{{< carousel aria-label="Short quotes" >}}
{{< slide >}}Anthropology reminds us that there are many ways to be human.{{< /slide >}}
{{< slide >}}The semi-filtered version of my thought process shows up in the writings.{{< /slide >}}
{{< /carousel >}}

```
{{</* carousel per-view="1|2|3" gap="1em" ratio="16 / 9" aria-label="…" */>}}
{{</* slide src="img/demo/a.svg" alt="…" */>}}Caption{{</* /slide */>}}
{{</* slide */>}}{{</* card … */>}}{{</* /slide */>}}
{{</* /carousel */>}}
```
