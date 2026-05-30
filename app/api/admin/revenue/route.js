import { NextResponse } from 'next/server';
import { createClient } from '../../../../src/lib/supabase/server';
import { requireAdmin } from '../../../../src/lib/requireAdmin';

const CLASS_FULL = {
  private_basic_lesson: { title: 'Basic Makeup Lesson',        price: 300  },
  masterclass:          { title: 'Advanced Makeup Lesson',     price: 1500 },
  virtual_lesson:       { title: 'Virtual Makeup Lesson',      price: 400  },
  intermediate_lesson:  { title: 'Intermediate Makeup Lesson', price: 500  },
  glam_class:           { title: 'Glam Makeup Class',          price: 600  },
};

function calcAmount(reg) {
  return Object.entries(CLASS_FULL).reduce(
    (sum, [k, { price }]) => sum + (reg[k] ? price : 0),
    0
  );
}

function toMonthKey(dateStr) {
  return dateStr.substring(0, 7);
}

export async function GET() {
  const { authError } = await requireAdmin();
  if (authError) return authError;

  try {
    const supabase = createClient();

    const [{ data: classRegs, error: e1 }, { data: bookings, error: e2 }] = await Promise.all([
      supabase
        .from('class_registrations')
        .select('*')
        .in('payment_status', ['paid', 'paid_in_full']),
      supabase
        .from('bookings')
        .select('service, status, created_at')
        .order('created_at', { ascending: false }),
    ]);
    if (e1) throw e1;
    if (e2) throw e2;

    const now = new Date();
    const thisMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthKey = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, '0')}`;

    const months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      return {
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        shortLabel: d.toLocaleString('default', { month: 'short' }),
        revenue: 0,
        bookings: 0,
      };
    });

    const classByType = Object.entries(CLASS_FULL).map(([key, { title, price }]) => ({
      key, title, price, count: 0, revenue: 0,
    }));

    let totalRevenue = 0;
    let thisMonthRevenue = 0;
    let lastMonthRevenue = 0;

    (classRegs || []).forEach(reg => {
      const mk = toMonthKey(reg.created_at);
      const amount = calcAmount(reg);
      totalRevenue += amount;
      if (mk === thisMonthKey) thisMonthRevenue += amount;
      if (mk === lastMonthKey) lastMonthRevenue += amount;
      const m = months.find(x => x.key === mk);
      if (m) m.revenue += amount;
      classByType.forEach(ct => {
        if (reg[ct.key]) { ct.count++; ct.revenue += ct.price; }
      });
    });

    const serviceMap = {};
    let thisMonthBookings = 0;
    let lastMonthBookings = 0;

    (bookings || []).forEach(b => {
      const mk = toMonthKey(b.created_at);
      if (mk === thisMonthKey) thisMonthBookings++;
      if (mk === lastMonthKey) lastMonthBookings++;
      const m = months.find(x => x.key === mk);
      if (m) m.bookings++;
      if (b.service) {
        if (!serviceMap[b.service]) serviceMap[b.service] = { name: b.service, count: 0, completed: 0 };
        serviceMap[b.service].count++;
        if (b.status === 'completed') serviceMap[b.service].completed++;
      }
    });

    const topServices = Object.values(serviceMap)
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    return NextResponse.json({
      summary: {
        totalRevenue,
        thisMonthRevenue,
        lastMonthRevenue,
        totalBookings: bookings?.length || 0,
        thisMonthBookings,
        lastMonthBookings,
        paidClassSignups: classRegs?.length || 0,
        completedBookings: bookings?.filter(b => b.status === 'completed').length || 0,
      },
      monthlyTrend: months,
      classByType,
      topServices,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
