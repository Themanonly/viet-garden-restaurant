import type { Metadata } from 'next';
import { createMenuRepository } from '../../../content/menu-repository';
import { menuUiCopy, type MenuCategory, type MenuItem } from '../../../content/menu';
import { createMediaRepository } from '../../../content/media-repository';
import { localizedText, locales, type Locale, type MediaAsset } from '../../../content/models';
import { getSeoMetadata, localeAlternates } from '../../../content/seo';
import { PublicRestaurantStatus } from '../../../components/public-restaurant-status';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = (locales as readonly string[]).includes(rawLocale) ? rawLocale as Locale : 'fr';
  const seo = getSeoMetadata(locale, 'menu');
  return {
    title: localizedText(seo.title, locale),
    description: localizedText(seo.description, locale),
    alternates: {
      canonical: seo.canonicalPath,
      languages: Object.fromEntries(Object.entries(localeAlternates).map(([alternateLocale, path]) => [alternateLocale, `${path}/menu`])),
    },
  };
}

function MenuItemCard({ item, locale, media }: { item: MenuItem; locale: Locale; media?: MediaAsset }) {
  const price = new Intl.NumberFormat(locale, { style: 'currency', currency: item.price.currency }).format(item.price.amount);

  return (
    <article className={`menu-item-card${media ? ' has-media' : ''}`}>
      {media ? <img className="menu-item-image" src={media.reference} alt={localizedText(media.alt, locale)} /> : null}
      <div className="menu-item-content">
        <div className="menu-item-heading">
          <h3>{localizedText(item.name, locale)}</h3>
          <p className="menu-item-price">{price}</p>
        </div>
        {item.description ? <p className="menu-item-description">{localizedText(item.description, locale)}</p> : null}
      </div>
    </article>
  );
}

export function MenuCategoryNavigation({ categories, locale }: { categories: MenuCategory[]; locale: Locale }) {
  return (
    <nav className="menu-category-nav" aria-label={localizedText(menuUiCopy.categoryNavigation, locale)}>
      {categories.map((category, index) => (
        <a key={category.id} href={`#menu-category-${category.id}`}>
          <span className="menu-category-number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
          <span className="menu-category-label">{localizedText(category.name, locale)}</span>
        </a>
      ))}
    </nav>
  );
}

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function MenuPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale = (locales as readonly string[]).includes(rawLocale) ? (rawLocale as Locale) : 'fr';
  const menu = await createMenuRepository().getMenu();
  const mediaRepository = createMediaRepository();
  const mediaAssets = await Promise.all(
    [...new Set(menu.items.flatMap((item) => item.mediaId ? [item.mediaId] : []))]
      .map((mediaId) => mediaRepository.getMedia(mediaId)),
  );
  const mediaById = new Map(mediaAssets.filter((asset): asset is MediaAsset => Boolean(asset)).map((asset) => [asset.id, asset]));
  const categories = menu.categories
    .filter((category) => category.active)
    .sort((first, second) => first.sortOrder - second.sortOrder);
  const featuredSections = menu.featuredSections
    .filter((section) => section.active)
    .sort((first, second) => first.sortOrder - second.sortOrder)
    .map((section) => ({
      section,
      items: section.itemIds
        .map((itemId) => menu.items.find((item) => item.id === itemId))
        .filter((item): item is MenuItem => Boolean(item?.active)),
    }))
    .filter(({ items }) => items.length > 0);

  return (
    <main className="page-shell">
      <section className="hero-card menu-page">
        <h1>{localizedText(menuUiCopy.title, locale)}</h1>
        <PublicRestaurantStatus availability={menu.availability} locale={locale} />
        {categories.length === 0 && featuredSections.length === 0 ? (
          <p>{localizedText(menuUiCopy.empty, locale)}</p>
        ) : (
          <div className="menu-content">
            <MenuCategoryNavigation categories={categories} locale={locale} />
            {featuredSections.map(({ section, items }) => (
              <section className="menu-group menu-featured" key={section.id} aria-labelledby={`menu-featured-${section.id}-title`}>
                <h2 id={`menu-featured-${section.id}-title`}>{localizedText(section.title, locale)}</h2>
                <div className="menu-item-list">
                  {items.map((item) => <MenuItemCard key={`${section.id}-${item.id}`} item={item} locale={locale} media={item.mediaId ? mediaById.get(item.mediaId) : undefined} />)}
                </div>
              </section>
            ))}
            {categories.map((category) => (
              <section className="menu-group" id={`menu-category-${category.id}`} key={category.id} aria-labelledby={`menu-category-${category.id}-title`}>
                <h2 id={`menu-category-${category.id}-title`}>{localizedText(category.name, locale)}</h2>
                <div className="menu-item-list">
                  {menu.items
                    .filter((item) => item.active && item.categoryId === category.id)
                    .sort((first, second) => first.sortOrder - second.sortOrder)
                    .map((item) => <MenuItemCard key={item.id} item={item} locale={locale} media={item.mediaId ? mediaById.get(item.mediaId) : undefined} />)}
                </div>
              </section>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
