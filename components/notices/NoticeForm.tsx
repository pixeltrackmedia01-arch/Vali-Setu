"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { FileUp } from "lucide-react";
import { Alert, Button, Card, Field, Input, Select, Textarea } from "@/components/ui";
import { api, errorText } from "@/lib/api/client";
import { CHANNELS, LANGUAGES, NOTICE_CATEGORIES, PRIORITIES, type Channel, type Language, type NoticeCategory, type Priority } from "@/lib/domain/constants";
import { useI18n } from "@/lib/i18n/client";
import { noticeInputSchema } from "@/lib/validation/schemas";
import { DEMO_SAMPLES } from "@/services/ai/demo-content";

export interface ClassOption {
  id: string;
  label: string;
  families: { id: string; name: string }[];
}

export interface NoticeFormValues {
  title: string;
  category: NoticeCategory;
  sourceText: string;
  priority: Priority;
  classSectionIds: string[];
  recipientMode: "CLASS" | "SELECTED";
  selectedGuardianIds: string[];
  targetLanguages: Language[];
  channels: Channel[];
  scheduledAt: string;
}

const ALLOWED = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

export function NoticeForm({
  classes,
  initial,
  noticeId,
  attachmentName,
  maxUploadMb,
  readOnly,
}: {
  classes: ClassOption[];
  initial?: NoticeFormValues;
  noticeId?: string;
  attachmentName?: string | null;
  maxUploadMb: number;
  readOnly?: boolean;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [values, setValues] = useState<NoticeFormValues>(
    initial ?? {
      title: "",
      category: "PTM",
      sourceText: "",
      priority: "NORMAL",
      classSectionIds: classes[0] ? [classes[0].id] : [],
      recipientMode: "CLASS",
      selectedGuardianIds: [],
      targetLanguages: ["gu", "hi", "en"],
      channels: ["whatsapp", "sms"],
      scheduledAt: "",
    },
  );
  const [dirty, setDirty] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ tone: "success" | "danger" | "info" | "warn"; text: string } | null>(null);
  const [saving, setSaving] = useState<"draft" | "continue" | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const firstError = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  useEffect(() => () => (preview ? URL.revokeObjectURL(preview) : undefined), [preview]);

  function set<K extends keyof NoticeFormValues>(key: K, value: NoticeFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
    setDirty(true);
  }

  function toggle<T extends string>(list: T[], item: T): T[] {
    return list.includes(item) ? list.filter((x) => x !== item) : [...list, item];
  }

  function loadSample(key: string) {
    const s = DEMO_SAMPLES.find((x) => x.key === key)!;
    setValues((v) => ({ ...v, title: s.title, category: s.category, sourceText: s.source, priority: key === "ptm" ? "HIGH" : "NORMAL" }));
    setDirty(true);
    setMessage({ tone: "info", text: t("wizard.sampleLoaded") });
  }

  function onFile(f: File | null) {
    setFileError(null);
    setFile(null);
    setPreview(null);
    if (!f) return;
    if (!ALLOWED.includes(f.type)) return setFileError(t("errors.codes.INVALID_FILE_TYPE"));
    if (f.size > maxUploadMb * 1024 * 1024) return setFileError(t("errors.codes.FILE_TOO_LARGE"));
    setFile(f);
    if (f.type.startsWith("image/")) setPreview(URL.createObjectURL(f));
    setDirty(true);
  }

  async function save(mode: "draft" | "continue") {
    setMessage(null);
    const payload = {
      ...values,
      sourceLanguage: "en" as const,
      scheduledAt: values.scheduledAt ? new Date(values.scheduledAt).toISOString() : null,
      selectedGuardianIds: values.recipientMode === "SELECTED" ? values.selectedGuardianIds : [],
    };
    const parsed = noticeInputSchema.safeParse(payload);
    if (!parsed.success) {
      const e: Record<string, string> = {};
      for (const issue of parsed.error.issues) e[String(issue.path[0])] ??= issue.message;
      setErrors(e);
      setMessage({ tone: "danger", text: t("errors.codes.VALIDATION") });
      requestAnimationFrame(() => firstError.current?.focus());
      return;
    }
    setErrors({});
    setSaving(mode);
    try {
      let id = noticeId;
      if (id) await api(`/api/notices/${id}`, { method: "PATCH", body: parsed.data });
      else id = (await api<{ id: string }>("/api/notices", { body: parsed.data })).id;
      if (file) {
        const form = new FormData();
        form.set("file", file);
        await api(`/api/notices/${id}/upload`, { form });
        setMessage({ tone: "warn", text: t("wizard.ocrUnavailable") });
      }
      setDirty(false);
      if (mode === "continue") router.push(`/notices/${id}?step=simplify`);
      else if (!noticeId) router.push(`/notices/${id}?step=create&saved=1`);
      else {
        setMessage({ tone: "success", text: t("wizard.saved") });
        router.refresh();
      }
    } catch (err) {
      setMessage({ tone: "danger", text: errorText(err, t) });
    } finally {
      setSaving(null);
    }
  }

  const selectedClasses = classes.filter((c) => values.classSectionIds.includes(c.id));
  const err = (k: string) => errors[k];

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        save("continue");
      }}
      noValidate
    >
      {message && (
        <div ref={firstError} tabIndex={-1}>
          <Alert tone={message.tone}>{message.text}</Alert>
        </div>
      )}
      <fieldset disabled={readOnly} className="space-y-6">
        <Card>
          <div className="mb-4 flex flex-wrap gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => loadSample("ptm")}>
              {t("wizard.loadSample")}
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={() => loadSample("scholarship")}>
              {t("wizard.loadSample2")}
            </Button>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label={t("wizard.fields.title")} htmlFor="title" error={err("title")} required>
              <Input id="title" value={values.title} onChange={(e) => set("title", e.target.value)} aria-invalid={Boolean(err("title"))} maxLength={140} />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label={t("wizard.fields.category")} htmlFor="category">
                <Select id="category" value={values.category} onChange={(e) => set("category", e.target.value as NoticeCategory)}>
                  {NOTICE_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {t(`category.${c}`)}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label={t("wizard.fields.priority")} htmlFor="priority">
                <Select id="priority" value={values.priority} onChange={(e) => set("priority", e.target.value as Priority)}>
                  {PRIORITIES.map((p) => (
                    <option key={p} value={p}>
                      {t(`priority.${p}`)}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
          </div>
          <div className="mt-4">
            <Field label={t("wizard.fields.source")} htmlFor="sourceText" hint={t("wizard.fields.sourceHelp")} error={err("sourceText")} required>
              <Textarea
                id="sourceText"
                rows={6}
                value={values.sourceText}
                onChange={(e) => set("sourceText", e.target.value)}
                aria-invalid={Boolean(err("sourceText"))}
                aria-describedby="sourceText-hint"
                maxLength={6000}
              />
            </Field>
          </div>
          <div className="mt-4">
            <Field label={t("wizard.fields.upload")} htmlFor="upload" hint={t("wizard.fields.uploadHelp", { size: maxUploadMb })} error={fileError ?? undefined}>
              <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-md border border-dashed border-navy-200 bg-navy-50 px-3 text-sm text-navy-700 hover:bg-navy-100">
                <FileUp className="h-4 w-4" aria-hidden />
                <span>{file?.name ?? attachmentName ?? t("wizard.fields.upload")}</span>
                <input id="upload" type="file" className="sr-only" accept={ALLOWED.join(",")} onChange={(e) => onFile(e.target.files?.[0] ?? null)} aria-describedby="upload-hint" />
              </label>
            </Field>
            {preview && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt={t("wizard.fields.upload")} className="mt-3 max-h-64 rounded border border-line object-contain" />
            )}
            {attachmentName && noticeId && !file && (
              <p className="mt-2 text-sm">
                <a className="text-navy-700 underline" href={`/api/notices/${noticeId}/upload`} target="_blank" rel="noreferrer">
                  {t("wizard.uploadSaved", { name: attachmentName })}
                </a>
              </p>
            )}
          </div>
        </Card>

        <Card>
          <div className="grid gap-6 md:grid-cols-2">
            <fieldset>
              <legend className="text-sm font-medium">
                {t("wizard.fields.classes")} <span className="text-danger-600" aria-hidden>*</span>
              </legend>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {classes.map((c) => (
                  <label key={c.id} className="flex min-h-11 items-center gap-2 rounded border border-line px-3">
                    <input type="checkbox" className="h-4 w-4" checked={values.classSectionIds.includes(c.id)} onChange={() => set("classSectionIds", toggle(values.classSectionIds, c.id))} />
                    <span>
                      {c.label} <span className="text-xs text-ink-muted">({c.families.length})</span>
                    </span>
                  </label>
                ))}
              </div>
              {err("classSectionIds") && <p className="mt-1 text-sm text-danger-700">{err("classSectionIds")}</p>}

              <p className="mt-4 text-sm font-medium">{t("wizard.fields.recipients")}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {(["CLASS", "SELECTED"] as const).map((m) => (
                  <label key={m} className="flex min-h-11 items-center gap-2 rounded border border-line px-3">
                    <input type="radio" name="recipientMode" checked={values.recipientMode === m} onChange={() => set("recipientMode", m)} />
                    {m === "CLASS" ? t("wizard.fields.wholeClass") : t("wizard.fields.selectedFamilies")}
                  </label>
                ))}
              </div>
              {values.recipientMode === "SELECTED" && (
                <div className="mt-2 max-h-56 overflow-y-auto rounded border border-line p-2">
                  {selectedClasses.flatMap((c) =>
                    c.families.map((f) => (
                      <label key={`${c.id}-${f.id}`} className="flex min-h-9 items-center gap-2 px-1 text-sm">
                        <input type="checkbox" checked={values.selectedGuardianIds.includes(f.id)} onChange={() => set("selectedGuardianIds", toggle(values.selectedGuardianIds, f.id))} />
                        {f.name} <span className="text-xs text-ink-muted">{c.label}</span>
                      </label>
                    )),
                  )}
                </div>
              )}
            </fieldset>
            <div className="space-y-5">
              <fieldset>
                <legend className="text-sm font-medium">{t("wizard.fields.languages")}</legend>
                <div className="mt-2 flex flex-wrap gap-2">
                  {LANGUAGES.map((l) => (
                    <label key={l} className="flex min-h-11 items-center gap-2 rounded border border-line px-3" lang={l}>
                      <input type="checkbox" checked={values.targetLanguages.includes(l)} onChange={() => set("targetLanguages", toggle(values.targetLanguages, l))} />
                      {t(`lang.${l}`)}
                    </label>
                  ))}
                </div>
                {err("targetLanguages") && <p className="mt-1 text-sm text-danger-700">{err("targetLanguages")}</p>}
              </fieldset>
              <fieldset>
                <legend className="text-sm font-medium">{t("wizard.fields.channels")}</legend>
                <div className="mt-2 flex flex-wrap gap-2">
                  {CHANNELS.map((c) => (
                    <label key={c} className="flex min-h-11 items-center gap-2 rounded border border-line px-3">
                      <input type="checkbox" checked={values.channels.includes(c)} onChange={() => set("channels", toggle(values.channels, c))} />
                      {t(`channel.${c}`)}
                    </label>
                  ))}
                </div>
                {err("channels") && <p className="mt-1 text-sm text-danger-700">{err("channels")}</p>}
              </fieldset>
              <Field label={t("wizard.fields.schedule")} htmlFor="scheduledAt">
                <Input id="scheduledAt" type="datetime-local" value={values.scheduledAt} onChange={(e) => set("scheduledAt", e.target.value)} />
              </Field>
            </div>
          </div>
        </Card>
      </fieldset>

      {!readOnly && (
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" loading={saving === "continue"}>
            {t("wizard.saveContinue")}
          </Button>
          <Button type="button" variant="secondary" loading={saving === "draft"} onClick={() => save("draft")}>
            {t("wizard.saveDraft")}
          </Button>
          {dirty && <span className="text-sm text-warn-700">{t("wizard.unsaved")}</span>}
        </div>
      )}
    </form>
  );
}
