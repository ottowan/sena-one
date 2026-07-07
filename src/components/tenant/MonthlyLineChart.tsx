import React, { useState } from 'react';
import { Box, Text } from '@chakra-ui/react';

interface MonthlyLineChartProps {
    title: string;
    unit: string;
    color: string;
    data: { label: string; value: number }[];
    valueFormatter?: (value: number) => string;
}

const WIDTH = 600;
const HEIGHT = 220;
const PADDING_LEFT = 44;
const PADDING_RIGHT = 16;
const PADDING_TOP = 16;
const PADDING_BOTTOM = 28;

const niceMax = (max: number): number => {
    if (max <= 0) return 1;
    const magnitude = 10 ** Math.floor(Math.log10(max));
    const normalized = max / magnitude;
    const step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
    return step * magnitude;
};

export const MonthlyLineChart: React.FC<MonthlyLineChartProps> = ({
    title,
    unit,
    color,
    data,
    valueFormatter = (v) => v.toLocaleString(),
}) => {
    const [hoverIndex, setHoverIndex] = useState<number | null>(null);

    const plotWidth = WIDTH - PADDING_LEFT - PADDING_RIGHT;
    const plotHeight = HEIGHT - PADDING_TOP - PADDING_BOTTOM;
    const maxValue = niceMax(Math.max(...data.map((d) => d.value), 0));

    const xFor = (i: number) => PADDING_LEFT + (data.length === 1 ? plotWidth / 2 : (i / (data.length - 1)) * plotWidth);
    const yFor = (value: number) => PADDING_TOP + plotHeight - (value / maxValue) * plotHeight;

    const points = data.map((d, i) => ({ x: xFor(i), y: yFor(d.value), ...d }));
    const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    const gridSteps = [0, 0.25, 0.5, 0.75, 1];
    const lastPoint = points[points.length - 1];
    const hovered = hoverIndex !== null ? points[hoverIndex] : null;

    const handleMove = (event: React.PointerEvent<SVGRectElement>) => {
        const rect = event.currentTarget.getBoundingClientRect();
        const relativeX = ((event.clientX - rect.left) / rect.width) * WIDTH;
        let nearest = 0;
        let nearestDist = Infinity;
        points.forEach((p, i) => {
            const dist = Math.abs(p.x - relativeX);
            if (dist < nearestDist) {
                nearestDist = dist;
                nearest = i;
            }
        });
        setHoverIndex(nearest);
    };

    return (
        <Box>
            <Text fontWeight="medium" mb={2}>
                {title} <Text as="span" color="gray.500" fontWeight="normal" fontSize="sm">({unit})</Text>
            </Text>
            <Box position="relative" w="full">
                <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} width="100%" height={HEIGHT} style={{ display: 'block', overflow: 'visible' }}>
                    {gridSteps.map((step) => {
                        const y = PADDING_TOP + plotHeight - step * plotHeight;
                        return (
                            <g key={step}>
                                <line
                                    x1={PADDING_LEFT}
                                    x2={WIDTH - PADDING_RIGHT}
                                    y1={y}
                                    y2={y}
                                    stroke="#e1e0d9"
                                    strokeWidth={1}
                                />
                                <text x={PADDING_LEFT - 8} y={y} textAnchor="end" dominantBaseline="middle" fontSize={10} fill="#898781">
                                    {Math.round(maxValue * step).toLocaleString()}
                                </text>
                            </g>
                        );
                    })}

                    {points.map((p, i) => (
                        <text
                            key={p.label}
                            x={p.x}
                            y={HEIGHT - 8}
                            textAnchor="middle"
                            fontSize={10}
                            fill="#898781"
                        >
                            {i % 2 === 0 || data.length <= 6 ? p.label : ''}
                        </text>
                    ))}

                    <path d={linePath} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />

                    {hovered && (
                        <line
                            x1={hovered.x}
                            x2={hovered.x}
                            y1={PADDING_TOP}
                            y2={PADDING_TOP + plotHeight}
                            stroke="#c3c2b7"
                            strokeWidth={1}
                        />
                    )}

                    <circle cx={lastPoint.x} cy={lastPoint.y} r={5} fill={color} stroke="#fcfcfb" strokeWidth={2} />
                    <text x={lastPoint.x} y={lastPoint.y - 10} textAnchor="end" fontSize={11} fontWeight={600} fill="#0b0b0b">
                        {valueFormatter(lastPoint.value)}
                    </text>

                    {hovered && (
                        <circle cx={hovered.x} cy={hovered.y} r={5} fill={color} stroke="#fcfcfb" strokeWidth={2} />
                    )}

                    <rect
                        x={PADDING_LEFT}
                        y={PADDING_TOP}
                        width={plotWidth}
                        height={plotHeight}
                        fill="transparent"
                        onPointerMove={handleMove}
                        onPointerLeave={() => setHoverIndex(null)}
                    />
                </svg>

                {hovered && (
                    <Box
                        position="absolute"
                        top={0}
                        left={`${(hovered.x / WIDTH) * 100}%`}
                        transform="translate(-50%, -100%)"
                        bg="gray.800"
                        color="white"
                        px={2}
                        py={1}
                        borderRadius="md"
                        fontSize="xs"
                        whiteSpace="nowrap"
                        pointerEvents="none"
                    >
                        {hovered.label}: {valueFormatter(hovered.value)}
                    </Box>
                )}
            </Box>
        </Box>
    );
};
