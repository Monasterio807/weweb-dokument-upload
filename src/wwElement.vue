<template>
  <div class="hrk-root">
    <main class="hrk-page">

      <!-- Loading -->
      <div v-if="loading" class="hrk-state">
        <div class="hrk-spinner" aria-hidden="true"></div>
        <p class="hrk-muted">Wird geladen …</p>
      </div>

      <!-- Not logged in -->
      <div v-else-if="needLogin" class="hrk-state">
        <p class="hrk-state__title">Bitte melde dich an, um Dokumente hochzuladen.</p>
        <a class="hrk-btn hrk-btn--primary" href="/anmelden">Anmelden</a>
      </div>

      <!-- Main -->
      <template v-else>

        <!-- Header -->
        <header class="upload-header">
          <h1 class="hrk-h1">Dokumente</h1>
          <a v-if="backHref" class="hrk-btn hrk-btn--ghost" :href="backHref">← Zurück</a>
        </header>

        <!-- ── Upload-Karte ── -->
        <section class="hrk-card upload-card">
          <h2 class="hrk-h2 upload-card__title">Neues Dokument hochladen</h2>

          <!-- Drop-Zone -->
          <div
            class="upload-zone"
            :class="{ 'upload-zone--drag': dragOver, 'upload-zone--has-file': selectedFile }"
            role="button"
            tabindex="0"
            aria-label="Datei auswählen oder hier hineinziehen"
            @click="triggerFileInput"
            @keydown.enter.prevent="triggerFileInput"
            @keydown.space.prevent="triggerFileInput"
            @dragover.prevent="dragOver = true"
            @dragleave.prevent="dragOver = false"
            @drop.prevent="onDrop"
          >
            <input
              ref="fileInput"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.docx,application/pdf,image/jpeg,image/png,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              class="upload-zone__input"
              tabindex="-1"
              aria-hidden="true"
              @change="onFileSelect"
            />

            <!-- Placeholder (keine Datei ausgewählt) -->
            <template v-if="!selectedFile">
              <span class="upload-zone__icon" aria-hidden="true">📎</span>
              <p class="upload-zone__text">Hier klicken oder Datei reinziehen</p>
              <p class="hrk-muted upload-zone__hint">PDF, JPG, PNG oder DOCX — max. 10 MB</p>
            </template>

            <!-- Datei ausgewählt -->
            <template v-else>
              <span class="upload-zone__icon" aria-hidden="true">{{ fileIcon }}</span>
              <div class="upload-zone__file-info">
                <p class="upload-zone__file-name">{{ selectedFile.name }}</p>
                <p class="hrk-muted">{{ fmtSize(selectedFile.size) }}</p>
              </div>
              <button
                class="upload-zone__clear hrk-btn hrk-btn--ghost"
                aria-label="Datei entfernen"
                @click.stop="clearFile"
              >✕</button>
            </template>
          </div>

          <!-- Kategorie -->
          <div class="hrk-field">
            <label class="hrk-label" for="doc-category">Kategorie</label>
            <select id="doc-category" v-model="category" class="hrk-input hrk-select">
              <optgroup label="Verträge &amp; Personal">
                <option value="Arbeitsvertrag">Arbeitsvertrag ✨ Auto-Import</option>
                <option value="Ausweiskopie">Ausweiskopie</option>
                <option value="Zeugnis">Zeugnis</option>
                <option value="Lohnabrechnung">Lohnabrechnung</option>
              </optgroup>
              <optgroup label="Versicherungspolicen ✨ Auto-Extraktion">
                <option value="SUVA-Police">SUVA-Police (UVG Berufsunfall / NBU)</option>
                <option value="KTG-Police">KTG-Police (Krankentaggeld)</option>
                <option value="BVG-Police">BVG-Police (Pensionskasse)</option>
              </optgroup>
              <optgroup label="Sonstiges">
                <option value="Sonstiges">Sonstiges</option>
              </optgroup>
            </select>
          </div>

          <!-- Auto-Verarbeitung Hinweis (sichtbar wenn Datei ausgewählt) -->
          <div v-if="isArbeitsvertrag && selectedFile" class="hrk-note hrk-note--info">
            <strong>🤖 Emily ist aktiv</strong> — nach dem Hochladen liest Emily den Vertrag automatisch und legt den Mitarbeiter an.
          </div>
          <div v-else-if="insuranceType && selectedFile" class="hrk-note hrk-note--info">
            <strong>🤖 Emily ist aktiv</strong> — nach dem Hochladen extrahiert Emily die Versicherungsdaten direkt in dein Betriebsprofil.
          </div>

          <!-- Meldungen Upload -->
          <div v-if="uploadError" class="hrk-note hrk-note--warn" role="alert">{{ uploadError }}</div>
          <div v-if="uploadSuccess" class="hrk-note hrk-note--success">{{ uploadSuccess }}</div>

          <!-- Auto-Import Ladeindikator -->
          <div v-if="importLoading" class="hrk-state hrk-state--inline" style="margin-top:12px">
            <div class="hrk-spinner" aria-hidden="true"></div>
            <p class="hrk-muted">Emily liest den Vertrag und legt den Mitarbeiter an …</p>
          </div>

          <!-- Auto-Import Fehler -->
          <div v-if="importError" class="hrk-note hrk-note--warn" role="alert">{{ importError }}</div>

          <!-- Auto-Import Ergebnis -->
          <div v-if="importResult" class="hrk-card auto-result-card">
            <p class="auto-result-card__title">
              ✅ Mitarbeiter {{ importResult.employee_created ? 'angelegt' : 'aktualisiert' }}
            </p>
            <p v-if="importResult.employee_created" class="hrk-muted hrk-small">
              Onboarding-Checkliste gestartet.
              <template v-if="importResult.case_id"> Vertragsentwurf erstellt.</template>
            </p>
            <ul v-if="importResult.warnings && importResult.warnings.length" class="auto-result-card__warnings">
              <li v-for="w in importResult.warnings" :key="w" class="hrk-muted hrk-small">⚠ {{ w }}</li>
            </ul>
            <div v-if="importResult.employee_id" class="hrk-actions" style="margin-top:12px">
              <a :href="`/mitarbeiter/${importResult.employee_id}`" class="hrk-btn hrk-btn--secondary">Mitarbeiter öffnen →</a>
            </div>
          </div>

          <!-- Versicherungs-Extraktion Ladeindikator -->
          <div v-if="extractLoading" class="hrk-state hrk-state--inline" style="margin-top:12px">
            <div class="hrk-spinner" aria-hidden="true"></div>
            <p class="hrk-muted">Emily liest die Police und speichert die Daten …</p>
          </div>

          <!-- Versicherungs-Extraktion Fehler -->
          <div v-if="extractError" class="hrk-note hrk-note--warn" role="alert">{{ extractError }}</div>

          <!-- Versicherungs-Extraktion Ergebnis -->
          <div v-if="extractResult" class="hrk-card auto-result-card">
            <p class="auto-result-card__title">✅ Versicherungsdaten gespeichert</p>
            <ul v-if="extractResult.updated_fields && extractResult.updated_fields.length" class="auto-result-card__fields">
              <li v-for="f in extractResult.updated_fields" :key="f" class="hrk-small">• {{ f }}</li>
            </ul>
            <ul v-if="extractResult.warnings && extractResult.warnings.length" class="auto-result-card__warnings">
              <li v-for="w in extractResult.warnings" :key="w" class="hrk-muted hrk-small">⚠ {{ w }}</li>
            </ul>
          </div>

          <!-- Upload-Button -->
          <div class="hrk-cta-bar">
            <button
              class="hrk-btn hrk-btn--primary hrk-btn--block"
              :disabled="!selectedFile || uploading"
              @click="uploadFile"
            >
              <span v-if="uploading" class="btn-inner">
                <span class="btn-spinner" aria-hidden="true"></span>
                Wird hochgeladen …
              </span>
              <span v-else>Dokument hochladen</span>
            </button>
          </div>
        </section>

        <!-- ── Datei-Liste ── -->
        <section class="hrk-card doc-list-card">
          <h2 class="hrk-h2 doc-list-card__title">Deine Dokumente</h2>

          <div v-if="listError" class="hrk-note hrk-note--warn" role="alert">{{ listError }}</div>

          <div v-if="listLoading" class="hrk-state hrk-state--inline">
            <div class="hrk-spinner" aria-hidden="true"></div>
            <p class="hrk-muted">Liste wird geladen …</p>
          </div>

          <div v-else-if="!documents.length" class="hrk-empty">
            <p class="hrk-empty__text">Noch keine Dokumente hochgeladen.</p>
            <p class="hrk-muted">Lade oben dein erstes Dokument hoch — dauert nur ein paar Sekunden.</p>
          </div>

          <ul v-else class="doc-list" role="list">
            <li v-for="doc in documents" :key="doc.id" class="doc-item">
              <span class="doc-item__icon" aria-hidden="true">{{ docIcon(doc.mime_type) }}</span>
              <div class="doc-item__body">
                <p class="doc-item__name">{{ doc.file_name }}</p>
                <p class="doc-item__meta hrk-muted hrk-small">
                  <span class="hrk-badge hrk-badge--neutral">{{ doc.category }}</span>
                  &nbsp;·&nbsp;{{ fmtDate(doc.uploaded_at) }}
                  <template v-if="doc.file_size_bytes">&nbsp;·&nbsp;{{ fmtSize(doc.file_size_bytes) }}</template>
                </p>
              </div>
              <div class="doc-item__actions">
                <button
                  class="hrk-btn hrk-btn--secondary doc-btn"
                  :disabled="downloading === doc.id"
                  :aria-label="'Herunterladen: ' + doc.file_name"
                  @click="downloadFile(doc)"
                >
                  <span v-if="downloading === doc.id" class="btn-spinner btn-spinner--sm" aria-hidden="true"></span>
                  <span v-else aria-hidden="true">⬇</span>
                </button>
                <button
                  class="hrk-btn hrk-btn--ghost doc-btn doc-btn--delete"
                  :disabled="deleting === doc.id"
                  :aria-label="'Löschen: ' + doc.file_name"
                  @click="confirmDelete(doc)"
                >
                  <span v-if="deleting === doc.id" class="btn-spinner btn-spinner--sm" aria-hidden="true"></span>
                  <span v-else aria-hidden="true">🗑</span>
                </button>
              </div>
            </li>
          </ul>
        </section>

        <!-- ── Lösch-Bestätigung Modal ── -->
        <div v-if="deleteTarget" class="modal-overlay" role="presentation" @click.self="deleteTarget = null">
          <div class="modal-box hrk-card" role="dialog" aria-modal="true" aria-labelledby="modal-title">
            <h2 id="modal-title" class="hrk-h2 modal-title">Dokument löschen?</h2>
            <p class="modal-body">
              Willst du <strong>{{ deleteTarget.file_name }}</strong> wirklich löschen?
              Das lässt sich nicht rückgängig machen.
            </p>
            <div class="hrk-actions modal-actions">
              <button class="hrk-btn hrk-btn--ghost" @click="deleteTarget = null">Abbrechen</button>
              <button class="hrk-btn hrk-btn--primary modal-delete-btn" @click="deleteFile(deleteTarget)">Löschen</button>
            </div>
          </div>
        </div>

      </template>
    </main>
  </div>
</template>

<script>
/**
 * WeWeb Coded Component — Dokument-Upload (HR am Tisch / Imploya)
 * Erlaubt das Hochladen von HR-Dokumenten (PDF, JPG, PNG, DOCX) ins Supabase Storage.
 * Speichert Metadaten in der Tabelle `employee_documents`.
 *
 * VORAUSSETZUNG (manuell in Supabase anlegen):
 *   Storage-Bucket «employee-documents» (privat, file_size_limit 10 MB)
 *
 * Props: authToken, apiKey, supabaseUrl, storageBucket, backUrl
 */
export default {
  props: {
    content: { type: Object, required: true },
    uid: { type: String, required: false, default: '' },
    /* wwEditor:start */
    wwEditorState: { type: Object, required: false, default: () => ({}) },
    /* wwEditor:end */
  },
  emits: ['trigger-event'],

  data() {
    return {
      loading: false,
      needLogin: false,
      // Upload
      selectedFile: null,
      category: 'Sonstiges',
      dragOver: false,
      uploading: false,
      uploadError: '',
      uploadSuccess: '',
      // Liste
      documents: [],
      listLoading: false,
      listError: '',
      // Download
      downloading: null,
      // Löschen
      deleting: null,
      deleteTarget: null,
      // Auto-Import (Arbeitsvertrag → Mitarbeiter anlegen)
      importLoading: false,
      importResult: null,
      importError: '',
      // Versicherungs-Extraktion (SUVA/KTG/BVG-Police)
      extractLoading: false,
      extractResult: null,
      extractError: '',
    };
  },

  computed: {
    baseUrl() {
      let __sbBase = String((this.content && this.content.supabaseUrl) || 'https://ztvqsxdudzdyqgeylujr.supabase.co').replace(/\/+$/, '');
      if (/nemxnflngcfrpamkuesm/.test(String(__sbBase))) __sbBase = 'https://ztvqsxdudzdyqgeylujr.supabase.co';
      return __sbBase;
    },
    bucket() {
      return String((this.content && this.content.storageBucket) || 'employee-documents');
    },
    authHeaders() {
      const key = String((this.content && this.content.apiKey) || 'sb_publishable_4rsRb_VB3l_45JO7sw0VSA_ODDS4CZc');
      const raw = String((this.content && this.content.authToken) || '');
      const bearer = raw.startsWith('Bearer ') ? raw : `Bearer ${raw}`;
      return { apikey: key, Authorization: bearer };
    },
    backHref() {
      return String((this.content && this.content.backUrl) || '/mitarbeiter');
    },
    /** User-ID aus JWT-Payload (sub) */
    userId() {
      const raw = String((this.content && this.content.authToken) || '');
      const jwt = raw.startsWith('Bearer ') ? raw.slice(7) : raw;
      if (!jwt) return '';
      try {
        const b64 = jwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
        const payload = JSON.parse(atob(b64));
        return String(payload.sub || '');
      } catch (e) { return ''; }
    },
    fileIcon() {
      return this.selectedFile ? this.docIcon(this.selectedFile.type) : '📎';
    },
    /** True wenn gewählte Kategorie ein Arbeitsvertrag ist */
    isArbeitsvertrag() {
      return this.category === 'Arbeitsvertrag';
    },
    /** Gibt 'suva'|'ktg'|'bvg' zurück wenn Versicherungspolice gewählt, sonst null */
    insuranceType() {
      const map = { 'SUVA-Police': 'suva', 'KTG-Police': 'ktg', 'BVG-Police': 'bvg' };
      return map[this.category] || null;
    },
  },

  watch: {
    'content.authToken'(v) { if (v) this.init(); },
    'content.apiKey'(v)    { if (v && this.content && this.content.authToken) this.init(); },
  },

  mounted() {
    if (this.content && this.content.authToken && 'sb_publishable_4rsRb_VB3l_45JO7sw0VSA_ODDS4CZc') this.init();
    else if (!(this.content && this.content.authToken)) this.needLogin = true;
  },

  methods: {
    // ── Infrastruktur ────────────────────────────────────────────────────────

    /** fetch mit Timeout — bricht hängende Requests nach ms ab */
    async fetchWithTimeout(url, options, ms) {
      const timeout = ms || 10000;
      const ac = typeof AbortController !== 'undefined' ? new AbortController() : null;
      const timer = ac ? setTimeout(() => ac.abort(), timeout) : null;
      try {
        return await fetch(url, ac ? { ...options, signal: ac.signal } : options);
      } finally {
        if (timer) clearTimeout(timer);
      }
    },

    emitEvent(name, payload) {
      this.$emit('trigger-event', { name, event: payload || {} });
    },

    init() {
      this.needLogin = false;
      if (!(this.content && this.content.authToken)) { this.needLogin = true; return; }
      this.loadFiles();
    },

    // ── Hilfsfunktionen ──────────────────────────────────────────────────────

    docIcon(mime) {
      if (!mime) return '📄';
      if (mime.includes('pdf'))               return '📋';
      if (mime.includes('image'))             return '🖼';
      if (mime.includes('word') || mime.includes('document')) return '📝';
      return '📄';
    },

    fmtSize(bytes) {
      if (!bytes && bytes !== 0) return '';
      const kb = bytes / 1024;
      if (kb < 1024) return `${Math.round(kb)} KB`;
      return `${(kb / 1024).toFixed(1)} MB`;
    },

    fmtDate(iso) {
      if (!iso) return '—';
      try {
        const d = new Date(iso);
        if (isNaN(d.getTime())) return '—';
        const p = (n) => String(n).padStart(2, '0');
        return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()}`;
      } catch (e) { return '—'; }
    },

    sanitizeFilename(name) {
      // Leerzeichen + Sonderzeichen ersetzen, Doppel-Underscores zusammenführen
      return (name || 'datei')
        .replace(/[^a-zA-Z0-9.\-_äöüÄÖÜ]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '');
    },

    generateUUID() {
      if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
      }
      // Fallback für ältere Browser
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
      });
    },

    // ── Datei-Auswahl ────────────────────────────────────────────────────────

    triggerFileInput() {
      if (this.$refs.fileInput) this.$refs.fileInput.click();
    },

    onFileSelect(evt) {
      const file = evt && evt.target && evt.target.files && evt.target.files[0];
      if (!file) return;
      this.setFile(file);
    },

    onDrop(evt) {
      this.dragOver = false;
      const file = evt && evt.dataTransfer && evt.dataTransfer.files && evt.dataTransfer.files[0];
      if (!file) return;
      this.setFile(file);
    },

    setFile(file) {
      this.uploadError = '';
      this.uploadSuccess = '';
      const err = this.validateFile(file);
      if (err) { this.uploadError = err; return; }
      this.selectedFile = file;
    },

    validateFile(file) {
      const allowedMime = [
        'application/pdf',
        'image/jpeg',
        'image/png',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ];
      const allowedExt = ['pdf', 'jpg', 'jpeg', 'png', 'docx'];
      const ext = String(file.name || '').split('.').pop().toLowerCase();
      if (!allowedMime.includes(file.type) && !allowedExt.includes(ext)) {
        return 'Nur PDF, JPG, PNG oder DOCX erlaubt.';
      }
      if (file.size > 10 * 1024 * 1024) {
        return `Die Datei ist zu gross (${this.fmtSize(file.size)}). Maximum ist 10 MB.`;
      }
      return null;
    },

    clearFile() {
      this.selectedFile = null;
      this.uploadError = '';
      this.uploadSuccess = '';
      if (this.$refs.fileInput) this.$refs.fileInput.value = '';
    },

    // ── Upload ───────────────────────────────────────────────────────────────

    async uploadFile() {
      if (!this.selectedFile || this.uploading) return;
      const uid = this.userId;
      if (!uid) { this.uploadError = 'Bitte melde dich neu an — kein gültiger Login-Token.'; return; }

      this.uploading = true;
      this.uploadError = '';
      this.uploadSuccess = '';
      this.importResult = null;
      this.importError = '';
      this.extractResult = null;
      this.extractError = '';

      try {
        const uuid    = this.generateUUID();
        const safe    = this.sanitizeFilename(this.selectedFile.name);
        const filePath = `${uid}/${uuid}-${safe}`;
        const mime    = this.selectedFile.type || 'application/octet-stream';

        // 1) Datei in Supabase Storage hochladen
        const uploadUrl = `${this.baseUrl}/storage/v1/object/${encodeURIComponent(this.bucket)}/${filePath}`;
        const uploadRes = await this.fetchWithTimeout(
          uploadUrl,
          {
            method: 'POST',
            headers: { ...this.authHeaders, 'Content-Type': mime },
            body: this.selectedFile,
          },
          30000  // 30 s für grosse Dateien
        );

        if (uploadRes.status === 401 || uploadRes.status === 403) {
          this.uploadError = 'Kein Zugriff. Bitte melde dich neu an.';
          this.emitEvent('error', { reason: 'auth' });
          return;
        }
        if (!uploadRes.ok) {
          const errBody = await uploadRes.json().catch(() => ({}));
          const msg = String((errBody && (errBody.message || errBody.error)) || `HTTP ${uploadRes.status}`);
          if (/bucket not found|bucket/i.test(msg)) {
            this.uploadError =
              `Der Speicher-Bucket «${this.bucket}» existiert noch nicht.\n` +
              'Bitte lege ihn in Supabase → Storage → New bucket an (Typ: Private, Limit: 10 MB).';
          } else {
            this.uploadError = `Upload fehlgeschlagen: ${msg}`;
          }
          this.emitEvent('error', { reason: 'upload', detail: msg });
          return;
        }

        // 2) Metadaten in employee_documents speichern
        const meta = {
          user_id:          uid,
          file_name:        this.selectedFile.name,
          file_path:        filePath,
          file_size_bytes:  this.selectedFile.size,
          mime_type:        mime,
          category:         this.category,
        };
        // Prefer: return=representation → gibt die neue Zeile mit ID zurück
        const dbRes = await this.fetchWithTimeout(
          `${this.baseUrl}/rest/v1/employee_documents`,
          {
            method:  'POST',
            headers: {
              ...this.authHeaders,
              'Content-Type': 'application/json',
              Prefer: 'return=representation',
              Accept: 'application/json',
            },
            body: JSON.stringify(meta),
          }
        );

        let insertedDocId = null;
        if (!dbRes.ok) {
          // Upload erfolgreich, aber Metadaten-Insert fehlgeschlagen
          this.uploadSuccess = `Datei hochgeladen — Metadaten konnten nicht gespeichert werden (${dbRes.status}).`;
        } else {
          const inserted = await dbRes.json().catch(() => []);
          insertedDocId = Array.isArray(inserted) && inserted[0] ? inserted[0].id : null;
          this.uploadSuccess = `«${this.selectedFile.name}» wurde hochgeladen.`;
          this.emitEvent('uploaded', { file_name: this.selectedFile.name, category: this.category });
        }

        // Datei-Referenz sichern vor clearFile()
        const capturedFile   = this.selectedFile;
        const capturedCat    = this.category;
        const capturedType   = this.insuranceType;
        const capturedDocId  = insertedDocId;
        this.clearFile();
        await this.loadFiles();

        // Auto-Verarbeitung nach erfolgreichem Upload
        if (capturedCat === 'Arbeitsvertrag' && capturedFile) {
          await this.importEmployee(capturedFile, capturedDocId);
        } else if (capturedType && capturedFile) {
          await this.extractInsurance(capturedFile, capturedType);
        }

      } catch (e) {
        if (e && e.name === 'AbortError') {
          this.uploadError = 'Der Upload hat zu lange gedauert. Bitte versuche es mit einer kleineren Datei.';
        } else {
          this.uploadError = 'Netzwerkfehler beim Hochladen. Bitte versuche es nochmal.';
        }
        this.emitEvent('error', { reason: 'network' });
      } finally {
        this.uploading = false;
      }
    },

    // ── Datei-Liste ──────────────────────────────────────────────────────────

    async loadFiles() {
      this.listLoading = true;
      this.listError = '';
      try {
        const url = `${this.baseUrl}/rest/v1/employee_documents?select=*&order=uploaded_at.desc`;
        const res = await this.fetchWithTimeout(url, {
          headers: { ...this.authHeaders, Accept: 'application/json' },
        });
        if (res.status === 401 || res.status === 403) { this.needLogin = true; return; }
        if (!res.ok) {
          this.listError = 'Dokumente konnten nicht geladen werden.';
          return;
        }
        const data = await res.json().catch(() => []);
        this.documents = Array.isArray(data) ? data : [];
      } catch (e) {
        this.listError = 'Netzwerkfehler beim Laden der Dokumentenliste.';
      } finally {
        this.listLoading = false;
      }
    },

    // ── Download (Signed URL) ────────────────────────────────────────────────

    async downloadFile(doc) {
      if (this.downloading) return;
      this.downloading = doc.id;
      try {
        // Signed URL generieren (1 Stunde gültig)
        const signRes = await this.fetchWithTimeout(
          `${this.baseUrl}/storage/v1/object/sign/${encodeURIComponent(this.bucket)}/${doc.file_path}`,
          {
            method:  'POST',
            headers: { ...this.authHeaders, 'Content-Type': 'application/json' },
            body:    JSON.stringify({ expiresIn: 3600 }),
          }
        );
        if (signRes.ok) {
          const body = await signRes.json().catch(() => ({}));
          const rel  = body && (body.signedURL || body.signedUrl);
          if (rel) {
            const full = rel.startsWith('http') ? rel : `${this.baseUrl}${rel}`;
            if (typeof window !== 'undefined') window.open(full, '_blank', 'noopener');
            return;
          }
        }
        // Fallback: authenticated object URL direkt öffnen
        const fallback = `${this.baseUrl}/storage/v1/object/authenticated/${encodeURIComponent(this.bucket)}/${doc.file_path}`;
        if (typeof window !== 'undefined') window.open(fallback, '_blank', 'noopener');
      } catch (e) {
        // Stilles Scheitern — kein Upload-Fehler zeigen
      } finally {
        this.downloading = null;
      }
    },

    // ── Löschen ──────────────────────────────────────────────────────────────

    confirmDelete(doc) {
      this.deleteTarget = doc;
    },

    async deleteFile(doc) {
      this.deleteTarget = null;
      this.deleting = doc.id;
      try {
        // 1) Datei aus Storage löschen
        await this.fetchWithTimeout(
          `${this.baseUrl}/storage/v1/object/${encodeURIComponent(this.bucket)}`,
          {
            method:  'DELETE',
            headers: { ...this.authHeaders, 'Content-Type': 'application/json' },
            body:    JSON.stringify({ prefixes: [doc.file_path] }),
          }
        ).catch(() => null);  // Fehler beim Storage-Delete nicht blockieren

        // 2) Metadaten aus DB löschen (RLS stellt sicher: nur eigene Zeilen)
        const dbRes = await this.fetchWithTimeout(
          `${this.baseUrl}/rest/v1/employee_documents?id=eq.${encodeURIComponent(doc.id)}`,
          {
            method:  'DELETE',
            headers: { ...this.authHeaders, Prefer: 'return=minimal' },
          }
        );
        if (dbRes.ok || dbRes.status === 404) {
          this.documents = this.documents.filter(d => d.id !== doc.id);
          this.emitEvent('deleted', { id: doc.id });
        }
      } catch (e) {
        // Stilles Scheitern
      } finally {
        this.deleting = null;
      }
    },

    // ── Auto-Verarbeitung ─────────────────────────────────────────────────────

    /** Datei → Base64-String (ohne data:...;base64, Präfix) */
    fileToBase64(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = String(reader.result || '');
          // data:mime;base64,XXXX → nur XXXX
          const idx = result.indexOf(',');
          resolve(idx >= 0 ? result.slice(idx + 1) : result);
        };
        reader.onerror = (e) => reject(e);
        reader.readAsDataURL(file);
      });
    },

    /**
     * Arbeitsvertrag hochgeladen → import-contract-employee aufrufen.
     * Legt Mitarbeiter an, setzt Onboarding-Checkliste, erstellt Vertragsentwurf.
     * Verknüpft das Dokument (employee_documents.employee_id) mit dem neuen Mitarbeiter.
     * @param {File}        file   — hochgeladene Datei
     * @param {string|null} docId  — UUID aus employee_documents (zum Verknüpfen)
     */
    async importEmployee(file, docId) {
      this.importLoading = true;
      this.importError  = '';
      this.importResult = null;
      try {
        const file_base64 = await this.fileToBase64(file);
        const res = await this.fetchWithTimeout(
          `${this.baseUrl}/functions/v1/import-contract-employee`,
          {
            method: 'POST',
            headers: { ...this.authHeaders, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              file_base64,
              mime_type: file.type || 'application/pdf',
              filename:  file.name,
            }),
          },
          90000  // 90 s — KI-Verarbeitung kann dauern
        );
        const body = await res.json().catch(() => ({}));
        if (res.ok && body && body.success) {
          this.importResult = body;
          this.emitEvent('employee-imported', {
            employee_id: body.employee_id,
            employee_created: body.employee_created,
          });
          // Dokument mit neuem Mitarbeiter verknüpfen
          if (docId && body.employee_id) {
            this.fetchWithTimeout(
              `${this.baseUrl}/rest/v1/employee_documents?id=eq.${encodeURIComponent(docId)}`,
              {
                method: 'PATCH',
                headers: { ...this.authHeaders, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
                body: JSON.stringify({ employee_id: body.employee_id }),
              }
            ).catch(() => null);  // Nicht-blockierend, Fehler ignorieren
          }
        } else {
          const msg = String((body && (body.error || body.message)) || `HTTP ${res.status}`);
          this.importError = `Automatischer Import fehlgeschlagen: ${msg}`;
        }
      } catch (e) {
        if (e && e.name === 'AbortError') {
          this.importError = 'Zeitüberschreitung beim Import. Bitte versuche es nochmal.';
        } else {
          this.importError = 'Netzwerkfehler beim automatischen Import.';
        }
      } finally {
        this.importLoading = false;
      }
    },

    /**
     * Versicherungspolice hochgeladen → extract-insurance-data aufrufen.
     * Speichert Versichererdaten direkt in company_profiles.
     * @param {File}   file          — die hochgeladene Datei
     * @param {string} insurance_type — 'suva' | 'ktg' | 'bvg'
     */
    async extractInsurance(file, insurance_type) {
      this.extractLoading = true;
      this.extractError  = '';
      this.extractResult = null;
      try {
        const file_base64 = await this.fileToBase64(file);
        const res = await this.fetchWithTimeout(
          `${this.baseUrl}/functions/v1/extract-insurance-data`,
          {
            method: 'POST',
            headers: { ...this.authHeaders, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              file_base64,
              mime_type:      file.type || 'application/pdf',
              insurance_type,
            }),
          },
          90000
        );
        const body = await res.json().catch(() => ({}));
        if (res.ok && body && body.success) {
          this.extractResult = body;
          this.emitEvent('insurance-extracted', {
            insurance_type,
            updated_fields: body.updated_fields || [],
          });
        } else {
          const msg = String((body && (body.error || body.message)) || `HTTP ${res.status}`);
          this.extractError = `Extraktion fehlgeschlagen: ${msg}`;
        }
      } catch (e) {
        if (e && e.name === 'AbortError') {
          this.extractError = 'Zeitüberschreitung bei der Extraktion. Bitte versuche es nochmal.';
        } else {
          this.extractError = 'Netzwerkfehler bei der Versicherungs-Extraktion.';
        }
      } finally {
        this.extractLoading = false;
      }
    },
  },
};
</script>

<style scoped>
/* ============================================================
   HR am Tisch — Design-Tokens (App-Design Variante A, 2026-06-17)
   ============================================================ */
:root, .hrk-root {
  --hrk-bordeaux:        #7B2D3B;
  --hrk-bordeaux-dark:   #5E2129;
  --hrk-bordeaux-soft:   #F3E7E9;
  --hrk-creme:           #FBF8F3;
  --hrk-anthrazit:       #2B2B2B;
  --hrk-gold:            #C9A24B;
  --hrk-surface:         #FFFFFF;
  --hrk-surface-muted:   #F5F1EB;
  --hrk-border:          #ECE5D9;
  --hrk-border-strong:   #DAD2C6;
  --hrk-text:            #2B2B2B;
  --hrk-text-muted:      #6B6357;
  --hrk-success:         #2E7D5B;  --hrk-success-bg: #E5F1EB;
  --hrk-warning:         #B7791F;  --hrk-warning-bg: #FBF1DD;
  --hrk-danger:          #B23A48;  --hrk-danger-bg:  #F8E7E9;
  --hrk-info:            #2F6F9F;  --hrk-info-bg:    #E6F0F7;
  --hrk-neutral:         #6B6357;  --hrk-neutral-bg: #EFEAE2;
  --hrk-font-head: "Fraunces", "Lora", Georgia, serif;
  --hrk-font-body: "Inter", "Source Sans 3", system-ui, sans-serif;
  --hrk-fs-h1:    1.9375rem;
  --hrk-fs-h2:    1.375rem;
  --hrk-fs-body:  1.0625rem;
  --hrk-fs-small: 0.9375rem;
  --hrk-lh-body:  1.55;
  --hrk-fw-regular: 400; --hrk-fw-medium: 500; --hrk-fw-semibold: 600;
  --hrk-space-1: 4px;  --hrk-space-2: 8px;  --hrk-space-3: 12px;
  --hrk-space-4: 16px; --hrk-space-5: 24px; --hrk-space-6: 32px;
  --hrk-space-7: 48px;
  --hrk-radius-sm: 8px; --hrk-radius-md: 12px; --hrk-radius-lg: 14px;
  --hrk-radius-pill: 999px;
  --hrk-shadow-card: 0 1px 2px rgba(40,35,30,.05);
  --hrk-shadow-pop:  0 8px 28px rgba(40,35,30,.12);
  --hrk-focus-ring:  0 0 0 3px rgba(123,45,59,.30);
  --hrk-tap-min: 44px;
  --hrk-page-max: 680px;
}

/* ── Basis ───────────────────────────────────────────────── */
.hrk-root, .hrk-root * { box-sizing: border-box; }
.hrk-root {
  font-family: var(--hrk-font-body);
  font-size: var(--hrk-fs-body);
  line-height: var(--hrk-lh-body);
  color: var(--hrk-text);
  background: var(--hrk-creme);
  -webkit-font-smoothing: antialiased;
}
.hrk-page { max-width: var(--hrk-page-max); margin: 0 auto; padding: var(--hrk-space-6) var(--hrk-space-4); }
.hrk-h1 {
  font-family: var(--hrk-font-head); font-size: var(--hrk-fs-h1);
  font-weight: var(--hrk-fw-semibold); line-height: 1.15;
  color: var(--hrk-bordeaux); margin: 0 0 var(--hrk-space-3);
}
.hrk-h2 {
  font-family: var(--hrk-font-head); font-size: var(--hrk-fs-h2);
  font-weight: var(--hrk-fw-semibold); line-height: 1.2;
  color: var(--hrk-bordeaux); margin: 0 0 var(--hrk-space-4);
}
.hrk-muted  { color: var(--hrk-text-muted); }
.hrk-small  { font-size: var(--hrk-fs-small); }

/* ── Buttons ─────────────────────────────────────────────── */
.hrk-btn {
  display: inline-flex; align-items: center; justify-content: center; gap: var(--hrk-space-2);
  min-height: var(--hrk-tap-min); padding: 0 var(--hrk-space-5);
  font: inherit; font-weight: var(--hrk-fw-semibold);
  border-radius: var(--hrk-radius-md); border: 1px solid transparent;
  cursor: pointer; text-decoration: none; white-space: nowrap;
  transition: background .15s, border-color .15s, transform .05s;
}
.hrk-btn:active  { transform: translateY(1px); }
.hrk-btn:focus-visible { outline: none; box-shadow: var(--hrk-focus-ring); }
.hrk-btn--primary   { background: var(--hrk-bordeaux); color: #fff; }
.hrk-btn--primary:hover:not(:disabled) { background: var(--hrk-bordeaux-dark); }
.hrk-btn--secondary { background: var(--hrk-surface); color: var(--hrk-bordeaux); border-color: var(--hrk-border-strong); }
.hrk-btn--secondary:hover:not(:disabled) { background: var(--hrk-bordeaux-soft); }
.hrk-btn--ghost     { background: transparent; color: var(--hrk-bordeaux); }
.hrk-btn--ghost:hover:not(:disabled)  { background: var(--hrk-bordeaux-soft); }
.hrk-btn--block     { width: 100%; }
.hrk-btn:disabled   { opacity: .5; cursor: not-allowed; }

/* ── Karten ──────────────────────────────────────────────── */
.hrk-card {
  background: var(--hrk-surface);
  border: 1px solid var(--hrk-border);
  border-radius: var(--hrk-radius-lg);
  box-shadow: var(--hrk-shadow-card);
  padding: var(--hrk-space-5);
}

/* ── Felder ──────────────────────────────────────────────── */
.hrk-field  { display: flex; flex-direction: column; gap: var(--hrk-space-2); }
.hrk-label  { font-weight: var(--hrk-fw-semibold); font-size: var(--hrk-fs-small); color: var(--hrk-text-muted); }
.hrk-input  {
  width: 100%; padding: var(--hrk-space-3) var(--hrk-space-4);
  border: 1px solid var(--hrk-border-strong); border-radius: var(--hrk-radius-md);
  background: var(--hrk-surface); font: inherit; color: var(--hrk-text);
  min-height: var(--hrk-tap-min);
}
.hrk-input:focus { outline: none; box-shadow: var(--hrk-focus-ring); border-color: var(--hrk-bordeaux); }
.hrk-select { appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%236B6357' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right var(--hrk-space-4) center; padding-right: var(--hrk-space-7); cursor: pointer; }

/* ── Hinweisboxen ────────────────────────────────────────── */
.hrk-note {
  padding: var(--hrk-space-3) var(--hrk-space-4);
  border-radius: var(--hrk-radius-md);
  border-left: 3px solid var(--hrk-neutral);
  background: var(--hrk-neutral-bg);
  color: var(--hrk-text);
  font-size: var(--hrk-fs-small);
  white-space: pre-line;
}
.hrk-note--warn    { border-color: var(--hrk-warning); background: var(--hrk-warning-bg); }
.hrk-note--success { border-color: var(--hrk-success); background: var(--hrk-success-bg); }

/* ── Badge ───────────────────────────────────────────────── */
.hrk-badge {
  display: inline-flex; align-items: center; gap: var(--hrk-space-2);
  font-size: var(--hrk-fs-small); font-weight: var(--hrk-fw-semibold);
  background: none; padding: 0; white-space: nowrap;
}
.hrk-badge::before { content: ""; width: 7px; height: 7px; border-radius: 50%; background: currentColor; flex: none; }
.hrk-badge--neutral { color: var(--hrk-neutral); }
.hrk-badge--success { color: var(--hrk-success); }
.hrk-badge--warning { color: var(--hrk-warning); }
.hrk-badge--danger  { color: var(--hrk-danger); }

/* ── Spinner ─────────────────────────────────────────────── */
.hrk-spinner {
  width: 28px; height: 28px;
  border: 3px solid var(--hrk-border);
  border-top-color: var(--hrk-bordeaux);
  border-radius: 50%;
  animation: hrk-spin .8s linear infinite;
}
.btn-spinner {
  display: inline-block; width: 16px; height: 16px;
  border: 2px solid rgba(255,255,255,.4);
  border-top-color: #fff;
  border-radius: 50%;
  animation: hrk-spin .8s linear infinite;
}
.btn-spinner--sm { border-color: var(--hrk-bordeaux-soft); border-top-color: var(--hrk-bordeaux); }
@keyframes hrk-spin { to { transform: rotate(360deg); } }

/* ── Zustandsblöcke ──────────────────────────────────────── */
.hrk-state {
  display: flex; flex-direction: column; align-items: center; gap: var(--hrk-space-3);
  padding: var(--hrk-space-7) var(--hrk-space-4);
  color: var(--hrk-text-muted); text-align: center;
}
.hrk-state--inline { padding: var(--hrk-space-5) 0; }
.hrk-state__title { color: var(--hrk-text); font-weight: var(--hrk-fw-semibold); margin: 0; }
.hrk-actions { display: flex; flex-wrap: wrap; gap: var(--hrk-space-3); align-items: center; }
.hrk-cta-bar { margin-top: var(--hrk-space-4); }
.hrk-empty { padding: var(--hrk-space-5) 0; }
.hrk-empty__text { font-weight: var(--hrk-fw-semibold); margin: 0 0 var(--hrk-space-2); }

/* ── Header ──────────────────────────────────────────────── */
.upload-header {
  display: flex; align-items: center; justify-content: space-between;
  flex-wrap: wrap; gap: var(--hrk-space-3);
  margin-bottom: var(--hrk-space-5);
}
.upload-header .hrk-h1 { margin: 0; }

/* ── Upload-Karte ────────────────────────────────────────── */
.upload-card { display: flex; flex-direction: column; gap: var(--hrk-space-4); }
.upload-card__title { margin: 0; }

/* ── Drop-Zone ───────────────────────────────────────────── */
.upload-zone {
  position: relative;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: var(--hrk-space-2);
  min-height: 160px;
  border: 2px dashed var(--hrk-border-strong);
  border-radius: var(--hrk-radius-lg);
  background: var(--hrk-surface-muted);
  cursor: pointer;
  transition: border-color .15s, background .15s;
  padding: var(--hrk-space-5);
  text-align: center;
}
.upload-zone:focus { outline: none; box-shadow: var(--hrk-focus-ring); }
.upload-zone:hover,
.upload-zone--drag {
  border-color: var(--hrk-bordeaux);
  background: var(--hrk-bordeaux-soft);
}
.upload-zone--has-file {
  flex-direction: row; justify-content: flex-start; text-align: left;
  border-style: solid; border-color: var(--hrk-bordeaux);
  background: var(--hrk-bordeaux-soft);
}
.upload-zone__input {
  position: absolute; inset: 0; width: 100%; height: 100%;
  opacity: 0; cursor: pointer; z-index: 1;
}
.upload-zone--has-file .upload-zone__input { display: none; }
.upload-zone__icon { font-size: 2rem; line-height: 1; }
.upload-zone__text { font-weight: var(--hrk-fw-semibold); margin: 0; }
.upload-zone__hint { font-size: var(--hrk-fs-small); margin: 0; }
.upload-zone__file-info { flex: 1 1 auto; min-width: 0; }
.upload-zone__file-info p { margin: 0; }
.upload-zone__file-name { font-weight: var(--hrk-fw-semibold); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.upload-zone__clear {
  flex: none; min-height: var(--hrk-tap-min); min-width: var(--hrk-tap-min);
  padding: 0; font-size: 1rem; z-index: 2;
}

/* ── Datei-Liste ─────────────────────────────────────────── */
.doc-list-card { margin-top: var(--hrk-space-4); }
.doc-list-card__title { margin: 0 0 var(--hrk-space-4); }
.doc-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: var(--hrk-space-2); }
.doc-item {
  display: flex; align-items: center; gap: var(--hrk-space-3);
  padding: var(--hrk-space-3) var(--hrk-space-4);
  border: 1px solid var(--hrk-border); border-radius: var(--hrk-radius-md);
  background: var(--hrk-surface);
}
.doc-item__icon { font-size: 1.4rem; flex: none; }
.doc-item__body { flex: 1 1 auto; min-width: 0; }
.doc-item__name { font-weight: var(--hrk-fw-semibold); margin: 0 0 var(--hrk-space-1); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.doc-item__meta { margin: 0; }
.doc-item__actions { display: flex; gap: var(--hrk-space-2); flex: none; }
.doc-btn {
  min-height: var(--hrk-tap-min); min-width: var(--hrk-tap-min);
  padding: 0; font-size: 1rem;
}
.doc-btn--delete:hover:not(:disabled) { color: var(--hrk-danger); background: var(--hrk-danger-bg); }

/* ── Modal ───────────────────────────────────────────────── */
.modal-overlay {
  position: fixed; inset: 0; z-index: 200;
  background: rgba(43,43,43,.45);
  display: flex; align-items: center; justify-content: center;
  padding: var(--hrk-space-4);
}
.modal-box {
  max-width: 440px; width: 100%;
  box-shadow: var(--hrk-shadow-pop);
}
.modal-title { margin-bottom: var(--hrk-space-3); }
.modal-body  { margin: 0 0 var(--hrk-space-5); }
.modal-actions { justify-content: flex-end; }
.modal-delete-btn { background: var(--hrk-danger); }
.modal-delete-btn:hover { background: var(--hrk-bordeaux-dark); }

/* ── Hilfsstyles btn-inner ───────────────────────────────── */
.btn-inner { display: inline-flex; align-items: center; gap: var(--hrk-space-2); }

/* ── Auto-Verarbeitung Ergebnis-Karten ───────────────────── */
.auto-result-card {
  margin-top: var(--hrk-space-4);
  border-left: 3px solid var(--hrk-bordeaux);
  background: var(--hrk-bordeaux-soft);
  padding: var(--hrk-space-4) var(--hrk-space-5);
}
.auto-result-card__title {
  font-weight: var(--hrk-fw-semibold);
  color: var(--hrk-bordeaux);
  margin: 0 0 var(--hrk-space-2);
  font-size: var(--hrk-fs-body);
}
.auto-result-card__warnings,
.auto-result-card__fields {
  list-style: none;
  margin: var(--hrk-space-2) 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--hrk-space-1);
}
.hrk-state--inline {
  display: flex;
  align-items: center;
  gap: var(--hrk-space-3);
  padding: var(--hrk-space-3) 0;
}

/* ── Responsive ──────────────────────────────────────────── */
@media (max-width: 600px) {
  :root, .hrk-root { --hrk-fs-h1: 1.625rem; }
  .hrk-page { padding: var(--hrk-space-4) var(--hrk-space-3); }
  .hrk-card { padding: var(--hrk-space-4); }
  .upload-header { flex-direction: column; align-items: flex-start; }
  .doc-item__name { white-space: normal; }
}
</style>
