"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, isToday, startOfMonth, startOfWeek } from "date-fns";
import { cn } from "@/lib/utils";
import { IconButton } from "./button";

export interface CalendarEvent {
  id: string;
  date: Date;
  title: string;
  tone?: "accent" | "success" | "warning" | "danger" | "purple";
  href?: string;
}

const toneDot = {
  accent: "bg-accent",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  purple: "bg-accent-3",
};

export interface CalendarProps {
  month?: Date;
  onMonthChange?: (d: Date) => void;
  selected?: Date | null;
  onSelect?: (d: Date) => void;
  events?: CalendarEvent[];
  className?: string;
  weekStartsOn?: 0 | 1;
}

function Calendar({ month: monthProp, onMonthChange, selected, onSelect, events = [], className, weekStartsOn = 1 }: CalendarProps) {
  const [internal, setInternal] = React.useState(() => monthProp ?? new Date());
  const month = monthProp ?? internal;
  const setMonth = (d: Date) => {
    setInternal(d);
    onMonthChange?.(d);
  };
  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(month), { weekStartsOn }),
    end: endOfWeek(endOfMonth(month), { weekStartsOn }),
  });
  const weekdays = Array.from({ length: 7 }, (_, i) => format(days[i]!, "EEEEE"));

  return (
    <div className={cn("surface p-4", className)}>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold text-fg">{format(month, "MMMM yyyy")}</p>
        <div className="flex items-center gap-1">
          <IconButton label="Previous month" size="sm" onClick={() => setMonth(addMonths(month, -1))}>
            <ChevronLeft className="rtl:rotate-180" />
          </IconButton>
          <IconButton label="Next month" size="sm" onClick={() => setMonth(addMonths(month, 1))}>
            <ChevronRight className="rtl:rotate-180" />
          </IconButton>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-caption text-fg-subtle">
        {weekdays.map((d, i) => (
          <span key={i} className="py-1">
            {d}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1" role="grid">
        {days.map((day) => {
          const dayEvents = events.filter((e) => isSameDay(e.date, day));
          const inMonth = isSameMonth(day, month);
          const isSelected = selected ? isSameDay(day, selected) : false;
          return (
            <button
              key={day.toISOString()}
              type="button"
              role="gridcell"
              aria-selected={isSelected}
              aria-label={format(day, "PPPP")}
              onClick={() => onSelect?.(day)}
              className={cn(
                "flex aspect-square flex-col items-center justify-start gap-1 rounded-md p-1 text-sm transition-colors hover:bg-bg-muted focus-visible:outline-2 focus-visible:outline-accent",
                !inMonth && "text-fg-subtle/60",
                isToday(day) && "font-semibold text-accent",
                isSelected && "bg-accent text-white hover:bg-accent-hover",
              )}
            >
              <span className="leading-none">{format(day, "d")}</span>
              {dayEvents.length ? (
                <span className="flex gap-0.5">
                  {dayEvents.slice(0, 3).map((e) => (
                    <span key={e.id} className={cn("size-1.5 rounded-full", isSelected ? "bg-white" : toneDot[e.tone ?? "accent"])} />
                  ))}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export { Calendar };
