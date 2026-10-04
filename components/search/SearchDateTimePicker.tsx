"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { toAssetUrl } from "@/lib/config";
import styles from "./searchDateTimePicker.module.css";

const DAY_NAMES = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"] as const;
const MINUTES = ["00", "15", "30", "45"] as const;
const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

/** Next 15-minute boundary from now (for “Today” quick pick). */
function nextQuarterHourFromNow(): { hour: string; minute: string } {
  const n = new Date();
  const mins = n.getHours() * 60 + n.getMinutes();
  let next = Math.ceil((mins + 1) / 15) * 15;
  if (next > 23 * 60 + 45) next = 23 * 60 + 45;
  const h = Math.floor(next / 60);
  const m = next % 60;
  return { hour: pad2(h), minute: pad2(m) };
}

function parseDateTimeValue(
  s: string,
): { date: Date; hour: string; minute: string } | null {
  if (!s?.trim()) return null;
  const m = s.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/,
  );
  if (!m) return null;
  const d = new Date(
    Number(m[1]),
    Number(m[2]) - 1,
    Number(m[3]),
  );
  if (Number.isNaN(d.getTime())) return null;
  return { date: d, hour: m[4], minute: m[5] };
}

function toValueString(d: Date, hour: string, minute: string) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${hour}:${minute}`;
}

function generateCalendar(anchor: Date) {
  const out: Date[] = [];
  const y = anchor.getFullYear();
  const mo = anchor.getMonth();
  const startOfMonth = new Date(y, mo, 1);
  const endOfMonth = new Date(y, mo + 1, 0);
  const startDay = startOfMonth.getDay();
  for (let i = startDay; i > 0; i--) {
    out.push(new Date(y, mo, 1 - i));
  }
  for (let i = 1; i <= endOfMonth.getDate(); i++) {
    out.push(new Date(y, mo, i));
  }
  const endDay = endOfMonth.getDay();
  for (let i = 1; i < 7 - endDay; i++) {
    out.push(new Date(y, mo + 1, i));
  }
  return out;
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getDate() === b.getDate() &&
    a.getMonth() === b.getMonth() &&
    a.getFullYear() === b.getFullYear()
  );
}

function isBeforeToday(d: Date) {
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c < t;
}

function isToday(d: Date) {
  const t = new Date();
  return isSameDay(d, t);
}

export type SearchDateTimePickerProps = {
  fieldKey: "dateFrom" | "dateTo";
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  mode: "start" | "end";
  /** Required when mode is `end` — full pickup `YYYY-MM-DDTHH:mm` */
  startDateTime: string;
  isOpen: boolean;
  onRequestOpen: () => void;
  onRequestClose: () => void;
};

export function SearchDateTimePicker({
  fieldKey,
  label,
  placeholder,
  value,
  onChange,
  mode,
  startDateTime,
  isOpen,
  onRequestOpen,
  onRequestClose,
}: SearchDateTimePickerProps) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [panelPos, setPanelPos] = useState({ top: 0, left: 0, width: 0 });

  const [panelError, setPanelError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState(() => {
    const t = new Date();
    return new Date(t.getFullYear(), t.getMonth(), 1);
  });
  const [endMonth, setEndMonth] = useState(() => {
    const t = new Date();
    return new Date(t.getFullYear(), t.getMonth(), 1);
  });

  const [selDate, setSelDate] = useState<Date | null>(null);
  const [selHour, setSelHour] = useState<string>("");
  const [selMinute, setSelMinute] = useState<string>("");

  const openedRef = useRef(false);

  useLayoutEffect(() => {
    if (!isOpen) return;
    const el = wrapRef.current;
    if (!el) return;
    const update = () => {
      const r = el.getBoundingClientRect();
      setPanelPos({
        top: r.bottom + 6,
        left: r.left,
        width: Math.max(r.width, 440),
      });
    };
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [isOpen]);

  const syncFromPropsOnOpen = useCallback(() => {
    const p = parseDateTimeValue(value);
    if (p) {
      setSelDate(new Date(p.date.getFullYear(), p.date.getMonth(), p.date.getDate()));
      setSelHour(p.hour);
      setSelMinute(p.minute);
      setCurrentMonth(
        new Date(p.date.getFullYear(), p.date.getMonth(), 1),
      );
      setEndMonth(new Date(p.date.getFullYear(), p.date.getMonth(), 1));
    } else {
      setSelDate(null);
      setSelHour("");
      setSelMinute("");
      const t = new Date();
      const m = new Date(t.getFullYear(), t.getMonth(), 1);
      setCurrentMonth(m);
      const pickup = parseDateTimeValue(
        mode === "end" ? startDateTime : "",
      );
      if (mode === "end" && pickup) {
        setEndMonth(
          new Date(
            pickup.date.getFullYear(),
            pickup.date.getMonth(),
            1,
          ),
        );
      } else {
        setEndMonth(m);
      }
    }
    setPanelError(null);
    setHint(null);
  }, [value, mode, startDateTime]);

  useEffect(() => {
    if (isOpen && !openedRef.current) {
      syncFromPropsOnOpen();
      openedRef.current = true;
    }
    if (!isOpen) {
      openedRef.current = false;
    }
  }, [isOpen, syncFromPropsOnOpen]);

  const calendarDates = useMemo(
    () => generateCalendar(currentMonth),
    [currentMonth],
  );
  const endCalendarDates = useMemo(
    () => generateCalendar(endMonth),
    [endMonth],
  );

  const startParts = useMemo(
    () => parseDateTimeValue(startDateTime),
    [startDateTime],
  );

  const canGoPrevMonth = useMemo(() => {
    const t = new Date();
    const minD = new Date(t.getFullYear(), t.getMonth(), 1);
    return currentMonth > minD;
  }, [currentMonth]);

  const canGoPrevEndMonth = useMemo(() => {
    if (!startParts) return false;
    const minD = new Date(
      startParts.date.getFullYear(),
      startParts.date.getMonth(),
      1,
    );
    return endMonth > minD;
  }, [endMonth, startParts]);

  const triggerDisplay = useMemo(() => {
    const fromSel =
      selDate && selHour && selMinute
        ? { d: selDate, hour: selHour, minute: selMinute }
        : null;
    const fromVal = (() => {
      if (fromSel) return null;
      const p = parseDateTimeValue(value);
      return p
        ? {
            d: new Date(
              p.date.getFullYear(),
              p.date.getMonth(),
              p.date.getDate(),
            ),
            hour: p.hour,
            minute: p.minute,
          }
        : null;
    })();
    const row = fromSel
      ? {
          d: new Date(
            fromSel.d.getFullYear(),
            fromSel.d.getMonth(),
            fromSel.d.getDate(),
          ),
          hour: fromSel.hour,
          minute: fromSel.minute,
        }
      : fromVal;
    if (!row) return null;
    return {
      dateLine: row.d.toLocaleDateString("en-GB", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
      }),
      timeLine: `${row.hour}:${row.minute}`,
    };
  }, [selDate, selHour, selMinute, value]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onRequestClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onRequestClose]);

  useEffect(() => {
    if (mode === "end" && parseDateTimeValue(startDateTime)) {
      setHint(null);
    }
  }, [mode, startDateTime]);

  const isPastTime = (hour: string, minute: string) => {
    if (mode !== "start" || !selDate || !isToday(selDate)) return false;
    const t = new Date(
      selDate.getFullYear(),
      selDate.getMonth(),
      selDate.getDate(),
      parseInt(hour, 10),
      parseInt(minute, 10),
    );
    return t < new Date();
  };

  const isPastEndTime = (hour: string, minute: string) => {
    if (mode !== "end" || !selDate) return false;

    if (isToday(selDate)) {
      const now = new Date();
      const selectedTime = new Date(
        selDate.getFullYear(),
        selDate.getMonth(),
        selDate.getDate(),
        parseInt(hour, 10),
        parseInt(minute, 10),
      );
      if (selectedTime < now) return true;
    }

    if (startParts && selDate) {
      const pPick = new Date(
        startParts.date.getFullYear(),
        startParts.date.getMonth(),
        startParts.date.getDate(),
        parseInt(startParts.hour, 10),
        parseInt(startParts.minute, 10),
      );
      const pDrop = new Date(
        selDate.getFullYear(),
        selDate.getMonth(),
        selDate.getDate(),
        parseInt(hour, 10),
        parseInt(minute, 10),
      );
      if (pDrop <= pPick) return true;
    }
    return false;
  };

  const isBeforePickupDate = (d: Date) => {
    if (mode !== "end" || !startParts) return false;
    const pick = new Date(
      startParts.date.getFullYear(),
      startParts.date.getMonth(),
      startParts.date.getDate(),
    );
    const check = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    return check < pick;
  };

  const isDropBeforePickup = () => {
    if (mode !== "end" || !startParts || !selDate || !selHour || !selMinute)
      return false;
    const pPick = new Date(
      startParts.date.getFullYear(),
      startParts.date.getMonth(),
      startParts.date.getDate(),
      parseInt(startParts.hour, 10),
      parseInt(startParts.minute, 10),
    );
    const pDrop = new Date(
      selDate.getFullYear(),
      selDate.getMonth(),
      selDate.getDate(),
      parseInt(selHour, 10),
      parseInt(selMinute, 10),
    );
    return pDrop <= pPick;
  };

  const handleToggle = () => {
    if (isOpen) {
      onRequestClose();
      return;
    }
    if (mode === "end" && !parseDateTimeValue(startDateTime)) {
      setHint("Select pickup date and time first.");
      return;
    }
    setHint(null);
    onRequestOpen();
  };

  const applyQuickStart = (dayOffset: number) => {
    const base = new Date();
    base.setHours(0, 0, 0, 0);
    base.setDate(base.getDate() + dayOffset);
    setSelDate(
      new Date(base.getFullYear(), base.getMonth(), base.getDate()),
    );
    setCurrentMonth(new Date(base.getFullYear(), base.getMonth(), 1));
    if (dayOffset === 0) {
      const { hour, minute } = nextQuarterHourFromNow();
      setSelHour(hour);
      setSelMinute(minute);
    } else {
      setSelHour("10");
      setSelMinute("00");
    }
    setPanelError(null);
  };

  const selectDateStart = (d: Date) => {
    if (!isInCurrentMonth(d, currentMonth) || isBeforeToday(d)) return;
    setSelDate(new Date(d.getFullYear(), d.getMonth(), d.getDate()));
    setPanelError(null);
  };

  const selectDateEnd = (d: Date) => {
    if (!isInCurrentMonth(d, endMonth) || isBeforePickupDate(d)) return;
    setSelDate(new Date(d.getFullYear(), d.getMonth(), d.getDate()));
    setPanelError(null);
  };

  const confirm = () => {
    if (mode === "start") {
      if (!selDate || !selHour || !selMinute) {
        setPanelError("Choose a date and a time to continue.");
        return;
      }
      onChange(toValueString(selDate, selHour, selMinute));
    } else {
      if (!selDate) {
        setPanelError("Choose a return date.");
        return;
      }
      if (!selHour || !selMinute) {
        setPanelError("Choose a return time.");
        return;
      }
      if (isDropBeforePickup()) {
        setPanelError("Return must be after pickup.");
        return;
      }
      onChange(toValueString(selDate, selHour, selMinute));
    }
    setPanelError(null);
    onRequestClose();
  };

  const reset = () => {
    if (mode === "start") {
      setSelDate(null);
      setSelHour("");
      setSelMinute("");
      onChange("");
    } else {
      setSelDate(null);
      setSelHour("");
      setSelMinute("");
      onChange("");
    }
    setPanelError(null);
    onRequestClose();
  };

  const isInCurrentMonth = (d: Date, month: Date) => {
    return d.getMonth() === month.getMonth() && d.getFullYear() === month.getFullYear();
  };

  const selectedDayMatch = (d: Date) =>
    selDate && isSameDay(d, selDate);

  const endSelectedMatch = (d: Date) =>
    selDate && isSameDay(d, selDate);

  const panelHeaderId =
    fieldKey === "dateFrom" ? "search-dt-panel-from" : "search-dt-panel-to";

  const panelInner = (
    <div
      className={styles.dropdownRoot}
      data-dropdown={fieldKey}
      data-search-portal="1"
      role="dialog"
      aria-modal="true"
      aria-labelledby={panelHeaderId}
      style={{
        top: panelPos.top,
        left: Math.max(
          8,
          Math.min(
            panelPos.left,
            typeof window !== "undefined"
              ? window.innerWidth - panelPos.width - 8
              : panelPos.left,
          ),
        ),
        width: Math.min(
          panelPos.width,
          typeof window !== "undefined" ? window.innerWidth - 16 : panelPos.width,
        ),
      }}
    >
      <div className={styles.panelHeader} id={panelHeaderId}>
        <p className={styles.panelKicker}>
          {mode === "start" ? "Pickup" : "Return"}
        </p>
        <p className={styles.panelTitle}>
          {mode === "start"
            ? "When do you need the vehicle?"
            : "When will you return it?"}
        </p>
      </div>

      {mode === "start" && (
        <div className={styles.quickRow}>
          <button
            type="button"
            className={styles.quickChip}
            onClick={() => applyQuickStart(0)}
          >
            Today
          </button>
          <button
            type="button"
            className={styles.quickChip}
            onClick={() => applyQuickStart(1)}
          >
            Tomorrow
          </button>
        </div>
      )}

      <div className={styles.inner}>
        <div className={styles.panelFlex}>
          <div className={styles.calendarBlock}>
            {mode === "start" ? (
              <div className={styles.calendarView}>
                <div className={styles.monthNav}>
                  <button
                    type="button"
                    className={styles.navBtn}
                    onClick={() => {
                      setCurrentMonth(
                        (m) =>
                          new Date(m.getFullYear(), m.getMonth() - 1, 1),
                      );
                    }}
                    disabled={!canGoPrevMonth}
                    aria-label="Previous month"
                  >
                    ‹
                  </button>
                  <strong className={styles.monthLabel}>
                    {currentMonth.toLocaleString("en-GB", {
                      month: "long",
                      year: "numeric",
                    })}
                  </strong>
                  <button
                    type="button"
                    className={styles.navBtn}
                    onClick={() => {
                      setCurrentMonth(
                        (m) =>
                          new Date(m.getFullYear(), m.getMonth() + 1, 1),
                      );
                    }}
                    aria-label="Next month"
                  >
                    ›
                  </button>
                </div>
                <div className={styles.grid}>
                  {DAY_NAMES.map((n) => (
                    <div key={n} className={styles.dayName}>
                      {n}
                    </div>
                  ))}
                  {calendarDates.map((d, i) => {
                    const inM = isInCurrentMonth(d, currentMonth);
                    const dis = !inM || isBeforeToday(d);
                    return (
                      <div
                        key={i}
                        className={[
                          styles.dayCell,
                          !inM ? styles.muted : "",
                          isToday(d) ? styles.today : "",
                          selectedDayMatch(d) ? styles.selected : "",
                          dis ? styles.disabled : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        onClick={() => !dis && selectDateStart(d)}
                      >
                        {d.getDate()}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className={styles.calendarView}>
                <div className={styles.monthNav}>
                  <button
                    type="button"
                    className={styles.navBtn}
                    onClick={() =>
                      setEndMonth(
                        (m) => new Date(m.getFullYear(), m.getMonth() - 1, 1),
                      )
                    }
                    disabled={!canGoPrevEndMonth}
                    aria-label="Previous month"
                  >
                    ‹
                  </button>
                  <strong className={styles.monthLabel}>
                    {endMonth.toLocaleString("en-GB", {
                      month: "long",
                      year: "numeric",
                    })}
                  </strong>
                  <button
                    type="button"
                    className={styles.navBtn}
                    onClick={() =>
                      setEndMonth(
                        (m) => new Date(m.getFullYear(), m.getMonth() + 1, 1),
                      )
                    }
                    aria-label="Next month"
                  >
                    ›
                  </button>
                </div>
                <div className={styles.grid}>
                  {DAY_NAMES.map((n) => (
                    <div key={n} className={styles.dayName}>
                      {n}
                    </div>
                  ))}
                  {endCalendarDates.map((d, i) => {
                    const inM = isInCurrentMonth(d, endMonth);
                    const dis = !inM || isBeforePickupDate(d);
                    return (
                      <div
                        key={i}
                        className={[
                          styles.dayCell,
                          !inM ? styles.muted : "",
                          isToday(d) ? styles.today : "",
                          endSelectedMatch(d) ? styles.selected : "",
                          dis ? styles.disabled : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        onClick={() => !dis && selectDateEnd(d)}
                      >
                        {d.getDate()}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className={styles.timeBlock}>
            <p className={styles.timeBlockLabel}>Time</p>
            <div className={styles.timeSection}>
              <div className={styles.timeCol}>
                <div className={styles.timeColLabel}>Hour</div>
                <div className={styles.timeScroll}>
                  {HOURS.map((h) => {
                    const dis =
                      mode === "end"
                        ? isPastEndTime(h, selMinute || "00")
                        : isPastTime(h, selMinute || "00");
                    return (
                      <button
                        key={h}
                        type="button"
                        className={[
                          styles.timeOpt,
                          selHour === h ? styles.selected : "",
                          dis ? styles.optDisabled : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        disabled={dis}
                        onClick={() => {
                          if (dis) return;
                          setSelHour(h);
                          setPanelError(null);
                        }}
                      >
                        {h}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className={styles.timeCol}>
                <div className={styles.timeColLabel}>Min</div>
                <div className={styles.timeScroll}>
                  {MINUTES.map((min) => {
                    const dis =
                      mode === "end"
                        ? isPastEndTime(selHour || "00", min)
                        : isPastTime(selHour || "00", min);
                    return (
                      <button
                        key={min}
                        type="button"
                        className={[
                          styles.timeOpt,
                          selMinute === min ? styles.selected : "",
                          dis ? styles.optDisabled : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        disabled={dis}
                        onClick={() => {
                          if (dis) return;
                          setSelMinute(min);
                          setPanelError(null);
                        }}
                      >
                        {min}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {panelError ? (
        <p className={styles.panelError} role="alert">
          {panelError}
        </p>
      ) : null}

      <div className={styles.timeActions}>
        <button type="button" className={styles.btnGhost} onClick={reset}>
          Clear
        </button>
        <button type="button" className={styles.btnPrimary} onClick={confirm}>
          Apply
        </button>
      </div>
    </div>
  );

  return (
    <div
      ref={wrapRef}
      className={`${styles.datetimeField} ${isOpen ? styles.active : ""}`}
    >
      <button
        id={fieldKey === "dateFrom" ? "search-date-from" : "search-date-to"}
        type="button"
        className={styles.trigger}
        data-placeholder={!triggerDisplay}
        onClick={handleToggle}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-label={label}
      >
        {triggerDisplay ? (
          <span className={styles.triggerText}>
            <span className={styles.triggerDateLine}>{triggerDisplay.dateLine}</span>
            <span className={styles.triggerTimeLine}>{triggerDisplay.timeLine}</span>
          </span>
        ) : (
          <span className={styles.triggerPlaceholder}>{placeholder}</span>
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={toAssetUrl("images/icons/down-arrow.svg")}
          alt=""
          className={styles.triggerArrow}
          data-open={isOpen}
          width={14}
          height={14}
        />
      </button>
      {hint ? (
        <p className={styles.fieldHint} role="status">
          {hint}
        </p>
      ) : null}
      {isOpen &&
        typeof document !== "undefined" &&
        createPortal(panelInner, document.body)}
    </div>
  );
}
