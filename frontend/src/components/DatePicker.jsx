import React, { useState, useEffect, useRef } from 'react';
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react';

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];
const DAYS = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá'];

function DatePicker({ value, onChange, max, min, placeholder = 'Seleccionar fecha', style = {} }) {
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(null);
  const [viewMonth, setViewMonth] = useState(null);
  const [mode, setMode] = useState('days'); // 'days' | 'months' | 'years'
  const wrapperRef = useRef(null);

  // Initialize view from value or today
  useEffect(() => {
    const base = value ? new Date(value + 'T12:00:00') : new Date();
    setViewYear(base.getFullYear());
    setViewMonth(base.getMonth());
  }, [value]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
        setMode('days');
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const parsed = value ? new Date(value + 'T12:00:00') : null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const maxDate = max ? new Date(max + 'T12:00:00') : null;
  const minDate = min ? new Date(min + 'T12:00:00') : null;

  const formatDisplay = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };

  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const selectDay = (day) => {
    const mm = String(viewMonth + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    const str = `${viewYear}-${mm}-${dd}`;
    onChange(str);
    setOpen(false);
    setMode('days');
  };

  const isDisabled = (day) => {
    const d = new Date(viewYear, viewMonth, day);
    if (maxDate && d > maxDate) return true;
    if (minDate && d < minDate) return true;
    return false;
  };

  const isSelected = (day) => {
    if (!parsed) return false;
    return parsed.getFullYear() === viewYear && parsed.getMonth() === viewMonth && parsed.getDate() === day;
  };

  const isToday = (day) => {
    const t = new Date();
    return t.getFullYear() === viewYear && t.getMonth() === viewMonth && t.getDate() === day;
  };

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);

  // Years range
  const currentYear = new Date().getFullYear();
  const yearStart = viewYear ? Math.floor((viewYear - 1) / 12) * 12 + 1 : currentYear - 5;
  const years = Array.from({ length: 12 }, (_, i) => yearStart + i);

  const handleClear = (e) => {
    e.stopPropagation();
    onChange('');
  };

  if (viewYear === null) return null;

  return (
    <div ref={wrapperRef} style={{ position: 'relative', display: 'inline-block', ...style }}>
      {/* Input trigger */}
      <div
        onClick={() => { setOpen(o => !o); setMode('days'); }}
        className="datepicker-input"
        style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          padding: '6px 10px', cursor: 'pointer',
          minWidth: '160px', height: '36px',
          background: 'var(--surface-2)',
          borderWidth: '1px',
          borderStyle: 'solid',
          borderColor: open ? 'var(--primary)' : 'var(--border-color)',
          borderRadius: '8px', fontSize: '13px', color: value ? 'var(--text-primary)' : 'var(--text-muted)',
          transition: 'border-color .15s',
          userSelect: 'none'
        }}
      >
        <Calendar size={13} style={{ color: 'var(--primary)', flexShrink: 0 }} />
        <span style={{ flex: 1 }}>{value ? formatDisplay(value) : placeholder}</span>
        {value && (
          <X
            size={12}
            style={{ color: 'var(--text-muted)', cursor: 'pointer' }}
            onClick={handleClear}
          />
        )}
      </div>

      {/* Dropdown calendar */}
      {open && (
        <div className="datepicker-dropdown" style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 9999,
          background: 'var(--surface-1)', border: '1px solid var(--border-color)',
          borderRadius: '12px', boxShadow: '0 12px 40px rgba(0,0,0,0.4)',
          padding: '12px', width: '260px',
          animation: 'dp-fade-in 0.15s ease'
        }}>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <button
              type="button"
              onClick={mode === 'years' ? () => setViewYear(y => y - 12) : prevMonth}
              style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px', borderRadius: '6px', display:'flex',alignItems:'center' }}
            >
              <ChevronLeft size={16} />
            </button>

            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                type="button"
                onClick={() => setMode(mode === 'months' ? 'days' : 'months')}
                style={{ background: mode==='months'?'var(--primary)':'none', border: 'none', color: mode==='months'?'#fff':'var(--text-primary)', cursor: 'pointer', padding: '4px 8px', borderRadius: '6px', fontSize: '13px', fontWeight: 700 }}
              >
                {MONTHS[viewMonth]}
              </button>
              <button
                type="button"
                onClick={() => setMode(mode === 'years' ? 'days' : 'years')}
                style={{ background: mode==='years'?'var(--primary)':'none', border: 'none', color: mode==='years'?'#fff':'var(--text-primary)', cursor: 'pointer', padding: '4px 8px', borderRadius: '6px', fontSize: '13px', fontWeight: 700 }}
              >
                {viewYear}
              </button>
            </div>

            <button
              type="button"
              onClick={mode === 'years' ? () => { setViewYear(y => y + 12); } : nextMonth}
              style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px', borderRadius: '6px', display:'flex',alignItems:'center' }}
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Month picker */}
          {mode === 'months' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '6px' }}>
              {MONTHS.map((m, i) => (
                <button
                  type="button"
                  key={m}
                  onClick={() => { setViewMonth(i); setMode('days'); }}
                  style={{
                    padding: '8px 4px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                    fontSize: '11px', fontWeight: 600,
                    background: i === viewMonth ? 'var(--primary)' : 'var(--surface-2)',
                    color: i === viewMonth ? '#fff' : 'var(--text-primary)'
                  }}
                >
                  {m.slice(0, 3)}
                </button>
              ))}
            </div>
          )}

          {/* Year picker */}
          {mode === 'years' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '6px' }}>
              {years.map(yr => (
                <button
                  type="button"
                  key={yr}
                  onClick={() => { setViewYear(yr); setMode('days'); }}
                  style={{
                    padding: '8px 4px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                    fontSize: '12px', fontWeight: 600,
                    background: yr === viewYear ? 'var(--primary)' : 'var(--surface-2)',
                    color: yr === viewYear ? '#fff' : 'var(--text-primary)'
                  }}
                >
                  {yr}
                </button>
              ))}
            </div>
          )}

          {/* Days grid */}
          {mode === 'days' && (
            <>
              {/* Day headers */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '2px', marginBottom: '4px' }}>
                {DAYS.map(d => (
                  <div key={d} style={{ textAlign: 'center', fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', padding: '4px 0' }}>
                    {d}
                  </div>
                ))}
              </div>

              {/* Days */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '2px' }}>
                {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} />)}
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                  const disabled = isDisabled(day);
                  const selected = isSelected(day);
                  const todayFlag = isToday(day);
                  return (
                    <button
                      type="button"
                      key={day}
                      onClick={() => !disabled && selectDay(day)}
                      style={{
                        padding: '5px 0', borderRadius: '6px', border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
                        fontSize: '12px', fontWeight: selected ? 700 : 500,
                        background: selected ? 'var(--primary)' : todayFlag ? 'rgba(99,102,241,0.15)' : 'transparent',
                        color: disabled ? 'var(--text-muted)' : selected ? '#fff' : todayFlag ? 'var(--primary)' : 'var(--text-primary)',
                        outline: todayFlag && !selected ? '1px solid var(--primary)' : 'none',
                        opacity: disabled ? 0.35 : 1,
                        transition: 'background .1s'
                      }}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>

              {/* Today button */}
              <div style={{ marginTop: '10px', borderTop: '1px solid var(--border-color)', paddingTop: '8px', textAlign: 'center' }}>
                <button
                  type="button"
                  onClick={() => {
                    const t = new Date();
                    const str = `${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,'0')}-${String(t.getDate()).padStart(2,'0')}`;
                    const disabled = isDisabled(t.getDate()) || t.getMonth() !== viewMonth || t.getFullYear() !== viewYear;
                    if (!disabled) { onChange(str); setOpen(false); setMode('days'); }
                    else { setViewYear(t.getFullYear()); setViewMonth(t.getMonth()); }
                  }}
                  style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '11px', fontWeight: 700 }}
                >
                  Hoy
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default DatePicker;
