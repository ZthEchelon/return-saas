//schedulong helper 

//responsibility to upsert notifications
//upsert job with a deterministic key deupekey

/* Example dedupe patterns:

Per-event digest job: dedupeKey = ${eventKey}:digest:${YYYY-MM-DD}``

Per-event immediate job: dedupeKey = ${eventKey}:immediate``*/

