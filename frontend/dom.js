export const $ = (sel, el = document) => el.querySelector(sel);
export const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];

export const el = (tag, props = {}, ...children) => {
  const element = document.createElement(tag);
  Object.assign(element, props);
  element.append(...children.flat());
  return element;
};
