"use client";
// src/app/FaceMeter.tsx

import { useEffect, useRef } from "react";
// ⚠️ face-api はブラウザ専用のライブラリなので、
// ファイルの一番上で普通に import すると、サーバー側でも評価されてしまいエラーになる。
// そのため、実際に使うタイミング（useEffectの中＝ブラウザ内）で動的に読み込む。
// import * as faceapi from "@vladmandic/face-api"; ← これが原因だったのでコメントアウト

export default function FaceMeter({ onScore }: { onScore: (n: number) => void }) {
    const videoRef = useRef<HTMLVideoElement>(null);

    // onScore は親が再レンダリングされるたびに新しい関数になる。
    // useEffect の依存配列に入れるとカメラが再起動してしまうので、
    // 「最新の関数を入れておく箱」を ref で持ち、呼ぶときに中身を取り出す。
    // こうすると依存配列を空にしても、古い関数を掴み続ける心配がない。
    // ※ ref の書き換えはレンダー中にやると React に怒られる（描画の途中で値が変わるため）。
    //    レンダーが終わったあとに走る useEffect の中で入れ替える。
    const onScoreRef = useRef(onScore);
    useEffect(() => {
        onScoreRef.current = onScore;
    });

    useEffect(() => {
        let timer: ReturnType<typeof setTimeout> | undefined;
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

            // play() を待っている間に片付けが呼ばれていたら、
            // ここで止めないと「誰も止められない測定ループ」が生まれてしまう。
            if (cancelled) return;

            // ③ 0.5秒ごとに表情を測る
            // setInterval だと、検出に0.5秒以上かかったとき処理が積み上がってしまう。
            // 「1回終わってから次を予約する」形にすれば、必ず1回ずつ順番に実行される。
            async function measure() {
                if (cancelled || !videoRef.current) return;
                try {
                    const result = await faceapi
                        .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
                        .withFaceExpressions();
                    if (cancelled) return;
                    if (result) {
                        const happy = Math.round(result.expressions.happy * 100);
                        onScoreRef.current(happy); // 親(page.tsx)にも笑顔率を渡す
                    }
                } catch (e) {
                    console.error(e);
                }
                if (!cancelled) timer = setTimeout(measure, 500); // 次の1回を予約
            }
            measure();
        }

        // モデル読み込みなどの失敗を拾えるようにしておく（放置すると未処理エラーになる）
        start().catch((e) => console.error(e));

        return () => {
            cancelled = true;
            clearTimeout(timer);
            stream?.getTracks().forEach((track) => track.stop());
        };
    }, []); // カメラはマウント時だけ起動する（onScore は ref 経由なので依存不要）

    return (
        <div className="camera-frame">
            <video ref={videoRef} autoPlay muted playsInline aria-label="表情確認用のカメラ映像" />
            <span className="camera-caption">YOUR PORTRAIT</span>
        </div>
    );
}
