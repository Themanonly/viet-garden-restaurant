import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { MenuCategory } from '../../../content/menu';
import { MenuCategoryNavigation } from './page';

function categories(count: number): MenuCategory[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `category-${index + 1}`,
    name: { fr: `Catégorie ${index + 1}`, en: `Category ${index + 1}`, ar: `الفئة ${index + 1}` },
    sortOrder: index,
    active: true,
  }));
}

test('category navigation renders one or many categories with stable anchors', () => {
  for (const count of [1, 2, 10, 11, 12]) {
    const markup = renderToStaticMarkup(<MenuCategoryNavigation categories={categories(count)} locale="en" />);
    assert.equal((markup.match(/<a /g) ?? []).length, count);
    assert.match(markup, /href="#menu-category-category-1"/);
    assert.match(markup, new RegExp(`Category ${count}`));
  }
});

test('category navigation preserves long localized names and Arabic content', () => {
  const longCategory: MenuCategory = {
    id: 'long-category',
    name: {
      fr: 'Catégorie de Vérification au Nom Exceptionnellement Long',
      en: 'Exceptionally Long Verification Category Name',
      ar: 'فئة تحقق تجريبية باسم طويل جدًا لاختبار التخطيط',
    },
    sortOrder: 0,
    active: true,
  };

  const frenchMarkup = renderToStaticMarkup(<MenuCategoryNavigation categories={[longCategory]} locale="fr" />);
  const arabicMarkup = renderToStaticMarkup(<MenuCategoryNavigation categories={[longCategory]} locale="ar" />);
  assert.match(frenchMarkup, /Catégorie de Vérification au Nom Exceptionnellement Long/);
  assert.match(arabicMarkup, /فئة تحقق تجريبية باسم طويل جدًا لاختبار التخطيط/);
  assert.match(arabicMarkup, /href="#menu-category-long-category"/);
  assert.match(renderToStaticMarkup(<MenuCategoryNavigation categories={categories(10)} locale="en" />), /class="menu-category-number" aria-hidden="true">10<\/span>/);
});