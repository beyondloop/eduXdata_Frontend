import React, { useEffect, useState } from "react";
import Calendar from "react-calendar";
import { CalendarDays, Clock4, Calendar as CalendarIcon } from "lucide-react";
import { getMyUpcomingExams } from "../lib/api";
import "react-calendar/dist/Calendar.css";

const ScheduleCalendar = () => {
  const [date, setDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let live = true;
    getMyUpcomingExams().then(exams => { if (live) setEvents(exams); })
      .catch(failure => { if (live) setError(failure.message); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, []);

  const dateValue = value => {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day);
  };

  const getTileClassName = ({ date, view }) => {
    if (view === "month") {
      const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      const isEvent = events.some((event) => event.exam_date === dateStr || event.exam_date?.toString().slice(0, 10) === dateStr);
      return isEvent ? "bg-blue-100 text-blue-800 font-semibold rounded-full" : "";
    }
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <CalendarDays size={20} /> Schedules
        </h3>
      </div>

      {/* Calendar */}
      <div className="w-full">
        <Calendar
          onChange={setDate}
          value={date}
          tileClassName={getTileClassName}
          className="!w-full custom-calendar border-0"
        />
      </div>

      {/* Exam List */}
      <div className="mt-6">
        <h4 className="text-sm font-semibold text-gray-700 mb-2">Exams</h4>
        {loading ? <p className="text-sm text-gray-400">Loading exam schedule…</p>
          : error ? <p role="alert" className="text-sm text-red-500">{error}</p>
          : events.length === 0 ? <p className="text-sm text-gray-400">There is no upcoming exam.</p>
          : <div className="space-y-3">{events.map((event) => {
            const examDate = dateValue(event.exam_date?.toString().slice(0, 10));
            const daysLeft = Math.max(0, Math.ceil((new Date(examDate.getFullYear(), examDate.getMonth(), examDate.getDate()) - new Date(new Date().setHours(0, 0, 0, 0))) / 86400000));
            return (
            <div
              key={event.id}
              className="w-full border rounded-xl p-4 bg-gray-50 shadow-sm"
            >
              <div className="flex justify-between items-center mb-2">
                <h5 className="font-semibold text-sm text-gray-800">{event.name}</h5>
                <span className="text-xs text-red-500 bg-red-100 px-2 py-1 rounded-full flex items-center gap-1">
                  <Clock4 size={14} />
                  {daysLeft === 0 ? "Today" : `${daysLeft} Days More`}
                </span>
              </div>
              <div className="text-xs text-gray-600 mt-2 flex flex-col gap-1">
                <div className="flex items-center gap-1">
                  <CalendarIcon size={14} />
                  {examDate.toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </div>
              </div>
            </div>
          ); })}</div>}
      </div>
    </div>
  );
};

export default ScheduleCalendar;
