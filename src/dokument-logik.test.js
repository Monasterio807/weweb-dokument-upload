// Nacht-Buendel dokument-upload 28.09.2026: SW-3, SW-4, T1-36.
import { describe, expect, it, vi } from 'vitest';
import {
  DB_CATEGORIES,
  POLICY_CATEGORIES,
  dbCategoryFor,
  dbFileNameFor,
  parseDocLabel,
  personFieldVisible,
  personRequired,
  validatePerson,
  buildInsertPayload,
  mapEmployees,
  saveMetadata,
  signedUrlFull,
  MSG_DB_REMOVED,
  MSG_DB_STUCK,
  MSG_DB_UNKNOWN,
  MSG_POLICE_NUR_GELESEN,
  buildExtractBody,
  ausgeleseneWerte,
  sichererDateiname,
  uploadFehlerText,
  MSG_ZUORDNUNG_FEHLT,
  importTitel,
  dokumentZuordnen,
} from './dokument-logik.js';

// Live-CHECK employee_documents_category_check, per SELECT am 28.09.2026 gelesen
const LIVE_CHECK = ['Arbeitsvertrag', 'Ausweiskopie', 'Zeugnis', 'Lohnabrechnung', 'Sonstiges'];
// Alle Optionen der Kategorie-Auswahl im Template
const UI_OPTIONS = ['Arbeitsvertrag', 'Ausweiskopie', 'Zeugnis', 'Lohnabrechnung', 'SUVA-Police', 'KTG-Police', 'BVG-Police', 'Sonstiges'];

const EMP = '11111111-2222-3333-4444-555555555555';
const file = { name: 'Police 2026.pdf', size: 1234 };

function res(status, body) {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}

describe('Kategorie-Abbildung (SW-3)', () => {
  it('DB_CATEGORIES entspricht dem Live-CHECK', () => {
    expect([...DB_CATEGORIES].sort()).toEqual([...LIVE_CHECK].sort());
  });

  it('jede Option der Auswahl landet auf einem Wert im CHECK', () => {
    for (const ui of UI_OPTIONS) expect(LIVE_CHECK).toContain(dbCategoryFor(ui));
  });

  it('Policen werden zu «Sonstiges», der Rest bleibt', () => {
    for (const p of POLICY_CATEGORIES) expect(dbCategoryFor(p)).toBe('Sonstiges');
    expect(dbCategoryFor('Zeugnis')).toBe('Zeugnis');
    expect(dbCategoryFor('Arbeitsvertrag')).toBe('Arbeitsvertrag');
    expect(dbCategoryFor(undefined)).toBe('Sonstiges');
  });

  it('Policentyp bleibt als Praefix im file_name und wird in der Liste wieder gelesen', () => {
    const fn = dbFileNameFor('KTG-Police', file.name);
    expect(fn).toBe('[KTG-Police] Police 2026.pdf');
    expect(parseDocLabel({ file_name: fn, category: 'Sonstiges' })).toEqual({ category: 'KTG-Police', name: 'Police 2026.pdf' });
  });

  it('ohne Praefix bleibt Name und DB-Kategorie', () => {
    expect(dbFileNameFor('Zeugnis', 'z.pdf')).toBe('z.pdf');
    expect(parseDocLabel({ file_name: 'z.pdf', category: 'Zeugnis' })).toEqual({ category: 'Zeugnis', name: 'z.pdf' });
    expect(parseDocLabel({ file_name: '[Irgendwas] a.pdf', category: 'Sonstiges' })).toEqual({ category: 'Sonstiges', name: '[Irgendwas] a.pdf' });
  });
});

describe('Personenwahl (SW-4)', () => {
  it('Pflicht bei Ausweiskopie, Zeugnis, Lohnabrechnung; freiwillig bei Sonstiges; keine bei Policen und Vertrag', () => {
    expect(['Ausweiskopie', 'Zeugnis', 'Lohnabrechnung'].every(personRequired)).toBe(true);
    expect(personRequired('Sonstiges')).toBe(false);
    expect(personFieldVisible('Sonstiges')).toBe(true);
    for (const c of ['Arbeitsvertrag', ...POLICY_CATEGORIES]) {
      expect(personFieldVisible(c)).toBe(false);
      expect(personRequired(c)).toBe(false);
    }
  });

  it('fehlende Person bei Pflicht-Kategorie wird gemeldet', () => {
    const e = validatePerson({ category: 'Zeugnis', employeeId: '', employeesLoaded: true, employeeCount: 3 });
    expect(e.employee).toBe('Bitte wähle aus, zu welcher Person das Dokument gehört.');
  });

  it('ohne erfasste Personen verweist die Meldung auf «Mitarbeitende»', () => {
    const e = validatePerson({ category: 'Ausweiskopie', employeeId: '', employeesLoaded: true, employeeCount: 0 });
    expect(e.employee).toMatch(/Mitarbeitende/);
  });

  it('gewaehlte Person, freiwillige Kategorie oder nicht ladbare Liste blockieren nicht', () => {
    expect(validatePerson({ category: 'Zeugnis', employeeId: EMP, employeesLoaded: true, employeeCount: 1 })).toEqual({});
    expect(validatePerson({ category: 'Sonstiges', employeeId: '', employeesLoaded: true, employeeCount: 1 })).toEqual({});
    expect(validatePerson({ category: 'Zeugnis', employeeId: '', employeesLoaded: false, employeeCount: 0 })).toEqual({});
  });

  it('mapEmployees formt Namen und verwirft Zeilen ohne id', () => {
    expect(mapEmployees([{ id: EMP, firstname: ' Luca ', lastname: 'Meier' }, { id: null }, { id: 'x', firstname: '', lastname: '' }]))
      .toEqual([{ id: EMP, name: 'Luca Meier' }, { id: 'x', name: 'Ohne Namen' }]);
    expect(mapEmployees(null)).toEqual([]);
  });
});

describe('Insert-Payload', () => {
  const base = { userId: 'u1', filePath: 'u1/abc-x.pdf', mime: 'application/pdf', file };

  it('Zeugnis mit Person: employee_id gesetzt, Kategorie unveraendert', () => {
    expect(buildInsertPayload({ ...base, category: 'Zeugnis', employeeId: EMP })).toEqual({
      user_id: 'u1',
      file_name: 'Police 2026.pdf',
      file_path: 'u1/abc-x.pdf',
      file_size_bytes: 1234,
      mime_type: 'application/pdf',
      category: 'Zeugnis',
      employee_id: EMP,
    });
  });

  it('Police: Sonstiges, Praefix, keine Person auch wenn noch eine gewaehlt war', () => {
    const p = buildInsertPayload({ ...base, category: 'SUVA-Police', employeeId: EMP });
    expect(p.category).toBe('Sonstiges');
    expect(p.file_name).toBe('[SUVA-Police] Police 2026.pdf');
    expect(p.employee_id).toBeNull();
  });

  it('Sonstiges ohne Person: employee_id null', () => {
    expect(buildInsertPayload({ ...base, category: 'Sonstiges', employeeId: '' }).employee_id).toBeNull();
  });

  it('Payload nutzt nur Spalten, die employee_documents hat', () => {
    const cols = ['category', 'employee_id', 'file_name', 'file_path', 'file_size_bytes', 'id', 'mime_type', 'uploaded_at', 'user_display_name', 'user_id'];
    for (const k of Object.keys(buildInsertPayload({ ...base, category: 'KTG-Police', employeeId: '' }))) expect(cols).toContain(k);
  });
});

describe('Fehlerpfad beim Speichern der Zeile', () => {
  it('201 mit Zeile: Erfolg, nichts geloescht', async () => {
    const remove = vi.fn();
    const r = await saveMetadata({ insert: async () => res(201, [{ id: 'd1' }]), remove });
    expect(r).toMatchObject({ ok: true, row: { id: 'd1' }, status: 201 });
    expect(remove).not.toHaveBeenCalled();
  });

  it('201 ohne Body: Zeile gilt als geschrieben, Datei bleibt', async () => {
    const remove = vi.fn();
    const r = await saveMetadata({ insert: async () => res(201, []), remove });
    expect(r.ok).toBe(true);
    expect(r.row).toBeNull();
    expect(remove).not.toHaveBeenCalled();
  });

  it('CHECK-Ablehnung (400/23514): kein Erfolg, Datei entfernt, ehrliche Meldung ohne Rohtext', async () => {
    const remove = vi.fn(async () => true);
    const r = await saveMetadata({
      insert: async () => res(400, { code: '23514', message: 'new row for relation "employee_documents" violates check constraint' }),
      remove,
    });
    expect(r).toEqual({ ok: false, row: null, status: 400, removed: true, message: MSG_DB_REMOVED });
    expect(remove).toHaveBeenCalledTimes(1);
    expect(r.message).not.toMatch(/constraint|relation|23514/);
  });

  it('Ablehnung und Aufraeumen scheitert: Zustand wird benannt', async () => {
    const r = await saveMetadata({ insert: async () => res(403, {}), remove: async () => false });
    expect(r).toMatchObject({ ok: false, removed: false, message: MSG_DB_STUCK });
  });

  it('Aufraeumen wirft: gilt als nicht entfernt', async () => {
    const r = await saveMetadata({ insert: async () => res(500, {}), remove: async () => { throw new Error('x'); } });
    expect(r).toMatchObject({ ok: false, removed: false, message: MSG_DB_STUCK });
  });

  it('Abbruch (Netz/Timeout): Zustand unbekannt, Datei wird nicht geloescht', async () => {
    const remove = vi.fn();
    const r = await saveMetadata({ insert: async () => { throw Object.assign(new Error('abort'), { name: 'AbortError' }); }, remove });
    expect(r).toMatchObject({ ok: false, removed: null, message: MSG_DB_UNKNOWN });
    expect(remove).not.toHaveBeenCalled();
  });
});

describe('Download-Adresse (T1-36)', () => {
  const base = 'https://ztvqsxdudzdyqgeylujr.supabase.co';

  it('relativer Pfad bekommt /storage/v1', () => {
    expect(signedUrlFull(base, '/object/sign/employee-documents/u1/a.pdf?token=t'))
      .toBe(`${base}/storage/v1/object/sign/employee-documents/u1/a.pdf?token=t`);
  });

  it('Pfad mit /storage/v1 und volle Adresse bleiben', () => {
    expect(signedUrlFull(`${base}/`, '/storage/v1/object/sign/x')).toBe(`${base}/storage/v1/object/sign/x`);
    expect(signedUrlFull(base, `${base}/storage/v1/object/sign/x`)).toBe(`${base}/storage/v1/object/sign/x`);
  });

  it('leer bleibt leer', () => {
    expect(signedUrlFull(base, '')).toBe('');
    expect(signedUrlFull(base, undefined)).toBe('');
  });
});

describe('Versicherungspolice nur auslesen (28.09.2026)', () => {
  it('schickt nur_auslesen:true', () => {
    const b = buildExtractBody({ file_base64: 'AAA', mime_type: '', insurance_type: 'ktg' });
    expect(b).toEqual({ file_base64: 'AAA', mime_type: 'application/pdf', insurance_type: 'ktg', nur_auslesen: true });
  });
  it('zeigt erkannte Werte mit Einheit, leere fallen weg', () => {
    const w = ausgeleseneWerte({ ktg_versicherer: 'Helsana', ktg_police_nr: null, ktg_pct: 1.2, ktg_wartezeit_tage: 30 });
    expect(w).toEqual([
      { feld: 'ktg_versicherer', label: 'Versicherer (KTG)', wert: 'Helsana' },
      { feld: 'ktg_pct', label: 'Prämiensatz (KTG)', wert: '1.2 %' },
      { feld: 'ktg_wartezeit_tage', label: 'Wartefrist (KTG)', wert: '30 Tage' },
    ]);
    expect(ausgeleseneWerte(null)).toEqual([]);
  });
  it('Hinweis nennt Betrieb › Versicherungen und sagt, dass nichts gespeichert ist', () => {
    expect(MSG_POLICE_NUR_GELESEN).toContain('Betrieb › Versicherungen');
    expect(MSG_POLICE_NUR_GELESEN).toContain('Gespeichert ist noch nichts');
    expect(MSG_POLICE_NUR_GELESEN).not.toMatch(/[ß—–]/);
  });
});

describe('A7 W11: Umlaute im Dateinamen', () => {
  const UML = 'Übersicht Löhne März – Küche & Service.pdf';
  it('macht daraus einen ASCII-Namen, auch mit zerlegten Umlauten (macOS)', () => {
    expect(sichererDateiname(UML)).toBe('Uebersicht_Loehne_Maerz_Kueche_und_Service.pdf');
    expect(sichererDateiname(UML.normalize('NFD'))).toBe('Uebersicht_Loehne_Maerz_Kueche_und_Service.pdf');
  });
  it('liefert immer nur erlaubte Zeichen und nie einen leeren Namen', () => {
    for (const n of [UML, 'ÄÖÜ äöü ß.PDF', 'Zeugnis (final) #2?.docx', '///', '', 'é à ç.png']) {
      expect(sichererDateiname(n)).toMatch(/^[A-Za-z0-9._-]+$/);
    }
    expect(sichererDateiname('')).toBe('datei');
    expect(sichererDateiname('a'.repeat(300) + '.pdf').length).toBeLessThanOrEqual(90);
  });
  it('nennt beim Fehler den Grund, ohne ß und ohne Rohtext', () => {
    expect(uploadFehlerText(400, 'Invalid key: Ü.pdf')).toMatch(/Dateiname/);
    expect(uploadFehlerText(413, 'The object exceeded the maximum allowed size')).toMatch(/zu gross.*10 MB/);
    expect(uploadFehlerText(415, 'mime type not supported')).toMatch(/Dateiformat/);
    expect(uploadFehlerText(500, '')).toMatch(/antwortet gerade nicht/);
    expect(uploadFehlerText(418, '')).toMatch(/Fehler 418/);
    expect(uploadFehlerText(400, 'Invalid key: Ü.pdf')).not.toMatch(/Ü\.pdf/);
  });
});

// A-013 G5b-15: Verknuepfung Dokument/Person darf nicht still scheitern.
describe('dokumentZuordnen (G5b-15)', () => {
  const args = (fetchFn) => ({ authedFetch: fetchFn, baseUrl: 'https://db.example.co', headers: { apikey: 'k' }, docId: 'd-1', employeeId: 'e-1' });
  it('wartet das PATCH ab und meldet ok bei 2xx', async () => {
    const f = vi.fn(async () => ({ ok: true, status: 204 }));
    const r = await dokumentZuordnen(args(f));
    expect(r).toEqual({ ok: true });
    expect(f).toHaveBeenCalledTimes(1);
    expect(f.mock.calls[0][0]).toMatch(/employee_documents\?id=eq\.d-1$/);
    expect(f.mock.calls[0][1].method).toBe('PATCH');
    expect(JSON.parse(f.mock.calls[0][1].body)).toEqual({ employee_id: 'e-1' });
  });
  it('HTTP-Fehler ergibt festen Satz, nie Gut-Zustand, nie Rohtext', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const r = await dokumentZuordnen(args(async () => ({ ok: false, status: 500, json: async () => ({ message: 'ROHTEXT' }) })));
    expect(r.ok).toBe(false);
    expect(r.satz).toBe(MSG_ZUORDNUNG_FEHLT);
    expect(JSON.stringify(r)).not.toMatch(/ROHTEXT|500/);
    expect(warn.mock.calls.flat().join(' ')).toMatch(/500/);
    expect(warn.mock.calls.flat().join(' ')).not.toMatch(/ROHTEXT|d-1|e-1/);
    warn.mockRestore();
  });
  it('Netzfehler und Abbruch ergeben ebenfalls den festen Satz', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const r = await dokumentZuordnen(args(async () => { throw new Error('ROHTEXT-NETZ d-1'); }));
    expect(r).toEqual({ ok: false, satz: MSG_ZUORDNUNG_FEHLT });
    expect(warn.mock.calls.flat().join(' ')).not.toMatch(/ROHTEXT|d-1/);
    warn.mockRestore();
  });
  it('MSG_ZUORDNUNG_FEHLT ist ein Du-Satz', () => {
    expect(MSG_ZUORDNUNG_FEHLT).toBe('Das Dokument ist nicht in der Akte gelandet. Du kannst es erneut zuordnen oder in der Akte ablegen.');
  });
});

// A-013 Nachbesserung: Erfolgstitel abschwaechen, solange die Zuordnung offen ist.
describe('importTitel', () => {
  it('Zuordnung ok: klarer Erfolgstitel', () => {
    expect(importTitel({ created: true, zuordnungOffen: false })).toBe('Mitarbeiter angelegt');
    expect(importTitel({ created: false, zuordnungOffen: false })).toBe('Mitarbeiter aktualisiert');
  });
  it('Zuordnung offen: abgeschwaecht, nicht «fertig»', () => {
    expect(importTitel({ created: true, zuordnungOffen: true })).toBe('Mitarbeiter angelegt, Dokument noch nicht zugeordnet');
    expect(importTitel({ created: false, zuordnungOffen: true })).toBe('Mitarbeiter aktualisiert, Dokument noch nicht zugeordnet');
  });
});
