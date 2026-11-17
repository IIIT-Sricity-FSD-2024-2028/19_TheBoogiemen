/**
 * colleges.service.spec.ts — getRevenueReport(): the superadmin's "how much
 * have we actually earned, per institute" view.
 *
 * Revenue means a CAPTURED payment, not a quote or an active subscription —
 * either of those can exist with no money ever having changed hands. These
 * lock in that distinction, plus the "every college appears, zero-revenue
 * ones too" convention the method's own docstring commits to.
 */
import { CollegesService } from './colleges.service';
import { PasswordService } from '../auth/password.service';

const nullLogger = { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() } as any;

const dbWith = (over: any = {}) =>
  ({
    colleges: [],
    users: [],
    subscriptions: [],
    payments: [],
    quotes: [],
    persist: jest.fn(),
    ...over,
  }) as any;

const service = (db: any) => new CollegesService(db, {} as PasswordService, nullLogger);

describe('getRevenueReport', () => {
  it('sums only captured payments, excluding failed/created ones', async () => {
    const db = dbWith({
      colleges: [{ college_id: 'c1', name: 'Alpha' }],
      subscriptions: [{ subscription_id: 's1', college_id: 'c1' }],
      payments: [
        { subscription_id: 's1', status: 'captured', amount_paise: 100_00, created_at: '2026-01-01' },
        { subscription_id: 's1', status: 'failed', amount_paise: 999_00, created_at: '2026-01-02' },
        { subscription_id: 's1', status: 'created', amount_paise: 999_00, created_at: '2026-01-03' },
      ],
    });
    const report = await service(db).getRevenueReport();
    expect(report.total_revenue_paise).toBe(100_00);
    expect(report.by_college[0].revenue_paise).toBe(100_00);
    expect(report.by_college[0].payment_count).toBe(1);
  });

  it('attributes a payment to its own college only, never another one\'s', async () => {
    const db = dbWith({
      colleges: [
        { college_id: 'c1', name: 'Alpha' },
        { college_id: 'c2', name: 'Beta' },
      ],
      subscriptions: [
        { subscription_id: 's1', college_id: 'c1' },
        { subscription_id: 's2', college_id: 'c2' },
      ],
      payments: [
        { subscription_id: 's1', status: 'captured', amount_paise: 100_00, created_at: '2026-01-01' },
        { subscription_id: 's2', status: 'captured', amount_paise: 500_00, created_at: '2026-01-01' },
      ],
    });
    const report = await service(db).getRevenueReport();
    const alpha = report.by_college.find((c) => c.college_id === 'c1')!;
    const beta = report.by_college.find((c) => c.college_id === 'c2')!;
    expect(alpha.revenue_paise).toBe(100_00);
    expect(beta.revenue_paise).toBe(500_00);
    expect(report.total_revenue_paise).toBe(600_00);
  });

  it('includes a college with no payments at all, at zero', async () => {
    const db = dbWith({ colleges: [{ college_id: 'c1', name: 'Alpha' }] });
    const report = await service(db).getRevenueReport();
    expect(report.by_college).toEqual([
      expect.objectContaining({ college_id: 'c1', revenue_paise: 0, payment_count: 0, last_payment_at: null }),
    ]);
  });

  it('sorts colleges by revenue, highest first', async () => {
    const db = dbWith({
      colleges: [
        { college_id: 'c1', name: 'Low' },
        { college_id: 'c2', name: 'High' },
      ],
      subscriptions: [
        { subscription_id: 's1', college_id: 'c1' },
        { subscription_id: 's2', college_id: 'c2' },
      ],
      payments: [
        { subscription_id: 's1', status: 'captured', amount_paise: 100_00, created_at: '2026-01-01' },
        { subscription_id: 's2', status: 'captured', amount_paise: 900_00, created_at: '2026-01-01' },
      ],
    });
    const report = await service(db).getRevenueReport();
    expect(report.by_college.map((c) => c.college_id)).toEqual(['c2', 'c1']);
  });
});
