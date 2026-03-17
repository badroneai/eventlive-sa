const SESSION_TYPE_OPTIONS = ['keynote', 'panel', 'workshop', 'talk', 'break', 'networking', 'ceremony', 'other'];
const SESSION_STATUS_OPTIONS = ['draft', 'scheduled', 'live', 'completed', 'cancelled'];
const LANGUAGE_OPTIONS = ['ar', 'en', 'bilingual'];
const UI_LANGUAGES = ['en', 'ar'];
const INTAKE_EDITABLE_COLUMNS = [
  'program_title',
  'organizer_name',
  'venue',
  'city',
  'event_start',
  'event_end',
  'program_updated_at',
  'id',
  'session_title',
  'session_type',
  'speaker',
  'start_at',
  'end_at',
  'room',
  'status',
  'language',
  'session_updated_at'
];

const translations = {
  en: {
    pageTitle: 'EventLive Operator Console',
    brandEyebrow: 'Internal Operator Console',
    programsHome: 'Programs Home',
    refresh: 'Refresh',
    noWorkspaces: 'No workspaces yet.',
    createWorkspace: 'Create Workspace',
    programTitle: 'Program Title',
    organizerName: 'Organizer Name',
    optionalWorkspaceId: 'Optional Workspace ID',
    milestoneOne: 'Milestone 2',
    programWorkspace: 'Program Workspace',
    workspaceEmptyState: 'Select a workspace from the left or create a new one to start editing and releasing the active workspace.',
    reload: 'Reload',
    validate: 'Validate',
    preview: 'Preview',
    saveDraft: 'Save Draft',
    status: 'Status',
    validation: 'Validation',
    previewReady: 'Preview Ready',
    sessions: 'Sessions',
    metadataEditor: 'Metadata Editor',
    metadataEditorHelp: 'Edit the program-level fields for the active workspace draft.',
    clean: 'Clean',
    unsavedChanges: 'Unsaved changes',
    organizerDisplayName: 'Organizer Display Name',
    logoText: 'Logo Text',
    primaryLabel: 'Primary Label',
    supportContact: 'Support Contact',
    city: 'City',
    venue: 'Venue',
    eventStart: 'Event Start',
    eventEnd: 'Event End',
    updatedAt: 'Updated At',
    footerNote: 'Footer Note',
    sessionsEditor: 'Sessions Editor',
    sessionsEditorHelp: 'Manage working draft sessions without editing JSON manually.',
    addSession: 'Add Session',
    noSessions: 'No sessions yet. Add the first session to make the draft valid.',
    validationIssues: 'Validation Issues',
    validationHelp: 'Run the existing validator on the active workspace draft.',
    notRun: 'Not run',
    validationNotRun: 'Validation has not been run for this workspace yet.',
    previewOutput: 'Preview Output',
    previewHelp: 'Generate the current public preview pages from the working draft.',
    notReady: 'Not ready',
    ready: 'Ready',
    previewNotRun: 'Preview has not been generated for this workspace yet.',
    storedPaths: 'Stored Paths',
    workspace: 'Workspace',
    draftFile: 'Draft file',
    approvedDraftFile: 'Approved draft file',
    currentRelease: 'Current release',
    lastValidation: 'Last validation',
    lastPreview: 'Last preview',
    lastDiff: 'Last diff',
    approvedAt: 'Approved at',
    eventWindow: 'Event window',
    na: 'n/a',
    none: 'none',
    workspaceListRefreshed: 'Workspace list refreshed.',
    workspaceCreated: 'Workspace created.',
    workspaceReloaded: 'Workspace reloaded.',
    draftSaved: 'Draft saved.',
    validationPassed: 'Validation passed.',
    validationFailed: 'Validation failed.',
    previewGenerated: 'Preview generated.',
    validationPassedNoIssues: 'Validation passed with no issues.',
    generated: 'Generated',
    sourceDraft: 'Source draft',
    report: 'Report',
    buildReport: 'Build report',
    errors: 'Errors',
    warnings: 'Warnings',
    openProgramPage: 'Open program page',
    openPrintView: 'Open print view',
    openShareView: 'Open share view',
    session: 'Session',
    untitledSession: 'Untitled session',
    remove: 'Remove',
    duplicate: 'Duplicate',
    id: 'ID',
    source: 'Source',
    dayLabel: 'Day Label',
    sessionTitle: 'Session Title',
    sessionType: 'Session Type',
    track: 'Track',
    speaker: 'Speaker',
    moderator: 'Moderator',
    startAt: 'Start At',
    endAt: 'End At',
    room: 'Room',
    language: 'Language',
    audience: 'Audience',
    tagsCommaSeparated: 'Tags (comma-separated)',
    pass: 'PASS',
    fail: 'FAIL',
    unknown: 'unknown',
    passed: 'passed',
    failed: 'failed',
    working_draft: 'working draft',
    validated_draft: 'validated draft',
    approved_current: 'approved current',
    archived: 'archived',
    confirmDiscardChanges: 'You have unsaved changes. Discard them and continue?',
    diffAndApproval: 'Diff & Approval',
    diffApprovalHelp: 'Compare the current draft against the approved baseline, then mark it ready for release operations.',
    runDiff: 'Run Diff',
    approveDraft: 'Approve Draft',
    approvalNote: 'Approval Note',
    diffNotRun: 'Diff has not been run for this workspace yet.',
    baseFile: 'Base file',
    candidateFile: 'Candidate file',
    metadataChanges: 'Metadata changes',
    addedSessions: 'Added sessions',
    removedSessions: 'Removed sessions',
    modifiedSessions: 'Modified sessions',
    timingChanges: 'Timing changes',
    roomChanges: 'Room changes',
    speakerChanges: 'Speaker changes',
    trackChanges: 'Track changes',
    currentVersion: 'Current version',
    candidateVersion: 'Candidate version',
    noCategorizedChanges: 'No categorized changes found in the current diff.',
    visualReview: 'Visual review',
    reviewQueue: 'Review queue',
    metadataReview: 'Metadata review',
    addedSessionsReview: 'Added sessions review',
    removedSessionsReview: 'Removed sessions review',
    changedSessionsReview: 'Changed sessions review',
    noChangesToReview: 'No detailed changes to review yet.',
    fieldChanges: 'Field changes',
    publishChecklist: 'Publish checklist',
    releaseNoteProvided: 'Release note provided',
    currentReplacementAware: 'Current release replacement acknowledged',
    readyForOperatorDecision: 'Ready for operator decision',
    openDiffHtml: 'Open diff report',
    approvalRecorded: 'Approval recorded.',
    releaseOperations: 'Release Operations',
    releaseOperationsHelp: 'Publish the approved draft, review the current release package, or archive the active release.',
    publish: 'Publish',
    archive: 'Archive',
    releaseNote: 'Release Note',
    releaseNotPublished: 'No published release is linked to this workspace yet.',
    publishedAt: 'Published at',
    releaseId: 'Release ID',
    releaseBundle: 'Release bundle',
    deliveryManifest: 'Delivery manifest',
    shareKit: 'Share kit',
    handoffNotes: 'Handoff notes',
    deliveryPackage: 'Delivery package',
    archiveBrowser: 'Archive browser',
    publishCompleted: 'Publish completed.',
    archiveCompleted: 'Archive completed.',
    releaseReadiness: 'Release Readiness',
    releaseReadinessHelp: 'Check whether the candidate draft is ready for approval, publishing, and delivery.',
    releaseDecisionCenter: 'Release Decision Center',
    releaseDecisionHelp: 'Review the candidate draft against the current live release before approval or publish.',
    readinessChecks: 'Readiness checks',
    candidateRelease: 'Candidate release',
    currentLiveRelease: 'Current live release',
    releaseImpact: 'Release impact',
    recommendedAction: 'Recommended action',
    replacementImpact: 'Replacement impact',
    willReplaceCurrent: 'This publish will replace the current live release.',
    firstReleasePublish: 'This will publish the first live release for this workspace.',
    approveConfirm: 'Confirm approval',
    publishConfirm: 'Confirm publish',
    archiveConfirm: 'Confirm archive',
    deliveryCenter: 'Delivery Center',
    currentDeliveryPackage: 'Current delivery package',
    releaseSpecificPackage: 'Release-specific package',
    deliveryInventory: 'Delivery inventory',
    liveArtifacts: 'Live artifacts',
    releaseArtifacts: 'Release artifacts',
    archiveAccess: 'Archive access',
    noDeliveryPackage: 'No current delivery package is available for this workspace yet.',
    noReleaseSpecificPackage: 'No release-specific package is linked yet.',
    includedFiles: 'Included files',
    packageCategory: 'Package category',
    latestPackage: 'Latest package',
    openCurrentManifest: 'Open current manifest',
    openCurrentBundle: 'Open current bundle',
    openCurrentShareKit: 'Open current share kit',
    openCurrentHandoffNotes: 'Open current handoff notes',
    openCurrentArchiveBrowser: 'Open current archive browser',
    openCurrentPackageReadme: 'Open current package README',
    deliveryUsageSummary: 'Delivery usage summary',
    guidedPublishFlow: 'Guided Publish Flow',
    publishFlowHelp: 'Move from approved candidate to live release through a short guided flow.',
    publishStepReview: 'Review candidate',
    publishStepReleaseNote: 'Prepare release note',
    publishStepGoLive: 'Go live',
    publishStepDelivery: 'Delivery ready',
    publishOutcome: 'Publish outcome',
    goToHandoff: 'Go to handoff',
    goToHistory: 'Go to history',
    releaseNoteHint: 'Summarize what changed in this release for the team and organizer.',
    publishWillUseDefaultNote: 'If left empty, a default release note will be used.',
    liveReleaseReady: 'Live release ready',
    candidateApproved: 'Candidate approved',
    publishReplacesCurrent: 'Publishing now replaces the currently linked release.',
    publishCreatesFirstRelease: 'Publishing now creates the first live release for this workspace.',
    deliveryReadyAfterPublish: 'Delivery package is ready immediately after publish.',
    workflowTracker: 'Workflow Tracker',
    workflowSummaryEmpty: 'Workflow guidance will appear after the workspace loads.',
    nextAction: 'Next Action',
    workflowComplete: 'Workflow complete',
    workflowInProgress: 'Workflow in progress',
    currentStage: 'Current stage',
    nextRecommendedAction: 'Next recommended action',
    openNextStep: 'Open next step',
    stageComplete: 'Complete',
    stagePending: 'Pending',
    stageCurrent: 'Current',
    workflowStage_intake: 'Intake reviewed',
    workflowStage_draft: 'Draft completed',
    workflowStage_validation: 'Validation passed',
    workflowStage_preview: 'Preview ready',
    workflowStage_diff: 'Candidate reviewed',
    workflowStage_release: 'Release published',
    workflowStage_delivery: 'Delivery package ready',
    workflowStage_archive: 'Archive available',
    workflowAction_next_intake: 'Review intake and normalize into draft',
    workflowAction_next_draft: 'Complete the draft data',
    workflowAction_next_validation: 'Run validation',
    workflowAction_next_preview: 'Generate preview',
    workflowAction_next_diff: 'Review differences against baseline',
    workflowAction_next_release: 'Approve and publish the candidate release',
    workflowAction_next_delivery: 'Review the delivery package and handoff assets',
    workflowAction_next_archive: 'Archive the release after the event',
    publishGate: 'Publish gate',
    approveGate: 'Approve gate',
    archiveGate: 'Archive gate',
    releaseActionsLocked: 'Release actions are locked until readiness checks pass.',
    handoffUseCases: 'Delivery usage',
    userProgramHelp: 'Use the program page as the main live visitor guide.',
    userPrintHelp: 'Use the print view for desks, staff, and venue signage.',
    userShareHelp: 'Use the share page for quick link distribution and QR handoff.',
    approvedSnapshot: 'Approved snapshot',
    approvalOutdated: 'Approval outdated',
    handoffView: 'Handoff View',
    handoffHelp: 'Open the latest delivery package, manifest, handoff notes, and archive browser from one place.',
    handoffNotReady: 'Handoff artifacts will appear after the first successful publish.',
    tabIntake: 'Intake',
    tabEditor: 'Editor',
    tabValidation: 'Validation',
    tabPreview: 'Preview',
    tabDiff: 'Diff',
    tabRelease: 'Release',
    tabHistory: 'History',
    tabHandoff: 'Handoff',
    releaseHistory: 'Release History',
    releaseHistoryHelp: 'Review the current linked release and archived versions associated with this workspace.',
    refreshHistory: 'Refresh History',
    historyNotLoaded: 'Release history has not been loaded for this workspace yet.',
    currentLinkedRelease: 'Current linked release',
    archivedReleases: 'Archived releases',
    noArchivedReleases: 'No archived releases are linked to this workspace yet.',
    noCurrentLinkedRelease: 'No current linked release is associated with this workspace.',
    archivedAt: 'Archived at',
    openReleasePackage: 'Open release package',
    openManifest: 'Open manifest',
    openShareKit: 'Open share kit',
    openHandoffNotes: 'Open handoff notes',
    openReleaseBundle: 'Open release bundle',
    openArchiveBrowser: 'Open archive browser',
    openDeliveryPackage: 'Open delivery package',
    intakeNormalize: 'Intake & Normalize',
    intakeNormalizeHelp: 'Paste intake CSV, load a reference preset, then normalize it directly into the active workspace draft.',
    uploadCsvFile: 'Attach Organizer File',
    importingFile: 'Importing attachment...',
    attachmentImported: 'Attachment imported into intake review.',
    attachmentStoredOnly: 'Attachment stored. Automatic field conversion is available now for CSV/XLSX; PDF and images still require manual review in this environment.',
    latestAttachment: 'Latest attachment',
    openAttachment: 'Open attachment',
    intakeSourceLabel: 'Intake Source Label',
    intakeCsvContent: 'CSV Intake Content',
    loadTemplate: 'Load template',
    loadBaseline: 'Load baseline',
    loadUpdated: 'Load updated',
    analyzeIntake: 'Analyze Intake',
    normalizeIntoDraft: 'Normalize Into Draft',
    intakeNotLoaded: 'Load a template or paste intake CSV to normalize it into this workspace.',
    normalizationSummary: 'Normalization Summary',
    normalizedAt: 'Normalized at',
    sourceLabel: 'Source label',
    intakeSourceKind: 'Source kind',
    intakeOriginalFilename: 'Original filename',
    rowsImported: 'Rows imported',
    normalizationCompleted: 'Normalization completed.',
    intakeReview: 'Intake Review',
    expectedColumns: 'Expected columns',
    missingRequiredColumns: 'Missing required columns',
    unknownColumns: 'Unknown columns',
    intakeIssues: 'Intake issues',
    noIntakeIssues: 'No intake issues found in the current CSV review.',
    analyzeBeforeNormalize: 'Analyze the current CSV before normalizing it into the workspace draft.',
    sampleRows: 'Sample rows',
    rowNumber: 'Row',
    intakeAnalyzed: 'Intake analysis completed.',
    editableRows: 'Editable intake rows',
    reAnalyzeAfterEdits: 'Re-run intake analysis after editing rows to refresh issues and re-enable normalization.',
    normalizeBlocked: 'Normalize is blocked until intake review passes with no critical issues.',
    mappingSummary: 'Mapping summary',
    smartIntakeAssistant: 'Smart Intake Assistant',
    intakeQuality: 'Intake quality',
    intakeQualityHigh: 'High',
    intakeQualityMedium: 'Medium',
    intakeQualityLow: 'Low',
    suggestedFixes: 'Suggested fixes',
    detectedHeaders: 'Detected headers',
    matchedBy: 'Matched by',
    canonicalField: 'Canonical field',
    sourceHeader: 'Source header',
    exactMatch: 'Exact',
    aliasMatch: 'Alias',
    unknownMatch: 'Unknown',
    normalizedPreview: 'Normalized preview',
    smartNormalize: 'Smart normalize',
    aliasAutoDetected: 'Aliases were auto-detected and mapped into the canonical intake shape.',
    qualityGuidance: 'Use the quality score, detected headers, and suggested fixes before normalizing.',
    savedRawSource: 'Saved raw source',
    reviewArtifacts: 'Review artifacts',
    loadSavedIntake: 'Open saved intake',
    intakeLoadedFromWorkspace: 'Loaded saved intake source from the workspace.',
    intakeFileLoaded: 'CSV file loaded into the intake workspace.',
    requestBackList: 'Request back to organizer',
    noRequestBackItems: 'No organizer follow-up is required for the current intake review.',
    sourceKind_manual: 'Manual paste',
    sourceKind_uploaded_file: 'Uploaded file',
    sourceKind_preset: 'Preset',
    programFields: 'Program fields',
    sessionFields: 'Session fields',
    reviewReady: 'Review ready',
    reviewNeedsRefresh: 'Review needs refresh',
    canNormalize: 'Can normalize',
    sessionType_keynote: 'Keynote',
    sessionType_panel: 'Panel',
    sessionType_workshop: 'Workshop',
    sessionType_talk: 'Talk',
    sessionType_break: 'Break',
    sessionType_networking: 'Networking',
    sessionType_ceremony: 'Ceremony',
    sessionType_other: 'Other',
    sessionStatus_draft: 'Draft',
    sessionStatus_scheduled: 'Scheduled',
    sessionStatus_live: 'Live',
    sessionStatus_completed: 'Completed',
    sessionStatus_cancelled: 'Cancelled',
    language_ar: 'Arabic',
    language_en: 'English',
    language_bilingual: 'Bilingual'
  },
  ar: {
    pageTitle: 'لوحة تشغيل EventLive',
    brandEyebrow: 'لوحة تشغيل داخلية',
    programsHome: 'البرامج الحالية',
    refresh: 'تحديث',
    noWorkspaces: 'لا توجد مساحات عمل بعد.',
    createWorkspace: 'إنشاء مساحة عمل',
    programTitle: 'عنوان البرنامج',
    organizerName: 'اسم الجهة المنظمة',
    optionalWorkspaceId: 'معرّف مساحة العمل اختياري',
    milestoneOne: 'المرحلة الثانية',
    programWorkspace: 'مساحة عمل البرنامج',
    workspaceEmptyState: 'اختر مساحة عمل من القائمة أو أنشئ مساحة جديدة لبدء تحرير وإدارة الإصدار الحالي.',
    reload: 'إعادة تحميل',
    validate: 'تحقق',
    preview: 'معاينة',
    saveDraft: 'حفظ المسودة',
    status: 'الحالة',
    validation: 'التحقق',
    previewReady: 'جاهزية المعاينة',
    sessions: 'الجلسات',
    metadataEditor: 'محرر البيانات الأساسية',
    metadataEditorHelp: 'عدّل حقول البرنامج الأساسية للمسودة الحالية.',
    clean: 'بدون تغييرات',
    unsavedChanges: 'تغييرات غير محفوظة',
    organizerDisplayName: 'اسم العرض للجهة المنظمة',
    logoText: 'نص الشعار',
    primaryLabel: 'الوسم الرئيسي',
    supportContact: 'جهة التواصل',
    city: 'المدينة',
    venue: 'الموقع',
    eventStart: 'بداية الحدث',
    eventEnd: 'نهاية الحدث',
    updatedAt: 'آخر تحديث',
    footerNote: 'ملاحظة التذييل',
    sessionsEditor: 'محرر الجلسات',
    sessionsEditorHelp: 'أدر جلسات المسودة الحالية دون تعديل JSON يدويًا.',
    addSession: 'إضافة جلسة',
    noSessions: 'لا توجد جلسات بعد. أضف الجلسة الأولى ليصبح الملف صالحًا للتحقق.',
    validationIssues: 'مشكلات التحقق',
    validationHelp: 'شغّل أداة التحقق الحالية على مسودة مساحة العمل.',
    notRun: 'لم يُشغّل',
    validationNotRun: 'لم يتم تشغيل التحقق لهذه المساحة بعد.',
    previewOutput: 'مخرجات المعاينة',
    previewHelp: 'ولّد صفحات المعاينة العامة الحالية من المسودة.',
    notReady: 'غير جاهزة',
    ready: 'جاهزة',
    previewNotRun: 'لم يتم توليد المعاينة لهذه المساحة بعد.',
    storedPaths: 'المسارات المخزنة',
    workspace: 'مساحة العمل',
    draftFile: 'ملف المسودة',
    approvedDraftFile: 'ملف المسودة المعتمدة',
    currentRelease: 'الإصدار الحالي',
    lastValidation: 'آخر تحقق',
    lastPreview: 'آخر معاينة',
    lastDiff: 'آخر مقارنة',
    approvedAt: 'تاريخ الاعتماد',
    eventWindow: 'نطاق الحدث',
    na: 'غير متاح',
    none: 'لا يوجد',
    workspaceListRefreshed: 'تم تحديث قائمة مساحات العمل.',
    workspaceCreated: 'تم إنشاء مساحة العمل.',
    workspaceReloaded: 'تمت إعادة تحميل مساحة العمل.',
    draftSaved: 'تم حفظ المسودة.',
    validationPassed: 'نجح التحقق.',
    validationFailed: 'فشل التحقق.',
    previewGenerated: 'تم توليد المعاينة.',
    validationPassedNoIssues: 'نجح التحقق بدون ملاحظات.',
    generated: 'تم التوليد',
    sourceDraft: 'مصدر المسودة',
    report: 'التقرير',
    buildReport: 'تقرير البناء',
    errors: 'الأخطاء',
    warnings: 'التحذيرات',
    openProgramPage: 'فتح صفحة البرنامج',
    openPrintView: 'فتح نسخة الطباعة',
    openShareView: 'فتح صفحة المشاركة',
    session: 'الجلسة',
    untitledSession: 'جلسة بدون عنوان',
    remove: 'حذف',
    duplicate: 'نسخ',
    id: 'المعرّف',
    source: 'المصدر',
    dayLabel: 'وسم اليوم',
    sessionTitle: 'عنوان الجلسة',
    sessionType: 'نوع الجلسة',
    track: 'المسار',
    speaker: 'المتحدث',
    moderator: 'مدير الجلسة',
    startAt: 'وقت البداية',
    endAt: 'وقت النهاية',
    room: 'القاعة',
    language: 'اللغة',
    audience: 'الفئة المستهدفة',
    tagsCommaSeparated: 'الوسوم (مفصولة بفواصل)',
    pass: 'نجاح',
    fail: 'فشل',
    unknown: 'غير معروف',
    passed: 'نجح',
    failed: 'فشل',
    working_draft: 'مسودة عمل',
    validated_draft: 'مسودة متحقق منها',
    approved_current: 'معتمد حالي',
    archived: 'مؤرشف',
    confirmDiscardChanges: 'هناك تغييرات غير محفوظة. هل تريد تجاهلها والمتابعة؟',
    diffAndApproval: 'المقارنة والاعتماد',
    diffApprovalHelp: 'قارن المسودة الحالية بالنسخة المعتمدة ثم علّمها كنسخة جاهزة لعمليات الإصدار.',
    runDiff: 'تشغيل المقارنة',
    approveDraft: 'اعتماد المسودة',
    approvalNote: 'ملاحظة الاعتماد',
    diffNotRun: 'لم يتم تشغيل المقارنة لهذه المساحة بعد.',
    baseFile: 'ملف الأساس',
    candidateFile: 'الملف المرشح',
    metadataChanges: 'تغييرات البيانات الأساسية',
    addedSessions: 'الجلسات المضافة',
    removedSessions: 'الجلسات المحذوفة',
    modifiedSessions: 'الجلسات المعدلة',
    timingChanges: 'تغييرات التوقيت',
    roomChanges: 'تغييرات القاعات',
    speakerChanges: 'تغييرات المتحدثين',
    trackChanges: 'تغييرات المسارات',
    currentVersion: 'النسخة الحالية',
    candidateVersion: 'النسخة المرشحة',
    noCategorizedChanges: 'لا توجد تغييرات مصنفة في المقارنة الحالية.',
    visualReview: 'المراجعة البصرية',
    reviewQueue: 'قائمة المراجعة',
    metadataReview: 'مراجعة البيانات الأساسية',
    addedSessionsReview: 'مراجعة الجلسات المضافة',
    removedSessionsReview: 'مراجعة الجلسات المحذوفة',
    changedSessionsReview: 'مراجعة الجلسات المعدلة',
    noChangesToReview: 'لا توجد تغييرات تفصيلية للمراجعة بعد.',
    fieldChanges: 'تغييرات الحقول',
    publishChecklist: 'قائمة التحقق قبل النشر',
    releaseNoteProvided: 'تمت كتابة ملاحظة الإصدار',
    currentReplacementAware: 'تم إدراك استبدال الإصدار الحالي',
    readyForOperatorDecision: 'جاهز لقرار التشغيل',
    openDiffHtml: 'فتح تقرير المقارنة',
    approvalRecorded: 'تم تسجيل الاعتماد.',
    releaseOperations: 'عمليات الإصدار',
    releaseOperationsHelp: 'انشر المسودة المعتمدة، راجع حزمة الإصدار الحالية، أو أرشف الإصدار النشط.',
    publish: 'نشر',
    archive: 'أرشفة',
    releaseNote: 'ملاحظة الإصدار',
    releaseNotPublished: 'لا يوجد إصدار منشور مرتبط بهذه المساحة بعد.',
    publishedAt: 'تاريخ النشر',
    releaseId: 'معرّف الإصدار',
    releaseBundle: 'حزمة الإصدار',
    deliveryManifest: 'بيان التسليم',
    shareKit: 'حزمة المشاركة',
    handoffNotes: 'ملاحظات التسليم',
    deliveryPackage: 'حزمة التسليم',
    archiveBrowser: 'متصفح الأرشيف',
    publishCompleted: 'اكتمل النشر.',
    archiveCompleted: 'اكتملت الأرشفة.',
    releaseReadiness: 'جاهزية الإصدار',
    releaseReadinessHelp: 'تحقق مما إذا كانت النسخة المرشحة جاهزة للاعتماد والنشر والتسليم.',
    releaseDecisionCenter: 'مركز قرار الإصدار',
    releaseDecisionHelp: 'راجع المسودة المرشحة مقابل الإصدار الحي الحالي قبل الاعتماد أو النشر.',
    readinessChecks: 'فحوصات الجاهزية',
    candidateRelease: 'النسخة المرشحة',
    currentLiveRelease: 'الإصدار الحي الحالي',
    releaseImpact: 'أثر الإصدار',
    recommendedAction: 'الإجراء الموصى به',
    replacementImpact: 'أثر الاستبدال',
    willReplaceCurrent: 'هذا النشر سيستبدل الإصدار الحي الحالي.',
    firstReleasePublish: 'سيتم نشر أول إصدار حي لهذه المساحة.',
    approveConfirm: 'تأكيد الاعتماد',
    publishConfirm: 'تأكيد النشر',
    archiveConfirm: 'تأكيد الأرشفة',
    deliveryCenter: 'مركز التسليم',
    currentDeliveryPackage: 'حزمة التسليم الحالية',
    releaseSpecificPackage: 'حزمة الإصدار المحددة',
    deliveryInventory: 'محتويات التسليم',
    liveArtifacts: 'الملفات الحية',
    releaseArtifacts: 'ملفات الإصدار',
    archiveAccess: 'الوصول إلى الأرشيف',
    noDeliveryPackage: 'لا توجد حزمة تسليم حالية متاحة لهذه المساحة بعد.',
    noReleaseSpecificPackage: 'لا توجد حزمة إصدار محددة مرتبطة بعد.',
    includedFiles: 'الملفات المضمنة',
    packageCategory: 'فئة الحزمة',
    latestPackage: 'أحدث حزمة',
    openCurrentManifest: 'فتح البيان الحالي',
    openCurrentBundle: 'فتح الحزمة الحالية',
    openCurrentShareKit: 'فتح حزمة المشاركة الحالية',
    openCurrentHandoffNotes: 'فتح ملاحظات التسليم الحالية',
    openCurrentArchiveBrowser: 'فتح متصفح الأرشيف الحالي',
    openCurrentPackageReadme: 'فتح README للحزمة الحالية',
    deliveryUsageSummary: 'ملخص استخدامات التسليم',
    guidedPublishFlow: 'مسار النشر الموجّه',
    publishFlowHelp: 'انتقل من النسخة المعتمدة إلى الإصدار الحي عبر مسار قصير وواضح.',
    publishStepReview: 'مراجعة النسخة المرشحة',
    publishStepReleaseNote: 'إعداد ملاحظة الإصدار',
    publishStepGoLive: 'النشر الحي',
    publishStepDelivery: 'جاهزية التسليم',
    publishOutcome: 'نتيجة النشر',
    goToHandoff: 'الانتقال إلى التسليم',
    goToHistory: 'الانتقال إلى السجل',
    releaseNoteHint: 'لخّص ما تغيّر في هذا الإصدار للفريق والجهة المنظمة.',
    publishWillUseDefaultNote: 'إذا تُرك الحقل فارغًا، ستُستخدم ملاحظة إصدار افتراضية.',
    liveReleaseReady: 'الإصدار الحي جاهز',
    candidateApproved: 'تم اعتماد النسخة المرشحة',
    publishReplacesCurrent: 'النشر الآن سيستبدل الإصدار المرتبط الحالي.',
    publishCreatesFirstRelease: 'النشر الآن سينشئ أول إصدار حي لهذه المساحة.',
    deliveryReadyAfterPublish: 'حزمة التسليم تصبح جاهزة مباشرة بعد النشر.',
    workflowTracker: 'متتبع سير العمل',
    workflowSummaryEmpty: 'ستظهر إرشادات سير العمل بعد تحميل مساحة العمل.',
    nextAction: 'الإجراء التالي',
    workflowComplete: 'اكتمل سير العمل',
    workflowInProgress: 'سير العمل قيد التنفيذ',
    currentStage: 'المرحلة الحالية',
    nextRecommendedAction: 'الإجراء الموصى به التالي',
    openNextStep: 'فتح الخطوة التالية',
    stageComplete: 'مكتمل',
    stagePending: 'قيد الانتظار',
    stageCurrent: 'حالي',
    workflowStage_intake: 'تمت مراجعة الاستقبال',
    workflowStage_draft: 'اكتملت المسودة',
    workflowStage_validation: 'نجح التحقق',
    workflowStage_preview: 'المعاينة جاهزة',
    workflowStage_diff: 'تمت مراجعة النسخة المرشحة',
    workflowStage_release: 'تم نشر الإصدار',
    workflowStage_delivery: 'حزمة التسليم جاهزة',
    workflowStage_archive: 'الأرشيف متاح',
    workflowAction_next_intake: 'راجع الاستقبال وطبّعه إلى المسودة',
    workflowAction_next_draft: 'أكمل بيانات المسودة',
    workflowAction_next_validation: 'شغّل التحقق',
    workflowAction_next_preview: 'ولّد المعاينة',
    workflowAction_next_diff: 'راجع الفروقات مع النسخة الأساسية',
    workflowAction_next_release: 'اعتمد وانشر النسخة المرشحة',
    workflowAction_next_delivery: 'راجع حزمة التسليم وملفات handoff',
    workflowAction_next_archive: 'أرشف الإصدار بعد انتهاء الحدث',
    publishGate: 'بوابة النشر',
    approveGate: 'بوابة الاعتماد',
    archiveGate: 'بوابة الأرشفة',
    releaseActionsLocked: 'عمليات الإصدار مقفلة حتى تنجح فحوصات الجاهزية.',
    handoffUseCases: 'استخدامات التسليم',
    userProgramHelp: 'استخدم صفحة البرنامج كالدليل الرئيسي المباشر للزوار.',
    userPrintHelp: 'استخدم نسخة الطباعة للمكاتب والموظفين ولافتات الموقع.',
    userShareHelp: 'استخدم صفحة المشاركة للتوزيع السريع وتسليم رابط أو QR.',
    approvedSnapshot: 'النسخة المعتمدة المحفوظة',
    approvalOutdated: 'الاعتماد لم يعد محدثًا',
    handoffView: 'عرض التسليم',
    handoffHelp: 'افتح أحدث حزمة تسليم وmanifest وملاحظات التسليم ومتصفح الأرشيف من مكان واحد.',
    handoffNotReady: 'ستظهر ملفات التسليم بعد أول نشر ناجح.',
    tabIntake: 'الاستقبال',
    tabEditor: 'التحرير',
    tabValidation: 'التحقق',
    tabPreview: 'المعاينة',
    tabDiff: 'المقارنة',
    tabRelease: 'الإصدار',
    tabHistory: 'السجل',
    tabHandoff: 'التسليم',
    releaseHistory: 'سجل الإصدارات',
    releaseHistoryHelp: 'راجع الإصدار الحالي المرتبط بهذه المساحة والنسخ المؤرشفة التابعة لها.',
    refreshHistory: 'تحديث السجل',
    historyNotLoaded: 'لم يتم تحميل سجل الإصدارات لهذه المساحة بعد.',
    currentLinkedRelease: 'الإصدار الحالي المرتبط',
    archivedReleases: 'الإصدارات المؤرشفة',
    noArchivedReleases: 'لا توجد إصدارات مؤرشفة مرتبطة بهذه المساحة بعد.',
    noCurrentLinkedRelease: 'لا يوجد إصدار حالي مرتبط بهذه المساحة.',
    archivedAt: 'تاريخ الأرشفة',
    openReleasePackage: 'فتح حزمة الإصدار',
    openManifest: 'فتح البيان',
    openShareKit: 'فتح حزمة المشاركة',
    openHandoffNotes: 'فتح ملاحظات التسليم',
    openReleaseBundle: 'فتح حزمة الإصدار',
    openArchiveBrowser: 'فتح متصفح الأرشيف',
    openDeliveryPackage: 'فتح حزمة التسليم',
    intakeNormalize: 'الاستقبال والتطبيع',
    intakeNormalizeHelp: 'ألصق CSV الخاصة بالاستلام أو حمّل قالبًا مرجعيًا ثم طبّعها مباشرة داخل مسودة مساحة العمل.',
    uploadCsvFile: 'إرفاق ملف الجهة',
    importingFile: 'جارٍ استيراد المرفق...',
    attachmentImported: 'تم استيراد المرفق إلى مسار الاستلام.',
    attachmentStoredOnly: 'تم حفظ المرفق. التحويل التلقائي متاح الآن لملفات CSV وXLSX، أما PDF والصور فما زالت تحتاج مراجعة يدوية في هذه البيئة.',
    latestAttachment: 'آخر مرفق',
    openAttachment: 'فتح المرفق',
    intakeSourceLabel: 'وسم مصدر الاستلام',
    intakeCsvContent: 'محتوى CSV للاستلام',
    loadTemplate: 'تحميل القالب',
    loadBaseline: 'تحميل النسخة الأساسية',
    loadUpdated: 'تحميل النسخة المحدثة',
    analyzeIntake: 'تحليل الاستلام',
    normalizeIntoDraft: 'تطبيع إلى المسودة',
    intakeNotLoaded: 'حمّل قالبًا أو ألصق CSV ليتم تطبيعها داخل مساحة العمل الحالية.',
    normalizationSummary: 'ملخص التطبيع',
    normalizedAt: 'وقت التطبيع',
    sourceLabel: 'وسم المصدر',
    intakeSourceKind: 'نوع المصدر',
    intakeOriginalFilename: 'اسم الملف الأصلي',
    rowsImported: 'الصفوف المستوردة',
    normalizationCompleted: 'اكتمل التطبيع.',
    intakeReview: 'مراجعة الاستلام',
    expectedColumns: 'الأعمدة المتوقعة',
    missingRequiredColumns: 'الأعمدة المطلوبة الناقصة',
    unknownColumns: 'الأعمدة غير المتوقعة',
    intakeIssues: 'مشكلات الاستلام',
    noIntakeIssues: 'لم يتم العثور على مشكلات في CSV الحالية.',
    analyzeBeforeNormalize: 'حلّل CSV الحالية قبل تطبيعها داخل مسودة مساحة العمل.',
    sampleRows: 'صفوف معاينة',
    rowNumber: 'الصف',
    intakeAnalyzed: 'اكتمل تحليل الاستلام.',
    editableRows: 'صفوف الاستلام القابلة للتعديل',
    reAnalyzeAfterEdits: 'أعد تحليل الاستلام بعد تعديل الصفوف لتحديث المشكلات وإعادة تفعيل التطبيع.',
    normalizeBlocked: 'التطبيع متوقف حتى تنجح مراجعة الاستلام بدون مشكلات حرجة.',
    mappingSummary: 'ملخص الربط',
    smartIntakeAssistant: 'مساعد الاستقبال الذكي',
    intakeQuality: 'جودة الاستقبال',
    intakeQualityHigh: 'مرتفعة',
    intakeQualityMedium: 'متوسطة',
    intakeQualityLow: 'منخفضة',
    suggestedFixes: 'إصلاحات مقترحة',
    detectedHeaders: 'الأعمدة المكتشفة',
    matchedBy: 'طريقة المطابقة',
    canonicalField: 'الحقل القياسي',
    sourceHeader: 'اسم العمود الأصلي',
    exactMatch: 'مطابقة مباشرة',
    aliasMatch: 'مطابقة عبر اسم بديل',
    unknownMatch: 'غير معروف',
    normalizedPreview: 'معاينة التطبيع',
    smartNormalize: 'تطبيع ذكي',
    aliasAutoDetected: 'تم اكتشاف الأسماء البديلة وربطها تلقائيًا إلى البنية القياسية.',
    qualityGuidance: 'استخدم درجة الجودة والأعمدة المكتشفة والإصلاحات المقترحة قبل التطبيع.',
    savedRawSource: 'المصدر الخام المحفوظ',
    reviewArtifacts: 'ملفات المراجعة',
    loadSavedIntake: 'فتح الإدخال المحفوظ',
    intakeLoadedFromWorkspace: 'تم تحميل مصدر الإدخال المحفوظ من مساحة العمل.',
    intakeFileLoaded: 'تم تحميل ملف CSV إلى مساحة الإدخال.',
    requestBackList: 'ما يجب طلبه من الجهة',
    noRequestBackItems: 'لا توجد عناصر تحتاج متابعة مع الجهة في مراجعة الإدخال الحالية.',
    sourceKind_manual: 'إدخال يدوي',
    sourceKind_uploaded_file: 'ملف مرفوع',
    sourceKind_preset: 'قالب جاهز',
    programFields: 'حقول البرنامج',
    sessionFields: 'حقول الجلسات',
    reviewReady: 'المراجعة جاهزة',
    reviewNeedsRefresh: 'المراجعة تحتاج تحديثًا',
    canNormalize: 'يمكن التطبيع',
    sessionType_keynote: 'كلمة رئيسية',
    sessionType_panel: 'حلقة نقاش',
    sessionType_workshop: 'ورشة عمل',
    sessionType_talk: 'عرض',
    sessionType_break: 'استراحة',
    sessionType_networking: 'تواصل',
    sessionType_ceremony: 'مراسم',
    sessionType_other: 'أخرى',
    sessionStatus_draft: 'مسودة',
    sessionStatus_scheduled: 'مجدولة',
    sessionStatus_live: 'مباشرة',
    sessionStatus_completed: 'مكتملة',
    sessionStatus_cancelled: 'ملغاة',
    language_ar: 'العربية',
    language_en: 'الإنجليزية',
    language_bilingual: 'ثنائي اللغة'
  }
};

const state = {
  workspaces: [],
  activeWorkspaceId: null,
  activeTab: 'editor',
  activeWorkspace: null,
  activeDraft: null,
  validationResult: null,
  previewResult: null,
  diffResult: null,
  releaseResult: null,
  archiveResult: null,
  releaseHistory: null,
  releaseReadiness: null,
  releaseDecision: null,
  deliveryCenter: null,
  workflow: null,
  intakePresets: null,
  intakeResult: null,
  intakeReview: null,
  intakeReviewStale: false,
  intakeBuffer: '',
  intakeSourceMeta: null,
  dirty: false,
  language: loadLanguagePreference(),
  busy: {
    saving: false,
    analyzingIntake: false,
    normalizing: false,
    validating: false,
    previewing: false,
    diffing: false,
    approving: false,
    publishing: false,
    archiving: false
  }
};

const elements = {
  workspaceList: document.getElementById('workspaceList'),
  createWorkspaceForm: document.getElementById('createWorkspaceForm'),
  refreshWorkspacesButton: document.getElementById('refreshWorkspacesButton'),
  workspaceEmptyState: document.getElementById('workspaceEmptyState'),
  workspaceView: document.getElementById('workspaceView'),
  workspaceTitle: document.getElementById('workspaceTitle'),
  workspaceMeta: document.getElementById('workspaceMeta'),
  workspaceStatusValue: document.getElementById('workspaceStatusValue'),
  workspaceValidationValue: document.getElementById('workspaceValidationValue'),
  workspacePreviewValue: document.getElementById('workspacePreviewValue'),
  workspaceSessionsValue: document.getElementById('workspaceSessionsValue'),
  workspacePaths: document.getElementById('workspacePaths'),
  workflowSummary: document.getElementById('workflowSummary'),
  workflowRail: document.getElementById('workflowRail'),
  workflowNextAction: document.getElementById('workflowNextAction'),
  nextActionButton: document.getElementById('nextActionButton'),
  workspaceDraftForm: document.getElementById('workspaceDraftForm'),
  reloadWorkspaceButton: document.getElementById('reloadWorkspaceButton'),
  saveDraftButton: document.getElementById('saveDraftButton'),
  validateDraftButton: document.getElementById('validateDraftButton'),
  previewDraftButton: document.getElementById('previewDraftButton'),
  dirtyStateBadge: document.getElementById('dirtyStateBadge'),
  validationBadge: document.getElementById('validationBadge'),
  validationPanel: document.getElementById('validationPanel'),
  previewBadge: document.getElementById('previewBadge'),
  previewPanel: document.getElementById('previewPanel'),
  intakeSourceLabelInput: document.getElementById('intakeSourceLabelInput'),
  intakeFileInput: document.getElementById('intakeFileInput'),
  intakeCsvTextarea: document.getElementById('intakeCsvTextarea'),
  analyzeIntakeButton: document.getElementById('analyzeIntakeButton'),
  loadTemplatePresetButton: document.getElementById('loadTemplatePresetButton'),
  loadBaselinePresetButton: document.getElementById('loadBaselinePresetButton'),
  loadUpdatedPresetButton: document.getElementById('loadUpdatedPresetButton'),
  normalizeWorkspaceButton: document.getElementById('normalizeWorkspaceButton'),
  intakePanel: document.getElementById('intakePanel'),
  sessionsEditor: document.getElementById('sessionsEditor'),
  sessionsEmptyState: document.getElementById('sessionsEmptyState'),
  addSessionButton: document.getElementById('addSessionButton'),
  diffDraftButton: document.getElementById('diffDraftButton'),
  approveDraftButton: document.getElementById('approveDraftButton'),
  approvalNoteInput: document.getElementById('approvalNoteInput'),
  diffPanel: document.getElementById('diffPanel'),
  publishWorkspaceButton: document.getElementById('publishWorkspaceButton'),
  archiveWorkspaceButton: document.getElementById('archiveWorkspaceButton'),
  releaseNoteInput: document.getElementById('releaseNoteInput'),
  releasePanel: document.getElementById('releasePanel'),
  refreshHistoryButton: document.getElementById('refreshHistoryButton'),
  historyPanel: document.getElementById('historyPanel'),
  handoffPanel: document.getElementById('handoffPanel'),
  goToHandoffHistoryButton: document.getElementById('goToHandoffHistoryButton'),
  workspaceSections: Array.from(document.querySelectorAll('[data-workspace-tab]')),
  workspaceTabButtons: Array.from(document.querySelectorAll('[data-workspace-tab-button]')),
  toast: document.getElementById('toast'),
  languageEnButton: document.getElementById('languageEnButton'),
  languageArButton: document.getElementById('languageArButton')
};

function loadLanguagePreference() {
  const stored = window.localStorage.getItem('eventlive-operator-language');
  return UI_LANGUAGES.includes(stored) ? stored : 'en';
}

function t(key) {
  return translations[state.language][key] || translations.en[key] || key;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function artifactHref(filePath) {
  return `/artifacts/${String(filePath || '').replace(/^\/+/, '')}`;
}

function formatDateTime(value) {
  return value || t('na');
}

function translateEnum(prefix, value) {
  return t(`${prefix}_${value}`) || value;
}

function translateWorkspaceStatus(value) {
  return t(value || 'unknown');
}

function translateValidationStatus(value) {
  return t(value || 'unknown');
}

function translatePreviewStatus(value) {
  return value ? t('ready') : t('notReady');
}

function translateIntakeQualityBand(value) {
  if (value === 'high') return t('intakeQualityHigh');
  if (value === 'medium') return t('intakeQualityMedium');
  if (value === 'low') return t('intakeQualityLow');
  return t('unknown');
}

function translateHeaderMatch(value) {
  if (value === 'exact') return t('exactMatch');
  if (value === 'alias') return t('aliasMatch');
  return t('unknownMatch');
}

function translateSourceKind(value) {
  return t(`sourceKind_${value}`) || value || t('na');
}

function buildActionConfirmation(title, lines) {
  return window.confirm([title, '', ...lines.filter(Boolean)].join('\n'));
}

function applyLanguage() {
  document.documentElement.lang = state.language;
  document.documentElement.dir = state.language === 'ar' ? 'rtl' : 'ltr';
  document.title = t('pageTitle');

  document.querySelectorAll('[data-i18n]').forEach((element) => {
    element.textContent = t(element.dataset.i18n);
  });

  elements.languageEnButton.classList.toggle('is-active', state.language === 'en');
  elements.languageArButton.classList.toggle('is-active', state.language === 'ar');

  renderWorkspaces();
  renderWorkspaceView();
  renderActiveTab();
}

function setLanguage(language) {
  if (!UI_LANGUAGES.includes(language) || language === state.language) return;
  state.language = language;
  window.localStorage.setItem('eventlive-operator-language', language);
  applyLanguage();
}

function showToast(message, type = 'info') {
  elements.toast.textContent = message;
  elements.toast.className = `toast ${type === 'error' ? 'error' : ''}`;
  setTimeout(() => {
    elements.toast.className = 'toast hidden';
  }, 2800);
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { 'content-type': 'application/json' },
    ...options
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error || `Request failed: ${response.status}`);
  }
  return payload;
}

function setDirty(nextDirty) {
  state.dirty = nextDirty;
  elements.dirtyStateBadge.textContent = nextDirty ? t('unsavedChanges') : t('clean');
  elements.dirtyStateBadge.className = nextDirty ? 'badge badge-dirty' : 'badge badge-muted';
}

function updateButtonStates() {
  const hasWorkspace = Boolean(state.activeWorkspaceId);
  const intakeReviewAllowsNormalize = Boolean(state.intakeReview && !state.intakeReviewStale && state.intakeReview.can_normalize);
  const releaseReadiness = state.releaseReadiness;
  elements.saveDraftButton.disabled = state.busy.saving || !hasWorkspace;
  elements.analyzeIntakeButton.disabled = state.busy.analyzingIntake || !hasWorkspace;
  elements.normalizeWorkspaceButton.disabled = state.busy.normalizing || !hasWorkspace || !intakeReviewAllowsNormalize;
  elements.validateDraftButton.disabled = state.busy.validating || !hasWorkspace;
  elements.previewDraftButton.disabled = state.busy.previewing || !hasWorkspace;
  elements.diffDraftButton.disabled = state.busy.diffing || !hasWorkspace;
  elements.approveDraftButton.disabled = state.busy.approving || !hasWorkspace || (releaseReadiness ? !releaseReadiness.can_approve : true);
  elements.publishWorkspaceButton.disabled = state.busy.publishing || !hasWorkspace || (releaseReadiness ? !releaseReadiness.can_publish : true);
  elements.archiveWorkspaceButton.disabled = state.busy.archiving || !hasWorkspace || (releaseReadiness ? !releaseReadiness.can_archive : true);
}

function setBusyFlag(key, active) {
  state.busy[key] = active;
  updateButtonStates();
}

function confirmDiscardChanges() {
  return !state.dirty || window.confirm(t('confirmDiscardChanges'));
}

function normalizeTab(tab) {
  return ['intake', 'editor', 'validation', 'preview', 'diff', 'release', 'history', 'handoff'].includes(tab) ? tab : 'editor';
}

function buildWorkspaceHash(workspaceId, tab = state.activeTab) {
  return workspaceId ? `#/workspaces/${encodeURIComponent(workspaceId)}/${normalizeTab(tab)}` : '#/';
}

function renderActiveTab() {
  elements.workspaceSections.forEach((section) => {
    section.classList.toggle('hidden', section.dataset.workspaceTab !== state.activeTab);
  });
  elements.workspaceTabButtons.forEach((button) => {
    button.classList.toggle('is-active', button.dataset.workspaceTabButton === state.activeTab);
  });
}

function setActiveTab(tab, options = {}) {
  state.activeTab = normalizeTab(tab);
  renderActiveTab();
  if (state.activeWorkspaceId && !options.silentHash) {
    const nextHash = buildWorkspaceHash(state.activeWorkspaceId, state.activeTab);
    if (window.location.hash !== nextHash) {
      window.location.hash = nextHash;
    }
  }
}

function renderWorkspaces() {
  if (!state.workspaces.length) {
    elements.workspaceList.innerHTML = `<div class="empty-state">${escapeHtml(t('noWorkspaces'))}</div>`;
    return;
  }

  elements.workspaceList.innerHTML = state.workspaces.map((workspace) => `
    <button class="workspace-item ${workspace.workspace_id === state.activeWorkspaceId ? 'active' : ''}" data-workspace-id="${workspace.workspace_id}">
      <div><strong>${escapeHtml(workspace.program_title || workspace.workspace_id)}</strong></div>
      <small>${escapeHtml(workspace.organizer_name || t('na'))}</small><br />
      <small>${escapeHtml(translateWorkspaceStatus(workspace.status))} | ${escapeHtml(workspace.updated_at)}</small>
    </button>
  `).join('');

  elements.workspaceList.querySelectorAll('[data-workspace-id]').forEach((button) => {
    button.addEventListener('click', async () => {
      if (!confirmDiscardChanges()) return;
      await openWorkspaceView(button.dataset.workspaceId, state.activeTab);
    });
  });
}

function renderValidationPanel() {
  const workspace = state.activeWorkspace;
  const validation = state.validationResult;
  const badgeText = workspace?.last_validation_status || 'unknown';
  elements.validationBadge.textContent = translateValidationStatus(badgeText);
  elements.validationBadge.className = `badge ${badgeText === 'passed' ? 'badge-success' : badgeText === 'failed' ? 'badge-danger' : 'badge-muted'}`;

  if (!validation) {
    elements.validationPanel.innerHTML = `<div class="empty-state">${escapeHtml(t('validationNotRun'))}</div>`;
    return;
  }

  const errors = validation.errors || [];
  const warnings = validation.warnings || [];
  const reportFile = validation.report_file || 'reports/validation-report.md';

  elements.validationPanel.innerHTML = `
    <div class="stack">
      <div><strong>${escapeHtml(t('status'))}:</strong> ${escapeHtml(validation.ok ? t('pass') : t('fail'))}</div>
      <div><strong>${escapeHtml(t('report'))}:</strong> <a class="inline-link" href="${artifactHref(reportFile)}" target="_blank" rel="noreferrer">${escapeHtml(reportFile)}</a></div>
      <div><strong>${escapeHtml(t('errors'))}:</strong> ${errors.length}</div>
      <div><strong>${escapeHtml(t('warnings'))}:</strong> ${warnings.length}</div>
      ${errors.length ? `<div class="issue-group"><strong>${escapeHtml(t('errors'))}</strong><ul>${errors.map((error) => `<li>${escapeHtml(error)}</li>`).join('')}</ul></div>` : ''}
      ${warnings.length ? `<div class="issue-group"><strong>${escapeHtml(t('warnings'))}</strong><ul>${warnings.map((warning) => `<li>${escapeHtml(warning)}</li>`).join('')}</ul></div>` : ''}
      ${!errors.length && !warnings.length ? `<div class="empty-state">${escapeHtml(t('validationPassedNoIssues'))}</div>` : ''}
    </div>
  `;
}

function getPresetContent(key) {
  return state.intakePresets?.presets?.find((preset) => preset.key === key)?.content || '';
}

function serializeCsvValue(value) {
  const text = String(value ?? '');
  if (!/[",\n\r]/.test(text)) return text;
  return `"${text.replace(/"/g, '""')}"`;
}

function serializeIntakeRows(headers, rows) {
  if (!Array.isArray(headers) || !headers.length) return '';
  const lines = [
    headers.join(','),
    ...rows.map((row) => headers.map((header) => serializeCsvValue(row?.[header] ?? '')).join(','))
  ];
  return `${lines.join('\n')}\n`;
}

function renderIntakePanel() {
  const workspace = state.activeWorkspace;
  const result = state.intakeResult;
  const review = state.intakeReview;
  const intakeMeta = state.intakeSourceMeta || {};

  const reviewHtml = review
    ? `
      <div class="stack">
        <div><strong>${escapeHtml(t('smartIntakeAssistant'))}</strong></div>
        <div class="muted">${escapeHtml(t('qualityGuidance'))}</div>
        <div class="summary-grid compact-grid intake-summary-grid">
          <div class="summary-card"><div class="summary-label">${escapeHtml(t('rowsImported'))}</div><div class="summary-value">${escapeHtml(review.rows_count ?? 0)}</div></div>
          <div class="summary-card"><div class="summary-label">${escapeHtml(t('missingRequiredColumns'))}</div><div class="summary-value">${escapeHtml(review.missing_required_columns?.length ?? 0)}</div></div>
          <div class="summary-card"><div class="summary-label">${escapeHtml(t('unknownColumns'))}</div><div class="summary-value">${escapeHtml(review.unknown_columns?.length ?? 0)}</div></div>
          <div class="summary-card"><div class="summary-label">${escapeHtml(t('intakeIssues'))}</div><div class="summary-value">${escapeHtml(review.issues?.length ?? 0)}</div></div>
          <div class="summary-card"><div class="summary-label">${escapeHtml(t('intakeQuality'))}</div><div class="summary-value">${escapeHtml(review.quality_score ?? 0)}</div></div>
          <div class="summary-card"><div class="summary-label">${escapeHtml(t('status'))}</div><div class="summary-value">${escapeHtml(translateIntakeQualityBand(review.quality_band))}</div></div>
        </div>
        <div><strong>${escapeHtml(t('canNormalize'))}:</strong> ${escapeHtml(review.can_normalize && !state.intakeReviewStale ? t('reviewReady') : t('reviewNeedsRefresh'))}</div>
        <div><strong>${escapeHtml(t('latestAttachment'))}:</strong> ${workspace?.intake_attachment_file ? `<a class="inline-link" href="${artifactHref(workspace.intake_attachment_file)}" target="_blank" rel="noreferrer">${escapeHtml(t('openAttachment'))}</a>` : escapeHtml(t('none'))}</div>
        <div><strong>${escapeHtml(t('intakeSourceKind'))}:</strong> ${escapeHtml(translateSourceKind(review.source_kind || workspace?.intake_source_kind || intakeMeta.source_kind))}</div>
        <div><strong>${escapeHtml(t('intakeOriginalFilename'))}:</strong> ${escapeHtml(review.original_filename || workspace?.intake_original_filename || intakeMeta.original_filename || t('none'))}</div>
        <div><strong>${escapeHtml(t('expectedColumns'))}:</strong> ${escapeHtml((review.expected_columns || []).join(', ') || t('none'))}</div>
        <div><strong>${escapeHtml(t('missingRequiredColumns'))}:</strong> ${escapeHtml((review.missing_required_columns || []).join(', ') || t('none'))}</div>
        <div><strong>${escapeHtml(t('unknownColumns'))}:</strong> ${escapeHtml((review.unknown_columns || []).join(', ') || t('none'))}</div>
        ${review.mapping?.detected_headers?.some((item) => item.matched_by === 'alias') ? `<div class="empty-state">${escapeHtml(t('aliasAutoDetected'))}</div>` : ''}
        <div class="issue-group">
          <strong>${escapeHtml(t('mappingSummary'))}</strong>
          <div><strong>${escapeHtml(t('programFields'))}:</strong> ${escapeHtml((review.mapping?.program_fields || []).join(', ') || t('none'))}</div>
          <div><strong>${escapeHtml(t('sessionFields'))}:</strong> ${escapeHtml((review.mapping?.session_fields || []).join(', ') || t('none'))}</div>
        </div>
        <div class="issue-group">
          <strong>${escapeHtml(t('detectedHeaders'))}</strong>
          <div class="intake-sample-table">
            <table>
              <thead>
                <tr>
                  <th>${escapeHtml(t('sourceHeader'))}</th>
                  <th>${escapeHtml(t('canonicalField'))}</th>
                  <th>${escapeHtml(t('matchedBy'))}</th>
                </tr>
              </thead>
              <tbody>
                ${(review.mapping?.detected_headers || []).map((header) => `
                  <tr>
                    <td>${escapeHtml(header.source_header || t('na'))}</td>
                    <td>${escapeHtml(header.canonical_header || t('none'))}</td>
                    <td>${escapeHtml(translateHeaderMatch(header.matched_by))}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
        <div class="issue-group">
          <strong>${escapeHtml(t('suggestedFixes'))}</strong>
          <ul>
            ${(review.suggested_fixes || []).map((fix) => `<li>${escapeHtml(fix)}</li>`).join('')}
          </ul>
        </div>
        <div class="issue-group">
          <strong>${escapeHtml(t('requestBackList'))}</strong>
          ${(review.request_back_items || []).length
            ? `<ul>${review.request_back_items.map((item) => `<li>[${escapeHtml(item.severity)}] ${escapeHtml(item.message)}</li>`).join('')}</ul>`
            : `<div class="empty-state">${escapeHtml(t('noRequestBackItems'))}</div>`}
        </div>
        ${review.normalized_preview ? `
          <div class="issue-group">
            <strong>${escapeHtml(t('normalizedPreview'))}</strong>
            <div><strong>${escapeHtml(t('programTitle'))}:</strong> ${escapeHtml(review.normalized_preview.program_title || t('na'))}</div>
            <div><strong>${escapeHtml(t('organizerName'))}:</strong> ${escapeHtml(review.normalized_preview.organizer_name || t('na'))}</div>
            <div><strong>${escapeHtml(t('venue'))}:</strong> ${escapeHtml(review.normalized_preview.venue || t('na'))}</div>
            <div><strong>${escapeHtml(t('city'))}:</strong> ${escapeHtml(review.normalized_preview.city || t('na'))}</div>
            <div><strong>${escapeHtml(t('eventWindow'))}:</strong> ${escapeHtml(review.normalized_preview.event_start || t('na'))} -> ${escapeHtml(review.normalized_preview.event_end || t('na'))}</div>
            <div><strong>${escapeHtml(t('sessions'))}:</strong> ${escapeHtml(review.normalized_preview.sessions_count ?? 0)}</div>
          </div>
        ` : ''}
        <div class="issue-group">
          <strong>${escapeHtml(t('intakeIssues'))}</strong>
          ${(review.issues || []).length
            ? `<ul>${review.issues.map((issue) => `<li>${escapeHtml(issue.message || issue)}</li>`).join('')}</ul>`
            : `<div class="empty-state">${escapeHtml(t('noIntakeIssues'))}</div>`}
        </div>
        <div class="issue-group">
          <strong>${escapeHtml(t('savedRawSource'))}</strong>
          <div class="link-grid">
            ${review.raw_source_file ? `<a class="inline-link" href="${artifactHref(review.raw_source_file)}" target="_blank" rel="noreferrer">${escapeHtml(t('loadSavedIntake'))}</a>` : ''}
          </div>
        </div>
        <div class="issue-group">
          <strong>${escapeHtml(t('reviewArtifacts'))}</strong>
          <div class="link-grid">
            ${review.review_json_file ? `<a class="inline-link" href="${artifactHref(review.review_json_file)}" target="_blank" rel="noreferrer">review.json</a>` : ''}
            ${review.review_md_file ? `<a class="inline-link" href="${artifactHref(review.review_md_file)}" target="_blank" rel="noreferrer">review.md</a>` : ''}
          </div>
        </div>
        <div class="issue-group">
          <strong>${escapeHtml(t('editableRows'))}</strong>
          <div class="muted">${escapeHtml(t('reAnalyzeAfterEdits'))}</div>
          <div class="intake-sample-table">
            <table>
              <thead>
                <tr>
                  ${INTAKE_EDITABLE_COLUMNS.map((column) => `<th>${escapeHtml(column)}</th>`).join('')}
                </tr>
              </thead>
              <tbody>
                ${(review.rows || []).map((row, rowIndex) => `
                  <tr>
                    ${INTAKE_EDITABLE_COLUMNS.map((column) => `
                      <td>
                        <input
                          class="intake-cell-input"
                          data-intake-row="${rowIndex}"
                          data-intake-column="${column}"
                          value="${escapeHtml(row[column] || '')}"
                        />
                      </td>
                    `).join('')}
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
        <div class="issue-group">
          <strong>${escapeHtml(t('sampleRows'))}</strong>
          <div class="intake-sample-table">
            <table>
              <thead>
                <tr>
                  <th>${escapeHtml(t('rowNumber'))}</th>
                  <th>${escapeHtml(t('sessionTitle'))}</th>
                  <th>${escapeHtml(t('startAt'))}</th>
                  <th>${escapeHtml(t('endAt'))}</th>
                  <th>${escapeHtml(t('room'))}</th>
                  <th>${escapeHtml(t('speaker'))}</th>
                </tr>
              </thead>
              <tbody>
                ${(review.sample_rows || []).map((row) => `
                  <tr>
                    <td>${escapeHtml(row.row_number)}</td>
                    <td>${escapeHtml(row.values?.session_title || t('na'))}</td>
                    <td>${escapeHtml(row.values?.start_at || t('na'))}</td>
                    <td>${escapeHtml(row.values?.end_at || t('na'))}</td>
                    <td>${escapeHtml(row.values?.room || t('na'))}</td>
                    <td>${escapeHtml(row.values?.speaker || t('na'))}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `
    : `<div class="empty-state">${escapeHtml(t('analyzeBeforeNormalize'))}</div>`;

  if (!result) {
    elements.intakePanel.innerHTML = `
      <div class="empty-state">${escapeHtml(t('intakeNotLoaded'))}</div>
      <div><strong>${escapeHtml(t('sourceLabel'))}:</strong> ${escapeHtml(workspace?.last_intake_source || t('none'))}</div>
      <div><strong>${escapeHtml(t('latestAttachment'))}:</strong> ${workspace?.intake_attachment_file ? `<a class="inline-link" href="${artifactHref(workspace.intake_attachment_file)}" target="_blank" rel="noreferrer">${escapeHtml(t('openAttachment'))}</a>` : escapeHtml(t('none'))}</div>
      <div><strong>${escapeHtml(t('intakeSourceKind'))}:</strong> ${escapeHtml(translateSourceKind(workspace?.intake_source_kind || intakeMeta.source_kind))}</div>
      <div><strong>${escapeHtml(t('intakeOriginalFilename'))}:</strong> ${escapeHtml(workspace?.intake_original_filename || intakeMeta.original_filename || t('none'))}</div>
      <div><strong>${escapeHtml(t('normalizedAt'))}:</strong> ${escapeHtml(workspace?.last_normalized_at || t('na'))}</div>
      ${reviewHtml}
    `;
    return;
  }

  elements.intakePanel.innerHTML = `
    <div class="stack">
      <div><strong>${escapeHtml(t('normalizationSummary'))}</strong></div>
      <div><strong>${escapeHtml(t('rowsImported'))}:</strong> ${escapeHtml(result.rows_count ?? 0)}</div>
      <div><strong>${escapeHtml(t('sourceLabel'))}:</strong> ${escapeHtml(result.source_label || t('none'))}</div>
      <div><strong>${escapeHtml(t('latestAttachment'))}:</strong> ${workspace?.intake_attachment_file ? `<a class="inline-link" href="${artifactHref(workspace.intake_attachment_file)}" target="_blank" rel="noreferrer">${escapeHtml(t('openAttachment'))}</a>` : escapeHtml(t('none'))}</div>
      <div><strong>${escapeHtml(t('intakeSourceKind'))}:</strong> ${escapeHtml(translateSourceKind(result.source_kind || workspace?.intake_source_kind || intakeMeta.source_kind))}</div>
      <div><strong>${escapeHtml(t('intakeOriginalFilename'))}:</strong> ${escapeHtml(result.original_filename || workspace?.intake_original_filename || intakeMeta.original_filename || t('none'))}</div>
      <div><strong>${escapeHtml(t('normalizedAt'))}:</strong> ${escapeHtml(result.normalized_at || t('na'))}</div>
      <div><strong>${escapeHtml(t('programTitle'))}:</strong> ${escapeHtml(state.activeDraft?.program?.program_title || t('na'))}</div>
      <div><strong>${escapeHtml(t('sessions'))}:</strong> ${escapeHtml(state.activeDraft?.sessions?.length ?? 0)}</div>
      ${reviewHtml}
    </div>
  `;
}

function renderPreviewPanel() {
  const workspace = state.activeWorkspace;
  const preview = state.previewResult;
  elements.previewBadge.textContent = translatePreviewStatus(workspace?.preview_ready);
  elements.previewBadge.className = `badge ${workspace?.preview_ready ? 'badge-success' : 'badge-muted'}`;

  if (!preview) {
    elements.previewPanel.innerHTML = `<div class="empty-state">${escapeHtml(t('previewNotRun'))}</div>`;
    return;
  }

  elements.previewPanel.innerHTML = `
    <div class="stack">
      <div><strong>${escapeHtml(t('generated'))}:</strong> ${escapeHtml(preview.generated_at || workspace?.last_preview_at || t('na'))}</div>
      <div><strong>${escapeHtml(t('sourceDraft'))}:</strong> <code>${escapeHtml(preview.source_file || workspace?.draft_file || t('na'))}</code></div>
      <div><strong>${escapeHtml(t('buildReport'))}:</strong> <a class="inline-link" href="${artifactHref(preview.build_report || 'reports/build-report.md')}" target="_blank" rel="noreferrer">${escapeHtml(preview.build_report || 'reports/build-report.md')}</a></div>
      <div class="link-grid">
        <a class="inline-link" href="${artifactHref(preview.program_page || 'dist/index.html')}" target="_blank" rel="noreferrer">${escapeHtml(t('openProgramPage'))}</a>
        <a class="inline-link" href="${artifactHref(preview.print_page || 'dist/print.html')}" target="_blank" rel="noreferrer">${escapeHtml(t('openPrintView'))}</a>
        <a class="inline-link" href="${artifactHref(preview.share_page || 'dist/share.html')}" target="_blank" rel="noreferrer">${escapeHtml(t('openShareView'))}</a>
      </div>
    </div>
  `;
}

function categorizeModifiedSessions(modifiedSessions) {
  const buckets = {
    timing: [],
    room: [],
    speaker: [],
    track: []
  };

  for (const session of modifiedSessions || []) {
    for (const change of session.changes || []) {
      const entry = {
        id: session.id,
        title: session.session_title_after || session.session_title_before || t('untitledSession'),
        field: change.field,
        before: change.before,
        after: change.after
      };

      if (change.field === 'start_at' || change.field === 'end_at') buckets.timing.push(entry);
      if (change.field === 'room') buckets.room.push(entry);
      if (change.field === 'speaker' || change.field === 'moderator') buckets.speaker.push(entry);
      if (change.field === 'track') buckets.track.push(entry);
    }
  }

  return buckets;
}

function formatChangeValue(value) {
  if (Array.isArray(value)) return value.join(', ');
  if (value === null || value === undefined || value === '') return '-';
  return String(value);
}

function renderDetailedReviewQueue(decision) {
  const diff = decision?.diff;
  if (!diff) {
    return `<div class="empty-state">${escapeHtml(t('noChangesToReview'))}</div>`;
  }

  const metadataHtml = diff.metadata_changes?.length
    ? `
      <div class="issue-group">
        <strong>${escapeHtml(t('metadataReview'))}</strong>
        <ul>
          ${diff.metadata_changes.map((change) => `<li>${escapeHtml(change.field)}: ${escapeHtml(formatChangeValue(change.before))} -> ${escapeHtml(formatChangeValue(change.after))}</li>`).join('')}
        </ul>
      </div>
    `
    : '';

  const addedHtml = diff.added_sessions?.length
    ? `
      <div class="issue-group">
        <strong>${escapeHtml(t('addedSessionsReview'))}</strong>
        <ul>
          ${diff.added_sessions.map((session) => `<li>${escapeHtml(session.id)} | ${escapeHtml(session.session_title || t('untitledSession'))} | ${escapeHtml(session.start_at || '-')} | ${escapeHtml(session.room || '-')}</li>`).join('')}
        </ul>
      </div>
    `
    : '';

  const removedHtml = diff.removed_sessions?.length
    ? `
      <div class="issue-group">
        <strong>${escapeHtml(t('removedSessionsReview'))}</strong>
        <ul>
          ${diff.removed_sessions.map((session) => `<li>${escapeHtml(session.id)} | ${escapeHtml(session.session_title || t('untitledSession'))} | ${escapeHtml(session.start_at || '-')} | ${escapeHtml(session.room || '-')}</li>`).join('')}
        </ul>
      </div>
    `
    : '';

  const modifiedHtml = diff.modified_sessions?.length
    ? `
      <div class="issue-group">
        <strong>${escapeHtml(t('changedSessionsReview'))}</strong>
        ${diff.modified_sessions.map((session) => `
          <div class="change-card">
            <div><strong>${escapeHtml(session.id)}</strong> | ${escapeHtml(session.session_title_after || session.session_title_before || t('untitledSession'))}</div>
            <div class="muted">${escapeHtml(t('fieldChanges'))}</div>
            <ul>
              ${(session.changes || []).map((change) => `<li>${escapeHtml(change.field)}: ${escapeHtml(formatChangeValue(change.before))} -> ${escapeHtml(formatChangeValue(change.after))}</li>`).join('')}
            </ul>
          </div>
        `).join('')}
      </div>
    `
    : '';

  const html = [metadataHtml, addedHtml, removedHtml, modifiedHtml].filter(Boolean).join('');
  return html || `<div class="empty-state">${escapeHtml(t('noChangesToReview'))}</div>`;
}

function renderDiffPanel() {
  const diff = state.diffResult;
  const decision = state.releaseDecision;
  const readiness = decision?.readiness || state.releaseReadiness;
  if (!diff) {
    elements.diffPanel.innerHTML = `<div class="empty-state">${escapeHtml(t('diffNotRun'))}</div>`;
    return;
  }

  const summary = decision?.diff?.summary || diff.report?.summary || {};
  const categories = decision?.diff?.categorized_impact
    ? {
        timing: Array(decision.diff.categorized_impact.timing_changes).fill(null),
        room: Array(decision.diff.categorized_impact.room_changes).fill(null),
        speaker: Array(decision.diff.categorized_impact.speaker_changes).fill(null),
        track: Array(decision.diff.categorized_impact.track_changes).fill(null)
      }
    : categorizeModifiedSessions(diff.report?.modified_sessions || []);
  const categoryCards = [
    { key: 'timing', label: t('timingChanges'), count: categories.timing.length },
    { key: 'room', label: t('roomChanges'), count: categories.room.length },
    { key: 'speaker', label: t('speakerChanges'), count: categories.speaker.length },
    { key: 'track', label: t('trackChanges'), count: categories.track.length }
  ];

  const categoryListsHtml = categoryCards.some((item) => item.count > 0)
    ? `
      <div class="issue-group">
        <strong>${escapeHtml(t('modifiedSessions'))}</strong>
        ${categoryCards.map((item) => `
          <div class="diff-bucket">
            <div><strong>${escapeHtml(item.label)}:</strong> ${escapeHtml(item.count)}</div>
            ${item.count
              ? `<ul>${(categories[item.key] || []).map((entry) => entry ? `<li>${escapeHtml(entry.id)} | ${escapeHtml(entry.title)} | ${escapeHtml(entry.field)}: ${escapeHtml(entry.before ?? '-')} -> ${escapeHtml(entry.after ?? '-')}</li>` : '').join('')}</ul>`
              : ''}
          </div>
        `).join('')}
      </div>
    `
    : `<div class="empty-state">${escapeHtml(t('noCategorizedChanges'))}</div>`;
  const reviewQueueHtml = decision
    ? renderDetailedReviewQueue(decision)
    : `<div class="empty-state">${escapeHtml(t('noChangesToReview'))}</div>`;

  elements.diffPanel.innerHTML = `
    <div class="stack">
      ${readiness ? `
        <div class="summary-grid compact-grid">
          <div class="summary-card">
            <div class="summary-label">${escapeHtml(t('currentVersion'))}</div>
            <div class="summary-value">${escapeHtml(decision?.current_release?.release_id || readiness.current_release?.release_id || t('none'))}</div>
          </div>
          <div class="summary-card">
            <div class="summary-label">${escapeHtml(t('candidateVersion'))}</div>
            <div class="summary-value">${escapeHtml(readiness.candidate?.updated_at || t('na'))}</div>
          </div>
          <div class="summary-card">
            <div class="summary-label">${escapeHtml(t('sessions'))}</div>
            <div class="summary-value">${escapeHtml(readiness.candidate?.sessions_count ?? 0)}</div>
          </div>
          <div class="summary-card">
            <div class="summary-label">${escapeHtml(t('recommendedAction'))}</div>
            <div class="summary-value">${escapeHtml(decision?.recommendation?.label || (readiness.can_approve ? t('ready') : t('notReady')))}</div>
          </div>
        </div>
      ` : ''}
      <div><strong>${escapeHtml(t('baseFile'))}:</strong> <code>${escapeHtml(diff.base_file || t('na'))}</code></div>
      <div><strong>${escapeHtml(t('candidateFile'))}:</strong> <code>${escapeHtml(diff.candidate_file || t('na'))}</code></div>
      <div class="summary-grid compact-grid">
        <div class="summary-card"><div class="summary-label">${escapeHtml(t('metadataChanges'))}</div><div class="summary-value">${summary.metadata_changes ?? 0}</div></div>
        <div class="summary-card"><div class="summary-label">${escapeHtml(t('addedSessions'))}</div><div class="summary-value">${summary.added_sessions ?? 0}</div></div>
        <div class="summary-card"><div class="summary-label">${escapeHtml(t('removedSessions'))}</div><div class="summary-value">${summary.removed_sessions ?? 0}</div></div>
        <div class="summary-card"><div class="summary-label">${escapeHtml(t('modifiedSessions'))}</div><div class="summary-value">${summary.modified_sessions ?? 0}</div></div>
      </div>
      <div class="issue-group">
        <strong>${escapeHtml(t('visualReview'))}</strong>
        <div class="muted">${escapeHtml(t('reviewQueue'))}</div>
      </div>
      ${reviewQueueHtml}
      ${categoryListsHtml}
      <div class="link-grid">
        ${diff.html_file ? `<a class="inline-link" href="${artifactHref(diff.html_file)}" target="_blank" rel="noreferrer">${escapeHtml(t('openDiffHtml'))}</a>` : ''}
        ${diff.md_file ? `<a class="inline-link" href="${artifactHref(diff.md_file)}" target="_blank" rel="noreferrer">${escapeHtml(diff.md_file)}</a>` : ''}
      </div>
    </div>
  `;
}

function renderReleasePanel() {
  const workspace = state.activeWorkspace;
  const release = state.releaseResult;
  const decision = state.releaseDecision;
  const readiness = decision?.readiness || state.releaseReadiness;
  const delivery = state.deliveryCenter;
  const releaseId = workspace?.current_release_id;
  const deliveryManifest = workspace?.latest_delivery_manifest;
  const manifest = release?.manifest || null;
  const bundle = release?.bundle || null;

  const checksHtml = readiness
    ? `
      <div class="issue-group">
        <strong>${escapeHtml(t('readinessChecks'))}</strong>
        <ul>
          ${(readiness.checks || []).map((check) => `
            <li>
              <strong>${check.ok ? 'OK' : 'BLOCK'}:</strong> ${escapeHtml(check.label)}
              ${check.detail ? ` <span class="muted">(${escapeHtml(check.detail)})</span>` : ''}
            </li>
          `).join('')}
        </ul>
      </div>
      <div class="summary-grid compact-grid">
        <div class="summary-card"><div class="summary-label">${escapeHtml(t('approveGate'))}</div><div class="summary-value">${escapeHtml(readiness.can_approve ? t('ready') : t('notReady'))}</div></div>
        <div class="summary-card"><div class="summary-label">${escapeHtml(t('publishGate'))}</div><div class="summary-value">${escapeHtml(readiness.can_publish ? t('ready') : t('notReady'))}</div></div>
        <div class="summary-card"><div class="summary-label">${escapeHtml(t('archiveGate'))}</div><div class="summary-value">${escapeHtml(readiness.can_archive ? t('ready') : t('notReady'))}</div></div>
        <div class="summary-card"><div class="summary-label">${escapeHtml(t('approvedSnapshot'))}</div><div class="summary-value">${escapeHtml(readiness.current_release?.approved_draft_file ? t('ready') : t('notReady'))}</div></div>
      </div>
    `
    : `<div class="empty-state">${escapeHtml(t('releaseActionsLocked'))}</div>`;

  const candidateHtml = readiness
    ? `
      <div class="summary-grid compact-grid">
        <div class="history-card">
          <h4>${escapeHtml(t('candidateRelease'))}</h4>
          <div><strong>${escapeHtml(t('programTitle'))}:</strong> ${escapeHtml(readiness.candidate.program_title || t('na'))}</div>
          <div><strong>${escapeHtml(t('organizerName'))}:</strong> ${escapeHtml(readiness.candidate.organizer_name || t('na'))}</div>
          <div><strong>${escapeHtml(t('sessions'))}:</strong> ${escapeHtml(readiness.candidate.sessions_count ?? 0)}</div>
          <div><strong>${escapeHtml(t('updatedAt'))}:</strong> ${escapeHtml(readiness.candidate.updated_at || t('na'))}</div>
          <div><strong>${escapeHtml(t('eventWindow'))}:</strong> ${escapeHtml(readiness.candidate.event_start || t('na'))} -> ${escapeHtml(readiness.candidate.event_end || t('na'))}</div>
          ${readiness.approval_outdated ? `<div class="empty-state">${escapeHtml(t('approvalOutdated'))}</div>` : ''}
        </div>
        <div class="history-card">
          <h4>${escapeHtml(t('currentLiveRelease'))}</h4>
          <div><strong>${escapeHtml(t('releaseId'))}:</strong> ${escapeHtml(decision?.current_release?.release_id || t('none'))}</div>
          <div><strong>${escapeHtml(t('programTitle'))}:</strong> ${escapeHtml(decision?.current_release?.program_title || t('na'))}</div>
          <div><strong>${escapeHtml(t('organizerName'))}:</strong> ${escapeHtml(decision?.current_release?.organizer_name || t('na'))}</div>
          <div><strong>${escapeHtml(t('sessions'))}:</strong> ${escapeHtml(decision?.current_release?.sessions_count ?? t('na'))}</div>
          <div><strong>${escapeHtml(t('publishedAt'))}:</strong> ${escapeHtml(decision?.current_release?.published_at || t('na'))}</div>
        </div>
      </div>
    `
    : '';

  const decisionHtml = decision
    ? `
      <div class="issue-group">
        <strong>${escapeHtml(t('releaseDecisionCenter'))}</strong>
        <div class="muted">${escapeHtml(t('releaseDecisionHelp'))}</div>
        <div class="summary-grid compact-grid">
          <div class="summary-card"><div class="summary-label">${escapeHtml(t('releaseImpact'))}</div><div class="summary-value">${escapeHtml((decision.diff.summary.metadata_changes || 0) + (decision.diff.summary.added_sessions || 0) + (decision.diff.summary.removed_sessions || 0) + (decision.diff.summary.modified_sessions || 0))}</div></div>
          <div class="summary-card"><div class="summary-label">${escapeHtml(t('timingChanges'))}</div><div class="summary-value">${escapeHtml(decision.diff.categorized_impact.timing_changes ?? 0)}</div></div>
          <div class="summary-card"><div class="summary-label">${escapeHtml(t('roomChanges'))}</div><div class="summary-value">${escapeHtml(decision.diff.categorized_impact.room_changes ?? 0)}</div></div>
          <div class="summary-card"><div class="summary-label">${escapeHtml(t('speakerChanges'))}</div><div class="summary-value">${escapeHtml(decision.diff.categorized_impact.speaker_changes ?? 0)}</div></div>
        </div>
        <div><strong>${escapeHtml(t('recommendedAction'))}:</strong> ${escapeHtml(decision.recommendation?.label || t('na'))}</div>
        <div class="muted">${escapeHtml(decision.recommendation?.detail || t('na'))}</div>
        <div class="empty-state">${escapeHtml(decision.replacement?.will_replace_current ? t('willReplaceCurrent') : t('firstReleasePublish'))}</div>
      </div>
    `
    : '';

  const preflightChecks = decision
    ? [
        { label: t('releaseNoteProvided'), ok: Boolean(String(elements.releaseNoteInput.value || '').trim()) },
        { label: t('readyForOperatorDecision'), ok: Boolean(readiness?.can_approve || readiness?.can_publish) },
        { label: t('currentReplacementAware'), ok: decision.replacement?.will_replace_current ? Boolean(decision.current_release?.release_id) : true }
      ]
    : [];

  const preflightHtml = preflightChecks.length
    ? `
      <div class="issue-group">
        <strong>${escapeHtml(t('publishChecklist'))}</strong>
        <ul>
          ${preflightChecks.map((item) => `<li><strong>${item.ok ? 'OK' : 'BLOCK'}:</strong> ${escapeHtml(item.label)}</li>`).join('')}
        </ul>
      </div>
    `
    : '';

  const flowStepsHtml = `
    <div class="flow-grid">
      <article class="flow-step ${readiness?.can_approve ? 'ready' : 'blocked'}">
        <div class="summary-label">${escapeHtml(t('publishStepReview'))}</div>
        <div class="summary-value">${escapeHtml(readiness?.can_approve ? t('ready') : t('notReady'))}</div>
        <div class="muted">${escapeHtml(decision?.recommendation?.detail || t('na'))}</div>
      </article>
      <article class="flow-step ${String(elements.releaseNoteInput.value || '').trim() ? 'ready' : 'blocked'}">
        <div class="summary-label">${escapeHtml(t('publishStepReleaseNote'))}</div>
        <div class="summary-value">${escapeHtml(String(elements.releaseNoteInput.value || '').trim() ? t('ready') : t('notReady'))}</div>
        <div class="muted">${escapeHtml(String(elements.releaseNoteInput.value || '').trim() ? t('candidateApproved') : t('publishWillUseDefaultNote'))}</div>
      </article>
      <article class="flow-step ${readiness?.can_publish ? 'ready' : 'blocked'}">
        <div class="summary-label">${escapeHtml(t('publishStepGoLive'))}</div>
        <div class="summary-value">${escapeHtml(readiness?.can_publish ? t('ready') : t('notReady'))}</div>
        <div class="muted">${escapeHtml(decision?.replacement?.will_replace_current ? t('publishReplacesCurrent') : t('publishCreatesFirstRelease'))}</div>
      </article>
      <article class="flow-step ${(delivery?.current || releaseId) ? 'ready' : 'blocked'}">
        <div class="summary-label">${escapeHtml(t('publishStepDelivery'))}</div>
        <div class="summary-value">${escapeHtml((delivery?.current || releaseId) ? t('liveReleaseReady') : t('notReady'))}</div>
        <div class="muted">${escapeHtml(t('deliveryReadyAfterPublish'))}</div>
      </article>
    </div>
  `;

  const publishOutcomeHtml = (release || delivery?.current || releaseId)
    ? `
      <div class="issue-group">
        <strong>${escapeHtml(t('publishOutcome'))}</strong>
        <div><strong>${escapeHtml(t('releaseId'))}:</strong> ${escapeHtml(manifest?.release_id || delivery?.current?.release_id || releaseId || t('na'))}</div>
        <div><strong>${escapeHtml(t('publishedAt'))}:</strong> ${escapeHtml(manifest?.published_at || delivery?.current?.published_at || t('na'))}</div>
        <div class="link-grid">
          <a class="inline-link" href="${artifactHref('dist/index.html')}" target="_blank" rel="noreferrer">${escapeHtml(t('openProgramPage'))}</a>
          <a class="inline-link" href="${artifactHref('dist/print.html')}" target="_blank" rel="noreferrer">${escapeHtml(t('openPrintView'))}</a>
          <a class="inline-link" href="${artifactHref('dist/share.html')}" target="_blank" rel="noreferrer">${escapeHtml(t('openShareView'))}</a>
          <a class="inline-link" href="#/workspaces/${encodeURIComponent(state.activeWorkspaceId)}/handoff">${escapeHtml(t('goToHandoff'))}</a>
          <a class="inline-link" href="#/workspaces/${encodeURIComponent(state.activeWorkspaceId)}/history">${escapeHtml(t('goToHistory'))}</a>
        </div>
      </div>
    `
    : '';

  const currentReleaseHtml = (!releaseId && !deliveryManifest)
    ? `<div class="empty-state">${escapeHtml(t('releaseNotPublished'))}</div>`
    : `
      <div class="issue-group">
        <strong>${escapeHtml(t('currentRelease'))}</strong>
        <div><strong>${escapeHtml(t('releaseId'))}:</strong> ${escapeHtml(releaseId || manifest?.release_id || t('na'))}</div>
        <div><strong>${escapeHtml(t('publishedAt'))}:</strong> ${escapeHtml(manifest?.published_at || t('na'))}</div>
        <div><strong>${escapeHtml(t('releaseNote'))}:</strong> ${escapeHtml(workspace?.last_release_note || t('na'))}</div>
        <div class="link-grid">
          <a class="inline-link" href="${artifactHref('dist/index.html')}" target="_blank" rel="noreferrer">${escapeHtml(t('openProgramPage'))}</a>
          <a class="inline-link" href="${artifactHref('dist/print.html')}" target="_blank" rel="noreferrer">${escapeHtml(t('openPrintView'))}</a>
          <a class="inline-link" href="${artifactHref('dist/share.html')}" target="_blank" rel="noreferrer">${escapeHtml(t('openShareView'))}</a>
          ${bundle ? `<a class="inline-link" href="${artifactHref(workspace.latest_release_bundle || 'reports/releases/current-release-bundle.json')}" target="_blank" rel="noreferrer">${escapeHtml(t('openReleaseBundle'))}</a>` : ''}
          ${deliveryManifest ? `<a class="inline-link" href="${artifactHref(deliveryManifest)}" target="_blank" rel="noreferrer">${escapeHtml(t('openManifest'))}</a>` : ''}
        </div>
      </div>
    `;

  elements.releasePanel.innerHTML = `
    <div class="stack">
      <div><strong>${escapeHtml(t('releaseReadiness'))}</strong></div>
      <div class="muted">${escapeHtml(t('releaseReadinessHelp'))}</div>
      ${flowStepsHtml}
      ${candidateHtml}
      ${decisionHtml}
      ${checksHtml}
      ${preflightHtml}
      ${publishOutcomeHtml}
      ${currentReleaseHtml}
    </div>
  `;
}

function renderHandoffPanel() {
  const workspace = state.activeWorkspace;
  const delivery = state.deliveryCenter;
  const current = delivery?.current;
  const releaseSpecific = delivery?.release_specific;
  if (!current && !releaseSpecific && !workspace?.latest_delivery_manifest && !workspace?.latest_handoff_notes) {
    elements.handoffPanel.innerHTML = `<div class="empty-state">${escapeHtml(t('noDeliveryPackage'))}</div>`;
    return;
  }

  const currentFilesHtml = current?.included_delivery_files?.length
    ? `
      <div class="issue-group">
        <strong>${escapeHtml(t('includedFiles'))}</strong>
        <ul>
          ${current.included_delivery_files.map((file) => `<li>${escapeHtml(file.label)} <span class="muted">(${escapeHtml(file.category || t('na'))})</span> - <code>${escapeHtml(file.path || t('na'))}</code></li>`).join('')}
        </ul>
      </div>
    `
    : '';

  const currentPackageHtml = current
    ? `
      <article class="history-card">
        <h4>${escapeHtml(t('currentDeliveryPackage'))}</h4>
        <div><strong>${escapeHtml(t('releaseId'))}:</strong> ${escapeHtml(current.release_id || t('none'))}</div>
        <div><strong>${escapeHtml(t('latestPackage'))}:</strong> ${escapeHtml(current.latest_indicator || t('na'))}</div>
        <div><strong>${escapeHtml(t('publishedAt'))}:</strong> ${escapeHtml(current.published_at || t('na'))}</div>
        <div class="link-grid">
          <a class="inline-link" href="${artifactHref('dist/index.html')}" target="_blank" rel="noreferrer">${escapeHtml(t('openProgramPage'))}</a>
          <a class="inline-link" href="${artifactHref('dist/print.html')}" target="_blank" rel="noreferrer">${escapeHtml(t('openPrintView'))}</a>
          <a class="inline-link" href="${artifactHref('dist/share.html')}" target="_blank" rel="noreferrer">${escapeHtml(t('openShareView'))}</a>
          ${current.delivery_manifest_md ? `<a class="inline-link" href="${artifactHref(current.delivery_manifest_md)}" target="_blank" rel="noreferrer">${escapeHtml(t('openCurrentManifest'))}</a>` : ''}
          ${current.release_bundle_json ? `<a class="inline-link" href="${artifactHref(current.release_bundle_json)}" target="_blank" rel="noreferrer">${escapeHtml(t('openCurrentBundle'))}</a>` : ''}
          ${current.share_kit_md ? `<a class="inline-link" href="${artifactHref(current.share_kit_md)}" target="_blank" rel="noreferrer">${escapeHtml(t('openCurrentShareKit'))}</a>` : ''}
          ${current.handoff_notes_md ? `<a class="inline-link" href="${artifactHref(current.handoff_notes_md)}" target="_blank" rel="noreferrer">${escapeHtml(t('openCurrentHandoffNotes'))}</a>` : ''}
          ${current.canonical_paths?.release_package_dir ? `<a class="inline-link" href="${artifactHref(`${current.canonical_paths.release_package_dir}/README.md`)}" target="_blank" rel="noreferrer">${escapeHtml(t('openCurrentPackageReadme'))}</a>` : ''}
          ${current.archive_browser_html ? `<a class="inline-link" href="${artifactHref(current.archive_browser_html)}" target="_blank" rel="noreferrer">${escapeHtml(t('openCurrentArchiveBrowser'))}</a>` : ''}
        </div>
        ${currentFilesHtml}
      </article>
    `
    : `<div class="empty-state">${escapeHtml(t('noDeliveryPackage'))}</div>`;

  const releaseSpecificHtml = releaseSpecific
    ? `
      <article class="history-card">
        <h4>${escapeHtml(t('releaseSpecificPackage'))}</h4>
        <div><strong>${escapeHtml(t('releaseId'))}:</strong> ${escapeHtml(releaseSpecific.release_id || t('none'))}</div>
        <div class="link-grid">
          ${releaseSpecific.release_program_page ? `<a class="inline-link" href="${artifactHref(releaseSpecific.release_program_page)}" target="_blank" rel="noreferrer">${escapeHtml(t('openProgramPage'))}</a>` : ''}
          ${releaseSpecific.release_print_view ? `<a class="inline-link" href="${artifactHref(releaseSpecific.release_print_view)}" target="_blank" rel="noreferrer">${escapeHtml(t('openPrintView'))}</a>` : ''}
          ${releaseSpecific.release_share_landing ? `<a class="inline-link" href="${artifactHref(releaseSpecific.release_share_landing)}" target="_blank" rel="noreferrer">${escapeHtml(t('openShareView'))}</a>` : ''}
          ${releaseSpecific.release_bundle_json ? `<a class="inline-link" href="${artifactHref(releaseSpecific.release_bundle_json)}" target="_blank" rel="noreferrer">${escapeHtml(t('openReleaseBundle'))}</a>` : ''}
          ${releaseSpecific.release_bundle_share_kit ? `<a class="inline-link" href="${artifactHref(releaseSpecific.release_bundle_share_kit)}" target="_blank" rel="noreferrer">${escapeHtml(t('openShareKit'))}</a>` : ''}
          ${releaseSpecific.release_manifest_md ? `<a class="inline-link" href="${artifactHref(releaseSpecific.release_manifest_md)}" target="_blank" rel="noreferrer">${escapeHtml(t('openManifest'))}</a>` : ''}
          ${releaseSpecific.release_handoff_notes ? `<a class="inline-link" href="${artifactHref(releaseSpecific.release_handoff_notes)}" target="_blank" rel="noreferrer">${escapeHtml(t('openHandoffNotes'))}</a>` : ''}
          ${releaseSpecific.release_package_dir ? `<a class="inline-link" href="${artifactHref(`${releaseSpecific.release_package_dir}/README.md`)}" target="_blank" rel="noreferrer">${escapeHtml(t('openReleasePackage'))}</a>` : ''}
        </div>
      </article>
    `
    : `<div class="empty-state">${escapeHtml(t('noReleaseSpecificPackage'))}</div>`;

  elements.handoffPanel.innerHTML = `
    <div class="stack">
      <div class="issue-group">
        <strong>${escapeHtml(t('deliveryUsageSummary'))}</strong>
        <div><strong>${escapeHtml(t('openProgramPage'))}:</strong> ${escapeHtml(t('userProgramHelp'))}</div>
        <div><strong>${escapeHtml(t('openPrintView'))}:</strong> ${escapeHtml(t('userPrintHelp'))}</div>
        <div><strong>${escapeHtml(t('openShareView'))}:</strong> ${escapeHtml(t('userShareHelp'))}</div>
      </div>
      ${currentPackageHtml}
      ${releaseSpecificHtml}
      <article class="history-card">
        <h4>${escapeHtml(t('archiveAccess'))}</h4>
        <div class="link-grid">
          ${delivery?.archive?.archive_browser ? `<a class="inline-link" href="${artifactHref(delivery.archive.archive_browser)}" target="_blank" rel="noreferrer">${escapeHtml(t('openArchiveBrowser'))}</a>` : ''}
          ${delivery?.archive?.archive_index ? `<a class="inline-link" href="${artifactHref(delivery.archive.archive_index)}" target="_blank" rel="noreferrer">${escapeHtml('archive-index.json')}</a>` : ''}
        </div>
      </article>
    </div>
  `;
}

function renderHistoryPanel() {
  const history = state.releaseHistory;
  if (!history) {
    elements.historyPanel.innerHTML = `<div class="empty-state">${escapeHtml(t('historyNotLoaded'))}</div>`;
    return;
  }

  const currentRelease = history.current_release;
  const archived = history.archived_releases || [];
  const currentHtml = currentRelease
    ? `
      <article class="history-card">
        <h4>${escapeHtml(t('currentLinkedRelease'))}</h4>
        <div><strong>${escapeHtml(t('releaseId'))}:</strong> ${escapeHtml(currentRelease.release_id || t('na'))}</div>
        <div><strong>${escapeHtml(t('publishedAt'))}:</strong> ${escapeHtml(currentRelease.published_at || t('na'))}</div>
        <div><strong>${escapeHtml(t('programTitle'))}:</strong> ${escapeHtml(currentRelease.program_title || t('na'))}</div>
        <div class="link-grid">
          ${currentRelease.bundle?.latest_program_html_file ? `<a class="inline-link" href="${artifactHref(currentRelease.bundle.latest_program_html_file)}" target="_blank" rel="noreferrer">${escapeHtml(t('openProgramPage'))}</a>` : ''}
          ${currentRelease.bundle?.latest_print_html_file ? `<a class="inline-link" href="${artifactHref(currentRelease.bundle.latest_print_html_file)}" target="_blank" rel="noreferrer">${escapeHtml(t('openPrintView'))}</a>` : ''}
          ${currentRelease.bundle?.latest_share_html_file ? `<a class="inline-link" href="${artifactHref(currentRelease.bundle.latest_share_html_file)}" target="_blank" rel="noreferrer">${escapeHtml(t('openShareView'))}</a>` : ''}
          ${currentRelease.bundle?.bundle_file ? `<a class="inline-link" href="${artifactHref(currentRelease.bundle.bundle_file)}" target="_blank" rel="noreferrer">${escapeHtml(t('openReleaseBundle'))}</a>` : ''}
          ${currentRelease.bundle?.share_kit_md_file ? `<a class="inline-link" href="${artifactHref(currentRelease.bundle.share_kit_md_file)}" target="_blank" rel="noreferrer">${escapeHtml(t('openShareKit'))}</a>` : ''}
          ${currentRelease.delivery_manifest_md_file ? `<a class="inline-link" href="${artifactHref(currentRelease.delivery_manifest_md_file)}" target="_blank" rel="noreferrer">${escapeHtml(t('openManifest'))}</a>` : ''}
          ${currentRelease.handoff_notes_file ? `<a class="inline-link" href="${artifactHref(currentRelease.handoff_notes_file)}" target="_blank" rel="noreferrer">${escapeHtml(t('openHandoffNotes'))}</a>` : ''}
          ${currentRelease.release_package_dir ? `<a class="inline-link" href="${artifactHref(`${currentRelease.release_package_dir}/README.md`)}" target="_blank" rel="noreferrer">${escapeHtml(t('openReleasePackage'))}</a>` : ''}
          ${history.archive_browser_file ? `<a class="inline-link" href="${artifactHref(history.archive_browser_file)}" target="_blank" rel="noreferrer">${escapeHtml(t('openArchiveBrowser'))}</a>` : ''}
        </div>
      </article>
    `
    : `<div class="empty-state">${escapeHtml(t('noCurrentLinkedRelease'))}</div>`;

  const archivedHtml = archived.length
    ? archived.map((entry) => `
      <article class="history-card">
        <h4>${escapeHtml(entry.program_title || t('na'))}</h4>
        <div><strong>${escapeHtml(t('releaseId'))}:</strong> ${escapeHtml(entry.release_id || t('na'))}</div>
        <div><strong>${escapeHtml(t('archivedAt'))}:</strong> ${escapeHtml(entry.archived_at || t('na'))}</div>
        <div><strong>${escapeHtml(t('sessions'))}:</strong> ${escapeHtml(entry.sessions_count ?? 0)}</div>
        <div class="link-grid">
          ${entry.release_program_file ? `<a class="inline-link" href="${artifactHref(entry.release_program_file)}" target="_blank" rel="noreferrer">${escapeHtml(t('openProgramPage'))}</a>` : ''}
          ${entry.release_print_file ? `<a class="inline-link" href="${artifactHref(entry.release_print_file)}" target="_blank" rel="noreferrer">${escapeHtml(t('openPrintView'))}</a>` : ''}
          ${entry.release_share_file ? `<a class="inline-link" href="${artifactHref(entry.release_share_file)}" target="_blank" rel="noreferrer">${escapeHtml(t('openShareView'))}</a>` : ''}
          ${entry.release_share_kit_file ? `<a class="inline-link" href="${artifactHref(entry.release_share_kit_file)}" target="_blank" rel="noreferrer">${escapeHtml(t('openShareKit'))}</a>` : ''}
          ${entry.release_delivery_manifest_md_file ? `<a class="inline-link" href="${artifactHref(entry.release_delivery_manifest_md_file)}" target="_blank" rel="noreferrer">${escapeHtml(t('openManifest'))}</a>` : ''}
          ${entry.release_handoff_notes_file ? `<a class="inline-link" href="${artifactHref(entry.release_handoff_notes_file)}" target="_blank" rel="noreferrer">${escapeHtml(t('openHandoffNotes'))}</a>` : ''}
          ${entry.release_package_dir ? `<a class="inline-link" href="${artifactHref(`${entry.release_package_dir}/README.md`)}" target="_blank" rel="noreferrer">${escapeHtml(t('openReleasePackage'))}</a>` : ''}
        </div>
      </article>
    `).join('')
    : `<div class="empty-state">${escapeHtml(t('noArchivedReleases'))}</div>`;

  elements.historyPanel.innerHTML = `
    <div class="stack">
      ${currentHtml}
      <div class="panel-head">
        <h4>${escapeHtml(t('archivedReleases'))}</h4>
      </div>
      ${archivedHtml}
    </div>
  `;
}

function renderWorkflowPanel() {
  const workflow = state.workflow;
  if (!workflow) {
    elements.workflowSummary.textContent = t('workflowSummaryEmpty');
    elements.workflowRail.innerHTML = '';
    elements.workflowNextAction.innerHTML = '';
    elements.nextActionButton.disabled = true;
    return;
  }

  elements.workflowSummary.textContent = `${workflow.overall_status === 'complete' ? t('workflowComplete') : t('workflowInProgress')} | ${t('currentStage')}: ${t(`workflowStage_${workflow.current_stage}`) || workflow.current_stage}`;
  elements.workflowRail.innerHTML = (workflow.stages || []).map((stage) => {
    const className = stage.complete
      ? 'workflow-stage complete'
      : workflow.current_stage === stage.key
        ? 'workflow-stage current'
        : 'workflow-stage';

    return `
      <article class="${className}">
        <div class="stage-label">${escapeHtml(stage.key)}</div>
        <div class="stage-value">${escapeHtml(t(`workflowStage_${stage.key}`) || stage.label || stage.key)}</div>
        <div class="muted">${escapeHtml(stage.complete ? t('stageComplete') : (workflow.current_stage === stage.key ? t('stageCurrent') : t('stagePending')))}</div>
        <div class="small-text muted">${escapeHtml(stage.detail || t('na'))}</div>
      </article>
    `;
  }).join('');

  elements.workflowNextAction.innerHTML = workflow.next_action
    ? `
      <div class="issue-group">
        <strong>${escapeHtml(t('nextRecommendedAction'))}</strong>
        <div>${escapeHtml(t(workflow.next_action.label_key || '') || workflow.next_action.label || t('na'))}</div>
        <div class="muted">${escapeHtml(workflow.next_action.detail || t('na'))}</div>
      </div>
    `
    : '';

  elements.nextActionButton.disabled = !workflow.next_action?.tab;
  elements.nextActionButton.dataset.nextTab = workflow.next_action?.tab || '';
}

function renderSessionsEditor(sessions) {
  if (!sessions.length) {
    elements.sessionsEmptyState.classList.remove('hidden');
    elements.sessionsEmptyState.textContent = t('noSessions');
    elements.sessionsEditor.innerHTML = '';
    return;
  }

  elements.sessionsEmptyState.classList.add('hidden');
  elements.sessionsEditor.innerHTML = sessions.map((session, index) => `
    <article class="session-card" data-session-index="${index}">
      <div class="panel-head">
        <div>
          <div class="eyebrow">${escapeHtml(t('session'))} ${index + 1}</div>
          <h4>${escapeHtml(session.session_title || t('untitledSession'))}</h4>
        </div>
        <div class="actions compact-actions">
          <button class="secondary session-duplicate-button" type="button" data-duplicate-session="${index}">${escapeHtml(t('duplicate'))}</button>
          <button class="secondary session-remove-button" type="button" data-remove-session="${index}">${escapeHtml(t('remove'))}</button>
        </div>
      </div>
      <div class="grid-form">
        <label><span>${escapeHtml(t('id'))}</span><input data-session-field="id" data-session-index="${index}" value="${escapeHtml(session.id || '')}" /></label>
        <label><span>${escapeHtml(t('source'))}</span><input data-session-field="source" data-session-index="${index}" value="${escapeHtml(session.source || '')}" /></label>
        <label><span>${escapeHtml(t('dayLabel'))}</span><input data-session-field="day_label" data-session-index="${index}" value="${escapeHtml(session.day_label || '')}" /></label>
        <label class="field-span-full"><span>${escapeHtml(t('sessionTitle'))}</span><input data-session-field="session_title" data-session-index="${index}" value="${escapeHtml(session.session_title || '')}" /></label>
        <label><span>${escapeHtml(t('sessionType'))}</span><select data-session-field="session_type" data-session-index="${index}">${SESSION_TYPE_OPTIONS.map((option) => `<option value="${option}" ${session.session_type === option ? 'selected' : ''}>${escapeHtml(translateEnum('sessionType', option))}</option>`).join('')}</select></label>
        <label><span>${escapeHtml(t('track'))}</span><input data-session-field="track" data-session-index="${index}" value="${escapeHtml(session.track || '')}" /></label>
        <label><span>${escapeHtml(t('speaker'))}</span><input data-session-field="speaker" data-session-index="${index}" value="${escapeHtml(session.speaker || '')}" /></label>
        <label><span>${escapeHtml(t('moderator'))}</span><input data-session-field="moderator" data-session-index="${index}" value="${escapeHtml(session.moderator || '')}" /></label>
        <label><span>${escapeHtml(t('startAt'))}</span><input data-session-field="start_at" data-session-index="${index}" value="${escapeHtml(session.start_at || '')}" placeholder="2026-05-11T08:30:00+03:00" /></label>
        <label><span>${escapeHtml(t('endAt'))}</span><input data-session-field="end_at" data-session-index="${index}" value="${escapeHtml(session.end_at || '')}" placeholder="2026-05-11T09:30:00+03:00" /></label>
        <label><span>${escapeHtml(t('room'))}</span><input data-session-field="room" data-session-index="${index}" value="${escapeHtml(session.room || '')}" /></label>
        <label><span>${escapeHtml(t('status'))}</span><select data-session-field="status" data-session-index="${index}">${SESSION_STATUS_OPTIONS.map((option) => `<option value="${option}" ${session.status === option ? 'selected' : ''}>${escapeHtml(translateEnum('sessionStatus', option))}</option>`).join('')}</select></label>
        <label><span>${escapeHtml(t('language'))}</span><select data-session-field="language" data-session-index="${index}">${LANGUAGE_OPTIONS.map((option) => `<option value="${option}" ${session.language === option ? 'selected' : ''}>${escapeHtml(translateEnum('language', option))}</option>`).join('')}</select></label>
        <label><span>${escapeHtml(t('audience'))}</span><input data-session-field="audience" data-session-index="${index}" value="${escapeHtml(session.audience || '')}" /></label>
        <label><span>${escapeHtml(t('updatedAt'))}</span><input data-session-field="updated_at" data-session-index="${index}" value="${escapeHtml(session.updated_at || '')}" placeholder="2026-03-09T20:00:00+03:00" /></label>
        <label class="field-span-full"><span>${escapeHtml(t('tagsCommaSeparated'))}</span><input data-session-field="tags" data-session-index="${index}" value="${escapeHtml(Array.isArray(session.tags) ? session.tags.join(', ') : '')}" /></label>
      </div>
    </article>
  `).join('');
}

function renderWorkspaceView() {
  if (!state.activeWorkspace || !state.activeDraft) {
    elements.workspaceEmptyState.classList.remove('hidden');
    elements.workspaceView.classList.add('hidden');
    return;
  }

  const workspace = state.activeWorkspace;
  const program = state.activeDraft.program || {};
  const sessions = Array.isArray(state.activeDraft.sessions) ? state.activeDraft.sessions : [];

  elements.workspaceEmptyState.classList.add('hidden');
  elements.workspaceView.classList.remove('hidden');

  elements.workspaceTitle.textContent = workspace.program_title || workspace.workspace_id;
  elements.workspaceMeta.textContent = [
    workspace.organizer_name || t('na'),
    workspace.workspace_id,
    program.event_start && program.event_end ? `${program.event_start} -> ${program.event_end}` : null
  ].filter(Boolean).join(' | ');
  elements.workspaceStatusValue.textContent = translateWorkspaceStatus(workspace.status);
  elements.workspaceValidationValue.textContent = translateValidationStatus(workspace.last_validation_status);
  elements.workspacePreviewValue.textContent = translatePreviewStatus(workspace.preview_ready);
  elements.workspaceSessionsValue.textContent = String(sessions.length);
  elements.intakeSourceLabelInput.value = workspace.last_intake_source || '';
  elements.intakeCsvTextarea.value = state.intakeBuffer || '';
  elements.intakeFileInput.value = '';

  document.getElementById('draftProgramTitle').value = program.program_title || '';
  document.getElementById('draftOrganizerName').value = program.organizer_name || '';
  document.getElementById('draftOrganizerDisplayName').value = program.organizer_display_name || '';
  document.getElementById('draftLogoText').value = program.logo_text || '';
  document.getElementById('draftPrimaryLabel').value = program.primary_label || '';
  document.getElementById('draftSupportContact').value = program.support_contact || '';
  document.getElementById('draftCity').value = program.city || '';
  document.getElementById('draftVenue').value = program.venue || '';
  document.getElementById('draftEventStart').value = program.event_start || '';
  document.getElementById('draftEventEnd').value = program.event_end || '';
  document.getElementById('draftUpdatedAt').value = program.updated_at || '';
  document.getElementById('draftFooterNote').value = program.footer_note || '';
  elements.approvalNoteInput.value = workspace.approval_note || '';
  elements.releaseNoteInput.value = workspace.last_release_note || '';

  elements.workspacePaths.innerHTML = [
    `<div><strong>${escapeHtml(t('workspace'))}:</strong> ${escapeHtml(workspace.workspace_id)}</div>`,
    `<div><strong>${escapeHtml(t('draftFile'))}:</strong> ${escapeHtml(workspace.draft_file)}</div>`,
    `<div><strong>${escapeHtml(t('approvedDraftFile'))}:</strong> ${escapeHtml(workspace.approved_draft_file || t('none'))}</div>`,
    `<div><strong>${escapeHtml(t('currentRelease'))}:</strong> ${escapeHtml(workspace.current_release_id || t('none'))}</div>`,
    `<div><strong>${escapeHtml(t('lastValidation'))}:</strong> ${escapeHtml(formatDateTime(workspace.last_validation_at))}</div>`,
    `<div><strong>${escapeHtml(t('lastPreview'))}:</strong> ${escapeHtml(formatDateTime(workspace.last_preview_at))}</div>`,
    `<div><strong>${escapeHtml(t('lastDiff'))}:</strong> ${escapeHtml(formatDateTime(workspace.last_diff_at))}</div>`,
    `<div><strong>${escapeHtml(t('approvedAt'))}:</strong> ${escapeHtml(formatDateTime(workspace.approved_at))}</div>`,
    `<div><strong>${escapeHtml(t('normalizedAt'))}:</strong> ${escapeHtml(formatDateTime(workspace.last_normalized_at))}</div>`,
    `<div><strong>${escapeHtml(t('sourceLabel'))}:</strong> ${escapeHtml(workspace.last_intake_source || t('none'))}</div>`,
    `<div><strong>${escapeHtml(t('intakeSourceKind'))}:</strong> ${escapeHtml(translateSourceKind(workspace.intake_source_kind))}</div>`,
    `<div><strong>${escapeHtml(t('intakeOriginalFilename'))}:</strong> ${escapeHtml(workspace.intake_original_filename || t('none'))}</div>`,
    `<div><strong>${escapeHtml(t('programTitle'))}:</strong> ${escapeHtml(program.program_title || t('na'))}</div>`,
    `<div><strong>${escapeHtml(t('eventWindow'))}:</strong> ${escapeHtml(program.event_start || t('na'))} -> ${escapeHtml(program.event_end || t('na'))}</div>`
  ].join('');

  renderSessionsEditor(sessions);
  renderWorkflowPanel();
  renderIntakePanel();
  renderValidationPanel();
  renderPreviewPanel();
  renderDiffPanel();
  renderReleasePanel();
  renderHistoryPanel();
  renderHandoffPanel();
}

async function loadReleaseHistory() {
  if (!state.activeWorkspaceId) {
    state.releaseHistory = null;
    renderHistoryPanel();
    return;
  }

  const result = await api(`/api/workspaces/${encodeURIComponent(state.activeWorkspaceId)}/releases`);
  state.releaseHistory = result.history || null;
  renderHistoryPanel();
}

async function loadReleaseReadiness() {
  if (!state.activeWorkspaceId) {
    state.releaseReadiness = null;
    renderReleasePanel();
    updateButtonStates();
    return;
  }

  const result = await api(`/api/workspaces/${encodeURIComponent(state.activeWorkspaceId)}/readiness`);
  state.releaseReadiness = result.readiness || null;
  renderReleasePanel();
  updateButtonStates();
}

async function loadReleaseDecision() {
  if (!state.activeWorkspaceId) {
    state.releaseDecision = null;
    renderDiffPanel();
    renderReleasePanel();
    return;
  }

  const result = await api(`/api/workspaces/${encodeURIComponent(state.activeWorkspaceId)}/decision`);
  state.releaseDecision = result.decision || null;
  renderDiffPanel();
  renderReleasePanel();
}

async function loadDeliveryCenter() {
  if (!state.activeWorkspaceId) {
    state.deliveryCenter = null;
    renderHandoffPanel();
    return;
  }

  const result = await api(`/api/workspaces/${encodeURIComponent(state.activeWorkspaceId)}/delivery`);
  state.deliveryCenter = result.delivery || null;
  renderHandoffPanel();
}

async function loadWorkflow() {
  if (!state.activeWorkspaceId) {
    state.workflow = null;
    renderWorkflowPanel();
    return;
  }

  const result = await api(`/api/workspaces/${encodeURIComponent(state.activeWorkspaceId)}/workflow`);
  state.workflow = result.workflow || null;
  renderWorkflowPanel();
}

async function loadWorkspaces() {
  const result = await api('/api/workspaces');
  state.workspaces = result.workspaces || [];
  renderWorkspaces();
}

async function loadIntakePresets() {
  if (state.intakePresets) return;
  const result = await api('/api/intake/presets');
  state.intakePresets = result;
}

function collectSessionDrafts() {
  const sessionMap = new Map();
  document.querySelectorAll('[data-session-field]').forEach((input) => {
    const index = Number(input.dataset.sessionIndex);
    const field = input.dataset.sessionField;
    const session = sessionMap.get(index) || {};
    const rawValue = input.value ?? '';
    session[field] = field === 'tags'
      ? rawValue.split(',').map((item) => item.trim()).filter(Boolean)
      : rawValue.trim();
    sessionMap.set(index, session);
  });

  return Array.from(sessionMap.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([, session]) => session)
    .sort((a, b) => String(a.start_at || '').localeCompare(String(b.start_at || '')));
}

function collectDraftFromForm() {
  const nextDraft = structuredClone(state.activeDraft);
  nextDraft.program = nextDraft.program || {};
  nextDraft.program.program_title = document.getElementById('draftProgramTitle').value.trim();
  nextDraft.program.organizer_name = document.getElementById('draftOrganizerName').value.trim();
  nextDraft.program.organizer_display_name = document.getElementById('draftOrganizerDisplayName').value.trim();
  nextDraft.program.logo_text = document.getElementById('draftLogoText').value.trim();
  nextDraft.program.primary_label = document.getElementById('draftPrimaryLabel').value.trim();
  nextDraft.program.support_contact = document.getElementById('draftSupportContact').value.trim();
  nextDraft.program.city = document.getElementById('draftCity').value.trim();
  nextDraft.program.venue = document.getElementById('draftVenue').value.trim();
  nextDraft.program.event_start = document.getElementById('draftEventStart').value.trim();
  nextDraft.program.event_end = document.getElementById('draftEventEnd').value.trim();
  nextDraft.program.updated_at = document.getElementById('draftUpdatedAt').value.trim();
  nextDraft.program.footer_note = document.getElementById('draftFooterNote').value.trim();
  nextDraft.sessions = collectSessionDrafts();
  return nextDraft;
}

function syncDraftFromForm() {
  if (!state.activeDraft) return;
  state.activeDraft = collectDraftFromForm();
}

async function openWorkspaceView(workspaceId, tab = state.activeTab) {
  const result = await api(`/api/workspaces/${encodeURIComponent(workspaceId)}`);
  state.activeWorkspaceId = workspaceId;
  state.activeTab = normalizeTab(tab);
  state.activeWorkspace = result.workspace;
  state.activeDraft = result.draft;
  state.validationResult = null;
  state.previewResult = null;
  state.diffResult = null;
  state.releaseResult = null;
  state.archiveResult = null;
  state.releaseHistory = null;
  state.releaseReadiness = null;
  state.releaseDecision = null;
  state.deliveryCenter = null;
  state.workflow = null;
  state.intakeResult = null;
  state.intakeReview = result.intake_review || null;
  state.intakeReviewStale = false;
  state.intakeBuffer = result.intake?.csv_text || '';
  state.intakeSourceMeta = result.intake?.meta || null;
  window.location.hash = buildWorkspaceHash(workspaceId, state.activeTab);
  renderWorkspaces();
  renderWorkspaceView();
  renderActiveTab();
  await loadReleaseHistory();
  await loadReleaseReadiness();
  await loadReleaseDecision();
  await loadDeliveryCenter();
  await loadWorkflow();
  setDirty(false);
  updateButtonStates();
}

async function saveActiveDraft() {
  if (!state.activeWorkspaceId || !state.activeDraft) return;
  setBusyFlag('saving', true);
  try {
    const nextDraft = collectDraftFromForm();
    const result = await api(`/api/workspaces/${encodeURIComponent(state.activeWorkspaceId)}/draft`, {
      method: 'PUT',
      body: JSON.stringify({ draft: nextDraft })
    });
    state.activeWorkspace = result.workspace;
    state.activeDraft = result.draft;
    state.validationResult = null;
    state.previewResult = null;
    state.diffResult = null;
    state.releaseReadiness = null;
    state.releaseDecision = null;
    state.deliveryCenter = null;
    state.workflow = null;
    state.intakeResult = null;
    state.intakeReview = null;
    state.intakeReviewStale = false;
    state.intakeBuffer = '';
    await loadWorkspaces();
    renderWorkspaceView();
    await loadReleaseReadiness();
    await loadReleaseDecision();
    await loadDeliveryCenter();
    await loadWorkflow();
    setDirty(false);
    showToast(t('draftSaved'));
  } finally {
    setBusyFlag('saving', false);
  }
}

async function analyzeActiveIntake() {
  if (!state.activeWorkspaceId) return;
  setBusyFlag('analyzingIntake', true);
  try {
    const result = await api(`/api/workspaces/${encodeURIComponent(state.activeWorkspaceId)}/intake-review`, {
      method: 'POST',
      body: JSON.stringify({
        csvText: elements.intakeCsvTextarea.value,
        sourceLabel: elements.intakeSourceLabelInput.value.trim(),
        sourceKind: state.intakeSourceMeta?.source_kind || 'manual',
        originalFilename: state.intakeSourceMeta?.original_filename || ''
      })
    });
    state.activeWorkspace = result.workspace || state.activeWorkspace;
    state.intakeReview = result.review;
    state.intakeSourceMeta = {
      source_label: result.review?.source_label || elements.intakeSourceLabelInput.value.trim(),
      source_kind: result.review?.source_kind || state.intakeSourceMeta?.source_kind || 'manual',
      original_filename: result.review?.original_filename || state.intakeSourceMeta?.original_filename || ''
    };
    state.intakeReviewStale = false;
    await loadWorkspaces();
    renderIntakePanel();
    updateButtonStates();
    showToast(t('intakeAnalyzed'));
  } finally {
    setBusyFlag('analyzingIntake', false);
  }
}

async function normalizeActiveWorkspace() {
  if (!state.activeWorkspaceId) return;
  if (!state.intakeReview || state.intakeReviewStale || !state.intakeReview.can_normalize) {
    throw new Error(t('normalizeBlocked'));
  }
  setBusyFlag('normalizing', true);
  try {
    await loadIntakePresets();
    const result = await api(`/api/workspaces/${encodeURIComponent(state.activeWorkspaceId)}/normalize`, {
      method: 'POST',
      body: JSON.stringify({
        csvText: elements.intakeCsvTextarea.value,
        sourceLabel: elements.intakeSourceLabelInput.value.trim(),
        reviewedRows: state.intakeReview?.rows || null,
        sourceKind: state.intakeSourceMeta?.source_kind || 'manual',
        originalFilename: state.intakeSourceMeta?.original_filename || ''
      })
    });
    state.activeWorkspace = result.workspace;
    state.activeDraft = result.draft;
    state.intakeResult = result.normalize;
    state.validationResult = null;
    state.previewResult = null;
    state.diffResult = null;
    state.intakeBuffer = elements.intakeCsvTextarea.value;
    state.intakeSourceMeta = {
      source_label: result.workspace.last_intake_source || '',
      source_kind: result.workspace.intake_source_kind || 'manual',
      original_filename: result.workspace.intake_original_filename || ''
    };
    state.intakeReviewStale = false;
    await loadWorkspaces();
    renderWorkspaceView();
    await loadReleaseReadiness();
    await loadReleaseDecision();
    await loadDeliveryCenter();
    await loadWorkflow();
    updateButtonStates();
    setActiveTab('editor');
    setDirty(false);
    showToast(t('normalizationCompleted'));
  } finally {
    setBusyFlag('normalizing', false);
  }
}

async function validateActiveDraft() {
  if (!state.activeWorkspaceId || !state.activeDraft) return;
  setBusyFlag('validating', true);
  try {
    if (state.dirty) await saveActiveDraft();
    const result = await api(`/api/workspaces/${encodeURIComponent(state.activeWorkspaceId)}/validate`, {
      method: 'POST',
      body: JSON.stringify({})
    });
    state.activeWorkspace = result.workspace;
    state.validationResult = result.validation;
    state.previewResult = null;
    await loadWorkspaces();
    renderWorkspaceView();
    await loadReleaseReadiness();
    await loadReleaseDecision();
    await loadDeliveryCenter();
    await loadWorkflow();
    showToast(result.ok ? t('validationPassed') : t('validationFailed'), result.ok ? 'info' : 'error');
  } finally {
    setBusyFlag('validating', false);
  }
}

async function previewActiveDraft() {
  if (!state.activeWorkspaceId || !state.activeDraft) return;
  setBusyFlag('previewing', true);
  try {
    if (state.dirty) await saveActiveDraft();
    const result = await api(`/api/workspaces/${encodeURIComponent(state.activeWorkspaceId)}/preview`, {
      method: 'POST',
      body: JSON.stringify({})
    });
    state.activeWorkspace = result.workspace;
    state.previewResult = result.preview;
    await loadWorkspaces();
    renderWorkspaceView();
    await loadReleaseReadiness();
    await loadReleaseDecision();
    await loadDeliveryCenter();
    await loadWorkflow();
    showToast(t('previewGenerated'));
  } finally {
    setBusyFlag('previewing', false);
  }
}

async function diffActiveDraft() {
  if (!state.activeWorkspaceId || !state.activeDraft) return;
  setBusyFlag('diffing', true);
  try {
    if (state.dirty) await saveActiveDraft();
    const result = await api(`/api/workspaces/${encodeURIComponent(state.activeWorkspaceId)}/diff`, {
      method: 'POST',
      body: JSON.stringify({})
    });
    state.activeWorkspace = result.workspace;
    state.diffResult = result.diff;
    await loadWorkspaces();
    renderWorkspaceView();
    await loadReleaseReadiness();
    await loadReleaseDecision();
    await loadDeliveryCenter();
    await loadWorkflow();
    showToast(t('runDiff'));
  } finally {
    setBusyFlag('diffing', false);
  }
}

async function approveActiveDraft() {
  if (!state.activeWorkspaceId || !state.activeDraft) return;
  const decision = state.releaseDecision;
  if (!buildActionConfirmation(t('approveConfirm'), [
    decision?.candidate?.program_title || state.activeWorkspace?.program_title || '',
    `${t('sessions')}: ${decision?.candidate?.sessions_count ?? state.activeDraft?.sessions?.length ?? 0}`,
    decision?.recommendation?.detail || ''
  ])) return;
  setBusyFlag('approving', true);
  try {
    if (state.dirty) await saveActiveDraft();
    const result = await api(`/api/workspaces/${encodeURIComponent(state.activeWorkspaceId)}/approve`, {
      method: 'POST',
      body: JSON.stringify({ approvalNote: elements.approvalNoteInput.value.trim() })
    });
    state.activeWorkspace = result.workspace;
    await loadWorkspaces();
    renderWorkspaceView();
    await loadReleaseReadiness();
    await loadReleaseDecision();
    await loadDeliveryCenter();
    await loadWorkflow();
    showToast(t('approvalRecorded'));
  } finally {
    setBusyFlag('approving', false);
  }
}

async function publishActiveWorkspace() {
  if (!state.activeWorkspaceId || !state.activeDraft) return;
  const decision = state.releaseDecision;
  if (!buildActionConfirmation(t('publishConfirm'), [
    decision?.replacement?.will_replace_current ? t('willReplaceCurrent') : t('firstReleasePublish'),
    `${t('releaseId')}: ${decision?.current_release?.release_id || t('none')}`,
    `${t('sessions')}: ${decision?.candidate?.sessions_count ?? state.activeDraft?.sessions?.length ?? 0}`,
    elements.releaseNoteInput.value.trim() ? `${t('releaseNote')}: ${elements.releaseNoteInput.value.trim()}` : ''
  ])) return;
  setBusyFlag('publishing', true);
  try {
    if (state.dirty) await saveActiveDraft();
    const result = await api(`/api/workspaces/${encodeURIComponent(state.activeWorkspaceId)}/publish`, {
      method: 'POST',
      body: JSON.stringify({ releaseNote: elements.releaseNoteInput.value.trim() })
    });
    state.activeWorkspace = result.workspace;
    state.releaseResult = result.release;
    await loadWorkspaces();
    await loadReleaseHistory();
    renderWorkspaceView();
    await loadReleaseReadiness();
    await loadReleaseDecision();
    await loadDeliveryCenter();
    await loadWorkflow();
    setActiveTab('handoff');
    showToast(t('publishCompleted'));
  } finally {
    setBusyFlag('publishing', false);
  }
}

async function archiveActiveWorkspace() {
  if (!state.activeWorkspaceId) return;
  const decision = state.releaseDecision;
  if (!buildActionConfirmation(t('archiveConfirm'), [
    `${t('releaseId')}: ${decision?.current_release?.release_id || state.activeWorkspace?.current_release_id || t('none')}`,
    decision?.current_release?.program_title || state.activeWorkspace?.program_title || ''
  ])) return;
  setBusyFlag('archiving', true);
  try {
    const result = await api(`/api/workspaces/${encodeURIComponent(state.activeWorkspaceId)}/archive`, {
      method: 'POST',
      body: JSON.stringify({})
    });
    state.activeWorkspace = result.workspace;
    state.archiveResult = result.archive;
    await loadWorkspaces();
    await loadReleaseHistory();
    renderWorkspaceView();
    await loadReleaseReadiness();
    await loadReleaseDecision();
    await loadDeliveryCenter();
    await loadWorkflow();
    showToast(t('archiveCompleted'));
  } finally {
    setBusyFlag('archiving', false);
  }
}

function createEmptySession() {
  return {
    id: '',
    source: 'operator-console',
    day_label: '',
    session_title: '',
    session_type: 'talk',
    track: '',
    speaker: '',
    moderator: '',
    start_at: '',
    end_at: '',
    room: '',
    status: 'scheduled',
    language: 'ar',
    audience: '',
    tags: [],
    updated_at: state.activeDraft?.program?.updated_at || ''
  };
}

function addSession() {
  if (!state.activeDraft) return;
  syncDraftFromForm();
  state.activeDraft.sessions = Array.isArray(state.activeDraft.sessions) ? state.activeDraft.sessions : [];
  state.activeDraft.sessions.push(createEmptySession());
  renderWorkspaceView();
  setDirty(true);
}

function removeSession(index) {
  if (!state.activeDraft) return;
  syncDraftFromForm();
  state.activeDraft.sessions = (state.activeDraft.sessions || []).filter((_, currentIndex) => currentIndex !== index);
  renderWorkspaceView();
  setDirty(true);
}

function duplicateSession(index) {
  if (!state.activeDraft) return;
  syncDraftFromForm();
  const sourceSession = state.activeDraft.sessions?.[index];
  if (!sourceSession) return;
  const copy = structuredClone(sourceSession);
  copy.id = copy.id ? `${copy.id}-copy` : '';
  state.activeDraft.sessions.splice(index + 1, 0, copy);
  renderWorkspaceView();
  setDirty(true);
}

function bindEvents() {
  elements.languageEnButton.addEventListener('click', () => setLanguage('en'));
  elements.languageArButton.addEventListener('click', () => setLanguage('ar'));
  elements.workspaceTabButtons.forEach((button) => {
    button.addEventListener('click', () => setActiveTab(button.dataset.workspaceTabButton));
  });

  elements.createWorkspaceForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      const form = new FormData(elements.createWorkspaceForm);
      const payload = {
        programTitle: form.get('programTitle'),
        organizerName: form.get('organizerName'),
        workspaceId: form.get('workspaceId') || undefined
      };
      const result = await api('/api/workspaces', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      elements.createWorkspaceForm.reset();
      await loadWorkspaces();
      await openWorkspaceView(result.workspace.workspace_id, 'editor');
      showToast(t('workspaceCreated'));
    } catch (error) {
      showToast(error.message, 'error');
    }
  });

  elements.refreshWorkspacesButton.addEventListener('click', async () => {
    try {
      await loadWorkspaces();
      showToast(t('workspaceListRefreshed'));
    } catch (error) {
      showToast(error.message, 'error');
    }
  });

  elements.reloadWorkspaceButton.addEventListener('click', async () => {
    if (!state.activeWorkspaceId || !confirmDiscardChanges()) return;
    try {
      await openWorkspaceView(state.activeWorkspaceId);
      showToast(t('workspaceReloaded'));
    } catch (error) {
      showToast(error.message, 'error');
    }
  });

  elements.saveDraftButton.addEventListener('click', async () => {
    try { await saveActiveDraft(); } catch (error) { showToast(error.message, 'error'); }
  });
  elements.validateDraftButton.addEventListener('click', async () => {
    try { await validateActiveDraft(); } catch (error) { showToast(error.message, 'error'); }
  });
  elements.previewDraftButton.addEventListener('click', async () => {
    try { await previewActiveDraft(); } catch (error) { showToast(error.message, 'error'); }
  });
  elements.diffDraftButton.addEventListener('click', async () => {
    try { await diffActiveDraft(); } catch (error) { showToast(error.message, 'error'); }
  });
  elements.approveDraftButton.addEventListener('click', async () => {
    try { await approveActiveDraft(); } catch (error) { showToast(error.message, 'error'); }
  });
  elements.publishWorkspaceButton.addEventListener('click', async () => {
    try { await publishActiveWorkspace(); } catch (error) { showToast(error.message, 'error'); }
  });
  elements.archiveWorkspaceButton.addEventListener('click', async () => {
    try { await archiveActiveWorkspace(); } catch (error) { showToast(error.message, 'error'); }
  });
  elements.loadTemplatePresetButton.addEventListener('click', async () => {
    try {
      await loadIntakePresets();
      elements.intakeCsvTextarea.value = getPresetContent('template');
      state.intakeBuffer = elements.intakeCsvTextarea.value;
      state.intakeReview = null;
      state.intakeReviewStale = false;
      state.intakeSourceMeta = { source_kind: 'preset', original_filename: '', source_label: 'template' };
      elements.intakeSourceLabelInput.value = 'template';
      setDirty(true);
      renderIntakePanel();
      updateButtonStates();
    } catch (error) {
      showToast(error.message, 'error');
    }
  });
  elements.loadBaselinePresetButton.addEventListener('click', async () => {
    try {
      await loadIntakePresets();
      elements.intakeCsvTextarea.value = getPresetContent('baseline');
      state.intakeBuffer = elements.intakeCsvTextarea.value;
      state.intakeReview = null;
      state.intakeReviewStale = false;
      state.intakeSourceMeta = { source_kind: 'preset', original_filename: '', source_label: 'baseline-example' };
      elements.intakeSourceLabelInput.value = 'baseline-example';
      setDirty(true);
      renderIntakePanel();
      updateButtonStates();
    } catch (error) {
      showToast(error.message, 'error');
    }
  });
  elements.loadUpdatedPresetButton.addEventListener('click', async () => {
    try {
      await loadIntakePresets();
      elements.intakeCsvTextarea.value = getPresetContent('updated');
      state.intakeBuffer = elements.intakeCsvTextarea.value;
      state.intakeReview = null;
      state.intakeReviewStale = false;
      state.intakeSourceMeta = { source_kind: 'preset', original_filename: '', source_label: 'updated-example' };
      elements.intakeSourceLabelInput.value = 'updated-example';
      setDirty(true);
      renderIntakePanel();
      updateButtonStates();
    } catch (error) {
      showToast(error.message, 'error');
    }
  });
  elements.normalizeWorkspaceButton.addEventListener('click', async () => {
    try { await normalizeActiveWorkspace(); } catch (error) { showToast(error.message, 'error'); }
  });
  elements.analyzeIntakeButton.addEventListener('click', async () => {
    try { await analyzeActiveIntake(); } catch (error) { showToast(error.message, 'error'); }
  });
  elements.refreshHistoryButton.addEventListener('click', async () => {
    try {
      await loadReleaseHistory();
      showToast(t('refreshHistory'));
    } catch (error) {
      showToast(error.message, 'error');
    }
  });
  elements.goToHandoffHistoryButton.addEventListener('click', () => setActiveTab('history'));
  elements.nextActionButton.addEventListener('click', () => {
    const nextTab = elements.nextActionButton.dataset.nextTab;
    if (!nextTab) return;
    setActiveTab(nextTab);
  });
  elements.addSessionButton.addEventListener('click', () => addSession());

  document.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    if (target.dataset.removeSession !== undefined) removeSession(Number(target.dataset.removeSession));
    if (target.dataset.duplicateSession !== undefined) duplicateSession(Number(target.dataset.duplicateSession));
  });

  document.addEventListener('input', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    if (target.dataset.intakeRow === undefined || target.dataset.intakeColumn === undefined) return;
    if (!state.intakeReview?.rows) return;

    const rowIndex = Number(target.dataset.intakeRow);
    const column = target.dataset.intakeColumn;
    const nextRows = state.intakeReview.rows.map((row, index) => (
      index === rowIndex ? { ...row, [column]: target.value } : row
    ));

    state.intakeReview = {
      ...state.intakeReview,
      rows: nextRows
    };
    state.intakeReviewStale = true;
    state.intakeBuffer = serializeIntakeRows(state.intakeReview.export_headers || state.intakeReview.headers || [], nextRows);
    elements.intakeCsvTextarea.value = state.intakeBuffer;
    setDirty(true);
    renderIntakePanel();
    updateButtonStates();
  });

  elements.workspaceDraftForm.addEventListener('input', () => setDirty(true));
  elements.sessionsEditor.addEventListener('input', () => setDirty(true));
  elements.sessionsEditor.addEventListener('change', () => setDirty(true));
  elements.intakeCsvTextarea.addEventListener('input', () => {
    state.intakeBuffer = elements.intakeCsvTextarea.value;
    state.intakeReview = null;
    state.intakeReviewStale = false;
    state.intakeSourceMeta = {
      source_label: elements.intakeSourceLabelInput.value.trim(),
      source_kind: state.intakeSourceMeta?.source_kind || 'manual',
      original_filename: state.intakeSourceMeta?.original_filename || ''
    };
    setDirty(true);
    renderIntakePanel();
    updateButtonStates();
  });
  elements.intakeFileInput.addEventListener('change', async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    showToast(t('importingFile'));
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let index = 0; index < bytes.length; index += 1) {
      binary += String.fromCharCode(bytes[index]);
    }
    const contentBase64 = btoa(binary);
    const result = await api(`/api/workspaces/${encodeURIComponent(state.activeWorkspaceId)}/import-file`, {
      method: 'POST',
      body: JSON.stringify({
        filename: file.name,
        mimeType: file.type || '',
        contentBase64
      })
    });
    state.activeWorkspace = result.workspace || state.activeWorkspace;
    state.intakeSourceMeta = {
      source_label: result.intake_import?.source_label || file.name.replace(/\.[^.]+$/i, ''),
      source_kind: result.intake_import?.source_kind || 'uploaded_file',
      original_filename: file.name
    };

    if (result.intake_import?.csv_text) {
      elements.intakeCsvTextarea.value = result.intake_import.csv_text;
      state.intakeBuffer = result.intake_import.csv_text;
      state.intakeReview = null;
      state.intakeReviewStale = false;
      elements.intakeSourceLabelInput.value = state.intakeSourceMeta.source_label;
      await analyzeActiveIntake();
      showToast(t('attachmentImported'));
    } else {
      state.intakeBuffer = '';
      state.intakeReview = null;
      state.intakeReviewStale = false;
      renderWorkspaceView();
      updateButtonStates();
      showToast(result.intake_import?.message || t('attachmentStoredOnly'));
    }
  });
  elements.intakeSourceLabelInput.addEventListener('input', () => {
    state.intakeSourceMeta = {
      source_label: elements.intakeSourceLabelInput.value.trim(),
      source_kind: state.intakeSourceMeta?.source_kind || 'manual',
      original_filename: state.intakeSourceMeta?.original_filename || ''
    };
    setDirty(true);
    renderIntakePanel();
  });
  elements.approvalNoteInput.addEventListener('input', () => setDirty(true));
  elements.releaseNoteInput.addEventListener('input', () => setDirty(true));

  window.addEventListener('beforeunload', (event) => {
    if (!state.dirty) return;
    event.preventDefault();
    event.returnValue = '';
  });

  window.addEventListener('hashchange', async () => {
    const hashMatch = window.location.hash.match(/^#\/workspaces\/([^/]+)(?:\/([^/]+))?$/);
    if (!hashMatch) return;
    if (!confirmDiscardChanges()) {
      window.location.hash = state.activeWorkspaceId ? buildWorkspaceHash(state.activeWorkspaceId, state.activeTab) : '';
      return;
    }
    try {
      await openWorkspaceView(decodeURIComponent(hashMatch[1]), hashMatch[2] || 'editor');
    } catch (error) {
      showToast(error.message, 'error');
    }
  });
}

async function bootstrap() {
  bindEvents();
  applyLanguage();
  await loadIntakePresets();
  await loadWorkspaces();
  updateButtonStates();

  const hashMatch = window.location.hash.match(/^#\/workspaces\/([^/]+)(?:\/([^/]+))?$/);
  if (hashMatch) {
    try {
      await openWorkspaceView(decodeURIComponent(hashMatch[1]), hashMatch[2] || 'editor');
    } catch (error) {
      showToast(error.message, 'error');
    }
  }
}

bootstrap().catch((error) => {
  showToast(error.message, 'error');
});
