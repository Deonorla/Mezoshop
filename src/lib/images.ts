/**
 * Curated Unsplash image library for MezoShop.
 * All URLs are verified direct CDN links — no API key needed.
 * Format: https://images.unsplash.com/{photo-id}?q=85&w=800&auto=format&fit=crop
 *
 * ⚠️  URLs marked PREMIUM require Unsplash+ and will not display publicly.
 *     Use a free alternative instead.
 */

const BASE = 'https://images.unsplash.com';
const Q = '?q=85&w=800&auto=format&fit=crop';

export const IMAGES = {

  // ─── Watches ───────────────────────────────────────────────────────────────
  watch: {
    /** silver & white Rolex analog — 1M views */
    rolex: `${BASE}/photo-1620625515032-6ed0c1790c75${Q}`,
    /** existing AP chronograph */
    chronograph: `${BASE}/photo-1523170335258-f5ed11844a49${Q}`,
  },

  // ─── Bags ──────────────────────────────────────────────────────────────────
  bags: {
    /** black Michael Kors tote — 2M views */
    michaelKorsTote: `${BASE}/photo-1614179689702-355944cd0918${Q}`,
    /** woman holding pink Italian purse — 910K views */
    pinkPurse: `${BASE}/photo-1683921590274-a83862cb11c3${Q}`,
    /** brown leather handbag beside MacBook — 3.3M views */
    brownLeatherFlatlay: `${BASE}/photo-1598099947145-e85739e7ca28${Q}`,
    /** Michael Kors store window display — 428K views */
    michaelKorsWindow: `${BASE}/photo-1682364853177-b69f92750a96${Q}`,
    /** existing quilted chain bag */
    quiltedChain: `${BASE}/photo-1548036328-c9fa89d128fa${Q}`,
    // ⚠️  PREMIUM — brown leather purse with long strap (BXWGZgFhBuU)
    // brownLongStrap: `https://plus.unsplash.com/premium_photo-1664392147011-2a720f214e01${Q}`,
  },

  // ─── Dresses / Gowns ───────────────────────────────────────────────────────
  dresses: {
    /** floral dress on mannequin — free, Canon 5D */
    floralMannequin: `${BASE}/photo-1713998230931-3e4ea9abf7e8${Q}`,
    /** existing silk gown editorial */
    silkGown: `${BASE}/photo-1515886657613-9f3515b0c78f${Q}`,
  },

  // ─── Shoes ─────────────────────────────────────────────────────────────────
  shoes: {
    /** white Nike Air Force 1 — 3.7M views */
    nikeAirForce: `${BASE}/photo-1608231387042-66d1773070a5${Q}`,
    /** existing black leather chelsea boot */
    chelseaBoot: `${BASE}/photo-1543163521-1bf539c55dd2${Q}`,
    /** white & orange athletic shoes on box — 31M views ⭐ */
    whiteOrangeAthletic: `${BASE}/photo-1560769629-975ec94e6a86${Q}`,
    /** white & brown sneakers on table — 3.5M views */
    whiteBrownSneakers: `${BASE}/photo-1603808033192-082d6919d3e1${Q}`,
    /** Carhartt x Nike Air Force 1 — 1.7M views */
    carharttNike: `${BASE}/photo-1549298916-f52d724204b4${Q}`,
    /** brown & white Nike sneakers — 251K views */
    brownWhiteNike: `${BASE}/photo-1617689563472-c66428e83d17${Q}`,
    /** brown leather loafers on blue textile — 1.4M views */
    brownLoafers: `${BASE}/photo-1616406432452-07bc5938759d${Q}`,
    /** brown leather shoes on floor tiles — 261K views */
    brownLeatherFloor: `${BASE}/photo-1614253429340-98120bd6d753${Q}`,
    /** brown shoes with black soles — 19K views */
    brownBlackSoles: `${BASE}/photo-1653868249972-58eeb5ca467e${Q}`,
    /** black & brown leather lace-up boots — 144K views */
    blackBrownBoots: `${BASE}/photo-1621996659546-b0dd8b7e57af${Q}`,
    /** black Givenchy sneakers on white — 47K views */
    blackGivenchy: `${BASE}/photo-1661332445185-6e2ca6754fc4${Q}`,
    /** stylish black sneakers on white surface — 5K views */
    blackSneakersWhite: `${BASE}/photo-1750726134041-4dfd4d86592d${Q}`,
    /** white & red sneaker on pink background — 14K views */
    whiteRedPink: `${BASE}/photo-1690988550616-1cf0b63e2824${Q}`,
    /** close-up Puma shoe on table — 24K views */
    pumaCloseup: `${BASE}/photo-1714396692946-de3d237ed3ce${Q}`,
    /** person holding gray floral sneakers — 713K views */
    floralSneakers: `${BASE}/photo-1573178025112-0237e3d2c12f${Q}`,
    /** close-up Veja sneakers — 187K views */
    vejaCloseup: `${BASE}/photo-1663151860150-98ba9a22d696${Q}`,
    /** brown & white handmade shoe — 19K views */
    brownWhiteHandmade: `${BASE}/photo-1654945419086-bcb1c1e1b875${Q}`,
    /** red heels on white table — 2.3M views */
    redHeels: `${BASE}/photo-1613987876445-fcb353cd8e27${Q}`,
    /** pink & white peep-toe sandals — 849K views */
    pinkSandals: `${BASE}/photo-1630407332126-70ebb700976b${Q}`,
    /** brown leather open-toe heeled sandals — 230K views */
    brownHeelSandals: `${BASE}/photo-1630386474440-8f2e6d752a98${Q}`,
    /** elegant bridal shoes on textured surface — 36K views */
    bridalShoes: `${BASE}/photo-1743012842733-6dd307ce3de7${Q}`,
    /** wedding shoes on table — 31K views */
    weddingShoes: `${BASE}/photo-1678924722426-d10bb7f61526${Q}`,
    // ⚠️  PREMIUM — red high heels (Mo-y7YtdOc0) — Unsplash+ only
    // redHighHeelsPremium: `https://plus.unsplash.com/premium_photo-1673977133185-a460c4744cec${Q}`,
  },

  // ─── Suits / Menswear ──────────────────────────────────────────────────────
  menswear: {
    /** person in black suit holding leather bag — 2.3M views */
    blackSuit: `${BASE}/photo-1584184924103-e310d9dc82fc${Q}`,
  },

  // ─── Coats ─────────────────────────────────────────────────────────────────
  coats: {
    /** woman in brown cashmere coat — 1.5M views */
    cashmereCoat: `${BASE}/photo-1539533113208-f6df8cc8b543${Q}`,
  },

  // ─── Clothing / Apparel ────────────────────────────────────────────────────
  clothing: {
    /** person in pink pants & white shoes — 8.4M views ⭐ */
    pinkPants: `${BASE}/photo-1594633312681-425c7b97ccd1${Q}`,
    /** woman in blue denim jeans & white sneakers — 2.9M views */
    blueJeans: `${BASE}/photo-1584370848010-d7fe6bc767ec${Q}`,
    /** person wearing distressed jeans — 62K views */
    distressedJeans: `${BASE}/photo-1538873808457-e53085a169fd${Q}`,
    /** close-up person wearing shorts — 23K views */
    shortsCloseup: `${BASE}/photo-1689942908748-439239d6233c${Q}`,
    /** woman in gray tank top & gray pants — 1.3M views */
    grayPants: `${BASE}/photo-1602573991155-21f0143bb45c${Q}`,
    /** woman in white shirt & purple pants — 76K views */
    purplePants: `${BASE}/photo-1706177208693-2e3c68e5f0f2${Q}`,
    /** woman in white top & blue patterned pants — 7.9K views */
    bluePatterned: `${BASE}/photo-1693990147719-e3e7bef93976${Q}`,
    /** woman in white top & green pants — 6.7K views */
    greenPants: `${BASE}/photo-1693987654722-22276d9891b7${Q}`,
    /** woman next to vase — linen outfit 1 — 4.7K views */
    linenOutfit1: `${BASE}/photo-1693989252142-a4a0e7e57e89${Q}`,
    /** woman next to vase — linen outfit 2 — 4.9K views */
    linenOutfit2: `${BASE}/photo-1693989248546-519d3a87ad24${Q}`,
    /** woman next to vase — linen outfit 3 — 6.8K views */
    linenOutfit3: `${BASE}/photo-1693989245973-5632f75bdc8d${Q}`,
    /** woman next to vase — linen outfit 4 — 2.6K views */
    linenOutfit4: `${BASE}/photo-1693989651221-c7af9e752ab0${Q}`,
    // ⚠️  PREMIUM — man in white shirt & khaki pants (Jz25EXg5r_U)
  },

  // ─── Perfume / Fragrance ───────────────────────────────────────────────────
  perfume: {
    /** clear Dior perfume bottle — 13.3M views ⭐ */
    clearDior: `${BASE}/photo-1458538977777-0549b2370168${Q}`,
    /** red & black Versace bottle — 2.5M views */
    versaceRed: `${BASE}/photo-1587017539504-67cfbddac569${Q}`,
    /** L'Eau Laurissi / Chanel style — 1.8M views */
    laurissi: `${BASE}/photo-1566977776052-6e61e35bf9be${Q}`,
    /** Calvin Klein One — 1.3M views */
    calvinKlein: `${BASE}/photo-1582211594533-268f4f1edcb9${Q}`,
    /** red rose beside Versace Eros — 320K views */
    versaceEros: `${BASE}/photo-1624798956425-ef88fc12b540${Q}`,
    /** two perfume bottles (Zara/Guerlain) — 358K views */
    twoPerfumes: `${BASE}/photo-1575399659107-4a835f7f51a7${Q}`,
    /** Hermès perfume on table — 45K views */
    hermes: `${BASE}/photo-1672060761081-821ddc80299a${Q}`,
    /** perfume on white sheet — 30K views */
    onWhiteSheet: `${BASE}/photo-1690828877581-87d941d73a96${Q}`,
    /** perfume on napkin — 17K views */
    onNapkin: `${BASE}/photo-1682993984139-e89764007717${Q}`,
    // ⚠️  PREMIUM — glass box with ring (hsd_Bb4xAEs), wedding rings (a--udXtK6x0), jewelry on pink (c6jH3LAzC-w), heart necklace (UtvyPmKvb1w), red rose box (1icLGKl3Vgo)
  },

  // ─── Jewellery ─────────────────────────────────────────────────────────────
  jewellery: {
    /** diamond tennis bracelet */
    tennisBracelet: `${BASE}/photo-1515562141207-7a88fb7ce338${Q}`,
    /** white & black stone fragment (jewellery) — 4.9M views ⭐ */
    stoneFragment: `${BASE}/photo-1617038220319-276d3cfab638${Q}`,
    /** gold bracelets on table — 82K views */
    goldBracelets: `${BASE}/photo-1679156271456-d6068c543ee7${Q}`,
    /** gold bracelet on cloth — 33K views */
    goldBraceletCloth: `${BASE}/photo-1653227908236-36813ab5c30a${Q}`,
    /** gold ring on white napkin — 17K views */
    goldRingNapkin: `${BASE}/photo-1689775703784-67f352d486e5${Q}`,
    /** woman with diamond earring — 99K views */
    diamondEarring: `${BASE}/photo-1663079899610-2f00543940cb${Q}`,
    /** close-up earrings (Santorini) — 175K views */
    earringsCloseup: `${BASE}/photo-1642373269987-83473cae4335${Q}`,
    /** gold & silver necklace — 158K views */
    goldSilverNecklace: `${BASE}/photo-1656428361267-b309fd9b20f5${Q}`,
    // ⚠️  PREMIUM — heart necklace (UtvyPmKvb1w), jewelry on pink (c6jH3LAzC-w), wedding rings (a--udXtK6x0), glass ring box (hsd_Bb4xAEs)
  },

  // ─── Watches (extended) ────────────────────────────────────────────────────
  watches: {
    /** silver & white Rolex analog — 1M views */
    rolex: `${BASE}/photo-1620625515032-6ed0c1790c75${Q}`,
    /** existing AP chronograph */
    chronograph: `${BASE}/photo-1523170335258-f5ed11844a49${Q}`,
  },

} as const;

export type ImageKey = keyof typeof IMAGES;
