import { Play, Shuffle, Timer } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { ExamAttempt, ID } from "@/types";
import { Button, Input, Modal, Toggle } from "@/components/ui";
import { shuffle, toFa } from "@/lib/utils";
import { api } from "@/services";
import { useApp } from "@/store/AppContext";

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  questionIds: ID[];
  sourceType: ExamAttempt["sourceType"];
  sourceId?: ID;
  defaultDuration?: number | null;
  defaultNegative?: boolean;
  defaultShuffle?: boolean;
}

/** مودال تنظیمات شروع آزمون (زمان‌دار/بدون زمان، نمره‌ی منفی، ترتیب تصادفی) */
export function StartExamModal({ open, onClose, title, questionIds, sourceType, sourceId, defaultDuration, defaultNegative = true, defaultShuffle = false }: Props) {
  const navigate = useNavigate();
  const { catalog, refreshUserData } = useApp();
  const suggested = Math.max(5, Math.round(questionIds.reduce((s, id) => s + (catalog.questionById.get(id)?.estimatedSeconds ?? 90), 0) / 60));
  const [timed, setTimed] = useState(defaultDuration !== null);
  const [duration, setDuration] = useState(defaultDuration ?? suggested);
  const [negative, setNegative] = useState(defaultNegative);
  const [shuf, setShuf] = useState(defaultShuffle);
  const [busy, setBusy] = useState(false);

  const start = async () => {
    setBusy(true);
    try {
      const attempt = await api.startAttempt({
        sourceType,
        sourceId,
        title,
        questionIds: shuf ? shuffle(questionIds) : questionIds,
        durationMinutes: timed ? Math.max(1, duration) : null,
        negativeMarking: negative,
      });
      await refreshUserData();
      navigate(`/app/run/${attempt.id}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="تنظیمات آزمون"
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            انصراف
          </Button>
          <Button onClick={start} loading={busy} icon={<Play className="h-4 w-4" />}>
            شروع آزمون
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="rounded-xl bg-slate-50 p-3 text-sm">
          <div className="font-bold text-slate-800">{title}</div>
          <div className="text-xs text-slate-500">{toFa(questionIds.length)} سوال • زمان پیشنهادی {toFa(suggested)} دقیقه</div>
        </div>
        <Toggle checked={timed} onChange={setTimed} label="آزمون زمان‌دار" description="با پایان زمان، آزمون خودکار ثبت می‌شود" />
        {timed && (
          <div className="flex items-center gap-2">
            <Timer className="h-4 w-4 text-slate-400" />
            <Input type="number" min={1} value={duration} onChange={(e) => setDuration(Number(e.target.value))} className="w-28" ltr />
            <span className="text-sm text-slate-500">دقیقه</span>
          </div>
        )}
        <Toggle checked={negative} onChange={setNegative} label="نمره‌ی منفی کنکوری" description="هر ۳ پاسخ غلط، یک پاسخ درست را خنثی می‌کند" />
        <Toggle checked={shuf} onChange={setShuf} label="ترتیب تصادفی سوالات" />
        {shuf && (
          <p className="flex items-center gap-1 text-[11px] text-slate-500">
            <Shuffle className="h-3 w-3" /> ترتیب سوالات در این آزمون به‌هم ریخته می‌شود.
          </p>
        )}
      </div>
    </Modal>
  );
}
