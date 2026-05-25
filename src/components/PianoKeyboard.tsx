import React, { useMemo, useCallback } from 'react';
import type { PianoKey } from '../types';
import { buildPianoKeys } from '../engine/piano/PianoModel';
import { build3DLayout } from '../engine/piano/KeyMapper';
import { buildKeyDefs } from '../engine/piano/MusicTheory';

interface PianoKeyboardProps {
  width: number;
  height: number;
  fromMidi: number;
  toMidi: number;
  pressedNotes: Set<string>;
  onKeyClick: (key: PianoKey) => void;
  recentNotes: string[];
}

const PRESS_DOWN_OFFSET = 4;

export const PianoKeyboard: React.FC<PianoKeyboardProps> = ({
  width,
  height,
  fromMidi,
  toMidi,
  pressedNotes,
  onKeyClick,
  recentNotes,
}) => {
  const keys = useMemo(() => buildPianoKeys(width, height, fromMidi, toMidi), [width, height, fromMidi, toMidi]);
  const defs = useMemo(() => buildKeyDefs(fromMidi, toMidi), [fromMidi, toMidi]);
  const layout = useMemo(() => build3DLayout(defs, width, height), [defs, width, height]);

  const handleClick = useCallback(
    (key: PianoKey) => onKeyClick(key),
    [onKeyClick]
  );

  return (
    <div className="piano-wrapper" style={{ width, height }}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width={width}
        height={height}
        style={{ overflow: 'visible' }}
      >
        <defs>
          {/* White key top gradient */}
          <linearGradient id="wk-top" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fafaf5" />
            <stop offset="100%" stopColor="#e8e4dc" />
          </linearGradient>
          <linearGradient id="wk-top-pressed" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#c8e6c9" />
            <stop offset="100%" stopColor="#a5d6a7" />
          </linearGradient>
          {/* White key front gradient */}
          <linearGradient id="wk-front" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#d0ccc4" />
            <stop offset="100%" stopColor="#b8b4aa" />
          </linearGradient>
          {/* Black key top gradient */}
          <linearGradient id="bk-top" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3a3a3a" />
            <stop offset="100%" stopColor="#1a1a1a" />
          </linearGradient>
          <linearGradient id="bk-top-pressed" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#5c6bc0" />
            <stop offset="100%" stopColor="#3f51b5" />
          </linearGradient>
          {/* Black key front gradient */}
          <linearGradient id="bk-front" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#222" />
            <stop offset="100%" stopColor="#0a0a0a" />
          </linearGradient>
          {/* Drop shadow for black keys */}
          <filter id="bk-shadow" x="-20%" y="-10%" width="150%" height="150%">
            <feDropShadow dx="1" dy="2" stdDeviation="2" floodColor="rgba(0,0,0,0.45)" />
          </filter>
        </defs>

        {/* ---- White keys (drawn first, back layer) ---- */}
        {layout.whiteKeys.map((wl) => {
          const pressed = pressedNotes.has(wl.note);
          const dy = pressed ? PRESS_DOWN_OFFSET : 0;
          const topFill = pressed ? 'url(#wk-top-pressed)' : 'url(#wk-top)';

          return (
            <g key={`w-${wl.midi}`} transform={`translate(0, ${dy})`}>
              {/* Top face */}
              <rect
                x={wl.rects.top.x}
                y={wl.rects.top.y}
                width={wl.rects.top.width}
                height={wl.rects.top.height}
                fill={topFill}
                stroke="#bbb"
                strokeWidth={0.5}
                onClick={() => {
                  const key = keys.find((k) => k.midi === wl.midi);
                  if (key) handleClick(key);
                }}
                style={{ cursor: 'pointer' }}
              />
              {/* Front face */}
              <rect
                x={wl.rects.front.x}
                y={wl.rects.front.y}
                width={wl.rects.front.width}
                height={wl.rects.front.height}
                fill="url(#wk-front)"
                stroke="#bbb"
                strokeWidth={0.5}
                style={{ pointerEvents: 'none' }}
              />
              {/* Right side shadow */}
              <rect
                x={wl.rects.side.x}
                y={wl.rects.side.y}
                width={wl.rects.side.width}
                height={wl.rects.side.height}
                fill="rgba(0,0,0,0.08)"
                style={{ pointerEvents: 'none' }}
              />
              {/* Note label */}
              {recentNotes.includes(wl.note) && (
                <text
                  x={wl.rects.top.x + wl.rects.top.width / 2}
                  y={wl.rects.top.y + wl.rects.top.height - 10}
                  textAnchor="middle"
                  fontSize={11}
                  fill="#999"
                  style={{ pointerEvents: 'none', userSelect: 'none' }}
                >
                  {wl.note}
                </text>
              )}
            </g>
          );
        })}

        {/* ---- Black keys (drawn on top) ---- */}
        {layout.blackKeys.map((bl) => {
          const pressed = pressedNotes.has(bl.note);
          const dy = pressed ? PRESS_DOWN_OFFSET : 0;
          const topFill = pressed ? 'url(#bk-top-pressed)' : 'url(#bk-top)';

          return (
            <g key={`b-${bl.midi}`} transform={`translate(0, ${dy})`} filter="url(#bk-shadow)">
              {/* Top face */}
              <rect
                x={bl.top.x}
                y={bl.top.y}
                width={bl.top.width}
                height={bl.top.height}
                rx={2}
                fill={topFill}
                stroke="#000"
                strokeWidth={0.5}
                onClick={() => {
                  const key = keys.find((k) => k.midi === bl.midi);
                  if (key) handleClick(key);
                }}
                style={{ cursor: 'pointer' }}
              />
              {/* Front face */}
              <rect
                x={bl.front.x}
                y={bl.front.y}
                width={bl.front.width}
                height={bl.front.height}
                rx={2}
                fill="url(#bk-front)"
                stroke="#000"
                strokeWidth={0.5}
                style={{ pointerEvents: 'none' }}
              />
              {/* Note label */}
              {recentNotes.includes(bl.note) && (
                <text
                  x={bl.top.x + bl.top.width / 2}
                  y={bl.top.y + bl.top.height - 8}
                  textAnchor="middle"
                  fontSize={9}
                  fill="#aaa"
                  style={{ pointerEvents: 'none', userSelect: 'none' }}
                >
                  {bl.note}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
};
