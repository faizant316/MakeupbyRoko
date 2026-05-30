import { NextResponse } from 'next/server';
import { createClient } from '../../../../src/lib/supabase/server';
import { requireAdmin } from '../../../../src/lib/requireAdmin';

const CLASS_CATALOG = {
  private_basic_lesson: { title: 'Basic Makeup Lesson',   price: 300  },
  masterclass:          { title: 'Advanced Makeup Lesson', price: 1500 },
};

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function calcAmount(reg) {
  return Object.entries(CLASS_CATALOG).reduce(
    (sum, [k, { price }]) => sum + (reg[k] ? price : 0), 0
  );
}

function buildBuckets(range, now) {
  if (range === '1d') {
    const todayStr = now.toISOString().split('T')[0];
    return Array.from({ length: 12 }, (_, i) => {
      const hour  = i * 2;
      const label = hour === 0 ? '12a' : hour < 12 ? `${hour}a` : hour === 12 ? '12p' : `${hour - 12}p`;
      return { key: `${todayStr}:${String(hour).padStart(2, '0')}`, shortLabel: label, revenue: 0, bookings: 0 };
    });
  }
  if (range === '7d') {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now);
      d.setDate(d.getDate() - (6 - i));
      return { key: d.toISOString().split('T')[0], shortLabel: d.toLocaleString('default', { weekday: 'short' }), revenue: 0, bookings: 0 };
    });
  }
  if (range === '30d') {
    return Array.from({ length: 30 }, (_, i) => {
      const d = new Date(now);
      d.setDate(d.getDate() - (29 - i));
      return { key: d.toISOString().split('T')[0], shortLabel: String(d.getDate()), revenue: 0, bookings: 0 };
    });
  }
  const count = range === '12m' ? 12 : 6;
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (count - 1 - i), 1);
    return {
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '00')}`,
      shortLabel: d.toLocaleString('default', { month: 'short' }),
      revenue: 0, bookings: 0,
    };
  });
}

function getBucketKey(dateStr, range) {
  if (range === '1d') {
    const date = dateStr.substring(0, 10);
    const hour = parseInt(dateStr.substring(11, 13), 10);
    const slot = Math.floor(hour / 2) * 2;
    return `${date}:${String(slot).padStart(2, '00')}`;
  }
  if (range === '7d' || range === '30d') return dateStr.substring(0, 10);
  return dateStr.substring(0, 7);
}

export async function GET(req) {
  const { authError } = await requireAdmin();
  if (authError) return authError;

  const { searchParams } = new URL(req.url);
  const range = searchParams.get('range') || '6m';

  try {
    const supabase = createClient();

    const [{ data: classRegs, error: e1 }, { data: bookings, error: e2 }] = await Promise.all([
      supabase.from('class_registrations').select('*').in('payment_status', ['paid', 'paid_in_full']),
      supabase.from('bookings').select('service, status, created_at').order('created_at', { ascending: false }),
    ]);
    if (e1) throw e1;
    if (e2) throw e2;

    const now           = new Date();
    const thisMonthKey  = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthKey  = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, '0')}`;

    const buckets     = buildBuckets(range, now);
    const classByType = Object.entries(CLASS_CATALOG).map(([key, { title, price }]) => ({ key, title, price, count: 0, revenue: 0 }));

    let totalRevenue = 0, thisMonthRevenue = 0, lastMonthRevenue = 0;

    (classRegs || []).forEach(reg => {
      const bk     = getBucketKey(reg.created_at, range);
      const mk     = reg.created_at.substring(0, 7);
      const amount = calcAmount(reg);
      totalRevenue += amount;
      if (mk === thisMonthKey) thisMonthRevenue += amount;
      if (mk === lastMonthKey) lastMonthRevenue += amount;
      const b = buckets.find(x => x.key === bk);
      if (b) b.revenue += amount;
      classByType.forEach(ct => { if (reg[ct.key]) { ct.count++; ct.revenue += ct.price; } });
    });

    const serviceMap  = {};
    const dayCount    = [0, 0, 0, 0, 0, 0, 0]; // Sun=0 … Sat=6
    let thisMonthBookings = 0, lastMonthBookings = 0;

    (bookings || []).forEach(bk => {
      const mk     = bk.created_at.substring(0, 7);
      const bktKey = getBucketKey(bk.created_at, range);
      if (mk === thisMonthKey) thisMonthBookings++;
      if (mk === lastMonthKey) lastMonthBookings++;
      const b = buckets.find(x => x.key === bktKey);
      if (b) b.bookings++;
      dayCount[new Date(bk.created_at).getDay()]++;
      if (bk.service) {
        if (!serviceMap[bk.service]) serviceMap[bk.service] = { name: bk.service, count: 0, completed: 0 };
        serviceMap[bk.service].count++;
        if (bk.status === 'completed') serviceMap[bk.service].completed++;
      }
    });

    const peakDayIdx = dayCount.indexOf(Math.max(...dayCount));
    const peakDay    = bookings?.length ? DAY_NAMES[peakDayIdx] : null;

    return NextResponse.json({
      summary: {
        totalRevenue, thisMonthRevenue, lastMonthRevenue,
        totalBookings:     bookings?.length || 0,
        thisMonthBookings, lastMonthBookings,
        paidClassSignups:  classRegs?.length || 0,
        completedBookings: bookings?.filter(b => b.status === 'completed').length || 0,
        peakDay,
      },
      monthlyTrend: buckets,
      classByType,
      topServices: Object.values(serviceMap).sort((a, b) => b.count - a.count).slice(0, 8),
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
