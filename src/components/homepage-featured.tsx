import Link from 'next/link';
import type { FeaturedSection, MenuItem } from '../content/menu';
import { localizedText, type Locale, type MediaAsset } from '../content/models';
import { routeHref } from '../content/restaurant';

const copy = {
  eyebrow: { fr: 'Depuis notre cuisine', en: 'From our kitchen', ar: 'من مطبخنا' },
  action: { fr: 'Découvrir toute la carte', en: 'Explore the full menu', ar: 'اكتشف القائمة كاملة' },
};

export function HomepageFeatured({ section, items, mediaById, locale }: { section?: FeaturedSection; items: MenuItem[]; mediaById: Map<string, MediaAsset>; locale: Locale }) {
  if (!section || items.length === 0) return null;

  return (
    <section className="homepage-featured" aria-labelledby="homepage-featured-title">
      <div className="homepage-featured-header">
        <div>
          <p className="homepage-featured-eyebrow">{localizedText(copy.eyebrow, locale)}</p>
          <h2 id="homepage-featured-title">{localizedText(section.title, locale)}</h2>
          {section.description ? <p className="homepage-featured-description">{localizedText(section.description, locale)}</p> : null}
        </div>
        <Link className="homepage-featured-action" href={routeHref(locale, 'menu')}>
          {localizedText(copy.action, locale)}
        </Link>
      </div>

      <div className="homepage-featured-grid">
        {items.slice(0, 3).map((item, index) => {
          const media = item.mediaId ? mediaById.get(item.mediaId) : undefined;
          const price = new Intl.NumberFormat(locale, { style: 'currency', currency: item.price.currency }).format(item.price.amount);
          return (
            <article className={`homepage-dish${index === 0 ? ' is-lead' : ''}`} key={item.id}>
              <div className="homepage-dish-media">
                {media ? <img src={media.reference} alt={localizedText(media.alt, locale)} /> : <span className="homepage-dish-placeholder" aria-hidden="true" />}
                <span className="homepage-dish-number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
              </div>
              <div className="homepage-dish-copy">
                <div className="homepage-dish-heading">
                  <h3>{localizedText(item.name, locale)}</h3>
                  <p>{price}</p>
                </div>
                {item.description ? <p className="homepage-dish-description">{localizedText(item.description, locale)}</p> : null}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
