const common='fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';
const shapes={
 excel:'<rect x="9" y="4" width="19" height="24" rx="2" fill="#107c41"/><path d="M15 10h9M15 16h9M15 22h9M19 7v18" stroke="#76ba91"/><rect x="2" y="9" width="15" height="15" rx="2" fill="#185c37"/><path d="m6 12 7 9m0-9-7 9" stroke="white" stroke-width="2"/>',
 'excel-script':'<rect x="5" y="4" width="23" height="24" rx="3" fill="#107c41"/><path d="m12 10-5 6 5 6m9-12 5 6-5 6m-5 2 3-16" stroke="white" stroke-width="2" fill="none"/>',
 automate:'<path d="M3 8h13l10 8-10 8H3l10-8z" fill="#0875de"/><path d="m16 8 10 8-10 8h6l9-8-9-8z" fill="#70baff"/>',
 powerbi:'<rect x="5" y="17" width="5" height="11" rx="2" fill="#c59a05"/><rect x="13" y="10" width="5" height="18" rx="2" fill="#e5b512"/><rect x="21" y="3" width="5" height="25" rx="2" fill="#f5d645"/>',
 outlook:'<path d="M11 10h18v17H11z" fill="#168bd0"/><path d="m11 11 9 8 9-8" stroke="white" fill="none"/><rect x="2" y="7" width="16" height="20" rx="2" fill="#0866b3"/><ellipse cx="10" cy="17" rx="4" ry="6" fill="none" stroke="white" stroke-width="2"/>',
 vm:'<rect x="3" y="4" width="26" height="18" rx="3"/><path d="M10 28h12m-6-6v6M8 10h6v6H8zm10 0h6v6h-6z"/>',
 html:'<path d="m10 7-8 9 8 9m12-18 8 9-8 9m-9 4 6-24"/>',
 script:'<path d="M11 5H8v8l-3 3 3 3v8h3m10-22h3v8l3 3-3 3v8h-3m-7-4 4-14"/>',
 extract:'<path d="M11 3H4v7m17-7h7v7M4 22v7h7m17-7v7h-7M11 10h10M11 15h10M11 20h6"/>',
 export:'<path d="M5 20v8h22v-8M16 24V3m-7 7 7-7 7 7"/>',
 inject:'<path d="M5 21v8h22v-8M16 2v20m-7-7 7 7 7-7"/>',
 sharepoint:'<circle cx="21" cy="11" r="8" fill="#038387"/><circle cx="22" cy="23" r="7" fill="#41b7b0"/><rect x="2" y="7" width="17" height="20" rx="2" fill="#07757b"/><path d="M14 12H8v5h6v5H8" fill="none" stroke="white" stroke-width="2"/>',
 pdf:'<path d="M6 2h14l6 6v22H6zM20 2v7h6"/><text x="8" y="23" font-size="8" fill="currentColor" stroke="none" font-family="Arial">PDF</text>',
 q18:'<path d="M6 2h14l6 6v22H6zM20 2v7h6"/><text x="8" y="23" font-size="8" fill="currentColor" stroke="none" font-family="Arial">Q18</text>',
 check:'<circle cx="16" cy="16" r="12"/><path d="m9 16 5 5 10-11"/>',
 queue:'<path d="M3 7h20m-4-4 4 4-4 4M9 16h20m-4-4 4 4-4 4M3 25h20m-4-4 4 4-4 4"/>',
 chart:'<path d="M4 3v25h25M9 23v-8h4v8m4 0V9h4v14m4 0V4h4v19"/>',
 field:'<path d="m3 10 13-7 13 7v18H3zM9 28V15h14v13m-10-8h6"/>',
 design:'<rect x="3" y="4" width="26" height="24" rx="3"/><path d="M3 11h26M12 11v17M17 16h7m-7 6h7"/>',
};
export function processSymbol(kind){return `<svg viewBox="0 0 32 32" aria-hidden="true" ${common}>${shapes[kind]||shapes.script}</svg>`;}
