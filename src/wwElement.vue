<template>
  <div class="hrk-root">
    <main class="du-main">

      <!-- Laden -->
      <div v-if="loading" class="du-band du-band--grau">
        <div class="du-wrap hrk-state">
          <div class="hrk-spinner" aria-hidden="true"></div>
          <p class="hrk-muted">Wird geladen …</p>
        </div>
      </div>

      <!-- Nicht angemeldet -->
      <div v-else-if="needLogin" class="du-band du-band--grau">
        <div class="du-wrap hrk-state">
          <p class="hrk-state__title">Bitte melde dich an, um Dokumente hochzuladen.</p>
          <a class="du-fw" href="/anmelden">Anmelden <svg class="hrk-icon hrk-icon--sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><line x1="4" y1="12" x2="19" y2="12"/><polyline points="13,6 19,12 13,18"/></svg></a>
        </div>
      </div>

      <!-- Main -->
      <template v-else>

        <!-- Kopf: grosser Gloock-Titel, Zurück als Zweitweg -->
        <header class="du-top">
          <div class="du-wrap du-head">
            <h1 class="du-h1">Dokumente</h1>
            <a v-if="backHref" class="du-bk" :href="backHref">Zurück</a>
          </div>
        </header>

        <!-- 01 · Neues Dokument hochladen -->
        <section class="du-band du-band--grau" aria-labelledby="du-t-upload">
          <div class="du-wrap du-grp">
            <div class="du-grp__lab">
              <span class="du-nr" aria-hidden="true">01</span>
              <h2 id="du-t-upload" class="du-gt">Neues Dokument hochladen</h2>
            </div>

            <div class="du-grp__body">

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
                  <svg class="hrk-icon hrk-icon--lg upload-zone__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="M17 7 L9.5 14.5 a3 3 0 1 0 4.24 4.24 L20.5 12" />
                    <path d="M17 7 a3 3 0 0 0 -4.24 0 L6 13.76 a5 5 0 1 0 7.07 7.07" />
                  </svg>
                  <p class="upload-zone__text">Hier klicken oder Datei reinziehen</p>
                  <p class="hrk-muted upload-zone__hint">PDF, JPG, PNG oder DOCX, höchstens 10 MB</p>
                </template>

                <!-- Datei ausgewählt -->
                <template v-else>
                  <!-- PDF -->
                  <svg v-if="fileIconKind === 'pdf'" class="hrk-icon hrk-icon--lg upload-zone__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="M6 3 h9 l4 4 v14 h-13 z" />
                    <polyline points="15 3 15 7 19 7" />
                    <line x1="8.5" y1="13" x2="15.5" y2="13" />
                    <line x1="8.5" y1="16.5" x2="13" y2="16.5" />
                  </svg>
                  <!-- Bild -->
                  <svg v-else-if="fileIconKind === 'image'" class="hrk-icon hrk-icon--lg upload-zone__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
                    <circle cx="9" cy="10" r="1.7" />
                    <polyline points="4.5 16.5 9.5 12.5 13.5 15.5 16 13 19.5 16.5" />
                  </svg>
                  <!-- Word/Dokument -->
                  <svg v-else-if="fileIconKind === 'word'" class="hrk-icon hrk-icon--lg upload-zone__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="M6 3 h9 l4 4 v14 h-13 z" />
                    <polyline points="15 3 15 7 19 7" />
                    <line x1="8.5" y1="12" x2="15.5" y2="12" />
                    <line x1="8.5" y1="15.5" x2="15.5" y2="15.5" />
                    <line x1="8.5" y1="19" x2="12" y2="19" />
                  </svg>
                  <!-- generisch -->
                  <svg v-else class="hrk-icon hrk-icon--lg upload-zone__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="M6 3 h9 l4 4 v14 h-13 z" />
                    <polyline points="15 3 15 7 19 7" />
                  </svg>
                  <div class="upload-zone__file-info">
                    <p class="upload-zone__file-name">{{ selectedFile.name }}</p>
                    <p class="hrk-muted">{{ fmtSize(selectedFile.size) }}</p>
                  </div>
                  <button
                    type="button"
                    class="upload-zone__clear du-ico"
                    aria-label="Datei entfernen"
                    @click.stop="clearFile"
                  >
                    <svg class="hrk-icon hrk-icon--sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                      <line x1="6" y1="6" x2="18" y2="18" />
                      <line x1="18" y1="6" x2="6" y2="18" />
                    </svg>
                  </button>
                </template>
              </div>

              <!-- Kategorie -->
              <div class="hrk-field">
                <label class="hrk-label" for="doc-category">Kategorie</label>
                <select id="doc-category" v-model="category" class="hrk-input hrk-select">
                  <optgroup label="Verträge &amp; Personal">
                    <option value="Arbeitsvertrag">Arbeitsvertrag · Auto-Import</option>
                    <option value="Ausweiskopie">Ausweiskopie</option>
                    <option value="Zeugnis">Zeugnis</option>
                    <option value="Lohnabrechnung">Lohnabrechnung</option>
                  </optgroup>
                  <optgroup label="Versicherungspolicen · Auto-Extraktion">
                    <option value="SUVA-Police">SUVA-Police (UVG Berufsunfall / NBU)</option>
                    <option value="KTG-Police">KTG-Police (Krankentaggeld)</option>
                    <option value="BVG-Police">BVG-Police (Pensionskasse)</option>
                  </optgroup>
                  <optgroup label="Sonstiges">
                    <option value="Sonstiges">Sonstiges</option>
                  </optgroup>
                </select>
                <p v-if="insuranceType" class="hrk-hint">Policen gehören zum Betrieb, nicht zu einer Person. In der Liste bleibt der Policentyp sichtbar.</p>
              </div>

              <!-- Personenwahl (SW-4): Dokument einer Mitarbeitenden Person zuordnen -->
              <div v-if="showEmployeeField" class="hrk-field">
                <label class="hrk-label" for="doc-employee">Mitarbeitende Person<template v-if="employeeRequired"> (Pflicht)</template><template v-else> (optional)</template></label>
                <select
                  id="doc-employee"
                  v-model="employeeId"
                  class="hrk-input hrk-select"
                  :class="{ 'hrk-input--error': fieldErrors.employee }"
                  :disabled="employeesLoading"
                  :aria-invalid="fieldErrors.employee ? 'true' : null"
                  :aria-describedby="fieldErrors.employee ? 'doc-employee-error doc-employee-hint' : 'doc-employee-hint'"
                >
                  <option value="">{{ employeesLoading ? 'Mitarbeitende werden geladen …' : 'Bitte wählen' }}</option>
                  <option v-for="emp in employees" :key="emp.id" :value="emp.id">{{ emp.name }}</option>
                </select>
                <p v-if="fieldErrors.employee" id="doc-employee-error" class="hrk-field-error">{{ fieldErrors.employee }}</p>
                <p id="doc-employee-hint" class="hrk-hint">
                  <template v-if="employeesError">{{ employeesError }}</template>
                  <template v-else-if="!employeesLoading && !employees.length">Noch keine Mitarbeitenden erfasst. <a class="hrk-link" href="/mitarbeiter">Lege zuerst die Person an.</a></template>
                  <template v-else-if="employeeRequired">So landet das Dokument in der Akte der Person.</template>
                  <template v-else>Wenn du eine Person wählst, erscheint das Dokument auch in ihrer Akte.</template>
                </p>
              </div>

              <!-- Auto-Verarbeitung Hinweis (sichtbar wenn Datei ausgewählt) -->
              <div v-if="isArbeitsvertrag && selectedFile" class="hrk-note hrk-note--info hrk-note--icon">
                <svg class="hrk-icon hrk-icon--sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="9" />
                  <line x1="12" y1="7.5" x2="12" y2="13" />
                  <circle cx="12" cy="16.3" r="0.15" fill="currentColor" stroke-width="2.4" />
                </svg>
                <span><strong>Emily ist aktiv.</strong> Nach dem Hochladen liest Emily den Vertrag automatisch und legt den Mitarbeiter an.</span>
              </div>
              <div v-else-if="insuranceType && selectedFile" class="hrk-note hrk-note--info hrk-note--icon">
                <svg class="hrk-icon hrk-icon--sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="9" />
                  <line x1="12" y1="7.5" x2="12" y2="13" />
                  <circle cx="12" cy="16.3" r="0.15" fill="currentColor" stroke-width="2.4" />
                </svg>
                <span><strong>Emily ist aktiv.</strong> Nach dem Hochladen liest Emily die Police und zeigt dir die Werte. Übernehmen kannst du sie unter Betrieb › Versicherungen.</span>
              </div>

              <!-- Meldungen Upload -->
              <div v-if="uploadError" class="hrk-note hrk-note--warn" role="alert">{{ uploadError }}</div>
              <div v-if="uploadSuccess" class="hrk-note hrk-note--success" role="status">{{ uploadSuccess }}</div>

              <!-- Auto-Import Ladeindikator -->
              <div v-if="importLoading" class="hrk-state hrk-state--inline">
                <div class="hrk-spinner" aria-hidden="true"></div>
                <p class="hrk-muted">Emily liest den Vertrag und legt den Mitarbeiter an …</p>
              </div>

              <!-- Auto-Import Fehler -->
              <div v-if="importError" class="hrk-note hrk-note--warn" role="alert">{{ importError }}</div>

              <!-- Auto-Import Ergebnis -->
              <div v-if="importResult" class="auto-result-card">
                <p class="auto-result-card__title auto-result-card__title--icon">
                  <svg class="hrk-icon hrk-icon--sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <circle cx="12" cy="12" r="9" />
                    <polyline points="8 12.5 11 15.5 16 9.5" />
                  </svg>
                  Mitarbeiter {{ importResult.employee_created ? 'angelegt' : 'aktualisiert' }}
                </p>
                <p v-if="importResult.employee_created" class="hrk-muted">
                  Onboarding-Checkliste gestartet.
                  <template v-if="importResult.case_id"> Vertragsentwurf erstellt.</template>
                </p>
                <ul v-if="importResult.warnings && importResult.warnings.length" class="auto-result-card__warnings">
                  <li v-for="w in importResult.warnings" :key="w" class="hrk-muted auto-result-card__warning-item">
                    <svg class="hrk-icon hrk-icon--sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                      <polygon points="12 3.5 21.5 20 2.5 20" />
                      <line x1="12" y1="9.5" x2="12" y2="14" />
                      <circle cx="12" cy="17" r="0.15" fill="currentColor" stroke-width="2.2" />
                    </svg>
                    {{ w }}
                  </li>
                </ul>
                <div v-if="importResult.employee_id" class="auto-result-card__act">
                  <a :href="`/mitarbeiter-detail?id=${importResult.employee_id}`" class="du-lk">Mitarbeiter öffnen</a>
                </div>
              </div>

              <!-- Versicherungs-Extraktion Ladeindikator -->
              <div v-if="extractLoading" class="hrk-state hrk-state--inline">
                <div class="hrk-spinner" aria-hidden="true"></div>
                <p class="hrk-muted">Emily liest die Police und speichert die Daten …</p>
              </div>

              <!-- Versicherungs-Extraktion Fehler -->
              <div v-if="extractError" class="hrk-note hrk-note--warn" role="alert">{{ extractError }}</div>

              <!-- Versicherungs-Extraktion Ergebnis -->
              <div v-if="extractResult" class="auto-result-card">
                <p class="auto-result-card__title auto-result-card__title--icon">
                  <svg class="hrk-icon hrk-icon--sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <circle cx="12" cy="12" r="9" />
                    <polyline points="8 12.5 11 15.5 16 9.5" />
                  </svg>
                  Werte aus der Police gelesen
                </p>
                <ul v-if="extractWerte.length" class="auto-result-card__fields">
                  <li v-for="w in extractWerte" :key="w.feld">• {{ w.label }}: {{ w.wert }}</li>
                </ul>
                <p class="hrk-muted">{{ msgPoliceNurGelesen }} <a class="hrk-link" href="/onboarding-start?bearbeiten=1&amp;schritt=4">Zu Betriebsangaben › Versicherungen &amp; Sätze</a></p>
                <ul v-if="extractResult.warnings && extractResult.warnings.length" class="auto-result-card__warnings">
                  <li v-for="w in extractResult.warnings" :key="w" class="hrk-muted auto-result-card__warning-item">
                    <svg class="hrk-icon hrk-icon--sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                      <polygon points="12 3.5 21.5 20 2.5 20" />
                      <line x1="12" y1="9.5" x2="12" y2="14" />
                      <circle cx="12" cy="17" r="0.15" fill="currentColor" stroke-width="2.2" />
                    </svg>
                    {{ w }}
                  </li>
                </ul>
              </div>

              <!-- Hauptaktion der Seite: Dokument hochladen -->
              <div class="du-cta">
                <button
                  type="button"
                  class="du-fw du-fw--lg"
                  :disabled="!selectedFile || uploading"
                  :aria-busy="uploading ? 'true' : null"
                  @click="uploadFile"
                >
                  <span v-if="uploading" class="btn-inner">
                    <span class="btn-spinner" aria-hidden="true"></span>
                    Wird hochgeladen …
                  </span>
                  <span v-else class="btn-inner">Dokument hochladen <svg class="hrk-icon hrk-icon--sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><line x1="4" y1="12" x2="19" y2="12"/><polyline points="13,6 19,12 13,18"/></svg></span>
                </button>
              </div>
            </div>
          </div>
        </section>

        <!-- 02 · Deine Dokumente (Liste mit Haarlinien) -->
        <section class="du-band du-band--weiss" aria-labelledby="du-t-liste">
          <div class="du-wrap du-grp">
            <div class="du-grp__lab">
              <span class="du-nr" aria-hidden="true">02</span>
              <h2 id="du-t-liste" class="du-gt">Deine Dokumente</h2>
            </div>

            <div class="du-grp__body du-grp__body--liste">
              <div v-if="listError" class="hrk-note hrk-note--warn" role="alert">{{ listError }}</div>
              <div v-if="downloadError" class="hrk-note hrk-note--warn" role="alert">{{ downloadError }}</div>

              <div v-if="listLoading" class="hrk-state hrk-state--inline">
                <div class="hrk-spinner" aria-hidden="true"></div>
                <p class="hrk-muted">Liste wird geladen …</p>
              </div>

              <div v-else-if="!documents.length" class="hrk-empty">
                <p class="hrk-empty__text">Noch keine Dokumente hochgeladen.</p>
                <p class="hrk-muted">Lade oben dein erstes Dokument hoch. Das dauert nur ein paar Sekunden.</p>
              </div>

              <ul v-else class="doc-list" role="list">
                <li v-for="doc in documents" :key="doc.id" class="doc-item">
                  <!-- PDF -->
                  <svg v-if="docIconKind(doc.mime_type) === 'pdf'" class="hrk-icon hrk-icon--lg doc-item__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="M6 3 h9 l4 4 v14 h-13 z" />
                    <polyline points="15 3 15 7 19 7" />
                    <line x1="8.5" y1="13" x2="15.5" y2="13" />
                    <line x1="8.5" y1="16.5" x2="13" y2="16.5" />
                  </svg>
                  <!-- Bild -->
                  <svg v-else-if="docIconKind(doc.mime_type) === 'image'" class="hrk-icon hrk-icon--lg doc-item__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
                    <circle cx="9" cy="10" r="1.7" />
                    <polyline points="4.5 16.5 9.5 12.5 13.5 15.5 16 13 19.5 16.5" />
                  </svg>
                  <!-- Word/Dokument -->
                  <svg v-else-if="docIconKind(doc.mime_type) === 'word'" class="hrk-icon hrk-icon--lg doc-item__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="M6 3 h9 l4 4 v14 h-13 z" />
                    <polyline points="15 3 15 7 19 7" />
                    <line x1="8.5" y1="12" x2="15.5" y2="12" />
                    <line x1="8.5" y1="15.5" x2="15.5" y2="15.5" />
                    <line x1="8.5" y1="19" x2="12" y2="19" />
                  </svg>
                  <!-- generisch -->
                  <svg v-else class="hrk-icon hrk-icon--lg doc-item__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="M6 3 h9 l4 4 v14 h-13 z" />
                    <polyline points="15 3 15 7 19 7" />
                  </svg>
                  <div class="doc-item__body">
                    <p class="doc-item__name">{{ docLabel(doc).name }}</p>
                    <p class="doc-item__meta hrk-muted hrk-small">
                      <span class="hrk-badge hrk-badge--neutral">{{ docLabel(doc).category }}</span>
                      <template v-if="employeeName(doc.employee_id)">&nbsp;·&nbsp;{{ employeeName(doc.employee_id) }}</template>
                      &nbsp;·&nbsp;{{ fmtDate(doc.uploaded_at) }}
                      <template v-if="doc.file_size_bytes">&nbsp;·&nbsp;{{ fmtSize(doc.file_size_bytes) }}</template>
                    </p>
                  </div>
                  <div class="doc-item__actions">
                    <button
                      type="button"
                      class="du-ico doc-btn"
                      :disabled="downloading === doc.id"
                      :aria-label="'Öffnen: ' + docLabel(doc).name"
                      @click="downloadFile(doc)"
                    >
                      <span v-if="downloading === doc.id" class="btn-spinner btn-spinner--sm" aria-hidden="true"></span>
                      <svg v-else class="hrk-icon hrk-icon--sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <line x1="12" y1="4" x2="12" y2="15" />
                        <polyline points="7.5 11 12 15.5 16.5 11" />
                        <line x1="5" y1="19.5" x2="19" y2="19.5" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      class="du-ico du-ico--del doc-btn doc-btn--delete"
                      :disabled="deleting === doc.id"
                      :aria-label="'Löschen: ' + docLabel(doc).name"
                      @click="confirmDelete(doc)"
                    >
                      <span v-if="deleting === doc.id" class="btn-spinner btn-spinner--sm btn-spinner--del" aria-hidden="true"></span>
                      <svg v-else class="hrk-icon hrk-icon--sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <line x1="5" y1="7" x2="19" y2="7" />
                        <path d="M9 7 V5 a1 1 0 0 1 1 -1 h4 a1 1 0 0 1 1 1 v2" />
                        <path d="M7 7 l1 13 a1.5 1.5 0 0 0 1.5 1.4 h5 a1.5 1.5 0 0 0 1.5 -1.4 l1 -13" />
                        <line x1="10" y1="11" x2="10" y2="17" />
                        <line x1="14" y1="11" x2="14" y2="17" />
                      </svg>
                    </button>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </section>

        <!-- ── Lösch-Bestätigung Modal ── -->
        <div v-if="deleteTarget" class="modal-overlay" role="presentation" @click.self="deleteTarget = null">
          <div class="modal-box" role="dialog" aria-modal="true" aria-labelledby="modal-title">
            <h2 id="modal-title" class="modal-title">Dokument löschen?</h2>
            <p class="modal-body">
              Willst du <strong>{{ docLabel(deleteTarget).name }}</strong> wirklich löschen?
              Das lässt sich nicht rückgängig machen.
            </p>
            <div class="modal-actions">
              <button type="button" class="du-bk" @click="deleteTarget = null">Abbrechen</button>
              <button type="button" class="du-del" @click="deleteFile(deleteTarget)">Löschen</button>
            </div>
          </div>
        </div>

      </template>
    </main>
  </div>
</template>

<script>
/**
 * WeWeb Coded Component — Dokument-Upload (HR am Tisch / imploya)
 * Erlaubt das Hochladen von HR-Dokumenten (PDF, JPG, PNG, DOCX) ins Supabase Storage.
 * Speichert Metadaten in der Tabelle `employee_documents`.
 *
 * VORAUSSETZUNG (manuell in Supabase anlegen):
 *   Storage-Bucket «employee-documents» (privat, file_size_limit 10 MB)
 *
 * Props: authToken, apiKey, supabaseUrl, storageBucket, backUrl
 *
 * Nacht-Buendel 28.09.2026 (SW-3 Policen als «Sonstiges» mit Typ-Praefix, SW-4
 * Personenwahl + employee_id, T1-36 Download-Adresse): Logik in ./dokument-logik.js,
 * Tests in ./dokument-logik.test.js.
 */

import {
  PERSON_CATEGORIES,
  PERSON_REQUIRED_CATEGORIES,
  parseDocLabel,
  validatePerson,
  buildInsertPayload,
  mapEmployees,
  saveMetadata,
  signedUrlFull,
  INSURANCE_LABELS,
  MSG_POLICE_NUR_GELESEN,
  buildExtractBody,
  ausgeleseneWerte,
} from './dokument-logik.js';

// Stil A (Entscheid 13.10.2026): Gloock (Titel) und Archivo (Labels) nachladen, weil die App-Seite sie nicht von selbst
// laedt. Eigener Link-Id, damit das Paket von header-pro/footer (id hrk-fonts) nicht verdraengt wird.
// Ohne Laden gelten Georgia bzw. System-Schrift.
function hrkEnsureBrandFont() {
  try {
    const doc = (typeof wwLib !== 'undefined' && wwLib && typeof wwLib.getFrontDocument === 'function')
      ? wwLib.getFrontDocument()
      : (typeof document !== 'undefined' ? document : null);
    if (!doc || !doc.head || doc.getElementById('hrk-fonts-marke')) return;
    const link = doc.createElement('link');
    link.id = 'hrk-fonts-marke'; link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Archivo:wght@500;600&family=Gloock&family=Inter:wght@400;500;600&display=swap';
    doc.head.appendChild(link);
  } catch (e) { /* Georgia als Rueckfall */ }
}

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
      // Personenwahl (SW-4)
      employeeId: '',
      employees: [],
      employeesLoading: false,
      employeesError: '',
      employeesLoaded: false,
      fieldErrors: {},
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
      downloadError: '',
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
    extractWerte() {
      return ausgeleseneWerte(this.extractResult && this.extractResult.fields);
    },
    msgPoliceNurGelesen() {
      return MSG_POLICE_NUR_GELESEN;
    },
    baseUrl() {
      let __sbBase = String((this.content && this.content.supabaseUrl) || 'https://ztvqsxdudzdyqgeylujr.supabase.co').replace(/\/+$/, '');
      if (/nemxnflngcfrpamkuesm/.test(String(__sbBase))) __sbBase = '';
      return __sbBase;
    },
    bucket() {
      return String((this.content && this.content.storageBucket) || 'employee-documents');
    },
    // Token LIVE lesen: zuerst Property (WeWeb-Binding), sonst WeWeb-Auth-Kontext,
    // sonst persistierte Supabase-Session. Das Prop-Binding hinkt nach Login/Refresh
    // hinterher — so senden wir immer den frischen User-JWT (Muster: vertrag-erstellen).
    tokenRaw() {
      const fromProp = ((this.content && this.content.authToken) || '').toString().trim();
      if (fromProp) return fromProp;
      try {
        const auth = (typeof wwLib !== 'undefined' && wwLib.globalContext && wwLib.globalContext.auth) ? wwLib.globalContext.auth : null;
        const at = auth && auth.session && auth.session.access_token;
        if (at) return String(at).trim();
      } catch (e) { /* ignore */ }
      try {
        const win = (typeof wwLib !== 'undefined' && wwLib.getFrontWindow) ? wwLib.getFrontWindow() : (typeof window !== 'undefined' ? window : null);
        const ls = win && win.localStorage;
        if (ls) {
          const raw = ls.getItem('sb-ztvqsxdudzdyqgeylujr-auth-token');
          if (raw) {
            const o = JSON.parse(raw);
            const at = (o && o.access_token) || (o && o.currentSession && o.currentSession.access_token);
            if (at) return String(at).trim();
          }
        }
      } catch (e) { /* ignore */ }
      return '';
    },
    authHeaders() {
      const key = String((this.content && this.content.apiKey) || '');
      const raw = this.tokenRaw;
      const bearer = raw.startsWith('Bearer ') ? raw : `Bearer ${raw}`;
      return { apikey: key, Authorization: bearer };
    },
    backHref() {
      return String((this.content && this.content.backUrl) || '/mitarbeiter');
    },
    /** User-ID aus JWT-Payload (sub) */
    userId() {
      const raw = this.tokenRaw;
      const jwt = raw.startsWith('Bearer ') ? raw.slice(7) : raw;
      if (!jwt) return '';
      try {
        const b64 = jwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
        const payload = JSON.parse(atob(b64));
        return String(payload.sub || '');
      } catch (e) { return ''; }
    },
    /** Icon-Art ('pdf'|'image'|'word'|'generic') fuer die gewaehlte Datei */
    fileIconKind() {
      return this.selectedFile ? this.docIconKind(this.selectedFile.type) : 'generic';
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
    /** Personenwahl sichtbar (Ausweiskopie, Zeugnis, Lohnabrechnung, Sonstiges) */
    showEmployeeField() {
      return PERSON_CATEGORIES.includes(this.category);
    },
    /** Person Pflicht: personenbezogene Kategorie und die Liste konnte geladen werden */
    employeeRequired() {
      return PERSON_REQUIRED_CATEGORIES.includes(this.category);
    },
    /** id -> Anzeigename der Mitarbeitenden */
    employeeNameById() {
      const map = {};
      (this.employees || []).forEach((e) => { if (e && e.id) map[e.id] = e.name; });
      return map;
    },
  },

  watch: {
    'content.authToken'(v) { if (v) this.init(); },
    'content.apiKey'(v)    { if (v && this.content && this.content.authToken) this.init(); },
    // Live-Clearing (DESIGN-SYSTEM §9): Fehler verschwindet, sobald die Bedingung erfuellt ist
    employeeId(v) { this.clearFieldError('employee', !!v); },
    category()    { this.clearFieldError('employee', !this.employeeRequired || !!this.employeeId); },
  },

  mounted() {
    hrkEnsureBrandFont();
    if (this.tokenRaw && this.content && this.content.apiKey) this.init();
    else if (!this.tokenRaw) this.needLogin = true;
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
      if (!this.tokenRaw) { this.needLogin = true; return; }
      this.loadFiles();
      this.loadEmployees();
    },

    clearFieldError(key, isValid) {
      if (!isValid || !this.fieldErrors[key]) return;
      const next = { ...this.fieldErrors };
      delete next[key];
      this.fieldErrors = next;
    },

    /** Fokus aufs erste fehlerhafte Feld (Komfort, nie blockierend) */
    focusFirstError(errObj, idMap) {
      const first = Object.keys(errObj || {}).find((k) => errObj[k] && idMap[k]);
      if (!first) return;
      this.$nextTick(() => {
        try {
          const doc = (typeof wwLib !== 'undefined' && wwLib.getFrontDocument) ? wwLib.getFrontDocument() : (typeof document !== 'undefined' ? document : null);
          const el = doc && doc.getElementById(idMap[first]);
          if (el && el.focus) el.focus();
        } catch (e) { /* nie blockieren */ }
      });
    },

    // Bei 401 das Supabase-Token via GoTrue (refresh_token) erneuern.
    // Das WeWeb-Plugin refresht nicht automatisch (Session läuft nach 1h ab).
    // Gibt den frischen access_token zurück (oder '') und schreibt die Session zurück.
    async _refreshAuthToken() {
      try {
        const auth = (typeof wwLib !== 'undefined' && wwLib.globalContext && wwLib.globalContext.auth) ? wwLib.globalContext.auth : null;
        const rt = auth && auth.session && auth.session.refresh_token;
        const apiKey = (this.content && this.content.apiKey) || '';
        if (!rt || !apiKey) return '';
        const res = await this.fetchWithTimeout(`${this.baseUrl}/auth/v1/token?grant_type=refresh_token`, {
          method: 'POST', headers: { apikey: apiKey, 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: rt }),
        });
        if (!res.ok) return '';
        const ns = await res.json();
        if (!ns || !ns.access_token) return '';
        try {
          const win = (typeof wwLib !== 'undefined' && wwLib.getFrontWindow) ? wwLib.getFrontWindow() : (typeof window !== 'undefined' ? window : null);
          const ls = win && win.localStorage;
          const wwSess = { access_token: ns.access_token, token_type: ns.token_type, expires_in: ns.expires_in, expires_at: ns.expires_at, refresh_token: ns.refresh_token };
          if (ls) {
            ls.setItem('ww-auth-session', JSON.stringify(wwSess));
            const ref = ((String(this.baseUrl || '').match(/https?:\/\/([a-z0-9]+)\.supabase\.co/i) || [])[1]) || 'ztvqsxdudzdyqgeylujr';
            const k = `sb-${ref}-auth-token`; const cur = JSON.parse(ls.getItem(k) || '{}');
            ls.setItem(k, JSON.stringify(Object.assign(cur, wwSess, { user: ns.user || cur.user })));
          }
          if (auth && auth.session) Object.assign(auth.session, wwSess);
        } catch (e) { /* writeback best-effort */ }
        return ns.access_token;
      } catch (e) { return ''; }
    },

    /** Zentraler Fetch für authentifizierte Requests: bei 401 Token EINMAL
     *  erneuern und denselben Request mit frischem Bearer wiederholen. */
    async authedFetch(url, options, ms) {
      const opts = options || {};
      let res = await this.fetchWithTimeout(url, opts, ms);
      if (res.status === 401) {
        const fresh = await this._refreshAuthToken();
        if (fresh) {
          const headers = { ...(opts.headers || {}), Authorization: `Bearer ${fresh}` };
          res = await this.fetchWithTimeout(url, { ...opts, headers }, ms);
        }
      }
      return res;
    },

    // ── Hilfsfunktionen ──────────────────────────────────────────────────────

    /** Icon-Art ('pdf'|'image'|'word'|'generic') je nach MIME-Typ */
    docIconKind(mime) {
      if (!mime) return 'generic';
      if (mime.includes('pdf'))               return 'pdf';
      if (mime.includes('image'))             return 'image';
      if (mime.includes('word') || mime.includes('document')) return 'word';
      return 'generic';
    },

    /** Anzeige-Label einer Zeile: { category, name } (Policentyp aus dem Praefix) */
    docLabel(doc) {
      return parseDocLabel(doc);
    },

    employeeName(id) {
      return (id && this.employeeNameById[id]) || '';
    },

    /**
     * Prueft die Eingaben vor dem Upload. Pflicht-Person nur, wenn die Liste
     * geladen werden konnte; scheitert der RPC, blockieren wir den Upload nicht.
     * @returns {boolean} true wenn alles passt
     */
    validateUpload() {
      const e = validatePerson({
        category: this.category,
        employeeId: this.employeeId,
        employeesLoaded: this.employeesLoaded,
        employeeCount: this.employees.length,
      });
      this.fieldErrors = e;
      if (Object.keys(e).length) {
        this.focusFirstError(e, { employee: 'doc-employee' });
        return false;
      }
      return true;
    },

    /** Datei nach abgelehntem Insert wieder aus dem Storage entfernen. true = weg. */
    async removeUploadedFile(filePath) {
      try {
        const res = await this.authedFetch(
          `${this.baseUrl}/storage/v1/object/${encodeURIComponent(this.bucket)}`,
          {
            method:  'DELETE',
            headers: { ...this.authHeaders, 'Content-Type': 'application/json' },
            body:    JSON.stringify({ prefixes: [filePath] }),
          }
        );
        return !!(res && res.ok);
      } catch (e) { return false; }
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
      if (!uid) { this.uploadError = 'Deine Anmeldung ist abgelaufen. Bitte melde dich neu an.'; return; }
      if (!this.validateUpload()) return;

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
        const uploadRes = await this.authedFetch(
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
              'Der Dokumenten-Speicher ist noch nicht bereit. ' +
              'Bitte versuch es später nochmal oder melde dich kurz beim imploya-Support.';
          } else {
            this.uploadError = 'Der Upload hat nicht geklappt. Bitte versuch es nochmal.';
          }
          this.emitEvent('error', { reason: 'upload', detail: msg });
          return;
        }

        // 2) Metadaten in employee_documents speichern (SW-3: category im CHECK, SW-4: employee_id).
        // Erfolg nur bei geschriebener Zeile; bei Ablehnung Datei wieder entfernen und ehrlich sagen.
        const meta = buildInsertPayload({
          userId: uid,
          filePath,
          mime,
          file: this.selectedFile,
          category: this.category,
          employeeId: this.employeeId,
        });
        const saved = await saveMetadata({
          insert: () => this.authedFetch(
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
          ),
          remove: () => this.removeUploadedFile(filePath),
        });
        if (!saved.ok) {
          console.error('[dokument-upload] Insert employee_documents fehlgeschlagen:', saved.status, 'Datei entfernt:', saved.removed);
          this.uploadError = saved.message;
          this.emitEvent('error', { reason: 'db', status: saved.status, file_removed: saved.removed });
          if (saved.removed === null) await this.loadFiles();
          return;
        }
        const insertedDocId = (saved.row && saved.row.id) || null;
        const personName = this.employeeName(meta.employee_id);
        this.uploadSuccess = personName
          ? `«${this.selectedFile.name}» ist gespeichert und liegt in der Akte von ${personName}.`
          : `«${this.selectedFile.name}» ist gespeichert.`;
        this.emitEvent('uploaded', {
          file_name: this.selectedFile.name,
          category: this.category,
          employee_id: meta.employee_id,
        });
        if (meta.employee_id) this.employeeId = '';

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
          this.uploadError = 'Keine Verbindung beim Hochladen. Prüfe dein Internet und versuche es nochmal.';
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
        const res = await this.authedFetch(url, {
          headers: { ...this.authHeaders, Accept: 'application/json' },
        });
        if (res.status === 401 || res.status === 403) { this.needLogin = true; return; }
        if (!res.ok) {
          this.listError = 'Die Dokumente konnten nicht geladen werden. Lade die Seite neu.';
          return;
        }
        const data = await res.json().catch(() => []);
        this.documents = Array.isArray(data) ? data : [];
      } catch (e) {
        this.listError = 'Keine Verbindung. Die Dokumentenliste konnte nicht geladen werden. Prüfe dein Internet und lade die Seite neu.';
      } finally {
        this.listLoading = false;
      }
    },

    /**
     * Mitarbeitende des Betriebs laden (gleiche Quelle wie personaldossier:
     * RPC get_user_employees, RLS-gefiltert). Scheitert der Aufruf, bleibt der
     * Upload moeglich, die Person ist dann nicht Pflicht.
     */
    async loadEmployees() {
      this.employeesLoading = true;
      this.employeesError = '';
      this.employeesLoaded = false;
      try {
        const fields = ['id', 'firstname', 'lastname'].join(',');
        const url = `${this.baseUrl}/rest/v1/rpc/get_user_employees?select=${fields}&order=lastname.asc`;
        const res = await this.authedFetch(url, {
          headers: { ...this.authHeaders, Accept: 'application/json' },
        });
        if (!res.ok) {
          this.employees = [];
          this.employeesError = 'Die Mitarbeitenden konnten gerade nicht geladen werden. Du kannst das Dokument trotzdem hochladen.';
          return;
        }
        const data = await res.json().catch(() => []);
        const list = Array.isArray(data) ? data : [];
        this.employees = mapEmployees(list);
        this.employeesLoaded = true;
      } catch (e) {
        this.employees = [];
        this.employeesError = 'Keine Verbindung. Die Mitarbeitenden konnten nicht geladen werden. Du kannst das Dokument trotzdem hochladen.';
      } finally {
        this.employeesLoading = false;
      }
    },

    // ── Download (Signed URL) ────────────────────────────────────────────────

    async downloadFile(doc) {
      if (this.downloading) return;
      this.downloading = doc.id;
      this.downloadError = '';
      try {
        // Signed URL generieren (1 Stunde gültig)
        const signRes = await this.authedFetch(
          `${this.baseUrl}/storage/v1/object/sign/${encodeURIComponent(this.bucket)}/${doc.file_path}`,
          {
            method:  'POST',
            headers: { ...this.authHeaders, 'Content-Type': 'application/json' },
            body:    JSON.stringify({ expiresIn: 3600 }),
          }
        );
        if (signRes.ok) {
          const body = await signRes.json().catch(() => ({}));
          const full = signedUrlFull(this.baseUrl, body && (body.signedURL || body.signedUrl));
          if (full) {
            const win = (typeof wwLib !== 'undefined' && wwLib.getFrontWindow) ? wwLib.getFrontWindow() : (typeof window !== 'undefined' ? window : null);
            if (win) win.open(full, '_blank', 'noopener');
            return;
          }
        }
        // Kein signierter Link: ein Tab ohne Anmeldung zeigte nur eine Fehlermeldung (T1-36).
        console.error('[dokument-upload] Signieren fehlgeschlagen:', signRes.status);
        this.downloadError = 'Das Dokument lässt sich gerade nicht öffnen. Bitte versuch es nochmal.';
      } catch (e) {
        this.downloadError = 'Das Dokument lässt sich gerade nicht öffnen. Bitte versuch es nochmal.';
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
      this.uploadError = '';
      try {
        // 1) Datei aus Storage löschen. Silent-Failure-Audit 19.09.2026: Fehler hier
        // blieb bisher komplett unsichtbar — die Datei (ggf. Ausweis, Arztzeugnis)
        // bleibt dann physisch im Bucket stehen, auch wenn der DB-Eintrag verschwindet.
        const storageRes = await this.authedFetch(
          `${this.baseUrl}/storage/v1/object/${encodeURIComponent(this.bucket)}`,
          {
            method:  'DELETE',
            headers: { ...this.authHeaders, 'Content-Type': 'application/json' },
            body:    JSON.stringify({ prefixes: [doc.file_path] }),
          }
        ).catch(() => null);
        const storageFailed = !storageRes || !storageRes.ok;
        if (storageFailed) console.error('[dokument-upload] Storage-Delete fehlgeschlagen:', doc.file_path, storageRes && storageRes.status);

        // 2) Metadaten aus DB löschen (RLS stellt sicher: nur eigene Zeilen)
        const dbRes = await this.authedFetch(
          `${this.baseUrl}/rest/v1/employee_documents?id=eq.${encodeURIComponent(doc.id)}`,
          {
            method:  'DELETE',
            headers: { ...this.authHeaders, Prefer: 'return=minimal' },
          }
        );
        if (dbRes.ok || dbRes.status === 404) {
          this.documents = this.documents.filter(d => d.id !== doc.id);
          this.emitEvent('deleted', { id: doc.id });
          // Metadaten sind weg, aber die Datei liegt evtl. noch im Storage — das
          // muss sichtbar sein, sonst wirkt "gelöscht" vollständiger als es ist.
          if (storageFailed) this.uploadError = 'Dokument aus der Liste entfernt, aber die Datei selbst konnte nicht vollständig gelöscht werden. Bitte melde dich beim imploya-Support.';
        } else {
          console.error('[dokument-upload] DB-Delete fehlgeschlagen:', doc.id, dbRes.status);
          this.uploadError = 'Löschen hat nicht geklappt. Bitte versuch es nochmal.';
        }
      } catch (e) {
        this.uploadError = 'Löschen hat nicht geklappt. Bitte versuch es nochmal.';
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
        const res = await this.authedFetch(
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
            this.authedFetch(
              `${this.baseUrl}/rest/v1/employee_documents?id=eq.${encodeURIComponent(docId)}`,
              {
                method: 'PATCH',
                headers: { ...this.authHeaders, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
                body: JSON.stringify({ employee_id: body.employee_id }),
              }
            ).then((r) => {
              // Nicht-blockierend, aber nicht stumm: ohne Verknuepfung fehlt das Dokument in der Akte (SW-4)
              if (!r || !r.ok) console.error('[dokument-upload] Verknuepfung Dokument/Person fehlgeschlagen:', r && r.status);
            }).catch(() => console.error('[dokument-upload] Verknuepfung Dokument/Person: Netzwerkfehler'));
          }
        } else {
          const msg = String((body && (body.error || body.message)) || `HTTP ${res.status}`);
          this.importError = 'Der automatische Import hat nicht geklappt. Du kannst die Person von Hand erfassen. Das Dokument ist gespeichert.';
        }
      } catch (e) {
        if (e && e.name === 'AbortError') {
          this.importError = 'Der Import hat zu lange gedauert. Bitte versuche es nochmal.';
        } else {
          this.importError = 'Keine Verbindung beim automatischen Import. Du kannst die Person von Hand erfassen. Das Dokument ist gespeichert.';
        }
      } finally {
        this.importLoading = false;
      }
    },

    /**
     * DB-Spaltennamen aus extract-insurance-data auf lesbare Labels mappen.
     * @param {string} f — roher Spaltenname (z.B. 'ktg_versicherer')
     * @returns {string} lesbares Label
     */
    fieldLabel(f) {
      return INSURANCE_LABELS[f] || f;
    },

    /**
     * Versicherungspolice hochgeladen → extract-insurance-data aufrufen.
     * Nur auslesen (nur_auslesen:true, wie Einrichtung Schritt 4): nichts wird
     * gespeichert, die Werte werden angezeigt und unter Betrieb › Versicherungen
     * uebernommen.
     * @param {File}   file          — die hochgeladene Datei
     * @param {string} insurance_type — 'suva' | 'ktg' | 'bvg'
     */
    async extractInsurance(file, insurance_type) {
      this.extractLoading = true;
      this.extractError  = '';
      this.extractResult = null;
      try {
        const file_base64 = await this.fileToBase64(file);
        const res = await this.authedFetch(
          `${this.baseUrl}/functions/v1/extract-insurance-data`,
          {
            method: 'POST',
            headers: { ...this.authHeaders, 'Content-Type': 'application/json' },
            body: JSON.stringify(buildExtractBody({ file_base64, mime_type: file.type, insurance_type })),
          },
          90000
        );
        const body = await res.json().catch(() => ({}));
        if (res.ok && body && body.success) {
          this.extractResult = body;
          this.emitEvent('insurance-extracted', {
            insurance_type,
            updated_fields: body.updated_fields || [],
            fields: body.fields || {},
            gespeichert: body.gespeichert === true,
          });
        } else {
          const msg = String((body && (body.error || body.message)) || `HTTP ${res.status}`);
          this.extractError = 'Das Auslesen hat nicht geklappt. Du kannst die Angaben unter «Betriebsangaben» von Hand eintragen. Das Dokument ist gespeichert.';
        }
      } catch (e) {
        if (e && e.name === 'AbortError') {
          this.extractError = 'Das Auslesen hat zu lange gedauert. Bitte versuche es nochmal.';
        } else {
          this.extractError = 'Keine Verbindung beim Auslesen der Police. Du kannst die Angaben unter «Betriebsangaben» von Hand eintragen. Das Dokument ist gespeichert.';
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
   Dokument-Upload — Stil A «Editorial» (Entscheid 13.10.2026, Phase 2).
   Linien statt Karten, Text-Knoepfe (Schiefer, Gold-Unterstrich nur fuer die eine Hauptaktion),
   grosse Gloock-Titel, Archivo-Labels, Weiss/Warmgrau im Wechsel, Raster Label-Spalte 220px + Inhalt.
   Farbrollen: Bordeaux = Links/Loeschen-Rand, Schiefer = Knoepfe, Gold = nur Linien.
   ============================================================ */
:root, .hrk-root {
  --hrk-bordeaux:        #72323C;
  --hrk-bordeaux-dark:   #5A2630;
  --hrk-bordeaux-soft:   #F1E7E9;
  --hrk-creme: #F7F5F1;
  --hrk-anthrazit: #241F1C;
  --hrk-gold:            #C3A359;
  --hrk-surface:         #FFFFFF;
  --hrk-surface-muted: #F2EFEA;
  --hrk-border: #E2DDD5;
  --hrk-border-strong: #CFC8BD;
  --hrk-text: #241F1C;
  --hrk-text-muted:      #6B6357;
  --hrk-on-primary:     #FFFFFF;
  --hrk-success: #2A7254;  --hrk-success-bg: #E5F1EB;
  --hrk-warning: #946010;  --hrk-warning-bg: #FBF1DD;
  --hrk-danger:          #B23A48;  --hrk-danger-bg:  #F8E7E9;
  --hrk-info:            #2F6F9F;  --hrk-info-bg:    #E6F0F7;
  --hrk-neutral:         #6B6357;  --hrk-neutral-bg: #EFEAE2;
  --hrk-font-head: "Archivo", "Inter", system-ui, sans-serif;
  --hrk-font-body: "Inter", "Source Sans 3", system-ui, sans-serif;
  --hrk-fs-body:  1.0625rem;
  --hrk-fs-small: 0.9375rem;
  --hrk-lh-body:  1.55;
  --hrk-fw-regular: 400; --hrk-fw-medium: 500; --hrk-fw-semibold: 600;
  --hrk-space-1: 4px;  --hrk-space-2: 8px;  --hrk-space-3: 12px;
  --hrk-space-4: 16px; --hrk-space-5: 24px; --hrk-space-6: 32px;
  --hrk-space-7: 48px;
  --hrk-tap-min: 44px;
  --hrk-overlay: rgba(20,24,28,.55);
  --hrk-icon-size-sm: 16px;
  --hrk-icon-size-md: 20px;
  --hrk-icon-size-lg: 28px;
  --hrk-schiefer: #33475B;
  --hrk-schiefer-dark: #243444;
  --hrk-schiefer-soft: #EBEEF1;
  --hrk-on-dark-muted: rgba(255,255,255,.40);
  --hrk-font-mono: "IBM Plex Mono", ui-monospace, "SFMono-Regular", Menlo, monospace;
  --hrk-font-brand: "Gloock", Georgia, serif;
  --hrk-fs-xs: 0.8125rem;
  --hrk-radius-field: 4px;
  /* Stil A «Editorial» (Entscheid 13.10.2026): Linien, Warmgrau, Hauchfarben, Archivo-Labels */
  --hrk-linie: #D6D0CA;
  --hrk-warmgrau: #EFEBE7;
  --hrk-gold-hauch: #FAF6EC;
  --hrk-schiefer-hauch: #F2F5F8;
  --hrk-font-label: "Archivo", "Inter", system-ui, sans-serif;
  --du-feld: #8F8880; /* Feldrand: mind. 3:1 gegen Weiss */
}

/* ── Basis ───────────────────────────────────────────────── */
.hrk-root, .hrk-root * { box-sizing: border-box; }
.hrk-root {
  width: 100%; /* volle Breite im WeWeb-Flex-Parent (sonst klebt der Inhalt links) */
  font-family: var(--hrk-font-body);
  font-size: var(--hrk-fs-body);
  line-height: var(--hrk-lh-body);
  color: var(--hrk-text);
  background: var(--hrk-surface);
  -webkit-font-smoothing: antialiased;
}
.hrk-root a:focus-visible, .hrk-root button:focus-visible, .hrk-root .upload-zone:focus-visible {
  outline: 2px solid var(--hrk-schiefer); outline-offset: 3px; border-radius: 3px; box-shadow: none;
}
.hrk-muted  { color: var(--hrk-text-muted); }
.hrk-small  { font-size: var(--hrk-fs-small); }
.hrk-icon { width: var(--hrk-icon-size-md); height: var(--hrk-icon-size-md); flex: none; }
.hrk-icon--sm { width: var(--hrk-icon-size-sm); height: var(--hrk-icon-size-sm); }
.hrk-icon--lg { width: var(--hrk-icon-size-lg); height: var(--hrk-icon-size-lg); }

/* ── Seitenraster ────────────────────────────────────────── */
.du-main { display: block; width: 100%; }
.du-wrap { max-width: 1120px; margin: 0 auto; padding: 0 var(--hrk-space-5); }
.du-top { background: var(--hrk-surface); padding: clamp(40px, 6vw, 64px) 0 clamp(28px, 4vw, 44px); }
.du-head { display: flex; align-items: flex-end; justify-content: space-between; gap: var(--hrk-space-4) var(--hrk-space-5); flex-wrap: wrap; }
.du-h1 { font-family: var(--hrk-font-brand); font-weight: 400; letter-spacing: -.01em; color: var(--hrk-text);
  font-size: clamp(40px, 7.4vw, 88px); line-height: 1.02; margin: 0; overflow-wrap: anywhere; flex: 1 1 18rem; min-width: 0; }

/* Gruppen: Weiss/Warmgrau im Wechsel, Label-Spalte links */
.du-band { border-top: 1px solid var(--hrk-linie); }
.du-band--grau { background: var(--hrk-warmgrau); }
.du-band--weiss { background: var(--hrk-surface); }
.du-grp { display: grid; grid-template-columns: 220px minmax(0, 1fr); gap: var(--hrk-space-6); padding-top: 28px; padding-bottom: 44px; }
.du-grp__lab { min-width: 0; }
.du-nr { display: block; font-family: var(--hrk-font-label); font-size: var(--hrk-fs-xs); font-weight: var(--hrk-fw-semibold); letter-spacing: .14em; color: var(--hrk-text-muted); margin-bottom: 6px; }
.du-gt { font-family: var(--hrk-font-brand); font-weight: 400; letter-spacing: -.01em; font-size: 26px; line-height: 1.15; margin: 0; color: var(--hrk-text); overflow-wrap: anywhere; }
.du-grp__body { min-width: 0; border-top: 1px solid var(--hrk-text); padding-top: var(--hrk-space-5); display: flex; flex-direction: column; gap: var(--hrk-space-4); }
.du-grp__body--liste { padding-top: 0; gap: 0; }
.du-grp__body--liste > .hrk-note { margin-top: var(--hrk-space-4); }

/* ── Text-Knoepfe ────────────────────────────────────────── */
/* vorwaerts (die eine Hauptaktion): Schiefer-Text, 2px Gold-Unterstrich */
.du-fw { display: inline-flex; align-items: center; gap: 10px; min-height: var(--hrk-tap-min); background: none; border: 0; border-bottom: 2px solid var(--hrk-gold);
  border-radius: 0; padding: 6px 0; font: 600 16px/1.3 var(--hrk-font-body); color: var(--hrk-schiefer); text-decoration: none; cursor: pointer; }
.hrk-root a.du-fw { color: var(--hrk-schiefer); }
.du-fw:hover:not(:disabled), .hrk-root a.du-fw:hover { color: var(--hrk-schiefer-dark); }
.du-fw .hrk-icon { transition: transform .15s; }
.du-fw:hover:not(:disabled) .hrk-icon { transform: translateX(3px); }
.du-fw--lg { font-size: 18px; padding: 8px 0; }
.du-fw:disabled { opacity: .5; cursor: not-allowed; }
.du-fw:disabled[aria-busy="true"] { opacity: 1; cursor: progress; }
/* Zurueck / Abbrechen: grauer Text, Haarlinie */
.du-bk { display: inline-flex; align-items: center; gap: var(--hrk-space-2); min-height: var(--hrk-tap-min); background: none; border: 0; border-bottom: 1px solid var(--hrk-linie);
  border-radius: 0; padding: 6px 0; font: 500 var(--hrk-fs-small)/1.3 var(--hrk-font-body); color: var(--hrk-text-muted); text-decoration: none; cursor: pointer; }
.hrk-root a.du-bk { color: var(--hrk-text-muted); }
.du-bk:hover, .hrk-root a.du-bk:hover { color: var(--hrk-text); border-bottom-color: var(--hrk-text-muted); }
/* leiser Link (Mitarbeiter oeffnen): Schiefer, Pfeil, ohne Gold */
.du-lk { display: inline-flex; align-items: center; gap: var(--hrk-space-2); min-height: var(--hrk-tap-min); padding: 0; border-bottom: 1px solid transparent;
  font-weight: var(--hrk-fw-semibold); color: var(--hrk-schiefer); text-decoration: none; }
.du-lk::after { content: "\2192" / ""; transition: transform .15s; }
.hrk-root a.du-lk { color: var(--hrk-schiefer); }
.du-lk:hover, .hrk-root a.du-lk:hover { color: var(--hrk-bordeaux); border-bottom-color: var(--hrk-linie); }
.du-lk:hover::after { transform: translateX(3px); }
/* Icon-Knoepfe in Zeilen: Haarlinien-Rand, Schiefer-Icon; Loeschen = nur Bordeaux-Rand */
.du-ico { display: inline-flex; align-items: center; justify-content: center; min-height: var(--hrk-tap-min); min-width: var(--hrk-tap-min); padding: 0;
  background: transparent; border: 1px solid var(--hrk-linie); border-radius: var(--hrk-radius-field); color: var(--hrk-schiefer); cursor: pointer;
  transition: border-color .15s, background .15s; }
.du-ico:hover:not(:disabled) { border-color: var(--hrk-schiefer); background: var(--hrk-schiefer-hauch); }
.du-ico:disabled { opacity: .5; cursor: not-allowed; }
.du-ico--del { border: 1px solid var(--hrk-bordeaux); color: var(--hrk-bordeaux); }
.du-ico--del:hover:not(:disabled) { border-color: var(--hrk-bordeaux); background: var(--hrk-bordeaux-soft); }
.du-del { display: inline-flex; align-items: center; justify-content: center; min-height: var(--hrk-tap-min); padding: 0 var(--hrk-space-5);
  background: transparent; border: 1px solid var(--hrk-bordeaux); border-radius: var(--hrk-radius-field); color: var(--hrk-bordeaux);
  font: 600 16px/1.3 var(--hrk-font-body); cursor: pointer; }
.du-del:hover { background: var(--hrk-bordeaux-soft); }
.du-cta { margin-top: var(--hrk-space-2); }

/* ── Felder: Label in Archivo-Versalien, Feld mit Haarlinie ── */
.hrk-field  { display: flex; flex-direction: column; gap: var(--hrk-space-2); }
.hrk-label  { font-family: var(--hrk-font-label); font-weight: var(--hrk-fw-semibold); font-size: var(--hrk-fs-xs); letter-spacing: .14em; text-transform: uppercase; color: var(--hrk-text-muted); }
.hrk-input  {
  width: 100%; padding: var(--hrk-space-3) var(--hrk-space-4);
  border: 1px solid var(--du-feld); border-radius: var(--hrk-radius-field);
  background: var(--hrk-surface); font: inherit; color: var(--hrk-text);
  min-height: var(--hrk-tap-min);
}
.hrk-input:focus-visible { outline: 2px solid var(--hrk-schiefer); outline-offset: 2px; border-color: var(--hrk-schiefer); }
.hrk-hint  { color: var(--hrk-text-muted); font-size: var(--hrk-fs-small); margin: 0; }
.hrk-input--error { border-color: var(--hrk-danger); }
.hrk-field-error { color: var(--hrk-danger); font-size: var(--hrk-fs-small); font-weight: var(--hrk-fw-medium); margin: 0; }
.hrk-link { color: var(--hrk-bordeaux); text-decoration: underline; }
.hrk-select:disabled { opacity: .6; cursor: not-allowed; }
.hrk-select { appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%236B6357' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right var(--hrk-space-4) center; padding-right: var(--hrk-space-7); cursor: pointer; }

/* ── Hinweise: Hauchfarbe, 2px Linie links, kein Kasten ──── */
.hrk-note {
  padding: var(--hrk-space-3) var(--hrk-space-4);
  border-radius: 0 4px 4px 0;
  border-left: 2px solid var(--hrk-neutral);
  background: var(--hrk-warmgrau);
  color: var(--hrk-text);
  white-space: pre-line;
}
.hrk-note--warn    { border-left-color: var(--hrk-warning); background: var(--hrk-warning-bg); }
.hrk-note--success { border-left-color: var(--hrk-success); background: var(--hrk-success-bg); }
.hrk-note--info    { border-left-color: var(--hrk-schiefer); background: var(--hrk-schiefer-hauch); }
.hrk-note--icon    { display: flex; align-items: flex-start; gap: var(--hrk-space-2); white-space: normal; }
.hrk-note--icon .hrk-icon { margin-top: 2px; color: var(--hrk-schiefer); }

/* ── Badge ───────────────────────────────────────────────── */
.hrk-badge {
  display: inline-flex; align-items: center; gap: var(--hrk-space-2);
  font-size: var(--hrk-fs-small); font-weight: var(--hrk-fw-semibold);
  background: none; padding: 0; white-space: nowrap;
}
.hrk-badge::before { content: ""; width: 7px; height: 7px; border-radius: 50%; background: currentColor; flex: none; }
.hrk-badge--neutral { color: var(--hrk-neutral); }

/* ── Spinner ─────────────────────────────────────────────── */
.hrk-spinner {
  width: 28px; height: 28px;
  border: 3px solid var(--hrk-linie);
  border-top-color: var(--hrk-schiefer);
  border-radius: 50%;
  animation: hrk-spin .8s linear infinite;
}
.btn-spinner {
  display: inline-block; flex: none; width: 16px; height: 16px;
  border: 2px solid var(--hrk-linie);
  border-top-color: var(--hrk-schiefer);
  border-radius: 50%;
  animation: hrk-spin .8s linear infinite;
}
.btn-spinner--del { border-color: var(--hrk-bordeaux-soft); border-top-color: var(--hrk-bordeaux); }
@keyframes hrk-spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) {
  .hrk-spinner, .btn-spinner { animation-duration: 2.4s; }
  .du-fw .hrk-icon, .du-lk::after { transition: none; }
}

/* ── Zustandsbloecke ─────────────────────────────────────── */
.hrk-state {
  display: flex; flex-direction: column; align-items: center; gap: var(--hrk-space-3);
  padding: clamp(40px, 6vw, 64px) var(--hrk-space-5);
  color: var(--hrk-text-muted); text-align: center;
}
.hrk-state__title { color: var(--hrk-text); font-weight: var(--hrk-fw-semibold); margin: 0; }
.hrk-state--inline {
  flex-direction: row; align-items: center; justify-content: flex-start; text-align: left;
  gap: var(--hrk-space-3); padding: var(--hrk-space-3) 0;
}
.hrk-state--inline p { margin: 0; }
.hrk-empty { padding: var(--hrk-space-5) 0; border-top: 0; }
.hrk-empty p { margin: 0; }
.hrk-empty__text { font-weight: var(--hrk-fw-semibold); margin: 0 0 var(--hrk-space-2) !important; color: var(--hrk-text); }

/* ── Drop-Zone ───────────────────────────────────────────── */
.upload-zone {
  position: relative;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: var(--hrk-space-2);
  min-height: 160px;
  border: 1px dashed var(--du-feld);
  border-radius: 6px;
  background: var(--hrk-surface);
  cursor: pointer;
  transition: border-color .15s, background .15s;
  padding: var(--hrk-space-5);
  text-align: center;
}
.upload-zone:hover { border-color: var(--hrk-schiefer); }
.upload-zone--drag, .upload-zone--drag:hover {
  border-style: solid; border-color: var(--hrk-schiefer);
  background: var(--hrk-schiefer-hauch);
  box-shadow: inset 0 0 0 1px var(--hrk-schiefer);
}
.upload-zone--has-file {
  flex-direction: row; justify-content: flex-start; text-align: left;
  border-style: solid; border-color: var(--hrk-linie);
  min-height: 0;
}
.upload-zone--has-file:hover { border-color: var(--hrk-linie); }
.upload-zone__input {
  position: absolute; inset: 0; width: 100%; height: 100%;
  opacity: 0; cursor: pointer; z-index: 1; font: inherit;
}
.upload-zone--has-file .upload-zone__input { display: none; }
.upload-zone__icon { width: 2rem; height: 2rem; color: var(--hrk-schiefer); }
.upload-zone__text { font-weight: var(--hrk-fw-semibold); margin: 0; }
.upload-zone__hint { font-size: var(--hrk-fs-small); margin: 0; }
.upload-zone__file-info { flex: 1 1 auto; min-width: 0; }
.upload-zone__file-info p { margin: 0; }
.upload-zone__file-name { font-weight: var(--hrk-fw-semibold); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.upload-zone__clear { flex: none; z-index: 2; }

/* ── Datei-Liste: Zeilen mit Haarlinien statt Kaesten ─────── */
.doc-list { list-style: none; margin: 0; padding: 0; }
.doc-item {
  display: flex; align-items: center; gap: var(--hrk-space-4);
  padding: var(--hrk-space-4) 0;
  border-bottom: 1px solid var(--hrk-linie);
}
.doc-item:last-child { border-bottom: 0; }
.doc-item__icon { width: 1.4rem; height: 1.4rem; flex: none; color: var(--hrk-text-muted); }
.doc-item__body { flex: 1 1 auto; min-width: 0; }
.doc-item__name { font-weight: var(--hrk-fw-semibold); margin: 0 0 var(--hrk-space-1); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.doc-item__meta { margin: 0; }
.doc-item__actions { display: flex; gap: var(--hrk-space-2); flex: none; }

/* ── Ergebnis-Bloecke (Auto-Import, Police): Linie links, Hauchfarbe ── */
.btn-inner { display: inline-flex; align-items: center; gap: var(--hrk-space-2); }
.auto-result-card {
  border-left: 2px solid var(--hrk-schiefer);
  background: var(--hrk-schiefer-hauch);
  border-radius: 0 4px 4px 0;
  padding: var(--hrk-space-4) var(--hrk-space-5);
}
.auto-result-card p { margin: 0; }
.auto-result-card p + p, .auto-result-card ul + p { margin-top: var(--hrk-space-2); }
.auto-result-card__title {
  font-weight: var(--hrk-fw-semibold);
  color: var(--hrk-text);
  margin: 0 0 var(--hrk-space-2);
}
.auto-result-card__title--icon { display: flex; align-items: center; gap: var(--hrk-space-2); }
.auto-result-card__title--icon .hrk-icon { color: var(--hrk-success); }
.auto-result-card__warning-item { display: flex; align-items: flex-start; gap: var(--hrk-space-2); }
.auto-result-card__warning-item .hrk-icon { margin-top: 3px; color: var(--hrk-warning); }
.auto-result-card__warnings,
.auto-result-card__fields {
  list-style: none;
  margin: var(--hrk-space-2) 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--hrk-space-1);
}
.auto-result-card__act { margin-top: var(--hrk-space-2); }

/* ── Modal: Papier, Haarlinie, kein Schatten ─────────────── */
.modal-overlay {
  position: fixed; inset: 0; z-index: 200;
  background: var(--hrk-overlay);
  display: flex; align-items: center; justify-content: center;
  padding: var(--hrk-space-4);
}
.modal-box {
  max-width: 460px; width: 100%;
  background: var(--hrk-surface);
  border: 1px solid var(--hrk-linie);
  border-top: 2px solid var(--hrk-gold);
  border-radius: 6px;
  padding: var(--hrk-space-5);
}
.modal-title { font-family: var(--hrk-font-brand); font-weight: 400; letter-spacing: -.01em; font-size: 26px; line-height: 1.15; margin: 0 0 var(--hrk-space-3); color: var(--hrk-text); }
.modal-body  { margin: 0 0 var(--hrk-space-5); overflow-wrap: anywhere; }
.modal-actions { display: flex; flex-wrap: wrap; gap: var(--hrk-space-4); align-items: center; justify-content: flex-end; }

/* ── Responsive ──────────────────────────────────────────── */
@media (max-width: 860px) {
  .du-grp { grid-template-columns: minmax(0, 1fr); gap: var(--hrk-space-4); }
  .du-gt { font-size: 24px; }
}
@media (max-width: 600px) {
  .du-wrap { padding: 0 var(--hrk-space-4); }
  .doc-item { display: grid; grid-template-columns: auto minmax(0, 1fr); column-gap: var(--hrk-space-3); row-gap: var(--hrk-space-2); align-items: start; }
  .doc-item__name { white-space: normal; overflow-wrap: anywhere; }
  .doc-item__actions { grid-column: 1 / -1; justify-content: flex-end; }
  .upload-zone--has-file { flex-wrap: wrap; }
  .modal-actions { justify-content: space-between; }
}
</style>
