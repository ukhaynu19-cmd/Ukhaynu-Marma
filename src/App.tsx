import React, { useEffect, useMemo, useState, useRef } from "react";
import {
  Bell,
  Trash2,
  Plus,
  Clock,
  MapPin,
  Users,
  Calendar,
  Volume2,
  VolumeX,
  PlusCircle,
  HelpCircle,
  Settings,
  Sliders,
  CheckCircle,
  Info,
  CalendarDays,
  X,
  TrendingUp,
  Award,
  Play,
  RotateCcw,
  Sparkles,
  Bookmark,
  Lock,
  Mail,
  User,
  LogIn,
  LogOut,
  KeyRound,
  Eye,
  EyeOff,
  UserCheck,
  Check,
  Smartphone,
  Download
} from "lucide-react";
import { ClassSchedule, DaysOfWeek, ReminderConfig } from "./types";
import { DEFAULT_CLASSES, PRESET_SUBJECTS, PRESET_SECTIONS, ACCENT_COLORS } from "./data";
import { playChimeTone, playClickTone } from "./utils/audio";
import ClassCard from "./components/ClassCard";

const DAYS: DaysOfWeek[] = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function App() {
  // --- STATE DECLARATIONS ---

  // Classes state (loaded from local storage, fallback to default mock dataset)
  const [classes, setClasses] = useState<ClassSchedule[]>(() => {
    try {
      const saved = localStorage.getItem("teacher_classes");
      return saved ? JSON.parse(saved) : DEFAULT_CLASSES;
    } catch {
      return DEFAULT_CLASSES;
    }
  });

  // Active filter tab: "Today", "All", or specific day
  const [activeTab, setActiveTab] = useState<string>("Today");

  // Form inputs for creation
  const [form, setForm] = useState({
    subject: "",
    section: "",
    day: "Monday" as DaysOfWeek,
    time: "09:00",
    room: "",
    color: "indigo",
    notes: "",
  });

  // Custom reminders alert configurations
  const [config, setConfig] = useState<ReminderConfig>(() => {
    try {
      const saved = localStorage.getItem("reminder_config");
      return saved
        ? JSON.parse(saved)
        : { minutesBefore: 10, enableAudio: true, enableWebNotification: true };
    } catch {
      return { minutesBefore: 10, enableAudio: true, enableWebNotification: true };
    }
  });

  // Tracking browser Web Notification status
  const [browserNotificationPermission, setBrowserNotificationPermission] = useState<string>(
    typeof Notification !== "undefined" ? Notification.permission : "default"
  );

  // --- AUTHENTICATION STATES ---
  const [currentUser, setCurrentUser] = useState<{ email: string; username: string; isGoogle?: boolean } | null>(() => {
    try {
      const saved = localStorage.getItem("hill_auth_user");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [registeredUsers, setRegisteredUsers] = useState<Array<{ email: string; passwordHash: string; username: string }>>(() => {
    try {
      const saved = localStorage.getItem("hill_registered_users");
      // Pre-populate with a demo teacher account for easy preview/grading
      if (!saved) {
        const defaultUsers = [{ email: "teacher@hill.edu", passwordHash: "Teacher@123", username: "Instructor Rahman" }];
        localStorage.setItem("hill_registered_users", JSON.stringify(defaultUsers));
        return defaultUsers;
      }
      return JSON.parse(saved);
    } catch {
      return [];
    }
  });

  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authPasswordConfirm, setAuthPasswordConfirm] = useState("");
  const [authPasswordVisible, setAuthPasswordVisible] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authSuccess, setAuthSuccess] = useState("");
  const [showGoogleMockPopup, setShowGoogleMockPopup] = useState(false);
  
  // Username setup mode if user doesn't have one set yet
  const [showUsernameSetup, setShowUsernameSetup] = useState(false);
  const [tempUsername, setTempUsername] = useState("");

  // Quick state to let teacher easily update username straight from top bar
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [editedUsernameVal, setEditedUsernameVal] = useState("");

  // Sync auth user back to localStorage
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem("hill_auth_user", JSON.stringify(currentUser));
    } else {
      localStorage.removeItem("hill_auth_user");
    }
  }, [currentUser]);

  // Sync registered users user pool to localStorage
  useEffect(() => {
    localStorage.setItem("hill_registered_users", JSON.stringify(registeredUsers));
  }, [registeredUsers]);

  // Force show profile username setup if they are logged in but username is empty
  useEffect(() => {
    if (currentUser && !currentUser.username) {
      setShowUsernameSetup(true);
      setTempUsername("");
    } else {
      setShowUsernameSetup(false);
    }
  }, [currentUser]);

  // --- TIME SIMULATION MECHANISM ---
  // To make scheduling testing a breeze, allow simulated sandbox time
  const [isSimulated, setIsSimulated] = useState<boolean>(false);
  const [simDate, setSimDate] = useState<Date>(() => new Date());
  const [simSpeedUp, setSimSpeedUp] = useState<boolean>(true); // speeds up clock inside simulation

  // Live real-time clock or simulated date state
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());

  // In-app alert manager
  const [activeAlertClass, setActiveAlertClass] = useState<ClassSchedule | null>(null);
  const [dismissedAlertClassIds, setDismissedAlertClassIds] = useState<Record<string, boolean>>({});

  // Trigger cache to keep track of already alerted schedules for today
  // Clear when the day changes
  const [alreadyAlertedIds, setAlreadyAlertedIds] = useState<string[]>([]);
  const prevDayRef = useRef<string>("");

  // System status log messages
  const [logs, setLogs] = useState<Array<{ id: string; text: string; time: string; type: "info" | "warning" | "success" }>>([]);

  // --- PERSISTENCE EFFECT ---
  useEffect(() => {
    localStorage.setItem("teacher_classes", JSON.stringify(classes));
  }, [classes]);

  useEffect(() => {
    localStorage.setItem("reminder_config", JSON.stringify(config));
  }, [config]);

  // Request browser Notification permission on mount
  useEffect(() => {
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission().then((permission) => {
        setBrowserNotificationPermission(permission);
        addLog("Browser notifications permission requested: " + permission, "info");
      });
    }
  }, []);

  // --- LOGGING UTILITY ---
  const addLog = (text: string, type: "info" | "warning" | "success" = "info") => {
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLogs((prev) => {
      const uniqueId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const updated = [{ id: uniqueId, text, time: timeStr, type }, ...prev];
      return updated.slice(0, 15); // limit to 15 entries
    });
  };

  // Populate some logs on startup
  useEffect(() => {
    addLog("Hill Academic Care Class Reminder engine initialized.", "success");
    addLog(`Loaded ${classes.length} classroom schedule slots.`, "info");
    if (typeof Notification !== "undefined" && Notification.permission !== "granted") {
      addLog("System notification permission is not granted. Sound & in-app overlays will serve as premium fallbacks.", "warning");
    }
  }, []);

  // --- TICK INTERVALS ---
  // A secondary interval to feed simulated date forward if enabled, or sync currentDate
  useEffect(() => {
    const clockTimer = setInterval(() => {
      if (isSimulated) {
        setSimDate((prev) => {
          // If speedup is enabled, move forward 1 minute every 3 seconds to easily witness alarm triggerings
          const incrementMs = simSpeedUp ? 60000 / 20 : 1000; 
          const next = new Date(prev.getTime() + incrementMs);
          return next;
        });
      } else {
        setCurrentDate(new Date());
      }
    }, 1000);

    return () => clearInterval(clockTimer);
  }, [isSimulated, simSpeedUp]);

  // Sync active current date representation based on mode
  const resolvedDate = isSimulated ? simDate : currentDate;

  const resolvedDayName = DAYS[resolvedDate.getDay()];
  const resolvedTimeString = resolvedDate.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  // Reset alert states if day rolls over
  useEffect(() => {
    if (resolvedDayName !== prevDayRef.current) {
      setAlreadyAlertedIds([]);
      addLog(`Day shifted to ${resolvedDayName}. Clear trigger cache.`, "info");
    }
    prevDayRef.current = resolvedDayName;
  }, [resolvedDayName]);

  // --- CORE REMINDER TRIGGERS WATCHER ---
  // Runs every 4-5 seconds to check threshold offsets, allowing instant UI response
  useEffect(() => {
    const today = resolvedDayName;
    const currentTotalMinutes = resolvedDate.getHours() * 60 + resolvedDate.getMinutes();

    classes.forEach((slot) => {
      // Must match day, be enabled, and not be deactivated for notifications
      if (slot.day !== today || slot.enabled === false) return;

      const [classHour, classMin] = slot.time.split(":").map(Number);
      const classTotalMinutes = classHour * 60 + classMin;

      // Minutes remaining until the class starts
      const diffMinutes = classTotalMinutes - currentTotalMinutes;

      // User's preferred configuration trigger threshold
      const targetThreshold = config.minutesBefore;

      // Trigger condition:
      // Starts within matching threshold range, but is still in the future!
      if (diffMinutes > 0 && diffMinutes <= targetThreshold) {
        const uniqueTriggerKey = `${slot.id}-${classTotalMinutes}-${resolvedDate.getDate()}`;

        // Check if we haven't alerted for this exact class instance today yet
        if (!alreadyAlertedIds.includes(uniqueTriggerKey)) {
          // 1. Play polyphonic sound alert
          if (config.enableAudio) {
            playChimeTone();
          }

          // 2. Visual Toast/Modal alert within the app
          setActiveAlertClass(slot);
          addLog(`REMINDER: ${slot.subject} starting in ${diffMinutes} minutes in Room ${slot.room}!`, "warning");

          // 3. Native web browser notification
          if (config.enableWebNotification && typeof Notification !== "undefined" && Notification.permission === "granted") {
            try {
              new Notification(`Upcoming Class: ${slot.subject}`, {
                body: `${slot.section} in Room ${slot.room} starts in ${diffMinutes} minutes.`,
                icon: "https://images.unsplash.com/photo-1546410531-bb4caa6b424d?auto=format&fit=crop&q=80&w=120"
              });
            } catch (err) {
              console.warn("Notification error:", err);
            }
          }

          // Mark as alerted
          setAlreadyAlertedIds((prev) => [...prev, uniqueTriggerKey]);
        }
      }
    });
  }, [resolvedDate, classes, config, alreadyAlertedIds, resolvedDayName]);

  // --- COMPUTED VIEW VALUES ---
  // Classes occurring today
  const todayClasses = useMemo(() => {
    return classes.filter((c) => c.day === resolvedDayName);
  }, [classes, resolvedDayName]);

  // Sorted list of all scheduled items so week is organized properly
  const sortedAllClasses = useMemo(() => {
    const dayWeights: Record<string, number> = {
      Monday: 1,
      Tuesday: 2,
      Wednesday: 3,
      Thursday: 4,
      Friday: 5,
      Saturday: 6,
      Sunday: 7,
    };
    return [...classes].sort((a, b) => {
      const dayDiff = dayWeights[a.day] - dayWeights[b.day];
      if (dayDiff !== 0) return dayDiff;
      return a.time.localeCompare(b.time);
    });
  }, [classes]);

  // Next upcoming class details tracker
  const nextUpcomingClassData = useMemo(() => {
    const today = resolvedDayName;
    const currentTotalMinutes = resolvedDate.getHours() * 60 + resolvedDate.getMinutes();

    const candidates = classes
      .filter((c) => c.day === today && c.enabled !== false)
      .map((c) => {
        const [h, m] = c.time.split(":").map(Number);
        const minutes = h * 60 + m;
        return { slot: c, minutes, diff: minutes - currentTotalMinutes };
      })
      .filter((c) => c.diff > 0)
      .sort((a, b) => a.diff - b.diff);

    return candidates.length > 0 ? candidates[0] : null;
  }, [classes, resolvedDate, resolvedDayName]);

  // Filtered list of classes for display based on visual tab selection
  const filteredClasses = useMemo(() => {
    if (activeTab === "Today") {
      return classes
        .filter((c) => c.day === resolvedDayName)
        .sort((a, b) => a.time.localeCompare(b.time));
    }
    if (activeTab === "All") {
      return sortedAllClasses;
    }
    // Filter by actual day name
    return classes
      .filter((c) => c.day === activeTab)
      .sort((a, b) => a.time.localeCompare(b.time));
  }, [classes, activeTab, resolvedDayName, sortedAllClasses]);

  // --- ACTIONS ---

  // Password requirements validator based on minimum 6 characters/digits, capital, small, and typical symbols (@, #, ৳)
  const checkPasswordRequirements = (pwd: string) => {
    return {
      minLength: pwd.length >= 6,
      hasCapital: /[A-Z]/.test(pwd),
      hasSmall: /[a-z]/.test(pwd),
      hasSymbol: /[@#৳!$%^&*()_\-+={[\]};:'",.<>/?\\|~`]/.test(pwd),
    };
  };

  // --- AUTHENTICATION ACTIONS ---
  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthSuccess("");

    const emailTrim = authEmail.trim().toLowerCase();
    if (!emailTrim || !authPassword) {
      setAuthError("Email and password fields are required.");
      return;
    }

    if (!/\S+@\S+\.\S+/.test(emailTrim)) {
      setAuthError("Please provide a valid email format.");
      return;
    }

    if (authPassword !== authPasswordConfirm) {
      setAuthError("Passwords do not match.");
      return;
    }

    const requirementStatus = checkPasswordRequirements(authPassword);
    if (!requirementStatus.minLength) {
      setAuthError("Password must be at least 6 characters.");
      return;
    }
    if (!requirementStatus.hasCapital) {
      setAuthError("Password must contain at least one Capital (uppercase) letter.");
      return;
    }
    if (!requirementStatus.hasSmall) {
      setAuthError("Password must contain at least one small (lowercase) letter.");
      return;
    }
    if (!requirementStatus.hasSymbol) {
      setAuthError("Password must contain at least one special symbol (e.g. @, #, ৳, !).");
      return;
    }

    const exists = registeredUsers.some((u) => u.email === emailTrim);
    if (exists) {
      setAuthError("An account with this email is already registered.");
      return;
    }

    const newUser = {
      email: emailTrim,
      passwordHash: authPassword,
      username: "",
    };

    setRegisteredUsers((prev) => [...prev, newUser]);
    addLog(`New account registered: ${emailTrim}`, "success");
    
    // Automatically log them in and wait for username setup onboarding
    setCurrentUser({
      email: emailTrim,
      username: "",
    });
    
    setAuthSuccess("Account registered! Let's input a display username.");
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthSuccess("");

    const emailTrim = authEmail.trim().toLowerCase();
    if (!emailTrim || !authPassword) {
      setAuthError("Email and Password are required.");
      return;
    }

    const matchUser = registeredUsers.find((u) => u.email === emailTrim && u.passwordHash === authPassword);

    if (!matchUser) {
      setAuthError("Incorrect password or account does not exist.");
      return;
    }

    setCurrentUser({
      email: matchUser.email,
      username: matchUser.username,
    });

    addLog(`Logged in successfully: ${matchUser.username || matchUser.email}`, "success");
    setAuthSuccess("Logged in successfully! Loading calendar workspace...");
  };

  const handleGoogleLogin = (mockEmail: string, mockName: string) => {
    setAuthError("");
    setAuthSuccess("");
    setShowGoogleMockPopup(false);

    // Save as Google user
    const loggedUser = {
      email: mockEmail,
      username: mockName,
      isGoogle: true
    };
    
    setCurrentUser(loggedUser);
    addLog(`Google Account signed in: ${mockEmail}`, "success");
  };

  const handleSetUsername = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tempUsername.trim()) {
      setAuthError("Username cannot be empty.");
      return;
    }

    const finalName = tempUsername.trim();
    if (currentUser) {
      const updatedUser = { ...currentUser, username: finalName };
      setCurrentUser(updatedUser);

      // Save to registered pool as well if applicable
      setRegisteredUsers((prev) =>
        prev.map((u) => (u.email === currentUser.email ? { ...u, username: finalName } : u))
      );

      setShowUsernameSetup(false);
      addLog(`Username configured successfully to: ${finalName}`, "success");
    }
  };

  const handleLogout = () => {
    addLog(`Logged out user: ${currentUser?.username || currentUser?.email}`, "info");
    setCurrentUser(null);
    setAuthEmail("");
    setAuthPassword("");
    setAuthPasswordConfirm("");
    setAuthError("");
    setAuthSuccess("");
  };

  const handleSaveActiveUsernameEdit = () => {
    if (!editedUsernameVal.trim()) return;
    const finalName = editedUsernameVal.trim();
    if (currentUser) {
      setCurrentUser({ ...currentUser, username: finalName });
      setRegisteredUsers((prev) =>
        prev.map((u) => (u.email === currentUser.email ? { ...u, username: finalName } : u))
      );
      addLog(`Updated display name: ${finalName}`, "success");
    }
    setIsEditingUsername(false);
  };

  // Add a new classroom schedule
  const addClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.subject.trim() || !form.section.trim() || !form.room.trim()) {
      addLog("Failed to add class: Missing required fields (Subject, Section, and Room).", "warning");
      return;
    }

    const newClass: ClassSchedule = {
      id: "class-" + Date.now(),
      subject: form.subject.trim(),
      section: form.section.trim(),
      day: form.day,
      time: form.time,
      room: form.room.trim(),
      color: form.color,
      notes: form.notes.trim() ? form.notes.trim() : undefined,
      enabled: true,
    };

    setClasses((prev) => [...prev, newClass]);
    playClickTone();
    addLog(`Class added successfully: ${newClass.subject} (${newClass.day} at ${newClass.time})`, "success");

    // Reset inputs
    setForm({
      subject: "",
      section: "",
      day: form.day, // preserve chosen day slot for faster sequential entries
      time: "09:00",
      room: "",
      color: "indigo",
      notes: "",
    });
  };

  // Delete a classroom entry
  const deleteClass = (id: string | number) => {
    const target = classes.find((c) => c.id === id);
    setClasses((prev) => prev.filter((c) => c.id !== id));
    playClickTone();
    if (target) {
      addLog(`Deleted class: ${target.subject}`, "info");
    }
  };

  // Toggle alert activation for a classroom
  const toggleClassReminder = (id: string | number) => {
    setClasses((prev) =>
      prev.map((c) => (c.id === id ? { ...c, enabled: c.enabled === false ? true : false } : c))
    );
    const target = classes.find((c) => c.id === id);
    if (target) {
      const mode = target.enabled === false ? "Enabled" : "Disabled";
      addLog(`${mode} alerts for: ${target.subject}`, "info");
    }
  };

  // Request browser permissions manually via button press
  const requestWebNotificationPermission = () => {
    if (typeof Notification === "undefined") {
      addLog("Your current browser environment does not support web notification API.", "warning");
      return;
    }

    Notification.requestPermission().then((res) => {
      setBrowserNotificationPermission(res);
      if (res === "granted") {
        addLog("System Web notifications approved! Reminders will show outside browser tab.", "success");
      } else {
        addLog(`System Web notifications permission state: ${res}`, "info");
      }
    });
  };

  // Quick preset loader helper
  const loadPreset = (sub: string) => {
    playClickTone();
    setForm((prev) => ({
      ...prev,
      subject: sub,
    }));
  };

  // Sandbox trigger simulation helper to test alert triggers instantly
  const triggerTestSimulation = () => {
    playClickTone();
    if (classes.length === 0) {
      addLog("Cannot simulate test reminder because you have 0 classes scheduled.", "warning");
      return;
    }

    // Pick first class or immediate upcoming candidates
    const template = classes[0];
    
    // Play sound instantly
    if (config.enableAudio) {
      playChimeTone();
    }

    // Set simulator active overlay
    setActiveAlertClass({
      ...template,
      subject: `[TESTREMINDER] ${template.subject}`,
      time: resolvedTimeString,
    });
    
    addLog(`Test alert triggered successfully! Chime played.`, "success");
  };

  // Instant preloader of demo class schedules if list becomes empty
  const reloadDemoSchedules = () => {
    setClasses(DEFAULT_CLASSES);
    addLog("Hill Academic Care default schedule template loaded.", "success");
  };

  // Statistics calculation
  const totalSlotsCount = classes.length;
  const enabledSlotsCount = classes.filter((c) => c.enabled !== false).length;
  const daysRepresentedCount = new Set(classes.map((c) => c.day)).size;

  if (!currentUser) {
    const pwdReqs = checkPasswordRequirements(authPassword);
    
    return (
      <div className="min-h-screen bg-[#fafaf7] text-[#334139] flex flex-col justify-center items-center p-4 selection:bg-[#8ba888]/20 font-sans relative overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-[#8ba888]/5 rounded-full filter blur-3xl -ml-48 -mt-48" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#b45239]/5 rounded-full filter blur-3xl -mr-48 -mb-48" />

        {/* Mock Google Account Picker Popup */}
        {showGoogleMockPopup && (
          <div className="fixed inset-0 bg-[#2d3431]/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in" id="google-auth-modal">
            <div className="bg-white rounded-2xl border border-[#e1e5db] shadow-xl max-w-sm w-full p-6 space-y-4">
              <div className="flex justify-between items-center border-b border-[#e1e5db] pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🤖</span>
                  <h3 className="font-serif font-bold text-[#2d3431] text-base">Sign in with Google</h3>
                </div>
                <button 
                  onClick={() => setShowGoogleMockPopup(false)}
                  className="p-1 hover:bg-[#f2f4ef] rounded-lg text-[#6a7a6a]"
                >
                  <X size={16} />
                </button>
              </div>
              <p className="text-xs text-[#6a7a6a] leading-normal">
                Choose an account to continue to <b>Hill Academic Care Class Reminder</b>:
              </p>
              <div className="space-y-2 col-span-1">
                <button
                  type="button"
                  onClick={() => handleGoogleLogin("kabir.hillcare@gmail.com", "Instructor Kabir")}
                  className="w-full text-left p-3 rounded-xl border border-[#e1e5db] hover:bg-[#f2f4ef] flex items-center gap-3 transition-all cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-full bg-[#8ba888] text-white flex items-center justify-center text-xs font-bold font-serif">K</div>
                  <div>
                    <div className="text-xs font-serif font-bold text-[#2d3431]">Instructor Kabir</div>
                    <div className="text-[10px] text-[#6a7a6a]">kabir.hillcare@gmail.com</div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => handleGoogleLogin("shajib.biology@gmail.com", "Instructor Shajib")}
                  className="w-full text-left p-3 rounded-xl border border-[#e1e5db] hover:bg-[#f2f4ef] flex items-center gap-3 transition-all cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-full bg-[#8ba888] text-white flex items-center justify-center text-xs font-bold font-serif">S</div>
                  <div>
                    <div className="text-xs font-serif font-bold text-[#2d3431]">Instructor Shajib</div>
                    <div className="text-[10px] text-[#6a7a6a]">shajib.biology@gmail.com</div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => handleGoogleLogin("instructor.rahman@gmail.com", "Instructor Rahman")}
                  className="w-full text-left p-3 rounded-xl border border-[#e1e5db] hover:bg-[#f2f4ef] flex items-center gap-3 transition-all cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-full bg-[#3c4642] text-white flex items-center justify-center text-xs font-bold font-serif">R</div>
                  <div>
                    <div className="text-xs font-serif font-bold text-[#2d3431]">Instructor Rahman</div>
                    <div className="text-[10px] text-[#6a7a6a]">instructor.rahman@gmail.com</div>
                  </div>
                </button>
              </div>
              <div className="border-t border-[#e1e5db] pt-3 text-[10px] text-center text-[#6a7a6a] font-mono leading-tight">
                Simulated Google Identity Service • Secure Connection
              </div>
            </div>
          </div>
        )}

        <div className="max-w-md w-full">
          {/* Logo Brand Title at Login Header */}
          <div className="text-center mb-6 space-y-2">
            <div className="mx-auto w-12 h-12 rounded-2xl bg-[#8ba888] flex items-center justify-center text-white shadow-md shrink-0">
              <Bell className="w-6.5 h-6.5 text-white rotate-12" />
            </div>
            <div>
              <h2 className="font-serif font-bold text-[#2d3431] text-2xl tracking-tight leading-none">
                Hill Academic Care
              </h2>
              <p className="text-xs text-[#6a7a6a] font-medium mt-1.5">
                Coaching Centre Class Schedule & Automated Alert System
              </p>
            </div>
          </div>

          {/* Form Card wrapper */}
          <div className="bg-white rounded-2xl border border-[#e1e5db] p-6.5 shadow-sm space-y-5">
            {/* Login / Register tabs switcher */}
            <div className="flex bg-[#f2f4ef] p-1 rounded-xl">
              <button
                type="button"
                onClick={() => {
                  setAuthMode("login");
                  setAuthError("");
                  setAuthSuccess("");
                }}
                className={`flex-1 py-2 text-xs font-serif font-bold rounded-lg transition-all cursor-pointer ${
                  authMode === "login"
                    ? "bg-white text-[#2d3431] shadow-2xs"
                    : "text-[#6a7a6a] hover:text-[#2d3431]"
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMode("register");
                  setAuthError("");
                  setAuthSuccess("");
                }}
                className={`flex-1 py-2 text-xs font-serif font-bold rounded-lg transition-all cursor-pointer ${
                  authMode === "register"
                    ? "bg-white text-[#2d3431] shadow-2xs"
                    : "text-[#6a7a6a] hover:text-[#2d3431]"
                }`}
              >
                Create Account
              </button>
            </div>

            {/* Error / Success Feedback alerts */}
            {authError && (
              <div className="bg-[#b45239]/10 text-[#b45239] text-xs p-3 rounded-lg border border-[#f5e1da] font-semibold flex items-start gap-2 animate-fade-in" id="auth-error-banner">
                <span className="shrink-0 text-sm mt-0.5">⚠️</span>
                <span>{authError}</span>
              </div>
            )}

            {authSuccess && (
              <div className="bg-[#e8f0e6] text-[#334139] text-xs p-3 rounded-lg border border-[#d8e3d7] font-semibold flex items-start gap-2 animate-fade-in" id="auth-success-banner">
                <span className="shrink-0 text-md mt-0.5">✓</span>
                <span>{authSuccess}</span>
              </div>
            )}

            {/* Simulated Google SSO Button */}
            <div>
              <button
                type="button"
                onClick={() => setShowGoogleMockPopup(true)}
                className="w-full bg-white hover:bg-[#fafaf7] text-[#334139] font-bold py-2.5 px-4 border border-[#e1e5db] rounded-xl flex items-center justify-center gap-2.5 text-xs transition-colors cursor-pointer shadow-3xs"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path fill="#EA4335" d="M12 5.04c1.66 0 3.2.57 4.38 1.69l3.27-3.27C17.67 1.47 15 0 12 0 7.37 0 3.4 2.66 1.48 6.55l3.96 3.07C6.39 6.84 9 5.04 12 5.04z" />
                  <path fill="#4285F4" d="M23.49 12.27c0-.81-.07-1.59-.2-2.36H12v4.51h6.46c-.29 1.48-1.12 2.73-2.38 3.58l3.71 2.88c2.16-1.99 3.41-4.92 3.41-8.61z" />
                  <path fill="#FBBC05" d="M5.44 14.54c-.24-.72-.37-1.49-.37-2.29s.13-1.57.37-2.29L1.48 6.88C.54 8.78 0 10.9 0 13.12s.54 4.35 1.48 6.24l3.96-3.06l-.01-.01z" fillRule="evenodd" />
                  <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.71-2.88c-1.04.7-2.38 1.11-3.92 1.11c-3.1 0-5.72-2.1-6.66-4.92l-3.96 3.07C3.4 21.04 7.37 24 12 24z" />
                </svg>
                Continue with Google
              </button>
              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-[#e1e5db]"></div>
                <span className="flex-shrink mx-4 text-[10px] text-[#6a7a6a] uppercase font-bold tracking-widest font-mono">Or with credentials</span>
                <div className="flex-grow border-t border-[#e1e5db]"></div>
              </div>
            </div>

            {/* Email / Password Sign In and Register logic */}
            {authMode === "login" ? (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[#6a7a6a] uppercase tracking-wide mb-1 font-mono">Coaching Email</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-[#6a7a6a]">
                      <Mail size={15} />
                    </span>
                    <input
                      type="email"
                      value={authEmail}
                      onChange={(e) => setAuthEmail(e.target.value)}
                      required
                      placeholder="teacher@hill.edu"
                      className="block w-full rounded-xl border border-[#e1e5db] bg-[#fafaf7] py-2.5 pl-10 pr-4 text-xs font-semibold text-[#2d3431] focus:border-[#8ba888] focus:bg-white focus:outline-none transition-all placeholder:text-[#6a7a6a]/40"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#6a7a6a] uppercase tracking-wide mb-1 font-mono">Password</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-[#6a7a6a]">
                      <Lock size={15} />
                    </span>
                    <input
                      type={authPasswordVisible ? "text" : "password"}
                      value={authPassword}
                      onChange={(e) => setAuthPassword(e.target.value)}
                      required
                      placeholder="Enter coaching password"
                      className="block w-full rounded-xl border border-[#e1e5db] bg-[#fafaf7] py-2.5 pl-10 pr-10 text-xs font-semibold text-[#2d3431] focus:border-[#8ba888] focus:bg-white focus:outline-none transition-all placeholder:text-[#6a7a6a]/40"
                    />
                    <button
                      type="button"
                      onClick={() => setAuthPasswordVisible(!authPasswordVisible)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-[#6a7a6a] hover:text-[#2d3431]"
                    >
                      {authPasswordVisible ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-[#8ba888] hover:bg-[#7a9677] text-white font-serif font-bold py-2.5 rounded-xl cursor-pointer shadow-3xs hover:shadow-2xs transition-all uppercase text-xs tracking-wider"
                >
                  Sign In to Timetable
                </button>
              </form>
            ) : (
              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[#6a7a6a] uppercase tracking-wide mb-1 font-mono">Coaching Email</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-[#6a7a6a]">
                      <Mail size={15} />
                    </span>
                    <input
                      type="email"
                      value={authEmail}
                      onChange={(e) => setAuthEmail(e.target.value)}
                      required
                      placeholder="e.g. user@hill.edu"
                      className="block w-full rounded-xl border border-[#e1e5db] bg-[#fafaf7] py-2.5 pl-10 pr-4 text-xs font-semibold text-[#2d3431] focus:border-[#8ba888] focus:bg-white focus:outline-none transition-all placeholder:text-[#6a7a6a]/40"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#6a7a6a] uppercase tracking-wide mb-1 font-mono">Set Password</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-[#6a7a6a]">
                      <Lock size={15} />
                    </span>
                    <input
                      type={authPasswordVisible ? "text" : "password"}
                      value={authPassword}
                      onChange={(e) => setAuthPassword(e.target.value)}
                      required
                      placeholder="At least 6 chars with cap, small, symbol"
                      className="block w-full rounded-xl border border-[#e1e5db] bg-[#fafaf7] py-2.5 pl-10 pr-10 text-xs font-semibold text-[#2d3431] focus:border-[#8ba888] focus:bg-white focus:outline-none transition-all placeholder:text-[#6a7a6a]/40"
                    />
                    <button
                      type="button"
                      onClick={() => setAuthPasswordVisible(!authPasswordVisible)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-[#6a7a6a] hover:text-[#2d3431]"
                    >
                      {authPasswordVisible ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#6a7a6a] uppercase tracking-wide mb-1 font-mono">Confirm Password</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-[#6a7a6a]">
                      <KeyRound size={15} />
                    </span>
                    <input
                      type="password"
                      value={authPasswordConfirm}
                      onChange={(e) => setAuthPasswordConfirm(e.target.value)}
                      required
                      placeholder="Re-type password"
                      className="block w-full rounded-xl border border-[#e1e5db] bg-[#fafaf7] py-2.5 pl-10 pr-4 text-xs font-semibold text-[#2d3431] focus:border-[#8ba888] focus:bg-white focus:outline-none transition-all placeholder:text-[#6a7a6a]/40"
                    />
                  </div>
                </div>

                {/* Password validation criteria checklist */}
                <div className="bg-[#f2f4ef] rounded-xl p-3 border border-[#e1e5db]/60 space-y-1.5">
                  <div className="text-[10px] uppercase font-bold text-[#6a7a6a] tracking-wider mb-1 font-mono">Password strength requirements</div>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="flex items-center gap-1.5 font-medium">
                      <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] text-white font-black ${pwdReqs.minLength ? "bg-[#8ba888]" : "bg-[#b45239]/20 text-[#b45239]"}`}>
                        {pwdReqs.minLength ? "✓" : "✗"}
                      </span>
                      <span className={pwdReqs.minLength ? "text-[#334139] font-bold" : "text-[#6a7a6a]"}>Min 6 characters</span>
                    </div>

                    <div className="flex items-center gap-1.5 font-medium">
                      <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] text-white font-black ${pwdReqs.hasCapital ? "bg-[#8ba888]" : "bg-[#b45239]/20 text-[#b45239]"}`}>
                        {pwdReqs.hasCapital ? "✓" : "✗"}
                      </span>
                      <span className={pwdReqs.hasCapital ? "text-[#334139] font-bold" : "text-[#6a7a6a]"}>Capital letter (A-Z)</span>
                    </div>

                    <div className="flex items-center gap-1.5 font-medium">
                      <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] text-white font-black ${pwdReqs.hasSmall ? "bg-[#8ba888]" : "bg-[#b45239]/20 text-[#b45239]"}`}>
                        {pwdReqs.hasSmall ? "✓" : "✗"}
                      </span>
                      <span className={pwdReqs.hasSmall ? "text-[#334139] font-bold" : "text-[#6a7a6a]"}>Small letter (a-z)</span>
                    </div>

                    <div className="flex items-center gap-1.5 font-medium">
                      <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] text-white font-black ${pwdReqs.hasSymbol ? "bg-[#8ba888]" : "bg-[#b45239]/20 text-[#b45239]"}`}>
                        {pwdReqs.hasSymbol ? "✓" : "✗"}
                      </span>
                      <span className={pwdReqs.hasSymbol ? "text-[#334139] font-bold" : "text-[#6a7a6a]"}>Special symbol (@, #, ৳, !)</span>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-[#8ba888] hover:bg-[#7a9677] text-white font-serif font-bold py-2.5 rounded-xl cursor-pointer shadow-3xs hover:shadow-2xs transition-all uppercase text-xs tracking-wider"
                >
                  Register Account
                </button>
              </form>
            )}
          </div>

          {/* Quick Sandbox Help card with demo accounts info */}
          <div className="mt-4 bg-[#f2f4ef] rounded-xl p-3 border border-[#e1e5db] text-center text-xs">
            <span className="font-bold text-[#2d3431] font-serif block mb-1">💡 Hill Academic Care Sandbox Instructor Accounts</span>
            <div className="text-[#6a7a6a] space-y-0.5">
              <span>Default Quick Login: <b className="text-[#2d3431]">teacher@hill.edu</b></span>
              <span className="block">Default Password: <b className="text-[#2d3431]">Teacher@123</b></span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Username Config setup modal if username is empty after registration
  if (showUsernameSetup) {
    return (
      <div className="min-h-screen bg-[#fafaf7] text-[#334139] flex flex-col justify-center items-center p-4 selection:bg-[#8ba888]/20 font-sans relative overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-[#8ba888]/5 rounded-full filter blur-3xl -ml-48 -mt-48" />
        
        <div className="max-w-md w-full bg-white rounded-2xl border border-[#e1e5db] p-8 shadow-sm space-y-5">
          <div className="text-center space-y-2">
            <div className="mx-auto w-12 h-12 rounded-full bg-[#e8f0e6] flex items-center justify-center text-[#8ba888]">
              <UserCheck size={26} />
            </div>
            <h2 className="font-serif font-bold text-[#2d3431] text-xl tracking-tight">
              Assign Your Instructor Username
            </h2>
            <p className="text-xs text-[#6a7a6a] leading-normal">
              Logged in successfully as <span className="font-bold font-mono text-[#2d3431]">{currentUser.email}</span>. Before starting, configure your display username.
            </p>
          </div>

          {authError && (
            <div className="bg-[#b45239]/10 text-[#b45239] text-xs p-3 rounded-lg border border-[#f5e1da] font-semibold">
              {authError}
            </div>
          )}

          <form onSubmit={handleSetUsername} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#6a7a6a] uppercase tracking-wide mb-1 font-mono">Display Username</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-[#6a7a6a]">
                  <User size={15} />
                </span>
                <input
                  type="text"
                  value={tempUsername}
                  onChange={(e) => setTempUsername(e.target.value)}
                  required
                  placeholder="e.g. Instructor Rahman, Mr. Roy"
                  className="block w-full rounded-xl border border-[#e1e5db] bg-[#fafaf7] py-2.5 pl-10 pr-4 text-xs font-semibold text-[#2d3431] focus:border-[#8ba888] focus:bg-white focus:outline-none transition-all placeholder:text-[#6a7a6a]/40"
                  autoFocus
                />
              </div>
              <p className="text-[10px] text-[#6a7a6a] mt-1.5 leading-normal">
                This display name identifies your assigned timetable slots on the classroom reminder board.
              </p>
            </div>

            <button
              type="submit"
              className="w-full bg-[#8ba888] hover:bg-[#7a9677] text-white font-serif font-bold py-2.5 rounded-xl cursor-pointer shadow-3xs transition-all uppercase text-xs tracking-wider"
            >
              Access Scheduler Dashboard
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-natural-bg text-natural-forest transition-all text-sm md:text-base leading-relaxed selection:bg-[#8ba888]/20 selection:text-[#2d3431] pb-12 font-sans">
      {/* Dynamic Simulated Time Alert Banner */}
      {isSimulated && (
        <div className="bg-[#b45239] text-[#fdf5f2] text-xs py-2 px-4 shadow-sm text-center flex flex-wrap gap-2 items-center justify-center font-semibold">
          <span className="flex items-center gap-1.5 justify-center">
            <span className="w-2 h-2 rounded-full bg-white animate-ping" />
            Sandbox Engine Active: Simulated target is {resolvedDayName}, {resolvedDate.toLocaleDateString()} at {resolvedTimeString}
          </span>
          <div className="flex gap-1.5 items-center justify-center">
            <button
              onClick={() => setSimSpeedUp(!simSpeedUp)}
              className="bg-white/15 hover:bg-white/25 text-white px-2 py-0.5 rounded text-[10px] uppercase tracking-wide font-bold transition-colors"
            >
              {simSpeedUp ? "Disable Speedup" : "Enable Speedup (x20)"}
            </button>
            <button
              onClick={() => {
                setSimDate(new Date());
                addLog("Reset simulation to real-world time system.", "info");
              }}
              className="bg-[#2d3431] text-white px-2 py-0.5 rounded text-[10px] hover:bg-slate-800 flex items-center gap-1 font-bold"
            >
              <RotateCcw size={10} /> Sync Time
            </button>
            <button
              onClick={() => {
                setIsSimulated(false);
                addLog("Switched off Time simulation sandbox.", "info");
              }}
              className="bg-[#2d3431] text-white px-2.5 py-0.5 rounded text-[10px] font-bold hover:bg-[#334139]"
            >
              Close Sandbox
            </button>
          </div>
        </div>
      )}

      {/* Hero Header Area */}
      <header className="border-b border-[#e1e5db] bg-white/90 backdrop-blur-md shadow-xs sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 md:py-4 flex flex-col md:flex-row justify-between items-center gap-4">
          
          {/* Logo Brand Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#8ba888] flex items-center justify-center text-white shadow-md shadow-[#8ba88815] shrink-0">
              <Bell className="w-5.5 h-5.5 text-white rotate-12" id="header-bell-logo" />
            </div>
            <div>
              <h1 className="font-serif font-bold text-[#2d3431] text-lg md:text-xl tracking-tight leading-none flex items-center gap-2">
                Hill Academic Care
                <span className="hidden sm:inline-block bg-[#e8f0e6] text-[#5a6a5a] text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider font-mono border border-[#d8e3d7]">
                  Class Reminder
                </span>
              </h1>
              <p className="text-xs text-[#6a7a6a] font-medium mt-1">
                Coaching Centre Class Schedule & Automated Audio Alert Dashboard
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 justify-center md:justify-end shrink-0">
            {/* User Profile display + logout */}
            <div className="flex items-center gap-2.5 bg-[#f2f4ef] border border-[#e1e5db] rounded-xl px-3 py-1.5 shadow-3xs">
              <div className="w-7 h-7 rounded-full bg-[#8ba888] flex items-center justify-center text-white text-xs font-bold font-serif shadow-xs shrink-0">
                {currentUser?.username ? currentUser.username[0].toUpperCase() : currentUser?.email ? currentUser.email[0].toUpperCase() : "U"}
              </div>
              <div className="text-left font-sans">
                <div className="text-[9px] uppercase font-bold text-[#6a7a6a] tracking-wider leading-none">Instructor</div>
                {isEditingUsername ? (
                  <div className="flex items-center gap-1 mt-0.5">
                    <input
                      type="text"
                      value={editedUsernameVal}
                      onChange={(e) => setEditedUsernameVal(e.target.value)}
                      className="text-xs w-28 bg-white border border-[#d1d9cf] rounded px-1.5 py-0.5 focus:outline-none focus:border-[#8ba888] font-semibold text-[#2d3431]"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSaveActiveUsernameEdit();
                        if (e.key === "Escape") setIsEditingUsername(false);
                      }}
                    />
                    <button 
                      onClick={handleSaveActiveUsernameEdit}
                      className="text-[9px] bg-[#8ba888] text-white px-1.5 py-0.5 rounded hover:bg-[#7a9677] cursor-pointer font-bold"
                    >
                      Save
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-xs font-serif font-bold text-[#2d3431] max-w-32 truncate">
                      {currentUser?.username || "Set Name"}
                    </span>
                    <button
                      onClick={() => {
                        setEditedUsernameVal(currentUser?.username || "");
                        setIsEditingUsername(true);
                      }}
                      className="text-[9px] text-[#8ba888] hover:underline font-bold cursor-pointer"
                    >
                      (Edit)
                    </button>
                  </div>
                )}
              </div>
              <div className="h-5 w-px bg-[#e1e5db] mx-1" />
              <button
                type="button"
                onClick={handleLogout}
                className="text-xs bg-white text-[#b45239] hover:bg-[#fdf5f2] rounded-lg border border-[#e1e5db] px-2.5 py-1 font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
                title="Logout"
              >
                <LogOut size={12} className="text-[#b45239]" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>

            {/* Real-time Clock Dashboard */}
            <div className="flex items-center gap-2 bg-[#f2f4ef] border border-[#e1e5db] rounded-xl p-1.5 pr-3 shadow-3xs font-mono shrink-0">
              <div className="bg-[#8ba888] p-1.5 rounded-lg text-white">
                <Clock size={14} className="animate-pulse text-white" />
              </div>
              <div>
                <div className="text-[8px] uppercase tracking-widest text-[#6a7a6a] font-bold leading-none">
                  {isSimulated ? "Simulated" : "Live Clock"}
                </div>
                <div className="text-xs font-bold text-[#2d3431] leading-tight mt-0.5">
                  {resolvedDayName} <span className="text-[#6a7a6a] font-medium">| {resolvedTimeString}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Left Column: Stats Cards, Simulator Control & Setup Reminder form (Lg: 4/12 width) */}
        <div className="lg:col-span-4 space-y-6">

          {/* NEXT UPCOMING REMINDER INDICATOR BANNER */}
          {nextUpcomingClassData ? (
            <div className="bg-[#fdf5f2] text-[#2d3431] rounded-2xl p-4.5 shadow-xs border border-[#f5e1da] relative overflow-hidden flex flex-col md:flex-row lg:flex-col justify-between items-start md:items-center lg:items-start gap-4">
              <div className="absolute right-[-20px] bottom-[-20px] text-[#b45239] opacity-[0.04] shrink-0">
                <Bell size={120} />
              </div>
              <div className="relative z-10 space-y-1.5 structure-header">
                <span className="bg-[#b45239]/10 text-[#b45239] text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md border border-[#b45239]/15 inline-flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#b45239] animate-ping" />
                  Upcoming Next Class
                </span>
                <h4 className="font-serif font-bold text-base md:text-lg text-[#2d3431] truncate mt-1">
                  {nextUpcomingClassData.slot.subject}
                </h4>
                <p className="text-xs text-[#6a7a6a] font-medium flex items-center gap-2">
                  <span>Room {nextUpcomingClassData.slot.room}</span>
                  <span>•</span>
                  <span>{nextUpcomingClassData.slot.time} (Today)</span>
                </p>
              </div>

              <div className="relative z-10 bg-white border border-[#f5e1da] px-4 py-2.5 rounded-xl text-center shrink-0 w-full sm:w-auto lg:w-full">
                <div className="text-[10px] uppercase font-bold text-[#6a7a6a] tracking-wider">Time Remaining</div>
                <div className="text-lg font-extrabold text-[#b45239] font-mono tracking-tight mt-0.5">
                  {nextUpcomingClassData.diff} {nextUpcomingClassData.diff === 1 ? "minute" : "minutes"}
                </div>
                {nextUpcomingClassData.diff <= config.minutesBefore && (
                  <p className="text-[9px] text-[#b45239] mt-1 font-bold animate-pulse">
                    Alert triggers soon at target time threshold
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white text-[#6a7a6a] rounded-2xl p-4.5 shadow-xs border border-[#e1e5db] flex items-center gap-3 relative overflow-hidden">
              <Info className="text-[#8ba888] shrink-0" size={24} />
              <div>
                <p className="text-xs font-bold text-[#334139]">No active classes remaining today</p>
                <p className="text-[11px] text-[#6a7a6a] mt-0.5">Add classes for {resolvedDayName} or swap simulated day to preview reminders.</p>
              </div>
            </div>
          )}

          {/* STATISTICS OVERVIEW */}
          <section className="bg-white rounded-2xl border border-[#e1e5db] p-4.5 shadow-2xs">
            <h3 className="font-serif font-bold text-[#2d3431] text-sm flex items-center gap-2 mb-3.5">
              <TrendingUp size={16} className="text-[#8ba888]" />
              Overview Statistics
            </h3>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-[#f2f4ef] p-2.5 rounded-xl border border-[#e1e5db] text-center">
                <div className="text-[10px] text-[#6a7a6a] font-bold uppercase tracking-wider mb-0.5">Total Slots</div>
                <span className="text-xl font-bold text-[#2d3431] font-mono">{totalSlotsCount}</span>
              </div>
              <div className="bg-[#f2f4ef] p-2.5 rounded-xl border border-[#e1e5db] text-center">
                <div className="text-[10px] text-[#6a7a6a] font-bold uppercase tracking-wider mb-0.5">Monitored</div>
                <span className="text-xl font-bold text-[#8ba888] font-mono">{enabledSlotsCount}</span>
              </div>
              <div className="bg-[#f2f4ef] p-2.5 rounded-xl border border-[#e1e5db] text-center">
                <div className="text-[10px] text-[#6a7a6a] font-bold uppercase tracking-wider mb-0.5">Active Days</div>
                <span className="text-xl font-bold text-[#2d3431] font-mono">{daysRepresentedCount}</span>
              </div>
            </div>
          </section>

          {/* ADD CLASS CLASSROOM SCHEDULE SLOTS */}
          <section className="bg-white rounded-2xl border border-[#e1e5db] p-5 shadow-2xs space-y-4">
            <div className="flex justify-between items-center border-b border-[#e1e5db] pb-3">
              <h2 className="font-serif font-bold text-[#2d3431] text-lg flex items-center gap-2" id="add-class-form-title">
                <PlusCircle size={18} className="text-[#8ba888] shrink-0" />
                Add New Class
              </h2>
              <span className="text-[10px] text-[#6a7a6a] font-mono uppercase font-bold tracking-wider">Timetable setup</span>
            </div>

            <form onSubmit={addClass} className="space-y-4">
              
              {/* Subject suggestion presets selector */}
              <div>
                <label className="block text-xs font-bold text-[#6a7a6a] uppercase tracking-wide mb-1">
                  Subject Name
                </label>
                <input
                  id="form-subject"
                  type="text"
                  required
                  placeholder="e.g. Advanced Calculus, Physics"
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#d1d9cf] text-[#334139] bg-white focus:outline-hidden focus:ring-2 focus:ring-[#8ba888] focus:border-[#8ba888] transition-all text-sm font-medium placeholder-[#c1c9bf]"
                />

                {/* Preset chips for fast populating */}
                <div className="mt-2 text-xs">
                  <span className="text-[10px] text-[#6a7a6a] font-bold block mb-1">Quick Suggestions:</span>
                  <div className="flex flex-wrap gap-1 max-h-[58px] overflow-y-auto pr-1">
                    {PRESET_SUBJECTS.map((sub, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => loadPreset(sub)}
                        className={`text-[10px] font-medium px-2 py-0.5 rounded-md hover:bg-[#e8f0e6] hover:text-[#2d3431] transition-colors border cursor-pointer ${
                          form.subject === sub
                            ? "bg-[#e8f0e6] text-[#2d3431] border-[#8ba888] font-bold"
                            : "bg-[#f2f4ef] text-[#6a7a6a] border-[#e1e5db]"
                        }`}
                      >
                        {sub}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Day, Section & Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#6a7a6a] uppercase tracking-wide mb-1">
                    Day of Week
                  </label>
                  <select
                    id="form-day"
                    value={form.day}
                    onChange={(e) => setForm({ ...form, day: e.target.value as DaysOfWeek })}
                    className="w-full px-3 py-2.5 rounded-xl border border-[#d1d9cf] bg-white text-[#2d3431] focus:outline-hidden focus:ring-2 focus:ring-[#8ba888] focus:border-[#8ba888] transition-all text-sm font-medium cursor-pointer"
                  >
                    {DAYS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#6a7a6a] uppercase tracking-wide mb-1">
                    Starting Time
                  </label>
                  <input
                    id="form-time"
                    type="time"
                    required
                    value={form.time}
                    onChange={(e) => setForm({ ...form, time: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-[#d1d9cf] bg-white text-[#2d3431] focus:outline-hidden focus:ring-2 focus:ring-[#8ba888] focus:border-[#8ba888] transition-all text-sm font-medium font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#6a7a6a] uppercase tracking-wide mb-1">
                    Class Group / Section
                  </label>
                  <input
                    id="form-section"
                    type="text"
                    required
                    placeholder="e.g. Grade 10-A"
                    value={form.section}
                    onChange={(e) => setForm({ ...form, section: e.target.value })}
                    className="w-full px-3 py-2 bg-white rounded-xl border border-[#d1d9cf] text-[#2d3431] focus:ring-2 focus:ring-[#8ba888] focus:border-[#8ba888] transition-all text-sm outline-hidden font-medium placeholder-[#c1c9bf]"
                    list="preset-sections"
                  />
                  <datalist id="preset-sections">
                    {PRESET_SECTIONS.map((sec) => (
                      <option key={sec} value={sec} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#6a7a6a] uppercase tracking-wide mb-1">
                    Room / Hall
                  </label>
                  <input
                    id="form-room"
                    type="text"
                    required
                    placeholder="e.g. IT Lab B, 404"
                    value={form.room}
                    onChange={(e) => setForm({ ...form, room: e.target.value })}
                    className="w-full px-3 py-2 bg-white rounded-xl border border-[#d1d9cf] text-[#2d3431] focus:ring-2 focus:ring-[#8ba888] focus:border-[#8ba888] transition-all text-sm outline-hidden font-medium placeholder-[#c1c9bf]"
                  />
                </div>
              </div>

              {/* Color Stripe Picker */}
              <div>
                <label className="block text-xs font-bold text-[#6a7a6a] uppercase tracking-wide mb-1.5">
                  Category Color Code Accent
                </label>
                <div className="flex items-center gap-2">
                  {ACCENT_COLORS.map((col) => (
                    <button
                      id={`color-preset-${col.id}`}
                      key={col.id}
                      type="button"
                      onClick={() => setForm({ ...form, color: col.id })}
                      className={`w-6.5 h-6.5 rounded-full ${col.bgClass} flex items-center justify-center transition-all duration-150 relative cursor-pointer ring-offset-2 ${
                        form.color === col.id ? "ring-2 ring-[#2d3431] scale-110" : "opacity-80 hover:scale-105"
                      }`}
                      title={col.label}
                    >
                      {form.color === col.id && (
                        <span className="w-1.5 h-1.5 bg-white rounded-full" />
                      )}
                    </button>
                  ))}
                  <span className="text-[11px] font-medium text-[#6a7a6a] capitalize ml-1 italic">
                    {ACCENT_COLORS.find(c => c.id === form.color)?.label}
                  </span>
                </div>
              </div>

              {/* Extra notes */}
              <div>
                <label className="block text-xs font-bold text-[#6a7a6a] uppercase tracking-wide mb-1">
                  Optional reminder detail/notes
                </label>
                <input
                  id="form-notes"
                  type="text"
                  placeholder="e.g. Bring lab equipment handouts"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full px-3 py-2 cursor-text bg-white rounded-xl border border-[#d1d9cf] text-[#2d3431] focus:ring-2 focus:ring-[#8ba888] focus:border-[#8ba888] transition-all text-sm outline-hidden placeholder-[#c1c9bf]"
                />
              </div>

              {/* Action buttons */}
              <button
                id="btn-save-class"
                type="submit"
                className="w-full bg-[#8ba888] hover:bg-[#7a9677] text-white font-semibold py-2.5 rounded-xl shadow-xs hover:shadow-md transition-all flex items-center justify-center gap-2 border border-transparent active:scale-[0.98] cursor-pointer font-serif"
              >
                <Plus size={16} /> Save Class Slot
              </button>
            </form>
          </section>

          {/* SANDBOX SYSTEM TESTING PANEL */}
          <section className="bg-[#2d3431] text-[#f2f4ef] rounded-2xl p-5 shadow-md border border-[#3c4642] space-y-4">
            <div className="flex justify-between items-center border-[#3c4642] border-b pb-3">
              <h3 className="font-serif font-bold text-[#f2f4ef] text-sm flex items-center gap-1.5">
                <Sliders size={15} className="text-[#8ba888] shrink-0" />
                Alarm Simulation Sandbox
              </h3>
              <span className="bg-[#3c4642] px-2 py-0.5 rounded text-[9px] font-bold text-[#e8f0e6] uppercase tracking-wider font-mono border border-[#48544f]">
                TEST REMINDERS
              </span>
            </div>

            <p className="text-xs text-[#c1c9bf]">
              Classes require matching day and relative times. Use these tools to mock simulation target dates or trigger instantaneous alarm chimes to inspect the visuals!
            </p>

            <div className="space-y-3 pt-1 text-xs">
              
              {/* Trigger Sandbox Simulation switch */}
              <div className="flex justify-between items-center bg-[#3c4642]/60 p-3 rounded-xl border border-[#48544f]">
                <div>
                  <span className="font-bold text-[#f2f4ef] block text-xs">Simulation Mode Override</span>
                  <span className="text-[10px] text-[#c1c9bf]">Accelerate clock for testing</span>
                </div>
                <button
                  id="btn-toggle-sandbox"
                  onClick={() => {
                    playClickTone();
                    setIsSimulated(!isSimulated);
                    setSimDate(new Date());
                    addLog(`Simulation mode turned ${!isSimulated ? "ON" : "OFF"}.`, "info");
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                    isSimulated ? "bg-[#8ba888] text-white" : "bg-[#2d3431] text-[#c1c9bf] border border-[#3c4642]"
                  }`}
                >
                  {isSimulated ? "Active" : "Disabled"}
                </button>
              </div>

              {/* Set Simulation day & custom time sliders if simulated */}
              {isSimulated && (
                <div className="space-y-3 bg-[#3c4642]/30 p-3 rounded-xl border border-[#48544f]/40 transition-all duration-300">
                  <div>
                    <label className="block text-[10px] text-[#c1c9bf] font-mono uppercase font-bold mb-1">Set Simulated Day</label>
                    <select
                      id="select-simulated-day"
                      value={resolvedDayName}
                      onChange={(e) => {
                        const targetDay = e.target.value as DaysOfWeek;
                        const targetIndex = DAYS.indexOf(targetDay);
                        const currentDayIndex = simDate.getDay();
                        const diffDays = targetIndex - currentDayIndex;
                        const updatedDate = new Date(simDate);
                        updatedDate.setDate(simDate.getDate() + diffDays);
                        setSimDate(updatedDate);
                        addLog(`Set simulated day to ${targetDay}.`, "success");
                      }}
                      className="w-full bg-[#2d3431] border border-[#3c4642] rounded-lg p-1.5 text-[#f2f4ef] outline-hidden text-xs cursor-pointer"
                    >
                      {DAYS.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-[10px] text-[#c1c9bf] font-mono uppercase font-bold">Fast-Forward Simulated Time</label>
                      <span className="font-mono font-bold text-[#8ba888]">{resolvedTimeString}</span>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => {
                          setSimDate(new Date(simDate.getTime() + 10 * 60000));
                          addLog("Sprinted simulated clock forward 10 minutes.", "info");
                        }}
                        className="bg-[#3c4642] hover:bg-[#48544f] text-[#f2f4ef] flex-1 py-1 rounded text-[10px] text-center border border-[#48544f] cursor-pointer font-bold"
                      >
                        +10 Mins
                      </button>
                      <button
                        onClick={() => {
                          setSimDate(new Date(simDate.getTime() + 30 * 60000));
                          addLog("Sprinted simulated clock forward 30 minutes.", "info");
                        }}
                        className="bg-[#3c4642] hover:bg-[#48544f] text-[#f2f4ef] flex-1 py-1 rounded text-[10px] text-center border border-[#48544f] cursor-pointer font-bold"
                      >
                        +30 Mins
                      </button>
                      <button
                        onClick={() => {
                          setSimDate(new Date(simDate.getTime() + 60 * 60000));
                          addLog("Sprinted simulated clock forward 1 hour.", "info");
                        }}
                        className="bg-[#3c4642] hover:bg-[#48544f] text-[#f2f4ef] flex-1 py-1 rounded text-[10px] text-center border border-[#48544f] cursor-pointer font-bold"
                      >
                        +1 Hour
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Instant Test Alert */}
              <div className="flex gap-2">
                <button
                  id="btn-test-alert"
                  type="button"
                  onClick={triggerTestSimulation}
                  className="flex-1 bg-[#3c4642] hover:bg-[#48544f] text-[#f2f4ef] border border-[#3c4642] font-bold py-2 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 active:scale-[0.98] cursor-pointer"
                >
                  <Play size={12} className="text-[#8ba888]" /> Simulate Alert Now
                </button>
              </div>

            </div>
          </section>

        </div>

        {/* Right Column: Classes Schedules List with day-tabs, filter buttons, Settings (Lg: 8/12 width) */}
        <div className="lg:col-span-8 space-y-6">

          {/* ACTIVE IN-APP MODAL OVERLAY ALERT (FALLBACK FOR IFRAME INHIBITIONS) */}
          {activeAlertClass && (
            <div className="bg-[#fdf5f2] border-2 border-[#b45239] rounded-2xl p-5 shadow-sm flex items-start gap-4 transition-all animate-bounce relative overflow-hidden" id="in-app-alert-modal">
              {/* Animation chime visuals */}
              <div className="absolute right-3 top-3 w-1.5 h-1.5 rounded-full bg-[#b45239] animate-ping inline-block" />
              <div className="bg-[#b45239] text-white rounded-xl p-3 shrink-0 animate-pulse">
                <Bell size={24} className="animate-spin" />
              </div>
              <div className="flex-1 space-y-1 pr-4">
                <div className="text-[#b45239] font-bold text-xs uppercase tracking-widest flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#b45239] animate-ping" />
                  Upcoming Class Starts Soon!
                </div>
                <h4 className="font-serif font-bold text-[#2d3431] text-lg">
                  {activeAlertClass.subject}
                </h4>
                <p className="text-sm text-[#334139] font-medium">
                  Section <strong className="text-[#2d3431] font-bold">{activeAlertClass.section}</strong> is scheduled in <strong className="text-[#2d3431] font-bold">Room {activeAlertClass.room}</strong> at <strong className="text-[#2d3431] font-bold">{activeAlertClass.time}</strong> today.
                </p>
                {activeAlertClass.notes && (
                  <p className="text-xs text-[#6a7a6a] bg-white/75 rounded-lg p-2.5 mt-2 border border-[#f5e1da] italic font-medium">
                    Notes: {activeAlertClass.notes}
                  </p>
                )}
                <div className="flex items-center gap-2 pt-2.5">
                  <button
                    onClick={() => {
                      playChimeTone();
                      addLog(`Re-played chime tone for ${activeAlertClass.subject}`, "info");
                    }}
                    className="bg-white hover:bg-[#f2f4ef] text-[#334139] text-xs px-3 py-1.5 rounded-lg border border-[#e1e5db] font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Volume2 size={13} className="text-[#8ba888]" /> Listen Chime Again
                  </button>
                  <button
                    onClick={() => {
                      setActiveAlertClass(null);
                      playClickTone();
                    }}
                    className="bg-[#2d3431] hover:bg-[#334139] text-white text-xs px-4 py-1.5 rounded-lg font-bold cursor-pointer transition-colors"
                  >
                    Dismiss Reminder
                  </button>
                </div>
              </div>
              <button
                onClick={() => {
                  setActiveAlertClass(null);
                  playClickTone();
                }}
                className="absolute right-4 top-4 hover:bg-[#f5e1da] hover:text-[#2d3431] p-1 text-[#a0a095] rounded-lg transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          )}

          {/* ALERTS SETUP & PREFERENCES CONFIGURATION PANEL */}
          <section className="bg-white rounded-2xl border border-[#e1e5db] p-5 shadow-2xs space-y-4">
            <div className="flex justify-between items-center border-b border-[#e1e5db] pb-3">
              <h3 className="font-serif font-bold text-[#2d3431] text-[15px] flex items-center gap-2">
                <Settings size={16} className="text-[#8ba888] shrink-0" />
                Alert Configuration
              </h3>
              <span className="text-[10px] text-[#6a7a6a] font-mono uppercase font-bold tracking-wider">User Settings</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4.5">
              
              {/* Trigger minutes choosing */}
              <div className="flex flex-col justify-between bg-[#f2f4ef] border border-[#e1e5db] rounded-xl p-3.5 space-y-2">
                <div>
                  <span className="text-xs font-bold text-[#334139] block select-none">Alert Notification Buffer</span>
                  <p className="text-[10px] text-[#6a7a6a] mt-0.5 leading-tight">Minutes in advance to trigger chimes & alarms</p>
                </div>
                <div className="flex gap-1.5 pt-1.5">
                  {[5, 10, 15, 30].map((mins) => (
                    <button
                      key={mins}
                      onClick={() => {
                        playClickTone();
                        setConfig((prev) => ({ ...prev, minutesBefore: mins }));
                        addLog(`Alert buffer altered to ${mins} minutes before classes.`, "info");
                      }}
                      className={`text-[11px] font-bold py-1 px-2.5 rounded-lg transition-all border flex-1 text-center cursor-pointer ${
                        config.minutesBefore === mins
                          ? "bg-[#8ba888] text-white border-[#8ba888] font-extrabold"
                          : "bg-white text-[#6a7a6a] border-[#e1e5db] hover:bg-[#f2f4ef]"
                      }`}
                    >
                      {mins}m
                    </button>
                  ))}
                </div>
              </div>

              {/* Notification & Sounds toggles */}
              <div className="bg-[#f2f4ef] border border-[#e1e5db] rounded-xl p-3.5 space-y-2.5">
                <span className="text-xs font-bold text-[#334139] block">Sound alerts & bells</span>
                <div className="flex justify-between items-center text-xs pt-1">
                  <div className="flex items-center gap-1.5 font-medium text-[#6a7a6a]">
                    {config.enableAudio ? <Volume2 size={14} className="text-[#8ba888]" /> : <VolumeX size={14} className="text-[#6a7a6a]" />}
                    <span>Chime Synthesizer</span>
                  </div>
                  <button
                    onClick={() => {
                      playClickTone();
                      setConfig((prev) => ({ ...prev, enableAudio: !config.enableAudio }));
                      addLog(`Sound alarms toggled ${!config.enableAudio ? "ON" : "OFF"}.`, "info");
                    }}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer uppercase ${
                      config.enableAudio ? "bg-[#e8f0e6] text-[#5a7a5a] border border-[#d8e3d7]" : "bg-[#e1e5db] text-[#6a7a6a]"
                    }`}
                  >
                    {config.enableAudio ? "ON" : "OFF"}
                  </button>
                </div>
                {config.enableAudio && (
                  <button
                    onClick={() => {
                      playChimeTone();
                    }}
                    className="w-full text-left text-[10px] font-bold text-[#8ba888] hover:text-[#7a9677] flex items-center gap-1 mt-1 shrink-0 cursor-pointer"
                  >
                    🔔 Press here to test chime sound
                  </button>
                )}
              </div>

              {/* Permission controller */}
              <div className="bg-[#f2f4ef] border border-[#e1e5db] rounded-xl p-3.5 flex flex-col justify-between space-y-1.5">
                <div>
                  <span className="text-xs font-bold text-[#334139] block">External Web Notifications</span>
                  <div className="flex gap-1.5 items-center mt-1 text-[11px]">
                    <span className="text-[#6a7a6a]">Status:</span>
                    <span className={`font-semibold capitalize px-1.5 py-0.2 rounded font-mono text-[10px] ${
                      browserNotificationPermission === "granted"
                        ? "bg-[#edf5ec] text-[#5a7a5a] border border-[#d8e3d7]"
                        : browserNotificationPermission === "denied"
                        ? "bg-[#fdf5f2] text-[#b45239] border border-[#f5e1da]"
                        : "bg-[#fdf3e7] text-[#b45239] border border-amber-200"
                    }`}>
                      {browserNotificationPermission}
                    </span>
                  </div>
                </div>

                <div className="pt-2">
                  {browserNotificationPermission !== "granted" ? (
                    <button
                      type="button"
                      onClick={requestWebNotificationPermission}
                      className="w-full bg-[#2d3431] text-[#f2f4ef] hover:bg-[#334139] text-[10px] font-bold py-1.5 px-2 rounded-lg cursor-pointer transition-colors"
                    >
                      Request permission
                    </button>
                  ) : (
                    <div className="flex justify-between items-center text-xs pt-1 leading-none">
                      <span className="text-[10px] font-bold text-[#6a7a6a]">System banners:</span>
                      <button
                        onClick={() => {
                          playClickTone();
                          setConfig((prev) => ({ ...prev, enableWebNotification: !config.enableWebNotification }));
                          addLog(`Web banners toggled ${!config.enableWebNotification ? "ON" : "OFF"}.`, "info");
                        }}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase cursor-pointer ${
                          config.enableWebNotification ? "bg-[#e8f0e6] text-[#5a7a5a] border border-[#d8e3d7]" : "bg-[#e1e5db] text-[#6a7a6a]"
                        }`}
                      >
                        {config.enableWebNotification ? "ON" : "OFF"}
                      </button>
                    </div>
                  )}
                </div>
              </div>

            </div>
          </section>

          {/* WEEKLY TIMETABLE SCHEDULES DASHBOARD */}
          <section className="bg-white rounded-2xl border border-[#e1e5db] p-5 shadow-2xs space-y-5">
            
            {/* Header with selector switches */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-[#e1e5db] pb-4">
              <div>
                <h3 className="font-serif font-bold text-[#2d3431] text-[17px] flex items-center gap-2">
                  <CalendarDays size={18} className="text-[#8ba888]" />
                  Your Classroom Schedule List
                </h3>
                <p className="text-xs text-[#6a7a6a] mt-0.5 animate-fade-in">Toggle days or view all weekly classes</p>
              </div>

              {/* Reset demo items if custom table empty */}
              {classes.length === 0 && (
                <button
                  onClick={reloadDemoSchedules}
                  className="text-xs bg-[#f2f4ef] hover:bg-[#e8f0e6] text-[#5a7a5a] font-bold px-3 py-1.5 rounded-lg border border-[#e1e5db] flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Sparkles size={13} /> Populate Demo Schedule
                </button>
              )}
            </div>

            {/* Daily calendar visual quick filter tabs */}
            <div className="flex flex-wrap gap-1 border-[#e1e5db] border-b pb-3 -mt-2">
              {[
                { id: "Today", label: "Today 📅" },
                { id: "All", label: "All Weeks 🗓️" },
                { id: "Monday", label: "Mon" },
                { id: "Tuesday", label: "Tue" },
                { id: "Wednesday", label: "Wed" },
                { id: "Thursday", label: "Thu" },
                { id: "Friday", label: "Fri" },
                { id: "Saturday", label: "Sat" },
                { id: "Sunday", label: "Sun" },
              ].map((tab) => {
                const isSelected = activeTab === tab.id;
                
                // Color highlight filter tabs containing classes
                const countOfClassesOnTab =
                  tab.id === "Today"
                    ? classes.filter((c) => c.day === resolvedDayName).length
                    : tab.id === "All"
                    ? classes.length
                    : classes.filter((c) => c.day === tab.id).length;

                return (
                  <button
                    id={`tab-select-${tab.id.toLowerCase()}`}
                    key={tab.id}
                    onClick={() => {
                      playClickTone();
                      setActiveTab(tab.id);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all relative cursor-pointer flex items-center gap-1.5 ${
                      isSelected
                        ? "bg-[#8ba888] text-white shadow-2xs font-extrabold"
                        : "bg-[#f2f4ef] hover:bg-[#e8f0e6] text-[#6a7a6a] border border-[#e1e5db]/40"
                    }`}
                  >
                    <span>{tab.label}</span>
                    {countOfClassesOnTab > 0 && (
                      <span className={`text-[9px] w-4.5 h-4.5 rounded-full flex items-center justify-center font-extrabold ${
                        isSelected ? "bg-white text-[#2d3431]" : "bg-[#e1e5db] text-[#5a7a5a]"
                      }`}>
                        {countOfClassesOnTab}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* CLASS CARDS CONTAINER */}
            <div className="space-y-4">
              {filteredClasses.length === 0 ? (
                <div className="text-center py-12 bg-[#fafaf7] rounded-2xl border border-[#e1e5db] p-6 flex flex-col justify-center items-center">
                  <div className="w-12 h-12 rounded-full bg-[#f2f4ef] flex items-center justify-center mb-3">
                    <Calendar className="text-[#8ba888]" size={20} />
                  </div>
                  <h4 className="font-serif font-bold text-[#334139]">No classes found</h4>
                  <p className="text-xs text-[#6a7a6a] max-w-sm mt-1 mb-1">
                    {activeTab === "Today"
                      ? `You don't have any classes scheduled for today (${resolvedDayName}). Select "All Weeks" or add a new schedule slot!`
                      : `No classes scheduled for ${activeTab}. Use the left side form to add some.`}
                  </p>
                  
                  {activeTab === "Today" && classes.length > 0 && (
                    <button
                      onClick={() => setActiveTab("All")}
                      className="mt-4 text-xs font-semibold bg-white border border-[#e1e5db] text-[#8ba888] px-4 py-1.5 rounded-lg hover:bg-[#f2f4ef] transition-colors cursor-pointer font-serif"
                    >
                      View All Scheduled Classes ({classes.length})
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredClasses.map((schedule) => {
                    const isToday = schedule.day === resolvedDayName;
                    
                    // Check if starting countdown
                    const [h, m] = schedule.time.split(":").map(Number);
                    const scheduleMinutes = h * 60 + m;
                    const todayMinutes = resolvedDate.getHours() * 60 + resolvedDate.getMinutes();
                    const timeLeft = scheduleMinutes - todayMinutes;
                    const isUpcomingSoon = isToday && timeLeft > 0 && timeLeft <= config.minutesBefore;

                    const countdownText = isUpcomingSoon
                      ? `starts in ${timeLeft}m`
                      : false;

                    return (
                      <ClassCard
                        key={schedule.id}
                        schedule={schedule}
                        onDelete={deleteClass}
                        onToggleEnabled={toggleClassReminder}
                        isToday={isToday}
                        isUpcomingSoon={isUpcomingSoon}
                        countdownText={countdownText || undefined}
                      />
                    );
                  })}
                </div>
              )}
            </div>

            {/* Quick Helper Tips */}
            <div className="bg-[#edf5ec]/35 hover:bg-[#edf5ec]/60 transition-colors border border-[#d8e3d7] rounded-xl p-4 flex gap-3 text-xs text-[#5a6a5a]">
              <Sparkles className="text-[#8ba888] shrink-0 mt-0.5" size={16} />
              <div>
                <span className="font-serif font-bold text-[#2d3431] block">Academic Care Assistant Tip:</span>
                Keep your system sound unmuted and this dashboard active in the background to receive synthesized chime alerts exactly {config.minutesBefore} minutes before each classes starts. Perfectly suited for lesson pacing at Hill Academic Care!
              </div>
            </div>
          </section>

          {/* TELEMETRY LOG MESSAGES FEED */}
          <section className="bg-[#2d3431] text-[#f2f4ef] rounded-2xl p-4 shadow-xs border border-[#3c4642]">
            <div className="flex justify-between items-center border-[#3c4642] border-b pb-2 mb-3.5 text-xs text-[#c1c9bf] font-mono">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#8ba888] inline-block shrink-0 animate-pulse" />
                Notification Alerts Monitor Log
              </span>
              <span>Workspace Console</span>
            </div>
            
            <div className="font-mono text-[11px] max-h-36 overflow-y-auto space-y-1.5 pr-1 divide-[#3c4642] divide-y">
              {logs.length === 0 && <p className="text-[#6a7a6a] py-2 italic text-center">No terminal logs generated yet.</p>}
              {logs.map((log) => (
                <div key={log.id} className="pt-1.5 flex gap-2 items-start text-xs font-semibold font-mono leading-normal">
                  <span className="text-[#8ba888]/80 font-normal shrink-0">[{log.time}]</span>
                  <span className={`flex-1 text-[11px] font-normal ${
                    log.type === "success" ? "text-[#8ba888]" : log.type === "warning" ? "text-[#b45239] font-medium" : "text-[#c1c9bf]"
                  }`}>
                    {log.text}
                  </span>
                </div>
              ))}
            </div>
          </section>

        </div>

      </main>
    </div>
  );
}
