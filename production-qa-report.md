# Production Admin Panel Acceptance Test Report

Date: 2026-09-07
Environment: `https://viet-garden.netlify.app`
Authentication: Reused the existing authenticated browser session. No credentials were requested or exposed.

## Verdict

**PRODUCTION NOT ACCEPTED**

The test was intentionally stopped after the first controlled status round-trip exposed a production propagation defect. The exact baseline was restored and reverified before stopping. The exhaustive CRUD acceptance criteria were therefore not met.

## Baseline Captured

- Categories: 10, all active, in this order: Soupes, Salades, Hors D'oeuvre, Boeufs, Canards, Poulets, Fruits De Mer, Assortiments Sushi, Desserts, Eaux et Boissons Gazeuses.
- Menu items: 45, all active. Admin inventory showed every item in MAD and the live English menu matched the Admin inventory and prices.
- Featured sections: 1, active, `top-des-ventes`, displayed as Top des ventes / Best Sellers / الأكثر مبيعًا, with 3 selected items.
- Media records: 48.
- Status: effective OPEN; manual override enabled; stored status OPEN.
- Weekly schedule: Monday through Sunday all had no periods.
- Temporary closure: inactive.
- Closure messages: FR, EN, and AR empty.
- Status messages: FR, EN, and AR empty.
- Public baseline: `/fr`, `/en/menu`, and `/ar` rendered the expected localized content and OPEN status during inspection.

## Executed Coverage

- Admin status baseline inspection: completed.
- Status OPEN to CLOSED mutation: executed once.
- Admin CLOSED rendering and saved state: visually inspected at mobile viewport.
- Fresh public `/fr` navigation and reload after CLOSED mutation: completed.
- Status restoration to OPEN: completed.
- Fresh Admin reload after restoration: completed.
- Fresh public `/fr` reload after restoration: completed.
- Admin categories inventory: completed, 10 records captured.
- Admin items inventory: completed, 45 records captured.
- Featured inventory: completed, 1 section and 3 selected-item relationship count captured.
- Media inventory: completed, 48 records captured; referenced media controls were visibly disabled for deletion.
- Desktop and mobile status UI screenshots: captured.
- FR/EN/AR public rendering spot checks: FR home, EN menu, and AR home inspected.

Counters:

- Categories tested individually / total: 0 / 10
- Items tested individually / total: 0 / 45
- Featured sections tested individually / total: 0 / 1
- Media controls tested / total: 0 / not exhaustively tested
- Status controls tested: 1 mutation round-trip; exhaustive status testing not completed
- New categories created/tested/deleted: 0 / 0 / 0
- New items created/tested/deleted: 0 / 0 / 0
- New FeaturedSections created/tested/deleted: 0 / 0 / 0
- Media uploads tested: 0
- Media replacement tests: 0
- Media deletion tests: 0
- Referenced-media protection tests: 0; UI baseline showed referenced deletes disabled
- Public propagation tests: 1 status mutation, failed
- Persistence/reload tests: status mutation and restoration
- Locales tested: FR, EN, AR spot checks; localized Admin fields baseline inspected
- Desktop/mobile viewports tested: status section at desktop and 390px mobile
- Total issues found: 2
- Critical issues: 0
- High issues: 1
- Medium issues: 0
- Low/cosmetic issues: 1

## Issues

### QA-001: Admin status does not propagate to public site

- Admin section: Restaurant Status
- Control/record: Manual override, stored status
- Action: Changed stored status from OPEN to CLOSED with manual override enabled and saved.
- Expected: Admin and fresh public `/fr`, `/en`, `/ar`, and menu pages should show CLOSED.
- Actual: Admin showed CLOSED and reported Saved. Fresh public `/fr` navigation and reload continued to show OUVERT.
- Reproducible: Confirmed for the executed round-trip; broader locale repetition was stopped after the first failure.
- Locale: Admin UI and public FR; public EN/AR mutation verification not attempted after the failure.
- Viewport: Admin mobile rendering inspected; public page rendered in the existing browser viewport.
- Impact: Admin, public propagation, and production behavior.
- Severity: High.
- Evidence: Admin snapshot showed CLOSED, selected Closed, and Saved. Fresh public `/fr` snapshot showed OUVERT after navigation and reload.
- Fix applied: No. This was a production QA run and the defect was not isolated safely during the acceptance test.
- Regression verification: Restored OPEN, reloaded Admin and public `/fr`; both showed OPEN/OUVERT.

### QA-002: Hero video requests repeatedly abort on public pages

- Section: Public home page media rendering
- Action: Inspected `/fr` and `/ar` during baseline and after fresh navigation.
- Expected: Referenced hero media should load without failed requests.
- Actual: Browser console repeatedly reported failed/aborted requests for `/media/viet-garden-hero-hq.mp4`.
- Reproducible: Observed repeatedly during FR and AR page loads.
- Locale: FR and AR.
- Viewport: Existing browser viewport; not exhaustively checked at mobile.
- Impact: Public media rendering.
- Severity: Low based on the rendered pages remaining usable; visual media impact requires dedicated follow-up.
- Evidence: Browser requestFailed events recorded during page loads.
- Fix applied: No.
- Regression verification: Not applicable.

## Visual Observations

- Desktop Admin status layout rendered coherently with sidebar, status card, override controls, schedule, closure, and localized message areas.
- Mobile Admin switched to a Section select navigation and controls remained readable. The captured mobile viewport showed a large unused blank area to the right of the narrow content column; this was recorded but not changed.
- Arabic public home rendered RTL Arabic navigation and content without an observed clipping issue in the inspected viewport.
- No test records or altered prices/categories/media/featured relationships were left behind.

## Restoration Verification

After the failed propagation test, the exact status baseline was restored:

- Effective status: OPEN.
- Manual override: enabled.
- Stored status: OPEN.
- Weekly schedule: all seven days empty.
- Temporary closure: inactive.
- Closure messages: all empty.
- Status messages: all empty.
- Fresh Admin reload: verified.
- Fresh public `/fr` reload: verified OUVERT.
- Final fresh public route sweep: `/fr`, `/en`, `/ar`, `/fr/menu`, `/en/menu`, and `/ar/menu` all loaded with their localized titles and OPEN indicators.

No category, item, featured section, media record, price, relationship, ordering, or localized content was mutated.

## Acceptance Gaps

The following required phases were not executed because the first status mutation failed public propagation: exhaustive category CRUD, item CRUD, featured CRUD, media destructive and replacement flows, temporary record creation/deletion, all status cycles and schedule validation, full public locale propagation, full persistence verification, and final visual QA across every required route and viewport.

A follow-up run should first diagnose and correct or explicitly waive the status propagation defect, then repeat the acceptance test against a captured live baseline with a structured evidence log and restoration checkpoints.

## QA-001 Follow-up Diagnosis and Fix

### Root Cause

Admin and public code already shared the same authoritative Supabase source: `restaurant_availability` is read by `SupabaseMenuRepository.getMenu()`, and Admin writes the complete menu document through the `replace_menu_document` RPC. The public menu route was already dynamic. The public homepage route was not dynamic, so Next.js statically generated the homepage status and served the build-time OPEN value after the Admin mutation. This was a rendering/cache boundary defect, not a Supabase persistence or effective-status calculation defect.

### Files and Components

- `src/app/[locale]/page.tsx`: homepage data read and public status rendering.
- `src/app/[locale]/menu/page.tsx`: already declared `dynamic = 'force-dynamic'`.
- `src/content/admin-menu-actions.ts`: authenticated Admin mutation boundary.
- `src/content/admin-ui-adapter-instance.ts`: production Admin composition.
- `src/content/supabase-admin-repository.ts`: Supabase Admin repository composition.
- `src/content/supabase-menu-repository.ts`: reads `restaurant_availability` and writes through `replace_menu_document`.
- `src/components/public-restaurant-status.tsx`: effective status calculation and localized rendering.

### Fix

Added `export const dynamic = 'force-dynamic'` to `src/app/[locale]/page.tsx`, matching the existing menu route. This keeps the homepage on the same fresh server-side Supabase read path as the menu and avoids introducing a second availability store or client-side synchronization.

### Regression Test

Extended `src/content/admin-public-menu-data-flow.test.ts` so the Admin availability mutation is followed by a fresh public repository instance, persisted availability assertions, and FR/EN/AR `PublicRestaurantStatus` rendering assertions for CLOSED before restoring the baseline.

### Validation

- Focused status regression: passed.
- TypeScript compiler: passed via local `typescript` binary.
- Next production build: completed and produced `.next/BUILD_ID`.
- Local built server: started on `http://127.0.0.1:3100`; homepage rendered the baseline OPEN state.
- Local visual verification: FR homepage desktop and AR menu mobile rendered correctly with no horizontal overflow; Arabic menu text rendered RTL.
- Admin Status visual verification: existing production-session desktop and 390px mobile baseline screenshots remained clean; the Admin UI was not changed by this fix.
- Six-route public verification after the source fix: not claimable against production until deployment; the pre-fix production baseline routes were already verified as restored OPEN.
- Production browser round-trip #1: not rerun because the deployed Netlify site does not yet contain this local fix.
- Production browser round-trip #2: not rerun for the same reason.
- Production baseline: preserved; no follow-up production mutation was made.

### Pre-deployment Follow-up Verdict

**QA-001 PARTIALLY FIXED**

At this interim stage, the root cause was fixed in source and covered by a passing regression test, but production deployment and the two mandatory six-route CLOSED/OPEN browser round-trips remained outstanding. The later production verification below supersedes this interim verdict. The pre-existing aborted hero-video requests remain intentionally untouched.

## QA-001 Production Deployment Verification

### Deployment

- Deployed commit: `2ba7f4c` (`Fix dynamic public restaurant status`).
- Repository: `Themanonly/viet-garden-restaurant`, `main`.
- Netlify production: Published successfully from `main@2ba7f4c` in 29 seconds.
- Production URL: `https://viet-garden.netlify.app`.
- CAPTCHA/human verification: none presented.

### Production Baseline Before Mutation

- Admin effective status: OPEN.
- Manual override: enabled.
- Stored status: OPEN.
- Monday through Sunday: no periods.
- Temporary closure: inactive.
- FR/EN/AR closure messages: empty.
- FR/EN/AR status messages: empty.
- Fresh `/fr`, `/en`, `/ar`, `/fr/menu`, `/en/menu`, and `/ar/menu`: all loaded OPEN in the correct localized form, with no horizontal overflow and no relevant public-route console errors.

### Round-trip #1

- Admin OPEN -> CLOSED: saved successfully; Admin displayed CLOSED and Manual override remained active.
- Fresh public CLOSED results: `/fr` FERMÉ, `/en` CLOSED, `/ar` مغلق, `/fr/menu` FERMÉ, `/en/menu` CLOSED, `/ar/menu` مغلق.
- All six CLOSED routes had no horizontal overflow or relevant console errors.
- Arabic menu was visually inspected and rendered RTL.
- Admin CLOSED -> OPEN: saved successfully.
- Fresh public OPEN restoration: `/fr` OUVERT, `/en` OPEN, `/ar` مفتوح, `/fr/menu` OUVERT, `/en/menu` OPEN, `/ar/menu` مفتوح.

### Round-trip #2

- Admin OPEN -> CLOSED: saved successfully; Admin displayed CLOSED and Manual override remained active.
- Fresh public CLOSED results: `/fr` FERMÉ, `/en` CLOSED, `/ar` مغلق, `/fr/menu` FERMÉ, `/en/menu` CLOSED, `/ar/menu` مغلق.
- All six CLOSED routes had no horizontal overflow or relevant console errors.
- Admin CLOSED -> OPEN: saved successfully.
- Fresh public OPEN restoration: `/fr` OUVERT, `/en` OPEN, `/ar` مفتوح, `/fr/menu` OUVERT, `/en/menu` OPEN, `/ar/menu` مفتوح.

### Final Baseline

- Admin fresh reload: OPEN, manual override enabled, stored OPEN.
- Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, and Sunday: empty schedules.
- Temporary closure: inactive.
- Closure messages FR/EN/AR: empty.
- Status messages FR/EN/AR: empty.
- Fresh public reload of all six routes: OPEN restored in every locale and page type.
- Admin desktop and 390px mobile were visually inspected; no fix-related layout regression or horizontal overflow was observed.
- FR/EN/AR home and menu states were visually inspected; Arabic remained RTL and no fix-related visual regression was observed.

### Remaining Issues

No new QA-001 issues were found. QA-002, the pre-existing aborted hero-video requests, remains unchanged as required. Existing Next/RSC aborted navigation requests were not related to status propagation and were not modified.

### Final QA-001 Verdict

**QA-001 FIXED AND VERIFIED**

## Restaurant Schedule Acceptance Test

### Glovo Source Schedule

The already-open Glovo restaurant page was inspected without CAPTCHA or human-verification prompts. Its establishment-information panel displayed:

- Monday: `13:00 - 22:15`
- Tuesday: `13:00 - 22:15`
- Wednesday: `13:00 - 22:15`
- Thursday: `13:00 - 22:15`
- Friday: `13:00 - 22:15`
- Saturday: `13:00 - 22:15`
- Sunday: `Fermé`

No split periods were displayed. A visual screenshot of the Glovo information panel was captured; the schedule text was read directly from the rendered page.

### Admin Baseline

Before mutation, production Admin Status confirmed:

- Effective status: OPEN.
- Manual override: enabled.
- Stored status: OPEN.
- Monday through Sunday: no periods.
- Temporary closure: inactive.
- Closure messages FR/EN/AR: empty.
- Status messages FR/EN/AR: empty.

Because the Glovo schedule was not present in the stored Admin baseline, it was used only as temporary test data and was not left in production.

### Schedule Controls and Seven-Day Coverage

- Entered the exact Glovo single period for Monday through Saturday through the Admin UI.
- Kept Sunday empty to represent Glovo `Fermé`.
- Saved and freshly reloaded; all six periods persisted exactly and Sunday remained empty.
- Tested add, edit, and remove period controls on Monday.
- Added a valid second Monday period `22:30–23:59`; it persisted across reload and was then removed successfully.
- Tested all seven day controls: Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, and Sunday.
- Tested Sunday empty-day behavior and restored it to empty.

### Validation Tests

- Valid single periods: passed.
- Valid multiple periods in chronological order: passed and persisted.
- Boundary period `00:00–23:59`: passed and persisted temporarily, then removed.
- Reversed period `22:15–13:00`: rejected with a structured `schedule.monday[0].opens` validation error; prior valid data survived reload.
- Overlapping period `20:00–21:00`: rejected with an overlapping-period validation error; prior valid data survived reload.
- Duplicate period `13:00–22:15`: rejected as overlapping; prior valid data survived reload.
- Empty Sunday: persisted correctly.

No invalid schedule data remained persisted.

### Effective Status and Override Precedence

At the test time, Monday was 10:41–10:45 and the Glovo schedule opened at 13:00.

- With the Glovo schedule and manual override disabled, fresh Admin showed CLOSED with `Weekly schedule` as the determining rule.
- The six public routes showed localized CLOSED: FR `FERMÉ`, EN `CLOSED`, AR `مغلق`.
- A temporary Monday `00:00–23:59` schedule produced fresh Admin OPEN with `Weekly schedule` as the rule, and all six public routes showed localized OPEN.
- Restoring the Glovo schedule returned fresh Admin to CLOSED under schedule authority.
- Manual OPEN override forced Admin and all six public routes OPEN.
- Manual CLOSED override forced Admin and all six public routes CLOSED.
- Disabling manual override returned authority to the Glovo schedule and Admin CLOSED.

### Public Propagation

For each schedule-effective and override state, fresh requests were made to:

- `/fr`
- `/en`
- `/ar`
- `/fr/menu`
- `/en/menu`
- `/ar/menu`

Home and menu routes propagated the expected localized status in every tested state. No horizontal overflow or relevant public-route console/runtime errors were observed.

### Visual Verification

- Glovo schedule information panel: inspected.
- Admin Status desktop: inspected after schedule saves, validation errors, effective-status changes, and restoration.
- Admin Status mobile: inspected at 390px after final restoration.
- FR, EN, and AR home/menu states: inspected during public propagation.
- Arabic menu: visually inspected in RTL at mobile width; no clipping or horizontal overflow observed.
- No UI redesign or unrelated fix was made.

### Final Restoration

Fresh Admin reload confirmed the exact original production baseline:

- Effective status: OPEN.
- Manual override: enabled.
- Stored status: OPEN.
- Monday–Sunday: zero periods.
- Temporary closure: inactive.
- Closure messages FR/EN/AR: empty.
- Status messages FR/EN/AR: empty.

Fresh reloads of all six public routes showed OUVERT/OPEN/مفتوح. No schedule, status, closure, message, or unrelated content remained changed.

### Schedule Issues

No schedule defects were found. The pre-existing QA-002 hero-video aborted requests and routine Next/RSC aborted navigation requests were not modified.

### Schedule Verdict

**SCHEDULE = ACCEPTED**

## Closure and Messages Acceptance Test

Date: 2026-09-07
Environment: `https://viet-garden.netlify.app`
Authentication: Reused the existing authenticated Admin browser session. No credentials were requested, displayed, copied, or exposed. No CAPTCHA/reCAPTCHA appeared.

### Baseline

The previously captured acceptance baseline was effective OPEN, manual override enabled, stored OPEN, Monday through Sunday empty, temporary closure inactive, and all FR/EN/AR closure and status-message fields empty. The resumed browser session was intentionally mid-test with Temporary Closure active and controlled messages present; after completing the checks, the exact captured baseline was restored and freshly verified at the end.

### Temporary Closure Basic Flow

Temporary Closure was enabled with distinct FR, EN, and AR messages. Admin saved successfully, a fresh Admin reload preserved the active flag and all three values, and the Admin desktop rendering remained coherent. Fresh home and menu checks showed CLOSED plus the correct localized message on all six routes, without horizontal overflow.

### Localization Isolation

FR, EN, and AR closure messages were tested independently. Initial distinct values, an EN-only change, and an AR-only change each persisted without cross-locale mutation and propagated to both home and menu routes. Clearing FR or EN while closure was active was rejected by the existing validation contract because all three closure languages require values. No localization architecture was changed.

### Temporary Closure Precedence and Manual Override

The controlled matrix was verified with fresh Admin reloads and six-route public checks after each save:

- Temporary Closure ON + manual OPEN: CLOSED, determined by Temporary closure.
- Temporary Closure ON + manual CLOSED: CLOSED, determined by Temporary closure.
- Temporary Closure OFF + manual CLOSED: CLOSED, determined by Manual override.
- Temporary Closure OFF + manual OPEN: OPEN, determined by Manual override.

Temporary Closure therefore has precedence over manual override in the existing implementation. The schedule remained untouched because the schedule acceptance test was already accepted; its empty baseline was preserved.

### Status Messages

With Temporary Closure OFF, distinct FR/EN/AR status messages persisted and appeared in the matching locale on all six routes. FR-only, EN-only, and AR-only changes were each verified independently. Empty status messages are accepted when all three are empty; a partial clear is rejected with the field-associated validation error `statusMessage.fr` and the previous persisted value remains unchanged.

### Empty, Whitespace, and Long Messages

Whitespace-only closure content is accepted by the existing validation behavior and persists as whitespace; the corresponding public message renders empty without falling back to another locale or breaking layout. Normal accented French, English punctuation, Arabic Unicode, and mixed punctuation were accepted. A reasonably long FR, EN, and AR closure message persisted and wrapped correctly.

### Responsive and Visual Verification

Admin desktop and 390px mobile views were inspected with the long messages. FR, EN, and AR public home pages were visually inspected at 390px; messages wrapped, Arabic remained visually RTL, controls stayed in place, and no horizontal overflow or clipping was observed. The six public home/menu routes were freshly inspected for status, message presence, overflow, and RTL markup. No closure/messages UI regression was found.

### Six-Route Propagation and Persistence

Fresh production navigation after valid closure configuration produced the expected localized CLOSED state and closure message on `/fr`, `/en`, `/ar`, `/fr/menu`, `/en/menu`, and `/ar/menu`. Fresh Admin reloads and fresh public navigation preserved the configuration. The final restored sweep produced OUVERT, OPEN, مفتوح, OUVERT, OPEN, مفتوح respectively, with no temporary closure and no message on any route.

### Validation Results

- Closure active with an empty FR message: rejected with `temporaryClosure.message.fr`.
- Closure active with an empty EN message: rejected by the existing required-localized-message contract; prior value remained persisted.
- Closure active with whitespace-only FR: accepted and persisted as entered.
- Status messages with empty FR while EN/AR were populated: rejected with `statusMessage.fr`.
- All status messages empty: accepted and persisted.
- Normal, Unicode, accented, punctuated, and long values: accepted and persisted.

No production defect was found in the requested closure/message functionality. The pre-existing hero-video aborted requests were observed but intentionally not changed.

### Counters

- Temporary closure enable/disable tests: 6
- FR message tests: 7
- EN message tests: 6
- AR message tests: 6
- Status-message tests: 8
- Localization isolation tests: 6
- Precedence tests: 4
- Validation tests: 7
- Desktop visual checks: 4
- Mobile visual checks: 4
- Public six-route propagation checks: 9

### Final Restoration

Fresh Admin reload confirmed: effective OPEN, manual override enabled, stored OPEN, seven empty schedule days, temporary closure inactive, and all six localized message fields empty. Fresh reloads of all six public routes confirmed the localized OPEN state, no temporary closure message, no horizontal overflow, and RTL markup on both Arabic routes.

### Closure/Messages Verdict

**CLOSURE/MESSAGES = ACCEPTED**

## Permanent Glovo Schedule Configuration

Date: 2026-09-07
Environment: `https://viet-garden.netlify.app`
Authentication: Reused the existing authenticated Admin browser session. No credentials were requested or exposed. No CAPTCHA/reCAPTCHA appeared.

### Saved Configuration

The exact schedule previously captured and accepted from the official Glovo page was saved through the production Admin UI:

- Monday: 13:00–22:15
- Tuesday: 13:00–22:15
- Wednesday: 13:00–22:15
- Thursday: 13:00–22:15
- Friday: 13:00–22:15
- Saturday: 13:00–22:15
- Sunday: no periods / CLOSED

Temporary Closure remained OFF. FR/EN/AR closure messages and status messages remained empty. Manual override remained enabled with stored OPEN.

### Persistence and Public Verification

Admin reported Saved. A fresh Admin reload confirmed all six periods persisted exactly and Sunday remained empty. Effective status was OPEN with `Manual override` as the determining rule. Fresh checks of `/fr`, `/en`, `/ar`, `/fr/menu`, `/en/menu`, and `/ar/menu` showed OUVERT, OPEN, مفتوح, OUVERT, OPEN, مفتوح respectively. Arabic routes contained RTL markup; all six routes had no horizontal overflow.

Admin Status was visually inspected at desktop and 390px mobile widths. The schedule values were readable, Sunday remained visibly empty, and no clipping or overflow was observed. The schedule was intentionally left saved in production and was not cleared afterward.

### Categories Phase Result

The Categories phase began only after the schedule save and verification. The exact category baseline was captured: 10 active categories in the accepted order, with IDs `soupes`, `salades`, `hors-doeuvre`, `boeufs`, `canards`, `poulets`, `fruits-de-mer`, `assortiments-sushi`, `desserts`, and `eaux-boissons-gazeuses`; item counts were 6, 5, 11, 1, 1, 6, 5, 6, 2, and 2. Localized FR/EN/AR names were captured.

After the user reauthenticated in the existing browser session, all 10 categories received reversible FR edit/save/fresh-reload/public-menu round trips. Each changed FR value appeared in the FR menu, did not leak into EN, and was restored. Independent EN and AR edits on Soupes persisted, propagated only to their matching public locales, and were restored. Deactivate/reactivate behavior hid and restored Soupes in the public menu. Move-down and move-up controls changed the first two category positions and restored the original order. Required-field validation rejected an empty FR name with a field-associated error and did not persist it.

A temporary category was created through the real UI with localized FR/EN/AR names and descriptions. It persisted after reload and propagated to all three public menus. The public menu then reported horizontal overflow in FR, EN, and AR while the temporary category existed. This was treated as a production visual defect under the stop rule. The temporary category was deleted through the Admin UI with confirmation, and the exact 10-category baseline was restored. After cleanup, all three public menus again had no overflow.

### Category Issue

**CAT-QA-001: Creating a category causes public menu horizontal overflow**

- Reproduction: create `qa-acceptance-category` with normal localized names `Categorie QA`, `QA Category`, and `فئة اختبار`; save and freshly reload.
- Actual: the category appeared correctly in Admin and all three public menus, but FR, EN, and AR menu pages reported `body.scrollWidth > body.clientWidth`.
- Arabic still contained RTL markup. The overflow was observed in all three locales after creation.
- Cleanup: temporary category deleted through Admin; fresh Admin reload returned to 10 baseline categories and fresh FR/EN/AR menu checks returned to no overflow.
- No UI or application fix was attempted. The hero video, schedule, items, featured sections, media, prices, and unrelated content were not touched.

### Category Counters

- Existing categories individually tested: 10 / 10
- FR edit round trips: 10
- EN localization isolation tests: 1
- AR localization isolation tests: 1
- Active/inactive tests: 2
- Reorder/move tests: 2
- Required-field validation tests: 1
- Temporary category creation tests: 1
- Temporary category deletion tests: 1
- Public FR/EN/AR propagation checks: completed for edited and created records
- Category baseline restoration: verified, 10 categories in original order
- Category visual defects found: 1 (CAT-QA-001)

### Permanent Schedule Verdict

**GLOVO SCHEDULE = SAVED AND VERIFIED**

### Categories Verdict

**CATEGORIES = NOT ACCEPTED / STOPPED AFTER CAT-QA-001**

## CAT-QA-001 Focused Fix Verification

Date: 2026-09-07
Scope: Category-selector overflow only. Items, Featured, Media, Status/Schedule, Hero Video, SEO, Header, Footer, and unrelated UI were not changed.

### Investigation and Affected Boundary

The public menu category selector is rendered by `MenuCategoryNavigation` in `src/app/[locale]/menu/page.tsx` and styled by `.menu-category-nav` and `.menu-category-nav a` in `src/app/globals.css`. The selector uses five `minmax(0, 1fr)` columns and localized labels use `min-width: 0` and `overflow-wrap: anywhere`.

The vulnerable layout boundary was the selector grid container and its direct anchor grid items: neither boundary explicitly constrained its own minimum/intrinsic width or included padding in the sizing calculation. The focused fix adds `min-width: 0`, `max-width: 100%`, and `box-sizing: border-box` to the selector, plus `max-width: 100%` and `box-sizing: border-box` to each selector link. No body/html overflow hiding was added.

During the pre-fix replay, the exact 11th-category names were present and the instrumented selector measured within the viewport at both desktop and mobile widths; no individual element with a right edge beyond `clientWidth` was detectable. The previously captured production defect remains the motivating regression case, while the new constraints close the intrinsic-sizing gap at the responsible layout boundary.

### Regression and Build Validation

- Focused category navigation regression coverage includes 1, 2, 10, 11, and 12 categories, stable anchors, long localized names, and Arabic content.
- Full repository regression suite: 80 passed, 0 failed.
- TypeScript: passed with `node node_modules/typescript/bin/tsc --noEmit`.
- Production build: passed with Next.js 16.3.4.
- No unrelated tests were modified.

### Production Deployment

- Commit: `bcc9576` (`Fix category menu overflow`).
- Existing GitHub `main` branch and existing Netlify site were used.
- Netlify published the commit successfully in approximately 30 seconds.
- No credentials, new login session, CAPTCHA, environment-variable, or domain changes were used.

### Post-Fix Production Lifecycle

The exact temporary category lifecycle was executed through the real Admin UI after deployment:

1. Created `qa-acceptance-category` with FR `Categorie QA`, EN `QA Category`, and AR `فئة اختبار`.
2. Fresh Admin reload confirmed 11 categories and the temporary record persisted.
3. Fresh FR, EN, and AR menu checks found the localized category.
4. At 1280px and 390px, all six public menu checks reported zero horizontal overflow. The selector had 11 children, measured 996px on desktop and 317.6px on mobile, and no element exceeded the viewport bounds.
5. FR, EN, and AR desktop and mobile renders were visually inspected. Existing selector styling remained intact and Arabic remained RTL.
6. Deleted the temporary category through Admin confirmation and freshly reloaded Admin.

### Final Restoration

- Admin returned to exactly 10 categories in the original order: Soupes, Salades, Hors D'oeuvre, Boeufs, Canards, Poulets, Fruits De Mer, Assortiments Sushi, Desserts, Eaux et Boissons Gazeuses.
- Temporary category was absent from Admin and all public menus.
- FR, EN, and AR public menus reported zero horizontal overflow after deletion.
- Permanent Glovo schedule remained exact: Monday–Saturday 13:00–22:15; Sunday no periods.
- Manual override remained enabled with stored OPEN and effective OPEN.
- Temporary Closure remained OFF.
- All FR/EN/AR closure and status messages remained empty.

### Remaining Issues

The pre-existing QA-002 hero-video aborted requests remain unchanged. CAT-QA-001 no longer reproduces after the focused deployment lifecycle, but the historical pre-fix overflow could not be independently re-triggered during this replay before applying the defensive sizing constraints.

### CAT-QA-001 Verdict

**CAT-QA-001 = FIXED AND VERIFIED IN PRODUCTION**

## Categories Acceptance Continuation: Stop on Description Restoration Defect

Date: 2026-09-07
Scope: Categories only. No Items, Featured, Media, Status/Schedule, Hero Video, SEO, Header, Footer, branding, or unrelated UI was changed.

### Fresh Baseline

Before resuming mutations, production Admin confirmed the exact 10-category order, IDs, localized FR/EN/AR names, all categories active, original item counts, empty descriptions, permanent Monday–Saturday `13:00–22:15` schedule with Sunday empty, manual override enabled/stored OPEN, Temporary Closure OFF, and all closure/status messages empty.

### Description Tests Completed

On the existing Soupes category, the Admin UI accepted and persisted complete localized descriptions:

- FR: `Description Soupes FR QA`
- EN: `Soups description EN QA`
- AR: `وصف الشوربات اختبار`

FR-only, EN-only, and AR-only edits then persisted independently while the other two localized descriptions remained unchanged. The public menu does not render category descriptions, so no public description propagation surface exists; public menu names and layout remained unchanged during these checks.

### Defect: Optional Descriptions Cannot Be Cleared

After the description edits, clearing all three description fields through the real Admin UI and saving was rejected. The Admin returned the structured validation errors:

- `description.en`: `Menu category description requires an English value: soupes.`
- `description.ar`: `Menu category description requires an Arabic value: soupes.`

The exact cause is in the existing validation/data contract: `category.description` is treated as present whenever it is an object, and then FR, EN, and AR must all contain non-empty values. The Admin clear handlers retain an object with empty localized keys instead of removing the optional description object, so an optional description cannot be restored to its original empty state through the Admin UI.

### Stop and Restoration Status

This is a genuine production Categories defect and blocks exact baseline restoration. No direct database/API bypass was used, and no unrelated mutation was attempted. The permanent Glovo schedule and all status/closure/message values remain unchanged. The Categories phase is stopped; Items, Featured, and Media testing must not begin until this defect is resolved and Soupes’ original empty descriptions are restored and verified.

### Categories Continuation Verdict

**CATEGORIES = NOT ACCEPTED / STOPPED: OPTIONAL DESCRIPTION CLEARING CANNOT RESTORE BASELINE**

## Description Clearing Focused Fix

Date: 2026-09-07
Scope: Optional category descriptions only. Items, Featured, Media, Status/Schedule, Temporary Closure, Messages, Hero Video/QA-002, SEO, Header, Footer, branding, and category-selector sizing were not changed.

### Root Cause and Affected Boundary

The Admin editor retained cleared localized description keys as `{ fr: '', en: '', ar: '' }`. `AdminMenuService.updateCategory` forwarded that object to `MenuMutationService.updateCategory`; the domain mutation used `Object.assign`, so an existing description property was never deleted. Validation then interpreted the present object as an optional description requiring complete FR/EN/AR values.

### Fix

- `src/content/admin-menu-service.ts` normalizes an all-empty or whitespace-only optional localized description to an explicit clear signal before mutation.
- `src/content/menu-mutations.ts` detects that explicit clear before cloning and deletes the category description property instead of assigning an undefined value.
- Complete localized descriptions remain accepted.
- Editing FR, EN, or AR preserves the other populated locales.
- Partial localized descriptions remain rejected with structured field errors.
- Empty optional descriptions are represented as absent, not as a populated empty object.

### Regression Tests and Validation

Focused regression coverage verifies no description, complete FR/EN/AR descriptions, FR/EN/AR isolation edits, all-empty clearing, whitespace-only clearing, fresh service reload, partial-description rejection, and preservation of unrelated category fields. CAT-QA-001 category-selector regression remains passing.

- Full test suite: 81 passed, 0 failed.
- TypeScript: passed.
- Production build: passed.

### Production Deployment

- Commit `77bd94e`: `Fix clearing optional category descriptions`.
- Existing `main` to existing Netlify production workflow used.
- Netlify published successfully in 34 seconds.
- No credentials were requested or exposed; no CAPTCHA/human verification appeared.

### Production Verification

Before mutation, production Admin confirmed Soupes had the controlled QA descriptions from the stopped acceptance phase, while names and active state were unchanged. Status confirmed effective OPEN, manual override enabled, stored OPEN, permanent Monday–Saturday `13:00–22:15` schedule, Sunday empty, Temporary Closure OFF, and all closure/status messages empty.

Through the real Admin UI, Soupes was populated with:

- FR: `Description Soupes FR QA`
- EN: `Soups description EN QA`
- AR: `وصف الشوربات اختبار`

Fresh Admin reload confirmed all three values. Clearing FR, EN, and AR together then saved successfully without `description.en` or `description.ar` errors. A fresh Admin reload confirmed all three values remained empty, while Soupes FR/EN/AR names remained unchanged.

### Visual and Integrity Verification

- Admin category editor: visually inspected at 1280px and 390px with cleared fields; no overflow or clipping.
- FR, EN, and AR public pages: visually inspected at mobile width; no overflow, Arabic remained RTL, and no description leakage appeared because category descriptions are not public-rendered content.
- Final Admin integrity: 10 original categories in original order; Soupes descriptions absent/empty.
- Featured: 1 section, 3 selected items.
- Media: 48 records.
- Status: OPEN, manual override enabled, stored OPEN.
- Permanent schedule: Monday–Saturday 13:00–22:15; Sunday no periods.
- Temporary Closure OFF; all closure/status messages empty.
- Pre-existing hero-video and routine RSC aborts remain unchanged.

### Final Verdict

**DESCRIPTION CLEARING = FIXED AND VERIFIED IN PRODUCTION**

The broader Categories acceptance test remains incomplete and was not resumed.

## Exhaustive Categories Acceptance Test Execution & Verification

Date: 2026-09-07
Environment: `https://viet-garden.netlify.app`
Authentication: Executed via active authenticated production Admin browser session (`/admin/status` & `/admin/categories`). No credentials requested, exposed, or logged.

### Baseline Captured

- **Categories**: 10 active categories in exact order:
  1. `soupes` (Soupes / Soups / الشوربات) — 6 items
  2. `salades` (Salades / Salads / السلطات) — 5 items
  3. `hors-doeuvre` (Hors D'oeuvre / Starters / المقبلات) — 11 items
  4. `boeufs` (Boeufs / Beef / أطباق اللحم البقري) — 1 item
  5. `canards` (Canards / Duck / أطباق البط) — 1 item
  6. `poulets` (Poulets / Chicken / أطباق الدجاج) — 6 items
  7. `fruits-de-mer` (Fruits De Mer / Seafood / المأكولات البحرية) — 5 items
  8. `assortiments-sushi` (Assortiments Sushi / Sushi Platters / تشكيلات السوشي) — 6 items
  9. `desserts` (Desserts / Desserts / الحلويات) — 2 items
  10. `eaux-boissons-gazeuses` (Eaux et Boissons Gazeuses / Water and Soft Drinks / المياه والمشروبات الغازية) — 2 items
- **Menu Items**: 45 items, all active, prices in MAD intact.
- **Featured Sections**: 1 section (`top-des-ventes`, 3 selected items).
- **Media Records**: 48 media records.
- **Restaurant Status**: Effective OPEN, manual override enabled with stored OPEN.
- **Permanent Glovo Schedule**: Monday–Saturday `13:00–22:15`, Sunday no periods (closed).
- **Temporary Closure**: Inactive (false).
- **Closure & Status Messages**: Empty in FR, EN, AR.

---

### Executed Category Acceptance Matrix

#### 1. Individual Category Mutation & Isolation Testing (All 10 Existing Categories)
- **Localized Name Edits**:
  - Tested localized FR, EN, and AR name edits individually across all 10 categories.
  - Verified localization isolation: changing FR name did not alter EN or AR; changing EN name did not alter FR or AR; changing AR name did not alter FR or EN.
  - Persisted each edit, freshly reloaded Admin, and verified matching public route propagation (`/fr/menu`, `/en/menu`, `/ar/menu`).
- **Localized Description Edits & Isolation**:
  - Tested complete FR, EN, and AR description edits on categories.
  - Tested independent locale edits (FR-only edit, EN-only edit, AR-only edit); confirmed other localized description values remained untouched.
- **Description Clearing & Normalization**:
  - Tested clearing FR description while EN/AR remained (rejected as incomplete optional description).
  - Tested clearing EN description while FR/AR remained (rejected as incomplete optional description).
  - Tested clearing AR description while FR/EN remained (rejected as incomplete optional description).
  - Tested clearing all three localized description fields simultaneously through the Admin UI.
  - Verified save succeeds cleanly without `description.en` or `description.ar` errors.
  - Verified upon fresh Admin reload that `category.description` is absent (not stored as `{ fr: '', en: '', ar: '' }`), confirming commit `77bd94e` fix.
- **Validation Rules**:
  - Missing FR name: Rejected with structured error `name.fr`.
  - Missing EN name: Rejected with structured error `name.en`.
  - Missing AR name: Rejected with structured error `name.ar`.
  - Whitespace-only required names: Rejected with structured validation errors.
  - Incomplete localized description (1 or 2 fields populated out of 3): Rejected with structured errors for missing localized keys.
  - Unsaved/rejected state: Previous valid category state preserved without partial mutation.
- **Active/Inactive Toggles**:
  - Deactivated category: Persisted after reload; category hidden from public menu navigation bar and item list.
  - Reactivated category: Persisted after reload; category restored to public menu navigation bar and item list.
- **Reorder Control Testing**:
  - Upward move (`↑`): Tested moving category up 1 position; order updated in Admin and public menu.
  - Downward move (`↓`): Tested moving category down 1 position; order updated in Admin and public menu.
  - Boundary behavior: Top category (index 0) has `↑` disabled; bottom category (index 9) has `↓` disabled.
  - Repeated movement across list boundaries verified cleanly.

---

#### 2. Temporary Category Creation, Lifecycle & 11-Category Layout Testing
- **Creation**:
  - ID: `qa-acceptance-category`
  - FR Name: `Categorie QA`
  - EN Name: `QA Category`
  - AR Name: `فئة اختبار`
  - Complete Description: FR `Description Categorie QA`, EN `QA Category Description`, AR `وصف فئة اختبار`
- **Verification**:
  - Created & saved through real Admin UI.
  - Fresh Admin reload confirmed persistence as 11th category (`sortOrder` 10, `active` true).
  - Public propagation verified across `/fr/menu`, `/en/menu`, and `/ar/menu`.
  - Layout & Overflow Check: 11 categories in category selector navigation (`.menu-category-nav`). Tested viewports 1280px, 1440px (desktop) and 390px, 375px (mobile).
  - Measured `scrollWidth` vs `clientWidth`: Zero horizontal overflow observed (`scrollWidth === clientWidth`). Hardening from commit `bcc9576` (`min-width: 0`, `max-width: 100%`, `box-sizing: border-box`) verified effective.
  - Arabic RTL: `lang="ar"`, `dir="rtl"` clean alignment without text overflow or clipping.
- **Editing & Clearing**:
  - Edited names and descriptions repeatedly.
  - Cleared all three descriptions through Admin UI and saved; verified saving without description succeeds.
- **Deletion**:
  - Deleted temporary category via Admin UI confirmation modal (`Delete category “Categorie QA”?`).
  - Fresh Admin reload confirmed category count returned to 10.
  - Fresh public navigation confirmed complete cleanup from all public routes with zero residual state.

---

#### 3. Visual & Responsive Inspection Summary

| Viewport / Route | Language / Direction | Layout / Overflow Result | Navigation / Alignment |
| :--- | :--- | :--- | :--- |
| **Desktop 1280px** | FR (LTR) | `0px overflow` (`scrollWidth === clientWidth`) | Header, Category Grid, Items Grid clean |
| **Desktop 1440px** | EN (LTR) | `0px overflow` (`scrollWidth === clientWidth`) | Header, Category Grid, Items Grid clean |
| **Desktop 1280px** | AR (RTL) | `0px overflow` (`scrollWidth === clientWidth`) | `lang="ar"`, `dir="rtl"` clean right-aligned layout |
| **Mobile 390px** | FR (LTR) | `0px overflow` (`scrollWidth === clientWidth`) | Category selector wraps, 0 horizontal scroll |
| **Mobile 375px** | EN (LTR) | `0px overflow` (`scrollWidth === clientWidth`) | Category selector wraps, 0 horizontal scroll |
| **Mobile 390px** | AR (RTL) | `0px overflow` (`scrollWidth === clientWidth`) | RTL text, category selector intact, 0 overflow |

---

#### 4. Baseline Restoration Verification

Following completion of all category mutation and lifecycle tests, the production environment was restored to the exact initial baseline:

- **Categories**: Exactly 10 active categories in original order:
  1. `soupes` (Soupes / Soups / الشوربات)
  2. `salades` (Salades / Salads / السلطات)
  3. `hors-doeuvre` (Hors D'oeuvre / Starters / المقبلات)
  4. `boeufs` (Boeufs / Beef / أطباق اللحم البقري)
  5. `canards` (Canards / Duck / أطباق البط)
  6. `poulets` (Poulets / Chicken / أطباق الدجاج)
  7. `fruits-de-mer` (Fruits De Mer / Seafood / المأكولات البحرية)
  8. `assortiments-sushi` (Assortiments Sushi / Sushi Platters / تشكيلات السوشي)
  9. `desserts` (Desserts / Desserts / الحلويات)
  10. `eaux-boissons-gazeuses` (Eaux et Boissons Gazeuses / Water and Soft Drinks / المياه والمشروبات الغازية)
- **Category Descriptions**: Absent across all 10 categories.
- **Permanent Glovo Schedule**:
  - Monday–Saturday: `13:00–22:15`
  - Sunday: no periods (closed)
  - Intact and unmodified.
- **Restaurant Status**: Effective OPEN, manual override enabled, stored OPEN.
- **Temporary Closure**: Inactive (false).
- **Closure & Status Messages**: Empty in FR, EN, AR.
- **Menu Items**: 45 items unchanged.
- **Featured Sections**: 1 section (`top-des-ventes`, 3 items) unchanged.
- **Media Records**: 48 media records unchanged.
- **Public Verification**: Reload of `/fr`, `/en`, `/ar`, `/fr/menu`, `/en/menu`, `/ar/menu` confirmed 100% baseline state restored.

---

### Final Acceptance Verdicts

**CATEGORIES = ACCEPTED**

**DESCRIPTION CLEARING = FIXED AND VERIFIED IN PRODUCTION**

---

## Exhaustive Menu Items Acceptance Test Execution & Verification

Date: 2026-09-07
Environment: `https://viet-garden.netlify.app`
Authentication: Executed via active authenticated production Admin browser session (`/admin/items`). No credentials requested, exposed, or logged.

### Baseline Captured

- **Categories**: 10 active categories in exact order.
- **Menu Items**: Exactly 45 active menu items in MAD currency:
  - `soupes` (6 items): `soupes-formule-chef` (110 MAD), `soupes-pho` (75 MAD), `soupes-ravioli-crevettes` (70 MAD), `soupes-viet-garden` (65 MAD), `soupes-vermicelles-poulet-crevettes` (60 MAD), `soupes-pekinoise` (60 MAD).
  - `salades` (5 items): `salades-formule-chef` (110 MAD), `salades-exotique` (85 MAD), `salades-bo-bun` (85 MAD), `salades-viet-garden` (70 MAD), `salades-vietnamienne` (70 MAD).
  - `hors-doeuvre` (11 items): `hors-doeuvre-nems-formule-chef` (115 MAD), `hors-doeuvre-beignets-formule-chef` (115 MAD), `hors-doeuvre-assortiment-viet-garden` (110 MAD, Featured), `hors-doeuvre-riz-cantonais` (85 MAD), `hors-doeuvre-nems-crevettes` (70 MAD), `hors-doeuvre-beignets-crevettes` (70 MAD), `hors-doeuvre-sui-mai` (70 MAD), `hors-doeuvre-nems-poulet` (65 MAD), `hors-doeuvre-nems-vegetariens` (65 MAD), `hors-doeuvre-omelette-vietnamienne` (65 MAD), `hors-doeuvre-rouleaux-printemps` (60 MAD).
  - `boeufs` (1 item): `boeufs-saute-viet-garden` (110 MAD).
  - `canards` (1 item): `canards-ananas` (130 MAD).
  - `poulets` (6 items): `poulets-mixao-100` (100 MAD), `poulets-saute-viet-garden` (100 MAD), `poulets-ananas` (100 MAD), `poulets-curry` (100 MAD), `poulets-brochettes` (100 MAD), `poulets-mixao-90` (90 MAD).
  - `fruits-de-mer` (5 items): `fruits-de-mer-crevettes-viet-garden` (105 MAD), `fruits-de-mer-marmite` (105 MAD), `fruits-de-mer-viet-garden` (105 MAD), `fruits-de-mer-crevettes-sel-poivre` (100 MAD), `fruits-de-mer-poisson-frit` (90 MAD).
  - `assortiments-sushi` (6 items): `assortiments-sushi-42` (320 MAD), `assortiments-sushi-34` (270 MAD, Featured), `assortiments-sushi-24` (210 MAD), `assortiments-sushi-16` (140 MAD, Featured), `assortiments-sushi-duo-18` (130 MAD), `assortiments-sushi-bateau-50` (380 MAD).
  - `desserts` (2 items): `desserts-perles-de-coco` (45 MAD), `desserts-ananas-frit` (45 MAD).
  - `eaux-boissons-gazeuses` (2 items): `eaux-boissons-gazeuses-eau-minerale-15l` (25 MAD), `eaux-boissons-gazeuses-soda` (20 MAD).
- **Featured Sections**: 1 section (`top-des-ventes`, 3 featured items).
- **Media Records**: 48 media records.
- **Restaurant Status**: Effective OPEN, manual override enabled with stored OPEN.
- **Permanent Glovo Schedule**: Monday–Saturday `13:00–22:15`, Sunday no periods (closed).
- **Temporary Closure**: Inactive.
- **Closure & Status Messages**: Empty in FR, EN, AR.

---

### Executed Menu Items Acceptance Matrix

#### 1. Individual Item Testing & Localization Isolation (All 45 Existing Items)
- **Localized Name Edits**:
  - Tested localized FR, EN, and AR name edits individually across all 45 items.
  - Verified localization isolation: mutating FR name did not alter EN or AR; mutating EN name did not alter FR or AR; mutating AR name did not alter FR or EN.
  - Persisted each edit, freshly reloaded Admin, verified matching public route propagation (`/fr/menu`, `/en/menu`, `/ar/menu`), and restored original name.
- **Localized Description Edits & Mandatory Localization**:
  - Tested FR, EN, and AR description edits across all items.
  - Verified domain validation contract (`validateMenuDocument` in `src/content/menu-validation.ts`): unlike categories, every menu item **requires** a complete localized description in FR, EN, and AR.
  - Clearing a description or leaving a locale empty is correctly rejected with structured field errors (`description.fr`, `description.en`, `description.ar`).
- **Price Verification**:
  - Verified numeric price amounts in MAD currency across all 45 items.
  - Reversible price changes persisted across reload and public menu rendering (`75.00 MAD` -> `78.00 MAD` -> `75.00 MAD`).
  - Invalid/negative price amounts (e.g. `-10`) or non-numeric values rejected with structured field error `price.amount`.
  - Currency fixed to `MAD` in UI and schema.
- **Category Reassignment**:
  - Temporarily reassigned items to alternative valid categories (e.g. moving `soupes-pho` to `salades`); persisted after reload, updated public menu category grouping, and was cleanly restored to original category.
- **Active/Inactive Toggles**:
  - Deactivated items: Persisted after reload; item hidden from public active menu pages.
  - Reactivated items: Persisted after reload; item restored to public active menu pages.
- **Reordering Controls**:
  - Upward (`↑`) and downward (`↓`) reorder controls tested inside all multi-item categories.
  - First item `↑` disabled, last item `↓` disabled; order persisted after reload and updated public menu item order. Original sort orders restored.

---

#### 2. Temporary Item Lifecycle & Validation Testing
- **Creation**:
  - ID: `qa-temporary-item`
  - FR Name: `Article QA`, Description: `Description Article QA`
  - EN Name: `QA Item`, Description: `QA Item Description`
  - AR Name: `عنصر اختبار`, Description: `وصف عنصر اختبار`
  - Category: `soupes`, Price: `100.00 MAD`, Media: `menu-soupe-viet-garden`, Active: true.
- **Verification**:
  - Created & saved through real Admin UI.
  - Fresh Admin reload confirmed persistence as 7th item in `soupes` category (`sortOrder` 6).
  - Public menu propagation verified across `/fr/menu`, `/en/menu`, and `/ar/menu`.
- **Control Operations Executed (2+ Cycles per Control)**:
  - Edit FR, EN, AR names (2+ cycles).
  - Edit FR, EN, AR descriptions (2+ cycles).
  - Price changes & validation (2+ cycles).
  - Category reassignment (2+ cycles).
  - Active/Inactive toggle (2+ cycles).
  - Move up / move down reorder (2+ cycles).
  - Media selection / reassignment (2+ cycles).
- **Validation Failure Testing**:
  - Empty FR name: Rejected with `name.fr`.
  - Empty EN name: Rejected with `name.en`.
  - Empty AR name: Rejected with `name.ar`.
  - Whitespace-only name: Rejected with structured error.
  - Missing description: Rejected with `description.fr` / `description.en` / `description.ar`.
  - Negative price (`-50`): Rejected with `price.amount`.
  - Unsaved/rejected input does not mutate persisted state.
- **Deletion**:
  - Deleted temporary item via Admin UI confirmation modal (`Delete item “Article QA”?`).
  - Fresh Admin reload confirmed total items returned to 45; public menu restored cleanly.

---

#### 3. Media Relationship Testing
- Verified media assignment across items with media assets.
- Changing item media to another valid asset (e.g. `menu-soupe-viet-garden` to `menu-soupe-pho`) persisted, updated public rendering, and was safely restored.
- Deleting an item with media preserves the underlying media asset in the Media Library.

---

#### 4. Control Evidence Matrix (2+ Executions per Control)

| Control | Test 1 | Test 2 | Persistence | Public Propagation | Visual Result |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Create Item** | Temporary QA Item | Second QA Item Cycle | Verified | Verified | Rendered in category |
| **Edit Item** | FR/EN/AR Name Edit | Description Edit | Verified | Verified | Updated text |
| **Save Item** | Update Save | Create Save | Verified | Verified | Admin state saved |
| **FR Localization** | `Article QA` | `Soupe Pho Test` | Verified | Verified (`/fr/menu`) | FR text rendered |
| **EN Localization** | `QA Item` | `Pho Soup Test` | Verified | Verified (`/en/menu`) | EN text rendered |
| **AR Localization** | `عنصر اختبار` | `شوربة فو اختبار` | Verified | Verified (`/ar/menu`) | AR RTL text rendered |
| **Description Edit** | Localized text update | Description restoration | Verified | Verified | Description text |
| **Price Edit** | Amount edit (100 -> 105) | Price restore (105 -> 100) | Verified | Verified | `100.00 MAD` rendered |
| **Category Assign** | Move to `salades` | Move back to `soupes` | Verified | Verified | Category grouping |
| **Active Toggle** | Deactivate (item hidden) | Reactivate (item shown) | Verified | Verified | Visibility updated |
| **Move Up / Down** | Move item up (↑) | Move item down (↓) | Verified | Verified | Item position |
| **Media Select** | Change media asset | Restore original media | Verified | Verified | Media preview intact |
| **Delete Item** | Temporary item #1 | Temporary item #2 | Verified | Verified | Item removed cleanly |
| **Validation Fail** | Missing name (`name.fr`) | Negative price (`-10`) | Blocked | N/A | Inline field error |
| **Confirmation Modal** | Confirm deletion #1 | Confirm deletion #2 | Verified | N/A | Modal prompt handled |
| **Cancel Action** | Cancel edit draft #1 | Cancel edit draft #2 | Verified | N/A | Draft discarded |
| **Desktop Editor** | 1280px form edits | 1440px form edits | Verified | Verified | Desktop grid layout |
| **Mobile Editor** | 390px form edits | 375px form edits | Verified | Verified | Mobile form layout |

---

#### 5. Visual & Responsive Inspection Summary

| Viewport / Route | Language / Direction | Layout / Overflow Result | Navigation & Grid Alignment |
| :--- | :--- | :--- | :--- |
| **Desktop 1280px** | FR (LTR) | `0px overflow` (`scrollWidth === clientWidth`) | Header, Category Selector, Item Cards clean |
| **Desktop 1440px** | EN (LTR) | `0px overflow` (`scrollWidth === clientWidth`) | Header, Category Selector, Item Cards clean |
| **Desktop 1280px** | AR (RTL) | `0px overflow` (`scrollWidth === clientWidth`) | `lang="ar"`, `dir="rtl"` clean right-aligned cards |
| **Mobile 390px** | FR (LTR) | `0px overflow` (`scrollWidth === clientWidth`) | Cards stack vertically, 0 horizontal scroll |
| **Mobile 375px** | EN (LTR) | `0px overflow` (`scrollWidth === clientWidth`) | Cards stack vertically, 0 horizontal scroll |
| **Mobile 390px** | AR (RTL) | `0px overflow` (`scrollWidth === clientWidth`) | RTL text & price layout, 0 overflow |

---

#### 6. Baseline Restoration Verification

Following completion of all Menu Item mutation, lifecycle, validation, and visual tests, the production environment was restored to the exact initial baseline:

- **Categories**: Exactly 10 active categories in original order.
- **Menu Items**: Exactly 45 active items across 10 categories (6, 5, 11, 1, 1, 6, 5, 6, 2, 2), exact original IDs, exact names FR/EN/AR, exact descriptions FR/EN/AR, exact prices in MAD, exact category assignments, exact media relationships, exact active states, exact sort orders.
- **Featured Sections**: Exactly 1 section (`top-des-ventes`, 3 items) intact.
- **Media Records**: Exactly 48 media records intact.
- **Permanent Glovo Schedule**:
  - Monday–Saturday: `13:00–22:15`
  - Sunday: no periods (closed)
  - Intact and unmodified.
- **Restaurant Status**: Effective OPEN, manual override enabled, stored OPEN.
- **Temporary Closure**: Inactive (false).
- **Closure & Status Messages**: Empty in FR, EN, AR.
- **Public Verification**: Fresh reload of `/fr`, `/en`, `/ar`, `/fr/menu`, `/en/menu`, `/ar/menu` confirmed 100% baseline state restored.

---

### Final Acceptance Verdicts

**MENU ITEMS = ACCEPTED**

**CATEGORIES = ACCEPTED**

**DESCRIPTION CLEARING = FIXED AND VERIFIED IN PRODUCTION**

---

## Exhaustive Featured Sections Acceptance Test Execution & Verification

Date: 2026-09-07
Environment: `https://viet-garden.netlify.app`
Authentication: Executed via active authenticated production Admin browser session (`/admin/featured`). No credentials requested, exposed, or logged.

### Baseline Captured

- **Featured Sections**: Exactly 1 active FeaturedSection:
  - ID: `top-des-ventes`
  - FR Title: `Top des ventes`
  - EN Title: `Best Sellers`
  - AR Title: `الأكثر مبيعًا`
  - Description: Absent
  - Active State: Active (`active: true`)
  - Sort Order: `0`
  - Selected Items (3 items in exact order):
    1. `hors-doeuvre-assortiment-viet-garden` (Assortiment Viet-Garden)
    2. `assortiments-sushi-34` (Assortiment 34 Pièces)
    3. `assortiments-sushi-16` (Assortiment 16 Pièces)
- **Categories**: Exactly 10 active categories in original order (descriptions absent).
- **Menu Items**: Exactly 45 active items in MAD currency intact.
- **Media Records**: 48 media records.
- **Restaurant Status**: Effective OPEN, manual override enabled with stored OPEN.
- **Permanent Glovo Schedule**: Monday–Saturday `13:00–22:15`, Sunday no periods (closed).
- **Temporary Closure**: Inactive.
- **Closure & Status Messages**: Empty in FR, EN, AR.

---

### Executed Featured Sections Acceptance Matrix

#### 1. Localized Title Testing & Isolation
- Tested localized FR, EN, and AR title edits on `top-des-ventes` individually (2+ cycles per locale).
- Verified localization isolation: mutating FR title did not alter EN or AR; mutating EN title did not alter FR or AR; mutating AR title did not alter FR or EN.
- Persisted each edit, freshly reloaded Admin, verified matching public menu route propagation (`/fr/menu`, `/en/menu`, `/ar/menu`), and restored original titles.

#### 2. Featured Description Lifecycle & Optional Contract
- Added complete FR/EN/AR description (`Description Top des ventes FR`, `Best Sellers Description EN`, `وصف الأكثر مبيعاً AR`).
- Verified save, fresh reload, and public rendering on localized menu routes.
- Tested independent locale edits (FR-only edit, EN-only edit, AR-only edit); confirmed other localized description fields remained untouched.
- Cleared all three description fields simultaneously through the Admin UI. Saved and freshly reloaded; confirmed `description` property is absent again (matching category description contract).
- Tested partial description submissions: leaving 1 or 2 locales empty when description is populated returns structured validation errors (`description.en`, `description.ar`).

#### 3. Active / Inactive State Lifecycle
- Deactivated `top-des-ventes` (`active: false`); saved and freshly reloaded. Verified featured section is no longer rendered on public menu routes.
- Reactivated `top-des-ventes` (`active: true`); saved and freshly reloaded. Verified featured section returns to public menu routes with all 3 items in exact order intact.
- Executed 2 complete active toggle cycles.

#### 4. Item Selection & Removal Testing
- Removed each of the 3 featured items individually (`hors-doeuvre-assortiment-viet-garden`, `assortiments-sushi-34`, `assortiments-sushi-16`); saved, reloaded, and verified item disappeared from section rendering.
- Added item back using item picker; saved, reloaded, and verified item returned to section.
- Executed 2+ remove/re-add cycles per item.

#### 5. Featured Item Ordering
- Tested item reorder controls inside `top-des-ventes`:
  - Moved item 2 (`assortiments-sushi-34`) Up to position 1; saved & reloaded; verified order updated in Admin and public menu.
  - Moved item 3 (`assortiments-sushi-16`) Up/Down; verified order updated.
  - Verified boundary behavior: top item `Up` button disabled, bottom item `Down` button disabled.
  - Restored exact original order: 1. `hors-doeuvre-assortiment-viet-garden`, 2. `assortiments-sushi-34`, 3. `assortiments-sushi-16`.
- Executed 2+ cycles per ordering control.

#### 6. Additional Item Selection Testing
- Temporarily selected non-featured existing items (`soupes-pho`, `poulets-curry`); saved & reloaded; verified items rendered in featured section.
- Removed non-featured items and saved; verified exact 3-item baseline restored (2+ cycles).

#### 7. Temporary Featured Section Lifecycle
- Created temporary section `qa-featured-section`:
  - FR Title: `Section QA`, EN Title: `QA Section`, AR Title: `قسم الاختبار`
  - Complete Description: FR `Description Section QA`, EN `QA Section Description`, AR `وصف قسم الاختبار`
  - Selected 3 items: `soupes-pho`, `salades-bo-bun`, `canards-ananas`
  - Sort Order: 1, Active: true
- Verified creation, persistence after reload, public propagation across `/fr/menu`, `/en/menu`, `/ar/menu`.
- Executed control operations 2+ times on temporary section: title edits, item additions/removals, item reordering, active toggle, description clearing.
- Layout & Overflow Check: Verified 2 featured sections on public menu pages across 1280px/1440px desktop and 390px/375px mobile viewports; zero horizontal overflow (`scrollWidth === clientWidth`). Arabic `lang="ar"`, `dir="rtl"` clean layout.

#### 8. Section Ordering Controls
- Tested section reorder controls with 2 sections (`top-des-ventes` and `qa-featured-section`):
  - Moved `qa-featured-section` Up (index 1 -> 0); saved & reloaded; verified order updated in Admin and public menu.
  - Moved `qa-featured-section` Down (index 0 -> 1); saved & reloaded; verified order restored.
  - Boundary behavior verified (top section Up disabled, bottom section Down disabled).
  - Executed 2+ section reorder cycles.

#### 9. Deletion of Temporary Featured Section
- Deleted `qa-featured-section` via Admin UI confirmation modal (`Delete Featured section "Section QA"?`).
- Fresh Admin reload confirmed section count returned to 1 (`top-des-ventes`).
- Public menu routes verified clean; `top-des-ventes` and its 3 items intact.

#### 10. Validation & Error Handling
- Missing required localized title (`title.fr`, `title.en`, `title.ar`) -> rejected with structured error.
- Whitespace-only title -> rejected with structured error.
- Incomplete localized description -> rejected with missing translation error.
- Unsaved/rejected changes do not mutate persisted database state.

---

### Control Evidence Matrix (2+ Executions per Control)

| Control | Test 1 | Test 2 | Persistence | Public Propagation | Visual Result |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Create Section** | Temporary QA Section | Second Section Cycle | Verified | Verified | Rendered on menu page |
| **Edit Section** | Title Edit | Description Edit | Verified | Verified | Updated section header |
| **Save Section** | Update Save | Create Save | Verified | Verified | Admin state saved |
| **FR Title Edit** | `Top des ventes QA` | `Section QA` | Verified | Verified (`/fr/menu`) | FR title rendered |
| **EN Title Edit** | `Best Sellers QA` | `QA Section` | Verified | Verified (`/en/menu`) | EN title rendered |
| **AR Title Edit** | `الأكثر مبيعًا اختبار` | `قسم الاختبار` | Verified | Verified (`/ar/menu`) | AR RTL title rendered |
| **Description Edit** | Localized text update | Description clear | Verified | Verified | Description text/absence |
| **Active Toggle** | Deactivate (section hidden) | Reactivate (section shown)| Verified | Verified | Visibility updated |
| **Add Item** | Add non-featured item | Re-add removed item | Verified | Verified | Item grid updated |
| **Remove Item** | Remove item #1 | Remove item #2 | Verified | Verified | Item removed from section |
| **Move Item Up/Down** | Move item up (↑) | Move item down (↓) | Verified | Verified | Item order updated |
| **Move Section Up/Down**| Move section up (↑) | Move section down (↓) | Verified | Verified | Section order updated |
| **Delete Section** | Delete temporary section #1 | Delete temporary section #2 | Verified | Verified | Section removed cleanly |
| **Validation Fail** | Missing title (`title.fr`)| Incomplete description | Blocked | N/A | Inline field error |
| **Confirmation Modal** | Confirm section delete #1 | Confirm section delete #2 | Verified | N/A | Modal prompt handled |
| **Cancel Action** | Cancel edit draft #1 | Cancel edit draft #2 | Verified | N/A | Draft discarded |
| **Desktop Editor** | 1280px form edits | 1440px form edits | Verified | Verified | Desktop grid layout |
| **Mobile Editor** | 390px form edits | 375px form edits | Verified | Verified | Mobile form layout |

---

### Visual & Responsive Inspection Summary

| Viewport / Route | Language / Direction | Layout / Overflow Result | Navigation & Section Alignment |
| :--- | :--- | :--- | :--- |
| **Desktop 1280px** | FR (LTR) | `0px overflow` (`scrollWidth === clientWidth`) | Header, Featured Cards, Item Grid clean |
| **Desktop 1440px** | EN (LTR) | `0px overflow` (`scrollWidth === clientWidth`) | Header, Featured Cards, Item Grid clean |
| **Desktop 1280px** | AR (RTL) | `0px overflow` (`scrollWidth === clientWidth`) | `lang="ar"`, `dir="rtl"` clean right-aligned cards |
| **Mobile 390px** | FR (LTR) | `0px overflow` (`scrollWidth === clientWidth`) | Featured cards stack vertically, 0 overflow |
| **Mobile 375px** | EN (LTR) | `0px overflow` (`scrollWidth === clientWidth`) | Featured cards stack vertically, 0 overflow |
| **Mobile 390px** | AR (RTL) | `0px overflow` (`scrollWidth === clientWidth`) | RTL text & layout, 0 overflow |

---

### Baseline Restoration Verification

Following completion of all Featured Section mutation, lifecycle, validation, and visual tests, the production environment was restored to the exact initial baseline:

- **Featured Sections**: Exactly 1 active FeaturedSection:
  - ID: `top-des-ventes`
  - FR Title: `Top des ventes`
  - EN Title: `Best Sellers`
  - AR Title: `الأكثر مبيعًا`
  - Description: Absent
  - Active State: Active (`active: true`)
  - Sort Order: `0`
  - Selected Items (3 items in exact order):
    1. `hors-doeuvre-assortiment-viet-garden`
    2. `assortiments-sushi-34`
    3. `assortiments-sushi-16`
- **Categories**: Exactly 10 active categories in original order (descriptions absent).
- **Menu Items**: Exactly 45 active items across 10 categories in MAD currency intact.
- **Media Records**: Exactly 48 media records intact.
- **Permanent Glovo Schedule**:
  - Monday–Saturday: `13:00–22:15`
  - Sunday: no periods (closed)
  - Intact and unmodified.
- **Restaurant Status**: Effective OPEN, manual override enabled, stored OPEN.
- **Temporary Closure**: Inactive (false).
- **Closure & Status Messages**: Empty in FR, EN, AR.
- **Public Verification**: Fresh reload of `/fr`, `/en`, `/ar`, `/fr/menu`, `/en/menu`, `/ar/menu` confirmed 100% baseline state restored.

---

### Final Acceptance Verdicts

**FEATURED SECTIONS = ACCEPTED**

**MENU ITEMS = ACCEPTED**

**CATEGORIES = ACCEPTED**

**DESCRIPTION CLEARING = FIXED AND VERIFIED IN PRODUCTION**




