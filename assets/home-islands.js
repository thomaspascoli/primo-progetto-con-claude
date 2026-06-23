// Home interactive islands — buildless React via ESM + htm.
// Served as text/javascript by the static server; no build step.
import React, { useState, useMemo, useRef, useEffect } from 'https://esm.sh/react@18.3.1';
import { createRoot } from 'https://esm.sh/react-dom@18.3.1/client';
import htm from 'https://esm.sh/htm@3.1.1';

const html = htm.bind(React.createElement);
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const eur = (n) =>
  new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(Math.round(n));

/* ───────────────────────── 1. Servizi — explorer a due colonne ───────────────────────── */
const SERVICES = [
  {
    k: 'A', t: 'Gestione patrimoniale',
    lead: "Strategie d'investimento costruite sul profilo della famiglia, non su un prodotto.",
    points: ['Asset allocation su misura', 'Selezione gestori in architettura aperta', 'Controllo del rischio e dei costi', 'Reporting chiaro e periodico'],
  },
  {
    k: 'B', t: 'Pianificazione successoria',
    lead: 'Trasmissione ordinata della ricchezza, tra tutela degli eredi ed equilibrio fiscale.',
    points: ['Mappatura del patrimonio e degli eredi', 'Testamento e disposizioni', 'Ottimizzazione fiscale del passaggio', 'Donazioni e polizze dedicate'],
  },
  {
    k: 'C', t: 'Strutture e governance',
    lead: 'Holding, trust e patti di famiglia per dare forma e regole al patrimonio.',
    points: ['Holding di famiglia', 'Trust e vincoli di destinazione', 'Patti di famiglia e governance', "Continuità e tutela d'impresa"],
  },
  {
    k: 'D', t: 'Filantropia',
    lead: 'Veicoli dedicati per dare continuità ai valori, oltre al capitale.',
    points: ['Fondazioni e fondi dedicati', 'Donazioni strutturate', 'Impact investing', 'Coinvolgimento delle nuove generazioni'],
  },
];

function ServicesExplorer() {
  const [active, setActive] = useState(0);
  const s = SERVICES[active];
  const onKey = (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { e.preventDefault(); setActive((active + 1) % SERVICES.length); }
    if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { e.preventDefault(); setActive((active - 1 + SERVICES.length) % SERVICES.length); }
  };
  return html`
    <div class="xp">
      <div class="xp__rail" role="tablist" aria-label="Aree di servizio" onKeyDown=${onKey}>
        ${SERVICES.map((it, i) => html`
          <button key=${it.k} class="xp__tab" role="tab" id=${'xp-tab-' + i}
            aria-selected=${i === active} aria-controls="xp-panel" tabindex=${i === active ? 0 : -1}
            onClick=${() => setActive(i)}>
            <span class="k">${it.k}</span>${it.t}
          </button>`)}
      </div>
      <div class="xp__panel" id="xp-panel" role="tabpanel" aria-labelledby=${'xp-tab-' + active}>
        <div class=${reduce ? '' : 'xp__fade'} key=${active}>
          <h3>${s.t}</h3>
          <p class="lead">${s.lead}</p>
          <ul class="xp__points">
            ${s.points.map((p) => html`<li key=${p}>${p}</li>`)}
          </ul>
        </div>
      </div>
    </div>`;
}

/* ───────────────────────── 2. Simulatore di proiezione generazionale ───────────────────────── */
const PT = 16, PB = 250, PL = 12, PR = 628, VBW = 640, VBH = 286;

function project(capital, ratePct, years, drawPct) {
  const draw = (drawPct / 100) * capital;
  const out = [capital];
  let v = capital;
  for (let y = 1; y <= years; y++) {
    v = v * (1 + ratePct / 100) - draw;
    if (v < 0) v = 0;
    out.push(v);
  }
  return out;
}

function Control({ label, value, min, max, step, onChange, fmt }) {
  return html`
    <div class="sim__control">
      <label>${label}<b>${fmt(value)}</b></label>
      <input type="range" min=${min} max=${max} step=${step} value=${value}
        aria-label=${label} onInput=${(e) => onChange(parseFloat(e.target.value))} />
    </div>`;
}

function WealthSimulator() {
  const [capital, setCapital] = useState(2000000);
  const [rate, setRate] = useState(4);     // rendimento netto "senza regia"
  const [years, setYears] = useState(25);
  const [draw, setDraw] = useState(1.5);   // prelievo annuo % del capitale
  const [hover, setHover] = useState(null);
  const svgRef = useRef(null);
  const ALPHA = 1.0; // valore aggiunto illustrativo della regia patrimoniale

  const base = useMemo(() => project(capital, rate, years, draw), [capital, rate, years, draw]);
  const regia = useMemo(() => project(capital, rate + ALPHA, years, draw), [capital, rate, years, draw]);
  const maxV = useMemo(() => Math.max(...base, ...regia, capital) * 1.06, [base, regia, capital]);

  const xs = (i) => PL + (i / years) * (PR - PL);
  const ys = (v) => PB - (v / maxV) * (PB - PT);
  const linePts = (arr) => arr.map((v, i) => `${xs(i).toFixed(1)},${ys(v).toFixed(1)}`).join(' ');
  const areaPath = (arr) => `M ${PL},${PB} L ${arr.map((v, i) => `${xs(i).toFixed(1)} ${ys(v).toFixed(1)}`).join(' L ')} L ${PR},${PB} Z`;

  const onMove = (e) => {
    const svg = svgRef.current; if (!svg) return;
    const r = svg.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * VBW;
    let i = Math.round(((x - PL) / (PR - PL)) * years);
    i = Math.max(0, Math.min(years, i));
    setHover(i);
  };

  const finalRegia = regia[years], finalBase = base[years], diff = finalRegia - finalBase;
  const yticks = [0, 0.5, 1].map((f) => f * maxV);

  return html`
    <div class="sim__grid">
      <div class="sim__controls">
        <${Control} label="Capitale iniziale" value=${capital} min=${250000} max=${20000000} step=${250000}
          onChange=${setCapital} fmt=${eur} />
        <${Control} label="Rendimento netto annuo" value=${rate} min=${2} max=${7} step=${0.1}
          onChange=${setRate} fmt=${(v) => v.toFixed(1).replace('.', ',') + '%'} />
        <${Control} label="Orizzonte" value=${years} min=${5} max=${40} step=${1}
          onChange=${setYears} fmt=${(v) => v + ' anni'} />
        <${Control} label="Prelievo annuo" value=${draw} min=${0} max=${5} step=${0.1}
          onChange=${setDraw} fmt=${(v) => v.toFixed(1).replace('.', ',') + '%'} />
        <p class="sim__note">Proiezione puramente illustrativa a rendimento costante. Non costituisce previsione né garanzia di risultato. La «regia patrimoniale» rappresenta un valore aggiunto teorico di +${ALPHA.toFixed(1).replace('.', ',')}% netto annuo da efficienza fiscale, di costo e di rischio.</p>
      </div>

      <div>
        <div class="sim__legend">
          <span class="a"><i></i>Con regia patrimoniale</span>
          <span class="b"><i></i>Senza regia</span>
        </div>
        <div class="sim__chartwrap">
          <svg ref=${svgRef} viewBox=${`0 0 ${VBW} ${VBH}`} class="sim__svg" role="img"
            aria-label=${`Proiezione del patrimonio su ${years} anni: con regia patrimoniale circa ${eur(finalRegia)}, senza regia circa ${eur(finalBase)}.`}
            onPointerMove=${onMove} onPointerLeave=${() => setHover(null)}>
            ${yticks.map((v, i) => html`<line key=${i} x1=${PL} x2=${PR} y1=${ys(v)} y2=${ys(v)} class="sim__grid-l" />`)}
            <path d=${areaPath(regia)} class="sim__area" />
            <polyline points=${linePts(base)} class="sim__line-b" />
            <polyline points=${linePts(regia)} class="sim__line-a" />
            ${hover != null && html`
              <g>
                <line x1=${xs(hover)} x2=${xs(hover)} y1=${PT} y2=${PB} class="sim__guide" />
                <circle cx=${xs(hover)} cy=${ys(base[hover])} r="3.5" class="sim__dot-b" />
                <circle cx=${xs(hover)} cy=${ys(regia[hover])} r="4" class="sim__dot-a" />
              </g>`}
          </svg>
          ${hover != null && html`
            <div class="sim__tip" style=${{ left: (xs(hover) / VBW) * 100 + '%' }}>
              <span class="yr">Anno ${hover}</span>
              <span class="a">${eur(regia[hover])}</span>
              <span class="b">${eur(base[hover])}</span>
            </div>`}
        </div>

        <div class="sim__out">
          <div class="sim__stat">
            <div class="v">${eur(finalRegia)}</div>
            <div class="l">Con regia, dopo ${years} anni</div>
          </div>
          <div class="sim__stat">
            <div class="v" style=${{ color: 'var(--smoke)' }}>${eur(finalBase)}</div>
            <div class="l">Senza regia</div>
          </div>
          <div class="sim__stat">
            <div class="v" style=${{ color: 'var(--bordeaux)' }}>+${eur(diff)}</div>
            <div class="l">Differenza nel periodo</div>
          </div>
        </div>
      </div>
    </div>`;
}

/* ───────────────────────── 3. FAQ accordion ───────────────────────── */
const FAQ = [
  ['Siete davvero indipendenti?', 'Sì. Nessun mandato di collocamento e nessuna retrocessione dai prodotti: veniamo remunerati esclusivamente dal cliente, su parcella concordata. Questo allinea i nostri interessi ai vostri.'],
  ['Quali sono i costi?', "Un onorario chiaro, definito prima dell'incarico: una parcella iniziale per l'analisi e un canone annuo legato al servizio. Nessuna commissione nascosta, nessun prodotto da vendere."],
  ['C’è un patrimonio minimo?', 'Seguiamo per scelta un numero ristretto di famiglie. Non imponiamo una soglia rigida, ma un mandato che abbia senso nel lungo periodo — in genere a partire da un patrimonio strutturato.'],
  ['Come tutelate la riservatezza?', 'Ogni informazione è trattata con riservatezza assoluta e non viene condivisa con terzi. Nessuna proposta commerciale automatica, nessun dato ceduto.'],
  ['Cosa succede al primo incontro?', 'Un colloquio conoscitivo, senza impegno: ascoltiamo la vostra storia, gli obiettivi e i vincoli della famiglia prima di formulare qualsiasi proposta.'],
];

function FaqItem({ q, a, open, onToggle, id }) {
  return html`
    <div class="faq__item" data-open=${open}>
      <button class="faq__q" aria-expanded=${open} aria-controls=${'faq-a-' + id} id=${'faq-q-' + id} onClick=${onToggle}>
        <span>${q}</span><span class="faq__icon" aria-hidden="true"></span>
      </button>
      <div class="faq__a" id=${'faq-a-' + id} role="region" aria-labelledby=${'faq-q-' + id}>
        <div><p>${a}</p></div>
      </div>
    </div>`;
}

function FaqAccordion() {
  const [open, setOpen] = useState(() => new Set([0]));
  const toggle = (i) => setOpen((prev) => {
    const next = new Set(prev);
    next.has(i) ? next.delete(i) : next.add(i);
    return next;
  });
  return html`
    <div class="faq__list">
      ${FAQ.map(([q, a], i) => html`<${FaqItem} key=${i} id=${i} q=${q} a=${a} open=${open.has(i)} onToggle=${() => toggle(i)} />`)}
    </div>`;
}

/* ───────────────────────── 0. Hero — costellazione clienti interattiva ───────────────────────── */
const CLIENTS = [
  { name: 'Elena R.', detail: 'Famiglia · 3ª generazione', img: 'https://randomuser.me/api/portraits/women/65.jpg' },
  { name: 'Marco V.', detail: 'Cliente dal 2006', img: 'https://randomuser.me/api/portraits/men/32.jpg' },
  { name: 'Giulia T.', detail: "Cessione d'azienda · 2021", img: 'https://randomuser.me/api/portraits/women/44.jpg' },
  { name: 'Henri L.', detail: 'Family office · Ginevra', img: 'https://randomuser.me/api/portraits/men/76.jpg' },
];
// Raggi/velocità/direzioni allineati alle 4 orbite SVG (unità viewBox 0..400).
const ORB = [
  { r: 150 / 400, dur: 38, dir: 1, phase: 0 },
  { r: 170 / 400, dur: 52, dir: -1, phase: -Math.PI / 2 },
  { r: 180 / 400, dur: 30, dir: 1, phase: Math.PI },
  { r: 60 / 400, dur: 18, dir: -1, phase: 0 },
];

function HeroConstellation() {
  const stageRef = useRef(null), wrapRef = useRef(null), avs = useRef([]);
  const t = useRef(0), last = useRef(null), paused = useRef(false);
  const parT = useRef({ x: 0, y: 0 }), parC = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const stage = stageRef.current; if (!stage) return;
    const setPositions = (time) => {
      const S = stage.clientWidth;
      for (let i = 0; i < avs.current.length; i++) {
        const o = ORB[i % ORB.length];
        const ang = o.phase + o.dir * (time / 1000) * (2 * Math.PI / o.dur);
        const x = Math.cos(ang) * o.r * S, y = Math.sin(ang) * o.r * S;
        const el = avs.current[i];
        if (el) el.style.transform = `translate(-50%,-50%) translate(${x.toFixed(1)}px,${y.toFixed(1)}px)`;
      }
    };
    if (reduce) { setPositions(0); return; }
    let raf;
    const loop = (ts) => {
      if (last.current == null) last.current = ts;
      const dt = ts - last.current; last.current = ts;
      if (!paused.current) t.current += dt;
      setPositions(t.current);
      // parallax con easing (segue il mouse, rientra dolcemente)
      parC.current.x += (parT.current.x - parC.current.x) * 0.08;
      parC.current.y += (parT.current.y - parC.current.y) * 0.08;
      if (wrapRef.current) wrapRef.current.style.transform = `translate(${parC.current.x.toFixed(2)}px,${parC.current.y.toFixed(2)}px)`;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const onMove = (e) => {
    if (reduce || !stageRef.current) return;
    const r = stageRef.current.getBoundingClientRect();
    parT.current = { x: (((e.clientX - r.left) / r.width) - 0.5) * -16, y: (((e.clientY - r.top) / r.height) - 0.5) * -16 };
  };
  const hold = (v) => () => { paused.current = v; };

  return html`
    <div class="hero-orbit" ref=${stageRef} onPointerMove=${onMove} onPointerLeave=${() => { parT.current = { x: 0, y: 0 }; }}>
      <div class="ho-wrap" ref=${wrapRef}>
        <svg class="abstract" viewBox="0 0 400 400" aria-hidden="true" focusable="false">
          <defs><radialGradient id="coreGlow2" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#C49A6C" stop-opacity="0.5" /><stop offset="100%" stop-color="#C49A6C" stop-opacity="0" />
          </radialGradient></defs>
          <circle class="core" cx="200" cy="200" r="80" fill="url(#coreGlow2)" />
          <g class="orbit o1"><ellipse cx="200" cy="200" rx="150" ry="150" /></g>
          <g class="orbit o2"><ellipse cx="200" cy="200" rx="110" ry="170" /></g>
          <g class="orbit o3"><ellipse cx="200" cy="200" rx="180" ry="90" /></g>
          <g class="orbit o4"><ellipse cx="200" cy="200" rx="60" ry="60" /></g>
        </svg>
        <div class="ho-avatars">
          ${CLIENTS.map((c, i) => html`
            <button class="ho-av" key=${i} type="button" ref=${(el) => (avs.current[i] = el)}
              aria-label=${c.name + ' — ' + c.detail}
              onMouseEnter=${hold(true)} onMouseLeave=${hold(false)} onFocus=${hold(true)} onBlur=${hold(false)}>
              <img src=${c.img} alt="" loading="lazy" width="46" height="46" />
              <span class="ho-card"><b>${c.name}</b><i>${c.detail}</i></span>
            </button>`)}
        </div>
      </div>
    </div>`;
}

/* ───────────────────────── mount ───────────────────────── */
[['hero-app', HeroConstellation], ['servizi-app', ServicesExplorer], ['sim-app', WealthSimulator], ['faq-app', FaqAccordion]].forEach(([id, C]) => {
  const el = document.getElementById(id);
  if (el) createRoot(el).render(html`<${C} />`);
});
