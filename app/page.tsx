'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

/* ─── Types ──────────────────────────────────────────────────── */
type Role = 'bot' | 'user';

interface Message {
  id: number;
  role: Role;
  text: string;
  chips?: string[];
  isStatus?: boolean;
}

interface FormData {
  userType?: 'owner' | 'customer';
  // owner fields
  ownerIntent?: 'sell' | 'rent';
  address?: string;
  coordinates?: { lat: number; lng: number };
  priceExpectation?: number;
  buildYear?: number;
  sizeSqm?: number;
  rooms?: number;
  baths?: number;
  parking?: number;
  // customer fields
  customerIntent?: 'buy' | 'rent';
  targetLocation?: string;
  maxBudget?: number;
  minSizeSqm?: number;
  minRooms?: number;
  searchRadiusKm?: number;
}

type Step =
  | 'INIT'
  | 'OWNER_INTENT' | 'OWNER_ADDRESS' | 'OWNER_PRICE' | 'OWNER_BUILD_YEAR'
  | 'OWNER_SIZE' | 'OWNER_ROOMS' | 'OWNER_BATHS' | 'OWNER_PARKING'
  | 'CUSTOMER_INTENT' | 'CUSTOMER_LOCATION' | 'CUSTOMER_BUDGET'
  | 'CUSTOMER_SIZE' | 'CUSTOMER_ROOMS' | 'CUSTOMER_RADIUS';

interface PropertyRecord {
  id: string;
  intent: 'sell' | 'rent';
  address: string;
  priceExpectation: number;
  buildYear: number;
  sizeSqm: number;
  rooms: number;
  baths: number;
  parking: number;
}

/* ─── Helpers ────────────────────────────────────────────────── */
let _id = 0;
const nextId = () => ++_id;
const INIT_MSG = (): Message =>
  botMsg('Welcome! Are you a property **Owner** looking to list, or a **Customer** looking for an apartment?', ['Owner', 'Customer']);

function botMsg(text: string, chips?: string[]): Message {
  return { id: nextId(), role: 'bot', text, chips };
}
function userMsg(text: string): Message {
  return { id: nextId(), role: 'user', text };
}
function statusMsg(text: string): Message {
  return { id: nextId(), role: 'bot', text, isStatus: true };
}

function parsePositiveNumber(raw: string): number | null {
  const n = parseFloat(raw.replace(/[, ]/g, ''));
  return isNaN(n) || n < 0 ? null : n;
}
function parsePositiveInt(raw: string): number | null {
  const n = parseInt(raw, 10);
  return isNaN(n) || n < 0 ? null : n;
}
function parseYear(raw: string): number | null {
  const n = parseInt(raw, 10);
  const year = new Date().getFullYear();
  return isNaN(n) || n < 1800 || n > year ? null : n;
}
function fmtNum(n: number) {
  return n.toLocaleString();
}

function propertyTable(props: PropertyRecord[]): string {
  if (!props.length) return 'No properties listed yet.';
  return props
    .map((p, i) => {
      const intent = p.intent ? p.intent.toUpperCase() : '?';
      const price = typeof p.priceExpectation === 'number' ? fmtNum(p.priceExpectation) : p.priceExpectation ?? '?';
      const size = p.sizeSqm != null ? `${p.sizeSqm} sqm` : '? sqm';
      return (
        `${i + 1}. [${intent}] ${p.address ?? '?'}\n` +
        `   Price: ${price} · ${size} · ${p.rooms ?? '?'} rooms · ${p.baths ?? '?'} bath(s) · ${p.parking ?? '?'} parking · Built ${p.buildYear ?? '?'}`
      );
    })
    .join('\n\n');
}

/* ─── Component ──────────────────────────────────────────────── */
export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([INIT_MSG()]);
  const [step, setStep] = useState<Step>('INIT');
  const [form, setForm] = useState<FormData>({});
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const push = useCallback((...msgs: Message[]) => {
    setMessages((prev) => [...prev, ...msgs]);
  }, []);

  const removeStatus = useCallback(() => {
    setMessages((prev) => prev.filter((m) => !m.isStatus));
  }, []);

  const clearChips = useCallback(() => {
    setMessages((prev) => prev.map((m) => (m.chips ? { ...m, chips: undefined } : m)));
  }, []);

  /* ── restart the loop ── */
  const restart = useCallback(() => {
    setForm({});
    setStep('INIT');
    push(botMsg('─────────────────────────────────'),
      INIT_MSG());
  }, [push]);

  /* ── address validation ── */
  async function validateAddress(address: string) {
    const res = await fetch('/api/validate-address', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address }),
    });
    const data = await res.json();
    if (data.valid) return { ok: true, formatted: data.formatted_address as string, lat: data.lat as number, lng: data.lng as number };
    return { ok: false, formatted: '', lat: 0, lng: 0 };
  }

  /* ── save owner ── */
  async function saveOwner(f: FormData) {
    await fetch('/api/save-property', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(f),
    });
  }

  /* ── fetch all properties ── */
  async function fetchAllProperties(): Promise<PropertyRecord[]> {
    const res = await fetch('/api/properties');
    const data = await res.json();
    return data.properties;
  }

  /* ── save customer & match ── */
  async function saveCustomer(f: FormData): Promise<{ matches: PropertyRecord[] }> {
    const res = await fetch('/api/save-preference', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(f),
    });
    return res.json();
  }

  /* ── main handler ── */
  async function handleSend(raw: string) {
    const text = raw.trim();
    if (!text || busy) return;

    setInput('');
    setBusy(true);
    push(userMsg(text));
    clearChips();

    const lower = text.toLowerCase();

    /* INIT */
    if (step === 'INIT') {
      if (lower.includes('owner')) {
        setForm({ userType: 'owner' });
        push(botMsg('Do you want to **sell** your apartment or list it for **rent**?', ['Sell', 'Rent']));
        setStep('OWNER_INTENT');
      } else if (lower.includes('customer')) {
        setForm({ userType: 'customer' });
        push(botMsg('Are you looking to **buy** an apartment or **rent** one?', ['Buy', 'Rent']));
        setStep('CUSTOMER_INTENT');
      } else {
        push(botMsg('Please choose: **Owner** (to list a property) or **Customer** (to search).', ['Owner', 'Customer']));
      }
      setBusy(false); return;
    }

    /* ── OWNER FLOW ── */
    if (step === 'OWNER_INTENT') {
      const intent: 'sell' | 'rent' = lower.includes('sell') ? 'sell' : 'rent';
      setForm((f) => ({ ...f, ownerIntent: intent }));
      push(botMsg('Please provide the full address of the property (street, city, country — Google Maps compatible).'));
      setStep('OWNER_ADDRESS');
      setBusy(false); return;
    }

    if (step === 'OWNER_ADDRESS') {
      push(statusMsg('Validating address with Google Maps...'));
      const result = await validateAddress(text);
      removeStatus();
      if (!result.ok) {
        push(botMsg("I couldn't verify that address on Google Maps. Please check the spelling or provide a more specific street address."));
      } else {
        setForm((f) => ({ ...f, address: result.formatted, coordinates: { lat: result.lat, lng: result.lng } }));
        const priceQ = form.ownerIntent === 'sell'
          ? 'What is your **asking price**? (enter a number, e.g. 850000)'
          : 'What is your **monthly rent expectation**? (enter a number, e.g. 2500)';
        push(botMsg(`✓ Address confirmed: ${result.formatted}\n\n${priceQ}`));
        setStep('OWNER_PRICE');
      }
      setBusy(false); return;
    }

    if (step === 'OWNER_PRICE') {
      const n = parsePositiveNumber(text);
      if (n === null) {
        const label = form.ownerIntent === 'sell' ? 'asking price' : 'monthly rent';
        push(botMsg(`Please enter a valid number for the ${label} (e.g. 850000).`));
        setBusy(false); return;
      }
      setForm((f) => ({ ...f, priceExpectation: n }));
      push(botMsg('What is the **build year** of the property? (e.g. 2005)'));
      setStep('OWNER_BUILD_YEAR');
      setBusy(false); return;
    }

    if (step === 'OWNER_BUILD_YEAR') {
      const n = parseYear(text);
      if (n === null) {
        push(botMsg(`Please enter a valid 4-digit build year between 1800 and ${new Date().getFullYear()}.`));
        setBusy(false); return;
      }
      setForm((f) => ({ ...f, buildYear: n }));
      push(botMsg('What is the **size** of the apartment in **square metres** (sqm)? (e.g. 95)'));
      setStep('OWNER_SIZE');
      setBusy(false); return;
    }

    if (step === 'OWNER_SIZE') {
      const n = parsePositiveNumber(text);
      if (n === null) {
        push(botMsg('Please enter a valid size in square metres (e.g. 95).'));
        setBusy(false); return;
      }
      setForm((f) => ({ ...f, sizeSqm: n }));
      push(botMsg('How many **rooms** does the apartment have? (e.g. 3)'));
      setStep('OWNER_ROOMS');
      setBusy(false); return;
    }

    if (step === 'OWNER_ROOMS') {
      const n = parsePositiveInt(text);
      if (n === null) {
        push(botMsg('Please enter a whole number for the number of rooms (e.g. 3).'));
        setBusy(false); return;
      }
      setForm((f) => ({ ...f, rooms: n }));
      push(botMsg('How many **bathrooms**? (e.g. 2)'));
      setStep('OWNER_BATHS');
      setBusy(false); return;
    }

    if (step === 'OWNER_BATHS') {
      const n = parsePositiveInt(text);
      if (n === null) {
        push(botMsg('Please enter a whole number for the number of bathrooms (e.g. 2).'));
        setBusy(false); return;
      }
      setForm((f) => ({ ...f, baths: n }));
      push(botMsg('How many **parking spaces** are included? (enter 0 if none)'));
      setStep('OWNER_PARKING');
      setBusy(false); return;
    }

    if (step === 'OWNER_PARKING') {
      const n = parsePositiveInt(text);
      if (n === null) {
        push(botMsg('Please enter a whole number for parking spaces (e.g. 1, or 0 if none).'));
        setBusy(false); return;
      }
      const finalForm = { ...form, parking: n };
      setForm(finalForm);
      await saveOwner(finalForm);

      // Fetch and display all listed properties
      const allProps = await fetchAllProperties();
      const tableText = propertyTable(allProps);
      push(
        botMsg('✅ Your property has been saved successfully!\n\n**All listed properties:**\n\n' + tableText)
      );

      // Short pause then restart
      setTimeout(() => {
        setBusy(false);
        restart();
      }, 400);
      return;
    }

    /* ── CUSTOMER FLOW ── */
    if (step === 'CUSTOMER_INTENT') {
      const intent: 'buy' | 'rent' = lower.includes('buy') ? 'buy' : 'rent';
      setForm((f) => ({ ...f, customerIntent: intent }));
      push(botMsg('Which city, neighbourhood, or specific address are you targeting?'));
      setStep('CUSTOMER_LOCATION');
      setBusy(false); return;
    }

    if (step === 'CUSTOMER_LOCATION') {
      push(statusMsg('Validating location with Google Maps...'));
      const result = await validateAddress(text);
      removeStatus();
      if (!result.ok) {
        push(botMsg("I couldn't verify that location on Google Maps. Please check the spelling or be more specific."));
      } else {
        setForm((f) => ({ ...f, targetLocation: result.formatted, coordinates: { lat: result.lat, lng: result.lng } }));
        const budgetQ = form.customerIntent === 'buy'
          ? 'What is your **maximum budget**? (enter a number, e.g. 900000)'
          : 'What is your **maximum monthly rent**? (enter a number, e.g. 3000)';
        push(botMsg(`✓ Location confirmed: ${result.formatted}\n\n${budgetQ}`));
        setStep('CUSTOMER_BUDGET');
      }
      setBusy(false); return;
    }

    if (step === 'CUSTOMER_BUDGET') {
      const n = parsePositiveNumber(text);
      if (n === null) {
        push(botMsg('Please enter a valid number for your budget (e.g. 900000).'));
        setBusy(false); return;
      }
      setForm((f) => ({ ...f, maxBudget: n }));
      push(botMsg('What is your **minimum size requirement** in sqm? (e.g. 60)'));
      setStep('CUSTOMER_SIZE');
      setBusy(false); return;
    }

    if (step === 'CUSTOMER_SIZE') {
      const n = parsePositiveNumber(text);
      if (n === null) {
        push(botMsg('Please enter a valid size in square metres (e.g. 60).'));
        setBusy(false); return;
      }
      setForm((f) => ({ ...f, minSizeSqm: n }));
      push(botMsg('What is your **minimum number of rooms**? (e.g. 2)'));
      setStep('CUSTOMER_ROOMS');
      setBusy(false); return;
    }

    if (step === 'CUSTOMER_ROOMS') {
      const n = parsePositiveInt(text);
      if (n === null) {
        push(botMsg('Please enter a whole number for minimum rooms (e.g. 2).'));
        setBusy(false); return;
      }
      setForm((f) => ({ ...f, minRooms: n }));
      push(botMsg('Within what radius would you like to search?', ['1 km', '2 km', '5 km']));
      setStep('CUSTOMER_RADIUS');
      setBusy(false); return;
    }

    if (step === 'CUSTOMER_RADIUS') {
      const km = text.includes('5') ? 5 : text.includes('2') ? 2 : 1;
      const finalForm = { ...form, searchRadiusKm: km };
      setForm(finalForm);
      const { matches } = await saveCustomer(finalForm);

      let reply: string;
      if (matches.length > 0) {
        const list = matches
          .map(
            (m, i) =>
              `${i + 1}. ${m.address}\n` +
              `   Price: ${fmtNum(m.priceExpectation)} · ${m.sizeSqm} sqm · ${m.rooms} room(s)`
          )
          .join('\n\n');
        reply =
          `✅ Preferences saved! I found **${matches.length}** matching propert${matches.length === 1 ? 'y' : 'ies'} within **${km} km**:\n\n${list}\n\nWould you like me to connect you with the owner(s)?`;
      } else {
        reply = `✅ Preferences saved! No properties currently match your criteria within **${km} km**, but we will notify you as soon as one is listed!`;
      }
      push(botMsg(reply));

      setTimeout(() => {
        setBusy(false);
        restart();
      }, 400);
      return;
    }

    setBusy(false);
  }

  return (
    <div className="flex flex-col h-screen bg-[#212121] text-white font-sans">
      {/* Header */}
      <header className="flex items-center justify-center h-14 border-b border-white/10 shrink-0">
        <span className="text-base font-semibold tracking-wide text-white/80">Real Estate Assistant</span>
      </header>

      {/* Messages */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
          {messages.map((m) => (
            <div key={m.id} className={`flex flex-col gap-2 ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
              {m.text === '─────────────────────────────────' ? (
                <div className="w-full border-t border-white/10 my-1" />
              ) : (
                <div
                  className={`
                    max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap
                    ${m.role === 'user'
                      ? 'bg-[#2f2f2f] text-white'
                      : m.isStatus
                      ? 'text-white/40 italic text-xs'
                      : 'text-white'
                    }
                  `}
                >
                  {m.role === 'bot' && !m.isStatus && (
                    <span className="block text-xs font-semibold text-green-400 mb-1">Assistant</span>
                  )}
                  <BotText text={m.text} />
                </div>
              )}

              {m.chips && m.chips.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {m.chips.map((chip) => (
                    <button
                      key={chip}
                      onClick={() => handleSend(chip)}
                      disabled={busy}
                      className="px-4 py-1.5 rounded-full border border-white/25 text-sm text-white/80 hover:bg-white/10 transition-colors disabled:opacity-40 cursor-pointer"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      </main>

      {/* Input */}
      <div className="shrink-0 border-t border-white/10 px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-3 bg-[#2f2f2f] rounded-2xl px-4 py-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(input); } }}
            placeholder="Message Real Estate Assistant..."
            disabled={busy}
            className="flex-1 bg-transparent outline-none text-sm text-white placeholder-white/30 disabled:opacity-40"
          />
          <button
            onClick={() => handleSend(input)}
            disabled={!input.trim() || busy}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-white text-black disabled:opacity-20 transition-opacity cursor-pointer"
            aria-label="Send"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
              <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
            </svg>
          </button>
        </div>
        <p className="text-center text-xs text-white/20 mt-2">Real Estate Assistant · Prototype</p>
      </div>
    </div>
  );
}

/* ── Minimal markdown: bold **text** ── */
function BotText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith('**') && part.endsWith('**')
          ? <strong key={i}>{part.slice(2, -2)}</strong>
          : <span key={i}>{part}</span>
      )}
    </>
  );
}
