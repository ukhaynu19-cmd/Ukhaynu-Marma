import { ClassSchedule } from "./types";

export const DEFAULT_CLASSES: ClassSchedule[] = [
  {
    id: "hill-1",
    subject: "Math",
    section: "Class 6",
    day: "Monday",
    time: "09:00",
    room: "Room 101",
    color: "indigo",
    notes: "Solve exercises 4.2 from the textbook.",
    enabled: true,
  },
  {
    id: "hill-2",
    subject: "English 1st",
    section: "Class 7",
    day: "Monday",
    time: "10:30",
    room: "Room 102",
    color: "amber",
    notes: "Review comprehension passage 'A Beautiful Day'.",
    enabled: true,
  },
  {
    id: "hill-3",
    subject: "Physics",
    section: "Class 9 - Science",
    day: "Tuesday",
    time: "09:30",
    room: "Physics Lab",
    color: "crimson",
    notes: "Motion equations numerical practice. Bring calculator.",
    enabled: true,
  },
  {
    id: "hill-4",
    subject: "Accounting",
    section: "Class 10 - Business Studies",
    day: "Tuesday",
    time: "11:00",
    room: "Room 203",
    color: "emerald",
    notes: "Ledger book calculation review.",
    enabled: true,
  },
  {
    id: "hill-5",
    subject: "Science",
    section: "Class 8",
    day: "Wednesday",
    time: "12:00",
    room: "Room 104",
    color: "sky",
    notes: "Photosynthesis chapter reading.",
    enabled: true,
  },
  {
    id: "hill-6",
    subject: "Geography",
    section: "Class 9 - Humanities",
    day: "Thursday",
    time: "09:00",
    room: "Room 204",
    color: "violet",
    notes: "Discussion on climate change and earth structure.",
    enabled: true,
  },
  {
    id: "hill-7",
    subject: "Bangla 1st",
    section: "Class 6",
    day: "Thursday",
    time: "10:30",
    room: "Room 101",
    color: "indigo",
    notes: "Read poem 'Shabar Ami Chhatro'.",
    enabled: true,
  },
  {
    id: "hill-8",
    subject: "Higher Math",
    section: "Class 10 - Science",
    day: "Thursday",
    time: "12:30",
    room: "Room 301",
    color: "crimson",
    notes: "Practice geometry proofs on circles.",
    enabled: true,
  }
];

export const PRESET_SUBJECTS = [
  // General (Class 6 - 10)
  "Bangla 1st",
  "Bangla 2nd",
  "English 1st",
  "English 2nd",
  "Math",
  "Science",
  "Bangladesh Studies",
  "ICT",
  "Religion",
  "Agriculture",
  // Science Group
  "Physics",
  "Chemistry",
  "Biology",
  // Business Studies Group
  "Accounting",
  "Finance & Banking",
  "Business Entrepreneurship",
  // Humanities Group
  "Geography",
  "Civics",
  "History",
  // Optional Subjects
  "Higher Math"
];

export const PRESET_SECTIONS = [
  "Class 6",
  "Class 7",
  "Class 8",
  "Class 9 - Science",
  "Class 9 - Business Studies",
  "Class 9 - Humanities",
  "Class 10 - Science",
  "Class 10 - Business Studies",
  "Class 10 - Humanities"
];

export const ACCENT_COLORS = [
  { id: "indigo", label: "General", bgClass: "bg-indigo-500", textClass: "text-indigo-600" },
  { id: "crimson", label: "Science", bgClass: "bg-rose-500", textClass: "text-rose-600" },
  { id: "emerald", label: "Business Studies", bgClass: "bg-emerald-500", textClass: "text-emerald-600" },
  { id: "violet", label: "Humanities", bgClass: "bg-violet-500", textClass: "text-violet-600" },
  { id: "amber", label: "Optional", bgClass: "bg-amber-500", textClass: "text-amber-600" },
  { id: "sky", label: "Extracurricular", bgClass: "bg-sky-500", textClass: "text-sky-600" },
];
