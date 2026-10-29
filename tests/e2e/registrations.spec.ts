import { expect, test, type Page } from './browser-fixtures.js';
import { fulfilWorkspaceRead } from './workspace-fixtures.js';
const eventId='20000000-0000-4000-8000-000000000017';
const attendee={id:'10000000-0000-4000-8000-000000000017',role:'ATTENDEE',displayName:'Ada Attendee',email:'ada@example.test'};
const owner={...attendee,id:'10000000-0000-4000-8000-000000000067',role:'EVENT_ORGANISER',displayName:'Olivia Organiser'};
const registration={id:'30000000-0000-4000-8000-000000000017',eventId,eventName:'Community open day',status:'REGISTERED',startsAt:'2035-01-01T02:00:00Z',
  registeredAt:'2027-01-01T02:00:00Z',withdrawnAt:null as string|null,cancelledAt:null,canWithdraw:true};
async function fixture(page:Page,manager=false){
  let item={...registration};const writes:string[]=[];
  await page.route('**/api/**',async route=>{
    const req=route.request(),path=new URL(req.url()).pathname;
    if(!path.startsWith('/api/'))return route.continue();
    if(path==='/api/auth/me')return route.fulfill({json:{user:manager?owner:attendee}});
    if(path==='/api/registrations/mine')return route.fulfill({json:{items:[item]}});
    if(path.endsWith('/withdraw')&&req.method()==='POST'){
      writes.push(path);expect(req.postDataJSON()).toEqual({confirm:true});
      item={...item,status:'WITHDRAWN',withdrawnAt:'2027-01-10T02:00:00Z',canWithdraw:false};
      return route.fulfill({json:{changed:true,registration:item}});
    }
    if(path===`/api/events/${eventId}/registrations`)return route.fulfill({json:{eventId,eventName:'Community open day',activeCount:1,items:[
      {displayName:'Ada Attendee',email:'ada@example.test',status:'REGISTERED',registeredAt:registration.registeredAt,withdrawnAt:null,cancelledAt:null},
      {displayName:'Alex Attendee',email:'alex@example.test',status:'WITHDRAWN',registeredAt:registration.registeredAt,withdrawnAt:'2027-01-10T02:00:00Z',cancelledAt:null}]}});
    if(path==='/api/notifications/unread-count')return route.fulfill({json:{unreadCount:0}});
    if(await fulfilWorkspaceRead(route,req))return;
    return route.fulfill({status:404,json:{error:{code:'NOT_FOUND',message:'Unexpected fixture route '+path}}});
  });
  return writes;
}
test('KAN-17 AC1–4/102 keyboard confirmation, cancel and persistent withdrawn status',async({page},testInfo)=>{
  const writes=await fixture(page);await page.goto('/registrations');
  await expect(page.getByRole('heading',{name:'My registrations'})).toBeVisible();
  await page.screenshot({path:testInfo.outputPath('attendee-desktop.png'),fullPage:true});
  await page.getByRole('button',{name:'Withdraw registration'}).click();
  const dialog=page.getByRole('dialog');await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('A place will not be saved for you.');expect(writes).toHaveLength(0);
  await page.keyboard.press('Escape');await expect(dialog).not.toBeVisible();expect(writes).toHaveLength(0);
  await page.getByRole('button',{name:'Withdraw registration'}).click();await page.getByRole('button',{name:'Confirm withdrawal'}).click();
  await expect(page.getByText('Your registration is withdrawn.')).toBeVisible();expect(writes).toHaveLength(1);
  await page.reload();await expect(page.getByText('Withdrawn',{exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:'Withdraw registration'})).toHaveCount(0);
});
test('KAN-67 AC1–3/7/101 roster is readable on desktop and narrow screens',async({page},testInfo)=>{
  await fixture(page,true);await page.goto(`/events/${eventId}/registrations`);
  await expect(page.getByRole('heading',{name:'Event registrations'})).toBeVisible();
  await expect(page.getByText('Ada Attendee',{exact:true})).toBeVisible();await expect(page.getByText('Withdrawn',{exact:true})).toBeVisible();
  await expect(page.getByText(/1 active registration/)).toBeVisible();
  await page.setViewportSize({width:390,height:844});
  await expect(page.getByRole('heading',{name:'Event registrations'})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  await page.screenshot({path:testInfo.outputPath('roster-mobile.png'),fullPage:true});
});

test('KAN-80 TC-20-417 notification target distinguishes same-name registrations',async({page})=>{
  await fixture(page);
  await page.route('**/api/registrations/mine',route=>route.fulfill({json:{items:[
    {...registration,purpose:'Original programme'},
    {...registration,id:'30000000-0000-4000-8000-000000000018',eventId:'20000000-0000-4000-8000-000000000018',purpose:'Updated programme'},
  ]}}));
  await page.goto('/registrations?registration=30000000-0000-4000-8000-000000000018');
  const selected=page.getByText('Linked registration').locator('..');
  await expect(selected).toContainText('Updated programme');
  await expect(selected).not.toContainText('Original programme');
});
