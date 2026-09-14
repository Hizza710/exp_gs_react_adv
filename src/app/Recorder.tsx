"use client";
// src/app/Recorder.tsx

import { useEffect, useRef, useState } from "react";

type Props = {
    onText: (t: string) => void;
    disabled?: boolean;
    // 録音が始まった/終わったタイミングを親(page.tsx)に伝えるための関数（任意）
    onRecordingChange?: (isRecording: boolean) => void;
};

export default function Recorder({ onText, onRecordingChange, disabled = false }: Props) {
    const [recording, setRecording] = useState(false);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [microphones, setMicrophones] = useState<MediaDeviceInfo[]>([]);
    const [microphoneId, setMicrophoneId] = useState("");
    const [activeMicrophone, setActiveMicrophone] = useState("");
    const [preparing, setPreparing] = useState(false);
    const recorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);

    // 次の録音に切り替えたときや画面を離れたときに、音声用のURLを解放する。
    useEffect(() => {
        return () => {
            if (audioUrl) URL.revokeObjectURL(audioUrl);
        };
    }, [audioUrl]);

    async function refreshMicrophones() {
        setPreparing(true);
        let stream: MediaStream | undefined;
        try {
            // 許可を得た後に一覧を取得すると、マイク名も表示できる。
            stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const devices = await navigator.mediaDevices.enumerateDevices();
            setMicrophones(devices.filter((device) => device.kind === "audioinput"));
        } catch (e) {
            console.error(e);
            alert("マイク一覧を取得できませんでした。ブラウザのマイク権限を確認してください。");
        } finally {
            stream?.getTracks().forEach((track) => track.stop());
            setPreparing(false);
        }
    }

    async function startRec() {
        setPreparing(true);
        let stream: MediaStream;
        try {
            stream = await navigator.mediaDevices.getUserMedia({
                audio: microphoneId ? { deviceId: { exact: microphoneId } } : true,
            });
        } catch (e) {
            console.error(e);
            alert("マイクを使えませんでした。ブラウザでマイクを『許可』してください。");
            return;
        } finally {
            setPreparing(false);
        }

        // 録音の途中でマイクが切断された時（AirPodsが切れた等）に、
        // 気づかず録音し続けてしまうのを防ぐための検知処理
        const audioTrack = stream.getAudioTracks()[0];
        setActiveMicrophone(audioTrack.label || "標準のマイク");
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

            const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
            if (blob.size === 0) {
                alert("音声データが録れませんでした。マイクを確認してください。");
                return;
            }
            // 文字起こしの成功・失敗にかかわらず、送信する音声を聞けるようにする。
            setAudioUrl(URL.createObjectURL(blob));
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
        setAudioUrl(null);
        recorderRef.current = recorder;
        setRecording(true);
        onRecordingChange?.(true); // 録音開始を親に知らせる
    }

    function stopRec() {
        const recorder = recorderRef.current;
        // マイク切断時は onended からも stopRec が呼ばれるため、停止処理が二重になりうる。
        // すでに停止済み("inactive")の MediaRecorder に stop() を呼ぶと InvalidStateError になるので、
        // 録音中のときだけ止める。
        if (recorder && recorder.state !== "inactive") recorder.stop();
        setRecording(false);
        onRecordingChange?.(false); // 録音終了を親に知らせる
    }

    return (
        <div className="studio-recorder">
            <div className="microphone-settings microphone-flow">
                <button className="studio-button" onClick={refreshMicrophones} disabled={disabled || recording || preparing}>
                    ① マイク一覧を取得
                </button>
                <label>
                    ② マイク選択
                    <select
                        value={microphoneId}
                        onChange={(e) => setMicrophoneId(e.target.value)}
                        disabled={disabled || recording || preparing || microphones.length === 0}
                    >
                        <option value="">ブラウザの標準マイク</option>
                        {microphones.filter((device) => device.deviceId).map((device, index) => (
                            <option key={device.deviceId} value={device.deviceId}>
                                {device.label || `マイク ${index + 1}`}
                            </option>
                        ))}
                    </select>
                </label>
            <button className={`studio-button record-button ${recording ? "is-recording" : ""}`} onClick={recording ? stopRec : startRec} disabled={disabled || preparing || microphones.length === 0}>
                {recording ? "■ 録音停止して文字にする" : "③ 🎤 録音する"}
            </button>
            </div>
            {activeMicrophone && <p className="mic-caption">直近の録音に使用したマイク：{activeMicrophone}</p>}
            {audioUrl && (
                <div className="recording-preview">
                    <p>録音した音声：再生して、自分の声が聞こえるか確認してください。</p>
                    <audio key={audioUrl} controls src={audioUrl} aria-label="録音した音声" />
                </div>
            )}
        </div>
    );
}
