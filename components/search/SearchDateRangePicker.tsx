"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { toAssetUrl } from "@/lib/config";
import styles from "./searchDateRangePicker.module.css";

const DAY_NAMES = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"] as const;
const MINUTES = ["00", "15", "30", "45"] as const;

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function parseDateTimeValue(
  s: string,
): { date: Date; hour: number; minute: string } | null {
  if (!s?.trim()) return null;
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  if (Number.isNaN(d.getTime())) return null;
  return { date: d, hour: Number(m[4]), minute: m[5] };
}

function toValueString(d: Date, hour24: number, minute: string) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(hour24)}:${minute}`;
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

function stripTime(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function isBeforeToday(d: Date) {
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  const c = stripTime(d);
  return c < t;
}

function isToday(d: Date) {
  const t = new Date();
  return isSameDay(d, t);
}

function to12Parts(h24: number) {
  const isPm = h24 >= 12;
  let h12 = h24 % 12;
  if (h12 === 0) h12 = 12;
  return { h12, isPm };
}

function formatHourOptionLabel(h24: number) {
  const { h12, isPm } = to12Parts(h24);
  return `${h12} ${isPm ? "PM" : "AM"}`;
}

function formatTriggerLine(d: Date, h24: number, min: string) {
  const dateStr = d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  const { h12, isPm } = to12Parts(h24);
  const mm = min.padStart(2, "0");
  return `${dateStr} · ${h12}:${mm} ${isPm ? "PM" : "AM"}`;
}

function monthStart(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function addMonths(m: Date, delta: number) {
  return new Date(m.getFullYear(), m.getMonth() + delta, 1);
}

type TimeMenuKey = "pickupH" | "pickupM" | "returnH" | "returnM";

type TimeDropdownProps = {
  menuKey: TimeMenuKey;
  label: string;
  value: string;
  displayValue: string;
  options: { value: string; label: string }[];
  isOpen: boolean;
  onOpen: (key: TimeMenuKey) => void;
  onClose: () => void;
  onChange: (value: string) => void;
};

/** Custom list — native select menus misalign when the panel is portaled + fixed. */
function TimeDropdown({
  menuKey,
  label,
  value,
  displayValue,
  options,
  isOpen,
  onOpen,
  onClose,
  onChange,
}: TimeDropdownProps) {
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current?.contains(e.target as Node)) return;
      onClose();
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [isOpen, onClose]);

  return (
    <div ref={wrapRef} className={styles.timeSelectWrap}>
      <button
        type="button"
        className={styles.timeSelectTrigger}
        aria-label={label}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        onClick={() => (isOpen ? onClose() : onOpen(menuKey))}
      >
        {displayValue}
      </button>
      {isOpen ? (
        <ul className={styles.timeSelectMenu} role="listbox" aria-label={label}>
          {options.map((opt) => (
            <li key={opt.value} role="presentation">
              <button
                type="button"
                role="option"
                aria-selected={opt.value === value}
                className={
                  opt.value === value
                    ? `${styles.timeSelectOption} ${styles.timeSelectOptionActive}`
                    : styles.timeSelectOption
                }
                onClick={() => {
                  onChange(opt.value);
                  onClose();
                }}
              >
                {opt.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export type SearchDateRangePickerProps = {
  startValue: string;
  endValue: string;
  onApply: (start: string, end: string) => void;
  onClear: () => void;
  isOpen: boolean;
  onRequestOpen: () => void;
  onRequestClose: () => void;
};

export function SearchDateRangePicker({
  startValue,
  endValue,
  onApply,
  onClear,
  isOpen,
  onRequestOpen,
  onRequestClose,
}: SearchDateRangePickerProps) {
  const panelTitleId = useId();
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [panelPos, setPanelPos] = useState({ top: 0, left: 0, width: 0 });

  const [leftMonth, setLeftMonth] = useState(() => monthStart(new Date()));

  const [rangeStart, setRangeStart] = useState<Date | null>(null);
  const [rangeEnd, setRangeEnd] = useState<Date | null>(null);

  const [pickupH24, setPickupH24] = useState(10);
  const [pickupMin, setPickupMin] = useState("00");
  const [returnH24, setReturnH24] = useState(10);
  const [returnMin, setReturnMin] = useState("00");

  const [panelError, setPanelError] = useState<string | null>(null);
  const [openTimeMenu, setOpenTimeMenu] = useState<TimeMenuKey | null>(null);
  const [singleMonthView, setSingleMonthView] = useState(false);
  const openedRef = useRef(false);

  const rightMonth = useMemo(() => addMonths(leftMonth, 1), [leftMonth]);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const update = () => setSingleMonthView(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const syncDraftFromProps = useCallback(() => {
    const ps = parseDateTimeValue(startValue);
    const pe = parseDateTimeValue(endValue);
    if (ps) {
      setRangeStart(stripTime(ps.date));
      setPickupH24(ps.hour);
      setPickupMin(ps.minute);
      setLeftMonth(monthStart(ps.date));
    } else {
      setRangeStart(null);
      setPickupH24(10);
      setPickupMin("00");
      const t = new Date();
      setLeftMonth(monthStart(t));
    }
    if (pe) {
      setRangeEnd(stripTime(pe.date));
      setReturnH24(pe.hour);
      setReturnMin(pe.minute);
    } else {
      setRangeEnd(null);
      setReturnH24(10);
      setReturnMin("00");
    }
    setPanelError(null);
  }, [startValue, endValue]);

  useEffect(() => {
    if (isOpen && !openedRef.current) {
      syncDraftFromProps();
      openedRef.current = true;
    }
    if (!isOpen) {
      openedRef.current = false;
      setOpenTimeMenu(null);
    }
  }, [isOpen, syncDraftFromProps]);

  useLayoutEffect(() => {
    if (!isOpen) return;
    const el = wrapRef.current;
    if (!el) return;
    const update = () => {
      const r = el.getBoundingClientRect();
      const minWidth = window.matchMedia("(max-width: 767px)").matches ? 300 : 560;
      setPanelPos({
        top: r.bottom + 8,
        left: r.left,
        width: Math.max(r.width, minWidth),
      });
    };
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [isOpen, singleMonthView]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onRequestClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onRequestClose]);

  const triggerPickup = useMemo(() => {
    const p = parseDateTimeValue(startValue);
    if (!p) return null;
    return formatTriggerLine(p.date, p.hour, p.minute);
  }, [startValue]);

  const triggerReturn = useMemo(() => {
    const p = parseDateTimeValue(endValue);
    if (!p) return null;
    return formatTriggerLine(p.date, p.hour, p.minute);
  }, [endValue]);

  const canGoPrevMonth = useMemo(() => {
    const minM = monthStart(new Date());
    return leftMonth > minM;
  }, [leftMonth]);

  const onDayClick = (d: Date) => {
    if (isBeforeToday(d)) return;
    const day = stripTime(d);
    if (!rangeStart || (rangeStart && rangeEnd)) {
      setRangeStart(day);
      setRangeEnd(null);
      setPanelError(null);
      return;
    }
    if (rangeStart && !rangeEnd) {
      const s = rangeStart.getTime();
      const t = day.getTime();
      if (t < s) {
        setRangeStart(day);
        setRangeEnd(null);
      } else if (t === s) {
        setRangeEnd(day);
      } else {
        setRangeEnd(day);
      }
      setPanelError(null);
    }
  };

  const dayCellClass = (d: Date, inCurrentMonth: boolean) => {
    const dis = !inCurrentMonth || isBeforeToday(d);
    const parts: string[] = [styles.dayCell];
    if (!inCurrentMonth) parts.push(styles.muted);
    if (dis) parts.push(styles.disabled);

    const sd = rangeStart ? stripTime(rangeStart).getTime() : null;
    const ed = rangeEnd ? stripTime(rangeEnd).getTime() : null;
    const td = stripTime(d).getTime();
    const isStart = Boolean(rangeStart && isSameDay(d, rangeStart));
    const isEnd = Boolean(rangeEnd && isSameDay(d, rangeEnd));

    if (isStart && isEnd) {
      parts.push(styles.rangeSingle);
    } else if (isStart) {
      parts.push(styles.rangeStart);
    } else if (isEnd) {
      parts.push(styles.rangeEnd);
    } else if (sd != null && ed != null && td > sd && td < ed) {
      parts.push(styles.rangeBetween);
    }
    if (isToday(d) && inCurrentMonth) parts.push(styles.today);
    return parts.filter(Boolean).join(" ");
  };

  const apply = () => {
    if (!rangeStart) {
      setPanelError("Select a pickup date.");
      return;
    }
    if (!rangeEnd) {
      setPanelError("Select a return date.");
      return;
    }
    const startStr = toValueString(rangeStart, pickupH24, pickupMin);
    const endStr = toValueString(rangeEnd, returnH24, returnMin);
    const t0 = new Date(
      rangeStart.getFullYear(),
      rangeStart.getMonth(),
      rangeStart.getDate(),
      pickupH24,
      Number(pickupMin),
    );
    const t1 = new Date(
      rangeEnd.getFullYear(),
      rangeEnd.getMonth(),
      rangeEnd.getDate(),
      returnH24,
      Number(returnMin),
    );
    if (t1 <= t0) {
      setPanelError("Return must be after pickup.");
      return;
    }
    const now = new Date();
    if (t0 < now) {
      setPanelError("Pickup cannot be in the past.");
      return;
    }
    setPanelError(null);
    onApply(startStr, endStr);
    onRequestClose();
  };

  const clear = () => {
    setRangeStart(null);
    setRangeEnd(null);
    setPanelError(null);
    onClear();
    onRequestClose();
  };

  const renderMonth = (viewMonth: Date) => {
    const cells = generateCalendar(viewMonth);
    return (
      <div className={styles.monthBlock}>
        <div className={styles.monthTitle}>
          {viewMonth.toLocaleString("en-US", {
            month: "long",
            year: "numeric",
          })}
        </div>
        <div className={styles.grid}>
          {DAY_NAMES.map((n) => (
            <div key={n} className={styles.dayName}>
              {n}
            </div>
          ))}
          {cells.map((d, i) => {
            const inM =
              d.getMonth() === viewMonth.getMonth() &&
              d.getFullYear() === viewMonth.getFullYear();
            const dis = !inM || isBeforeToday(d);
            return (
              <div
                key={i}
                className={dayCellClass(d, inM)}
                onClick={() => !dis && onDayClick(d)}
              >
                <span className={styles.dayNum}>{d.getDate()}</span>
                {isToday(d) && inM ? (
                  <span className={styles.todayDot} aria-hidden />
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const hourOptions = useMemo(
    () => Array.from({ length: 24 }, (_, i) => i),
    [],
  );

  const hourSelectOptions = useMemo(
    () =>
      hourOptions.map((h) => ({
        value: String(h),
        label: formatHourOptionLabel(h),
      })),
    [hourOptions],
  );

  const minuteSelectOptions = useMemo(
    () =>
      MINUTES.map((m) => ({
        value: m,
        label: `:${m}`,
      })),
    [],
  );

  const panelWidth = Math.min(
    panelPos.width,
    typeof window !== "undefined" ? window.innerWidth - 16 : panelPos.width,
  );
  const panelLeft = Math.max(
    8,
    Math.min(
      panelPos.left,
      typeof window !== "undefined"
        ? window.innerWidth - panelWidth - 8
        : panelPos.left,
    ),
  );

  const panel = (
    <div
      className={styles.dropdownRoot}
      data-dropdown="dateRange"
      data-search-portal="1"
      role="dialog"
      aria-modal="true"
      aria-labelledby={panelTitleId}
      style={{
        top: panelPos.top,
        left: panelLeft,
        width: panelWidth,
      }}
    >
      <div className={styles.panelTop}>
        <p className={styles.panelKicker} id={panelTitleId}>
          Select pickup & return
        </p>
        <div className={styles.monthNavCluster}>
          <button
            type="button"
            className={styles.iconRound}
            disabled={!canGoPrevMonth}
            aria-label={singleMonthView ? "Previous month" : "Previous months"}
            onClick={() => setLeftMonth((m) => addMonths(m, -1))}
          >
            ‹
          </button>
          <button
            type="button"
            className={styles.iconRound}
            aria-label={singleMonthView ? "Next month" : "Next months"}
            onClick={() => setLeftMonth((m) => addMonths(m, 1))}
          >
            ›
          </button>
        </div>
      </div>

      <div className={styles.dualMonth} data-single-month={singleMonthView ? "true" : undefined}>
        {renderMonth(leftMonth)}
        {!singleMonthView ? renderMonth(rightMonth) : null}
      </div>

      <div className={styles.timeDivider} />

      <div className={styles.timeRow}>
        <div className={styles.timeCol}>
          <span className={styles.timeColLabel}>Pickup time</span>
          <div className={styles.timeSelects}>
            <TimeDropdown
              menuKey="pickupH"
              label="Pickup hour"
              value={String(pickupH24)}
              displayValue={formatHourOptionLabel(pickupH24)}
              options={hourSelectOptions}
              isOpen={openTimeMenu === "pickupH"}
              onOpen={setOpenTimeMenu}
              onClose={() => setOpenTimeMenu(null)}
              onChange={(v) => {
                setPickupH24(Number(v));
                setPanelError(null);
              }}
            />
            <TimeDropdown
              menuKey="pickupM"
              label="Pickup minutes"
              value={pickupMin}
              displayValue={`:${pickupMin}`}
              options={minuteSelectOptions}
              isOpen={openTimeMenu === "pickupM"}
              onOpen={setOpenTimeMenu}
              onClose={() => setOpenTimeMenu(null)}
              onChange={(v) => {
                setPickupMin(v);
                setPanelError(null);
              }}
            />
          </div>
        </div>
        <div className={styles.timeCol}>
          <span className={styles.timeColLabel}>Return time</span>
          <div className={styles.timeSelects}>
            <TimeDropdown
              menuKey="returnH"
              label="Return hour"
              value={String(returnH24)}
              displayValue={formatHourOptionLabel(returnH24)}
              options={hourSelectOptions}
              isOpen={openTimeMenu === "returnH"}
              onOpen={setOpenTimeMenu}
              onClose={() => setOpenTimeMenu(null)}
              onChange={(v) => {
                setReturnH24(Number(v));
                setPanelError(null);
              }}
            />
            <TimeDropdown
              menuKey="returnM"
              label="Return minutes"
              value={returnMin}
              displayValue={`:${returnMin}`}
              options={minuteSelectOptions}
              isOpen={openTimeMenu === "returnM"}
              onOpen={setOpenTimeMenu}
              onClose={() => setOpenTimeMenu(null)}
              onChange={(v) => {
                setReturnMin(v);
                setPanelError(null);
              }}
            />
          </div>
        </div>
      </div>

      {panelError ? (
        <p className={styles.panelError} role="alert">
          {panelError}
        </p>
      ) : null}

      <div className={styles.footer}>
        <button type="button" className={styles.clearLink} onClick={clear}>
          Clear dates
        </button>
        <button type="button" className={styles.applyBtn} onClick={apply}>
          Apply
        </button>
      </div>
    </div>
  );

  return (
    <div
      ref={wrapRef}
      className={`${styles.root} ${isOpen ? styles.rootOpen : ""}`}
    >
      <button
        type="button"
        className={styles.trigger}
        onClick={() => (isOpen ? onRequestClose() : onRequestOpen())}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
      >
        <span className={styles.triggerBlock}>
          <span className={styles.triggerKicker}>Pickup</span>
          <span className={styles.triggerValue} data-empty={!triggerPickup}>
            {triggerPickup ?? "Date & time"}
          </span>
        </span>
        <span className={styles.triggerArrowMid} aria-hidden>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={toAssetUrl("images/icons/right-arrow.svg")}
            alt=""
            width={14}
            height={14}
          />
        </span>
        <span className={styles.triggerBlock}>
          <span className={styles.triggerKicker}>Return</span>
          <span className={styles.triggerValue} data-empty={!triggerReturn}>
            {triggerReturn ?? "Date & time"}
          </span>
        </span>
        <span className={styles.triggerGo} aria-hidden>
          <svg
            className={styles.triggerGoIcon}
            xmlns="http://www.w3.org/2000/svg"
            width={10}
            height={10}
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden
          >
            <path
              d="M9 6l6 6-6 6"
              stroke="#ffffff"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </button>
      {isOpen &&
        typeof document !== "undefined" &&
        createPortal(panel, document.body)}
    </div>
  );
}
