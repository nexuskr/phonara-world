
ALTER TABLE public.conversion_events
  DROP CONSTRAINT IF EXISTS conversion_events_event_type_check;

ALTER TABLE public.conversion_events
  ADD CONSTRAINT conversion_events_event_type_check
  CHECK (event_type = ANY (ARRAY[
    'view','cta_click','dismiss','convert',
    'feed_impression','feed_click','revenue_collected','viral_milestone'
  ]));
