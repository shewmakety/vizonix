"use client";

import { addDays, formatShortDate } from "@/lib/dates";
import type { DayMark } from "@/lib/sponsor-calendar";
import type { PlacementChoice } from "@/lib/sponsor-labels-client";

const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function href(segment: string, placement: string, start: string): string {
  const params = new URLSearchParams({ segment, placement, start });
  return `/admin/sponsors/availability?${params.toString()}`;
}

export function AvailabilityBoard({
  segment,
  placement,
  start,
  segments,
  placements,
  days,
}: {
  segment: string;
  placement: string;
  start: string;
  segments: Array<{ slug: string; name: string }>;
  placements: PlacementChoice[];
  days: DayMark[];
}) {
  const end = days.at(-1)?.date ?? start;
  const sold = days.filter((day) => day.kind === "sold").length;
  const held = days.filter((day) => day.kind === "held").length;
  const open = days.filter((day) => day.kind === "open").length;
  const weeks: DayMark[][] = [];
  for (let index = 0; index < days.length; index += 7) weeks.push(days.slice(index, index + 7));

  function go(nextSegment: string, nextPlacement: string) {
    window.location.assign(href(nextSegment, nextPlacement, start));
  }

  return (
    <div>
      <div className="admin-filters">
        <div>
          <label htmlFor="availability-segment">Section</label>
          <select id="availability-segment" value={segment} onChange={(event) => go(event.target.value, placement)}>
            {segments.map((item) => (
              <option key={item.slug} value={item.slug}>
                {item.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="availability-placement">Placement</label>
          <select id="availability-placement" value={placement} onChange={(event) => go(segment, event.target.value)}>
            {placements.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <p className="form-note">
        {formatShortDate(start)} - {formatShortDate(end)}. {sold} sold, {held} held, {open} open.
      </p>
      <p className="admin-legend">
        <span className="admin-day open">Open</span>
        <span className="admin-day sold">Sold</span>
        <span className="admin-day held">Held</span>
      </p>
      <div className="actions">
        <a className="button secondary small" href={href(segment, placement, addDays(start, -7))}>
          Previous week
        </a>
        <a className="button secondary small" href={href(segment, placement, addDays(start, 7))}>
          Next week
        </a>
      </div>
      <table className="admin-calendar">
        <thead>
          <tr>
            {weekdays.map((day) => (
              <th key={day}>{day}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((week) => (
            <tr key={week[0]?.date}>
              {week.map((day) => (
                <td key={day.date} className={`admin-day ${day.kind}`}>
                  <span className="admin-day-num">{Number(day.date.slice(8, 10))}</span>
                  <span className="admin-day-kind">{day.kind === "open" ? "Open" : day.kind === "sold" ? "Sold" : "Held"}</span>
                  {day.labels.map((label, index) => (
                    <span key={`${day.date}-${index}`} className="admin-day-label">
                      {label}
                    </span>
                  ))}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
