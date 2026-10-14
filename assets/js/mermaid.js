const blocks = document.querySelectorAll(
  "div.language-mermaid, pre.language-mermaid, pre > code.language-mermaid",
);

for (const block of blocks) {
  if (!block.isConnected) continue;

  const diagram = document.createElement("pre");
  diagram.className = "mermaid";
  diagram.textContent = block.textContent;

  const target = block.tagName === "CODE" ? block.parentElement : block;
  target.replaceWith(diagram);
}

if (blocks.length) {
  import("https://cdn.jsdelivr.net/npm/mermaid@12/dist/mermaid.esm.min.mjs")
    .then(({ default: mermaid }) => {
      mermaid.initialize({ startOnLoad: false, theme: "dark" });
      return mermaid.run();
    })
    .catch(console.error);
}
