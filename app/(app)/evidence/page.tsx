"use client";
import { useState } from "react";
import { Download, ExternalLink, Eye, FileText, Link2, Plus, Trash2 } from "lucide-react";
import { useLookups, useStore, useUser } from "@/lib/store";
import { canDeleteEvidence } from "@/lib/permissions";
import { Badge, Button, Card, ConfirmModal, Empty, Modal, PageHeader, SearchInput, Td, Th, inputCls } from "@/components/ui";
import EvidenceModal from "@/components/EvidenceModal";
import type { Evidence } from "@/lib/types";
import { EVIDENCE_CATEGORIES, formatBytes } from "@/lib/utils";

export default function EvidencePage() {
  const { db, remove, notify, getEvidenceUrl } = useStore();
  const user = useUser();
  const { indicatorById, userById } = useLookups();
  const [q, setQ] = useState(""); const [fi, setFi] = useState(""); const [fc, setFc] = useState(""); const [fk, setFk] = useState("");
  const [add, setAdd] = useState(false);
  const [del, setDel] = useState<Evidence | null>(null);
  const [view, setView] = useState<Evidence | null>(null);

  const rows = db.evidence.filter((e) => (!fi || e.indicatorId === fi) && (!fc || e.category === fc) && (!fk || e.kind === fk) &&
    `${e.description} ${e.fileName ?? ""} ${e.url ?? ""}`.includes(q.trim()));

  const [viewUrl, setViewUrl] = useState<string | null>(null);
  const download = async (e: Evidence) => {
    const url = await getEvidenceUrl(e, true);
    if (!url) return;
    const a = document.createElement("a"); a.href = url; a.rel = "noopener"; a.click();
  };
  const openView = async (e: Evidence) => {
    setViewUrl(null); setView(e);
    const url = await getEvidenceUrl(e);
    if (url) setViewUrl(url); else setView(null);
  };
  const isImage = view?.mime?.startsWith("image/");
  const isPdf = view?.mime === "application/pdf";

  return (
    <>
      <PageHeader title="مكتبة الشواهد والأدلة" subtitle="الملفات محفوظة في تخزين خاص، ويُولَّد رابط مؤقت لكل معاينة أو تنزيل."
        actions={<Button disabled={db.indicators.length === 0} onClick={() => setAdd(true)}><Plus className="h-4 w-4" /> إضافة شاهد</Button>} />
      <Card>
        <div className="flex flex-wrap gap-3 p-4">
          <SearchInput value={q} onChange={setQ} placeholder="بحث في الشواهد" />
          <select className={`${inputCls} !w-auto`} aria-label="المؤشر" value={fi} onChange={(e) => setFi(e.target.value)}><option value="">كل المؤشرات</option>{db.indicators.map((i) => <option key={i.id} value={i.id}>{i.code}</option>)}</select>
          <select className={`${inputCls} !w-auto`} aria-label="النوع" value={fc} onChange={(e) => setFc(e.target.value)}><option value="">كل الأنواع</option>{EVIDENCE_CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select>
          <select className={`${inputCls} !w-auto`} aria-label="الشكل" value={fk} onChange={(e) => setFk(e.target.value)}><option value="">ملفات وروابط</option><option value="file">ملفات</option><option value="link">روابط</option></select>
        </div>
        {rows.length === 0 ? <Empty text="لا توجد شواهد مطابقة." /> : (
          <div className="overflow-x-auto"><table className="w-full min-w-[820px]">
            <thead><tr><Th>الشاهد</Th><Th>المؤشر</Th><Th>النوع</Th><Th>أضافته</Th><Th>التاريخ</Th><Th /></tr></thead>
            <tbody>
              {rows.map((e) => (
                <tr key={e.id}>
                  <Td className="min-w-[240px]">
                    <div className="flex items-start gap-2">
                      {e.kind === "file" ? <FileText className="mt-0.5 h-4 w-4 shrink-0 text-navy-500" /> : <Link2 className="mt-0.5 h-4 w-4 shrink-0 text-navy-500" />}
                      <div><div className="font-medium">{e.description}</div>
                        <div className="text-xs text-navy-500" dir={e.kind === "link" ? "ltr" : undefined}>{e.kind === "file" ? `${e.fileName} · ${formatBytes(e.size)}` : e.url}</div></div>
                    </div>
                  </Td>
                  <Td>{indicatorById.get(e.indicatorId)?.code}</Td>
                  <Td><Badge tone="blue">{e.category}</Badge></Td>
                  <Td>{userById.get(e.uploadedBy)?.name ?? "—"}</Td>
                  <Td className="whitespace-nowrap">{e.createdAt}</Td>
                  <Td><div className="flex gap-1">
                    {e.kind === "link" ? (
                      <a className="rounded-xl p-2 text-navy-700 hover:bg-navy-100" href={e.url} target="_blank" rel="noopener noreferrer" aria-label="فتح الرابط"><ExternalLink className="h-4 w-4" /></a>
                    ) : (<>
                      <Button variant="ghost" aria-label="معاينة" onClick={() => openView(e)}><Eye className="h-4 w-4" /></Button>
                      <Button variant="ghost" aria-label="تنزيل" onClick={() => download(e)}><Download className="h-4 w-4" /></Button>
                    </>)}
                    {canDeleteEvidence(user, e) && <Button variant="ghost" aria-label="حذف" onClick={() => setDel(e)}><Trash2 className="h-4 w-4 text-red-600" /></Button>}
                  </div></Td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}
      </Card>
      <EvidenceModal open={add} onClose={() => setAdd(false)} />
      <Modal wide open={!!view} onClose={() => setView(null)} title={view?.fileName ?? "معاينة"}>
        {/* eslint-disable @next/next/no-img-element */}
        {!viewUrl ? <p className="text-sm text-navy-600">جارٍ تحميل الملف…</p>
          : isImage ? <img src={viewUrl} alt={view?.description} className="mx-auto max-h-[70vh] rounded-lg" />
          : isPdf ? <iframe src={viewUrl} title="معاينة PDF" className="h-[70vh] w-full rounded-lg border" />
          : <div className="space-y-3 text-sm"><p>لا تتوفر معاينة لهذا النوع من الملفات. يمكنك تنزيله.</p>{view && <Button onClick={() => download(view)}><Download className="h-4 w-4" /> تنزيل</Button>}</div>}
      </Modal>
      <ConfirmModal open={!!del} title="حذف الشاهد" message="سيتم حذف هذا الشاهد نهائيًا. هل تريد المتابعة؟" onClose={() => setDel(null)}
        onConfirm={async () => { if (del && (await remove("evidence", del.id))) notify("تم حذف الشاهد."); }} />
    </>
  );
}
