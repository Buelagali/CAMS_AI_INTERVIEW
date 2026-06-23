const emotionColors = {
  Happy: 'var(--accent-4)',
  Neutral: 'var(--accent-1)',
  Sad: 'var(--accent-3)',
  Nervous: '#ff8a5c',
  Angry: '#ff4757',
  Confident: 'var(--accent-2)',
};

const emotionOrder = ['Angry', 'Sad', 'Nervous', 'Neutral', 'Happy', 'Confident'];
const emotionY = {};
emotionOrder.forEach((e, i) => { emotionY[e] = (emotionOrder.length - 1 - i) * 20 + 10; });

export default function CameraPreview({ videoRef, cameraActive, emotion, emotionScores, emotionHistory, emotionScoresHistory, faceDetected }) {
  const mainEmotion = emotion || 'Neutral';
  const safeHistory = emotionHistory || [];
  const safeScoresHistory = emotionScoresHistory || [];
  const noFace = faceDetected === false;

  const chartWidth = 280;
  const chartHeight = 110;
  const chartPad = { top: 5, right: 8, bottom: 18, left: 42 };

  const points = safeHistory.map((em, i) => {
    const x = chartPad.left + (i / Math.max(safeHistory.length - 1, 1)) * (chartWidth - chartPad.left - chartPad.right);
    const y = emotionY[em] !== undefined ? emotionY[em] : chartHeight / 2;
    return `${x},${y}`;
  });

  const polyline = points.join(' ');

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ position: 'relative' }}>
        {cameraActive ? (
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            style={{
              width: '100%', height: 240, objectFit: 'cover',
              background: '#000',
              outline: noFace ? '3px solid #ff4757' : '3px solid #00d4aa',
            }}
          />
        ) : (
          <div
            style={{
              width: '100%',
              height: 240,
              background: 'rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-muted)',
              fontSize: 14,
            }}
          >
            Camera not available
          </div>
        )}

        <div
          style={{
            position: 'absolute',
            top: 12,
            left: 12,
            padding: '6px 14px',
            borderRadius: 20,
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(10px)',
            fontSize: 13,
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: cameraActive ? 'var(--accent-2)' : 'var(--accent-3)',
              display: 'inline-block',
            }}
          />
          {cameraActive ? 'Live' : 'Off'}
        </div>

        <div
          style={{
            position: 'absolute',
            bottom: 12,
            right: 12,
            padding: '8px 16px',
            borderRadius: 20,
            background: noFace ? 'rgba(255,100,100,0.2)' : `${emotionColors[mainEmotion] || 'var(--accent-1)'}33`,
            border: `1px solid ${noFace ? '#ff6464' : (emotionColors[mainEmotion] || 'var(--accent-1)')}`,
            fontSize: 14,
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span>{noFace ? 'No Face' : mainEmotion}</span>
        </div>
      </div>

      <div style={{ padding: 16 }}>
        <h4 style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Emotion Analysis
        </h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
          {noFace ? (
            <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: 8 }}>
              Position your face in the camera
            </p>
          ) : (Object.entries(emotionScores || {}).map(([em, score]) => (
            <div key={em} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, width: 70, color: em === mainEmotion ? emotionColors[em] : 'var(--text-muted)' }}>
                {em}
              </span>
              <div
                style={{
                  flex: 1,
                  height: 4,
                  background: 'rgba(0,0,0,0.05)',
                  borderRadius: 2,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${Math.max(2, (score * 100).toFixed(0))}%`,
                    height: '100%',
                    background: emotionColors[em] || 'var(--accent-1)',
                    borderRadius: 2,
                    transition: 'width 0.5s ease',
                  }}
                />
              </div>
            </div>
          )))}
        </div>

        {safeHistory.length > 1 && (
          <>
            <h4 style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Emotion Trend
            </h4>
            <div style={{ width: '100%', overflow: 'hidden' }}>
              <svg width="100%" height={chartHeight} viewBox={`0 0 ${chartWidth} ${chartHeight}`} preserveAspectRatio="xMidYMid meet">
                {emotionOrder.map((em, i) => {
                  const y = (emotionOrder.length - 1 - i) * 20 + 10;
                  return (
                    <g key={em}>
                      <text x={chartPad.left - 4} y={y + 4} textAnchor="end" fontSize={9} fill="var(--text-muted)">
                        {em}
                      </text>
                      <line x1={chartPad.left} y1={y} x2={chartWidth - chartPad.right} y2={y} stroke="rgba(0,0,0,0.07)" strokeWidth={1} />
                    </g>
                  );
                })}
                {polyline && (
                  <polyline
                    points={polyline}
                    fill="none"
                    stroke="var(--accent-1)"
                    strokeWidth={2}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                )}
                {safeHistory.length > 0 && (
                  <circle
                    cx={chartPad.left + ((safeHistory.length - 1) / Math.max(safeHistory.length - 1, 1)) * (chartWidth - chartPad.left - chartPad.right)}
                    cy={emotionY[safeHistory[safeHistory.length - 1]] !== undefined ? emotionY[safeHistory[safeHistory.length - 1]] : chartHeight / 2}
                    r={3}
                    fill={emotionColors[safeHistory[safeHistory.length - 1]] || 'var(--accent-1)'}
                  />
                )}
              </svg>
            </div>

            {safeScoresHistory.length > 1 && (
              <>
                <h4 style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 14, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Emotion Details
                </h4>
                <div style={{ width: '100%', overflow: 'hidden' }}>
                  <svg width="100%" height="130" viewBox="0 0 280 130" preserveAspectRatio="xMidYMid meet">
                    {Object.keys(emotionColors).map((em) => {
                      const pts = safeScoresHistory
                        .map((s, i) => {
                          const x = 40 + (i / Math.max(safeScoresHistory.length - 1, 1)) * 232;
                          const score = s[em] !== undefined ? s[em] : 0;
                          const y = 115 - score * 100;
                          return `${x},${y}`;
                        })
                        .join(' ');
                      return (
                        <polyline key={em} points={pts} fill="none" stroke={emotionColors[em]} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" opacity={0.8} />
                      );
                    })}
                    {[0, 0.25, 0.5, 0.75, 1].map((v) => {
                      const y = 115 - v * 100;
                      return (
                        <g key={v}>
                          <line x1={40} y1={y} x2={272} y2={y} stroke="rgba(0,0,0,0.07)" strokeWidth={1} />
                          <text x={36} y={y + 3} textAnchor="end" fontSize={8} fill="var(--text-muted)">{Math.round(v * 100)}%</text>
                        </g>
                      );
                    })}
                    {Object.keys(emotionColors).map((em, i) => (
                      <g key={`legend-${em}`}>
                        <rect x={40 + i * 48} y={118} width={8} height={8} rx={2} fill={emotionColors[em]} />
                        <text x={52 + i * 48} y={125} fontSize={8} fill="var(--text-muted)">{em}</text>
                      </g>
                    ))}
                  </svg>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
