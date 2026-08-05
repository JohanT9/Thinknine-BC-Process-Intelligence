const assert = require("assert");
const view = require("../src/ui/document-workspace-view");

class Element {
  constructor(tagName) {
    this.tagName = tagName;
    this.children = [];
    this.dataset = {};
    this.style = {};
    this.attributes = {};
    this.parent = null;
    this.textContent = "";
  }
  appendChild(child) {
    if (child.parent) {
      child.parent.children = child.parent.children.filter(item => item !== child);
    }
    child.parent = this;
    this.children.push(child);
    return child;
  }
  append(...children) { children.forEach(child => this.appendChild(child)); }
  remove() {
    if (this.parent) {
      this.parent.children = this.parent.children.filter(item => item !== this);
    }
    this.parent = null;
  }
  replaceChildren(...children) {
    this.children.forEach(child => { child.parent = null; });
    this.children = [];
    this.append(...children);
  }
  setAttribute(name, value) { this.attributes[name] = String(value); }
}

const documentValue = { createElement: tagName => new Element(tagName) };
const container = new Element("article");
const model = {
  documentId: "document-1",
  sections: [{
    workspaceSectionId: "cover",
    kind: "cover",
    items: [{
      workspaceItemId: "title",
      kind: "heading",
      appearance: { typography: { color: "#123456" } },
      content: { text: "Orderhantering", level: 1 }
    }]
  }, {
    workspaceSectionId: "workflow",
    kind: "workflow",
    items: [{
      workspaceItemId: "image",
      kind: "image",
      appearance: {},
      content: { assetId: "asset-1", alt: "Order" }
    }]
  }]
};
const media = { "asset-1": { source: "data:image/png;base64,AA==", revision: 1 } };
assert.deepStrictEqual(view.render(container, model, media, documentValue), {
  changedSections: 2,
  sectionCount: 2
});
const cover = container.children[0];
const workflow = container.children[1];
assert.strictEqual(cover.children[0].style.color, "#123456");
assert.strictEqual(workflow.children[0].children[0].src, media["asset-1"].source);
assert.strictEqual(view.render(container, model, media, documentValue).changedSections, 0);
assert.strictEqual(container.children[0], cover);
assert.strictEqual(container.children[1], workflow);

const nextMedia = { "asset-1": { ...media["asset-1"], revision: 2 } };
assert.strictEqual(view.render(container, model, nextMedia, documentValue)
  .changedSections, 1);
assert.strictEqual(container.children[0], cover);
assert.notStrictEqual(container.children[1], workflow);
view.clear(container);
assert.strictEqual(container.children.length, 0);
assert.strictEqual(container.dataset.documentId, undefined);

console.log("Document Workspace incremental view tests passed.");
