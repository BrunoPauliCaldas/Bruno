const { chromium } = require('playwright');
const SHOTS = require('path').join(require('os').tmpdir(), 'content-plan-shots') + '/'; require('fs').mkdirSync(SHOTS, { recursive: true });
const URL = 'file://' + require('path').resolve(__dirname, 'index.html');
const log = [];
const ok = (name, cond, extra='') => { log.push(`${cond ? 'PASS' : 'FAIL'} ${name}${extra ? ' ' + extra : ''}`); if (!cond) process.exitCode = 1; };
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1380, height: 1500 }, deviceScaleFactor: 1, hasTouch: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  await page.goto(URL); await page.waitForTimeout(400);
  ok('sync shows local preview', (await page.textContent('#sync')).includes('Local preview'));
  ok('6 weeks rendered', await page.locator('.week').count() === 6);
  ok('today cell exists', await page.locator('.day.today').count() === 1);
  const today = await page.getAttribute('.day.today', 'data-date');
  // add a card on today
  await page.click(`.day[data-date="${today}"] .add`);
  ok('card dialog opens', await page.locator('#card-dialog').evaluate(d => d.open));
  await page.selectOption('#f-type', 'Sensory reel'); await page.selectOption('#f-owner', 'Anouk');
  await page.fill('#f-note', 'test note'); await page.click('#cd-save'); await page.waitForTimeout(100);
  ok('card appears on today', await page.locator(`.day[data-date="${today}"] .card`).count() === 1);
  ok('card is IDEA grey', await page.locator(`.day[data-date="${today}"] .card.s-IDEA`).count() === 1);
  // cycle status
  await page.click(`.day[data-date="${today}"] .card .status`); await page.waitForTimeout(80);
  ok('status click -> WIP', await page.locator(`.day[data-date="${today}"] .card.s-WIP`).count() === 1);
  await page.click(`.day[data-date="${today}"] .card .status`, { modifiers: ['Shift'] }); await page.waitForTimeout(80);
  ok('shift+click -> back to IDEA', await page.locator(`.day[data-date="${today}"] .card.s-IDEA`).count() === 1);
  // edit via card body
  await page.click(`.day[data-date="${today}"] .card .card-main`);
  ok('edit dialog opens with Edit title', (await page.textContent('#cd-title')) === 'Edit card');
  await page.keyboard.press('Escape'); await page.waitForTimeout(50);
  ok('Escape closes card dialog', !(await page.locator('#card-dialog').evaluate(d => d.open)));
  // drag with mouse to tomorrow
  const src = await page.locator(`.day[data-date="${today}"] .card`).boundingBox();
  const tomorrow = new Date(Date.UTC(...today.split('-').map((x,i)=>i===1?+x-1:+x)) + 86400000).toISOString().slice(0,10);
  const dst = await page.locator(`.day[data-date="${tomorrow}"] .cards`).boundingBox();
  await page.mouse.move(src.x + 60, src.y + 15); await page.mouse.down();
  await page.mouse.move(src.x + 80, src.y + 30, { steps: 4 });
  await page.mouse.move(dst.x + 40, dst.y + 20, { steps: 10 });
  ok('drop target highlighted', await page.locator(`.day[data-date="${tomorrow}"].drop`).count() === 1);
  await page.mouse.up(); await page.waitForTimeout(100);
  ok('mouse drag moved card to tomorrow', await page.locator(`.day[data-date="${tomorrow}"] .card`).count() === 1 && await page.locator(`.day[data-date="${today}"] .card`).count() === 0);
  ok('no ghost left behind', await page.locator('.ghost').count() === 0);
  ok('edit dialog did not open after drag', !(await page.locator('#card-dialog').evaluate(d => d.open)));
  // drag to backlog
  const s2 = await page.locator(`.day[data-date="${tomorrow}"] .card`).boundingBox();
  await page.locator('#backlog').evaluate(e => e.scrollIntoView({ block: 'center' })); await page.waitForTimeout(100);
  const s2b = await page.locator(`.day[data-date="${tomorrow}"] .card`).boundingBox();
  const bl = await page.locator('#backlog').boundingBox();
  await page.mouse.move(s2b.x + 60, s2b.y + 15); await page.mouse.down();
  await page.mouse.move(s2b.x + 70, s2b.y + 40, { steps: 4 });
  await page.mouse.move(bl.x + 100, bl.y + bl.height / 2, { steps: 10 }); await page.mouse.up(); await page.waitForTimeout(100);
  ok('drag to backlog', await page.locator('#backlog .card').count() === 1);
  // backlog add
  await page.click('#btn-add-backlog'); ok('backlog add opens dialog (Backlog)', (await page.textContent('#cd-sub')) === 'Backlog');
  await page.click('#cd-cancel');
  // stamp week 2
  await page.locator('.week').nth(1).locator('.gutter button').click();
  ok('stamp confirm dialog opens', await page.locator('#confirm-dialog').evaluate(d => d.open));
  await page.click('#cf-ok'); await page.waitForTimeout(200);
  ok('stamp adds 4 cards in week 2', await page.locator('.week').nth(1).locator('.card').count() === 4);
  ok('stamped cards are IDEA', await page.locator('.week').nth(1).locator('.card.s-IDEA').count() === 4);
  // lists dialog: add owner
  await page.click('#btn-lists');
  await page.fill('#l-owners .item.new input', 'Till'); await page.keyboard.press('Enter');
  await page.click('#ld-save'); await page.waitForTimeout(100);
  await page.click('#btn-add-backlog');
  ok('new owner available on cards', (await page.locator('#f-owner option').allTextContents()).includes('Till'));
  await page.click('#cd-cancel');
  // archive + undo
  await page.click('#backlog .card .card-main'); await page.click('#cd-archive'); await page.waitForTimeout(80);
  ok('archive hides card', await page.locator('#backlog .card').count() === 0);
  ok('toast with undo shown', !(await page.locator('#toast').evaluate(t => t.hidden)) && (await page.textContent('#toast-action')) === 'Undo');
  await page.click('#toast-action'); await page.waitForTimeout(80);
  ok('undo restores card', await page.locator('#backlog .card').count() === 1);
  // archive, restore from lists, delete for good
  await page.click('#backlog .card .card-main'); await page.click('#cd-archive'); await page.waitForTimeout(80);
  await page.click('#btn-lists');
  ok('archived card listed', await page.locator('#l-archived .item').count() === 1);
  await page.click('#l-archived .item button:has-text("Restore")'); await page.waitForTimeout(80);
  ok('restore works', await page.locator('#backlog .card').count() === 1 && await page.locator('#l-archived .item').count() === 0);
  await page.keyboard.press('Escape');
  await page.click('#backlog .card .card-main'); await page.click('#cd-archive'); await page.waitForTimeout(80);
  await page.click('#btn-lists');
  await page.click('#l-archived .item button:has-text("Delete for good")');
  ok('delete is two-step', (await page.textContent('#l-archived .item button.btn-danger')) === 'Really delete?');
  await page.click('#l-archived .item button.btn-danger'); await page.waitForTimeout(80);
  ok('delete for good removes card', await page.locator('#l-archived .item').count() === 0);
  await page.keyboard.press('Escape');
  ok('Escape closes lists dialog', !(await page.locator('#lists-dialog').evaluate(d => d.open)));
  // window controls
  await page.click('#btn-earlier'); ok('earlier adds 4 weeks', await page.locator('.week').count() === 10);
  await page.click('#btn-later'); ok('later adds 4 weeks', await page.locator('.week').count() === 14);
  await page.click('#btn-thisweek'); ok('this week resets to 6', await page.locator('.week').count() === 6 && (await page.locator('.week').first().locator('.day.today').count()) === 1);
  // keyboard: tab reaches a card and Enter opens it
  await page.focus('.week .card .card-main'); await page.keyboard.press('Enter');
  ok('Enter on focused card opens editor', await page.locator('#card-dialog').evaluate(d => d.open));
  await page.keyboard.press('Escape');
  // validation: empty lists
  await page.click('#btn-lists');
  while (await page.locator('#l-owners .item:not(.new) button').count()) await page.locator('#l-owners .item:not(.new) button').first().click();
  await page.click('#ld-save');
  ok('lists validation blocks empty owners', !(await page.locator('#ld-err').evaluate(e => e.hidden)));
  await page.click('#ld-cancel');
  // overflow + screenshots
  const ov = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  ok('no horizontal overflow desktop', ov <= 0, `(${ov})`);
  await page.screenshot({ path: SHOTS + 'desktop-light.png', fullPage: false });
  await page.emulateMedia({ colorScheme: 'dark' }); await page.waitForTimeout(100);
  await page.screenshot({ path: SHOTS + 'desktop-dark.png', fullPage: false });
  await page.emulateMedia({ colorScheme: 'light' });
  // mobile
  await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(150);
  const ovm = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  ok('no horizontal overflow mobile', ovm <= 0, `(${ovm})`);
  await page.screenshot({ path: SHOTS + 'mobile-light.png', fullPage: false });
  // touch drag via CDP: grip of a stamped card to the next day row
  const client = await ctx.newCDPSession(page);
  const card = page.locator('.week').nth(1).locator('.card').first();
  await card.scrollIntoViewIfNeeded(); await page.waitForTimeout(100);
  const cardDate = await card.evaluate(c => c.closest('.day').dataset.date);
  const grip = await card.locator('.grip').boundingBox();
  const nextDate = new Date(Date.UTC(...cardDate.split('-').map((x,i)=>i===1?+x-1:+x)) + 86400000).toISOString().slice(0,10);
  const target = await page.locator(`.day[data-date="${nextDate}"] .cards`).boundingBox();
  const tp = (x, y) => [{ x, y, id: 1 }];
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: tp(grip.x + 8, grip.y + 10) });
  for (let i = 1; i <= 10; i++) await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: tp(grip.x + 8 + (target.x + 60 - grip.x - 8) * i / 10, grip.y + 10 + (target.y + 20 - grip.y - 10) * i / 10) });
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await page.waitForTimeout(400);
  ok('touch drag via grip moves card', await page.locator(`.day[data-date="${nextDate}"] .card`).count() >= 1 && await page.locator(`.day[data-date="${cardDate}"] .card`).count() === 0);
  // mobile tap on card body opens editor
  await page.locator(`.day[data-date="${nextDate}"] .card .card-main`).first().tap();
  ok('touch tap opens editor', await page.locator('#card-dialog').evaluate(d => d.open));
  await page.keyboard.press('Escape');
  await page.screenshot({ path: SHOTS + 'mobile-dark.png', fullPage: false }).catch(()=>{});
  ok('no console errors', errors.length === 0, errors.join(' | '));
  console.log(log.join('\n'));
  await browser.close();
})().catch(e => { console.log(log.join('\n')); console.error('CRASH', e); process.exit(1); });
