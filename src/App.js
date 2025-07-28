import { useState, useEffect } from "react";
import "./App.css";

export default function App() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [time, setTime] = useState("");
  const [frequency, setFrequency] = useState("Once");
  const [appError, setAppError] = useState(null);

  // Reminders with localStorage persistence
  const [reminders, setReminders] = useState(() => {
    const stored = localStorage.getItem("reminders");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        return parsed.map(rem => ({
          ...rem,
          date: new Date(rem.date),
          reminderTime: rem.reminderTime ? new Date(rem.reminderTime) : null
        }));
      } catch (e) {
        console.error("Failed to parse reminders from localStorage", e);
        return [];
      }
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem("reminders", JSON.stringify(reminders));
  }, [reminders]);

  // Helper: Format time to 12-hour format
  const formatTo12Hour = (time24) => {
    if (!time24 || !time24.includes(":")) return time24;
    const [hourStr, minute] = time24.split(":");
    let hour = parseInt(hourStr, 10);
    const suffix = hour >= 12 ? "PM" : "AM";
    hour = hour % 12 || 12;
    return `${hour}:${minute} ${suffix}`;
  };

  // Request Notification permission
  useEffect(() => {
    if ("Notification" in window) {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  // Set default time for form
  useEffect(() => {
    const now = new Date();
    now.setHours(now.getHours() + 1, 0, 0, 0);
    const defaultTime = `${String(now.getHours()).padStart(2, '0')}:00`;
    setTime(defaultTime);
  }, [showForm]);

  // Register Service Worker
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register(process.env.PUBLIC_URL + "/sw.js")
        .then(() => console.log("Service Worker registered."))
        .catch(err => console.error("Service Worker registration failed:", err));
    }
  }, []);

  // Calendar logic
  const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
  const daysInMonth = endOfMonth.getDate();
  const startDay = startOfMonth.getDay();

  const daysArray = [];
  for (let i = 0; i < startDay; i++) daysArray.push(null);
  for (let i = 1; i <= daysInMonth; i++) daysArray.push(i);

  const changeMonth = (offset) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1));
  };

  const selectDay = (day) => {
    if (!day) return;
    setSelectedDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), day));
  };

  // Reminder actions
  const addReminder = () => {
    if (!title.trim()) return;
    const reminderTime = new Date(selectedDate);
    const [hours, minutes] = time.split(":");
    reminderTime.setHours(hours, minutes, 0, 0);
    setReminders([...reminders, { 
      date: selectedDate, 
      title, 
      description, 
      time, 
      frequency, 
      reminderTime, 
      done: false, 
      overdueOffset: 0,
      lastCheckTime: null
    }]);
    setShowForm(false);
    setTitle("");
    setDescription("");
    setFrequency("Once");
  };

  const deleteReminder = (index) => {
    setReminders(reminders.filter((_, i) => i !== index));
  };

  const toggleDone = (index) => {
    const updated = [...reminders];
    const rem = updated[index];
    const now = new Date();
    if (!rem.done) {
      rem.overdueOffset = Math.max(0, Math.floor((now - new Date(rem.reminderTime)) / 60000));
      rem.lastCheckTime = now;
    } else {
      if (rem.lastCheckTime) {
        rem.overdueOffset += Math.floor((now - rem.lastCheckTime) / 60000);
      }
      rem.lastCheckTime = null;
    }
    rem.done = !rem.done;
    setReminders(updated);
  };

  // Notification helpers
  const getIntervalMs = (freq) => {
    switch (freq) {
      case "Every minute": return 60000;
      case "Every 5 minutes": return 5 * 60000;
      case "Every 30 minutes": return 30 * 60000;
      case "Every hour": return 60 * 60000;
      case "Every day": return 24 * 60 * 60000;
      default: return 0;
    }
  };

  const showNotification = (reminder) => {
    try {
      if (Notification.permission === "granted") {
        new Notification(reminder.title, {
          body: `${reminder.title} at ${formatTo12Hour(reminder.time)}`,
        });
      }
    } catch (err) {
      console.error("Notification error:", err);
    }
  };

  useEffect(() => {
    const timers = [];
    reminders.forEach((reminder) => {
      if (!reminder.reminderTime) return;
      const delay = new Date(reminder.reminderTime).getTime() - Date.now();
      if (delay >= 0) {
        const startTimer = setTimeout(() => {
          showNotification(reminder);
          const interval = getIntervalMs(reminder.frequency);
          if (interval > 0) {
            const repeatTimer = setInterval(() => showNotification(reminder), interval);
            timers.push(repeatTimer);
          }
        }, delay);
        timers.push(startTimer);
      }
    });
    return () => timers.forEach(timer => clearTimeout(timer));
  }, [reminders]);

  // Display overdue info
  const getOverdueMinutes = (reminder) => {
    if (!reminder.reminderTime) return reminder.title;
    const now = new Date();
    let overdue = reminder.overdueOffset;
    if (!reminder.done) {
      overdue = Math.max(0, Math.floor((now - new Date(reminder.reminderTime)) / 60000));
    } else if (reminder.lastCheckTime) {
      overdue = Math.floor((reminder.lastCheckTime - new Date(reminder.reminderTime)) / 60000);
    }
    const formattedTime = formatTo12Hour(reminder.time);
    return overdue > 0 ? `${reminder.title} ${formattedTime} ${overdue} minutes overdue` : `${reminder.title} ${formattedTime}`;
  };

  try {
    return (
      <div className="app-container">
        <header className="top-bar">
          <h1 className="app-title">Reminders</h1>
          <div className="badge">{reminders.length}</div>
        </header>
        <div className="calendar-container small-calendar">
          <div className="calendar-header">
            <button className="month-nav" onClick={() => changeMonth(-1)}>&lt;</button>
            <h2 className="month-label">
              {currentDate.toLocaleString('default', { month: 'long' })} {currentDate.getFullYear()}
            </h2>
            <button className="month-nav" onClick={() => changeMonth(1)}>&gt;</button>
          </div>
          <div className="calendar-grid">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div key={d} className="calendar-day-name">{d}</div>
            ))}
            {daysArray.map((day, idx) => (
              <div 
                key={idx} 
                className={`calendar-day ${day === selectedDate.getDate() && currentDate.getMonth() === selectedDate.getMonth() ? 'selected-day' : ''}`}
                onClick={() => selectDay(day)}
              >
                {day || ''}
              </div>
            ))}
          </div>
        </div>
        <div className="reminder-section">
          <h2 className="selected-date">{selectedDate.toDateString()}</h2>
          {reminders.filter(r => r.date.toDateString() === selectedDate.toDateString()).length === 0 ? (
            <p className="no-reminders">No reminders for this date<br/>Tap the + button to create one</p>
          ) : (
            reminders.filter(r => r.date.toDateString() === selectedDate.toDateString()).map((rem, i) => (
              <div key={i} className={`reminder-card ${rem.done ? 'done' : ''}`}>
                <div>
                  <h3>{rem.title}</h3>
                  <p>{rem.description}</p>
                  <p>{getOverdueMinutes(rem)}</p>
                  <p>{rem.frequency}</p>
                </div>
                <div className="reminder-actions">
                  <button className="action-button" onClick={() => toggleDone(i)}>Check</button>
                  <button className="action-button" onClick={() => deleteReminder(i)}>Delete</button>
                </div>
              </div>
            ))
          )}
        </div>
        <button className="add-button" onClick={() => setShowForm(true)}>+</button>
        {showForm && (
          <div className="form-overlay">
            <div className="form-box">
              <h2>New Reminder</h2>
              <label>Title *</label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Enter reminder title" />
              <label>Description</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Enter description (optional)" />
              <label>Date</label>
              <input type="text" value={selectedDate.toDateString()} readOnly />
              <label>Time</label>
              <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
              <label>Notification Frequency</label>
              <select value={frequency} onChange={(e) => setFrequency(e.target.value)}>
                <option>Once</option>
                <option>Every minute</option>
                <option>Every 5 minutes</option>
                <option>Every 30 minutes</option>
                <option>Every hour</option>
                <option>Every day</option>
              </select>
              <button className="create-button" onClick={addReminder}>Create Reminder</button>
              <button className="cancel-button" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </div>
        )}
      </div>
    );
  } catch (error) {
    console.error("Render error:", error);
    setAppError(error.message);
    return <h1 style={{ color: "red" }}>Something went wrong: {error.message}</h1>;
  }
}
