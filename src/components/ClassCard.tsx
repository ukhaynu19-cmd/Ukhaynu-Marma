import React from "react";
import { Trash2, Clock, MapPin, Users, ToggleLeft, ToggleRight, Calendar } from "lucide-react";
import { ClassSchedule } from "../types";

interface ClassCardProps {
  key?: React.Key;
  schedule: ClassSchedule;
  onDelete: (id: string | number) => void;
  onToggleEnabled?: (id: string | number) => void;
  isToday: boolean;
  isUpcomingSoon: boolean; // starts in <= 10 mins
  countdownText?: string;
}

export default function ClassCard({
  schedule,
  onDelete,
  onToggleEnabled,
  isToday,
  isUpcomingSoon,
  countdownText,
}: ClassCardProps) {
  // Predefined gorgeous border & background colors based on chosen class accent color
  const colorMap: Record<string, { bg: string; border: string; text: string; indicator: string }> = {
    crimson: { bg: "bg-[#fdf5f2]", border: "border-[#f5e1da]", text: "text-[#b45239]", indicator: "bg-[#b45239]" },
    amber: { bg: "bg-amber-50/70", border: "border-amber-250/20", text: "text-amber-800", indicator: "bg-amber-500" },
    emerald: { bg: "bg-[#edf5ec]", border: "border-[#d8e3d7]", text: "text-[#5a7a5a]", indicator: "bg-[#8ba888]" },
    sky: { bg: "bg-sky-50/70", border: "border-sky-250/20", text: "text-sky-800", indicator: "bg-sky-500" },
    indigo: { bg: "bg-indigo-50/70", border: "border-indigo-250/20", text: "text-indigo-800", indicator: "bg-indigo-550" },
    violet: { bg: "bg-violet-50/70", border: "border-violet-250/20", text: "text-violet-800", indicator: "bg-violet-500" },
  };

  const colors = colorMap[schedule.color || "indigo"] || colorMap.indigo;

  return (
    <div
      id={`class-card-${schedule.id}`}
      className={`group relative overflow-hidden rounded-2xl border p-4.5 transition-all duration-300 bg-white shadow-2xs hover:shadow-md ${
        schedule.enabled === false ? "opacity-60" : ""
      } ${
        isUpcomingSoon
          ? "ring-4 ring-[#b45239]/15 border-[#b45239] animate-pulse"
          : isToday
          ? "border-[#e1e5db] border-l-4 border-l-[#8ba888]"
          : "border-[#e1e5db]"
      } hover:border-[#8ba888]`}
    >
      {/* Visual Accent Top Bar */}
      <div className={`absolute top-0 left-0 right-0 h-1 ${colors.indicator}`} />

      <div className="flex justify-between items-start pt-1.5">
        <div className="space-y-1.5 flex-1 min-w-0 pr-2">
          {/* Tag indicators */}
          <div className="flex flex-wrap gap-1.5 items-center">
            <span className={`text-[10px] uppercase lg:text-[10px] tracking-wider font-bold px-2.5 py-0.5 rounded-md ${colors.bg} ${colors.text} border border-current/10`}>
              {schedule.day}
            </span>
            {isToday && (
              <span className="text-[10px] uppercase tracking-wider font-bold px-2.5 py-0.5 rounded-md bg-[#8ba888] text-white flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping inline-block" />
                Today
              </span>
            )}
            {schedule.enabled === false && (
              <span className="text-[10px] uppercase tracking-wider font-bold px-2.5 py-0.5 rounded-md bg-[#e1e5db] text-[#6a7a6a]">
                Muted
              </span>
            )}
          </div>

          <h3 className="font-serif font-bold text-[#2d3431] text-base md:text-lg truncate group-hover:text-[#334139] leading-tight pt-0.5">
            {schedule.subject}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-3 gap-y-1.5 text-xs text-[#7a8a7a] font-medium pt-0.5">
            <div className="flex items-center gap-1.5 min-w-0">
              <Users size={13} className="text-[#a0a095] shrink-0" />
              <span className="truncate">{schedule.section}</span>
            </div>
            <div className="flex items-center gap-1.5 min-w-0">
              <MapPin size={13} className="text-[#a0a095] shrink-0" />
              <span className="truncate">Room/Hall {schedule.room}</span>
            </div>
            <div className="flex items-center gap-1.5 col-span-1 md:col-span-2 mt-0.5 font-bold text-[#334139]">
              <Clock size={13} className="text-[#8ba888] shrink-0" />
              <span>{schedule.time}</span>
              {countdownText && (
                <span className="text-[#b45239] font-extrabold ml-1 animate-pulse">
                  ({countdownText})
                </span>
              )}
            </div>
          </div>

          {schedule.notes && (
            <p className="text-[11px] text-[#7a8a7a] italic font-normal line-clamp-1 border-t border-[#f0f0e8] pt-2 mt-2">
              Note: {schedule.notes}
            </p>
          )}
        </div>

        {/* Action triggers */}
        <div className="flex items-center gap-1 shrink-0">
          {onToggleEnabled && (
            <button
              id={`toggle-reminder-${schedule.id}`}
              onClick={() => onToggleEnabled(schedule.id)}
              className="p-1 px-1.5 text-[#a0a095] hover:text-[#8ba888] transition-colors"
              title={schedule.enabled === false ? "Enable notification alerts" : "Disable notification alerts"}
            >
              {schedule.enabled !== false ? (
                <ToggleRight size={22} className="text-[#8ba888] cursor-pointer" />
              ) : (
                <ToggleLeft size={22} className="text-[#c1c9bf] cursor-pointer" />
              )}
            </button>
          )}
          
          <button
            id={`delete-class-${schedule.id}`}
            onClick={() => onDelete(schedule.id)}
            className="p-1 text-[#a0a095] hover:text-[#b45239] hover:bg-[#fdf5f2] rounded-lg transition-colors border border-transparent hover:border-[#fdf5f2]"
            title="Delete class"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
