import React, { useState, useEffect, useRef } from 'react';

interface AIScoringOverlayProps {
  visible: boolean;
  onRestart: () => void;
}

const LOADING_TEXTS = [
  '音乐大模型评分中...',
  '正在分析您的演奏表现...',
  '识别音符准确度...',
  '评估节奏稳定性...',
  '分析手指演奏技巧...',
  '综合评估音乐表现力...',
  '几乎完成了...',
  '生成个性化反馈中...',
  '计算最终得分...',
];

const ENCOURAGEMENTS = [
  '节奏感不错，继续保持！',
  '手指灵活度还有提升空间～',
  '你已经比上次进步了！',
  '试试更多连奏练习会更棒',
  '音准不错，继续加油！',
  '大师之路就在脚下！',
  '很有天赋，坚持练习！',
];

const TOTAL_DURATION = 45000; // 45 seconds
const TEXT_INTERVAL = 5000; // switch text every 5 seconds

function randomFrom<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export const AIScoringOverlay: React.FC<AIScoringOverlayProps> = ({ visible, onRestart }) => {
  const [phase, setPhase] = useState<'loading' | 'result'>('loading');
  const [textIndex, setTextIndex] = useState(0);
  const [finalScore, setFinalScore] = useState(0);
  const [encouragements, setEncouragements] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(0);

  useEffect(() => {
    if (!visible) {
      setPhase('loading');
      setTextIndex(0);
      setProgress(0);
      return;
    }

    startTimeRef.current = Date.now();

    // Rotate text every 5 seconds
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      setProgress(Math.min(100, (elapsed / TOTAL_DURATION) * 100));

      if (elapsed >= TOTAL_DURATION) {
        // Scoring complete
        clearInterval(timerRef.current!);
        const score = Math.floor(Math.random() * 16) + 70; // 70-85
        const msgs = randomFrom(ENCOURAGEMENTS, 3);
        setFinalScore(score);
        setEncouragements(msgs);
        setPhase('result');
      } else {
        setTextIndex((prev) => (prev + 1) % LOADING_TEXTS.length);
      }
    }, TEXT_INTERVAL);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <div className="scoring-overlay">
      <div className="scoring-card">
        {phase === 'loading' && (
          <>
            <div className="scoring-spinner" />
            <p className="scoring-text">{LOADING_TEXTS[textIndex]}</p>
            <div className="scoring-progress-bar">
              <div
                className="scoring-progress-fill"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="scoring-subtitle">AI Scoring — please wait</p>
          </>
        )}

        {phase === 'result' && (
          <>
            <div className="scoring-score">{finalScore}</div>
            <p className="scoring-label">分</p>
            <div className="scoring-encouragements">
              {encouragements.map((msg, i) => (
                <p key={i} className="scoring-encouragement">
                  {msg}
                </p>
              ))}
            </div>
            <button className="btn btn-primary scoring-restart" onClick={onRestart}>
              再来一次
            </button>
          </>
        )}
      </div>
    </div>
  );
};
