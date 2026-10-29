import React from 'react';

export function PixelHeart() {
  return <svg viewBox="0 0 16 14" aria-hidden="true" shapeRendering="crispEdges"><path fill="#251b35" d="M2 0h4v2h4V0h4v2h2v6h-2v2h-2v2h-2v2H6v-2H4v-2H2V8H0V2h2z" /><path fill="#f35c79" d="M2 2h4v2h4V2h4v6h-2v2h-2v2H6v-2H4V8H2z" /><path fill="#ffb3a6" d="M3 3h2v3H3z" /><path fill="#b73458" d="M4 8h2v2h4V8h4v2h-2v2h-2v2H6v-2H4z" /></svg>;
}

function Cloud({ x, y, scale = 1 }) {
  return <g transform={`translate(${x} ${y}) scale(${scale})`}><path fill="#d9d4f5" d="M0 14h12V6h12V0h18v7h12v7h16v12H0z" /><path fill="#fff0e6" d="M4 14h12V7h10V2h14v8h12v7h14v5H4z" /></g>;
}

function Pine({ x, y, scale = 1, fill = '#375b73' }) {
  return <g transform={`translate(${x} ${y}) scale(${scale})`}><path fill="#54475d" d="M-4-4h8v24h-8z" /><path fill={fill} d="M-4-72h8v10h8v12h8v10h-8v8h16v12h-8v8h16V0h-72v-12h16v-8h-8v-12h16v-8h-8v-10h8v-12h8z" /><path fill="#ffffff" opacity=".08" d="M-4-62h8v12h-8v12h-8v14h-8v12h-8v8h24z" /></g>;
}

export function PixelLandscape() {
  return <svg viewBox="0 0 1440 1000" preserveAspectRatio="xMidYMax slice" shapeRendering="crispEdges">
    <defs><linearGradient id="world-sky" x2="0" y2="1"><stop stopColor="#50477e" /><stop offset=".5" stopColor="#b78ba6" /><stop offset="1" stopColor="#f6c49a" /></linearGradient><pattern id="world-dirt" width="40" height="32" patternUnits="userSpaceOnUse"><rect width="40" height="32" fill="#47364d" /><path fill="#665064" d="M4 4h8v6H4zM24 20h12v6H24z" /><path fill="#382e44" d="M24 2h8v8h-8zM8 22h8v8H8z" /></pattern></defs>
    <rect width="1440" height="1000" fill="url(#world-sky)" />
    <g opacity=".5"><Cloud x={50} y={160} scale={2} /><Cloud x={1170} y={80} scale={2.2} /><Cloud x={1010} y={390} scale={1.5} /><Cloud x={310} y={310} scale={1.2} /></g>
    <path fill="#c5a4b1" d="M0 670h90v-50h60v-60h65v-55h60v55h70v60h80v60h160v-90h70v-70h60v-65h65v65h65v70h70v90h150v-70h75v-60h60v-50h60v50h50v70h80v60h100v260H0z" />
    <path fill="#8f859b" d="M0 740h160v-60h80v-60h60v-60h65v60h70v60h85v60h170v-60h85v-75h70v-60h65v60h60v75h80v60h140v-60h60v-75h60v-60h70v60h65v75h65v60h80v180H0z" />
    <g opacity=".65"><Pine x={60} y={850} scale={3} fill="#626f82" /><Pine x={1280} y={850} scale={3.4} fill="#626f82" /><Pine x={220} y={870} scale={2.4} fill="#626f82" /><Pine x={1390} y={860} scale={2.6} fill="#626f82" /></g>
    <Pine x={-10} y={925} scale={3.6} /><Pine x={110} y={930} scale={2.2} /><Pine x={1360} y={930} scale={3.2} /><Pine x={1460} y={940} scale={4} />
    <rect y="952" width="1440" height="48" fill="url(#world-dirt)" /><path fill="#466741" d="M0 925h1440v28H0z" /><path fill="#85af59" d="M0 925h1440v9H0z" /><path stroke="#abc96b" strokeWidth="5" strokeDasharray="12 24" d="M0 926h1440" /><path stroke="#334e3e" strokeWidth="8" strokeDasharray="22 14" d="M0 951h1440" />
    <g fill="#f5c770"><rect x="132" y="907" width="5" height="6" /><rect x="1260" y="913" width="5" height="6" /></g>
  </svg>;
}

function Player({ x, y, color = '#e76e6b', flip = false }) {
  return <g transform={`translate(${x} ${y}) scale(${flip ? -1 : 1} 1)`}><path fill="#302b43" d="M-8-30H6v4h4v10H6v4h4v16H4v12h-8V3h-4v13h-8V0h4v-12h-4v-8h4v-6h4z" /><path fill="#ffd2a1" d="M-8-24H6v11H-8zM-15-9h5V1h-5zM9-9h5V1H9z" /><path fill={color} d="M-8-12H8V1H-8zM-11-29H7v6h-18z" /><path fill="#65759b" d="M-8 1H7v7H2v8h-5V7h-5v9h-5V3h5z" /><path fill="#302b43" d="M1-21h3v3H1z" /><path fill="#fff0c9" d="M-4-10h4v7h-4z" /></g>;
}

export function GameArt({ game }) {
  const palettes = { g1: ['#9bc6b1', '#d9e7bb'], g2: ['#6a548c', '#c9828f'], g3: ['#3c3267', '#8b65b0'], g4: ['#82b2c4', '#c8daca'], g5: ['#d6ad89', '#f1d6a1'] };
  const [sky, light] = palettes[game];
  return <svg viewBox="0 0 320 140" aria-hidden="true" shapeRendering="crispEdges">
    <rect width="320" height="140" fill={sky} /><rect y="100" width="320" height="40" fill={light} /><path fill="#fff3d2" opacity=".35" d="M0 98h320v4H0z" />
    {game === 'g1' && <><Cloud x={25} y={21} scale={.6} /><Cloud x={231} y={11} scale={.7} /><path fill="#638b78" d="M0 80h30V65h24v15h35v20H0zM240 100V76h20V60h24v20h36v20z" /><path fill="#638b55" d="M0 111h320v29H0z" /><path fill="none" stroke="#dbe5ae" strokeWidth="2" d="M18 140v-25h284v25M160 115v25" /><path fill="none" stroke="#fff5d4" strokeWidth="4" d="M213 104V65h65v39M214 65l-8 10v29M278 65l-8 10h-64" /><path stroke="#fff5d4" opacity=".6" d="M225 66v37m12-37v37m13-37v37m13-37v37m-49-25h64m-64 12h64" /><Player x={113} y={105} /><Player x={191} y={103} color="#6385ba" flip /><path fill="#fdf4d6" d="M145 101h10v4h4v10h-4v4h-10v-4h-4v-10h4z" /><path fill="#49434c" d="M147 106h6v6h-6z" /></>}
    {game === 'g2' && <><path fill="#463b65" d="M30 23h63v58H30zM226 23h63v58h-63z" /><path fill="#c0a4bc" d="M35 28h53v47H35zM231 28h53v47h-53z" /><path stroke="#6a548c" strokeWidth="5" d="M61 28v47m196-47v47M35 51h53m143 0h53" /><path fill="#d65f5d" d="M0 111h320v29H0z" /><path fill="#ffac68" d="M0 118h40v5h36v-5h45v10h50v-9h56v7h55v-8h38v12H0z" /><path fill="#dec4bb" stroke="#56445d" strokeWidth="3" d="M26 105h54v16H26zM127 87h52v16h-52zM235 104h55v16h-55z" /><Player x={152} y={70} color="#f3c56d" /></>}
    {game === 'g3' && <><path fill="#54427b" d="M0 0h35l92 110H80zM285 0h35l-80 110h-47z" /><path fill="#e9c1ef" d="M149 10h22v24h-22z" /><path fill="#a3e6e5" d="M149 10h7v7h-7zM163 18h8v8h-8z" /><path stroke="#a983b4" strokeWidth="2" d="M160 0v10M0 115h320M0 129h320M53 100l-30 40m90-40-12 40m59-40v40m47-40 12 40m48-40 30 40" /><Player x={105} y={92} color="#e988bb" /><Player x={160} y={87} color="#a2c886" /><Player x={215} y={92} color="#81ccd0" flip /><path fill="#efd27c" d="M53 35h6v12h-6zM59 35h8v4h-8zM48 47h11v5H48zM252 46h5v12h-5zM257 46h8v4h-8zM247 58h10v5h-10z" /></>}
    {game === 'g4' && <><Cloud x={36} y={18} scale={.65} /><path fill="#76947d" d="M0 89h50V75h30v14h50v14H0z" /><path fill="#936f58" d="M153 52h25v14h13V52h25v14h14V52h24v66H153z" /><path fill="#d1aa78" d="M155 48h20v15h20V48h20v15h19V48h20v63h-99z" /><path stroke="#a67f58" strokeWidth="2" d="M155 81h99m-99 16h99m-75-33v16m42-16v16m-20 1v15m-35 2v13m72-13v13" /><path fill="#826149" d="M195 90h21v21h-21z" /><path fill="#f7e8b0" d="M263 73h23v25h-23z" /><path fill="#d17267" d="M269 79h11v13h-11z" /><path fill="#f3d7a0" d="M271 82h7v7h-7z" /><Player x={87} y={101} color="#6990ad" /><rect x="124" y="61" width="8" height="8" fill="#f5cf75" /></>}
    {game === 'g5' && <><Cloud x={20} y={12} scale={.6} /><path fill="#cf9665" d="M0 103h60V90h70v13h60V82h70v21h60v37H0z" /><path fill="#775b4b" d="M56 103V50h8V34h8v16h9v53z" /><path fill="#68805a" d="M64 37H38V28h26V17h9v11h26v9H73v9h-9z" /><path fill="#b98257" d="M228 52h58v61h-58z" /><path fill="#f2d6a0" d="M225 43h15v12h10V43h15v12h10V43h14v63h-64z" /><path fill="#8f624b" d="M248 82h18v24h-18z" /><path fill="#fff1d2" stroke="#55414a" strokeWidth="3" d="M108 68h32l20 8 20-8h32v48h-32l-20 8-20-8h-32z" /><path fill="none" stroke="#be9c79" strokeWidth="2" d="M160 77v46m-42-44h20m-20 10h25m-25 10h25m34-20h24m-24 10h24m-24 10h24" /><path fill="#44374b" d="M273 13h3v27h-3z" /><path fill="#d15b5c" d="M276 13h5v18h-5z" /><path fill="#638d68" d="M281 13h18v6h-18z" /><path fill="#fff0d0" d="M281 19h18v6h-18z" /><path fill="#332b40" d="M281 25h18v6h-18z" /></>}
  </svg>;
}
