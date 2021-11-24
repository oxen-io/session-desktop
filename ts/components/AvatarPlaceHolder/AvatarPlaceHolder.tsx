import React, { useEffect, useState } from 'react';
import { getInitials } from '../../util/getInitials';

type Props = {
  diameter: number;
  name: string;
  pubkey: string;
};

const sha512FromPubkey = async (pubkey: string): Promise<string> => {
  const buf = await crypto.subtle.digest('SHA-512', new TextEncoder().encode(pubkey));

  // tslint:disable: prefer-template restrict-plus-operands
  return Array.prototype.map
    .call(new Uint8Array(buf), (x: any) => ('00' + x.toString(16)).slice(-2))
    .join('');
};

const avatarPlaceholderColors = ['#5ff8b0', '#26cdb9', '#f3c615', '#fcac5a'];
const avatarBorderColor = '#00000059';

export const AvatarPlaceHolder = (props: Props) => {
  const { pubkey, diameter, name } = props;
  const [sha512Seed, setSha512Seed] = useState<string | undefined>(undefined);
  useEffect(() => {
    let isInProgress = true;

    if (!pubkey) {
      if (isInProgress) {
        setSha512Seed(undefined);
      }
      return;
    }
    void sha512FromPubkey(pubkey).then(sha => {
      if (isInProgress) {
        setSha512Seed(sha);
      }
    });
    return () => {
      isInProgress = false;
    };
  }, [pubkey, name]);

  const diameterWithoutBorder = diameter - 2;
  const viewBox = `0 0 ${diameter} ${diameter}`;
  const r = diameter / 2;
  const rWithoutBorder = diameterWithoutBorder / 2;

  if (!sha512Seed) {
    // return grey circle
    return (
      <svg viewBox={viewBox}>
        <g id="UrTavla">
          <circle
            cx={r}
            cy={r}
            r={rWithoutBorder}
            fill="#d2d2d3"
            shapeRendering="geometricPrecision"
            stroke={avatarBorderColor}
            strokeWidth="1"
          />
        </g>
      </svg>
    );
  }

  const initial = getInitials(name)?.toLocaleUpperCase() || '0';
  const fontSize = diameter * 0.5;

  // Generate the seed simulate the .hashCode as Java
  const hash = parseInt(sha512Seed.substring(0, 12), 16) || 0;

  const bgColorIndex = hash % avatarPlaceholderColors.length;

  const bgColor = avatarPlaceholderColors[bgColorIndex];

  return (
    <svg viewBox={viewBox}>
      <g id="UrTavla">
        <circle
          cx={r}
          cy={r}
          r={rWithoutBorder}
          fill={bgColor}
          shapeRendering="geometricPrecision"
          stroke={avatarBorderColor}
          strokeWidth="1"
        />
        <text
          fontSize={fontSize}
          x="50%"
          y="50%"
          fill="white"
          textAnchor="middle"
          stroke="white"
          strokeWidth={1}
          alignmentBaseline="central"
        >
          {initial}
        </text>
      </g>
    </svg>
  );
};
