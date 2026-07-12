import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Plus, Trash2, Settings, Copy, Printer, Check, Gift, Ticket, Globe, Crown } from "lucide-react";

const STORAGE_KEY = "labadi-lane-tickets-v2";

const defaultData = {
  eventName: "Lights on Labadi Lane",
  eventDate: "2026-07-26",
  target: 135000,
  vip: { total: 140, price: 500, sold: 2 },
  physical: [
    { id: "p1", name: "Early Bird", ticketsPerUnit: 1, price: 150, printed: 200, units: 7 },
    { id: "p2", name: "Regular", ticketsPerUnit: 1, price: 200, printed: 100, units: 1 },
    { id: "p3", name: "Double", ticketsPerUnit: 2, price: 350, printed: 100, units: 3 },
    { id: "p4", name: "Group of 5", ticketsPerUnit: 5, price: 800, printed: 100, units: 0 },
    { id: "p5", name: "Discounted", ticketsPerUnit: 1, price: 120, printed: 74, units: 8 },
  ],
  online: [
    { id: "o1", name: "Early Bird", ticketsPerUnit: 1, faceValue: 150, settlement: 144, units: 17 },
    { id: "o2", name: "Single", ticketsPerUnit: 1, faceValue: 200, settlement: 192, units: 4 },
    { id: "o3", name: "Double", ticketsPerUnit: 2, faceValue: 350, settlement: 336, units: 6 },
    { id: "o4", name: "Group of 5", ticketsPerUnit: 5, faceValue: 800, settlement: 768, units: 0 },
  ],
  comp: { count: 0, notes: "" },
};

const gold = "#E3A857";
const goldDim = "#4A4530";
const ink = "#F4EFE3";
const inkDim = "#9CA3C4";
const bg = "#151833";
const bgCard = "#1D2145";
const bgCard2 = "#232752";
const coral = "#E2725B";
const teal = "#4FB6A8";
const line = "#31366B";

function fmtGHS(n) {
  const v = Math.round(n || 0);
  return "GH₵ " + v.toLocaleString("en-US");
}

function uid(prefix) {
  return prefix + Math.random().toString(36).slice(2, 8);
}

function daysBetween(dateStr) {
  const now = new Date();
  const target = new Date(dateStr + "T00:00:00");
  const ms = target.setHours(0, 0, 0, 0) - new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return Math.ceil(ms / 86400000);
}

function todayStr() {
  const d = new Date();
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
}

export default function App() {
  const [data, setData] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [saveState, setSaveState] = useState("idle");
  const [showSettings, setShowSettings] = useState(false);
  const [reportText, setReportText] = useState("");
  const [showReport, setShowReport] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await window.storage.get(STORAGE_KEY);
        setData(res ? JSON.parse(res.value) : defaultData);
      } catch (e) {
        setData(defaultData);
      }
      setLoaded(true);
    })();
  }, []);

  useEffect(() => {
    if (!loaded || !data) return;
    setSaveState("saving");
    const t = setTimeout(async () => {
      try {
        await window.storage.set(STORAGE_KEY, JSON.stringify(data));
        setSaveState("saved");
      } catch (e) {
        setSaveState("error");
      }
    }, 400);
    return () => clearTimeout(t);
  }, [data, loaded]);

  const update = useCallback((path, value) => {
    setData((prev) => {
      const next = structuredClone(prev);
      let obj = next;
      for (let i = 0; i < path.length - 1; i++) obj = obj[path[i]];
      obj[path[path.length - 1]] = value;
      return next;
    });
  }, []);

  const updateRow = useCallback((section, id, field, value) => {
    setData((prev) => {
      const next = structuredClone(prev);
      const row = next[section].find((r) => r.id === id);
      if (row) row[field] = value;
      return next;
    });
  }, []);

  const addRow = useCallback((section) => {
    setData((prev) => {
      const next = structuredClone(prev);
      if (section === "physical") {
        next.physical.push({ id: uid("p"), name: "New batch", ticketsPerUnit: 1, price: 0, printed: 0, units: 0 });
      } else {
        next.online.push({ id: uid("o"), name: "New tier", ticketsPerUnit: 1, faceValue: 0, settlement: 0, units: 0 });
      }
      return next;
    });
  }, []);

  const removeRow = useCallback((section, id) => {
    setData((prev) => {
      const next = structuredClone(prev);
      next[section] = next[section].filter((r) => r.id !== id);
      return next;
    });
  }, []);

  const calc = useMemo(() => {
    if (!data) return null;
    const vipRevenue = data.vip.sold * data.vip.price;
    const vipTicketsUnsold = Math.max(data.vip.total - data.vip.sold, 0);

    const physical = data.physical.map((r) => ({
      ...r,
      tickets: r.units * r.ticketsPerUnit,
      revenue: r.units * r.price,
      printedUnitsRemaining: Math.max(r.printed - r.units, 0),
    }));
    const physicalPrintedTotal = physical.reduce((s, r) => s + r.printed, 0);
    const physicalUnitsUsed = physical.reduce((s, r) => s + r.units, 0);
    const physicalUnitsUnsold = Math.max(physicalPrintedTotal - physicalUnitsUsed, 0);
    const physicalTicketsSold = physical.reduce((s, r) => s + r.tickets, 0);
    const physicalRevenue = physical.reduce((s, r) => s + r.revenue, 0);

    const online = data.online.map((r) => ({
      ...r,
      tickets: r.units * r.ticketsPerUnit,
      faceRevenue: r.units * r.faceValue,
      settledRevenue: r.units * r.settlement,
    }));
    const onlineUnits = online.reduce((s, r) => s + r.units, 0);
    const onlineTickets = online.reduce((s, r) => s + r.tickets, 0);
    const onlineFaceRevenue = online.reduce((s, r) => s + r.faceRevenue, 0);
    const onlineSettledRevenue = online.reduce((s, r) => s + r.settledRevenue, 0);
    const ipayDeduction = onlineFaceRevenue - onlineSettledRevenue;

    const totalFaceRevenue = vipRevenue + physicalRevenue + onlineFaceRevenue;
    const totalSettledRevenue = vipRevenue + physicalRevenue + onlineSettledRevenue;
    const gap = Math.max(data.target - totalSettledRevenue, 0);
    const progress = data.target > 0 ? Math.min((totalSettledRevenue / data.target) * 100, 999) : 0;

    const totalTicketsSold = data.vip.sold + physicalTicketsSold + onlineTickets;
    const totalTicketsSoldWithComp = totalTicketsSold + data.comp.count;

    const days = daysBetween(data.eventDate);

    return {
      vipRevenue,
      vipTicketsUnsold,
      physical,
      physicalPrintedTotal,
      physicalUnitsUsed,
      physicalUnitsUnsold,
      physicalTicketsSold,
      physicalRevenue,
      online,
      onlineUnits,
      onlineTickets,
      onlineFaceRevenue,
      onlineSettledRevenue,
      ipayDeduction,
      totalFaceRevenue,
      totalSettledRevenue,
      gap,
      progress,
      totalTicketsSold,
      totalTicketsSoldWithComp,
      days,
    };
  }, [data]);

  const generateReport = useCallback(() => {
    if (!data || !calc) return;
    const lines = [];
    const dayLabel = calc.days >= 0 ? `${calc.days} Day${calc.days === 1 ? "" : "s"} to Go` : "Event has passed";

    lines.push(`🎭 ${data.eventName.toUpperCase()} — TICKET SALES UPDATE`);
    lines.push(`${todayStr()} | ${dayLabel}`);
    lines.push("");
    lines.push(`🎟 Total Tickets Sold: ${calc.totalTicketsSold}`);
    lines.push("");
    lines.push(`Breakdown:`);
    lines.push("");
    lines.push(`⭐ VIP: ${data.vip.sold} ticket${data.vip.sold === 1 ? "" : "s"}`);
    lines.push("");

    const physicalRows = calc.physical.filter((r) => r.tickets > 0);
    lines.push(`🎟 Physical: ${calc.physicalTicketsSold} ticket${calc.physicalTicketsSold === 1 ? "" : "s"}`);
    physicalRows.forEach((r) => lines.push(`• ${r.name}: ${r.tickets}`));
    lines.push("");

    const onlineRows = calc.online.filter((r) => r.tickets > 0);
    lines.push(`🌐 Online (iPay): ${calc.onlineTickets} ticket${calc.onlineTickets === 1 ? "" : "s"}`);
    onlineRows.forEach((r) => lines.push(`• ${r.name}: ${r.tickets}`));

    if (data.comp.count > 0) {
      lines.push("");
      lines.push(`🎁 Complimentary: ${data.comp.count} given out (no revenue)`);
    }

    lines.push("");
    lines.push(`💰 Revenue`);
    lines.push(`Settled: ${fmtGHS(calc.totalSettledRevenue)}`);
    lines.push(`Target: ${fmtGHS(data.target)}`);
    lines.push(`Progress: ${calc.progress.toFixed(1)}%`);
    lines.push(`Gap: ${fmtGHS(calc.gap)}`);

    setReportText(lines.join("\n"));
    setShowReport(true);
  }, [data, calc]);

  const copyReport = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(reportText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch (e) {}
  }, [reportText]);

  if (!loaded || !data || !calc) {
    return (
      <div style={{ background: bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: ink, fontFamily: "Inter, sans-serif" }}>
        Loading tracker…
      </div>
    );
  }

  const bulbCount = 20;
  const litBulbs = Math.round((Math.min(calc.progress, 100) / 100) * bulbCount);

  return (
    <div style={{ background: bg, minHeight: "100vh", color: ink, fontFamily: "Inter, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
        .lbl-font { font-family: 'Fraunces', serif; }
        .mono { font-family: 'IBM Plex Mono', monospace; }
        input[type=text], input[type=number], textarea {
          background: ${bgCard2}; color: ${ink}; border: 1px solid ${line};
          border-radius: 6px; padding: 5px 8px; font-family: 'IBM Plex Mono', monospace; font-size: 13px;
        }
        input[type=text] { font-family: 'Inter', sans-serif; }
        input:focus, textarea:focus { outline: 2px solid ${gold}; outline-offset: 1px; }
        .rowbtn:hover { background: ${bgCard2}; }
        ::-webkit-scrollbar { height: 6px; width: 6px; }
        ::-webkit-scrollbar-thumb { background: ${line}; border-radius: 3px; }
        @media print {
          .no-print { display: none !important; }
          body, .print-area { background: white !important; color: black !important; }
        }
      `}</style>

      <div style={{ maxWidth: 880, margin: "0 auto", padding: "28px 20px 80px" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 22 }}>
          <div>
            <h1 className="lbl-font" style={{ fontSize: 28, fontWeight: 600, margin: 0, letterSpacing: "-0.01em" }}>
              {data.eventName}
            </h1>
            <div style={{ color: inkDim, fontSize: 13, marginTop: 4 }}>
              Ticket Sales Tracker · As of {todayStr()}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div
              style={{
                background: bgCard, border: `1px solid ${line}`, borderRadius: 10, padding: "8px 14px",
                fontSize: 13, color: calc.days <= 3 ? coral : ink, fontWeight: 600, whiteSpace: "nowrap",
              }}
            >
              {calc.days >= 0 ? `${calc.days} day${calc.days === 1 ? "" : "s"} to go` : "Event has passed"}
            </div>
            <button
              className="no-print rowbtn"
              onClick={() => setShowSettings((s) => !s)}
              style={{ background: bgCard, border: `1px solid ${line}`, borderRadius: 10, padding: 9, color: ink, cursor: "pointer" }}
              title="Settings"
            >
              <Settings size={16} />
            </button>
          </div>
        </div>

        {showSettings && (
          <div className="no-print" style={{ background: bgCard, border: `1px solid ${line}`, borderRadius: 12, padding: 16, marginBottom: 20, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div>
              <label style={{ fontSize: 12, color: inkDim, display: "block", marginBottom: 4 }}>Event date</label>
              <input type="text" value={data.eventDate} onChange={(e) => update(["eventDate"], e.target.value)} placeholder="YYYY-MM-DD" style={{ width: "100%" }} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: inkDim, display: "block", marginBottom: 4 }}>Fundraising target (GH₵)</label>
              <input type="number" value={data.target} onChange={(e) => update(["target"], Number(e.target.value) || 0)} style={{ width: "100%" }} />
            </div>
          </div>
        )}

        {/* Signature: string of lights progress */}
        <div style={{ background: bgCard, border: `1px solid ${line}`, borderRadius: 16, padding: "22px 20px", marginBottom: 22 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 12, color: inkDim, textTransform: "uppercase", letterSpacing: "0.06em" }}>Settled revenue</div>
              <div className="lbl-font mono" style={{ fontSize: 32, fontWeight: 600, color: gold }}>{fmtGHS(calc.totalSettledRevenue)}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 12, color: inkDim }}>of {fmtGHS(data.target)} target</div>
              <div className="mono" style={{ fontSize: 20, fontWeight: 600 }}>{calc.progress.toFixed(1)}%</div>
            </div>
          </div>

          {/* bulb string */}
          <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
            {Array.from({ length: bulbCount }).map((_, i) => {
              const lit = i < litBulbs;
              return (
                <div
                  key={i}
                  style={{
                    width: 16, height: 16, borderRadius: "50%",
                    background: lit ? gold : goldDim,
                    boxShadow: lit ? `0 0 8px 2px ${gold}88` : "none",
                    transition: "all 0.3s ease",
                  }}
                />
              );
            })}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: inkDim }}>
            <span>Gap to target: <span style={{ color: ink, fontWeight: 600 }} className="mono">{fmtGHS(calc.gap)}</span></span>
            <span>Face value total: <span style={{ color: ink, fontWeight: 600 }} className="mono">{fmtGHS(calc.totalFaceRevenue)}</span></span>
          </div>
        </div>

        {/* Summary cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10, marginBottom: 26 }}>
          <SummaryCard icon={<Crown size={15} />} label="VIP sold" value={`${data.vip.sold} / ${data.vip.total}`} accent={gold} />
          <SummaryCard icon={<Ticket size={15} />} label="Physical used" value={`${calc.physicalUnitsUsed} / ${calc.physicalPrintedTotal}`} accent={coral} />
          <SummaryCard icon={<Globe size={15} />} label="Online units" value={`${calc.onlineUnits}`} accent={teal} />
          <SummaryCard icon={<Gift size={15} />} label="Complimentary" value={`${data.comp.count}`} accent={inkDim} />
        </div>

        {/* VIP */}
        <Section title="VIP Tickets" subtitle={`${data.vip.total} total capacity`}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px,1fr))", gap: 10 }}>
            <Field label="Total capacity">
              <input type="number" value={data.vip.total} onChange={(e) => update(["vip", "total"], Number(e.target.value) || 0)} style={{ width: "100%" }} />
            </Field>
            <Field label="Price/ticket (GH₵)">
              <input type="number" value={data.vip.price} onChange={(e) => update(["vip", "price"], Number(e.target.value) || 0)} style={{ width: "100%" }} />
            </Field>
            <Field label="Sold">
              <input type="number" value={data.vip.sold} onChange={(e) => update(["vip", "sold"], Number(e.target.value) || 0)} style={{ width: "100%" }} />
            </Field>
            <Field label="Revenue">
              <div className="mono" style={{ padding: "6px 8px", fontWeight: 600, color: gold }}>{fmtGHS(calc.vipRevenue)}</div>
            </Field>
          </div>
          <div style={{ fontSize: 12, color: inkDim, marginTop: 8 }}>Unsold: {calc.vipTicketsUnsold}</div>
        </Section>

        {/* Physical */}
        <Section
          title="Physical Tickets"
          subtitle={`${calc.physicalPrintedTotal} printed — add a row below whenever a new batch is printed`}
        >
          <TableHeader cols={["Type", "Printed", "Sold (units)", "Tickets/unit", "Price/unit", "Revenue", ""]} />
          {calc.physical.map((r) => (
            <RowEditor
              key={r.id}
              onRemove={() => removeRow("physical", r.id)}
            >
              <input type="text" value={r.name} onChange={(e) => updateRow("physical", r.id, "name", e.target.value)} style={{ width: "100%" }} />
              <input type="number" value={r.printed} onChange={(e) => updateRow("physical", r.id, "printed", Number(e.target.value) || 0)} style={{ width: "100%" }} />
              <input type="number" value={r.units} onChange={(e) => updateRow("physical", r.id, "units", Number(e.target.value) || 0)} style={{ width: "100%" }} />
              <input type="number" value={r.ticketsPerUnit} onChange={(e) => updateRow("physical", r.id, "ticketsPerUnit", Number(e.target.value) || 0)} style={{ width: "100%" }} />
              <input type="number" value={r.price} onChange={(e) => updateRow("physical", r.id, "price", Number(e.target.value) || 0)} style={{ width: "100%" }} />
              <div className="mono" style={{ fontWeight: 600, whiteSpace: "nowrap" }}>{fmtGHS(r.revenue)}</div>
            </RowEditor>
          ))}
          <AddRowButton onClick={() => addRow("physical")} label="Add physical ticket batch (new print run)" />
          <TotalsRow
            cols={[
              "Total",
              String(calc.physicalPrintedTotal),
              String(calc.physicalUnitsUsed),
              "",
              "",
              fmtGHS(calc.physicalRevenue),
              "",
            ]}
          />
        </Section>

        {/* Online */}
        <Section title="Online Tickets" subtitle="via iPay — settlement prices used for revenue">
          <TableHeader cols={["Type", "Sold (units)", "Tickets/unit", "Face value", "Settlement", "Revenue", ""]} />
          {calc.online.map((r) => (
            <RowEditor key={r.id} onRemove={() => removeRow("online", r.id)}>
              <input type="text" value={r.name} onChange={(e) => updateRow("online", r.id, "name", e.target.value)} style={{ width: "100%" }} />
              <input type="number" value={r.units} onChange={(e) => updateRow("online", r.id, "units", Number(e.target.value) || 0)} style={{ width: "100%" }} />
              <input type="number" value={r.ticketsPerUnit} onChange={(e) => updateRow("online", r.id, "ticketsPerUnit", Number(e.target.value) || 0)} style={{ width: "100%" }} />
              <input type="number" value={r.faceValue} onChange={(e) => updateRow("online", r.id, "faceValue", Number(e.target.value) || 0)} style={{ width: "100%" }} />
              <input type="number" value={r.settlement} onChange={(e) => updateRow("online", r.id, "settlement", Number(e.target.value) || 0)} style={{ width: "100%" }} />
              <div className="mono" style={{ fontWeight: 600, whiteSpace: "nowrap" }}>{fmtGHS(r.settledRevenue)}</div>
            </RowEditor>
          ))}
          <AddRowButton onClick={() => addRow("online")} label="Add online ticket tier" />
          <TotalsRow
            cols={["Total", String(calc.onlineUnits), "", fmtGHS(calc.onlineFaceRevenue), "", fmtGHS(calc.onlineSettledRevenue), ""]}
          />
          <div style={{ fontSize: 12, color: inkDim, marginTop: 6 }}>
            iPay deduction: <span className="mono">{fmtGHS(calc.ipayDeduction)}</span>
          </div>
        </Section>

        {/* Complimentary */}
        <Section title="Complimentary Tickets" subtitle="Free tickets given out — tracked, no revenue">
          <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: 10 }}>
            <Field label="Count given">
              <input type="number" value={data.comp.count} onChange={(e) => update(["comp", "count"], Number(e.target.value) || 0)} style={{ width: "100%" }} />
            </Field>
            <Field label="Notes (who/why, optional)">
              <input type="text" value={data.comp.notes} onChange={(e) => update(["comp", "notes"], e.target.value)} placeholder="e.g. sponsors, media, protocol" style={{ width: "100%" }} />
            </Field>
          </div>
        </Section>

        {/* Report generator */}
        <div className="no-print" style={{ display: "flex", gap: 10, marginTop: 26, flexWrap: "wrap" }}>
          <button
            onClick={generateReport}
            style={{
              background: gold, color: "#1B1F3B", border: "none", borderRadius: 10, padding: "11px 18px",
              fontWeight: 700, fontSize: 14, cursor: "pointer",
            }}
          >
            Generate report
          </button>
          <div style={{ marginLeft: "auto", fontSize: 12, color: inkDim, alignSelf: "center" }}>
            {saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved" : ""}
          </div>
        </div>

        {showReport && (
          <div className="print-area" style={{ background: bgCard, border: `1px solid ${line}`, borderRadius: 14, padding: 18, marginTop: 16 }}>
            <div className="no-print" style={{ display: "flex", gap: 8, marginBottom: 10, justifyContent: "flex-end" }}>
              <button
                onClick={copyReport}
                style={{ display: "flex", alignItems: "center", gap: 6, background: bgCard2, color: ink, border: `1px solid ${line}`, borderRadius: 8, padding: "7px 12px", fontSize: 13, cursor: "pointer" }}
              >
                {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? "Copied" : "Copy"}
              </button>
              <button
                onClick={() => window.print()}
                style={{ display: "flex", alignItems: "center", gap: 6, background: bgCard2, color: ink, border: `1px solid ${line}`, borderRadius: 8, padding: "7px 12px", fontSize: 13, cursor: "pointer" }}
              >
                <Printer size={14} /> Print / Save PDF
              </button>
            </div>
            <pre className="mono" style={{ whiteSpace: "pre-wrap", fontSize: 12.5, lineHeight: 1.6, margin: 0, color: ink }}>
              {reportText}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryCard({ icon, label, value, accent }) {
  return (
    <div style={{ background: bgCard, border: `1px solid ${line}`, borderRadius: 12, padding: "12px 14px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, color: accent, marginBottom: 6 }}>
        {icon}
        <span style={{ fontSize: 11.5, color: inkDim, textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</span>
      </div>
      <div className="mono" style={{ fontSize: 17, fontWeight: 600 }}>{value}</div>
    </div>
  );
}

function Section({ title, subtitle, children }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{ marginBottom: 10 }}>
        <h2 className="lbl-font" style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>{title}</h2>
        {subtitle && <div style={{ fontSize: 12, color: inkDim, marginTop: 2 }}>{subtitle}</div>}
      </div>
      <div style={{ background: bgCard, border: `1px solid ${line}`, borderRadius: 12, padding: 14 }}>{children}</div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label style={{ fontSize: 11.5, color: inkDim, display: "block", marginBottom: 4 }}>{label}</label>
      {children}
    </div>
  );
}

function TableHeader({ cols }) {
  return (
    <div className="no-print" style={{ display: "grid", gridTemplateColumns: `1.3fr repeat(${cols.length - 2}, 1fr) 30px`, gap: 8, marginBottom: 8, fontSize: 11, color: inkDim, textTransform: "uppercase", letterSpacing: "0.03em" }}>
      {cols.map((c, i) => (
        <div key={i}>{c}</div>
      ))}
    </div>
  );
}

function RowEditor({ children, onRemove }) {
  const count = React.Children.count(children);
  return (
    <div className="rowbtn" style={{ display: "grid", gridTemplateColumns: `1.3fr repeat(${count - 2}, 1fr) 30px`, gap: 8, alignItems: "center", padding: "4px 2px", borderRadius: 8 }}>
      {children}
      <button
        className="no-print"
        onClick={onRemove}
        style={{ background: "transparent", border: "none", color: coral, cursor: "pointer", display: "flex", justifyContent: "center" }}
        title="Remove row"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}

function TotalsRow({ cols }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: `1.3fr repeat(${cols.length - 2}, 1fr) 30px`, gap: 8, marginTop: 8, paddingTop: 8, borderTop: `1px solid ${line}`, fontSize: 13, fontWeight: 700 }}>
      {cols.map((c, i) => (
        <div key={i} className="mono">{c}</div>
      ))}
    </div>
  );
}

function AddRowButton({ onClick, label }) {
  return (
    <button
      className="no-print rowbtn"
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 6, background: "transparent",
        border: `1px dashed ${line}`, borderRadius: 8, padding: "7px 10px", color: inkDim,
        fontSize: 12.5, cursor: "pointer", marginTop: 6, width: "100%", justifyContent: "center",
      }}
    >
      <Plus size={13} /> {label}
    </button>
  );
}
