"use client";
// src/app/FaceMeter.tsx

import { useEffect, useRef, useState } from "react";
// ⚠️ face-api はブラウザ専用のライブラリなので、
// ファイルの一番上で普通に import すると、サーバー側でも評価されてしまいエラーになる。
// そのため、実際に使うタイミング（useEffectの中＝ブラウザ内）で動的に読み込む。
// import * as faceapi from "@vladmandic/face-api"; ← これが原因だったのでコメントアウト

export default function FaceMeter({ onScore }: { onScore: (n: number) => void }) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [smile, setSmile] = useState(0);

    useEffect(() => {
        let timer: ReturnType<typeof setInterval>;
        let stream: MediaStream | null = null;
        // 開発モードでは useEffect が「実行→片付け→再実行」と2回走ることがある。
        // 片付け（cleanup）が先に呼ばれていたら、以降の処理を中断するための目印。
        let cancelled = false;

        async function start() {
            // ブラウザの中でだけ face-api を読み込む（サーバー側では実行されない）
            const faceapi = await import("@vladmandic/face-api");

            // ① モデルを読み込む（public/models から）
            await faceapi.nets.tinyFaceDetector.loadFromUri("/models");
            await faceapi.nets.faceExpressionNet.loadFromUri("/models");
            if (cancelled) return; // 読み込み中に片付けが呼ばれていたら、ここで終了

            // ② カメラを起動して video に流す
            try {
                stream = await navigator.mediaDevices.getUserMedia({ video: true });
                if (cancelled) {
                    // カメラ取得中に片付けが呼ばれていたら、取得したカメラをすぐ止めて終了
                    stream.getTracks().forEach((track) => track.stop());
                    return;
                }
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    // play() は途中で中断されると AbortError を投げることがあるが、
                    // 中断されただけで壊れているわけではないので、ここで安全に無視する。
                    await videoRef.current.play().catch(() => { });
                }
            } catch (e) {
                console.error(e);
                alert("カメラを使えませんでした。ブラウザのアドレスバーでカメラを『許可』してから、ページを再読み込みしてください。");
                return;
            }

            // ③ 0.5秒ごとに表情を測る
            timer = setInterval(async () => {
                if (!videoRef.current) return;
                const result = await faceapi
                    .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
                    .withFaceExpressions();
                if (result) {
                    const happy = Math.round(result.expressions.happy * 100);
                    setSmile(happy);
                    onScore(happy); // 親(page.tsx)にも笑顔率を渡す
                }
            }, 500);
        }

        start();
        return () => {
            // 片付け：これから走る予定の処理を中断させ、タイマーとカメラを止める
            cancelled = true;
            clearInterval(timer);
            if (stream) {
                stream.getTracks().forEach((track) => track.stop());
            }
        };
        // onScore は常に setSmileScore を渡す（インライン関数にすると毎回カメラが再起動するので注意）
    }, []);

    return (
        <div>
            <video ref={videoRef} autoPlay muted width={320} height={240} />
            <p>😊 笑顔 {smile}%</p>
        </div>
    );
}