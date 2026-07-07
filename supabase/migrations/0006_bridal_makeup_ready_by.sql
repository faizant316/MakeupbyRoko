-- The bridal inquiry form now collects the bride's preferred "ready by" time
-- (when she'd like her makeup finished / the makeup artist to have her ready).
-- This is separate from ready_by_time, which stores when her HAIRSTYLIST arrives.
-- Roko still sets the final timeline; this is the client's stated preference.
alter table bridal_inquiries add column if not exists makeup_ready_by_time text;
