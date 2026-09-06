import type { MenuCategory, MenuDocument, MenuItem } from './menu';

const category = (id: string, name: string, sortOrder: number): MenuCategory => ({
  id,
  name: { fr: name },
  sortOrder,
  active: true,
});

const item = (
  id: string,
  categoryId: string,
  name: string,
  description: string,
  amount: number,
  sortOrder: number,
  mediaId?: string,
): MenuItem => ({
  id,
  categoryId,
  name: { fr: name },
  description: { fr: description },
  price: { amount, currency: 'MAD' },
  ...(mediaId ? { mediaId } : {}),
  sortOrder,
  active: true,
});

const categories: MenuCategory[] = [
  category('soupes', 'Soupes', 0),
  category('salades', 'Salades', 1),
  category('hors-doeuvre', "Hors D'oeuvre", 2),
  category('boeufs', 'Boeufs', 3),
  category('canards', 'Canards', 4),
  category('poulets', 'Poulets', 5),
  category('fruits-de-mer', 'Fruits De Mer', 6),
  category('assortiments-sushi', 'Assortiments Sushi', 7),
  category('desserts', 'Desserts', 8),
  category('eaux-boissons-gazeuses', 'Eaux et Boissons Gazeuses', 9),
];

const categoryTranslations: Record<string, { en: string; ar: string }> = {
  soupes: { en: 'Soups', ar: 'الشوربات' }, salades: { en: 'Salads', ar: 'السلطات' },
  'hors-doeuvre': { en: 'Starters', ar: 'المقبلات' }, boeufs: { en: 'Beef', ar: 'أطباق اللحم البقري' },
  canards: { en: 'Duck', ar: 'أطباق البط' }, poulets: { en: 'Chicken', ar: 'أطباق الدجاج' },
  'fruits-de-mer': { en: 'Seafood', ar: 'المأكولات البحرية' }, 'assortiments-sushi': { en: 'Sushi Platters', ar: 'تشكيلات السوشي' },
  desserts: { en: 'Desserts', ar: 'الحلويات' }, 'eaux-boissons-gazeuses': { en: 'Water and Soft Drinks', ar: 'المياه والمشروبات الغازية' },
};

const items: MenuItem[] = [
  item('soupes-formule-chef', 'soupes', 'Soupe Formule Chef - 4 boules', 'Velouté fruits de mer', 110, 0, 'menu-soupe-formule-chef'),
  item('soupes-pho', 'soupes', 'Soupe pho', 'Pâte de riz Émincé de bœuf et oignons', 75, 1, 'menu-soupe-pho'),
  item('soupes-ravioli-crevettes', 'soupes', 'Soupe Ravioli Crevettes', 'Ravioli, crevettes', 70, 2, 'menu-soupe-ravioli-crevettes'),
  item('soupes-viet-garden', 'soupes', 'Soupe Viet-Garden', 'Velouté fruits de mer', 65, 3, 'menu-soupe-viet-garden'),
  item('soupes-vermicelles-poulet-crevettes', 'soupes', 'Soupe Aux Vermicelles Poulet Et Crevettes', 'Poulet, crevettes, vermicelles, champignons noirs', 60, 4, 'menu-soupe-vermicelles-poulet-crevettes'),
  item('soupes-pekinoise', 'soupes', 'Soupe Pékinoise', 'Velouté aigre piquante, poulet, crevettes, tofu', 60, 5, 'menu-soupe-pekinoise'),

  item('salades-formule-chef', 'salades', 'Salade Formule Chef - 4 Pérsonnes', 'Crudités, maïs, surimi, crevettes', 110, 0, 'menu-salade-formule-chef'),
  item('salades-exotique', 'salades', 'Salade Exotique', 'Crudités, fruits, maïs, crevettes, surimi, crabe', 85, 1, 'menu-salade-exotique'),
  item('salades-bo-bun', 'salades', 'Salade Bo Bun', 'Crudités, vermicelles de riz, bœuf, nems poulet, crevettes, cacahuètes', 85, 2, 'menu-salade-bo-bun'),
  item('salades-viet-garden', 'salades', 'Salade Viet-Garden', 'Crudités, maïs, surimi, crevettes', 70, 3, 'menu-salade-viet-garden'),
  item('salades-vietnamienne', 'salades', 'Salade Vietnamienne', 'Crudités, poulet, crevettes, cacahuètes', 70, 4, 'menu-salade-vietnamienne'),

  item('hors-doeuvre-nems-formule-chef', 'hors-doeuvre', 'Nems Formule Chef - 5 grands Nems', 'Poulet hachée, champignons noirs, oignons, vermicelles', 115, 0, 'menu-nems-formule-chef'),
  item('hors-doeuvre-beignets-formule-chef', 'hors-doeuvre', 'Beignets De Crevettes Formule Chef', '15 Beignets de crevettes', 115, 1, 'menu-beignets-crevettes-formule-chef'),
  item('hors-doeuvre-assortiment-viet-garden', 'hors-doeuvre', 'Assortiment Viet-Garden', 'Deux grands nems, quatre petits nems, quatre beignets de crevettes, quatre aromaki', 110, 2, 'menu-assortiment-viet-garden'),
  item('hors-doeuvre-riz-cantonais', 'hors-doeuvre', 'Riz Cantonais', 'Riz, poulet, bœuf, crevettes, champignons de paris, petit pois', 85, 3, 'menu-riz-cantonais'),
  item('hors-doeuvre-nems-crevettes', 'hors-doeuvre', 'Nems Aux Crevettes', 'Poulet hachée, crevettes, champignons noirs, oignons, vermicelles', 70, 4, 'menu-nems-crevettes'),
  item('hors-doeuvre-beignets-crevettes', 'hors-doeuvre', 'Beignets De Crevettes', 'Beignets de crevettes', 70, 5, 'menu-beignets-crevettes'),
  item('hors-doeuvre-sui-mai', 'hors-doeuvre', 'Sui Maï Vapeur', 'Raviolis aux crevettes à la vapeur', 70, 6, 'menu-sui-mai-vapeur'),
  item('hors-doeuvre-nems-poulet', 'hors-doeuvre', 'Nems Au Poulet', 'Poulet hachée, champignons noirs, oignons, vermicelles', 65, 7, 'menu-nems-poulet'),
  item('hors-doeuvre-nems-vegetariens', 'hors-doeuvre', 'Nems Végétariens', 'Choux, carotte, vermicelles, champignon noir, maïs', 65, 8, 'menu-nems-vegetariens'),
  item('hors-doeuvre-omelette-vietnamienne', 'hors-doeuvre', 'Omelette Vietnamienne', 'Farce de nems, crevettes, surimi, ceufs', 65, 9, 'menu-omelette-vietnamienne'),
  item('hors-doeuvre-rouleaux-printemps', 'hors-doeuvre', 'Rouleaux De Printemps', 'Crudités, bœuf, crevettes, rouleaux de vermicelles, printemps de riz.', 60, 10, 'menu-rouleaux-printemps'),

  item('boeufs-saute-viet-garden', 'boeufs', 'Bouef Sauté Viet Garden', 'Émincé de bœuf champignon de paris et noir sur plaque chauffante', 110, 0, 'menu-boeuf-saute-viet-garden'),
  item('canards-ananas', 'canards', 'Canard Ananas', 'Canard, ananas', 130, 0, 'menu-canard-ananas'),

  item('poulets-mixao-100', 'poulets', 'Mixao Poulet', 'Nouilles aux poulet', 100, 0, 'menu-mixao-poulet-100'),
  item('poulets-saute-viet-garden', 'poulets', 'Poulet Sauté Viet Garden', 'Poulet, champignon de paris, champignon noir', 100, 1, 'menu-poulet-saute-viet-garden'),
  item('poulets-ananas', 'poulets', 'Poulet Ananas', 'Poulet, ananas', 100, 2, 'menu-poulet-ananas'),
  item('poulets-curry', 'poulets', 'Poulet Curry', 'Poulet, champignon de paris, champignon noir, curry', 100, 3, 'menu-poulet-curry'),
  item('poulets-brochettes', 'poulets', 'Brochettes De Poulet', 'Brochettes de poulet', 100, 4, 'menu-brochettes-poulet'),
  item('poulets-mixao-90', 'poulets', 'Mixao Poulet', 'Nouilles aux poulet', 90, 5),

  item('fruits-de-mer-crevettes-viet-garden', 'fruits-de-mer', 'Crevettes Viet Garden', 'Bœuf, crevettes, poulet', 105, 0, 'menu-crevettes-viet-garden'),
  item('fruits-de-mer-marmite', 'fruits-de-mer', 'Marmite Fruits De Mer', 'Crevettes calamar poisson crabe champignon', 105, 1, 'menu-marmite-fruits-de-mer'),
  item('fruits-de-mer-viet-garden', 'fruits-de-mer', 'Viet Garden Fruits De Mer', 'Crevettes, calamar, poisson, champignons', 105, 2, 'menu-viet-garden-fruits-de-mer'),
  item('fruits-de-mer-poissons-aigre-doux', 'fruits-de-mer', 'Poissons Aigre Doux', 'Poisson, ananas, poivron, carotte, champignon noir', 105, 3, 'menu-poissons-aigre-doux'),
  item('fruits-de-mer-mixao', 'fruits-de-mer', 'Mixao Fruits De Mer', 'Nouilles aux fruits de mer', 105, 4, 'menu-mixao-fruits-de-mer'),

  item('assortiments-sushi-80', 'assortiments-sushi', 'Assortiment - 80 Pièces', 'Selection du chef', 500, 0, 'menu-assortiment-80'),
  item('assortiments-sushi-60', 'assortiments-sushi', 'Assortiment - 60 Pièces', 'Selection du chef', 350, 1, 'menu-assortiment-60'),
  item('assortiments-sushi-42', 'assortiments-sushi', 'Assortiment - 42 Pièces', 'Selection du chef', 300, 2, 'menu-assortiment-42'),
  item('assortiments-sushi-34', 'assortiments-sushi', 'Assortiment - 34 Pièces', 'Selection du chef', 200, 3, 'menu-assortiment-34'),
  item('assortiments-sushi-24', 'assortiments-sushi', 'Assortiment - 24 Pièces', 'Selection du chef', 170, 4, 'menu-assortiment-24'),
  item('assortiments-sushi-16', 'assortiments-sushi', 'Assortiment - 16 Pièces', 'Selection du chef', 120, 5, 'menu-assortiment-16'),

  item('desserts-tarte-citron', 'desserts', 'Tarte Au Citron', 'Tarte au citron', 40, 0, 'menu-tarte-citron'),
  item('desserts-creme-caramel', 'desserts', 'Crème Caramel', 'Crème caramel', 40, 1, 'menu-creme-caramel'),
  item('eaux-boissons-eau-15l', 'eaux-boissons-gazeuses', 'Eau de 1,5 L', 'Bouteille d’eau de 1,5 L', 20, 0, 'menu-eau-15l'),
  item('eaux-boissons-eau-50cl', 'eaux-boissons-gazeuses', 'Eau de 50 CL', 'bouteille d’eau moyenne', 12, 1, 'menu-eau-50cl'),
];

const itemTranslations: Record<string, { en: [string, string]; ar: [string, string] }> = {
  'soupes-formule-chef': { en: ['Chef Special Soup - 4 balls', 'Seafood velouté'], ar: ['شوربة الشيف - 4 كرات', 'كريمة من ثمار البحر'] },
  'soupes-pho': { en: ['Pho soup', 'Rice noodles, sliced beef and onions'], ar: ['شوربة فو', 'معكرونة الأرز، شرائح اللحم البقري والبصل'] },
  'soupes-ravioli-crevettes': { en: ['Shrimp Ravioli Soup', 'Ravioli, shrimp'], ar: ['شوربة رافيولي الجمبري', 'رافيولي، جمبري'] },
  'soupes-viet-garden': { en: ['Viet-Garden Soup', 'Seafood velouté'], ar: ['شوربة فييت غاردن', 'كريمة من ثمار البحر'] },
  'soupes-vermicelles-poulet-crevettes': { en: ['Chicken and Shrimp Vermicelli Soup', 'Chicken, shrimp, vermicelli, black mushrooms'], ar: ['شوربة الشعيرية بالدجاج والجمبري', 'دجاج، جمبري، شعيرية، فطر أسود'] },
  'soupes-pekinoise': { en: ['Peking Soup', 'Hot and sour velouté, chicken, shrimp, tofu'], ar: ['الشوربة البكينية', 'كريمة حامضة وحارة، دجاج، جمبري، توفو'] },
  'salades-formule-chef': { en: ['Chef Special Salad - 4 people', 'Raw vegetables, corn, surimi, shrimp'], ar: ['سلطة الشيف - 4 أشخاص', 'خضروات طازجة، ذرة، سوريمي، جمبري'] },
  'salades-exotique': { en: ['Exotic Salad', 'Raw vegetables, fruit, corn, shrimp, surimi, crab'], ar: ['السلطة الاستوائية', 'خضروات طازجة، فواكه، ذرة، جمبري، سوريمي، سلطعون'] },
  'salades-bo-bun': { en: ['Bo Bun Salad', 'Raw vegetables, rice vermicelli, beef, chicken nems, shrimp, peanuts'], ar: ['سلطة بو بون', 'خضروات طازجة، شعيرية الأرز، لحم بقري، نيم الدجاج، جمبري، فول سوداني'] },
  'salades-viet-garden': { en: ['Viet-Garden Salad', 'Raw vegetables, corn, surimi, shrimp'], ar: ['سلطة فييت غاردن', 'خضروات طازجة، ذرة، سوريمي، جمبري'] },
  'salades-vietnamienne': { en: ['Vietnamese Salad', 'Raw vegetables, chicken, shrimp, peanuts'], ar: ['السلطة الفيتنامية', 'خضروات طازجة، دجاج، جمبري، فول سوداني'] },
  'hors-doeuvre-nems-formule-chef': { en: ['Chef Special Nems - 5 large nems', 'Minced chicken, black mushrooms, onions, vermicelli'], ar: ['نيم الشيف - 5 قطع كبيرة', 'دجاج مفروم، فطر أسود، بصل، شعيرية'] },
  'hors-doeuvre-beignets-formule-chef': { en: ['Chef Special Shrimp Fritters', '15 shrimp fritters'], ar: ['فطائر الجمبري الخاصة بالشيف', '15 فطيرة جمبري'] },
  'hors-doeuvre-assortiment-viet-garden': { en: ['Viet-Garden Platter', 'Two large nems, four small nems, four shrimp fritters, four aromaki'], ar: ['تشكيلة فييت غاردن', 'قطعتان كبيرتان من النيم، أربع قطع صغيرة، أربع فطائر جمبري، أربع أرومـاكي'] },
  'hors-doeuvre-riz-cantonais': { en: ['Cantonese Rice', 'Rice, chicken, beef, shrimp, button mushrooms, peas'], ar: ['الأرز الكانتوني', 'أرز، دجاج، لحم بقري، جمبري، فطر أبيض، بازلاء'] },
  'hors-doeuvre-nems-crevettes': { en: ['Shrimp Nems', 'Minced chicken, shrimp, black mushrooms, onions, vermicelli'], ar: ['نيم الجمبري', 'دجاج مفروم، جمبري، فطر أسود، بصل، شعيرية'] },
  'hors-doeuvre-beignets-crevettes': { en: ['Shrimp Fritters', 'Shrimp fritters'], ar: ['فطائر الجمبري', 'فطائر الجمبري'] },
  'hors-doeuvre-sui-mai': { en: ['Steamed Sui Mai', 'Steamed shrimp dumplings'], ar: ['سوي ماي على البخار', 'رافيولي الجمبري على البخار'] },
  'hors-doeuvre-nems-poulet': { en: ['Chicken Nems', 'Minced chicken, black mushrooms, onions, vermicelli'], ar: ['نيم الدجاج', 'دجاج مفروم، فطر أسود، بصل، شعيرية'] },
  'hors-doeuvre-nems-vegetariens': { en: ['Vegetarian Nems', 'Cabbage, carrot, vermicelli, black mushroom, corn'], ar: ['نيم نباتي', 'ملفوف، جزر، شعيرية، فطر أسود، ذرة'] },
  'hors-doeuvre-omelette-vietnamienne': { en: ['Vietnamese Omelette', 'Nems filling, shrimp, surimi, eggs'], ar: ['العجة الفيتنامية', 'حشوة النيم، جمبري، سوريمي، بيض'] },
  'hors-doeuvre-rouleaux-printemps': { en: ['Spring Rolls', 'Raw vegetables, beef, shrimp, vermicelli rolls, rice paper'], ar: ['لفائف الربيع', 'خضروات طازجة، لحم بقري، جمبري، لفائف الشعيرية، ورق الأرز'] },
  'boeufs-saute-viet-garden': { en: ['Viet-Garden Sautéed Beef', 'Sliced beef, button and black mushrooms on a hot plate'], ar: ['لحم بقري سوتيه فييت غاردن', 'شرائح لحم بقري، فطر أبيض وأسود على صفيحة ساخنة'] },
  'canards-ananas': { en: ['Duck with Pineapple', 'Duck, pineapple'], ar: ['البط بالأناناس', 'بط، أناناس'] },
  'poulets-mixao-100': { en: ['Mixao Chicken', 'Chicken noodles'], ar: ['ميشاو بالدجاج', 'نودلز بالدجاج'] },
  'poulets-saute-viet-garden': { en: ['Viet-Garden Sautéed Chicken', 'Chicken, button mushrooms, black mushrooms'], ar: ['دجاج سوتيه فييت غاردن', 'دجاج، فطر أبيض، فطر أسود'] },
  'poulets-ananas': { en: ['Chicken with Pineapple', 'Chicken, pineapple'], ar: ['الدجاج بالأناناس', 'دجاج، أناناس'] },
  'poulets-curry': { en: ['Chicken Curry', 'Chicken, button mushrooms, black mushrooms, curry'], ar: ['دجاج بالكاري', 'دجاج، فطر أبيض، فطر أسود، كاري'] },
  'poulets-brochettes': { en: ['Chicken Skewers', 'Chicken skewers'], ar: ['أسياخ الدجاج', 'أسياخ الدجاج'] },
  'poulets-mixao-90': { en: ['Mixao Chicken', 'Chicken noodles'], ar: ['ميشاو بالدجاج', 'نودلز بالدجاج'] },
  'fruits-de-mer-crevettes-viet-garden': { en: ['Viet-Garden Shrimp', 'Beef, shrimp, chicken'], ar: ['جمبري فييت غاردن', 'لحم بقري، جمبري، دجاج'] },
  'fruits-de-mer-marmite': { en: ['Seafood Casserole', 'Shrimp, squid, fish, crab, mushroom'], ar: ['قدر ثمار البحر', 'جمبري، حبار، سمك، سلطعون، فطر'] },
  'fruits-de-mer-viet-garden': { en: ['Viet-Garden Seafood', 'Shrimp, squid, fish, mushrooms'], ar: ['ثمار البحر فييت غاردن', 'جمبري، حبار، سمك، فطر'] },
  'fruits-de-mer-poissons-aigre-doux': { en: ['Sweet and Sour Fish', 'Fish, pineapple, bell pepper, carrot, black mushroom'], ar: ['سمك حلو وحامض', 'سمك، أناناس، فلفل، جزر، فطر أسود'] },
  'fruits-de-mer-mixao': { en: ['Mixao Seafood', 'Seafood noodles'], ar: ['ميشاو بثمار البحر', 'نودلز بثمار البحر'] },
  'assortiments-sushi-80': { en: ['Platter - 80 Pieces', "Chef's selection"], ar: ['تشكيلة - 80 قطعة', 'اختيار الشيف'] },
  'assortiments-sushi-60': { en: ['Platter - 60 Pieces', "Chef's selection"], ar: ['تشكيلة - 60 قطعة', 'اختيار الشيف'] },
  'assortiments-sushi-42': { en: ['Platter - 42 Pieces', "Chef's selection"], ar: ['تشكيلة - 42 قطعة', 'اختيار الشيف'] },
  'assortiments-sushi-34': { en: ['Platter - 34 Pieces', "Chef's selection"], ar: ['تشكيلة - 34 قطعة', 'اختيار الشيف'] },
  'assortiments-sushi-24': { en: ['Platter - 24 Pieces', "Chef's selection"], ar: ['تشكيلة - 24 قطعة', 'اختيار الشيف'] },
  'assortiments-sushi-16': { en: ['Platter - 16 Pieces', "Chef's selection"], ar: ['تشكيلة - 16 قطعة', 'اختيار الشيف'] },
  'desserts-tarte-citron': { en: ['Lemon Tart', 'Lemon tart'], ar: ['تارت الليمون', 'تارت الليمون'] },
  'desserts-creme-caramel': { en: ['Crème Caramel', 'Crème caramel'], ar: ['كريم كراميل', 'كريم كراميل'] },
  'eaux-boissons-eau-15l': { en: ['Water 1.5 L', '1.5 L bottle of water'], ar: ['ماء 1.5 لتر', 'قارورة ماء بسعة 1.5 لتر'] },
  'eaux-boissons-eau-50cl': { en: ['Water 50 CL', 'Medium bottle of water'], ar: ['ماء 50 سنتيلتر', 'قارورة ماء متوسطة'] },
};

categories.forEach((categoryItem) => {
  const translation = categoryTranslations[categoryItem.id];
  if (translation) categoryItem.name = { ...categoryItem.name, ...translation };
});

items.forEach((menuItem) => {
  const translation = itemTranslations[menuItem.id];
  if (translation) {
    menuItem.name = { ...menuItem.name, en: translation.en[0], ar: translation.ar[0] };
    menuItem.description = { ...menuItem.description, en: translation.en[1], ar: translation.ar[1] };
  }
});

export const glovoMenuDocument: MenuDocument = {
  sourceLanguage: 'fr',
  availability: {
    status: 'open',
    schedule: { monday: [], tuesday: [], wednesday: [], thursday: [], friday: [], saturday: [], sunday: [] },
    temporaryClosure: { active: false, message: {} },
    manualOverride: 'open',
    statusMessage: {},
  },
  categories,
  items,
  featuredSections: [
    {
      id: 'top-des-ventes',
      title: { fr: 'Top des ventes', en: 'Best Sellers', ar: 'الأكثر مبيعًا' },
      itemIds: [
        'hors-doeuvre-assortiment-viet-garden',
        'assortiments-sushi-34',
        'assortiments-sushi-16',
      ],
      sortOrder: 0,
      active: true,
    },
  ],
};
