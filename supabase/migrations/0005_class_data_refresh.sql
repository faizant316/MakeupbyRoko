-- One-time data refresh to run right after 0004, in the Supabase SQL editor.
--
-- 1) Old test registrations recorded amount_paid at long-gone catalog prices
--    (Beginner was $300, Advanced was $1,500). True them up to what the site
--    actually advertised ($500 / $1,400) so the admin stops showing "$300".
update class_registrations set amount_paid = 500
  where private_basic_lesson = true and amount_paid = 300;

update class_registrations set amount_paid = 1400
  where masterclass = true and amount_paid = 1500;

-- 2) Refresh the public "Makeup Courses" card (services table): Wednesdays
--    only, online + in-person formats, new fee-inclusive prices, pay in full.
update services set
  deposit = 'Pay in full online',
  description = 'Classes are held on Wednesdays, online over Zoom or in person at the studio in Mountain House, CA. Pick your class, choose one of the next two open Wednesdays and a start time, then pay online to lock in your seat.',
  includes = array[
    'Beginner Makeup Lesson (3 hours): $310 online · $520 in person',
    'Advanced Makeup Artist Training: $1,240 online · $1,445 in person',
    'Advanced in-person training is a 7-hour day with a 1-hour lunch break',
    'Advanced online training runs 6 hours with a 30-minute break'
  ],
  key_features = array[
    'Online over Zoom or in person at the Mountain House studio',
    'Wednesdays only, book one of the next two open dates',
    'Zoom link or studio address sent instantly after checkout',
    'Beginner to advanced levels with a customized curriculum'
  ],
  what_to_expect = 'Every class is tailored to your current skill level, whether you''re a complete beginner or an aspiring makeup artist. Before we begin, we''ll discuss your goals so I can customize the lesson to your needs. You''re welcome to take notes, record the class, and ask questions throughout. Online classes run live on Zoom with your link sent right after checkout. In-person classes are held at the studio in Mountain House, with the address in your confirmation email. The advanced training is a full day: 7 hours in person with a 1-hour lunch break, or 6 hours online with a 30-minute break.'
where category = 'lessons' and title = 'Makeup Courses';
