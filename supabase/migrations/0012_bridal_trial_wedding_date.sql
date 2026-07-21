-- 0012: the bride's actual wedding date, asked on the BRIDAL TRIAL form only.
--
-- Note the existing `wedding_date` column already holds the date the bride
-- picked on the calendar, which for a trial is the TRIAL date, not the wedding.
-- Rather than overload it, trials store the real wedding date here so Roko can
-- see how much runway there is between the trial and the big day (she
-- recommends booking a trial 1 to 3 months out).
--
-- Optional field: brides who haven't locked their date yet leave it blank.
alter table bridal_inquiries add column if not exists trial_wedding_date text;
