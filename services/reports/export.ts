import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { can, canExportContacts, isSchoolStaff, noticeScope, type Actor } from "@/lib/permissions";
import { maskPhone } from "@/lib/utils";
import { toCsv } from "@/lib/utils/csv";
import { ForbiddenError } from "@/services/errors";
import { METHODOLOGY, regionAnalytics, schoolDeliveryTable, type AnalyticsFilters } from "@/services/analytics";

export type ExportType = "deliveries" | "notices" | "contacts" | "region";

/**
 * Role-appropriate CSV exports. Regional exports contain aggregates only;
 * contact numbers are only exported by school staff with explicit permission.
 */
export async function buildExport(actor: Actor, type: ExportType, f: AnalyticsFilters): Promise<{ filename: string; csv: string }> {
  let result: { filename: string; csv: string };
  if (type === "region") {
    if (!can(actor, "reports.region")) throw new ForbiddenError();
    const data = await regionAnalytics(actor, f);
    const rows = data.schools.map((s) => [s.name, s.code, s.block, s.cluster, s.families, s.noticesSent, s.deliveryRate, s.ackRate, s.failureRate, s.pendingQuestions, s.openFollowUps, s.needsFollowUp ? "Needs follow-up" : ""]);
    const csv = toCsv(
      ["School", "Code", "Block", "Cluster", "Families", "Notices sent", "Delivery rate %", "Acknowledgment rate %", "Failure rate %", "Pending questions", "Open follow-ups", "Flag"],
      [...rows, [], ...METHODOLOGY.map((m) => [m])],
    );
    result = { filename: "vali-setu-aggregate-report.csv", csv };
  } else {
    if (!isSchoolStaff(actor)) throw new ForbiddenError();
    if (type === "deliveries") {
      const all = [];
      for (let page = 1; page <= 50; page += 1) {
        const chunk = await schoolDeliveryTable(actor, f, page, 200);
        all.push(...chunk.rows);
        if (chunk.rows.length < 200) break;
      }
      const csv = toCsv(
        ["Notice", "Parent / guardian", "Class", "Language", "Channel", "Delivery status", "Read at", "Audio played at", "Acknowledged at", "Question", "Follow-up needed"],
        all.map((r) => [r.noticeTitle, r.guardianName, r.className, r.language, r.channel, r.deliveryStatus, r.readAt, r.audioPlayedAt, r.acknowledgedAt, r.questionStatus ?? "", r.needsFollowUp ? "yes" : "no"]),
      );
      result = { filename: "vali-setu-delivery-report.csv", csv };
    } else if (type === "notices") {
      const notices = await db.notice.findMany({
        where: noticeScope(actor),
        orderBy: { createdAt: "desc" },
        include: { _count: { select: { recipients: true, responses: true } }, approvedBy: { select: { name: true } } },
      });
      const csv = toCsv(
        ["Title", "Category", "Status", "Languages", "Channels", "Created", "Approved by", "Dispatched", "Recipients", "Responses"],
        notices.map((n) => [n.title, n.category, n.workflowStatus, n.targetLanguages, n.channels, n.createdAt, n.approvedBy?.name ?? "", n.dispatchedAt, n._count.recipients, n._count.responses]),
      );
      result = { filename: "vali-setu-notice-summary.csv", csv };
    } else {
      if (!canExportContacts(actor) || !actor.schoolId) throw new ForbiddenError("You are not authorised to export contact details.");
      const families = await db.parentGuardian.findMany({
        where: { students: { some: { student: { schoolId: actor.schoolId } } } },
        include: { students: { include: { student: { include: { classSection: true } } } } },
        orderBy: { displayName: "asc" },
      });
      const csv = toCsv(
        ["Parent / guardian", "Student", "Class", "Language", "Channel", "Consent", "Phone"],
        families.flatMap((g) =>
          g.students.map((s) => [g.displayName, s.student.displayName, `${s.student.classSection.grade}-${s.student.classSection.section}`, g.preferredLanguage, g.preferredChannel, g.consentStatus, g.consentStatus === "GRANTED" ? g.phone : maskPhone(g.phone)]),
        ),
      );
      result = { filename: "vali-setu-family-contacts.csv", csv };
    }
  }
  await audit({ actorId: actor.id, entityType: "Export", entityId: type, action: "report.exported", metadata: { type } });
  return result;
}
