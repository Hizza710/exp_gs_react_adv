"use client";
// src/app/Recorder.tsx

import { useRef, useState } from "react";

type Props = {
    onText: (t: string) => void;
    // 録音が始まった/終わったタイミングを親(page.tsx)に伝えるための関数（任意）
    onRecordingChange?: (isRecording: boolean) => void;
};

export default function Recorder({ onText, onRecordingChange }: Props) {
    const [recording, setRecording] = useState(false);
    const recorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);

    async function startRec() {
        let stream: MediaStream;
        try {
            stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch (e) {
            console.error(e);
            alert("マイクを使えませんでした。ブラウザでマイクを『許可』してください。");
            return;
        }

        // 録音の途中でマイクが切断された時（AirPodsが切れた等）に、
        // 気づかず録音し続けてしまうのを防ぐための検知処理
        const audioTrack = stream.getAudioTracks()[0];
        audioTrack.onended = () => {
            alert("マイクが切断されました。録音を停止します。マイクの接続を確認してもう一度お試しください。");
            stopRec();
        };

        const recorder = new MediaRecorder(stream);
        chunksRef.current = [];
        recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
        recorder.onstop = async () => {
            // マイクのトラックを止めて、システム側の「使用中」表示も消しておく
            stream.getTracks().forEach((track) => track.stop());

            // 録音データが空（マイク切断などで何も録れなかった）場合は送信しない
            if (chunksRef.current.length === 0) return;

            const blob = new Blob(chunksRef.current, { type: "audio/webm" });
            const form = new FormData();
            form.append("audio", blob, "audio.webm");
            try {
                const res = await fetch("/api/transcribe", { method: "POST", body: form });
                const data = await res.json();
                onText(data.text); // 文字起こし結果を親に渡す
            } catch (e) {
                console.error(e);
                alert("文字起こしに失敗しました。もう一度お試しください。");
            }
        };
        recorder.start();
        recorderRef.current = recorder;
        setRecording(true);
        onRecordingChange?.(true); // 録音開始を親に知らせる
    }

    function stopRec() {
        recorderRef.current?.stop();
        setRecording(false);
        onRecordingChange?.(false); // 録音終了を親に知らせる
    }

    return (
        <button onClick={recording ? stopRec : startRec}>
            {recording ? "■ 録音停止して文字にする" : "🎤 録音する"}
        </button>
    );
}