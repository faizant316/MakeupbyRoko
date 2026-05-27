import { useState, useEffect } from 'react';
import { base44 } from '@/api/apiClient';
import { useQuery } from '@tanstack/react-query';

const AVAILABLE_DAYS = [1, 2, 3, 4, 5, 6];
const UNAVAILABLE_DATES = [];
const TIMES = ['9:00 AM', '11:00 AM', '1:00 PM', '3:00 PM', '5:00 PM', '7:00 PM'];

export default function Booking() {
  const urlParams = new URLSearchParams(window.location.search);
  const preselectedService = urlParams.get('book') || '';

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [formData, setFormData] = useState({ fname: '', lname: '', email: '', phone: '', service: preselectedService, notes: '' });
  const [showConfirm, setShowConfirm] = useState(false);
  const [calDays, setCalDays] = useState([]);

  // Fetch existing bookings for real-time availability
  const { data: bookings = [] } = useQuery({
    queryKey: ['bookings-home'],
    queryFn: () => base44.entities.Booking.list(),
    initialData: [],
  });

  const bookedTimesMap = {};
  bookings.forEach(b => {
    if (b.status !== 'cancelled' && b.date && b.time) {
      if (!bookedTimesMap[b.date]) bookedTimesMap[b.date] = [];
      bookedTimesMap[b.date].push(b.time);
    }
  });

  useEffect(() => {
    renderCalendar();
  }, [currentDate]);

  const pad = (n) => String(n).padStart(2, '0');
  const dateKey = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;

  const renderCalendar = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days = [];
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const thisDate = new Date(year, month, d);
      days.push({ d, date: thisDate });
    }
    setCalDays(days);
  };

  const getTakenTimes = () => {
    return bookedTimesMap;
  };

  const handleDayClick = (day) => {
    if (!day) return;
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const key = dateKey(year, month, day.d);

    const thisDate = new Date(year, month, day.d);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const isPast = thisDate < today;
    const dayOfWeek = thisDate.getDay();
    const isAvailable = !isPast && AVAILABLE_DAYS.includes(dayOfWeek) && !UNAVAILABLE_DATES.includes(key);

    if (!isAvailable && thisDate.getTime() !== today.getTime()) return;

    setSelectedDate(key);
    setSelectedTime(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.fname || !formData.email || !formData.service) {
      alert('Please fill in required fields.');
      return;
    }

    try {
      await base44.entities.Booking.create({
        name: `${formData.fname} ${formData.lname}`,
        email: formData.email,
        phone: formData.phone,
        service: formData.service,
        date: selectedDate,
        time: selectedTime,
        notes: formData.notes,
        status: 'pending'
      });
      setShowConfirm(true);
    } catch (err) {
      console.error('Booking error:', err);
      alert('Error creating booking. Please try again.');
    }
  };

  const taken = getTakenTimes()[selectedDate] || [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  return (
    <section id="book" className="section bg-[var(--surface)]">
      <div className="container">
        <div className="section-header reveal">
          <span className="label block mb-3">Appointments</span>
          <h2 className="mb-3">Book Your Session</h2>
          <p className="max-w-[480px] text-[0.9375rem] text-[var(--text-muted)] leading-[1.75]">
            Select a date, choose a time, and fill in your details. I'll confirm within 24 hours.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Calendar & Times */}
          <div className="reveal flex flex-col gap-6">
            {/* Calendar */}
            <div className="bg-[var(--bg)] border border-[var(--border)] rounded-[var(--radius-lg)] p-7 shadow-[var(--shadow)]">
              <div className="flex justify-between items-center mb-6">
                <button
                  onClick={() => setCurrentDate(new Date(year, month - 1))}
                  className="w-[30px] h-[30px] rounded-[var(--radius)] border border-[var(--border)] flex items-center justify-center text-[var(--text-muted)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-all cursor-pointer"
                >
                  ‹
                </button>
                <span className="font-serif text-xl font-normal">{monthName}</span>
                <button
                  onClick={() => setCurrentDate(new Date(year, month + 1))}
                  className="w-[30px] h-[30px] rounded-[var(--radius)] border border-[var(--border)] flex items-center justify-center text-[var(--text-muted)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-all cursor-pointer"
                >
                  ›
                </button>
              </div>

              <div className="grid grid-cols-7 gap-1 text-center">
                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                  <div key={d} className="text-[0.6875rem] font-medium letter-spacing-[0.08em] text-[var(--text-light)] uppercase py-1">
                    {d}
                  </div>
                ))}
                {calDays.map((day, idx) => {
                  if (!day) {
                    return <div key={`empty-${idx}`} className="aspect-square"></div>;
                  }

                  const isPast = day.date < today;
                  const isToday = day.date.getTime() === today.getTime();
                  const dayOfWeek = day.date.getDay();
                  const key = dateKey(year, month, day.d);
                  const isAvailable = !isPast && AVAILABLE_DAYS.includes(dayOfWeek) && !UNAVAILABLE_DATES.includes(key);
                  const isSelected = selectedDate === key;

                  return (
                    <button
                      key={key}
                      onClick={() => handleDayClick(day)}
                      className={`aspect-square flex items-center justify-center text-[0.8125rem] rounded-[var(--radius)] cursor-pointer transition-all border border-transparent ${
                        isPast
                          ? 'opacity-30 cursor-not-allowed'
                          : isSelected
                          ? 'bg-[var(--text)] text-white border-[var(--text)]'
                          : isToday
                          ? 'border-[var(--accent)] text-[var(--accent)] font-medium'
                          : isAvailable
                          ? 'text-[var(--text)] font-medium hover:bg-[var(--accent-light)] hover:text-[var(--text)]'
                          : 'opacity-30'
                      }`}
                    >
                      {day.d}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Time Slots */}
            <div className="bg-[var(--bg)] border border-[var(--border)] rounded-[var(--radius-lg)] p-7 shadow-[var(--shadow)]">
              <div className="text-[0.875rem] font-medium mb-5 text-[var(--text)]">
                {selectedDate
                  ? `Available times for ${new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}`
                  : 'Select a date to view available times'}
              </div>
              <div className="grid grid-cols-3 gap-2">
                {selectedDate ? (
                  TIMES.map(t => (
                    <button
                      key={t}
                      onClick={() => setSelectedTime(t)}
                      className={`px-2 py-[0.6rem] border rounded-[var(--radius)] text-[0.8125rem] text-center transition-all ${
                        taken.includes(t)
                          ? 'opacity-35 cursor-not-allowed line-through'
                          : selectedTime === t
                          ? 'bg-[var(--text)] text-white border-[var(--text)]'
                          : 'border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--accent)] hover:text-[var(--accent)]'
                      }`}
                      disabled={taken.includes(t)}
                    >
                      {t}
                    </button>
                  ))
                ) : (
                  <div className="col-span-3 text-center text-[0.875rem] text-[var(--text-light)] py-6">
                    Pick a date above ↑
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Form */}
          <div className="reveal reveal-delay-1 sticky top-[calc(var(--nav-h)_+_2rem)]">
            <div className="bg-[var(--bg)] border border-[var(--border)] rounded-[var(--radius-lg)] p-10 shadow-[var(--shadow)]">
              {!showConfirm ? (
                <>
                  <div className="font-serif text-2xl mb-2">Your Details</div>
                  <p className="text-[0.875rem] text-[var(--text-muted)] mb-8">Fill in your info and I'll confirm your appointment shortly.</p>

                  {(selectedDate || selectedTime) && (
                    <div className="bg-[var(--surface)] rounded-[var(--radius)] px-5 py-4 mb-6 text-[0.8125rem] text-[var(--text-muted)] flex flex-col gap-1">
                      {selectedDate && <span><strong>Date:</strong> {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>}
                      {selectedTime && <span><strong>Time:</strong> {selectedTime}</span>}
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="label block mb-2">First Name</label>
                        <input
                          type="text"
                          value={formData.fname}
                          onChange={(e) => setFormData({ ...formData, fname: e.target.value })}
                          placeholder="Amara"
                          required
                          className="w-full px-4 py-3 border border-[var(--border)] rounded-[var(--radius)] text-[0.9375rem] focus:border-[var(--accent)] outline-none transition-colors"
                        />
                      </div>
                      <div>
                        <label className="label block mb-2">Last Name</label>
                        <input
                          type="text"
                          value={formData.lname}
                          onChange={(e) => setFormData({ ...formData, lname: e.target.value })}
                          placeholder="Jones"
                          className="w-full px-4 py-3 border border-[var(--border)] rounded-[var(--radius)] text-[0.9375rem] focus:border-[var(--accent)] outline-none transition-colors"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="label block mb-2">Email Address</label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="you@email.com"
                        required
                        className="w-full px-4 py-3 border border-[var(--border)] rounded-[var(--radius)] text-[0.9375rem] focus:border-[var(--accent)] outline-none transition-colors"
                      />
                    </div>

                    <div>
                      <label className="label block mb-2">Phone Number</label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="(555) 000-0000"
                        className="w-full px-4 py-3 border border-[var(--border)] rounded-[var(--radius)] text-[0.9375rem] focus:border-[var(--accent)] outline-none transition-colors"
                      />
                    </div>

                    <div>
                      <label className="label block mb-2">Service</label>
                      <select
                        value={formData.service}
                        onChange={(e) => setFormData({ ...formData, service: e.target.value })}
                        required
                        className="w-full px-4 py-3 border border-[var(--border)] rounded-[var(--radius)] text-[0.9375rem] focus:border-[var(--accent)] outline-none transition-colors"
                      >
                        <option value="">Select a service…</option>
                        <option value="Bridal Package (from $400)">💍 Bridal Package (from $400)</option>
                        <option value="Full Glam (from $250)">✨ Full Glam (from $250)</option>
                        <option value="Editorial / Shoot (from $300)">📸 Editorial / Shoot (from $300)</option>
                        <option value="Natural Everyday (from $150)">🌿 Natural Everyday (from $150)</option>
                        <option value="Special Occasion (from $200)">🎉 Special Occasion (from $200)</option>
                        <option value="Makeup Lesson ($180 / 90 min)">🎨 Makeup Lesson ($180 / 90 min)</option>
                      </select>
                    </div>

                    <div>
                      <label className="label block mb-2">Additional Notes</label>
                      <textarea
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        placeholder="Any skin concerns, inspiration photos, event date…"
                        className="w-full px-4 py-3 border border-[var(--border)] rounded-[var(--radius)] text-[0.9375rem] focus:border-[var(--accent)] outline-none transition-colors resize-vertical min-h-[80px]"
                      />
                    </div>

                    <button type="submit" className="btn btn-primary w-full justify-center">
                      Request Appointment
                    </button>
                    <p className="text-[0.75rem] text-center text-[var(--text-light)]">
                      I'll confirm within 24 hours. A deposit may be required to hold your date.
                    </p>
                  </form>
                </>
              ) : (
                <div className="text-center py-8">
                  <div className="w-14 h-14 rounded-full bg-[var(--surface-2)] flex items-center justify-center mx-auto mb-6">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6 text-[var(--accent)]"><polyline points="20 6 9 17 4 12"/></svg>
                  </div>
                  <h3 className="font-serif text-2xl mb-3">You're on the list!</h3>
                  <p className="text-[0.9rem] text-[var(--text-muted)] mb-6 max-w-[320px] mx-auto">
                    I've received your request. Expect a confirmation message within 24 hours. I can't wait to work with you!
                  </p>
                  <button
                    onClick={() => {
                      setShowConfirm(false);
                      setFormData({ fname: '', lname: '', email: '', phone: '', service: '', notes: '' });
                    }}
                    className="btn btn-outline"
                  >
                    Book Another
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}