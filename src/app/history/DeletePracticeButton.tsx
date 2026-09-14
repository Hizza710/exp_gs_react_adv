"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export default function DeletePracticeButton({ id }: { id: number }) {
    const router = useRouter();
    const busyRef = useRef(false);
    const [deleting, setDeleting] = useState(false);
    const [refreshing, startTransition] = useTransition();
    const [error, setError] = useState("");
    const label = `PRACTICE / ${String(id).padStart(3, "0")}`;

    async function remove() {
        if (busyRef.current || refreshing) return;
        if (!window.confirm(`${label} を削除しますか？この操作は取り消せません。`)) return;
        busyRef.current = true;
        setDeleting(true);
        setError("");
        try {
            const response = await fetch(`/api/sessions/${id}`, { method: "DELETE" });
            if (!response.ok) throw new Error("Delete failed");
            startTransition(() => router.refresh());
        } catch {
            setError("削除できませんでした。もう一度お試しください。");
        } finally {
            busyRef.current = false;
            setDeleting(false);
        }
    }

    return (
        <div className="delete-practice">
            <button type="button" className="studio-button delete-practice-button" onClick={remove} disabled={deleting || refreshing} aria-label={`${label} を削除`}>
                {deleting || refreshing ? "削除中…" : "削除"}
            </button>
            {error && <p role="alert" className="delete-practice-error">{error}</p>}
        </div>
    );
}
