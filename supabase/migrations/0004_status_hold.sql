-- ============================================================================
--  DomainFolio · 0004 · the "on hold" status
--  The Domains table edits a domain's status inline and offers four choices:
--  listed for sale, on hold, not listed and expired. Three of them already
--  exist in the enum; this widens it by one value so a domain can be paused
--  without being archived or dropped.
--  Run this once in the Supabase SQL editor (or `supabase db push`) before
--  choosing "On hold" — the enum rejects unknown values otherwise.
-- ============================================================================

alter type domain_status add value if not exists 'hold';
