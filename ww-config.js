export default {
  editor: {
    label: { en: 'Document Upload', de: 'Dokument-Upload (HR-Dossier)' },
    icon: 'upload',
  },
  triggerEvents: [
    { name: 'uploaded',            label: { en: 'On uploaded',              de: 'Datei hochgeladen'              }, event: { file_name: '', category: '' } },
    { name: 'deleted',             label: { en: 'On deleted',               de: 'Datei gelöscht'                 }, event: { id: '' } },
    { name: 'error',               label: { en: 'On error',                 de: 'Fehler'                         }, event: { reason: '' } },
    { name: 'employee-imported',   label: { en: 'On employee auto-imported', de: 'Mitarbeiter automatisch erfasst' }, event: { employee_id: '', employee_created: true } },
    { name: 'insurance-extracted', label: { en: 'On insurance data extracted', de: 'Versicherungsdaten extrahiert' }, event: { insurance_type: '', updated_fields: [] } },
  ],
  properties: {
    authToken: {
      label: { en: 'User JWT (auth token)', de: 'User-JWT (Login-Token)' },
      type: 'Text', section: 'settings', bindable: true, defaultValue: '',
      /* wwEditor:start */
      bindingValidation: { type: 'string', tooltip: 'Access Token des eingeloggten Users (Supabase Auth). Bearer wird automatisch ergänzt.' },
      /* wwEditor:end */
    },
    apiKey: {
      label: { en: 'Supabase anon/publishable key', de: 'Supabase Anon-/Publishable-Key' },
      type: 'Text', section: 'settings', bindable: true, defaultValue: 'sb_publishable_4rsRb_VB3l_45JO7sw0VSA_ODDS4CZc',
      /* wwEditor:start */
      bindingValidation: { type: 'string', tooltip: 'Öffentlicher Anon-Key. NIE den service_role-Key verwenden.' },
      /* wwEditor:end */
    },
    supabaseUrl: {
      label: { en: 'Supabase URL', de: 'Supabase URL' },
      type: 'Text', section: 'settings', bindable: true,
      defaultValue: 'https://ztvqsxdudzdyqgeylujr.supabase.co',
    },
    storageBucket: {
      label: { en: 'Storage bucket name', de: 'Storage-Bucket-Name' },
      type: 'Text', section: 'settings', bindable: true, defaultValue: 'employee-documents',
      /* wwEditor:start */
      bindingValidation: { type: 'string', tooltip: 'Name des Supabase-Storage-Buckets. Muss in Supabase vorhanden sein (nicht öffentlich).' },
      /* wwEditor:end */
    },
    backUrl: {
      label: { en: 'Back URL', de: 'Zurück-Link (URL)' },
      type: 'Text', section: 'settings', bindable: true, defaultValue: '/mitarbeiter',
    },
  },
};
