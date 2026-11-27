'use strict';
window.KFlashcardBack = (() => {
  const panels = new WeakMap();
  const shards = new Map();
  const normalize = term => term.toLowerCase().replace(/[’‘]/g, "'").trim().replace(/\s+/g, ' ');

  function element(tag, className, text) {
    const node = document.createElement(tag);
    node.className = className;
    if (text) node.textContent = text;
    return node;
  }

  function load(term) {
    let hash = 2166136261;
    for (let i = 0; i < term.length; i++) hash = Math.imul(hash ^ term.charCodeAt(i), 16777619);
    const shard = (hash >>> 0) % 32;
    if (!shards.has(shard)) {
      shards.set(shard, fetch('/flashcard-collocations/' + shard + '.json?v=2').then(response => {
        // GitHub web uploads may place the generated shards at the repository root.
        return response.status === 404 ? fetch('/' + shard + '.json?v=2') : response;
      }).then(response => {
        if (!response.ok) throw new Error('Collocations unavailable');
        return response.json();
      }).catch(() => {
        shards.delete(shard);
        return null;
      }));
    }
    return shards.get(shard);
  }

  function setup(root) {
    const back = root.querySelector('[data-td="back"]');
    const meaning = back.querySelector('[data-td="meaning"]');
    const original = meaning.parentElement;
    const header = original.firstElementChild;
    const example = back.querySelector('[data-td="example"]');
    const exampleColumn = example.parentElement;
    exampleColumn.classList.add('kf-back-example');
    const exampleHeader = exampleColumn.firstElementChild;
    exampleHeader.classList.add('kf-back-example-heading');
    const speaker = header.querySelector('[data-td-action="speak"]');
    speaker.title = 'Nghe câu ví dụ';
    speaker.setAttribute('aria-label', speaker.title);
    exampleHeader.append(speaker);

    const columns = element('div', 'kf-back-columns');
    const meaningColumn = element('div', 'kf-back-meaning');
    const usage = element('section', 'kf-back-box');
    const usageText = element('p', 'kf-back-usage');
    usage.append(element('h3', '', 'Dùng khi nào?'), usageText);
    const collocations = element('section', 'kf-back-box');
    const list = element('ul', 'kf-back-collocations');
    collocations.append(element('h3', '', 'Cụm hay đi cùng'), list);
    meaningColumn.append(header, meaning, usage, collocations);
    columns.append(meaningColumn, exampleColumn);
    original.replaceWith(columns);

    const ratingRow = element('div', 'kf-back-ratings');
    root.querySelector('.td-study-columns').after(ratingRow);
    const controls = root.querySelector('.td-study-controls');
    const ratings = [1, 2, 3, 4].map(rating => {
      const button = controls.querySelector('[data-rating="' + rating + '"]');
      const marker = document.createComment('rating location');
      button.before(marker);
      return {button, marker};
    });
    return {exampleColumn, usage, usageText, collocations, list, ratingRow, ratings};
  }

  function render(root, card, options, usage) {
    let panel = panels.get(root);
    root.classList.toggle('kf-back-open', options.flipped);
    if (!panel && !options.flipped) return;
    if (!panel) {
      panel = setup(root);
      panels.set(root, panel);
    }

    for (const {button, marker} of panel.ratings) {
      if (options.flipped) {
        const interval = button.querySelector('[class~="text-[11px]"]');
        if (interval) {
          const label = interval.textContent.replace(/\s*·\s*\d+$/, '');
          const date = button.dataset.reviewDue?.split('-').reverse().slice(0, 2).join('/');
          interval.textContent = '(' + (date && Number(button.dataset.rating) >= 3 ? date : label) + ')';
        }
        panel.ratingRow.append(button);
      }
      else marker.after(button);
    }
    if (!options.flipped) return;
    panel.exampleColumn.hidden = !options.example;
    if (!usage && card.id === '174695a93d95c0') usage = 'Dùng khi nói về bậc học, chương trình hoặc chính sách giáo dục. Primary school thường chỉ trường tiểu học.';
    panel.usage.hidden = !usage;
    panel.usageText.textContent = usage;
    const term = normalize(card.term);
    panel.collocations.hidden = true;
    panel.list.replaceChildren();
    const request = {};
    panel.request = request;

    load(term).then(rows => {
      if (panel.request !== request || !root.classList.contains('kf-back-open')) return;
      const phrases = rows?.['card:' + card.id] ?? rows?.[term];
      if (!Array.isArray(phrases) || !phrases.length) return;
      panel.list.replaceChildren(...phrases.map(phrase => element('li', '', phrase)));
      panel.collocations.hidden = false;
    });
  }
  return {render};
})();
