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
