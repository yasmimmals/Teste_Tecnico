import { MapPin } from 'lucide-react';
import { city, hour, MARKING_NAME } from '../lib/format';
import { mapLink } from '../lib/geo';
import type { Marking } from '../lib/types';

// uma marcação: hora (no fuso onde foi batida), tipo e o pino com o link do mapa
export default function MarkingTime({ marking, homeTz }: { marking: Marking; homeTz: string }) {
  const otherTz = marking.timezone !== homeTz;

  return (
    <span className="marking" title={MARKING_NAME[marking.event_type] + (marking.note ? ` - ${marking.note}` : '')}>
      <span className="marking-hour">{hour(marking.occurred_at, marking.timezone)}</span>
      {otherTz && <span className="marking-tz">{city(marking.timezone)}</span>}
      {marking.location && (
        <a
          className="marking-pin"
          href={mapLink(marking.location)}
          target="_blank"
          rel="noreferrer"
          aria-label={`Ver no mapa onde foi registrada a ${MARKING_NAME[marking.event_type].toLowerCase()}`}
        >
          <MapPin size={14} />
        </a>
      )}
    </span>
  );
}
