-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "canApprove" BOOLEAN NOT NULL DEFAULT false,
    "locale" TEXT NOT NULL DEFAULT 'en',
    "schoolId" TEXT,
    "cluster" TEXT,
    "block" TEXT,
    "district" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "User_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "School" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "nameGu" TEXT,
    "code" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "block" TEXT NOT NULL,
    "cluster" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "supportedLanguages" TEXT NOT NULL DEFAULT 'gu,hi,en',
    "helpline" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ClassSection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "schoolId" TEXT NOT NULL,
    "grade" INTEGER NOT NULL,
    "section" TEXT NOT NULL,
    "academicYear" TEXT NOT NULL,
    CONSTRAINT "ClassSection_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TeacherAssignment" (
    "userId" TEXT NOT NULL,
    "classSectionId" TEXT NOT NULL,

    PRIMARY KEY ("userId", "classSectionId"),
    CONSTRAINT "TeacherAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TeacherAssignment_classSectionId_fkey" FOREIGN KEY ("classSectionId") REFERENCES "ClassSection" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Student" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "schoolId" TEXT NOT NULL,
    "classSectionId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "rollNumber" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    CONSTRAINT "Student_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Student_classSectionId_fkey" FOREIGN KEY ("classSectionId") REFERENCES "ClassSection" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ParentGuardian" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "displayName" TEXT NOT NULL,
    "preferredLanguage" TEXT NOT NULL DEFAULT 'gu',
    "preferredChannel" TEXT NOT NULL DEFAULT 'whatsapp',
    "notificationPrefs" TEXT NOT NULL DEFAULT '{}',
    "consentStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "consentUpdatedAt" DATETIME,
    "phone" TEXT,
    "phoneVerified" BOOLEAN NOT NULL DEFAULT false,
    "contactCorrectionNote" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ParentGuardian_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StudentGuardian" (
    "studentId" TEXT NOT NULL,
    "guardianId" TEXT NOT NULL,
    "relationship" TEXT NOT NULL,
    "authStatus" TEXT NOT NULL DEFAULT 'AUTHORIZED',

    PRIMARY KEY ("studentId", "guardianId"),
    CONSTRAINT "StudentGuardian_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StudentGuardian_guardianId_fkey" FOREIGN KEY ("guardianId") REFERENCES "ParentGuardian" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Notice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "schoolId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "sourceText" TEXT NOT NULL,
    "sourceLanguage" TEXT NOT NULL DEFAULT 'en',
    "simplifiedText" TEXT,
    "simplifiedBy" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "workflowStatus" TEXT NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "targetLanguages" TEXT NOT NULL DEFAULT 'gu,hi,en',
    "channels" TEXT NOT NULL DEFAULT 'whatsapp,sms',
    "recipientMode" TEXT NOT NULL DEFAULT 'CLASS',
    "selectedGuardianIds" TEXT NOT NULL DEFAULT '[]',
    "scheduledAt" DATETIME,
    "approvedById" TEXT,
    "approvedAt" DATETIME,
    "rejectionReason" TEXT,
    "dispatchedAt" DATETIME,
    "attachmentPath" TEXT,
    "attachmentMime" TEXT,
    "attachmentName" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Notice_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Notice_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Notice_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "NoticeClass" (
    "noticeId" TEXT NOT NULL,
    "classSectionId" TEXT NOT NULL,

    PRIMARY KEY ("noticeId", "classSectionId"),
    CONSTRAINT "NoticeClass_noticeId_fkey" FOREIGN KEY ("noticeId") REFERENCES "Notice" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "NoticeClass_classSectionId_fkey" FOREIGN KEY ("classSectionId") REFERENCES "ClassSection" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "NoticeVersion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "noticeId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "sourceText" TEXT NOT NULL,
    "simplifiedText" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "NoticeVersion_noticeId_fkey" FOREIGN KEY ("noticeId") REFERENCES "Notice" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "NoticeTranslation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "noticeId" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "translatedText" TEXT NOT NULL,
    "generatedText" TEXT,
    "editedText" TEXT,
    "provider" TEXT NOT NULL,
    "model" TEXT,
    "validationStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "reviewState" TEXT NOT NULL DEFAULT 'OPEN',
    "version" INTEGER NOT NULL DEFAULT 1,
    "sourceVersion" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "NoticeTranslation_noticeId_fkey" FOREIGN KEY ("noticeId") REFERENCES "Notice" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TranslationRevision" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "translationId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "origin" TEXT NOT NULL,
    "provider" TEXT,
    "createdById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TranslationRevision_translationId_fkey" FOREIGN KEY ("translationId") REFERENCES "NoticeTranslation" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "NoticeValidation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "noticeId" TEXT NOT NULL,
    "translationId" TEXT,
    "target" TEXT NOT NULL,
    "fieldType" TEXT NOT NULL,
    "sourceValue" TEXT NOT NULL,
    "normalizedValue" TEXT,
    "translatedValue" TEXT,
    "status" TEXT NOT NULL,
    "critical" BOOLEAN NOT NULL DEFAULT true,
    "resolution" TEXT NOT NULL DEFAULT 'OPEN',
    "reviewNote" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" DATETIME,
    "noticeVersion" INTEGER NOT NULL,
    "translationVersion" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "NoticeValidation_noticeId_fkey" FOREIGN KEY ("noticeId") REFERENCES "Notice" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "NoticeValidation_translationId_fkey" FOREIGN KEY ("translationId") REFERENCES "NoticeTranslation" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "NoticeAudio" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "noticeId" TEXT NOT NULL,
    "translationId" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "voice" TEXT,
    "audioReference" TEXT,
    "mimeType" TEXT,
    "durationSeconds" REAL,
    "status" TEXT NOT NULL,
    "textVersion" INTEGER NOT NULL,
    "spokenText" TEXT NOT NULL,
    "errorMessage" TEXT,
    "generatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "NoticeAudio_noticeId_fkey" FOREIGN KEY ("noticeId") REFERENCES "Notice" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "NoticeAudio_translationId_fkey" FOREIGN KEY ("translationId") REFERENCES "NoticeTranslation" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DispatchRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "noticeId" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "totalRecipients" INTEGER NOT NULL,
    "queued" INTEGER NOT NULL,
    "delivered" INTEGER NOT NULL,
    "failed" INTEGER NOT NULL,
    "summaryJson" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DispatchRequest_noticeId_fkey" FOREIGN KEY ("noticeId") REFERENCES "Notice" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "NoticeRecipient" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "noticeId" TEXT NOT NULL,
    "guardianId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "deliveryStatus" TEXT NOT NULL DEFAULT 'QUEUED',
    "sentAt" DATETIME,
    "deliveredAt" DATETIME,
    "readAt" DATETIME,
    "audioPlayedAt" DATETIME,
    "acknowledgedAt" DATETIME,
    "lastAttemptAt" DATETIME,
    "failureReason" TEXT,
    "simulated" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "NoticeRecipient_noticeId_fkey" FOREIGN KEY ("noticeId") REFERENCES "Notice" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "NoticeRecipient_guardianId_fkey" FOREIGN KEY ("guardianId") REFERENCES "ParentGuardian" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MessageDeliveryAttempt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "recipientId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerMessageId" TEXT,
    "attemptNumber" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "errorCode" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MessageDeliveryAttempt_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "NoticeRecipient" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ParentResponse" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "noticeId" TEXT NOT NULL,
    "guardianId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "responseType" TEXT NOT NULL,
    "questionCategory" TEXT,
    "message" TEXT,
    "callbackRequested" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL,
    "clientKey" TEXT,
    "staffReply" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ParentResponse_noticeId_fkey" FOREIGN KEY ("noticeId") REFERENCES "Notice" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ParentResponse_guardianId_fkey" FOREIGN KEY ("guardianId") REFERENCES "ParentGuardian" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ParentResponse_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FollowUpTask" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "schoolId" TEXT NOT NULL,
    "noticeId" TEXT,
    "guardianId" TEXT,
    "assignedToId" TEXT,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "dueAt" DATETIME,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FollowUpTask_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FollowUpTask_noticeId_fkey" FOREIGN KEY ("noticeId") REFERENCES "Notice" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "FollowUpTask_guardianId_fkey" FOREIGN KEY ("guardianId") REFERENCES "ParentGuardian" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "FollowUpTask_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "actorId" TEXT,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "metadata" TEXT NOT NULL DEFAULT '{}',
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RateLimitBucket" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "count" INTEGER NOT NULL,
    "resetAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_schoolId_idx" ON "User"("schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "School_code_key" ON "School"("code");

-- CreateIndex
CREATE INDEX "School_district_block_cluster_idx" ON "School"("district", "block", "cluster");

-- CreateIndex
CREATE UNIQUE INDEX "ClassSection_schoolId_grade_section_academicYear_key" ON "ClassSection"("schoolId", "grade", "section", "academicYear");

-- CreateIndex
CREATE INDEX "Student_schoolId_idx" ON "Student"("schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "Student_classSectionId_rollNumber_key" ON "Student"("classSectionId", "rollNumber");

-- CreateIndex
CREATE UNIQUE INDEX "ParentGuardian_userId_key" ON "ParentGuardian"("userId");

-- CreateIndex
CREATE INDEX "StudentGuardian_guardianId_idx" ON "StudentGuardian"("guardianId");

-- CreateIndex
CREATE INDEX "Notice_schoolId_workflowStatus_idx" ON "Notice"("schoolId", "workflowStatus");

-- CreateIndex
CREATE INDEX "Notice_schoolId_createdAt_idx" ON "Notice"("schoolId", "createdAt");

-- CreateIndex
CREATE INDEX "Notice_category_idx" ON "Notice"("category");

-- CreateIndex
CREATE UNIQUE INDEX "NoticeVersion_noticeId_version_key" ON "NoticeVersion"("noticeId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "NoticeTranslation_noticeId_language_key" ON "NoticeTranslation"("noticeId", "language");

-- CreateIndex
CREATE UNIQUE INDEX "TranslationRevision_translationId_version_key" ON "TranslationRevision"("translationId", "version");

-- CreateIndex
CREATE INDEX "NoticeValidation_noticeId_target_idx" ON "NoticeValidation"("noticeId", "target");

-- CreateIndex
CREATE UNIQUE INDEX "NoticeAudio_translationId_key" ON "NoticeAudio"("translationId");

-- CreateIndex
CREATE UNIQUE INDEX "DispatchRequest_noticeId_key" ON "DispatchRequest"("noticeId");

-- CreateIndex
CREATE UNIQUE INDEX "DispatchRequest_idempotencyKey_key" ON "DispatchRequest"("idempotencyKey");

-- CreateIndex
CREATE INDEX "NoticeRecipient_guardianId_idx" ON "NoticeRecipient"("guardianId");

-- CreateIndex
CREATE INDEX "NoticeRecipient_noticeId_deliveryStatus_idx" ON "NoticeRecipient"("noticeId", "deliveryStatus");

-- CreateIndex
CREATE UNIQUE INDEX "NoticeRecipient_noticeId_guardianId_channel_key" ON "NoticeRecipient"("noticeId", "guardianId", "channel");

-- CreateIndex
CREATE INDEX "MessageDeliveryAttempt_providerMessageId_idx" ON "MessageDeliveryAttempt"("providerMessageId");

-- CreateIndex
CREATE UNIQUE INDEX "MessageDeliveryAttempt_recipientId_attemptNumber_key" ON "MessageDeliveryAttempt"("recipientId", "attemptNumber");

-- CreateIndex
CREATE INDEX "ParentResponse_schoolId_responseType_status_idx" ON "ParentResponse"("schoolId", "responseType", "status");

-- CreateIndex
CREATE INDEX "ParentResponse_noticeId_idx" ON "ParentResponse"("noticeId");

-- CreateIndex
CREATE UNIQUE INDEX "ParentResponse_guardianId_clientKey_key" ON "ParentResponse"("guardianId", "clientKey");

-- CreateIndex
CREATE INDEX "FollowUpTask_schoolId_status_idx" ON "FollowUpTask"("schoolId", "status");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_timestamp_idx" ON "AuditLog"("timestamp");
