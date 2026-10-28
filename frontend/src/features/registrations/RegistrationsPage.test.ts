import { render, screen, fireEvent, waitFor } from '@testing-library/vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRouter, createMemoryHistory, RouterView } from 'vue-router';
import RegistrationsPage from './RegistrationsPage.vue';
import { authSession, type SignedInUser } from '../auth/session.js';
import { listMine, getRoster, withdraw } from './api.js';
import { ApiError } from '../../lib/api-client.js';
vi.mock('../auth/session.js', async () => {
  const { reactive } = await import('vue');
  const state = reactive({ user: null, loading: false });
  return { authSession: state, clearLocalSession: () => { state.user = null; } };
});
vi.mock('./api.js', () => ({ listMine: vi.fn(), getRoster: vi.fn(), withdraw: vi.fn() }));
const session = authSession as { user: SignedInUser | null; loading: boolean };
const user = (role: SignedInUser['role'] = 'ATTENDEE', id='a1'): SignedInUser => ({id,role,email:id+'@example.test',displayName:id});
const registration = { id:'r1',eventId:'e1',eventName:'Open day',status:'REGISTERED',startsAt:'2035-01-01T02:00:00Z',registeredAt:'2027-01-01Z',withdrawnAt:null,cancelledAt:null,canWithdraw:true };
const roster = { eventId:'e1',eventName:'Open day',activeCount:1,items:[{ displayName:'Ada',email:'ada@example.test',status:'REGISTERED',registeredAt:'2027-01-01Z',withdrawnAt:null,cancelledAt:null }] };
function deferred<T>() { let resolve!:(value:T)=>void;const promise=new Promise<T>(r=>{resolve=r;});return {promise,resolve}; }
beforeEach(()=>{
  vi.resetAllMocks();session.user=user();session.loading=false;
  vi.mocked(listMine).mockResolvedValue({items:[registration]});vi.mocked(getRoster).mockResolvedValue(roster);
  vi.mocked(withdraw).mockResolvedValue({changed:true,registration:{...registration,status:'WITHDRAWN',canWithdraw:false}});
  HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};
  HTMLDialogElement.prototype.close=function(){this.removeAttribute('open');};
});
async function open(path='/registrations'){
  const router=createRouter({history:createMemoryHistory(),routes:[{path:'/registrations',component:RegistrationsPage},
    {path:'/events/:id/registrations',component:RegistrationsPage},{path:'/login',component:{template:'<p>Sign in</p>'}}]});
  await router.push(path);await router.isReady();render(RouterView,{global:{plugins:[router]}});return router;
}
describe('KAN-17 attendee withdrawal interface',()=>{
  it('AC1/2/102 shows confirmation and accurate re-entry warning before any write; Cancel keeps place',async()=>{
    await open();await fireEvent.click(await screen.findByRole('button',{name:'Withdraw registration'}));
    expect(screen.getByText(/Your place will be released/)).toHaveTextContent('A place will not be saved for you.');
    expect(withdraw).not.toHaveBeenCalled();await fireEvent.click(screen.getByRole('button',{name:'Keep registration'}));expect(withdraw).not.toHaveBeenCalled();
  });
  it('AC3/4 confirms once then reloads authoritative withdrawn status',async()=>{
    await open();await fireEvent.click(await screen.findByRole('button',{name:'Withdraw registration'}));
    vi.mocked(listMine).mockResolvedValue({items:[{...registration,status:'WITHDRAWN',canWithdraw:false,withdrawnAt:'2027-01-10Z'}]});
    await fireEvent.click(screen.getByRole('button',{name:'Confirm withdrawal'}));
    await screen.findByText('Your registration is withdrawn.');expect(withdraw).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Withdrawn')).toBeVisible();expect(screen.queryByRole('button',{name:'Withdraw registration'})).not.toBeInTheDocument();
  });
  it('AC7 clears uncertain state and asks for refresh on failure',async()=>{
    vi.mocked(withdraw).mockRejectedValue(new ApiError('Connection lost.',0,'NETWORK_ERROR'));
    await open();await fireEvent.click(await screen.findByRole('button',{name:'Withdraw registration'}));
    await fireEvent.click(screen.getByRole('button',{name:'Confirm withdrawal'}));
    expect(await screen.findByRole('alert')).toHaveTextContent('Refresh to check the saved status');
    expect(screen.queryByText('Open day')).not.toBeInTheDocument();
  });
  it('AC5 disables duplicate confirmations during a pending write',async()=>{
    const pending=deferred<Awaited<ReturnType<typeof withdraw>>>();vi.mocked(withdraw).mockReturnValue(pending.promise);
    await open();await fireEvent.click(await screen.findByRole('button',{name:'Withdraw registration'}));await fireEvent.click(screen.getByRole('button',{name:'Confirm withdrawal'}));
    expect(screen.getByRole('button',{name:'Saving…'})).toBeDisabled();expect(withdraw).toHaveBeenCalledOnce();
    pending.resolve({changed:true,registration:{...registration,status:'WITHDRAWN'}});
  });
  it('AC101 hides unavailable withdrawal and distinguishes cancelled/withdrawn rows',async()=>{
    vi.mocked(listMine).mockResolvedValue({items:[{...registration,canWithdraw:false},
      {...registration,id:'r2',status:'CANCELLED',canWithdraw:false,cancelledAt:'2027-01-10Z'},
      {...registration,id:'r3',status:'WITHDRAWN',canWithdraw:false}]});
    await open();await screen.findByText('Withdrawal is available only before event start.');
    expect(screen.getByText('Event cancelled')).toBeVisible();expect(screen.getByText('Withdrawn')).toBeVisible();
    expect(screen.queryByRole('button',{name:'Withdraw registration'})).not.toBeInTheDocument();
  });
  it('AC6 signs out if the own-list API rejects authentication',async()=>{
    vi.mocked(listMine).mockRejectedValue(new ApiError('Sign in required',401,'AUTHENTICATION_REQUIRED'));
    await open();await screen.findByRole('link',{name:'Sign in'});expect(session.user).toBeNull();
  });
});
describe('KAN-67 manager roster UI and stale-response isolation',()=>{
  beforeEach(()=>{session.user=user('EVENT_ORGANISER','o1');});
  it('AC1/2/7 renders approved attendee fields and active count',async()=>{
    await open('/events/e1/registrations');await screen.findByText('Ada');expect(screen.getByText('ada@example.test')).toBeVisible();
    expect(screen.getByText(/1 active registration/)).toBeVisible();expect(screen.getByRole('columnheader',{name:'Status'})).toBeVisible();
  });
  it('AC4 refresh reflects committed change; empty result does not retain old rows',async()=>{
    await open('/events/e1/registrations');await screen.findByText('Ada');vi.mocked(getRoster).mockResolvedValue({...roster,activeCount:0,items:[]});
    await fireEvent.click(screen.getByRole('button',{name:'Refresh'}));await screen.findByText('No registrations for this event.');expect(screen.queryByText('Ada')).not.toBeInTheDocument();
  });
  it('AC5/103 late previous-event response cannot overwrite empty current event',async()=>{
    const old=deferred<typeof roster>();vi.mocked(getRoster).mockReturnValueOnce(old.promise).mockResolvedValue({...roster,eventId:'e2',items:[],activeCount:0});
    const router=await open('/events/e1/registrations');await waitFor(()=>expect(getRoster).toHaveBeenCalledOnce());
    await router.push('/events/e2/registrations');await screen.findByText('No registrations for this event.');old.resolve(roster);
    await new Promise(r=>setTimeout(r,0));expect(screen.queryByText('Ada')).not.toBeInTheDocument();
  });
  it('AC6/103 account switch discards in-flight roster and denies attendee role',async()=>{
    const old=deferred<typeof roster>();vi.mocked(getRoster).mockReturnValueOnce(old.promise);await open('/events/e1/registrations');
    session.user=user('ATTENDEE','a2');await screen.findByRole('alert');old.resolve(roster);
    await new Promise(r=>setTimeout(r,0));expect(screen.queryByText('Ada')).not.toBeInTheDocument();expect(getRoster).toHaveBeenCalledOnce();
  });
  it('AC6/103 role/session revocation clears an already displayed roster',async()=>{
    await open('/events/e1/registrations');await screen.findByText('Ada');session.user=null;
    await screen.findByRole('link',{name:'Sign in'});expect(screen.queryByText('Ada')).not.toBeInTheDocument();
  });
  it('AC5 load failure after route change exposes neither prior rows nor a false empty result',async()=>{
    const router=await open('/events/e1/registrations');await screen.findByText('Ada');vi.mocked(getRoster).mockRejectedValue(new Error('Failed to load'));
    await router.push('/events/e2/registrations');await screen.findByRole('alert');expect(screen.queryByText('Ada')).not.toBeInTheDocument();
    expect(screen.queryByText('No registrations for this event.')).not.toBeInTheDocument();
  });
});
