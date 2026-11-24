// Nacht-Buendel dokument-upload 28.09.2026: reine Logik des Dokument-Uploads,
// getrennt von wwElement.vue, damit vitest sie ohne Vue pruefen kann.
//
// SW-3: Der CHECK employee_documents_category_check kennt live nur
// Arbeitsvertrag, Ausweiskopie, Zeugnis, Lohnabrechnung, Sonstiges
// (supabase/scripts/check-constraints.txt Z. 50, per SELECT am 28.09.2026 bestaetigt).
// Die drei Policen-Kategorien der Oberflaeche gehen darum als «Sonstiges» in die
// Datenbank. Der Policentyp bleibt als Praefix «[KTG-Police] » in file_name stehen:
// employee_documents hat keine andere passende Textspalte (user_display_name ist
// der Name der hochladenden Person). Die Liste liest das Praefix wieder heraus.
//
// SW-4: Bei personenbezogenen Kategorien waehlt die Kundin die Person, employee_id
// wird mitgeschrieben. So erscheint das Dokument in der Personenakte
// (personaldossier-detail filtert employee_documents?employee_id=eq.<id>).
//
// T1-36: Storage antwortet beim Signieren mit einem Pfad relativ zu /storage/v1
// («/object/sign/…»). Ohne Praefix oeffnet sich ein Tab mit
// {"error":"requested path is invalid"}. Muster aus beratung-raum.

/** Werte, die der DB-CHECK erlaubt */
export const DB_CATEGORIES = ['Arbeitsvertrag', 'Ausweiskopie', 'Zeugnis', 'Lohnabrechnung', 'Sonstiges'];
/** Oberflaechen-Kategorien, die als «Sonstiges» gespeichert werden (Betriebsdokumente) */
export const POLICY_CATEGORIES = ['SUVA-Police', 'KTG-Police', 'BVG-Police'];
/** Kategorien, bei denen eine Person Pflicht ist */
export const PERSON_REQUIRED_CATEGORIES = ['Ausweiskopie', 'Zeugnis', 'Lohnabrechnung'];
/** Kategorien, bei denen eine Person gewaehlt werden kann (Pflicht oder freiwillig) */
export const PERSON_CATEGORIES = PERSON_REQUIRED_CATEGORIES.concat(['Sonstiges']);

const POLICY_PREFIX_RE = /^\[(SUVA-Police|KTG-Police|BVG-Police)\]\s*/;

/** Oberflaechen-Kategorie -> Wert fuer die Spalte category (immer im CHECK) */
export function dbCategoryFor(uiCategory) {
  const c = String(uiCategory || '');
  return DB_CATEGORIES.includes(c) ? c : 'Sonstiges';
}

/** Wert fuer file_name: bei Policen mit Typ-Praefix, sonst der Originalname */
export function dbFileNameFor(uiCategory, originalName) {
  const name = String(originalName || 'datei');
  const c = String(uiCategory || '');
  return POLICY_CATEGORIES.includes(c) ? `[${c}] ${name}` : name;
}

/** Anzeige einer DB-Zeile: { category, name }, Policentyp aus dem Praefix */
export function parseDocLabel(doc) {
  const fileName = String((doc && doc.file_name) || '');
  const category = String((doc && doc.category) || '');
  const m = fileName.match(POLICY_PREFIX_RE);
  if (m) return { category: m[1], name: fileName.slice(m[0].length) || fileName };
  return { category, name: fileName };
}

/** Personenwahl sichtbar? */
export function personFieldVisible(uiCategory) {
  return PERSON_CATEGORIES.includes(String(uiCategory || ''));
}

/** Person Pflicht? */
export function personRequired(uiCategory) {
  return PERSON_REQUIRED_CATEGORIES.includes(String(uiCategory || ''));
}

/**
 * Prueft die Personenwahl vor dem Upload.
 * Pflicht greift nur, wenn die Liste der Mitarbeitenden geladen werden konnte:
 * scheitert der Aufruf, blockieren wir den Upload nicht (die Person laesst sich
 * spaeter in der Akte zuordnen), sagen es aber im Hinweis.
 * @returns {object} Fehlerobjekt, leer = alles gut
 */
export function validatePerson({ category, employeeId, employeesLoaded, employeeCount }) {
  const e = {};
  if (personRequired(category) && employeesLoaded && !employeeId) {
    e.employee = employeeCount
      ? 'Bitte wähle aus, zu welcher Person das Dokument gehört.'
      : 'Für diese Kategorie braucht es eine erfasste Person. Lege sie zuerst unter «Mitarbeitende» an.';
  }
  return e;
}

/** Insert-Body fuer employee_documents: category immer im CHECK, employee_id mitgeschrieben */
export function buildInsertPayload({ userId, filePath, mime, file, category, employeeId }) {
  const f = file || {};
  return {
    user_id:         userId,
    file_name:       dbFileNameFor(category, f.name),
    file_path:       filePath,
    file_size_bytes: typeof f.size === 'number' ? f.size : null,
    mime_type:       mime,
    category:        dbCategoryFor(category),
    employee_id:     (personFieldVisible(category) && employeeId) ? String(employeeId) : null,
  };
}

/** Mitarbeitende aus get_user_employees in { id, name } umformen */
export function mapEmployees(rows) {
  return (Array.isArray(rows) ? rows : [])
    .filter((r) => r && r.id)
    .map((r) => ({
      id: String(r.id),
      name: [r.firstname, r.lastname].map((x) => String(x || '').trim()).filter(Boolean).join(' ') || 'Ohne Namen',
    }));
}

export const MSG_DB_REMOVED =
  'Das Dokument konnte nicht gespeichert werden. Die Datei wurde wieder entfernt. Bitte versuche es nochmal.';
export const MSG_DB_STUCK =
  'Das Dokument konnte nicht gespeichert werden und erscheint nicht in der Liste. Die Datei liegt noch im Speicher. Bitte versuche es nochmal oder melde dich beim imploya-Support.';
export const MSG_DB_UNKNOWN =
  'Die Verbindung ist beim Speichern abgebrochen. Wir wissen nicht sicher, ob das Dokument gespeichert wurde. Schaue bitte in der Liste unten nach, bevor du es nochmal hochlädst.';

/**
 * Metadaten-Zeile schreiben und das Ergebnis ehrlich auswerten.
 * - 2xx: die Zeile ist geschrieben (auch wenn der Body leer bleibt, dann ohne id).
 * - Ablehnung (4xx/5xx): nichts gespeichert, Datei im Storage wieder entfernen.
 * - Abbruch (Netz/Timeout): Zustand unbekannt, Datei NICHT loeschen (die Zeile
 *   koennte existieren und zeigte sonst ins Leere).
 * @param {() => Promise<Response>} insert
 * @param {() => Promise<boolean>}  remove  true = Datei entfernt
 * @returns {Promise<{ ok: boolean, row: object|null, status: number|null, removed: boolean|null, message: string }>}
 */
export async function saveMetadata({ insert, remove }) {
  let res;
  try {
    res = await insert();
  } catch (e) {
    return { ok: false, row: null, status: null, removed: null, message: MSG_DB_UNKNOWN };
  }
  const status = res ? res.status : null;
  if (res && res.ok) {
    const body = await (typeof res.json === 'function' ? res.json() : Promise.resolve(null)).catch(() => null);
    const row = Array.isArray(body) && body[0] ? body[0] : (body && !Array.isArray(body) && body.id ? body : null);
    return { ok: true, row, status, removed: null, message: '' };
  }
  let removed = false;
  try { removed = !!(await remove()); } catch (e) { removed = false; }
  return { ok: false, row: null, status, removed, message: removed ? MSG_DB_REMOVED : MSG_DB_STUCK };
}

/** Signierten Pfad der Storage-API zu einer vollen Adresse machen (T1-36) */
export function signedUrlFull(baseUrl, rel) {
  const r = String(rel || '');
  if (!r) return '';
  if (/^https?:\/\//i.test(r)) return r;
  const base = String(baseUrl || '').replace(/\/+$/, '');
  const path = r.startsWith('/') ? r : `/${r}`;
  return `${base}${path.indexOf('/storage/v1') === 0 ? path : `/storage/v1${path}`}`;
}

// ─── Versicherungspolice: nur auslesen, nicht still speichern (28.09.2026) ───
// Wie Einrichtung Schritt 4: extract-insurance-data mit nur_auslesen:true.
// Die Werte werden nur angezeigt; uebernommen werden sie unter
// Betrieb › Versicherungen.

export const INSURANCE_LABELS = {
  ktg_versicherer: 'Versicherer (KTG)',
  ktg_police_nr: 'Police-Nr. (KTG)',
  ktg_pct: 'Prämiensatz (KTG)',
  ktg_wartezeit_tage: 'Wartefrist (KTG)',
  uvg_versicherer: 'Versicherer (UVG)',
  uvg_police_nr: 'Police-Nr. (UVG)',
  nbu_pct: 'Prämiensatz (NBU)',
  bvg_versicherer: 'Versicherer (BVG)',
  bvg_police_nr: 'Police-Nr. (BVG)',
  bvg_pct: 'Beitragssatz (BVG)',
};

export const MSG_POLICE_NUR_GELESEN =
  'Emily hat diese Werte aus der Police gelesen. Gespeichert ist noch nichts. Prüfe sie und trage sie unter Betrieb › Versicherungen ein.';

export function buildExtractBody({ file_base64, mime_type, insurance_type }) {
  return { file_base64, mime_type: mime_type || 'application/pdf', insurance_type, nur_auslesen: true };
}

/** Erkannte Werte als Liste { feld, label, wert } fuer die Anzeige; leere fallen weg. */
export function ausgeleseneWerte(fields) {
  if (!fields || typeof fields !== 'object') return [];
  return Object.keys(fields)
    .filter((k) => fields[k] !== null && fields[k] !== undefined && String(fields[k]).trim() !== '')
    .map((k) => {
      const v = fields[k];
      let wert = String(v);
      if (/_pct$/.test(k)) wert = `${v} %`;
      else if (k === 'ktg_wartezeit_tage') wert = `${v} Tage`;
      return { feld: k, label: INSURANCE_LABELS[k] || k, wert };
    });
}

// ─── A7 (14.11.2026) W11: Umlaute im Dateinamen, Grund des Fehlers ───────────
// Der Speicher nimmt nur ASCII-Schluessel an. Umlaute, Gedankenstrich und «&» im Dateinamen
// liessen den Upload scheitern. Der Pfad wird aus einem sicheren Namen gebaut, angezeigt wird der
// Originalname (file_name). Gleiche Fassung wie in coded-component-personaldossier-detail.
export function sichererDateiname(name) {
  const roh = String(name || '').normalize('NFC').trim();
  const m = roh.match(/\.([A-Za-z0-9]{1,8})$/);
  const endung = m ? `.${m[1].toLowerCase()}` : '';
  let basis = (m ? roh.slice(0, -m[0].length) : roh)
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue')
    .replace(/Ä/g, 'Ae').replace(/Ö/g, 'Oe').replace(/Ü/g, 'Ue').replace(/ß/g, 'ss')
    .replace(/&/g, ' und ')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9._-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^[_.-]+|[_.-]+$/g, '');
  basis = basis.slice(0, 80).replace(/[_.-]+$/g, '');
  return `${basis || 'datei'}${endung}`;
}

/** Grund eines fehlgeschlagenen Uploads in einem Satz (Du-Form). Nie Rohtext des Speichers. */
export function uploadFehlerText(status, meldung) {
  const m = String(meldung || '').toLowerCase();
  if (status === 413 || /maximum allowed size|too large|payload too/.test(m)) return 'Die Datei ist zu gross. Der Speicher nimmt höchstens 10 MB.';
  if (status === 415 || /mime|unsupported/.test(m)) return 'Dieses Dateiformat nimmt der Speicher nicht an. Es gehen PDF, JPG, PNG und DOCX.';
  if (/invalid key|invalidkey|invalid.*(name|path)/.test(m)) return 'Der Dateiname enthält Zeichen, die der Speicher nicht annimmt. Benenne die Datei um und versuche es bitte nochmal.';
  if (status === 404 || /bucket not found/.test(m)) return 'Der Dokumenten-Speicher ist gerade nicht bereit. Versuche es später bitte nochmal.';
  if (status >= 500) return 'Der Speicher antwortet gerade nicht. Versuche es in ein paar Minuten bitte nochmal.';
  return `Das Hochladen hat nicht geklappt (Fehler ${status || '?'}). Versuche es bitte nochmal.`;
}

// A-013 G5b-15: Nach dem Vertrags-Import muss das Dokument der Person zugeordnet werden.
// Das PATCH wird abgewartet. Scheitert es, bekommt die Kundin einen festen Satz (nie Rohtext);
// im Log steht nur der Statuscode.
export const MSG_ZUORDNUNG_FEHLT = 'Das Dokument ist nicht in der Akte gelandet. Du kannst es erneut zuordnen oder in der Akte ablegen.';

export async function dokumentZuordnen({ authedFetch, baseUrl, headers, docId, employeeId }) {
  try {
    const r = await authedFetch(
      `${baseUrl}/rest/v1/employee_documents?id=eq.${encodeURIComponent(docId)}`,
      {
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify({ employee_id: employeeId }),
      }
    );
    if (r && r.ok) return { ok: true };
    console.warn('[dokument-upload] Zuordnung Dokument/Person: HTTP ' + (r && r.status ? r.status : '?'));
  } catch (e) {
    console.warn('[dokument-upload] Zuordnung Dokument/Person: Netzfehler');
  }
  return { ok: false, satz: MSG_ZUORDNUNG_FEHLT };
}

// Erfolgstitel nach dem Import; solange die Zuordnung offen ist, nicht «fertig» melden.
export function importTitel({ created, zuordnungOffen }) {
  const basis = 'Mitarbeiter ' + (created ? 'angelegt' : 'aktualisiert');
  return zuordnungOffen ? basis + ', Dokument noch nicht zugeordnet' : basis;
}
