import { DayCalendar } from "../DayCalendar";
import { useState } from "react";

export default function DayCalendarExample() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  const activityDates = [
    new Date(2025, 11, 12),
    new Date(2025, 11, 15),
    new Date(2025, 11, 18),
    new Date(2025, 11, 20),
  ];
  
  return (
    <div className="max-w-md p-4">
      <DayCalendar
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
        activityDates={activityDates}
      />
    </div>
  );
}
